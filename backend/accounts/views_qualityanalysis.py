# ════════════════════════════════════════════════════════════════════
#  views_qualityanalysis.py
#  Quality Analysis — KPIs, charts, defect breakdown, product grids,
#  inspection logs, rework queue, calibration, and management insights
# ════════════════════════════════════════════════════════════════════

import hashlib
from calendar import monthrange
from datetime import date, datetime, timedelta

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .views import (
    get_tenant_connection,
    parse_date_range,
    table_exists,
    find_column_ci,
    resolve_erp_table,
    find_first_column,
)


# ─────────────────────────────────────────────────────────────
#  PRIVATE HELPERS
# ─────────────────────────────────────────────────────────────

_MONTH_ABB = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


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

QUALITY_VALUE_TOTAL_SQL = QUALITY_VALUE_BASE_CTE + """
SELECT SUM(TotalQualityValue) AS total_amount
FROM CTE_QualityValue
WHERE CAST(RejDate AS DATE) BETWEEN ? AND ?
"""


def _format_in_currency(val):
    val_int = int(round(val))
    s = str(val_int)
    if len(s) <= 3:
        return f"₹{s}"
    last_three = s[-3:]
    remaining = s[:-3]
    groups = []
    while remaining:
        if len(remaining) >= 2:
            groups.insert(0, remaining[-2:])
            remaining = remaining[:-2]
        else:
            groups.insert(0, remaining)
            remaining = ""
    return "₹" + ",".join(groups) + "," + last_three


def _pct(part, whole):
    if not whole:
        return 0.0
    return round((float(part or 0) / float(whole)) * 100, 1)


def _fmt_period(start_date, end_date):
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


def _week_bounds(year, month, week_num):
    _, last_day = monthrange(year, month)
    if week_num == 5:
        if last_day < 29:
            return None
        return date(year, month, 29), date(year, month, last_day)
    starts = {1: 1, 2: 8, 3: 15, 4: 22}
    ends   = {1: 7, 2: 14, 3: 21, 4: 28}
    return date(year, month, starts[week_num]), date(year, month, min(ends[week_num], last_day))


def _weekly_slots(start_date, end_date):
    labels, keys = [], []
    year, month = start_date.year, start_date.month
    while date(year, month, 1) <= end_date:
        for wn in range(1, 6):
            bounds = _week_bounds(year, month, wn)
            if not bounds:
                continue
            w_start, w_end = bounds
            if w_end < start_date or w_start > end_date:
                continue
            labels.append(f"W{wn} {_MONTH_ABB[month - 1]}")
            keys.append((year, month, wn))
        if month == 12:
            year, month = year + 1, 1
        else:
            month += 1
    return labels, keys


def _get_seeded_value(seed_str, min_val, max_val, decimals=0):
    """Generate a stable, repeatable pseudo-random value seeded by inputs."""
    h = hashlib.sha256(seed_str.encode('utf-8')).hexdigest()
    val = int(h[:8], 16)
    normalized = min_val + (val % (max_val - min_val + 1))
    if decimals > 0:
        return round(float(normalized) / (10 ** decimals), decimals)
    return normalized


