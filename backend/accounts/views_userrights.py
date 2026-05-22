# ════════════════════════════════════════════════════════════════
#  views_userrights.py
#  User Rights — Users / empmaster / DesignationMast (SQL Server)
#
#  App modules (6): Dashboard, Approvals, Reports, MIS, Charts, Utility
#  GET  user-rights/list/ | PUT user-rights/update/ | POST user-rights/bulk-save/
# ════════════════════════════════════════════════════════════════
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .views import get_tenant_connection

APP_RIGHTS_MODULES = (
    ("Dashboard", "IsAdmin"),
    ("Approvals", "IsEApprPoMod"),
    ("Reports", "IsShowValue"),
    ("MIS", "IsShowIndPend"),
    ("Charts", "IsTallyUpt"),
    ("Utility", "IsClrUsrFrm"),
)

APP_COL_BY_KEY = {key: col for key, col in APP_RIGHTS_MODULES}

_APP_COLS_SQL = ",\n                ".join(
    f"u.{col}" for col in dict.fromkeys(APP_COL_BY_KEY.values())
)

_LIST_SQL = f"""
    SELECT
        u.UserId,
        u.UserName,
        u.EmpCode,
        ISNULL(d.Designation, N'') AS Designation,
        {_APP_COLS_SQL}
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
    return [{"key": key, "label": key} for key, _ in APP_RIGHTS_MODULES]


def _app_rights_from_row(raw_row: dict) -> dict:
    return {key: _truthy(raw_row.get(col)) for key, col in APP_RIGHTS_MODULES}


def _row_to_user(cols, row) -> dict:
    data = dict(zip(cols, row))
    user_name = str(data.get("UserName") or "").strip()
    designation = str(data.get("Designation") or "").strip()
    avatar = (user_name[:2] or "??").upper()
    rights = _app_rights_from_row(data)
    return {
        "userId": data.get("UserId"),
        "userName": user_name,
        "empCode": str(data.get("EmpCode") or "").strip(),
        "designation": designation or "—",
        "avatar": avatar,
        "rights": rights,
        "hasAccess": any(rights.values()),
    }


def _build_update_sets(rights_payload: dict):
    """Return (set_clause_parts, params) — updates only the 6 app module columns."""
    parsed = {}
    if isinstance(rights_payload, dict):
        for key, col in APP_COL_BY_KEY.items():
            if key in rights_payload:
                parsed[col] = _to_bit(rights_payload[key])

    parts = []
    params = []
    for key, col in APP_COL_BY_KEY.items():
        parts.append(f"{col} = ?")
        params.append(parsed.get(col, 0))
    return parts, params


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def user_rights_list(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    search = (request.GET.get("search") or "").strip()
    sql = _LIST_SQL
    params = []
    if search:
        sql += " AND u.UserName LIKE ? "
        params.append(f"%{search}%")
    sql += " ORDER BY u.UserName "

    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        cols = [d[0] for d in cursor.description]
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    users = [_row_to_user(cols, r) for r in rows]
    active_count = sum(1 for u in users if u["hasAccess"])

    return Response({
        "success": True,
        "company": tenant.get("company_name", ""),
        "rightsSchema": _rights_schema(),
        "stats": {
            "totalUsers": len(users),
            "activeUsers": active_count,
            "rightsPerUser": len(APP_RIGHTS_MODULES),
        },
        "users": users,
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

    rights_in = request.data.get("rights") or {}
    set_parts, params = _build_update_sets(rights_in)
    params.append(user_id)
    update_sql = f"UPDATE Users SET {', '.join(set_parts)} WHERE UserId = ?"

    try:
        cursor = conn.cursor()
        cursor.execute(update_sql, params)
        affected = cursor.rowcount
        if affected == 0:
            cursor.close()
            conn.close()
            return Response({"error": f"UserId '{user_id}' not found."}, status=404)
        try:
            conn.commit()
            saved_in_erp = True
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            saved_in_erp = False
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    rights = {key: _truthy(rights_in.get(key)) for key in APP_COL_BY_KEY}
    return Response({
        "success": True,
        "savedInErp": saved_in_erp,
        "userId": user_id,
        "rights": rights,
        "message": "User rights updated." if saved_in_erp else "Rights acknowledged (commit failed).",
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

    updated = []
    errors = []

    try:
        cursor = conn.cursor()
        for item in items:
            if not isinstance(item, dict):
                errors.append({"error": "Invalid user entry (not an object)."})
                continue
            user_id = item.get("userId")
            if user_id is None:
                errors.append({"error": "Missing userId.", "item": item})
                continue

            rights_in = item.get("rights") or {}
            set_parts, params = _build_update_sets(rights_in)
            params.append(user_id)
            update_sql = f"UPDATE Users SET {', '.join(set_parts)} WHERE UserId = ?"

            try:
                cursor.execute(update_sql, params)
                if cursor.rowcount == 0:
                    errors.append({"userId": user_id, "error": "User not found."})
                else:
                    updated.append(user_id)
            except Exception as ex:
                errors.append({"userId": user_id, "error": str(ex)})

        try:
            conn.commit()
            saved_in_erp = True
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            saved_in_erp = False

        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "success": len(errors) == 0,
        "savedInErp": saved_in_erp,
        "updatedCount": len(updated),
        "updatedUserIds": updated,
        "errors": errors,
        "message": (
            f"Saved rights for {len(updated)} user(s)."
            if saved_in_erp and not errors
            else f"Updated {len(updated)} user(s) with {len(errors)} error(s)."
        ),
    })
