# ════════════════════════════════════════════
#  views_oee_report.py
#  Plant Performance — OEE from combined production tables
#  ProductionEntry: OEE = OAEFF * QFNEW
#  Conv tables:     OEE = existing OEENEW column
# ════════════════════════════════════════════

from .views_efficiency_report import (
    _parse_bool_param,
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


def _fetch_combined_oee_rows(cursor, start_date, end_date, include_cnc=True, include_conv=True):
    """
    OEE detail rows — one row per entry.
    ProductionEntry : OverallOEE = OAEFF * QFNEW  (matches SQL AVG(OAEFF*QFNEW))
    Conv tables     : OverallOEE = existing OEENEW column (unchanged logic)
    Queries each table independently so a missing column in one table
    does not break the other tables.
    """
    dept_join  = _resolve_department_join(cursor) or _legacy_department_join()
    opr_expr   = "LTRIM(RTRIM(CAST(ISNULL(ED.oprname, N'') AS NVARCHAR(512))))"
    joins_raw  = dept_join["joins"].replace("AR.Operator", opr_expr)

    all_rows = []

    # ── ProductionEntry: OEE = OAEFF * QFNEW ─────────────────────────────────
    if include_cnc:
        pe_sql = f"""
            SELECT
                {opr_expr} AS Operator,
                {dept_join['dept_expr']} AS Dept,
                LTRIM(RTRIM(CAST(ISNULL(ED.macno, N'') AS NVARCHAR(128)))) AS MacNo,
                CAST(ED.proddate AS DATE) AS EntryDate,
                CAST(ED.OAEFF AS FLOAT) AS Availability,
                CAST(ED.OPREFF AS FLOAT) AS Performance,
                CAST(ED.QFNEW AS FLOAT) AS Quality,
                CAST(ED.OAEFF * ED.QFNEW AS FLOAT) AS OverallOEE,
                N'CNC' AS MacType,
                N'ProductionEntry' AS SourceTable
            FROM ProductionEntry AS ED
            {joins_raw}
            WHERE ED.deleted = 0
              AND CAST(ED.proddate AS DATE) BETWEEN ? AND ?
              AND ED.macno IS NOT NULL AND LTRIM(RTRIM(ED.macno)) <> N''
              AND ED.OAEFF IS NOT NULL AND ED.QFNEW IS NOT NULL
        """
        try:
            cursor.execute(pe_sql, [start_date, end_date])
            all_rows.extend(cursor.fetchall() or [])
        except Exception:
            pass

    # ── ConvProductionEntry: OEE = existing OEENEW column ────────────────────
    if include_conv:
        cpe_sql = f"""
            SELECT
                {opr_expr} AS Operator,
                {dept_join['dept_expr']} AS Dept,
                LTRIM(RTRIM(CAST(ISNULL(ED.macno, N'') AS NVARCHAR(128)))) AS MacNo,
                CAST(ED.entrydate AS DATE) AS EntryDate,
                CAST(ED.OAEFF AS FLOAT) AS Availability,
                CAST(ED.eff AS FLOAT) AS Performance,
                CAST(ED.QFNEW AS FLOAT) AS Quality,
                CAST(ED.OEENEW AS FLOAT) AS OverallOEE,
                N'Conventional' AS MacType,
                N'ConvProductionEntry' AS SourceTable
            FROM ConvProductionEntry AS ED
            {joins_raw}
            WHERE ED.deleted = 0
              AND CAST(ED.entrydate AS DATE) BETWEEN ? AND ?
              AND ED.macno IS NOT NULL AND LTRIM(RTRIM(ED.macno)) <> N''
              AND ED.OEENEW IS NOT NULL
        """
        try:
            cursor.execute(cpe_sql, [start_date, end_date])
            all_rows.extend(cursor.fetchall() or [])
        except Exception:
            pass

        cpr_sql = f"""
            SELECT
                {opr_expr} AS Operator,
                {dept_join['dept_expr']} AS Dept,
                LTRIM(RTRIM(CAST(ISNULL(ED.macno, N'') AS NVARCHAR(128)))) AS MacNo,
                CAST(ED.entrydate AS DATE) AS EntryDate,
                CAST(ED.OAEFF AS FLOAT) AS Availability,
                CAST(ED.eff AS FLOAT) AS Performance,
                CAST(ED.QFNEW AS FLOAT) AS Quality,
                CAST(ED.OEENEW AS FLOAT) AS OverallOEE,
                N'Conventional' AS MacType,
                N'ConvProductionEntryRod' AS SourceTable
            FROM ConvProductionEntryRod AS ED
            {joins_raw}
            WHERE ED.deleted = 0
              AND CAST(ED.entrydate AS DATE) BETWEEN ? AND ?
              AND ED.macno IS NOT NULL AND LTRIM(RTRIM(ED.macno)) <> N''
              AND ED.OEENEW IS NOT NULL
        """
        try:
            cursor.execute(cpr_sql, [start_date, end_date])
            all_rows.extend(cursor.fetchall() or [])
        except Exception:
            pass

    return all_rows


def _combined_oee_monthwise(cursor, start_date, end_date, include_cnc=True, include_conv=True):
    """
    Month-wise AVG OEE computed per table independently, then combined in Python.
    ProductionEntry : AVG(OAEFF * QFNEW) per month
    Conv tables     : AVG(OEENEW) per month
    """
    month_sums = {}   # month_key -> [sum, count]

    if include_cnc:
        try:
            cursor.execute("""
                SELECT MONTH(proddate) AS MonthNum,
                       SUM(CAST(OAEFF * QFNEW AS FLOAT)) AS OeeSum,
                       COUNT(*) AS RowCount
                FROM ProductionEntry
                WHERE deleted = 0
                  AND CAST(proddate AS DATE) BETWEEN ? AND ?
                  AND OAEFF IS NOT NULL AND QFNEW IS NOT NULL
                GROUP BY MONTH(proddate)
            """, [start_date, end_date])
            for month_num, oee_sum, cnt in (cursor.fetchall() or []):
                if month_num not in month_sums:
                    month_sums[month_num] = [0.0, 0]
                month_sums[month_num][0] += float(oee_sum or 0)
                month_sums[month_num][1] += int(cnt or 0)
        except Exception:
            pass

    if include_conv:
        for table, date_col in [("ConvProductionEntry", "entrydate"), ("ConvProductionEntryRod", "entrydate")]:
            try:
                cursor.execute(f"""
                    SELECT MONTH({date_col}) AS MonthNum,
                           SUM(CAST(OEENEW AS FLOAT)) AS OeeSum,
                           COUNT(*) AS RowCount
                    FROM {table}
                    WHERE deleted = 0
                      AND CAST({date_col} AS DATE) BETWEEN ? AND ?
                      AND OEENEW IS NOT NULL
                    GROUP BY MONTH({date_col})
                """, [start_date, end_date])
                for month_num, oee_sum, cnt in (cursor.fetchall() or []):
                    if month_num not in month_sums:
                        month_sums[month_num] = [0.0, 0]
                    month_sums[month_num][0] += float(oee_sum or 0)
                    month_sums[month_num][1] += int(cnt or 0)
            except Exception:
                pass

    from .views import month_key_from_db
    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    labels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
    oee_map = {m: 0.0 for m in month_order}
    for month_num, (oee_sum, cnt) in month_sums.items():
        mk = month_key_from_db(month_num)
        if mk in oee_map and cnt > 0:
            oee_map[mk] = round(oee_sum / cnt, 2)
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

    valid_oee   = [float(r["overallOee"])   for r in use_rows if r.get("overallOee")   is not None]
    valid_avail = [float(r["availability"]) for r in use_rows if r.get("availability") is not None]
    valid_perf  = [float(r["performance"])  for r in use_rows if r.get("performance")  is not None]
    valid_qual  = [float(r["quality"])      for r in use_rows if r.get("quality")      is not None]

    return {
        "avgOee":          round(sum(valid_oee)   / len(valid_oee),   2) if valid_oee   else 0,
        "avgAvailability": round(sum(valid_avail) / len(valid_avail), 2) if valid_avail else 0,
        "avgPerformance":  round(sum(valid_perf)  / len(valid_perf),  2) if valid_perf  else 0,
        "avgQuality":      round(sum(valid_qual)  / len(valid_qual),  2) if valid_qual  else 0,
        "rowCount": len(use_rows),
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
        prev_end   = date(fy_start.year, 3, 31)
        raw_rows = _fetch_combined_oee_rows(
            cursor, prev_start, prev_end, include_cnc, include_conv
        )
        if raw_rows:
            query_start, query_end = prev_start, prev_end

    rows = []
    teams_set, machines_set = set(), set()

    for row in raw_rows:
        if len(row) < 10:
            continue
        (
            operator, dept, mac, prod_date,
            availability, performance, quality, overall_oee,
            mac_type, _src,
        ) = row[:10]

        mac_s      = str(mac      or "").strip()
        operator_s = str(operator or "").strip()
        dept_s     = str(dept     or "").strip()
        mac_type_s = str(mac_type or "").strip() or "CNC"

        if not mac_s:
            continue
        if overall_oee is None:
            continue

        date_str    = ""
        month_label = "—"
        year_val    = None
        if prod_date:
            if hasattr(prod_date, "strftime"):
                date_str    = prod_date.strftime("%Y-%m-%d")
                month_label = _month_label_from_date(prod_date)
                year_val    = prod_date.year
            else:
                date_str = str(prod_date).strip()[:10]
                try:
                    parsed_dt   = datetime.strptime(date_str, "%Y-%m-%d")
                    month_label = _month_label_from_date(parsed_dt)
                    year_val    = parsed_dt.year
                except Exception:
                    pass

        rows.append({
            "operator":    operator_s or mac_s,
            "team":        dept_s or "—",
            "machineType": mac_type_s,
            "machine":     mac_s,
            "date":        date_str,
            "month":       month_label,
            "year":        year_val,
            "overallOee":  float(overall_oee) if overall_oee is not None else None,
            "availability":float(availability or 0),
            "performance": float(performance  or 0),
            "quality":     float(quality      or 0),
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
        "from":        str(start_date),
        "to":          str(end_date),
        "queryFrom":   str(query_start),
        "queryTo":     str(query_end),
        "rows":        rows,
        "monthLabels": month_labels,
        "monthwise":   monthwise,
        "kpis":        kpis,
        "filterOptions": {
            "teams":        sorted(teams_set),
            "machines":     sorted(machines_set),
            "machineTypes": machine_types,
        },
    }
