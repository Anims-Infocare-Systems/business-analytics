# ════════════════════════════════════════════

#  views_sales_analysis.py

#  Sales Analysis — summary strip + KPI row

# ════════════════════════════════════════════

from calendar import monthrange
from datetime import date

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .views import get_tenant_connection, parse_date_range, table_exists, find_column_ci

def _build_search_sql(cursor, search_q, table_name, alias=""):
    """
    Returns (sql_cond, params_list).
    """
    if not search_q:
        return "", []

    candidates_map = {
        'Bill_Det': ['itcode', 'itdesc', 'partno', 'PRINTPartNO', 'PartNo', 'Part_No'],
        'In_PoDet': ['itcode', 'itdesc'],
        'In_PoDet_ShdQty': ['itcode'],
        'DcInSubDet': ['partno', 'PartNo'],
        'DcInSubDetAssmPoDet': ['partno', 'PartNo'],
        'DC_Det': ['PartNo', 'partno'],
        'DailyDcPlan_Det': ['PartNo', 'partno'],
        'WithMatMas': ['PartNo', 'partno', 'Description', 'description'],
        'ProductMast': ['PartNo', 'partno', 'Description', 'description'],
        'CustJobRawMat': ['partno', 'PartNo', 'Description', 'description'],
        'ABillDc_Det': ['DcPartNo', 'dcpartno']
    }

    candidates = candidates_map.get(table_name, [])
    if not candidates:
        return "", []

    valid_cols = []
    for col in candidates:
        cursor.execute(
            """
            SELECT TOP 1 COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'dbo' 
              AND TABLE_NAME = ? 
              AND UPPER(LTRIM(RTRIM(COLUMN_NAME))) = UPPER(LTRIM(RTRIM(?)))
            """, 
            (table_name, col)
        )
        row = cursor.fetchone()
        if row:
            valid_cols.append(row[0])

    if not valid_cols:
        return "", []

    p = f"{alias}." if alias else ""
    like_val = f"%{search_q}%"

    conds = [f"LOWER({p}[{col}]) LIKE LOWER(?)" for col in valid_cols]
    sql_cond = " AND (" + " OR ".join(conds) + ")"
    params = [like_val] * len(valid_cols)

    return sql_cond, params


def _get_invoice_subquery_filter(cursor, search_q, bm_alias="BM"):
    if not search_q:
        return "", []

    sql_cond, params = _build_search_sql(cursor, search_q, 'Bill_Det', 'd')
    if not sql_cond:
        return "", []

    sql = f""" AND {bm_alias}.invno IN (
        SELECT DISTINCT d.invno
        FROM Bill_Det d
        WHERE ISNULL(d.deleted, 0) = 0
          {sql_cond}
    )"""
    return sql, params



_MONTH_ABB = [

    "Jan", "Feb", "Mar", "Apr", "May", "Jun",

    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",

]





EXCLUDED_BTYPES_SQL = (
    "'With Material Rejection', ' Raw Material Insp Rej', 'Raw Material Insp Rej', "
    "'Stores Material Insp Rej', 'Debit Note', 'Sales Return', 'Revese Charge', 'Reverse Charge'"
)


def _parse_btype_list(btype_filter):
    if not btype_filter:
        return []
    if isinstance(btype_filter, (list, tuple, set)):
        res = []
        for x in btype_filter:
            for part in str(x).split(","):
                p = part.strip()
                if p and p.lower() not in ("all", "all types", ""):
                    res.append(p)
        return res
    if isinstance(btype_filter, str):
        return [p.strip() for p in btype_filter.split(",") if p.strip() and p.strip().lower() not in ("all", "all types", "")]
    return []


def _btype_param(btype_filter):
    items = _parse_btype_list(btype_filter)
    return tuple(items)


def _bill_mas_filters(alias="", btype_filter=""):
    p = f"{alias}." if alias else ""
    cond = (
        f"ISNULL({p}deleted, 0) = 0 "
        f"AND ISNULL({p}btype, '') NOT IN ({EXCLUDED_BTYPES_SQL}) "
        f"AND CAST({p}invdt AS DATE) BETWEEN ? AND ?"
    )
    items = _parse_btype_list(btype_filter)
    if len(items) == 1:
        cond += f" AND LTRIM(RTRIM(ISNULL({p}btype, N''))) = ?"
    elif len(items) > 1:
        placeholders = ", ".join(["?"] * len(items))
        cond += f" AND LTRIM(RTRIM(ISNULL({p}btype, N''))) IN ({placeholders})"
    return cond


def _bill_det_join_filters(btype_filter="", m_alias="m", d_alias="d"):
    cond = (
        f"ISNULL({d_alias}.deleted, 0) = 0 "
        f"AND ISNULL({m_alias}.deleted, 0) = 0 "
        f"AND ISNULL({m_alias}.btype, '') NOT IN ({EXCLUDED_BTYPES_SQL}) "
        f"AND CAST({m_alias}.invdt AS DATE) BETWEEN ? AND ?"
    )
    items = _parse_btype_list(btype_filter)
    if len(items) == 1:
        cond += f" AND LTRIM(RTRIM(ISNULL({m_alias}.btype, N''))) = ?"
    elif len(items) > 1:
        placeholders = ", ".join(["?"] * len(items))
        cond += f" AND LTRIM(RTRIM(ISNULL({m_alias}.btype, N''))) IN ({placeholders})"
    return cond


def _btype_cond(m_alias="m", btype_filter=""):
    items = _parse_btype_list(btype_filter)
    if len(items) == 1:
        return f" AND LTRIM(RTRIM(ISNULL({m_alias}.btype, N''))) = ?"
    elif len(items) > 1:
        placeholders = ", ".join(["?"] * len(items))
        return f" AND LTRIM(RTRIM(ISNULL({m_alias}.btype, N''))) IN ({placeholders})"
    return ""


def _bill_mas_filters_invoice_status(alias=""):
    """Bill_Mas filters for invoice-status counts (includes Credit Note btype)."""
    p = f"{alias}." if alias else ""
    return (
        f"ISNULL({p}deleted, 0) = 0 "
        f"AND CAST({p}invdt AS DATE) BETWEEN ? AND ?"
    )


def _credit_note_match_sql(alias=""):
    """ERP stores credit notes as btype 'Sales Return' (displayed as Credit Note)."""
    p = f"{alias}." if alias else ""
    return f"""(
        LTRIM(RTRIM(ISNULL({p}btype, N''))) = N'Sales Return'
        OR LOWER(LTRIM(RTRIM(ISNULL({p}btype, N'')))) LIKE N'%credit%note%'
        OR LOWER(LTRIM(RTRIM(ISNULL({p}bttype, N'')))) LIKE N'%credit%note%'
        OR LOWER(LTRIM(RTRIM(ISNULL({p}billheader, N'')))) LIKE N'%credit%note%'
        OR LTRIM(RTRIM(ISNULL({p}invno, N''))) LIKE N'CN%'
    )"""





def _cust_name_expr(use_alias):

    if use_alias:

        return (

            "LTRIM(RTRIM(ISNULL("

            "NULLIF(LTRIM(RTRIM(ISNULL(C.CName, N''))), N''), "

            "NULLIF(LTRIM(RTRIM(ISNULL(A.CName, N''))), N'')"

            ")))"

        )

    return "LTRIM(RTRIM(ISNULL(C.CName, N'')))"





def _cust_join_sql(use_alias):

    join = (

        "LEFT JOIN CustMast C ON "

        "LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(C.Id, N'')))) "

        "= LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(m.cid, N''))))"

    )

    if use_alias:

        join += (

            " LEFT JOIN CustAliasMast A ON "

            "LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(A.Id, N'')))) "

            "= LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(m.cid, N''))))"

        )

    return join





def _product_key_sql(det_alias="d"):

    return (

        f"LTRIM(RTRIM(ISNULL("

        f"NULLIF(LTRIM(RTRIM({det_alias}.itdesc)), ''), "

        f"{det_alias}.icode"

        f")))"

    )





def _pct(part, whole):

    if not whole:

        return 0.0

    return round((float(part or 0) / float(whole)) * 100, 1)





def format_period_label(start_date, end_date):

    if start_date.year == end_date.year and start_date.month == end_date.month:

        return f"{_MONTH_ABB[start_date.month - 1]} {start_date.year}"

    if start_date.year == end_date.year:

        return (

            f"{_MONTH_ABB[start_date.month - 1]} – "

            f"{_MONTH_ABB[end_date.month - 1]} {end_date.year}"

        )

    return (

        f"{_MONTH_ABB[start_date.month - 1]} {start_date.year} – "

        f"{_MONTH_ABB[end_date.month - 1]} {end_date.year}"

    )





def _fetch_top_product(cursor, start_date, end_date, search_q=None, btype_filter=None):
    det_filters = _bill_det_join_filters(btype_filter=btype_filter)
    product_key, _ = _bill_det_partno_expr(cursor, "d")
    if not product_key:
        return "", 0.0

    btype_p = _btype_param(btype_filter)
    search_sql, search_params = _build_search_sql(cursor, search_q, "Bill_Det", "d")

    cursor.execute(
        f"""
        SELECT TOP 1
            {product_key} AS product_name,
            ISNULL(SUM(CAST(d.amt AS FLOAT)), 0) AS revenue
        FROM Bill_Det d
        INNER JOIN Bill_Mas m ON d.invno = m.invno
        WHERE {det_filters} {search_sql}
          AND NULLIF({product_key}, N'') IS NOT NULL
        GROUP BY {product_key}
        ORDER BY SUM(CAST(d.amt AS FLOAT)) DESC
        """,
        (start_date, end_date) + btype_p + tuple(search_params),
    )

    row = cursor.fetchone()
    if not row:
        return "", 0.0

    return (row[0] or "").strip(), float(row[1] or 0)


def _fetch_top_customer(cursor, start_date, end_date, use_alias, search_q=None, btype_filter=None):
    mas_filters = _bill_mas_filters("m", btype_filter=btype_filter)
    det_filters = _bill_det_join_filters(btype_filter=btype_filter)
    name_expr = _cust_name_expr(use_alias)
    join_sql = _cust_join_sql(use_alias)

    btype_p = _btype_param(btype_filter)
    search_sql, search_params = _build_search_sql(cursor, search_q, "Bill_Det", "d")

    if search_q:
        cursor.execute(
            f"""
            SELECT TOP 1
                m.cid,
                {name_expr} AS customer_name,
                ISNULL(SUM(CAST(d.amt AS FLOAT)), 0) AS revenue
            FROM Bill_Det d
            INNER JOIN Bill_Mas m ON d.invno = m.invno
            {join_sql}
            WHERE {det_filters} {search_sql}
            GROUP BY m.cid, {name_expr}
            ORDER BY SUM(CAST(d.amt AS FLOAT)) DESC
            """,
            (start_date, end_date) + btype_p + tuple(search_params),
        )
    else:
        cursor.execute(
            f"""
            SELECT TOP 1
                m.cid,
                {name_expr} AS customer_name,
                ISNULL(SUM(CAST(m.tamt AS FLOAT)), 0) AS revenue
            FROM Bill_Mas m
            {join_sql}
            WHERE {mas_filters}
            GROUP BY m.cid, {name_expr}
            ORDER BY SUM(CAST(m.tamt AS FLOAT)) DESC
            """,
            (start_date, end_date) + btype_p,
        )

    row = cursor.fetchone()
    if not row:
        return "Unknown", 0.0

    name = (row[1] or "").strip() or "Unknown"
    return name, float(row[2] or 0)





