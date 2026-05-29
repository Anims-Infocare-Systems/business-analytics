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

# ═══════════════════════════════════════════════════════════════════════════
#  Individual endpoints (mirror dashboard2/* for Dashboard3)
# ═══════════════════════════════════════════════════════════════════════════

# ── Current State (10 cards) ──────────────────────────────────────────────
plant_performance_kpis = dashboard2_kpis
# Cards: Production Output, Rejection Qty, Rework Qty, OEE Efficiency (+ Quality Split partial)

plant_performance_final_inspection_kpi = dashboard2_final_inspection_kpi
# Card: Final Inspection OK Qty, Final Inspection (action), Quality Split (OK qty)

plant_performance_production_by_shift = dashboard2_production_by_shift
# Card: Production Data (chart by shift)

plant_performance_idle_hours = dashboard2_idle_hours
# Card: Idle time summary

plant_performance_otd = dashboard2_otd
# Cards: Machine efficiency, On-Time Delivery Trend

plant_performance_po_pipeline = dashboard2_po_pipeline
# Card: Purchase Order Status

# ── Action to be Taken (9 cards) ────────────────────────────────────────────
plant_performance_injob_inspection = dashboard2_injob_inspection
# Card: Job Order Inspection

plant_performance_inter_inspection = dashboard2_inter_inspection
# Card: Intermediate Inspection

plant_performance_final_inspection_org_rej_rwk = dashboard2_final_inspection_org_rej_rwk
# Card: Final Inspection (org rejection/rework)

plant_performance_downtime_by_reason = dashboard2_downtime_by_reason
# Card: Downtime by Reason

plant_performance_top_defect_categories = dashboard2_top_defect_categories
# Card: Top Defect Categories

plant_performance_customer_complaints = dashboard2_customer_complaints
# Card: Customer Complaints

plant_performance_iqc_rejections = dashboard2_iqc_rejections
# Card: IQC — Incoming Quality Rejections

plant_performance_grn_pending_pipeline = dashboard2_grn_pending_pipeline
# Card: GRN Pending Pipeline (Quick View)

# ── Optional / shared ───────────────────────────────────────────────────────
plant_performance_inspection_pending_snapshot = dashboard2_inspection_pending_snapshot
# Inspection pending snapshot (no date filter; available for future Dashboard3 use)

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
    from_param = (request.GET.get("from") or "").strip()
    to_param = (request.GET.get("to") or "").strip()
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
    "dashboard3_bundle",
]
