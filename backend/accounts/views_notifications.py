# ════════════════════════════════════════════════════════════════
#  views_notifications.py
#  System Broadcast Notifications & 15-Day Auto-Expiry Engine
# ════════════════════════════════════════════════════════════════
import json
from datetime import datetime, timedelta, date
from django.db import connection
from django.conf import settings
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .views_adminpannel import check_admin_auth, admin_auth_denied_response, get_username_from_token, _admin_token_from_request


def ensure_notifications_table():
    """Ensure system_notifications table exists in master database."""
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'system_notifications')
                BEGIN
                    CREATE TABLE system_notifications (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        title NVARCHAR(255) NOT NULL,
                        message NVARCHAR(MAX) NOT NULL,
                        category NVARCHAR(50) DEFAULT 'update',
                        priority NVARCHAR(20) DEFAULT 'normal',
                        target_audience NVARCHAR(100) DEFAULT 'all',
                        sender_admin NVARCHAR(100) DEFAULT 'Admin',
                        created_at DATETIME DEFAULT GETDATE(),
                        expires_at DATETIME NOT NULL,
                        is_active BIT DEFAULT 1
                    );
                END
                """
            )
    except Exception as e:
        print(f"[Notifications] ensure_notifications_table error: {e}")


def purge_expired_notifications(cursor):
    """Automatically purge notifications exceeding the 15-day TTL."""
    try:
        cursor.execute(
            """
            DELETE FROM system_notifications 
            WHERE expires_at < GETDATE() OR DATEDIFF(day, created_at, GETDATE()) > 15
            """
        )
    except Exception as e:
        print(f"[Notifications] purge_expired_notifications error: {e}")


def format_time_ago(dt):
    """Format datetime into human-friendly relative time."""
    if not dt:
        return "Just now"
    now = datetime.now()
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", ""))
        except Exception:
            return dt
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return "Just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    if days == 1:
        return "Yesterday"
    if days < 15:
        return f"{days}d ago"
    return dt.strftime("%d %b %Y")


# ─── Public / Client Endpoint: Active Broadcasts ────────────────
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def active_notifications(request):
    """
    Fetch active, non-expired broadcast notifications for regular users.
    Automatically purges records older than 15 days.
    """
    ensure_notifications_table()
    try:
        with connection.cursor() as cursor:
            purge_expired_notifications(cursor)

            cursor.execute(
                """
                SELECT 
                    id, 
                    title, 
                    message, 
                    category, 
                    priority, 
                    target_audience, 
                    sender_admin, 
                    created_at, 
                    expires_at,
                    DATEDIFF(day, GETDATE(), expires_at) as days_remaining,
                    DATEDIFF(hour, created_at, GETDATE()) as hours_old
                FROM system_notifications
                WHERE is_active = 1 AND expires_at >= GETDATE()
                ORDER BY 
                    CASE WHEN priority = 'urgent' THEN 1 ELSE 2 END,
                    created_at DESC
                """
            )
            rows = cursor.fetchall()
            
            notifications = []
            for r in rows:
                nid, title, message, category, priority, audience, sender, created_at, expires_at, days_rem, hours_old = r
                
                days_left = max(0, days_rem) if days_rem is not None else 15
                
                notifications.append({
                    "id": nid,
                    "title": title,
                    "message": message,
                    "category": category or "update",  # 'maintenance', 'update', 'alert', 'general'
                    "priority": priority or "normal",   # 'normal', 'urgent'
                    "target_audience": audience or "all",
                    "sender_admin": sender or "Admin",
                    "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
                    "expires_at": expires_at.isoformat() if hasattr(expires_at, "isoformat") else str(expires_at),
                    "created_at_formatted": created_at.strftime("%d %b %Y, %I:%M %p") if isinstance(created_at, datetime) else str(created_at),
                    "time_ago": format_time_ago(created_at) if isinstance(created_at, datetime) else "Recently",
                    "days_remaining": days_left,
                    "expiry_label": f"Auto-deletes in {days_left}d" if days_left > 1 else ("Expires today" if days_left == 1 else "Expiring soon"),
                })

            return Response({
                "count": len(notifications),
                "notifications": notifications,
                "server_time": datetime.now().isoformat()
            })
    except Exception as e:
        return Response({"error": f"Failed to fetch notifications: {str(e)}", "notifications": []}, status=500)


# ─── Admin Endpoints ─────────────────────────────────────────────
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_list_notifications(request):
    """
    List all system broadcast notifications with lifecycle & delivery stats.
    Admin token authenticated.
    """
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    ensure_notifications_table()
    try:
        with connection.cursor() as cursor:
            purge_expired_notifications(cursor)

            cursor.execute(
                """
                SELECT 
                    id, 
                    title, 
                    message, 
                    category, 
                    priority, 
                    target_audience, 
                    sender_admin, 
                    created_at, 
                    expires_at,
                    is_active,
                    DATEDIFF(day, GETDATE(), expires_at) as days_remaining
                FROM system_notifications
                ORDER BY created_at DESC
                """
            )
            rows = cursor.fetchall()
            
            items = []
            active_count = 0
            maint_count = 0
            update_count = 0
            alert_count = 0

            for r in rows:
                nid, title, message, category, priority, audience, sender, created_at, expires_at, is_active, days_rem = r
                
                days_left = max(0, days_rem) if days_rem is not None else 15
                is_currently_active = bool(is_active) and (expires_at is not None and expires_at >= datetime.now())

                if is_currently_active:
                    active_count += 1
                cat = (category or "update").lower()
                if cat == "maintenance":
                    maint_count += 1
                elif cat == "update":
                    update_count += 1
                elif cat == "alert":
                    alert_count += 1

                items.append({
                    "id": nid,
                    "title": title,
                    "message": message,
                    "category": category or "update",
                    "priority": priority or "normal",
                    "target_audience": audience or "all",
                    "sender_admin": sender or "Admin",
                    "is_active": is_currently_active,
                    "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
                    "created_at_formatted": created_at.strftime("%d %b %Y, %I:%M %p") if isinstance(created_at, datetime) else str(created_at),
                    "expires_at": expires_at.isoformat() if hasattr(expires_at, "isoformat") else str(expires_at),
                    "expires_at_formatted": expires_at.strftime("%d %b %Y") if isinstance(expires_at, datetime) else str(expires_at),
                    "days_remaining": days_left,
                    "time_ago": format_time_ago(created_at) if isinstance(created_at, datetime) else "Recently"
                })

            return Response({
                "items": items,
                "stats": {
                    "total": len(items),
                    "active": active_count,
                    "maintenance": maint_count,
                    "updates": update_count,
                    "alerts": alert_count,
                    "retention_policy": "15 Days Auto-Purge"
                }
            })
    except Exception as e:
        return Response({"error": f"Failed to retrieve notifications: {str(e)}"}, status=500)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_create_notification(request):
    """
    Publish a new broadcast notification to all tenants.
    Automatically sets 15-day TTL (expires_at = DATEADD(day, 15, GETDATE())).
    Admin token authenticated.
    """
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    token = _admin_token_from_request(request)
    sender = get_username_from_token(token)

    ensure_notifications_table()

    title = (request.data.get("title") or "").strip()
    message = (request.data.get("message") or "").strip()
    category = (request.data.get("category") or "update").strip().lower()
    priority = (request.data.get("priority") or "normal").strip().lower()
    target_audience = (request.data.get("target_audience") or "all").strip()

    if not title:
        return Response({"error": "Notification title is required."}, status=400)
    if not message:
        return Response({"error": "Notification message body is required."}, status=400)

    # Valid categories: 'maintenance', 'update', 'alert', 'general'
    if category not in ["maintenance", "update", "alert", "general"]:
        category = "update"

    # Valid priorities: 'normal', 'urgent'
    if priority not in ["normal", "urgent"]:
        priority = "normal"

    try:
        with connection.cursor() as cursor:
            # Insert with exact 15-day future expiration and return generated ID
            cursor.execute(
                """
                INSERT INTO system_notifications (
                    title, message, category, priority, target_audience, sender_admin, created_at, expires_at, is_active
                )
                OUTPUT INSERTED.id
                VALUES (
                    %s, %s, %s, %s, %s, %s, GETDATE(), DATEADD(day, 15, GETDATE()), 1
                );
                """,
                [title, message, category, priority, target_audience, sender]
            )
            row = cursor.fetchone()
            new_id = row[0] if row else None

            return Response({
                "success": True,
                "message": "Broadcast notification published successfully! It will automatically expire and delete in 15 days.",
                "id": int(new_id) if new_id else None,
                "expires_in_days": 15
            }, status=201)
    except Exception as e:
        return Response({"error": f"Failed to publish notification: {str(e)}"}, status=500)


@api_view(["DELETE"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_delete_notification(request, notification_id):
    """
    Permanently delete or deactivate a broadcast notification.
    Admin token authenticated.
    """
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    ensure_notifications_table()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM system_notifications WHERE id = %s",
                [notification_id]
            )
            if cursor.rowcount == 0:
                return Response({"error": "Notification not found."}, status=404)

            return Response({
                "success": True,
                "message": f"Broadcast notification #{notification_id} deleted successfully."
            })
    except Exception as e:
        return Response({"error": f"Failed to delete notification: {str(e)}"}, status=500)
