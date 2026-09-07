# ════════════════════════════════════════════════════════════════
#  views_eapproval.py
#  E-Approval — POMas / PODet / VenPurTax / CustMast (SQL Server)
#
#  Cards:    pono, podate, dtype→bucket, vendor (CustMast.CName via cid),
#            Approved if IsApprovePo truthy else Pending, amount = totamt
#  Lines:    PODet — rmname, mattype, uom, qty, QtyKgs, rate, amount
#  Finance:  totamt, disamt, pacamtbf, pacamt, VenPurTax (ttype, tp, txAmt),
#            round-off residual, grand = totamt
#
#  GET  eapproval/list/ | stats/ | detail/
#  POST eapproval/approve/ | eapproval/modify/
# ════════════════════════════════════════════════════════════════
from datetime import date, datetime
import threading

def _log_approval_bg(tenant_id, company_code, form_name, transaction_no, doc_date, doc_type, approved_by):
    try:
        from django.utils import timezone
        from .models import TenantApproval
        TenantApproval.objects.update_or_create(
            tenantid=tenant_id,
            companycode=company_code,
            formname=form_name,
            transactionno=transaction_no,
            defaults={
                "transactiondate": doc_date,
                "transactiontype": doc_type,
                "approvedby": approved_by,
                "datetime": timezone.now(),
            }
        )
    except Exception as ex:
        print(f"Background log approval error for {transaction_no}:", ex)

def _log_reversion_bg(tenant_id, company_code, form_name, transaction_no):
    try:
        from .models import TenantApproval
        TenantApproval.objects.filter(
            tenantid=tenant_id,
            companycode=company_code,
            formname=form_name,
            transactionno=transaction_no
        ).delete()
    except Exception as ex:
        print(f"Background log reversion error for {transaction_no}:", ex)

from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .views import get_tenant_connection, parse_date_range

_DTYPE_KEYS = (
    ("raw", "Raw Material"),
    ("store", "Store Material"),
    ("service", "Service Po"),
    ("job", "Job Order"),
)


def _canonical_type(dtype_raw: str) -> str:
    t = (dtype_raw or "").strip().lower()
    for key, label in _DTYPE_KEYS:
        if key in t:
            return label
    if not dtype_raw or not dtype_raw.strip():
        return "General"
    return dtype_raw.strip()


def _fmt_date(val) -> str:
    if val is None:
        return ""
    if isinstance(val, (date, datetime)):
        return val.strftime("%d/%m/%Y")
    return str(val).strip()


def _safe_float(val) -> float:
    try:
        return float(val or 0)
    except (TypeError, ValueError):
        return 0.0


def _is_po_approved(val) -> bool:
    if val is None:
        return False
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return val != 0
    s = str(val).strip().upper()
    return s in ("1", "Y", "YES", "TRUE", "T")


# LIKE patterns — single % (pyodbc positional ? elsewhere)
_CANON_TYPE_SQL = """
    CASE
        WHEN LOWER(LTRIM(RTRIM(ISNULL(P.dtype, N'')))) LIKE N'%raw%' THEN N'Raw Material'
        WHEN LOWER(LTRIM(RTRIM(ISNULL(P.dtype, N'')))) LIKE N'%store%' THEN N'Store Material'
        WHEN LOWER(LTRIM(RTRIM(ISNULL(P.dtype, N'')))) LIKE N'%service%' THEN N'Service Po'
        WHEN LOWER(LTRIM(RTRIM(ISNULL(P.dtype, N'')))) LIKE N'%job%' THEN N'Job Order'
        WHEN LTRIM(RTRIM(ISNULL(P.dtype, N''))) = N'' THEN N'General'
        ELSE LTRIM(RTRIM(P.dtype))
    END
"""

# Join vendor on string form of both keys — avoids SQL Server 8114 when comparing
# BIGINT Id to VARCHAR cid (implicit varchar→bigint cast fails on bad / text values).
_CUST_JOIN_SQL = """
    LEFT JOIN CustMast C ON
        LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(C.Id, N''))))
        = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(P.cid, N''))))
        AND ISNULL(C.Deleted, 0) = 0
    LEFT JOIN CustAliasMast CA ON
        LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CA.Id, N''))))
        = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(P.cid, N''))))
        AND ISNULL(CA.Deleted, 0) = 0
"""

_IS_APPROVED_SQL = """
    CASE WHEN ISNULL(CAST(P.IsApprovePo AS INT), 0) <> 0 THEN 1 ELSE 0 END
"""


def _check_table_exists(cursor, table_name: str) -> bool:
    try:
        cursor.execute("SELECT TOP 1 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ?", [table_name])
        return cursor.fetchone() is not None
    except Exception:
        return False


def _ensure_bapodetails_table(cursor):
    cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BAPoDetails')
        BEGIN
            CREATE TABLE BAPoDetails (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                Pono NVARCHAR(100) NOT NULL,
                Podate DATE NULL,
                Potype NVARCHAR(100) NULL,
                Custname NVARCHAR(250) NULL,
                Pocomment NVARCHAR(MAX) NULL,
                [User] NVARCHAR(100) NULL,
                [datetime] DATETIME DEFAULT GETDATE(),
                deleted BIT DEFAULT 0
            );
            CREATE NONCLUSTERED INDEX IX_BAPoDetails_Pono ON BAPoDetails (Pono);
        END
    """)


def _ensure_bauserlimits_table(cursor):
    cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BAUserLimits')
        BEGIN
            CREATE TABLE BAUserLimits (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                Username NVARCHAR(100) NOT NULL,
                LimitAmt DECIMAL(18,2) DEFAULT 0,
                IsUnlimited BIT DEFAULT 0,
                HideUnder1000 BIT DEFAULT 0,
                UpdatedBy NVARCHAR(100) NULL,
                UpdatedAt DATETIME DEFAULT GETDATE()
            );
            CREATE NONCLUSTERED INDEX IX_BAUserLimits_Username ON BAUserLimits (Username);
        END
    """)


def _get_user_po_limit_rule(cursor, tenant) -> dict:
    """
    Returns {'is_superadmin': bool, 'is_unlimited': bool, 'limit': float, 'hide_under_1000': bool}
    for the current user based on Superadmin status and BAUserLimits table.
    """
    username = str(tenant.get("username") or "").strip()
    company_code = str(tenant.get("company_code") or "").strip()

    is_super = False
    try:
        from django.db import connection as django_conn
        with django_conn.cursor() as dj_cursor:
            dj_cursor.execute(
                "SELECT designation, issuperadmin FROM tenants_users WHERE company_code = %s AND UPPER(username) = UPPER(%s) AND deleted = 0",
                [company_code, username]
            )
            urow = dj_cursor.fetchone()
            if urow:
                desg = (urow[0] or "").strip().lower()
                is_super = desg == "admin" or bool(urow[1])
            elif username.lower() == "admin":
                is_super = True
    except Exception:
        if username.lower() == "admin":
            is_super = True

    _ensure_bauserlimits_table(cursor)

    # Check global/policy hide_under_1000 from BAUserLimits
    hide_under_1000 = False
    try:
        cursor.execute("SELECT TOP 1 ISNULL(HideUnder1000, 0) FROM BAUserLimits WHERE HideUnder1000 = 1")
        hrow = cursor.fetchone()
        if hrow and hrow[0]:
            hide_under_1000 = True
    except Exception:
        pass

    # 1. Query user-specific limit configured in BAUserLimits (takes precedence)
    try:
        cursor.execute("""
            SELECT TOP 1 ISNULL(LimitAmt, 0), ISNULL(IsUnlimited, 0), ISNULL(HideUnder1000, 0)
            FROM BAUserLimits
            WHERE UPPER(LTRIM(RTRIM(Username))) = UPPER(LTRIM(RTRIM(?)))
            ORDER BY Id DESC
        """, [username])
        lrow = cursor.fetchone()
        if lrow:
            limit_amt = float(lrow[0] or 0)
            is_unlimited = bool(lrow[1])
            if lrow[2]:
                hide_under_1000 = True
            return {
                "is_superadmin": is_super,
                "is_unlimited": is_unlimited,
                "limit": limit_amt if not is_unlimited else 0.0,
                "hide_under_1000": hide_under_1000,
            }
    except Exception as ex:
        print("Error reading BAUserLimits:", ex)

    # 2. Fallback if no specific row exists in BAUserLimits:
    # Superadmin default is Unlimited; standard user default is ₹15,000
    if is_super:
        return {
            "is_superadmin": True,
            "is_unlimited": True,
            "limit": 0.0,
            "hide_under_1000": hide_under_1000,
        }

    return {
        "is_superadmin": False,
        "is_unlimited": False,
        "limit": 15000.0,
        "hide_under_1000": hide_under_1000,
    }


