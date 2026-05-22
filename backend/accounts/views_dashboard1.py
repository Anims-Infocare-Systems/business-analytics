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


def dashboard1_analysis_today_yesterday(selected_year, selected_month):
    """
    Today / YDA for Sales & Purchase analysis tables: same day-of-month as the
    real calendar today, but in the selected month (e.g. select Jan → 15 Jan / 14 Jan
    when today is 15 May). Short months clamp (e.g. 31 → last day of Feb).
    """
    actual_today = date.today()
    if selected_month == 12:
        last_day_of_month = date(selected_year, 12, 31).day
    else:
        last_day_of_month = (date(selected_year, selected_month + 1, 1) - timedelta(days=1)).day
    day = min(actual_today.day, last_day_of_month)
    today_date = date(selected_year, selected_month, day)
    yesterday_date = today_date - timedelta(days=1)
    return today_date, yesterday_date


SALES_ANALYSIS_BTYPE_SQL = """
    SELECT
        ISNULL(btype, '') AS btype,
        SUM(ISNULL(tamt, 0)) AS total_amount
    FROM Bill_Mas
    WHERE deleted = 0
      AND ISNULL(btype, '') <> 'Sales Return'
      AND CAST(invdt AS DATE) BETWEEN ? AND ?
    GROUP BY ISNULL(btype, '')
"""


def fetch_sales_analysis_bucket(cursor, start_date, end_date):
    cursor.execute(SALES_ANALYSIS_BTYPE_SQL, (start_date, end_date))
    bucket = {"sales": 0.0, "lab": 0.0, "exp": 0.0, "total": 0.0}

    for btype, total_amount in cursor.fetchall():
        amount = float(total_amount or 0)
        normalized_btype = (btype or "").strip().lower()
        bucket["total"] += amount

        if normalized_btype == "labour charges":
            bucket["lab"] += amount
        elif normalized_btype == "export invoice":
            bucket["exp"] += amount
        else:
            bucket["sales"] += amount

    return bucket


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
    quarter_months = get_quarter_months(selected_month)
    quarter_start_date = datetime(selected_year, quarter_months[0], 1)
    if quarter_months[-1] == 12:
        quarter_end_date = datetime(selected_year, 12, 31)
    else:
        quarter_end_date = datetime(selected_year, quarter_months[-1] + 1, 1) - timedelta(days=1)
    today_date, yesterday_date = dashboard1_analysis_today_yesterday(selected_year, selected_month)

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

        sales_analysis = {
            "today": fetch_sales_analysis_bucket(cursor, today_date, today_date),
            "yesterday": fetch_sales_analysis_bucket(cursor, yesterday_date, yesterday_date),
            "month": fetch_sales_analysis_bucket(cursor, current_month_start, current_month_end),
            "quarter": fetch_sales_analysis_bucket(cursor, quarter_start_date, quarter_end_date),
            "financial_year": fetch_sales_analysis_bucket(cursor, fy_start_date, fy_end_date),
        }
        
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
            "month_values": [sales_map_lakhs[m] for m in month_order],
            "analysis": sales_analysis,
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


PURCHASE_ANALYSIS_PO_SQL = """
    SELECT SUM(ISNULL(amount, 0)) AS total_amount
    FROM PODet
    WHERE pono IN (
        SELECT DISTINCT pono
        FROM POMas
        WHERE CAST(podate AS DATE) BETWEEN ? AND ?
          AND deleted = 0
    )
      AND deleted = 0
"""

