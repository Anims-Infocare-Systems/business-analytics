# ════════════════════════════════════════════════════════════════
#  views_userrights.py
#  User Rights — tenants_users + tenants_usersrights
# ════════════════════════════════════════════════════════════════
from collections import defaultdict

from django.db import connection, transaction
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Tenant
from .views import encrypt_password

FORM_RIGHTS_KEYS = (
    "Dashboard",
    "Approvals",
    "Reports",
    "MIS",
    "Charts",
    "Utility",
)


def get_session_tenant(request):
    """Validate that a valid tenant session exists and return the tenant dictionary."""
    tenant = request.session.get("tenant")
    if not tenant:
        raise ValueError("Session expired. Please login again.")
    return tenant


def _rights_schema():
    return [{"key": key, "label": key} for key in FORM_RIGHTS_KEYS]


def _company_code(tenant: dict) -> str:
    return str(tenant.get("company_code") or "").strip()


def _session_username(tenant: dict) -> str:
    return str(tenant.get("username") or "").strip()


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def user_rights_list(request):
    try:
        tenant = get_session_tenant(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    company = _company_code(tenant)
    search = (request.GET.get("search") or "").strip()
    max_users = 0

    try:
        with connection.cursor() as cursor:
            # Fetch no_of_users from tenants_signup
            cursor.execute(
                "SELECT no_of_users FROM tenants_signup WHERE company_code = %s",
                [company]
            )
            signup_row = cursor.fetchone()
            max_users = signup_row[0] if (signup_row and signup_row[0] is not None) else 0

            # Fetch users
            if search:
                cursor.execute(
                    "SELECT id, tenant_id, company_code, username, designation, issuperadmin FROM tenants_users WHERE company_code = %s AND deleted = 0 AND username LIKE %s ORDER BY username",
                    [company, f"%{search}%"]
                )
            else:
                cursor.execute(
                    "SELECT id, tenant_id, company_code, username, designation, issuperadmin FROM tenants_users WHERE company_code = %s AND deleted = 0 ORDER BY username",
                    [company]
                )
            user_rows = cursor.fetchall()

            # Fetch rights
            cursor.execute(
                "SELECT username, form_name, access FROM tenants_usersrights WHERE company_code = %s",
                [company]
            )
            rights_rows = cursor.fetchall()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    rights_map = defaultdict(dict)
    for rname, fname, acc in rights_rows:
        rights_map[rname][fname] = bool(acc)

    users = []
    for uid, tid, ccode, uname, desg, issuper in user_rows:
        desg = (desg or "").strip()
        is_super_admin = (desg.lower() == "admin" or bool(issuper))

        u_rights = {key: False for key in FORM_RIGHTS_KEYS}
        if is_super_admin:
            for key in FORM_RIGHTS_KEYS:
                u_rights[key] = True
        else:
            for key in FORM_RIGHTS_KEYS:
                u_rights[key] = rights_map[uname].get(key, False)

        avatar = (uname[:2] or "??").upper()
        has_access = is_super_admin or any(u_rights.values())

        users.append({
            "userId": uid,
            "userName": uname,
            "empCode": "—",
            "designation": desg or "—",
            "avatar": avatar,
            "isSuperAdmin": is_super_admin,
            "rights": u_rights,
            "hasAccess": has_access
        })

    active_count = sum(1 for u in users if u["hasAccess"])

    return Response({
        "success": True,
        "company": tenant.get("company_name", ""),
        "rightsSchema": _rights_schema(),
        "stats": {
            "totalUsers": len(users),
            "activeUsers": active_count,
            "rightsPerUser": len(FORM_RIGHTS_KEYS),
            "maxUsers": max_users,
        },
        "users": users,
    })


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def user_rights_me(request):
    try:
        tenant = get_session_tenant(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    username = _session_username(tenant) or (request.GET.get("username") or "").strip()
    if not username:
        return Response(
            {"error": "Session username missing. Please log in again."},
            status=401,
        )

    company = _company_code(tenant)
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, tenant_id, company_code, username, designation, issuperadmin FROM tenants_users WHERE company_code = %s AND username = %s AND deleted = 0",
                [company, username]
            )
            row = cursor.fetchone()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    if not row:
        return Response({"error": "User not found."}, status=404)

    user_id, tenant_id, company_code, uname, desg, issuper = row
    desg = (desg or "").strip()
    is_super_admin = (desg.lower() == "admin" or bool(issuper))

    rights = {key: False for key in FORM_RIGHTS_KEYS}
    if is_super_admin:
        for key in FORM_RIGHTS_KEYS:
            rights[key] = True
    else:
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT form_name, access FROM tenants_usersrights WHERE company_code = %s AND username = %s",
                    [company, username]
                )
                for r_row in cursor.fetchall():
                    f_name, acc = r_row[0], bool(r_row[1])
                    if f_name in rights:
                        rights[f_name] = acc
        except Exception:
            pass

    return Response({
        "success": True,
        "company": tenant.get("company_name", ""),
        "companyCode": company,
        "username": username,
        "userId": user_id,
        "designation": desg,
        "isSuperAdmin": is_super_admin,
        "rights": rights,
        "rightsSchema": _rights_schema(),
        "hasAccess": is_super_admin or any(rights.values()),
    })


