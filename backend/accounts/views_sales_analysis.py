# ════════════════════════════════════════════

#  views_sales_analysis.py

#  Sales Analysis — summary strip + KPI row

# ════════════════════════════════════════════

from calendar import monthrange
from datetime import date

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .views import get_tenant_connection, parse_date_range, table_exists, find_column_ci



_MONTH_ABB = [

    "Jan", "Feb", "Mar", "Apr", "May", "Jun",

    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",

]





def _bill_mas_filters(alias=""):

    p = f"{alias}." if alias else ""

    return (

        f"ISNULL({p}deleted, 0) = 0 "

        f"AND ISNULL({p}btype, '') NOT IN ('Credit Note') "

        f"AND CAST({p}invdt AS DATE) BETWEEN ? AND ?"

    )





def _bill_det_join_filters():

    return (

        "ISNULL(d.deleted, 0) = 0 "

        "AND ISNULL(m.deleted, 0) = 0 "

        "AND ISNULL(m.btype, '') NOT IN ('Credit Note') "

        "AND CAST(m.invdt AS DATE) BETWEEN ? AND ?"

    )


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





def _fetch_top_product(cursor, start_date, end_date):

    det_filters = _bill_det_join_filters()

    product_key, _ = _bill_det_partno_expr(cursor, "d")

    if not product_key:

        return "", 0.0



    cursor.execute(

        f"""

        SELECT TOP 1

            {product_key} AS product_name,

            ISNULL(SUM(CAST(d.amt AS FLOAT)), 0) AS revenue

        FROM Bill_Det d

        INNER JOIN Bill_Mas m ON d.invno = m.invno

        WHERE {det_filters}

          AND NULLIF({product_key}, N'') IS NOT NULL

          AND CAST(ISNULL(d.qty, 0) AS FLOAT) = 1

        GROUP BY {product_key}

        ORDER BY MAX(CAST(d.rate AS FLOAT)) DESC, SUM(CAST(d.amt AS FLOAT)) DESC

        """,

        (start_date, end_date),

    )

    row = cursor.fetchone()

    if row and (row[0] or "").strip():

        return (row[0] or "").strip(), float(row[1] or 0)



    cursor.execute(

        f"""

        SELECT TOP 1

            {product_key} AS product_name,

            ISNULL(SUM(CAST(d.amt AS FLOAT)), 0) AS revenue

        FROM Bill_Det d

        INNER JOIN Bill_Mas m ON d.invno = m.invno

        WHERE {det_filters}

          AND NULLIF({product_key}, N'') IS NOT NULL

        GROUP BY {product_key}

        ORDER BY SUM(CAST(d.amt AS FLOAT)) DESC

        """,

        (start_date, end_date),

    )

    row = cursor.fetchone()

    if not row:

        return "", 0.0

    return (row[0] or "").strip(), float(row[1] or 0)





def _fetch_top_customer(cursor, start_date, end_date, use_alias):

    mas_filters = _bill_mas_filters("m")

    name_expr = _cust_name_expr(use_alias)

    join_sql = _cust_join_sql(use_alias)



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

        (start_date, end_date),

    )

    row = cursor.fetchone()

    if not row:

        return "Unknown", 0.0

    name = (row[1] or "").strip() or "Unknown"

    return name, float(row[2] or 0)





@api_view(["GET"])