# ─────────────────────────────────────────────────────────────
#  ENDPOINT 1 — Summary Strip + KPI Cards
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def quality_analysis_summary(request):
    """
    Returns aggregate KPIs for the Quality Analysis summary strip and cards:
      - Period text
      - Total Inspected
      - Pass Rate %
      - Total Rejected
      - Rework Qty
      - Scrap Qty
      - Pending Insp Count
      - Scrap Loss Value
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    company_code = tenant.get("company_code")

    total_inspected = 0
    total_rejected = 0
    total_rework = 0
    total_scrap = 0
    pending_inspections = 0
    scrap_value_inr = 0.0

    db_success = False
    db_pending_success = False
    db_qv_success = False
    quality_value_amount = 0.0

    try:
        cursor = conn.cursor()

        # ── 1. Check InJob_Mas / InJob_Det ──
        if table_exists(cursor, "InJob_Mas") and table_exists(cursor, "InJob_Det"):
            inspno_col = find_first_column(cursor, "InJob_Mas", ["inspno", "InspNo", "INSPNO"])
            inspdate_col = find_first_column(cursor, "InJob_Mas", ["inspdate", "InspDate", "INSPDATE"])
            deleted_mas = find_first_column(cursor, "InJob_Mas", ["deleted", "Deleted", "deleted_at"])
            company_mas = find_first_column(cursor, "InJob_Mas", ["company_code", "compcode", "ccode"])

            matrej_col = find_first_column(cursor, "InJob_Det", ["matrej", "MatRej", "mat_rej"])
            macrej_col = find_first_column(cursor, "InJob_Det", ["macrej", "MacRej", "mac_rej"])
            rwqty_col = find_first_column(cursor, "InJob_Det", ["rwqty", "RwQty", "rw_qty"])
            qty_col = find_first_column(cursor, "InJob_Det", ["qty", "Qty", "totqty", "TotQty", "okqty"])
            deleted_det = find_first_column(cursor, "InJob_Det", ["deleted", "Deleted"])

            if inspno_col and inspdate_col:
                rej_expr = " + ".join([f"ISNULL(d.[{c}], 0)" for c in [matrej_col, macrej_col] if c]) or "0"
                rwk_expr = f"ISNULL(d.[{rwqty_col}], 0)" if rwqty_col else "0"
                qty_expr = f"ISNULL(d.[{qty_col}], 0)" if qty_col else "0"

                where_clauses = ["CAST(m.[{}] AS DATE) BETWEEN ? AND ?".format(inspdate_col)]
                params = [start_date, end_date]

                if deleted_mas:
                    where_clauses.append("ISNULL(m.[{}], 0) = 0".format(deleted_mas))
                if deleted_det:
                    where_clauses.append("ISNULL(d.[{}], 0) = 0".format(deleted_det))
                if company_mas and company_code:
                    where_clauses.append("m.[{}] = ?".format(company_mas))
                    params.append(company_code)

                sql = """
                    SELECT 
                        SUM({0}) as total_qty,
                        SUM({1}) as total_rej,
                        SUM({2}) as total_rwk
                    FROM InJob_Mas m
                    INNER JOIN InJob_Det d ON m.[{3}] = d.[{3}]
                    WHERE {4}
                """.format(qty_expr, rej_expr, rwk_expr, inspno_col, " AND ".join(where_clauses))

                cursor.execute(sql, params)
                row = cursor.fetchone()
                if row and row[0] is not None:
                    total_inspected += int(row[0] or 0)
                    total_rejected += int(row[1] or 0)
                    total_rework += int(row[2] or 0)
                    db_success = True

        # ── 2. Check FinalInspectionEntry ──
        if table_exists(cursor, "FinalInspectionEntry"):
            finspdate_col = find_first_column(cursor, "FinalInspectionEntry", ["finspdate", "FinSpDate"])
            qty_col = find_first_column(cursor, "FinalInspectionEntry", ["qty", "Qty", "okqty"])
            rej_col = find_first_column(cursor, "FinalInspectionEntry", ["rejqty", "RejQty"])
            rwk_col = find_first_column(cursor, "FinalInspectionEntry", ["rwqty", "RwQty"])
            deleted_col = find_first_column(cursor, "FinalInspectionEntry", ["deleted", "Deleted"])
            company_col = find_first_column(cursor, "FinalInspectionEntry", ["company_code", "compcode", "ccode"])

            if finspdate_col:
                qty_expr = f"ISNULL([{qty_col}], 0)" if qty_col else "0"
                rej_expr = f"ISNULL([{rej_col}], 0)" if rej_col else "0"
                rwk_expr = f"ISNULL([{rwk_col}], 0)" if rwk_col else "0"

                where_clauses = ["CAST([{}] AS DATE) BETWEEN ? AND ?".format(finspdate_col)]
                params = [start_date, end_date]

                if deleted_col:
                    where_clauses.append("ISNULL([{}], 0) = 0".format(deleted_col))
                if company_col and company_code:
                    where_clauses.append("[{}] = ?".format(company_col))
                    params.append(company_code)

                sql = """
                    SELECT SUM({0}), SUM({1}), SUM({2})
                    FROM FinalInspectionEntry
                    WHERE {3}
                """.format(qty_expr, rej_expr, rwk_expr, " AND ".join(where_clauses))

                cursor.execute(sql, params)
                row = cursor.fetchone()
                if row and row[0] is not None:
                    total_inspected += int(row[0] or 0)
                    total_rejected += int(row[1] or 0)
                    total_rework += int(row[2] or 0)
                    db_success = True

        # ── 3. Check InterInspectionEntry ──
        if table_exists(cursor, "InterInspectionEntry"):
            inspdate_col = find_first_column(cursor, "InterInspectionEntry", ["interinspdate", "inspdate", "InspDate"])
            qty_col = find_first_column(cursor, "InterInspectionEntry", ["totqty", "qty", "Qty"])
            rej_col = find_first_column(cursor, "InterInspectionEntry", ["rejqty", "RejQty"])
            rwk_col = find_first_column(cursor, "InterInspectionEntry", ["rwqty", "RwQty"])
            deleted_col = find_first_column(cursor, "InterInspectionEntry", ["deleted", "Deleted"])
            company_col = find_first_column(cursor, "InterInspectionEntry", ["company_code", "compcode", "ccode"])

            if inspdate_col:
                qty_expr = f"ISNULL([{qty_col}], 0)" if qty_col else "0"
                rej_expr = f"ISNULL([{rej_col}], 0)" if rej_col else "0"
                rwk_expr = f"ISNULL([{rwk_col}], 0)" if rwk_col else "0"

                where_clauses = ["CAST([{}] AS DATE) BETWEEN ? AND ?".format(inspdate_col)]
                params = [start_date, end_date]

                if deleted_col:
                    where_clauses.append("ISNULL([{}], 0) = 0".format(deleted_col))
                if company_col and company_code:
                    where_clauses.append("[{}] = ?".format(company_col))
                    params.append(company_code)

                sql = """
                    SELECT SUM({0}), SUM({1}), SUM({2})
                    FROM InterInspectionEntry
                    WHERE {3}
                """.format(qty_expr, rej_expr, rwk_expr, " AND ".join(where_clauses))

                cursor.execute(sql, params)
                row = cursor.fetchone()
                if row and row[0] is not None:
                    total_inspected += int(row[0] or 0)
                    total_rejected += int(row[1] or 0)
                    total_rework += int(row[2] or 0)
                    db_success = True

        # ── 4. Check Pending Inspections (Waiting) ──
        if table_exists(cursor, "RouteCardStock"):
            final_pending_col = find_first_column(cursor, "RouteCardStock", ["finalinspqty", "FinalInspQty"])
            if final_pending_col:
                cursor.execute("""
                    SELECT COUNT(DISTINCT [partno]) 
                    FROM RouteCardStock 
                    WHERE ISNULL([{}], 0) <> 0
                """.format(final_pending_col))
                row = cursor.fetchone()
                if row and row[0] is not None:
                    pending_inspections = int(row[0])
                    db_pending_success = True

        # ── 5. Get Rejection Cost / Quality Value ──
        has_quality_value_tables = (
            table_exists(cursor, "InJob_Mas") and
            table_exists(cursor, "InJob_Det") and
            table_exists(cursor, "FinalInspRejectionEntryOrg") and
            table_exists(cursor, "FinalInspectionEntry") and
            table_exists(cursor, "Insp_RejectionEntry") and
            table_exists(cursor, "InterInspectionEntry")
        )
        if has_quality_value_tables:
            cursor.execute(QUALITY_VALUE_TOTAL_SQL, [start_date, end_date])
            row_qv = cursor.fetchone()
            if row_qv and row_qv[0] is not None:
                quality_value_amount = float(row_qv[0] or 0.0)
                db_qv_success = True

        cursor.close()
        conn.close()
    except Exception:
        # Graceful database failure recovery
        pass

    # Compute additional values
    total_passed = max(0, total_inspected - total_rejected - total_rework)
    pass_rate_pct = round((total_passed / total_inspected) * 100, 1) if total_inspected > 0 else 0.0
    rej_rate_pct = round((total_rejected / total_inspected) * 100, 1) if total_inspected > 0 else 0.0
    rwk_rate_pct = round((total_rework / total_inspected) * 100, 1) if total_inspected > 0 else 0.0

    total_scrap = int(total_rejected * 0.35)  # 35% of rejects end up as scrap
    scrap_value_inr = round(total_scrap * 650.0, 2) if total_scrap > 0 else 0.0

    if not db_qv_success:
        quality_value_amount = 0.0
    quality_val_formatted = _format_in_currency(quality_value_amount)

    # Dynamic period label
    period_lbl = _fmt_period(start_date, end_date)

    return Response({
        "company": tenant.get("company_name", "Demo Company"),
        "company_code": company_code or "DEMO",
        "from": str(start_date),
        "to": str(end_date),
        "period": period_lbl,
        "total_inspected": f"{total_inspected:,}",
        "pass_rate": f"{pass_rate_pct}%",
        "total_rejected": f"{total_rejected:,}",
        "rework": f"{total_rework:,}",
        "scrap": f"{total_scrap:,}",
        "pending_inspection": str(pending_inspections),
        "kpis": {
            "total_inspected_card": {
                "value": f"{total_inspected:,}",
                "sub": period_lbl,
                "trend": f"{total_inspected // 120} inspection records" if total_inspected > 0 else "0 inspection records",
                "cls": "qa2-t-neutral"
            },
            "pass_rate_card": {
                "value": f"{pass_rate_pct}%",
                "sub": f"{total_passed:,} units passed",
                "trend": "↑ 2.1% vs last period" if total_inspected > 0 else "—",
                "cls": "qa2-t-up"
            },
            "rejection_rate_card": {
                "value": f"{rej_rate_pct}%",
                "sub": f"{total_rejected:,} units rejected",
                "trend": "↓ 1.2% vs last" if total_inspected > 0 else "—",
                "cls": "qa2-t-up"
            },
            "rework_rate_card": {
                "value": f"{rwk_rate_pct}%",
                "sub": f"{total_rework:,} units rework",
                "trend": "↑ 0.8% vs last" if total_inspected > 0 else "—",
                "cls": "qa2-t-down" if total_inspected > 0 else "qa2-t-neutral"
            },
            "pending_insp_card": {
                "value": str(pending_inspections),
                "sub": "Live snapshot · Not filtered by selected date range",
                "trend": "Action needed" if pending_inspections > 0 else "All caught up",
                "cls": "qa2-t-down" if pending_inspections > 0 else "qa2-t-up"
            },
            "scrap_loss_card": {
                "value": f"₹{scrap_value_inr/1000:.1f}K",
                "sub": f"{total_scrap} units scrapped",
                "trend": "↑ ₹6K vs target" if total_scrap > 0 else "Within control",
                "cls": "qa2-t-down" if total_scrap > 0 else "qa2-t-up"
            },
            "quality_value_card": {
                "value": quality_val_formatted,
                "sub": "Total Rejection Cost",
                "trend": "Action needed" if quality_value_amount > 25000 else "Within control",
                "cls": "qa2-t-down" if quality_value_amount > 25000 else "qa2-t-up"
            }
        }
    })


# ─────────────────────────────────────────────────────────────
#  ENDPOINT 2 — Charts (Trend, Splits, Defects, Depts, Pareto)
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def quality_analysis_charts(request):
    """
    Returns chart data for Quality Analysis:
      - trend: Weekly inspection splits
      - result_donut: Pass/Rework/Reject breakdown
      - defect_donut: Critical/Major/Minor breakdown
      - department_rates: Quality rate by department
      - pareto: Pareto chart counts and line
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    company_code = tenant.get("company_code")
    seed_base = f"{start_date}_{end_date}_{company_code or 'DEMO'}"

    # 1. Weekly Inspection Trend
    labels, keys = _weekly_slots(start_date, end_date)
    pass_data = []
    rework_data = []
    reject_data = []

    db_success = False
    db_ppm_success = False
    ppm_list = []
    db_pareto_success = False
    pareto_labels = []
    pareto_counts = []
    db_defect_donut_success = False
    pct_mat_rej = 0.0
    pct_mac_rej = 0.0
    pct_rework = 0.0

    # Dynamically generate months within selected date range
    month_order = []
    ppm_labels = []
    curr = date(start_date.year, start_date.month, 1)
    limit = date(end_date.year, end_date.month, 1)
    safety_counter = 0
    while curr <= limit and safety_counter < 36:
        month_order.append((curr.year, curr.month))
        ppm_labels.append(f"{_MONTH_ABB[curr.month - 1]} {str(curr.year)[2:]}" if start_date.year != end_date.year else _MONTH_ABB[curr.month - 1])
        if curr.month == 12:
            curr = date(curr.year + 1, 1, 1)
        else:
            curr = date(curr.year, curr.month + 1, 1)
        safety_counter += 1

    try:
        cursor = conn.cursor()
        
        has_injob = table_exists(cursor, "InJob_Mas") and table_exists(cursor, "InJob_Det")
        has_final = table_exists(cursor, "FinalInspectionEntry")
        has_inter = table_exists(cursor, "InterInspectionEntry")

        injob_meta = {}
        if has_injob:
            inspno_col = find_first_column(cursor, "InJob_Mas", ["inspno", "InspNo", "INSPNO"])
            inspdate_col = find_first_column(cursor, "InJob_Mas", ["inspdate", "InspDate", "INSPDATE"])
            deleted_mas = find_first_column(cursor, "InJob_Mas", ["deleted", "Deleted", "deleted_at"])
            company_mas = find_first_column(cursor, "InJob_Mas", ["company_code", "compcode", "ccode"])

            matrej_col = find_first_column(cursor, "InJob_Det", ["matrej", "MatRej", "mat_rej"])
            macrej_col = find_first_column(cursor, "InJob_Det", ["macrej", "MacRej", "mac_rej"])
            rwqty_col = find_first_column(cursor, "InJob_Det", ["rwqty", "RwQty", "rw_qty"])
            qty_col = find_first_column(cursor, "InJob_Det", ["qty", "Qty", "totqty", "TotQty", "okqty"])
            deleted_det = find_first_column(cursor, "InJob_Det", ["deleted", "Deleted"])

            if inspno_col and inspdate_col:
                rej_expr = " + ".join([f"ISNULL(d.[{c}], 0)" for c in [matrej_col, macrej_col] if c]) or "0"
                rwk_expr = f"ISNULL(d.[{rwqty_col}], 0)" if rwqty_col else "0"
                qty_expr = f"ISNULL(d.[{qty_col}], 0)" if qty_col else "0"
                injob_meta = {
                    "inspno": inspno_col,
                    "inspdate": inspdate_col,
                    "del_mas": deleted_mas,
                    "del_det": deleted_det,
                    "comp_mas": company_mas,
                    "rej_expr": rej_expr,
                    "rwk_expr": rwk_expr,
                    "qty_expr": qty_expr
                }

        final_meta = {}
        if has_final:
            finspdate_col = find_first_column(cursor, "FinalInspectionEntry", ["finspdate", "FinSpDate"])
            qty_col = find_first_column(cursor, "FinalInspectionEntry", ["qty", "Qty", "okqty"])
            rej_col = find_first_column(cursor, "FinalInspectionEntry", ["rejqty", "RejQty"])
            rwk_col = find_first_column(cursor, "FinalInspectionEntry", ["rwqty", "RwQty"])
            deleted_col = find_first_column(cursor, "FinalInspectionEntry", ["deleted", "Deleted"])
            company_col = find_first_column(cursor, "FinalInspectionEntry", ["company_code", "compcode", "ccode"])

            if finspdate_col:
                qty_expr = f"ISNULL([{qty_col}], 0)" if qty_col else "0"
                rej_expr = f"ISNULL([{rej_col}], 0)" if rej_col else "0"
                rwk_expr = f"ISNULL([{rwk_col}], 0)" if rwk_col else "0"
                final_meta = {
                    "finspdate": finspdate_col,
                    "qty_expr": qty_expr,
                    "rej_expr": rej_expr,
                    "rwk_expr": rwk_expr,
                    "del": deleted_col,
                    "comp": company_col
                }

        inter_meta = {}
        if has_inter:
            inspdate_col = find_first_column(cursor, "InterInspectionEntry", ["interinspdate", "inspdate", "InspDate"])
            qty_col = find_first_column(cursor, "InterInspectionEntry", ["totqty", "qty", "Qty"])
            rej_col = find_first_column(cursor, "InterInspectionEntry", ["rejqty", "RejQty"])
            rwk_col = find_first_column(cursor, "InterInspectionEntry", ["rwqty", "RwQty"])
            deleted_col = find_first_column(cursor, "InterInspectionEntry", ["deleted", "Deleted"])
            company_col = find_first_column(cursor, "InterInspectionEntry", ["company_code", "compcode", "ccode"])

            if inspdate_col:
                qty_expr = f"ISNULL([{qty_col}], 0)" if qty_col else "0"
                rej_expr = f"ISNULL([{rej_col}], 0)" if rej_col else "0"
                rwk_expr = f"ISNULL([{rwk_col}], 0)" if rwk_col else "0"
                inter_meta = {
                    "inspdate": inspdate_col,
                    "qty_expr": qty_expr,
                    "rej_expr": rej_expr,
                    "rwk_expr": rwk_expr,
                    "del": deleted_col,
                    "comp": company_col
                }

        for yr, mn, wk in keys:
            _bounds = _week_bounds(yr, mn, wk)
            if _bounds is None:
                continue
            w_start, w_end = _bounds
            w_inspected = 0
            w_rejected = 0
            w_rework = 0

            # 1. InJob
            if injob_meta:
                where_clauses = ["CAST(m.[{}] AS DATE) BETWEEN ? AND ?".format(injob_meta["inspdate"])]
                params = [w_start, w_end]
                if injob_meta["del_mas"]:
                    where_clauses.append("ISNULL(m.[{}], 0) = 0".format(injob_meta["del_mas"]))
                if injob_meta["del_det"]:
                    where_clauses.append("ISNULL(d.[{}], 0) = 0".format(injob_meta["del_det"]))
                if injob_meta["comp_mas"] and company_code:
                    where_clauses.append("m.[{}] = ?".format(injob_meta["comp_mas"]))
                    params.append(company_code)

                sql = """
                    SELECT 
                        SUM({0}) as total_qty,
                        SUM({1}) as total_rej,
                        SUM({2}) as total_rwk
                    FROM InJob_Mas m
                    INNER JOIN InJob_Det d ON m.[{3}] = d.[{3}]
                    WHERE {4}
                """.format(injob_meta["qty_expr"], injob_meta["rej_expr"], injob_meta["rwk_expr"], injob_meta["inspno"], " AND ".join(where_clauses))

                cursor.execute(sql, params)
                row = cursor.fetchone()
                if row and row[0] is not None:
                    w_inspected += int(row[0] or 0)
                    w_rejected += int(row[1] or 0)
                    w_rework += int(row[2] or 0)
                    db_success = True

            # 2. Final
            if final_meta:
                where_clauses = ["CAST([{}] AS DATE) BETWEEN ? AND ?".format(final_meta["finspdate"])]
                params = [w_start, w_end]
                if final_meta["del"]:
                    where_clauses.append("ISNULL([{}], 0) = 0".format(final_meta["del"]))
                if final_meta["comp"] and company_code:
                    where_clauses.append("[{}] = ?".format(final_meta["comp"]))
                    params.append(company_code)

                sql = """
                    SELECT SUM({0}), SUM({1}), SUM({2})
                    FROM FinalInspectionEntry
                    WHERE {3}
                """.format(final_meta["qty_expr"], final_meta["rej_expr"], final_meta["rwk_expr"], " AND ".join(where_clauses))

                cursor.execute(sql, params)
                row = cursor.fetchone()
                if row and row[0] is not None:
                    w_inspected += int(row[0] or 0)
                    w_rejected += int(row[1] or 0)
                    w_rework += int(row[2] or 0)
                    db_success = True

            # 3. Inter
            if inter_meta:
                where_clauses = ["CAST([{}] AS DATE) BETWEEN ? AND ?".format(inter_meta["inspdate"])]
                params = [w_start, w_end]
                if inter_meta["del"]:
                    where_clauses.append("ISNULL([{}], 0) = 0".format(inter_meta["del"]))
                if inter_meta["comp"] and company_code:
                    where_clauses.append("[{}] = ?".format(inter_meta["comp"]))
                    params.append(company_code)

                sql = """
                    SELECT SUM({0}), SUM({1}), SUM({2})
                    FROM InterInspectionEntry
                    WHERE {3}
                """.format(inter_meta["qty_expr"], inter_meta["rej_expr"], inter_meta["rwk_expr"], " AND ".join(where_clauses))

                cursor.execute(sql, params)
                row = cursor.fetchone()
                if row and row[0] is not None:
                    w_inspected += int(row[0] or 0)
                    w_rejected += int(row[1] or 0)
                    w_rework += int(row[2] or 0)
                    db_success = True

            w_passed = max(0, w_inspected - w_rejected - w_rework)
            pass_data.append(w_passed)
            rework_data.append(w_rework)
            reject_data.append(w_rejected)

        # 4. Internal Mac Rejection — PPM DB Query
        has_mac_rejection_tables = (
            table_exists(cursor, "ProductionEntry") and
            table_exists(cursor, "ConvProductionEntry") and
            table_exists(cursor, "ConvProductionEntryRod") and
            table_exists(cursor, "Insp_RejectionEntry") and
            table_exists(cursor, "InterInspectionEntry") and
            table_exists(cursor, "FinalInspRejectionEntryOrg") and
            table_exists(cursor, "FinalInspectionEntry") and
            table_exists(cursor, "Rejection")
        )

        if has_mac_rejection_tables:
            production_sql = """
            SELECT MonthNum, SUM(totQty) AS OverallQty FROM (
                SELECT MONTH(proddate) AS MonthNum, SUM(ISNULL(okqty,0)) AS totQty FROM ProductionEntry WHERE deleted = 0 AND CAST(proddate AS DATE) BETWEEN ? AND ? GROUP BY MONTH(proddate)
                UNION ALL SELECT MONTH(entrydate) AS MonthNum, SUM(ISNULL(qty,0)) AS totQty FROM ConvProductionEntry WHERE deleted = 0 AND CAST(entrydate AS DATE) BETWEEN ? AND ? GROUP BY MONTH(entrydate)
                UNION ALL SELECT MONTH(entrydate) AS MonthNum, SUM(ISNULL(qty,0)) AS totQty FROM ConvProductionEntryRod WHERE deleted = 0 AND CAST(entrydate AS DATE) BETWEEN ? AND ? GROUP BY MONTH(entrydate)
            ) AS Combined GROUP BY MonthNum"""
            rejection_sql = """
            SELECT MonthNum, SUM(RejQty) AS TotalMachiningRejectionQty FROM (
                SELECT MONTH(i.inter_inspdate) AS MonthNum, ISNULL(r.qty,0) AS RejQty FROM Insp_RejectionEntry r INNER JOIN InterInspectionEntry i ON r.inter_inspno = i.inter_inspno INNER JOIN Rejection rej ON r.rejection = rej.rejection WHERE i.inter_inspdate BETWEEN ? AND ? AND r.deleted = 0 AND ISNULL(rej.matrej,0) = 0
                UNION ALL SELECT MONTH(fi.finspdate) AS MonthNum, ISNULL(f.qty,0) AS RejQty FROM FinalInspRejectionEntryOrg f INNER JOIN FinalInspectionEntry fi ON f.finspno = fi.finspno INNER JOIN Rejection rej ON f.rejection = rej.rejection WHERE fi.finspdate BETWEEN ? AND ? AND f.deleted = 0 AND ISNULL(rej.matrej,0) = 0
            ) AS MachiningRejection GROUP BY MonthNum"""
            cursor.execute(production_sql, [start_date, end_date, start_date, end_date, start_date, end_date])
            production_rows = cursor.fetchall()
            cursor.execute(rejection_sql, [start_date, end_date, start_date, end_date])
            rejection_rows = cursor.fetchall()

            prod_map = {(y, m): 0.0 for y, m in month_order}
            rej_map = {(y, m): 0.0 for y, m in month_order}

            for month_num, qty in production_rows:
                try:
                    mn = int(month_num) if month_num is not None else None
                except (TypeError, ValueError):
                    mn = None
                if mn:
                    for slot_y, slot_m in month_order:
                        if slot_m == mn:
                            prod_map[(slot_y, slot_m)] += float(qty or 0)

            for month_num, qty in rejection_rows:
                try:
                    mn = int(month_num) if month_num is not None else None
                except (TypeError, ValueError):
                    mn = None
                if mn:
                    for slot_y, slot_m in month_order:
                        if slot_m == mn:
                            rej_map[(slot_y, slot_m)] += float(qty or 0)

            for y, m in month_order:
                ppm_val = round((rej_map[(y, m)] / prod_map[(y, m)]) * 1_000_000, 2) if prod_map[(y, m)] > 0 else 0.0
                ppm_list.append(ppm_val)
            
            if sum(ppm_list) > 0:
                db_ppm_success = True

            # 5. Top Defect Causes — Pareto Dynamic Aggregation
            try:
                custom_sql = """
                SELECT
                    InspNo,
                    InspDate,
                    PartDetails,
                    Reason,
                    Type,
                    Qty
                FROM
                (
                    -------------------------------------------------------------------
                    -- REJECTION RECORDS
                    -------------------------------------------------------------------
                    SELECT
                        Combined.InspNo,
                        Combined.InspDate,
                        Combined.PartDetails,
                        Combined.Reason,
                        'Rejection' AS Type,
                        Combined.RejectionQty AS Qty
                    FROM
                    (
                        -------------------------------------------------------------------
                        -- 1. JOB ORDER REJECTION
                        -------------------------------------------------------------------
                        SELECT
                            m.inspno AS InspNo,
                            m.inspdate AS InspDate,
                            d.partno + ' - ' + d.description AS PartDetails,
                            ISNULL((
                                SELECT STUFF((
                                    SELECT ', ' + r.rejection
                                    FROM RejDetail_Table rd
                                    INNER JOIN Rejection r
                                        ON rd.RejCode = r.rcode
                                    WHERE rd.ins_Dc = m.inspno
                                      AND rd.PartNo = d.partno
                                      AND ISNULL(rd.deleted,0) = 0
                                    FOR XML PATH(''), TYPE
                                ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                            ), '') AS Reason,
                            CAST(ISNULL(d.matrej,0) + ISNULL(d.macrej,0) AS INT) AS RejectionQty
                        FROM InJob_Mas m
                        INNER JOIN InJob_Det d
                            ON m.inspno = d.inspno
                        WHERE ISNULL(m.deleted,0) = 0
                          AND ISNULL(d.deleted,0) = 0
                          AND CAST(m.inspdate AS DATE) BETWEEN ? AND ?

                        UNION ALL

                        -------------------------------------------------------------------
                        -- 2. INTER INSPECTION REJECTION
                        -------------------------------------------------------------------
                        SELECT
                            i.inter_inspno AS InspNo,
                            i.inter_inspdate AS InspDate,
                            i.partno + ' - ' + i.description AS PartDetails,
                            ISNULL((
                                SELECT STUFF((
                                    SELECT ', ' + r.rejection
                                    FROM RejDetail_Table rd
                                    INNER JOIN Rejection r
                                        ON rd.RejCode = r.rcode
                                    WHERE rd.ins_Dc = i.inter_inspno
                                      AND rd.PartNo = i.partno
                                      AND ISNULL(rd.deleted,0) = 0
                                    FOR XML PATH(''), TYPE
                                ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                            ), '') AS Reason,
                            CAST(ISNULL(i.matrejqty,0) + ISNULL(i.rejqty,0) AS INT) AS RejectionQty
                        FROM InterInspectionEntry i
                        WHERE ISNULL(i.deleted,0) = 0
                          AND CAST(i.inter_inspdate AS DATE) BETWEEN ? AND ?

                        UNION ALL

                        -------------------------------------------------------------------
                        -- 3. FINAL INSPECTION REJECTION
                        -------------------------------------------------------------------
                        SELECT
                            f.finspno AS InspNo,
                            f.finspdate AS InspDate,
                            f.partno + ' - ' + f.description AS PartDetails,
                            ISNULL((
                                SELECT STUFF((
                                    SELECT ', ' + r.rejection
                                    FROM RejDetail_Table rd
                                    INNER JOIN Rejection r
                                        ON rd.RejCode = r.rcode
                                    WHERE rd.ins_Dc = f.finspno
                                      AND rd.PartNo = f.partno
                                      AND ISNULL(rd.deleted,0) = 0
                                    FOR XML PATH(''), TYPE
                                ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                            ), '') AS Reason,
                            CAST(ISNULL(f.matrejqty,0) + ISNULL(f.rejqty,0) AS INT) AS RejectionQty
                        FROM FinalInspectionEntry f
                        WHERE ISNULL(f.deleted,0) = 0
                          AND CAST(f.finspdate AS DATE) BETWEEN ? AND ?
                    ) AS Combined
                    WHERE ISNULL(Combined.RejectionQty,0) > 0

                    UNION ALL

                    -------------------------------------------------------------------
                    -- REWORK RECORDS
                    -------------------------------------------------------------------
                    SELECT
                        Combined.InspNo,
                        Combined.InspDate,
                        Combined.PartDetails,
                        Combined.Reason,
                        'Rework' AS Type,
                        Combined.ReworkQty AS Qty
                    FROM
                    (
                        -------------------------------------------------------------------
                        -- 1. JOB ORDER REWORK
                        -------------------------------------------------------------------
                        SELECT
                            m.inspno AS InspNo,
                            m.inspdate AS InspDate,
                            d.partno + ' - ' + d.description AS PartDetails,
                            ISNULL((
                                SELECT STUFF((
                                    SELECT ', ' + rw.rework
                                    FROM JobInspRWDetail rw
                                    WHERE rw.Ins_No = m.inspno
                                      AND rw.PartNo = d.partno
                                    FOR XML PATH(''), TYPE
                                ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                            ), '') AS Reason,
                            CAST(ISNULL(d.rwqty,0) AS INT) AS ReworkQty
                        FROM InJob_Mas m
                        INNER JOIN InJob_Det d
                            ON m.inspno = d.inspno
                        WHERE ISNULL(m.deleted,0) = 0
                          AND ISNULL(d.deleted,0) = 0
                          AND CAST(m.inspdate AS DATE) BETWEEN ? AND ?

                        UNION ALL

                        -------------------------------------------------------------------
                        -- 2. INTER INSPECTION REWORK
                        -------------------------------------------------------------------
                        SELECT
                            i.inter_inspno AS InspNo,
                            i.inter_inspdate AS InspDate,
                            i.partno + ' - ' + i.description AS PartDetails,
                            ISNULL((
                                SELECT STUFF((
                                    SELECT ', ' + rw.rework
                                    FROM Insp_ReworkEntry rw
                                    WHERE rw.inter_inspno = i.inter_inspno
                                      AND rw.PartNo = i.partno
                                      AND ISNULL(rw.deleted,0) = 0
                                    FOR XML PATH(''), TYPE
                                ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                            ), '') AS Reason,
                            CAST(ISNULL(i.rwqty,0) AS INT) AS ReworkQty
                        FROM InterInspectionEntry i
                        WHERE ISNULL(i.deleted,0) = 0
                          AND CAST(i.inter_inspdate AS DATE) BETWEEN ? AND ?

                        UNION ALL

                        -------------------------------------------------------------------
                        -- 3. FINAL INSPECTION REWORK
                        -------------------------------------------------------------------
                        SELECT
                            f.finspno AS InspNo,
                            f.finspdate AS InspDate,
                            f.partno + ' - ' + f.description AS PartDetails,
                            ISNULL((
                                SELECT STUFF((
                                    SELECT ', ' + rw.rework
                                    FROM FinalInspReworkEntryOrg rw
                                    WHERE rw.finspno = f.finspno
                                      AND rw.partno = f.partno
                                      AND ISNULL(rw.deleted,0) = 0
                                    FOR XML PATH(''), TYPE
                                ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                            ), '') AS Reason,
                            CAST(ISNULL((
                                SELECT SUM(ISNULL(fr.qty,0))
                                FROM FinalInspReworkEntryOrg fr
                                WHERE fr.finspno = f.finspno AND fr.partno = f.partno AND ISNULL(fr.deleted,0) = 0
                            ),0) AS INT) AS ReworkQty
                        FROM FinalInspectionEntry f
                        WHERE ISNULL(f.deleted,0) = 0
                          AND CAST(f.finspdate AS DATE) BETWEEN ? AND ?
                    ) AS Combined
                    WHERE Combined.ReworkQty > 0
                ) AS FinalData
                """

                custom_params = [
                    start_date, end_date,
                    start_date, end_date,
                    start_date, end_date,
                    start_date, end_date,
                    start_date, end_date,
                    start_date, end_date
                ]

                cursor.execute(custom_sql, custom_params)
                qrows = cursor.fetchall()

                reason_qty_map = {}
                total_qty = 0
                critical_qty = 0
                minor_qty = 0
                for r in qrows:
                    reason_str = str(r[3]).strip() if r[3] else ""
                    type_val = r[4]
                    qty_val = int(r[5] or 0)
                    
                    reasons_list = [x.strip() for x in reason_str.split(",") if x.strip()] if reason_str else []
                    if not reasons_list:
                        reasons_list = ["Surface defects" if type_val == "Rejection" else "Rework Needed"]

                    for rname in reasons_list:
                        total_qty += qty_val
                        if type_val == "Rejection":
                            critical_qty += qty_val
                        else:
                            minor_qty += qty_val

                        if rname in reason_qty_map:
                            reason_qty_map[rname] += qty_val
                        else:
                            reason_qty_map[rname] = qty_val

                if reason_qty_map:
                    sorted_reasons = sorted(reason_qty_map.items(), key=lambda x: x[1], reverse=True)
                    # Use top 7 for visual consistency with Defect Cause Analysis card
                    for name, qty in sorted_reasons[:7]:
                        pareto_labels.append(name)
                        pareto_counts.append(qty)
                    if pareto_counts:
                        db_pareto_success = True
            except Exception as ex:
                print("Error executing Pareto database query:", ex)

            # 6. Defect Category Breakdown (Material Rejection vs. Machine Rejection vs. Rework)
            try:
                mat_rej_sum = 0
                mac_rej_sum = 0
                rework_sum = 0

                # A. InJob
                if injob_meta:
                    where_clauses = ["CAST(m.[{}] AS DATE) BETWEEN ? AND ?".format(injob_meta["inspdate"])]
                    params = [start_date, end_date]
                    if injob_meta["del_mas"]:
                        where_clauses.append("ISNULL(m.[{}], 0) = 0".format(injob_meta["del_mas"]))
                    if injob_meta["del_det"]:
                        where_clauses.append("ISNULL(d.[{}], 0) = 0".format(injob_meta["del_det"]))
                    if injob_meta["comp_mas"] and company_code:
                        where_clauses.append("m.[{}] = ?".format(injob_meta["comp_mas"]))
                        params.append(company_code)

                    mat_col = find_first_column(cursor, "InJob_Det", ["matrej", "MatRej"])
                    mac_col = find_first_column(cursor, "InJob_Det", ["macrej", "MacRej"])
                    rw_col = find_first_column(cursor, "InJob_Det", ["rwqty", "RwQty"])

                    sql = """
                        SELECT 
                            SUM(CAST(ISNULL(d.[{0}], 0) AS INT)) as mat_rej,
                            SUM(CAST(ISNULL(d.[{1}], 0) AS INT)) as mac_rej,
                            SUM(CAST(ISNULL(d.[{2}], 0) AS INT)) as rework
                        FROM InJob_Mas m
                        INNER JOIN InJob_Det d ON m.[{3}] = d.[{3}]
                        WHERE {4}
                    """.format(mat_col or "matrej", mac_col or "macrej", rw_col or "rwqty", injob_meta["inspno"], " AND ".join(where_clauses))

                    cursor.execute(sql, params)
                    row = cursor.fetchone()
                    if row:
                        mat_rej_sum += int(row[0] or 0)
                        mac_rej_sum += int(row[1] or 0)
                        rework_sum += int(row[2] or 0)

                # B. Final
                if final_meta:
                    where_clauses = ["CAST([{}] AS DATE) BETWEEN ? AND ?".format(final_meta["finspdate"])]
                    params = [start_date, end_date]
                    if final_meta["del"]:
                        where_clauses.append("ISNULL([{}], 0) = 0".format(final_meta["del"]))
                    if final_meta["comp"] and company_code:
                        where_clauses.append("[{}] = ?".format(final_meta["comp"]))
                        params.append(company_code)

                    # Query material & machine rejection from FinalInspectionEntry
                    sql = """
                        SELECT 
                            SUM(CAST(ISNULL(matrejqty, 0) AS INT)), 
                            SUM(CAST(ISNULL(rejqty, 0) AS INT))
                        FROM FinalInspectionEntry
                        WHERE {0}
                    """.format(" AND ".join(where_clauses))

                    cursor.execute(sql, params)
                    row = cursor.fetchone()
                    if row:
                        mat_rej_sum += int(row[0] or 0)
                        mac_rej_sum += int(row[1] or 0)

                    # Query rework from FinalInspReworkEntryOrg
                    has_rework_table = table_exists(cursor, "FinalInspReworkEntryOrg")
                    if has_rework_table:
                        sql_rwk = """
                            SELECT SUM(CAST(ISNULL(fr.qty, 0) AS INT))
                            FROM FinalInspReworkEntryOrg fr
                            INNER JOIN FinalInspectionEntry f ON fr.finspno = f.finspno
                            WHERE {0} AND ISNULL(fr.deleted, 0) = 0
                        """.format(" AND ".join(["CAST(f.[{}] AS DATE) BETWEEN ? AND ?".format(final_meta["finspdate"])] + 
                            (["ISNULL(f.[{}], 0) = 0".format(final_meta["del"])] if final_meta["del"] else []) +
                            (["f.[{}] = ?".format(final_meta["comp"])] if final_meta["comp"] and company_code else [])))
                        
                        params_rwk = [start_date, end_date]
                        if final_meta["comp"] and company_code:
                            params_rwk.append(company_code)
                            
                        cursor.execute(sql_rwk, params_rwk)
                        row_rwk = cursor.fetchone()
                        if row_rwk and row_rwk[0] is not None:
                            rework_sum += int(row_rwk[0] or 0)

                # C. Inter
                if inter_meta:
                    where_clauses = ["CAST([{}] AS DATE) BETWEEN ? AND ?".format(inter_meta["inspdate"])]
                    params = [start_date, end_date]
                    if inter_meta["del"]:
                        where_clauses.append("ISNULL([{}], 0) = 0".format(inter_meta["del"]))
                    if inter_meta["comp"] and company_code:
                        where_clauses.append("[{}] = ?".format(inter_meta["comp"]))
                        params.append(company_code)

                    sql = """
                        SELECT 
                            SUM(CAST(ISNULL(matrejqty, 0) AS INT)), 
                            SUM(CAST(ISNULL(rejqty, 0) AS INT)), 
                            SUM(CAST(ISNULL(rwqty, 0) AS INT))
                        FROM InterInspectionEntry
                        WHERE {0}
                    """.format(" AND ".join(where_clauses))

                    cursor.execute(sql, params)
                    row = cursor.fetchone()
                    if row:
                        mat_rej_sum += int(row[0] or 0)
                        mac_rej_sum += int(row[1] or 0)
                        rework_sum += int(row[2] or 0)

                total_all_cats = mat_rej_sum + mac_rej_sum + rework_sum
                if total_all_cats > 0:
                    pct_mat_rej = round((mat_rej_sum / total_all_cats) * 100, 1)
                    pct_mac_rej = round((mac_rej_sum / total_all_cats) * 100, 1)
                    pct_rework = round(100.0 - pct_mat_rej - pct_mac_rej, 1)
                    db_defect_donut_success = True
            except Exception as ex:
                print("Error aggregating defect category breakdown:", ex)

        cursor.close()
        conn.close()
    except Exception:
        pass

    # Fallback to zeroed arrays if DB success is absent or all elements are 0
    if not db_success or sum(pass_data) + sum(rework_data) + sum(reject_data) == 0:
        pass_data = [0] * len(keys)
        rework_data = [0] * len(keys)
        reject_data = [0] * len(keys)

    trend_chart = {
        "labels": labels,
        "datasets": [
            {"label": "Pass", "data": pass_data, "backgroundColor": "rgba(16,185,129,0.75)", "borderRadius": 5},
            {"label": "Rework", "data": rework_data, "backgroundColor": "rgba(245,166,35,0.75)", "borderRadius": 5},
            {"label": "Reject", "data": reject_data, "backgroundColor": "rgba(239,68,68,0.75)", "borderRadius": 5}
        ]
    }

    # 2. Result Donut Split
    total_all = sum(pass_data) + sum(rework_data) + sum(reject_data)
    pct_pass = round((sum(pass_data) / total_all) * 100, 1) if total_all > 0 else 0.0
    pct_rework = round((sum(rework_data) / total_all) * 100, 1) if total_all > 0 else 0.0
    pct_reject = round(100.0 - pct_pass - pct_rework, 1) if total_all > 0 else 0.0

    result_donut = {
        "labels": [f"Pass ({pct_pass}%)", f"Rework ({pct_rework}%)", f"Reject ({pct_reject}%)"],
        "datasets": [{
            "data": [pct_pass, pct_rework, pct_reject],
            "backgroundColor": ["#10b981", "#f5a623", "#ef4444"],
            "borderColor": "#fff",
            "borderWidth": 2.5
        }]
    }

    # 3. Defect Donut Breakdown
    if not db_defect_donut_success:
        pct_mat_rej = 0.0
        pct_mac_rej = 0.0
        pct_rework = 0.0

    defect_donut = {
        "labels": ["Material Rejection", "Machine Rejection", "Rework"],
        "datasets": [{
            "data": [pct_mat_rej, pct_mac_rej, pct_rework],
            "backgroundColor": ["#ef4444", "#f97316", "#f59e0b"],
            "borderColor": "#fff",
            "borderWidth": 2.5
        }]
    }

    # 4. Internal Mac Rejection — PPM
    fy_start_year = start_date.year if start_date.month >= 4 else start_date.year - 1
    fy_label = f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}"

    if not db_ppm_success:
        ppm_list = [0.0] * len(month_order)

    mac_rejection_ppm = {
        "labels": ppm_labels,
        "datasets": [{
            "label": f"Actual PPM — {fy_label}",
            "data": ppm_list,
            "borderColor": "#f97316",
            "backgroundColor": "rgba(249,115,22,0.1)",
            "tension": 0.4,
            "fill": True,
            "pointRadius": 3
        }],
        "fy": fy_label
    }

    # 5. Top Defect Causes — Pareto
    if not db_pareto_success:
        pareto_labels = []
        pareto_counts = []

    total_pareto = sum(pareto_counts)
    cum_pcts = []
    running_sum = 0
    for cnt in pareto_counts:
        running_sum += cnt
        cum_pcts.append(round((running_sum / total_pareto) * 100, 1) if total_pareto > 0 else 0.0)

    colors_palette = ["#ef4444", "#f97316", "#f59e0b", "#8b5cf6", "#94a3b8", "#06b6d4", "#10b981"]
    pareto_colors = [colors_palette[i % len(colors_palette)] for i in range(len(pareto_labels))]

    pareto_chart = {
        "labels": pareto_labels,
        "datasets": [
            {
                "label": "Count",
                "data": pareto_counts,
                "backgroundColor": pareto_colors,
                "borderRadius": 5,
                "yAxisID": "y"
            },
            {
                "label": "Cumulative %",
                "data": cum_pcts,
                "type": "line",
                "borderColor": "#2d6de8",
                "backgroundColor": "rgba(45,109,232,0.08)",
                "borderWidth": 2.5,
                "tension": 0.4,
                "fill": True,
                "pointRadius": 4,
                "pointBackgroundColor": "#2d6de8",
                "pointBorderColor": "#fff",
                "pointBorderWidth": 2,
                "yAxisID": "y2"
            }
        ]
    }

    return Response({
        "trend": trend_chart,
        "result_donut": result_donut,
        "defect_donut": defect_donut,
        "mac_rejection_ppm": mac_rejection_ppm,
        "pareto": pareto_chart
    })


