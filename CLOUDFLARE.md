# Cloudflare setup — anims + api-businessanalytics

All **browser** traffic goes through Cloudflare (orange cloud), then to VPS **`66.116.197.240`**.

| What users open | Cloudflare → VPS |
|-----------------|------------------|
| https://anims.animserp.com | `public_html/anims/` (React) |
| https://api-businessanalytics.animserp.com/api/ | `business_analytics/` (Django) |

**SQL Server is never exposed in Cloudflare.** DB stays in Application Manager env on the server only.

Deploy VPS steps: **[DEPLOY.md](./DEPLOY.md)**

---

## Super-short Cloudflare checklist

1. Add site **animserp.com** to Cloudflare (if not already).  
2. Bigrock nameservers → Cloudflare’s two NS → wait **Active**.  
3. DNS: **A** `anims` and **A** `api-businessanalytics` → `66.116.197.240` → **Proxied**.  
4. SSL: **Full** + **Always Use HTTPS** ON.  
5. Cache: **bypass** `/api` on `api-businessanalytics`.  
6. cPanel: **Force HTTPS** for both subdomains.  
7. Test URLs + login; **purge cache** after frontend deploy.

---

## 1. Add domain to Cloudflare

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Add a site** → `animserp.com`  
2. Plan: **Free** (or your plan)  
3. Cloudflare scans DNS — review records

---

## 2. Nameservers at Bigrock

1. Cloudflare shows two nameservers (e.g. `xxx.ns.cloudflare.com`, `yyy.ns.cloudflare.com`)  
2. **Bigrock** → Domain **animserp.com** → **Nameservers** → Custom  
3. Paste Cloudflare’s two NS → Save  
4. Wait until Cloudflare shows **Active** (often 15 min–48 h)

Until Active, DNS changes below may not work everywhere.

---

## 3. DNS records (required for this app)

Cloudflare → **animserp.com** → **DNS** → **Records**

### Add or confirm

| Type | Name | IPv4 address | Proxy status |
|------|------|--------------|--------------|
| A | `anims` | `66.116.197.240` | **Proxied** (orange cloud) |
| A | `api-businessanalytics` | `66.116.197.240` | **Proxied** |

### Optional (main domain)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `66.116.197.240` | Proxied |
| CNAME | `www` | `animserp.com` | Proxied |

### Do not remove (other sites on same VPS)

Keep existing records if you still use them, e.g.:

- `analytics` → `analytics_web`  
- `api-analytics` → old API  
- `thirumala`  

**Rule:** For this Business Analytics app, clients only need **`anims`** and **`api-businessanalytics`** proxied to the VPS IP.

### Verify

```powershell
nslookup anims.animserp.com
nslookup api-businessanalytics.animserp.com
```

Proxied names often return **Cloudflare IPs** (104.x / 172.x), not `66.116.197.240` — that is **normal**.

---

## 4. SSL/TLS

Cloudflare → **SSL/TLS**

### Overview

| Setting | Value |
|---------|--------|
| **Encryption mode** | **Full** |

- Visitor ↔ Cloudflare: **HTTPS**  
- Cloudflare ↔ VPS (cPanel): usually **HTTP port 80**  
- Use **Full (strict)** only if the VPS has a valid origin certificate

### Edge certificates

| Setting | Value |
|---------|--------|
| **Always Use HTTPS** | **On** |
| **Automatic HTTPS Rewrites** | **On** |
| **Minimum TLS Version** | 1.2 |

### cPanel (origin)

cPanel → **Domains** → enable **Force HTTPS Redirect** for:

- `anims.animserp.com`  
- `api-businessanalytics.animserp.com`  

**SSL/TLS Status** → run **AutoSSL** if certificates are missing.

---

## 5. Cache rules (important)

API responses must **not** be cached like static files.

Cloudflare → **Caching** → **Cache Rules** → **Create rule**

### Rule 1 — Bypass API

| Field | Value |
|-------|--------|
| Rule name | Bypass Business Analytics API |
| When | Hostname equals `api-businessanalytics.animserp.com` **AND** URI Path starts with `/api` |
| Then | **Bypass cache** |

### Rule 2 — Frontend HTML (optional)

| When | Hostname equals `anims.animserp.com` |
| Then | **Bypass cache** (or Edge TTL 2 hours) |

So users get fresh `index.html` after you upload a new build.

### After each frontend deploy

