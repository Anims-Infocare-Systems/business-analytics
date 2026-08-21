# ════════════════════════════════════════════════════════════════
#  views_adminpannel.py
#  Admin Panel views — Tenants, Signups, and Database Credentials
# ════════════════════════════════════════════════════════════════
import hashlib
import hmac
import time
from datetime import datetime, date
from django.conf import settings
from django.db import connection, transaction
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .views import encrypt_password, decrypt_password, update_tenant_license, get_tenant_license
from .models import Tenant

ADMIN_USER = getattr(settings, "ADMIN_PANEL_USER", "admin")
ADMIN_PASS = getattr(settings, "ADMIN_PANEL_PASSWORD", "admin12345678")
ADMIN_TOKEN_MAX_AGE = 86400


def issue_admin_token(username="admin"):
    ts = int(time.time())
    payload = f"admin-panel:{username}:{ts}"
    sig = hmac.new(
        settings.SECRET_KEY.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload}:{sig}"


def verify_admin_token(token):
    token = (token or "").strip()
    if not token:
        return False
    try:
        payload, sig = token.rsplit(":", 1)
        expected = hmac.new(
            settings.SECRET_KEY.encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return False
        parts = payload.split(":")
        if parts[0] != "admin-panel":
            return False
        ts = int(parts[-1])
        if time.time() - ts > ADMIN_TOKEN_MAX_AGE:
            return False
        return True
    except (ValueError, TypeError):
        return False

def get_username_from_token(token):
    token = (token or "").strip()
    if not token:
        return "admin"
    try:
        payload, _ = token.rsplit(":", 1)
        parts = payload.split(":")
        if len(parts) >= 3:
            return parts[1]
    except Exception:
        pass
    return "admin"


def _admin_token_from_request(request):
    return (request.headers.get("X-Admin-Token") or "").strip()


def check_admin_auth(request):
    """Token-only admin auth — never reads or writes Django session."""
    if not verify_admin_token(_admin_token_from_request(request)):
        raise PermissionError("Access denied. Please authenticate as Admin.")

def admin_auth_denied_response(exc):
    return Response(
        {"error": str(exc), "code": "admin_auth_required"},
        status=403,
    )

def ensure_admin_credentials_table():
    """Ensure admin_panel_credentials table exists in DB and seed initial master admin account if table is empty."""
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'admin_panel_credentials')
                BEGIN
                    CREATE TABLE admin_panel_credentials (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        username VARCHAR(100) NOT NULL UNIQUE,
                        password VARCHAR(255) NOT NULL,
                        is_active BIT DEFAULT 1,
                        last_login DATETIME NULL,
                        password_updated_at DATETIME DEFAULT GETDATE(),
                        created_at DATETIME DEFAULT GETDATE()
                    );
                END
                ELSE IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('admin_panel_credentials') AND name = 'password_updated_at')
                BEGIN
                    ALTER TABLE admin_panel_credentials ADD password_updated_at DATETIME DEFAULT GETDATE();
                END
                """
            )
            cursor.execute("SELECT COUNT(1) FROM admin_panel_credentials")
            count = cursor.fetchone()[0]
            if count == 0:
                default_user = ADMIN_USER
                default_pass_hash = hashlib.sha256(ADMIN_PASS.encode()).hexdigest()
                cursor.execute(
                    """
                    INSERT INTO admin_panel_credentials (username, password, is_active, password_updated_at, created_at)
                    VALUES (%s, %s, 1, GETDATE(), GETDATE())
                    """,
                    [default_user, default_pass_hash]
                )
    except Exception as e:
        print(f"[ADMIN AUTH] Error creating/checking admin_panel_credentials table: {e}")

# ─────────────────────────────────────────────────────────────
#  AUTHENTICATION & MASTER CREDENTIALS
# ─────────────────────────────────────────────────────────────
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_login(request):
    username = (request.data.get("username") or "").strip()
    password = (request.data.get("password") or "").strip()

    if not username or not password:
        return Response({"error": "Username and password are required."}, status=400)

    # 1. Ensure separate table admin_panel_credentials exists
    ensure_admin_credentials_table()

    # 2. Check credentials in admin_panel_credentials table
    authenticated = False
    admin_id = None
    pass_updated_at = None

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, username, password, is_active, password_updated_at 
                FROM admin_panel_credentials 
                WHERE LOWER(username) = LOWER(%s) AND is_active = 1
                """,
                [username]
            )
            row = cursor.fetchone()
            if row:
                aid, db_user, db_pass, is_active, pass_upd = row
                input_hash = hashlib.sha256(password.encode()).hexdigest()
                if db_pass == input_hash or db_pass == password or (password == ADMIN_PASS and username == ADMIN_USER):
                    authenticated = True
                    admin_id = aid
                    pass_updated_at = pass_upd
                    if db_pass != input_hash:
                        cursor.execute(
                            "UPDATE admin_panel_credentials SET password = %s, password_updated_at = GETDATE() WHERE id = %s",
                            [input_hash, aid]
                        )
                    cursor.execute(
                        "UPDATE admin_panel_credentials SET last_login = GETDATE() WHERE id = %s",
                        [aid]
                    )
    except Exception as e:
        print(f"[ADMIN AUTH DB ERROR] {e}")

    # Fallback to settings ADMIN_USER and ADMIN_PASS if DB check fails
    if not authenticated and username == ADMIN_USER and password == ADMIN_PASS:
        authenticated = True

    if authenticated:
        token = issue_admin_token(username)
        
        # Calculate password age for 60-day rotation recommendation
        now_dt = datetime.now()
        if pass_updated_at:
            if isinstance(pass_updated_at, date) and not isinstance(pass_updated_at, datetime):
                last_dt = datetime.combine(pass_updated_at, datetime.min.time())
            else:
                last_dt = pass_updated_at
            password_age_days = (now_dt - last_dt).days
        else:
            password_age_days = 60 # Default to prompt rotation if not recorded
            last_dt = now_dt

        days_remaining = max(0, 60 - password_age_days)
        recommend_change = password_age_days >= 60

        return Response({
            "success": True,
            "message": "Admin authenticated successfully.",
            "admin_token": token,
            "username": username,
            "security_info": {
                "password_age_days": password_age_days,
                "days_remaining": days_remaining,
                "recommend_change": recommend_change,
                "rotation_cycle_days": 60,
                "last_changed_date": last_dt.strftime("%d/%m/%Y")
            }
        })

    return Response({"error": "Invalid admin username or password."}, status=401)

