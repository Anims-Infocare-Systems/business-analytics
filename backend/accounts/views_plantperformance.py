# views_plantperformance.py — Plant Performance Dashboard (Dashboard3) API
#
# All Dashboard3 data routes live here under /api/plant-performance/*
# Implementation is delegated to views_dashboard2.py (same ERP SQL, no duplication).
#
# Frontend: Dashboard3.jsx + Dashboard3ProductionDataView.jsx (+ card-specific views)
from concurrent.futures import ThreadPoolExecutor, as_completed

from django.db import close_old_connections
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .views_dashboard2 import (
    dashboard2_kpis,
    dashboard2_production_by_shift,
    dashboard2_idle_hours,
    dashboard2_downtime_by_reason,
    dashboard2_customer_complaints,
    dashboard2_po_pipeline,
    dashboard2_inspection_pending_snapshot,
    dashboard2_grn_pending_pipeline,
    dashboard2_iqc_rejections,
    dashboard2_final_inspection_kpi,
    dashboard2_injob_inspection,
    dashboard2_inter_inspection,
    dashboard2_final_inspection_org_rej_rwk,
    dashboard2_top_defect_categories,
)

@api_view(["GET"])
def dashboard2_customer_po_vs_sales(request):
    try:
        from .views import get_tenant_connection
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    sql = """
WITH PO_DATA AS
(
    SELECT
        YEAR(PM.PODT) AS POYear,
        MONTH(PM.PODT) AS POMonth,
        DATENAME(MONTH,PM.PODT) AS MonthName,
        CAST(PM.PODT AS DATE) AS PODate,
        ISNULL(CM.CName, N'—') AS CustomerName,

        PM.Apono,
        PD.ItCode,

        SUM(ISNULL(PD.Amt,0)) AS POValue

    FROM In_PoMas PM
    INNER JOIN In_PoDet PD
        ON PM.PONO = PD.PONO
    LEFT JOIN CustMast CM
        ON PM.CId = CM.Id
    WHERE PM.Deleted = 0
      AND PD.Deleted = 0
    GROUP BY
        YEAR(PM.PODT),
        MONTH(PM.PODT),
        DATENAME(MONTH,PM.PODT),
        CAST(PM.PODT AS DATE),
        CM.CName,
        PM.Apono,
        PD.ItCode
),

PO_DC_MAP AS
(
    SELECT DISTINCT
        Apono,
        PartNo,
        DCNO
    FROM DcInSubDet
    WHERE Deleted = 0

    UNION

    SELECT DISTINCT
        Apono,
        PartNo,
        DCNO
    FROM DcInSubDetAssmPoDet
    WHERE Deleted = 0
),

SALES_DATA AS
(
    SELECT
        PDM.Apono,
        PDM.PartNo,

        SUM(ISNULL(BD.Amt,0)) AS SalesValue

    FROM PO_DC_MAP PDM

    INNER JOIN Bill_DcOrdDet BDO
        ON PDM.DCNO = BDO.DCNO

    INNER JOIN Bill_Mas BM
        ON BDO.InvNo = BM.InvNo
       AND BM.Deleted = 0

    INNER JOIN Bill_Det BD
        ON BM.InvNo = BD.InvNo
       AND BD.Deleted = 0
       AND BD.ItCode = PDM.PartNo

    GROUP BY
        PDM.Apono,
        PDM.PartNo
)

SELECT
    P.CustomerName,
    P.POYear,
    P.POMonth,
    P.MonthName,
    P.PODate,
    P.Apono,
    P.ItCode,

    SUM(P.POValue) AS POValue,

    SUM(
        CASE
            WHEN ISNULL(S.SalesValue,0) > P.POValue
            THEN P.POValue
            ELSE ISNULL(S.SalesValue,0)
        END
    ) AS SalesValue,

    SUM(
        CASE
            WHEN P.POValue >
                 CASE
                    WHEN ISNULL(S.SalesValue,0) > P.POValue
                    THEN P.POValue
                    ELSE ISNULL(S.SalesValue,0)
                 END
            THEN
                 P.POValue
                 -
                 CASE
                    WHEN ISNULL(S.SalesValue,0) > P.POValue
                    THEN P.POValue
                    ELSE ISNULL(S.SalesValue,0)
                 END
            ELSE 0
        END
    ) AS PendingValue

FROM PO_DATA P

LEFT JOIN SALES_DATA S
    ON P.Apono = S.Apono
   AND P.ItCode = S.PartNo

GROUP BY
    P.CustomerName,
    P.POYear,
    P.POMonth,
    P.MonthName,
    P.PODate,
    P.Apono,
    P.ItCode

ORDER BY
    P.PODate,
    P.Apono;
    """
    
    rows = []
    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
        for row in cursor.fetchall() or []:
            customer = str(row[0]) if row[0] else "—"
            year_short = str(row[1])[-2:] if row[1] is not None else "00"
            month_name = str(row[3])[:3] if row[3] else "—"
            month_label = f"{month_name}-{year_short}" if row[3] and row[1] is not None else "—"
            date_str = str(row[4])[:10] if row[4] else ""
            po_number = str(row[5]) if row[5] else ""
            part_number = str(row[6]) if row[6] else ""
            
            po_val = float(row[7] or 0) / 100000.0
            sales_val = float(row[8] or 0) / 100000.0
            pending_val = float(row[9] or 0) / 100000.0
            
            rows.append({
                "customer": customer,
                "month": month_label,
                "date": date_str,
                "orderValue": round(po_val, 2),
                "salesValue": round(sales_val, 2),
                "pendingValue": round(pending_val, 2),
                "poNumber": po_number,
                "partNumber": part_number
            })
    except Exception as e:
        if cursor: cursor.close()
        conn.close()
        return Response({"error": f"Database error: {str(e)}"}, status=500)
        
    if cursor: cursor.close()
    conn.close()
    
    return Response({
        "rows": rows
    })

@api_view(["GET"])
def dashboard2_grn_value(request):
    """Plant Performance — GRN Value (same pattern as dashboard2_customer_po_vs_sales)."""
    try:
        from .views import get_tenant_connection
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    from datetime import datetime

    sql = """
SELECT
    GM.grnno,
    GM.grndate,
    GM.dtype,
    CM.CName AS SupplierName,
    GD.partno,
    GD.description,
    SUM(ISNULL(GD.qty,0)) AS Qty,
    SUM(ISNULL(GRD.Amount,0)) AS Amount
FROM grn_mas GM
INNER JOIN CustMast CM
    ON GM.cid = CM.Id
INNER JOIN grn_det GD
    ON GM.grnno = GD.grnno
    AND GD.deleted = 0
LEFT JOIN Grn_RateDet GRD
    ON GM.grnno = GRD.grnno
    AND GRD.partno = GD.partno
    AND GRD.deleted = 0
WHERE
    GM.deleted = 0
    AND GM.dtype IN ('Raw Material','Stores Material','Service')
GROUP BY
    GM.grnno,
    GM.grndate,
    GM.dtype,
    CM.CName,
    GD.partno,
    GD.description
ORDER BY
    GM.grndate,
    GM.grnno,
    GD.partno;
    """

    rows = []
    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
        for row in cursor.fetchall() or []:
            grn_no = str(row[0]) if row[0] else ""
            grn_date_val = row[1]
            grn_date_str = ""
            month_label = "—"
            if grn_date_val:
                if hasattr(grn_date_val, "strftime"):
                    grn_date_str = grn_date_val.strftime("%Y-%m-%d")
                    month_label = grn_date_val.strftime("%b-%y")
                else:
                    raw = str(grn_date_val).strip()
                    grn_date_str = raw[:10] if len(raw) >= 10 else raw
                    try:
                        parsed_dt = datetime.strptime(grn_date_str, "%Y-%m-%d")
                        month_label = parsed_dt.strftime("%b-%y")
                    except Exception:
                        try:
                            parsed_dt = datetime.strptime(grn_date_str[:10], "%d-%m-%Y")
                            grn_date_str = parsed_dt.strftime("%Y-%m-%d")
                            month_label = parsed_dt.strftime("%b-%y")
                        except Exception:
                            pass

            dtype = str(row[2]) if row[2] else ""
            supplier_name = str(row[3]) if row[3] else "—"
            part_no = str(row[4]) if row[4] else ""
            description = str(row[5]) if row[5] else ""
            qty = float(row[6] or 0)
            amount = float(row[7] or 0) / 100000.0

            rows.append({
                "grnNo": grn_no,
                "grnDate": grn_date_str,
                "month": month_label,
                "dtype": dtype,
                "supplierName": supplier_name,
                "partNo": part_no,
                "description": description,
                "qty": qty,
                "amount": round(amount, 2),
            })
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    if cursor:
        cursor.close()
    conn.close()

    return Response({
        "rows": rows
    })


dashboard3_grn_value = dashboard2_grn_value


@api_view(["GET"])
def dashboard2_fg_value(request):
    """Plant Performance — FG Value based on RouteCardStock and LATEST_RATE."""
    try:
        from .views import get_tenant_connection
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    sql = """
;WITH PART_CUSTOMER AS
(
    SELECT
        WM.PartNo,
        WM.Cid AS CID
    FROM WithMatMas WM
    WHERE WM.Deleted = 0

    UNION

    SELECT
        PM.PartNo,
        PM.Cid AS CID
    FROM ProductMast PM
    WHERE PM.Deleted = 0

    UNION

    SELECT
        CJ.partno AS PartNo,
        CJ.cid AS CID
    FROM CustJobRawMat CJ
    WHERE CJ.deleted = 0
),

PART_DESCRIPTION AS
(
    SELECT
        WM.PartNo,
        WM.Description
    FROM WithMatMas WM
    WHERE WM.Deleted = 0

    UNION

    SELECT
        PM.PartNo,
        PM.Description
    FROM ProductMast PM
    WHERE PM.Deleted = 0

    UNION

    SELECT
        CJ.partno AS PartNo,
        CJ.description AS Description
    FROM CustJobRawMat CJ
    WHERE CJ.deleted = 0
),

LATEST_RATE AS
(
    SELECT
        PartNo,
        CASE
            WHEN ISNULL(NetRate,0) > 0 THEN NetRate
            ELSE BaseRate
        END AS Rate,
        ROW_NUMBER() OVER
        (
            PARTITION BY PartNo
            ORDER BY BReffdt DESC
        ) AS RN
    FROM Commer_BaseRateDet
    WHERE Deleted = 0
)

SELECT
    R.PartNo,
    MAX(PD.Description) AS Description,
    MAX(CM.CName) AS CustomerName,
    SUM(ISNULL(R.FinalInspQty,0)) AS FinalInspQty,
    SUM(ISNULL(R.DCQty,0)) AS DCQty,
    ISNULL(MAX(LR.Rate),0) AS Rate,
    CAST(SUM(ISNULL(R.FinalInspQty,0)) * ISNULL(MAX(LR.Rate),0) AS DECIMAL(18,2))
        AS FinalInspectionValue,
    CAST(SUM(ISNULL(R.DCQty,0)) * ISNULL(MAX(LR.Rate),0) AS DECIMAL(18,2))
        AS DispatchValue
FROM RouteCardStock R

LEFT JOIN PART_DESCRIPTION PD
ON PD.PartNo = R.PartNo

LEFT JOIN PART_CUSTOMER PC
ON PC.PartNo = R.PartNo

LEFT JOIN CustMast CM
ON CM.ID = PC.CID
AND CM.Deleted = 0

LEFT JOIN LATEST_RATE LR
ON LR.PartNo = R.PartNo
AND LR.RN = 1

WHERE
(
    ISNULL(R.FinalInspQty,0) > 0
    OR
    ISNULL(R.DCQty,0) > 0
)

GROUP BY
    R.PartNo

ORDER BY
    CustomerName,
    R.PartNo;
    """

    rows = []
    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
        for row in cursor.fetchall() or []:
            part_no = str(row[0]) if row[0] else ""
            description = str(row[1]) if row[1] else ""
            customer_name = str(row[2]) if row[2] else "—"
            final_insp_qty = float(row[3] or 0)
            dc_qty = float(row[4] or 0)
            rate = float(row[5] or 0)
            final_insp_value = float(row[6] or 0)
            dispatch_value = float(row[7] or 0)

            rows.append({
                "partNo": part_no,
                "description": description,
                "customerName": customer_name,
                "finalInspQty": final_insp_qty,
                "dcQty": dc_qty,
                "rate": rate,
                "finalInspectionValue": final_insp_value,
                "dispatchValue": dispatch_value
            })
    except Exception as e:
        if cursor: cursor.close()
        conn.close()
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    if cursor: cursor.close()
    conn.close()

    return Response({
        "rows": rows
    })


@api_view(["GET"])
def dashboard2_target_vs_actual(request):
    """Plant Performance — Target Vs Actual (DailyDcPlan vs DC)."""
    try:
        from .views import get_tenant_connection, parse_date_range
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)

    sql = """
;WITH PART_DESCRIPTION AS
(
    SELECT
        WM.PartNo,
        WM.Description
    FROM WithMatMas WM
    WHERE WM.Deleted = 0

    UNION

    SELECT
        PM.PartNo,
        PM.Description
    FROM ProductMast PM
    WHERE PM.Deleted = 0

    UNION

    SELECT
        CJ.partno AS PartNo,
        CJ.description AS Description
    FROM CustJobRawMat CJ
    WHERE CJ.deleted = 0
),

UNIQUE_COMBINATIONS AS
(
    SELECT
        DPD.CID,
        DPD.PartNo,
        CAST(DPM.dpldate AS DATE) AS ComboDate
    FROM DailyDcPlan_Det DPD
    INNER JOIN DailyDcPlan_Mas DPM
        ON DPM.dplno = DPD.dplno
    WHERE
        DPM.deleted = 0
        AND DPD.deleted = 0
        AND DPM.dpldate BETWEEN ? AND ?

    UNION

    SELECT
        DM.CID,
        DD.PartNo,
        CAST(DM.dcdate AS DATE) AS ComboDate
    FROM DC_Det DD
    INNER JOIN DC_Mas DM
        ON DM.dcno = DD.dcno
    WHERE
        DM.deleted = 0
        AND DD.deleted = 0
        AND DM.dcdate BETWEEN ? AND ?
),

PLAN_DATA AS
(
    SELECT
        DPD.CID,
        DPD.PartNo,
        CAST(DPM.dpldate AS DATE) AS PlanDate,
        SUM(ISNULL(DPD.PlanQty,0)) AS PlanQty,
        SUM(ISNULL(DPD.PlanReqQty,0)) AS PlanReqQty,
        SUM(ISNULL(DPD.AvailQty,0)) AS AvailableQty
    FROM DailyDcPlan_Det DPD
    INNER JOIN DailyDcPlan_Mas DPM
        ON DPM.dplno = DPD.dplno
    WHERE
        DPM.deleted = 0
        AND DPD.deleted = 0
        AND DPM.dpldate BETWEEN ? AND ?
    GROUP BY
        DPD.CID,
        DPD.PartNo,
        CAST(DPM.dpldate AS DATE)
),

DISPATCH_DATA AS
(
    SELECT
        DM.CID,
        DD.PartNo,
        CAST(DM.dcdate AS DATE) AS DcDate,
        SUM(ISNULL(DD.okqty,0)) AS DispatchQty
    FROM DC_Det DD
    INNER JOIN DC_Mas DM
        ON DM.dcno = DD.dcno
    WHERE
        DM.deleted = 0
        AND DD.deleted = 0
        AND DM.dcdate BETWEEN ? AND ?
    GROUP BY
        DM.CID,
        DD.PartNo,
        CAST(DM.dcdate AS DATE)
)

SELECT
    UC.CID,
    ISNULL(CM.CName, N'—') AS CustomerName,
    UC.PartNo,
    MAX(ISNULL(PD.Description, N'')) AS Description,
    UC.ComboDate AS PlanDate,
    SUM(ISNULL(P.PlanQty,0)) AS PlanQty,
    SUM(ISNULL(P.AvailableQty,0)) AS AvailableQty,
    SUM(ISNULL(P.PlanReqQty,0)) AS PlanReqQty,
    SUM(ISNULL(D.DispatchQty,0)) AS DispatchQty,

    CASE
        WHEN SUM(ISNULL(P.PlanQty,0)) = 0 THEN 0
        ELSE ROUND(SUM(ISNULL(D.DispatchQty,0)) * 100.0 / SUM(ISNULL(P.PlanQty,0)),2)
    END AS DispatchPercentage,

    CASE
        WHEN SUM(ISNULL(D.DispatchQty,0)) >= SUM(ISNULL(P.PlanQty,0)) AND SUM(ISNULL(P.PlanQty,0)) > 0 THEN 'Completed'
        WHEN SUM(ISNULL(D.DispatchQty,0)) > 0 THEN 'Partial'
        ELSE 'Pending'
    END AS DispatchStatus

FROM UNIQUE_COMBINATIONS UC

LEFT JOIN PLAN_DATA P
    ON P.CID = UC.CID
   AND P.PartNo = UC.PartNo
   AND P.PlanDate = UC.ComboDate

LEFT JOIN DISPATCH_DATA D
    ON D.CID = UC.CID
   AND D.PartNo = UC.PartNo
   AND D.DcDate = UC.ComboDate

LEFT JOIN CustMast CM
    ON CM.ID = UC.CID
   AND CM.Deleted = 0

LEFT JOIN PART_DESCRIPTION PD
    ON PD.PartNo = UC.PartNo

GROUP BY
    UC.CID,
    CM.CName,
    UC.PartNo,
    UC.ComboDate

ORDER BY
    CustomerName,
    UC.PartNo,
    PlanDate;
"""

    rows = []
    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute(sql, [
            start_date, end_date, start_date, end_date,
            start_date, end_date, start_date, end_date
        ])
        for row in cursor.fetchall() or []:
            cid = str(row[0]) if row[0] else ""
            customer_name = str(row[1]) if row[1] else "—"
            part_no = str(row[2]) if row[2] else ""
            description = str(row[3]) if row[3] else ""
            plan_date = str(row[4])[:10] if row[4] else ""
            plan_qty = float(row[5] or 0)
            avail_qty = float(row[6] or 0)
            plan_req_qty = float(row[7] or 0)
            dispatch_qty = float(row[8] or 0)
            dispatch_pct = float(row[9] or 0)
            dispatch_status = str(row[10]) if row[10] else "Pending"

            rows.append({
                "cid": cid,
                "customerName": customer_name,
                "partNo": part_no,
                "description": description,
                "date": plan_date,
                "planQty": plan_qty,
                "availableQty": avail_qty,
                "planReqQty": plan_req_qty,
                "dispatchQty": dispatch_qty,
                "dispatchPercentage": dispatch_pct,
                "dispatchStatus": dispatch_status
            })
    except Exception as e:
        if cursor: cursor.close()
        conn.close()
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    if cursor: cursor.close()
    conn.close()

    return Response({
        "rows": rows
    })


