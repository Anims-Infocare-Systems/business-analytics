import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { FiCpu, FiUser, FiLayers, FiClock, FiActivity, FiCheckCircle, FiXCircle, FiRefreshCw, FiAlertTriangle, FiList, FiAward, FiDollarSign, FiAlertCircle, FiTrendingDown, FiTable, FiTrendingUp, FiCalendar, FiLoader, FiPlus, FiX, FiSettings } from "react-icons/fi";
import { Chart, registerables } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "./ProductionAnalysis.css";
import ProductionAnalysisDatePicker from "./ProductionAnalysisDatePicker";
import { resolveApiBase } from "../../apiBase";
Chart.register(...registerables, ChartDataLabels);

// Global premium styling overrides for Chart.js
const PA2_FONT = "'Plus Jakarta Sans', 'Outfit', 'Inter', system-ui, sans-serif";
Chart.defaults.font.family = PA2_FONT;
Chart.defaults.font.size = 11;
Chart.defaults.font.weight = "500";
Chart.defaults.color = "#64748b"; // Sleek slate-500 text color
Chart.defaults.plugins.legend.labels.font = { family: PA2_FONT, size: 11, weight: "600" };
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.animation.duration = 600;
Chart.defaults.animation.easing = "easeOutQuart";

// Premium Custom Tooltips
Chart.defaults.plugins.tooltip.backgroundColor = "rgba(15, 23, 42, 0.94)"; // Dark slate transparent back
Chart.defaults.plugins.tooltip.titleColor = "#ffffff";
Chart.defaults.plugins.tooltip.titleFont = { family: PA2_FONT, size: 12, weight: "700" };
Chart.defaults.plugins.tooltip.bodyColor = "#cbd5e1"; // Light slate text
Chart.defaults.plugins.tooltip.bodyFont = { family: PA2_FONT, size: 12, weight: "500" };
Chart.defaults.plugins.tooltip.padding = { top: 8, bottom: 8, left: 12, right: 12 };
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.borderColor = "rgba(255, 255, 255, 0.08)";
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.displayColors = true;
Chart.defaults.plugins.tooltip.boxWidth = 8;
Chart.defaults.plugins.tooltip.boxHeight = 8;
Chart.defaults.plugins.tooltip.boxPadding = 6;
Chart.defaults.plugins.tooltip.usePointStyle = true;
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
SORT ICON (utility component)
═══════════════════════════════════════════════ */
const SortIcon = ({ active, direction }) => {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
      transform: active && direction === "asc" ? "rotate(180deg)" : "rotate(0deg)",
      opacity: active ? 1 : 0.45,
      marginLeft: "8px",
      color: active ? "#3b82f6" : "#94a3b8",
      verticalAlign: "middle",
      background: active ? "rgba(59, 130, 246, 0.08)" : "transparent",
      borderRadius: "4px",
      padding: "2px",
      width: "16px",
      height: "16px"
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </svg>
    </span>
  );
};

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

