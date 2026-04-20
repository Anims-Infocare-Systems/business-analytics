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


def to_lakhs(value):
    """Convert Rupees → ₹ Lakhs, rounded to 2 decimal places."""
    return round(float(value or 0) / 100_000, 2)


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


def normalize_accept_flag(value):
    """Map IdleReasons.IsAccept (bit/int/varchar) to True / False / unknown (None)."""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        try:
            return int(value) != 0
        except (ValueError, TypeError):
            return None
    s = str(value).strip().lower()
    if s in ("true", "1", "yes", "y"):
        return True
    if s in ("false", "0", "no", "n"):
        return False
    return None


def idle_reason_lookup_keys(reason_val):
    """Keys to match Machine_IdleEntryDet.reasons against IdleReasons link column."""
    keys = []
    if reason_val is None:
        keys.append("")
        return keys
    keys.append(str(reason_val).strip())
    try:
        if isinstance(reason_val, float) and reason_val.is_integer():
            keys.append(str(int(reason_val)))
        elif isinstance(reason_val, (int, float)):
            keys.append(str(int(reason_val)))
    except (ValueError, TypeError, OverflowError):
        pass
    return list(dict.fromkeys(k for k in keys if k is not None))


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
    request.session.modified = True   # ✅ force Django to persist session
    request.session.save()     

    return Response({
        "message":      "Login successful",
        "company":      tenant.company_name,
        "company_code": tenant.company_code,
        "username":     username,
    })


# ─────────────────────────────────────────────────────────────
#  COMPANY NAME LOOKUP  (used by login form on-blur)
# ─────────────────────────────────────────────────────────────

@api_view(['GET'])
def get_company(request, code):
    """
    GET /api/company/<code>/
    Returns { company_name } so the login form can show
    the company name as the user types their code.
    """
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
#  PO VS SALES CHART
# ─────────────────────────────────────────────────────────────

@api_view(['GET'])
def po_vs_sales(request):
    """
    GET /api/po-vs-sales/
    Optional: ?from=YYYY-MM-DD&to=YYYY-MM-DD

    - Default range  : current financial year (Apr 2026 → Mar 2027)
    - Grouping       : always 12 monthly buckets in FY order (Apr→Mar)
    - Values         : ₹ Lakhs (tamt ÷ 100,000)
    - Company filter : NOT needed — tenant's own isolated DB is used
                       (connection comes from session)

    Response shape:
    {
        "company":  "ABC Industries",
        "fy":       "FY 2026-27",
        "from":     "2026-04-01",
        "to":       "2027-03-31",
        "labels":   ["Apr","May",...,"Mar"],
        "sales":    [12.50, 18.30, ...],   ← ₹ Lakhs
        "po":       [10.00, 15.75, ...]    ← ₹ Lakhs
    }
    """
    # ── Auth ─────────────────────────────────────────────────
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    # ── Date range ───────────────────────────────────────────
    start_date, end_date = parse_date_range(request)

    # ── Financial year label ──────────────────────────────────
    # e.g. start=2026-04-01 → "FY 2026-27"
    fy_start_year = start_date.year if start_date.month >= 4 else start_date.year - 1
    fy_label      = f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}"

    try:
        cursor = conn.cursor()

        # ── Sales Query ───────────────────────────────────────
        # Groups by calendar month number; we reorder to FY below.
        cursor.execute("""
            SELECT
                MONTH(invdt)   AS mth,
                SUM(tamt)      AS total
            FROM Bill_Mas
            WHERE deleted = 0
              AND btype NOT IN ('Debit Note')
              AND invdt BETWEEN ? AND ?
            GROUP BY MONTH(invdt)
        """, (start_date, end_date))
        sales_rows = cursor.fetchall()

        # ── PO Query ─────────────────────────────────────────
        cursor.execute("""
            SELECT
                MONTH(podt)    AS mth,
                SUM(tamt)      AS total
            FROM In_PoMas
            WHERE deleted = 0
              AND podt BETWEEN ? AND ?
            GROUP BY MONTH(podt)
        """, (start_date, end_date))
        po_rows = cursor.fetchall()

        cursor.close()
        conn.close()

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    # ── Build FY-ordered response (Apr=4 … Mar=3) ─────────────
    #    12 buckets always present, missing months default to 0.
    month_order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    labels      = ["Apr","May","Jun","Jul","Aug","Sep",
                   "Oct","Nov","Dec","Jan","Feb","Mar"]

    sales_map = {m: 0.0 for m in month_order}
    po_map    = {m: 0.0 for m in month_order}

    for mth, total in sales_rows:
        if mth in sales_map:
            sales_map[mth] = to_lakhs(total)

    for mth, total in po_rows:
        if mth in po_map:
            po_map[mth] = to_lakhs(total)

    return Response({
        "company": tenant.get("company_name", ""),
        "fy":      fy_label,
        "from":    str(start_date),
        "to":      str(end_date),
        "labels":  labels,
        "sales":   [sales_map[m] for m in month_order],
        "po":      [po_map[m]    for m in month_order],
    })


