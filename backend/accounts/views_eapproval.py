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


def _po_cte_sql(include_amnd: bool = False, is_approve_vend_po: bool = False) -> str:
    job_filter = "" if is_approve_vend_po else "AND LOWER(LTRIM(RTRIM(ISNULL(P.dtype, N'')))) NOT LIKE '%job%'"
    base_sql = f"""
        WITH po AS (
            SELECT
                P.pono                                              AS po_no,
                P.podate                                            AS po_date,
                LTRIM(RTRIM(ISNULL(P.dtype, N'')))                  AS dtype_raw,
                ISNULL(P.totamt, 0)                                 AS totamt,
                {_IS_APPROVED_SQL.strip()}                         AS is_approved,
                LTRIM(RTRIM(ISNULL(C.CName, N'')))                  AS vendor_name,
                {_CANON_TYPE_SQL.strip()}                          AS canon_type,
                N'po'                                               AS doc_kind,
                N''                                                 AS amd_no
            FROM POMas P
            {_CUST_JOIN_SQL.strip()}
            WHERE ISNULL(P.deleted, 0) = 0
              {job_filter}
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
                LTRIM(RTRIM(ISNULL(C.CName, N'')))                  AS vendor_name,
                N'PO Amendment'                                     AS canon_type,
                N'po_amnd'                                          AS doc_kind,
                LTRIM(RTRIM(ISNULL(P.amdno, N'')))                  AS amd_no
            FROM POAmndMas P
            {_CUST_JOIN_SQL.strip()}
            WHERE ISNULL(P.deleted, 0) = 0
              {job_filter}
              AND CAST(P.amddate AS DATE) BETWEEN ? AND ?
        """
    base_sql += "\n        )\n"
    return base_sql


