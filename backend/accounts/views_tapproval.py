# ════════════════════════════════════════════════════════════════
#  views_tapproval.py
#  T-Approval — Bill_Mas invoices + DC_Mas + ReturnableDcIss (SQL Server)
#
#  Invoices: Bill_Mas, Bill_Det, Bill_Tax, Bill_AddlChrgDet, CustMast
#  DC:       DC_Mas, DC_Det, Dc_Tax, Dc_RateDet, CustMast
#  Ret DC:  ReturnableDcIss_Mas/Det/Tax/RateDet — dtype Material Issue, IsReturnable
#
#  Cards:    doc no/date, type, customer (CustMast.CName via cid),
#            Approved if IsApproved truthy else Pending,
#            invoice amount = namt; DC / Ret DC = namt if non-zero else tamt
#  DC lines: DC_Det — partno, description, uom, okqty+matrej+macrej, wgt;
#            rate/amount from Dc_RateDet
#  Ret lines: ReturnableDcIss_Det — itcode, itdesc+process, uom, qty, qty others 0;
#            rate/amount from ReturnableDcIss_RateDet (retissno + itcode)
#  DC fin:   tamt, discount/P&F = 0, Dc_Tax, roundoff, grand = namt
#  Ret fin:  same pattern via ReturnableDcIss_Tax / Mas.roundoff / namt
#
#  GET  tapproval/list/ | stats/ | detail/
#  POST tapproval/approve/ | tapproval/modify/
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

from typing import Optional

from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .views import get_tenant_connection, parse_date_range

def _canonical_invoice_type(btype_raw: str) -> Optional[str]:
    """Map Bill_Mas.btype → canonical invoice bucket; None if not an invoice type."""
    t = (btype_raw or "").strip().lower()
    if "credit" in t and "note" in t:
        return None
    if "General Labour" in t:
        return "Invoice - General Labour"
    if "scrap" in t:
        return "Invoice - Scrap"
    if "debit" in t:
        return "Invoice - Debit Note"
    if "general" in t or "rework" in t:
        return "Invoice - General"
    return None


_CANON_INVOICE_TYPE_SQL = """
    CASE
        WHEN LOWER(LTRIM(RTRIM(ISNULL(B.btype, N'')))) LIKE N'%credit%note%' THEN NULL
        WHEN LOWER(LTRIM(RTRIM(ISNULL(B.btype, N'')))) LIKE N'%General Labour%'  THEN N'Invoice - General Labour'
        WHEN LOWER(LTRIM(RTRIM(ISNULL(B.btype, N'')))) LIKE N'%scrap%'   THEN N'Invoice - Scrap'
        WHEN LOWER(LTRIM(RTRIM(ISNULL(B.btype, N'')))) LIKE N'%debit%'   THEN N'Invoice - Debit Note'
        WHEN LOWER(LTRIM(RTRIM(ISNULL(B.btype, N'')))) LIKE N'%general%'
          OR LOWER(LTRIM(RTRIM(ISNULL(B.btype, N'')))) LIKE N'%rework%' THEN N'Invoice - General'
        ELSE NULL
    END
"""

_CUST_JOIN_BILL_SQL = """
    LEFT JOIN CustMast C ON
        LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(C.Id, N''))))
        = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(B.cid, N''))))
        AND ISNULL(C.Deleted, 0) = 0
    LEFT JOIN CustAliasMast CA ON
        LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CA.Id, N''))))
        = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(B.cid, N''))))
        AND ISNULL(CA.Deleted, 0) = 0
"""

_CUST_JOIN_DC_SQL = """
    LEFT JOIN CustMast C ON
        LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(C.Id, N''))))
        = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(D.cid, N''))))
        AND ISNULL(C.Deleted, 0) = 0
    LEFT JOIN CustAliasMast CA ON
        LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CA.Id, N''))))
        = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(D.cid, N''))))
        AND ISNULL(CA.Deleted, 0) = 0
"""

_CUST_JOIN_RET_DC_SQL = """
    LEFT JOIN CustMast C ON
        LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(C.Id, N''))))
        = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(R.cid, N''))))
        AND ISNULL(C.Deleted, 0) = 0
    LEFT JOIN CustAliasMast CA ON
        LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CA.Id, N''))))
        = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(R.cid, N''))))
        AND ISNULL(CA.Deleted, 0) = 0
"""

_CUST_JOIN_JOB_SQL = """
    LEFT JOIN CustMast C ON
        LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(C.Id, N''))))
        = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(J.cid, N''))))
        AND ISNULL(C.Deleted, 0) = 0
    LEFT JOIN CustAliasMast CA ON
        LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CA.Id, N''))))
        = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(J.cid, N''))))
        AND ISNULL(CA.Deleted, 0) = 0
"""

_IS_APPROVED_BILL_SQL = """
    CASE WHEN ISNULL(CAST(B.IsApproved AS INT), 0) <> 0 THEN 1 ELSE 0 END
"""

_IS_APPROVED_DC_SQL = """
    CASE WHEN ISNULL(CAST(D.IsApproved AS INT), 0) <> 0 THEN 1 ELSE 0 END
"""

_IS_APPROVED_RET_DC_SQL = """
    CASE WHEN ISNULL(CAST(R.IsApproved AS INT), 0) <> 0 THEN 1 ELSE 0 END
"""

_IS_APPROVED_JOB_SQL = """
    CASE WHEN ISNULL(CAST(J.IsApproveJbDcPrt AS INT), 0) <> 0 THEN 1 ELSE 0 END
"""

_RET_DC_DISPLAY_AMOUNT_SQL = """
    CASE
        WHEN ISNULL(R.namt, 0) = 0 THEN ISNULL(R.tamt, 0)
        ELSE ISNULL(R.namt, 0)
    END
"""

_JOB_DISPLAY_AMOUNT_SQL = """
    CASE
        WHEN ISNULL(J.namt, 0) = 0 THEN ISNULL(J.tamt, 0)
        ELSE ISNULL(J.namt, 0)
    END
"""

_RET_DC_IN_SCOPE_SQL = """
    ISNULL(CAST(R.IsReturnable AS INT), 0) <> 0
"""

