from collections import defaultdict
from rest_framework.decorators import api_view
from rest_framework.response import Response
from datetime import datetime, date

from .models import Tenant
from .utils.db import get_connection


# ─────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────

def encrypt_password(plain_password):
    """Shift each ASCII value by +2 (existing ERP encryption)."""
    return ''.join(chr(ord(c) + 2) for c in plain_password)


def get_tenant_connection(request):
    """
    Pull tenant DB details from session and return an open connection.
    Raises ValueError if session is missing.
    """
    tenant = request.session.get("tenant")
    if not tenant:
        raise ValueError("Session expired. Please login again.")

    conn = get_connection(
        tenant["erp_server"],
        tenant["erp_database"],
        tenant["erp_user"],
        tenant["erp_password"],
        tenant["erp_port"],
    )
    return conn, tenant


def current_financial_year():
    """
    Returns (start_date, end_date) for the current Indian financial year.
    April 2026 → March 2027  (when today is Apr 2026 – Mar 2027)
    """
    today = date.today()
    if today.month >= 4:
        return date(today.year, 4, 1), date(today.year + 1, 3, 31)
    else:
        return date(today.year - 1, 4, 1), date(today.year, 3, 31)


def parse_date_range(request):
    """
    Parse ?from=YYYY-MM-DD&to=YYYY-MM-DD.
    Falls back to current financial year if params are absent or invalid.
    Always returns 12 monthly buckets in FY order (Apr → Mar).
    """
    from_param = request.GET.get("from", "").strip()
    to_param   = request.GET.get("to",   "").strip()

    if from_param and to_param:
        try:
            start = datetime.strptime(from_param, "%Y-%m-%d").date()
            end   = datetime.strptime(to_param,   "%Y-%m-%d").date()
            if start <= end:
                return start, end
        except ValueError:
            pass  # fall through to default

    return current_financial_year()


def dashboard2_parse_date_range_default_month(request):
    """Same defaults as dashboard2_kpis: month start → today, or ?from=&to="""
    from_param = (request.GET.get("from") or "").strip()
    to_param = (request.GET.get("to") or "").strip()

    if from_param and to_param:
        try:
            start_date = datetime.strptime(from_param, "%Y-%m-%d").date()
            end_date = datetime.strptime(to_param, "%Y-%m-%d").date()
            if start_date > end_date:
                start_date, end_date = end_date, start_date
            return start_date, end_date
        except ValueError:
            pass

    today = date.today()
    return date(today.year, today.month, 1), today


def to_lakhs(value):
    """Convert Rupees → ₹ Lakhs, rounded to 2 decimal places."""
    return round(float(value or 0) / 100_000, 2)


def month_key_from_db(raw):
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def table_exists(cursor, table_name):
    cursor.execute(
        """
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = ?
        """,
        (table_name,),
    )
    return cursor.fetchone() is not None


def find_first_column(cursor, table_name, candidates):
    for col in candidates:
        cursor.execute(
            """
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = ? AND COLUMN_NAME = ?
            """,
            (table_name, col),
        )
        if cursor.fetchone():
            return col
    return None


def find_first_table(cursor, candidates):
    """Return first table name that exists (exact match on TABLE_NAME)."""
    for t in candidates:
        if table_exists(cursor, t):
            return t
    return None


def resolve_erp_table(cursor, candidate_names):
    """
    Resolve a physical table (schema + name) case-insensitively.
    Returns (table_schema, table_name, bracketed_two_part_name) or (None, None, None).
    """
    for logical in candidate_names:
        cursor.execute(
            """
            SELECT TOP 1 TABLE_SCHEMA, TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE UPPER(LTRIM(RTRIM(TABLE_NAME))) = UPPER(LTRIM(RTRIM(?)))
            ORDER BY TABLE_SCHEMA, TABLE_NAME
            """,
            (logical,),
        )
        row = cursor.fetchone()
        if row:
            schema, name = row[0], row[1]
            return schema, name, f"[{schema}].[{name}]"
    return None, None, None


def find_column_ci(cursor, table_schema, table_name, candidates):
    """
    First matching column on (schema, table), case-insensitive name match.
    Returns COLUMN_NAME as stored in INFORMATION_SCHEMA (safe for bracket-quoting).
    """
    for col in candidates:
        cursor.execute(
            """
            SELECT TOP 1 COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
              AND TABLE_NAME = ?
              AND UPPER(LTRIM(RTRIM(COLUMN_NAME))) = UPPER(LTRIM(RTRIM(?)))
            """,
            (table_schema, table_name, col),
        )
        row = cursor.fetchone()
        if row:
            return row[0]
    return None


# ─────────────────────────────────────────────────────────────
#  LOGIN
# ─────────────────────────────────────────────────────────────

@api_view(['POST'])
def login_view(request):
    company_code = (request.data.get("company_code") or "").strip()
    username     = (request.data.get("username")     or "").strip()
    password     =  request.data.get("password", "")

    if not company_code or not username or not password:
        return Response(
            {"error": "company_code, username and password are required."},
            status=400
        )

    # ── 1. Resolve tenant from master DB ─────────────────────
    try:
        tenant = Tenant.objects.get(
            company_code__iexact=company_code,
            status=True
        )
    except Tenant.DoesNotExist:
        return Response({"error": "Invalid company code."}, status=400)

    # ── 2. Validate user against tenant's ERP DB ─────────────
    try:
        conn   = get_connection(
            tenant.erp_server,
            tenant.erp_database,
            tenant.erp_user,
            tenant.erp_password,
            tenant.erp_port,
        )
        cursor = conn.cursor()
        cursor.execute(
            "SELECT UserName FROM Users WHERE UserName = ? AND Password = ?",
            (username, encrypt_password(password)),
        )
        user = cursor.fetchone()
        cursor.close()
        conn.close()

    except Exception as e:
        return Response({"error": f"Database connection error: {str(e)}"}, status=500)

    if not user:
        return Response({"error": "Invalid username or password."}, status=401)

    # ── 3. Store tenant in session ────────────────────────────
    request.session["tenant"] = {
        "erp_server":   tenant.erp_server,
        "erp_database": tenant.erp_database,
        "erp_user":     tenant.erp_user,
        "erp_password": tenant.erp_password,
        "erp_port":     tenant.erp_port,
        "company_code": tenant.company_code,
        "company_name": tenant.company_name,
    }
    request.session.modified = True
    request.session.save()     

    return Response({
        "message":      "Login successful",
        "company":      tenant.company_name,
        "company_code": tenant.company_code,
        "username":     username,
    })


# ─────────────────────────────────────────────────────────────
#  COMPANY NAME LOOKUP
# ─────────────────────────────────────────────────────────────

@api_view(['GET'])
def get_company(request, code):
    code = (code or "").strip()
    if not code:
        return Response({"error": "Company code is required."}, status=400)

    try:
        tenant = Tenant.objects.get(company_code__iexact=code, status=True)
        return Response({
            "company_name": tenant.company_name,
            "company_code": tenant.company_code,
        })
    except Tenant.DoesNotExist:
        return Response({"error": "Company not found."}, status=404)


# ─────────────────────────────────────────────────────────────
#  CHARTS - SABARISH (Monthwise Charts)
# ─────────────────────────────────────────────────────────────

@api_view(['GET'])
def po_vs_sales(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    fy_start_year = start_date.year if start_date.month >= 4 else start_date.year - 1
    fy_label = f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}"

    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT MONTH(invdt) AS mth, SUM(tamt) AS total
            FROM Bill_Mas
            WHERE deleted = 0 AND ISNULL(btype, '') NOT IN ('Credit Note')
            AND CAST(invdt AS DATE) BETWEEN ? AND ?
            GROUP BY MONTH(invdt)
        """, (start_date, end_date))
        sales_rows = cursor.fetchall()

        cursor.execute("""
            SELECT MONTH(podt) AS mth, SUM(tamt) AS total
            FROM In_PoMas
            WHERE deleted = 0 AND CAST(podt AS DATE) BETWEEN ? AND ?
            GROUP BY MONTH(podt)
        """, (start_date, end_date))
        po_rows = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    labels = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"]
    sales_map = {m: 0.0 for m in month_order}
    po_map = {m: 0.0 for m in month_order}

    for mth, total in sales_rows:
        mk = month_key_from_db(mth)
        if mk in sales_map: sales_map[mk] = round(float(total or 0) / 100_000, 2)

    for mth, total in po_rows:
        mk = month_key_from_db(mth)
        if mk in po_map: po_map[mk] = round(float(total or 0) / 100_000, 2)

    return Response({
        "company": tenant.get("company_name", ""),
        "fy": fy_label,
        "from": str(start_date),
        "to": str(end_date),
        "labels": labels,
        "sales": [sales_map[m] for m in month_order],
        "po": [po_map[m] for m in month_order],
    })


@api_view(['GET'])
def customer_complaints(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    fy_start_year = start_date.year if start_date.month >= 4 else start_date.year - 1
    fy_label = f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}"

    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT MONTH(CmpDate) AS month_num, COUNT(*) AS cnt
            FROM CustCompMas
            WHERE CmpDate IS NOT NULL AND CAST(CmpDate AS DATE) BETWEEN ? AND ?
            AND ISNULL(Deleted, 0) = 0
            GROUP BY MONTH(CmpDate)
        """, (start_date, end_date))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    labels = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"]
    counts = {m: 0 for m in month_order}
    for month_num, cnt in rows:
        mk = month_key_from_db(month_num)
        if mk in counts: counts[mk] = int(cnt or 0)

    return Response({
        "company": tenant.get("company_name", ""),
        "fy": fy_label,
        "from": str(start_date),
        "to": str(end_date),
        "labels": labels,
        "data": [counts[m] for m in month_order],
    })


@api_view(['GET'])
def rejection_monthwise(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    fy_start_year = start_date.year if start_date.month >= 4 else start_date.year - 1
    fy_label = f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}"

    try:
        cursor = conn.cursor()
        sql = """
            SELECT MonthNum, SUM(RejQty) as TotalRej
            FROM (
                SELECT MONTH(finspdate) as MonthNum, CAST(ISNULL(rejqty, 0) AS FLOAT) as RejQty
                FROM FinalInspectionEntry
                WHERE deleted = 0 AND CAST(finspdate AS DATE) BETWEEN ? AND ? AND rejqty > 0
                UNION ALL
                SELECT MONTH(inter_inspdate) as MonthNum, CAST(ISNULL(rejqty, 0) AS FLOAT) as RejQty
                FROM InterInspectionEntry
                WHERE deleted = 0 AND CAST(inter_inspdate AS DATE) BETWEEN ? AND ? AND rejqty > 0
                UNION ALL
                SELECT MONTH(m.inspdate) as MonthNum, CAST(ISNULL(d.matrej, 0) + ISNULL(d.macrej, 0) AS FLOAT) as RejQty
                FROM InJob_Det d
                INNER JOIN InJob_Mas m ON d.inspno = m.inspno
                WHERE m.deleted = 0 AND d.deleted = 0 AND CAST(m.inspdate AS DATE) BETWEEN ? AND ?
                AND (ISNULL(d.matrej, 0) > 0 OR ISNULL(d.macrej, 0) > 0)
            ) as CombinedData
            GROUP BY MonthNum
            ORDER BY MonthNum
        """
        params = [start_date, end_date, start_date, end_date, start_date, end_date]
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    labels = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"]
    counts = {m: 0 for m in month_order}
    for month_num, cnt in rows:
        mk = month_key_from_db(month_num)
        if mk in counts:
            counts[mk] = int(cnt or 0)

    return Response({
        "company": tenant.get("company_name", ""),
        "fy": fy_label,
        "from": str(start_date),
        "to": str(end_date),
        "labels": labels,
        "data": [counts[m] for m in month_order],
    })


@api_view(['GET'])
def rework_monthwise(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    fy_start_year = start_date.year if start_date.month >= 4 else start_date.year - 1
    fy_label = f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}"

    try:
        cursor = conn.cursor()
        sql = """
            SELECT MonthNum, SUM(ReworkQty) as TotalRework
            FROM (
                SELECT MONTH(finspdate) as MonthNum, CAST(ISNULL(matrejqty, 0) AS FLOAT) as ReworkQty
                FROM FinalInspectionEntry
                WHERE deleted = 0 AND CAST(finspdate AS DATE) BETWEEN ? AND ? AND matrejqty > 0
                UNION ALL
                SELECT MONTH(inter_inspdate) as MonthNum, CAST(ISNULL(rwqty, 0) AS FLOAT) as ReworkQty
                FROM InterInspectionEntry
                WHERE deleted = 0 AND CAST(inter_inspdate AS DATE) BETWEEN ? AND ? AND rwqty > 0
                UNION ALL
                SELECT MONTH(m.inspdate) as MonthNum, CAST(ISNULL(d.rwqty, 0) AS FLOAT) as ReworkQty
                FROM InJob_Det d
                INNER JOIN InJob_Mas m ON d.inspno = m.inspno
                WHERE m.deleted = 0 AND d.deleted = 0 AND CAST(m.inspdate AS DATE) BETWEEN ? AND ? AND d.rwqty > 0
            ) as CombinedData
            GROUP BY MonthNum
            ORDER BY MonthNum
        """
        params = [start_date, end_date, start_date, end_date, start_date, end_date]
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    labels = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"]
    counts = {m: 0 for m in month_order}
    for month_num, cnt in rows:
        mk = month_key_from_db(month_num)
        if mk in counts:
            counts[mk] = int(cnt or 0)

    return Response({
        "company": tenant.get("company_name", ""),
        "fy": fy_label,
        "from": str(start_date),
        "to": str(end_date),
        "labels": labels,
        "data": [counts[m] for m in month_order],
    })


@api_view(['GET'])
def mac_rejection_ppm(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    fy_start_year = start_date.year if start_date.month >= 4 else start_date.year - 1
    fy_label = f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}"

    try:
        cursor = conn.cursor()
        production_sql = """
            SELECT MonthNum, SUM(totQty) AS OverallQty
            FROM (
                SELECT MONTH(proddate) AS MonthNum, SUM(ISNULL(okqty,0)) AS totQty
                FROM ProductionEntry WHERE deleted = 0 AND CAST(proddate AS DATE) BETWEEN ? AND ? GROUP BY MONTH(proddate)
                UNION ALL
                SELECT MONTH(entrydate) AS MonthNum, SUM(ISNULL(qty,0)) AS totQty
                FROM ConvProductionEntry WHERE deleted = 0 AND CAST(entrydate AS DATE) BETWEEN ? AND ? GROUP BY MONTH(entrydate)
                UNION ALL
                SELECT MONTH(entrydate) AS MonthNum, SUM(ISNULL(qty,0)) AS totQty
                FROM ConvProductionEntryRod WHERE deleted = 0 AND CAST(entrydate AS DATE) BETWEEN ? AND ? GROUP BY MONTH(entrydate)
            ) AS Combined
            GROUP BY MonthNum
        """
        rejection_sql = """
            SELECT MonthNum, SUM(RejQty) AS TotalMachiningRejectionQty
            FROM (
                SELECT MONTH(i.inter_inspdate) AS MonthNum, ISNULL(r.qty,0) AS RejQty
                FROM Insp_RejectionEntry r
                INNER JOIN InterInspectionEntry i ON r.inter_inspno = i.inter_inspno
                INNER JOIN Rejection rej ON r.rejection = rej.rejection
                WHERE i.inter_inspdate BETWEEN ? AND ? AND r.deleted = 0 AND ISNULL(rej.matrej,0) = 0
                UNION ALL
                SELECT MONTH(fi.finspdate) AS MonthNum, ISNULL(f.qty,0) AS RejQty
                FROM FinalInspRejectionEntryOrg f
                INNER JOIN FinalInspectionEntry fi ON f.finspno = fi.finspno
                INNER JOIN Rejection rej ON f.rejection = rej.rejection
                WHERE fi.finspdate BETWEEN ? AND ? AND f.deleted = 0 AND ISNULL(rej.matrej,0) = 0
            ) AS MachiningRejection
            GROUP BY MonthNum
        """
        production_params = [start_date, end_date, start_date, end_date, start_date, end_date]
        rejection_params = [start_date, end_date, start_date, end_date]
        cursor.execute(production_sql, production_params)
        production_rows = cursor.fetchall()
        cursor.execute(rejection_sql, rejection_params)
        rejection_rows = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    labels = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"]
    prod_map = {m: 0.0 for m in month_order}
    rej_map = {m: 0.0 for m in month_order}
    for month_num, qty in production_rows:
        mk = month_key_from_db(month_num)
        if mk in prod_map: prod_map[mk] = float(qty or 0)
    for month_num, qty in rejection_rows:
        mk = month_key_from_db(month_num)
        if mk in rej_map: rej_map[mk] = float(qty or 0)
    ppm_map = {m: 0.0 for m in month_order}
    for m in month_order:
        if prod_map[m] > 0:
            ppm_map[m] = round((rej_map[m] / prod_map[m]) * 1_000_000, 2)
        else:
            ppm_map[m] = 0.0

    return Response({
        "company": tenant.get("company_name", ""),
        "fy": fy_label,
        "from": str(start_date),
        "to": str(end_date),
        "labels": labels,
        "data": [ppm_map[m] for m in month_order],
    })