@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_logout(request):
    return Response({"success": True, "message": "Admin logged out successfully."})

@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_check_session(request):
    token = _admin_token_from_request(request)
    if verify_admin_token(token):
        username = get_username_from_token(token)
        return Response({"authenticated": True, "admin_token": token, "username": username})
    return Response({"authenticated": False, "admin_token": None})

@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_change_password(request):
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    username = (request.data.get("username") or "admin").strip()
    new_password = (request.data.get("new_password") or "").strip()

    if not new_password:
        return Response({"error": "New password is required."}, status=400)

    if len(new_password) < 6:
        return Response({"error": "Password must be at least 6 characters long."}, status=400)

    ensure_admin_credentials_table()
    try:
        new_pass_hash = hashlib.sha256(new_password.encode()).hexdigest()
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE admin_panel_credentials 
                SET password = %s, password_updated_at = GETDATE() 
                WHERE LOWER(username) = LOWER(%s)
                """,
                [new_pass_hash, username]
            )
            if cursor.rowcount == 0:
                cursor.execute(
                    """
                    INSERT INTO admin_panel_credentials (username, password, is_active, password_updated_at, created_at)
                    VALUES (%s, %s, 1, GETDATE(), GETDATE())
                    """,
                    [username, new_pass_hash]
                )
        return Response({"success": True, "message": f"Password for master admin '{username}' updated successfully."})
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_forgot_password_reset(request):
    username = (request.data.get("username") or "admin").strip()
    new_password = (request.data.get("new_password") or "").strip()

    if not username:
        return Response({"error": "Admin username is required."}, status=400)
    if not new_password:
        return Response({"error": "New password is required."}, status=400)
    if len(new_password) < 6:
        return Response({"error": "Password must be at least 6 characters long."}, status=400)

    ensure_admin_credentials_table()
    try:
        new_pass_hash = hashlib.sha256(new_password.encode()).hexdigest()
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE admin_panel_credentials 
                SET password = %s, password_updated_at = GETDATE() 
                WHERE LOWER(username) = LOWER(%s) AND is_active = 1
                """,
                [new_pass_hash, username]
            )
            if cursor.rowcount == 0:
                cursor.execute(
                    """
                    INSERT INTO admin_panel_credentials (username, password, is_active, password_updated_at, created_at)
                    VALUES (%s, %s, 1, GETDATE(), GETDATE())
                    """,
                    [username, new_pass_hash]
                )

        return Response({
            "success": True,
            "message": f"Password for master admin '{username}' reset successfully! You can now sign in."
        })
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_list_credentials(request):
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    ensure_admin_credentials_table()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, username, is_active, last_login, created_at 
                FROM admin_panel_credentials 
                ORDER BY id
                """
            )
            rows = cursor.fetchall()
            admins = []
            for r in rows:
                last_login = r[3].strftime("%Y-%m-%d %H:%M:%S") if isinstance(r[3], (datetime, date)) else (str(r[3]) if r[3] else "Never")
                created_at = r[4].strftime("%Y-%m-%d %H:%M:%S") if isinstance(r[4], (datetime, date)) else str(r[4] or "")
                admins.append({
                    "id": r[0],
                    "username": r[1],
                    "is_active": bool(r[2]),
                    "last_login": last_login,
                    "created_at": created_at
                })
        return Response({"success": True, "admins": admins})
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_create_credential(request):
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    username = str(request.data.get("username") or "").strip()
    password = str(request.data.get("password") or "").strip()

    if not username:
        return Response({"error": "Admin username is required."}, status=400)
    if not password:
        return Response({"error": "Password is required."}, status=400)
    if len(password) < 6:
        return Response({"error": "Password must be at least 6 characters long."}, status=400)

    ensure_admin_credentials_table()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(1) FROM admin_panel_credentials WHERE LOWER(username) = LOWER(%s)", [username])
            if cursor.fetchone()[0] > 0:
                return Response({"error": f"Admin user '{username}' already exists."}, status=409)

            pass_hash = hashlib.sha256(password.encode()).hexdigest()
            cursor.execute(
                """
                INSERT INTO admin_panel_credentials (username, password, is_active, password_updated_at, created_at)
                VALUES (%s, %s, 1, GETDATE(), GETDATE())
                """,
                [username, pass_hash]
            )

        return Response({"success": True, "message": f"Master admin user '{username}' created successfully."})
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

@api_view(["DELETE"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_delete_credential(request, admin_id):
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    ensure_admin_credentials_table()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT username FROM admin_panel_credentials WHERE id = %s", [admin_id])
            row = cursor.fetchone()
            if not row:
                return Response({"error": "Admin user not found."}, status=404)
            if str(row[0]).strip().lower() == "admin":
                return Response({"error": "The root 'admin' account cannot be deleted."}, status=400)

            cursor.execute("SELECT COUNT(1) FROM admin_panel_credentials WHERE is_active = 1")
            active_count = cursor.fetchone()[0]
            if active_count <= 1:
                return Response({"error": "Cannot delete the last remaining master admin user."}, status=400)

            cursor.execute("DELETE FROM admin_panel_credentials WHERE id = %s", [admin_id])

        return Response({"success": True, "message": "Master admin user deleted successfully."})
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

# ─────────────────────────────────────────────────────────────
#  TENANTS LIST & MANAGEMENT
# ─────────────────────────────────────────────────────────────
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_list_tenants(request):
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    try:
        with connection.cursor() as cursor:
            # Query all signups with database connection details
            cursor.execute(
                """
                SELECT 
                    ts.id as signup_id,
                    ts.tenant_id,
                    ts.company_code,
                    ts.company_name,
                    ts.business_name,
                    ts.business_person_name,
                    ts.email_id,
                    ts.phone_number,
                    ts.gst_number,
                    ts.no_of_employees,
                    ts.no_of_users,
                    ts.plan_id,
                    ts.plan_name,
                    ts.signup_date,
                    ts.end_date,
                    ts.active_status,
                    t.erp_server,
                    t.erp_database,
                    t.erp_user,
                    t.erp_password,
                    t.erp_port,
                    t.status as tenant_status,
                    ts.city,
                    ts.state
                FROM tenants_signup ts
                LEFT JOIN tenants t ON ts.tenant_id = t.id
                ORDER BY ts.company_name
                """
            )
            rows = cursor.fetchall()
            
            tenants = []
            for r in rows:
                signup_date = r[13].strftime("%Y-%m-%d") if isinstance(r[13], (datetime, date)) else str(r[13] or "")
                end_date = r[14].strftime("%Y-%m-%d") if isinstance(r[14], (datetime, date)) else str(r[14] or "")
                comp_code = r[2]
                lic_flags = get_tenant_license(comp_code)
                db_plan = r[12]
                prefix = str(comp_code or "").strip().upper()[:1]
                if prefix == "T":
                    plan_val = "Testing Details (T)"
                elif prefix == "D":
                    plan_val = "Demo Details (D)"
                elif prefix == "P":
                    plan_val = "Programming Details (P)"
                else:
                    plan_val = db_plan or "Free"
                
                tenants.append({
                    "id": r[0],
                    "tenant_id": r[1],
                    "company_code": comp_code,
                    "company_name": r[3],
                    "business_name": r[4],
                    "business_person_name": r[5],
                    "email_id": r[6],
                    "phone_number": r[7],
                    "gst_number": r[8],
                    "no_of_employees": r[9],
                    "no_of_users": r[10],
                    "plan_id": r[11],
                    "plan_name": plan_val,
                    "signup_date": signup_date,
                    "end_date": end_date,
                    "active_status": bool(r[15]),
                    "erp_server": r[16] or "",
                    "erp_database": r[17] or "",
                    "erp_user": r[18] or "",
                    "erp_password": r[19] or "",
                    "erp_port": r[20] or 1433,
                    "tenant_status": bool(r[21]),
                    "city": r[22] or "",
                    "state": r[23] or "",
                    "modules": {
                        "dashboard": bool(lic_flags.get("dashboard")),
                        "approvals": bool(lic_flags.get("approvals")),
                        "charts": bool(lic_flags.get("charts")),
                        "reports": bool(lic_flags.get("reports")),
                        "mis": bool(lic_flags.get("mis")),
                        "utility": bool(lic_flags.get("utility")),
                    }
                })
            return Response({"success": True, "tenants": tenants})
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_create_tenant(request):
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    company_code = str(request.data.get("company_code") or "").strip().upper()
    company_name = str(request.data.get("company_name") or "").strip()
    business_name = str(request.data.get("business_name") or "").strip()
    person_name = str(request.data.get("business_person_name") or "").strip()
    email = str(request.data.get("email_id") or "").strip()
    phone = str(request.data.get("phone_number") or "").strip()
    gst = str(request.data.get("gst_number") or "").strip()
    employees = str(request.data.get("no_of_employees") or "").strip()
    users_count = int(request.data.get("no_of_users") or 5)
    plan_id = str(request.data.get("plan_id") or "free").strip().lower()
    plan_name = str(request.data.get("plan_name") or "Free Plan").strip()
    end_date = str(request.data.get("end_date") or "").strip()
    city = str(request.data.get("city") or "").strip()
    state = str(request.data.get("state") or "").strip()
    modules_dict = request.data.get("modules")

    erp_server = str(request.data.get("erp_server") or "").strip()
    erp_database = str(request.data.get("erp_database") or "").strip()
    erp_user = str(request.data.get("erp_user") or "").strip()
    erp_password = str(request.data.get("erp_password") or "").strip()
    erp_port = int(request.data.get("erp_port") or 1433)

    admin_username = str(request.data.get("admin_username") or "admin").strip()
    admin_password = str(request.data.get("admin_password") or "12345678").strip()

    if not company_code or not company_name:
        return Response({"error": "Company code and company name are required."}, status=400)

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Check duplicate company code or name
                cursor.execute(
                    "SELECT COUNT(1) FROM tenants_signup WHERE UPPER(company_code) = UPPER(%s) OR UPPER(company_name) = UPPER(%s)",
                    [company_code, company_name]
                )
                if cursor.fetchone()[0] > 0:
                    return Response({"error": f"Tenant with code '{company_code}' or name '{company_name}' already exists."}, status=409)

                # 1. Insert into tenants table
                cursor.execute(
                    """
                    INSERT INTO tenants (company_code, company_name, erp_server, erp_database, erp_user, erp_password, erp_port, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 1, GETDATE())
                    """,
                    [company_code, company_name, erp_server, erp_database, erp_user, erp_password, erp_port]
                )

                # Fetch the generated tenant ID
                cursor.execute("SELECT id FROM tenants WHERE company_code = %s", [company_code])
                tenant_id = cursor.fetchone()[0]

                # 2. Insert into tenants_signup
                end_date_val = end_date if end_date else None
                cursor.execute(
                    """
                    INSERT INTO tenants_signup (
                        tenant_id, company_code, company_name, business_name, 
                        business_person_name, email_id, phone_number, gst_number, 
                        no_of_employees, no_of_users, plan_id, plan_name,
                        signup_date, end_date, active_status, created_at,
                        city, state
                    ) VALUES (
                        %s, %s, %s, %s, 
                        %s, %s, %s, %s, 
                        %s, %s, %s, %s, 
                        GETDATE(), %s, 1, GETDATE(),
                        %s, %s
                    )
                    """,
                    [
                        tenant_id, company_code, company_name, business_name,
                        person_name, email, phone, gst or None,
                        employees, users_count, plan_id, plan_name,
                        end_date_val, city, state
                    ]
                )

                # 3. Create initial admin user
                admin_pass_enc = hashlib.sha256(admin_password.encode()).hexdigest()
                cursor.execute(
                    """
                    INSERT INTO tenants_users (
                        tenant_id, company_code, username, password, designation, issuperadmin, deleted, created_at
                    ) VALUES (%s, %s, %s, %s, 'Superadmin', 1, 0, GETDATE())
                    """,
                    [tenant_id, company_code, admin_username, admin_pass_enc]
                )

                # 4. Insert default user rights (all True) for the admin user
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

                # 5. Update/insert license mapping in tenants_lisencemodule
                update_tenant_license(tenant_id, company_code, plan_id, modules_dict)

        return Response({"success": True, "message": "Tenant created successfully."})
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

@api_view(["PUT"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_update_tenant(request):
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    tenant_id = request.data.get("tenant_id")
    company_code = str(request.data.get("company_code") or "").strip().upper()
    company_name = str(request.data.get("company_name") or "").strip()
    business_name = str(request.data.get("business_name") or "").strip()
    person_name = str(request.data.get("business_person_name") or "").strip()
    email = str(request.data.get("email_id") or "").strip()
    phone = str(request.data.get("phone_number") or "").strip()
    gst = str(request.data.get("gst_number") or "").strip()
    employees = str(request.data.get("no_of_employees") or "").strip()
    users_count = int(request.data.get("no_of_users") or 5)
    plan_id = str(request.data.get("plan_id") or "free").strip().lower()
    plan_name = str(request.data.get("plan_name") or "Free Plan").strip()
    signup_date = str(request.data.get("signup_date") or request.data.get("start_date") or "").strip()
    end_date = str(request.data.get("end_date") or "").strip()
    city = str(request.data.get("city") or "").strip()
    state = str(request.data.get("state") or "").strip()
    active_status = 1 if bool(request.data.get("active_status", True)) else 0
    modules_dict = request.data.get("modules")

    erp_server = str(request.data.get("erp_server") or "").strip()
    erp_database = str(request.data.get("erp_database") or "").strip()
    erp_user = str(request.data.get("erp_user") or "").strip()
    erp_password = str(request.data.get("erp_password") or "").strip()
    erp_port = int(request.data.get("erp_port") or 1433)

    if not tenant_id or not company_code or not company_name:
        return Response({"error": "tenant_id, company_code and company_name are required."}, status=400)

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # 1. Update tenants_signup
                cursor.execute(
                    """
                    UPDATE tenants_signup
                    SET 
                        company_name = %s,
                        business_name = %s,
                        business_person_name = %s,
                        email_id = %s,
                        phone_number = %s,
                        gst_number = %s,
                        no_of_employees = %s,
                        no_of_users = %s,
                        plan_id = %s,
                        plan_name = %s,
                        signup_date = COALESCE(%s, signup_date),
                        end_date = %s,
                        active_status = %s,
                        city = %s,
                        state = %s
                    WHERE tenant_id = %s
                    """,
                    [
                        company_name, business_name, person_name, email, phone, gst or None,
                        employees, users_count, plan_id, plan_name, signup_date or None, end_date or None, active_status,
                        city, state,
                        tenant_id
                    ]
                )

                # 2. Update tenants
                cursor.execute(
                    """
                    UPDATE tenants
                    SET 
                        company_name = %s,
                        erp_server = %s,
                        erp_database = %s,
                        erp_user = %s,
                        erp_password = %s,
                        erp_port = %s,
                        status = %s
                    WHERE id = %s
                    """,
                    [
                        company_name, erp_server, erp_database, erp_user, erp_password, erp_port,
                        active_status, tenant_id
                    ]
                )

                # 3. Update/insert license mapping in tenants_lisencemodule
                update_tenant_license(tenant_id, company_code, plan_id, modules_dict)

        return Response({"success": True, "message": "Tenant details updated successfully."})
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)


@api_view(["PATCH"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_patch_tenant_status(request, tenant_id):
    """Fast active/inactive toggle — two SQL updates only, no license sync."""
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    active_status = 1 if bool(request.data.get("active_status", False)) else 0

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM tenants WHERE id = %s",
                    [tenant_id],
                )
                if not cursor.fetchone():
                    return Response({"error": "Tenant not found."}, status=404)
                cursor.execute(
                    "UPDATE tenants_signup SET active_status = %s WHERE tenant_id = %s",
                    [active_status, tenant_id],
                )
                cursor.execute(
                    "UPDATE tenants SET status = %s WHERE id = %s",
                    [active_status, tenant_id],
                )

        return Response({
            "success": True,
            "tenant_id": tenant_id,
            "active_status": bool(active_status),
        })
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)


@api_view(["DELETE"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_delete_tenant(request, tenant_id):
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Get company_code first
                cursor.execute("SELECT company_code FROM tenants WHERE id = %s", [tenant_id])
                row = cursor.fetchone()
                if not row:
                    return Response({"error": "Tenant not found."}, status=404)
                company_code = row[0]

                # Delete from user rights
                cursor.execute("DELETE FROM tenants_usersrights WHERE tenant_id = %s OR company_code = %s", [tenant_id, company_code])
                # Delete from users
                cursor.execute("DELETE FROM tenants_users WHERE tenant_id = %s OR company_code = %s", [tenant_id, company_code])
                # Delete from signup
                cursor.execute("DELETE FROM tenants_signup WHERE tenant_id = %s OR company_code = %s", [tenant_id, company_code])
                # Delete from tenant upgrades
                cursor.execute("DELETE FROM tenant_planupgrade WHERE tenant_id = %s OR company_code = %s", [tenant_id, company_code])
                # Delete from tenants
                cursor.execute("DELETE FROM tenants WHERE id = %s", [tenant_id])

        return Response({"success": True, "message": "Tenant and all associated data deleted successfully."})
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

# ─────────────────────────────────────────────────────────────
#  TENANT USER MANAGEMENT
# ─────────────────────────────────────────────────────────────
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_list_tenant_users(request, company_code):
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT 
                    u.id, 
                    u.username, 
                    u.designation, 
                    u.issuperadmin, 
                    u.created_at, 
                    u.password,
                    s.session_key,
                    s.system_name
                FROM tenants_users u
                LEFT JOIN tenants_userssession s ON u.company_code = s.company_code AND u.username = s.username
                WHERE u.company_code = %s AND u.deleted = 0 
                ORDER BY u.username
                """,
                [company_code]
            )
            rows = cursor.fetchall()
            users = []
            for r in rows:
                c_date = r[4].strftime("%Y-%m-%d %H:%M") if isinstance(r[4], datetime) else str(r[4] or "")
                raw_password = r[5] or ""
                try:
                    decrypted_pw = decrypt_password(raw_password)
                except Exception:
                    decrypted_pw = raw_password
                users.append({
                    "id": r[0],
                    "username": r[1],
                    "designation": r[2] or "User",
                    "issuperadmin": bool(r[3]),
                    "created_at": c_date,
                    "password": decrypted_pw,
                    "isActive": bool(r[6]),
                    "systemName": r[7] or ""
                })
            return Response({"success": True, "users": users})
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