_CANON_RET_DC_TYPE_SQL = """
    CASE
        WHEN LTRIM(RTRIM(ISNULL(R.dtype, N''))) <> N''
          THEN N'Returnable DC - ' + LTRIM(RTRIM(R.dtype))
        ELSE N'Returnable DC - Material Issue'
    END
"""

_CANON_JOB_TYPE_SQL = """
    CASE
        WHEN LTRIM(RTRIM(ISNULL(J.dtype, N''))) <> N'' AND LTRIM(RTRIM(ISNULL(J.jbtype, N''))) <> N''
            THEN LTRIM(RTRIM(J.dtype)) + N' - ' + LTRIM(RTRIM(J.jbtype))
        WHEN LTRIM(RTRIM(ISNULL(J.dtype, N''))) <> N''
            THEN LTRIM(RTRIM(J.dtype))
        WHEN LTRIM(RTRIM(ISNULL(J.jbtype, N''))) <> N''
            THEN N'Job Order Issue - ' + LTRIM(RTRIM(J.jbtype))
        ELSE N'Job Order Issue - Job Order'
    END
"""

_DC_DISPLAY_AMOUNT_SQL = """
    CASE
        WHEN ISNULL(D.namt, 0) = 0 THEN ISNULL(D.tamt, 0)
        ELSE ISNULL(D.namt, 0)
    END
"""

_DC_DTYPE_EXPR = "LOWER(LTRIM(RTRIM(ISNULL(D.dtype, N''))))"

_CANON_DC_TYPE_SQL = f"""
    CASE
        WHEN {_DC_DTYPE_EXPR} LIKE N'%General Labour%'
          THEN N'DC - General Labour'
        WHEN {_DC_DTYPE_EXPR} LIKE N'%Customer Rework%'
          OR {_DC_DTYPE_EXPR} LIKE N'%customer rework%'
          THEN N'DC - Customer Rework'
        WHEN {_DC_DTYPE_EXPR} LIKE N'%general%'
          THEN N'DC - General'
        ELSE NULL
    END
"""


def _canonical_dc_type(dtype_raw: str) -> Optional[str]:
    """Map DC_Mas.dtype → canonical DC bucket; None if not one of the 3 allowed types."""
    t = (dtype_raw or "").strip().lower()
    if "General Labour" in t:
        return "DC - General Labour"
    if "Customer Rework" in t and "rework" in t:
        return "DC - Customer Rework"
    if "general" in t :
        return "DC - General"
    return None


def _default_invoice_buckets():
    return {
        "Invoice - General": {"total": 0, "approved": 0, "pending": 0, "amount": 0.0},
        "Invoice - General Labour": {"total": 0, "approved": 0, "pending": 0, "amount": 0.0},
        "Invoice - Scrap": {"total": 0, "approved": 0, "pending": 0, "amount": 0.0},
        "Invoice - Debit Note": {"total": 0, "approved": 0, "pending": 0, "amount": 0.0},
    }


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


def _is_approved(val) -> bool:
    if val is None:
        return False
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return val != 0
    return str(val).strip().upper() in ("1", "Y", "YES", "TRUE", "T")


def _line_description(item: dict) -> str:
    """Merge itdesc + process (Returnable DC) into a single description for the UI."""
    desc = str(item.get("description", "") or "").strip()
    proc = str(item.get("process_raw", "") or item.get("process", "") or "").strip()
    if proc and not desc.endswith(proc):
        return f"{desc} — {proc}" if desc else proc
    return desc


def _get_is_trns_apl(conn) -> int:
    """Read IsTrnsApl (0, 1, 2, or 3) from CompanySettingFeatures or CompanySetting. Defaults to 0."""
    try:
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT TOP 1 IsTrnsApl FROM CompanySettingFeatures")
            row = cursor.fetchone()
            if row is not None and row[0] is not None:
                cursor.close()
                return int(row[0])
        except Exception:
            pass
        try:
            cursor.execute("SELECT TOP 1 IsTrnsApl FROM CompanySetting")
            row = cursor.fetchone()
            if row is not None and row[0] is not None:
                cursor.close()
                return int(row[0])
        except Exception:
            pass
        cursor.close()
    except Exception:
        pass
    return 0


