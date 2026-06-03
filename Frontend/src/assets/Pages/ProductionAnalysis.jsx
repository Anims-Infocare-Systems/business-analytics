import { useState, useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import "./ProductionAnalysis.css";
import ProductionAnalysisDatePicker from "./ProductionAnalysisDatePicker";
import { resolveApiBase } from "../../apiBase";
Chart.register(...registerables);
const API_BASE = resolveApiBase();

/* ═══════════════════════════════════════════════
STATIC DATA
═══════════════════════════════════════════════ */
const KPI_DATA = [
  { variant: "pa2-kpi--green", icon: "✦", label: "Total Production Qty", value: "32,043", unit: "Units", meta: "↑ 12.4% vs Last Month", pos: true },
  { variant: "pa2-kpi--green", icon: "✦", label: "OK / Accepted Qty", value: "31,688", unit: "Units", meta: "99.0% Acceptance Rate", pos: false },
  { variant: "pa2-kpi--amber", icon: "▲", label: "Rejection Qty", value: "355", unit: "Units", meta: "1.1% Rejection Rate", pos: false },
  { variant: "pa2-kpi--blue", icon: "◈", label: "OEE", value: "65.7", unit: "%", meta: "Target: 85% ↑", pos: true },
  { variant: "pa2-kpi--blue", icon: "◈", label: "Total Machine Hours", value: "2,562", unit: "hrs", meta: "100% Utilization", pos: false },
  { variant: "pa2-kpi--blue", icon: "◈", label: "Production Hours", value: "1,205", unit: "hrs", meta: "47.03% of Total Hours", pos: false },
  { variant: "pa2-kpi--red", icon: "●", label: "Idle Hours", value: "340", unit: "hrs", meta: "13.3% Idle Time", pos: false },
  { variant: "pa2-kpi--purple", icon: "◉", label: "Setting Hours", value: "100", unit: "hrs", meta: "3.9% Setup Time", pos: false },
  { variant: "pa2-kpi--amber", icon: "▲", label: "Man Efficiency", value: "72.8", unit: "%", meta: "Target: 85% ↑", pos: false },
];

const SUMMARY_DATA = [
  { label: "Total Shifts", value: "145" },
  { label: "Avg Prod / Shift", value: "220" },
  { label: "Peak Shift Output", value: "1,330" },
  { label: "Lowest Shift Output", value: "15" },
  { label: "Active Machines", value: "38" },
  { label: "Idle Machines", value: "12" },
];

const METRICS_DATA = [
  { name: "Machine Utilization", pct: 65.7, color: "#2d6de8", bg: "#dbe9ff" },
  { name: "Machine Efficiency", pct: 51.95, color: "#f59e0b", bg: "#fef3c7" },
  { name: "Operator Efficiency", pct: 72.8, color: "#059669", bg: "#d1fae5" },
  { name: "Quality Rate", pct: 99.0, color: "#059669", bg: "#d1fae5" },
  { name: "Material Rejection", pct: 0.97, color: "#ef4444", bg: "#fee2e2" },
  { name: "Machine Rejection", pct: 0.14, color: "#ef4444", bg: "#fee2e2" },
];


/* ── NEW: Production Value & Rate ─────────────────────────── */
const RATE_DATA = [
  { part: "THRUST PLATE", process: "KEYWAY", ratePerHr: 4200, actualQtyHr: 38.0, targetQtyHr: 45.0, valueProduced: 159600, targetValue: 189000, unit: "₹/hr" },
  { part: "THRUST PLATE", process: "PRE DRILLING", ratePerHr: 3800, actualQtyHr: 81.0, targetQtyHr: 81.0, valueProduced: 307800, targetValue: 307800, unit: "₹/hr" },
  { part: "SEGMENT CARRIER", process: "CNC TURNING I", ratePerHr: 5500, actualQtyHr: 18.3, targetQtyHr: 39.3, valueProduced: 100650, targetValue: 216150, unit: "₹/hr" },
  { part: "TOP BEARING BODY", process: "DRILLING-1", ratePerHr: 4700, actualQtyHr: 41.7, targetQtyHr: 70.0, valueProduced: 195990, targetValue: 329000, unit: "₹/hr" },
  { part: "BOTTOM BEARING", process: "DRILLING TAPPING", ratePerHr: 5100, actualQtyHr: 57.5, targetQtyHr: 59.2, valueProduced: 293250, targetValue: 301920, unit: "₹/hr" },
];

/* ── Idle Breakdown — default empty state (replaced by API) ── */
const _IDLE_BREAKDOWN_EMPTY = {
  accepted:     { total_hours: 0, total_display: "0:00:00", reasons: [] },
  non_accepted: { total_hours: 0, total_display: "0:00:00", total_loss: 0, reasons: [] },
  summary:      { accepted_pct: 0, non_accepted_pct: 0, chart_hours: [0, 0] },
};

/* ── NEW: Manpower Efficiency ─────────────────────────────── */
const MANPOWER_DATA = [
  { operator: "Ramchandra Soran", dept: "CNC", shifts: 6, totalTarget: 2160, totalOk: 1356, eff: 62.8, attendance: 100 },
  { operator: "Santhana Lakshmi", dept: "CNC", shifts: 8, totalTarget: 3688, totalOk: 3670, eff: 99.5, attendance: 100 },
  { operator: "Akash.A", dept: "CNC", shifts: 5, totalTarget: 1180, totalOk: 550, eff: 46.6, attendance: 100 },
  { operator: "Mohan Kewat", dept: "CNC", shifts: 7, totalTarget: 3780, totalOk: 3430, eff: 90.7, attendance: 100 },
  { operator: "Karthi.S", dept: "CNC", shifts: 8, totalTarget: 1320, totalOk: 1320, eff: 100.0, attendance: 100 },
  { operator: "Chandan Kumar", dept: "VMC", shifts: 6, totalTarget: 2520, totalOk: 1500, eff: 59.5, attendance: 83 },
  { operator: "Ajith.A", dept: "CNC", shifts: 7, totalTarget: 1197, totalOk: 1155, eff: 96.5, attendance: 100 },
  { operator: "Nagamani", dept: "CNC", shifts: 6, totalTarget: 1152, totalOk: 960, eff: 83.3, attendance: 100 },
  { operator: "Biswanath Dhungia", dept: "VMC", shifts: 7, totalTarget: 2485, totalOk: 2415, eff: 97.2, attendance: 100 },
];

/* ═══════════════════════════════════════════════
ANIMATED NUMBER COUNTER
═══════════════════════════════════════════════ */
function AnimatedValue({ target, duration = 900, prefix = "", suffix = "" }) {
  const [val, setVal] = useState(0);
  const frame = useRef(null);
  const startTime = useRef(null);
  const numTarget = parseFloat(String(target).replace(/,/g, "")) || 0;
  useEffect(() => {
    startTime.current = null;
    const animate = (ts) => {
      if (!startTime.current) startTime.current = ts;
      const prog = Math.min((ts - startTime.current) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      setVal(numTarget * ease);
      if (prog < 1) frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame.current);
  }, [target]);
  const fmt = (n) => {
    if (suffix === "%" || String(target).includes(".")) return n.toFixed(1);
    return Math.round(n).toLocaleString("en-IN");
  };
  return <>{prefix}{fmt(val)}{suffix}</>;
}

/* ═══════════════════════════════════════════════
PROGRESS BAR (animated on mount)
═══════════════════════════════════════════════ */
function ProgressBar({ pct, color, bg }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 120);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="pa2-bar-track" style={{ background: bg }}>
      <div className="pa2-bar-fill" style={{ width: `${width}%`, background: color }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
DONUT SEGMENT (SVG)
═══════════════════════════════════════════════ */
function DonutChart({ data, total, cx = 80, cy = 80, r = 60, stroke = 18 }) {
  let acc = 0;
  const segments = data.map((d) => {
    const pct = d.hours / total;
    const startAngle = acc * 2 * Math.PI - Math.PI / 2;
    acc += pct;
    const endAngle = acc * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = pct > 0.5 ? 1 : 0;
    return { ...d, d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, pct };
  });
  return (
    <svg viewBox={`0 0 ${cx * 2} ${cy * 2}`} className="pa2-donut-svg">
      {segments.map((s, i) => (
        <path key={i} d={s.d} fill={s.color} opacity={0.88} className="pa2-donut-seg" />
      ))}
      <circle cx={cx} cy={cy} r={r - stroke} fill="white" className="pa2-donut-hole" />
      <text x={cx} y={cy - 7} textAnchor="middle" className="pa2-donut-label-big">{total.toFixed(1)}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="pa2-donut-label-sm">hrs</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════
SECTION HEADER
═══════════════════════════════════════════════ */
function SectionHeader({ icon, title, sub }) {
  return (
    <div className="pa2-section-hdr">
      <span className="pa2-section-icon">{icon}</span>
      <div>
        <div className="pa2-section-title">{title}</div>
        {sub && <div className="pa2-section-sub">{sub}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
PRODUCTION VALUE REPORT — STATIC DATA
═══════════════════════════════════════════════ */
const PV_MACHINE_DATA = {
  labels: ["BROACHING-1", "SPM-04", "TC 43 L", "TC 50", "TC-59", "TC-60", "VMC-07", "VMC 18"],
  planned:   [182000, 245000, 136000, 312000, 198000, 275000, 220000, 190000],
  achieved:  [158400, 238700, 112300, 298500, 185600, 261000, 204800, 172500],
};
const PV_MONTH_DATA = {
  labels: ["Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26", "Mar 26"],
  broaching: [142000, 155000, 148000, 163000, 158400, 170000],
  spm:       [210000, 228000, 235000, 241000, 238700, 250000],
  tc43:      [ 98000, 104000, 110000, 108000, 112300, 118000],
  tc50:      [270000, 285000, 292000, 301000, 298500, 310000],
  other:     [320000, 338000, 345000, 358000, 361200, 375000],
};

/* ═══════════════════════════════════════════════
MAIN COMPONENT
═══════════════════════════════════════════════ */
/* ── sessionStorage filter helpers ── */
function readFilterSession(key, defaults) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return defaults;
    const p = JSON.parse(raw);
    if (p.from) p.from = new Date(p.from);
    if (p.to) p.to = new Date(p.to);
    return { ...defaults, ...p };
  } catch { return defaults; }
}
function writeFilterSession(key, data) {
  try { sessionStorage.setItem(key, JSON.stringify(data)); } catch {}
}

export default function ProductionAnalysis() {
  const _dflt = { from: new Date(2026, 1, 1), to: new Date(2026, 1, 28) };
  const _saved = readFilterSession("ba_filter_production", _dflt);
  const [dateRange, setDateRange] = useState({ from: _saved.from, to: _saved.to });
  const [filterMachine, setFilterMachine] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [filterProcess, setFilterProcess] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [mounted, setMounted] = useState(false);
  const [pvMode, setPvMode]   = useState("machine"); // "machine" | "month"
  const pvChartRef  = useRef(null);
  const pvChartInst = useRef(null);
  const [pvChartData, setPvChartData] = useState({
    machine_data: { labels: [], achieved: [] },
    month_data:   { labels: [], datasets: [] },
  });
  const [idleBreakdown, setIdleBreakdown] = useState(_IDLE_BREAKDOWN_EMPTY);
  const [kpiValues, setKpiValues] = useState({
    totalProductionQty: 0, okAcceptedQty: 0, rejectionQty: 0, overallOee: 0.0, productionHours: 0.0, totalMachineHours: 0.0, idleHours: 0.0, settingHours: 0.0, manEfficiency: 0.0, totalShifts: 0, avgProdPerShift: 0.0, peakShiftOutput: 0, lowestShiftOutput: 0, activeMachines: 0, idleMachines: 0, machineUtilization: 0.0, machineEfficiency: 0.0, operatorEfficiency: 0.0, qualityRate: 0.0, materialRejection: 0.0, machineRejection: 0.0
  });
  const [tableData, setTableData]       = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  const acceptanceRate = kpiValues.totalProductionQty > 0 ? ((kpiValues.okAcceptedQty / kpiValues.totalProductionQty) * 100).toFixed(1) : "0.0";
  const rejectionRate = kpiValues.totalProductionQty > 0 ? ((kpiValues.rejectionQty / kpiValues.totalProductionQty) * 100).toFixed(1) : "0.0";
  const oeeMeta = kpiValues.overallOee > 0 ? `${kpiValues.overallOee >= 85 ? "✔ Above" : "↑ Target:"} 85%` : "Target: 85% ↑";
  const prodHoursPct = kpiValues.totalMachineHours > 0 ? ((kpiValues.productionHours / kpiValues.totalMachineHours) * 100).toFixed(1) : "0.0";
  const idleHoursPct = kpiValues.totalMachineHours > 0 ? ((kpiValues.idleHours / kpiValues.totalMachineHours) * 100).toFixed(1) : "0.0";
  const settingHoursPct = kpiValues.totalMachineHours > 0 ? ((kpiValues.settingHours / kpiValues.totalMachineHours) * 100).toFixed(1) : "0.0";
  const manEffMeta = kpiValues.manEfficiency > 0 ? `${kpiValues.manEfficiency >= 85 ? "✔ Above" : "↑ Target:"} 85%` : "Target: 85% ↑";

  const activeKpiData = [
    { variant: "pa2-kpi--green", icon: "✦", label: "Total Production Qty", value: kpiValues.totalProductionQty, unit: "Units", meta: "↑ 12.4% vs Last Month", pos: true },
    { variant: "pa2-kpi--green", icon: "✦", label: "OK / Accepted Qty", value: kpiValues.okAcceptedQty, unit: "Units", meta: `${acceptanceRate}% Acceptance Rate`, pos: true },
    { variant: "pa2-kpi--amber", icon: "▲", label: "Rejection Qty", value: kpiValues.rejectionQty, unit: "Units", meta: `${rejectionRate}% Rejection Rate`, pos: false },
    { variant: "pa2-kpi--blue", icon: "◈", label: "OEE", value: kpiValues.overallOee, unit: "%", meta: oeeMeta, pos: kpiValues.overallOee >= 85 },
    { variant: "pa2-kpi--blue", icon: "◈", label: "Total Machine Hours", value: kpiValues.totalMachineHours, unit: "hrs", meta: "Shift × Active Machines", pos: false },
    { variant: "pa2-kpi--blue", icon: "◈", label: "Production Hours", value: kpiValues.productionHours, unit: "hrs", meta: `${prodHoursPct}% of Total Hours`, pos: false },
    { variant: "pa2-kpi--red", icon: "●", label: "Idle Hours", value: kpiValues.idleHours, unit: "hrs", meta: `${idleHoursPct}% Idle Time`, pos: false },
    { variant: "pa2-kpi--purple", icon: "◉", label: "Setting Hours", value: kpiValues.settingHours, unit: "hrs", meta: `${settingHoursPct}% Setup Time`, pos: false },
    { variant: "pa2-kpi--amber", icon: "▲", label: "Man Efficiency", value: kpiValues.manEfficiency, unit: "%", meta: manEffMeta, pos: kpiValues.manEfficiency >= 85 },
  ];

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // ✅ Persist date range to sessionStorage on every change
  useEffect(() => {
    writeFilterSession("ba_filter_production", { from: dateRange.from, to: dateRange.to });
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
    const params = new URLSearchParams({ from: dateRange.from.toISOString().slice(0, 10), to: dateRange.to.toISOString().slice(0, 10) });
    fetch(`${API_BASE}/production-analysis-report/?${params}`, { credentials: "include" })
      .then(async (res) => { const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data?.error || "Failed to load production analysis report"); return data; })
      .then(data => {
        if (data && data.status === "success" && data.data) {
          const d = data.data;
          setKpiValues({ totalProductionQty: d.totalProductionQty || 0, okAcceptedQty: d.okAcceptedQty || 0, rejectionQty: d.rejectionQty || 0, overallOee: d.overallOee ?? 0.0, productionHours: d.productionHours ?? 0.0, totalMachineHours: d.totalMachineHours ?? 0.0, idleHours: d.idleHours ?? 0.0, settingHours: d.settingHours ?? 0.0, manEfficiency: d.manEfficiency ?? 0.0, totalShifts: d.totalShifts || 0, avgProdPerShift: d.avgProdPerShift ?? 0.0, peakShiftOutput: d.peakShiftOutput || 0, lowestShiftOutput: d.lowestShiftOutput || 0, activeMachines: d.activeMachines || 0, idleMachines: d.idleMachines || 0, machineUtilization: d.machineUtilization ?? 0.0, machineEfficiency: d.machineEfficiency ?? 0.0, operatorEfficiency: d.operatorEfficiency ?? 0.0, qualityRate: d.qualityRate ?? 0.0, materialRejection: d.materialRejection ?? 0.0, machineRejection: d.machineRejection ?? 0.0 });
        }
      })
      .catch(err => console.error("Error connecting to production analysis backend:", err));
  }, [dateRange.from, dateRange.to]);

  /* ── Production Value chart fetch ───────────────── */
  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
    const params = new URLSearchParams({ from: dateRange.from.toISOString().slice(0, 10), to: dateRange.to.toISOString().slice(0, 10) });
    fetch(`${API_BASE}/production-value-report/?${params}`, { credentials: "include" })
      .then(r => r.json().catch(() => ({})))
      .then(data => { if (data && data.status === "success" && data.data) setPvChartData(data.data); })
      .catch(err => console.error("Production value report error:", err));
  }, [dateRange.from, dateRange.to]);

  /* ── Idle Breakdown fetch ───────────────────── */
  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
    const params = new URLSearchParams({ from: dateRange.from.toISOString().slice(0, 10), to: dateRange.to.toISOString().slice(0, 10) });
    fetch(`${API_BASE}/production-idle-breakdown/?${params}`, { credentials: "include" })
      .then(r => r.json().catch(() => ({})))
      .then(data => { if (data && data.status === "success") setIdleBreakdown({ accepted: data.accepted || _IDLE_BREAKDOWN_EMPTY.accepted, non_accepted: data.non_accepted || _IDLE_BREAKDOWN_EMPTY.non_accepted, summary: data.summary || _IDLE_BREAKDOWN_EMPTY.summary }); })
      .catch(err => console.error("Idle breakdown error:", err));
  }, [dateRange.from, dateRange.to]);

  /* ── Daily Production Details fetch ─────────── */
  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
    const params = new URLSearchParams({ from: dateRange.from.toISOString().slice(0, 10), to: dateRange.to.toISOString().slice(0, 10) });
    setTableLoading(true);
    fetch(`${API_BASE}/production-analysis/daily-details/?${params}`, { credentials: "include" })
      .then(r => r.json().catch(() => ({})))
      .then(data => {
        if (data && data.status === "success" && Array.isArray(data.data)) {
          setTableData(data.data);
        } else {
          setTableData([]);
        }
      })
      .catch(err => { console.error("Daily production details error:", err); setTableData([]); })
      .finally(() => setTableLoading(false));
  }, [dateRange.from, dateRange.to]);

  /* ── Derived idle totals from live data ─────── */
  const totalAcceptedHrs = idleBreakdown.accepted.total_hours || 0;
  const totalNonAccepted = idleBreakdown.non_accepted.total_hours || 0;
  const totalLoss        = idleBreakdown.non_accepted.total_loss || 0;

  /* ── Production Value chart ─────────────────── */
  useEffect(() => {
    if (!pvChartRef.current) return;
    pvChartInst.current?.destroy();
    const isMachine = pvMode === "machine";
    const ctx = pvChartRef.current.getContext("2d");
    const machineData = pvChartData.machine_data;
    const monthData   = pvChartData.month_data;
    pvChartInst.current = new Chart(ctx, {
      type: "bar",
      data: isMachine ? { labels: machineData.labels, datasets: [{ label: "Achieved Value (₹)", data: machineData.achieved, backgroundColor: machineData.labels.map((_, i) => { const palette = ["rgba(37,99,235,0.75)","rgba(249,115,22,0.75)","rgba(16,185,129,0.75)","rgba(139,92,246,0.75)","rgba(6,182,212,0.75)","rgba(236,72,153,0.75)","rgba(245,158,11,0.75)","rgba(99,102,241,0.75)","rgba(239,68,68,0.75)","rgba(132,204,22,0.75)","rgba(20,184,166,0.75)","rgba(168,85,247,0.75)","rgba(251,146,60,0.75)","rgba(34,211,238,0.75)","rgba(74,222,128,0.75)","rgba(244,63,94,0.75)","rgba(14,165,233,0.75)","rgba(217,70,239,0.75)","rgba(251,191,36,0.75)","rgba(52,211,153,0.75)"]; return palette[i % palette.length]; }), borderColor: machineData.labels.map((_, i) => { const borders = ["#2563eb","#f97316","#10b981","#8b5cf6","#06b6d4","#ec4899","#f59e0b","#6366f1","#ef4444","#84cc16","#14b8a6","#a855f7","#fb923c","#22d3ee","#4ade80","#f43f5e","#0ea5e9","#d946ef","#fbbf24","#34d399"]; return borders[i % borders.length]; }), borderWidth: 1.5, borderRadius: 7 }] } : { labels: monthData.labels, datasets: monthData.datasets.map(d => ({ ...d, borderRadius: 4 })) },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "top", labels: { font: { family: "'DM Sans','Outfit',sans-serif", size: 12, weight: "600" }, padding: 18, usePointStyle: true } }, tooltip: { callbacks: { label: ctx => ` ₹${ctx.parsed.y.toLocaleString("en-IN")}` } }, datalabels: isMachine ? { anchor: "end", align: "top", formatter: v => `₹${(v / 1000).toFixed(0)}K`, font: { size: 10, weight: "700" }, color: "#475569" } : false },
        scales: { x: { stacked: !isMachine, ticks: { font: { size: 11 }, maxRotation: isMachine ? 35 : 0 }, grid: { display: false } }, y: { stacked: !isMachine, beginAtZero: true, ticks: { callback: v => `₹${(v / 1000).toFixed(0)}K`, font: { size: 11 } }, grid: { color: "#f1f5f9" } } }
      }
    });
    return () => pvChartInst.current?.destroy();
  }, [pvMode, pvChartData]);

  return (
    <div className={`pa2-wrap ${mounted ? "pa2-wrap--in" : ""}`}>
      {/* ── FILTERS ──────────────────────────────────── */}
      <div className="pa2-card pa2-filters pa2-anim" style={{ "--d": "0ms" }}>
        <div className="pa2-filters-grid">
          <div className="pa2-fg">
            <label>Date Range</label>
            <ProductionAnalysisDatePicker from={dateRange.from} to={dateRange.to} onChange={setDateRange} />
          </div>
        </div>
      </div>
      {/* ── KPI CARDS ─────────────────────────────────── */}
      <div className="pa2-kpi-grid">
        {activeKpiData.map((k, i) => (
          <div key={i} className={`pa2-kpi ${k.variant} pa2-anim`} style={{ "--d": `${i * 55}ms` }}>
            <div className="pa2-kpi-icon">{k.icon}</div>
            <div className="pa2-kpi-label">{k.label}</div>
            <div className="pa2-kpi-value"><AnimatedValue target={k.value} suffix="" /><span className="pa2-kpi-unit"> {k.unit}</span></div>
            <div className={`pa2-kpi-meta ${k.pos ? "pa2-pos" : ""}`}>{k.meta}</div>
          </div>
        ))}
      </div>
      {/* ── DAILY SUMMARY + EFFICIENCY (side by side) ── */}
      <div className="pa2-row-2">
        <div className="pa2-card pa2-anim" style={{ "--d": "80ms" }}>
          <SectionHeader icon="▦" title="Daily Production Summary" />
          <div className="pa2-summary-grid">
            {[{ label: "Total Shifts", value: kpiValues.totalShifts }, { label: "Avg Prod / Shift", value: kpiValues.avgProdPerShift }, { label: "Peak Shift Output", value: kpiValues.peakShiftOutput }, { label: "Lowest Shift Output", value: kpiValues.lowestShiftOutput }, { label: "Active Machines", value: kpiValues.activeMachines }, { label: "Idle Machines", value: kpiValues.idleMachines }].map((s, i) => (
              <div key={i} className="pa2-summary-chip"><div className="pa2-summary-lbl">{s.label}</div><div className="pa2-summary-val"><AnimatedValue target={s.value} /></div></div>
            ))}
          </div>
        </div>
        <div className="pa2-card pa2-anim" style={{ "--d": "120ms" }}>
          <SectionHeader icon="◈" title="Machine & Operator Efficiency" />
          <div className="pa2-metrics-list">
            {[{ name: "Machine Utilization", pct: kpiValues.machineUtilization, color: "#2d6de8", bg: "#dbe9ff" }, { name: "Machine Efficiency", pct: kpiValues.machineEfficiency, color: "#f59e0b", bg: "#fef3c7" }, { name: "Operator Efficiency", pct: kpiValues.operatorEfficiency, color: "#059669", bg: "#d1fae5" }, { name: "Quality Rate", pct: kpiValues.qualityRate, color: "#059669", bg: "#d1fae5" }, { name: "Material Rejection", pct: kpiValues.materialRejection, color: "#ef4444", bg: "#fee2e2" }, { name: "Machine Rejection", pct: kpiValues.machineRejection, color: "#ef4444", bg: "#fee2e2" }].map((m, i) => (
              <div key={i} className="pa2-metric-row"><div className="pa2-metric-name">{m.name}</div><ProgressBar pct={m.pct} color={m.color} bg={m.bg} /><div className="pa2-metric-pct" style={{ color: m.color }}>{m.pct}%</div></div>
            ))}
          </div>
        </div>
      </div>
      {/* ══════════════════════════════════════════════
§1 — PRODUCTION VALUE REPORT
══════════════════════════════════════════════ */}
      <div className="pa2-card pa2-anim" style={{ "--d": "100ms" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.2rem" }}>
          <SectionHeader icon="₹" title="Production Value Report" sub="Machine-wise bar chart / Month-wise stacked bar — Production Value (₹)" />
          <div className="pa2-pv-toggle">
            <button className={`pa2-pv-tab ${pvMode === "machine" ? "pa2-pv-tab--active" : ""}`} onClick={() => setPvMode("machine")}>🏭 Machine Wise</button>
            <button className={`pa2-pv-tab ${pvMode === "month" ? "pa2-pv-tab--active" : ""}`} onClick={() => setPvMode("month")}>📅 Month Wise</button>
          </div>
        </div>
        <div className="pa2-pv-kpis">
          {(() => {
            const ach = pvChartData.machine_data.achieved;
            const lbl = pvChartData.machine_data.labels;
            const total = ach.reduce((s, v) => s + v, 0);
            const count = lbl.length || 1;
            const maxIdx = ach.indexOf(Math.max(...(ach.length ? ach : [0])));
            return [{ label: "Total Achieved Value", val: `₹${total.toLocaleString("en-IN")}`, color: "#f97316" }, { label: "No. of Machines", val: lbl.length, color: "#2563eb" }, { label: "Avg per Machine", val: `₹${Math.round(total / count).toLocaleString("en-IN")}`, color: "#10b981" }, { label: "Top Machine", val: lbl[maxIdx] || "—", color: "#8b5cf6" }].map((k, i) => (
              <div key={i} className="pa2-pv-kpi" style={{ borderColor: k.color + "33" }}><div className="pa2-pv-kpi-lbl">{k.label}</div><div className="pa2-pv-kpi-val" style={{ color: k.color }}>{k.val}</div></div>
            ));
          })()}
        </div>
        <div style={{ height: 340, marginTop: "1rem" }}><canvas ref={pvChartRef} /></div>
      </div>
      {/* ══════════════════════════════════════════════
NEW §2 — IDLE HOURS: ACCEPTED vs NON-ACCEPTED
══════════════════════════════════════════════ */}
      <div className="pa2-row-2">
        <div className="pa2-card pa2-anim" style={{ "--d": "80ms" }}>
          <SectionHeader icon="✔" title="Idle Hours — Accepted Reasons" sub={`Total: ${totalAcceptedHrs.toFixed(1)} hrs  (${idleBreakdown.summary.accepted_pct}%)`} />
          <div className="pa2-idle-layout">
            <DonutChart data={idleBreakdown.accepted.reasons.length >= 2 ? idleBreakdown.accepted.reasons : idleBreakdown.accepted.reasons.length === 1 ? [...idleBreakdown.accepted.reasons, { hours: 0.001, color: "#e2e8f0" }] : [{ hours: 0.6, color: "#2563eb" }, { hours: 0.4, color: "#e2e8f0" }]} total={totalAcceptedHrs > 0 ? totalAcceptedHrs : 1} />
            <div className="pa2-idle-list">
              {idleBreakdown.accepted.reasons.length === 0 && <div className="pa2-idle-row" style={{ color: "#94a3b8", fontStyle: "italic" }}>No accepted idle data for this period</div>}
              {idleBreakdown.accepted.reasons.map((r, i) => (
                <div key={i} className="pa2-idle-row pa2-anim" style={{ "--d": `${i * 60}ms` }}>
                  <span className="pa2-idle-dot" style={{ background: r.color }} />
                  <span className="pa2-idle-reason">{r.reason}</span>
                  <span className="pa2-idle-hrs" style={{ color: r.color }}>{r.hours} hrs</span>
                  <span className="pa2-idle-pct">({r.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="pa2-card pa2-card--danger pa2-anim" style={{ "--d": "110ms" }}>
          <SectionHeader icon="✖" title="Idle Hours — Non-Accepted Reasons" sub={`Total: ${totalNonAccepted.toFixed(1)} hrs  |  ⚠ Needs Action (${idleBreakdown.summary.non_accepted_pct}%)`} />
          <div className="pa2-idle-layout">
            <DonutChart data={idleBreakdown.non_accepted.reasons.length >= 2 ? idleBreakdown.non_accepted.reasons : idleBreakdown.non_accepted.reasons.length === 1 ? [...idleBreakdown.non_accepted.reasons, { hours: 0.001, color: "#fee2e2" }] : [{ hours: 0.6, color: "#ef4444" }, { hours: 0.4, color: "#fee2e2" }]} total={totalNonAccepted > 0 ? totalNonAccepted : 1} />
            <div className="pa2-idle-list">
              {idleBreakdown.non_accepted.reasons.length === 0 && <div className="pa2-idle-row" style={{ color: "#94a3b8", fontStyle: "italic" }}>No non-accepted idle data for this period</div>}
              {idleBreakdown.non_accepted.reasons.map((r, i) => (
                <div key={i} className="pa2-idle-row pa2-anim" style={{ "--d": `${i * 60}ms` }}>
                  <span className="pa2-idle-dot" style={{ background: r.color }} />
                  <span className="pa2-idle-reason">{r.reason}</span>
                  <span className="pa2-idle-hrs" style={{ color: r.color }}>{r.hours} hrs</span>
                  <span className="pa2-idle-pct">({r.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* ══════════════════════════════════════════════
NEW §3 — NON-ACCEPTED IDLE: PRODUCTION LOSS
══════════════════════════════════════════════ */}
      <div className="pa2-card pa2-card--loss pa2-anim" style={{ "--d": "90ms" }}>
        <SectionHeader icon="₹" title="Production Loss — Non-Accepted Idle Hours × Rate per Hour" sub="Financial impact of unplanned downtime based on process-specific production rate" />
        <div className="pa2-loss-kpis">
          <div className="pa2-loss-kpi pa2-loss-kpi--red"><div className="pa2-loss-kpi-lbl">Total Loss Value</div><div className="pa2-loss-kpi-val">₹{totalLoss.toLocaleString("en-IN")}</div></div>
          <div className="pa2-loss-kpi pa2-loss-kpi--orange"><div className="pa2-loss-kpi-lbl">Total Unplanned Hours</div><div className="pa2-loss-kpi-val">{totalNonAccepted.toFixed(1)} hrs</div></div>
          <div className="pa2-loss-kpi pa2-loss-kpi--amber"><div className="pa2-loss-kpi-lbl">Avg Loss per Hour</div><div className="pa2-loss-kpi-val">₹{(totalLoss / totalNonAccepted).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div></div>
          <div className="pa2-loss-kpi pa2-loss-kpi--purple"><div className="pa2-loss-kpi-lbl">Recoverable Potential</div><div className="pa2-loss-kpi-val">₹{(totalLoss * 0.62).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div></div>
        </div>
        <div className="pa2-loss-table-wrap">
          <table className="pa2-loss-table">
            <thead><tr><th>Reason</th><th>Idle Hours</th><th>Rate / hr</th><th>Loss Value</th><th>% of Total Loss</th><th>Impact</th></tr></thead>
            <tbody>
              {idleBreakdown.non_accepted.reasons.map((r, i) => {
                const loss = r.loss_value || 0;
                const lossPct = totalLoss > 0 ? (loss / totalLoss * 100).toFixed(1) : "0.0";
                const impact = loss > 300000 ? "Critical" : loss > 150000 ? "High" : loss > 80000 ? "Medium" : "Low";
                const impactClass = loss > 300000 ? "pa2-imp--crit" : loss > 150000 ? "pa2-imp--high" : loss > 80000 ? "pa2-imp--med" : "pa2-imp--low";
                return (<tr key={i} className="pa2-anim" style={{ "--d": `${i * 50}ms` }}><td><span className="pa2-idle-dot" style={{ background: r.color }} />{r.reason}</td><td className="pa2-td-num">{r.hours}</td><td className="pa2-td-num">₹{(r.rate_per_hr || 0).toLocaleString("en-IN")}</td><td className="pa2-td-num pa2-td-loss">₹{loss.toLocaleString("en-IN")}</td><td><div className="pa2-loss-bar-inline"><div className="pa2-loss-bar-fill" style={{ width: `${lossPct}%`, background: r.color }} /><span>{lossPct}%</span></div></td><td><span className={`pa2-imp ${impactClass}`}>{impact}</span></td></tr>);
              })}
              <tr className="pa2-total-row"><td><strong>Total</strong></td><td className="pa2-td-num"><strong>{totalNonAccepted.toFixed(1)}</strong></td><td className="pa2-td-num">—</td><td className="pa2-td-num pa2-td-loss"><strong>₹{totalLoss.toLocaleString("en-IN")}</strong></td><td className="pa2-td-num"><strong>100%</strong></td><td>—</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="pa2-card pa2-anim" style={{ "--d": "80ms" }}>
        <SectionHeader icon="▤" title="Daily Production Details" sub={tableLoading ? "Loading…" : `${tableData.length} shift record(s)`} />
        <div className="pa2-table-wrap">
          <table className="pa2-table">
            <thead><tr>{["#", "Date", "Machine", "Shift", "Operator", "Part", "Process", "Target", "OK Qty", "Rej", "Eff %", "OEE %", "Status"].map(h => (<th key={h}>{h}</th>))}</tr></thead>
            <tbody>
              {tableLoading && (
                <tr><td colSpan={13} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", fontStyle: "italic" }}>Loading production data…</td></tr>
              )}
              {!tableLoading && tableData.length === 0 && (
                <tr><td colSpan={13} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", fontStyle: "italic" }}>No production records found for the selected date range.</td></tr>
              )}
              {!tableLoading && tableData.map((row, i) => {
                const isRejected = row.Status === "Rejected";
                const badge = isRejected ? "pa2-badge--bad" : "pa2-badge--ok";
                const formattedDate = row.Date ? new Date(row.Date).toLocaleDateString("en-IN") : "—";
                return (
                  <tr key={i} className="pa2-anim" style={{ "--d": `${i * 40}ms` }}>
                    <td className="pa2-td-muted">{row.SNo}</td>
                    <td>{formattedDate}</td>
                    <td><span className="pa2-machine-chip">{row.Machine || "—"}</span></td>
                    <td>{row.Shift || "—"}</td>
                    <td>{row.Operator || "—"}</td>
                    <td className="pa2-td-part">{row.Part || "—"}</td>
                    <td>{row.Process || "—"}</td>
                    <td className="pa2-td-num">{(row.Target || 0).toLocaleString()}</td>
                    <td className="pa2-td-num">{(row.OKQty || 0).toLocaleString()}</td>
                    <td className="pa2-td-num" style={{ color: row.Rej > 0 ? "#ef4444" : "#059669" }}>{row.Rej || 0}</td>
                    <td className="pa2-td-num">{(row.EffPct || 0).toFixed(2)}%</td>
                    <td className="pa2-td-num">{(row.OEEPct || 0).toFixed(2)}%</td>
                    <td><span className={`pa2-badge ${badge}`}>{row.Status || "OK"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}