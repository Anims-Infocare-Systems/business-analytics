# views_machine_availability_report.py
#
# Machine Availability / Machine Efficiency Report
#
# Implements the exact SQL query provided by the user:
#
#   ProductionEntry  ∪  ConvProductionEntry  ∪  ConvProductionEntryRod
#   → group by macno
#   → compute RunningSecs, AcceptedIdleSecs (IsAccept=1), SettingSecs
#   → AvailabilityPercent = (RunningSecs - AcceptedIdleSecs - SettingSecs) * 100 / RunningSecs
#
# Entry-point:  build_machine_availability_payload(cursor, start_date, end_date, ...)
#

from datetime import date


# ── helpers ────────────────────────────────────────────────────────────────────

def _parse_bool_param(val, default=True):
    if val is None:
        return default
    if isinstance(val, bool):
        return val
    return str(val).strip().lower() not in ("0", "false", "no", "")


def _avail_pct(running_secs, idle_secs, setting_secs):
    r = float(running_secs or 0)
    if r <= 0:
        return 0.0
    lost = float(idle_secs or 0) + float(setting_secs or 0)
    return round(((r - lost) * 100.0) / r, 2)


def _fmt_date(dt_val):
    if dt_val is None:
        return ""
    if hasattr(dt_val, "strftime"):
        return dt_val.strftime("%Y-%m-%d")
    raw = str(dt_val).strip()
    return raw[:10] if raw else ""


def _month_label(iso):
    """Return 'Jan 2025' from a YYYY-MM-... string."""
    _ABB = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    if not iso or len(iso) < 7:
        return "—"
    try:
        y, m = int(iso[:4]), int(iso[5:7])
        return f"{_ABB[m - 1]} {y}"
    except Exception:
        return "—"


def _passes_eff_limit(pct, eff_limit):
    """Filter by efficiency limit string e.g. '<90', '>80', '<=70'."""
    import re
    if not eff_limit:
        return True
    raw = str(eff_limit).strip().replace(" ", "")
    m = re.match(r"^([><]=?|=)?([0-9.]+)(%?)$", raw)
    if m:
        op = m.group(1) or "<"
        val = float(m.group(2))
        if op == ">":   return pct > val
        if op == ">=":  return pct >= val
        if op == "<":   return pct < val
        if op == "<=":  return pct <= val
        if op == "=":   return pct == val
        return True
    try:
        return pct < float(raw)
    except (TypeError, ValueError):
        return True


# ── Core SQL builder ────────────────────────────────────────────────────────────

