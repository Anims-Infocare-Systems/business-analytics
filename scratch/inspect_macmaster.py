import sys, os
sys.path.insert(0, os.path.abspath('./backend'))
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from accounts.models import Tenant
from accounts.utils.db import get_connection

t = Tenant.objects.first()
if t:
    conn = get_connection(t.erp_server, t.erp_database, t.erp_user, t.erp_password, t.erp_port)
else:
    print('No tenant found')
    sys.exit(1)


with conn.cursor() as cursor:
    cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MacMaster'")
    cols = cursor.fetchall()
    print('MacMaster Columns:', [c[0] for c in cols])
    
    cursor.execute("SELECT DISTINCT cnc FROM MacMaster")
    print('Distinct CNC values:', cursor.fetchall())
    
    cursor.execute("SELECT macno, cnc FROM MacMaster WHERE ISNULL(deleted, 0) = 0")
    print('Machines and CNC:', cursor.fetchall())