**Caching** → **Configuration** → **Purge Everything**  
(or **Custom purge** → `anims.animserp.com`)

---

## 6. Security (recommended)

Cloudflare → **Security**

| Setting | Suggestion |
|---------|------------|
| Security Level | Medium |
| Bot Fight Mode | On (Free) |
| Browser Integrity Check | On |

---

## 7. What must match on the server (not in Cloudflare DNS UI)

Cloudflare only routes traffic. These must already be correct on the VPS:

### Application Manager

- Domain: `api-businessanalytics.animserp.com`  
- Path: `business_analytics`  
- Env vars (see `deploy/.env.example`):

```text
DJANGO_ALLOWED_HOSTS=api-businessanalytics.animserp.com,anims.animserp.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://api-businessanalytics.animserp.com,https://anims.animserp.com
DJANGO_CORS_ALLOWED_ORIGINS=https://anims.animserp.com
DJANGO_SESSION_COOKIE_DOMAIN=.animserp.com
```

### Frontend build (PC)

`Frontend/.env.production`:

```env
VITE_API_BASE_URL=https://api-businessanalytics.animserp.com/api
```

Then `npm run build` → upload to `public_html/anims/`.

---

## 8. Client flow (diagram)

```text
[User browser]
      │  HTTPS
      ▼
[Cloudflare]  DNS proxied, SSL, cache rules
      │
      ├── anims.animserp.com ──────────► VPS /public_html/anims/
      │
      └── api-businessanalytics.../api/ ► VPS Passenger /business_analytics/
                                              │
                                              ▼ SQL (server only, port 1433)
                                         [Remote SQL Server]
```

---

## 9. Test from browser

| # | URL | Expected |
|---|-----|----------|
| 1 | https://anims.animserp.com/ | Login page |
| 2 | https://api-businessanalytics.animserp.com/api/ | Not “connection refused” (404/JSON OK) |
| 3 | Login | DevTools → Network → POST `https://api-businessanalytics.animserp.com/api/login/` |
| 4 | Cookies | Domain `.animserp.com` after successful login |

Hard refresh: **Ctrl+F5**. If old page: purge Cloudflare cache.

---

## 10. Common mistakes

| Mistake | Fix |
|---------|-----|
| Grey cloud (DNS only) | Turn **Proxied** ON for `anims` and `api-businessanalytics` |
| SSL **Flexible** + origin issues | Use **Full** |
| API cached | Bypass cache for `/api` |
| CORS error in browser | `DJANGO_CORS_ALLOWED_ORIGINS=https://anims.animserp.com` on server |
| Login fails, no cookie | `DJANGO_SESSION_COOKIE_DOMAIN=.animserp.com` |
| Frontend calls wrong API | Rebuild with `VITE_API_BASE_URL=https://api-businessanalytics.animserp.com/api` |
| DB in Cloudflare | **Never** — DB only in Application Manager |

---

## 11. Cloudflare Tunnel (on‑prem SQL — optional)

**Not required** for the public website. Sections 3–5 (Proxied **A** records) cover `anims` and `api-businessanalytics`.

Use a tunnel when **tenant ERP SQL** (or master DB) is on a **private LAN** and the VPS cannot reach port **1433** directly.

**Complete architecture + client IT checklist:** **[ONPREM-TUNNEL.md](./ONPREM-TUNNEL.md)**

Short summary:

| What | Where |
|------|--------|
| Master DB | Application Manager `DB_HOST`, … |
| Each company ERP | SQL table **`tenants`**: `erp_server`, `erp_database`, `erp_user`, `erp_password`, `erp_port` |
| Client on‑prem | Install `cloudflared`; tunnel TCP → internal SQL |
| VPS (often) | `cloudflared access tcp --hostname erp-XXX.animserp.com --url 127.0.0.1:14330` then `erp_server=127.0.0.1` |

Test: `python manage.py erp_connect_check --company ves001`

---

## Final Cloudflare checklist

- [ ] Nameservers → Cloudflare Active  
- [ ] A `anims` → `66.116.197.240` Proxied  
- [ ] A `api-businessanalytics` → `66.116.197.240` Proxied  
- [ ] SSL Full + Always Use HTTPS  
- [ ] Cache bypass for `api-businessanalytics` `/api`  
- [ ] cPanel Force HTTPS on both subdomains  
- [ ] Server env + frontend API URL match  
- [ ] Login works end-to-end
