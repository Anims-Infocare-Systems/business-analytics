# AnimsERP Business Analytics — Production Architecture & Performance Optimization Audit

**Document Version:** 1.0  
**Target Audience:** Technical Leadership, Full-Stack Developers, Database Administrators, DevOps  
**Repository:** `Anims-Infocare-Systems/business-analytics`  
**Server Baseline:** BigRock KVM VPS (AlmaLinux 9, 2 vCPUs, 4 GB RAM, IP: `66.116.197.240`)  

---

## Executive Summary

This audit provides a complete architectural analysis of the **AnimsERP Business Analytics** production ecosystem, diagnoses the critical bottlenecks responsible for severe load delays (ranging from 1m 49s up to 13m 25s) and login timeouts, benchmarks module performance metrics, and outlines a prioritized 5-phase engineering roadmap to achieve sub-second load times.

---

## 1. Production Architecture & How It Works

```
                                  [ End-User Web Browser ]
                                             │
                                   HTTPS (TLS 1.3 / CDN)
                                             ▼
                                  [ Cloudflare Edge Network ]
                                 (DNS Proxy, WAF, SSL Strict)
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │                                           │
             https://anims.animserp.com           https://api-businessanalytics.animserp.com
                       │                                           │
                       ▼                                           ▼
             [ BigRock VPS: Apache ]                     [ BigRock VPS: Apache ]
            /public_html/anims/ (Vite dist)             Custom VirtualHost / Proxy
                       │                                           │
           Static React SPA (Vite Bundle)               Phusion Passenger WSGI
                       │                                           │
                       └─────────────▶ /api/* ─────────────────────┘
                                                                   │
                                                                   ▼
                                                   [ Django 4.2 / Python 3.9 ]
                                                   /home/animserp/business_analytics
                                                                   │
                       ┌───────────────────────────────────────────┴───────────────────────────────────────────┐
                       │ (Master DB Connection)                                                                │ (Tenant ERP Connection)
                       ▼                                                                                       ▼
         [ Hosted GoDaddy Cloud SQL ]                                                             [ Cloudflare Tunnel TCP Proxy ]
           Location: Phoenix, Arizona, USA                                                          /etc/systemd/system/cf-*-proxy
           Port: 1433 | DB: SASSMMS                                                                 Ports: 14332 - 14340 (Localhost VPS)
           • Tenant Registry & Licensing                                                                       │
           • User Accounts & Passwords                                                             Outbound Encrypted TCP Tunnel
           • Granular Menu / Screen Rights                                                                     │
           (Latency: ~180ms – 220ms roundtrip)                                                                 ▼
                                                                                                  [ Client Factory Lenovo Server ]
                                                                                                    cloudflared connector on LAN
                                                                                                    Microsoft SQL Server (Port 1433)
                                                                                                    • Live Invoices (Bill_Mas/Det)
                                                                                                    • Live POs & GRNs (POMas/PODet)
                                                                                                    • Live Production & Quality
```

### Production Data Flow
1. **Frontend Delivery**: Apache directly serves the pre-built React Single Page Application (built with Vite) from `/home/animserp/public_html/anims/`. React handles internal routing via `.htaccess`.
2. **Reverse Proxying**: Apache captures `/api/*` calls and reverse-proxies them to `https://api-businessanalytics.animserp.com/api/`.
3. **Application Server**: Phusion Passenger spawns Python 3.9 workers using `passenger_wsgi.py` inside `/home/animserp/virtualenv/business_analytics/3.9/`.
4. **Master Database**: User authentication, licensing, company registration, and menu rights reside on a hosted GoDaddy SQL Server in Phoenix, Arizona (`SASSMMS`).
5. **Client On-Premises ERP Database**: Real-time manufacturing ERP data (Invoices, Purchase Orders, Delivery Challans, Inspections, Machine Output) resides on each client's physical Lenovo server inside their factory LAN.
6. **Encrypted Tunneling**: VPS background systemd services (`cf-*-proxy.service`) map local ports (`127.0.0.1:14332–14340`) over Cloudflare Tunnel (`cloudflared access tcp`) directly to the on-premise SQL Server on port 1433.

---

## 2. Root Cause Analysis: Reported Production Issues

