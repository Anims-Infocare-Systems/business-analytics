# ════════════════════════════════════════════════════════════════
#  views_userrights.py
#  User Rights — ERP Users + cloud usersrights (form-wise)
#
#  Super admin (Users.IsSuperAdmin / IsSupperAdmin = 1): all forms.
#  GET  user-rights/list/ | user-rights/me/
#  PUT  user-rights/update/ | POST user-rights/bulk-save/
# ════════════════════════════════════════════════════════════════
from collections import defaultdict

from django.db import transaction
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import UserRight
from .views import find_column_ci, get_tenant_connection, resolve_erp_table

FORM_RIGHTS_KEYS = (
    "Dashboard",
    "Approvals",
    "Reports",
    "MIS",
    "Charts",
    "Utility",
)

_SUPER_ADMIN_COL_CANDIDATES = ("IsSuperAdmin", "IsSupperAdmin", "IsSuperadmin")

_LIST_SQL = """
    SELECT
        u.UserId,
        u.UserName,
        u.EmpCode,
        ISNULL(d.Designation, N'') AS Designation,
        {super_admin_expr}
    FROM Users u
    LEFT JOIN empmaster e
        ON LTRIM(RTRIM(CONVERT(NVARCHAR(64), ISNULL(u.EmpCode, N''))))
         = LTRIM(RTRIM(CONVERT(NVARCHAR(64), ISNULL(e.empcode, N''))))
        AND ISNULL(e.deleted, 0) = 0
    LEFT JOIN DesignationMast d
        ON e.desgcode = d.DesgCode
        AND ISNULL(d.Deleted, 0) = 0
    WHERE 1=1
"""


def _truthy(val) -> bool:
    if val is None:
        return False
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return val != 0
    s = str(val).strip().upper()
    return s in ("1", "Y", "YES", "TRUE", "T")


def _to_bit(val) -> int:
    return 1 if _truthy(val) else 0


def _rights_schema():
    return [{"key": key, "label": key} for key in FORM_RIGHTS_KEYS]


def _all_rights(on: bool) -> dict:
    return {key: on for key in FORM_RIGHTS_KEYS}


def _super_admin_sql_expr(cursor) -> str:
    schema, table_name, _ = resolve_erp_table(cursor, ["Users"])
    if not schema:
        return "CAST(0 AS INT) AS IsSuperAdmin"
    col = find_column_ci(cursor, schema, table_name, _SUPER_ADMIN_COL_CANDIDATES)
    if col:
        return f"ISNULL(u.[{col}], 0) AS IsSuperAdmin"
    return "CAST(0 AS INT) AS IsSuperAdmin"


def _normalize_user_id(user_id):
    try:
        return int(user_id)
    except (TypeError, ValueError):
        return user_id


def _cloud_rights_map(company_code: str, user_ids: list) -> dict:
    """user_id -> { form_key: bool }"""
    if not user_ids:
        return {}
    norm_ids = [_normalize_user_id(uid) for uid in user_ids]
    rows = UserRight.objects.filter(
        company_code__iexact=company_code,
        user_id__in=norm_ids,
        form_key__in=FORM_RIGHTS_KEYS,
    )
    out = defaultdict(dict)
    for row in rows:
        out[_normalize_user_id(row.user_id)][row.form_key] = row.has_access
    return dict(out)


def _rights_from_cloud(cloud_map: dict, user_id, is_super_admin: bool) -> dict:
    if is_super_admin:
        return _all_rights(True)
    stored = cloud_map.get(_normalize_user_id(user_id)) or {}
    return {key: bool(stored.get(key, False)) for key in FORM_RIGHTS_KEYS}


def _rights_rows_for_user(company_code: str, user_id, rights_payload: dict) -> list:
    """Build UserRight rows for one user (all 6 form keys)."""
    uid = _normalize_user_id(user_id)
    rights = rights_payload if isinstance(rights_payload, dict) else {}
    rows = []
    for key in FORM_RIGHTS_KEYS:
        rows.append(UserRight(
            company_code=company_code,
            user_id=uid,
            form_key=key,
            has_access=_truthy(rights.get(key, False)),
        ))
    return rows


