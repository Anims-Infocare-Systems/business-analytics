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
import "./Charts.css";

Chart.register(...registerables);

// ─── Chart definitions ────────────────────────────────────────
const CHART_DEFS = [
// ══ SALES (2 charts) ═══════════════════════════════════════
{
id: "sales-1", title: "PO Vs Sales Value",
badge: "Monthly", category: "sales", type: "bar", status: "active",
tags: ["Sales", "Bar Chart"], filename: "po-vs-sales-value.png",
config: {
type: "bar",
data: {
labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
datasets: [
{ label: "PO Value (₹L)", data: [42, 38, 51, 46, 55, 60, 58, 63, 49, 54, 67, 72], backgroundColor: "#3b82f6", borderRadius: 4 },
{ label: "Sales Value (₹L)", data: [38, 35, 48, 42, 50, 56, 53, 60, 45, 50, 62, 68], backgroundColor: "#10b981", borderRadius: 4 },
],
},
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } }, title: { display: true, text: "₹ Lakhs", font: { size: 8 } } } } },
},
},
{
id: "sales-2", title: "OTD Report",
badge: "Monthly", category: "sales", type: "line", status: "active",
tags: ["Sales", "Line Chart"], filename: "otd-report.png",
config: {
type: "line",
data: {
labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
datasets: [
{ label: "OTD % Actual", data: [82,78,85,88,84,91,87,90,86,92,89,94], borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", tension: 0.4, fill: true, pointRadius: 3 },
{ label: "Target 90%", data: [90,90,90,90,90,90,90,90,90,90,90,90], borderColor: "#ef4444", backgroundColor: "transparent", borderDash: [6,3], tension: 0, fill: false, pointRadius: 0 },
],
},
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { min: 0, max: 100, ticks: { font: { size: 9 } } } } },
},
},

// ══ QUALITY (4 charts) ═════════════════════════════════════
{
id: "quality-1", title: "Customer Complaint Distribution",
badge: "Monthly", category: "quality", type: "pie", status: "active",
tags: ["Quality", "Pie Chart"], filename: "customer-complaint-pie.png",
config: {
type: "pie",
data: { labels: ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"], datasets: [{ data: [0,0,0,0,0,0,0,0,0,0,0,0], backgroundColor: ["#3b82f6","#06b6d4","#10b981","#f97316","#8b5cf6","#ec4899","#f59e0b","#ef4444","#6366f1","#84cc16","#14b8a6","#f43f5e"] }] },
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { font: { size: 9 }, padding: 6 } }, title: { display: false } } },
},
},
{
id: "quality-2", title: "Rejection Monthwise",
badge: "Monthly", category: "quality", type: "line", status: "active",
tags: ["Quality", "Line Chart"], filename: "rejection-monthwise.png",
config: {
type: "line",
data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Rejection Count", data: [8,12,15,10,7,5,6,9,11,8,6,4], borderColor: "#ec4899", backgroundColor: "rgba(236,72,153,0.1)", tension: 0.4, fill: true, pointRadius: 3 }] },
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } },
},
},
{
id: "quality-3", title: "Rework Monthwise",
badge: "Monthly", category: "quality", type: "bar", status: "active",
tags: ["Quality", "Bar Chart"], filename: "rework-monthwise.png",
config: {
type: "bar",
data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Rework Items", data: [5,8,6,4,3,2,4,6,5,3,2,1], backgroundColor: ["#3b82f6","#06b6d4","#10b981","#f97316","#8b5cf6","#ec4899","#3b82f6","#06b6d4","#10b981","#f97316","#8b5cf6","#ec4899"], borderRadius: 4 }] },
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } },
},
},
{
id: "quality-4", title: "Internal Mac Rejection — PPM",
badge: "Monthly", category: "quality", type: "line", status: "active",
tags: ["Quality", "Line Chart"], filename: "mac-rejection-ppm.png",
config: {
type: "line",
data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Actual PPM", data: [1200,1450,1100,980,870,760,820,700,650,590,540,480], borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.1)", tension: 0.4, fill: true, pointRadius: 3 }] },
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } },
},
},

