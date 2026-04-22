from django.urls import path
from .views import (
    login_view, 
    get_company, 
    po_vs_sales, 
    dashboard2_kpis,
    dashboard2_final_inspection_kpi, 
    dashboard2_idle_hours, 
    dashboard2_otd,
    customer_complaints,
    rejection_monthwise, # <--- Added new import
)

urlpatterns = [
    path('login/', login_view),
    path('company/<str:code>/', get_company),
    
    # Chart APIs
    path('po-vs-sales/', po_vs_sales),
    path('customer-complaints/', customer_complaints, name='customer_complaints'),
    path('quality/rejection-monthwise/', rejection_monthwise, name='rejection_monthwise'), # <--- Added new path
    
    # Dashboard 2 APIs
    path('dashboard2/kpis/', dashboard2_kpis),
    path('dashboard2/idle-hours/', dashboard2_idle_hours),
    path('dashboard2/otd/', dashboard2_otd),
    path(
        "dashboard2/final-inspection-kpi/",
        dashboard2_final_inspection_kpi,
        name="dashboard2_final_inspection_kpi",
    ),
]
