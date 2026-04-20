from django.contrib import admin
from .models import Tenant

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display  = ["company_code", "company_name", "erp_server", "erp_database", "erp_port", "status"]
    search_fields = ["company_code", "company_name"]
    list_filter   = ["status"]
    ordering      = ["company_code"]