# ════════════════════════════════════════════
#  views_idle_time_report.py
#  MIS — Idle Time Report (Report Filters → ERP)
# ════════════════════════════════════════════

from calendar import month_abbr
from collections import defaultdict
from datetime import timedelta

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .views import get_tenant_connection, parse_date_range, table_exists

# Core report — date range parameterized; machine/shift/reason optional on outer A.*
_IDLE_UNION_SQL = """
    SELECT
        M.proddate AS EntryDate,
        D.Shift,
        D.MacNo,
        ISNULL(D.reasons, N'Machine Idle Entry') AS Reason,
        DATEDIFF(SECOND, '1900-01-01 00:00:00', D.tottime) AS IdleSeconds
    FROM Machine_IdleEntryDet D
    INNER JOIN Machine_IdleEntryMas M ON D.prodid = M.prodid
    WHERE M.proddate BETWEEN ? AND ?
      AND M.deleted = 0
      AND D.deleted = 0

    UNION ALL

    SELECT
        P.proddate AS EntryDate,
        P.shift,
        P.macno,
        N'Production Idle Time' AS Reason,
        ISNULL(P.accidletimesecs, 0) + ISNULL(P.nonaccidletimesecs, 0)
    FROM ProductionEntry P
    WHERE P.proddate BETWEEN ? AND ?
      AND P.deleted = 0

    UNION ALL

    SELECT
        C.entrydate AS EntryDate,
        C.shift,
        C.macno,
        N'Conv Production Idle Time' AS Reason,
        DATEDIFF(SECOND, '1900-01-01 00:00:00', C.IdleTime)
    FROM ConvProductionEntry C
    WHERE C.entrydate BETWEEN ? AND ?
      AND C.deleted = 0

    UNION ALL

    SELECT
        R.entrydate AS EntryDate,
        R.shift,
        R.macno,
        N'Conv Rod Idle Time' AS Reason,
        DATEDIFF(SECOND, '1900-01-01 00:00:00', R.IdleTime)
    FROM ConvProductionEntryRod R
    WHERE R.entrydate BETWEEN ? AND ?
      AND R.deleted = 0
"""

_IDLE_REPORT_SQL = f"""
SELECT
    A.EntryDate,
    A.Shift,
    A.MacNo,
    A.Reason,
    CONVERT(VARCHAR(8), DATEADD(SECOND, SUM(A.IdleSeconds), 0), 108) AS TotalIdleHours,
    CAST(SUM(A.IdleSeconds) / 3600.0 AS DECIMAL(18, 2)) AS TotalIdleHours_Decimal
FROM (
    {_IDLE_UNION_SQL}
) A
WHERE 1 = 1
{{outer_filters}}
GROUP BY
    A.EntryDate,
    A.Shift,
    A.MacNo,
    A.Reason
ORDER BY
    A.EntryDate,
    A.Shift,
    A.MacNo,
    A.Reason
"""

_FILTER_OPTIONS_SQL = f"""
SELECT DISTINCT
    LTRIM(RTRIM(CAST(A.MacNo AS NVARCHAR(512)))) AS MacNo,
    LTRIM(RTRIM(CAST(A.Shift AS NVARCHAR(128)))) AS Shift,
    LTRIM(RTRIM(CAST(A.Reason AS NVARCHAR(512)))) AS Reason
FROM (
    {_IDLE_UNION_SQL}
) A
WHERE A.MacNo IS NOT NULL
  AND LTRIM(RTRIM(CAST(A.MacNo AS NVARCHAR(512)))) <> N''
ORDER BY MacNo, Shift, Reason
"""

_FIXED_REASONS = (
    "Machine Idle Entry",
    "Production Idle Time",
    "Conv Production Idle Time",
    "Conv Rod Idle Time",
)

_SHIFT_UI_LABELS = {
    "Shift 1": "Shift 1 (6AM-2PM)",
    "Shift 2": "Shift 2 (2PM-10PM)",
    "Shift 3": "Shift 3 (10PM-6AM)",
    "1": "Shift 1 (6AM-2PM)",
    "2": "Shift 2 (2PM-10PM)",
    "3": "Shift 3 (10PM-6AM)",
}

_TOP_REASON_CHART_COLORS = [
    "#dc2626", "#f97316", "#d97706", "#dc2626", "#0891b2",
    "#f97316", "#16a34a", "#7c3aed", "#2563eb", "#0891b2",
]

_SHIFT_CHART_COLORS = [
    ("rgba(37,99,235,0.7)", "#2563eb"),
    ("rgba(249,115,22,0.7)", "#f97316"),
    ("rgba(22,163,74,0.7)", "#16a34a"),
]

_SHIFT_TILE_STYLES = [
    {"color": "#2563eb", "bg": "rgba(37,99,235,0.07)", "border": "rgba(37,99,235,0.2)"},
    {"color": "#f97316", "bg": "rgba(249,115,22,0.07)", "border": "rgba(249,115,22,0.2)"},
    {"color": "#16a34a", "bg": "rgba(22,163,74,0.07)", "border": "rgba(22,163,74,0.2)"},
]

_SHIFT_TILE_ALL_STYLE = {
    "color": "#7c3aed",
    "bg": "rgba(124,58,237,0.07)",
    "border": "rgba(124,58,237,0.2)",
}

# Chart/tile UI labels (fixed — matches Idle Time Report mock layout)
_SHIFT_CHART_SLOT_LABELS = ("Shift 1", "Shift 2", "Shift 3")
_SHIFT_TILE_SLOT_LABELS = (
    "Shift 1  6AM–2PM",
    "Shift 2  2PM–10PM",
    "Shift 3  10PM–6AM",
)


def _union_date_params(start_date, end_date):
    """Four UNION branches — each needs (start, end)."""
    return [start_date, end_date] * 4


def _parse_machine(value):
    v = (value or "").strip()
    if not v or v.lower() == "all machines":
        return None
    if "," in v:
        return [item.strip() for item in v.split(",") if item.strip()]
    return [v]


def _parse_shift(value):
    v = (value or "").strip()
    if not v or v.lower() == "all shifts":
        return None
    if " (" in v:
        v = v.split(" (", 1)[0].strip()
    return v


def _resolve_shift_db_name(cursor, shift_parsed):
    """Map UI shift label (e.g. Shift 1) to ERP shift name (e.g. SH-1)."""
    if not shift_parsed:
        return None
    key = shift_parsed.strip().lower()
    regular = _fetch_shift_master(cursor)
    for i, slot_label in enumerate(_SHIFT_CHART_SLOT_LABELS):
        if key == slot_label.lower() and i < len(regular):
            return regular[i][0]
    if table_exists(cursor, "shift"):
        cursor.execute(
            """
            SELECT LTRIM(RTRIM(CAST([Shift] AS NVARCHAR(128)))) AS ShiftName
            FROM shift
            WHERE ISNULL(deleted, 0) = 0
            """
        )
        for row in cursor.fetchall() or []:
            name = (row[0] or "").strip()
            if not name:
                continue
            ui = _SHIFT_UI_LABELS.get(name, name)
            short = ui.split(" (", 1)[0].strip().lower()
            if key in (name.lower(), short, ui.lower()):
                return name
    return shift_parsed


def _parse_reason(value):
    v = (value or "").strip()
    if not v or v.lower() == "all reasons":
        return None
    if "," in v:
        return [item.strip() for item in v.split(",") if item.strip()]
    return [v]


def _build_outer_filters(machine, shift, reason):
    clauses = []
    params = []
    if machine:
        if isinstance(machine, list):
            placeholders = ",".join(["?"] * len(machine))
            clauses.append(f"AND LTRIM(RTRIM(CAST(A.MacNo AS NVARCHAR(512)))) IN ({placeholders})")
            params.extend(machine)
        else:
            clauses.append("AND LTRIM(RTRIM(CAST(A.MacNo AS NVARCHAR(512)))) = ?")
            params.append(machine)
    if shift:
        clauses.append("AND LTRIM(RTRIM(CAST(A.Shift AS NVARCHAR(128)))) = ?")
        params.append(shift)
    if reason:
        if isinstance(reason, list):
            placeholders = ",".join(["?"] * len(reason))
            clauses.append(f"AND LTRIM(RTRIM(CAST(A.Reason AS NVARCHAR(512)))) IN ({placeholders})")
            params.extend(reason)
        else:
            clauses.append("AND LTRIM(RTRIM(CAST(A.Reason AS NVARCHAR(512)))) = ?")
            params.append(reason)
    return "\n".join(clauses), params


def _shift_options(distinct_shifts):
    options = ["All Shifts"]
    seen = set()
    for raw in distinct_shifts:
        s = (raw or "").strip()
        if not s or s in seen:
            continue
        seen.add(s)
        options.append(_SHIFT_UI_LABELS.get(s, s))
    return options


