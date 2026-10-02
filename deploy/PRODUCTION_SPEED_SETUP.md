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

## Step 7b: Server Tuning for the Analytics Workload (root)

The analytics modules now load through **bundle endpoints** (one HTTP request → several
panels, each bundle running at most 3 worker threads) instead of 10–16 parallel requests
per page. The server settings below are sized for that pattern on a 2-core / 4 GB VPS
with a high-latency Cloudflare tunnel to each client's SQL Server.

### Passenger (cPanel → Application Manager uses Passenger under Apache)

Create `/etc/apache2/conf.d/userdata/std/2_4/animserp/api-businessanalytics.animserp.com/passenger_tuning.conf`
(cPanel "userdata" include path; run `/scripts/rebuildhttpdconf && systemctl restart httpd` after):

```apache
# One request per process (Python/Passenger is single-threaded). 6 processes on a
# 2-core box: 2 CPU-bound + 4 waiting on the SQL tunnel. Do NOT exceed ~8 on 4 GB —
# each Django process with pyodbc + schema catalog is ~120–180 MB RSS.
PassengerMaxPoolSize 6
PassengerMinInstances 2
# Keep processes alive between bursts so the per-process schema catalog
# (utils/schema.py) and ODBC pool stay warm. 0 = never idle-kill.
PassengerPoolIdleTime 0
# Only queue a handful of requests; beyond this clients get a fast 503 instead of
# waiting minutes behind a long-running report.
PassengerMaxRequestQueueSize 40
# Recycle a process after N requests to bound pyodbc / Python heap growth.
PassengerMaxRequests 2000
# Analytics queries over the tunnel can legitimately run >60 s on cold cache.
PassengerStartTimeout 120
PassengerPreloadBundler on
```

`PassengerMaxRequestQueueSize` + the bundle endpoints mean a single user opening
Purchase Analysis now occupies **1–2** worker processes for a few seconds, instead of
13 queued requests that serialised behind each other.

### Apache (reverse proxy in front of Passenger / Gunicorn)

Add to the same vhost include (or the Gunicorn proxy vhost, if you ever switch):

```apache
# Compress API JSON (bundle responses are 0.5–3 MB uncompressed; ~85–90 % smaller gzipped)
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE application/json text/html text/plain
  DeflateCompressionLevel 5
</IfModule>

# If the API is reached through ProxyPass (not the Passenger module), keep
# upstream connections alive instead of a new TCP handshake per request.
<IfModule mod_proxy.c>
  ProxyPreserveHost On
  ProxyTimeout 300
  SetEnv proxy-nokeepalive 0
  # Example: ProxyPass /api http://127.0.0.1:8000/api keepalive=On ttl=120 timeout=300
</IfModule>

# Long-running report requests: do not let Apache cut them off at 60 s.
Timeout 300
KeepAlive On
KeepAliveTimeout 15
MaxKeepAliveRequests 200
```

### Redis

The code uses three TTL classes: analytics responses 300 s (`cache_analytics_response`),
detail/stage views 900 s, tenant schema catalog 24 h (`erp_schema:*`), sessions 24 h.
Size and policy in `/etc/redis/redis.conf` (or `/etc/redis.conf`):

```text
maxmemory 512mb
maxmemory-policy volatile-lru      # evict only keys that have a TTL (every key we write has one)
save ""                            # analytics cache + sessions are rebuildable; skip RDB snapshots (no disk I/O stalls)
appendonly no
tcp-keepalive 60
```

Check hit ratio after a day: `redis-cli info stats | grep keyspace` — `keyspace_hits` should be
several × `keyspace_misses` during working hours.

### ODBC driver connection pooling (per Passenger process)

`pyodbc.pooling = True` is set in code; the pool is managed by unixODBC and needs `Pooling=Yes`
in `/etc/odbcinst.ini` for the SQL Server driver, otherwise every request still pays the full
TCP + TLS + login round-trip over the tunnel (≈ 0.3–1 s each):

```ini
[ODBC]
Pooling=Yes

[ODBC Driver 18 for SQL Server]
Description=Microsoft ODBC Driver 18 for SQL Server
Driver=/opt/microsoft/msodbcsql18/lib64/libmsodbcsql-18.so
UsageCount=1
CPTimeout=120     ; keep an idle tunnel connection for 2 min, then drop it
```

Verify with `odbcinst -q -d -n "ODBC Driver 18 for SQL Server"` — `CPTimeout` must be listed.

### Cloudflare tunnel (client side)

In each client's `cloudflared` config, raise the idle keep-alive so pooled ODBC connections
survive between dashboard refreshes:

```yaml
ingress:
  - hostname: <client>-sql.animserp.com
    service: tcp://localhost:1433
    originRequest:
      keepAliveConnections: 10
      keepAliveTimeout: 120s
      tcpKeepAlive: 30s
```

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