@api_view(["GET"])
def dashboard2_sales_analysis(request):
    """Plant Performance — Sales Analysis (Bill_Mas invoices, same pattern as customer_po_vs_sales)."""
    try:
        from .views import get_tenant_connection
        from .views_sales_analysis import (
            _cust_join_sql,
            _cust_name_expr,
            table_exists,
        )
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    from datetime import datetime

    _MONTH_ABB = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    _MONTH_FULL = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]

    rows = []
    cursor = None
    try:
        cursor = conn.cursor()
        use_alias = table_exists(cursor, "CustAliasMast")
        cust_expr = _cust_name_expr(use_alias)
        join_sql = _cust_join_sql(use_alias)

        sql = f"""
SELECT
    m.invno,
    CAST(m.invdt AS DATE) AS inv_date,
    {cust_expr} AS customer_name,
    ISNULL(CAST(m.tamt AS FLOAT), 0) AS amount
FROM Bill_Mas m
{join_sql}
WHERE ISNULL(m.deleted, 0) = 0
  AND ISNULL(m.btype, '') NOT IN ('Credit Note')
  AND LTRIM(RTRIM(ISNULL(m.btype, N''))) <> N'Sales Return'
ORDER BY m.invdt, m.invno;
        """

        cursor.execute(sql)
        for row in cursor.fetchall() or []:
            inv_no = str(row[0]).strip() if row[0] else ""
            inv_date_val = row[1]
            inv_date_str = ""
            month_short = "—"
            month_name = "—"
            year_val = None

            if inv_date_val:
                if hasattr(inv_date_val, "strftime"):
                    inv_date_str = inv_date_val.strftime("%Y-%m-%d")
                    mo = inv_date_val.month
                    year_val = inv_date_val.year
                else:
                    inv_date_str = str(inv_date_val).strip()[:10]
                    try:
                        parsed_dt = datetime.strptime(inv_date_str, "%Y-%m-%d")
                        mo = parsed_dt.month
                        year_val = parsed_dt.year
                    except Exception:
                        mo = None
                if mo and year_val:
                    month_short = f"{_MONTH_ABB[mo - 1]}-{str(year_val)[-2:]}"
                    month_name = _MONTH_FULL[mo - 1]

            customer = str(row[2]).strip() if row[2] else "—"
            amount_l = round(float(row[3] or 0) / 100000.0, 2)

            rows.append({
                "invoiceNo": inv_no,
                "date": inv_date_str,
                "month": month_short,
                "monthName": month_name,
                "year": year_val,
                "customer": customer,
                "salesValue": amount_l,
                "dispatchValue": amount_l,
                "collectionStatus": "—",
            })
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    if cursor:
        cursor.close()
    conn.close()

    return Response({
        "rows": rows
    })


dashboard3_sales_analysis = dashboard2_sales_analysis


@api_view(["GET"])
def dashboard2_efficiency(request):
    """Plant Performance — Efficiency (EFF) from ProductionEntry + Conv* union."""
    try:
        from .views import get_tenant_connection, parse_date_range
        from .views_efficiency_report import (
            build_efficiency_compare_payload,
            _parse_bool_param,
        )
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    include_cnc = _parse_bool_param(request.GET.get("cnc"), True)
    include_conv = _parse_bool_param(request.GET.get("conv"), True)
    load_full_fy = _parse_bool_param(request.GET.get("full_fy"), True)

    if not include_cnc and not include_conv:
        return Response({
            "error": "Select at least one machine type (CNC or Conventional).",
        }, status=400)

    cursor = None
    try:
        cursor = conn.cursor()
        payload = build_efficiency_compare_payload(
            cursor, start_date, end_date, include_cnc, include_conv, load_full_fy=load_full_fy
        )
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

    if cursor:
        cursor.close()
    conn.close()
    return Response(payload)


dashboard3_efficiency = dashboard2_efficiency


@api_view(["GET"])
def dashboard2_oee(request):
    """Plant Performance — OEE (OEENEW) from combined production tables."""
    try:
        from .views import get_tenant_connection, parse_date_range
        from .views_oee_report import build_oee_compare_payload, _parse_bool_param
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    include_cnc = _parse_bool_param(request.GET.get("cnc"), True)
    include_conv = _parse_bool_param(request.GET.get("conv"), True)
    load_full_fy = _parse_bool_param(request.GET.get("full_fy"), True)

    if not include_cnc and not include_conv:
        return Response({
            "error": "Select at least one machine type (CNC or Conventional).",
        }, status=400)

    cursor = None
    try:
        cursor = conn.cursor()
        payload = build_oee_compare_payload(
            cursor, start_date, end_date, include_cnc, include_conv, load_full_fy=load_full_fy
        )
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

    if cursor:
        cursor.close()
    conn.close()
    return Response(payload)


dashboard3_oee = dashboard2_oee


@api_view(["GET"])
def dashboard2_rejection(request):
    """Plant Performance — Rejection report from inspection tables."""
    try:
        from .views import get_tenant_connection, parse_date_range
        from .views_rejection_rework_report import (
            build_rejection_compare_payload,
            _parse_bool_param,
        )
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    load_full_fy = _parse_bool_param(request.GET.get("full_fy"), True)

    cursor = None
    try:
        cursor = conn.cursor()
        payload = build_rejection_compare_payload(
            cursor, start_date, end_date, load_full_fy=load_full_fy
        )
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

    if cursor:
        cursor.close()
    conn.close()
    return Response(payload)


@api_view(["GET"])
def dashboard2_rework(request):
    """Plant Performance — Rework report from inspection tables."""
    try:
        from .views import get_tenant_connection, parse_date_range
        from .views_rejection_rework_report import (
            build_rework_compare_payload,
            _parse_bool_param,
        )
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    load_full_fy = _parse_bool_param(request.GET.get("full_fy"), True)

    cursor = None
    try:
        cursor = conn.cursor()
        payload = build_rework_compare_payload(
            cursor, start_date, end_date, load_full_fy=load_full_fy
        )
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

    if cursor:
        cursor.close()
    conn.close()
    return Response(payload)


@api_view(["GET"])
def dashboard2_customer_complaint(request):
    """Plant Performance — Customer Complaint report dashboard."""
    try:
        from .views import get_tenant_connection, parse_date_range
        from .views_customer_complaint_report import build_customer_complaint_compare_payload
        from .views_efficiency_report import _parse_bool_param
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    load_full_fy = _parse_bool_param(request.GET.get("full_fy"), True)

    cursor = None
    try:
        cursor = conn.cursor()
        payload = build_customer_complaint_compare_payload(
            cursor, start_date, end_date, load_full_fy=load_full_fy
        )
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

    if cursor:
        cursor.close()
    conn.close()
    return Response(payload)


@api_view(["GET"])
def dashboard2_capa(request):
    """Plant Performance — Quality Action Plan (CAPA) report dashboard."""
    try:
        from .views import get_tenant_connection, parse_date_range
        from .views_capa_report import build_capa_compare_payload
        from .views_efficiency_report import _parse_bool_param
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    load_full_fy = _parse_bool_param(request.GET.get("full_fy"), True)

    cursor = None
    try:
        cursor = conn.cursor()
        payload = build_capa_compare_payload(
            cursor, start_date, end_date, load_full_fy=load_full_fy
        )
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

    if cursor:
        cursor.close()
    conn.close()
    return Response(payload)


@api_view(["GET"])
def dashboard2_operator_efficiency(request):
    """Plant Performance — Operator Efficiency (OPREFF) from combined production tables."""
    try:
        from .views import get_tenant_connection, parse_date_range
        from .views_operator_efficiency_report import build_operator_efficiency_compare_payload
        from .views_efficiency_report import _parse_bool_param
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    include_cnc = _parse_bool_param(request.GET.get("cnc"), True)
    include_conv = _parse_bool_param(request.GET.get("conv"), True)
    load_full_fy = _parse_bool_param(request.GET.get("full_fy"), True)

    if not include_cnc and not include_conv:
        return Response({
            "error": "Select at least one machine type (CNC or Conventional).",
        }, status=400)

    cursor = None
    try:
        cursor = conn.cursor()
        payload = build_operator_efficiency_compare_payload(
            cursor, start_date, end_date, include_cnc, include_conv, load_full_fy=load_full_fy
        )
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

    if cursor:
        cursor.close()
    conn.close()
    return Response(payload)


@api_view(["GET"])
def dashboard2_daily_production(request):
    """Plant Performance — Daily Production / Machine Capacity report."""
    try:
        from .views import get_tenant_connection, parse_date_range
        from .views_daily_production_report import build_daily_production_compare_payload
        from .views_efficiency_report import _parse_bool_param
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    load_full_fy = _parse_bool_param(request.GET.get("full_fy"), True)
    machine_filter = (request.GET.get("machineNo") or request.GET.get("machine") or "").strip() or None

    cursor = None
    try:
        cursor = conn.cursor()
        payload = build_daily_production_compare_payload(
            cursor,
            start_date,
            end_date,
            machine_filter=machine_filter,
            load_full_fy=load_full_fy,
        )
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

    if cursor:
        cursor.close()
    conn.close()
    return Response(payload)


# ── Production Value Vs Actual Value (machine capacity × rate) ───────────────

def _pv_running_branch(tbl, date_col, shift_col, mac_col, start_col, end_col, del_col, opr_col=None):
    from .views_daily_production_report import _del_filter, _span_seconds, _col_ref, _q

    del_sql = _del_filter(del_col, "P")
    run_secs = _span_seconds(_col_ref("P", start_col), _col_ref("P", end_col))
    opr_sel = (
        f"LTRIM(RTRIM(CAST(P.{_q(opr_col)} AS NVARCHAR(256))))"
        if opr_col
        else "N''"
    )
    return f"""
        SELECT
            CAST(P.{_q(date_col)} AS DATE) AS ProdDate,
            LTRIM(RTRIM(CAST(P.{_q(shift_col)} AS NVARCHAR(64)))) AS Shift,
            LTRIM(RTRIM(CAST(P.{_q(mac_col)} AS NVARCHAR(128)))) AS MacNo,
            {opr_sel} AS Operator,
            {run_secs} AS RunningSecs
        FROM {_q(tbl)} P
        WHERE P.{_q(date_col)} IS NOT NULL
          AND P.{_q(mac_col)} IS NOT NULL
          AND LTRIM(RTRIM(CAST(P.{_q(mac_col)} AS NVARCHAR(128)))) <> N''
          AND CAST(P.{_q(date_col)} AS DATE) BETWEEN ? AND ?{del_sql}
    """


def _pv_shift_master_cte(schema):
    """SHIFTMASTER — shift name/code + duration (ERP-compatible join)."""
    from .views_daily_production_report import _shift_master_cte

    cte, _, _ = _shift_master_cte(schema)
    return cte


def _pv_shift_join(alias="R"):
    """Match production shift to Shift master (name or shcode)."""
    from .views_daily_production_report import _shift_join_on_r

    return _shift_join_on_r(alias)


def _pv_capped_running(alias="R"):
    return f"""(
        CASE
            WHEN {alias}.RunningSecs > ISNULL(S.ShiftSecs, 0) THEN ISNULL(S.ShiftSecs, 0)
            ELSE {alias}.RunningSecs
        END
    )"""


def _pv_enrich_schema_operators(cursor, schema):
    from .views import find_first_column

    for prefix, tbl in (("pe", schema.get("pe")), ("conv", schema.get("conv")), ("rod", schema.get("rod"))):
        if tbl:
            schema[f"{prefix}_opr"] = find_first_column(
                cursor, tbl, ["oprname", "OprName", "OPRNAME", "operator", "Operator"]
            )
    return schema


def _pv_fetch_production_value_rows(cursor, start_date, end_date, machine_filter=None):
    from .views_daily_production_report import (
        _resolve_daily_production_schema,
        _float_expr,
        _q,
    )

    schema = _resolve_daily_production_schema(cursor)
    if not schema:
        return [], []

    shift_master_cte = _pv_shift_master_cte(schema)
    if not shift_master_cte:
        return [], []

    schema = _pv_enrich_schema_operators(cursor, schema)

    params = [start_date, end_date]
    branches = [
        _pv_running_branch(
            schema["pe"],
            schema["pe_date"],
            schema["pe_shift"],
            schema["pe_mac"],
            schema["pe_runfrom"],
            schema["pe_runto"],
            schema["pe_del"],
            schema.get("pe_opr"),
        )
    ]

    if schema.get("conv") and schema.get("conv_start") and schema.get("conv_end"):
        branches.append(
            _pv_running_branch(
                schema["conv"],
                schema["conv_date"],
                schema["conv_shift"],
                schema["conv_mac"],
                schema["conv_start"],
                schema["conv_end"],
                schema["conv_del"],
                schema.get("conv_opr"),
            )
        )
        params.extend([start_date, end_date])

    if schema.get("rod") and schema.get("rod_start") and schema.get("rod_end"):
        branches.append(
            _pv_running_branch(
                schema["rod"],
                schema["rod_date"],
                schema["rod_shift"],
                schema["rod_mac"],
                schema["rod_start"],
                schema["rod_end"],
                schema["rod_del"],
                schema.get("rod_opr"),
            )
        )
        params.extend([start_date, end_date])

    capped = _pv_capped_running("R")
    capped_rd = _pv_capped_running("RD")
    rate_expr = _float_expr("M", schema["mac_rate"])

    mac_name_sel = (
        f"MAX(LTRIM(RTRIM(CAST(M.{_q(schema['mac_name'])} AS NVARCHAR(256)))))"
        if schema.get("mac_name")
        else "MAX(R.MacNo)"
    )
    mac_name_sel_detail = (
        f"LTRIM(RTRIM(CAST(M.{_q(schema['mac_name'])} AS NVARCHAR(256))))"
        if schema.get("mac_name")
        else "RD.MacNo"
    )

    machine_sql = ""
    if machine_filter:
        mac_parts = [p.strip() for p in machine_filter.split(",") if p.strip()]
        if len(mac_parts) > 1:
            placeholders = ", ".join(["?" for _ in mac_parts])
            machine_sql = f" AND LTRIM(RTRIM(CAST(R.MacNo AS NVARCHAR(128)))) IN ({placeholders})"
            params.extend(mac_parts)
        elif len(mac_parts) == 1:
            machine_sql = " AND LTRIM(RTRIM(CAST(R.MacNo AS NVARCHAR(128)))) LIKE ?"
            params.append(f"%{mac_parts[0]}%")

    machine_sql_block = f"""
        WITH RUNNINGDATA AS (
            {" UNION ALL ".join(branches)}
        ),
        RUNSUMMARY AS (
            SELECT
                ProdDate,
                Shift,
                MacNo,
                SUM(RunningSecs) AS RunningSecs
            FROM RUNNINGDATA
            GROUP BY ProdDate, Shift, MacNo
        ),
        {shift_master_cte}
        SELECT
            R.MacNo AS MachineNo,
            {mac_name_sel} AS MacName,
            CAST(SUM(S.ShiftSecs) / 3600.0 AS FLOAT) AS PlannedHours,
            CAST(SUM({capped}) / 3600.0 AS FLOAT) AS RunningHours,
            CAST(MAX({rate_expr}) AS FLOAT) AS RatePerHr,
            CAST((SUM(S.ShiftSecs) / 3600.0) * MAX({rate_expr}) AS FLOAT) AS ProductionValue,
            CAST((SUM({capped}) / 3600.0) * MAX({rate_expr}) AS FLOAT) AS ActualValue,
            CAST(
                CASE
                    WHEN SUM(S.ShiftSecs) = 0 THEN 0.0
                    ELSE (SUM({capped}) * 100.0 / NULLIF(SUM(S.ShiftSecs), 0))
                END AS FLOAT
            ) AS ActualPct,
            CAST(
                ((SUM(S.ShiftSecs) - SUM({capped})) / 3600.0) * MAX({rate_expr})
                AS FLOAT
            ) AS LossValue
        FROM RUNSUMMARY R
        INNER JOIN SHIFTMASTER S ON {_pv_shift_join("R")}
        INNER JOIN {_q(schema['mac'])} M
            ON LTRIM(RTRIM(CAST(R.MacNo AS NVARCHAR(128))))
             = LTRIM(RTRIM(CAST(M.{_q(schema['mac_no'])} AS NVARCHAR(128))))
        WHERE 1=1{machine_sql}
        GROUP BY R.MacNo
        ORDER BY R.MacNo
    """

    detail_sql = f"""
        WITH RUNNINGDATA AS (
            {" UNION ALL ".join(branches)}
        ),
        RUNSUMMARY AS (
            SELECT
                ProdDate,
                Shift,
                MacNo,
                SUM(RunningSecs) AS RunningSecs
            FROM RUNNINGDATA
            GROUP BY ProdDate, Shift, MacNo
        ),
        {shift_master_cte}
        SELECT
            RD.ProdDate AS EntryDate,
            RD.Shift AS ShiftName,
            RD.MacNo,
            {mac_name_sel_detail} AS MacName,
            CAST({rate_expr} AS FLOAT) AS RatePerHr,
            CAST(ISNULL(S.ShiftSecs, 0) / 3600.0 AS FLOAT) AS PlannedHours,
            CAST({capped_rd} / 3600.0 AS FLOAT) AS RunningHours,
            CAST((ISNULL(S.ShiftSecs, 0) / 3600.0) * ({rate_expr}) AS FLOAT) AS ProductionValue,
            CAST(({capped_rd} / 3600.0) * ({rate_expr}) AS FLOAT) AS ActualValue,
            CAST(
                CASE
                    WHEN ISNULL(S.ShiftSecs, 0) = 0 THEN 0.0
                    ELSE ({capped_rd} * 100.0 / NULLIF(S.ShiftSecs, 0))
                END AS FLOAT
            ) AS ActualPct,
            CAST(
                ((ISNULL(S.ShiftSecs, 0) - {capped_rd}) / 3600.0) * ({rate_expr})
                AS FLOAT
            ) AS LossValue
        FROM RUNSUMMARY RD
        INNER JOIN SHIFTMASTER S ON {_pv_shift_join("RD")}
        INNER JOIN {_q(schema['mac'])} M
            ON LTRIM(RTRIM(CAST(RD.MacNo AS NVARCHAR(128))))
             = LTRIM(RTRIM(CAST(M.{_q(schema['mac_no'])} AS NVARCHAR(128))))
        WHERE 1=1{machine_sql.replace("R.MacNo", "RD.MacNo")}
        ORDER BY RD.ProdDate, RD.Shift, RD.MacNo
    """

    cursor.execute(machine_sql_block, params)
    mac_cols = [d[0] for d in cursor.description]
    machine_rows = [dict(zip(mac_cols, row)) for row in (cursor.fetchall() or [])]

    cursor.execute(detail_sql, params)
    det_cols = [d[0] for d in cursor.description]
    detail_rows = [dict(zip(det_cols, row)) for row in (cursor.fetchall() or [])]

    return machine_rows, detail_rows