@api_view(['GET'])
def otd_report(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    fy_start_year = start_date.year if start_date.month >= 4 else start_date.year - 1
    fy_label = f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}"

    try:
        cursor = conn.cursor()
        sql = """
            WITH AllSchedules AS (
                SELECT s.Apono, s.itcode AS partno, s.poslno, s.reqdate, s.shdQty, MONTH(p.podt) as PoMonth
                FROM In_PoDet_ShdQty s
                INNER JOIN In_PoMas p ON s.Apono = p.Apono
                WHERE CAST(p.podt AS DATE) BETWEEN ? AND ?
            ),
            AllDeliveries AS (
                SELECT d.Apono, d.partno, d.poslno, m.dcdate, d.okqty
                FROM DcInSubDetAssmPoDet d INNER JOIN DC_Mas m ON d.dcno = m.dcno WHERE d.deleted = 0
                UNION ALL
                SELECT d.Apono, d.partno, d.poslno, m.dcdate, d.okqty
                FROM DcInSubDet d INNER JOIN DC_Mas m ON d.dcno = m.dcno WHERE d.deleted = 0
            ),
            ScheduleWithDeliveries AS (
                SELECT sch.Apono, sch.partno, sch.poslno, sch.reqdate, sch.shdQty, sch.PoMonth, del.dcdate, del.okqty
                FROM AllSchedules sch
                LEFT JOIN AllDeliveries del ON sch.Apono = del.Apono AND sch.partno = del.partno AND sch.poslno = del.poslno
            ),
            CumulativeDeliveries AS (
                SELECT Apono, partno, poslno, reqdate, shdQty, PoMonth, dcdate, okqty,
                       SUM(okqty) OVER (PARTITION BY Apono, partno, poslno, reqdate ORDER BY dcdate) as CumQty
                FROM ScheduleWithDeliveries WHERE dcdate IS NOT NULL
            ),
            Completion AS (
                SELECT Apono, partno, poslno, reqdate, shdQty, PoMonth, MIN(dcdate) as CompletionDate
                FROM CumulativeDeliveries WHERE CumQty >= shdQty
                GROUP BY Apono, partno, poslno, reqdate, shdQty, PoMonth
            ),
            OTDCalc AS (
                SELECT comp.PoMonth,
                       CASE WHEN comp.CompletionDate <= comp.reqdate THEN 100.0
                            ELSE ISNULL(r.RatingFor, 0.0) END as OTDScore
                FROM Completion comp
                LEFT JOIN CustPoOTDRating r ON DATEDIFF(DAY, comp.reqdate, comp.CompletionDate) BETWEEN r.RatingFrom AND r.RatingTo
            )
            SELECT PoMonth, AVG(OTDScore) as AvgOTD, COUNT(*) as CompletedSchedules
            FROM OTDCalc GROUP BY PoMonth ORDER BY PoMonth
        """
        params = [start_date, end_date]
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    labels = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"]
    otd_map = {m: 0.0 for m in month_order}
    for month_num, avg_otd, completed in rows:
        mk = month_key_from_db(month_num)
        if mk in otd_map: otd_map[mk] = round(float(avg_otd or 0), 2)

    return Response({
        "company": tenant.get("company_name", ""),
        "fy": fy_label,
        "from": str(start_date),
        "to": str(end_date),
        "labels": labels,
        "data": [otd_map[m] for m in month_order],
    })


# ─────────────────────────────────────────────────────────────
#  PRODUCTION - OPERATOR EFFICIENCY (SABARISH)
# ─────────────────────────────────────────────────────────────

@api_view(['GET'])
def get_operators(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    try:
        cursor = conn.cursor()
        sql = """
            SELECT DISTINCT oprname
            FROM (
                SELECT oprname FROM ConvProductionEntryRod WHERE deleted = 0 AND oprname IS NOT NULL AND LTRIM(RTRIM(oprname)) != ''
                UNION
                SELECT oprname FROM ProductionEntry WHERE deleted = 0 AND oprname IS NOT NULL AND LTRIM(RTRIM(oprname)) != ''
                UNION
                SELECT oprname FROM ConvProductionEntry WHERE deleted = 0 AND oprname IS NOT NULL AND LTRIM(RTRIM(oprname)) != ''
            ) AS AllOperators
            ORDER BY oprname ASC
        """
        cursor.execute(sql)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        operators = [row[0].strip() for row in rows if row[0] and row[0].strip()]
        return Response({
            "operators": operators,
            "default": operators[0] if operators else None
        })
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)


@api_view(['GET'])
def operator_efficiency(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    oprname = request.GET.get("oprname", "").strip()
    if not oprname:
        return Response({"error": "Operator name (oprname) is required."}, status=400)

    start_date, end_date = parse_date_range(request)
    fy_start_year = start_date.year if start_date.month >= 4 else start_date.year - 1
    fy_label = f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}"

    try:
        cursor = conn.cursor()
        sql = """
            WITH AllEfficiency AS (
                SELECT oprname, MONTH(entrydate) AS MonthNo, ISNULL(eff,0) AS Eff, ISNULL(qty,0) AS Qty
                FROM ConvProductionEntryRod WHERE deleted = 0 AND entrydate BETWEEN ? AND ? AND oprname = ?
                UNION ALL
                SELECT oprname, MONTH(proddate) AS MonthNo, ISNULL(OPREFF,0) AS Eff, ISNULL(okqty,0) AS Qty
                FROM ProductionEntry WHERE deleted = 0 AND proddate BETWEEN ? AND ? AND oprname = ?
                UNION ALL
                SELECT oprname, MONTH(entrydate) AS MonthNo, ISNULL(eff,0) AS Eff, ISNULL(qty,0) AS Qty
                FROM ConvProductionEntry WHERE deleted = 0 AND entrydate BETWEEN ? AND ? AND oprname = ?
            )
            SELECT MonthNo, CASE WHEN SUM(Qty) = 0 THEN 0 ELSE SUM(Eff * Qty) / SUM(Qty) END AS OperatorEfficiency
            FROM AllEfficiency GROUP BY MonthNo ORDER BY MonthNo
        """
        params = [start_date, end_date, oprname, start_date, end_date, oprname, start_date, end_date, oprname]
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    labels = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"]
    eff_map = {m: 0.0 for m in month_order}
    for month_num, efficiency in rows:
        mk = month_key_from_db(month_num)
        if mk in eff_map: eff_map[mk] = round(float(efficiency or 0), 2)

    return Response({
        "company": tenant.get("company_name", ""),
        "fy": fy_label,
        "from": str(start_date),
        "to": str(end_date),
        "operator": oprname,
        "labels": labels,
        "data": [eff_map[m] for m in month_order],
    })


@api_view(['GET'])
def overall_operator_efficiency(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    fy_start_year = start_date.year if start_date.month >= 4 else start_date.year - 1
    fy_label = f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}"

    try:
        cursor = conn.cursor()
        sql = """
            WITH AllEfficiency AS (
                SELECT MONTH(entrydate) AS MonthNo, ISNULL(eff,0) AS Eff, ISNULL(qty,0) AS Qty
                FROM ConvProductionEntryRod WHERE deleted = 0 AND entrydate BETWEEN ? AND ?
                UNION ALL
                SELECT MONTH(proddate) AS MonthNo, ISNULL(OPREFF,0) AS Eff, ISNULL(okqty,0) AS Qty
                FROM ProductionEntry WHERE deleted = 0 AND proddate BETWEEN ? AND ?
                UNION ALL
                SELECT MONTH(entrydate) AS MonthNo, ISNULL(eff,0) AS Eff, ISNULL(qty,0) AS Qty
                FROM ConvProductionEntry WHERE deleted = 0 AND entrydate BETWEEN ? AND ?
            )
            SELECT MonthNo, CASE WHEN SUM(Qty) = 0 THEN 0 ELSE SUM(Eff * Qty) / SUM(Qty) END AS OverallEfficiency
            FROM AllEfficiency GROUP BY MonthNo ORDER BY MonthNo
        """
        params = [start_date, end_date, start_date, end_date, start_date, end_date]
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    labels = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"]
    eff_map = {m: 0.0 for m in month_order}
    for month_num, efficiency in rows:
        mk = month_key_from_db(month_num)
        if mk in eff_map: eff_map[mk] = round(float(efficiency or 0), 2)

    return Response({
        "company": tenant.get("company_name", ""),
        "fy": fy_label,
        "from": str(start_date),
        "to": str(end_date),
        "labels": labels,
        "data": [eff_map[m] for m in month_order],
    })


# ─────────────────────────────────────────────────────────────
#  DASHBOARD2 - PRANESH (Full Implementation)
# ─────────────────────────────────────────────────────────────

def inspection_grand_rejection_rework_totals(cursor, tenant, start_date, end_date):
    company_candidates = ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]
    deleted_candidates = ["deleted", "is_deleted", "Deleted", "IsDeleted"]
    company_code = tenant.get("company_code")
    grand_rej = 0.0
    grand_rwk = 0.0

    # 1. Job order inspection
    try:
        mas_tbl = find_first_table(cursor, ["InJob_Mas", "INJOB_MAS", "injob_mas"])
        det_tbl = find_first_table(cursor, ["InJob_Det", "INJOB_DET", "injob_det"])
        if mas_tbl and det_tbl:
            join_candidates = ["inspno", "InspNo", "INSPNO"]
            date_candidates = ["inspdate", "InspDate", "INSPDATE", "insp_date"]
            join_m = find_first_column(cursor, mas_tbl, join_candidates)
            join_d = find_first_column(cursor, det_tbl, join_candidates)
            mas_date = find_first_column(cursor, mas_tbl, date_candidates)
            matrej_c = find_first_column(cursor, det_tbl, ["matrej", "MatRej", "MATREJ"])
            macrej_c = find_first_column(cursor, det_tbl, ["macrej", "MacRej", "MACREJ"])
            rwqty_c = find_first_column(cursor, det_tbl, ["rwqty", "RwQty", "RWQTY", "rw_qty", "RW_Qty"])
            rej_parts = []
            if matrej_c: rej_parts.append(f"COALESCE(CAST(D.[{matrej_c}] AS FLOAT), 0)")
            if macrej_c: rej_parts.append(f"COALESCE(CAST(D.[{macrej_c}] AS FLOAT), 0)")
            if join_m and join_d and mas_date and rej_parts:
                inner_rejection = " + ".join(rej_parts)
                sql_total_rejection = f"COALESCE(SUM({inner_rejection}), 0)"
                sql_total_rework = f"COALESCE(SUM(COALESCE(CAST(D.[{rwqty_c}] AS FLOAT), 0)), 0)" if rwqty_c else "CAST(0 AS FLOAT)"
                mas_del = find_first_column(cursor, mas_tbl, deleted_candidates)
                det_del = find_first_column(cursor, det_tbl, deleted_candidates)
                mas_cc = find_first_column(cursor, mas_tbl, company_candidates)
                where_parts = [f"CAST(M.[{mas_date}] AS DATE) BETWEEN ? AND ?"]
                params = [start_date, end_date]
                if mas_del: where_parts.append(f"M.[{mas_del}] = 0")
                if det_del: where_parts.append(f"(D.[{det_del}] IS NULL OR D.[{det_del}] = 0)")
                if mas_cc and company_code:
                    where_parts.append(f"M.[{mas_cc}] = ?")
                    params.append(company_code)
                where_sql = " AND ".join(where_parts)
                sql = f"""
                    SELECT {sql_total_rejection} AS total_rejection, {sql_total_rework} AS total_rework
                    FROM [{mas_tbl}] M INNER JOIN [{det_tbl}] D ON M.[{join_m}] = D.[{join_d}] WHERE {where_sql}
                """
                cursor.execute(sql, params)
                row = cursor.fetchone()
                if row:
                    grand_rej += float((row[0] if row else 0) or 0)
                    grand_rwk += float((row[1] if row else 0) or 0)
    except Exception:
        pass

    # 2. Intermediate inspection
    try:
        tbl = find_first_table(cursor, ["InterInspectionEntry", "INTERINSPECTIONENTRY", "interinspectionentry"])
        if tbl:
            date_candidates = ["inter_inspdate", "Inter_InspDate", "INTER_INSPDATE", "interinspdate", "InterInspDate", "inspdate", "InspDate", "INSPDATE", "insp_date"]
            date_col = find_first_column(cursor, tbl, date_candidates)
            rejqty_c = find_first_column(cursor, tbl, ["rejqty", "RejQty", "REJQTY"])
            matrejqty_c = find_first_column(cursor, tbl, ["matrejqty", "MatRejQty", "MATREJQTY", "matrej_qty"])
            rwqty_c = find_first_column(cursor, tbl, ["rwqty", "RwQty", "RWQTY", "rw_qty"])
            rej_parts = []
            if rejqty_c: rej_parts.append(f"COALESCE(CAST([{rejqty_c}] AS FLOAT), 0)")
            if matrejqty_c: rej_parts.append(f"COALESCE(CAST([{matrejqty_c}] AS FLOAT), 0)")
            if date_col and rej_parts:
                inner_rejection = " + ".join(rej_parts)
                sql_total_rejection = f"COALESCE(SUM({inner_rejection}), 0)"
                sql_total_rework = f"COALESCE(SUM(COALESCE(CAST([{rwqty_c}] AS FLOAT), 0)), 0)" if rwqty_c else "CAST(0 AS FLOAT)"
                del_col = find_first_column(cursor, tbl, deleted_candidates)
                cc_col = find_first_column(cursor, tbl, company_candidates)
                where_parts = [f"CAST([{date_col}] AS DATE) BETWEEN ? AND ?"]
                params = [start_date, end_date]
                if del_col: where_parts.append(f"[{del_col}] = 0")
                if cc_col and company_code:
                    where_parts.append(f"[{cc_col}] = ?")
                    params.append(company_code)
                where_sql = " AND ".join(where_parts)
                sql = f"""
                    SELECT {sql_total_rejection} AS total_rejection, {sql_total_rework} AS total_rework
                    FROM [{tbl}] WHERE {where_sql}
                """
                cursor.execute(sql, params)
                row = cursor.fetchone()
                if row:
                    grand_rej += float((row[0] if row else 0) or 0)
                    grand_rwk += float((row[1] if row else 0) or 0)
    except Exception:
        pass

    # 3. Final inspection + org tables
    try:
        join_candidates = ["finspno", "FinSpNo", "FINSPNO", "FinspNo"]
        date_candidates = ["finspdate", "FinSpDate", "FINSPDATE", "fin_sp_date", "Fin_Sp_Date"]
        qty_qty_only = ["qty", "Qty", "QTY"]
        sch_m, nm_m, q_m = resolve_erp_table(cursor, ["FinalInspectionEntry", "FINALINSPECTIONENTRY", "finalinspectionentry"])
        if q_m:
            sch_r, nm_r, q_r = resolve_erp_table(cursor, ["FinalInspRejectionEntryOrg", "FINALINSPREJECTIONENTRYORG", "finalinsprejectionentryorg", "FinalInspRejectionOrg", "FINALINSPREJECTIONORG"])
            sch_w, nm_w, q_w = resolve_erp_table(cursor, ["FinalInspReworkEntryOrg", "FINALINSPREWORKENTRYORG", "finalinspreworkentryorg", "FinalInspectionReworkEntryOrg", "FinalInspReworkOrg"])
            join_m = find_column_ci(cursor, sch_m, nm_m, join_candidates)
            date_m = find_column_ci(cursor, sch_m, nm_m, date_candidates)
            del_m = find_column_ci(cursor, sch_m, nm_m, deleted_candidates)
            cc_m = find_column_ci(cursor, sch_m, nm_m, company_candidates)
            use_r = bool(q_r)
            join_r = qty_r = del_r = None
            if use_r:
                join_r = find_column_ci(cursor, sch_r, nm_r, join_candidates)
                qty_r = find_column_ci(cursor, sch_r, nm_r, qty_qty_only + ["rejqty", "RejQty", "REJQTY", "matrejqty", "MatRejQty"])
                del_r = find_column_ci(cursor, sch_r, nm_r, deleted_candidates)
                if not join_r or not qty_r: use_r = False
            use_w = bool(q_w)
            join_w = qty_w = del_w = None
            if use_w:
                join_w = find_column_ci(cursor, sch_w, nm_w, join_candidates)
                qty_w = find_column_ci(cursor, sch_w, nm_w, qty_qty_only + ["rwqty", "RwQty", "RWQTY"])
                del_w = find_column_ci(cursor, sch_w, nm_w, deleted_candidates)
                if not join_w or not qty_w: use_w = False
            if join_m and date_m and (use_r or use_w):
                rej_where = "1=1"
                if use_r and del_r: rej_where = f"ISNULL([{del_r}], 0) = 0"
                rwk_where = "1=1"
                if use_w and del_w: rwk_where = f"ISNULL([{del_w}], 0) = 0"
                mas_parts = [f"CAST(M.[{date_m}] AS DATE) BETWEEN ? AND ?"]
                params = [start_date, end_date]
                if del_m: mas_parts.append(f"ISNULL(M.[{del_m}], 0) = 0")
                if cc_m and company_code:
                    mas_parts.append(f"M.[{cc_m}] = ?")
                    params.append(company_code)
                mas_where_sql = " AND ".join(mas_parts)
                join_fragments = []
                if use_r:
                    join_fragments.append(f"""
                        LEFT JOIN (SELECT [{join_r}] AS rej_k, SUM(ISNULL(CAST([{qty_r}] AS FLOAT), 0)) AS TotalRejection FROM {q_r} WHERE {rej_where} GROUP BY [{join_r}]) R ON M.[{join_m}] = R.rej_k""")
                if use_w:
                    join_fragments.append(f"""
                        LEFT JOIN (SELECT [{join_w}] AS wrk_k, SUM(ISNULL(CAST([{qty_w}] AS FLOAT), 0)) AS TotalRework FROM {q_w} WHERE {rwk_where} GROUP BY [{join_w}]) W ON M.[{join_m}] = W.wrk_k""")
                sel_rej = "COALESCE(SUM(ISNULL(R.TotalRejection, 0)), 0)" if use_r else "CAST(0 AS FLOAT)"
                sel_rwk = "COALESCE(SUM(ISNULL(W.TotalRework, 0)), 0)" if use_w else "CAST(0 AS FLOAT)"
                sql = f"""
                    SELECT {sel_rej} AS total_rejection, {sel_rwk} AS total_rework
                    FROM {q_m} M {' '.join(join_fragments)} WHERE {mas_where_sql}
                """
                cursor.execute(sql, params)
                row = cursor.fetchone()
                if row:
                    grand_rej += float((row[0] if row else 0) or 0)
                    grand_rwk += float((row[1] if row else 0) or 0)
    except Exception:
        pass

    return grand_rej, grand_rwk