_MACHINE_AVAIL_SQL = """\
WITH ProductionData AS (

    -- 1. ProductionEntry
    SELECT
        pe.macno,
        CAST(pe.{pe_date} AS DATE) AS ProdDate,
        N'CNC' AS MacType,
        CASE
            WHEN pe.runto >= pe.runfrom
                THEN DATEDIFF(SECOND, pe.runfrom, pe.runto)
            ELSE
                DATEDIFF(SECOND, pe.runfrom, DATEADD(DAY, 1, pe.runto))
        END AS RunningSecs,
        CASE
            WHEN pe.setto >= pe.setfrom
                THEN DATEDIFF(SECOND, pe.setfrom, pe.setto)
            ELSE
                DATEDIFF(SECOND, pe.setfrom, DATEADD(DAY, 1, pe.setto))
        END AS SettingSecs,
        ISNULL((
            SELECT SUM(DATEDIFF(SECOND, '19000101', pie.tottime))
            FROM Prod_IdleEntry pie
            INNER JOIN IdleReasons ir
                ON pie.reasons = ir.IdleReasons
            WHERE pie.prodid = pe.prodid
              AND ISNULL(ir.IsAccept, 0) = 1
        ), 0) AS AcceptedIdleSecs
    FROM ProductionEntry pe
    WHERE pe.deleted = 0
      AND CAST(pe.{pe_date} AS DATE) BETWEEN ? AND ?

    UNION ALL

    -- 2. ConvProductionEntry
    SELECT
        cpe.macno,
        CAST(cpe.{conv_date} AS DATE) AS ProdDate,
        N'Conventional' AS MacType,
        CASE
            WHEN cpe.endtime >= cpe.starttime
                THEN DATEDIFF(SECOND, cpe.starttime, cpe.endtime)
            ELSE
                DATEDIFF(SECOND, cpe.starttime, DATEADD(DAY, 1, cpe.endtime))
        END AS RunningSecs,
        CASE
            WHEN cpe.setto >= cpe.setfrom
                THEN DATEDIFF(SECOND, cpe.setfrom, cpe.setto)
            ELSE
                DATEDIFF(SECOND, cpe.setfrom, DATEADD(DAY, 1, cpe.setto))
        END AS SettingSecs,
        ISNULL((
            SELECT SUM(DATEDIFF(SECOND, '19000101', cie.tottime))
            FROM conv_IdleEntry cie
            INNER JOIN IdleReasons ir
                ON cie.reasons = ir.IdleReasons
            WHERE cie.entryno = cpe.entryno
              AND ISNULL(ir.IsAccept, 0) = 1
        ), 0) AS AcceptedIdleSecs
    FROM ConvProductionEntry cpe
    WHERE cpe.deleted = 0
      AND CAST(cpe.{conv_date} AS DATE) BETWEEN ? AND ?

    UNION ALL

    -- 3. ConvProductionEntryRod
    SELECT
        cpr.macno,
        CAST(cpr.{rod_date} AS DATE) AS ProdDate,
        N'Conventional' AS MacType,
        CASE
            WHEN cpr.endtime >= cpr.starttime
                THEN DATEDIFF(SECOND, cpr.starttime, cpr.endtime)
            ELSE
                DATEDIFF(SECOND, cpr.starttime, DATEADD(DAY, 1, cpr.endtime))
        END AS RunningSecs,
        CASE
            WHEN cpr.setto >= cpr.setfrom
                THEN DATEDIFF(SECOND, cpr.setfrom, cpr.setto)
            ELSE
                DATEDIFF(SECOND, cpr.setfrom, DATEADD(DAY, 1, cpr.setto))
        END AS SettingSecs,
        ISNULL((
            SELECT SUM(DATEDIFF(SECOND, '19000101', crie.tottime))
            FROM conv_RodIdleEntry crie
            INNER JOIN IdleReasons ir
                ON crie.reasons = ir.IdleReasons
            WHERE crie.entryno = cpr.entryno
              AND ISNULL(ir.IsAccept, 0) = 1
        ), 0) AS AcceptedIdleSecs
    FROM ConvProductionEntryRod cpr
    WHERE cpr.deleted = 0
      AND CAST(cpr.{rod_date} AS DATE) BETWEEN ? AND ?

),

DailySummary AS (
    SELECT
        macno,
        ProdDate,
        MAX(MacType) AS MacType,
        SUM(RunningSecs)      AS TotalRunningSecs,
        SUM(AcceptedIdleSecs) AS TotalAcceptedIdleSecs,
        SUM(SettingSecs)      AS TotalSettingSecs
    FROM ProductionData
    {machine_filter_daily}
    GROUP BY macno, ProdDate
),

MachineSummary AS (
    SELECT
        macno,
        MAX(MacType)                  AS MacType,
        SUM(TotalRunningSecs)         AS TotalRunningSecs,
        SUM(TotalAcceptedIdleSecs)    AS TotalAcceptedIdleSecs,
        SUM(TotalSettingSecs)         AS TotalSettingSecs
    FROM DailySummary
    GROUP BY macno
)

SELECT
    macno                           AS MachineNo,
    MacType,
    TotalRunningSecs,
    TotalAcceptedIdleSecs           AS AcceptedIdleSecs,
    TotalSettingSecs                AS SettingSecs,
    ROUND(TotalRunningSecs       * 1.0 / 3600, 2) AS RunningHours,
    ROUND(TotalAcceptedIdleSecs  * 1.0 / 3600, 2) AS IdleHours,
    ROUND(TotalSettingSecs       * 1.0 / 3600, 2) AS SettingHours,
    ROUND(
        CASE
            WHEN TotalRunningSecs <= 0 THEN 0.0
            ELSE (
                (TotalRunningSecs - (TotalAcceptedIdleSecs + TotalSettingSecs))
                * 100.0
            ) / NULLIF(TotalRunningSecs, 0)
        END,
        2
    ) AS AvailabilityPercent
FROM MachineSummary
{machine_filter_outer}
ORDER BY macno;
"""


