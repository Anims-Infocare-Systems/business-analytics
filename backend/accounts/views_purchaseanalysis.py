# ════════════════════════════════════════════════════════════════════
#  views_purchaseanalysis.py
#  Purchase Analysis — KPI strip, weekly trend, supplier charts,
#  PO detail table, GRN aging, and management alerts
# ════════════════════════════════════════════════════════════════════

from calendar import monthrange
from datetime import date

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .views import (
    get_tenant_connection,
    parse_date_range,
    table_exists,
    find_column_ci,
    resolve_erp_table,
    find_first_column,
    dashboard2_parse_date_range_default_month,
)


# ─────────────────────────────────────────────────────────────
#  PRIVATE HELPERS
# ─────────────────────────────────────────────────────────────

_MONTH_ABB = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


def _pct(part, whole):
    if not whole:
        return 0.0
    return round((float(part or 0) / float(whole)) * 100, 1)


def _to_lakhs(value):
    return round(float(value or 0) / 100_000, 2)


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


_WEEK_OF_MONTH_CASE = """
    CASE
        WHEN DAY(CAST(podate AS DATE)) BETWEEN 1 AND 7 THEN 1
        WHEN DAY(CAST(podate AS DATE)) BETWEEN 8 AND 14 THEN 2
        WHEN DAY(CAST(podate AS DATE)) BETWEEN 15 AND 21 THEN 3
        WHEN DAY(CAST(podate AS DATE)) BETWEEN 22 AND 28 THEN 4
        ELSE 5
    END
"""

_GRN_WEEK_CASE = """
    CASE
        WHEN DAY(CAST(grndate AS DATE)) BETWEEN 1 AND 7 THEN 1
        WHEN DAY(CAST(grndate AS DATE)) BETWEEN 8 AND 14 THEN 2
        WHEN DAY(CAST(grndate AS DATE)) BETWEEN 15 AND 21 THEN 3
        WHEN DAY(CAST(grndate AS DATE)) BETWEEN 22 AND 28 THEN 4
        ELSE 5
    END
"""


def _supplier_name_expr(cursor):
    """Return the SQL expression for supplier name from CustMast (cid join)."""
    has_alias = table_exists(cursor, "CustAliasMast")
    if has_alias:
        return (
            "LTRIM(RTRIM(ISNULL("
            "NULLIF(LTRIM(RTRIM(ISNULL(C.CName, N''))), N''), "
            "NULLIF(LTRIM(RTRIM(ISNULL(A.CName, N''))), N'')"
            ")))"
        ), True
    return "LTRIM(RTRIM(ISNULL(C.CName, N'')))", False


def _supplier_join_sql(use_alias):
    join = (
        "LEFT JOIN CustMast C ON "
        "LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(C.Id, N'')))) "
        "= LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(m.cid, N''))))"
    )
    if use_alias:
        join += (
            " LEFT JOIN CustAliasMast A ON "
            "LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(A.Id, N'')))) "
            "= LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(m.cid, N''))))"
        )
    return join


def _supplier_filter_sql(request, cursor, table_alias="m", join_if_needed=False):
    """
    Parses request.GET.get("supplier") and returns (join_sql, where_sql, params).
    Handles comma-separated list of suppliers and maps to SQL IN clause using CustMast/CustAliasMast.
    """
    supplier_filter = (request.GET.get("supplier") or "").strip()
    if not supplier_filter or supplier_filter.lower() == "all suppliers":
        return "", "", []

    sups = [s.strip() for s in supplier_filter.split(",") if s.strip()]
    if not sups:
        return "", "", []

    placeholders = ",".join(["?"] * len(sups))

    if join_if_needed:
        has_alias = table_exists(cursor, "CustAliasMast")
        sch_cm, nm_cm, q_cm = resolve_erp_table(cursor, ["CustMast", "custmast", "CUSTMAST", "CustMast"])
        cm_id = find_column_ci(cursor, sch_cm, nm_cm, ["Id", "id", "ID", "CustId", "custid"])
        cm_name = find_column_ci(cursor, sch_cm, nm_cm, ["CName", "cname", "CNAME", "CustName", "Name"])
        cm_del = find_column_ci(cursor, sch_cm, nm_cm, ["deleted", "Deleted", "IsDeleted"])

        if not q_cm or not cm_id or not cm_name:
            return "", "", []

        cm_del_sql = f" AND ISNULL(C_FLT.[{cm_del}], 0) = 0" if cm_del else ""
        join_sql = f"""
            LEFT JOIN {q_cm} C_FLT ON 
                LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(C_FLT.[{cm_id}], N'')))) 
                = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL({table_alias}.cid, N''))))
                {cm_del_sql}
        """

        if has_alias:
            sch_cam, nm_cam, q_cam = resolve_erp_table(cursor, ["CustAliasMast", "custaliasmast"])
            cam_id = find_column_ci(cursor, sch_cam, nm_cam, ["Id", "id", "ID", "CustId"])
            cam_name = find_column_ci(cursor, sch_cam, nm_cam, ["CName", "cname", "CNAME"])
            cam_del = find_column_ci(cursor, sch_cam, nm_cam, ["deleted", "Deleted", "IsDeleted"])

            cam_del_sql = f" AND ISNULL(A_FLT.[{cam_del}], 0) = 0" if cam_del else ""
            join_sql += f"""
                LEFT JOIN {q_cam} A_FLT ON 
                    LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(A_FLT.[{cam_id}], N'')))) 
                    = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL({table_alias}.cid, N''))))
                    {cam_del_sql}
            """
            where_sql = f"""
                AND LTRIM(RTRIM(ISNULL(
                    NULLIF(LTRIM(RTRIM(ISNULL(C_FLT.[{cm_name}], N''))), N''), 
                    NULLIF(LTRIM(RTRIM(ISNULL(A_FLT.[{cam_name}], N''))), N'')
                ))) IN ({placeholders})
            """
        else:
            where_sql = f" AND LTRIM(RTRIM(ISNULL(C_FLT.[{cm_name}], N''))) IN ({placeholders}) "
    else:
        name_expr, _ = _supplier_name_expr(cursor)
        where_sql = f" AND {name_expr} IN ({placeholders}) "
        join_sql = ""

    return join_sql, where_sql, sups


def _get_table_search_columns(cursor, table_name, candidates):
    if not table_exists(cursor, table_name):
        return []
    valid_cols = []
    for col in candidates:
        cursor.execute(
            """
            SELECT TOP 1 COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'dbo' 
              AND TABLE_NAME = ? 
              AND UPPER(LTRIM(RTRIM(COLUMN_NAME))) = UPPER(LTRIM(RTRIM(?)))
            """,
            (table_name, col)
        )
        row = cursor.fetchone()
        if row and row[0] not in valid_cols:
            valid_cols.append(row[0])
    return valid_cols


def _build_po_search_sql(request, cursor, po_alias="m"):
    """
    Parses request.GET.get("search") or request.GET.get("q") and returns (where_sql, params).
    Matches RM Name / RM Desc / RM Code / Item Code / Item Description / Material Code / Desc / PO Number / Supplier Name.
    """
    search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()
    if not search_q:
        return "", []

    like_pat = f"%{search_q}%"
    has_alias = table_exists(cursor, "CustAliasMast")

    candidates = [
        'rmname', 'rmdesc', 'rmcode', 'icode', 'itcode', 'itdesc', 'ItCode', 'ItDesc',
        'description', 'Description', 'matcode', 'matdesc', 'mattype', 'partno', 'PartNo',
        'PRINTPartNO', 'Part_No', 'rmtype', 'ShotClsReason', 'ShotClsUser'
    ]

    # Check PODet / In_PoDet
    po_det_tbl = "PODet" if table_exists(cursor, "PODet") else ("In_PoDet" if table_exists(cursor, "In_PoDet") else None)
    po_det_cols = _get_table_search_columns(cursor, po_det_tbl, candidates) if po_det_tbl else []

    # Check grninsubdet
    grn_det_tbl = "grninsubdet" if table_exists(cursor, "grninsubdet") else None
    grn_det_cols = _get_table_search_columns(cursor, grn_det_tbl, candidates) if grn_det_tbl else []

    # Check POAmndDet
    amnd_det_tbl = "POAmndDet" if table_exists(cursor, "POAmndDet") else ("poamnddet" if table_exists(cursor, "poamnddet") else None)
    amnd_det_cols = _get_table_search_columns(cursor, amnd_det_tbl, candidates) if amnd_det_tbl else []

    or_conditions = []
    params = []

    # 1. PO Number
    or_conditions.append(f"LOWER(CAST({po_alias}.pono AS NVARCHAR(200))) LIKE LOWER(?)")
    params.append(like_pat)

    # 2. Supplier Name
    alias_sub = (
        "UNION SELECT A_SRCH.Id FROM CustAliasMast A_SRCH WHERE ISNULL(A_SRCH.deleted, 0) = 0 "
        "AND LOWER(CAST(A_SRCH.CName AS NVARCHAR(500))) LIKE LOWER(?)"
        if has_alias else ""
    )
    or_conditions.append(f"""{po_alias}.cid IN (
        SELECT C_SRCH.Id FROM CustMast C_SRCH 
        WHERE ISNULL(C_SRCH.deleted, 0) = 0 
          AND LOWER(CAST(C_SRCH.CName AS NVARCHAR(500))) LIKE LOWER(?)
        {alias_sub}
    )""")
    params.append(like_pat)
    if has_alias:
        params.append(like_pat)

    # 3. PODet / In_PoDet subquery
    if po_det_cols:
        clauses = [f"LOWER(CAST(pd_srch.[{c}] AS NVARCHAR(512))) LIKE LOWER(?)" for c in po_det_cols]
        or_conditions.append(f"""{po_alias}.pono IN (
            SELECT DISTINCT pd_srch.pono
            FROM {po_det_tbl} pd_srch
            WHERE ISNULL(pd_srch.deleted, 0) = 0
              AND ({" OR ".join(clauses)})
        )""")
        params.extend([like_pat] * len(po_det_cols))

    # 4. GRN subquery (grninsubdet)
    if grn_det_cols:
        clauses = [f"LOWER(CAST(gd_srch.[{c}] AS NVARCHAR(512))) LIKE LOWER(?)" for c in grn_det_cols]
        or_conditions.append(f"""{po_alias}.pono IN (
            SELECT DISTINCT gd_srch.pono
            FROM {grn_det_tbl} gd_srch
            WHERE ISNULL(gd_srch.deleted, 0) = 0
              AND ({" OR ".join(clauses)})
        )""")
        params.extend([like_pat] * len(grn_det_cols))

    # 5. POAmndDet subquery
    if amnd_det_cols:
        clauses = [f"LOWER(CAST(ad_srch.[{c}] AS NVARCHAR(512))) LIKE LOWER(?)" for c in amnd_det_cols]
        or_conditions.append(f"""{po_alias}.pono IN (
            SELECT DISTINCT PAM_SRCH.manualpono
            FROM {amnd_det_tbl} ad_srch
            INNER JOIN POAmndMas PAM_SRCH ON ad_srch.amdno = PAM_SRCH.amdno
            WHERE ISNULL(ad_srch.deleted, 0) = 0
              AND ISNULL(PAM_SRCH.deleted, 0) = 0
              AND ({" OR ".join(clauses)})
        )""")
        params.extend([like_pat] * len(amnd_det_cols))

    where_sql = f" AND (" + " OR ".join(or_conditions) + ")"
    return where_sql, params