def _bulk_save_cloud_rights(company_code: str, items: list) -> list:
    """
    Save all users in one DB transaction (delete + bulk_create).
    Returns list of saved user ids.
    """
    company_code = company_code.strip()
    if not company_code:
        raise ValueError("Company code is required.")

    to_create = []
    user_ids = []
    for item in items:
        if not isinstance(item, dict):
            continue
        user_id = item.get("userId")
        if user_id is None:
            continue
        uid = _normalize_user_id(user_id)
        user_ids.append(uid)
        to_create.extend(_rights_rows_for_user(company_code, uid, item.get("rights") or {}))

    if not user_ids:
        return []

    with transaction.atomic():
        UserRight.objects.filter(
            company_code__iexact=company_code,
            user_id__in=user_ids,
        ).delete()
        if to_create:
            UserRight.objects.bulk_create(to_create, batch_size=500)

    return user_ids


def _save_cloud_rights(company_code: str, user_id, rights_payload: dict):
    _bulk_save_cloud_rights(company_code, [{"userId": user_id, "rights": rights_payload}])


def _erp_user_ids_exist(cursor, user_ids: list) -> set:
    if not user_ids:
        return set()
    placeholders = ",".join("?" for _ in user_ids)
    cursor.execute(
        f"SELECT UserId FROM Users WHERE UserId IN ({placeholders})",
        list(user_ids),
    )
    return {_normalize_user_id(r[0]) for r in cursor.fetchall()}


def _row_to_user(cols, row, cloud_map: dict) -> dict:
    data = dict(zip(cols, row))
    user_id = _normalize_user_id(data.get("UserId"))
    user_name = str(data.get("UserName") or "").strip()
    designation = str(data.get("Designation") or "").strip()
    avatar = (user_name[:2] or "??").upper()
    is_super_admin = _truthy(data.get("IsSuperAdmin"))
    rights = _rights_from_cloud(cloud_map, user_id, is_super_admin)
    return {
        "userId": user_id,
        "userName": user_name,
        "empCode": str(data.get("EmpCode") or "").strip(),
        "designation": designation or "—",
        "avatar": avatar,
        "isSuperAdmin": is_super_admin,
        "rights": rights,
        "hasAccess": is_super_admin or any(rights.values()),
    }


def _company_code(tenant: dict) -> str:
    return str(tenant.get("company_code") or "").strip()


def _session_username(tenant: dict) -> str:
    return str(tenant.get("username") or "").strip()


def _is_super_admin_user(conn, user_id) -> bool:
    cursor = conn.cursor()
    schema, table_name, _ = resolve_erp_table(cursor, ["Users"])
    if not schema:
        cursor.close()
        return False
    col = find_column_ci(cursor, schema, table_name, _SUPER_ADMIN_COL_CANDIDATES)
    if not col:
        cursor.close()
        return False
    cursor.execute(f"SELECT ISNULL([{col}], 0) FROM Users WHERE UserId = ?", [user_id])
    row = cursor.fetchone()
    cursor.close()
    return _truthy(row[0]) if row else False


def _fetch_erp_user_by_username(conn, username: str):
    cursor = conn.cursor()
    super_expr = _super_admin_sql_expr(cursor)
    sql = _LIST_SQL.format(super_admin_expr=super_expr)
    sql += " AND u.UserName = ? "
    cursor.execute(sql, [username])
    row = cursor.fetchone()
    cols = [d[0] for d in cursor.description] if row else []
    cursor.close()
    if not row:
        return None, cols, row
    return dict(zip(cols, row)), cols, row


