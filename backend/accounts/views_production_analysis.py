from rest_framework.decorators import api_view
from rest_framework.response import Response
from datetime import datetime
from .views import get_tenant_connection, table_exists

@api_view(["GET"])
def production_analysis_report(request):
    """
    Production Analysis Report endpoint with KPI calculations.
    Returns Total Production Qty, OK/Accepted Qty, and Rejection Qty
    based on date range parameters.
    """
    conn = None
    try:
        # Get dynamic tenant connection
        try:
            conn, tenant = get_tenant_connection(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=401)

        # Get date range from query parameters
        from_date = request.query_params.get('from', None)
        to_date = request.query_params.get('to', None)

        # Validate dates
        if not from_date or not to_date:
            return Response({
                "status": "error",
                "message": "Date range parameters 'from' and 'to' are required",
                "data": {}
            }, status=400)

        try:
            # Parse and validate date format (YYYY-MM-DD)
            datetime.strptime(from_date, '%Y-%m-%d')
            datetime.strptime(to_date, '%Y-%m-%d')
        except ValueError:
            return Response({
                "status": "error",
                "message": "Invalid date format. Use YYYY-MM-DD",
                "data": {}
            }, status=400)

        # Initialize result dictionary
        result = {
            "totalProductionQty": 0,
            "okAcceptedQty": 0,
            "rejectionQty": 0,
            "overallOee": 0.0,
            "productionHours": 0.0,
            "totalMachineHours": 0.0,
            "idleHours": 0.0,
            "settingHours": 0.0,
            "manEfficiency": 0.0,
            # Daily Production Summary
            "totalShifts": 0,
            "avgProdPerShift": 0.0,
            "peakShiftOutput": 0,
            "lowestShiftOutput": 0,
            "activeMachines": 0,
            "idleMachines": 0,
            # Machine & Operator Efficiency
            "machineUtilization": 0.0,
            "machineEfficiency": 0.0,
            "operatorEfficiency": 0.0,
            "qualityRate": 0.0,
            "materialRejection": 0.0,
            "machineRejection": 0.0
        }
        import logging
        logger = logging.getLogger(__name__)
        def run_query(sql, params=None):
            """Execute a single query and return the first row, or None on error."""
            cur = conn.cursor()
            try:
                cur.execute(sql, params or [])
                return cur.fetchone()
            except Exception as qe:
                logger.warning(f"Query skipped due to error: {qe}")
                return None
            finally:
                cur.close()

        # ── Query 1: Total Production Qty ─────────────────────────────
        total_prod_query = """
        SELECT COALESCE(SUM(Qty), 0) AS TotalProductionQty
        FROM (
            SELECT COALESCE(okqty, 0) AS Qty FROM ProductionEntry WHERE proddate BETWEEN ? AND ? AND deleted = 0
            UNION ALL
            SELECT COALESCE(qty, 0) AS Qty FROM ConvProductionEntry WHERE entrydate BETWEEN ? AND ? AND deleted = 0
            UNION ALL
            SELECT COALESCE(qty, 0) AS Qty FROM ConvProductionEntryRod WHERE entrydate BETWEEN ? AND ? AND deleted = 0
        ) AS A
        """
        row = run_query(total_prod_query, [from_date, to_date, from_date, to_date, from_date, to_date])
        if row and row[0] is not None: result["totalProductionQty"] = int(row[0])

        # ── Query 2: OK / Accepted Qty ────────────────────────────────
        ok_qty_query = """
        SELECT COALESCE(SUM(InspOkQty), 0) AS TotalInspectionOkQty
        FROM (
            SELECT COALESCE((SELECT SUM(COALESCE(I.okqty, 0)) FROM InterInspectionEntry I WHERE I.prodid = P.prodid AND I.deleted = 0), 0) AS InspOkQty
            FROM ProductionEntry P WHERE P.proddate BETWEEN ? AND ? AND P.deleted = 0
            UNION ALL SELECT 0 AS InspOkQty FROM ConvProductionEntry C WHERE C.entrydate BETWEEN ? AND ? AND C.deleted = 0
            UNION ALL SELECT 0 AS InspOkQty FROM ConvProductionEntryRod R WHERE R.entrydate BETWEEN ? AND ? AND R.deleted = 0
        ) AS A
        """
        row = run_query(ok_qty_query, [from_date, to_date, from_date, to_date, from_date, to_date])
        if row and row[0] is not None: result["okAcceptedQty"] = int(row[0])

        # ── Query 3: Rejection Qty ────────────────────────────────────
        rej_qty_query = """
        SELECT COALESCE(SUM(RejQty), 0) AS TotalRejectionQty
        FROM (
            SELECT COALESCE((SELECT SUM(COALESCE(RJ.qty, 0)) FROM InterInspectionEntry I INNER JOIN Insp_RejectionEntry RJ ON I.inter_inspno = RJ.inter_inspno WHERE I.prodid = P.prodid AND I.deleted = 0 AND RJ.deleted = 0), 0) AS RejQty
            FROM ProductionEntry P WHERE P.proddate BETWEEN ? AND ? AND P.deleted = 0
            UNION ALL SELECT 0 AS RejQty FROM ConvProductionEntry C WHERE C.entrydate BETWEEN ? AND ? AND C.deleted = 0
            UNION ALL SELECT 0 AS RejQty FROM ConvProductionEntryRod R WHERE R.entrydate BETWEEN ? AND ? AND R.deleted = 0
        ) AS A
        """
        row = run_query(rej_qty_query, [from_date, to_date, from_date, to_date, from_date, to_date])
        if row and row[0] is not None: result["rejectionQty"] = int(row[0])

        # ── Query 4: Overall OEE ──────────────────────────────────────
        oee_query = """
        SELECT CAST(AVG(ISNULL(OEENEW,0)) AS DECIMAL(18,2)) AS Overall_OEENEW
        FROM (
            SELECT OEENEW FROM ProductionEntry WHERE proddate BETWEEN ? AND ? AND deleted = 0
            UNION ALL SELECT OEENEW FROM ConvProductionEntry WHERE entrydate BETWEEN ? AND ? AND deleted = 0
            UNION ALL SELECT OEENEW FROM ConvProductionEntryRod WHERE entrydate BETWEEN ? AND ? AND deleted = 0
        ) A
        """
        row = run_query(oee_query, [from_date, to_date, from_date, to_date, from_date, to_date])
        if row and row[0] is not None: result["overallOee"] = float(row[0])

        # ── Query 5: Production Hours ─────────────────────────────────
        hours_query = """
        SELECT CAST(SUM(TotalRunSeconds) / 3600.0 AS DECIMAL(18,2)) AS TotalHours
        FROM (
            SELECT DATEDIFF(SECOND, runfrom, runto) AS TotalRunSeconds FROM ProductionEntry WHERE proddate BETWEEN ? AND ? AND deleted = 0 AND runfrom IS NOT NULL AND runto IS NOT NULL
            UNION ALL SELECT DATEDIFF(SECOND, starttime, endtime) AS TotalRunSeconds FROM ConvProductionEntry WHERE entrydate BETWEEN ? AND ? AND deleted = 0 AND starttime IS NOT NULL AND endtime IS NOT NULL
            UNION ALL SELECT DATEDIFF(SECOND, starttime, endtime) AS TotalRunSeconds FROM ConvProductionEntryRod WHERE entrydate BETWEEN ? AND ? AND deleted = 0 AND starttime IS NOT NULL AND endtime IS NOT NULL
        ) A
        """
        row = run_query(hours_query, [from_date, to_date, from_date, to_date, from_date, to_date])
        if row and row[0] is not None: result["productionHours"] = float(row[0])

        # ── Query 6: Total Machine Hours ──────────────────────────────
        total_machine_hours_query = """
        SELECT CAST((COUNT(DISTINCT M.macno) * SUM(
            (CASE WHEN S.etime1 < S.stime1 THEN DATEDIFF(SECOND, S.stime1, DATEADD(DAY,1,S.etime1)) ELSE DATEDIFF(SECOND, S.stime1, S.etime1) END) +
            (CASE WHEN S.etime2 < S.stime2 THEN DATEDIFF(SECOND, S.stime2, DATEADD(DAY,1,S.etime2)) ELSE DATEDIFF(SECOND, S.stime2, S.etime2) END)
        )) / 3600.0 AS DECIMAL(18,2)) AS TotalMachineHours
        FROM Shift S CROSS JOIN (SELECT macno FROM MacMaster WHERE deleted = 0 AND ISNULL(IsNonActive,0) = 0) M
        WHERE S.deleted = 0
        """
        row = run_query(total_machine_hours_query)
        if row and row[0] is not None: result["totalMachineHours"] = float(row[0])

        # ── Query 7: Total Idle Hours ─────────────────────────────────
        idle_hours_query = """
        SELECT CAST(SUM(A.IdleSeconds) / 3600.0 AS DECIMAL(18,2)) AS TotalIdleHours
        FROM (
            SELECT DATEDIFF(SECOND, '1900-01-01 00:00:00', D.tottime) AS IdleSeconds FROM Machine_IdleEntryDet D INNER JOIN Machine_IdleEntryMas M ON D.prodid = M.prodid WHERE M.proddate BETWEEN ? AND ? AND M.deleted = 0 AND D.deleted = 0
            UNION ALL SELECT ISNULL(P.accidletimesecs,0) + ISNULL(P.nonaccidletimesecs,0) AS IdleSeconds FROM ProductionEntry P WHERE P.proddate BETWEEN ? AND ? AND P.deleted = 0
            UNION ALL SELECT DATEDIFF(SECOND, '1900-01-01 00:00:00', C.IdleTime) AS IdleSeconds FROM ConvProductionEntry C WHERE C.entrydate BETWEEN ? AND ? AND C.deleted = 0
            UNION ALL SELECT DATEDIFF(SECOND, '1900-01-01 00:00:00', R.IdleTime) AS IdleSeconds FROM ConvProductionEntryRod R WHERE R.entrydate BETWEEN ? AND ? AND R.deleted = 0
        ) A
        """
        row = run_query(idle_hours_query, [from_date, to_date, from_date, to_date, from_date, to_date, from_date, to_date])
        if row and row[0] is not None: result["idleHours"] = float(row[0])

        # ── Query 8: Total Setting Hours ──────────────────────────────
        setting_hours_query = """
        SELECT CAST(SUM(SettingSeconds) / 3600.0 AS DECIMAL(18,2)) AS TotalSettingHours
        FROM (
            SELECT CASE WHEN setto < setfrom THEN DATEDIFF(SECOND, setfrom, DATEADD(DAY,1,setto)) ELSE DATEDIFF(SECOND, setfrom, setto) END AS SettingSeconds FROM ProductionEntry WHERE proddate BETWEEN ? AND ? AND deleted = 0 AND setfrom IS NOT NULL AND setto IS NOT NULL
            UNION ALL SELECT CASE WHEN setto < setfrom THEN DATEDIFF(SECOND, setfrom, DATEADD(DAY,1,setto)) ELSE DATEDIFF(SECOND, setfrom, setto) END AS SettingSeconds FROM ConvProductionEntry WHERE entrydate BETWEEN ? AND ? AND deleted = 0 AND setfrom IS NOT NULL AND setto IS NOT NULL
            UNION ALL SELECT CASE WHEN setto < setfrom THEN DATEDIFF(SECOND, setfrom, DATEADD(DAY,1,setto)) ELSE DATEDIFF(SECOND, setfrom, setto) END AS SettingSeconds FROM ConvProductionEntryRod WHERE entrydate BETWEEN ? AND ? AND deleted = 0 AND setfrom IS NOT NULL AND setto IS NOT NULL
        ) A
        """
        row = run_query(setting_hours_query, [from_date, to_date, from_date, to_date, from_date, to_date])
        if row and row[0] is not None: result["settingHours"] = float(row[0])

        # ── Query 9: Man Efficiency ───────────────────────────────────
        man_efficiency_query = """
        SELECT CAST(AVG(ISNULL(OPREFF,0)) AS DECIMAL(18,2)) AS Overall_ManEfficiency
        FROM (
            SELECT OPREFF FROM ProductionEntry WHERE proddate BETWEEN ? AND ? AND deleted = 0 AND OPREFF IS NOT NULL
            UNION ALL SELECT eff FROM ConvProductionEntry WHERE entrydate BETWEEN ? AND ? AND deleted = 0 AND eff IS NOT NULL
            UNION ALL SELECT EFF FROM ConvProductionEntryRod WHERE entrydate BETWEEN ? AND ? AND deleted = 0 AND EFF IS NOT NULL
        ) A
        """
        row = run_query(man_efficiency_query, [from_date, to_date, from_date, to_date, from_date, to_date])
        if row and row[0] is not None: result["manEfficiency"] = float(row[0])

        # ── Query 10: Daily Production Summary ───────────────────────
        shift_summary_query = """
        SELECT COUNT(*) AS TotalShifts, CAST(AVG(CAST(ShiftQty AS FLOAT)) AS DECIMAL(18,2)) AS AvgProdPerShift, MAX(ShiftQty) AS PeakShiftOutput, MIN(ShiftQty) AS LowestShiftOutput
        FROM (
            SELECT P.shift, P.proddate, SUM(ISNULL(P.okqty,0)) AS ShiftQty FROM ProductionEntry P WHERE P.proddate BETWEEN ? AND ? AND P.deleted = 0 GROUP BY P.shift, P.proddate
            UNION ALL SELECT C.shift, C.entrydate, SUM(ISNULL(C.qty,0)) AS ShiftQty FROM ConvProductionEntry C WHERE C.entrydate BETWEEN ? AND ? AND C.deleted = 0 GROUP BY C.shift, C.entrydate
            UNION ALL SELECT R.shift, R.entrydate, SUM(ISNULL(R.qty,0)) AS ShiftQty FROM ConvProductionEntryRod R WHERE R.entrydate BETWEEN ? AND ? AND R.deleted = 0 GROUP BY R.shift, R.entrydate
        ) AS AllShifts
        """
        row = run_query(shift_summary_query, [from_date, to_date, from_date, to_date, from_date, to_date])
        if row:
            result["totalShifts"]       = int(row[0] or 0)
            result["avgProdPerShift"]   = float(row[1] or 0)
            result["peakShiftOutput"]   = int(row[2] or 0)
            result["lowestShiftOutput"] = int(row[3] or 0)

        active_mac_query = """
        SELECT COUNT(DISTINCT macno) AS ActiveMachines
        FROM (
            SELECT macno FROM ProductionEntry WHERE proddate BETWEEN ? AND ? AND deleted = 0 AND macno IS NOT NULL
            UNION SELECT macno FROM ConvProductionEntry WHERE entrydate BETWEEN ? AND ? AND deleted = 0 AND macno IS NOT NULL
            UNION SELECT macno FROM ConvProductionEntryRod WHERE entrydate BETWEEN ? AND ? AND deleted = 0 AND macno IS NOT NULL
        ) AS ActiveMacs
        """
        row = run_query(active_mac_query, [from_date, to_date, from_date, to_date, from_date, to_date])
        active_count = int(row[0] or 0) if row else 0
        result["activeMachines"] = active_count

        total_mac_query = "SELECT COUNT(*) FROM MacMaster WHERE deleted = 0 AND ISNULL(IsNonActive,0) = 0"
        row = run_query(total_mac_query)
        total_mac = int(row[0] or 0) if row else 0
        result["idleMachines"] = max(total_mac - active_count, 0)

        # ── Query 11: Machine & Operator Efficiency ───────────────────
        result["machineUtilization"] = result["overallOee"]
        mac_eff_query = """SELECT CAST(AVG(ISNULL(OAEFF,0)) AS DECIMAL(18,2)) AS MachineEfficiency FROM ProductionEntry WHERE proddate BETWEEN ? AND ? AND deleted = 0 AND OAEFF IS NOT NULL"""
        row = run_query(mac_eff_query, [from_date, to_date])
        if row and row[0] is not None: result["machineEfficiency"] = float(row[0])
        result["operatorEfficiency"] = result["manEfficiency"]

        if result["totalProductionQty"] > 0:
            result["qualityRate"] = round((result["okAcceptedQty"] / result["totalProductionQty"]) * 100, 2)

        rej_breakdown_query = """
        SELECT
            CAST(ISNULL(SUM(CASE WHEN ISNULL(RJ.matrej,0) = 1 THEN ISNULL(RJ.qty,0) ELSE 0 END),0) * 100.0 / NULLIF(SUM(ISNULL(RJ.qty,0)),0) AS DECIMAL(18,2)) AS MatRejPct,
            CAST(ISNULL(SUM(CASE WHEN ISNULL(RJ.matrej,0) = 0 THEN ISNULL(RJ.qty,0) ELSE 0 END),0) * 100.0 / NULLIF(SUM(ISNULL(RJ.qty,0)),0) AS DECIMAL(18,2)) AS MacRejPct
        FROM Insp_RejectionEntry RJ
        INNER JOIN InterInspectionEntry I ON RJ.inter_inspno = I.inter_inspno
        INNER JOIN ProductionEntry P ON I.prodid = P.prodid
        WHERE P.proddate BETWEEN ? AND ? AND P.deleted = 0 AND I.deleted = 0 AND RJ.deleted = 0
        """
        row = run_query(rej_breakdown_query, [from_date, to_date])
        if row:
            result["materialRejection"] = float(row[0] or 0)
            result["machineRejection"]  = float(row[1] or 0)

        return Response({
            "status": "success",
            "message": "Production Analysis Report data fetched successfully",
            "data": result,
            "dateRange": {"from": from_date, "to": to_date}
        })
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in production_analysis_report: {str(e)}", exc_info=True)
        return Response({"status": "error", "message": f"Failed to fetch production analysis data: {str(e)}", "data": {}}, status=500)
    finally:
        if conn:
            try: conn.close()
            except: pass

