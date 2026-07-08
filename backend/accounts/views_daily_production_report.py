# ════════════════════════════════════════════
#  views_daily_production_report.py
#  Plant Performance — Daily Production / Machine Capacity
#  Running secs: DATEDIFF(runfrom,runto) / (starttime,endtime)
#  Planned hrs: Shift stime1/etime1 + stime2/etime2
#  Balance/Loss: capped running vs shift duration × RatePerHr
# ════════════════════════════════════════════

from datetime import date, datetime

from .views import find_first_table, find_first_column
from .views_efficiency_report import _efficiency_query_date_range


def _q(name):
    return f"[{name}]"


def _col_ref(alias, col):
    return f"{alias}.{_q(col)}"


def _del_filter(col, alias=None):
    if not col:
        return ""
    ref = _col_ref(alias, col) if alias else _q(col)
    return f" AND ISNULL({ref}, 0) = 0"


def _span_seconds(start_expr, end_expr):
    """Seconds between two datetime columns (handles overnight spans)."""
    return f"""(
        CASE
            WHEN {start_expr} IS NULL OR {end_expr} IS NULL THEN 0
            WHEN {end_expr} >= {start_expr}
                THEN DATEDIFF(SECOND, {start_expr}, {end_expr})
            ELSE DATEDIFF(SECOND, {start_expr}, DATEADD(DAY, 1, {end_expr}))
        END
    )"""


def _float_expr(alias, col):
    c = _col_ref(alias, col)
    return f"""(
        CASE
            WHEN {c} IS NULL THEN 0.0
            WHEN TRY_CONVERT(FLOAT, {c}) IS NOT NULL THEN TRY_CONVERT(FLOAT, {c})
            ELSE 0.0
        END
    )"""