@api_view(['GET'])
def dashboard2_kpis(request):
    """
    GET /api/dashboard2/kpis/
    Optional: ?from=YYYY-MM-DD&to=YYYY-MM-DD

    Returns KPI values scoped to logged-in tenant DB and date range.
    Includes:
      - production_output from:
            ConvProductionEntryRod.qty +
            ConvProductionEntry.qty +
            ProductionEntry.okqty
      - rejection_qty from:
            InterInspectionEntry.rejqty + InterInspectionEntry.matrejqty +
            FinalInspRejectionEntryOrg.qty +
            InJob_Det.matrej + InJob_Det.macrej
        with deleted = 0 where deleted column exists.
      - oa_efficiency = mean of per-table AVG(OAEFF) from:
            ProductionEntry, ConvProductionEntry, ConvProductionEntryRod
        (deleted = 0 where column exists; same date range & company filter)
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    # Dashboard default requested: current month start -> current date
    from_param = (request.GET.get("from") or "").strip()
    to_param = (request.GET.get("to") or "").strip()

    if from_param and to_param:
        try:
            start_date = datetime.strptime(from_param, "%Y-%m-%d").date()
            end_date = datetime.strptime(to_param, "%Y-%m-%d").date()
            if start_date > end_date:
                start_date, end_date = end_date, start_date
        except ValueError:
            today = date.today()
            start_date = date(today.year, today.month, 1)
            end_date = today
    else:
        today = date.today()
        start_date = date(today.year, today.month, 1)
        end_date = today

    production_specs = [
        ("ConvProductionEntryRod", "qty"),
        ("ConvProductionEntry", "qty"),
        ("ProductionEntry", "okqty"),
    ]
    rejection_specs = [
        ("InterInspectionEntry", ["rejqty", "matrejqty"]),
        ("FinalInspRejectionEntryOrg", ["qty"]),
        ("InJob_Det", ["matrej", "macrej"]),
    ]
    date_candidates = [
        "proddate", "prod_date", "entrydate", "entry_date", "vdate", "date",
        "finspdate", "inspdate", "rejdate", "jobdate",
    ]
    company_candidates = ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]
    deleted_candidates = ["deleted", "is_deleted", "Deleted", "IsDeleted"]

    production_output = 0.0
    rejection_qty = 0.0
    oa_efficiency = 0.0
    company_code = tenant.get("company_code")

    oaeff_tables = ["ProductionEntry", "ConvProductionEntry", "ConvProductionEntryRod"]
    oaeff_col_candidates = ["OAEFF", "OaEff", "oaeff", "OEENEW"]

    try:
        cursor = conn.cursor()
        for table_name, qty_col in production_specs:
            if not table_exists(cursor, table_name):
                continue

            date_col = find_first_column(cursor, table_name, date_candidates)
            if not date_col:
                continue

            company_col = find_first_column(cursor, table_name, company_candidates)
            deleted_col = find_first_column(cursor, table_name, deleted_candidates)

            sql = f"SELECT COALESCE(SUM(CAST([{qty_col}] AS FLOAT)), 0) FROM [{table_name}] WHERE CAST([{date_col}] AS date) BETWEEN ? AND ?"
            params = [start_date, end_date]

            if company_col and company_code:
                sql += f" AND [{company_col}] = ?"
                params.append(company_code)
            if deleted_col:
                sql += f" AND [{deleted_col}] = 0"

            cursor.execute(sql, params)
            row = cursor.fetchone()
            production_output += float((row[0] if row else 0) or 0)

        for table_name, qty_cols in rejection_specs:
            if not table_exists(cursor, table_name):
                continue

            date_col = find_first_column(cursor, table_name, date_candidates)
            if not date_col:
                continue

            existing_qty_cols = [c for c in qty_cols if find_first_column(cursor, table_name, [c])]
            if not existing_qty_cols:
                continue

            company_col = find_first_column(cursor, table_name, company_candidates)
            deleted_col = find_first_column(cursor, table_name, deleted_candidates)
            sum_expr = " + ".join([f"COALESCE(CAST([{c}] AS FLOAT), 0)" for c in existing_qty_cols])

            sql = f"SELECT COALESCE(SUM({sum_expr}), 0) FROM [{table_name}] WHERE CAST([{date_col}] AS date) BETWEEN ? AND ?"
            params = [start_date, end_date]

            if company_col and company_code:
                sql += f" AND [{company_col}] = ?"
                params.append(company_code)
            if deleted_col:
                sql += f" AND [{deleted_col}] = 0"

            cursor.execute(sql, params)
            row = cursor.fetchone()
            rejection_qty += float((row[0] if row else 0) or 0)

        # OEE / OA efficiency: average of each table's AVG(OAEFF), deleted = 0
        table_avgs = []
        for table_name in oaeff_tables:
            if not table_exists(cursor, table_name):
                continue
            oaeff_col = find_first_column(cursor, table_name, oaeff_col_candidates)
            if not oaeff_col:
                continue
            date_col = find_first_column(cursor, table_name, date_candidates)
            if not date_col:
                continue
            company_col = find_first_column(cursor, table_name, company_candidates)
            deleted_col = find_first_column(cursor, table_name, deleted_candidates)

            sql = (
                f"SELECT AVG(CAST([{oaeff_col}] AS FLOAT)) FROM [{table_name}] "
                f"WHERE CAST([{date_col}] AS date) BETWEEN ? AND ?"
            )
            params = [start_date, end_date]
            if company_col and company_code:
                sql += f" AND [{company_col}] = ?"
                params.append(company_code)
            if deleted_col:
                sql += f" AND [{deleted_col}] = 0"

            cursor.execute(sql, params)
            row = cursor.fetchone()
            avg_val = row[0] if row else None
            if avg_val is not None:
                table_avgs.append(float(avg_val))

        oa_efficiency = (
            sum(table_avgs) / len(table_avgs) if table_avgs else 0.0
        )

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
            "oa_efficiency": round(oa_efficiency, 2),
        },
        "sources": [
            "ConvProductionEntryRod.qty",
            "ConvProductionEntry.qty",
            "ProductionEntry.okqty",
            "InterInspectionEntry.rejqty + InterInspectionEntry.matrejqty",
            "FinalInspRejectionEntryOrg.qty",
            "InJob_Det.matrej + InJob_Det.macrej",
            "AVG(OAEFF): ProductionEntry, ConvProductionEntry, ConvProductionEntryRod",
        ],
    })


@api_view(["GET"])
def dashboard2_idle_hours(request):
    """
    GET /api/dashboard2/idle-hours/
    Optional: ?from=YYYY-MM-DD&to=YYYY-MM-DD (default: month start → today)

    Idle lines from Machine_IdleEntryDet joined to prodids active in Machine_IdleEntryMas
    for the date range (mas.proddate, deleted=0). Detail rows deleted=0.

    IdleReasons.IsAccept: True → accepted bucket, False → non-accepted.
    Missing IdleReasons row or NULL IsAccept → non-accepted.

    Response:
      accepted: [{ reason, machine, hours, pct }]
      non_accepted: [{ reason, machine, hours, pct, sev }]
    """
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = dashboard2_parse_date_range_default_month(request)
    company_code = tenant.get("company_code")

    mas_tbl = "Machine_IdleEntryMas"
    det_tbl = "Machine_IdleEntryDet"
    ir_tbl = "IdleReasons"

    deleted_candidates = ["deleted", "is_deleted", "Deleted", "IsDeleted"]
    mas_date_candidates = ["proddate", "prod_date", "PrdDate", "entrydate", "entry_date", "vdate"]
    mas_prod_candidates = ["prodid", "ProdID", "ProdId", "prod_id"]
    det_prod_candidates = ["prodid", "ProdID", "ProdId", "prod_id"]
    reason_candidates = ["reasons", "Reasons", "IdleReason", "idle_reason", "Reason"]
    mac_candidates = ["MacNo", "macno", "MACNO", "Mac_No", "MachineNo", "machine_no"]
    tot_candidates = ["tottime", "TotTime", "Tot_Time", "totaltime", "TotalTime"]

    ir_link_candidates = ["IdleReasons", "reasons", "Reason", "IdleReasonNm", "IdleReasonID"]
    ir_accept_candidates = ["IsAccept", "Is_Accept", "is_accept", "Accept"]

    accepted_rows = []
    non_accepted_rows = []

    try:
        cursor = conn.cursor()

        if not table_exists(cursor, mas_tbl) or not table_exists(cursor, det_tbl):
            cursor.close()
            conn.close()
            return Response({
                "company": tenant.get("company_name", ""),
                "company_code": company_code or "",
                "from": str(start_date),
                "to": str(end_date),
                "accepted": [],
                "non_accepted": [],
            })

        mas_prod = find_first_column(cursor, mas_tbl, mas_prod_candidates)
        mas_date = find_first_column(cursor, mas_tbl, mas_date_candidates)
        mas_del = find_first_column(cursor, mas_tbl, deleted_candidates)
        mas_cc = find_first_column(
            cursor, mas_tbl,
            ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"],
        )

        det_prod = find_first_column(cursor, det_tbl, det_prod_candidates)
        det_reason = find_first_column(cursor, det_tbl, reason_candidates)
        det_mac = find_first_column(cursor, det_tbl, mac_candidates)
        det_tot = find_first_column(cursor, det_tbl, tot_candidates)
        det_del = find_first_column(cursor, det_tbl, deleted_candidates)

        if not all([mas_prod, mas_date, det_prod, det_reason, det_mac, det_tot]):
            cursor.close()
            conn.close()
            return Response({
                "company": tenant.get("company_name", ""),
                "company_code": company_code or "",
                "from": str(start_date),
                "to": str(end_date),
                "accepted": [],
                "non_accepted": [],
                "warning": "Required columns missing on Machine_IdleEntryMas / Machine_IdleEntryDet.",
            })

        reason_map = {}
        if table_exists(cursor, ir_tbl):
            ir_link = find_first_column(cursor, ir_tbl, ir_link_candidates)
            ir_acc = find_first_column(cursor, ir_tbl, ir_accept_candidates)
            ir_del = find_first_column(cursor, ir_tbl, deleted_candidates)
            if ir_link and ir_acc:
                ir_sql = f"SELECT [{ir_link}], [{ir_acc}] FROM [{ir_tbl}]"
                if ir_del:
                    ir_sql += f" WHERE [{ir_del}] = 0"
                cursor.execute(ir_sql)
                for r in cursor.fetchall():
                    val = normalize_accept_flag(r[1])
                    if val is None:
                        continue
                    for key in idle_reason_lookup_keys(r[0]):
                        reason_map[key] = val

        join_sql = (
            f"SELECT d.[{det_reason}], d.[{det_mac}], CAST(d.[{det_tot}] AS FLOAT) AS hrs "
            f"FROM [{det_tbl}] d "
            f"INNER JOIN ( "
            f"  SELECT DISTINCT [{mas_prod}] AS pid FROM [{mas_tbl}] "
            f"  WHERE CAST([{mas_date}] AS DATE) BETWEEN ? AND ? "
        )
        params = [start_date, end_date]
        if mas_del:
            join_sql += f" AND [{mas_del}] = 0 "
        if mas_cc and company_code:
            join_sql += f" AND [{mas_cc}] = ? "
            params.append(company_code)
        join_sql += (
            f") m ON m.pid = d.[{det_prod}] "
            f"WHERE 1=1 "
        )
        if det_del:
            join_sql += f" AND d.[{det_del}] = 0"

        cursor.execute(join_sql, params)
        raw_rows = cursor.fetchall()

        acc_hours = defaultdict(float)
        na_hours = defaultdict(float)
        acc_mac_h = defaultdict(lambda: defaultdict(float))
        na_mac_h = defaultdict(lambda: defaultdict(float))

        for row in raw_rows:
            reasons = row[0]
            macno = row[1]
            hrs_raw = row[2]
            try:
                h = float(hrs_raw if hrs_raw is not None else 0)
            except (TypeError, ValueError):
                h = 0.0

            label = str(reasons).strip() if reasons is not None else "(no reason)"
            ia = None
            for key in idle_reason_lookup_keys(reasons):
                if key in reason_map:
                    ia = reason_map[key]
                    break

            mac_key = str(macno).strip() if macno is not None else "—"
            if not mac_key:
                mac_key = "—"

            if ia is True:
                acc_hours[label] += h
                acc_mac_h[label][mac_key] += h
            else:
                na_hours[label] += h
                na_mac_h[label][mac_key] += h

        def pick_mac(mac_dict):
            if not mac_dict:
                return "—"
            return max(mac_dict.items(), key=lambda x: x[1])[0]

        def build_rows(bucket_hours, bucket_mac_h, assign_sev):
            total = sum(bucket_hours.values())
            denom = total if total > 0 else 1.0
            sorted_items = sorted(bucket_hours.items(), key=lambda x: -x[1])
            out = []
            for i, (reason, hrs) in enumerate(sorted_items):
                pct = min(100, round((hrs / denom) * 100))
                mac = pick_mac(bucket_mac_h.get(reason, {}))
                item = {
                    "reason": reason,
                    "machine": mac,
                    "hours": round(hrs, 2),
                    "pct": pct,
                }
                if assign_sev:
                    if i == 0 and len(sorted_items) > 1:
                        item["sev"] = "crit"
                    elif pct >= 18:
                        item["sev"] = "warn"
                    else:
                        item["sev"] = "info"
                out.append(item)
            return out

        accepted_rows = build_rows(acc_hours, acc_mac_h, False)
        non_accepted_rows = build_rows(na_hours, na_mac_h, True)

        cursor.close()
        conn.close()

    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    return Response({
        "company": tenant.get("company_name", ""),
        "company_code": company_code or "",
        "from": str(start_date),
        "to": str(end_date),
        "accepted": accepted_rows,
        "non_accepted": non_accepted_rows,
    })


@api_view(["GET"])
def dashboard2_otd(request):
    """
    GET /api/dashboard2/otd/
    Optional: ?from=YYYY-MM-DD&to=YYYY-MM-DD (default: month start → today)

    On-time delivery vs In_PoDet_ShdQty.reqdate, using DC date from dc_mas.
    Deliveries: DcInSubDet UNION ALL DcInSubDetAssmPoDet (sale vs labour split by table),
    both linked by dcno → dc_mas.

    KPIs:
      - on_time_delivery_pct: share of delivered qty where DC date <= schedule reqdate
      - rating_weighted_pct: SUM(qty * CustPoOTDRating.RatingFor) / SUM(qty) using days_late
        vs CustPoOTDRating bands (days_late = 0 if DC on/before reqdate, else DATEDIFF days)
      - delayed_lines: count of DC detail rows with DC date > reqdate
    """
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

    tbl_po_mas = find_first_table(
        cursor,
        candidates=["In_PoMas", "in_pomas", "IN_POMAS"],
    )
    tbl_shd = find_first_table(
        cursor,
        candidates=["In_PoDet_ShdQty", "in_podet_shdqty", "IN_PODET_SHDQTY"],
    )
    tbl_dc_mas = find_first_table(
        cursor,
        candidates=["dc_mas", "Dc_Mas", "DC_Mas", "DcMas"],
    )
    tbl_dc_det = find_first_table(
        cursor,
        candidates=["DcInSubDet", "dcinsubdet", "DCINSUBDET"],
    )
    tbl_dc_assm = find_first_table(
        cursor,
        candidates=["DcInSubDetAssmPoDet", "dcinsubdetassmpodet", "DCINSUBDETASSMPODET"],
    )
    tbl_rating = find_first_table(
        cursor,
        candidates=["CustPoOTDRating", "custpootdrating", "CUSTPOOTDRATING"],
    )

    if not all([tbl_po_mas, tbl_shd, tbl_dc_mas, tbl_dc_det, tbl_dc_assm]):
        cursor.close()
        conn.close()
        missing = [
            n
            for n, t in [
                ("In_PoMas", tbl_po_mas),
                ("In_PoDet_ShdQty", tbl_shd),
                ("dc_mas", tbl_dc_mas),
                ("DcInSubDet", tbl_dc_det),
                ("DcInSubDetAssmPoDet", tbl_dc_assm),
            ]
            if not t
        ]
        return Response(
            {"error": f"Missing table(s) for OTD: {', '.join(missing)}"},
            status=404,
        )

    po_apono = find_first_column(
        cursor, tbl_po_mas, ["APono", "apono", "APNO", "PONo", "pono", "PoNo"]
    )
    po_deleted = find_first_column(cursor, tbl_po_mas, ["deleted", "Deleted", "is_deleted"])
    po_company = find_first_column(
        cursor, tbl_po_mas, ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]
    )

    sh_apono = find_first_column(
        cursor, tbl_shd, ["APono", "apono", "APNO", "PONo", "pono"]
    )
    sh_itcode = find_first_column(
        cursor, tbl_shd, ["itcode", "ItCode", "ITCODE", "PartNo", "partno", "Part_No"]
    )
    sh_req = find_first_column(
        cursor, tbl_shd, ["reqdate", "ReqDate", "REQDATE", "Req_Dt", "req_dt"]
    )
    sh_deleted = find_first_column(cursor, tbl_shd, ["deleted", "Deleted", "is_deleted"])

    dcno_m = find_first_column(cursor, tbl_dc_mas, ["dcno", "DcNo", "DCNO", "DC_No"])
    dc_dt = find_first_column(
        cursor, tbl_dc_mas, ["dcdate", "DcDate", "DCDT", "DC_DT", "dcdt", "date", "Date"]
    )
    dc_m_deleted = find_first_column(cursor, tbl_dc_mas, ["deleted", "Deleted", "is_deleted"])
    dc_m_company = find_first_column(
        cursor, tbl_dc_mas, ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]
    )

    def dc_cols(tbl):
        return {
            "apono": find_first_column(
                cursor, tbl, ["apono", "APono", "APNO", "PONo", "pono"]
            ),
            "partno": find_first_column(
                cursor, tbl, ["partno", "PartNo", "PARTNO", "itcode", "ItCode"]
            ),
            "dcno": find_first_column(cursor, tbl, ["dcno", "DcNo", "DCNO"]),
            "ok": find_first_column(cursor, tbl, ["okqty", "OkQty", "OKQty"]),
            "matrej": find_first_column(cursor, tbl, ["matrej", "MatRej", "MATREJ"]),
            "macrej": find_first_column(cursor, tbl, ["macrej", "MacRej", "MACREJ"]),
            "uncomp": find_first_column(
                cursor, tbl, ["uncompqty", "UncompQty", "UNCOMPQTY", "uncomp_qty"]
            ),
            "deleted": find_first_column(cursor, tbl, ["deleted", "Deleted", "is_deleted"]),
        }

    c1 = dc_cols(tbl_dc_det)
    c2 = dc_cols(tbl_dc_assm)

    required = [
        (f"{tbl_po_mas}.apono", po_apono),
        (f"{tbl_shd}.apono", sh_apono),
        (f"{tbl_shd}.itcode", sh_itcode),
        (f"{tbl_shd}.reqdate", sh_req),
        (f"{tbl_dc_mas}.dcno", dcno_m),
        (f"{tbl_dc_mas}.dcdate", dc_dt),
        (f"{tbl_dc_det}.apono", c1["apono"]),
        (f"{tbl_dc_det}.partno", c1["partno"]),
        (f"{tbl_dc_det}.dcno", c1["dcno"]),
        (f"{tbl_dc_assm}.apono", c2["apono"]),
        (f"{tbl_dc_assm}.partno", c2["partno"]),
        (f"{tbl_dc_assm}.dcno", c2["dcno"]),
    ]
    for label, col in required:
        if not col:
            cursor.close()
            conn.close()
            return Response(
                {"error": f"OTD: could not resolve column for {label}"},
                status=422,
            )

    qty_expr_det = " + ".join(
        [
            f"COALESCE(CAST(d.[{c}] AS FLOAT), 0)"
            for c in [c1["ok"], c1["matrej"], c1["macrej"], c1["uncomp"]]
            if c
        ]
    ) or "0"
    qty_expr_assm = " + ".join(
        [
            f"COALESCE(CAST(a.[{c}] AS FLOAT), 0)"
            for c in [c2["ok"], c2["matrej"], c2["macrej"], c2["uncomp"]]
            if c
        ]
    ) or "0"

    def filt_po(alias):
        parts = [f"[{alias}].[{po_deleted}] = 0"] if po_deleted else []
        if po_company and company_code:
            parts.append(f"[{alias}].[{po_company}] = ?")
        return " AND " + " AND ".join(parts) if parts else ""

    def filt_dc_mas(alias):
        parts = [f"CAST([{alias}].[{dc_dt}] AS DATE) BETWEEN ? AND ?"]
        if dc_m_deleted:
            parts.append(f"[{alias}].[{dc_m_deleted}] = 0")
        if dc_m_company and company_code:
            parts.append(f"[{alias}].[{dc_m_company}] = ?")
        return " AND " + " AND ".join(parts)

    sh_where = f"[{sh_deleted}] = 0" if sh_deleted else "1=1"
    d_del = f"d.[{c1['deleted']}] = 0" if c1["deleted"] else "1=1"
    a_del = f"a.[{c2['deleted']}] = 0" if c2["deleted"] else "1=1"

    join_po = f"INNER JOIN [{tbl_po_mas}] p ON p.[{po_apono}] = d.[{c1['apono']}]{filt_po('p')}"

    union_sql = f"""
        SELECT
            d.[{c1['dcno']}] AS dcno,
            LTRIM(RTRIM(CAST(d.[{c1['apono']}] AS NVARCHAR(64)))) AS apono,
            LTRIM(RTRIM(CAST(d.[{c1['partno']}] AS NVARCHAR(128)))) AS partno,
            CAST(m.[{dc_dt}] AS DATE) AS dc_date,
            ({qty_expr_det}) AS del_qty
        FROM [{tbl_dc_det}] d
        INNER JOIN [{tbl_dc_mas}] m ON m.[{dcno_m}] = d.[{c1['dcno']}]
        {join_po}
        WHERE {d_del} AND {filt_dc_mas('m')}

        UNION ALL

        SELECT
            a.[{c2['dcno']}] AS dcno,
            LTRIM(RTRIM(CAST(a.[{c2['apono']}] AS NVARCHAR(64)))) AS apono,
            LTRIM(RTRIM(CAST(a.[{c2['partno']}] AS NVARCHAR(128)))) AS partno,
            CAST(m2.[{dc_dt}] AS DATE) AS dc_date,
            ({qty_expr_assm}) AS del_qty
        FROM [{tbl_dc_assm}] a
        INNER JOIN [{tbl_dc_mas}] m2 ON m2.[{dcno_m}] = a.[{c2['dcno']}]
        INNER JOIN [{tbl_po_mas}] p2 ON p2.[{po_apono}] = a.[{c2['apono']}]{filt_po('p2')}
        WHERE {a_del} AND {filt_dc_mas('m2')}
    """

    rf = rt = rfor = None
    if tbl_rating:
        rf = find_first_column(
            cursor, tbl_rating, ["RatingFrom", "ratingfrom", "RATINGFROM"]
        )
        rt = find_first_column(cursor, tbl_rating, ["RatingTo", "ratingto", "RATINGTO"])
        rfor = find_first_column(
            cursor, tbl_rating, ["RatingFor", "ratingfor", "RATINGFOR"]
        )

    rating_join = ""
    rating_expr = "CAST(0 AS FLOAT)"
    if tbl_rating and rf and rt and rfor:
        rating_join = (
            f"LEFT JOIN [{tbl_rating}] r ON j.days_late >= r.[{rf}] AND j.days_late <= r.[{rt}]"
        )
        rating_expr = f"COALESCE(CAST(r.[{rfor}] AS FLOAT), 0)"

    def append_po_params():
        pl = []
        if po_company and company_code:
            pl.append(company_code)
        return pl

    def append_dc_params():
        pl = [start_date, end_date]
        if dc_m_company and company_code:
            pl.append(company_code)
        return pl

    union_params = append_po_params() + append_dc_params() + append_po_params() + append_dc_params()

    main_sql = f"""
        WITH sch AS (
            SELECT
                LTRIM(RTRIM(CAST([{sh_apono}] AS NVARCHAR(64)))) AS apono,
                LTRIM(RTRIM(CAST([{sh_itcode}] AS NVARCHAR(128)))) AS itcode,
                MIN(CAST([{sh_req}] AS DATE)) AS reqdate
            FROM [{tbl_shd}]
            WHERE {sh_where}
            GROUP BY
                LTRIM(RTRIM(CAST([{sh_apono}] AS NVARCHAR(64)))),
                LTRIM(RTRIM(CAST([{sh_itcode}] AS NVARCHAR(128))))
        ),
        del AS (
            {union_sql}
        ),
        joined AS (
            SELECT
                del.dc_date,
                del.del_qty,
                sch.reqdate,
                CASE WHEN del.dc_date <= sch.reqdate THEN 0
                     ELSE DATEDIFF(DAY, sch.reqdate, del.dc_date)
                END AS days_late
            FROM del
            INNER JOIN sch ON sch.apono = del.apono AND sch.itcode = del.partno
        )
        SELECT
            COALESCE(SUM(CASE WHEN j.dc_date <= j.reqdate THEN j.del_qty ELSE 0 END), 0) AS on_time_qty,
            COALESCE(SUM(j.del_qty), 0) AS total_qty,
            COALESCE(SUM(CASE WHEN j.dc_date > j.reqdate THEN 1 ELSE 0 END), 0) AS delayed_lines,
            COALESCE(SUM(CAST(j.del_qty AS FLOAT) * ({rating_expr})), 0) AS rating_num
        FROM joined j
        {rating_join}
    """

    trend_sql = f"""
        WITH sch AS (
            SELECT
                LTRIM(RTRIM(CAST([{sh_apono}] AS NVARCHAR(64)))) AS apono,
                LTRIM(RTRIM(CAST([{sh_itcode}] AS NVARCHAR(128)))) AS itcode,
                MIN(CAST([{sh_req}] AS DATE)) AS reqdate
            FROM [{tbl_shd}]
            WHERE {sh_where}
            GROUP BY
                LTRIM(RTRIM(CAST([{sh_apono}] AS NVARCHAR(64)))),
                LTRIM(RTRIM(CAST([{sh_itcode}] AS NVARCHAR(128))))
        ),
        del AS (
            {union_sql}
        ),
        joined AS (
            SELECT
                del.dc_date,
                del.del_qty,
                sch.reqdate
            FROM del
            INNER JOIN sch ON sch.apono = del.apono AND sch.itcode = del.partno
        )
        SELECT
            YEAR(j.dc_date) AS y,
            MONTH(j.dc_date) AS m,
            COALESCE(SUM(CASE WHEN j.dc_date <= j.reqdate THEN j.del_qty ELSE 0 END), 0) AS on_time_qty,
            COALESCE(SUM(j.del_qty), 0) AS total_qty
        FROM joined j
        GROUP BY YEAR(j.dc_date), MONTH(j.dc_date)
        ORDER BY YEAR(j.dc_date), MONTH(j.dc_date)
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

    otd_pct = (
        round((on_time_qty / total_qty) * 100, 2) if total_qty > 0 else None
    )
    rating_weighted_pct = (
        round((rating_num / total_qty), 2) if total_qty > 0 else None
    )

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    trend = []
    for tr in trend_rows or []:
        y, m, otq, tq = int(tr[0]), int(tr[1]), float(tr[2] or 0), float(tr[3] or 0)
        pct = round((otq / tq) * 100, 2) if tq > 0 else None
        trend.append({
            "year": y,
            "month": m,
            "label": f"{month_names[m - 1]} {y}",
            "on_time_delivery_pct": pct,
            "total_qty": round(tq, 2),
        })

    schedule_adherence_pct = (
        rating_weighted_pct if rating_weighted_pct is not None else otd_pct
    )

    return Response({
        "company": tenant.get("company_name", ""),
        "company_code": tenant.get("company_code", ""),
        "from": str(start_date),
        "to": str(end_date),
        "kpis": {
            "on_time_delivery_pct": otd_pct,
            "rating_weighted_pct": rating_weighted_pct,
            "schedule_adherence_pct": schedule_adherence_pct,
            "delayed_lines": delayed_lines,
            "on_time_qty": round(on_time_qty, 2),
            "total_del_qty": round(total_qty, 2),
        },
        "trend": trend,
        "sources": [
            f"{tbl_po_mas} (deleted=0), {tbl_shd} (reqdate), {tbl_dc_mas} (DC date), "
            f"{tbl_dc_det} + {tbl_dc_assm}",
            "CustPoOTDRating for weighted score when days late falls in RatingFrom-RatingTo",
        ],
    })