# ─────────────────────────────────────────────────────────────────────────────
# Production Value Report  (Machine-wise + Month-wise)
# Value = qty × RatePerHr from MacMaster
# ─────────────────────────────────────────────────────────────────────────────
@api_view(["GET"])
def production_value_report(request):
    conn = None
    try:
        try:
            conn, tenant = get_tenant_connection(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=401)

        from_date = request.query_params.get("from", None)
        to_date   = request.query_params.get("to",   None)
        if not from_date or not to_date:
            return Response({"status": "error", "message": "from and to required", "data": {}}, status=400)
        try:
            datetime.strptime(from_date, "%Y-%m-%d")
            datetime.strptime(to_date,   "%Y-%m-%d")
        except ValueError:
            return Response({"status": "error", "message": "Invalid date format. Use YYYY-MM-DD", "data": {}}, status=400)

        import logging
        logger = logging.getLogger(__name__)
        def run_query(sql, params=None):
            cur = conn.cursor()
            try:
                cur.execute(sql, params or [])
                return cur.fetchall()
            except Exception as qe:
                logger.warning(f"production_value_report query skipped: {qe}")
                return []
            finally:
                cur.close()

        value_query = """
        SELECT A.macno AS MacName, ISNULL(M.RatePerHr, 0) AS RatePerHr, FORMAT(A.entrydate, 'MMM yy') AS MonthLabel,
               DATEPART(YEAR, A.entrydate) * 100 + DATEPART(MONTH, A.entrydate) AS YearMonth, SUM(A.qty) AS TotalQty
        FROM (
            SELECT macno, proddate AS entrydate, ISNULL(okqty, 0) AS qty FROM ProductionEntry WHERE proddate BETWEEN ? AND ? AND deleted = 0 AND macno IS NOT NULL
            UNION ALL SELECT macno, entrydate, ISNULL(qty, 0) AS qty FROM ConvProductionEntry WHERE entrydate BETWEEN ? AND ? AND deleted = 0 AND macno IS NOT NULL
            UNION ALL SELECT macno, entrydate, ISNULL(qty, 0) AS qty FROM ConvProductionEntryRod WHERE entrydate BETWEEN ? AND ? AND deleted = 0 AND macno IS NOT NULL
        ) A
        LEFT JOIN MacMaster M ON M.macno = A.macno AND M.deleted = 0
        GROUP BY A.macno, ISNULL(M.RatePerHr, 0), FORMAT(A.entrydate, 'MMM yy'), DATEPART(YEAR, A.entrydate) * 100 + DATEPART(MONTH, A.entrydate)
        ORDER BY YearMonth, MacName
        """
        rows = run_query(value_query, [from_date, to_date, from_date, to_date, from_date, to_date])

        machine_totals = {}
        month_order   = {}
        month_machine = {}

        for mac_name, rate_per_hr, month_label, year_month, total_qty in rows:
            value = float(total_qty or 0) * float(rate_per_hr or 0)
            machine_totals[mac_name] = machine_totals.get(mac_name, 0) + value
            month_order[year_month] = month_label
            if mac_name not in month_machine: month_machine[mac_name] = {}
            month_machine[mac_name][year_month] = month_machine[mac_name].get(year_month, 0) + value

        sorted_machines = sorted(machine_totals.items(), key=lambda x: x[1], reverse=True)
        machine_labels   = [m[0] for m in sorted_machines]
        machine_achieved = [round(m[1]) for m in sorted_machines]
        sorted_months = sorted(month_order.items())
        month_labels  = [m[1] for m in sorted_months]
        month_ym_keys = [m[0] for m in sorted_months]

        COLORS = ["#2563eb","#f97316","#10b981","#8b5cf6","#06b6d4","#ec4899","#f59e0b","#6366f1","#ef4444","#84cc16","#14b8a6","#a855f7","#fb923c","#22d3ee","#4ade80","#f43f5e","#0ea5e9","#d946ef","#fbbf24","#34d399"]
        month_datasets = []
        for idx, mac in enumerate(machine_labels):
            month_data = [round(month_machine.get(mac, {}).get(ym, 0)) for ym in month_ym_keys]
            month_datasets.append({"label": mac, "data": month_data, "backgroundColor": COLORS[idx % len(COLORS)], "borderRadius": 4})

        return Response({
            "status": "success",
            "data": {
                "machine_data": {"labels": machine_labels, "achieved": machine_achieved},
                "month_data":   {"labels": month_labels, "datasets": month_datasets},
            },
            "dateRange": {"from": from_date, "to": to_date}
        })
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"production_value_report error: {e}", exc_info=True)
        return Response({"status": "error", "message": str(e), "data": {}}, status=500)
    finally:
        if conn:
            try: conn.close()
            except: pass

