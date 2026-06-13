import os
import django
import logging
import time

# Configure logging to show the outcome of the background email dispatch thread
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings
from accounts.views_signup import send_brevo_email_async

def test_mail():
    recipient = input("Enter recipient email address for test: ").strip()
    if not recipient:
        print("Recipient email is required.")
        return

    print(f"\nTriggering test welcome email to '{recipient}' via Brevo...")
    email_data = {
        "email": recipient,
        "person_name": "Test Administrator",
        "company_name": "Test Corporation",
        "company_code": "TST001",
        "admin_username": "admin_test",
        "admin_password": "SecurePassword123!",
        "plan_name": "Pro Plan",
        "users": 5,
        "sub_period": "1 Year",
        "valid_from": "13-06-2026",
        "valid_to": "13-06-2027",
        "template_id": getattr(settings, 'BREVO_TEMPLATE_ID', 1)
    }

    send_brevo_email_async(email_data)
    print("Email worker thread started.")
    print("Waiting 5 seconds for API response...")
    time.sleep(5)
    print("\nTest procedure completed. Verify standard log outputs above for status.")

if __name__ == "__main__":
    test_mail()