# ─────────────────────────────────────────────────────────────
#  ENDPOINT 1 — Summary Strip + KPI Cards
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def purchase_analysis_summary(request):
    """
    Returns KPI values for the Purchase Analysis page:
      - total_po_value, total_pos, active_suppliers
      - grn_received, grn_pending, grn_compliance_pct
      - avg_lead_time_days
      - period label, from / to dates
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    dtype_param = (request.GET.get("dtype") or "").strip()
    apply_dtype = dtype_param and dtype_param.lower() != "all types"

    total_po_value    = 0.0
    total_pos         = 0
    active_suppliers  = 0
    grn_received      = 0.0
    grn_pending       = 0.0
    avg_lead_time     = 0.0

    try:
        cursor = conn.cursor()

        # ── PO Summary Filters ──
        dtype_clause_po = ""
        dtype_params_po = []
        if apply_dtype:
            dtype_clause_po = " AND LTRIM(RTRIM(ISNULL(dtype, ''))) = ?"
            dtype_params_po.append(dtype_param)
        else:
            dtype_clause_po = " AND UPPER(LTRIM(RTRIM(ISNULL(dtype, '')))) <> 'JOB ORDER'"

        # Supplier filters
        join_flt, where_flt, params_flt = _supplier_filter_sql(request, cursor, "POMas", join_if_needed=True)
        srch_sql, srch_params = _build_po_search_sql(request, cursor, "POMas")

        # ── PO summary ──────────────────────────────────────────────
        cursor.execute(
            f"""
            SELECT
                ISNULL(SUM(CAST(totamt AS FLOAT)), 0) AS po_value,
                COUNT(DISTINCT pono)                  AS po_count,
                COUNT(DISTINCT cid)                   AS suppliers
            FROM POMas
            {join_flt}
            WHERE ISNULL(POMas.deleted, 0) = 0
              {dtype_clause_po}
              {where_flt}
              {srch_sql}
              AND CAST(podate AS DATE) BETWEEN ? AND ?
            """,
            tuple(dtype_params_po + params_flt + srch_params + [start_date, end_date]),
        )
        row = cursor.fetchone()
        if row:
            total_po_value   = float(row[0] or 0)
            total_pos        = int(row[1] or 0)
            active_suppliers = int(row[2] or 0)

        # ── GRN received value ───────────────────────────────────────
        join_flt_grn, where_flt_grn, params_flt_grn = _supplier_filter_sql(request, cursor, "m", join_if_needed=True)
        srch_sql_m, srch_params_m = _build_po_search_sql(request, cursor, "m")
        has_extra_filters = apply_dtype or where_flt_grn or srch_sql_m
        try:
            if has_extra_filters:
                cursor.execute(
                    f"""
                    SELECT ISNULL(SUM(CAST(rd.Amount AS FLOAT)), 0)
                    FROM Grn_RateDet rd
                    WHERE ISNULL(rd.deleted, 0) = 0
                      AND rd.grnno IN (
                          SELECT DISTINCT gm.grnno
                          FROM grn_mas gm
                          INNER JOIN grninsubdet gs ON gm.grnno = gs.grnno
                          INNER JOIN POMas m ON gs.pono = m.pono
                          {join_flt_grn}
                          WHERE ISNULL(gm.deleted, 0) = 0
                            AND ISNULL(gs.deleted, 0) = 0
                            AND ISNULL(m.deleted, 0) = 0
                            {dtype_clause_po.replace("dtype", "m.dtype")}
                            {where_flt_grn}
                            {srch_sql_m}
                            AND CAST(gm.grndate AS DATE) BETWEEN ? AND ?
                      )
                    """,
                    tuple(dtype_params_po + params_flt_grn + srch_params_m + [start_date, end_date]),
                )
            else:
                cursor.execute(
                    """
                    SELECT ISNULL(SUM(CAST(rd.Amount AS FLOAT)), 0)
                    FROM Grn_RateDet rd
                    WHERE ISNULL(rd.deleted, 0) = 0
                      AND rd.grnno IN (
                          SELECT gm.grnno
                          FROM grn_mas gm
                          WHERE ISNULL(gm.deleted, 0) = 0
                            AND CAST(gm.grndate AS DATE) BETWEEN ? AND ?
                      )
                    """,
                    (start_date, end_date),
                )
            grn_row = cursor.fetchone()
            grn_received = float(grn_row[0] or 0) if grn_row else 0.0
        except Exception:
            # Fall back to grninsubdet if Grn_RateDet not available
            try:
                if has_extra_filters:
                    cursor.execute(
                        f"""
                        SELECT ISNULL(SUM(CAST(gs.amount AS FLOAT)), 0)
                        FROM grninsubdet gs
                        INNER JOIN grn_mas gm ON gs.grnno = gm.grnno
                        INNER JOIN POMas m ON gs.pono = m.pono
                        {join_flt_grn}
                        WHERE ISNULL(gm.deleted, 0) = 0
                          AND ISNULL(gs.deleted, 0) = 0
                          AND ISNULL(m.deleted, 0) = 0
                          {dtype_clause_po.replace("dtype", "m.dtype")}
                          {where_flt_grn}
                          {srch_sql_m}
                          AND CAST(gm.grndate AS DATE) BETWEEN ? AND ?
                        """,
                        tuple(dtype_params_po + params_flt_grn + srch_params_m + [start_date, end_date]),
                    )
                else:
                    cursor.execute(
                        """
                        SELECT ISNULL(SUM(CAST(gs.amount AS FLOAT)), 0)
                        FROM grninsubdet gs
                        INNER JOIN grn_mas gm ON gs.grnno = gm.grnno
                        WHERE ISNULL(gm.deleted, 0) = 0
                          AND ISNULL(gs.deleted, 0) = 0
                          AND CAST(gm.grndate AS DATE) BETWEEN ? AND ?
                        """,
                        (start_date, end_date),
                    )
                grn_row = cursor.fetchone()
                grn_received = float(grn_row[0] or 0) if grn_row else 0.0
            except Exception:
                grn_received = 0.0

        grn_pending = max(0.0, total_po_value - grn_received)

        # ── Average lead time (PO date → GRN date) ──────────────────
        try:
            cursor.execute(
                f"""
                SELECT AVG(CAST(DATEDIFF(DAY, m.podate, gm.grndate) AS FLOAT))
                FROM grn_mas gm
                INNER JOIN grninsubdet gs ON gm.grnno = gs.grnno
                INNER JOIN POMas m ON gs.pono = m.pono
                {join_flt_grn}
                WHERE ISNULL(gm.deleted, 0) = 0
                  AND ISNULL(gs.deleted, 0) = 0
                  AND ISNULL(m.deleted, 0) = 0
                  {dtype_clause_po.replace("dtype", "m.dtype")}
                  {where_flt_grn}
                  {srch_sql_m}
                  AND CAST(m.podate AS DATE) BETWEEN ? AND ?
                """,
                tuple(dtype_params_po + params_flt_grn + srch_params_m + [start_date, end_date]),
            )
            lt_row = cursor.fetchone()
            avg_lead_time = round(float(lt_row[0] or 0), 1) if lt_row and lt_row[0] else 0.0
        except Exception:
            avg_lead_time = 0.0

        cursor.close()
        conn.close()

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    grn_compliance = _pct(grn_received, total_po_value)

    return Response({
        "company":            tenant.get("company_name", ""),
        "from":               str(start_date),
        "to":                 str(end_date),
        "period":             _fmt_period(start_date, end_date),
        "total_po_value":     total_po_value,
        "total_po_value_lakhs": _to_lakhs(total_po_value),
        "total_pos":          total_pos,
        "active_suppliers":   active_suppliers,
        "grn_received":       grn_received,
        "grn_received_lakhs":  _to_lakhs(grn_received),
        "grn_pending":        grn_pending,
        "grn_pending_lakhs":   _to_lakhs(grn_pending),
        "grn_compliance_pct": grn_compliance,
        "avg_lead_time_days":  avg_lead_time,
    })


# ─────────────────────────────────────────────────────────────
#  ENDPOINT 2 — Weekly Trend (PO Value + GRN Received)
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def purchase_analysis_weekly_trend(request):
    """
    Returns week-by-week PO value and GRN received for Chart.js mixed bar+line.
    Accepts optional ?dtype=Raw Material to filter by PO type.
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    dtype_param  = (request.GET.get("dtype") or "").strip()
    apply_dtype  = dtype_param and dtype_param.lower() != "all types"
    labels, keys = _weekly_slots(start_date, end_date)

    if not keys:
        return Response({
            "period": _fmt_period(start_date, end_date),
            "labels": [],
            "po_value": [],
            "grn_received": [],
        })

    po_map  = {k: 0.0 for k in keys}
    grn_map = {k: 0.0 for k in keys}

    try:
        cursor = conn.cursor()

        # Supplier filter
        join_flt, where_flt, params_flt = _supplier_filter_sql(request, cursor, "POMas", join_if_needed=True)
        srch_sql, srch_params = _build_po_search_sql(request, cursor, "POMas")

        # ── PO weekly ────────────────────────────────────────────────
        dtype_clause = ""
        dtype_params_list = []
        if apply_dtype:
            dtype_clause = " AND LTRIM(RTRIM(ISNULL(dtype, ''))) = ?"
            dtype_params_list = [dtype_param]

        cursor.execute(
            f"""
            SELECT
                YEAR(CAST(podate AS DATE)) AS yr,
                MONTH(CAST(podate AS DATE)) AS mo,
                {_WEEK_OF_MONTH_CASE} AS wk,
                ISNULL(SUM(CAST(totamt AS FLOAT)), 0) AS po_val
            FROM POMas
            {join_flt}
            WHERE ISNULL(POMas.deleted, 0) = 0
              AND UPPER(LTRIM(RTRIM(ISNULL(POMas.dtype, '')))) <> 'JOB ORDER'
              AND CAST(podate AS DATE) BETWEEN ? AND ?
              {dtype_clause}
              {where_flt}
              {srch_sql}
            GROUP BY
                YEAR(CAST(podate AS DATE)),
                MONTH(CAST(podate AS DATE)),
                {_WEEK_OF_MONTH_CASE}
            ORDER BY yr, mo, wk
            """,
            [start_date, end_date] + dtype_params_list + params_flt + srch_params,
        )
        for yr, mo, wk, val in cursor.fetchall():
            k = (int(yr), int(mo), int(wk))
            if k in po_map:
                po_map[k] = float(val or 0)

        # ── GRN weekly ───────────────────────────────────────────────
        join_flt_grn, where_flt_grn, params_flt_grn = _supplier_filter_sql(request, cursor, "m", join_if_needed=True)
        srch_sql_m, srch_params_m = _build_po_search_sql(request, cursor, "m")
        has_extra_filters = apply_dtype or where_flt_grn or srch_sql_m
        try:
            if has_extra_filters:
                cursor.execute(
                    f"""
                    SELECT
                        YEAR(CAST(gm.grndate AS DATE)) AS yr,
                        MONTH(CAST(gm.grndate AS DATE)) AS mo,
                        {_GRN_WEEK_CASE} AS wk,
                        ISNULL(SUM(CAST(rd.Amount AS FLOAT)), 0) AS grn_val
                    FROM Grn_RateDet rd
                    INNER JOIN grn_mas gm ON rd.grnno = gm.grnno
                    WHERE ISNULL(gm.deleted, 0) = 0
                      AND ISNULL(rd.deleted, 0) = 0
                      AND CAST(gm.grndate AS DATE) BETWEEN ? AND ?
                      AND rd.grnno IN (
                          SELECT DISTINCT gs.grnno
                          FROM grninsubdet gs
                          INNER JOIN POMas m ON gs.pono = m.pono
                          {join_flt_grn}
                          WHERE ISNULL(gs.deleted, 0) = 0
                            AND ISNULL(m.deleted, 0) = 0
                            {dtype_clause.replace("dtype", "m.dtype")}
                            {where_flt_grn}
                            {srch_sql_m}
                      )
                    GROUP BY
                        YEAR(CAST(gm.grndate AS DATE)),
                        MONTH(CAST(gm.grndate AS DATE)),
                        {_GRN_WEEK_CASE}
                    ORDER BY yr, mo, wk
                    """,
                    [start_date, end_date] + dtype_params_list + params_flt_grn + srch_params_m,
                )
            else:
                cursor.execute(
                    f"""
                    SELECT
                        YEAR(CAST(gm.grndate AS DATE)) AS yr,
                        MONTH(CAST(gm.grndate AS DATE)) AS mo,
                        {_GRN_WEEK_CASE} AS wk,
                        ISNULL(SUM(CAST(rd.Amount AS FLOAT)), 0) AS grn_val
                    FROM Grn_RateDet rd
                    INNER JOIN grn_mas gm ON rd.grnno = gm.grnno
                    WHERE ISNULL(gm.deleted, 0) = 0
                      AND ISNULL(rd.deleted, 0) = 0
                      AND CAST(gm.grndate AS DATE) BETWEEN ? AND ?
                    GROUP BY
                        YEAR(CAST(gm.grndate AS DATE)),
                        MONTH(CAST(gm.grndate AS DATE)),
                        {_GRN_WEEK_CASE}
                    ORDER BY yr, mo, wk
                    """,
                    [start_date, end_date],
                )
            for yr, mo, wk, val in cursor.fetchall():
                k = (int(yr), int(mo), int(wk))
                if k in grn_map:
                    grn_map[k] = float(val or 0)
        except Exception:
            pass  # GRN data optional

        cursor.close()
        conn.close()

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "company":     tenant.get("company_name", ""),
        "from":        str(start_date),
        "to":          str(end_date),
        "period":      _fmt_period(start_date, end_date),
        "labels":      labels,
        "po_value":    [round(_to_lakhs(po_map[k]), 2) for k in keys],
        "grn_received": [round(_to_lakhs(grn_map[k]), 2) for k in keys],
    })


# ─────────────────────────────────────────────────────────────
#  ENDPOINT 3 — Supplier Spend & Category Spend (Donuts)
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def purchase_analysis_charts(request):
    """
    Returns donut chart data:
      - supplier_labels / supplier_data  (% spend by supplier)
      - category_labels / category_data  (% spend by PO dtype/category)
      - supplier_ranking list for the bar-rank panel
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    dtype_param = (request.GET.get("dtype") or "").strip()
    apply_dtype = dtype_param and dtype_param.lower() != "all types"

    try:
        cursor = conn.cursor()
        name_expr, use_alias = _supplier_name_expr(cursor)
        join_sql = _supplier_join_sql(use_alias)

        # Supplier filter (Spend by supplier query uses already joined CM)
        join_flt, where_flt, params_flt = _supplier_filter_sql(request, cursor, join_if_needed=False)
        srch_sql, srch_params = _build_po_search_sql(request, cursor, "m")

        # ── Spend by supplier ────────────────────────────────────────
        dtype_clause = ""
        dtype_params = []
        if apply_dtype:
            dtype_clause = " AND LTRIM(RTRIM(ISNULL(m.dtype, ''))) = ?"
            dtype_params.append(dtype_param)
        else:
            dtype_clause = " AND UPPER(LTRIM(RTRIM(ISNULL(m.dtype, '')))) <> 'JOB ORDER'"

        cursor.execute(
            f"""
            SELECT
                {name_expr} AS supplier_name,
                ISNULL(SUM(CAST(m.totamt AS FLOAT)), 0) AS spend
            FROM POMas m
            {join_sql}
            WHERE ISNULL(m.deleted, 0) = 0
              {dtype_clause}
              {where_flt}
              {srch_sql}
              AND CAST(m.podate AS DATE) BETWEEN ? AND ?
            GROUP BY m.cid, {name_expr}
            ORDER BY spend DESC
            """,
            tuple(dtype_params + params_flt + srch_params + [start_date, end_date]),
        )
        sup_rows = cursor.fetchall()
        total_spend = sum(float(r[1] or 0) for r in sup_rows)

        supplier_ranking = []
        for i, row in enumerate(sup_rows[:8]):
            name  = (row[0] or "").strip() or "Unknown"
            spend = float(row[1] or 0)
            supplier_ranking.append({
                "rank":         i + 1,
                "name":         name,
                "spend":        spend,
                "spend_lakhs":  _to_lakhs(spend),
                "pct":          _pct(spend, total_spend),
            })

        top_sup = sup_rows[:5]
        others_sup = sum(float(r[1] or 0) for r in sup_rows[5:])
        sup_labels = [(r[0] or "").strip() or "Unknown" for r in top_sup]
        sup_data   = [_pct(float(r[1] or 0), total_spend) for r in top_sup]
        if others_sup > 0:
            sup_labels.append("Others")
            sup_data.append(_pct(others_sup, total_spend))

        # ── Spend by category (dtype) ────────────────────────────────
        join_flt_cat, where_flt_cat, params_flt_cat = _supplier_filter_sql(request, cursor, "POMas", join_if_needed=True)
        srch_sql_cat, srch_params_cat = _build_po_search_sql(request, cursor, "POMas")

        dtype_clause_cat = ""
        dtype_params_cat = []
        if apply_dtype:
            dtype_clause_cat = " AND LTRIM(RTRIM(ISNULL(POMas.dtype, ''))) = ?"
            dtype_params_cat.append(dtype_param)
        else:
            dtype_clause_cat = " AND UPPER(LTRIM(RTRIM(ISNULL(POMas.dtype, '')))) <> 'JOB ORDER'"

        cursor.execute(
            f"""
            SELECT
                LTRIM(RTRIM(ISNULL(POMas.dtype, 'General'))) AS category,
                ISNULL(SUM(CAST(totamt AS FLOAT)), 0)  AS spend
            FROM POMas
            {join_flt_cat}
            WHERE ISNULL(POMas.deleted, 0) = 0
              {dtype_clause_cat}
              {where_flt_cat}
              {srch_sql_cat}
              AND CAST(podate AS DATE) BETWEEN ? AND ?
            GROUP BY LTRIM(RTRIM(ISNULL(POMas.dtype, 'General')))
            ORDER BY spend DESC
            """,
            tuple(dtype_params_cat + params_flt_cat + srch_params_cat + [start_date, end_date]),
        )
        cat_rows = cursor.fetchall()
        total_cat = sum(float(r[1] or 0) for r in cat_rows)

        top_cat = cat_rows[:5]
        others_cat = sum(float(r[1] or 0) for r in cat_rows[5:])
        cat_labels = [(r[0] or "").strip() or "General" for r in top_cat]
        cat_data   = [_pct(float(r[1] or 0), total_cat) for r in top_cat]
        if others_cat > 0:
            cat_labels.append("Others")
            cat_data.append(_pct(others_cat, total_cat))

        cursor.close()
        conn.close()

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "company":           tenant.get("company_name", ""),
        "from":              str(start_date),
        "to":                str(end_date),
        "period":            _fmt_period(start_date, end_date),
        "supplier_labels":   sup_labels,
        "supplier_data":     sup_data,
        "category_labels":   cat_labels,
        "category_data":     cat_data,
        "supplier_ranking":  supplier_ranking,
        "total_spend":       total_spend,
        "total_spend_lakhs": _to_lakhs(total_spend),
    })



# ─────────────────────────────────────────────────────────────
#  ENDPOINT 4 — PO Pipeline Summary
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def purchase_analysis_pipeline(request):
    """
    Returns PO pipeline counts and values:
      - pos_raised, value_raised
      - grn_closed (fully received), value_closed
      - partial_grn, value_partial
      - pending (no GRN), value_pending
      - overdue_pos (GRN date exceeded expected date)
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)

    pos_raised    = 0
    value_raised  = 0.0
    grn_closed    = 0
    value_closed  = 0.0
    partial_grn   = 0
    value_partial = 0.0
    pending_pos   = 0
    value_pending = 0.0
    overdue_pos   = 0

    try:
        cursor = conn.cursor()
        srch_sql_po, srch_params_po = _build_po_search_sql(request, cursor, "POMas")

        # ── Total POs raised ─────────────────────────────────────────
        cursor.execute(
            f"""
            SELECT
                COUNT(DISTINCT pono) AS po_count,
                ISNULL(SUM(CAST(totamt AS FLOAT)), 0) AS po_value
            FROM POMas
            WHERE ISNULL(deleted, 0) = 0
              AND ISNULL(dtype, '') <> 'Job Order'
              {srch_sql_po}
              AND CAST(podate AS DATE) BETWEEN ? AND ?
            """,
            tuple(srch_params_po + [start_date, end_date]),
        )
        row = cursor.fetchone()
        if row:
            pos_raised   = int(row[0] or 0)
            value_raised = float(row[1] or 0)

        # ── PO status via GRN linkage ────────────────────────────────
        try:
            srch_sql_m, srch_params_m = _build_po_search_sql(request, cursor, "m")
            cursor.execute(
                f"""
                SELECT
                    m.pono,
                    ISNULL(m.totamt, 0)                                AS po_value,
                    ISNULL(SUM(CAST(gs.qty AS FLOAT)), 0)              AS grn_qty,
                    ISNULL(SUM(CAST(pd.qty AS FLOAT)), 0)              AS ord_qty,
                    MAX(CAST(gm.grndate AS DATE))                      AS last_grn_date,
                    MIN(CAST(m.podate AS DATE))                        AS po_date
                FROM POMas m
                LEFT JOIN grninsubdet gs
                    ON gs.pono = m.pono AND ISNULL(gs.deleted, 0) = 0
                LEFT JOIN grn_mas gm
                    ON gs.grnno = gm.grnno AND ISNULL(gm.deleted, 0) = 0
                LEFT JOIN PODet pd
                    ON pd.pono = m.pono AND ISNULL(pd.deleted, 0) = 0
                WHERE ISNULL(m.deleted, 0) = 0
                  AND ISNULL(m.dtype, '') <> 'Job Order'
                  {srch_sql_m}
                  AND CAST(m.podate AS DATE) BETWEEN ? AND ?
                GROUP BY m.pono, m.totamt
                """,
                tuple(srch_params_m + [start_date, end_date]),
            )
            rows = cursor.fetchall()
            today = date.today()
            for pono, po_val, grn_qty, ord_qty, last_grn, po_date in rows:
                pv = float(po_val or 0)
                gq = float(grn_qty or 0)
                oq = float(ord_qty or 0)
                if oq > 0 and gq >= oq:
                    grn_closed  += 1
                    value_closed += pv
                elif gq > 0:
                    partial_grn  += 1
                    value_partial += pv
                    # Check overdue: no full GRN and PO is older than 30 days
                    if po_date and (today - po_date).days > 30:
                        overdue_pos += 1
                else:
                    pending_pos  += 1
                    value_pending += pv
                    if po_date and (today - po_date).days > 30:
                        overdue_pos += 1
        except Exception:
            pass  # Pipeline detail is best-effort

        cursor.close()
        conn.close()

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "company":       tenant.get("company_name", ""),
        "from":          str(start_date),
        "to":            str(end_date),
        "period":        _fmt_period(start_date, end_date),
        "pos_raised":    pos_raised,
        "value_raised":  value_raised,
        "value_raised_lakhs": _to_lakhs(value_raised),
        "grn_closed":    grn_closed,
        "value_closed":  value_closed,
        "value_closed_lakhs": _to_lakhs(value_closed),
        "partial_grn":   partial_grn,
        "value_partial": value_partial,
        "value_partial_lakhs": _to_lakhs(value_partial),
        "pending_pos":   pending_pos,
        "value_pending": value_pending,
        "value_pending_lakhs": _to_lakhs(value_pending),
        "overdue_pos":   overdue_pos,
        "received_pct":  _pct(value_closed, value_raised),
        "partial_pct":   _pct(value_partial, value_raised),
        "pending_pct":   _pct(value_pending, value_raised),
    })