# ─────────────────────────────────────────────────────────────────────────────
# Production Idle Breakdown (Accepted vs Non-Accepted)
# Mirrors _fetch_accepted_vs_non_accepted logic from views_idle_time_report.py
# ─────────────────────────────────────────────────────────────────────────────
_PA_IDLE_UNION_SQL = """
SELECT M.proddate AS EntryDate, D.Shift, D.MacNo, ISNULL(D.reasons, N'Machine Idle Entry') AS Reason, DATEDIFF(SECOND, '1900-01-01 00:00:00', D.tottime) AS IdleSeconds
FROM Machine_IdleEntryDet D INNER JOIN Machine_IdleEntryMas M ON D.prodid = M.prodid WHERE M.proddate BETWEEN ? AND ? AND M.deleted = 0 AND D.deleted = 0
UNION ALL
SELECT P.proddate, P.shift, P.macno, N'Production Idle Time', ISNULL(P.accidletimesecs, 0) + ISNULL(P.nonaccidletimesecs, 0)
FROM ProductionEntry P WHERE P.proddate BETWEEN ? AND ? AND P.deleted = 0
UNION ALL
SELECT C.entrydate, C.shift, C.macno, N'Conv Production Idle Time', DATEDIFF(SECOND, '1900-01-01 00:00:00', C.IdleTime)
FROM ConvProductionEntry C WHERE C.entrydate BETWEEN ? AND ? AND C.deleted = 0
UNION ALL
SELECT R.entrydate, R.shift, R.macno, N'Conv Rod Idle Time', DATEDIFF(SECOND, '1900-01-01 00:00:00', R.IdleTime)
FROM ConvProductionEntryRod R WHERE R.entrydate BETWEEN ? AND ? AND R.deleted = 0
"""