@api_view(["GET"])
def sales_analysis_grand_total(request):
    """
    Dedicated view for Grand Total card value:
    SELECT SUM(namt) AS GrandTotal
    FROM Bill_Mas
    WHERE (invdt BETWEEN ? AND ?) AND (deleted = 0)
      AND (btype NOT IN ('With Material Rejection', ' Raw Material Insp Rej', 'Stores Material Insp Rej', 'Debit Note', 'Sales Return', 'Revese Charge'))
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    btype_filter = (request.GET.get("btype") or "").strip()
    btype_p = _btype_param(btype_filter)
    search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()

    excluded_btypes = (
        "'With Material Rejection', ' Raw Material Insp Rej', 'Raw Material Insp Rej', "
        "'Stores Material Insp Rej', 'Debit Note', 'Sales Return', 'Revese Charge', 'Reverse Charge'"
    )

    try:
        cursor = conn.cursor()
        if search_q:
            btype_cond = " AND LTRIM(RTRIM(ISNULL(m.btype, N''))) = ?" if btype_p else ""
            search_sql_det, search_params_det = _build_search_sql(cursor, search_q, "Bill_Det", "d")
            cursor.execute(
                f"""
                SELECT ISNULL(SUM(CAST(m.namt AS FLOAT)), 0) AS GrandTotal
                FROM Bill_Det d
                INNER JOIN Bill_Mas m ON d.invno = m.invno
                WHERE ISNULL(m.deleted, 0) = 0
                  AND ISNULL(d.deleted, 0) = 0
                  AND ISNULL(m.btype, '') NOT IN ({excluded_btypes})
                  AND CAST(m.invdt AS DATE) BETWEEN ? AND ?
                  {btype_cond}
                  {search_sql_det}
                """,
                (start_date, end_date) + btype_p + tuple(search_params_det),
            )
        else:
            btype_cond = " AND LTRIM(RTRIM(ISNULL(btype, N''))) = ?" if btype_p else ""
            cursor.execute(
                f"""
                SELECT ISNULL(SUM(CAST(namt AS FLOAT)), 0) AS GrandTotal
                FROM Bill_Mas
                WHERE ISNULL(deleted, 0) = 0
                  AND ISNULL(btype, '') NOT IN ({excluded_btypes})
                  AND CAST(invdt AS DATE) BETWEEN ? AND ?
                  {btype_cond}
                """,
                (start_date, end_date) + btype_p,
            )
        row = cursor.fetchone()
        grand_total = float(row[0] or 0) if row else 0.0
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "grand_total": grand_total
    })


@api_view(["GET"])
def sales_analysis_summary_strip(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    btype_filter = (request.GET.get("btype") or "").strip()
    btype_p = _btype_param(btype_filter)

    mas_filters = _bill_mas_filters(btype_filter=btype_filter)
    det_filters = _bill_det_join_filters(btype_filter=btype_filter)
    search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()

    top_product_name, top_product_revenue = "", 0.0
    top_customer_name, top_customer_revenue = "Unknown", 0.0
    repeat_buyers = 0

    try:
        cursor = conn.cursor()
        search_sql_det, search_params_det = _build_search_sql(cursor, search_q, "Bill_Det", "d")
        search_sql_mas, search_params_mas = _get_invoice_subquery_filter(cursor, search_q, "m")
        search_sql_mas_no_alias, search_params_mas_no_alias = _get_invoice_subquery_filter(cursor, search_q, "Bill_Mas")

        use_alias = table_exists(cursor, "CustAliasMast")

        if search_q:
            cursor.execute(
                f"""
                SELECT
                    ISNULL(SUM(CAST(d.amt AS FLOAT)), 0),
                    COUNT(DISTINCT m.invno),
                    COUNT(DISTINCT m.cid)
                FROM Bill_Det d
                INNER JOIN Bill_Mas m ON d.invno = m.invno
                WHERE {det_filters} {search_sql_det}
                """,
                (start_date, end_date) + btype_p + tuple(search_params_det),
            )
        else:
            cursor.execute(
                f"""
                SELECT
                    ISNULL(SUM(tamt), 0),
                    COUNT(DISTINCT invno),
                    COUNT(DISTINCT cid)
                FROM Bill_Mas
                WHERE {mas_filters}
                """,
                (start_date, end_date) + btype_p,
            )

        mas_row = cursor.fetchone()
        grand_total = float(mas_row[0] or 0) if mas_row else 0.0
        total_invoices = int(mas_row[1] or 0) if mas_row else 0
        customers = int(mas_row[2] or 0) if mas_row else 0

        qty_kgs_col = find_column_ci(cursor, "dbo", "Bill_Det", ["QtyKgs", "qtykgs"])
        if qty_kgs_col:
            qty_expr = f"""ISNULL(SUM(
                CASE
                    WHEN ISNULL(CAST(d.qty AS FLOAT), 0) <> 0 THEN CAST(d.qty AS FLOAT)
                    ELSE ISNULL(CAST(d.[{qty_kgs_col}] AS FLOAT), 0)
                END
            ), 0)"""
        else:
            qty_expr = "ISNULL(SUM(CAST(d.qty AS FLOAT)), 0)"

        btype_qty_cond = _btype_cond("m", btype_filter)

        qty_excluded_btypes = (
            "'With Material Rejection', ' Raw Material Insp Rej', 'Raw Material Insp Rej', "
            "'Stores Material Insp Rej', 'Debit Note', 'Sales Return', 'Revese Charge', 'Reverse Charge'"
        )

        if search_q:
            cursor.execute(
                f"""
                SELECT {qty_expr}
                FROM Bill_Det d
                INNER JOIN Bill_Mas m ON d.invno = m.invno
                WHERE ISNULL(m.deleted, 0) = 0
                  AND ISNULL(d.deleted, 0) = 0
                  AND ISNULL(m.btype, '') NOT IN ({qty_excluded_btypes})
                  AND CAST(m.invdt AS DATE) BETWEEN ? AND ?
                  {btype_qty_cond}
                  {search_sql_det}
                """,
                (start_date, end_date) + btype_p + tuple(search_params_det),
            )
        else:
            cursor.execute(
                f"""
                SELECT {qty_expr}
                FROM Bill_Det d
                INNER JOIN Bill_Mas m ON d.invno = m.invno
                WHERE ISNULL(m.deleted, 0) = 0
                  AND ISNULL(d.deleted, 0) = 0
                  AND ISNULL(m.btype, '') NOT IN ({qty_excluded_btypes})
                  AND CAST(m.invdt AS DATE) BETWEEN ? AND ?
                  {btype_qty_cond}
                """,
                (start_date, end_date) + btype_p,
            )

        qty_row = cursor.fetchone()
        total_qty_sold = float(qty_row[0] or 0) if qty_row else 0.0

        if search_q:
            cursor.execute(
                f"""
                SELECT COUNT(*)
                FROM (
                    SELECT m.cid
                    FROM Bill_Det d
                    INNER JOIN Bill_Mas m ON d.invno = m.invno
                    WHERE {det_filters} {search_sql_det}
                    GROUP BY m.cid
                    HAVING COUNT(DISTINCT m.invno) > 1
                ) rb
                """,
                (start_date, end_date) + btype_p + tuple(search_params_det),
            )
        else:
            cursor.execute(
                f"""
                SELECT COUNT(*)
                FROM (
                    SELECT cid
                    FROM Bill_Mas
                    WHERE {mas_filters}
                    GROUP BY cid
                    HAVING COUNT(DISTINCT invno) > 1
                ) rb
                """,
                (start_date, end_date) + btype_p,
            )

        rb_row = cursor.fetchone()
        repeat_buyers = int(rb_row[0] or 0) if rb_row else 0

        try:
            top_product_name, top_product_revenue = _fetch_top_product(
                cursor, start_date, end_date, search_q, btype_filter
            )
        except Exception:
            pass

        try:
            top_customer_name, top_customer_revenue = _fetch_top_customer(
                cursor, start_date, end_date, use_alias, search_q, btype_filter
            )
        except Exception:
            pass

        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    avg_invoice = round(grand_total / total_invoices, 2) if total_invoices else 0.0
    turn_over_lakhs = round(grand_total / 100_000, 3)
    avg_selling_rate = round(grand_total / total_qty_sold, 2) if total_qty_sold else 0.0

    return Response({
        "company": tenant.get("company_name", ""),
        "from": str(start_date),
        "to": str(end_date),
        "period": format_period_label(start_date, end_date),
        "grand_total": grand_total,
        "total_invoices": total_invoices,
        "customers": customers,
        "total_qty_sold": total_qty_sold,
        "avg_invoice": avg_invoice,
        "turn_over_lakhs": turn_over_lakhs,
        "total_sales_value": grand_total,
        "active_customers": customers,
        "repeat_buyers": repeat_buyers,
        "top_product_name": top_product_name,
        "top_product_revenue": top_product_revenue,
        "top_product_revenue_lakhs": int(top_product_revenue / 100) / 1000.0,
        "top_product_pct": _pct(top_product_revenue, grand_total),
        "top_customer_name": top_customer_name,
        "top_customer_revenue": top_customer_revenue,
        "top_customer_revenue_lakhs": round(top_customer_revenue / 100_000, 3),
        "top_customer_pct": _pct(top_customer_revenue, grand_total),
        "avg_selling_rate": avg_selling_rate,
    })


_WEEK_OF_MONTH_CASE = """
    CASE
        WHEN DAY(CAST(invdt AS DATE)) BETWEEN 1 AND 7 THEN 1
        WHEN DAY(CAST(invdt AS DATE)) BETWEEN 8 AND 14 THEN 2
        WHEN DAY(CAST(invdt AS DATE)) BETWEEN 15 AND 21 THEN 3
        WHEN DAY(CAST(invdt AS DATE)) BETWEEN 22 AND 28 THEN 4
        ELSE 5
    END