PURCHASE_ANALYSIS_GRN_SQL = """
    SELECT SUM(ISNULL(Amount, 0)) AS total_amount
    FROM Grn_RateDet
    WHERE grnno IN (
        SELECT grnno
        FROM grn_mas
        WHERE CAST(grndate AS DATE) BETWEEN ? AND ?
          AND deleted = 0
    )
      AND deleted = 0
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


def fetch_purchase_analysis_bucket(cursor, start_date, end_date):
    po_amount = fetch_period_total(cursor, PURCHASE_ANALYSIS_PO_SQL, start_date, end_date)
    grn_amount = fetch_period_total(cursor, PURCHASE_ANALYSIS_GRN_SQL, start_date, end_date)
    return {
        "po": po_amount,
        "grn": grn_amount,
    }


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
    quarter_months = get_quarter_months(selected_month)
    quarter_start_date = datetime(selected_year, quarter_months[0], 1)
    if quarter_months[-1] == 12:
        quarter_end_date = datetime(selected_year, 12, 31)
    else:
        quarter_end_date = datetime(selected_year, quarter_months[-1] + 1, 1) - timedelta(days=1)
    today_date, yesterday_date = dashboard1_analysis_today_yesterday(selected_year, selected_month)

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
        purchase_analysis = {
            "today": fetch_purchase_analysis_bucket(cursor, today_date, today_date),
            "yesterday": fetch_purchase_analysis_bucket(cursor, yesterday_date, yesterday_date),
            "month": fetch_purchase_analysis_bucket(cursor, current_month_start, current_month_end),
            "quarter": fetch_purchase_analysis_bucket(cursor, quarter_start_date, quarter_end_date),
            "financial_year": fetch_purchase_analysis_bucket(cursor, fy_start_date, fy_end_date),
        }
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    payload = build_dashboard1_kpi_payload(
        "Purchase Value",
        current_month_total,
        prev_month_total,
        month_totals,
        selected_month,
        fy_start_year,
    )
    payload["analysis"] = purchase_analysis

    return Response({
        "success": True,
        "data": payload,
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


def overall_efficiency_date_params(start_date, end_date):
    return [start_date, end_date, start_date, end_date, start_date, end_date]


OVERALL_EFFICIENCY_AVG_SQL = """
SELECT AVG(CAST(OAEFF AS FLOAT)) AS Avg_OAEFF
FROM (
    SELECT proddate AS dt, OAEFF FROM ProductionEntry
    WHERE CAST(proddate AS DATE) BETWEEN ? AND ? AND deleted = 0 AND OAEFF IS NOT NULL
    UNION ALL
    SELECT entrydate AS dt, OAEFF FROM ConvProductionEntry
    WHERE CAST(entrydate AS DATE) BETWEEN ? AND ? AND deleted = 0 AND OAEFF IS NOT NULL
    UNION ALL
    SELECT entrydate AS dt, OAEFF FROM ConvProductionEntryRod
    WHERE CAST(entrydate AS DATE) BETWEEN ? AND ? AND deleted = 0 AND OAEFF IS NOT NULL
) AS X
"""


def fetch_overall_efficiency_avg(cursor, start_date, end_date):
    """Same OA efficiency logic as overall_efficiency_monthwise, for a date range."""
    cursor.execute(OVERALL_EFFICIENCY_AVG_SQL, overall_efficiency_date_params(start_date, end_date))
    row = cursor.fetchone()
    if not row or row[0] is None:
        return 0.0
    return round(float(row[0] or 0), 2)


def fetch_production_analysis_bucket(cursor, start_date, end_date):
    return {"oa_eff": fetch_overall_efficiency_avg(cursor, start_date, end_date)}


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
    quarter_months = get_quarter_months(selected_month)
    quarter_start_date = datetime(selected_year, quarter_months[0], 1)
    if quarter_months[-1] == 12:
        quarter_end_date = datetime(selected_year, 12, 31)
    else:
        quarter_end_date = datetime(selected_year, quarter_months[-1] + 1, 1) - timedelta(days=1)
    today_date, yesterday_date = dashboard1_analysis_today_yesterday(selected_year, selected_month)

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
        production_analysis = {
            "today": fetch_production_analysis_bucket(cursor, today_date, today_date),
            "yesterday": fetch_production_analysis_bucket(cursor, yesterday_date, yesterday_date),
            "month": fetch_production_analysis_bucket(cursor, current_month_start, current_month_end),
            "quarter": fetch_production_analysis_bucket(cursor, quarter_start_date, quarter_end_date),
            "financial_year": fetch_production_analysis_bucket(cursor, fy_start_date, fy_end_date),
        }
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    payload = build_dashboard1_kpi_payload(
        "Production Value",
        current_month_total,
        prev_month_total,
        month_totals,
        selected_month,
        fy_start_year,
    )
    payload["analysis"] = production_analysis

    return Response({
        "success": True,
        "data": payload,
    })


QUALITY_VALUE_BASE_CTE = """
WITH CTE_Rejection AS (
    SELECT
        CONVERT(DATE, IM.inspdate) AS RejDate,
        DATENAME(MONTH, IM.inspdate) + '-' + CAST(YEAR(IM.inspdate) AS VARCHAR) AS Mnth,
        D.PartNo,
        D.Process,
        CAST(ISNULL(D.matrej, 0) + ISNULL(D.macrej, 0) AS FLOAT) AS RejectionQty,
        'INJOB' AS RejSource
    FROM InJob_Det D
    INNER JOIN InJob_Mas IM
        ON D.inspno = IM.inspno
    WHERE
        ISNULL(D.deleted, 0) = 0
        AND ISNULL(IM.deleted, 0) = 0
        AND (ISNULL(D.matrej, 0) > 0 OR ISNULL(D.macrej, 0) > 0)

    UNION ALL

    SELECT
        CONVERT(DATE, FM.finspdate) AS RejDate,
        DATENAME(MONTH, FM.finspdate) + '-' + CAST(YEAR(FM.finspdate) AS VARCHAR) AS Mnth,
        F.PartNo,
        F.Process,
        CAST(ISNULL(F.qty, 0) AS FLOAT) AS RejectionQty,
        'FINAL INSPECTION' AS RejSource
    FROM FinalInspRejectionEntryOrg F
    INNER JOIN FinalInspectionEntry FM
        ON F.finspno = FM.finspno
    WHERE
        ISNULL(F.deleted, 0) = 0
        AND ISNULL(FM.deleted, 0) = 0

    UNION ALL

    SELECT
        CONVERT(DATE, IIM.inter_inspdate) AS RejDate,
        DATENAME(MONTH, IIM.inter_inspdate) + '-' + CAST(YEAR(IIM.inter_inspdate) AS VARCHAR) AS Mnth,
        IR.PartNo,
        IR.Process,
        CAST(ISNULL(IR.qty, 0) AS FLOAT) AS RejectionQty,
        'INTER INSPECTION' AS RejSource
    FROM Insp_RejectionEntry IR
    INNER JOIN InterInspectionEntry IIM
        ON IR.inter_inspno = IIM.inter_inspno
    WHERE
        ISNULL(IR.deleted, 0) = 0
        AND ISNULL(IIM.deleted, 0) = 0
),
CTE_PartType AS (
    SELECT
        R.*,
        CASE
            WHEN WM.PartNo IS NOT NULL THEN 'With Material'
            WHEN CJ.PartNo IS NOT NULL THEN 'Customer Job Raw Material'
            WHEN PM.PartNo IS NOT NULL THEN 'Customer Product'
            ELSE 'Unknown'
        END AS PartType,
        WM.RmName,
        WM.Rmuom,
        CAST(WM.WtQty AS FLOAT) AS WtQty,
        CAST(WM.TotMmLength AS FLOAT) AS TotMmLength
    FROM CTE_Rejection R
    LEFT JOIN WithMatMas WM
        ON R.PartNo = WM.PartNo
        AND ISNULL(WM.deleted, 0) = 0
    LEFT JOIN CustJobRawMat CJ
        ON R.PartNo = CJ.PartNo
        AND ISNULL(CJ.deleted, 0) = 0
    LEFT JOIN ProductMast PM
        ON R.PartNo = PM.PartNo
        AND ISNULL(PM.deleted, 0) = 0
),
CTE_RejSeq AS (
    SELECT
        P.*,
        PSD.seq AS RejSeq
    FROM CTE_PartType P
    LEFT JOIN ProcessSeqDet PSD
        ON P.PartNo = PSD.partno
        AND P.Process = PSD.process
        AND ISNULL(PSD.deleted, 0) = 0
),
CTE_ProcessCalc AS (
    SELECT
        R.*,
        (
            SELECT
                SUM(CAST(ISNULL(CPD.Rate, 0) AS FLOAT))
            FROM ProcessSeqDet PSD
            LEFT JOIN Commer_ProcDet CPD
                ON PSD.partno = CPD.PartNo
                AND PSD.process = CPD.Process
                AND ISNULL(CPD.deleted, 0) = 0
            WHERE
                PSD.partno = R.PartNo
                AND ISNULL(PSD.deleted, 0) = 0
                AND PSD.seq <= R.RejSeq
        ) AS ProcessRate,
        (
            SELECT TOP 1 CAST(CBD.BaseRate AS FLOAT)
            FROM Commer_BaseRateDet CBD
            WHERE
                CBD.PartNo = R.PartNo
                AND ISNULL(CBD.deleted, 0) = 0
            ORDER BY CBD.BReffdt DESC
        ) AS FallbackBaseRate
    FROM CTE_RejSeq R
),
CTE_RMRate AS (
    SELECT
        C.*,
        (
            SELECT TOP 1 CAST(CBD.BaseRate AS FLOAT)
            FROM Commer_BaseRateDet CBD
            INNER JOIN Commer_Mas CM
                ON CBD.cmno = CM.cmno
            WHERE
                CBD.PartNo = C.RmName
                AND ISNULL(CBD.deleted, 0) = 0
                AND ISNULL(CM.deleted, 0) = 0
                AND CM.btype = 'Raw Material'
            ORDER BY CBD.BReffdt DESC
        ) AS RMRate
    FROM CTE_ProcessCalc C
),
CTE_QualityValue AS (
    SELECT
        RejDate,
        (
            CASE
                WHEN PartType = 'With Material' AND Rmuom = 'NOS' THEN ISNULL(RMRate, 0) * RejectionQty
                WHEN PartType = 'With Material' AND Rmuom = 'KGS' THEN ISNULL(WtQty, 0) * ISNULL(RMRate, 0) * RejectionQty
                WHEN PartType = 'With Material' AND Rmuom = 'MTRS' THEN (ISNULL(TotMmLength, 0) / 1000.0) * ISNULL(RMRate, 0) * RejectionQty
                ELSE 0
            END
        ) + (
            CASE
                WHEN ISNULL(ProcessRate, 0) > 0 THEN ProcessRate * RejectionQty
                ELSE ISNULL(FallbackBaseRate, 0) * RejectionQty
            END
        ) AS TotalQualityValue
    FROM CTE_RMRate
)
"""

QUALITY_VALUE_MONTHWISE_SQL = QUALITY_VALUE_BASE_CTE + """
SELECT
    MONTH(RejDate) AS month_num,
    SUM(TotalQualityValue) AS total_amount