def _reason_options(distinct_reasons):
    reasons = set()
    for r in distinct_reasons:
        s = (r or "").strip()
        if s:
            reasons.add(s)
    for r in _FIXED_REASONS:
        reasons.add(r)
    ordered = sorted(reasons, key=lambda x: x.lower())
    return ["All Reasons"] + ordered


def _machine_options(distinct_machines):
    machines = []
    for m in distinct_machines:
        s = (m or "").strip()
        if s and s not in machines:
            machines.append(s)
    return ["All Machines"] + sorted(machines, key=str.lower)


def _row_to_dict(row):
    if len(row) >= 8:
        entry_date, shift, mac_no, reason, total_hms, total_decimal, rate_per_hour, is_accepted = row[:8]
    elif len(row) == 7:
        entry_date, shift, mac_no, reason, total_hms, total_decimal, rate_per_hour = row[:7]
        is_accepted = 1
    else:
        entry_date, shift, mac_no, reason, total_hms, total_decimal = row
        rate_per_hour = 0
        is_accepted = 1
    return {
        "entry_date": entry_date.isoformat() if hasattr(entry_date, "isoformat") else str(entry_date or ""),
        "shift": (str(shift).strip() if shift is not None else ""),
        "mac_no": (str(mac_no).strip() if mac_no is not None else ""),
        "reason": (str(reason).strip() if reason is not None else ""),
        "total_idle_hours": (str(total_hms).strip() if total_hms is not None else ""),
        "total_idle_hours_decimal": float(total_decimal or 0),
        "rate_per_hour": float(rate_per_hour or 0),
        "is_accepted": bool(is_accepted),
    }


def _fmt_hms(total_seconds):
    secs = int(total_seconds or 0)
    h, rem = divmod(secs, 3600)
    m, s = divmod(rem, 60)
    return f"{h:,}:{m:02d}:{s:02d}"


def _fmt_hms_decimal(hours):
    secs = round(float(hours or 0) * 3600)
    return _fmt_hms(secs)


def _fmt_hm(total_seconds):
    """Hours:minutes for continuous-idle table (e.g. 4:30)."""
    secs = int(total_seconds or 0)
    h, rem = divmod(secs, 3600)
    m, _ = divmod(rem, 60)
    return f"{h}:{m:02d}"


def _continuous_idle_status(total_seconds):
    hours = float(total_seconds or 0) / 3600.0
    if hours >= 6:
        return "CRITICAL"
    if hours >= 5:
        return "HIGH"
    return "MEDIUM"


def _fmt_rupees(amount):
    val = float(amount or 0)
    if abs(val) >= 100_000:
        return f"₹{val / 100_000:.2f} L"
    return f"₹{val:,.0f}"


def _filtered_cte_sql(outer_filters):
    return f"""
    WITH FilteredIdle AS (
        SELECT
            A.EntryDate,
            A.Shift,
            A.MacNo,
            A.Reason,
            A.IdleSeconds
        FROM (
            {_IDLE_UNION_SQL}
        ) A
        WHERE 1 = 1
        {outer_filters}
    )
    """


def _compute_kpis(cursor, start_date, end_date, date_params, outer_sql, outer_params, data_rows, machine, shift):
    """KPI strip from filtered idle union + MacMaster + shift master."""
    base = _filtered_cte_sql(outer_sql)

    # ── Total idle + machine count ──
    cursor.execute(
        base
        + """
        SELECT
            ISNULL(SUM(IdleSeconds), 0),
            COUNT(DISTINCT NULLIF(LTRIM(RTRIM(CAST(MacNo AS NVARCHAR(512)))), N''))
        FROM FilteredIdle
        """,
        date_params + outer_params,
    )
    total_secs, machine_count = cursor.fetchone() or (0, 0)
    total_secs = int(total_secs or 0)
    machine_count = int(machine_count or 0)

    # ── Total idle cost (MacMaster.RatePerHr) ──
    total_cost = 0.0
    if table_exists(cursor, "MacMaster"):
        cursor.execute(
            base
            + """
            SELECT ISNULL(SUM(
                (FI.MacSecs / 3600.0) * ISNULL(MM.RatePerHr, 0)
            ), 0)
            FROM (
                SELECT MacNo, SUM(IdleSeconds) AS MacSecs
                FROM FilteredIdle
                GROUP BY MacNo
            ) FI
            LEFT JOIN MacMaster MM
                ON LTRIM(RTRIM(CAST(FI.MacNo AS NVARCHAR(512))))
                 = LTRIM(RTRIM(CAST(MM.macno AS NVARCHAR(512))))
                AND ISNULL(MM.deleted, 0) = 0
            """,
            date_params + outer_params,
        )
        cost_row = cursor.fetchone()
        total_cost = float(cost_row[0] or 0) if cost_row else 0.0

    # ── Continuous idle > 4h (distinct machines with any day total > 4h) ──
    cursor.execute(
        base
        + """
        SELECT COUNT(DISTINCT MacNo)
        FROM (
            SELECT MacNo, EntryDate, SUM(IdleSeconds) AS DaySecs
            FROM FilteredIdle
            GROUP BY MacNo, EntryDate
            HAVING SUM(IdleSeconds) > 14400
        ) Over4
        """,
        date_params + outer_params,
    )
    continuous_row = cursor.fetchone()
    continuous_over_4h = int(continuous_row[0] or 0) if continuous_row else 0

    # ── Top idle reason (from aggregated rows) ──
    reason_secs = defaultdict(int)
    for row in data_rows:
        reason_secs[row["reason"]] += int(round(row["total_idle_hours_decimal"] * 3600))
    top_reason = ""
    top_reason_secs = 0
    if reason_secs:
        top_reason, top_reason_secs = max(reason_secs.items(), key=lambda x: x[1])
    top_reason_pct = round((top_reason_secs / total_secs * 100), 2) if total_secs > 0 else 0.0

    # ── Avg idle (total hours / distinct machines) ──
    avg_hours = (total_secs / 3600.0 / machine_count) if machine_count > 0 else 0.0

    # ── Idle not entered (regular shifts × MacMaster × dates − Machine_IdleEntry) ──
    idle_not_entered = _fetch_idle_not_entered_count(cursor, start_date, end_date, machine, shift)

    return {
        "total_idle_seconds": total_secs,
        "total_idle_hours_display": _fmt_hms(total_secs),
        "total_idle_hours_decimal": round(total_secs / 3600.0, 2),
        "total_idle_cost": round(total_cost, 2),
        "total_idle_cost_display": _fmt_rupees(total_cost),
        "avg_idle_hours_decimal": round(avg_hours, 2),
        "avg_idle_display": _fmt_hms_decimal(avg_hours),
        "machine_count": machine_count,
        "idle_not_entered": idle_not_entered,
        "top_idle_reason": top_reason or "—",
        "top_idle_reason_pct": top_reason_pct,
        "continuous_idle_over_4h": continuous_over_4h,
    }


def _fetch_top_idle_reasons(cursor, date_params, outer_sql, outer_params, limit=10):
    """Top N reasons by total idle hours (decimal) from filtered idle union."""
    base = _filtered_cte_sql(outer_sql)
    cursor.execute(
        base
        + f"""
        SELECT TOP ({int(limit)})
            LTRIM(RTRIM(CAST(Reason AS NVARCHAR(512)))) AS Reason,
            CAST(SUM(IdleSeconds) / 3600.0 AS DECIMAL(18, 2)) AS IdleHours
        FROM FilteredIdle
        WHERE LTRIM(RTRIM(CAST(Reason AS NVARCHAR(512)))) <> N''
        GROUP BY LTRIM(RTRIM(CAST(Reason AS NVARCHAR(512))))
        ORDER BY SUM(IdleSeconds) DESC
        """,
        date_params + outer_params,
    )
    rows = cursor.fetchall() or []
    labels = [(str(r[0]).strip() if r[0] is not None else "") or "(blank)" for r in rows]
    data = [float(r[1] or 0) for r in rows]
    seconds = [round(h * 3600) for h in data]
    hours_display = [_fmt_hms(s) for s in seconds]
    colors = [
        _TOP_REASON_CHART_COLORS[i % len(_TOP_REASON_CHART_COLORS)]
        for i in range(len(labels))
    ]
    labels = labels[::-1]
    data = data[::-1]
    seconds = seconds[::-1]
    hours_display = hours_display[::-1]
    colors = colors[::-1]
    return {
        "labels": labels,
        "data": data,
        "seconds": seconds,
        "hours_display": hours_display,
        "colors": colors,
    }


def _month_chart_label(year, month):
    abbr = month_abbr[int(month)] if 1 <= int(month) <= 12 else "?"
    return f"{abbr} {str(int(year))[-2:]}"


