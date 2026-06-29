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
    "Top Management Dashboard",
    "Plant Performance Dashboard",
    "Approvals",
    "E-Approval",
    "T-Approval",
    "Reports",
    "Sales Analysis",
    "Purchase Analysis",
    "Quality Analysis",
    "Production Analysis",
    "MIS",
    "Idle Time Report",
    "Efficiency Report",
    "Charts",
    "Utility",
    "User Rights",
)


def get_session_tenant(request, allow_expired=False):
    """Validate that a valid tenant session exists and return the tenant dictionary."""
    tenant = request.session.get("tenant")
    if not tenant:
        raise ValueError("Session expired. Please login again.")
    if not allow_expired:
        from .views import is_plan_expired
        company_code = tenant.get("company_code")
        if company_code and is_plan_expired(company_code):
            raise ValueError("Subscription expired. Please renew or upgrade your plan.")
    return tenant


def _rights_schema():
    return [{"key": key, "label": key} for key in FORM_RIGHTS_KEYS]


def _company_code(tenant: dict) -> str:
    return str(tenant.get("company_code") or "").strip()


def _session_username(tenant: dict) -> str:
    return str(tenant.get("username") or "").strip()


def _is_super_admin(designation, issuper) -> bool:
    desg = (designation or "").strip()
    return desg.lower() == "admin" or bool(issuper)


def _rights_from_input(rights_in: dict) -> dict:
    return {key: bool(rights_in.get(key, False)) for key in FORM_RIGHTS_KEYS}


def _delete_users_rights(cursor, company_code: str, usernames: list[str]) -> None:
    if not usernames:
        return
    upper_names = [u.upper() for u in usernames if u]
    if not upper_names:
        return
    placeholders = ", ".join(["%s"] * len(upper_names))
    cursor.execute(
        f"DELETE FROM tenants_usersrights WHERE company_code = %s AND UPPER(username) IN ({placeholders})",
        [company_code, *upper_names],
    )


def _insert_users_rights(cursor, rows: list[tuple]) -> None:
    if not rows:
        return
    cursor.executemany(
        """
        INSERT INTO tenants_usersrights (tenant_id, company_code, username, form_name, access)
        VALUES (%s, %s, %s, %s, %s)
        """,
        rows,
    )


def _rights_rows_for_user(tenant_id, company_code: str, username: str, rights_in: dict) -> list[tuple]:
    normalized = _rights_from_input(rights_in)
    return [
        (tenant_id, company_code, username, key, 1 if normalized[key] else 0)
        for key in FORM_RIGHTS_KEYS
    ]


def _fetch_existing_rights(cursor, company_code: str, usernames: list[str]) -> dict:
    if not usernames:
        return {}
    upper_names = [u.upper() for u in usernames if u]
    if not upper_names:
        return {}
    placeholders = ", ".join(["%s"] * len(upper_names))
    cursor.execute(
        f"""
        SELECT UPPER(username), form_name, access
        FROM tenants_usersrights
        WHERE company_code = %s AND UPPER(username) IN ({placeholders})
        """,
        [company_code, *upper_names],
    )
    existing = defaultdict(dict)
    for uname, fname, acc in cursor.fetchall():
        existing[uname][fname] = 1 if acc else 0
    return existing