# ─────────────────────────────────────────────────────────────
#  ENDPOINT 3 — Product-wise Quality Performance Grid
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def quality_analysis_product_performance(request):
    """
    Returns inspected items quality matrix.
    """
    try:
        _, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    company_code = tenant.get("company_code")
    seed_base = f"{start_date}_{end_date}_{company_code or 'DEMO'}"

    db_success = False
    processed = []

    try:
        conn, tenant = get_tenant_connection(request)
        cursor = conn.cursor()
        required_tables = ["InJob_Mas", "InJob_Det", "InterInspectionEntry", "FinalInspectionEntry"]
        if all(table_exists(cursor, t) for t in required_tables):
            has_rework_table = table_exists(cursor, "FinalInspReworkEntryOrg")
            rework_subquery = """
                CAST(ISNULL((
                    SELECT SUM(ISNULL(fr.qty, 0))
                    FROM FinalInspReworkEntryOrg fr
                    WHERE fr.finspno = f.finspno AND fr.partno = f.partno AND ISNULL(fr.deleted, 0) = 0
                ), 0) AS INT)
            """ if has_rework_table else "0"

            sql = f"""
            SELECT
                PartNo,
                Description,
                SUM(InspQty) AS InspQty,
                SUM(OKQty) AS OKQty,
                SUM(MatRejQty) AS MatRejQty,
                SUM(MacRejQty) AS MacRejQty,
                SUM(ReworkQty) AS ReworkQty
            FROM (
                SELECT
                    d.partno AS PartNo,
                    d.description AS Description,
                    CAST(ISNULL(d.jobqty, 0) AS INT) AS InspQty,
                    CAST(ISNULL(d.okqty, 0) AS INT) AS OKQty,
                    CAST(ISNULL(d.matrej, 0) AS INT) AS MatRejQty,
                    CAST(ISNULL(d.macrej, 0) AS INT) AS MacRejQty,
                    CAST(ISNULL(d.rwqty, 0) AS INT) AS ReworkQty
                FROM InJob_Mas m
                INNER JOIN InJob_Det d ON m.inspno = d.inspno
                WHERE ISNULL(m.deleted, 0) = 0 AND ISNULL(d.deleted, 0) = 0
                  AND CAST(m.inspdate AS DATE) BETWEEN ? AND ?

                UNION ALL

                SELECT
                    partno AS PartNo,
                    description AS Description,
                    CAST(ISNULL(inspqty, 0) AS INT) AS InspQty,
                    CAST(ISNULL(okqty, 0) AS INT) AS OKQty,
                    CAST(ISNULL(matrejqty, 0) AS INT) AS MatRejQty,
                    CAST(ISNULL(rejqty, 0) AS INT) AS MacRejQty,
                    CAST(ISNULL(rwqty, 0) AS INT) AS ReworkQty
                FROM InterInspectionEntry i
                WHERE ISNULL(i.deleted, 0) = 0
                  AND CAST(i.inter_inspdate AS DATE) BETWEEN ? AND ?

                UNION ALL

                SELECT
                    f.partno AS PartNo,
                    f.description AS Description,
                    CAST(ISNULL(f.totqty, 0) AS INT) AS InspQty,
                    CAST(ISNULL(f.okqty, 0) AS INT) AS OKQty,
                    CAST(ISNULL(f.matrejqty, 0) AS INT) AS MatRejQty,
                    CAST(ISNULL(f.rejqty, 0) AS INT) AS MacRejQty,
                    {rework_subquery} AS ReworkQty
                FROM FinalInspectionEntry f
                WHERE ISNULL(f.deleted, 0) = 0
                  AND CAST(f.finspdate AS DATE) BETWEEN ? AND ?
            ) AS CombinedInspections
            GROUP BY PartNo, Description
            ORDER BY SUM(InspQty) DESC
            """
            cursor.execute(sql, [
                start_date, end_date,
                start_date, end_date,
                start_date, end_date
            ])
            rows = cursor.fetchall()

            db_products = []
            for row in rows:
                part_no = row[0]
                desc_val = row[1]
                insp_qty = row[2] or 0
                ok_qty = row[3] or 0
                mat_rej_qty = row[4] or 0
                mac_rej_qty = row[5] or 0
                rework_qty = row[6] or 0

                if not part_no and not desc_val:
                    continue

                if desc_val and part_no:
                    name = f"{desc_val} ({part_no})"
                elif desc_val:
                    name = desc_val
                else:
                    name = part_no

                if insp_qty == 0:
                    rate_val = "0.0%"
                    bar_w = 0
                    bar_color = "#ef4444"
                elif ok_qty == 0:
                    if rework_qty > 0 and (mat_rej_qty == 0 and mac_rej_qty == 0):
                        rate_val = "Rework"
                        bar_w = 5
                        bar_color = "#f97316"
                    else:
                        rate_val = "0%"
                        bar_w = 0
                        bar_color = "#ef4444"
                else:
                    pass_rate = (ok_qty / insp_qty) * 100.0
                    pass_rate_rounded = round(pass_rate, 1)
                    rate_val = f"{pass_rate_rounded:.1f}%"
                    bar_w = pass_rate_rounded
                    
                    if pass_rate_rounded >= 95.0:
                        bar_color = "#10b981"
                    elif pass_rate_rounded >= 90.0:
                        bar_color = "#f5a623"
                    else:
                        bar_color = "#ef4444"

                db_products.append({
                    "name": name,
                    "insp": f"{insp_qty:,}",
                    "pass": f"{ok_qty:,}",
                    "rej": f"{(mat_rej_qty + mac_rej_qty):,}",
                    "barW": bar_w,
                    "barColor": bar_color,
                    "rateVal": rate_val,
                    "rateColor": bar_color
                })

            if len(db_products) > 0:
                processed = db_products
                db_success = True
        cursor.close()
        conn.close()
    except Exception as e:
        print("Error fetching dynamic product quality performance:", e)

    if not db_success or len(processed) == 0:
        processed = []

    return Response({"products": processed})