_DETAIL_SQL = """\
WITH ProductionData AS (

    SELECT
        pe.macno,
        CAST(pe.{pe_date} AS DATE) AS ProdDate,
        N'CNC' AS MacType,
        CASE
            WHEN pe.runto >= pe.runfrom
                THEN DATEDIFF(SECOND, pe.runfrom, pe.runto)
            ELSE
                DATEDIFF(SECOND, pe.runfrom, DATEADD(DAY, 1, pe.runto))
        END AS RunningSecs,
        CASE
            WHEN pe.setto >= pe.setfrom
                THEN DATEDIFF(SECOND, pe.setfrom, pe.setto)
            ELSE
                DATEDIFF(SECOND, pe.setfrom, DATEADD(DAY, 1, pe.setto))
        END AS SettingSecs,
        ISNULL((
            SELECT SUM(DATEDIFF(SECOND, '19000101', pie.tottime))
            FROM Prod_IdleEntry pie
            INNER JOIN IdleReasons ir ON pie.reasons = ir.IdleReasons
            WHERE pie.prodid = pe.prodid AND ISNULL(ir.IsAccept, 0) = 1
        ), 0) AS AcceptedIdleSecs
    FROM ProductionEntry pe
    WHERE pe.deleted = 0
      AND CAST(pe.{pe_date} AS DATE) BETWEEN ? AND ?

    UNION ALL

    SELECT
        cpe.macno,
        CAST(cpe.{conv_date} AS DATE) AS ProdDate,
        N'Conventional' AS MacType,
        CASE
            WHEN cpe.endtime >= cpe.starttime
                THEN DATEDIFF(SECOND, cpe.starttime, cpe.endtime)
            ELSE
                DATEDIFF(SECOND, cpe.starttime, DATEADD(DAY, 1, cpe.endtime))
        END AS RunningSecs,
        CASE
            WHEN cpe.setto >= cpe.setfrom
                THEN DATEDIFF(SECOND, cpe.setfrom, cpe.setto)
            ELSE
                DATEDIFF(SECOND, cpe.setfrom, DATEADD(DAY, 1, cpe.setto))
        END AS SettingSecs,
        ISNULL((
            SELECT SUM(DATEDIFF(SECOND, '19000101', cie.tottime))
            FROM conv_IdleEntry cie
            INNER JOIN IdleReasons ir ON cie.reasons = ir.IdleReasons
            WHERE cie.entryno = cpe.entryno AND ISNULL(ir.IsAccept, 0) = 1
        ), 0) AS AcceptedIdleSecs
    FROM ConvProductionEntry cpe
    WHERE cpe.deleted = 0
      AND CAST(cpe.{conv_date} AS DATE) BETWEEN ? AND ?

    UNION ALL

    SELECT
        cpr.macno,
        CAST(cpr.{rod_date} AS DATE) AS ProdDate,
        N'Conventional' AS MacType,
        CASE
            WHEN cpr.endtime >= cpr.starttime
                THEN DATEDIFF(SECOND, cpr.starttime, cpr.endtime)
            ELSE
                DATEDIFF(SECOND, cpr.starttime, DATEADD(DAY, 1, cpr.endtime))
        END AS RunningSecs,
        CASE
            WHEN cpr.setto >= cpr.setfrom
                THEN DATEDIFF(SECOND, cpr.setfrom, cpr.setto)
            ELSE
                DATEDIFF(SECOND, cpr.setfrom, DATEADD(DAY, 1, cpr.setto))
        END AS SettingSecs,
        ISNULL((
            SELECT SUM(DATEDIFF(SECOND, '19000101', crie.tottime))
            FROM conv_RodIdleEntry crie
            INNER JOIN IdleReasons ir ON crie.reasons = ir.IdleReasons
            WHERE crie.entryno = cpr.entryno AND ISNULL(ir.IsAccept, 0) = 1
        ), 0) AS AcceptedIdleSecs
    FROM ConvProductionEntryRod cpr
    WHERE cpr.deleted = 0
      AND CAST(cpr.{rod_date} AS DATE) BETWEEN ? AND ?

),

DailySummary AS (
    SELECT
        macno,
        ProdDate,
        MAX(MacType) AS MacType,
        SUM(RunningSecs)      AS TotalRunningSecs,
        SUM(AcceptedIdleSecs) AS TotalAcceptedIdleSecs,
        SUM(SettingSecs)      AS TotalSettingSecs
    FROM ProductionData
    {machine_filter_daily}
    GROUP BY macno, ProdDate
)

SELECT
    macno       AS MachineNo,
    ProdDate,
    MacType,
    TotalRunningSecs,
    TotalAcceptedIdleSecs AS AcceptedIdleSecs,
    TotalSettingSecs      AS SettingSecs,
    ROUND(TotalRunningSecs       * 1.0 / 3600, 2) AS RunningHours,
    ROUND(TotalAcceptedIdleSecs  * 1.0 / 3600, 2) AS IdleHours,
    ROUND(TotalSettingSecs       * 1.0 / 3600, 2) AS SettingHours,
    ROUND(
        CASE
            WHEN TotalRunningSecs <= 0 THEN 0.0
            ELSE (
                (TotalRunningSecs - (TotalAcceptedIdleSecs + TotalSettingSecs))
                * 100.0
            ) / NULLIF(TotalRunningSecs, 0)
        END,
        2
    ) AS AvailabilityPercent
FROM DailySummary
ORDER BY macno, ProdDate;
"""


