/**
* Charts.jsx — Advanced Analytics Dashboard
* Prefix: ch-
* Categories: Sales · Quality · Production · Operations · Purchase · Vendor
*/
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Chart, registerables } from "chart.js";
import jsPDF from "jspdf";
import ChartDatePicker from "./ChartDatePicker";
import { resolveApiBase } from "../../apiBase";
import { 
  LayoutGrid, 
  TrendingUp, 
  CheckCircle2, 
  Factory, 
  Settings, 
  ShoppingCart, 
  Users, 
  User, 
  BarChart3, 
  LineChart, 
  PieChart, 
  FolderOpen, 
  Inbox,
  AlertTriangle,
  Layers,
  Activity
} from "lucide-react";
import "./Charts.css";
Chart.register(...registerables);

const API_BASE = resolveApiBase();
function api(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

/** Machine Wise Idle Time — all bars in card width; hover tooltip shows mac + hours. */
function machineIdleBarChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        intersect: false,
        callbacks: {
          title(items) { const it = items[0]; return it?.label != null ? String(it.label) : ""; },
          label(ctx) {
            const y = ctx.parsed?.y;
            const n = typeof y === "number" && Number.isFinite(y) ? y : Number(y) || 0;
            return `Idle time: ${n.toFixed(2)} h`;
          },
        },
      },
    },
    datasets: { bar: { categoryPercentage: 0.9, barPercentage: 0.86 } },
    scales: {
      x: {
        ticks: { font: { size: 7 }, maxRotation: 52, autoSkip: true, autoSkipPadding: 4 },
        grid: { display: false },
      },
      y: { ticks: { font: { size: 8 } }, title: { display: true, text: "Hours", font: { size: 8 } } },
    },
  };
}

// ─── Chart definitions ────────────────────────────────────────
const CHART_DEFS = [
  // ══ SALES (2 charts) ═══════════════════════════════════════
  {
    id: "sales-1", title: "PO Vs Sales Value", badge: "Monthly", category: "sales", type: "bar", status: "active",
    tags: ["Sales", "Bar Chart"], filename: "po-vs-sales-value.png",
    config: {
      type: "bar",
      data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "PO Value (₹L)", data: [42,38,51,46,55,60,58,63,49,54,67,72], backgroundColor: "#3b82f6", borderRadius: 4 }, { label: "Sales Value (₹L)", data: [38,35,48,42,50,56,53,60,45,50,62,68], backgroundColor: "#10b981", borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } }, title: { display: true, text: "₹ Lakhs", font: { size: 8 } } } } },
    },
  },
  {
    id: "sales-2", title: "OTD Report", badge: "Monthly", category: "sales", type: "line", status: "active",
    tags: ["Sales", "Line Chart"], filename: "otd-report.png",
    config: {
      type: "line",
      data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "OTD % Actual", data: [82,78,85,88,84,91,87,90,86,92,89,94], borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", tension: 0.4, fill: true, pointRadius: 3 }, { label: "Target 90%", data: [90,90,90,90,90,90,90,90,90,90,90,90], borderColor: "#ef4444", backgroundColor: "transparent", borderDash: [6,3], tension: 0, fill: false, pointRadius: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { min: 0, max: 100, ticks: { font: { size: 9 } } } } },
    },
  },
  // ══ QUALITY (4 charts) ═════════════════════════════════════
  {
    id: "quality-1", title: "Customer Complaint Distribution", badge: "Monthly", category: "quality", type: "pie", status: "active",
    tags: ["Quality", "Pie Chart"], filename: "customer-complaint-pie.png",
    config: {
      type: "pie",
      data: { labels: ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"], datasets: [{ data: [0,0,0,0,0,0,0,0,0,0,0,0], backgroundColor: ["#3b82f6","#06b6d4","#10b981","#f97316","#8b5cf6","#ec4899","#f59e0b","#ef4444","#6366f1","#84cc16","#14b8a6","#f43f5e"] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { font: { size: 9 }, padding: 6 } }, title: { display: false } } },
    },
  },
  {
    id: "quality-2", title: "Rejection Monthwise", badge: "Monthly", category: "quality", type: "line", status: "active",
    tags: ["Quality", "Line Chart"], filename: "rejection-monthwise.png",
    config: {
      type: "line",
      data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Rejection Count", data: [8,12,15,10,7,5,6,9,11,8,6,4], borderColor: "#ec4899", backgroundColor: "rgba(236,72,153,0.1)", tension: 0.4, fill: true, pointRadius: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } },
    },
  },
  {
    id: "quality-3", title: "Rework Monthwise", badge: "Monthly", category: "quality", type: "bar", status: "active",
    tags: ["Quality", "Bar Chart"], filename: "rework-monthwise.png",
    config: {
      type: "bar",
      data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Rework Items", data: [5,8,6,4,3,2,4,6,5,3,2,1], backgroundColor: ["#3b82f6","#06b6d4","#10b981","#f97316","#8b5cf6","#ec4899","#3b82f6","#06b6d4","#10b981","#f97316","#8b5cf6","#ec4899"], borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } },
    },
  },
  {
    id: "quality-4", title: "Internal Mac Rejection — PPM", badge: "Monthly", category: "quality", type: "line", status: "active",
    tags: ["Quality", "Line Chart"], filename: "mac-rejection-ppm.png",
    config: {
      type: "line",
      data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Actual PPM", data: [1200,1450,1100,980,870,760,820,700,650,590,540,480], borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.1)", tension: 0.4, fill: true, pointRadius: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } },
    },
  },
  // ══ PRODUCTION (4 charts) ══════════════════════════════════
  {
    id: "production-1", title: "Operator Efficiency", badge: "Monthly", category: "production", type: "line", status: "active",
    tags: ["Production", "Line Chart"], filename: "operator-efficiency.png",
    config: {
      type: "line",
      data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Efficiency %", data: [74,78,72,80,76,83,81,85,79,84,88,90], borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", tension: 0.4, fill: true, pointRadius: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { min: 60, max: 100, ticks: { font: { size: 9 } } } } },
    },
  },
  {
    id: "production-2", title: "Overall Operator Efficiency Monthwise", badge: "Monthly", category: "production", type: "bar", status: "active",
    tags: ["Production", "Bar Chart"], filename: "overall-op-efficiency.png",
    config: {
      type: "bar",
      data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Efficiency %", data: [74,78,72,80,76,83,81,85,79,84,88,90], backgroundColor: "#06b6d4", borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { min: 60, max: 100, ticks: { font: { size: 9 } } } } },
    },
  },
  {
    id: "production-3", title: "Machine Wise Idle Time", badge: "Dynamic", category: "production", type: "bar", status: "active",
    tags: ["Production", "Bar Chart"], filename: "machine-idle-time.png",
    config: { type: "bar", data: { labels: [], datasets: [] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 8 } } }, y: { ticks: { font: { size: 9 } } } } } },
  },
  {
    id: "production-4", title: "Machine Efficiency Monthwise", badge: "Monthly", category: "production", type: "line", status: "active",
    tags: ["Production", "Line Chart"], filename: "machine-efficiency-monthwise.png",
    config: { type: "line", data: { labels: [], datasets: [] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } } },
  },
  // ══ OPERATIONS (2 charts) ══════════════════════════════════
  {
    id: "operations-1", title: "Overall Efficiency", badge: "Monthly", category: "operations", type: "line", status: "active",
    tags: ["Operations", "Line Chart"], filename: "overall-efficiency.png",
    config: {
      type: "line",
      data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Actual Efficiency %", data: [85,88,82,90,87,92,89,85,88,91,86,93], borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", tension: 0.4, fill: true, pointRadius: 3 }, { label: "Target 88%", data: [88,88,88,88,88,88,88,88,88,88,88,88], borderColor: "#ef4444", backgroundColor: "transparent", borderDash: [6,3], tension: 0, fill: false, pointRadius: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { min: 0, max: 100, ticks: { font: { size: 9 } } } } },
    },
  },
  {
    id: "operations-2", title: "Production Value", badge: "Monthly", category: "operations", type: "bar", status: "active",
    tags: ["Operations", "Bar Chart"], filename: "production-value.png",
    config: { type: "bar", data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Actual (₹L)", data: [128,142,115,158,147,165,160,172,145,168,180,195], backgroundColor: "#10b981", borderRadius: 4 }, { label: "Target (₹L)", data: [150,150,150,160,160,160,165,165,165,175,175,190], backgroundColor: "rgba(59,130,246,0.35)", borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } } },
  },
  // ══ PURCHASE (2 charts) ════════════════════════════════════
  {
    id: "purchase-1", title: "Purchase Report Monthwise", badge: "Monthly", category: "purchase", type: "bar", status: "active",
    tags: ["Purchase", "Bar Chart"], filename: "purchase-report-monthwise.png",
    config: {
      type: "bar",
      data: { labels: [], datasets: [] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { stacked: true, ticks: { font: { size: 9 } } }, y: { stacked: true, ticks: { font: { size: 9 } }, title: { display: true, text: "₹ Lakhs", font: { size: 8 } } } } }
    },
  },
  // ✅ Updated: Empty data placeholder so it fetches from API
  {
    id: "purchase-2", title: "Supplier Rating", badge: "Monthly", category: "purchase", type: "bar", status: "active",
    tags: ["Purchase", "Bar Chart"], filename: "supplier-rating.png",
    config: {
      type: "bar",
      data: { labels: [], datasets: [] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` Score: ${ctx.parsed.x} / 100` } } }, scales: { x: { min: 0, max: 100, ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } }
    },
  },
  // ══ VENDOR (2 charts) ══════════════════════════════════════
  {
    id: "vendor-1", title: "Vendor Rating", badge: "Monthly", category: "vendor", type: "bar", status: "active",
    tags: ["Vendor", "Bar Chart"], filename: "vendor-rating.png",
    config: { type: "bar", data: { labels: ["Vendor-1","Vendor-2","Vendor-3","Vendor-4","Vendor-5","Vendor-6"], datasets: [{ label: "Quality Score", data: [88,76,91,65,82,94], backgroundColor: "#3b82f6", borderRadius: 4 }, { label: "Delivery Score", data: [82,80,85,70,78,90], backgroundColor: "#10b981", borderRadius: 4 }, { label: "Price Score", data: [75,85,78,80,72,88], backgroundColor: "#f97316", borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 8 } } }, y: { min: 0, max: 100, ticks: { font: { size: 9 } } } } } },
  },
  {
    id: "vendor-2", title: "Vendor Rejections", badge: "Monthly", category: "vendor", type: "line", status: "active",
    tags: ["Vendor", "Line Chart"], filename: "vendor-rejections.png",
    config: {
      type: "line",
      data: { labels: [], datasets: [] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } }
    },
  },
];

