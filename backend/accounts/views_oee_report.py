# ════════════════════════════════════════════
#  views_oee_report.py
#  Plant Performance — OEE (OEENEW) from combined production tables
# ════════════════════════════════════════════

from .views_efficiency_report import (
    _parse_bool_param,
    _efficiency_data_cte_branches,
    _resolve_department_join,
    _legacy_department_join,
    _mac_type_expr,
    _month_label_from_date,
    _months_in_range,
    _month_labels_for_payload,
    _efficiency_query_date_range,
    _fetch_efficiency_entry_rows,
    _MONTH_ABB_EFF,
)


def _oee_data_cte_sql(include_cnc=True, include_conv=True):
    branches = _efficiency_data_cte_branches(include_cnc, include_conv)
    if not branches:
        return None
    return "WITH OEE_DATA AS (\n" + "\n    UNION ALL\n".join(branches) + "\n)"


def _fetch_combined_oee_rows(cursor, start_date, end_date, include_cnc=True, include_conv=True):
    """OEE detail rows — OEENEW + Availability/Performance/Quality + team."""
    cte = _oee_data_cte_sql(include_cnc, include_conv)
    if not cte:
        return []

    dept_join = _resolve_department_join(cursor) or _legacy_department_join()
    opr_expr = "LTRIM(RTRIM(CAST(ISNULL(ED.oprname, N'') AS NVARCHAR(512))))"
    joins = dept_join["joins"].replace("AR.Operator", opr_expr)
    sql = f"""
        {cte}
        SELECT
            {opr_expr} AS Operator,
            {dept_join['dept_expr']} AS Dept,
            LTRIM(RTRIM(CAST(ISNULL(ED.macno, N'') AS NVARCHAR(128)))) AS MacNo,
            ED.EntryDate,
            CAST(ED.OAEFF AS FLOAT) AS Availability,
            CAST(ED.OPREFF AS FLOAT) AS Performance,
            CAST(ED.QFNEW AS FLOAT) AS Quality,
            CAST(ED.OEENEW AS FLOAT) AS OverallOEE,
            {_mac_type_expr()} AS MacType,
            ED.SourceTable
        FROM OEE_DATA AS ED
        {joins}
        WHERE ED.EntryDate BETWEEN ? AND ?
          AND ED.macno IS NOT NULL AND LTRIM(RTRIM(ED.macno)) <> N''
          AND ED.OEENEW IS NOT NULL
        ORDER BY ED.EntryDate, ED.macno, ED.shift, ED.SourceTable
    """
    params = [start_date, end_date]
    try:
        cursor.execute(sql, params)
        return cursor.fetchall() or []
    except Exception:
        return _fetch_combined_oee_rows_legacy(
            cursor, start_date, end_date, include_cnc, include_conv
        )


def _fetch_combined_oee_rows_legacy(
    cursor, start_date, end_date, include_cnc=True, include_conv=True
):
    """Fallback — map efficiency rows; OEENEW approximated from OAEFF when missing."""
    raw = _fetch_efficiency_entry_rows(
        cursor, start_date, end_date, include_cnc, include_conv
    )
    out = []
    for row in raw:
        if len(row) >= 8:
            operator, dept, mac, prod_date, oaeff, opreff, mac_type, _src = row[:8]
        else:
            operator, dept, mac, prod_date, oaeff, opreff, mac_type = row[:7]
        oee = float(oaeff or 0) if oaeff is not None else None
        if oee is None:
            continue
        out.append((
            operator,
            dept,
            mac,
            prod_date,
            float(oaeff or 0),
            float(opreff or 0),
            100.0,
            oee,
            mac_type,
            "",
        ))
    return out


