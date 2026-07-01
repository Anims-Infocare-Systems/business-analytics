import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiCpu, FiUser, FiLayers, FiCompass, FiClock, FiActivity, FiCheckCircle, FiXCircle, FiRefreshCw, FiAlertTriangle, FiList, FiAward, FiDollarSign, FiAlertCircle, FiTrendingDown, FiTable, FiTrendingUp, FiCalendar } from "react-icons/fi";
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
  accepted: { total_hours: 0, total_display: "0:00:00", reasons: [] },
  non_accepted: { total_hours: 0, total_display: "0:00:00", total_loss: 0, reasons: [] },
  summary: { accepted_pct: 0, non_accepted_pct: 0, chart_hours: [0, 0] },
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
  planned: [182000, 245000, 136000, 312000, 198000, 275000, 220000, 190000],
  achieved: [158400, 238700, 112300, 298500, 185600, 261000, 204800, 172500],
};
const PV_MONTH_DATA = {
  labels: ["Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26", "Mar 26"],
  broaching: [142000, 155000, 148000, 163000, 158400, 170000],
  spm: [210000, 228000, 235000, 241000, 238700, 250000],
  tc43: [98000, 104000, 110000, 108000, 112300, 118000],
  tc50: [270000, 285000, 292000, 301000, 298500, 310000],
  other: [320000, 338000, 345000, 358000, 361200, 375000],
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
function PremiumSelect({ label, value, options, onChange, placeholder = "Select..." }) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (open) {
      const activeIndex = options.findIndex(o => o.value === value);
      setFocusedIndex(activeIndex >= 0 ? activeIndex : 0);
    } else {
      setFocusedIndex(-1);
    }
  }, [open, value, options]);

  useEffect(() => {
    if (open && focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex].scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex, open]);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex(prev => (prev + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex(prev => (prev - 1 + options.length) % options.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < options.length) {
        onChange(options[focusedIndex].value);
      }
      setOpen(false);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  };

  const activeLabel = options.find(o => o.value === value)?.label || placeholder;

  return (
    <div className="pa2-fg" ref={containerRef} onKeyDown={handleKeyDown}>
      <label>{label}</label>
      <div className="pa2-ps-wrap">
        <button
          type="button"
          className={`pa2-ps-trigger ${open ? "pa2-ps-trigger--open" : ""} ${value ? "pa2-ps-trigger--selected" : ""}`}
          onClick={() => setOpen(o => !o)}
        >
          <span className="pa2-ps-txt">{activeLabel}</span>
          <svg className="pa2-ps-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {open && (
          <div className="pa2-ps-menu">
            {options.map((opt, idx) => (
              <button
                key={opt.value}
                type="button"
                ref={el => itemRefs.current[idx] = el}
                className={`pa2-ps-item ${opt.value === value ? "pa2-ps-item--active" : ""} ${idx === focusedIndex ? "pa2-ps-item--highlighted" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function writeFilterSession(key, data) {
  try { sessionStorage.setItem(key, JSON.stringify(data)); } catch { }
}

export default function ProductionAnalysis() {
  const _dflt = { from: new Date(2026, 1, 1), to: new Date(2026, 1, 28) };
  const _saved = readFilterSession("ba_filter_production", _dflt);
  const [dateRange, setDateRange] = useState({ from: _saved.from, to: _saved.to });
  const [filterMachine, setFilterMachine] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [filterProcess, setFilterProcess] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOperator, setFilterOperator] = useState("");
  const [filterMacType, setFilterMacType] = useState("");
  const [filterMacGroup, setFilterMacGroup] = useState("");
  const [mounted, setMounted] = useState(false);
  const [pvMode, setPvMode] = useState("machine"); // "machine" | "month"
  const [oeeMode, setOeeMode] = useState("machine"); // "machine" | "month"
  const [selectedMacTypeFilter, setSelectedMacTypeFilter] = useState("All");
  const [searchMacQuery, setSearchMacQuery] = useState("");
  const [selectedMachine, setSelectedMachine] = useState(null);
  const pvChartRef = useRef(null);
  const pvChartInst = useRef(null);
  const oeeChartRef = useRef(null);
  const oeeChartInst = useRef(null);
  const setChartRef = useRef(null);
  const setChartInst = useRef(null);
  const utilChartRef = useRef(null);
  const utilChartInst = useRef(null);
  const [pvChartData, setPvChartData] = useState({
    machine_data: { labels: [], achieved: [] },
    month_data: { labels: [], datasets: [] },
  });
  const [idleBreakdown, setIdleBreakdown] = useState(_IDLE_BREAKDOWN_EMPTY);
  const [kpiValues, setKpiValues] = useState({
    totalProductionQty: 0, okAcceptedQty: 0, rejectionQty: 0, overallOee: 0.0, productionHours: 0.0, totalMachineHours: 0.0, idleHours: 0.0, settingHours: 0.0, manEfficiency: 0.0, totalShifts: 0, avgProdPerShift: 0.0, peakShiftOutput: 0, lowestShiftOutput: 0, activeMachines: 0, idleMachines: 0, machineUtilization: 0.0, machineEfficiency: 0.0, operatorEfficiency: 0.0, qualityRate: 0.0, materialRejection: 0.0, machineRejection: 0.0
  });
  const [tableData, setTableData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  const allMachinesList = [
    { name: "TC-59", type: "CNC Turning", color: "#2563eb" },
    { name: "TC-60", type: "CNC Turning", color: "#059669" },
    { name: "TC 50", type: "CNC Turning", color: "#7c3aed" },
    { name: "TC 43 L", type: "CNC Turning", color: "#ea580c" },
    { name: "VMC-07", type: "Milling", color: "#0891b2" },
    { name: "VMC 18", type: "Milling", color: "#be185d" },
    { name: "SPM-04", type: "Special Purpose", color: "#b45309" },
    { name: "BROACHING-1", type: "Broaching", color: "#1d4ed8" },
    { name: "M/C-09", type: "Conventional", color: "#065f46" },
    { name: "M/C-10", type: "Conventional", color: "#6d28d9" },
    { name: "M/C-11", type: "Conventional", color: "#0f766e" },
    { name: "M/C-12", type: "Conventional", color: "#9f1239" },
  ];

  const filteredMachinesList = allMachinesList.filter(m => {
    const matchesTab = selectedMacTypeFilter === "All" || m.type === selectedMacTypeFilter;
    const matchesSearch = m.name.toLowerCase().includes(searchMacQuery.toLowerCase()) || m.type.toLowerCase().includes(searchMacQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const macDetailData = {
    "TC-59": {
      runs: [
        { operator: "Ramchandra Soran", partNo: "PRT-2047", process: "Turning OD", runHrs: 4.8, okQty: 180 },
        { operator: "Karthi.S", partNo: "PRT-1022", process: "Facing", runHrs: 2.0, okQty: 68 }
      ],
      idleHrs: 1.2, rejQty: 4, rwQty: 2, oprEff: 88, oee: 84
    },
    "TC-60": {
      runs: [
        { operator: "Santhana Lakshmi", partNo: "PRT-1085", process: "Facing & Boring", runHrs: 4.1, okQty: 190 },
        { operator: "Ajith.A", partNo: "PRT-2204", process: "Chamfering", runHrs: 3.0, okQty: 122 }
      ],
      idleHrs: 0.9, rejQty: 6, rwQty: 3, oprEff: 91, oee: 87
    },
    "TC 50": {
      runs: [
        { operator: "Akash.A", partNo: "PRT-3321", process: "Internal Turning", runHrs: 3.4, okQty: 109 },
        { operator: "Nagamani", partNo: "PRT-0988", process: "Boring", runHrs: 2.0, okQty: 80 }
      ],
      idleHrs: 2.6, rejQty: 11, rwQty: 5, oprEff: 74, oee: 71
    },
    "TC 43 L": {
      runs: [
        { operator: "Mohan Kewat", partNo: "PRT-0912", process: "Thread Cutting", runHrs: 2.2, okQty: 75 },
        { operator: "Chandan Kumar", partNo: "PRT-1155", process: "Grooving", runHrs: 2.0, okQty: 68 }
      ],
      idleHrs: 3.8, rejQty: 9, rwQty: 4, oprEff: 66, oee: 62
    },
    "VMC-07": {
      runs: [
        { operator: "Ravi Kumar", partNo: "PRT-4456", process: "Face Milling", runHrs: 3.5, okQty: 110 },
        { operator: "Priya Singh", partNo: "PRT-3321", process: "Pocket Milling", runHrs: 3.0, okQty: 97 }
      ],
      idleHrs: 1.5, rejQty: 5, rwQty: 2, oprEff: 85, oee: 81
    },
    "VMC 18": {
      runs: [
        { operator: "Priya Singh", partNo: "PRT-2210", process: "Slot Milling", runHrs: 2.0, okQty: 52 },
        { operator: "Biswanath Dhungia", partNo: "PRT-5503", process: "Drilling", runHrs: 1.8, okQty: 46 }
      ],
      idleHrs: 4.2, rejQty: 8, rwQty: 6, oprEff: 58, oee: 45
    },
    "SPM-04": {
      runs: [
        { operator: "Deepak Yadav", partNo: "PRT-5503", process: "Drilling & Tapping", runHrs: 3.9, okQty: 140 },
        { operator: "Nilesh Gupta", partNo: "PRT-4490", process: "Reaming", runHrs: 2.0, okQty: 75 }
      ],
      idleHrs: 2.1, rejQty: 7, rwQty: 3, oprEff: 79, oee: 73
    },
    "BROACHING-1": {
      runs: [
        { operator: "Arun Mishra", partNo: "PRT-6678", process: "Keyway Broaching", runHrs: 3.2, okQty: 76 }
      ],
      idleHrs: 4.8, rejQty: 14, rwQty: 8, oprEff: 52, oee: 38
    },
    "M/C-09": {
      runs: [
        { operator: "Suresh Patel", partNo: "PRT-1134", process: "Conventional Turn", runHrs: 4.2, okQty: 120 },
        { operator: "Vikas Sharma", partNo: "PRT-2267", process: "Knurling", runHrs: 2.0, okQty: 68 }
      ],
      idleHrs: 1.8, rejQty: 6, rwQty: 2, oprEff: 82, oee: 80
    },
    "M/C-10": {
      runs: [
        { operator: "Vikas Sharma", partNo: "PRT-2267", process: "Conventional Mill", runHrs: 2.7, okQty: 80 },
        { operator: "Kiran Babu", partNo: "PRT-3389", process: "Drilling", runHrs: 2.0, okQty: 54 }
      ],
      idleHrs: 3.3, rejQty: 10, rwQty: 7, oprEff: 70, oee: 55
    },
    "M/C-11": {
      runs: [
        { operator: "Kiran Babu", partNo: "PRT-3389", process: "Conventional Turn", runHrs: 4.0, okQty: 135 },
        { operator: "Ramchandra Soran", partNo: "PRT-2047", process: "Facing", runHrs: 2.0, okQty: 66 }
      ],
      idleHrs: 2.0, rejQty: 5, rwQty: 3, oprEff: 80, oee: 77
    },
    "M/C-12": {
      runs: [
        { operator: "Nilesh Gupta", partNo: "PRT-4490", process: "Special Process", runHrs: 3.1, okQty: 100 },
        { operator: "Deepak Yadav", partNo: "PRT-5503", process: "Deburring", runHrs: 2.0, okQty: 62 }
      ],
      idleHrs: 2.9, rejQty: 8, rwQty: 4, oprEff: 75, oee: 68
    },
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterMachine("");
    setFilterShift("");
    setFilterOperator("");
    setFilterMacType("");
    setFilterMacGroup("");
  };

  const acceptanceRate = kpiValues.totalProductionQty > 0 ? ((kpiValues.okAcceptedQty / kpiValues.totalProductionQty) * 100).toFixed(1) : "0.0";
  const rejectionRate = kpiValues.totalProductionQty > 0 ? ((kpiValues.rejectionQty / kpiValues.totalProductionQty) * 100).toFixed(1) : "0.0";
  const oeeMeta = kpiValues.overallOee > 0 ? `${kpiValues.overallOee >= 85 ? "✔ Above" : "↑ Target:"} 85%` : "Target: 85% ↑";
  const prodHoursPct = kpiValues.totalMachineHours > 0 ? ((kpiValues.productionHours / kpiValues.totalMachineHours) * 100).toFixed(1) : "0.0";
  const idleHoursPct = kpiValues.totalMachineHours > 0 ? ((kpiValues.idleHours / kpiValues.totalMachineHours) * 100).toFixed(1) : "0.0";
  const settingHoursPct = kpiValues.totalMachineHours > 0 ? ((kpiValues.settingHours / kpiValues.totalMachineHours) * 100).toFixed(1) : "0.0";
  const manEffMeta = kpiValues.manEfficiency > 0 ? `${kpiValues.manEfficiency >= 85 ? "✔ Above" : "↑ Target:"} 85%` : "Target: 85% ↑";

  const activeKpiData = [
    {
      variant: "pa2-kpi--green",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      ),
      label: "Man Efficiency",
      value: kpiValues.manEfficiency,
      unit: "%",
      meta: manEffMeta,
      pos: kpiValues.manEfficiency >= 85
    },
    {
      variant: "pa2-kpi--green",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      ),
      label: "Machine Efficiency",
      value: kpiValues.machineEfficiency,
      unit: "%",
      meta: kpiValues.machineEfficiency > 0 ? (kpiValues.machineEfficiency >= 85 ? "✔ Above Target" : "↑ Target: 85%") : "Target: 85%",
      pos: kpiValues.machineEfficiency >= 85
    },
    {
      variant: "pa2-kpi--blue",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      label: "Idle Accepted %",
      value: idleBreakdown.summary.accepted_pct,
      unit: "%",
      meta: "Of Total Idle Time",
      pos: true
    },
    {
      variant: "pa2-kpi--red",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      label: "Idle Non Accepted %",
      value: idleBreakdown.summary.non_accepted_pct,
      unit: "%",
      meta: "Needs Action",
      pos: false
    },
    {
      variant: "pa2-kpi--blue",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeDasharray="3 3" />
          <path d="M12 12L16 8" />
        </svg>
      ),
      label: "OEE %",
      value: kpiValues.overallOee,
      unit: "%",
      meta: oeeMeta,
      pos: kpiValues.overallOee >= 85
    },
    {
      variant: "pa2-kpi--purple",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="10" y1="2" x2="14" y2="2" />
          <line x1="12" y1="14" x2="15" y2="11" />
          <circle cx="12" cy="14" r="8" />
        </svg>
      ),
      label: "Machine Running Hrs",
      value: kpiValues.productionHours,
      unit: "hrs",
      meta: "Active Production",
      pos: false
    },
    {
      variant: "pa2-kpi--indigo",
      icon: (
        <svg width="20" height="20" viewBox="-11.5 -10.23174 23 20.46348" fill="none" stroke="currentColor" strokeWidth="1.2" className="pa2-react-logo-svg">
          <circle cx="0" cy="0" r="2" fill="currentColor" />
          <ellipse rx="11" ry="4.2" />
          <ellipse rx="11" ry="4.2" transform="rotate(60)" />
          <ellipse rx="11" ry="4.2" transform="rotate(120)" />
        </svg>
      ),
      label: "Tot CNC Mac",
      value: 32,
      unit: "Macs",
      meta: "Active CNC Machines",
      pos: false
    },
    {
      variant: "pa2-kpi--amber",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
      label: "Tot Conv Mac",
      value: 6,
      unit: "Macs",
      meta: "Active Conventional",
      pos: false
    },
    {
      variant: "pa2-kpi--blue",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
      label: "Tot Production Hrs",
      value: kpiValues.totalMachineHours,
      unit: "hrs",
      meta: "Scheduled Time",
      pos: false
    },
    {
      variant: "pa2-kpi--purple",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      ),
      label: "Tot Setting Hrs",
      value: kpiValues.settingHours,
      unit: "hrs",
      meta: `${settingHoursPct}% Setup Time`,
      pos: false
    },
    {
      variant: "pa2-kpi--amber",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
      label: "Tot Mac Rej Qty",
      value: Math.round(kpiValues.rejectionQty * 0.35),
      unit: "Units",
      meta: "Machine Issues",
      pos: false
    },
    {
      variant: "pa2-kpi--amber",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      ),
      label: "Tot Mat Rej Qty",
      value: Math.round(kpiValues.rejectionQty * 0.65),
      unit: "Units",
      meta: "Material Quality",
      pos: false
    },
    {
      variant: "pa2-kpi--amber",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
      ),
      label: "Tot Rework Qty",
      value: Math.round(kpiValues.totalProductionQty * 0.008),
      unit: "Units",
      meta: "Rework Required",
      pos: false
    },
    {
      variant: "pa2-kpi--green",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 11 11 13 15 9" />
        </svg>
      ),
      label: "Tot OK Qty",
      value: kpiValues.okAcceptedQty,
      unit: "Units",
      meta: "Accepted Parts",
      pos: true
    },
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
  const totalLoss = idleBreakdown.non_accepted.total_loss || 0;

  /* ── Production Value chart ─────────────────── */
  useEffect(() => {
    if (!pvChartRef.current) return;
    pvChartInst.current?.destroy();
    const isMachine = pvMode === "machine";
    const ctx = pvChartRef.current.getContext("2d");
    const machineData = pvChartData.machine_data;
    const monthData = pvChartData.month_data;
    pvChartInst.current = new Chart(ctx, {
      type: "bar",
      data: isMachine ? { labels: machineData.labels, datasets: [{ label: "Achieved Value (₹)", data: machineData.achieved, backgroundColor: machineData.labels.map((_, i) => { const palette = ["rgba(37,99,235,0.75)", "rgba(249,115,22,0.75)", "rgba(16,185,129,0.75)", "rgba(139,92,246,0.75)", "rgba(6,182,212,0.75)", "rgba(236,72,153,0.75)", "rgba(245,158,11,0.75)", "rgba(99,102,241,0.75)", "rgba(239,68,68,0.75)", "rgba(132,204,22,0.75)", "rgba(20,184,166,0.75)", "rgba(168,85,247,0.75)", "rgba(251,146,60,0.75)", "rgba(34,211,238,0.75)", "rgba(74,222,128,0.75)", "rgba(244,63,94,0.75)", "rgba(14,165,233,0.75)", "rgba(217,70,239,0.75)", "rgba(251,191,36,0.75)", "rgba(52,211,153,0.75)"]; return palette[i % palette.length]; }), borderColor: machineData.labels.map((_, i) => { const borders = ["#2563eb", "#f97316", "#10b981", "#8b5cf6", "#06b6d4", "#ec4899", "#f59e0b", "#6366f1", "#ef4444", "#84cc16", "#14b8a6", "#a855f7", "#fb923c", "#22d3ee", "#4ade80", "#f43f5e", "#0ea5e9", "#d946ef", "#fbbf24", "#34d399"]; return borders[i % borders.length]; }), borderWidth: 1.5, borderRadius: 7 }] } : { labels: monthData.labels, datasets: monthData.datasets.map(d => ({ ...d, borderRadius: 4 })) },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "top", labels: { font: { family: "'DM Sans','Outfit',sans-serif", size: 12, weight: "600" }, padding: 18, usePointStyle: true } }, tooltip: { callbacks: { label: ctx => ` ₹${ctx.parsed.y.toLocaleString("en-IN")}` } }, datalabels: isMachine ? { anchor: "end", align: "top", formatter: v => `₹${(v / 1000).toFixed(0)}K`, font: { size: 10, weight: "700" }, color: "#475569" } : false },
        scales: { x: { stacked: !isMachine, ticks: { font: { size: 11 }, maxRotation: isMachine ? 35 : 0 }, grid: { display: false } }, y: { stacked: !isMachine, beginAtZero: true, ticks: { callback: v => `₹${(v / 1000).toFixed(0)}K`, font: { size: 11 } }, grid: { color: "#f1f5f9" } } }
      }
    });
    return () => pvChartInst.current?.destroy();
  }, [pvMode, pvChartData]);

  /* ── Machine OEE Chart ─────────────────── */
  useEffect(() => {
    if (!oeeChartRef.current) return;
    oeeChartInst.current?.destroy();
    const ctx = oeeChartRef.current.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, "rgba(99, 102, 241, 0.35)");
    gradient.addColorStop(1, "rgba(99, 102, 241, 0.0)");

    const isMachine = oeeMode === "machine";
    const labels = isMachine
      ? allMachinesList.map(m => m.name)
      : ["Jan 26", "Feb 26", "Mar 26", "Apr 26", "May 26", "Jun 26", "Jul 26"];
    const oeeData = isMachine
      ? allMachinesList.map(m => macDetailData[m.name]?.oee || 0)
      : [73, 75, 72, 78, 81, 84, 82];

    oeeChartInst.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "OEE %",
          data: oeeData,
          borderColor: "#6366f1",
          borderWidth: 3,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#6366f1",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          backgroundColor: gradient,
          tension: 0.38,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` OEE: ${ctx.parsed.y}%` } },
          datalabels: {
            anchor: "end",
            align: "top",
            formatter: v => `${v}%`,
            font: { size: 10, weight: "700", family: "'Plus Jakarta Sans',sans-serif" },
            color: "#6366f1"
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans',sans-serif", size: 10, weight: "600" } }
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: v => `${v}%`, font: { family: "'Plus Jakarta Sans',sans-serif", size: 10 } },
            grid: { color: "#f1f5f9" }
          }
        }
      }
    });
    return () => oeeChartInst.current?.destroy();
  }, [pvChartData, oeeMode]);

  /* ── Setting Time Machine Wise Chart ─────── */
  useEffect(() => {
    if (!setChartRef.current) return;
    setChartInst.current?.destroy();
    const ctx = setChartRef.current.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, "rgba(139, 92, 246, 0.85)");
    gradient.addColorStop(1, "rgba(139, 92, 246, 0.25)");

    const labels = allMachinesList.map(m => m.name);
    // Setup time in hours (mock/derived values for visual rendering)
    const setTimeData = [0.8, 1.2, 1.5, 0.9, 1.1, 2.0, 0.6, 1.8, 0.7, 1.4, 0.9, 1.3];

    setChartInst.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Setup Time (hrs)",
          data: setTimeData,
          backgroundColor: gradient,
          borderColor: "#8b5cf6",
          borderWidth: 1.5,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` Setup: ${ctx.parsed.y} hrs` } },
          datalabels: {
            anchor: "end",
            align: "top",
            formatter: v => `${v}h`,
            font: { size: 10, weight: "700", family: "'Plus Jakarta Sans',sans-serif" },
            color: "#8b5cf6"
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans',sans-serif", size: 10, weight: "600" } }
          },
          y: {
            beginAtZero: true,
            ticks: { callback: v => `${v}h`, font: { family: "'Plus Jakarta Sans',sans-serif", size: 10 } },
            grid: { color: "#f1f5f9" }
          }
        }
      }
    });
    return () => setChartInst.current?.destroy();
  }, [pvChartData]);

  /* ── Machine Utilization Chart ──────────── */
  useEffect(() => {
    if (!utilChartRef.current) return;
    utilChartInst.current?.destroy();
    const ctx = utilChartRef.current.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, "rgba(20, 184, 166, 0.35)");
    gradient.addColorStop(1, "rgba(20, 184, 166, 0.0)");

    const labels = allMachinesList.map(m => m.name);
    // Machine utilization percentages
    const utilData = [88, 91, 74, 66, 85, 58, 79, 52, 82, 70, 80, 75];

    utilChartInst.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Utilization %",
          data: utilData,
          borderColor: "#14b8a6",
          borderWidth: 3,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#14b8a6",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          backgroundColor: gradient,
          tension: 0.38,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` Utilization: ${ctx.parsed.y}%` } },
          datalabels: {
            anchor: "end",
            align: "top",
            formatter: v => `${v}%`,
            font: { size: 10, weight: "700", family: "'Plus Jakarta Sans',sans-serif" },
            color: "#14b8a6"
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans',sans-serif", size: 10, weight: "600" } }
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: v => `${v}%`, font: { family: "'Plus Jakarta Sans',sans-serif", size: 10 } },
            grid: { color: "#f1f5f9" }
          }
        }
      }
    });
    return () => utilChartInst.current?.destroy();
  }, [pvChartData]);

  const filteredTableData = tableData.filter(row => {
    // 1. Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const part = (row.Part || "").toLowerCase();
      const proc = (row.Process || "").toLowerCase();
      const oper = (row.Operator || "").toLowerCase();
      const mac = (row.Machine || "").toLowerCase();
      if (!part.includes(q) && !proc.includes(q) && !oper.includes(q) && !mac.includes(q)) {
        return false;
      }
    }
    // 2. Machine Name
    if (filterMachine && row.Machine !== filterMachine) {
      return false;
    }
    // 3. Shift
    if (filterShift && row.Shift !== filterShift) {
      return false;
    }
    // 4. Operator
    if (filterOperator && row.Operator !== filterOperator) {
      return false;
    }
    // 5. Machine Type
    if (filterMacType) {
      const type = (row.Machine || "").toUpperCase();
      if (filterMacType === "CNC" && !type.includes("TC")) return false; // TC is CNC Turning
      if (filterMacType === "VMC" && !type.includes("VMC")) return false;
      if (filterMacType === "SPM" && !type.includes("SPM")) return false;
      if (filterMacType === "BROACHING" && !type.includes("BROACHING")) return false;
    }
    // 6. Machine Group
    if (filterMacGroup) {
      const mac = (row.Machine || "").toUpperCase();
      if (filterMacGroup === "Turning" && !mac.includes("TC")) return false;
      if (filterMacGroup === "Milling" && !mac.includes("VMC")) return false;
      if (filterMacGroup === "Drilling" && !mac.includes("SPM")) return false;
      if (filterMacGroup === "Other" && (mac.includes("TC") || mac.includes("VMC") || mac.includes("SPM"))) return false;
    }
    return true;
  });

  return (
    <div className={`pa2-wrap ${mounted ? "pa2-wrap--in" : ""}`}>
      {/* ── FILTERS ──────────────────────────────────── */}
      <div className="pa2-card pa2-filters pa2-anim" style={{ "--d": "0ms" }}>
        <div className="pa2-filters-grid">
          <div className="pa2-fg">
            <label>Date Range</label>
            <ProductionAnalysisDatePicker from={dateRange.from} to={dateRange.to} onChange={setDateRange} />
          </div>
          <div className="pa2-fg">
            <label>Search</label>
            <div className="pa2-search-input-wrapper">
              <svg className="pa2-search-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search routecard, operator, part..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <PremiumSelect
            label="Mac Name"
            value={filterMachine}
            onChange={setFilterMachine}
            placeholder="All Machines"
            options={[
              { value: "", label: "All Machines" },
              { value: "BROACHING-1", label: "BROACHING-1" },
              { value: "SPM-04", label: "SPM-04" },
              { value: "TC 43 L", label: "TC 43 L" },
              { value: "TC 50", label: "TC 50" },
              { value: "TC-59", label: "TC-59" },
              { value: "TC-60", label: "TC-60" },
              { value: "VMC-07", label: "VMC-07" },
              { value: "VMC 18", label: "VMC 18" },
            ]}
          />
          <PremiumSelect
            label="Shift"
            value={filterShift}
            onChange={setFilterShift}
            placeholder="All Shifts"
            options={[
              { value: "", label: "All Shifts" },
              { value: "A", label: "Shift A" },
              { value: "B", label: "Shift B" },
              { value: "C", label: "Shift C" },
            ]}
          />
          <PremiumSelect
            label="Operator"
            value={filterOperator}
            onChange={setFilterOperator}
            placeholder="All Operators"
            options={[
              { value: "", label: "All Operators" },
              { value: "Ramchandra Soran", label: "Ramchandra Soran" },
              { value: "Santhana Lakshmi", label: "Santhana Lakshmi" },
              { value: "Akash.A", label: "Akash.A" },
              { value: "Mohan Kewat", label: "Mohan Kewat" },
              { value: "Karthi.S", label: "Karthi.S" },
              { value: "Chandan Kumar", label: "Chandan Kumar" },
              { value: "Ajith.A", label: "Ajith.A" },
              { value: "Nagamani", label: "Nagamani" },
              { value: "Biswanath Dhungia", label: "Biswanath Dhungia" },
            ]}
          />
          <PremiumSelect
            label="Mac Type"
            value={filterMacType}
            onChange={setFilterMacType}
            placeholder="All Types"
            options={[
              { value: "", label: "All Types" },
              { value: "CNC", label: "CNC" },
              { value: "VMC", label: "VMC" },
              { value: "SPM", label: "SPM" },
              { value: "BROACHING", label: "BROACHING" },
            ]}
          />
          <PremiumSelect
            label="Mac Group"
            value={filterMacGroup}
            onChange={setFilterMacGroup}
            placeholder="All Groups"
            options={[
              { value: "", label: "All Groups" },
              { value: "Turning", label: "Turning" },
              { value: "Milling", label: "Milling" },
              { value: "Drilling", label: "Drilling" },
              { value: "Other", label: "Other" },
            ]}
          />
          <div className="pa2-fg-reset">
            <button
              type="button"
              className="pa2-filter-reset-btn"
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Reset
            </button>
          </div>
        </div>
      </div>
      {/* ── KPI CARDS ─────────────────────────────────── */}
      <div className="pa2-kpi-grid">
        {activeKpiData.map((k, i) => (
          <div key={i} className={`pa2-kpi ${k.variant} pa2-anim`} style={{ "--d": `${i * 55}ms` }}>
            <div className="pa2-kpi-hdr">
              <div className="pa2-kpi-label">{k.label}</div>
              <div className="pa2-kpi-icon-wrap">{k.icon}</div>
            </div>
            <div className="pa2-kpi-body">
              <div className="pa2-kpi-value">
                <AnimatedValue target={k.value} suffix="" />
                <span className="pa2-kpi-unit"> {k.unit}</span>
              </div>
            </div>
            <div className="pa2-kpi-footer">
              <div className={`pa2-kpi-meta ${k.pos ? "pa2-pos" : ""}`}>{k.meta}</div>
            </div>
          </div>
        ))}
      </div>
      {/* ── MACHINE DETAILS (Full-width Card) ── */}
      <div className="pa2-card pa2-anim pa2-macdetail-card" style={{ "--d": "70ms", marginBottom: "18px" }}>
        <div className="pa2-macdetail-hdr">
          <div className="pa2-macdetail-title-wrap">
            <div className="pa2-macdetail-icon-ring">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </div>
            <span className="pa2-macdetail-title">Machine Details</span>
            <div className="pa2-macdetail-badge">{filteredMachinesList.length} Machines</div>
          </div>
          <div className="pa2-macdetail-controls">
            <div className="pa2-macdetail-search-wrapper">
              <svg className="pa2-macdetail-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search machine..."
                value={searchMacQuery}
                onChange={e => setSearchMacQuery(e.target.value)}
                className="pa2-macdetail-search-input"
              />
            </div>
            <div className="pa2-macdetail-tabs">
              {["All", "CNC Turning", "Milling", "Special Purpose", "Broaching", "Conventional"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`pa2-macdetail-tab ${selectedMacTypeFilter === tab ? "pa2-macdetail-tab--active" : ""}`}
                  onClick={() => setSelectedMacTypeFilter(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="pa2-macdetails-scroll-container">
          {filteredMachinesList.length > 0 ? (
            <div className="pa2-machinedetails-grid">
              {filteredMachinesList.map((m, i) => (
                <div
                  key={i}
                  className="pa2-mac-chip"
                  style={{ "--ci": i, "--cc1": m.color }}
                  onClick={() => setSelectedMachine({ ...m, ...macDetailData[m.name] })}
                >
                  <div className="pa2-mac-chip-accent" />
                  <div className="pa2-mac-chip-body">
                    <div className="pa2-mac-chip-index">M{String(i + 1).padStart(2, "0")}</div>
                    <div className="pa2-mac-chip-name">{m.name}</div>
                    <div className="pa2-mac-chip-type">{m.type}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pa2-macdetail-empty">
              <div className="pa2-macdetail-empty-icon">🔍</div>
              <div className="pa2-macdetail-empty-title">No machines found</div>
              <div className="pa2-macdetail-empty-sub">Try adjusting your filters or search query</div>
            </div>
          )}
        </div>
      </div>

      {/* ── MACHINE DETAIL MODAL ── */}
      {selectedMachine && (() => {
        const totalRunHrs = selectedMachine.runs.reduce((acc, r) => acc + r.runHrs, 0).toFixed(1);
        const totalOkQty = selectedMachine.runs.reduce((acc, r) => acc + r.okQty, 0);
        return createPortal(
          <div className="pa2-modal-overlay" onClick={() => setSelectedMachine(null)}>
            <div className="pa2-modal" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="pa2-modal-hdr" style={{ "--mc": selectedMachine.color }}>
                <div className="pa2-modal-hdr-left">
                  <div className="pa2-modal-machine-icon">
                    <FiCpu size={18} />
                  </div>
                  <div>
                    <div className="pa2-modal-machine-name">{selectedMachine.name}</div>
                    <div className="pa2-modal-machine-type">{selectedMachine.type}</div>
                  </div>
                </div>
                <button className="pa2-modal-close" onClick={() => setSelectedMachine(null)}>
                  <FiXCircle size={18} />
                </button>
              </div>

              {/* KPI Strip */}
              <div className="pa2-modal-kpi-strip">
                {[
                  { label: "OEE %", value: `${selectedMachine.oee}%`, icon: <FiActivity />, color: selectedMachine.oee >= 75 ? "#059669" : "#dc2626" },
                  { label: "Opr Eff %", value: `${selectedMachine.oprEff}%`, icon: <FiUser />, color: selectedMachine.oprEff >= 80 ? "#059669" : "#f59e0b" },
                  { label: "Run Hrs", value: `${totalRunHrs} hrs`, icon: <FiClock />, color: "#2563eb" },
                  { label: "Idle Hrs", value: `${selectedMachine.idleHrs} hrs`, icon: <FiAlertTriangle />, color: "#94a3b8" },
                ].map((k, i) => (
                  <div key={i} className="pa2-modal-kpi-card" style={{ "--di": i }}>
                    <div className="pa2-modal-kpi-icon" style={{ color: k.color }}>{k.icon}</div>
                    <div className="pa2-modal-kpi-val" style={{ color: k.color }}>{k.value}</div>
                    <div className="pa2-modal-kpi-lbl">{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Multiple Operator / Part / Process Run Logs */}
              <div className="pa2-modal-section-title" style={{ "--di": 4 }}>Shift Logs</div>
              <div className="pa2-modal-table-wrapper" style={{ "--di": 5 }}>
                <table className="pa2-modal-table">
                  <thead>
                    <tr>
                      <th>Operator</th>
                      <th>Part No.</th>
                      <th>Process</th>
                      <th style={{ textAlign: "right" }}>Hrs</th>
                      <th style={{ textAlign: "right" }}>OK Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMachine.runs.map((r, idx) => (
                      <tr key={idx}>
                        <td className="pa2-modal-td-operator">
                          <div className="pa2-modal-op-avatar" style={{ background: selectedMachine.color }}>{r.operator.charAt(0)}</div>
                          <span>{r.operator}</span>
                        </td>
                        <td><span className="pa2-modal-badge-part">{r.partNo}</span></td>
                        <td><span className="pa2-modal-text-process">{r.process}</span></td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: "#475569" }}>{r.runHrs}h</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#059669" }}>{r.okQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Production Qty Row */}
              <div className="pa2-modal-section-title" style={{ "--di": 6 }}>Total Production Quantities</div>
              <div className="pa2-modal-qty-row" style={{ "--di": 7 }}>
                <div className="pa2-modal-qty pa2-modal-qty--ok">
                  <div className="pa2-modal-qty-val">
                    <FiCheckCircle size={18} style={{ marginRight: 6, verticalAlign: "middle", opacity: 0.8 }} />
                    {totalOkQty}
                  </div>
                  <div className="pa2-modal-qty-lbl">OK Qty</div>
                </div>
                <div className="pa2-modal-qty pa2-modal-qty--rej">
                  <div className="pa2-modal-qty-val">
                    <FiXCircle size={18} style={{ marginRight: 6, verticalAlign: "middle", opacity: 0.8 }} />
                    {selectedMachine.rejQty}
                  </div>
                  <div className="pa2-modal-qty-lbl">Rej Qty</div>
                </div>
                <div className="pa2-modal-qty pa2-modal-qty--rw">
                  <div className="pa2-modal-qty-val">
                    <FiRefreshCw size={16} style={{ marginRight: 6, verticalAlign: "middle", opacity: 0.8 }} />
                    {selectedMachine.rwQty}
                  </div>
                  <div className="pa2-modal-qty-lbl">Rework Qty</div>
                </div>
              </div>

              {/* OEE & Efficiency Progress Bars */}
              <div className="pa2-modal-section-title" style={{ "--di": 8, marginTop: "18px" }}>Efficiency Overview</div>
              <div className="pa2-modal-bar-list" style={{ "--di": 9 }}>
                {[
                  { label: "OEE %", pct: selectedMachine.oee, color: selectedMachine.oee >= 75 ? "#059669" : "#dc2626" },
                  { label: "Operator Eff %", pct: selectedMachine.oprEff, color: selectedMachine.oprEff >= 80 ? "#059669" : "#f59e0b" },
                  { label: "Machine Run %", pct: Math.round((totalRunHrs / 8) * 100), color: "#2563eb" },
                ].map((b, i) => (
                  <div key={i} className="pa2-modal-bar-row">
                    <div className="pa2-modal-bar-label">{b.label}</div>
                    <div className="pa2-modal-bar-track">
                      <div className="pa2-modal-bar-fill" style={{ "--bw": `${b.pct}%`, background: b.color }} />
                    </div>
                    <div className="pa2-modal-bar-pct" style={{ color: b.color }}>{b.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          , document.body);
      })()}

      {/* ── DAILY SUMMARY + EFFICIENCY (side by side) ── */}
      <div className="pa2-row-2">
        <div className="pa2-card pa2-anim" style={{ "--d": "80ms" }}>
          <SectionHeader icon={<FiList size={16} />} title="Daily Production Summary" />
          <div className="pa2-summary-grid">
            {[{ label: "Total Shifts", value: kpiValues.totalShifts }, { label: "Avg Prod / Shift", value: kpiValues.avgProdPerShift }, { label: "Peak Shift Output", value: kpiValues.peakShiftOutput }, { label: "Lowest Shift Output", value: kpiValues.lowestShiftOutput }, { label: "Active Machines", value: kpiValues.activeMachines }, { label: "Idle Machines", value: kpiValues.idleMachines }].map((s, i) => (
              <div key={i} className="pa2-summary-chip"><div className="pa2-summary-lbl">{s.label}</div><div className="pa2-summary-val"><AnimatedValue target={s.value} /></div></div>
            ))}
          </div>
        </div>
        <div className="pa2-card pa2-anim" style={{ "--d": "120ms" }}>
          <SectionHeader icon={<FiAward size={16} />} title="Machine & Operator Efficiency" />
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
          <SectionHeader icon={<FiDollarSign size={16} />} title="Production Value Report" sub="Machine-wise bar chart / Month-wise stacked bar — Production Value (₹)" />
          <div className="pa2-pv-toggle">
            <button className={`pa2-pv-tab ${pvMode === "machine" ? "pa2-pv-tab--active" : ""}`} onClick={() => setPvMode("machine")}><FiCpu size={12} style={{ marginRight: "5px", verticalAlign: "middle" }} />Machine Wise</button>
            <button className={`pa2-pv-tab ${pvMode === "month" ? "pa2-pv-tab--active" : ""}`} onClick={() => setPvMode("month")}><FiCalendar size={12} style={{ marginRight: "5px", verticalAlign: "middle" }} />Month Wise</button>
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

      {/* ── MACHINE OEE GRAPH ── */}
      <div className="pa2-card pa2-anim" style={{ "--d": "110ms", marginTop: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.2rem" }}>
          <SectionHeader icon={<FiTrendingUp size={16} />} title="Machine Overall Equipment Effectiveness (OEE %)" sub="OEE performance trend analysis — Machine-wise / Month-wise" />
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#6366f1", background: "rgba(99, 102, 241, 0.08)", padding: "5px 12px", borderRadius: "99px", marginRight: "6px" }}>
              Target: 75% Min OEE
            </span>
            <div className="pa2-pv-toggle">
              <button className={`pa2-pv-tab ${oeeMode === "machine" ? "pa2-pv-tab--active" : ""}`} onClick={() => setOeeMode("machine")}><FiCpu size={12} style={{ marginRight: "5px", verticalAlign: "middle" }} />Machine Wise</button>
              <button className={`pa2-pv-tab ${oeeMode === "month" ? "pa2-pv-tab--active" : ""}`} onClick={() => setOeeMode("month")}><FiCalendar size={12} style={{ marginRight: "5px", verticalAlign: "middle" }} />Month Wise</button>
            </div>
          </div>
        </div>
        <div style={{ height: 260, marginTop: "0.5rem" }}>
          <canvas ref={oeeChartRef} />
        </div>
      </div>

      {/* ── SETTING TIME & MACHINE UTILIZATION SIDE BY SIDE ── */}
      <div className="pa2-row-2" style={{ marginTop: "18px", marginBottom: "18px" }}>
        <div className="pa2-card pa2-anim" style={{ "--d": "120ms" }}>
          <SectionHeader icon={<FiClock size={16} />} title="Setup Time Machine-Wise" sub="Setup / setting hours comparison across all machines" />
          <div style={{ height: 250, marginTop: "1.2rem" }}>
            <canvas ref={setChartRef} />
          </div>
        </div>
        <div className="pa2-card pa2-anim" style={{ "--d": "130ms" }}>
          <SectionHeader icon={<FiActivity size={16} />} title="Machine Utilization (%)" sub="Active machine running time as percentage of total hours" />
          <div style={{ height: 250, marginTop: "1.2rem" }}>
            <canvas ref={utilChartRef} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
NEW §2 — IDLE HOURS: ACCEPTED vs NON-ACCEPTED
══════════════════════════════════════════════ */}
      <div className="pa2-row-2">
        <div className="pa2-card pa2-anim" style={{ "--d": "80ms" }}>
          <SectionHeader icon={<FiCheckCircle size={16} />} title="Idle Hours — Accepted Reasons" sub={`Total: ${totalAcceptedHrs.toFixed(1)} hrs  (${idleBreakdown.summary.accepted_pct}%)`} />
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
          <SectionHeader icon={<FiAlertCircle size={16} />} title="Idle Hours — Non-Accepted Reasons" sub={`Total: ${totalNonAccepted.toFixed(1)} hrs  |  ⚠ Needs Action (${idleBreakdown.summary.non_accepted_pct}%)`} />
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
        <SectionHeader icon={<FiTrendingDown size={16} />} title="Production Loss — Non-Accepted Idle Hours × Rate per Hour" sub="Financial impact of unplanned downtime based on process-specific production rate" />
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
        <SectionHeader icon={<FiTable size={16} />} title="Daily Production Details" sub={tableLoading ? "Loading…" : `${filteredTableData.length} shift record(s)`} />
        <div className="pa2-table-wrap">
          <table className="pa2-table">
            <thead><tr>{["#", "Date", "Machine", "Shift", "Operator", "Part", "Process", "Target", "OK Qty", "Rej", "Eff %", "OEE %", "Status"].map(h => (<th key={h}>{h}</th>))}</tr></thead>
            <tbody>
              {tableLoading && (
                <tr><td colSpan={13} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", fontStyle: "italic" }}>Loading production data…</td></tr>
              )}
              {!tableLoading && filteredTableData.length === 0 && (
                <tr><td colSpan={13} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", fontStyle: "italic" }}>No production records found matching the filters.</td></tr>
              )}
              {!tableLoading && filteredTableData.map((row, i) => {
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