def _get_eapproval_company_settings(cursor) -> tuple[bool, bool]:
    """
    Returns (is_approve_supp_po, is_approve_vend_po) from CompanySetting.
    - is_approve_supp_po: controls supplier PO types (Raw Material, Store Material, Service Po, PO Amendment, General).
    - is_approve_vend_po: controls job order PO types (Job Order).
    """
    is_approve_supp_po = True
    is_approve_vend_po = False

    # 1. Try querying both columns from CompanySetting
    try:
        cursor.execute("SELECT TOP 1 ISNULL(IsApproveSuppPo, 0), ISNULL(IsApproveVendPo, 0) FROM CompanySetting")
        row = cursor.fetchone()
        if row is not None:
            return bool(row[0]), bool(row[1])
    except Exception:
        pass

    # Try individual columns on CompanySetting in case of schema variations
    try:
        cursor.execute("SELECT TOP 1 ISNULL(IsApproveSuppPo, 0) FROM CompanySetting")
        row = cursor.fetchone()
        if row is not None:
            is_approve_supp_po = bool(row[0])
    except Exception:
        pass

    try:
        cursor.execute("SELECT TOP 1 ISNULL(IsApproveVendPo, 0) FROM CompanySetting")
        row = cursor.fetchone()
        if row is not None:
            is_approve_vend_po = bool(row[0])
    except Exception:
        pass

    # 2. Fallback to CompanySettingFeatures if present
    try:
        cursor.execute("SELECT TOP 1 ISNULL(IsApproveSuppPo, 0), ISNULL(IsApproveVendPo, 0) FROM CompanySettingFeatures")
        row = cursor.fetchone()
        if row is not None:
            return bool(row[0]), bool(row[1])
    except Exception:
        pass

    return is_approve_supp_po, is_approve_vend_po


def _po_cte_sql(include_amnd: bool = False, is_approve_supp_po: bool = True, is_approve_vend_po: bool = False) -> str:
    if is_approve_supp_po and is_approve_vend_po:
        type_filter = ""
    elif is_approve_supp_po and not is_approve_vend_po:
        type_filter = "AND LOWER(LTRIM(RTRIM(ISNULL(P.dtype, N'')))) NOT LIKE '%job%'"
    elif not is_approve_supp_po and is_approve_vend_po:
        type_filter = "AND LOWER(LTRIM(RTRIM(ISNULL(P.dtype, N'')))) LIKE '%job%'"
    else:
        type_filter = "AND 1=0"

    base_sql = f"""
        WITH po AS (
            SELECT
                P.pono                                              AS po_no,
                P.podate                                            AS po_date,
                LTRIM(RTRIM(ISNULL(P.dtype, N'')))                  AS dtype_raw,
                ISNULL(P.totamt, 0)                                 AS totamt,
                {_IS_APPROVED_SQL.strip()}                         AS is_approved,
                LTRIM(RTRIM(COALESCE(C.CName, CA.CName, N'')))      AS vendor_name,
                {_CANON_TYPE_SQL.strip()}                          AS canon_type,
                N'po'                                               AS doc_kind,
                N''                                                 AS amd_no
            FROM POMas P
            {_CUST_JOIN_SQL.strip()}
            WHERE ISNULL(P.deleted, 0) = 0
              {type_filter}
              AND CAST(P.podate AS DATE) BETWEEN ? AND ?
    """
    if include_amnd:
        base_sql += f"""
            UNION ALL

            SELECT
                P.pono                                              AS po_no,
                P.amddate                                           AS po_date,
                LTRIM(RTRIM(ISNULL(P.dtype, N'')))                  AS dtype_raw,
                ISNULL(P.totamt, 0)                                 AS totamt,
                {_IS_APPROVED_SQL.strip()}                         AS is_approved,
                LTRIM(RTRIM(COALESCE(C.CName, CA.CName, N'')))      AS vendor_name,
                N'PO Amendment'                                     AS canon_type,
                N'po_amnd'                                          AS doc_kind,
                LTRIM(RTRIM(ISNULL(P.amdno, N'')))                  AS amd_no
            FROM POAmndMas P
            {_CUST_JOIN_SQL.strip()}
            WHERE ISNULL(P.deleted, 0) = 0
              {type_filter}
              AND CAST(P.amddate AS DATE) BETWEEN ? AND ?
        """
    base_sql += "\n        )\n"
    return base_sql


def _list_filter_sql(type_filter: str, status_filter: str, search_q: str, params: list, user_rule: dict | None = None) -> str:
    """Extra WHERE on CTE `po` (unqualified column names)."""
    filt = " WHERE 1=1 "
    if search_q:
        filt += """
            AND (
                CAST(po_no AS NVARCHAR(100)) LIKE ?
                OR vendor_name LIKE ?
            )
        """
        like = f"%{search_q}%"
        params.extend([like, like])
    if type_filter:
        filt += " AND canon_type = ? "
        params.append(type_filter)
    if status_filter == "approved":
        filt += " AND is_approved = 1 "
    elif status_filter == "pending":
        filt += " AND is_approved = 0 "

    # Enforce user PO amount threshold limit
    if user_rule:
        if not user_rule.get("is_unlimited") and user_rule.get("limit", 0) > 0:
            filt += " AND ISNULL(totamt, 0) <= ? "
            params.append(float(user_rule["limit"]))
        if user_rule.get("hide_under_1000"):
            filt += " AND ISNULL(totamt, 0) > 1000 "

    return filt