"""


def _week_bounds(year, month, week_num):
    _, last_day = monthrange(year, month)
    if week_num == 5:
        if last_day < 29:
            return None
        return date(year, month, 29), date(year, month, last_day)
    starts = {1: 1, 2: 8, 3: 15, 4: 22}
    ends = {1: 7, 2: 14, 3: 21, 4: 28}
    return date(year, month, starts[week_num]), date(year, month, min(ends[week_num], last_day))


def _weekly_chart_slots(start_date, end_date):
    labels = []
    keys = []
    year, month = start_date.year, start_date.month
    while date(year, month, 1) <= end_date:
        for week_num in range(1, 6):
            bounds = _week_bounds(year, month, week_num)
            if not bounds:
                continue
            w_start, w_end = bounds
            if w_end < start_date or w_start > end_date:
                continue
            labels.append(f"W{week_num} {_MONTH_ABB[month - 1]}")
            keys.append((year, month, week_num))
        if month == 12:
            year, month = year + 1, 1
        else:
            month += 1
    return labels, keys


@api_view(["GET"])
def sales_analysis_weekly_trend(request):
    """Weekly sales (SUM tamt) per month-week bucket for the selected date range."""
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    btype_filter = (request.GET.get("btype") or "").strip()
    btype_p = _btype_param(btype_filter)
    labels, keys = _weekly_chart_slots(start_date, end_date)
    sales_map = {k: 0.0 for k in keys}

    if not keys:
        return Response({
            "period": format_period_label(start_date, end_date),
            "labels": [],
            "sales": [],
            "cumulative": [],
            "total": 0,
            "turn_over_lakhs": 0,
        })

    mas_filters = _bill_mas_filters(btype_filter=btype_filter)
    det_filters = _bill_det_join_filters(btype_filter=btype_filter)
    week_case = _WEEK_OF_MONTH_CASE
    search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()

    try:
        cursor = conn.cursor()
        search_sql, search_params = _build_search_sql(cursor, search_q, "Bill_Det", "d")
        if search_q:
            cursor.execute(
                f"""
                SELECT
                    YEAR(CAST(m.invdt AS DATE)) AS yr,
                    MONTH(CAST(m.invdt AS DATE)) AS mo,
                    {_WEEK_OF_MONTH_CASE.replace("invdt", "m.invdt")} AS wk,
                    ISNULL(SUM(CAST(d.amt AS FLOAT)), 0) AS sales
                FROM Bill_Det d
                INNER JOIN Bill_Mas m ON d.invno = m.invno
                WHERE {det_filters} {search_sql}
                GROUP BY
                    YEAR(CAST(m.invdt AS DATE)),
                    MONTH(CAST(m.invdt AS DATE)),
                    {_WEEK_OF_MONTH_CASE.replace("invdt", "m.invdt")}
                ORDER BY yr, mo, wk
                """,
                (start_date, end_date) + btype_p + tuple(search_params),
            )
        else:
            cursor.execute(
                f"""
                SELECT
                    YEAR(CAST(invdt AS DATE)) AS yr,
                    MONTH(CAST(invdt AS DATE)) AS mo,
                    {week_case} AS wk,
                    ISNULL(SUM(CAST(tamt AS FLOAT)), 0) AS sales
                FROM Bill_Mas
                WHERE {mas_filters}
                GROUP BY
                    YEAR(CAST(invdt AS DATE)),
                    MONTH(CAST(invdt AS DATE)),
                    {week_case}
                ORDER BY yr, mo, wk
                """,
                (start_date, end_date) + btype_p,
            )
        for yr, mo, wk, sales in cursor.fetchall():
            key = (int(yr), int(mo), int(wk))
            if key in sales_map:
                sales_map[key] = float(sales or 0)
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    sales = [round(sales_map[k], 2) for k in keys]
    cumulative = []
    running = 0.0
    for val in sales:
        running += val
        cumulative.append(round(running, 2))
    total = round(running, 2)

    return Response({
        "company": tenant.get("company_name", ""),
        "from": str(start_date),
        "to": str(end_date),
        "period": format_period_label(start_date, end_date),
        "labels": labels,
        "sales": sales,
        "cumulative": cumulative,
        "total": total,
        "turn_over_lakhs": round(total / 100_000, 2),
    })


def _bill_det_partno_expr(cursor, det_alias="d"):
    """Bill_Det part number only (PrINTPartNO / partno column — no icode fallback)."""
    col = find_column_ci(
        cursor, "dbo", "Bill_Det",
        ["PrINTPartNO", "PRINTPARTNO", "partno", "PartNo", "PARTNO", "Part_No"],
    )
    if not col:
        return None, None
    expr = f"LTRIM(RTRIM(ISNULL(CAST({det_alias}.[{col}] AS NVARCHAR(200)), N'')))"
    return expr, col


import math

def _customer_ranking(cust_rows, total_revenue, top_n=5):
    """Top customers by revenue for the ranking bar list."""
    ranking = []
    for row in cust_rows[:top_n]:
        name = (row[0] or "").strip() or "Unknown"
        revenue = float(row[1] or 0)
        ranking.append({
            "name": name,
            "revenue": revenue,
            "revenue_lakhs": round(revenue / 100_000, 3),
            "pct": _pct(revenue, total_revenue),
        })
    return ranking


def _pie_slices(rows, total, label_key=0, value_key=1, top_n=None, others_label="Others"):
    """Build labels + share % from ranked rows; optional Others bucket. Ensures percentages sum to exactly 100.0%."""
    if not total or total <= 0:
        return [], []
    ranked = [(str(r[label_key] or "").strip() or "Unknown", float(r[value_key] or 0)) for r in rows]
    if top_n is not None:
        head = ranked[:top_n]
        if others_label:
            tail_sum = sum(v for _, v in ranked[top_n:])
            if tail_sum > 0:
                head.append((others_label, tail_sum))
        ranked = head
    labels = [x[0] for x in ranked]
    values = [max(0.0, v) for _, v in ranked]
    val_sum = sum(values)
    if val_sum <= 0 or not values:
        return labels, [0.0] * len(labels)

    raw_tenths = [(v / val_sum) * 1000.0 for v in values]
    floors = [math.floor(r) for r in raw_tenths]
    diff = 1000 - sum(floors)

    remainders = [(raw_tenths[i] - floors[i], i) for i in range(len(values))]
    remainders.sort(key=lambda x: x[0], reverse=True)

    if diff > 0:
        for k in range(min(diff, len(values))):
            idx = remainders[k][1]
            floors[idx] += 1
    elif diff < 0:
        remainders_asc = sorted(remainders, key=lambda x: x[0])
        for k in range(min(abs(diff), len(values))):
            idx = remainders_asc[k][1]
            floors[idx] = max(0, floors[idx] - 1)

    pcts = [round(f / 10.0, 1) for f in floors]
    return labels, pcts


@api_view(["GET"])
def sales_analysis_revenue_charts(request):
    """
    Donut data for Sales Analysis:
      - customer: top 4 by SUM(tamt) + Others (% of revenue)
      - product: top 5 part numbers by SUM(qty) (% of total qty)
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    btype_filter = (request.GET.get("btype") or "").strip()
    btype_p = _btype_param(btype_filter)

    mas_filters = _bill_mas_filters("m", btype_filter=btype_filter)
    det_filters = _bill_det_join_filters(btype_filter=btype_filter)
    search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()

    try:
        cursor = conn.cursor()
        search_sql, search_params = _build_search_sql(cursor, search_q, "Bill_Det", "d")
        use_alias = table_exists(cursor, "CustAliasMast")
        name_expr = _cust_name_expr(use_alias)
        join_sql = _cust_join_sql(use_alias)

        if search_q:
            cursor.execute(
                f"""
                SELECT
                    {name_expr} AS customer_name,
                    ISNULL(SUM(CAST(d.amt AS FLOAT)), 0) AS revenue
                FROM Bill_Det d
                INNER JOIN Bill_Mas m ON d.invno = m.invno
                {join_sql}
                WHERE {det_filters} {search_sql}
                GROUP BY m.cid, {name_expr}
                ORDER BY revenue DESC
                """,
                (start_date, end_date) + btype_p + tuple(search_params),
            )
        else:
            cursor.execute(
                f"""
                SELECT
                    {name_expr} AS customer_name,
                    ISNULL(SUM(CAST(m.tamt AS FLOAT)), 0) AS revenue
                FROM Bill_Mas m
                {join_sql}
                WHERE {mas_filters}
                GROUP BY m.cid, {name_expr}
                ORDER BY revenue DESC
                """,
                (start_date, end_date) + btype_p,
            )
        cust_rows = cursor.fetchall()
        total_revenue = sum(float(r[1] or 0) for r in cust_rows)
        cust_labels, cust_pcts = _pie_slices(
            cust_rows, total_revenue, label_key=0, value_key=1, top_n=4,
        )
        customer_ranking = _customer_ranking(cust_rows, total_revenue, top_n=None)

        part_key, part_col_name = _bill_det_partno_expr(cursor, "d")
        missing_partno_by_btype = []
        prod_labels, prod_pcts = [], []

        if part_key:
            cursor.execute(
                f"""
                SELECT ISNULL(SUM(CAST(d.qty AS FLOAT)), 0)
                FROM Bill_Det d
                INNER JOIN Bill_Mas m ON d.invno = m.invno
                WHERE {det_filters} {search_sql}
                  AND NULLIF({part_key}, N'') IS NOT NULL
                """,
                (start_date, end_date) + btype_p + tuple(search_params),
            )
            tqty_row = cursor.fetchone()
            total_qty = float(tqty_row[0] or 0) if tqty_row else 0.0

            cursor.execute(
                f"""
                SELECT TOP 5
                    {part_key} AS part_no,
                    ISNULL(SUM(CAST(d.qty AS FLOAT)), 0) AS qty
                FROM Bill_Det d
                INNER JOIN Bill_Mas m ON d.invno = m.invno
                WHERE {det_filters} {search_sql}
                  AND NULLIF({part_key}, N'') IS NOT NULL
                GROUP BY {part_key}
                ORDER BY qty DESC
                """,
                (start_date, end_date) + btype_p + tuple(search_params),
            )
            prod_rows = cursor.fetchall()
            prod_labels, prod_pcts = _pie_slices(
                prod_rows, total_qty, label_key=0, value_key=1, top_n=5, others_label=None,
            )

            cursor.execute(
                f"""
                SELECT
                    LTRIM(RTRIM(ISNULL(m.btype, N''))) AS btype,
                    ISNULL(SUM(CAST(d.qty AS FLOAT)), 0) AS qty,
                    COUNT(*) AS line_count
                FROM Bill_Det d
                INNER JOIN Bill_Mas m ON d.invno = m.invno
                WHERE {det_filters} {search_sql}
                  AND NULLIF({part_key}, N'') IS NULL
                GROUP BY LTRIM(RTRIM(ISNULL(m.btype, N'')))
                HAVING ISNULL(SUM(CAST(d.qty AS FLOAT)), 0) > 0
                ORDER BY qty DESC
                """,
                (start_date, end_date) + btype_p + tuple(search_params),
            )
            missing_partno_by_btype = [
                {
                    "btype": (row[0] or "").strip() or "(blank btype)",
                    "qty": round(float(row[1] or 0), 2),
                    "line_count": int(row[2] or 0),
                }
                for row in cursor.fetchall()
            ]

        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "period": format_period_label(start_date, end_date),
        "customer": {
            "labels": cust_labels,
            "percentages": cust_pcts,
        },
        "customer_ranking": customer_ranking,
        "product": {
            "labels": prod_labels,
            "percentages": prod_pcts,
            "partno_column": part_col_name or "",
            "missing_partno_by_btype": missing_partno_by_btype,
        },
    })


_MONTH_FULL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

_INVOICE_STATUS_GROUPS = (
    {
        "key": "with_material",
        "label": "With Material",
        "btypes": (
            "With Material",
            "Debit Note",
            "Credit Note",
            "General / Rework",
            "With Material Rejection",
            "Scrap",
        ),
        "bg": "#dbeafe",
        "fg": "#1d4ed8",
        "vfg": "#1e3a8a",
    },
    {
        "key": "labour_charges",
        "label": "Labour Charges",
        "btypes": (
            "Labour Charges",
            "General Labour",
        ),
        "bg": "#fef9c3",
        "fg": "#92400e",
        "vfg": "#78350f",
    },
    {
        "key": "export_only",
        "label": "Export Only",
        "btypes": (
            "Export Invoice",
        ),
        "bg": "#dcfce7",
        "fg": "#15803d",
        "vfg": "#14532d",
    },
)


def _months_in_range(start_date, end_date):
    """Calendar months from start_date through end_date (inclusive)."""
    slots = []
    year, month = start_date.year, start_date.month
    while date(year, month, 1) <= end_date:
        slots.append((year, month))
        if month == 12:
            year, month = year + 1, 1
        else:
            month += 1
    return slots


def _growth_pct(current, previous):
    if previous is None or previous == 0:
        return None
    return round(((float(current) - float(previous)) / float(previous)) * 100, 1)


def _build_invoice_status_groups(btype_counts):
    """Map btype → invoice count into the three display groups."""
    normalized = {}
    for btype, count in btype_counts.items():
        key = (btype or "").strip()
        normalized[key] = normalized.get(key, 0) + int(count or 0)

    groups = []
    for spec in _INVOICE_STATUS_GROUPS:
        items = []
        group_total = 0
        for btype in spec["btypes"]:
            cnt = normalized.get(btype, 0)
            items.append({"btype": btype, "count": cnt})
            group_total += cnt
        groups.append({
            "key": spec["key"],
            "label": spec["label"],
            "total": group_total,
            "items": items,
            "bg": spec["bg"],
            "fg": spec["fg"],
            "vfg": spec["vfg"],
        })
    return groups