FROM CTE_QualityValue
WHERE CAST(RejDate AS DATE) BETWEEN ? AND ?
GROUP BY MONTH(RejDate)
ORDER BY month_num
"""

QUALITY_VALUE_TOTAL_SQL = QUALITY_VALUE_BASE_CTE + """
SELECT SUM(TotalQualityValue) AS total_amount
FROM CTE_QualityValue
WHERE CAST(RejDate AS DATE) BETWEEN ? AND ?
"""


@api_view(["GET"])
def dashboard1_quality_value_kpi(request):
    """Dashboard1 - Quality Value KPI using rejection cost logic."""
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
        month_totals = fetch_month_totals(cursor, QUALITY_VALUE_MONTHWISE_SQL, fy_start_date, fy_end_date)
        current_month_total = fetch_period_total(cursor, QUALITY_VALUE_TOTAL_SQL, current_month_start, current_month_end)
        prev_month_total = fetch_period_total(cursor, QUALITY_VALUE_TOTAL_SQL, prev_month_start, prev_month_end)
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "success": True,
        "data": build_dashboard1_kpi_payload(
            "Quality Value",
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

PURCHASE_PROJECTIONS_SQL = """
    SELECT
        ISNULL(PO.MonthYear, GRN.MonthYear) AS MonthYear,
        ISNULL(PO.PO_Amount, 0) AS PO_Amount,
        ISNULL(GRN.GRN_Amount, 0) AS GRN_Amount
    FROM
    (
        SELECT
            YEAR(PM.podate) AS Yr,
            MONTH(PM.podate) AS Mn,
            DATENAME(MONTH, PM.podate) + '-' + CAST(YEAR(PM.podate) AS VARCHAR(4)) AS MonthYear,
            SUM(ISNULL(PD.amount, 0)) AS PO_Amount
        FROM POMas PM
        INNER JOIN PODet PD
            ON PM.pono = PD.pono
        WHERE
            PM.deleted = 0
            AND PD.deleted = 0
            AND YEAR(PM.podate) = ?
            AND MONTH(PM.podate) = ?
        GROUP BY
            YEAR(PM.podate),
            MONTH(PM.podate),
            DATENAME(MONTH, PM.podate)
    ) PO
    FULL OUTER JOIN
    (
        SELECT
            YEAR(GM.grndate) AS Yr,
            MONTH(GM.grndate) AS Mn,
            DATENAME(MONTH, GM.grndate) + '-' + CAST(YEAR(GM.grndate) AS VARCHAR(4)) AS MonthYear,
            SUM(ISNULL(GRD.Amount, 0)) AS GRN_Amount
        FROM grn_mas GM
        INNER JOIN Grn_RateDet GRD
            ON GM.grnno = GRD.grnno
        WHERE
            GM.deleted = 0
            AND GRD.deleted = 0
            AND YEAR(GM.grndate) = ?
            AND MONTH(GM.grndate) = ?
        GROUP BY
            YEAR(GM.grndate),
            MONTH(GM.grndate),
            DATENAME(MONTH, GM.grndate)
    ) GRN
        ON PO.Yr = GRN.Yr
        AND PO.Mn = GRN.Mn
    ORDER BY
        ISNULL(PO.Yr, GRN.Yr),
        ISNULL(PO.Mn, GRN.Mn)