def _resolve_daily_production_schema(cursor):
    tbl_pe = find_first_table(cursor, ["ProductionEntry", "productionentry", "PRODUCTIONENTRY"])
    tbl_conv = find_first_table(cursor, ["ConvProductionEntry", "convproductionentry"])
    tbl_rod = find_first_table(cursor, ["ConvProductionEntryRod", "convproductionentryrod"])
    tbl_shift = find_first_table(cursor, ["Shift", "shift", "SHIFT"])
    tbl_mac = find_first_table(cursor, ["MacMaster", "macmaster", "MACMASTER"])

    if not tbl_pe or not tbl_shift or not tbl_mac:
        return None

    schema = {
        "pe": tbl_pe,
        "conv": tbl_conv,
        "rod": tbl_rod,
        "shift": tbl_shift,
        "mac": tbl_mac,
    }

    schema["pe_date"] = find_first_column(cursor, tbl_pe, ["proddate", "ProdDate", "PRODDATE"])
    schema["pe_shift"] = find_first_column(cursor, tbl_pe, ["shift", "Shift", "SHIFT", "Shcode"])
    schema["pe_mac"] = find_first_column(cursor, tbl_pe, ["macno", "MacNo", "MACNO"])
    schema["pe_runfrom"] = find_first_column(cursor, tbl_pe, ["runfrom", "RunFrom", "RUNFROM"])
    schema["pe_runto"] = find_first_column(cursor, tbl_pe, ["runto", "RunTo", "RUNTO"])
    schema["pe_del"] = find_first_column(cursor, tbl_pe, ["deleted", "Deleted", "IsDeleted"])

    if tbl_conv:
        schema["conv_date"] = find_first_column(cursor, tbl_conv, ["entrydate", "EntryDate", "ENTRYDATE"])
        schema["conv_shift"] = find_first_column(cursor, tbl_conv, ["shift", "Shift", "SHIFT", "Shcode"])
        schema["conv_mac"] = find_first_column(cursor, tbl_conv, ["macno", "MacNo", "MACNO"])
        schema["conv_start"] = find_first_column(cursor, tbl_conv, ["starttime", "StartTime", "STARTTIME"])
        schema["conv_end"] = find_first_column(cursor, tbl_conv, ["endtime", "EndTime", "ENDTIME"])
        schema["conv_del"] = find_first_column(cursor, tbl_conv, ["deleted", "Deleted", "IsDeleted"])

    if tbl_rod:
        schema["rod_date"] = find_first_column(cursor, tbl_rod, ["entrydate", "EntryDate", "ENTRYDATE"])
        schema["rod_shift"] = find_first_column(cursor, tbl_rod, ["shift", "Shift", "SHIFT", "Shcode"])
        schema["rod_mac"] = find_first_column(cursor, tbl_rod, ["macno", "MacNo", "MACNO"])
        schema["rod_start"] = find_first_column(cursor, tbl_rod, ["starttime", "StartTime", "STARTTIME"])
        schema["rod_end"] = find_first_column(cursor, tbl_rod, ["endtime", "EndTime", "ENDTIME"])
        schema["rod_del"] = find_first_column(cursor, tbl_rod, ["deleted", "Deleted", "IsDeleted"])

    schema["shift_code"] = find_first_column(
        cursor, tbl_shift, ["Shcode", "shcode", "SHCODE", "ShiftCode", "shiftcode"]
    )
    schema["shift_name"] = find_first_column(
        cursor, tbl_shift, ["Shift", "shift", "SHIFT", "ShiftName", "shiftname"]
    )
    schema["shift_stime1"] = find_first_column(cursor, tbl_shift, ["stime1", "Stime1", "STIME1"])
    schema["shift_etime1"] = find_first_column(cursor, tbl_shift, ["etime1", "Etime1", "ETIME1"])
    schema["shift_stime2"] = find_first_column(cursor, tbl_shift, ["stime2", "Stime2", "STIME2"])
    schema["shift_etime2"] = find_first_column(cursor, tbl_shift, ["etime2", "Etime2", "ETIME2"])
    schema["shift_del"] = find_first_column(cursor, tbl_shift, ["deleted", "Deleted", "IsDeleted"])

    schema["mac_no"] = find_first_column(cursor, tbl_mac, ["macno", "MacNo", "MACNO"])
    schema["mac_name"] = find_first_column(
        cursor, tbl_mac, ["macname", "MacName", "MACNAME", "MachineName"]
    )
    schema["mac_rate"] = find_first_column(
        cursor, tbl_mac, ["RatePerHr", "rateperhr", "RATEPERHR", "RatePerHour"]
    )
    schema["mac_del"] = find_first_column(cursor, tbl_mac, ["deleted", "Deleted", "IsDeleted"])
    schema["mac_active"] = find_first_column(
        cursor, tbl_mac, ["IsNonActive", "isnonactive", "NonActive", "nonactive"]
    )

    if not all([schema["pe_date"], schema["pe_shift"], schema["pe_mac"], schema["mac_no"]]):
        return None
    if not schema["pe_runfrom"] or not schema["pe_runto"]:
        return None
    if not schema["shift_code"] and not schema["shift_name"]:
        return None
    if not all([schema["shift_stime1"], schema["shift_etime1"], schema["shift_stime2"], schema["shift_etime2"]]):
        return None
    return schema


def _running_branch(tbl, date_col, shift_col, mac_col, start_col, end_col, del_col, start_date, end_date):
    del_sql = _del_filter(del_col, "P")
    run_secs = _span_seconds(_col_ref("P", start_col), _col_ref("P", end_col))
    return f"""
        SELECT
            CAST(P.{_q(date_col)} AS DATE) AS ProdDate,
            LTRIM(RTRIM(CAST(P.{_q(shift_col)} AS NVARCHAR(64)))) AS Shift,
            LTRIM(RTRIM(CAST(P.{_q(mac_col)} AS NVARCHAR(128)))) AS MacNo,
            {run_secs} AS RunningSecs
        FROM {_q(tbl)} P
        WHERE P.{_q(date_col)} IS NOT NULL
          AND P.{_q(mac_col)} IS NOT NULL
          AND LTRIM(RTRIM(CAST(P.{_q(mac_col)} AS NVARCHAR(128)))) <> N''
          AND CAST(P.{_q(date_col)} AS DATE) BETWEEN ? AND ?{del_sql}
    """