# ── Schema resolver: detect actual date column names ─────────────────────────

def _resolve_date_cols(cursor):
    """
    Resolve the actual date column names for each production table.
    Falls back to common ERP column names.
    """
    def _find_col(tbl, candidates):
        try:
            cursor.execute(
                f"SELECT TOP 0 * FROM [{tbl}]"
            )
            existing = {d[0].lower() for d in cursor.description}
            for c in candidates:
                if c.lower() in existing:
                    return c
        except Exception:
            pass
        return candidates[0]  # default fallback

    pe_date   = _find_col("ProductionEntry",       ["proddate", "ProdDate", "PRODDATE", "entrydate"])
    conv_date = _find_col("ConvProductionEntry",   ["entrydate", "EntryDate", "ENTRYDATE", "proddate"])
    rod_date  = _find_col("ConvProductionEntryRod", ["entrydate", "EntryDate", "ENTRYDATE", "proddate"])

    return pe_date, conv_date, rod_date


# ── Fetch functions ──────────────────────────────────────────────────────────

def _fetch_machine_rows(cursor, start_date, end_date, machine_filter=None):
    """
    Execute the machine-level aggregation SQL (one row per machine).
    Returns a list of dicts.
    """
    pe_date, conv_date, rod_date = _resolve_date_cols(cursor)

    machine_filter_daily = ""
    machine_filter_outer = ""
    extra_params = []

    if machine_filter:
        macs = [m.strip() for m in machine_filter.split(",") if m.strip()]
        if macs:
            placeholders = ",".join(["?"] * len(macs))
            machine_filter_daily = f"WHERE LTRIM(RTRIM(CAST(macno AS NVARCHAR(128)))) IN ({placeholders})"
            extra_params.extend(macs)

    sql = _MACHINE_AVAIL_SQL.format(
        pe_date=pe_date,
        conv_date=conv_date,
        rod_date=rod_date,
        machine_filter_daily=machine_filter_daily,
        machine_filter_outer="",
    )

    params = [start_date, end_date, start_date, end_date, start_date, end_date] + extra_params

    try:
        cursor.execute(sql, params)
        cols = [d[0] for d in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]
    except Exception:
        return []