def _pv_format_date(val):
    from datetime import datetime

    if val is None:
        return ""
    if hasattr(val, "strftime"):
        return val.strftime("%Y-%m-%d")
    raw = str(val).strip()
    if len(raw) >= 10 and raw[4:5] == "-":
        return raw[:10]
    try:
        return datetime.strptime(raw[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
    except Exception:
        return raw[:10] if raw else ""


def _pv_machine_row_to_payload(rec):
    mac = str(rec.get("MachineNo") or "").strip()
    return {
        "machine": mac,
        "machineName": str(rec.get("MacName") or mac or "—").strip(),
        "plannedHours": round(float(rec.get("PlannedHours") or 0), 2),
        "runningHours": round(float(rec.get("RunningHours") or 0), 2),
        "ratePerHr": round(float(rec.get("RatePerHr") or 0), 2),
        "productionValue": round(float(rec.get("ProductionValue") or 0), 2),
        "actualValue": round(float(rec.get("ActualValue") or 0), 2),
        "actualPct": round(float(rec.get("ActualPct") or 0), 2),
        "lossValue": round(float(rec.get("LossValue") or 0), 2),
    }


def _pv_detail_row_to_payload(rec):
    mac = str(rec.get("MacNo") or "").strip()
    return {
        "date": _pv_format_date(rec.get("EntryDate")),
        "shift": str(rec.get("ShiftName") or "—").strip(),
        "machine": mac,
        "machineName": str(rec.get("MacName") or mac or "—").strip(),
        "operator": "—",
        "team": "—",
        "ratePerHr": round(float(rec.get("RatePerHr") or 0), 2),
        "plannedHours": round(float(rec.get("PlannedHours") or 0), 2),
        "runningHours": round(float(rec.get("RunningHours") or 0), 2),
        "productionValue": round(float(rec.get("ProductionValue") or 0), 2),
        "actualValue": round(float(rec.get("ActualValue") or 0), 2),
        "actualPct": round(float(rec.get("ActualPct") or 0), 2),
        "lossValue": round(float(rec.get("LossValue") or 0), 2),
    }


def _pv_detail_from_daily_row(row):
    """Map daily-production row → production-value detail shape."""
    prod_val = float(row.get("plannedValue") or 0)
    act_val = float(row.get("runningValue") or 0)
    planned_h = float(row.get("planned") or 0)
    running_h = float(row.get("runningHours") or 0)
    if prod_val > 0:
        actual_pct = round((act_val / prod_val) * 100, 2)
    elif planned_h > 0:
        actual_pct = round((running_h / planned_h) * 100, 2)
    else:
        actual_pct = 0.0
    return {
        "date": row.get("date") or "",
        "shift": row.get("shift") or "—",
        "machine": row.get("machine") or "—",
        "machineName": row.get("machineName") or row.get("machine") or "—",
        "operator": "—",
        "team": "—",
        "ratePerHr": round(float(row.get("rate") or 0), 2),
        "plannedHours": round(planned_h, 2),
        "runningHours": round(running_h, 2),
        "productionValue": round(prod_val, 2),
        "actualValue": round(act_val, 2),
        "actualPct": actual_pct,
        "lossValue": round(float(row.get("loss") or 0), 2),
    }


def _pv_aggregate_machines_from_detail(detail_rows):
    mac_from_detail = {}
    for row in detail_rows:
        mac = row.get("machine") or "—"
        if mac not in mac_from_detail:
            mac_from_detail[mac] = {
                "machine": mac,
                "machineName": row.get("machineName") or mac,
                "plannedHours": 0.0,
                "runningHours": 0.0,
                "ratePerHr": 0.0,
                "productionValue": 0.0,
                "actualValue": 0.0,
                "lossValue": 0.0,
            }
        g = mac_from_detail[mac]
        g["plannedHours"] += float(row.get("plannedHours") or 0)
        g["runningHours"] += float(row.get("runningHours") or 0)
        g["productionValue"] += float(row.get("productionValue") or 0)
        g["actualValue"] += float(row.get("actualValue") or 0)
        g["lossValue"] += float(row.get("lossValue") or 0)
        if float(row.get("ratePerHr") or 0) > float(g.get("ratePerHr") or 0):
            g["ratePerHr"] = float(row.get("ratePerHr") or 0)

    display_machine = []
    for mac in sorted(mac_from_detail.keys()):
        g = mac_from_detail[mac]
        prod_val = round(g["productionValue"], 2)
        act_val = round(g["actualValue"], 2)
        actual_pct = round((act_val / prod_val) * 100, 2) if prod_val > 0 else 0.0
        display_machine.append({
            "machine": g["machine"],
            "machineName": g["machineName"],
            "plannedHours": round(g["plannedHours"], 2),
            "runningHours": round(g["runningHours"], 2),
            "ratePerHr": round(g["ratePerHr"], 2),
            "productionValue": prod_val,
            "actualValue": act_val,
            "actualPct": actual_pct,
            "lossValue": round(g["lossValue"], 2),
        })
    return display_machine


def _pv_enrich_operator_team(cursor, detail_rows, start_date, end_date):
    """Attach operator + department (team) from production entry tables."""
    from .views_daily_production_report import _resolve_daily_production_schema, _del_filter, _q
    from .views_efficiency_report import _resolve_department_join, _legacy_department_join

    if not detail_rows:
        return

    schema = _resolve_daily_production_schema(cursor)
    if not schema:
        return
    schema = _pv_enrich_schema_operators(cursor, schema)

    branches = []
    params = []
    pe_opr = schema.get("pe_opr")
    if pe_opr:
        del_sql = _del_filter(schema["pe_del"], "P")
        branches.append(f"""
            SELECT
                CAST(P.{_q(schema['pe_date'])} AS DATE) AS ProdDate,
                LTRIM(RTRIM(CAST(P.{_q(schema['pe_shift'])} AS NVARCHAR(64)))) AS Shift,
                LTRIM(RTRIM(CAST(P.{_q(schema['pe_mac'])} AS NVARCHAR(128)))) AS MacNo,
                LTRIM(RTRIM(CAST(P.{_q(pe_opr)} AS NVARCHAR(256)))) AS Operator
            FROM {_q(schema['pe'])} P
            WHERE CAST(P.{_q(schema['pe_date'])} AS DATE) BETWEEN ? AND ?
              AND P.{_q(pe_opr)} IS NOT NULL
              AND LTRIM(RTRIM(CAST(P.{_q(pe_opr)} AS NVARCHAR(256)))) <> N''{del_sql}
        """)
        params.extend([start_date, end_date])

    for prefix, tbl, date_col, shift_col, mac_col, del_col in (
        ("conv", schema.get("conv"), schema.get("conv_date"), schema.get("conv_shift"), schema.get("conv_mac"), schema.get("conv_del")),
        ("rod", schema.get("rod"), schema.get("rod_date"), schema.get("rod_shift"), schema.get("rod_mac"), schema.get("rod_del")),
    ):
        opr_col = schema.get(f"{prefix}_opr")
        if not tbl or not date_col or not opr_col:
            continue
        del_sql = _del_filter(del_col, "P")
        branches.append(f"""
            SELECT
                CAST(P.{_q(date_col)} AS DATE) AS ProdDate,
                LTRIM(RTRIM(CAST(P.{_q(shift_col)} AS NVARCHAR(64)))) AS Shift,
                LTRIM(RTRIM(CAST(P.{_q(mac_col)} AS NVARCHAR(128)))) AS MacNo,
                LTRIM(RTRIM(CAST(P.{_q(opr_col)} AS NVARCHAR(256)))) AS Operator
            FROM {_q(tbl)} P
            WHERE CAST(P.{_q(date_col)} AS DATE) BETWEEN ? AND ?
              AND P.{_q(opr_col)} IS NOT NULL
              AND LTRIM(RTRIM(CAST(P.{_q(opr_col)} AS NVARCHAR(256)))) <> N''{del_sql}
        """)
        params.extend([start_date, end_date])

    if not branches:
        return

    dept_cfg = _resolve_department_join(cursor) or _legacy_department_join()
    dept_expr = dept_cfg["dept_expr"]
    dept_joins = dept_cfg["joins"].replace("AR.Operator", "OP.Operator")

    sql = f"""
        WITH OPMAP AS (
            {" UNION ALL ".join(branches)}
        ),
        OPDEDUP AS (
            SELECT
                ProdDate,
                Shift,
                MacNo,
                MAX(Operator) AS Operator
            FROM OPMAP
            WHERE Operator IS NOT NULL AND LTRIM(RTRIM(Operator)) <> N''
            GROUP BY ProdDate, Shift, MacNo
        )
        SELECT
            OP.ProdDate,
            OP.Shift,
            OP.MacNo,
            OP.Operator,
            {dept_expr} AS Team
        FROM OPDEDUP OP
        {dept_joins}
    """

    try:
        cursor.execute(sql, params)
        lookup = {}
        for row in cursor.fetchall() or []:
            d = _pv_format_date(row[0])
            shift = str(row[1] or "").strip()
            mac = str(row[2] or "").strip()
            operator = str(row[3] or "").strip() or "—"
            team = str(row[4] or "").strip() or "—"
            lookup[(d, shift, mac)] = {"operator": operator, "team": team}

        for row in detail_rows:
            key = (row.get("date") or "", str(row.get("shift") or "").strip(), str(row.get("machine") or "").strip())
            hit = lookup.get(key)
            if not hit:
                continue
            row["operator"] = hit["operator"]
            row["team"] = hit["team"]
    except Exception:
        return


def _build_production_value_compare_payload(
    cursor, start_date, end_date, machine_filter=None, load_full_fy=True
):
    from datetime import date

    from .views import current_financial_year

    # User SQL uses @FromDate/@ToDate directly — query the selected range first.
    query_start, query_end = start_date, end_date

    machine_raw, detail_raw = _pv_fetch_production_value_rows(
        cursor, query_start, query_end, machine_filter=machine_filter
    )
    if not machine_raw and not detail_raw and load_full_fy:
        fy_start, _fy_end = current_financial_year()
        prev_start = date(fy_start.year - 1, 4, 1)
        prev_end = date(fy_start.year, 3, 31)
        machine_raw, detail_raw = _pv_fetch_production_value_rows(
            cursor, prev_start, prev_end, machine_filter=machine_filter
        )
        if machine_raw or detail_raw:
            query_start, query_end = prev_start, prev_end

    display_machine = [_pv_machine_row_to_payload(r) for r in machine_raw]
    display_detail = [_pv_detail_row_to_payload(r) for r in detail_raw]
    for row in display_detail:
        row.setdefault("operator", "—")
        row.setdefault("team", "—")
    _pv_enrich_operator_team(cursor, display_detail, query_start, query_end)

    # If prev-FY fallback returned a wider range, scope rows to the requested filter dates.
    if str(query_start) != str(start_date) or str(query_end) != str(end_date):
        from datetime import datetime

        scoped_detail = []
        for row in display_detail:
            d = row.get("date") or ""
            if not d:
                continue
            try:
                dt = datetime.strptime(d[:10], "%Y-%m-%d").date()
                if start_date <= dt <= end_date:
                    scoped_detail.append(row)
            except Exception:
                continue
        if scoped_detail:
            display_detail = scoped_detail
            display_machine = _pv_aggregate_machines_from_detail(display_detail)

    if machine_filter:
        mac_parts = [p.strip().lower() for p in machine_filter.split(",") if p.strip()]
        if mac_parts:
            display_machine = [
                r for r in display_machine
                if any(p in str(r.get("machine") or "").lower() or p in str(r.get("machineName") or "").lower() for p in mac_parts)
            ]
            display_detail = [
                r for r in display_detail
                if any(p in str(r.get("machine") or "").lower() or p in str(r.get("machineName") or "").lower() for p in mac_parts)
            ]

    total_prod = round(sum(float(r.get("productionValue") or 0) for r in display_machine), 2)
    total_actual = round(sum(float(r.get("actualValue") or 0) for r in display_machine), 2)
    total_loss = round(sum(float(r.get("lossValue") or 0) for r in display_machine), 2)
    avg_actual_pct = (
        round(sum(float(r.get("actualPct") or 0) for r in display_machine) / len(display_machine), 2)
        if display_machine else 0.0
    )

    best_machine = "—"
    best_actual = 0.0
    best_pct_machine = "—"
    best_pct = 0.0
    for row in display_machine:
        av = float(row.get("actualValue") or 0)
        if av > best_actual:
            best_actual = av
            best_machine = row.get("machineName") or row.get("machine") or "—"
        ap = float(row.get("actualPct") or 0)
        if ap > best_pct:
            best_pct = ap
            best_pct_machine = f"{row.get('machineName') or row.get('machine') or '—'} ({ap:.1f}%)"

    machines = sorted({r.get("machine") for r in display_machine if r.get("machine")})
    machineNames = sorted(
        {(r.get("machineName") or r.get("machine")) for r in display_machine if r.get("machine")},
        key=lambda x: str(x).lower(),
    )
    operators = sorted({r.get("operator") for r in display_detail if r.get("operator") and r.get("operator") != "—"})
    teams = sorted({r.get("team") for r in display_detail if r.get("team") and r.get("team") != "—"})

    return {
        "from": str(start_date),
        "to": str(end_date),
        "queryFrom": str(query_start),
        "queryTo": str(query_end),
        "machineRows": display_machine,
        "detailRows": display_detail,
        "rows": display_machine,
        "rowCount": len(display_machine),
        "detailCount": len(display_detail),
        "kpis": {
            "totalProductionValue": total_prod,
            "totalActualValue": total_actual,
            "totalLossValue": total_loss,
            "avgActualPct": avg_actual_pct,
            "bestMachine": best_machine,
            "highestProfitability": best_pct_machine,
        },
        "filterOptions": {
            "machines": machines,
            "machineNames": machineNames,
            "operators": operators,
            "teams": teams,
        },
    }


@api_view(["GET"])
def dashboard2_production_value(request):
    """Plant Performance — Production Value Vs Actual Value."""
    try:
        from .views import get_tenant_connection, parse_date_range
        from .views_efficiency_report import _parse_bool_param

        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    load_full_fy = _parse_bool_param(request.GET.get("full_fy"), True)
    machine_filter = (request.GET.get("machineNo") or request.GET.get("machine") or "").strip() or None

    cursor = None
    try:
        cursor = conn.cursor()
        payload = _build_production_value_compare_payload(
            cursor,
            start_date,
            end_date,
            machine_filter=machine_filter,
            load_full_fy=load_full_fy,
        )
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

    if cursor:
        cursor.close()
    conn.close()
    return Response(payload)


# ── Machine Efficiency (availability from running / idle / setting) ─────────

def _me_resolve_schema(cursor):
    """Extend daily-production schema with setting, prod/entry ids, and idle tables."""
    from .views import find_first_column, find_first_table
    from .views_daily_production_report import _resolve_daily_production_schema

    schema = _resolve_daily_production_schema(cursor)
    if not schema:
        return None

    schema["pe_setfrom"] = find_first_column(cursor, schema["pe"], ["setfrom", "SetFrom", "SETFROM"])
    schema["pe_setto"] = find_first_column(cursor, schema["pe"], ["setto", "SetTo", "SETTO"])
    schema["pe_prodid"] = find_first_column(cursor, schema["pe"], ["prodid", "ProdId", "PRODID", "ProdID"])

    if schema.get("conv"):
        schema["conv_setfrom"] = find_first_column(cursor, schema["conv"], ["setfrom", "SetFrom", "SETFROM"])
        schema["conv_setto"] = find_first_column(cursor, schema["conv"], ["setto", "SetTo", "SETTO"])
        schema["conv_entryno"] = find_first_column(cursor, schema["conv"], ["entryno", "EntryNo", "ENTRYNO"])

    if schema.get("rod"):
        schema["rod_setfrom"] = find_first_column(cursor, schema["rod"], ["setfrom", "SetFrom", "SETFROM"])
        schema["rod_setto"] = find_first_column(cursor, schema["rod"], ["setto", "SetTo", "SETTO"])
        schema["rod_entryno"] = find_first_column(cursor, schema["rod"], ["entryno", "EntryNo", "ENTRYNO"])

    schema["pie"] = find_first_table(cursor, ["Prod_IdleEntry", "prod_idleentry", "PROD_IDLEENTRY"])
    schema["cie"] = find_first_table(cursor, ["conv_IdleEntry", "conv_idleentry", "CONV_IDLEENTRY"])
    schema["rie"] = find_first_table(cursor, ["conv_RodIdleEntry", "conv_rodidleentry", "CONV_RODIDLEENTRY"])
    schema["idle_reasons"] = find_first_table(cursor, ["IdleReasons", "idlereasons", "IDLEREASONS"])

    if schema.get("pie"):
        schema["pie_prodid"] = find_first_column(cursor, schema["pie"], ["prodid", "ProdId", "PRODID"])
        schema["pie_reasons"] = find_first_column(cursor, schema["pie"], ["reasons", "Reasons", "REASONS"])
        schema["pie_tottime"] = find_first_column(cursor, schema["pie"], ["tottime", "TotTime", "TOTTIME"])
        schema["pie_del"] = find_first_column(cursor, schema["pie"], ["deleted", "Deleted", "IsDeleted"])

    if schema.get("cie"):
        schema["cie_entryno"] = find_first_column(cursor, schema["cie"], ["entryno", "EntryNo", "ENTRYNO"])
        schema["cie_reasons"] = find_first_column(cursor, schema["cie"], ["reasons", "Reasons", "REASONS"])
        schema["cie_tottime"] = find_first_column(cursor, schema["cie"], ["tottime", "TotTime", "TOTTIME"])
        schema["cie_del"] = find_first_column(cursor, schema["cie"], ["deleted", "Deleted", "IsDeleted"])

    if schema.get("rie"):
        schema["rie_entryno"] = find_first_column(cursor, schema["rie"], ["entryno", "EntryNo", "ENTRYNO"])
        schema["rie_reasons"] = find_first_column(cursor, schema["rie"], ["reasons", "Reasons", "REASONS"])
        schema["rie_tottime"] = find_first_column(cursor, schema["rie"], ["tottime", "TotTime", "TOTTIME"])
        schema["rie_del"] = find_first_column(cursor, schema["rie"], ["deleted", "Deleted", "IsDeleted"])

    if schema.get("idle_reasons"):
        schema["ir_reasons"] = find_first_column(
            cursor, schema["idle_reasons"], ["IdleReasons", "idlereasons", "IDLEReasons", "reasons"]
        )
        schema["ir_isaccept"] = find_first_column(
            cursor, schema["idle_reasons"], ["IsAccept", "isaccept", "ISACCEPT"]
        )
        schema["ir_del"] = find_first_column(cursor, schema["idle_reasons"], ["deleted", "Deleted", "IsDeleted"])

    schema["mac_type"] = find_first_column(
        cursor, schema["mac"], ["mactype", "MacType", "MACTYPE", "MachineType", "machinetype"]
    )
    return schema


def _me_accepted_idle_sub(schema, idle_key, parent_id_expr):
    """Accepted idle seconds subquery (IdleReasons.IsAccept = 1)."""
    from .views_daily_production_report import _del_filter, _q

    idle_tbl = schema.get(idle_key)
    if not idle_tbl or not schema.get("idle_reasons"):
        return "0"

    prefix = idle_key
    entry_col = schema.get(f"{prefix}_entryno") if prefix != "pie" else schema.get("pie_prodid")
    reasons_col = schema.get(f"{prefix}_reasons")
    tottime_col = schema.get(f"{prefix}_tottime")
    ir_reasons = schema.get("ir_reasons")
    if not all([entry_col, reasons_col, tottime_col, ir_reasons]):
        return "0"

    del_sql = _del_filter(schema.get(f"{prefix}_del"), "IE")
    ir_del = _del_filter(schema.get("ir_del"), "ir")
    is_accept = schema.get("ir_isaccept") or "IsAccept"

    return f"""ISNULL((
        SELECT SUM(DATEDIFF(SECOND, '19000101', IE.{_q(tottime_col)}))
        FROM {_q(idle_tbl)} IE
        INNER JOIN {_q(schema['idle_reasons'])} ir
            ON IE.{_q(reasons_col)} = ir.{_q(ir_reasons)}{ir_del}
        WHERE IE.{_q(entry_col)} = {parent_id_expr}
          AND ISNULL(ir.{_q(is_accept)}, 0) = 1{del_sql}
    ), 0)"""


def _me_production_branch(schema, source_key):
    """One UNION branch: running, setting, accepted-idle per production row."""
    from .views_daily_production_report import _del_filter, _span_seconds, _col_ref, _q

    if source_key == "pe":
        tbl = schema["pe"]
        date_col = schema["pe_date"]
        mac_col = schema["pe_mac"]
        run_start, run_end = schema["pe_runfrom"], schema["pe_runto"]
        set_start, set_end = schema.get("pe_setfrom"), schema.get("pe_setto")
        del_col = schema["pe_del"]
        id_col = schema.get("pe_prodid")
        idle_key = "pie"
        mac_type = "N'CNC'"
        alias = "pe"
    elif source_key == "conv":
        if not schema.get("conv"):
            return None
        tbl = schema["conv"]
        date_col = schema["conv_date"]
        mac_col = schema["conv_mac"]
        run_start, run_end = schema["conv_start"], schema["conv_end"]
        set_start, set_end = schema.get("conv_setfrom"), schema.get("conv_setto")
        del_col = schema["conv_del"]
        id_col = schema.get("conv_entryno")
        idle_key = "cie"
        mac_type = "N'Conventional'"
        alias = "pe"
    elif source_key == "rod":
        if not schema.get("rod"):
            return None
        tbl = schema["rod"]
        date_col = schema["rod_date"]
        mac_col = schema["rod_mac"]
        run_start, run_end = schema["rod_start"], schema["rod_end"]
        set_start, set_end = schema.get("rod_setfrom"), schema.get("rod_setto")
        del_col = schema["rod_del"]
        id_col = schema.get("rod_entryno")
        idle_key = "rie"
        mac_type = "N'Conventional'"
        alias = "pe"
    else:
        return None

    del_sql = _del_filter(del_col, alias)
    run_secs = _span_seconds(_col_ref(alias, run_start), _col_ref(alias, run_end))
    if set_start and set_end:
        set_secs = _span_seconds(_col_ref(alias, set_start), _col_ref(alias, set_end))
    else:
        set_secs = "0"

    parent_id = _col_ref(alias, id_col) if id_col else None
    accepted_idle = _me_accepted_idle_sub(schema, idle_key, parent_id) if parent_id else "0"

    return f"""
        SELECT
            LTRIM(RTRIM(CAST({alias}.{_q(mac_col)} AS NVARCHAR(128)))) AS macno,
            CAST({alias}.{_q(date_col)} AS DATE) AS ProdDate,
            {mac_type} AS MacType,
            {run_secs} AS RunningSecs,
            {set_secs} AS SettingSecs,
            {accepted_idle} AS AcceptedIdleSecs
        FROM {_q(tbl)} {alias}
        WHERE {alias}.{_q(date_col)} IS NOT NULL
          AND {alias}.{_q(mac_col)} IS NOT NULL
          AND LTRIM(RTRIM(CAST({alias}.{_q(mac_col)} AS NVARCHAR(128)))) <> N''
          AND CAST({alias}.{_q(date_col)} AS DATE) BETWEEN ? AND ?{del_sql}
    """


def _me_availability_pct(running_secs, idle_secs, setting_secs):
    running = float(running_secs or 0)
    if running <= 0:
        return 0.0
    lost = float(idle_secs or 0) + float(setting_secs or 0)
    return round(((running - lost) * 100.0) / running, 2)


def _me_passes_eff_limit(pct, eff_limit):
    """Match Plant Performance UI effLimit filter (>90, <80, etc.)."""
    if eff_limit is None:
        return True
    raw = str(eff_limit).strip()
    if not raw:
        return True
    import re

    m = re.match(r"^([><]=?|=)?([0-9.]+)(%?)$", raw.replace(" ", ""))
    if m:
        op = m.group(1) or "<"
        val = float(m.group(2))
        if op == ">":
            return pct > val
        if op == ">=":
            return pct >= val
        if op == "<":
            return pct < val
        if op == "<=":
            return pct <= val
        if op == "=":
            return pct == val
        return True
    try:
        return pct < float(raw)
    except (TypeError, ValueError):
        return True


def _me_fetch_detail_rows(cursor, start_date, end_date, machine_filter=None):
    schema = _me_resolve_schema(cursor)
    if not schema:
        return []

    branches = []
    params = []
    for key in ("pe", "conv", "rod"):
        branch = _me_production_branch(schema, key)
        if branch:
            branches.append(branch)
            params.extend([start_date, end_date])

    if not branches:
        return []

    machine_sql = ""
    if machine_filter:
        mf = machine_filter.strip()
        machine_sql = " AND LTRIM(RTRIM(CAST(PD.macno AS NVARCHAR(128)))) LIKE ?"
        params.append(f"%{mf}%")

    sql = f"""
        WITH ProductionData AS (
            {" UNION ALL ".join(branches)}
        ),
        DailySummary AS (
            SELECT
                PD.macno,
                PD.ProdDate,
                MAX(PD.MacType) AS MacType,
                SUM(PD.RunningSecs) AS TotalRunningSecs,
                SUM(PD.AcceptedIdleSecs) AS TotalAcceptedIdleSecs,
                SUM(PD.SettingSecs) AS TotalSettingSecs
            FROM ProductionData PD
            GROUP BY PD.macno, PD.ProdDate
        )
        SELECT
            macno,
            ProdDate,
            MacType,
            TotalRunningSecs,
            TotalAcceptedIdleSecs,
            TotalSettingSecs
        FROM DailySummary
        WHERE 1=1{machine_sql.replace("PD.macno", "macno")}
        ORDER BY macno, ProdDate
    """
    cursor.execute(sql, params)
    cols = [c[0] for c in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


def _me_format_display_date(dt_val):
    if dt_val is None:
        return "—"
    if hasattr(dt_val, "strftime"):
        return dt_val.strftime("%d-%m-%Y")
    raw = str(dt_val).strip()[:10]
    try:
        from datetime import datetime
        parsed = datetime.strptime(raw, "%Y-%m-%d")
        return parsed.strftime("%d-%m-%Y")
    except Exception:
        return raw or "—"


def _me_month_chart_label(dt_val):
    _labels = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
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
    if mo < 1 or mo > 12:
        return "—"
    return f"{_labels[mo - 1]} {yr}"


def _me_detail_row_to_payload(rec):
    running_secs = float(rec.get("TotalRunningSecs") or 0)
    idle_secs = float(rec.get("TotalAcceptedIdleSecs") or 0)
    setting_secs = float(rec.get("TotalSettingSecs") or 0)
    avail = _me_availability_pct(running_secs, idle_secs, setting_secs)
    idle_pct = round((idle_secs + setting_secs) * 100.0 / running_secs, 2) if running_secs > 0 else 0.0
    mac = str(rec.get("macno") or "").strip() or "—"
    mac_type = str(rec.get("MacType") or "—").strip() or "—"

    return {
        "date": _me_format_display_date(rec.get("ProdDate")),
        "dateIso": str(rec.get("ProdDate") or "")[:10],
        "machine": mac,
        "machineName": mac,
        "machineType": mac_type,
        "type": mac_type,
        "totalRunningSecs": round(running_secs, 2),
        "acceptedIdleSecs": round(idle_secs, 2),
        "settingSecs": round(setting_secs, 2),
        "runningHours": round(running_secs / 3600.0, 2),
        "idleHours": round(idle_secs / 3600.0, 2),
        "settingHours": round(setting_secs / 3600.0, 2),
        "availabilityPercent": avail,
        "machinePct": avail,
        "idlePct": idle_pct,
        "oaEff": avail,
        "qfEff": avail,
    }


def _me_aggregate_machines(detail_rows):
    by_mac = {}
    for row in detail_rows:
        mac = row.get("machine") or "—"
        if mac not in by_mac:
            by_mac[mac] = {
                "machine": mac,
                "machineName": mac,
                "machineType": row.get("machineType") or row.get("type") or "—",
                "type": row.get("machineType") or row.get("type") or "—",
                "totalRunningSecs": 0.0,
                "acceptedIdleSecs": 0.0,
                "settingSecs": 0.0,
            }
        g = by_mac[mac]
        g["totalRunningSecs"] += float(row.get("totalRunningSecs") or 0)
        g["acceptedIdleSecs"] += float(row.get("acceptedIdleSecs") or 0)
        g["settingSecs"] += float(row.get("settingSecs") or 0)

    machine_rows = []
    for mac, g in sorted(by_mac.items(), key=lambda x: str(x[0]).lower()):
        avail = _me_availability_pct(g["totalRunningSecs"], g["acceptedIdleSecs"], g["settingSecs"])
        idle_pct = (
            round((g["acceptedIdleSecs"] + g["settingSecs"]) * 100.0 / g["totalRunningSecs"], 2)
            if g["totalRunningSecs"] > 0 else 0.0
        )
        machine_rows.append({
            **g,
            "runningHours": round(g["totalRunningSecs"] / 3600.0, 2),
            "idleHours": round(g["acceptedIdleSecs"] / 3600.0, 2),
            "settingHours": round(g["settingSecs"] / 3600.0, 2),
            "availabilityPercent": avail,
            "machinePct": avail,
            "idlePct": idle_pct,
            "oaEff": avail,
            "qfEff": avail,
        })

    ranked = sorted(machine_rows, key=lambda r: float(r.get("availabilityPercent") or 0), reverse=True)
    for idx, row in enumerate(ranked, start=1):
        row["rank"] = idx
    return ranked


def _me_build_monthwise_report(detail_rows):
    """Average availability % per calendar month (for chart)."""
    from collections import defaultdict

    buckets = defaultdict(lambda: {"running": 0.0, "idle": 0.0, "setting": 0.0, "sort_key": ""})
    for row in detail_rows:
        iso = row.get("dateIso") or ""
        if len(iso) < 7:
            continue
        sort_key = iso[:7]
        label = _me_month_chart_label(iso)
        b = buckets[sort_key]
        b["sort_key"] = sort_key
        b["label"] = label
        b["running"] += float(row.get("totalRunningSecs") or 0)
        b["idle"] += float(row.get("acceptedIdleSecs") or 0)
        b["setting"] += float(row.get("settingSecs") or 0)

    labels = []
    data = []
    for sort_key in sorted(buckets.keys()):
        b = buckets[sort_key]
        labels.append(b.get("label") or sort_key)
        data.append(_me_availability_pct(b["running"], b["idle"], b["setting"]))
    return {"labels": labels, "data": data}


def _build_machine_efficiency_compare_payload(
    cursor, start_date, end_date, machine_filter=None, eff_limit=None, load_full_fy=True
):
    from datetime import date

    from .views import current_financial_year

    query_start, query_end = start_date, end_date
    raw_rows = _me_fetch_detail_rows(cursor, query_start, query_end, machine_filter)

    if not raw_rows and load_full_fy:
        fy_start, _fy_end = current_financial_year()
        prev_start = date(fy_start.year - 1, 4, 1)
        prev_end = date(fy_start.year, 3, 31)
        raw_rows = _me_fetch_detail_rows(cursor, prev_start, prev_end, machine_filter)
        if raw_rows:
            query_start, query_end = prev_start, prev_end

    detail_payload = [_me_detail_row_to_payload(r) for r in raw_rows]

    if eff_limit:
        detail_payload = [
            r for r in detail_payload if _me_passes_eff_limit(float(r.get("machinePct") or 0), eff_limit)
        ]

    machine_rows = _me_aggregate_machines(detail_payload)
    report = _me_build_monthwise_report(detail_payload)

    total_running = sum(float(r.get("totalRunningSecs") or 0) for r in detail_payload)
    total_idle = sum(float(r.get("acceptedIdleSecs") or 0) for r in detail_payload)
    total_setting = sum(float(r.get("settingSecs") or 0) for r in detail_payload)
    avg_avail = _me_availability_pct(total_running, total_idle, total_setting)

    machines = sorted({r.get("machine") for r in detail_payload if r.get("machine") and r.get("machine") != "—"})

    return {
        "from": str(start_date),
        "to": str(end_date),
        "queryFrom": str(query_start),
        "queryTo": str(query_end),
        "machineRows": machine_rows,
        "detailRows": detail_payload,
        "rows": machine_rows,
        "rowCount": len(machine_rows),
        "detailCount": len(detail_payload),
        "report": report,
        "kpis": {
            "avgAvailabilityPct": avg_avail,
            "avgMachinePct": avg_avail,
            "totalRunningHours": round(total_running / 3600.0, 2),
            "totalIdleHours": round(total_idle / 3600.0, 2),
            "totalSettingHours": round(total_setting / 3600.0, 2),
            "machineCount": len(machine_rows),
        },
        "filterOptions": {
            "machines": machines,
        },
    }


@api_view(["GET"])
def dashboard2_machine_efficiency(request):
    """Plant Performance — Machine Efficiency (availability from running / idle / setting).

    SQL: ProductionEntry ∪ ConvProductionEntry ∪ ConvProductionEntryRod
         → grouped by macno
         → AvailabilityPercent = (RunningSecs - AcceptedIdleSecs - SettingSecs) * 100 / RunningSecs
    """
    try:
        from .views import get_tenant_connection, parse_date_range
        from .views_machine_availability_report import (
            build_machine_availability_payload,
            _parse_bool_param,
        )
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    load_full_fy = _parse_bool_param(request.GET.get("full_fy"), True)
    machine_filter = (request.GET.get("machineNo") or request.GET.get("machine") or "").strip() or None
    eff_limit = (request.GET.get("effLimit") or request.GET.get("eff_limit") or "").strip() or None

    cursor = None
    try:
        cursor = conn.cursor()
        payload = build_machine_availability_payload(
            cursor,
            start_date,
            end_date,
            machine_filter=machine_filter,
            eff_limit=eff_limit,
            load_full_fy=load_full_fy,
        )
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

    if cursor:
        cursor.close()
    conn.close()
    return Response(payload)


dashboard3_rejection = dashboard2_rejection
dashboard3_rework = dashboard2_rework

_MONTH_ABB = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]
_MONTH_FULL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def _po_month_labels(dt_val):
    """Return (Apr-26, April 2026) style labels from a PO date."""
    if dt_val is None:
        return "—", "—"
    if hasattr(dt_val, "month") and hasattr(dt_val, "year"):
        mo, yr = dt_val.month, dt_val.year
        po_date_str = dt_val.strftime("%Y-%m-%d")
    else:
        raw = str(dt_val).strip()
        po_date_str = raw[:10] if len(raw) >= 10 else raw
        mo = yr = None
        try:
            from datetime import datetime
            parsed = datetime.strptime(po_date_str, "%Y-%m-%d")
            mo, yr = parsed.month, parsed.year
        except Exception:
            try:
                from datetime import datetime
                parsed = datetime.strptime(po_date_str[:10], "%d-%m-%Y")
                mo, yr = parsed.month, parsed.year
                po_date_str = parsed.strftime("%Y-%m-%d")
            except Exception:
                return "—", "—"
    if not mo or not yr or mo < 1 or mo > 12:
        return "—", "—"
    return (
        f"{_MONTH_ABB[mo - 1]}-{str(yr)[-2:]}",
        f"{_MONTH_FULL[mo - 1]} {yr}",
    )


def _fetch_plant_performance_purchase_value_rows(conn, tenant):
    """
    PO line items for Plant Performance Purchase Value report.
    SQL/logic aligned with views_purchaseanalysis.purchase_analysis_po_table.
    """
    from .views import resolve_erp_table, find_column_ci

    company_code = tenant.get("company_code")
    company_candidates = ["company_code", "CompanyCode", "compcode", "CompCode", "ccode", "CCode"]

    cursor = conn.cursor()
    rows_out = []

    sch_po, nm_po, q_po = resolve_erp_table(cursor, ["POMas", "pomas", "POMAS", "PoMas"])
    sch_det, nm_det, q_det = resolve_erp_table(cursor, ["PODet", "podet", "PODET", "PoDet"])
    sch_grn, nm_grn, q_grn = resolve_erp_table(cursor, ["grninsubdet", "GRNInSubDet", "GrnInSubDet", "GRNINSUBDET"])
    sch_gm, nm_gm, q_gm = resolve_erp_table(cursor, ["grn_mas", "GRN_MAS", "Grn_Mas", "GrnMas"])
    sch_cm, nm_cm, q_cm = resolve_erp_table(cursor, ["CustMast", "custmast", "CUSTMAST"])

    if not q_po or not q_det:
        cursor.close()
        return rows_out

    po_pono = find_column_ci(cursor, sch_po, nm_po, ["pono", "PONo", "PONO", "PoNo", "PONumber"])
    po_date = find_column_ci(cursor, sch_po, nm_po, ["podate", "PODate", "PO_Date", "po_date", "PODt"])
    po_del = find_column_ci(cursor, sch_po, nm_po, ["deleted", "Deleted", "IsDeleted"])
    po_dtype = find_column_ci(cursor, sch_po, nm_po, ["dtype", "DType", "POType", "potype", "Type"])
    po_cid = find_column_ci(cursor, sch_po, nm_po, ["cid", "CId", "CID", "CustId", "custid"])
    po_cc = find_column_ci(cursor, sch_po, nm_po, company_candidates)

    det_pono = find_column_ci(cursor, sch_det, nm_det, ["pono", "PONo", "PONO", "PoNo"])
    det_del = find_column_ci(cursor, sch_det, nm_det, ["deleted", "Deleted", "IsDeleted"])
    det_rm = find_column_ci(cursor, sch_det, nm_det, ["rmname", "RMName", "RMNAME", "RmName", "ItemName", "itdesc", "ItDesc"])
    det_mt = find_column_ci(cursor, sch_det, nm_det, ["mattype", "MatType", "MATTYPE", "Mat_Type"])
    det_uom = find_column_ci(cursor, sch_det, nm_det, ["uom", "UOM", "Uom", "Unit"])
    det_qty = find_column_ci(cursor, sch_det, nm_det, ["qty", "Qty", "QTY", "Quantity"])
    det_amt = find_column_ci(cursor, sch_det, nm_det, ["amount", "Amount", "AMOUNT", "Amt", "Value"])
    det_rate = find_column_ci(cursor, sch_det, nm_det, ["rate", "Rate", "RATE", "UnitRate"])
    det_icode = find_column_ci(cursor, sch_det, nm_det, ["icode", "ICode", "ICODE", "itmcode", "ItemCode", "rmname", "RMName"])

    g_pono = g_grnno = g_del = None
    if q_grn:
        g_pono = find_column_ci(cursor, sch_grn, nm_grn, ["pono", "PONo", "PONO", "PoNo"])
        g_grnno = find_column_ci(cursor, sch_grn, nm_grn, ["grnno", "GRNNo", "GRNNO", "GrnNo"])
        g_del = find_column_ci(cursor, sch_grn, nm_grn, ["deleted", "Deleted", "IsDeleted"])

    gm_grn = gm_date = gm_del = None
    if q_gm:
        gm_grn = find_column_ci(cursor, sch_gm, nm_gm, ["grnno", "GRNNo", "GRNNO", "GrnNo"])
        gm_date = find_column_ci(cursor, sch_gm, nm_gm, ["grndate", "GRNDate", "GRNDATE", "Grn_Date"])
        gm_del = find_column_ci(cursor, sch_gm, nm_gm, ["deleted", "Deleted", "IsDeleted"])

    cm_id = cm_name = cm_del = None
    if q_cm:
        cm_id = find_column_ci(cursor, sch_cm, nm_cm, ["Id", "id", "ID", "CustId", "custid"])
        cm_name = find_column_ci(cursor, sch_cm, nm_cm, ["CName", "cname", "CNAME", "CustName", "Name"])
        cm_del = find_column_ci(cursor, sch_cm, nm_cm, ["deleted", "Deleted", "IsDeleted"])

    if not po_pono or not po_date or not det_pono or not det_amt:
        cursor.close()
        return rows_out

    del_po_sql = f"ISNULL(M.[{po_del}], 0) = 0" if po_del else "1=1"
    del_det_sql = f"ISNULL(D.[{det_del}], 0) = 0" if det_del else "1=1"
    grn_dist_where = f"ISNULL(gx.[{g_del}], 0) = 0" if g_del else "1=1"

    exclude_filter = ""
    if po_dtype:
        exclude_filter = (
            f" AND UPPER(LTRIM(RTRIM(ISNULL(M.[{po_dtype}], N'')))) "
            f"NOT IN (N'', N'JOB ORDER', N'GENERAL')"
        )

    company_sql = ""
    params = []
    if po_cc and company_code:
        company_sql = f" AND M.[{po_cc}] = ?"
        params.append(company_code)

    rm_a = f"D.[{det_rm}]" if det_rm else "CAST(NULL AS NVARCHAR(256))"
    mt_a = f"D.[{det_mt}]" if det_mt else "CAST(NULL AS NVARCHAR(256))"
    mat_concat = (
        f"LTRIM(RTRIM("
        f"ISNULL(CAST({rm_a} AS NVARCHAR(256)), N'')"
        f" + CASE WHEN ISNULL(CAST({mt_a} AS NVARCHAR(256)), N'') = N'' THEN N'' "
        f"ELSE N' - ' + ISNULL(CAST({mt_a} AS NVARCHAR(256)), N'') END"
        f"))"
    )

    if det_qty and det_uom:
        po_qty_sql = (
            f"CAST(ROUND(ISNULL(D.[{det_qty}], 0), 2) AS NVARCHAR(50))"
            f" + N' ' + ISNULL(CAST(D.[{det_uom}] AS NVARCHAR(32)), N'')"
        )
    elif det_qty:
        po_qty_sql = f"CAST(ROUND(ISNULL(D.[{det_qty}], 0), 2) AS NVARCHAR(50))"
    else:
        po_qty_sql = "N''"

    vendor_sql = "CAST(NULL AS NVARCHAR(512))"
    cm_join = ""
    if q_cm and cm_id and cm_name and po_cid:
        cm_del_sql = f" AND ISNULL(CM.[{cm_del}], 0) = 0" if cm_del else ""
        cm_join = f"LEFT JOIN {q_cm} CM ON M.[{po_cid}] = CM.[{cm_id}]{cm_del_sql}"
        vendor_sql = f"CAST(CM.[{cm_name}] AS NVARCHAR(512))"

    g_agg = ""
    gm_join = ""
    if q_grn and g_pono and g_grnno:
        g_agg = (
            f"LEFT JOIN ("
            f"  SELECT gx.[{g_pono}] AS pono_g, MAX(gx.[{g_grnno}]) AS grnno_g"
            f"  FROM {q_grn} gx WHERE {grn_dist_where}"
            f"  GROUP BY gx.[{g_pono}]"
            f") G ON M.[{po_pono}] = G.pono_g"
        )
        if q_gm and gm_grn and gm_date:
            gm_del_j = f" AND ISNULL(GM.[{gm_del}], 0) = 0" if gm_del else ""
            gm_join = f"LEFT JOIN {q_gm} GM ON G.grnno_g = GM.[{gm_grn}]{gm_del_j}"

    dtype_sel = f"M.[{po_dtype}]" if po_dtype else "CAST(NULL AS NVARCHAR(64))"
    icode_sel = f"D.[{det_icode}]" if det_icode else "CAST(NULL AS NVARCHAR(128))"
    rate_sel = f"ISNULL(CAST(D.[{det_rate}] AS FLOAT), 0)" if det_rate else "CAST(0 AS FLOAT)"

    detail_sql = f"""
        SELECT TOP 5000
            M.[{po_pono}]                           AS PO_Number,
            {dtype_sel}                             AS PO_Type,
            {vendor_sql}                            AS Vendor_Name,
            CAST({icode_sel} AS NVARCHAR(128))       AS Material_Code,
            CAST({mat_concat} AS NVARCHAR(520))      AS Material,
            CAST({po_qty_sql} AS NVARCHAR(120))      AS PO_Qty,
            ISNULL(CAST(D.[{det_amt}] AS FLOAT), 0) AS Value,
            {rate_sel}                              AS Rate,
            M.[{po_date}]                           AS PO_Date
        FROM {q_po} M
        INNER JOIN {q_det} D
            ON M.[{po_pono}] = D.[{det_pono}] AND {del_det_sql}
        {cm_join}
        {g_agg}
        {gm_join}
        WHERE {del_po_sql}
          {exclude_filter}
          {company_sql}
        ORDER BY M.[{po_date}] DESC, M.[{po_pono}]
    """

    cursor.execute(detail_sql, tuple(params))
    for row in cursor.fetchall() or []:
        po_number = str(row[0] or "").strip()
        po_type = str(row[1] or "").strip()
        vendor = str(row[2] or "").strip() or "—"
        material_code = str(row[3] or "").strip()
        material = str(row[4] or "").strip()
        po_qty = str(row[5] or "").strip()
        value_raw = float(row[6] or 0)
        rate_raw = float(row[7] or 0)
        po_dt = row[8]

        if hasattr(po_dt, "isoformat"):
            po_date_str = po_dt.isoformat()[:10]
        else:
            po_date_str = str(po_dt).strip()[:10] if po_dt else ""

        month_short, month_name = _po_month_labels(po_dt)
        amount_l = round(value_raw / 100_000.0, 2)

        if rate_raw > 0:
            rate_display = f"₹{rate_raw:,.0f}"
            if det_uom and po_qty:
                parts = po_qty.split()
                if len(parts) >= 2:
                    rate_display = f"₹{rate_raw:,.0f}/{parts[-1]}"
        elif value_raw > 0 and det_qty:
            try:
                qty_num = float(str(row[5] or "0").split()[0].replace(",", ""))
                if qty_num > 0:
                    calc_rate = value_raw / qty_num
                    rate_display = f"₹{calc_rate:,.0f}"
                    if po_qty and " " in po_qty:
                        rate_display = f"₹{calc_rate:,.0f}/{po_qty.split()[-1]}"
                else:
                    rate_display = "—"
            except Exception:
                rate_display = "—"
        else:
            rate_display = "—"

        rows_out.append({
            "supplierName": vendor,
            "poNumber": po_number,
            "poDate": po_date_str,
            "month": month_short,
            "monthName": month_name,
            "category": po_type,
            "partNo": material_code,
            "materialName": material or material_code,
            "qty": po_qty or "—",
            "rate": rate_display,
            "amount": amount_l,
            "valueRaw": round(value_raw, 2),
        })

    cursor.close()
    return rows_out


@api_view(["GET"])
def dashboard2_purchase_value(request):
    """Plant Performance — Purchase Value (PO lines, purchase analysis logic)."""
    try:
        from .views import get_tenant_connection
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    cursor = None
    try:
        rows = _fetch_plant_performance_purchase_value_rows(conn, tenant)
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

    try:
        conn.close()
    except Exception:
        pass

    return Response({"rows": rows})


# ── OTD (Charts /otd-report/ logic — schedule completion + CustPoOTDRating) ──

def _otd_filter_clause(customer="", part=""):
    """Optional customer / part filters for AllSchedules (IN / LIKE match)."""
    sql = ""
    params = []
    customer = (customer or "").strip()
    part = (part or "").strip()
    if customer:
        cust_list = [c.strip() for c in customer.split(",") if c.strip()]
        if cust_list:
            placeholders = ",".join(["?"] * len(cust_list))
            sql += f" AND ISNULL(cm.CName, N'') IN ({placeholders})"
            params.extend(cust_list)
    if part:
        sql += " AND s.itcode LIKE ?"
        params.append(f"%{part}%")
    return sql, params


def _build_otd_charts_cte(customer="", part=""):
    extra_sql, _ = _otd_filter_clause(customer, part)
    return f"""
WITH AllSchedules AS (
    SELECT s.Apono, s.itcode AS partno, s.poslno, s.reqdate, s.shdQty,
           YEAR(p.podt) AS PoYear, MONTH(p.podt) AS PoMonth
    FROM In_PoDet_ShdQty s
    INNER JOIN In_PoMas p ON s.Apono = p.Apono
    LEFT JOIN CustMast cm ON p.cid = cm.Id
    WHERE CAST(p.podt AS DATE) BETWEEN ? AND ?
      AND ISNULL(s.deleted, 0) = 0
      AND ISNULL(p.deleted, 0) = 0{extra_sql}
),
AllDeliveries AS (
    SELECT d.Apono, d.partno, d.poslno, m.dcdate, d.okqty
    FROM DcInSubDetAssmPoDet d
    INNER JOIN DC_Mas m ON d.dcno = m.dcno
    WHERE d.deleted = 0
    UNION ALL
    SELECT d.Apono, d.partno, d.poslno, m.dcdate, d.okqty
    FROM DcInSubDet d
    INNER JOIN DC_Mas m ON d.dcno = m.dcno
    WHERE d.deleted = 0
),
ScheduleWithDeliveries AS (
    SELECT sch.Apono, sch.partno, sch.poslno, sch.reqdate, sch.shdQty, sch.PoYear, sch.PoMonth,
           del.dcdate, del.okqty
    FROM AllSchedules sch
    LEFT JOIN AllDeliveries del
        ON sch.Apono = del.Apono AND sch.partno = del.partno AND sch.poslno = del.poslno
),
CumulativeDeliveries AS (
    SELECT Apono, partno, poslno, reqdate, shdQty, PoYear, PoMonth, dcdate, okqty,
           SUM(okqty) OVER (
               PARTITION BY Apono, partno, poslno, reqdate ORDER BY dcdate
           ) AS CumQty
    FROM ScheduleWithDeliveries
    WHERE dcdate IS NOT NULL
),
Completion AS (
    SELECT Apono, partno, poslno, reqdate, shdQty, PoYear, PoMonth,
           MIN(dcdate) AS CompletionDate
    FROM CumulativeDeliveries
    WHERE CumQty >= shdQty
    GROUP BY Apono, partno, poslno, reqdate, shdQty, PoYear, PoMonth
),
OTDCalc AS (
    SELECT comp.PoYear, comp.PoMonth,
           comp.shdQty,
           comp.CompletionDate,
           comp.reqdate,
           CASE WHEN comp.CompletionDate <= comp.reqdate THEN 100.0
                ELSE ISNULL(r.RatingFor, 0.0) END AS OTDScore,
           CASE WHEN comp.CompletionDate <= comp.reqdate
                THEN ISNULL(CAST(comp.shdQty AS FLOAT), 0) ELSE 0 END AS on_time_qty,
           CASE WHEN comp.CompletionDate > comp.reqdate THEN 1 ELSE 0 END AS delayed_flag
    FROM Completion comp
    LEFT JOIN CustPoOTDRating r
        ON DATEDIFF(DAY, comp.reqdate, comp.CompletionDate) BETWEEN r.RatingFrom AND r.RatingTo
)
"""


def _build_otd_detail_sql(customer="", part=""):
    extra_sql, _ = _otd_filter_clause(customer, part)
    return f"""
WITH AllSchedules AS (
    SELECT s.Apono, s.itcode AS partno, s.poslno, s.reqdate, s.shdQty, s.shddate,
           MONTH(p.podt) AS PoMonth, p.pono, p.refno, p.cid
    FROM In_PoDet_ShdQty s
    INNER JOIN In_PoMas p ON s.Apono = p.Apono
    LEFT JOIN CustMast cm ON p.cid = cm.Id
    WHERE CAST(p.podt AS DATE) BETWEEN ? AND ?
      AND ISNULL(s.deleted, 0) = 0
      AND ISNULL(p.deleted, 0) = 0{extra_sql}
),
AllDeliveries AS (
    SELECT d.Apono, d.partno, d.poslno, m.dcdate, d.okqty
    FROM DcInSubDetAssmPoDet d
    INNER JOIN DC_Mas m ON d.dcno = m.dcno
    WHERE d.deleted = 0
    UNION ALL
    SELECT d.Apono, d.partno, d.poslno, m.dcdate, d.okqty
    FROM DcInSubDet d
    INNER JOIN DC_Mas m ON d.dcno = m.dcno
    WHERE d.deleted = 0
),
ScheduleWithDeliveries AS (
    SELECT sch.Apono, sch.partno, sch.poslno, sch.reqdate, sch.shdQty, sch.shddate,
           sch.PoMonth, sch.pono, sch.refno, sch.cid, del.dcdate, del.okqty
    FROM AllSchedules sch
    LEFT JOIN AllDeliveries del
        ON sch.Apono = del.Apono AND sch.partno = del.partno AND sch.poslno = del.poslno
),
CumulativeDeliveries AS (
    SELECT Apono, partno, poslno, reqdate, shdQty, shddate, PoMonth, pono, refno, cid,
           dcdate, okqty,
           SUM(okqty) OVER (
               PARTITION BY Apono, partno, poslno, reqdate ORDER BY dcdate
           ) AS CumQty
    FROM ScheduleWithDeliveries
    WHERE dcdate IS NOT NULL
),
Completion AS (
    SELECT Apono, partno, poslno, reqdate, shdQty, shddate, PoMonth, pono, refno, cid,
           MIN(dcdate) AS CompletionDate
    FROM CumulativeDeliveries
    WHERE CumQty >= shdQty
    GROUP BY Apono, partno, poslno, reqdate, shdQty, shddate, PoMonth, pono, refno, cid
)
SELECT TOP 5000
    ISNULL(LTRIM(RTRIM(cm.CName)), N'—') AS CustomerName,
    LTRIM(RTRIM(CAST(c.pono AS NVARCHAR(128)))) AS PONumber,
    LTRIM(RTRIM(CAST(c.Apono AS NVARCHAR(128)))) AS PORefNumber,
    LTRIM(RTRIM(CAST(c.partno AS NVARCHAR(128)))) AS PartNumber,
    CAST(c.shddate AS DATE) AS SchdDt,
    CAST(c.reqdate AS DATE) AS ReqDt,
    ISNULL(CAST(c.shdQty AS FLOAT), 0) AS OrderQty,
    ISNULL(CAST(c.shdQty AS FLOAT), 0) AS DeliveryQty,
    CASE WHEN c.CompletionDate <= c.reqdate THEN N'On Time' ELSE N'Delayed' END AS Status,
    ISNULL(CAST(pd.rate AS FLOAT), 0) * ISNULL(CAST(c.shdQty AS FLOAT), 0) AS Value
FROM Completion c
LEFT JOIN CustMast cm ON c.cid = cm.Id
LEFT JOIN In_PoDet pd
    ON pd.Apono = c.Apono AND pd.itcode = c.partno AND pd.poslno = c.poslno
   AND ISNULL(pd.deleted, 0) = 0
ORDER BY c.reqdate DESC, c.pono, c.partno
"""


_OTD_MONTHLY_TAIL = """
SELECT PoYear, PoMonth,
       AVG(OTDScore) AS AvgOTD,
       COUNT(*) AS CompletedSchedules,
       ISNULL(SUM(CAST(shdQty AS FLOAT)), 0) AS total_qty,
       ISNULL(SUM(on_time_qty), 0) AS on_time_qty,
       ISNULL(SUM(delayed_flag), 0) AS delayed_lines
FROM OTDCalc
GROUP BY PoYear, PoMonth
ORDER BY PoYear, PoMonth
"""

_OTD_KPI_TAIL = """
SELECT AVG(OTDScore) AS overall_otd,
       ISNULL(SUM(CAST(shdQty AS FLOAT)), 0) AS total_qty,
       ISNULL(SUM(on_time_qty), 0) AS on_time_qty,
       ISNULL(SUM(delayed_flag), 0) AS delayed_lines,
       COUNT(*) AS completed_lines
FROM OTDCalc
"""

_OTD_REPORT_MONTHLY_TAIL = """
SELECT PoYear, PoMonth, AVG(OTDScore) as AvgOTD, COUNT(*) as CompletedSchedules
FROM OTDCalc GROUP BY PoYear, PoMonth ORDER BY PoYear, PoMonth
"""

# Legacy aliases (unfiltered)
_OTD_CHARTS_CTE = _build_otd_charts_cte()
_OTD_MONTHLY_SQL = _OTD_CHARTS_CTE + _OTD_MONTHLY_TAIL
_OTD_KPI_SQL = _OTD_CHARTS_CTE + _OTD_KPI_TAIL
_OTD_DETAIL_SQL = _build_otd_detail_sql()

_FY_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
_FY_MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
_MONTH_FULL = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


def _iter_calendar_months(start_date, end_date):
    y, m = start_date.year, start_date.month
    end_y, end_m = end_date.year, end_date.month
    while (y, m) <= (end_y, end_m):
        yield y, m
        m += 1
        if m > 12:
            m = 1
            y += 1


def _build_otd_pp_chart(start_date, end_date, month_rows_raw, month_rows_kpi):
    """Chart only months within the selected date range (not full FY)."""
    from .views import month_key_from_db

    ym_otd = {}
    ym_qty = {}
    for row in month_rows_raw or []:
        yr = int(row[0])
        mo = month_key_from_db(row[1])
        if mo:
            ym_otd[(yr, mo)] = round(float(row[2] or 0), 2)
    for row in month_rows_kpi or []:
        yr = int(row[0])
        mo = month_key_from_db(row[1])
        if mo:
            ym_qty[(yr, mo)] = round(float(row[3] or 0), 2)

    labels = []
    data = []
    trend = []
    for yr, mo in _iter_calendar_months(start_date, end_date):
        lbl = f"{_MONTH_FULL[mo - 1]} {yr}"
        pct = ym_otd.get((yr, mo), 0.0)
        labels.append(lbl)
        data.append(pct)
        trend.append({
            "year": yr,
            "month": mo,
            "label": lbl,
            "on_time_delivery_pct": pct,
            "total_qty": ym_qty.get((yr, mo), 0.0),
        })

    fy_start_year = start_date.year if start_date.month >= 4 else start_date.year - 1
    fy_label = f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}"
    return labels, data, trend, fy_label


def _otd_fy_bounds(end_date):
    """Financial year (Apr–Mar) containing end_date."""
    from datetime import date

    fy_start_year = end_date.year if end_date.month >= 4 else end_date.year - 1
    return (
        date(fy_start_year, 4, 1),
        date(fy_start_year + 1, 3, 31),
        fy_start_year,
    )


def _otd_fy_label(fy_start_year):
    return f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}"