def _shift_master_cte(schema):
    st1 = _col_ref("S", schema["shift_stime1"])
    et1 = _col_ref("S", schema["shift_etime1"])
    st2 = _col_ref("S", schema["shift_stime2"])
    et2 = _col_ref("S", schema["shift_etime2"])
    span1 = _span_seconds(st1, et1)
    span2 = _span_seconds(st2, et2)

    code_sel = (
        f"LTRIM(RTRIM(CAST(S.{_q(schema['shift_code'])} AS NVARCHAR(64))))"
        if schema.get("shift_code")
        else "N''"
    )
    name_sel = (
        f"LTRIM(RTRIM(CAST(S.{_q(schema['shift_name'])} AS NVARCHAR(128))))"
        if schema.get("shift_name")
        else "N''"
    )
    del_sql = _del_filter(schema["shift_del"], "S")

    return f"""
        SHIFTMASTER AS (
            SELECT
                {code_sel} AS shcode,
                {name_sel} AS ShiftName,
                ({span1}) + ({span2}) AS ShiftSecs
            FROM {_q(schema['shift'])} S
            WHERE 1=1{del_sql}
        )
    """, code_sel, name_sel


def _shift_join_on_r(alias="R"):
    """Join RUNSUMMARY shift to SHIFTMASTER (shcode or shift name)."""
    return f"""(
        LTRIM(RTRIM(CAST({alias}.Shift AS NVARCHAR(64)))) = S.shcode
        OR LTRIM(RTRIM(CAST({alias}.Shift AS NVARCHAR(20)))) = LTRIM(RTRIM(CAST(S.shcode AS NVARCHAR(20))))
        OR LTRIM(RTRIM(CAST({alias}.Shift AS NVARCHAR(128)))) = S.ShiftName
    )"""