def _fetch_monthwise_idle_cost(cursor, date_params, outer_sql, outer_params):
    """Idle hours (left axis) and idle cost in ₹ Lakhs (right axis) by calendar month."""
    base = _filtered_cte_sql(outer_sql)
    mac_join = ""
    cost_sum = "CAST(0 AS DECIMAL(18, 4))"
    if table_exists(cursor, "MacMaster"):
        mac_join = """
        LEFT JOIN MacMaster MM
            ON LTRIM(RTRIM(CAST(F.MacNo AS NVARCHAR(512))))
             = LTRIM(RTRIM(CAST(MM.macno AS NVARCHAR(512))))
            AND ISNULL(MM.deleted, 0) = 0
        """
        cost_sum = "CAST(SUM((F.IdleSeconds / 3600.0) * ISNULL(MM.RatePerHr, 0)) / 100000.0 AS DECIMAL(18, 4))"

    cursor.execute(
        base
        + f"""
        SELECT
            YEAR(F.EntryDate) AS Yr,
            MONTH(F.EntryDate) AS Mo,
            CAST(SUM(F.IdleSeconds) / 3600.0 AS DECIMAL(18, 2)) AS IdleHours,
            {cost_sum} AS CostLakhs
        FROM FilteredIdle F
        {mac_join}
        GROUP BY YEAR(F.EntryDate), MONTH(F.EntryDate)
        ORDER BY YEAR(F.EntryDate), MONTH(F.EntryDate)
        """,
        date_params + outer_params,
    )
    rows = cursor.fetchall() or []
    labels, hours, cost_lakhs = [], [], []
    for yr, mo, hrs, cost in rows:
        labels.append(_month_chart_label(yr, mo))
        hours.append(float(hrs or 0))
        cost_lakhs.append(round(float(cost or 0), 2))
    return {"labels": labels, "hours": hours, "cost_lakhs": cost_lakhs}


def _fetch_top_machines_idle_cost(cursor, date_params, outer_sql, outer_params, kpis=None, limit=15):
    """Top machines by idle cost (₹K) and hours from filtered idle union + MacMaster."""
    base = _filtered_cte_sql(outer_sql)
    mac_join = ""
    cost_expr = "CAST(0 AS DECIMAL(18, 2))"
    order_expr = "FI.MacSecs DESC"
    if table_exists(cursor, "MacMaster"):
        mac_join = """
        LEFT JOIN MacMaster MM
            ON LTRIM(RTRIM(CAST(FI.MacNo AS NVARCHAR(512))))
             = LTRIM(RTRIM(CAST(MM.macno AS NVARCHAR(512))))
            AND ISNULL(MM.deleted, 0) = 0
        """
        cost_expr = (
            "CAST((FI.MacSecs / 3600.0) * ISNULL(MM.RatePerHr, 0) / 1000.0 AS DECIMAL(18, 2))"
        )
        order_expr = (
            "(FI.MacSecs / 3600.0) * ISNULL(MM.RatePerHr, 0) DESC, FI.MacSecs DESC"
        )

    cursor.execute(
        base
        + f"""
        SELECT TOP ({int(limit)})
            LTRIM(RTRIM(CAST(FI.MacNo AS NVARCHAR(512)))) AS MacNo,
            CAST(FI.MacSecs / 3600.0 AS DECIMAL(18, 2)) AS IdleHours,
            {cost_expr} AS CostK
        FROM (
            SELECT MacNo, SUM(IdleSeconds) AS MacSecs
            FROM FilteredIdle
            WHERE LTRIM(RTRIM(CAST(MacNo AS NVARCHAR(512)))) <> N''
            GROUP BY MacNo
        ) FI
        {mac_join}
        ORDER BY {order_expr}
        """,
        date_params + outer_params,
    )
    rows = cursor.fetchall() or []
    labels, hours, cost_k, seconds, hours_display = [], [], [], [], []
    for mac, hrs, cost in rows:
        mac_label = (str(mac).strip() if mac is not None else "") or "(blank)"
        hrs_f = float(hrs or 0)
        labels.append(mac_label)
        hours.append(round(hrs_f, 2))
        cost_k.append(round(float(cost or 0), 2))
        secs = round(hrs_f * 3600)
        seconds.append(secs)
        hours_display.append(_fmt_hms(secs))

    k = kpis or {}
    total_cost = float(k.get("total_idle_cost") or 0)
    total_hours = float(k.get("total_idle_hours_decimal") or 0)
    avg_cost_per_hr = round(total_cost / total_hours, 2) if total_hours > 0 else 0.0

    return {
        "labels": labels,
        "hours": hours,
        "cost_k": cost_k,
        "seconds": seconds,
        "hours_display": hours_display,
        "summary": {
            "total_cost": round(total_cost, 2),
            "total_cost_display": k.get("total_idle_cost_display") or _fmt_rupees(total_cost),
            "avg_cost_per_hr": avg_cost_per_hr,
            "avg_cost_per_hr_display": f"₹{avg_cost_per_hr:,.0f}",
            "highest_machine": labels[0] if labels else "—",
        },
    }


def _build_productive_filters(machine, shift):
    """Machine/shift filters for production union (reason filter does not apply)."""
    clauses = []
    params = []
    if machine:
        if isinstance(machine, list):
            placeholders = ",".join(["?"] * len(machine))
            clauses.append(f"AND LTRIM(RTRIM(CAST(macno AS NVARCHAR(512)))) IN ({placeholders})")
            params.extend(machine)
        else:
            clauses.append("AND LTRIM(RTRIM(CAST(macno AS NVARCHAR(512)))) = ?")
            params.append(machine)
    if shift:
        clauses.append("AND LTRIM(RTRIM(CAST(shift AS NVARCHAR(128)))) = ?")
        params.append(shift)
    return "\n".join(clauses), params


# ─── % Wise Idle Machine Ranking (Top 10 by idle %) ───
def _fetch_idle_pct_ranking(
    cursor, date_params, start_date, end_date, outer_sql, outer_params,
    machine=None, shift=None, limit=10,
):
    """
    Idle % per machine = idle_secs / (idle_secs + productive_secs) * 100.
    Top N machines by idle % (descending). Idle side uses report outer filters;
    productive side uses machine/shift only.
    """
    base = _filtered_cte_sql(outer_sql)

    cursor.execute(
        base
        + """
        SELECT
            LTRIM(RTRIM(CAST(MacNo AS NVARCHAR(512)))) AS MacNo,
            CAST(SUM(IdleSeconds) AS DECIMAL(18, 0)) AS IdleSeconds
        FROM FilteredIdle
        WHERE LTRIM(RTRIM(CAST(MacNo AS NVARCHAR(512)))) <> N''
        GROUP BY LTRIM(RTRIM(CAST(MacNo AS NVARCHAR(512))))
        """,
        date_params + outer_params,
    )
    idle_map = {
        (str(r[0]).strip() if r[0] else ""): int(r[1] or 0)
        for r in (cursor.fetchall() or [])
    }

    if not idle_map:
        return {"labels": [], "data": []}

    prod_filter_sql, prod_filter_params = _build_productive_filters(machine, shift)
    outer_prod_filter = (
        prod_filter_sql.replace("macno", "P.macno").replace("shift", "P.shift")
        if prod_filter_sql
        else ""
    )
    prod_params = _productive_date_params(start_date, end_date) + prod_filter_params

    cursor.execute(
        f"""
        SELECT
            LTRIM(RTRIM(CAST(P.macno AS NVARCHAR(512)))) AS MacNo,
            SUM(P.ProductiveSeconds) AS TotalProdSeconds
        FROM (
            {_PRODUCTIVE_UNION_SQL}
        ) P
        WHERE P.macno IS NOT NULL
          AND LTRIM(RTRIM(CAST(P.macno AS NVARCHAR(512)))) <> N''
          {outer_prod_filter}
        GROUP BY LTRIM(RTRIM(CAST(P.macno AS NVARCHAR(512))))
        """,
        prod_params,
    )
    prod_map = {
        (str(r[0]).strip() if r[0] else ""): int(r[1] or 0)
        for r in (cursor.fetchall() or [])
    }

    results = []
    for mac, idle_secs in idle_map.items():
        prod_secs = prod_map.get(mac, 0)
        total_secs = idle_secs + prod_secs
        idle_pct = round((idle_secs / total_secs) * 100, 2) if total_secs > 0 else 0.0
        results.append((mac, idle_pct))

    results.sort(key=lambda x: (-x[1], x[0]))
    top_results = results[: int(limit)]

    return {
        "labels": [r[0] for r in top_results],
        "data": [r[1] for r in top_results],
    }