def sales_analysis_summary_strip(request):

    try:

        conn, tenant = get_tenant_connection(request)

    except ValueError as e:

        return Response({"error": str(e)}, status=401)



    start_date, end_date = parse_date_range(request)

    mas_filters = _bill_mas_filters()

    det_filters = _bill_det_join_filters()



    top_product_name, top_product_revenue = "", 0.0

    top_customer_name, top_customer_revenue = "Unknown", 0.0

    repeat_buyers = 0



    try:

        cursor = conn.cursor()

        use_alias = table_exists(cursor, "CustAliasMast")



        cursor.execute(

            f"""

            SELECT

                ISNULL(SUM(tamt), 0),

                COUNT(DISTINCT invno),

                COUNT(DISTINCT cid)

            FROM Bill_Mas

            WHERE {mas_filters}

            """,

            (start_date, end_date),

        )

        mas_row = cursor.fetchone()
        grand_total = float(mas_row[0] or 0) if mas_row else 0.0
        total_invoices = int(mas_row[1] or 0) if mas_row else 0
        customers = int(mas_row[2] or 0) if mas_row else 0



        cursor.execute(

            f"""

            SELECT ISNULL(SUM(d.qty), 0)

            FROM Bill_Det d

            INNER JOIN Bill_Mas m ON d.invno = m.invno

            WHERE {det_filters}

            """,

            (start_date, end_date),

        )

        qty_row = cursor.fetchone()
        total_qty_sold = float(qty_row[0] or 0) if qty_row else 0.0



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

            (start_date, end_date),

        )

        rb_row = cursor.fetchone()
        repeat_buyers = int(rb_row[0] or 0) if rb_row else 0



        try:

            top_product_name, top_product_revenue = _fetch_top_product(

                cursor, start_date, end_date,

            )

        except Exception:

            pass



        try:

            top_customer_name, top_customer_revenue = _fetch_top_customer(

                cursor, start_date, end_date, use_alias,

            )

        except Exception:

            pass



        cursor.close()

        conn.close()

    except Exception as e:

        return Response({"error": f"Database error: {str(e)}"}, status=500)



    avg_invoice = round(grand_total / total_invoices, 2) if total_invoices else 0.0

    turn_over_lakhs = round(grand_total / 100_000, 2)

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

        "top_product_revenue_lakhs": round(top_product_revenue / 100_000, 2),

        "top_product_pct": _pct(top_product_revenue, grand_total),

        "top_customer_name": top_customer_name,

        "top_customer_revenue": top_customer_revenue,

        "top_customer_revenue_lakhs": round(top_customer_revenue / 100_000, 2),

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

    mas_filters = _bill_mas_filters()
    week_case = _WEEK_OF_MONTH_CASE

    try:
        cursor = conn.cursor()
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
            (start_date, end_date),
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


def _customer_ranking(cust_rows, total_revenue, top_n=5):
    """Top customers by revenue for the ranking bar list."""
    ranking = []
    for row in cust_rows[:top_n]:
        name = (row[0] or "").strip() or "Unknown"
        revenue = float(row[1] or 0)
        ranking.append({
            "name": name,
            "revenue": revenue,
            "revenue_lakhs": round(revenue / 100_000, 2),
            "pct": _pct(revenue, total_revenue),
        })
    return ranking


