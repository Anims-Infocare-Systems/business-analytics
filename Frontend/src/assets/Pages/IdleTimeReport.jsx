import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { resolveApiBase } from "../../apiBase";
import IdleTimeReportDatePicker from "./IdleTimeReportDatePicker";
import "./IdleTimeReport.css";
import {
  FiClock,
  FiDollarSign,
  FiCpu,
  FiClipboard,
  FiTrendingUp,
  FiRefreshCw,
  FiSearch,
  FiBarChart2,
  FiCheckCircle,
  FiCalendar,
  FiAlertTriangle,
  FiList,
  FiLoader,
  FiUser
} from "react-icons/fi";

Chart.register(...registerables, ChartDataLabels);

/* ─── Premium chart global defaults ─────────────────────────── */
const CHART_FONT = "Nunito, Inter, sans-serif";
const GRID_COLOR = "rgba(203,213,225,0.4)";
const TICK_STYLE = { font: { size: 11, family: CHART_FONT, weight: "600" }, color: "#64748b" };
const TOOLTIP_BASE = {
  backgroundColor: "rgba(15,23,42,0.92)",
  titleColor: "#f1f5f9",
  bodyColor: "#cbd5e1",
  padding: { x: 14, y: 10 },
  cornerRadius: 10,
  titleFont: { family: CHART_FONT, weight: "800", size: 12 },
  bodyFont: { family: CHART_FONT, size: 12 },
  boxPadding: 6,
  usePointStyle: true,
};
function makeGradient(ctx, canvas, top, bottom) {
  const grad = canvas.getContext("2d").createLinearGradient(0, 0, 0, canvas.offsetHeight || 280);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  return grad;
}

const API_BASE = resolveApiBase();

