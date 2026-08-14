import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'tenants_users' AND COLUMN_NAME = 'password_updated_at'
    """)
    exists = cursor.fetchone()[0]
    if exists:
        print("Column password_updated_at already exists in tenants_users. Skipping.")
    else:
        cursor.execute("ALTER TABLE tenants_users ADD password_updated_at DATETIME NULL")
        print("Column password_updated_at added to tenants_users successfully.")

    # Backfill existing users using created_at
    cursor.execute("""
        UPDATE tenants_users 
        SET password_updated_at = COALESCE(created_at, GETDATE()) 
        WHERE password_updated_at IS NULL
    """)
    print("Backfilled existing users with password_updated_at values.")
