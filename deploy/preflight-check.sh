#!/bin/bash
# Run on the VPS before installing Business Analytics. Read-only checks.
set -e

echo "=== Ports in use (pick a free port for Gunicorn, default 8001) ==="
ss -tlnp 2>/dev/null | grep -E ':800[0-9]|:80 |:443 ' || true

echo ""
echo "=== Nginx sites already enabled (do NOT remove these) ==="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "nginx sites-enabled not found"

echo ""
echo "=== Existing Gunicorn/uwsgi systemd units ==="
systemctl list-units --type=service --state=running 2>/dev/null | grep -iE 'gunicorn|uwsgi|django' || true

echo ""
echo "=== Suggested: if 8001 is taken, edit deploy/animserp-gunicorn.service and nginx upstream port ==="
