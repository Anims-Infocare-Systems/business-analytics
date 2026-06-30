# ════════════════════════════════════════════
#  views_operator_efficiency_report.py
#  Plant Performance — Operator Efficiency (OPREFF)
#  Source: ProductionEntry + ConvProductionEntry + ConvProductionEntryRod
# ════════════════════════════════════════════

from .views_efficiency_report import (
    _efficiency_data_cte_branches,
    _efficiency_query_date_range,
    _month_label_from_date,
    _month_labels_for_payload,
)


def _operator_performance_cte_sql(include_cnc=True, include_conv=True):
    branches = _efficiency_data_cte_branches(include_cnc, include_conv)
    if not branches:
        return None
    return "WITH OPERATOR_PERFORMANCE AS (\n" + "\n    UNION ALL\n".join(branches) + "\n)"


def _idle_pct(shift_secs, acc_idle, nonacc_idle):
    shift = float(shift_secs or 0)
    if shift <= 0:
        return 0.0
    idle = float(acc_idle or 0) + float(nonacc_idle or 0)
    return round(min(100.0, max(0.0, (idle / shift) * 100.0)), 2)


def _fetch_combined_operator_efficiency_rows(
    cursor, start_date, end_date, include_cnc=True, include_conv=True
):
    """Combined OPERATOR_PERFORMANCE rows — OPREFF as main KPI."""
    cte = _operator_performance_cte_sql(include_cnc, include_conv)
    if not cte:
        return []

    sql = f"""
        {cte}
        SELECT
            ED.EntryDate,
            YEAR(ED.EntryDate) AS YearNo,
            MONTH(ED.EntryDate) AS MonthNo,
            DATENAME(MONTH, ED.EntryDate) AS MonthName,
            ED.SourceTable,
            ED.shift,
            LTRIM(RTRIM(CAST(ISNULL(ED.macno, N'') AS NVARCHAR(128)))) AS macno,
            LTRIM(RTRIM(CAST(ISNULL(ED.oprname, N'') AS NVARCHAR(512)))) AS oprname,
            ISNULL(ED.PartNo, N'') AS PartNo,
            ISNULL(ED.Process, N'') AS Process,
            ED.shifttimesecs,
            ED.accidletimesecs,
            ED.nonaccidletimesecs,
            CAST(ISNULL(ED.ProductionQty, 0) AS FLOAT) AS ProductionQty,
            CAST(ISNULL(ED.RejectionQty, 0) AS FLOAT) AS RejectionQty,
            CAST(ISNULL(ED.ReworkQty, 0) AS FLOAT) AS ReworkQty,
            CAST(ED.OAEFF AS FLOAT) AS Availability,
            CAST(ED.OPREFF AS FLOAT) AS OperatorEfficiency,
            CAST(ED.QFNEW AS FLOAT) AS Quality,
            CAST(ED.OEENEW AS FLOAT) AS OEE
        FROM OPERATOR_PERFORMANCE AS ED
        WHERE ED.EntryDate BETWEEN ? AND ?
          AND ED.macno IS NOT NULL AND LTRIM(RTRIM(ED.macno)) <> N''
          AND ED.oprname IS NOT NULL AND LTRIM(RTRIM(ED.oprname)) <> N''
          AND ED.OPREFF IS NOT NULL
        ORDER BY ED.EntryDate, ED.macno, ED.shift, ED.SourceTable
    """
    cursor.execute(sql, [start_date, end_date])
    return cursor.fetchall() or []


def _combined_operator_eff_monthwise(
    cursor, start_date, end_date, include_cnc=True, include_conv=True
):
    """Month-wise average OPREFF (FY order Apr–Mar)."""
    cte = _operator_performance_cte_sql(include_cnc, include_conv)
    if not cte:
        return {"labels": [], "data": []}

    sql = f"""
        {cte}
        SELECT MONTH(EntryDate) AS MonthNum, AVG(CAST(OPREFF AS FLOAT)) AS Avg_OPREFF
        FROM OPERATOR_PERFORMANCE
        WHERE EntryDate BETWEEN ? AND ?
          AND OPREFF IS NOT NULL
        GROUP BY MONTH(EntryDate)
        ORDER BY MONTH(EntryDate)
    """
    try:
        cursor.execute(sql, [start_date, end_date])
        rows = cursor.fetchall() or []
    except Exception:
        return {"labels": [], "data": []}

    from .views import month_key_from_db

    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    labels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
    op_map = {m: 0.0 for m in month_order}
    for month_num, avg_op in rows:
        mk = month_key_from_db(month_num)
        if mk in op_map:
            op_map[mk] = round(float(avg_op or 0), 2)
    return {"labels": labels, "data": [op_map[m] for m in month_order]}