def _otd_query_params(sql_start, sql_end, customer="", part=""):
    _, extra_params = _otd_filter_clause(customer, part)
    return [sql_start, sql_end] + extra_params


def _fetch_otd_charts_rows(conn, sql_start, sql_end, customer="", part=""):
    cte = _build_otd_charts_cte(customer, part)
    params = _otd_query_params(sql_start, sql_end, customer, part)
    cursor = conn.cursor()
    cursor.execute(cte + _OTD_KPI_TAIL, params)
    kpi_row = cursor.fetchone()
    cursor.execute(cte + _OTD_MONTHLY_TAIL, params)
    month_rows = cursor.fetchall() or []
    cursor.close()
    return kpi_row, month_rows


def _fetch_otd_report_monthly_filtered(conn, sql_start, sql_end, customer="", part=""):
    """Same monthly aggregation as views.otd_report, with optional filters."""
    cte = _build_otd_charts_cte(customer, part)
    params = _otd_query_params(sql_start, sql_end, customer, part)
    cursor = conn.cursor()
    cursor.execute(cte + _OTD_REPORT_MONTHLY_TAIL, params)
    rows = cursor.fetchall() or []
    cursor.close()
    return rows


def _format_otd_date(value):
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        return value.isoformat()[:10]
    return str(value)[:10]


