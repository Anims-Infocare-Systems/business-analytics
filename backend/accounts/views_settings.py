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
                SELECT company_name, email_id, plan_name, no_of_users, signup_date, end_date, active_status, tenant_id 
                FROM tenants_signup WHERE company_code = %s
                """,
                [company]
            )
            signup_row = cursor.fetchone()
            
            if signup_row:
                company_name, email_id, plan_name, no_of_users, signup_date, end_date, active_status, tenant_id = signup_row
            else:
                company_name = tenant.get("company_name", "Anims Infocare Systems")
                email_id = f"{username}@animse.com"
                plan_name = "Enterprise Analytics Pro"
                no_of_users = 20
                signup_date = date.today() - timedelta(days=90)
                end_date = date.today() + timedelta(days=270)
                active_status = 1
                tenant_id = tenant.get("tenant_id", 1)

            # 3. Fetch active users count
            cursor.execute(
                "SELECT COUNT(1) FROM tenants_users WHERE company_code = %s AND deleted = 0",
                [company]
            )
            active_users = cursor.fetchone()[0]

            # 3b. Fetch plan upgrade history
            cursor.execute(
                """
                SELECT plan_name, no_of_users, change_date, plan_start_date, plan_end_date, plan_status 
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
    for h_plan, h_users, h_date, h_start, h_end, h_status in history_rows:
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
                "plan_status": h_status
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
        for entry in history:
            if entry["change_date"] <= curr:
                active_plan_name = entry["plan_name"]

        active_plan_lower = active_plan_name.lower()
        inv_plan_display = active_plan_name
        
        # Resolve clean plan price
        if "free" in active_plan_lower:
            inv_plan_price = "$0.00"
        elif "enterprise" in active_plan_lower:
            inv_plan_price = "$499.00"
        elif "pro" in active_plan_lower:
            inv_plan_price = "$249.00"
        else:
            inv_plan_price = "$499.00"

        invoices.append({
            "date": curr.strftime("%b %d, %Y"),
            "description": f"{inv_plan_display} — {curr.strftime('%B %Y')}",
            "amount": inv_plan_price,
            "status": "Paid"
        })
        # Safe monthly incrementing
        if curr.month == 12:
            curr = date(curr.year + 1, 1, curr.day)
        else:
            try:
                curr = date(curr.year, curr.month + 1, curr.day)
            except ValueError:
                curr = date(curr.year, curr.month + 1, 28)

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

    return Response({
        "success": True,
        "profile": {
            "username": username,
            "email": email_id or f"{username}@animse.com",
            "company": company_name,
            "role": role,
            "companyCode": company,
            "status": "Active" if active_status else "Inactive"
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
            "planEndDate": plan_end_str
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

    if plan_name in ["Enterprise", "Max"]:
        plan_db_name = "Enterprise Analytics Pro"
    elif plan_name == "Pro":
        plan_db_name = "Pro"
    elif plan_name == "Free":
        plan_db_name = "Free"
    else:
        return Response({"error": "Invalid plan selected."}, status=400)

    no_of_users = 5
    if plan_name == "Pro":
        no_of_users = 10
    elif plan_name in ["Enterprise", "Max"]:
        no_of_users = 1000  # Representing Unlimited/Max tier

    today = date.today()
    end_date = today + timedelta(days=180)  # 6-month cycle

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                plan_id_val = "enterprise" if plan_name in ["Enterprise", "Max"] else ("pro" if plan_name == "Pro" else "free")
                # 1. Update tenants_signup
                cursor.execute(
                    """
                    UPDATE tenants_signup 
                    SET plan_name = %s, plan_id = %s, no_of_users = %s, end_date = %s
                    WHERE company_code = %s
                    """,
                    [plan_db_name, plan_id_val, no_of_users, end_date, company]
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
                    INSERT INTO tenant_planupgrade (tenant_id, company_code, plan_name, no_of_users, change_date, plan_start_date, plan_end_date, plan_status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'Active')
                    """,
                    [tenant_id, company, plan_db_name, no_of_users, today, today, end_date]
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
                sub_period = "6 Months"
                
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
