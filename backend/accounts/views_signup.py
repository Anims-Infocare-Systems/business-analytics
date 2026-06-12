from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connection
from django.conf import settings
from .models import Tenant
from .views import encrypt_password
import threading
import requests
import datetime
import logging

logger = logging.getLogger(__name__)

def send_brevo_email_async(email_data):
    """
    Asynchronously triggers the Brevo API request to send the welcome template.
    Runs in a daemon thread to avoid blocking the DB database insertion / response to the client.
    """
    def worker():
        api_key = getattr(settings, 'BREVO_API_KEY', '')
        if not api_key:
            logger.warning("Brevo API Key is not configured. Email dispatch skipped.")
            return

        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json"
        }
        
        # Base parameters
        email_params = {
            "person_name": email_data.get("person_name"),
            "company_code": email_data.get("company_code"),
            "company_name": email_data.get("company_name"),
            "admin_username": email_data.get("admin_username"),
            "plan_name": email_data.get("plan_name"),
            "users": email_data.get("users"),
            "email": email_data.get("email"),
            "sub_period": email_data.get("sub_period"),
            "valid_from": email_data.get("valid_from"),
            "valid_to": email_data.get("valid_to")
        }
        
        # Merge other keys from email_data into email_params
        for k, v in email_data.items():
            if k not in email_params and k not in ["template_id", "email", "person_name"]:
                email_params[k] = v

        payload = {
            "templateId": email_data.get("template_id") or getattr(settings, 'BREVO_TEMPLATE_ID', 1),
            "to": [
                {
                    "email": email_data.get("email"),
                    "name": email_data.get("person_name")
                }
            ],
            "bcc": [
                {
                    "email": getattr(settings, 'BREVO_BCC_EMAIL', 'teamweb@animse.com'),
                    "name": "Anims Web Team"
                }
            ],
            "params": email_params
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            if response.status_code in [200, 201, 202]:
                logger.info(f"Brevo onboarding email successfully dispatched. MessageId: {response.json().get('messageId')}")
            else:
                logger.error(f"Brevo API failed with status {response.status_code}: {response.text}")
        except Exception as err:
            logger.error(f"Exception raised during Brevo email dispatch: {err}")

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def signup_view(request):
    """
    Handle the signup process.
    Saves company details to tenants_signup and admin user details to tenants_users.
    """
    # 1. Parse request data
    company_code = str(request.data.get("company_code") or "").strip().upper()
    company_name = str(request.data.get("company_name") or "").strip()
    business_name = str(request.data.get("business_name") or "").strip()
    person_name = str(request.data.get("person_name") or "").strip()
    email = str(request.data.get("email") or "").strip()
    phone = str(request.data.get("phone") or "").strip()
    gst = str(request.data.get("gst") or "").strip()
    employees = str(request.data.get("employees") or "").strip()
    users_count = int(request.data.get("users") or 1)
    plan_id = str(request.data.get("plan_id") or "free").strip().lower()
    plan_name = str(request.data.get("plan_name") or "Free Plan").strip()
    billing_cycle = str(request.data.get("billing_cycle") or "yearly").strip().lower()

    admin_username = str(request.data.get("admin_username") or "").strip()
    admin_designation = str(request.data.get("admin_designation") or "").strip()
    admin_password = request.data.get("admin_password", "")

    # 2. Validation
    if not company_code:
        return Response({"error": "Company code is required."}, status=400)
    if not company_name:
        return Response({"error": "Company name is required."}, status=400)
    if not email:
        return Response({"error": "Email is required."}, status=400)
    if not phone:
        return Response({"error": "Phone number is required."}, status=400)
    if not admin_username:
        return Response({"error": "Admin username is required."}, status=400)
    if not admin_password or len(admin_password) < 8:
        return Response({"error": "Password must be at least 8 characters."}, status=400)

    # 3. Lookup tenant
    try:
        tenant = Tenant.objects.get(company_code__iexact=company_code, status=True)  # type: ignore
        tenant_id = tenant.id
    except Tenant.DoesNotExist:  # type: ignore
        return Response({"error": f"Company Code '{company_code}' is not a registered tenant."}, status=400)

    # Encrypt the password using the existing ERP pattern
    encrypted_pw = encrypt_password(admin_password)

    # 4. Insert into tables using raw cursor
    try:
        with connection.cursor() as cursor:
            # Check if company code or company name is already registered
            cursor.execute(
                "SELECT COUNT(1) FROM tenants_signup WHERE UPPER(company_code) = UPPER(%s) OR UPPER(company_name) = UPPER(%s)",
                [company_code, tenant.company_name]
            )
            if cursor.fetchone()[0] > 0:
                return Response({"error": "This company has already signed up."}, status=409)

            # Check duplicate username for this tenant/company code
            cursor.execute(
                "SELECT COUNT(1) FROM tenants_users WHERE company_code = %s AND username = %s",
                [company_code, admin_username]
            )
            # Note: Django's raw connection wrapper translates %s to engine-specific placeholders.
            if cursor.fetchone()[0] > 0:
                return Response({"error": f"Username '{admin_username}' already exists for company code '{company_code}'."}, status=409)

            # Insert into tenants_signup
            cursor.execute(
                """
                INSERT INTO tenants_signup (
                    tenant_id, company_code, company_name, business_name, 
                    business_person_name, email_id, phone_number, gst_number, 
                    no_of_employees, no_of_users, plan_id, plan_name,
                    signup_date, end_date, active_status, created_at, billing_cycle
                ) VALUES (
                    %s, %s, %s, %s, 
                    %s, %s, %s, %s, 
                    %s, %s, %s, %s, 
                    GETDATE(),
                    CASE 
                        WHEN %s = 'free' THEN DATEADD(month, 6, GETDATE()) 
                        WHEN %s = '6month' OR %s = '6 months' THEN DATEADD(month, 6, GETDATE())
                        ELSE DATEADD(year, 1, GETDATE()) 
                    END,
                    1, GETDATE(), %s
                )
                """,
                [
                    tenant_id, company_code, company_name, business_name,
                    person_name, email, phone, gst or None,
                    employees, users_count, plan_id, plan_name,
                    plan_id, billing_cycle, billing_cycle, billing_cycle
                ]
            )

            # Insert into tenants_users
            cursor.execute(
                """
                INSERT INTO tenants_users (
                    tenant_id, company_code, username, designation, password, created_at, issuperadmin, deleted
                ) VALUES (%s, %s, %s, %s, %s, GETDATE(), 1, 0)
                """,
                [
                    tenant_id, company_code, admin_username, admin_designation, encrypted_pw
                ]
            )

            # Insert default user rights (all True) for the newly registered admin user
            default_rights = ["Dashboard", "Approvals", "Reports", "MIS", "Charts", "Utility"]
            for right in default_rights:
                cursor.execute(
                    """
                    INSERT INTO tenants_usersrights (
                        tenant_id, company_code, username, form_name, access, created_at
                    ) VALUES (%s, %s, %s, %s, 1, GETDATE())
                    """,
                    [tenant_id, company_code, admin_username, right]
                )

        # Calculate validity dates and subscription period for the onboarding email
        today = datetime.date.today()
        valid_from = today.strftime("%d-%m-%Y")
        
        if plan_id == "free" or billing_cycle in ["6month", "6 months"]:
            sub_period = "6 Months"
            # Add 6 months safely
            month = today.month - 1 + 6
            year = today.year + month // 12
            month = month % 12 + 1
            day = min(today.day, [31,
                29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
                31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
            end_date = datetime.date(year, month, day)
        else:
            sub_period = "1 Year"
            # Add 1 year safely
            try:
                end_date = today.replace(year=today.year + 1)
            except ValueError:
                end_date = today.replace(year=today.year + 1, day=28)
                
        valid_to = end_date.strftime("%d-%m-%Y")

        # Dispatch welcome email asynchronously
        send_brevo_email_async({
            "person_name": person_name,
            "company_code": company_code,
            "company_name": company_name,
            "admin_username": admin_username,
            "plan_name": plan_name,
            "users": users_count,
            "email": email,
            "sub_period": sub_period,
            "valid_from": valid_from,
            "valid_to": valid_to,
        })

        return Response({
            "success": True,
            "message": "Registration successful.",
            "company_code": company_code,
            "company_name": company_name,
            "username": admin_username
        }, status=201)

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)
