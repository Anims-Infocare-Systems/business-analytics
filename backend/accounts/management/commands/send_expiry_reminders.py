import datetime
from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings
from accounts.views_signup import send_brevo_email_async

class Command(BaseCommand):
    help = "Daily check to send email notifications to tenants whose plans expire in 1 to 10 days."

    def handle(self, *args, **options):
        today = datetime.date.today()
        self.stdout.write(f"[{datetime.datetime.now()}] Running expiry check...")

        try:
            with connection.cursor() as cursor:
                # Query active tenant signups
                cursor.execute(
                    """
                    SELECT company_code, company_name, plan_name, business_person_name, email_id, end_date
                    FROM tenants_signup
                    WHERE active_status = 1
                    """
                )
                rows = cursor.fetchall()
        except Exception as db_err:
            self.stdout.write(self.style.ERROR(f"Database error during query: {db_err}"))
            return

        sent_count = 0
        for row in rows:
            company_code, company_name, plan_name, person_name, email_id, end_date = row

            if not end_date:
                continue

            # Normalize end_date to date object
            if isinstance(end_date, datetime.datetime):
                end_date = end_date.date()
            elif isinstance(end_date, datetime.date):
                pass
            else:
                try:
                    # String parsing fallback
                    end_date = datetime.datetime.strptime(str(end_date).split()[0], "%Y-%m-%d").date()
                except ValueError:
                    continue

            # Calculate remaining days
            days_left = (end_date - today).days

            # Send email reminder if plan is expiring in 1 to 10 days
            if 1 <= days_left <= 10:
                self.stdout.write(f"Tenant {company_name} ({company_code}) expires in {days_left} days. Dispatched email.")
                
                valid_to = end_date.strftime("%d-%m-%Y")
                
                send_brevo_email_async({
                    "template_id": getattr(settings, 'BREVO_EXPIRY_TEMPLATE_ID', 3),
                    "person_name": person_name,
                    "company_code": company_code,
                    "company_name": company_name,
                    "admin_username": "Admin",
                    "plan_name": plan_name,
                    "users": 0,
                    "email": email_id,
                    "sub_period": "",
                    "valid_from": "",
                    "valid_to": valid_to,
                    "days_left": days_left
                })
                sent_count += 1

        self.stdout.write(self.style.SUCCESS(f"Expiry check completed. {sent_count} emails dispatched."))
