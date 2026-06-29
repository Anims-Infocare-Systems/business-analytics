# ════════════════════════════════════════════════════════════════
#  views_settings.py
#  Settings Management — Profile, Billing Details, & Password Change
# ════════════════════════════════════════════════════════════════
from datetime import datetime, date, timedelta
from django.db import connection, transaction
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .views import encrypt_password, update_tenant_license
from .views_userrights import get_session_tenant, _company_code, _session_username, _is_super_admin
from .views_signup import send_brevo_email_async
from django.conf import settings

MAX_INVOICE_ROWS = 12


def _parse_date_value(value):
    if not value:
        return None
    if isinstance(value, str):
        try:
            return datetime.strptime(value.split()[0], "%Y-%m-%d").date()
        except ValueError:
            return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return None


def _plan_quota(plan_display_name: str):
    plan_lower = (plan_display_name or "").lower()
    if "free" in plan_lower:
        return "10 GB", "3.4 GB", 1000, 845
    if "enterprise" in plan_lower or "max" in plan_lower:
        return "100 GB", "32.4 GB", 10000, 4250
    if "pro" in plan_lower:
        return "20 GB", "6.8 GB", 5000, 1250
    return "100 GB", "32.4 GB", 10000, 4250


def _build_invoice_history(start_dt, plan_name, no_of_users, billing_cycle, history_rows):
    history = []
    for h_plan, h_users, h_date, h_start, h_end, h_status, h_cycle in history_rows:
        h_dt = _parse_date_value(h_date)
        if h_dt:
            history.append({
                "plan_name": h_plan,
                "no_of_users": h_users,
                "change_date": h_dt,
                "plan_start_date": h_start,
                "plan_end_date": h_end,
                "plan_status": h_status,
                "billing_cycle": h_cycle or "yearly",
            })

    invoices = []
    curr = start_dt
    today = date.today()
    plan_display_name = plan_name or "Enterprise Analytics Pro"

    while curr <= today and len(invoices) < MAX_INVOICE_ROWS:
        active_plan_name = plan_name or "Free"
        active_users_count = no_of_users or 1
        active_cycle = billing_cycle or "yearly"

        for entry in history:
            if entry["change_date"] <= curr:
                active_plan_name = entry["plan_name"]
                active_users_count = entry["no_of_users"] or 1
                active_cycle = entry["billing_cycle"] or "yearly"

        active_plan_lower = (active_plan_name or "").lower()
        inv_plan_display = active_plan_name

        if "free" in active_plan_lower:
            price_val = 0
        elif "pro" in active_plan_lower:
            rate = 500
            price_val = rate * (6 if active_cycle in ["6month", "6 months"] else 12) * active_users_count
        else:
            rate = 2000
            price_val = rate * (6 if active_cycle in ["6month", "6 months"] else 12) * active_users_count

        inv_plan_price = "₹" + "{:,}".format(price_val)
        inv_desc = (
            f"{inv_plan_display} — {curr.strftime('%B %Y')}"
            if "free" in active_plan_lower
            else f"{inv_plan_display} ({active_users_count} users) — {curr.strftime('%B %Y')}"
        )

        invoices.append({
            "date": curr.strftime("%b %d, %Y"),
            "description": inv_desc,
            "amount": inv_plan_price,
            "status": "Paid",
        })

        months_to_add = 6 if (active_cycle in ["6month", "6 months"] or "free" in active_plan_lower) else 12
        new_month = curr.month - 1 + months_to_add
        new_year = curr.year + new_month // 12
        new_month = new_month % 12 + 1
        try:
            curr = date(new_year, new_month, curr.day)
        except ValueError:
            curr = date(new_year, new_month, 28)

    invoices.reverse()
    return history, invoices


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def settings_profile(request):
    try:
        tenant = get_session_tenant(request, allow_expired=True)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    company = _company_code(tenant)
    username = _session_username(tenant)
    include_invoices = str(request.GET.get("include_invoices", "")).lower() in ("1", "true", "yes")

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    u.designation,
                    u.issuperadmin,
                    s.company_name,
                    s.email_id,
                    s.plan_name,
                    s.plan_id,
                    s.no_of_users,
                    s.signup_date,
                    s.end_date,
                    s.active_status,
                    s.tenant_id,
                    s.billing_cycle,
                    (
                        SELECT COUNT(1)
                        FROM tenants_users tu
                        WHERE tu.company_code = u.company_code AND tu.deleted = 0
                    ) AS active_users
                FROM tenants_users u
                LEFT JOIN tenants_signup s ON s.company_code = u.company_code
                WHERE u.company_code = %s AND u.username = %s AND u.deleted = 0
                """,
                [company, username],
            )
            row = cursor.fetchone()
            if not row:
                return Response({"error": "User not found or deleted."}, status=404)

            (
                designation,
                issuper,
                company_name,
                email_id,
                plan_name,
                plan_id,
                no_of_users,
                signup_date,
                end_date,
                active_status,
                tenant_id,
                billing_cycle,
                active_users,
            ) = row

            history_rows = []
            active_upgrade = None
            cursor.execute(
                """
                SELECT TOP 1 plan_start_date, plan_end_date, plan_name
                FROM tenant_planupgrade
                WHERE company_code = %s AND plan_status = 'Active'
                ORDER BY change_date DESC
                """,
                [company],
            )
            active_upgrade = cursor.fetchone()

            if include_invoices:
                cursor.execute(
                    """
                    SELECT plan_name, no_of_users, change_date, plan_start_date, plan_end_date, plan_status, billing_cycle
                    FROM tenant_planupgrade
                    WHERE company_code = %s
                    ORDER BY change_date ASC
                    """,
                    [company],
                )
                history_rows = cursor.fetchall()

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    role = "Superadmin" if _is_super_admin(designation, issuper) else ((designation or "").strip() or "User")

    if not company_name:
        company_name = tenant.get("company_name", "Anims Infocare Systems")
        email_id = email_id or f"{username}@animse.com"
        plan_name = plan_name or "Enterprise Analytics Pro"
        no_of_users = no_of_users or 20
        signup_date = signup_date or (date.today() - timedelta(days=90))
        end_date = end_date or (date.today() + timedelta(days=270))
        active_status = 1 if active_status is None else active_status
        billing_cycle = billing_cycle or "yearly"

    renewal_str = "Next renewal: —"
    start_dt = _parse_date_value(signup_date) or (date.today() - timedelta(days=90))
    plan_display_name = plan_name or "Enterprise Analytics Pro"
    storage_limit, storage_used, exports_limit, exports_used = _plan_quota(plan_display_name)

    if active_upgrade:
        act_start = active_upgrade[0] or signup_date
        act_end = active_upgrade[1] or end_date
        if active_upgrade[2]:
            plan_display_name = active_upgrade[2]
    else:
        act_start = signup_date
        act_end = end_date

    end_dt = _parse_date_value(act_end)
    if end_dt:
        renewal_str = f"Next renewal: {end_dt.strftime('%B %d, %Y')}"

    history = []
    invoices = []
    if include_invoices:
        history, invoices = _build_invoice_history(
            start_dt,
            plan_name,
            no_of_users,
            billing_cycle,
            history_rows,
        )
        latest_entry = history[-1] if history else None
        if latest_entry:
            act_start = latest_entry["plan_start_date"] or act_start
            act_end = latest_entry["plan_end_date"] or act_end
            end_dt = _parse_date_value(act_end)
            if end_dt:
                renewal_str = f"Next renewal: {end_dt.strftime('%B %d, %Y')}"

    plan_start_str = act_start.strftime("%Y-%m-%d") if isinstance(act_start, (datetime, date)) else str(act_start or "")
    plan_end_str = act_end.strftime("%Y-%m-%d") if isinstance(act_end, (datetime, date)) else str(act_end or "")

    calc_end = _parse_date_value(act_end)
    days_left = (calc_end - date.today()).days if calc_end else 0

    signup_date_str = start_dt.strftime("%Y-%m-%d")

    return Response({
        "success": True,
        "invoicesIncluded": include_invoices,
        "profile": {
            "username": username,
            "email": email_id or f"{username}@animse.com",
            "company": company_name,
            "role": role,
            "companyCode": company,
            "status": "Active" if active_status else "Inactive",
            "signupDate": signup_date_str,
        },
        "billing": {
            "planName": plan_display_name,
            "planId": (str(plan_id).strip().lower() if plan_id else ""),
            "nextRenewal": renewal_str,
            "activeUsers": active_users or 0,
            "maxUsers": no_of_users or 20,
            "storageUsed": storage_used,
            "storageLimit": storage_limit,
            "exportsUsed": exports_used,
            "exportsLimit": exports_limit,
            "planStartDate": plan_start_str,
            "planEndDate": plan_end_str,
            "daysLeft": max(0, days_left),
        },
        "invoices": invoices,
    })


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def settings_change_password(request):
    try:
        tenant = get_session_tenant(request, allow_expired=True)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    company = _company_code(tenant)
    username = _session_username(tenant)

    current_password = request.data.get("currentPassword")
    new_password = request.data.get("newPassword")

    if not current_password or not new_password:
        return Response({"error": "Current and new passwords are required."}, status=400)

    if len(new_password) < 6:
        return Response({"error": "New password must be at least 6 characters."}, status=400)

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # 1. Fetch current password hash from DB
                cursor.execute(
                    "SELECT password FROM tenants_users WHERE company_code = %s AND username = %s AND deleted = 0",
                    [company, username]
                )
                row = cursor.fetchone()
                if not row:
                    return Response({"error": "User not found."}, status=404)
                
                db_hash = row[0]

                # 2. Check if current password is correct
                if encrypt_password(current_password) != db_hash:
                    return Response({"error": "Incorrect current password."}, status=400)

                # 3. Update DB with new password
                encrypted_new = encrypt_password(new_password)
                cursor.execute(
                    "UPDATE tenants_users SET password = %s WHERE company_code = %s AND username = %s AND deleted = 0",
                    [encrypted_new, company, username]
                )
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "success": True,
        "message": "Password updated successfully."
    })


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def settings_upgrade_plan(request):
    try:
        tenant = get_session_tenant(request, allow_expired=True)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    company = _company_code(tenant)
    plan_name = request.data.get("planName")
    billing_cycle = str(request.data.get("billingCycle") or "yearly").strip().lower()

    if plan_name in ["Enterprise", "Max"]:
        plan_db_name = "Enterprise Analytics Pro"
    elif plan_name == "Pro":
        plan_db_name = "Pro"
    elif plan_name == "Free":
        plan_db_name = "Free"
    else:
        return Response({"error": "Invalid plan selected."}, status=400)

    # Check request payload for a specified number of users
    no_of_users = request.data.get("noOfUsers")
    if not no_of_users:
        no_of_users = request.data.get("no_of_users")

    try:
        no_of_users = int(no_of_users)
    except (TypeError, ValueError):
        no_of_users = None

    if not no_of_users or no_of_users < 1:
        # Fallback to currently registered active users for the company
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT COUNT(1) FROM tenants_users WHERE company_code = %s AND deleted = 0",
                    [company]
                )
                no_of_users = cursor.fetchone()[0]
                if no_of_users < 1:
                    no_of_users = 1
        except Exception:
            no_of_users = 1

    today = date.today()
    if plan_name == "Free" or billing_cycle in ["6month", "6 months"]:
        end_date = today + timedelta(days=180)  # 6-month cycle
    else:
        end_date = today + timedelta(days=365)  # 1-year cycle

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                plan_id_val = "enterprise" if plan_name in ["Enterprise", "Max"] else ("pro" if plan_name == "Pro" else "free")
                # 1. Update tenants_signup
                cursor.execute(
                    """
                    UPDATE tenants_signup 
                    SET plan_name = %s, plan_id = %s, no_of_users = %s, end_date = %s, active_status = 1, billing_cycle = %s
                    WHERE company_code = %s
                    """,
                    [plan_db_name, plan_id_val, no_of_users, end_date, billing_cycle, company]
                )
                
                 # 2. Fetch tenant_id for history log
                cursor.execute("SELECT tenant_id FROM tenants_signup WHERE company_code = %s", [company])
                row = cursor.fetchone()
                tenant_id = row[0] if row else tenant.get("tenant_id", 1)

                # 2b. Mark previous plan upgrades as Inactive
                cursor.execute(
                    """
                    UPDATE tenant_planupgrade 
                    SET plan_status = 'Inactive' 
                    WHERE company_code = %s
                    """,
                    [company]
                )

                # 3. Log history entry in tenant_planupgrade with cycle dates and plan_status = 'Active'
                cursor.execute(
                    """
                    INSERT INTO tenant_planupgrade (tenant_id, company_code, plan_name, no_of_users, change_date, plan_start_date, plan_end_date, plan_status, billing_cycle)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'Active', %s)
                    """,
                    [tenant_id, company, plan_db_name, no_of_users, today, today, end_date, billing_cycle]
                )

                # 4. Update/insert license mapping in tenants_lisencemodule
                update_tenant_license(tenant_id, company, plan_id_val)
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    # Fetch details to send plan upgrade confirmation email
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT company_name, business_person_name, email_id FROM tenants_signup WHERE company_code = %s",
                [company]
            )
            signup_row = cursor.fetchone()
            if signup_row:
                company_name, person_name, email_id = signup_row
                
                valid_from = today.strftime("%d-%m-%Y")
                valid_to = end_date.strftime("%d-%m-%Y")
                sub_period = "6 Months" if (plan_name == "Free" or billing_cycle in ["6month", "6 months"]) else "1 Year"
                
                send_brevo_email_async({
                    "template_id": getattr(settings, 'BREVO_UPGRADE_TEMPLATE_ID', 2),
                    "person_name": person_name,
                    "company_code": company,
                    "company_name": company_name,
                    "admin_username": _session_username(tenant),
                    "plan_name": plan_db_name,
                    "users": no_of_users,
                    "email": email_id,
                    "sub_period": sub_period,
                    "valid_from": valid_from,
                    "valid_to": valid_to,
                })
    except Exception as email_err:
        import logging
        logging.getLogger(__name__).error(f"Error triggering Brevo upgrade email: {email_err}")

    return Response({
        "success": True,
        "message": f"Successfully upgraded to {plan_name} plan."
    })