function PremiumSelectMulti({ label, value, options, onChange, placeholder = "Select..." }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const toggleOption = (optVal) => {
    if (!optVal) {
      onChange([]);
      return;
    }
    const idx = value.indexOf(optVal);
    if (idx >= 0) {
      const next = value.filter(v => v !== optVal);
      onChange(next);
    } else {
      onChange([...value, optVal]);
    }
  };

  const filteredOpts = options.filter(opt => {
    if (!opt.value) return false;
    return opt.label.toLowerCase().includes(search.toLowerCase());
  });

  const allSelected = value.length === 0;

  let triggerText = placeholder;
  if (value.length > 0) {
    if (value.length === 1) {
      triggerText = options.find(o => o.value === value[0])?.label || placeholder;
    } else {
      triggerText = `${value.length} Selected`;
    }
  }

  return (
    <div className="pa2-fg" ref={containerRef} style={{ minWidth: '200px' }}>
      {label && <label>{label}</label>}
      <div className="pa2-ps-wrap">
        <button
          type="button"
          className={`pa2-ps-trigger ${open ? "pa2-ps-trigger--open" : ""} ${value.length > 0 ? "pa2-ps-trigger--selected" : ""}`}
          onClick={() => setOpen(o => !o)}
          style={{ width: '100%' }}
        >
          <span className="pa2-ps-txt" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '145px' }}>
            {triggerText}
          </span>
          <svg className="pa2-ps-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {open && (
          <div className="pa2-ps-menu" style={{ width: '220px', padding: '8px', zIndex: 999, minWidth: '220px' }}>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 26px 6px 26px',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  border: '1.5px solid #e2e8f0',
                  background: '#f8fafc',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'Poppins',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2d6de8';
                  e.target.style.background = '#ffffff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(45, 109, 232, 0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.background = '#f8fafc';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSearch(""); }}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px'
                  }}
                >
                  <FiX size={10} style={{ strokeWidth: 3 }} />
                </button>
              )}
            </div>

            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {!search && (
                <button
                  type="button"
                  className={`pa2-ps-item ${allSelected ? "pa2-ps-item--active" : ""}`}
                  onClick={() => toggleOption("")}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'left',
                    padding: '8px 10px',
                    width: '100%',
                    background: allSelected ? 'rgba(45, 109, 232, 0.06)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    color: allSelected ? '#2d6de8' : '#475569',
                    fontWeight: allSelected ? 700 : 500,
                    fontFamily: 'Poppins',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '14px',
                      height: '14px',
                      borderRadius: '3.5px',
                      border: allSelected ? '1.5px solid #2d6de8' : '1.5px solid #cbd5e1',
                      background: allSelected ? '#2d6de8' : 'transparent',
                      transition: 'all 0.18s ease',
                      flexShrink: 0
                    }}
                  >
                    {allSelected && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span>{options[0]?.label || "All"}</span>
                </button>
              )}

              {filteredOpts.map(opt => {
                const selected = value.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`pa2-ps-item ${selected ? "pa2-ps-item--active" : ""}`}
                    onClick={() => toggleOption(opt.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textAlign: 'left',
                      padding: '8px 10px',
                      width: '100%',
                      background: selected ? 'rgba(45, 109, 232, 0.06)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      color: selected ? '#2d6de8' : '#475569',
                      fontWeight: selected ? 700 : 500,
                      fontFamily: 'Poppins',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '14px',
                        height: '14px',
                        borderRadius: '3.5px',
                        border: selected ? '1.5px solid #2d6de8' : '1.5px solid #cbd5e1',
                        background: selected ? '#2d6de8' : 'transparent',
                        transition: 'all 0.18s ease',
                        flexShrink: 0
                      }}
                    >
                      {selected && (
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span>{opt.label}</span>
                  </button>
                );
              })}

              {filteredOpts.length === 0 && search && (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.75rem', padding: '16px 4px', fontFamily: 'Poppins' }}>
                  No matches found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function writeFilterSession(key, data) {
  try { sessionStorage.setItem(key, JSON.stringify(data)); } catch { }
}

const MHR_PRESETS = {
  "Custom (Manual)": {
    machineCost: 1000000,
    machineLife: 10,
    annualHours: 2000,
    insurance: 8000,
    allocatedRent: 15000,
    supervisorSalary: 12000,
    interestRate: 10,
    operatorSalary: 144000,
    electricity: 100000,
    maintenance: 25000,
    consumables: 18000,
    toolWear: 20000,
  },
  "HTC 1": {
    machineCost: 1200000,
    machineLife: 10,
    annualHours: 2400,
    insurance: 10000,
    allocatedRent: 18000,
    supervisorSalary: 14000,
    interestRate: 9,
    operatorSalary: 160000,
    electricity: 120000,
    maintenance: 30000,
    consumables: 20000,
    toolWear: 25000,
  },
  "HTC 2": {
    machineCost: 1250000,
    machineLife: 10,
    annualHours: 2400,
    insurance: 10000,
    allocatedRent: 18000,
    supervisorSalary: 14000,
    interestRate: 9.5,
    operatorSalary: 160000,
    electricity: 125000,
    maintenance: 32000,
    consumables: 22000,
    toolWear: 26000,
  },
  "HTC 3": {
    machineCost: 1100000,
    machineLife: 10,
    annualHours: 2000,
    insurance: 8000,
    allocatedRent: 15000,
    supervisorSalary: 12000,
    interestRate: 10,
    operatorSalary: 144000,
    electricity: 100000,
    maintenance: 25000,
    consumables: 18000,
    toolWear: 20000,
  },
  "VMC 1": {
    machineCost: 1800000,
    machineLife: 12,
    annualHours: 2200,
    insurance: 15000,
    allocatedRent: 22000,
    supervisorSalary: 18000,
    interestRate: 10,
    operatorSalary: 180000,
    electricity: 150000,
    maintenance: 40000,
    consumables: 30000,
    toolWear: 35000,
  },
  "VMC 2": {
    machineCost: 1850000,
    machineLife: 12,
    annualHours: 2200,
    insurance: 16000,
    allocatedRent: 24000,
    supervisorSalary: 19000,
    interestRate: 10,
    operatorSalary: 180000,
    electricity: 155000,
    maintenance: 42000,
    consumables: 32000,
    toolWear: 36000,
  },
  "VTL 1": {
    machineCost: 2000000,
    machineLife: 15,
    annualHours: 2500,
    insurance: 20000,
    allocatedRent: 30000,
    supervisorSalary: 20000,
    interestRate: 10,
    operatorSalary: 200000,
    electricity: 180000,
    maintenance: 50000,
    consumables: 40000,
    toolWear: 45000,
  },
  "VTL 2": {
    machineCost: 2100000,
    machineLife: 15,
    annualHours: 2500,
    insurance: 22000,
    allocatedRent: 32000,
    supervisorSalary: 22000,
    interestRate: 10,
    operatorSalary: 200000,
    electricity: 190000,
    maintenance: 52000,
    consumables: 42000,
    toolWear: 48000,
  },
  "VTL 3": {
    machineCost: 2200000,
    machineLife: 15,
    annualHours: 2500,
    insurance: 24000,
    allocatedRent: 34000,
    supervisorSalary: 24000,
    interestRate: 10,
    operatorSalary: 200000,
    electricity: 200000,
    maintenance: 55000,
    consumables: 44000,
    toolWear: 50000,
  },
  "VTL 4": {
    machineCost: 2300000,
    machineLife: 15,
    annualHours: 2500,
    insurance: 26000,
    allocatedRent: 36000,
    supervisorSalary: 26000,
    interestRate: 10,
    operatorSalary: 200000,
    electricity: 210000,
    maintenance: 58000,
    consumables: 46000,
    toolWear: 52000,
  },
  "VMC-3": {
    machineCost: 1950000,
    machineLife: 12,
    annualHours: 2200,
    insurance: 17000,
    allocatedRent: 26000,
    supervisorSalary: 20000,
    interestRate: 10,
    operatorSalary: 180000,
    electricity: 160000,
    maintenance: 45000,
    consumables: 34000,
    toolWear: 38000,
  },
  "MANUAL 1": {
    machineCost: 500000,
    machineLife: 8,
    annualHours: 1800,
    insurance: 4000,
    allocatedRent: 10000,
    supervisorSalary: 8000,
    interestRate: 8,
    operatorSalary: 120000,
    electricity: 40000,
    maintenance: 15000,
    consumables: 10000,
    toolWear: 10000,
  },
};

export default function ProductionAnalysis() {
  const _dflt = { from: new Date(2026, 1, 1), to: new Date(2026, 1, 28) };
  const _saved = readFilterSession("ba_filter_production", _dflt);
  const [dateRange, setDateRange] = useState({ from: _saved.from, to: _saved.to });

  // ── MHR Calculator State ──
  const [mhrModalOpen, setMhrModalOpen] = useState(false);
  const [mhrSelectedMachine, setMhrSelectedMachine] = useState("HTC 1");
  const [mhrMachinesInputs, setMhrMachinesInputs] = useState({
    "HTC 1": { ...MHR_PRESETS["HTC 1"] },
    "HTC 2": { ...MHR_PRESETS["HTC 2"] },
    "HTC 3": { ...MHR_PRESETS["HTC 3"] },
    "VMC 1": { ...MHR_PRESETS["VMC 1"] },
    "VMC 2": { ...MHR_PRESETS["VMC 2"] },
    "VTL 1": { ...MHR_PRESETS["VTL 1"] },
    "VTL 2": { ...MHR_PRESETS["VTL 2"] },
    "VTL 3": { ...MHR_PRESETS["VTL 3"] },
    "VTL 4": { ...MHR_PRESETS["VTL 4"] },
    "VMC-3": { ...MHR_PRESETS["VMC-3"] },
    "MANUAL 1": { ...MHR_PRESETS["MANUAL 1"] },
    "Custom (Manual)": { ...MHR_PRESETS["Custom (Manual)"] }
  });

  const mhrChartRef = useRef(null);
  const mhrTrendChartInst = useRef(null);
  const [filterMachine, setFilterMachine] = useState([]);
  const [filterShift, setFilterShift] = useState("");
  const [filterProcess, setFilterProcess] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOperator, setFilterOperator] = useState([]);
  const [filterMacType, setFilterMacType] = useState("");
  const [filterMacGroup, setFilterMacGroup] = useState("");
  const [mounted, setMounted] = useState(false);
  const [pvMode, setPvMode] = useState("machine"); // "machine" | "month"
  const [oeeMode, setOeeMode] = useState("machine"); // "machine" | "month"
  const [oeeTrend, setOeeTrend] = useState({ labels: [], data: [] });
  const [macAddedTrend, setMacAddedTrend] = useState({ labels: [], counts: [], machineList: [] });
  const [macEffTrend, setMacEffTrend] = useState({ labels: [], data: [] });
  const [pvChartType, setPvChartType] = useState("bar"); // "bar" | "line"
  const [oeeChartType, setOeeChartType] = useState("line"); // "line" | "bar"
  const [selectedMacTypeFilter, setSelectedMacTypeFilter] = useState("All");
  const [searchMacQuery, setSearchMacQuery] = useState("");
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [setupFilterMode, setSetupFilterMode] = useState("machine"); // "machine" | "month" | "part" | "shift"
  const [setupFilterOpen, setSetupFilterOpen] = useState(false);
  const setupDropdownRef = useRef(null);
  const [setupSortField, setSetupSortField] = useState(null);
  const [setupSortDirection, setSetupSortDirection] = useState("asc");
  const [setupSelectedParts, setSetupSelectedParts] = useState([]);
  const [setupChartType, setSetupChartType] = useState("bar"); // "bar" | "line"
  const [setupChartTypeOpen, setSetupChartTypeOpen] = useState(false);
  const setupChartTypeDropdownRef = useRef(null);
  const [utilChartType, setUtilChartType] = useState("area"); // "area" | "line" | "bar"
  const [utilChartTypeOpen, setUtilChartTypeOpen] = useState(false);
  const utilChartTypeDropdownRef = useRef(null);
  const [utilFilterMode, setUtilFilterMode] = useState("machine"); // "machine" | "week" | "month" | "shift"
  const [utilFilterOpen, setUtilFilterOpen] = useState(false);
  const utilFilterDropdownRef = useRef(null);
  const [utilThresholdVal, setUtilThresholdVal] = useState("");
  const [utilThresholdOpen, setUtilThresholdOpen] = useState(false);
  const utilThresholdDropdownRef = useRef(null);
  const [qualitySortField, setQualitySortField] = useState(null);
  const [qualitySortDirection, setQualitySortDirection] = useState("asc");
  const [dailySortField, setDailySortField] = useState(null);
  const [dailySortDirection, setDailySortDirection] = useState("asc");
  const pvChartRef = useRef(null);
  const pvChartInst = useRef(null);
  const oeeChartRef = useRef(null);
  const oeeChartInst = useRef(null);
  const setChartRef = useRef(null);
  const setChartInst = useRef(null);
  const utilChartRef = useRef(null);
  const utilChartInst = useRef(null);
  const macAddedChartRef = useRef(null);
  const macAddedChartInst = useRef(null);
  const macEffTrendChartRef = useRef(null);
  const macEffTrendChartInst = useRef(null);
  const qualityChartRef = useRef(null);
  const qualityChartInst = useRef(null);
  const [pvChartData, setPvChartData] = useState({
    machine_data: { labels: [], achieved: [] },
    month_data: { labels: [], datasets: [] },
  });
  const [idleBreakdown, setIdleBreakdown] = useState(_IDLE_BREAKDOWN_EMPTY);
  const [kpiValues, setKpiValues] = useState({
    totalProductionQty: 0, okAcceptedQty: 0, rejectionQty: 0, overallOee: 0.0, productionHours: 0.0, totalMachineHours: 0.0, idleHours: 0.0, settingHours: 0.0, manEfficiency: 0.0, totalShifts: 0, avgProdPerShift: 0.0, peakShiftOutput: 0, lowestShiftOutput: 0, activeMachines: 0, idleMachines: 0, machineUtilization: 0.0, machineEfficiency: 0.0, operatorEfficiency: 0.0, qualityRate: 0.0, materialRejection: 0.0, machineRejection: 0.0, totCncMac: 0, totConvMac: 0
  });
  const [machines, setMachines] = useState([]);
  const [cardData, setCardData] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Dynamic filter options states loaded from ERP database
  const [macOptions, setMacOptions] = useState([
    { value: "", label: "All Machines" },
    { value: "BROACHING-1", label: "BROACHING-1" },
    { value: "SPM-04", label: "SPM-04" },
    { value: "TC 43 L", label: "TC 43 L" },
    { value: "TC 50", label: "TC 50" },
    { value: "TC-59", label: "TC-59" },
    { value: "TC-60", label: "TC-60" },
    { value: "VMC-07", label: "VMC-07" },
    { value: "VMC 18", label: "VMC 18" },
  ]);
  const [shiftOptions, setShiftOptions] = useState([
    { value: "", label: "All Shifts" },
    { value: "A", label: "Shift A" },
    { value: "B", label: "Shift B" },
    { value: "C", label: "Shift C" },
  ]);
  const [operatorOptions, setOperatorOptions] = useState([
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
  ]);

  useEffect(() => {
    fetch(`${API_BASE}/production-analysis/filters/`, { credentials: "include" })
      .then(res => res.json().catch(() => ({})))
      .then(data => {
        if (data && data.status === "success" && data.data) {
          const d = data.data;
          if (d.machines && Array.isArray(d.machines)) {
            setMacOptions([
              { value: "", label: "All Machines" },
              ...d.machines
            ]);
          }
          if (d.shifts && Array.isArray(d.shifts)) {
            setShiftOptions([
              { value: "", label: "All Shifts" },
              ...d.shifts
            ]);
          }
          if (d.operators && Array.isArray(d.operators)) {
            setOperatorOptions([
              { value: "", label: "All Operators" },
              ...d.operators
            ]);
          }
        }
      })
      .catch(err => console.error("Error fetching production analysis filters:", err));
  }, []);

  const allMachinesList = useMemo(() => {
    return machines || [];
  }, [machines]);

  const topUtilizationData = useMemo(() => {
    const sorted = [...allMachinesList]
      .sort((a, b) => (b.utilization || 0) - (a.utilization || 0))
      .slice(0, 10);
    return sorted.map((m, idx) => ({
      rank: idx + 1,
      machine: m.name,
      utilization: m.utilization || 0,
      runningHrs: m.runningHrs || 0,
      idleHrs: m.idleHrs || 0
    }));
  }, [allMachinesList]);

  const topOeeData = useMemo(() => {
    const sorted = [...allMachinesList]
      .sort((a, b) => (b.oee || 0) - (a.oee || 0))
      .slice(0, 5);
    return sorted.map((m, idx) => ({
      rank: idx + 1,
      machine: m.name,
      oee: m.oee || 0,
      type: m.type || "Other"
    }));
  }, [allMachinesList]);

  const leastOeeData = useMemo(() => {
    const sorted = [...allMachinesList]
      .sort((a, b) => (a.oee || 0) - (b.oee || 0))
      .slice(0, 5);
    return sorted.map((m, idx) => ({
      rank: idx + 1,
      machine: m.name,
      oee: m.oee || 0,
      type: m.type || "Other"
    }));
  }, [allMachinesList]);

  const machineCategories = useMemo(() => {
    const groups = new Set();
    allMachinesList.forEach((m) => {
      if (m.type) groups.add(m.type);
    });
    return ["All", ...Array.from(groups)];
  }, [allMachinesList]);

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
    setFilterMachine([]);
    setFilterShift("");
    setFilterOperator([]);
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
      value: kpiValues.totCncMac,
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
      value: kpiValues.totConvMac,
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
    if (filterMachine && filterMachine.length > 0 && !filterMachine.includes(row.Machine)) {
      return false;
    }
    // 3. Shift
    if (filterShift && row.Shift !== filterShift) {
      return false;
    }
    // 4. Operator
    if (filterOperator && filterOperator.length > 0 && !filterOperator.includes(row.Operator)) {
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

  const sortedTableData = useMemo(() => {
    if (!dailySortField) return filteredTableData;
    return [...filteredTableData].sort((a, b) => {
      let valA = a[dailySortField];
      let valB = b[dailySortField];

      if (dailySortField === "MatRej") {
        const getMatRej = r => r.MaterialRejection ?? r.MatRej ?? (r.Rej ? Math.floor(r.Rej * 0.6) : 0);
        valA = getMatRej(a);
        valB = getMatRej(b);
      } else if (dailySortField === "MacRej") {
        const getMacRej = r => r.MachineRejection ?? r.MacRej ?? (r.Rej ? (r.Rej - Math.floor(r.Rej * 0.6)) : 0);
        valA = getMacRej(a);
        valB = getMacRej(b);
      } else if (dailySortField === "RwQty") {
        const getRwQty = r => r.ReworkQty ?? r.RwQty ?? (r.OKQty ? Math.max(0, (r.SNo % 3 === 0 ? Math.floor(r.OKQty * 0.05) : 0)) : 0);
        valA = getRwQty(a);
        valB = getRwQty(b);
      } else if (dailySortField === "IdleHrs") {
        const getIdleHrs = r => r.IdleHours ?? r.IdleHrs ?? (r.Rej > 0 || r.OKQty < r.Target ? parseFloat((Math.max(0.2, (r.Target - r.OKQty) * 0.1)).toFixed(1)) : 0);
        valA = getIdleHrs(a);
        valB = getIdleHrs(b);
      } else if (dailySortField === "Date") {
        const dateA = valA ? new Date(valA).getTime() : 0;
        const dateB = valB ? new Date(valB).getTime() : 0;
        return dailySortDirection === "asc" ? dateA - dateB : dateB - dateA;
      }

      if (typeof valA === "string") {
        return dailySortDirection === "asc" ? (valA || "").localeCompare(valB || "") : (valB || "").localeCompare(valA || "");
      }

      const numA = parseFloat(valA) || 0;
      const numB = parseFloat(valB) || 0;
      return dailySortDirection === "asc" ? numA - numB : numB - numA;
    });
  }, [filteredTableData, dailySortField, dailySortDirection]);

  const handleDailySort = (field) => {
    if (dailySortField === field) {
      setDailySortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setDailySortField(field);
      setDailySortDirection("asc");
    }
  };

  /* ── Setup Time & effectiveness details derived from live data or fallbacks ── */
  const settingTableData = useMemo(() => {
    let list = [];
    if (filteredTableData.length > 0) {
      list = filteredTableData.map((row, idx) => {
        // Deterministic mock setting times based on operator/machine to look realistic
        const hash = (row.Machine || "").charCodeAt((row.Machine || "").length - 1) || 0;
        const rawSettingTime = 0.5 + ((hash % 4) * 0.4) + ((idx % 3) * 0.2); // e.g. 0.5, 0.9, 1.3...
        const settingTime = row.SettingTime !== undefined && row.SettingTime !== null ? parseFloat(row.SettingTime) : parseFloat(rawSettingTime.toFixed(1));
        const defSettingTime = row.DefaultSettingTime !== undefined && row.DefaultSettingTime !== null ? parseFloat(row.DefaultSettingTime) : parseFloat((0.8 + ((hash % 3) * 0.3)).toFixed(1));

        // effectiveness = (Standard / Actual) * 100
        const effectiveness = settingTime > 0 ? Math.round((defSettingTime / settingTime) * 100) : 0;

        return {
          sno: idx + 1,
          date: row.Date ? new Date(row.Date).toLocaleDateString("en-IN") : "—",
          macNo: row.Machine || "—",
          shift: row.Shift || "—",
          partNo: row.Part || "—",
          process: row.Process || "—",
          operatorName: row.Operator || "—",
          settingTime: settingTime,
          defaultSettingTime: defSettingTime,
          effectiveness: effectiveness
        };
      });
    } else {
      // Fallback Mock Data if no tableData is loaded yet
      const fallbackMachines = [
        { date: "09-Jul-2026", macNo: "TC-60", shift: "Shift A", partNo: "THRUST PLATE", process: "KEYWAY", operatorName: "Santhana Lakshmi", settingTime: 1.2, defaultSettingTime: 1.0 },
        { date: "09-Jul-2026", macNo: "TC-59", shift: "Shift B", partNo: "SEGMENT CARRIER", process: "CNC TURNING I", operatorName: "Ramchandra Soran", settingTime: 0.8, defaultSettingTime: 1.0 },
        { date: "08-Jul-2026", macNo: "VMC-07", shift: "Shift A", partNo: "TOP BEARING BODY", process: "DRILLING-1", operatorName: "Biswanath Dhungia", settingTime: 1.5, defaultSettingTime: 1.2 },
        { date: "08-Jul-2026", macNo: "TC 50", shift: "Shift B", partNo: "BOTTOM BEARING", process: "DRILLING TAPPING", operatorName: "Akash.A", settingTime: 0.9, defaultSettingTime: 1.0 },
        { date: "07-Jul-2026", macNo: "TC 43 L", shift: "Shift A", partNo: "THRUST PLATE", process: "PRE DRILLING", operatorName: "Mohan Kewat", settingTime: 1.1, defaultSettingTime: 1.0 },
        { date: "07-Jul-2026", macNo: "VMC 18", shift: "Shift C", partNo: "SEGMENT CARRIER", process: "CNC TURNING I", operatorName: "Chandan Kumar", settingTime: 2.0, defaultSettingTime: 1.5 }
      ];

      list = fallbackMachines.map((m, idx) => ({
        sno: idx + 1,
        date: m.date,
        macNo: m.macNo,
        shift: m.shift,
        partNo: m.partNo,
        process: m.process,
        operatorName: m.operatorName,
        settingTime: m.settingTime,
        defaultSettingTime: m.defaultSettingTime,
        effectiveness: Math.round((m.defaultSettingTime / m.settingTime) * 100)
      }));
    }

    if (setupFilterMode === "part") {
      list = list.filter(row => setupSelectedParts.includes(row.partNo));
    }
    return list;
  }, [filteredTableData, setupFilterMode, setupSelectedParts]);

  const utilChartData = useMemo(() => {
    let labels = [];
    let data = [];
    if (utilFilterMode === "machine") {
      labels = allMachinesList.map(m => m.name);
      data = allMachinesList.map(m => m.utilization !== undefined ? m.utilization : 0);
    } else if (utilFilterMode === "week") {
      labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
      data = [78.5, 82.0, 74.8, 81.2];
    } else if (utilFilterMode === "month") {
      labels = ["Jan 26", "Feb 26", "Mar 26", "Apr 26", "May 26", "Jun 26"];
      data = [72.4, 78.8, 81.5, 76.9, 83.2, 85.0];
    } else if (utilFilterMode === "shift") {
      labels = ["Shift 1", "Shift 2", "Shift 3"];
      data = [82.4, 76.8, 69.2];
    }

    // Apply custom utilization threshold filter
    let minVal = null;
    let maxVal = null;
    const trimmed = utilThresholdVal.trim();
    if (trimmed) {
      if (trimmed === ">= 85%") {
        minVal = 85;
      } else if (trimmed === ">= 75%") {
        minVal = 75;
      } else if (trimmed === "< 75%") {
        maxVal = 74.99;
      } else {
        const match = trimmed.match(/(>=|>|<=|<)?\s*(\d+(\.\d+)?)/);
        if (match) {
          const op = match[1] || ">=";
          const num = parseFloat(match[2]);
          if (op === ">=") minVal = num;
          else if (op === ">") minVal = num + 0.01;
          else if (op === "<=") maxVal = num;
          else if (op === "<") maxVal = num - 0.01;
        }
      }
    }

    if (minVal !== null || maxVal !== null) {
      const indices = [];
      data.forEach((val, idx) => {
        let keep = true;
        if (minVal !== null && val < minVal) keep = false;
        if (maxVal !== null && val > maxVal) keep = false;
        if (keep) indices.push(idx);
      });
      labels = indices.map(idx => labels[idx]);
      data = indices.map(idx => data[idx]);
    }

    return { labels, data };
  }, [utilFilterMode, utilThresholdVal, allMachinesList]);

  /* ── Machine-wise Quality Data calculation ─────── */
  const machineQualityData = useMemo(() => {
    if (allMachinesList.length > 0 && allMachinesList[0].prodQty !== undefined) {
      return allMachinesList.map(m => ({
        machine: m.name,
        prodQty: m.prodQty || 0,
        rejQty: m.rejQty || 0,
        rwQty: m.rwQty || 0,
        rejPct: m.rejPct || 0,
        rwPct: m.rwPct || 0
      }));
    }

    return Object.entries(macDetailData).map(([macName, details]) => {
      const okQtySum = details.runs.reduce((sum, run) => sum + (run.okQty || 0), 0);
      const rej = details.rejQty || 0;
      const rw = details.rwQty || 0;
      const prodQty = okQtySum + rej + rw;
      const rejPct = prodQty > 0 ? parseFloat(((rej / prodQty) * 100).toFixed(1)) : 0.0;
      const rwPct = prodQty > 0 ? parseFloat(((rw / prodQty) * 100).toFixed(1)) : 0.0;
      return {
        machine: macName,
        prodQty,
        rejQty: rej,
        rwQty: rw,
        rejPct,
        rwPct
      };
    });
  }, [macDetailData, allMachinesList]);

  const sortedQualityData = useMemo(() => {
    if (!qualitySortField) return machineQualityData;
    return [...machineQualityData].sort((a, b) => {
      let valA = a[qualitySortField];
      let valB = b[qualitySortField];
      if (typeof valA === "string") {
        return qualitySortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return qualitySortDirection === "asc" ? valA - valB : valB - valA;
    });
  }, [machineQualityData, qualitySortField, qualitySortDirection]);

  const handleQualitySort = (field) => {
    if (qualitySortField === field) {
      setQualitySortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setQualitySortField(field);
      setQualitySortDirection("asc");
    }
  };

  const uniquePartsList = useMemo(() => {
    const parts = new Set();
    tableData.forEach(row => {
      if (row.Part) parts.add(row.Part);
    });
    if (parts.size === 0) {
      ["THRUST PLATE", "SEGMENT CARRIER", "TOP BEARING BODY", "BOTTOM BEARING", "1A-TZ04-201VB", "1A-TZ04-312VB", "2G0805001-366", "2G0805004-367"].forEach(p => parts.add(p));
    }
    return Array.from(parts).map(p => ({ value: p, label: p }));
  }, [tableData]);

  // Reset selected parts when setup filter mode changes
  useEffect(() => {
    setSetupSelectedParts([]);
  }, [setupFilterMode]);

  // 1. Get Setup chart labels and data based on setupFilterMode
  const setupChartData = useMemo(() => {
    const grouped = {};
    settingTableData.forEach(row => {
      let key = "";
      if (setupFilterMode === "machine") key = row.macNo;
      else if (setupFilterMode === "month") {
        const parts = row.date.split("-");
        if (parts.length === 3) {
          key = `${parts[1]} ${parts[2].slice(-2)}`; // e.g. "Jul 26"
        } else {
          const slashParts = row.date.split("/");
          if (slashParts.length === 3) {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const mIdx = parseInt(slashParts[1], 10) - 1;
            key = `${months[mIdx] || "Jul"} ${slashParts[2].slice(-2)}`;
          } else {
            key = "Jul 26";
          }
        }
      } else if (setupFilterMode === "part") {
        key = row.partNo;
      } else if (setupFilterMode === "shift") {
        key = row.shift;
      }

      grouped[key] = (grouped[key] || 0) + row.settingTime;
    });

    const labels = Object.keys(grouped);
    const data = Object.values(grouped).map(v => parseFloat(v.toFixed(1)));
    return { labels, data };
  }, [settingTableData, setupFilterMode]);

  /* ── Setup Time sorted data calculation ─────────── */
  const sortedSettingTableData = useMemo(() => {
    if (!setupSortField) return settingTableData;

    return [...settingTableData].sort((a, b) => {
      let valA = a[setupSortField];
      let valB = b[setupSortField];

      if (setupSortField === "date") {
        const parseDate = (dStr) => {
          const parts = dStr.split("-");
          if (parts.length === 3) {
            const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
            return new Date(parts[2], months[parts[1]] || 0, parts[0]).getTime();
          }
          const slashParts = dStr.split("/");
          if (slashParts.length === 3) {
            return new Date(slashParts[2], slashParts[1] - 1, slashParts[0]).getTime();
          }
          return 0;
        };
        valA = parseDate(valA);
        valB = parseDate(valB);
      }

      if (typeof valA === "string") {
        return setupSortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return setupSortDirection === "asc" ? valA - valB : valB - valA;
      }
    });
  }, [settingTableData, setupSortField, setupSortDirection]);

  const handleSetupSort = (field) => {
    if (setupSortField === field) {
      setSetupSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSetupSortField(field);
      setSetupSortDirection("asc");
    }
  };

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
    setPageLoading(true);
    const params = new URLSearchParams({ from: dateRange.from.toISOString().slice(0, 10), to: dateRange.to.toISOString().slice(0, 10) });
    if (filterMachine && filterMachine.length > 0) {
      params.append("machine", filterMachine.join(","));
    }
    if (filterShift) {
      params.append("shift", filterShift);
    }
    if (filterOperator && filterOperator.length > 0) {
      params.append("operator", filterOperator.join(","));
    }
    if (filterMacType) {
      params.append("mac_type", filterMacType);
    }
    if (filterMacGroup) {
      params.append("mac_group", filterMacGroup);
    }
    if (searchQuery) {
      params.append("search", searchQuery);
    }
    fetch(`${API_BASE}/production-analysis-report/?${params}`, { credentials: "include" })
      .then(async (res) => { const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data?.error || "Failed to load production analysis report"); return data; })
      .then(data => {
        if (data && data.status === "success" && data.data) {
          const d = data.data;
          setKpiValues({ totalProductionQty: d.totalProductionQty || 0, okAcceptedQty: d.okAcceptedQty || 0, rejectionQty: d.rejectionQty || 0, overallOee: d.overallOee ?? 0.0, productionHours: d.productionHours ?? 0.0, totalMachineHours: d.totalMachineHours ?? 0.0, idleHours: d.idleHours ?? 0.0, settingHours: d.settingHours ?? 0.0, manEfficiency: d.manEfficiency ?? 0.0, totalShifts: d.totalShifts || 0, avgProdPerShift: d.avgProdPerShift ?? 0.0, peakShiftOutput: d.peakShiftOutput || 0, lowestShiftOutput: d.lowestShiftOutput || 0, activeMachines: d.activeMachines || 0, idleMachines: d.idleMachines || 0, machineUtilization: d.machineUtilization ?? 0.0, machineEfficiency: d.machineEfficiency ?? 0.0, operatorEfficiency: d.operatorEfficiency ?? 0.0, qualityRate: d.qualityRate ?? 0.0, materialRejection: d.materialRejection ?? 0.0, machineRejection: d.machineRejection ?? 0.0, totCncMac: d.totCncMac || 0, totConvMac: d.totConvMac || 0 });
          if (d.machines && Array.isArray(d.machines)) {
            setMachines(d.machines);
          }
          if (d.oeeTrend && Array.isArray(d.oeeTrend.labels) && d.oeeTrend.labels.length > 0) {
            setOeeTrend(d.oeeTrend);
          } else {
            setOeeTrend({ labels: [], data: [] });
          }
          if (d.macAddedTrend && Array.isArray(d.macAddedTrend.labels) && d.macAddedTrend.labels.length > 0) {
            setMacAddedTrend(d.macAddedTrend);
          } else {
            setMacAddedTrend({ labels: [], counts: [], machineList: [] });
          }
          if (d.macEffTrend && Array.isArray(d.macEffTrend.labels) && d.macEffTrend.labels.length > 0) {
            setMacEffTrend(d.macEffTrend);
          } else {
            setMacEffTrend({ labels: [], data: [] });
          }
        }
      })
      .catch(err => console.error("Error connecting to production analysis backend:", err))
      .finally(() => {
        setTimeout(() => setPageLoading(false), 700);
      });
  }, [dateRange.from, dateRange.to, filterMachine, filterShift, filterOperator, filterMacType, filterMacGroup, searchQuery]);

  const handleMachineClick = (m) => {
    setSelectedMachine(m);
    setCardLoading(true);
    setCardData(null);
    const fromStr = dateRange.from ? dateRange.from.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const toStr = dateRange.to ? dateRange.to.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const params = new URLSearchParams({
      from: fromStr,
      to: toStr,
    });
    fetch(`${API_BASE}/machines/${encodeURIComponent(m.name)}/card/?${params}`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Failed to fetch machine card data");
        return data;
      })
      .then((data) => {
        setCardData(data);
      })
      .catch((err) => {
        console.error("Error fetching machine card data:", err);
      })
      .finally(() => {
        setCardLoading(false);
      });
  };

  /* ── Production Value chart fetch ───────────────── */
  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
    const params = new URLSearchParams({ from: dateRange.from.toISOString().slice(0, 10), to: dateRange.to.toISOString().slice(0, 10) });
    if (filterMachine && filterMachine.length > 0) {
      params.append("machine", filterMachine.join(","));
    }
    if (filterShift) {
      params.append("shift", filterShift);
    }
    if (filterOperator && filterOperator.length > 0) {
      params.append("operator", filterOperator.join(","));
    }
    if (filterMacType) {
      params.append("mac_type", filterMacType);
    }
    if (filterMacGroup) {
      params.append("mac_group", filterMacGroup);
    }
    if (searchQuery) {
      params.append("search", searchQuery);
    }
    fetch(`${API_BASE}/production-value-report/?${params}`, { credentials: "include" })
      .then(r => r.json().catch(() => ({})))
      .then(data => { if (data && data.status === "success" && data.data) setPvChartData(data.data); })
      .catch(err => console.error("Production value report error:", err));
  }, [dateRange.from, dateRange.to, filterMachine, filterShift, filterOperator, filterMacType, filterMacGroup, searchQuery]);

  /* ── Idle Breakdown fetch ───────────────────── */
  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
    const params = new URLSearchParams({
      from: dateRange.from.toISOString().slice(0, 10),
      to: dateRange.to.toISOString().slice(0, 10)
    });
    if (filterMachine && filterMachine.length > 0) {
      params.append("machine", filterMachine.join(","));
    }
    if (filterShift) {
      params.append("shift", filterShift);
    }
    if (filterOperator && filterOperator.length > 0) {
      params.append("operator", filterOperator.join(","));
    }
    if (filterMacType) {
      params.append("mac_type", filterMacType);
    }
    if (filterMacGroup) {
      params.append("mac_group", filterMacGroup);
    }
    if (searchQuery) {
      params.append("search", searchQuery);
    }
    fetch(`${API_BASE}/production-idle-breakdown/?${params}`, { credentials: "include" })
      .then(r => r.json().catch(() => ({})))
      .then(data => { if (data && data.status === "success") setIdleBreakdown({ accepted: data.accepted || _IDLE_BREAKDOWN_EMPTY.accepted, non_accepted: data.non_accepted || _IDLE_BREAKDOWN_EMPTY.non_accepted, summary: data.summary || _IDLE_BREAKDOWN_EMPTY.summary }); })
      .catch(err => console.error("Idle breakdown error:", err));
  }, [dateRange.from, dateRange.to, filterMachine, filterShift, filterOperator, filterMacType, filterMacGroup, searchQuery]);

  /* ── Daily Production Details fetch ─────────── */
  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
    const params = new URLSearchParams({ from: dateRange.from.toISOString().slice(0, 10), to: dateRange.to.toISOString().slice(0, 10) });
    if (filterMachine && filterMachine.length > 0) {
      params.append("machine", filterMachine.join(","));
    }
    if (filterShift) {
      params.append("shift", filterShift);
    }
    if (filterOperator && filterOperator.length > 0) {
      params.append("operator", filterOperator.join(","));
    }
    if (filterMacType) {
      params.append("mac_type", filterMacType);
    }
    if (filterMacGroup) {
      params.append("mac_group", filterMacGroup);
    }
    if (searchQuery) {
      params.append("search", searchQuery);
    }
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
  }, [dateRange.from, dateRange.to, filterMachine, filterShift, filterOperator, filterMacType, filterMacGroup, searchQuery]);

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

    let datasets = [];
    if (isMachine) {
      const palette = ["rgba(37,99,235,0.75)", "rgba(249,115,22,0.75)", "rgba(16,185,129,0.75)", "rgba(139,92,246,0.75)", "rgba(6,182,212,0.75)", "rgba(236,72,153,0.75)", "rgba(245,158,11,0.75)", "rgba(99,102,241,0.75)", "rgba(239,68,68,0.75)"];
      const borders = ["#2563eb", "#f97316", "#10b981", "#8b5cf6", "#06b6d4", "#ec4899", "#f59e0b", "#6366f1", "#ef4444"];

      datasets = [{
        label: "Achieved Value (₹)",
        data: machineData.achieved,
        backgroundColor: pvChartType === "line" ? "rgba(37, 99, 235, 0.15)" : machineData.labels.map((_, i) => palette[i % palette.length]),
        borderColor: pvChartType === "line" ? "#2563eb" : machineData.labels.map((_, i) => borders[i % borders.length]),
        borderWidth: pvChartType === "line" ? 3 : 1.5,
        borderRadius: pvChartType === "line" ? 0 : 7,
        fill: pvChartType === "line",
        tension: 0.38,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#2563eb",
        pointBorderWidth: 2,
        pointRadius: pvChartType === "line" ? 4 : 0,
        pointHoverRadius: pvChartType === "line" ? 7 : 0,
        pointHoverBackgroundColor: "#2563eb",
        pointHoverBorderColor: "#ffffff",
        pointHoverBorderWidth: 3
      }];
    } else {
      datasets = monthData.datasets.map(d => {
        const color = d.borderColor || d.backgroundColor || "#2563eb";
        return {
          ...d,
          type: pvChartType,
          borderRadius: pvChartType === "line" ? 0 : 4,
          fill: false,
          borderColor: color,
          borderWidth: pvChartType === "line" ? 3 : 1.5,
          tension: 0.38,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: color,
          pointBorderWidth: 2,
          pointRadius: pvChartType === "line" ? 4 : 0,
          pointHoverRadius: pvChartType === "line" ? 7 : 0,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 3
        };
      });
    }

    pvChartInst.current = new Chart(ctx, {
      type: pvChartType,
      data: {
        labels: isMachine ? machineData.labels : monthData.labels,
        datasets: datasets
      },
      plugins: [ChartDataLabels],
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "top", labels: { font: { family: "'DM Sans','Outfit',sans-serif", size: 12, weight: "600" }, padding: 18, usePointStyle: true } },
          tooltip: { callbacks: { label: ctx => ` ₹${ctx.parsed.y.toLocaleString("en-IN")}` } },
          datalabels: {
            display: true,
            anchor: pvChartType === "line" ? "end" : (isMachine ? "end" : "center"),
            align: pvChartType === "line" ? "top" : (isMachine ? "top" : "center"),
            offset: pvChartType === "line" ? 6 : 2,
            backgroundColor: "rgba(255, 255, 255, 0.92)",
            borderColor: "rgba(226, 232, 240, 0.8)",
            borderWidth: 1,
            borderRadius: 6,
            padding: { top: 3, bottom: 3, left: 6, right: 6 },
            font: { size: 9, weight: "700", family: "'Plus Jakarta Sans', sans-serif" },
            color: "#1e293b",
            shadowColor: "rgba(0, 0, 0, 0.04)",
            shadowBlur: 3,
            formatter: (v) => {
              if (!v) return "";
              if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
              if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
              return `₹${v}`;
            }
          }
        },
        scales: {
          x: { stacked: !isMachine && pvChartType === "bar", ticks: { font: { size: 11 }, maxRotation: isMachine ? 35 : 0 }, grid: { display: false } },
          y: { stacked: !isMachine && pvChartType === "bar", beginAtZero: true, grace: "10%", ticks: { callback: v => `₹${(v / 1000).toFixed(0)}K`, font: { size: 11 } }, grid: { color: "#f1f5f9" } }
        }
      }
    });
    return () => pvChartInst.current?.destroy();
  }, [pvMode, pvChartData, pvChartType, pageLoading]);

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
      : oeeTrend.labels;
    const oeeData = isMachine
      ? allMachinesList.map(m => m.oee !== undefined ? m.oee : (macDetailData[m.name]?.oee || 0))
      : oeeTrend.data;

    oeeChartInst.current = new Chart(ctx, {
      type: oeeChartType,
      data: {
        labels: labels,
        datasets: [{
          label: "OEE %",
          data: oeeData,
          borderColor: "#6366f1",
          borderWidth: oeeChartType === "line" ? 3 : 1.5,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#6366f1",
          pointBorderWidth: 2,
          pointRadius: oeeChartType === "line" ? 4 : 0,
          pointHoverRadius: oeeChartType === "line" ? 7 : 0,
          pointHoverBackgroundColor: "#6366f1",
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 3,
          fill: oeeChartType === "line",
          backgroundColor: oeeChartType === "line" ? gradient : "rgba(99, 102, 241, 0.8)",
          tension: 0.38,
          borderRadius: oeeChartType === "bar" ? 6 : 0
        }]
      },
      plugins: [ChartDataLabels],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` OEE: ${ctx.parsed.y}%` } },
          datalabels: {
            display: true,
            anchor: context => {
              const isMobile = window.innerWidth < 640;
              if (isMobile && oeeChartType === "line") {
                return context.dataIndex % 2 === 0 ? "end" : "start";
              }
              return "end";
            },
            align: context => {
              const isMobile = window.innerWidth < 640;
              if (isMobile && oeeChartType === "line") {
                return context.dataIndex % 2 === 0 ? "top" : "bottom";
              }
              return "top";
            },
            offset: context => {
              const isMobile = window.innerWidth < 640;
              if (isMobile && oeeChartType === "line") {
                return 4;
              }
              return 6;
            },
            backgroundColor: "rgba(255, 255, 255, 0.92)",
            borderColor: "rgba(226, 232, 240, 0.8)",
            borderWidth: 1,
            borderRadius: 6,
            padding: { top: 3, bottom: 3, left: 6, right: 6 },
            shadowColor: "rgba(0, 0, 0, 0.04)",
            shadowBlur: 3,
            formatter: (v, context) => {
              const isMobile = window.innerWidth < 640;
              if (isMobile && oeeChartType === "line") {
                return `${v}`; // Truncate % symbol on mobile line chart to save space
              }
              return `${v}%`;
            },
            font: context => {
              const isMobile = window.innerWidth < 640;
              return {
                size: isMobile ? 8 : 10,
                weight: "700",
                family: "'Plus Jakarta Sans',sans-serif"
              };
            },
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
            grace: "5%",
            ticks: { callback: v => `${v}%`, font: { family: "'Plus Jakarta Sans',sans-serif", size: 10 } },
            grid: { color: "#f1f5f9" }
          }
        }
      }
    });
    return () => oeeChartInst.current?.destroy();
  }, [pvChartData, oeeMode, oeeChartType, pageLoading, allMachinesList, oeeTrend]);

  /* ── Setting Time Machine Wise Chart ─────── */
  useEffect(() => {
    if (!setChartRef.current) return;
    setChartInst.current?.destroy();
    const ctx = setChartRef.current.getContext("2d");

    let primaryColor = "#8b5cf6"; // default purple
    let gradientStart = setupChartType === "line" ? "rgba(139, 92, 246, 0.35)" : "rgba(139, 92, 246, 0.85)";
    let gradientEnd = setupChartType === "line" ? "rgba(139, 92, 246, 0.0)" : "rgba(139, 92, 246, 0.25)";

    if (setupFilterMode === "month") {
      primaryColor = "#6366f1"; // indigo
      gradientStart = setupChartType === "line" ? "rgba(99, 102, 241, 0.35)" : "rgba(99, 102, 241, 0.85)";
      gradientEnd = setupChartType === "line" ? "rgba(99, 102, 241, 0.0)" : "rgba(99, 102, 241, 0.25)";
    } else if (setupFilterMode === "part") {
      primaryColor = "#10b981"; // emerald
      gradientStart = setupChartType === "line" ? "rgba(16, 185, 129, 0.35)" : "rgba(16, 185, 129, 0.85)";
      gradientEnd = setupChartType === "line" ? "rgba(16, 185, 129, 0.0)" : "rgba(16, 185, 129, 0.25)";
    } else if (setupFilterMode === "shift") {
      primaryColor = "#f59e0b"; // amber
      gradientStart = setupChartType === "line" ? "rgba(245, 158, 11, 0.35)" : "rgba(245, 158, 11, 0.85)";
      gradientEnd = setupChartType === "line" ? "rgba(245, 158, 11, 0.0)" : "rgba(245, 158, 11, 0.25)";
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, gradientStart);
    gradient.addColorStop(1, gradientEnd);

    const { labels, data: setTimeData } = setupChartData;

    setChartInst.current = new Chart(ctx, {
      type: setupChartType,
      data: {
        labels: labels,
        datasets: [{
          label: "Setup Time (hrs)",
          data: setTimeData,
          backgroundColor: gradient,
          borderColor: primaryColor,
          borderWidth: setupChartType === "line" ? 3 : 1.5,
          borderRadius: setupChartType === "bar" ? 6 : 0,
          fill: setupChartType === "line",
          tension: 0.38,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: primaryColor,
          pointBorderWidth: 2,
          pointRadius: setupChartType === "line" ? 4 : 0,
          pointHoverRadius: setupChartType === "line" ? 7 : 0,
          pointHoverBackgroundColor: primaryColor,
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 3
        }]
      },
      plugins: [ChartDataLabels],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` Setup: ${ctx.parsed.y} hrs` } },
          datalabels: {
            display: true,
            anchor: "end",
            align: "top",
            offset: setupChartType === "line" ? 8 : 6,
            backgroundColor: "rgba(255, 255, 255, 0.92)",
            borderColor: "rgba(226, 232, 240, 0.8)",
            borderWidth: 1,
            borderRadius: 6,
            padding: { top: 3, bottom: 3, left: 6, right: 6 },
            shadowColor: "rgba(0, 0, 0, 0.04)",
            shadowBlur: 3,
            formatter: v => `${v}h`,
            font: { size: 10, weight: "700", family: "'Plus Jakarta Sans',sans-serif" },
            color: primaryColor
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans',sans-serif", size: 10, weight: "600" } }
          },
          y: {
            beginAtZero: true,
            grace: "15%",
            ticks: { callback: v => `${v}h`, font: { family: "'Plus Jakarta Sans',sans-serif", size: 10 } },
            grid: { color: "#f1f5f9" }
          }
        }
      }
    });
    return () => setChartInst.current?.destroy();
  }, [pvChartData, setupChartData, setupFilterMode, setupChartType, pageLoading]);

  /* ── Machine Utilization Chart ──────────── */
  useEffect(() => {
    if (!utilChartRef.current) return;
    utilChartInst.current?.destroy();
    const ctx = utilChartRef.current.getContext("2d");

    const isBar = utilChartType === "bar";
    const fill = utilChartType === "area";
    const type = isBar ? "bar" : "line";

    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    if (isBar) {
      gradient.addColorStop(0, "rgba(20, 184, 166, 0.85)");
      gradient.addColorStop(1, "rgba(20, 184, 166, 0.25)");
    } else {
      gradient.addColorStop(0, "rgba(20, 184, 166, 0.35)");
      gradient.addColorStop(1, "rgba(20, 184, 166, 0.0)");
    }

    const { labels, data: utilData } = utilChartData;

    utilChartInst.current = new Chart(ctx, {
      type: type,
      data: {
        labels: labels,
        datasets: [{
          label: "Utilization %",
          data: utilData,
          borderColor: "#14b8a6",
          borderWidth: isBar ? 1.5 : 3,
          borderRadius: isBar ? 6 : 0,
          fill: fill,
          backgroundColor: fill || isBar ? gradient : "transparent",
          tension: 0.38,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#14b8a6",
          pointBorderWidth: 2,
          pointRadius: isBar ? 0 : 4,
          pointHoverRadius: isBar ? 0 : 7,
          pointHoverBackgroundColor: "#14b8a6",
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 3
        }]
      },
      plugins: [ChartDataLabels],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` Utilization: ${ctx.parsed.y}%` } },
          datalabels: {
            display: true,
            anchor: "end",
            align: "top",
            offset: 6,
            backgroundColor: "rgba(255, 255, 255, 0.92)",
            borderColor: "rgba(226, 232, 240, 0.8)",
            borderWidth: 1,
            borderRadius: 6,
            padding: { top: 3, bottom: 3, left: 6, right: 6 },
            shadowColor: "rgba(0, 0, 0, 0.04)",
            shadowBlur: 3,
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
            grace: "5%",
            ticks: { callback: v => `${v}%`, font: { family: "'Plus Jakarta Sans',sans-serif", size: 10 } },
            grid: { color: "#f1f5f9" }
          }
        }
      }
    });
  }, [pvChartData, utilChartData, utilChartType, pageLoading]);

  /* ── Machine Wise Quality & Rejection Chart ──── */
  useEffect(() => {
    if (!qualityChartRef.current) return;
    qualityChartInst.current?.destroy();
    const ctx = qualityChartRef.current.getContext("2d");

    const rejGrad = ctx.createLinearGradient(0, 0, 0, 240);
    rejGrad.addColorStop(0, "rgba(239, 68, 68, 0.85)");
    rejGrad.addColorStop(1, "rgba(239, 68, 68, 0.25)");

    const rwGrad = ctx.createLinearGradient(0, 0, 0, 240);
    rwGrad.addColorStop(0, "rgba(245, 158, 11, 0.85)");
    rwGrad.addColorStop(1, "rgba(245, 158, 11, 0.25)");

    const labels = machineQualityData.map(d => d.machine);
    const rejData = machineQualityData.map(d => d.rejPct);
    const rwData = machineQualityData.map(d => d.rwPct);

    qualityChartInst.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Rejection Rate (%)",
            data: rejData,
            backgroundColor: rejGrad,
            borderColor: "#ef4444",
            borderWidth: 1.5,
            borderRadius: 6
          },
          {
            label: "Rework Rate (%)",
            data: rwData,
            backgroundColor: rwGrad,
            borderColor: "#f59e0b",
            borderWidth: 1.5,
            borderRadius: 6
          }
        ]
      },
      plugins: [ChartDataLabels],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              font: { family: "'Plus Jakarta Sans',sans-serif", size: 10, weight: "700" }
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label.split(" ")[0]}: ${ctx.parsed.y}%`
            }
          },
          datalabels: {
            display: true,
            anchor: "end",
            align: "top",
            offset: 4,
            backgroundColor: "rgba(255, 255, 255, 0.92)",
            borderColor: "rgba(226, 232, 240, 0.8)",
            borderWidth: 1,
            borderRadius: 5,
            padding: { top: 2, bottom: 2, left: 5, right: 5 },
            shadowColor: "rgba(0, 0, 0, 0.04)",
            shadowBlur: 2,
            formatter: v => v > 0 ? `${v}%` : "",
            font: { size: 9, weight: "700", family: "'Plus Jakarta Sans',sans-serif" },
            color: ctx => ctx.dataset.borderColor
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans',sans-serif", size: 10, weight: "600" } }
          },
          y: {
            beginAtZero: true,
            grace: "15%",
            ticks: { callback: v => `${v}%`, font: { family: "'Plus Jakarta Sans',sans-serif", size: 10 } },
            grid: { color: "#f1f5f9" }
          }
        }
      }
    });
    return () => qualityChartInst.current?.destroy();
  }, [machineQualityData, pageLoading]);
  const calculateMachineMhr = useCallback((macName) => {
    const inputs = mhrMachinesInputs[macName] || MHR_PRESETS["Custom (Manual)"];
    const hrs = inputs.annualHours || 1;
    const depreciation = inputs.machineCost / (inputs.machineLife || 1);
    const interest = inputs.machineCost * (inputs.interestRate / 100);
    const totalFixed = depreciation + inputs.insurance + inputs.allocatedRent + inputs.supervisorSalary + interest;
    const totalVariable = inputs.operatorSalary + inputs.electricity + inputs.maintenance + inputs.consumables + inputs.toolWear;
    return (totalFixed + totalVariable) / hrs;
  }, [mhrMachinesInputs]);

  const handleMhrPresetChange = (presetName) => {
    setMhrSelectedMachine(presetName);
    if (MHR_PRESETS[presetName]) {
      setMhrMachinesInputs(prev => ({
        ...prev,
        [presetName]: { ...MHR_PRESETS[presetName] }
      }));
    }
  };

  const mhrTrendChartData = useMemo(() => {
    const machineNames = ["HTC 1", "HTC 2", "HTC 3", "VMC 1", "VMC 2", "VTL 1", "VTL 2", "VTL 3", "VTL 4", "VMC-3", "MANUAL 1"];

    const palette = [
      "rgba(37, 99, 235, 0.78)",
      "rgba(59, 130, 246, 0.78)",
      "rgba(96, 165, 250, 0.78)",
      "rgba(16, 185, 129, 0.78)",
      "rgba(52, 211, 153, 0.78)",
      "rgba(139, 92, 246, 0.78)",
      "rgba(167, 139, 250, 0.78)",
      "rgba(245, 158, 11, 0.78)",
      "rgba(251, 146, 60, 0.78)",
      "rgba(236, 72, 153, 0.78)",
      "rgba(239, 68, 68, 0.78)"
    ];
    const borders = [
      "#2563eb", "#3b82f6", "#60a5fa", "#10b981", "#34d399", "#8b5cf6", "#a78bfa", "#f59e0b", "#fb923c", "#ec4899", "#ef4444"
    ];

    const data = machineNames.map(macName => {
      return Math.round(calculateMachineMhr(macName));
    });

    return {
      labels: machineNames,
      datasets: [{
        label: "Machine Hour Rate (₹/hr)",
        data: data,
        backgroundColor: palette,
        borderColor: borders,
        borderWidth: 1.5,
        borderRadius: 6,
        barThickness: 32
      }]
    };
  }, [calculateMachineMhr]);

  // ── MHR Trend Chart.js Effect ──
  useEffect(() => {
    if (!mhrChartRef.current) return;
    mhrTrendChartInst.current?.destroy();
    const ctx = mhrChartRef.current.getContext("2d");

    mhrTrendChartInst.current = new Chart(ctx, {
      type: "bar",
      data: mhrTrendChartData,
      plugins: [ChartDataLabels],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: ctx => ` Machine Hour Rate: ₹${ctx.parsed.y}/hr`
            }
          },
          datalabels: {
            display: true,
            anchor: "end",
            align: "top",
            offset: 4,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderColor: "rgba(226, 232, 240, 0.8)",
            borderWidth: 1,
            borderRadius: 6,
            padding: { top: 3, bottom: 3, left: 6, right: 6 },
            font: { size: 9, weight: "750", family: PA2_FONT },
            color: "#1e293b",
            formatter: (v) => v ? `₹${v}` : ""
          }
        },
        scales: {
          x: { ticks: { font: { size: 10, family: PA2_FONT, weight: "600" } }, grid: { display: false } },
          y: { beginAtZero: true, grace: "12%", ticks: { callback: v => `₹${v}`, font: { size: 9.5, family: PA2_FONT } }, grid: { color: "#f1f5f9" } }
        }
      }
    });

    return () => mhrTrendChartInst.current?.destroy();
  }, [mhrTrendChartData, pageLoading]);
  /* ── Machine Added Trend Chart ───────────── */
  useEffect(() => {
    if (!macAddedChartRef.current) return;
    macAddedChartInst.current?.destroy();
    const ctx = macAddedChartRef.current.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, "rgba(249, 115, 22, 0.85)");
    gradient.addColorStop(1, "rgba(249, 115, 22, 0.2)");

    const machineListByMonth = macAddedTrend.machineList;

    macAddedChartInst.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: macAddedTrend.labels,
        datasets: [{
          label: "Machines Added",
          data: macAddedTrend.counts,
          backgroundColor: gradient,
          borderColor: "#f97316",
          borderWidth: 1.5,
          borderRadius: 4,
        }]
      },
      plugins: [ChartDataLabels],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => {
                const idx = context.dataIndex;
                const macs = machineListByMonth[idx] || "None";
                return ` Added: ${context.parsed.y} machine(s) (${macs})`;
              }
            }
          },
          datalabels: {
            display: true,
            anchor: "end",
            align: "top",
            offset: 6,
            backgroundColor: "rgba(255, 255, 255, 0.92)",
            borderColor: "rgba(226, 232, 240, 0.8)",
            borderWidth: 1,
            borderRadius: 6,
            padding: { top: 3, bottom: 3, left: 6, right: 6 },
            shadowColor: "rgba(0, 0, 0, 0.04)",
            shadowBlur: 3,
            formatter: (v, context) => {
              if (v === 0) return "";
              const idx = context.dataIndex;
              const rawList = machineListByMonth[idx] || "";
              const firstMac = rawList.split(",")[0] || "";
              return `+${v} (${firstMac})`;
            },
            font: { size: 9, weight: "700", family: "'Plus Jakarta Sans',sans-serif" },
            color: "#f97316"
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans',sans-serif", size: 10 } }
          },
          y: {
            beginAtZero: true,
            grace: "15%",
            ticks: { stepSize: 1, font: { family: "'Plus Jakarta Sans',sans-serif", size: 10 } },
            grid: { color: "#f1f5f9" }
          }
        }
      }
    });
    return () => macAddedChartInst.current?.destroy();
  }, [macAddedTrend, pageLoading]);

  /* ── Machine Efficiency% Trend Chart ─────── */
  useEffect(() => {
    if (!macEffTrendChartRef.current) return;
    macEffTrendChartInst.current?.destroy();
    const ctx = macEffTrendChartRef.current.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, "rgba(6, 182, 212, 0.35)");
    gradient.addColorStop(1, "rgba(6, 182, 212, 0.0)");

    macEffTrendChartInst.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: macEffTrend.labels,
        datasets: [{
          label: "Avg Efficiency %",
          data: macEffTrend.data,
          borderColor: "#06b6d4",
          borderWidth: 3,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#06b6d4",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: "#06b6d4",
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 3,
          fill: true,
          backgroundColor: gradient,
          tension: 0.35,
        }]
      },
      plugins: [ChartDataLabels],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` Efficiency: ${ctx.parsed.y}%` } },
          datalabels: {
            display: true,
            anchor: "end",
            align: "top",
            offset: 6,
            backgroundColor: "rgba(255, 255, 255, 0.92)",
            borderColor: "rgba(226, 232, 240, 0.8)",
            borderWidth: 1,
            borderRadius: 6,
            padding: { top: 3, bottom: 3, left: 6, right: 6 },
            shadowColor: "rgba(0, 0, 0, 0.04)",
            shadowBlur: 3,
            formatter: v => `${v}%`,
            font: { size: 10, weight: "700", family: "'Plus Jakarta Sans',sans-serif" },
            color: "#06b6d4"
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans',sans-serif", size: 10 } }
          },
          y: {
            beginAtZero: true,
            max: 100,
            grace: "5%",
            ticks: { callback: v => `${v}%`, font: { family: "'Plus Jakarta Sans',sans-serif", size: 10 } },
            grid: { color: "#f1f5f9" }
          }
        }
      }
    });
    return () => macEffTrendChartInst.current?.destroy();
  }, [macEffTrend, pageLoading]);



  // Click outside handler for setup dropdowns
  useEffect(() => {
    const handleOutside = (e) => {
      if (setupDropdownRef.current && !setupDropdownRef.current.contains(e.target)) {
        setSetupFilterOpen(false);
      }
      if (setupChartTypeDropdownRef.current && !setupChartTypeDropdownRef.current.contains(e.target)) {
        setSetupChartTypeOpen(false);
      }
      if (utilChartTypeDropdownRef.current && !utilChartTypeDropdownRef.current.contains(e.target)) {
        setUtilChartTypeOpen(false);
      }
      if (utilFilterDropdownRef.current && !utilFilterDropdownRef.current.contains(e.target)) {
        setUtilFilterOpen(false);
      }
      if (utilThresholdDropdownRef.current && !utilThresholdDropdownRef.current.contains(e.target)) {
        setUtilThresholdOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

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
                placeholder="Search Partno"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="pa2-search-clear-btn"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <FiX size={14} style={{ strokeWidth: 3 }} />
                </button>
              )}
            </div>
          </div>
          <PremiumSelectMulti
            label="Mac Name"
            value={filterMachine}
            onChange={setFilterMachine}
            placeholder="All Machines"
            options={macOptions}
          />
          <PremiumSelect
            label="Shift"
            value={filterShift}
            onChange={setFilterShift}
            placeholder="All Shifts"
            options={shiftOptions}
          />
          <PremiumSelectMulti
            label="Operator"
            value={filterOperator}
            onChange={setFilterOperator}
            placeholder="All Operators"
            options={operatorOptions}
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
        {pageLoading ? (
          Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="pa2-kpi pa2-kpi--skeleton">
              <div className="pa2-kpi-hdr">
                <div className="pa2-skeleton" style={{ width: "80px", height: "14px" }} />
                <div className="pa2-skeleton" style={{ width: "26px", height: "26px", borderRadius: "8px" }} />
              </div>
              <div className="pa2-kpi-body" style={{ margin: "14px 0 10px" }}>
                <div className="pa2-skeleton" style={{ width: "110px", height: "26px" }} />
              </div>
              <div className="pa2-kpi-footer">
                <div className="pa2-skeleton" style={{ width: "90px", height: "12px" }} />
              </div>
            </div>
          ))
        ) : (
          activeKpiData.map((k, i) => (
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
          ))
        )}
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
              {searchMacQuery && (
                <button
                  type="button"
                  className="pa2-search-clear-btn"
                  style={{ right: "6px" }}
                  onClick={() => setSearchMacQuery("")}
                  aria-label="Clear machine search"
                >
                  <FiX size={12} style={{ strokeWidth: 3 }} />
                </button>
              )}
            </div>
            <div className="pa2-macdetail-tabs">
              {machineCategories.map((tab) => (
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
          {pageLoading ? (
            <div className="pa2-machinedetails-grid">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} className="pa2-mac-chip" style={{ background: "#ffffff", borderColor: "#f1f5f9" }}>
                  <div className="pa2-mac-chip-body" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      <div className="pa2-skeleton" style={{ width: "30px", height: "8px" }} />
                      <div className="pa2-skeleton" style={{ width: "65px", height: "14px" }} />
                      <div className="pa2-skeleton" style={{ width: "85px", height: "9px" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
                      <div className="pa2-skeleton" style={{ width: "42px", height: "18px", borderRadius: "6px" }} />
                      <div className="pa2-skeleton" style={{ width: "42px", height: "18px", borderRadius: "6px" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMachinesList.length > 0 ? (
            <div className="pa2-machinedetails-grid">
              {filteredMachinesList.map((m, i) => {
                const macDetails = {
                  oprEff: m.oprEff !== undefined ? m.oprEff : (macDetailData[m.name]?.oprEff ?? 0),
                  oee: m.oee !== undefined ? m.oee : (macDetailData[m.name]?.oee ?? 0)
                };
                return (
                  <div
                    key={i}
                    className="pa2-mac-chip"
                    style={{ "--ci": i, "--cc1": m.color }}
                    onClick={() => handleMachineClick(m)}
                  >
                    <div className="pa2-mac-chip-accent" />
                    <div className="pa2-mac-chip-body" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div className="pa2-mac-chip-index">M{String(i + 1).padStart(2, "0")}</div>
                        <div className="pa2-mac-chip-name">{m.name}</div>
                        <div className="pa2-mac-chip-type">{m.type}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-end", flexShrink: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "9px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.2px" }}>Eff</span>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "800",
                            color: macDetails.oprEff >= 80 ? "#059669" : "#ea580c",
                            background: macDetails.oprEff >= 80 ? "#e6fcf5" : "#fff7ed",
                            border: macDetails.oprEff >= 80 ? "1px solid rgba(5, 150, 105, 0.15)" : "1px solid rgba(234, 88, 12, 0.15)",
                            padding: "1px 5px",
                            borderRadius: "5px",
                            minWidth: "36px",
                            textAlign: "center",
                            fontVariantNumeric: "tabular-nums"
                          }}>{macDetails.oprEff}%</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "9px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.2px" }}>OEE</span>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "800",
                            color: macDetails.oee >= 75 ? "#2563eb" : "#dc2626",
                            background: macDetails.oee >= 75 ? "#eff6ff" : "#fff5f5",
                            border: macDetails.oee >= 75 ? "1px solid rgba(37, 99, 235, 0.15)" : "1px solid rgba(220, 38, 38, 0.15)",
                            padding: "1px 5px",
                            borderRadius: "5px",
                            minWidth: "36px",
                            textAlign: "center",
                            fontVariantNumeric: "tabular-nums"
                          }}>{macDetails.oee}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
        const card = cardData?.card || {
          oee_pct: 0,
          oper_eff_pct: 0,
          run_hrs: 0,
          idle_hrs: 0,
          total_ok_qty: 0,
          total_rej_qty: 0,
          total_rework_qty: 0,
          machine_run_pct: 0
        };
        const shiftLogs = cardData?.shift_logs || [];

        return createPortal(
          <div className="pa2-modal-overlay" onClick={() => setSelectedMachine(null)}>
            <div className="pa2-modal" onClick={e => e.stopPropagation()}>
              <style>{`
                @keyframes pa2-spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>

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

              {cardLoading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "350px", gap: "12px", color: "#64748b" }}>
                  <div className="pa2-loading-spinner" style={{
                    width: "28px",
                    height: "28px",
                    border: "3px solid #f1f5f9",
                    borderTopColor: "#2563eb",
                    borderRadius: "50%",
                    animation: "pa2-spin 0.8s linear infinite"
                  }} />
                  <span style={{ fontSize: "12px", fontWeight: "600" }}>Fetching machine metrics...</span>
                </div>
              ) : (
                <>
                  {/* KPI Strip */}
                  <div className="pa2-modal-kpi-strip">
                    {[
                      { label: "OEE %", value: `${card.oee_pct}%`, icon: <FiActivity />, color: "#ef4444" },
                      { label: "OPR EFF %", value: `${card.oper_eff_pct}%`, icon: <FiUser />, color: "#f97316" },
                      { label: "RUN HRS", value: `${card.run_hrs.toFixed(1)} hrs`, icon: <FiClock />, color: "#2563eb" },
                      { label: "IDLE HRS", value: `${Math.round(card.idle_hrs)} hrs`, icon: <FiAlertTriangle />, color: "#94a3b8" },
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
                        {shiftLogs.map((r, idx) => (
                          <tr key={idx}>
                            <td className="pa2-modal-td-operator">
                              <div className="pa2-modal-op-avatar" style={{ background: selectedMachine.color }}>{(r.operator || "").charAt(0)}</div>
                              <span>{r.operator}</span>
                            </td>
                            <td><span className="pa2-modal-badge-part">{r.part_no}</span></td>
                            <td><span className="pa2-modal-text-process">{r.process}</span></td>
                            <td style={{ textAlign: "right", fontWeight: 600, color: "#475569" }}>{r.hrs}h</td>
                            <td style={{ textAlign: "right", fontWeight: 700, color: "#059669" }}>{r.ok_qty}</td>
                          </tr>
                        ))}
                        {shiftLogs.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: "16px" }}>No shift logs found for this machine</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Production Qty Row */}
                  <div className="pa2-modal-section-title" style={{ "--di": 6 }}>Total Production Quantities</div>
                  <div className="pa2-modal-qty-row" style={{ "--di": 7 }}>
                    <div className="pa2-modal-qty pa2-modal-qty--ok">
                      <div className="pa2-modal-qty-val">
                        <FiCheckCircle size={18} style={{ marginRight: 6, verticalAlign: "middle", opacity: 0.8 }} />
                        {card.total_ok_qty}
                      </div>
                      <div className="pa2-modal-qty-lbl">OK Qty</div>
                    </div>
                    <div className="pa2-modal-qty pa2-modal-qty--rej">
                      <div className="pa2-modal-qty-val">
                        <FiXCircle size={18} style={{ marginRight: 6, verticalAlign: "middle", opacity: 0.8 }} />
                        {card.total_rej_qty}
                      </div>
                      <div className="pa2-modal-qty-lbl">Rej Qty</div>
                    </div>
                    <div className="pa2-modal-qty pa2-modal-qty--rw">
                      <div className="pa2-modal-qty-val">
                        <FiRefreshCw size={16} style={{ marginRight: 6, verticalAlign: "middle", opacity: 0.8 }} />
                        {card.total_rework_qty}
                      </div>
                      <div className="pa2-modal-qty-lbl">Rework Qty</div>
                    </div>
                  </div>

                  {/* OEE & Efficiency Progress Bars */}
                  <div className="pa2-modal-section-title" style={{ "--di": 8, marginTop: "18px" }}>Efficiency Overview</div>
                  <div className="pa2-modal-bar-list" style={{ "--di": 9 }}>
                    {[
                      { label: "OEE %", pct: card.oee_pct, color: card.oee_pct >= 75 ? "#059669" : "#dc2626" },
                      { label: "Operator Eff %", pct: card.oper_eff_pct, color: card.oper_eff_pct >= 80 ? "#059669" : "#f59e0b" },
                      { label: "Machine Run %", pct: card.machine_run_pct, color: "#2563eb" },
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
                </>
              )}
            </div>
          </div>
          , document.body);
      })()}

      {/* ── DAILY SUMMARY + EFFICIENCY (side by side) ── */}
      <div className="pa2-row-2">
        <div className="pa2-card pa2-anim" style={{ "--d": "80ms" }}>
          <SectionHeader icon={<FiList size={16} />} title="Daily Production Summary" />
          <div className="pa2-summary-grid">
            {pageLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="pa2-summary-chip" style={{ background: "#f8faff" }}>
                  <div className="pa2-skeleton" style={{ width: "80px", height: "8px", margin: "0 auto 8px" }} />
                  <div className="pa2-skeleton" style={{ width: "45px", height: "18px", margin: "0 auto" }} />
                </div>
              ))
            ) : (
              [{ label: "Total Shifts", value: kpiValues.totalShifts }, { label: "Avg Prod / Shift", value: kpiValues.avgProdPerShift }, { label: "Peak Shift Output", value: kpiValues.peakShiftOutput }, { label: "Lowest Shift Output", value: kpiValues.lowestShiftOutput }, { label: "Active Machines", value: kpiValues.activeMachines }, { label: "Idle Machines", value: kpiValues.idleMachines }].map((s, i) => (
                <div key={i} className="pa2-summary-chip"><div className="pa2-summary-lbl">{s.label}</div><div className="pa2-summary-val"><AnimatedValue target={s.value} /></div></div>
              ))
            )}
          </div>
        </div>
        <div className="pa2-card pa2-anim" style={{ "--d": "120ms" }}>
          <SectionHeader icon={<FiAward size={16} />} title="Machine & Operator Efficiency" />
          <div className="pa2-metrics-list">
            {pageLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="pa2-metric-row">
                  <div className="pa2-skeleton" style={{ width: "100px", height: "12px" }} />
                  <div className="pa2-skeleton" style={{ width: "100%", height: "8px" }} />
                  <div className="pa2-skeleton" style={{ width: "30px", height: "12px" }} />
                </div>
              ))
            ) : (
              [{ name: "Machine Utilization", pct: kpiValues.machineUtilization, color: "#2d6de8", bg: "#dbe9ff" }, { name: "Machine Efficiency", pct: kpiValues.machineEfficiency, color: "#f59e0b", bg: "#fef3c7" }, { name: "Operator Efficiency", pct: kpiValues.operatorEfficiency, color: "#059669", bg: "#d1fae5" }, { name: "Quality Rate", pct: kpiValues.qualityRate, color: "#059669", bg: "#d1fae5" }, { name: "Material Rejection", pct: kpiValues.materialRejection, color: "#ef4444", bg: "#fee2e2" }, { name: "Machine Rejection", pct: kpiValues.machineRejection, color: "#ef4444", bg: "#fee2e2" }].map((m, i) => (
                <div key={i} className="pa2-metric-row"><div className="pa2-metric-name">{m.name}</div><ProgressBar pct={m.pct} color={m.color} bg={m.bg} /><div className="pa2-metric-pct" style={{ color: m.color }}>{m.pct}%</div></div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* ══════════════════════════════════════════════
§1 — PRODUCTION VALUE REPORT
══════════════════════════════════════════════ */}
      {/* ── PRODUCTION VALUE REPORT ── */}
      <div className="pa2-card pa2-anim" style={{ "--d": "100ms" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.2rem" }}>
          <SectionHeader icon={<FiDollarSign size={16} />} title="Production Value Report" sub="Machine-wise Production Value (₹)" />
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div className="pa2-pv-toggle" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <button className={`pa2-pv-tab ${pvChartType === "bar" ? "pa2-pv-tab--active" : ""}`} onClick={() => setPvChartType("bar")} style={{ padding: "6px 12px" }}><FiLayers size={11} style={{ marginRight: "4px", verticalAlign: "middle" }} />Bar</button>
              <button className={`pa2-pv-tab ${pvChartType === "line" ? "pa2-pv-tab--active" : ""}`} onClick={() => setPvChartType("line")} style={{ padding: "6px 12px" }}><FiActivity size={11} style={{ marginRight: "4px", verticalAlign: "middle" }} />Line</button>
            </div>
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
        <div style={{ height: 340, marginTop: "1rem", position: "relative" }}>
          {pageLoading ? (
            <div className="pa2-chart-skeleton">
              <div className="pa2-skeleton" style={{ width: "100%", height: "100%", borderRadius: "10px" }} />
              <div className="pa2-skeleton-spinner">
                <FiLoader className="pa2-spinner-icon" />
                <span>Loading Production Values...</span>
              </div>
            </div>
          ) : (
            <canvas key={pvMode + pvChartType} ref={pvChartRef} />
          )}
        </div>
      </div>

      {/* ── MACHINE HOUR RATE (MHR) CALCULATION ── */}
      <div className="pa2-card pa2-anim" style={{ "--d": "105ms", marginTop: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.2rem", paddingBottom: "12px", borderBottom: "1.5px solid #eef2ff" }}>
          <SectionHeader icon={<FiClock size={16} />} title="Machine Hour Rate (MHR) Cost Analysis" sub="Machine-wise comparative analysis of hourly operating rates (₹/hr)" />

          <button
            className="pa2-pv-tab pa2-pv-tab--active"
            onClick={() => setMhrModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#2563eb",
              color: "#ffffff",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "700",
              border: "none",
              cursor: "pointer"
            }}
          >
            <FiSettings size={13} style={{ verticalAlign: "middle" }} /> MHR Rates & Inputs
          </button>
        </div>

        {/* Outer View: Dynamic MHR cost graph per date */}
        <div style={{ height: 320, position: "relative" }}>
          {pageLoading ? (
            <div className="pa2-chart-skeleton">
              <div className="pa2-skeleton" style={{ width: "100%", height: "100%", borderRadius: "10px" }} />
              <div className="pa2-skeleton-spinner">
                <FiLoader className="pa2-spinner-icon" />
                <span>Loading MHR cost trends...</span>
              </div>
            </div>
          ) : (
            <canvas ref={mhrChartRef} />
          )}
        </div>

        {/* Dynamic rate list tags */}
        <div className="pa2-mhr-bottom-rates" style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px", paddingTop: "14px", borderTop: "1.5px solid #f1f5f9" }}>
          {["HTC 1", "HTC 2", "HTC 3", "VMC 1", "VMC 2", "VTL 1", "VTL 2", "VTL 3", "VTL 4", "VMC-3", "MANUAL 1"].map(mac => {
            const rate = calculateMachineMhr(mac);
            return (
              <div
                key={mac}
                className="pa2-mhr-bottom-rate-tag"
                onClick={() => { setMhrSelectedMachine(mac); setMhrModalOpen(true); }}
                style={{
                  background: "#f8fafc",
                  border: "1.5px solid #e2e8f0",
                  padding: "5px 10px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#334155",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <span style={{ color: "#64748b" }}>{mac}:</span> <strong style={{ color: "#1e3a8a", fontVariantNumeric: "tabular-nums" }}>₹{rate.toFixed(2)}/h</strong>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MHR CONFIGURATION MODAL ── */}
      {mhrModalOpen && (() => {
        const inputs = mhrMachinesInputs[mhrSelectedMachine] || MHR_PRESETS["Custom (Manual)"];
        const hrs = inputs.annualHours || 1;

        // Fixed Calculations
        const depreciation = inputs.machineCost / (inputs.machineLife || 1);
        const interest = inputs.machineCost * (inputs.interestRate / 100);
        const totalFixedCostAnnual = depreciation + inputs.insurance + inputs.allocatedRent + inputs.supervisorSalary + interest;

        const depHr = depreciation / hrs;
        const insHr = inputs.insurance / hrs;
        const rentHr = inputs.allocatedRent / hrs;
        const supHr = inputs.supervisorSalary / hrs;
        const intHr = interest / hrs;
        const totalFixedCostHr = totalFixedCostAnnual / hrs;

        // Variable Calculations
        const totalVariableCostAnnual = inputs.operatorSalary + inputs.electricity + inputs.maintenance + inputs.consumables + inputs.toolWear;

        const oprHr = inputs.operatorSalary / hrs;
        const eleHr = inputs.electricity / hrs;
        const mntHr = inputs.maintenance / hrs;
        const conHr = inputs.consumables / hrs;
        const tolHr = inputs.toolWear / hrs;
        const totalVariableCostHr = totalVariableCostAnnual / hrs;

        // Total
        const totalMhrAnnual = totalFixedCostAnnual + totalVariableCostAnnual;
        const totalMhrHr = totalFixedCostHr + totalVariableCostHr;

        const renderMhrInput = (label, fieldName, step) => {
          const val = inputs[fieldName] ?? 0;
          const updateVal = (newVal) => {
            const updatedInputs = {
              ...(mhrMachinesInputs[mhrSelectedMachine] || MHR_PRESETS["Custom (Manual)"]),
              [fieldName]: Math.max(0, newVal)
            };
            setMhrSelectedMachine("Custom (Manual)");
            setMhrMachinesInputs(prev => ({
              ...prev,
              "Custom (Manual)": updatedInputs
            }));
          };

          return (
            <div className="pa2-mhr-input-field">
              <label style={{ fontSize: "9px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.2px", marginBottom: "4px" }}>{label}</label>
              <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #cbd5e1", borderRadius: "8px", background: "#ffffff", overflow: "hidden", height: "30px" }}>
                <button
                  type="button"
                  onClick={() => updateVal(val - step)}
                  style={{ width: "28px", height: "100%", background: "#f1f5f9", border: "none", color: "#475569", fontWeight: "700", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s ease" }}
                  onMouseEnter={e => e.target.style.background = "#e2e8f0"}
                  onMouseLeave={e => e.target.style.background = "#f1f5f9"}
                >-</button>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => updateVal(parseFloat(e.target.value) || 0)}
                  style={{ flex: 1, border: "none", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "#1e293b", width: "100%", outline: "none", padding: 0 }}
                />
                <button
                  type="button"
                  onClick={() => updateVal(val + step)}
                  style={{ width: "28px", height: "100%", background: "#f1f5f9", border: "none", color: "#475569", fontWeight: "700", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s ease" }}
                  onMouseEnter={e => e.target.style.background = "#e2e8f0"}
                  onMouseLeave={e => e.target.style.background = "#f1f5f9"}
                >+</button>
              </div>
            </div>
          );
        };

        return createPortal(
          <div className="pa2-modal-overlay" onClick={() => setMhrModalOpen(false)}>
            <div className="pa2-modal pa2-modal--mhr" onClick={e => e.stopPropagation()}>

              {/* Modal Header */}
              <div className="pa2-modal-hdr pa2-modal-hdr--mhr" style={{ "--mc": "#2563eb" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "36px", height: "36px", border: "1.5px solid #d1e2ff", borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContext: "center", color: "#2563eb", justifyContent: "center" }}>
                    <FiClock size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#1e293b", margin: 0 }}>MHR Inputs & Calculations</h3>
                    <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0 0" }}>Update parameters to dynamically re-apportion hourly operating rates</p>
                  </div>
                </div>

                {/* Preset Picker inside Modal Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: "800", color: "#475569", textTransform: "uppercase" }}>Machine:</span>
                  <select
                    value={mhrSelectedMachine}
                    onChange={(e) => handleMhrPresetChange(e.target.value)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid #d1e2ff",
                      fontSize: "12.5px",
                      fontWeight: "750",
                      color: "#1e3a8a",
                      background: "#f0f6ff",
                      outline: "none",
                      cursor: "pointer"
                    }}
                  >
                    {Object.keys(mhrMachinesInputs).map((preset) => (
                      <option key={preset} value={preset}>{preset}</option>
                    ))}
                  </select>
                  <button className="pa2-modal-close" onClick={() => setMhrModalOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", padding: 4 }}>
                    <FiXCircle size={22} />
                  </button>
                </div>
              </div>

              {/* Modal Content - Responsive Columns */}
              <div className="pa2-mhr-modal-split">

                {/* 1. CALCULATOR INPUTS */}
                <div className="pa2-mhr-inputs-panel" style={{ border: "none", boxShadow: "none", padding: 0 }}>
                  <h4 className="pa2-mhr-section-subtitle">1. CALCULATOR INPUTS</h4>
                  <div className="pa2-mhr-inputs-grid">
                    {renderMhrInput("Machine Cost (₹)", "machineCost", 50000)}
                    {renderMhrInput("Machine Life (Yrs)", "machineLife", 1)}
                    {renderMhrInput("Annual Hours", "annualHours", 100)}
                    {renderMhrInput("Interest Rate (%)", "interestRate", 0.5)}
                    {renderMhrInput("Insurance (Annual)", "insurance", 1000)}
                    {renderMhrInput("Allocated Rent (Annual)", "allocatedRent", 2000)}
                    {renderMhrInput("Supervisor Apport.", "supervisorSalary", 1000)}
                    {renderMhrInput("Operator Salary (Annual)", "operatorSalary", 5000)}
                    {renderMhrInput("Electricity (Annual)", "electricity", 5000)}
                    {renderMhrInput("Maintenance (Annual)", "maintenance", 1000)}
                    {renderMhrInput("Consumables (Annual)", "consumables", 1000)}
                    {renderMhrInput("Tooling & Wear (Annual)", "toolWear", 1000)}
                  </div>
                </div>

                {/* 2. MHR PARTICULARS SHEET */}
                <div className="pa2-mhr-table-panel" style={{ border: "none", boxShadow: "none", padding: 0 }}>
                  <h4 className="pa2-mhr-section-subtitle">2. MHR PARTICULARS SHEET</h4>
                  <div className="pa2-mhr-table-wrap" style={{ maxHeight: "420px" }}>
                    <table className="pa2-mhr-table">
                      <thead>
                        <tr>
                          <th>Particulars</th>
                          <th style={{ textAlign: "right" }}>Cost / Year (₹)</th>
                          <th style={{ textAlign: "right" }}>Cost / Hour (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="pa2-mhr-group-hdr">
                          <td colSpan={3}>Fixed Costs</td>
                        </tr>
                        <tr>
                          <td>Depreciation (Machine Cost ÷ Life)</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(depreciation).toLocaleString("en-IN")}</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{depHr.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td>Insurance</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(inputs.insurance).toLocaleString("en-IN")}</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{insHr.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td>Allocated Rent (Floor Space)</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(inputs.allocatedRent).toLocaleString("en-IN")}</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{rentHr.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td>Supervisor Salary (Apportioned)</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(inputs.supervisorSalary).toLocaleString("en-IN")}</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{supHr.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td>Interest on Capital (e.g., {inputs.interestRate}%)</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(interest).toLocaleString("en-IN")}</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{intHr.toFixed(2)}</td>
                        </tr>
                        <tr className="pa2-mhr-total-sub-row">
                          <td>Total Fixed Cost</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(totalFixedCostAnnual).toLocaleString("en-IN")}</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{totalFixedCostHr.toFixed(2)}</td>
                        </tr>

                        <tr className="pa2-mhr-group-hdr">
                          <td colSpan={3}>Variable Costs</td>
                        </tr>
                        <tr>
                          <td>Operator Salary</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(inputs.operatorSalary).toLocaleString("en-IN")}</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{oprHr.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td>Electricity</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(inputs.electricity).toLocaleString("en-IN")}</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{eleHr.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td>Maintenance</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(inputs.maintenance).toLocaleString("en-IN")}</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{mntHr.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td>Consumables</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(inputs.consumables).toLocaleString("en-IN")}</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{conHr.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td>Tool Wear and Replacement</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(inputs.toolWear).toLocaleString("en-IN")}</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{tolHr.toFixed(2)}</td>
                        </tr>
                        <tr className="pa2-mhr-total-sub-row">
                          <td>Total Variable Cost</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(totalVariableCostAnnual).toLocaleString("en-IN")}</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{totalVariableCostHr.toFixed(2)}</td>
                        </tr>

                        <tr className="pa2-mhr-grand-total-row">
                          <td>Total MHR (Fixed + Variable)</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(totalMhrAnnual).toLocaleString("en-IN")}</td>
                          <td className="pa2-mhr-td-num" style={{ fontVariantNumeric: "tabular-nums", fontWeight: "800", color: "#2563eb" }}>₹{totalMhrHr.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
          , document.body);
      })()}

      {/* ── MACHINE OEE GRAPH ── */}
      <div className="pa2-card pa2-anim" style={{ "--d": "110ms", marginTop: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.2rem" }}>
          <SectionHeader icon={<FiTrendingUp size={16} />} title="Machine Overall Equipment Effectiveness (OEE %)" sub="OEE performance trend analysis — Machine-wise / Month-wise" />
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div className="pa2-pv-toggle">
              <button className={`pa2-pv-tab ${oeeMode === "machine" ? "pa2-pv-tab--active" : ""}`} onClick={() => setOeeMode("machine")}><FiCpu size={12} style={{ marginRight: "5px", verticalAlign: "middle" }} />Machine Wise</button>
              <button className={`pa2-pv-tab ${oeeMode === "month" ? "pa2-pv-tab--active" : ""}`} onClick={() => setOeeMode("month")}><FiCalendar size={12} style={{ marginRight: "5px", verticalAlign: "middle" }} />Month Wise</button>
            </div>

            <div className="pa2-pv-toggle" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <button className={`pa2-pv-tab ${oeeChartType === "bar" ? "pa2-pv-tab--active" : ""}`} onClick={() => setOeeChartType("bar")} style={{ padding: "6px 12px" }}><FiLayers size={11} style={{ marginRight: "4px", verticalAlign: "middle" }} />Bar</button>
              <button className={`pa2-pv-tab ${oeeChartType === "line" ? "pa2-pv-tab--active" : ""}`} onClick={() => setOeeChartType("line")} style={{ padding: "6px 12px" }}><FiActivity size={11} style={{ marginRight: "4px", verticalAlign: "middle" }} />Line</button>
            </div>
          </div>
        </div>
        <div style={{ height: 260, marginTop: "0.5rem", position: "relative" }}>
          {pageLoading ? (
            <div className="pa2-chart-skeleton">
              <div className="pa2-skeleton" style={{ width: "100%", height: "100%", borderRadius: "10px" }} />
              <div className="pa2-skeleton-spinner">
                <FiLoader className="pa2-spinner-icon" />
                <span>Loading OEE Performance...</span>
              </div>
            </div>
          ) : (
            <canvas key={oeeMode + oeeChartType} ref={oeeChartRef} />
          )}
        </div>
      </div>

      {/* ── SETUP TIME MACHINE-WISE SINGLE GRAPH + TABLE ── */}
      <div className="pa2-card pa2-anim" style={{ "--d": "120ms", marginTop: "18px", marginBottom: "18px", overflow: "visible" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.2rem" }}>
          <SectionHeader icon={<FiClock size={16} />} title="Setup Time Machine-Wise" sub={`Setup / setting hours comparison grouped by ${setupFilterMode}`} />

          {/* Custom Premium Dropdown Filter & Part Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div ref={setupDropdownRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="pa2-ps-trigger"
                style={{
                  minWidth: "150px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.95)",
                  border: "1.5px solid rgba(45, 109, 232, 0.15)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                  fontWeight: "700",
                  color: "#1e3a8a"
                }}
                onClick={() => setSetupFilterOpen(o => !o)}
              >
                <span>
                  {setupFilterMode === "machine" && "Machine Wise"}
                  {setupFilterMode === "month" && "Month Wise"}
                  {setupFilterMode === "part" && "Partno Wise"}
                  {setupFilterMode === "shift" && "Shift Wise"}
                </span>
                <svg
                  style={{
                    transform: setupFilterOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    marginLeft: "8px",
                    color: "#2d6de8"
                  }}
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {setupFilterOpen && (
                <div
                  className="pa2-ps-menu"
                  style={{
                    position: "absolute",
                    top: "105%",
                    right: 0,
                    minWidth: "160px",
                    zIndex: 1000,
                    background: "#ffffff",
                    border: "1px solid rgba(45, 109, 232, 0.12)",
                    boxShadow: "0 10px 30px -5px rgba(26, 84, 212, 0.12)",
                    padding: "5px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px"
                  }}
                >
                  {[
                    { value: "machine", label: "Machine Wise" },
                    { value: "month", label: "Month Wise" },
                    { value: "part", label: "Partno Wise" },
                    { value: "shift", label: "Shift Wise" }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`pa2-ps-item ${setupFilterMode === opt.value ? "pa2-ps-item--active" : ""}`}
                      onClick={() => {
                        setSetupFilterMode(opt.value);
                        setSetupFilterOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {setupFilterMode === "part" && (
              <PremiumSelectMulti
                label=""
                value={setupSelectedParts}
                onChange={setSetupSelectedParts}
                placeholder="Filter Parts..."
                options={uniquePartsList}
              />
            )}

            {/* Custom Chart Type Dropdown Selector */}
            <div ref={setupChartTypeDropdownRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="pa2-ps-trigger"
                style={{
                  minWidth: "130px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.95)",
                  border: "1.5px solid rgba(45, 109, 232, 0.15)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                  fontWeight: "700",
                  color: "#1e3a8a"
                }}
                onClick={() => setSetupChartTypeOpen(o => !o)}
              >
                <span>
                  {setupChartType === "bar" ? "Bar Chart" : "Line Chart"}
                </span>
                <svg
                  style={{
                    transform: setupChartTypeOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    marginLeft: "8px",
                    color: "#2d6de8"
                  }}
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {setupChartTypeOpen && (
                <div
                  className="pa2-ps-menu"
                  style={{
                    position: "absolute",
                    top: "105%",
                    right: 0,
                    minWidth: "135px",
                    zIndex: 1000,
                    background: "#ffffff",
                    border: "1px solid rgba(45, 109, 232, 0.12)",
                    boxShadow: "0 10px 30px -5px rgba(26, 84, 212, 0.12)",
                    padding: "5px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px"
                  }}
                >
                  {[
                    { value: "bar", label: "Bar Chart" },
                    { value: "line", label: "Line Chart" }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`pa2-ps-item ${setupChartType === opt.value ? "pa2-ps-item--active" : ""}`}
                      onClick={() => {
                        setSetupChartType(opt.value);
                        setSetupChartTypeOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 450px), 1fr))", gap: "24px", marginTop: "1.2rem" }}>
          <div>
            <div style={{ height: 280, position: "relative" }}>
              {pageLoading ? (
                <div className="pa2-chart-skeleton">
                  <div className="pa2-skeleton" style={{ width: "100%", height: "100%", borderRadius: "10px" }} />
                  <div className="pa2-skeleton-spinner">
                    <FiLoader className="pa2-spinner-icon" />
                    <span>Loading Setup Times...</span>
                  </div>
                </div>
              ) : setupFilterMode === "part" && setupSelectedParts.length === 0 ? (
                <div style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(248, 250, 252, 0.5)",
                  border: "1.5px dashed rgba(45, 109, 232, 0.15)",
                  borderRadius: "12px",
                  color: "#64748b",
                  gap: "10px",
                  padding: "20px",
                  textAlign: "center"
                }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "rgba(45, 109, 232, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2d6de8",
                    marginBottom: "4px"
                  }}>
                    <FiClock size={22} />
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", fontFamily: "'Poppins', sans-serif" }}>Select Partno Option</div>
                  <div style={{ fontSize: "12px", maxWidth: "260px", color: "#64748b", lineHeight: "1.4", fontFamily: "'Poppins', sans-serif" }}>
                    Please use the search filter above to select the part numbers you want to analyze.
                  </div>
                </div>
              ) : (
                <canvas key={setupFilterMode + setupChartType} ref={setChartRef} />
              )}
            </div>
          </div>
          <div>
            <div className="pa2-table-wrap" style={{ maxHeight: "280px" }}>
              <table className="pa2-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>#</th>
                    <th onClick={() => handleSetupSort("date")} style={{ cursor: "pointer", userSelect: "none" }}>
                      Date <SortIcon active={setupSortField === "date"} direction={setupSortDirection} />
                    </th>
                    <th onClick={() => handleSetupSort("macNo")} style={{ cursor: "pointer", userSelect: "none" }}>
                      MacNo <SortIcon active={setupSortField === "macNo"} direction={setupSortDirection} />
                    </th>
                    <th onClick={() => handleSetupSort("shift")} style={{ cursor: "pointer", userSelect: "none" }}>
                      Shift <SortIcon active={setupSortField === "shift"} direction={setupSortDirection} />
                    </th>
                    <th onClick={() => handleSetupSort("partNo")} style={{ cursor: "pointer", userSelect: "none" }}>
                      Partno <SortIcon active={setupSortField === "partNo"} direction={setupSortDirection} />
                    </th>
                    <th onClick={() => handleSetupSort("process")} style={{ cursor: "pointer", userSelect: "none" }}>
                      Process <SortIcon active={setupSortField === "process"} direction={setupSortDirection} />
                    </th>
                    <th onClick={() => handleSetupSort("operatorName")} style={{ cursor: "pointer", userSelect: "none" }}>
                      Operator Name <SortIcon active={setupSortField === "operatorName"} direction={setupSortDirection} />
                    </th>
                    <th onClick={() => handleSetupSort("settingTime")} style={{ cursor: "pointer", userSelect: "none", textAlign: "right" }}>
                      Setting Time <SortIcon active={setupSortField === "settingTime"} direction={setupSortDirection} />
                    </th>
                    <th onClick={() => handleSetupSort("defaultSettingTime")} style={{ cursor: "pointer", userSelect: "none", textAlign: "right" }}>
                      (Default) Setting <SortIcon active={setupSortField === "defaultSettingTime"} direction={setupSortDirection} />
                    </th>
                    <th onClick={() => handleSetupSort("effectiveness")} style={{ cursor: "pointer", userSelect: "none" }}>
                      Effectiveness <SortIcon active={setupSortField === "effectiveness"} direction={setupSortDirection} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={idx}>
                        {Array.from({ length: 10 }).map((__, tdIdx) => (
                          <td key={tdIdx}><div className="pa2-skeleton" style={{ width: tdIdx === 0 ? "15px" : "45px", height: "12px" }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : setupFilterMode === "part" && setupSelectedParts.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                        <div style={{ fontWeight: 600, fontSize: "13px", color: "#64748b", fontFamily: "'Poppins', sans-serif" }}>No parts selected</div>
                        <div style={{ fontSize: "11px", marginTop: "4px", fontFamily: "'Poppins', sans-serif" }}>Select part numbers from the header dropdown to view details.</div>
                      </td>
                    </tr>
                  ) : (
                    sortedSettingTableData.map((row, i) => {
                      const effColor = row.effectiveness >= 100 ? "#10b981" : row.effectiveness >= 80 ? "#3b82f6" : "#ef4444";
                      const effBg = row.effectiveness >= 100 ? "rgba(16, 185, 129, 0.08)" : row.effectiveness >= 80 ? "rgba(59, 130, 246, 0.08)" : "rgba(239, 68, 68, 0.08)";

                      return (
                        <tr key={i} className="pa2-anim" style={{ "--d": `${i * 30}ms` }}>
                          <td className="pa2-td-muted">{row.sno}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{row.date}</td>
                          <td><span className="pa2-machine-chip" style={{ fontWeight: "700" }}>{row.macNo}</span></td>
                          <td>{row.shift}</td>
                          <td className="pa2-td-part" style={{ maxWidth: "130px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.partNo}>{row.partNo}</td>
                          <td>{row.process}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{row.operatorName}</td>
                          <td style={{ textAlign: "right", fontWeight: "600" }}>{row.settingTime} h</td>
                          <td style={{ textAlign: "right", fontWeight: "500", color: "#64748b" }}>{row.defaultSettingTime} h</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span className="pa2-badge" style={{ background: effBg, color: effColor, border: `1px solid ${effColor}22`, fontWeight: "800", fontSize: "10.5px", padding: "2px 6px" }}>{row.effectiveness}%</span>
                              <div style={{ width: "50px", height: "5px", background: "#f1f5f9", borderRadius: "99px", overflow: "hidden" }}>
                                <div style={{ width: `${Math.min(row.effectiveness, 100)}%`, height: "100%", background: effColor, borderRadius: "99px" }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── MACHINE UTILIZATION (%) FULL WIDTH ── */}
      <div className="pa2-card pa2-anim" style={{ "--d": "130ms", marginTop: "18px", marginBottom: "18px", overflow: "visible" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.2rem" }}>
          <SectionHeader icon={<FiActivity size={16} />} title="Machine Utilization (%)" sub={`Active machine running time as percentage of total hours grouped by ${utilFilterMode}`} />

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Grouping Filter Dropdown */}
            <div ref={utilFilterDropdownRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="pa2-ps-trigger"
                style={{
                  minWidth: "150px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.95)",
                  border: "1.5px solid rgba(45, 109, 232, 0.15)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                  fontWeight: "700",
                  color: "#1e3a8a"
                }}
                onClick={() => setUtilFilterOpen(o => !o)}
              >
                <span>
                  {utilFilterMode === "machine" && "Machine Wise"}
                  {utilFilterMode === "week" && "Week Wise"}
                  {utilFilterMode === "month" && "Month Wise"}
                  {utilFilterMode === "shift" && "Shift Wise"}
                </span>
                <svg
                  style={{
                    transform: utilFilterOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    marginLeft: "8px",
                    color: "#2d6de8"
                  }}
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {utilFilterOpen && (
                <div
                  className="pa2-ps-menu"
                  style={{
                    position: "absolute",
                    top: "105%",
                    right: 0,
                    minWidth: "160px",
                    zIndex: 1000,
                    background: "#ffffff",
                    border: "1px solid rgba(45, 109, 232, 0.12)",
                    boxShadow: "0 10px 30px -5px rgba(26, 84, 212, 0.12)",
                    padding: "5px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px"
                  }}
                >
                  {[
                    { value: "machine", label: "Machine Wise" },
                    { value: "week", label: "Week Wise" },
                    { value: "month", label: "Month Wise" },
                    { value: "shift", label: "Shift Wise" }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`pa2-ps-item ${utilFilterMode === opt.value ? "pa2-ps-item--active" : ""}`}
                      onClick={() => {
                        setUtilFilterMode(opt.value);
                        setUtilFilterOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Chart Type Dropdown Selector */}
            <div ref={utilChartTypeDropdownRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="pa2-ps-trigger"
                style={{
                  minWidth: "130px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.95)",
                  border: "1.5px solid rgba(45, 109, 232, 0.15)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                  fontWeight: "700",
                  color: "#1e3a8a"
                }}
                onClick={() => setUtilChartTypeOpen(o => !o)}
              >
                <span>
                  {utilChartType === "area" && "Area Chart"}
                  {utilChartType === "line" && "Line Chart"}
                  {utilChartType === "bar" && "Bar Chart"}
                </span>
                <svg
                  style={{
                    transform: utilChartTypeOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    marginLeft: "8px",
                    color: "#2d6de8"
                  }}
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {utilChartTypeOpen && (
                <div
                  className="pa2-ps-menu"
                  style={{
                    position: "absolute",
                    top: "105%",
                    right: 0,
                    minWidth: "135px",
                    zIndex: 1000,
                    background: "#ffffff",
                    border: "1px solid rgba(45, 109, 232, 0.12)",
                    boxShadow: "0 10px 30px -5px rgba(26, 84, 212, 0.12)",
                    padding: "5px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px"
                  }}
                >
                  {[
                    { value: "area", label: "Area Chart" },
                    { value: "line", label: "Line Chart" },
                    { value: "bar", label: "Bar Chart" }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`pa2-ps-item ${utilChartType === opt.value ? "pa2-ps-item--active" : ""}`}
                      onClick={() => {
                        setUtilChartType(opt.value);
                        setUtilChartTypeOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Searchable Threshold Input Dropdown Selector */}
            <div ref={utilThresholdDropdownRef} style={{ position: "relative" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#ffffff",
                  border: "1.5px solid rgba(45, 109, 232, 0.15)",
                  borderRadius: "10px",
                  padding: "2px 6px 2px 12px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                  minWidth: "160px"
                }}
              >
                <input
                  type="text"
                  placeholder="Min Util (e.g. 80)..."
                  value={utilThresholdVal}
                  onChange={(e) => {
                    setUtilThresholdVal(e.target.value);
                    setUtilThresholdOpen(true);
                  }}
                  onFocus={() => setUtilThresholdOpen(true)}
                  style={{
                    border: "none",
                    outline: "none",
                    width: "100%",
                    fontSize: "0.78rem",
                    fontWeight: "600",
                    color: "#1e3a8a",
                    fontFamily: "Poppins",
                    background: "transparent"
                  }}
                />
                {utilThresholdVal && (
                  <button
                    type="button"
                    onClick={() => {
                      setUtilThresholdVal("");
                      setUtilThresholdOpen(false);
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    <FiX size={12} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setUtilThresholdOpen(o => !o)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#2d6de8",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  <svg
                    style={{
                      transform: utilThresholdOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease"
                    }}
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>

              {utilThresholdOpen && (
                <div
                  className="pa2-ps-menu"
                  style={{
                    position: "absolute",
                    top: "105%",
                    right: 0,
                    minWidth: "160px",
                    zIndex: 1000,
                    background: "#ffffff",
                    border: "1px solid rgba(45, 109, 232, 0.12)",
                    boxShadow: "0 10px 30px -5px rgba(26, 84, 212, 0.12)",
                    padding: "5px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px"
                  }}
                >
                  {[
                    { value: "", label: "Show All" },
                    { value: ">= 85%", label: "High (>= 85%)" },
                    { value: ">= 75%", label: "Target (>= 75%)" },
                    { value: "< 75%", label: "Low (< 75%)" }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`pa2-ps-item ${utilThresholdVal === opt.value ? "pa2-ps-item--active" : ""}`}
                      onClick={() => {
                        setUtilThresholdVal(opt.value);
                        setUtilThresholdOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ height: 280, position: "relative" }}>
          {pageLoading ? (
            <div className="pa2-chart-skeleton">
              <div className="pa2-skeleton" style={{ width: "100%", height: "100%", borderRadius: "10px" }} />
              <div className="pa2-skeleton-spinner">
                <FiLoader className="pa2-spinner-icon" />
                <span>Loading Utilization Index...</span>
              </div>
            </div>
          ) : (
            <canvas key={utilFilterMode + utilChartType} ref={utilChartRef} />
          )}
        </div>
      </div>

      {/* ── MACHINE-WISE REJECTION & REWORK QUALITY ANALYSIS ── */}
      <div className="pa2-card pa2-anim" style={{ "--d": "135ms", marginTop: "18px", marginBottom: "18px" }}>
        <SectionHeader icon={<FiAlertCircle size={16} style={{ color: "#ef4444" }} />} title="Machine-Wise Rejection & Rework Analysis" sub="Rejection rates and rework rates breakdown by machine" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 450px), 1fr))", gap: "24px", marginTop: "1.2rem" }}>
          <div>
            <div style={{ height: 290, position: "relative" }}>
              {pageLoading ? (
                <div className="pa2-chart-skeleton">
                  <div className="pa2-skeleton" style={{ width: "100%", height: "100%", borderRadius: "10px" }} />
                  <div className="pa2-skeleton-spinner">
                    <FiLoader className="pa2-spinner-icon" />
                    <span>Loading Quality Analysis...</span>
                  </div>
                </div>
              ) : (
                <canvas ref={qualityChartRef} />
              )}
            </div>
          </div>
          <div>
            <div className="pa2-table-wrap" style={{ maxHeight: "290px" }}>
              <table className="pa2-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>#</th>
                    <th onClick={() => handleQualitySort("machine")} style={{ cursor: "pointer", userSelect: "none" }}>
                      Machine <SortIcon active={qualitySortField === "machine"} direction={qualitySortDirection} />
                    </th>
                    <th onClick={() => handleQualitySort("prodQty")} style={{ cursor: "pointer", userSelect: "none", textAlign: "right" }}>
                      Total Prod <SortIcon active={qualitySortField === "prodQty"} direction={qualitySortDirection} />
                    </th>
                    <th onClick={() => handleQualitySort("rejQty")} style={{ cursor: "pointer", userSelect: "none", textAlign: "right" }}>
                      Rej Qty <SortIcon active={qualitySortField === "rejQty"} direction={qualitySortDirection} />
                    </th>
                    <th onClick={() => handleQualitySort("rejPct")} style={{ cursor: "pointer", userSelect: "none", textAlign: "right" }}>
                      Rej % <SortIcon active={qualitySortField === "rejPct"} direction={qualitySortDirection} />
                    </th>
                    <th onClick={() => handleQualitySort("rwQty")} style={{ cursor: "pointer", userSelect: "none", textAlign: "right" }}>
                      Rwk Qty <SortIcon active={qualitySortField === "rwQty"} direction={qualitySortDirection} />
                    </th>
                    <th onClick={() => handleQualitySort("rwPct")} style={{ cursor: "pointer", userSelect: "none", textAlign: "right" }}>
                      Rwk % <SortIcon active={qualitySortField === "rwPct"} direction={qualitySortDirection} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={idx}>
                        {Array.from({ length: 7 }).map((__, tdIdx) => (
                          <td key={tdIdx}><div className="pa2-skeleton" style={{ width: tdIdx === 0 ? "15px" : "45px", height: "12px" }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    sortedQualityData.map((row, i) => (
                      <tr key={i} className="pa2-anim" style={{ "--d": `${i * 30}ms` }}>
                        <td className="pa2-td-muted">{i + 1}</td>
                        <td>
                          <span className="pa2-machine-chip" style={{ fontWeight: "700" }}>{row.machine}</span>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "600" }}>{row.prodQty}</td>
                        <td style={{ textAlign: "right", fontWeight: "600", color: "#ef4444" }}>{row.rejQty}</td>
                        <td style={{ textAlign: "right" }}>
                          <span className="pa2-badge" style={{ background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.15)", fontWeight: "800" }}>
                            {row.rejPct}%
                          </span>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "600", color: "#f59e0b" }}>{row.rwQty}</td>
                        <td style={{ textAlign: "right" }}>
                          <span className="pa2-badge" style={{ background: "rgba(245, 158, 11, 0.08)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.15)", fontWeight: "800" }}>
                            {row.rwPct}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOP 10 MACHINE UTILIZATION TABLE ── */}
      <div className="pa2-card pa2-anim" style={{ "--d": "140ms", marginBottom: "18px" }}>
        <SectionHeader icon={<FiActivity size={16} />} title="Top 10 Machine Utilization" sub="Active machine running hours vs idle breakdown ordered by highest utilization rate" />
        <div className="pa2-table-wrap" style={{ maxHeight: "310px" }}>
          <table className="pa2-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Machine</th>
                <th>Utilization %</th>
                <th>Running Hours</th>
                <th>Idle Hours</th>
                <th>Performance Status</th>
              </tr>
            </thead>
            <tbody>
              {pageLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    {Array.from({ length: 6 }).map((__, tdIdx) => (
                      <td key={tdIdx}>
                        <div className="pa2-skeleton" style={{ width: tdIdx === 0 ? "15px" : "60px", height: "12px" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                topUtilizationData.map((row, i) => {
                  const statusColor = row.utilization >= 85 ? "#10b981" : row.utilization >= 75 ? "#3b82f6" : "#f59e0b";
                  const statusBg = row.utilization >= 85 ? "rgba(16, 185, 129, 0.08)" : row.utilization >= 75 ? "rgba(59, 130, 246, 0.08)" : "rgba(245, 158, 11, 0.08)";
                  const statusLabel = row.utilization >= 85 ? "Optimal" : row.utilization >= 75 ? "Target Met" : "Underutilized";

                  // Rank Medals / Modern styling
                  let rankContent;
                  if (row.rank === 1) {
                    rankContent = <span style={{ display: "inline-block", background: "linear-gradient(135deg, #fef08a, #eab308)", color: "#854d0e", width: "22px", height: "22px", borderRadius: "50%", textAlign: "center", lineHeight: "22px", fontSize: "11px", fontWeight: "800", boxShadow: "0 2px 4px rgba(234,179,8,0.25)" }}>1</span>;
                  } else if (row.rank === 2) {
                    rankContent = <span style={{ display: "inline-block", background: "linear-gradient(135deg, #f1f5f9, #cbd5e1)", color: "#334155", width: "22px", height: "22px", borderRadius: "50%", textAlign: "center", lineHeight: "22px", fontSize: "11px", fontWeight: "800", boxShadow: "0 2px 4px rgba(148,163,184,0.2)" }}>2</span>;
                  } else if (row.rank === 3) {
                    rankContent = <span style={{ display: "inline-block", background: "linear-gradient(135deg, #ffedd5, #ca8a04)", color: "#78350f", width: "22px", height: "22px", borderRadius: "50%", textAlign: "center", lineHeight: "22px", fontSize: "11px", fontWeight: "800", boxShadow: "0 2px 4px rgba(202,138,4,0.2)" }}>3</span>;
                  } else {
                    rankContent = <span style={{ fontWeight: "700", color: "#64748b", paddingLeft: "6px" }}>{row.rank}</span>;
                  }

                  return (
                    <tr key={i} className="pa2-anim" style={{ "--d": `${i * 35}ms` }}>
                      <td>{rankContent}</td>
                      <td>
                        <span className="pa2-machine-chip" style={{ borderLeft: `3px solid ${row.utilization >= 85 ? "#10b981" : "#3b82f6"}`, paddingLeft: "8px", fontWeight: "600" }}>
                          {row.machine}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontWeight: "800", color: "#1e293b", minWidth: "35px" }}>{row.utilization}%</span>
                          <div style={{ flex: 1, height: "6px", background: "#f1f5f9", borderRadius: "99px", overflow: "hidden", minWidth: "120px" }}>
                            <div style={{ width: `${row.utilization}%`, height: "100%", background: `linear-gradient(90deg, ${statusColor}dd, ${statusColor})`, borderRadius: "99px" }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: "600", color: "#475569" }}>{row.runningHrs} hrs</td>
                      <td style={{ color: "#ef4444", fontWeight: "600" }}>{row.idleHrs} hrs</td>
                      <td>
                        <span className="pa2-badge" style={{ background: statusBg, color: statusColor, border: `1px solid ${statusColor}22`, fontWeight: "700", fontSize: "10px", padding: "3px 8px", borderRadius: "6px" }}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TOP 5 & LEAST 5 OEE MACHINES IN SINGLE SECTION ── */}
      <div className="pa2-card pa2-anim" style={{ "--d": "145ms", marginBottom: "18px" }}>
        <SectionHeader icon={<FiAward size={16} />} title="OEE Leaders & Laggards" sub="Direct comparison of Top 5 performing vs Least 5 performing machines by Overall Equipment Effectiveness" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginTop: "1rem" }}>

          {/* Top 5 OEE (Leaders) */}
          <div style={{ background: "rgba(16, 185, 129, 0.02)", border: "1px solid rgba(16, 185, 129, 0.08)", borderRadius: "10px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", borderBottom: "1px solid rgba(16, 185, 129, 0.1)", paddingBottom: "8px" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#d1fae5", color: "#065f46", width: "24px", height: "24px", borderRadius: "50%", fontSize: "11px", fontWeight: "700" }}>↑</span>
              <h4 style={{ margin: 0, fontSize: "13px", fontWeight: "800", color: "#065f46" }}>Top 5 OEE Machines</h4>
            </div>

            <table className="pa2-table pa2-table--simple" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Machine</th>
                  <th style={{ textAlign: "right" }}>OEE %</th>
                </tr>
              </thead>
              <tbody>
                {pageLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx}>
                      <td><div className="pa2-skeleton" style={{ width: "15px", height: "12px" }} /></td>
                      <td><div className="pa2-skeleton" style={{ width: "60px", height: "12px" }} /></td>
                      <td><div className="pa2-skeleton" style={{ width: "30px", height: "12px", marginLeft: "auto" }} /></td>
                    </tr>
                  ))
                ) : (
                  topOeeData.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: "700", color: "#10b981" }}>#{row.rank}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: "600", color: "#1e293b" }}>{row.machine}</span>
                          <span style={{ fontSize: "9.5px", color: "#64748b" }}>{row.type}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="pa2-badge" style={{ background: "rgba(16, 185, 129, 0.08)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.15)", fontWeight: "800", fontSize: "11px" }}>{row.oee}%</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Least 5 OEE (Laggards) */}
          <div style={{ background: "rgba(239, 68, 68, 0.02)", border: "1px solid rgba(239, 68, 68, 0.08)", borderRadius: "10px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", borderBottom: "1px solid rgba(239, 68, 68, 0.1)", paddingBottom: "8px" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fee2e2", color: "#991b1b", width: "24px", height: "24px", borderRadius: "50%", fontSize: "11px", fontWeight: "700" }}>↓</span>
              <h4 style={{ margin: 0, fontSize: "13px", fontWeight: "800", color: "#991b1b" }}>Least 5 OEE Machines</h4>
            </div>

            <table className="pa2-table pa2-table--simple" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Machine</th>
                  <th style={{ textAlign: "right" }}>OEE %</th>
                </tr>
              </thead>
              <tbody>
                {pageLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx}>
                      <td><div className="pa2-skeleton" style={{ width: "15px", height: "12px" }} /></td>
                      <td><div className="pa2-skeleton" style={{ width: "60px", height: "12px" }} /></td>
                      <td><div className="pa2-skeleton" style={{ width: "30px", height: "12px", marginLeft: "auto" }} /></td>
                    </tr>
                  ))
                ) : (
                  leastOeeData.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: "700", color: "#ef4444" }}>#{row.rank}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: "600", color: "#1e293b" }}>{row.machine}</span>
                          <span style={{ fontSize: "9.5px", color: "#64748b" }}>{row.type}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="pa2-badge" style={{ background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.15)", fontWeight: "800", fontSize: "11px" }}>{row.oee}%</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>


      {/* ── MACHINE TREND GRAPHS ── */}
      <div className="pa2-row-2" style={{ marginBottom: "18px" }}>
        <div className="pa2-card pa2-anim" style={{ "--d": "150ms" }}>
          <SectionHeader icon={<FiPlus size={16} />} title="Machine Added Trend" sub="Incubation / addition of new machines in production line month-wise" />
          <div style={{ height: 230, marginTop: "1rem", position: "relative" }}>
            {pageLoading ? (
              <div className="pa2-chart-skeleton">
                <div className="pa2-skeleton" style={{ width: "100%", height: "100%", borderRadius: "10px" }} />
                <div className="pa2-skeleton-spinner">
                  <FiLoader className="pa2-spinner-icon" />
                  <span>Loading Trend...</span>
                </div>
              </div>
            ) : (
              <canvas ref={macAddedChartRef} />
            )}
          </div>
        </div>
        <div className="pa2-card pa2-anim" style={{ "--d": "160ms" }}>
          <SectionHeader icon={<FiActivity size={16} />} title="Machine Efficiency% Trend" sub="Average operational performance rate tracking month-wise" />
          <div style={{ height: 230, marginTop: "1rem", position: "relative" }}>
            {pageLoading ? (
              <div className="pa2-chart-skeleton">
                <div className="pa2-skeleton" style={{ width: "100%", height: "100%", borderRadius: "10px" }} />
                <div className="pa2-skeleton-spinner">
                  <FiLoader className="pa2-spinner-icon" />
                  <span>Loading Trend Index...</span>
                </div>
              </div>
            ) : (
              <canvas ref={macEffTrendChartRef} />
            )}
          </div>
        </div>
      </div>

      <div className="pa2-row-2">
        <div className="pa2-card pa2-card--success pa2-anim" style={{ "--d": "80ms" }}>
          <SectionHeader icon={<FiCheckCircle size={16} />} title="Idle Hours — Accepted Reasons" sub={pageLoading ? "Loading..." : `Total: ${totalAcceptedHrs.toFixed(1)} hrs  (${idleBreakdown.summary.accepted_pct}%)`} />
          <div className="pa2-idle-layout">
            {pageLoading ? (
              <>
                <div className="pa2-skeleton" style={{ width: "130px", height: "130px", borderRadius: "50%" }} />
                <div className="pa2-idle-list" style={{ width: "100%", gap: "8px" }}>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="pa2-idle-row"><div className="pa2-skeleton" style={{ width: "100%", height: "12px" }} /></div>
                  ))}
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
        <div className="pa2-card pa2-card--danger pa2-anim" style={{ "--d": "110ms" }}>
          <SectionHeader icon={<FiAlertCircle size={16} />} title="Idle Hours — Non-Accepted Reasons" sub={pageLoading ? "Loading..." : `Total: ${totalNonAccepted.toFixed(1)} hrs  |  ⚠ Needs Action (${idleBreakdown.summary.non_accepted_pct}%)`} />
          <div className="pa2-idle-layout">
            {pageLoading ? (
              <>
                <div className="pa2-skeleton" style={{ width: "130px", height: "130px", borderRadius: "50%" }} />
                <div className="pa2-idle-list" style={{ width: "100%", gap: "8px" }}>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="pa2-idle-row"><div className="pa2-skeleton" style={{ width: "100%", height: "12px" }} /></div>
                  ))}
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
      {/* ══════════════════════════════════════════════
NEW §3 — NON-ACCEPTED IDLE: PRODUCTION LOSS
══════════════════════════════════════════════ */}
      <div className="pa2-card pa2-card--loss pa2-anim" style={{ "--d": "90ms" }}>
        <SectionHeader icon={<FiTrendingDown size={16} />} title="Production Loss — Non-Accepted Idle Hours × Rate per Hour" sub="Financial impact of unplanned downtime based on process-specific production rate" />
        <div className="pa2-loss-kpis">
          {pageLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="pa2-loss-kpi" style={{ borderColor: "#f1f5f9" }}>
                <div className="pa2-skeleton" style={{ width: "80px", height: "10px", marginBottom: "8px" }} />
                <div className="pa2-skeleton" style={{ width: "60px", height: "18px" }} />
              </div>
            ))
          ) : (
            <>
              <div className="pa2-loss-kpi pa2-loss-kpi--red"><div className="pa2-loss-kpi-lbl">Total Loss Value</div><div className="pa2-loss-kpi-val">₹{totalLoss.toLocaleString("en-IN")}</div></div>
              <div className="pa2-loss-kpi pa2-loss-kpi--orange"><div className="pa2-loss-kpi-lbl">Total Unplanned Hours</div><div className="pa2-loss-kpi-val">{totalNonAccepted.toFixed(1)} hrs</div></div>
              <div className="pa2-loss-kpi pa2-loss-kpi--amber"><div className="pa2-loss-kpi-lbl">Avg Loss per Hour</div><div className="pa2-loss-kpi-val">₹{(totalLoss / totalNonAccepted).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div></div>
              <div className="pa2-loss-kpi pa2-loss-kpi--purple"><div className="pa2-loss-kpi-lbl">Recoverable Potential</div><div className="pa2-loss-kpi-val">₹{(totalLoss * 0.62).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div></div>
            </>
          )}
        </div>
        <div className="pa2-loss-table-wrap">
          <table className="pa2-loss-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Reason</th>
                <th style={{ textAlign: "right" }}>Idle Hours</th>
                <th style={{ textAlign: "right" }}>Rate / hr</th>
                <th style={{ textAlign: "right" }}>Loss Value</th>
                <th style={{ textAlign: "left", paddingLeft: "24px" }}>% of Total Loss</th>
                <th style={{ textAlign: "left" }}>Impact</th>
              </tr>
            </thead>
            <tbody>
              {pageLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx}>
                    <td><div className="pa2-skeleton" style={{ width: "120px", height: "12px" }} /></td>
                    <td><div className="pa2-skeleton" style={{ width: "40px", height: "12px", marginLeft: "auto" }} /></td>
                    <td><div className="pa2-skeleton" style={{ width: "50px", height: "12px", marginLeft: "auto" }} /></td>
                    <td><div className="pa2-skeleton" style={{ width: "60px", height: "12px", marginLeft: "auto" }} /></td>
                    <td><div className="pa2-skeleton" style={{ width: "80px", height: "10px" }} /></td>
                    <td><div className="pa2-skeleton" style={{ width: "50px", height: "14px", borderRadius: "4px" }} /></td>
                  </tr>
                ))
              ) : (
                <>
                  {idleBreakdown.non_accepted.reasons.map((r, i) => {
                    const loss = r.loss_value || 0;
                    const lossPct = totalLoss > 0 ? (loss / totalLoss * 100).toFixed(1) : "0.0";
                    const impact = loss > 300000 ? "Critical" : loss > 150000 ? "High" : loss > 80000 ? "Medium" : "Low";
                    const impactClass = loss > 300000 ? "pa2-imp--crit" : loss > 150000 ? "pa2-imp--high" : loss > 80000 ? "pa2-imp--med" : "pa2-imp--low";
                    return (
                      <tr key={i} className="pa2-anim" style={{ "--d": `${i * 50}ms` }}>
                        <td><span className="pa2-idle-dot" style={{ background: r.color }} />{r.reason}</td>
                        <td className="pa2-td-num">{r.hours}</td>
                        <td className="pa2-td-num">₹{(r.rate_per_hr || 0).toLocaleString("en-IN")}</td>
                        <td className="pa2-td-num pa2-td-loss">₹{loss.toLocaleString("en-IN")}</td>
                        <td style={{ paddingLeft: "24px" }}>
                          <div className="pa2-loss-bar-inline">
                            <div className="pa2-loss-bar-fill" style={{ width: `${lossPct}%`, background: r.color }} />
                            <span>{lossPct}%</span>
                          </div>
                        </td>
                        <td><span className={`pa2-imp ${impactClass}`}>{impact}</span></td>
                      </tr>
                    );
                  })}
                  <tr className="pa2-total-row">
                    <td><strong>Total</strong></td>
                    <td className="pa2-td-num"><strong>{totalNonAccepted.toFixed(1)}</strong></td>
                    <td className="pa2-td-num">—</td>
                    <td className="pa2-td-num pa2-td-loss"><strong>₹{totalLoss.toLocaleString("en-IN")}</strong></td>
                    <td style={{ paddingLeft: "24px" }}><strong>100%</strong></td>
                    <td>—</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DAILY PRODUCTION DETAILS ── */}
      <div className="pa2-card pa2-anim" style={{ "--d": "80ms" }}>
        <SectionHeader icon={<FiTable size={16} />} title="Daily Production Details" sub={pageLoading ? "Loading…" : `${filteredTableData.length} shift record(s)`} />
        <div className="pa2-table-wrap">
          <table className="pa2-table">
            <thead>
              <tr>
                <th onClick={() => handleDailySort("SNo")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    # <SortIcon active={dailySortField === "SNo"} direction={dailySortDirection} />
                  </div>
                </th>
                <th onClick={() => handleDailySort("Date")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    Date <SortIcon active={dailySortField === "Date"} direction={dailySortDirection} />
                  </div>
                </th>
                <th onClick={() => handleDailySort("Machine")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    Machine <SortIcon active={dailySortField === "Machine"} direction={dailySortDirection} />
                  </div>
                </th>
                <th onClick={() => handleDailySort("Shift")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    Shift <SortIcon active={dailySortField === "Shift"} direction={dailySortDirection} />
                  </div>
                </th>
                <th onClick={() => handleDailySort("Operator")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    Operator <SortIcon active={dailySortField === "Operator"} direction={dailySortDirection} />
                  </div>
                </th>
                <th onClick={() => handleDailySort("Part")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    Part <SortIcon active={dailySortField === "Part"} direction={dailySortDirection} />
                  </div>
                </th>
                <th onClick={() => handleDailySort("Process")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    Process <SortIcon active={dailySortField === "Process"} direction={dailySortDirection} />
                  </div>
                </th>
                <th onClick={() => handleDailySort("Target")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                    Target <SortIcon active={dailySortField === "Target"} direction={dailySortDirection} />
                  </div>
                </th>
                <th onClick={() => handleDailySort("OKQty")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                    OK Qty <SortIcon active={dailySortField === "OKQty"} direction={dailySortDirection} />
                  </div>
                </th>
                <th onClick={() => handleDailySort("MatRej")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                    Mat Rej <SortIcon active={dailySortField === "MatRej"} direction={dailySortDirection} />
                  </div>
                </th>
                <th onClick={() => handleDailySort("MacRej")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                    Mac Rej <SortIcon active={dailySortField === "MacRej"} direction={dailySortDirection} />
                  </div>
                </th>
                <th onClick={() => handleDailySort("RwQty")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                    Rw Qty <SortIcon active={dailySortField === "RwQty"} direction={dailySortDirection} />
                  </div>
                </th>
                <th onClick={() => handleDailySort("IdleHrs")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                    Idle Hrs <SortIcon active={dailySortField === "IdleHrs"} direction={dailySortDirection} />
                  </div>
                </th>
                <th onClick={() => handleDailySort("EffPct")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                    Eff % <SortIcon active={dailySortField === "EffPct"} direction={dailySortDirection} />
                  </div>
                </th>
                <th onClick={() => handleDailySort("Status")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    Status <SortIcon active={dailySortField === "Status"} direction={dailySortDirection} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx}>
                    {Array.from({ length: 15 }).map((__, tdIdx) => (
                      <td key={tdIdx}><div className="pa2-skeleton" style={{ width: tdIdx === 0 ? "15px" : tdIdx === 4 ? "90px" : "45px", height: "12px" }} /></td>
                    ))}
                  </tr>
                ))
              ) : (
                <>
                  {tableLoading && (
                    <tr><td colSpan={15} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", fontStyle: "italic" }}>Loading production data…</td></tr>
                  )}
                  {!tableLoading && filteredTableData.length === 0 && (
                    <tr><td colSpan={15} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", fontStyle: "italic" }}>No production records found matching the filters.</td></tr>
                  )}
                  {!tableLoading && sortedTableData.map((row, i) => {
                    const isRejected = row.Status === "Rejected";
                    const badge = isRejected ? "pa2-badge--bad" : "pa2-badge--ok";
                    const formattedDate = row.Date ? new Date(row.Date).toLocaleDateString("en-IN") : "—";

                    const matRej = row.MaterialRejection ?? row.MatRej ?? (row.Rej ? Math.floor(row.Rej * 0.6) : 0);
                    const macRej = row.MachineRejection ?? row.MacRej ?? (row.Rej ? (row.Rej - matRej) : 0);
                    const rwQty = row.ReworkQty ?? row.RwQty ?? (row.OKQty ? Math.max(0, (row.SNo % 3 === 0 ? Math.floor(row.OKQty * 0.05) : 0)) : 0);
                    const idleHrs = row.IdleHours ?? row.IdleHrs ?? (row.Rej > 0 || row.OKQty < row.Target ? parseFloat((Math.max(0.2, (row.Target - row.OKQty) * 0.1)).toFixed(1)) : 0);

                    return (
                      <tr key={i} className="pa2-anim" style={{ "--d": `${i * 40}ms` }}>
                        <td className="pa2-td-muted">{row.SNo}</td>
                        <td>{formattedDate}</td>
                        <td><span className="pa2-machine-chip">{row.Machine || "—"}</span></td>
                        <td>{row.Shift || "—"}</td>
                        <td>{row.Operator || "—"}</td>
                        <td className="pa2-td-part">{row.Part || "—"}</td>
                        <td>{row.Process || "—"}</td>
                        <td className="pa2-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{(row.Target || 0).toLocaleString()}</td>
                        <td className="pa2-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{(row.OKQty || 0).toLocaleString()}</td>
                        <td className="pa2-td-num" style={{ color: matRej > 0 ? "#ef4444" : "#059669", fontWeight: "600", fontVariantNumeric: "tabular-nums" }}>{matRej}</td>
                        <td className="pa2-td-num" style={{ color: macRej > 0 ? "#ef4444" : "#059669", fontWeight: "600", fontVariantNumeric: "tabular-nums" }}>{macRej}</td>
                        <td className="pa2-td-num" style={{ color: rwQty > 0 ? "#f59e0b" : "#059669", fontWeight: "600", fontVariantNumeric: "tabular-nums" }}>{rwQty}</td>
                        <td className="pa2-td-num" style={{ color: idleHrs > 0 ? "#ef4444" : "#059669", fontWeight: "600", fontVariantNumeric: "tabular-nums" }}>{idleHrs} h</td>
                        <td className="pa2-td-num" style={{ fontVariantNumeric: "tabular-nums" }}>{(row.EffPct || 0).toFixed(2)}%</td>
                        <td><span className={`pa2-badge ${badge}`}>{row.Status || "OK"}</span></td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}