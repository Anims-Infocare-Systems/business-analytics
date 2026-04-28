/**
 * Dashboard2.jsx  —  Plant Performance Dashboard v2
 * Prefix: d2-
 * CHANGE LOG (Apr 2026):
 *   - KpiStrip now receives a `liveKpis` prop with values fetched from the API
 *   - "First Pass Yield" card shows live okqty + first_pass_yield from
 *     FinalInspectionEntry (deleted=0, finspdate in selected range)
 *   - "Production Output" card shows live sum from ProductionEntry / ConvProductionEntry
 *   - Loading shimmer on KPI cards while fetch is in-flight
 *   - Error badge replaces value if fetch fails
 *   - [Apr 2026] Removed Machine OEE section from Overview tab
 *   - [Apr 2026] Replaced machine-wise Rejection & Rework with:
 *       Job Order Inspection · Intermediate Inspection · Final Inspection
 *   - [Apr 2026] Inspection sections: one aggregate card each (Rejection | Rework),
 *       no per–work-order / per-stage breakdown
 *   - [Apr 2026] Job Order Inspection: live totals from GET /api/dashboard2/injob-inspection/
 *       (InJob_Mas.inspdate + InJob_Det matrej/macrej/rwqty; same date range as date picker)
 *   - [Apr 2026] Intermediate Inspection: GET /api/dashboard2/inter-inspection/
 *       (InterInspectionEntry inter_inspdate + rejqty/matrejqty/rwqty, deleted=0)
 *   - [Apr 2026] Final Inspection card: GET /api/dashboard2/final-inspection-kpi/ (FPY, ok, totqty)
 *       + GET /api/dashboard2/final-inspection-org-rej-rwk/ (rejection/rework from org tables)
 *   - [Apr 2026] Production Data chart: GET /api/dashboard2/production-by-shift/ (PE okqty + conv qty,
 *       grouped by shift, same date range as picker; no target line on chart)
 *   - [Apr 2026] Quality Split donut: final-inspection-kpi total_ok_qty + kpis rejection_qty &
 *       rework_grand_total (same date range); slice sizes = quantities, legend shows % of (OK+rej+rwk).
 *   - [Apr 2026] Downtime by Reason: GET /api/dashboard2/downtime-by-reason/ — non-accepted idle hours
 *       by IdleReasons (same union as idle-hours), date range from picker.
 *   - [Apr 2026] Customer Complaints: GET /api/dashboard2/customer-complaints/ (CustCompMas · CustCompDet ·
 *       CustMast, CmpDate in range); table scroll + ellipsis on long text.
 *   - [Apr 2026] Purchase Order Status: GET /api/dashboard2/po-pipeline/ (POMas · PODet · grninsubdet ·
 *       grn_mas · CustMast) — summary strip + table; podate filtered by dashboard date range.
 *   - [Apr 2026] Inspection Pending Report: GET /api/dashboard2/inspection-pending-snapshot/ (no date
 *       filter) — RouteCardStock inter/final pending + InJob_DetTemp job balance when insp = 0.
 *   - [Apr 2026] GRN Pending Pipeline (Quick View): GET /api/dashboard2/grn-pending-pipeline/
 *       (grn_mas · grn_det) — grndate in dashboard range, insp = 0; table scrolls inside card;
 *       summary: total_record_count + total_qty (weight UOMs: TRY_CAST(pono AS FLOAT), else qty).
 *   - [Apr 2026] IQC Incoming Quality Rejections: GET /api/dashboard2/iqc-rejections/
 *       (grn_mas · inspmas · inspdet · CustMast) — grndate AND irdate in range; matrej or macrej > 0.
 *   - [Apr 2026] Removed "Material Consumption" card from Overview tab.
 *   - [Apr 2026] Removed "Live Exceptions" card from Overview tab.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Chart, registerables } from "chart.js";
import "./Dashboard2.css";
import Dashboard2DatePicker from "./Dashboard2DatePicker";

Chart.register(...registerables);

// ════════════════════════════════════════════
//  STATIC DATA
// ════════════════════════════════════════════

const STATUS_CFG = {
  running: { color: "#10b981", bg: "#d1fae5", label: "● RUNNING" },
  idle: { color: "#f59e0b", bg: "#fef3c7", label: "● IDLE" },
  breakdown: { color: "#ef4444", bg: "#fee2e2", label: "● BREAKDOWN" },
  maintenance: { color: "#8b5cf6", bg: "#ede9fe", label: "● MAINTENANCE" },
};

const OEE_CARDS = [
  { id: "CNC-01", type: "CNC Machining", status: "running", availability: 94, performance: 91, quality: 96, oee: 82, target: 80, uptime: "7.1 h" },
  { id: "CNC-02", type: "CNC Machining", status: "running", availability: 81, performance: 88, quality: 89, oee: 63, target: 80, uptime: "5.8 h" },
  { id: "INJ-01", type: "Injection Mold", status: "breakdown", availability: 0, performance: 0, quality: 0, oee: 0, target: 80, uptime: "0 h" },
  { id: "ASM-01", type: "Assembly Line", status: "running", availability: 97, performance: 93, quality: 98, oee: 88, target: 80, uptime: "7.0 h" },
  { id: "WLD-01", type: "Welding", status: "idle", availability: 72, performance: 79, quality: 95, oee: 54, target: 80, uptime: "4.1 h" },
  { id: "PNT-01", type: "Paint Booth", status: "maintenance", availability: 0, performance: 0, quality: 0, oee: 0, target: 80, uptime: "—" },
];

const CC_STATUS_CFG = {
  "Open": { c: "#ef4444", bg: "#fee2e2" },
  "In Progress": { c: "#f59e0b", bg: "#fef3c7" },
  "Closed": { c: "#10b981", bg: "#d1fae5" },
};

const INSP_PENDING = [
  { id: "IQC-4412", stage: "Incoming", part: "HR Steel Coil", wo: "GRN-4412", qty: 500, pending: 500, inspector: "Ravi K.", due: "Today", prio: "high" },
  { id: "FI-2041", stage: "Final", part: "Brake Disc", wo: "WO-2041", qty: 500, pending: 30, inspector: "Suresh M.", due: "Today", prio: "high" },
  { id: "IP-3021", stage: "In-Process", part: "Gear Housing", wo: "WO-2043", qty: 120, pending: 69, inspector: "Arjun S.", due: "14:00", prio: "crit" },
  { id: "IQC-4410", stage: "Incoming", part: "Rubber Seals", wo: "GRN-4410", qty: 200, pending: 200, inspector: "Priya T.", due: "Tomorrow", prio: "med" },
  { id: "FI-2042", stage: "Final", part: "Engine Mount", wo: "WO-2042", qty: 200, pending: 48, inspector: "Suresh M.", due: "16:00", prio: "med" },
  { id: "IP-3019", stage: "In-Process", part: "Control Arm", wo: "WO-2044", qty: 350, pending: 130, inspector: "Arjun S.", due: "Tomorrow", prio: "low" },
];

const INSP_CFG = {
  "Incoming": { c: "#0ea5e9", bg: "#e0f2fe", icon: "📦" },
  "In-Process": { c: "#f59e0b", bg: "#fef3c7", icon: "⚙️" },
  "Final": { c: "#10b981", bg: "#d1fae5", icon: "✅" },
};

const PRIO_CFG = {
  crit: { c: "#ef4444", bg: "#fee2e2", lbl: "CRITICAL" },
  high: { c: "#f97316", bg: "#ffedd5", lbl: "HIGH" },
  med: { c: "#f59e0b", bg: "#fef3c7", lbl: "MED" },
  low: { c: "#10b981", bg: "#d1fae5", lbl: "LOW" },
};

const DEFECTS = [
  { name: "Surface Scratch", count: 48, pct: 40, c: "#ef4444" },
  { name: "Dimensional Variance", count: 31, pct: 26, c: "#f97316" },
  { name: "Weld Porosity", count: 18, pct: 15, c: "#f59e0b" },
  { name: "Paint Adhesion", count: 12, pct: 10, c: "#eab308" },
  { name: "Assembly Mismatch", count: 9, pct: 8, c: "#94a3b8" },
];

const WORK_ORDERS = [
  { id: "WO-2041", name: "Brake Disc ×500", pct: 94, st: "On Track", sc: "up", bc: "#10b981" },
  { id: "WO-2042", name: "Engine Mount ×200", pct: 76, st: "On Track", sc: "up", bc: "#10b981" },
  { id: "WO-2043", name: "Gear Housing ×120", pct: 42, st: "DELAYED", sc: "dn", bc: "#ef4444" },
  { id: "WO-2044", name: "Control Arm ×350", pct: 63, st: "At Risk", sc: "warn", bc: "#f59e0b" },
  { id: "WO-2045", name: "Exhaust Flange ×800", pct: 18, st: "Started", sc: "neu", bc: "#1a56db" },
];

const ALERTS = [
  { type: "crit", icon: "🔴", title: "INJ-01 Machine Breakdown", desc: "Hydraulic failure · Open 54 min · Maint. team en route", time: "13:08" },
  { type: "crit", icon: "🔴", title: "Rejection Rate Exceeded — Line 3", desc: "4.1% rejection rate (limit: 2%) · WO-2043 · 48 units scrapped", time: "14:02" },
  { type: "crit", icon: "🔴", title: "WO-2043 SLA Breach Risk", desc: "Due in 2.5 hrs · Only 42% complete · Gear Housing ×120", time: "13:55" },
  { type: "warn", icon: "🟡", title: "PNT-01 PM Overdue", desc: "Scheduled PM was 09:00 · Now 5 hrs overdue", time: "09:00" },
  { type: "warn", icon: "🟡", title: "WLD-01 Performance Drop", desc: "OEE dropped to 54% (avg 84%) · Idle since 13:40", time: "13:40" },
  { type: "warn", icon: "🟡", title: "IQC Rejection — HR Steel Coil", desc: "GRN-4411 · Tata Steel · 250 kg rejected · IQC pending review", time: "11:20" },
];

const REJECTION_DATA = [
  { month: "Sep", macrej: 21000, matrej: 32000, rework: 18000 },
  { month: "Oct", macrej: 27000, matrej: 34000, rework: 22000 },
  { month: "Nov", macrej: 18000, matrej: 28000, rework: 15000 },
  { month: "Dec", macrej: 23000, matrej: 30000, rework: 20000 },
  { month: "Jan", macrej: 31000, matrej: 38000, rework: 24000 },
  { month: "Feb", macrej: 23262, matrej: 39292, rework: 22613 },
];

const TOOLTIP_CFG = {
  backgroundColor: "#ffffff", titleColor: "#0f172a", bodyColor: "#64748b",
  borderColor: "#e4e9f2", borderWidth: 1, padding: 10,
};

// ════════════════════════════════════════════
//  KPI STATIC FALLBACK DEFINITIONS
// ════════════════════════════════════════════

const KPI_STATIC = [
  {
    key: "production_output", accent: "cyan", icon: "⚙️", valColor: "#0ea5e9", unit: "units",
    name: "Production Output", foot1: "Date range (all shifts)",
    src: "ProductionEntry.okqty + ConvProductionEntry",
    val: "—", badge: "Loading…", badgeV: "neu", foot2: "", foot2Color: undefined,
  },
  {
    key: "final_inspection_okqty", accent: "green", icon: "✅", valColor: "#10b981", unit: "units",
    name: "Final Inspection OK Qty", foot1: "Target: 98% FPY",
    src: "FinalInspectionEntry.okqty (deleted=0)",
    val: "—", badge: "Loading…", badgeV: "neu", foot2: "", foot2Color: undefined,
  },
  {
    key: "rejection_rate", accent: "red", icon: "⚠️", valColor: "#ef4444", unit: "Qty",
    name: "Rejection Qty", foot1: "InJob + Inter + Final (date range)",
    src: "SUM rejection: InJob_Det (matrej+macrej) ∪ InterInspectionEntry (rejqty+matrejqty) ∪ Final org rejection",
    val: "28", badge: "▲ 0.4%", badgeV: "dn", foot2: "EXCEEDED", foot2Color: "#ef4444",
  },
  {
    key: "unplanned_downtime", accent: "amber", icon: "🔧", valColor: "#f59e0b", unit: "Qty",
    name: "Rework Qty", foot1: "InJob + Inter + Final (date range)",
    src: "SUM rework: InJob_Det.rwqty ∪ InterInspectionEntry.rwqty ∪ FinalInspReworkEntryOrg.qty",
    val: "24", badge: "4 events", badgeV: "warn", foot2: "OVER", foot2Color: "#ef4444",
  },
  {
    key: "oa_efficiency", accent: "blue", icon: "📈", valColor: "#1a56db", unit: "%",
    name: "OEE Efficiency", foot1: "Target: 80%",
    src: "Σ SUM(OAEFF) / Σ COUNT(*) — ProductionEntry (proddate) + ConvProductionEntryRod + ConvProductionEntry (entrydate)",
    val: "72.00", badge: "72.00%", badgeV: "neu", foot2: "Below target", foot2Color: "#f59e0b",
  },
  {
    key: "on_time_delivery", accent: "purple", icon: "🚚", valColor: "#8b5cf6", unit: "%",
    name: "Machine efficiency", foot1: "Target: 95%",
    src: "SalesMast vs DispatchMast",
    val: "87", badge: "13 delayed", badgeV: "warn", foot2: "Below target", foot2Color: "#f59e0b",
  },
];

// ════════════════════════════════════════════
//  REUSABLE ATOMS
// ════════════════════════════════════════════
function SectionLabel({ children }) {
  return <div className="d2-slabel">{children}</div>;
}
function Card({ className = "", children, style }) {
  return <div className={`d2-card ${className}`} style={style}>{children}</div>;
}
function Badge({ variant, children }) {
  return <span className={`d2-badge d2-badge--${variant}`}>{children}</span>;
}

// ════════════════════════════════════════════
//  OEE CARD
// ════════════════════════════════════════════
function OeeCard({ m }) {
  const scfg = STATUS_CFG[m.status];
  const oeeColor = m.oee >= 80 ? "#10b981" : m.oee >= 65 ? "#f59e0b" : m.oee > 0 ? "#ef4444" : "#94a3b8";
  const circ = 138.2;
  const offset = circ - (m.oee / 100) * circ;
  const aboveTarget = m.oee >= m.target;

  return (
    <div className="d2-oeec">
      <div className="d2-oeec__topbar" style={{ background: scfg.color }} />
      <div className="d2-oeec__head">
        <div>
          <div className="d2-oeec__id" style={{ color: scfg.color }}>{m.id}</div>
          <div className="d2-oeec__type">{m.type}</div>
        </div>
        <div className="d2-oeec__status" style={{ background: scfg.bg, color: scfg.color }}>
          {scfg.label}
        </div>
      </div>
      <div className="d2-oeec__ring-wrap">
        <svg viewBox="0 0 50 50" width="68" height="68" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="25" cy="25" r="22" fill="none" stroke="#e4e9f2" strokeWidth="4.5" />
          <circle cx="25" cy="25" r="22" fill="none"
            stroke={oeeColor} strokeWidth="4.5" strokeLinecap="round"
            strokeDasharray={`${circ}`} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="d2-oeec__ring-val">
          <span className="d2-oeec__oee-num" style={{ color: oeeColor }}>{m.oee}</span>
          <span className="d2-oeec__oee-unit">%</span>
        </div>
      </div>
      <div className="d2-oeec__apq">
        {[
          { label: "A", name: "Availability", val: m.availability, c: "#1a56db" },
          { label: "P", name: "Performance", val: m.performance, c: "#0ea5e9" },
          { label: "Q", name: "Quality", val: m.quality, c: "#10b981" },
        ].map(r => (
          <div key={r.label} className="d2-oeec__row">
            <div className="d2-oeec__row-label">
              <span className="d2-oeec__apq-letter" style={{ color: r.c }}>{r.label}</span>
              <span className="d2-oeec__apq-name">{r.name}</span>
            </div>
            <div className="d2-oeec__bar-wrap">
              <div className="d2-oeec__bar-track">
                <div className="d2-oeec__bar-fill" style={{ width: `${r.val}%`, background: r.c }} />
              </div>
              <span className="d2-oeec__bar-val" style={{ color: r.c }}>{r.val}%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="d2-oeec__foot">
        <span className="d2-oeec__uptime">⏱ {m.uptime}</span>
        <span className={`d2-oeec__target ${aboveTarget ? "d2-oeec__target--ok" : "d2-oeec__target--fail"}`}>
          {aboveTarget ? "▲" : "▼"} TGT {m.target}%
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  IDLE HOURS — totals only (accepted / non-accepted / total)
// ════════════════════════════════════════════
function IdleHoursSection({
  summary = null,
  accepted = [],
  nonAccepted = [],
  loading = false,
  error = null,
}) {
  const accTotal = summary != null
    ? Number(summary.accepted_hours) || 0
    : accepted.reduce((s, r) => s + (Number(r.hours) || 0), 0);
  const naTotal = summary != null
    ? Number(summary.non_accepted_hours) || 0
    : nonAccepted.reduce((s, r) => s + (Number(r.hours) || 0), 0);
  const grand = summary != null
    ? Number(summary.total_idle_hours) || 0
    : accTotal + naTotal;
  const otherH = summary != null ? Math.max(0, Number(summary.other_hours) || 0) : 0;

  const naPct = grand > 0 ? ((naTotal / grand) * 100).toFixed(0) : "0";
  const accPctStr = grand > 0 ? ((accTotal / grand) * 100).toFixed(0) : "0";
  const otherPctStr = grand > 0 ? ((otherH / grand) * 100).toFixed(0) : "0";
  const accPctW = grand > 0 ? (accTotal / grand) * 100 : 0;
  const naPctW = grand > 0 ? (naTotal / grand) * 100 : 0;
  const otherPctW = grand > 0 ? (otherH / grand) * 100 : 0;

  const fmt = (n) => Number(n).toFixed(2);

  return (
    <Card className={`d2-idle-totals ${loading ? "d2-idle-totals--loading" : ""}`}>
      <div className="d2-idle-totals__hd">
        <div className="d2-idle-totals__title">Idle time summary</div>
        <div className="d2-idle-totals__sub">
          Machine_IdleEntry · Prod_IdleEntry + ProductionEntry · conv_IdleEntry — hours from SUM(DATEDIFF minute ÷ 60).
          Accepted vs non-accepted from IdleReasons.IsAccept; other bucket in total only when reason is unmatched or IsAccept is null.
        </div>
      </div>

      {error && (
        <div className="d2-idle-totals__err" role="alert">{error}</div>
      )}

      <div className="d2-idle-totals__grid" aria-busy={loading}>
        <div className="d2-idle-totals__tile d2-idle-totals__tile--acc">
          <div className="d2-idle-totals__tile-dot" aria-hidden />
          <div className="d2-idle-totals__tile-lbl">Accepted idle</div>
          <div className="d2-idle-totals__tile-val">
            {loading ? <span className="d2-idle-totals__shim" /> : <><span>{fmt(accTotal)}</span><span className="d2-idle-totals__tile-unit">h</span></>}
          </div>
          <div className="d2-idle-totals__tile-hint">IsAccept = 1</div>
        </div>
        <div className="d2-idle-totals__tile d2-idle-totals__tile--na">
          <div className="d2-idle-totals__tile-dot d2-idle-totals__tile-dot--na" aria-hidden />
          <div className="d2-idle-totals__tile-lbl">Non-accepted idle</div>
          <div className="d2-idle-totals__tile-val">
            {loading ? <span className="d2-idle-totals__shim" /> : <><span>{fmt(naTotal)}</span><span className="d2-idle-totals__tile-unit">h</span></>}
          </div>
          <div className="d2-idle-totals__tile-hint">IsAccept = 0</div>
        </div>
        <div className="d2-idle-totals__tile d2-idle-totals__tile--all">
          <div className="d2-idle-totals__tile-dot d2-idle-totals__tile-dot--all" aria-hidden />
          <div className="d2-idle-totals__tile-lbl">Total idle</div>
          <div className="d2-idle-totals__tile-val d2-idle-totals__tile-val--all">
            {loading ? <span className="d2-idle-totals__shim" /> : <><span>{fmt(grand)}</span><span className="d2-idle-totals__tile-unit">h</span></>}
          </div>
          <div className="d2-idle-totals__tile-hint">All lines (SUM of minutes ÷ 60)</div>
        </div>
      </div>

      {!loading && !error && grand > 0 && (
        <div className="d2-idle-totals__split" aria-label="Composition of total idle time">
          <div className="d2-idle-totals__split-bar">
            <div className="d2-idle-totals__split-acc" style={{ width: `${accPctW}%` }} />
            <div className="d2-idle-totals__split-na" style={{ width: `${naPctW}%` }} />
            {otherPctW > 0 && (
              <div className="d2-idle-totals__split-other" style={{ width: `${otherPctW}%` }} title="Unmatched reason or NULL IsAccept" />
            )}
          </div>
          <div className="d2-idle-totals__split-note">
            <span className="d2-idle-totals__split-legend d2-idle-totals__split-legend--acc">Accepted {accPctStr}%</span>
            <span className="d2-idle-totals__split-legend d2-idle-totals__split-legend--na">Non-accepted {naPct}%</span>
            {otherH > 0 && (
              <span className="d2-idle-totals__split-legend d2-idle-totals__split-legend--oth">Other {otherPctStr}%</span>
            )}
          </div>
        </div>
      )}

      {!loading && !error && grand <= 0 && (
        <div className="d2-idle-totals__empty">No idle hours recorded for this date range.</div>
      )}
    </Card>
  );
}

/** Horizontal bar with optional target marker; fill scale 0…maxPct */
function InspBarTrack({ pct, targetPct, fill, maxPct = 10 }) {
  const fillW = Math.min((pct / maxPct) * 100, 100);
  const tgtLeft = Math.min((targetPct / maxPct) * 100, 100);
  return (
    <div className="d2-insc__bar-track">
      <div className="d2-insc__bar-fill" style={{ width: `${fillW}%`, background: fill }} />
      <div className="d2-insc__tgt-line" style={{ left: `${tgtLeft}%` }} />
    </div>
  );
}