def _fetch_otd_registry_rows(conn, sql_start, sql_end, customer="", part=""):
    cursor = conn.cursor()
    detail_sql = _build_otd_detail_sql(customer, part)
    params = _otd_query_params(sql_start, sql_end, customer, part)
    cursor.execute(detail_sql, params)
    raw_rows = cursor.fetchall() or []
    cursor.close()
    rows = []
    customers = set()
    parts = set()
    for row in raw_rows:
        customer = str(row[0] or "—").strip()
        part = str(row[3] or "—").strip()
        if customer and customer != "—":
            customers.add(customer)
        if part and part != "—":
            parts.add(part)
        po_ref = str(row[2] or "").strip()
        if not po_ref:
            po_ref = "—"
        rows.append({
            "customerName": customer,
            "poNumber": str(row[1] or "—").strip(),
            "poRefNumber": po_ref,
            "apono": po_ref,
            "partNumber": part,
            "schdDate": _format_otd_date(row[4]),
            "reqDate": _format_otd_date(row[5]),
            "orderQty": round(float(row[6] or 0), 2),
            "deliveryQty": round(float(row[7] or 0), 2),
            "status": str(row[8] or "—").strip(),
            "value": round(float(row[9] or 0), 2),
        })
    return rows, sorted(customers), sorted(parts)


