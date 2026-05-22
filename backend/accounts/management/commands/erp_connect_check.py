"""
Run from the backend folder (same host as Django):

    python manage.py erp_connect_check --company TAK001

Step 1: TCP to erp_server:erp_port (if this fails, login will show ODBC 10061).
Step 2: Full ODBC connect (same as login_view).
"""
import socket

from django.core.management.base import BaseCommand, CommandError

from accounts.models import Tenant
from accounts.utils.db import get_connection


class Command(BaseCommand):
    help = "Check TCP + ODBC to a tenant's ERP SQL Server (mirrors login)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--company",
            required=True,
            help="Company code from tenants table, e.g. TAK001",
        )

    def handle(self, *args, **options):
        code = (options["company"] or "").strip()
        try:
            tenant = Tenant.objects.get(company_code__iexact=code, status=True)
        except Tenant.DoesNotExist as exc:
            raise CommandError(f"No active tenant with company_code={code!r}") from exc

        host = (tenant.erp_server or "").strip()
        try:
            port = int(tenant.erp_port)
        except (TypeError, ValueError) as exc:
            raise CommandError(f"Invalid erp_port for tenant: {tenant.erp_port!r}") from exc
        database = (tenant.erp_database or "").strip()

        self.stdout.write(f"Tenant: {tenant.company_name} ({tenant.company_code})")
        self.stdout.write(f"SERVER={host!r} PORT={port} DATABASE={database!r}")
        self.stdout.write("")

        self.stdout.write("1) TCP test (must succeed or ODBC gets 10061 refused)...")
        try:
            with socket.create_connection((host, port), timeout=10):
                pass
        except OSError as e:
            self.stdout.write(self.style.ERROR(f"   FAILED: {e}"))
            self.stdout.write(
                "   On the SQL machine: enable TCP/IP, confirm port, open Windows "
                "Firewall, ensure SQL Server service is running. From THIS PC, "
                "the host must be reachable (same LAN / VPN if using 192.168.x.x)."
            )
            return

        self.stdout.write(self.style.SUCCESS("   OK — port is open from this machine."))
        self.stdout.write("")
        self.stdout.write("2) ODBC (pyodbc) test — same as login...")
        try:
            conn = get_connection(
                tenant.erp_server,
                tenant.erp_database,
                tenant.erp_user,
                tenant.erp_password,
                tenant.erp_port,
            )
            conn.close()
        except Exception as e:  # noqa: BLE001 — surface full ODBC error to operator
            self.stdout.write(self.style.ERROR(f"   FAILED: {e}"))
            return

        self.stdout.write(self.style.SUCCESS("   OK — ERP database login step should work."))
