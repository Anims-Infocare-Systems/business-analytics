import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { resolveApiBase } from "../../apiBase";
import "./PurchaseAnalysis.css";
import PurchaseAnalysisDatePicker from "./PurchaseAnalysisDatePicker";
import { 
    ShoppingCart, 
    Factory, 
    CheckCircle2, 
    Clock, 
    Package, 
    Settings, 
    TrendingUp, 
    FolderOpen, 
    Workflow, 
    Trophy, 
    ClipboardList, 
    AlertTriangle, 
    Pin, 
    RefreshCw, 
    AlertCircle
} from "lucide-react";

Chart.register(...registerables);

const API_BASE = resolveApiBase();

// ─────────────────────────────────────────────
//  Static Data
// ─────────────────────────────────────────────
const KPI_CARDS = [
    { icon: "🛒", label: "Total PO Value", value: "₹24.99L", raw: 2499, sub: "Jan – Feb 2026", trend: "↑ 8.3% vs last period", cls: "pa2-trend-up" },
    { icon: "🏭", label: "Active Suppliers", value: "6", raw: 6, sub: "14 orders placed", trend: "4 Raw Material", cls: "pa2-trend-neutral" },
    { icon: "✅", label: "GRN Received", value: "₹19.2L", raw: 1920, sub: "76.8% of PO value", trend: "On track", cls: "pa2-trend-up" },
    { icon: "⏳", label: "GRN Done", value: "₹5.8L", raw: 580, sub: "3 POs awaiting receipt", trend: "2 overdue", cls: "pa2-trend-down" },
    { icon: "📦", label: "Avg Lead Time", value: "17 days", raw: 17, sub: "Across all suppliers", trend: "+2d vs target", cls: "pa2-trend-down" },
];

const SUPPLIER_RANKING = [
    { name: "Musk Metals Pvt Ltd", barW: 100, amount: "₹38.56L", pct: "42%", color: "#2d6de8" },
    { name: "Ammarun Foundries", barW: 72, amount: "₹27.80L", pct: "30%", color: "#10b981" },
    { name: "Ansari CNC Centre", barW: 48, amount: "₹18.30L", pct: "20%", color: "#f5a623" },
    { name: "Aquasub Engineering", barW: 11, amount: "₹3.91L", pct: "4%", color: "#ef4444" },
    { name: "Sri Vinayaga Enterprises", barW: 5, amount: "₹1.60L", pct: "2%", color: "#8b5cf6" },
    { name: "Vishal DTP", barW: 3, amount: "₹0.93L", pct: "1%", color: "#94a3b8" },
];

