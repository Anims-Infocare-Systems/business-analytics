# Deploy Business Analytics on Bigrock VPS

**Goal:** Run this app **without touching** `/home/animserp/django_app`.

| Item | Path / URL |
|------|------------|
| Old app (keep) | `/home/animserp/django_app` → `thirumala.animserp.com` |
| **New API** | `/home/animserp/business_analytics` → `https://api-businessanalytics.animserp.com/api/` |
| **New frontend** | `/home/animserp/public_html/anims` → `https://anims.animserp.com` |
| VPS IP | `66.116.197.240` |

**Do not use** `ba_app` or `api-analytics` for this project (those are for other/old apps).

**Helpers:** `deploy/passenger_wsgi.py`, `deploy/requirements-py39.txt`, `deploy/.env.example`, `deploy/anims.htaccess`  
**Cloudflare:** [CLOUDFLARE.md](./CLOUDFLARE.md)

---

### Super-short checklist

1. Subdomains **`anims`** + **`api-businessanalytics`** in cPanel (document roots below).  
2. Upload backend into **`/home/animserp/business_analytics`** (never touch `django_app`).  
3. **Application Manager** → domain **`api-businessanalytics.animserp.com`**, path **`business_analytics`**, `passenger_wsgi.py`.  
4. Set **environment variables** (`DJANGO_*`, `DB_*`) in Application Manager.  
5. **Python 3.9 venv** → `pip install -r requirements-py39.txt` → `migrate`.  
6. Build React → upload `Frontend/dist` → **`public_html/anims`**.  
7. **Cloudflare DNS + SSL** ([CLOUDFLARE.md](./CLOUDFLARE.md)).  
8. Test: `https://anims.animserp.com` and `https://api-businessanalytics.animserp.com/api/`.

---

## 1. Subdomains (cPanel → Domains)

| Subdomain | Document root | URL |
|-----------|---------------|-----|
| `anims` | `public_html/anims` | `https://anims.animserp.com` |
| `api-businessanalytics` | `public_html/business_analytics` or app path `~/business_analytics` | `https://api-businessanalytics.animserp.com` |

**Leave unchanged:** `django_app`, `analytics_web`, `api-analytics`, `thirumala`, `animserp.com` root (unless you know you need them).

**Force HTTPS** ON for `anims` and `api-businessanalytics`.

---

## 2. Upload backend → `business_analytics`

**Never** put files in `/home/animserp/django_app`.

### Server layout

Upload **contents** of local `backend/` into `/home/animserp/business_analytics/`:

```
/home/animserp/business_analytics/
  manage.py
  passenger_wsgi.py       ← deploy/passenger_wsgi.py
  requirements-py39.txt   ← deploy/requirements-py39.txt
  accounts/
  backend/
    settings.py
    urls.py
    wsgi.py
```

| Local | Server |
|-------|--------|
| `backend/manage.py` | `business_analytics/manage.py` |
| `backend/accounts/` | `business_analytics/accounts/` |
| `backend/backend/` | `business_analytics/backend/` |

**Wrong:** `business_analytics/backend/manage.py` (extra nested level).

---

## 3. Application Manager (API)

cPanel → **Application Manager** → **+ Register Application** (or **Edit** existing **AnimsBusinessAnalytics**)

| Field | Value |
|-------|--------|
| Application name | `AnimsBusinessAnalytics` |
| Deployment domain | **`api-businessanalytics.animserp.com`** |
| Application path | **`business_analytics`** |
| Environment | **Production** |
| Startup file | `passenger_wsgi.py` |
| Entry point | `application` |

Click **Deploy** → **Restart** after env vars and pip install.

**Ignore** failed “Ensure dependencies” using `/usr/bin/pip` — use Section 5 venv instead.

---

## 4. Environment variables

**Application Manager → Environment variables** (`deploy/.env.example`):

| Variable | Value |
|----------|--------|
| `DJANGO_SECRET_KEY` | long random string |
| `DJANGO_DEBUG` | `False` |
| `DJANGO_ALLOWED_HOSTS` | `api-businessanalytics.animserp.com,anims.animserp.com,66.116.197.240` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://api-businessanalytics.animserp.com,https://anims.animserp.com` |
| `DJANGO_CORS_ALLOWED_ORIGINS` | `https://anims.animserp.com` |
| `DJANGO_SESSION_COOKIE_DOMAIN` | `.animserp.com` |
| `DB_NAME` | `SASSMMS` |
| `DB_USER` | your SQL user |
| `DB_PASSWORD` | your SQL password |
| `DB_HOST` | your SQL host |
| `DB_PORT` | `1433` |

**Save** → **Restart** app.

---

## 5. Python 3.9 venv + install

Server has **Python 3.9** — use **`requirements-py39.txt`**, not `requirements.txt` (Django 5.2).

```bash
su - animserp
cd /home/animserp/business_analytics

python3.9 -m venv ~/virtualenv/business_analytics/3.9
source ~/virtualenv/business_analytics/3.9/bin/activate
python --version

pip install --upgrade pip
pip install -r requirements-py39.txt
python -c "import django; print(django.get_version())"
python -c "import pyodbc; print(pyodbc.drivers())"
```

**As root:**

```bash
/home/animserp/virtualenv/business_analytics/3.9/bin/pip install -r /home/animserp/business_analytics/requirements-py39.txt
```

---

## 6. Migrate + collectstatic