// ════════════════════════════════════════════
//  JOB ORDER INSPECTION
// ════════════════════════════════════════════
function JobOrderInspSection({ injobInspection, injobLoading, injobError }) {
  const targetRej = 2;
  const totalRej = Number(injobInspection?.total_rejection ?? 0);
  const totalRwk = Number(injobInspection?.total_rework ?? 0);
  const totalQty = Number(injobInspection?.total_qty_basis ?? 0);
  const inspCount = Number(injobInspection?.inspection_master_count ?? 0);
  const qtyCol = injobInspection?.qty_basis_column;

  const rejPct =
    injobInspection?.rejection_pct != null && injobInspection.rejection_pct !== ""
      ? Number(injobInspection.rejection_pct)
      : totalQty > 0
        ? (totalRej / totalQty) * 100
        : null;
  const rwkPct =
    injobInspection?.rework_pct != null && injobInspection.rework_pct !== ""
      ? Number(injobInspection.rework_pct)
      : totalQty > 0
        ? (totalRwk / totalQty) * 100
        : null;

  const aboveRejTarget = rejPct != null && rejPct > targetRej;
  const pctLabel = (v) => (v == null || Number.isNaN(v) ? "—" : `${v.toFixed(1)}%`);

  return (
    <Card className="d2-insp-dual-card d2-insp-dual-card--jo">
      <div className="d2-card__hd">
        <div className="d2-insp-dual-card__hd-main">
          <div className="d2-insp-dual-card__ico" aria-hidden>📋</div>
          <div>
            <div className="d2-card__title">Job Order Inspection</div>
            <div className="d2-card__sub">
              InJob_Mas.inspdate · InJob_Det (matrej + macrej · rwqty)
              {inspCount > 0 ? ` · ${inspCount} inspection${inspCount === 1 ? "" : "s"}` : ""}
            </div>
          </div>
        </div>
        <span className={`d2-insc__chip ${injobLoading ? "d2-insc__chip--ok" : rejPct == null ? "d2-insc__chip--ok" : aboveRejTarget ? "d2-insc__chip--bad" : "d2-insc__chip--ok"}`}>
          {injobLoading ? "Loading…" : rejPct == null ? "No % basis" : aboveRejTarget ? "Above target" : "On target"}
        </span>
      </div>
      <div className="d2-insc__body">
        {injobError && <div className="d2-card__sub" style={{ color: "#b91c1c", marginBottom: 10 }}>{injobError}</div>}
        <div className={`d2-insc__split ${injobLoading ? "d2-insp-dual-card--loading" : ""}`}>
          <div className="d2-insc__col">
            <div className="d2-insc__metric-lbl">Rejection</div>
            <div className="d2-insc__metric-pcs" style={{ color: "#ef4444" }}>
              {injobLoading ? "…" : Math.round(totalRej).toLocaleString()} <span>pcs</span>
            </div>
            <div className="d2-insc__bar-row">
              <InspBarTrack pct={rejPct != null ? rejPct : 0} targetPct={targetRej} fill="#ef4444" />
              <span className="d2-insc__bar-pct" style={{ color: "#ef4444" }}>{pctLabel(rejPct)}</span>
            </div>
          </div>
          <div className="d2-insc__vdiv" />
          <div className="d2-insc__col">
            <div className="d2-insc__metric-lbl">Rework</div>
            <div className="d2-insc__metric-pcs" style={{ color: "#ea580c" }}>
              {injobLoading ? "…" : Math.round(totalRwk).toLocaleString()} <span>pcs</span>
            </div>
            <div className="d2-insc__bar-row">
              <InspBarTrack pct={rwkPct != null ? rwkPct : 0} targetPct={1.5} fill="#f97316" />
              <span className="d2-insc__bar-pct" style={{ color: "#ea580c" }}>{pctLabel(rwkPct)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="d2-insc__footer">
        <span className="d2-insc__footer-stat">
          {totalQty > 0 ? `Detail Σ${qtyCol ? ` (${qtyCol})` : ""}: ${Math.round(totalQty).toLocaleString()} · Target: ${targetRej}%` : `No detail qty column for % · Target: ${targetRej}%`}
        </span>
        <span className={`d2-insc__chip d2-insc__chip--footer ${rejPct == null ? "d2-insc__chip--ok" : aboveRejTarget ? "d2-insc__chip--bad" : "d2-insc__chip--ok"}`}>
          {injobLoading ? "…" : rejPct == null ? "—" : aboveRejTarget ? "✗ Above target" : "✓ On target"}
        </span>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════
//  INTERMEDIATE INSPECTION
// ════════════════════════════════════════════
function IntermediateInspSection({ interInspection, interLoading, interError }) {
  const targetRej = 2;
  const totalRej = Number(interInspection?.total_rejection ?? 0);
  const totalRwk = Number(interInspection?.total_rework ?? 0);
  const totalQty = Number(interInspection?.total_qty_basis ?? 0);
  const rowCount = Number(interInspection?.row_count ?? 0);
  const qtyCol = interInspection?.qty_basis_column;

  const rejPct =
    interInspection?.rejection_pct != null && interInspection.rejection_pct !== ""
      ? Number(interInspection.rejection_pct)
      : totalQty > 0 ? (totalRej / totalQty) * 100 : null;
  const rwkPct =
    interInspection?.rework_pct != null && interInspection.rework_pct !== ""
      ? Number(interInspection.rework_pct)
      : totalQty > 0 ? (totalRwk / totalQty) * 100 : null;

  const aboveRejTarget = rejPct != null && rejPct > targetRej;
  const pctLabel = (v) => (v == null || Number.isNaN(v) ? "—" : `${v.toFixed(1)}%`);
  const elevatedRej = rejPct != null && rejPct > 10;

  return (
    <Card className="d2-insp-dual-card d2-insp-dual-card--inter">
      <div className="d2-card__hd">
        <div className="d2-insp-dual-card__hd-main">
          <div className="d2-insp-dual-card__ico" aria-hidden>⚙️</div>
          <div>
            <div className="d2-card__title">Intermediate Inspection</div>
            <div className="d2-card__sub">
              InterInspectionEntry · rejqty + matrejqty · rwqty
              {rowCount > 0 ? ` · ${rowCount.toLocaleString()} row${rowCount === 1 ? "" : "s"}` : ""}
            </div>
          </div>
        </div>
        <span className={`d2-insc__chip ${interLoading ? "d2-insc__chip--ok" : elevatedRej ? "d2-insc__chip--warn" : rejPct == null ? "d2-insc__chip--ok" : aboveRejTarget ? "d2-insc__chip--bad" : "d2-insc__chip--ok"}`}>
          {interLoading ? "Loading…" : elevatedRej ? "Rej >10%" : rejPct == null ? "No % basis" : aboveRejTarget ? "Above target" : "On target"}
        </span>
      </div>
      <div className="d2-insc__body">
        {interError && <div className="d2-card__sub" style={{ color: "#b91c1c", marginBottom: 10 }}>{interError}</div>}
        <div className={`d2-insc__split ${interLoading ? "d2-insp-dual-card--loading" : ""}`}>
          <div className="d2-insc__col">
            <div className="d2-insc__metric-lbl">Rejection</div>
            <div className="d2-insc__metric-pcs" style={{ color: "#ef4444" }}>
              {interLoading ? "…" : Math.round(totalRej).toLocaleString()} <span>pcs</span>
            </div>
            <div className="d2-insc__bar-row">
              <InspBarTrack pct={rejPct != null ? rejPct : 0} targetPct={targetRej} fill="#ef4444" />
              <span className="d2-insc__bar-pct" style={{ color: "#ef4444" }}>{pctLabel(rejPct)}</span>
            </div>
          </div>
          <div className="d2-insc__vdiv" />
          <div className="d2-insc__col">
            <div className="d2-insc__metric-lbl">Rework</div>
            <div className="d2-insc__metric-pcs" style={{ color: "#ea580c" }}>
              {interLoading ? "…" : Math.round(totalRwk).toLocaleString()} <span>pcs</span>
            </div>
            <div className="d2-insc__bar-row">
              <InspBarTrack pct={rwkPct != null ? rwkPct : 0} targetPct={2} fill="#f97316" />
              <span className="d2-insc__bar-pct" style={{ color: "#ea580c" }}>{pctLabel(rwkPct)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="d2-insc__footer">
        <span className="d2-insc__footer-stat">
          {totalQty > 0 ? `Σ${qtyCol ? ` (${qtyCol})` : ""}: ${Math.round(totalQty).toLocaleString()} · Target: ${targetRej}%` : `No qty column for % · Target: ${targetRej}%`}
        </span>
        <span className={`d2-insc__chip d2-insc__chip--footer ${rejPct == null ? "d2-insc__chip--ok" : aboveRejTarget ? "d2-insc__chip--bad" : "d2-insc__chip--ok"}`}>
          {interLoading ? "…" : rejPct == null ? "—" : aboveRejTarget ? "✗ Above target" : "✓ On target"}
        </span>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════
//  FINAL INSPECTION
// ════════════════════════════════════════════
function FinalInspRejSection({ liveKpis, kpiLoading, finalOrgInspection, finalOrgLoading, finalOrgError }) {
  const targetFpy = 98;
  const fi = liveKpis?.finalInspection;
  const totalOk = Number(fi?.total_ok_qty ?? 0);
  const totalInsp = Number(fi?.total_qty ?? 0);
  const fpyFromApi = fi?.first_pass_yield != null && fi.first_pass_yield !== ""
    ? Number(fi.first_pass_yield)
    : totalInsp > 0 ? (totalOk / totalInsp) * 100 : null;
  const inspCount = Number(fi?.inspection_count ?? 0);

  const totalRej = Number(finalOrgInspection?.total_rejection ?? 0);
  const totalRwk = Number(finalOrgInspection?.total_rework ?? 0);
  const rejPct = totalInsp > 0 ? (totalRej / totalInsp) * 100 : null;
  const rwkPct = totalInsp > 0 ? (totalRwk / totalInsp) * 100 : null;

  const fpyOk = fpyFromApi != null && !Number.isNaN(fpyFromApi) && fpyFromApi >= targetFpy;
  const pctLabel = (v) => (v == null || Number.isNaN(v) ? "—" : `${v.toFixed(1)}%`);
  const busy = finalOrgLoading || (kpiLoading && !fi);

  return (
    <Card className="d2-insp-dual-card d2-insp-dual-card--final">
      <div className="d2-card__hd">
        <div className="d2-insp-dual-card__hd-main">
          <div className="d2-insp-dual-card__ico" aria-hidden>✅</div>
          <div>
            <div className="d2-card__title">Final Inspection</div>
            <div className="d2-card__sub">
              FinalInspectionEntry · FinalInspRejectionEntryOrg · FinalInspReworkEntryOrg
              {inspCount > 0 ? ` · ${inspCount.toLocaleString()} inspection${inspCount === 1 ? "" : "s"}` : ""}
            </div>
          </div>
        </div>
        <span className={`d2-insc__chip ${busy ? "d2-insc__chip--ok" : fpyOk ? "d2-insc__chip--fpy-ok" : "d2-insc__chip--fpy-warn"}`}>
          {busy ? "Loading…" : fpyFromApi == null ? "FPY —" : `FPY ${fpyFromApi.toFixed(1)}%`}
        </span>
      </div>
      <div className="d2-insc__body">
        {finalOrgError && <div className="d2-card__sub" style={{ color: "#b91c1c", marginBottom: 10 }}>{finalOrgError}</div>}
        <div className={`d2-insc__split ${busy ? "d2-insp-dual-card--loading" : ""}`}>
          <div className="d2-insc__col">
            <div className="d2-insc__metric-lbl">Rejection</div>
            <div className="d2-insc__metric-pcs" style={{ color: "#ef4444" }}>
              {finalOrgLoading ? "…" : Math.round(totalRej).toLocaleString()} <span>pcs</span>
            </div>
            <div className="d2-insc__bar-row">
              <InspBarTrack pct={rejPct != null ? rejPct : 0} targetPct={2} fill="#ef4444" />
              <span className="d2-insc__bar-pct" style={{ color: "#ef4444" }}>{pctLabel(rejPct)}</span>
            </div>
          </div>
          <div className="d2-insc__vdiv" />
          <div className="d2-insc__col">
            <div className="d2-insc__metric-lbl">Rework</div>
            <div className="d2-insc__metric-pcs" style={{ color: "#16a34a" }}>
              {finalOrgLoading ? "…" : Math.round(totalRwk).toLocaleString()} <span>pcs</span>
            </div>
            <div className="d2-insc__bar-row">
              <InspBarTrack pct={rwkPct != null ? rwkPct : 0} targetPct={2} fill="#22c55e" />
              <span className="d2-insc__bar-pct" style={{ color: "#16a34a" }}>{pctLabel(rwkPct)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="d2-insc__footer">
        <span className="d2-insc__footer-stat">
          {kpiLoading && !fi ? "OK Qty / Total: …" : `OK Qty: ${Math.round(totalOk).toLocaleString()} · Total: ${Math.round(totalInsp).toLocaleString()} inspected · Target FPY: ${targetFpy}%`}
        </span>
        <span className={`d2-insc__chip d2-insc__chip--footer ${busy ? "d2-insc__chip--ok" : fpyOk ? "d2-insc__chip--fpy-ok" : "d2-insc__chip--fpy-foot-warn"}`}>
          {busy ? "…" : fpyFromApi == null ? "—" : fpyOk ? "✓ FPY on target" : "⚠ FPY below target"}
        </span>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════
//  CUSTOMER COMPLAINTS (CustCompMas · CustCompDet · CustMast)
// ════════════════════════════════════════════
function complaintStatusStyle(status) {
  const s = String(status || "").trim().toLowerCase();
  if (s.includes("close")) return CC_STATUS_CFG["Closed"];
  if (s.includes("open")) return CC_STATUS_CFG["Open"];
  if (s.includes("progress") || s.includes("pending") || s.includes("wip")) return CC_STATUS_CFG["In Progress"];
  return { c: "#64748b", bg: "#f1f5f9" };
}

function CustomerComplaints({ complaintsPayload, complaintsLoading, complaintsError }) {
  const rows = complaintsPayload?.complaints ?? [];
  const total = rows.length;
  const closed = rows.filter((r) => String(r.status || "").toLowerCase().includes("close")).length;
  const openLike = rows.filter((r) => {
    const st = String(r.status || "").toLowerCase();
    return st.includes("open") && !st.includes("close");
  }).length;
  const rangeLine =
    complaintsPayload?.from && complaintsPayload?.to
      ? `${complaintsPayload.from} → ${complaintsPayload.to}`
      : "Uses dashboard date range";

  return (
    <Card className={complaintsLoading ? "d2-cc-card d2-cc-card--loading" : "d2-cc-card"}>
      <div className="d2-card__hd">
        <div>
          <div className="d2-card__title">📣 Customer Complaints</div>
          <div className="d2-card__sub">CustCompMas · CustCompDet · CustMast — {rangeLine}</div>
        </div>
        <button type="button" className="d2-card__btn">View All →</button>
      </div>
      {complaintsError ? (
        <div className="d2-cc-err" role="alert">{complaintsError}</div>
      ) : null}
      <div className="d2-cc-strip">
        <div className="d2-cc-stat d2-cc-stat--age">
          <div className="d2-cc-stat-val">{complaintsLoading ? "…" : total}</div>
          <div className="d2-cc-stat-lbl">In range</div>
        </div>
        <div className="d2-cc-stat d2-cc-stat--open">
          <div className="d2-cc-stat-val">{complaintsLoading ? "…" : openLike}</div>
          <div className="d2-cc-stat-lbl">Open-like</div>
        </div>
        <div className="d2-cc-stat d2-cc-stat--closed">
          <div className="d2-cc-stat-val">{complaintsLoading ? "…" : closed}</div>
          <div className="d2-cc-stat-lbl">Closed-like</div>
        </div>
        <div className="d2-cc-sep" />
      </div>
      <div className="d2-cc-tbl-wrap">
        <table className="d2-mini-tbl d2-cc-tbl">
          <thead>
            <tr>
              <th>Complaint ID</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Complaint description</th>
              <th>Action taken</th>
              <th>Date</th>
              <th>Corrective action</th>
              <th>Permanent action</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {complaintsLoading ? (
              <tr>
                <td colSpan={9} style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                  Loading complaints…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                  No complaints in this date range.
                </td>
              </tr>
            ) : (
              rows.map((c, i) => {
                const stcfg = complaintStatusStyle(c.status);
                return (
                  <tr key={`${c.complaint_id}-${i}`}>
                    <td className="d2-mono d2-acc-blue">{c.complaint_id || "—"}</td>
                    <td style={{ fontWeight: 600 }}>{c.customer_name}</td>
                    <td className="d2-cc-cell-narrow" title={c.product}>{c.product}</td>
                    <td className="d2-cc-cell-text" title={c.complaint_description}>{c.complaint_description}</td>
                    <td className="d2-cc-cell-text" title={c.action_taken}>{c.action_taken}</td>
                    <td className="d2-mono">{c.complaint_date || "—"}</td>
                    <td className="d2-cc-cell-text" title={c.corrective_action}>{c.corrective_action}</td>
                    <td className="d2-cc-cell-text" title={c.permanent_action}>{c.permanent_action}</td>
                    <td>
                      <span className="d2-badge" style={{ background: stcfg.bg, color: stcfg.c }}>{c.status}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════
//  IQC — INCOMING QUALITY REJECTIONS (grn_mas · inspmas · inspdet · CustMast)
// ════════════════════════════════════════════
function IqcIncomingRejections({ iqcRejections, iqcRejectionsLoading, iqcRejectionsError, compact = false }) {
  const rows = Array.isArray(iqcRejections?.rows) ? iqcRejections.rows : [];
  const s = iqcRejections?.summary;
  const totalRec = typeof s?.total_record_count === "number" ? s.total_record_count : 0;
  const totalRej = typeof s?.total_rejection_qty === "number" ? s.total_rejection_qty : 0;
  const rangeLine =
    iqcRejections?.from && iqcRejections?.to
      ? `${iqcRejections.from} → ${iqcRejections.to}`
      : "Dashboard date range";

  const wrapCls = `d2-iqc-tbl-wrap${compact ? " d2-iqc-tbl-wrap--compact" : ""}`;

  return (
    <Card className={compact ? "d2-iqc-card--compact" : ""}>
      <div className="d2-card__hd">
        <div>
          <div className="d2-card__title">IQC — Incoming Quality Rejections</div>
          <div className="d2-card__sub">
            grn_mas · inspmas · inspdet · CustMast — {rangeLine}
          </div>
        </div>
      </div>

      <div className="d2-grn-sum-strip">
        <div className="d2-grn-sum-card d2-grn-sum-card--red">
          <div className="d2-grn-sum-card__icon">🔴</div>
          <div className="d2-grn-sum-card__body">
            <div className="d2-grn-sum-card__val">
              {iqcRejectionsLoading ? <span className="d2-shimmer-inline" /> : totalRec.toLocaleString("en-IN")}
            </div>
            <div className="d2-grn-sum-card__lbl">Total records</div>
          </div>
        </div>
        <div className="d2-grn-sum-card d2-grn-sum-card--orange">
          <div className="d2-grn-sum-card__icon">📊</div>
          <div className="d2-grn-sum-card__body">
            <div className="d2-grn-sum-card__val">
              {iqcRejectionsLoading ? (
                <span className="d2-shimmer-inline" />
              ) : (
                totalRej.toLocaleString("en-IN", { maximumFractionDigits: 2 })
              )}
            </div>
            <div className="d2-grn-sum-card__lbl">Total rejection qty</div>
          </div>
        </div>
      </div>

      {iqcRejectionsError ? (
        <div style={{ padding: "10px 16px", color: "#b91c1c", fontSize: 12 }} role="alert">{iqcRejectionsError}</div>
      ) : null}

      <div className={wrapCls}>
        <table className="d2-mini-tbl">
          <thead>
            <tr>
              <th>GRN Insp No</th>
              <th>GRN Insp Date</th>
              <th>Type</th>
              <th>Vendor / Supplier</th>
              <th>Material</th>
              <th>Qty Rejected</th>
            </tr>
          </thead>
          <tbody>
            {iqcRejectionsLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                  No IQC rejection lines in this range.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.grn_insp_no}-${i}`}>
                  <td className="d2-mono d2-acc-blue">{r.grn_insp_no || "—"}</td>
                  <td className="d2-mono">{formatYmdShort(r.grn_insp_date)}</td>
                  <td>
                    <span className="d2-badge" style={{ background: "#f1f5f9", color: "#475569" }}>{r.type || "—"}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{r.vendor_name || "—"}</td>
                  <td style={{ maxWidth: compact ? 120 : 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.material || ""}>
                    {r.material || "—"}
                  </td>
                  <td className="d2-mono d2-acc-red">
                    {(Number(r.total_rejection_qty) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════
//  TOP DEFECT CATEGORIES (live: /api/dashboard2/top-defect-categories/)
// ════════════════════════════════════════════
const DEFECT_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#94a3b8"];

function TopDefectCategories({ topDefects, topDefectsLoading, topDefectsError }) {
  const rows = Array.isArray(topDefects?.rows) ? topDefects.rows : [];
  const rangeLine =
    topDefects?.from && topDefects?.to
      ? `${topDefects.from} → ${topDefects.to}`
      : "Dashboard date range";

  return (
    <Card>
      <div className="d2-card__hd">
        <div>
          <div className="d2-card__title">Top Defect Categories</div>
          <div className="d2-card__sub">FinalInspRejectionEntryOrg · InterInspectionEntry — by Part No · {rangeLine}</div>
        </div>
        <button type="button" className="d2-card__btn">View All →</button>
      </div>
      {topDefectsError && (
        <div style={{ padding: "6px 16px", color: "#b91c1c", fontSize: 12 }} role="alert">{topDefectsError}</div>
      )}
      <table className="d2-mini-tbl">
        <thead><tr><th>#</th><th>Part No</th><th>Rejection Qty</th><th>%</th></tr></thead>
        <tbody>
          {topDefectsLoading ? (
            <tr><td colSpan={4} style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>No rejection data in this range.</td></tr>
          ) : (
            rows.map((d, i) => {
              const c = DEFECT_COLORS[i % DEFECT_COLORS.length];
              return (
                <tr key={`${d.partno}-${i}`}>
                  <td><span className="d2-rank">{i + 1}</span></td>
                  <td>
                    {d.partno}
                    <div className="d2-d-bar" style={{ width: `${Math.min(d.rejection_pct, 100)}%`, background: c }} />
                  </td>
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", color: c, fontWeight: 600 }}>
                    {Math.round(d.total_rejection_qty).toLocaleString()}
                  </td>
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", color: "#64748b" }}>
                    {d.rejection_pct}%
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </Card>
  );
}

// ════════════════════════════════════════════
//  WORK ORDER PROGRESS — live from poPipeline
//  Columns: PO No · PO Date · Customer · Material · Qty · Value · Status
// ════════════════════════════════════════════
function WorkOrderProgressLive({ poPipeline, poPipelineLoading, poPipelineError }) {
  const rows = Array.isArray(poPipeline?.rows) ? poPipeline.rows : [];
  const rangeLine =
    poPipeline?.from && poPipeline?.to
      ? `${poPipeline.from} → ${poPipeline.to}`
      : "Dashboard date range";

  const getStatus = (r) => {
    const grn = (r.grn_no || "").trim();
    if (grn && grn !== "—") return { label: "GRN Done", v: "up", c: "#10b981", bg: "#d1fae5" };
    return { label: "GRN Pending", v: "warn", c: "#f59e0b", bg: "#fef3c7" };
  };

  return (
    <Card>
      <div className="d2-card__hd">
        <div>
          <div className="d2-card__title">Work Order Progress</div>
          <div className="d2-card__sub">POMas · PODet · grn_mas — {rangeLine}</div>
        </div>
        <button type="button" className="d2-card__btn">All WOs →</button>
      </div>
      {poPipelineError && (
        <div style={{ padding: "6px 16px", color: "#b91c1c", fontSize: 12 }} role="alert">{poPipelineError}</div>
      )}
      <div className="d2-po-tbl-wrap">
        <table className="d2-mini-tbl">
          <thead>
            <tr>
              <th>PO No</th>
              <th>PO Date</th>
              <th>Customer / Vendor</th>
              <th>Material</th>
              <th>Qty</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {poPipelineLoading ? (
              <tr><td colSpan={7} style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>No purchase orders in this date range.</td></tr>
            ) : (
              rows.slice(0, 10).map((r, i) => {
                const st = getStatus(r);
                return (
                  <tr key={`${r.po_number}-${i}`}>
                    <td className="d2-mono d2-acc-blue">{r.po_number || "—"}</td>
                    <td className="d2-mono">{formatYmdShort(r.po_date)}</td>
                    <td style={{ fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.vendor_name || ""}>{(r.vendor_name || "").trim() || "—"}</td>
                    <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.material || ""}>{r.material || "—"}</td>
                    <td className="d2-mono">{r.po_qty || "—"}</td>
                    <td className="d2-mono" style={{ color: "#1a56db", fontWeight: 600 }}>{formatInrAmount(r.value)}</td>
                    <td>
                      <span className="d2-badge" style={{ background: st.bg, color: st.c, fontWeight: 600 }}>{st.label}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════
//  GRN PENDING PIPELINE — Quick View (grn_mas · grn_det, date-scoped)
// ════════════════════════════════════════════
function GrnPendingPipelineQuickView({ grnPendingPipeline, grnPendingPipelineLoading, grnPendingPipelineError }) {
  const rows = Array.isArray(grnPendingPipeline?.rows) ? grnPendingPipeline.rows : [];
  const rangeLine =
    grnPendingPipeline?.from && grnPendingPipeline?.to
      ? `${grnPendingPipeline.from} → ${grnPendingPipeline.to}`
      : "Dashboard date range";

  // ── summary from API (full COUNT/SUM over all matching detail rows, not TOP 500) ──
  const s = grnPendingPipeline?.summary;
  const totalCount = typeof s?.total_record_count === "number" ? s.total_record_count : 0;
  const totalQty = typeof s?.total_qty === "number" ? s.total_qty : 0;
  const totalQtyFmt = totalQty.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  return (
    <Card>
      <div className="d2-card__hd">
        <div>
          <div className="d2-card__title">GRN Pending Pipeline (Quick View)</div>
          <div className="d2-card__sub">
            grn_mas · grn_det — pending inspection (insp = 0), deleted = 0 — {rangeLine}
          </div>
        </div>
      </div>

      {/* ── 2 summary mini-cards ── */}
      <div className="d2-grn-sum-strip">
        <div className="d2-grn-sum-card d2-grn-sum-card--blue">
          <div className="d2-grn-sum-card__icon">📋</div>
          <div className="d2-grn-sum-card__body">
            <div className="d2-grn-sum-card__val">
              {grnPendingPipelineLoading ? <span className="d2-shimmer-inline" /> : totalCount.toLocaleString("en-IN")}
            </div>
            <div className="d2-grn-sum-card__lbl">Total records</div>
          </div>
        </div>
        <div className="d2-grn-sum-card d2-grn-sum-card--amber">
          <div className="d2-grn-sum-card__icon">📦</div>
          <div className="d2-grn-sum-card__body">
            <div className="d2-grn-sum-card__val">
              {grnPendingPipelineLoading ? <span className="d2-shimmer-inline" /> : totalQtyFmt}
            </div>
            <div className="d2-grn-sum-card__lbl">Total Qty</div>
          </div>
        </div>
      </div>

      {grnPendingPipelineError ? (
        <div style={{ padding: "10px 16px", color: "#b91c1c", fontSize: 12 }} role="alert">{grnPendingPipelineError}</div>
      ) : null}
      <div className={`d2-grn-pend-tbl-wrap${grnPendingPipelineLoading ? " d2-grn-pend-tbl-wrap--loading" : ""}`}>
        <table className="d2-mini-tbl">
          <thead>
            <tr>
              <th>GRN No</th>
              <th>GRN Date</th>
              <th>Type</th>
              <th>Material</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {grnPendingPipelineLoading ? (
              <tr>
                <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                  No pending GRN lines in this range.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.grn_no}-${i}`}>
                  <td className="d2-mono d2-acc-blue">{r.grn_no || "—"}</td>
                  <td className="d2-mono">{formatYmdShort(r.grn_date)}</td>
                  <td>
                    <span className="d2-badge" style={{ background: "#f1f5f9", color: "#475569" }}>{r.type || "—"}</span>
                  </td>
                  <td
                    style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={r.material || ""}
                  >
                    {r.material || "—"}
                  </td>
                  <td className="d2-mono">{r.qty || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}


// ════════════════════════════════════════════
//  INSPECTION PENDING — 3 RICH CARDS (snapshot, no date filter)
// ════════════════════════════════════════════
function InspectionPending({ inspectionPending, inspectionPendingLoading, inspectionPendingError }) {
  const jobPending = inspectionPending?.joborder_pending_qty;
  const interPending = inspectionPending?.intermediate_pending_qty;
  const finalPending = inspectionPending?.final_pending_qty;

  const CARDS = [
    {
      key: "job",
      icon: "⚙️",
      title: "Job Order Inspection Pending",
      // sub: "InJob_DetTemp · SUM(JobBalQty) WHERE insp = 0 AND deleted = 0",
      pendingQty: typeof jobPending === "number" ? jobPending : null,
      orders: null,
      loading: inspectionPendingLoading,
      error: inspectionPendingError,
      accent: "#f59e0b",
      bg: "linear-gradient(135deg,#fffbeb 0%,#fef9ec 60%,#fff 100%)",
      dimBg: "#fef3c7",
      border: "rgba(245,158,11,.28)",
      icon2: "🔶",
    },
    {
      key: "inter",
      icon: "🔁",
      title: "Intermediate Inspection Pending",
      // sub: "RouteCardStock · SUM(interinspqty) WHERE interinspqty > 0",
      pendingQty: typeof interPending === "number" ? interPending : null,
      orders: null,
      loading: inspectionPendingLoading,
      error: inspectionPendingError,
      accent: "#1a56db",
      bg: "linear-gradient(135deg,#eff6ff 0%,#f0f7ff 60%,#fff 100%)",
      dimBg: "#dbeafe",
      border: "rgba(26,86,219,.22)",
      icon2: "🔷",
    },
    {
      key: "final",
      icon: "✅",
      title: "Final Inspection Pending",
      // sub: "RouteCardStock · SUM(finalinspqty) WHERE finalinspqty > 0",
      pendingQty: typeof finalPending === "number" ? finalPending : null,
      orders: null,
      loading: inspectionPendingLoading,
      error: inspectionPendingError,
      accent: "#10b981",
      bg: "linear-gradient(135deg,#ecfdf5 0%,#f0fdf8 60%,#fff 100%)",
      dimBg: "#d1fae5",
      border: "rgba(16,185,129,.22)",
      icon2: "✳️",
    },
  ];

  return (
    <div className="d2-ipend-row">
      {CARDS.map(c => (
        <div key={c.key} className="d2-ipend-card" style={{ background: c.bg, borderColor: c.border }}>
          {/* header stripe */}
          <div className="d2-ipend-card__stripe" style={{ background: c.accent }} />

          <div className="d2-ipend-card__body">
            <div className="d2-ipend-card__icon-wrap" style={{ background: c.dimBg }}>
              <span className="d2-ipend-card__icon">{c.icon}</span>
            </div>
            <div className="d2-ipend-card__content">
              <div className="d2-ipend-card__title">{c.title}</div>
              <div className="d2-ipend-card__live-note">
                <span className="d2-ipend-card__live-dot" />
                Live snapshot · Not filtered by selected date range
              </div>
              <div className="d2-ipend-card__sub">{c.sub}</div>

              {c.loading ? (
                <div className="d2-ipend-card__val" style={{ color: c.accent, opacity: 0.4 }}>…</div>
              ) : c.error ? (
                <div className="d2-ipend-card__val" style={{ color: "#ef4444" }}>—</div>
              ) : (
                <div className="d2-ipend-card__val" style={{ color: c.accent }}>
                  {typeof c.pendingQty === "number" ? c.pendingQty.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}
                </div>
              )}

              <div className="d2-ipend-card__meta">
                <span className="d2-ipend-card__lbl">Pending Qty</span>
                {c.orders !== null && !c.loading && !c.error && (
                  <span className="d2-ipend-card__pill" style={{ background: c.dimBg, color: c.accent }}>
                    {c.orders} order{c.orders === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {/* decorative pulse dot */}
              {!c.loading && !c.error && typeof c.pendingQty === "number" && c.pendingQty > 0 && (
                <div className="d2-ipend-card__pulse" style={{ background: c.accent }} />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════
//  PURCHASE ORDER STATUS (live: /api/dashboard2/po-pipeline/)
// ════════════════════════════════════════════
function PurchaseOrderStatus({ poPipeline, poPipelineLoading, poPipelineError }) {
  const [modalOpen, setModalOpen] = useState(false);
  const s = poPipeline?.summary;
  const rows = Array.isArray(poPipeline?.rows) ? poPipeline.rows : [];
  const rangeLine =
    poPipeline?.from && poPipeline?.to ? `${poPipeline.from} → ${poPipeline.to}` : "Select a date range";

  const totalPos = s?.total_pos ?? 0;
  const totalValFmt = formatInrAmount(s?.total_po_value ?? 0);
  const totalGrnFmt = formatInrAmount(s?.total_grn_value ?? 0);

  const STAT_TILES = [
    { label: "Total POs", val: totalPos, c: "#1a56db", bg: "#dbeafe", icon: "📦", isMoney: false },
    { label: "Approved", val: s?.approved ?? 0, c: "#0ea5e9", bg: "#e0f2fe", icon: "✅", isMoney: false },
    { label: "Approval Pending", val: s?.pending_approval ?? 0, c: "#f59e0b", bg: "#fef3c7", icon: "⏳", isMoney: false },
    { label: "GRN Done", val: s?.grn_done ?? 0, c: "#10b981", bg: "#d1fae5", icon: "🏭", isMoney: false },
    { label: "GRN Pending", val: s?.grn_pending ?? 0, c: "#ef4444", bg: "#fee2e2", icon: "🔄", isMoney: false },
    { label: "Total PO Value", val: totalValFmt, c: "#1a56db", bg: "#dbeafe", icon: "💰", isMoney: true },
    { label: "Total GRN Value", val: totalGrnFmt, c: "#10b981", bg: "#d1fae5", icon: "📋", isMoney: true },
  ];

  const showVal = (t) => {
    if (poPipelineLoading) return "…";
    if (poPipelineError) return "—";
    if (t.isMoney) return t.val;
    return typeof t.val === "number" ? t.val.toLocaleString() : t.val;
  };

  /* ── shared table content (used in both card + modal) ── */
  const PO_THEAD = (
    <thead>
      <tr>
        <th>PO Number</th>
        <th>PO Type</th>
        <th>Vendor / Supplier</th>
        <th>Material</th>
        <th>Qty</th>
        <th>Value</th>
        <th>PO Date</th>
        <th>GRN No</th>
        <th>GRN Date</th>
      </tr>
    </thead>
  );

  const PO_TBODY = (
    <tbody>
      {poPipelineLoading ? (
        <tr><td colSpan={9} style={{ padding: "20px", color: "#64748b", textAlign: "center" }}>Loading purchase orders…</td></tr>
      ) : poPipelineError ? (
        <tr><td colSpan={9} style={{ padding: "20px", color: "#64748b", textAlign: "center" }}>No table data (request failed).</td></tr>
      ) : rows.length === 0 ? (
        <tr><td colSpan={9} style={{ padding: "20px", color: "#64748b", textAlign: "center" }}>No PO lines in this range.</td></tr>
      ) : (
        rows.map((r, idx) => {
          const grnNo = (r.grn_no || "").trim() || "—";
          const grnDt = (r.grn_date || "").trim() ? formatYmdShort(r.grn_date) : "—";
          return (
            <tr key={`${r.po_number}-${idx}`}>
              <td className="d2-mono d2-acc-blue">{r.po_number || "—"}</td>
              <td><span className="d2-badge" style={{ background: "#f1f5f9", color: "#475569" }}>{r.po_type || "—"}</span></td>
              <td style={{ fontWeight: 600 }}>{(r.vendor_name || "").trim() || "—"}</td>
              <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.material || ""}>{r.material || "—"}</td>
              <td className="d2-mono">{r.po_qty || "—"}</td>
              <td className="d2-mono" style={{ color: "#1a56db", fontWeight: 600 }}>{formatInrAmount(r.value)}</td>
              <td className="d2-mono">{formatYmdShort(r.po_date)}</td>
              <td className="d2-mono d2-acc-blue">{grnNo}</td>
              <td className="d2-mono">{grnDt}</td>
            </tr>
          );
        })
      )}
    </tbody>
  );

  return (
    <>
      <Card className={poPipelineLoading ? "d2-po-card d2-po-card--loading" : "d2-po-card"}>
        <div className="d2-card__hd">
          <div>
            <div className="d2-card__title">🛒 Purchase Order Status</div>
            <div className="d2-card__sub">
              POMas · PODet · grninsubdet · grn_mas · CustMast — {rangeLine}
              {!poPipelineLoading && !poPipelineError ? ` · ${rows.length} line${rows.length === 1 ? "" : "s"}` : ""}
              {!poPipelineLoading && !poPipelineError ? ` · PO value ${totalValFmt}` : ""}
            </div>
          </div>
          <button type="button" className="d2-po-expand-btn" onClick={() => setModalOpen(true)}>
            ⛶ Expand
          </button>
        </div>
        {poPipelineError ? (
          <div style={{ padding: "12px 16px", color: "#b91c1c", fontSize: 13 }} role="alert">{poPipelineError}</div>
        ) : null}
        <div className="d2-po-stat-strip" style={{ opacity: poPipelineLoading ? 0.55 : 1, transition: "opacity 0.2s" }}>
          {STAT_TILES.map((t) => (
            <div key={t.label} className="d2-po-stat-tile" style={{ background: t.bg, borderColor: `${t.c}33` }}>
              <div className="d2-po-stat-tile__icon">{t.icon}</div>
              <div className="d2-po-stat-tile__val" style={{ color: t.c }}>{showVal(t)}</div>
              <div className="d2-po-stat-tile__lbl">{t.label}</div>
            </div>
          ))}
        </div>
        <div className="d2-po-tbl-wrap">
          <table className="d2-mini-tbl">{PO_THEAD}{PO_TBODY}</table>
        </div>
      </Card>

      {/* ── PO Expand Modal ── */}
      {modalOpen && (
        <div className="d2-po-modal-backdrop" onClick={() => setModalOpen(false)} role="dialog" aria-modal="true" aria-label="Purchase Order Status — Full View">
          <div className="d2-po-modal" onClick={(e) => e.stopPropagation()}>
            <div className="d2-po-modal__hd">
              <div>
                <div className="d2-po-modal__title">🛒 Purchase Order Status</div>
                <div className="d2-po-modal__sub">
                  POMas · PODet · grninsubdet · grn_mas · CustMast — {rangeLine}
                  {!poPipelineLoading && !poPipelineError ? ` · ${rows.length} record${rows.length === 1 ? "" : "s"} · ${totalValFmt}` : ""}
                </div>
              </div>
              <button type="button" className="d2-po-modal__close" onClick={() => setModalOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="d2-po-modal__stat-strip">
              {STAT_TILES.map((t) => (
                <div key={t.label} className="d2-po-stat-tile d2-po-stat-tile--sm" style={{ background: t.bg, borderColor: `${t.c}33` }}>
                  <div className="d2-po-stat-tile__icon">{t.icon}</div>
                  <div className="d2-po-stat-tile__val" style={{ color: t.c }}>{showVal(t)}</div>
                  <div className="d2-po-stat-tile__lbl">{t.label}</div>
                </div>
              ))}
            </div>
            <div className="d2-po-modal__body">
              <table className="d2-mini-tbl">{PO_THEAD}{PO_TBODY}</table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════
//  CHART CANVAS WRAPPER
// ════════════════════════════════════════════
function ChartCanvas({ setup, height = 160, rebuildToken = 0 }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const setupRef = useRef(setup);
  setupRef.current = setup;
  useEffect(() => {
    if (!ref.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    chartRef.current = setupRef.current(ref.current);
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [rebuildToken]);
  return <canvas ref={ref} height={height} />;
}

// ════════════════════════════════════════════
//  KPI STRIP
// ════════════════════════════════════════════
function KpiStrip({ liveKpis, kpiLoading, kpiError }) {
  const cards = KPI_STATIC.map(k => {
    if (!liveKpis) return k;

    if (k.key === "final_inspection_okqty" && liveKpis.finalInspection) {
      const d = liveKpis.finalInspection;
      const fpy = d.first_pass_yield ?? 0;
      const fpyOk = fpy >= 98;
      return { ...k, val: d.total_ok_qty?.toLocaleString() ?? "—", badge: `FPY ${fpy}%`, badgeV: fpyOk ? "up" : "dn", foot2: fpyOk ? `FPY ${fpy}% ✓` : `FPY ${fpy}% ↓`, foot2Color: fpyOk ? "#10b981" : "#ef4444" };
    }
    if (k.key === "production_output" && liveKpis.production) {
      const val = liveKpis.production.kpis?.production_output ?? 0;
      const dr = liveKpis.production.from && liveKpis.production.to ? `${liveKpis.production.from} → ${liveKpis.production.to}` : "";
      return { ...k, foot1: dr || k.foot1, val: val.toLocaleString(), badge: "Range total", badgeV: "neu", foot2: "PE okqty + conveyor qty (same range)", foot2Color: "#64748b" };
    }
    if (k.key === "rejection_rate" && liveKpis.production) {
      const val = liveKpis.production.kpis?.rejection_qty ?? 0;
      return { ...k, val: val.toLocaleString(), badge: val > 0 ? "Active rejections" : "No rejection", badgeV: val > 0 ? "dn" : "up", foot2: val > 0 ? "Needs action" : "Within control", foot2Color: val > 0 ? "#ef4444" : "#10b981" };
    }
    if (k.key === "unplanned_downtime" && liveKpis.production) {
      const val = liveKpis.production.kpis?.rework_grand_total ?? 0;
      return { ...k, val: val.toLocaleString(), badge: val > 0 ? "Rework logged" : "No rework", badgeV: val > 0 ? "warn" : "up", foot2: val > 0 ? "Across inspection types" : "Within control", foot2Color: val > 0 ? "#f59e0b" : "#10b981" };
    }
    if (k.key === "oa_efficiency" && liveKpis.production) {
      const val = liveKpis.production.kpis?.oa_efficiency ?? 0;
      const tgt = 80;
      return { ...k, val: val.toFixed(2), badge: `${val.toFixed(2)}%`, badgeV: val >= tgt ? "up" : val >= tgt * 0.9 ? "warn" : "dn", foot2: val >= tgt ? "At or above target" : "Below target", foot2Color: val >= tgt ? "#10b981" : "#f59e0b" };
    }
    return k;
  });

  return (
    <div className="d2-kpi-strip">
      {cards.map((k) => (
        <div key={k.key} className={`d2-kpi d2-kpi--${k.accent} ${kpiLoading ? "d2-kpi--loading" : ""}`}>
          <div className="d2-kpi__top">
            <span className="d2-kpi__ico">{k.icon}</span>
            {kpiLoading && ["final_inspection_okqty", "production_output", "rejection_rate", "unplanned_downtime", "oa_efficiency"].includes(k.key) ? (
              <span className="d2-kpi__badge d2-kpi__badge--neu d2-kpi__badge--shimmer">…</span>
            ) : (
              <span className={`d2-kpi__badge d2-kpi__badge--${k.badgeV}`}>{k.badge}</span>
            )}
          </div>
          {kpiLoading && ["final_inspection_okqty", "production_output", "rejection_rate", "unplanned_downtime", "oa_efficiency"].includes(k.key) ? (
            <div className="d2-kpi__val d2-kpi__val--shimmer" style={{ color: k.valColor }}>
              <span className="d2-shimmer-block" style={{ width: 80, height: 32, borderRadius: 6 }} />
            </div>
          ) : kpiError && ["final_inspection_okqty", "production_output", "rejection_rate", "unplanned_downtime", "oa_efficiency"].includes(k.key) ? (
            <div className="d2-kpi__val" style={{ color: "#ef4444", fontSize: 13 }}>⚠ Error</div>
          ) : (
            <div className="d2-kpi__val" style={{ color: k.valColor }}>{k.val}<span className="d2-kpi__unit">{k.unit}</span></div>
          )}
          <div className="d2-kpi__name">{k.name}</div>
          <div className="d2-kpi__foot">
            <span>{k.foot1}</span>
            <span style={{ color: k.foot2Color }}>{k.foot2}</span>
          </div>
          <div className="d2-kpi__src">{k.src}</div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════
function formatLocalYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildUrl(base, from, to) {
  if (!from || !to) return base;
  return `${base}?from=${formatLocalYmd(from)}&to=${formatLocalYmd(to)}`;
}

function formatInrAmount(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

function formatYmdShort(ymd) {
  if (!ymd || typeof ymd !== "string") return "—";
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function productionShiftChartToken(payload) {
  if (!payload?.shifts?.length) return `${payload?.from ?? ""}|${payload?.to ?? ""}|empty`;
  return `${payload.from}|${payload.to}|${payload.shifts.map((s) => `${s.shift}:${s.total_qty}`).join(";")}`;
}

function formatShiftAxisLabel(raw) {
  const s = String(raw ?? "").trim();
  if (!s || s === "(unassigned)") return "Unassigned";
  if (/^[1-9]\d*$/i.test(s)) return `Shift ${s}`;
  if (/^[ABC]$/i.test(s)) return `Shift ${s.toUpperCase()}`;
  return s;
}

function qualitySplitMetrics(liveKpis) {
  const ok = Number(liveKpis?.finalInspection?.total_ok_qty ?? 0) || 0;
  const rejection = Number(liveKpis?.production?.kpis?.rejection_qty ?? 0) || 0;
  const rework = Number(liveKpis?.production?.kpis?.rework_grand_total ?? 0) || 0;
  const from = liveKpis?.finalInspection?.from || liveKpis?.production?.from || "";
  const to = liveKpis?.finalInspection?.to || liveKpis?.production?.to || "";
  const total = ok + rejection + rework;
  const pct = (v) => (total > 0 ? ((v / total) * 100).toFixed(1) : "0.0");
  return { ok, rejection, rework, total, from, to, pctOk: pct(ok), pctRej: pct(rejection), pctRwk: pct(rework) };
}

function qualitySplitChartToken(liveKpis) {
  const m = qualitySplitMetrics(liveKpis);
  return `${m.from}|${m.to}|${m.ok}|${m.rejection}|${m.rework}`;
}

const DOWNTIME_BAR_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#14b8a6", "#0ea5e9", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef"];

function downtimeReasonChartToken(payload) {
  if (!payload?.reasons) return `${payload?.from ?? ""}|${payload?.to ?? ""}|empty`;
  return `${payload.from}|${payload.to}|${payload.reasons.map((r) => `${r.reason}:${r.hours}`).join(";")}`;
}

function buildDowntimeChartSeries(reasons, maxReasons = 12) {
  const list = Array.isArray(reasons) ? reasons : [];
  if (!list.length) return { labels: ["No non-accepted idle in range"], hours: [0] };
  if (list.length <= maxReasons) return { labels: list.map((r) => r.reason || "—"), hours: list.map((r) => Number(r.hours) || 0) };
  const top = list.slice(0, maxReasons);
  const otherH = list.slice(maxReasons).reduce((s, r) => s + (Number(r.hours) || 0), 0);
  return { labels: [...top.map((r) => r.reason || "—"), `Other (${list.length - maxReasons} reasons)`], hours: [...top.map((r) => Number(r.hours) || 0), otherH] };
}

function QualitySplitSection({ liveKpis, kpiLoading, kpiError, setupQualDonut, qualSplitRebuildToken, donutHeight = 140, title = "Quality Split" }) {
  const m = qualitySplitMetrics(liveKpis);
  const rangeLine = m.from && m.to ? `${m.from} → ${m.to}` : "Uses the dashboard date range";
  return (
    <Card>
      <div className="d2-card__hd">
        <div>
          <div className="d2-card__title">{title}</div>
          <div className="d2-card__sub">FinalInspectionEntry OK (finspdate) · Rejection & rework from GET /api/dashboard2/kpis/ (InJob + Inter + Final)</div>
        </div>
      </div>
      {kpiError ? <div style={{ padding: "8px 16px 0", color: "#ef4444", fontSize: 12 }}>One or more KPI requests failed; values below reflect whatever loaded.</div> : null}
      <div style={{ fontSize: 11, color: "#94a3b8", padding: "4px 16px 0" }}>{rangeLine}</div>
      <div style={{ opacity: kpiLoading ? 0.5 : 1, transition: "opacity 0.2s" }}>
        <ChartCanvas setup={setupQualDonut} height={donutHeight} rebuildToken={qualSplitRebuildToken} />
      </div>
      <div className="d2-leg">
        <div className="d2-leg__item"><div className="d2-leg__dot" style={{ background: "#10b981" }} />Final inspection OK · {m.pctOk}% · {m.ok.toLocaleString()} qty</div>
        <div className="d2-leg__item"><div className="d2-leg__dot" style={{ background: "#ef4444" }} />Rejection · {m.pctRej}% · {m.rejection.toLocaleString()} qty</div>
        <div className="d2-leg__item"><div className="d2-leg__dot" style={{ background: "#f59e0b" }} />Rework · {m.pctRwk}% · {m.rework.toLocaleString()} qty</div>
      </div>
      {!kpiLoading && m.total <= 0 ? <div style={{ fontSize: 11, color: "#94a3b8", padding: "4px 16px 12px" }}>No OK / rejection / rework quantities in this range.</div> : null}
    </Card>
  );
}

// ════════════════════════════════════════════
//  TAB SECTIONS
// ════════════════════════════════════════════

// ── Overview ─────────────────────────────────
function OverviewTab({
  setupProdChart, prodShiftRebuildToken, prodShiftLoading, prodShiftError,
  setupQualDonut, qualSplitRebuildToken,
  setupDowntimeChart, downtimeReasonRebuildToken, downtimeReasonLoading, downtimeReasonError,
  setupMatChart, setupOtdChart, setupRejChart, woBadgeCls, stBadgeCls,
  liveKpis, kpiLoading, kpiError,
  idleAccepted, idleNonAccepted, idleLoading, idleError, idleSummary,
  injobInspection, injobLoading, injobError,
  interInspection, interLoading, interError,
  finalOrgInspection, finalOrgLoading, finalOrgError,
  complaintsPayload, complaintsLoading, complaintsError,
  poPipeline, poPipelineLoading, poPipelineError,
  inspectionPending, inspectionPendingLoading, inspectionPendingError,
  grnPendingPipeline, grnPendingPipelineLoading, grnPendingPipelineError,
  iqcRejections, iqcRejectionsLoading, iqcRejectionsError,
  topDefects, topDefectsLoading, topDefectsError,
}) {
  return (
    <>
      <SectionLabel>Key Performance Indicators — Today (ProductionEntry · FinalInspectionEntry · InJob_Det)</SectionLabel>
      <KpiStrip liveKpis={liveKpis} kpiLoading={kpiLoading} kpiError={kpiError} />

      <SectionLabel>Idle Hours — Accepted vs Non-Accepted vs Total (Machine_IdleEntry · Prod_IdleEntry · conv_IdleEntry · IdleReasons)</SectionLabel>
      <IdleHoursSection summary={idleSummary} accepted={idleAccepted} nonAccepted={idleNonAccepted} loading={idleLoading} error={idleError} />

      <SectionLabel>Inspection — Job Order · Intermediate · Final (Rejection & Rework · FPY)</SectionLabel>
      <div className="d2-insp-cards-row">
        <JobOrderInspSection injobInspection={injobInspection} injobLoading={injobLoading} injobError={injobError} />
        <IntermediateInspSection interInspection={interInspection} interLoading={interLoading} interError={interError} />
        <FinalInspRejSection liveKpis={liveKpis} kpiLoading={kpiLoading} finalOrgInspection={finalOrgInspection} finalOrgLoading={finalOrgLoading} finalOrgError={finalOrgError} />
      </div>

      <SectionLabel>Production Trend · Quality Split · Downtime Analysis</SectionLabel>
      <div className="d2-row3">
        <Card>
          <div className="d2-card__hd">
            <div>
              <div className="d2-card__title">Production Data</div>
              <div className="d2-card__sub">ProductionEntry.okqty + ConvProductionEntry · Rod (qty), by shift — filtered by date range</div>
            </div>
            <button className="d2-card__btn">Drill Down ↗</button>
          </div>
          {prodShiftError ? <div style={{ padding: "12px 16px", color: "#ef4444", fontSize: 13 }}>{prodShiftError}</div> : null}
          <div className={prodShiftLoading ? "d2-chart-wrap d2-chart-wrap--loading" : "d2-chart-wrap"}>
            <ChartCanvas setup={setupProdChart} height={160} rebuildToken={prodShiftRebuildToken} />
          </div>
        </Card>
        <QualitySplitSection title="Quality Split" liveKpis={liveKpis} kpiLoading={kpiLoading} kpiError={kpiError} setupQualDonut={setupQualDonut} qualSplitRebuildToken={qualSplitRebuildToken} donutHeight={140} />
        <Card>
          <div className="d2-card__hd">
            <div>
              <div className="d2-card__title">Downtime by Reason</div>
              <div className="d2-card__sub">Non-accepted idle (IdleReasons.IsAccept = 0) — Machine_IdleEntry · Prod_IdleEntry · conv_IdleEntry, by date range</div>
            </div>
          </div>
          {downtimeReasonError ? <div style={{ padding: "12px 16px", color: "#ef4444", fontSize: 13 }}>{downtimeReasonError}</div> : null}
          <div style={{ opacity: downtimeReasonLoading ? 0.5 : 1, transition: "opacity 0.2s" }}>
            <ChartCanvas setup={setupDowntimeChart} height={185} rebuildToken={downtimeReasonRebuildToken} />
          </div>
        </Card>
      </div>

      {/* ── Quality Details · Work Orders (2-col, Material Consumption removed) ── */}
      <SectionLabel>Quality Details · Work Orders</SectionLabel>
      <div className="d2-row-2col">
        <TopDefectCategories topDefects={topDefects} topDefectsLoading={topDefectsLoading} topDefectsError={topDefectsError} />
        <WorkOrderProgressLive poPipeline={poPipeline} poPipelineLoading={poPipelineLoading} poPipelineError={poPipelineError} />
      </div>

      {/* ── Dispatch Performance — full width (Live Exceptions removed) ── */}
      <SectionLabel>Dispatch Performance (SalesMast · DispatchMast)</SectionLabel>
      <Card className="d2-otd-fullwidth">
        <div className="d2-card__hd">
          <div>
            <div className="d2-card__title">On-Time Delivery Trend</div>
            <div className="d2-card__sub">FROM: SalesMast.delivery_date vs DispatchMast.dispatch_date</div>
          </div>
        </div>
        <div className="d2-otd-fullwidth__body">
          <div className="d2-otd-fullwidth__chart">
            <ChartCanvas setup={setupOtdChart} height={100} />
          </div>
          <div className="d2-otd-fullwidth__kpis">
            <div className="d2-otd-kpi d2-otd-kpi--blue">
              <div className="d2-otd-kpi__val">87%</div>
              <div className="d2-otd-kpi__lbl">OTD This Month</div>
              <div className="d2-otd-kpi__sub">Target: 95%</div>
            </div>
            <div className="d2-otd-kpi d2-otd-kpi--amber">
              <div className="d2-otd-kpi__val">13</div>
              <div className="d2-otd-kpi__lbl">Delayed Orders</div>
              <div className="d2-otd-kpi__sub">Needs follow-up</div>
            </div>
            <div className="d2-otd-kpi d2-otd-kpi--green">
              <div className="d2-otd-kpi__val">94%</div>
              <div className="d2-otd-kpi__lbl">Schedule Adherence</div>
              <div className="d2-otd-kpi__sub">vs 95% target</div>
            </div>
          </div>
        </div>
      </Card>

      <SectionLabel>Customer Complaints (CustCompMas · CustCompDet · CustMast)</SectionLabel>
      <CustomerComplaints complaintsPayload={complaintsPayload} complaintsLoading={complaintsLoading} complaintsError={complaintsError} />
      <SectionLabel>Inspection Pending Report (RouteCardStock · InJob_DetTemp — no date filter)</SectionLabel>
      <InspectionPending
        inspectionPending={inspectionPending}
        inspectionPendingLoading={inspectionPendingLoading}
        inspectionPendingError={inspectionPendingError}
      />
      <SectionLabel>Incoming Quality Rejections · GRN Pending (grn_mas · inspmas · grn_det)</SectionLabel>
      <div className="d2-iqc-grn">
        <IqcIncomingRejections
          iqcRejections={iqcRejections}
          iqcRejectionsLoading={iqcRejectionsLoading}
          iqcRejectionsError={iqcRejectionsError}
        />
        <GrnPendingPipelineQuickView
          grnPendingPipeline={grnPendingPipeline}
          grnPendingPipelineLoading={grnPendingPipelineLoading}
          grnPendingPipelineError={grnPendingPipelineError}
        />

      </div>
      <SectionLabel>Purchase Order Status — Full Pipeline (POMas · PODet · grninsubdet · grn_mas · CustMast)</SectionLabel>
      <PurchaseOrderStatus poPipeline={poPipeline} poPipelineLoading={poPipelineLoading} poPipelineError={poPipelineError} />
    </>
  );
}

function ProductionTab({
  setupProdChart, prodShiftRebuildToken, prodShiftLoading, prodShiftError,
  setupRejChart, liveKpis, kpiLoading, kpiError,
  idleAccepted, idleNonAccepted, idleLoading, idleError, idleSummary,
  injobInspection, injobLoading, injobError,
  interInspection, interLoading, interError,
  finalOrgInspection, finalOrgLoading, finalOrgError,
  poPipeline, poPipelineLoading, poPipelineError,
}) {
  return (
    <>
      <SectionLabel>Production Performance (ProductionEntry · MacMaster · WorkOrderMast)</SectionLabel>
      <KpiStrip liveKpis={liveKpis} kpiLoading={kpiLoading} kpiError={kpiError} />
      <div className="d2-row3">
        <Card>
          <div className="d2-card__hd">
            <div><div className="d2-card__title">Production Data</div><div className="d2-card__sub">ProductionEntry.okqty + ConvProductionEntry · Rod — totals by shift for selected range</div></div>
          </div>
          {prodShiftError ? <div style={{ padding: "12px 16px", color: "#ef4444", fontSize: 13 }}>{prodShiftError}</div> : null}
          <div className={prodShiftLoading ? "d2-chart-wrap d2-chart-wrap--loading" : "d2-chart-wrap"}>
            <ChartCanvas setup={setupProdChart} height={200} rebuildToken={prodShiftRebuildToken} />
          </div>
        </Card>
        <WorkOrderProgressLive poPipeline={poPipeline} poPipelineLoading={poPipelineLoading} poPipelineError={poPipelineError} />
      </div>
      <SectionLabel>Machine OEE (ProductionEntry.OEENEW + runtimesecs + MacMaster.RatePerHr)</SectionLabel>
      <div className="d2-oee-cards">{OEE_CARDS.map(m => <OeeCard key={m.id} m={m} />)}</div>
      <SectionLabel>Inspection — Job Order · Intermediate · Final (Rejection & Rework · FPY)</SectionLabel>
      <div className="d2-insp-cards-row">
        <JobOrderInspSection injobInspection={injobInspection} injobLoading={injobLoading} injobError={injobError} />
        <IntermediateInspSection interInspection={interInspection} interLoading={interLoading} interError={interError} />
        <FinalInspRejSection liveKpis={liveKpis} kpiLoading={kpiLoading} finalOrgInspection={finalOrgInspection} finalOrgLoading={finalOrgLoading} finalOrgError={finalOrgError} />
      </div>
      <SectionLabel>6-Month Rejection Trend (InJob_Det.macrej · matrej · ReworkEntry)</SectionLabel>
      <Card>
        <div className="d2-card__hd"><div><div className="d2-card__title">Mac Rejection vs Material Rejection vs Rework</div><div className="d2-card__sub">FROM: InJob_Det GROUP BY month · ReworkEntry</div></div></div>
        <ChartCanvas setup={setupRejChart} height={200} />
        <div className="d2-leg" style={{ marginTop: 12 }}>
          <div className="d2-leg__item"><div className="d2-leg__dot" style={{ background: "#ef4444" }} />Machine Rejection</div>
          <div className="d2-leg__item"><div className="d2-leg__dot" style={{ background: "#1a56db" }} />Material Rejection</div>
          <div className="d2-leg__item"><div className="d2-leg__dot" style={{ background: "#f59e0b" }} />Rework</div>
        </div>
      </Card>
      <SectionLabel>Idle Hours — Accepted vs Non-Accepted vs Total (IdleReasons · date range)</SectionLabel>
      <IdleHoursSection summary={idleSummary} accepted={idleAccepted} nonAccepted={idleNonAccepted} loading={idleLoading} error={idleError} />
    </>
  );
}

function QualityTab({
  setupQualDonut, qualSplitRebuildToken, setupRejChart,
  liveKpis, kpiLoading, kpiError,
  injobInspection, injobLoading, injobError,
  interInspection, interLoading, interError,
  finalOrgInspection, finalOrgLoading, finalOrgError,
  complaintsPayload, complaintsLoading, complaintsError,
  inspectionPending, inspectionPendingLoading, inspectionPendingError,
  iqcRejections, iqcRejectionsLoading, iqcRejectionsError,
  topDefects, topDefectsLoading, topDefectsError,
}) {
  return (
    <>
      <SectionLabel>Quality KPIs (FinalInspectionEntry · InJob_Det · ReworkEntry)</SectionLabel>
      <KpiStrip liveKpis={liveKpis} kpiLoading={kpiLoading} kpiError={kpiError} />
      <div className="d2-row3">
        <QualitySplitSection title="Quality Split" liveKpis={liveKpis} kpiLoading={kpiLoading} kpiError={kpiError} setupQualDonut={setupQualDonut} qualSplitRebuildToken={qualSplitRebuildToken} donutHeight={160} />
        <TopDefectCategories topDefects={topDefects} topDefectsLoading={topDefectsLoading} topDefectsError={topDefectsError} />
        <IqcIncomingRejections
          iqcRejections={iqcRejections}
          iqcRejectionsLoading={iqcRejectionsLoading}
          iqcRejectionsError={iqcRejectionsError}
          compact
        />
      </div>
      <SectionLabel>Inspection — Job Order · Intermediate · Final (Rejection & Rework · FPY)</SectionLabel>
      <div className="d2-insp-cards-row">
        <JobOrderInspSection injobInspection={injobInspection} injobLoading={injobLoading} injobError={injobError} />
        <IntermediateInspSection interInspection={interInspection} interLoading={interLoading} interError={interError} />
        <FinalInspRejSection liveKpis={liveKpis} kpiLoading={kpiLoading} finalOrgInspection={finalOrgInspection} finalOrgLoading={finalOrgLoading} finalOrgError={finalOrgError} />
      </div>
      <SectionLabel>6-Month Rejection Trend</SectionLabel>
      <Card><div className="d2-card__hd"><div><div className="d2-card__title">Machine Rejection vs Material Rejection vs Rework — Monthly</div><div className="d2-card__sub">FROM: InJob_Det GROUP BY month · ReworkEntry</div></div></div><ChartCanvas setup={setupRejChart} height={200} /></Card>
      <SectionLabel>Customer Complaints (CustCompMas · CustCompDet · CustMast)</SectionLabel>
      <CustomerComplaints complaintsPayload={complaintsPayload} complaintsLoading={complaintsLoading} complaintsError={complaintsError} />
      <SectionLabel>Inspection Pending Report (RouteCardStock · InJob_DetTemp — no date filter)</SectionLabel>
      <InspectionPending
        inspectionPending={inspectionPending}
        inspectionPendingLoading={inspectionPendingLoading}
        inspectionPendingError={inspectionPendingError}
      />
    </>
  );
}

function MaintenanceTab({ setupDowntimeChart, downtimeReasonRebuildToken, downtimeReasonLoading, downtimeReasonError, idleAccepted, idleNonAccepted, idleLoading, idleError, idleSummary }) {
  return (
    <>
      <SectionLabel>Maintenance Overview (PMSchedule · MaintenanceMast · DowntimeMast)</SectionLabel>
      <div className="d2-row3">
        <Card>
          <div className="d2-card__hd"><div><div className="d2-card__title">Downtime by Reason</div><div className="d2-card__sub">Non-accepted idle hours by IdleReasons — same engine as Overview, filtered by dashboard date range</div></div></div>
          {downtimeReasonError ? <div style={{ padding: "12px 16px", color: "#ef4444", fontSize: 13 }}>{downtimeReasonError}</div> : null}
          <div style={{ opacity: downtimeReasonLoading ? 0.5 : 1, transition: "opacity 0.2s" }}>
            <ChartCanvas setup={setupDowntimeChart} height={220} rebuildToken={downtimeReasonRebuildToken} />
          </div>
        </Card>
        <Card>
          <div className="d2-card__hd"><div><div className="d2-card__title">Machine Status Summary</div><div className="d2-card__sub">MacMaster + DowntimeMast (open) + MaintenanceMast (active)</div></div></div>
          <div className="d2-mstat-summary">
            {[{ label: "Running", count: 3, color: "#10b981", bg: "#d1fae5" }, { label: "Idle", count: 1, color: "#f59e0b", bg: "#fef3c7" }, { label: "Breakdown", count: 1, color: "#ef4444", bg: "#fee2e2" }, { label: "Maintenance", count: 1, color: "#8b5cf6", bg: "#ede9fe" }].map(s => (<div key={s.label} className="d2-mstat-row" style={{ background: s.bg, borderLeft: `4px solid ${s.color}` }}><span className="d2-mstat-lbl" style={{ color: s.color }}>{s.label}</span><span className="d2-mstat-cnt" style={{ color: s.color }}>{s.count} machine{s.count !== 1 ? "s" : ""}</span></div>))}
          </div>
          <div className="d2-mttr-grid">
            <div className="d2-mttr-item"><div className="d2-mttr-val" style={{ color: "#f59e0b" }}>54 min</div><div className="d2-mttr-lbl">Avg MTTR</div></div>
            <div className="d2-mttr-item"><div className="d2-mttr-val" style={{ color: "#10b981" }}>18.4 hrs</div><div className="d2-mttr-lbl">Avg MTBF</div></div>
            <div className="d2-mttr-item"><div className="d2-mttr-val" style={{ color: "#1a56db" }}>83%</div><div className="d2-mttr-lbl">PM Compliance</div></div>
          </div>
        </Card>
      </div>
      <SectionLabel>Machine OEE — Availability Component</SectionLabel>
      <div className="d2-oee-cards">{OEE_CARDS.map(m => <OeeCard key={m.id} m={m} />)}</div>
      <SectionLabel>Idle Hours — Accepted vs Non-Accepted vs Total (Machine_IdleEntry · IdleReasons)</SectionLabel>
      <IdleHoursSection summary={idleSummary} accepted={idleAccepted} nonAccepted={idleNonAccepted} loading={idleLoading} error={idleError} />
    </>
  );
}

function DispatchTab({
  setupOtdChart,
  complaintsPayload, complaintsLoading, complaintsError,
  poPipeline, poPipelineLoading, poPipelineError,
}) {
  return (
    <>
      <SectionLabel>Dispatch & Delivery Performance (SalesMast · DispatchMast)</SectionLabel>
      <div className="d2-row5">
        <Card>
          <div className="d2-card__hd"><div><div className="d2-card__title">On-Time Delivery Trend</div><div className="d2-card__sub">FROM: COUNT(dispatch_date ≤ delivery_date) / COUNT(dispatched) × 100</div></div></div>
          <ChartCanvas setup={setupOtdChart} height={200} />
          <div className="d2-otd-stats">
            <div className="d2-otd-stat"><div className="d2-otd-val" style={{ color: "#1a56db" }}>87%</div><div className="d2-otd-lbl">OTD This Month</div></div>
            <div className="d2-otd-stat"><div className="d2-otd-val" style={{ color: "#f59e0b" }}>13</div><div className="d2-otd-lbl">Delayed Orders</div></div>
            <div className="d2-otd-stat"><div className="d2-otd-val" style={{ color: "#10b981" }}>94%</div><div className="d2-otd-lbl">Schedule Adherence</div></div>
          </div>
        </Card>
        <Card>
          <WorkOrderProgressLive poPipeline={poPipeline} poPipelineLoading={poPipelineLoading} poPipelineError={poPipelineError} />
        </Card>
      </div>
      <SectionLabel>Customer Complaints (CustCompMas · CustCompDet · CustMast)</SectionLabel>
      <CustomerComplaints complaintsPayload={complaintsPayload} complaintsLoading={complaintsLoading} complaintsError={complaintsError} />
      <SectionLabel>Purchase Order Status (POMas · PODet · grninsubdet · grn_mas · CustMast)</SectionLabel>
      <PurchaseOrderStatus poPipeline={poPipeline} poPipelineLoading={poPipelineLoading} poPipelineError={poPipelineError} />
    </>
  );
}

// ════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════
export default function Dashboard2() {
  const [activePeriod, setActivePeriod] = useState("month");
  const [activeTab, setActiveTab] = useState("Overview");
  const [dateRange, setDateRange] = useState({ from: null, to: null });

  const [liveKpis, setLiveKpis] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError, setKpiError] = useState(null);

  const [idleAccepted, setIdleAccepted] = useState([]);
  const [idleNonAccepted, setIdleNonAccepted] = useState([]);
  const [idleSummary, setIdleSummary] = useState(null);
  const [idleLoading, setIdleLoading] = useState(false);
  const [idleError, setIdleError] = useState(null);

  const [injobInspection, setInjobInspection] = useState(null);
  const [injobLoading, setInjobLoading] = useState(false);
  const [injobError, setInjobError] = useState(null);

  const [interInspection, setInterInspection] = useState(null);
  const [interLoading, setInterLoading] = useState(false);
  const [interError, setInterError] = useState(null);

  const [finalOrgInspection, setFinalOrgInspection] = useState(null);
  const [finalOrgLoading, setFinalOrgLoading] = useState(false);
  const [finalOrgError, setFinalOrgError] = useState(null);

  const [productionByShift, setProductionByShift] = useState(null);
  const [prodShiftError, setProdShiftError] = useState(null);
  const [prodShiftLoading, setProdShiftLoading] = useState(false);

  const [downtimeByReason, setDowntimeByReason] = useState(null);
  const [downtimeReasonError, setDowntimeReasonError] = useState(null);
  const [downtimeReasonLoading, setDowntimeReasonLoading] = useState(false);

  const [customerComplaints, setCustomerComplaints] = useState(null);
  const [complaintsError, setComplaintsError] = useState(null);
  const [complaintsLoading, setComplaintsLoading] = useState(false);

  const [poPipeline, setPoPipeline] = useState(null);
  const [poPipelineLoading, setPoPipelineLoading] = useState(false);
  const [poPipelineError, setPoPipelineError] = useState(null);

  const [inspectionPending, setInspectionPending] = useState(null);
  const [inspectionPendingLoading, setInspectionPendingLoading] = useState(false);
  const [inspectionPendingError, setInspectionPendingError] = useState(null);

  const [grnPendingPipeline, setGrnPendingPipeline] = useState(null);
  const [grnPendingPipelineLoading, setGrnPendingPipelineLoading] = useState(false);
  const [grnPendingPipelineError, setGrnPendingPipelineError] = useState(null);

  const [iqcRejections, setIqcRejections] = useState(null);
  const [iqcRejectionsLoading, setIqcRejectionsLoading] = useState(false);
  const [iqcRejectionsError, setIqcRejectionsError] = useState(null);

  const [topDefects, setTopDefects] = useState(null);
  const [topDefectsLoading, setTopDefectsLoading] = useState(false);
  const [topDefectsError, setTopDefectsError] = useState(null);

  const TABS = ["Overview", "Production", "Quality", "Maintenance", "Dispatch"];

  const fetchDashboardData = useCallback(async (from, to) => {
    setKpiLoading(true); setIdleLoading(true); setInjobLoading(true); setInterLoading(true);
    setFinalOrgLoading(true); setProdShiftLoading(true); setDowntimeReasonLoading(true); setComplaintsLoading(true);
    setKpiError(null); setIdleError(null); setInjobError(null); setInterError(null);
    setFinalOrgError(null); setProdShiftError(null); setDowntimeReasonError(null); setComplaintsError(null);
    setPoPipelineError(null);
    setPoPipelineLoading(true);
    setInspectionPendingError(null);
    setInspectionPendingLoading(true);
    setGrnPendingPipelineError(null);
    setGrnPendingPipelineLoading(true);
    setIqcRejectionsError(null);
    setIqcRejectionsLoading(true);
    setTopDefectsError(null);
    setTopDefectsLoading(true);
    try {
      const [fiRes, prodRes, idleRes, injobRes, interRes, finalOrgRes, prodShiftRes, downtimeRes, complaintsRes, poRes, ipSnapRes, grnPendRes, iqcRes, topDefRes] = await Promise.all([
        fetch(buildUrl("/api/dashboard2/final-inspection-kpi/", from, to), { credentials: "include" }),
        fetch(buildUrl("/api/dashboard2/kpis/", from, to), { credentials: "include" }),
        fetch(buildUrl("/api/dashboard2/idle-hours/", from, to), { credentials: "include" }),
        fetch(buildUrl("/api/dashboard2/injob-inspection/", from, to), { credentials: "include" }),
        fetch(buildUrl("/api/dashboard2/inter-inspection/", from, to), { credentials: "include" }),
        fetch(buildUrl("/api/dashboard2/final-inspection-org-rej-rwk/", from, to), { credentials: "include" }),
        fetch(buildUrl("/api/dashboard2/production-by-shift/", from, to), { credentials: "include" }),
        fetch(buildUrl("/api/dashboard2/downtime-by-reason/", from, to), { credentials: "include" }),
        fetch(buildUrl("/api/dashboard2/customer-complaints/", from, to), { credentials: "include" }),
        fetch(buildUrl("/api/dashboard2/po-pipeline/", from, to), { credentials: "include" }),
        fetch("/api/dashboard2/inspection-pending-snapshot/", { credentials: "include" }),
        fetch(buildUrl("/api/dashboard2/grn-pending-pipeline/", from, to), { credentials: "include" }),
        fetch(buildUrl("/api/dashboard2/iqc-rejections/", from, to), { credentials: "include" }),
        fetch(buildUrl("/api/dashboard2/top-defect-categories/", from, to), { credentials: "include" }),
      ]);
      const [fiData, prodData, idleData, injobData, interData, finalOrgData, prodShiftData, downtimeData, complaintsData, poData, ipSnapData, grnPendData, iqcData, topDefData] = await Promise.all([
        fiRes.json().catch(() => null), prodRes.json().catch(() => null),
        idleRes.json().catch(() => null), injobRes.json().catch(() => null),
        interRes.json().catch(() => null), finalOrgRes.json().catch(() => null),
        prodShiftRes.json().catch(() => null), downtimeRes.json().catch(() => null),
        complaintsRes.json().catch(() => null), poRes.json().catch(() => null),
        ipSnapRes.json().catch(() => null),
        grnPendRes.json().catch(() => null),
        iqcRes.json().catch(() => null),
        topDefRes.json().catch(() => null),
      ]);
      setLiveKpis({ finalInspection: fiRes.ok ? fiData : null, production: prodRes.ok && prodData?.kpis ? prodData : null });
      if (!fiRes.ok || !prodRes.ok) setKpiError("One or more KPI requests failed.");

      if (injobRes.ok && injobData && !injobData.error) { setInjobInspection(injobData); setInjobError(null); }
      else { setInjobInspection(null); setInjobError((injobData?.error) || (injobData?.detail) || `Job order inspection failed (${injobRes.status})`); }

      if (interRes.ok && interData && !interData.error) { setInterInspection(interData); setInterError(null); }
      else { setInterInspection(null); setInterError((interData?.error) || (interData?.detail) || `Intermediate inspection failed (${interRes.status})`); }

      if (finalOrgRes.ok && finalOrgData && !finalOrgData.error) { setFinalOrgInspection(finalOrgData); setFinalOrgError(null); }
      else { setFinalOrgInspection(null); setFinalOrgError((finalOrgData?.error) || (finalOrgData?.detail) || `Final inspection org rej/rwk failed (${finalOrgRes.status})`); }

      if (idleRes.ok && idleData && Array.isArray(idleData.accepted)) {
        setIdleAccepted(idleData.accepted || []); setIdleNonAccepted(idleData.non_accepted || []);
        setIdleSummary(idleData.summary && typeof idleData.summary === "object" ? idleData.summary : null);
      } else {
        setIdleAccepted([]); setIdleNonAccepted([]); setIdleSummary(null);
        if (!idleRes.ok) setIdleError(idleData?.error || `Idle hours request failed (${idleRes.status})`);
      }

      if (prodShiftRes.ok && prodShiftData && Array.isArray(prodShiftData.shifts) && !prodShiftData.error) { setProductionByShift(prodShiftData); setProdShiftError(null); }
      else { setProductionByShift(null); setProdShiftError((prodShiftData?.error) || (prodShiftData?.detail) || `Production by shift failed (${prodShiftRes.status})`); }

      if (downtimeRes.ok && downtimeData && Array.isArray(downtimeData.reasons) && !downtimeData.error) { setDowntimeByReason(downtimeData); setDowntimeReasonError(null); }
      else { setDowntimeByReason(null); setDowntimeReasonError((downtimeData?.error) || (downtimeData?.detail) || `Downtime by reason failed (${downtimeRes.status})`); }

      if (complaintsRes.ok && complaintsData && Array.isArray(complaintsData.complaints)) {
        setCustomerComplaints(complaintsData);
        setComplaintsError(complaintsData.error || complaintsData.detail || null);
      } else {
        setCustomerComplaints(null);
        setComplaintsError(
          (complaintsData && complaintsData.error) ||
          (complaintsData && complaintsData.detail) ||
          `Customer complaints failed (${complaintsRes.status})`,
        );
      }

      if (poRes.ok && poData && poData.summary != null && !poData.error) {
        setPoPipeline(poData);
        setPoPipelineError(null);
      } else {
        setPoPipeline(null);
        setPoPipelineError(
          (poData && poData.error) ||
          (poData && poData.detail) ||
          `Purchase order pipeline failed (${poRes.status})`,
        );
      }

      if (
        ipSnapRes.ok &&
        ipSnapData &&
        !ipSnapData.error &&
        typeof ipSnapData.intermediate_pending_qty === "number" &&
        typeof ipSnapData.final_pending_qty === "number" &&
        typeof ipSnapData.joborder_pending_qty === "number"
      ) {
        setInspectionPending(ipSnapData);
        setInspectionPendingError(null);
      } else {
        setInspectionPending(null);
        setInspectionPendingError(
          (ipSnapData && ipSnapData.error) ||
          (ipSnapData && ipSnapData.detail) ||
          `Inspection pending snapshot failed (${ipSnapRes.status})`,
        );
      }

      if (
        grnPendRes.ok &&
        grnPendData &&
        Array.isArray(grnPendData.rows) &&
        grnPendData.summary &&
        typeof grnPendData.summary.total_record_count === "number" &&
        typeof grnPendData.summary.total_qty === "number" &&
        !grnPendData.error
      ) {
        setGrnPendingPipeline(grnPendData);
        setGrnPendingPipelineError(null);
      } else {
        setGrnPendingPipeline(null);
        setGrnPendingPipelineError(
          (grnPendData && grnPendData.error) ||
            (grnPendData && grnPendData.detail) ||
            `GRN pending pipeline failed (${grnPendRes.status})`,
        );
      }

      if (
        iqcRes.ok &&
        iqcData &&
        Array.isArray(iqcData.rows) &&
        iqcData.summary &&
        typeof iqcData.summary.total_record_count === "number" &&
        typeof iqcData.summary.total_rejection_qty === "number" &&
        !iqcData.error
      ) {
        setIqcRejections(iqcData);
        setIqcRejectionsError(null);
      } else {
        setIqcRejections(null);
        setIqcRejectionsError(
          (iqcData && iqcData.error) ||
            (iqcData && iqcData.detail) ||
            `IQC rejections failed (${iqcRes.status})`,
        );
      }

      if (topDefRes.ok && topDefData && Array.isArray(topDefData.rows) && !topDefData.error) {
        setTopDefects(topDefData);
        setTopDefectsError(null);
      } else {
        setTopDefects(null);
        setTopDefectsError(
          (topDefData && topDefData.error) ||
          (topDefData && topDefData.detail) ||
          `Top defect categories failed (${topDefRes.status})`,
        );
      }

    } catch (err) {
      const msg = err.message || "Request failed";
      setKpiError(msg); setIdleError(msg);
      setInjobError(msg); setInjobInspection(null);
      setInterError(msg); setInterInspection(null);
      setFinalOrgError(msg); setFinalOrgInspection(null);
      setIdleSummary(null);
      setProductionByShift(null); setProdShiftError(msg);
      setDowntimeByReason(null); setDowntimeReasonError(msg);
      setCustomerComplaints(null);
      setComplaintsError(msg);
      setPoPipeline(null);
      setPoPipelineError(msg);
      setInspectionPending(null);
      setInspectionPendingError(msg);
      setGrnPendingPipeline(null);
      setGrnPendingPipelineError(msg);
      setIqcRejections(null);
      setIqcRejectionsError(msg);
      setTopDefects(null);
      setTopDefectsError(msg);
    } finally {
      setKpiLoading(false); setIdleLoading(false); setInjobLoading(false); setInterLoading(false);
      setFinalOrgLoading(false); setProdShiftLoading(false); setDowntimeReasonLoading(false); setComplaintsLoading(false);
      setPoPipelineLoading(false);
      setInspectionPendingLoading(false);
      setGrnPendingPipelineLoading(false);
      setIqcRejectionsLoading(false);
      setTopDefectsLoading(false);
    }
  }, []);

  useEffect(() => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateRange({ from: monthStart, to: today });
    fetchDashboardData(monthStart, today);
  }, [fetchDashboardData]);

  const handleRangeChange = ({ from, to }) => { setDateRange({ from, to }); fetchDashboardData(from, to); };

  const setupProdChart = useCallback((canvas) => {
    const palette = ["rgba(14,165,233,.82)", "rgba(16,185,129,.82)", "rgba(26,86,219,.72)", "rgba(245,158,11,.78)", "rgba(139,92,246,.75)", "rgba(236,72,153,.72)"];
    const rows = productionByShift?.shifts;
    const labels = rows?.length > 0 ? rows.map((r) => formatShiftAxisLabel(r.shift)) : ["No data"];
    const data = rows?.length > 0 ? rows.map((r) => Number(r.total_qty) || 0) : [0];
    const rangeHint = productionByShift?.from && productionByShift?.to ? `${productionByShift.from} → ${productionByShift.to}` : "Selected range";
    return new Chart(canvas, {
      type: "bar",
      data: { labels, datasets: [{ label: `Total qty (${rangeHint})`, data, backgroundColor: labels.map((_, i) => palette[i % palette.length]), borderRadius: 4, borderSkipped: false }] },
      options: { responsive: true, plugins: { legend: { display: true, labels: { boxWidth: 10, padding: 14, color: "#64748b", font: { size: 10 } } }, tooltip: TOOLTIP_CFG }, scales: { x: { grid: { color: "rgba(228,233,242,.6)" }, ticks: { color: "#94a3b8", maxRotation: 45, minRotation: 0, autoSkip: true } }, y: { beginAtZero: true, grid: { color: "rgba(228,233,242,.6)" }, ticks: { color: "#94a3b8" } } } },
    });
  }, [productionByShift]);

  const prodShiftRebuildToken = productionShiftChartToken(productionByShift);
  const qualSplitRebuildToken = qualitySplitChartToken(liveKpis);

  const setupQualDonut = useCallback((canvas) => {
    const m = qualitySplitMetrics(liveKpis);
    const { ok, rejection, rework, total } = m;
    let data = [ok, rejection, rework];
    if (total <= 0) data = [1, 1, 1];
    return new Chart(canvas, {
      type: "doughnut",
      data: { labels: ["Final inspection OK", "Rejection", "Rework"], datasets: [{ data, backgroundColor: total > 0 ? ["rgba(16,185,129,.88)", "rgba(239,68,68,.85)", "rgba(245,158,11,.88)"] : ["#e2e8f0", "#e2e8f0", "#cbd5e1"], borderColor: "#ffffff", borderWidth: 3, hoverOffset: 6 }] },
      options: { cutout: "72%", plugins: { legend: { display: false }, tooltip: { ...TOOLTIP_CFG, callbacks: { label(ctx) { const lbl = ctx.label || ""; if (total <= 0) return `${lbl}: no data in range`; const v = [ok, rejection, rework][ctx.dataIndex] ?? 0; return `${lbl}: ${v.toLocaleString()} (${((v / total) * 100).toFixed(1)}%)`; } } } } },
    });
  }, [liveKpis]);

  const downtimeReasonRebuildToken = downtimeReasonChartToken(downtimeByReason);
  const setupDowntimeChart = useCallback((canvas) => {
    const { labels, hours } = buildDowntimeChartSeries(downtimeByReason?.reasons);
    const rangeHint = downtimeByReason?.from && downtimeByReason?.to ? `${downtimeByReason.from} → ${downtimeByReason.to}` : "Selected range";
    return new Chart(canvas, {
      type: "bar",
      data: { labels, datasets: [{ label: `Hours (${rangeHint}, non-accepted)`, data: hours, backgroundColor: labels.map((_, i) => DOWNTIME_BAR_COLORS[i % DOWNTIME_BAR_COLORS.length]), borderRadius: 4, borderSkipped: false }] },
      options: { indexAxis: "y", responsive: true, plugins: { legend: { display: false }, tooltip: { ...TOOLTIP_CFG, callbacks: { label(ctx) { const v = typeof ctx.parsed.x === "number" ? ctx.parsed.x : Number(ctx.raw) || 0; return `${v.toFixed(1)} h`; } } } }, scales: { x: { beginAtZero: true, grid: { color: "rgba(228,233,242,.6)" }, ticks: { color: "#94a3b8" }, title: { display: true, text: "Hours", color: "#94a3b8", font: { size: 10 } } }, y: { grid: { display: false }, ticks: { color: "#64748b", font: { size: 10 }, maxRotation: 0, autoSkip: false } } } },
    });
  }, [downtimeByReason]);

  const setupMatChart = (canvas) => new Chart(canvas, {
    type: "bar",
    data: { labels: ["HR Steel", "Al Billets", "Rubber Seals", "Hyd. Fluid", "Electrodes"], datasets: [{ label: "Standard (BOM)", data: [820, 310, 1200, 42, 95], backgroundColor: "rgba(26,86,219,.45)", borderRadius: 3, borderSkipped: false }, { label: "Actual Issued", data: [890, 298, 1185, 51, 102], backgroundColor: "rgba(14,165,233,.75)", borderRadius: 3, borderSkipped: false }] },
    options: { responsive: true, plugins: { legend: { display: true, labels: { boxWidth: 10, padding: 12, color: "#64748b", font: { size: 9 } } }, tooltip: TOOLTIP_CFG }, scales: { x: { grid: { display: false }, ticks: { color: "#94a3b8", font: { size: 9 } } }, y: { grid: { color: "rgba(228,233,242,.6)" }, ticks: { color: "#94a3b8" } } } },
  });

  const setupOtdChart = (canvas) => new Chart(canvas, {
    type: "line",
    data: { labels: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"], datasets: [{ label: "OTD %", data: [82, 85, 79, 88, 91, 89, 87], borderColor: "rgba(26,86,219,.9)", backgroundColor: "rgba(26,86,219,.07)", fill: true, tension: .5, pointBackgroundColor: "#1a56db", pointRadius: 3, borderWidth: 2 }, { label: "Target", data: [95, 95, 95, 95, 95, 95, 95], borderColor: "rgba(245,158,11,.5)", borderDash: [5, 3], borderWidth: 1.5, pointRadius: 0, fill: false }] },
    options: { plugins: { legend: { display: true, labels: { boxWidth: 10, padding: 12, color: "#64748b", font: { size: 9 } } }, tooltip: TOOLTIP_CFG }, scales: { x: { grid: { color: "rgba(228,233,242,.5)" }, ticks: { color: "#94a3b8" } }, y: { min: 70, max: 100, grid: { color: "rgba(228,233,242,.5)" }, ticks: { color: "#94a3b8" } } } },
  });

  const setupRejChart = (canvas) => new Chart(canvas, {
    type: "bar",
    data: { labels: REJECTION_DATA.map(d => d.month), datasets: [{ label: "Mac Rejection", data: REJECTION_DATA.map(d => d.macrej), backgroundColor: "rgba(239,68,68,.75)", borderRadius: 4, borderSkipped: false }, { label: "Mat Rejection", data: REJECTION_DATA.map(d => d.matrej), backgroundColor: "rgba(26,86,219,.70)", borderRadius: 4, borderSkipped: false }, { label: "Rework", data: REJECTION_DATA.map(d => d.rework), backgroundColor: "rgba(245,158,11,.75)", borderRadius: 4, borderSkipped: false }] },
    options: { responsive: true, plugins: { legend: { display: true, labels: { boxWidth: 10, padding: 14, color: "#64748b", font: { size: 10 } } }, tooltip: TOOLTIP_CFG }, scales: { x: { grid: { display: false }, ticks: { color: "#94a3b8" } }, y: { grid: { color: "rgba(228,233,242,.6)" }, ticks: { color: "#94a3b8" } } } },
  });

  const woBadgeCls = (sc) => ({ up: "up", dn: "dn", warn: "warn", neu: "neu" }[sc] || "neu");
  const stBadgeCls = (st) => st === "Rejected" ? "dn" : st === "On Hold" ? "warn" : st === "In Transit" ? "neu" : st === "Confirmed" ? "up" : "warn";

  const kpiProps = { liveKpis, kpiLoading, kpiError };
  const idleProps = { idleAccepted, idleNonAccepted, idleSummary, idleLoading, idleError };
  const inspectionFetchProps = { injobInspection, injobLoading, injobError, interInspection, interLoading, interError, finalOrgInspection, finalOrgLoading, finalOrgError };
  const complaintsProps = { complaintsPayload: customerComplaints, complaintsLoading, complaintsError };
  const poPipelineProps = { poPipeline, poPipelineLoading, poPipelineError };
  const inspectionPendingProps = {
    inspectionPending,
    inspectionPendingLoading,
    inspectionPendingError,
  };
  const grnPendingPipelineProps = {
    grnPendingPipeline,
    grnPendingPipelineLoading,
    grnPendingPipelineError,
  };
  const iqcRejectionsProps = {
    iqcRejections,
    iqcRejectionsLoading,
    iqcRejectionsError,
  };
  const topDefectsProps = {
    topDefects,
    topDefectsLoading,
    topDefectsError,
  };
  const chartProps = { setupProdChart, prodShiftRebuildToken, prodShiftLoading, prodShiftError, setupQualDonut, qualSplitRebuildToken, setupDowntimeChart, downtimeReasonRebuildToken, downtimeReasonLoading, downtimeReasonError, setupMatChart, setupOtdChart, setupRejChart, woBadgeCls, stBadgeCls };

  return (
    <div className="d2-root">
      <div className="d2-tabbar">
        <div className="d2-tabs">
          {TABS.map(t => (
            <button key={t} className={`d2-tab ${activeTab === t ? "d2-tab--active" : ""}`} onClick={() => setActiveTab(t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="d2-fbar">
        <Dashboard2DatePicker activePeriod={activePeriod} onPeriodChange={setActivePeriod} onRangeChange={handleRangeChange} />
      </div>
      {activeTab === "Overview" && <OverviewTab    {...chartProps} {...kpiProps} {...idleProps} {...inspectionFetchProps} {...complaintsProps} {...poPipelineProps} {...inspectionPendingProps} {...grnPendingPipelineProps} {...iqcRejectionsProps} {...topDefectsProps} />}
      {activeTab === "Production" && <ProductionTab  {...chartProps} {...kpiProps} {...idleProps} {...inspectionFetchProps} {...poPipelineProps} />}
      {activeTab === "Quality" && <QualityTab     {...chartProps} {...kpiProps} {...inspectionFetchProps} {...complaintsProps} {...inspectionPendingProps} {...iqcRejectionsProps} {...topDefectsProps} />}
      {activeTab === "Maintenance" && <MaintenanceTab {...chartProps} {...idleProps} />}
      {activeTab === "Dispatch" && <DispatchTab    {...chartProps} {...complaintsProps} {...poPipelineProps} />}
    </div>
  );
}