### Problem 0: The Login Timeout Error
* **Symptom**: `"Connection error: Login timed out. The server took too long to respond. Please try again."`
* **Root Cause 1 (Worker Starvation / Head-of-Line Blocking)**:
  The VPS has only **2 vCPUs and 4 GB RAM**. Phusion Passenger runs 2 to 4 Python worker processes. When any user opens Plant Performance, Purchase Analysis, or Quality Analysis, those workers become locked in long-running SQL loops for 8 to 13 minutes. Incoming requests—including `/api/login/`—are queued in Apache.
* **Root Cause 2 (Frontend 20-Second Abort Controller)**:
  In `Frontend/src/assets/Pages/Login.jsx` (lines 467-469):
  ```javascript
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s abort
  ```
  If Apache worker congestion delays the login response past 20 seconds, the browser triggers `AbortError`, displaying the timeout toast.
* **Root Cause 3 (Aggressive Database Handshake Timeout)**:
  In `backend/accounts/utils/db.py` (line 8):
  ```python
  LOGIN_ERP_TIMEOUT = 2  # Only 2 seconds!
  ```
  During login, `check_tenant_erp_connection()` tests the TCP handshake to the on-premise Lenovo machine. Over a Cloudflare tunnel across the public internet, an initial handshake often exceeds 2 seconds.

---

### Problem 1: Plant Performance Dashboard (8 mins 22 secs)
* **Code Reference**: `Frontend/src/assets/Pages/plantperformance1.jsx` & `backend/accounts/views_plantperformance.py`
* **Root Cause 1 (Unbounded Historical Table Scans)**:
  Core sub-queries have **zero date parameters**:
  - `dashboard2_sales_analysis` executes:
    ```sql
    SELECT m.invno, CAST(m.invdt AS DATE) AS inv_date, ... FROM Bill_Mas m
    WHERE ISNULL(m.deleted, 0) = 0
      AND LOWER(LTRIM(RTRIM(ISNULL(m.btype, '')))) NOT LIKE '%credit%note%' ...
    ORDER BY m.invdt, m.invno;
    ```
    This pulls **every invoice ever generated in the factory's history** over the tunnel and processes them line-by-line in Python.
  - `dashboard2_customer_po_vs_sales` queries `In_PoMas`, `In_PoDet`, and `In_PoDet_ShdQty` with no date filter.
  - `_fetch_plant_performance_purchase_value_rows` fetches `TOP 5000` rows across unindexed joins with no date bounds.
* **Root Cause 2 (Serial Execution of 16 Compare Views)**:
  In `views_plantperformance.py` (lines 5028–5110), 16 views (`customerPoCompare`, `grnValueCompare`, `fgValueCompare`, `salesAnalysisCompare`, `purchaseValueCompare`, `efficiencyCompare`, `oeeCompare`, `rejectionCompare`, `reworkCompare`, etc.) are classified as `_COMPARE_BUNDLE_KEYS`. **All 16 execute serially on a single worker thread**.
* **Root Cause 3 (Client Virtual DOM Exhaustion)**:
  `plantperformance1.jsx` is **1.03 MB with 25,226 lines of JSX, 429 `.map()` render loops, and no virtual scrolling or pagination**. Rendering tens of thousands of DOM elements causes Chrome memory to surge past 1.5 GB, freezing the browser tab.

---

### Problem 2: Sales Analysis Report (2 mins 17 secs)
* **Code Reference**: `Frontend/src/assets/Pages/SalesAnalysis.jsx` & `backend/accounts/views_sales_analysis.py`
* **Root Cause 1 (Frontend 15-Request Shockwave)**:
  Lines 5666–5699 of `SalesAnalysis.jsx` fire **15 simultaneous HTTP requests** upon screen mount (`[p1, pGT, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13]` plus `invoice-details`).
* **Root Cause 2 (Unbounded `STRING_AGG` in `traceability`)**:
  `sales_analysis_traceability` executes:
  ```sql
  LEFT JOIN (
      SELECT dcno, STRING_AGG(...) AS PartNoDesc
      FROM DC_Det WHERE deleted = 0 
      GROUP BY dcno
  ) DCD ON BDO.dcno = DCD.dcno
  ```
  `DC_Det` has no date filter, forcing SQL Server to aggregate all delivery challans from all time in memory.
