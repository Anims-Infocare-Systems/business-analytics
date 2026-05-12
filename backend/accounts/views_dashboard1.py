# ════════════════════════════════════════════
#  views_dashboard1.py
#  Dashboard1 - Sales Value API Endpoints
# ════════════════════════════════════════════
from datetime import date, datetime, timedelta

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .views import get_tenant_connection, month_key_from_db


def rupees_to_lakhs(amount):
    return float(amount or 0) / 100_000


def parse_dashboard1_period(request):
    """Parse ?year=YYYY&month=0-11 from Dashboard1; default to current calendar month."""
    year_param = (request.GET.get("year") or "").strip()
    month_param = (request.GET.get("month") or "").strip()
    if year_param and month_param != "":
        try:
            year = int(year_param)
            month_idx = int(month_param)
            if 0 <= month_idx <= 11 and 2000 <= year <= 2100:
                month = month_idx + 1
                start = date(year, month, 1)
                if month == 12:
                    end = date(year, 12, 31)
                else:
                    end = date(year, month + 1, 1) - timedelta(days=1)
                return start, end, year, month
        except ValueError:
            pass

    today = date.today()
    start = date(today.year, today.month, 1)
    if today.month == 12:
        end = date(today.year, 12, 31)
    else:
        end = date(today.year, today.month + 1, 1) - timedelta(days=1)
    return start, end, today.year, today.month