def _fetch_continuous_idle_reasons(cursor, date_params, outer_sql, outer_params):
    """
    Machine + reason rows with total idle >= 4 hours in the filtered date range.
    Same idle union and outer filters (machine/shift/reason) as the main report.
    """
    base = _filtered_cte_sql(outer_sql)
    cursor.execute(
        base
        + """
        SELECT
            LTRIM(RTRIM(CAST(MacNo AS NVARCHAR(512)))) AS MacNo,
            LTRIM(RTRIM(CAST(Reason AS NVARCHAR(512)))) AS Reason,
            COUNT(
                DISTINCT NULLIF(LTRIM(RTRIM(CAST(Shift AS NVARCHAR(128)))), N'')
            ) AS ShiftCount,
            SUM(IdleSeconds) AS TotalSeconds
        FROM FilteredIdle
        WHERE LTRIM(RTRIM(CAST(MacNo AS NVARCHAR(512)))) <> N''
        GROUP BY
            LTRIM(RTRIM(CAST(MacNo AS NVARCHAR(512)))),
            LTRIM(RTRIM(CAST(Reason AS NVARCHAR(512))))
        HAVING SUM(IdleSeconds) >= 14400
        ORDER BY SUM(IdleSeconds) DESC,
            LTRIM(RTRIM(CAST(MacNo AS NVARCHAR(512)))),
            LTRIM(RTRIM(CAST(Reason AS NVARCHAR(512))))
        """,
        date_params + outer_params,
    )
    rows = []
    for mac, reason, shift_count, total_secs in cursor.fetchall() or []:
        secs = int(total_secs or 0)
        rows.append({
            "machine": (str(mac).strip() if mac else "") or "—",
            "reason": (str(reason).strip() if reason else "") or "—",
            "hours": _fmt_hm(secs),
            "hours_decimal": round(secs / 3600.0, 2),
            "shifts": int(shift_count or 0),
            "status": _continuous_idle_status(secs),
        })
    return rows


def _format_shift_clock(value):
    """1900-01-01 time/datetime → compact clock label (e.g. 8AM)."""
    if value is None:
        return ""
    if hasattr(value, "hour"):
        h = int(value.hour)
        suffix = "AM" if h < 12 else "PM"
        h12 = h % 12 or 12
        return f"{h12}{suffix}"
    text = str(value).strip()
    if len(text) >= 16:
        try:
            h = int(text[11:13])
            suffix = "AM" if h < 12 else "PM"
            return f"{h % 12 or 12}{suffix}"
        except ValueError:
            pass
    return text


def _shift_tile_label(shift_name, stime1, etime2):
    name = (shift_name or "").strip()
    t1 = _format_shift_clock(stime1)
    t2 = _format_shift_clock(etime2)
    if t1 and t2:
        return f"{name}  {t1}–{t2}"
    return name or "Shift"


def _fetch_shift_master(cursor):
    """Regular shifts from shift table (IsRegularShift), ordered by shcode."""
    if not table_exists(cursor, "shift"):
        return []
    cursor.execute(
        """
        SELECT
            LTRIM(RTRIM(CAST([Shift] AS NVARCHAR(128)))) AS ShiftName,
            stime1,
            etime2
        FROM shift
        WHERE ISNULL(deleted, 0) = 0
          AND ISNULL(IsRegularShift, 0) = 1
          AND LTRIM(RTRIM(CAST([Shift] AS NVARCHAR(128)))) <> N''
        ORDER BY shcode
        """
    )
    return cursor.fetchall() or []


def _fetch_shift_wise_idle(cursor, date_params, outer_sql, outer_params, machine_limit=15):
    """
    Shift-wise idle hours per machine (overall idle union by shift) for the
    "No. of Machines Idled — Shift Wise" chart only. Uses up to 3 regular shifts
    from shift master; chart legend stays Shift 1 / 2 / 3 for UI consistency.
    """
    base = _filtered_cte_sql(outer_sql)
    cursor.execute(
        base
        + """
        SELECT
            LTRIM(RTRIM(CAST(MacNo AS NVARCHAR(512)))) AS MacNo,
            LTRIM(RTRIM(CAST(Shift AS NVARCHAR(128)))) AS ShiftName,
            CAST(SUM(IdleSeconds) / 3600.0 AS DECIMAL(18, 2)) AS IdleHours
        FROM FilteredIdle
        WHERE LTRIM(RTRIM(CAST(MacNo AS NVARCHAR(512)))) <> N''
          AND LTRIM(RTRIM(CAST(Shift AS NVARCHAR(128)))) <> N''
        GROUP BY
            LTRIM(RTRIM(CAST(MacNo AS NVARCHAR(512)))),
            LTRIM(RTRIM(CAST(Shift AS NVARCHAR(128))))
        """,
        date_params + outer_params,
    )
    rows = cursor.fetchall() or []

    mac_shift_hours = defaultdict(lambda: defaultdict(float))
    shift_machines = defaultdict(set)
    all_machines = set()

    for mac, shift, hrs in rows:
        mac_key = (mac or "").strip()
        shift_key = (shift or "").strip()
        if not mac_key or not shift_key:
            continue
        hours = float(hrs or 0)
        mac_shift_hours[mac_key][shift_key] += hours
        all_machines.add(mac_key)
        if hours > 0:
            shift_machines[shift_key].add(mac_key)

    regular_rows = _fetch_shift_master(cursor)
    regular_names = [r[0] for r in regular_rows][:3]

    mac_totals = {
        m: sum(mac_shift_hours[m].values()) for m in mac_shift_hours
    }
    labels = sorted(
        mac_totals.keys(),
        key=lambda m: mac_totals[m],
        reverse=True,
    )[: int(machine_limit)]

    datasets = []
    for i, chart_label in enumerate(_SHIFT_CHART_SLOT_LABELS):
        shift_name = regular_names[i] if i < len(regular_names) else None
        bg, border = _SHIFT_CHART_COLORS[i]
        if shift_name:
            data = [
                round(mac_shift_hours[m].get(shift_name, 0.0), 2) for m in labels
            ]
        else:
            data = [0.0] * len(labels)
        datasets.append({
            "label": chart_label,
            "data": data,
            "backgroundColor": bg,
            "borderColor": border,
        })

    total_mc = len(all_machines) or 1
    tiles = []
    for i, tile_label in enumerate(_SHIFT_TILE_SLOT_LABELS):
        shift_name = regular_names[i] if i < len(regular_names) else None
        style = _SHIFT_TILE_STYLES[i]
        tiles.append({
            "label": tile_label,
            "count": len(shift_machines.get(shift_name, set())) if shift_name else 0,
            "total": total_mc,
            **style,
        })

    tiles.append({
        "label": "All Shifts",
        "count": len(all_machines),
        "total": total_mc,
        **_SHIFT_TILE_ALL_STYLE,
    })

    return {"labels": labels, "datasets": datasets, "tiles": tiles}


def _fetch_daywise_idle_hours(start_date, end_date, cursor, date_params, outer_sql, outer_params):
    """Daily total idle hours (decimal) for each date in the filtered range."""
    base = _filtered_cte_sql(outer_sql)
    cursor.execute(
        base
        + """
        SELECT
            CAST(F.EntryDate AS DATE) AS EntryDate,
            CAST(SUM(F.IdleSeconds) / 3600.0 AS DECIMAL(18, 2)) AS IdleHours
        FROM FilteredIdle F
        GROUP BY CAST(F.EntryDate AS DATE)
        ORDER BY CAST(F.EntryDate AS DATE)
        """,
        date_params + outer_params,
    )
    daily = {}
    for row in cursor.fetchall() or []:
        entry = row[0]
        key = entry.date() if hasattr(entry, "date") and callable(getattr(entry, "date", None)) else entry
        daily[key] = float(row[1] or 0)

    labels, hours, is_sunday = [], [], []
    single_month = (
        start_date.year == end_date.year and start_date.month == end_date.month
    )
    d = start_date
    while d <= end_date:
        hrs = round(daily.get(d, 0.0), 2)
        labels.append(str(d.day) if single_month else f"{d.day} {month_abbr[d.month]}")
        hours.append(hrs)
        is_sunday.append(d.weekday() == 6)
        d += timedelta(days=1)

    return {
        "labels": labels,
        "hours": hours,
        "is_sunday": is_sunday,
        "day_count": len(labels),
    }