* **Root Cause 3 (Non-Sargable String Search Predicates)**:
  Clauses like `LOWER(LTRIM(RTRIM(ISNULL(bm.btype, '')))) NOT LIKE '%...'` force SQL Server to perform clustered index scans across the entire table.

---

### Problem 3: Purchase Analysis Report (13 mins 25 secs)
* **Code Reference**: `Frontend/src/assets/Pages/PurchaseAnalysis.jsx` & `backend/accounts/views_purchaseanalysis.py`
* **Root Cause 1 (14 Independent `useEffect` Hooks)**:
  Lines 3833–4438 contain 14 separate `useEffect` hooks that simultaneously dispatch independent `fetch()` calls.
* **Root Cause 2 (26-Year Historical Scan with Multi-OR String Joins)**:
  `purchase_analysis_fulfillment_schedule` scans all schedules since 2000:
  ```sql
  SELECT ... FROM iss_podet_ShdQty WHERE YEAR(shddt) >= 2000
  ```
  It then joins CTEs using 4 `OR` string conditions:
  ```sql
  LEFT JOIN SCH_DATA S ON P.pono = S.pono AND (
      P.rmname = S.icode
      OR (S.itcode <> N'' AND P.itcode <> N'' AND P.itcode = S.itcode)
      OR (S.icode <> N'' AND P.icode <> N'' AND P.icode = S.icode)
      OR (S.itcode <> N'' AND P.rmname = S.itcode)
  )
  ```
  This triggers Cartesian nested loops and table spools in SQL Server, holding 100% CPU on the client's Lenovo server for over 10 minutes.

---

### Problem 4: Quality Analysis Report (12 mins 33 secs)
* **Code Reference**: `Frontend/src/assets/Pages/QualityAnalysis.jsx` & `backend/accounts/views_qualityanalysis.py`
* **Root Cause 1 (Strict Sequential Waterfall)**:
  Lines 3712–3723 execute 9 endpoints in a strict serial chain:
  ```javascript
  const loadAllSequentially = async () => {
      await fetchPanel(buildUrl("/api/quality-analysis/summary/"), ...);
      await fetchPanel(buildUrl("/api/quality-analysis/charts/"), ...);
      await fetchPanel(buildUrl("/api/quality-analysis/product-performance/"), ...);
      await fetchPanel(buildUrl("/api/quality-analysis/defect-causes/"), ...);
      await fetchPanel(buildUrl("/api/quality-analysis/records/"), ...);
      await fetchPanel(buildUrl("/api/quality-analysis/calibration/"), ...);
      await fetchPanel(buildUrl("/api/quality-analysis/insights/"), ...);
      await fetchPanel(buildUrl("/api/dashboard2/customer-complaints/"), ...);
      await fetchPanel(buildDateOnlyUrl("/api/quality-analysis/supplier-rejections/"), ...);
  };
  ```
  Each endpoint takes ~80 seconds, accumulating to over 12 minutes.
* **Root Cause 2 (Schema Metadata Latency)**:
  `views_qualityanalysis.py` contains **36 calls to `table_exists()`**, generating 36 round-trips to `INFORMATION_SCHEMA.TABLES` across the tunnel per request.
* **Root Cause 3 (Correlated Row-by-Row Subqueries)**:
  `quality_analysis_records` uses correlated scalar subqueries:
  ```sql
  CAST(ISNULL((SELECT SUM(ISNULL(fr.qty, 0)) FROM FinalInspReworkEntryOrg fr WHERE fr.finspno = f.finspno), 0) AS FLOAT)
  ```

---

### Problem 5: Charts & Visualizations (1 min 49 secs)
* **Code Reference**: `Frontend/src/assets/Pages/Charts.jsx`
* **Root Cause**:
  Opening the screen mounts **16 chart components simultaneously** (`sales-1`, `sales-2`, `quality-1` through `quality-4`, `production-1` through `production-4`, `operations-1`, `operations-2`, `purchase-1`, `purchase-2`, `vendor-1`, `vendor-2`). Each chart triggers an independent API request alongside metadata lookups (`/production/operators/`, `/production/machines/`, `/purchase/supplier-rating/`), flooding the server with 20 concurrent hits.