_PA_IDLE_COLORS = ["#2563eb","#f97316","#10b981","#8b5cf6","#06b6d4","#ec4899","#f59e0b","#6366f1","#ef4444","#84cc16","#14b8a6","#a855f7","#fb923c","#22d3ee","#4ade80","#f43f5e"]
_PA_NON_ACC_COLORS = ["#ef4444","#f97316","#f59e0b","#dc2626","#e11d48","#b91c1c","#fb923c","#d97706","#c2410c","#9a3412"]

def _pa_fmt_hms(total_seconds):
    secs = int(total_seconds or 0)
    h, rem = divmod(secs, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}"

@api_view(["GET"])
def production_idle_breakdown(request):
    conn = None
    try:
        try:
            conn, tenant = get_tenant_connection(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=401)

        from_date = request.query_params.get("from")
        to_date   = request.query_params.get("to")
        if not from_date or not to_date:
            return Response({"status": "error", "message": "from and to required", "data": {}}, status=400)
        try:
            datetime.strptime(from_date, "%Y-%m-%d")
            datetime.strptime(to_date,   "%Y-%m-%d")
        except ValueError:
            return Response({"status": "error", "message": "Invalid date format. Use YYYY-MM-DD", "data": {}}, status=400)

        import logging
        logger = logging.getLogger(__name__)
        cursor = conn.cursor()
        date_params = [from_date, to_date] * 4
        has_idle_reasons = table_exists(cursor, "IdleReasons")
        has_mac_master   = table_exists(cursor, "MacMaster")

        # Step 1: Classify idle seconds via IdleReasons.IsAccept (exact match to idle_time_report logic)
        if has_idle_reasons:
            classify_sql = f"""
            SELECT
                ISNULL(SUM(CASE WHEN IR.IdleID IS NOT NULL AND ISNULL(IR.IsAccept, 0) = 1 THEN A.IdleSeconds ELSE 0 END), 0) AS AccSecs,
                ISNULL(SUM(CASE WHEN IR.IdleID IS NULL OR ISNULL(IR.IsAccept, 0) = 0 THEN A.IdleSeconds ELSE 0 END), 0) AS NaSecs
            FROM ({_PA_IDLE_UNION_SQL}) A
            LEFT JOIN IdleReasons IR
                ON LTRIM(RTRIM(CAST(A.Reason AS NVARCHAR(512)))) = LTRIM(RTRIM(CAST(IR.IdleReasons AS NVARCHAR(512))))
                AND ISNULL(IR.deleted, 0) = 0
            """
        else:
            classify_sql = f"SELECT 0 AS AccSecs, ISNULL(SUM(A.IdleSeconds), 0) AS NaSecs FROM ({_PA_IDLE_UNION_SQL}) A"

        cursor.execute(classify_sql, date_params)
        row = cursor.fetchone()
        acc_secs = int(row[0] or 0) if row else 0
        na_secs  = int(row[1] or 0) if row else 0
        total_secs = acc_secs + na_secs

        # Step 2: Fetch RatePerHr & per-machine idle for loss calculation
        mac_rate = {}
        mac_idle = {}
        if has_mac_master:
            try:
                cursor.execute("SELECT LTRIM(RTRIM(CAST(macno AS NVARCHAR(512)))), ISNULL(RatePerHr, 0) FROM MacMaster WHERE ISNULL(deleted, 0) = 0")
                for mn, rate in (cursor.fetchall() or []):
                    if mn: mac_rate[str(mn).strip()] = float(rate or 0)
            except: pass
            try:
                mac_idle_sql = f"SELECT LTRIM(RTRIM(CAST(A.MacNo AS NVARCHAR(512)))), SUM(A.IdleSeconds) FROM ({_PA_IDLE_UNION_SQL}) A WHERE LTRIM(RTRIM(CAST(A.MacNo AS NVARCHAR(512)))) <> N'' GROUP BY LTRIM(RTRIM(CAST(A.MacNo AS NVARCHAR(512))))"
                cursor.execute(mac_idle_sql, date_params)
                for mn, secs in (cursor.fetchall() or []):
                    if mn: mac_idle[str(mn).strip()] = int(secs or 0)
            except: pass

        # Step 3: Get reason-level breakdown for donut charts
        reason_sql = f"""
        SELECT LTRIM(RTRIM(CAST(A.Reason AS NVARCHAR(512)))), SUM(A.IdleSeconds)
        FROM ({_PA_IDLE_UNION_SQL}) A
        WHERE LTRIM(RTRIM(CAST(A.Reason AS NVARCHAR(512)))) <> N''
        GROUP BY LTRIM(RTRIM(CAST(A.Reason AS NVARCHAR(512))))
        ORDER BY SUM(A.IdleSeconds) DESC
        """
        cursor.execute(reason_sql, date_params)
        reason_rows = cursor.fetchall() or []

        # Map reasons to IsAccept flag
        reason_map = {}
        if has_idle_reasons:
            cursor.execute("SELECT LTRIM(RTRIM(CAST(IdleReasons AS NVARCHAR(512)))), ISNULL(IsAccept, 0) FROM IdleReasons WHERE ISNULL(deleted, 0) = 0")
            for r, acc in (cursor.fetchall() or []):
                if r: reason_map[str(r).strip()] = int(acc or 0)

        accepted_reasons = []
        non_accepted_reasons = []
        total_mac_secs = sum(mac_idle.values()) or 1
        weighted_avg_rate = (sum(mac_idle.get(mn, 0) * mac_rate.get(mn, 0.0) for mn in mac_idle) / total_mac_secs) if mac_rate else 0.0

        for reason, secs in reason_rows:
            r = (str(reason).strip() if reason else "") or "(blank)"
            s = int(secs or 0)
            is_acc = reason_map.get(r, 0) == 1
            hours = round(s / 3600.0, 2)
            display = _pa_fmt_hms(s)
            entry = {"reason": r, "hours": hours, "display": display, "pct": 0.0}

            if is_acc:
                accepted_reasons.append(entry)
            else:
                entry["rate_per_hr"] = round(weighted_avg_rate, 2)
                entry["loss_value"] = round(hours * weighted_avg_rate)
                non_accepted_reasons.append(entry)

        # Calculate totals & percentages
        acc_total = sum(int(round(r["hours"] * 3600)) for r in accepted_reasons)
        na_total  = sum(int(round(r["hours"] * 3600)) for r in non_accepted_reasons)
        for i, r in enumerate(accepted_reasons):
            r["pct"] = round((r["hours"] * 3600 / acc_total * 100), 1) if acc_total > 0 else 0.0
            r["color"] = _PA_IDLE_COLORS[i % len(_PA_IDLE_COLORS)]
        for i, r in enumerate(non_accepted_reasons):
            r["pct"] = round((r["hours"] * 3600 / na_total * 100), 1) if na_total > 0 else 0.0
            r["color"] = _PA_NON_ACC_COLORS[i % len(_PA_NON_ACC_COLORS)]

        total_loss = sum(r.get("loss_value", 0) for r in non_accepted_reasons)
        acc_pct = round(acc_secs / total_secs * 100, 1) if total_secs > 0 else 0.0
        na_pct  = round(na_secs  / total_secs * 100, 1) if total_secs > 0 else 0.0

        return Response({
            "status": "success",
            "accepted": {
                "total_hours": round(acc_secs / 3600.0, 2),
                "total_display": _pa_fmt_hms(acc_secs),
                "reasons": accepted_reasons
            },
            "non_accepted": {
                "total_hours": round(na_secs / 3600.0, 2),
                "total_display": _pa_fmt_hms(na_secs),
                "total_loss": round(total_loss),
                "reasons": non_accepted_reasons
            },
            "summary": {
                "accepted_pct": acc_pct,
                "non_accepted_pct": na_pct,
                "chart_hours": [round(acc_secs / 3600.0, 2), round(na_secs / 3600.0, 2)]
            },
            "dateRange": {"from": from_date, "to": to_date}
        })
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"production_idle_breakdown error: {e}", exc_info=True)
        return Response({"status": "error", "message": str(e), "data": {}}, status=500)
    finally:
        if conn:
            try: conn.close()
            except: pass

