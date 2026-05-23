# On‑prem SQL + Cloudflare Tunnel (client IT guide)

This app is hosted on **Bigrock VPS** under **`animserp.com`**. End users only open the website. **Client IT** sets up a **Cloudflare Tunnel** so the VPS can reach **on‑premises Microsoft SQL Server** without opening port 1433 on the public internet.

**VPS deploy (your side):** [DEPLOY.md](./DEPLOY.md)  
**Cloudflare DNS / SSL for the website:** [CLOUDFLARE.md](./CLOUDFLARE.md)

---

## Your setup — one SQL server, one company

Use this path when you have **a single factory** and **one on‑prem SQL Server** (e.g. `animserpdev03`).

You need **one tunnel**, **one TCP hostname**, **one row** in `tenants`. No per‑company port juggling on the VPS.

```text
[Users] → anims.animserp.com → VPS Django
              │
              ├── Master DB (hosted SASSMMS)     ← DB_* env on VPS — usually NO tunnel
              │
              └── ERP SQL (on‑prem)              ← ONE tunnel: erp-sql.animserp.com
                        ▲
              cloudflared on LAN ── animserpdev03:1433
```

### Checklist (minimal)

| Step | Who | Action |
|------|-----|--------|
| 1 | Hosting | Cloudflare Zero Trust → tunnel **`erp-sql`** |
| 2 | Client IT | Install `cloudflared` on LAN machine; tunnel **Healthy** |
| 3 | Hosting | Public hostname: **`erp-sql.animserp.com`** → `tcp://animserpdev03:1433` |
| 4 | Hosting | VPS: `cloudflared access tcp --hostname erp-sql.animserp.com --url 127.0.0.1:1433` (systemd) |
| 5 | Hosting | **`tenants`** row: `erp_server=127.0.0.1`, `erp_port=1433`, plus DB name + SQL login |
| 6 | Hosting | `python manage.py erp_connect_check --company YOUR_CODE` → both OK |
| 7 | User | Login at `https://anims.animserp.com` |

**Master DB:** If `SASSMMS` is on the **same** on‑prem SQL box, you can point `DB_HOST=127.0.0.1` and `DB_PORT=1433` as well (same VPS proxy). If master stays on **hosted** GoDaddy SQL, only the **`tenants`** row uses the tunnel — that is the usual case.

**Hostname naming:** `erp-sql.animserp.com` is enough; you do not need `erp-ves001` unless you want the company code in the name.

---

## 1. How this project uses SQL (read first)

There are **two** SQL connections. Only one may need a tunnel.

| Connection | Purpose | Where configured | Typical location |
|------------|---------|------------------|------------------|
| **Master DB** | `tenants` table, company lookup (`/api/company/…`) | Application Manager env: `DB_NAME`, `DB_HOST`, … | Often **hosted SQL** (already reachable from VPS) |
| **Tenant ERP DB** | Login auth + all dashboards | Row in **`tenants`**: `erp_server`, `erp_database`, `erp_user`, `erp_password`, `erp_port` | Often **on‑prem** at the client factory |

**Login flow:**

```text
Browser → anims.animserp.com (React)
       → api-businessanalytics.animserp.com/api/company/{code}/   (master DB)
       → api-businessanalytics.animserp.com/api/login/           (VPS → tenant erp_server:1433)
       → session cookie → dashboard APIs                          (VPS → same tenant ERP)
```

Code references:

- Master DB: `backend/backend/settings.py` (`DB_*` env vars)
- Tenant ERP: `backend/accounts/models.py` (`Tenant` → table `tenants`)
- ODBC connect: `backend/accounts/utils/db.py` (`pyodbc`, ODBC Driver 17)
- Login uses tenant ERP: `backend/accounts/views.py` → `login_view`, `get_tenant_connection`

**You need a tunnel when:** the VPS cannot open TCP **1433** to the client’s SQL host (private IP, no public SQL, firewall).

