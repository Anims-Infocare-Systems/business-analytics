from django.urls import path
from .views import (
    # Health & Authentication
    health_check, login_view, logout_view, get_company,
    forgot_password_verify, forgot_password_reset,
    # Charts - Sabarish (Monthwise)
    po_vs_sales, customer_complaints, rejection_monthwise, rework_monthwise, mac_rejection_ppm, otd_report,
    # Purchase
    purchase_report_monthwise, supplier_rating_monthwise,
    # Vendor
    vendor_rejection_monthwise,
    # Operations
    overall_efficiency_monthwise, production_value_monthwise,
    # Production - Operator Efficiency & Machine Idle Time & Machine Efficiency
    get_operators, operator_efficiency, overall_operator_efficiency, machine_wise_idle_time, get_machines, machine_efficiency_monthwise,
    # Dashboard2 - Pranesh (Full Implementation)
    dashboard2_kpis, dashboard2_production_by_shift, dashboard2_idle_hours, dashboard2_downtime_by_reason, dashboard2_customer_complaints, dashboard2_po_pipeline, dashboard2_inspection_pending_snapshot, dashboard2_grn_pending_pipeline, dashboard2_iqc_rejections, dashboard2_otd, dashboard2_final_inspection_kpi, dashboard2_injob_inspection, dashboard2_inter_inspection, dashboard2_final_inspection_org_rej_rwk, dashboard2_top_defect_categories,
)
from .views_dashboard1 import (
    dashboard1_sales_kpi, dashboard1_purchase_kpi, dashboard1_production_kpi, dashboard1_quality_value_kpi, dashboard1_sales_projections, dashboard1_purchase_projections, dashboard1_oa_efficiency_weekly, dashboard1_quality_rejections_weekly,
)
from .views_plantperformance import (
    plant_performance_bundle, plant_performance_kpis, plant_performance_production_by_shift, plant_performance_idle_hours, plant_performance_downtime_by_reason, plant_performance_customer_complaints, plant_performance_po_pipeline, plant_performance_inspection_pending_snapshot, plant_performance_grn_pending_pipeline, plant_performance_iqc_rejections, plant_performance_otd, plant_performance_final_inspection_kpi, plant_performance_injob_inspection, plant_performance_inter_inspection, plant_performance_final_inspection_org_rej_rwk, plant_performance_top_defect_categories, plant_performance_grn_value, plant_performance_sales_analysis,
)
from .views_eapproval import (
    eapproval_list, eapproval_stats, eapproval_detail, eapproval_approve, eapproval_modify,
)
from .views_tapproval import (
    tapproval_list, tapproval_stats, tapproval_detail, tapproval_approve, tapproval_modify,
)
from .views_userrights import (
    user_rights_list, user_rights_me, user_rights_update, user_rights_bulk_save,
    user_rights_add_user, user_rights_delete,
)
from .views_sales_analysis import (
    sales_analysis_summary_strip, sales_analysis_weekly_trend, sales_analysis_revenue_charts, sales_analysis_month_summary, sales_analysis_invoice_details, sales_analysis_top_products,
)
from .views_idle_time_report import idle_time_report
from .views_efficiency_report import efficiency_report
from .views_production_analysis import (
    production_analysis_report, production_value_report, production_idle_breakdown, daily_production_details
)
from .views_purchaseanalysis import (
    purchase_analysis_summary, purchase_analysis_weekly_trend, purchase_analysis_charts, purchase_analysis_pipeline, purchase_analysis_po_details, purchase_analysis_grn_aging, purchase_analysis_month_summary, purchase_analysis_po_types, purchase_analysis_po_table,
)
from .views_qualityanalysis import (
    quality_analysis_summary, quality_analysis_charts, quality_analysis_product_performance, quality_analysis_defect_causes, quality_analysis_records, quality_analysis_calibration, quality_analysis_insights,
)
from .views_signup import signup_view
from .views_settings import settings_profile, settings_change_password, settings_upgrade_plan
from .views_adminpannel import (
    admin_login, admin_logout, admin_check_session,
    admin_list_tenants, admin_create_tenant, admin_update_tenant, admin_patch_tenant_status, admin_delete_tenant,
    admin_list_tenant_users, admin_delete_tenant_user
)
from .views_animsutility import admin_utility_clients, admin_utility_activity