```bash
su - animserp
source ~/virtualenv/business_analytics/3.9/bin/activate
cd ~/business_analytics

export DJANGO_SECRET_KEY="same-as-cpanel"
export DJANGO_DEBUG="False"
export DJANGO_ALLOWED_HOSTS="api-businessanalytics.animserp.com,anims.animserp.com"
export DJANGO_CSRF_TRUSTED_ORIGINS="https://api-businessanalytics.animserp.com,https://anims.animserp.com"
export DJANGO_CORS_ALLOWED_ORIGINS="https://anims.animserp.com"
export DJANGO_SESSION_COOKIE_DOMAIN=".animserp.com"
export DB_NAME="SASSMMS"
export DB_USER="your_user"
export DB_PASSWORD="your_password"
export DB_HOST="your_host"
export DB_PORT="1433"

python manage.py migrate
python manage.py collectstatic --noinput
```

Restart Application Manager app.

---

## 7. Frontend → `public_html/anims`

### PC

`Frontend/.env.production`:

```env
VITE_API_BASE_URL=https://api-businessanalytics.animserp.com/api
```

```powershell
cd "D:\Business Analytics\Business Analytics\Frontend"
npm ci
npm run build
```

### Server

Upload **contents** of `Frontend/dist/` to:

`/home/animserp/public_html/anims/`

Upload `deploy/anims.htaccess` → `public_html/anims/.htaccess`

Use folder **`Images`** (capital I) for login images on Linux.

---

## 8. Cloudflare (website — all users)

Full steps: **[CLOUDFLARE.md](./CLOUDFLARE.md)** — nameservers, DNS, SSL, cache, test.

**Minimum DNS** (orange cloud / Proxied):

| Type | Name | Content |
|------|------|---------|
| A | `anims` | `66.116.197.240` |
| A | `api-businessanalytics` | `66.116.197.240` |

**SSL:** Cloudflare **Full** + **Always Use HTTPS** · cPanel **Force HTTPS** on both subdomains · **Bypass cache** for `api-businessanalytics` `/api`

### On‑prem SQL (per client factory)

The website uses the DNS above only. If a client’s **ERP SQL Server is on a private LAN**, client IT installs **Cloudflare Tunnel** so the VPS can reach `1433` without public port forwarding.

**Full guide (architecture + client steps):** **[ONPREM-TUNNEL.md](./ONPREM-TUNNEL.md)**

Summary:

- **Master DB** (`DB_*` in Application Manager) — often already hosted; no tunnel.  
- **Tenant ERP** (`tenants.erp_server`, …) — tunnel hostname per site, e.g. `erp-ves001.animserp.com`.  
- VPS may need `cloudflared access tcp` locally; test with `python manage.py erp_connect_check --company CODE`.

---

## 9. What runs where

| Item | Path / URL |
|------|------------|
| Existing app | `/home/animserp/django_app` |
| **This API** | `/home/animserp/business_analytics` → `https://api-businessanalytics.animserp.com/api/` |
| **This frontend** | `/home/animserp/public_html/anims` → `https://anims.animserp.com` |
| Other folders | `analytics_web`, `api-analytics`, `ba_app` — **not this app** |

---

## 10. Test

| URL | Expected |
|-----|----------|
| https://anims.animserp.com/ | Login page |
| https://api-businessanalytics.animserp.com/api/ | Not connection error |
| Login | POST `.../api-businessanalytics.animserp.com/api/login/` |
| https://thirumala.animserp.com/ | Old app OK |

---

## 11. Troubleshooting

### “Cannot reach server — is Django running?” on login

Frontend is OK; the browser cannot call the API. Check in order:

**A) Open API in browser**

- https://api-businessanalytics.animserp.com/api/  
- If connection error / timeout → fix backend (Application Manager, venv, Passenger) first.  
- If 404/JSON → API is up; fix frontend URL (B).

**B) Rebuild frontend with correct API host**

If you built **without** `Frontend/.env.production`, the app calls **`https://anims.animserp.com/api/`** (wrong).  
API is on **`api-businessanalytics.animserp.com`**.

```powershell
cd Frontend
# confirm .env.production contains:
# VITE_API_BASE_URL=https://api-businessanalytics.animserp.com/api
npm run build
```

Re-upload all of `dist/` to `public_html/anims/`, purge Cloudflare cache, **Ctrl+F5**.

**C) Browser DevTools (F12) → Network**

When you type User ID, you should see:

`https://api-businessanalytics.animserp.com/api/company/ves001/`

Not `https://anims.animserp.com/api/...`

**D) Application Manager**

- App **Enabled**  
- Domain: `api-businessanalytics.animserp.com`  
- Path: `business_analytics`  
- Env vars from Section 4  

**E) CORS** (if request appears but fails)

`DJANGO_CORS_ALLOWED_ORIGINS=https://anims.animserp.com`

---

| Problem | Fix |
|---------|-----|
| Wrong folder | API = `business_analytics`, frontend = `public_html/anims` |
| Login “Cannot reach server” | Rebuild with `VITE_API_BASE_URL`; test api-businessanalytics URL |
| Django 5.2 pip error | Use `requirements-py39.txt` + Python 3.9 venv |
| `/usr/bin/pip` failed | Use `~/virtualenv/business_analytics/3.9/bin/pip` |
| CORS / login | Section 4 env vars + rebuild frontend |
| root `cd ~/business_analytics` fails | Use `/home/animserp/business_analytics` or `su - animserp` |

---

## Final checklist

- [ ] `business_analytics/manage.py` at correct level  
- [ ] Application Manager: **api-businessanalytics** + path **business_analytics**  
- [ ] venv + `requirements-py39.txt` + migrate  
- [ ] `public_html/anims/index.html` + `.htaccess`  
- [ ] Cloudflare: `anims` + `api-businessanalytics`  
- [ ] `django_app` untouched  
- [ ] Login on **https://anims.animserp.com**