// ─── Category / Type meta ─────────────────────────────────────
const CAT_META = {
  all: { label: "All", icon: LayoutGrid, color: "#3b82f6" },
  sales: { label: "Sales", icon: TrendingUp, color: "#22c55e" },
  quality: { label: "Quality", icon: CheckCircle2, color: "#a855f7" },
  production: { label: "Production", icon: Factory, color: "#f97316" },
  operations: { label: "Operations", icon: Settings, color: "#06b6d4" },
  purchase: { label: "Purchase", icon: ShoppingCart, color: "#f59e0b" },
  vendor: { label: "Vendor", icon: Users, color: "#8b5cf6" },
};
const TYPE_META = { all: { label: "All Types", icon: BarChart3 }, line: { label: "Line", icon: LineChart }, bar: { label: "Bar", icon: BarChart3 }, pie: { label: "Pie", icon: PieChart } };

// ─── Helper: format date ──────────────────────────────────────
function formatLocalDate(d) {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Vendor rejection API → Chart.js line datasets (numbers + colors guaranteed). */
function normalizeVendorRejectionChartDatasets(datasets) {
  const palette = ["#3b82f6", "#f97316", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e"];
  return (Array.isArray(datasets) ? datasets : []).map((ds, i) => ({
    ...ds,
    fill: ds.fill !== undefined ? !!ds.fill : false,
    tension: typeof ds.tension === "number" ? ds.tension : 0.4,
    pointRadius: typeof ds.pointRadius === "number" ? ds.pointRadius : 2,
    borderColor: ds.borderColor || palette[i % palette.length],
    backgroundColor: ds.backgroundColor || "rgba(59,130,246,0.06)",
    data: Array.isArray(ds.data) ? ds.data.map(v => {
      const n = typeof v === "number" && Number.isFinite(v) ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    }) : [],
  }));
}
function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return { r: parseInt(clean.slice(0, 2), 16), g: parseInt(clean.slice(2, 4), 16), b: parseInt(clean.slice(4, 6), 16) };
}

// ─── Filter Dropdown ──────────────────────────────────────────
function FilterDropdown({ label, icon: Icon, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const ref = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  useEffect(() => {
    const h = e => {
      const inTrigger = ref.current && ref.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inTrigger && !inMenu) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const calc = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
      setMenuStyle(openUp ? { bottom: window.innerHeight - rect.top + 6, top: "auto", left: rect.left } : { top: rect.bottom + 6, bottom: "auto", left: rect.left });
    };
    calc();
    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, true);
    return () => { window.removeEventListener("resize", calc); window.removeEventListener("scroll", calc, true); };
  }, [open]);
  const current = options[value];
  return (
    <div className="ch-dd" ref={ref}>
      <button ref={triggerRef} className={`ch-dd__trigger ${open ? "ch-dd__trigger--open" : ""}`} onClick={() => setOpen(o => !o)} type="button">
        <span className="ch-dd__icon" style={{ display: 'inline-flex', alignItems: 'center' }}><Icon size={14} /></span>
        <span className="ch-dd__label-group"><span className="ch-dd__group-name">{label}</span><span className="ch-dd__value">{current.label}</span></span>
        <svg className={`ch-dd__caret ${open ? "ch-dd__caret--up" : ""}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6,9 12,15 18,9" /></svg>
      </button>
      {open && createPortal(
        <div className="ch-dd__menu" ref={menuRef} style={menuStyle}>
          {Object.entries(options).map(([key, meta]) => {
            const ItemIcon = meta.icon;
            return (
              <button key={key} className={`ch-dd__item ${value === key ? "ch-dd__item--active" : ""}`} onClick={() => { onChange(key); setOpen(false); }} type="button">
                <span className="ch-dd__item-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><ItemIcon size={14} /></span><span>{meta.label}</span>
                {value === key && (<svg className="ch-dd__check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>)}
              </button>
            );
          })}
        </div>, document.body
      )}
    </div>
  );
}

// ─── ✅ Compact Operator Dropdown ───────
function OperatorDropdown({ value, onChange, operators, loading }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const ref = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  useEffect(() => {
    const h = e => {
      const inTrigger = ref.current && ref.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inTrigger && !inMenu) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const calc = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedMenuH = Math.min(operators.length * 34 + 8, 250);
      const openUp = spaceBelow < estimatedMenuH && spaceAbove > spaceBelow;
      setMenuStyle(openUp ? { bottom: window.innerHeight - rect.top + 4, top: "auto", left: rect.left, minWidth: rect.width } : { top: rect.bottom + 4, bottom: "auto", left: rect.left, minWidth: rect.width });
    };
    calc(); window.addEventListener("resize", calc); window.addEventListener("scroll", calc, true);
    return () => { window.removeEventListener("resize", calc); window.removeEventListener("scroll", calc, true); };
  }, [open, operators.length]);
  return (
    <div className="ch-dd ch-dd--compact" ref={ref}>
      <button ref={triggerRef} className={`ch-dd__trigger ch-dd__trigger--compact ${open ? "ch-dd__trigger--open" : ""}`} onClick={() => !loading && setOpen(o => !o)} type="button" disabled={loading} title={loading ? "Loading operators..." : value || "Select Operator"}>
        <span className="ch-dd__icon" style={{ display: 'inline-flex', alignItems: 'center' }}><User size={12} /></span><span className="ch-dd__value ch-dd__value--compact">{loading ? "..." : (value || "Operator")}</span>
        <svg className={`ch-dd__caret ${open ? "ch-dd__caret--up" : ""}`} width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6,9 12,15 18,9" /></svg>
      </button>
      {open && createPortal(
        <div className="ch-dd__menu ch-dd__menu--compact" ref={menuRef} style={{ ...menuStyle, maxHeight: "250px", overflowY: "auto" }}>
          {operators.length === 0 ? (<div style={{ padding: "10px 14px", fontSize: 12, color: "#94a3b8" }}>No operators found</div>) : operators.map(opr => (
            <button key={opr} className={`ch-dd__item ${value === opr ? "ch-dd__item--active" : ""}`} onClick={() => { onChange(opr); setOpen(false); }} type="button">
              <span className="ch-dd__item-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><User size={12} /></span><span>{opr}</span>
              {value === opr && (<svg className="ch-dd__check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>)}
            </button>
          ))}
        </div>, document.body
      )}
    </div>
  );
}

// ─── ✅ NEW: Compact Machine Dropdown ───────
function MachineDropdown({ value, onChange, machines, loading }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const ref = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  useEffect(() => {
    const h = e => {
      const inTrigger = ref.current && ref.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inTrigger && !inMenu) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const calc = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedMenuH = Math.min(machines.length * 34 + 8, 250);
      const openUp = spaceBelow < estimatedMenuH && spaceAbove > spaceBelow;
      setMenuStyle(openUp ? { bottom: window.innerHeight - rect.top + 4, top: "auto", left: rect.left, minWidth: rect.width } : { top: rect.bottom + 4, bottom: "auto", left: rect.left, minWidth: rect.width });
    };
    calc(); window.addEventListener("resize", calc); window.addEventListener("scroll", calc, true);
    return () => { window.removeEventListener("resize", calc); window.removeEventListener("scroll", calc, true); };
  }, [open, machines.length]);
  return (
    <div className="ch-dd ch-dd--compact" ref={ref}>
      <button ref={triggerRef} className={`ch-dd__trigger ch-dd__trigger--compact ${open ? "ch-dd__trigger--open" : ""}`} onClick={() => !loading && setOpen(o => !o)} type="button" disabled={loading} title={loading ? "Loading machines..." : value || "Select Machine"}>
        <span className="ch-dd__icon" style={{ display: 'inline-flex', alignItems: 'center' }}><Settings size={12} /></span><span className="ch-dd__value ch-dd__value--compact">{loading ? "..." : (value || "Machine")}</span>
        <svg className={`ch-dd__caret ${open ? "ch-dd__caret--up" : ""}`} width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6,9 12,15 18,9" /></svg>
      </button>
      {open && createPortal(
        <div className="ch-dd__menu ch-dd__menu--compact" ref={menuRef} style={{ ...menuStyle, maxHeight: "250px", overflowY: "auto" }}>
          {machines.length === 0 ? (<div style={{ padding: "10px 14px", fontSize: 12, color: "#94a3b8" }}>No machines found</div>) : machines.map(mac => (
            <button key={mac} className={`ch-dd__item ${value === mac ? "ch-dd__item--active" : ""}`} onClick={() => { onChange(mac); setOpen(false); }} type="button">
              <span className="ch-dd__item-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Settings size={12} /></span><span>{mac}</span>
              {value === mac && (<svg className="ch-dd__check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>)}
            </button>
          ))}
        </div>, document.body
      )}
    </div>
  );
}

// ─── Chart Card ───────────────────────────────────────────────
function ChartCard({ def, onPreview, idx, dateRange }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [fyLabel, setFyLabel] = useState("Monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Operator states
  const [operators, setOperators] = useState([]);
  const [selectedOpr, setSelectedOpr] = useState(null);
  const [oprLoading, setOprLoading] = useState(() => def.id === "production-1");
  
  // ✅ Machine states for production-4
  const [machines, setMachines] = useState([]);
  const [selectedMac, setSelectedMac] = useState(null);
  const [macLoading, setMacLoading] = useState(() => def.id === "production-4");

  useEffect(() => {
    if (def.id === "production-1") {
      setOprLoading(true);
      fetch(api("/production/operators/"), { credentials: "include" })
        .then(res => res.json())
        .then(data => { setOprLoading(false); if (data.operators && data.operators.length > 0) { setOperators(data.operators); setSelectedOpr(data.default || data.operators[0]); } })
        .catch(err => { setOprLoading(false); console.error(err); });
    }
    // ✅ Fetch machines for production-4
    if (def.id === "production-4") {
      setMacLoading(true);
      fetch(api("/production/machines/"), { credentials: "include" })
        .then(res => res.json())
        .then(data => { setMacLoading(false); if (data.machines && data.machines.length > 0) { setMachines(data.machines); setSelectedMac(data.default || data.machines[0]); } })
        .catch(err => { setMacLoading(false); console.error(err); });
    }
  }, [def.id]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    
    // ── API charts ─────────
    // ✅ Added def.id === "production-4" and def.id === "purchase-2"
    if (def.id === "sales-1" || def.id === "sales-2" || def.id === "quality-1" || def.id === "quality-2" || def.id === "quality-3" || def.id === "quality-4" || def.id === "production-1" || def.id === "production-2" || def.id === "production-3" || def.id === "production-4" || def.id === "operations-1" || def.id === "operations-2" || def.id === "purchase-1" || def.id === "purchase-2" || def.id === "vendor-2") {
      setLoading(true); setError(null);
      if (def.id === "production-1" && !selectedOpr) { if (oprLoading) return () => {}; setLoading(false); setError(operators.length === 0 ? "No operators found." : null); return () => {}; }
      // ✅ Machine check
      if (def.id === "production-4" && !selectedMac) { if (macLoading) return () => {}; setLoading(false); setError(machines.length === 0 ? "No machines found." : null); return () => {}; }

      const ac = new AbortController();
      let endpoint = api("/po-vs-sales/");
      if (def.id === "sales-2") endpoint = api("/otd-report/");
      if (def.id === "quality-1") endpoint = api("/customer-complaints/");
      if (def.id === "quality-2") endpoint = api("/quality/rejection-monthwise/");
      if (def.id === "quality-3") endpoint = api("/quality/rework-monthwise/");
      if (def.id === "quality-4") endpoint = api("/quality/mac-rejection-ppm/");
      if (def.id === "production-1") endpoint = api("/production/operator-efficiency/");
      if (def.id === "production-2") endpoint = api("/production/overall-operator-efficiency/");
      if (def.id === "production-3") endpoint = api("/production/machine-idle-time/");
      if (def.id === "production-4") endpoint = api("/production/machine-efficiency-monthwise/");
      if (def.id === "operations-1") endpoint = api("/operations/overall-efficiency/");
      if (def.id === "operations-2") endpoint = api("/operations/production-value/");
      if (def.id === "purchase-1") endpoint = api("/purchase/report-monthwise/");
      if (def.id === "purchase-2") endpoint = api("/purchase/supplier-rating/");
      if (def.id === "vendor-2") endpoint = api("/vendor/rejection-monthwise/");

      let url = endpoint;
      if (dateRange?.from && dateRange?.to) { const from = formatLocalDate(dateRange.from); const to = formatLocalDate(dateRange.to); url += `?from=${from}&to=${to}`; }
      if (def.id === "production-1" && selectedOpr) url += (url.includes("?") ? "&" : "?") + `oprname=${encodeURIComponent(selectedOpr)}`;
      if (def.id === "production-4" && selectedMac) url += (url.includes("?") ? "&" : "?") + `macno=${encodeURIComponent(selectedMac)}`; // ✅

      fetch(url, { credentials: "include", signal: ac.signal })
        .then(async (res) => {
          const text = await res.text();
          let data = {};
          try { data = text ? JSON.parse(text) : {}; } catch { throw new Error("Invalid response from server."); }
          if (!res.ok) {
            let msg = data.error || data.detail || `Request failed (${res.status})`;
            if (res.status === 502 || res.status === 504) {
              msg = `${msg} — Backend unreachable or timed out: run Django on the port configured in vite.config (default localhost:8000), or set VITE_DEV_BACKEND_URL in Frontend/.env.`;
            }
            throw new Error(msg);
          }
          return data;
        })
        .then(data => {
          setLoading(false);
          if (ac.signal.aborted || !canvasRef.current) return;
          if (data.error) { setError(data.error); return; }
          if (data.fy) setFyLabel(data.fy);
          if (data.labels) {
            data.labels = mapLabelsWithYear(data.labels, data.fy);
          }
          if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
          
          // ... existing chart logic ...
          if (def.id === "sales-1") chartRef.current = new Chart(canvasRef.current, { type: def.config.type, data: { labels: data.labels || [], datasets: [{ label: "PO Value (₹L)", data: data.po || [], backgroundColor: "#3b82f6", borderRadius: 4 }, { label: "Sales Value (₹L)", data: data.sales || [], backgroundColor: "#10b981", borderRadius: 4 }] }, options: { ...def.config.options } });
          else if (def.id === "sales-2") chartRef.current = new Chart(canvasRef.current, { type: "line", data: { labels: data.labels || [], datasets: [{ label: "OTD % Actual", data: data.data || [], borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", tension: 0.4, fill: true, pointRadius: 3 }, { label: "Target 90%", data: Array(12).fill(90), borderColor: "#ef4444", backgroundColor: "transparent", borderDash: [6,3], tension: 0, fill: false, pointRadius: 0 }] }, options: { ...def.config.options, scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } } });
          else if (def.id === "quality-1") chartRef.current = new Chart(canvasRef.current, { type: "pie", data: { labels: data.labels || [], datasets: [{ label: "Complaint Count", data: data.data || [], backgroundColor: def.config.data.datasets[0].backgroundColor }] }, options: { ...def.config.options } });
          else if (def.id === "quality-2") chartRef.current = new Chart(canvasRef.current, { type: "line", data: { labels: data.labels || [], datasets: [{ label: "Rejection Count", data: data.data || [], borderColor: "#ec4899", backgroundColor: "rgba(236,72,153,0.1)", tension: 0.4, fill: true, pointRadius: 3 }] }, options: { ...def.config.options } });
          else if (def.id === "quality-3") chartRef.current = new Chart(canvasRef.current, { type: "bar", data: { labels: data.labels || [], datasets: [{ label: "Rework Items", data: data.data || [], backgroundColor: def.config.data.datasets[0].backgroundColor, borderRadius: 4 }] }, options: { ...def.config.options } });
          else if (def.id === "quality-4") chartRef.current = new Chart(canvasRef.current, { type: "line", data: { labels: data.labels || [], datasets: [{ label: "Actual PPM", data: data.data || [], borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.1)", tension: 0.4, fill: true, pointRadius: 3 }] }, options: { ...def.config.options, scales: { ...def.config.options.scales, y: { ticks: { font: { size: 9 }, callback: val => val.toLocaleString() + ' PPM' } } } } });
          else if (def.id === "production-1") chartRef.current = new Chart(canvasRef.current, { type: "line", data: { labels: data.labels || [], datasets: [{ label: `${selectedOpr || 'Operator'} Efficiency %`, data: data.data || [], borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", tension: 0.4, fill: true, pointRadius: 3 }] }, options: { ...def.config.options, scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } } });
          else if (def.id === "production-2") chartRef.current = new Chart(canvasRef.current, { type: "bar", data: { labels: data.labels || [], datasets: [{ label: "Overall Efficiency %", data: data.data || [], backgroundColor: "#06b6d4", borderRadius: 4 }] }, options: { ...def.config.options, scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } } });
          else if (def.id === "production-3") {
            const palette = ["#3b82f6","#06b6d4","#10b981","#f97316","#8b5cf6","#ec4899","#f43f5e","#84cc16","#14b8a6","#6366f1","#f59e0b","#a855f7"];
            chartRef.current = new Chart(canvasRef.current, { type: "bar", data: { labels: data.labels || [], datasets: [{ label: "Idle Time (hrs)", data: data.data || [], backgroundColor: (data.labels || []).map((_, i) => palette[i % palette.length]), borderRadius: 3 }] }, options: { ...machineIdleBarChartOptions(), layout: { padding: { top: 2, bottom: 2, left: 0, right: 2 } } } });
          } 
          // ✅ NEW: production-4 Machine Efficiency
          else if (def.id === "production-4") {
            chartRef.current = new Chart(canvasRef.current, {
              type: "line",
              data: {
                labels: data.labels || [],
                datasets: [{
                  label: `${selectedMac || 'Machine'} Efficiency % — ${data.fy || ""}`,
                  data: data.data || [],
                  borderColor: "#3b82f6",
                  backgroundColor: "rgba(59,130,246,0.1)",
                  tension: 0.4, fill: true, pointRadius: 3
                }]
              },
              options: {
                ...def.config.options,
                plugins: { ...def.config.options.plugins, title: { display: true, text: `Machine Efficiency: ${selectedMac || ''} ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } },
                scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } }
              }
            });
          }
          // ✅ NEW: purchase-2 Supplier Rating
          else if (def.id === "purchase-2") {
            const getRatingColor = (val) => val >= 90 ? "#10b981" : val >= 75 ? "#3b82f6" : val >= 60 ? "#f59e0b" : "#ef4444";
            chartRef.current = new Chart(canvasRef.current, {
              type: "bar",
              data: {
                labels: data.labels || [],
                datasets: [{
                  label: "Final Supplier Rating",
                  data: data.data || [],
                  backgroundColor: (data.data || []).map(v => getRatingColor(v)),
                  borderRadius: 5
                }]
              },
              options: {
                ...def.config.options,
                plugins: { ...def.config.options.plugins, title: { display: true, text: `Supplier Rating (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } }
              }
            });
          }
          else if (def.id === "operations-1") {
            chartRef.current = new Chart(canvasRef.current, { type: "line", data: { labels: data.labels || [], datasets: [{ label: `Actual Efficiency % — ${data.fy || ""}`, data: data.data || [], borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", tension: 0.4, fill: true, pointRadius: 3 }, { label: "Target 88%", data: Array(12).fill(88), borderColor: "#ef4444", backgroundColor: "transparent", borderDash: [6,3], tension: 0, fill: false, pointRadius: 0 }] }, options: { ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Overall Efficiency ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } }, scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } } });
          }
          else if (def.id === "operations-2") {
            chartRef.current = new Chart(canvasRef.current, { type: "bar", data: { labels: data.labels || [], datasets: [ { label: `Actual (₹L) — ${data.fy || ""}`, data: data.actual || [], backgroundColor: "#10b981", borderRadius: 4 }, { label: "Target (₹L)", data: data.target || [], backgroundColor: "rgba(59,130,246,0.35)", borderRadius: 4 }, ], }, options: { ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Production Value ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } }, scales: { ...def.config.options.scales, y: { ticks: { font: { size: 9 }, callback: val => `₹${val}L` } } }, } });
          }
          else if (def.id === "purchase-1") {
            chartRef.current = new Chart(canvasRef.current, { type: "bar", data: { labels: data.labels || [], datasets: [ { label: "Raw Material (₹L)", data: data.raw_material || [], backgroundColor: "#3b82f6", borderRadius: 4 }, { label: "Store Material (₹L)", data: data.store_material || [], backgroundColor: "#06b6d4", borderRadius: 4 }, { label: "General / Service (₹L)", data: data.general_service || [], backgroundColor: "#f97316", borderRadius: 4 } ] }, options: { ...def.config.options } });
          }
          else if (def.id === "vendor-2") {
            chartRef.current = new Chart(canvasRef.current, { type: "line", data: { labels: data.labels || [], datasets: normalizeVendorRejectionChartDatasets(data.datasets) }, options: { ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Vendor Rejections ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } } } });
          }
        })
        .catch(err => {
          if (err.name === "AbortError") return;
          setLoading(false);
          setError(err.message || "Failed to load chart data.");
          console.error(err);
        });
      return () => { ac.abort(); if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
    } else {
      chartRef.current = new Chart(canvasRef.current, { type: def.config.type, data: JSON.parse(JSON.stringify(def.config.data)), options: { ...def.config.options } });
    }
  }, [def, dateRange, selectedOpr, oprLoading, operators.length, selectedMac, macLoading, machines.length]); // ✅ Updated deps

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a"); link.href = canvasRef.current.toDataURL("image/png"); link.download = def.filename; link.click();
  };
  const catColor = CAT_META[def.category]?.color || "#3b82f6";
  return (
    <div className="ch-card" style={{ "--cat-color": catColor, animationDelay: `${0.04 + idx * 0.045}s` }}>
      <div className="ch-card__accent" />
      <div className="ch-card__hd">
        <div className="ch-card__hd-left"><span className="ch-card__title">{def.title}</span>{def.id === "production-1" && selectedOpr && (<span className="ch-card__subtitle">· {selectedOpr}</span>)}</div>
        <div className="ch-card__hd-right">
          {def.id === "production-1" && (<OperatorDropdown value={selectedOpr} onChange={setSelectedOpr} operators={operators} loading={oprLoading} />)}
          {/* ✅ Machine Dropdown */}
          {def.id === "production-4" && (<MachineDropdown value={selectedMac} onChange={setSelectedMac} machines={machines} loading={macLoading} />)}
        </div>
      </div>
      <div className="ch-card__tags">
        {def.tags.map(t => <span key={t} className={`ch-tag ch-tag--${def.category}`}>{t}</span>)}
        <span className={`ch-tag ch-tag--${def.category}`} style={{ opacity: 0.75, fontStyle: "italic" }}>
          {(def.id === "sales-1" || def.id === "sales-2" || def.id === "quality-1" || def.id === "quality-2" || def.id === "quality-3" || def.id === "quality-4" || def.id === "production-1" || def.id === "production-2" || def.id === "production-3" || def.id === "production-4" || def.id === "operations-1" || def.id === "operations-2" || def.id === "purchase-1" || def.id === "purchase-2" || def.id === "vendor-2") ? fyLabel : def.badge}
        </span>
        {def.status === "archived" && <span className="ch-tag ch-tag--archived">Archived</span>}
      </div>
      {loading && (<div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.75)", borderRadius: 12, zIndex: 5 }}><div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>⏳ Loading chart…</div></div>)}
      {error && !loading && (<div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(255,255,255,0.9)", borderRadius: 12, zIndex: 5, padding: 16 }}><div style={{ display: "flex", alignItems: "center" }}><AlertTriangle size={24} style={{ color: "#ef4444" }} /></div><div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, textAlign: "center" }}>{error}</div></div>)}
      <div className="ch-canvas-wrap"><canvas ref={canvasRef} /></div>
      <div className="ch-card__actions">
        <button className="ch-action-btn ch-action-btn--preview" onClick={() => onPreview(def, selectedOpr)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>Preview</button>
        <button className="ch-action-btn ch-action-btn--download" onClick={handleDownload}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Download</button>
      </div>
    </div>
  );
}

// ─── Map Month Labels to include Year ───
const mapLabelsWithYear = (labels, fy) => {
  if (!labels || !Array.isArray(labels)) return labels || [];
  if (!fy || typeof fy !== "string") return labels;
  const match = fy.match(/FY\s+(\d{4})-(\d{2})/i);
  if (!match) return labels;
  const startYear = parseInt(match[1]);
  const endYear = startYear + 1;
  const startYrShort = String(startYear).slice(-2);
  const endYrShort = String(endYear).slice(-2);

  const fiscalMap = {
    apr: startYrShort, april: startYrShort,
    may: startYrShort,
    jun: startYrShort, june: startYrShort,
    jul: startYrShort, july: startYrShort,
    aug: startYrShort, august: startYrShort,
    sep: startYrShort, september: startYrShort,
    oct: startYrShort, october: startYrShort,
    nov: startYrShort, november: startYrShort,
    dec: startYrShort, december: startYrShort,
    jan: endYrShort, january: endYrShort,
    feb: endYrShort, february: endYrShort,
    mar: endYrShort, march: endYrShort
  };

  return labels.map(lbl => {
    if (typeof lbl !== "string") return lbl;
    const clean = lbl.trim().toLowerCase();
    const yr = fiscalMap[clean];
    if (yr) {
      return `${lbl}-${yr}`;
    }
    return lbl;
  });
};

// ─── clean options / datasets helper for modal chart type toggle ───
const cleanModalChartOptions = (options, type) => {
  const isRadial = ["pie", "doughnut", "polarArea", "radar"].includes(type);
  const clean = { ...options };
  if (isRadial) {
    if (clean.scales) {
      delete clean.scales;
    }
  } else {
    if (!clean.scales) {
      clean.scales = {
        x: { ticks: { font: { size: 9 } } },
        y: { ticks: { font: { size: 9 } } }
      };
    }
  }
  return clean;
};

const cleanModalChartDatasets = (datasets, type) => {
  return datasets.map((ds, i) => {
    const cleanDs = { ...ds };
    if (type === "stepped") {
      cleanDs.type = "line";
      cleanDs.stepped = true;
      cleanDs.tension = 0;
      cleanDs.fill = true;
      cleanDs.pointRadius = 4;
      if (cleanDs.backgroundColor && !cleanDs.borderColor) {
        cleanDs.borderColor = cleanDs.backgroundColor;
        cleanDs.backgroundColor = cleanDs.backgroundColor + "1c"; // ~11% opacity
      }
    } else if (type === "combo") {
      if (i === 0) {
        cleanDs.type = "bar";
        cleanDs.borderRadius = 4;
      } else {
        cleanDs.type = "line";
        cleanDs.tension = 0.4;
        cleanDs.fill = false;
        cleanDs.pointRadius = 4;
        if (cleanDs.backgroundColor && !cleanDs.borderColor) {
          cleanDs.borderColor = cleanDs.backgroundColor;
        }
      }
    } else if (type === "line") {
      cleanDs.type = "line";
      cleanDs.tension = 0.4;
      cleanDs.fill = true;
      cleanDs.pointRadius = 3;
      if (cleanDs.backgroundColor && !cleanDs.borderColor) {
        cleanDs.borderColor = cleanDs.backgroundColor;
        cleanDs.backgroundColor = cleanDs.backgroundColor + "1c"; // ~11% opacity
      }
    } else if (type === "bar") {
      cleanDs.type = "bar";
      cleanDs.borderRadius = 4;
      delete cleanDs.tension;
      delete cleanDs.fill;
      delete cleanDs.pointRadius;
    }
    return cleanDs;
  });
};

function ModalTypeDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const ref = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  
  useEffect(() => {
    const h = e => {
      const inTrigger = ref.current && ref.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inTrigger && !inMenu) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const calc = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
      setMenuStyle(openUp ? { bottom: window.innerHeight - rect.top + 6, top: "auto", left: rect.left } : { top: rect.bottom + 6, bottom: "auto", left: rect.left });
    };
    calc();
    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, true);
    return () => { window.removeEventListener("resize", calc); window.removeEventListener("scroll", calc, true); };
  }, [open]);

  const options = {
    bar: { label: "Bar Chart", icon: BarChart3 },
    line: { label: "Line Chart", icon: LineChart },
    combo: { label: "Combo Chart", icon: Layers },
    stepped: { label: "Stepped Chart", icon: Activity },
    pie: { label: "Pie Chart", icon: PieChart },
    doughnut: { label: "Doughnut Chart", icon: PieChart },
    polarArea: { label: "Polar Area Chart", icon: PieChart },
    radar: { label: "Radar Chart", icon: BarChart3 }
  };

  const current = options[value] || options.bar;
  const CurrentIcon = current.icon;

  return (
    <div className="ch-dd" ref={ref}>
      <button ref={triggerRef} className={`ch-dd__trigger ${open ? "ch-dd__trigger--open" : ""}`} onClick={() => setOpen(o => !o)} type="button" style={{ minWidth: "120px", height: "30px", padding: "0 10px", fontSize: "11px", borderRadius: "6px", display: "inline-flex", alignItems: "center" }}>
        <span className="ch-dd__icon" style={{ display: 'inline-flex', alignItems: 'center', marginRight: '5px' }}><CurrentIcon size={12} /></span>
        <span className="ch-dd__value" style={{ fontSize: "11.5px" }}>{current.label}</span>
        <svg className={`ch-dd__caret ${open ? "ch-dd__caret--up" : ""}`} width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: "6px" }}><polyline points="6,9 12,15 18,9" /></svg>
      </button>
      {open && createPortal(
        <div className="ch-dd__menu" ref={menuRef} style={menuStyle}>
          {Object.entries(options).map(([key, meta]) => {
            const ItemIcon = meta.icon;
            return (
              <button key={key} className={`ch-dd__item ${value === key ? "ch-dd__item--active" : ""}`} onClick={() => { onChange(key); setOpen(false); }} type="button" style={{ padding: "8px 12px", fontSize: "12px" }}>
                <span className="ch-dd__item-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><ItemIcon size={12} /></span><span>{meta.label}</span>
                {value === key && (<svg className="ch-dd__check" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>)}
              </button>
            );
          })}
        </div>, document.body
      )}
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────
function PreviewModal({ def, onClose, initialDateRange, initialOperator }) {
  const [modalDateRange, setModalDateRange] = useState(initialDateRange?.from ? initialDateRange : { from: null, to: null });
  const [modalOperator, setModalOperator] = useState(initialOperator || null);
  const [operators, setOperators] = useState([]);
  const [oprLoading, setOprLoading] = useState(() => def?.id === "production-1");
  const [closing, setClosing] = useState(false);
  const [modalChartType, setModalChartType] = useState(def.config.type);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loaderText, setLoaderText] = useState("Loading chart data...");
  
  const prevTypeRef = useRef(def.config.type);
  const prevDateRef = useRef(initialDateRange);

  // ✅ Machine states for modal
  const [machines, setMachines] = useState([]);
  const [selectedMac, setSelectedMac] = useState(null);
  const [macLoading, setMacLoading] = useState(() => def?.id === "production-4");

  const canvasRef = useRef(null);
  const chartRef = useRef(null);


  useEffect(() => {
    if (def.id === "production-1") {
      setOprLoading(true);
      fetch(api("/production/operators/"), { credentials: "include" })
        .then(res => res.json())
        .then(data => { setOprLoading(false); if (data.operators && data.operators.length > 0) { setOperators(data.operators); if (!modalOperator) setModalOperator(data.default || data.operators[0]); } })
        .catch(err => { setOprLoading(false); console.error(err); });
    }
    if (def.id === "production-4") {
      setMacLoading(true);
      fetch(api("/production/machines/"), { credentials: "include" })
        .then(res => res.json())
        .then(data => { setMacLoading(false); if (data.machines && data.machines.length > 0) { setMachines(data.machines); if (!selectedMac) setSelectedMac(data.default || data.machines[0]); } })
        .catch(err => { setMacLoading(false); console.error(err); });
    }
  }, [def.id]);

  const animatedClose = () => { setClosing(true); setTimeout(() => onClose(), 220); };

  useEffect(() => {
    if (!def || !canvasRef.current) return;
    // ✅ Added purchase-2 to modal API fetch list
    if (def.id === "sales-1" || def.id === "sales-2" || def.id === "quality-1" || def.id === "quality-2" || def.id === "quality-3" || def.id === "quality-4" || def.id === "production-1" || def.id === "production-2" || def.id === "production-3" || def.id === "production-4" || def.id === "operations-1" || def.id === "operations-2" || def.id === "purchase-1" || def.id === "purchase-2" || def.id === "vendor-2") {
      if (chartRef.current) chartRef.current.destroy();
      if (def.id === "production-1" && !modalOperator) { if (oprLoading) return () => {}; return () => {}; }
      if (def.id === "production-4" && !selectedMac) { if (macLoading) return () => {}; return () => {}; }

      // Smart dynamic loader text
      let txt = "Loading chart data...";
      if (prevTypeRef.current !== modalChartType) {
        const typeLabels = {
          bar: "Rendering bar layout...",
          line: "Applying line layout...",
          combo: "Assembling combo chart...",
          stepped: "Applying stepped line layout...",
          pie: "Structuring pie sections...",
          doughnut: "Slicing doughnut charts...",
          polarArea: "Adjusting polar areas...",
          radar: "Tracing radar web..."
        };
        txt = typeLabels[modalChartType] || "Recalculating layout...";
        prevTypeRef.current = modalChartType;
      } else if (prevDateRef.current?.from !== modalDateRange?.from || prevDateRef.current?.to !== modalDateRange?.to) {
        txt = "Filtering date ranges...";
        prevDateRef.current = modalDateRange;
      }
      setLoaderText(txt);
      setLoading(true);
      setError(null);

      const ac = new AbortController();
      let endpoint = api("/po-vs-sales/");
      if (def.id === "sales-2") endpoint = api("/otd-report/");
      if (def.id === "quality-1") endpoint = api("/customer-complaints/");
      if (def.id === "quality-2") endpoint = api("/quality/rejection-monthwise/");
      if (def.id === "quality-3") endpoint = api("/quality/rework-monthwise/");
      if (def.id === "quality-4") endpoint = api("/quality/mac-rejection-ppm/");
      if (def.id === "production-1") endpoint = api("/production/operator-efficiency/");
      if (def.id === "production-2") endpoint = api("/production/overall-operator-efficiency/");
      if (def.id === "production-3") endpoint = api("/production/machine-idle-time/");
      if (def.id === "production-4") endpoint = api("/production/machine-efficiency-monthwise/");
      if (def.id === "operations-1") endpoint = api("/operations/overall-efficiency/");
      if (def.id === "operations-2") endpoint = api("/operations/production-value/");
      if (def.id === "purchase-1") endpoint = api("/purchase/report-monthwise/");
      if (def.id === "purchase-2") endpoint = api("/purchase/supplier-rating/");
      if (def.id === "vendor-2") endpoint = api("/vendor/rejection-monthwise/");

      let url = endpoint;
      if (modalDateRange.from && modalDateRange.to) { const from = formatLocalDate(modalDateRange.from); const to = formatLocalDate(modalDateRange.to); url += `?from=${from}&to=${to}`; }
      if (def.id === "production-1" && modalOperator) url += (url.includes("?") ? "&" : "?") + `oprname=${encodeURIComponent(modalOperator)}`;
      if (def.id === "production-4" && selectedMac) url += (url.includes("?") ? "&" : "?") + `macno=${encodeURIComponent(selectedMac)}`; // ✅

      fetch(url, { credentials: "include", signal: ac.signal })
        .then(async (res) => {
          const text = await res.text();
          let data = {};
          try { data = text ? JSON.parse(text) : {}; } catch { throw new Error("Invalid response from server."); }
          if (!res.ok) {
            let msg = data.error || data.detail || `Request failed (${res.status})`;
            if (res.status === 502 || res.status === 504) {
              msg = `${msg} — Backend unreachable or timed out: run Django on the port configured in vite.config (default localhost:8000), or set VITE_DEV_BACKEND_URL in Frontend/.env.`;
            }
            throw new Error(msg);
          }
          return data;
        })
        .then(data => {
          if (ac.signal.aborted || !canvasRef.current) return;
          if (data.error) { console.error(data.error); return; }
          if (data.labels) {
            data.labels = mapLabelsWithYear(data.labels, data.fy);
          }
          if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
          
          const baseType = modalChartType === "combo" ? "bar" : (modalChartType === "stepped" ? "line" : modalChartType);

          // ... dynamically typed modal chart logic ...
          if (def.id === "sales-1") {
            const ds = [
              { label: `PO Value (₹L) — ${data.fy || ""}`, data: data.po || [], backgroundColor: "#3b82f6" },
              { label: `Sales Value (₹L) — ${data.fy || ""}`, data: data.sales || [], backgroundColor: "#10b981" }
            ];
            chartRef.current = new Chart(canvasRef.current, {
              type: baseType,
              data: { labels: data.labels || [], datasets: cleanModalChartDatasets(ds, modalChartType) },
              options: cleanModalChartOptions({ ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `${data.company || ""} · ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } } }, modalChartType)
            });
          }
          else if (def.id === "sales-2") {
            const ds = [
              { label: `OTD % Actual — ${data.fy || ""}`, data: data.data || [], backgroundColor: "#3b82f6" },
              { label: "Target 90%", data: Array(12).fill(90), backgroundColor: "#ef4444", borderDash: [6,3] }
            ];
            chartRef.current = new Chart(canvasRef.current, {
              type: baseType,
              data: { labels: data.labels || [], datasets: cleanModalChartDatasets(ds, modalChartType) },
              options: cleanModalChartOptions({ ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `OTD Report ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } }, scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } }, modalChartType)
            });
          }
          else if (def.id === "quality-1") {
            const ds = [{ label: `Complaints — ${data.fy || ""}`, data: data.data || [], backgroundColor: def.config.data.datasets[0].backgroundColor }];
            chartRef.current = new Chart(canvasRef.current, {
              type: baseType,
              data: { labels: data.labels || [], datasets: cleanModalChartDatasets(ds, modalChartType) },
              options: cleanModalChartOptions({ ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Complaint Distribution ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } } }, modalChartType)
            });
          }
          else if (def.id === "quality-2") {
            const ds = [{ label: `Rejections — ${data.fy || ""}`, data: data.data || [], backgroundColor: "#ec4899" }];
            chartRef.current = new Chart(canvasRef.current, {
              type: baseType,
              data: { labels: data.labels || [], datasets: cleanModalChartDatasets(ds, modalChartType) },
              options: cleanModalChartOptions({ ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Rejection Trend ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } } }, modalChartType)
            });
          }
          else if (def.id === "quality-3") {
            const ds = [{ label: `Rework Items — ${data.fy || ""}`, data: data.data || [], backgroundColor: def.config.data.datasets[0].backgroundColor }];
            chartRef.current = new Chart(canvasRef.current, {
              type: baseType,
              data: { labels: data.labels || [], datasets: cleanModalChartDatasets(ds, modalChartType) },
              options: cleanModalChartOptions({ ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Rework Trend ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } } }, modalChartType)
            });
          }
          else if (def.id === "quality-4") {
            const ds = [{ label: `Actual PPM — ${data.fy || ""}`, data: data.data || [], backgroundColor: "#f97316" }];
            chartRef.current = new Chart(canvasRef.current, {
              type: baseType,
              data: { labels: data.labels || [], datasets: cleanModalChartDatasets(ds, modalChartType) },
              options: cleanModalChartOptions({ ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Internal Mac Rejection PPM ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } }, scales: { ...def.config.options.scales, y: { ticks: { font: { size: 9 }, callback: val => val.toLocaleString() + ' PPM' } } } }, modalChartType)
            });
          }
          else if (def.id === "production-1") {
            const ds = [{ label: `${modalOperator || 'Operator'} Efficiency % — ${data.fy || ""}`, data: data.data || [], backgroundColor: "#3b82f6" }];
            chartRef.current = new Chart(canvasRef.current, {
              type: baseType,
              data: { labels: data.labels || [], datasets: cleanModalChartDatasets(ds, modalChartType) },
              options: cleanModalChartOptions({ ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Operator Efficiency: ${modalOperator || ''} ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } }, scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } }, modalChartType)
            });
          }
          else if (def.id === "production-2") {
            const ds = [{ label: `Overall Efficiency % — ${data.fy || ""}`, data: data.data || [], backgroundColor: "#06b6d4" }];
            chartRef.current = new Chart(canvasRef.current, {
              type: baseType,
              data: { labels: data.labels || [], datasets: cleanModalChartDatasets(ds, modalChartType) },
              options: cleanModalChartOptions({ ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Overall Operator Efficiency ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } }, scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } }, modalChartType)
            });
          }
          else if (def.id === "production-3") {
            const palette = ["#3b82f6","#06b6d4","#10b981","#f97316","#8b5cf6","#ec4899","#f43f5e","#84cc16","#14b8a6","#6366f1","#f59e0b","#a855f7"];
            const ds = [{ label: "Idle Time (hrs)", data: data.data || [], backgroundColor: (data.labels || []).map((_, i) => palette[i % palette.length]) }];
            chartRef.current = new Chart(canvasRef.current, {
              type: baseType,
              data: { labels: data.labels || [], datasets: cleanModalChartDatasets(ds, modalChartType) },
              options: cleanModalChartOptions({ ...machineIdleBarChartOptions(), plugins: { ...machineIdleBarChartOptions().plugins, title: { display: true, text: `Machine Idle Time ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } } }, modalChartType)
            });
          } 
          else if (def.id === "production-4") {
            const ds = [{ label: `${selectedMac || 'Machine'} Efficiency % — ${data.fy || ""}`, data: data.data || [], backgroundColor: "#3b82f6" }];
            chartRef.current = new Chart(canvasRef.current, {
              type: baseType,
              data: { labels: data.labels || [], datasets: cleanModalChartDatasets(ds, modalChartType) },
              options: cleanModalChartOptions({ ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Machine Efficiency: ${selectedMac || ''} ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } }, scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } }, modalChartType)
            });
          }
          else if (def.id === "purchase-2") {
            const getRatingColor = (val) => val >= 90 ? "#10b981" : val >= 75 ? "#3b82f6" : val >= 60 ? "#f59e0b" : "#ef4444";
            const ds = [{ label: "Final Supplier Rating", data: data.data || [], backgroundColor: (data.data || []).map(v => getRatingColor(v)) }];
            chartRef.current = new Chart(canvasRef.current, {
              type: baseType,
              data: { labels: data.labels || [], datasets: cleanModalChartDatasets(ds, modalChartType) },
              options: cleanModalChartOptions({ ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Supplier Rating (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } } }, modalChartType)
            });
          }
          else if (def.id === "operations-1") {
            const ds = [
              { label: `Actual Efficiency % — ${data.fy || ""}`, data: data.data || [], backgroundColor: "#10b981" },
              { label: "Target 88%", data: Array(12).fill(88), backgroundColor: "#ef4444" }
            ];
            chartRef.current = new Chart(canvasRef.current, {
              type: baseType,
              data: { labels: data.labels || [], datasets: cleanModalChartDatasets(ds, modalChartType) },
              options: cleanModalChartOptions({ ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Overall Efficiency ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } }, scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } }, modalChartType)
            });
          }
          else if (def.id === "operations-2") {
            const ds = [
              { label: `Actual (₹L) — ${data.fy || ""}`, data: data.actual || [], backgroundColor: "#10b981" },
              { label: "Target (₹L)", data: data.target || [], backgroundColor: "rgba(59,130,246,0.35)" }
            ];
            chartRef.current = new Chart(canvasRef.current, {
              type: baseType,
              data: { labels: data.labels || [], datasets: cleanModalChartDatasets(ds, modalChartType) },
              options: cleanModalChartOptions({ ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Production Value ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } }, scales: { ...def.config.options.scales, y: { ticks: { font: { size: 9 }, callback: val => `₹${val}L` } } } }, modalChartType)
            });
          }
          else if (def.id === "purchase-1") {
            const ds = [
              { label: "Raw Material (₹L)", data: data.raw_material || [], backgroundColor: "#3b82f6" },
              { label: "Store Material (₹L)", data: data.store_material || [], backgroundColor: "#06b6d4" },
              { label: "General / Service (₹L)", data: data.general_service || [], backgroundColor: "#f97316" }
            ];
            chartRef.current = new Chart(canvasRef.current, {
              type: baseType,
              data: { labels: data.labels || [], datasets: cleanModalChartDatasets(ds, modalChartType) },
              options: cleanModalChartOptions({ ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Purchase Report Monthwise ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } } }, modalChartType)
            });
          }
          else if (def.id === "vendor-2") {
            chartRef.current = new Chart(canvasRef.current, {
              type: baseType,
              data: { labels: data.labels || [], datasets: cleanModalChartDatasets(normalizeVendorRejectionChartDatasets(data.datasets), modalChartType) },
              options: cleanModalChartOptions({ ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Vendor Rejections ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } } }, modalChartType)
            });
          }
          setLoading(false);
        })
        .catch(err => {
          if (err.name !== "AbortError") {
            setLoading(false);
            setError(err.message || "Failed to load chart data.");
            console.error(err);
          }
        });
      return () => { ac.abort(); if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
    } else {
      if (chartRef.current) chartRef.current.destroy();
      const baseType = modalChartType === "combo" ? "bar" : (modalChartType === "stepped" ? "line" : modalChartType);
      chartRef.current = new Chart(canvasRef.current, { type: baseType, data: { ...def.config.data, datasets: cleanModalChartDatasets(def.config.data.datasets, modalChartType) }, options: cleanModalChartOptions(def.config.options, modalChartType) });
    }
  }, [def, modalDateRange, modalOperator, oprLoading, operators.length, selectedMac, macLoading, machines.length, modalChartType]); // ✅ Updated deps with modalChartType

  const handleDownload = () => {
    if (!canvasRef.current || !chartRef.current) return;
    
    // Create off-screen canvas matching the active bounding size
    const rect = canvasRef.current.getBoundingClientRect();
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = rect.width;
    tempCanvas.height = rect.height;
    tempCanvas.style.width = `${rect.width}px`;
    tempCanvas.style.height = `${rect.height}px`;

    // Instantiate temporary chart copy at 4x devicePixelRatio density
    const tempChart = new Chart(tempCanvas, {
      type: chartRef.current.config.type,
      data: chartRef.current.config.data,
      options: {
        ...chartRef.current.config.options,
        responsive: false,
        animation: false,
        devicePixelRatio: 4
      }
    });

    const imgData = tempCanvas.toDataURL("image/png", 1.0);
    tempChart.destroy(); // Free up memory immediately

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth(); const pageH = pdf.internal.pageSize.getHeight();
    pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, pageW, pageH, "F");
    pdf.setFillColor(59, 130, 246); pdf.rect(0, 0, pageW * 0.5, 3.5, "F");
    pdf.setFillColor(6, 182, 212); pdf.rect(pageW * 0.5, 0, pageW * 0.25, 3.5, "F");
    pdf.setFillColor(16, 185, 129); pdf.rect(pageW * 0.75, 0, pageW * 0.25, 3.5, "F");
    const catColor = CAT_META[def.category]?.color || "#3b82f6"; const { r: cr, g: cg, b: cb } = hexToRgb(catColor);
    pdf.setFillColor(cr, cg, cb); pdf.rect(0, 3.5, 3, pageH - 3.5, "F");
    pdf.setFillColor(248, 250, 255); pdf.rect(3, 3.5, pageW - 3, 38, "F");
    let tagX = 10; const tagY = 14;
    def.tags.forEach(tag => {
      const label = tag.toUpperCase(); pdf.setFontSize(6.5); pdf.setFont("helvetica", "bold");
      const tw = pdf.getTextWidth(label) + 7;
      pdf.setFillColor(cr, cg, cb); pdf.setGState(pdf.GState({ opacity: 0.12 })); pdf.roundedRect(tagX, tagY - 4.2, tw, 6, 1.5, 1.5, "F");
      pdf.setGState(pdf.GState({ opacity: 1 })); pdf.setDrawColor(cr, cg, cb); pdf.setLineWidth(0.4); pdf.roundedRect(tagX, tagY - 4.2, tw, 6, 1.5, 1.5, "D");
      pdf.setTextColor(cr, cg, cb); pdf.text(label, tagX + 3.5, tagY); tagX += tw + 3;
    });
    pdf.setFontSize(17); pdf.setFont("helvetica", "bold"); pdf.setTextColor(30, 58, 138); pdf.text(def.title, 10, 28);
    if (def.id === "production-1" && modalOperator) { pdf.setFontSize(10); pdf.setFont("helvetica", "normal"); pdf.setTextColor(100, 116, 139); pdf.text(`Operator: ${modalOperator}`, 10, 34); }
    if (def.id === "production-4" && selectedMac) { pdf.setFontSize(10); pdf.setFont("helvetica", "normal"); pdf.setTextColor(100, 116, 139); pdf.text(`Machine: ${selectedMac}`, 10, 34); }
    pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); pdf.setTextColor(148, 163, 184);
    const stamp = `Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
    pdf.text(stamp, pageW - 10, 14, { align: "right" });
    pdf.setFontSize(8.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(cr, cg, cb);
    const catLabel = (def.category.charAt(0).toUpperCase() + def.category.slice(1)).toUpperCase();
    pdf.text(catLabel, pageW - 10, 22, { align: "right" });
    pdf.setDrawColor(224, 231, 255); pdf.setLineWidth(0.5); pdf.line(10, 36, pageW - 10, 36);
    const chartY = 40; const chartH = pageH - chartY - 18; const chartW = pageW - 20;
    pdf.addImage(imgData, "PNG", 10, chartY, chartW, chartH, undefined, "FAST");
    pdf.setFillColor(248, 250, 255); pdf.rect(0, pageH - 14, pageW, 14, "F");
    pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(0.4); pdf.line(0, pageH - 14, pageW, pageH - 14);
    pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(59, 130, 246); pdf.text("Business Analytics Dashboard", 10, pageH - 5.5);
    pdf.setFont("helvetica", "normal"); pdf.setTextColor(100, 116, 139);
    const titleTrunc = def.title.length > 50 ? def.title.slice(0, 47) + "…" : def.title;
    pdf.text(titleTrunc, pageW / 2, pageH - 5.5, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setTextColor(148, 163, 184); pdf.text("Page 1 of 1", pageW - 10, pageH - 5.5, { align: "right" });
    const pdfName = def.filename.replace(/\.png$/i, ".pdf");
    const blob = pdf.output("blob");
    const blobURL = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobURL;
    link.download = pdfName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobURL);
  };

  return createPortal(
    <div className={`ch-modal${closing ? " ch-modal--closing" : ""}`} onMouseDown={e => { if (e.target === e.currentTarget) animatedClose(); }}>
      <div className="ch-modal__content" style={{ backgroundColor: "#ffffff" }}>
        <div className="ch-modal__accent" />
        <div className="ch-modal__hd" style={{ backgroundColor: "#ffffff" }}>
          <div className="ch-modal__hd-left">{def.tags.map(t => <span key={t} className={`ch-tag ch-tag--${def.category}`}>{t}</span>)}</div>
          <div className="ch-modal__hd-right" style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {def.id === "production-1" && (<OperatorDropdown value={modalOperator} onChange={setModalOperator} operators={operators} loading={oprLoading} />)}
            {def.id === "production-4" && (<MachineDropdown value={selectedMac} onChange={setSelectedMac} machines={machines} loading={macLoading} />)}
            <button className="ch-modal__close" onClick={animatedClose} aria-label="Close modal"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
          </div>
        </div>
        <h2 className="ch-modal__title" style={{ backgroundColor: "#ffffff" }}>{def.title}</h2>
        <div className="ch-modal__date-filter" style={{ padding: "0 20px 12px", backgroundColor: "#ffffff", display: "flex", alignItems: "center", gap: "10px" }}>
          <ChartDatePicker from={modalDateRange.from} to={modalDateRange.to} onChange={setModalDateRange} />
          <ModalTypeDropdown value={modalChartType} onChange={setModalChartType} />
          {modalDateRange.from && (<span style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>{modalDateRange.to ? `${Math.round(Math.abs(modalDateRange.to - modalDateRange.from) / 86_400_000) + 1} days selected` : "Pick end date"}</span>)}
        </div>
        <div className="ch-modal__canvas-wrap" style={{ backgroundColor: "#ffffff" }}>
          {loading && (
            <div className="ch-modal__loader-overlay">
              <div className="ch-modal__loader-glow" />
              <div className="ch-modal__loader-card">
                <div className="ch-modal__spinner-container">
                  <div className="ch-modal__spinner-outer" />
                  <div className="ch-modal__spinner-inner" />
                </div>
                <div className="ch-modal__loader-text">{loaderText}</div>
              </div>
            </div>
          )}
          {error && !loading && (
            <div className="ch-modal__error-overlay">
              <AlertTriangle size={24} style={{ color: "#ef4444" }} />
              <div style={{ fontSize: "12px", color: "#ef4444", fontWeight: 650, textAlign: "center" }}>{error}</div>
            </div>
          )}
          <canvas ref={canvasRef} />
        </div>
        <div className="ch-modal__footer" style={{ backgroundColor: "#f8faff" }}>
          <button className="ch-modal-btn ch-modal-btn--sec" onClick={animatedClose}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>Close</button>
          <button className="ch-modal-btn ch-modal-btn--pri" onClick={handleDownload}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Download Chart</button>
        </div>
      </div>
    </div>, document.body
  );
}


// ── sessionStorage filter helpers ──
function readChartSession(key, defaults) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return defaults;
    const p = JSON.parse(raw);
    if (p.from) p.from = new Date(p.from);
    if (p.to) p.to = new Date(p.to);
    return { ...defaults, ...p };
  } catch { return defaults; }
}
function writeChartSession(key, data) {
  try { sessionStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// ─── Main ─────────────────────────────────────────────────────
export default function Charts() {
  const [filters, setFilters] = useState({ category: "all", type: "all" });
  const _savedCh = readChartSession("ba_filter_charts", { from: null, to: null });
  const [dateRange, setDateRange] = useState({ from: _savedCh.from, to: _savedCh.to });
  const [preview, setPreview] = useState(null);
  const visible = CHART_DEFS.filter(d => (filters.category === "all" || d.category === filters.category) && (filters.type === "all" || d.type === filters.type));
  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const reset = () => { setFilters({ category: "all", type: "all" }); setDateRange({ from: null, to: null }); };
  const isFiltered = filters.category !== "all" || filters.type !== "all" || !!dateRange.from;
  const handlePreview = (def, operator = null) => setPreview({ def, dateRange, operator });

  // ✅ Persist date range to sessionStorage on every change
  useEffect(() => {
    writeChartSession("ba_filter_charts", { from: dateRange.from, to: dateRange.to });
  }, [dateRange.from, dateRange.to]);

  return (
    <div className="ch-root">
      <div className="ch-filter-bar">
        <div className="ch-filter-bar__label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" /></svg>Filters</div>
        <div className="ch-filter-bar__sep" />
        <div className="ch-filter-bar__dropdowns">
          <FilterDropdown label="Category" icon={FolderOpen} options={CAT_META} value={filters.category} onChange={v => setFilter("category", v)} />
          <FilterDropdown label="Chart Type" icon={BarChart3} options={TYPE_META} value={filters.type} onChange={v => setFilter("type", v)} />
          <div className="ch-filter-bar__sep ch-filter-bar__sep--v" />
          <ChartDatePicker from={dateRange.from} to={dateRange.to} onChange={setDateRange} />
        </div>
        <div className="ch-filter-bar__right">
          <span className="ch-filter-bar__count"><span className="ch-filter-bar__count-num">{visible.length}</span><span className="ch-filter-bar__count-of">/ {CHART_DEFS.length} charts</span></span>
          {isFiltered && (<button className="ch-filter-bar__reset" onClick={reset} title="Reset filters"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1,4 1,10 7,10" /><path d="M3.51 15a9 9 0 1 0 .49-3.5" /></svg>Reset</button>)}
        </div>
      </div>
      {visible.length > 0 ? (
        <div className="ch-grid">
          {visible.map((def, idx) => (
            <ChartCard key={def.id} def={def} idx={idx} onPreview={handlePreview} dateRange={(def.id === "sales-1" || def.id === "sales-2" || def.id === "quality-1" || def.id === "quality-2" || def.id === "quality-3" || def.id === "quality-4" || def.id === "production-1" || def.id === "production-2" || def.id === "production-3" || def.id === "production-4" || def.id === "operations-1" || def.id === "operations-2" || def.id === "purchase-1" || def.id === "purchase-2" || def.id === "vendor-2") ? dateRange : undefined} />
          ))}
        </div>
      ) : (
        <div className="ch-empty">
          <div className="ch-empty__icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Inbox size={48} style={{ color: "#94a3b8" }} /></div>
          <h3 className="ch-empty__title">No charts match your filters</h3>
          <p className="ch-empty__sub">Try adjusting or resetting your filters</p>
          <button className="ch-filter-bar__reset ch-filter-bar__reset--lg" onClick={reset}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1,4 1,10 7,10" /><path d="M3.51 15a9 9 0 1 0 .49-3.5" /></svg>Reset Filters</button>
        </div>
      )}
      {preview && (<PreviewModal def={preview.def} initialDateRange={preview.dateRange} initialOperator={preview.operator} onClose={() => setPreview(null)} />)}
    </div>
  );
}