@api_view(['GET'])
def dashboard2_kpis(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    from_param = (request.GET.get("from") or "").strip()
    to_param = (request.GET.get("to") or "").strip()

    if from_param and to_param:
        try:
            start_date = datetime.strptime(from_param, "%Y-%m-%d").date()
            end_date = datetime.strptime(to_param, "%Y-%m-%d").date()
            if start_date > end_date: start_date, end_date = end_date, start_date
        except ValueError:
            today = date.today()
            start_date = date(today.year, today.month, 1)
            end_date = today
    else:
        today = date.today()
        start_date = date(today.year, today.month, 1)
        end_date = today

    production_specs = [("ConvProductionEntryRod", "qty"), ("ConvProductionEntry", "qty"), ("ProductionEntry", "okqty")]
    date_candidates = ["proddate", "prod_date", "entrydate", "entry_date", "vdate", "date", "finspdate", "inspdate", "rejdate", "jobdate"]
    company_candidates = ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]
    deleted_candidates = ["deleted", "is_deleted", "Deleted", "IsDeleted"]
    production_output = 0.0
    oa_efficiency = 0.0
    company_code = tenant.get("company_code")
    oaeff_table_specs = [
        ("ProductionEntry", ["proddate", "prod_date", "entrydate", "entry_date", "vdate", "date"]),
        ("ConvProductionEntryRod", ["entrydate", "entry_date", "proddate", "prod_date", "vdate", "date"]),
        ("ConvProductionEntry", ["entrydate", "entry_date", "proddate", "prod_date", "vdate", "date"]),
    ]
    oaeff_col_candidates = ["OAEFF", "OaEff", "oaeff", "OEENEW"]

    try:
        cursor = conn.cursor()
        for table_name, qty_col in production_specs:
            if not table_exists(cursor, table_name): continue
            date_col = find_first_column(cursor, table_name, date_candidates)
            if not date_col: continue
            company_col = find_first_column(cursor, table_name, company_candidates)
            deleted_col = find_first_column(cursor, table_name, deleted_candidates)
            sql = f"SELECT COALESCE(SUM(CAST([{qty_col}] AS FLOAT)), 0) FROM [{table_name}] WHERE CAST([{date_col}] AS date) BETWEEN ? AND ?"
            params = [start_date, end_date]
            if company_col and company_code:
                sql += f" AND [{company_col}] = ?"
                params.append(company_code)
            if deleted_col: sql += f" AND [{deleted_col}] = 0"
            cursor.execute(sql, params)
            row = cursor.fetchone()
            production_output += float((row[0] if row else 0) or 0)

        rejection_qty, rework_grand_total = inspection_grand_rejection_rework_totals(cursor, tenant, start_date, end_date)

        total_oaeff_sum = 0.0
        total_oaeff_rows = 0
        for table_name, date_prefs in oaeff_table_specs:
            if not table_exists(cursor, table_name): continue
            oaeff_col = find_first_column(cursor, table_name, oaeff_col_candidates)
            if not oaeff_col: continue
            date_col = find_first_column(cursor, table_name, date_prefs)
            if not date_col: continue
            company_col = find_first_column(cursor, table_name, company_candidates)
            deleted_col = find_first_column(cursor, table_name, deleted_candidates)
            sql = f"SELECT COALESCE(SUM(COALESCE(CAST([{oaeff_col}] AS FLOAT), 0)), 0), COUNT(*) FROM [{table_name}] WHERE CAST([{date_col}] AS date) BETWEEN ? AND ?"
            params = [start_date, end_date]
            if company_col and company_code:
                sql += f" AND [{company_col}] = ?"
                params.append(company_code)
            if deleted_col: sql += f" AND [{deleted_col}] = 0"
            cursor.execute(sql, params)
            row = cursor.fetchone()
            if row:
                total_oaeff_sum += float((row[0] if row[0] is not None else 0) or 0)
                total_oaeff_rows += int((row[1] if row[1] is not None else 0) or 0)

        oa_efficiency = (total_oaeff_sum / total_oaeff_rows) if total_oaeff_rows > 0 else 0.0
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "company": tenant.get("company_name", ""),
        "company_code": tenant.get("company_code", ""),
        "from": str(start_date),
        "to": str(end_date),
        "kpis": {
            "production_output": round(production_output, 2),
            "rejection_qty": round(rejection_qty, 2),
            "rework_grand_total": round(rework_grand_total, 2),
            "oa_efficiency": round(oa_efficiency, 2),
        },
    })


@api_view(["GET"])
def dashboard2_production_by_shift(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = dashboard2_parse_date_range_default_month(request)
    company_code = tenant.get("company_code")
    branch_specs = [
        ("ProductionEntry", "okqty", ["proddate", "prod_date", "entrydate", "entry_date", "vdate", "date"]),
        ("ConvProductionEntry", "qty", ["entrydate", "entry_date", "proddate", "prod_date", "vdate", "date"]),
        ("ConvProductionEntryRod", "qty", ["entrydate", "entry_date", "proddate", "prod_date", "vdate", "date"]),
    ]
    date_fallback = ["proddate", "prod_date", "entrydate", "entry_date", "vdate", "date", "finspdate", "inspdate"]
    company_candidates = ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]
    deleted_candidates = ["deleted", "is_deleted", "Deleted", "IsDeleted"]
    shift_candidates = ["shift", "shift_id", "Shift", "ShiftId", "SHIFT", "Shift_ID", "shiftid", "ShiftID"]
    totals_by_shift = {}

    try:
        cursor = conn.cursor()
        for table_name, qty_col, date_prefs in branch_specs:
            if not table_exists(cursor, table_name): continue
            if not find_first_column(cursor, table_name, [qty_col]): continue
            date_col = find_first_column(cursor, table_name, date_prefs) or find_first_column(cursor, table_name, date_fallback)
            if not date_col: continue
            shift_col = find_first_column(cursor, table_name, shift_candidates)
            if not shift_col: continue
            company_col = find_first_column(cursor, table_name, company_candidates)
            deleted_col = find_first_column(cursor, table_name, deleted_candidates)
            sql = f"SELECT [{shift_col}], COALESCE(SUM(CAST([{qty_col}] AS FLOAT)), 0) FROM [{table_name}] WHERE CAST([{date_col}] AS date) BETWEEN ? AND ?"
            params = [start_date, end_date]
            if company_col and company_code:
                sql += f" AND [{company_col}] = ?"
                params.append(company_code)
            if deleted_col: sql += f" AND [{deleted_col}] = 0"
            sql += f" GROUP BY [{shift_col}]"
            cursor.execute(sql, params)
            for row in cursor.fetchall() or []:
                raw_shift = row[0]
                key = str(raw_shift).strip() if raw_shift is not None else ""
                if key == "": key = "(unassigned)"
                qty = float((row[1] if len(row) > 1 else 0) or 0)
                totals_by_shift[key] = totals_by_shift.get(key, 0.0) + qty
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    shifts_out = [{"shift": k, "total_qty": round(v, 2)} for k, v in sorted(totals_by_shift.items(), key=lambda kv: kv[0])]
    return Response({"company": tenant.get("company_name", ""), "company_code": tenant.get("company_code", ""), "from": str(start_date), "to": str(end_date), "shifts": shifts_out})