def _fetch_accepted_vs_non_accepted(cursor, date_params, outer_sql, outer_params):
    """
    Classify filtered idle seconds via IdleReasons.IsAccept on Reason match.
    IsAccept = 1 → Accepted; IsAccept = 0 or no match → Non-Accepted.
    """
    empty = {
        "accepted_seconds": 0,
        "non_accepted_seconds": 0,
        "accepted_hours_display": "0:00:00",
        "non_accepted_hours_display": "0:00:00",
        "accepted_pct": 0.0,
        "non_accepted_pct": 0.0,
        "chart_hours": [0.0, 0.0],
    }
    if not table_exists(cursor, "IdleReasons"):
        return empty

    base = _filtered_cte_sql(outer_sql)
    cursor.execute(
        base
        + """
        SELECT
            ISNULL(SUM(
                CASE
                    WHEN IR.IdleID IS NOT NULL AND ISNULL(IR.IsAccept, 0) = 1
                    THEN F.IdleSeconds ELSE 0
                END
            ), 0),
            ISNULL(SUM(
                CASE
                    WHEN IR.IdleID IS NULL OR ISNULL(IR.IsAccept, 0) = 0
                    THEN F.IdleSeconds ELSE 0
                END
            ), 0)
        FROM FilteredIdle F
        LEFT JOIN IdleReasons IR
            ON LTRIM(RTRIM(CAST(F.Reason AS NVARCHAR(512))))
             = LTRIM(RTRIM(CAST(IR.IdleReasons AS NVARCHAR(512))))
            AND ISNULL(IR.deleted, 0) = 0
        """,
        date_params + outer_params,
    )
    row = cursor.fetchone()
    acc_secs = int(row[0] or 0) if row else 0
    na_secs = int(row[1] or 0) if row else 0
    total = acc_secs + na_secs
    acc_pct = round(acc_secs / total * 100, 1) if total > 0 else 0.0
    na_pct = round(na_secs / total * 100, 1) if total > 0 else 0.0
    return {
        "accepted_seconds": acc_secs,
        "non_accepted_seconds": na_secs,
        "accepted_hours_display": _fmt_hms(acc_secs),
        "non_accepted_hours_display": _fmt_hms(na_secs),
        "accepted_pct": acc_pct,
        "non_accepted_pct": na_pct,
        "chart_hours": [round(acc_secs / 3600.0, 2), round(na_secs / 3600.0, 2)],
    }


_SHIFT_HOURS_CTE = """
    SELECT
        LTRIM(RTRIM(CAST([Shift] AS NVARCHAR(128)))) AS Shift,
        (
            CASE
                WHEN etime1 >= stime1
                    THEN DATEDIFF(SECOND, stime1, etime1)
                ELSE DATEDIFF(SECOND, stime1, DATEADD(DAY, 1, etime1))
            END
            +
            CASE
                WHEN etime2 >= stime2
                    THEN DATEDIFF(SECOND, stime2, etime2)
                ELSE DATEDIFF(SECOND, stime2, DATEADD(DAY, 1, etime2))
            END
        ) AS ShiftSeconds
    FROM shift
    WHERE ISNULL(deleted, 0) = 0
"""

_PRODUCTIVE_UNION_SQL = """
    SELECT
        proddate AS EntryDate,
        shift,
        macno,
        CASE
            WHEN runto >= runfrom
                THEN DATEDIFF(SECOND, runfrom, runto)
            ELSE DATEDIFF(SECOND, runfrom, DATEADD(DAY, 1, runto))
        END AS ProductiveSeconds
    FROM ProductionEntry
    WHERE proddate BETWEEN ? AND ?
      AND deleted = 0
      AND runfrom IS NOT NULL
      AND runto IS NOT NULL

    UNION ALL

    SELECT
        entrydate,
        shift,
        macno,
        CASE
            WHEN endtime >= starttime
                THEN DATEDIFF(SECOND, starttime, endtime)
            ELSE DATEDIFF(SECOND, starttime, DATEADD(DAY, 1, endtime))
        END AS ProductiveSeconds
    FROM ConvProductionEntry
    WHERE entrydate BETWEEN ? AND ?
      AND deleted = 0
      AND starttime IS NOT NULL
      AND endtime IS NOT NULL

    UNION ALL

    SELECT
        entrydate,
        shift,
        macno,
        CASE
            WHEN endtime >= starttime
                THEN DATEDIFF(SECOND, starttime, endtime)
            ELSE DATEDIFF(SECOND, starttime, DATEADD(DAY, 1, endtime))
        END AS ProductiveSeconds
    FROM ConvProductionEntryRod
    WHERE entrydate BETWEEN ? AND ?
      AND deleted = 0
      AND starttime IS NOT NULL
      AND endtime IS NOT NULL
"""


def _productive_date_params(start_date, end_date):
    return [start_date, end_date] * 3


def _build_utilization_filters(machine, shift):
    clauses = []
    params = []
    if machine:
        if isinstance(machine, list):
            placeholders = ",".join(["?"] * len(machine))
            clauses.append(f"AND LTRIM(RTRIM(CAST(I.MacNo AS NVARCHAR(512)))) IN ({placeholders})")
            params.extend(machine)
        else:
            clauses.append("AND LTRIM(RTRIM(CAST(I.MacNo AS NVARCHAR(512)))) = ?")
            params.append(machine)
    if shift:
        clauses.append(
            "AND LTRIM(RTRIM(CAST(I.Shift AS NVARCHAR(128)))) = ?"
        )
        params.append(shift)
    return "\n".join(clauses), params


def _fetch_utilization_totals(cursor, start_date, end_date, machine, shift):
    """
    Machine utilization totals (ERP query): available / idle / productive hours
    and overall idle % for the filtered date range (optional machine & shift).
    """
    date_params = _union_date_params(start_date, end_date)
    prod_params = _productive_date_params(start_date, end_date)
    util_filters, util_params = _build_utilization_filters(machine, shift)

    if not table_exists(cursor, "shift"):
        return {
            "total_machine_hours_available": "0:00:00",
            "total_idle_hours": "0:00:00",
            "total_productive_hours": "0:00:00",
            "overall_idle_percent": 0.0,
        }

    sql = f"""
    WITH SHIFT_HOURS AS (
        {_SHIFT_HOURS_CTE}
    ),
    IDLE_DATA AS (
        SELECT
            A.EntryDate,
            A.Shift,
            A.MacNo,
            SUM(A.IdleSeconds) AS TotalIdleSeconds
        FROM (
            SELECT
                M.proddate AS EntryDate,
                D.Shift,
                D.MacNo,
                DATEDIFF(SECOND, '1900-01-01 00:00:00', D.tottime) AS IdleSeconds
            FROM Machine_IdleEntryDet D
            INNER JOIN Machine_IdleEntryMas M ON D.prodid = M.prodid
            WHERE M.proddate BETWEEN ? AND ?
              AND M.deleted = 0
              AND D.deleted = 0

            UNION ALL

            SELECT
                P.proddate,
                P.shift,
                P.macno,
                ISNULL(P.accidletimesecs, 0) + ISNULL(P.nonaccidletimesecs, 0)
            FROM ProductionEntry P
            WHERE P.proddate BETWEEN ? AND ?
              AND P.deleted = 0

            UNION ALL

            SELECT
                C.entrydate,
                C.shift,
                C.macno,
                DATEDIFF(SECOND, '1900-01-01 00:00:00', C.IdleTime)
            FROM ConvProductionEntry C
            WHERE C.entrydate BETWEEN ? AND ?
              AND C.deleted = 0

            UNION ALL

            SELECT
                R.entrydate,
                R.shift,
                R.macno,
                DATEDIFF(SECOND, '1900-01-01 00:00:00', R.IdleTime)
            FROM ConvProductionEntryRod R
            WHERE R.entrydate BETWEEN ? AND ?
              AND R.deleted = 0
        ) A
        GROUP BY A.EntryDate, A.Shift, A.MacNo
    ),
    PRODUCTIVE_DATA AS (
        SELECT
            P.EntryDate,
            P.Shift,
            P.MacNo,
            SUM(P.ProductiveSeconds) AS TotalProductiveSeconds
        FROM (
            {_PRODUCTIVE_UNION_SQL}
        ) P
        GROUP BY P.EntryDate, P.Shift, P.MacNo
    ),
    DETAIL AS (
        SELECT
            I.EntryDate,
            I.Shift,
            I.MacNo,
            ISNULL(S.ShiftSeconds, 0) AS ShiftSeconds,
            I.TotalIdleSeconds,
            ISNULL(P.TotalProductiveSeconds, 0) AS TotalProductiveSeconds
        FROM IDLE_DATA I
        LEFT JOIN PRODUCTIVE_DATA P
            ON I.EntryDate = P.EntryDate
           AND LTRIM(RTRIM(CAST(I.Shift AS NVARCHAR(128))))
             = LTRIM(RTRIM(CAST(P.Shift AS NVARCHAR(128))))
           AND LTRIM(RTRIM(CAST(I.MacNo AS NVARCHAR(512))))
             = LTRIM(RTRIM(CAST(P.MacNo AS NVARCHAR(512))))
        LEFT JOIN SHIFT_HOURS S
            ON LTRIM(RTRIM(CAST(I.Shift AS NVARCHAR(128))))
             = LTRIM(RTRIM(CAST(S.Shift AS NVARCHAR(128))))
        WHERE 1 = 1
        {util_filters}
    )
    SELECT
        ISNULL(SUM(ShiftSeconds), 0),
        ISNULL(SUM(TotalIdleSeconds), 0),
        ISNULL(SUM(TotalProductiveSeconds), 0)
    FROM DETAIL I
    """
    params = date_params + prod_params + util_params
    cursor.execute(sql, params)
    row = cursor.fetchone()
    avail_secs = int(row[0] or 0) if row else 0
    idle_secs = int(row[1] or 0) if row else 0
    prod_secs = int(row[2] or 0) if row else 0
    idle_pct = round((idle_secs * 100.0) / avail_secs, 2) if avail_secs > 0 else 0.0
    return {
        "total_machine_hours_available": _fmt_hms(avail_secs),
        "total_idle_hours": _fmt_hms(idle_secs),
        "total_productive_hours": _fmt_hms(prod_secs),
        "overall_idle_percent": idle_pct,
    }