def _combined_docs_cte_sql(is_trns_apl: int = 0) -> str:
    """
    Dynamic CTE merging invoice + DC + Returnable DC + (optionally) Job Order Issue rows
    based on CompanySettingFeatures.IsTrnsApl:
      - 0: DC (all 3), Invoice (all 4), RDC (Material Issue only), Job Order Issue disabled
      - 1: DC (all 3), Invoice (all 4), RDC (all 4 types),        Job Order Issue disabled
      - 2: DC (all 3), Invoice (all 4), RDC (Material Issue only), Job Order Issue (all types)
      - 3: DC (all 3), Invoice (all 4), RDC (all 4 types),        Job Order Issue (all types)
    """
    if is_trns_apl in (0, 2):
        rdc_filter_clause = """
            AND (
                LTRIM(RTRIM(ISNULL(R.dtype, N''))) = N''
                OR LOWER(LTRIM(RTRIM(ISNULL(R.dtype, N'')))) LIKE N'%material%issue%'
                OR LOWER(LTRIM(RTRIM(ISNULL(R.dtype, N'')))) = N'general'
            )
        """
        rdc_canon_expr = "N'Returnable DC - Material Issue'"
    else:
        rdc_filter_clause = ""
        rdc_canon_expr = _CANON_RET_DC_TYPE_SQL.strip()

    include_jo = is_trns_apl in (2, 3)

    job_order_cte = ""
    docs_union = """
            SELECT * FROM inv
            UNION ALL
            SELECT * FROM dc
            UNION ALL
            SELECT * FROM ret_dc
    """

    if include_jo:
        job_order_cte = f""",
        job_order AS (
            SELECT
                J.jbno                                               AS doc_no,
                J.jbdate                                             AS doc_date,
                LTRIM(RTRIM(ISNULL(J.jbtype, N'')))                  AS type_raw,
                {_JOB_DISPLAY_AMOUNT_SQL.strip()}                    AS display_amt,
                {_IS_APPROVED_JOB_SQL.strip()}                       AS is_approved,
                LTRIM(RTRIM(COALESCE(C.CName, CA.CName, N'')))      AS customer_name,
                {_CANON_JOB_TYPE_SQL.strip()}                        AS canon_type,
                N'job_order_issue'                                   AS doc_kind
            FROM Job_mas J
            {_CUST_JOIN_JOB_SQL.strip()}
            WHERE ISNULL(J.deleted, 0) = 0
              AND CAST(J.jbdate AS DATE) BETWEEN ? AND ?
        )"""
        docs_union += """
            UNION ALL
            SELECT * FROM job_order
        """

    return f"""
        WITH inv AS (
            SELECT
                B.invno                                              AS doc_no,
                B.invdt                                              AS doc_date,
                LTRIM(RTRIM(ISNULL(B.btype, N'')))                  AS type_raw,
                ISNULL(B.namt, 0)                                    AS display_amt,
                {_IS_APPROVED_BILL_SQL.strip()}                      AS is_approved,
                LTRIM(RTRIM(COALESCE(C.CName, CA.CName, N'')))      AS customer_name,
                {_CANON_INVOICE_TYPE_SQL.strip()}                    AS canon_type,
                N'invoice'                                           AS doc_kind
            FROM Bill_Mas B
            {_CUST_JOIN_BILL_SQL.strip()}
            WHERE ISNULL(B.deleted, 0) = 0
              AND CAST(B.invdt AS DATE) BETWEEN ? AND ?
              AND {_CANON_INVOICE_TYPE_SQL.strip()} IS NOT NULL
        ),
        dc AS (
            SELECT
                D.dcno                                               AS doc_no,
                D.dcdate                                             AS doc_date,
                LTRIM(RTRIM(ISNULL(D.dtype, N'')))                  AS type_raw,
                {_DC_DISPLAY_AMOUNT_SQL.strip()}                     AS display_amt,
                {_IS_APPROVED_DC_SQL.strip()}                        AS is_approved,
                LTRIM(RTRIM(COALESCE(C.CName, CA.CName, N'')))      AS customer_name,
                {_CANON_DC_TYPE_SQL.strip()}                         AS canon_type,
                N'dc'                                                AS doc_kind
            FROM DC_Mas D
            {_CUST_JOIN_DC_SQL.strip()}
            WHERE ISNULL(D.deleted, 0) = 0
              AND CAST(D.dcdate AS DATE) BETWEEN ? AND ?
              AND {_CANON_DC_TYPE_SQL.strip()} IS NOT NULL
        ),
        ret_dc AS (
            SELECT
                R.retissno                                           AS doc_no,
                R.retissdt                                           AS doc_date,
                LTRIM(RTRIM(ISNULL(R.dtype, N'')))                  AS type_raw,
                {_RET_DC_DISPLAY_AMOUNT_SQL.strip()}                 AS display_amt,
                {_IS_APPROVED_RET_DC_SQL.strip()}                    AS is_approved,
                LTRIM(RTRIM(COALESCE(C.CName, CA.CName, N'')))      AS customer_name,
                {rdc_canon_expr}                                     AS canon_type,
                N'ret_dc'                                            AS doc_kind
            FROM ReturnableDcIss_Mas R
            {_CUST_JOIN_RET_DC_SQL.strip()}
            WHERE ISNULL(R.deleted, 0) = 0
              AND CAST(R.retissdt AS DATE) BETWEEN ? AND ?
              AND {_RET_DC_IN_SCOPE_SQL.strip()}
              {rdc_filter_clause}
        ){job_order_cte},
        docs AS (
            {docs_union.strip()}
        )
    """