@api_view(["GET"])
def dashboard1_sales_kpi(request):
    """
    Dashboard1 - Sales Value KPI
    Returns: Current value, delta %, sparkline data (7 months)
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)
    
    _, _, selected_year, selected_month = parse_dashboard1_period(request)

    # Calculate Financial Year Start for the selected month
    fy_start_year = selected_year if selected_month >= 4 else selected_year - 1
    fy_start_date = datetime(fy_start_year, 4, 1)
    fy_end_date = datetime(fy_start_year + 1, 3, 31)
    
    try:
        cursor = conn.cursor()
        
        # ── Get Month-wise Sales for Current FY (for sparkline & current value) ──
        cursor.execute("""
            SELECT MONTH(invdt) AS mth, SUM(tamt) AS total 
            FROM Bill_Mas 
            WHERE ISNULL(deleted, 0) = 0
            AND ISNULL(bttype, '') <> 'Credit Note'
            AND CAST(invdt AS DATE) BETWEEN ? AND ?
            GROUP BY MONTH(invdt)
            ORDER BY mth
        """, (fy_start_date, fy_end_date))
        
        fy_sales_rows = cursor.fetchall()
        
        # ── Get Previous FY Sales for Delta Calculation ──
        prev_fy_start = datetime(fy_start_year - 1, 4, 1)
        prev_fy_end = datetime(fy_start_year, 3, 31)
        
        cursor.execute("""
            SELECT SUM(tamt) AS total 
            FROM Bill_Mas 
            WHERE ISNULL(deleted, 0) = 0
            AND ISNULL(bttype, '') <> 'Credit Note'
            AND CAST(invdt AS DATE) BETWEEN ? AND ?
        """, (prev_fy_start, prev_fy_end))
        
        prev_fy_row = cursor.fetchone()
        prev_fy_total = float(prev_fy_row[0] or 0) if prev_fy_row else 0
        
        # ── Get Current Month Sales ──
        current_month_start = datetime(selected_year, selected_month, 1)
        if selected_month == 12:
            current_month_end = datetime(selected_year, 12, 31)
        else:
            current_month_end = datetime(selected_year, selected_month + 1, 1) - timedelta(days=1)
        
        cursor.execute("""
            SELECT SUM(tamt) AS total 
            FROM Bill_Mas 
            WHERE ISNULL(deleted, 0) = 0
            AND ISNULL(bttype, '') <> 'Credit Note'
            AND CAST(invdt AS DATE) BETWEEN ? AND ?
        """, (current_month_start, current_month_end))
        
        current_month_row = cursor.fetchone()
        current_month_total = float(current_month_row[0] or 0) if current_month_row else 0
        
        # ── Get Previous Month Sales for Delta ──
        prev_month_end = current_month_start - timedelta(days=1)
        prev_month_start = prev_month_end.replace(day=1)
        
        cursor.execute("""
            SELECT SUM(tamt) AS total 
            FROM Bill_Mas 
            WHERE ISNULL(deleted, 0) = 0
            AND ISNULL(bttype, '') <> 'Credit Note'
            AND CAST(invdt AS DATE) BETWEEN ? AND ?
        """, (prev_month_start, prev_month_end))
        
        prev_month_row = cursor.fetchone()
        prev_month_total = float(prev_month_row[0] or 0) if prev_month_row else 0
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)
    
    # ── Process Data ──
    # Month order for FY: Apr(4), May(5), ..., Mar(3)
    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    sales_map = {m: 0.0 for m in month_order}

    for mth, total in fy_sales_rows:
        mk = month_key_from_db(mth)
        if mk in sales_map:
            sales_map[mk] = float(total or 0)

    quarter_months = get_quarter_months(selected_month)
    quarter_total_rupees = sum(sales_map.get(m, 0) for m in quarter_months)
    fy_total_rupees = sum(sales_map.values())

    sales_map_lakhs = {m: sales_map[m] / 100_000 for m in month_order}
    
    # Calculate delta (month-over-month)
    if prev_month_total > 0:
        delta = ((current_month_total - prev_month_total) / prev_month_total) * 100
    else:
        delta = 0 if current_month_total == 0 else 100
    
    delta_type = "up" if delta >= 0 else "dn"
    
    # Sparkline data - last 7 months data (in lakhs)
    sparkline_data = []
    for m in month_order:
        if sales_map_lakhs[m] > 0:
            sparkline_data.append(sales_map_lakhs[m])
    
    # Ensure we have at least 7 data points
    while len(sparkline_data) < 7:
        sparkline_data.insert(0, 0)
    sparkline_data = sparkline_data[-7:]  # Keep only last 7
    
    return Response({
        "success": True,
        "data": {
            "label": "Sales Value",
            "current_value": current_month_total,
            "quarter_value": quarter_total_rupees,
            "fy_value": fy_total_rupees,
            "fy_label": f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}",
            "delta": round(abs(delta), 1),
            "delta_type": delta_type,
            "spark_data": sparkline_data,
            "month_labels": ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
            "month_values": [sales_map_lakhs[m] for m in month_order]
        }
    })


def get_quarter_months(month):
    """Get months in the same quarter as the given month"""
    quarters = {
        1: [1, 2, 3], 2: [1, 2, 3], 3: [1, 2, 3],
        4: [4, 5, 6], 5: [4, 5, 6], 6: [4, 5, 6],
        7: [7, 8, 9], 8: [7, 8, 9], 9: [7, 8, 9],
        10: [10, 11, 12], 11: [10, 11, 12], 12: [10, 11, 12]
    }
    return quarters.get(month, [month])


PURCHASE_MONTHWISE_SQL = """
    SELECT MONTH(podate) AS month_num, SUM(ISNULL(totamt, 0)) AS total_amount
    FROM POMas
    WHERE deleted = 0
      AND CAST(podate AS DATE) BETWEEN ? AND ?
      AND ISNULL(dtype, '') <> 'Job Order'
    GROUP BY MONTH(podate)
    ORDER BY month_num
"""

PURCHASE_TOTAL_SQL = """
    SELECT SUM(ISNULL(totamt, 0)) AS total_amount
    FROM POMas
    WHERE deleted = 0
      AND CAST(podate AS DATE) BETWEEN ? AND ?
      AND ISNULL(dtype, '') <> 'Job Order'