// ══ PRODUCTION (4 charts) ══════════════════════════════════
{
id: "production-1", title: "Operator Efficiency",
badge: "Monthly", category: "production", type: "line", status: "active",
tags: ["Production", "Line Chart"], filename: "operator-efficiency.png",
config: {
type: "line",
data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Efficiency %", data: [74,78,72,80,76,83,81,85,79,84,88,90], borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", tension: 0.4, fill: true, pointRadius: 3 }] },
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { min: 60, max: 100, ticks: { font: { size: 9 } } } } },
},
},
{
id: "production-2", title: "Overall Operator Efficiency Monthwise",
badge: "Monthly", category: "production", type: "bar", status: "active",
tags: ["Production", "Bar Chart"], filename: "overall-op-efficiency.png",
config: {
type: "bar",
data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Efficiency %", data: [74,78,72,80,76,83,81,85,79,84,88,90], backgroundColor: "#06b6d4", borderRadius: 4 }] },
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { min: 60, max: 100, ticks: { font: { size: 9 } } } } },
},
},
{
id: "production-3", title: "Machine Wise Idle Time",
badge: "Monthly", category: "production", type: "bar", status: "active",
tags: ["Production", "Bar Chart"], filename: "machine-idle-time.png",
config: {
type: "bar",
data: { labels: ["MC-01","MC-02","MC-03","MC-04","MC-05","MC-06","MC-07","MC-08"], datasets: [{ label: "Idle Time (hrs)", data: [12.5,8.2,15.0,6.8,10.4,18.2,7.6,11.3], backgroundColor: ["#3b82f6","#f97316","#ef4444","#10b981","#8b5cf6","#ec4899","#06b6d4","#f59e0b"], borderRadius: 4 }] },
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 8 } } }, y: { ticks: { font: { size: 9 } }, title: { display: true, text: "Hours", font: { size: 8 } } } } },
},
},
{
id: "production-4", title: "Machine Efficiency Monthwise",
badge: "Monthly", category: "production", type: "line", status: "active",
tags: ["Production", "Line Chart"], filename: "machine-efficiency-monthwise.png",
config: {
type: "line",
data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "MC Group A", data: [75,82,70,88,79,85,81,87,83,89,86,91], borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.08)", tension: 0.4, fill: true, pointRadius: 3 }, { label: "MC Group B", data: [68,74,65,78,72,80,75,82,77,84,80,87], borderColor: "#06b6d4", backgroundColor: "rgba(6,182,212,0.08)", tension: 0.4, fill: true, pointRadius: 3 }] },
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } },
},
},

// ══ OPERATIONS (2 charts) ══════════════════════════════════
{
id: "operations-1", title: "Overall Efficiency",
badge: "Monthly", category: "operations", type: "line", status: "active",
tags: ["Operations", "Line Chart"], filename: "overall-efficiency.png",
config: {
type: "line",
data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Actual Efficiency %", data: [85,88,82,90,87,92,89,85,88,91,86,93], borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", tension: 0.4, fill: true, pointRadius: 3 }, { label: "Target 88%", data: [88,88,88,88,88,88,88,88,88,88,88,88], borderColor: "#ef4444", backgroundColor: "transparent", borderDash: [6,3], tension: 0, fill: false, pointRadius: 0 }] },
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { min: 70, max: 100, ticks: { font: { size: 9 } } } } },
},
},
{
id: "operations-2", title: "Production Value",
badge: "Monthly", category: "operations", type: "bar", status: "active",
tags: ["Operations", "Bar Chart"], filename: "production-value.png",
config: {
type: "bar",
data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Actual (₹L)", data: [128,142,115,158,147,165,160,172,145,168,180,195], backgroundColor: "#10b981", borderRadius: 4 }, { label: "Target (₹L)", data: [150,150,150,160,160,160,165,165,165,175,175,190], backgroundColor: "rgba(59,130,246,0.35)", borderRadius: 4 }] },
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } },
},
},

// ══ PURCHASE (2 charts) ════════════════════════════════════
{
id: "purchase-1", title: "Purchase Report Monthwise",
badge: "Monthly", category: "purchase", type: "bar", status: "active",
tags: ["Purchase", "Bar Chart"], filename: "purchase-report-monthwise.png",
config: {
type: "bar",
data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Raw Material (₹L)", data: [30,35,32,38,40,42,37,44,39,45,48,52], backgroundColor: "#3b82f6", borderRadius: 3 }, { label: "Consumables (₹L)", data: [8,9,7,10,11,10,9,12,10,11,13,14], backgroundColor: "#06b6d4", borderRadius: 3 }, { label: "Tooling (₹L)", data: [5,6,4,7,6,8,7,9,6,8,9,10], backgroundColor: "#f97316", borderRadius: 3 }] },
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { stacked: true, ticks: { font: { size: 9 } } }, y: { stacked: true, ticks: { font: { size: 9 } } } } },
},
},
{
id: "purchase-2", title: "Supplier Rating",
badge: "Monthly", category: "purchase", type: "bar", status: "active",
tags: ["Purchase", "Bar Chart"], filename: "supplier-rating.png",
config: {
type: "bar",
data: { labels: ["Supp-A","Supp-B","Supp-C","Supp-D","Supp-E","Supp-F","Supp-G"], datasets: [{ label: "Rating Score", data: [87,92,74,95,68,83,89], backgroundColor: ["#10b981","#3b82f6","#f97316","#10b981","#ef4444","#3b82f6","#10b981"], borderRadius: 5 }] },
options: { responsive: true, maintainAspectRatio: false, indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` Score: ${ctx.parsed.x} / 100` } } }, scales: { x: { min: 0, max: 100, ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } },
},
},