@api_view(["GET"])
def dashboard2_idle_hours(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = dashboard2_parse_date_range_default_month(request)
    company_code = tenant.get("company_code")
    d1 = start_date.isoformat()
    d2 = end_date.isoformat()

    final_sql = f"""
SELECT CAST(ISNULL(SUM(AcceptedMinutes), 0) AS FLOAT) / 60.0 AS accepted_hours,
       CAST(ISNULL(SUM(NonAcceptedMinutes), 0) AS FLOAT) / 60.0 AS non_accepted_hours,
       CAST(ISNULL(SUM(TotalMinutes), 0) AS FLOAT) / 60.0 AS total_idle_hours
FROM (
    SELECT ISNULL(SUM(CASE WHEN IR.IsAccept = 1 THEN DATEDIFF(MINUTE, '1900-01-01', D.tottime) END), 0) AS AcceptedMinutes,
           ISNULL(SUM(CASE WHEN IR.IsAccept = 0 THEN DATEDIFF(MINUTE, '1900-01-01', D.tottime) END), 0) AS NonAcceptedMinutes,
           ISNULL(SUM(DATEDIFF(MINUTE, '1900-01-01', D.tottime)), 0) AS TotalMinutes
    FROM Machine_IdleEntryDet D INNER JOIN Machine_IdleEntryMas M ON D.prodid = M.prodid
    LEFT JOIN IdleReasons IR ON LTRIM(RTRIM(D.reasons)) = LTRIM(RTRIM(IR.IdleReasons)) AND IR.deleted = 0
    WHERE M.proddate BETWEEN '{d1}' AND '{d2}' AND M.deleted = 0 AND D.deleted = 0
    UNION ALL
    SELECT ISNULL(SUM(CASE WHEN IR.IsAccept = 1 THEN DATEDIFF(MINUTE, '1900-01-01', P.tottime) END), 0),
           ISNULL(SUM(CASE WHEN IR.IsAccept = 0 THEN DATEDIFF(MINUTE, '1900-01-01', P.tottime) END), 0),
           ISNULL(SUM(DATEDIFF(MINUTE, '1900-01-01', P.tottime)), 0)
    FROM Prod_IdleEntry P INNER JOIN ProductionEntry PE ON P.prodid = PE.prodid
    LEFT JOIN IdleReasons IR ON LTRIM(RTRIM(P.reasons)) = LTRIM(RTRIM(IR.IdleReasons)) AND IR.deleted = 0
    WHERE PE.proddate BETWEEN '{d1}' AND '{d2}' AND PE.deleted = 0 AND P.deleted = 0
    UNION ALL
    SELECT ISNULL(SUM(CASE WHEN IR.IsAccept = 1 THEN DATEDIFF(MINUTE, '1900-01-01', CI.tottime) END), 0),
           ISNULL(SUM(CASE WHEN IR.IsAccept = 0 THEN DATEDIFF(MINUTE, '1900-01-01', CI.tottime) END), 0),
           ISNULL(SUM(DATEDIFF(MINUTE, '1900-01-01', CI.tottime)), 0)
    FROM conv_IdleEntry CI INNER JOIN (
        SELECT entryno FROM ConvProductionEntry WHERE entrydate BETWEEN '{d1}' AND '{d2}' AND deleted = 0
        UNION SELECT entryno FROM ConvProductionEntryRod WHERE entrydate BETWEEN '{d1}' AND '{d2}' AND deleted = 0
    ) C ON CI.entryno = C.entryno
    LEFT JOIN IdleReasons IR ON LTRIM(RTRIM(CI.reasons)) = LTRIM(RTRIM(IR.IdleReasons)) AND IR.deleted = 0
    WHERE CI.deleted = 0
) AS X
"""
    acc_h = na_h = tot_h = 0.0
    try:
        cursor = conn.cursor()
        cursor.execute(final_sql)
        row = cursor.fetchone()
        if row:
            acc_h = float(row[0] or 0)
            na_h = float(row[1] or 0)
            tot_h = float(row[2] or 0)
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    other_mins = max(0.0, (tot_h - acc_h - na_h) * 60.0)
    return Response({"company": tenant.get("company_name", ""), "company_code": company_code or "", "from": str(start_date), "to": str(end_date), "summary": {"accepted_hours": round(acc_h, 2), "non_accepted_hours": round(na_h, 2), "total_idle_hours": round(tot_h, 2), "other_hours": round(other_mins / 60.0, 2)}})


@api_view(["GET"])
def dashboard2_downtime_by_reason(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = dashboard2_parse_date_range_default_month(request)
    d1 = start_date.isoformat()
    d2 = end_date.isoformat()

    sql = f"""
SELECT IR.IdleReasons AS Reason, CAST(SUM(DATEDIFF(MINUTE, '1900-01-01', X.tottime)) / 60.0 AS DECIMAL(12, 2)) AS Hours
FROM (
    SELECT D.reasons AS reasons, D.tottime AS tottime FROM Machine_IdleEntryDet D INNER JOIN Machine_IdleEntryMas M ON D.prodid = M.prodid WHERE M.proddate BETWEEN '{d1}' AND '{d2}' AND M.deleted = 0 AND D.deleted = 0
    UNION ALL
    SELECT P.reasons, P.tottime FROM Prod_IdleEntry P INNER JOIN ProductionEntry PE ON P.prodid = PE.prodid WHERE PE.proddate BETWEEN '{d1}' AND '{d2}' AND PE.deleted = 0 AND P.deleted = 0
    UNION ALL
    SELECT CI.reasons, CI.tottime FROM conv_IdleEntry CI INNER JOIN (SELECT entryno FROM ConvProductionEntry WHERE entrydate BETWEEN '{d1}' AND '{d2}' AND deleted = 0 UNION SELECT entryno FROM ConvProductionEntryRod WHERE entrydate BETWEEN '{d1}' AND '{d2}' AND deleted = 0) C ON CI.entryno = C.entryno WHERE CI.deleted = 0
) X
INNER JOIN IdleReasons IR ON LTRIM(RTRIM(X.reasons)) = LTRIM(RTRIM(IR.IdleReasons)) AND IR.deleted = 0
WHERE IR.IsAccept = 0
GROUP BY IR.IdleReasons
ORDER BY SUM(DATEDIFF(MINUTE, '1900-01-01', X.tottime)) DESC
"""
    reasons_out = []
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
        for row in cursor.fetchall() or []:
            r, h = row[0], row[1]
            reasons_out.append({"reason": (str(r).strip() if r is not None else "") or "(blank)", "hours": float(h or 0)})
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({"company": tenant.get("company_name", ""), "company_code": tenant.get("company_code", ""), "from": str(start_date), "to": str(end_date), "reasons": reasons_out})


@api_view(["GET"])
def dashboard2_customer_complaints(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = dashboard2_parse_date_range_default_month(request)
    company_code = tenant.get("company_code")
    company_candidates = ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]
    complaints = []
    try:
        cursor = conn.cursor()
        tbl_m = find_first_table(cursor, ["CustCompMas", "custcompmas", "CUSTCOMPMAS"])
        if not tbl_m:
            cursor.close()
            conn.close()
            return Response({"company": tenant.get("company_name", ""), "company_code": tenant.get("company_code", ""), "from": str(start_date), "to": str(end_date), "complaints": [], "error": "CustCompMas table not found in this database."})

        cmpno_m = find_first_column(cursor, tbl_m, ["CmpNo", "cmpno", "CMPNO"])
        cid_m = find_first_column(cursor, tbl_m, ["CId", "cid", "CID", "CustId", "custid"])
        date_m = find_first_column(cursor, tbl_m, ["CmpDate", "cmpdate", "CMPDATE"])
        del_m = find_first_column(cursor, tbl_m, ["Deleted", "deleted", "IsDeleted"])
        part_m = find_first_column(cursor, tbl_m, ["partno", "PartNo", "PARTNO", "ItCode", "itcode"])
        desc_m = find_first_column(cursor, tbl_m, ["description", "Description", "DESCRIPTION", "Descr", "descr"])
        rem_m = find_first_column(cursor, tbl_m, ["Remarks", "remarks", "REMARKS"])
        cor_m = find_first_column(cursor, tbl_m, ["coraction", "CorAction", "CORACTION"])
        per_m = find_first_column(cursor, tbl_m, ["peraction", "PerAction", "PERACTION"])
        company_m = find_first_column(cursor, tbl_m, company_candidates)

        if not cmpno_m or not date_m:
            cursor.close()
            conn.close()
            return Response({"error": "CustCompMas is missing CmpNo or CmpDate (or equivalent).", "complaints": []}, status=500)

        part_expr = f"ISNULL(CAST(M.[{part_m}] AS NVARCHAR(256)), N'')" if part_m else "N''"
        desc_expr = f"ISNULL(CAST(M.[{desc_m}] AS NVARCHAR(512)), N'')" if desc_m else "N''"
        product_sql = f"({part_expr} + CASE WHEN LEN({desc_expr}) > 0 AND LEN({part_expr}) > 0 THEN N' - ' ELSE N'' END + {desc_expr})"
        rem_sql = f"CAST(M.[{rem_m}] AS NVARCHAR(MAX))" if rem_m else "CAST(NULL AS NVARCHAR(MAX))"
        cor_sql = f"CAST(M.[{cor_m}] AS NVARCHAR(MAX))" if cor_m else "CAST(NULL AS NVARCHAR(MAX))"
        per_sql = f"CAST(M.[{per_m}] AS NVARCHAR(MAX))" if per_m else "CAST(NULL AS NVARCHAR(MAX))"

        cm_join = ""
        customer_sql = "CAST(NULL AS NVARCHAR(512))"
        tbl_cm = find_first_table(cursor, ["CustMast", "custmast", "CUSTMAST"])
        if tbl_cm and cid_m:
            id_cm = find_first_column(cursor, tbl_cm, ["Id", "id", "ID", "CustId", "custid"])
            cname_cm = find_first_column(cursor, tbl_cm, ["CName", "cname", "CNAME", "CustName", "custname", "Name"])
            del_cm = find_first_column(cursor, tbl_cm, ["Deleted", "deleted", "IsDeleted"])
            if id_cm and cname_cm:
                cm_del = f" AND ISNULL(CM.[{del_cm}], 0) = 0" if del_cm else ""
                cm_join = f"LEFT JOIN [{tbl_cm}] CM ON M.[{cid_m}] = CM.[{id_cm}]{cm_del}"
                customer_sql = f"CAST(CM.[{cname_cm}] AS NVARCHAR(512))"

        tbl_d = find_first_table(cursor, ["CustCompDet", "custcompdet", "CUSTCOMPDET"])
        if tbl_d:
            cmpno_d = find_first_column(cursor, tbl_d, ["CmpNo", "cmpno", "CMPNO"])
            action_d = find_first_column(cursor, tbl_d, ["ActionTaken", "actiontaken", "ACTIONTAKEN"])
            status_d = find_first_column(cursor, tbl_d, ["CompStatus", "compstatus", "COMPSTATUS", "Status", "status"])
            del_d = find_first_column(cursor, tbl_d, ["Deleted", "deleted", "IsDeleted"])
            if cmpno_d:
                del_dx = f" AND ISNULL(dx.[{del_d}], 0) = 0" if del_d else ""
                sel_a = f"CAST(dx.[{action_d}] AS NVARCHAR(MAX))" if action_d else "CAST(NULL AS NVARCHAR(MAX))"
                sel_s = f"CAST(dx.[{status_d}] AS NVARCHAR(200))" if status_d else "CAST(NULL AS NVARCHAR(200))"
                apply_block = f"""OUTER APPLY (SELECT TOP 1 {sel_a} AS ActionTaken, {sel_s} AS CompStatus FROM [{tbl_d}] dx WHERE dx.[{cmpno_d}] = M.[{cmpno_m}]{del_dx} ORDER BY (SELECT NULL)) AS Det"""
            else:
                apply_block = """OUTER APPLY (SELECT CAST(NULL AS NVARCHAR(MAX)) AS ActionTaken, CAST(NULL AS NVARCHAR(200)) AS CompStatus) AS Det"""
        else:
            apply_block = """OUTER APPLY (SELECT CAST(NULL AS NVARCHAR(MAX)) AS ActionTaken, CAST(NULL AS NVARCHAR(200)) AS CompStatus) AS Det"""

        mas_where = f"CAST(M.[{date_m}] AS DATE) BETWEEN ? AND ?"
        params = [start_date, end_date]
        if del_m: mas_where += f" AND ISNULL(M.[{del_m}], 0) = 0"
        if company_m and company_code:
            mas_where += f" AND M.[{company_m}] = ?"
            params.append(company_code)

        sql = f"""
SELECT TOP 500 M.[{cmpno_m}] AS Complaint_ID, {customer_sql} AS Customer_Name, CAST({product_sql} AS NVARCHAR(800)) AS Product, {rem_sql} AS Complaint_Description, Det.ActionTaken AS Action_Taken, M.[{date_m}] AS Complaint_Date, {cor_sql} AS Corrective_Action, {per_sql} AS Permanent_Action, Det.CompStatus AS Status
FROM [{tbl_m}] M {apply_block} {cm_join} WHERE {mas_where} ORDER BY M.[{date_m}], M.[{cmpno_m}]
"""
        cursor.execute(sql, params)
        for row in cursor.fetchall() or []:
            cid, cname, prod, crem, tact, cdt, cor, per, st = row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8]
            cdt_s = cdt.isoformat()[:10] if cdt is not None and hasattr(cdt, "isoformat") else (str(cdt) if cdt is not None else "")
            complaints.append({"complaint_id": str(cid).strip() if cid is not None else "", "customer_name": (str(cname).strip() if cname is not None else "") or "—", "product": (str(prod).strip() if prod is not None else "") or "—", "complaint_description": (str(crem).strip() if crem is not None else "") or "—", "action_taken": (str(tact).strip() if tact is not None else "") or "—", "complaint_date": cdt_s, "corrective_action": (str(cor).strip() if cor is not None else "") or "—", "permanent_action": (str(per).strip() if per is not None else "") or "—", "status": (str(st).strip() if st is not None else "") or "—"})
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}", "complaints": []}, status=500)

    return Response({"company": tenant.get("company_name", ""), "company_code": tenant.get("company_code", ""), "from": str(start_date), "to": str(end_date), "complaints": complaints})


# ─────────────────────────────────────────────────────────────
#  DASHBOARD2 - ADDITIONAL PRANESH ENDPOINTS
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def dashboard2_po_pipeline(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = dashboard2_parse_date_range_default_month(request)
    company_code = tenant.get("company_code")
    company_candidates = ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]

    cursor = None
    try:
        cursor = conn.cursor()
        sch_po, nm_po, q_po = resolve_erp_table(cursor, ["POMas", "pomas", "POMAS", "PoMas"])
        sch_det, nm_det, q_det = resolve_erp_table(cursor, ["PODet", "podet", "PODET", "PoDet"])
        sch_grn, nm_grn, q_grn = resolve_erp_table(cursor, ["grninsubdet", "GRNInSubDet", "GrnInSubDet", "GRNINSUBDET"])
        sch_gm, nm_gm, q_gm = resolve_erp_table(cursor, ["grn_mas", "GRN_MAS", "Grn_Mas", "GrnMas"])
        sch_cm, nm_cm, q_cm = resolve_erp_table(cursor, ["CustMast", "custmast", "CUSTMAST"])

        if not q_po or not q_det or not q_grn:
            cursor.close()
            conn.close()
            return Response({"error": "Required tables not found.", "from": str(start_date), "to": str(end_date), "summary": None, "rows": []}, status=404)

        po_pono = find_column_ci(cursor, sch_po, nm_po, ["pono", "PONo", "PONO", "PoNo", "PONumber"])
        po_date = find_column_ci(cursor, sch_po, nm_po, ["podate", "PODate", "PO_Date", "po_date", "PODt"])
        po_del = find_column_ci(cursor, sch_po, nm_po, ["deleted", "Deleted", "IsDeleted"])
        po_dtype = find_column_ci(cursor, sch_po, nm_po, ["dtype", "DType", "POType", "potype", "Type"])
        po_appr = find_column_ci(cursor, sch_po, nm_po, ["IsApprovePo", "isapprovepo", "IsApproved", "Approved", "ApprovePo"])
        po_cid = find_column_ci(cursor, sch_po, nm_po, ["cid", "CId", "CID", "CustId", "custid"])
        po_cc = find_column_ci(cursor, sch_po, nm_po, company_candidates)

        det_pono = find_column_ci(cursor, sch_det, nm_det, ["pono", "PONo", "PONO", "PoNo"])
        det_del = find_column_ci(cursor, sch_det, nm_det, ["deleted", "Deleted", "IsDeleted"])
        det_rm = find_column_ci(cursor, sch_det, nm_det, ["rmname", "RMName", "RMNAME", "RmName", "ItemName"])
        det_mt = find_column_ci(cursor, sch_det, nm_det, ["mattype", "MatType", "MATTYPE", "Mat_Type"])
        det_uom = find_column_ci(cursor, sch_det, nm_det, ["uom", "UOM", "Uom", "Unit"])
        det_qty = find_column_ci(cursor, sch_det, nm_det, ["qty", "Qty", "QTY", "Quantity"])
        det_qtykgs = find_column_ci(cursor, sch_det, nm_det, ["QtyKgs", "qtykgs", "Qty_Kgs", "qty_kgs"])
        det_amt = find_column_ci(cursor, sch_det, nm_det, ["amount", "Amount", "AMOUNT", "Amt", "Value"])

        g_pono = find_column_ci(cursor, sch_grn, nm_grn, ["pono", "PONo", "PONO", "PoNo"])
        g_grnno = find_column_ci(cursor, sch_grn, nm_grn, ["grnno", "GRNNo", "GRNNO", "GrnNo"])
        g_del = find_column_ci(cursor, sch_grn, nm_grn, ["deleted", "Deleted", "IsDeleted"])

        gm_grn = gm_date = gm_del = gm_namt = None
        if q_gm:
            gm_grn = find_column_ci(cursor, sch_gm, nm_gm, ["grnno", "GRNNo", "GRNNO", "GrnNo"])
            gm_date = find_column_ci(cursor, sch_gm, nm_gm, ["grndate", "GRNDate", "GRNDATE", "Grn_Date"])
            gm_del = find_column_ci(cursor, sch_gm, nm_gm, ["deleted", "Deleted", "IsDeleted"])
            gm_namt = find_column_ci(cursor, sch_gm, nm_gm, ["namt", "NAMT", "NetAmt", "GrandTotal", "Amount", "TotAmt"])

        cm_id = cm_name = cm_del = None
        if q_cm:
            cm_id = find_column_ci(cursor, sch_cm, nm_cm, ["Id", "id", "ID", "CustId", "custid"])
            cm_name = find_column_ci(cursor, sch_cm, nm_cm, ["CName", "cname", "CNAME", "CustName", "Name"])
            cm_del = find_column_ci(cursor, sch_cm, nm_cm, ["deleted", "Deleted", "IsDeleted"])

        if not po_pono or not po_date or not det_pono or not det_amt or not g_pono or not g_grnno:
            cursor.close()
            conn.close()
            return Response({"error": "Required columns not found.", "from": str(start_date), "to": str(end_date), "summary": None, "rows": []}, status=500)

        del_po_sql = f"ISNULL(M.[{po_del}], 0) = 0" if po_del else "1=1"
        del_det_sql = f"ISNULL(D.[{det_del}], 0) = 0" if det_del else "1=1"
        dtype_filter = f" AND LOWER(ISNULL(M.[{po_dtype}], N'')) NOT IN (N'job order', N'general')" if po_dtype else ""
        company_sql = ""
        cte_params = [start_date, end_date]
        if po_cc and company_code:
            company_sql = f" AND M.[{po_cc}] = ?"
            cte_params.append(company_code)

        appr_sel = f"M.[{po_appr}] AS appr_col" if po_appr else "CAST(0 AS INT) AS appr_col"
        grn_dist_where = f"ISNULL(gx.[{g_del}], 0) = 0" if g_del else "1=1"
        grnval_sql = "CAST(0 AS FLOAT)"
        if q_gm and gm_grn and gm_namt:
            gm_del_sql = f"ISNULL(GM.[{gm_del}], 0) = 0" if gm_del else "1=1"
            gjoin_del = f"ISNULL(G.[{g_del}], 0) = 0" if g_del else "1=1"
            grnval_sql = f"""(SELECT SUM(ISNULL(CAST(GM.[{gm_namt}] AS FLOAT), 0)) FROM {q_gm} GM INNER JOIN {q_grn} G ON GM.[{gm_grn}] = G.[{g_grnno}] INNER JOIN M_FILTER MF ON G.[{g_pono}] = MF.pono_col WHERE {gjoin_del} AND {gm_del_sql})"""

        cte_sql = f"""WITH M_FILTER AS (SELECT M.[{po_pono}] AS pono_col, {appr_sel} FROM {q_po} M WHERE CAST(M.[{po_date}] AS DATE) BETWEEN ? AND ? AND {del_po_sql}{dtype_filter}{company_sql})"""
        summary_sql = cte_sql + f"""
SELECT (SELECT COUNT(DISTINCT pono_col) FROM M_FILTER) AS Total_POs,
       (SELECT COUNT(DISTINCT CASE WHEN appr_col = 1 THEN pono_col END) FROM M_FILTER) AS Approved,
       (SELECT COUNT(DISTINCT CASE WHEN ISNULL(appr_col, 0) = 0 THEN pono_col END) FROM M_FILTER) AS Pending_Approval,
       (SELECT COUNT(DISTINCT CASE WHEN G.pono_join IS NOT NULL THEN H.pono_col END) FROM M_FILTER H LEFT JOIN (SELECT DISTINCT gx.[{g_pono}] AS pono_join FROM {q_grn} gx WHERE {grn_dist_where}) G ON H.pono_col = G.pono_join) AS GRN_Done,
       (SELECT COUNT(DISTINCT CASE WHEN G.pono_join IS NULL THEN H.pono_col END) FROM M_FILTER H LEFT JOIN (SELECT DISTINCT gx.[{g_pono}] AS pono_join FROM {q_grn} gx WHERE {grn_dist_where}) G ON H.pono_col = G.pono_join) AS GRN_Pending,
       (SELECT SUM(ISNULL(CAST(D.[{det_amt}] AS FLOAT), 0)) FROM {q_det} D INNER JOIN M_FILTER MF ON D.[{det_pono}] = MF.pono_col WHERE {del_det_sql}) AS Total_PO_Value,
       {grnval_sql} AS Total_GRN_Value
"""
        cursor.execute(summary_sql, cte_params)
        sum_row = cursor.fetchone()
        summary_out = {"total_pos": int(sum_row[0] or 0) if sum_row else 0, "approved": int(sum_row[1] or 0) if sum_row else 0, "pending_approval": int(sum_row[2] or 0) if sum_row else 0, "grn_done": int(sum_row[3] or 0) if sum_row else 0, "grn_pending": int(sum_row[4] or 0) if sum_row else 0, "total_po_value": float(sum_row[5] or 0) if sum_row else 0.0, "total_grn_value": float(sum_row[6] or 0) if sum_row else 0.0}

        rm_a = f"D.[{det_rm}]" if det_rm else "CAST(NULL AS NVARCHAR(256))"
        mt_a = f"D.[{det_mt}]" if det_mt else "CAST(NULL AS NVARCHAR(256))"
        mat_concat = f"ISNULL(CAST({rm_a} AS NVARCHAR(256)), N'') + N' - ' + ISNULL(CAST({mt_a} AS NVARCHAR(256)), N'')"
        po_qty_sql = f"CAST(ROUND(ISNULL(D.[{det_qty}], 0), 2) AS NVARCHAR(50)) + N' ' + ISNULL(CAST(D.[{det_uom}] AS NVARCHAR(32)), N'')" if det_qty and det_uom else (f"CAST(ROUND(ISNULL(D.[{det_qty}], 0), 2) AS NVARCHAR(50))" if det_qty else "N''")

        vendor_sql = "CAST(NULL AS NVARCHAR(512))"
        cm_join = ""
        if q_cm and cm_id and cm_name and po_cid:
            cm_del_sql = f" AND ISNULL(CM.[{cm_del}], 0) = 0" if cm_del else ""
            cm_join = f"LEFT JOIN {q_cm} CM ON M.[{po_cid}] = CM.[{cm_id}]{cm_del_sql}"
            vendor_sql = f"CAST(CM.[{cm_name}] AS NVARCHAR(512))"

        g_agg = f"""LEFT JOIN (SELECT gx.[{g_pono}] AS pono_g, MAX(gx.[{g_grnno}]) AS grnno_g FROM {q_grn} gx WHERE {grn_dist_where} GROUP BY gx.[{g_pono}]) G ON M.[{po_pono}] = G.pono_g"""
        gm_join = ""
        grn_no_sel = "CAST(G.grnno_g AS NVARCHAR(64))"
        grn_dt_sel = "CAST(NULL AS DATE)"
        if q_gm and gm_grn and gm_date:
            gm_del_j = f" AND ISNULL(GM.[{gm_del}], 0) = 0" if gm_del else ""
            gm_join = f"LEFT JOIN {q_gm} GM ON G.grnno_g = GM.[{gm_grn}]{gm_del_j}"
            grn_dt_sel = f"GM.[{gm_date}]"

        mas_where_detail = f"""CAST(M.[{po_date}] AS DATE) BETWEEN ? AND ? AND {del_po_sql}{dtype_filter}{company_sql}"""
        detail_params = [start_date, end_date]
        if po_cc and company_code: detail_params.append(company_code)

        detail_sql = f"""
SELECT TOP 3000 M.[{po_pono}] AS PO_Number, {f"M.[{po_dtype}]" if po_dtype else "CAST(NULL AS NVARCHAR(64))"} AS PO_Type, {vendor_sql} AS Vendor_Name, CAST({mat_concat} AS NVARCHAR(520)) AS Material, CAST({po_qty_sql} AS NVARCHAR(120)) AS PO_Qty, ISNULL(CAST(D.[{det_amt}] AS FLOAT), 0) AS Value, M.[{po_date}] AS PO_Date, {grn_no_sel} AS GRN_No, {grn_dt_sel} AS GRN_Date
FROM {q_po} M INNER JOIN {q_det} D ON M.[{po_pono}] = D.[{det_pono}] AND {del_det_sql} {cm_join} {g_agg} {gm_join}
WHERE {mas_where_detail} ORDER BY M.[{po_date}], M.[{po_pono}]
"""
        cursor.execute(detail_sql, detail_params)
        rows_out = []
        for row in cursor.fetchall() or []:
            po_dt = row[6]
            grn_dt = row[8]
            rows_out.append({"po_number": str(row[0]).strip() if row[0] is not None else "", "po_type": str(row[1]).strip() if row[1] is not None else "", "vendor_name": str(row[2]).strip() if row[2] is not None else "", "material": str(row[3]).strip() if row[3] is not None else "", "po_qty": str(row[4]).strip() if row[4] is not None else "", "value": float(row[5] or 0), "po_date": po_dt.isoformat()[:10] if po_dt is not None and hasattr(po_dt, "isoformat") else (str(po_dt)[:10] if po_dt else ""), "grn_no": str(row[7]).strip() if row[7] is not None else "", "grn_date": grn_dt.isoformat()[:10] if grn_dt is not None and hasattr(grn_dt, "isoformat") else (str(grn_dt)[:10] if grn_dt else "")})
        cursor.close()
        conn.close()
        return Response({"company": tenant.get("company_name", ""), "company_code": tenant.get("company_code", ""), "from": str(start_date), "to": str(end_date), "summary": summary_out, "rows": rows_out})
    except Exception as e:
        if cursor:
            try: cursor.close()
            except: pass
        if conn:
            try: conn.close()
            except: pass
        return Response({"error": f"Database error: {str(e)}", "from": str(start_date), "to": str(end_date), "summary": None, "rows": []}, status=500)


