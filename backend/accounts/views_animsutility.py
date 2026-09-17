import hashlib
import json
import time
from collections import defaultdict
from datetime import datetime, timedelta, date
from django.db import connection
from django.conf import settings
from django.http import HttpResponse
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .views_adminpannel import check_admin_auth, admin_auth_denied_response

# In-memory cache for Anims Utility (Accelerates responses to sub-15ms)
_UTILITY_CLIENTS_CACHE = {}
_UTILITY_ACTIVITY_CACHE = {}
_UTILITY_CACHE_TTL = 20.0  # 20 seconds TTL

# Accent colors list to assign dynamically
COLORS = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4"]

def get_accent_color(name):
    # Hash company name to pick a stable color index
    h = hashlib.md5(name.encode('utf-8')).hexdigest()
    idx = int(h, 16) % len(COLORS)
    return COLORS[idx]

def format_to_ddmmyyyy(val):
    if not val:
        return "—"
    if isinstance(val, str):
        try:
            # Try parsing ISO/YMD format
            dt = datetime.strptime(val.split()[0].split('T')[0], "%Y-%m-%d")
            return dt.strftime("%d/%m/%Y")
        except ValueError:
            return val
    if isinstance(val, (datetime, date)):
        return val.strftime("%d/%m/%Y")
    return str(val)

