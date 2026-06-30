# ════════════════════════════════════════════
#  views_efficiency_report.py
#  MIS — Efficiency Report (operator / machine tables)
#  Same ProductionEntry + Conv* union as chart overall-efficiency logic
# ════════════════════════════════════════════

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .views import (
    get_tenant_connection,
    parse_date_range,
    resolve_erp_table,
    find_column_ci,
    month_key_from_db,
    _sql_deleted_safe,
)


def _parse_bool_param(value, default=True):
    if value is None or value == "":
        return default
    return str(value).strip().lower() in ("1", "true", "yes", "on")


def _opr_expr(opr_col):
    if opr_col:
        return f"LTRIM(RTRIM(CAST(ISNULL([{opr_col}], N'') AS NVARCHAR(512))))"
    return "N''"


def _mac_expr(mac_col):
    return f"LTRIM(RTRIM(CAST([{mac_col}] AS NVARCHAR(128))))"


def _idle_hours_expr(idle_col, acc_col, nonacc_col):
    if idle_col:
        return (
            f"CAST(DATEDIFF(SECOND, '1900-01-01 00:00:00', [{idle_col}]) "
            f"/ 3600.0 AS FLOAT)"
        )
    if acc_col or nonacc_col:
        acc = f"ISNULL(CAST([{acc_col}] AS FLOAT), 0)" if acc_col else "0"
        nonacc = f"ISNULL(CAST([{nonacc_col}] AS FLOAT), 0)" if nonacc_col else "0"
        return f"CAST(({acc} + {nonacc}) / 3600.0 AS FLOAT)"
    return "CAST(0 AS FLOAT)"


def _build_union_branches(
    cursor, start_date, end_date, include_cnc, include_conv, include_prod_date=False
):
    """
    UNION ALL rows from ProductionEntry (CNC) + Conv* (Conventional).
    Uses the same core columns as chart overall-efficiency / operator-efficiency.
    When include_prod_date=True, each branch also selects ProdDate and MacType.
    """
    opr_cands = [
        "oprname", "OprName", "OPRNAME", "opr_name", "OpName",
        "OperatorName", "Operator", "operator", "EmpName",
    ]
    mac_cands = ["macno", "MacNo", "MACNO", "machine_no", "MachineNo"]
    oaeff_cands = ["OAEFF", "oaeff", "OAEff", "OA_EFF"]
    opreff_prod = ["OPREFF", "opreff"]
    opreff_conv = ["eff", "Eff", "EFF"]
    del_cands = ["deleted", "Deleted", "IsDeleted"]
    entry_dates = ["entrydate", "entry_date", "EntryDate"]
    prod_dates = ["proddate", "prod_date", "Proddate", "ProductionDate"]
    idle_cands = ["IdleTime", "idlTime", "idletime"]
    acc_idle = ["accidletimesecs", "AccIdleTimeSecs"]
    nonacc_idle = ["nonaccidletimesecs", "NonAccIdleTimeSecs"]

    layouts = []
    if include_cnc:
        layouts.append(
            (["ProductionEntry", "productionentry", "PRODUCTIONENTRY"], "prod", opreff_prod)
        )
    if include_conv:
        layouts.extend([
            (["ConvProductionEntry", "convproductionentry"], "entry", opreff_conv),
            (["ConvProductionEntryRod", "convproductionentryrod", "CONVPRODUCTIONENTRYROD"], "entry", opreff_conv),
        ])

    branches, params = [], []
    for logicals, kind, opreff_cands in layouts:
        sch, tn, qt = resolve_erp_table(cursor, logicals)
        if not qt:
            continue
        date_cands = prod_dates if kind == "prod" else entry_dates
        d_col = find_column_ci(cursor, sch, tn, date_cands)
        mac_col = find_column_ci(cursor, sch, tn, mac_cands)
        oaeff_col = find_column_ci(cursor, sch, tn, oaeff_cands)
        opreff_col = find_column_ci(cursor, sch, tn, opreff_cands)
        opr_col = find_column_ci(cursor, sch, tn, opr_cands)
        if not (d_col and mac_col and (oaeff_col or opreff_col)):
            continue

        del_col = find_column_ci(cursor, sch, tn, del_cands)
        idle_col = find_column_ci(cursor, sch, tn, idle_cands)
        acc_col = find_column_ci(cursor, sch, tn, acc_idle)
        nonacc_col = find_column_ci(cursor, sch, tn, nonacc_idle)

        oaeff_sql = f"CAST([{oaeff_col}] AS FLOAT)" if oaeff_col else "CAST(NULL AS FLOAT)"
        opreff_sql = f"CAST([{opreff_col}] AS FLOAT)" if opreff_col else "CAST(NULL AS FLOAT)"
        if oaeff_col and opreff_col:
            null_filter = f"([{oaeff_col}] IS NOT NULL OR [{opreff_col}] IS NOT NULL)"
        elif oaeff_col:
            null_filter = f"[{oaeff_col}] IS NOT NULL"
        else:
            null_filter = f"[{opreff_col}] IS NOT NULL"

        date_cols = ""
        if include_prod_date:
            mac_type = "N'CNC'" if kind == "prod" else "N'Conventional'"
            date_cols = f"CAST([{d_col}] AS DATE) AS ProdDate, {mac_type} AS MacType, "

        branches.append(
            f"SELECT {_opr_expr(opr_col)} AS Operator, {_mac_expr(mac_col)} AS MacNo, "
            f"{date_cols}"
            f"{oaeff_sql} AS OAEFF, {opreff_sql} AS OPREFF, "
            f"{_idle_hours_expr(idle_col, acc_col, nonacc_col)} AS IdleHrs "
            f"FROM {qt} WHERE {_sql_deleted_safe(del_col)} "
            f"AND CAST([{d_col}] AS DATE) BETWEEN ? AND ? AND {null_filter}"
        )
        params.extend([start_date, end_date])

    return branches, params