**You do not need a tunnel for:** the public website (`anims` / `api-businessanalytics`) — that uses normal Cloudflare **A records** to the VPS ([CLOUDFLARE.md](./CLOUDFLARE.md) §3).

---

## 2. Roles — who does what

| Role | Responsibility |
|------|----------------|
| **Hosting (Anims / VPS admin)** | Deploy Django + React on Bigrock; master `DB_*` env; create tunnel in Cloudflare; update `tenants.erp_server`; run tests on VPS |
| **Client IT (on‑prem)** | Install `cloudflared` inside the LAN; allow SQL from the tunnel machine; keep connector running; provide SQL login + database name |
| **End user** | Opens `https://anims.animserp.com` only — no tunnel software on user PCs |

---

## 3. Architecture (with tunnel)

```text
[User browser]
      │ HTTPS
      ▼
[Cloudflare DNS] ── anims / api-businessanalytics ──► Bigrock VPS 66.116.197.240
                                                              │
                                                              │ pyodbc :1433
                                                              ▼
                                                    [Cloudflare TCP edge]
                                                              │
                         outbound tunnel (no inbound 1433)    │
                                                              ▼
[Client LAN]  cloudflared connector ──► SQL Server (e.g. animserpdev03:1433)
```

SQL is **never** added as a public DNS A record and **never** port‑forwarded on the office router.

---

## 4. Before the client starts

Hosting admin confirms:

1. VPS app is up: `https://api-businessanalytics.animserp.com/api/` responds (not connection refused).  
2. Company exists in master DB **`tenants`** with correct `company_code`, `erp_database`, `erp_user`, `erp_password`, `erp_port`.  
3. Cloudflare account access for **Zero Trust → Tunnels** (usually the same `animserp.com` zone).  
4. Pick a **tunnel hostname** per site, e.g. `erp-ves001.animserp.com` (one hostname per on‑prem SQL endpoint).

---

## 5. Client IT — step‑by‑step (Windows on‑prem)

### 5.1 Prerequisites

- Windows Server or PC **on the same network as SQL Server**  
- Can reach SQL, e.g. `animserpdev03` or `192.168.x.x` on port **1433**  
- Outbound HTTPS allowed to Cloudflare (443)  
- SQL Server: **TCP/IP enabled** in SQL Configuration Manager; service restarted  
- Windows Firewall on SQL box: allow **1433** from the **cloudflared machine’s IP** only  

Test from the cloudflared machine (PowerShell):

```powershell
Test-NetConnection animserpdev03 -Port 1433
```

### 5.2 Create tunnel (hosting admin in Cloudflare)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Zero Trust** (or **Networks → Tunnels**).  
2. **Create a tunnel** → name e.g. `erp-ves001` (include company code).  
3. Choose **Cloudflared** connector.  
4. Copy the **install + run** command (contains a token). Send it to client IT — **treat as secret**.

### 5.3 Install connector on‑prem (client IT)

On the LAN machine:

1. Run the Cloudflare install command (or download `cloudflared` from Cloudflare docs).  
2. Run the **service install** command Cloudflare shows so the connector starts on boot.  
3. In Cloudflare dashboard, tunnel status = **Healthy**.

Example (token varies):

```powershell
# Run as Administrator — use the exact command from Cloudflare UI
cloudflared.exe service install eyJhIjoi...
```

### 5.4 Publish SQL as TCP hostname (hosting admin)

In tunnel **erp-ves001** → **Public Hostname** → **Add a public hostname**:

| Field | Example |
|-------|---------|
| Subdomain | `erp-ves001` |
| Domain | `animserp.com` |
| Type | **TCP** |
| URL | `tcp://animserpdev03:1433` |

Use the **internal** hostname or IP the connector can reach (`animserpdev03`, `192.168.1.10`, etc.) — not the public VPS IP.

Save. Cloudflare creates **`erp-ves001.animserp.com`**.

