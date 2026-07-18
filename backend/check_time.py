import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("SELECT GETDATE(), GETUTCDATE()")
    db_local, db_utc = cursor.fetchone()
    print(f"DB Local Time: {db_local}")
    print(f"DB UTC Time: {db_utc}")
    diff = db_local - db_utc
    print(f"Difference: {diff}")