def _fetch_idle_not_entered_count(cursor, start_date, end_date, machine, shift):
    if not table_exists(cursor, "shift") or not table_exists(cursor, "MacMaster"):
        return 0

    shift_clause_exp = ""
    shift_clause_rec = ""
    machine_clause_exp = ""
    machine_clause_rec = ""

    if shift:
        shift_clause_exp = "AND LTRIM(RTRIM(CAST([Shift] AS NVARCHAR(128)))) = ?"
        shift_clause_rec = "AND LTRIM(RTRIM(CAST(D.[Shift] AS NVARCHAR(128)))) = ?"
    if machine:
        if isinstance(machine, list):
            placeholders = ",".join(["?"] * len(machine))
            machine_clause_exp = f"AND LTRIM(RTRIM(CAST(macno AS NVARCHAR(512)))) IN ({placeholders})"
            machine_clause_rec = f"AND LTRIM(RTRIM(CAST(D.MacNo AS NVARCHAR(512)))) IN ({placeholders})"
        else:
            machine_clause_exp = "AND LTRIM(RTRIM(CAST(macno AS NVARCHAR(512)))) = ?"
            machine_clause_rec = "AND LTRIM(RTRIM(CAST(D.MacNo AS NVARCHAR(512)))) = ?"

    sql = f"""
    WITH Dates AS (
        SELECT CAST(? AS DATE) AS EntryDate
        UNION ALL
        SELECT DATEADD(DAY, 1, EntryDate) FROM Dates WHERE EntryDate < CAST(? AS DATE)
    ),
    RegularShifts AS (
        SELECT LTRIM(RTRIM(CAST([Shift] AS NVARCHAR(128)))) AS ShiftName
        FROM shift
        WHERE ISNULL(deleted, 0) = 0
          AND ISNULL(IsRegularShift, 0) = 1
          AND LTRIM(RTRIM(CAST([Shift] AS NVARCHAR(128)))) <> N''
          {shift_clause_exp}
    ),
    ActiveMachines AS (
        SELECT LTRIM(RTRIM(CAST(macno AS NVARCHAR(512)))) AS MacNo
        FROM MacMaster
        WHERE ISNULL(deleted, 0) = 0
          AND LTRIM(RTRIM(CAST(macno AS NVARCHAR(512)))) <> N''
          {machine_clause_exp}
    ),
    Expected AS (
        SELECT d.EntryDate, rs.ShiftName, am.MacNo
        FROM Dates d
        CROSS JOIN RegularShifts rs
        CROSS JOIN ActiveMachines am
    ),
    Recorded AS (
        SELECT DISTINCT
            CAST(M.proddate AS DATE) AS EntryDate,
            LTRIM(RTRIM(CAST(D.[Shift] AS NVARCHAR(128)))) AS ShiftName,
            LTRIM(RTRIM(CAST(D.MacNo AS NVARCHAR(512)))) AS MacNo
        FROM Machine_IdleEntryDet D
        INNER JOIN Machine_IdleEntryMas M ON D.prodid = M.prodid
        WHERE M.proddate BETWEEN ? AND ?
          AND M.deleted = 0
          AND D.deleted = 0
          {shift_clause_rec}
          {machine_clause_rec}
    )
    SELECT COUNT(*) FROM Expected e
    LEFT JOIN Recorded r
        ON e.EntryDate = r.EntryDate
       AND e.ShiftName = r.ShiftName
       AND e.MacNo = r.MacNo
    WHERE r.EntryDate IS NULL
    OPTION (MAXRECURSION 366)
    """
    params = [start_date, end_date]
    if shift:
        params.append(shift)
    if machine:
        if isinstance(machine, list):
            params.extend(machine)
        else:
            params.append(machine)
    params.extend([start_date, end_date])
    if shift:
        params.append(shift)
    if machine:
        if isinstance(machine, list):
            params.extend(machine)
        else:
            params.append(machine)

    cursor.execute(sql, params)
    row = cursor.fetchone()
    return int(row[0] or 0) if row else 0


def _fmt_date_short(entry_date):
    if hasattr(entry_date, "day") and hasattr(entry_date, "month"):
        return f"{int(entry_date.day)} {month_abbr[int(entry_date.month)]}"
    text = str(entry_date or "").strip()
    if len(text) >= 10:
        try:
            parts = text[:10].split("-")
            return f"{int(parts[2])} {month_abbr[int(parts[1])]}"
        except (ValueError, IndexError):
            pass
    return text


def _shift_label_for_ui(shift_name):
    name = (shift_name or "").strip()
    if not name:
        return "—"
    return _SHIFT_UI_LABELS.get(name, name)


def _build_slot_filter_clauses(machine, shift, mac_col="MacNo", shift_col="Shift"):
    clauses = []
    params = []
    if machine:
        if isinstance(machine, list):
            placeholders = ",".join(["?"] * len(machine))
            clauses.append(
                f"AND LTRIM(RTRIM(CAST({mac_col} AS NVARCHAR(512)))) IN ({placeholders})"
            )
            params.extend(machine)
        else:
            clauses.append(
                f"AND LTRIM(RTRIM(CAST({mac_col} AS NVARCHAR(512)))) = ?"
            )
            params.append(machine)
    if shift:
        clauses.append(
            f"AND LTRIM(RTRIM(CAST({shift_col} AS NVARCHAR(128)))) = ?"
        )
        params.append(shift)
    return "\n".join(clauses), params


