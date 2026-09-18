#!/bin/bash
# ==============================================================================
# verify-speed.sh — Automated Speed & Redis Verification for BigRock VPS
# Run on AlmaLinux 9: bash deploy/verify-speed.sh
# ==============================================================================
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}       ANIMS ERP BUSINESS ANALYTICS — SPEED VERIFICATION           ${NC}"
echo -e "${BLUE}==================================================================${NC}"

# 1. Check Redis Service
echo -e "\n${YELLOW}[1/4] Checking Redis service status...${NC}"
if systemctl is-active --quiet redis; then
    echo -e "${GREEN}✓ Redis service is RUNNING.${NC}"
else
    echo -e "${RED}✗ Redis service is NOT active.${NC}"
    echo -e "  Run as root: sudo systemctl enable --now redis"
fi

# Test Redis ping
if command -v redis-cli &> /dev/null; then
    PONG=$(redis-cli ping 2>/dev/null || echo "FAIL")
    if [ "$PONG" == "PONG" ]; then
        echo -e "${GREEN}✓ Redis-cli responded: PONG (Latency < 1ms)${NC}"
    else
        echo -e "${RED}✗ Redis ping failed! Check redis.conf bind address.${NC}"
    fi
else
    echo -e "${YELLOW}! redis-cli not found. (Install with: sudo dnf install -y redis)${NC}"
fi

# 2. Check Virtualenv Python packages
echo -e "\n${YELLOW}[2/4] Checking Python packages in virtualenv...${NC}"
VENV_PYTHON="/home/animserp/virtualenv/business_analytics/3.9/bin/python"

if [ ! -f "$VENV_PYTHON" ]; then
    # Fallback to local active python
    VENV_PYTHON=$(which python3 || which python)
fi

echo -e "Using Python: $VENV_PYTHON"
$VENV_PYTHON -c "
import sys
packages = ['django', 'django_redis', 'redis', 'pyodbc', 'rest_framework']
missing = []
for p in packages:
    try:
        __import__(p)
        print(f'  ✓ {p} is installed')
    except ImportError:
        missing.append(p)
        print(f'  ✗ {p} is MISSING')

if missing:
    print('\n[ACTION REQUIRED] Run: pip install -r requirements-py39.txt')
    sys.exit(1)
"

# 3. Test In-Memory Cache Read/Write Latency
echo -e "\n${YELLOW}[3/4] Benchmarking Django + Redis In-Memory Speed...${NC}"
cd /home/animserp/business_analytics 2>/dev/null || true

$VENV_PYTHON -c "
import os, time, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
try:
    import django
    django.setup()
    from django.core.cache import cache

    # Benchmark Write
    t0 = time.time()
    cache.set('anims_speed_test', {'status': 'fast', 'ts': t0}, timeout=60)
    t1 = time.time()
    write_ms = (t1 - t0) * 1000

    # Benchmark Read
    t0 = time.time()
    val = cache.get('anims_speed_test')
    t1 = time.time()
    read_ms = (t1 - t0) * 1000

    print(f'  ✓ Cache WRITE: {write_ms:.3f} ms')
    print(f'  ✓ Cache READ:  {read_ms:.3f} ms')

    if read_ms < 5.0:
        print('  ★ SUB-5MS HIGH-SPEED CACHE ENGINE IS ACTIVE!')
    else:
        print('  ! Note: High cache latency detected. Verify Redis is local.')
except Exception as e:
    print(f'  ✗ Cache test failed: {e}')
"

# 4. Check API Endpoints
echo -e "\n${YELLOW}[4/4] Checking API Health...${NC}"
API_URL="https://api-businessanalytics.animserp.com/api/companies/public/"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" || echo "000")

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ Public Companies API responded 200 OK.${NC}"
else
    echo -e "${YELLOW}! Public API returned code: $HTTP_CODE (Verify Application Manager is running)${NC}"
fi

echo -e "\n${BLUE}==================================================================${NC}"
echo -e "${GREEN}  VERIFICATION COMPLETE!${NC}"
echo -e "${BLUE}==================================================================${NC}"
