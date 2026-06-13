import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

create_table_sql = """
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tenants_lisencemodule]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[tenants_lisencemodule] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [tenant_id] INT NOT NULL,
        [company_code] VARCHAR(50) NOT NULL,
        [plan_id] VARCHAR(50) NOT NULL DEFAULT 'free',
        [dashboard] BIT NOT NULL DEFAULT 1,
        [approvals] BIT NOT NULL DEFAULT 1,
        [reports] BIT NOT NULL DEFAULT 1,
        [mis] BIT NOT NULL DEFAULT 1,
        [charts] BIT NOT NULL DEFAULT 1,
        [utility] BIT NOT NULL DEFAULT 1,
        [created_at] DATETIME DEFAULT GETDATE(),
        [updated_at] DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table tenants_lisencemodule created successfully.';
END
ELSE
BEGIN
    PRINT 'Table tenants_lisencemodule already exists.';
END
"""

with connection.cursor() as cursor:
    cursor.execute(create_table_sql)
    print("Database command executed.")
