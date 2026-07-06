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