@api_view(["GET"])
def sales_analysis_month_summary(request):
    """
    Month-wise sales table + invoice counts by btype group for the selected date range.
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    btype_filter = (request.GET.get("btype") or "").strip()
    btype_p = _btype_param(btype_filter)

    mas_filters = _bill_mas_filters(btype_filter=btype_filter)
    inv_status_filters = _bill_mas_filters_invoice_status()
    if btype_p:
        inv_status_filters += " AND LTRIM(RTRIM(ISNULL(btype, N''))) = ?"

    det_filters = _bill_det_join_filters(btype_filter=btype_filter)
    month_slots = _months_in_range(start_date, end_date)

    mas_by_month = {}
    qty_by_month = {}
    btype_counts = {}
    search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()

    try:
        cursor = conn.cursor()
        search_sql, search_params = _build_search_sql(cursor, search_q, "Bill_Det", "d")

        if search_q:
            cursor.execute(
                f"""
                SELECT
                    YEAR(CAST(m.invdt AS DATE)) AS yr,
                    MONTH(CAST(m.invdt AS DATE)) AS mo,
                    COUNT(DISTINCT m.invno) AS invoices,
                    ISNULL(SUM(CAST(d.amt AS FLOAT)), 0) AS amount
                FROM Bill_Det d
                INNER JOIN Bill_Mas m ON d.invno = m.invno
                WHERE {det_filters} {search_sql}
                GROUP BY YEAR(CAST(m.invdt AS DATE)), MONTH(CAST(m.invdt AS DATE))
                """,
                (start_date, end_date) + btype_p + tuple(search_params),
            )
        else:
            cursor.execute(
                f"""
                SELECT
                    YEAR(CAST(invdt AS DATE)) AS yr,
                    MONTH(CAST(invdt AS DATE)) AS mo,
                    COUNT(DISTINCT invno) AS invoices,
                    ISNULL(SUM(CAST(tamt AS FLOAT)), 0) AS amount
                FROM Bill_Mas
                WHERE {mas_filters}
                GROUP BY YEAR(CAST(invdt AS DATE)), MONTH(CAST(invdt AS DATE))
                """,
                (start_date, end_date) + btype_p,
            )
        for yr, mo, invoices, amount in cursor.fetchall():
            mas_by_month[(int(yr), int(mo))] = {
                "invoices": int(invoices or 0),
                "amount": float(amount or 0),
            }

        cursor.execute(
            f"""
            SELECT
                YEAR(CAST(m.invdt AS DATE)) AS yr,
                MONTH(CAST(m.invdt AS DATE)) AS mo,
                ISNULL(SUM(CAST(d.qty AS FLOAT)), 0) AS qty
            FROM Bill_Det d
            INNER JOIN Bill_Mas m ON d.invno = m.invno
            WHERE {det_filters} {search_sql}
            GROUP BY YEAR(CAST(m.invdt AS DATE)), MONTH(CAST(m.invdt AS DATE))
            """,
            (start_date, end_date) + btype_p + tuple(search_params),
        )
        for yr, mo, qty in cursor.fetchall():
            qty_by_month[(int(yr), int(mo))] = float(qty or 0)

        inv_status_filters_m = _bill_mas_filters_invoice_status("m")
        if btype_p:
            inv_status_filters_m += " AND LTRIM(RTRIM(ISNULL(m.btype, N''))) = ?"

        if search_q:
            cursor.execute(
                f"""
                SELECT
                    LTRIM(RTRIM(ISNULL(m.btype, N''))) AS btype,
                    COUNT(DISTINCT m.invno) AS inv_count
                FROM Bill_Det d
                INNER JOIN Bill_Mas m ON d.invno = m.invno
                WHERE {inv_status_filters_m} {search_sql}
                GROUP BY LTRIM(RTRIM(ISNULL(m.btype, N'')))
                """,
                (start_date, end_date) + btype_p + tuple(search_params),
            )
        else:
            cursor.execute(
                f"""
                SELECT
                    LTRIM(RTRIM(ISNULL(btype, N''))) AS btype,
                    COUNT(DISTINCT invno) AS inv_count
                FROM Bill_Mas
                WHERE {inv_status_filters}
                GROUP BY LTRIM(RTRIM(ISNULL(btype, N'')))
                """,
                (start_date, end_date) + btype_p,
            )
        for btype, inv_count in cursor.fetchall():
            btype_counts[(btype or "").strip()] = int(inv_count or 0)

        sales_return_count = btype_counts.pop("Sales Return", 0)

        credit_match = _credit_note_match_sql("m") if search_q else _credit_note_match_sql()
        if search_q:
            cursor.execute(
                f"""
                SELECT COUNT(DISTINCT m.invno)
                FROM Bill_Det d
                INNER JOIN Bill_Mas m ON d.invno = m.invno
                WHERE {inv_status_filters_m}
                  AND {credit_match} {search_sql}
                """,
                (start_date, end_date) + btype_p + tuple(search_params),
            )
        else:
            cursor.execute(
                f"""
                SELECT COUNT(DISTINCT invno)
                FROM Bill_Mas
                WHERE {inv_status_filters}
                  AND {credit_match}
                """,
                (start_date, end_date) + btype_p,
            )
        cn_row = cursor.fetchone()
        credit_note_count = int(cn_row[0] or 0) if cn_row else 0
        existing_cn = sum(
            v for k, v in btype_counts.items()
            if k != "Credit Note" and "credit" in k.lower() and "note" in k.lower()
        )
        for key in list(btype_counts.keys()):
            if key != "Credit Note" and "credit" in key.lower() and "note" in key.lower():
                del btype_counts[key]
        btype_counts["Credit Note"] = max(credit_note_count, existing_cn, sales_return_count)

        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    rows = []
    prev_amount = None
    total_invoices = 0
    total_qty = 0.0
    total_amount = 0.0

    for yr, mo in month_slots:
        key = (yr, mo)
        mas = mas_by_month.get(key, {"invoices": 0, "amount": 0.0})
        qty = qty_by_month.get(key, 0.0)
        amount = mas["amount"]
        growth = _growth_pct(amount, prev_amount)
        prev_amount = amount

        rows.append({
            "month": f"{_MONTH_FULL[mo - 1]} {yr}",
            "invoices": mas["invoices"],
            "qty_sold": round(qty, 2),
            "amount": round(amount, 2),
            "growth_pct": growth,
        })
        total_invoices += mas["invoices"]
        total_qty += qty
        total_amount += amount

    return Response({
        "company": tenant.get("company_name", ""),
        "from": str(start_date),
        "to": str(end_date),
        "period": format_period_label(start_date, end_date),
        "rows": rows,
        "totals": {
            "invoices": total_invoices,
            "qty_sold": round(total_qty, 2),
            "amount": round(total_amount, 2),
        },
        "invoice_status": _build_invoice_status_groups(btype_counts),
    })


def _invoice_cust_join_sql(use_alias, bm_alias="BM"):
    join = (
        f"LEFT JOIN CustMast CM ON "
        f"LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CM.Id, N'')))) "
        f"= LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL({bm_alias}.cid, N''))))"
    )
    if use_alias:
        join += (
            f" LEFT JOIN CustAliasMast CAM ON "
            f"LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CAM.Id, N'')))) "
            f"= LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL({bm_alias}.cid, N''))))"
        )
    return join


def _invoice_cust_name_expr(use_alias):
    if use_alias:
        return (
            "LTRIM(RTRIM(ISNULL("
            "NULLIF(LTRIM(RTRIM(ISNULL(CM.CName, N''))), N''), "
            "NULLIF(LTRIM(RTRIM(ISNULL(CAM.CName, N''))), N'')"
            ")))"
        )
    return "LTRIM(RTRIM(ISNULL(CM.CName, N'')))"


@api_view(["GET"])
def sales_analysis_invoice_details(request):
    """
    Invoice line details for Sales Analysis (Bill_Mas + Bill_Det).
    Optional ?btype= filters Bill_Mas.btype within the date range.
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    btype_filter = (request.GET.get("btype") or "").strip()

    search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()

    try:
        cursor = conn.cursor()
        search_sql_det, search_params_det = _build_search_sql(cursor, search_q, "Bill_Det", "BD")
        search_sql_d, search_params_d = _build_search_sql(cursor, search_q, "Bill_Det", "d")

        base_where = (
            "ISNULL(BM.deleted, 0) = 0 "
            "AND ISNULL(BD.deleted, 0) = 0 "
            f"AND ISNULL(BM.btype, '') NOT IN ({EXCLUDED_BTYPES_SQL}) "
            "AND CAST(BM.invdt AS DATE) BETWEEN ? AND ?"
        )
        params: list = [start_date, end_date]
        if btype_filter and btype_filter.lower() not in ("all", ""):
            base_where += " AND LTRIM(RTRIM(ISNULL(BM.btype, N''))) = ?"
            params.append(btype_filter)

        if search_q:
            base_where += search_sql_det
            params.extend(search_params_det)

        use_alias = table_exists(cursor, "CustAliasMast")
        cust_expr = _invoice_cust_name_expr(use_alias)
        join_sql = _invoice_cust_join_sql(use_alias)

        if search_q:
            cursor.execute(
                f"""
                SELECT DISTINCT LTRIM(RTRIM(ISNULL(m.btype, N''))) AS btype
                FROM Bill_Det d
                INNER JOIN Bill_Mas m ON d.invno = m.invno
                WHERE ISNULL(m.deleted, 0) = 0
                  AND ISNULL(d.deleted, 0) = 0
                  AND ISNULL(m.btype, '') NOT IN ({EXCLUDED_BTYPES_SQL})
                  AND CAST(m.invdt AS DATE) BETWEEN ? AND ?
                  AND LTRIM(RTRIM(ISNULL(m.btype, N''))) <> N''
                  {search_sql_d}
                ORDER BY btype
                """,
                (start_date, end_date) + tuple(search_params_d),
            )
        else:
            cursor.execute(
                f"""
                SELECT DISTINCT LTRIM(RTRIM(ISNULL(btype, N''))) AS btype
                FROM Bill_Mas
                WHERE ISNULL(deleted, 0) = 0
                  AND ISNULL(btype, '') NOT IN ({EXCLUDED_BTYPES_SQL})
                  AND CAST(invdt AS DATE) BETWEEN ? AND ?
                  AND LTRIM(RTRIM(ISNULL(btype, N''))) <> N''
                ORDER BY btype
                """,
                (start_date, end_date),
            )
        btypes = [(row[0] or "").strip() for row in cursor.fetchall() if (row[0] or "").strip()]

        qty_kgs_col_bd = find_column_ci(cursor, "dbo", "Bill_Det", ["QtyKgs", "qtykgs"])
        if qty_kgs_col_bd:
            qty_col_expr = f"""CASE
                    WHEN ISNULL(CAST(BD.qty AS FLOAT), 0) <> 0 THEN CAST(BD.qty AS FLOAT)
                    ELSE ISNULL(CAST(BD.[{qty_kgs_col_bd}] AS FLOAT), 0)
                END"""
        else:
            qty_col_expr = "ISNULL(CAST(BD.qty AS FLOAT), 0)"

        cursor.execute(
            f"""
            SELECT
                BM.invno AS invoice_no,
                CAST(BM.invdt AS DATE) AS inv_date,
                {cust_expr} AS customer,
                LTRIM(RTRIM(ISNULL(BD.itcode, N''))) AS part_no,
                LTRIM(RTRIM(ISNULL(BD.itdesc, N''))) AS description,
                {qty_col_expr} AS qty,
                LTRIM(RTRIM(ISNULL(BD.uom, N''))) AS uom,
                ISNULL(CAST(BD.rate AS FLOAT), 0) AS rate,
                ISNULL(CAST(BD.amt AS FLOAT), 0) AS amount,
                LTRIM(RTRIM(ISNULL(BM.einvno, N''))) AS e_invoice,
                LTRIM(RTRIM(ISNULL(BM.btype, N''))) AS btype,
                ISNULL(BT.total_tax, 0) AS tax,
                ISNULL(CAST(BM.tamt AS FLOAT), 0) AS tamt
            FROM Bill_Mas BM
            INNER JOIN Bill_Det BD ON BM.invno = BD.invno
            {join_sql}
            LEFT JOIN (
                SELECT invno, SUM(ISNULL(txamt, 0)) AS total_tax
                FROM Bill_Tax
                WHERE ISNULL(deleted, 0) = 0
                GROUP BY invno
            ) BT ON BM.invno = BT.invno
            WHERE {base_where}
            ORDER BY BM.invdt DESC, BM.invno DESC
            """,
            params,
        )
        rows = []
        inv_nos = set()
        for row in cursor.fetchall():
            inv_no = (row[0] or "").strip()
            if inv_no:
                inv_nos.add(inv_no)
            inv_date = row[1]
            rows.append({
                "invoice_no": inv_no,
                "date": inv_date.isoformat() if hasattr(inv_date, "isoformat") else str(inv_date or ""),
                "customer": (row[2] or "").strip() or "—",
                "part_no": (row[3] or "").strip(),
                "description": (row[4] or "").strip(),
                "qty": float(row[5] or 0),
                "uom": (row[6] or "").strip(),
                "rate": float(row[7] or 0),
                "amount": float(row[8] or 0),
                "e_invoice": (row[9] or "").strip(),
                "btype": (row[10] or "").strip(),
                "tax": float(row[11] or 0),
                "tamt": float(row[12] or 0),
            })

        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    sorted_inv = sorted(inv_nos)
    if len(sorted_inv) >= 2:
        invoice_range = f"{sorted_inv[0]} – {sorted_inv[-1]}"
    elif len(sorted_inv) == 1:
        invoice_range = sorted_inv[0]
    else:
        invoice_range = ""

    return Response({
        "company": tenant.get("company_name", ""),
        "from": str(start_date),
        "to": str(end_date),
        "period": format_period_label(start_date, end_date),
        "btypes": btypes,
        "rows": rows,
        "total_invoices": len(inv_nos),
        "invoice_range": invoice_range,
    })