@api_view(["GET"])
def dashboard2_inspection_pending_snapshot(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    cursor = None
    warnings = []
    try:
        cursor = conn.cursor()
        sch_rcs, nm_rcs, q_rcs = resolve_erp_table(cursor, ["RouteCardStock", "ROUTECARDSTOCK", "routecardstock", "Route_Card_Stock"])
        sch_job, nm_job, q_job = resolve_erp_table(cursor, ["InJob_DetTemp", "INJOB_DETTEMP", "injob_dettemp", "InJobDetTemp"])

        inter_col = final_col = None
        if q_rcs:
            inter_col = find_column_ci(cursor, sch_rcs, nm_rcs, ["interinspqty", "InterInspQty", "INTERINSPQTY", "InterInsp_Qty"])
            final_col = find_column_ci(cursor, sch_rcs, nm_rcs, ["finalinspqty", "FinalInspQty", "FINALINSPQTY", "FinalInsp_Qty"])
            if not inter_col: warnings.append("RouteCardStock found but interinspqty missing; intermediate_pending_qty = 0.")
            if not final_col: warnings.append("RouteCardStock found but finalinspqty missing; final_pending_qty = 0.")
        else:
            warnings.append("RouteCardStock not found; intermediate and final pending qty returned as 0.")

        job_bal = insp_col = job_del = None
        if q_job:
            job_bal = find_column_ci(cursor, sch_job, nm_job, ["JobBalQty", "jobbalqty", "JOBBALQTY", "Job_Bal_Qty", "BalQty"])
            insp_col = find_column_ci(cursor, sch_job, nm_job, ["insp", "Insp", "INSP", "Inspected", "IsInsp"])
            job_del = find_column_ci(cursor, sch_job, nm_job, ["deleted", "Deleted", "IsDeleted"])
            if not job_bal: warnings.append("InJob_DetTemp found but JobBalQty missing; joborder_pending_qty = 0.")
            if not insp_col: warnings.append("InJob_DetTemp found but insp column missing; joborder_pending_qty = 0.")
        else:
            warnings.append("InJob_DetTemp not found; joborder_pending_qty returned as 0.")

        sel_inter = f"""(SELECT SUM(ISNULL(CAST(R.[{inter_col}] AS FLOAT), 0)) FROM {q_rcs} R WHERE ISNULL(CAST(R.[{inter_col}] AS FLOAT), 0) > 0)""" if inter_col and q_rcs else "CAST(0 AS FLOAT)"
        sel_final = f"""(SELECT SUM(ISNULL(CAST(R.[{final_col}] AS FLOAT), 0)) FROM {q_rcs} R WHERE ISNULL(CAST(R.[{final_col}] AS FLOAT), 0) > 0)""" if final_col and q_rcs else "CAST(0 AS FLOAT)"
        sel_job = f"""(SELECT SUM(ISNULL(CAST(T.[{job_bal}] AS FLOAT), 0)) FROM {q_job} T WHERE ISNULL(CAST(T.[{insp_col}] AS INT), 0) = 0 AND ISNULL(T.[{job_del}], 0) = 0)""" if job_bal and insp_col and q_job else "CAST(0 AS FLOAT)"

        sql = f"""SELECT ISNULL({sel_inter}, 0) AS intermediate_pending_qty, ISNULL({sel_final}, 0) AS final_pending_qty, ISNULL({sel_job}, 0) AS joborder_pending_qty"""
        cursor.execute(sql)
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        def _f(idx):
            if not row or row[idx] is None: return 0.0
            try: return float(row[idx])
            except: return 0.0

        return Response({"company": tenant.get("company_name", ""), "company_code": tenant.get("company_code", ""), "intermediate_pending_qty": _f(0), "final_pending_qty": _f(1), "joborder_pending_qty": _f(2), "warnings": warnings})
    except Exception as e:
        if cursor:
            try: cursor.close()
            except: pass
        if conn:
            try: conn.close()
            except: pass
        return Response({"error": f"Database error: {str(e)}", "intermediate_pending_qty": None, "final_pending_qty": None, "joborder_pending_qty": None}, status=500)


@api_view(["GET"])
def dashboard2_grn_pending_pipeline(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = dashboard2_parse_date_range_default_month(request)
    cursor = None
    warnings = []

    try:
        cursor = conn.cursor()
        sch_m, nm_m, q_m = resolve_erp_table(cursor, ["grn_mas", "GRN_MAS", "Grn_Mas", "GrnMas", "GRNMast", "grnmast"])
        sch_d, nm_d, q_d = resolve_erp_table(cursor, ["grn_det", "GRN_DET", "Grn_Det", "GrnDet", "GRNDet"])

        if not q_m or not q_d:
            cursor.close()
            conn.close()
            return Response({"from": str(start_date), "to": str(end_date), "rows": [], "error": "grn_mas or grn_det table not found."}, status=404)

        m_grn = find_column_ci(cursor, sch_m, nm_m, ["grnno", "GRNNo", "GRNNO", "GrnNo"])
        m_date = find_column_ci(cursor, sch_m, nm_m, ["grndate", "GRNDate", "GRNDATE", "Grn_Date"])
        m_del = find_column_ci(cursor, sch_m, nm_m, ["deleted", "Deleted", "IsDeleted"])
        m_dtype = find_column_ci(cursor, sch_m, nm_m, ["dtype", "DType", "GRNType", "Type"])
        d_grn = find_column_ci(cursor, sch_d, nm_d, ["grnno", "GRNNo", "GRNNO", "GrnNo"])
        d_del = find_column_ci(cursor, sch_d, nm_d, ["deleted", "Deleted", "IsDeleted"])
        d_insp = find_column_ci(cursor, sch_d, nm_d, ["insp", "Insp", "INSP", "Inspected", "IsInsp"])
        d_part = find_column_ci(cursor, sch_d, nm_d, ["partno", "PartNo", "PARTNO", "Part_No", "ItCode", "itcode"])
        d_desc = find_column_ci(cursor, sch_d, nm_d, ["description", "Description", "DESCRIPTION", "Descr", "descr", "PartName"])
        d_uom = find_column_ci(cursor, sch_d, nm_d, ["uom", "UOM", "Uom", "Unit"])
        d_qty = find_column_ci(cursor, sch_d, nm_d, ["qty", "Qty", "QTY", "Quantity"])
        d_qtykgs = find_column_ci(cursor, sch_d, nm_d, ["QtyKgs", "qtykgs", "Qty_Kgs", "qty_kgs"])
        d_pono = find_column_ci(cursor, sch_d, nm_d, ["pono", "PONo", "PONO", "PoNo", "PONumber"])

        if not m_grn or not m_date or not d_grn:
            cursor.close()
            conn.close()
            return Response({"error": "Required columns not found.", "from": str(start_date), "to": str(end_date), "rows": []}, status=500)

        if not d_insp: warnings.append("insp column not found on grn_det; cannot apply pending-inspection filter.")
        part_e = f"CAST(D.[{d_part}] AS NVARCHAR(256))" if d_part else "CAST(N'' AS NVARCHAR(256))"
        desc_e = f"CAST(D.[{d_desc}] AS NVARCHAR(512))" if d_desc else "CAST(N'' AS NVARCHAR(512))"
        mat_sql = f"ISNULL({part_e}, N'') + N' - ' + ISNULL({desc_e}, N'')"
        dtype_sel = f"CAST(M.[{m_dtype}] AS NVARCHAR(128))" if m_dtype else "CAST(NULL AS NVARCHAR(128))"
        mas_del_sql = f"ISNULL(M.[{m_del}], 0) = 0" if m_del else "1=1"
        join_del = f" AND ISNULL(D.[{d_del}], 0) = 0" if d_del else ""
        insp_where = f"ISNULL(CAST(D.[{d_insp}] AS INT), 0) = 0" if d_insp else "1=0"
        else_qty_sum = f"ISNULL(CAST(D.[{d_qty}] AS FLOAT), 0)" if d_qty else "CAST(0 AS FLOAT)"
        w_uom_lower = f"LOWER(ISNULL(D.[{d_uom}], N''))" if d_uom else "N''"
        weight_qty_sum = f"""CASE WHEN TRY_CAST(D.[{d_pono}] AS FLOAT) IS NOT NULL THEN TRY_CAST(D.[{d_pono}] AS FLOAT) ELSE 0.0 END""" if d_pono else "CAST(0 AS FLOAT)"
        sum_qty_inner = f"""CASE WHEN {w_uom_lower} IN (N'kgs', N'kg', N'mtrs', N'mtr', N'meter', N'meters') THEN {weight_qty_sum} ELSE {else_qty_sum} END""" if d_uom and d_qty else else_qty_sum

        summary_sql = f"""SELECT COUNT(*) AS Total_Record_Count, ISNULL(SUM({sum_qty_inner}), 0) AS Total_Qty FROM {q_m} M INNER JOIN {q_d} D ON M.[{m_grn}] = D.[{d_grn}]{join_del} WHERE CAST(M.[{m_date}] AS DATE) BETWEEN ? AND ? AND {mas_del_sql} AND {insp_where}"""
        params = [start_date, end_date]
        cursor.execute(summary_sql, params)
        sum_row = cursor.fetchone()
        total_record_count = int(sum_row[0] or 0) if sum_row else 0
        total_qty_val = float(sum_row[1] or 0) if sum_row else 0.0

        w_uom = f"LOWER(ISNULL(D.[{d_uom}], N''))" if d_uom else "N''"
        weight_numeric_display = f"""CASE WHEN TRY_CAST(D.[{d_pono}] AS FLOAT) IS NOT NULL THEN TRY_CAST(D.[{d_pono}] AS FLOAT) ELSE 0.0 END""" if d_pono else (f"CASE WHEN ISNULL(D.[{d_qtykgs}], 0) > 0 THEN CAST(D.[{d_qtykgs}] AS FLOAT) ELSE ISNULL(CAST(D.[{d_qty}] AS FLOAT), 0) END" if d_qtykgs else f"ISNULL(CAST(D.[{d_qty}] AS FLOAT), 0)")
        qty_sql = f"""CASE WHEN {w_uom} IN (N'kgs', N'kg', N'mtrs', N'mtr', N'meter', N'meters') THEN CAST(ROUND(CAST({weight_numeric_display} AS FLOAT), 2) AS NVARCHAR(50)) + N' ' + ISNULL(CAST(D.[{d_uom}] AS NVARCHAR(32)), N'') ELSE CAST(ROUND(ISNULL(CAST(D.[{d_qty}] AS FLOAT), 0), 2) AS NVARCHAR(50)) + N' ' + ISNULL(CAST(D.[{d_uom}] AS NVARCHAR(32)), N'') END""" if d_uom and d_qty else (f"CAST(ROUND(ISNULL(CAST(D.[{d_qty}] AS FLOAT), 0), 2) AS NVARCHAR(50))" + (f" + N' ' + ISNULL(CAST(D.[{d_uom}] AS NVARCHAR(32)), N'')" if d_uom else "") if d_qty else "N''")

        sql = f"""SELECT TOP 500 M.[{m_grn}] AS GRN_No, M.[{m_date}] AS GRN_Date, {dtype_sel} AS Type_, CAST({mat_sql} AS NVARCHAR(800)) AS Material_, CAST({qty_sql} AS NVARCHAR(120)) AS Qty_ FROM {q_m} M INNER JOIN {q_d} D ON M.[{m_grn}] = D.[{d_grn}]{join_del} WHERE CAST(M.[{m_date}] AS DATE) BETWEEN ? AND ? AND {mas_del_sql} AND {insp_where} ORDER BY M.[{m_date}] DESC, M.[{m_grn}]"""
        cursor.execute(sql, params)
        rows_out = []
        for row in cursor.fetchall() or []:
            gdt = row[1]
            rows_out.append({"grn_no": str(row[0]).strip() if row[0] is not None else "", "grn_date": gdt.isoformat()[:10] if gdt is not None and hasattr(gdt, "isoformat") else (str(gdt)[:10] if gdt else ""), "type": str(row[2]).strip() if row[2] is not None else "", "material": str(row[3]).strip() if row[3] is not None else "", "qty": str(row[4]).strip() if row[4] is not None else ""})
        cursor.close()
        conn.close()
        return Response({"company": tenant.get("company_name", ""), "company_code": tenant.get("company_code", ""), "from": str(start_date), "to": str(end_date), "summary": {"total_record_count": total_record_count, "total_qty": total_qty_val}, "rows": rows_out, "warnings": warnings})
    except Exception as e:
        if cursor:
            try: cursor.close()
            except: pass
        if conn:
            try: conn.close()
            except: pass
        return Response({"error": f"Database error: {str(e)}", "from": str(start_date), "to": str(end_date), "summary": None, "rows": []}, status=500)


@api_view(["GET"])
def dashboard2_iqc_rejections(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = dashboard2_parse_date_range_default_month(request)
    cursor = None
    warnings = []

    try:
        cursor = conn.cursor()
        sch_gm, nm_gm, q_gm = resolve_erp_table(cursor, ["grn_mas", "GRN_MAS", "Grn_Mas", "GrnMas", "GRNMast", "grnmast"])
        sch_im, nm_im, q_im = resolve_erp_table(cursor, ["inspmas", "InspMas", "INSPMAS", "Insp_Mas", "InspMas"])
        sch_id, nm_id, q_id = resolve_erp_table(cursor, ["inspdet", "InspDet", "INSPDET", "Insp_Det", "InspDet"])
        sch_cm, nm_cm, q_cm = resolve_erp_table(cursor, ["CustMast", "custmast", "CUSTMAST"])

        if not q_gm or not q_im or not q_id:
            cursor.close()
            conn.close()
            return Response({"from": str(start_date), "to": str(end_date), "summary": None, "rows": [], "error": "grn_mas, inspmas, or inspdet table not found."}, status=404)

        gm_grn = find_column_ci(cursor, sch_gm, nm_gm, ["grnno", "GRNNo", "GRNNO", "GrnNo"])
        gm_date = find_column_ci(cursor, sch_gm, nm_gm, ["grndate", "GRNDate", "GRNDATE", "Grn_Date"])
        gm_del = find_column_ci(cursor, sch_gm, nm_gm, ["deleted", "Deleted", "IsDeleted"])
        gm_dtype = find_column_ci(cursor, sch_gm, nm_gm, ["dtype", "DType", "GRNType", "Type"])
        gm_cid = find_column_ci(cursor, sch_gm, nm_gm, ["cid", "CId", "CID", "CustId", "custid"])
        im_grn = find_column_ci(cursor, sch_im, nm_im, ["grnno", "GRNNo", "GRNNO", "GrnNo"])
        im_irno = find_column_ci(cursor, sch_im, nm_im, ["irno", "IRNo", "IRNO", "IrNo", "InspNo"])
        im_irdate = find_column_ci(cursor, sch_im, nm_im, ["irdate", "IRDate", "IRDATE", "Ir_Date", "InspDate", "inspdate"])
        im_del = find_column_ci(cursor, sch_im, nm_im, ["deleted", "Deleted", "IsDeleted"])
        d_irno = find_column_ci(cursor, sch_id, nm_id, ["irno", "IRNo", "IRNO", "IrNo"])
        d_del = find_column_ci(cursor, sch_id, nm_id, ["deleted", "Deleted", "IsDeleted"])
        d_part = find_column_ci(cursor, sch_id, nm_id, ["partno", "PartNo", "PARTNO", "Part_No", "ItCode", "itcode"])
        d_desc = find_column_ci(cursor, sch_id, nm_id, ["description", "Description", "DESCRIPTION", "Descr", "descr", "PartName"])
        d_matrej = find_column_ci(cursor, sch_id, nm_id, ["matrej", "MatRej", "MATREJ", "Mat_Rej", "mat_rej"])
        d_macrej = find_column_ci(cursor, sch_id, nm_id, ["macrej", "MacRej", "MACREJ", "Mac_Rej", "mac_rej"])

        if not gm_grn or not gm_date or not im_grn or not im_irno or not im_irdate or not d_irno or not d_matrej or not d_macrej:
            cursor.close()
            conn.close()
            return Response({"error": "Required columns not found.", "from": str(start_date), "to": str(end_date), "summary": None, "rows": []}, status=500)

        mat_e = f"ISNULL(CAST(D.[{d_matrej}] AS FLOAT), 0)" if d_matrej else "CAST(0 AS FLOAT)"
        mac_e = f"ISNULL(CAST(D.[{d_macrej}] AS FLOAT), 0)" if d_macrej else "CAST(0 AS FLOAT)"
        rej_sum = f"({mat_e} + {mac_e})"
        rej_filter = f"({mat_e} > 0 OR {mac_e} > 0)"
        part_e = f"CAST(D.[{d_part}] AS NVARCHAR(256))" if d_part else "CAST(N'' AS NVARCHAR(256))"
        desc_e = f"CAST(D.[{d_desc}] AS NVARCHAR(512))" if d_desc else "CAST(N'' AS NVARCHAR(512))"
        mat_sql = f"ISNULL({part_e}, N'') + N' - ' + ISNULL({desc_e}, N'')"
        dtype_sel = f"CAST(GM.[{gm_dtype}] AS NVARCHAR(128))" if gm_dtype else "CAST(NULL AS NVARCHAR(128))"
        gm_del_sql = f"ISNULL(GM.[{gm_del}], 0) = 0" if gm_del else "1=1"
        im_del_sql = f"ISNULL(IM.[{im_del}], 0) = 0" if im_del else "1=1"
        join_d_del = f" AND ISNULL(D.[{d_del}], 0) = 0" if d_del else ""

        cm_join = ""
        vendor_sql = "CAST(NULL AS NVARCHAR(512))"
        if q_cm and gm_cid:
            cm_id = find_column_ci(cursor, sch_cm, nm_cm, ["Id", "id", "ID", "CustId", "custid"])
            cm_name = find_column_ci(cursor, sch_cm, nm_cm, ["CName", "cname", "CNAME", "CustName", "Name"])
            cm_del = find_column_ci(cursor, sch_cm, nm_cm, ["deleted", "Deleted", "IsDeleted"])
            if cm_id and cm_name:
                cm_del_x = f" AND ISNULL(CM.[{cm_del}], 0) = 0" if cm_del else ""
                cm_join = f"LEFT JOIN {q_cm} CM ON GM.[{gm_cid}] = CM.[{cm_id}]{cm_del_x}"
                vendor_sql = f"CAST(CM.[{cm_name}] AS NVARCHAR(512))"

        base_from = f"""FROM {q_gm} GM INNER JOIN {q_im} IM ON GM.[{gm_grn}] = IM.[{im_grn}] AND {im_del_sql} INNER JOIN {q_id} D ON IM.[{im_irno}] = D.[{d_irno}]{join_d_del} {cm_join}"""
        date_where = f"""CAST(GM.[{gm_date}] AS DATE) BETWEEN ? AND ? AND CAST(IM.[{im_irdate}] AS DATE) BETWEEN ? AND ? AND {gm_del_sql} AND {rej_filter}"""
        params = [start_date, end_date, start_date, end_date]

        summary_sql = f"""SELECT COUNT(*) AS Total_Record_Count, ISNULL(SUM({rej_sum}), 0) AS Total_Rejection_Qty {base_from} WHERE {date_where}"""
        cursor.execute(summary_sql, params)
        sum_row = cursor.fetchone()
        total_rec = int(sum_row[0] or 0) if sum_row else 0
        total_rej = float(sum_row[1] or 0) if sum_row else 0.0

        detail_sql = f"""SELECT TOP 500 D.[{d_irno}] AS GRN_Insp_No, IM.[{im_irdate}] AS GRN_Insp_Date, {dtype_sel} AS Type_, {vendor_sql} AS Vendor_Name, CAST({mat_sql} AS NVARCHAR(800)) AS Material_, CAST({rej_sum} AS FLOAT) AS Total_Rejection_Qty {base_from} WHERE {date_where} ORDER BY IM.[{im_irdate}] DESC, D.[{d_irno}]"""
        cursor.execute(detail_sql, params)
        rows_out = []
        for row in cursor.fetchall() or []:
            idt = row[1]
            rows_out.append({"grn_insp_no": str(row[0]).strip() if row[0] is not None else "", "grn_insp_date": idt.isoformat()[:10] if idt is not None and hasattr(idt, "isoformat") else (str(idt)[:10] if idt else ""), "type": str(row[2]).strip() if row[2] is not None else "", "vendor_name": str(row[3]).strip() if row[3] is not None else "", "material": str(row[4]).strip() if row[4] is not None else "", "total_rejection_qty": float(row[5] or 0) if row[5] is not None else 0.0})
        cursor.close()
        conn.close()
        return Response({"company": tenant.get("company_name", ""), "company_code": tenant.get("company_code", ""), "from": str(start_date), "to": str(end_date), "summary": {"total_record_count": total_rec, "total_rejection_qty": total_rej}, "rows": rows_out, "warnings": warnings})
    except Exception as e:
        if cursor:
            try: cursor.close()
            except: pass
        if conn:
            try: conn.close()
            except: pass
        return Response({"error": f"Database error: {str(e)}", "from": str(start_date), "to": str(end_date), "summary": None, "rows": []}, status=500)


@api_view(["GET"])
def dashboard2_otd(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = dashboard2_parse_date_range_default_month(request)
    company_code = tenant.get("company_code")

    try:
        cursor = conn.cursor()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    tbl_po_mas = find_first_table(cursor, candidates=["In_PoMas", "in_pomas", "IN_POMAS"])
    tbl_shd = find_first_table(cursor, candidates=["In_PoDet_ShdQty", "in_podet_shdqty", "IN_PODET_SHDQTY"])
    tbl_dc_mas = find_first_table(cursor, candidates=["dc_mas", "Dc_Mas", "DC_Mas", "DcMas"])
    tbl_dc_det = find_first_table(cursor, candidates=["DcInSubDet", "dcinsubdet", "DCINSUBDET"])
    tbl_dc_assm = find_first_table(cursor, candidates=["DcInSubDetAssmPoDet", "dcinsubdetassmpodet", "DCINSUBDETASSMPODET"])
    tbl_rating = find_first_table(cursor, candidates=["CustPoOTDRating", "custpootdrating", "CUSTPOOTDRATING"])

    if not all([tbl_po_mas, tbl_shd, tbl_dc_mas, tbl_dc_det, tbl_dc_assm]):
        cursor.close()
        conn.close()
        missing = [n for n, t in [("In_PoMas", tbl_po_mas), ("In_PoDet_ShdQty", tbl_shd), ("dc_mas", tbl_dc_mas), ("DcInSubDet", tbl_dc_det), ("DcInSubDetAssmPoDet", tbl_dc_assm)] if not t]
        return Response({"error": f"Missing table(s) for OTD: {', '.join(missing)}"}, status=404)

    po_apono = find_first_column(cursor, tbl_po_mas, ["APono", "apono", "APNO", "PONo", "pono", "PoNo"])
    po_deleted = find_first_column(cursor, tbl_po_mas, ["deleted", "Deleted", "is_deleted"])
    po_company = find_first_column(cursor, tbl_po_mas, ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"])
    sh_apono = find_first_column(cursor, tbl_shd, ["APono", "apono", "APNO", "PONo", "pono"])
    sh_itcode = find_first_column(cursor, tbl_shd, ["itcode", "ItCode", "ITCODE", "PartNo", "partno", "Part_No"])
    sh_req = find_first_column(cursor, tbl_shd, ["reqdate", "ReqDate", "REQDATE", "Req_Dt", "req_dt"])
    sh_deleted = find_first_column(cursor, tbl_shd, ["deleted", "Deleted", "is_deleted"])
    dcno_m = find_first_column(cursor, tbl_dc_mas, ["dcno", "DcNo", "DCNO", "DC_No"])
    dc_dt = find_first_column(cursor, tbl_dc_mas, ["dcdate", "DcDate", "DCDT", "DC_DT", "dcdt", "date", "Date"])
    dc_m_deleted = find_first_column(cursor, tbl_dc_mas, ["deleted", "Deleted", "is_deleted"])
    dc_m_company = find_first_column(cursor, tbl_dc_mas, ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"])

    def dc_cols(tbl):
        return {"apono": find_first_column(cursor, tbl, ["apono", "APono", "APNO", "PONo", "pono"]), "partno": find_first_column(cursor, tbl, ["partno", "PartNo", "PARTNO", "itcode", "ItCode"]), "dcno": find_first_column(cursor, tbl, ["dcno", "DcNo", "DCNO"]), "ok": find_first_column(cursor, tbl, ["okqty", "OkQty", "OKQty"]), "matrej": find_first_column(cursor, tbl, ["matrej", "MatRej", "MATREJ"]), "macrej": find_first_column(cursor, tbl, ["macrej", "MacRej", "MACREJ"]), "uncomp": find_first_column(cursor, tbl, ["uncompqty", "UncompQty", "UNCOMPQTY", "uncomp_qty"]), "deleted": find_first_column(cursor, tbl, ["deleted", "Deleted", "is_deleted"])}

    c1 = dc_cols(tbl_dc_det)
    c2 = dc_cols(tbl_dc_assm)
    required = [(f"{tbl_po_mas}.apono", po_apono), (f"{tbl_shd}.apono", sh_apono), (f"{tbl_shd}.itcode", sh_itcode), (f"{tbl_shd}.reqdate", sh_req), (f"{tbl_dc_mas}.dcno", dcno_m), (f"{tbl_dc_mas}.dcdate", dc_dt), (f"{tbl_dc_det}.apono", c1["apono"]), (f"{tbl_dc_det}.partno", c1["partno"]), (f"{tbl_dc_det}.dcno", c1["dcno"]), (f"{tbl_dc_assm}.apono", c2["apono"]), (f"{tbl_dc_assm}.partno", c2["partno"]), (f"{tbl_dc_assm}.dcno", c2["dcno"])]
    for label, col in required:
        if not col:
            cursor.close()
            conn.close()
            return Response({"error": f"OTD: could not resolve column for {label}"}, status=422)

    qty_expr_det = " + ".join([f"COALESCE(CAST(d.[{c}] AS FLOAT), 0)" for c in [c1["ok"], c1["matrej"], c1["macrej"], c1["uncomp"]] if c]) or "0"
    qty_expr_assm = " + ".join([f"COALESCE(CAST(a.[{c}] AS FLOAT), 0)" for c in [c2["ok"], c2["matrej"], c2["macrej"], c2["uncomp"]] if c]) or "0"

    def filt_po(alias):
        parts = [f"[{alias}].[{po_deleted}] = 0"] if po_deleted else []
        if po_company and company_code: parts.append(f"[{alias}].[{po_company}] = ?")
        return " AND " + " AND ".join(parts) if parts else ""

    def filt_dc_mas(alias):
        parts = [f"CAST([{alias}].[{dc_dt}] AS DATE) BETWEEN ? AND ?"]
        if dc_m_deleted: parts.append(f"[{alias}].[{dc_m_deleted}] = 0")
        if dc_m_company and company_code: parts.append(f"[{alias}].[{dc_m_company}] = ?")
        return " AND " + " AND ".join(parts)

    sh_where = f"[{sh_deleted}] = 0" if sh_deleted else "1=1"
    d_del = f"d.[{c1['deleted']}] = 0" if c1["deleted"] else "1=1"
    a_del = f"a.[{c2['deleted']}] = 0" if c2["deleted"] else "1=1"
    join_po = f"INNER JOIN [{tbl_po_mas}] p ON p.[{po_apono}] = d.[{c1['apono']}]{filt_po('p')}"

    union_sql = f"""
        SELECT d.[{c1['dcno']}] AS dcno, LTRIM(RTRIM(CAST(d.[{c1['apono']}] AS NVARCHAR(64)))) AS apono, LTRIM(RTRIM(CAST(d.[{c1['partno']}] AS NVARCHAR(128)))) AS partno, CAST(m.[{dc_dt}] AS DATE) AS dc_date, ({qty_expr_det}) AS del_qty
        FROM [{tbl_dc_det}] d INNER JOIN [{tbl_dc_mas}] m ON m.[{dcno_m}] = d.[{c1['dcno']}] {join_po}
        WHERE {d_del} AND {filt_dc_mas('m')}
        UNION ALL
        SELECT a.[{c2['dcno']}] AS dcno, LTRIM(RTRIM(CAST(a.[{c2['apono']}] AS NVARCHAR(64)))) AS apono, LTRIM(RTRIM(CAST(a.[{c2['partno']}] AS NVARCHAR(128)))) AS partno, CAST(m2.[{dc_dt}] AS DATE) AS dc_date, ({qty_expr_assm}) AS del_qty
        FROM [{tbl_dc_assm}] a INNER JOIN [{tbl_dc_mas}] m2 ON m2.[{dcno_m}] = a.[{c2['dcno']}] INNER JOIN [{tbl_po_mas}] p2 ON p2.[{po_apono}] = a.[{c2['apono']}]{filt_po('p2')}
        WHERE {a_del} AND {filt_dc_mas('m2')}
    """

    rf = rt = rfor = None
    if tbl_rating:
        rf = find_first_column(cursor, tbl_rating, ["RatingFrom", "ratingfrom", "RATINGFROM"])
        rt = find_first_column(cursor, tbl_rating, ["RatingTo", "ratingto", "RATINGTO"])
        rfor = find_first_column(cursor, tbl_rating, ["RatingFor", "ratingfor", "RATINGFOR"])

    rating_join = ""
    rating_expr = "CAST(0 AS FLOAT)"
    if tbl_rating and rf and rt and rfor:
        rating_join = f"LEFT JOIN [{tbl_rating}] r ON j.days_late >= r.[{rf}] AND j.days_late <= r.[{rt}]"
        rating_expr = f"COALESCE(CAST(r.[{rfor}] AS FLOAT), 0)"

    def append_po_params():
        pl = []
        if po_company and company_code: pl.append(company_code)
        return pl

    def append_dc_params():
        pl = [start_date, end_date]
        if dc_m_company and company_code: pl.append(company_code)
        return pl

    union_params = append_po_params() + append_dc_params() + append_po_params() + append_dc_params()

    main_sql = f"""
        WITH sch AS (SELECT LTRIM(RTRIM(CAST([{sh_apono}] AS NVARCHAR(64)))) AS apono, LTRIM(RTRIM(CAST([{sh_itcode}] AS NVARCHAR(128)))) AS itcode, MIN(CAST([{sh_req}] AS DATE)) AS reqdate FROM [{tbl_shd}] WHERE {sh_where} GROUP BY LTRIM(RTRIM(CAST([{sh_apono}] AS NVARCHAR(64)))), LTRIM(RTRIM(CAST([{sh_itcode}] AS NVARCHAR(128))))),
        del AS ({union_sql}),
        joined AS (SELECT del.dc_date, del.del_qty, sch.reqdate, CASE WHEN del.dc_date <= sch.reqdate THEN 0 ELSE DATEDIFF(DAY, sch.reqdate, del.dc_date) END AS days_late FROM del INNER JOIN sch ON sch.apono = del.apono AND sch.itcode = del.partno)
        SELECT COALESCE(SUM(CASE WHEN j.dc_date <= j.reqdate THEN j.del_qty ELSE 0 END), 0) AS on_time_qty, COALESCE(SUM(j.del_qty), 0) AS total_qty, COALESCE(SUM(CASE WHEN j.dc_date > j.reqdate THEN 1 ELSE 0 END), 0) AS delayed_lines, COALESCE(SUM(CAST(j.del_qty AS FLOAT) * ({rating_expr})), 0) AS rating_num
        FROM joined j {rating_join}
    """

    trend_sql = f"""
        WITH sch AS (SELECT LTRIM(RTRIM(CAST([{sh_apono}] AS NVARCHAR(64)))) AS apono, LTRIM(RTRIM(CAST([{sh_itcode}] AS NVARCHAR(128)))) AS itcode, MIN(CAST([{sh_req}] AS DATE)) AS reqdate FROM [{tbl_shd}] WHERE {sh_where} GROUP BY LTRIM(RTRIM(CAST([{sh_apono}] AS NVARCHAR(64)))), LTRIM(RTRIM(CAST([{sh_itcode}] AS NVARCHAR(128))))),
        del AS ({union_sql}),
        joined AS (SELECT del.dc_date, del.del_qty, sch.reqdate FROM del INNER JOIN sch ON sch.apono = del.apono AND sch.itcode = del.partno)
        SELECT YEAR(j.dc_date) AS y, MONTH(j.dc_date) AS m, COALESCE(SUM(CASE WHEN j.dc_date <= j.reqdate THEN j.del_qty ELSE 0 END), 0) AS on_time_qty, COALESCE(SUM(j.del_qty), 0) AS total_qty
        FROM joined j GROUP BY YEAR(j.dc_date), MONTH(j.dc_date) ORDER BY YEAR(j.dc_date), MONTH(j.dc_date)
    """

    try:
        cursor.execute(main_sql, union_params)
        row = cursor.fetchone()
        on_time_qty = float(row[0] or 0)
        total_qty = float(row[1] or 0)
        delayed_lines = int(row[2] or 0)
        rating_num = float(row[3] or 0)
        cursor.execute(trend_sql, union_params)
        trend_rows = cursor.fetchall()
    except Exception as e:
        cursor.close()
        conn.close()
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    cursor.close()
    conn.close()
    otd_pct = round((on_time_qty / total_qty) * 100, 2) if total_qty > 0 else None
    rating_weighted_pct = round((rating_num / total_qty), 2) if total_qty > 0 else None
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    trend = []
    for tr in trend_rows or []:
        y, m, otq, tq = int(tr[0]), int(tr[1]), float(tr[2] or 0), float(tr[3] or 0)
        pct = round((otq / tq) * 100, 2) if tq > 0 else None
        trend.append({"year": y, "month": m, "label": f"{month_names[m - 1]} {y}", "on_time_delivery_pct": pct, "total_qty": round(tq, 2)})
    schedule_adherence_pct = rating_weighted_pct if rating_weighted_pct is not None else otd_pct

    return Response({"company": tenant.get("company_name", ""), "company_code": tenant.get("company_code", ""), "from": str(start_date), "to": str(end_date), "kpis": {"on_time_delivery_pct": otd_pct, "rating_weighted_pct": rating_weighted_pct, "schedule_adherence_pct": schedule_adherence_pct, "delayed_lines": delayed_lines, "on_time_qty": round(on_time_qty, 2), "total_del_qty": round(total_qty, 2)}, "trend": trend})


@api_view(['GET'])
def dashboard2_final_inspection_kpi(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    from_param = (request.GET.get("from") or "").strip()
    to_param = (request.GET.get("to") or "").strip()

    if from_param and to_param:
        try:
            start_date = datetime.strptime(from_param, "%Y-%m-%d").date()
            end_date = datetime.strptime(to_param, "%Y-%m-%d").date()
            if start_date > end_date: start_date, end_date = end_date, start_date
        except ValueError:
            today = date.today()
            start_date = date(today.year, today.month, 1)
            end_date = today
    else:
        today = date.today()
        start_date = date(today.year, today.month, 1)
        end_date = today

    company_candidates = ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]

    try:
        cursor = conn.cursor()
        if not table_exists(cursor, "FinalInspectionEntry"):
            cursor.close()
            conn.close()
            return Response({"error": "Table FinalInspectionEntry not found in this database."}, status=404)

        company_col = find_first_column(cursor, "FinalInspectionEntry", company_candidates)
        company_code = tenant.get("company_code")
        sql = """
            SELECT COALESCE(SUM(CAST(okqty AS FLOAT)), 0) AS total_ok_qty, COALESCE(SUM(CAST(rejqty AS FLOAT)), 0) AS total_rej_qty, COALESCE(SUM(CAST(matrejqty AS FLOAT)), 0) AS total_mat_rej_qty, COALESCE(SUM(CAST(totqty AS FLOAT)), 0) AS total_qty, COUNT(finspno) AS inspection_count
            FROM FinalInspectionEntry WHERE deleted = 0 AND CAST(finspdate AS DATE) BETWEEN ? AND ?
        """
        params = [start_date, end_date]
        if company_col and company_code:
            sql += f" AND [{company_col}] = ?"
            params.append(company_code)

        cursor.execute(sql, params)
        row = cursor.fetchone()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    total_ok_qty = float(row[0] or 0)
    total_rej_qty = float(row[1] or 0)
    total_mat_rej_qty = float(row[2] or 0)
    total_qty = float(row[3] or 0)
    inspection_count = int(row[4] or 0)
    first_pass_yield = round((total_ok_qty / total_qty) * 100, 2) if total_qty > 0 else 0.0

    return Response({"company": tenant.get("company_name", ""), "company_code": tenant.get("company_code", ""), "from": str(start_date), "to": str(end_date), "total_ok_qty": round(total_ok_qty, 2), "total_rej_qty": round(total_rej_qty, 2), "total_mat_rej_qty": round(total_mat_rej_qty, 2), "total_qty": round(total_qty, 2), "first_pass_yield": first_pass_yield, "inspection_count": inspection_count})


@api_view(["GET"])
def dashboard2_injob_inspection(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    from_param = (request.GET.get("from") or "").strip()
    to_param = (request.GET.get("to") or "").strip()

    if from_param and to_param:
        try:
            start_date = datetime.strptime(from_param, "%Y-%m-%d").date()
            end_date = datetime.strptime(to_param, "%Y-%m-%d").date()
            if start_date > end_date: start_date, end_date = end_date, start_date
        except ValueError:
            today = date.today()
            start_date = date(today.year, today.month, 1)
            end_date = today
    else:
        today = date.today()
        start_date = date(today.year, today.month, 1)
        end_date = today

    company_candidates = ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]
    deleted_candidates = ["deleted", "is_deleted", "Deleted", "IsDeleted"]
    date_candidates = ["inspdate", "InspDate", "INSPDATE", "insp_date"]
    join_candidates = ["inspno", "InspNo", "INSPNO"]
    qty_basis_candidates = ["totqty", "TotQty", "TOTQTY", "qty", "Qty", "QTY", "okqty", "OkQty", "OKQty", "inspqty", "InspQty", "INSPQTY"]

    try:
        cursor = conn.cursor()
        mas_tbl = find_first_table(cursor, ["InJob_Mas", "INJOB_MAS", "injob_mas"])
        det_tbl = find_first_table(cursor, ["InJob_Det", "INJOB_DET", "injob_det"])
        if not mas_tbl or not det_tbl:
            cursor.close()
            conn.close()
            return Response({"error": "InJob_Mas / InJob_Det not found in this database.", "from": str(start_date), "to": str(end_date)}, status=404)

        join_m = find_first_column(cursor, mas_tbl, join_candidates)
        join_d = find_first_column(cursor, det_tbl, join_candidates)
        if not join_m or not join_d:
            cursor.close()
            conn.close()
            return Response({"error": "Join column inspno not found on InJob_Mas / InJob_Det."}, status=404)

        mas_date = find_first_column(cursor, mas_tbl, date_candidates)
        if not mas_date:
            cursor.close()
            conn.close()
            return Response({"error": "Date column (e.g. inspdate) not found on InJob_Mas."}, status=404)

        matrej_c = find_first_column(cursor, det_tbl, ["matrej", "MatRej", "MATREJ"])
        macrej_c = find_first_column(cursor, det_tbl, ["macrej", "MacRej", "MACREJ"])
        rwqty_c = find_first_column(cursor, det_tbl, ["rwqty", "RwQty", "RWQTY", "rw_qty", "RW_Qty"])
        mas_del = find_first_column(cursor, mas_tbl, deleted_candidates)
        det_del = find_first_column(cursor, det_tbl, deleted_candidates)
        mas_cc = find_first_column(cursor, mas_tbl, company_candidates)
        company_code = tenant.get("company_code")

        rej_parts = []
        if matrej_c: rej_parts.append(f"COALESCE(CAST(D.[{matrej_c}] AS FLOAT), 0)")
        if macrej_c: rej_parts.append(f"COALESCE(CAST(D.[{macrej_c}] AS FLOAT), 0)")
        if not rej_parts:
            cursor.close()
            conn.close()
            return Response({"error": "Neither matrej nor macrej column found on InJob_Det."}, status=404)

        inner_rejection = " + ".join(rej_parts)
        sql_total_rejection = f"COALESCE(SUM({inner_rejection}), 0)"
        sql_total_rework = f"COALESCE(SUM(COALESCE(CAST(D.[{rwqty_c}] AS FLOAT), 0)), 0)" if rwqty_c else "CAST(0 AS FLOAT)"
        qty_basis_col = find_first_column(cursor, det_tbl, qty_basis_candidates)
        sql_total_qty_basis = f"COALESCE(SUM(COALESCE(CAST(D.[{qty_basis_col}] AS FLOAT), 0)), 0)" if qty_basis_col else "CAST(0 AS FLOAT)"

        where_parts = [f"CAST(M.[{mas_date}] AS DATE) BETWEEN ? AND ?"]
        params = [start_date, end_date]
        if mas_del: where_parts.append(f"M.[{mas_del}] = 0")
        if det_del: where_parts.append(f"(D.[{det_del}] IS NULL OR D.[{det_del}] = 0)")
        if mas_cc and company_code:
            where_parts.append(f"M.[{mas_cc}] = ?")
            params.append(company_code)

        where_sql = " AND ".join(where_parts)
        sql = f"""
            SELECT {sql_total_rejection} AS total_rejection, {sql_total_rework} AS total_rework, {sql_total_qty_basis} AS total_qty_basis, COUNT(DISTINCT M.[{join_m}]) AS inspection_master_count
            FROM [{mas_tbl}] M INNER JOIN [{det_tbl}] D ON M.[{join_m}] = D.[{join_d}] WHERE {where_sql}
        """
        cursor.execute(sql, params)
        row = cursor.fetchone()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    total_rejection = float((row[0] if row else 0) or 0)
    total_rework = float((row[1] if row else 0) or 0)
    total_qty_basis = float((row[2] if row else 0) or 0)
    inspection_master_count = int((row[3] if row else 0) or 0)
    rej_pct = round((total_rejection / total_qty_basis) * 100, 2) if total_qty_basis > 0 else None
    rwk_pct = round((total_rework / total_qty_basis) * 100, 2) if total_qty_basis > 0 else None

    return Response({"company": tenant.get("company_name", ""), "company_code": tenant.get("company_code", ""), "from": str(start_date), "to": str(end_date), "total_rejection": round(total_rejection, 2), "total_rework": round(total_rework, 2), "total_qty_basis": round(total_qty_basis, 2), "inspection_master_count": inspection_master_count, "rejection_pct": rej_pct, "rework_pct": rwk_pct})


@api_view(["GET"])
def dashboard2_inter_inspection(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    from_param = (request.GET.get("from") or "").strip()
    to_param = (request.GET.get("to") or "").strip()

    if from_param and to_param:
        try:
            start_date = datetime.strptime(from_param, "%Y-%m-%d").date()
            end_date = datetime.strptime(to_param, "%Y-%m-%d").date()
            if start_date > end_date: start_date, end_date = end_date, start_date
        except ValueError:
            today = date.today()
            start_date = date(today.year, today.month, 1)
            end_date = today
    else:
        today = date.today()
        start_date = date(today.year, today.month, 1)
        end_date = today

    company_candidates = ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]
    deleted_candidates = ["deleted", "is_deleted", "Deleted", "IsDeleted"]
    date_candidates = ["inter_inspdate", "Inter_InspDate", "INTER_INSPDATE", "interinspdate", "InterInspDate", "inspdate", "InspDate", "INSPDATE", "insp_date"]
    qty_basis_candidates = ["totqty", "TotQty", "TOTQTY", "totinspqty", "TotInspQty", "inspqty", "InspQty", "qty", "Qty", "okqty", "OkQty"]

    try:
        cursor = conn.cursor()
        tbl = find_first_table(cursor, ["InterInspectionEntry", "INTERINSPECTIONENTRY", "interinspectionentry"])
        if not tbl:
            cursor.close()
            conn.close()
            return Response({"error": "InterInspectionEntry table not found in this database.", "from": str(start_date), "to": str(end_date)}, status=404)

        date_col = find_first_column(cursor, tbl, date_candidates)
        if not date_col:
            cursor.close()
            conn.close()
            return Response({"error": "Date column (e.g. inter_inspdate) not found on InterInspectionEntry."}, status=404)

        rejqty_c = find_first_column(cursor, tbl, ["rejqty", "RejQty", "REJQTY"])
        matrejqty_c = find_first_column(cursor, tbl, ["matrejqty", "MatRejQty", "MATREJQTY", "matrej_qty"])
        rwqty_c = find_first_column(cursor, tbl, ["rwqty", "RwQty", "RWQTY", "rw_qty"])

        rej_parts = []
        if rejqty_c: rej_parts.append(f"COALESCE(CAST([{rejqty_c}] AS FLOAT), 0)")
        if matrejqty_c: rej_parts.append(f"COALESCE(CAST([{matrejqty_c}] AS FLOAT), 0)")
        if not rej_parts:
            cursor.close()
            conn.close()
            return Response({"error": "Neither rejqty nor matrejqty column found on InterInspectionEntry."}, status=404)

        inner_rejection = " + ".join(rej_parts)
        sql_total_rejection = f"COALESCE(SUM({inner_rejection}), 0)"
        sql_total_rework = f"COALESCE(SUM(COALESCE(CAST([{rwqty_c}] AS FLOAT), 0)), 0)" if rwqty_c else "CAST(0 AS FLOAT)"
        qty_basis_col = find_first_column(cursor, tbl, qty_basis_candidates)
        sql_total_qty_basis = f"COALESCE(SUM(COALESCE(CAST([{qty_basis_col}] AS FLOAT), 0)), 0)" if qty_basis_col else "CAST(0 AS FLOAT)"
        del_col = find_first_column(cursor, tbl, deleted_candidates)
        cc_col = find_first_column(cursor, tbl, company_candidates)
        company_code = tenant.get("company_code")

        where_parts = [f"CAST([{date_col}] AS DATE) BETWEEN ? AND ?"]
        params = [start_date, end_date]
        if del_col: where_parts.append(f"[{del_col}] = 0")
        if cc_col and company_code:
            where_parts.append(f"[{cc_col}] = ?")
            params.append(company_code)

        where_sql = " AND ".join(where_parts)
        sql = f"""
            SELECT {sql_total_rejection} AS total_rejection, {sql_total_rework} AS total_rework, {sql_total_qty_basis} AS total_qty_basis, COUNT(*) AS row_count
            FROM [{tbl}] WHERE {where_sql}
        """
        cursor.execute(sql, params)
        row = cursor.fetchone()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    total_rejection = float((row[0] if row else 0) or 0)
    total_rework = float((row[1] if row else 0) or 0)
    total_qty_basis = float((row[2] if row else 0) or 0)
    row_count = int((row[3] if row else 0) or 0)
    rej_pct = round((total_rejection / total_qty_basis) * 100, 2) if total_qty_basis > 0 else None
    rwk_pct = round((total_rework / total_qty_basis) * 100, 2) if total_qty_basis > 0 else None

    return Response({"company": tenant.get("company_name", ""), "company_code": tenant.get("company_code", ""), "from": str(start_date), "to": str(end_date), "total_rejection": round(total_rejection, 2), "total_rework": round(total_rework, 2), "total_qty_basis": round(total_qty_basis, 2), "row_count": row_count, "rejection_pct": rej_pct, "rework_pct": rwk_pct})


@api_view(["GET"])
def dashboard2_final_inspection_org_rej_rwk(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    from_param = (request.GET.get("from") or "").strip()
    to_param = (request.GET.get("to") or "").strip()

    if from_param and to_param:
        try:
            start_date = datetime.strptime(from_param, "%Y-%m-%d").date()
            end_date = datetime.strptime(to_param, "%Y-%m-%d").date()
            if start_date > end_date: start_date, end_date = end_date, start_date
        except ValueError:
            today = date.today()
            start_date = date(today.year, today.month, 1)
            end_date = today
    else:
        today = date.today()
        start_date = date(today.year, today.month, 1)
        end_date = today

    company_candidates = ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]
    deleted_candidates = ["deleted", "is_deleted", "Deleted", "IsDeleted"]
    date_candidates = ["finspdate", "FinSpDate", "FINSPDATE", "fin_sp_date", "Fin_Sp_Date"]
    join_candidates = ["finspno", "FinSpNo", "FINSPNO", "FinspNo"]
    qty_qty_only = ["qty", "Qty", "QTY"]

    try:
        cursor = conn.cursor()
        sch_m, nm_m, q_m = resolve_erp_table(cursor, ["FinalInspectionEntry", "FINALINSPECTIONENTRY", "finalinspectionentry"])
        if not q_m:
            cursor.close()
            conn.close()
            return Response({"error": "FinalInspectionEntry not found (check table name / schema).", "from": str(start_date), "to": str(end_date)}, status=404)

        sch_r, nm_r, q_r = resolve_erp_table(cursor, ["FinalInspRejectionEntryOrg", "FINALINSPREJECTIONENTRYORG", "finalinsprejectionentryorg", "FinalInspRejectionOrg", "FINALINSPREJECTIONORG"])
        sch_w, nm_w, q_w = resolve_erp_table(cursor, ["FinalInspReworkEntryOrg", "FINALINSPREWORKENTRYORG", "finalinspreworkentryorg", "FinalInspectionReworkEntryOrg", "FinalInspReworkOrg"])

        join_m = find_column_ci(cursor, sch_m, nm_m, join_candidates)
        if not join_m:
            cursor.close()
            conn.close()
            return Response({"error": "finspno (or equivalent) not found on FinalInspectionEntry."}, status=404)

        date_m = find_column_ci(cursor, sch_m, nm_m, date_candidates)
        if not date_m:
            cursor.close()
            conn.close()
            return Response({"error": "finspdate (or equivalent) not found on FinalInspectionEntry."}, status=404)

        del_m = find_column_ci(cursor, sch_m, nm_m, deleted_candidates)
        cc_m = find_column_ci(cursor, sch_m, nm_m, company_candidates)
        company_code = tenant.get("company_code")

        partial = False
        warnings = []
        if not q_r:
            partial = True
            warnings.append("FinalInspRejectionEntryOrg not found; total_rejection returned as 0.")
        if not q_w:
            partial = True
            warnings.append("FinalInspReworkEntryOrg not found; total_rework returned as 0.")

        use_r = bool(q_r)
        join_r = qty_r = del_r = None
        if use_r:
            join_r = find_column_ci(cursor, sch_r, nm_r, join_candidates)
            qty_r = find_column_ci(cursor, sch_r, nm_r, qty_qty_only + ["rejqty", "RejQty", "REJQTY", "matrejqty", "MatRejQty"])
            del_r = find_column_ci(cursor, sch_r, nm_r, deleted_candidates)
            if not join_r or not qty_r:
                use_r = False
                partial = True
                warnings.append("Rejection org table found but finspno or qty column missing; total_rejection = 0.")

        use_w = bool(q_w)
        join_w = qty_w = del_w = None
        if use_w:
            join_w = find_column_ci(cursor, sch_w, nm_w, join_candidates)
            qty_w = find_column_ci(cursor, sch_w, nm_w, qty_qty_only + ["rwqty", "RwQty", "RWQTY"])
            del_w = find_column_ci(cursor, sch_w, nm_w, deleted_candidates)
            if not join_w or not qty_w:
                use_w = False
                partial = True
                warnings.append("Rework org table found but finspno or qty column missing; total_rework = 0.")

        if not use_r and not use_w:
            cursor.close()
            conn.close()
            return Response({"error": "Neither FinalInspRejectionEntryOrg nor FinalInspReworkEntryOrg is usable.", "from": str(start_date), "to": str(end_date)}, status=404)

        rej_where = "1=1"
        if use_r and del_r: rej_where = f"ISNULL([{del_r}], 0) = 0"
        rwk_where = "1=1"
        if use_w and del_w: rwk_where = f"ISNULL([{del_w}], 0) = 0"

        mas_parts = [f"CAST(M.[{date_m}] AS DATE) BETWEEN ? AND ?"]
        params = [start_date, end_date]
        if del_m: mas_parts.append(f"ISNULL(M.[{del_m}], 0) = 0")
        if cc_m and company_code:
            mas_parts.append(f"M.[{cc_m}] = ?")
            params.append(company_code)
        mas_where_sql = " AND ".join(mas_parts)

        join_fragments = []
        if use_r:
            join_fragments.append(f"""LEFT JOIN (SELECT [{join_r}] AS rej_k, SUM(ISNULL(CAST([{qty_r}] AS FLOAT), 0)) AS TotalRejection FROM {q_r} WHERE {rej_where} GROUP BY [{join_r}]) R ON M.[{join_m}] = R.rej_k""")
        if use_w:
            join_fragments.append(f"""LEFT JOIN (SELECT [{join_w}] AS wrk_k, SUM(ISNULL(CAST([{qty_w}] AS FLOAT), 0)) AS TotalRework FROM {q_w} WHERE {rwk_where} GROUP BY [{join_w}]) W ON M.[{join_m}] = W.wrk_k""")

        sel_rej = "COALESCE(SUM(ISNULL(R.TotalRejection, 0)), 0)" if use_r else "CAST(0 AS FLOAT)"
        sel_rwk = "COALESCE(SUM(ISNULL(W.TotalRework, 0)), 0)" if use_w else "CAST(0 AS FLOAT)"

        sql = f"""SELECT {sel_rej} AS total_rejection, {sel_rwk} AS total_rework FROM {q_m} M {' '.join(join_fragments)} WHERE {mas_where_sql}"""
        cursor.execute(sql, params)
        row = cursor.fetchone()
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    total_rejection = float((row[0] if row else 0) or 0)
    total_rework = float((row[1] if row else 0) or 0)

    resp = {"company": tenant.get("company_name", ""), "company_code": tenant.get("company_code", ""), "from": str(start_date), "to": str(end_date), "total_rejection": round(total_rejection, 2), "total_rework": round(total_rework, 2), "partial": partial}
    if warnings: resp["warnings"] = warnings
    return Response(resp)


@api_view(["GET"])
def dashboard2_top_defect_categories(request):
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = dashboard2_parse_date_range_default_month(request)
    company_code = tenant.get("company_code")
    company_candidates = ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]
    deleted_candidates = ["deleted", "is_deleted", "Deleted", "IsDeleted"]
    branches = []

    try:
        cursor = conn.cursor()
        # Branch 1: Final Inspection
        sch_m, nm_m, q_m = resolve_erp_table(cursor, ["FinalInspectionEntry", "FINALINSPECTIONENTRY", "finalinspectionentry"])
        sch_r, nm_r, q_r = resolve_erp_table(cursor, ["FinalInspRejectionEntryOrg", "FINALINSPREJECTIONENTRYORG", "finalinsprejectionentryorg", "FinalInspRejectionOrg"])
        if q_m and q_r:
            join_cands = ["finspno", "FinSpNo", "FINSPNO", "FinspNo"]
            date_cands = ["finspdate", "FinSpDate", "FINSPDATE", "fin_sp_date"]
            pno_cands = ["partno", "PartNo", "PARTNO", "part_no", "Part_No"]
            qty_cands = ["qty", "Qty", "QTY", "rejqty", "RejQty", "REJQTY"]
            join_m = find_column_ci(cursor, sch_m, nm_m, join_cands)
            date_m = find_column_ci(cursor, sch_m, nm_m, date_cands)
            del_m = find_column_ci(cursor, sch_m, nm_m, deleted_candidates)
            cc_m = find_column_ci(cursor, sch_m, nm_m, company_candidates)
            join_r = find_column_ci(cursor, sch_r, nm_r, join_cands)
            partno_r = find_column_ci(cursor, sch_r, nm_r, pno_cands)
            qty_r = find_column_ci(cursor, sch_r, nm_r, qty_cands)
            del_r = find_column_ci(cursor, sch_r, nm_r, deleted_candidates)
            if join_m and date_m and join_r and partno_r and qty_r:
                where_parts = [f"CAST(F.[{date_m}] AS DATE) BETWEEN ? AND ?"]
                params = [start_date, end_date]
                if del_m: where_parts.append(f"ISNULL(F.[{del_m}], 0) = 0")
                if del_r: where_parts.append(f"ISNULL(R.[{del_r}], 0) = 0")
                if cc_m and company_code:
                    where_parts.append(f"F.[{cc_m}] = ?")
                    params.append(company_code)
                where_parts.append(f"ISNULL(R.[{qty_r}], 0) > 0")
                branch_sql = f"SELECT R.[{partno_r}] AS partno, ISNULL(R.[{qty_r}], 0) AS RejQty FROM {q_m} F INNER JOIN {q_r} R ON F.[{join_m}] = R.[{join_r}] WHERE {' AND '.join(where_parts)}"
                branches.append((branch_sql, params))

        # Branch 2: Intermediate Inspection
        sch_i, nm_i, q_i = resolve_erp_table(cursor, ["InterInspectionEntry", "INTERINSPECTIONENTRY", "interinspectionentry"])
        if q_i:
            date_cands_i = ["inter_inspdate", "Inter_InspDate", "INTER_INSPDATE", "interinspdate", "InterInspDate", "inspdate", "InspDate", "INSPDATE"]
            pno_cands_i = ["partno", "PartNo", "PARTNO", "part_no", "Part_No"]
            rej_cands_i = ["rejqty", "RejQty", "REJQTY", "rej_qty", "matrejqty", "MatRejQty"]
            date_i = find_column_ci(cursor, sch_i, nm_i, date_cands_i)
            partno_i = find_column_ci(cursor, sch_i, nm_i, pno_cands_i)
            rejqty_i = find_column_ci(cursor, sch_i, nm_i, rej_cands_i)
            del_i = find_column_ci(cursor, sch_i, nm_i, deleted_candidates)
            cc_i = find_column_ci(cursor, sch_i, nm_i, company_candidates)
            if date_i and partno_i and rejqty_i:
                where_parts = [f"CAST([{date_i}] AS DATE) BETWEEN ? AND ?"]
                params = [start_date, end_date]
                if del_i: where_parts.append(f"ISNULL([{del_i}], 0) = 0")
                if cc_i and company_code:
                    where_parts.append(f"[{cc_i}] = ?")
                    params.append(company_code)
                where_parts.append(f"ISNULL([{rejqty_i}], 0) > 0")
                branch_sql = f"SELECT [{partno_i}] AS partno, ISNULL([{rejqty_i}], 0) AS RejQty FROM {q_i} WHERE {' AND '.join(where_parts)}"
                branches.append((branch_sql, params))

        if not branches:
            cursor.close()
            conn.close()
            return Response({"from": str(start_date), "to": str(end_date), "rows": [], "total_rejection_qty": 0.0, "note": "No matching inspection tables or required columns found."})

        union_sql = " UNION ALL ".join(sql for sql, _ in branches)
        union_params = []
        for _, p in branches: union_params.extend(p)

        final_sql = f"""
            WITH AllRejection AS ({union_sql}), TotalData AS (SELECT SUM(RejQty) AS TotalQty FROM AllRejection)
            SELECT TOP 5 A.partno, SUM(A.RejQty) AS Total_Rejection_Qty, CAST((SUM(A.RejQty) * 100.0) / NULLIF(TD.TotalQty, 0) AS DECIMAL(10,2)) AS Rejection_Percentage
            FROM AllRejection A CROSS JOIN TotalData TD GROUP BY A.partno, TD.TotalQty ORDER BY Total_Rejection_Qty DESC
        """
        cursor.execute(final_sql, union_params)
        rows = cursor.fetchall()

        total_sql = f"WITH AllRejection AS ({union_sql}) SELECT ISNULL(SUM(RejQty), 0) FROM AllRejection"
        cursor.execute(total_sql, union_params)
        total_row = cursor.fetchone()
        total_qty = float((total_row[0] if total_row else 0) or 0)
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    result_rows = [{"partno": str(row[0] or "").strip() or "—", "total_rejection_qty": float(row[1] or 0), "rejection_pct": float(row[2] or 0)} for row in rows]
    return Response({"from": str(start_date), "to": str(end_date), "rows": result_rows, "total_rejection_qty": round(total_qty, 2)})