function toIsoDate(d) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Decimal hours → HH:MM:SS (matches ERP TotalIdleHours display). */
function decimalHoursToHms(hours) {
  const secs = Math.max(0, Math.round(Number(hours || 0) * 3600));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** X-axis tick: show HH:MM:SS for hour-scale values. */
function formatTopReasonAxisTick(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "";
  return decimalHoursToHms(n);
}

/* ════════════════════════════════════════════════
   DATA CONSTANTS
════════════════════════════════════════════════ */

const KPI_CARD_STYLES = [
  { icon: <FiClock size={22} />, label: "Total Machine Idle Hours", neg: true, color: "#dc2626", bg: "#fef2f2", border: "#dc2626" },
  { icon: <FiDollarSign size={22} />, label: "Total Idle Cost", neg: true, color: "#f97316", bg: "#fff7ed", border: "#f97316" },
  { icon: <FiCpu size={22} />, label: "Avg Idle", neg: false, color: "#2563eb", bg: "#eff6ff", border: "#2563eb" },
  { icon: <FiClipboard size={22} />, label: "Idle Not Entered", neg: true, color: "#7c3aed", bg: "#f5f3ff", border: "#7c3aed" },
  { icon: <FiTrendingUp size={22} />, label: "Top Idle Reason", neg: true, color: "#d97706", bg: "#fffbeb", border: "#d97706" },
  { icon: <FiRefreshCw size={22} />, label: "Continuous Idle > 4h", neg: true, color: "#0891b2", bg: "#ecfeff", border: "#0891b2" },
];

function buildKpiCards(kpis, periodLabel) {
  const k = kpis || {};
  const pct = k.top_idle_reason_pct != null ? `${k.top_idle_reason_pct}% of total` : "0% of total";
  const mc = k.machine_count != null ? `${k.machine_count} m/c` : "0 m/c";
  return [
    { ...KPI_CARD_STYLES[0], value: k.total_idle_hours_display ?? "0:00:00", sub: periodLabel || "This Period", badge: "" },
    { ...KPI_CARD_STYLES[1], value: k.total_idle_cost_display ?? "₹ 0", sub: "RatePerHr × idle hrs", badge: "" },
    { ...KPI_CARD_STYLES[2], value: k.avg_idle_display ?? "0:00:00", sub: "Avg per machine", badge: mc },
    { ...KPI_CARD_STYLES[3], value: k.idle_not_entered != null ? String(k.idle_not_entered) : "0", sub: "Shift slots missing entry", badge: "" },
    { ...KPI_CARD_STYLES[4], value: k.top_idle_reason ?? "—", sub: pct, badge: (k.top_idle_reason_pct ?? 0) > 10 ? "high" : "" },
    { ...KPI_CARD_STYLES[5], value: k.continuous_idle_over_4h != null ? String(k.continuous_idle_over_4h) : "0", sub: "Machines flagged", badge: "" },
  ];
}

const TOP_REASONS = {
  labels: ["MACHINE CLEANING", "INSERT CHANGE", "NO LOAD", "MACHINE BREAKDOWN",
    "SETTING", "NMP", "LUNCH HOURS", "TOOL CHANGE", "WAITING SETTER", "WAITING MATERIAL"],
  data: [1210, 912, 1033, 343, 106, 361, 679, 420, 118, 280],
  hours_display: [],
  colors: ["#dc2626", "#f97316", "#d97706", "#dc2626", "#0891b2",
    "#f97316", "#16a34a", "#7c3aed", "#2563eb", "#0891b2"],
};

const SPLIT_TILE_STYLE = {
  accepted: { c: "#2563eb", bg: "rgba(37,99,235,0.07)", bc: "rgba(37,99,235,0.25)" },
  nonAccepted: { c: "#dc2626", bg: "rgba(220,38,38,0.07)", bc: "rgba(220,38,38,0.25)" },
};

function buildAcceptedIdle(api) {
  const a = api || {};
  const accPct = a.accepted_pct ?? 0;
  const naPct = a.non_accepted_pct ?? 0;
  const chart = a.chart_hours?.length === 2
    ? a.chart_hours.map(v => Number(v) || 0)
    : [0, 0];
  return {
    chart,
    hours_display: [a.accepted_hours_display ?? "0:00:00", a.non_accepted_hours_display ?? "0:00:00"],
    tiles: [
      {
        lbl: "Accepted Idle",
        val: a.accepted_hours_display ?? "0:00:00",
        pct: `${accPct}%`,
        ...SPLIT_TILE_STYLE.accepted,
      },
      {
        lbl: "Non-Accepted Idle",
        val: a.non_accepted_hours_display ?? "0:00:00",
        pct: `${naPct}%`,
        ...SPLIT_TILE_STYLE.nonAccepted,
      },
    ],
  };
}

const DEFAULT_ACCEPTED_IDLE = buildAcceptedIdle({
  accepted_hours_display: "8,319:45",
  non_accepted_hours_display: "5,098:55",
  accepted_pct: 62,
  non_accepted_pct: 38,
  chart_hours: [62, 38],
});

const MONTHWISE = {
  labels: ["Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26", "Mar 26"],
  hours: [2100, 1980, 2400, 2200, 1850, 2890],
  cost: [0.65, 0.61, 0.74, 0.68, 0.57, 0.90],
};

const DAYWISE = {
  labels: Array.from({ length: 27 }, (_, i) => `${i + 1}`),
  data: [340, 280, 410, 390, 320, 0, 0, 450, 390, 310, 420, 380, 290, 0,
    0, 460, 420, 350, 390, 300, 280, 440, 380, 350, 410, 290, 420],
};

// Default fallbacks until API data loads
const COST_MACHINE = {
  labels: ["TC-24-S1", "TC-41-L", "TC-20", "BROACH-2", "TC-42", "VMC-23", "TC-27",
    "TC-30", "TC-25", "TC-45", "TC-50", "VTL-05", "TC-39", "VMC-01", "TC-37"],
  hours: [210, 196, 188, 180, 175, 172, 168, 165, 162, 158, 155, 152, 148, 138, 142],
  cost: [66, 62, 60, 57, 55, 54, 53, 52, 51, 50, 49, 48, 47, 44, 45],
};

const PCT_MACHINE = {
  labels: ["TC-24-S1", "TC-41-L", "TC-20", "BROACH-2", "TC-42", "VMC-23", "TC-27", "TC-30", "TC-25", "TC-45"],
  data: [14.2, 13.3, 12.7, 12.2, 11.9, 11.6, 11.4, 11.2, 11.0, 10.7],
};

const CONTINUOUS = [
  { machine: "TC-24-S1", reason: "MACHINE BREAKDOWN", hours: "4:30", shifts: 2, status: "CRITICAL" },
  { machine: "VMC-01", reason: "NO PLAN", hours: "6:00", shifts: 3, status: "CRITICAL" },
  { machine: "TC-41-L", reason: "NMP", hours: "5:15", shifts: 2, status: "HIGH" },
  { machine: "BROACH-2", reason: "MACHINE BREAKDOWN", hours: "4:00", shifts: 1, status: "HIGH" },
  { machine: "VTL-03", reason: "NO LOAD", hours: "4:45", shifts: 2, status: "HIGH" },
  { machine: "TC-02", reason: "NO PLAN", hours: "5:30", shifts: 3, status: "CRITICAL" },
  { machine: "TC-20", reason: "MACHINE CLEANING", hours: "4:10", shifts: 1, status: "MEDIUM" },
];

const DEFAULT_NOT_ENTERED = {
  rows: [
    { machine: "TC-15", shift: "Shift 1", date: "25 Mar", operator: "Rajan K" },
    { machine: "VMC-05", shift: "Shift 2", date: "26 Mar", operator: "Murugan S" },
    { machine: "TC-28", shift: "Shift 3", date: "26 Mar", operator: "Pending" },
    { machine: "BROACH-3", shift: "Shift 1", date: "27 Mar", operator: "Karthik P" },
    { machine: "VTL-02", shift: "Shift 2", date: "25 Mar", operator: "Pending" },
  ],
  summary: { not_entered: 14, partial_entry: 8, completed: 68 },
};

const DEFAULT_REASON_MACHINE_DETAIL = {
  column_headers: ["BROACH-1", "BROACH-2", "TC-01", "TC-02", "VMC-01", "VMC-02", "VTL-03"],
  rows: [
    { reason: "NO PLAN", cols: ["3:30", "12:00", "19:00", "14:00", "48:00", "38:00", "161:00"], total: "458:15", pct: "7.62", lvl: "high" },
    { reason: "NMP", cols: ["24:15", "52:30", "55:00", "28:30", "62:30", "65:00", "72:00"], total: "361:25", pct: "6.02", lvl: "high" },
    { reason: "INSERT CHANGE", cols: ["0:30", "0:30", "8:00", "16:20", "21:30", "22:25", "6:45"], total: "912:55", pct: "1.52", lvl: "medium" },
    { reason: "MACHINE CLEANING", cols: ["14:45", "7:15", "19:30", "17:15", "21:15", "25:15", "13:00"], total: "1210:15", pct: "2.01", lvl: "medium" },
    { reason: "LUNCH HOURS", cols: ["7:30", "3:00", "5:00", "12:30", "11:30", "11:00", "3:00"], total: "679:20", pct: "1.13", lvl: "low" },
    { reason: "MACHINE BREAKDOWN", cols: ["5:00", "32:30", "31:00", "8:30", "120:00", "87:30", "3:30"], total: "343:00", pct: "0.57", lvl: "high" },
    { reason: "NO LOAD", cols: ["18:15", "62:45", "2:00", "6:00", "2:30", "15:00", "45:00"], total: "1033:00", pct: "1.72", lvl: "medium" },
    { reason: "SETTING", cols: ["21:30", "0:30", "1:00", "1:00", "0:30", "3:00", "14:00"], total: "106:00", pct: "0.18", lvl: "medium" },
    { reason: "WAITING FOR SETTER", cols: ["0:00", "5:30", "8:30", "8:30", "7:00", "1:30", "3:30"], total: "118:15", pct: "0.20", lvl: null },
  ],
  footer: {
    cols: ["118:00", "179:30", "174:15", "177:00", "166:00", "168:00", "130:15"],
    total: "13,418:40",
    pct: "100",
  },
};

const SHIFT_DATA = {
  labels: ["BROACH-1", "BROACH-2", "TC-01", "TC-02", "VMC-01", "VMC-02", "VTL-03"],
  s1: [38, 62, 55, 42, 58, 45, 32],
  s2: [44, 58, 60, 38, 52, 56, 38],
  s3: [36, 59, 59, 47, 56, 67, 60],
};

const SHIFT_TILES = [
  { label: "Shift 1  6AM–2PM", count: 38, total: 90, color: "#2563eb", bg: "rgba(37,99,235,0.07)", border: "rgba(37,99,235,0.2)" },
  { label: "Shift 2  2PM–10PM", count: 44, total: 90, color: "#f97316", bg: "rgba(249,115,22,0.07)", border: "rgba(249,115,22,0.2)" },
  { label: "Shift 3  10PM–6AM", count: 31, total: 90, color: "#16a34a", bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.2)" },
  { label: "All Shifts", count: 90, total: 90, color: "#7c3aed", bg: "rgba(124,58,237,0.07)", border: "rgba(124,58,237,0.2)" },
];

function buildDefaultShiftChart() {
  return {
    labels: SHIFT_DATA.labels,
    datasets: [
      { label: "Shift 1", data: SHIFT_DATA.s1, backgroundColor: "rgba(37,99,235,0.7)", borderColor: "#2563eb" },
      { label: "Shift 2", data: SHIFT_DATA.s2, backgroundColor: "rgba(249,115,22,0.7)", borderColor: "#f97316" },
      { label: "Shift 3", data: SHIFT_DATA.s3, backgroundColor: "rgba(22,163,74,0.7)", borderColor: "#16a34a" },
    ],
  };
}

const DEFAULT_TOTAL_STATS = [
  { label: "Total Machine Hours Available", value: "90,000:00", color: "#2563eb" },
  { label: "Total Idle Hours", value: "13,418:40", color: "#dc2626" },
  { label: "Total Productive Hours", value: "76,581:20", color: "#16a34a" },
  { label: "Overall Idle %", value: "14.9%", color: "#f97316" },
];

function buildTotalStats(u) {
  const t = u || {};
  const pct = t.overall_idle_percent != null ? `${t.overall_idle_percent}%` : "0%";
  return [
    { label: "Total Machine Hours Available", value: t.total_machine_hours_available ?? "0:00", color: "#2563eb" },
    { label: "Total Idle Hours", value: t.total_idle_hours ?? "0:00", color: "#dc2626" },
    { label: "Total Productive Hours", value: t.total_productive_hours ?? "0:00", color: "#16a34a" },
    { label: "Overall Idle %", value: pct, color: "#f97316" },
  ];
}

function buildFooterStats(kpis) {
  const k = kpis || {};
  return [
    { label: "Total Idle Hours", value: k.total_idle_hours_display ?? "0:00:00" },
    { label: "Total Idle Cost", value: k.total_idle_cost_display ?? "₹ 0" },
    { label: "Avg Cost / Hour", value: k.avg_cost_per_hour != null ? `₹ ${k.avg_cost_per_hour}` : "₹ 0" },
    { label: "Machines Monitored", value: k.machine_count != null ? String(k.machine_count) : "0" },
    { label: "Data Coverage", value: k.data_coverage != null ? `${k.data_coverage}%` : "0%" },
  ];
}

const DEFAULT_FILTER_OPTIONS = {
  machines: ["All Machines", "BROACHING-1", "BROACHING-2", "TC-01", "TC-02", "VMC-01", "VTL-03"],
  shifts: ["All Shifts", "Shift 1 (6AM-2PM)", "Shift 2 (2PM-10PM)", "Shift 3 (10PM-6AM)"],
  reasons: [
    "All Reasons", "MACHINE BREAKDOWN", "INSERT CHANGE", "MACHINE CLEANING", "NMP",
    "NO LOAD", "NO PLAN", "SETTING", "Production Idle Time", "Conv Production Idle Time",
    "Conv Rod Idle Time", "Machine Idle Entry",
  ],
};

/* ════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════ */
const levelTd = lvl =>
  lvl === "high" ? "itr-td-high" :
    lvl === "medium" ? "itr-td-medium" :
      lvl === "low" ? "itr-td-low" : "itr-td-plain";

const statusCls = s =>
  s === "CRITICAL" ? "itr-status itr-status--critical" :
    s === "HIGH" ? "itr-status itr-status--high" :
      "itr-status itr-status--medium";

/* ════════════════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════════════ */
function SectionLabel({ label }) {
  return (
    <div className="itr-section-label">
      <div className="itr-section-line-l" />
      <span className="itr-section-text">{label}</span>
      <div className="itr-section-line-r" />
    </div>
  );
}

function Card({ title, badge, badgeColor, badgeBg, accentColor, extra, children }) {
  const accent = accentColor || "#2563eb";
  return (
    <div
      className="itr-card"
      style={{
        "--card-accent": accent,
        borderTop: `3px solid ${accent}`,
      }}
    >
      <div className="itr-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', width: '100%', borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="itr-card-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              display: "inline-block",
              width: 8, height: 8,
              borderRadius: "50%",
              background: accent,
              boxShadow: `0 0 6px 2px ${accent}44`,
              flexShrink: 0,
              marginRight: 2,
            }} />
            {title}
          </span>
          {badge && (
            <span
              className="itr-card-badge"
              style={{
                background: badgeBg || "#eff6ff",
                color: badgeColor || "#2563eb",
                boxShadow: `0 2px 8px ${accent}22`,
                marginLeft: '8px'
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {extra && <div className="itr-card-extra">{extra}</div>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message = "No data found for this period" }) {
  return (
    <div className="itr-empty-state">
      <FiAlertTriangle className="itr-empty-state-icon" size={24} />
      <span className="itr-empty-state-text">{message}</span>
    </div>
  );
}

function SearchableSelect({ value, options, onChange, placeholder = "Search..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const optionRef = useRef([]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset states when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setActiveIndex(-1);
    } else {
      // Highlight current selected option by default
      const currentIdx = options.indexOf(value);
      setActiveIndex(currentIdx >= 0 ? currentIdx : 0);
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  // Keep active index in bounds when search results update
  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  // Synchronize scrolling when active index changes
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && optionRef.current[activeIndex]) {
      optionRef.current[activeIndex].scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      });
    }
  }, [activeIndex, isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      setActiveIndex(prev => (prev + 1) % filteredOptions.length);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setActiveIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        handleSelect(filteredOptions[activeIndex]);
        e.preventDefault();
      }
    } else if (e.key === "Escape" || e.key === "Tab") {
      setIsOpen(false);
      if (e.key === "Escape") e.preventDefault();
    }
  };

  const isDefault = value.startsWith("All");

  return (
    <div className="itr-custom-select-container" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className={`itr-custom-select-trigger ${isOpen ? "itr-custom-select-trigger--open" : ""} ${!isDefault ? "itr-custom-select-trigger--active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="itr-custom-select-trigger-text">{value}</span>
        <span className="itr-custom-select-trigger-arrow" />
      </button>

      {isOpen && (
        <div className="itr-custom-select-dropdown">
          {options.length > 5 && (
            <div className="itr-custom-select-search-wrap">
              <input
                type="text"
                className="itr-custom-select-search-input"
                placeholder={placeholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          )}
          <ul className="itr-custom-select-options-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => {
                const isSelected = opt === value;
                const isHighlighted = i === activeIndex;
                return (
                  <li
                    key={opt}
                    ref={el => optionRef.current[i] = el}
                    className={`itr-custom-select-option ${isSelected ? "itr-custom-select-option--selected" : ""} ${isHighlighted ? "itr-custom-select-option--highlighted" : ""}`}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    {opt}
                  </li>
                );
              })
            ) : (
              <li className="itr-custom-select-no-results">No matches found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function SearchableMultiSelect({ value, options, onChange, placeholder = "Search..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allLabel = options[0] || "All Machines";
  const isAllSelected = !value || value === allLabel || value === "";
  
  const selectedList = isAllSelected ? [] : value.split(",").map(v => v.trim()).filter(Boolean);

  const toggleOption = (opt) => {
    if (opt === allLabel) {
      onChange(allLabel);
      return;
    }
    
    let nextList;
    const idx = selectedList.indexOf(opt);
    if (idx >= 0) {
      nextList = selectedList.filter(item => item !== opt);
    } else {
      nextList = [...selectedList, opt];
    }
    
    if (nextList.length === 0) {
      onChange(allLabel);
    } else {
      onChange(nextList.join(", "));
    }
  };

  const filteredOptions = options.filter(opt => {
    if (opt === allLabel) return false;
    return opt.toLowerCase().includes(search.toLowerCase());
  });

  const isDefault = isAllSelected;
  let triggerText = allLabel;
  if (!isDefault) {
    if (selectedList.length === 1) {
      triggerText = selectedList[0];
    } else {
      triggerText = `${selectedList.length} Selected`;
    }
  }

  return (
    <div className="itr-custom-select-container" ref={dropdownRef}>
      <button
        type="button"
        className={`itr-custom-select-trigger ${isOpen ? "itr-custom-select-trigger--open" : ""} ${!isDefault ? "itr-custom-select-trigger--active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{ fontFamily: 'Poppins' }}
      >
        <span className="itr-custom-select-trigger-text" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>
          {triggerText}
        </span>
        <span className="itr-custom-select-trigger-arrow" />
      </button>

      {isOpen && (
        <div className="itr-custom-select-dropdown" style={{ width: '220px', padding: '8px', zIndex: 999, boxSizing: 'border-box' }}>
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
              autoFocus
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
                className={`itr-custom-select-option ${isDefault ? "itr-custom-select-option--selected" : ""}`}
                onClick={() => toggleOption(allLabel)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textAlign: 'left',
                  padding: '8px 10px',
                  width: '100%',
                  background: isDefault ? 'rgba(45, 109, 232, 0.06)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  color: isDefault ? '#2d6de8' : '#475569',
                  fontWeight: isDefault ? 700 : 500,
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
                    border: isDefault ? '1.5px solid #2d6de8' : '1.5px solid #cbd5e1',
                    background: isDefault ? '#2d6de8' : 'transparent',
                    transition: 'all 0.18s ease',
                    flexShrink: 0
                  }}
                >
                  {isDefault && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span>{allLabel}</span>
              </button>
            )}

            {filteredOptions.map(opt => {
              const selected = selectedList.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  className={`itr-custom-select-option ${selected ? "itr-custom-select-option--selected" : ""}`}
                  onClick={() => toggleOption(opt)}
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
                  <span>{opt}</span>
                </button>
              );
            })}

            {filteredOptions.length === 0 && search && (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.75rem', padding: '16px 4px', fontFamily: 'Poppins' }}>
                No matches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════ */
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
  try { sessionStorage.setItem(key, JSON.stringify(data)); } catch { }
}

export default function IdleTimeReport() {

  const _dflt = { from: new Date(2026, 2, 1), to: new Date(2026, 2, 27) };
  const _saved = readFilterSession("ba_filter_idletime", _dflt);
  const [dateRange, setDateRange] = useState({ from: _saved.from, to: _saved.to });
  const [filters, setFilters] = useState({
    machine: "All Machines", shift: "All Shifts",
    reason: "All Reasons",
  });
  const [filterOptions, setFilterOptions] = useState(DEFAULT_FILTER_OPTIONS);
  const [kpiCards, setKpiCards] = useState(() => buildKpiCards({}, "This Period"));
  const [topReasonsChart, setTopReasonsChart] = useState({ labels: [], data: [], hours_display: [], colors: [] });
  const [acceptedIdle, setAcceptedIdle] = useState({ chart: [0, 0], hours_display: ["0:00:00", "0:00:00"], tiles: [] });
  const [monthwiseChart, setMonthwiseChart] = useState({ labels: [], hours: [], cost: [] });
  const [daywiseChart, setDaywiseChart] = useState({ labels: [], data: [], isSunday: [] });
  const [idleChartType, setIdleChartType] = useState("daily");
  const [totalStats, setTotalStats] = useState(() => buildTotalStats({}));
  const [shiftTiles, setShiftTiles] = useState([]);
  const [shiftChart, setShiftChart] = useState({ labels: [], datasets: [] });
  const [footerStats, setFooterStats] = useState(() => buildFooterStats({}));

  // NEW: Dynamic state for the two target charts
  const [costMachineData, setCostMachineData] = useState({ labels: [], hours: [], cost: [] });
  const [pctMachineData, setPctMachineData] = useState({ labels: [], data: [] });
  const [continuousIdle, setContinuousIdle] = useState([]);
  const [idleTimeNotEntered, setIdleTimeNotEntered] = useState({ rows: [], summary: { not_entered: 0, partial_entry: 0, completed: 0 } });
  const [reasonMachineDetail, setReasonMachineDetail] = useState({ column_headers: [], rows: [], footer: { cols: [], total: "0:00", pct: "0" } });
  const [isLoading, setIsLoading] = useState(true);

  const cnv = {
    topReasons: useRef(null),
    accepted: useRef(null),
    monthwise: useRef(null),
    daywise: useRef(null),
    shiftChart: useRef(null),
    costChart: useRef(null),
    pctChart: useRef(null),
  };
  const charts = useRef({});

  // ✅ Persist date range to sessionStorage on every change
  useEffect(() => {
    writeFilterSession("ba_filter_idletime", { from: dateRange.from, to: dateRange.to });
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
    setIsLoading(true);
    const params = new URLSearchParams({
      from: toIsoDate(dateRange.from),
      to: toIsoDate(dateRange.to),
      machine: filters.machine,
      shift: filters.shift,
      reason: filters.reason,
    });
    fetch(`${API_BASE}/idle-time-report/?${params}`, { credentials: "include" })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error("idle-time-report failed"))))
      .then(data => {
        if (data?.filter_options) {
          setFilterOptions({
            machines: data.filter_options.machines?.length
              ? data.filter_options.machines
              : DEFAULT_FILTER_OPTIONS.machines,
            shifts: data.filter_options.shifts?.length
              ? data.filter_options.shifts
              : DEFAULT_FILTER_OPTIONS.shifts,
            reasons: data.filter_options.reasons?.length
              ? data.filter_options.reasons
              : DEFAULT_FILTER_OPTIONS.reasons,
          });
        }
        if (data?.kpis) {
          const periodLabel = data.from && data.to ? `${data.from} → ${data.to}` : "This Period";
          setKpiCards(buildKpiCards(data.kpis, periodLabel));
          setFooterStats(buildFooterStats(data.kpis));
        } else {
          setKpiCards(buildKpiCards({}, ""));
          setFooterStats(buildFooterStats({}));
        }
        if (data?.top_idle_reasons?.labels) {
          setTopReasonsChart({
            labels: data.top_idle_reasons.labels,
            data: data.top_idle_reasons.data ?? [],
            hours_display: data.top_idle_reasons.hours_display ?? [],
            colors: data.top_idle_reasons.colors?.length
              ? data.top_idle_reasons.colors
              : ["#2563eb"],
          });
        } else {
          setTopReasonsChart({ labels: [], data: [], hours_display: [], colors: [] });
        }
        if (data?.accepted_idle) {
          setAcceptedIdle(buildAcceptedIdle(data.accepted_idle));
        } else {
          setAcceptedIdle({ chart: [0, 0], hours_display: ["0:00:00", "0:00:00"], tiles: [] });
        }
        if (data?.monthwise?.labels) {
          setMonthwiseChart({
            labels: data.monthwise.labels,
            hours: data.monthwise.hours ?? [],
            cost: data.monthwise.cost_lakhs ?? [],
          });
        } else {
          setMonthwiseChart({ labels: [], hours: [], cost: [] });
        }
        if (data?.daywise?.labels) {
          setDaywiseChart({
            labels: data.daywise.labels,
            data: data.daywise.hours ?? [],
            isSunday: data.daywise.is_sunday ?? [],
          });
        } else {
          setDaywiseChart({ labels: [], data: [], isSunday: [] });
        }
        if (data?.utilization_totals) {
          setTotalStats(buildTotalStats(data.utilization_totals));
        } else {
          setTotalStats(buildTotalStats({}));
        }
        if (data?.shift_wise_idle?.labels?.length) {
          const sw = data.shift_wise_idle;
          if (sw.tiles?.length) setShiftTiles(sw.tiles);
          setShiftChart({
            labels: sw.labels,
            datasets: (sw.datasets ?? []).map(ds => ({
              label: ds.label,
              data: ds.data ?? [],
              backgroundColor: ds.backgroundColor,
              borderColor: ds.borderColor,
            })),
          });
        } else {
          setShiftTiles([]);
          setShiftChart({ labels: [], datasets: [] });
        }
        // NEW: Wire up Cost & Hours + % Ranking charts
        if (data?.top_machines?.labels) {
          setCostMachineData({
            labels: data.top_machines.labels,
            hours: data.top_machines.hours,
            cost: data.top_machines.cost_k,
          });
        } else {
          setCostMachineData({ labels: [], hours: [], cost: [] });
        }
        if (data?.idle_pct_ranking?.labels) {
          setPctMachineData({
            labels: data.idle_pct_ranking.labels,
            data: data.idle_pct_ranking.data,
          });
        } else {
          setPctMachineData({ labels: [], data: [] });
        }
        if (Array.isArray(data?.continuous_idle_reasons)) {
          setContinuousIdle(data.continuous_idle_reasons);
        } else {
          setContinuousIdle([]);
        }
        if (data?.idle_time_not_entered) {
          setIdleTimeNotEntered({
            rows: data.idle_time_not_entered.rows ?? [],
            summary: data.idle_time_not_entered.summary ?? { not_entered: 0, partial_entry: 0, completed: 0 },
          });
        } else {
          setIdleTimeNotEntered({ rows: [], summary: { not_entered: 0, partial_entry: 0, completed: 0 } });
        }
        if (data?.reason_machine_detail) {
          setReasonMachineDetail({
            column_headers: data.reason_machine_detail.column_headers ?? [],
            rows: data.reason_machine_detail.rows ?? [],
            footer: data.reason_machine_detail.footer ?? { cols: [], total: "0:00", pct: "0" },
          });
        } else {
          setReasonMachineDetail({ column_headers: [], rows: [], footer: { cols: [], total: "0:00", pct: "0" } });
        }
      })
      .catch((err) => console.error("idle-time-report:", err))
      .finally(() => setIsLoading(false));
  }, [dateRange.from, dateRange.to, filters.machine, filters.shift, filters.reason]);

  useEffect(() => {
    const kill = () => {
      charts.current.topReasons?.destroy();
      delete charts.current.topReasons;
    };
    const canvas = cnv.topReasons.current;
    if (!canvas) return kill;

    kill();
    const rawData = topReasonsChart.data.map(v => Number(v) || 0);
    const maxVal = Math.max(...rawData, 0.001);

    const barColors = topReasonsChart.labels.map((_, i) =>
      topReasonsChart.colors[i % topReasonsChart.colors.length]
    );

    /* Compact HH:MM label (drop seconds) — keeps text narrow */
    const compactHms = (hms) => {
      if (!hms) return "";
      const parts = String(hms).split(":");
      if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
      return hms;
    };

    charts.current.topReasons = new Chart(canvas, {
      type: "bar", indexAxis: "y",
      data: {
        labels: topReasonsChart.labels,
        datasets: [{
          data: rawData,
          backgroundColor: barColors.map(c => c + "cc"),
          borderColor: barColors,
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        devicePixelRatio: Math.max(window.devicePixelRatio, 2),
        responsive: true,
        maintainAspectRatio: false,
        clip: false,                    /* ← allow labels outside canvas */
        animation: { duration: 900, easing: "easeOutQuart" },
        layout: {
          padding: { right: 90, top: 6, bottom: 4 }, /* ← space for end labels */
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              title: items => items[0]?.label ?? "",
              label: ctx => {
                const idx = ctx.dataIndex;
                const hms = topReasonsChart.hours_display?.[idx]
                  ?? decimalHoursToHms(ctx.raw ?? ctx.parsed?.x);
                const dec = Number(ctx.raw ?? ctx.parsed?.x ?? 0).toFixed(1);
                return `  ${hms}  (${dec} hrs)`;
              },
            },
          },
          datalabels: {
            display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
            /* Inside bar for wide bars (>35% of max), outside for narrow */
            anchor: ctx => {
              const ratio = rawData[ctx.dataIndex] / maxVal;
              return ratio > 0.35 ? "end" : "end";
            },
            align: "end",
            /* White text inside wide bars, colored text outside narrow bars */
            color: ctx => {
              const ratio = rawData[ctx.dataIndex] / maxVal;
              return ratio > 0.35 ? "#ffffff" : (barColors[ctx.dataIndex] ?? "#2563eb");
            },
            /* For wide bars, place label inside by overriding offset */
            offset: ctx => {
              const ratio = rawData[ctx.dataIndex] / maxVal;
              return ratio > 0.35 ? -68 : 4;
            },
            font: { size: 10, weight: "800", family: CHART_FONT },
            formatter: (val, ctx) => {
              const hms = topReasonsChart.hours_display?.[ctx.dataIndex];
              return compactHms(hms) || (val > 0 ? `${val.toFixed(0)}h` : "");
            },
            textStrokeColor: ctx => {
              const ratio = rawData[ctx.dataIndex] / maxVal;
              return ratio > 0.35 ? "rgba(0,0,0,0.3)" : "transparent";
            },
            textStrokeWidth: 2,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: "Idle Hours", font: { size: 10, weight: "700", family: CHART_FONT }, color: "#64748b" },
            ticks: { ...TICK_STYLE, callback: v => formatTopReasonAxisTick(v), maxRotation: 0 },
            grid: { color: GRID_COLOR, drawBorder: false },
          },
          y: {
            ticks: {
              ...TICK_STYLE,
              font: { size: 10, family: CHART_FONT, weight: "700" },
              autoSkip: false,
              /* Truncate long reason labels */
              callback: function(val) {
                const label = this.getLabelForValue(val);
                return label && label.length > 22 ? label.slice(0, 20) + "…" : label;
              },
            },
            grid: { display: false },
          },
        },
      },
    });
    return kill;
  }, [topReasonsChart]);


  useEffect(() => {
    const kill = () => {
      charts.current.accepted?.destroy();
      delete charts.current.accepted;
    };
    const canvas = cnv.accepted.current;
    if (!canvas) return kill;

    kill();
    const [accH, naH] = acceptedIdle.chart;
    charts.current.accepted = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["Accepted Idle", "Non-Accepted Idle"],
        datasets: [{
          data: [accH, naH],
          backgroundColor: ["rgba(37,99,235,0.85)", "rgba(220,38,38,0.85)"],
          hoverBackgroundColor: ["#2563eb", "#dc2626"],
          borderWidth: 4,
          borderColor: "#fff",
          hoverOffset: 14,
        }],
      },
      options: {
        devicePixelRatio: Math.max(window.devicePixelRatio, 2),
        responsive: true, maintainAspectRatio: false, cutout: "68%",
        animation: { animateRotate: true, duration: 900, easing: "easeOutQuart" },
        plugins: {
          legend: {
            position: "bottom",
            labels: { padding: 16, font: { size: 12, weight: "800", family: CHART_FONT }, usePointStyle: true, pointStyleWidth: 10 },
          },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: ctx => {
                const hms = acceptedIdle.hours_display?.[ctx.dataIndex] ?? "0:00:00";
                const pct = ctx.dataIndex === 0 ? acceptedIdle.tiles[0]?.pct : acceptedIdle.tiles[1]?.pct;
                return `  ${hms}  ·  ${pct}`;
              },
            },
          },
          datalabels: {
            display: false,
          },
        },
      },
    });
    return kill;
  }, [acceptedIdle]);

  useEffect(() => {
    const kill = () => {
      charts.current.monthwise?.destroy();
      delete charts.current.monthwise;
    };
    const canvas = cnv.monthwise.current;
    if (!canvas) return kill;

    kill();
    const ctx2d = canvas.getContext("2d");
    const blueGrad = ctx2d.createLinearGradient(0, 0, 0, 280);
    blueGrad.addColorStop(0, "rgba(37,99,235,0.40)");
    blueGrad.addColorStop(1, "rgba(37,99,235,0.04)");

    const hrsData = monthwiseChart.hours.map(v => Number(v) || 0);
    const costData = monthwiseChart.cost.map(v => Number(v) || 0);

    charts.current.monthwise = new Chart(canvas, {
      type: "bar",
      data: {
        labels: monthwiseChart.labels,
        datasets: [
          {
            type: "bar",
            label: "Idle Hours",
            data: hrsData,
            backgroundColor: blueGrad,
            borderColor: "#2563eb",
            borderWidth: 2,
            borderRadius: 8,
            yAxisID: "y",
          },
          {
            type: "line",
            label: "Cost ₹L",
            data: costData,
            borderColor: "#f97316",
            backgroundColor: "rgba(249,115,22,0.10)",
            borderWidth: 2.5,
            pointBackgroundColor: "#fff",
            pointBorderColor: "#f97316",
            pointBorderWidth: 2.5,
            pointRadius: 5,
            pointHoverRadius: 8,
            fill: true,
            yAxisID: "y1",
            tension: 0.42,
          },
        ],
      },
      options: {
        devicePixelRatio: Math.max(window.devicePixelRatio, 2),
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 850, easing: "easeOutQuart" },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: { font: { weight: "800", family: CHART_FONT, size: 12 }, usePointStyle: true, pointStyleWidth: 10 },
          },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: ctx => {
                const v = Number(ctx.raw ?? 0);
                if (ctx.dataset.yAxisID === "y1") return `  ${ctx.dataset.label}: ₹${v.toFixed(2)} L`;
                return `  ${ctx.dataset.label}: ${v.toFixed(1)} hrs`;
              },
            },
          },
          datalabels: {
            display: ctx => ctx.datasetIndex === 0 && ctx.dataset.data[ctx.dataIndex] > 0,
            anchor: "end",
            align: "end",
            color: "#2563eb",
            font: { size: 9, weight: "800", family: CHART_FONT },
            formatter: v => v > 0 ? `${Number(v).toFixed(0)}h` : "",
          },
        },
        scales: {
          x: { ticks: { ...TICK_STYLE, font: { size: 11, weight: "700", family: CHART_FONT } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { ...TICK_STYLE, callback: v => `${v}h` }, grid: { color: GRID_COLOR, drawBorder: false } },
          y1: { position: "right", beginAtZero: true, ticks: { ...TICK_STYLE, callback: v => `₹${v}L` }, grid: { display: false } },
        },
      },
    });
    return kill;
  }, [monthwiseChart]);

  useEffect(() => {
    const kill = () => {
      charts.current.daywise?.destroy();
      delete charts.current.daywise;
    };
    const canvas = cnv.daywise.current;
    if (!canvas) return kill;

    const ctx2d = canvas.getContext("2d");
    const activeColor = 
      idleChartType === "daily" ? "#2563eb" :
      idleChartType === "weekly" ? "#4f46e5" : "#0891b2";
      
    const areaGrad = ctx2d.createLinearGradient(0, 0, 0, 260);
    if (idleChartType === "daily") {
      areaGrad.addColorStop(0, "rgba(37,99,235,0.25)");
      areaGrad.addColorStop(1, "rgba(37,99,235,0.01)");
    } else if (idleChartType === "weekly") {
      areaGrad.addColorStop(0, "rgba(79,70,229,0.25)");
      areaGrad.addColorStop(1, "rgba(79,70,229,0.01)");
    } else {
      areaGrad.addColorStop(0, "rgba(8,145,178,0.25)");
      areaGrad.addColorStop(1, "rgba(8,145,178,0.01)");
    }

    let labels = [];
    let dataPoints = [];
    let titleCallback = () => "";
    let labelCallback = () => "";
    let pointBgColor = "#fff";
    let pointBorderColor = activeColor;
    
    if (idleChartType === "daily") {
      labels = daywiseChart.labels;
      dataPoints = daywiseChart.data.map(v => Number(v) || 0);
      pointBgColor = dataPoints.map((v, i) => (daywiseChart.isSunday[i] ? "#16a34a" : "#fff"));
      pointBorderColor = dataPoints.map((v, i) => (daywiseChart.isSunday[i] ? "#16a34a" : "#2563eb"));
      titleCallback = items => {
        const idx = items[0]?.dataIndex ?? 0;
        return `Day ${labels[idx] ?? ""}`;
      };
      labelCallback = ctx => {
        const idx = ctx.dataIndex;
        const v = Number(ctx.parsed.y ?? ctx.raw ?? 0);
        return daywiseChart.isSunday[idx] ? "  Sunday / Holiday" : `  ${v.toFixed(2)} hrs idle`;
      };
    } else if (idleChartType === "weekly") {
      const getWeeklyData = () => {
        const dailyLabels = daywiseChart.labels;
        const dailyData = daywiseChart.data;
        const wLabels = [];
        const wData = [];
        
        for (let i = 0; i < dailyLabels.length; i += 7) {
          const sliceLabels = dailyLabels.slice(i, i + 7);
          const sliceData = dailyData.slice(i, i + 7);
          const totalHours = sliceData.reduce((sum, v) => sum + (Number(v) || 0), 0);
          const startLabel = sliceLabels[0] || "";
          const endLabel = sliceLabels[sliceLabels.length - 1] || "";
          const weekLabel = startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
          wLabels.push(`W${Math.floor(i / 7) + 1} (${weekLabel})`);
          wData.push(totalHours);
        }
        return { labels: wLabels, data: wData };
      };
      const wObj = getWeeklyData();
      labels = wObj.labels;
      dataPoints = wObj.data;
      titleCallback = items => {
        const idx = items[0]?.dataIndex ?? 0;
        return labels[idx] ?? "";
      };
      labelCallback = ctx => {
        const v = Number(ctx.parsed.y ?? ctx.raw ?? 0);
        return `  Weekly Idle: ${v.toFixed(2)} hrs`;
      };
    } else {
      labels = monthwiseChart.labels;
      dataPoints = monthwiseChart.hours.map(v => Number(v) || 0);
      titleCallback = items => {
        const idx = items[0]?.dataIndex ?? 0;
        return `Month: ${labels[idx] ?? ""}`;
      };
      labelCallback = ctx => {
        const v = Number(ctx.parsed.y ?? ctx.raw ?? 0);
        return `  Monthly Idle: ${v.toFixed(2)} hrs`;
      };
    }

    kill();
    charts.current.daywise = new Chart(canvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: idleChartType === "daily" ? "Daily Idle Hours" : idleChartType === "weekly" ? "Weekly Idle Hours" : "Monthly Idle Hours",
          data: dataPoints,
          borderColor: activeColor,
          backgroundColor: areaGrad,
          fill: true,
          borderWidth: 2.5,
          tension: 0.42,
          pointBackgroundColor: pointBgColor,
          pointBorderColor: pointBorderColor,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
        }],
      },
      options: {
        devicePixelRatio: Math.max(window.devicePixelRatio, 2),
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              title: titleCallback,
              label: labelCallback,
            },
          },
          datalabels: {
            display: ctx => {
              const v = ctx.dataset.data[ctx.dataIndex];
              if (idleChartType === "daily") {
                return v > 0 && ctx.dataIndex % 3 === 0;
              }
              return v > 0;
            },
            anchor: "end",
            align: "top",
            color: activeColor,
            font: { size: 9, weight: "800", family: CHART_FONT },
            formatter: v => `${Number(v).toFixed(0)}h`,
          },
        },
        scales: {
          x: { ticks: { ...TICK_STYLE, font: { size: 9.5, family: CHART_FONT, weight: "600" }, maxRotation: 0 }, grid: { color: GRID_COLOR, drawBorder: false } },
          y: { beginAtZero: true, ticks: { ...TICK_STYLE, callback: v => `${v}h` }, grid: { color: GRID_COLOR, drawBorder: false } },
        },
      },
    });
    return kill;
  }, [daywiseChart, monthwiseChart, idleChartType]);

  useEffect(() => {
    const kill = () => {
      charts.current.shiftChart?.destroy();
      delete charts.current.shiftChart;
    };
    const canvas = cnv.shiftChart.current;
    if (!canvas) return kill;

    kill();
    charts.current.shiftChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: shiftChart.labels,
        datasets: shiftChart.datasets.map(ds => ({
          label: ds.label,
          data: ds.data.map(v => Number(v) || 0),
          backgroundColor: ds.backgroundColor,
          borderColor: ds.borderColor,
          borderWidth: ds.borderWidth ?? 1.5,
          borderRadius: ds.borderRadius ?? 6,
          borderSkipped: false,
        })),
      },
      options: {
        devicePixelRatio: Math.max(window.devicePixelRatio, 2),
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 850, easing: "easeOutQuart" },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: { font: { weight: "800", family: CHART_FONT, size: 12 }, usePointStyle: true, pointStyleWidth: 10 },
          },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: ctx => `  ${ctx.dataset.label}: ${Number(ctx.raw ?? 0).toFixed(1)} hrs`,
            },
          },
          datalabels: {
            display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
            anchor: "end",
            align: "end",
            color: ctx => {
              const ds = shiftChart.datasets[ctx.datasetIndex];
              return ds?.borderColor ?? "#2563eb";
            },
            font: { size: 9, weight: "800", family: CHART_FONT },
            formatter: v => v > 0 ? `${Number(v).toFixed(0)}h` : "",
            rotation: -90,
          },
        },
        scales: {
          x: { ticks: { ...TICK_STYLE, font: { size: 10.5, family: CHART_FONT, weight: "700" } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { ...TICK_STYLE, callback: v => `${v}h` }, grid: { color: GRID_COLOR, drawBorder: false } },
        },
      },
    });
    return kill;
  }, [shiftChart]);

  // ── UPDATED: Cost Chart ──
  useEffect(() => {
    const kill = () => { charts.current.costChart?.destroy(); delete charts.current.costChart; };
    const canvas = cnv.costChart.current;
    if (!canvas) return kill;

    kill();
    charts.current.costChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: costMachineData.labels,
        datasets: [
          {
            label: "Idle Hours",
            data: costMachineData.hours.map(v => Number(v) || 0),
            backgroundColor: "rgba(37,99,235,0.70)",
            borderColor: "#2563eb",
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: "Cost ₹K",
            data: costMachineData.cost.map(v => Number(v) || 0),
            backgroundColor: "rgba(249,115,22,0.70)",
            borderColor: "#f97316",
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        devicePixelRatio: Math.max(window.devicePixelRatio, 2),
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 850, easing: "easeOutQuart" },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: { font: { weight: "800", family: CHART_FONT, size: 12 }, usePointStyle: true, pointStyleWidth: 10 },
          },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: ctx => {
                const v = Number(ctx.raw ?? 0);
                return ctx.datasetIndex === 0 ? `  Idle Hrs: ${v.toFixed(1)} h` : `  Cost: ₹${v.toFixed(1)} K`;
              },
            },
          },
          datalabels: {
            display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
            anchor: "end",
            align: "end",
            color: ctx => ctx.datasetIndex === 0 ? "#2563eb" : "#f97316",
            font: { size: 9, weight: "800", family: CHART_FONT },
            formatter: (v, ctx) => {
              if (!v) return "";
              return ctx.datasetIndex === 0 ? `${Number(v).toFixed(0)}h` : `₹${Number(v).toFixed(0)}K`;
            },
            rotation: -90,
          },
        },
        scales: {
          x: { ticks: { ...TICK_STYLE, font: { size: 9.5, family: CHART_FONT, weight: "700" }, maxRotation: 45 }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { ...TICK_STYLE, callback: v => `${v}h` }, grid: { color: GRID_COLOR, drawBorder: false } },
        },
      },
    });
    return kill;
  }, [costMachineData]);

  // ── % Wise Idle Machine Ranking (rank 1–10 on X-axis) ──
  useEffect(() => {
    const kill = () => { charts.current.pctChart?.destroy(); delete charts.current.pctChart; };
    const canvas = cnv.pctChart.current;
    if (!canvas) return kill;

    const pctValues = pctMachineData.data.map(v => Number(v) || 0);
    const pctMacnos = pctMachineData.labels || [];
    const pctBarColor = v =>
      v > 75 ? "rgba(220,38,38,0.80)" :
        v > 50 ? "rgba(249,115,22,0.80)" :
          v > 25 ? "rgba(217,119,6,0.80)" :
            "rgba(37,99,235,0.80)";
    const pctBorderColor = v =>
      v > 75 ? "#dc2626" : v > 50 ? "#f97316" : v > 25 ? "#d97706" : "#2563eb";

    kill();
    charts.current.pctChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: pctValues.map((_, i) => String(i + 1)),
        datasets: [{
          label: "% Idle Time",
          data: pctValues,
          backgroundColor: pctValues.map(pctBarColor),
          borderColor: pctValues.map(pctBorderColor),
          borderWidth: 2,
          borderRadius: 7,
          borderSkipped: false,
        }],
      },
      options: {
        devicePixelRatio: Math.max(window.devicePixelRatio, 2),
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              title: items => {
                const mac = pctMacnos[items[0]?.dataIndex];
                return mac ? `MacNo: ${mac}` : "—";
              },
              label: ctx => {
                const pct = pctValues[ctx.dataIndex];
                return `  ${pct.toFixed(2)}% Idle`;
              },
            },
          },
          datalabels: {
            display: true,
            anchor: "end",
            align: "end",
            color: ctx => pctBorderColor(pctValues[ctx.dataIndex]),
            font: { size: 10, weight: "900", family: CHART_FONT },
            formatter: v => `${Number(v).toFixed(1)}%`,
          },
        },
        scales: {
          x: {
            title: { display: true, text: "Rank", font: { size: 11, weight: "800", family: CHART_FONT }, color: "#64748b" },
            ticks: { ...TICK_STYLE },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { ...TICK_STYLE, callback: v => `${v}%` },
            grid: { color: GRID_COLOR, drawBorder: false },
          },
        },
      },
    });
    return kill;
  }, [pctMachineData]);

  const hc = (f, v) => setFilters(p => ({ ...p, [f]: v }));

  const handleResetFilters = () => {
    setDateRange({ from: new Date(2026, 2, 1), to: new Date(2026, 2, 27) });
    setFilters({
      machine: "All Machines",
      shift: "All Shifts",
      reason: "All Reasons",
    });
  };

  return (
    <div className="itr-root">
      <div className="itr-body">

        {/* ══════════════════════════════════════
            PREMIUM LAZY LOADING SKELETON UI
        ══════════════════════════════════════ */}
        {isLoading && (
          <div className="itr-skeleton-overlay">

            {/* ── Top branded loading bar ── */}
            <div className="itr-sk-topbar">
              <div className="itr-sk-topbar-fill" />
            </div>

            {/* ── Skeleton Filter Panel ── */}
            <div className="itr-skeleton-panel">
              <div className="itr-skeleton-row">
                <div className="itr-sk-icon-placeholder" />
                <div className="itr-sk itr-sk--title" />
              </div>
              <div className="itr-skeleton-filter-grid">
                <div className="itr-sk-filter-block">
                  <div className="itr-sk itr-sk--filter-label" />
                  <div className="itr-sk itr-sk--input-lg" />
                </div>
                {[1, 2, 3].map(i => (
                  <div key={i} className="itr-sk-filter-block">
                    <div className="itr-sk itr-sk--filter-label" />
                    <div className="itr-sk itr-sk--input" />
                  </div>
                ))}
                <div className="itr-sk-filter-block">
                  <div style={{ height: 14 }} />
                  <div className="itr-sk itr-sk--btn" />
                </div>
              </div>
            </div>

            {/* ── Skeleton KPI Cards ── */}
            <div className="itr-skeleton-kpi-grid">
              {[
                "#dc2626", "#f97316", "#2563eb",
                "#7c3aed", "#d97706", "#0891b2"
              ].map((clr, i) => (
                <div
                  key={i}
                  className="itr-skeleton-kpi-card"
                  style={{ "--sk-kpi-border": clr, animationDelay: `${i * 0.08}s` }}
                >
                  <div className="itr-skeleton-kpi-top">
                    <div className="itr-sk itr-sk--circle" style={{ "--sk-c": clr }} />
                    <div className="itr-sk itr-sk--badge-sm" />
                  </div>
                  <div className="itr-sk itr-sk--label" style={{ width: "70%" }} />
                  <div className="itr-sk itr-sk--value" style={{ "--sk-c": clr }} />
                  <div className="itr-sk itr-sk--sub" style={{ width: "45%" }} />
                </div>
              ))}
            </div>

            {/* ── Skeleton Footer Stats ── */}
            <div className="itr-sk-footer-skeleton">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="itr-sk-footer-stat" style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className="itr-sk itr-sk--filter-label" style={{ width: "60%", margin: "0 auto 6px" }} />
                  <div className="itr-sk itr-sk--footer-val" />
                </div>
              ))}
            </div>

            {/* ── Skeleton Divider ── */}
            <div className="itr-sk-divider">
              <div className="itr-sk itr-sk--line" />
              <div className="itr-sk itr-sk--tag" />
              <div className="itr-sk itr-sk--line" />
            </div>

            {/* ── Skeleton 2-col Charts ── */}
            <div className="itr-skeleton-g2">
              {/* Bar chart skeleton */}
              <div className="itr-skeleton-card" style={{ animationDelay: "0.05s" }}>
                <div className="itr-skeleton-card-head">
                  <div>
                    <div className="itr-sk itr-sk--title-sm" />
                    <div className="itr-sk itr-sk--filter-label" style={{ marginTop: 6, width: 80 }} />
                  </div>
                  <div className="itr-sk itr-sk--badge-sm" />
                </div>
                <div className="itr-sk-bar-chart">
                  {[90, 75, 82, 55, 40, 68, 48, 60, 30, 50].map((h, i) => (
                    <div key={i} className="itr-sk-bar" style={{ height: `${h}%`, animationDelay: `${i * 0.06}s` }} />
                  ))}
                </div>
              </div>

              {/* Donut chart skeleton */}
              <div className="itr-skeleton-card" style={{ animationDelay: "0.12s" }}>
                <div className="itr-skeleton-card-head">
                  <div>
                    <div className="itr-sk itr-sk--title-sm" />
                    <div className="itr-sk itr-sk--filter-label" style={{ marginTop: 6, width: 80 }} />
                  </div>
                  <div className="itr-sk itr-sk--badge-sm" />
                </div>
                <div className="itr-sk-split-grid">
                  <div className="itr-sk-split-tile itr-sk-split-tile--blue" />
                  <div className="itr-sk-split-tile itr-sk-split-tile--red" />
                </div>
                <div className="itr-sk-donut-wrap">
                  <div className="itr-sk-donut" />
                </div>
              </div>
            </div>

            {/* ── Skeleton 2-col Charts Row 2 ── */}
            <div className="itr-skeleton-g2">
              {/* Line chart */}
              <div className="itr-skeleton-card" style={{ animationDelay: "0.1s" }}>
                <div className="itr-skeleton-card-head">
                  <div className="itr-sk itr-sk--title-sm" />
                  <div className="itr-sk itr-sk--badge-sm" />
                </div>
                <div className="itr-sk-line-chart">
                  <svg viewBox="0 0 300 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
                    <polyline
                      className="itr-sk-line-path"
                      points="0,80 30,65 60,72 90,45 120,58 150,30 180,48 210,25 240,40 270,20 300,35"
                    />
                    <polygon
                      className="itr-sk-line-fill"
                      points="0,80 30,65 60,72 90,45 120,58 150,30 180,48 210,25 240,40 270,20 300,35 300,100 0,100"
                    />
                  </svg>
                </div>
              </div>
              {/* Bar chart 2 */}
              <div className="itr-skeleton-card" style={{ animationDelay: "0.18s" }}>
                <div className="itr-skeleton-card-head">
                  <div className="itr-sk itr-sk--title-sm" />
                  <div className="itr-sk itr-sk--badge-sm" />
                </div>
                <div className="itr-sk-bar-chart">
                  {[60, 85, 70, 90, 50, 75].map((h, i) => (
                    <div key={i} className="itr-sk-bar itr-sk-bar--alt" style={{ height: `${h}%`, animationDelay: `${i * 0.07}s` }} />
                  ))}
                </div>
              </div>
            </div>

            {/* ── Skeleton Shift Tiles + Table ── */}
            <div className="itr-skeleton-g2">
              <div className="itr-skeleton-card" style={{ animationDelay: "0.15s" }}>
                <div className="itr-skeleton-card-head">
                  <div className="itr-sk itr-sk--title-sm" />
                  <div className="itr-sk itr-sk--badge-sm" />
                </div>
                <div className="itr-sk-shift-tiles">
                  {["#2563eb", "#f97316", "#16a34a", "#7c3aed"].map((c, i) => (
                    <div key={i} className="itr-sk-shift-tile" style={{ "--sk-c": c, animationDelay: `${i * 0.07}s` }}>
                      <div className="itr-sk itr-sk--shift-num" />
                      <div className="itr-sk itr-sk--filter-label" style={{ margin: "6px auto", width: "60%" }} />
                      <div className="itr-sk itr-sk--shift-bar" style={{ "--sk-c": c }} />
                    </div>
                  ))}
                </div>
                <div className="itr-sk-bar-chart" style={{ height: 130 }}>
                  {[55, 70, 60, 80, 65, 75, 50].map((h, i) => (
                    <div key={i} className="itr-sk-bar" style={{ height: `${h}%`, animationDelay: `${i * 0.06}s` }} />
                  ))}
                </div>
              </div>

              {/* 2-mini cards + table */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
                <div className="itr-skeleton-card" style={{ animationDelay: "0.2s" }}>
                  <div className="itr-skeleton-card-head">
                    <div className="itr-sk itr-sk--title-sm" />
                    <div className="itr-sk itr-sk--badge-sm" />
                  </div>
                  <div className="itr-sk-mini-tiles">
                    {["#dc2626", "#f97316", "#2563eb"].map((c, i) => (
                      <div key={i} className="itr-sk-mini-tile" style={{ "--sk-c": c }}>
                        <div className="itr-sk itr-sk--mini-val" />
                        <div className="itr-sk itr-sk--filter-label" style={{ margin: "4px auto 0", width: "70%" }} />
                      </div>
                    ))}
                  </div>
                  <div className="itr-sk itr-sk--chart" style={{ height: 130 }} />
                </div>
                <div className="itr-skeleton-card" style={{ animationDelay: "0.25s" }}>
                  <div className="itr-skeleton-card-head">
                    <div className="itr-sk itr-sk--title-sm" />
                    <div className="itr-sk itr-sk--badge-sm" />
                  </div>
                  <div className="itr-sk itr-sk--chart" style={{ height: 120 }} />
                </div>
              </div>
            </div>

            {/* ── Skeleton Detail Table ── */}
            <div className="itr-skeleton-table-card">
              <div className="itr-skeleton-card-head">
                <div>
                  <div className="itr-sk itr-sk--title-sm" />
                  <div className="itr-sk itr-sk--filter-label" style={{ marginTop: 5, width: 100 }} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <div className="itr-sk itr-sk--badge-sm" />
                  <div className="itr-sk itr-sk--badge-sm" />
                  <div className="itr-sk itr-sk--badge-sm" />
                </div>
              </div>
              <div className="itr-sk itr-sk--table-header" />
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="itr-sk-table-row-fancy" style={{ animationDelay: `${i * 0.06}s` }}>
                  <div className="itr-sk itr-sk--row-cell" style={{ width: "18%" }} />
                  <div className="itr-sk itr-sk--row-cell" style={{ width: "10%" }} />
                  <div className="itr-sk itr-sk--row-cell" style={{ width: "10%" }} />
                  <div className="itr-sk itr-sk--row-cell" style={{ width: "10%" }} />
                  <div className="itr-sk itr-sk--row-cell" style={{ width: "10%" }} />
                  <div className="itr-sk itr-sk--row-cell" style={{ width: "12%" }} />
                  <div className="itr-sk itr-sk--row-cell" style={{ width: "8%" }} />
                </div>
              ))}
            </div>

            {/* ── Loading pulse dots ── */}
            <div className="itr-sk-loading-row">
              <div className="itr-sk-dot" style={{ animationDelay: "0s" }} />
              <div className="itr-sk-dot" style={{ animationDelay: "0.18s" }} />
              <div className="itr-sk-dot" style={{ animationDelay: "0.36s" }} />
              <span className="itr-sk-loading-text">Preparing your dashboard…</span>
            </div>

          </div>
        )}


        <div className="itr-filter-panel">
          <div className="itr-filter-head">
            <span className="itr-filter-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FiSearch size={16} /> Report Filters
            </span>
          </div>

          <div className="itr-filter-grid">
            <div className="itr-filter-group itr-filter-group--daterange">
              <label className="itr-filter-label">Date Range</label>
              <IdleTimeReportDatePicker
                from={dateRange.from}
                to={dateRange.to}
                onChange={({ from, to }) => setDateRange({ from, to })}
              />
            </div>

            {[
              ["Machine No", "machine", filterOptions.machines],
              ["Shift", "shift", filterOptions.shifts],
              ["Reason", "reason", filterOptions.reasons],
            ].map(([label, field, opts]) => (
              <div key={field} className="itr-filter-group" style={field === "machine" ? { minWidth: '190px' } : {}}>
                <label className="itr-filter-label">{label}</label>
                {field === "machine" ? (
                  <SearchableMultiSelect
                    value={filters[field]}
                    options={opts}
                    onChange={val => hc(field, val)}
                    placeholder={`Search ${label.toLowerCase()}...`}
                  />
                ) : (
                  <SearchableSelect
                    value={filters[field]}
                    options={opts}
                    onChange={val => hc(field, val)}
                    placeholder={`Search ${label.toLowerCase()}...`}
                  />
                )}
              </div>
            ))}

            <div className="itr-filter-group">
              <label className="itr-filter-label">&nbsp;</label>
              <button
                className="itr-btn-reset"
                onClick={handleResetFilters}
                title="Click to reset filters"
              >
                <FiRefreshCw size={13} /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="itr-kpi-grid">
          {kpiCards.map((k, i) => (
            <div key={i} className="itr-kpi-card"
              style={{
                "--kpi-color": k.color,
                "--kpi-bg": k.bg,
                "--kpi-border": k.border,
                animationDelay: `${i * 0.06}s`
              }}>
              <div className="itr-kpi-top">
                <div className="itr-kpi-icon">{k.icon}</div>
                {k.badge ? (
                  <span className={`itr-kpi-badge ${k.neg ? "itr-kpi-badge--neg" : "itr-kpi-badge--pos"}`}>{k.badge}</span>
                ) : null}
              </div>
              <div className="itr-kpi-label">{k.label}</div>
              <div className="itr-kpi-value">{k.value}</div>
              <div className="itr-kpi-sub">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="itr-footer">
          <div className="itr-footer-stats">
            {footerStats.map((s, i) => (
              <div key={i} className="itr-footer-stat">
                <div className="itr-footer-stat-label">{s.label}</div>
                <div className="itr-footer-stat-val">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <SectionLabel label="Top Idle Reasons + Accepted vs Non-Accepted" />

        <div className="itr-g2">
          <Card title={<span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FiBarChart2 size={16} /> Top 10 Idle Reasons</span>} badge="By Hours" badgeBg="#dbeafe" badgeColor="#2563eb" accentColor="#2563eb">
            {topReasonsChart.labels.length === 0 ? (
              <EmptyState message="No idle reasons recorded in this period." />
            ) : (
              <div className="itr-chart"><canvas ref={cnv.topReasons} /></div>
            )}
          </Card>

          <Card title={<span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FiCheckCircle size={16} /> Accepted vs Non-Accepted Idle</span>} badge="% Split" badgeBg="#fff7ed" badgeColor="#f97316" accentColor="#f97316">
            {acceptedIdle.tiles.length === 0 ? (
              <EmptyState message="No accepted / non-accepted split recorded." />
            ) : (
              <>
                <div className="itr-split-grid">
                  {acceptedIdle.tiles.map((item, i) => (
                    <div key={i} className="itr-split-tile" style={{ background: item.bg, border: `1.5px solid ${item.bc}` }}>
                      <div className="itr-split-pct" style={{ color: item.c }}>{item.pct}</div>
                      <div className="itr-split-label">{item.lbl}</div>
                      <div className="itr-split-val">{item.val}</div>
                    </div>
                  ))}
                </div>
                <div className="itr-chart--sm"><canvas ref={cnv.accepted} /></div>
              </>
            )}
          </Card>
        </div>

        <SectionLabel label="Total Idle Hours + Day Wise / Month Wise Trend" />

        <div className="itr-g2">
          <Card title={<span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FiCalendar size={16} /> Idle Hours + Cost — Month Wise</span>} badge="Oct 25→Mar 26" badgeBg="#dbeafe" badgeColor="#2563eb" accentColor="#2563eb">
            {monthwiseChart.labels.length === 0 ? (
              <EmptyState message="No monthly history available for this selection." />
            ) : (
              <div className="itr-chart--md"><canvas ref={cnv.monthwise} /></div>
            )}
          </Card>

          {/* ── Top 10 Idle Reasons — Ranked Table ── */}
          <Card title={<span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FiBarChart2 size={16} /> Top 10 Idle Reasons</span>} badge="By Hours" badgeBg="#dbeafe" badgeColor="#2563eb" accentColor="#2563eb">
            {topReasonsChart.labels.length === 0 ? (
              <EmptyState message="No idle reasons recorded in this period." />
            ) : (
              <div className="itr-reason-rank-table">
                {topReasonsChart.labels.map((label, i) => {
                  const color = topReasonsChart.colors[i % topReasonsChart.colors.length] || "#2563eb";
                  const rawVal = Number(topReasonsChart.data[i]) || 0;
                  const maxVal = Math.max(...topReasonsChart.data.map(v => Number(v) || 0), 0.001);
                  const pct = (rawVal / maxVal) * 100;
                  const hms = topReasonsChart.hours_display?.[i] || `${rawVal.toFixed(0)}h`;
                  const compactHms = hms.split(":").slice(0, 2).join(":");
                  return (
                    <div
                      key={i}
                      className="itr-reason-rank-row"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      {/* Rank badge */}
                      <span
                        className="itr-reason-rank-num"
                        style={{
                          background: i === 0 ? "#fef3c7" : i === 1 ? "#f1f5f9" : i === 2 ? "#fde8dc" : "#f8fafc",
                          color: i === 0 ? "#d97706" : i === 1 ? "#64748b" : i === 2 ? "#ea580c" : "#94a3b8",
                          borderColor: i === 0 ? "#fde68a" : i === 1 ? "#e2e8f0" : i === 2 ? "#fdba74" : "#e2e8f0",
                        }}
                      >
                        {i + 1}
                      </span>

                      {/* Label + bar */}
                      <div className="itr-reason-rank-body">
                        <div className="itr-reason-rank-label-row">
                          <span className="itr-reason-rank-label">{label}</span>
                          <span className="itr-reason-rank-hms" style={{ color }}>{compactHms}</span>
                        </div>
                        <div className="itr-reason-rank-track">
                          <div
                            className="itr-reason-rank-fill"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${color}cc, ${color})`,
                              animationDelay: `${i * 60 + 100}ms`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ── Daily / Weekly / Monthly Idle Hours — Full Width ── */}
        <Card 
          title={
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FiCalendar size={16} /> 
              {idleChartType === "daily" ? "Daily Idle Hours" : idleChartType === "weekly" ? "Weekly Idle Hours" : "Monthly Idle Hours"}
            </span>
          } 
          badge={
            idleChartType === "daily" ? `${daywiseChart.labels.length} Days` :
            idleChartType === "weekly" ? `${Math.ceil(daywiseChart.labels.length / 7)} Weeks` :
            `${monthwiseChart.labels.length} Months`
          } 
          badgeBg="#ecfeff" 
          badgeColor="#0891b2" 
          accentColor={
            idleChartType === "daily" ? "#2563eb" :
            idleChartType === "weekly" ? "#4f46e5" : "#0891b2"
          }
          extra={
            <div className="itr-chart-type-toggle">
              {[
                { key: "daily", label: "Daily View" },
                { key: "weekly", label: "Weekly View" },
                { key: "monthly", label: "Monthly View" },
              ].map(item => (
                <button
                  key={item.key}
                  type="button"
                  className={`itr-toggle-btn ${idleChartType === item.key ? "itr-toggle-btn--active" : ""}`}
                  style={idleChartType === item.key ? { color: idleChartType === "weekly" ? "#4f46e5" : idleChartType === "monthly" ? "#0891b2" : "#2563eb" } : {}}
                  onClick={() => setIdleChartType(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          }
        >
          {daywiseChart.labels.length === 0 ? (
            <EmptyState message="No breakdown available for this selection." />
          ) : (
            <>
              <p style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, marginBottom: 8 }}>
                {idleChartType === "daily" ? "● Green dots = Sundays / Holidays  |  Hover for detail" : "● Hover points for details"}
              </p>
              <div className="itr-chart--lg"><canvas ref={cnv.daywise} /></div>
            </>
          )}
        </Card>

        <SectionLabel label="Total Hours + Not Entered + Shift-Wise Idle" />

        <div className="itr-total-bar">
          {totalStats.map((s, i) => (
            <div key={i} className="itr-total-stat">
              <div className="itr-total-stat-label">{s.label}</div>
              <div className="itr-total-stat-val" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <Card title={<span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FiRefreshCw size={16} /> No. of Machines Idled — Shift Wise</span>} badge="All Shifts" badgeBg="#f0fdf4" badgeColor="#16a34a" accentColor="#16a34a">
          {shiftChart.labels.length === 0 ? (
            <EmptyState message="No shift metrics recorded for this selection." />
          ) : (
            <>
              <div className="itr-shift-tiles">
                {shiftTiles.map((s, i) => (
                  <div key={i} className="itr-shift-tile" style={{ background: s.bg, border: `1.5px solid ${s.border}` }}>
                    <div className="itr-shift-count" style={{ color: s.color }}>{s.count}</div>
                    <div className="itr-shift-label">{s.label}</div>
                    <div className="itr-shift-bar" style={{ background: `${s.color}20` }}>
                      <div className="itr-shift-fill" style={{ width: `${s.total ? (s.count / s.total) * 100 : 0}%`, background: s.color }} />
                    </div>
                    <div className="itr-shift-pct-txt">{Math.round((s.count / s.total) * 100)}% of {s.total} m/c</div>
                  </div>
                ))}
              </div>
              <div className="itr-chart--xl"><canvas ref={cnv.shiftChart} /></div>
            </>
          )}
        </Card>

        <SectionLabel label="Idle Cost % + Cost-Hours Machine + % Wise Ranking" />

        <div className="itr-g2">
          <Card title={<span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FiDollarSign size={16} /> Idle Cost & Hours — Top Machines</span>} badge="₹K" badgeBg="#fff7ed" badgeColor="#f97316" accentColor="#f97316">
            {costMachineData.labels.length === 0 ? (
              <EmptyState message="No machine idle cost records found." />
            ) : (
              <>
                <div className="itr-cost-mini-grid">
                  {[
                    { lbl: "Total Cost", val: footerStats[1]?.value ?? "₹ 0", c: "#dc2626", bg: "rgba(220,38,38,0.06)", bc: "rgba(220,38,38,0.2)" },
                    { lbl: "Avg Cost/Hr", val: footerStats[2]?.value ?? "₹ 0", c: "#f97316", bg: "rgba(249,115,22,0.06)", bc: "rgba(249,115,22,0.2)" },
                    { lbl: "Highest M/c", val: costMachineData.labels[0] || "—", c: "#2563eb", bg: "rgba(37,99,235,0.06)", bc: "rgba(37,99,235,0.2)" },
                  ].map((s, i) => (
                    <div key={i} className="itr-cost-mini-tile" style={{ background: s.bg, border: `1px solid ${s.bc}` }}>
                      <div className="itr-cost-mini-val" style={{ color: s.c }}>{s.val}</div>
                      <div className="itr-cost-mini-label">{s.lbl}</div>
                    </div>
                  ))}
                </div>
                <div className="itr-chart--lg"><canvas ref={cnv.costChart} /></div>
              </>
            )}
          </Card>

          <Card title={<span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FiBarChart2 size={16} /> % Wise Idle Machine Ranking</span>} badge="Top 10" badgeBg="#fef2f2" badgeColor="#dc2626" accentColor="#dc2626">
            {pctMachineData.labels.length === 0 ? (
              <EmptyState message="No machine idle ranking records found." />
            ) : (
              <>
                <div className="itr-legend-row" style={{ marginBottom: 10 }}>
                  {[[" >75%", "Critical", "#dc2626", "#fef2f2"], [" >50%", "High", "#f97316", "#fff7ed"], [" >25%", "Medium", "#d97706", "#fffbeb"]].map(([r, l, c, bg]) => (
                    <span key={l} className="itr-legend-pill" style={{ background: bg, color: c }}>{r} {l}</span>
                  ))}
                </div>
                <div className="itr-chart--lg"><canvas ref={cnv.pctChart} /></div>
              </>
            )}
          </Card>
        </div>

        <SectionLabel label="Continuous Idle Reasons + Machines Idle Not Entered" />

        <div className="itr-g2">
          <Card title={<span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FiRefreshCw size={16} /> Continuous Idle Reasons (≥ 4 hrs)</span>}
            badge={`${continuousIdle.length} Flagged`} badgeBg="#fef2f2" badgeColor="#dc2626" accentColor="#dc2626">
            <div className="itr-table-scroll itr-table-scroll--continuous">
              <table className="itr-table">
                <thead className="itr-thead--red">
                  <tr><th>Machine</th><th>Reason</th><th>Hours</th><th className="center">Shifts</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {continuousIdle.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="itr-td-muted itr-td-center">No continuous idle (≥ 4 hrs) in this period.</td>
                    </tr>
                  ) : continuousIdle.map((r, i) => (
                    <tr key={i}>
                      <td className="itr-td-name">{r.machine}</td>
                      <td className="itr-td-muted">{r.reason}</td>
                      <td className="itr-td-hours">{r.hours}</td>
                      <td className="itr-td-center">{r.shifts}</td>
                      <td><span className={statusCls(r.status)}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={<span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FiAlertTriangle size={16} /> Idle Time Not Entered</span>}
            badge={`${idleTimeNotEntered.summary.not_entered ?? 0} Pending`}
            badgeBg="#fff7ed" badgeColor="#f97316" accentColor="#d97706">
            <div className="itr-notent-grid">
              {[
                { lbl: "Not Entered", val: idleTimeNotEntered.summary.not_entered ?? 0, c: "#dc2626", bg: "rgba(220,38,38,0.06)", bc: "rgba(220,38,38,0.2)" },
                { lbl: "Partial Entry", val: idleTimeNotEntered.summary.partial_entry ?? 0, c: "#d97706", bg: "rgba(217,119,6,0.06)", bc: "rgba(217,119,6,0.2)" },
                { lbl: "Completed", val: idleTimeNotEntered.summary.completed ?? 0, c: "#16a34a", bg: "rgba(22,163,74,0.06)", bc: "rgba(22,163,74,0.2)" },
              ].map((item, i) => (
                <div key={i} className="itr-notent-tile" style={{ background: item.bg, border: `1.5px solid ${item.bc}` }}>
                  <div className="itr-notent-val" style={{ color: item.c }}>{item.val}</div>
                  <div className="itr-notent-label">{item.lbl}</div>
                </div>
              ))}
            </div>
            <div className="itr-table-scroll itr-table-scroll--continuous">
              <table className="itr-table">
                <thead className="itr-thead--amber">
                  <tr><th>Machine</th><th>Shift</th><th>Date</th><th>Operator</th></tr>
                </thead>
                <tbody>
                  {idleTimeNotEntered.rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="itr-td-muted itr-td-center">No idle time gaps in this period.</td>
                    </tr>
                  ) : idleTimeNotEntered.rows.map((r, i) => (
                    <tr key={i}>
                      <td className="itr-td-name">{r.machine}</td>
                      <td className="itr-td-muted">{r.shift}</td>
                      <td className="itr-td-date">{r.date}</td>
                      <td className={r.operator === "Pending" ? "itr-pending" : "itr-normal"}>{r.operator}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ════════════════════════════════════════
            SECTION 12 — Machine % Idle + Operator Wise
        ════════════════════════════════════════ */}
        <SectionLabel label="% Wise Idle Machines + Operator Wise Idle Hours" />

        <div className="itr-g2">

          {/* ── Machine % Wise Idle ── */}
          <Card
            title={<span style={{ display:"flex", alignItems:"center", gap:"6px" }}><FiBarChart2 size={16}/> Machine % Wise Idle</span>}
            badge="All Machines" badgeBg="#fef2f2" badgeColor="#dc2626" accentColor="#dc2626"
          >
            {(() => {
              const machineData = [
                { name:"MANUAL 1", pct:79.9 }, { name:"VMC-3", pct:65.4 },
                { name:"VMC 1", pct:64.4 },    { name:"VMC 2", pct:60.6 },
                { name:"HTC 1", pct:60.5 },    { name:"HTC 3", pct:56.6 },
                { name:"HTC 2", pct:54.5 },    { name:"VTL 4", pct:52.1 },
                { name:"VTL 3", pct:52.0 },    { name:"VTL 2", pct:48.3 },
                { name:"VTL 1", pct:43.2 },
              ];
              const tc = (p) =>
                p >= 75 ? { bg:"#fef2f2", stroke:"#dc2626", text:"#dc2626" }
                : p >= 50 ? { bg:"#fff7ed", stroke:"#f97316", text:"#f97316" }
                : p >= 25 ? { bg:"#fffbeb", stroke:"#d97706", text:"#d97706" }
                : { bg:"#f0fdf4", stroke:"#16a34a", text:"#16a34a" };
              const R = 22, CIRC = 2 * Math.PI * R;
              return (
                <>
                  <div className="itr-mpct-grid">
                    {machineData.map((m, i) => {
                      const c = tc(m.pct);
                      const offset = CIRC - (m.pct / 100) * CIRC;
                      return (
                        <div key={i} className="itr-mpct-card" style={{ background: c.bg, animationDelay:`${i*55}ms` }}>
                          <div className="itr-mpct-gauge">
                            <svg width="56" height="56" viewBox="0 0 56 56">
                              <circle cx="28" cy="28" r={R} fill="none" stroke="#e2e8f0" strokeWidth="5"/>
                              <circle cx="28" cy="28" r={R} fill="none"
                                stroke={c.stroke} strokeWidth="5" strokeLinecap="round"
                                strokeDasharray={CIRC} strokeDashoffset={offset}
                                transform="rotate(-90 28 28)" className="itr-mpct-arc"
                              />
                            </svg>
                            <span className="itr-mpct-pct-text" style={{ color:c.text }}>{m.pct}%</span>
                          </div>
                          <div className="itr-mpct-name">{m.name}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="itr-legend-row" style={{ marginTop:14 }}>
                    {[["\u226575%","Critical","#dc2626","#fef2f2"],["\u226550%","High","#f97316","#fff7ed"],["\u226525%","Medium","#d97706","#fffbeb"],["<25%","Low","#16a34a","#f0fdf4"]].map(([r,l,c,bg]) => (
                      <span key={l} className="itr-legend-pill" style={{ background:bg, color:c }}>{r} {l}</span>
                    ))}
                  </div>
                </>
              );
            })()}
          </Card>

          {/* ── Operator Wise Idle Hours ── */}
          <Card
            title={<span style={{ display:"flex", alignItems:"center", gap:"6px" }}><FiUser size={16}/> Operator Wise Idle Hours</span>}
            badge="With %" badgeBg="#f0fdf4" badgeColor="#16a34a" accentColor="#16a34a"
          >
            {(() => {
              const opData = [
                { name:"Rajesh Kumar", hours:"1446:08", pct:72.6 },
                { name:"Suresh M.",    hours:"1142:34", pct:57.4 },
                { name:"Amit P.",      hours:"1023:21", pct:51.3 },
                { name:"Pradeep S.",   hours:"934:25",  pct:46.9 },
                { name:"Vijay R.",     hours:"853:31",  pct:42.8 },
                { name:"Mohan K.",     hours:"721:10",  pct:36.2 },
                { name:"Ravi T.",      hours:"640:45",  pct:32.1 },
                { name:"Sanjay G.",    hours:"512:00",  pct:25.7 },
                { name:"Ramesh B.",    hours:"430:18",  pct:21.6 },
                { name:"Santosh D.",   hours:"318:50",  pct:16.0 },
              ];
              const mx = Math.max(...opData.map(o => o.pct));
              const bc = (p) => p>=60?"#dc2626":p>=40?"#f97316":p>=25?"#d97706":"#16a34a";
              const aBg = ["#dbeafe","#fce7f3","#dcfce7","#fef3c7","#ede9fe","#fff7ed","#ecfeff","#fdf4ff","#f0fdf4","#fff1f2"];
              const aCl = ["#2563eb","#db2777","#16a34a","#d97706","#7c3aed","#f97316","#0891b2","#9333ea","#15803d","#e11d48"];
              return (
                <div className="itr-op-list">
                  {opData.map((op, i) => {
                    const ini = op.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
                    const col = bc(op.pct);
                    return (
                      <div key={i} className="itr-op-row" style={{ animationDelay:`${i*60}ms` }}>
                        <div className="itr-op-avatar" style={{ background:aBg[i%10], color:aCl[i%10] }}>{ini}</div>
                        <div className="itr-op-body">
                          <div className="itr-op-top-row">
                            <span className="itr-op-name">{op.name}</span>
                            <div className="itr-op-meta">
                              <span className="itr-op-hours" style={{ color:col }}>{op.hours}</span>
                              <span className="itr-op-pct-badge" style={{ background:`${col}18`, color:col, border:`1px solid ${col}30` }}>{op.pct}%</span>
                            </div>
                          </div>
                           of {mx}
                          <div className="itr-op-track">
                            <div className="itr-op-fill" style={{ width:`${(op.pct/mx)*100}%`, background:`linear-gradient(90deg,${col}99,${col})`, animationDelay:`${i*60+150}ms` }}/>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>

        </div>

        {/* Detail table */}
        <div className="itr-detail-section">
          <div className="itr-detail-header">
            <span className="itr-detail-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FiList size={16} /> Idle Time by Reason &amp; Machine — Detailed View
            </span>
            <div className="itr-legend-row">
              {[["High", "#dc2626", "#fef2f2"], ["Medium", "#f97316", "#fff7ed"], ["Low", "#16a34a", "#f0fdf4"]].map(([l, c, bg]) => (
                <span key={l} className="itr-legend-pill" style={{ background: bg, color: c }}>● {l}</span>
              ))}
            </div>
          </div>
          <div className="itr-table-scroll">
            <table className="itr-table" style={{ minWidth: 760 }}>
              <thead className="itr-thead--blue">
                <tr>
                  <th>Idle Reason</th>
                  {reasonMachineDetail.column_headers.map(h => <th key={h} className="right">{h}</th>)}
                  <th className="right">Total</th>
                  <th className="right">%</th>
                </tr>
              </thead>
              <tbody>
                {reasonMachineDetail.rows.length === 0 ? (
                  <tr>
                    <td colSpan={reasonMachineDetail.column_headers.length + 3} className="itr-td-muted itr-td-center">
                      No idle data for this period.
                    </td>
                  </tr>
                ) : reasonMachineDetail.rows.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 800, color: "#1e293b", whiteSpace: "nowrap" }}>{row.reason}</td>
                    {row.cols.map((val, j) => <td key={j} className={levelTd(row.lvl)}>{val}</td>)}
                    <td className={levelTd(row.lvl)} style={{ fontWeight: 900 }}>{row.total}</td>
                    <td style={{
                      textAlign: "right", fontWeight: 700,
                      color: parseFloat(row.pct) > 5 ? "#dc2626" : parseFloat(row.pct) > 2 ? "#f97316" : "#64748b"
                    }}>
                      {row.pct}%
                    </td>
                  </tr>
                ))}
                {reasonMachineDetail.rows.length > 0 && (
                  <tr className="itr-tr-total">
                    <td>TOTAL</td>
                    {reasonMachineDetail.footer.cols.map((v, i) => (
                      <td key={i}>{v}</td>
                    ))}
                    <td style={{ fontWeight: 900 }}>{reasonMachineDetail.footer.total}</td>
                    <td>{reasonMachineDetail.footer.pct}%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}