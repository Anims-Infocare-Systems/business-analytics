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


def _build_union_branches(cursor, start_date, end_date, include_cnc, include_conv):
    """
    UNION ALL rows from ProductionEntry (CNC) + Conv* (Conventional).
    Uses the same core columns as chart overall-efficiency / operator-efficiency.
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

        branches.append(
            f"SELECT {_opr_expr(opr_col)} AS Operator, {_mac_expr(mac_col)} AS MacNo, "
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


def _legacy_union_branches(include_cnc, include_conv):
    """Fallback SQL — columns aligned with working chart endpoints."""
    branches = []
    if include_cnc:
        branches.append("""
            SELECT
                LTRIM(RTRIM(CAST(ISNULL(oprname, N'') AS NVARCHAR(512)))) AS Operator,
                LTRIM(RTRIM(CAST(macno AS NVARCHAR(128)))) AS MacNo,
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
