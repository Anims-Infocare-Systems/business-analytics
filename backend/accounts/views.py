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


    # ─────────────────────────────────────────────────────────────
#  DASHBOARD 2 — FINAL INSPECTION KPI
#  Add this view to your existing views.py
# ─────────────────────────────────────────────────────────────

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
        "first_pass_yield":   98.46,      ← percentage, 2 dp
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