@api_view(["GET"])
def sales_analysis_top_products(request):
    """Top 5 products by SUM(Bill_Det.amt) in the selected date range (lakhs)."""
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    btype_filter = (request.GET.get("btype") or "").strip()
    btype_p = _btype_param(btype_filter)
    det_filters = _bill_det_join_filters(btype_filter=btype_filter)
    search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()

    try:
        cursor = conn.cursor()
        search_sql, search_params = _build_search_sql(cursor, search_q, "Bill_Det", "d")
        qty_kgs_col_tp = find_column_ci(cursor, "dbo", "Bill_Det", ["QtyKgs", "qtykgs"])
        if qty_kgs_col_tp:
            qty_tp_expr = f"""ISNULL(SUM(
                CASE
                    WHEN ISNULL(CAST(d.qty AS FLOAT), 0) <> 0 THEN CAST(d.qty AS FLOAT)
                    ELSE ISNULL(CAST(d.[{qty_kgs_col_tp}] AS FLOAT), 0)
                END
            ), 0)"""
        else:
            qty_tp_expr = "ISNULL(SUM(CAST(d.qty AS FLOAT)), 0)"

        cursor.execute(
            f"""
            SELECT
                LTRIM(RTRIM(ISNULL(d.itcode, N''))) AS part_no,
                MAX(LTRIM(RTRIM(ISNULL(d.itdesc, N'')))) AS description,
                MAX(LTRIM(RTRIM(ISNULL(d.uom, N'')))) AS uom,
                {qty_tp_expr} AS qty,
                ISNULL(SUM(CAST(d.amt AS FLOAT)), 0) AS revenue
            FROM Bill_Det d
            INNER JOIN Bill_Mas m ON d.invno = m.invno
            WHERE {det_filters} {search_sql}
              AND NULLIF(LTRIM(RTRIM(ISNULL(d.itcode, N''))), N'') IS NOT NULL
            GROUP BY LTRIM(RTRIM(ISNULL(d.itcode, N'')))
            ORDER BY revenue DESC
            """,
            (start_date, end_date) + btype_p + tuple(search_params),
        )
        products = []
        for row in cursor.fetchall():
            part_no = (row[0] or "").strip()
            description = (row[1] or "").strip()
            uom = (row[2] or "").strip()
            qty = float(row[3] or 0)
            revenue = float(row[4] or 0)
            products.append({
                "part_no": part_no,
                "description": description or part_no,
                "uom": uom,
                "qty": round(qty, 2),
                "revenue": round(revenue, 2),
                "revenue_lakhs": round(revenue / 100_000, 2),
            })
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "company": tenant.get("company_name", ""),
        "from": str(start_date),
        "to": str(end_date),
        "period": format_period_label(start_date, end_date),
        "products": products,
    })


# ══════════════════════════════════════════════════════════════════════════════
# Monthly Performance & Bill Type Analytics — Bar View Charts
# ══════════════════════════════════════════════════════════════════════════════


@api_view(["GET"])
def sales_analysis_monthly_sales_trend(request):
    """
    Monthly Sales Trend (Value) — Bar chart data.

    Returns month-wise SUM(Bill_Det.amt) from valid non-deleted Bill_Mas invoices
    excluding invalid btypes for the selected date range.
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    btype_filter = (request.GET.get("btype") or "").strip()
    btype_p = _btype_param(btype_filter)
    btype_sql = " AND LTRIM(RTRIM(ISNULL(BM.btype, N''))) = ?" if btype_p else ""
    search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()

    try:
        cursor = conn.cursor()
        search_sql, search_params = _build_search_sql(cursor, search_q, "Bill_Det", "BD")
        cursor.execute(
            f"""
            SELECT
                DATENAME(MONTH, BM.invdt)   AS MonthName,
                MONTH(BM.invdt)             AS MonthNo,
                YEAR(BM.invdt)              AS YearNo,
                ISNULL(SUM(CAST(BD.amt AS FLOAT)), 0) AS SalesValue
            FROM Bill_Det AS BD
            INNER JOIN Bill_Mas AS BM ON BD.invno = BM.invno
            WHERE
                ISNULL(BD.deleted, 0) = 0
                AND ISNULL(BM.deleted, 0) = 0
                AND ISNULL(BM.btype, '') NOT IN ({EXCLUDED_BTYPES_SQL})
                AND CAST(BM.invdt AS DATE) BETWEEN ? AND ?
                {btype_sql}
                {search_sql}
            GROUP BY
                YEAR(BM.invdt),
                MONTH(BM.invdt),
                DATENAME(MONTH, BM.invdt)
            ORDER BY
                YearNo,
                MonthNo
            """,
            (start_date, end_date) + btype_p + tuple(search_params),
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    # Build calendar month slots in date range
    month_slots = []
    curr = date(start_date.year, start_date.month, 1)
    limit = date(end_date.year, end_date.month, 1)
    safety = 0
    while curr <= limit and safety < 120:
        month_slots.append((curr.year, curr.month, curr.strftime("%B")))
        if curr.month == 12:
            curr = date(curr.year + 1, 1, 1)
        else:
            curr = date(curr.year, curr.month + 1, 1)
        safety += 1

    sales_by_slot = {(yr, mo): 0.0 for yr, mo, _ in month_slots}
    for row in rows:
        m_no = int(row[1] or 0)
        y_no = int(row[2] or 0) if len(row) > 3 and row[2] else 0
        val = float(row[3] or 0) if len(row) > 3 else float(row[2] or 0)
        if (y_no, m_no) in sales_by_slot:
            sales_by_slot[(y_no, m_no)] += val
        else:
            for (s_yr, s_mo) in sales_by_slot:
                if s_mo == m_no:
                    sales_by_slot[(s_yr, s_mo)] += val
                    break

    labels = [m_name for _, _, m_name in month_slots] if month_slots else [str(r[0] or "").strip() for r in rows]
    sales_values = [round(sales_by_slot[(yr, mo)], 2) for yr, mo, _ in month_slots] if month_slots else [round(float(r[2] or 0), 2) for r in rows]

    total = round(sum(sales_values), 2)

    return Response({
        "company": tenant.get("company_name", ""),
        "from": str(start_date),
        "to": str(end_date),
        "period": format_period_label(start_date, end_date),
        "labels": labels,
        "sales_values": sales_values,
        "sales_values_lakhs": [round(v / 100_000, 3) for v in sales_values],
        "total": total,
        "total_lakhs": round(total / 100_000, 3),
    })


@api_view(["GET"])
def sales_analysis_bill_type_revenue(request):
    """
    Bill Type Revenue Contribution (Month-wise) — Grouped/Stacked Bar chart data.

    Returns month-wise SUM(Bill_Mas.namt) broken down by btype for the selected date range.
    SQL mirrors:
        SELECT DATENAME(MONTH, bm.invdt), MONTH(bm.invdt), bm.btype, SUM(bm.namt)
        FROM Bill_Mas bm INNER JOIN Bill_Det bd ON bm.invno = bd.invno
        WHERE bm.deleted = 0 AND bd.deleted = 0 AND bm.invdt BETWEEN ? AND ?
        GROUP BY MONTH(bm.invdt), DATENAME(MONTH, bm.invdt), bm.btype
        ORDER BY MonthNo, bm.btype
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    btype_filter = (request.GET.get("btype") or "").strip()
    btype_p = _btype_param(btype_filter)
    btype_sql = " AND LTRIM(RTRIM(ISNULL(bm.btype, N''))) = ?" if btype_p else ""
    search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()

    try:
        cursor = conn.cursor()
        search_sql, search_params = _build_search_sql(cursor, search_q, "Bill_Det", "bd")
        if search_q:
            cursor.execute(
                f"""
                SELECT
                    DATENAME(MONTH, bm.invdt)           AS MonthName,
                    MONTH(bm.invdt)                     AS MonthNo,
                    LTRIM(RTRIM(ISNULL(bm.btype, N''))) AS BillType,
                    ISNULL(SUM(CAST(bd.amt AS FLOAT)), 0) AS NetAmount
                FROM Bill_Mas bm
                INNER JOIN Bill_Det bd ON bm.invno = bd.invno
                WHERE
                    bm.deleted = 0
                    AND bd.deleted = 0
                    AND CAST(bm.invdt AS DATE) BETWEEN ? AND ?
                    {btype_sql}
                    {search_sql}
                GROUP BY
                    MONTH(bm.invdt),
                    DATENAME(MONTH, bm.invdt),
                    bm.btype
                ORDER BY
                    MonthNo,
                    bm.btype
                """,
                (start_date, end_date) + btype_p + tuple(search_params),
            )
        else:
            cursor.execute(
                f"""
                SELECT
                    DATENAME(MONTH, bm.invdt)           AS MonthName,
                    MONTH(bm.invdt)                     AS MonthNo,
                    LTRIM(RTRIM(ISNULL(bm.btype, N''))) AS BillType,
                    ISNULL(SUM(CAST(bd.amt AS FLOAT)), 0) AS NetAmount
                FROM Bill_Mas bm
                INNER JOIN Bill_Det bd ON bm.invno = bd.invno
                WHERE
                    bm.deleted = 0
                    AND bd.deleted = 0
                    AND CAST(bm.invdt AS DATE) BETWEEN ? AND ?
                    {btype_sql}
                GROUP BY
                    MONTH(bm.invdt),
                    DATENAME(MONTH, bm.invdt),
                    bm.btype
                ORDER BY
                    MonthNo,
                    bm.btype
                """,
                (start_date, end_date) + btype_p,
            )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    # Build ordered month labels (preserving DB ORDER BY MonthNo)
    month_order = {}   # month_no -> month_name (insertion-ordered)
    btypes_set = []    # ordered list of unique btypes

    raw = []
    for row in rows:
        month_name = str(row[0] or "").strip()
        month_no   = int(row[1] or 0)
        btype      = str(row[2] or "").strip() or "(Blank)"
        net_amount = float(row[3] or 0)

        if month_no not in month_order:
            month_order[month_no] = month_name
        if btype not in btypes_set:
            btypes_set.append(btype)
        raw.append((month_no, btype, net_amount))

    # Labels in MonthNo order
    labels = [month_order[mn] for mn in sorted(month_order)]

    # Build dataset per btype: list of net amounts aligned to labels list
    month_idx = {mn: i for i, mn in enumerate(sorted(month_order))}
    datasets = {}
    for btype in btypes_set:
        datasets[btype] = [0.0] * len(labels)

    for month_no, btype, net_amount in raw:
        idx = month_idx[month_no]
        datasets[btype][idx] += net_amount

    # Round dataset values preserving precision
    datasets_list = [
        {
            "bill_type": btype,
            "data": [round(v, 2) for v in vals],
            "data_lakhs": [round(v / 100_000.0, 5) for v in vals],
        }
        for btype, vals in datasets.items()
    ]

    return Response({
        "company": tenant.get("company_name", ""),
        "from": str(start_date),
        "to": str(end_date),
        "period": format_period_label(start_date, end_date),
        "labels": labels,
        "bill_types": btypes_set,
        "datasets": datasets_list,
    })