def _resolve_department_join(cursor):
    """
    oprname → empmaster.empname → deptcode → DepartmentMast.Department
    Returns join config for wrapping the production union, or None if tables missing.
    """
    sch_e, tn_e, qt_e = resolve_erp_table(cursor, ["empmaster", "EmpMaster", "EMPMASTER"])
    sch_d, tn_d, qt_d = resolve_erp_table(
        cursor, ["DepartmentMast", "departmentmast", "DEPARTMENTMAST"]
    )
    if not (qt_e and qt_d):
        return None

    empname = find_column_ci(cursor, sch_e, tn_e, ["empname", "EmpName", "EMPNAME"])
    deptcode_e = find_column_ci(cursor, sch_e, tn_e, ["deptcode", "DeptCode", "DEPTCODE"])
    department = find_column_ci(cursor, sch_d, tn_d, ["Department", "department", "DEPARTMENT"])
    deptcode_d = find_column_ci(cursor, sch_d, tn_d, ["DeptCode", "deptcode", "DEPTCODE"])
    if not (empname and deptcode_e and department and deptcode_d):
        return None

    del_e = find_column_ci(cursor, sch_e, tn_e, ["deleted", "Deleted", "IsDeleted"])
    del_d = find_column_ci(cursor, sch_d, tn_d, ["Deleted", "deleted", "IsDeleted"])
    emp_del = _sql_deleted_safe(del_e).replace("[", "E.[")
    dept_del = _sql_deleted_safe(del_d).replace("[", "DM.[")

    dept_expr = (
        f"LTRIM(RTRIM(CAST(ISNULL(DM.[{department}], N'') AS NVARCHAR(256))))"
    )
    joins = f"""
        LEFT JOIN {qt_e} AS E
          ON LTRIM(RTRIM(CAST(E.[{empname}] AS NVARCHAR(512)))) = LTRIM(RTRIM(AR.Operator))
          AND {emp_del}
        LEFT JOIN {qt_d} AS DM
          ON E.[{deptcode_e}] = DM.[{deptcode_d}]
          AND {dept_del}
    """
    return {"dept_expr": dept_expr, "joins": joins}


def _legacy_department_join():
    """Fallback join using standard Anims ERP table/column names."""
    return {
        "dept_expr": "LTRIM(RTRIM(CAST(ISNULL(DM.Department, N'') AS NVARCHAR(256))))",
        "joins": """
        LEFT JOIN empmaster AS E
          ON LTRIM(RTRIM(CAST(E.empname AS NVARCHAR(512)))) = LTRIM(RTRIM(AR.Operator))
          AND ISNULL(CAST(E.deleted AS INT), 0) = 0
        LEFT JOIN DepartmentMast AS DM
          ON E.deptcode = DM.DeptCode
          AND ISNULL(CAST(DM.Deleted AS INT), 0) = 0
        """,
    }