def _fetch_detail_rows(cursor, start_date, end_date, machine_filter=None):
    """
    Execute the per-date-per-machine SQL (detail rows).
    Returns a list of dicts.
    """
    pe_date, conv_date, rod_date = _resolve_date_cols(cursor)

    machine_filter_daily = ""
    extra_params = []

    if machine_filter:
        macs = [m.strip() for m in machine_filter.split(",") if m.strip()]
        if macs:
            placeholders = ",".join(["?"] * len(macs))
            machine_filter_daily = f"WHERE LTRIM(RTRIM(CAST(macno AS NVARCHAR(128)))) IN ({placeholders})"
            extra_params.extend(macs)

    sql = _DETAIL_SQL.format(
        pe_date=pe_date,
        conv_date=conv_date,
        rod_date=rod_date,
        machine_filter_daily=machine_filter_daily,
    )

    params = [start_date, end_date, start_date, end_date, start_date, end_date] + extra_params

    try:
        cursor.execute(sql, params)
        cols = [d[0] for d in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]
    except Exception:
        return []


# ── Row → payload converters ─────────────────────────────────────────────────

def _machine_row_to_payload(rec, rank=None):
    running_secs  = float(rec.get("TotalRunningSecs")   or 0)
    idle_secs     = float(rec.get("AcceptedIdleSecs")   or 0)
    setting_secs  = float(rec.get("SettingSecs")        or 0)
    avail         = _avail_pct(running_secs, idle_secs, setting_secs)
    idle_pct      = round((idle_secs + setting_secs) * 100.0 / running_secs, 2) if running_secs > 0 else 0.0
    mac           = str(rec.get("MachineNo") or "").strip() or "—"
    mac_type      = str(rec.get("MacType")   or "—").strip()

    payload = {
        "machine":             mac,
        "machineName":         mac,
        "machineType":         mac_type,
        "type":                mac_type,
        "totalRunningSecs":    round(running_secs, 2),
        "acceptedIdleSecs":    round(idle_secs,    2),
        "settingSecs":         round(setting_secs, 2),
        "runningHours":        round(float(rec.get("RunningHours")  or 0), 2),
        "idleHours":           round(float(rec.get("IdleHours")     or 0), 2),
        "settingHours":        round(float(rec.get("SettingHours")  or 0), 2),
        "availabilityPercent": avail,
        "machinePct":          avail,
        "oaEff":               avail,
        "qfEff":               avail,
        "idle":                idle_pct,
        "idlePct":             idle_pct,
    }
    if rank is not None:
        payload["rank"] = rank
    return payload


def _detail_row_to_payload(rec):
    running_secs  = float(rec.get("TotalRunningSecs") or 0)
    idle_secs     = float(rec.get("AcceptedIdleSecs") or 0)
    setting_secs  = float(rec.get("SettingSecs")      or 0)
    avail         = _avail_pct(running_secs, idle_secs, setting_secs)
    idle_pct      = round((idle_secs + setting_secs) * 100.0 / running_secs, 2) if running_secs > 0 else 0.0
    mac           = str(rec.get("MachineNo") or "").strip() or "—"
    mac_type      = str(rec.get("MacType")   or "—").strip()
    date_iso      = _fmt_date(rec.get("ProdDate"))

    return {
        "date":                date_iso,
        "dateIso":             date_iso,
        "machine":             mac,
        "machineName":         mac,
        "machineType":         mac_type,
        "type":                mac_type,
        "totalRunningSecs":    round(running_secs, 2),
        "acceptedIdleSecs":    round(idle_secs,    2),
        "settingSecs":         round(setting_secs, 2),
        "runningHours":        round(float(rec.get("RunningHours")  or 0), 2),
        "idleHours":           round(float(rec.get("IdleHours")     or 0), 2),
        "settingHours":        round(float(rec.get("SettingHours")  or 0), 2),
        "availabilityPercent": avail,
        "machinePct":          avail,
        "oaEff":               avail,
        "qfEff":               avail,
        "idle":                idle_pct,
        "idlePct":             idle_pct,
    }


# ── Monthwise chart data ──────────────────────────────────────────────────────

def _build_monthwise_report(detail_rows):
    """Build month-wise average availability for a trend chart."""
    from collections import defaultdict

    buckets = defaultdict(lambda: {"running": 0.0, "idle": 0.0, "setting": 0.0})
    for row in detail_rows:
        iso = (row.get("dateIso") or row.get("date") or "")[:7]
        if len(iso) < 7:
            continue
        b = buckets[iso]
        b["running"]  += float(row.get("totalRunningSecs")  or 0)
        b["idle"]     += float(row.get("acceptedIdleSecs")  or 0)
        b["setting"]  += float(row.get("settingSecs")       or 0)

    labels, data = [], []
    for sort_key in sorted(buckets.keys()):
        b = buckets[sort_key]
        labels.append(_month_label(sort_key))
        data.append(_avail_pct(b["running"], b["idle"], b["setting"]))

    return {"labels": labels, "data": data}