def _fetch_idle_time_not_entered(cursor, start_date, end_date, machine, shift):
    """
    Per machine / shift / date: shift hours − (production run time + idle time)
    = balance (idle time not entered). Uses shift master, idle union, production union.
    """
    empty = {
        "rows": [],
        "summary": {"not_entered": 0, "partial_entry": 0, "completed": 0},
    }
    if not table_exists(cursor, "shift") or not table_exists(cursor, "MacMaster"):
        return empty

    gap_threshold = 60
    date_params = _union_date_params(start_date, end_date)
    prod_date_params = _productive_date_params(start_date, end_date)

    shift_clause_exp = ""
    shift_clause_rec = ""
    machine_clause_exp = ""
    machine_clause_rec = ""
    if shift:
        shift_clause_exp = "AND LTRIM(RTRIM(CAST([Shift] AS NVARCHAR(128)))) = ?"
        shift_clause_rec = "AND LTRIM(RTRIM(CAST(D.[Shift] AS NVARCHAR(128)))) = ?"
    if machine:
        if isinstance(machine, list):
            placeholders = ",".join(["?"] * len(machine))
            machine_clause_exp = f"AND LTRIM(RTRIM(CAST(macno AS NVARCHAR(512)))) IN ({placeholders})"
            machine_clause_rec = f"AND LTRIM(RTRIM(CAST(D.MacNo AS NVARCHAR(512)))) IN ({placeholders})"
        else:
            machine_clause_exp = "AND LTRIM(RTRIM(CAST(macno AS NVARCHAR(512)))) = ?"
            machine_clause_rec = "AND LTRIM(RTRIM(CAST(D.MacNo AS NVARCHAR(512)))) = ?"

    idle_slot_sql, idle_slot_params = _build_slot_filter_clauses(
        machine, shift, mac_col="A.MacNo", shift_col="A.Shift",
    )
    prod_slot_sql, prod_slot_params = _build_slot_filter_clauses(
        machine, shift, mac_col="P.macno", shift_col="P.shift",
    )
    opr_slot_sql, opr_slot_params = _build_slot_filter_clauses(
        machine, shift, mac_col="macno", shift_col="shift",
    )

    sql = f"""
    WITH SHIFT_HOURS AS (
        {_SHIFT_HOURS_CTE}
    ),
    Dates AS (
        SELECT CAST(? AS DATE) AS EntryDate
        UNION ALL
        SELECT DATEADD(DAY, 1, EntryDate) FROM Dates WHERE EntryDate < CAST(? AS DATE)
    ),
    RegularShifts AS (
        SELECT LTRIM(RTRIM(CAST([Shift] AS NVARCHAR(128)))) AS ShiftName
        FROM shift
        WHERE ISNULL(deleted, 0) = 0
          AND ISNULL(IsRegularShift, 0) = 1
          AND LTRIM(RTRIM(CAST([Shift] AS NVARCHAR(128)))) <> N''
          {shift_clause_exp}
    ),
    ActiveMachines AS (
        SELECT LTRIM(RTRIM(CAST(macno AS NVARCHAR(512)))) AS MacNo
        FROM MacMaster
        WHERE ISNULL(deleted, 0) = 0
          AND LTRIM(RTRIM(CAST(macno AS NVARCHAR(512)))) <> N''
          {machine_clause_exp}
    ),
    Expected AS (
        SELECT d.EntryDate, rs.ShiftName, am.MacNo
        FROM Dates d
        CROSS JOIN RegularShifts rs
        CROSS JOIN ActiveMachines am
    ),
    IDLE_DATA AS (
        SELECT
            CAST(A.EntryDate AS DATE) AS EntryDate,
            LTRIM(RTRIM(CAST(A.Shift AS NVARCHAR(128)))) AS ShiftName,
            LTRIM(RTRIM(CAST(A.MacNo AS NVARCHAR(512)))) AS MacNo,
            SUM(A.IdleSeconds) AS TotalIdleSeconds
        FROM (
            {_IDLE_UNION_SQL}
        ) A
        WHERE 1 = 1
        {idle_slot_sql}
        GROUP BY
            CAST(A.EntryDate AS DATE),
            LTRIM(RTRIM(CAST(A.Shift AS NVARCHAR(128)))),
            LTRIM(RTRIM(CAST(A.MacNo AS NVARCHAR(512))))
    ),
    PRODUCTIVE_DATA AS (
        SELECT
            CAST(P.EntryDate AS DATE) AS EntryDate,
            LTRIM(RTRIM(CAST(P.shift AS NVARCHAR(128)))) AS ShiftName,
            LTRIM(RTRIM(CAST(P.macno AS NVARCHAR(512)))) AS MacNo,
            SUM(P.ProductiveSeconds) AS TotalProductiveSeconds
        FROM (
            {_PRODUCTIVE_UNION_SQL}
        ) P
        WHERE 1 = 1
        {prod_slot_sql}
        GROUP BY
            CAST(P.EntryDate AS DATE),
            LTRIM(RTRIM(CAST(P.shift AS NVARCHAR(128)))),
            LTRIM(RTRIM(CAST(P.macno AS NVARCHAR(512))))
    ),
    OPERATOR_DATA AS (
        SELECT
            CAST(proddate AS DATE) AS EntryDate,
            LTRIM(RTRIM(CAST(shift AS NVARCHAR(128)))) AS ShiftName,
            LTRIM(RTRIM(CAST(macno AS NVARCHAR(512)))) AS MacNo,
            MAX(NULLIF(LTRIM(RTRIM(CAST(oprname AS NVARCHAR(256)))), N'')) AS OperatorName
        FROM ProductionEntry
        WHERE proddate BETWEEN ? AND ?
          AND deleted = 0
          {opr_slot_sql}
        GROUP BY
            CAST(proddate AS DATE),
            LTRIM(RTRIM(CAST(shift AS NVARCHAR(128)))),
            LTRIM(RTRIM(CAST(macno AS NVARCHAR(512))))
    ),
    MACHINE_IDLE_RECORDED AS (
        SELECT DISTINCT
            CAST(M.proddate AS DATE) AS EntryDate,
            LTRIM(RTRIM(CAST(D.[Shift] AS NVARCHAR(128)))) AS ShiftName,
            LTRIM(RTRIM(CAST(D.MacNo AS NVARCHAR(512)))) AS MacNo
        FROM Machine_IdleEntryDet D
        INNER JOIN Machine_IdleEntryMas M ON D.prodid = M.prodid
        WHERE M.proddate BETWEEN ? AND ?
          AND M.deleted = 0
          AND D.deleted = 0
          {shift_clause_rec}
          {machine_clause_rec}
    ),
    SLOTS AS (
        SELECT
            e.EntryDate,
            e.ShiftName,
            e.MacNo,
            ISNULL(S.ShiftSeconds, 0) AS ShiftSeconds,
            ISNULL(I.TotalIdleSeconds, 0) AS IdleSeconds,
            ISNULL(P.TotalProductiveSeconds, 0) AS ProductiveSeconds,
            CASE
                WHEN R.EntryDate IS NOT NULL THEN 1
                ELSE 0
            END AS HasMachineIdleEntry,
            O.OperatorName
        FROM Expected e
        LEFT JOIN IDLE_DATA I
            ON e.EntryDate = I.EntryDate
           AND e.ShiftName = I.ShiftName
           AND e.MacNo = I.MacNo
        LEFT JOIN PRODUCTIVE_DATA P
            ON e.EntryDate = P.EntryDate
           AND e.ShiftName = P.ShiftName
           AND e.MacNo = P.MacNo
        LEFT JOIN SHIFT_HOURS S
            ON e.ShiftName = S.Shift
        LEFT JOIN OPERATOR_DATA O
            ON e.EntryDate = O.EntryDate
           AND e.ShiftName = O.ShiftName
           AND e.MacNo = O.MacNo
        LEFT JOIN MACHINE_IDLE_RECORDED R
            ON e.EntryDate = R.EntryDate
           AND e.ShiftName = R.ShiftName
           AND e.MacNo = R.MacNo
    )
    SELECT
        EntryDate,
        ShiftName,
        MacNo,
        ShiftSeconds,
        IdleSeconds,
        ProductiveSeconds,
        ShiftSeconds - IdleSeconds - ProductiveSeconds AS NotEnteredSeconds,
        HasMachineIdleEntry,
        OperatorName
    FROM SLOTS
    OPTION (MAXRECURSION 366)
    """

    params = [start_date, end_date]
    if shift:
        params.append(shift)
    if machine:
        if isinstance(machine, list):
            params.extend(machine)
        else:
            params.append(machine)
    params.extend(date_params)
    params.extend(idle_slot_params)
    params.extend(prod_date_params)
    params.extend(prod_slot_params)
    params.extend([start_date, end_date])
    params.extend(opr_slot_params)
    params.extend([start_date, end_date])
    if shift:
        params.append(shift)
    if machine:
        if isinstance(machine, list):
            params.extend(machine)
        else:
            params.append(machine)

    cursor.execute(sql, params)

    rows_out = []
    not_entered = 0
    partial_entry = 0
    completed = 0

    for row in cursor.fetchall() or []:
        entry_date, shift_name, mac_no, shift_secs, idle_secs, prod_secs, gap_secs, has_entry, operator = row
        shift_secs = int(shift_secs or 0)
        idle_secs = int(idle_secs or 0)
        prod_secs = int(prod_secs or 0)
        gap_secs = int(gap_secs or 0)
        has_entry = int(has_entry or 0)

        if gap_secs <= gap_threshold:
            completed += 1
            continue

        if has_entry:
            partial_entry += 1
        else:
            not_entered += 1

        mac_label = (str(mac_no).strip() if mac_no else "") or "—"
        opr = (str(operator).strip() if operator else "") or "Pending"
        rows_out.append({
            "machine": mac_label,
            "shift": _shift_label_for_ui(shift_name),
            "date": _fmt_date_short(entry_date),
            "operator": opr,
            "not_entered_hours": _fmt_hm(gap_secs),
            "not_entered_seconds": gap_secs,
            "shift_seconds": shift_secs,
            "idle_seconds": idle_secs,
            "productive_seconds": prod_secs,
        })

    rows_out.sort(key=lambda r: (-r["not_entered_seconds"], r["machine"], r["date"]))

    return {
        "rows": rows_out,
        "summary": {
            "not_entered": not_entered,
            "partial_entry": partial_entry,
            "completed": completed,
        },
    }


def _detail_row_level(pct):
    if pct > 5:
        return "high"
    if pct > 2:
        return "medium"
    if pct > 0:
        return "low"
    return None