def _legacy_union_branches(include_cnc, include_conv, include_prod_date=False):
    """Fallback SQL — columns aligned with working chart endpoints."""
    date_cols_cnc = (
        "CAST(proddate AS DATE) AS ProdDate, N'CNC' AS MacType, "
        if include_prod_date
        else ""
    )
    date_cols_conv = (
        "CAST(entrydate AS DATE) AS ProdDate, N'Conventional' AS MacType, "
        if include_prod_date
        else ""
    )
    branches = []
    if include_cnc:
        branches.append(f"""
            SELECT
                LTRIM(RTRIM(CAST(ISNULL(oprname, N'') AS NVARCHAR(512)))) AS Operator,
                LTRIM(RTRIM(CAST(macno AS NVARCHAR(128)))) AS MacNo,
                {date_cols_cnc}
                CAST(OAEFF AS FLOAT) AS OAEFF,
                CAST(OPREFF AS FLOAT) AS OPREFF,
                CAST((ISNULL(accidletimesecs, 0) + ISNULL(nonaccidletimesecs, 0)) / 3600.0 AS FLOAT) AS IdleHrs
            FROM ProductionEntry
            WHERE CAST(proddate AS DATE) BETWEEN ? AND ?
              AND deleted = 0
              AND (OAEFF IS NOT NULL OR OPREFF IS NOT NULL)
        """)
    if include_conv:
        for tbl in ("ConvProductionEntry", "ConvProductionEntryRod"):
            branches.append(f"""
                SELECT
                    LTRIM(RTRIM(CAST(ISNULL(oprname, N'') AS NVARCHAR(512)))) AS Operator,
                    LTRIM(RTRIM(CAST(macno AS NVARCHAR(128)))) AS MacNo,
                    {date_cols_conv}
                    CAST(OAEFF AS FLOAT) AS OAEFF,
                    CAST(ISNULL(eff, 0) AS FLOAT) AS OPREFF,
                    CAST(DATEDIFF(SECOND, '1900-01-01 00:00:00', IdleTime) / 3600.0 AS FLOAT) AS IdleHrs
                FROM {tbl}
                WHERE CAST(entrydate AS DATE) BETWEEN ? AND ?
                  AND deleted = 0
                  AND (OAEFF IS NOT NULL OR eff IS NOT NULL)
            """)
    return branches


def _detail_with_department_sql(union_sql, dept_join):
    """Attach department per oprname via empmaster → DepartmentMast."""
    if dept_join:
        return f"""
            SELECT
                AR.Operator,
                {dept_join['dept_expr']} AS Dept,
                AR.MacNo,
                AR.OAEFF,
                AR.OPREFF,
                AR.IdleHrs
            FROM ({union_sql}) AS AR
            {dept_join['joins']}
        """
    return f"""
        SELECT
            AR.Operator,
            CAST(N'' AS NVARCHAR(256)) AS Dept,
            AR.MacNo,
            AR.OAEFF,
            AR.OPREFF,
            AR.IdleHrs
        FROM ({union_sql}) AS AR
    """


def _detail_with_department_dated_sql(union_sql, dept_join):
    """Department join + ProdDate/MacType — Plant Performance EFF detail rows."""
    if dept_join:
        return f"""
            SELECT
                AR.Operator,
                {dept_join['dept_expr']} AS Dept,
                AR.MacNo,
                AR.ProdDate,
                AR.OAEFF,
                AR.OPREFF,
                LTRIM(RTRIM(ISNULL(AR.MacType, N''))) AS MacType
            FROM ({union_sql}) AS AR
            {dept_join['joins']}
        """
    return f"""
        SELECT
            AR.Operator,
            CAST(N'' AS NVARCHAR(256)) AS Dept,
            AR.MacNo,
            AR.ProdDate,
            AR.OAEFF,
            AR.OPREFF,
            LTRIM(RTRIM(ISNULL(AR.MacType, N'CNC'))) AS MacType
        FROM ({union_sql}) AS AR
    """