def _list_filter_sql(type_filter: str, status_filter: str, search_q: str, params: list) -> str:
    filt = " WHERE 1=1 "
    if search_q:
        filt += """
            AND (
                CAST(doc_no AS NVARCHAR(100)) LIKE ?
                OR customer_name LIKE ?
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


def _tax_label(ttype: str, tp: float) -> str:
    ttype = (ttype or "").strip()
    if tp:
        return f"Tax {ttype} @ {tp:g} %"
    return f"Tax {ttype}" if ttype else "Tax"


def _build_financial_summary_rows(
    tamt, disamt, before_tax_pf, after_tax_pf, tax_lines, round_off, grand_total
):
    rows = [
        {"label": "Total Amount", "value": round(tamt, 2), "sub": False, "neg": False},
        {"label": "Discount", "value": round(disamt, 2), "sub": True, "neg": True},
        {"label": "Before Tax P & F", "value": round(before_tax_pf, 2), "sub": True, "neg": False},
        {"label": "After Tax P & F", "value": round(after_tax_pf, 2), "sub": True, "neg": False},
    ]
    for t in tax_lines:
        rows.append({
            "label": t["label"],
            "value": round(t["txAmt"], 2),
            "sub": False,
            "neg": False,
        })
    rows.append({
        "label": "Round Off",
        "value": round(round_off, 2),
        "sub": True,
        "neg": round_off < 0,
    })
    rows.append({
        "label": "Grand Total",
        "value": round(grand_total, 2),
        "sub": False,
        "neg": False,
        "grand": True,
    })
    return rows


# ═══════════════════════════════════════════════════════════════
#  GET  tapproval/list/
# ═══════════════════════════════════════════════════════════════
@api_view(["GET"])
def tapproval_list(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    type_filter = (request.GET.get("type", "") or "").strip()
    status_filter = (request.GET.get("status", "") or "").strip().lower()
    search_q = (request.GET.get("search", "") or "").strip()

    try:
        page = max(1, int(request.GET.get("page", 1)))
    except ValueError:
        page = 1
    try:
        page_size = min(2000, max(1, int(request.GET.get("page_size", 500))))
    except ValueError:
        page_size = 200

    is_trns_apl = _get_is_trns_apl(conn)
    include_jo = is_trns_apl in (2, 3)
    branch_count = 4 if include_jo else 3
    params: list = [start_date, end_date] * branch_count
    filt = _list_filter_sql(type_filter, status_filter, search_q, params)
    offset = (page - 1) * page_size

    sql_combined = f"""
        {_combined_docs_cte_sql(is_trns_apl).strip()}
        , numbered AS (
            SELECT docs.*,
                   ROW_NUMBER() OVER (ORDER BY docs.doc_date DESC, docs.doc_no DESC) AS _rn,
                   COUNT(*) OVER () AS _total
            FROM docs
            {filt}
        )
        SELECT doc_no, doc_date, type_raw, display_amt, is_approved,
               customer_name, canon_type, doc_kind, _total
        FROM numbered
        WHERE _rn BETWEEN ? AND ?
    """
    page_params = params + [offset + 1, offset + page_size]

    try:
        cursor = conn.cursor()
        cursor.execute(sql_combined, page_params)
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
                formname="Tapproval"
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
        doc_kind = (rec.get("doc_kind") or "invoice").strip().lower()
        appr_info = approvals_map.get(str(rec["doc_no"]))
        approved_by = appr_info.approvedby if appr_info else None
        approved_dt = timezone.localtime(appr_info.datetime).strftime("%d/%m/%Y %I:%M %p") if (appr_info and appr_info.datetime) else None

        cards.append({
            "id": f"{doc_kind}:{rec['doc_no']}",
            "poNo": str(rec["doc_no"]),
            "poDate": _fmt_date(rec["doc_date"]),
            "type": rec["canon_type"] or (
                "Invoice - General"
                if doc_kind == "invoice"
                else (
                    f"Returnable DC - {rec.get('type_raw', '').strip()}"
                    if doc_kind == "ret_dc" and rec.get("type_raw")
                    else ("Returnable DC - Material Issue" if doc_kind == "ret_dc" else ("Job Order Issue - Job Order" if doc_kind == "job_order_issue" else "DC - General"))
                )
            ),
            "status": status,
            "vendor": rec["customer_name"] or "Unknown Customer",
            "countLabel": "Amount",
            "countVal": _safe_float(rec["display_amt"]),
            "btypeRaw": rec.get("type_raw") or "",
            "docKind": doc_kind,
            "approvedBy": approved_by,
            "approvedDateTime": approved_dt,
        })

    return Response({
        "success": True,
        "from": str(start_date),
        "to": str(end_date),
        "page": page,
        "page_size": page_size,
        "total": total_count,
        "is_trns_apl": is_trns_apl,
        "cards": cards,
    })


# ═══════════════════════════════════════════════════════════════
#  GET  tapproval/stats/
# ═══════════════════════════════════════════════════════════════
@api_view(["GET"])
def tapproval_stats(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)

    is_trns_apl = _get_is_trns_apl(conn)
    include_jo = is_trns_apl in (2, 3)
    stat_params = [start_date, end_date] * (4 if include_jo else 3)

    sql = f"""
        {_combined_docs_cte_sql(is_trns_apl).strip()}
        SELECT
            docs.canon_type,
            docs.is_approved,
            docs.doc_kind,
            COUNT(*) AS cnt,
            SUM(ISNULL(docs.display_amt, 0)) AS total_amt
        FROM docs
        GROUP BY docs.canon_type, docs.is_approved, docs.doc_kind
    """

    try:
        cursor = conn.cursor()
        cursor.execute(sql, stat_params)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    type_buckets = _default_invoice_buckets()
    overall_total = overall_approved = overall_pending = 0
    overall_amount = 0.0

    for canon, is_appr, doc_kind, cnt, total_amt in rows:
        doc_kind = (doc_kind or "invoice").strip().lower()
        if not canon:
            if doc_kind == "dc":
                canon = "DC - General"
            elif doc_kind == "ret_dc":
                canon = "Returnable DC - Material Issue"
            elif doc_kind == "job_order_issue":
                canon = "Job Order Issue - Job Order"
            else:
                canon = "Invoice - General"
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
        "is_trns_apl": is_trns_apl,
        "stats": [
            {
                "label": "Total Documents",
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
                    if overall_total > 0 else "No documents in range"
                ),
            },
        ],
        "by_type": type_buckets,
        "overall_total": overall_total,
        "overall_amount": round(overall_amount, 2),
    })


# ═══════════════════════════════════════════════════════════════
#  GET  tapproval/detail/
# ═══════════════════════════════════════════════════════════════
def _detail_invoice(conn, invno: str, start_date, end_date):
    batch_sql = f"""
        SELECT
            B.invno,
            B.invdt,
            LTRIM(RTRIM(ISNULL(B.btype, N''))) AS type_raw,
            ISNULL(B.tamt, 0) AS tamt,
            ISNULL(B.disamt, 0) AS disamt,
            ISNULL(B.RoundOff, 0) AS round_off,
            ISNULL(B.namt, 0) AS namt,
            B.IsApproved AS is_approve_raw,
            LTRIM(RTRIM(COALESCE(C.CName, CA.CName, N''))) AS customer_name,
            {_CANON_INVOICE_TYPE_SQL.strip()} AS canon_type
        FROM Bill_Mas B
        {_CUST_JOIN_BILL_SQL.strip()}
        WHERE ISNULL(B.deleted, 0) = 0
          AND B.invno = ?
          AND CAST(B.invdt AS DATE) BETWEEN ? AND ?
          AND {_CANON_INVOICE_TYPE_SQL.strip()} IS NOT NULL;

        SELECT
            ROW_NUMBER() OVER (
                ORDER BY ISNULL(D.RowNo, 2147483647), D.icode
            ) AS sno,
            ISNULL(D.itcode, N'') AS code_no,
            ISNULL(D.itdesc, N'') AS description,
            N'' AS process,
            ISNULL(D.uom, N'') AS uom,
            ISNULL(D.qty, 0) AS qty,
            ISNULL(D.QtyKgs, 0) AS qty_kgs,
            ISNULL(D.rate, 0) AS rate,
            ISNULL(D.amt, 0) AS amount
        FROM Bill_Det D
        WHERE ISNULL(D.deleted, 0) = 0
          AND D.invno = ?;

        SELECT
            ISNULL(T.ttype, N'') AS ttype,
            ISNULL(T.tp, 0) AS tp,
            ISNULL(T.txamt, 0) AS tx_amt
        FROM Bill_Tax T
        WHERE ISNULL(T.deleted, 0) = 0
          AND T.invno = ?
        ORDER BY ISNULL(T.nos, 0), T.ttype;

        SELECT
            SUM(CASE WHEN LOWER(LTRIM(RTRIM(ISNULL(A.taxapplyfor, N'')))) = N'before'
                     THEN ISNULL(A.addlchrgamt, 0) ELSE 0 END) AS before_tax_pf,
            SUM(CASE WHEN LOWER(LTRIM(RTRIM(ISNULL(A.taxapplyfor, N'')))) = N'after'
                     THEN ISNULL(A.addlchrgamt, 0) ELSE 0 END) AS after_tax_pf
        FROM Bill_AddlChrgDet A
        WHERE ISNULL(A.deleted, 0) = 0
          AND A.invno = ?;
    """
    cursor = conn.cursor()
    cursor.execute(batch_sql, [invno, start_date, end_date, invno, invno, invno])
    return cursor, "invoice"


def _detail_dc(conn, dcno: str, start_date, end_date):
    batch_sql = f"""
        SELECT
            D.dcno,
            D.dcdate,
            LTRIM(RTRIM(ISNULL(D.dtype, N''))) AS type_raw,
            ISNULL(D.tamt, 0) AS tamt,
            CAST(0 AS FLOAT) AS disamt,
            ISNULL(D.roundoff, 0) AS round_off,
            ISNULL(D.namt, 0) AS namt,
            D.IsApproved AS is_approve_raw,
            LTRIM(RTRIM(COALESCE(C.CName, CA.CName, N''))) AS customer_name,
            {_CANON_DC_TYPE_SQL.strip()} AS canon_type
        FROM DC_Mas D
        {_CUST_JOIN_DC_SQL.strip()}
        WHERE ISNULL(D.deleted, 0) = 0
          AND D.dcno = ?
          AND CAST(D.dcdate AS DATE) BETWEEN ? AND ?
          AND {_CANON_DC_TYPE_SQL.strip()} IS NOT NULL;

        SELECT
            ROW_NUMBER() OVER (
                ORDER BY ISNULL(DD.RowNo, 2147483647), DD.partno
            ) AS sno,
            ISNULL(DD.partno, N'') AS code_no,
            ISNULL(DD.description, N'') AS description,
            N'' AS process,
            ISNULL(DD.uom, N'') AS uom,
            ISNULL(DD.okqty, 0) + ISNULL(DD.matrej, 0) + ISNULL(DD.macrej, 0) AS qty,
            ISNULL(DD.wgt, 0) AS qty_kgs,
            ISNULL(R.rate, 0) AS rate,
            ISNULL(R.amount, 0) AS amount
        FROM DC_Det DD
        LEFT JOIN Dc_RateDet R ON
            R.dcno = DD.dcno
            AND LTRIM(RTRIM(ISNULL(R.partno, N''))) = LTRIM(RTRIM(ISNULL(DD.partno, N'')))
            AND ISNULL(R.deleted, 0) = 0
        WHERE ISNULL(DD.deleted, 0) = 0
          AND DD.dcno = ?;

        SELECT
            ISNULL(T.ttype, N'') AS ttype,
            ISNULL(T.tp, 0) AS tp,
            ISNULL(T.txamt, 0) AS tx_amt
        FROM Dc_Tax T
        WHERE ISNULL(T.deleted, 0) = 0
          AND T.dcno = ?
        ORDER BY ISNULL(T.nos, 0), T.ttype;

        SELECT
            CAST(0 AS FLOAT) AS before_tax_pf,
            CAST(0 AS FLOAT) AS after_tax_pf;
    """
    cursor = conn.cursor()
    cursor.execute(batch_sql, [dcno, start_date, end_date, dcno, dcno])
    return cursor, "dc"


def _detail_returnable_dc(conn, retissno: str, start_date, end_date):
    in_scope = _RET_DC_IN_SCOPE_SQL.strip()
    canon_expr = _CANON_RET_DC_TYPE_SQL.strip()
    batch_sql = f"""
        SELECT
            R.retissno,
            R.retissdt,
            LTRIM(RTRIM(ISNULL(R.dtype, N''))) AS type_raw,
            ISNULL(R.tamt, 0) AS tamt,
            CAST(0 AS FLOAT) AS disamt,
            ISNULL(R.roundoff, 0) AS round_off,
            ISNULL(R.namt, 0) AS namt,
            R.IsApproved AS is_approve_raw,
            LTRIM(RTRIM(COALESCE(C.CName, CA.CName, N''))) AS customer_name,
            {canon_expr} AS canon_type
        FROM ReturnableDcIss_Mas R
        {_CUST_JOIN_RET_DC_SQL.strip()}
        WHERE ISNULL(R.deleted, 0) = 0
          AND R.retissno = ?
          AND CAST(R.retissdt AS DATE) BETWEEN ? AND ?
          AND {in_scope};

        SELECT
            ROW_NUMBER() OVER (
                ORDER BY LTRIM(RTRIM(ISNULL(DD.itcode, N'')))
            ) AS sno,
            ISNULL(DD.itcode, N'') AS code_no,
            ISNULL(DD.itdesc, N'') AS description,
            ISNULL(DD.process, N'') AS process,
            ISNULL(DD.uom, N'') AS uom,
            ISNULL(DD.qty, 0) AS qty,
            CAST(0 AS FLOAT) AS qty_kgs,
            ISNULL(RT.Rate, 0) AS rate,
            ISNULL(RT.Amount, 0) AS amount
        FROM ReturnableDcIss_Det DD
        LEFT JOIN ReturnableDcIss_RateDet RT ON
            RT.retissno = DD.retissno
            AND LTRIM(RTRIM(ISNULL(RT.itcode, N''))) = LTRIM(RTRIM(ISNULL(DD.itcode, N'')))
            AND ISNULL(RT.deleted, 0) = 0
        WHERE ISNULL(DD.deleted, 0) = 0
          AND DD.retissno = ?;

        SELECT
            ISNULL(T.ttype, N'') AS ttype,
            ISNULL(T.tp, 0) AS tp,
            ISNULL(T.txamt, 0) AS tx_amt
        FROM ReturnableDcIss_Tax T
        WHERE ISNULL(T.deleted, 0) = 0
          AND T.retissno = ?
        ORDER BY ISNULL(T.nos, 0), T.ttype;

        SELECT
            CAST(0 AS FLOAT) AS before_tax_pf,
            CAST(0 AS FLOAT) AS after_tax_pf;
    """
    cursor = conn.cursor()
    cursor.execute(batch_sql, [retissno, start_date, end_date, retissno, retissno])
    return cursor, "ret_dc"


def _detail_job_order(conn, jbno: str, start_date, end_date):
    canon_expr = _CANON_JOB_TYPE_SQL.strip()
    batch_sql = f"""
        SELECT
            J.jbno,
            J.jbdate,
            LTRIM(RTRIM(ISNULL(J.jbtype, N''))) AS type_raw,
            ISNULL(J.tamt, 0) AS tamt,
            CAST(0 AS FLOAT) AS disamt,
            ISNULL(J.roundoff, 0) AS round_off,
            ISNULL(J.namt, 0) AS namt,
            J.IsApproveJbDcPrt AS is_approve_raw,
            LTRIM(RTRIM(COALESCE(C.CName, CA.CName, N''))) AS customer_name,
            {canon_expr} AS canon_type
        FROM Job_mas J
        {_CUST_JOIN_JOB_SQL.strip()}
        WHERE ISNULL(J.deleted, 0) = 0
          AND J.jbno = ?
          AND CAST(J.jbdate AS DATE) BETWEEN ? AND ?;

        SELECT
            ROW_NUMBER() OVER (
                ORDER BY JD.rpartno, JD.rmname
            ) AS sno,
            CASE
                WHEN LTRIM(RTRIM(ISNULL(J.jbtype, N''))) = N'Raw Material'
                    THEN ISNULL(JD.rmname, N'')
                ELSE ISNULL(JD.rpartno, N'')
            END AS code_no,
            CASE
                WHEN LTRIM(RTRIM(ISNULL(J.jbtype, N''))) = N'Raw Material'
                    THEN ISNULL(JD.mattype, N'')
                ELSE ISNULL(JD.description, N'')
            END AS description,
            CASE
                WHEN LTRIM(RTRIM(ISNULL(J.jbtype, N''))) = N'Raw Material'
                    THEN N'Raw Material'
                ELSE COALESCE(P.process, JD.process, N'')
            END AS process,
            ISNULL(JD.uom, N'') AS uom,
            ISNULL(JD.qty, 0) AS qty,
            CAST(0 AS FLOAT) AS qty_kgs,
            COALESCE(JR.rate, JD.rate, 0) AS rate,
            COALESCE(JR.amount, (ISNULL(JD.qty, 0) * ISNULL(COALESCE(JR.rate, JD.rate, 0), 0)), 0) AS amount
        FROM Job_Det JD
        INNER JOIN Job_mas J ON J.jbno = JD.jbno AND ISNULL(J.deleted, 0) = 0
        LEFT JOIN ProcessDet P ON
            LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(P.pcode, N'')))) = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(JD.process, N''))))
            AND ISNULL(P.deleted, 0) = 0
        LEFT JOIN Job_RateDet JR ON
            JR.jbno = JD.jbno
            AND (
                (LTRIM(RTRIM(ISNULL(J.jbtype, N''))) = N'Raw Material' AND LTRIM(RTRIM(ISNULL(JR.rmname, N''))) = LTRIM(RTRIM(ISNULL(JD.rmname, N''))))
                OR (LTRIM(RTRIM(ISNULL(J.jbtype, N''))) <> N'Raw Material' AND (
                    LTRIM(RTRIM(ISNULL(JR.partno, N''))) = LTRIM(RTRIM(ISNULL(JD.rpartno, N'')))
                    OR LTRIM(RTRIM(ISNULL(JR.rtnpartno, N''))) = LTRIM(RTRIM(ISNULL(JD.rpartno, N'')))
                    OR LTRIM(RTRIM(ISNULL(JR.rmname, N''))) = LTRIM(RTRIM(ISNULL(JD.rmname, N'')))
                ))
            )
            AND ISNULL(JR.deleted, 0) = 0
        WHERE ISNULL(JD.deleted, 0) = 0
          AND JD.jbno = ?;

        SELECT
            ISNULL(T.ttype, N'') AS ttype,
            ISNULL(T.tp, 0) AS tp,
            ISNULL(T.txamt, 0) AS tx_amt
        FROM Job_Tax T
        WHERE ISNULL(T.deleted, 0) = 0
          AND T.jbno = ?
        ORDER BY ISNULL(T.nos, 0), T.ttype;

        SELECT
            CAST(0 AS FLOAT) AS before_tax_pf,
            CAST(0 AS FLOAT) AS after_tax_pf;
    """
    cursor = conn.cursor()
    cursor.execute(batch_sql, [jbno, start_date, end_date, jbno, jbno])
    return cursor, "job_order_issue"


@api_view(["GET"])
def tapproval_detail(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    doc_no = (
        request.GET.get("jbno")
        or request.GET.get("retissno")
        or request.GET.get("invno")
        or request.GET.get("dcno")
        or request.GET.get("recno")
        or ""
    ).strip()
    if not doc_no:
        return Response({
            "error": "Query parameter 'jbno', 'invno', 'dcno', or 'retissno' is required.",
        }, status=400)

    doc_kind = (request.GET.get("doc_kind") or request.GET.get("docKind") or "").strip().lower()
    start_date, end_date = parse_date_range(request)

    try:
        if doc_kind in ("job_order_issue", "job_order"):
            cursor, resolved_kind = _detail_job_order(conn, doc_no, start_date, end_date)
        elif doc_kind == "ret_dc":
            cursor, resolved_kind = _detail_returnable_dc(conn, doc_no, start_date, end_date)
        elif doc_kind == "dc":
            cursor, resolved_kind = _detail_dc(conn, doc_no, start_date, end_date)
        else:
            cursor, resolved_kind = _detail_invoice(conn, doc_no, start_date, end_date)

        hrow = cursor.fetchone()
        if not hrow and doc_kind not in ("dc", "ret_dc", "job_order_issue", "job_order"):
            cursor.close()
            cursor, resolved_kind = _detail_dc(conn, doc_no, start_date, end_date)
            hrow = cursor.fetchone()
        if not hrow and doc_kind not in ("dc", "ret_dc", "job_order_issue", "job_order"):
            cursor.close()
            cursor, resolved_kind = _detail_returnable_dc(conn, doc_no, start_date, end_date)
            hrow = cursor.fetchone()
        if not hrow and doc_kind not in ("dc", "ret_dc", "job_order_issue", "job_order"):
            cursor.close()
            cursor, resolved_kind = _detail_job_order(conn, doc_no, start_date, end_date)
            hrow = cursor.fetchone()

        if not hrow:
            cursor.close()
            conn.close()
            label = (
                "Job Order Issue"
                if resolved_kind in ("job_order_issue", "job_order")
                else ("Returnable DC" if resolved_kind == "ret_dc" else ("DC" if resolved_kind == "dc" else "Invoice"))
            )
            return Response({"error": f"{label} '{doc_no}' not found."}, status=404)
        hcols = [d[0] for d in cursor.description]
        header = dict(zip(hcols, hrow))
        if resolved_kind in ("job_order_issue", "job_order"):
            doc_no_key, doc_date_key = "jbno", "jbdate"
        elif resolved_kind == "ret_dc":
            doc_no_key, doc_date_key = "retissno", "retissdt"
        elif resolved_kind == "dc":
            doc_no_key, doc_date_key = "dcno", "dcdate"
        else:
            doc_no_key, doc_date_key = "invno", "invdt"

        cursor.nextset()
        item_rows = cursor.fetchall()
        icols = [d[0] for d in cursor.description]
        raw_items = [dict(zip(icols, r)) for r in item_rows]

        cursor.nextset()
        tax_rows = cursor.fetchall()
        tcols = [d[0] for d in cursor.description]
        raw_taxes = [dict(zip(tcols, r)) for r in tax_rows]

        cursor.nextset()
        pf_row = cursor.fetchone()
        pf_cols = [d[0] for d in cursor.description]
        pf = dict(zip(pf_cols, pf_row)) if pf_row else {}

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
            "description": str(item.get("description", "")).strip() if resolved_kind in ("job_order_issue", "job_order") else _line_description(item),
            "process": str(item.get("process", "")).strip(),
            "process_raw": str(item.get("process", "")).strip(),
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
        tax_lines.append({
            "label": _tax_label(ttype, tp),
            "ttype": ttype,
            "tp": tp,
            "txAmt": tx,
        })

    tamt = _safe_float(header["tamt"])
    disamt = _safe_float(header["disamt"])
    before_tax_pf = _safe_float(pf.get("before_tax_pf", 0))
    after_tax_pf = _safe_float(pf.get("after_tax_pf", 0))
    round_off = _safe_float(header["round_off"])
    grand_total = _safe_float(header["namt"])

    financial = {
        "totalAmount": round(tamt, 2),
        "lineItemsTotal": round(line_sum, 2),
        "discount": round(disamt, 2),
        "beforeTaxPF": round(before_tax_pf, 2),
        "afterTaxPF": round(after_tax_pf, 2),
        "taxes": tax_lines,
        "totalTaxAmount": round(tax_sum, 2),
        "roundOff": round(round_off, 2),
        "grandTotal": round(grand_total, 2),
        "summaryRows": _build_financial_summary_rows(
            tamt, disamt, before_tax_pf, after_tax_pf, tax_lines, round_off, grand_total
        ),
    }

    if resolved_kind == "dc":
        canon = header.get("canon_type") or _canonical_dc_type(header.get("type_raw", ""))
        display_amt = grand_total if grand_total else tamt
    elif resolved_kind == "ret_dc":
        canon = header.get("canon_type") or "Returnable DC - Material Issue"
        display_amt = grand_total if grand_total else tamt
    elif resolved_kind in ("job_order_issue", "job_order"):
        canon = header.get("canon_type") or "Job Order Issue - Job Order"
        display_amt = grand_total if grand_total else tamt
    else:
        canon = header.get("canon_type") or _canonical_invoice_type(header.get("type_raw", ""))
        display_amt = grand_total
    status = "Approved" if _is_approved(header.get("is_approve_raw")) else "Pending"

    # Fetch approval info from tenants_approvals
    from .models import TenantApproval
    approved_by = None
    approved_dt = None
    try:
        appr_info = TenantApproval.objects.filter(
            tenantid=tenant.get("tenant_id"),
            companycode=tenant.get("company_code"),
            formname="Tapproval",
            transactionno=str(header[doc_no_key])
        ).first()
        if appr_info:
            approved_by = appr_info.approvedby
            from django.utils import timezone
            approved_dt = timezone.localtime(appr_info.datetime).strftime("%d/%m/%Y %I:%M %p") if appr_info.datetime else None
    except Exception:
        pass

    card = {
        "id": f"{resolved_kind}:{header[doc_no_key]}",
        "poNo": str(header[doc_no_key]),
        "poDate": _fmt_date(header[doc_date_key]),
        "type": canon or (
            "Invoice - General"
            if resolved_kind == "invoice"
            else (
                "Returnable DC - Material Issue"
                if resolved_kind == "ret_dc"
                else (
                    "Job Order Issue - Job Order"
                    if resolved_kind in ("job_order_issue", "job_order")
                    else "DC - General"
                )
            )
        ),
        "status": status,
        "vendor": header["customer_name"] or "Unknown Customer",
        "countLabel": "Amount",
        "countVal": round(display_amt, 2),
        "docKind": resolved_kind,
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


# ═══════════════════════════════════════════════════════════════
#  POST  tapproval/approve/
# ═══════════════════════════════════════════════════════════════
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def tapproval_approve(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    doc_no = (
        request.data.get("jbno")
        or request.data.get("retissno")
        or request.data.get("invno")
        or request.data.get("dcno")
        or request.data.get("recno")
        or ""
    ).strip()
    if not doc_no:
        return Response({
            "error": "Field 'jbno', 'invno', 'dcno', or 'retissno' is required.",
        }, status=400)

    doc_kind = (request.data.get("doc_kind") or request.data.get("docKind") or "invoice").strip().lower()
    if doc_kind in ("job_order_issue", "job_order"):
        update_sql = "UPDATE Job_mas SET IsApproveJbDcPrt = 1 WHERE ISNULL(deleted, 0) = 0 AND jbno = ?"
        doc_label = "Job Order Issue"
    elif doc_kind == "dc":
        update_sql = "UPDATE DC_Mas SET IsApproved = 1 WHERE ISNULL(deleted, 0) = 0 AND dcno = ?"
        doc_label = "DC"
    elif doc_kind == "ret_dc":
        update_sql = (
            "UPDATE ReturnableDcIss_Mas SET IsApproved = 1 "
            "WHERE ISNULL(deleted, 0) = 0 AND retissno = ?"
        )
        doc_label = "Returnable DC"
    else:
        update_sql = "UPDATE Bill_Mas SET IsApproved = 1, IsModifyOpen = 0 WHERE ISNULL(deleted, 0) = 0 AND invno = ?"
        doc_label = "Invoice"

    try:
        cursor = conn.cursor()
        
        # Query doc date and type for the approval log
        doc_date = None
        doc_type = "General"
        try:
            if doc_kind in ("job_order_issue", "job_order"):
                cursor.execute("SELECT jbdate, dtype, jbtype FROM Job_mas WHERE ISNULL(deleted, 0) = 0 AND jbno = ?", [doc_no])
                d_row = cursor.fetchone()
                if d_row:
                    doc_date = d_row[0]
                    dt = (d_row[1] or "").strip()
                    jt = (d_row[2] or "").strip()
                    if dt and jt:
                        doc_type = f"{dt} - {jt}"
                    elif dt:
                        doc_type = dt
                    elif jt:
                        doc_type = f"Job Order Issue - {jt}"
                    else:
                        doc_type = "Job Order Issue - Job Order"
            elif doc_kind == "dc":
                cursor.execute("SELECT dcdate, dtype FROM DC_Mas WHERE ISNULL(deleted, 0) = 0 AND dcno = ?", [doc_no])
                d_row = cursor.fetchone()
                if d_row:
                    doc_date = d_row[0]
                    doc_type = _canonical_dc_type(d_row[1]) or "DC - General"
            elif doc_kind == "ret_dc":
                cursor.execute("SELECT retissdt, dtype FROM ReturnableDcIss_Mas WHERE ISNULL(deleted, 0) = 0 AND retissno = ?", [doc_no])
                d_row = cursor.fetchone()
                if d_row:
                    doc_date = d_row[0]
                    ret_dtype = (d_row[1] or "").strip()
                    doc_type = f"Returnable DC - {ret_dtype}" if ret_dtype else "Returnable DC - Material Issue"
            else:
                cursor.execute("SELECT invdt, btype FROM Bill_Mas WHERE ISNULL(deleted, 0) = 0 AND invno = ?", [doc_no])
                d_row = cursor.fetchone()
                if d_row:
                    doc_date = d_row[0]
                    doc_type = _canonical_invoice_type(d_row[1]) or "Invoice - General"
        except Exception:
            pass

        cursor.execute(update_sql, [doc_no])
        affected = cursor.rowcount
        if affected == 0:
            cursor.close()
            conn.close()
            return Response({"error": f"{doc_label} '{doc_no}' not found."}, status=404)
        try:
            conn.commit()
            approved_in_erp = True
            message = f"{doc_label} {doc_no} approved successfully in ERP."
            try:
                _log_approval_bg(
                    tenant.get("tenant_id"),
                    tenant.get("company_code"),
                    "Tapproval",
                    doc_no,
                    doc_date,
                    doc_type,
                    tenant.get("username") or "Admin"
                )
            except Exception as log_err:
                print("TApproval log write error:", log_err)
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            approved_in_erp = False
            message = f"{doc_label} {doc_no} acknowledged (UI only) — could not commit IsApproved."
        approved_by = tenant.get("username") or "Admin"
        from django.utils import timezone
        approved_dt = timezone.localtime(timezone.now()).strftime("%d/%m/%Y %I:%M %p")
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "success": True,
        "jbno": doc_no,
        "invno": doc_no,
        "dcno": doc_no,
        "retissno": doc_no,
        "doc_kind": doc_kind,
        "approved_in_erp": approved_in_erp,
        "message": message,
        "approvedBy": approved_by,
        "approvedDateTime": approved_dt
    })


# ═══════════════════════════════════════════════════════════════
#  POST  tapproval/modify/
# ═══════════════════════════════════════════════════════════════
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def tapproval_modify(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    doc_no = (
        request.data.get("jbno")
        or request.data.get("retissno")
        or request.data.get("invno")
        or request.data.get("dcno")
        or request.data.get("recno")
        or ""
    ).strip()
    if not doc_no:
        return Response({
            "error": "Field 'jbno', 'invno', 'dcno', or 'retissno' is required.",
        }, status=400)

    doc_kind = (request.data.get("doc_kind") or request.data.get("docKind") or "invoice").strip().lower()
    if doc_kind in ("dc", "ret_dc"):
        return Response({
            "error": "Modify Open is disabled for Delivery Challan (DC) documents."
        }, status=400)
    elif doc_kind in ("job_order_issue", "job_order"):
        update_sql = "UPDATE Job_mas SET IsApproveJbDcPrt = 0 WHERE ISNULL(deleted, 0) = 0 AND jbno = ?"
        doc_label = "Job Order Issue"
    else:
        update_sql = "UPDATE Bill_Mas SET IsApproved = 0, IsModifyOpen = 1 WHERE ISNULL(deleted, 0) = 0 AND invno = ?"
        doc_label = "Invoice"

    try:
        cursor = conn.cursor()
        cursor.execute(update_sql, [doc_no])
        affected = cursor.rowcount
        if affected == 0:
            cursor.close()
            conn.close()
            return Response({"error": f"{doc_label} '{doc_no}' not found."}, status=404)
        try:
            conn.commit()
            modified_in_erp = True
            message = f"{doc_label} {doc_no} moved back to Pending in ERP."
            
            _log_reversion_bg(
                tenant.get("tenant_id"),
                tenant.get("company_code"),
                "Tapproval",
                doc_no
            )
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            modified_in_erp = False
            message = f"{doc_label} {doc_no} reverted (UI only) — could not commit IsApproved reset."
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "success": True,
        "jbno": doc_no,
        "invno": doc_no,
        "dcno": doc_no,
        "retissno": doc_no,
        "doc_kind": doc_kind,
        "modified_in_erp": modified_in_erp,
        "message": message,
    })