def _fetch_reason_machine_detail(cursor, date_params, outer_sql, outer_params):
    """
    Pivot: idle reasons (rows) × machines (columns), cell values = idle hours (H:MM).
    Uses filtered idle union for the report date range and filters.
    """
    empty = {"column_headers": [], "rows": [], "footer": {"cols": [], "total": "0:00:00", "pct": "0"}}
    base = _filtered_cte_sql(outer_sql)
    cursor.execute(
        base
        + """
        SELECT
            LTRIM(RTRIM(CAST(Reason AS NVARCHAR(512)))) AS Reason,
            LTRIM(RTRIM(CAST(MacNo AS NVARCHAR(512)))) AS MacNo,
            SUM(IdleSeconds) AS IdleSeconds
        FROM FilteredIdle
        WHERE LTRIM(RTRIM(CAST(MacNo AS NVARCHAR(512)))) <> N''
          AND LTRIM(RTRIM(CAST(Reason AS NVARCHAR(512)))) <> N''
        GROUP BY
            LTRIM(RTRIM(CAST(Reason AS NVARCHAR(512)))),
            LTRIM(RTRIM(CAST(MacNo AS NVARCHAR(512))))
        """,
        date_params + outer_params,
    )

    pivot = defaultdict(lambda: defaultdict(int))
    machine_totals = defaultdict(int)
    reason_totals = defaultdict(int)

    for row in cursor.fetchall() or []:
        reason = (str(row[0]).strip() if row[0] else "") or "—"
        mac = (str(row[1]).strip() if row[1] else "") or "—"
        secs = int(row[2] or 0)
        if not reason or not mac or secs <= 0:
            continue
        pivot[reason][mac] += secs
        machine_totals[mac] += secs
        reason_totals[reason] += secs

    if not reason_totals:
        return empty

    grand_total = sum(reason_totals.values())
    column_headers = sorted(
        machine_totals.keys(),
        key=lambda m: (-machine_totals[m], m.lower()),
    )

    rows_out = []
    for reason in sorted(reason_totals.keys(), key=lambda r: (-reason_totals[r], r.lower())):
        reason_secs = reason_totals[reason]
        pct = round((reason_secs * 100.0) / grand_total, 2) if grand_total > 0 else 0.0
        cols = [
            _fmt_hm(pivot[reason].get(mac, 0)) if pivot[reason].get(mac, 0) else "0:00"
            for mac in column_headers
        ]
        rows_out.append({
            "reason": reason,
            "cols": cols,
            "total": _fmt_hm(reason_secs),
            "pct": f"{pct:.2f}",
            "lvl": _detail_row_level(pct),
        })

    footer_cols = [_fmt_hm(machine_totals[mac]) for mac in column_headers]
    return {
        "column_headers": column_headers,
        "rows": rows_out,
        "footer": {
            "cols": footer_cols,
            "total": _fmt_hms(grand_total),
            "pct": "100",
        },
    }


@api_view(["GET"])
def idle_time_report(request):
    """
    Report filters: ?from=&to=&machine=&shift=&reason=
    Returns filter dropdown options (scoped to date range) and aggregated rows.
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    machine = _parse_machine(request.GET.get("machine", ""))
    shift_parsed = _parse_shift(request.GET.get("shift", ""))
    reason = _parse_reason(request.GET.get("reason", ""))

    date_params = _union_date_params(start_date, end_date)

    cursor = None
    try:
        cursor = conn.cursor()
        shift = _resolve_shift_db_name(cursor, shift_parsed) if shift_parsed else None
        outer_sql, outer_params = _build_outer_filters(machine, shift, reason)

        cursor.execute(_FILTER_OPTIONS_SQL, date_params)
        opt_rows = cursor.fetchall() or []
        mac_set, shift_set, reason_set = [], [], []
        for mac, sh, rs in opt_rows:
            if mac is not None:
                mac_set.append(mac)
            if sh is not None:
                shift_set.append(sh)
            if rs is not None:
                reason_set.append(rs)

        mac_join = ""
        rate_select = "CAST(0 AS FLOAT) AS RatePerHr"
        if table_exists(cursor, "MacMaster"):
            mac_join = """
            LEFT JOIN MacMaster MM
                ON LTRIM(RTRIM(CAST(A.MacNo AS NVARCHAR(512))))
                 = LTRIM(RTRIM(CAST(MM.macno AS NVARCHAR(512))))
                AND ISNULL(MM.deleted, 0) = 0
            """
            rate_select = "ISNULL(MAX(MM.RatePerHr), 0) AS RatePerHr"

        report_sql_template = f"""
        SELECT
            A.EntryDate,
            A.Shift,
            A.MacNo,
            A.Reason,
            CONVERT(VARCHAR(8), DATEADD(SECOND, SUM(A.IdleSeconds), 0), 108) AS TotalIdleHours,
            CAST(SUM(A.IdleSeconds) / 3600.0 AS DECIMAL(18, 2)) AS TotalIdleHours_Decimal,
            {rate_select},
            ISNULL(MAX(CAST(IR.IsAccept AS INT)), 1) AS IsAccepted
        FROM (
            {_IDLE_UNION_SQL}
        ) A
        {mac_join}
        LEFT JOIN IdleReasons IR
            ON LTRIM(RTRIM(A.Reason)) = LTRIM(RTRIM(IR.IdleReasons))
            AND ISNULL(IR.deleted, 0) = 0
        WHERE 1 = 1
        {{outer_filters}}
        GROUP BY
            A.EntryDate,
            A.Shift,
            A.MacNo,
            A.Reason
        ORDER BY
            A.EntryDate,
            A.Shift,
            A.MacNo,
            A.Reason
        """
        report_sql = report_sql_template.format(outer_filters=outer_sql)
        report_params = date_params + outer_params
        cursor.execute(report_sql, report_params)
        raw_rows = cursor.fetchall() or []
        data_rows = []
        for r in raw_rows:
            d = _row_to_dict(r)
            d["date"] = d["entry_date"][:10] if d.get("entry_date") else ""
            d["machine"] = d["mac_no"]
            data_rows.append(d)

        from .views_plantperformance import _pv_enrich_operator_team
        _pv_enrich_operator_team(cursor, data_rows, start_date, end_date)

        kpis = _compute_kpis(
            cursor, start_date, end_date, date_params, outer_sql, outer_params,
            data_rows, machine, shift,
        )
        top_idle_reasons = _fetch_top_idle_reasons(
            cursor, date_params, outer_sql, outer_params, limit=10,
        )
        accepted_idle = _fetch_accepted_vs_non_accepted(
            cursor, date_params, outer_sql, outer_params,
        )
        monthwise = _fetch_monthwise_idle_cost(
            cursor, date_params, outer_sql, outer_params,
        )
        top_machines = _fetch_top_machines_idle_cost(
            cursor, date_params, outer_sql, outer_params, kpis=kpis, limit=15,
        )
        daywise = _fetch_daywise_idle_hours(
            start_date, end_date, cursor, date_params, outer_sql, outer_params,
        )
        utilization_totals = {
            "total_machine_hours_available": "0:00:00",
            "total_idle_hours": "0:00:00",
            "total_productive_hours": "0:00:00",
            "overall_idle_percent": 0.0,
        }
        shift_wise_idle = {"labels": [], "datasets": [], "tiles": []}
        idle_pct_ranking = {"labels": [], "data": []}
        
        try:
            utilization_totals = _fetch_utilization_totals(
                cursor, start_date, end_date, machine, shift,
            )
        except Exception:
            pass
        try:
            shift_wise_idle = _fetch_shift_wise_idle(
                cursor, date_params, outer_sql, outer_params,
            )
        except Exception:
            pass
        try:
            idle_pct_ranking = _fetch_idle_pct_ranking(
                cursor, date_params, start_date, end_date, outer_sql, outer_params,
                machine=machine, shift=shift, limit=10,
            )
        except Exception:
            pass

        continuous_idle_reasons = _fetch_continuous_idle_reasons(
            cursor, date_params, outer_sql, outer_params,
        )
        idle_time_not_entered = _fetch_idle_time_not_entered(
            cursor, start_date, end_date, machine, shift,
        )
        reason_machine_detail = _fetch_reason_machine_detail(
            cursor, date_params, outer_sql, outer_params,
        )

        operators_list = sorted(list({r.get("operator") for r in data_rows if r.get("operator") and r.get("operator") != "—"}))

        cursor.close()
        conn.close()
    except Exception as e:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        try:
            conn.close()
        except Exception:
            pass
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "company": tenant.get("company_name", ""),
        "from": str(start_date),
        "to": str(end_date),
        "filters": {
            "machine": machine or "All Machines",
            "shift": request.GET.get("shift", "").strip() or "All Shifts",
            "reason": reason or "All Reasons",
        },
        "filter_options": {
            "machines": _machine_options(mac_set),
            "shifts": _shift_options(shift_set),
            "reasons": _reason_options(reason_set),
            "operators": operators_list,
        },
        "row_count": len(data_rows),
        "rows": data_rows,
        "kpis": kpis,
        "top_idle_reasons": top_idle_reasons,
        "accepted_idle": accepted_idle,
        "monthwise": monthwise,
        "top_machines": top_machines,
        "daywise": daywise,
        "utilization_totals": utilization_totals,
        "shift_wise_idle": shift_wise_idle,
        "idle_pct_ranking": idle_pct_ranking,
        "continuous_idle_reasons": continuous_idle_reasons,
        "idle_time_not_entered": idle_time_not_entered,
        "reason_machine_detail": reason_machine_detail,
    })