"""


@api_view(["GET"])
def dashboard1_sales_projections(request):
    """Dashboard1 - Sales vs PO for the selected month (same logic as po_vs_sales)."""
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date, selected_year, selected_month = parse_dashboard1_period(request)
    month_label = datetime(selected_year, selected_month, 1).strftime("%b")

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


@api_view(["GET"])
def dashboard1_purchase_projections(request):
    """Dashboard1 - Purchase PO vs GRN for the selected month using the provided SQL logic."""
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    _, _, selected_year, selected_month = parse_dashboard1_period(request)
    month_label = datetime(selected_year, selected_month, 1).strftime("%b")
    month_year_label = datetime(selected_year, selected_month, 1).strftime("%B-%Y")

    try:
        cursor = conn.cursor()
        cursor.execute(
            PURCHASE_PROJECTIONS_SQL,
            (selected_year, selected_month, selected_year, selected_month),
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    po_amount = float(row[1] or 0) if row else 0.0
    grn_amount = float(row[2] or 0) if row else 0.0

    return Response({
        "success": True,
        "data": {
            "labels": [month_label],
            "month_year": row[0] if row and row[0] else month_year_label,
            "po": [round(po_amount / 100_000, 2)],
            "grn": [round(grn_amount / 100_000, 2)],
            "po_amount": [po_amount],
            "grn_amount": [grn_amount],
            "year": selected_year,
            "month": selected_month,
        },
    })


OA_EFFICIENCY_WEEKLY_SQL = """
    SELECT
        CASE
            WHEN DAY(dt) BETWEEN 1 AND 7 THEN 1
            WHEN DAY(dt) BETWEEN 8 AND 14 THEN 2
            WHEN DAY(dt) BETWEEN 15 AND 21 THEN 3
            WHEN DAY(dt) BETWEEN 22 AND 28 THEN 4
            ELSE 5
        END AS WeekNum,
        AVG(CAST(OAEFF AS FLOAT)) AS Avg_OAEFF
    FROM (
        SELECT CAST(proddate AS DATE) AS dt, OAEFF
        FROM ProductionEntry
        WHERE CAST(proddate AS DATE) BETWEEN ? AND ?
          AND deleted = 0
          AND OAEFF IS NOT NULL

        UNION ALL

        SELECT CAST(entrydate AS DATE) AS dt, OAEFF
        FROM ConvProductionEntry
        WHERE CAST(entrydate AS DATE) BETWEEN ? AND ?
          AND deleted = 0
          AND OAEFF IS NOT NULL

        UNION ALL

        SELECT CAST(entrydate AS DATE) AS dt, OAEFF
        FROM ConvProductionEntryRod
        WHERE CAST(entrydate AS DATE) BETWEEN ? AND ?
          AND deleted = 0
          AND OAEFF IS NOT NULL
    ) AS X
    GROUP BY
        CASE
            WHEN DAY(dt) BETWEEN 1 AND 7 THEN 1
            WHEN DAY(dt) BETWEEN 8 AND 14 THEN 2
            WHEN DAY(dt) BETWEEN 15 AND 21 THEN 3
            WHEN DAY(dt) BETWEEN 22 AND 28 THEN 4
            ELSE 5
        END
    ORDER BY WeekNum