@api_view(["GET"])
def plant_performance_otd(request):
    """
    Plant Performance OTD — exact views.otd_report SQL on In_PoDet_ShdQty / In_PoMas / DC tables.
    Query: ?from=&to= (same as otd_report), optional &customer= &partNumber=
    """
    from .views import (
        get_tenant_connection,
        parse_date_range,
    )

    try:
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    customer = (request.GET.get("customer") or "").strip()
    part = (request.GET.get("partNumber") or request.GET.get("part") or "").strip()

    try:
        month_rows_raw = _fetch_otd_report_monthly_filtered(
            conn, start_date, end_date, customer, part
        )
        kpi_row, month_rows = _fetch_otd_charts_rows(
            conn, start_date, end_date, customer, part
        )
        registry_rows, customers, parts = _fetch_otd_registry_rows(
            conn, start_date, end_date, customer, part
        )
        conn.close()
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        return Response({"error": f"Database error: {str(e)}"}, status=500)

    chart_labels, chart_data, trend, fy_label = _build_otd_pp_chart(
        start_date, end_date, month_rows_raw, month_rows
    )

    overall_otd = float(kpi_row[0] or 0) if kpi_row and kpi_row[0] is not None else None
    total_qty = float(kpi_row[1] or 0) if kpi_row else 0.0
    on_time_qty = float(kpi_row[2] or 0) if kpi_row else 0.0
    delayed_lines = int(kpi_row[3] or 0) if kpi_row else 0

    otd_pct = round(overall_otd, 2) if overall_otd is not None else 0.0

    return Response({
        "company": tenant.get("company_name", ""),
        "company_code": tenant.get("company_code", ""),
        "from": str(start_date),
        "to": str(end_date),
        "display_from": str(start_date),
        "display_to": str(end_date),
        "fy": fy_label,
        "labels": chart_labels,
        "data": chart_data,
        "filters": {
            "customer": customer,
            "partNumber": part,
        },
        "kpis": {
            "on_time_delivery_pct": otd_pct,
            "rating_weighted_pct": otd_pct,
            "schedule_adherence_pct": otd_pct,
            "delayed_lines": delayed_lines,
            "on_time_qty": round(on_time_qty, 2),
            "total_del_qty": round(total_qty, 2),
        },
        "trend": trend,
        "rows": registry_rows,
        "filterOptions": {
            "customers": customers,
            "parts": parts,
        },
        "report": {
            "fy": fy_label,
            "from": str(start_date),
            "to": str(end_date),
            "labels": chart_labels,
            "data": chart_data,
        },
    })


dashboard3_otd = plant_performance_otd

# ═══════════════════════════════════════════════════════════════════════════
#  Individual endpoints (mirror dashboard2/* for Dashboard3)
# ═══════════════════════════════════════════════════════════════════════════

# ── Current State (10 cards) ──────────────────────────────────────────────
plant_performance_kpis = dashboard2_kpis
plant_performance_final_inspection_kpi = dashboard2_final_inspection_kpi
plant_performance_production_by_shift = dashboard2_production_by_shift
plant_performance_idle_hours = dashboard2_idle_hours
plant_performance_po_pipeline = dashboard2_po_pipeline

# ── Action to be Taken (9 cards) ────────────────────────────────────────────
plant_performance_injob_inspection = dashboard2_injob_inspection
plant_performance_inter_inspection = dashboard2_inter_inspection
plant_performance_final_inspection_org_rej_rwk = dashboard2_final_inspection_org_rej_rwk
plant_performance_downtime_by_reason = dashboard2_downtime_by_reason
plant_performance_top_defect_categories = dashboard2_top_defect_categories
plant_performance_customer_complaints = dashboard2_customer_complaints
plant_performance_iqc_rejections = dashboard2_iqc_rejections
plant_performance_grn_pending_pipeline = dashboard2_grn_pending_pipeline

# Optional / shared ───────────────────────────────────────────────────────
plant_performance_inspection_pending_snapshot = dashboard2_inspection_pending_snapshot
plant_performance_customer_po_vs_sales = dashboard2_customer_po_vs_sales
plant_performance_grn_value = dashboard2_grn_value
plant_performance_fg_value = dashboard2_fg_value
plant_performance_sales_analysis = dashboard2_sales_analysis
plant_performance_purchase_value = dashboard2_purchase_value
plant_performance_efficiency = dashboard2_efficiency
plant_performance_oee = dashboard2_oee
plant_performance_rejection = dashboard2_rejection
plant_performance_rework = dashboard2_rework
plant_performance_customer_complaint = dashboard2_customer_complaint
plant_performance_capa = dashboard2_capa
plant_performance_operator_efficiency = dashboard2_operator_efficiency
plant_performance_daily_production = dashboard2_daily_production
plant_performance_production_value = dashboard2_production_value
plant_performance_machine_efficiency = dashboard2_machine_efficiency

def get_supplier_rating_base_cte():
    return """
    WITH POScope AS (
        SELECT DISTINCT PM.pono, PM.cid, PM.dtype
        FROM POMas PM
        WHERE PM.deleted = 0
          AND PM.cid LIKE 'S%'
          AND PM.podate BETWEEN ? AND ?
    ),
    ScheduleTotals AS (
        SELECT
            S.pono,
            SUM(S.shdQty)   AS TotalSchedQty,
            MAX(S.shddate)  AS LastSchedDate
        FROM iss_podet_ShdQty S
        INNER JOIN POScope P ON P.pono = S.pono
        WHERE S.deleted = 0
        GROUP BY S.pono
    ),
    GRNTotals AS (
        SELECT
            G.pono,
            SUM(G.qty)      AS TotalGRNQty,
            MAX(GM.grndate) AS LastGRNDate
        FROM grninsubdet G
        INNER JOIN POScope P ON P.pono = G.pono
        INNER JOIN grn_mas GM ON GM.grnno = G.grnno
        WHERE G.deleted = 0
        GROUP BY G.pono
    ),
    POStatus AS (
        SELECT
            P.pono,
            P.cid,
            ST.TotalSchedQty,
            ST.LastSchedDate,
            ISNULL(GT.TotalGRNQty, 0)  AS TotalGRNQty,
            GT.LastGRNDate,
            CASE
                WHEN ST.TotalSchedQty IS NULL THEN 'OnTime'
                WHEN ISNULL(GT.TotalGRNQty, 0) < ST.TotalSchedQty THEN 'Pending'
                WHEN GT.LastGRNDate <= ST.LastSchedDate THEN 'OnTime'
                ELSE 'Delayed'
            END AS POStatus
        FROM POScope P
        LEFT JOIN ScheduleTotals ST ON ST.pono = P.pono
        LEFT JOIN GRNTotals GT      ON GT.pono = P.pono
    ),
    DeliveryBySupplier AS (
        SELECT
            cid,
            COUNT(*)                                            AS POsProduced,
            SUM(CASE WHEN POStatus = 'OnTime'  THEN 1 ELSE 0 END) AS OnTimePOs,
            SUM(CASE WHEN POStatus = 'Delayed' THEN 1 ELSE 0 END) AS DelayedPOs,
            SUM(CASE WHEN POStatus = 'Pending' THEN 1 ELSE 0 END) AS PendingPOs
        FROM POStatus
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
            G.pono,
            P.cid,
            ID.grnqty,
            ID.okqty,
            ID.matrej,
            ID.macrej
        FROM inspdet ID
        INNER JOIN inspmas IM ON IM.irno = ID.irno
        INNER JOIN grninsubdet G ON G.grnno = IM.grnno
        INNER JOIN POScope P ON P.pono = G.pono
        WHERE ID.deleted = 0
          AND G.deleted = 0
    ),
    QualityCalc AS (
        SELECT
            cid,
            SUM(grnqty) AS ItemsPurchased,
            SUM(okqty)  AS ItemsAccepted,
            SUM(matrej) + SUM(macrej) AS ItemsRejected,
            CASE WHEN SUM(grnqty) > 0
                 THEN ROUND(SUM(okqty) * 100.0 / SUM(grnqty), 2)
                 ELSE 0 END AS AcceptancePct
        FROM InspectionBase
        GROUP BY cid
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
    SupplierSummary AS (
        SELECT
            VL.cid                                              AS SupplierId,
            VL.SupplierName,
            VL.Category,
            ISNULL(QC.ItemsPurchased, 0)                        AS NoOfItemsPurchased,
            ISNULL(QC.ItemsAccepted, 0)                         AS NoOfItemsAccepted,
            ISNULL(QC.ItemsRejected, 0)                         AS NoOfItemsRejected,
            ISNULL(QC.AcceptancePct, 0)                         AS PctOfAcceptance,
            QR.RatingFor                                        AS QualityRating,
            QR.RatingStatus                                     AS QualityGrade,
            DC.POsProduced                                      AS NoOfPurchaseOrdersProduced,
            ISNULL(DC.OnTimePOs, 0)                             AS OnTimeDeliveryPOs,
            ISNULL(DC.DelayedPOs, 0)                            AS DeliveryDelayPOs,
            ISNULL(DC.PendingPOs, 0)                            AS PendingPOs,
            ISNULL(DC.OnTimePct, 0)                             AS PctOfOnTimeDeliveryPOs,
            DR.RatingFor                                        AS DeliveryRating,
            DR.RatingStatus                                     AS DeliveryGrade,
            ISNULL(QR.RatingFor, 0) + ISNULL(DR.RatingFor, 0)   AS TotalSupplierRating
        FROM VendorLookup VL
        LEFT JOIN DeliveryCalc DC ON DC.cid = VL.cid
        LEFT JOIN QualityCalc QC  ON QC.cid = VL.cid
        LEFT JOIN DeliveryRating DR
            ON DR.dtype = 'Supplier'
           AND ISNULL(DC.OnTimePct, 0) BETWEEN DR.RatingFrom AND DR.RatingTo
        LEFT JOIN QualityRating QR
            ON QR.dtype = 'Supplier'
           AND ISNULL(QC.AcceptancePct, 0) BETWEEN QR.RatingFrom AND QR.RatingTo
    )
    """

def get_kpi_data(conn, start_date, end_date, supplier_param):
    cursor = conn.cursor()
    extra_where = ""
    params = [start_date, end_date]
    if supplier_param:
        suppliers = [s.strip() for s in supplier_param.split(",") if s.strip()]
        if suppliers:
            placeholders = ",".join(["?"] * len(suppliers))
            extra_where = f" AND SupplierName IN ({placeholders})"
            params.extend(suppliers)
            
    sql = f"""
    {get_supplier_rating_base_cte()}
    SELECT
        ROUND(AVG(CAST(TotalSupplierRating AS FLOAT)), 2) AS AvgRating,
        ROUND(AVG(CAST(PctOfOnTimeDeliveryPOs AS FLOAT)), 2) AS OnTimeSupply,
        ROUND(AVG(CAST(PctOfAcceptance AS FLOAT)), 2) AS QualityCompliance,
        COUNT(DISTINCT SupplierId) AS ActiveSuppliers
    FROM SupplierSummary
    WHERE 1=1 {extra_where}
    """
    cursor.execute(sql, params)
    row = cursor.fetchone()
    cursor.close()
    if row:
        return {
            "avg_rating": round(float(row[0] or 0), 2),
            "on_time_supply": round(float(row[1] or 0), 2),
            "quality_compliance": round(float(row[2] or 0), 2),
            "active_suppliers": int(row[3] or 0)
        }
    return {
        "avg_rating": 0.0,
        "on_time_supply": 0.0,
        "quality_compliance": 0.0,
        "active_suppliers": 0
    }

