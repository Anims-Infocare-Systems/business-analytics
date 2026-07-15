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
            "machineRejection": 0.0,
            "totCncMac": 0,
            "totConvMac": 0,
            "machines": []
        }
        import logging
        logger = logging.getLogger(__name__)

        # Prepare filters and temp tables
        cursor = conn.cursor()
        try:
            _prepare_filtered_temp_tables(cursor, request, from_date, to_date)
            mac_filter_sql, mac_filter_params, shift_filter_sql, shift_filter_params = _get_mac_filter_sql(request, cursor)
            mac_filter_sql_alias, _, _, _ = _get_mac_filter_sql(request, cursor, table_alias="M")
        finally:
            cursor.close()

        # Build idle filter for Query 7
        idle_filters = []
        idle_params = [from_date, to_date]
        machine_raw = request.query_params.get("machine", "")
        shift_raw = request.query_params.get("shift", "")
        mac_type = request.query_params.get("mac_type", "")
        mac_group = request.query_params.get("mac_group", "")
        from .views_idle_time_report import _parse_machine, _parse_shift, _resolve_shift_db_name
        machine = _parse_machine(machine_raw)
        shift_parsed = _parse_shift(shift_raw)
        
        cursor = conn.cursor()
        try:
            shift = _resolve_shift_db_name(cursor, shift_parsed) if shift_parsed else None
        finally:
            cursor.close()

        if machine:
            placeholders = ",".join(["?"] * len(machine))
            idle_filters.append(f"AND D.MacNo IN ({placeholders})")
            idle_params.extend(machine)
        if shift:
            idle_filters.append("AND D.Shift = ?")
            idle_params.append(shift)
        if mac_type:
            idle_filters.append("AND D.MacNo LIKE ?")
            idle_params.append(f"%{mac_type}%")
        if mac_group:
            if mac_group == "Turning":
                idle_filters.append("AND D.MacNo LIKE '%TC%'")
            elif mac_group == "Milling":
                idle_filters.append("AND D.MacNo LIKE '%VMC%'")
            elif mac_group == "Drilling":
                idle_filters.append("AND D.MacNo LIKE '%SPM%'")
            elif mac_group == "Other":
                idle_filters.append("AND D.MacNo NOT LIKE '%TC%' AND D.MacNo NOT LIKE '%VMC%' AND D.MacNo NOT LIKE '%SPM%'")
        idle_filter_sql = " ".join(idle_filters)

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
            SELECT COALESCE(okqty, 0) AS Qty FROM ProductionEntry WHERE prodid IN (SELECT prodid FROM #FilteredPE)
            UNION ALL
            SELECT COALESCE(qty, 0) AS Qty FROM ConvProductionEntry WHERE entryno IN (SELECT entryno FROM #FilteredCPE)
            UNION ALL
            SELECT COALESCE(qty, 0) AS Qty FROM ConvProductionEntryRod WHERE entryno IN (SELECT entryno FROM #FilteredCPR)
        ) AS A
        """
        row = run_query(total_prod_query)
        if row and row[0] is not None: result["totalProductionQty"] = int(row[0])

        # ── Query 2: OK / Accepted Qty ────────────────────────────────
        ok_qty_query = """
        SELECT COALESCE(SUM(InspOkQty), 0) AS TotalInspectionOkQty
        FROM (
            SELECT COALESCE((SELECT SUM(COALESCE(I.okqty, 0)) FROM InterInspectionEntry I WHERE I.prodid = P.prodid AND I.deleted = 0), 0) AS InspOkQty
            FROM ProductionEntry P WHERE P.prodid IN (SELECT prodid FROM #FilteredPE)
            UNION ALL SELECT 0 AS InspOkQty FROM ConvProductionEntry C WHERE C.entryno IN (SELECT entryno FROM #FilteredCPE)
            UNION ALL SELECT 0 AS InspOkQty FROM ConvProductionEntryRod R WHERE R.entryno IN (SELECT entryno FROM #FilteredCPR)
        ) AS A
        """
        row = run_query(ok_qty_query)
        if row and row[0] is not None: result["okAcceptedQty"] = int(row[0])

        # ── Query 3: Rejection Qty ────────────────────────────────────
        rej_qty_query = """
        SELECT COALESCE(SUM(RejQty), 0) AS TotalRejectionQty
        FROM (
            SELECT COALESCE((SELECT SUM(COALESCE(RJ.qty, 0)) FROM InterInspectionEntry I INNER JOIN Insp_RejectionEntry RJ ON I.inter_inspno = RJ.inter_inspno WHERE I.prodid = P.prodid AND I.deleted = 0 AND RJ.deleted = 0), 0) AS RejQty
            FROM ProductionEntry P WHERE P.prodid IN (SELECT prodid FROM #FilteredPE)
            UNION ALL SELECT 0 AS RejQty FROM ConvProductionEntry C WHERE C.entryno IN (SELECT entryno FROM #FilteredCPE)
            UNION ALL SELECT 0 AS RejQty FROM ConvProductionEntryRod R WHERE R.entryno IN (SELECT entryno FROM #FilteredCPR)
        ) AS A
        """
        row = run_query(rej_qty_query)
        if row and row[0] is not None: result["rejectionQty"] = int(row[0])

        # ── Query 4: Overall OEE ──────────────────────────────────────
        oee_query = """
        SELECT CAST(AVG(ISNULL(OEENEW,0)) AS DECIMAL(18,2)) AS Overall_OEENEW
        FROM (
            SELECT OEENEW FROM ProductionEntry WHERE prodid IN (SELECT prodid FROM #FilteredPE)
            UNION ALL SELECT OEENEW FROM ConvProductionEntry WHERE entryno IN (SELECT entryno FROM #FilteredCPE)
            UNION ALL SELECT OEENEW FROM ConvProductionEntryRod WHERE entryno IN (SELECT entryno FROM #FilteredCPR)
        ) A
        """
        row = run_query(oee_query)
        if row and row[0] is not None: result["overallOee"] = float(row[0])

        # ── Query 5: Production Hours ─────────────────────────────────
        hours_query = """
        SELECT CAST(SUM(TotalRunSeconds) / 3600.0 AS DECIMAL(18,2)) AS TotalHours
        FROM (
            SELECT DATEDIFF(SECOND, runfrom, runto) AS TotalRunSeconds FROM ProductionEntry WHERE prodid IN (SELECT prodid FROM #FilteredPE) AND runfrom IS NOT NULL AND runto IS NOT NULL
            UNION ALL SELECT DATEDIFF(SECOND, starttime, endtime) AS TotalRunSeconds FROM ConvProductionEntry WHERE entryno IN (SELECT entryno FROM #FilteredCPE) AND starttime IS NOT NULL AND endtime IS NOT NULL
            UNION ALL SELECT DATEDIFF(SECOND, starttime, endtime) AS TotalRunSeconds FROM ConvProductionEntryRod WHERE entryno IN (SELECT entryno FROM #FilteredCPR) AND starttime IS NOT NULL AND endtime IS NOT NULL
        ) A
        """
        row = run_query(hours_query)
        if row and row[0] is not None: result["productionHours"] = float(row[0])

        # ── Query 6: Total Machine Hours ──────────────────────────────
        total_machine_hours_query = f"""
        SELECT CAST((COUNT(DISTINCT M.macno) * SUM(
            (CASE WHEN S.etime1 < S.stime1 THEN DATEDIFF(SECOND, S.stime1, DATEADD(DAY,1,S.etime1)) ELSE DATEDIFF(SECOND, S.stime1, S.etime1) END) +
            (CASE WHEN S.etime2 < S.stime2 THEN DATEDIFF(SECOND, S.stime2, DATEADD(DAY,1,S.etime2)) ELSE DATEDIFF(SECOND, S.stime2, S.etime2) END)
        )) / 3600.0 AS DECIMAL(18,2)) AS TotalMachineHours
        FROM Shift S CROSS JOIN (SELECT macno FROM MacMaster WHERE deleted = 0 AND ISNULL(IsNonActive,0) = 0 {mac_filter_sql}) M
        WHERE S.deleted = 0 {shift_filter_sql}
        """
        row = run_query(total_machine_hours_query, mac_filter_params + shift_filter_params)
        if row and row[0] is not None: result["totalMachineHours"] = float(row[0])

        # ── Query 7: Total Idle Hours ─────────────────────────────────
        idle_hours_query = f"""
        SELECT CAST(SUM(A.IdleSeconds) / 3600.0 AS DECIMAL(18,2)) AS TotalIdleHours
        FROM (
            SELECT DATEDIFF(SECOND, '1900-01-01 00:00:00', D.tottime) AS IdleSeconds FROM Machine_IdleEntryDet D INNER JOIN Machine_IdleEntryMas M ON D.prodid = M.prodid WHERE M.proddate BETWEEN ? AND ? AND M.deleted = 0 AND D.deleted = 0 {idle_filter_sql}
            UNION ALL SELECT ISNULL(P.accidletimesecs,0) + ISNULL(P.nonaccidletimesecs,0) AS IdleSeconds FROM ProductionEntry P WHERE P.prodid IN (SELECT prodid FROM #FilteredPE)
            UNION ALL SELECT DATEDIFF(SECOND, '1900-01-01 00:00:00', C.IdleTime) AS IdleSeconds FROM ConvProductionEntry C WHERE C.entryno IN (SELECT entryno FROM #FilteredCPE)
            UNION ALL SELECT DATEDIFF(SECOND, '1900-01-01 00:00:00', R.IdleTime) AS IdleSeconds FROM ConvProductionEntryRod R WHERE R.entryno IN (SELECT entryno FROM #FilteredCPR)
        ) A
        """
        row = run_query(idle_hours_query, idle_params)
        if row and row[0] is not None: result["idleHours"] = float(row[0])

        # ── Query 8: Total Setting Hours ──────────────────────────────
        setting_hours_query = """
        SELECT CAST(SUM(SettingSeconds) / 3600.0 AS DECIMAL(18,2)) AS TotalSettingHours
        FROM (
            SELECT CASE WHEN setto < setfrom THEN DATEDIFF(SECOND, setfrom, DATEADD(DAY,1,setto)) ELSE DATEDIFF(SECOND, setfrom, setto) END AS SettingSeconds FROM ProductionEntry WHERE prodid IN (SELECT prodid FROM #FilteredPE) AND setfrom IS NOT NULL AND setto IS NOT NULL
            UNION ALL SELECT CASE WHEN setto < setfrom THEN DATEDIFF(SECOND, setfrom, DATEADD(DAY,1,setto)) ELSE DATEDIFF(SECOND, setfrom, setto) END AS SettingSeconds FROM ConvProductionEntry WHERE entryno IN (SELECT entryno FROM #FilteredCPE) AND setfrom IS NOT NULL AND setto IS NOT NULL
            UNION ALL SELECT CASE WHEN setto < setfrom THEN DATEDIFF(SECOND, setfrom, DATEADD(DAY,1,setto)) ELSE DATEDIFF(SECOND, setfrom, setto) END AS SettingSeconds FROM ConvProductionEntryRod WHERE entryno IN (SELECT entryno FROM #FilteredCPR) AND setfrom IS NOT NULL AND setto IS NOT NULL
        ) A
        """
        row = run_query(setting_hours_query)
        if row and row[0] is not None: result["settingHours"] = float(row[0])

        # ── Query 9: Man Efficiency ───────────────────────────────────
        man_efficiency_query = """
        SELECT CAST(AVG(ISNULL(OPREFF,0)) AS DECIMAL(18,2)) AS Overall_ManEfficiency
        FROM (
            SELECT OPREFF FROM ProductionEntry WHERE prodid IN (SELECT prodid FROM #FilteredPE) AND OPREFF IS NOT NULL
            UNION ALL SELECT eff FROM ConvProductionEntry WHERE entryno IN (SELECT entryno FROM #FilteredCPE) AND eff IS NOT NULL
            UNION ALL SELECT EFF FROM ConvProductionEntryRod WHERE entryno IN (SELECT entryno FROM #FilteredCPR) AND EFF IS NOT NULL
        ) A
        """
        row = run_query(man_efficiency_query)
        if row and row[0] is not None: result["manEfficiency"] = float(row[0])

        # ── Query 10: Daily Production Summary ───────────────────────
        shift_summary_query = """
        SELECT COUNT(*) AS TotalShifts, CAST(AVG(CAST(ShiftQty AS FLOAT)) AS DECIMAL(18,2)) AS AvgProdPerShift, MAX(ShiftQty) AS PeakShiftOutput, MIN(ShiftQty) AS LowestShiftOutput
        FROM (
            SELECT P.shift, P.proddate, SUM(ISNULL(P.okqty,0)) AS ShiftQty FROM ProductionEntry P WHERE P.prodid IN (SELECT prodid FROM #FilteredPE) GROUP BY P.shift, P.proddate
            UNION ALL SELECT C.shift, C.entrydate, SUM(ISNULL(C.qty,0)) AS ShiftQty FROM ConvProductionEntry C WHERE C.entryno IN (SELECT entryno FROM #FilteredCPE) GROUP BY C.shift, C.entrydate
            UNION ALL SELECT R.shift, R.entrydate, SUM(ISNULL(R.qty,0)) AS ShiftQty FROM ConvProductionEntryRod R WHERE R.entryno IN (SELECT entryno FROM #FilteredCPR) GROUP BY R.shift, R.entrydate
        ) AS AllShifts
        """
        row = run_query(shift_summary_query)
        if row:
            result["totalShifts"]       = int(row[0] or 0)
            result["avgProdPerShift"]   = float(row[1] or 0)
            result["peakShiftOutput"]   = int(row[2] or 0)
            result["lowestShiftOutput"] = int(row[3] or 0)

        active_mac_query = """
        SELECT COUNT(DISTINCT macno) AS ActiveMachines
        FROM (
            SELECT macno FROM ProductionEntry WHERE prodid IN (SELECT prodid FROM #FilteredPE) AND macno IS NOT NULL
            UNION SELECT macno FROM ConvProductionEntry WHERE entryno IN (SELECT entryno FROM #FilteredCPE) AND macno IS NOT NULL
            UNION SELECT macno FROM ConvProductionEntryRod WHERE entryno IN (SELECT entryno FROM #FilteredCPR) AND macno IS NOT NULL
        ) AS ActiveMacs
        """
        row = run_query(active_mac_query)
        active_count = int(row[0] or 0) if row else 0
        result["activeMachines"] = active_count

        total_mac_query = "SELECT COUNT(*) FROM MacMaster WHERE deleted = 0 AND ISNULL(IsNonActive,0) = 0" + mac_filter_sql
        row = run_query(total_mac_query, mac_filter_params)
        total_mac = int(row[0] or 0) if row else 0
        result["idleMachines"] = max(total_mac - active_count, 0)

        # ── Query for CNC and Conventional machine counts ─────────────
        cnc_mac_query = "SELECT SUM(CASE WHEN cnc = 1 THEN 1 ELSE 0 END) AS TotCncMac, SUM(CASE WHEN cnc = 0 OR cnc IS NULL THEN 1 ELSE 0 END) AS TotConvMac FROM MacMaster WHERE deleted = 0 AND ISNULL(IsNonActive, 0) = 0" + mac_filter_sql
        row = run_query(cnc_mac_query, mac_filter_params)
        if row:
            result["totCncMac"] = int(row[0] or 0)
            result["totConvMac"] = int(row[1] or 0)

        # ── Query for all active/deleted=0 machines from MacMaster ─────
        machines_query = f"""
        WITH MachineMetrics AS
        (
            SELECT
                MacNo,
                AVG(CAST(OEE AS FLOAT)) AS AvgOEE,
                AVG(CAST(OperEff AS FLOAT)) AS AvgEff
            FROM (
                SELECT macno, OEENEW AS OEE, OPREFF AS OperEff FROM ProductionEntry WHERE prodid IN (SELECT prodid FROM #FilteredPE)
                UNION ALL
                SELECT macno, OAEFF AS OEE, eff AS OperEff FROM ConvProductionEntry WHERE entryno IN (SELECT entryno FROM #FilteredCPE)
                UNION ALL
                SELECT macno, OAEFF AS OEE, eff AS OperEff FROM ConvProductionEntryRod WHERE entryno IN (SELECT entryno FROM #FilteredCPR)
            ) A
            GROUP BY MacNo
        ),
        MachineRunDetails AS
        (
            SELECT macno, RunTimeSecs, ShiftTimeSecs, IdleTimeSecs FROM (
                SELECT 
                    macno, 
                    CASE WHEN runto < runfrom THEN DATEDIFF(SECOND, runfrom, DATEADD(DAY, 1, runto)) ELSE DATEDIFF(SECOND, runfrom, runto) END AS RunTimeSecs,
                    COALESCE(NULLIF(shifttimesecs, 0), 28800) AS ShiftTimeSecs,
                    ISNULL(CASE WHEN SQL_VARIANT_PROPERTY(PE.idlTime, 'BaseType') IN ('datetime','time') THEN DATEDIFF(SECOND, 0, PE.idlTime) ELSE CAST(PE.idlTime AS INT) END, 0) AS IdleTimeSecs
                FROM ProductionEntry PE
                WHERE PE.prodid IN (SELECT prodid FROM #FilteredPE) AND macno IS NOT NULL
                
                UNION ALL
                
                SELECT 
                    macno, 
                    runtimesecs AS RunTimeSecs,
                    COALESCE(NULLIF(shifttimesecs, 0), 28800) AS ShiftTimeSecs,
                    DATEDIFF(SECOND, 0, IdleTime) AS IdleTimeSecs
                FROM ConvProductionEntry 
                WHERE entryno IN (SELECT entryno FROM #FilteredCPE) AND macno IS NOT NULL
                
                UNION ALL
                
                SELECT 
                    macno, 
                    runtimesecs AS RunTimeSecs,
                    COALESCE(NULLIF(shifttimesecs, 0), 28800) AS ShiftTimeSecs,
                    DATEDIFF(SECOND, 0, IdleTime) AS IdleTimeSecs
                FROM ConvProductionEntryRod 
                WHERE entryno IN (SELECT entryno FROM #FilteredCPR) AND macno IS NOT NULL
            ) A
        ),
        MachineUtilizations AS
        (
            SELECT 
                macno,
                CASE 
                    WHEN SUM(CAST(ShiftTimeSecs AS FLOAT)) > 0 
                    THEN (SUM(CAST(RunTimeSecs AS FLOAT)) / SUM(CAST(ShiftTimeSecs AS FLOAT))) * 100.0
                    ELSE 0.0 
                END AS Utilization,
                SUM(CAST(RunTimeSecs AS FLOAT)) / 3600.0 AS RunningHrs,
                SUM(CAST(IdleTimeSecs AS FLOAT)) / 3600.0 AS IdleHrs
            FROM MachineRunDetails
            GROUP BY macno
        ),
        MachineProdQty AS
        (
            SELECT macno, SUM(ISNULL(qty, 0)) AS OkQty FROM (
                SELECT macno, okqty AS qty FROM ProductionEntry WHERE prodid IN (SELECT prodid FROM #FilteredPE) AND macno IS NOT NULL
                UNION ALL SELECT macno, qty FROM ConvProductionEntry WHERE entryno IN (SELECT entryno FROM #FilteredCPE) AND macno IS NOT NULL
                UNION ALL SELECT macno, ProdQty AS qty FROM ConvProductionEntryRod WHERE entryno IN (SELECT entryno FROM #FilteredCPR) AND macno IS NOT NULL
            ) A
            GROUP BY macno
        ),
        MachineRejQty AS
        (
            SELECT macno, SUM(RejQty) AS RejQty FROM (
                SELECT PE.macno, ISNULL(RJ.qty, 0) AS RejQty
                FROM Insp_RejectionEntry RJ
                INNER JOIN InterInspectionEntry I ON RJ.inter_inspno = I.inter_inspno
                INNER JOIN ProductionEntry PE ON I.prodid = PE.prodid
                WHERE PE.prodid IN (SELECT prodid FROM #FilteredPE) AND I.deleted = 0 AND RJ.deleted = 0 AND PE.macno IS NOT NULL
                
                UNION ALL
                
                SELECT macno, 0 AS RejQty FROM ConvProductionEntry WHERE entryno IN (SELECT entryno FROM #FilteredCPE) AND macno IS NOT NULL
                
                UNION ALL
                
                SELECT macno, ISNULL(ScrapQty, 0) AS RejQty FROM ConvProductionEntryRod WHERE entryno IN (SELECT entryno FROM #FilteredCPR) AND macno IS NOT NULL
            ) B
            GROUP BY macno
        ),
        MachineRwkQty AS
        (
            SELECT macno, SUM(RwkQty) AS RwkQty FROM (
                SELECT PE.macno, ISNULL(RW.qty, 0) AS RwkQty
                FROM Insp_ReworkEntry RW
                INNER JOIN InterInspectionEntry I ON RW.inter_inspno = I.inter_inspno
                INNER JOIN ProductionEntry PE ON I.prodid = PE.prodid
                WHERE PE.prodid IN (SELECT prodid FROM #FilteredPE) AND I.deleted = 0 AND RW.deleted = 0 AND PE.macno IS NOT NULL
                
                UNION ALL
                
                SELECT macno, ISNULL(Rework, 0) AS RwkQty FROM ConvProductionEntry WHERE entryno IN (SELECT entryno FROM #FilteredCPE) AND macno IS NOT NULL
                
                UNION ALL
                
                SELECT macno, 0 AS RwkQty FROM ConvProductionEntryRod WHERE entryno IN (SELECT entryno FROM #FilteredCPR) AND macno IS NOT NULL
            ) C
            GROUP BY macno
        ),
        MachineQualityDetails AS
        (
            SELECT 
                M.macno,
                ISNULL(P.OkQty, 0) AS OkQty,
                ISNULL(R.RejQty, 0) AS RejQty,
                ISNULL(W.RwkQty, 0) AS RwkQty,
                (ISNULL(P.OkQty, 0) + ISNULL(R.RejQty, 0) + ISNULL(W.RwkQty, 0)) AS ProdQty
            FROM (SELECT DISTINCT macno FROM MacMaster WHERE deleted = 0) M
            LEFT JOIN MachineProdQty P ON M.macno = P.macno
            LEFT JOIN MachineRejQty R ON M.macno = R.macno
            LEFT JOIN MachineRwkQty W ON M.macno = W.macno
        )
        SELECT 
            M.macno, 
            M.macname, 
            ISNULL(M.MacGroup, 'Other') AS MacGroup,
            COALESCE(MM.AvgOEE, 0.0) AS AvgOEE,
            COALESCE(MM.AvgEff, 0.0) AS AvgEff,
            COALESCE(MU.Utilization, 0.0) AS Utilization,
            COALESCE(MQ.ProdQty, 0) AS ProdQty,
            COALESCE(MQ.RejQty, 0) AS RejQty,
            COALESCE(MQ.RwkQty, 0) AS RwkQty,
            COALESCE(MU.RunningHrs, 0.0) AS RunningHrs,
            COALESCE(MU.IdleHrs, 0.0) AS IdleHrs
        FROM MacMaster M
        LEFT JOIN MachineMetrics MM ON M.macno = MM.macno
        LEFT JOIN MachineUtilizations MU ON M.macno = MU.macno
        LEFT JOIN MachineQualityDetails MQ ON M.macno = MQ.macno
        WHERE M.deleted = 0 {mac_filter_sql_alias}
        ORDER BY M.macnosortorder, M.macno
        """
        cur = conn.cursor()
        machines = []
        try:
            cur.execute(machines_query, mac_filter_params)
            rows = cur.fetchall()
            COLORS = ["#2563eb", "#059669", "#7c3aed", "#ea580c", "#0891b2", "#be185d", "#b45309", "#1d4ed8", "#065f46", "#6d28d9", "#0f766e", "#9f1239"]
            for idx, r in enumerate(rows or []):
                prod_qty = int(r[6] or 0)
                rej_qty = int(r[7] or 0)
                rw_qty = int(r[8] or 0)
                rej_pct = round((rej_qty / prod_qty * 100.0), 2) if prod_qty > 0 else 0.0
                rw_pct = round((rw_qty / prod_qty * 100.0), 2) if prod_qty > 0 else 0.0
                machines.append({
                    "name": r[0] if r[0] is not None else "",
                    "macname": r[1] if r[1] is not None else "",
                    "type": r[2] if r[2] is not None else "Other",
                    "color": COLORS[idx % len(COLORS)],
                    "oee": round(float(r[3] or 0.0), 2),
                    "oprEff": round(float(r[4] or 0.0), 2),
                    "utilization": round(float(r[5] or 0.0), 2),
                    "prodQty": prod_qty,
                    "rejQty": rej_qty,
                    "rwQty": rw_qty,
                    "rejPct": rej_pct,
                    "rwPct": rw_pct,
                    "runningHrs": round(float(r[9] or 0.0), 1),
                    "idleHrs": round(float(r[10] or 0.0), 1),
                })
        except Exception as mqe:
            logger.warning(f"Machines query error: {mqe}")
        finally:
            cur.close()
        result["machines"] = machines

        # ── Query 11: Machine & Operator Efficiency ───────────────────
        overall_util_query = """
        SELECT 
            CASE 
                WHEN SUM(CAST(ShiftTimeSecs AS FLOAT)) > 0 
                THEN (SUM(CAST(RunTimeSecs AS FLOAT)) / SUM(CAST(ShiftTimeSecs AS FLOAT))) * 100.0
                ELSE 0.0 
            END AS OverallUtilization
        FROM (
            SELECT 
                CASE WHEN runto < runfrom THEN DATEDIFF(SECOND, runfrom, DATEADD(DAY, 1, runto)) ELSE DATEDIFF(SECOND, runfrom, runto) END AS RunTimeSecs,
                COALESCE(NULLIF(shifttimesecs, 0), 28800) AS ShiftTimeSecs
            FROM ProductionEntry 
            WHERE prodid IN (SELECT prodid FROM #FilteredPE)
            
            UNION ALL
            
            SELECT 
                runtimesecs AS RunTimeSecs,
                COALESCE(NULLIF(shifttimesecs, 0), 28800) AS ShiftTimeSecs
            FROM ConvProductionEntry 
            WHERE entryno IN (SELECT entryno FROM #FilteredCPE)
            
            UNION ALL
            
            SELECT 
                runtimesecs AS RunTimeSecs,
                COALESCE(NULLIF(shifttimesecs, 0), 28800) AS ShiftTimeSecs
            FROM ConvProductionEntryRod 
            WHERE entryno IN (SELECT entryno FROM #FilteredCPR)
        ) A
        """
        row = run_query(overall_util_query)
        if row and row[0] is not None:
            result["machineUtilization"] = round(float(row[0]), 2)
        else:
            result["machineUtilization"] = 0.0
        mac_eff_query = """SELECT CAST(AVG(ISNULL(OAEFF,0)) AS DECIMAL(18,2)) AS MachineEfficiency FROM ProductionEntry WHERE prodid IN (SELECT prodid FROM #FilteredPE) AND OAEFF IS NOT NULL"""
        row = run_query(mac_eff_query)
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
        WHERE P.prodid IN (SELECT prodid FROM #FilteredPE) AND I.deleted = 0 AND RJ.deleted = 0
        """
        row = run_query(rej_breakdown_query)
        if row:
            result["materialRejection"] = float(row[0] or 0)
            result["machineRejection"]  = float(row[1] or 0)

        # ── Query 12: Month Wise OEE Trend ───────────────────────────
        oee_trend_query = """
        SELECT FORMAT(A.entrydate, 'MMM yy') AS MonthLabel,
               DATEPART(YEAR, A.entrydate) * 100 + DATEPART(MONTH, A.entrydate) AS YearMonth,
               AVG(CAST(A.OEENEW AS FLOAT)) AS AvgOEE
        FROM (
            SELECT proddate AS entrydate, OEENEW FROM ProductionEntry WHERE prodid IN (SELECT prodid FROM #FilteredPE) AND OEENEW IS NOT NULL
            UNION ALL SELECT entrydate, OEENEW FROM ConvProductionEntry WHERE entryno IN (SELECT entryno FROM #FilteredCPE) AND OEENEW IS NOT NULL
            UNION ALL SELECT entrydate, OEENEW FROM ConvProductionEntryRod WHERE entryno IN (SELECT entryno FROM #FilteredCPR) AND OEENEW IS NOT NULL
        ) A
        GROUP BY FORMAT(A.entrydate, 'MMM yy'), DATEPART(YEAR, A.entrydate) * 100 + DATEPART(MONTH, A.entrydate)
        ORDER BY YearMonth
        """
        oee_trend = {"labels": [], "data": []}
        try:
            cur = conn.cursor()
            cur.execute(oee_trend_query)
            oee_rows = cur.fetchall()
            for r in oee_rows or []:
                oee_trend["labels"].append(r[0] if r[0] is not None else "")
                oee_trend["data"].append(round(float(r[2] or 0.0), 2))
        except Exception as ote:
            logger.warning(f"OEE trend query error: {ote}")
        finally:
            if 'cur' in locals():
                try: cur.close()
                except: pass
        result["oeeTrend"] = oee_trend

        # ── Query 13: Machine Added Trend (based on effdate) ─────────
        mac_added_query = "SELECT macno, effdate FROM MacMaster WHERE deleted = 0 AND effdate IS NOT NULL " + mac_filter_sql + " ORDER BY effdate"
        mac_added_trend = {"labels": [], "counts": [], "machineList": []}
        try:
            cur = conn.cursor()
            cur.execute(mac_added_query, mac_filter_params)
            mac_rows = cur.fetchall()
            from collections import defaultdict
            added_by_month = defaultdict(list)
            for m_no, eff_date in mac_rows:
                if eff_date:
                    month_label = eff_date.strftime("%b %y")
                    added_by_month[month_label].append(m_no)
            
            # Sort the months chronologically
            sorted_added = sorted(added_by_month.items(), key=lambda x: datetime.strptime(x[0], "%b %y"))
            for month, macs in sorted_added:
                mac_added_trend["labels"].append(f"{month} ({macs[0]})")
                mac_added_trend["counts"].append(len(macs))
                mac_added_trend["machineList"].append(", ".join(macs))
        except Exception as mate:
            logger.warning(f"Machine added trend query error: {mate}")
        finally:
            if 'cur' in locals():
                try: cur.close()
                except: pass

        result["macAddedTrend"] = mac_added_trend

        # ── Query 14: Machine Efficiency% Trend (based on Operator Efficiency / EFF) ──
        eff_trend_query = """
        SELECT FORMAT(A.entrydate, 'MMM yy') AS MonthLabel,
               DATEPART(YEAR, A.entrydate) * 100 + DATEPART(MONTH, A.entrydate) AS YearMonth,
               AVG(CAST(A.OperEff AS FLOAT)) AS AvgEff
        FROM (
            SELECT proddate AS entrydate, OPREFF AS OperEff FROM ProductionEntry WHERE prodid IN (SELECT prodid FROM #FilteredPE) AND OPREFF IS NOT NULL
            UNION ALL SELECT entrydate, eff AS OperEff FROM ConvProductionEntry WHERE entryno IN (SELECT entryno FROM #FilteredCPE) AND eff IS NOT NULL
            UNION ALL SELECT entrydate, eff AS OperEff FROM ConvProductionEntryRod WHERE entryno IN (SELECT entryno FROM #FilteredCPR) AND eff IS NOT NULL
        ) A
        GROUP BY FORMAT(A.entrydate, 'MMM yy'), DATEPART(YEAR, A.entrydate) * 100 + DATEPART(MONTH, A.entrydate)
        ORDER BY YearMonth
        """
        eff_trend = {"labels": [], "data": []}
        try:
            cur = conn.cursor()
            cur.execute(eff_trend_query)
            eff_rows = cur.fetchall()
            for r in eff_rows or []:
                eff_trend["labels"].append(r[0] if r[0] is not None else "")
                eff_trend["data"].append(round(float(r[2] or 0.0), 2))
        except Exception as ete:
            logger.warning(f"EFF trend query error: {ete}")
        finally:
            if 'cur' in locals():
                try: cur.close()
                except: pass

        result["macEffTrend"] = eff_trend

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
# Helper functions for dynamic filters across Production Analysis
# ─────────────────────────────────────────────────────────────────────────────
def _prepare_filtered_temp_tables(cursor, request, from_date, to_date):
    """
    Creates and populates #FilteredPE, #FilteredCPE, and #FilteredCPR temp tables
    based on machine, shift, operator, mac_type, mac_group, and search filters.
    """
    try: cursor.execute("DROP TABLE #FilteredPE")
    except: pass
    try: cursor.execute("DROP TABLE #FilteredCPE")
    except: pass
    try: cursor.execute("DROP TABLE #FilteredCPR")
    except: pass

    cursor.execute("CREATE TABLE #FilteredPE (prodid INT PRIMARY KEY)")
    cursor.execute("CREATE TABLE #FilteredCPE (entryno NVARCHAR(100) PRIMARY KEY)")
    cursor.execute("CREATE TABLE #FilteredCPR (entryno NVARCHAR(100) PRIMARY KEY)")

    from .views_idle_time_report import _parse_machine, _parse_shift, _resolve_shift_db_name

    machine_raw = request.query_params.get("machine", "")
    shift_raw = request.query_params.get("shift", "")
    operator_raw = request.query_params.get("operator", "")
    mac_type = request.query_params.get("mac_type", "")
    mac_group = request.query_params.get("mac_group", "")
    search = request.query_params.get("search", "")

    machine = _parse_machine(machine_raw)
    shift_parsed = _parse_shift(shift_raw)
    shift = _resolve_shift_db_name(cursor, shift_parsed) if shift_parsed else None

    operator = None
    if operator_raw:
        op_val = operator_raw.strip()
        if op_val and op_val.lower() != "all operators":
            if "," in op_val:
                operator = [item.strip() for item in op_val.split(",") if item.strip()]
            else:
                operator = [op_val]

    # Build clauses for ProductionEntry (PE)
    pe_clauses = []
    pe_params = [from_date, to_date]

    if machine:
        placeholders = ",".join(["?"] * len(machine))
        pe_clauses.append(f"AND PE.macno IN ({placeholders})")
        pe_params.extend(machine)
    if shift:
        pe_clauses.append("AND PE.shift = ?")
        pe_params.append(shift)
    if operator:
        placeholders = ",".join(["?"] * len(operator))
        pe_clauses.append(f"AND PE.oprname IN ({placeholders})")
        pe_params.extend(operator)
    if mac_type:
        pe_clauses.append("AND PE.macno LIKE ?")
        pe_params.append(f"%{mac_type}%")
    if mac_group:
        if mac_group == "Turning":
            pe_clauses.append("AND PE.macno LIKE '%TC%'")
        elif mac_group == "Milling":
            pe_clauses.append("AND PE.macno LIKE '%VMC%'")
        elif mac_group == "Drilling":
            pe_clauses.append("AND PE.macno LIKE '%SPM%'")
        elif mac_group == "Other":
            pe_clauses.append("AND PE.macno NOT LIKE '%TC%' AND PE.macno NOT LIKE '%VMC%' AND PE.macno NOT LIKE '%SPM%'")
    if search:
        pe_clauses.append("AND (PN.partno LIKE ? OR PD.process LIKE ? OR PE.oprname LIKE ? OR PE.macno LIKE ?)")
        pe_params.extend([f"%{search}%"] * 4)

    pe_sql = """
    INSERT INTO #FilteredPE (prodid)
    SELECT PE.prodid
    FROM ProductionEntry PE
    LEFT JOIN ProgramNo PN ON PE.prgno = PN.prgno AND PE.macno = PN.macno AND PN.deleted = 0
    LEFT JOIN ProcessDet PD ON PN.process = PD.pcode AND PD.deleted = 0
    WHERE PE.deleted = 0 AND PE.proddate BETWEEN ? AND ?
    """ + " ".join(pe_clauses)
    cursor.execute(pe_sql, pe_params)

    # Build clauses for ConvProductionEntry (CPE)
    cpe_clauses = []
    cpe_params = [from_date, to_date]

    if machine:
        placeholders = ",".join(["?"] * len(machine))
        cpe_clauses.append(f"AND CPE.macno IN ({placeholders})")
        cpe_params.extend(machine)
    if shift:
        cpe_clauses.append("AND CPE.shift = ?")
        cpe_params.append(shift)
    if operator:
        placeholders = ",".join(["?"] * len(operator))
        cpe_clauses.append(f"AND CPE.oprname IN ({placeholders})")
        cpe_params.extend(operator)
    if mac_type:
        cpe_clauses.append("AND CPE.macno LIKE ?")
        cpe_params.append(f"%{mac_type}%")
    if mac_group:
        if mac_group == "Turning":
            cpe_clauses.append("AND CPE.macno LIKE '%TC%'")
        elif mac_group == "Milling":
            cpe_clauses.append("AND CPE.macno LIKE '%VMC%'")
        elif mac_group == "Drilling":
            cpe_clauses.append("AND CPE.macno LIKE '%SPM%'")
        elif mac_group == "Other":
            cpe_clauses.append("AND CPE.macno NOT LIKE '%TC%' AND CPE.macno NOT LIKE '%VMC%' AND CPE.macno NOT LIKE '%SPM%'")
    if search:
        cpe_clauses.append("AND (CPE.partno LIKE ? OR PD.process LIKE ? OR CPE.oprname LIKE ? OR CPE.macno LIKE ?)")
        cpe_params.extend([f"%{search}%"] * 4)

    cpe_sql = """
    INSERT INTO #FilteredCPE (entryno)
    SELECT CPE.entryno
    FROM ConvProductionEntry CPE
    LEFT JOIN ProcessDet PD ON CPE.process = PD.pcode AND PD.deleted = 0
    WHERE CPE.deleted = 0 AND CPE.entrydate BETWEEN ? AND ?
    """ + " ".join(cpe_clauses)
    cursor.execute(cpe_sql, cpe_params)

    # Build clauses for ConvProductionEntryRod (CPR)
    cpr_clauses = []
    cpr_params = [from_date, to_date]

    if machine:
        placeholders = ",".join(["?"] * len(machine))
        cpr_clauses.append(f"AND CPR.macno IN ({placeholders})")
        cpr_params.extend(machine)
    if shift:
        cpr_clauses.append("AND CPR.shift = ?")
        cpr_params.append(shift)
    if operator:
        placeholders = ",".join(["?"] * len(operator))
        cpr_clauses.append(f"AND CPR.oprname IN ({placeholders})")
        cpr_params.extend(operator)
    if mac_type:
        cpr_clauses.append("AND CPR.macno LIKE ?")
        cpr_params.append(f"%{mac_type}%")
    if mac_group:
        if mac_group == "Turning":
            cpr_clauses.append("AND CPR.macno LIKE '%TC%'")
        elif mac_group == "Milling":
            cpr_clauses.append("AND CPR.macno LIKE '%VMC%'")
        elif mac_group == "Drilling":
            cpr_clauses.append("AND CPR.macno LIKE '%SPM%'")
        elif mac_group == "Other":
            cpr_clauses.append("AND CPR.macno NOT LIKE '%TC%' AND CPR.macno NOT LIKE '%VMC%' AND CPR.macno NOT LIKE '%SPM%'")
    if search:
        cpr_clauses.append("AND (CPR.partno LIKE ? OR PD.process LIKE ? OR CPR.oprname LIKE ? OR CPR.macno LIKE ?)")
        cpr_params.extend([f"%{search}%"] * 4)

    cpr_sql = """
    INSERT INTO #FilteredCPR (entryno)
    SELECT CPR.entryno
    FROM ConvProductionEntryRod CPR
    LEFT JOIN ProcessDet PD ON CPR.process = PD.pcode AND PD.deleted = 0
    WHERE CPR.deleted = 0 AND CPR.entrydate BETWEEN ? AND ?
    """ + " ".join(cpr_clauses)
    cursor.execute(cpr_sql, cpr_params)


def _get_mac_filter_sql(request, cursor, table_alias=""):
    from .views_idle_time_report import _parse_machine, _parse_shift, _resolve_shift_db_name

    machine_raw = request.query_params.get("machine", "")
    shift_raw = request.query_params.get("shift", "")
    mac_type = request.query_params.get("mac_type", "")
    mac_group = request.query_params.get("mac_group", "")

    machine = _parse_machine(machine_raw)
    shift_parsed = _parse_shift(shift_raw)
    shift = _resolve_shift_db_name(cursor, shift_parsed) if shift_parsed else None

    prefix = f"{table_alias}." if table_alias else ""

    mac_filter_clauses = []
    mac_filter_params = []
    if machine:
        placeholders = ",".join(["?"] * len(machine))
        mac_filter_clauses.append(f"AND {prefix}macno IN ({placeholders})")
        mac_filter_params.extend(machine)
    if mac_type:
        mac_filter_clauses.append(f"AND {prefix}macno LIKE ?")
        mac_filter_params.append(f"%{mac_type}%")
    if mac_group:
        if mac_group == "Turning":
            mac_filter_clauses.append(f"AND {prefix}macno LIKE '%TC%'")
        elif mac_group == "Milling":
            mac_filter_clauses.append(f"AND {prefix}macno LIKE '%VMC%'")
        elif mac_group == "Drilling":
            mac_filter_clauses.append(f"AND {prefix}macno LIKE '%SPM%'")
        elif mac_group == "Other":
            mac_filter_clauses.append(f"AND {prefix}macno NOT LIKE '%TC%' AND {prefix}macno NOT LIKE '%VMC%' AND {prefix}macno NOT LIKE '%SPM%'")
    mac_filter_sql = " ".join(mac_filter_clauses)

    shift_filter_sql = ""
    shift_filter_params = []
    if shift:
        shift_filter_sql = "AND LTRIM(RTRIM(CAST([Shift] AS NVARCHAR(128)))) = ?"
        shift_filter_params.append(shift)

    return mac_filter_sql, mac_filter_params, shift_filter_sql, shift_filter_params

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

        cur = conn.cursor()
        try:
            _prepare_filtered_temp_tables(cur, request, from_date, to_date)
        except Exception as te:
            logger.error(f"production_value_report temp table prep error: {te}", exc_info=True)
            cur.close()
            return Response({"status": "error", "message": str(te), "data": {}}, status=500)
        finally:
            cur.close()

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
            SELECT macno, proddate AS entrydate, ISNULL(okqty, 0) AS qty FROM ProductionEntry WHERE prodid IN (SELECT prodid FROM #FilteredPE) AND macno IS NOT NULL
            UNION ALL SELECT macno, entrydate, ISNULL(qty, 0) AS qty FROM ConvProductionEntry WHERE entryno IN (SELECT entryno FROM #FilteredCPE) AND macno IS NOT NULL
            UNION ALL SELECT macno, entrydate, ISNULL(qty, 0) AS qty FROM ConvProductionEntryRod WHERE entryno IN (SELECT entryno FROM #FilteredCPR) AND macno IS NOT NULL
        ) A
        LEFT JOIN MacMaster M ON M.macno = A.macno AND M.deleted = 0
        GROUP BY A.macno, ISNULL(M.RatePerHr, 0), FORMAT(A.entrydate, 'MMM yy'), DATEPART(YEAR, A.entrydate) * 100 + DATEPART(MONTH, A.entrydate)
        ORDER BY YearMonth, MacName
        """
        rows = run_query(value_query)

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

        try:
            _prepare_filtered_temp_tables(cursor, request, from_date, to_date)
        except Exception as te:
            logger.error(f"production_idle_breakdown temp table prep error: {te}", exc_info=True)
            cursor.close()
            return Response({"status": "error", "message": str(te), "data": {}}, status=500)

        # Parse filters matching the logic of views_idle_time_report.py
        from .views_idle_time_report import _parse_machine, _parse_shift, _resolve_shift_db_name

        machine_raw = request.query_params.get("machine", "")
        shift_raw = request.query_params.get("shift", "")
        mac_type = request.query_params.get("mac_type", "")
        mac_group = request.query_params.get("mac_group", "")

        machine = _parse_machine(machine_raw)
        shift_parsed = _parse_shift(shift_raw)
        shift = _resolve_shift_db_name(cursor, shift_parsed) if shift_parsed else None

        idle_filters = []
        idle_params = [from_date, to_date]
        if machine:
            placeholders = ",".join(["?"] * len(machine))
            idle_filters.append(f"AND D.MacNo IN ({placeholders})")
            idle_params.extend(machine)
        if shift:
            idle_filters.append("AND D.Shift = ?")
            idle_params.append(shift)
        if mac_type:
            idle_filters.append("AND D.MacNo LIKE ?")
            idle_params.append(f"%{mac_type}%")
        if mac_group:
            if mac_group == "Turning":
                idle_filters.append("AND D.MacNo LIKE '%TC%'")
            elif mac_group == "Milling":
                idle_filters.append("AND D.MacNo LIKE '%VMC%'")
            elif mac_group == "Drilling":
                idle_filters.append("AND D.MacNo LIKE '%SPM%'")
            elif mac_group == "Other":
                idle_filters.append("AND D.MacNo NOT LIKE '%TC%' AND D.MacNo NOT LIKE '%VMC%' AND D.MacNo NOT LIKE '%SPM%'")
        idle_filter_sql = " ".join(idle_filters)

        idle_union_sql = f"""
        SELECT M.proddate AS EntryDate, D.Shift, D.MacNo, ISNULL(D.reasons, N'Machine Idle Entry') AS Reason, DATEDIFF(SECOND, '1900-01-01 00:00:00', D.tottime) AS IdleSeconds
        FROM Machine_IdleEntryDet D INNER JOIN Machine_IdleEntryMas M ON D.prodid = M.prodid WHERE M.proddate BETWEEN ? AND ? AND M.deleted = 0 AND D.deleted = 0 {idle_filter_sql}
        UNION ALL
        SELECT P.proddate, P.shift, P.macno, N'Production Idle Time', ISNULL(P.accidletimesecs, 0) + ISNULL(P.nonaccidletimesecs, 0)
        FROM ProductionEntry P WHERE P.prodid IN (SELECT prodid FROM #FilteredPE)
        UNION ALL
        SELECT C.entrydate, C.shift, C.macno, N'Conv Production Idle Time', DATEDIFF(SECOND, '1900-01-01 00:00:00', C.IdleTime)
        FROM ConvProductionEntry C WHERE C.entryno IN (SELECT entryno FROM #FilteredCPE)
        UNION ALL
        SELECT R.entrydate, R.shift, R.macno, N'Conv Rod Idle Time', DATEDIFF(SECOND, '1900-01-01 00:00:00', R.IdleTime)
        FROM ConvProductionEntryRod R WHERE R.entryno IN (SELECT entryno FROM #FilteredCPR)
        """

        has_idle_reasons = table_exists(cursor, "IdleReasons")
        has_mac_master   = table_exists(cursor, "MacMaster")

        cte_sql = f"""
        WITH FilteredIdle AS (
            SELECT
                A.EntryDate,
                A.Shift,
                A.MacNo,
                A.Reason,
                A.IdleSeconds
            FROM ({idle_union_sql}) A
            WHERE 1 = 1
        )
        """

        # Step 1: Classify idle seconds via IdleReasons.IsAccept (exact match to idle_time_report logic)
        if has_idle_reasons:
            classify_sql = cte_sql + """
            SELECT
                ISNULL(SUM(CASE WHEN IR.IdleID IS NOT NULL AND ISNULL(IR.IsAccept, 0) = 1 THEN F.IdleSeconds ELSE 0 END), 0) AS AccSecs,
                ISNULL(SUM(CASE WHEN IR.IdleID IS NULL OR ISNULL(IR.IsAccept, 0) = 0 THEN F.IdleSeconds ELSE 0 END), 0) AS NaSecs
            FROM FilteredIdle F
            LEFT JOIN IdleReasons IR
                ON LTRIM(RTRIM(CAST(F.Reason AS NVARCHAR(512)))) = LTRIM(RTRIM(CAST(IR.IdleReasons AS NVARCHAR(512))))
                AND ISNULL(IR.deleted, 0) = 0
            """
        else:
            classify_sql = cte_sql + "SELECT 0 AS AccSecs, ISNULL(SUM(F.IdleSeconds), 0) AS NaSecs FROM FilteredIdle F"

        cursor.execute(classify_sql, idle_params)
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
                mac_idle_sql = cte_sql + "SELECT LTRIM(RTRIM(CAST(F.MacNo AS NVARCHAR(512)))), SUM(F.IdleSeconds) FROM FilteredIdle F WHERE LTRIM(RTRIM(CAST(F.MacNo AS NVARCHAR(512)))) <> N'' GROUP BY LTRIM(RTRIM(CAST(F.MacNo AS NVARCHAR(512))))"
                cursor.execute(mac_idle_sql, idle_params)
                for mn, secs in (cursor.fetchall() or []):
                    if mn: mac_idle[str(mn).strip()] = int(secs or 0)
            except: pass

        # Step 3: Get reason-level breakdown and compute loss per machine
        reason_mac_sql = cte_sql + """
        SELECT LTRIM(RTRIM(CAST(F.Reason AS NVARCHAR(512)))), LTRIM(RTRIM(CAST(F.MacNo AS NVARCHAR(512)))), SUM(F.IdleSeconds)
        FROM FilteredIdle F
        WHERE LTRIM(RTRIM(CAST(F.Reason AS NVARCHAR(512)))) <> N''
        GROUP BY LTRIM(RTRIM(CAST(F.Reason AS NVARCHAR(512)))), LTRIM(RTRIM(CAST(F.MacNo AS NVARCHAR(512))))
        """
        cursor.execute(reason_mac_sql, idle_params)
        reason_mac_rows = cursor.fetchall() or []

        from collections import defaultdict
        reason_secs_dict = defaultdict(int)
        reason_loss_dict = defaultdict(float)

        for reason_raw, mac_raw, secs in reason_mac_rows:
            r = (str(reason_raw).strip() if reason_raw else "") or "(blank)"
            mn = str(mac_raw).strip() if mac_raw else ""
            s = int(secs or 0)
            reason_secs_dict[r] += s
            rate = mac_rate.get(mn, 0.0)
            reason_loss_dict[r] += (s / 3600.0) * rate

        # Map reasons to IsAccept flag
        reason_map = {}
        if has_idle_reasons:
            cursor.execute("SELECT LTRIM(RTRIM(CAST(IdleReasons AS NVARCHAR(512)))), ISNULL(IsAccept, 0) FROM IdleReasons WHERE ISNULL(deleted, 0) = 0")
            for r, acc in (cursor.fetchall() or []):
                if r: reason_map[str(r).strip()] = int(acc or 0)

        # Sort reasons by total seconds descending
        sorted_reasons = sorted(reason_secs_dict.items(), key=lambda x: -x[1])

        accepted_reasons = []
        non_accepted_reasons = []

        for r, s in sorted_reasons:
            is_acc = reason_map.get(r, 0) == 1
            hours = round(s / 3600.0, 2)
            display = _pa_fmt_hms(s)
            entry = {"reason": r, "hours": hours, "display": display, "pct": 0.0}

            if is_acc:
                accepted_reasons.append(entry)
            else:
                loss_val = reason_loss_dict[r]
                rate_val = (loss_val / (s / 3600.0)) if s > 0 else 0.0
                entry["rate_per_hr"] = round(rate_val, 2)
                entry["loss_value"] = round(loss_val)
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

        cur = conn.cursor()
        try:
            _prepare_filtered_temp_tables(cur, request, from_date, to_date)
        except Exception as te:
            logger.error(f"daily_production_details temp table prep error: {te}", exc_info=True)
            cur.close()
            return Response({"status": "error", "message": str(te), "data": []}, status=500)

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
        ISNULL(PE.OEENEW,0) AS OEEPct,
        CAST(
            CASE 
                WHEN PE.setfrom IS NOT NULL AND PE.setto IS NOT NULL
                THEN 
                    CASE 
                        WHEN PE.setto >= PE.setfrom 
                        THEN DATEDIFF(SECOND, PE.setfrom, PE.setto)
                        ELSE DATEDIFF(SECOND, PE.setfrom, DATEADD(DAY, 1, PE.setto))
                    END 
                ELSE 0
            END / 3600.0 AS DECIMAL(18,2)
        ) AS SettingTime,
        CAST(1.00 AS DECIMAL(18,2)) AS DefaultSettingTime

    FROM ProductionEntry PE

    INNER JOIN ProgramNo PN
        ON PE.prgno = PN.prgno
       AND PE.macno = PN.macno
       AND PN.deleted = 0

    LEFT JOIN ProcessDet PD
        ON PN.process = PD.pcode
       AND PD.deleted = 0

    WHERE PE.prodid IN (SELECT prodid FROM #FilteredPE)
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
        ISNULL(CPE.OEENEW,0) AS OEEPct,
        CAST(
            CASE 
                WHEN CPE.setfrom IS NOT NULL AND CPE.setto IS NOT NULL
                THEN 
                    CASE 
                        WHEN CPE.setto >= CPE.setfrom 
                        THEN DATEDIFF(SECOND, CPE.setfrom, CPE.setto)
                        ELSE DATEDIFF(SECOND, CPE.setfrom, DATEADD(DAY, 1, CPE.setto))
                    END 
                ELSE 0
            END / 3600.0 AS DECIMAL(18,2)
        ) AS SettingTime,
        CAST(1.00 AS DECIMAL(18,2)) AS DefaultSettingTime

    FROM ConvProductionEntry CPE

    LEFT JOIN ProcessDet PD
        ON CPE.process = PD.pcode
       AND PD.deleted = 0

    LEFT JOIN ProcessTime PT
        ON CPE.partno = PT.partno
       AND CPE.process = PT.process
       AND CPE.macno = PT.macno
       AND PT.deleted = 0

    WHERE CPE.entryno IN (SELECT entryno FROM #FilteredCPE)
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
        ISNULL(CPR.OEENEW,0) AS OEEPct,
        CAST(
            CASE 
                WHEN CPR.setfrom IS NOT NULL AND CPR.setto IS NOT NULL
                THEN 
                    CASE 
                        WHEN CPR.setto >= CPR.setfrom 
                        THEN DATEDIFF(SECOND, CPR.setfrom, CPR.setto)
                        ELSE DATEDIFF(SECOND, CPR.setfrom, DATEADD(DAY, 1, CPR.setto))
                    END 
                ELSE 0
            END / 3600.0 AS DECIMAL(18,2)
        ) AS SettingTime,
        CAST(1.00 AS DECIMAL(18,2)) AS DefaultSettingTime

    FROM ConvProductionEntryRod CPR

    LEFT JOIN ProcessDet PD
        ON CPR.process = PD.pcode
       AND PD.deleted = 0

    LEFT JOIN ProcessTime PT
        ON CPR.partno = PT.partno
       AND CPR.process = PT.process
       AND CPR.macno = PT.macno
       AND PT.deleted = 0

    WHERE CPR.entryno IN (SELECT entryno FROM #FilteredCPR)
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

    CAST(F.SettingTime AS DECIMAL(18,2)) AS [SettingTime],
    CAST(F.DefaultSettingTime AS DECIMAL(18,2)) AS [DefaultSettingTime],

    CASE
        WHEN ISNULL(R.RejQty,0) > 0 THEN 'Rejected'
        ELSE 'OK'
    END AS [Status]

FROM FinalData F

LEFT JOIN RejData R ON F.RefNo = R.RefNo

ORDER BY F.ProdDate DESC, F.Machine, F.Shift;
        """

        try:
            cur.execute(sql)
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
            for key in ["Target", "OKQty", "Rej", "EffPct", "OEEPct", "SettingTime", "DefaultSettingTime"]:
                v = record.get(key)
                if v is not None:
                    record[key] = float(v) if key in ("EffPct", "OEEPct", "SettingTime", "DefaultSettingTime") else int(v)
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

@api_view(["GET"])
def machine_card_data(request, macno):
    """
    Get Machine Detail Card metrics and shift logs.
    """
    import urllib.parse
    macno = urllib.parse.unquote(macno)
    conn = None
    try:
        try:
            conn, tenant = get_tenant_connection(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=401)

        from_date = request.query_params.get("from", None)
        to_date   = request.query_params.get("to",   None)
        if not from_date or not to_date:
            today = datetime.now().date().isoformat()
            from_date = from_date or today
            to_date = to_date or today

        try:
            datetime.strptime(from_date, "%Y-%m-%d")
            datetime.strptime(to_date,   "%Y-%m-%d")
        except ValueError:
            return Response({"status": "error", "message": "Invalid date format. Use YYYY-MM-DD", "data": {}}, status=400)

        query = """
        WITH LatestProgram AS
        (
            SELECT *,
                   ROW_NUMBER() OVER (PARTITION BY prgno, macno ORDER BY revno DESC) AS rn
            FROM ProgramNo
            WHERE deleted = 0
        ),
        CNCEntries AS
        (
            SELECT
                'CNC'                                                          AS Source,
                PE.prodid                                                      AS EntryID,
                PE.proddate                                                    AS EntryDate,
                PE.shift                                                       AS Shift,
                PE.macno                                                       AS MacNo,
                PN.partno                                                      AS PartNo,
                PD.process                                                     AS Process,
                PE.oprname                                                     AS OprName,
                PE.runfrom                                                     AS StartTime,
                PE.runto                                                       AS EndTime,
                PE.okqty                                                       AS OkQty,
                PE.insprejqty                                                  AS RejQty,
                PE.insprwqty                                                   AS ReworkQty,
                CASE WHEN PE.runto < PE.runfrom THEN DATEDIFF(SECOND, PE.runfrom, DATEADD(DAY, 1, PE.runto)) ELSE DATEDIFF(SECOND, PE.runfrom, PE.runto) END AS RunTimeSecs,
                ISNULL(CASE WHEN SQL_VARIANT_PROPERTY(PE.idlTime, 'BaseType') IN ('datetime','time') THEN DATEDIFF(SECOND, 0, PE.idlTime) ELSE CAST(PE.idlTime AS INT) END, 0) AS IdleTimeSecs,
                COALESCE(NULLIF(PE.shifttimesecs, 0), 28800)                    AS ShiftTimeSecs,
                PE.OEENEW                                                      AS OEE,
                PE.OPREFF                                                      AS OperEff
            FROM ProductionEntry PE
            INNER JOIN LatestProgram PN
                ON PE.prgno = PN.prgno AND PE.macno = PN.macno AND PN.rn = 1
            LEFT JOIN ProcessDet PD
                ON PN.process = PD.pcode AND PD.deleted = 0
            WHERE PE.deleted = 0
              AND PE.macno = ?
              AND PE.proddate BETWEEN ? AND ?
        ),
        ConvEntries AS
        (
            SELECT
                'Conventional'                                                  AS Source,
                CE.entryno                                                      AS EntryID,
                CE.entrydate                                                    AS EntryDate,
                CE.shift                                                        AS Shift,
                CE.macno                                                        AS MacNo,
                CE.partno                                                       AS PartNo,
                CE.process                                                      AS Process,
                CE.oprname                                                     AS OprName,
                CE.starttime                                                    AS StartTime,
                CE.endtime                                                      AS EndTime,
                CE.qty                                                          AS OkQty,
                CAST(NULL AS INT)                                               AS RejQty,
                CE.Rework                                                       AS ReworkQty,
                CASE WHEN CE.endtime < CE.starttime THEN DATEDIFF(SECOND, CE.starttime, DATEADD(DAY, 1, CE.endtime)) ELSE DATEDIFF(SECOND, CE.starttime, CE.endtime) END AS RunTimeSecs,
                DATEDIFF(SECOND, 0, CE.IdleTime)                                AS IdleTimeSecs,
                COALESCE(NULLIF(CE.shifttimesecs, 0), 28800)                    AS ShiftTimeSecs,
                CE.OAEFF                                                        AS OEE,
                CE.eff                                                          AS OperEff
            FROM ConvProductionEntry CE
            WHERE CE.deleted = 0
              AND CE.macno = ?
              AND CE.entrydate BETWEEN ? AND ?
        ),
        RodEntries AS
        (
            SELECT
                'Rod'                                                           AS Source,
                CR.entryno                                                      AS EntryID,
                CR.entrydate                                                    AS EntryDate,
                CR.shift                                                        AS Shift,
                CR.macno                                                        AS MacNo,
                CR.partno                                                       AS PartNo,
                CR.process                                                      AS Process,
                CR.oprname                                                     AS OprName,
                CR.starttime                                                    AS StartTime,
                CR.endtime                                                      AS EndTime,
                CR.ProdQty                                                      AS OkQty,
                CR.ScrapQty                                                     AS RejQty,
                CAST(NULL AS INT)                                               AS ReworkQty,
                CASE WHEN CR.endtime < CR.starttime THEN DATEDIFF(SECOND, CR.starttime, DATEADD(DAY, 1, CR.endtime)) ELSE DATEDIFF(SECOND, CR.starttime, CR.endtime) END AS RunTimeSecs,
                DATEDIFF(SECOND, 0, CR.IdleTime)                                AS IdleTimeSecs,
                COALESCE(NULLIF(CR.shifttimesecs, 0), 28800)                    AS ShiftTimeSecs,
                CR.OAEFF                                                        AS OEE,
                CR.eff                                                          AS OperEff
            FROM ConvProductionEntryRod CR
            WHERE CR.deleted = 0
              AND CR.macno = ?
              AND CR.entrydate BETWEEN ? AND ?
        ),
        AllEntries AS
        (
            SELECT * FROM CNCEntries
            UNION ALL
            SELECT * FROM ConvEntries
            UNION ALL
            SELECT * FROM RodEntries
        )
        SELECT
            ROUND(AVG(CAST(OEE     AS FLOAT)) OVER (), 2)          AS Card_OEE_Pct,
            ROUND(AVG(CAST(OperEff AS FLOAT)) OVER (), 2)          AS Card_OperEff_Pct,
            ROUND(SUM(RunTimeSecs)  OVER () / 3600.0, 2)           AS Card_RunHrs,
            ROUND(SUM(IdleTimeSecs) OVER () / 3600.0, 2)           AS Card_IdleHrs,
            SUM(OkQty)     OVER ()                                 AS Card_TotalOkQty,
            SUM(RejQty)    OVER ()                                 AS Card_TotalRejQty,
            SUM(ReworkQty) OVER ()                                 AS Card_TotalReworkQty,
            ROUND(SUM(RunTimeSecs) OVER () * 100.0
                  / NULLIF(SUM(ShiftTimeSecs) OVER (), 0), 2)      AS Card_MachineRun_Pct,

            Source, EntryID, EntryDate, Shift, MacNo, PartNo, Process, OprName,
            StartTime, EndTime, OkQty, RejQty, ReworkQty,
            ROUND(RunTimeSecs / 3600.0, 2)                         AS RunHrs,
            OEE, OperEff
        FROM AllEntries
        ORDER BY EntryDate, StartTime;
        """

        card = {
            "oee_pct": 0.0,
            "oper_eff_pct": 0.0,
            "run_hrs": 0.0,
            "idle_hrs": 0.0,
            "total_ok_qty": 0,
            "total_rej_qty": 0,
            "total_rework_qty": 0,
            "machine_run_pct": 0.0
        }
        shift_logs = []

        cursor = conn.cursor()
        try:
            params = [macno, from_date, to_date, macno, from_date, to_date, macno, from_date, to_date]
            cursor.execute(query, params)
            rows = cursor.fetchall()
            if rows:
                first_row = rows[0]
                card["oee_pct"] = float(first_row[0] or 0.0)
                card["oper_eff_pct"] = float(first_row[1] or 0.0)
                card["run_hrs"] = float(first_row[2] or 0.0)
                card["idle_hrs"] = float(first_row[3] or 0.0)
                card["total_ok_qty"] = int(first_row[4] or 0)
                card["total_rej_qty"] = int(first_row[5] or 0)
                card["total_rework_qty"] = int(first_row[6] or 0)
                card["machine_run_pct"] = float(first_row[7] or 0.0)

                for r in rows:
                    shift_logs.append({
                        "operator": r[15] if r[15] is not None else "",
                        "part_no": r[13] if r[13] is not None else "",
                        "process": r[14] if r[14] is not None else "",
                        "hrs": float(r[21] or 0.0),
                        "ok_qty": int(r[18] or 0)
                    })
        except Exception as q_err:
            import logging
            logging.getLogger(__name__).warning(f"Error executing machine card query: {q_err}")
        finally:
            cursor.close()

        return Response({
            "card": card,
            "shift_logs": shift_logs
        })

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"machine_card_data error: {e}", exc_info=True)
        return Response({"status": "error", "message": str(e), "card": {}, "shift_logs": []}, status=500)
    finally:
        if conn:
            try: conn.close()
            except: pass


@api_view(["GET"])
def production_analysis_filters(request):
    """
    Get dynamic list of machines, operators, and shifts for filters.
    """
    conn = None
    try:
        try:
            conn, tenant = get_tenant_connection(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=401)

        import logging
        logger = logging.getLogger(__name__)
        cursor = conn.cursor()

        # 1. Fetch Machines
        machines = []
        try:
            cursor.execute("SELECT macno, macname FROM MacMaster WHERE deleted = 0 AND ISNULL(IsNonActive, 0) = 0 ORDER BY macnosortorder, macno")
            for r in cursor.fetchall() or []:
                m_no = (r[0] or "").strip()
                m_name = (r[1] or r[0] or "").strip()
                if m_no:
                    machines.append({
                        "value": m_no,
                        "label": f"{m_no} - {m_name}" if m_name and m_name != m_no else m_no
                    })
        except Exception as e:
            logger.warning(f"Error fetching machines for filters: {e}")

        # 2. Fetch Operators
        operators = []
        try:
            op_sql = """
            SELECT DISTINCT LTRIM(RTRIM(oprname)) AS OperatorName
            FROM (
                SELECT oprname FROM ProductionEntry WHERE deleted = 0 AND oprname IS NOT NULL AND LTRIM(RTRIM(oprname)) <> ''
                UNION
                SELECT oprname FROM ConvProductionEntry WHERE deleted = 0 AND oprname IS NOT NULL AND LTRIM(RTRIM(oprname)) <> ''
                UNION
                SELECT oprname FROM ConvProductionEntryRod WHERE deleted = 0 AND oprname IS NOT NULL AND LTRIM(RTRIM(oprname)) <> ''
            ) A
            ORDER BY OperatorName
            """
            cursor.execute(op_sql)
            for r in cursor.fetchall() or []:
                name = (r[0] or "").strip()
                if name:
                    operators.append({
                        "value": name,
                        "label": name
                    })
        except Exception as e:
            logger.warning(f"Error fetching operators for filters: {e}")

        # 3. Fetch Shifts
        shifts = []
        try:
            if table_exists(cursor, "shift"):
                cursor.execute("SELECT DISTINCT LTRIM(RTRIM(CAST([Shift] AS NVARCHAR(128)))) FROM shift WHERE deleted = 0")
                for r in cursor.fetchall() or []:
                    s_name = (r[0] or "").strip()
                    if s_name:
                        ui_label = s_name
                        if s_name in ["Shift 1", "1", "SH-1"]:
                            ui_label = "Shift A"
                        elif s_name in ["Shift 2", "2", "SH-2"]:
                            ui_label = "Shift B"
                        elif s_name in ["Shift 3", "3", "SH-3"]:
                            ui_label = "Shift C"
                        shifts.append({
                            "value": s_name,
                            "label": ui_label
                        })
            else:
                shift_sql = """
                SELECT DISTINCT LTRIM(RTRIM(shift))
                FROM (
                    SELECT shift FROM ProductionEntry WHERE deleted = 0 AND shift IS NOT NULL AND LTRIM(RTRIM(shift)) <> ''
                    UNION
                    SELECT shift FROM ConvProductionEntry WHERE deleted = 0 AND shift IS NOT NULL AND LTRIM(RTRIM(shift)) <> ''
                    UNION
                    SELECT shift FROM ConvProductionEntryRod WHERE deleted = 0 AND shift IS NOT NULL AND LTRIM(RTRIM(shift)) <> ''
                ) A
                """
                cursor.execute(shift_sql)
                for r in cursor.fetchall() or []:
                    s_name = (r[0] or "").strip()
                    if s_name:
                        ui_label = s_name
                        if s_name in ["Shift 1", "1", "SH-1"]:
                            ui_label = "Shift A"
                        elif s_name in ["Shift 2", "2", "SH-2"]:
                            ui_label = "Shift B"
                        elif s_name in ["Shift 3", "3", "SH-3"]:
                            ui_label = "Shift C"
                        shifts.append({
                            "value": s_name,
                            "label": ui_label
                        })
        except Exception as e:
            logger.warning(f"Error fetching shifts for filters: {e}")

        return Response({
            "status": "success",
            "data": {
                "machines": machines,
                "operators": operators,
                "shifts": shifts
            }
        })
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"production_analysis_filters error: {e}", exc_info=True)
        return Response({"status": "error", "message": str(e)}, status=500)
    finally:
        if conn:
            try: conn.close()
            except: pass