# ── Main payload builder ─────────────────────────────────────────────────────

def build_machine_availability_payload(
    cursor,
    start_date,
    end_date,
    machine_filter=None,
    eff_limit=None,
    load_full_fy=True,
):
    """
    Build the full machine availability / machine efficiency payload.

    Returns a dict ready for a DRF Response.
    """
    from .views import current_financial_year

    query_start, query_end = start_date, end_date

    # -- fetch machine-level totals (primary SQL)
    machine_rows_raw = _fetch_machine_rows(cursor, query_start, query_end, machine_filter)

    # -- fallback: try previous financial year if no data
    if not machine_rows_raw and load_full_fy:
        fy_start, _ = current_financial_year()
        prev_start = date(fy_start.year - 1, 4, 1)
        prev_end   = date(fy_start.year,     3, 31)
        machine_rows_raw = _fetch_machine_rows(cursor, prev_start, prev_end, machine_filter)
        if machine_rows_raw:
            query_start, query_end = prev_start, prev_end

    # -- fetch daily-detail rows (for chart and bottom table)
    detail_rows_raw = _fetch_detail_rows(cursor, query_start, query_end, machine_filter)

    # -- convert to payload objects
    machine_payload_all = [_machine_row_to_payload(r) for r in machine_rows_raw]
    detail_payload_all  = [_detail_row_to_payload(r)  for r in detail_rows_raw]

    # -- apply effLimit filter at payload level (frontend also filters, but apply server-side too)
    if eff_limit:
        machine_payload_all = [
            r for r in machine_payload_all
            if _passes_eff_limit(float(r.get("machinePct") or 0), eff_limit)
        ]
        detail_payload_all = [
            r for r in detail_payload_all
            if _passes_eff_limit(float(r.get("machinePct") or 0), eff_limit)
        ]

    # -- rank machine rows by availability descending
    ranked = sorted(machine_payload_all,
                    key=lambda r: float(r.get("availabilityPercent") or 0),
                    reverse=True)
    for idx, row in enumerate(ranked, start=1):
        row["rank"] = idx

    # -- KPIs
    total_running  = sum(float(r.get("totalRunningSecs")  or 0) for r in machine_payload_all)
    total_idle     = sum(float(r.get("acceptedIdleSecs")  or 0) for r in machine_payload_all)
    total_setting  = sum(float(r.get("settingSecs")       or 0) for r in machine_payload_all)
    avg_avail      = _avail_pct(total_running, total_idle, total_setting)

    # -- filter-option: unique machines list
    machines = sorted({
        r.get("machine") for r in detail_payload_all
        if r.get("machine") and r.get("machine") != "—"
    })

    # -- monthwise chart
    report = _build_monthwise_report(detail_payload_all)

    return {
        "from":       str(start_date),
        "to":         str(end_date),
        "queryFrom":  str(query_start),
        "queryTo":    str(query_end),

        # machine-level aggregated rows (one per machine, used by frontend table)
        "machineRows": ranked,
        "rows":        ranked,
        "rowCount":    len(ranked),

        # daily detail rows (used by frontend bottom table / date-filtered views)
        "detailRows":  detail_payload_all,
        "detailCount": len(detail_payload_all),

        # monthwise trend for chart
        "report": report,

        # KPI banner
        "kpis": {
            "avgAvailabilityPct":  avg_avail,
            "avgMachinePct":       avg_avail,
            "totalRunningHours":   round(total_running  / 3600.0, 2),
            "totalIdleHours":      round(total_idle     / 3600.0, 2),
            "totalSettingHours":   round(total_setting  / 3600.0, 2),
            "machineCount":        len(ranked),
        },

        # for autocomplete dropdowns in UI
        "filterOptions": {
            "machines": machines,
        },
    }
