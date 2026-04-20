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
  running:     { color:"#10b981", bg:"#d1fae5", label:"● RUNNING"     },
  idle:        { color:"#f59e0b", bg:"#fef3c7", label:"● IDLE"        },
  breakdown:   { color:"#ef4444", bg:"#fee2e2", label:"● BREAKDOWN"   },
  maintenance: { color:"#8b5cf6", bg:"#ede9fe", label:"● MAINTENANCE" },
};

const OEE_CARDS = [
  { id:"CNC-01", type:"CNC Machining",  status:"running",     availability:94, performance:91, quality:96, oee:82, target:80, uptime:"7.1 h" },
  { id:"CNC-02", type:"CNC Machining",  status:"running",     availability:81, performance:88, quality:89, oee:63, target:80, uptime:"5.8 h" },
  { id:"INJ-01", type:"Injection Mold", status:"breakdown",   availability:0,  performance:0,  quality:0,  oee:0,  target:80, uptime:"0 h"   },
  { id:"ASM-01", type:"Assembly Line",  status:"running",     availability:97, performance:93, quality:98, oee:88, target:80, uptime:"7.0 h" },
  { id:"WLD-01", type:"Welding",        status:"idle",        availability:72, performance:79, quality:95, oee:54, target:80, uptime:"4.1 h" },
  { id:"PNT-01", type:"Paint Booth",    status:"maintenance", availability:0,  performance:0,  quality:0,  oee:0,  target:80, uptime:"—"     },
];

// ── NEW: Inspection Rejection & Rework data ──────────────────
const JO_REJ_DATA = [
  { wo:"WO-2041", part:"Brake Disc",     total:500, rejected:12, rework:8,  rejPct:2.4,  reworkPct:1.6,  target:2.0 },
  { wo:"WO-2042", part:"Engine Mount",   total:200, rejected:4,  rework:3,  rejPct:2.0,  reworkPct:1.5,  target:2.0 },
  { wo:"WO-2043", part:"Gear Housing",   total:120, rejected:18, rework:12, rejPct:15.0, reworkPct:10.0, target:2.0 },
  { wo:"WO-2044", part:"Control Arm",    total:350, rejected:9,  rework:7,  rejPct:2.6,  reworkPct:2.0,  target:2.0 },
  { wo:"WO-2045", part:"Exhaust Flange", total:800, rejected:6,  rework:5,  rejPct:0.75, reworkPct:0.63, target:2.0 },
];

const INTER_INSP_DATA = [
  { stage:"Turning",  part:"Brake Disc",      op:"OP-10", inspected:380, rejected:8,  rework:5,  rejPct:2.1,  reworkPct:1.3  },
  { stage:"Milling",  part:"Gear Housing",    op:"OP-20", inspected:95,  rejected:14, rework:10, rejPct:14.7, reworkPct:10.5 },
  { stage:"Drilling", part:"Control Arm",     op:"OP-30", inspected:210, rejected:5,  rework:4,  rejPct:2.4,  reworkPct:1.9  },
  { stage:"Welding",  part:"Exhaust Flange",  op:"OP-40", inspected:160, rejected:11, rework:9,  rejPct:6.9,  reworkPct:5.6  },
  { stage:"Assembly", part:"Engine Mount",    op:"OP-50", inspected:180, rejected:3,  rework:2,  rejPct:1.7,  reworkPct:1.1  },
];

const FINAL_INSP_DATA = [
  { wo:"WO-2041", part:"Brake Disc",     inspected:470, okQty:455, rejected:10, rework:5,  fpy:96.8, target:98 },
  { wo:"WO-2042", part:"Engine Mount",   inspected:190, okQty:186, rejected:3,  rework:1,  fpy:97.9, target:98 },
  { wo:"WO-2043", part:"Gear Housing",   inspected:90,  okQty:72,  rejected:14, rework:4,  fpy:80.0, target:98 },
  { wo:"WO-2044", part:"Control Arm",    inspected:220, okQty:211, rejected:6,  rework:3,  fpy:95.9, target:98 },
  { wo:"WO-2045", part:"Exhaust Flange", inspected:145, okQty:143, rejected:1,  rework:1,  fpy:98.6, target:98 },
];

const COMPLAINTS = [
  { id:"CC-0091", customer:"Maruti Suzuki", product:"Brake Disc",     type:"Dimensional",   date:"Feb 15", sev:"high",   status:"Open",        age:5  },
  { id:"CC-0089", customer:"Tata Motors",   product:"Engine Mount",   type:"Surface Defect", date:"Feb 12", sev:"medium", status:"In Progress", age:8  },
  { id:"CC-0087", customer:"Mahindra",      product:"Gear Housing",   type:"Assembly Issue", date:"Feb 08", sev:"high",   status:"Open",        age:12 },
  { id:"CC-0085", customer:"Bosch India",   product:"Control Arm",    type:"Weld Porosity",  date:"Feb 05", sev:"low",    status:"Closed",      age:15 },
  { id:"CC-0083", customer:"Hyundai",       product:"Exhaust Flange", type:"Paint Adhesion", date:"Jan 30", sev:"medium", status:"In Progress", age:21 },
  { id:"CC-0081", customer:"Maruti Suzuki", product:"Brake Disc",     type:"Dimensional",    date:"Jan 25", sev:"low",    status:"Closed",      age:26 },
];

const SEV_CFG = {
  high:   { c:"#ef4444", bg:"#fee2e2", lbl:"HIGH"   },
  medium: { c:"#f59e0b", bg:"#fef3c7", lbl:"MEDIUM" },
  low:    { c:"#10b981", bg:"#d1fae5", lbl:"LOW"     },
};

const CC_STATUS_CFG = {
  "Open":        { c:"#ef4444", bg:"#fee2e2" },
  "In Progress": { c:"#f59e0b", bg:"#fef3c7" },
  "Closed":      { c:"#10b981", bg:"#d1fae5" },
};

const INSP_PENDING = [
  { id:"IQC-4412", stage:"Incoming",   part:"HR Steel Coil", wo:"GRN-4412", qty:500,  pending:500, inspector:"Ravi K.",   due:"Today",    prio:"high" },
  { id:"FI-2041",  stage:"Final",      part:"Brake Disc",    wo:"WO-2041",  qty:500,  pending:30,  inspector:"Suresh M.", due:"Today",    prio:"high" },
  { id:"IP-3021",  stage:"In-Process", part:"Gear Housing",  wo:"WO-2043",  qty:120,  pending:69,  inspector:"Arjun S.",  due:"14:00",    prio:"crit" },
  { id:"IQC-4410", stage:"Incoming",   part:"Rubber Seals",  wo:"GRN-4410", qty:200,  pending:200, inspector:"Priya T.",  due:"Tomorrow", prio:"med"  },
  { id:"FI-2042",  stage:"Final",      part:"Engine Mount",  wo:"WO-2042",  qty:200,  pending:48,  inspector:"Suresh M.", due:"16:00",    prio:"med"  },
  { id:"IP-3019",  stage:"In-Process", part:"Control Arm",   wo:"WO-2044",  qty:350,  pending:130, inspector:"Arjun S.",  due:"Tomorrow", prio:"low"  },
];

const INSP_CFG = {
  "Incoming":   { c:"#0ea5e9", bg:"#e0f2fe", icon:"📦" },
  "In-Process": { c:"#f59e0b", bg:"#fef3c7", icon:"⚙️" },
  "Final":      { c:"#10b981", bg:"#d1fae5", icon:"✅" },
};

const PRIO_CFG = {
  crit: { c:"#ef4444", bg:"#fee2e2", lbl:"CRITICAL" },
  high: { c:"#f97316", bg:"#ffedd5", lbl:"HIGH"     },
  med:  { c:"#f59e0b", bg:"#fef3c7", lbl:"MED"      },
  low:  { c:"#10b981", bg:"#d1fae5", lbl:"LOW"       },
};

const PO_ROWS = [
  { po:"PO-7821", vendor:"Tata Steel",        mat:"HR Steel Coil",    qty:"2,000 kg", val:"₹1,84,000", raised:"Feb 10", due:"Feb 19", stage:"In Transit", stagePct:75  },
  { po:"PO-7818", vendor:"Hindustan Petro.",  mat:"Hydraulic Fluid",  qty:"200 L",    val:"₹28,000",   raised:"Feb 12", due:"Feb 20", stage:"Confirmed",  stagePct:50  },
  { po:"PO-7815", vendor:"SAIL",              mat:"MS Plates 5mm",    qty:"500 kg",   val:"₹62,500",   raised:"Feb 14", due:"Feb 22", stage:"Approved",   stagePct:25  },
  { po:"PO-7810", vendor:"Asian Paints Ind.", mat:"Paint (Grey)",     qty:"100 L",    val:"₹18,000",   raised:"Feb 08", due:"Feb 21", stage:"In Transit", stagePct:75  },
  { po:"PO-7807", vendor:"Phoenix Rubber",    mat:"Rubber Seals",     qty:"1,000 pcs",val:"₹22,000",   raised:"Feb 05", due:"Feb 18", stage:"GRN Done",   stagePct:90  },
  { po:"PO-7803", vendor:"Hindalco",          mat:"Aluminum Billets", qty:"300 kg",   val:"₹1,08,000", raised:"Feb 01", due:"Feb 15", stage:"Closed",     stagePct:100 },
];

const PO_STAGE_CFG = {
  "Approved":   { c:"#0ea5e9", bg:"#e0f2fe", pct:25  },
  "Confirmed":  { c:"#1a56db", bg:"#dbeafe", pct:50  },
  "In Transit": { c:"#f59e0b", bg:"#fef3c7", pct:75  },
  "GRN Done":   { c:"#10b981", bg:"#d1fae5", pct:90  },
  "Closed":     { c:"#8b5cf6", bg:"#ede9fe", pct:100 },
};

const DEFECTS = [
  { name:"Surface Scratch",      count:48, pct:40, c:"#ef4444" },
  { name:"Dimensional Variance", count:31, pct:26, c:"#f97316" },
  { name:"Weld Porosity",        count:18, pct:15, c:"#f59e0b" },
  { name:"Paint Adhesion",       count:12, pct:10, c:"#eab308" },
  { name:"Assembly Mismatch",    count:9,  pct:8,  c:"#94a3b8" },
];

