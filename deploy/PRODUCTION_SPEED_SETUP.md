# Production Server Setup Guide for Maximum Speed (BigRock VPS)

**Server Specifications:**
- **OS:** AlmaLinux 9 (64-bit)
- **CPU:** 2 Cores
- **RAM:** 4 GB
- **Bandwidth:** 2 TB
- **Domain:** `https://anims.animserp.com` (Frontend)
- **API Domain:** `https://api-businessanalytics.animserp.com` (Backend)

---

## Why These Steps Are Required in Production
All the performance optimizations we built (sub-5ms responses, 0ms company code verification, instant tab transitions, session offloading) rely on:
1. **Redis Server** running in memory on the VPS.
2. **Python `redis` + `django-redis` packages** installed in the Python 3.9 virtual environment.
3. **Database connection pooling** & background daemon workers active in Gunicorn / Passenger.
4. **Optimized Frontend build** uploaded to `public_html/anims/`.
5. **Gzip & Browser Caching headers** in `.htaccess`.

Follow the simple checklist below.

---

## Step 1: Install & Start Redis on AlmaLinux 9 (Root user)

Connect to your VPS via SSH as **root**:

```bash
# 1. Install Redis using AlmaLinux package manager
dnf install -y redis

# 2. Enable Redis to start automatically on system boot and start it now
systemctl enable --now redis

# 3. Verify Redis is running and responding
redis-cli ping
# Output must be: PONG
```

### Tune Redis for 4 GB RAM VPS:
To ensure Redis never consumes more RAM than your VPS can handle, set a 512 MB memory limit:

```bash
# Open redis configuration file
nano /etc/redis/redis.conf
# (Or on some AlmaLinux installations: nano /etc/redis.conf)
```
Add or update these two lines at the end of the file:
```text
maxmemory 512mb
maxmemory-policy allkeys-lru
```
Save and restart Redis:
```bash
systemctl restart redis
```

---

## Step 2: Update Backend Code on the Server

Switch to your user account `animserp`:

```bash
su - animserp
cd /home/animserp/business_analytics

# Pull the latest commit with all optimizations
git pull origin main
```

---

## Step 3: Install Required Python Packages in Virtual Environment

Ensure the Python 3.9 virtual environment has `redis` and `django-redis`:

```bash
# Activate your Python virtual environment
source /home/animserp/virtualenv/business_analytics/3.9/bin/activate

# Upgrade pip and install the production dependencies
pip install --upgrade pip
pip install -r requirements-py39.txt

# Verify Redis package in Python:
python -c "import redis, django_redis; print('Redis libraries installed successfully!')"
```

---

## Step 4: Verify Environment Variables

In **cPanel → Application Manager → Edit (AnimsBusinessAnalytics) → Environment Variables**:
Ensure the following variables are present and saved:

| Variable Name | Recommended Value |
| :--- | :--- |
| `REDIS_URL` | `redis://127.0.0.1:6379/1` |
| `DJANGO_DEBUG` | `False` |
| `DJANGO_SECRET_KEY` | *(Your secure key)* |
| `DJANGO_ALLOWED_HOSTS` | `api-businessanalytics.animserp.com,anims.animserp.com,66.116.197.240,localhost,127.0.0.1` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://api-businessanalytics.animserp.com,https://anims.animserp.com` |
| `DJANGO_CORS_ALLOWED_ORIGINS` | `https://anims.animserp.com` |
| `DJANGO_SESSION_COOKIE_DOMAIN` | `.animserp.com` |
| `DB_NAME` | `SASSMMS` |
| `DB_USER` | *(Your MS SQL User)* |
| `DB_PASSWORD` | *(Your MS SQL Password)* |
| `DB_HOST` | *(Your MS SQL Host IP / Domain)* |
| `DB_PORT` | `1433` |

---

## Step 5: Run Migration & Collect Static Files

```bash
cd /home/animserp/business_analytics
source /home/animserp/virtualenv/business_analytics/3.9/bin/activate

python manage.py migrate
python manage.py collectstatic --noinput
```

---

## Step 6: Restart the Backend Application

- **If using cPanel Application Manager:**
  Go to **cPanel → Application Manager** and click **Restart** next to `AnimsBusinessAnalytics`.
  *(Or run: `touch /home/animserp/business_analytics/tmp/restart.txt`)*

- **If using systemd Gunicorn service:**
  ```bash
  sudo systemctl restart animserp-gunicorn
  ```

---

## Step 7: Build & Upload the Optimized Frontend

On your local development machine:

```powershell
cd "e:\Developments\Business Analytics\Business Analytics\Frontend"
npm run build
```

Then upload:
1. Upload the **contents of `Frontend/dist/`** into `/home/animserp/public_html/anims/`.
2. Upload `deploy/anims.htaccess` to `/home/animserp/public_html/anims/.htaccess` (this enables Gzip compression and 1-year browser caching for images and scripts).

---

## Step 8: Run the Automated Speed Verification Script

On your VPS terminal, execute:

```bash
cd /home/animserp/business_analytics
bash deploy/verify-speed.sh
```

**Expected Output:**
```text
==================================================================
       ANIMS ERP BUSINESS ANALYTICS — SPEED VERIFICATION           
==================================================================

[1/4] Checking Redis service status...
✓ Redis service is RUNNING.
✓ Redis-cli responded: PONG (Latency < 1ms)

[2/4] Checking Python packages in virtualenv...
  ✓ django is installed
  ✓ django_redis is installed
  ✓ redis is installed
  ✓ pyodbc is installed
  ✓ rest_framework is installed

[3/4] Benchmarking Django + Redis In-Memory Speed...
  ✓ Cache WRITE: 0.185 ms
  ✓ Cache READ:  0.142 ms
  ★ SUB-5MS HIGH-SPEED CACHE ENGINE IS ACTIVE!

[4/4] Checking API Health...
✓ Public Companies API responded 200 OK.

==================================================================
  VERIFICATION COMPLETE!
==================================================================
```
