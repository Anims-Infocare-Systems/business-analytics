# views_plantperformance.py — Plant Performance Dashboard (Dashboard3) API
#
# All Dashboard3 data routes live here under /api/plant-performance/*
# Implementation is delegated to views_dashboard2.py (same ERP SQL, no duplication).
#
# Frontend: Dashboard3.jsx + Dashboard3ProductionDataView.jsx (+ card-specific views)
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
    dashboard2_otd,
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

# ═══════════════════════════════════════════════════════════════════════════
#  Individual endpoints (mirror dashboard2/* for Dashboard3)
# ═══════════════════════════════════════════════════════════════════════════

# ── Current State (10 cards) ──────────────────────────────────────────────
plant_performance_kpis = dashboard2_kpis
plant_performance_final_inspection_kpi = dashboard2_final_inspection_kpi
plant_performance_production_by_shift = dashboard2_production_by_shift
plant_performance_idle_hours = dashboard2_idle_hours
plant_performance_otd = dashboard2_otd
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
plant_performance_sales_analysis = dashboard2_sales_analysis

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
dashboard3_otd = plant_performance_otd
dashboard3_final_inspection_kpi = plant_performance_final_inspection_kpi
dashboard3_injob_inspection = plant_performance_injob_inspection
dashboard3_inter_inspection = plant_performance_inter_inspection
dashboard3_final_inspection_org_rej_rwk = plant_performance_final_inspection_org_rej_rwk
dashboard3_top_defect_categories = plant_performance_top_defect_categories
dashboard3_customer_po_vs_sales = plant_performance_customer_po_vs_sales
dashboard3_grn_value = plant_performance_grn_value
dashboard3_sales_analysis = plant_performance_sales_analysis

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
    ("salesAnalysisCompare", plant_performance_sales_analysis),
)


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
    Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD
    Response: { from, to, data: { fi, prod, idle, ... }, errors: { key: message } | null }
    """
    from .views import get_tenant_connection
    from .utils.db import ErpConnectionError

    from_param = (request.GET.get("from") or "").strip()
    to_param = (request.GET.get("to") or "").strip()

    try:
        conn, _tenant = get_tenant_connection(request)
        conn.close()
    except ValueError as exc:
        return Response({"error": str(exc)}, status=401)
    except ErpConnectionError as exc:
        return Response(
            {"error": str(exc), "code": "erp_unavailable"},
            status=503,
        )

    data_out = {}
    errors_out = {}

    django_request = getattr(request, "_request", request)

    for key, view_fn in _BUNDLE_VIEWS:
        key, body, err = _bundle_fetch_one(key, view_fn, django_request)
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
    "dashboard2_grn_value",
    "dashboard2_sales_analysis",
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
    "dashboard3_bundle",
]