// ══ VENDOR (2 charts) ══════════════════════════════════════
{
id: "vendor-1", title: "Vendor Rating",
badge: "Monthly", category: "vendor", type: "bar", status: "active",
tags: ["Vendor", "Bar Chart"], filename: "vendor-rating.png",
config: {
type: "bar",
data: { labels: ["Vendor-1","Vendor-2","Vendor-3","Vendor-4","Vendor-5","Vendor-6"], datasets: [{ label: "Quality Score", data: [88,76,91,65,82,94], backgroundColor: "#3b82f6", borderRadius: 4 }, { label: "Delivery Score", data: [82,80,85,70,78,90], backgroundColor: "#10b981", borderRadius: 4 }, { label: "Price Score", data: [75,85,78,80,72,88], backgroundColor: "#f97316", borderRadius: 4 }] },
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 8 } } }, y: { min: 0, max: 100, ticks: { font: { size: 9 } } } } },
},
},
{
id: "vendor-2", title: "Vendor Rejections",
badge: "Monthly", category: "vendor", type: "line", status: "active",
tags: ["Vendor", "Line Chart"], filename: "vendor-rejections.png",
config: {
type: "line",
data: { labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], datasets: [{ label: "Vendor-1", data: [6,8,5,9,4,3,5,4,3,2,3,1], borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.06)", tension: 0.4, fill: false, pointRadius: 3 }, { label: "Vendor-2", data: [4,5,7,6,5,4,3,5,4,3,2,2], borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.06)", tension: 0.4, fill: false, pointRadius: 3 }, { label: "Vendor-3", data: [2,3,4,2,3,2,1,2,1,2,1,1], borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.06)", tension: 0.4, fill: false, pointRadius: 3 }] },
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } },
},
},
];

// ─── Category / Type meta ─────────────────────────────────────
const CAT_META = {
all: { label: "All", icon: "⊞", color: "#3b82f6" },
sales: { label: "Sales", icon: "📈", color: "#22c55e" },
quality: { label: "Quality", icon: "✅", color: "#a855f7" },
production: { label: "Production", icon: "🏭", color: "#f97316" },
operations: { label: "Operations", icon: "⚙️", color: "#06b6d4" },
purchase: { label: "Purchase", icon: "🛒", color: "#f59e0b" },
vendor: { label: "Vendor", icon: "🤝", color: "#8b5cf6" },
};
const TYPE_META = {
all: { label: "All Types", icon: "📊" },
line: { label: "Line", icon: "📉" },
bar: { label: "Bar", icon: "📊" },
pie: { label: "Pie", icon: "🥧" },
};

// ─── Helper: format date ──────────────────────────────────────
function formatLocalDate(d) {
const date = new Date(d);
const y = date.getFullYear();
const m = String(date.getMonth() + 1).padStart(2, "0");
const dd = String(date.getDate()).padStart(2, "0");
return `${y}-${m}-${dd}`;
}

function hexToRgb(hex) {
const clean = hex.replace("#", "");
return { r: parseInt(clean.slice(0, 2), 16), g: parseInt(clean.slice(2, 4), 16), b: parseInt(clean.slice(4, 6), 16) };
}