def get_chart_data(conn, start_date, end_date, supplier_param):
    cursor = conn.cursor()
    extra_where = ""
    params = [start_date, end_date]
    if supplier_param:
        suppliers = [s.strip() for s in supplier_param.split(",") if s.strip()]
        if suppliers:
            placeholders = ",".join(["?"] * len(suppliers))
            extra_where = f" AND SupplierName IN ({placeholders})"
            params.extend(suppliers)
            
    sql = f"""
    {get_supplier_rating_base_cte()}
    SELECT
        SupplierName,
        ROUND(CAST(TotalSupplierRating AS FLOAT), 2) AS AvgFinalRating
    FROM SupplierSummary
    WHERE 1=1 {extra_where}
    ORDER BY AvgFinalRating DESC;
    """
    cursor.execute(sql, params)
    rows = cursor.fetchall() or []
    cursor.close()
    
    labels = []
    data = []
    for row in rows:
        labels.append(str(row[0]).strip() if row[0] else "")
        data.append(round(float(row[1] or 0), 2))
        
    return {
        "labels": labels,
        "data": data
    }

def get_registry_data(conn, start_date, end_date, supplier_param):
    cursor = conn.cursor()
    extra_where = ""
    params = [start_date, end_date]
    if supplier_param:
        suppliers = [s.strip() for s in supplier_param.split(",") if s.strip()]
        if suppliers:
            placeholders = ",".join(["?"] * len(suppliers))
            extra_where = f" AND SupplierName IN ({placeholders})"
            params.extend(suppliers)
            
    sql = f"""
    {get_supplier_rating_base_cte()}
    SELECT
        SupplierName,
        Category,
        NoOfPurchaseOrdersProduced AS TotalOrders,
        PctOfOnTimeDeliveryPOs AS OnTimeDelivery,
        PctOfAcceptance AS QualityPass,
        TotalSupplierRating AS OverallRating,
        CASE
            WHEN TotalSupplierRating >= 95 THEN 'Excellent'
            WHEN TotalSupplierRating >= 90 THEN 'Good'
            WHEN TotalSupplierRating >= 80 THEN 'Average'
            ELSE 'Poor'
        END AS Status
    FROM SupplierSummary
    WHERE 1=1 {extra_where}
    ORDER BY OverallRating DESC;
    """
    cursor.execute(sql, params)
    rows = cursor.fetchall() or []
    cursor.close()
    
    out_rows = []
    for idx, row in enumerate(rows):
        out_rows.append({
            "id": idx + 1,
            "supplierName": str(row[0]).strip() if row[0] else "",
            "category": str(row[1]).strip() if row[1] else "",
            "totalOrders": int(row[2] or 0),
            "onTimeDelivery": round(float(row[3] or 0), 2),
            "qualityPass": round(float(row[4] or 0), 2),
            "overallRating": round(float(row[5] or 0), 2),
            "avgRating": round(float(row[5] or 0), 2),
            "status": str(row[6]).strip() if row[6] else ""
        })
    return out_rows

def get_actions_data(conn, start_date, end_date, supplier_param):
    cursor = conn.cursor()
    extra_where = ""
    params = [start_date, end_date]
    if supplier_param:
        suppliers = [s.strip() for s in supplier_param.split(",") if s.strip()]
        if suppliers:
            placeholders = ",".join(["?"] * len(suppliers))
            extra_where = f" AND SupplierName IN ({placeholders})"
            params.extend(suppliers)
            
    sql = f"""
    {get_supplier_rating_base_cte()}
    SELECT
        SupplierName,
        TotalSupplierRating AS Rating
    FROM SupplierSummary
    WHERE TotalSupplierRating < 90 {extra_where}
    ORDER BY Rating
    """
    cursor.execute(sql, params)
    rows = cursor.fetchall() or []
    cursor.close()
    
    out_rows = []
    for idx, row in enumerate(rows):
        out_rows.append({
            "id": idx + 1,
            "supplierName": str(row[0]).strip() if row[0] else "",
            "rating": round(float(row[1] or 0), 2)
        })
    return out_rows

@api_view(["GET"])
def supplier_rating_kpi_view(request):
    try:
        from .views import get_tenant_connection, parse_date_range
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)
    start_date, end_date = parse_date_range(request)
    supplier_param = request.GET.get("supplier", "").strip()
    try:
        data = get_kpi_data(conn, start_date, end_date, supplier_param)
        return Response(data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    finally:
        conn.close()

@api_view(["GET"])
def supplier_rating_chart_view(request):
    try:
        from .views import get_tenant_connection, parse_date_range
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)
    start_date, end_date = parse_date_range(request)
    supplier_param = request.GET.get("supplier", "").strip()
    try:
        data = get_chart_data(conn, start_date, end_date, supplier_param)
        return Response(data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    finally:
        conn.close()

@api_view(["GET"])
def supplier_rating_registry_view(request):
    try:
        from .views import get_tenant_connection, parse_date_range
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)
    start_date, end_date = parse_date_range(request)
    supplier_param = request.GET.get("supplier", "").strip()
    try:
        data = get_registry_data(conn, start_date, end_date, supplier_param)
        return Response(data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    finally:
        conn.close()

@api_view(["GET"])
def supplier_rating_actions_view(request):
    try:
        from .views import get_tenant_connection, parse_date_range
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)
    start_date, end_date = parse_date_range(request)
    supplier_param = request.GET.get("supplier", "").strip()
    try:
        data = get_actions_data(conn, start_date, end_date, supplier_param)
        return Response(data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    finally:
        conn.close()

@api_view(["GET"])
def dashboard2_supplier_rating(request):
    """Plant Performance — Supplier Rating Consolidated."""
    try:
        from .views import get_tenant_connection, parse_date_range
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)
        
    start_date, end_date = parse_date_range(request)
    supplier_param = request.GET.get("supplier", "").strip()
    
    try:
        kpis = get_kpi_data(conn, start_date, end_date, supplier_param)
        chart = get_chart_data(conn, start_date, end_date, supplier_param)
        registry_rows = get_registry_data(conn, start_date, end_date, supplier_param)
        actions = get_actions_data(conn, start_date, end_date, supplier_param)
        
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT cm.CName FROM CustMast cm WHERE cm.CName IS NOT NULL ORDER BY cm.CName")
        suppliers_list = [str(r[0]).strip() for r in cursor.fetchall() if r[0]]
        cursor.close()
        
        fy_start_year = start_date.year if start_date.month >= 4 else start_date.year - 1
        fy_label = f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}"
        
        return Response({
            "company": tenant.get("company_name", ""),
            "fy": fy_label,
            "from": str(start_date),
            "to": str(end_date),
            "labels": chart["labels"],
            "data": chart["data"],
            "rows": registry_rows,
            "kpis": kpis,
            "actions": actions,
            "filterOptions": {
                "suppliers": suppliers_list
            }
        })
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)
    finally:
        conn.close()

plant_performance_supplier_rating = dashboard2_supplier_rating


# ── Vendor Rating (Job-based, cid LIKE 'V%') ────────────────────────────────

@api_view(["GET"])
def plant_performance_vendor_rating(request):
    """
    Plant Performance — Vendor Rating Report.
    Logic reverse-engineered from the ERP Summary screen.
    Uses Job_mas / JobIncomeDetInsp / InJob_Mas to determine
    received / accepted / rejected quantities and on-time delivery per vendor.
    Joins QualityRating / DeliveryRating / OverAllRating for grade lookup.
    """
    try:
        from .views import get_tenant_connection, parse_date_range
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)

    start_date, end_date = parse_date_range(request)
    name_filter = (request.GET.get("name") or "").strip()

    sql = """
DECLARE @FromDate DATE = ?;
DECLARE @ToDate   DATE = ?;

;WITH JobQuality AS (
    SELECT
        jm.jbno,
        jm.cid,
        jm.expdate,
        SUM(ji.Qty)                                                    AS ReceivedQty,
        SUM(ji.Qty - ISNULL(ji.RejQty,0) - ISNULL(ji.RwQty,0))       AS AcceptedQty,
        SUM(ISNULL(ji.RejQty,0))                                       AS RejectedQty
    FROM Job_mas jm
    INNER JOIN JobIncomeDetInsp ji ON ji.JbNo = jm.jbno
    WHERE jm.deleted = 0
      AND jm.cid LIKE 'V%'
      AND jm.jbdate BETWEEN @FromDate AND @ToDate
    GROUP BY jm.jbno, jm.cid, jm.expdate
),
JobDelivery AS (
    SELECT
        jq.jbno,
        jq.cid,
        jq.expdate,
        jq.ReceivedQty,
        jq.AcceptedQty,
        jq.RejectedQty,
        jd_dc.LastDcDate,
        CASE
            WHEN jd_dc.LastDcDate IS NOT NULL
                 AND jd_dc.LastDcDate <= jq.expdate THEN 'ONTIME'
            WHEN jq.expdate < CAST(GETDATE() AS DATE)  THEN 'DELAY'
            ELSE 'PENDING'
        END AS DeliveryBucket
    FROM JobQuality jq
    OUTER APPLY (
        SELECT MAX(im.dcdate) AS LastDcDate
        FROM JobIncomeDetInsp ji
        INNER JOIN InJob_Mas im ON im.jino = ji.JiNo
        WHERE ji.JbNo = jq.jbno
    ) jd_dc
),
VendorAgg AS (
    SELECT
        jd.cid,
        SUM(jd.ReceivedQty)                                                AS TotalReceived,
        SUM(jd.AcceptedQty)                                                AS TotalAccepted,
        SUM(jd.RejectedQty)                                                AS TotalRejected,
        COUNT(*)                                                            AS JobOrdersProduced,
        SUM(CASE WHEN jd.DeliveryBucket = 'ONTIME'  THEN 1 ELSE 0 END)    AS OnTimeJobs,
        SUM(CASE WHEN jd.DeliveryBucket = 'DELAY'   THEN 1 ELSE 0 END)    AS DelayJobs,
        SUM(CASE WHEN jd.DeliveryBucket = 'PENDING' THEN 1 ELSE 0 END)    AS PendingJobs
    FROM JobDelivery jd
    GROUP BY jd.cid
),
VendorScored AS (
    SELECT
        va.*,
        CASE WHEN va.TotalReceived = 0 THEN NULL
             ELSE (va.TotalAccepted * 100.0) / va.TotalReceived
        END AS AcceptancePct,
        CASE WHEN (va.JobOrdersProduced - va.PendingJobs) = 0 THEN NULL
             ELSE (va.OnTimeJobs * 100.0) / (va.JobOrdersProduced - va.PendingJobs)
        END AS OnTimeDeliveryPct
    FROM VendorAgg va
),
VendorGraded AS (
    SELECT
        vs.*,
        qr.RatingFor    AS QualityRating,
        qr.RatingStatus AS QualityStatus,
        dr.RatingFor    AS DeliveryRating,
        dr.RatingStatus AS DeliveryStatus,
        ( ISNULL(qr.RatingFor, 0) + ISNULL(dr.RatingFor, 0) ) / 2.0 AS TotalRating
    FROM VendorScored vs
    LEFT JOIN QualityRating qr
           ON qr.dtype = 'Vendor'
          AND vs.AcceptancePct IS NOT NULL
          AND vs.AcceptancePct BETWEEN qr.RatingFrom AND qr.RatingTo
    LEFT JOIN DeliveryRating dr
           ON dr.dtype = 'Vendor'
          AND vs.OnTimeDeliveryPct IS NOT NULL
          AND vs.OnTimeDeliveryPct BETWEEN dr.RatingFrom AND dr.RatingTo
)
SELECT
    vg.cid                                  AS [CID],
    cm.CName                                AS [NAME],
    vg.TotalReceived                        AS [NO OF ITEMS RECEIVED],
    vg.TotalAccepted                        AS [NO OF ITEMS ACCEPTED],
    vg.TotalRejected                        AS [NO OF ITEMS REJECTED],
    ROUND(vg.AcceptancePct, 2)              AS [PCT OF ACCEPTANCE],
    vg.QualityRating                        AS [QUALITY RATING],
    vg.QualityStatus                        AS [QUALITY STATUS],
    vg.JobOrdersProduced                    AS [JOB ORDERS PRODUCED],
    vg.OnTimeJobs                           AS [ON TIME JOBS],
    vg.DelayJobs                            AS [DELAY JOBS],
    vg.PendingJobs                          AS [PENDING JOBS],
    ROUND(vg.OnTimeDeliveryPct, 2)          AS [PCT ON TIME DELIVERY],
    vg.DeliveryRating                       AS [DELIVERY RATING],
    vg.DeliveryStatus                       AS [DELIVERY STATUS],
    ROUND(vg.TotalRating, 2)                AS [TOTAL RATING],
    oar.RatingStatus                        AS [TOTAL STATUS],
    oar.ActToBeTaken                        AS [ACTION TO BE TAKEN]
FROM VendorGraded vg
INNER JOIN CustMast cm ON cm.Id = vg.cid
LEFT JOIN OverAllRating oar
       ON oar.dtype = 'Vendor'
      AND vg.TotalRating BETWEEN oar.RatingFrom AND oar.RatingTo
WHERE (? = '' OR cm.CName LIKE '%' + ? + '%')
ORDER BY cm.CName;
"""

    rows_out = []
    labels = []
    chart_data = []
    vendor_names = []
    total_ratings_sum = 0.0
    total_on_time_sum = 0.0
    total_acceptance_sum = 0.0
    count = 0

    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute(sql, [start_date, end_date, name_filter, name_filter])
        db_rows = cursor.fetchall() or []

        for idx, row in enumerate(db_rows):
            cid             = str(row[0]).strip()  if row[0] else ""
            name            = str(row[1]).strip()  if row[1] else "—"
            received        = int(row[2]  or 0)
            accepted        = int(row[3]  or 0)
            rejected        = int(row[4]  or 0)
            acceptance_pct  = round(float(row[5]  or 0), 2)
            quality_rating  = round(float(row[6]  or 0), 2) if row[6] is not None else None
            quality_status  = str(row[7]).strip()  if row[7] else "—"
            job_orders      = int(row[8]  or 0)
            on_time_jobs    = int(row[9]  or 0)
            delay_jobs      = int(row[10] or 0)
            pending_jobs    = int(row[11] or 0)
            on_time_pct     = round(float(row[12] or 0), 2) if row[12] is not None else None
            delivery_rating = round(float(row[13] or 0), 2) if row[13] is not None else None
            delivery_status = str(row[14]).strip() if row[14] else "—"
            total_rating    = round(float(row[15] or 0), 2) if row[15] is not None else 0.0
            total_status    = str(row[16]).strip() if row[16] else "—"
            action_to_take  = str(row[17]).strip() if row[17] else "—"

            # Determine a simple status for the registry table
            if total_rating >= 95:
                status_label = "Excellent"
            elif total_rating >= 90:
                status_label = "Good"
            elif total_rating >= 80:
                status_label = "Average"
            elif total_rating > 0:
                status_label = "Poor"
            else:
                status_label = total_status or "—"

            rows_out.append({
                "id":              idx + 1,
                "cid":             cid,
                "vendorName":      name,
                "totalReceived":   received,
                "totalAccepted":   accepted,
                "totalRejected":   rejected,
                "acceptancePct":   acceptance_pct,
                "qualityRating":   quality_rating,
                "qualityStatus":   quality_status,
                "jobOrdersProduced": job_orders,
                "onTimeJobs":      on_time_jobs,
                "delayJobs":       delay_jobs,
                "pendingJobs":     pending_jobs,
                "onTimeDeliveryPct": on_time_pct,
                "deliveryRating":  delivery_rating,
                "deliveryStatus":  delivery_status,
                "totalRating":     total_rating,
                "totalStatus":     total_status,
                "actionToBeTaken": action_to_take,
                # registry-table friendly aliases
                "overallRating":   total_rating,
                "onTimeDelivery":  on_time_pct,
                "qualityPass":     acceptance_pct,
                "status":          status_label,
                "totalOrders":     job_orders,
            })

            labels.append(name)
            chart_data.append(total_rating)
            vendor_names.append(name)
            total_ratings_sum += total_rating
            total_on_time_sum += (on_time_pct or 0.0)
            total_acceptance_sum += acceptance_pct
            count += 1

        # KPI aggregates
        avg_rating   = round(total_ratings_sum / count, 2) if count else 0.0
        avg_on_time  = round(total_on_time_sum / count, 2) if count else 0.0
        avg_quality  = round(total_acceptance_sum / count, 2) if count else 0.0

        # Vendor name list for filter dropdown
        cursor.execute(
            "SELECT DISTINCT cm.CName FROM CustMast cm "
            "WHERE cm.CName IS NOT NULL AND cm.Id LIKE 'V%' ORDER BY cm.CName"
        )
        all_vendor_names = [str(r[0]).strip() for r in cursor.fetchall() if r[0]]

        fy_start_year = start_date.year if start_date.month >= 4 else start_date.year - 1
        fy_label = f"FY {fy_start_year}-{str(fy_start_year + 1)[2:]}"

        return Response({
            "company": tenant.get("company_name", ""),
            "fy":      fy_label,
            "from":    str(start_date),
            "to":      str(end_date),
            "labels":  labels,
            "data":    chart_data,
            "rows":    rows_out,
            "kpis": {
                "avg_rating":         avg_rating,
                "on_time_supply":     avg_on_time,
                "quality_compliance": avg_quality,
                "active_suppliers":   count,
            },
            "filterOptions": {
                "vendors": all_vendor_names,
            },
        })
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        conn.close()