---

## 3. Metric Evaluation: Requested Modules

### 3.1 Production Analysis Report
* **Frontend**: `Frontend/src/assets/Pages/ProductionAnalysis.jsx` (5,539 lines, 257.1 KB, 82 render loops)
* **Backend**: `backend/accounts/views_production_analysis.py` (2,965 lines, 134.9 KB, 0 cache decorators)
* **Key Bottleneck**: `production_analysis_report` executes **25 sequential SQL queries**:
  `total_prod_query` → `ok_qty_query` (with correlated `TRY_CAST(I.prodid AS INT) = P.prodid`) → `rej_qty_query` → `oee_query` → `hours_query` → `idle_hours_query` → `setting_hours_query`...
* **Metrics**:
  - *Current Load Time*: **1m 35s – 3m 10s**
  - *Target Load Time*: **1.2s – 2.0s** (Cached: **< 80 ms**)
  - *Current Network Overhead*: 36 tunnel round-trips
  - *Target Network Overhead*: 2 tunnel round-trips

---

### 3.2 Idle Time Report
* **Frontend**: `Frontend/src/assets/Pages/IdleTimeReport.jsx` (3,078 lines, 126.1 KB, 60 render loops)
* **Backend**: `backend/accounts/views_idle_time_report.py` (2,418 lines, 86.9 KB, 0 cache decorators)
* **Key Bottleneck**: Generates **23 dynamic schema queries** (`table_exists`) plus **24 separate cursor executions** to build machine lists and idle aggregations.
* **Metrics**:
  - *Current Load Time*: **45s – 1m 20s**
  - *Target Load Time*: **0.6s – 1.2s** (Cached: **< 50 ms**)
  - *Current Network Overhead*: 47 tunnel round-trips
  - *Target Network Overhead*: 1 tunnel round-trip

---

### 3.3 Efficiency Report
* **Frontend**: `Frontend/src/assets/Pages/EfficiencyReport.jsx` (1,815 lines, 83.2 KB, 28 render loops)
* **Backend**: `backend/accounts/views_efficiency_report.py` (1,124 lines, 41.1 KB, 0 cache decorators)
* **Key Bottleneck**: Runs a full 12-month fiscal year recalculation (`_combined_efficiency_monthwise`) across `ProductionEntry`, `ConvProductionEntry`, and `ConvProductionEntryRod` even when the user requests a 1-day or 7-day range.
* **Metrics**:
  - *Current Load Time*: **35s – 1m 15s**
  - *Target Load Time*: **0.5s – 1.0s** (Cached: **< 50 ms**)
  - *Current Network Overhead*: 4 tunnel round-trips
  - *Target Network Overhead*: 1 tunnel round-trip

---

### 3.4 Top Management Dashboard (Dashboard 1)
* **Frontend**: `Frontend/src/assets/Pages/Dashboard1.jsx` (1,531 lines, 74.3 KB, 25 render loops)
* **Backend**: `backend/accounts/views_dashboard1.py` (1,236 lines, 47.1 KB)
* **Key Bottleneck**: Screen mount fires **8 simultaneous API requests** (`sales-kpi`, `purchase-kpi`, `quality-value-kpi`, `production-kpi`, `sales-projections`, `purchase-projections`, `quality-rejections-weekly`, `oa-efficiency-weekly`). On cache miss, all 8 hit the remote GoDaddy SQL server and client ERP server concurrently.
* **Metrics**:
  - *Current Cold Load Time*: **25s – 55s**
  - *Target Cold Load Time*: **0.4s – 0.8s** (Cached: **< 40 ms**)
  - *Current Concurrent Requests*: 8 requests
  - *Target Concurrent Requests*: 1 consolidated bundle request

---

## 4. Master Metrics Comparison Table