def _pie_slices(rows, total, label_key=0, value_key=1, top_n=None, others_label="Others"):
    """Build labels + share % from ranked rows; optional Others bucket."""
    if not total:
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
    pcts = [_pct(v, total) for _, v in ranked]
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
    mas_filters = _bill_mas_filters("m")
    det_filters = _bill_det_join_filters()

    try:
        cursor = conn.cursor()
        use_alias = table_exists(cursor, "CustAliasMast")
        name_expr = _cust_name_expr(use_alias)
        join_sql = _cust_join_sql(use_alias)

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
            (start_date, end_date),
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
                WHERE {det_filters}
                  AND NULLIF({part_key}, N'') IS NOT NULL
                """,
                (start_date, end_date),
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
                WHERE {det_filters}
                  AND NULLIF({part_key}, N'') IS NOT NULL
                GROUP BY {part_key}
                ORDER BY qty DESC
                """,
                (start_date, end_date),
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
                WHERE {det_filters}
                  AND NULLIF({part_key}, N'') IS NULL
                GROUP BY LTRIM(RTRIM(ISNULL(m.btype, N'')))
                HAVING ISNULL(SUM(CAST(d.qty AS FLOAT)), 0) > 0
                ORDER BY qty DESC
                """,
                (start_date, end_date),
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
    mas_filters = _bill_mas_filters()
    inv_status_filters = _bill_mas_filters_invoice_status()
    det_filters = _bill_det_join_filters()
    month_slots = _months_in_range(start_date, end_date)

    mas_by_month = {}
    qty_by_month = {}
    btype_counts = {}

    try:
        cursor = conn.cursor()

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
            (start_date, end_date),
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
            WHERE {det_filters}
            GROUP BY YEAR(CAST(m.invdt AS DATE)), MONTH(CAST(m.invdt AS DATE))
            """,
            (start_date, end_date),
        )
        for yr, mo, qty in cursor.fetchall():
            qty_by_month[(int(yr), int(mo))] = float(qty or 0)

        cursor.execute(
            f"""
            SELECT
                LTRIM(RTRIM(ISNULL(btype, N''))) AS btype,
                COUNT(DISTINCT invno) AS inv_count
            FROM Bill_Mas
            WHERE {inv_status_filters}
            GROUP BY LTRIM(RTRIM(ISNULL(btype, N'')))
            """,
            (start_date, end_date),
        )
        for btype, inv_count in cursor.fetchall():
            btype_counts[(btype or "").strip()] = int(inv_count or 0)

        sales_return_count = btype_counts.pop("Sales Return", 0)

        credit_match = _credit_note_match_sql()
        cursor.execute(
            f"""
            SELECT COUNT(DISTINCT invno)
            FROM Bill_Mas
            WHERE {inv_status_filters}
              AND {credit_match}
            """,
            (start_date, end_date),
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

    base_where = (
        "ISNULL(BM.deleted, 0) = 0 "
        "AND ISNULL(BD.deleted, 0) = 0 "
        "AND ISNULL(BM.btype, '') <> 'Sales Return' "
        "AND CAST(BM.invdt AS DATE) BETWEEN ? AND ?"
    )
    params: list = [start_date, end_date]
    if btype_filter and btype_filter.lower() not in ("all", ""):
        base_where += " AND LTRIM(RTRIM(ISNULL(BM.btype, N''))) = ?"
        params.append(btype_filter)

    try:
        cursor = conn.cursor()
        use_alias = table_exists(cursor, "CustAliasMast")
        cust_expr = _invoice_cust_name_expr(use_alias)
        join_sql = _invoice_cust_join_sql(use_alias)

        cursor.execute(
            f"""
            SELECT DISTINCT LTRIM(RTRIM(ISNULL(btype, N''))) AS btype
            FROM Bill_Mas
            WHERE ISNULL(deleted, 0) = 0
              AND ISNULL(btype, '') <> 'Sales Return'
              AND CAST(invdt AS DATE) BETWEEN ? AND ?
              AND LTRIM(RTRIM(ISNULL(btype, N''))) <> N''
            ORDER BY btype
            """,
            (start_date, end_date),
        )
        btypes = [(row[0] or "").strip() for row in cursor.fetchall() if (row[0] or "").strip()]

        cursor.execute(
            f"""
            SELECT
                BM.invno AS invoice_no,
                CAST(BM.invdt AS DATE) AS inv_date,
                {cust_expr} AS customer,
                LTRIM(RTRIM(ISNULL(BD.itcode, N''))) AS part_no,
                LTRIM(RTRIM(ISNULL(BD.itdesc, N''))) AS description,
                ISNULL(CAST(BD.qty AS FLOAT), 0) AS qty,
                ISNULL(CAST(BD.rate AS FLOAT), 0) AS rate,
                ISNULL(CAST(BD.amt AS FLOAT), 0) AS amount,
                LTRIM(RTRIM(ISNULL(BM.einvno, N''))) AS e_invoice
            FROM Bill_Mas BM
            INNER JOIN Bill_Det BD ON BM.invno = BD.invno
            {join_sql}
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
                "rate": float(row[6] or 0),
                "amount": float(row[7] or 0),
                "e_invoice": (row[8] or "").strip(),
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
    det_filters = _bill_det_join_filters()

    try:
        cursor = conn.cursor()
        cursor.execute(
            f"""
            SELECT
                LTRIM(RTRIM(ISNULL(d.itcode, N''))) AS part_no,
                MAX(LTRIM(RTRIM(ISNULL(d.itdesc, N'')))) AS description,
                MAX(LTRIM(RTRIM(ISNULL(d.uom, N'')))) AS uom,
                ISNULL(SUM(CAST(d.qty AS FLOAT)), 0) AS qty,
                ISNULL(SUM(CAST(d.amt AS FLOAT)), 0) AS revenue
            FROM Bill_Det d
            INNER JOIN Bill_Mas m ON d.invno = m.invno
            WHERE {det_filters}
              AND NULLIF(LTRIM(RTRIM(ISNULL(d.itcode, N''))), N'') IS NOT NULL
            GROUP BY LTRIM(RTRIM(ISNULL(d.itcode, N'')))
            ORDER BY revenue DESC
            """,
            (start_date, end_date),
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

    Returns month-wise SUM(Bill_Det.amt) for the selected date range.
    SQL mirrors:
        SELECT DATENAME(MONTH, BM.invdt), MONTH(BM.invdt), SUM(BD.amt)
        FROM Bill_Mas BM INNER JOIN Bill_Det BD ON BM.invno = BD.invno
        WHERE BD.deleted = 0 AND BM.deleted = 0 AND BM.invdt BETWEEN ? AND ?
        GROUP BY MONTH(BM.invdt), DATENAME(MONTH, BM.invdt)
        ORDER BY MonthNo
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)

    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                DATENAME(MONTH, BM.invdt)   AS MonthName,
                MONTH(BM.invdt)             AS MonthNo,
                ISNULL(SUM(BD.amt), 0)      AS SalesValue
            FROM Bill_Mas AS BM
            INNER JOIN Bill_Det AS BD ON BM.invno = BD.invno
            WHERE
                BD.deleted  = 0
                AND BM.deleted = 0
                AND CAST(BM.invdt AS DATE) BETWEEN ? AND ?
            GROUP BY
                MONTH(BM.invdt),
                DATENAME(MONTH, BM.invdt)
            ORDER BY
                MonthNo
            """,
            (start_date, end_date),
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    labels = []
    sales_values = []
    for row in rows:
        labels.append(str(row[0] or "").strip())
        sales_values.append(round(float(row[2] or 0), 2))

    total = round(sum(sales_values), 2)

    return Response({
        "company": tenant.get("company_name", ""),
        "from": str(start_date),
        "to": str(end_date),
        "period": format_period_label(start_date, end_date),
        "labels": labels,
        "sales_values": sales_values,
        "sales_values_lakhs": [round(v / 100_000, 2) for v in sales_values],
        "total": total,
        "total_lakhs": round(total / 100_000, 2),
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

    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                DATENAME(MONTH, bm.invdt)           AS MonthName,
                MONTH(bm.invdt)                     AS MonthNo,
                LTRIM(RTRIM(ISNULL(bm.btype, N''))) AS BillType,
                ISNULL(SUM(bm.namt), 0)             AS NetAmount
            FROM Bill_Mas bm
            INNER JOIN Bill_Det bd ON bm.invno = bd.invno
            WHERE
                bm.deleted = 0
                AND bd.deleted = 0
                AND CAST(bm.invdt AS DATE) BETWEEN ? AND ?
            GROUP BY
                MONTH(bm.invdt),
                DATENAME(MONTH, bm.invdt),
                bm.btype
            ORDER BY
                MonthNo,
                bm.btype
            """,
            (start_date, end_date),
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
        net_amount = round(float(row[3] or 0), 2)

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

    # Round dataset values
    datasets_list = [
        {
            "bill_type": btype,
            "data": [round(v, 2) for v in vals],
            "data_lakhs": [round(v / 100_000, 2) for v in vals],
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

    try:
        cursor = conn.cursor()
        cursor.execute(
            """
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
            (start_date, end_date),
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
    from datetime import datetime

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

        # 1. Fetch schedules within the selected PO date range
        schedules_sql = f"""
        SELECT 
            s.Apono,
            s.pono,
            s.itcode AS partno,
            s.poslno,
            s.reqdate,
            s.shdQty,
            p.podt,
            {cust_name_expr} AS CustomerName,
            pd.Rate
        FROM In_PoDet_ShdQty s
        INNER JOIN In_PoMas p ON s.Apono = p.Apono
        INNER JOIN In_PoDet pd ON pd.pono = p.pono AND pd.ItCode = s.itcode AND pd.poslno = s.poslno
        {cust_join}
        WHERE ISNULL(s.deleted, 0) = 0
          AND ISNULL(p.deleted, 0) = 0
          AND ISNULL(pd.deleted, 0) = 0
          AND CAST(p.podt AS DATE) BETWEEN ? AND ?
        ORDER BY s.reqdate ASC
        """
        cursor.execute(schedules_sql, (start_date, end_date))
        schedules = []
        for row in cursor.fetchall() or []:
            schedules.append({
                "apono": row[0],
                "pono": row[1],
                "partno": row[2],
                "poslno": row[3],
                "reqdate": row[4],
                "shdQty": float(row[5] or 0),
                "podt": row[6],
                "customer": row[7] or "—",
                "rate": float(row[8] or 0)
            })

        # 2. Fetch dispatches for the same Apono
        aponos = list(set(s["apono"] for s in schedules if s["apono"]))
        
        dispatches = []
        if aponos:
            placeholders = ",".join("?" for _ in aponos)
            dispatches_sql = f"""
            SELECT d.Apono, d.partno, d.poslno, m.dcdate, d.okqty 
            FROM DcInSubDetAssmPoDet d 
            INNER JOIN DC_Mas m ON d.dcno = m.dcno 
            WHERE ISNULL(d.deleted, 0) = 0 AND d.Apono IN ({placeholders})
            UNION ALL 
            SELECT d.Apono, d.partno, d.poslno, m.dcdate, d.okqty 
            FROM DcInSubDet d 
            INNER JOIN DC_Mas m ON d.dcno = m.dcno 
            WHERE ISNULL(d.deleted, 0) = 0 AND d.Apono IN ({placeholders})
            ORDER BY dcdate ASC
            """
            cursor.execute(dispatches_sql, aponos + aponos)
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
            sch["pendVal"] = sch["pendQty"] * sch["rate"]
            sch["totAmt"] = sch["shdQty"] * sch["rate"]

    # Aggregate projections by Customer, Month (PO Date), Schd Month (reqdate)
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
        
        req_date = sch["reqdate"]
        schd_month = req_date.strftime("%B %Y") if req_date else "—"

        group_key = (cust, po_month, schd_month)

        agg = projections[group_key]
        if sch["pono"]:
            agg["pos"].add(sch["pono"])
        agg["totQty"] += sch["shdQty"]
        agg["totAmt"] += sch.get("totAmt", 0.0)
        agg["schdQty"] += sch["shdQty"]
        agg["dispQty"] += sch.get("dispQty", 0.0)
        agg["pendQty"] += sch.get("pendQty", 0.0)
        agg["pendVal"] += sch.get("pendVal", 0.0)

    rows = []
    for group_key, agg in projections.items():
        cust, po_month, schd_month = group_key
        rows.append({
            "customer": cust,
            "month": po_month,
            "pos": len(agg["pos"]),
            "totQty": round(agg["totQty"], 2),
            "totAmt": round(agg["totAmt"], 2),
            "schdMonth": schd_month,
            "schdQty": round(agg["schdQty"], 2),
            "dispQty": round(agg["dispQty"], 2),
            "pendQty": round(agg["pendQty"], 2),
            "pendVal": round(agg["pendVal"], 2)
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
        SUM(ISNULL(DD.okqty,0)) AS DispatchQty
    FROM DC_Det DD
    INNER JOIN DC_Mas DM
        ON DM.dcno = DD.dcno
    WHERE
        DM.deleted = 0
        AND DD.deleted = 0
        AND DM.dcdate BETWEEN ? AND ?
    GROUP BY
        DM.CID,
        DD.PartNo,
        CAST(DM.dcdate AS DATE)
)

SELECT
    UC.CID,
    ISNULL(CM.CName, N'—') AS CustomerName,
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
    END AS DispatchStatus

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

LEFT JOIN PART_DESCRIPTION PD
    ON PD.PartNo = UC.PartNo

GROUP BY
    UC.CID,
    CM.CName,
    UC.PartNo,
    UC.ComboDate

ORDER BY
    CustomerName,
    UC.PartNo,
    PlanDate;
"""

    rows = []
    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute(sql, [
            start_date, end_date, start_date, end_date,
            start_date, end_date, start_date, end_date
        ])
        for row in cursor.fetchall() or []:
            customer = str(row[1]) if row[1] else "—"
            part_no = str(row[2]) if row[2] else ""
            description = str(row[3]) if row[3] else ""
            part_no_desc = f"{part_no} - {description}" if part_no and description else (part_no or description or "—")
            plan_date = str(row[4])[:10] if row[4] else ""
            plan_qty = float(row[5] or 0)
            avail_qty = float(row[6] or 0)
            dispatch_qty = float(row[8] or 0)

            rows.append({
                "date": plan_date,
                "customer": customer,
                "partNoDesc": part_no_desc,
                "planQty": plan_qty,
                "availableQty": avail_qty,
                "dispatchQty": dispatch_qty,
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

        sql = f"""
        WITH DC_SUMMARY AS (
            SELECT 
                d.Apono,
                d.partno,
                d.poslno,
                SUM(ISNULL(d.okqty, 0)) AS dcQty,
                MAX(d.dcno) AS dcNo,
                MAX(m.dcdate) AS dcDate
            FROM (
                SELECT Apono, partno, poslno, dcno, okqty FROM DcInSubDet WHERE deleted = 0
                UNION ALL
                SELECT Apono, partno, poslno, dcno, okqty FROM DcInSubDetAssmPoDet WHERE deleted = 0
            ) d
            INNER JOIN DC_Mas m ON d.dcno = m.dcno
            WHERE m.deleted = 0
            GROUP BY d.Apono, d.partno, d.poslno
        ),
        BILL_SUMMARY AS (
            SELECT 
                ab.Dcno,
                ab.DcPartNo,
                MAX(ab.invno) AS invNo,
                MAX(bm.invdt) AS invDate
            FROM ABillDc_Det ab
            INNER JOIN Bill_Mas bm ON ab.invno = bm.invno
            WHERE ab.deleted = 0 AND bm.deleted = 0
            GROUP BY ab.Dcno, ab.DcPartNo
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
            CAST(D.dcDate AS DATE) AS DcDate,
            B.invNo,
            CAST(B.invDate AS DATE) AS InvDate
        FROM In_PoMas PM
        INNER JOIN In_PoDet PD ON PM.PONO = PD.PONO
        {cust_join}
        LEFT JOIN DC_SUMMARY D ON D.Apono = PM.Apono AND D.partno = PD.itcode AND D.poslno = PD.poslno
        LEFT JOIN BILL_SUMMARY B ON B.Dcno = D.dcNo AND B.DcPartNo = PD.itcode
        WHERE PM.Deleted = 0 AND PD.Deleted = 0
          AND CAST(PM.podt AS DATE) BETWEEN ? AND ?
        ORDER BY PM.podt DESC, PM.Apono;
        """

        cursor.execute(sql, [start_date, end_date])
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
            dc_date = str(row[13])[:10] if row[13] else ""
            inv_no = str(row[14]) if row[14] else ""
            inv_date_val = row[15]

            inv_no_dt = ""
            if inv_no:
                if inv_date_val:
                    if hasattr(inv_date_val, "strftime"):
                        inv_date_str = inv_date_val.strftime("%d/%m/%Y")
                    else:
                        inv_date_str = str(inv_date_val)[:10]
                    inv_no_dt = f"{inv_no} ({inv_date_str})"
                else:
                    inv_no_dt = inv_no

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
                "rate": rate,
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

    sql = """
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
    ORDER BY BM.invdt DESC, BM.invno DESC, BDO.dcno;
    """

    rows = []
    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute(sql, [start_date, end_date])
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