@api_view(["GET"])
def plant_performance_store_stock_value(request):
    try:
        from .views import get_tenant_connection, parse_date_range
        conn, tenant = get_tenant_connection(request)
    except ValueError as e:
        return Response({"error": str(e)}, status=401)
        
    start_date, end_date = parse_date_range(request)
    category_param = (request.GET.get("category") or "").strip()
    item_code_param = (request.GET.get("itemCode") or "").strip()

    extra_where = ""
    kpi_params = []
    
    if category_param:
        categories = [c.strip() for c in category_param.split(",") if c.strip()]
        if categories:
            placeholders = ",".join(["?"] * len(categories))
            extra_where += f" AND RPM.SGroup IN ({placeholders})"
            kpi_params.extend(categories)
            
    if item_code_param:
        extra_where += " AND ID.partno = ?"
        kpi_params.append(item_code_param)

    # 1. KPI Value Query
    kpi_sql = f"""
    ;WITH LatestRate AS (
        SELECT
            PartNo,
            BaseRate,
            NetRate,
            ROW_NUMBER() OVER (
                PARTITION BY PartNo
                ORDER BY BReffdt DESC
            ) AS RN
        FROM Commer_BaseRateDet
        WHERE deleted = 0
    )
    SELECT
        SUM(
            ISNULL(ID.okqty,0) *
            (
                CASE
                    WHEN ISNULL(LR.NetRate,0)=0
                         THEN ISNULL(LR.BaseRate,0)
                    ELSE LR.NetRate
                END
            )
        ) AS TotalStoreStockValue
    FROM inspdet ID
    INNER JOIN inspmas IM
        ON IM.irno = ID.irno
        AND IM.deleted = 0
    LEFT JOIN RawProdMast RPM
        ON RPM.Codeno = ID.partno
        AND RPM.Deleted = 0
    LEFT JOIN LatestRate LR
        ON LR.PartNo = ID.partno
        AND LR.RN = 1
    WHERE ID.deleted = 0
      AND ID.dtype = 'Stores Material'
      AND IM.irdate BETWEEN ? AND ?
      {extra_where}
    """
    
    # 2. Chart Query (Month Wise) — structure mirrors KPI query exactly
    chart_sql = f"""
    ;WITH LatestRate AS (
        SELECT
            PartNo,
            BaseRate,
            NetRate,
            ROW_NUMBER() OVER (
                PARTITION BY PartNo
                ORDER BY BReffdt DESC
            ) AS RN
        FROM Commer_BaseRateDet
        WHERE deleted = 0
    )
    SELECT
        FORMAT(IM.irdate,'MMM-yy') AS Month,
        SUM(
            ISNULL(ID.okqty,0) *
            (
                CASE
                    WHEN ISNULL(LR.NetRate,0)=0
                        THEN ISNULL(LR.BaseRate,0)
                    ELSE LR.NetRate
                END
            )
        ) AS StockValue
    FROM inspdet ID
    INNER JOIN inspmas IM
        ON IM.irno = ID.irno
        AND IM.deleted = 0
    LEFT JOIN RawProdMast RPM
        ON RPM.Codeno = ID.partno
        AND RPM.Deleted = 0
    LEFT JOIN LatestRate LR
        ON LR.PartNo = ID.partno
        AND LR.RN = 1
    WHERE ID.deleted = 0
      AND ID.dtype = 'Stores Material'
      AND IM.irdate BETWEEN ? AND ?
      {extra_where}
    GROUP BY
        YEAR(IM.irdate),
        MONTH(IM.irdate),
        FORMAT(IM.irdate,'MMM-yy')
    ORDER BY
        YEAR(IM.irdate),
        MONTH(IM.irdate)
    """


    # 3. Table Query
    table_sql = f"""
    ;WITH LatestRate AS (
        SELECT
            PartNo,
            BaseRate,
            NetRate,
            BReffdt,
            ROW_NUMBER() OVER (
                PARTITION BY PartNo
                ORDER BY BReffdt DESC
            ) AS RN
        FROM Commer_BaseRateDet
        WHERE deleted = 0
    )
    SELECT
        RPM.SGroup AS [Group],
        ID.partno,
        RPM.Description,
        SUM(ISNULL(ID.okqty,0)) AS TotalQty,
        CASE
            WHEN ISNULL(LR.NetRate,0)=0
                THEN ISNULL(LR.BaseRate,0)
            ELSE LR.NetRate
        END AS Rate,
        SUM(
            ISNULL(ID.okqty,0) *
            (
                CASE
                    WHEN ISNULL(LR.NetRate,0)=0
                        THEN ISNULL(LR.BaseRate,0)
                    ELSE LR.NetRate
                END
            )
        ) AS StockValue
    FROM inspdet ID
    INNER JOIN inspmas IM
        ON IM.irno = ID.irno
        AND IM.deleted = 0
    LEFT JOIN RawProdMast RPM
        ON RPM.Codeno = ID.partno
        AND RPM.Deleted = 0
    LEFT JOIN LatestRate LR
        ON LR.PartNo = ID.partno
        AND LR.RN = 1
    WHERE ID.deleted = 0
      AND ID.dtype = 'Stores Material'
      AND IM.irdate BETWEEN ? AND ?
      {extra_where}
    GROUP BY
        RPM.SGroup,
        ID.partno,
        RPM.Description,
        LR.BaseRate,
        LR.NetRate
    ORDER BY
        RPM.SGroup,
        ID.partno
    """

    try:
        cursor = conn.cursor()
        
        # KPI
        cursor.execute(kpi_sql, [start_date, end_date] + kpi_params)
        kpi_row = cursor.fetchone()
        total_val = float(kpi_row[0] or 0) if kpi_row else 0.0
        total_val_lakhs = round(total_val / 100000.0, 2)
        
        # Chart
        cursor.execute(chart_sql, [start_date, end_date] + kpi_params)
        chart_labels = []
        chart_values = []
        for r in cursor.fetchall() or []:
            chart_labels.append(str(r[0]))
            chart_values.append(round(float(r[1] or 0) / 100000.0, 2))
            
        # Table Rows
        cursor.execute(table_sql, [start_date, end_date] + kpi_params)
        table_rows = []
        for idx, r in enumerate(cursor.fetchall() or []):
            grp = str(r[0]).strip() if r[0] else "—"
            part_no = str(r[1]).strip() if r[1] else "—"
            desc = str(r[2]).strip() if r[2] else "—"
            qty = float(r[3] or 0)
            rate = float(r[4] or 0)
            val = float(r[5] or 0)
            
            table_rows.append({
                "id": idx + 1,
                "group": grp,
                "partNo": part_no,
                "description": desc,
                "qty": qty,
                "rate": rate,
                "stockValue": val
            })
            
        # Filter Options
        cursor.execute("""
            SELECT DISTINCT LTRIM(RTRIM(SGroup)) 
            FROM RawProdMast 
            WHERE Deleted = 0 AND SGroup IS NOT NULL AND SGroup <> '' 
            ORDER BY LTRIM(RTRIM(SGroup))
        """)
        groups_opt = [str(r[0]) for r in cursor.fetchall() if r[0]]
        
        cursor.execute("""
            SELECT DISTINCT LTRIM(RTRIM(partno)) 
            FROM inspdet 
            WHERE deleted = 0 AND dtype = 'Stores Material' AND partno IS NOT NULL AND partno <> '' 
            ORDER BY LTRIM(RTRIM(partno))
        """)
        items_opt = [str(r[0]) for r in cursor.fetchall() if r[0]]
        
        cursor.close()
        
        return Response({
            "kpi": {
                "totalStockValue": total_val,
                "totalStockValueLakhs": total_val_lakhs
            },
            "chart": {
                "labels": chart_labels,
                "values": chart_values
            },
            "rows": table_rows,
            "filterOptions": {
                "groups": groups_opt,
                "itemCodes": items_opt
            }
        })
    except Exception as e:
        return Response({"error": f"Database error: {str(e)}"}, status=500)
    finally:
        conn.close()

plant_performance_target_vs_actual = dashboard2_target_vs_actual

# ═══════════════════════════════════════════════════════════════════════════
#  Dashboard3 aliases (same handlers — use either naming in urls/imports)
# ═══════════════════════════════════════════════════════════════════════════
dashboard3_kpis = plant_performance_kpis
dashboard3_production_by_shift = plant_performance_production_by_shift
dashboard3_idle_hours = plant_performance_idle_hours
dashboard3_downtime_by_reason = plant_performance_downtime_by_reason
dashboard3_customer_complaints = plant_performance_customer_complaints
dashboard3_po_pipeline = plant_performance_po_pipeline
dashboard3_inspection_pending_snapshot = plant_performance_inspection_pending_snapshot
dashboard3_grn_pending_pipeline = plant_performance_grn_pending_pipeline
dashboard3_iqc_rejections = plant_performance_iqc_rejections
dashboard3_final_inspection_kpi = plant_performance_final_inspection_kpi
dashboard3_injob_inspection = plant_performance_injob_inspection
dashboard3_inter_inspection = plant_performance_inter_inspection
dashboard3_final_inspection_org_rej_rwk = plant_performance_final_inspection_org_rej_rwk
dashboard3_top_defect_categories = plant_performance_top_defect_categories
dashboard3_customer_po_vs_sales = plant_performance_customer_po_vs_sales
dashboard3_grn_value = plant_performance_grn_value
dashboard3_fg_value = plant_performance_fg_value
dashboard3_sales_analysis = plant_performance_sales_analysis
dashboard3_purchase_value = plant_performance_purchase_value
dashboard3_efficiency = plant_performance_efficiency
dashboard3_oee = plant_performance_oee
dashboard3_rejection = plant_performance_rejection
dashboard3_rework = plant_performance_rework
dashboard3_customer_complaint = plant_performance_customer_complaint
dashboard3_capa = plant_performance_capa
dashboard3_operator_efficiency = plant_performance_operator_efficiency
dashboard3_daily_production = plant_performance_daily_production
dashboard3_production_value = plant_performance_production_value
dashboard3_machine_efficiency = plant_performance_machine_efficiency
dashboard3_supplier_rating = plant_performance_supplier_rating
dashboard3_vendor_rating = plant_performance_vendor_rating
dashboard3_target_vs_actual = plant_performance_target_vs_actual

# Keys match Dashboard3.jsx `data` state property names
_BUNDLE_VIEWS = (
    ("fi", plant_performance_final_inspection_kpi),
    ("prod", plant_performance_kpis),
    ("idle", plant_performance_idle_hours),
    ("injob", plant_performance_injob_inspection),
    ("inter", plant_performance_inter_inspection),
    ("finalOrg", plant_performance_final_inspection_org_rej_rwk),
    ("shifts", plant_performance_production_by_shift),
    ("downtime", plant_performance_downtime_by_reason),
    ("complaints", plant_performance_customer_complaints),
    ("po", plant_performance_po_pipeline),
    ("grn", plant_performance_grn_pending_pipeline),
    ("iqc", plant_performance_iqc_rejections),
    ("topDefects", plant_performance_top_defect_categories),
    ("otd", plant_performance_otd),
    ("customerPoCompare", plant_performance_customer_po_vs_sales),
    ("grnValueCompare", plant_performance_grn_value),
    ("fgValueCompare", plant_performance_fg_value),
    ("salesAnalysisCompare", plant_performance_sales_analysis),
    ("purchaseValueCompare", plant_performance_purchase_value),
    ("efficiencyCompare", plant_performance_efficiency),
    ("oeeCompare", plant_performance_oee),
    ("rejectionCompare", plant_performance_rejection),
    ("reworkCompare", plant_performance_rework),
    ("complaintCompare", plant_performance_customer_complaint),
    ("capaCompare", plant_performance_capa),
    ("operatorEfficiencyCompare", plant_performance_operator_efficiency),
    ("dailyProductionCompare", plant_performance_daily_production),
    ("productionValueCompare", plant_performance_production_value),
    ("machineEfficiencyCompare", plant_performance_machine_efficiency),
    ("supplierRating", plant_performance_supplier_rating),
    ("supplierRatingCompare", plant_performance_supplier_rating),
    ("vendorRating", plant_performance_vendor_rating),
    ("targetVsActualCompare", plant_performance_target_vs_actual),
    ("storeStockValue", plant_performance_store_stock_value),
)


_COMPARE_BUNDLE_KEYS = frozenset({
    "customerPoCompare",
    "grnValueCompare",
    "fgValueCompare",
    "salesAnalysisCompare",
    "purchaseValueCompare",
    "efficiencyCompare",
    "oeeCompare",
    "rejectionCompare",
    "reworkCompare",
    "complaintCompare",
    "capaCompare",
    "operatorEfficiencyCompare",
    "dailyProductionCompare",
    "productionValueCompare",
    "machineEfficiencyCompare",
    "targetVsActualCompare",
})


def _bundle_fetch_one(key, view_fn, django_request):
    """Run one plant-performance sub-endpoint (own DB connection per view)."""
    close_old_connections()
    try:
        resp = view_fn(django_request)
        body = resp.data if hasattr(resp, "data") else {}
        if resp.status_code >= 400 or (isinstance(body, dict) and body.get("error")):
            err = body.get("error") if isinstance(body, dict) else f"HTTP {resp.status_code}"
            return key, None, err
        return key, body, None
    except Exception as exc:
        return key, None, str(exc)
    finally:
        close_old_connections()


@api_view(["GET"])
def plant_performance_bundle(request):
    """
    Single request for Dashboard3 — all panels in one response (queries run in parallel).
    Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&keys=fi,prod,customerPoCompare (optional subset)
    Response: { from, to, data: { fi, prod, idle, ... }, errors: { key: message } | null }
    """
    from_param = (request.GET.get("from") or "").strip()
    to_param = (request.GET.get("to") or "").strip()
    keys_param = (request.GET.get("keys") or "").strip()
    data_out = {}
    errors_out = {}

    django_request = getattr(request, "_request", request)
    # Pre-load session on main thread (required before worker threads use tenant DB).
    session = getattr(django_request, "session", None)
    if session:
        try:
            session.load()
        except Exception:
            pass

    if keys_param:
        wanted = {k.strip() for k in keys_param.split(",") if k.strip()}
        views_to_run = [(key, view_fn) for key, view_fn in _BUNDLE_VIEWS if key in wanted]
    else:
        views_to_run = list(_BUNDLE_VIEWS)

    if not views_to_run:
        return Response({
            "from": from_param,
            "to": to_param,
            "data": {},
            "errors": {"keys": "No valid bundle keys requested"},
        })

    compare_views = [(k, v) for k, v in views_to_run if k in _COMPARE_BUNDLE_KEYS]
    parallel_views = [(k, v) for k, v in views_to_run if k not in _COMPARE_BUNDLE_KEYS]

    for key, view_fn in compare_views:
        key, body, err = _bundle_fetch_one(key, view_fn, django_request)
        if err:
            errors_out[key] = err
            data_out[key] = None
        else:
            data_out[key] = body

    if parallel_views:
        max_workers = min(8, len(parallel_views))
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = [
                pool.submit(_bundle_fetch_one, key, view_fn, django_request)
                for key, view_fn in parallel_views
            ]
            for fut in as_completed(futures):
                key, body, err = fut.result()
                if err:
                    errors_out[key] = err
                    data_out[key] = None
                else:
                    data_out[key] = body

    return Response({
        "from": from_param,
        "to": to_param,
        "data": data_out,
        "errors": errors_out if errors_out else None,
    })


dashboard3_bundle = plant_performance_bundle

__all__ = [
    "plant_performance_kpis",
    "plant_performance_final_inspection_kpi",
    "plant_performance_production_by_shift",
    "plant_performance_idle_hours",
    "plant_performance_otd",
    "plant_performance_po_pipeline",
    "plant_performance_injob_inspection",
    "plant_performance_inter_inspection",
    "plant_performance_final_inspection_org_rej_rwk",
    "plant_performance_downtime_by_reason",
    "plant_performance_top_defect_categories",
    "plant_performance_customer_complaints",
    "plant_performance_iqc_rejections",
    "plant_performance_grn_pending_pipeline",
    "plant_performance_inspection_pending_snapshot",
    "plant_performance_customer_po_vs_sales",
    "plant_performance_grn_value",
    "plant_performance_sales_analysis",
    "plant_performance_purchase_value",
    "plant_performance_efficiency",
    "plant_performance_oee",
    "plant_performance_rejection",
    "plant_performance_rework",
    "plant_performance_customer_complaint",
    "dashboard2_customer_complaint",
    "plant_performance_capa",
    "dashboard2_capa",
    "plant_performance_operator_efficiency",
    "dashboard2_operator_efficiency",
    "plant_performance_daily_production",
    "dashboard2_daily_production",
    "plant_performance_production_value",
    "dashboard2_production_value",
    "dashboard3_production_value",
    "plant_performance_machine_efficiency",
    "dashboard2_machine_efficiency",
    "dashboard3_machine_efficiency",
    "dashboard2_supplier_rating",
    "plant_performance_supplier_rating",
    "dashboard3_supplier_rating",
    "plant_performance_vendor_rating",
    "dashboard3_vendor_rating",
    "dashboard2_rejection",
    "dashboard2_rework",
    "dashboard2_purchase_value",
    "dashboard2_grn_value",
    "dashboard2_sales_analysis",
    "dashboard2_fg_value",
    "plant_performance_fg_value",
    "dashboard3_fg_value",
    "plant_performance_bundle",
    "dashboard3_kpis",
    "dashboard3_production_by_shift",
    "dashboard3_idle_hours",
    "dashboard3_downtime_by_reason",
    "dashboard3_customer_complaints",
    "dashboard3_po_pipeline",
    "dashboard3_inspection_pending_snapshot",
    "dashboard3_grn_pending_pipeline",
    "dashboard3_iqc_rejections",
    "dashboard3_otd",
    "dashboard3_final_inspection_kpi",
    "dashboard3_injob_inspection",
    "dashboard3_inter_inspection",
    "dashboard3_final_inspection_org_rej_rwk",
    "dashboard3_top_defect_categories",
    "dashboard3_customer_po_vs_sales",
    "dashboard3_grn_value",
    "dashboard3_sales_analysis",
    "dashboard3_purchase_value",
    "dashboard3_fg_value",
    "dashboard3_bundle",
    "plant_performance_target_vs_actual",
    "dashboard2_target_vs_actual",
    "dashboard3_target_vs_actual",
    "plant_performance_store_stock_value",
]
