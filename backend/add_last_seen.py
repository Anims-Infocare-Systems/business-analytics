import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'tenants_userssession' AND COLUMN_NAME = 'last_seen'
    """)
    exists = cursor.fetchone()[0]
    if exists:
        print("Column last_seen already exists. Skipping.")
    else:
        cursor.execute("ALTER TABLE tenants_userssession ADD last_seen DATETIME NULL")
        print("Column last_seen added successfully.")
