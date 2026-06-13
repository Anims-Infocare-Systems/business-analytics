import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

with connection.cursor() as cursor:
    cursor.execute("SELECT id, tenant_id, company_code, plan_id, dashboard, approvals, reports, mis, charts, utility FROM tenants_lisencemodule")
    rows = cursor.fetchall()
    print("Contents of tenants_lisencemodule:")
    for r in rows:
        print(f"ID={r[0]}, TenantID={r[1]}, Company={r[2]}, Plan={r[3]}, Dashboard={r[4]}, Approvals={r[5]}, Reports={r[6]}, MIS={r[7]}, Charts={r[8]}, Utility={r[9]}")