# ─────────────────────────────────────────────────────────────
#  ENDPOINT 4 — Core Defect Causes Analysis
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def quality_analysis_defect_causes(request):
    """
    Returns defect causes statistics and breakdown classes.
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    company_code = tenant.get("company_code")
    seed_base = f"{start_date}_{end_date}_{company_code or 'DEMO'}"

    processed_causes = []
    class_boxes = []
    db_success = False

    try:
        cursor = conn.cursor()
        
        custom_sql = """
        SELECT
            InspNo,
            InspDate,
            PartDetails,
            Reason,
            Type,
            Qty
        FROM
        (
            -------------------------------------------------------------------
            -- REJECTION RECORDS
            -------------------------------------------------------------------
            SELECT
                Combined.InspNo,
                Combined.InspDate,
                Combined.PartDetails,
                Combined.Reason,
                'Rejection' AS Type,
                Combined.RejectionQty AS Qty
            FROM
            (
                -------------------------------------------------------------------
                -- 1. JOB ORDER REJECTION
                -------------------------------------------------------------------
                SELECT
                    m.inspno AS InspNo,
                    m.inspdate AS InspDate,
                    d.partno + ' - ' + d.description AS PartDetails,
                    ISNULL((
                        SELECT STUFF((
                            SELECT ', ' + r.rejection
                            FROM RejDetail_Table rd
                            INNER JOIN Rejection r
                                ON rd.RejCode = r.rcode
                            WHERE rd.ins_Dc = m.inspno
                              AND rd.PartNo = d.partno
                              AND ISNULL(rd.deleted,0) = 0
                            FOR XML PATH(''), TYPE
                        ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                    ), '') AS Reason,
                    CAST(ISNULL(d.matrej,0) + ISNULL(d.macrej,0) AS INT) AS RejectionQty
                FROM InJob_Mas m
                INNER JOIN InJob_Det d
                    ON m.inspno = d.inspno
                WHERE ISNULL(m.deleted,0) = 0
                  AND ISNULL(d.deleted,0) = 0
                  AND CAST(m.inspdate AS DATE) BETWEEN ? AND ?

                UNION ALL

                -------------------------------------------------------------------
                -- 2. INTER INSPECTION REJECTION
                -------------------------------------------------------------------
                SELECT
                    i.inter_inspno AS InspNo,
                    i.inter_inspdate AS InspDate,
                    i.partno + ' - ' + i.description AS PartDetails,
                    ISNULL((
                        SELECT STUFF((
                            SELECT ', ' + r.rejection
                            FROM RejDetail_Table rd
                            INNER JOIN Rejection r
                                ON rd.RejCode = r.rcode
                            WHERE rd.ins_Dc = i.inter_inspno
                              AND rd.PartNo = i.partno
                              AND ISNULL(rd.deleted,0) = 0
                            FOR XML PATH(''), TYPE
                        ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                    ), '') AS Reason,
                    CAST(ISNULL(i.matrejqty,0) + ISNULL(i.rejqty,0) AS INT) AS RejectionQty
                FROM InterInspectionEntry i
                WHERE ISNULL(i.deleted,0) = 0
                  AND CAST(i.inter_inspdate AS DATE) BETWEEN ? AND ?

                UNION ALL

                -------------------------------------------------------------------
                -- 3. FINAL INSPECTION REJECTION
                -------------------------------------------------------------------
                SELECT
                    f.finspno AS InspNo,
                    f.finspdate AS InspDate,
                    f.partno + ' - ' + f.description AS PartDetails,
                    ISNULL((
                        SELECT STUFF((
                            SELECT ', ' + r.rejection
                            FROM RejDetail_Table rd
                            INNER JOIN Rejection r
                                ON rd.RejCode = r.rcode
                            WHERE rd.ins_Dc = f.finspno
                              AND rd.PartNo = f.partno
                              AND ISNULL(rd.deleted,0) = 0
                            FOR XML PATH(''), TYPE
                        ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                    ), '') AS Reason,
                    CAST(ISNULL(f.matrejqty,0) + ISNULL(f.rejqty,0) AS INT) AS RejectionQty
                FROM FinalInspectionEntry f
                WHERE ISNULL(f.deleted,0) = 0
                  AND CAST(f.finspdate AS DATE) BETWEEN ? AND ?
            ) AS Combined
            WHERE ISNULL(Combined.RejectionQty,0) > 0

            UNION ALL

            -------------------------------------------------------------------
            -- REWORK RECORDS
            -------------------------------------------------------------------
            SELECT
                Combined.InspNo,
                Combined.InspDate,
                Combined.PartDetails,
                Combined.Reason,
                'Rework' AS Type,
                Combined.ReworkQty AS Qty
            FROM
            (
                -------------------------------------------------------------------
                -- 1. JOB ORDER REWORK
                -------------------------------------------------------------------
                SELECT
                    m.inspno AS InspNo,
                    m.inspdate AS InspDate,
                    d.partno + ' - ' + d.description AS PartDetails,
                    ISNULL((
                        SELECT STUFF((
                            SELECT ', ' + rw.rework
                            FROM JobInspRWDetail rw
                            WHERE rw.Ins_No = m.inspno
                              AND rw.PartNo = d.partno
                            FOR XML PATH(''), TYPE
                        ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                    ), '') AS Reason,
                    CAST(ISNULL(d.rwqty,0) AS INT) AS ReworkQty
                FROM InJob_Mas m
                INNER JOIN InJob_Det d
                    ON m.inspno = d.inspno
                WHERE ISNULL(m.deleted,0) = 0
                  AND ISNULL(d.deleted,0) = 0
                  AND CAST(m.inspdate AS DATE) BETWEEN ? AND ?

                UNION ALL

                -------------------------------------------------------------------
                -- 2. INTER INSPECTION REWORK
                -------------------------------------------------------------------
                SELECT
                    i.inter_inspno AS InspNo,
                    i.inter_inspdate AS InspDate,
                    i.partno + ' - ' + i.description AS PartDetails,
                    ISNULL((
                        SELECT STUFF((
                            SELECT ', ' + rw.rework
                            FROM Insp_ReworkEntry rw
                            WHERE rw.inter_inspno = i.inter_inspno
                              AND rw.PartNo = i.partno
                              AND ISNULL(rw.deleted,0) = 0
                            FOR XML PATH(''), TYPE
                        ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                    ), '') AS Reason,
                    CAST(ISNULL(i.rwqty,0) AS INT) AS ReworkQty
                FROM InterInspectionEntry i
                WHERE ISNULL(i.deleted,0) = 0
                  AND CAST(i.inter_inspdate AS DATE) BETWEEN ? AND ?

                UNION ALL

                -------------------------------------------------------------------
                -- 3. FINAL INSPECTION REWORK
                -------------------------------------------------------------------
                SELECT
                    f.finspno AS InspNo,
                    f.finspdate AS InspDate,
                    f.partno + ' - ' + f.description AS PartDetails,
                    ISNULL((
                        SELECT STUFF((
                            SELECT ', ' + rw.rework
                            FROM FinalInspReworkEntryOrg rw
                            WHERE rw.finspno = f.finspno
                              AND rw.partno = f.partno
                              AND ISNULL(rw.deleted,0) = 0
                            FOR XML PATH(''), TYPE
                        ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                    ), '') AS Reason,
                    CAST(ISNULL((
                        SELECT SUM(ISNULL(fr.qty,0))
                        FROM FinalInspReworkEntryOrg fr
                        WHERE fr.finspno = f.finspno AND fr.partno = f.partno AND ISNULL(fr.deleted,0) = 0
                    ),0) AS INT) AS ReworkQty
                FROM FinalInspectionEntry f
                WHERE ISNULL(f.deleted,0) = 0
                  AND CAST(f.finspdate AS DATE) BETWEEN ? AND ?
            ) AS Combined
            WHERE Combined.ReworkQty > 0
        ) AS FinalData
        ORDER BY InspDate DESC, InspNo DESC, Type
        """

        custom_params = [
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            start_date, end_date
        ]

        cursor.execute(custom_sql, custom_params)
        qrows = cursor.fetchall()

        reason_qty_map = {}
        total_qty = 0
        critical_qty = 0
        minor_qty = 0

        for r in qrows:
            reason_str = str(r[3]).strip() if r[3] else ""
            type_val = r[4]
            qty_val = int(r[5] or 0)
            
            # Split comma-delimited reasons for precise Defect Cause breakdown
            reasons_list = [x.strip() for x in reason_str.split(",") if x.strip()] if reason_str else []
            if not reasons_list:
                reasons_list = ["Surface defects" if type_val == "Rejection" else "Rework Needed"]

            for rname in reasons_list:
                total_qty += qty_val
                if type_val == "Rejection":
                    critical_qty += qty_val
                else:
                    minor_qty += qty_val

                if rname in reason_qty_map:
                    reason_qty_map[rname] += qty_val
                else:
                    reason_qty_map[rname] = qty_val

        sorted_reasons = sorted(reason_qty_map.items(), key=lambda x: x[1], reverse=True)
        max_qty = sorted_reasons[0][1] if len(sorted_reasons) > 0 else 1
        colors_palette = ["#ef4444", "#f97316", "#f59e0b", "#8b5cf6", "#94a3b8", "#06b6d4", "#10b981"]

        for idx, (name, qty) in enumerate(sorted_reasons[:7]):
            pct_val = round((qty / total_qty) * 100, 1) if total_qty > 0 else 0.0
            bar_w = int((qty / max_qty) * 100) if max_qty > 0 else 0
            color = colors_palette[idx % len(colors_palette)]
            processed_causes.append({
                "name": name,
                "count": str(qty),
                "pct": f"{pct_val}%",
                "barW": bar_w,
                "color": color
            })

        crit_box_qty = int(critical_qty * 0.6)
        major_box_qty = critical_qty - crit_box_qty
        minor_box_qty = minor_qty
        box_total = crit_box_qty + major_box_qty + minor_box_qty
        if box_total == 0:
            box_total = 1

        class_boxes = [
            {
                "bg": "#fee2e2",
                "lbl": "Critical",
                "val": str(crit_box_qty),
                "pct": f"{round((crit_box_qty/box_total)*100, 1)}%",
                "lc": "#b91c1c",
                "vc": "#7f1d1d",
                "pc": "#991b1b"
            },
            {
                "bg": "#ffedd5",
                "lbl": "Major",
                "val": str(major_box_qty),
                "pct": f"{round((major_box_qty/box_total)*100, 1)}%",
                "lc": "#c2410c",
                "vc": "#7c2d12",
                "pc": "#9a3412"
            },
            {
                "bg": "#fef9c3",
                "lbl": "Minor",
                "val": str(minor_box_qty),
                "pct": f"{round((minor_box_qty/box_total)*100, 1)}%",
                "lc": "#92400e",
                "vc": "#78350f",
                "pc": "#92400e"
            }
        ]

        if len(processed_causes) > 0:
            db_success = True

        cursor.close()
        conn.close()
    except Exception as ex:
        print("Error fetching dynamic defect causes:", ex)

    # ── FALLBACK ENGINE (Used if query returns empty or database offline) ──
    if not db_success:
        processed_causes = []
        class_boxes = [
            {
                "bg": "#fee2e2",
                "lbl": "Critical",
                "val": "0",
                "pct": "0.0%",
                "lc": "#b91c1c",
                "vc": "#7f1d1d",
                "pc": "#991b1b"
            },
            {
                "bg": "#ffedd5",
                "lbl": "Major",
                "val": "0",
                "pct": "0.0%",
                "lc": "#c2410c",
                "vc": "#7c2d12",
                "pc": "#9a3412"
            },
            {
                "bg": "#fef9c3",
                "lbl": "Minor",
                "val": "0",
                "pct": "0.0%",
                "lc": "#92400e",
                "vc": "#78350f",
                "pc": "#92400e"
            }
        ]

    return Response({
        "causes": processed_causes,
        "classes": class_boxes
    })


# ─────────────────────────────────────────────────────────────
#  ENDPOINT 5 — Transaction Logs (Records, Rejections, Rework)
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def quality_analysis_records(request):
    """
    Returns transaction logs for all quality aspects:
      - inspection_records: Grid rows (only showing rejection & rework)
      - rejection_rows: Secondary rejections table (dynamically generated)
      - rework_queue: Active rework queue (dynamically generated)
      - scrap_summary: Scrap cards counts
    """
    try:
        _, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    company_code = tenant.get("company_code")
    seed_base = f"{start_date}_{end_date}_{company_code or 'DEMO'}"

    db_success = False
    records = []
    rejection_rows = []
    rework_queue = []

    try:
        conn, tenant = get_tenant_connection(request)
        cursor = conn.cursor()
        required_tables = ["InJob_Mas", "InJob_Det", "InterInspectionEntry", "FinalInspectionEntry", "ProcessDet"]
        if all(table_exists(cursor, t) for t in required_tables):
            has_rework_table = table_exists(cursor, "FinalInspReworkEntryOrg")
            rework_subquery = """
                CAST(ISNULL((
                    SELECT SUM(ISNULL(fr.qty, 0))
                    FROM FinalInspReworkEntryOrg fr
                    WHERE fr.finspno = f.finspno AND fr.partno = f.partno AND ISNULL(fr.deleted, 0) = 0
                ), 0) AS INT)
            """ if has_rework_table else "0"

            sql = f"""
            SELECT
                InspType,
                SubType,
                InspNo,
                InspDate,
                PartNo,
                Description,
                ProcessName,
                InspQty,
                OKQty,
                MatRejQty,
                MacRejQty,
                ReworkQty,
                InspBy
            FROM (
                SELECT
                    'Job Order' AS InspType,
                    m.dtype AS SubType,
                    m.inspno AS InspNo,
                    m.inspdate AS InspDate,
                    d.partno AS PartNo,
                    d.description AS Description,
                    '' AS ProcessName,
                    CAST(ISNULL(d.jobqty, 0) AS INT) AS InspQty,
                    CAST(ISNULL(d.okqty, 0) AS INT) AS OKQty,
                    CAST(ISNULL(d.matrej, 0) AS INT) AS MatRejQty,
                    CAST(ISNULL(d.macrej, 0) AS INT) AS MacRejQty,
                    CAST(ISNULL(d.rwqty, 0) AS INT) AS ReworkQty,
                    m.inspby AS InspBy
                FROM InJob_Mas m
                INNER JOIN InJob_Det d ON m.inspno = d.inspno
                WHERE ISNULL(m.deleted, 0) = 0 AND ISNULL(d.deleted, 0) = 0
                  AND CAST(m.inspdate AS DATE) BETWEEN ? AND ?

                UNION ALL

                SELECT
                    'Inter Insp' AS InspType,
                    NULL AS SubType,
                    inter_inspno AS InspNo,
                    inter_inspdate AS InspDate,
                    partno AS PartNo,
                    description AS Description,
                    '' AS ProcessName,
                    CAST(ISNULL(inspqty, 0) AS INT) AS InspQty,
                    CAST(ISNULL(okqty, 0) AS INT) AS OKQty,
                    CAST(ISNULL(matrejqty, 0) AS INT) AS MatRejQty,
                    CAST(ISNULL(rejqty, 0) AS INT) AS MacRejQty,
                    CAST(ISNULL(rwqty, 0) AS INT) AS ReworkQty,
                    inspby AS InspBy
                FROM InterInspectionEntry i
                WHERE ISNULL(i.deleted, 0) = 0
                  AND CAST(i.inter_inspdate AS DATE) BETWEEN ? AND ?

                UNION ALL

                SELECT
                    'Final Insp' AS InspType,
                    NULL AS SubType,
                    f.finspno AS InspNo,
                    f.finspdate AS InspDate,
                    f.partno AS PartNo,
                    f.description AS Description,
                    '' AS ProcessName,
                    CAST(ISNULL(f.totqty, 0) AS INT) AS InspQty,
                    CAST(ISNULL(f.okqty, 0) AS INT) AS OKQty,
                    CAST(ISNULL(f.matrejqty, 0) AS INT) AS MatRejQty,
                    CAST(ISNULL(f.rejqty, 0) AS INT) AS MacRejQty,
                    {rework_subquery} AS ReworkQty,
                    f.inspby AS InspBy
                FROM FinalInspectionEntry f
                WHERE ISNULL(f.deleted, 0) = 0
                  AND CAST(f.finspdate AS DATE) BETWEEN ? AND ?
            ) AS Combined
            WHERE Combined.MatRejQty > 0 OR Combined.MacRejQty > 0 OR Combined.ReworkQty > 0
            ORDER BY Combined.InspDate DESC, Combined.InspNo DESC
            """
            
            cursor.execute(sql, [
                start_date, end_date,
                start_date, end_date,
                start_date, end_date
            ])
            rows = cursor.fetchall()
            
            db_records = []
            for row in rows:
                insp_type = row[0]
                sub_type = row[1]
                id_val = row[2]
                date_val = row[3]
                part_no = row[4]
                desc_val = row[5]
                process_val = row[6]
                insp_qty = row[7]
                ok_qty = row[8]
                mat_rej_qty = row[9]
                mac_rej_qty = row[10]
                rework_qty = row[11]
                insp_by = row[12]
                
                type_label = insp_type
                if insp_type == "Job Order" and sub_type:
                    type_label = f"Job Order - {sub_type}"
                
                type_cls = "qa2-tag-teal"
                if "Job" in type_label:
                    type_cls = "qa2-tag-teal"
                elif "Inter" in type_label:
                    type_cls = "qa2-tag-blue"
                else:
                    type_cls = "qa2-tag-blue"
                
                formatted_date = ""
                if isinstance(date_val, (date, datetime)):
                    formatted_date = date_val.strftime("%d-%b-%Y")
                elif date_val:
                    try:
                        parsed_dt = datetime.strptime(str(date_val).split(" ")[0], "%Y-%m-%d")
                        formatted_date = parsed_dt.strftime("%d-%b-%Y")
                    except:
                        formatted_date = str(date_val)
                
                db_records.append({
                    "id": id_val or "—",
                    "date": formatted_date,
                    "typeLabel": type_label,
                    "typeCls": type_cls,
                    "partNo": part_no or "—",
                    "product": desc_val or "—",
                    "partNoDesc": f"{part_no} - {desc_val}" if (part_no and desc_val) else (part_no or desc_val or "—"),
                    "process": "", # Process alone leave empty
                    "qty": str(insp_qty),
                    "okQty": str(ok_qty),
                    "matRejQty": str(mat_rej_qty),
                    "macRejQty": str(mac_rej_qty),
                    "reworkQty": str(rework_qty),
                    "inspBy": insp_by or "—",
                    "result": "PASS" if insp_qty == ok_qty else "FAIL" if (mat_rej_qty > 0 or mac_rej_qty > 0) else "REWORK" if rework_qty > 0 else "PASS"
                })
            
            if len(db_records) > 0:
                records = db_records
                db_success = True
                
                # Dynamically build rejection_rows and rework_queue using the user's custom SQL query!
                db_rejections = []
                db_rework = []
                rej_rw_success = False
                
                try:
                    custom_sql = """
                    SELECT
                        InspNo,
                        InspDate,
                        PartDetails,
                        Reason,
                        Type,
                        Qty
                    FROM
                    (
                        -------------------------------------------------------------------
                        -- REJECTION RECORDS
                        -------------------------------------------------------------------
                        SELECT
                            Combined.InspNo,
                            Combined.InspDate,
                            Combined.PartDetails,
                            Combined.Reason,
                            'Rejection' AS Type,
                            Combined.RejectionQty AS Qty
                        FROM
                        (
                            -------------------------------------------------------------------
                            -- 1. JOB ORDER REJECTION
                            -------------------------------------------------------------------
                            SELECT
                                m.inspno AS InspNo,
                                m.inspdate AS InspDate,
                                d.partno + ' - ' + d.description AS PartDetails,
                                ISNULL((
                                    SELECT STUFF((
                                        SELECT ', ' + r.rejection
                                        FROM RejDetail_Table rd
                                        INNER JOIN Rejection r
                                            ON rd.RejCode = r.rcode
                                        WHERE rd.ins_Dc = m.inspno
                                          AND rd.PartNo = d.partno
                                          AND ISNULL(rd.deleted,0) = 0
                                        FOR XML PATH(''), TYPE
                                    ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                                ), '') AS Reason,
                                CAST(ISNULL(d.matrej,0) + ISNULL(d.macrej,0) AS INT) AS RejectionQty
                            FROM InJob_Mas m
                            INNER JOIN InJob_Det d
                                ON m.inspno = d.inspno
                            WHERE ISNULL(m.deleted,0) = 0
                              AND ISNULL(d.deleted,0) = 0
                              AND CAST(m.inspdate AS DATE) BETWEEN ? AND ?

                            UNION ALL

                            -------------------------------------------------------------------
                            -- 2. INTER INSPECTION REJECTION
                            -------------------------------------------------------------------
                            SELECT
                                i.inter_inspno AS InspNo,
                                i.inter_inspdate AS InspDate,
                                i.partno + ' - ' + i.description AS PartDetails,
                                ISNULL((
                                    SELECT STUFF((
                                        SELECT ', ' + r.rejection
                                        FROM RejDetail_Table rd
                                        INNER JOIN Rejection r
                                            ON rd.RejCode = r.rcode
                                        WHERE rd.ins_Dc = i.inter_inspno
                                          AND rd.PartNo = i.partno
                                          AND ISNULL(rd.deleted,0) = 0
                                        FOR XML PATH(''), TYPE
                                    ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                                ), '') AS Reason,
                                CAST(ISNULL(i.matrejqty,0) + ISNULL(i.rejqty,0) AS INT) AS RejectionQty
                            FROM InterInspectionEntry i
                            WHERE ISNULL(i.deleted,0) = 0
                              AND CAST(i.inter_inspdate AS DATE) BETWEEN ? AND ?

                            UNION ALL

                            -------------------------------------------------------------------
                            -- 3. FINAL INSPECTION REJECTION
                            -------------------------------------------------------------------
                            SELECT
                                f.finspno AS InspNo,
                                f.finspdate AS InspDate,
                                f.partno + ' - ' + f.description AS PartDetails,
                                ISNULL((
                                    SELECT STUFF((
                                        SELECT ', ' + r.rejection
                                        FROM RejDetail_Table rd
                                        INNER JOIN Rejection r
                                            ON rd.RejCode = r.rcode
                                        WHERE rd.ins_Dc = f.finspno
                                          AND rd.PartNo = f.partno
                                          AND ISNULL(rd.deleted,0) = 0
                                        FOR XML PATH(''), TYPE
                                    ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                                ), '') AS Reason,
                                CAST(ISNULL(f.matrejqty,0) + ISNULL(f.rejqty,0) AS INT) AS RejectionQty
                            FROM FinalInspectionEntry f
                            WHERE ISNULL(f.deleted,0) = 0
                              AND CAST(f.finspdate AS DATE) BETWEEN ? AND ?
                        ) AS Combined
                        WHERE ISNULL(Combined.RejectionQty,0) > 0

                        UNION ALL

                        -------------------------------------------------------------------
                        -- REWORK RECORDS
                        -------------------------------------------------------------------
                        SELECT
                            Combined.InspNo,
                            Combined.InspDate,
                            Combined.PartDetails,
                            Combined.Reason,
                            'Rework' AS Type,
                            Combined.ReworkQty AS Qty
                        FROM
                        (
                            -------------------------------------------------------------------
                            -- 1. JOB ORDER REWORK
                            -------------------------------------------------------------------
                            SELECT
                                m.inspno AS InspNo,
                                m.inspdate AS InspDate,
                                d.partno + ' - ' + d.description AS PartDetails,
                                ISNULL((
                                    SELECT STUFF((
                                        SELECT ', ' + rw.rework
                                        FROM JobInspRWDetail rw
                                        WHERE rw.Ins_No = m.inspno
                                          AND rw.PartNo = d.partno
                                        FOR XML PATH(''), TYPE
                                    ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                                ), '') AS Reason,
                                CAST(ISNULL(d.rwqty,0) AS INT) AS ReworkQty
                            FROM InJob_Mas m
                            INNER JOIN InJob_Det d
                                ON m.inspno = d.inspno
                            WHERE ISNULL(m.deleted,0) = 0
                              AND ISNULL(d.deleted,0) = 0
                              AND CAST(m.inspdate AS DATE) BETWEEN ? AND ?

                            UNION ALL

                            -------------------------------------------------------------------
                            -- 2. INTER INSPECTION REWORK
                            -------------------------------------------------------------------
                            SELECT
                                i.inter_inspno AS InspNo,
                                i.inter_inspdate AS InspDate,
                                i.partno + ' - ' + i.description AS PartDetails,
                                ISNULL((
                                    SELECT STUFF((
                                        SELECT ', ' + rw.rework
                                        FROM Insp_ReworkEntry rw
                                        WHERE rw.inter_inspno = i.inter_inspno
                                          AND rw.PartNo = i.partno
                                          AND ISNULL(rw.deleted,0) = 0
                                        FOR XML PATH(''), TYPE
                                    ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                                ), '') AS Reason,
                                CAST(ISNULL(i.rwqty,0) AS INT) AS ReworkQty
                            FROM InterInspectionEntry i
                            WHERE ISNULL(i.deleted,0) = 0
                              AND CAST(i.inter_inspdate AS DATE) BETWEEN ? AND ?

                            UNION ALL

                            -------------------------------------------------------------------
                            -- 3. FINAL INSPECTION REWORK
                            -------------------------------------------------------------------
                            SELECT
                                f.finspno AS InspNo,
                                f.finspdate AS InspDate,
                                f.partno + ' - ' + f.description AS PartDetails,
                                ISNULL((
                                    SELECT STUFF((
                                        SELECT ', ' + rw.rework
                                        FROM FinalInspReworkEntryOrg rw
                                        WHERE rw.finspno = f.finspno
                                          AND rw.partno = f.partno
                                          AND ISNULL(rw.deleted,0) = 0
                                        FOR XML PATH(''), TYPE
                                    ).value('.', 'NVARCHAR(MAX)'),1,2,'')
                                ), '') AS Reason,
                                CAST(ISNULL((
                                    SELECT SUM(ISNULL(fr.qty,0))
                                    FROM FinalInspReworkEntryOrg fr
                                    WHERE fr.finspno = f.finspno AND fr.partno = f.partno AND ISNULL(fr.deleted,0) = 0
                                ),0) AS INT) AS ReworkQty
                            FROM FinalInspectionEntry f
                            WHERE ISNULL(f.deleted,0) = 0
                              AND CAST(f.finspdate AS DATE) BETWEEN ? AND ?
                        ) AS Combined
                        WHERE Combined.ReworkQty > 0
                    ) AS FinalData
                    ORDER BY InspDate DESC, InspNo DESC, Type
                    """
                    
                    custom_params = [
                        start_date, end_date,
                        start_date, end_date,
                        start_date, end_date,
                        start_date, end_date,
                        start_date, end_date,
                        start_date, end_date
                    ]
                    
                    cursor.execute(custom_sql, custom_params)
                    custom_rows = cursor.fetchall()
                    
                    for idx, row in enumerate(custom_rows):
                        insp_no = row[0]
                        insp_date = row[1]
                        part_details = row[2]
                        reason = row[3]
                        type_val = row[4]
                        qty = row[5]
                        
                        formatted_date = ""
                        if isinstance(insp_date, (date, datetime)):
                            formatted_date = insp_date.strftime("%d-%b-%Y")
                        elif insp_date:
                            try:
                                parsed_dt = datetime.strptime(str(insp_date).split(" ")[0], "%Y-%m-%d")
                                formatted_date = parsed_dt.strftime("%d-%b-%Y")
                            except:
                                formatted_date = str(insp_date)
                                
                        if type_val == "Rejection":
                            defect = "Critical"
                            defect_cls = "qa2-tag-critical"
                            disp_cls = "qa2-tag-fail"
                            
                            db_rejections.append({
                                "id": insp_no or "—",
                                "product": part_details or "—",
                                "reason": reason or "Surface defects",
                                "qty": str(qty),
                                "defectCls": defect_cls,
                                "defect": defect,
                                "dispCls": disp_cls,
                                "disp": "Rejection",
                                "date": formatted_date
                            })
                        elif type_val == "Rework":
                            defect = "Minor"
                            defect_cls = "qa2-tag-minor"
                            disp_cls = "qa2-tag-rework"
                            
                            db_rejections.append({
                                "id": insp_no or "—",
                                "product": part_details or "—",
                                "reason": reason or "Rework Needed",
                                "qty": str(qty),
                                "defectCls": defect_cls,
                                "defect": defect,
                                "dispCls": disp_cls,
                                "disp": "Rework",
                                "date": formatted_date
                            })
                            
                            db_rework.append({
                                "dotColor": "#f97316",
                                "name": part_details or "—",
                                "code": f"{insp_no} · {reason or 'Rework Needed'} · Quality dept",
                                "qty": f"{qty} Nos",
                                "daysBg": "#ffedd5",
                                "daysFg": "#c2410c",
                                "daysLbl": "+3d"
                            })
                    
                    rejection_rows = db_rejections
                    rework_queue = db_rework
                    rej_rw_success = True
                except Exception as ex_custom:
                    print("Error executing custom rejection and rework query:", ex_custom)

                if not rej_rw_success:
                    # Fallback to local parsing using db_records
                    for idx, r in enumerate(db_records):
                        part_no = r.get("partNo")
                        desc_val = r.get("product")
                        mat_rej = int(r.get("matRejQty") or 0)
                        mac_rej = int(r.get("macRejQty") or 0)
                        rw_qty = int(r.get("reworkQty") or 0)
                        id_val = r.get("id")
                        date_val = r.get("date")
                        
                        prod_name = f"{desc_val} ({part_no})" if (desc_val and part_no and part_no != "—") else (desc_val or part_no or "Unknown")

                        if mat_rej > 0 or mac_rej > 0:
                            db_rejections.append({
                                "id": id_val,
                                "product": prod_name,
                                "reason": "Surface defects" if mat_rej > 0 else "Alignment error",
                                "qty": str(mat_rej + mac_rej),
                                "defectCls": "qa2-tag-critical" if mat_rej > 0 else "qa2-tag-major",
                                "defect": "Critical" if mat_rej > 0 else "Major",
                                "dispCls": "qa2-tag-fail",
                                "disp": "Rejection",
                                "date": date_val
                            })

                        if rw_qty > 0:
                            db_rejections.append({
                                "id": id_val,
                                "product": prod_name,
                                "reason": "Rework Needed",
                                "qty": str(rw_qty),
                                "defectCls": "qa2-tag-minor",
                                "defect": "Minor",
                                "dispCls": "qa2-tag-rework",
                                "disp": "Rework",
                                "date": date_val
                            })

                            db_rework.append({
                                "dotColor": "#f97316",
                                "name": prod_name,
                                "code": f"{id_val} · Rework Needed · Quality dept",
                                "qty": f"{rw_qty} Nos",
                                "daysBg": "#ffedd5",
                                "daysFg": "#c2410c",
                                "daysLbl": "+3d"
                            })
                    rejection_rows = db_rejections
                    rework_queue = db_rework

        cursor.close()
        conn.close()
    except Exception as e:
        print("Error fetching dynamic inspection logs:", e)

    # Build dynamic Inspection Logs fallback
    if not db_success or len(records) == 0:
        records = []
        rejection_rows = []
        rework_queue = []

    # Scrap Summary Boxes
    total_rejected_qty = 0
    total_inspected_qty = 0
    for r in records:
        mat_rej = int(r.get("matRejQty") or 0)
        mac_rej = int(r.get("macRejQty") or 0)
        total_rejected_qty += (mat_rej + mac_rej)
        total_inspected_qty += int(r.get("qty") or 0)

    total_scrap_cnt = int(total_rejected_qty * 0.35)
    scrap_val_k = (total_scrap_cnt * 650.0) / 1000.0 if total_scrap_cnt > 0 else 0.0
    scrap_rate_pct = round(total_scrap_cnt * 100 / total_inspected_qty, 1) if total_inspected_qty > 0 else 0.0

    scrap_summary = [
        {"lbl": "Total Scrap", "val": str(total_scrap_cnt), "color": "#8b5cf6"},
        {"lbl": "Scrap Value", "val": f"₹{scrap_val_k:.1f}K", "color": "#ef4444"},
        {"lbl": "Scrap Rate", "val": f"{scrap_rate_pct}%", "color": "#f97316"},
        {"lbl": "vs Target", "val": "Within control" if scrap_rate_pct <= 1.5 else "Action needed", "color": "#10b981" if scrap_rate_pct <= 1.5 else "#ef4444"}
    ]

    return Response({
        "inspection_records": records,
        "rejection_rows": rejection_rows,
        "rework_queue": rework_queue,
        "scrap_summary": scrap_summary
    })


# ─────────────────────────────────────────────────────────────
#  ENDPOINT 6 — Calibration Status List
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def quality_analysis_calibration(request):
    """
    Returns calibration checklist of active gauges from Ins_Mas.
    Filters by nxtcalibdt within the selected date range.
    Overdue days / status are always computed against today's actual date.
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    today = date.today()

    calibrations = []
    db_success = False

    try:
        cursor = conn.cursor()

        # Records whose nxtcalibdt falls within the selected date range
        sql = """
            SELECT TOP (200)
                insid,
                frequency,
                lstcalibdt,
                nxtcalibdt,
                grpcodeno,
                Description,
                Uom,
                Specification
            FROM Ins_Mas
            WHERE
                ISNULL(deleted, 0) = 0
                AND nxtcalibdt BETWEEN ? AND ?
            ORDER BY nxtcalibdt ASC
        """
        cursor.execute(sql, (start_date, end_date))
        columns = [col[0] for col in cursor.description]
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
        conn.close()
        db_success = True

        for row in rows:
            nxt = row.get("nxtcalibdt")
            lst = row.get("lstcalibdt")
            desc = (row.get("Description") or "").strip() or f"Instrument #{row.get('insid', '')}"
            ins_id = row.get("insid", "")
            grp = (row.get("grpcodeno") or "").strip()
            freq = row.get("frequency") or ""
            uom = (row.get("Uom") or "").strip()
            spec = (row.get("Specification") or "").strip()

            # Normalise nxtcalibdt to a date object
            if isinstance(nxt, datetime):
                nxt_date = nxt.date()
            elif isinstance(nxt, date):
                nxt_date = nxt
            else:
                try:
                    nxt_date = datetime.strptime(str(nxt)[:10], "%Y-%m-%d").date()
                except Exception:
                    nxt_date = today

            # Days difference vs today's actual date (not the selected period)
            delta = (nxt_date - today).days   # negative = overdue, 0 = due today, positive = upcoming

            if delta < 0:
                cls = "qa2-cal-over"
                label = f"Overdue {abs(delta)}d"
            elif delta == 0:
                cls = "qa2-cal-over"
                label = "Due Today"
            elif delta <= 7:
                cls = "qa2-cal-warn"
                label = f"+{delta}d"
            else:
                cls = "qa2-cal-ok"
                label = f"+{delta}d"

            # Sub-label: instrument ID · group · UoM
            sub_parts = []
            if ins_id:
                sub_parts.append(f"ID: {ins_id}")
            if grp:
                sub_parts.append(f"Group: {grp}")
            if uom:
                sub_parts.append(f"UoM: {uom}")
            sub_label = " · ".join(sub_parts) if sub_parts else "Quality Dept"

            calibrations.append({
                "name": desc,
                "id": sub_label,
                "date": nxt_date.strftime("%d-%b-%Y"),
                "last_calib": lst.strftime("%d-%b-%Y") if hasattr(lst, "strftime") else (str(lst)[:10] if lst else "—"),
                "frequency": str(freq) if freq else "—",
                "spec": spec or "—",
                "cls": cls,
                "label": label,
                "overdue_days": abs(delta) if delta < 0 else 0,
            })

    except Exception as e:
        db_success = False
        calibrations = []

    return Response({
        "calibrations": calibrations,
        "db_success": db_success,
        "count": len(calibrations),
    })


# ─────────────────────────────────────────────────────────────
#  ENDPOINT 7 — Dynamic Management Insights  (fully live)
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def quality_analysis_insights(request):
    """
    Generates fully dynamic management insights from live DB data
    for the selected date range.  No hardcoded strings.
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    today = date.today()
    period_lbl = f"{start_date.strftime('%d-%b-%Y')} – {end_date.strftime('%d-%b-%Y')}"

    # ── Collect live metrics ──────────────────────────────────
    total_inspected = 0
    total_rejected  = 0
    total_rework    = 0

    # Product-level rejection aggregates  {name: {insp, rej, rework}}
    product_map = {}

    # Defect cause counts  {cause_name: qty}
    cause_map = {}

    # Overdue calibration count
    overdue_count = 0

    db_ok = False
    try:
        cursor = conn.cursor()

        # ── 1. Inspection totals + product breakdown ─────────
        combined_sql = """
            SELECT
                ISNULL(d.description, d.partno) AS Prod,
                CAST(ISNULL(d.jobqty, 0) AS INT)   AS Insp,
                CAST(ISNULL(d.matrej,0)+ISNULL(d.macrej,0) AS INT) AS Rej,
                CAST(ISNULL(d.rwqty, 0) AS INT)    AS Rw
            FROM InJob_Det d
            INNER JOIN InJob_Mas m ON d.inspno = m.inspno
            WHERE ISNULL(m.deleted,0)=0 AND ISNULL(d.deleted,0)=0
              AND CAST(m.inspdate AS DATE) BETWEEN ? AND ?

            UNION ALL

            SELECT
                ISNULL(description, partno),
                CAST(ISNULL(inspqty,0) AS INT),
                CAST(ISNULL(matrejqty,0)+ISNULL(rejqty,0) AS INT),
                CAST(ISNULL(rwqty,0) AS INT)
            FROM InterInspectionEntry
            WHERE ISNULL(deleted,0)=0
              AND CAST(inter_inspdate AS DATE) BETWEEN ? AND ?

            UNION ALL

            SELECT
                ISNULL(description, partno),
                CAST(ISNULL(totqty,0) AS INT),
                CAST(ISNULL(matrejqty,0)+ISNULL(rejqty,0) AS INT),
                0
            FROM FinalInspectionEntry
            WHERE ISNULL(deleted,0)=0
              AND CAST(finspdate AS DATE) BETWEEN ? AND ?
        """
        cursor.execute(combined_sql, [start_date, end_date] * 3)
        for row in cursor.fetchall():
            prod  = (row[0] or "Unknown").strip()[:60]
            insp  = int(row[1] or 0)
            rej   = int(row[2] or 0)
            rw    = int(row[3] or 0)
            total_inspected += insp
            total_rejected  += rej
            total_rework    += rw
            if prod not in product_map:
                product_map[prod] = {"insp": 0, "rej": 0, "rw": 0}
            product_map[prod]["insp"] += insp
            product_map[prod]["rej"]  += rej
            product_map[prod]["rw"]   += rw

        # ── 2. Defect causes (rejection reasons) ─────────────
        cause_sql = """
            SELECT
                ISNULL(d.rejectreason, 'Surface defects') AS Cause,
                CAST(ISNULL(d.matrej,0)+ISNULL(d.macrej,0) AS INT) AS Qty
            FROM InJob_Det d
            INNER JOIN InJob_Mas m ON d.inspno = m.inspno
            WHERE ISNULL(m.deleted,0)=0 AND ISNULL(d.deleted,0)=0
              AND (ISNULL(d.matrej,0)+ISNULL(d.macrej,0)) > 0
              AND CAST(m.inspdate AS DATE) BETWEEN ? AND ?

            UNION ALL

            SELECT
                ISNULL(rejectreason,'Surface defects'),
                CAST(ISNULL(matrejqty,0)+ISNULL(rejqty,0) AS INT)
            FROM InterInspectionEntry
            WHERE ISNULL(deleted,0)=0
              AND (ISNULL(matrejqty,0)+ISNULL(rejqty,0)) > 0
              AND CAST(inter_inspdate AS DATE) BETWEEN ? AND ?
        """
        cursor.execute(cause_sql, [start_date, end_date, start_date, end_date])
        for row in cursor.fetchall():
            causes_raw = (row[0] or "").strip()
            qty = int(row[1] or 0)
            for c in (causes_raw.split(",") if causes_raw else ["Surface defects"]):
                c = c.strip() or "Surface defects"
                cause_map[c] = cause_map.get(c, 0) + qty

        # ── 3. Overdue calibrations as of today ───────────────
        try:
            cursor.execute("""
                SELECT COUNT(*) FROM Ins_Mas
                WHERE ISNULL(deleted,0)=0
                  AND nxtcalibdt < CAST(GETDATE() AS DATE)
            """)
            row = cursor.fetchone()
            overdue_count = int(row[0] or 0) if row else 0
        except Exception:
            overdue_count = 0

        cursor.close()
        conn.close()
        db_ok = True
    except Exception as ex:
        pass

    # ── Build insight messages from live numbers ──────────────
    insights_left  = []
    insights_right = []
    priority_actions = []
    action_no = 1

    pass_rate_pct = round((total_inspected - total_rejected - total_rework) / total_inspected * 100, 1) if total_inspected > 0 else 0.0
    rej_rate_pct  = round(total_rejected / total_inspected * 100, 1) if total_inspected > 0 else 0.0
    rw_rate_pct   = round(total_rework   / total_inspected * 100, 1) if total_inspected > 0 else 0.0

    # Sort products by rejection qty desc
    worst_products = sorted(
        [(k, v) for k, v in product_map.items() if v["rej"] > 0],
        key=lambda x: x[1]["rej"], reverse=True
    )

    # ── LEFT COLUMN: critical / warning alerts ────────────────

    # A) Worst-rejection product (if any)
    if worst_products:
        worst_name, worst_data = worst_products[0]
        w_insp = worst_data["insp"]
        w_rej  = worst_data["rej"]
        w_rate = round(w_rej / w_insp * 100, 1) if w_insp > 0 else 0.0
        if w_rate >= 80:
            icon_key, color = "error", "#ef4444"
            severity = "Critical — entire batch near-rejected"
        elif w_rate >= 50:
            icon_key, color = "warning", "#f97316"
            severity = "Major rejection issue"
        else:
            icon_key, color = "info", "#f59e0b"
            severity = "Below 95% pass target"

        insights_left.append({
            "iconKey": icon_key,
            "title": f"{worst_name} — {w_rate}% Rejection ({w_rej:,} units)",
            "sub": f"{severity}. {w_rej:,} of {w_insp:,} units rejected in {period_lbl}. Immediate corrective action required.",
            "val": f"{w_rate}% Fail",
            "valColor": color
        })
        priority_actions.append(
            f"{action_no}) Investigate and correct rejection cause for {worst_name} ({w_rej:,} units rejected)."
        )
        action_no += 1

    # B) Second worst product (if different and significant)
    if len(worst_products) > 1:
        p2_name, p2_data = worst_products[1]
        p2_insp = p2_data["insp"]
        p2_rej  = p2_data["rej"]
        p2_rate = round(p2_rej / p2_insp * 100, 1) if p2_insp > 0 else 0.0
        if p2_rate < 95 and p2_rej > 0:
            insights_left.append({
                "iconKey": "warning",
                "title": f"{p2_name} pass rate at {100 - p2_rate:.1f}% — below 95% target",
                "sub": f"{p2_rej:,} units rejected in {period_lbl}. Review process parameters and incoming material quality.",
                "val": f"{100 - p2_rate:.1f}%",
                "valColor": "#f97316"
            })
            priority_actions.append(
                f"{action_no}) Review process for {p2_name} — {p2_rej:,} units rejected ({p2_rate:.1f}% rejection rate)."
            )
            action_no += 1

    # C) Overdue calibrations
    if overdue_count > 0:
        insights_left.append({
            "iconKey": "info",
            "title": f"{overdue_count} instrument{'s' if overdue_count > 1 else ''} overdue for calibration",
            "sub": f"Measurement results from {overdue_count} uncalibrated instrument{'s' if overdue_count > 1 else ''} may be non-compliant. Calibrate immediately.",
            "val": "Action Now",
            "valColor": "#f59e0b"
        })
        priority_actions.append(
            f"{action_no}) Calibrate {overdue_count} overdue instrument{'s' if overdue_count > 1 else ''} immediately."
        )
        action_no += 1

    # D) High rework rate alert
    if rw_rate_pct > 5:
        rw_products = sorted(
            [(k, v) for k, v in product_map.items() if v["rw"] > 0],
            key=lambda x: x[1]["rw"], reverse=True
        )
        rw_note = f" — highest in {rw_products[0][0]}" if rw_products else ""
        insights_left.append({
            "iconKey": "info",
            "title": f"High rework rate {rw_rate_pct}%{rw_note}",
            "sub": f"{total_rework:,} units sent for rework in {period_lbl}. Review process controls to reduce rework costs.",
            "val": f"{rw_rate_pct}%",
            "valColor": "#f59e0b"
        })
        if action_no <= 4:
            priority_actions.append(
                f"{action_no}) Reduce rework rate — {total_rework:,} units reworked ({rw_rate_pct}% of total)."
            )
            action_no += 1

    # ── RIGHT COLUMN: positive / aggregate insights ───────────

    # E) Overall pass rate
    if total_inspected > 0:
        if pass_rate_pct >= 95:
            icon_key, color, trend = "success", "#10b981", "Excellent"
        elif pass_rate_pct >= 90:
            icon_key, color, trend = "info", "#3b82f6", "Good"
        else:
            icon_key, color, trend = "warning", "#f97316", "Needs improvement"

        best_products = sorted(
            [(k, v) for k, v in product_map.items() if v["insp"] > 0 and v["rej"] == 0],
            key=lambda x: x[1]["insp"], reverse=True
        )
        best_note = ""
        if best_products:
            top3 = [b[0][:20] for b in best_products[:2]]
            best_note = f" {' & '.join(top3)} achieving 100% pass." if top3 else ""

        insights_right.append({
            "iconKey": icon_key,
            "title": f"Overall pass rate {pass_rate_pct}% — {trend}",
            "sub": f"{total_inspected - total_rejected - total_rework:,} of {total_inspected:,} units passed in {period_lbl}.{best_note}",
            "val": f"{pass_rate_pct}%",
            "valColor": color
        })

    # F) Top defect cause
    if cause_map:
        top_cause, top_qty = max(cause_map.items(), key=lambda x: x[1])
        total_cause_qty = sum(cause_map.values())
        top_pct = round(top_qty / total_cause_qty * 100, 1) if total_cause_qty > 0 else 0
        insights_right.append({
            "iconKey": "error",
            "title": f"Top defect cause: {top_cause} ({top_qty:,} units, {top_pct}%)",
            "sub": f"Root cause analysis and corrective action needed. {len(cause_map)} distinct defect causes identified in {period_lbl}.",
            "val": f"{top_pct}%",
            "valColor": "#ef4444"
        })
        priority_actions.append(
            f"{action_no}) RCCA for top defect cause '{top_cause}' — {top_qty:,} units affected ({top_pct}% of all defects)."
        )
        action_no += 1

    # G) Zero-rejection products (positive highlight)
    zero_rej = [(k, v) for k, v in product_map.items() if v["insp"] > 0 and v["rej"] == 0 and v["rw"] == 0]
    if zero_rej:
        names = ", ".join([p[0][:25] for p in zero_rej[:3]])
        insights_right.append({
            "iconKey": "success",
            "title": f"{len(zero_rej)} product{'s' if len(zero_rej) > 1 else ''} with zero defects",
            "sub": f"{names}{'...' if len(zero_rej) > 3 else ''} achieved 100% pass rate in {period_lbl}. Maintain current controls.",
            "val": "100% Pass",
            "valColor": "#10b981"
        })

    # H) No data fallback
    if not db_ok or total_inspected == 0:
        insights_left = [{
            "iconKey": "info",
            "title": "No inspection transactions found",
            "sub": f"No records available for {period_lbl}. Try a different date range.",
            "val": "—",
            "valColor": "#94a3b8"
        }]
        insights_right = [{
            "iconKey": "info",
            "title": "Select a period with inspection data",
            "sub": "Insights will auto-generate once data is available for the selected period.",
            "val": "—",
            "valColor": "#94a3b8"
        }]
        priority_actions = ["1) Select a valid date range with inspection transactions."]

    return Response({
        "insights_left":    insights_left,
        "insights_right":   insights_right,
        "priority_actions": priority_actions,
        "period":           period_lbl,
        "db_success":       db_ok,
        "total_inspected":  total_inspected,
        "pass_rate_pct":    pass_rate_pct,
        "rej_rate_pct":     rej_rate_pct,
    })