def _list_filter_sql(type_filter: str, status_filter: str, search_q: str, params: list) -> str:
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

        is_approve_vend_po = False
        try:
            cursor.execute("SELECT TOP 1 ISNULL(IsApproveVendPo, 0) FROM CompanySetting")
            cs_row = cursor.fetchone()
            if cs_row and cs_row[0]:
                is_approve_vend_po = True
        except Exception:
            pass

        params: list = [start_date, end_date, start_date, end_date] if has_amnd else [start_date, end_date]
        filt = _list_filter_sql(type_filter, status_filter, search_q, params)

        sql_combined = f"""
            {_po_cte_sql(has_amnd, is_approve_vend_po).strip()}
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
            filt = _list_filter_sql(type_filter, status_filter, search_q, params)
            sql_fallback = f"""
                {_po_cte_sql(False, is_approve_vend_po).strip()}
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
        })

    return Response({
        "success":   True,
        "from":      str(start_date),
        "to":        str(end_date),
        "page":      page,
        "page_size": page_size,
        "total":     total_count,
        "cards":     cards,
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

        is_approve_vend_po = False
        try:
            cursor.execute("SELECT TOP 1 ISNULL(IsApproveVendPo, 0) FROM CompanySetting")
            cs_row = cursor.fetchone()
            if cs_row and cs_row[0]:
                is_approve_vend_po = True
        except Exception:
            pass

        sql = f"""
            {_po_cte_sql(has_amnd, is_approve_vend_po).strip()}
            SELECT
                po.canon_type,
                po.is_approved,
                COUNT(*)              AS cnt,
                SUM(ISNULL(po.totamt, 0)) AS total_amt
            FROM po
            GROUP BY po.canon_type, po.is_approved
        """
        stat_params = [start_date, end_date, start_date, end_date] if has_amnd else [start_date, end_date]

        try:
            cursor.execute(sql, stat_params)
            rows = cursor.fetchall()
        except Exception:
            sql_fallback = f"""
                {_po_cte_sql(False, is_approve_vend_po).strip()}
                SELECT
                    po.canon_type,
                    po.is_approved,
                    COUNT(*)              AS cnt,
                    SUM(ISNULL(po.totamt, 0)) AS total_amt
                FROM po
                GROUP BY po.canon_type, po.is_approved
            """
            cursor.execute(sql_fallback, [start_date, end_date])
            rows = cursor.fetchall()

        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    type_buckets = {
        "Raw Material": {"total": 0, "approved": 0, "pending": 0, "amount": 0.0},
        "Store Material": {"total": 0, "approved": 0, "pending": 0, "amount": 0.0},
        "PO Amendment": {"total": 0, "approved": 0, "pending": 0, "amount": 0.0},
        "Service Po": {"total": 0, "approved": 0, "pending": 0, "amount": 0.0},
        "General": {"total": 0, "approved": 0, "pending": 0, "amount": 0.0},
    }

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
                    LTRIM(RTRIM(ISNULL(C.CName, N'')))   AS vendor_name
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
                cursor.execute(items_sql, [pono, found_amdno, found_amdno])
                icols = [d[0] for d in cursor.description]
                raw_items = [dict(zip(icols, r)) for r in cursor.fetchall()]

                if not raw_items:
                    items_sql_fb = """
                        SELECT
                            ROW_NUMBER() OVER (
                                ORDER BY ISNULL(D.seq, 2147483647)
                            ) AS sno,
                            ISNULL(D.rmname, N'')    AS code_no,
                            ISNULL(D.mattype, N'')   AS description,
                            ISNULL(D.dia, N'')       AS dia,
                            ISNULL(D.uom, N'')       AS uom,
                            ISNULL(D.qty, 0)         AS qty,
                            ISNULL(D.QtyKgs, 0)      AS qty_kgs,
                            ISNULL(D.rate, 0)        AS rate,
                            ISNULL(D.amount, 0)      AS amount
                        FROM POAmndDet D
                        WHERE ISNULL(D.deleted, 0) = 0
                          AND LTRIM(RTRIM(D.pono)) = LTRIM(RTRIM(?))
                        ORDER BY ISNULL(D.seq, 2147483647)
                    """
                    cursor.execute(items_sql_fb, [pono])
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
                    LTRIM(RTRIM(ISNULL(C.CName, N'')))   AS vendor_name
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
            cursor.execute(items_sql, [pono])
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

    # Residual round-off vs line + header add-ons + tax (totamt is ERP grand)
    computed = line_sum - disamt + pacamtbf + pacamt + tax_sum
    round_off = round(totamt - computed, 2)
    grand_total = totamt

    financial = {
        "totalAmount": round(totamt, 2),
        "lineItemsTotal": round(line_sum, 2),
        "discount": round(disamt, 2),
        "beforeTaxPF": round(pacamtbf, 2),
        "afterTaxPF": round(pacamt, 2),
        "taxes": tax_lines,
        "totalTaxAmount": round(tax_sum, 2),
        "roundOff": round_off,
        "grandTotal": round(grand_total, 2),
        "summaryRows": _build_financial_summary_rows(
            totamt, disamt, pacamtbf, pacamt, tax_lines, round_off, grand_total
        ),
    }

    canon = _canonical_type(header.get("dtype_raw", ""))
    status = "Approved" if _is_po_approved(header.get("is_approve_raw")) else "Pending"

    # Fetch approval info from tenants_approvals
    from .models import TenantApproval
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

    card_id = f"po_amnd:{header['pono']}:{header.get('amdno', '')}" if (doc_kind == "po_amnd" or header.get("amdno")) else str(header["pono"])
    card = {
        "id": card_id,
        "poNo": str(header["pono"]),
        "amdNo": str(header.get("amdno") or amdno or ""),
        "docKind": "po_amnd" if (doc_kind == "po_amnd" or header.get("amdno")) else "po",
        "poDate": _fmt_date(header["podate"]),
        "type": canon,
        "status": status,
        "vendor": header["vendor_name"] or "Unknown Vendor",
        "countLabel": "Amount",
        "countVal": round(grand_total, 2),
        "items": line_items,
        "financial": financial,
        "discount": financial["discount"],
        "bfTaxPF": financial["beforeTaxPF"],
        "afTaxPF": financial["afterTaxPF"],
        "roundOff": financial["roundOff"],
        "cgstPct": 0,
        "sgstPct": 0,
        "approvedBy": approved_by,
        "approvedDateTime": approved_dt,
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
    rows.append({"label": "Round Off", "value": round(round_off, 2), "sub": True, "neg": round_off < 0})
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