"""


@api_view(["GET"])
def dashboard1_oa_efficiency_weekly(request):
    """Dashboard1 - OA Efficiency grouped week-wise inside the selected month."""
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date, selected_year, selected_month = parse_dashboard1_period(request)
    labels = ["W1", "W2", "W3", "W4", "W5"]
    week_map = {1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0, 5: 0.0}

    try:
        cursor = conn.cursor()
        params = [start_date, end_date, start_date, end_date, start_date, end_date]
        cursor.execute(OA_EFFICIENCY_WEEKLY_SQL, params)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    for week_num, avg_eff in rows:
        if week_num in week_map:
            week_map[int(week_num)] = round(float(avg_eff or 0), 2)

    return Response({
        "success": True,
        "data": {
            "labels": labels,
            "data": [week_map[1], week_map[2], week_map[3], week_map[4], week_map[5]],
            "year": selected_year,
            "month": selected_month,
        },
    })


QUALITY_REJECTIONS_WEEKLY_SQL = """
    SELECT
        WeekNum,
        SUM(MaterialQty) AS MaterialQty,
        SUM(MachineQty) AS MachineQty
    FROM (
        SELECT
            CASE
                WHEN DAY(M.inspdate) BETWEEN 1 AND 7 THEN 1
                WHEN DAY(M.inspdate) BETWEEN 8 AND 14 THEN 2
                WHEN DAY(M.inspdate) BETWEEN 15 AND 21 THEN 3
                WHEN DAY(M.inspdate) BETWEEN 22 AND 28 THEN 4
                ELSE 5
            END AS WeekNum,
            CAST(ISNULL(D.matrej, 0) AS FLOAT) AS MaterialQty,
            CAST(ISNULL(D.macrej, 0) AS FLOAT) AS MachineQty
        FROM InJob_Det D
        INNER JOIN InJob_Mas M
            ON D.inspno = M.inspno
        WHERE
            CAST(M.inspdate AS DATE) BETWEEN ? AND ?
            AND ISNULL(M.deleted, 0) = 0
            AND ISNULL(D.deleted, 0) = 0
            AND (ISNULL(D.macrej, 0) > 0 OR ISNULL(D.matrej, 0) > 0)

        UNION ALL

        SELECT
            CASE
                WHEN DAY(I.inter_inspdate) BETWEEN 1 AND 7 THEN 1
                WHEN DAY(I.inter_inspdate) BETWEEN 8 AND 14 THEN 2
                WHEN DAY(I.inter_inspdate) BETWEEN 15 AND 21 THEN 3
                WHEN DAY(I.inter_inspdate) BETWEEN 22 AND 28 THEN 4
                ELSE 5
            END AS WeekNum,
            CASE
                WHEN ISNULL(REJ.matrej, 0) = 1 THEN CAST(ISNULL(R.qty, 0) AS FLOAT)
                ELSE CAST(0 AS FLOAT)
            END AS MaterialQty,
            CASE
                WHEN ISNULL(REJ.matrej, 0) = 1 THEN CAST(0 AS FLOAT)
                ELSE CAST(ISNULL(R.qty, 0) AS FLOAT)
            END AS MachineQty
        FROM Insp_RejectionEntry R
        INNER JOIN InterInspectionEntry I
            ON R.inter_inspno = I.inter_inspno
        INNER JOIN Rejection REJ
            ON R.rejection = REJ.rejection
        WHERE
            CAST(I.inter_inspdate AS DATE) BETWEEN ? AND ?
            AND ISNULL(I.deleted, 0) = 0
            AND ISNULL(R.deleted, 0) = 0
            AND ISNULL(REJ.deleted, 0) = 0
            AND ISNULL(R.qty, 0) > 0

        UNION ALL

        SELECT
            CASE
                WHEN DAY(FI.finspdate) BETWEEN 1 AND 7 THEN 1
                WHEN DAY(FI.finspdate) BETWEEN 8 AND 14 THEN 2
                WHEN DAY(FI.finspdate) BETWEEN 15 AND 21 THEN 3
                WHEN DAY(FI.finspdate) BETWEEN 22 AND 28 THEN 4
                ELSE 5
            END AS WeekNum,
            CASE
                WHEN ISNULL(REJ.matrej, 0) = 1 THEN CAST(ISNULL(F.qty, 0) AS FLOAT)
                ELSE CAST(0 AS FLOAT)
            END AS MaterialQty,
            CASE
                WHEN ISNULL(REJ.matrej, 0) = 1 THEN CAST(0 AS FLOAT)
                ELSE CAST(ISNULL(F.qty, 0) AS FLOAT)
            END AS MachineQty
        FROM FinalInspRejectionEntryOrg F
        INNER JOIN FinalInspectionEntry FI
            ON F.finspno = FI.finspno
        INNER JOIN Rejection REJ
            ON F.rejection = REJ.rejection
        WHERE
            CAST(FI.finspdate AS DATE) BETWEEN ? AND ?
            AND ISNULL(FI.deleted, 0) = 0
            AND ISNULL(F.deleted, 0) = 0
            AND ISNULL(REJ.deleted, 0) = 0
            AND ISNULL(F.qty, 0) > 0
    ) AS WeeklyRejections
    GROUP BY WeekNum
    ORDER BY WeekNum