# ═══════════════════════════════════════════════════════════════
#  GET  eapproval/list/
# ═══════════════════════════════════════════════════════════════
@api_view(["GET"])
def eapproval_list(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    type_filter   = (request.GET.get("type",   "") or "").strip()
    status_filter = (request.GET.get("status", "") or "").strip().lower()
    search_q      = (request.GET.get("search", "") or "").strip()

    try:
        page      = max(1, int(request.GET.get("page",      1)))
    except ValueError:
        page = 1
    try:
        page_size = min(2000, max(1, int(request.GET.get("page_size", 500))))
    except ValueError:
        page_size = 200

    offset = (page - 1) * page_size

    try:
        cursor = conn.cursor()
        has_amnd = _check_table_exists(cursor, "POAmndMas")
        is_approve_supp_po, is_approve_vend_po = _get_eapproval_company_settings(cursor)
        user_rule = _get_user_po_limit_rule(cursor, tenant)

        params: list = [start_date, end_date, start_date, end_date] if has_amnd else [start_date, end_date]
        filt = _list_filter_sql(type_filter, status_filter, search_q, params, user_rule)

        sql_combined = f"""
            {_po_cte_sql(has_amnd, is_approve_supp_po, is_approve_vend_po).strip()}
            , numbered AS (
                SELECT po.*,
                       ROW_NUMBER()  OVER (ORDER BY po.po_date DESC, po.po_no DESC) AS _rn,
                       COUNT(*)      OVER ()                                          AS _total
                FROM po
                {filt}
            )
            SELECT po_no, po_date, dtype_raw, totamt, is_approved, vendor_name, canon_type, doc_kind, amd_no, _total
            FROM numbered
            WHERE _rn BETWEEN ? AND ?
        """
        page_params = params + [offset + 1, offset + page_size]

        try:
            cursor.execute(sql_combined, page_params)
            rows = cursor.fetchall()
            cols = [d[0] for d in cursor.description]
        except Exception:
            # Safe fallback to main POMas table if POAmndMas UNION fails
            params = [start_date, end_date]
            filt = _list_filter_sql(type_filter, status_filter, search_q, params, user_rule)
            sql_fallback = f"""
                {_po_cte_sql(False, is_approve_supp_po, is_approve_vend_po).strip()}
                , numbered AS (
                    SELECT po.*,
                           ROW_NUMBER()  OVER (ORDER BY po.po_date DESC, po.po_no DESC) AS _rn,
                           COUNT(*)      OVER ()                                          AS _total
                    FROM po
                    {filt}
                )
                SELECT po_no, po_date, dtype_raw, totamt, is_approved, vendor_name, canon_type, doc_kind, amd_no, _total
                FROM numbered
                WHERE _rn BETWEEN ? AND ?
            """
            cursor.execute(sql_fallback, params + [offset + 1, offset + page_size])
            rows = cursor.fetchall()
            cols = [d[0] for d in cursor.description]

        comments_map = {}
        try:
            if _check_table_exists(cursor, "BAPoDetails") and rows:
                po_list = list({str(r[0]).strip() for r in rows if r[0]})
                if po_list:
                    placeholders = ",".join(["?"] * len(po_list))
                    cursor.execute(f"""
                        SELECT Pono, Pocomment
                        FROM BAPoDetails
                        WHERE ISNULL(deleted, 0) = 0
                          AND LTRIM(RTRIM(Pono)) IN ({placeholders})
                        ORDER BY [datetime] ASC, Id ASC
                    """, po_list)
                    for crow in cursor.fetchall():
                        comments_map[str(crow[0]).strip()] = crow[1] or ""
        except Exception as ex:
            print("Error batch fetching BAPoDetails in eapproval_list:", ex)

        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    from django.utils import timezone
    from .models import TenantApproval
    approvals_map = {}
    try:
        approvals_map = {
            app.transactionno: app
            for app in TenantApproval.objects.filter(
                tenantid=tenant.get("tenant_id"),
                companycode=tenant.get("company_code"),
                formname="Eapproval"
            )
        }
    except Exception:
        pass

    total_count = 0
    cards = []
    for row in rows:
        rec = dict(zip(cols, row))
        if not total_count:
            total_count = int(rec.get("_total") or 0)
        status = "Approved" if rec.get("is_approved") else "Pending"
        lookup_key = str(rec.get("amd_no")) if (rec.get("doc_kind") == "po_amnd" and rec.get("amd_no")) else str(rec["po_no"])
        appr_info = approvals_map.get(lookup_key)
        approved_by = appr_info.approvedby if appr_info else None
        approved_dt = timezone.localtime(appr_info.datetime).strftime("%d/%m/%Y %I:%M %p") if (appr_info and appr_info.datetime) else None

        card_id = f"po_amnd:{rec['po_no']}:{rec.get('amd_no', '')}" if rec.get("doc_kind") == "po_amnd" else str(rec["po_no"])
        cards.append({
            "id":         card_id,
            "poNo":       str(rec["po_no"]),
            "amdNo":      str(rec.get("amd_no") or ""),
            "docKind":    rec.get("doc_kind") or "po",
            "poDate":     _fmt_date(rec["po_date"]),
            "type":       rec["canon_type"] or "General",
            "status":     status,
            "vendor":     rec["vendor_name"] or "Unknown Vendor",
            "countLabel": "Amount",
            "countVal":   _safe_float(rec["totamt"]),
            "dtypeRaw":   rec.get("dtype_raw") or "",
            "approvedBy": approved_by,
            "approvedDateTime": approved_dt,
            "pocomment":  comments_map.get(str(rec["po_no"]).strip(), ""),
        })

    return Response({
        "success":   True,
        "from":      str(start_date),
        "to":        str(end_date),
        "page":      page,
        "page_size": page_size,
        "total":     total_count,
        "cards":     cards,
        "is_approve_supp_po": is_approve_supp_po,
        "is_approve_vend_po": is_approve_vend_po,
    })


# ═══════════════════════════════════════════════════════════════
#  GET  eapproval/stats/
# ═══════════════════════════════════════════════════════════════
@api_view(["GET"])
def eapproval_stats(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)

    try:
        cursor = conn.cursor()
        has_amnd = _check_table_exists(cursor, "POAmndMas")
        is_approve_supp_po, is_approve_vend_po = _get_eapproval_company_settings(cursor)
        user_rule = _get_user_po_limit_rule(cursor, tenant)

        limit_where = ""
        extra_params = []
        if not user_rule.get("is_unlimited") and user_rule.get("limit", 0) > 0:
            limit_where += " AND ISNULL(po.totamt, 0) <= ? "
            extra_params.append(float(user_rule["limit"]))
        if user_rule.get("hide_under_1000"):
            limit_where += " AND ISNULL(po.totamt, 0) > 1000 "

        sql = f"""
            {_po_cte_sql(has_amnd, is_approve_supp_po, is_approve_vend_po).strip()}
            SELECT
                po.canon_type,
                po.is_approved,
                COUNT(*)              AS cnt,
                SUM(ISNULL(po.totamt, 0)) AS total_amt
            FROM po
            WHERE 1=1 {limit_where}
            GROUP BY po.canon_type, po.is_approved
        """
        stat_params = ([start_date, end_date, start_date, end_date] if has_amnd else [start_date, end_date]) + extra_params

        try:
            cursor.execute(sql, stat_params)
            rows = cursor.fetchall()
        except Exception:
            sql_fallback = f"""
                {_po_cte_sql(False, is_approve_supp_po, is_approve_vend_po).strip()}
                SELECT
                    po.canon_type,
                    po.is_approved,
                    COUNT(*)              AS cnt,
                    SUM(ISNULL(po.totamt, 0)) AS total_amt
                FROM po
                WHERE 1=1 {limit_where}
                GROUP BY po.canon_type, po.is_approved
            """
            cursor.execute(sql_fallback, [start_date, end_date] + extra_params)
            rows = cursor.fetchall()

        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    type_buckets = {}
    if is_approve_supp_po:
        type_buckets["Raw Material"] = {"total": 0, "approved": 0, "pending": 0, "amount": 0.0}
        type_buckets["Store Material"] = {"total": 0, "approved": 0, "pending": 0, "amount": 0.0}
        type_buckets["PO Amendment"] = {"total": 0, "approved": 0, "pending": 0, "amount": 0.0}
        type_buckets["Service Po"] = {"total": 0, "approved": 0, "pending": 0, "amount": 0.0}
        type_buckets["General"] = {"total": 0, "approved": 0, "pending": 0, "amount": 0.0}
    if is_approve_vend_po:
        type_buckets["Job Order"] = {"total": 0, "approved": 0, "pending": 0, "amount": 0.0}

    overall_total = overall_approved = overall_pending = 0
    overall_amount = 0.0

    for canon, is_appr, cnt, total_amt in rows:
        canon = canon or "General"
        bucket = type_buckets.setdefault(
            canon, {"total": 0, "approved": 0, "pending": 0, "amount": 0.0}
        )
        n = int(cnt or 0)
        amt = _safe_float(total_amt)
        bucket["total"] += n
        bucket["amount"] += amt
        overall_total += n
        overall_amount += amt
        if is_appr:
            bucket["approved"] += n
            overall_approved += n
        else:
            bucket["pending"] += n
            overall_pending += n

    for b in type_buckets.values():
        b["amount"] = round(b["amount"], 2)

    approval_rate = round(overall_approved / overall_total * 100, 1) if overall_total > 0 else 0

    return Response({
        "success": True,
        "from": str(start_date),
        "to": str(end_date),
        "stats": [
            {
                "label": "Total PO's",
                "value": str(overall_total),
                "change": f"↑ {overall_pending} waiting action",
            },
            {
                "label": "Approved",
                "value": str(overall_approved),
                "change": f"↑ {approval_rate}% approval rate",
            },
            {
                "label": "Pending",
                "value": str(overall_pending),
                "change": (
                    f"↓ {round(100 - approval_rate, 1)}% remaining"
                    if overall_total > 0 else "No POs in range"
                ),
            },
        ],
        "by_type": type_buckets,
        "overall_total": overall_total,
        "overall_amount": round(overall_amount, 2),
        "is_approve_supp_po": is_approve_supp_po,
        "is_approve_vend_po": is_approve_vend_po,
    })


# ═══════════════════════════════════════════════════════════════
#  GET  eapproval/detail/
# ═══════════════════════════════════════════════════════════════
@api_view(["GET"])
def eapproval_detail(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    pono = (request.GET.get("pono") or "").strip()
    if not pono:
        return Response({"error": "Query parameter 'pono' is required."}, status=400)

    doc_kind = (request.GET.get("doc_kind") or "").strip().lower()
    amdno = (request.GET.get("amdno") or "").strip()

    try:
        cursor = conn.cursor()
        header = None
        raw_items = []
        raw_taxes = []

        if doc_kind == "po_amnd" or amdno:
            target_amdno = amdno
            if not target_amdno:
                try:
                    cursor.execute(
                        "SELECT TOP 1 LTRIM(RTRIM(ISNULL(amdno, N''))) FROM POAmndMas WHERE ISNULL(deleted, 0) = 0 AND LTRIM(RTRIM(pono)) = LTRIM(RTRIM(?)) ORDER BY ISNULL(amdno, N'') DESC",
                        [pono]
                    )
                    arow = cursor.fetchone()
                    if arow and arow[0]:
                        target_amdno = arow[0]
                except Exception:
                    pass

            header_sql = f"""
                SELECT TOP 1
                    P.pono,
                    LTRIM(RTRIM(ISNULL(P.amdno, N'')))   AS amdno,
                    P.amddate                            AS podate,
                    LTRIM(RTRIM(ISNULL(P.dtype, N'')))  AS dtype_raw,
                    ISNULL(P.totamt, 0)                  AS totamt,
                    ISNULL(P.disamt, 0)                  AS disamt,
                    0                                    AS pacamtbf,
                    ISNULL(P.pacamt, 0)                  AS pacamt,
                    P.IsApprovePo                        AS is_approve_raw,
                    LTRIM(RTRIM(COALESCE(C.CName, CA.CName, N'')))       AS vendor_name,
                    LTRIM(RTRIM(COALESCE(C.Address, CA.Address, N'')))   AS vendor_address,
                    LTRIM(RTRIM(COALESCE(C.Address1, CA.Address1, N''))) AS vendor_address1,
                    LTRIM(RTRIM(COALESCE(C.Address2, CA.Address2, N''))) AS vendor_address2,
                    LTRIM(RTRIM(COALESCE(C.City, CA.City, N'')))        AS vendor_city,
                    LTRIM(RTRIM(COALESCE(C.State, CA.State, N'')))      AS vendor_state,
                    LTRIM(RTRIM(COALESCE(C.PinCode, CA.PinCode, N'')))  AS vendor_pincode,
                    LTRIM(RTRIM(COALESCE(C.gstino, CA.gstino, N'')))    AS vendor_gstino,
                    LTRIM(RTRIM(COALESCE(C.Contact, CA.Contact, N'')))  AS vendor_contact,
                    LTRIM(RTRIM(COALESCE(C.Phone, CA.Phone, N'')))      AS vendor_phone,
                    LTRIM(RTRIM(COALESCE(C.Email, CA.Email, N'')))      AS vendor_email
                FROM POAmndMas P
                {_CUST_JOIN_SQL.strip()}
                WHERE ISNULL(P.deleted, 0) = 0
                  AND LTRIM(RTRIM(P.pono)) = LTRIM(RTRIM(?))
                  AND (? = '' OR LTRIM(RTRIM(ISNULL(P.amdno, N''))) = LTRIM(RTRIM(?)))
                ORDER BY ISNULL(P.amdno, N'') DESC
            """
            cursor.execute(header_sql, [pono, target_amdno, target_amdno])
            hrow = cursor.fetchone()

            if hrow:
                hcols = [d[0] for d in cursor.description]
                header = dict(zip(hcols, hrow))
                found_amdno = header.get("amdno") or target_amdno

                items_sql = """
                    SELECT
                        ROW_NUMBER() OVER (
                            ORDER BY ISNULL(D.seq, 2147483647)
                        ) AS sno,
                        ISNULL(D.rmname, N'')    AS code_no,
                        ISNULL(D.mattype, N'')   AS description,
                        ISNULL(CM.hsncode, N'')  AS hsn_code,
                        ISNULL(D.dia, N'')       AS dia,
                        ISNULL(D.uom, N'')       AS uom,
                        ISNULL(D.qty, 0)         AS qty,
                        ISNULL(D.QtyKgs, 0)      AS qty_kgs,
                        ISNULL(D.rate, 0)        AS rate,
                        ISNULL(D.amount, 0)      AS amount
                    FROM POAmndDet D
                    LEFT JOIN (
                        SELECT 
                            LTRIM(RTRIM(PartNo)) AS PartNo,
                            MAX(LTRIM(RTRIM(ISNULL(hsncode, N'')))) AS hsncode
                        FROM Commer_Mas
                        WHERE ISNULL(deleted, 0) = 0
                        GROUP BY LTRIM(RTRIM(PartNo))
                    ) CM ON CM.PartNo = LTRIM(RTRIM(D.rmname))
                    WHERE ISNULL(D.deleted, 0) = 0
                      AND LTRIM(RTRIM(D.pono)) = LTRIM(RTRIM(?))
                      AND (? = '' OR LTRIM(RTRIM(ISNULL(D.amdno, N''))) = LTRIM(RTRIM(?)))
                    ORDER BY ISNULL(D.seq, 2147483647)
                """
                try:
                    cursor.execute(items_sql, [pono, found_amdno, found_amdno])
                    icols = [d[0] for d in cursor.description]
                    raw_items = [dict(zip(icols, r)) for r in cursor.fetchall()]
                except Exception:
                    items_sql_fb = """
                        SELECT
                            ROW_NUMBER() OVER (
                                ORDER BY ISNULL(D.seq, 2147483647)
                            ) AS sno,
                            ISNULL(D.rmname, N'')    AS code_no,
                            ISNULL(D.mattype, N'')   AS description,
                            N''                      AS hsn_code,
                            ISNULL(D.dia, N'')       AS dia,
                            ISNULL(D.uom, N'')       AS uom,
                            ISNULL(D.qty, 0)         AS qty,
                            ISNULL(D.QtyKgs, 0)      AS qty_kgs,
                            ISNULL(D.rate, 0)        AS rate,
                            ISNULL(D.amount, 0)      AS amount
                        FROM POAmndDet D
                        WHERE ISNULL(D.deleted, 0) = 0
                          AND LTRIM(RTRIM(D.pono)) = LTRIM(RTRIM(?))
                          AND (? = '' OR LTRIM(RTRIM(ISNULL(D.amdno, N''))) = LTRIM(RTRIM(?)))
                        ORDER BY ISNULL(D.seq, 2147483647)
                    """
                    cursor.execute(items_sql_fb, [pono, found_amdno, found_amdno])
                    icols = [d[0] for d in cursor.description]
                    raw_items = [dict(zip(icols, r)) for r in cursor.fetchall()]

                tax_sql = """
                    SELECT
                        ISNULL(T.ttype, N'')   AS ttype,
                        ISNULL(T.tp, 0)        AS tp,
                        ISNULL(T.txAmt, 0)     AS tx_amt
                    FROM PoAmndTax T
                    WHERE ISNULL(T.Deleted, 0) = 0
                      AND LTRIM(RTRIM(T.pono)) = LTRIM(RTRIM(?))
                      AND (? = '' OR LTRIM(RTRIM(ISNULL(T.amdno, N''))) = LTRIM(RTRIM(?)))
                    ORDER BY ISNULL(T.nos, 0), T.ttype
                """
                try:
                    cursor.execute(tax_sql, [pono, found_amdno, found_amdno])
                    tcols = [d[0] for d in cursor.description]
                    raw_taxes = [dict(zip(tcols, r)) for r in cursor.fetchall()]
                    if not raw_taxes:
                        tax_sql_fb = """
                            SELECT
                                ISNULL(T.ttype, N'')   AS ttype,
                                ISNULL(T.tp, 0)        AS tp,
                                ISNULL(T.txAmt, 0)     AS tx_amt
                            FROM PoAmndTax T
                            WHERE ISNULL(T.Deleted, 0) = 0
                              AND LTRIM(RTRIM(T.pono)) = LTRIM(RTRIM(?))
                            ORDER BY ISNULL(T.nos, 0), T.ttype
                        """
                        cursor.execute(tax_sql_fb, [pono])
                        raw_taxes = [dict(zip(tcols, r)) for r in cursor.fetchall()]
                except Exception:
                    raw_taxes = []

        if not header:
            header_sql = f"""
                SELECT TOP 1
                    P.pono,
                    P.podate,
                    LTRIM(RTRIM(ISNULL(P.dtype, N'')))  AS dtype_raw,
                    ISNULL(P.totamt, 0)                  AS totamt,
                    ISNULL(P.disamt, 0)                  AS disamt,
                    ISNULL(P.pacamtbf, 0)                AS pacamtbf,
                    ISNULL(P.pacamt, 0)                  AS pacamt,
                    P.IsApprovePo                        AS is_approve_raw,
                    LTRIM(RTRIM(COALESCE(C.CName, CA.CName, N'')))       AS vendor_name,
                    LTRIM(RTRIM(COALESCE(C.Address, CA.Address, N'')))   AS vendor_address,
                    LTRIM(RTRIM(COALESCE(C.Address1, CA.Address1, N''))) AS vendor_address1,
                    LTRIM(RTRIM(COALESCE(C.Address2, CA.Address2, N''))) AS vendor_address2,
                    LTRIM(RTRIM(COALESCE(C.City, CA.City, N'')))        AS vendor_city,
                    LTRIM(RTRIM(COALESCE(C.State, CA.State, N'')))      AS vendor_state,
                    LTRIM(RTRIM(COALESCE(C.PinCode, CA.PinCode, N'')))  AS vendor_pincode,
                    LTRIM(RTRIM(COALESCE(C.gstino, CA.gstino, N'')))    AS vendor_gstino,
                    LTRIM(RTRIM(COALESCE(C.Contact, CA.Contact, N'')))  AS vendor_contact,
                    LTRIM(RTRIM(COALESCE(C.Phone, CA.Phone, N'')))      AS vendor_phone,
                    LTRIM(RTRIM(COALESCE(C.Email, CA.Email, N'')))      AS vendor_email
                FROM POMas P
                {_CUST_JOIN_SQL.strip()}
                WHERE ISNULL(P.deleted, 0) = 0
                  AND LTRIM(RTRIM(P.pono)) = LTRIM(RTRIM(?))
            """
            cursor.execute(header_sql, [pono])
            hrow = cursor.fetchone()
            if not hrow:
                cursor.close()
                conn.close()
                return Response({"error": f"PO '{pono}' not found."}, status=404)
            hcols = [d[0] for d in cursor.description]
            header = dict(zip(hcols, hrow))

            items_sql = """
                SELECT
                    ROW_NUMBER() OVER (
                        ORDER BY ISNULL(D.seq, 2147483647)
                    ) AS sno,
                    ISNULL(D.rmname, N'')    AS code_no,
                    ISNULL(D.mattype, N'')   AS description,
                    ISNULL(CM.hsncode, N'')  AS hsn_code,
                    ISNULL(D.dia, N'')       AS dia,
                    ISNULL(D.uom, N'')       AS uom,
                    ISNULL(D.qty, 0)         AS qty,
                    ISNULL(D.QtyKgs, 0)      AS qty_kgs,
                    ISNULL(D.rate, 0)        AS rate,
                    ISNULL(D.amount, 0)      AS amount
                FROM PODet D
                LEFT JOIN (
                    SELECT 
                        LTRIM(RTRIM(PartNo)) AS PartNo,
                        MAX(LTRIM(RTRIM(ISNULL(hsncode, N'')))) AS hsncode
                    FROM Commer_Mas
                    WHERE ISNULL(deleted, 0) = 0
                    GROUP BY LTRIM(RTRIM(PartNo))
                ) CM ON CM.PartNo = LTRIM(RTRIM(D.rmname))
                WHERE ISNULL(D.deleted, 0) = 0
                  AND LTRIM(RTRIM(D.pono)) = LTRIM(RTRIM(?))
                ORDER BY ISNULL(D.seq, 2147483647)
            """
            try:
                cursor.execute(items_sql, [pono])
                icols = [d[0] for d in cursor.description]
                raw_items = [dict(zip(icols, r)) for r in cursor.fetchall()]
            except Exception:
                items_sql_fb = """
                    SELECT
                        ROW_NUMBER() OVER (
                            ORDER BY ISNULL(D.seq, 2147483647)
                        ) AS sno,
                        ISNULL(D.rmname, N'')    AS code_no,
                        ISNULL(D.mattype, N'')   AS description,
                        N''                      AS hsn_code,
                        ISNULL(D.dia, N'')       AS dia,
                        ISNULL(D.uom, N'')       AS uom,
                        ISNULL(D.qty, 0)         AS qty,
                        ISNULL(D.QtyKgs, 0)      AS qty_kgs,
                        ISNULL(D.rate, 0)        AS rate,
                        ISNULL(D.amount, 0)      AS amount
                    FROM PODet D
                    WHERE ISNULL(D.deleted, 0) = 0
                      AND LTRIM(RTRIM(D.pono)) = LTRIM(RTRIM(?))
                    ORDER BY ISNULL(D.seq, 2147483647)
                """
                cursor.execute(items_sql_fb, [pono])
                icols = [d[0] for d in cursor.description]
                raw_items = [dict(zip(icols, r)) for r in cursor.fetchall()]

            tax_sql = """
                SELECT
                    ISNULL(T.ttype, N'')   AS ttype,
                    ISNULL(T.tp, 0)        AS tp,
                    ISNULL(T.txAmt, 0)     AS tx_amt
                FROM VenPurTax T
                WHERE ISNULL(T.Deleted, 0) = 0
                  AND LTRIM(RTRIM(T.pono)) = LTRIM(RTRIM(?))
                ORDER BY ISNULL(T.nos, 0), T.ttype
            """
            try:
                cursor.execute(tax_sql, [pono])
                tcols = [d[0] for d in cursor.description]
                raw_taxes = [dict(zip(tcols, r)) for r in cursor.fetchall()]
            except Exception:
                raw_taxes = []

        pocomment = ""
        comment_user = None
        comment_dt = None
        try:
            if _check_table_exists(cursor, "BAPoDetails"):
                cursor.execute("""
                    SELECT TOP 1 Pocomment, [User], [datetime]
                    FROM BAPoDetails
                    WHERE ISNULL(deleted, 0) = 0
                      AND LTRIM(RTRIM(Pono)) = LTRIM(RTRIM(?))
                    ORDER BY [datetime] DESC, Id DESC
                """, [header["pono"]])
                crow = cursor.fetchone()
                if crow:
                    pocomment = crow[0] or ""
                    comment_user = crow[1]
                    if crow[2]:
                        from django.utils import timezone
                        comment_dt = crow[2].strftime("%d/%m/%Y %I:%M %p") if isinstance(crow[2], (datetime, date)) else str(crow[2])
        except Exception as ex:
            print("Error fetching BAPoDetails comment in detail:", ex)

        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    line_items = []
    line_sum = 0.0
    for item in raw_items:
        amt = _safe_float(item.get("amount", 0))
        line_sum += amt
        line_items.append({
            "sNo": int(item.get("sno", 0)) or len(line_items) + 1,
            "codeNo": str(item.get("code_no", "")).strip(),
            "description": str(item.get("description", "")).strip(),
            "hsnCode": str(item.get("hsn_code", "")).strip(),
            "dia": item.get("dia"),
            "uom": str(item.get("uom", "")).strip(),
            "qty": _safe_float(item.get("qty", 0)),
            "qtyOthers": _safe_float(item.get("qty_kgs", 0)),
            "rate": _safe_float(item.get("rate", 0)),
            "amount": amt,
        })

    tax_lines = []
    tax_sum = 0.0
    for t in raw_taxes:
        tx = _safe_float(t.get("tx_amt", 0))
        tax_sum += tx
        tp = _safe_float(t.get("tp", 0))
        ttype = str(t.get("ttype", "")).strip()
        label = f"Tax {ttype}" + (f" @ {tp:g} %" if tp else "")
        tax_lines.append({"label": label, "ttype": ttype, "tp": tp, "txAmt": tx})

    totamt = _safe_float(header["totamt"])
    disamt = _safe_float(header["disamt"])
    pacamtbf = _safe_float(header["pacamtbf"])
    pacamt = _safe_float(header["pacamt"])

    # Base total amount: line_sum if line_sum > 0 else totamt
    base_amount = line_sum if line_sum > 0 else totamt
    round_off = 0.0  # Round Off as 0 by default
    grand_total = round(base_amount - disamt + pacamtbf + tax_sum + pacamt + round_off, 2)

    financial = {
        "totalAmount": round(base_amount, 2),
        "lineItemsTotal": round(line_sum, 2),
        "discount": round(disamt, 2),
        "beforeTaxPF": round(pacamtbf, 2),
        "afterTaxPF": round(pacamt, 2),
        "taxes": tax_lines,
        "totalTaxAmount": round(tax_sum, 2),
        "roundOff": 0.0,
        "grandTotal": round(grand_total, 2),
        "summaryRows": _build_financial_summary_rows(
            base_amount, disamt, pacamtbf, pacamt, tax_lines, 0.0, grand_total
        ),
    }

    canon = _canonical_type(header.get("dtype_raw", ""))
    status = "Approved" if _is_po_approved(header.get("is_approve_raw")) else "Pending"

    # Fetch approval info from tenants_approvals
    from .models import TenantApproval
    from django.db import connection as django_conn
    approved_by = None
    approved_dt = None
    try:
        resolved_tx_no = str(header.get("amdno") or amdno or "") if (doc_kind == "po_amnd" or header.get("amdno") or amdno) else str(header["pono"])
        appr_info = TenantApproval.objects.filter(
            tenantid=tenant.get("tenant_id"),
            companycode=tenant.get("company_code"),
            formname="Eapproval",
            transactionno=resolved_tx_no
        ).first()
        if appr_info:
            approved_by = appr_info.approvedby
            from django.utils import timezone
            approved_dt = timezone.localtime(appr_info.datetime).strftime("%d/%m/%Y %I:%M %p") if appr_info.datetime else None
    except Exception:
        pass

    # Fetch logged-in company details from tenants_signup matching company_code
    company_info = {}
    try:
        company_code = tenant.get("company_code")
        if company_code:
            with django_conn.cursor() as dj_cursor:
                dj_cursor.execute("""
                    SELECT TOP 1 company_name, address1, address2, city, state, pincode, gst_number, phone_number, email_id
                    FROM tenants_signup
                    WHERE UPPER(company_code) = UPPER(%s)
                """, [company_code])
                srow = dj_cursor.fetchone()
                if srow:
                    company_info = {
                        "companyName": (srow[0] or "").strip(),
                        "address1": (srow[1] or "").strip(),
                        "address2": (srow[2] or "").strip(),
                        "city": (srow[3] or "").strip(),
                        "state": (srow[4] or "").strip(),
                        "pincode": (srow[5] or "").strip(),
                        "gstNumber": (srow[6] or "").strip(),
                        "phone": (srow[7] or "").strip(),
                        "email": (srow[8] or "").strip(),
                    }
    except Exception as ex:
        print("Error fetching company details from tenants_signup:", ex)

    card_id = f"po_amnd:{header['pono']}:{header.get('amdno', '')}" if (doc_kind == "po_amnd" or header.get("amdno")) else str(header["pono"])
    card = {
        "id": card_id,
        "poNo": str(header["pono"]),
        "amdNo": str(header.get("amdno") or amdno or ""),
        "docKind": "po_amnd" if (doc_kind == "po_amnd" or header.get("amdno")) else "po",
        "poDate": _fmt_date(header["podate"]),
        "type": canon,
        "status": status,
        "companyInfo": company_info,
        "companyName": company_info.get("companyName") or tenant.get("company_name") or "BICELLI GECO HYDRAULICS INDIA PVT LTD",
        "companyAddress1": company_info.get("address1") or "",
        "companyAddress2": company_info.get("address2") or "",
        "companyCity": company_info.get("city") or "",
        "companyState": company_info.get("state") or "",
        "companyPinCode": company_info.get("pincode") or "",
        "companyGst": company_info.get("gstNumber") or "",
        "companyPhone": company_info.get("phone") or "",
        "companyEmail": company_info.get("email") or "",
        "vendor": header.get("vendor_name") or "Unknown Vendor",
        "vendorAddress": header.get("vendor_address") or "",
        "vendorAddress1": header.get("vendor_address1") or "",
        "vendorAddress2": header.get("vendor_address2") or "",
        "vendorCity": header.get("vendor_city") or "",
        "vendorState": header.get("vendor_state") or "",
        "vendorPinCode": header.get("vendor_pincode") or "",
        "vendorGst": header.get("vendor_gstino") or "",
        "vendorContact": header.get("vendor_contact") or "",
        "vendorPhone": header.get("vendor_phone") or "",
        "vendorEmail": header.get("vendor_email") or "",
        "countLabel": "Amount",
        "countVal": round(grand_total, 2),
        "items": line_items,
        "financial": financial,
        "discount": financial["discount"],
        "bfTaxPF": financial["beforeTaxPF"],
        "afTaxPF": financial["afterTaxPF"],
        "roundOff": 0.0,
        "cgstPct": 0,
        "sgstPct": 0,
        "approvedBy": approved_by,
        "approvedDateTime": approved_dt,
        "pocomment": pocomment,
        "commentUser": comment_user,
        "commentDateTime": comment_dt,
    }

    return Response({"success": True, "card": card})


def _build_financial_summary_rows(totamt, disamt, pacamtbf, pacamt, tax_lines, round_off, grand_total):
    """Ordered rows for UI (labels + display amounts)."""
    rows = [
        {"label": "Total Amount", "value": round(totamt, 2), "sub": False, "neg": False},
        {"label": "Discount", "value": round(disamt, 2), "sub": True, "neg": True},
        {"label": "Before Tax P & F", "value": round(pacamtbf, 2), "sub": True, "neg": False},
        {"label": "After Tax P & F", "value": round(pacamt, 2), "sub": True, "neg": False},
    ]
    for t in tax_lines:
        rows.append({
            "label": t["label"],
            "value": round(t["txAmt"], 2),
            "sub": False,
            "neg": False,
        })
    rows.append({"label": "Round Off", "value": 0.0, "sub": True, "neg": False})
    rows.append({"label": "Grand Total", "value": round(grand_total, 2), "sub": False, "neg": False, "grand": True})
    return rows


# ═══════════════════════════════════════════════════════════════
#  POST  eapproval/approve/
# ═══════════════════════════════════════════════════════════════
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def eapproval_approve(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    pono = (request.data.get("pono") or "").strip()
    if not pono:
        return Response({"error": "Field 'pono' is required."}, status=400)

    doc_kind = (request.data.get("doc_kind") or "").strip().lower()
    amdno = (request.data.get("amdno") or "").strip()

    try:
        cursor = conn.cursor()
        po_date = None
        po_type = "General"
        transaction_no = pono

        if doc_kind == "po_amnd" or amdno:
            if amdno:
                cursor.execute("SELECT TOP 1 amddate, amdno FROM POAmndMas WHERE ISNULL(deleted, 0) = 0 AND pono = ? AND amdno = ?", [pono, amdno])
            else:
                cursor.execute("SELECT TOP 1 amddate, amdno FROM POAmndMas WHERE ISNULL(deleted, 0) = 0 AND pono = ? ORDER BY ISNULL(amdno, N'') DESC", [pono])
            amnd_row = cursor.fetchone()
            if amnd_row:
                po_date = amnd_row[0]
                resolved_amdno = amnd_row[1] or amdno
            else:
                resolved_amdno = amdno

            if resolved_amdno:
                cursor.execute("UPDATE POAmndMas SET IsApprovePo = 1 WHERE ISNULL(deleted, 0) = 0 AND pono = ? AND amdno = ?", [pono, resolved_amdno])
                transaction_no = resolved_amdno
            else:
                cursor.execute("UPDATE POAmndMas SET IsApprovePo = 1 WHERE ISNULL(deleted, 0) = 0 AND pono = ?", [pono])
                transaction_no = pono
            affected = cursor.rowcount
            po_type = "PO Amendment"
        else:
            cursor.execute("UPDATE POMas SET IsApprovePo = 1 WHERE ISNULL(deleted, 0) = 0 AND pono = ?", [pono])
            affected = cursor.rowcount
            cursor.execute("SELECT TOP 1 podate FROM POMas WHERE ISNULL(deleted, 0) = 0 AND pono = ?", [pono])
            po_row = cursor.fetchone()
            if po_row:
                po_date = po_row[0]
            po_type = "General"

        if affected == 0:
            cursor.execute("UPDATE POAmndMas SET IsApprovePo = 1 WHERE ISNULL(deleted, 0) = 0 AND pono = ?", [pono])
            affected = cursor.rowcount
            if affected > 0:
                po_type = "PO Amendment"
                cursor.execute("SELECT TOP 1 amddate, amdno FROM POAmndMas WHERE ISNULL(deleted, 0) = 0 AND pono = ? ORDER BY ISNULL(amdno, N'') DESC", [pono])
                amnd_row = cursor.fetchone()
                if amnd_row:
                    po_date = amnd_row[0]
                    transaction_no = amnd_row[1] or pono
                else:
                    transaction_no = pono

        if affected == 0:
            cursor.execute("UPDATE POMas SET IsApprovePo = 1 WHERE ISNULL(deleted, 0) = 0 AND pono = ?", [pono])
            affected = cursor.rowcount
            if affected > 0:
                cursor.execute("SELECT TOP 1 podate FROM POMas WHERE ISNULL(deleted, 0) = 0 AND pono = ?", [pono])
                po_row = cursor.fetchone()
                if po_row:
                    po_date = po_row[0]
                po_type = "General"
                transaction_no = pono

        if affected == 0:
            cursor.close()
            conn.close()
            return Response({"error": f"PO '{pono}' not found."}, status=404)

        try:
            conn.commit()
            approved_in_erp = True
            message = f"PO {pono} approved successfully in ERP."
            try:
                _log_approval_bg(
                    tenant.get("tenant_id"),
                    tenant.get("company_code"),
                    "Eapproval",
                    transaction_no,
                    po_date,
                    po_type,
                    tenant.get("username") or "Admin"
                )
            except Exception as log_err:
                print("EApproval log write error:", log_err)
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            approved_in_erp = False
            message = f"PO {pono} acknowledged (UI only) — could not commit IsApprovePo."
        approved_by = tenant.get("username") or "Admin"
        from django.utils import timezone
        approved_dt = timezone.localtime(timezone.now()).strftime("%d/%m/%Y %I:%M %p")
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "success": True,
        "pono": pono,
        "approved_in_erp": approved_in_erp,
        "message": message,
        "approvedBy": approved_by,
        "approvedDateTime": approved_dt
    })


# ═══════════════════════════════════════════════════════════════
#  POST  eapproval/modify/
#  Resets IsApprovePo → 0 so the PO goes back to Pending.
# ═══════════════════════════════════════════════════════════════
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def eapproval_modify(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    pono = (request.data.get("pono") or "").strip()
    if not pono:
        return Response({"error": "Field 'pono' is required."}, status=400)

    doc_kind = (request.data.get("doc_kind") or "").strip().lower()
    amdno = (request.data.get("amdno") or "").strip()

    try:
        cursor = conn.cursor()
        transaction_no = pono

        if doc_kind == "po_amnd" or amdno:
            if amdno:
                cursor.execute("UPDATE POAmndMas SET IsApprovePo = 0 WHERE ISNULL(deleted, 0) = 0 AND pono = ? AND amdno = ?", [pono, amdno])
                transaction_no = amdno
            else:
                cursor.execute("SELECT TOP 1 amdno FROM POAmndMas WHERE ISNULL(deleted, 0) = 0 AND pono = ? ORDER BY ISNULL(amdno, N'') DESC", [pono])
                amnd_row = cursor.fetchone()
                resolved_amdno = amnd_row[0] if amnd_row else ""
                cursor.execute("UPDATE POAmndMas SET IsApprovePo = 0 WHERE ISNULL(deleted, 0) = 0 AND pono = ?", [pono])
                transaction_no = resolved_amdno or pono
            affected = cursor.rowcount
        else:
            cursor.execute("UPDATE POMas SET IsApprovePo = 0 WHERE ISNULL(deleted, 0) = 0 AND pono = ?", [pono])
            affected = cursor.rowcount

        if affected == 0:
            cursor.execute("SELECT TOP 1 amdno FROM POAmndMas WHERE ISNULL(deleted, 0) = 0 AND pono = ? ORDER BY ISNULL(amdno, N'') DESC", [pono])
            amnd_row = cursor.fetchone()
            resolved_amdno = amnd_row[0] if amnd_row else ""
            cursor.execute("UPDATE POAmndMas SET IsApprovePo = 0 WHERE ISNULL(deleted, 0) = 0 AND pono = ?", [pono])
            affected = cursor.rowcount
            if affected > 0:
                transaction_no = resolved_amdno or pono

        if affected == 0:
            cursor.execute("UPDATE POMas SET IsApprovePo = 0 WHERE ISNULL(deleted, 0) = 0 AND pono = ?", [pono])
            affected = cursor.rowcount
            if affected > 0:
                transaction_no = pono

        if affected == 0:
            cursor.close()
            conn.close()
            return Response({"error": f"PO '{pono}' not found."}, status=404)

        try:
            conn.commit()
            modified_in_erp = True
            message = f"PO {pono} moved back to Pending in ERP."
            
            _log_reversion_bg(
                tenant.get("tenant_id"),
                tenant.get("company_code"),
                "Eapproval",
                transaction_no
            )
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            modified_in_erp = False
            message = f"PO {pono} reverted (UI only) — could not commit IsApprovePo reset."
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({"success": True, "pono": pono, "modified_in_erp": modified_in_erp, "message": message})


# ═══════════════════════════════════════════════════════════════
#  POST  eapproval/comment/
#  Saves remark/comment to BAPoDetails table in tenant database.
# ═══════════════════════════════════════════════════════════════
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def eapproval_save_comment(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    pono = (request.data.get("pono") or "").strip()
    if not pono:
        return Response({"error": "Field 'pono' is required."}, status=400)

    pocomment = (request.data.get("pocomment") or "").strip()
    if not pocomment:
        return Response({"error": "Field 'pocomment' cannot be empty."}, status=400)

    podate_raw = request.data.get("podate")
    potype = (request.data.get("potype") or "General").strip()
    custname = (request.data.get("custname") or "").strip()
    username = (request.data.get("user") or tenant.get("username") or "Admin").strip()

    # Parse date if provided
    podate = None
    if podate_raw:
        try:
            if isinstance(podate_raw, str):
                parts = podate_raw.split("/")
                if len(parts) == 3:
                    podate = f"{parts[2]}-{parts[1]}-{parts[0]}"
                else:
                    podate = podate_raw.split("T")[0]
        except Exception:
            podate = None

    try:
        cursor = conn.cursor()
        _ensure_bapodetails_table(cursor)

        cursor.execute("SELECT TOP 1 Id FROM BAPoDetails WHERE ISNULL(deleted, 0) = 0 AND LTRIM(RTRIM(Pono)) = LTRIM(RTRIM(?)) ORDER BY [datetime] DESC, Id DESC", [pono])
        existing_row = cursor.fetchone()

        if existing_row:
            update_sql = """
                UPDATE BAPoDetails
                SET Pocomment = ?,
                    Podate = COALESCE(?, Podate),
                    Potype = COALESCE(?, Potype),
                    Custname = COALESCE(?, Custname),
                    [User] = ?,
                    [datetime] = GETDATE()
                WHERE Id = ?
            """
            cursor.execute(update_sql, [pocomment, podate, potype, custname, username, existing_row[0]])
            # Clean up any other duplicate rows for this Pono if they existed before
            cursor.execute("DELETE FROM BAPoDetails WHERE LTRIM(RTRIM(Pono)) = LTRIM(RTRIM(?)) AND Id <> ?", [pono, existing_row[0]])
        else:
            insert_sql = """
                INSERT INTO BAPoDetails (Pono, Podate, Potype, Custname, Pocomment, [User], [datetime], deleted)
                VALUES (?, ?, ?, ?, ?, ?, GETDATE(), 0)
            """
            cursor.execute(insert_sql, [pono, podate, potype, custname, pocomment, username])

        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    from django.utils import timezone
    now_str = timezone.localtime(timezone.now()).strftime("%d/%m/%Y %I:%M %p")

    return Response({
        "success": True,
        "message": f"Remark for PO {pono} saved successfully in BAPoDetails.",
        "pono": pono,
        "pocomment": pocomment,
        "user": username,
        "datetime": now_str,
    })


# ═══════════════════════════════════════════════════════════════
#  POST  eapproval/comment/delete/
#  Soft-deletes remark (deleted = 1) from BAPoDetails for given Pono.
# ═══════════════════════════════════════════════════════════════
@api_view(["POST", "DELETE"])
@authentication_classes([])
@permission_classes([AllowAny])
def eapproval_delete_comment(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    pono = (request.data.get("pono") or "").strip()
    if not pono:
        return Response({"error": "Field 'pono' is required."}, status=400)

    try:
        cursor = conn.cursor()
        if _check_table_exists(cursor, "BAPoDetails"):
            cursor.execute("UPDATE BAPoDetails SET deleted = 1 WHERE LTRIM(RTRIM(Pono)) = LTRIM(RTRIM(?))", [pono])
            conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "success": True,
        "message": f"Remark for PO {pono} deleted successfully.",
        "pono": pono
    })


# ═══════════════════════════════════════════════════════════════
#  GET/POST  eapproval/user-limits/
#  Manages user PO approval limit rules and low-value PO filter
# ═══════════════════════════════════════════════════════════════
@api_view(["GET", "POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def eapproval_user_limits(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    try:
        cursor = conn.cursor()
        _ensure_bauserlimits_table(cursor)

        if request.method == "POST":
            data = request.data or {}
            limits = data.get("limits", {})
            hide_under_1000 = bool(data.get("hideUnder1000", False))
            current_user = str(tenant.get("username") or "").strip()

            for uid_or_uname, lim_info in limits.items():
                if not isinstance(lim_info, dict):
                    continue
                uname = str(lim_info.get("userName") or uid_or_uname).strip()
                if not uname:
                    continue
                limit_amt = float(lim_info.get("limit") or 0)
                is_unlimited = 1 if lim_info.get("isUnlimited") else 0
                hide_flag = 1 if hide_under_1000 else 0

                cursor.execute(
                    "DELETE FROM BAUserLimits WHERE UPPER(LTRIM(RTRIM(Username))) = UPPER(LTRIM(RTRIM(?)))",
                    [uname]
                )
                cursor.execute("""
                    INSERT INTO BAUserLimits (Username, LimitAmt, IsUnlimited, HideUnder1000, UpdatedBy, UpdatedAt)
                    VALUES (?, ?, ?, ?, ?, GETDATE())
                """, [uname, limit_amt, is_unlimited, hide_flag, current_user])

            conn.commit()
            cursor.close()
            conn.close()
            return Response({
                "success": True,
                "message": "User PO approval limits and policy saved successfully."
            })

        # GET request: fetch current saved limits
        cursor.execute("""
            SELECT Username, ISNULL(LimitAmt, 0), ISNULL(IsUnlimited, 0), ISNULL(HideUnder1000, 0)
            FROM BAUserLimits
        """)
        rows = cursor.fetchall()
        limits_dict = {}
        hide_under_1000 = False

        for uname, limit_amt, is_unlimited, hide_flag in rows:
            u_clean = str(uname or "").strip()
            if u_clean:
                limits_dict[u_clean] = {
                    "userName": u_clean,
                    "limit": float(limit_amt or 0),
                    "isUnlimited": bool(is_unlimited),
                    "eapproval": True,
                }
            if hide_flag:
                hide_under_1000 = True

        cursor.close()
        conn.close()
        return Response({
            "success": True,
            "limits": limits_dict,
            "hideUnder1000": hide_under_1000,
        })
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        return Response({"error": f"Database error: {str(e)}"}, status=500)