const WORK_ORDERS = [
  { id:"WO-2041", name:"Brake Disc ×500",     pct:94, st:"On Track", sc:"up",   bc:"#10b981" },
  { id:"WO-2042", name:"Engine Mount ×200",   pct:76, st:"On Track", sc:"up",   bc:"#10b981" },
  { id:"WO-2043", name:"Gear Housing ×120",   pct:42, st:"DELAYED",  sc:"dn",   bc:"#ef4444" },
  { id:"WO-2044", name:"Control Arm ×350",    pct:63, st:"At Risk",  sc:"warn", bc:"#f59e0b" },
  { id:"WO-2045", name:"Exhaust Flange ×800", pct:18, st:"Started",  sc:"neu",  bc:"#1a56db" },
];

const ALERTS = [
  { type:"crit", icon:"🔴", title:"INJ-01 Machine Breakdown",          desc:"Hydraulic failure · Open 54 min · Maint. team en route",          time:"13:08" },
  { type:"crit", icon:"🔴", title:"Rejection Rate Exceeded — Line 3",  desc:"4.1% rejection rate (limit: 2%) · WO-2043 · 48 units scrapped",   time:"14:02" },
  { type:"crit", icon:"🔴", title:"WO-2043 SLA Breach Risk",           desc:"Due in 2.5 hrs · Only 42% complete · Gear Housing ×120",           time:"13:55" },
  { type:"warn", icon:"🟡", title:"PNT-01 PM Overdue",                 desc:"Scheduled PM was 09:00 · Now 5 hrs overdue",                      time:"09:00" },
  { type:"warn", icon:"🟡", title:"WLD-01 Performance Drop",           desc:"OEE dropped to 54% (avg 84%) · Idle since 13:40",                  time:"13:40" },
  { type:"warn", icon:"🟡", title:"IQC Rejection — HR Steel Coil",     desc:"GRN-4411 · Tata Steel · 250 kg rejected · IQC pending review",    time:"11:20" },
];

const IQC_ROWS = [
  { grn:"GRN-4411", mat:"HR Steel Coil",  vendor:"Tata Steel",     qty:"250 kg",  st:"Rejected" },
  { grn:"GRN-4409", mat:"Rubber Seals",   vendor:"Phoenix Rubber", qty:"200 pcs", st:"Rejected" },
  { grn:"GRN-4407", mat:"Al Billets",     vendor:"Hindalco",       qty:"50 kg",   st:"On Hold"  },
];

const REJECTION_DATA = [
  { month:"Sep", macrej:21000, matrej:32000, rework:18000 },
  { month:"Oct", macrej:27000, matrej:34000, rework:22000 },
  { month:"Nov", macrej:18000, matrej:28000, rework:15000 },
  { month:"Dec", macrej:23000, matrej:30000, rework:20000 },
  { month:"Jan", macrej:31000, matrej:38000, rework:24000 },
  { month:"Feb", macrej:23262, matrej:39292, rework:22613 },
];

const TOOLTIP_CFG = {
  backgroundColor:"#ffffff", titleColor:"#0f172a", bodyColor:"#64748b",
  borderColor:"#e4e9f2", borderWidth:1, padding:10,
};

// ════════════════════════════════════════════
//  KPI STATIC FALLBACK DEFINITIONS
// ════════════════════════════════════════════

