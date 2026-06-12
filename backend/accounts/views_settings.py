# ════════════════════════════════════════════════════════════════
#  views_settings.py
#  Settings Management — Profile, Billing Details, & Password Change
# ════════════════════════════════════════════════════════════════
from datetime import datetime, date, timedelta
from django.db import connection, transaction
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .views import encrypt_password
from .views_userrights import get_session_tenant, _company_code, _session_username
from .views_signup import send_brevo_email_async
from django.conf import settings


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def settings_profile(request):
    try:
        tenant = get_session_tenant(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    company = _company_code(tenant)
    username = _session_username(tenant)

    try:
        with connection.cursor() as cursor:
            # 1. Fetch user role/designation
            cursor.execute(
                "SELECT designation, issuperadmin FROM tenants_users WHERE company_code = %s AND username = %s AND deleted = 0",
                [company, username]
            )
            user_row = cursor.fetchone()
            if not user_row:
                return Response({"error": "User not found or deleted."}, status=404)
            
            designation, issuper = user_row
            role = "Superadmin" if (designation.lower() == "admin" or bool(issuper)) else (designation or "User")

            # 2. Fetch signup / plan details
            cursor.execute(
                """
                SELECT company_name, email_id, plan_name, no_of_users, signup_date, end_date, active_status, tenant_id, billing_cycle 
                FROM tenants_signup WHERE company_code = %s
                """,
                [company]
            )
            signup_row = cursor.fetchone()
            
            if signup_row:
                company_name, email_id, plan_name, no_of_users, signup_date, end_date, active_status, tenant_id, billing_cycle = signup_row
            else:
                company_name = tenant.get("company_name", "Anims Infocare Systems")
                email_id = f"{username}@animse.com"
                plan_name = "Enterprise Analytics Pro"
                no_of_users = 20
                signup_date = date.today() - timedelta(days=90)
                end_date = date.today() + timedelta(days=270)
                active_status = 1
                tenant_id = tenant.get("tenant_id", 1)
                billing_cycle = "yearly"

            # 3. Fetch active users count
            cursor.execute(
                "SELECT COUNT(1) FROM tenants_users WHERE company_code = %s AND deleted = 0",
                [company]
            )
            active_users = cursor.fetchone()[0]

            # 3b. Fetch plan upgrade history
            cursor.execute(
                """
                SELECT plan_name, no_of_users, change_date, plan_start_date, plan_end_date, plan_status, billing_cycle 
                FROM tenant_planupgrade 
                WHERE company_code = %s 
                ORDER BY change_date ASC
                """,
                [company]
            )
            history_rows = cursor.fetchall()

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    # 4. Parse renewal date display
    renewal_str = "Next renewal: —"
    if end_date:
        if isinstance(end_date, str):
            try:
                dt = datetime.strptime(end_date.split()[0], "%Y-%m-%d").date()
                renewal_str = f"Next renewal: {dt.strftime('%B %d, %Y')}"
            except ValueError:
                pass
        elif isinstance(end_date, (datetime, date)):
            renewal_str = f"Next renewal: {end_date.strftime('%B %d, %Y')}"

    # 5. Generate mock invoice history dynamically based on signup date
    if isinstance(signup_date, str):
        try:
            start_dt = datetime.strptime(signup_date.split()[0], "%Y-%m-%d").date()
        except ValueError:
            start_dt = date.today() - timedelta(days=90)
    elif isinstance(signup_date, (datetime, date)):
        start_dt = signup_date
        if isinstance(start_dt, datetime):
            start_dt = start_dt.date()
    else:
        start_dt = date.today() - timedelta(days=90)

    history = []
    for h_plan, h_users, h_date, h_start, h_end, h_status, h_cycle in history_rows:
        h_dt = None
        if h_date:
            if isinstance(h_date, str):
                try:
                    h_dt = datetime.strptime(h_date.split()[0], "%Y-%m-%d").date()
                except ValueError:
                    pass
            elif isinstance(h_date, (datetime, date)):
                h_dt = h_date
                if isinstance(h_dt, datetime):
                    h_dt = h_dt.date()
        if h_dt:
            history.append({
                "plan_name": h_plan,
                "no_of_users": h_users,
                "change_date": h_dt,
                "plan_start_date": h_start,
                "plan_end_date": h_end,
                "plan_status": h_status,
                "billing_cycle": h_cycle or "yearly"
            })

    invoices = []
    curr = start_dt
    today = date.today()
    plan_display_name = plan_name or "Enterprise Analytics Pro"

    plan_price_map = {
        "free": "$0.00",
        "pro": "$249.00",
        "enterprise": "$499.00",
        "enterprise analytics pro": "$499.00"
    }

    # Retrieve current plan details to define dynamic billing quotas
    plan_lower = plan_display_name.lower()
    if "free" in plan_lower:
        storage_limit = "10 GB"
        storage_used = "3.4 GB"
        exports_limit = 1000
        exports_used = 845
    elif "enterprise" in plan_lower:
        storage_limit = "100 GB"
        storage_used = "32.4 GB"
        exports_limit = 10000
        exports_used = 4250
    elif "pro" in plan_lower:
        storage_limit = "20 GB"
        storage_used = "6.8 GB"
        exports_limit = 5000
        exports_used = 1250
    else:
        storage_limit = "100 GB"
        storage_used = "32.4 GB"
        exports_limit = 10000
        exports_used = 4250

    while curr <= today:
        # Resolve active plan name at the time of the invoice cycle
        active_plan_name = plan_name or "Free"
        active_users_count = no_of_users or 1
        active_cycle = billing_cycle or "yearly"
        
        for entry in history:
            if entry["change_date"] <= curr:
                active_plan_name = entry["plan_name"]
                active_users_count = entry["no_of_users"] or 1
                active_cycle = entry["billing_cycle"] or "yearly"

        active_plan_lower = active_plan_name.lower()
        inv_plan_display = active_plan_name
        
        # Calculate active plan price dynamically in INR based on plan, active_users_count, and active_cycle
        if "free" in active_plan_lower:
            rate = 0
            price_val = 0
        elif "pro" in active_plan_lower:
            rate = 500
            price_val = rate * (6 if active_cycle in ["6month", "6 months"] else 12) * active_users_count
        else:
            # Enterprise / Max
            rate = 2000
            price_val = rate * (6 if active_cycle in ["6month", "6 months"] else 12) * active_users_count

        inv_plan_price = "₹" + "{:,}".format(price_val)
        inv_desc = f"{inv_plan_display} — {curr.strftime('%B %Y')}" if "free" in active_plan_lower else f"{inv_plan_display} ({active_users_count} users) — {curr.strftime('%B %Y')}"

        invoices.append({
            "date": curr.strftime("%b %d, %Y"),
            "description": inv_desc,
            "amount": inv_plan_price,
            "status": "Paid"
        })
        
        # Dynamic increment based on billing cycle
        months_to_add = 6 if (active_cycle in ["6month", "6 months"] or "free" in active_plan_lower) else 12
        new_month = curr.month - 1 + months_to_add
        new_year = curr.year + new_month // 12
        new_month = new_month % 12 + 1
        try:
            curr = date(new_year, new_month, curr.day)
        except ValueError:
            curr = date(new_year, new_month, 28)

    invoices.reverse()  # show latest invoices first

    latest_entry = history[-1] if history else None
    if latest_entry:
        act_start = latest_entry["plan_start_date"] or signup_date
        act_end = latest_entry["plan_end_date"] or end_date
    else:
        act_start = signup_date
        act_end = end_date

    plan_start_str = act_start.strftime("%Y-%m-%d") if isinstance(act_start, (datetime, date)) else str(act_start)
    plan_end_str = act_end.strftime("%Y-%m-%d") if isinstance(act_end, (datetime, date)) else str(act_end)

    days_left = 0
    if act_end:
        calc_end = act_end
        if isinstance(calc_end, str):
            try:
                calc_end = datetime.strptime(calc_end.split()[0], "%Y-%m-%d").date()
            except ValueError:
                calc_end = None
        elif isinstance(calc_end, datetime):
            calc_end = calc_end.date()
        if isinstance(calc_end, date):
            days_left = (calc_end - date.today()).days

    if isinstance(signup_date, str):
        signup_date_str = signup_date.split()[0]
    elif isinstance(signup_date, (datetime, date)):
        signup_date_str = signup_date.strftime("%Y-%m-%d")
    else:
        signup_date_str = str(signup_date)

    return Response({
        "success": True,
        "profile": {
            "username": username,
            "email": email_id or f"{username}@animse.com",
            "company": company_name,
            "role": role,
            "companyCode": company,
            "status": "Active" if active_status else "Inactive",
            "signupDate": signup_date_str
        },
        "billing": {
            "planName": plan_display_name,
            "nextRenewal": renewal_str,
            "activeUsers": active_users,
            "maxUsers": no_of_users or 20,
            "storageUsed": storage_used,
            "storageLimit": storage_limit,
            "exportsUsed": exports_used,
            "exportsLimit": exports_limit,
            "planStartDate": plan_start_str,
            "planEndDate": plan_end_str,
            "daysLeft": max(0, days_left) if days_left is not None else 0
        },
        "invoices": invoices
    })


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def settings_change_password(request):
    try:
        tenant = get_session_tenant(request)
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
        tenant = get_session_tenant(request)
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