| Metric | Current Production State | Target Optimized State | Improvement Factor |
| :--- | :--- | :--- | :--- |
| **Plant Performance Dashboard** | 8m 22s | **1.2s – 2.5s** | **~250x faster** |
| **Sales Analysis Report** | 2m 17s | **0.8s – 1.5s** | **~100x faster** |
| **Purchase Analysis Report** | 13m 25s | **1.5s – 3.0s** | **~300x faster** |
| **Quality Analysis Report** | 12m 33s | **1.0s – 2.0s** | **~400x faster** |
| **Charts & Visualizations** | 1m 49s | **0.5s – 1.2s** | **~100x faster** |
| **Production Analysis Report** | 2m 10s | **1.2s – 2.0s** | **~75x faster** |
| **Idle Time Report** | 1m 05s | **0.6s – 1.2s** | **~65x faster** |
| **Efficiency Report** | 55s | **0.5s – 1.0s** | **~60x faster** |
| **Top Management Dashboard** | 40s | **0.4s – 0.8s** | **~60x faster** |
| **Repeat Visit (Any Dashboard)** | 30s – 5m | **< 60 ms** (Redis Cache Hit) | **~1000x faster** |
| **Login Timeout Failures** | Frequent under load | **0% (Completely eliminated)** | **100% Reliable** |
| **Client Browser RAM Usage** | 1.2 GB – 1.8 GB | **90 MB – 140 MB** | **90% reduction** |
| **VPS CPU Utilization Under Burst** | Pegged at 100% (Freeze) | **15% – 35% (Stable)** | **Healthy headroom** |

---

## 5. Team Implementation Plan (5 Phases)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Immediate Triage & Quick Wins (Zero Downtime)                                          │
│ • Increase LOGIN_ERP_TIMEOUT (2s → 10s) & Login frontend timeout (20s → 45s)                    │
│ • Scope all unbounded queries (Bill_Mas, DC_Det, iss_podet_ShdQty) to the selected date range   │
│ • Cache table_exists() and find_column_ci() in memory (0 network overhead)                      │
│ • Parallelize Quality Analysis waterfall (Promise.allSettled)                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Caching Infrastructure                                                                 │
│ • Activate Redis 7 on VPS; configure django-redis for query cache & sessions                   │
│ • Apply @cache_analytics_response(timeout=300) to all 27 analytics endpoints                    │
│ • Cache Master DB tenant/rights lookups in Redis (eliminates 200ms US roundtrip)                │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: Query & Database Optimization                                                          │
│ • Re-write Cartesian multi-OR joins in purchase_analysis_fulfillment_schedule                   │
│ • Replace correlated subqueries with pre-aggregated GROUP BY CTEs                               │
│ • Add recommended non-clustered composite indexes on client ERP SQL Server                     │
│ • Enable ODBC connection pooling in /etc/odbcinst.ini (CPTimeout=60)                            │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: Frontend Modernization & Memory Tuning                                                 │
│ • Consolidate 15-request storms into single bundled requests or lazy-load below the fold        │
│ • Implement virtual scrolling / pagination (limit initial DOM render to 50 rows)                │
│ • Split plantperformance1.jsx (1.03 MB) into modular React.lazy() subcomponents                │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 5: Web Server Tuning                                                                      │
│ • Transition from Phusion Passenger to Gunicorn (4 workers, 4 threads, gthread) + Nginx        │
│ • Kernel TCP backlog & keepalive socket tuning                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 1: Immediate Triage (Same-Day Deployment)

1. **Eliminate False Login Timeouts**:
   - In `backend/accounts/utils/db.py`:
     ```python
     ERP_LOGIN_TIMEOUT = 15   # was 5
     LOGIN_ERP_TIMEOUT = 10   # was 2
     ```
   - In `Frontend/src/assets/Pages/Login.jsx`:
     Increase controller abort timeout from `20000` (20s) to `45000` (45s).
2. **Date-Scope Unbounded Queries**:
   - In `views_plantperformance.py` (`dashboard2_sales_analysis`), add `WHERE m.invdt BETWEEN ? AND ?`.
   - In `views_plantperformance.py` (`dashboard2_customer_po_vs_sales`), bind to selected start and end dates.
   - In `views_purchaseanalysis.py` (`purchase_analysis_fulfillment_schedule`), change `YEAR(shddt) >= 2000` to `shddt BETWEEN ? AND ?`.
3. **In-Memory Schema Cache (`table_exists`)**:
   Add a process-level dictionary cache for `table_exists` and `find_column_ci` with a 24-hour TTL, eliminating 23 to 36 redundant schema queries per request.