def _combined_oee_monthwise(cursor, start_date, end_date, include_cnc=True, include_conv=True):
    cte = _oee_data_cte_sql(include_cnc, include_conv)
    if not cte:
        return {"labels": [], "data": []}
    sql = f"""
        {cte}
        SELECT MONTH(EntryDate) AS MonthNum, AVG(CAST(OEENEW AS FLOAT)) AS Avg_OEE
        FROM OEE_DATA
        WHERE EntryDate BETWEEN ? AND ?
          AND OEENEW IS NOT NULL
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
    oee_map = {m: 0.0 for m in month_order}
    for month_num, avg_oee in rows:
        mk = month_key_from_db(month_num)
        if mk in oee_map:
            oee_map[mk] = round(float(avg_oee or 0), 2)
    return {"labels": labels, "data": [oee_map[m] for m in month_order]}


def _compute_oee_kpis(rows, start_date, end_date):
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
            "avgOee": 0,
            "avgAvailability": 0,
            "avgPerformance": 0,
            "avgQuality": 0,
            "rowCount": 0,
        }

    n = len(use_rows)
    return {
        "avgOee": round(sum(float(r.get("overallOee") or 0) for r in use_rows) / n, 2),
        "avgAvailability": round(sum(float(r.get("availability") or 0) for r in use_rows) / n, 2),
        "avgPerformance": round(sum(float(r.get("performance") or 0) for r in use_rows) / n, 2),
        "avgQuality": round(sum(float(r.get("quality") or 0) for r in use_rows) / n, 2),
        "rowCount": n,
    }


def build_oee_compare_payload(
    cursor, start_date, end_date, include_cnc=True, include_conv=True, load_full_fy=True
):
    """Structured payload for Plant Performance OEE panel."""
    from datetime import datetime, date
    from .views import current_financial_year

    if load_full_fy:
        query_start, query_end = _efficiency_query_date_range(True, start_date, end_date)
    else:
        query_start, query_end = start_date, end_date

    raw_rows = _fetch_combined_oee_rows(
        cursor, query_start, query_end, include_cnc, include_conv
    )
    if not raw_rows and load_full_fy:
        fy_start, _fy_end = current_financial_year()
        prev_start = date(fy_start.year - 1, 4, 1)
        prev_end = date(fy_start.year, 3, 31)
        raw_rows = _fetch_combined_oee_rows(
            cursor, prev_start, prev_end, include_cnc, include_conv
        )
        if raw_rows:
            query_start, query_end = prev_start, prev_end

    rows = []
    teams_set, machines_set = set(), set()

    for row in raw_rows:
        if len(row) >= 10:
            (
                operator, dept, mac, prod_date,
                availability, performance, quality, overall_oee,
                mac_type, _src,
            ) = row[:10]
        else:
            continue

        operator_s = str(operator or "").strip()
        dept_s = str(dept or "").strip()
        mac_s = str(mac or "").strip()
        mac_type_s = str(mac_type or "").strip() or "CNC"
        if not mac_s:
            continue
        if overall_oee is None:
            continue

        date_str = ""
        month_label = "—"
        year_val = None
        if prod_date:
            if hasattr(prod_date, "strftime"):
                date_str = prod_date.strftime("%Y-%m-%d")
                month_label = _month_label_from_date(prod_date)
                year_val = prod_date.year
            else:
                date_str = str(prod_date).strip()[:10]
                try:
                    parsed_dt = datetime.strptime(date_str, "%Y-%m-%d")
                    month_label = _month_label_from_date(parsed_dt)
                    year_val = parsed_dt.year
                except Exception:
                    pass

        rows.append({
            "operator": operator_s or mac_s,
            "team": dept_s or "—",
            "machineType": mac_type_s,
            "machine": mac_s,
            "date": date_str,
            "month": month_label,
            "year": year_val,
            "overallOee": round(float(overall_oee), 2),
            "availability": round(float(availability or 0), 2),
            "performance": round(float(performance or 0), 2),
            "quality": round(float(quality or 0), 2),
        })
        if dept_s:
            teams_set.add(dept_s)
        machines_set.add(mac_s)

    month_labels = _month_labels_for_payload(rows, start_date, end_date, query_start, query_end)
    machine_types = []
    if include_cnc:
        machine_types.append("CNC")
    if include_conv:
        machine_types.append("Conventional")

    monthwise = None
    try:
        monthwise = _combined_oee_monthwise(
            cursor, query_start, query_end, include_cnc, include_conv
        )
    except Exception:
        monthwise = None

    kpis = _compute_oee_kpis(rows, start_date, end_date)

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
            "teams": sorted(teams_set),
            "machines": sorted(machines_set),
            "machineTypes": machine_types,
        },
    }
