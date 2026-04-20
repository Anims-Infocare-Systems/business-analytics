/**
 * Charts.jsx  —  Advanced Analytics Dashboard
 * Prefix: ch-
 * Categories: Sales · Quality · Production · Operations · Purchase · Vendor
 * Total charts: 16
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
                    {
                        label: "PO Value (₹L)",
                        data: [42, 38, 51, 46, 55, 60, 58, 63, 49, 54, 67, 72],
                        backgroundColor: "#3b82f6", borderRadius: 4,
                    },
                    {
                        label: "Sales Value (₹L)",
                        data: [38, 35, 48, 42, 50, 56, 53, 60, 45, 50, 62, 68],
                        backgroundColor: "#10b981", borderRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { font: { size: 9 } } } },
                scales: {
                    x: { ticks: { font: { size: 9 } } },
                    y: { ticks: { font: { size: 9 } }, title: { display: true, text: "₹ Lakhs", font: { size: 8 } } },
                },
            },
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
                    {
                        label: "OTD % Actual",
                        data: [82,78,85,88,84,91,87,90,86,92,89,94],
                        borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)",
                        tension: 0.4, fill: true, pointRadius: 3,
                    },
                    {
                        label: "Target 90%",
                        data: [90,90,90,90,90,90,90,90,90,90,90,90],
                        borderColor: "#ef4444", backgroundColor: "transparent",
                        borderDash: [6,3], tension: 0, fill: false, pointRadius: 0,
                    },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { font: { size: 9 } } } },
                scales: {
                    x: { ticks: { font: { size: 9 } } },
                    y: { min: 60, max: 100, ticks: { font: { size: 9 } } },
                },
            },
        },
    },

    // ══ QUALITY (4 charts) ═════════════════════════════════════
    {
        id: "quality-1", title: "Customer Complaint Distribution",
        badge: "Monthly", category: "quality", type: "pie", status: "active",
        tags: ["Quality", "Pie Chart"], filename: "customer-complaint-pie.png",
        config: {
            type: "doughnut",
            data: {
                labels: ["Dimension","Surface Finish","Material","Packaging","Delivery","Others"],
                datasets: [{
                    data: [28,20,15,12,14,11],
                    backgroundColor: ["#3b82f6","#06b6d4","#f97316","#8b5cf6","#ec4899","#10b981"],
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: "bottom", labels: { font: { size: 9 }, padding: 6 } } },
            },
        },
    },
    {
        id: "quality-2", title: "Rejection Monthwise",
        badge: "Monthly", category: "quality", type: "line", status: "active",
        tags: ["Quality", "Line Chart"], filename: "rejection-monthwise.png",
        config: {
            type: "line",
            data: {
                labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
                datasets: [{
                    label: "Rejection Count",
                    data: [8,12,15,10,7,5,6,9,11,8,6,4],
                    borderColor: "#ec4899", backgroundColor: "rgba(236,72,153,0.1)",
                    tension: 0.4, fill: true, pointRadius: 3,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } },
            },
        },
    },
    {
        id: "quality-3", title: "Rework Monthwise",
        badge: "Monthly", category: "quality", type: "bar", status: "active",
        tags: ["Quality", "Bar Chart"], filename: "rework-monthwise.png",
        config: {
            type: "bar",
            data: {
                labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
                datasets: [{
                    label: "Rework Items",
                    data: [5,8,6,4,3,2,4,6,5,3,2,1],
                    backgroundColor: ["#3b82f6","#06b6d4","#10b981","#f97316","#8b5cf6","#ec4899","#3b82f6","#06b6d4","#10b981","#f97316","#8b5cf6","#ec4899"],
                    borderRadius: 4,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } },
            },
        },
    },
    {
        id: "quality-4", title: "Internal Mac Rejection — Target Vs PPM",
        badge: "Monthly", category: "quality", type: "line", status: "active",
        tags: ["Quality", "Line Chart"], filename: "mac-rejection-ppm.png",
        config: {
            type: "line",
            data: {
                labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
                datasets: [
                    {
                        label: "Actual PPM",
                        data: [1200,1450,1100,980,870,760,820,700,650,590,540,480],
                        borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.1)",
                        tension: 0.4, fill: true, pointRadius: 3,
                    },
                    {
                        label: "Target PPM",
                        data: [1000,1000,1000,900,900,800,800,700,700,600,600,500],
                        borderColor: "#ef4444", backgroundColor: "transparent",
                        borderDash: [6,3], tension: 0, fill: false, pointRadius: 0,
                    },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { font: { size: 9 } } } },
                scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } },
            },
        },
    },

    // ══ PRODUCTION (4 charts) ══════════════════════════════════
    {
        id: "production-1", title: "Operation Efficiency",
        badge: "Monthly", category: "production", type: "line", status: "active",
        tags: ["Production", "Line Chart"], filename: "operation-efficiency.png",
        config: {
            type: "line",
            data: {
                labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
                datasets: [{
                    label: "Efficiency %",
                    data: [74,78,72,80,76,83,81,85,79,84,88,90],
                    borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)",
                    tension: 0.4, fill: true, pointRadius: 3,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { ticks: { font: { size: 9 } } }, y: { min: 60, max: 100, ticks: { font: { size: 9 } } } },
            },
        },
    },
    {
        id: "production-2", title: "Overall Operation Efficiency Monthwise",
        badge: "Monthly", category: "production", type: "bar", status: "active",
        tags: ["Production", "Bar Chart"], filename: "overall-op-efficiency.png",
        config: {
            type: "bar",
            data: {
                labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
                datasets: [{
                    label: "Efficiency %",
                    data: [74,78,72,80,76,83,81,85,79,84,88,90],
                    backgroundColor: "#06b6d4", borderRadius: 4,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { ticks: { font: { size: 9 } } }, y: { min: 60, max: 100, ticks: { font: { size: 9 } } } },
            },
        },
    },
    {
        id: "production-3", title: "Machine Wise Idle Time",
        badge: "Monthly", category: "production", type: "bar", status: "active",
        tags: ["Production", "Bar Chart"], filename: "machine-idle-time.png",
        config: {
            type: "bar",
            data: {
                labels: ["MC-01","MC-02","MC-03","MC-04","MC-05","MC-06","MC-07","MC-08"],
                datasets: [{
                    label: "Idle Time (hrs)",
                    data: [12.5,8.2,15.0,6.8,10.4,18.2,7.6,11.3],
                    backgroundColor: ["#3b82f6","#f97316","#ef4444","#10b981","#8b5cf6","#ec4899","#06b6d4","#f59e0b"],
                    borderRadius: 4,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { font: { size: 8 } } },
                    y: { ticks: { font: { size: 9 } }, title: { display: true, text: "Hours", font: { size: 8 } } },
                },
            },
        },
    },
    {
        id: "production-4", title: "Machine Efficiency Monthwise",
        badge: "Monthly", category: "production", type: "line", status: "active",
        tags: ["Production", "Line Chart"], filename: "machine-efficiency-monthwise.png",
        config: {
            type: "line",
            data: {
                labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
                datasets: [
                    {
                        label: "MC Group A",
                        data: [75,82,70,88,79,85,81,87,83,89,86,91],
                        borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.08)",
                        tension: 0.4, fill: true, pointRadius: 3,
                    },
                    {
                        label: "MC Group B",
                        data: [68,74,65,78,72,80,75,82,77,84,80,87],
                        borderColor: "#06b6d4", backgroundColor: "rgba(6,182,212,0.08)",
                        tension: 0.4, fill: true, pointRadius: 3,
                    },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { font: { size: 9 } } } },
                scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } },
            },
        },
    },

    // ══ OPERATIONS (2 charts) ══════════════════════════════════
    {
        id: "operations-1", title: "Overall Efficiency",
        badge: "Monthly", category: "operations", type: "line", status: "active",
        tags: ["Operations", "Line Chart"], filename: "overall-efficiency.png",
        config: {
            type: "line",
            data: {
                labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
                datasets: [
                    {
                        label: "Actual Efficiency %",
                        data: [85,88,82,90,87,92,89,85,88,91,86,93],
                        borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)",
                        tension: 0.4, fill: true, pointRadius: 3,
                    },
                    {
                        label: "Target 88%",
                        data: [88,88,88,88,88,88,88,88,88,88,88,88],
                        borderColor: "#ef4444", backgroundColor: "transparent",
                        borderDash: [6,3], tension: 0, fill: false, pointRadius: 0,
                    },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { font: { size: 9 } } } },
                scales: { x: { ticks: { font: { size: 9 } } }, y: { min: 70, max: 100, ticks: { font: { size: 9 } } } },
            },
        },
    },
    {
        id: "operations-2", title: "Production Value",
        badge: "Monthly", category: "operations", type: "bar", status: "active",
        tags: ["Operations", "Bar Chart"], filename: "production-value.png",
        config: {
            type: "bar",
            data: {
                labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
                datasets: [
                    {
                        label: "Actual (₹L)",
                        data: [128,142,115,158,147,165,160,172,145,168,180,195],
                        backgroundColor: "#10b981", borderRadius: 4,
                    },
                    {
                        label: "Target (₹L)",
                        data: [150,150,150,160,160,160,165,165,165,175,175,190],
                        backgroundColor: "rgba(59,130,246,0.35)", borderRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { font: { size: 9 } } } },
                scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } },
            },
        },
    },

    // ══ PURCHASE (2 charts) ════════════════════════════════════
    {
        id: "purchase-1", title: "Purchase Report Monthwise",
        badge: "Monthly", category: "purchase", type: "bar", status: "active",
        tags: ["Purchase", "Bar Chart"], filename: "purchase-report-monthwise.png",
        config: {
            type: "bar",
            data: {
                labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
                datasets: [
                    {
                        label: "Raw Material (₹L)",
                        data: [30,35,32,38,40,42,37,44,39,45,48,52],
                        backgroundColor: "#3b82f6", borderRadius: 3,
                    },
                    {
                        label: "Consumables (₹L)",
                        data: [8,9,7,10,11,10,9,12,10,11,13,14],
                        backgroundColor: "#06b6d4", borderRadius: 3,
                    },
                    {
                        label: "Tooling (₹L)",
                        data: [5,6,4,7,6,8,7,9,6,8,9,10],
                        backgroundColor: "#f97316", borderRadius: 3,
                    },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { font: { size: 9 } } } },
                scales: {
                    x: { stacked: true, ticks: { font: { size: 9 } } },
                    y: { stacked: true, ticks: { font: { size: 9 } } },
                },
            },
        },
    },
    {
        id: "purchase-2", title: "Supplier Rating",
        badge: "Monthly", category: "purchase", type: "bar", status: "active",
        tags: ["Purchase", "Bar Chart"], filename: "supplier-rating.png",
        config: {
            type: "bar",
            data: {
                labels: ["Supp-A","Supp-B","Supp-C","Supp-D","Supp-E","Supp-F","Supp-G"],
                datasets: [{
                    label: "Rating Score",
                    data: [87,92,74,95,68,83,89],
                    backgroundColor: ["#10b981","#3b82f6","#f97316","#10b981","#ef4444","#3b82f6","#10b981"],
                    borderRadius: 5,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                indexAxis: "y",
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ` Score: ${ctx.parsed.x} / 100` } },
                },
                scales: {
                    x: { min: 0, max: 100, ticks: { font: { size: 9 } } },
                    y: { ticks: { font: { size: 9 } } },
                },
            },
        },
    },

    // ══ VENDOR (2 charts) ══════════════════════════════════════
    {
        id: "vendor-1", title: "Vendor Rating",
        badge: "Monthly", category: "vendor", type: "bar", status: "active",
        tags: ["Vendor", "Bar Chart"], filename: "vendor-rating.png",
        config: {
            type: "bar",
            data: {
                labels: ["Vendor-1","Vendor-2","Vendor-3","Vendor-4","Vendor-5","Vendor-6"],
                datasets: [
                    {
                        label: "Quality Score",
                        data: [88,76,91,65,82,94],
                        backgroundColor: "#3b82f6", borderRadius: 4,
                    },
                    {
                        label: "Delivery Score",
                        data: [82,80,85,70,78,90],
                        backgroundColor: "#10b981", borderRadius: 4,
                    },
                    {
                        label: "Price Score",
                        data: [75,85,78,80,72,88],
                        backgroundColor: "#f97316", borderRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { font: { size: 9 } } } },
                scales: {
                    x: { ticks: { font: { size: 8 } } },
                    y: { min: 0, max: 100, ticks: { font: { size: 9 } } },
                },
            },
        },
    },
    {
        id: "vendor-2", title: "Vendor Rejections",
        badge: "Monthly", category: "vendor", type: "line", status: "active",
        tags: ["Vendor", "Line Chart"], filename: "vendor-rejections.png",
        config: {
            type: "line",
            data: {
                labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
                datasets: [
                    {
                        label: "Vendor-1",
                        data: [6,8,5,9,4,3,5,4,3,2,3,1],
                        borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.06)",
                        tension: 0.4, fill: false, pointRadius: 3,
                    },
                    {
                        label: "Vendor-2",
                        data: [4,5,7,6,5,4,3,5,4,3,2,2],
                        borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.06)",
                        tension: 0.4, fill: false, pointRadius: 3,
                    },
                    {
                        label: "Vendor-3",
                        data: [2,3,4,2,3,2,1,2,1,2,1,1],
                        borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.06)",
                        tension: 0.4, fill: false, pointRadius: 3,
                    },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { font: { size: 9 } } } },
                scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } },
            },
        },
    },
];

// ─── Category / Type / Status meta ───────────────────────────
const CAT_META = {
    all:        { label: "All",        icon: "⊞", color: "#3b82f6" },
    sales:      { label: "Sales",      icon: "📈", color: "#22c55e" },
    quality:    { label: "Quality",    icon: "✅", color: "#a855f7" },
    production: { label: "Production", icon: "🏭", color: "#f97316" },
    operations: { label: "Operations", icon: "⚙️", color: "#06b6d4" },
    purchase:   { label: "Purchase",   icon: "🛒", color: "#f59e0b" },
    vendor:     { label: "Vendor",     icon: "🤝", color: "#8b5cf6" },
};
const TYPE_META = {
    all:  { label: "All Types", icon: "📊" },
    line: { label: "Line",      icon: "📉" },
    bar:  { label: "Bar",       icon: "📊" },
    pie:  { label: "Pie",       icon: "🥧" },
};


// ─── Helper: parse hex color to RGB ───────────────────────────
function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16),
    };
}

// ─── Compact Dropdown ─────────────────────────────────────────
function FilterDropdown({ label, icon, options, value, onChange }) {
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const ref      = useRef(null);   // trigger wrapper
    const menuRef  = useRef(null);   // portaled menu
    const triggerRef = useRef(null);

    // Close on outside click — must ignore both trigger AND portaled menu
    useEffect(() => {
        const h = e => {
            const inTrigger = ref.current    && ref.current.contains(e.target);
            const inMenu    = menuRef.current && menuRef.current.contains(e.target);
            if (!inTrigger && !inMenu) setOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    // Recalculate menu position whenever it opens or viewport resizes/scrolls
    useEffect(() => {
        if (!open || !triggerRef.current) return;
        const calc = () => {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
            setMenuStyle(openUp
                ? { bottom: window.innerHeight - rect.top + 6, top: "auto", left: rect.left }
                : { top: rect.bottom + 6, bottom: "auto", left: rect.left }
            );
        };
        calc();
        window.addEventListener("resize", calc);
        window.addEventListener("scroll", calc, true);
        return () => {
            window.removeEventListener("resize", calc);
            window.removeEventListener("scroll", calc, true);
        };
    }, [open]);

    const current = options[value];

    return (
        <div className="ch-dd" ref={ref}>
            <button
                ref={triggerRef}
                className={`ch-dd__trigger ${open ? "ch-dd__trigger--open" : ""}`}
                onClick={() => setOpen(o => !o)}
                type="button"
            >
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
                        <button
                            key={key}
                            className={`ch-dd__item ${value === key ? "ch-dd__item--active" : ""}`}
                            onClick={() => { onChange(key); setOpen(false); }}
                            type="button"
                        >
                            <span className="ch-dd__item-icon">{meta.icon}</span>
                            <span>{meta.label}</span>
                            {value === key && (
                                <svg className="ch-dd__check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20,6 9,17 4,12" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}

// ─── Chart Card ───────────────────────────────────────────────
function ChartCard({ def, onPreview, idx }) {
    const canvasRef  = useRef(null);
    const chartRef   = useRef(null);
    const [fyLabel,  setFyLabel]  = useState("Monthly");
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Destroy previous chart instance safely
        if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

        // ── Non-API charts: render from static config ─────────
        if (def.id !== "sales-1") {
            chartRef.current = new Chart(canvasRef.current, {
                type: def.config.type,
                data: JSON.parse(JSON.stringify(def.config.data)),
                options: { ...def.config.options },
            });
            return;
        }

        // ── sales-1: fetch from Django API ────────────────────
        setLoading(true);
        setError(null);

        fetch("/api/po-vs-sales/", { credentials: "include" })
            .then(res => res.json())
            .then(data => {
                setLoading(false);

                if (data.error) {
                    setError(data.error);
                    return;
                }

                // Show FY on the card badge e.g. "FY 2026-27"
                if (data.fy) setFyLabel(data.fy);

                if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

                chartRef.current = new Chart(canvasRef.current, {
                    type: def.config.type,
                    data: {
                        labels: data.labels || [],
                        datasets: [
                            {
                                label: "PO Value (₹L)",
                                data: data.po || [],
                                backgroundColor: "#3b82f6",
                                borderRadius: 4,
                            },
                            {
                                label: "Sales Value (₹L)",
                                data: data.sales || [],
                                backgroundColor: "#10b981",
                                borderRadius: 4,
                            },
                        ],
                    },
                    options: { ...def.config.options },
                });
            })
            .catch(err => {
                setLoading(false);
                setError("Failed to load chart data. Please try again.");
                console.error("Fetch error:", err);
            });

        return () => {
            if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
        };
    }, [def]);

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

            <div className="ch-card__tags">
                {def.tags.map(t => <span key={t} className={`ch-tag ch-tag--${def.category}`}>{t}</span>)}
                {/* ✅ FY badge replaces static "Monthly" for sales-1 */}
                <span className={`ch-tag ch-tag--${def.category}`}
                    style={{ opacity: 0.75, fontStyle: "italic" }}>
                    {def.id === "sales-1" ? fyLabel : def.badge}
                </span>
                {def.status === "archived" && <span className="ch-tag ch-tag--archived">Archived</span>}
            </div>

            <div className="ch-card__hd">
                <span className="ch-card__title">{def.title}</span>
            </div>

            {/* ✅ Loading overlay */}
            {loading && (
                <div style={{
                    position: "absolute", inset: 0, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.75)", borderRadius: 12, zIndex: 5,
                }}>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                        ⏳ Loading chart…
                    </div>
                </div>
            )}

            {/* ✅ Error state */}
            {error && !loading && (
                <div style={{
                    position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 6,
                    background: "rgba(255,255,255,0.9)", borderRadius: 12, zIndex: 5, padding: 16,
                }}>
                    <div style={{ fontSize: 22 }}>⚠️</div>
                    <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, textAlign: "center" }}>
                        {error}
                    </div>
                </div>
            )}

            <div className="ch-canvas-wrap">
                <canvas ref={canvasRef} />
            </div>

            <div className="ch-card__actions">
                <button className="ch-action-btn ch-action-btn--preview" onClick={() => onPreview(def)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                    Preview
                </button>
                <button className="ch-action-btn ch-action-btn--download" onClick={handleDownload}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                </button>
            </div>
        </div>
    );
}