@api_view(['GET'])
def dashboard2_final_inspection_kpi(request):
    """
    GET /api/dashboard2/final-inspection-kpi/
    Optional: ?from=YYYY-MM-DD&to=YYYY-MM-DD

    Queries FinalInspectionEntry and returns:
      - total_ok_qty      → SUM(okqty)   where deleted = 0
      - total_rej_qty     → SUM(rejqty)  where deleted = 0
      - total_mat_rej_qty → SUM(matrejqty) where deleted = 0
      - total_qty         → SUM(totqty)  where deleted = 0
      - first_pass_yield  → (total_ok_qty / total_qty) * 100  (rounded 2dp)
      - inspection_count  → COUNT of finspno rows

    Date column used : finspdate
    Deleted filter   : deleted = 0  (SQL Server BIT/INT column)

    Response shape:
    {
        "company":            "ABC Industries",
        "from":               "2026-04-01",
        "to":                 "2026-04-16",
        "total_ok_qty":       4218,
        "total_rej_qty":      52,
        "total_mat_rej_qty":  14,
        "total_qty":          4284,
        "first_pass_yield":   98.46,
        "inspection_count":   87
    }
    """
    # ── Auth ─────────────────────────────────────────────────
    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    # ── Date range ───────────────────────────────────────────
    # Default: current month start → today
    from_param = (request.GET.get("from") or "").strip()
    to_param   = (request.GET.get("to")   or "").strip()

    if from_param and to_param:
        try:
            start_date = datetime.strptime(from_param, "%Y-%m-%d").date()
            end_date   = datetime.strptime(to_param,   "%Y-%m-%d").date()
            if start_date > end_date:
                start_date, end_date = end_date, start_date
        except ValueError:
            today      = date.today()
            start_date = date(today.year, today.month, 1)
            end_date   = today
    else:
        today      = date.today()
        start_date = date(today.year, today.month, 1)
        end_date   = today

    company_candidates = ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]

    # ── Query ────────────────────────────────────────────────
    try:
        cursor = conn.cursor()

        # Confirm the table exists before querying
        if not table_exists(cursor, "FinalInspectionEntry"):
            cursor.close()
            conn.close()
            return Response(
                {"error": "Table FinalInspectionEntry not found in this database."},
                status=404,
            )

        company_col = find_first_column(cursor, "FinalInspectionEntry", company_candidates)
        company_code = tenant.get("company_code")

        sql = """
            SELECT
                COALESCE(SUM(CAST(okqty      AS FLOAT)), 0)  AS total_ok_qty,
                COALESCE(SUM(CAST(rejqty     AS FLOAT)), 0)  AS total_rej_qty,
                COALESCE(SUM(CAST(matrejqty  AS FLOAT)), 0)  AS total_mat_rej_qty,
                COALESCE(SUM(CAST(totqty     AS FLOAT)), 0)  AS total_qty,
                COUNT(finspno)                               AS inspection_count
            FROM FinalInspectionEntry
            WHERE deleted = 0
              AND CAST(finspdate AS DATE) BETWEEN ? AND ?
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

    total_ok_qty      = float(row[0] or 0)
    total_rej_qty     = float(row[1] or 0)
    total_mat_rej_qty = float(row[2] or 0)
    total_qty         = float(row[3] or 0)
    inspection_count  = int(row[4]   or 0)

    # First Pass Yield = ok / total × 100
    first_pass_yield = (
        round((total_ok_qty / total_qty) * 100, 2)
        if total_qty > 0
        else 0.0
    )

    return Response({
        "company":            tenant.get("company_name", ""),
        "company_code":       tenant.get("company_code", ""),
        "from":               str(start_date),
        "to":                 str(end_date),
        "total_ok_qty":       round(total_ok_qty,      2),
        "total_rej_qty":      round(total_rej_qty,      2),
        "total_mat_rej_qty":  round(total_mat_rej_qty,  2),
        "total_qty":          round(total_qty,           2),
        "first_pass_yield":   first_pass_yield,
        "inspection_count":   inspection_count,
    })