def _aggregate_sql(union_sql, group_by_machine, dept_join=None):
    detail_sql = _detail_with_department_sql(union_sql, dept_join)
    if group_by_machine:
        return f"""
            SELECT
                N'' AS Operator,
                LTRIM(RTRIM(ISNULL(MAX(Dept), N''))) AS Dept,
                MacNo,
                ROUND(AVG(COALESCE(OAEFF, 0)), 2) AS AvgOAEFF,
                ROUND(AVG(COALESCE(OPREFF, 0)), 2) AS AvgOPREFF,
                CAST(100 AS FLOAT) AS AvgQFEFF,
                ROUND(SUM(IdleHrs), 2) AS IdleHrs,
                CAST(0 AS FLOAT) AS RejPct
            FROM ({detail_sql}) AS AllRows
            WHERE MacNo IS NOT NULL AND LTRIM(RTRIM(MacNo)) <> N''
            GROUP BY MacNo
            ORDER BY AVG(COALESCE(OAEFF, OPREFF, 0)) DESC, MacNo ASC
        """
    return f"""
        SELECT
            Operator,
            LTRIM(RTRIM(ISNULL(MAX(Dept), N''))) AS Dept,
            MacNo,
            ROUND(AVG(COALESCE(OAEFF, 0)), 2) AS AvgOAEFF,
            ROUND(AVG(COALESCE(OPREFF, 0)), 2) AS AvgOPREFF,
            CAST(100 AS FLOAT) AS AvgQFEFF,
            ROUND(SUM(IdleHrs), 2) AS IdleHrs,
            CAST(0 AS FLOAT) AS RejPct
        FROM ({detail_sql}) AS AllRows
        WHERE MacNo IS NOT NULL AND LTRIM(RTRIM(MacNo)) <> N''
          AND Operator IS NOT NULL AND LTRIM(RTRIM(Operator)) <> N''
        GROUP BY Operator, MacNo
        ORDER BY AVG(COALESCE(OAEFF, OPREFF, 0)) DESC, Operator ASC, MacNo ASC
    """


def _fetch_efficiency_rows(cursor, start_date, end_date, include_cnc, include_conv, group_by_machine=False):
    dept_join = _resolve_department_join(cursor) or _legacy_department_join()
    branches, params = _build_union_branches(cursor, start_date, end_date, include_cnc, include_conv)

    if not branches:
        branches = _legacy_union_branches(include_cnc, include_conv)
        params = []
        for _ in branches:
            params.extend([start_date, end_date])

    if not branches:
        return []

    union_sql = " UNION ALL ".join(branches)
    agg_sql = _aggregate_sql(union_sql, group_by_machine, dept_join)

    try:
        cursor.execute(agg_sql, params)
        return cursor.fetchall() or []
    except Exception:
        # Retry with legacy production union + department join
        branches = _legacy_union_branches(include_cnc, include_conv)
        if not branches:
            return []
        params = []
        for _ in branches:
            params.extend([start_date, end_date])
        union_sql = " UNION ALL ".join(branches)
        agg_sql = _aggregate_sql(
            union_sql, group_by_machine, _legacy_department_join()
        )
        cursor.execute(agg_sql, params)
        return cursor.fetchall() or []


def _rows_to_table_arrays(rows, group_by_machine=False):
    """Map SQL aggregates to EfficiencyReport.jsx row shape: [op, dept, mac, oaeff, opreff, qfeff, idle, rej, rank]."""
    out = []
    for rank, row in enumerate(rows, start=1):
        operator, dept, mac, oaeff, opreff, qfeff, idle, rej = row
        record = [
            "" if group_by_machine else str(operator or "").strip(),
            str(dept or "").strip(),
            str(mac or "").strip(),
            round(float(oaeff or 0), 2),
            round(float(opreff or 0), 2),
            round(float(qfeff or 0), 2),
            round(float(idle or 0), 2),
            round(float(rej or 0), 2),
            rank,
        ]
        out.append(record)
    return out


def _overall_efficiency_monthwise(cursor, start_date, end_date):
    """Same logic as charts operations/overall-efficiency/."""
    sql = """
        SELECT MONTH(dt) AS MonthNum, AVG(CAST(OAEFF AS FLOAT)) AS Avg_OAEFF
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
        GROUP BY MONTH(dt)
        ORDER BY MONTH(dt)
    """
    params = [start_date, end_date, start_date, end_date, start_date, end_date]
    cursor.execute(sql, params)
    rows = cursor.fetchall() or []
    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    labels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
    eff_map = {m: 0.0 for m in month_order}
    for month_num, avg_eff in rows:
        mk = month_key_from_db(month_num)
        if mk in eff_map:
            eff_map[mk] = round(float(avg_eff or 0), 2)
    return {"labels": labels, "data": [eff_map[m] for m in month_order]}