"""


def build_dashboard1_kpi_payload(label, current_month_total, prev_month_total, month_totals, selected_month, fy_start_year):
    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    quarter_months = get_quarter_months(selected_month)
    quarter_total_rupees = sum(month_totals.get(m, 0) for m in quarter_months)
    fy_total_rupees = sum(month_totals.values())
    month_values_lakhs = {m: month_totals[m] / 100_000 for m in month_order}

    if prev_month_total > 0:
        delta = ((current_month_total - prev_month_total) / prev_month_total) * 100
    else:
        delta = 0 if current_month_total == 0 else 100

    sparkline_data = []
    for m in month_order:
        if month_values_lakhs[m] > 0:
            sparkline_data.append(month_values_lakhs[m])
    while len(sparkline_data) < 7:
        sparkline_data.insert(0, 0)
    sparkline_data = sparkline_data[-7:]

    return {
        "label": label,
        "current_value": current_month_total,
        "quarter_value": quarter_total_rupees,
        "fy_value": fy_total_rupees,
        "fy_label": f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}",
        "delta": round(abs(delta), 1),
        "delta_type": "up" if delta >= 0 else "dn",
        "spark_data": sparkline_data,
        "month_labels": ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
        "month_values": [month_values_lakhs[m] for m in month_order],
    }


def fetch_month_totals(cursor, sql, start_date, end_date):
    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    totals = {m: 0.0 for m in month_order}
    cursor.execute(sql, (start_date, end_date))
    for month_num, amount in cursor.fetchall():
        mk = month_key_from_db(month_num)
        if mk in totals:
            totals[mk] = float(amount or 0)
    return totals


def fetch_period_total(cursor, sql, start_date, end_date):
    cursor.execute(sql, (start_date, end_date))
    row = cursor.fetchone()
    return float(row[0] or 0) if row else 0.0


@api_view(["GET"])
def dashboard1_purchase_kpi(request):
    """Dashboard1 - Purchase Value KPI using purchase report monthwise logic."""
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    _, _, selected_year, selected_month = parse_dashboard1_period(request)
    fy_start_year = selected_year if selected_month >= 4 else selected_year - 1
    fy_start_date = datetime(fy_start_year, 4, 1)
    fy_end_date = datetime(fy_start_year + 1, 3, 31)

    current_month_start = datetime(selected_year, selected_month, 1)
    if selected_month == 12:
        current_month_end = datetime(selected_year, 12, 31)
    else:
        current_month_end = datetime(selected_year, selected_month + 1, 1) - timedelta(days=1)

    prev_month_end = current_month_start - timedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)

    try:
        cursor = conn.cursor()
        month_totals = fetch_month_totals(cursor, PURCHASE_MONTHWISE_SQL, fy_start_date, fy_end_date)
        current_month_total = fetch_period_total(cursor, PURCHASE_TOTAL_SQL, current_month_start, current_month_end)
        prev_month_total = fetch_period_total(cursor, PURCHASE_TOTAL_SQL, prev_month_start, prev_month_end)
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "success": True,
        "data": build_dashboard1_kpi_payload(
            "Purchase Value",
            current_month_total,
            prev_month_total,
            month_totals,
            selected_month,
            fy_start_year,
        ),
    })


def production_date_params(start_date, end_date):
    return [start_date, end_date, start_date, end_date, start_date, end_date]


PRODUCTION_COMBINED_DATA_SQL = """
WITH CombinedData AS (
    SELECT P.proddate AS EntryDate,
        ((CASE WHEN P.runto >= P.runfrom THEN DATEDIFF(SECOND, P.runfrom, P.runto)
              ELSE DATEDIFF(SECOND, P.runfrom, DATEADD(DAY, 1, P.runto)) END
         - ISNULL(P.accidletimesecs, 0)) / 3600.0) * ISNULL(M.RatePerHr, 0) AS ProductionValue
    FROM ProductionEntry P
    LEFT JOIN MacMaster M ON P.macno = M.macno
    WHERE P.deleted = 0 AND CAST(P.proddate AS DATE) BETWEEN ? AND ?
    UNION ALL
    SELECT C.entrydate AS EntryDate,
        ((CASE WHEN C.endtime >= C.starttime THEN DATEDIFF(SECOND, C.starttime, C.endtime)
              ELSE DATEDIFF(SECOND, C.starttime, DATEADD(DAY, 1, C.endtime)) END
         - ISNULL(DATEDIFF(SECOND, 0, C.IdleTime), 0)) / 3600.0) * ISNULL(M.RatePerHr, 0) AS ProductionValue
    FROM ConvProductionEntry C
    LEFT JOIN MacMaster M ON C.macno = M.macno
    WHERE C.deleted = 0 AND CAST(C.entrydate AS DATE) BETWEEN ? AND ?
    UNION ALL
    SELECT R.entrydate AS EntryDate,
        ((CASE WHEN R.endtime >= R.starttime THEN DATEDIFF(SECOND, R.starttime, R.endtime)
              ELSE DATEDIFF(SECOND, R.starttime, DATEADD(DAY, 1, R.endtime)) END
         - ISNULL(DATEDIFF(SECOND, 0, R.IdleTime), 0)) / 3600.0) * ISNULL(M.RatePerHr, 0) AS ProductionValue
    FROM ConvProductionEntryRod R
    LEFT JOIN MacMaster M ON R.macno = M.macno
    WHERE R.deleted = 0 AND CAST(R.entrydate AS DATE) BETWEEN ? AND ?
)
"""

PRODUCTION_MONTHWISE_SQL = PRODUCTION_COMBINED_DATA_SQL + """
SELECT MONTH(EntryDate) AS month_num, SUM(ProductionValue) AS total_amount
FROM CombinedData
GROUP BY MONTH(EntryDate)
ORDER BY month_num
"""

PRODUCTION_TOTAL_SQL = PRODUCTION_COMBINED_DATA_SQL + """
SELECT SUM(ProductionValue) AS total_amount
FROM CombinedData
"""


def fetch_production_month_totals(cursor, start_date, end_date):
    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    totals = {m: 0.0 for m in month_order}
    cursor.execute(PRODUCTION_MONTHWISE_SQL, production_date_params(start_date, end_date))
    for month_num, amount in cursor.fetchall():
        mk = month_key_from_db(month_num)
        if mk in totals:
            totals[mk] = float(amount or 0)
    return totals


def fetch_production_period_total(cursor, start_date, end_date):
    cursor.execute(PRODUCTION_TOTAL_SQL, production_date_params(start_date, end_date))
    row = cursor.fetchone()
    return float(row[0] or 0) if row else 0.0


@api_view(["GET"])
def dashboard1_production_kpi(request):
    """Dashboard1 - Production Value KPI using production value monthwise logic."""
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    _, _, selected_year, selected_month = parse_dashboard1_period(request)
    fy_start_year = selected_year if selected_month >= 4 else selected_year - 1
    fy_start_date = datetime(fy_start_year, 4, 1)
    fy_end_date = datetime(fy_start_year + 1, 3, 31)

    current_month_start = datetime(selected_year, selected_month, 1)
    if selected_month == 12:
        current_month_end = datetime(selected_year, 12, 31)
    else:
        current_month_end = datetime(selected_year, selected_month + 1, 1) - timedelta(days=1)

    prev_month_end = current_month_start - timedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)

    try:
        cursor = conn.cursor()
        month_totals = fetch_production_month_totals(cursor, fy_start_date, fy_end_date)
        current_month_total = fetch_production_period_total(cursor, current_month_start, current_month_end)
        prev_month_total = fetch_production_period_total(cursor, prev_month_start, prev_month_end)
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "success": True,
        "data": build_dashboard1_kpi_payload(
            "Production Value",
            current_month_total,
            prev_month_total,
            month_totals,
            selected_month,
            fy_start_year,
        ),
    })


SALES_PROJECTIONS_SALES_SQL = """
    SELECT SUM(tamt) AS total
    FROM Bill_Mas
    WHERE deleted = 0
      AND ISNULL(btype, '') NOT IN ('Credit Note')
      AND CAST(invdt AS DATE) BETWEEN ? AND ?
"""

SALES_PROJECTIONS_PO_SQL = """
    SELECT SUM(tamt) AS total
    FROM In_PoMas
    WHERE deleted = 0
      AND CAST(podt AS DATE) BETWEEN ? AND ?
"""


@api_view(["GET"])
def dashboard1_sales_projections(request):
    """Dashboard1 - Sales vs PO for the selected month (same logic as po_vs_sales)."""
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date, selected_year, selected_month = parse_dashboard1_period(request)
    month_labels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
    month_label = month_labels[selected_month - 1]

    try:
        cursor = conn.cursor()
        sales_total = fetch_period_total(cursor, SALES_PROJECTIONS_SALES_SQL, start_date, end_date)
        po_total = fetch_period_total(cursor, SALES_PROJECTIONS_PO_SQL, start_date, end_date)
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "success": True,
        "data": {
            "labels": [month_label],
            "sales": [round(sales_total / 100_000, 2)],
            "po": [round(po_total / 100_000, 2)],
            "sales_rupees": [sales_total],
            "po_rupees": [po_total],
            "year": selected_year,
            "month": selected_month,
        },
    })