### 5.5 SQL login (client IT → hosting admin)

Provide securely:

- `erp_database` (ERP database name)  
- `erp_user` / `erp_password` (SQL login with read access to ERP tables)  
- Confirm port (usually **1433**)

Hosting admin updates the **`tenants`** row (SQL or Django admin):

```text
erp_server   = erp-ves001.animserp.com
erp_port     = 1433
erp_database = <from client>
erp_user     = <from client>
erp_password = <from client>
```

Do **not** use old sample paths like `ba_app/.env` or `ERP_SERVER` — this app does not read those.

---

## 6. VPS side — TCP proxy (often required)

`pyodbc` on Linux **usually cannot** connect to `erp-ves001.animserp.com:1433` directly. Cloudflare TCP public hostnames expect a **local `cloudflared` client** on the machine that connects.

On **Bigrock VPS** (as root or animserp), install `cloudflared`, then run:

```bash
cloudflared access tcp --hostname erp-ves001.animserp.com --url 127.0.0.1:14330
```

Use a **unique local port** per tenant if several tunnels run at once (`14330`, `14331`, …).

Update **`tenants`** for that company:

```text
erp_server = 127.0.0.1
erp_port   = 14330
```

Run under **systemd** or **screen** so it survives reboot. Hosting admin documents which port maps to which company.

---

## 7. Verify end‑to‑end

On VPS:

```bash
su - animserp
source ~/virtualenv/business_analytics/3.9/bin/activate
cd ~/business_analytics
python manage.py erp_connect_check --company ves001
```

Both steps must **OK**:

1. TCP to `erp_server:erp_port`  
2. ODBC login (same as login page)

Then browser test: `https://anims.animserp.com` → User ID → login.

---

## 8. Multi‑site (only if you add more factories later)

| Scenario | Tunnels | `tenants` |
|----------|---------|-----------|
| **One SQL, one company (your case)** | **One** tunnel `erp-sql` | **One** row — same `erp_server` for that company |
| One SQL, many companies (same server) | One tunnel | Multiple rows, same `erp_server`, different `erp_database` |
| Several factories | One tunnel per site | Each `company_code` → its own hostname or local port on VPS |

---

## 9. Security checklist (client IT)

- [ ] No router port‑forward for 1433  
- [ ] SQL allows 1433 only from cloudflared host IP  
- [ ] Dedicated SQL login (least privilege), not `sa` if avoidable  
- [ ] Tunnel token not emailed in plain text  
- [ ] Connector runs as a service (survives reboot)  
- [ ] Only hosting admin can change `tenants` / Cloudflare tunnel routes  

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Login: “Cannot reach server — is Django running?” | API / frontend / DNS | [DEPLOY.md](./DEPLOY.md) §11 — not a tunnel issue |
| Login: “Database connection error” / ODBC 10061 | VPS cannot reach SQL | Tunnel down, wrong `erp_server`, or missing VPS `cloudflared access tcp` |
| `erp_connect_check` TCP fails | Firewall / wrong internal URL in tunnel | Fix `tcp://internal-host:1433`; open SQL firewall |
| ODBC fails, TCP OK | Wrong DB name or SQL login | Fix `tenants` credentials with client IT |
| Tunnel not Healthy | Connector stopped | Restart `cloudflared` service on‑prem |
| Works briefly then stops | VPS proxy not persistent | systemd for `cloudflared access tcp` |

---

## 11. Quick reference — hosting deploy URLs

| Item | Value |
|------|--------|
| Frontend | `https://anims.animserp.com` → `/home/animserp/public_html/anims/` |
| API | `https://api-businessanalytics.animserp.com/api/` → `/home/animserp/business_analytics/` |
| VPS IP | `66.116.197.240` |
| Frontend build | `VITE_API_BASE_URL=https://api-businessanalytics.animserp.com/api` |

Full VPS steps: **[DEPLOY.md](./DEPLOY.md)**