urlpatterns = [
    # ── Health & Authentication ────────────────────────────────────────
    path('health/', health_check, name='health_check'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('company/<str:code>/', get_company, name='get_company'),
    path('signup/', signup_view, name='signup'),
    path('forgot-password/verify/', forgot_password_verify, name='forgot_password_verify'),
    path('forgot-password/reset/', forgot_password_reset, name='forgot_password_reset'),
    path('settings/profile/', settings_profile, name='settings_profile'),
    path('settings/change-password/', settings_change_password, name='settings_change_password'),
    path('settings/upgrade-plan/', settings_upgrade_plan, name='settings_upgrade_plan'),

    # ── Charts (Sabarish - Monthwise) ─────────────────────────────────
    path('po-vs-sales/', po_vs_sales, name='po_vs_sales'),
    path('customer-complaints/', customer_complaints, name='customer_complaints'),
    path('quality/rejection-monthwise/', rejection_monthwise, name='rejection_monthwise'),
    path('quality/rework-monthwise/', rework_monthwise, name='rework_monthwise'),
    path('quality/mac-rejection-ppm/', mac_rejection_ppm, name='mac_rejection_ppm'),
    path('otd-report/', otd_report, name='otd_report'),

    # ── Purchase (Monthwise) ──────────────────────────────────────────
    path('purchase/report-monthwise/', purchase_report_monthwise, name='purchase_report_monthwise'),
    path('purchase/supplier-rating/', supplier_rating_monthwise, name='supplier_rating_monthwise'),

    # ── Vendor ────────────────────────────────────────────────────────
    path('vendor/rejection-monthwise/', vendor_rejection_monthwise, name='vendor_rejection_monthwise'),

    # ── Operations ────────────────────────────────────────────────────
    path('operations/overall-efficiency/', overall_efficiency_monthwise, name='overall_efficiency_monthwise'),
    path('operations/production-value/', production_value_monthwise, name='production_value_monthwise'),

    # ── Production - Operator & Machine ───────────────────────────────
    path('production/operators/', get_operators, name='get_operators'),
    path('production/operator-efficiency/', operator_efficiency, name='operator_efficiency'),
    path('production/overall-operator-efficiency/', overall_operator_efficiency, name='overall_operator_efficiency'),
    path('production/machine-idle-time/', machine_wise_idle_time, name='machine_wise_idle_time'),
    path('production/machines/', get_machines, name='get_machines'),
    path('production/machine-efficiency-monthwise/', machine_efficiency_monthwise, name='machine_efficiency_monthwise'),

    # ── Dashboard2 (Pranesh - Full Implementation) ────────────────────
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

    # ── Plant Performance (Dashboard3) ────────────────────────────────
    path('plant-performance/bundle/', plant_performance_bundle, name='plant_performance_bundle'),
    path('plant-performance/kpis/', plant_performance_kpis, name='plant_performance_kpis'),
    path('plant-performance/production-by-shift/', plant_performance_production_by_shift, name='plant_performance_production_by_shift'),
    path('plant-performance/idle-hours/', plant_performance_idle_hours, name='plant_performance_idle_hours'),
    path('plant-performance/downtime-by-reason/', plant_performance_downtime_by_reason, name='plant_performance_downtime_by_reason'),
    path('plant-performance/customer-complaints/', plant_performance_customer_complaints, name='plant_performance_customer_complaints'),
    path('plant-performance/po-pipeline/', plant_performance_po_pipeline, name='plant_performance_po_pipeline'),
    path('plant-performance/inspection-pending-snapshot/', plant_performance_inspection_pending_snapshot, name='plant_performance_inspection_pending_snapshot'),
    path('plant-performance/grn-pending-pipeline/', plant_performance_grn_pending_pipeline, name='plant_performance_grn_pending_pipeline'),
    path('plant-performance/iqc-rejections/', plant_performance_iqc_rejections, name='plant_performance_iqc_rejections'),
    path('plant-performance/otd/', plant_performance_otd, name='plant_performance_otd'),
    path('plant-performance/final-inspection-kpi/', plant_performance_final_inspection_kpi, name='plant_performance_final_inspection_kpi'),
    path('plant-performance/injob-inspection/', plant_performance_injob_inspection, name='plant_performance_injob_inspection'),
    path('plant-performance/inter-inspection/', plant_performance_inter_inspection, name='plant_performance_inter_inspection'),
    path('plant-performance/final-inspection-org-rej-rwk/', plant_performance_final_inspection_org_rej_rwk, name='plant_performance_final_inspection_org_rej_rwk'),
    path('plant-performance/top-defect-categories/', plant_performance_top_defect_categories, name='plant_performance_top_defect_categories'),
    path('plant-performance/grn-value/', plant_performance_grn_value, name='plant_performance_grn_value'),
    path('plant-performance/sales-analysis/', plant_performance_sales_analysis, name='plant_performance_sales_analysis'),

    # ── Dashboard1 ────────────────────────────────────────────────────
    path('dashboard1/sales-kpi/', dashboard1_sales_kpi, name='dashboard1_sales_kpi'),
    path('dashboard1/purchase-kpi/', dashboard1_purchase_kpi, name='dashboard1_purchase_kpi'),
    path('dashboard1/production-kpi/', dashboard1_production_kpi, name='dashboard1_production_kpi'),
    path('dashboard1/quality-value-kpi/', dashboard1_quality_value_kpi, name='dashboard1_quality_value_kpi'),
    path('dashboard1/sales-projections/', dashboard1_sales_projections, name='dashboard1_sales_projections'),
    path('dashboard1/purchase-projections/', dashboard1_purchase_projections, name='dashboard1_purchase_projections'),
    path('dashboard1/oa-efficiency-weekly/', dashboard1_oa_efficiency_weekly, name='dashboard1_oa_efficiency_weekly'),
    path('dashboard1/quality-rejections-weekly/', dashboard1_quality_rejections_weekly, name='dashboard1_quality_rejections_weekly'),

    # ── Sales Analysis ────────────────────────────────────────────────
    path('sales-analysis/summary-strip/', sales_analysis_summary_strip, name='sales_analysis_summary_strip'),
    path('sales-analysis/weekly-trend/', sales_analysis_weekly_trend, name='sales_analysis_weekly_trend'),
    path('sales-analysis/revenue-charts/', sales_analysis_revenue_charts, name='sales_analysis_revenue_charts'),
    path('sales-analysis/month-summary/', sales_analysis_month_summary, name='sales_analysis_month_summary'),
    path('sales-analysis/invoice-details/', sales_analysis_invoice_details, name='sales_analysis_invoice_details'),
    path('sales-analysis/top-products/', sales_analysis_top_products, name='sales_analysis_top_products'),

    # ── Idle Time Report ──────────────────────────────────────────────
    path('idle-time-report/', idle_time_report, name='idle_time_report'),

    # ── Efficiency Report (MIS) ───────────────────────────────────────
    path('efficiency-report/', efficiency_report, name='efficiency_report'),

    # ── Production Analysis ───────────────────────────────────────────
    path('production-analysis-report/', production_analysis_report, name='production_analysis_report'),
    path('production-value-report/', production_value_report, name='production_value_report'),
    path('production-idle-breakdown/', production_idle_breakdown, name='production_idle_breakdown'),
    path('production-analysis/daily-details/', daily_production_details, name='daily_production_details'),

    # ── Purchase Analysis ─────────────────────────────────────────────
    path('purchase-analysis/summary/', purchase_analysis_summary, name='purchase_analysis_summary'),
    path('purchase-analysis/weekly-trend/', purchase_analysis_weekly_trend, name='purchase_analysis_weekly_trend'),
    path('purchase-analysis/charts/', purchase_analysis_charts, name='purchase_analysis_charts'),
    path('purchase-analysis/pipeline/', purchase_analysis_pipeline, name='purchase_analysis_pipeline'),
    path('purchase-analysis/po-details/', purchase_analysis_po_details, name='purchase_analysis_po_details'),
    path('purchase-analysis/grn-aging/', purchase_analysis_grn_aging, name='purchase_analysis_grn_aging'),
    path('purchase-analysis/month-summary/', purchase_analysis_month_summary, name='purchase_analysis_month_summary'),
    path('purchase-analysis/po-types/', purchase_analysis_po_types, name='purchase_analysis_po_types'),
    path('purchase-analysis/po-table/', purchase_analysis_po_table, name='purchase_analysis_po_table'),

    # ── Quality Analysis ──────────────────────────────────────────────
    path('quality-analysis/summary/', quality_analysis_summary, name='quality_analysis_summary'),
    path('quality-analysis/charts/', quality_analysis_charts, name='quality_analysis_charts'),
    path('quality-analysis/product-performance/', quality_analysis_product_performance, name='quality_analysis_product_performance'),
    path('quality-analysis/defect-causes/', quality_analysis_defect_causes, name='quality_analysis_defect_causes'),
    path('quality-analysis/records/', quality_analysis_records, name='quality_analysis_records'),
    path('quality-analysis/calibration/', quality_analysis_calibration, name='quality_analysis_calibration'),
    path('quality-analysis/insights/', quality_analysis_insights, name='quality_analysis_insights'),

    # ── E-Approval Module ─────────────────────────────────────────────
    path('eapproval/list/', eapproval_list, name='eapproval_list'),
    path('eapproval/stats/', eapproval_stats, name='eapproval_stats'),
    path('eapproval/detail/', eapproval_detail, name='eapproval_detail'),
    path('eapproval/approve/', eapproval_approve, name='eapproval_approve'),
    path('eapproval/modify/', eapproval_modify, name='eapproval_modify'),

    # ── T-Approval Module ─────────────────────────────────────────────
    path('tapproval/list/', tapproval_list, name='tapproval_list'),
    path('tapproval/stats/', tapproval_stats, name='tapproval_stats'),
    path('tapproval/detail/', tapproval_detail, name='tapproval_detail'),
    path('tapproval/approve/', tapproval_approve, name='tapproval_approve'),
    path('tapproval/modify/', tapproval_modify, name='tapproval_modify'),

    # ── User Rights ───────────────────────────────────────────────────
    path('user-rights/list/', user_rights_list, name='user_rights_list'),
    path('user-rights/me/', user_rights_me, name='user_rights_me'),
    path('user-rights/update/', user_rights_update, name='user_rights_update'),
    path('user-rights/bulk-save/', user_rights_bulk_save, name='user_rights_bulk_save'),
    path('user-rights/add-user/', user_rights_add_user, name='user_rights_add_user'),
    path('user-rights/delete/<int:user_id>/', user_rights_delete, name='user_rights_delete'),

    # ── Admin Panel ───────────────────────────────────────────────────
    path('admin/login/', admin_login, name='admin_login'),
    path('admin/logout/', admin_logout, name='admin_logout'),
    path('admin/check-session/', admin_check_session, name='admin_check_session'),
    path('admin/tenants/', admin_list_tenants, name='admin_list_tenants'),
    path('admin/tenants/create/', admin_create_tenant, name='admin_create_tenant'),
    path('admin/tenants/update/', admin_update_tenant, name='admin_update_tenant'),
    path('admin/tenants/<int:tenant_id>/status/', admin_patch_tenant_status, name='admin_patch_tenant_status'),
    path('admin/tenants/delete/<int:tenant_id>/', admin_delete_tenant, name='admin_delete_tenant'),
    path('admin/tenants/<str:company_code>/users/', admin_list_tenant_users, name='admin_list_tenant_users'),
    path('admin/tenants/users/<int:user_id>/', admin_delete_tenant_user, name='admin_delete_tenant_user'),
    path('admin/utility/clients/', admin_utility_clients, name='admin_utility_clients'),
    path('admin/utility/activity/', admin_utility_activity, name='admin_utility_activity'),
]