def _fetch_daily_production_rows(cursor, start_date, end_date, machine_filter=None):
    schema = _resolve_daily_production_schema(cursor)
    if not schema:
        return []

    params = [start_date, end_date]
    branches = [
        _running_branch(
            schema["pe"],
            schema["pe_date"],
            schema["pe_shift"],
            schema["pe_mac"],
            schema["pe_runfrom"],
            schema["pe_runto"],
            schema["pe_del"],
            start_date,
            end_date,
        )
    ]

    if schema.get("conv") and schema.get("conv_start") and schema.get("conv_end"):
        branches.append(
            _running_branch(
                schema["conv"],
                schema["conv_date"],
                schema["conv_shift"],
                schema["conv_mac"],
                schema["conv_start"],
                schema["conv_end"],
                schema["conv_del"],
                start_date,
                end_date,
            )
        )
        params.extend([start_date, end_date])

    if schema.get("rod") and schema.get("rod_start") and schema.get("rod_end"):
        branches.append(
            _running_branch(
                schema["rod"],
                schema["rod_date"],
                schema["rod_shift"],
                schema["rod_mac"],
                schema["rod_start"],
                schema["rod_end"],
                schema["rod_del"],
                start_date,
                end_date,
            )
        )
        params.extend([start_date, end_date])

    shift_master_cte, shift_code_sel, shift_name_sel = _shift_master_cte(schema)

    mac_name_sel = (
        f"LTRIM(RTRIM(CAST(M.{_q(schema['mac_name'])} AS NVARCHAR(256))))"
        if schema.get("mac_name")
        else "R.MacNo"
    )
    rate_expr = _float_expr("M", schema["mac_rate"])
    mac_del = _del_filter(schema["mac_del"], "M")
    mac_active = ""
    if schema.get("mac_active"):
        mac_active = f" AND ISNULL(M.{_q(schema['mac_active'])}, 0) = 0"

    machine_sql = ""
    if machine_filter:
        if "," in machine_filter:
            m_list = [x.strip() for x in machine_filter.split(",") if x.strip()]
            placeholders = ",".join(["?"] * len(m_list))
            machine_sql = f" AND LTRIM(RTRIM(CAST(R.MacNo AS NVARCHAR(128)))) IN ({placeholders})"
            params.extend(m_list)
        else:
            machine_sql = " AND LTRIM(RTRIM(CAST(R.MacNo AS NVARCHAR(128)))) LIKE ?"
            params.append(f"%{machine_filter.strip()}%")

    capped_run = """(
        CASE
            WHEN R.RunningSecs > ISNULL(S.ShiftSecs, 0) THEN ISNULL(S.ShiftSecs, 0)
            ELSE R.RunningSecs
        END
    )"""

    sql = f"""
        WITH RUNNINGDATA AS (
            {" UNION ALL ".join(branches)}
        ),
        RUNSUMMARY AS (
            SELECT
                ProdDate,
                Shift,
                MacNo,
                SUM(RunningSecs) AS RunningSecs
            FROM RUNNINGDATA
            GROUP BY ProdDate, Shift, MacNo
        ),
        {shift_master_cte}
        SELECT
            R.ProdDate AS EntryDate,
            R.Shift AS ShiftCode,
            COALESCE(S.ShiftName, R.Shift) AS ShiftName,
            R.MacNo,
            {mac_name_sel} AS MacName,
            CAST({rate_expr} AS FLOAT) AS RatePerHr,
            CAST(ISNULL(S.ShiftSecs, 0) / 3600.0 AS FLOAT) AS PlannedHours,
            CAST(R.RunningSecs / 3600.0 AS FLOAT) AS ActualRunningHours,
            CAST({capped_run} / 3600.0 AS FLOAT) AS RunningHours,
            CAST(
                (ISNULL(S.ShiftSecs, 0) - {capped_run}) / 3600.0
                AS FLOAT
            ) AS BalanceHours,
            CAST(
                (ISNULL(S.ShiftSecs, 0) / 3600.0) * ({rate_expr})
                AS FLOAT
            ) AS PlannedValue,
            CAST(
                ({capped_run} / 3600.0) * ({rate_expr})
                AS FLOAT
            ) AS RunningValue,
            CAST(
                ((ISNULL(S.ShiftSecs, 0) - {capped_run}) / 3600.0) * ({rate_expr})
                AS FLOAT
            ) AS LossValue,
            CAST(
                CASE
                    WHEN ISNULL(S.ShiftSecs, 0) = 0 THEN 0.0
                    ELSE ((ISNULL(S.ShiftSecs, 0) - {capped_run}) * 100.0 / S.ShiftSecs)
                END
                AS FLOAT
            ) AS LossPercentage
        FROM RUNSUMMARY R
        LEFT JOIN {_q(schema['mac'])} M
            ON LTRIM(RTRIM(CAST(R.MacNo AS NVARCHAR(128))))
             = LTRIM(RTRIM(CAST(M.{_q(schema['mac_no'])} AS NVARCHAR(128)))){mac_del}{mac_active}
        LEFT JOIN SHIFTMASTER S
            ON {_shift_join_on_r("R")}
        WHERE 1=1{machine_sql}
        ORDER BY R.ProdDate, R.Shift, R.MacNo
    """

    cursor.execute(sql, params)
    columns = [d[0] for d in cursor.description]
    return [dict(zip(columns, row)) for row in (cursor.fetchall() or [])]


def _fetch_shift_planned_total(cursor):
    """Sum of shift durations (hours) from Shift master."""
    schema = _resolve_daily_production_schema(cursor)
    if not schema:
        return 0.0
    _, _, _ = _shift_master_cte(schema)
    del_sql = _del_filter(schema["shift_del"], "S")
    st1 = _col_ref("S", schema["shift_stime1"])
    et1 = _col_ref("S", schema["shift_etime1"])
    st2 = _col_ref("S", schema["shift_stime2"])
    et2 = _col_ref("S", schema["shift_etime2"])
    shift_secs = f"(({_span_seconds(st1, et1)}) + ({_span_seconds(st2, et2)}))"
    sql = f"""
        SELECT CAST(SUM({shift_secs}) / 3600.0 AS FLOAT)
        FROM {_q(schema['shift'])} S
        WHERE 1=1{del_sql}
    """
    cursor.execute(sql)
    row = cursor.fetchone()
    return float(row[0] or 0) if row else 0.0