const KPI_STATIC = [
  {
    key:"production_output", accent:"cyan", icon:"⚙️", valColor:"#0ea5e9", unit:"units",
    name:"Production Output", foot1:"Target: 4,500",
    src:"ProductionEntry.okqty + ConvProductionEntry",
    val:"—", badge:"Loading…", badgeV:"neu", foot2:"", foot2Color:undefined,
  },
  {
    key:"final_inspection_okqty", accent:"green", icon:"✅", valColor:"#10b981", unit:"units",
    name:"Final Inspection OK Qty", foot1:"Target: 98% FPY",
    src:"FinalInspectionEntry.okqty (deleted=0)",
    val:"—", badge:"Loading…", badgeV:"neu", foot2:"", foot2Color:undefined,
  },
  {
    key:"rejection_rate", accent:"red", icon:"⚠️", valColor:"#ef4444", unit:"Qty",
    name:"Rejection Qty", foot1:"Limit: 2.0%",
    src:"InterInspectionEntry.rejqty+matrejqty + FinalInspRejectionEntryOrg.qty + InJob_Det.matrej+macrej",
    val:"28", badge:"▲ 0.4%", badgeV:"dn", foot2:"EXCEEDED", foot2Color:"#ef4444",
  },
  {
    key:"unplanned_downtime", accent:"amber", icon:"🔧", valColor:"#f59e0b", unit:"hrs",
    name:"Unplanned Downtime", foot1:"Target: <1.5 hr",
    src:"DowntimeMast (unplanned)",
    val:"2.4", badge:"4 events", badgeV:"warn", foot2:"OVER", foot2Color:"#ef4444",
  },
  {
    key:"oa_efficiency", accent:"blue", icon:"📈", valColor:"#1a56db", unit:"%",
    name:"OEE Efficiency", foot1:"Target: 80%",
    src:"AVG(OAEFF): ProductionEntry + ConvProductionEntry + ConvProductionEntryRod",
    val:"72.0", badge:"72.0%", badgeV:"neu", foot2:"Below target", foot2Color:"#f59e0b",
  },
  {
    key:"on_time_delivery", accent:"purple", icon:"🚚", valColor:"#8b5cf6", unit:"%",
    name:"On-Time Delivery", foot1:"Target: 95%",
    src:"SalesMast vs DispatchMast",
    val:"87", badge:"13 delayed", badgeV:"warn", foot2:"Below target", foot2Color:"#f59e0b",
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
  const scfg  = STATUS_CFG[m.status];
  const oeeColor = m.oee >= 80 ? "#10b981" : m.oee >= 65 ? "#f59e0b" : m.oee > 0 ? "#ef4444" : "#94a3b8";
  const circ  = 138.2;
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
        <svg viewBox="0 0 50 50" width="68" height="68" style={{ transform:"rotate(-90deg)" }}>
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
          { label:"A", name:"Availability", val:m.availability, c:"#1a56db" },
          { label:"P", name:"Performance",  val:m.performance,  c:"#0ea5e9" },
          { label:"Q", name:"Quality",      val:m.quality,      c:"#10b981" },
        ].map(r => (
          <div key={r.label} className="d2-oeec__row">
            <div className="d2-oeec__row-label">
              <span className="d2-oeec__apq-letter" style={{ color: r.c }}>{r.label}</span>
              <span className="d2-oeec__apq-name">{r.name}</span>
            </div>
            <div className="d2-oeec__bar-wrap">
              <div className="d2-oeec__bar-track">
                <div className="d2-oeec__bar-fill" style={{ width:`${r.val}%`, background: r.c }} />
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
//  IDLE HOURS SECTION
// ════════════════════════════════════════════
function IdleHoursSection({ accepted = [], nonAccepted = [], loading = false, error = null }) {
  const accTotal = accepted.reduce((s, r) => s + (Number(r.hours) || 0), 0);
  const naTotal  = nonAccepted.reduce((s, r) => s + (Number(r.hours) || 0), 0);
  const grand    = accTotal + naTotal;
  const naPct    = grand > 0 ? ((naTotal / grand) * 100).toFixed(0) : "0";
  const sevColor = { crit:"#ef4444", warn:"#f59e0b", info:"#0ea5e9" };

  const accEmpty = !loading && !error && accepted.length === 0;
  const naEmpty  = !loading && !error && nonAccepted.length === 0;

  return (
    <div className="d2-idle-grid">
      <Card className="d2-idle-card d2-idle-card--acc">
        <div className="d2-idle-hd">
          <div>
            <div className="d2-idle-hd-title">
              <span className="d2-idle-dot d2-idle-dot--acc" />
              Idle Hours — Accepted Reasons
            </div>
            <div className="d2-card__sub">IdleReasons.IsAccept = true · Machine_IdleEntryDet</div>
          </div>
          <div className="d2-idle-total d2-idle-total--acc">
            <span className="d2-idle-total-num">{accTotal.toFixed(1)}</span>
            <span className="d2-idle-total-unit">hrs</span>
          </div>
        </div>
        <div className="d2-idle-rows">
          {loading && (
            <div className="d2-card__sub" style={{ padding:"8px 0" }}>Loading idle data…</div>
          )}
          {error && (
            <div className="d2-card__sub" style={{ padding:"8px 0", color:"#ef4444" }}>{error}</div>
          )}
          {accEmpty && (
            <div className="d2-card__sub" style={{ padding:"8px 0" }}>No accepted idle rows in this range.</div>
          )}
          {!loading && accepted.map((r, i) => (
            <div key={`${r.reason}-${i}`} className="d2-idle-row">
              <div className="d2-idle-row-info">
                <span className="d2-idle-reason">{r.reason}</span>
                <span className="d2-idle-mach">{r.machine}</span>
              </div>
              <div className="d2-idle-bar-wrap">
                <div className="d2-idle-bar-track">
                  <div className="d2-idle-bar-fill d2-idle-bar-fill--acc" style={{ width:`${r.pct}%` }} />
                </div>
                <span className="d2-idle-hrs">{Number(r.hours).toFixed(1)} h</span>
              </div>
            </div>
          ))}
        </div>
        <div className="d2-idle-tag d2-idle-tag--acc">✓ Approved Downtime</div>
      </Card>

      <Card className="d2-idle-card d2-idle-card--na">
        <div className="d2-idle-hd">
          <div>
            <div className="d2-idle-hd-title">
              <span className="d2-idle-dot d2-idle-dot--na" />
              Idle Hours — Non-Accepted Reasons
            </div>
            <div className="d2-card__sub">IdleReasons.IsAccept = false · unmatched reasons</div>
          </div>
          <div className="d2-idle-total d2-idle-total--na">
            <span className="d2-idle-total-num">{naTotal.toFixed(1)}</span>
            <span className="d2-idle-total-unit">hrs</span>
          </div>
        </div>
        <div className="d2-idle-rows">
          {naEmpty && (
            <div className="d2-card__sub" style={{ padding:"8px 0" }}>No non-accepted idle rows in this range.</div>
          )}
          {!loading && nonAccepted.map((r, i) => (
            <div key={`${r.reason}-${i}`} className="d2-idle-row">
              <div className="d2-idle-row-info">
                <span className="d2-idle-reason">{r.reason}</span>
                <span className="d2-idle-mach" style={{ color: sevColor[r.sev] || sevColor.warn }}>{r.machine}</span>
              </div>
              <div className="d2-idle-bar-wrap">
                <div className="d2-idle-bar-track">
                  <div className="d2-idle-bar-fill d2-idle-bar-fill--na" style={{ width:`${r.pct}%`, background: sevColor[r.sev] || sevColor.warn }} />
                </div>
                <span className="d2-idle-hrs" style={{ color: sevColor[r.sev] || sevColor.warn }}>{Number(r.hours).toFixed(1)} h</span>
              </div>
            </div>
          ))}
        </div>
        <div className="d2-idle-tag d2-idle-tag--na">⚠ Actionable Losses</div>
      </Card>

      <Card className="d2-idle-summary">
        <div className="d2-idle-sum-title">Idle Time Breakdown</div>
        <div className="d2-idle-sum-stat">
          <div className="d2-idle-sum-val" style={{color:"#10b981"}}>{accTotal.toFixed(1)}h</div>
          <div className="d2-idle-sum-lbl">Accepted</div>
        </div>
        <div className="d2-idle-sum-divider" />
        <div className="d2-idle-sum-stat">
          <div className="d2-idle-sum-val" style={{color:"#ef4444"}}>{naTotal.toFixed(1)}h</div>
          <div className="d2-idle-sum-lbl">Non-Accepted</div>
        </div>
        <div className="d2-idle-sum-divider" />
        <div className="d2-idle-sum-stat">
          <div className="d2-idle-sum-val" style={{color:"#1a56db"}}>{grand.toFixed(1)}h</div>
          <div className="d2-idle-sum-lbl">Total Idle</div>
        </div>
        <div className="d2-idle-loss-pct">
          <div className="d2-idle-loss-bar">
            <div style={{width:`${grand > 0 ? naPct : 0}%`, background:"#ef4444", height:"100%", borderRadius:"4px"}} />
          </div>
          <div className="d2-idle-loss-note">
            {grand > 0 ? `${naPct}% is avoidable loss` : "No idle hours in range"}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════
//  JOB ORDER INSPECTION — Rejection & Rework
//  Source: InJob_Det · ReworkEntry · per Work Order
// ════════════════════════════════════════════
function JobOrderInspSection() {
  const totalRej    = JO_REJ_DATA.reduce((s, r) => s + r.rejected, 0);
  const totalRwk    = JO_REJ_DATA.reduce((s, r) => s + r.rework, 0);
  const totalProd   = JO_REJ_DATA.reduce((s, r) => s + r.total, 0);
  const overallRejPct = totalProd > 0 ? ((totalRej / totalProd) * 100).toFixed(1) : "0";

  return (
    <div className="d2-ri-wrapper">
      {/* Summary strip */}
      <div className="d2-ri-strip d2-ri-strip--jo">
        <div className="d2-ri-strip__left">
          <div className="d2-ri-strip__icon-wrap d2-ri-strip__icon-wrap--jo">📋</div>
          <div>
            <div className="d2-ri-strip__title">Job Order Inspection</div>
            <div className="d2-ri-strip__sub">InJob_Det · ReworkEntry · per Work Order</div>
          </div>
        </div>
        <div className="d2-ri-strip__pills">
          <div className="d2-ri-pill d2-ri-pill--blue">
            <span className="d2-ri-pill__val">{totalProd.toLocaleString()}</span>
            <span className="d2-ri-pill__lbl">Total Produced</span>
          </div>
          <div className="d2-ri-pill d2-ri-pill--red">
            <span className="d2-ri-pill__val">{totalRej}</span>
            <span className="d2-ri-pill__lbl">Total Rejected</span>
          </div>
          <div className="d2-ri-pill d2-ri-pill--amber">
            <span className="d2-ri-pill__val">{totalRwk}</span>
            <span className="d2-ri-pill__lbl">Total Rework</span>
          </div>
          <div className="d2-ri-pill d2-ri-pill--dark">
            <span className="d2-ri-pill__val">{overallRejPct}%</span>
            <span className="d2-ri-pill__lbl">Overall Rej %</span>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="d2-ri-cards">
        {JO_REJ_DATA.map(r => {
          const rejOk    = r.rejPct <= r.target;
          const rejColor = r.rejPct <= r.target ? "#1a56db"
                         : r.rejPct <= r.target * 2.5 ? "#f59e0b"
                         : "#ef4444";
          const rwkColor = r.reworkPct <= 1.5 ? "#0ea5e9"
                         : r.reworkPct <= 3   ? "#f59e0b"
                         : "#ef4444";
          const barW = Math.min((r.rejPct / 20) * 100, 100);
          const tgtW = Math.min((r.target / 20) * 100, 100);
          return (
            <div key={r.wo} className="d2-ric d2-ric--jo">
              <div className="d2-ric__topbar" style={{ background: rejColor }} />
              <div className="d2-ric__head">
                <div className="d2-ric__id" style={{ color: rejColor }}>{r.wo}</div>
                <span className="d2-ric__status-badge" style={{
                  background: rejOk ? "#dbeafe" : r.rejPct <= r.target * 2.5 ? "#fef3c7" : "#fee2e2",
                  color: rejColor,
                }}>
                  {rejOk ? "✓ WITHIN" : "✗ EXCEEDED"}
                </span>
              </div>
              <div className="d2-ric__part">{r.part}</div>
              <div className="d2-ric__total">{r.total.toLocaleString()} <span>pcs</span></div>

              <div className="d2-ric__metrics">
                <div className="d2-ric__metric">
                  <div className="d2-ric__metric-val" style={{ color: rejColor }}>{r.rejPct}<span>%</span></div>
                  <div className="d2-ric__metric-lbl">Rejection</div>
                  <div className="d2-ric__metric-abs">{r.rejected} pcs</div>
                </div>
                <div className="d2-ric__vdiv" />
                <div className="d2-ric__metric">
                  <div className="d2-ric__metric-val" style={{ color: rwkColor }}>{r.reworkPct}<span>%</span></div>
                  <div className="d2-ric__metric-lbl">Rework</div>
                  <div className="d2-ric__metric-abs">{r.rework} pcs</div>
                </div>
              </div>

              <div className="d2-ric__bar-section">
                <div className="d2-ric__bar-label">
                  <span>vs Target ({r.target}%)</span>
                  <span style={{ color: rejColor }}>{rejOk ? "✓" : "✗"}</span>
                </div>
                <div className="d2-ric__bar-track">
                  <div className="d2-ric__bar-fill" style={{ width:`${barW}%`, background: rejColor }} />
                  <div className="d2-ric__tgt-line" style={{ left:`${tgtW}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  INTERMEDIATE INSPECTION — Rejection & Rework
//  Source: InterInspectionEntry · InProcessInspection · per Stage/Operation
// ════════════════════════════════════════════
function IntermediateInspSection() {
  const totalRej     = INTER_INSP_DATA.reduce((s, r) => s + r.rejected, 0);
  const totalRwk     = INTER_INSP_DATA.reduce((s, r) => s + r.rework, 0);
  const totalInsp    = INTER_INSP_DATA.reduce((s, r) => s + r.inspected, 0);
  const overallRejPct = totalInsp > 0 ? ((totalRej / totalInsp) * 100).toFixed(1) : "0";

  const STAGE_COLOR = {
    Turning:  { c:"#6366f1", bg:"#eef2ff" },
    Milling:  { c:"#8b5cf6", bg:"#ede9fe" },
    Drilling: { c:"#a855f7", bg:"#faf5ff" },
    Welding:  { c:"#d946ef", bg:"#fdf4ff" },
    Assembly: { c:"#ec4899", bg:"#fdf2f8" },
  };

  return (
    <div className="d2-ri-wrapper">
      {/* Summary strip */}
      <div className="d2-ri-strip d2-ri-strip--inter">
        <div className="d2-ri-strip__left">
          <div className="d2-ri-strip__icon-wrap d2-ri-strip__icon-wrap--inter">⚙️</div>
          <div>
            <div className="d2-ri-strip__title">Intermediate Inspection</div>
            <div className="d2-ri-strip__sub">InterInspectionEntry · InProcessInspection · per Stage / Operation</div>
          </div>
        </div>
        <div className="d2-ri-strip__pills">
          <div className="d2-ri-pill d2-ri-pill--purple">
            <span className="d2-ri-pill__val">{totalInsp.toLocaleString()}</span>
            <span className="d2-ri-pill__lbl">Total Inspected</span>
          </div>
          <div className="d2-ri-pill d2-ri-pill--red">
            <span className="d2-ri-pill__val">{totalRej}</span>
            <span className="d2-ri-pill__lbl">Total Rejected</span>
          </div>
          <div className="d2-ri-pill d2-ri-pill--amber">
            <span className="d2-ri-pill__val">{totalRwk}</span>
            <span className="d2-ri-pill__lbl">Total Rework</span>
          </div>
          <div className="d2-ri-pill d2-ri-pill--dark">
            <span className="d2-ri-pill__val">{overallRejPct}%</span>
            <span className="d2-ri-pill__lbl">Overall Rej %</span>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="d2-ri-cards">
        {INTER_INSP_DATA.map(r => {
          const rejColor = r.rejPct <= 2   ? "#8b5cf6"
                         : r.rejPct <= 5   ? "#f59e0b"
                         : "#ef4444";
          const rwkColor = r.reworkPct <= 2 ? "#a855f7"
                         : r.reworkPct <= 4 ? "#f59e0b"
                         : "#ef4444";
          const scfg = STAGE_COLOR[r.stage] || { c:"#8b5cf6", bg:"#ede9fe" };
          const barW = Math.min((r.rejPct / 20) * 100, 100);
          const rejOk = r.rejPct <= 2;
          return (
            <div key={r.op} className="d2-ric d2-ric--inter">
              <div className="d2-ric__topbar" style={{ background: `linear-gradient(90deg, ${scfg.c}, ${rejColor})` }} />
              <div className="d2-ric__head">
                <div className="d2-ric__id" style={{ color: scfg.c }}>{r.stage}</div>
                <span className="d2-ric__op-badge" style={{ background: scfg.bg, color: scfg.c }}>
                  {r.op}
                </span>
              </div>
              <div className="d2-ric__part">{r.part}</div>
              <div className="d2-ric__total">{r.inspected.toLocaleString()} <span>inspected</span></div>

              <div className="d2-ric__metrics">
                <div className="d2-ric__metric">
                  <div className="d2-ric__metric-val" style={{ color: rejColor }}>{r.rejPct}<span>%</span></div>
                  <div className="d2-ric__metric-lbl">Rejection</div>
                  <div className="d2-ric__metric-abs">{r.rejected} pcs</div>
                </div>
                <div className="d2-ric__vdiv" />
                <div className="d2-ric__metric">
                  <div className="d2-ric__metric-val" style={{ color: rwkColor }}>{r.reworkPct}<span>%</span></div>
                  <div className="d2-ric__metric-lbl">Rework</div>
                  <div className="d2-ric__metric-abs">{r.rework} pcs</div>
                </div>
              </div>

              <div className="d2-ric__bar-section">
                <div className="d2-ric__bar-label">
                  <span>Rej. severity</span>
                  <span style={{ color: rejColor }}>{rejOk ? "LOW" : r.rejPct <= 5 ? "MED" : "HIGH"}</span>
                </div>
                <div className="d2-ric__bar-track">
                  <div className="d2-ric__bar-fill" style={{ width:`${barW}%`, background:`linear-gradient(90deg,${scfg.c},${rejColor})` }} />
                  <div className="d2-ric__tgt-line" style={{ left:"10%" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  FINAL INSPECTION — Rejection, Rework & FPY
//  Source: FinalInspectionEntry · FinalInspRejectionEntryOrg
// ════════════════════════════════════════════
function FinalInspRejSection() {
  const totalInsp  = FINAL_INSP_DATA.reduce((s, r) => s + r.inspected, 0);
  const totalOk    = FINAL_INSP_DATA.reduce((s, r) => s + r.okQty, 0);
  const totalRej   = FINAL_INSP_DATA.reduce((s, r) => s + r.rejected, 0);
  const totalRwk   = FINAL_INSP_DATA.reduce((s, r) => s + r.rework, 0);
  const overallFPY = totalInsp > 0 ? ((totalOk / totalInsp) * 100).toFixed(1) : "0";

  const circ = 113.1; // 2π × 18

  return (
    <div className="d2-ri-wrapper">
      {/* Summary strip */}
      <div className="d2-ri-strip d2-ri-strip--final">
        <div className="d2-ri-strip__left">
          <div className="d2-ri-strip__icon-wrap d2-ri-strip__icon-wrap--final">✅</div>
          <div>
            <div className="d2-ri-strip__title">Final Inspection</div>
            <div className="d2-ri-strip__sub">FinalInspectionEntry · FinalInspRejectionEntryOrg · per Work Order</div>
          </div>
        </div>
        <div className="d2-ri-strip__pills">
          <div className="d2-ri-pill d2-ri-pill--green">
            <span className="d2-ri-pill__val">{totalOk.toLocaleString()}</span>
            <span className="d2-ri-pill__lbl">Total OK Qty</span>
          </div>
          <div className="d2-ri-pill d2-ri-pill--red">
            <span className="d2-ri-pill__val">{totalRej}</span>
            <span className="d2-ri-pill__lbl">Total Rejected</span>
          </div>
          <div className="d2-ri-pill d2-ri-pill--amber">
            <span className="d2-ri-pill__val">{totalRwk}</span>
            <span className="d2-ri-pill__lbl">Total Rework</span>
          </div>
          <div className="d2-ri-pill d2-ri-pill--teal">
            <span className="d2-ri-pill__val">{overallFPY}%</span>
            <span className="d2-ri-pill__lbl">Overall FPY</span>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="d2-ri-cards">
        {FINAL_INSP_DATA.map(r => {
          const fpyOk    = r.fpy >= r.target;
          const fpyColor = r.fpy >= r.target    ? "#10b981"
                         : r.fpy >= r.target - 3 ? "#f59e0b"
                         : "#ef4444";
          const rejColor = r.rejected === 0 ? "#10b981"
                         : r.rejected <= 5  ? "#f59e0b"
                         : "#ef4444";
          const rwkColor = r.rework === 0  ? "#10b981"
                         : r.rework  <= 3  ? "#f59e0b"
                         : "#ef4444";
          const offset = circ - (r.fpy / 100) * circ;

          return (
            <div key={r.wo} className="d2-ric d2-ric--final">
              <div className="d2-ric__topbar" style={{ background: fpyColor }} />
              <div className="d2-ric__head">
                <div className="d2-ric__id" style={{ color: fpyColor }}>{r.wo}</div>
                <span className="d2-ric__status-badge" style={{
                  background: fpyOk ? "#d1fae5" : r.fpy >= r.target - 3 ? "#fef3c7" : "#fee2e2",
                  color: fpyColor,
                }}>
                  {fpyOk ? "✓ FPY OK" : "↓ FPY LOW"}
                </span>
              </div>
              <div className="d2-ric__part">{r.part}</div>

              {/* FPY ring */}
              <div className="d2-ric__fpy-ring-wrap">
                <svg viewBox="0 0 44 44" width="72" height="72" style={{ transform:"rotate(-90deg)" }}>
                  <circle cx="22" cy="22" r="18" fill="none" stroke="#e4e9f2" strokeWidth="4" />
                  <circle cx="22" cy="22" r="18" fill="none"
                    stroke={fpyColor} strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${circ}`} strokeDashoffset={offset}
                    style={{ transition:"stroke-dashoffset 1.2s ease" }}
                  />
                </svg>
                <div className="d2-ric__fpy-center">
                  <span className="d2-ric__fpy-num" style={{ color: fpyColor }}>{r.fpy}</span>
                  <span className="d2-ric__fpy-pct">%</span>
                  <span className="d2-ric__fpy-lbl">FPY</span>
                </div>
              </div>

              <div className="d2-ric__final-row">
                <div className="d2-ric__final-stat">
                  <div style={{ color:"#10b981", fontFamily:"'Outfit',sans-serif", fontSize:17, fontWeight:800 }}>{r.okQty}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:"#64748b" }}>OK QTY</div>
                </div>
                <div className="d2-ric__vdiv" />
                <div className="d2-ric__final-stat">
                  <div style={{ color: rejColor, fontFamily:"'Outfit',sans-serif", fontSize:17, fontWeight:800 }}>{r.rejected}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:"#64748b" }}>REJECTED</div>
                </div>
                <div className="d2-ric__vdiv" />
                <div className="d2-ric__final-stat">
                  <div style={{ color: rwkColor, fontFamily:"'Outfit',sans-serif", fontSize:17, fontWeight:800 }}>{r.rework}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:"#64748b" }}>REWORK</div>
                </div>
              </div>

              <div className="d2-ric__bar-section">
                <div className="d2-ric__bar-label">
                  <span>FPY vs Target ({r.target}%)</span>
                  <span style={{ color: fpyColor }}>{r.fpy}%</span>
                </div>
                <div className="d2-ric__bar-track">
                  <div className="d2-ric__bar-fill" style={{ width:`${r.fpy}%`, background: fpyColor }} />
                  <div className="d2-ric__tgt-line" style={{ left:`${r.target}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  CUSTOMER COMPLAINTS
// ════════════════════════════════════════════
function CustomerComplaints() {
  const open   = COMPLAINTS.filter(c => c.status === "Open").length;
  const inProg = COMPLAINTS.filter(c => c.status === "In Progress").length;
  const closed = COMPLAINTS.filter(c => c.status === "Closed").length;
  const highSev= COMPLAINTS.filter(c => c.sev === "high").length;
  const avgAge = (COMPLAINTS.reduce((s, c) => s + c.age, 0) / COMPLAINTS.length).toFixed(0);

  return (
    <Card>
      <div className="d2-card__hd">
        <div>
          <div className="d2-card__title">📣 Customer Complaints</div>
          <div className="d2-card__sub">FROM: CustomerComplaintMast · NCR entries · CAPA status</div>
        </div>
        <button className="d2-card__btn">View All → </button>
      </div>
      <div className="d2-cc-strip">
        <div className="d2-cc-stat d2-cc-stat--open"><div className="d2-cc-stat-val">{open}</div><div className="d2-cc-stat-lbl">Open</div></div>
        <div className="d2-cc-stat d2-cc-stat--prog"><div className="d2-cc-stat-val">{inProg}</div><div className="d2-cc-stat-lbl">In Progress</div></div>
        <div className="d2-cc-stat d2-cc-stat--closed"><div className="d2-cc-stat-val">{closed}</div><div className="d2-cc-stat-lbl">Closed</div></div>
        <div className="d2-cc-sep" />
        <div className="d2-cc-stat d2-cc-stat--high"><div className="d2-cc-stat-val">{highSev}</div><div className="d2-cc-stat-lbl">High Severity</div></div>
        <div className="d2-cc-stat d2-cc-stat--age"><div className="d2-cc-stat-val">{avgAge}d</div><div className="d2-cc-stat-lbl">Avg Age</div></div>
      </div>
      <table className="d2-mini-tbl">
        <thead>
          <tr><th>Complaint ID</th><th>Customer</th><th>Product</th><th>Defect Type</th><th>Date</th><th>Severity</th><th>Age</th><th>Status</th></tr>
        </thead>
        <tbody>
          {COMPLAINTS.map(c => {
            const scfg = SEV_CFG[c.sev];
            const stcfg = CC_STATUS_CFG[c.status];
            return (
              <tr key={c.id}>
                <td className="d2-mono d2-acc-blue">{c.id}</td>
                <td style={{ fontWeight:600 }}>{c.customer}</td>
                <td>{c.product}</td>
                <td style={{ color:"#64748b" }}>{c.type}</td>
                <td className="d2-mono">{c.date}</td>
                <td><span className="d2-badge" style={{ background: scfg.bg, color: scfg.c }}>{scfg.lbl}</span></td>
                <td><span className={`d2-mono ${c.age >= 14 ? "d2-acc-red" : c.age >= 7 ? "d2-acc-amber" : ""}`}>{c.age}d</span></td>
                <td><span className="d2-badge" style={{ background: stcfg.bg, color: stcfg.c }}>{c.status}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

// ════════════════════════════════════════════
//  INSPECTION PENDING
// ════════════════════════════════════════════
function InspectionPending() {
  const counts = { Incoming:0, "In-Process":0, Final:0 };
  INSP_PENDING.forEach(r => counts[r.stage]++);
  const totalPending = INSP_PENDING.reduce((s, r) => s + r.pending, 0);

  return (
    <Card>
      <div className="d2-card__hd">
        <div>
          <div className="d2-card__title">🔍 Inspection Pending Report</div>
          <div className="d2-card__sub">FROM: IQCEntry · InProcessInspection · FinalInspectionEntry (status = pending)</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span className="d2-insp-pending-pill">{INSP_PENDING.length} pending</span>
          <button className="d2-card__btn">Full Report →</button>
        </div>
      </div>
      <div className="d2-insp-summary">
        {Object.entries(INSP_CFG).map(([stage, cfg]) => (
          <div key={stage} className="d2-insp-sum-card" style={{ background: cfg.bg, borderColor: `${cfg.c}33` }}>
            <span className="d2-insp-sum-icon">{cfg.icon}</span>
            <div className="d2-insp-sum-val" style={{ color: cfg.c }}>{counts[stage]}</div>
            <div className="d2-insp-sum-lbl" style={{ color: cfg.c }}>{stage}</div>
          </div>
        ))}
        <div className="d2-insp-sum-card d2-insp-sum-card--total">
          <span className="d2-insp-sum-icon">📋</span>
          <div className="d2-insp-sum-val" style={{ color:"#1a56db" }}>{totalPending}</div>
          <div className="d2-insp-sum-lbl" style={{ color:"#1a56db" }}>Total Units</div>
        </div>
      </div>
      <table className="d2-mini-tbl">
        <thead>
          <tr><th>Ref. No.</th><th>Stage</th><th>Part / Material</th><th>WO / GRN</th><th>Qty</th><th>Pending</th><th>Inspector</th><th>Due By</th><th>Priority</th></tr>
        </thead>
        <tbody>
          {INSP_PENDING.map(r => {
            const icfg  = INSP_CFG[r.stage];
            const pcfg  = PRIO_CFG[r.prio];
            const donePct = Math.round(((r.qty - r.pending) / r.qty) * 100);
            return (
              <tr key={r.id}>
                <td className="d2-mono d2-acc-blue">{r.id}</td>
                <td><span className="d2-badge" style={{ background: icfg.bg, color: icfg.c }}>{icfg.icon} {r.stage}</span></td>
                <td style={{ fontWeight:600 }}>{r.part}</td>
                <td className="d2-mono">{r.wo}</td>
                <td className="d2-mono">{r.qty}</td>
                <td>
                  <div className="d2-insp-prog">
                    <div className="d2-insp-prog-bar">
                      <div style={{ width:`${donePct}%`, background: icfg.c, height:"100%", borderRadius:2 }} />
                    </div>
                    <span className="d2-mono d2-acc-red">{r.pending}</span>
                  </div>
                </td>
                <td style={{ color:"#64748b" }}>{r.inspector}</td>
                <td><span className={`d2-mono ${r.due === "Today" || r.due.includes(":") ? "d2-acc-red" : ""}`}>{r.due}</span></td>
                <td><span className="d2-badge" style={{ background: pcfg.bg, color: pcfg.c }}>{pcfg.lbl}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

// ════════════════════════════════════════════
//  PURCHASE ORDER STATUS
// ════════════════════════════════════════════
function PurchaseOrderStatus() {
  const stages = ["Approved","Confirmed","In Transit","GRN Done","Closed"];
  const stageCounts = Object.fromEntries(stages.map(s => [s, PO_ROWS.filter(r => r.stage === s).length]));
  const totalVal = "₹4,14,500";

  return (
    <Card>
      <div className="d2-card__hd">
        <div>
          <div className="d2-card__title">🛒 Purchase Order Status</div>
          <div className="d2-card__sub">FROM: POMas JOIN GRNMast · {PO_ROWS.length} active POs · Total Value: {totalVal}</div>
        </div>
        <button className="d2-card__btn">All POs →</button>
      </div>
      <div className="d2-po-pipeline">
        {stages.map((s, i) => {
          const cfg = PO_STAGE_CFG[s];
          return (
            <div key={s} className="d2-po-stage">
              <div className="d2-po-stage-box" style={{ background: cfg.bg, borderColor:`${cfg.c}44` }}>
                <div className="d2-po-stage-count" style={{ color: cfg.c }}>{stageCounts[s] || 0}</div>
                <div className="d2-po-stage-lbl" style={{ color: cfg.c }}>{s}</div>
              </div>
              {i < stages.length - 1 && <div className="d2-po-arrow">→</div>}
            </div>
          );
        })}
      </div>
      <table className="d2-mini-tbl">
        <thead>
          <tr><th>PO Number</th><th>Vendor</th><th>Material</th><th>Qty</th><th>Value</th><th>Date Raised</th><th>Due Date</th><th>Stage</th><th>Progress</th></tr>
        </thead>
        <tbody>
          {PO_ROWS.map(r => {
            const cfg = PO_STAGE_CFG[r.stage] || { c:"#94a3b8", bg:"#f1f5f9" };
            return (
              <tr key={r.po}>
                <td className="d2-mono d2-acc-blue">{r.po}</td>
                <td style={{ fontWeight:600 }}>{r.vendor}</td>
                <td>{r.mat}</td>
                <td className="d2-mono">{r.qty}</td>
                <td className="d2-mono" style={{ color:"#1a56db", fontWeight:600 }}>{r.val}</td>
                <td className="d2-mono">{r.raised}</td>
                <td className="d2-mono">{r.due}</td>
                <td><span className="d2-badge" style={{ background: cfg.bg, color: cfg.c }}>{r.stage}</span></td>
                <td>
                  <div className="d2-po-prog">
                    <div className="d2-po-prog-track">
                      <div style={{ width:`${r.stagePct}%`, background: cfg.c, height:"100%", borderRadius:2 }} />
                    </div>
                    <span className="d2-po-prog-pct" style={{ color: cfg.c }}>{r.stagePct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

// ════════════════════════════════════════════
//  CHART CANVAS WRAPPER
// ════════════════════════════════════════════
function ChartCanvas({ setup, height = 160 }) {
  const ref      = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    chartRef.current = setup(ref.current);
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <canvas ref={ref} height={height} />;
}

// ════════════════════════════════════════════
//  KPI STRIP
// ════════════════════════════════════════════
function KpiStrip({ liveKpis, kpiLoading, kpiError }) {
  const cards = KPI_STATIC.map(k => {
    if (!liveKpis) return k;

    if (k.key === "final_inspection_okqty" && liveKpis.finalInspection) {
      const d   = liveKpis.finalInspection;
      const fpy = d.first_pass_yield ?? 0;
      const fpyOk = fpy >= 98;
      return {
        ...k,
        val:        d.total_ok_qty?.toLocaleString() ?? "—",
        badge:      `FPY ${fpy}%`,
        badgeV:     fpyOk ? "up" : "dn",
        foot2:      fpyOk ? `FPY ${fpy}% ✓` : `FPY ${fpy}% ↓`,
        foot2Color: fpyOk ? "#10b981" : "#ef4444",
      };
    }

    if (k.key === "production_output" && liveKpis.production) {
      const val = liveKpis.production.kpis?.production_output ?? 0;
      const tgt = 4500;
      const pct = tgt > 0 ? ((val / tgt) * 100).toFixed(1) : "—";
      return {
        ...k,
        val:        val.toLocaleString(),
        badge:      `${pct}% of target`,
        badgeV:     val >= tgt ? "up" : val >= tgt * 0.9 ? "warn" : "dn",
        foot2:      val >= tgt ? "Target met ✓" : `${(tgt - val).toLocaleString()} to go`,
        foot2Color: val >= tgt ? "#10b981" : "#f59e0b",
      };
    }

    if (k.key === "rejection_rate" && liveKpis.production) {
      const val = liveKpis.production.kpis?.rejection_qty ?? 0;
      const limit = 0;
      return {
        ...k,
        val:        val.toLocaleString(),
        badge:      val > limit ? "Active rejections" : "No rejection",
        badgeV:     val > limit ? "dn" : "up",
        foot2:      val > limit ? "Needs action" : "Within control",
        foot2Color: val > limit ? "#ef4444" : "#10b981",
      };
    }

    if (k.key === "oa_efficiency" && liveKpis.production) {
      const val = liveKpis.production.kpis?.oa_efficiency ?? 0;
      const tgt = 80;
      return {
        ...k,
        val:        val.toFixed(1),
        badge:      `${val.toFixed(1)}%`,
        badgeV:     val >= tgt ? "up" : val >= tgt * 0.9 ? "warn" : "dn",
        foot2:      val >= tgt ? "At or above target" : "Below target",
        foot2Color: val >= tgt ? "#10b981" : "#f59e0b",
      };
    }

    return k;
  });

  return (
    <div className="d2-kpi-strip">
      {cards.map((k) => (
        <div key={k.key} className={`d2-kpi d2-kpi--${k.accent} ${kpiLoading ? "d2-kpi--loading" : ""}`}>
          <div className="d2-kpi__top">
            <span className="d2-kpi__ico">{k.icon}</span>
            {kpiLoading && (k.key === "final_inspection_okqty" || k.key === "production_output" || k.key === "rejection_rate" || k.key === "oa_efficiency") ? (
              <span className="d2-kpi__badge d2-kpi__badge--neu d2-kpi__badge--shimmer">…</span>
            ) : (
              <span className={`d2-kpi__badge d2-kpi__badge--${k.badgeV}`}>{k.badge}</span>
            )}
          </div>
          {kpiLoading && (k.key === "final_inspection_okqty" || k.key === "production_output" || k.key === "rejection_rate" || k.key === "oa_efficiency") ? (
            <div className="d2-kpi__val d2-kpi__val--shimmer" style={{ color: k.valColor }}>
              <span className="d2-shimmer-block" style={{ width: 80, height: 32, borderRadius: 6 }} />
            </div>
          ) : kpiError && (k.key === "final_inspection_okqty" || k.key === "production_output" || k.key === "rejection_rate" || k.key === "oa_efficiency") ? (
            <div className="d2-kpi__val" style={{ color:"#ef4444", fontSize: 13 }}>⚠ Error</div>
          ) : (
            <div className="d2-kpi__val" style={{ color: k.valColor }}>
              {k.val}<span className="d2-kpi__unit">{k.unit}</span>
            </div>
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
//  HELPER — build URL with date params
// ════════════════════════════════════════════
function buildUrl(base, from, to) {
  if (!from || !to) return base;
  const fmt = (d) => d.toISOString().split("T")[0];
  return `${base}?from=${fmt(from)}&to=${fmt(to)}`;
}

// ════════════════════════════════════════════
//  TAB SECTIONS
// ════════════════════════════════════════════

// ── Overview ─────────────────────────────────
function OverviewTab({ setupProdChart, setupQualDonut, setupDowntimeChart, setupMatChart, setupOtdChart, setupRejChart, woBadgeCls, stBadgeCls, liveKpis, kpiLoading, kpiError, idleAccepted, idleNonAccepted, idleLoading, idleError }) {
  return (
    <>
      <SectionLabel>Key Performance Indicators — Today (ProductionEntry · FinalInspectionEntry · InJob_Det)</SectionLabel>
      <KpiStrip liveKpis={liveKpis} kpiLoading={kpiLoading} kpiError={kpiError} />
      <SectionLabel>Idle Hours Analysis — Accepted vs Non-Accepted (Machine_IdleEntryMas · Machine_IdleEntryDet · IdleReasons)</SectionLabel>
      <IdleHoursSection accepted={idleAccepted} nonAccepted={idleNonAccepted} loading={idleLoading} error={idleError} />

      <SectionLabel>Job Order Inspection — Rejection & Rework (InJob_Det · ReworkEntry · per Work Order)</SectionLabel>
      <JobOrderInspSection />
      <SectionLabel>Intermediate Inspection — Rejection & Rework (InterInspectionEntry · InProcessInspection · per Stage)</SectionLabel>
      <IntermediateInspSection />
      <SectionLabel>Final Inspection — Rejection, Rework & FPY (FinalInspectionEntry · FinalInspRejectionEntryOrg)</SectionLabel>
      <FinalInspRejSection />

      <SectionLabel>Production Trend · Quality Split · Downtime Analysis</SectionLabel>
      <div className="d2-row3">
        <Card>
          <div className="d2-card__hd">
            <div><div className="d2-card__title">Production vs Target — Last 7 Days</div><div className="d2-card__sub">FROM: ProductionEntry GROUP BY proddate, shift_id · Target from WorkOrderMast</div></div>
            <button className="d2-card__btn">Drill Down ↗</button>
          </div>
          <ChartCanvas setup={setupProdChart} height={160} />
        </Card>
        <Card>
          <div className="d2-card__hd"><div><div className="d2-card__title">Quality Split (Today)</div><div className="d2-card__sub">FROM: FinalInspectionEntry · InJob_Det.macrej · ReworkEntry</div></div></div>
          <ChartCanvas setup={setupQualDonut} height={140} />
          <div className="d2-leg">
            <div className="d2-leg__item"><div className="d2-leg__dot" style={{background:"#10b981"}}/>First Pass 97.2%</div>
            <div className="d2-leg__item"><div className="d2-leg__dot" style={{background:"#f59e0b"}}/>Rework 1.6%</div>
            <div className="d2-leg__item"><div className="d2-leg__dot" style={{background:"#ef4444"}}/>Scrap 1.2%</div>
          </div>
        </Card>
        <Card>
          <div className="d2-card__hd"><div><div className="d2-card__title">Downtime by Reason</div><div className="d2-card__sub">FROM: DowntimeMast JOIN DowntimeReasonMast · This Week</div></div></div>
          <ChartCanvas setup={setupDowntimeChart} height={185} />
        </Card>
      </div>
      <SectionLabel>Quality Details · Work Orders · Material Consumption</SectionLabel>
      <div className="d2-row4">
        <Card>
          <div className="d2-card__hd"><div className="d2-card__title">Top Defect Categories</div><button className="d2-card__btn">View NCRs →</button></div>
          <table className="d2-mini-tbl">
            <thead><tr><th>#</th><th>Defect</th><th>Count</th><th>%</th></tr></thead>
            <tbody>{DEFECTS.map((d,i)=>(<tr key={d.name}><td><span className="d2-rank">{i+1}</span></td><td>{d.name}<div className="d2-d-bar" style={{width:`${d.pct}%`,background:d.c}} /></td><td style={{fontFamily:"'JetBrains Mono',monospace",color:d.c,fontWeight:600}}>{d.count}</td><td style={{fontFamily:"'JetBrains Mono',monospace",color:"#64748b"}}>{d.pct}%</td></tr>))}</tbody>
          </table>
        </Card>
        <Card>
          <div className="d2-card__hd"><div className="d2-card__title">Work Order Progress</div><button className="d2-card__btn">All WOs →</button></div>
          <div className="d2-order-list">
            {WORK_ORDERS.map(o=>(<div key={o.id} className="d2-order-item"><span className="d2-o-id">{o.id}</span><span className="d2-o-name">{o.name}</span><div className="d2-o-prog"><div className="d2-o-pct">{o.pct}%</div><div className="d2-o-bar"><div className="d2-o-fill" style={{width:`${o.pct}%`,background:o.bc}}/></div></div><span className={`d2-badge d2-badge--${woBadgeCls(o.sc)}`}>{o.st}</span></div>))}
          </div>
        </Card>
        <Card>
          <div className="d2-card__hd"><div><div className="d2-card__title">Material Consumption</div><div className="d2-card__sub">FROM: MaterialIssueDet vs BOM standard qty</div></div></div>
          <ChartCanvas setup={setupMatChart} height={200} />
        </Card>
      </div>
      <SectionLabel>Live Exceptions · Dispatch Performance</SectionLabel>
      <div className="d2-row5">
        <Card>
          <div className="d2-card__hd"><div className="d2-card__title">🔔 Live Exceptions</div><span className="d2-crit-count">3 CRITICAL · 3 WARNING</span></div>
          <div>{ALERTS.map((a,i)=>(<div key={i} className={`d2-alert d2-alert--${a.type}`}><div className="d2-al-ico">{a.icon}</div><div className="d2-al-body"><div className="d2-al-title">{a.title}</div><div className="d2-al-desc">{a.desc}</div></div><div className="d2-al-time">{a.time}</div></div>))}</div>
        </Card>
        <Card>
          <div className="d2-card__hd"><div><div className="d2-card__title">On-Time Delivery Trend</div><div className="d2-card__sub">FROM: SalesMast.delivery_date vs DispatchMast.dispatch_date</div></div></div>
          <ChartCanvas setup={setupOtdChart} height={145} />
          <div className="d2-otd-stats">
            <div className="d2-otd-stat"><div className="d2-otd-val" style={{color:"#1a56db"}}>87%</div><div className="d2-otd-lbl">OTD This Month</div></div>
            <div className="d2-otd-stat"><div className="d2-otd-val" style={{color:"#f59e0b"}}>13</div><div className="d2-otd-lbl">Delayed Orders</div></div>
            <div className="d2-otd-stat"><div className="d2-otd-val" style={{color:"#10b981"}}>94%</div><div className="d2-otd-lbl">Schedule Adherence</div></div>
          </div>
        </Card>
      </div>
      <SectionLabel>Customer Complaints (CustomerComplaintMast · NCR · CAPA)</SectionLabel>
      <CustomerComplaints />
      <SectionLabel>Inspection Pending Report (IQCEntry · InProcessInspection · FinalInspectionEntry)</SectionLabel>
      <InspectionPending />
      <SectionLabel>Incoming Quality Rejections · Purchase Order Status (IQCEntry · POMas · GRNMast)</SectionLabel>
      <div className="d2-iqc-grn">
        <Card>
          <div className="d2-card__hd"><div><div className="d2-card__title">IQC — Incoming Quality Rejections</div><div className="d2-card__sub">FROM: IQCEntry JOIN GRNMast JOIN CustMast (vendor)</div></div></div>
          <table className="d2-mini-tbl">
            <thead><tr><th>GRN No.</th><th>Material</th><th>Vendor</th><th>Qty Rejected</th><th>Status</th></tr></thead>
            <tbody>{IQC_ROWS.map(r=>(<tr key={r.grn}><td className="d2-mono d2-acc-blue">{r.grn}</td><td>{r.mat}</td><td>{r.vendor}</td><td className={`d2-mono d2-acc-${r.st==="Rejected"?"red":"amber"}`}>{r.qty}</td><td><Badge variant={stBadgeCls(r.st)}>{r.st}</Badge></td></tr>))}</tbody>
          </table>
        </Card>
        <Card>
          <div className="d2-card__hd"><div><div className="d2-card__title">GRN Pending Pipeline (Quick View)</div><div className="d2-card__sub">FROM: POMas — top 4 pending receipts</div></div></div>
          <table className="d2-mini-tbl">
            <thead><tr><th>PO No.</th><th>Material</th><th>Expected</th><th>Qty</th><th>Stage</th></tr></thead>
            <tbody>{PO_ROWS.slice(0,4).map(r=>{const cfg=PO_STAGE_CFG[r.stage]||{c:"#94a3b8",bg:"#f1f5f9"};return(<tr key={r.po}><td className="d2-mono d2-acc-blue">{r.po}</td><td>{r.mat}</td><td className="d2-mono">{r.due}</td><td className="d2-mono">{r.qty}</td><td><span className="d2-badge" style={{background:cfg.bg,color:cfg.c}}>{r.stage}</span></td></tr>);})}</tbody>
          </table>
        </Card>
      </div>
      <SectionLabel>Purchase Order Status — Full Pipeline (POMas · GRNMast · VendorMast)</SectionLabel>
      <PurchaseOrderStatus />
    </>
  );
}

function ProductionTab({ setupProdChart, setupRejChart, liveKpis, kpiLoading, kpiError, idleAccepted, idleNonAccepted, idleLoading, idleError }) {
  return (
    <>
      <SectionLabel>Production Performance (ProductionEntry · MacMaster · WorkOrderMast)</SectionLabel>
      <KpiStrip liveKpis={liveKpis} kpiLoading={kpiLoading} kpiError={kpiError} />
      <div className="d2-row3">
        <Card><div className="d2-card__hd"><div><div className="d2-card__title">Production vs Target — Last 7 Days</div><div className="d2-card__sub">ProductionEntry.okqty · Shift A/B/C · WorkOrderMast.planned_qty</div></div></div><ChartCanvas setup={setupProdChart} height={200} /></Card>
        <Card><div className="d2-card__hd"><div className="d2-card__title">Work Order Progress</div><button className="d2-card__btn">All WOs →</button></div><div className="d2-order-list">{WORK_ORDERS.map(o=>(<div key={o.id} className="d2-order-item"><span className="d2-o-id">{o.id}</span><span className="d2-o-name">{o.name}</span><div className="d2-o-prog"><div className="d2-o-pct">{o.pct}%</div><div className="d2-o-bar"><div className="d2-o-fill" style={{width:`${o.pct}%`,background:o.bc}}/></div></div><span className={`d2-badge d2-badge--${o.sc==="up"?"up":o.sc==="dn"?"dn":o.sc==="warn"?"warn":"neu"}`}>{o.st}</span></div>))}</div></Card>
      </div>
      <SectionLabel>Machine OEE (ProductionEntry.OEENEW + runtimesecs + MacMaster.RatePerHr)</SectionLabel>
      <div className="d2-oee-cards">{OEE_CARDS.map(m => <OeeCard key={m.id} m={m} />)}</div>

      <SectionLabel>Job Order Inspection — Rejection & Rework (InJob_Det · ReworkEntry · per Work Order)</SectionLabel>
      <JobOrderInspSection />
      <SectionLabel>Intermediate Inspection — Rejection & Rework (InterInspectionEntry · InProcessInspection · per Stage)</SectionLabel>
      <IntermediateInspSection />
      <SectionLabel>Final Inspection — Rejection, Rework & FPY (FinalInspectionEntry · FinalInspRejectionEntryOrg)</SectionLabel>
      <FinalInspRejSection />

      <SectionLabel>6-Month Rejection Trend (InJob_Det.macrej · matrej · ReworkEntry)</SectionLabel>
      <Card>
        <div className="d2-card__hd"><div><div className="d2-card__title">Mac Rejection vs Material Rejection vs Rework</div><div className="d2-card__sub">FROM: InJob_Det GROUP BY month · ReworkEntry</div></div></div>
        <ChartCanvas setup={setupRejChart} height={200} />
        <div className="d2-leg" style={{marginTop:12}}>
          <div className="d2-leg__item"><div className="d2-leg__dot" style={{background:"#ef4444"}}/>Machine Rejection</div>
          <div className="d2-leg__item"><div className="d2-leg__dot" style={{background:"#1a56db"}}/>Material Rejection</div>
          <div className="d2-leg__item"><div className="d2-leg__dot" style={{background:"#f59e0b"}}/>Rework</div>
        </div>
      </Card>
      <SectionLabel>Idle Hours Analysis (Machine_IdleEntryMas · Machine_IdleEntryDet · IdleReasons)</SectionLabel>
      <IdleHoursSection accepted={idleAccepted} nonAccepted={idleNonAccepted} loading={idleLoading} error={idleError} />
    </>
  );
}

function QualityTab({ setupQualDonut, setupRejChart, liveKpis, kpiLoading, kpiError }) {
  return (
    <>
      <SectionLabel>Quality KPIs (FinalInspectionEntry · InJob_Det · ReworkEntry)</SectionLabel>
      <KpiStrip liveKpis={liveKpis} kpiLoading={kpiLoading} kpiError={kpiError} />
      <div className="d2-row3">
        <Card><div className="d2-card__hd"><div><div className="d2-card__title">Quality Split (Today)</div><div className="d2-card__sub">FinalInspectionEntry.okqty · InJob_Det · ReworkEntry</div></div></div><ChartCanvas setup={setupQualDonut} height={160} /><div className="d2-leg"><div className="d2-leg__item"><div className="d2-leg__dot" style={{background:"#10b981"}}/>First Pass 97.2%</div><div className="d2-leg__item"><div className="d2-leg__dot" style={{background:"#f59e0b"}}/>Rework 1.6%</div><div className="d2-leg__item"><div className="d2-leg__dot" style={{background:"#ef4444"}}/>Scrap 1.2%</div></div></Card>
        <Card><div className="d2-card__hd"><div className="d2-card__title">Top Defect Categories</div><button className="d2-card__btn">View NCRs →</button></div><table className="d2-mini-tbl"><thead><tr><th>#</th><th>Defect Type</th><th>Count</th><th>%</th></tr></thead><tbody>{DEFECTS.map((d,i)=>(<tr key={d.name}><td><span className="d2-rank">{i+1}</span></td><td>{d.name}<div className="d2-d-bar" style={{width:`${d.pct}%`,background:d.c}} /></td><td style={{fontFamily:"'JetBrains Mono',monospace",color:d.c,fontWeight:600}}>{d.count}</td><td style={{fontFamily:"'JetBrains Mono',monospace",color:"#64748b"}}>{d.pct}%</td></tr>))}</tbody></table></Card>
        <Card><div className="d2-card__hd"><div><div className="d2-card__title">IQC Rejections</div><div className="d2-card__sub">IQCEntry JOIN GRNMast</div></div></div><table className="d2-mini-tbl"><thead><tr><th>GRN</th><th>Material</th><th>Vendor</th><th>Qty</th><th>Status</th></tr></thead><tbody>{IQC_ROWS.map(r=>(<tr key={r.grn}><td className="d2-mono d2-acc-blue">{r.grn}</td><td>{r.mat}</td><td>{r.vendor}</td><td className={`d2-mono d2-acc-${r.st==="Rejected"?"red":"amber"}`}>{r.qty}</td><td><Badge variant={r.st==="Rejected"?"dn":r.st==="On Hold"?"warn":"neu"}>{r.st}</Badge></td></tr>))}</tbody></table></Card>
      </div>

      <SectionLabel>Job Order Inspection — Rejection & Rework (InJob_Det · ReworkEntry · per Work Order)</SectionLabel>
      <JobOrderInspSection />
      <SectionLabel>Intermediate Inspection — Rejection & Rework (InterInspectionEntry · InProcessInspection · per Stage)</SectionLabel>
      <IntermediateInspSection />
      <SectionLabel>Final Inspection — Rejection, Rework & FPY (FinalInspectionEntry · FinalInspRejectionEntryOrg)</SectionLabel>
      <FinalInspRejSection />

      <SectionLabel>6-Month Rejection Trend</SectionLabel>
      <Card><div className="d2-card__hd"><div><div className="d2-card__title">Machine Rejection vs Material Rejection vs Rework — Monthly</div><div className="d2-card__sub">FROM: InJob_Det GROUP BY month · ReworkEntry</div></div></div><ChartCanvas setup={setupRejChart} height={200} /></Card>
      <SectionLabel>Customer Complaints (CustomerComplaintMast · NCR · CAPA)</SectionLabel>
      <CustomerComplaints />
      <SectionLabel>Inspection Pending</SectionLabel>
      <InspectionPending />
    </>
  );
}

function MaintenanceTab({ setupDowntimeChart, idleAccepted, idleNonAccepted, idleLoading, idleError }) {
  return (
    <>
      <SectionLabel>Maintenance Overview (PMSchedule · MaintenanceMast · DowntimeMast)</SectionLabel>
      <div className="d2-row3">
        <Card><div className="d2-card__hd"><div><div className="d2-card__title">Downtime by Reason (This Week)</div><div className="d2-card__sub">FROM: DowntimeMast JOIN DowntimeReasonMast GROUP BY reason</div></div></div><ChartCanvas setup={setupDowntimeChart} height={220} /></Card>
        <Card>
          <div className="d2-card__hd"><div><div className="d2-card__title">Machine Status Summary</div><div className="d2-card__sub">MacMaster + DowntimeMast (open) + MaintenanceMast (active)</div></div></div>
          <div className="d2-mstat-summary">
            {[{label:"Running",count:3,color:"#10b981",bg:"#d1fae5"},{label:"Idle",count:1,color:"#f59e0b",bg:"#fef3c7"},{label:"Breakdown",count:1,color:"#ef4444",bg:"#fee2e2"},{label:"Maintenance",count:1,color:"#8b5cf6",bg:"#ede9fe"}].map(s=>(<div key={s.label} className="d2-mstat-row" style={{background:s.bg,borderLeft:`4px solid ${s.color}`}}><span className="d2-mstat-lbl" style={{color:s.color}}>{s.label}</span><span className="d2-mstat-cnt" style={{color:s.color}}>{s.count} machine{s.count!==1?"s":""}</span></div>))}
          </div>
          <div className="d2-mttr-grid">
            <div className="d2-mttr-item"><div className="d2-mttr-val" style={{color:"#f59e0b"}}>54 min</div><div className="d2-mttr-lbl">Avg MTTR</div></div>
            <div className="d2-mttr-item"><div className="d2-mttr-val" style={{color:"#10b981"}}>18.4 hrs</div><div className="d2-mttr-lbl">Avg MTBF</div></div>
            <div className="d2-mttr-item"><div className="d2-mttr-val" style={{color:"#1a56db"}}>83%</div><div className="d2-mttr-lbl">PM Compliance</div></div>
          </div>
        </Card>
      </div>
      <SectionLabel>Machine OEE — Availability Component</SectionLabel>
      <div className="d2-oee-cards">{OEE_CARDS.map(m => <OeeCard key={m.id} m={m} />)}</div>
      <SectionLabel>Idle Hours — Accepted vs Non-Accepted (Machine_IdleEntryMas · Machine_IdleEntryDet · IdleReasons)</SectionLabel>
      <IdleHoursSection accepted={idleAccepted} nonAccepted={idleNonAccepted} loading={idleLoading} error={idleError} />
    </>
  );
}

function DispatchTab({ setupOtdChart }) {
  return (
    <>
      <SectionLabel>Dispatch & Delivery Performance (SalesMast · DispatchMast)</SectionLabel>
      <div className="d2-row5">
        <Card>
          <div className="d2-card__hd"><div><div className="d2-card__title">On-Time Delivery Trend</div><div className="d2-card__sub">FROM: COUNT(dispatch_date ≤ delivery_date) / COUNT(dispatched) × 100</div></div></div>
          <ChartCanvas setup={setupOtdChart} height={200} />
          <div className="d2-otd-stats">
            <div className="d2-otd-stat"><div className="d2-otd-val" style={{color:"#1a56db"}}>87%</div><div className="d2-otd-lbl">OTD This Month</div></div>
            <div className="d2-otd-stat"><div className="d2-otd-val" style={{color:"#f59e0b"}}>13</div><div className="d2-otd-lbl">Delayed Orders</div></div>
            <div className="d2-otd-stat"><div className="d2-otd-val" style={{color:"#10b981"}}>94%</div><div className="d2-otd-lbl">Schedule Adherence</div></div>
          </div>
        </Card>
        <Card>
          <div className="d2-card__hd"><div className="d2-card__title">Work Order Fulfillment</div><button className="d2-card__btn">All WOs →</button></div>
          <div className="d2-order-list">{WORK_ORDERS.map(o=>(<div key={o.id} className="d2-order-item"><span className="d2-o-id">{o.id}</span><span className="d2-o-name">{o.name}</span><div className="d2-o-prog"><div className="d2-o-pct">{o.pct}%</div><div className="d2-o-bar"><div className="d2-o-fill" style={{width:`${o.pct}%`,background:o.bc}}/></div></div><span className={`d2-badge d2-badge--${o.sc==="up"?"up":o.sc==="dn"?"dn":o.sc==="warn"?"warn":"neu"}`}>{o.st}</span></div>))}</div>
        </Card>
      </div>
      <SectionLabel>Customer Complaints (CustomerComplaintMast)</SectionLabel>
      <CustomerComplaints />
      <SectionLabel>Purchase Order Status (POMas · GRNMast · VendorMast)</SectionLabel>
      <PurchaseOrderStatus />
    </>
  );
}

// ════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════
export default function Dashboard2() {
  const [activePeriod, setActivePeriod] = useState("month");
  const [activeTab,    setActiveTab]    = useState("Overview");
  const [dateRange,    setDateRange]    = useState({ from: null, to: null });

  const [liveKpis,   setLiveKpis]   = useState(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError,   setKpiError]   = useState(null);

  const [idleAccepted,    setIdleAccepted]    = useState([]);
  const [idleNonAccepted, setIdleNonAccepted] = useState([]);
  const [idleLoading,     setIdleLoading]     = useState(false);
  const [idleError,       setIdleError]       = useState(null);

  const TABS = ["Overview","Production","Quality","Maintenance","Dispatch"];

  const fetchDashboardData = useCallback(async (from, to) => {
    setKpiLoading(true);
    setIdleLoading(true);
    setKpiError(null);
    setIdleError(null);
    try {
      const [fiRes, prodRes, idleRes] = await Promise.all([
        fetch(buildUrl("/api/dashboard2/final-inspection-kpi/", from, to), { credentials: "include" }),
        fetch(buildUrl("/api/dashboard2/kpis/", from, to), { credentials: "include" }),
        fetch(buildUrl("/api/dashboard2/idle-hours/", from, to), { credentials: "include" }),
      ]);
      const [fiData, prodData, idleData] = await Promise.all([
        fiRes.json().catch(() => null),
        prodRes.json().catch(() => null),
        idleRes.json().catch(() => null),
      ]);
      setLiveKpis({
        finalInspection: fiRes.ok ? fiData : null,
        production:      prodRes.ok && prodData?.kpis ? prodData : null,
      });
      if (!fiRes.ok || !prodRes.ok) {
        setKpiError("One or more KPI requests failed.");
      }
      if (idleRes.ok && idleData && Array.isArray(idleData.accepted)) {
        setIdleAccepted(idleData.accepted || []);
        setIdleNonAccepted(idleData.non_accepted || []);
      } else {
        setIdleAccepted([]);
        setIdleNonAccepted([]);
        if (!idleRes.ok) {
          const msg = idleData?.error || `Idle hours request failed (${idleRes.status})`;
          setIdleError(msg);
        }
      }
    } catch (err) {
      setKpiError(err.message || "Failed to fetch KPIs");
      setIdleError(err.message || "Failed to fetch idle hours");
    } finally {
      setKpiLoading(false);
      setIdleLoading(false);
    }
  }, []);

  useEffect(() => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateRange({ from: monthStart, to: today });
    fetchDashboardData(monthStart, today);
  }, [fetchDashboardData]);

  const handleRangeChange = ({ from, to }) => {
    setDateRange({ from, to });
    fetchDashboardData(from, to);
  };

  const setupProdChart = (canvas) => new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Mon","Tue","Wed","Thu","Fri","Sat","Today"],
      datasets: [
        { label:"Shift A", data:[1380,1420,1350,1500,1400,1100,1410], backgroundColor:"rgba(14,165,233,.75)",  borderRadius:3, borderSkipped:false, stack:"s" },
        { label:"Shift B", data:[1500,1480,1490,1500,1520,1200,1440], backgroundColor:"rgba(16,185,129,.75)",  borderRadius:3, borderSkipped:false, stack:"s" },
        { label:"Shift C", data:[1220,1200,1100,1300,1260,1000,1368], backgroundColor:"rgba(26,86,219,.60)",   borderRadius:3, borderSkipped:false, stack:"s" },
        { label:"Target",  data:[4500,4500,4500,4500,4500,3800,4500], type:"line", borderColor:"rgba(245,158,11,.9)", borderDash:[6,3], borderWidth:2, pointBackgroundColor:"#f59e0b", pointRadius:3, fill:false, tension:.4, stack:undefined },
      ],
    },
    options:{ responsive:true, plugins:{ legend:{display:true,labels:{boxWidth:10,padding:16,color:"#64748b",font:{size:10}}}, tooltip:TOOLTIP_CFG }, scales:{ x:{ stacked:true, grid:{color:"rgba(228,233,242,.6)"}, ticks:{color:"#94a3b8"} }, y:{ stacked:true, grid:{color:"rgba(228,233,242,.6)"}, ticks:{color:"#94a3b8"} } } },
  });

  const setupQualDonut = (canvas) => new Chart(canvas, {
    type: "doughnut",
    data:{ labels:["First Pass","Rework","Scrap"], datasets:[{ data:[97.2,1.6,1.2], backgroundColor:["rgba(16,185,129,.85)","rgba(245,158,11,.85)","rgba(239,68,68,.85)"], borderColor:"#ffffff", borderWidth:3, hoverOffset:6 }] },
    options:{ cutout:"72%", plugins:{ legend:{display:false}, tooltip:TOOLTIP_CFG } },
  });

  const setupDowntimeChart = (canvas) => new Chart(canvas, {
    type:"bar",
    data:{ labels:["Mechanical","Material Shortage","Operator Error","Electrical","Planned Stop"], datasets:[{ data:[82,54,38,21,15], backgroundColor:["#ef4444","#f97316","#f59e0b","#eab308","rgba(26,86,219,.5)"], borderRadius:4, borderSkipped:false }] },
    options:{ indexAxis:"y", responsive:true, plugins:{ legend:{display:false}, tooltip:TOOLTIP_CFG }, scales:{ x:{ grid:{color:"rgba(228,233,242,.6)"}, ticks:{color:"#94a3b8"} }, y:{ grid:{display:false}, ticks:{color:"#64748b"} } } },
  });

  const setupMatChart = (canvas) => new Chart(canvas, {
    type:"bar",
    data:{ labels:["HR Steel","Al Billets","Rubber Seals","Hyd. Fluid","Electrodes"], datasets:[{ label:"Standard (BOM)", data:[820,310,1200,42,95], backgroundColor:"rgba(26,86,219,.45)", borderRadius:3, borderSkipped:false },{ label:"Actual Issued", data:[890,298,1185,51,102], backgroundColor:"rgba(14,165,233,.75)", borderRadius:3, borderSkipped:false }] },
    options:{ responsive:true, plugins:{ legend:{display:true,labels:{boxWidth:10,padding:12,color:"#64748b",font:{size:9}}}, tooltip:TOOLTIP_CFG }, scales:{ x:{ grid:{display:false}, ticks:{color:"#94a3b8",font:{size:9}} }, y:{ grid:{color:"rgba(228,233,242,.6)"}, ticks:{color:"#94a3b8"} } } },
  });

  const setupOtdChart = (canvas) => new Chart(canvas, {
    type:"line",
    data:{ labels:["Aug","Sep","Oct","Nov","Dec","Jan","Feb"], datasets:[{ label:"OTD %", data:[82,85,79,88,91,89,87], borderColor:"rgba(26,86,219,.9)", backgroundColor:"rgba(26,86,219,.07)", fill:true, tension:.5, pointBackgroundColor:"#1a56db", pointRadius:3, borderWidth:2 },{ label:"Target", data:[95,95,95,95,95,95,95], borderColor:"rgba(245,158,11,.5)", borderDash:[5,3], borderWidth:1.5, pointRadius:0, fill:false }] },
    options:{ plugins:{ legend:{display:true,labels:{boxWidth:10,padding:12,color:"#64748b",font:{size:9}}}, tooltip:TOOLTIP_CFG }, scales:{ x:{ grid:{color:"rgba(228,233,242,.5)"}, ticks:{color:"#94a3b8"} }, y:{ min:70, max:100, grid:{color:"rgba(228,233,242,.5)"}, ticks:{color:"#94a3b8"} } } },
  });

  const setupRejChart = (canvas) => new Chart(canvas, {
    type:"bar",
    data:{ labels: REJECTION_DATA.map(d=>d.month), datasets:[{ label:"Mac Rejection", data:REJECTION_DATA.map(d=>d.macrej), backgroundColor:"rgba(239,68,68,.75)", borderRadius:4, borderSkipped:false },{ label:"Mat Rejection", data:REJECTION_DATA.map(d=>d.matrej), backgroundColor:"rgba(26,86,219,.70)", borderRadius:4, borderSkipped:false },{ label:"Rework", data:REJECTION_DATA.map(d=>d.rework), backgroundColor:"rgba(245,158,11,.75)", borderRadius:4, borderSkipped:false }] },
    options:{ responsive:true, plugins:{ legend:{display:true,labels:{boxWidth:10,padding:14,color:"#64748b",font:{size:10}}}, tooltip:TOOLTIP_CFG }, scales:{ x:{ grid:{display:false}, ticks:{color:"#94a3b8"} }, y:{ grid:{color:"rgba(228,233,242,.6)"}, ticks:{color:"#94a3b8"} } } },
  });

  const woBadgeCls = (sc) => ({ up:"up", dn:"dn", warn:"warn", neu:"neu" }[sc] || "neu");
  const stBadgeCls = (st) => st==="Rejected"?"dn":st==="On Hold"?"warn":st==="In Transit"?"neu":st==="Confirmed"?"up":"warn";

  const kpiProps   = { liveKpis, kpiLoading, kpiError };
  const idleProps  = { idleAccepted, idleNonAccepted, idleLoading, idleError };
  const chartProps = { setupProdChart, setupQualDonut, setupDowntimeChart, setupMatChart, setupOtdChart, setupRejChart, woBadgeCls, stBadgeCls };

  return (
    <div className="d2-root">
      <div className="d2-tabbar">
        <div className="d2-tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`d2-tab ${activeTab===t?"d2-tab--active":""}`}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="d2-fbar">
        <Dashboard2DatePicker
          activePeriod={activePeriod}
          onPeriodChange={setActivePeriod}
          onRangeChange={handleRangeChange}
        />
      </div>

      {activeTab === "Overview"    && <OverviewTab    {...chartProps} {...kpiProps} {...idleProps} />}
      {activeTab === "Production"  && <ProductionTab  {...chartProps} {...kpiProps} {...idleProps} />}
      {activeTab === "Quality"     && <QualityTab     {...chartProps} {...kpiProps} />}
      {activeTab === "Maintenance" && <MaintenanceTab {...chartProps} {...idleProps} />}
      {activeTab === "Dispatch"    && <DispatchTab    {...chartProps} />}
    </div>
  );
}