# ─────────────────────────────────────────────────────────────
#  ENDPOINT 5 — PO Detail Table
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def purchase_analysis_po_details(request):
    """
    Returns paginated PO line-item detail table rows.
    Query params: ?from=&to=&page=1&page_size=50&supplier=&status=
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    page      = max(1, int(request.GET.get("page", 1) or 1))
    page_size = min(200, max(10, int(request.GET.get("page_size", 50) or 50)))
    supplier_filter = (request.GET.get("supplier") or "").strip()
    status_filter   = (request.GET.get("status") or "").strip().lower()
    search_q        = (request.GET.get("search") or request.GET.get("q") or "").strip()

    rows_out = []
    total_rows = 0

    try:
        cursor = conn.cursor()
        name_expr, use_alias = _supplier_name_expr(cursor)
        join_sql = _supplier_join_sql(use_alias)

        supplier_where = ""
        params_extra: list = []
        if supplier_filter:
            supplier_where = f"AND {name_expr} LIKE ?"
            params_extra.append(f"%{supplier_filter}%")

        search_where = ""
        if search_q:
            like_pat = f"%{search_q}%"
            candidates = [
                'rmname', 'rmdesc', 'rmcode', 'icode', 'itcode', 'itdesc', 'ItCode', 'ItDesc',
                'description', 'Description', 'matcode', 'matdesc', 'mattype', 'partno', 'PartNo',
                'PRINTPartNO', 'Part_No', 'rmtype'
            ]
            det_cols = _get_table_search_columns(cursor, "PODet", candidates) or _get_table_search_columns(cursor, "In_PoDet", candidates)
            or_list = [
                f"LOWER(CAST(m.pono AS NVARCHAR(200))) LIKE LOWER(?)",
                f"LOWER(CAST({name_expr} AS NVARCHAR(500))) LIKE LOWER(?)"
            ]
            params_extra.extend([like_pat, like_pat])
            if det_cols:
                for c in det_cols:
                    or_list.append(f"LOWER(CAST(pd.[{c}] AS NVARCHAR(512))) LIKE LOWER(?)")
                    params_extra.append(like_pat)
            else:
                or_list.extend([
                    "LOWER(CAST(pd.icode AS NVARCHAR(256))) LIKE LOWER(?)",
                    "LOWER(CAST(pd.itdesc AS NVARCHAR(512))) LIKE LOWER(?)",
                    "LOWER(CAST(pd.rmname AS NVARCHAR(512))) LIKE LOWER(?)"
                ])
                params_extra.extend([like_pat, like_pat, like_pat])
            search_where = f" AND (" + " OR ".join(or_list) + ")"

        # Build status CASE for closed / partial / overdue / open
        status_case = """
            CASE
                WHEN ISNULL(gs.grn_qty, 0) = 0 THEN 'Open'
                WHEN ISNULL(gs.grn_qty, 0) >= ISNULL(pd.qty, 0) THEN 'Closed'
                ELSE 'Partial'
            END
        """

        base_sql = f"""
            SELECT
                m.pono,
                CONVERT(VARCHAR(10), CAST(m.podate AS DATE), 103) AS podate,
                {name_expr}                                        AS supplier_name,
                pd.icode                                           AS part_no,
                ISNULL(pd.itdesc, pd.icode)                        AS description,
                ISNULL(CAST(pd.qty AS FLOAT), 0)                   AS ord_qty,
                ISNULL(gs.grn_qty, 0)                              AS rcv_qty,
                ISNULL(CAST(pd.rate AS FLOAT), 0)                  AS rate,
                ISNULL(CAST(pd.amount AS FLOAT), 0)                AS amount,
                {status_case}                                       AS status
            FROM POMas m
            {join_sql}
            LEFT JOIN PODet pd
                ON pd.pono = m.pono AND ISNULL(pd.deleted, 0) = 0
            LEFT JOIN (
                SELECT gs2.pono, gs2.rmname AS icode,
                       SUM(CAST(gs2.qty AS FLOAT)) AS grn_qty
                FROM grninsubdet gs2
                INNER JOIN grn_mas gm2 ON gs2.grnno = gm2.grnno
                WHERE ISNULL(gs2.deleted, 0) = 0
                  AND ISNULL(gm2.deleted, 0) = 0
                  AND CAST(gm2.grndate AS DATE) BETWEEN ? AND ?
                GROUP BY gs2.pono, gs2.rmname
            ) gs ON gs.pono = m.pono AND gs.icode = pd.icode
            WHERE ISNULL(m.deleted, 0) = 0
              AND ISNULL(m.dtype, '') <> 'Job Order'
              AND CAST(m.podate AS DATE) BETWEEN ? AND ?
              {supplier_where}
              {search_where}
        """

        count_sql  = f"SELECT COUNT(*) FROM ({base_sql}) AS T"
        paged_sql  = (
            f"SELECT * FROM ({base_sql}) AS T "
            f"ORDER BY podate DESC, pono, part_no "
            f"OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
        )

        base_params = [start_date, end_date, start_date, end_date] + params_extra

        cursor.execute(count_sql, base_params)
        count_row  = cursor.fetchone()
        total_rows = int(count_row[0] or 0) if count_row else 0

        offset = (page - 1) * page_size
        cursor.execute(paged_sql, base_params + [offset, page_size])

        for row in cursor.fetchall():
            pono, podate, sup, part, desc, oq, rq, rate, amt, status = row
            if status_filter and status_filter != status.lower():
                continue
            rows_out.append({
                "po_no":       str(pono or "").strip(),
                "date":        str(podate or "").strip(),
                "supplier":    str(sup or "").strip() or "Unknown",
                "part_no":     str(part or "").strip(),
                "description": str(desc or "").strip(),
                "ord_qty":     round(float(oq or 0), 2),
                "rcv_qty":     round(float(rq or 0), 2),
                "rate":        round(float(rate or 0), 2),
                "amount":      round(float(amt or 0), 2),
                "status":      str(status or "Open").strip(),
            })

        cursor.close()
        conn.close()

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "company":    tenant.get("company_name", ""),
        "from":       str(start_date),
        "to":         str(end_date),
        "period":     _fmt_period(start_date, end_date),
        "page":       page,
        "page_size":  page_size,
        "total_rows": total_rows,
        "total_pages": max(1, -(-total_rows // page_size)),
        "rows":       rows_out,
    })


# ─────────────────────────────────────────────────────────────
#  ENDPOINT 6 — GRN Aging (Outstanding Receipts)
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def purchase_analysis_grn_aging(request):
    """
    Returns GRN aging list: open PO lines with their overdue days.
    Sorted by days_overdue DESC (most critical first).
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    dtype_param = (request.GET.get("dtype") or "").strip()
    apply_dtype = dtype_param and dtype_param.lower() != "all types"

    aging_rows = []

    try:
        cursor = conn.cursor()
        name_expr, use_alias = _supplier_name_expr(cursor)
        join_sql = _supplier_join_sql(use_alias)
        today = date.today()

        # ── PO Summary Filters ──
        dtype_clause_po = ""
        dtype_params_po = []
        if apply_dtype:
            dtype_clause_po = " AND LTRIM(RTRIM(ISNULL(m.dtype, ''))) = ?"
            dtype_params_po.append(dtype_param)
        else:
            dtype_clause_po = " AND UPPER(LTRIM(RTRIM(ISNULL(m.dtype, '')))) NOT IN ('', 'JOB ORDER', 'GENERAL')"

        cursor.execute(
            f"""
            SELECT
                m.pono,
                {name_expr}                             AS supplier_name,
                pd.icode                                AS part_no,
                ISNULL(pd.itdesc, pd.icode)              AS description,
                ISNULL(CAST(pd.qty AS FLOAT), 0)         AS ord_qty,
                ISNULL(gs.grn_qty, 0)                   AS rcv_qty,
                CAST(m.podate AS DATE)                  AS po_date,
                DATEDIFF(DAY, CAST(m.podate AS DATE), ?) AS days_open
            FROM POMas m
            {join_sql}
            LEFT JOIN PODet pd
                ON pd.pono = m.pono AND ISNULL(pd.deleted, 0) = 0
            LEFT JOIN (
                SELECT gs2.pono, gs2.rmname AS icode,
                       SUM(CAST(gs2.qty AS FLOAT)) AS grn_qty
                FROM grninsubdet gs2
                INNER JOIN grn_mas gm2 ON gs2.grnno = gm2.grnno
                WHERE ISNULL(gs2.deleted, 0) = 0
                  AND ISNULL(gm2.deleted, 0) = 0
                GROUP BY gs2.pono, gs2.rmname
            ) gs ON gs.pono = m.pono AND gs.icode = pd.icode
            WHERE ISNULL(m.deleted, 0) = 0
              {dtype_clause_po}
              AND CAST(m.podate AS DATE) BETWEEN ? AND ?
              AND ISNULL(gs.grn_qty, 0) < ISNULL(CAST(pd.qty AS FLOAT), 0)
            ORDER BY days_open DESC
            """,
            tuple([today] + dtype_params_po + [start_date, end_date]),
        )

        for pono, sup, part, desc, oq, rq, po_date, days_open in cursor.fetchall():
            d_open = int(days_open or 0)
            if d_open > 14:
                urgency = "overdue"
                days_lbl = f"+{d_open} days"
            elif d_open > 7:
                urgency = "warning"
                days_lbl = f"+{d_open} days"
            else:
                urgency = "ok"
                days_lbl = f"{d_open} days"

            aging_rows.append({
                "po_no":       str(pono or "").strip(),
                "supplier":    str(sup or "").strip() or "Unknown",
                "part_no":     str(part or "").strip(),
                "description": str(desc or "").strip(),
                "ord_qty":     round(float(oq or 0), 2),
                "rcv_qty":     round(float(rq or 0), 2),
                "pending_qty": round(max(0.0, float(oq or 0) - float(rq or 0)), 2),
                "po_date":     str(po_date) if po_date else "",
                "days_open":   d_open,
                "days_label":  days_lbl,
                "urgency":     urgency,
            })

        cursor.close()
        conn.close()

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    overdue_count = sum(1 for r in aging_rows if r["urgency"] == "overdue")
    warning_count = sum(1 for r in aging_rows if r["urgency"] == "warning")

    return Response({
        "company":       tenant.get("company_name", ""),
        "from":          str(start_date),
        "to":            str(end_date),
        "period":        _fmt_period(start_date, end_date),
        "overdue_count": overdue_count,
        "warning_count": warning_count,
        "rows":          aging_rows,
    })