const PO_ROWS = [
    { po: "P251568", date: "01/01/2026", supBg: "#64748b", supInit: "VD", supName: "Vishal DTP", partNo: "GNC0013", desc: "Letter Pad", ordQty: "5", rcvQty: "5", rate: "415.00", amount: "2,075.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251568", date: "01/01/2026", supBg: "#64748b", supInit: "VD", supName: "Vishal DTP", partNo: "PDC0012", desc: "Record Note – WIP Tag", ordQty: "3,000", rcvQty: "3,000", rate: "0.65", amount: "1,950.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251568", date: "01/01/2026", supBg: "#64748b", supInit: "VD", supName: "Vishal DTP", partNo: "PDC0015", desc: "Record Note – Final Inspection Tag", ordQty: "2,000", rcvQty: "2,000", rate: "0.65", amount: "1,300.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251569", date: "01/01/2026", supBg: "#8b5cf6", supInit: "SV", supName: "Sri Vinayaga", partNo: "PKM0012", desc: 'VCI Cover 8"×8"', ordQty: "100", rcvQty: "100", rate: "320.00", amount: "32,000.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251569", date: "01/01/2026", supBg: "#8b5cf6", supInit: "SV", supName: "Sri Vinayaga", partNo: "PKM0013", desc: 'VCI Cover 10"×12"', ordQty: "25", rcvQty: "25", rate: "320.00", amount: "8,000.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251570", date: "01/01/2026", supBg: "#2d6de8", supInit: "MM", supName: "Musk Metals", partNo: "RRD03-05050-00", desc: "Round Rod DIA 50MM AISI410", ordQty: "390", rcvQty: "390", rate: "92.00", amount: "5,52,946.68", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251570", date: "01/01/2026", supBg: "#2d6de8", supInit: "MM", supName: "Musk Metals", partNo: "RRD03-06060-00", desc: "Round Rod DIA 60MM AISI410", ordQty: "366", rcvQty: "366", rate: "92.00", amount: "7,47,518.40", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251570", date: "01/01/2026", supBg: "#2d6de8", supInit: "MM", supName: "Musk Metals", partNo: "RRD03-06565-00", desc: "Round Rod DIA 65MM AISI410", ordQty: "325", rcvQty: "0", rate: "92.00", amount: "7,79,406.29", status: "Overdue", tagCls: "pa2-tag-overdue", overdueRcv: true },
    { po: "P251570", date: "01/01/2026", supBg: "#2d6de8", supInit: "MM", supName: "Musk Metals", partNo: "RRD03-04545-00", desc: "Round Rod DIA 45MM AISI410", ordQty: "79", rcvQty: "79", rate: "92.00", amount: "92,667.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251570", date: "01/01/2026", supBg: "#2d6de8", supInit: "MM", supName: "Musk Metals", partNo: "RRD03-07070-00", desc: "Round Rod DIA 70MM AISI410", ordQty: "240", rcvQty: "240", rate: "92.00", amount: "6,80,792.64", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251571", date: "01/01/2026", supBg: "#f97316", supInit: "AQ", supName: "Aquasub Engg", partNo: "PDC0017", desc: "Paint-Seal Red Oxide Primer", ordQty: "40", rcvQty: "40", rate: "189.00", amount: "7,560.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251571", date: "01/01/2026", supBg: "#f97316", supInit: "AQ", supName: "Aquasub Engg", partNo: "PDC0018", desc: "Thinner GP 015 (RAS)", ordQty: "30", rcvQty: "30", rate: "145.00", amount: "4,350.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251572", date: "01/01/2026", supBg: "#ef4444", supInit: "AC", supName: "Ansari CNC", partNo: "PDCT0165", desc: "Insert CCMT 09T304 HM WT6430 Carbide", ordQty: "100", rcvQty: "100", rate: "110.00", amount: "11,000.00", status: "Closed", tagCls: "pa2-tag-closed" },
];

const GRN_ROWS = [
    { dotColor: "#ef4444", name: "Round Rod DIA 65MM AISI410", code: "P251570 · RRD03-06565-00 · Musk Metals Pvt Ltd", daysCls: "pa2-days-over", daysLbl: "+7 days", qty: "325 Nos" },
    { dotColor: "#f5a623", name: "Bottom Bearing Housing BEH04×1", code: "P251574 · Ammarun Foundries · Balance Lot", daysCls: "pa2-days-warn", daysLbl: "+3 days", qty: "1,200 Nos" },
    { dotColor: "#10b981", name: "Record Note – WIP Tag", code: "P251568 · Vishal DTP · PDC0012", daysCls: "pa2-days-ok", daysLbl: "On Time", qty: "3,000 Nos" },
    { dotColor: "#10b981", name: "Paint-Seal Red Oxide Primer", code: "P251571 · Aquasub Engineering · PDC0017", daysCls: "pa2-days-ok", daysLbl: "Received", qty: "40 Ltrs" },
    { dotColor: "#10b981", name: "Insert CCMT 09T304 Carbide", code: "P251572 · Ansari CNC Centre · PDCT0165", daysCls: "pa2-days-ok", daysLbl: "Received", qty: "100 Nos" },
];

const ALERTS = [
    { icon: "🔴", title: "Round Rod DIA 65MM — 325 Nos undelivered", sub: "P251570 · Musk Metals · Production impact risk", time: "7d overdue", urgency: "high" },
    { icon: "🟠", title: "Bottom Bearing GRN balance pending", sub: "P251574 · Ammarun Foundries · ₹8.2L balance to receive", time: "3d open", urgency: "medium" },
    { icon: "🟡", title: 'VCI Cover 8"×8" — DC not confirmed in system', sub: "P251569 · Sri Vinayaga Enterprises · DC update pending", time: "Today", urgency: "low" },
    { icon: "🔵", title: "Musk Metals rate variance — approval needed", sub: "₹92/kg vs last PO ₹88/kg (+4.5%) — review and approve", time: "Auto-flag", urgency: "info" },
];

const TREND_DATA = {
    labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"],
    datasets: [
        {
            label: "PO Value (₹ L)",
            data: [2.1, 3.5, 5.8, 7.2, 6.4, 4.1, 3.0, 2.8],
            backgroundColor: "rgba(45,109,232,0.18)",
            borderColor: "#2d6de8",
            borderWidth: 2,
            borderRadius: 6,
            type: "bar",
        },
        {
            label: "GRN Received (₹ L)",
            data: [1.8, 3.0, 5.2, 6.5, 5.8, 3.6, 2.5, 0.8],
            borderColor: "#10b981",
            backgroundColor: "rgba(16,185,129,0.08)",
            borderWidth: 2.5,
            tension: 0.45,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: "#10b981",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            type: "line",
        },
    ],
};

const SUPPLIER_DONUT = {
    labels: ["Musk Metals", "Ammarun Foundries", "Ansari CNC", "Aquasub Engg", "Sri Vinayaga", "Vishal DTP"],
    datasets: [{ data: [42, 30, 20, 4, 2, 1], backgroundColor: ["#2d6de8", "#10b981", "#f5a623", "#ef4444", "#8b5cf6", "#94a3b8"], borderColor: "#fff", borderWidth: 2.5 }],
};

const CATEGORY_DONUT = {
    labels: ["Raw Material", "Castings", "Tooling/Inserts", "Packing", "Consumables"],
    datasets: [{ data: [42, 30, 20, 5, 3], backgroundColor: ["#1a54d4", "#2d6de8", "#f5a623", "#8b5cf6", "#94a3b8"], borderColor: "#fff", borderWidth: 2.5 }],
};

// ─────────────────────────────────────────────
//  Sub-Components
// ─────────────────────────────────────────────
function StatPill({ value, label, color }) {
    return (
        <div className="pa2-stat-pill" style={{ "--pill-color": color }}>
            <span className="pa2-stat-val">{value}</span>
            <span className="pa2-stat-lbl">{label}</span>
        </div>
    );
}

function SectionHeader({ icon, title, badge, badgeCls }) {
    return (
        <div className="pa2-section-head">
            <span className="pa2-section-icon" style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
            <span className="pa2-section-title">{title}</span>
            {badge && <span className={`pa2-badge ${badgeCls || ""}`}>{badge}</span>}
        </div>
    );
}

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────
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

export default function PurchaseAnalysis() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const toIso = d => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    const _dflt = { from: startOfMonth, to: endOfMonth };
    const _saved = readFilterSession("ba_filter_purchase", _dflt);
    const [dateRange, setDateRange] = useState({ from: _saved.from, to: _saved.to });
    const [filters, setFilters] = useState({
        fromDate: toIso(startOfMonth), toDate: toIso(endOfMonth),
        poType: "All Types", supplier: "All Suppliers",
        department: "Production", status: "All Status",
    });
    const [animated, setAnimated]       = useState(false);
    const [poTypes, setPoTypes]          = useState(["All Types"]);
    const [poRows, setPoRows]            = useState([]);
    const [poSummary, setPoSummary]      = useState(null);
    const [poLoading, setPoLoading]      = useState(false);
    const [weeklyTrend, setWeeklyTrend]  = useState(null);
    const [summaryData, setSummaryData]  = useState(null);
    const [supplierRatingData, setSupplierRatingData] = useState(null);
    const [supplierRatingLoading, setSupplierRatingLoading] = useState(false);

    // Modern Individual Panel Loading States
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [trendLoading, setTrendLoading] = useState(false);
    const [chartsLoading, setChartsLoading] = useState(false);

    const trendRef = useRef(null);
    const supRef = useRef(null);
    const catRef = useRef(null);
    const ratingRef = useRef(null);
    const trendChart = useRef(null);
    const supChart = useRef(null);
    const catChart = useRef(null);
    const ratingChart = useRef(null);

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 80);
        return () => clearTimeout(t);
    }, []);

    // ✅ Persist date range to sessionStorage on every change
    useEffect(() => {
        writeFilterSession("ba_filter_purchase", { from: dateRange.from, to: dateRange.to });
    }, [dateRange.from, dateRange.to]);

    // ── Fetch live PO types from POMas ──────────────────────
    useEffect(() => {
        fetch(`${API_BASE}/purchase-analysis/po-types/`, { credentials: "include" })
            .then(r => r.json())
            .then(data => {
                if (data?.po_types?.length) setPoTypes(data.po_types);
            })
            .catch(() => { }); // keep hardcoded fallback on error
    }, []);

    // ── Fetch PO table rows + pipeline summary ─────────────────
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        const toIso = d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };
        const params = new URLSearchParams({
            from: toIso(dateRange.from),
            to: toIso(dateRange.to),
        });
        if (filters.poType && filters.poType !== "All Types") {
            params.set("dtype", filters.poType);
        }
        const ctrl = new AbortController();
        setPoLoading(true);
        fetch(`${API_BASE}/purchase-analysis/po-table/?${params}`, {
            credentials: "include",
            signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => {
                setPoRows(data?.rows ?? []);
                setPoSummary(data?.summary ?? null);
                setPoLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setPoLoading(false);
            });
        return () => ctrl.abort();
    }, [dateRange.from, dateRange.to, filters.poType]);

    // ── Fetch charts data (donuts + supplier ranking) ─────────────
    const [chartsData, setChartsData] = useState(null);
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        const toIso = d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };
        const params = new URLSearchParams({
            from: toIso(dateRange.from),
            to: toIso(dateRange.to),
        });
        if (filters.poType && filters.poType !== "All Types") {
            params.set("dtype", filters.poType);
        }
        const ctrl = new AbortController();
        setChartsLoading(true);
        fetch(`${API_BASE}/purchase-analysis/charts/?${params}`, {
            credentials: "include",
            signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => {
                if (!data.error) setChartsData(data);
                setChartsLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setChartsLoading(false);
            });
        return () => ctrl.abort();
    }, [dateRange.from, dateRange.to, filters.poType]);

    // ── Redraw donut charts (supplier + category) ─────────────────
    useEffect(() => {
        if (!supRef.current || !catRef.current) return;
        supChart.current?.destroy();
        catChart.current?.destroy();

        const donutOpts = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        font: { size: 8, family: "Poppins", weight: 500 },
                        padding: 5,
                        boxWidth: 8
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.raw}%`
                    }
                }
            },
            cutout: "64%",
        };

        const supLabels = chartsData?.supplier_labels ?? [];
        const supVals   = chartsData?.supplier_data   ?? [];
        const catLabels = chartsData?.category_labels ?? [];
        const catVals   = chartsData?.category_data   ?? [];

        const supColors = ["#2d6de8", "#10b981", "#f5a623", "#ef4444", "#8b5cf6", "#94a3b8", "#a855f7", "#ec4899"];
        const catColors = ["#1a54d4", "#2d6de8", "#f5a623", "#8b5cf6", "#94a3b8", "#10b981", "#ef4444", "#6366f1"];

        supChart.current = new Chart(supRef.current, {
            type: "doughnut",
            data: {
                labels: supLabels.length ? supLabels : ["No Data"],
                datasets: [{
                    data: supVals.length ? supVals : [100],
                    backgroundColor: supVals.length ? supColors.slice(0, supLabels.length) : ["#e2e8f0"],
                    borderColor: "#fff",
                    borderWidth: 2.5
                }]
            },
            options: donutOpts
        });

        catChart.current = new Chart(catRef.current, {
            type: "doughnut",
            data: {
                labels: catLabels.length ? catLabels : ["No Data"],
                datasets: [{
                    data: catVals.length ? catVals : [100],
                    backgroundColor: catVals.length ? catColors.slice(0, catLabels.length) : ["#e2e8f0"],
                    borderColor: "#fff",
                    borderWidth: 2.5
                }]
            },
            options: donutOpts
        });

        return () => {
            supChart.current?.destroy();
            catChart.current?.destroy();
        };
    }, [chartsData]);

    // ── Fetch weekly trend + redraw chart ─────────────────────────
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        const toIso = d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };
        const params = new URLSearchParams({ from: toIso(dateRange.from), to: toIso(dateRange.to) });
        if (filters.poType && filters.poType !== "All Types") params.set("dtype", filters.poType);
        const ctrl = new AbortController();
        setTrendLoading(true);
        fetch(`${API_BASE}/purchase-analysis/weekly-trend/?${params}`, {
            credentials: "include", signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => { 
                if (!data.error) setWeeklyTrend(data); 
                setTrendLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setTrendLoading(false);
            });
        return () => ctrl.abort();
    }, [dateRange.from, dateRange.to, filters.poType]);

    // ── Fetch summary metrics (KPI cards & strip) ────────────────
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        const toIso = d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };
        const params = new URLSearchParams({ from: toIso(dateRange.from), to: toIso(dateRange.to) });
        if (filters.poType && filters.poType !== "All Types") params.set("dtype", filters.poType);
        const ctrl = new AbortController();
        setSummaryLoading(true);
        fetch(`${API_BASE}/purchase-analysis/summary/?${params}`, {
            credentials: "include", signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => { 
                if (!data.error) setSummaryData(data); 
                setSummaryLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setSummaryLoading(false);
            });
        return () => ctrl.abort();
    }, [dateRange.from, dateRange.to, filters.poType]);

    // ── Fetch Supplier Rating ───────────────────
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        const toIso = d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };
        const params = new URLSearchParams({ from: toIso(dateRange.from), to: toIso(dateRange.to) });
        const ctrl = new AbortController();
        setSupplierRatingLoading(true);
        fetch(`${API_BASE}/purchase/supplier-rating/?${params}`, {
            credentials: "include", signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => {
                if (!data.error) setSupplierRatingData(data);
                setSupplierRatingLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setSupplierRatingLoading(false);
            });
        return () => ctrl.abort();
    }, [dateRange.from, dateRange.to]);

    // ── Redraw Supplier Rating chart whenever supplierRatingData changes ──
    useEffect(() => {
        if (!ratingRef.current) return;
        ratingChart.current?.destroy();
        const labels = supplierRatingData?.labels ?? [];
        const scores = supplierRatingData?.data   ?? [];

        const getRatingColor = (val) => val >= 90 ? "#10b981" : val >= 75 ? "#2d6de8" : val >= 60 ? "#f5a623" : "#ef4444";

        ratingChart.current = new Chart(ratingRef.current, {
            type: "bar",
            data: {
                labels: labels.length ? labels : ["No Data"],
                datasets: [{
                    label: "Supplier Score",
                    data: scores.length ? scores : [0],
                    backgroundColor: scores.length ? scores.map(v => getRatingColor(v)) : ["#cbd5e1"],
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y",
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` Score: ${ctx.parsed.x} / 100`
                        }
                    }
                },
                scales: {
                    x: {
                        min: 0,
                        max: 100,
                        grid: { color: "rgba(26,84,212,0.06)" },
                        ticks: { font: { size: 9, family: "Poppins" }, color: "#5a6a9a" }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 9, family: "Poppins", weight: 600 }, color: "#1a2a5e" }
                     }
                }
            }
        });
        return () => ratingChart.current?.destroy();
    }, [supplierRatingData]);

    // ── Redraw trend chart whenever weeklyTrend changes ─────────────
    useEffect(() => {
        if (!trendRef.current) return;
        trendChart.current?.destroy();
        const labels   = weeklyTrend?.labels     ?? [];
        const poVals   = weeklyTrend?.po_value    ?? [];
        const grnVals  = weeklyTrend?.grn_received ?? [];
        const fmtL = v => `₹${Number(v).toFixed(2)}L`;
        const maxVal = Math.max(0, ...poVals, ...grnVals);
        const yMax   = maxVal > 0 ? Math.ceil(maxVal * 1.15 * 10) / 10 : undefined;
        trendChart.current = new Chart(trendRef.current, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "PO Value (L)",
                        data: poVals,
                        backgroundColor: "rgba(45,109,232,0.22)",
                        borderColor: "#2d6de8",
                        borderWidth: 2,
                        borderRadius: 5,
                        type: "bar",
                        yAxisID: "y",
                    },
                    {
                        label: "GRN Received (L)",
                        data: grnVals,
                        borderColor: "#10b981",
                        backgroundColor: "rgba(16,185,129,0.10)",
                        borderWidth: 2.5,
                        tension: 0.42,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: "#10b981",
                        pointBorderColor: "#fff",
                        pointBorderWidth: 2,
                        type: "line",
                        yAxisID: "y",
                    },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: { labels: { font: { size: 11, weight: 600, family: "Poppins" }, boxWidth: 12, padding: 14 } },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.dataset.label}: ${fmtL(ctx.parsed.y ?? 0)}`,
                        },
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: yMax,
                        grid: { color: "rgba(26,84,212,0.07)" },
                        ticks: { font: { size: 10 }, color: "#5a6a9a", callback: v => `₹${v}L` },
                        border: { dash: [4, 4] },
                        title: { display: true, text: "Lakhs (₹)", font: { size: 9 }, color: "#94a3b8" },
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 }, color: "#5a6a9a" },
                    },
                },
            },
        });
        return () => trendChart.current?.destroy();
    }, [weeklyTrend]);

    const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));
    const resetFilters = () => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setDateRange({ from: startOfMonth, to: endOfMonth });
        setFilters({
            fromDate: toIso(startOfMonth), toDate: toIso(endOfMonth),
            poType: "All Types", supplier: "All Suppliers",
            department: "Production", status: "All Status"
        });
    };

    const isGlobalLoading = poLoading || supplierRatingLoading || summaryLoading || trendLoading || chartsLoading;

    const getKpiIcon = (label) => {
        switch (label) {
            case "Total PO Value":
                return <ShoppingCart size={20} style={{ color: "#2d6de8" }} />;
            case "Active Suppliers":
                return <Factory size={20} style={{ color: "#06b6d4" }} />;
            case "GRN Received":
                return <CheckCircle2 size={20} style={{ color: "#10b981" }} />;
            case "GRN Done":
                return <Clock size={20} style={{ color: "#f5a623" }} />;
            case "Avg Lead Time":
            default:
                return <Package size={20} style={{ color: "#ef4444" }} />;
        }
    };

    const renderAlertIcon = (urgency) => {
        switch (urgency) {
            case "high":
                return <AlertCircle size={16} style={{ color: "#ef4444" }} />;
            case "medium":
                return <AlertCircle size={16} style={{ color: "#f5a623" }} />;
            case "low":
                return <AlertCircle size={16} style={{ color: "#fbbf24" }} />;
            case "info":
            default:
                return <AlertCircle size={16} style={{ color: "#2d6de8" }} />;
        }
    };

    return (
        <div className={`pa2-root ${animated ? "pa2-root--visible" : ""}`}>
            {/* ── Global YouTube-Style Loading Top Bar ── */}
            <div className={`pa2-global-progress-bar ${isGlobalLoading ? "pa2-global-progress-bar--active" : ""}`} />

            {/* ── Page Hero ── */}
            <div className="pa2-page-hero">
                {/* Optional Hero Pills and Titles if needed */}
            </div>

            {/* ── Filters ── */}
            <div className={`pa2-card pa2-filter-card pa2-animate pa2-delay-1 ${isGlobalLoading ? "pa2-filter-card--loading" : ""}`}>
                <div className="pa2-filter-bar-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Settings className="pa2-pulse-loader" size={16} style={{ color: "#2d6de8" }} /> Report Filters
                </div>
                <div className="pa2-filter-grid">
                    <div className="pa2-filter-group" style={{ gridColumn: "span 2" }}>
                        <label className="pa2-filter-label">Date Range</label>
                        <PurchaseAnalysisDatePicker
                            from={dateRange.from}
                            to={dateRange.to}
                            onChange={({ from, to }) => setDateRange({ from, to })}
                        />
                    </div>
                    <div className="pa2-filter-group">
                        <label className="pa2-filter-label">PO Type</label>
                        <select className="pa2-filter-select" value={filters.poType} onChange={e => setF("poType", e.target.value)}>
                            {poTypes.map(o => <option key={o}>{o}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Summary Strip ── */}
            {summaryLoading ? (
                <div className="pa2-summary-strip-skeleton pa2-pulse-loader">
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <div className="pa2-strip-item" key={i} style={{ minWidth: "90px" }}>
                            <div className="pa2-skeleton pa2-shimmer pa2-skeleton-text" style={{ width: "60px", height: "8px" }} />
                            <div className="pa2-skeleton pa2-shimmer pa2-skeleton-text" style={{ width: "80px", height: "16px", marginTop: "5px" }} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="pa2-summary-strip pa2-animate pa2-delay-2">
                    {[
                        { label: "Period", val: summaryData ? summaryData.period : "—", cls: "" },
                        { label: "Total PO Value", val: summaryData ? `₹${summaryData.total_po_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—", cls: "pa2-blue" },
                        { label: "Total POs", val: summaryData ? String(summaryData.total_pos) : "—", cls: "pa2-blue" },
                        { label: "Active Suppliers", val: summaryData ? String(summaryData.active_suppliers) : "—", cls: "pa2-blue" },
                        { label: "GRN Compliance", val: summaryData ? `${summaryData.grn_compliance_pct.toFixed(1)}%` : "—", cls: "pa2-green" },
                        { label: "GRN Value", val: summaryData ? `₹${summaryData.grn_received.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—", cls: "pa2-orange" },
                        { label: "Overdue POs", val: poSummary ? String(poSummary.grn_pending) : "—", cls: "pa2-red" },
                    ].map((s, i) => (
                        <div className="pa2-strip-item" key={i}>
                            <div className="pa2-strip-label">{s.label}</div>
                            <div className={`pa2-strip-val ${s.cls}`}>{s.val}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── KPI Cards ── */}
            {summaryLoading ? (
                <div className="pa2-kpi-grid">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div className="pa2-kpi-card pa2-pulse-loader" key={i}>
                            <div className="pa2-kpi-top">
                                <span className="pa2-skeleton pa2-shimmer pa2-skeleton-circle" style={{ width: "24px", height: "24px" }} />
                                <span className="pa2-skeleton pa2-shimmer" style={{ width: "70px", height: "14px", borderRadius: "10px" }} />
                            </div>
                            <div className="pa2-skeleton pa2-shimmer pa2-skeleton-text" style={{ width: "65%", height: "22px", marginTop: "12px" }} />
                            <div className="pa2-skeleton pa2-shimmer pa2-skeleton-text" style={{ width: "45%", height: "10px", marginTop: "8px" }} />
                            <div className="pa2-skeleton pa2-shimmer pa2-skeleton-text" style={{ width: "75%", height: "8px", marginTop: "4px" }} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="pa2-kpi-grid">
                    {[
                        {
                            label: "Total PO Value",
                            value: summaryData ? `₹${summaryData.total_po_value_lakhs.toFixed(2)}L` : "—",
                            sub: summaryData ? summaryData.period : "—",
                            trend: "Total PO Spend",
                            cls: "pa2-trend-neutral"
                        },
                        {
                            label: "Active Suppliers",
                            value: summaryData ? String(summaryData.active_suppliers) : "—",
                            sub: summaryData ? `${summaryData.total_pos} orders placed` : "—",
                            trend: "Active Vendors",
                            cls: "pa2-trend-neutral"
                        },
                        {
                            label: "GRN Received",
                            value: summaryData ? `₹${summaryData.grn_received_lakhs.toFixed(2)}L` : "—",
                            sub: summaryData ? `${summaryData.grn_compliance_pct.toFixed(1)}% compliance` : "—",
                            trend: "On track",
                            cls: "pa2-trend-up"
                        },
                        {
                            label: "GRN Done",
                            value: poSummary ? `${poSummary.grn_done} POs` : "—",
                            sub: poSummary ? `${poSummary.grn_pending} open/pending` : "—",
                            trend: "Completed POs",
                            cls: "pa2-trend-neutral"
                        },
                        {
                            label: "Avg Lead Time",
                            value: summaryData ? `${summaryData.avg_lead_time_days} days` : "—",
                            sub: "Across all suppliers",
                            trend: "PO to GRN",
                            cls: "pa2-trend-neutral"
                        }
                    ].map((k, i) => (
                        <div className="pa2-kpi-card pa2-card-premium pa2-animate" style={{ animationDelay: `${0.1 + i * 0.07}s` }} key={i}>
                            <div className="pa2-kpi-top">
                                <span className="pa2-kpi-icon" style={{ display: "inline-flex", alignItems: "center" }}>{getKpiIcon(k.label)}</span>
                                <span className={`pa2-kpi-trend ${k.cls}`}>{k.trend}</span>
                            </div>
                            <div className="pa2-kpi-value">{k.value}</div>
                            <div className="pa2-kpi-label">{k.label}</div>
                            <div className="pa2-kpi-sub">{k.sub}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Charts Row ── */}
            <div className="pa2-charts-row pa2-animate pa2-delay-3">
                <div className="pa2-card pa2-chart-card pa2-chart-wide pa2-card-premium">
                    <SectionHeader
                        icon={<TrendingUp size={16} style={{ color: "#2d6de8" }} />}
                        title="Purchase Value Trend — Weekly"
                        badge={weeklyTrend?.period ?? (filters.poType !== "All Types" ? filters.poType : "")}
                        badgeCls="pa2-badge-blue"
                    />
                    {trendLoading ? (
                        <div className="pa2-skeleton-chart pa2-pulse-loader" style={{ height: "195px" }}>
                            <div style={{ display: "flex", gap: "10px", height: "140px", alignItems: "flex-end", padding: "0 10px" }}>
                                {[40, 70, 55, 85, 60, 95, 75, 90].map((h, idx) => (
                                    <div key={idx} className="pa2-skeleton-chart-bar pa2-shimmer" style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="pa2-chart-wrap"><canvas ref={trendRef} /></div>
                    )}
                </div>

                <div className="pa2-card pa2-chart-card pa2-card-premium">
                    <SectionHeader icon={<Factory size={16} style={{ color: "#2d6de8" }} />} title="Spend by Supplier" />
                    {chartsLoading ? (
                        <div className="pa2-skeleton-chart pa2-pulse-loader" style={{ justifyContent: "center", alignItems: "center", height: "250px" }}>
                            <div className="pa2-skeleton pa2-shimmer pa2-skeleton-circle" style={{ width: "110px", height: "110px", border: "10px solid #f1f5f9" }} />
                        </div>
                    ) : (
                        <div className="pa2-chart-wrap pa2-chart-wrap--donut"><canvas ref={supRef} /></div>
                    )}
                </div>

                <div className="pa2-card pa2-chart-card pa2-card-premium">
                    <SectionHeader icon={<FolderOpen size={16} style={{ color: "#2d6de8" }} />} title="Spend by Category" />
                    {chartsLoading ? (
                        <div className="pa2-skeleton-chart pa2-pulse-loader" style={{ justifyContent: "center", alignItems: "center", height: "250px" }}>
                            <div className="pa2-skeleton pa2-shimmer pa2-skeleton-circle" style={{ width: "110px", height: "110px", border: "10px solid #f1f5f9" }} />
                        </div>
                    ) : (
                        <div className="pa2-chart-wrap pa2-chart-wrap--donut"><canvas ref={catRef} /></div>
                    )}
                </div>
            </div>

            {/* ── Pipeline + Supplier Ranking ── */}
            <div className="pa2-two-col pa2-animate pa2-delay-3">

                {/* PO Pipeline */}
                <div className="pa2-card pa2-card-premium">
                    <SectionHeader icon={<Workflow size={16} style={{ color: "#2d6de8" }} />} title="Purchase Order Pipeline"
                        badge={filters.poType !== "All Types" ? filters.poType : "All Types"}
                        badgeCls="pa2-badge-blue" />
                    {poLoading ? (
                        <div className="pa2-pipeline-body pa2-pulse-loader">
                            <div className="pa2-pipe-steps">
                                {[1, 2, 3, 4].map(i => (
                                    <div className="pa2-pipe-step" key={i}>
                                        <div className="pa2-skeleton pa2-shimmer pa2-skeleton-circle" style={{ width: "42px", height: "42px" }} />
                                        <div className="pa2-skeleton pa2-shimmer pa2-skeleton-text" style={{ width: "45px", height: "10px", marginTop: "6px" }} />
                                        <div className="pa2-skeleton pa2-shimmer pa2-skeleton-text" style={{ width: "30px", height: "8px" }} />
                                    </div>
                                ))}
                            </div>
                            <div className="pa2-skeleton pa2-shimmer" style={{ height: "8px", borderRadius: "4px", width: "100%", marginTop: "12px" }} />
                        </div>
                    ) : (
                        <div className="pa2-pipeline-body">
                            {/* ── 4 metric boxes ── */}
                            <div className="pa2-pipe-steps">
                                {(() => {
                                    const fmtL = v => v != null ? `₹${(v / 1e5).toFixed(2)}L` : "—";
                                    const sm = poSummary;
                                    return [
                                        { n: sm ? String(sm.total_pos) : "—",   v: sm ? fmtL(sm.total_po_value)  : "—", l: "Total PO Value",  cls: "pa2-pipe-blue"   },
                                        { n: sm ? String(sm.grn_done)    : "—",   v: sm ? `${sm.grn_done} POs`    : "—", l: "GRN Done",       cls: "pa2-pipe-cyan"   },
                                        { n: sm ? String(sm.grn_pending) : "—",   v: sm ? `${sm.grn_pending} POs` : "—", l: "GRN Pending",    cls: "pa2-pipe-orange" },
                                        { n: "₹",                                   v: sm ? fmtL(sm.total_grn_value): "—", l: "Total GRN Value", cls: "pa2-pipe-green"  },
                                    ].map((s, i) => (
                                        <div className="pa2-pipe-step" key={i}>
                                            <div className={`pa2-pipe-circle ${s.cls}`}>{s.n}</div>
                                            <div className="pa2-pipe-val">{s.v}</div>
                                            <div className="pa2-pipe-lbl">{s.l}</div>
                                            {i < 3 && <div className="pa2-pipe-arrow">›</div>}
                                        </div>
                                    ));
                                })()}
                            </div>

                            {/* ── Progress bar: GRN done vs pending ── */}
                            {(() => {
                                const total = poSummary?.total_pos || 0;
                                const donePct  = total ? Math.round((poSummary.grn_done    / total) * 100) : 0;
                                const pendPct  = total ? Math.round((poSummary.grn_pending / total) * 100) : 0;
                                return (
                                    <div className="pa2-progress-bar-wrap">
                                        <div className="pa2-progress-track">
                                            <div className="pa2-progress-fill pa2-fill-blue"   style={{ width: `${donePct}%` }} />
                                            <div className="pa2-progress-fill pa2-fill-orange" style={{ width: `${pendPct}%` }} />
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── Legend ── */}
                            <div className="pa2-pipe-legend">
                                {[
                                    ["#2d6de8", `GRN Done ${poSummary ? `${Math.round((poSummary.grn_done / (poSummary.total_pos || 1)) * 100)}%` : ""}`],
                                    ["#f5a623", `GRN Pending ${poSummary ? `${Math.round((poSummary.grn_pending / (poSummary.total_pos || 1)) * 100)}%` : ""}`],
                                ].map(([c, l]) => (
                                    <div className="pa2-leg-item" key={l}>
                                        <span className="pa2-leg-dot" style={{ background: c }} />{l}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Supplier Spend Ranking */}
                <div className="pa2-card pa2-card-premium">
                    <SectionHeader icon={<Trophy size={16} style={{ color: "#f5a623" }} />} title="Supplier Spend Ranking" badge="by PO value" badgeCls="pa2-badge-neutral" />
                    {chartsLoading ? (
                        <div className="pa2-sup-list pa2-pulse-loader" style={{ padding: "1rem" }}>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div className="pa2-skeleton-row" key={i} style={{ marginBottom: "12.5px" }}>
                                    <div className="pa2-skeleton pa2-shimmer" style={{ width: "20px", height: "13px" }} />
                                    <div className="pa2-skeleton pa2-shimmer" style={{ flex: 1, height: "13px" }} />
                                    <div className="pa2-skeleton pa2-shimmer" style={{ width: "70px", height: "6px", borderRadius: "3px" }} />
                                    <div className="pa2-skeleton pa2-shimmer" style={{ width: "45px", height: "13px" }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="pa2-sup-list">
                            {(() => {
                                const rankColors = ["#2d6de8", "#10b981", "#f5a623", "#ef4444", "#8b5cf6", "#94a3b8", "#a855f7", "#ec4899"];
                                const ranking = chartsData?.supplier_ranking ?? [];
                                if (!ranking.length) {
                                    return <div className="pa2-po-empty">— No spend records —</div>;
                                }
                                const maxPct = Math.max(...ranking.map(x => x.pct), 1);
                                return ranking.map((s, i) => {
                                    const barColor = rankColors[i % rankColors.length];
                                    const barW = (s.pct / maxPct) * 100;
                                    return (
                                        <div className="pa2-sup-row" key={i}>
                                            <div className="pa2-sup-rank">#{s.rank}</div>
                                            <div className="pa2-sup-name">{s.name}</div>
                                            <div className="pa2-sup-bar-track">
                                                <div
                                                    className="pa2-sup-bar-fill"
                                                    style={{ width: `${barW}%`, background: barColor }}
                                                />
                                            </div>
                                            <div className="pa2-sup-amount">₹{s.spend_lakhs.toFixed(2)}L</div>
                                            <div className="pa2-sup-pct" style={{ color: barColor }}>{s.pct}%</div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* ── PO Details Table (Dashboard2-style) ── */}
            <div className="pa2-card pa2-animate pa2-delay-4 pa2-card-premium">
                <div className="pa2-table-header">
                    <SectionHeader icon={<ClipboardList size={16} style={{ color: "#2d6de8" }} />} title="Purchase Order Details" />
                    <div className="pa2-tag-row">
                        <span className="pa2-badge pa2-badge-blue">{poLoading ? "Loading…" : `${poRows.length} records`}</span>
                    </div>
                </div>
                <div className="pa2-table-scroll">
                    <table className="pa2-po-tbl">
                        <thead>
                            <tr>
                                <th className="pa2-po-th">PO NUMBER</th>
                                <th className="pa2-po-th">PO TYPE</th>
                                <th className="pa2-po-th">VENDOR / SUPPLIER</th>
                                <th className="pa2-po-th pa2-po-th--wide">MATERIAL</th>
                                <th className="pa2-po-th pa2-po-th--r">QTY</th>
                                <th className="pa2-po-th pa2-po-th--r">VALUE</th>
                                <th className="pa2-po-th">PO DATE</th>
                                <th className="pa2-po-th">GRN NO</th>
                                <th className="pa2-po-th">GRN DATE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {poLoading && (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="pa2-po-tr pa2-pulse-loader">
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "65px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "80px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "120px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "180px", height: "13px" }} /></td>
                                        <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "40px", height: "13px" }} /></td>
                                        <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "60px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "75px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "70px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "75px", height: "13px" }} /></td>
                                    </tr>
                                ))
                            )}
                            {!poLoading && poRows.length === 0 && (
                                <tr><td colSpan={9} className="pa2-po-empty">— No records found —</td></tr>
                            )}
                            {!poLoading && poRows.map((r, i) => (
                                <tr key={i} className="pa2-po-tr">
                                    <td className="pa2-po-td pa2-po-link">{r.po_number}</td>
                                    <td className="pa2-po-td">
                                        {r.po_type
                                            ? <span className="pa2-po-type-badge">{r.po_type}</span>
                                            : <span className="pa2-po-dash">–</span>}
                                    </td>
                                    <td className="pa2-po-td pa2-po-vendor">{r.vendor_name || "–"}</td>
                                    <td className="pa2-po-td pa2-po-material">
                                        {r.material_code
                                            ? <><span className="pa2-po-matcode">{r.material_code}</span>{" – "}{r.material.replace(/^[^-]+-\s*/, "")}</>
                                            : r.material || "–"}
                                    </td>
                                    <td className="pa2-po-td pa2-po-td--r">{r.po_qty || "–"}</td>
                                    <td className="pa2-po-td pa2-po-td--r pa2-po-value">
                                        ₹{r.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="pa2-po-td pa2-po-date">
                                        {r.po_date ? r.po_date.split("-").reverse().join(" ").replace(/^(\d+) (\d+) /, (_, d, m) => `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} `) : "–"}
                                    </td>
                                    <td className="pa2-po-td">
                                        {r.grn_no
                                            ? <span className="pa2-po-grn-link">{r.grn_no}</span>
                                            : <span className="pa2-po-dash">–</span>}
                                    </td>
                                    <td className="pa2-po-td pa2-po-date">
                                        {r.grn_date ? r.grn_date.split("-").reverse().join(" ").replace(/^(\d+) (\d+) /, (_, d, m) => `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} `) : <span className="pa2-po-dash">–</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── GRN Aging + Alerts ── */}
            <div className="pa2-two-col pa2-animate pa2-delay-4">

                {/* Supplier Rating */}
                <div className="pa2-card pa2-card-premium">
                    <SectionHeader
                        icon={<Trophy size={16} style={{ color: "#f5a623" }} />}
                        title="Supplier Rating Analysis"
                        badge={supplierRatingData ? "Live Scores" : "Rating"}
                        badgeCls="pa2-badge-blue"
                    />
                    {supplierRatingLoading ? (
                        <div className="pa2-skeleton-chart pa2-pulse-loader" style={{ height: "250px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <div style={{ width: "90%", display: "flex", flexDirection: "column", gap: "14px", padding: "20px" }}>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                                        <div className="pa2-skeleton pa2-shimmer" style={{ width: "80px", height: "12px" }} />
                                        <div className="pa2-skeleton pa2-shimmer" style={{ flex: 1, height: "14px", borderRadius: "4px" }} />
                                        <div className="pa2-skeleton pa2-shimmer" style={{ width: "30px", height: "12px" }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="pa2-chart-wrap" style={{ height: "250px", padding: "12px" }}>
                            <canvas ref={ratingRef} />
                        </div>
                    )}
                </div>

                {/* Alerts */}
                <div className="pa2-card pa2-card-premium">
                    <SectionHeader icon={<AlertTriangle size={16} style={{ color: "#ef4444" }} />} title="Management Alerts" badge="4 Action Needed" badgeCls="pa2-badge-red" />
                    <div className="pa2-alert-list">
                        {ALERTS.map((a, i) => (
                            <div className={`pa2-alert-row pa2-alert-${a.urgency}`} key={i}>
                                <span className="pa2-alert-icon" style={{ display: "inline-flex", alignItems: "center" }}>{renderAlertIcon(a.urgency)}</span>
                                <div className="pa2-alert-body">
                                    <div className="pa2-alert-title">{a.title}</div>
                                    <div className="pa2-alert-sub">{a.sub}</div>
                                </div>
                                <span className="pa2-alert-time">{a.time}</span>
                            </div>
                        ))}
                    </div>
                    <div className="pa2-priority-box">
                        <div className="pa2-priority-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Pin size={14} style={{ color: "#2d6de8", transform: "rotate(45deg)" }} /> Key Management Action
                        </div>
                        <p className="pa2-priority-body">
                            Follow up with <strong>Musk Metals</strong> for DIA 65MM pending lot (325 Nos).
                            Production scheduling depends on receipt by <strong>05-Mar-2026</strong>.
                            Also review rate increase ₹88→₹92/kg for formal approval.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}