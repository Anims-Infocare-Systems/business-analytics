# ════════════════════════════════════════════════════════════════
#  views_notifications.py
#  System Broadcast Notifications & 15-Day Auto-Expiry Engine
#  Strictly Anchor All Datetimes to Indian Standard Time (IST: UTC+5:30)
# ════════════════════════════════════════════════════════════════
import json
from datetime import datetime, timedelta, date, timezone
try:
    from zoneinfo import ZoneInfo
    IST_TZ = ZoneInfo("Asia/Kolkata")
except Exception:
    IST_TZ = timezone(timedelta(hours=5, minutes=30))

from django.db import connection
from django.conf import settings
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .views_adminpannel import check_admin_auth, admin_auth_denied_response, get_username_from_token, _admin_token_from_request


def get_ist_now():
    """
    Return current Indian Standard Time (IST: UTC+5:30) as a naive datetime object.
    Independent of host machine or database server clock offset.
    """
    try:
        return datetime.now(IST_TZ).replace(tzinfo=None)
    except Exception:
        return datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=5, minutes=30))).replace(tzinfo=None)


_NOTIFICATIONS_TABLE_INITIALIZED = False

def ensure_notifications_table():
    """Ensure system_notifications table exists in master database and has 'deleted' column."""
    global _NOTIFICATIONS_TABLE_INITIALIZED
    if _NOTIFICATIONS_TABLE_INITIALIZED:
        return
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
                        created_at DATETIME,
                        expires_at DATETIME NOT NULL,
                        is_active BIT DEFAULT 1,
                        deleted BIT DEFAULT 0
                    );
                END
                """
            )
            cursor.execute(
                """
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('system_notifications') AND name = 'deleted')
                BEGIN
                    ALTER TABLE system_notifications ADD deleted BIT DEFAULT 0;
                END
                """
            )
        _NOTIFICATIONS_TABLE_INITIALIZED = True
    except Exception as e:
        print(f"[Notifications] ensure_notifications_table error: {e}")


def purge_expired_notifications(cursor):
    """Automatically purge notifications exceeding the 15-day TTL based on IST."""
    try:
        now_ist = get_ist_now()
        cursor.execute(
            """
            DELETE FROM system_notifications 
            WHERE expires_at < %s
            """,
            [now_ist]
        )
    except Exception as e:
        print(f"[Notifications] purge_expired_notifications error: {e}")


def format_time_ago(dt, now=None):
    """Format datetime into human-friendly relative time based on IST."""
    if not dt:
        return "Just now"
    if now is None:
        now = get_ist_now()
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", ""))
        except Exception:
            return dt
    if hasattr(dt, "tzinfo") and dt.tzinfo is not None:
        dt = dt.astimezone(IST_TZ).replace(tzinfo=None)
        
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
    Automatically purges records older than 15 days and excludes deleted records (deleted = 0).
    Timestamps strictly calculated in Indian Standard Time (IST).
    """
    ensure_notifications_table()
    from django.core.cache import cache
    try:
        cached_active = cache.get("system_active_notifications")
        if cached_active is not None:
            return Response(cached_active)
    except Exception:
        pass

    try:
        now_ist = get_ist_now()
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
                    expires_at
                FROM system_notifications
                WHERE is_active = 1 
                  AND (deleted IS NULL OR deleted = 0)
                  AND expires_at >= %s
                ORDER BY 
                    CASE WHEN priority = 'urgent' THEN 1 ELSE 2 END,
                    created_at DESC
                """,
                [now_ist]
            )
            rows = cursor.fetchall()
            
            notifications = []
            for r in rows:
                nid, title, message, category, priority, audience, sender, created_at, expires_at = r
                
                if isinstance(expires_at, datetime):
                    days_left = max(0, (expires_at.date() - now_ist.date()).days)
                elif isinstance(expires_at, date):
                    days_left = max(0, (expires_at - now_ist.date()).days)
                else:
                    days_left = 15
                
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
                    "time_ago": format_time_ago(created_at, now_ist),
                    "days_remaining": days_left,
                    "expiry_label": f"Auto-deletes in {days_left}d" if days_left > 1 else ("Expires today" if days_left == 1 else "Expiring soon"),
                })

            res_payload = {
                "count": len(notifications),
                "notifications": notifications,
                "server_time": now_ist.isoformat(),
                "server_time_ist": now_ist.strftime("%d %b %Y, %I:%M %p")
            }
            try:
                cache.set("system_active_notifications", res_payload, timeout=300)
            except Exception:
                pass
            return Response(res_payload)
    except Exception as e:
        return Response({"error": f"Failed to fetch notifications: {str(e)}", "notifications": []}, status=500)


# ─── Admin Endpoints ─────────────────────────────────────────────
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_list_notifications(request):
    """
    List all system broadcast notifications with lifecycle, delivery stats, and deleted field.
    All calculations strictly anchored to Indian Standard Time (IST).
    Admin token authenticated.
    """
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    ensure_notifications_table()
    from django.core.cache import cache
    try:
        cached_admin = cache.get("admin_notifications_all")
        if cached_admin is not None:
            return Response(cached_admin)
    except Exception:
        pass

    try:
        now_ist = get_ist_now()
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
                    deleted
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
                nid, title, message, category, priority, audience, sender, created_at, expires_at, is_active, deleted_val = r
                
                if isinstance(expires_at, datetime):
                    days_left = max(0, (expires_at.date() - now_ist.date()).days)
                elif isinstance(expires_at, date):
                    days_left = max(0, (expires_at - now_ist.date()).days)
                else:
                    days_left = 15

                is_deleted = bool(deleted_val) if deleted_val is not None else False
                is_currently_active = bool(is_active) and not is_deleted and (expires_at is not None and expires_at >= now_ist)

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
                    "deleted": is_deleted,
                    "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
                    "created_at_formatted": created_at.strftime("%d %b %Y, %I:%M %p") if isinstance(created_at, datetime) else str(created_at),
                    "expires_at": expires_at.isoformat() if hasattr(expires_at, "isoformat") else str(expires_at),
                    "expires_at_formatted": expires_at.strftime("%d %b %Y") if isinstance(expires_at, datetime) else str(expires_at),
                    "days_remaining": days_left,
                    "time_ago": format_time_ago(created_at, now_ist)
                })

            res_payload = {
                "success": True,
                "items": items,
                "notifications": items,
                "stats": {
                    "total": len(items),
                    "active": active_count,
                    "maintenance": maint_count,
                    "updates": update_count,
                    "alerts": alert_count,
                    "retention_policy": "15 Days Auto-Purge"
                },
                "count": len(items),
                "active_count": active_count,
                "maintenance_count": maint_count,
                "update_count": update_count,
                "alert_count": alert_count,
                "server_time_ist": now_ist.strftime("%d %b %Y, %I:%M %p"),
                "ttl_days": 15
            }
            try:
                cache.set("admin_notifications_all", res_payload, timeout=300)
            except Exception:
                pass
            return Response(res_payload)
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_create_notification(request):
    """
    Publish a new broadcast notification to all tenants.
    Automatically timestamps created_at and expires_at in exact Indian Standard Time (IST: UTC+5:30).
    Automatically sets 15-day TTL and deleted = 0.
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

    # Strictly capture Indian Standard Time (IST)
    now_ist = get_ist_now()
    expires_at_ist = now_ist + timedelta(days=15)

    try:
        with connection.cursor() as cursor:
            # Insert with explicit IST datetimes, is_active = 1, deleted = 0
            cursor.execute(
                """
                INSERT INTO system_notifications (
                    title, message, category, priority, target_audience, sender_admin, created_at, expires_at, is_active, deleted
                )
                OUTPUT INSERTED.id
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, 1, 0
                );
                """,
                [title, message, category, priority, target_audience, sender, now_ist, expires_at_ist]
            )
            row = cursor.fetchone()
            new_id = row[0] if row else None

            try:
                from django.core.cache import cache
                cache.delete("admin_notifications_all")
                cache.delete("system_active_notifications")
            except Exception:
                pass

            return Response({
                "success": True,
                "message": "Broadcast notification published successfully! It will automatically expire and delete in 15 days.",
                "id": int(new_id) if new_id else None,
                "created_at_ist": now_ist.strftime("%d %b %Y, %I:%M %p"),
                "expires_in_days": 15
            }, status=201)
    except Exception as e:
        return Response({"error": f"Failed to publish notification: {str(e)}"}, status=500)


@api_view(["DELETE"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_delete_notification(request, notification_id):
    """
    Soft delete a broadcast notification: sets deleted = 1 and is_active = 0.
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
                """
                UPDATE system_notifications 
                SET deleted = 1, is_active = 0 
                WHERE id = %s
                """,
                [notification_id]
            )
            if cursor.rowcount == 0:
                return Response({"error": "Notification not found."}, status=404)

            try:
                from django.core.cache import cache
                cache.delete("admin_notifications_all")
                cache.delete("system_active_notifications")
            except Exception:
                pass

            return Response({
                "success": True,
                "deleted": True,
                "message": f"Broadcast notification #{notification_id} deleted successfully."
            })
    except Exception as e:
        return Response({"error": f"Failed to delete notification: {str(e)}"}, status=500)
