import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import "./PurchaseAnalysis.css";
import PurchaseAnalysisDatePicker from "./PurchaseAnalysisDatePicker";

Chart.register(...registerables);

// ─────────────────────────────────────────────
//  Static Data
// ─────────────────────────────────────────────
const KPI_CARDS = [
    { icon: "🛒", label: "Total PO Value", value: "₹24.99L", raw: 2499, sub: "Jan – Feb 2026", trend: "↑ 8.3% vs last period", cls: "pa2-trend-up" },
    { icon: "🏭", label: "Active Suppliers", value: "6", raw: 6, sub: "14 orders placed", trend: "4 Raw Material", cls: "pa2-trend-neutral" },
    { icon: "✅", label: "GRN Received", value: "₹19.2L", raw: 1920, sub: "76.8% of PO value", trend: "On track", cls: "pa2-trend-up" },
    { icon: "⏳", label: "GRN Pending", value: "₹5.8L", raw: 580, sub: "3 POs awaiting receipt", trend: "2 overdue", cls: "pa2-trend-down" },
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
            <span className="pa2-section-icon">{icon}</span>
            <span className="pa2-section-title">{title}</span>
            {badge && <span className={`pa2-badge ${badgeCls || ""}`}>{badge}</span>}
        </div>
    );
}

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────
export default function PurchaseAnalysis() {
    const [dateRange, setDateRange] = useState({
        from: new Date(2026, 0, 1),
        to:   new Date(2026, 1, 28),
    });
    const [filters, setFilters] = useState({
        fromDate: "2026-01-01", toDate: "2026-02-28",
        poType: "Raw Material", supplier: "All Suppliers",
        department: "Production", status: "All Status",
    });
    const [animated, setAnimated] = useState(false);

    const trendRef = useRef(null);
    const supRef = useRef(null);
    const catRef = useRef(null);
    const trendChart = useRef(null);
    const supChart = useRef(null);
    const catChart = useRef(null);

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 80);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const mk = (ref, holder, type, data, opts) => {
            holder.current?.destroy();
            if (ref.current) holder.current = new Chart(ref.current, { type, data, options: opts });
        };
        mk(trendRef, trendChart, "bar", TREND_DATA, {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { font: { size: 11, weight: 600, family: "Poppins" }, boxWidth: 12, padding: 14 } } },
            scales: {
                y: { beginAtZero: true, grid: { color: "rgba(26,84,212,0.07)" }, ticks: { font: { size: 10 }, color: "#5a6a9a" }, border: { dash: [4, 4] } },
                x: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#5a6a9a" } },
            },
        });
        const donutOpts = {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: "bottom", labels: { font: { size: 10, family: "Poppins" }, padding: 10, boxWidth: 10 } } },
            cutout: "64%",
        };
        mk(supRef, supChart, "doughnut", SUPPLIER_DONUT, donutOpts);
        mk(catRef, catChart, "doughnut", CATEGORY_DONUT, donutOpts);
        return () => { trendChart.current?.destroy(); supChart.current?.destroy(); catChart.current?.destroy(); };
    }, []);

    const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));
    const resetFilters = () => {
        setDateRange({ from: new Date(2026, 0, 1), to: new Date(2026, 1, 28) });
        setFilters({ fromDate: "2026-01-01", toDate: "2026-02-28", poType: "Raw Material", supplier: "All Suppliers", department: "Production", status: "All Status" });
    };

    return (
        <div className={`pa2-root ${animated ? "pa2-root--visible" : ""}`}>

            {/* ── Page Title ── */}
            <div className="pa2-page-hero">
                {/* <div className="pa2-page-hero-left">
                    <div className="pa2-page-hero-icon">🛒</div>
                    <div>
                        <h2 className="pa2-page-title">Purchase Analysis Report</h2>
                        <p className="pa2-page-sub">Jan – Feb 2026 · Production Department</p>
                    </div>
                </div> */}
                {/* <div className="pa2-hero-pills">
                    <StatPill value="₹24.99L" label="Total PO" color="#2d6de8" />
                    <StatPill value="76.8%" label="GRN Rate" color="#10b981" />
                    <StatPill value="2" label="Overdue" color="#ef4444" />
                </div> */}
            </div>

            {/* ── Filters ── */}
            <div className="pa2-card pa2-filter-card pa2-animate pa2-delay-1">
                <div className="pa2-filter-bar-title">
                    <span className="pa2-filter-bar-icon">⚙️</span> Report Filters
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
                            {["All Types", "Raw Material", "Consumables", "Tooling"].map(o => <option key={o}>{o}</option>)}
                        </select>
                    </div>
                    {/* <div className="pa2-filter-group">
                        <label className="pa2-filter-label">Supplier</label>
                        <select className="pa2-filter-select" value={filters.supplier} onChange={e => setF("supplier", e.target.value)}>
                            {["All Suppliers", "Musk Metals Pvt Ltd", "Ammarun Foundries", "Ansari CNC Centre", "Aquasub Engineering"].map(o => <option key={o}>{o}</option>)}
                        </select>
                    </div> */}
                    {/* <div className="pa2-filter-group">
                        <label className="pa2-filter-label">Department</label>
                        <select className="pa2-filter-select" value={filters.department} onChange={e => setF("department", e.target.value)}>
                            {["All", "Production", "Quality", "Stores"].map(o => <option key={o}>{o}</option>)}
                        </select>
                    </div> */}
                    {/* <div className="pa2-filter-group">
                        <label className="pa2-filter-label">Status</label>
                        <select className="pa2-filter-select" value={filters.status} onChange={e => setF("status", e.target.value)}>
                            {["All Status", "Open", "Partial", "Closed"].map(o => <option key={o}>{o}</option>)}
                        </select>
                    </div> */}
                </div>
            </div>

            {/* ── Summary Strip ── */}
            <div className="pa2-summary-strip pa2-animate pa2-delay-2">
                {[
                    { label: "Period", val: "Jan – Feb 2026", cls: "" },
                    { label: "Total PO Value", val: "₹24,99,555", cls: "pa2-blue" },
                    { label: "Total POs", val: "14", cls: "pa2-blue" },
                    { label: "Active Suppliers", val: "6", cls: "pa2-blue" },
                    { label: "GRN Compliance", val: "76.8%", cls: "pa2-green" },
                    { label: "Pending Value", val: "₹5,80,000", cls: "pa2-orange" },
                    { label: "Overdue POs", val: "2", cls: "pa2-red" },
                ].map((s, i) => (
                    <div className="pa2-strip-item" key={i}>
                        <div className="pa2-strip-label">{s.label}</div>
                        <div className={`pa2-strip-val ${s.cls}`}>{s.val}</div>
                    </div>
                ))}
            </div>

            {/* ── KPI Cards ── */}
            <div className="pa2-kpi-grid">
                {KPI_CARDS.map((k, i) => (
                    <div className="pa2-kpi-card pa2-animate" style={{ animationDelay: `${0.1 + i * 0.07}s` }} key={i}>
                        <div className="pa2-kpi-top">
                            <span className="pa2-kpi-icon">{k.icon}</span>
                            <span className={`pa2-kpi-trend ${k.cls}`}>{k.trend}</span>
                        </div>
                        <div className="pa2-kpi-value">{k.value}</div>
                        <div className="pa2-kpi-label">{k.label}</div>
                        <div className="pa2-kpi-sub">{k.sub}</div>
                    </div>
                ))}
            </div>

            {/* ── Charts Row ── */}
            <div className="pa2-charts-row pa2-animate pa2-delay-3">
                <div className="pa2-card pa2-chart-card pa2-chart-wide">
                    <SectionHeader icon="📈" title="Purchase Value Trend — Weekly" />
                    <div className="pa2-chart-wrap"><canvas ref={trendRef} /></div>
                </div>
                <div className="pa2-card pa2-chart-card">
                    <SectionHeader icon="🏭" title="Spend by Supplier" />
                    <div className="pa2-chart-wrap"><canvas ref={supRef} /></div>
                </div>
                <div className="pa2-card pa2-chart-card">
                    <SectionHeader icon="📂" title="Spend by Category" />
                    <div className="pa2-chart-wrap"><canvas ref={catRef} /></div>
                </div>
            </div>

            {/* ── Pipeline + Supplier Ranking ── */}
            <div className="pa2-two-col pa2-animate pa2-delay-3">

                {/* PO Pipeline */}
                <div className="pa2-card">
                    <SectionHeader icon="🔄" title="Purchase Order Pipeline" badge="Jan–Feb 2026" badgeCls="pa2-badge-blue" />
                    <div className="pa2-pipeline-body">
                        <div className="pa2-pipe-steps">
                            {[
                                { n: "14", v: "₹24.99L", l: "POs Raised", cls: "pa2-pipe-blue" },
                                { n: "9", v: "₹19.2L", l: "GRN Closed", cls: "pa2-pipe-cyan" },
                                { n: "3", v: "₹3.8L", l: "Partial GRN", cls: "pa2-pipe-green" },
                                { n: "2", v: "₹2.0L", l: "Pending", cls: "pa2-pipe-orange" },
                            ].map((s, i) => (
                                <div className="pa2-pipe-step" key={i}>
                                    <div className={`pa2-pipe-circle ${s.cls}`}>{s.n}</div>
                                    <div className="pa2-pipe-val">{s.v}</div>
                                    <div className="pa2-pipe-lbl">{s.l}</div>
                                    {i < 3 && <div className="pa2-pipe-arrow">›</div>}
                                </div>
                            ))}
                        </div>

                        <div className="pa2-progress-bar-wrap">
                            <div className="pa2-progress-track">
                                <div className="pa2-progress-fill pa2-fill-blue" style={{ width: "76.8%" }} />
                                <div className="pa2-progress-fill pa2-fill-green" style={{ width: "15.2%" }} />
                                <div className="pa2-progress-fill pa2-fill-orange" style={{ width: "8%" }} />
                            </div>
                        </div>

                        <div className="pa2-pipe-legend">
                            {[["#2d6de8", "Received 76.8%"], ["#10b981", "Partial 15.2%"], ["#f5a623", "Open 8%"]].map(([c, l]) => (
                                <div className="pa2-leg-item" key={l}>
                                    <span className="pa2-leg-dot" style={{ background: c }} />{l}
                                </div>
                            ))}
                        </div>

                        <div className="pa2-pending-section">
                            <div className="pa2-pending-label">Pending Items</div>
                            <div className="pa2-pending-row">
                                <span>Round Rod DIA 65MM — 325 Nos</span>
                                <span className="pa2-badge pa2-badge-red">Overdue</span>
                            </div>
                            <div className="pa2-pending-row">
                                <span>VCI Cover 8"×8" — DC not updated</span>
                                <span className="pa2-badge pa2-badge-blue">Open</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Supplier Ranking */}
                <div className="pa2-card">
                    <SectionHeader icon="🏆" title="Supplier Spend Ranking" badge="by PO value" badgeCls="pa2-badge-neutral" />
                    <div className="pa2-sup-list">
                        {SUPPLIER_RANKING.map((s, i) => (
                            <div className="pa2-sup-row" key={i}>
                                <div className="pa2-sup-rank">#{i + 1}</div>
                                <div className="pa2-sup-name">{s.name}</div>
                                <div className="pa2-sup-bar-track">
                                    <div
                                        className="pa2-sup-bar-fill"
                                        style={{ width: `${s.barW}%`, background: s.color }}
                                    />
                                </div>
                                <div className="pa2-sup-amount">{s.amount}</div>
                                <div className="pa2-sup-pct" style={{ color: s.color }}>{s.pct}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── PO Details Table ── */}
            <div className="pa2-card pa2-animate pa2-delay-4">
                <div className="pa2-table-header">
                    <SectionHeader icon="📋" title="Purchase Order Details" />
                    <div className="pa2-tag-row">
                        <span className="pa2-badge pa2-badge-green">✓ Closed: 9</span>
                        <span className="pa2-badge pa2-badge-yellow">⏳ Partial: 3</span>
                        <span className="pa2-badge pa2-badge-blue">◎ Open: 2</span>
                    </div>
                </div>
                <div className="pa2-table-scroll">
                    <table className="pa2-table">
                        <thead>
                            <tr>
                                {["PO No", "Date", "Supplier", "Part No", "Description", "Ord Qty", "Rcvd Qty", "Rate (₹)", "Amount (₹)", "Status"].map(h => (
                                    <th key={h} className={h.includes("Qty") || h.includes("₹") ? "pa2-th-r" : ""}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {PO_ROWS.map((r, i) => (
                                <tr key={i} className="pa2-tr">
                                    <td><span className="pa2-po-no">{r.po}</span></td>
                                    <td className="pa2-td-date">{r.date}</td>
                                    <td>
                                        <div className="pa2-sup-chip">
                                            <span className="pa2-sup-avatar" style={{ background: r.supBg }}>{r.supInit}</span>
                                            <span className="pa2-sup-chip-name">{r.supName}</span>
                                        </div>
                                    </td>
                                    <td className="pa2-td-mono">{r.partNo}</td>
                                    <td className="pa2-td-desc">{r.desc}</td>
                                    <td className="pa2-td-r">{r.ordQty}</td>
                                    <td className={`pa2-td-r ${r.overdueRcv ? "pa2-td-overdue" : ""}`}>{r.rcvQty}</td>
                                    <td className="pa2-td-r">{r.rate}</td>
                                    <td className="pa2-td-r pa2-td-bold">{r.amount}</td>
                                    <td><span className={`pa2-badge ${r.tagCls}`}>{r.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="pa2-action-bar">
                    {/* <button className="pa2-btn pa2-btn-primary" onClick={() => alert("Exporting to Excel...")}>📥 Export Excel</button> */}
                    {/* <button className="pa2-btn pa2-btn-primary" onClick={() => alert("Exporting to PDF...")}>📄 Export PDF</button> */}
                    {/* <button className="pa2-btn pa2-btn-ghost" onClick={() => window.print()}>🖨️ Print</button> */}
                </div>
            </div>

            {/* ── GRN Aging + Alerts ── */}
            <div className="pa2-two-col pa2-animate pa2-delay-4">

                {/* GRN Aging */}
                <div className="pa2-card">
                    <SectionHeader icon="📦" title="GRN Aging — Outstanding Receipts" badge="2 Overdue" badgeCls="pa2-badge-red" />
                    <div className="pa2-grn-list">
                        {GRN_ROWS.map((g, i) => (
                            <div className="pa2-grn-row" key={i}>
                                <span className="pa2-grn-dot" style={{ background: g.dotColor }} />
                                <div className="pa2-grn-info">
                                    <div className="pa2-grn-name">{g.name}</div>
                                    <div className="pa2-grn-code">{g.code}</div>
                                </div>
                                <span className={`pa2-days-badge ${g.daysCls}`}>{g.daysLbl}</span>
                                <span className="pa2-grn-qty">{g.qty}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Alerts */}
                <div className="pa2-card">
                    <SectionHeader icon="🚨" title="Management Alerts" badge="4 Action Needed" badgeCls="pa2-badge-red" />
                    <div className="pa2-alert-list">
                        {ALERTS.map((a, i) => (
                            <div className={`pa2-alert-row pa2-alert-${a.urgency}`} key={i}>
                                <span className="pa2-alert-icon">{a.icon}</span>
                                <div className="pa2-alert-body">
                                    <div className="pa2-alert-title">{a.title}</div>
                                    <div className="pa2-alert-sub">{a.sub}</div>
                                </div>
                                <span className="pa2-alert-time">{a.time}</span>
                            </div>
                        ))}
                    </div>
                    <div className="pa2-priority-box">
                        <div className="pa2-priority-title">📌 Key Management Action</div>
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