@api_view(["DELETE"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_delete_tenant_user(request, user_id):
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Get username and company_code
                cursor.execute("SELECT company_code, username FROM tenants_users WHERE id = %s", [user_id])
                row = cursor.fetchone()
                if not row:
                    return Response({"error": "User not found."}, status=404)
                ccode, uname = row

                # Soft delete the user (deleted = 1)
                cursor.execute("UPDATE tenants_users SET deleted = 1 WHERE id = %s", [user_id])
                # Delete user rights
                cursor.execute("DELETE FROM tenants_usersrights WHERE company_code = %s AND username = %s", [ccode, uname])

        return Response({"success": True, "message": "User deleted successfully."})
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_user_transactions(request):
    try:
        check_admin_auth(request)
    except PermissionError as e:
        return admin_auth_denied_response(e)

    from_date = request.GET.get("from_date")
    to_date = request.GET.get("to_date")
    company_code = request.GET.get("company_code", "all")
    username = request.GET.get("username", "all")
    module_name = request.GET.get("module_name", "all")
    report_type = request.GET.get("report_type", "date_wise")

    params = []
    where_clauses = []

    if from_date:
        where_clauses.append("ut.created_at >= %s")
        params.append(f"{from_date} 00:00:00")
    if to_date:
        where_clauses.append("ut.created_at <= %s")
        params.append(f"{to_date} 23:59:59")
    if company_code and company_code != "all":
        where_clauses.append("ut.company_code = %s")
        params.append(company_code)
    if username and username != "all":
        where_clauses.append("ut.username = %s")
        params.append(username)
    if module_name and module_name != "all":
        where_clauses.append("ut.module_name = %s")
        params.append(module_name)

    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    # Ordering based on report type
    if report_type == "user_wise":
        order_sql = "ORDER BY ut.username ASC, ut.created_at DESC"
    else:
        order_sql = "ORDER BY ut.created_at DESC"

    query = f"""
        SELECT 
            ut.id, 
            ut.created_at, 
            ut.username, 
            ut.module_name, 
            ut.company_code,
            t.company_name,
            t.erp_database,
            ts.plan_name
        FROM tenants_usersTransaction ut
        LEFT JOIN tenants t ON ut.company_code = t.company_code
        LEFT JOIN tenants_signup ts ON ut.company_code = ts.company_code
        {where_sql}
        {order_sql}
    """

    try:
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()

            transactions = []
            for r in rows:
                tx_id, created_at, uname, mname, ccode, cname, dbname, db_plan_name = r
                iso_time = (created_at.isoformat() + "Z") if created_at else ""
                
                # Determine plan name
                prefix = (ccode or "").strip().upper()[:1]
                if prefix == "T":
                    plan_val = "Testing Details (T)"
                elif prefix == "D":
                    plan_val = "Demo Details (D)"
                elif prefix == "P":
                    plan_val = "Programming Details (P)"
                else:
                    plan_val = db_plan_name or "Free"

                transactions.append({
                    "id": tx_id,
                    "timestamp": iso_time,
                    "username": uname,
                    "module_name": mname,
                    "company_code": ccode,
                    "company_name": cname or ccode,
                    "erp_database": dbname or "—",
                    "plan_name": plan_val
                })

            # Also fetch all distinct company codes & usernames for filters
            cursor.execute("SELECT DISTINCT company_code, company_name FROM tenants ORDER BY company_name")
            companies = [{"company_code": row[0], "company_name": row[1]} for row in cursor.fetchall()]

            cursor.execute("SELECT DISTINCT username FROM tenants_usersTransaction ORDER BY username")
            usernames = [row[0] for row in cursor.fetchall()]

            cursor.execute("SELECT DISTINCT module_name FROM tenants_usersTransaction ORDER BY module_name")
            modules = [row[0] for row in cursor.fetchall()]

            return Response({
                "success": True,
                "transactions": transactions,
                "companies": companies,
                "usernames": usernames,
                "modules": modules
            })
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