"""


QUALITY_REJECTIONS_PERIOD_SUM_SQL = """
SELECT
    SUM(MaterialQty) AS MaterialQty,
    SUM(MachineQty) AS MachineQty
FROM (
    SELECT
        CAST(ISNULL(D.matrej, 0) AS FLOAT) AS MaterialQty,
        CAST(ISNULL(D.macrej, 0) AS FLOAT) AS MachineQty
    FROM InJob_Det D
    INNER JOIN InJob_Mas M
        ON D.inspno = M.inspno
    WHERE
        CAST(M.inspdate AS DATE) BETWEEN ? AND ?
        AND ISNULL(M.deleted, 0) = 0
        AND ISNULL(D.deleted, 0) = 0
        AND (ISNULL(D.macrej, 0) > 0 OR ISNULL(D.matrej, 0) > 0)

    UNION ALL

    SELECT
        CASE
            WHEN ISNULL(REJ.matrej, 0) = 1 THEN CAST(ISNULL(R.qty, 0) AS FLOAT)
            ELSE CAST(0 AS FLOAT)
        END AS MaterialQty,
        CASE
            WHEN ISNULL(REJ.matrej, 0) = 1 THEN CAST(0 AS FLOAT)
            ELSE CAST(ISNULL(R.qty, 0) AS FLOAT)
        END AS MachineQty
    FROM Insp_RejectionEntry R
    INNER JOIN InterInspectionEntry I
        ON R.inter_inspno = I.inter_inspno
    INNER JOIN Rejection REJ
        ON R.rejection = REJ.rejection
    WHERE
        CAST(I.inter_inspdate AS DATE) BETWEEN ? AND ?
        AND ISNULL(I.deleted, 0) = 0
        AND ISNULL(R.deleted, 0) = 0
        AND ISNULL(REJ.deleted, 0) = 0
        AND ISNULL(R.qty, 0) > 0

    UNION ALL

    SELECT
        CASE
            WHEN ISNULL(REJ.matrej, 0) = 1 THEN CAST(ISNULL(F.qty, 0) AS FLOAT)
            ELSE CAST(0 AS FLOAT)
        END AS MaterialQty,
        CASE
            WHEN ISNULL(REJ.matrej, 0) = 1 THEN CAST(0 AS FLOAT)
            ELSE CAST(ISNULL(F.qty, 0) AS FLOAT)
        END AS MachineQty
    FROM FinalInspRejectionEntryOrg F
    INNER JOIN FinalInspectionEntry FI
        ON F.finspno = FI.finspno
    INNER JOIN Rejection REJ
        ON F.rejection = REJ.rejection
    WHERE
        CAST(FI.finspdate AS DATE) BETWEEN ? AND ?
        AND ISNULL(FI.deleted, 0) = 0
        AND ISNULL(F.deleted, 0) = 0
        AND ISNULL(REJ.deleted, 0) = 0
        AND ISNULL(F.qty, 0) > 0
) AS RejectionTotals
"""


def fetch_quality_rejection_period_totals(cursor, start_date, end_date):
    cursor.execute(
        QUALITY_REJECTIONS_PERIOD_SUM_SQL,
        [start_date, end_date, start_date, end_date, start_date, end_date],
    )
    row = cursor.fetchone()
    if not row:
        return {"material": 0.0, "machine": 0.0}
    return {
        "material": round(float(row[0] or 0), 2),
        "machine": round(float(row[1] or 0), 2),
    }


@api_view(["GET"])
def dashboard1_quality_rejections_weekly(request):
    """Dashboard1 — week-wise rejection chart for selected month + analysis buckets for the Quality Analysis table."""
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date, selected_year, selected_month = parse_dashboard1_period(request)
    fy_start_year = selected_year if selected_month >= 4 else selected_year - 1
    fy_start_date = datetime(fy_start_year, 4, 1)
    fy_end_date = datetime(fy_start_year + 1, 3, 31)
    quarter_months = get_quarter_months(selected_month)
    quarter_start_date = datetime(selected_year, quarter_months[0], 1)
    if quarter_months[-1] == 12:
        quarter_end_date = datetime(selected_year, 12, 31)
    else:
        quarter_end_date = datetime(selected_year, quarter_months[-1] + 1, 1) - timedelta(days=1)

    today_date, yesterday_date = dashboard1_analysis_today_yesterday(selected_year, selected_month)
    current_month_start = datetime(selected_year, selected_month, 1)
    if selected_month == 12:
        current_month_end = datetime(selected_year, 12, 31)
    else:
        current_month_end = datetime(selected_year, selected_month + 1, 1) - timedelta(days=1)

    labels = ["W1", "W2", "W3", "W4", "W5"]
    material_map = {1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0, 5: 0.0}
    machine_map = {1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0, 5: 0.0}

    try:
        cursor = conn.cursor()
        params = [start_date, end_date, start_date, end_date, start_date, end_date]
        cursor.execute(QUALITY_REJECTIONS_WEEKLY_SQL, params)
        rows = cursor.fetchall()

        analysis = {
            "today": fetch_quality_rejection_period_totals(cursor, today_date, today_date),
            "yesterday": fetch_quality_rejection_period_totals(cursor, yesterday_date, yesterday_date),
            "month": fetch_quality_rejection_period_totals(cursor, current_month_start, current_month_end),
            "quarter": fetch_quality_rejection_period_totals(cursor, quarter_start_date, quarter_end_date),
            "financial_year": fetch_quality_rejection_period_totals(cursor, fy_start_date, fy_end_date),
        }

        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    for week_num, material_qty, machine_qty in rows:
        week_index = int(week_num)
        if week_index in material_map:
            material_map[week_index] = round(float(material_qty or 0), 2)
            machine_map[week_index] = round(float(machine_qty or 0), 2)

    return Response({
        "success": True,
        "data": {
            "labels": labels,
            "material": [material_map[1], material_map[2], material_map[3], material_map[4], material_map[5]],
            "machine": [machine_map[1], machine_map[2], machine_map[3], machine_map[4], machine_map[5]],
            "analysis": analysis,
            "fy_label": f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}",
            "year": selected_year,
            "month": selected_month,
        },
    })