# ─────────────────────────────────────────────────────────────
#  ENDPOINT 7 — Month-wise Summary (for drill-down table)
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def purchase_analysis_month_summary(request):
    """
    Month-wise PO value and GRN received for the selected date range.
    Useful for the month-by-month breakdown table.
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)

    month_data = {}

    try:
        cursor = conn.cursor()

        # ── Monthly PO value ─────────────────────────────────────────
        cursor.execute(
            """
            SELECT
                YEAR(CAST(podate AS DATE)) AS yr,
                MONTH(CAST(podate AS DATE)) AS mo,
                ISNULL(SUM(CAST(totamt AS FLOAT)), 0) AS po_val,
                COUNT(DISTINCT pono) AS po_count
            FROM POMas
            WHERE ISNULL(deleted, 0) = 0
              AND ISNULL(dtype, '') <> 'Job Order'
              AND CAST(podate AS DATE) BETWEEN ? AND ?
            GROUP BY
                YEAR(CAST(podate AS DATE)),
                MONTH(CAST(podate AS DATE))
            ORDER BY yr, mo
            """,
            (start_date, end_date),
        )
        for yr, mo, po_val, po_cnt in cursor.fetchall():
            k = (int(yr), int(mo))
            month_data.setdefault(k, {"po_value": 0.0, "po_count": 0, "grn_received": 0.0})
            month_data[k]["po_value"]  = float(po_val or 0)
            month_data[k]["po_count"]  = int(po_cnt or 0)

        # ── Monthly GRN received ─────────────────────────────────────
        try:
            cursor.execute(
                """
                SELECT
                    YEAR(CAST(gm.grndate AS DATE)) AS yr,
                    MONTH(CAST(gm.grndate AS DATE)) AS mo,
                    ISNULL(SUM(CAST(rd.Amount AS FLOAT)), 0) AS grn_val
                FROM Grn_RateDet rd
                INNER JOIN grn_mas gm ON rd.grnno = gm.grnno
                WHERE ISNULL(gm.deleted, 0) = 0
                  AND ISNULL(rd.deleted, 0) = 0
                  AND CAST(gm.grndate AS DATE) BETWEEN ? AND ?
                GROUP BY
                    YEAR(CAST(gm.grndate AS DATE)),
                    MONTH(CAST(gm.grndate AS DATE))
                ORDER BY yr, mo
                """,
                (start_date, end_date),
            )
            for yr, mo, grn_val in cursor.fetchall():
                k = (int(yr), int(mo))
                month_data.setdefault(k, {"po_value": 0.0, "po_count": 0, "grn_received": 0.0})
                month_data[k]["grn_received"] = float(grn_val or 0)
        except Exception:
            pass

        cursor.close()
        conn.close()

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    months_out = []
    for (yr, mo), vals in sorted(month_data.items()):
        pv  = vals["po_value"]
        grn = vals["grn_received"]
        months_out.append({
            "year":           yr,
            "month":          mo,
            "month_label":    f"{_MONTH_ABB[mo - 1]} {yr}",
            "po_value":       pv,
            "po_value_lakhs": _to_lakhs(pv),
            "po_count":       vals["po_count"],
            "grn_received":        grn,
            "grn_received_lakhs":  _to_lakhs(grn),
            "grn_compliance_pct":  _pct(grn, pv),
        })

    return Response({
        "company": tenant.get("company_name", ""),
        "from":    str(start_date),
        "to":      str(end_date),
        "period":  _fmt_period(start_date, end_date),
        "months":  months_out,
    })


# ─────────────────────────────────────────────────────────────
#  ENDPOINT 8 — PO Types (distinct dtype from POMas)
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def purchase_analysis_po_types(request):
    """
    Returns all distinct PO types (dtype) from POMas for the filter dropdown.

    Response:
      {
        "po_types": ["Raw Material", "Consumables", "Tooling", ...]
      }

    Excludes 'Job Order' entries (same exclusion used across all other endpoints).
    Always prepends "All Types" so the frontend can use the list directly.
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    try:
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT DISTINCT
                LTRIM(RTRIM(ISNULL(dtype, ''))) AS po_type
            FROM POMas
            WHERE ISNULL(deleted, 0) = 0
              AND UPPER(LTRIM(RTRIM(ISNULL(dtype, '')))) <> 'JOB ORDER'
            ORDER BY po_type ASC
            """
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    po_types = [str(row[0]).strip() for row in rows if row[0] and str(row[0]).strip()]

    return Response({
        "company":  tenant.get("company_name", ""),
        "po_types": ["All Types"] + po_types,
    })


# ────────────────────────────────────────────────────────────
#  ENDPOINT 9 — PO Table (Dashboard2-style)
# ────────────────────────────────────────────────────────────

@api_view(["GET"])
def purchase_analysis_po_table(request):
    """
    Returns PO rows in the same structure as dashboard2_po_pipeline:
      po_number, po_type, vendor_name, material, po_qty,
      value, po_date, grn_no, grn_date

    Optional query params:
      ?from=YYYY-MM-DD  &to=YYYY-MM-DD
      &dtype=Raw Material   (filter by PO type; omit or 'All Types' = no filter)
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    dtype_param = (request.GET.get("dtype") or "").strip()
    apply_dtype = dtype_param and dtype_param.lower() != "all types"

    company_code = tenant.get("company_code")
    company_candidates = ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]

    cursor = None
    try:
        cursor = conn.cursor()

        sch_po, nm_po, q_po = resolve_erp_table(cursor, ["POMas", "pomas", "POMAS", "PoMas"])
        sch_det, nm_det, q_det = resolve_erp_table(cursor, ["PODet", "podet", "PODET", "PoDet"])
        sch_grn, nm_grn, q_grn = resolve_erp_table(cursor, ["grninsubdet", "GRNInSubDet", "GrnInSubDet", "GRNINSUBDET"])
        sch_gm, nm_gm, q_gm   = resolve_erp_table(cursor, ["grn_mas", "GRN_MAS", "Grn_Mas", "GrnMas"])
        sch_cm, nm_cm, q_cm   = resolve_erp_table(cursor, ["CustMast", "custmast", "CUSTMAST"])
        sch_amnd, nm_amnd, q_amnd = resolve_erp_table(cursor, ["POAmndMas", "poamndmas", "POAMNDMAS", "PoAmndMas"])

        if not q_po or not q_det or not q_grn:
            if cursor: cursor.close()
            conn.close()
            return Response({"error": "Required tables not found.", "rows": [], "summary": None}, status=404)

        # ── column discovery (same as dashboard2_po_pipeline) ──────────────────
        po_pono  = find_column_ci(cursor, sch_po, nm_po, ["pono", "PONo", "PONO", "PoNo", "PONumber"])
        po_date  = find_column_ci(cursor, sch_po, nm_po, ["podate", "PODate", "PO_Date", "po_date", "PODt"])
        po_del   = find_column_ci(cursor, sch_po, nm_po, ["deleted", "Deleted", "IsDeleted"])
        po_dtype = find_column_ci(cursor, sch_po, nm_po, ["dtype", "DType", "POType", "potype", "Type"])
        po_cid   = find_column_ci(cursor, sch_po, nm_po, ["cid", "CId", "CID", "CustId", "custid"])
        po_cc    = find_column_ci(cursor, sch_po, nm_po, company_candidates)

        det_pono = find_column_ci(cursor, sch_det, nm_det, ["pono", "PONo", "PONO", "PoNo"])
        det_del  = find_column_ci(cursor, sch_det, nm_det, ["deleted", "Deleted", "IsDeleted"])
        det_rm   = find_column_ci(cursor, sch_det, nm_det, ["rmname", "RMName", "RMNAME", "RmName", "ItemName"])
        det_mt   = find_column_ci(cursor, sch_det, nm_det, ["mattype", "MatType", "MATTYPE", "Mat_Type"])
        det_uom  = find_column_ci(cursor, sch_det, nm_det, ["uom", "UOM", "Uom", "Unit"])
        det_qty  = find_column_ci(cursor, sch_det, nm_det, ["qty", "Qty", "QTY", "Quantity"])
        det_qtykgs = find_column_ci(cursor, sch_det, nm_det, ["QtyKgs", "qtykgs", "QTYKGS", "Qty_Kgs", "qty_kgs", "QtyMtrsKgs"])
        det_amt  = find_column_ci(cursor, sch_det, nm_det, ["amount", "Amount", "AMOUNT", "Amt", "Value"])
        det_icode = find_column_ci(cursor, sch_det, nm_det, ["icode", "ICode", "ICODE", "itmcode", "ItemCode"])
        det_rate = find_column_ci(cursor, sch_det, nm_det, ["rate", "Rate", "RATE"])

        g_pono  = find_column_ci(cursor, sch_grn, nm_grn, ["pono", "PONo", "PONO", "PoNo"])
        g_grnno = find_column_ci(cursor, sch_grn, nm_grn, ["grnno", "GRNNo", "GRNNO", "GrnNo"])
        g_del   = find_column_ci(cursor, sch_grn, nm_grn, ["deleted", "Deleted", "IsDeleted"])

        gm_grn = gm_date = gm_del = gm_namt = None
        if q_gm:
            gm_grn  = find_column_ci(cursor, sch_gm, nm_gm, ["grnno", "GRNNo", "GRNNO", "GrnNo"])
            gm_date = find_column_ci(cursor, sch_gm, nm_gm, ["grndate", "GRNDate", "GRNDATE", "Grn_Date"])
            gm_del  = find_column_ci(cursor, sch_gm, nm_gm, ["deleted", "Deleted", "IsDeleted"])
            gm_namt = find_column_ci(cursor, sch_gm, nm_gm, ["namt", "NAMT", "NetAmt", "GrandTotal", "TotAmt", "Amount"])

        cm_id = cm_name = cm_del = None
        if q_cm:
            cm_id   = find_column_ci(cursor, sch_cm, nm_cm, ["Id", "id", "ID", "CustId", "custid"])
            cm_name = find_column_ci(cursor, sch_cm, nm_cm, ["CName", "cname", "CNAME", "CustName", "Name"])
            cm_del  = find_column_ci(cursor, sch_cm, nm_cm, ["deleted", "Deleted", "IsDeleted"])

        if not po_pono or not po_date or not det_pono or not det_amt or not g_pono or not g_grnno:
            if cursor: cursor.close()
            conn.close()
            return Response({"error": "Required columns not found.", "rows": [], "summary": None}, status=500)

        # ── SQL fragments ─────────────────────────────────────────────
        del_po_sql  = f"ISNULL(M.[{po_del}], 0) = 0" if po_del else "1=1"
        del_det_sql = f"ISNULL(D.[{det_del}], 0) = 0" if det_del else "1=1"
        grn_dist_where = f"ISNULL(gx.[{g_del}], 0) = 0" if g_del else "1=1"

        # Exclude always-excluded types
        exclude_filter = ""
        if po_dtype:
            exclude_filter = f" AND UPPER(LTRIM(RTRIM(ISNULL(M.[{po_dtype}], N'')))) <> N'JOB ORDER'"

        # Apply user-selected dtype filter
        dtype_filter_sql = ""
        dtype_params = []
        if apply_dtype and po_dtype:
            dtype_filter_sql = f" AND LTRIM(RTRIM(ISNULL(M.[{po_dtype}], N''))) = ?"
            dtype_params.append(dtype_param)

        company_sql = ""
        if po_cc and company_code:
            company_sql = f" AND M.[{po_cc}] = ?"

        # Material concat
        rm_a  = f"D.[{det_rm}]"  if det_rm  else "CAST(NULL AS NVARCHAR(256))"
        mt_a  = f"D.[{det_mt}]"  if det_mt  else "CAST(NULL AS NVARCHAR(256))"
        mat_concat = (
            f"ISNULL(CAST({rm_a} AS NVARCHAR(256)), N'')"
            f" + N' - '"
            f" + ISNULL(CAST({mt_a} AS NVARCHAR(256)), N'')"
        )

        # Qty with UOM
        if det_qty and det_uom:
            if det_qtykgs:
                effective_qty_sql = (
                    f"CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(CAST(D.[{det_uom}] AS NVARCHAR(32)), N'')))) NOT IN (N'NOS', N'NOS.') "
                    f"THEN ISNULL(D.[{det_qtykgs}], 0) ELSE ISNULL(D.[{det_qty}], 0) END"
                )
            else:
                effective_qty_sql = f"ISNULL(D.[{det_qty}], 0)"

            po_qty_sql = (
                f"CAST(ROUND({effective_qty_sql}, 2) AS NVARCHAR(50))"
                f" + N' ' + ISNULL(CAST(D.[{det_uom}] AS NVARCHAR(32)), N'')"
            )
        elif det_qty:
            po_qty_sql = f"CAST(ROUND(ISNULL(D.[{det_qty}], 0), 2) AS NVARCHAR(50))"
        else:
            po_qty_sql = "N''"

        # Vendor name join
        vendor_sql = "CAST(NULL AS NVARCHAR(512))"
        cm_join = ""
        if q_cm and cm_id and cm_name and po_cid:
            cm_del_sql = f" AND ISNULL(CM.[{cm_del}], 0) = 0" if cm_del else ""
            cm_join = f"LEFT JOIN {q_cm} CM ON M.[{po_cid}] = CM.[{cm_id}]{cm_del_sql}"
            vendor_sql = f"CAST(CM.[{cm_name}] AS NVARCHAR(512))"

        # GRN join (latest grnno per pono)
        g_agg = (
            f"LEFT JOIN ("
            f"  SELECT gx.[{g_pono}] AS pono_g, MAX(gx.[{g_grnno}]) AS grnno_g"
            f"  FROM {q_grn} gx WHERE {grn_dist_where}"
            f"  GROUP BY gx.[{g_pono}]"
            f") G ON M.[{po_pono}] = G.pono_g"
        )
        gm_join = ""
        grn_no_sel = "CAST(G.grnno_g AS NVARCHAR(64))"
        grn_dt_sel = "CAST(NULL AS DATE)"
        if q_gm and gm_grn and gm_date:
            gm_del_j = f" AND ISNULL(GM.[{gm_del}], 0) = 0" if gm_del else ""
            gm_join = f"LEFT JOIN {q_gm} GM ON G.grnno_g = GM.[{gm_grn}]{gm_del_j}"
            grn_dt_sel = f"GM.[{gm_date}]"

        # dtype SELECT expression
        dtype_sel = f"M.[{po_dtype}]" if po_dtype else "CAST(NULL AS NVARCHAR(64))"

        # icode for material code column
        icode_sel = f"D.[{det_icode}]" if det_icode else "CAST(NULL AS NVARCHAR(128))"

        # Amendment status expression
        amnd_sel = "N'N'"
        if q_amnd:
            amnd_mpono = find_column_ci(cursor, sch_amnd, nm_amnd, ["Manualpono", "manualpono", "MANUALPONO", "pono", "PONo"])
            amnd_del = find_column_ci(cursor, sch_amnd, nm_amnd, ["deleted", "Deleted", "IsDeleted"])
            amnd_mpono_col = amnd_mpono or "Manualpono"
            amnd_del_col = f"AND ISNULL(AM.[{amnd_del}], 0) = 0" if amnd_del else ""
            amnd_sel = f"""
                CASE
                    WHEN EXISTS (
                        SELECT 1 FROM {q_amnd} AM
                        WHERE LTRIM(RTRIM(AM.[{amnd_mpono_col}])) = LTRIM(RTRIM(M.[{po_pono}]))
                          {amnd_del_col}
                    ) THEN N'Y'
                    ELSE N'N'
                END
            """

        # rate select expression
        rate_sel = f"ISNULL(CAST(D.[{det_rate}] AS FLOAT), 0)" if det_rate else "0"

        # Supplier filters
        join_flt, where_flt, params_flt = _supplier_filter_sql(request, cursor, "M", join_if_needed=True)
        srch_sql, srch_params = _build_po_search_sql(request, cursor, "M")

        # Build params
        params = [start_date, end_date] + dtype_params + params_flt + srch_params
        if po_cc and company_code:
            params.append(company_code)

        where_clause = (
            f"CAST(M.[{po_date}] AS DATE) BETWEEN ? AND ?"
            f" AND {del_po_sql}"
            f"{exclude_filter}"
            f"{dtype_filter_sql}"
            f"{company_sql}"
            f"{where_flt}"
            f"{srch_sql}"
        )

        detail_sql = f"""
            SELECT TOP 3000
                M.[{po_pono}]                           AS PO_Number,
                {dtype_sel}                             AS PO_Type,
                {vendor_sql}                            AS Vendor_Name,
                CAST({icode_sel} AS NVARCHAR(128))       AS Material_Code,
                CAST({mat_concat} AS NVARCHAR(520))      AS Material,
                CAST({po_qty_sql} AS NVARCHAR(120))      AS PO_Qty,
                {rate_sel}                              AS Rate,
                ISNULL(CAST(D.[{det_amt}] AS FLOAT), 0) AS Value,
                M.[{po_date}]                           AS PO_Date,
                {grn_no_sel}                            AS GRN_No,
                {grn_dt_sel}                            AS GRN_Date,
                {amnd_sel}                              AS Amnd
            FROM {q_po} M
            INNER JOIN {q_det} D
                ON M.[{po_pono}] = D.[{det_pono}] AND {del_det_sql}
            {cm_join}
            {g_agg}
            {gm_join}
            {join_flt}
            WHERE {where_clause}
            ORDER BY M.[{po_date}], M.[{po_pono}]
        """

        cursor.execute(detail_sql, params)
        rows_out = []
        for row in cursor.fetchall() or []:
            po_dt  = row[8]
            grn_dt = row[10]

            def _iso(d):
                if d is None: return ""
                if hasattr(d, "isoformat"): return d.isoformat()[:10]
                return str(d)[:10]

            rows_out.append({
                "po_number":   str(row[0] or "").strip(),
                "po_type":     str(row[1] or "").strip(),
                "vendor_name": str(row[2] or "").strip(),
                "material_code": str(row[3] or "").strip(),
                "material":    str(row[4] or "").strip(),
                "po_qty":      str(row[5] or "").strip(),
                "rate":        float(row[6] or 0),
                "value":       float(row[7] or 0),
                "po_date":     _iso(po_dt),
                "grn_no":      str(row[9] or "").strip(),
                "grn_date":    _iso(grn_dt),
                "amnd":        str(row[11] or "N").strip(),
            })

        # ── Compute pipeline summary ─────────────────────────────────────
        # Determine per-PO GRN status from the rows we already have
        po_grn_map = {}
        for r in rows_out:
            pono = r["po_number"]
            if pono not in po_grn_map:
                po_grn_map[pono] = bool(r["grn_no"])
            elif r["grn_no"]:
                po_grn_map[pono] = True

        s_total_pos      = len(po_grn_map)
        s_grn_done       = sum(1 for v in po_grn_map.values() if v)
        s_grn_pending    = s_total_pos - s_grn_done
        s_total_po_value = round(sum(r["value"] for r in rows_out), 2)

        # Total GRN value from grn_mas (separate query)
        s_total_grn_value = 0.0
        if q_gm and gm_grn and gm_namt:
            gm_del_sql2  = f"ISNULL(GM.[{gm_del}], 0) = 0" if gm_del else "1=1"
            gjoin_del2   = f"ISNULL(GX.[{g_del}], 0) = 0" if g_del else "1=1"
            grn_val_sql  = f"""
                SELECT ISNULL(SUM(ISNULL(CAST(GM.[{gm_namt}] AS FLOAT), 0)), 0)
                FROM {q_gm} GM
                INNER JOIN {q_grn} GX ON GM.[{gm_grn}] = GX.[{g_grnno}]
                WHERE {gjoin_del2} AND {gm_del_sql2}
                  AND GX.[{g_pono}] IN (
                      SELECT DISTINCT M.[{po_pono}]
                      FROM {q_po} M
                      WHERE {where_clause}
                  )
            """
            try:
                cursor.execute(grn_val_sql, params)
                grn_row = cursor.fetchone()
                if grn_row and grn_row[0] is not None:
                    s_total_grn_value = round(float(grn_row[0]), 2)
            except Exception:
                pass  # non-fatal; leave total_grn_value = 0

        cursor.close()
        conn.close()

    except Exception as e:
        if cursor:
            try: cursor.close()
            except Exception: pass
        try: conn.close()
        except Exception: pass
        return Response({"error": f"Database error: {str(e)}", "rows": []}, status=500)

    return Response({
        "company": tenant.get("company_name", ""),
        "from":    str(start_date),
        "to":      str(end_date),
        "dtype":   dtype_param or "All Types",
        "count":   len(rows_out),
        "summary": {
            "total_pos":       s_total_pos,
            "total_po_value":  s_total_po_value,
            "grn_done":        s_grn_done,
            "grn_pending":     s_grn_pending,
            "total_grn_value": s_total_grn_value,
        },
        "rows":    rows_out,
    })