def _fetch_total_production_hours(cursor, start_date, end_date):
    """Total capped running hours in range."""
    schema = _resolve_daily_production_schema(cursor)
    if not schema:
        return 0.0

    params = []
    branches = []

    def add_branch(tbl, date_col, shift_col, mac_col, start_col, end_col, del_col):
        branches.append(
            _running_branch(tbl, date_col, shift_col, mac_col, start_col, end_col, del_col, start_date, end_date)
        )
        params.extend([start_date, end_date])

    add_branch(
        schema["pe"], schema["pe_date"], schema["pe_shift"], schema["pe_mac"],
        schema["pe_runfrom"], schema["pe_runto"], schema["pe_del"],
    )
    if schema.get("conv") and schema.get("conv_start"):
        add_branch(
            schema["conv"], schema["conv_date"], schema["conv_shift"], schema["conv_mac"],
            schema["conv_start"], schema["conv_end"], schema["conv_del"],
        )
    if schema.get("rod") and schema.get("rod_start"):
        add_branch(
            schema["rod"], schema["rod_date"], schema["rod_shift"], schema["rod_mac"],
            schema["rod_start"], schema["rod_end"], schema["rod_del"],
        )

    shift_master_cte, _, _ = _shift_master_cte(schema)
    capped = """(
        CASE
            WHEN RS.RunningSecs > ISNULL(S.ShiftSecs, 0) THEN ISNULL(S.ShiftSecs, 0)
            ELSE RS.RunningSecs
        END / 3600.0
    )"""

    sql = f"""
        WITH RUNNINGDATA AS (
            {" UNION ALL ".join(branches)}
        ),
        RUNSUMMARY AS (
            SELECT ProdDate, Shift, MacNo, SUM(RunningSecs) AS RunningSecs
            FROM RUNNINGDATA
            GROUP BY ProdDate, Shift, MacNo
        ),
        {shift_master_cte}
        SELECT CAST(SUM({capped}) AS FLOAT)
        FROM RUNSUMMARY RS
        LEFT JOIN SHIFTMASTER S ON {_shift_join_on_r("RS")}
    """
    cursor.execute(sql, params)
    row = cursor.fetchone()
    return float(row[0] or 0) if row else 0.0