// ─── Filter Dropdown ──────────────────────────────────────────
function FilterDropdown({ label, icon, options, value, onChange }) {
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
<span className="ch-dd__icon">{icon}</span>
<span className="ch-dd__label-group">
<span className="ch-dd__group-name">{label}</span>
<span className="ch-dd__value">{current.label}</span>
</span>
<svg className={`ch-dd__caret ${open ? "ch-dd__caret--up" : ""}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
<polyline points="6,9 12,15 18,9" />
</svg>
</button>
{open && createPortal(
<div className="ch-dd__menu" ref={menuRef} style={menuStyle}>
{Object.entries(options).map(([key, meta]) => (
<button key={key} className={`ch-dd__item ${value === key ? "ch-dd__item--active" : ""}`} onClick={() => { onChange(key); setOpen(false); }} type="button">
<span className="ch-dd__item-icon">{meta.icon}</span>
<span>{meta.label}</span>
{value === key && (<svg className="ch-dd__check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>)}
</button>
))}
</div>,
document.body
)}
</div>
);
}

// ─── ✅ Compact Operator Dropdown (Fixed — all operators visible) ───────
function OperatorDropdown({ value, onChange, operators, loading }) {
const [open, setOpen] = useState(false);
// ✅ FIX: Added menuStyle state for proper portal positioning
const [menuStyle, setMenuStyle] = useState({});
const ref = useRef(null);
const menuRef = useRef(null);
const triggerRef = useRef(null);

// Close on outside click
useEffect(() => {
const h = e => {
const inTrigger = ref.current && ref.current.contains(e.target);
const inMenu = menuRef.current && menuRef.current.contains(e.target);
if (!inTrigger && !inMenu) setOpen(false);
};
document.addEventListener("mousedown", h);
return () => document.removeEventListener("mousedown", h);
}, []);

// ✅ FIX: Calculate and update menu position whenever it opens or window changes
useEffect(() => {
if (!open || !triggerRef.current) return;
const calc = () => {
const rect = triggerRef.current.getBoundingClientRect();
const spaceBelow = window.innerHeight - rect.bottom;
const spaceAbove = rect.top;
// Estimate menu height (max 250px but may be less)
const estimatedMenuH = Math.min(operators.length * 34 + 8, 250);
const openUp = spaceBelow < estimatedMenuH && spaceAbove > spaceBelow;
setMenuStyle(
openUp
? {
bottom: window.innerHeight - rect.top + 4,
top: "auto",
left: rect.left,
minWidth: rect.width,
}
: {
top: rect.bottom + 4,
bottom: "auto",
left: rect.left,
minWidth: rect.width,
}
);
};
calc();
window.addEventListener("resize", calc);
window.addEventListener("scroll", calc, true);
return () => {
window.removeEventListener("resize", calc);
window.removeEventListener("scroll", calc, true);
};
}, [open, operators.length]);

return (
<div className="ch-dd ch-dd--compact" ref={ref}>
<button
ref={triggerRef}
className={`ch-dd__trigger ch-dd__trigger--compact ${open ? "ch-dd__trigger--open" : ""}`}
onClick={() => !loading && setOpen(o => !o)}
type="button"
disabled={loading}
title={loading ? "Loading operators..." : value || "Select Operator"}
>
<span className="ch-dd__icon">👤</span>
<span className="ch-dd__value ch-dd__value--compact">
{loading ? "..." : (value || "Operator")}
</span>
<svg
className={`ch-dd__caret ${open ? "ch-dd__caret--up" : ""}`}
width="9" height="9" viewBox="0 0 24 24"
fill="none" stroke="currentColor" strokeWidth="2.5"
>
<polyline points="6,9 12,15 18,9" />
</svg>
</button>

{/* ✅ FIX: Pass computed menuStyle to the portal menu so it positions correctly */}
{open && createPortal(
<div
className="ch-dd__menu ch-dd__menu--compact"
ref={menuRef}
style={{ ...menuStyle, maxHeight: "250px", overflowY: "auto" }}
>
{operators.length === 0 ? (
<div style={{ padding: "10px 14px", fontSize: 12, color: "#94a3b8" }}>
No operators found
</div>
) : (
operators.map(opr => (
<button
key={opr}
className={`ch-dd__item ${value === opr ? "ch-dd__item--active" : ""}`}
onClick={() => { onChange(opr); setOpen(false); }}
type="button"
>
<span className="ch-dd__item-icon">👤</span>
<span>{opr}</span>
{value === opr && (
<svg className="ch-dd__check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
<polyline points="20,6 9,17 4,12" />
</svg>
)}
</button>
))
)}
</div>,
document.body
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
const [operators, setOperators] = useState([]);
const [selectedOpr, setSelectedOpr] = useState(null);
const [oprLoading, setOprLoading] = useState(() => def.id === "production-1");

// Load operators for production-1 chart
useEffect(() => {
if (def.id === "production-1") {
setOprLoading(true);
fetch("/api/production/operators/", { credentials: "include" })
.then(res => res.json())
.then(data => {
setOprLoading(false);
if (data.operators && data.operators.length > 0) {
setOperators(data.operators);
setSelectedOpr(data.default || data.operators[0]);
}
})
.catch(err => {
setOprLoading(false);
console.error(err);
});
}
}, [def.id]);

useEffect(() => {
if (!canvasRef.current) return;
if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

// ── API charts ─────────
if (def.id === "sales-1" || def.id === "sales-2" || def.id === "quality-1" || def.id === "quality-2" || def.id === "quality-3" || def.id === "quality-4" || def.id === "production-1" || def.id === "production-2") {
setLoading(true);
setError(null);
// Backend requires oprname; do not fetch until an operator is chosen (avoids 400 on first paint).
if (def.id === "production-1" && !selectedOpr) {
if (oprLoading) return () => {};
setLoading(false);
setError(operators.length === 0 ? "No operators found." : null);
return () => {};
}
const ac = new AbortController();
let endpoint = "/api/po-vs-sales/";
if (def.id === "sales-2") endpoint = "/api/otd-report/";
if (def.id === "quality-1") endpoint = "/api/customer-complaints/";
if (def.id === "quality-2") endpoint = "/api/quality/rejection-monthwise/";
if (def.id === "quality-3") endpoint = "/api/quality/rework-monthwise/";
if (def.id === "quality-4") endpoint = "/api/quality/mac-rejection-ppm/";
if (def.id === "production-1") endpoint = "/api/production/operator-efficiency/";
if (def.id === "production-2") endpoint = "/api/production/overall-operator-efficiency/";

let url = endpoint;
if (dateRange?.from && dateRange?.to) {
const from = formatLocalDate(dateRange.from);
const to = formatLocalDate(dateRange.to);
url += `?from=${from}&to=${to}`;
}
if (def.id === "production-1" && selectedOpr) {
url += (url.includes("?") ? "&" : "?") + `oprname=${encodeURIComponent(selectedOpr)}`;
}

fetch(url, { credentials: "include", signal: ac.signal })
.then(res => res.json())
.then(data => {
setLoading(false);
if (data.error) { setError(data.error); return; }
if (data.fy) setFyLabel(data.fy);
if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

if (def.id === "sales-1") {
chartRef.current = new Chart(canvasRef.current, {
type: def.config.type,
data: { labels: data.labels || [], datasets: [{ label: "PO Value (₹L)", data: data.po || [], backgroundColor: "#3b82f6", borderRadius: 4 }, { label: "Sales Value (₹L)", data: data.sales || [], backgroundColor: "#10b981", borderRadius: 4 }] },
options: { ...def.config.options },
});
} else if (def.id === "sales-2") {
chartRef.current = new Chart(canvasRef.current, {
type: "line",
data: { labels: data.labels || [], datasets: [{ label: "OTD % Actual", data: data.data || [], borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", tension: 0.4, fill: true, pointRadius: 3 }, { label: "Target 90%", data: Array(12).fill(90), borderColor: "#ef4444", backgroundColor: "transparent", borderDash: [6,3], tension: 0, fill: false, pointRadius: 0 }] },
options: { ...def.config.options, scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } },
});
} else if (def.id === "quality-1") {
chartRef.current = new Chart(canvasRef.current, {
type: "pie",
data: { labels: data.labels || [], datasets: [{ label: "Complaint Count", data: data.data || [], backgroundColor: def.config.data.datasets[0].backgroundColor }] },
options: { ...def.config.options },
});
} else if (def.id === "quality-2") {
chartRef.current = new Chart(canvasRef.current, {
type: "line",
data: { labels: data.labels || [], datasets: [{ label: "Rejection Count", data: data.data || [], borderColor: "#ec4899", backgroundColor: "rgba(236,72,153,0.1)", tension: 0.4, fill: true, pointRadius: 3 }] },
options: { ...def.config.options },
});
} else if (def.id === "quality-3") {
chartRef.current = new Chart(canvasRef.current, {
type: "bar",
data: { labels: data.labels || [], datasets: [{ label: "Rework Items", data: data.data || [], backgroundColor: def.config.data.datasets[0].backgroundColor, borderRadius: 4 }] },
options: { ...def.config.options },
});
} else if (def.id === "quality-4") {
chartRef.current = new Chart(canvasRef.current, {
type: "line",
data: { labels: data.labels || [], datasets: [{ label: "Actual PPM", data: data.data || [], borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.1)", tension: 0.4, fill: true, pointRadius: 3 }] },
options: { ...def.config.options, scales: { ...def.config.options.scales, y: { ticks: { font: { size: 9 }, callback: val => val.toLocaleString() + ' PPM' } } } },
});
} else if (def.id === "production-1") {
chartRef.current = new Chart(canvasRef.current, {
type: "line",
data: { labels: data.labels || [], datasets: [{ label: `${selectedOpr || 'Operator'} Efficiency %`, data: data.data || [], borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", tension: 0.4, fill: true, pointRadius: 3 }] },
options: { ...def.config.options, scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } },
});
} else if (def.id === "production-2") {
chartRef.current = new Chart(canvasRef.current, {
type: "bar",
data: { labels: data.labels || [], datasets: [{ label: "Overall Efficiency %", data: data.data || [], backgroundColor: "#06b6d4", borderRadius: 4 }] },
options: { ...def.config.options, scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } },
});
}
})
.catch(err => {
if (err.name === "AbortError") return;
setLoading(false);
setError("Failed to load chart data.");
console.error(err);
});

return () => { ac.abort(); if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
} else {
chartRef.current = new Chart(canvasRef.current, {
type: def.config.type,
data: JSON.parse(JSON.stringify(def.config.data)),
options: { ...def.config.options },
});
}
}, [def, dateRange, selectedOpr, oprLoading, operators.length]);

const handleDownload = () => {
if (!canvasRef.current) return;
const link = document.createElement("a");
link.href = canvasRef.current.toDataURL("image/png");
link.download = def.filename;
link.click();
};

const catColor = CAT_META[def.category]?.color || "#3b82f6";

return (
<div className="ch-card" style={{ "--cat-color": catColor, animationDelay: `${0.04 + idx * 0.045}s` }}>
<div className="ch-card__accent" />

{/* Card Header with Operator Dropdown (Right Corner) */}
<div className="ch-card__hd">
<div className="ch-card__hd-left">
<span className="ch-card__title">{def.title}</span>
{def.id === "production-1" && selectedOpr && (
<span className="ch-card__subtitle">· {selectedOpr}</span>
)}
</div>
{/* ✅ Operator Dropdown - Right Corner of Card Header */}
{def.id === "production-1" && (
<div className="ch-card__hd-right">
<OperatorDropdown value={selectedOpr} onChange={setSelectedOpr} operators={operators} loading={oprLoading} />
</div>
)}
</div>

<div className="ch-card__tags">
{def.tags.map(t => <span key={t} className={`ch-tag ch-tag--${def.category}`}>{t}</span>)}
<span className={`ch-tag ch-tag--${def.category}`} style={{ opacity: 0.75, fontStyle: "italic" }}>
{(def.id === "sales-1" || def.id === "sales-2" || def.id === "quality-1" || def.id === "quality-2" || def.id === "quality-3" || def.id === "quality-4" || def.id === "production-1" || def.id === "production-2") ? fyLabel : def.badge}
</span>
{def.status === "archived" && <span className="ch-tag ch-tag--archived">Archived</span>}
</div>

{loading && (
<div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.75)", borderRadius: 12, zIndex: 5 }}>
<div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>⏳ Loading chart…</div>
</div>
)}

{error && !loading && (
<div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(255,255,255,0.9)", borderRadius: 12, zIndex: 5, padding: 16 }}>
<div style={{ fontSize: 22 }}>⚠️</div>
<div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, textAlign: "center" }}>{error}</div>
</div>
)}

<div className="ch-canvas-wrap">
<canvas ref={canvasRef} />
</div>

<div className="ch-card__actions">
<button className="ch-action-btn ch-action-btn--preview" onClick={() => onPreview(def, selectedOpr)}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
</svg>
Preview
</button>
<button className="ch-action-btn ch-action-btn--download" onClick={handleDownload}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" />
</svg>
Download
</button>
</div>
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
const canvasRef = useRef(null);
const chartRef = useRef(null);

// Load operators for production-1
useEffect(() => {
if (def.id === "production-1") {
setOprLoading(true);
fetch("/api/production/operators/", { credentials: "include" })
.then(res => res.json())
.then(data => {
setOprLoading(false);
if (data.operators && data.operators.length > 0) {
setOperators(data.operators);
if (!modalOperator) setModalOperator(data.default || data.operators[0]);
}
})
.catch(err => { setOprLoading(false); console.error(err); });
}
}, [def.id]);

const animatedClose = () => { setClosing(true); setTimeout(() => onClose(), 220); };

useEffect(() => {
if (!def || !canvasRef.current) return;
if (def.id === "sales-1" || def.id === "sales-2" || def.id === "quality-1" || def.id === "quality-2" || def.id === "quality-3" || def.id === "quality-4" || def.id === "production-1" || def.id === "production-2") {
if (chartRef.current) chartRef.current.destroy();
if (def.id === "production-1" && !modalOperator) {
if (oprLoading) return () => {};
return () => {};
}
const ac = new AbortController();
let endpoint = "/api/po-vs-sales/";
if (def.id === "sales-2") endpoint = "/api/otd-report/";
if (def.id === "quality-1") endpoint = "/api/customer-complaints/";
if (def.id === "quality-2") endpoint = "/api/quality/rejection-monthwise/";
if (def.id === "quality-3") endpoint = "/api/quality/rework-monthwise/";
if (def.id === "quality-4") endpoint = "/api/quality/mac-rejection-ppm/";
if (def.id === "production-1") endpoint = "/api/production/operator-efficiency/";
if (def.id === "production-2") endpoint = "/api/production/overall-operator-efficiency/";

let url = endpoint;
if (modalDateRange.from && modalDateRange.to) {
const from = formatLocalDate(modalDateRange.from);
const to = formatLocalDate(modalDateRange.to);
url += `?from=${from}&to=${to}`;
}
if (def.id === "production-1" && modalOperator) {
url += (url.includes("?") ? "&" : "?") + `oprname=${encodeURIComponent(modalOperator)}`;
}

fetch(url, { credentials: "include", signal: ac.signal })
.then(res => res.json())
.then(data => {
if (data.error) { console.error(data.error); return; }
if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

if (def.id === "sales-1") {
chartRef.current = new Chart(canvasRef.current, {
type: def.config.type,
data: { labels: data.labels || [], datasets: [{ label: `PO Value (₹L) — ${data.fy || ""}`, data: data.po || [], backgroundColor: "#3b82f6", borderRadius: 4 }, { label: `Sales Value (₹L) — ${data.fy || ""}`, data: data.sales || [], backgroundColor: "#10b981", borderRadius: 4 }] },
options: { ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `${data.company || ""} · ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } } },
});
} else if (def.id === "sales-2") {
chartRef.current = new Chart(canvasRef.current, {
type: "line",
data: { labels: data.labels || [], datasets: [{ label: `OTD % Actual — ${data.fy || ""}`, data: data.data || [], borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", tension: 0.4, fill: true, pointRadius: 3 }, { label: "Target 90%", data: Array(12).fill(90), borderColor: "#ef4444", backgroundColor: "transparent", borderDash: [6,3], tension: 0, fill: false, pointRadius: 0 }] },
options: { ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `OTD Report ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } }, scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } },
});
} else if (def.id === "quality-1") {
chartRef.current = new Chart(canvasRef.current, {
type: "pie",
data: { labels: data.labels || [], datasets: [{ label: `Complaints — ${data.fy || ""}`, data: data.data || [], backgroundColor: def.config.data.datasets[0].backgroundColor }] },
options: { ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Complaint Distribution ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } } },
});
} else if (def.id === "quality-2") {
chartRef.current = new Chart(canvasRef.current, {
type: "line",
data: { labels: data.labels || [], datasets: [{ label: `Rejections — ${data.fy || ""}`, data: data.data || [], borderColor: "#ec4899", backgroundColor: "rgba(236,72,153,0.1)", tension: 0.4, fill: true, pointRadius: 3 }] },
options: { ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Rejection Trend ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } } },
});
} else if (def.id === "quality-3") {
chartRef.current = new Chart(canvasRef.current, {
type: "bar",
data: { labels: data.labels || [], datasets: [{ label: `Rework Items — ${data.fy || ""}`, data: data.data || [], backgroundColor: def.config.data.datasets[0].backgroundColor, borderRadius: 4 }] },
options: { ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Rework Trend ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } } },
});
} else if (def.id === "quality-4") {
chartRef.current = new Chart(canvasRef.current, {
type: "line",
data: { labels: data.labels || [], datasets: [{ label: `Actual PPM — ${data.fy || ""}`, data: data.data || [], borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.1)", tension: 0.4, fill: true, pointRadius: 3 }] },
options: { ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Internal Mac Rejection PPM ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } }, scales: { ...def.config.options.scales, y: { ticks: { font: { size: 9 }, callback: val => val.toLocaleString() + ' PPM' } } } },
});
} else if (def.id === "production-1") {
chartRef.current = new Chart(canvasRef.current, {
type: "line",
data: { labels: data.labels || [], datasets: [{ label: `${modalOperator || 'Operator'} Efficiency % — ${data.fy || ""}`, data: data.data || [], borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", tension: 0.4, fill: true, pointRadius: 3 }] },
options: { ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Operator Efficiency: ${modalOperator || ''} ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } }, scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } },
});
} else if (def.id === "production-2") {
chartRef.current = new Chart(canvasRef.current, {
type: "bar",
data: { labels: data.labels || [], datasets: [{ label: `Overall Efficiency % — ${data.fy || ""}`, data: data.data || [], backgroundColor: "#06b6d4", borderRadius: 4 }] },
options: { ...def.config.options, plugins: { ...def.config.options.plugins, title: { display: true, text: `Overall Operator Efficiency ${data.fy || ""} (${data.from} → ${data.to})`, font: { size: 10 }, color: "#64748b", padding: { bottom: 8 } } }, scales: { ...def.config.options.scales, y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: val => val + '%' } } } },
});
}
})
.catch(err => { if (err.name !== "AbortError") console.error(err); });

return () => { ac.abort(); if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
} else {
if (chartRef.current) chartRef.current.destroy();
chartRef.current = new Chart(canvasRef.current, {
type: def.config.type,
data: JSON.parse(JSON.stringify(def.config.data)),
options: { ...def.config.options },
});
}
}, [def, modalDateRange, modalOperator, oprLoading, operators.length]);

const handleDownload = () => {
if (!canvasRef.current) return;
const imgData = canvasRef.current.toDataURL("image/png", 1.0);
const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
const pageW = pdf.internal.pageSize.getWidth();
const pageH = pdf.internal.pageSize.getHeight();

pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, pageW, pageH, "F");
pdf.setFillColor(59, 130, 246); pdf.rect(0, 0, pageW * 0.5, 3.5, "F");
pdf.setFillColor(6, 182, 212); pdf.rect(pageW * 0.5, 0, pageW * 0.25, 3.5, "F");
pdf.setFillColor(16, 185, 129); pdf.rect(pageW * 0.75, 0, pageW * 0.25, 3.5, "F");

const catColor = CAT_META[def.category]?.color || "#3b82f6";
const { r: cr, g: cg, b: cb } = hexToRgb(catColor);
pdf.setFillColor(cr, cg, cb); pdf.rect(0, 3.5, 3, pageH - 3.5, "F");
pdf.setFillColor(248, 250, 255); pdf.rect(3, 3.5, pageW - 3, 38, "F");

let tagX = 10; const tagY = 14;
def.tags.forEach(tag => {
const label = tag.toUpperCase();
pdf.setFontSize(6.5); pdf.setFont("helvetica", "bold");
const tw = pdf.getTextWidth(label) + 7;
pdf.setFillColor(cr, cg, cb); pdf.setGState(pdf.GState({ opacity: 0.12 })); pdf.roundedRect(tagX, tagY - 4.2, tw, 6, 1.5, 1.5, "F");
pdf.setGState(pdf.GState({ opacity: 1 })); pdf.setDrawColor(cr, cg, cb); pdf.setLineWidth(0.4); pdf.roundedRect(tagX, tagY - 4.2, tw, 6, 1.5, 1.5, "D");
pdf.setTextColor(cr, cg, cb); pdf.text(label, tagX + 3.5, tagY);
tagX += tw + 3;
});

pdf.setFontSize(17); pdf.setFont("helvetica", "bold"); pdf.setTextColor(30, 58, 138); pdf.text(def.title, 10, 28);
if (def.id === "production-1" && modalOperator) {
pdf.setFontSize(10); pdf.setFont("helvetica", "normal"); pdf.setTextColor(100, 116, 139);
pdf.text(`Operator: ${modalOperator}`, 10, 34);
}
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
pdf.save(pdfName);
};

return createPortal(
<div className={`ch-modal${closing ? " ch-modal--closing" : ""}`} onMouseDown={e => { if (e.target === e.currentTarget) animatedClose(); }}>
<div className="ch-modal__content" style={{ backgroundColor: "#ffffff" }}>
<div className="ch-modal__accent" />
<div className="ch-modal__hd" style={{ backgroundColor: "#ffffff" }}>
<div className="ch-modal__hd-left">
{def.tags.map(t => <span key={t} className={`ch-tag ch-tag--${def.category}`}>{t}</span>)}
</div>
<div
className="ch-modal__hd-right"
style={{
display: "flex",
flexDirection: "row",
flexWrap: "nowrap",
alignItems: "center",
gap: "10px",
flexShrink: 0,
}}
>
{def.id === "production-1" && (
<OperatorDropdown value={modalOperator} onChange={setModalOperator} operators={operators} loading={oprLoading} />
)}
<button className="ch-modal__close" onClick={animatedClose} aria-label="Close modal">
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
</svg>
</button>
</div>
</div>
<h2 className="ch-modal__title" style={{ backgroundColor: "#ffffff" }}>{def.title}</h2>
<div className="ch-modal__date-filter" style={{ padding: "0 20px 12px", backgroundColor: "#ffffff", display: "flex", alignItems: "center", gap: "10px" }}>
<ChartDatePicker from={modalDateRange.from} to={modalDateRange.to} onChange={setModalDateRange} />
{modalDateRange.from && (
<span style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>
{modalDateRange.to ? `${Math.round(Math.abs(modalDateRange.to - modalDateRange.from) / 86_400_000) + 1} days selected` : "Pick end date"}
</span>
)}
</div>
<div className="ch-modal__canvas-wrap" style={{ backgroundColor: "#ffffff" }}>
<canvas ref={canvasRef} />
</div>
<div className="ch-modal__footer" style={{ backgroundColor: "#f8faff" }}>
<button className="ch-modal-btn ch-modal-btn--sec" onClick={animatedClose}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
Close
</button>
<button className="ch-modal-btn ch-modal-btn--pri" onClick={handleDownload}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" />
</svg>
Download Chart
</button>
</div>
</div>
</div>,
document.body
);
}

// ─── Main ─────────────────────────────────────────────────────
export default function Charts() {
const [filters, setFilters] = useState({ category: "all", type: "all" });
const [dateRange, setDateRange] = useState({ from: null, to: null });
const [preview, setPreview] = useState(null);

const visible = CHART_DEFS.filter(d =>
(filters.category === "all" || d.category === filters.category) &&
(filters.type === "all" || d.type === filters.type)
);

const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));
const reset = () => { setFilters({ category: "all", type: "all" }); setDateRange({ from: null, to: null }); };
const isFiltered = filters.category !== "all" || filters.type !== "all" || !!dateRange.from;

const handlePreview = (def, operator = null) => setPreview({ def, dateRange, operator });

return (
<div className="ch-root">
<div className="ch-filter-bar">
<div className="ch-filter-bar__label">
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
<polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
</svg>
Filters
</div>
<div className="ch-filter-bar__sep" />
<div className="ch-filter-bar__dropdowns">
<FilterDropdown label="Category" icon="📂" options={CAT_META} value={filters.category} onChange={v => setFilter("category", v)} />
<FilterDropdown label="Chart Type" icon="📊" options={TYPE_META} value={filters.type} onChange={v => setFilter("type", v)} />
<div className="ch-filter-bar__sep ch-filter-bar__sep--v" />
<ChartDatePicker from={dateRange.from} to={dateRange.to} onChange={setDateRange} />
</div>
<div className="ch-filter-bar__right">
<span className="ch-filter-bar__count">
<span className="ch-filter-bar__count-num">{visible.length}</span>
<span className="ch-filter-bar__count-of">/ {CHART_DEFS.length} charts</span>
</span>
{isFiltered && (
<button className="ch-filter-bar__reset" onClick={reset} title="Reset filters">
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
<polyline points="1,4 1,10 7,10" /><path d="M3.51 15a9 9 0 1 0 .49-3.5" />
</svg>
Reset
</button>
)}
</div>
</div>

{visible.length > 0 ? (
<div className="ch-grid">
{visible.map((def, idx) => (
<ChartCard
key={def.id}
def={def}
idx={idx}
onPreview={handlePreview}
dateRange={(def.id === "sales-1" || def.id === "sales-2" || def.id === "quality-1" || def.id === "quality-2" || def.id === "quality-3" || def.id === "quality-4" || def.id === "production-1" || def.id === "production-2") ? dateRange : undefined}
/>
))}
</div>
) : (
<div className="ch-empty">
<div className="ch-empty__icon">📭</div>
<h3 className="ch-empty__title">No charts match your filters</h3>
<p className="ch-empty__sub">Try adjusting or resetting your filters</p>
<button className="ch-filter-bar__reset ch-filter-bar__reset--lg" onClick={reset}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
<polyline points="1,4 1,10 7,10" /><path d="M3.51 15a9 9 0 1 0 .49-3.5" />
</svg>
Reset Filters
</button>
</div>
)}

{preview && (
<PreviewModal
def={preview.def}
initialDateRange={preview.dateRange}
initialOperator={preview.operator}
onClose={() => setPreview(null)}
/>
)}
</div>
);
}