def _compute_operator_efficiency_kpis(rows, start_date, end_date):
    from datetime import datetime

    scoped = []
    for r in rows:
        d = r.get("date")
        if not d:
            continue
        try:
            dt = datetime.strptime(d[:10], "%Y-%m-%d").date()
            if start_date <= dt <= end_date:
                scoped.append(r)
        except Exception:
            continue
    use_rows = scoped if scoped else rows
    if not use_rows:
        return {
            "totalPlannedQty": 0,
            "totalProducedQty": 0,
            "totalRejections": 0,
            "avgEfficiency": 0,
            "rowCount": 0,
        }

    total_produced = sum(float(r.get("producedQty") or 0) for r in use_rows)
    total_rejections = sum(float(r.get("rejectionQty") or 0) for r in use_rows)
    total_rework = sum(float(r.get("reworkQty") or 0) for r in use_rows)
    total_planned = sum(float(r.get("plannedQty") or 0) for r in use_rows)
    avg_eff = round(
        sum(float(r.get("operatorPct") or 0) for r in use_rows) / len(use_rows), 2
    )

    return {
        "totalPlannedQty": int(round(total_planned)),
        "totalProducedQty": int(round(total_produced)),
        "totalRejections": int(round(total_rejections + total_rework)),
        "avgEfficiency": avg_eff,
        "rowCount": len(use_rows),
    }


def build_operator_efficiency_compare_payload(
    cursor, start_date, end_date, include_cnc=True, include_conv=True, load_full_fy=True
):
    """Structured payload for Plant Performance Operator Efficiency panel."""
    from datetime import datetime, date
    from .views import current_financial_year

    if load_full_fy:
        query_start, query_end = _efficiency_query_date_range(True, start_date, end_date)
    else:
        query_start, query_end = start_date, end_date

    raw_rows = _fetch_combined_operator_efficiency_rows(
        cursor, query_start, query_end, include_cnc, include_conv
    )
    if not raw_rows and load_full_fy:
        fy_start, _fy_end = current_financial_year()
        prev_start = date(fy_start.year - 1, 4, 1)
        prev_end = date(fy_start.year, 3, 31)
        raw_rows = _fetch_combined_operator_efficiency_rows(
            cursor, prev_start, prev_end, include_cnc, include_conv
        )
        if raw_rows:
            query_start, query_end = prev_start, prev_end

    rows = []
    operators_set = set()

    for row in raw_rows:
        if len(row) < 18:
            continue
        (
            entry_date,
            _year_no,
            _month_no,
            _month_name,
            source_table,
            shift,
            macno,
            oprname,
            part_no,
            process,
            shift_secs,
            acc_idle,
            nonacc_idle,
            prod_qty,
            rej_qty,
            rework_qty,
            availability,
            operator_eff,
            quality,
            oee,
        ) = row[:20]

        operator_s = str(oprname or "").strip()
        mac_s = str(macno or "").strip()
        if not operator_s or not mac_s or operator_eff is None:
            continue

        date_str = ""
        month_label = "—"
        year_val = None
        if entry_date:
            if hasattr(entry_date, "strftime"):
                date_str = entry_date.strftime("%Y-%m-%d")
                month_label = _month_label_from_date(entry_date)
                year_val = entry_date.year
            else:
                date_str = str(entry_date).strip()[:10]
                try:
                    parsed_dt = datetime.strptime(date_str, "%Y-%m-%d")
                    month_label = _month_label_from_date(parsed_dt)
                    year_val = parsed_dt.year
                except Exception:
                    pass

        produced = float(prod_qty or 0)
        rejection = float(rej_qty or 0)
        rework = float(rework_qty or 0)
        planned = produced + rejection + rework

        rows.append({
            "date": date_str,
            "month": month_label,
            "year": year_val,
            "operator": operator_s,
            "macno": mac_s,
            "shift": str(shift or "").strip(),
            "partNo": str(part_no or "").strip(),
            "process": str(process or "").strip(),
            "sourceTable": str(source_table or "").strip(),
            "oaEff": round(float(availability or 0), 2),
            "operatorPct": round(float(operator_eff), 2),
            "qfEff": round(float(quality or 0), 2),
            "oee": round(float(oee or 0), 2),
            "idle": _idle_pct(shift_secs, acc_idle, nonacc_idle),
            "plannedQty": int(round(planned)),
            "producedQty": int(round(produced)),
            "rejectionQty": int(round(rejection)),
            "reworkQty": int(round(rework)),
        })
        operators_set.add(operator_s)

    month_labels = _month_labels_for_payload(rows, start_date, end_date, query_start, query_end)

    monthwise = None
    try:
        monthwise = _combined_operator_eff_monthwise(
            cursor, query_start, query_end, include_cnc, include_conv
        )
    except Exception:
        monthwise = None

    kpis = _compute_operator_efficiency_kpis(rows, start_date, end_date)

    machine_types = []
    if include_cnc:
        machine_types.append("CNC")
    if include_conv:
        machine_types.append("Conventional")

    return {
        "from": str(start_date),
        "to": str(end_date),
        "queryFrom": str(query_start),
        "queryTo": str(query_end),
        "rows": rows,
        "monthLabels": month_labels,
        "monthwise": monthwise,
        "kpis": kpis,
        "filterOptions": {
            "operators": sorted(operators_set),
            "machineTypes": machine_types,
        },
    }