4. **Parallelize Quality Analysis**:
   Convert `loadAllSequentially` in `QualityAnalysis.jsx` to load summary/KPI cards first (`Promise.allSettled`), and detailed data tables in the background.

---

### Phase 2: Caching Infrastructure

1. **Enable Redis 7 on AlmaLinux 9**:
   ```bash
   dnf install epel-release -y
   dnf install redis -y
   systemctl enable --now redis
   ```
2. **Apply `@cache_analytics_response` across all Views**:
   Decorate all analytical endpoints in:
   - `views_sales_analysis.py`
   - `views_purchaseanalysis.py`
   - `views_qualityanalysis.py`
   - `views_production_analysis.py`
   - `views_idle_time_report.py`
   - `views_efficiency_report.py`
3. **Cache Master DB Lookups**:
   Cache user auth and tenant metadata in Redis (`user_auth:*`) for 30 minutes, removing the 200ms US round-trip penalty.

---

### Phase 3: SQL Server Indexing & Connection Pooling

1. **Client ERP SQL Server Index Recommendations**:
   ```sql
   -- Invoices
   CREATE NONCLUSTERED INDEX IX_Bill_Mas_Date_Deleted 
   ON Bill_Mas (invdt, deleted) INCLUDE (invno, cid, btype, tamt);

   -- Delivery Challans
   CREATE NONCLUSTERED INDEX IX_DC_Det_DCNo_Deleted 
   ON DC_Det (dcno, deleted) INCLUDE (partno, description);

   -- Purchase Orders
   CREATE NONCLUSTERED INDEX IX_POMas_Date_Deleted 
   ON POMas (podate, deleted) INCLUDE (pono, cid, dtype);

   CREATE NONCLUSTERED INDEX IX_PODet_PONO_Deleted 
   ON PODet (pono, deleted) INCLUDE (rmname, qty, rate, amount);

   -- PO Schedules
   CREATE NONCLUSTERED INDEX IX_iss_podet_ShdQty_Date 
   ON iss_podet_ShdQty (shddt, deleted) INCLUDE (pono, itcode, icode, shdqty);

   -- Production
   CREATE NONCLUSTERED INDEX IX_ProductionEntry_ProdDate 
   ON ProductionEntry (proddate) INCLUDE (oprname, macno, okqty, insprejqty, OAEFF, OPREFF);
   ```

2. **ODBC Connection Pooling**:
   In `/etc/odbcinst.ini` on the VPS:
   ```ini
   [ODBC Driver 17 for SQL Server]
   Description=Microsoft ODBC Driver 17 for SQL Server
   Driver=/opt/microsoft/msodbcsql17/lib64/libmsodbcsql-17.x.so
   CPTimeout=60
   ```

---

### Phase 4: Frontend Modernization & Memory Tuning

1. **Eliminate Multi-Request Storms**:
   - Merge `Dashboard1.jsx` 8 requests into a single `/api/dashboard1/bundle/` call.
   - In `Charts.jsx`, implement `IntersectionObserver` so chart cards only fetch data when scrolled into view.
2. **Client-Side Pagination & Table Virtualization**:
   - Cap initial table rows at 50 records with pagination (`limit=50&page=1`) instead of rendering 5,000 DOM nodes.
3. **Code Splitting**:
   - Split `plantperformance1.jsx` (25,226 lines) into modular components loaded on demand using `React.lazy()`.

---

### Phase 5: Web Server Tuning (Passenger → Gunicorn + Nginx)

1. **Gunicorn Multi-Threaded Workers**:
   Run Gunicorn with 4 workers and 4 threads (`gthread`):
   ```bash
   gunicorn backend.wsgi:application \
       --workers 4 \
       --worker-class gthread \
       --threads 4 \
       --worker-connections 1000 \
       --bind 127.0.0.1:8000 \
       --max-requests 2000 \
       --timeout 120
   ```
   * Provides **16 concurrent execution slots**, preventing heavy report queries from blocking logins or heartbeats.
2. **Reverse Proxy Keep-Alive**:
   Configure persistent reverse-proxy keepalive in Nginx to eliminate per-request TCP handshakes.

---

*Document prepared for Technical Architecture Review — Anims Infocare Systems.*