# ─────────────────────────────────────────────────────────────────────────────
# Daily Production Details
# Returns row-level shift records for a given date (or date range).
# ─────────────────────────────────────────────────────────────────────────────
@api_view(["GET"])
def daily_production_details(request):
    conn = None
    try:
        try:
            conn, tenant = get_tenant_connection(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=401)

        from_date = request.query_params.get("from", None)
        to_date   = request.query_params.get("to",   None)

        if not from_date or not to_date:
            return Response({"status": "error", "message": "from and to date parameters are required", "data": []}, status=400)

        try:
            datetime.strptime(from_date, "%Y-%m-%d")
            datetime.strptime(to_date,   "%Y-%m-%d")
        except ValueError:
            return Response({"status": "error", "message": "Invalid date format. Use YYYY-MM-DD", "data": []}, status=400)

        import logging
        logger = logging.getLogger(__name__)

        sql = """
;WITH RejData AS
(
    SELECT
        CAST(prodid AS VARCHAR(50)) AS RefNo,
        SUM(ISNULL(rejqty,0)) AS RejQty
    FROM InterInspectionEntry
    WHERE deleted = 0
    GROUP BY prodid
),

ProductionEntryData AS
(
    SELECT
        CAST(PE.prodid AS VARCHAR(50)) AS RefNo,
        PE.proddate AS ProdDate,
        PE.macno AS Machine,
        PE.shift,
        PE.oprname AS OperatorName,
        PN.partno AS PartNo,
        PD.process AS ProcessName,

        CASE
            WHEN DATEDIFF(SECOND,'1900-01-01',PN.cycletime) > 0
            THEN CAST(
                (
                    CASE
                        WHEN PE.runto >= PE.runfrom
                        THEN DATEDIFF(SECOND,PE.runfrom,PE.runto)
                        ELSE DATEDIFF(SECOND,PE.runfrom,DATEADD(DAY,1,PE.runto))
                    END
                )
                /
                NULLIF(DATEDIFF(SECOND,'1900-01-01',PN.cycletime), 0)
            AS DECIMAL(18,0))
            ELSE 0
        END AS TargetQty,

        ISNULL(PE.okqty,0) AS OKQty,
        ISNULL(PE.OPREFF,0) AS EffPct,
        ISNULL(PE.OEENEW,0) AS OEEPct

    FROM ProductionEntry PE

    INNER JOIN ProgramNo PN
        ON PE.prgno = PN.prgno
       AND PE.macno = PN.macno
       AND PN.deleted = 0

    LEFT JOIN ProcessDet PD
        ON PN.process = PD.pcode
       AND PD.deleted = 0

    WHERE PE.deleted = 0
      AND CAST(PE.proddate AS DATE) BETWEEN ? AND ?
),

ConvProductionData AS
(
    SELECT
        CAST(CPE.entryno AS VARCHAR(50)) AS RefNo,
        CPE.entrydate AS ProdDate,
        CPE.macno AS Machine,
        CPE.shift,
        CPE.oprname AS OperatorName,
        CPE.partno AS PartNo,
        PD.process AS ProcessName,

        CAST(
            (ISNULL(CPE.runtimesecs,0) / 3600.0)
            * ISNULL(PT.qtyperhour,0)
        AS DECIMAL(18,0)) AS TargetQty,

        ISNULL(CPE.qty,0) AS OKQty,
        ISNULL(CPE.eff,0) AS EffPct,
        ISNULL(CPE.OEENEW,0) AS OEEPct

    FROM ConvProductionEntry CPE

    LEFT JOIN ProcessDet PD
        ON CPE.process = PD.pcode
       AND PD.deleted = 0

    LEFT JOIN ProcessTime PT
        ON CPE.partno = PT.partno
       AND CPE.process = PT.process
       AND CPE.macno = PT.macno
       AND PT.deleted = 0

    WHERE CPE.deleted = 0
      AND CAST(CPE.entrydate AS DATE) BETWEEN ? AND ?
),

ConvRodData AS
(
    SELECT
        CAST(CPR.entryno AS VARCHAR(50)) AS RefNo,
        CPR.entrydate AS ProdDate,
        CPR.macno AS Machine,
        CPR.shift,
        CPR.oprname AS OperatorName,
        CPR.partno AS PartNo,
        PD.process AS ProcessName,

        CAST(
            (ISNULL(CPR.runtimesecs,0) / 3600.0)
            * ISNULL(PT.qtyperhour,0)
        AS DECIMAL(18,0)) AS TargetQty,

        ISNULL(CPR.qty,0) AS OKQty,
        ISNULL(CPR.OAEFF,0) AS EffPct,
        ISNULL(CPR.OEENEW,0) AS OEEPct

    FROM ConvProductionEntryRod CPR

    LEFT JOIN ProcessDet PD
        ON CPR.process = PD.pcode
       AND PD.deleted = 0

    LEFT JOIN ProcessTime PT
        ON CPR.partno = PT.partno
       AND CPR.process = PT.process
       AND CPR.macno = PT.macno
       AND PT.deleted = 0

    WHERE CPR.deleted = 0
      AND CAST(CPR.entrydate AS DATE) BETWEEN ? AND ?
),

FinalData AS
(
    SELECT * FROM ProductionEntryData
    UNION ALL
    SELECT * FROM ConvProductionData
    UNION ALL
    SELECT * FROM ConvRodData
)

SELECT
    ROW_NUMBER() OVER (
        ORDER BY F.ProdDate DESC, F.Machine, F.Shift
    ) AS [SNo],

    CONVERT(date, F.ProdDate) AS [Date],
    F.Machine,
    F.Shift,
    F.OperatorName AS [Operator],
    F.PartNo AS [Part],
    ISNULL(F.ProcessName,'') AS [Process],
    ISNULL(F.TargetQty,0) AS [Target],
    ISNULL(F.OKQty,0) AS [OKQty],
    ISNULL(R.RejQty,0) AS [Rej],
    CAST(F.EffPct AS DECIMAL(18,2)) AS [EffPct],
    CAST(F.OEEPct AS DECIMAL(18,2)) AS [OEEPct],

    CASE
        WHEN ISNULL(R.RejQty,0) > 0 THEN 'Rejected'
        ELSE 'OK'
    END AS [Status]

FROM FinalData F

LEFT JOIN RejData R ON F.RefNo = R.RefNo

ORDER BY F.ProdDate DESC, F.Machine, F.Shift;
        """

        # 3 date-pair parameters (one for each CTE source table)
        params = [from_date, to_date, from_date, to_date, from_date, to_date]

        cur = conn.cursor()
        try:
            cur.execute(sql, params)
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
        except Exception as qe:
            logger.error(f"daily_production_details query error: {qe}", exc_info=True)
            return Response({"status": "error", "message": str(qe), "data": []}, status=500)
        finally:
            cur.close()

        data = []
        for row in rows:
            record = dict(zip(columns, row))
            # Serialize date to ISO string
            prod_date = record.get("Date")
            if prod_date is not None:
                try:
                    record["Date"] = prod_date.isoformat()
                except AttributeError:
                    record["Date"] = str(prod_date)
            # Ensure numeric types are JSON-safe
            for key in ["Target", "OKQty", "Rej", "EffPct", "OEEPct"]:
                v = record.get(key)
                if v is not None:
                    record[key] = float(v) if key in ("EffPct", "OEEPct") else int(v)
                else:
                    record[key] = 0
            data.append(record)

        return Response({
            "status": "success",
            "message": "Daily Production Details fetched successfully",
            "data": data,
            "dateRange": {"from": from_date, "to": to_date},
            "count": len(data)
        })

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"daily_production_details error: {e}", exc_info=True)
        return Response({"status": "error", "message": str(e), "data": []}, status=500)
    finally:
        if conn:
            try: conn.close()
            except: pass