def resolve_login_access(conn, company_code: str, username: str) -> dict:
    """Rights + hasAccess for login (single ERP connection, no extra HTTP round trip)."""
    data, _, row = _fetch_erp_user_by_username(conn, username)
    if not row:
        return {
            "userId": None,
            "isSuperAdmin": False,
            "rights": _all_rights(False),
            "hasAccess": False,
        }
    user_id = _normalize_user_id(data.get("UserId"))
    is_super_admin = _truthy(data.get("IsSuperAdmin"))
    cloud_map = _cloud_rights_map(company_code, [user_id])
    rights = _rights_from_cloud(cloud_map, user_id, is_super_admin)
    return {
        "userId": user_id,
        "isSuperAdmin": is_super_admin,
        "rights": rights,
        "hasAccess": is_super_admin or any(rights.values()),
    }


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def user_rights_list(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    company = _company_code(tenant)
    search = (request.GET.get("search") or "").strip()

    try:
        cursor = conn.cursor()
        super_expr = _super_admin_sql_expr(cursor)
        sql = _LIST_SQL.format(super_admin_expr=super_expr)
        params = []
        if search:
            sql += " AND u.UserName LIKE ? "
            params.append(f"%{search}%")
        sql += " ORDER BY u.UserName "
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        cols = [d[0] for d in cursor.description]
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    user_ids = [r[cols.index("UserId")] for r in rows if "UserId" in cols]
    cloud_map = _cloud_rights_map(company, user_ids)
    users = [_row_to_user(cols, r, cloud_map) for r in rows]
    active_count = sum(1 for u in users if u["hasAccess"])

    return Response({
        "success": True,
        "company": tenant.get("company_name", ""),
        "rightsSchema": _rights_schema(),
        "stats": {
            "totalUsers": len(users),
            "activeUsers": active_count,
            "rightsPerUser": len(FORM_RIGHTS_KEYS),
        },
        "users": users,
    })


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def user_rights_me(request):
    """Rights for the logged-in user (menu / form access)."""
    try:
        conn, tenant = get_tenant_connection(request)
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
        data, _, row = _fetch_erp_user_by_username(conn, username)
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    if not row:
        return Response({"error": "User not found in ERP."}, status=404)

    user_id = _normalize_user_id(data.get("UserId"))
    is_super_admin = _truthy(data.get("IsSuperAdmin"))
    cloud_map = _cloud_rights_map(company, [user_id])
    rights = _rights_from_cloud(cloud_map, user_id, is_super_admin)

    return Response({
        "success": True,
        "company": tenant.get("company_name", ""),
        "companyCode": company,
        "username": username,
        "userId": user_id,
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
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    user_id = request.data.get("userId")
    if user_id is None:
        return Response({"error": "Field 'userId' is required."}, status=400)

    company = _company_code(tenant)
    rights_in = request.data.get("rights") or {}

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM Users WHERE UserId = ?", [user_id])
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return Response({"error": f"UserId '{user_id}' not found."}, status=404)
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    try:
        _save_cloud_rights(company, user_id, rights_in)
    except Exception as e:
        return Response({"error": f"Could not save rights: {str(e)}"}, status=500)

    is_super_admin = False
    try:
        conn2, _ = get_tenant_connection(request)
        is_super_admin = _is_super_admin_user(conn2, user_id)
        conn2.close()
    except Exception:
        pass

    cloud_map = _cloud_rights_map(company, [user_id])
    rights = _rights_from_cloud(cloud_map, user_id, is_super_admin)

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
def user_rights_bulk_save(request):
    try:
        conn, tenant = get_tenant_connection(request)
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

    requested_ids = [_normalize_user_id(i["userId"]) for i in valid_items]

    try:
        cursor = conn.cursor()
        existing_ids = _erp_user_ids_exist(cursor, requested_ids)
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    to_save = []
    for item in valid_items:
        uid = _normalize_user_id(item["userId"])
        if uid not in existing_ids:
            errors.append({"userId": item["userId"], "error": "User not found."})
            continue
        to_save.append(item)

    updated = []
    if to_save:
        try:
            updated = _bulk_save_cloud_rights(company, to_save)
        except Exception as e:
            return Response({"error": f"Could not save rights: {str(e)}"}, status=500)

    return Response({
        "success": len(errors) == 0,
        "savedInCloud": True,
        "updatedCount": len(updated),
        "updatedUserIds": updated,
        "errors": errors,
        "message": (
            f"Saved rights for {len(updated)} user(s)."
            if not errors
            else f"Updated {len(updated)} user(s) with {len(errors)} error(s)."
        ),
    })
