from django.urls import path
from .views import (
    # Login & Company
    login_view,
    get_company,
    
    # Charts - Sabarish (Monthwise)
    po_vs_sales,
    customer_complaints,
    rejection_monthwise,
    rework_monthwise,
    mac_rejection_ppm,
    otd_report,
    
    # Production - Operator Efficiency
    get_operators,
    operator_efficiency,
    overall_operator_efficiency,
    
    # Dashboard2 - Pranesh (Full Implementation)
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

urlpatterns = [
    # ── Authentication ────────────────────────────────────────
    path('login/', login_view, name='login'),
    path('company/<str:code>/', get_company, name='get_company'),
    
    # ── Charts (Sabarish - Monthwise) ─────────────────────────
    path('po-vs-sales/', po_vs_sales, name='po_vs_sales'),
    path('customer-complaints/', customer_complaints, name='customer_complaints'),
    path('quality/rejection-monthwise/', rejection_monthwise, name='rejection_monthwise'),
    path('quality/rework-monthwise/', rework_monthwise, name='rework_monthwise'),
    path('quality/mac-rejection-ppm/', mac_rejection_ppm, name='mac_rejection_ppm'),
    path('otd-report/', otd_report, name='otd_report'),
    
    # ── Production - Operator Efficiency ──────────────────────
    path('production/operators/', get_operators, name='get_operators'),
    path('production/operator-efficiency/', operator_efficiency, name='operator_efficiency'),
    path('production/overall-operator-efficiency/', overall_operator_efficiency, name='overall_operator_efficiency'),
    
    # ── Dashboard2 (Pranesh - Full Implementation) ────────────
    path('dashboard2/kpis/', dashboard2_kpis, name='dashboard2_kpis'),
    path('dashboard2/production-by-shift/', dashboard2_production_by_shift, name='dashboard2_production_by_shift'),
    path('dashboard2/idle-hours/', dashboard2_idle_hours, name='dashboard2_idle_hours'),
    path('dashboard2/downtime-by-reason/', dashboard2_downtime_by_reason, name='dashboard2_downtime_by_reason'),
    path('dashboard2/customer-complaints/', dashboard2_customer_complaints, name='dashboard2_customer_complaints'),
    path('dashboard2/po-pipeline/', dashboard2_po_pipeline, name='dashboard2_po_pipeline'),
    path('dashboard2/inspection-pending-snapshot/', dashboard2_inspection_pending_snapshot, name='dashboard2_inspection_pending_snapshot'),
    path('dashboard2/grn-pending-pipeline/', dashboard2_grn_pending_pipeline, name='dashboard2_grn_pending_pipeline'),
    path('dashboard2/iqc-rejections/', dashboard2_iqc_rejections, name='dashboard2_iqc_rejections'),
    path('dashboard2/otd/', dashboard2_otd, name='dashboard2_otd'),
    path('dashboard2/final-inspection-kpi/', dashboard2_final_inspection_kpi, name='dashboard2_final_inspection_kpi'),
    path('dashboard2/injob-inspection/', dashboard2_injob_inspection, name='dashboard2_injob_inspection'),
    path('dashboard2/inter-inspection/', dashboard2_inter_inspection, name='dashboard2_inter_inspection'),
    path('dashboard2/final-inspection-org-rej-rwk/', dashboard2_final_inspection_org_rej_rwk, name='dashboard2_final_inspection_org_rej_rwk'),
    path('dashboard2/top-defect-categories/', dashboard2_top_defect_categories, name='dashboard2_top_defect_categories'),
]