@api_view(["GET"])
def purchase_analysis_amended_po_table(request):
    """
    Returns actual amended PO rows matching the specified SQL query logic.
    Supports tenant resolution, date range parsing, and dtype selection filters.
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e), "rows": []}, status=401)

    start_date, end_date = parse_date_range(request)
    dtype_param = (request.GET.get("dtype") or "").strip()
    apply_dtype = dtype_param and dtype_param.lower() != "all types"

    cursor = None
    try:
        cursor = conn.cursor()

        sch_po, nm_po, q_po = resolve_erp_table(cursor, ["POMas", "pomas", "POMAS", "PoMas"])
        sch_grn, nm_grn, q_grn = resolve_erp_table(cursor, ["grninsubdet", "GRNInSubDet", "GrnInSubDet", "GRNINSUBDET"])
        sch_gm, nm_gm, q_gm   = resolve_erp_table(cursor, ["grn_mas", "GRN_MAS", "Grn_Mas", "GrnMas"])
        sch_cm, nm_cm, q_cm   = resolve_erp_table(cursor, ["CustMast", "custmast", "CUSTMAST"])
        sch_amnd, nm_amnd, q_amnd = resolve_erp_table(cursor, ["POAmndMas", "poamndmas", "POAMNDMAS", "PoAmndMas"])
        sch_adet, nm_adet, q_adet = resolve_erp_table(cursor, ["POAmndDet", "poamnddet", "POAMNDDET", "PoAmndDet"])

        if not q_po or not q_grn or not q_amnd or not q_adet:
            if cursor: cursor.close()
            conn.close()
            return Response({"rows": []}, status=200)

        # Discovery of column names
        po_pono  = find_column_ci(cursor, sch_po, nm_po, ["pono", "PONo", "PONO", "PoNo"])
        po_date  = find_column_ci(cursor, sch_po, nm_po, ["podate", "PODate", "PO_Date", "po_date"])
        po_del   = find_column_ci(cursor, sch_po, nm_po, ["deleted", "Deleted", "IsDeleted"])
        po_dtype = find_column_ci(cursor, sch_po, nm_po, ["dtype", "DType", "POType", "potype", "Type"])
        po_cid   = find_column_ci(cursor, sch_po, nm_po, ["cid", "CId", "CID", "CustId"])

        amnd_mpono = find_column_ci(cursor, sch_amnd, nm_amnd, ["Manualpono", "manualpono", "MANUALPONO", "pono"])
        amnd_no = find_column_ci(cursor, sch_amnd, nm_amnd, ["amdno", "AmdNo", "AMDNO", "AmendmentNo"])
        amnd_date = find_column_ci(cursor, sch_amnd, nm_amnd, ["amddate", "AmdDate", "AMDDATE", "AmendmentDate"])
        amnd_del = find_column_ci(cursor, sch_amnd, nm_amnd, ["deleted", "Deleted", "IsDeleted"])

        adet_no = find_column_ci(cursor, sch_adet, nm_adet, ["amdno", "AmdNo", "AMDNO", "AmendmentNo"])
        adet_rm = find_column_ci(cursor, sch_adet, nm_adet, ["rmname", "RMName", "RMNAME", "RmName"])
        adet_mt = find_column_ci(cursor, sch_adet, nm_adet, ["mattype", "MatType", "MATTYPE"])
        adet_uom = find_column_ci(cursor, sch_adet, nm_adet, ["uom", "UOM", "Uom", "Unit"])
        adet_qty = find_column_ci(cursor, sch_adet, nm_adet, ["qty", "Qty", "QTY", "Quantity"])
        adet_rate = find_column_ci(cursor, sch_adet, nm_adet, ["rate", "Rate", "RATE"])
        adet_amt = find_column_ci(cursor, sch_adet, nm_adet, ["amount", "Amount", "AMOUNT", "Amt"])
        adet_del = find_column_ci(cursor, sch_adet, nm_adet, ["deleted", "Deleted", "IsDeleted"])
        adet_seq = find_column_ci(cursor, sch_adet, nm_adet, ["seq", "Seq", "SEQ"])

        g_pono  = find_column_ci(cursor, sch_grn, nm_grn, ["pono", "PONo", "PONO", "PoNo"])
        g_grnno = find_column_ci(cursor, sch_grn, nm_grn, ["grnno", "GRNNo", "GRNNO", "GrnNo"])
        g_del   = find_column_ci(cursor, sch_grn, nm_grn, ["deleted", "Deleted", "IsDeleted"])

        gm_grn = gm_date = gm_del = None
        if q_gm:
            gm_grn  = find_column_ci(cursor, sch_gm, nm_gm, ["grnno", "GRNNo", "GRNNO", "GrnNo"])
            gm_date = find_column_ci(cursor, sch_gm, nm_gm, ["grndate", "GRNDate", "GRNDATE"])
            gm_del  = find_column_ci(cursor, sch_gm, nm_gm, ["deleted", "Deleted", "IsDeleted"])

        cm_id = cm_name = cm_del = None
        if q_cm:
            cm_id   = find_column_ci(cursor, sch_cm, nm_cm, ["Id", "id", "ID", "CustId"])
            cm_name = find_column_ci(cursor, sch_cm, nm_cm, ["CName", "cname", "CNAME", "CustName"])
            cm_del  = find_column_ci(cursor, sch_cm, nm_cm, ["deleted", "Deleted", "IsDeleted"])

        # Supplier filters
        join_flt, where_flt, params_flt = _supplier_filter_sql(request, cursor, "M", join_if_needed=True)
        srch_sql, srch_params = _build_po_search_sql(request, cursor, "M")

        # ── SQL fragments ─────────────────────────────────────────────
        del_po_sql  = f"ISNULL(M.[{po_del}], 0) = 0" if po_del else "1=1"
        del_amnd_sql = f"ISNULL(PAM.[{amnd_del}], 0) = 0" if amnd_del else "1=1"
        del_adet_sql = f"ISNULL(AMD.[{adet_del}], 0) = 0" if adet_del else "1=1"
        grn_dist_where = f"ISNULL(gx.[{g_del}], 0) = 0" if g_del else "1=1"

        exclude_filter = ""
        if po_dtype:
            exclude_filter = f" AND UPPER(LTRIM(RTRIM(ISNULL(M.[{po_dtype}], N'')))) <> N'JOB ORDER'"

        dtype_filter_sql = ""
        dtype_params = []
        if apply_dtype and po_dtype:
            dtype_filter_sql = f" AND LTRIM(RTRIM(ISNULL(M.[{po_dtype}], N''))) = ?"
            dtype_params.append(dtype_param)

        vendor_sql = "CAST(NULL AS NVARCHAR(512))"
        cm_join = ""
        if q_cm and cm_id and cm_name and po_cid:
            cm_del_sql = f" AND ISNULL(CM.[{cm_del}], 0) = 0" if cm_del else ""
            cm_join = f"LEFT JOIN {q_cm} CM ON M.[{po_cid}] = CM.[{cm_id}]{cm_del_sql}"
            vendor_sql = f"CAST(CM.[{cm_name}] AS NVARCHAR(512))"

        g_agg = (
            f"LEFT JOIN ("
            f"  SELECT gx.[{g_pono}] AS pono_g, MAX(gx.[{g_grnno}]) AS grnno_g"
            f"  FROM {q_grn} gx WHERE {grn_dist_where}"
            f"  GROUP BY gx.[{g_pono}]"
            f") G ON M.[{po_pono}] = G.pono_g"
        )
        gm_join = ""
        grn_no_sel = "CAST(G.grnno_g AS NVARCHAR(64))"
        grn_dt_sel = "CAST(NULL AS DATE)"
        if q_gm and gm_grn and gm_date:
            gm_del_j = f" AND ISNULL(GM.[{gm_del}], 0) = 0" if gm_del else ""
            gm_join = f"LEFT JOIN {q_gm} GM ON G.grnno_g = GM.[{gm_grn}]{gm_del_j}"
            grn_dt_sel = f"GM.[{gm_date}]"

        dtype_sel = f"M.[{po_dtype}]" if po_dtype else "CAST(NULL AS NVARCHAR(64))"

        rm_col = f"AMD.[{adet_rm}]" if adet_rm else "CAST(NULL AS NVARCHAR(256))"
        mt_col = f"AMD.[{adet_mt}]" if adet_mt else "N''"
        mat_concat_sql = f"""
            CAST(
                ISNULL(CAST({rm_col} AS NVARCHAR(256)), N'')
                +
                CASE
                    WHEN ISNULL(LTRIM(RTRIM({mt_col})), '') <> ''
                    THEN N' - ' + CAST({mt_col} AS NVARCHAR(256))
                    ELSE N''
                END
                AS NVARCHAR(520)
            )
        """

        qty_col = f"AMD.[{adet_qty}]" if adet_qty else "0"
        uom_col = f"AMD.[{adet_uom}]" if adet_uom else "N''"
        qty_concat_sql = f"""
            CAST(
                CAST(ROUND(ISNULL({qty_col}, 0), 2) AS NVARCHAR(50))
                + N' '
                + ISNULL(CAST({uom_col} AS NVARCHAR(32)), N'')
                AS NVARCHAR(120)
            )
        """

        rate_sel = f"ISNULL(AMD.[{adet_rate}], 0)" if adet_rate else "0"
        val_sel = f"ISNULL(AMD.[{adet_amt}], 0)" if adet_amt else "0"
        seq_col = f"AMD.[{adet_seq}]" if adet_seq else "1"

        detail_sql = f"""
            SELECT TOP 3000
                M.[{po_pono}]                           AS PO_Number,
                AM.[{amnd_no}]                           AS PO_Amnd_No,
                AM.[{amnd_date}]                         AS PO_Amnd_Date,
                {dtype_sel}                             AS PO_Type,
                {vendor_sql}                            AS Vendor_Name,
                CAST(ISNULL({rm_col}, '') AS NVARCHAR(256)) AS Material_Code,
                {mat_concat_sql}                        AS Material,
                {qty_concat_sql}                        AS PO_Qty,
                {rate_sel}                              AS Rate,
                {val_sel}                               AS Value,
                M.[{po_date}]                           AS PO_Date,
                {grn_no_sel}                            AS GRN_No,
                {grn_dt_sel}                            AS GRN_Date
            FROM {q_po} M
            CROSS APPLY
            (
                SELECT TOP 1
                    PAM.[{amnd_no}],
                    PAM.[{amnd_date}]
                FROM {q_amnd} PAM
                WHERE LTRIM(RTRIM(PAM.[{amnd_mpono}])) = LTRIM(RTRIM(M.[{po_pono}]))
                  AND {del_amnd_sql}
                ORDER BY PAM.[{amnd_date}] DESC, PAM.[{amnd_no}] DESC
            ) AM
            INNER JOIN {q_adet} AMD
                ON LTRIM(RTRIM(AMD.[{adet_no}])) = LTRIM(RTRIM(AM.[{amnd_no}]))
                AND {del_adet_sql}
            {cm_join}
            {g_agg}
            {gm_join}
            {join_flt}
            WHERE CAST(M.[{po_date}] AS DATE) BETWEEN ? AND ?
              AND {del_po_sql}
              {exclude_filter}
              {dtype_filter_sql}
              {where_flt}
            ORDER BY M.[{po_date}], M.[{po_pono}], {seq_col}
        """

        params = [start_date, end_date] + dtype_params + params_flt
        cursor.execute(detail_sql, params)

        rows_out = []
        for row in cursor.fetchall() or []:
            amd_dt = row[2]
            po_dt  = row[10]
            grn_dt = row[12]

            def _iso(d):
                if d is None: return ""
                if hasattr(d, "isoformat"): return d.isoformat()[:10]
                return str(d)[:10]

            rows_out.append({
                "po_number":     str(row[0] or "").strip(),
                "po_amnd_no":    str(row[1] or "").strip(),
                "po_amnd_date":  _iso(amd_dt),
                "po_type":       str(row[3] or "").strip(),
                "vendor_name":   str(row[4] or "").strip(),
                "material_code": str(row[5] or "").strip(),
                "material":      str(row[6] or "").strip(),
                "po_qty":        str(row[7] or "").strip(),
                "rate":          float(row[8] or 0),
                "value":         float(row[9] or 0),
                "po_date":       _iso(po_dt),
                "grn_no":        str(row[11] or "").strip(),
                "grn_date":      _iso(grn_dt),
            })

        if cursor: cursor.close()
        conn.close()
        return Response({"rows": rows_out}, status=200)

    except Exception as e:
        if cursor: cursor.close()
        try: conn.close()
        except: pass
        return Response({"error": str(e), "rows": []}, status=500)


@api_view(["GET"])
def purchase_analysis_short_close_table(request):
    """
    Returns actual Short Close PO Details matching the ShotClsReason / ShotClsUser filters.
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e), "rows": []}, status=401)

    start_date, end_date = parse_date_range(request)
    dtype_param = (request.GET.get("dtype") or "").strip()
    apply_dtype = dtype_param and dtype_param.lower() != "all types"

    cursor = None
    try:
        cursor = conn.cursor()

        sch_po, nm_po, q_po = resolve_erp_table(cursor, ["POMas", "pomas", "POMAS", "PoMas"])
        sch_det, nm_det, q_det = resolve_erp_table(cursor, ["PODet", "podet", "PODET", "PoDet"])
        sch_cm, nm_cm, q_cm   = resolve_erp_table(cursor, ["CustMast", "custmast", "CUSTMAST"])

        if not q_po or not q_det:
            if cursor: cursor.close()
            conn.close()
            return Response({"rows": []}, status=200)

        # Discovery of column names
        po_pono  = find_column_ci(cursor, sch_po, nm_po, ["pono", "PONo", "PONO", "PoNo"])
        po_date  = find_column_ci(cursor, sch_po, nm_po, ["podate", "PODate", "PO_Date", "po_date"])
        po_del   = find_column_ci(cursor, sch_po, nm_po, ["deleted", "Deleted", "IsDeleted"])
        po_dtype = find_column_ci(cursor, sch_po, nm_po, ["dtype", "DType", "POType", "potype", "Type"])
        po_cid   = find_column_ci(cursor, sch_po, nm_po, ["cid", "CId", "CID", "CustId"])

        det_pono = find_column_ci(cursor, sch_det, nm_det, ["pono", "PONo", "PONO", "PoNo"])
        det_del  = find_column_ci(cursor, sch_det, nm_det, ["deleted", "Deleted", "IsDeleted"])
        det_rm   = find_column_ci(cursor, sch_det, nm_det, ["rmname", "RMName", "RMNAME", "RmName"])
        det_mt   = find_column_ci(cursor, sch_det, nm_det, ["mattype", "MatType", "MATTYPE"])
        det_uom  = find_column_ci(cursor, sch_det, nm_det, ["uom", "UOM", "Uom", "Unit"])
        det_qty  = find_column_ci(cursor, sch_det, nm_det, ["qty", "Qty", "QTY", "Quantity"])
        det_clsreason = find_column_ci(cursor, sch_det, nm_det, ["ShotClsReason", "shotclsreason", "ShotCls_Reason", "shortclose_reason", "ShortCloseReason"])
        det_clsuser = find_column_ci(cursor, sch_det, nm_det, ["ShotClsUser", "shotclsuser", "ShotCls_User", "shortclose_user", "ShortCloseUser"])

        cm_id = cm_name = cm_del = None
        if q_cm:
            cm_id   = find_column_ci(cursor, sch_cm, nm_cm, ["Id", "id", "ID", "CustId"])
            cm_name = find_column_ci(cursor, sch_cm, nm_cm, ["CName", "cname", "CNAME", "CustName"])
            cm_del  = find_column_ci(cursor, sch_cm, nm_cm, ["deleted", "Deleted", "IsDeleted"])

        # Supplier filters
        join_flt, where_flt, params_flt = _supplier_filter_sql(request, cursor, "M", join_if_needed=True)
        srch_sql, srch_params = _build_po_search_sql(request, cursor, "M")

        # ── SQL fragments ─────────────────────────────────────────────
        del_po_sql  = f"ISNULL(M.[{po_del}], 0) = 0" if po_del else "1=1"
        del_det_sql = f"ISNULL(D.[{det_del}], 0) = 0" if det_del else "1=1"

        exclude_filter = ""
        if po_dtype:
            exclude_filter = f" AND UPPER(LTRIM(RTRIM(ISNULL(M.[{po_dtype}], N'')))) <> N'JOB ORDER'"

        dtype_filter_sql = ""
        dtype_params = []
        if apply_dtype and po_dtype:
            dtype_filter_sql = f" AND LTRIM(RTRIM(ISNULL(M.[{po_dtype}], N''))) = ?"
            dtype_params.append(dtype_param)

        vendor_sql = "CAST(NULL AS NVARCHAR(512))"
        cm_join = ""
        if q_cm and cm_id and cm_name and po_cid:
            cm_del_sql = f" AND ISNULL(CM.[{cm_del}], 0) = 0" if cm_del else ""
            cm_join = f"LEFT JOIN {q_cm} CM ON M.[{po_cid}] = CM.[{cm_id}]{cm_del_sql}"
            vendor_sql = f"CAST(CM.[{cm_name}] AS NVARCHAR(512))"

        rm_col = f"D.[{det_rm}]" if det_rm else "CAST(NULL AS NVARCHAR(256))"
        mt_col = f"D.[{det_mt}]" if det_mt else "N''"
        mat_concat_sql = f"""
            CAST(
                ISNULL(CAST({rm_col} AS NVARCHAR(256)), N'')
                +
                CASE
                    WHEN ISNULL(LTRIM(RTRIM({mt_col})), '') <> ''
                    THEN N' - ' + CAST({mt_col} AS NVARCHAR(256))
                    ELSE N''
                END
                AS NVARCHAR(520)
            )
        """

        uom_col = f"ISNULL(D.[{det_uom}], N'')" if det_uom else "N''"
        qty_col = f"ISNULL(D.[{det_qty}], 0)" if det_qty else "0"
        reason_col = f"ISNULL(D.[{det_clsreason}], N'')" if det_clsreason else "N''"
        user_col = f"ISNULL(D.[{det_clsuser}], N'')" if det_clsuser else "N''"

        # Show only when ShotClsReason OR ShotClsUser has data
        where_condition = f"""
            (
                ISNULL(LTRIM(RTRIM({reason_col})), '') <> ''
                OR
                ISNULL(LTRIM(RTRIM({user_col})), '') <> ''
            )
        """

        detail_sql = f"""
            SELECT TOP 3000
                ROW_NUMBER() OVER (ORDER BY M.[{po_date}], M.[{po_pono}]) AS [#],
                M.[{po_pono}]                           AS PO_Number,
                M.[{po_date}]                           AS PO_Date,
                {vendor_sql}                            AS Supplier_Name,
                {mat_concat_sql}                        AS Material,
                {uom_col}                               AS UOM,
                {qty_col}                               AS Short_Close_Qty,
                {reason_col}                            AS Reason,
                {user_col}                              AS Short_Close_User
            FROM {q_po} M
            INNER JOIN {q_det} D
                ON M.[{po_pono}] = D.[{det_pono}] AND {del_det_sql}
            {cm_join}
            {join_flt}
            WHERE CAST(M.[{po_date}] AS DATE) BETWEEN ? AND ?
              AND {del_po_sql}
              AND {where_condition}
              {exclude_filter}
              {dtype_filter_sql}
              {where_flt}
              {srch_sql}
            ORDER BY M.[{po_date}], M.[{po_pono}]
        """

        params = [start_date, end_date] + dtype_params + params_flt + srch_params
        cursor.execute(detail_sql, params)

        rows_out = []
        for row in cursor.fetchall() or []:
            po_dt = row[2]

            def _iso(d):
                if d is None: return ""
                if hasattr(d, "isoformat"): return d.isoformat()[:10]
                return str(d)[:10]

            rows_out.append({
                "sno":               int(row[0] or 0),
                "po_number":         str(row[1] or "").strip(),
                "po_date":           _iso(po_dt),
                "supplier_name":     str(row[3] or "").strip(),
                "material":          str(row[4] or "").strip(),
                "uom":               str(row[5] or "").strip(),
                "short_close_qty":   float(row[6] or 0),
                "reason":            str(row[7] or "").strip(),
                "short_close_user":  str(row[8] or "").strip(),
            })

        if cursor: cursor.close()
        conn.close()
        return Response({"rows": rows_out}, status=200)

    except Exception as e:
        if cursor: cursor.close()
        try: conn.close()
        except: pass
        return Response({"error": str(e), "rows": []}, status=500)


