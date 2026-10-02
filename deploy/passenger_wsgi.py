"""
Application Manager — next to manage.py:

  /home/animserp/business_analytics/passenger_wsgi.py

Upload contents of local backend/ into business_analytics/

Passenger spawns N single-threaded Python processes. Tuning lives in Apache
(see deploy/PRODUCTION_SPEED_SETUP.md → "Passenger"), not here. This file
only makes sure the ODBC driver's connection pool and the schema catalog
are warm per process so the first request after a (re)spawn is not slow.
"""
import os
import sys

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
if APP_ROOT not in sys.path:
    sys.path.insert(0, APP_ROOT)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

# Thread stack / GC tuning for a 4 GB box: bundle endpoints run short-lived
# ThreadPoolExecutor workers; the default 8 MB stack per thread is wasteful.
try:
    import threading
    threading.stack_size(1024 * 1024)  # 1 MB per worker thread
except Exception:  # noqa: BLE001
    pass

from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()