// ─── Preview Modal ────────────────────────────────────────────
function PreviewModal({ def, onClose }) {
    const [modalDateRange, setModalDateRange] = useState({ from: null, to: null });
    const [closing, setClosing] = useState(false);
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    const animatedClose = () => { setClosing(true); setTimeout(() => onClose(), 220); };

    useEffect(() => {
    if (!def || !canvasRef.current) return;

    // ── Non-API charts ────────────────────────────────────────
    if (def.id !== "sales-1") {
        if (chartRef.current) chartRef.current.destroy();
        chartRef.current = new Chart(canvasRef.current, {
            type: def.config.type,
            data: JSON.parse(JSON.stringify(def.config.data)),
            options: { ...def.config.options },
        });
        return;
    }

    // ── Build API URL with optional date range ────────────────
    let url = "/api/po-vs-sales/";
    if (modalDateRange.from && modalDateRange.to) {
        const from = new Date(modalDateRange.from).toISOString().split("T")[0];
        const to   = new Date(modalDateRange.to).toISOString().split("T")[0];
        url += `?from=${from}&to=${to}`;
    }

    // ── Fetch & render ────────────────────────────────────────
    fetch(url, { credentials: "include" })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error("API error:", data.error);
                return;
            }

            if (chartRef.current) chartRef.current.destroy();

            chartRef.current = new Chart(canvasRef.current, {
                type: def.config.type,
                data: {
                    labels: data.labels || [],
                    datasets: [
                        {
                            label: `PO Value (₹L) — ${data.fy || ""}`,      // ✅ FY in legend
                            data: data.po || [],
                            backgroundColor: "#3b82f6",
                            borderRadius: 4,
                        },
                        {
                            label: `Sales Value (₹L) — ${data.fy || ""}`,   // ✅ FY in legend
                            data: data.sales || [],
                            backgroundColor: "#10b981",
                            borderRadius: 4,
                        },
                    ],
                },
                options: {
                    ...def.config.options,
                    plugins: {
                        ...def.config.options.plugins,
                        // ✅ Show company + FY as chart title inside modal
                        title: {
                            display: true,
                            text: `${data.company || ""} · ${data.fy || ""}  (${data.from} → ${data.to})`,
                            font: { size: 10 },
                            color: "#64748b",
                            padding: { bottom: 8 },
                        },
                    },
                },
            });
        })
        .catch(err => console.error("Fetch error:", err));

    return () => {
        if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
}, [def, modalDateRange]);

    // ─── PDF Download ─────────────────────────────────────────
    const handleDownload = () => {
        if (!canvasRef.current) return;

        // Capture chart as high-res PNG
        const imgData = canvasRef.current.toDataURL("image/png", 1.0);

        // A4 landscape: 297 × 210 mm
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();   // 297
        const pageH = pdf.internal.pageSize.getHeight();  // 210

        // ── White background ──────────────────────────────────
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageW, pageH, "F");

        // ── Top accent bar (blue gradient simulation) ─────────
        pdf.setFillColor(59, 130, 246);
        pdf.rect(0, 0, pageW * 0.5, 3.5, "F");
        pdf.setFillColor(6, 182, 212);
        pdf.rect(pageW * 0.5, 0, pageW * 0.25, 3.5, "F");
        pdf.setFillColor(16, 185, 129);
        pdf.rect(pageW * 0.75, 0, pageW * 0.25, 3.5, "F");

        // ── Category-coloured left side stripe ────────────────
        const catColor = CAT_META[def.category]?.color || "#3b82f6";
        const { r: cr, g: cg, b: cb } = hexToRgb(catColor);
        pdf.setFillColor(cr, cg, cb);
        pdf.rect(0, 3.5, 3, pageH - 3.5, "F");

        // ── Light header background ───────────────────────────
        pdf.setFillColor(248, 250, 255);
        pdf.rect(3, 3.5, pageW - 3, 38, "F");

        // ── Tags ──────────────────────────────────────────────
        let tagX = 10;
        const tagY = 14;
        def.tags.forEach(tag => {
            const label = tag.toUpperCase();
            pdf.setFontSize(6.5);
            pdf.setFont("helvetica", "bold");
            const tw = pdf.getTextWidth(label) + 7;
            // tag pill background
            pdf.setFillColor(cr, cg, cb);
            pdf.setGState(pdf.GState({ opacity: 0.12 }));
            pdf.roundedRect(tagX, tagY - 4.2, tw, 6, 1.5, 1.5, "F");
            pdf.setGState(pdf.GState({ opacity: 1 }));
            // tag border
            pdf.setDrawColor(cr, cg, cb);
            pdf.setLineWidth(0.4);
            pdf.roundedRect(tagX, tagY - 4.2, tw, 6, 1.5, 1.5, "D");
            // tag text
            pdf.setTextColor(cr, cg, cb);
            pdf.text(label, tagX + 3.5, tagY);
            tagX += tw + 3;
        });

        // ── Chart title ───────────────────────────────────────
        pdf.setFontSize(17);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(30, 58, 138);   // #1e3a8a
        pdf.text(def.title, 10, 28);

        // ── Date stamp (top-right) ────────────────────────────
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(148, 163, 184);
        const stamp = `Generated: ${new Date().toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
        })}`;
        pdf.text(stamp, pageW - 10, 14, { align: "right" });

        // ── Category label (top-right below date) ─────────────
        pdf.setFontSize(8.5);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(cr, cg, cb);
        const catLabel = (def.category.charAt(0).toUpperCase() + def.category.slice(1)).toUpperCase();
        pdf.text(catLabel, pageW - 10, 22, { align: "right" });

        // ── Divider line ──────────────────────────────────────
        pdf.setDrawColor(224, 231, 255);
        pdf.setLineWidth(0.5);
        pdf.line(10, 36, pageW - 10, 36);

        // ── Chart image ───────────────────────────────────────
        const chartY = 40;
        const chartH = pageH - chartY - 18;   // 18 mm bottom margin for footer
        const chartW = pageW - 20;            // 10 mm each side
        pdf.addImage(imgData, "PNG", 10, chartY, chartW, chartH, undefined, "FAST");

        // ── Footer background ─────────────────────────────────
        pdf.setFillColor(248, 250, 255);
        pdf.rect(0, pageH - 14, pageW, 14, "F");

        // ── Footer top border ─────────────────────────────────
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.4);
        pdf.line(0, pageH - 14, pageW, pageH - 14);

        // ── Footer left: dashboard name ───────────────────────
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(59, 130, 246);
        pdf.text("Business Analytics Dashboard", 10, pageH - 5.5);

        // ── Footer center: chart title (truncated) ────────────
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100, 116, 139);
        const titleTrunc = def.title.length > 50 ? def.title.slice(0, 47) + "…" : def.title;
        pdf.text(titleTrunc, pageW / 2, pageH - 5.5, { align: "center" });

        // ── Footer right: page info ───────────────────────────
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(148, 163, 184);
        pdf.text("Page 1 of 1", pageW - 10, pageH - 5.5, { align: "right" });

        // ── Save as PDF with chart name ───────────────────────
        const pdfName = def.filename.replace(/\.png$/i, ".pdf");
        pdf.save(pdfName);
    };

    return createPortal(
        <div
            className={`ch-modal${closing ? " ch-modal--closing" : ""}`}
            onMouseDown={e => { if (e.target === e.currentTarget) animatedClose(); }}
        >
            <div className="ch-modal__content" style={{ backgroundColor: "#ffffff", background: "#ffffff" }}>
                <div className="ch-modal__accent" />

                <div className="ch-modal__hd" style={{ backgroundColor: "#ffffff" }}>
                    <div className="ch-modal__hd-left">
                        {def.tags.map(t => <span key={t} className={`ch-tag ch-tag--${def.category}`}>{t}</span>)}
                    </div>
                    <button className="ch-modal__close" onClick={animatedClose} aria-label="Close modal">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <h2 className="ch-modal__title" style={{ backgroundColor: "#ffffff" }}>{def.title}</h2>

                <div className="ch-modal__date-filter" style={{ padding: "0 20px 12px", backgroundColor: "#ffffff", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}></span>
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
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Close
                    </button>
                    <button className="ch-modal-btn ch-modal-btn--pri" onClick={handleDownload}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" />
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
    const [filters,   setFilters]   = useState({ category: "all", type: "all" });
    const [dateRange, setDateRange] = useState({ from: null, to: null });
    const [preview,   setPreview]   = useState(null);

    const visible = CHART_DEFS.filter(d =>
        (filters.category === "all" || d.category === filters.category) &&
        (filters.type     === "all" || d.type     === filters.type)
    );

    const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));
    const reset = () => { setFilters({ category: "all", type: "all" }); setDateRange({ from: null, to: null }); };
    const isFiltered = filters.category !== "all" || filters.type !== "all" || !!dateRange.from;

    return (
        <div className="ch-root">

            {/* ── Filter bar ── */}
            <div className="ch-filter-bar">
                <div className="ch-filter-bar__label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
                    </svg>
                    Filters
                </div>
                <div className="ch-filter-bar__sep" />
                <div className="ch-filter-bar__dropdowns">
                    <FilterDropdown label="Category"   icon="📂" options={CAT_META}    value={filters.category} onChange={v => setFilter("category", v)} />
                    <FilterDropdown label="Chart Type" icon="📊" options={TYPE_META}   value={filters.type}     onChange={v => setFilter("type", v)} />
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

            {/* ── Charts grid ── */}
            {visible.length > 0 ? (
                <div className="ch-grid">
                    {visible.map((def, idx) => (
                        <ChartCard key={def.id} def={def} idx={idx} onPreview={setPreview} />
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

            {/* ── Preview modal ── */}
            {preview && <PreviewModal def={preview} onClose={() => setPreview(null)} />}
        </div>
    );
}