@api_view(["GET"])
def sales_analysis_monthly_tax_trend(request):
    """
    Monthly Tax Trend (Value) — Bar chart data.

    Returns month-wise SUM(Bill_Tax.txamt) for the selected date range,
    ordered by financial-year month sequence (Apr→Mar).
    SQL mirrors:
        SELECT DATENAME(MONTH, BM.invdt), MONTH(BM.invdt),
               SUM(BT.txamt), CAST(SUM(BT.txamt)/100000.0 AS DECIMAL(10,2))
        FROM Bill_Mas BM INNER JOIN Bill_Tax BT ON BM.invno = BT.invno
        WHERE BM.deleted = 0 AND BT.deleted = 0 AND BM.invdt BETWEEN ? AND ?
        GROUP BY MONTH(BM.invdt), DATENAME(MONTH, BM.invdt)
        ORDER BY CASE MONTH ... (Apr=1 … Mar=12)
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    btype_filter = (request.GET.get("btype") or "").strip()
    btype_p = _btype_param(btype_filter)
    btype_sql = " AND LTRIM(RTRIM(ISNULL(BM.btype, N''))) = ?" if btype_p else ""
    search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()

    try:
        cursor = conn.cursor()
        search_sql, search_params = _get_invoice_subquery_filter(cursor, search_q, "BM")
        cursor.execute(
            f"""
            SELECT
                DATENAME(MONTH, BM.invdt)                                   AS MonthName,
                MONTH(BM.invdt)                                             AS MonthNo,
                ISNULL(SUM(BT.txamt), 0)                                    AS TotalTaxValue,
                CAST(ISNULL(SUM(BT.txamt), 0) / 100000.0 AS DECIMAL(10,2)) AS TaxValueLakhs
            FROM Bill_Mas BM
            INNER JOIN Bill_Tax BT ON BM.invno = BT.invno
            WHERE
                BM.deleted = 0
                AND BT.deleted = 0
                AND CAST(BM.invdt AS DATE) BETWEEN ? AND ?
                {btype_sql}
                {search_sql}
            GROUP BY
                MONTH(BM.invdt),
                DATENAME(MONTH, BM.invdt)
            ORDER BY
                CASE MONTH(BM.invdt)
                    WHEN 4  THEN 1
                    WHEN 5  THEN 2
                    WHEN 6  THEN 3
                    WHEN 7  THEN 4
                    WHEN 8  THEN 5
                    WHEN 9  THEN 6
                    WHEN 10 THEN 7
                    WHEN 11 THEN 8
                    WHEN 12 THEN 9
                    WHEN 1  THEN 10
                    WHEN 2  THEN 11
                    WHEN 3  THEN 12
                END
            """,
            (start_date, end_date) + btype_p + tuple(search_params),
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    labels       = []
    tax_values   = []
    tax_lakhs    = []

    for row in rows:
        labels.append(str(row[0] or "").strip())
        tax_values.append(round(float(row[2] or 0), 2))
        tax_lakhs.append(float(row[3] or 0))

    total = round(sum(tax_values), 2)

    return Response({
        "company": tenant.get("company_name", ""),
        "from": str(start_date),
        "to": str(end_date),
        "period": format_period_label(start_date, end_date),
        "labels": labels,
        "tax_values": tax_values,
        "tax_values_lakhs": tax_lakhs,
        "total": total,
        "total_lakhs": round(total / 100_000, 2),
    })


@api_view(["GET"])
def sales_analysis_future_projections(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)

    from collections import defaultdict
    from datetime import datetime, date
    from calendar import monthrange

    # Calculate 1-year projection window starting from selected month start date
    proj_start_date = date(start_date.year, start_date.month, 1)
    months_param = (request.GET.get("months") or "").strip()
    if months_param == "3":
        num_months = 3
    elif months_param == "6":
        num_months = 6
    elif months_param in ("12", "1y", "1"):
        num_months = 12
    else:
        num_months = 12

    end_year = proj_start_date.year + (proj_start_date.month + num_months - 1) // 12
    end_month = (proj_start_date.month + num_months - 1) % 12 + 1
    _, last_day = monthrange(end_year, end_month)
    proj_end_date = date(end_year, end_month, last_day)

    try:
        cursor = conn.cursor()
        use_alias = table_exists(cursor, "CustAliasMast")
        
        if use_alias:
            cust_name_expr = "LTRIM(RTRIM(ISNULL(NULLIF(LTRIM(RTRIM(ISNULL(cm.CName, N''))), N''), NULLIF(LTRIM(RTRIM(ISNULL(ca.CName, N''))), N''))))"
            cust_join = """
                LEFT JOIN CustMast cm ON p.cid = cm.Id
                LEFT JOIN CustAliasMast ca ON p.cid = ca.Id
            """
        else:
            cust_name_expr = "LTRIM(RTRIM(ISNULL(cm.CName, N'')))"
            cust_join = "LEFT JOIN CustMast cm ON p.cid = cm.Id"

        # 1. Fetch schedules within the selected Schedule date (shddate) range
        search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()
        search_sql_pd, search_params_pd = _build_search_sql(cursor, search_q, "In_PoDet", "pd")

        schedules_sql = f"""
        SELECT 
            s.Apono,
            s.pono,
            s.itcode AS partno,
            s.poslno,
            s.reqdate,
            s.shddate,
            s.shdQty,
            p.podt,
            {cust_name_expr} AS CustomerName,
            pd.Rate,
            ISNULL(pd.amt, 0) AS amt,
            CASE WHEN ISNULL(pd.CurrRate, 0) = 0 THEN 1 ELSE pd.CurrRate END AS CurrRate,
            ISNULL(pd.Qty, 0) AS poQty
        FROM In_PoDet_ShdQty s
        INNER JOIN In_PoMas p ON s.Apono = p.Apono
        INNER JOIN In_PoDet pd ON pd.pono = p.pono AND pd.ItCode = s.itcode AND pd.poslno = s.poslno
        {cust_join}
        WHERE ISNULL(s.deleted, 0) = 0
          AND ISNULL(p.deleted, 0) = 0
          AND ISNULL(pd.deleted, 0) = 0
          AND s.shddate IS NOT NULL
          AND CAST(s.shddate AS DATE) BETWEEN ? AND ?
          {search_sql_pd}
        ORDER BY s.reqdate ASC
        """
        cursor.execute(schedules_sql, (proj_start_date, proj_end_date) + tuple(search_params_pd))
        schedules = []
        for row in cursor.fetchall() or []:
            rate = float(row[9] or 0)
            amt = float(row[10] or 0) if len(row) > 10 else 0
            curr_rate = float(row[11] or 1) if len(row) > 11 and row[11] is not None else 1
            if curr_rate == 0:
                curr_rate = 1
            po_qty = float(row[12] or 0) if len(row) > 12 else 0

            if po_qty > 0 and amt > 0:
                effective_rate = (amt * curr_rate) / po_qty
            else:
                effective_rate = rate * curr_rate

            schedules.append({
                "apono": row[0],
                "pono": row[1],
                "partno": row[2],
                "poslno": row[3],
                "reqdate": row[4],
                "shddate": row[5],
                "shdQty": float(row[6] or 0),
                "podt": row[7],
                "customer": row[8] or "—",
                "rate": rate,
                "amt": amt,
                "currRate": curr_rate,
                "poQty": po_qty,
                "effectiveRate": effective_rate
            })

        # Schd Qty: direct from In_PoDet_ShdQty (no In_PoDet join) filtered by shddate date range
        search_sql_s, search_params_s = _build_search_sql(cursor, search_q, "In_PoDet_ShdQty", "s")
        schd_qty_sql = f"""
        SELECT
            {cust_name_expr} AS CustomerName,
            YEAR(CAST(p.podt AS DATE)) AS PoYear,
            MONTH(CAST(p.podt AS DATE)) AS PoMonth,
            YEAR(CAST(s.shddate AS DATE)) AS SchdYear,
            MONTH(CAST(s.shddate AS DATE)) AS SchdMonth,
            SUM(s.shdQty) AS SchdQty
        FROM In_PoDet_ShdQty s
        INNER JOIN In_PoMas p ON s.Apono = p.Apono
        {cust_join}
        WHERE ISNULL(s.deleted, 0) = 0
          AND ISNULL(p.deleted, 0) = 0
          AND s.shddate IS NOT NULL
          AND CAST(s.shddate AS DATE) BETWEEN ? AND ?
          {search_sql_s}
        GROUP BY
            {cust_name_expr},
            YEAR(CAST(p.podt AS DATE)),
            MONTH(CAST(p.podt AS DATE)),
            YEAR(CAST(s.shddate AS DATE)),
            MONTH(CAST(s.shddate AS DATE))
        """
        cursor.execute(schd_qty_sql, (proj_start_date, proj_end_date) + tuple(search_params_s))
        schd_qty_lookup = {}
        for row in cursor.fetchall() or []:
            cust = row[0] or "—"
            po_month = date(int(row[1]), int(row[2]), 1).strftime("%B %Y")
            schd_month = date(int(row[3]), int(row[4]), 1).strftime("%B %Y")
            schd_qty_lookup[(cust, po_month, schd_month)] = float(row[5] or 0)

        # 2. Fetch dispatches for the same Apono
        aponos = list(set(s["apono"] for s in schedules if s["apono"]))
        
        dispatches = []
        if aponos:
            search_sql_dc, search_params_dc = _build_search_sql(cursor, search_q, "DcInSubDet", "d")
            placeholders = ",".join("?" for _ in aponos)
            dispatches_sql = f"""
            SELECT d.Apono, d.partno, d.poslno, m.dcdate, d.okqty 
            FROM DcInSubDetAssmPoDet d 
            INNER JOIN DC_Mas m ON d.dcno = m.dcno 
            WHERE ISNULL(d.deleted, 0) = 0 AND d.Apono IN ({placeholders}) {search_sql_dc}
            UNION ALL 
            SELECT d.Apono, d.partno, d.poslno, m.dcdate, d.okqty 
            FROM DcInSubDet d 
            INNER JOIN DC_Mas m ON d.dcno = m.dcno 
            WHERE ISNULL(d.deleted, 0) = 0 AND d.Apono IN ({placeholders}) {search_sql_dc}
            ORDER BY dcdate ASC
            """
            cursor.execute(dispatches_sql, aponos + list(search_params_dc) + aponos + list(search_params_dc))
            dispatches = cursor.fetchall() or []

        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    # Group dispatches by (apono, partno, poslno)
    dispatches_by_key = defaultdict(list)
    for row in dispatches:
        key = (row[0], row[1], row[2])
        dispatches_by_key[key].append({
            "dcdate": row[3],
            "okqty": float(row[4] or 0)
        })

    # Group schedules by (apono, partno, poslno)
    schedules_by_key = defaultdict(list)
    for s in schedules:
        key = (s["apono"], s["partno"], s["poslno"])
        schedules_by_key[key].append(s)

    # Perform chronological allocation
    for key, schs in schedules_by_key.items():
        schs.sort(key=lambda x: x["reqdate"] if x["reqdate"] else datetime.min)
        disps = dispatches_by_key.get(key, [])
        disps.sort(key=lambda x: x["dcdate"] if x["dcdate"] else datetime.min)

        disp_idx = 0
        disp_rem = disps[disp_idx]["okqty"] if disp_idx < len(disps) else 0

        for sch in schs:
            sch["dispQty"] = 0.0
            target = sch["shdQty"]

            while target > 0 and disp_idx < len(disps):
                allocated = min(target, disp_rem)
                sch["dispQty"] += allocated
                target -= allocated
                disp_rem -= allocated

                if disp_rem <= 0:
                    disp_idx += 1
                    if disp_idx < len(disps):
                        disp_rem = disps[disp_idx]["okqty"]

            sch["pendQty"] = max(0.0, sch["shdQty"] - sch["dispQty"])
            eff_rate = sch.get("effectiveRate", sch["rate"])
            sch["pendVal"] = sch["pendQty"] * eff_rate
            sch["totAmt"] = sch["shdQty"] * eff_rate

    # Aggregate projections by Customer, Month (PO Date), Schd Month (shddate)
    projections = defaultdict(lambda: {
        "pos": set(),
        "totQty": 0.0,
        "totAmt": 0.0,
        "schdQty": 0.0,
        "dispQty": 0.0,
        "pendQty": 0.0,
        "pendVal": 0.0
    })

    for sch in schedules:
        cust = sch["customer"]
        po_date = sch["podt"]
        po_month = po_date.strftime("%B %Y") if po_date else "—"

        shd_date = sch.get("shddate")
        if not shd_date:
            continue
        schd_month = shd_date.strftime("%B %Y")

        group_key = (cust, po_month, schd_month)

        agg = projections[group_key]
        if sch["pono"]:
            agg["pos"].add(sch["pono"])
        agg["totQty"] += sch["shdQty"]
        agg["totAmt"] += sch.get("totAmt", 0.0)
        agg["dispQty"] += sch.get("dispQty", 0.0)
        agg["pendQty"] += sch.get("pendQty", 0.0)
        agg["pendVal"] += sch.get("pendVal", 0.0)

    # Build rows from shddate-based schd qty lookup so every schedule bucket is included
    rows = []
    for (cust, po_month, schd_month), schd_qty in schd_qty_lookup.items():
        schd_qty = round(schd_qty, 2)
        if schd_qty <= 0:
            continue
        agg = projections.get((cust, po_month, schd_month))
        pos_val = agg.get("pos") if agg else None
        pos_count = len(pos_val) if isinstance(pos_val, set) else 0
        tot_qty = round(float(agg["totQty"]), 2) if (agg and isinstance(agg.get("totQty"), (int, float))) else 0.0
        tot_amt = round(float(agg["totAmt"]), 2) if (agg and isinstance(agg.get("totAmt"), (int, float))) else 0.0
        disp_qty = round(float(agg["dispQty"]), 2) if (agg and isinstance(agg.get("dispQty"), (int, float))) else 0.0
        pend_qty = round(float(agg["pendQty"]), 2) if (agg and isinstance(agg.get("pendQty"), (int, float))) else 0.0
        pend_val = round(float(agg["pendVal"]), 2) if (agg and isinstance(agg.get("pendVal"), (int, float))) else 0.0

        rows.append({
            "customer": cust,
            "month": po_month,
            "pos": pos_count,
            "totQty": tot_qty,
            "totAmt": tot_amt,
            "schdMonth": schd_month,
            "schdQty": schd_qty,
            "dispQty": disp_qty,
            "pendQty": pend_qty,
            "pendVal": pend_val
        })

    return Response({
        "rows": rows
    })


@api_view(["GET"])
def sales_analysis_plan_vs_actual(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)

    sql = """