@api_view(["PUT", "PATCH"])
@authentication_classes([])
@permission_classes([AllowAny])
def user_rights_update(request):
    try:
        tenant = get_session_tenant(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    user_id = request.data.get("userId")
    if user_id is None:
        return Response({"error": "Field 'userId' is required."}, status=400)

    company = _company_code(tenant)
    rights_in = request.data.get("rights") or {}

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # 1. Fetch user detail
                cursor.execute(
                    "SELECT tenant_id, company_code, username, designation, issuperadmin FROM tenants_users WHERE id = %s AND deleted = 0",
                    [user_id]
                )
                row = cursor.fetchone()
                if not row:
                    return Response({"error": f"User ID '{user_id}' not found or deleted."}, status=404)

                tenant_id, company_code, username, desg, issuper = row
                if company_code.strip().upper() != company.upper():
                    return Response({"error": "Unauthorized access to update this user's rights."}, status=403)

                desg = (desg or "").strip()
                is_super_admin = (desg.lower() == "admin" or bool(issuper))

                # 2. Update rights in DB
                cursor.execute(
                    "DELETE FROM tenants_usersrights WHERE company_code = %s AND username = %s",
                    [company_code, username]
                )
                for key in FORM_RIGHTS_KEYS:
                    val = 1 if bool(rights_in.get(key, False)) else 0
                    cursor.execute(
                        """
                        INSERT INTO tenants_usersrights (tenant_id, company_code, username, form_name, access)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        [tenant_id, company_code, username, key, val]
                    )

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    # Re-fetch rights to return
    rights = {key: False for key in FORM_RIGHTS_KEYS}
    if is_super_admin:
        for key in FORM_RIGHTS_KEYS:
            rights[key] = True
    else:
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT form_name, access FROM tenants_usersrights WHERE company_code = %s AND username = %s",
                    [company, username]
                )
                for r_row in cursor.fetchall():
                    f_name, acc = r_row[0], bool(r_row[1])
                    if f_name in rights:
                        rights[f_name] = acc
        except Exception:
            pass

    return Response({
        "success": True,
        "savedInCloud": True,
        "userId": user_id,
        "rights": rights,
        "message": "User rights saved.",
    })


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def user_rights_add_user(request):
    try:
        tenant = get_session_tenant(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    company = _company_code(tenant)
    tenant_id = tenant.get("tenant_id")
    if not tenant_id:
        try:
            tenant_obj = Tenant.objects.get(company_code__iexact=company, status=True)
            tenant_id = tenant_obj.id
        except Tenant.DoesNotExist:  # type: ignore
            tenant_id = None

    user_name   = str(request.data.get("userName") or "").strip()
    designation = str(request.data.get("designation") or "").strip()
    password    = str(request.data.get("password") or "").strip()

    if not user_name:
        return Response({"error": "userName is required."}, status=400)
    if not password or len(password) < 6:
        return Response({"error": "Password must be at least 6 characters."}, status=400)

    encrypted_pw = encrypt_password(password)

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Check user limit
                cursor.execute(
                    "SELECT no_of_users FROM tenants_signup WHERE company_code = %s",
                    [company]
                )
                signup_row = cursor.fetchone()
                max_users = signup_row[0] if (signup_row and signup_row[0] is not None) else 0

                cursor.execute(
                    "SELECT COUNT(1) FROM tenants_users WHERE company_code = %s AND deleted = 0",
                    [company]
                )
                current_users = cursor.fetchone()[0]

                if max_users > 0 and current_users >= max_users:
                    return Response({"error": f"User limit reached. Maximum allowed users is {max_users}."}, status=400)

                # Check duplicate username
                cursor.execute(
                    "SELECT COUNT(1) FROM tenants_users WHERE company_code = %s AND username = %s",
                    [company, user_name]
                )
                if cursor.fetchone()[0] > 0:
                    return Response({"error": f"Username '{user_name}' already exists."}, status=409)

                # Insert new user
                cursor.execute(
                    """
                    INSERT INTO tenants_users (tenant_id, company_code, username, designation, password, created_at, issuperadmin, deleted)
                    VALUES (%s, %s, %s, %s, %s, GETDATE(), 0, 0)
                    """,
                    [tenant_id, company, user_name, designation, encrypted_pw]
                )

                # Fetch new user ID
                cursor.execute(
                    "SELECT id FROM tenants_users WHERE company_code = %s AND username = %s",
                    [company, user_name]
                )
                new_user_id = cursor.fetchone()[0]

        return Response({
            "success": True,
            "userId": new_user_id,
            "userName": user_name,
            "message": f"User '{user_name}' created successfully.",
        }, status=201)
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)


@api_view(["DELETE"])
@authentication_classes([])
@permission_classes([AllowAny])
def user_rights_delete(request, user_id):
    try:
        tenant = get_session_tenant(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    company = _company_code(tenant)
    if not company:
        return Response({"error": "Invalid tenant session."}, status=401)

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # 1. Look up user to ensure they belong to this company
                cursor.execute(
                    "SELECT company_code, username, designation, issuperadmin FROM tenants_users WHERE id = %s",
                    [user_id]
                )
                row = cursor.fetchone()
                if not row:
                    return Response({"error": "User not found."}, status=404)

                db_company, username, designation, issuper = row
                if db_company.strip().upper() != company.upper():
                    return Response({"error": "Unauthorized access to delete this user."}, status=403)

                desg = (designation or "").strip()
                is_super_admin = (desg.lower() == "admin" or bool(issuper))
                if is_super_admin:
                    return Response({"error": "Superadmin accounts cannot be deleted."}, status=400)

                # Prevent self-deletion if logged in as this user
                session_user = _session_username(tenant)
                if session_user.upper() == username.upper():
                    return Response({"error": "Cannot delete your own admin account."}, status=400)

                # 2. Delete user and their rights
                cursor.execute(
                    "DELETE FROM tenants_usersrights WHERE company_code = %s AND username = %s",
                    [db_company, username]
                )
                cursor.execute(
                    "UPDATE tenants_users SET deleted = 1 WHERE id = %s",
                    [user_id]
                )

        return Response({
            "success": True,
            "message": f"User '{username}' deleted successfully."
        })
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def user_rights_bulk_save(request):
    try:
        tenant = get_session_tenant(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    items = request.data.get("users")
    if not isinstance(items, list) or not items:
        return Response({"error": "Field 'users' must be a non-empty array."}, status=400)

    company = _company_code(tenant)
    valid_items = []
    errors = []

    for item in items:
        if not isinstance(item, dict):
            errors.append({"error": "Invalid user entry (not an object)."})
            continue
        user_id = item.get("userId")
        if user_id is None:
            errors.append({"error": "Missing userId.", "item": item})
            continue
        valid_items.append(item)

    if not valid_items and errors:
        return Response({"success": False, "errors": errors}, status=400)

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                for item in valid_items:
                    user_id = item["userId"]
                    rights_in = item.get("rights") or {}

                    # 1. Fetch user detail
                    cursor.execute(
                        "SELECT tenant_id, company_code, username FROM tenants_users WHERE id = %s AND deleted = 0",
                        [user_id]
                    )
                    row = cursor.fetchone()
                    if not row:
                        errors.append({"userId": user_id, "error": "User not found or deleted."})
                        continue

                    tenant_id, company_code, username = row
                    if company_code.strip().upper() != company.upper():
                        errors.append({"userId": user_id, "error": "Unauthorized access."})
                        continue

                    # 2. Update rights
                    cursor.execute(
                        "DELETE FROM tenants_usersrights WHERE company_code = %s AND username = %s",
                        [company_code, username]
                    )
                    for key in FORM_RIGHTS_KEYS:
                        val = 1 if bool(rights_in.get(key, False)) else 0
                        cursor.execute(
                            """
                            INSERT INTO tenants_usersrights (tenant_id, company_code, username, form_name, access)
                            VALUES (%s, %s, %s, %s, %s)
                            """,
                            [tenant_id, company_code, username, key, val]
                        )
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "success": len(errors) == 0,
        "savedInCloud": True,
        "errors": errors,
        "message": (
            "Saved all user rights."
            if not errors
            else f"Saved rights with {len(errors)} error(s)."
        ),
    })