def _format_date(val):
    if val is None:
        return ""
    if hasattr(val, "strftime"):
        return val.strftime("%Y-%m-%d")
    raw = str(val).strip()
    if len(raw) >= 10 and raw[4:5] == "-":
        return raw[:10]
    try:
        return datetime.strptime(raw[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
    except Exception:
        return raw[:10] if raw else ""


def _row_to_payload(rec):
    planned = round(float(rec.get("PlannedHours") or 0), 2)
    actual = round(float(rec.get("ActualRunningHours") or 0), 2)
    running = round(float(rec.get("RunningHours") or 0), 2)
    balance = round(float(rec.get("BalanceHours") or 0), 2)
    rate = round(float(rec.get("RatePerHr") or 0), 2)
    loss = round(float(rec.get("LossValue") or 0), 2)
    loss_pct = round(float(rec.get("LossPercentage") or 0), 2)
    mac = str(rec.get("MacNo") or "").strip()

    return {
        "date": _format_date(rec.get("EntryDate")),
        "machine": mac,
        "machineName": str(rec.get("MacName") or mac or "—").strip(),
        "shift": str(rec.get("ShiftName") or rec.get("ShiftCode") or "—").strip(),
        "shiftCode": str(rec.get("ShiftCode") or "—").strip(),
        "rate": rate,
        "planned": planned,
        "productionHours": running,
        "actualRunningHours": actual,
        "runningHours": running,
        "balance": balance,
        "plannedValue": round(float(rec.get("PlannedValue") or 0), 2),
        "runningValue": round(float(rec.get("RunningValue") or 0), 2),
        "loss": loss,
        "lossPct": loss_pct,
    }


def _aggregate_machine_summary(rows):
    by_mac = {}
    for row in rows:
        mac = row.get("machine") or "—"
        if mac not in by_mac:
            by_mac[mac] = {
                "machine": mac,
                "rateSum": 0.0,
                "rateCount": 0,
                "planned": 0.0,
                "productionHours": 0.0,
                "balance": 0.0,
                "loss": 0.0,
            }
        g = by_mac[mac]
        g["planned"] += float(row.get("planned") or 0)
        g["productionHours"] += float(row.get("productionHours") or 0)
        g["balance"] += float(row.get("balance") or 0)
        g["loss"] += float(row.get("loss") or 0)
        g["rateSum"] += float(row.get("rate") or 0)
        g["rateCount"] += 1

    out = []
    for mac in sorted(by_mac.keys()):
        g = by_mac[mac]
        rate = round(g["rateSum"] / g["rateCount"], 2) if g["rateCount"] else 0.0
        out.append({
            "machine": mac,
            "rate": rate,
            "planned": round(g["planned"], 2),
            "productionHours": round(g["productionHours"], 2),
            "balance": round(g["balance"], 2),
            "loss": round(g["loss"], 2),
        })
    return out


def _compute_kpis(rows, cursor, start_date, end_date, query_start, query_end):
    if rows:
        planned = round(sum(float(r.get("planned") or 0) for r in rows), 2)
        production = round(sum(float(r.get("productionHours") or 0) for r in rows), 2)
        balance = round(sum(float(r.get("balance") or 0) for r in rows), 2)
        total_loss = round(sum(float(r.get("loss") or 0) for r in rows), 2)
        rates = [float(r.get("rate") or 0) for r in rows if r.get("rate") is not None]
        avg_rate = round(sum(rates) / len(rates), 2) if rates else 0.0
    else:
        planned = production = balance = total_loss = avg_rate = 0.0

    try:
        master_planned = round(_fetch_shift_planned_total(cursor), 2)
        total_production = round(_fetch_total_production_hours(cursor, query_start, query_end), 2)
    except Exception:
        master_planned = planned
        total_production = production

    return {
        "plannedHours": planned,
        "productionHours": production,
        "balanceHours": balance,
        "totalLossValue": total_loss,
        "avgRatePerHr": avg_rate,
        "masterShiftPlannedHours": master_planned,
        "totalProductionHoursAll": total_production,
        "aggregateBalanceHours": round(max(0.0, planned - production), 2),
        "rowCount": len(rows),
    }


def build_daily_production_compare_payload(
    cursor, start_date, end_date, machine_filter=None, load_full_fy=True
):
    from .views import current_financial_year

    if load_full_fy:
        query_start, query_end = _efficiency_query_date_range(True, start_date, end_date)
    else:
        query_start, query_end = start_date, end_date

    raw_rows = _fetch_daily_production_rows(
        cursor, query_start, query_end, machine_filter=machine_filter
    )
    if not raw_rows and load_full_fy:
        fy_start, _fy_end = current_financial_year()
        prev_start = date(fy_start.year - 1, 4, 1)
        prev_end = date(fy_start.year, 3, 31)
        raw_rows = _fetch_daily_production_rows(
            cursor, prev_start, prev_end, machine_filter=machine_filter
        )
        if raw_rows:
            query_start, query_end = prev_start, prev_end

    rows = [_row_to_payload(rec) for rec in raw_rows]

    scoped = []
    for row in rows:
        d = row.get("date") or ""
        if not d:
            continue
        try:
            dt = datetime.strptime(d[:10], "%Y-%m-%d").date()
            if start_date <= dt <= end_date:
                scoped.append(row)
        except Exception:
            continue
    display_rows = scoped if scoped else rows

    if machine_filter:
        if "," in machine_filter:
            m_list = [x.strip().lower() for x in machine_filter.split(",") if x.strip()]
            display_rows = [
                r for r in display_rows
                if any(
                    m in str(r.get("machine") or "").lower()
                    or m in str(r.get("machineName") or "").lower()
                    for m in m_list
                )
            ]
        else:
            mf = machine_filter.strip().lower()
            display_rows = [
                r for r in display_rows
                if mf in str(r.get("machine") or "").lower()
                or mf in str(r.get("machineName") or "").lower()
            ]

    machine_summary = _aggregate_machine_summary(display_rows)
    machines = sorted({r.get("machine") for r in rows if r.get("machine")})
    kpis = _compute_kpis(display_rows, cursor, start_date, end_date, query_start, query_end)

    return {
        "from": str(start_date),
        "to": str(end_date),
        "queryFrom": str(query_start),
        "queryTo": str(query_end),
        "rows": display_rows,
        "machineSummary": machine_summary,
        "kpis": kpis,
        "filterOptions": {
            "machines": machines,
        },
    }