;WITH PART_DESCRIPTION AS
(
    SELECT
        WM.PartNo,
        WM.Description
    FROM WithMatMas WM
    WHERE WM.Deleted = 0

    UNION

    SELECT
        PM.PartNo,
        PM.Description
    FROM ProductMast PM
    WHERE PM.Deleted = 0

    UNION

    SELECT
        CJ.partno AS PartNo,
        CJ.description AS Description
    FROM CustJobRawMat CJ
    WHERE CJ.deleted = 0
),

UNIQUE_COMBINATIONS AS
(
    SELECT
        DPD.CID,
        DPD.PartNo,
        CAST(DPM.dpldate AS DATE) AS ComboDate
    FROM DailyDcPlan_Det DPD
    INNER JOIN DailyDcPlan_Mas DPM
        ON DPM.dplno = DPD.dplno
    WHERE
        DPM.deleted = 0
        AND DPD.deleted = 0
        AND DPM.dpldate BETWEEN ? AND ?
        {uc_plan_filter}

    UNION

    SELECT
        DM.CID,
        DD.PartNo,
        CAST(DM.dcdate AS DATE) AS ComboDate
    FROM DC_Det DD
    INNER JOIN DC_Mas DM
        ON DM.dcno = DD.dcno
    WHERE
        DM.deleted = 0
        AND DD.deleted = 0
        AND DM.dcdate BETWEEN ? AND ?
        {uc_dispatch_filter}
),

PLAN_DATA AS
(
    SELECT
        DPD.CID,
        DPD.PartNo,
        CAST(DPM.dpldate AS DATE) AS PlanDate,
        SUM(ISNULL(DPD.PlanQty,0)) AS PlanQty,
        SUM(ISNULL(DPD.PlanReqQty,0)) AS PlanReqQty,
        SUM(ISNULL(DPD.AvailQty,0)) AS AvailableQty
    FROM DailyDcPlan_Det DPD
    INNER JOIN DailyDcPlan_Mas DPM
        ON DPM.dplno = DPD.dplno
    WHERE
        DPM.deleted = 0
        AND DPD.deleted = 0
        AND DPM.dpldate BETWEEN ? AND ?
        {plan_filter}
    GROUP BY
        DPD.CID,
        DPD.PartNo,
        CAST(DPM.dpldate AS DATE)
),

DISPATCH_DATA AS
(
    SELECT
        DM.CID,
        DD.PartNo,
        CAST(DM.dcdate AS DATE) AS DcDate,
        SUM(ISNULL(DD.okqty,0)) AS DispatchQty,
        STRING_AGG(CAST(BM.invno AS VARCHAR(MAX)), ', ') WITHIN GROUP (ORDER BY BM.invno) AS InvNo,
        STRING_AGG(CAST(CONVERT(VARCHAR(10), CAST(BM.invdt AS DATE), 103) AS VARCHAR(MAX)), ', ') WITHIN GROUP (ORDER BY BM.invno) AS InvDate,
        SUM(ISNULL(BD.[{bd_amt_col}], 0)) AS InvValue
    FROM DC_Det DD
    INNER JOIN DC_Mas DM
        ON DM.dcno = DD.dcno
    LEFT JOIN Bill_DcOrdDet BDO
        ON BDO.dcno = DD.dcno AND BDO.deleted = 0
    LEFT JOIN Bill_Mas BM
        ON BM.invno = BDO.invno AND BM.deleted = 0
    LEFT JOIN Bill_Det BD
        ON BD.invno = BM.invno AND BD.[{bd_partno_col}] = DD.PartNo AND BD.deleted = 0
    WHERE
        DM.deleted = 0
        AND DD.deleted = 0
        AND DM.dcdate BETWEEN ? AND ?
        {dispatch_filter}
    GROUP BY
        DM.CID,
        DD.PartNo,
        CAST(DM.dcdate AS DATE)
)

SELECT
    UC.CID,
    COALESCE(CA.CName, CM.CName, N'—') AS CustomerName,
    UC.PartNo,
    MAX(ISNULL(PD.Description, N'')) AS Description,
    UC.ComboDate AS PlanDate,
    SUM(ISNULL(P.PlanQty,0)) AS PlanQty,
    SUM(ISNULL(P.AvailableQty,0)) AS AvailableQty,
    SUM(ISNULL(P.PlanReqQty,0)) AS PlanReqQty,
    SUM(ISNULL(D.DispatchQty,0)) AS DispatchQty,

    CASE
        WHEN SUM(ISNULL(P.PlanQty,0)) = 0 THEN 0
        ELSE ROUND(SUM(ISNULL(D.DispatchQty,0)) * 100.0 / SUM(ISNULL(P.PlanQty,0)),2)
    END AS DispatchPercentage,

    CASE
        WHEN SUM(ISNULL(D.DispatchQty,0)) >= SUM(ISNULL(P.PlanQty,0)) AND SUM(ISNULL(P.PlanQty,0)) > 0 THEN 'Completed'
        WHEN SUM(ISNULL(D.DispatchQty,0)) > 0 THEN 'Partial'
        ELSE 'Pending'
    END AS DispatchStatus,
    MAX(D.InvNo) AS InvNo,
    MAX(D.InvDate) AS InvDate,
    SUM(ISNULL(D.InvValue, 0)) AS InvValue

FROM UNIQUE_COMBINATIONS UC

LEFT JOIN PLAN_DATA P
    ON P.CID = UC.CID
   AND P.PartNo = UC.PartNo
   AND P.PlanDate = UC.ComboDate

LEFT JOIN DISPATCH_DATA D
    ON D.CID = UC.CID
   AND D.PartNo = UC.PartNo
   AND D.DcDate = UC.ComboDate

LEFT JOIN CustMast CM
    ON CM.ID = UC.CID
   AND CM.Deleted = 0

LEFT JOIN CustAliasMast CA
    ON CA.Id = UC.CID
   AND CA.Deleted = 0

LEFT JOIN PART_DESCRIPTION PD
    ON PD.PartNo = UC.PartNo

{search_sql}

GROUP BY
    UC.CID,
    CA.CName,
    CM.CName,
    UC.PartNo,
    UC.ComboDate

ORDER BY
    CustomerName,
    UC.PartNo,
    PlanDate;