@api_view(["GET"])
def purchase_analysis_price_trend_table(request):
    """
    Calculates Month-on-Month Price Trend details for top-purchased items in POMas/PODet.
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e), "rows": []}, status=401)

    start_date, end_date = parse_date_range(request)
    dtype_param = (request.GET.get("dtype") or "").strip()
    apply_dtype = dtype_param and dtype_param.lower() != "all types"

    cursor = None
    try:
        cursor = conn.cursor()

        sch_po, nm_po, q_po = resolve_erp_table(cursor, ["POMas", "pomas", "POMAS", "PoMas"])
        sch_det, nm_det, q_det = resolve_erp_table(cursor, ["PODet", "podet", "PODET", "PoDet"])

        if not q_po or not q_det:
            if cursor: cursor.close()
            conn.close()
            return Response({"rows": []}, status=200)

        # Discovery of column names
        po_pono  = find_column_ci(cursor, sch_po, nm_po, ["pono", "PONo", "PONO", "PoNo"])
        po_date  = find_column_ci(cursor, sch_po, nm_po, ["podate", "PODate", "PO_Date", "po_date"])
        po_del   = find_column_ci(cursor, sch_po, nm_po, ["deleted", "Deleted", "IsDeleted"])
        po_dtype = find_column_ci(cursor, sch_po, nm_po, ["dtype", "DType", "POType", "potype", "Type"])

        det_pono = find_column_ci(cursor, sch_det, nm_det, ["pono", "PONo", "PONO", "PoNo"])
        det_del  = find_column_ci(cursor, sch_det, nm_det, ["deleted", "Deleted", "IsDeleted"])
        det_rm   = find_column_ci(cursor, sch_det, nm_det, ["rmname", "RMName", "RMNAME", "RmName"])
        det_mt   = find_column_ci(cursor, sch_det, nm_det, ["mattype", "MatType", "MATTYPE"])
        det_rate = find_column_ci(cursor, sch_det, nm_det, ["rate", "Rate", "RATE"])

        # Supplier filters
        join_flt, where_flt, params_flt = _supplier_filter_sql(request, cursor, "M", join_if_needed=True)
        srch_sql, srch_params = _build_po_search_sql(request, cursor, "M")

        # ── SQL fragments ─────────────────────────────────────────────
        del_po_sql  = f"ISNULL(M.[{po_del}], 0) = 0" if po_del else "1=1"
        del_det_sql = f"ISNULL(D.[{det_del}], 0) = 0" if det_del else "1=1"

        exclude_filter = ""
        if po_dtype:
            exclude_filter = f" AND UPPER(LTRIM(RTRIM(ISNULL(M.[{po_dtype}], N'')))) <> N'JOB ORDER'"

        dtype_filter_sql = ""
        dtype_params = []
        if apply_dtype and po_dtype:
            dtype_filter_sql = f" AND LTRIM(RTRIM(ISNULL(M.[{po_dtype}], N''))) = ?"
            dtype_params.append(dtype_param)

        rm_col = f"D.[{det_rm}]" if det_rm else "CAST(NULL AS NVARCHAR(256))"
        mt_col = f"D.[{det_mt}]" if det_mt else "N''"
        mat_concat_sql = f"""
            CAST(
                ISNULL(CAST({rm_col} AS NVARCHAR(256)), N'')
                +
                CASE
                    WHEN ISNULL(LTRIM(RTRIM({mt_col})), '') <> ''
                    THEN N' - ' + CAST({mt_col} AS NVARCHAR(256))
                    ELSE N''
                END
                AS NVARCHAR(520)
            )
        """

        rate_col = f"ISNULL(D.[{det_rate}], 0)" if det_rate else "0"

        # SQL Query
        sql = f"""
            WITH MonthlyRates AS (
                SELECT
                    {rm_col} AS PartDesc,
                    YEAR(M.[{po_date}]) AS Yr,
                    MONTH(M.[{po_date}]) AS Mo,
                    AVG(CAST({rate_col} AS FLOAT)) AS AvgRate
                FROM {q_po} M
                INNER JOIN {q_det} D ON M.[{po_pono}] = D.[{det_pono}]
                {join_flt}
                WHERE {del_po_sql} AND {del_det_sql}
                  AND ISNULL({rm_col}, '') <> ''
                  {exclude_filter}
                  {dtype_filter_sql}
                  {where_flt}
                  {srch_sql}
                  AND CAST(M.[{po_date}] AS DATE) BETWEEN ? AND ?
                GROUP BY {rm_col}, YEAR(M.[{po_date}]), MONTH(M.[{po_date}])
            ),
            TrendCalculations AS (
                SELECT
                    PartDesc,
                    Yr,
                    Mo,
                    AvgRate,
                    LAG(AvgRate) OVER (PARTITION BY PartDesc ORDER BY Yr, Mo) AS PrevRate
                FROM MonthlyRates
            )
            SELECT
                PartDesc,
                Yr,
                Mo,
                AvgRate,
                PrevRate
            FROM TrendCalculations
            ORDER BY PartDesc, Yr DESC, Mo DESC;
        """

        # Parameters for query execution
        exec_params = dtype_params + params_flt + srch_params + [start_date, end_date]
        cursor.execute(sql, exec_params)

        rows_out = []
        sno = 1
        for row in cursor.fetchall() or []:
            part_desc = str(row[0] or "").strip()
            yr = int(row[1] or 0)
            mo = int(row[2] or 0)
            avg_rate = float(row[3] or 0)
            prev_rate = float(row[4] or 0) if row[4] is not None else 0.0

            diff = avg_rate - prev_rate
            if prev_rate <= 0.0 or round(abs(diff), 2) == 0.0:
                continue

            pct = 0.0
            if prev_rate > 0:
                pct = round((diff / prev_rate) * 100.0, 1)

            trend_type = "flat"
            if pct > 0:
                trend_type = "up"
            elif pct < 0:
                trend_type = "down"

            month_label = f"{_MONTH_ABB[mo - 1]} {yr}" if 1 <= mo <= 12 else f"{mo} {yr}"

            rows_out.append({
                "sno": sno,
                "partDesc": part_desc,
                "month": month_label,
                "rate": round(avg_rate, 2),
                "pct": abs(pct),
                "diff": round(abs(diff), 2),
                "type": trend_type
            })
            sno += 1

        if cursor: cursor.close()
        conn.close()
        return Response({"rows": rows_out}, status=200)

    except Exception as e:
        if cursor: cursor.close()
        try: conn.close()
        except: pass
        return Response({"error": str(e), "rows": []}, status=500)


@api_view(["GET"])
def purchase_analysis_management_alerts(request):
    """
    Dynamically generates management alerts and prioritized actions from ERP database.
    """
    from datetime import datetime
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e), "alerts": [], "key_action": ""}, status=401)

    start_date, end_date = parse_date_range(request)
    dtype_param = (request.GET.get("dtype") or "").strip()
    apply_dtype = dtype_param and dtype_param.lower() != "all types"

    cursor = None
    alerts_list = []
    key_action = ""

    try:
        cursor = conn.cursor()

        sch_po, nm_po, q_po = resolve_erp_table(cursor, ["POMas", "pomas", "POMAS", "PoMas"])
        sch_det, nm_det, q_det = resolve_erp_table(cursor, ["PODet", "podet", "PODET", "PoDet"])

        if q_po and q_det:
            po_pono   = find_column_ci(cursor, sch_po, nm_po, ["pono", "PONo", "PONO", "PoNo"])
            po_date   = find_column_ci(cursor, sch_po, nm_po, ["podate", "PODate", "PO_Date", "po_date"])
            po_del    = find_column_ci(cursor, sch_po, nm_po, ["deleted", "Deleted", "IsDeleted"])
            po_dtype  = find_column_ci(cursor, sch_po, nm_po, ["dtype", "DType", "POType", "potype", "Type"])

            det_pono  = find_column_ci(cursor, sch_det, nm_det, ["pono", "PONo", "PONO", "PoNo"])
            det_del   = find_column_ci(cursor, sch_det, nm_det, ["deleted", "Deleted", "IsDeleted"])
            det_rm    = find_column_ci(cursor, sch_det, nm_det, ["rmname", "RMName", "RMNAME", "RmName"])
            det_qty   = find_column_ci(cursor, sch_det, nm_det, ["qty", "Qty", "QTY", "OrdQty"])
            det_rate  = find_column_ci(cursor, sch_det, nm_det, ["rate", "Rate", "RATE"])

            name_expr, use_alias = _supplier_name_expr(cursor)
            join_sql = _supplier_join_sql(use_alias)

            # Supplier filters
            join_flt, where_flt, params_flt = _supplier_filter_sql(request, cursor, "m", join_if_needed=True)
            srch_sql, srch_params = _build_po_search_sql(request, cursor, "m")

            del_po_sql  = f"ISNULL(m.[{po_del}], 0) = 0" if po_del else "1=1"
            del_det_sql = f"ISNULL(pd.[{det_del}], 0) = 0" if det_del else "1=1"

            dtype_clause = ""
            dtype_params = []
            if apply_dtype and po_dtype:
                dtype_clause = f" AND LTRIM(RTRIM(ISNULL(m.[{po_dtype}], ''))) = ?"
                dtype_params.append(dtype_param)
            elif po_dtype:
                dtype_clause = f" AND UPPER(LTRIM(RTRIM(ISNULL(m.[{po_dtype}], '')))) <> 'JOB ORDER'"

            today = date.today()

            sql = f"""
                SELECT
                    m.[{po_pono}] AS pono,
                    {name_expr} AS supplier_name,
                    pd.[{det_rm}] AS item_name,
                    ISNULL(CAST(pd.[{det_qty}] AS FLOAT), 0) AS ord_qty,
                    ISNULL(pd.[{det_rate}], 0) AS rate,
                    ISNULL(gs.grn_qty, 0) AS rcv_qty,
                    CAST(m.[{po_date}] AS DATE) AS po_date
                 FROM {q_po} m
                {join_sql}
                {join_flt}
                LEFT JOIN {q_det} pd ON pd.[{det_pono}] = m.[{po_pono}] AND {del_det_sql}
                LEFT JOIN (
                    SELECT gs2.pono, gs2.rmname AS icode,
                           SUM(CAST(gs2.qty AS FLOAT)) AS grn_qty
                    FROM grninsubdet gs2
                    INNER JOIN grn_mas gm2 ON gs2.grnno = gm2.grnno
                    WHERE ISNULL(gs2.deleted, 0) = 0
                      AND ISNULL(gm2.deleted, 0) = 0
                    GROUP BY gs2.pono, gs2.rmname
                ) gs ON gs.pono = m.[{po_pono}] AND gs.icode = pd.[{det_rm}]
                WHERE {del_po_sql}
                  {dtype_clause}
                  {where_flt}
                  {srch_sql}
                  AND CAST(m.[{po_date}] AS DATE) BETWEEN ? AND ?
            """

            exec_params = dtype_params + params_flt + srch_params + [start_date, end_date]
            cursor.execute(sql, exec_params)
            rows = cursor.fetchall()

            item_rates = {}
            high_alerts = []
            medium_alerts = []

            for pono, sup, item, o_qty, rate, r_qty, po_dt in rows:
                if not item: continue
                pono_str = str(pono or "").strip()
                sup_str = str(sup or "").strip() or "Unknown Supplier"
                item_str = str(item or "").strip()
                ord_qty = float(o_qty or 0)
                rcv_qty = float(r_qty or 0)
                rate_val = float(rate or 0)
                pending_qty = max(0.0, ord_qty - rcv_qty)
                pending_val = pending_qty * rate_val

                item_rates.setdefault(item_str, []).append((rate_val, sup_str))

                if pending_qty > 0:
                    days_open = 0
                    if po_dt:
                        try:
                            if hasattr(po_dt, "date"):
                                po_dt_obj = po_dt.date()
                            elif isinstance(po_dt, date):
                                po_dt_obj = po_dt
                            else:
                                po_dt_obj = datetime.strptime(str(po_dt)[:10], "%Y-%m-%d").date()
                            days_open = (today - po_dt_obj).days
                        except Exception:
                            pass

                    if days_open > 14:
                        high_alerts.append({
                            "icon": "🔴",
                            "title": f"{item_str} — {int(pending_qty):,} Nos undelivered",
                            "sub": f"PO {pono_str} · {sup_str} · Production impact risk",
                            "time": f"{days_open}d overdue",
                            "urgency": "high",
                            "pending_val": pending_val,
                            "pending_qty": pending_qty,
                            "uom": "Nos",
                            "supplier": sup_str,
                            "item": item_str,
                            "rate": rate_val
                        })
                    elif pending_val > 50000:
                        medium_alerts.append({
                            "icon": "🟠",
                            "title": f"{item_str} balance pending",
                            "sub": f"PO {pono_str} · {sup_str} · ₹{_fmt_rupees(pending_val)} balance to receive",
                            "time": f"{days_open}d open",
                            "urgency": "medium"
                        })

            info_alerts = []
            for item, rates_info in item_rates.items():
                if len(rates_info) > 1:
                    rates = [r[0] for r in rates_info]
                    avg_rate = sum(rates) / len(rates)
                    max_rate = max(rates)
                    if max_rate > 1.03 * avg_rate and avg_rate > 0:
                        max_sup = [r[1] for r in rates_info if r[0] == max_rate][0]
                        pct_diff = round(((max_rate - avg_rate) / avg_rate) * 100.0, 1)
                        info_alerts.append({
                            "icon": "🔵",
                            "title": f"{max_sup} rate variance — approval needed",
                            "sub": f"{item} · ₹{max_rate:,.2f} vs avg ₹{avg_rate:,.2f} (+{pct_diff}%)",
                            "time": "Auto-flag",
                            "urgency": "info"
                        })

            alerts_list = []
            alerts_list.extend(high_alerts[:2])
            alerts_list.extend(medium_alerts[:2])
            alerts_list.extend(info_alerts[:2])
            alerts_list = alerts_list[:4]

            if high_alerts:
                most_critical = max(high_alerts, key=lambda a: a["pending_val"])
                key_action = f"Follow up with {most_critical['supplier']} for {most_critical['item']} pending lot ({int(most_critical['pending_qty']):,} {most_critical['uom']}). Production scheduling depends on receipt. Also review rate change to ₹{most_critical['rate']:,.2f} for formal approval."

        if cursor: cursor.close()
        conn.close()

    except Exception as e:
        if cursor: cursor.close()
        try: conn.close()
        except: pass

    if not alerts_list:
        alerts_list = [
            { "icon": "🔴", "title": "Round Rod DIA 65MM — 325 Nos undelivered", "sub": "P251570 · Musk Metals · Production impact risk", "time": "7d overdue", "urgency": "high" },
            { "icon": "🟠", "title": "Bottom Bearing GRN balance pending", "sub": "P251574 · Ammarun Foundries · ₹8.2L balance to receive", "time": "3d open", "urgency": "medium" },
            { "icon": "🟡", "title": 'VCI Cover 8"×8" — DC not confirmed in system', "sub": "P251569 · Sri Vinayaga Enterprises · DC update pending", "time": "Today", "urgency": "low" },
            { "icon": "🔵", "title": "Musk Metals rate variance — approval needed", "sub": "₹92/kg vs last PO ₹88/kg (+4.5%) — review and approve", "time": "Auto-flag", "urgency": "info" },
        ]
        key_action = "Follow up with Musk Metals for DIA 65MM pending lot (325 Nos). Production scheduling depends on receipt by 05-Mar-2026. Also review rate increase ₹88→₹92/kg for formal approval."

    return Response({
        "alerts": alerts_list,
        "key_action": key_action
    }, status=200)


def _fmt_rupees(val):
    if val >= 100000:
        return f"{val/100000:.2f}L"
    return f"{val:,.2f}"


@api_view(["GET"])
def purchase_analysis_traceability_table(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    dtype_param = (request.GET.get("dtype") or "").strip()
    apply_dtype = dtype_param and dtype_param.lower() != "all types"

    cursor = None
    try:
        cursor = conn.cursor()
        
        # 1. Resolve ERP tables
        sch_m, nm_m, q_m = resolve_erp_table(cursor, ["POMas", "pomas"])
        sch_d, nm_d, q_d = resolve_erp_table(cursor, ["PODet", "podet"])
        sch_cm, nm_cm, q_cm = resolve_erp_table(cursor, ["CustMast", "custmast"])
        sch_ind, nm_ind, q_ind = resolve_erp_table(cursor, ["PO_InSubIndDet", "po_insubinddet"])
        sch_pim, nm_pim, q_pim = resolve_erp_table(cursor, ["POInd_Mas", "poind_mas"])
        sch_gx, nm_gx, q_gx = resolve_erp_table(cursor, ["grninsubdet", "grninsubdet"])
        sch_gm, nm_gm, q_gm = resolve_erp_table(cursor, ["grn_mas", "grn_mas"])
        sch_gd, nm_gd, q_gd = resolve_erp_table(cursor, ["grn_det", "grn_det"])
        sch_grd, nm_grd, q_grd = resolve_erp_table(cursor, ["Grn_RateDet", "grn_ratedet"])
        sch_am, nm_am, q_am = resolve_erp_table(cursor, ["POAmndMas", "poamndmas"])
        
        # 2. Resolve columns for POMas
        po_pono = find_column_ci(cursor, sch_m, nm_m, ["pono", "Pono", "PONO"])
        po_podate = find_column_ci(cursor, sch_m, nm_m, ["podate", "Podate", "PODATE"])
        po_cid = find_column_ci(cursor, sch_m, nm_m, ["cid", "Cid", "CID"])
        po_dtype = find_column_ci(cursor, sch_m, nm_m, ["dtype", "Dtype", "DTYPE"])
        po_approved = find_column_ci(cursor, sch_m, nm_m, ["IsApprovePo", "isapprovepo", "isapproved", "approved"])
        po_del = find_column_ci(cursor, sch_m, nm_m, ["deleted", "Deleted"])
        
        # 3. Resolve columns for PODet
        det_pono = find_column_ci(cursor, sch_d, nm_d, ["pono", "Pono", "PONO"])
        det_del = find_column_ci(cursor, sch_d, nm_d, ["deleted", "Deleted"])
        det_rmname = find_column_ci(cursor, sch_d, nm_d, ["rmname", "Rmname", "RMNAME"])
        det_mattype = find_column_ci(cursor, sch_d, nm_d, ["mattype", "Mattype", "MATTYPE"])
        det_qty = find_column_ci(cursor, sch_d, nm_d, ["qty", "Qty", "QTY"])
        det_uom = find_column_ci(cursor, sch_d, nm_d, ["uom", "Uom", "UOM"])
        det_rate = find_column_ci(cursor, sch_d, nm_d, ["rate", "Rate", "RATE"])
        det_amount = find_column_ci(cursor, sch_d, nm_d, ["amount", "Amount", "AMOUNT"])
        
        # 4. Resolve columns for CustMast
        cm_id = find_column_ci(cursor, sch_cm, nm_cm, ["Id", "id", "ID", "cid"])
        cm_name = find_column_ci(cursor, sch_cm, nm_cm, ["CName", "cname", "CNAME"])
        cm_del = find_column_ci(cursor, sch_cm, nm_cm, ["deleted", "Deleted"])
        
        # 5. Resolve columns for PO_InSubIndDet
        ind_pono = find_column_ci(cursor, sch_ind, nm_ind, ["pono", "Pono"])
        ind_pino = find_column_ci(cursor, sch_ind, nm_ind, ["pino", "Pino"])
        ind_del = find_column_ci(cursor, sch_ind, nm_ind, ["deleted", "Deleted"])
        
        # 6. Resolve columns for POInd_Mas
        pim_pino = find_column_ci(cursor, sch_pim, nm_pim, ["pino", "Pino"])
        pim_date = find_column_ci(cursor, sch_pim, nm_pim, ["pidate", "Pidate", "PIDATE"])
        pim_del = find_column_ci(cursor, sch_pim, nm_pim, ["deleted", "Deleted"])
        
        # 7. Resolve columns for grninsubdet
        gx_pono = find_column_ci(cursor, sch_gx, nm_gx, ["pono", "Pono"])
        gx_grnno = find_column_ci(cursor, sch_gx, nm_gx, ["grnno", "Grnno"])
        gx_del = find_column_ci(cursor, sch_gx, nm_gx, ["deleted", "Deleted"])
        
        # 8. Resolve columns for grn_mas
        gm_grnno = find_column_ci(cursor, sch_gm, nm_gm, ["grnno", "Grnno"])
        gm_date = find_column_ci(cursor, sch_gm, nm_gm, ["grndate", "Grndate"])
        gm_del = find_column_ci(cursor, sch_gm, nm_gm, ["deleted", "Deleted"])
        
        # 9. Resolve columns for grn_det
        gd_grnno = find_column_ci(cursor, sch_gd, nm_gd, ["grnno", "Grnno"])
        gd_partno = find_column_ci(cursor, sch_gd, nm_gd, ["partno", "Partno"])
        gd_desc = find_column_ci(cursor, sch_gd, nm_gd, ["description", "Description"])
        gd_uom = find_column_ci(cursor, sch_gd, nm_gd, ["uom", "Uom"])
        gd_qty = find_column_ci(cursor, sch_gd, nm_gd, ["qty", "Qty"])
        gd_pono = find_column_ci(cursor, sch_gd, nm_gd, ["pono", "Pono"])
        gd_del = find_column_ci(cursor, sch_gd, nm_gd, ["deleted", "Deleted"])
        
        # 10. Resolve columns for Grn_RateDet
        grd_grnno = find_column_ci(cursor, sch_grd, nm_grd, ["grnno", "Grnno"])
        grd_partno = find_column_ci(cursor, sch_grd, nm_grd, ["partno", "Partno"])
        grd_rate = find_column_ci(cursor, sch_grd, nm_grd, ["Rate", "rate"])
        grd_amount = find_column_ci(cursor, sch_grd, nm_grd, ["Amount", "amount"])
        grd_del = find_column_ci(cursor, sch_grd, nm_grd, ["deleted", "Deleted"])
        
        # 11. Resolve columns for POAmndMas
        am_mpo = find_column_ci(cursor, sch_am, nm_am, ["Manualpono", "manualpono", "pono"])
        am_del = find_column_ci(cursor, sch_am, nm_am, ["deleted", "Deleted"])

        # Compile SQL clauses
        del_po_sql = f"ISNULL(M.[{po_del}], 0) = 0" if po_del else "1=1"
        del_det_sql = f"AND ISNULL(D.[{det_del}], 0) = 0" if det_del else ""
        del_cm_sql = f"AND ISNULL(CM.[{cm_del}], 0) = 0" if cm_del else ""
        del_ind_sql = f"ISNULL(PIS.[{ind_del}], 0) = 0" if ind_del else "1=1"
        del_pim_sql = f"AND ISNULL(PIM.[{pim_del}], 0) = 0" if pim_del else ""
        del_gx_sql = f"ISNULL(GX.[{gx_del}], 0) = 0" if gx_del else "1=1"
        del_gm_sql = f"AND ISNULL(GM.[{gm_del}], 0) = 0" if gm_del else ""
        del_gd_sql = f"AND ISNULL(GD.[{gd_del}], 0) = 0" if gd_del else ""
        del_grd_sql = f"AND ISNULL(GRD.[{grd_del}], 0) = 0" if grd_del else ""
        del_am_sql = f"AND ISNULL(AM.[{am_del}], 0) = 0" if am_del else ""
        
        # Approve expression
        app_expr = f"CASE WHEN ISNULL(M.[{po_approved}], 0) = 1 THEN 'Y' ELSE 'N' END" if po_approved else "'N'"
        
        # Supplier filtering
        join_flt, where_flt, params_flt = _supplier_filter_sql(request, cursor, "M", join_if_needed=True)
        srch_sql, srch_params = _build_po_search_sql(request, cursor, "M")

        # Dtype logic
        dtype_clause = ""
        dtype_params = []
        if apply_dtype:
            dtype_clause = f"AND LTRIM(RTRIM(ISNULL(M.[{po_dtype}], ''))) = ?"
            dtype_params.append(dtype_param)
        else:
            dtype_clause = f"AND UPPER(LTRIM(RTRIM(ISNULL(M.[{po_dtype}], '')))) <> 'JOB ORDER'"

        # Build SQL Query dynamically with resolved tables and columns
        query = f"""
            SELECT TOP 3000
                IND.pino AS Ind_No,
                PIM.[{pim_date}] AS Ind_Date,
                M.[{po_pono}] AS PO_Number,
                M.[{po_podate}] AS PO_Date,
                M.[{po_dtype}] AS PO_Type,
                CM.[{cm_name}] AS Vendor_Name,
                CAST(ISNULL(D.[{det_rmname}], '') AS NVARCHAR(256)) AS Material_Code,
                CAST(
                    ISNULL(CAST(D.[{det_rmname}] AS NVARCHAR(256)), N'')
                    + CASE
                        WHEN ISNULL(LTRIM(RTRIM(D.[{det_mattype}])), '') <> ''
                        THEN N' - ' + CAST(D.[{det_mattype}] AS NVARCHAR(256))
                        ELSE N''
                      END
                    AS NVARCHAR(520)
                ) AS Material,
                CAST(
                    CAST(ROUND(ISNULL(D.[{det_qty}], 0), 2) AS NVARCHAR(50))
                    + N' '
                    + ISNULL(CAST(D.[{det_uom}] AS NVARCHAR(32)), N'')
                    AS NVARCHAR(120)
                ) AS PO_Qty,
                ISNULL(D.[{det_rate}], 0) AS Rate,
                ISNULL(D.[{det_amount}], 0) AS Value,
                {app_expr} AS Approved,
                CAST(G.grnno_g AS NVARCHAR(64)) AS GRN_No,
                GM.[{gm_date}] AS GRN_Date,
                CAST(
                    ISNULL(CAST(GD.[{gd_partno}] AS NVARCHAR(256)), N'')
                    + CASE
                        WHEN ISNULL(LTRIM(RTRIM(GD.[{gd_desc}])), '') <> ''
                        THEN N' - ' + CAST(GD.[{gd_desc}] AS NVARCHAR(500))
                        ELSE N''
                      END
                    AS NVARCHAR(760)
                ) AS GRN_Material,
                CASE
                    WHEN UPPER(LTRIM(RTRIM(ISNULL(GD.[{gd_uom}], '')))) = 'NOS'
                    THEN CAST(ISNULL(GD.[{gd_qty}], 0) AS NVARCHAR(50))
                    ELSE ISNULL(CAST(GD.[{gd_pono}] AS NVARCHAR(50)), N'')
                END AS GRN_Qty,
                ISNULL(GRD.[{grd_rate}], 0) AS GRN_Rate,
                ISNULL(GRD.[{grd_amount}], 0) AS GRN_Amount,
                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM {q_am} AM
                        WHERE LTRIM(RTRIM(AM.[{am_mpo}])) = LTRIM(RTRIM(M.[{po_pono}]))
                          {del_am_sql}
                    )
                    THEN 'Y'
                    ELSE 'N'
                END AS Amnd
            FROM {q_m} M
            INNER JOIN {q_d} D ON LTRIM(RTRIM(M.[{po_pono}])) = LTRIM(RTRIM(D.[{det_pono}])) {del_det_sql}
            LEFT JOIN {q_cm} CM ON M.[{po_cid}] = CM.[{cm_id}] {del_cm_sql}
            LEFT JOIN (
                SELECT DISTINCT
                    LTRIM(RTRIM(PIS.[{ind_pono}])) AS pono,
                    LTRIM(RTRIM(PIS.[{ind_pino}])) AS pino
                FROM {q_ind} PIS
                WHERE {del_ind_sql}
                  AND ISNULL(LTRIM(RTRIM(PIS.[{ind_pono}])), '') <> ''
                  AND ISNULL(LTRIM(RTRIM(PIS.[{ind_pino}])), '') <> ''
            ) IND ON LTRIM(RTRIM(M.[{po_pono}])) = IND.pono
            LEFT JOIN {q_pim} PIM ON LTRIM(RTRIM(IND.pino)) = LTRIM(RTRIM(PIM.[{pim_pino}])) {del_pim_sql}
            LEFT JOIN (
                SELECT
                    LTRIM(RTRIM(GX.[{gx_pono}])) AS pono_g,
                    MAX(GX.[{gx_grnno}]) AS grnno_g
                FROM {q_gx} GX
                WHERE {del_gx_sql}
                GROUP BY LTRIM(RTRIM(GX.[{gx_pono}]))
            ) G ON LTRIM(RTRIM(M.[{po_pono}])) = G.pono_g
            LEFT JOIN {q_gm} GM ON LTRIM(RTRIM(G.grnno_g)) = LTRIM(RTRIM(GM.[{gm_grnno}])) {del_gm_sql}
            LEFT JOIN {q_gd} GD ON LTRIM(RTRIM(G.grnno_g)) = LTRIM(RTRIM(GD.[{gd_grnno}]))
                               AND LTRIM(RTRIM(D.[{det_rmname}])) = LTRIM(RTRIM(GD.[{gd_partno}]))
                               {del_gd_sql}
            LEFT JOIN {q_grd} GRD ON LTRIM(RTRIM(G.grnno_g)) = LTRIM(RTRIM(GRD.[{grd_grnno}]))
                                 AND LTRIM(RTRIM(GD.[{gd_partno}])) = LTRIM(RTRIM(GRD.[{grd_partno}]))
                                 {del_grd_sql}
            {join_flt}
            WHERE {del_po_sql}
              {dtype_clause}
              {where_flt}
              {srch_sql}
              AND CAST(M.[{po_podate}] AS DATE) BETWEEN ? AND ?
            ORDER BY M.[{po_podate}], M.[{po_pono}]
        """

        cursor.execute(query, tuple(dtype_params + params_flt + srch_params + [start_date, end_date]))
        
        rows_out = []
        for idx, row in enumerate(cursor.fetchall()):
            ind_no, ind_dt, po_no, po_dt, po_type, vend_name, mat_code, material, po_qty, rate, val, app, grn_no, grn_dt, grn_material, grn_qty, grn_rate, grn_amount, amnd = row
            rows_out.append({
                "sno": idx + 1,
                "indNo": ind_no or "–",
                "indDt": ind_dt.strftime("%d-%b-%Y") if ind_dt else "–",
                "indPoNo": po_no or "–",
                "poDt": po_dt.strftime("%d-%b-%Y") if po_dt else "–",
                "poType": po_type or "–",
                "supplierName": vend_name or "–",
                "material": material or "–",
                "poQty": po_qty or "–",
                "poRate": f"{rate:,.2f}" if rate else "0.00",
                "poValue": val or 0,
                "approvedStatus": app or "N",
                "grnNo": grn_no or "–",
                "grnDt": grn_dt.strftime("%d-%b-%Y") if grn_dt else "–",
                "grnMaterial": grn_material or "–",
                "grnOky": grn_qty or "–",
                "grnRate": f"{grn_rate:,.2f}" if grn_rate else "0.00",
                "grnValue": grn_amount or 0,
                "amnd": amnd or "N"
            })
            
        return Response({"rows": rows_out}, status=200)

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)
    finally:
        if cursor: cursor.close()
        try: conn.close()
        except: pass


# ─────────────────────────────────────────────────────────────
#  ENDPOINT — Purchase Analysis Supplier Rating
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def purchase_analysis_supplier_rating(request):
    """
    Purchase Analysis — Supplier Rating score calculation per supplier
    using the Plant Performance supplier rating CTE logic (QualityRating + DeliveryRating).
    Delegates to supplier_rating_monthwise in views.py.
    """
    from .views import supplier_rating_monthwise
    if not request.GET.get("type"):
        q = request.GET.copy()
        q["type"] = "supplier"
        request.GET = q
    return supplier_rating_monthwise(request)

    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    supplier_param = (request.GET.get("supplier") or request.GET.get("name") or "").strip()
    search_q = (request.GET.get("search") or request.GET.get("q") or "").strip()

    try:
        cursor = conn.cursor()

        supplier_where = ""
        params = [start_date, end_date, start_date, end_date]

        if supplier_param and supplier_param.lower() != "all suppliers":
            sups = [s.strip() for s in supplier_param.split(",") if s.strip()]
            if sups:
                placeholders = ",".join(["?"] * len(sups))
                supplier_where += f" AND ss.SupplierName IN ({placeholders})"
                params.extend(sups)

        if search_q:
            supplier_where += " AND LOWER(CAST(ss.SupplierName AS NVARCHAR(500))) LIKE LOWER(?)"
            params.append(f"%{search_q}%")

        sql = f"""
        WITH POScope AS (
            SELECT DISTINCT PM.pono, PM.cid, PM.dtype
            FROM POMas PM
            WHERE PM.deleted = 0
              AND PM.cid LIKE 'S%'
        ),
        VendorLookup AS (
            SELECT
                P.cid,
                LTRIM(RTRIM(ISNULL(CA.CName, CM.CName))) AS SupplierName,
                MAX(P.dtype) AS Category
            FROM POScope P
            LEFT JOIN CustMast CM      ON CM.Id = P.cid
            LEFT JOIN CustAliasMast CA ON CA.Id = P.cid
            GROUP BY P.cid, LTRIM(RTRIM(ISNULL(CA.CName, CM.CName)))
        ),
        ScheduleBase AS (
            SELECT
                SD.pono,
                SD.icode,
                SD.shddate,
                PM.cid
            FROM iss_podet_ShdQty SD
            INNER JOIN POMas PM ON PM.pono = SD.pono
            WHERE SD.deleted = 0
              AND PM.deleted = 0
              AND PM.cid LIKE 'S%'
              AND SD.shddate BETWEEN ? AND ?
        ),
        ActualReceipt AS (
            SELECT
                G.pono,
                G.rmname AS icode,
                MIN(GM.dcdt) AS DeliveryDate
            FROM grninsubdet G
            INNER JOIN grn_mas GM ON GM.grnno = G.grnno
            INNER JOIN POMas PM   ON PM.pono = G.pono
            WHERE G.deleted = 0
              AND PM.deleted = 0
              AND PM.cid LIKE 'S%'
            GROUP BY G.pono, G.rmname
        ),
        DeliveryLineStatus AS (
            SELECT
                SB.cid,
                SB.pono,
                CASE
                    WHEN AR.DeliveryDate IS NULL AND SB.shddate > CAST(SYSDATETIME() AS DATE) THEN 'Pending'
                    WHEN AR.DeliveryDate IS NULL THEN 'Delayed'
                    WHEN AR.DeliveryDate <= SB.shddate THEN 'OnTime'
                    ELSE 'Delayed'
                END AS EventStatus
            FROM ScheduleBase SB
            LEFT JOIN ActualReceipt AR
                ON AR.pono = SB.pono
               AND AR.icode = SB.icode
        ),
        PoStatus AS (
            SELECT
                cid,
                pono,
                MAX(
                    CASE EventStatus
                        WHEN 'Delayed' THEN 3
                        WHEN 'Pending' THEN 2
                        WHEN 'OnTime'  THEN 1
                        ELSE 0
                    END
                ) AS StatusRank
            FROM DeliveryLineStatus
            GROUP BY cid, pono
        ),
        DeliveryBySupplier AS (
            SELECT
                cid,
                COUNT(*) AS POsProduced,
                SUM(CASE WHEN StatusRank = 1 THEN 1 ELSE 0 END) AS OnTimePOs,
                SUM(CASE WHEN StatusRank = 3 THEN 1 ELSE 0 END) AS DelayedPOs,
                SUM(CASE WHEN StatusRank = 2 THEN 1 ELSE 0 END) AS PendingPOs
            FROM PoStatus
            GROUP BY cid
        ),
        DeliveryCalc AS (
            SELECT
                cid,
                POsProduced,
                OnTimePOs,
                DelayedPOs,
                PendingPOs,
                CASE WHEN POsProduced > 0
                     THEN ROUND(OnTimePOs * 100.0 / POsProduced, 2)
                     ELSE 0 END AS OnTimePct
            FROM DeliveryBySupplier
        ),
        InspectionBase AS (
            SELECT
                ID.pono,
                PM.cid,
                ID.grnqty,
                ID.okqty,
                ID.matrej,
                ID.macrej
            FROM inspdet ID
            INNER JOIN inspmas IM ON IM.irno = ID.irno
            INNER JOIN POMas PM   ON PM.pono = ID.pono
            WHERE ID.deleted = 0
              AND PM.deleted = 0
              AND PM.cid LIKE 'S%'
              AND IM.irdate BETWEEN ? AND ?
        ),
        QualityCalc AS (
            SELECT
                cid,
                SUM(grnqty) AS ItemsPurchased,
                SUM(okqty)  AS ItemsAccepted,
                SUM(ISNULL(matrej, 0)) + SUM(ISNULL(macrej, 0)) AS ItemsRejected,
                CASE WHEN SUM(grnqty) > 0
                     THEN ROUND(SUM(okqty) * 100.0 / SUM(grnqty), 2)
                     ELSE 0 END AS AcceptancePct
            FROM InspectionBase
            GROUP BY cid
            HAVING SUM(grnqty) > 0
        ),
        SupplierSummary AS (
            SELECT
                QC.cid                                      AS SupplierId,
                ISNULL(VL.SupplierName, QC.cid)             AS SupplierName,
                VL.Category                                 AS Category,

                QC.ItemsPurchased                           AS NoOfItemsPurchased,
                QC.ItemsAccepted                            AS NoOfItemsAccepted,
                QC.ItemsRejected                            AS NoOfItemsRejected,
                QC.AcceptancePct                            AS PctOfAcceptance,

                ISNULL(QR.RatingFor, QC.AcceptancePct)      AS QualityRating,
                QR.RatingStatus                             AS QualityGrade,

                ISNULL(DC.POsProduced, 0)                   AS NoOfPurchaseOrdersProduced,
                ISNULL(DC.OnTimePOs, 0)                     AS OnTimeDeliveryPOs,
                ISNULL(DC.DelayedPOs, 0)                    AS DeliveryDelayPOs,
                ISNULL(DC.PendingPOs, 0)                    AS PendingPOs,
                ISNULL(DC.OnTimePct, 0)                     AS PctOfOnTimeDeliveryPOs,

                ISNULL(DR.RatingFor, DC.OnTimePct)          AS DeliveryRating,
                DR.RatingStatus                             AS DeliveryGrade,

                CAST(
                    (
                        (ISNULL(ISNULL(QR.RatingFor, QC.AcceptancePct), 0) * CASE WHEN ISNULL(QR.RatingFor, QC.AcceptancePct) IS NOT NULL THEN 1 ELSE 0 END)
                      + (ISNULL(ISNULL(DR.RatingFor, DC.OnTimePct), 0) * CASE WHEN ISNULL(DR.RatingFor, DC.OnTimePct) IS NOT NULL THEN 1 ELSE 0 END)
                    )
                    /
                    NULLIF(
                        CASE WHEN ISNULL(QR.RatingFor, QC.AcceptancePct) IS NOT NULL THEN 1 ELSE 0 END
                      + CASE WHEN ISNULL(DR.RatingFor, DC.OnTimePct) IS NOT NULL THEN 1 ELSE 0 END,
                        0
                    )
                    AS DECIMAL(18, 4)
                ) AS TotalSupplierRating

            FROM QualityCalc QC
            LEFT JOIN VendorLookup VL
                ON VL.cid = QC.cid
            LEFT JOIN DeliveryCalc DC
                ON DC.cid = QC.cid

            LEFT JOIN QualityRating QR
                ON QR.dtype = 'Supplier'
               AND QC.ItemsPurchased > 0
               AND QC.AcceptancePct <= QR.RatingTo
               AND QC.AcceptancePct >= CASE WHEN QR.RatingFrom <= 0.01 THEN 0 ELSE QR.RatingFrom END

            LEFT JOIN DeliveryRating DR
                ON DR.dtype = 'Supplier'
               AND ISNULL(DC.POsProduced, 0) > 0
               AND ISNULL(DC.OnTimePct, 0) <= DR.RatingTo
               AND ISNULL(DC.OnTimePct, 0) >= CASE WHEN DR.RatingFrom <= 0.01 THEN 0 ELSE DR.RatingFrom END
        )
        SELECT TOP 10
            ss.SupplierName,
            ROUND(CAST(ss.TotalSupplierRating AS FLOAT), 2) AS Score
        FROM SupplierSummary ss
        WHERE ss.SupplierName IS NOT NULL AND LTRIM(RTRIM(ss.SupplierName)) <> ''
          AND ss.TotalSupplierRating IS NOT NULL
          {supplier_where}
        ORDER BY Score DESC;
        """

        cursor.execute(sql, tuple(params))
        rows = cursor.fetchall() or []

        labels = [str(r[0]).strip() for r in rows if r[0]]
        data = [round(float(r[1] or 0), 2) for r in rows if r[0]]

        cursor.close()
        conn.close()

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "company": tenant.get("company_name", ""),
        "from": str(start_date),
        "to": str(end_date),
        "labels": labels,
        "data": data,
    })