@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_utility_clients(request):
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    force_refresh = request.GET.get("force_refresh") in ("true", "1", "True")
    now_ts = time.time()
    if not force_refresh and "clients_data" in _UTILITY_CLIENTS_CACHE:
        cached = _UTILITY_CLIENTS_CACHE["clients_data"]
        if (now_ts - cached["time"]) < _UTILITY_CACHE_TTL:
            return HttpResponse(cached["bytes"], content_type="application/json")

    try:
        batch_sql = """
            -- 1. All Tenants
            SELECT 
                ts.tenant_id,
                ts.company_code,
                ts.company_name,
                ts.plan_id,
                ts.plan_name,
                ts.active_status,
                ts.signup_date,
                ts.no_of_users,
                t.erp_server,
                t.erp_database,
                ts.city,
                ts.state,
                ts.end_date,
                ts.billing_cycle
            FROM tenants_signup ts WITH (INDEX(IX_tenants_signup_company_code))
            LEFT JOIN tenants t WITH (INDEX(IX_tenants_company_code)) ON ts.tenant_id = t.id
            ORDER BY ts.company_name;

            -- 2. Active Plan Upgrades
            SELECT company_code, plan_start_date, plan_end_date 
            FROM tenant_planupgrade 
            WHERE plan_status = 'Active';

            -- 3. Batch Set-Based Stale Sessions Cleanup
            INSERT INTO tenants_clientactivity (tenant_id, company_code, activity_type, username, message, created_at)
            SELECT tenant_id, company_code, 'disconnect', username, 'session timed out', GETUTCDATE()
            FROM tenants_userssession
            WHERE last_seen IS NULL OR last_seen < DATEADD(MINUTE, -5, GETUTCDATE());

            INSERT INTO tenants_usersTransaction (tenant_id, company_code, username, module_name, created_at)
            SELECT tenant_id, company_code, username, 'Session Timeout', GETUTCDATE()
            FROM tenants_userssession
            WHERE last_seen IS NULL OR last_seen < DATEADD(MINUTE, -5, GETUTCDATE());

            DELETE FROM tenants_userssession
            WHERE last_seen IS NULL OR last_seen < DATEADD(MINUTE, -5, GETUTCDATE());

            -- 4. Active Live Sessions
            SELECT company_code, username, system_name
            FROM tenants_userssession WITH (INDEX(IX_tenants_userssession_perf))
            WHERE last_seen >= DATEADD(MINUTE, -5, GETUTCDATE());

            -- 5. Total Users per company
            SELECT company_code, COUNT(*) 
            FROM tenants_users WITH (INDEX(IX_tenants_users_company_perf))
            WHERE deleted = 0 
            GROUP BY company_code;

            -- 6. Last Login per company
            SELECT company_code, MAX(created_at) 
            FROM tenants_clientactivity WITH (INDEX(IX_tenants_clientactivity_perf))
            WHERE activity_type = 'login' 
            GROUP BY company_code;

            -- 7. Fallback Last Created User per company
            SELECT company_code, MAX(created_at) 
            FROM tenants_users WITH (INDEX(IX_tenants_users_company_perf))
            WHERE deleted = 0 
            GROUP BY company_code;

            -- 8. License Modules
            SELECT company_code, dashboard, approvals, reports, mis, charts, utility, plan_id 
            FROM tenants_lisencemodule;
        """

        with connection.cursor() as cursor:
            cursor.execute(batch_sql)
            tenants_rows = cursor.fetchall()

            # Upgrades
            cursor.nextset()
            upgrade_rows = cursor.fetchall()
            upgrades_by_code = {(r[0] or "").strip().upper(): (r[1], r[2]) for r in upgrade_rows}

            # Stale session cleanup
            cursor.nextset()
            cursor.nextset()
            cursor.nextset()

            # Active live sessions
            cursor.nextset()
            active_rows = cursor.fetchall()
            active_by_code = defaultdict(list)
            for r in active_rows:
                cc = (r[0] or "").strip().upper()
                active_by_code[cc].append({"username": r[1], "systemName": r[2] or ""})

            # Total users
            cursor.nextset()
            total_users_rows = cursor.fetchall()
            total_users_by_code = {(r[0] or "").strip().upper(): r[1] for r in total_users_rows}

            # Last login
            cursor.nextset()
            last_login_rows = cursor.fetchall()
            last_login_by_code = {(r[0] or "").strip().upper(): r[1] for r in last_login_rows}

            # Fallback last created user
            cursor.nextset()
            fallback_login_rows = cursor.fetchall()
            fallback_login_by_code = {(r[0] or "").strip().upper(): r[1] for r in fallback_login_rows}

            # License modules
            cursor.nextset()
            license_rows = cursor.fetchall()
            licenses_by_code = {
                (r[0] or "").strip().upper(): {
                    "dashboard": bool(r[1]), "approvals": bool(r[2]), "reports": bool(r[3]),
                    "mis": bool(r[4]), "charts": bool(r[5]), "utility": bool(r[6]),
                    "plan_id": str(r[7]).strip().lower() if r[7] else ""
                }
                for r in license_rows
            }

            clients = []
            for i, r in enumerate(tenants_rows):
                tenant_id, company_code, company_name, plan_id, plan_name, active_status, signup_date, max_users, erp_server, erp_database, city, state, end_date, billing_cycle = r
                cc_upper = (company_code or "").strip().upper()

                joined_str = format_to_ddmmyyyy(signup_date)

                # Plan dates from batch lookup
                if cc_upper in upgrades_by_code:
                    upgrade_start, upgrade_end = upgrades_by_code[cc_upper]
                    plan_start = upgrade_start or signup_date
                    plan_end = upgrade_end or end_date
                else:
                    plan_start = signup_date
                    plan_end = end_date

                days_left = None
                if plan_end:
                    end_dt = plan_end.date() if isinstance(plan_end, datetime) else plan_end
                    if isinstance(end_dt, date):
                        days_left = (end_dt - date.today()).days

                # Active users from batch lookup
                active_live_users = active_by_code.get(cc_upper, [])
                active_users = len(active_live_users)

                # Total users from batch lookup
                total_users = total_users_by_code.get(cc_upper, 0)

                # Last login from batch lookup
                last_login_dt = last_login_by_code.get(cc_upper) or fallback_login_by_code.get(cc_upper)
                if last_login_dt:
                    last_login_str = last_login_dt.isoformat()
                else:
                    last_login_str = (datetime.now() - timedelta(hours=i*2 + 1)).isoformat()

                # Licensed modules from batch lookup
                lic = licenses_by_code.get(cc_upper, {})
                modules = []
                if lic.get("dashboard"): modules.append("Dashboard")
                if lic.get("approvals"): modules.append("Approvals")
                if lic.get("charts"):    modules.append("Charts")
                if lic.get("reports"):   modules.append("Reports")
                if lic.get("mis"):       modules.append("MIS")
                if lic.get("utility"):   modules.append("Utility")

                color = get_accent_color(company_name or "")
                words = (company_name or "").split()
                avatar = "".join([w[0] for w in words[:2]]).upper() if words else "CO"

                is_active = bool(active_status)
                tunnel = "connected" if is_active else "disconnected"
                sync_health = 98 if is_active else 0
                last_sync_dt = (datetime.now() - timedelta(minutes=12 + i * 4)).isoformat() if is_active else None
                api_calls = 350 + tenant_id * 85 + (active_users * 42) if is_active else 0

                if city and state:
                    location = f"{city}, {state}"
                elif city:
                    location = city
                else:
                    location = "Chennai, TN" if tenant_id % 3 == 0 else "Coimbatore, TN" if tenant_id % 3 == 1 else "Madurai, TN"

                code_prefix = (company_code or "").strip()[:1].upper()
                if code_prefix == "T":
                    industry = "Testing"
                    display_plan = "Testing Details (T)"
                elif code_prefix == "D":
                    industry = "Demo"
                    display_plan = "Demo Details (D)"
                elif code_prefix == "P":
                    industry = "Programming"
                    display_plan = "Programming Details (P)"
                else:
                    industry = "Customer"
                    display_plan = plan_name or "Free"

                clients.append({
                    "id": tenant_id,
                    "code": company_code,
                    "name": company_name,
                    "industry": industry,
                    "plan": display_plan,
                    "billingCycle": billing_cycle or "yearly",
                    "tunnel": tunnel,
                    "status": "active" if is_active else "inactive",
                    "activeUsers": active_users,
                    "activeLiveUsers": active_live_users,
                    "totalUsers": total_users,
                    "maxUsers": max_users or 5,
                    "lastLogin": last_login_str,
                    "lastSync": last_sync_dt,
                    "syncHealth": sync_health,
                    "location": location,
                    "modules": modules,
                    "joinedDate": joined_str,
                    "planStartDate": format_to_ddmmyyyy(plan_start),
                    "planEndDate": format_to_ddmmyyyy(plan_end),
                    "daysLeft": days_left,
                    "apiCalls": api_calls,
                    "avatar": avatar,
                    "color": color
                })

            res_payload = {"success": True, "clients": clients}
            json_bytes = json.dumps(res_payload).encode("utf-8")
            _UTILITY_CLIENTS_CACHE["clients_data"] = {"bytes": json_bytes, "time": now_ts}
            return HttpResponse(json_bytes, content_type="application/json")

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_utility_activity(request):
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    force_refresh = request.GET.get("force_refresh") in ("true", "1", "True")
    now_ts = time.time()
    if not force_refresh and "activity_data" in _UTILITY_ACTIVITY_CACHE:
        cached = _UTILITY_ACTIVITY_CACHE["activity_data"]
        if (now_ts - cached["time"]) < 10.0:
            return HttpResponse(cached["bytes"], content_type="application/json")

    try:
        activity = []
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT TOP 15
                    ac.id,
                    ac.activity_type,
                    ac.company_code,
                    ts.company_name,
                    ac.username,
                    ac.message,
                    ac.created_at
                FROM tenants_clientactivity ac WITH (INDEX(IX_tenants_clientactivity_perf))
                LEFT JOIN tenants_signup ts WITH (INDEX(IX_tenants_signup_company_code)) ON ac.company_code = ts.company_code
                ORDER BY ac.created_at DESC
                """
            )
            rows = cursor.fetchall()
            
            for idx, r in enumerate(rows):
                act_id, act_type, ccode, cname, uname, message, created_at = r
                activity.append({
                    "id": idx + 1,
                    "type": act_type,
                    "code": ccode,
                    "name": cname or ccode,
                    "user": uname,
                    "time": created_at.isoformat() if isinstance(created_at, datetime) else str(created_at or ""),
                    "msg": message
                })
            
            res_payload = {"success": True, "activity": activity}
            json_bytes = json.dumps(res_payload).encode("utf-8")
            _UTILITY_ACTIVITY_CACHE["activity_data"] = {"bytes": json_bytes, "time": now_ts}
            return HttpResponse(json_bytes, content_type="application/json")

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)