"""

    search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()

    # Build per-table part-no filters for plan (DailyDcPlan_Det) and actual (DC_Det)
    # Both tables use a PartNo column. We embed the LIKE condition directly inside each CTE
    # so that planned-only rows AND actual-only rows are both returned when searching.
    if search_q:
        like_val = f"%{search_q}%"
        # Filter applied inside UNIQUE_COMBINATIONS sub-queries so rows with PartNo match
        # from either source (plan or dispatch) are included.
        uc_plan_filter = "AND LOWER(DPD.PartNo) LIKE LOWER(?)"
        uc_dispatch_filter = "AND LOWER(DD.PartNo) LIKE LOWER(?)"
        plan_filter = "AND LOWER(DPD.PartNo) LIKE LOWER(?)"
        dispatch_filter = "AND LOWER(DD.PartNo) LIKE LOWER(?)"
        # No outer WHERE needed — filtering happens inside each CTE
        search_sql = ""
        # We need 8 date params + 4 partno params (one per occurrence)
        search_params = [like_val, like_val, like_val, like_val]
    else:
        uc_plan_filter = ""
        uc_dispatch_filter = ""
        plan_filter = ""
        dispatch_filter = ""
        search_sql = ""
        search_params = []

    sql = sql.replace("{search_sql}", search_sql)
    sql = sql.replace("{uc_plan_filter}", uc_plan_filter)
    sql = sql.replace("{uc_dispatch_filter}", uc_dispatch_filter)
    sql = sql.replace("{plan_filter}", plan_filter)
    sql = sql.replace("{dispatch_filter}", dispatch_filter)

    rows = []
    cursor = None
    try:
        cursor = conn.cursor()

        # Resolve Bill_Det column names dynamically
        bd_partno_col = find_column_ci(
            cursor, "dbo", "Bill_Det",
            ["PrINTPartNO", "PRINTPARTNO", "partno", "PartNo", "PARTNO", "Part_No"]
        ) or "PrINTPartNO"
        bd_amt_col = find_column_ci(
            cursor, "dbo", "Bill_Det",
            ["amt", "Amt", "AMT"]
        ) or "amt"

        sql = sql.replace("{bd_partno_col}", bd_partno_col)
        sql = sql.replace("{bd_amt_col}", bd_amt_col)

        if search_q:
            # Parameter order matches CTE placeholders:
            # UNIQUE_COMBINATIONS plan branch:  start_date, end_date, like_val
            # UNIQUE_COMBINATIONS dispatch:     start_date, end_date, like_val
            # PLAN_DATA:                        start_date, end_date, like_val
            # DISPATCH_DATA:                    start_date, end_date, like_val
            like_val = f"%{search_q}%"
            params = [
                start_date, end_date, like_val,  # UC plan
                start_date, end_date, like_val,  # UC dispatch
                start_date, end_date, like_val,  # PLAN_DATA
                start_date, end_date, like_val,  # DISPATCH_DATA
            ]
        else:
            params = [
                start_date, end_date, start_date, end_date,
                start_date, end_date, start_date, end_date,
            ]
        cursor.execute(sql, params)
        for row in cursor.fetchall() or []:
            customer = str(row[1]) if row[1] else "—"
            part_no = str(row[2]) if row[2] else ""
            description = str(row[3]) if row[3] else ""
            part_no_desc = f"{part_no} - {description}" if part_no and description else (part_no or description or "—")
            plan_date = str(row[4])[:10] if row[4] else ""
            plan_qty = float(row[5] or 0)
            avail_qty = float(row[6] or 0)
            dispatch_qty = float(row[8] or 0)
            inv_no = str(row[11]) if row[11] else "—"
            inv_date = str(row[12]) if row[12] else "—"
            inv_value = float(row[13] or 0)

            rows.append({
                "date": plan_date,
                "customer": customer,
                "partNoDesc": part_no_desc,
                "planQty": plan_qty,
                "availableQty": avail_qty,
                "dispatchQty": dispatch_qty,
                "invNo": inv_no,
                "invDate": inv_date,
                "invValue": inv_value,
            })
    except Exception as e:
        if cursor: cursor.close()
        conn.close()
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    if cursor: cursor.close()
    conn.close()

    return Response({
        "rows": rows
    })


@api_view(["GET"])
def sales_analysis_po_ledger(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    btype_filter = (request.GET.get("btype") or "").strip()
    btype_p = _btype_param(btype_filter)
    btype_sql = " AND LTRIM(RTRIM(ISNULL(bm.btype, N''))) = ?" if btype_p else ""

    cursor = None
    try:
        cursor = conn.cursor()
        use_alias = table_exists(cursor, "CustAliasMast")

        if use_alias:
            cust_name_expr = "LTRIM(RTRIM(ISNULL(NULLIF(LTRIM(RTRIM(ISNULL(CM.CName, N''))), N''), NULLIF(LTRIM(RTRIM(ISNULL(ca.CName, N''))), N''))))"
            cust_join = """
                LEFT JOIN CustMast CM ON PM.CId = CM.Id
                LEFT JOIN CustAliasMast ca ON PM.CId = ca.Id
            """
        else:
            cust_name_expr = "LTRIM(RTRIM(ISNULL(CM.CName, N'')))"
            cust_join = "LEFT JOIN CustMast CM ON PM.CId = CM.Id"


        search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()
        search_sql, search_params = _build_search_sql(cursor, search_q, "In_PoDet", "PD")

        sql = f"""
        WITH DC_SUMMARY AS (
            SELECT 
                Apono, partno, poslno,
                SUM(dcQty) AS dcQty,
                STRING_AGG(CAST(dcno AS NVARCHAR(MAX)), ', ') WITHIN GROUP (ORDER BY dcno) AS dcNo,
                STRING_AGG(CAST(ISNULL(CONVERT(VARCHAR(10), CAST(dcDate AS DATE), 23), '') AS NVARCHAR(MAX)), ', ') WITHIN GROUP (ORDER BY dcno) AS dcDate
            FROM (
                SELECT 
                    d.Apono, d.partno, d.poslno, d.dcno, m.dcdate AS dcDate,
                    SUM(ISNULL(d.okqty, 0)) AS dcQty
                FROM (
                    SELECT Apono, partno, poslno, dcno, okqty FROM DcInSubDet WHERE deleted = 0
                    UNION ALL
                    SELECT Apono, partno, poslno, dcno, okqty FROM DcInSubDetAssmPoDet WHERE deleted = 0
                ) d
                INNER JOIN DC_Mas m ON d.dcno = m.dcno
                WHERE m.deleted = 0
                GROUP BY d.Apono, d.partno, d.poslno, d.dcno, m.dcdate
            ) dist_dc
            GROUP BY Apono, partno, poslno
        ),
        BILL_SUMMARY AS (
            SELECT Apono, partno, poslno,
                STRING_AGG(CAST(InvDetail AS NVARCHAR(MAX)), ', ') WITHIN GROUP (ORDER BY invdt, invno) AS InvDetails
            FROM (
                SELECT DISTINCT 
                    d.Apono, d.partno, d.poslno,
                    bm.invno, bm.invdt,
                    CAST(bm.invno AS NVARCHAR(MAX)) + 
                    CASE WHEN bm.invdt IS NOT NULL THEN ' (' + CONVERT(VARCHAR(10), CAST(bm.invdt AS DATE), 103) + ')' ELSE '' END AS InvDetail
                FROM (
                    SELECT Apono, partno, poslno, dcno FROM DcInSubDet WHERE deleted = 0
                    UNION ALL
                    SELECT Apono, partno, poslno, dcno FROM DcInSubDetAssmPoDet WHERE deleted = 0
                ) d
                INNER JOIN Bill_DcOrdDet bdo ON d.dcno = bdo.dcno
                INNER JOIN Bill_Mas bm ON bdo.invno = bm.invno
                WHERE bdo.deleted = 0 AND bm.deleted = 0 {btype_sql}
            ) dist_inv
            GROUP BY Apono, partno, poslno
        )
        SELECT 
            PM.type AS POType,
            PM.Apono,
            PM.pono AS PoNo,
            CAST(PM.podt AS DATE) AS PoDate,
            {cust_name_expr} AS CustomerName,
            PD.itcode AS PartNo,
            PD.itdesc AS Description,
            PD.poslno AS PoSlNo,
            ISNULL(PD.Qty, 0) AS Qty,
            ISNULL(PD.PoShotCloseQty, 0) AS ShortCloseQty,
            ISNULL(PD.rate, 0) AS Rate,
            ISNULL(D.dcQty, 0) AS DcQty,
            D.dcNo,
            D.dcDate AS DcDate,
            B.InvDetails AS InvNoDt,
            ISNULL(PD.ShotClsReason, '') AS ShotCloseReason,
            ISNULL(PD.amt, 0) AS Amt,
            CASE WHEN ISNULL(PD.CurrRate, 0) = 0 THEN 1 ELSE PD.CurrRate END AS CurrRate
        FROM In_PoMas PM
        INNER JOIN In_PoDet PD ON PM.PONO = PD.PONO
        {cust_join}
        LEFT JOIN DC_SUMMARY D ON D.Apono = PM.Apono AND D.partno = PD.itcode AND D.poslno = PD.poslno
        LEFT JOIN BILL_SUMMARY B ON B.Apono = PM.Apono AND B.partno = PD.itcode AND B.poslno = PD.poslno
        WHERE PM.Deleted = 0 AND PD.Deleted = 0
          AND CAST(PM.podt AS DATE) BETWEEN ? AND ?
          {search_sql}
        ORDER BY PM.podt DESC, PM.Apono;
        """

        cursor.execute(sql, [start_date, end_date] + list(btype_p) + search_params)
        rows = []
        for row in cursor.fetchall() or []:
            po_type = str(row[0]) if row[0] else ""
            apono = str(row[1]) if row[1] else ""
            po_no = str(row[2]) if row[2] else ""
            po_date = str(row[3])[:10] if row[3] else ""
            customer_name = str(row[4]) if row[4] else "—"
            part_no = str(row[5]) if row[5] else ""
            description = str(row[6]) if row[6] else ""
            part_desc = f"{part_no} - {description}" if part_no and description else (part_no or description or "—")
            po_sl_no = str(row[7]) if row[7] else ""
            qty = float(row[8] or 0)
            short_close_qty = float(row[9] or 0)
            rate = float(row[10] or 0)
            dc_qty = float(row[11] or 0)
            dc_no = str(row[12]) if row[12] else ""
            dc_date = str(row[13]) if row[13] else ""
            inv_no_dt = str(row[14]) if row[14] else ""
            shot_close_reason = str(row[15]) if len(row) > 15 and row[15] else ""
            amt = float(row[16] or 0) if len(row) > 16 else 0
            curr_rate = float(row[17] or 1) if len(row) > 17 and row[17] is not None else 1
            if curr_rate == 0:
                curr_rate = 1

            rows.append({
                "type": po_type,
                "apoNo": apono,
                "poNo": po_no,
                "poDate": po_date,
                "custName": customer_name,
                "partDesc": part_desc,
                "poSlNo": po_sl_no,
                "qty": qty,
                "shortCloseQty": short_close_qty,
                "shotCloseReason": shot_close_reason,
                "rate": rate,
                "amt": amt,
                "currRate": curr_rate,
                "dcNo": dc_no,
                "dcDate": dc_date,
                "dcQty": dc_qty,
                "invNoDt": inv_no_dt
            })

    except Exception as e:
        if cursor: cursor.close()
        conn.close()
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    if cursor: cursor.close()
    conn.close()

    return Response({
        "rows": rows
    })


@api_view(["GET"])
def sales_analysis_traceability(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    btype_filter = (request.GET.get("btype") or "").strip()
    btype_p = _btype_param(btype_filter)
    btype_sql = " AND LTRIM(RTRIM(ISNULL(BM.btype, N''))) = ?" if btype_p else ""

    search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()

    rows = []
    cursor = None
    try:
        cursor = conn.cursor()
        search_sql, search_params = _get_invoice_subquery_filter(cursor, search_q, "BM")

        sql = f"""
    SELECT
        COALESCE(CA.CName, CM.CName) AS [Customer Name],
        BM.invno AS [Invoice No],
        BM.invdt AS [Invoice Date],
        BDO.dcno AS [DC No],
        BDO.dcdt AS [DC Date],
        CASE
            WHEN BM.btype = 'Labour'
                THEN DAP.PONos
            ELSE
                DIS.APONos
        END AS [GRN/PO No],
        RC.RouteCards AS [Route Card No]
    FROM Bill_Mas BM
    LEFT JOIN CustAliasMast CA
        ON BM.cid = CA.Id
       AND CA.Deleted = 0
    LEFT JOIN CustMast CM
        ON BM.cid = CM.Id
       AND CM.Deleted = 0
    INNER JOIN Bill_DcOrdDet BDO
        ON BM.invno = BDO.invno
       AND BDO.deleted = 0
    LEFT JOIN (
        SELECT dcno, STRING_AGG(NULLIF(LTRIM(RTRIM(Apono)), ''), ', ') AS APONos
        FROM DcInSubDet WHERE deleted = 0 GROUP BY dcno
    ) DIS ON BDO.dcno = DIS.dcno
    LEFT JOIN (
        SELECT dcno, STRING_AGG(NULLIF(LTRIM(RTRIM(pono)), ''), ', ') AS PONos
        FROM DcInSubDetAssmPoDet WHERE deleted = 0 GROUP BY dcno
    ) DAP ON BDO.dcno = DAP.dcno
    LEFT JOIN (
        SELECT dcno, STRING_AGG(NULLIF(LTRIM(RTRIM(RouCardNo)), ''), ', ') AS RouteCards
        FROM Dc_RouCardDet WHERE deleted = 0 GROUP BY dcno
    ) RC ON BDO.dcno = RC.dcno
    WHERE BM.deleted = 0
      AND CAST(BM.invdt AS DATE) BETWEEN ? AND ?
      {btype_sql}
      {search_sql}
    ORDER BY BM.invdt DESC, BM.invno DESC, BDO.dcno;
    """

        cursor.execute(sql, [start_date, end_date] + list(btype_p) + search_params)
        for row in cursor.fetchall() or []:
            customer = str(row[0]) if row[0] else "—"
            inv_no = str(row[1]) if row[1] else ""
            inv_date = str(row[2])[:10] if row[2] else ""
            dc_no = str(row[3]) if row[3] else ""
            dc_date = str(row[4])[:10] if row[4] else ""
            grn_po = str(row[5]) if row[5] else "—"
            rc_no = str(row[6]) if row[6] else "—"

            rows.append({
                "customer": customer,
                "invNo": inv_no,
                "invDate": inv_date,
                "dcNo": dc_no,
                "dcDate": dc_date,
                "grnPo": grn_po,
                "rcNo": rc_no
            })
    except Exception as e:
        if cursor: cursor.close()
        conn.close()
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    if cursor: cursor.close()
    conn.close()

    return Response({
        "rows": rows
    })


# ════════════════════════════════════════════
#  Avg Rate Cards  (Per Day / Week / Month / Year)
# ════════════════════════════════════════════

@api_view(["GET"])
def sales_analysis_avg_rate_cards(request):
    """
    Returns the 4 AVG Selling Rate KPI cards:
      - Per Day   : grand_total / calendar_days
      - Per Week  : per_day * 7
      - Per Month : per_day * 30
      - Per Year  : per_day * 365

    Data source: Bill_Mas (same filters as summary-strip).
    Supports ?search= / ?q= for part-number filtering (via Bill_Det join).
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    btype_filter = (request.GET.get("btype") or "").strip()
    btype_p = _btype_param(btype_filter)
    search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()

    mas_filters = _bill_mas_filters(btype_filter=btype_filter)
    det_filters = _bill_det_join_filters(btype_filter=btype_filter)

    try:
        cursor = conn.cursor()
        search_sql_det, search_params_det = _build_search_sql(cursor, search_q, "Bill_Det", "d")

        if search_q:
            # Filter by matching part-number in Bill_Det rows
            cursor.execute(
                f"""
                SELECT ISNULL(SUM(CAST(d.amt AS FLOAT)), 0)
                FROM Bill_Det d
                INNER JOIN Bill_Mas m ON d.invno = m.invno
                WHERE {det_filters} {search_sql_det}
                """,
                (start_date, end_date) + btype_p + tuple(search_params_det),
            )
        else:
            cursor.execute(
                f"""
                SELECT ISNULL(SUM(tamt), 0)
                FROM Bill_Mas
                WHERE {mas_filters}
                """,
                (start_date, end_date) + btype_p,
            )

        row = cursor.fetchone()
        grand_total = float(row[0] or 0) if row else 0.0

        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    # Calendar days in the selected date range (inclusive, same as frontend logic)
    delta = (end_date - start_date).days + 1
    calendar_days = max(1, delta)

    per_day   = round(grand_total / calendar_days, 2)
    per_week  = round(per_day * 7, 2)
    per_month = round(per_day * 30, 2)
    per_year  = round(per_day * 365, 2)

    return Response({
        "period":        format_period_label(start_date, end_date),
        "from":          str(start_date),
        "to":            str(end_date),
        "grand_total":   grand_total,
        "calendar_days": calendar_days,
        "weeks":         round(calendar_days / 7, 1),
        "months":        round(calendar_days / 30, 1),
        "years":         round(calendar_days / 365, 2),
        "per_day":       per_day,
        "per_week":      per_week,
        "per_month":     per_month,
        "per_year":      per_year,
    })
