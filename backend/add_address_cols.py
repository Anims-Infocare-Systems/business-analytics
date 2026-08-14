import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection

cols = [
    ('address1', 'NVARCHAR(255)'),
    ('address2', 'NVARCHAR(255)'),
    ('city', 'NVARCHAR(100)'),
    ('state', 'NVARCHAR(100)'),
    ('pincode', 'NVARCHAR(20)'),
    ('country', 'NVARCHAR(100)'),
]

with connection.cursor() as cursor:
    for col_name, col_type in cols:
        try:
            sql = f"""
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('tenants_signup') AND name = '{col_name}')
            BEGIN
                ALTER TABLE tenants_signup ADD {col_name} {col_type} NULL;
            END
            """
            cursor.execute(sql)
            print(f"Verified/added column: {col_name}")
        except Exception as e:
            print(f"Error for {col_name}: {e}")

print("Done verifying address columns in tenants_signup.")
