from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connection
from .models import Tenant
from .views import encrypt_password

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
                    signup_date, end_date, active_status, created_at
                ) VALUES (
                    %s, %s, %s, %s, 
                    %s, %s, %s, %s, 
                    %s, %s, %s, %s, 
                    GETDATE(),
                    CASE WHEN %s = 'free' THEN DATEADD(month, 6, GETDATE()) ELSE DATEADD(year, 1, GETDATE()) END,
                    1, GETDATE()
                )
                """,
                [
                    tenant_id, company_code, company_name, business_name,
                    person_name, email, phone, gst or None,
                    employees, users_count, plan_id, plan_name,
                    plan_id
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

        return Response({
            "success": True,
            "message": "Registration successful.",
            "company_code": company_code,
            "company_name": company_name,
            "username": admin_username
        }, status=201)

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)