def _apply_rights_delta(cursor, pending_updates: list[tuple]) -> int:
    """
    Write only changed rights rows (UPDATE + INSERT), skipping unchanged keys.
    pending_updates: [(tenant_id, company_code, username, rights_in), ...]
    """
    if not pending_updates:
        return 0

    company_code = pending_updates[0][1]
    usernames = [username for _, _, username, _ in pending_updates]
    existing = _fetch_existing_rights(cursor, company_code, usernames)

    insert_rows = []
    update_rows = []
    for tenant_id, ccode, username, rights_in in pending_updates:
        normalized = _rights_from_input(rights_in)
        current = existing.get(username.upper(), {})
        for key in FORM_RIGHTS_KEYS:
            new_val = 1 if normalized[key] else 0
            if key not in current:
                insert_rows.append((tenant_id, ccode, username, key, new_val))
            elif current[key] != new_val:
                update_rows.append((new_val, ccode, username, key))

    if update_rows:
        cursor.executemany(
            """
            UPDATE tenants_usersrights
            SET access = %s
            WHERE company_code = %s AND UPPER(username) = UPPER(%s) AND form_name = %s
            """,
            update_rows,
        )
    _insert_users_rights(cursor, insert_rows)
    return len(update_rows) + len(insert_rows)


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
        rights_map[rname.lower()][fname] = bool(acc)  # normalize to lowercase for lookup

    users = []
    for uid, tid, ccode, uname, desg, issuper in user_rows:
        desg = (desg or "").strip()
        is_super_admin = _is_super_admin(desg, issuper)

        u_rights = {key: False for key in FORM_RIGHTS_KEYS}
        if is_super_admin:
            for key in FORM_RIGHTS_KEYS:
                u_rights[key] = True
        else:
            for key in FORM_RIGHTS_KEYS:
                u_rights[key] = rights_map[uname.lower()].get(key, False)  # lowercase lookup

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
        tenant = get_session_tenant(request, allow_expired=True)
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
    is_super_admin = _is_super_admin(desg, issuper)

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
    from .views import is_plan_expired, get_tenant_license
    is_expired = is_plan_expired(company)
    license_info = get_tenant_license(company)

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
        "isExpired": is_expired,
        "license": license_info,
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

                if _is_super_admin(desg, issuper):
                    return Response({
                        "success": True,
                        "savedInCloud": False,
                        "userId": user_id,
                        "rights": {key: True for key in FORM_RIGHTS_KEYS},
                        "message": "Superadmin rights are implicit and were not modified.",
                    })

                pending = [(tenant_id, company_code, username, rights_in)]
                writes = _apply_rights_delta(cursor, pending)

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    rights = _rights_from_input(rights_in)

    return Response({
        "success": True,
        "savedInCloud": True,
        "userId": user_id,
        "rights": rights,
        "writes": writes,
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
                is_super_admin = _is_super_admin(desg, issuper)
                if is_super_admin:
                    return Response({"error": "Superadmin accounts cannot be deleted."}, status=400)

                # Prevent self-deletion if logged in as this user
                session_user = _session_username(tenant)
                if session_user.upper() == username.upper():
                    return Response({"error": "Cannot delete your own admin account."}, status=400)

                # 2. Delete user and their rights (case-insensitive)
                cursor.execute(
                    "DELETE FROM tenants_usersrights WHERE company_code = %s AND UPPER(username) = UPPER(%s)",
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
                user_ids = [item["userId"] for item in valid_items]
                placeholders = ", ".join(["%s"] * len(user_ids))
                cursor.execute(
                    f"""
                    SELECT id, tenant_id, company_code, username, designation, issuperadmin
                    FROM tenants_users
                    WHERE deleted = 0 AND id IN ({placeholders})
                    """,
                    user_ids,
                )
                db_users = {
                    row[0]: {
                        "tenant_id": row[1],
                        "company_code": row[2],
                        "username": row[3],
                        "designation": row[4],
                        "issuperadmin": row[5],
                    }
                    for row in cursor.fetchall()
                }

                pending_updates = []
                for item in valid_items:
                    user_id = item["userId"]
                    rights_in = item.get("rights") or {}
                    db_user = db_users.get(user_id)
                    if not db_user:
                        errors.append({"userId": user_id, "error": "User not found or deleted."})
                        continue

                    company_code = db_user["company_code"]
                    username = db_user["username"]
                    if company_code.strip().upper() != company.upper():
                        errors.append({"userId": user_id, "error": "Unauthorized access."})
                        continue

                    if _is_super_admin(db_user["designation"], db_user["issuperadmin"]):
                        continue

                    pending_updates.append((
                        db_user["tenant_id"],
                        company_code,
                        username,
                        rights_in,
                    ))

                if pending_updates:
                    writes = _apply_rights_delta(cursor, pending_updates)
                else:
                    writes = 0
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "success": len(errors) == 0,
        "savedInCloud": True,
        "writes": writes,
        "errors": errors,
        "message": (
            "Saved all user rights."
            if not errors
            else f"Saved rights with {len(errors)} error(s)."
        ),
    })
