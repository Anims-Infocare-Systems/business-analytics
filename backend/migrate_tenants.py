import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.views import update_tenant_license

def migrate_existing_tenants():
    with connection.cursor() as cursor:
        cursor.execute("SELECT tenant_id, company_code, plan_id, plan_name FROM tenants_signup")
        rows = cursor.fetchall()
        
    print(f"Found {len(rows)} tenants in tenants_signup.")
    for row in rows:
        tenant_id, company_code, plan_id, plan_name = row
        tenant_id = int(tenant_id)
        company_code = str(company_code).strip()
        plan_id = str(plan_id or "free").strip().lower()
        
        print(f"Migrating tenant: ID={tenant_id}, Code={company_code}, Plan={plan_id} (Name: {plan_name})")
        update_tenant_license(tenant_id, company_code, plan_id)
        
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate_existing_tenants()