_MONTH_ABB_EFF = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


def _efficiency_data_cte_branches(include_cnc=True, include_conv=True):
    """
    EFFICIENCY (OAEFF) combined union — ProductionEntry + ConvProductionEntry + ConvProductionEntryRod.
    Matches the canonical dashboard SQL (deleted=0; date filter applied in outer query).
    """
    branches = []
    if include_cnc:
        branches.append("""
            SELECT
                N'ProductionEntry'                  AS SourceTable,
                CAST(proddate AS DATE)              AS EntryDate,
                shift,
                macno,
                oprname,
                prgno                             AS ProgramNo,
                CAST(NULL AS NVARCHAR(128))       AS PartNo,
                CAST(NULL AS NVARCHAR(128))       AS Process,
                runfrom                           AS StartTime,
                runto                             AS EndTime,
                setfrom,
                setto,
                shifttimesecs,
                runtimesecs,
                settimesecs,
                accidletimesecs,
                nonaccidletimesecs,
                cycletimesecs,
                okqty                             AS ProductionQty,
                rejqty                            AS RejectionQty,
                rwqty                             AS ReworkQty,
                OAEFF,
                OPREFF,
                QFNEW,
                OEENEW,
                deleted
            FROM ProductionEntry
            WHERE deleted = 0
        """)
    if include_conv:
        branches.append("""
            SELECT
                N'ConvProductionEntry'              AS SourceTable,
                CAST(entrydate AS DATE)             AS EntryDate,
                shift,
                macno,
                oprname,
                CAST(NULL AS NVARCHAR(128))         AS ProgramNo,
                partno                              AS PartNo,
                process                             AS Process,
                starttime                           AS StartTime,
                endtime                             AS EndTime,
                setfrom,
                setto,
                shifttimesecs,
                runtimesecs,
                settimesecs,
                CAST(NULL AS FLOAT)                 AS accidletimesecs,
                CAST(NULL AS FLOAT)                 AS nonaccidletimesecs,
                CAST(NULL AS FLOAT)                 AS cycletimesecs,
                qty                                 AS ProductionQty,
                CAST(0 AS FLOAT)                    AS RejectionQty,
                Rework                              AS ReworkQty,
                OAEFF,
                eff                                 AS OPREFF,
                QFNEW,
                OEENEW,
                deleted
            FROM ConvProductionEntry
            WHERE deleted = 0
        """)
        branches.append("""
            SELECT
                N'ConvProductionEntryRod'           AS SourceTable,
                CAST(entrydate AS DATE)             AS EntryDate,
                shift,
                macno,
                oprname,
                CAST(NULL AS NVARCHAR(128))         AS ProgramNo,
                partno                              AS PartNo,
                process                             AS Process,
                starttime                           AS StartTime,
                endtime                             AS EndTime,
                setfrom,
                setto,
                shifttimesecs,
                runtimesecs,
                settimesecs,
                CAST(NULL AS FLOAT)                 AS accidletimesecs,
                CAST(NULL AS FLOAT)                 AS nonaccidletimesecs,
                CAST(NULL AS FLOAT)                 AS cycletimesecs,
                qty                                 AS ProductionQty,
                ScrapQty                            AS RejectionQty,
                CAST(0 AS FLOAT)                    AS ReworkQty,
                OAEFF,
                eff                                 AS OPREFF,
                QFNEW,
                OEENEW,
                deleted
            FROM ConvProductionEntryRod
            WHERE deleted = 0
        """)
    return branches


def _efficiency_data_cte_sql(include_cnc=True, include_conv=True):
    branches = _efficiency_data_cte_branches(include_cnc, include_conv)
    if not branches:
        return None
    return "WITH EFFICIENCY_DATA AS (\n" + "\n    UNION ALL\n".join(branches) + "\n)"


def _mac_type_expr():
    return (
        "CASE WHEN ED.SourceTable = N'ProductionEntry' "
        "THEN N'CNC' ELSE N'Conventional' END"
    )


