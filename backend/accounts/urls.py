from django.urls import path
from .views import login_view, get_company, po_vs_sales, dashboard2_kpis
from .views import dashboard2_final_inspection_kpi, dashboard2_idle_hours

urlpatterns = [
    path('login/',           login_view),
    path('company/<str:code>/', get_company),
    path('po-vs-sales/',     po_vs_sales),
    path('dashboard2/kpis/', dashboard2_kpis),
    path('dashboard2/idle-hours/', dashboard2_idle_hours),

    path(
    "dashboard2/final-inspection-kpi/",
    dashboard2_final_inspection_kpi,
    name="dashboard2_final_inspection_kpi",
    ),
    ]