def _fetch_combined_efficiency_rows(
    cursor, start_date, end_date, include_cnc=True, include_conv=True
):
    """
    Combined EFFICIENCY_DATA rows with department (team) via empmaster → DepartmentMast.
    Returns tuples: (operator, dept, macno, entry_date, oaeff, opreff, mac_type, source_table)
    """
    cte = _efficiency_data_cte_sql(include_cnc, include_conv)
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
            CAST(ED.OAEFF AS FLOAT) AS OAEFF,
            CAST(ED.OPREFF AS FLOAT) AS OPREFF,
            {_mac_type_expr()} AS MacType,
            ED.SourceTable
        FROM EFFICIENCY_DATA AS ED
        {joins}
        WHERE ED.EntryDate BETWEEN ? AND ?
          AND ED.macno IS NOT NULL AND LTRIM(RTRIM(ED.macno)) <> N''
          AND (ED.OAEFF IS NOT NULL OR ED.OPREFF IS NOT NULL)
        ORDER BY ED.EntryDate, ED.macno, ED.shift, ED.SourceTable
    """
    params = [start_date, end_date]
    try:
        cursor.execute(sql, params)
        return cursor.fetchall() or []
    except Exception:
        return _fetch_combined_efficiency_rows_legacy(
            cursor, start_date, end_date, include_cnc, include_conv
        )


def _fetch_combined_efficiency_rows_legacy(
    cursor, start_date, end_date, include_cnc=True, include_conv=True
):
    """Fallback using simplified union when full combined CTE fails."""
    dept_join = _legacy_department_join()
    branches = _legacy_union_branches(include_cnc, include_conv, include_prod_date=True)
    if not branches:
        return []
    params = []
    for _ in branches:
        params.extend([start_date, end_date])
    union_sql = " UNION ALL ".join(branches)
    detail_sql = _detail_with_department_dated_sql(union_sql, dept_join)
    sql = f"""
        SELECT Operator, Dept, MacNo, ProdDate, OAEFF, OPREFF, MacType, N'' AS SourceTable
        FROM ({detail_sql}) AS DetailRows
        WHERE ProdDate IS NOT NULL
          AND MacNo IS NOT NULL AND LTRIM(RTRIM(MacNo)) <> N''
    """
    cursor.execute(sql, params)
    return cursor.fetchall() or []


def _combined_efficiency_monthwise(cursor, start_date, end_date, include_cnc=True, include_conv=True):
    """Month-wise average OAEFF from combined EFFICIENCY_DATA CTE."""
    cte = _efficiency_data_cte_sql(include_cnc, include_conv)
    if not cte:
        return {"labels": [], "data": []}
    sql = f"""
        {cte}
        SELECT MONTH(EntryDate) AS MonthNum, AVG(CAST(OAEFF AS FLOAT)) AS Avg_OAEFF
        FROM EFFICIENCY_DATA
        WHERE EntryDate BETWEEN ? AND ?
          AND OAEFF IS NOT NULL
        GROUP BY MONTH(EntryDate)
        ORDER BY MONTH(EntryDate)
    """
    try:
        cursor.execute(sql, [start_date, end_date])
        rows = cursor.fetchall() or []
    except Exception:
        return _overall_efficiency_monthwise(cursor, start_date, end_date)

    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    labels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
    eff_map = {m: 0.0 for m in month_order}
    for month_num, avg_eff in rows:
        mk = month_key_from_db(month_num)
        if mk in eff_map:
            eff_map[mk] = round(float(avg_eff or 0), 2)
    return {"labels": labels, "data": [eff_map[m] for m in month_order]}


def _compute_efficiency_kpis(rows, start_date, end_date):
    """KPI block for Plant Performance target / action cards."""
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
            "avgOaeff": 0,
            "topPerformer": None,
            "topPerformerOaeff": 0,
            "rowCount": 0,
            "metTargetPct": 0,
        }

    total = sum(float(r.get("oaeff") or 0) for r in use_rows)
    avg = round(total / len(use_rows), 2)

    op_totals = {}
    op_counts = {}
    for r in use_rows:
        op = r.get("operator") or "Unknown"
        op_totals[op] = op_totals.get(op, 0) + float(r.get("oaeff") or 0)
        op_counts[op] = op_counts.get(op, 0) + 1

    top_op = None
    top_avg = -1.0
    for op, s in op_totals.items():
        avg_op = s / op_counts[op]
        if avg_op > top_avg:
            top_avg = avg_op
            top_op = op

    return {
        "avgOaeff": avg,
        "topPerformer": top_op,
        "topPerformerOaeff": round(top_avg, 2) if top_op else 0,
        "rowCount": len(use_rows),
        "metTargetPct": 0,
    }


def _month_label_from_date(dt_val):
    if dt_val is None:
        return "—"
    if hasattr(dt_val, "month") and hasattr(dt_val, "year"):
        mo, yr = dt_val.month, dt_val.year
    else:
        try:
            from datetime import datetime
            parsed = datetime.strptime(str(dt_val).strip()[:10], "%Y-%m-%d")
            mo, yr = parsed.month, parsed.year
        except Exception:
            return "—"
    return f"{_MONTH_ABB_EFF[mo - 1]}-{str(yr)[2:]}"


def _months_in_range(start_date, end_date):
    """Calendar months between start_date and end_date as Apr-25 style labels."""
    labels = []
    y, m = start_date.year, start_date.month
    end_y, end_m = end_date.year, end_date.month
    while (y, m) <= (end_y, end_m):
        labels.append(f"{_MONTH_ABB_EFF[m - 1]}-{str(y)[2:]}")
        m += 1
        if m > 12:
            m = 1
            y += 1
    return labels


def _efficiency_query_date_range(load_full_fy, start_date, end_date):
    """
    Date window for SQL. When load_full_fy=True, load previous FY + current FY
    (e.g. Jun 2026 → Apr 2025–Mar 2027) so tenants with data in the prior FY still return rows.
    """
    from datetime import date
    from .views import current_financial_year

    if not load_full_fy:
        return start_date, end_date
    fy_start, fy_end = current_financial_year()
    query_start = date(fy_start.year - 1, 4, 1)
    return query_start, fy_end


def _month_labels_for_payload(rows, start_date, end_date, query_start, query_end):
    """Month columns for chart/table — use request range, or months present in rows."""
    from datetime import datetime

    request_labels = _months_in_range(start_date, end_date)
    if not rows:
        return request_labels

    has_in_request = False
    for r in rows:
        d = r.get("date")
        if not d:
            continue
        try:
            dt = datetime.strptime(d[:10], "%Y-%m-%d").date()
            if start_date <= dt <= end_date:
                has_in_request = True
                break
        except Exception:
            continue

    if has_in_request:
        return request_labels

    month_map = {}
    for r in rows:
        mo, d = r.get("month"), r.get("date")
        if mo and mo != "—" and d:
            month_map[mo] = d
    if month_map:
        return [m for m, _ in sorted(month_map.items(), key=lambda x: x[1])]
    return _months_in_range(query_start, query_end)


def _fetch_efficiency_entry_rows(
    cursor, start_date, end_date, include_cnc=True, include_conv=True
):
    """Production entry rows — combined EFFICIENCY_DATA CTE + department join."""
    return _fetch_combined_efficiency_rows(
        cursor, start_date, end_date, include_cnc, include_conv
    )


def _entries_from_aggregate_fallback(
    cursor, start_date, end_date, include_cnc=True, include_conv=True
):
    """
    When dated entry SQL returns nothing, reuse efficiency_report aggregate rows
    (one synthetic entry per operator/machine at end of range).
    """
    agg_rows = _fetch_efficiency_rows(
        cursor, start_date, end_date, include_cnc, include_conv, group_by_machine=False
    )
    out = []
    for operator, dept, mac, oaeff, opreff, _qfeff, _idle, _rej in agg_rows:
        operator_s = str(operator or "").strip()
        mac_s = str(mac or "").strip()
        if not mac_s:
            continue
        eff_val = oaeff if oaeff is not None else opreff
        if eff_val is None:
            continue
        out.append((
            operator_s or "—",
            str(dept or "").strip(),
            mac_s,
            end_date,
            float(oaeff) if oaeff is not None else None,
            float(opreff) if opreff is not None else None,
            "CNC",
        ))
    return out


def build_efficiency_compare_payload(
    cursor, start_date, end_date, include_cnc=True, include_conv=True, load_full_fy=True
):
    """Structured payload for Plant Performance Efficiency (EFF) panel."""
    from datetime import datetime

    if load_full_fy:
        query_start, query_end = _efficiency_query_date_range(True, start_date, end_date)
    else:
        query_start, query_end = start_date, end_date

    raw_rows = _fetch_efficiency_entry_rows(
        cursor, query_start, query_end, include_cnc, include_conv
    )
    if not raw_rows:
        raw_rows = _entries_from_aggregate_fallback(
            cursor, query_start, query_end, include_cnc, include_conv
        )
    # Still empty — retry previous financial year only
    if not raw_rows and load_full_fy:
        from datetime import date
        from .views import current_financial_year
        fy_start, _fy_end = current_financial_year()
        prev_start = date(fy_start.year - 1, 4, 1)
        prev_end = date(fy_start.year, 3, 31)
        raw_rows = _fetch_efficiency_entry_rows(
            cursor, prev_start, prev_end, include_cnc, include_conv
        )
        if not raw_rows:
            raw_rows = _entries_from_aggregate_fallback(
                cursor, prev_start, prev_end, include_cnc, include_conv
            )
        if raw_rows:
            query_start, query_end = prev_start, prev_end

    rows = []
    teams_set, machines_set, operators_set = set(), set(), set()

    for row in raw_rows:
        if len(row) >= 8:
            operator, dept, mac, prod_date, oaeff, opreff, mac_type, _src = row[:8]
        else:
            operator, dept, mac, prod_date, oaeff, opreff, mac_type = row[:7]
        operator_s = str(operator or "").strip()
        if not operator_s:
            operator_s = str(mac or "").strip() or "Unknown"
        if operator_s in ("—",):
            continue
        dept_s = str(dept or "").strip()
        mac_s = str(mac or "").strip()
        mac_type_s = str(mac_type or "").strip() or "CNC"
        if not mac_s:
            continue

        eff_val = oaeff if oaeff is not None else opreff
        if eff_val is None:
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
            "operator": operator_s,
            "team": dept_s or "—",
            "machineType": mac_type_s,
            "machine": mac_s,
            "date": date_str,
            "month": month_label,
            "year": year_val,
            "oaeff": round(float(eff_val), 2),
        })
        if dept_s:
            teams_set.add(dept_s)
        machines_set.add(mac_s)
        operators_set.add(operator_s)

    # Display month columns follow the requested range (from bundle / API query).
    month_labels = _month_labels_for_payload(rows, start_date, end_date, query_start, query_end)
    machine_types = []
    if include_cnc:
        machine_types.append("CNC")
    if include_conv:
        machine_types.append("Conventional")

    operator_table_rows = []
    try:
        agg_rows = _fetch_efficiency_rows(
            cursor, query_start, query_end, include_cnc, include_conv, group_by_machine=False
        )
        operator_table_rows = _rows_to_table_arrays(agg_rows, group_by_machine=False)
    except Exception:
        operator_table_rows = []

    monthwise = None
    try:
        monthwise = _combined_efficiency_monthwise(
            cursor, query_start, query_end, include_cnc, include_conv
        )
    except Exception:
        monthwise = None

    kpis = _compute_efficiency_kpis(rows, start_date, end_date)

    return {
        "from": str(start_date),
        "to": str(end_date),
        "queryFrom": str(query_start),
        "queryTo": str(query_end),
        "rows": rows,
        "operatorRows": operator_table_rows,
        "monthLabels": month_labels,
        "monthwise": monthwise,
        "kpis": kpis,
        "filterOptions": {
            "teams": sorted(teams_set),
            "machines": sorted(machines_set),
            "operators": sorted(operators_set),
            "machineTypes": machine_types,
        },
    }


@api_view(["GET"])
def efficiency_report(request):
    """
    MIS Efficiency Report — operator-wise (default) and machine-wise tables.
    Query: ?from=&to=&cnc=1&conv=1&tab=operator|machine
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    include_cnc = _parse_bool_param(request.GET.get("cnc"), True)
    include_conv = _parse_bool_param(request.GET.get("conv"), True)
    tab = (request.GET.get("tab") or "operator").strip().lower()
    group_by_machine = tab == "machine"

    if not include_cnc and not include_conv:
        return Response({
            "error": "Select at least one machine type (CNC or Conventional).",
        }, status=400)

    fy_start_year = start_date.year if start_date.month >= 4 else start_date.year - 1
    fy_label = f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}"

    cursor = None
    table_rows = []
    monthwise = None
    try:
        cursor = conn.cursor()
        rows = _fetch_efficiency_rows(
            cursor, start_date, end_date, include_cnc, include_conv, group_by_machine,
        )
        table_rows = _rows_to_table_arrays(rows, group_by_machine)
        try:
            monthwise = _overall_efficiency_monthwise(cursor, start_date, end_date)
        except Exception:
            monthwise = None
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
        "fy": fy_label,
        "from": str(start_date),
        "to": str(end_date),
        "tab": tab,
        "row_count": len(table_rows),
        "rows": table_rows,
        "monthwise": monthwise,
    })
