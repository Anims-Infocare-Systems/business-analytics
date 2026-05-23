import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import "./QualityAnalysis.css";
import QualityAnalysisDatePicker from "./QualityAnalysisDatePicker";

Chart.register(...registerables);

// ─────────────────────────────────────────────
//  Static Data
// ─────────────────────────────────────────────
const KPI_CARDS = [
    { icon: "🔬", label: "Total Inspections", value: "2,748", sub: "Jan–Feb 2026", trend: "24 inspection records", cls: "qa2-t-neutral" },
    { icon: "✅", label: "Pass Rate", value: "87.6%", sub: "2,409 units passed", trend: "↑ 2.1% vs last period", cls: "qa2-t-up" },
    { icon: "❌", label: "Rejection Rate", value: "7.5%", sub: "205 units rejected", trend: "↓ 1.2% vs last", cls: "qa2-t-up" },
    { icon: "🔧", label: "Rework Rate", value: "4.9%", sub: "134 units rework", trend: "↑ 0.8% vs last", cls: "qa2-t-down" },
    { icon: "⏳", label: "Insp. Waiting", value: "5", sub: "Pending review", trend: "Action needed", cls: "qa2-t-down" },
    { icon: "🗑️", label: "Scrap Loss", value: "₹48.2K", sub: "71 units scrapped", trend: "↑ ₹6K vs target", cls: "qa2-t-down" },
];

const PRODUCT_QUALITY = [
    { name: "Round Rod DIA 50–90MM", insp: "1,216", pass: "1,168", rej: "48", barW: 96, barColor: "#10b981", rateVal: "96.1%", rateColor: "#10b981" },
    { name: "Segment Carrier RM", insp: "410", pass: "370", rej: "40", barW: 90, barColor: "#f5a623", rateVal: "90.2%", rateColor: "#f5a623" },
    { name: "Insert CCMT 09T304", insp: "200", pass: "198", rej: "2", barW: 99, barColor: "#10b981", rateVal: "99.0%", rateColor: "#10b981" },
    { name: 'VCI Cover 8"×8" / 10"×12"', insp: "125", pass: "121", rej: "4", barW: 97, barColor: "#10b981", rateVal: "96.8%", rateColor: "#10b981" },
    { name: "Paint-Seal Cast Dipping", insp: "75", pass: "0", rej: "75", barW: 0, barColor: "#ef4444", rateVal: "0% ⚠", rateColor: "#ef4444" },
    { name: "Thinner GP 015 (RAS)", insp: "60", pass: "0", rej: "60", barW: 0, barColor: "#f97316", rateVal: "Rework", rateColor: "#f97316" },
    { name: "Bottom Bearing Housing", insp: "183", pass: "177", rej: "6", barW: 96.7, barColor: "#10b981", rateVal: "96.7%", rateColor: "#10b981" },
];

const DEFECT_CAUSES = [
    { name: "Surface Defects", barW: 100, color: "#ef4444", count: "75", pct: "36.6%" },
    { name: "Dimension Variance", barW: 72, color: "#f97316", count: "54", pct: "26.3%" },
    { name: "Alignment Error", barW: 53, color: "#f59e0b", count: "40", pct: "19.5%" },
    { name: "Viscosity / Chemical", barW: 40, color: "#8b5cf6", count: "30", pct: "14.6%" },
    { name: "Hardness Non-conformance", barW: 8, color: "#94a3b8", count: "6", pct: "2.9%" },
];

const INSPECTION_ROWS = [
    { id: "INS-2601-001", date: "22-Feb-2026", product: "Round Rod DIA 50MM", partNo: "RRD03-05050-00", dept: "Production", typeCls: "qa2-tag-teal", typeLabel: "Intermediate", qty: "100", defect: "—", resultCls: "qa2-tag-pass", result: "PASS", remarks: "Dimension OK" },
    { id: "INS-2601-002", date: "22-Feb-2026", product: 'VCI Cover 8"×8"', partNo: "PKM0012", dept: "Production", typeCls: "qa2-tag-blue", typeLabel: "Final", qty: "50", defect: "—", resultCls: "qa2-tag-pass", result: "PASS", remarks: "Quality Approved" },
    { id: "INS-2601-003", date: "22-Feb-2026", product: "Paint-Seal Cast", partNo: "PDC0017", dept: "Quality", typeCls: "qa2-tag-teal", typeLabel: "Job Order", qty: "75", defectCls: "qa2-tag-critical", defect: "Critical", resultCls: "qa2-tag-fail", result: "FAIL", remarks: "Surface defects found" },
    { id: "INS-2601-004", date: "21-Feb-2026", product: "Insert CCMT 09T304", partNo: "PDCT0165", dept: "Production", typeCls: "qa2-tag-blue", typeLabel: "Incoming", qty: "200", defect: "—", resultCls: "qa2-tag-pass", result: "PASS", remarks: "Supplier verification OK" },
    { id: "INS-2601-005", date: "21-Feb-2026", product: "Thinner GP 015", partNo: "PDC0018", dept: "Production", typeCls: "qa2-tag-blue", typeLabel: "Final", qty: "60", defectCls: "qa2-tag-major", defect: "Major", resultCls: "qa2-tag-rework", result: "REWORK", remarks: "Viscosity issue" },
    { id: "INS-2601-006", date: "20-Feb-2026", product: "Round Rod DIA 65MM", partNo: "RRD03-06565-00", dept: "Production", typeCls: "qa2-tag-teal", typeLabel: "Intermediate", qty: "150", defect: "—", resultCls: "qa2-tag-pass", result: "PASS", remarks: "Hardness verified" },
    { id: "INS-2601-007", date: "20-Feb-2026", product: "Segment Carrier RM", partNo: "RSC01-600H2-00", dept: "Assembly", typeCls: "qa2-tag-blue", typeLabel: "Final", qty: "40", defectCls: "qa2-tag-critical", defect: "Critical", resultCls: "qa2-tag-fail", result: "FAIL", remarks: "Alignment error" },
    { id: "INS-2601-008", date: "19-Feb-2026", product: "Bottom Bearing Housing", partNo: "BEH04X100001WM0", dept: "Quality", typeCls: "qa2-tag-teal", typeLabel: "Incoming", qty: "183", defect: "—", resultCls: "qa2-tag-pass", result: "PASS", remarks: "Dim & surface OK" },
    { id: "INS-2601-009", date: "18-Feb-2026", product: "Round Rod DIA 70MM", partNo: "RRD03-07070-00", dept: "Production", typeCls: "qa2-tag-teal", typeLabel: "Intermediate", qty: "240", defectCls: "qa2-tag-minor", defect: "Minor", resultCls: "qa2-tag-pass", result: "PASS", remarks: "Slight dim variance — within tol." },
    { id: "INS-2601-010", date: "17-Feb-2026", product: "Letter Pad / Record Notes", partNo: "GNC0013 / PDC0012", dept: "Stores", typeCls: "qa2-tag-teal", typeLabel: "Job Order", qty: "500", defect: "—", resultCls: "qa2-tag-pending", result: "PENDING", remarks: "Awaiting supervisor review" },
];

const REJECTION_ROWS = [
    { id: "REJ-001", product: "Paint-Seal Cast", reason: "Surface defects", qty: "75", defectCls: "qa2-tag-critical", defect: "Critical", dispCls: "qa2-tag-fail", disp: "Rejected", date: "22-Feb-26" },
    { id: "REJ-002", product: "Thinner GP 015", reason: "Viscosity issue", qty: "60", defectCls: "qa2-tag-major", defect: "Major", dispCls: "qa2-tag-rework", disp: "Rework", date: "21-Feb-26" },
    { id: "REJ-003", product: "Segment Carrier", reason: "Alignment error", qty: "40", defectCls: "qa2-tag-critical", defect: "Critical", dispCls: "qa2-tag-fail", disp: "Rejected", date: "20-Feb-26" },
    { id: "REJ-004", product: "Round Rod DIA 70MM", reason: "Dimension variance", qty: "30", defectCls: "qa2-tag-minor", defect: "Minor", dispCls: "qa2-tag-rework", disp: "Rework", date: "19-Feb-26" },
];

const REWORK_QUEUE = [
    { dotColor: "#ef4444", name: "Thinner GP 015 (RAS)", code: "REJ-002 · Viscosity issue · Quality dept", qty: "60 Nos", daysBg: "#fee2e2", daysFg: "#b91c1c", daysLbl: "+5d" },
    { dotColor: "#f97316", name: "Round Rod DIA 70MM", code: "REJ-004 · Dimension variance · Production", qty: "30 Nos", daysBg: "#ffedd5", daysFg: "#c2410c", daysLbl: "+3d" },
    { dotColor: "#f59e0b", name: "Letter Pad / Record Notes", code: "INS-010 · Pending supervisor approval", qty: "500 Nos", daysBg: "#fef9c3", daysFg: "#92400e", daysLbl: "Today" },
];

const CALIBRATION_ROWS = [
    { name: "Vernier Caliper #VC-01", id: "CAL-001 · Quality Lab", date: "05-Mar-2026", cls: "qa2-cal-ok", label: "+5d" },
    { name: "Micrometer #MC-03", id: "CAL-002 · Production Floor", date: "02-Mar-2026", cls: "qa2-cal-warn", label: "+2d" },
    { name: "Hardness Tester #HT-01", id: "CAL-003 · Quality Lab", date: "28-Feb-2026", cls: "qa2-cal-over", label: "Due Today" },
    { name: "Height Gauge #HG-02", id: "CAL-004 · Inspection Bay", date: "15-Mar-2026", cls: "qa2-cal-ok", label: "+15d" },
    { name: "CMM Machine #CM-01", id: "CAL-005 · Quality Lab", date: "20-Mar-2026", cls: "qa2-cal-ok", label: "+20d" },
];

const INSIGHTS_LEFT = [
    { icon: "🔴", title: "Paint-Seal Cast — 100% Rejection (75 units)", sub: "Critical surface defects. Entire batch rejected. Supplier quality audit required immediately.", val: "100% Fail", valColor: "#ef4444" },
    { icon: "🟠", title: "Segment Carrier pass rate at 90.2% — below 95% target", sub: "40 units failed alignment check. Review assembly fixture calibration.", val: "90.2%", valColor: "#f97316" },
    { icon: "🟡", title: "Hardness Tester #HT-01 calibration overdue today", sub: "Calibration expired 28-Feb-2026. All hardness test results today may be non-compliant.", val: "Action Now", valColor: "#f59e0b" },
];

const INSIGHTS_RIGHT = [
    { icon: "🔵", title: "Overall pass rate 87.6% — trending up +2.1%", sub: "Quality improving steadily. Round Rod and Insert lines achieving 96%+. Maintain current controls.", val: "↑ 2.1%", valColor: "#10b981" },
    { icon: "🟣", title: "Scrap cost ₹48.2K — ₹6K above budget threshold", sub: "Surface defects and alignment errors driving scrap. Root cause corrective action (RCCA) needed.", val: "₹48.2K", valColor: "#8b5cf6" },
];

// ─────────────────────────────────────────────
//  Chart Data
// ─────────────────────────────────────────────
const TREND_DATA = {
    labels: ["W1 Jan", "W2 Jan", "W3 Jan", "W4 Jan", "W1 Feb", "W2 Feb", "W3 Feb", "W4 Feb"],
    datasets: [
        { label: "Pass", data: [310, 285, 340, 280, 320, 295, 270, 309], backgroundColor: "rgba(16,185,129,0.75)", borderRadius: 5 },
        { label: "Rework", data: [22, 18, 15, 25, 20, 14, 10, 10], backgroundColor: "rgba(245,166,35,0.75)", borderRadius: 5 },
        { label: "Reject", data: [28, 22, 15, 30, 25, 28, 32, 25], backgroundColor: "rgba(239,68,68,0.75)", borderRadius: 5 },
    ],
};

const RESULT_DONUT = {
    labels: ["Pass (87.6%)", "Rework (4.9%)", "Reject (7.5%)"],
    datasets: [{ data: [87.6, 4.9, 7.5], backgroundColor: ["#10b981", "#f5a623", "#ef4444"], borderColor: "#fff", borderWidth: 2.5 }],
};

const DEFECT_DONUT = {
    labels: ["Critical", "Major", "Minor"],
    datasets: [{ data: [56.1, 29.3, 14.6], backgroundColor: ["#ef4444", "#f97316", "#f59e0b"], borderColor: "#fff", borderWidth: 2.5 }],
};

const DEPT_DATA = {
    labels: ["Production", "Quality", "Assembly", "Stores", "Incoming"],
    datasets: [{
        label: "Pass Rate %",
        data: [91.2, 85.4, 78.6, 96.0, 98.2],
        backgroundColor: ["#2d6de8", "#f97316", "#ef4444", "#10b981", "#06b6d4"],
        borderRadius: 6,
    }],
};

const PARETO_DATA = {
    labels: ["Surface Defect", "Dim. Variance", "Alignment", "Viscosity", "Hardness"],
    datasets: [
        { label: "Count", data: [75, 54, 40, 30, 6], backgroundColor: ["#ef4444", "#f97316", "#f59e0b", "#8b5cf6", "#94a3b8"], borderRadius: 5, yAxisID: "y" },
        { label: "Cumulative %", data: [36.6, 62.9, 82.4, 97.1, 100], type: "line", borderColor: "#2d6de8", backgroundColor: "rgba(45,109,232,0.08)", borderWidth: 2.5, tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: "#2d6de8", pointBorderColor: "#fff", pointBorderWidth: 2, yAxisID: "y2" },
    ],
};

// ─────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────
function SectionHead({ icon, title, badge, badgeCls, extra }) {
    return (
        <div className="qa2-section-head">
            <span className="qa2-section-icon">{icon}</span>
            <span className="qa2-section-title">{title}</span>
            {extra}
            {badge && <span className={`qa2-badge ${badgeCls || ""}`}>{badge}</span>}
        </div>
    );
}

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────
export default function QualityAnalysis() {
    const [dateRange, setDateRange] = useState({
        from: new Date(2026, 0, 1),
        to: new Date(2026, 1, 28),
    });
    const [filters, setFilters] = useState({
        fromDate: "2026-01-01", toDate: "2026-02-28",
        reportType: "All Reports", department: "All Departments",
        product: "All Products", defectType: "All Defects",
    });
    const [animated, setAnimated] = useState(false);

    const trendRef = useRef(null); const trendChart = useRef(null);
    const resultRef = useRef(null); const resultChart = useRef(null);
    const defectRef = useRef(null); const defectChart = useRef(null);
    const deptRef = useRef(null); const deptChart = useRef(null);
    const paretoRef = useRef(null); const paretoChart = useRef(null);

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 60);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const mk = (ref, holder, type, data, opts) => {
            holder.current?.destroy();
            if (ref.current) holder.current = new Chart(ref.current, { type, data, options: opts });
        };

        const fontBase = { family: "Poppins" };

        mk(trendRef, trendChart, "bar", TREND_DATA, {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { font: { ...fontBase, size: 11, weight: 600 }, boxWidth: 12, padding: 14 } } },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" } },
                y: { stacked: true, grid: { color: "rgba(26,84,212,0.07)" }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" }, border: { dash: [4, 4] } },
            },
        });

        const donut = {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: "bottom", labels: { font: { ...fontBase, size: 10 }, padding: 10, boxWidth: 10 } } },
            cutout: "64%",
        };
        mk(resultRef, resultChart, "doughnut", RESULT_DONUT, donut);
        mk(defectRef, defectChart, "doughnut", DEFECT_DONUT, donut);

        mk(deptRef, deptChart, "bar", DEPT_DATA, {
            responsive: true, maintainAspectRatio: false, indexAxis: "y",
            plugins: { legend: { display: false } },
            scales: {
                x: { min: 60, max: 100, grid: { color: "rgba(26,84,212,0.07)" }, ticks: { font: { ...fontBase, size: 10 }, color: "#5a6a9a", callback: v => v + "%" }, border: { dash: [4, 4] } },
                y: { grid: { display: false }, ticks: { font: { ...fontBase, size: 10 }, color: "#5a6a9a" } },
            },
        });

        mk(paretoRef, paretoChart, "bar", PARETO_DATA, {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { font: { ...fontBase, size: 11, weight: 600 }, boxWidth: 12, padding: 14 } } },
            scales: {
                y: { beginAtZero: true, grid: { color: "rgba(26,84,212,0.07)" }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" }, border: { dash: [4, 4] } },
                y2: { position: "right", min: 0, max: 100, grid: { display: false }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a", callback: v => v + "%" } },
                x: { grid: { display: false }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" } },
            },
        });

        return () => {
            [trendChart, resultChart, defectChart, deptChart, paretoChart].forEach(c => c.current?.destroy());
        };
    }, []);

    const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));
    const resetFilters = () => {
        setDateRange({ from: new Date(2026, 0, 1), to: new Date(2026, 1, 28) });
        setFilters({ fromDate: "2026-01-01", toDate: "2026-02-28", reportType: "All Reports", department: "All Departments", product: "All Products", defectType: "All Defects" });
    };

    return (
        <div className={`qa2-root ${animated ? "qa2-root--visible" : ""}`}>

            {/* ── Page Hero ── */}
            <div className="qa2-page-hero">
                <div className="qa2-hero-left">
                    {/* <div className="qa2-hero-icon">🔬</div> */}
                    <div>
                        {/* <h2 className="qa2-page-title">Quality Analysis Report</h2> */}
                        {/* <p className="qa2-page-sub">Jan – Feb 2026 · All Departments</p> */}
                    </div>
                </div>
                {/* <div className="qa2-hero-pills">
                    {[
                        { val: "2,748", lbl: "Inspected", color: "#2d6de8" },
                        { val: "87.6%", lbl: "Pass Rate", color: "#10b981" },
                        { val: "7.5%", lbl: "Rejection", color: "#ef4444" },
                        { val: "₹48.2K", lbl: "Scrap Loss", color: "#8b5cf6" },
                    ].map(p => (
                        <div className="qa2-pill" style={{ "--pc": p.color }} key={p.lbl}>
                            <span className="qa2-pill-val">{p.val}</span>
                            <span className="qa2-pill-lbl">{p.lbl}</span>
                        </div>
                    ))}
                </div> */}
            </div>

            {/* ── Filters ── */}
            <div className="qa2-card qa2-filter-card qa2-animate qa2-d1">
                <div className="qa2-filter-title">
                    <span>⚙️</span> Report Filters
                </div>
                <div className="qa2-filter-grid">
                    <div className="qa2-fg" style={{ gridColumn: "span 2" }}>
                        <label className="qa2-fl">Date Range</label>
                        <QualityAnalysisDatePicker
                            from={dateRange.from}
                            to={dateRange.to}
                            onChange={({ from, to }) => setDateRange({ from, to })}
                        />
                    </div>
                    {/* <div className="qa2-fg">
                        <label className="qa2-fl">Report Type</label>
                        <select className="qa2-fs" value={filters.reportType} onChange={e => setF("reportType", e.target.value)}>
                            {["All Reports", "Rejection / Rework", "Final Inspection", "Intermediate Inspection", "Calibration", "Scrap Report"].map(o => <option key={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="qa2-fg">
                        <label className="qa2-fl">Department</label>
                        <select className="qa2-fs" value={filters.department} onChange={e => setF("department", e.target.value)}>
                            {["All Departments", "Production", "Quality", "Assembly", "Stores"].map(o => <option key={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="qa2-fg">
                        <label className="qa2-fl">Product</label>
                        <select className="qa2-fs" value={filters.product} onChange={e => setF("product", e.target.value)}>
                            {["All Products", "Round Rod DIA", "Segment Carrier", "VCI Cover", "Paint Seal Cast"].map(o => <option key={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="qa2-fg">
                        <label className="qa2-fl">Defect Type</label>
                        <select className="qa2-fs" value={filters.defectType} onChange={e => setF("defectType", e.target.value)}>
                            {["All Defects", "Critical", "Major", "Minor"].map(o => <option key={o}>{o}</option>)}
                        </select>
                    </div> */}
                </div>
            </div>

            {/* ── Summary Strip ── */}
            <div className="qa2-summary-strip qa2-animate qa2-d2">
                {[
                    { lbl: "Period", val: "Jan–Feb 2026", cls: "" },
                    { lbl: "Total Inspected", val: "2,748", cls: "qa2-blue" },
                    { lbl: "Pass Rate", val: "87.6%", cls: "qa2-green" },
                    { lbl: "Total Rejected", val: "205", cls: "qa2-red" },
                    { lbl: "Rework", val: "134", cls: "qa2-orange" },
                    { lbl: "Scrap", val: "71", cls: "qa2-purple" },
                    { lbl: "Pending Insp.", val: "5", cls: "qa2-yellow" },
                ].map((s, i) => (
                    <div className="qa2-strip-item" key={i}>
                        <div className="qa2-strip-lbl">{s.lbl}</div>
                        <div className={`qa2-strip-val ${s.cls}`}>{s.val}</div>
                    </div>
                ))}
            </div>

            {/* ── KPI Cards ── */}
            <div className="qa2-kpi-grid">
                {KPI_CARDS.map((k, i) => (
                    <div className="qa2-kpi-card qa2-animate" style={{ animationDelay: `${0.08 + i * 0.06}s` }} key={i}>
                        <div className="qa2-kpi-top">
                            <span className="qa2-kpi-icon">{k.icon}</span>
                            <span className={`qa2-kpi-trend ${k.cls}`}>{k.trend}</span>
                        </div>
                        <div className="qa2-kpi-val">{k.value}</div>
                        <div className="qa2-kpi-lbl">{k.label}</div>
                        <div className="qa2-kpi-sub">{k.sub}</div>
                    </div>
                ))}
            </div>

            {/* ── Charts Row 1: 3-col ── */}
            <div className="qa2-charts-3 qa2-animate qa2-d3">
                <div className="qa2-card qa2-chart-card">
                    <SectionHead icon="📈" title="Weekly Inspection Trend"
                        badge="Jan–Feb 2026" badgeCls="qa2-badge-blue" />
                    <div className="qa2-chart-wrap"><canvas ref={trendRef} /></div>
                </div>
                <div className="qa2-card qa2-chart-card">
                    <SectionHead icon="📊" title="Inspection Results Split" />
                    <div className="qa2-chart-wrap"><canvas ref={resultRef} /></div>
                </div>
                <div className="qa2-card qa2-chart-card">
                    <SectionHead icon="⚠️" title="Defect Type Breakdown" />
                    <div className="qa2-chart-wrap"><canvas ref={defectRef} /></div>
                </div>
            </div>

            {/* ── Charts Row 2: 2-col ── */}
            <div className="qa2-charts-2 qa2-animate qa2-d3">
                <div className="qa2-card qa2-chart-card">
                    <SectionHead icon="🏭" title="Department-wise Quality Rate"
                        badge="% Pass" badgeCls="qa2-badge-teal" />
                    <div className="qa2-chart-wrap"><canvas ref={deptRef} /></div>
                </div>
                <div className="qa2-card qa2-chart-card">
                    <SectionHead icon="🔴" title="Top Defect Causes — Pareto" />
                    <div className="qa2-chart-wrap"><canvas ref={paretoRef} /></div>
                </div>
            </div>

            {/* ── Product Quality + Defect Cause ── */}
            <div className="qa2-charts-2 qa2-animate qa2-d3">

                {/* Product Quality */}
                <div className="qa2-card">
                    <SectionHead icon="📦" title="Product-wise Quality Performance"
                        extra={<span className="qa2-section-sub">Target ≥ 95%</span>} />
                    <div className="qa2-pq-header">
                        <span className="qa2-pqh-name">Product</span>
                        <span className="qa2-pqh-num">Insp</span>
                        <span className="qa2-pqh-num">Pass</span>
                        <span className="qa2-pqh-num">Rej</span>
                        <span className="qa2-pqh-bar">Rate</span>
                        <span className="qa2-pqh-rate">%</span>
                    </div>
                    {PRODUCT_QUALITY.map((p, i) => (
                        <div className="qa2-pq-row" key={i}>
                            <div className="qa2-pq-name">{p.name}</div>
                            <div className="qa2-pq-num qa2-muted">{p.insp}</div>
                            <div className="qa2-pq-num qa2-green">{p.pass}</div>
                            <div className="qa2-pq-num qa2-red">{p.rej}</div>
                            <div className="qa2-pq-bar-track">
                                <div className="qa2-pq-bar-fill" style={{ width: `${p.barW}%`, background: p.barColor }} />
                            </div>
                            <div className="qa2-pq-rate" style={{ color: p.rateColor }}>{p.rateVal}</div>
                        </div>
                    ))}
                </div>

                {/* Defect Cause */}
                <div className="qa2-card">
                    <SectionHead icon="🔴" title="Defect Cause Analysis"
                        badge="7.5% Rejection" badgeCls="qa2-badge-red" />

                    <div className="qa2-defect-list">
                        {DEFECT_CAUSES.map((d, i) => (
                            <div className="qa2-defect-row" key={i}>
                                <div className="qa2-defect-name">{d.name}</div>
                                <div className="qa2-defect-bar-track">
                                    <div className="qa2-defect-bar-fill" style={{ width: `${d.barW}%`, background: d.color }} />
                                </div>
                                <div className="qa2-defect-count">{d.count}</div>
                                <div className="qa2-defect-pct">{d.pct}</div>
                            </div>
                        ))}
                    </div>

                    <div className="qa2-defect-class-wrap">
                        <div className="qa2-defect-class-lbl">Rejection by Defect Class</div>
                        <div className="qa2-defect-class-row">
                            {[
                                { bg: "#fee2e2", lbl: "Critical", val: "115", pct: "56.1%", lc: "#b91c1c", vc: "#7f1d1d", pc: "#991b1b" },
                                { bg: "#ffedd5", lbl: "Major", val: "60", pct: "29.3%", lc: "#c2410c", vc: "#7c2d12", pc: "#9a3412" },
                                { bg: "#fef9c3", lbl: "Minor", val: "30", pct: "14.6%", lc: "#92400e", vc: "#78350f", pc: "#92400e" },
                            ].map(b => (
                                <div className="qa2-dcb" style={{ background: b.bg }} key={b.lbl}>
                                    <div className="qa2-dcb-lbl" style={{ color: b.lc }}>{b.lbl}</div>
                                    <div className="qa2-dcb-val" style={{ color: b.vc }}>{b.val}</div>
                                    <div className="qa2-dcb-pct" style={{ color: b.pc }}>{b.pct}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Full Inspection Table ── */}
            <div className="qa2-card qa2-animate qa2-d4">
                <div className="qa2-table-header">
                    <SectionHead icon="🔍" title="Inspection Records — All Transactions" />
                    <div className="qa2-tag-row">
                        <span className="qa2-badge qa2-badge-green">✓ Pass: 19</span>
                        <span className="qa2-badge qa2-badge-red">✗ Fail: 3</span>
                        <span className="qa2-badge qa2-badge-orange">↺ Rework: 1</span>
                        <span className="qa2-badge qa2-badge-yellow">⏳ Pending: 1</span>
                    </div>
                </div>
                <div className="qa2-table-scroll">
                    <table className="qa2-table">
                        <thead>
                            <tr>
                                {["Insp ID", "Date", "Product", "Part No", "Dept", "Type", "Qty", "Defect", "Result", "Remarks"].map(h => (
                                    <th key={h} className={h === "Qty" ? "qa2-th-r" : ""}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {INSPECTION_ROWS.map((r, i) => (
                                <tr key={i} className="qa2-tr">
                                    <td><span className="qa2-insp-id">{r.id}</span></td>
                                    <td className="qa2-muted qa2-nowrap">{r.date}</td>
                                    <td>{r.product}</td>
                                    <td className="qa2-mono qa2-muted">{r.partNo}</td>
                                    <td>{r.dept}</td>
                                    <td><span className={`qa2-badge ${r.typeCls}`}>{r.typeLabel}</span></td>
                                    <td className="qa2-td-r">{r.qty}</td>
                                    <td>{r.defectCls ? <span className={`qa2-badge ${r.defectCls}`}>{r.defect}</span> : <span className="qa2-muted">{r.defect}</span>}</td>
                                    <td><span className={`qa2-badge ${r.resultCls}`}>{r.result}</span></td>
                                    <td className="qa2-remarks">{r.remarks}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="qa2-action-bar">
                    {/* <button className="qa2-btn qa2-btn-primary" onClick={() => alert("Exporting to Excel...")}>📥 Export Excel</button> */}
                    {/* <button className="qa2-btn qa2-btn-primary" onClick={() => alert("Exporting to PDF...")}>📄 Export PDF</button> */}
                    {/* <button className="qa2-btn qa2-btn-ghost" onClick={() => window.print()}>🖨️ Print</button> */}
                    {/* <button className="qa2-btn qa2-btn-ghost" onClick={() => alert("Sending email report...")}>📧 Email Report</button> */}
                </div>
            </div>

            {/* ── Rejection + Rework + Calibration ── */}
            <div className="qa2-charts-3 qa2-animate qa2-d4">

                {/* Rejection & Rework */}
                <div className="qa2-card">
                    <SectionHead icon="❌" title="Rejection & Rework Summary"
                        badge="4 Records" badgeCls="qa2-badge-red" />
                    <div className="qa2-table-scroll" style={{ maxHeight: "260px" }}>
                        <table className="qa2-table">
                            <thead>
                                <tr>
                                    {["Rej ID", "Product", "Reason", "Qty", "Defect", "Disposition", "Date"].map(h => (
                                        <th key={h} className={h === "Qty" ? "qa2-th-r" : ""}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {REJECTION_ROWS.map((r, i) => (
                                    <tr key={i} className="qa2-tr">
                                        <td><span className="qa2-rej-id">{r.id}</span></td>
                                        <td>{r.product}</td>
                                        <td>{r.reason}</td>
                                        <td className="qa2-td-r">{r.qty}</td>
                                        <td><span className={`qa2-badge ${r.defectCls}`}>{r.defect}</span></td>
                                        <td><span className={`qa2-badge ${r.dispCls}`}>{r.disp}</span></td>
                                        <td className="qa2-muted qa2-nowrap">{r.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Rework Queue + Scrap */}
                <div className="qa2-card">
                    <SectionHead icon="⏳" title="Pending Rework Queue"
                        badge="3 Open" badgeCls="qa2-badge-orange" />
                    <div>
                        {REWORK_QUEUE.map((rw, i) => (
                            <div className="qa2-rw-row" key={i}>
                                <span className="qa2-rw-dot" style={{ background: rw.dotColor }} />
                                <div className="qa2-rw-info">
                                    <div className="qa2-rw-name">{rw.name}</div>
                                    <div className="qa2-rw-code">{rw.code}</div>
                                </div>
                                <span className="qa2-rw-qty">{rw.qty}</span>
                                <span className="qa2-rw-days" style={{ background: rw.daysBg, color: rw.daysFg }}>{rw.daysLbl}</span>
                            </div>
                        ))}
                    </div>
                    <div className="qa2-scrap-section">
                        <div className="qa2-scrap-lbl">Scrap Summary</div>
                        <div className="qa2-scrap-grid">
                            {[
                                { lbl: "Total Scrap", val: "71", color: "#8b5cf6" },
                                { lbl: "Scrap Value", val: "₹48.2K", color: "#ef4444" },
                                { lbl: "Scrap Rate", val: "2.6%", color: "#f97316" },
                                { lbl: "vs Target", val: "↑0.6%", color: "#ef4444" },
                            ].map(s => (
                                <div className="qa2-scrap-box" key={s.lbl}>
                                    <div className="qa2-scrap-box-lbl">{s.lbl}</div>
                                    <div className="qa2-scrap-box-val" style={{ color: s.color }}>{s.val}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Calibration */}
                <div className="qa2-card">
                    <SectionHead icon="🧰" title="Calibration Status"
                        badge="2 Due Soon" badgeCls="qa2-badge-orange" />
                    <div>
                        {CALIBRATION_ROWS.map((c, i) => (
                            <div className="qa2-cal-row" key={i}>
                                <div className="qa2-cal-info">
                                    <div className="qa2-cal-name">{c.name}</div>
                                    <div className="qa2-cal-id">{c.id}</div>
                                </div>
                                <div className="qa2-cal-date">{c.date}</div>
                                <div className={`qa2-cal-days ${c.cls}`}>{c.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Management Insights ── */}
            <div className="qa2-card qa2-animate qa2-d4">
                <SectionHead icon="💡" title="Management Quality Insights"
                    badge="5 Action Points" badgeCls="qa2-badge-red" />
                <div className="qa2-insights-grid">
                    <div className="qa2-insights-col qa2-insights-left">
                        {INSIGHTS_LEFT.map((ins, i) => (
                            <div className="qa2-insight-row" key={i}>
                                <span className="qa2-insight-icon">{ins.icon}</span>
                                <div className="qa2-insight-body">
                                    <div className="qa2-insight-title">{ins.title}</div>
                                    <div className="qa2-insight-sub">{ins.sub}</div>
                                </div>
                                <div className="qa2-insight-val" style={{ color: ins.valColor }}>{ins.val}</div>
                            </div>
                        ))}
                    </div>
                    <div className="qa2-insights-col">
                        {INSIGHTS_RIGHT.map((ins, i) => (
                            <div className="qa2-insight-row" key={i}>
                                <span className="qa2-insight-icon">{ins.icon}</span>
                                <div className="qa2-insight-body">
                                    <div className="qa2-insight-title">{ins.title}</div>
                                    <div className="qa2-insight-sub">{ins.sub}</div>
                                </div>
                                <div className="qa2-insight-val" style={{ color: ins.valColor }}>{ins.val}</div>
                            </div>
                        ))}
                        <div className="qa2-priority-box">
                            <div className="qa2-priority-title">📌 Priority Action for Management</div>
                            <p className="qa2-priority-body">
                                1) Initiate supplier audit for <strong>Paint-Seal Cast</strong> (100% batch failure).{" "}
                                2) Calibrate <strong>Hardness Tester #HT-01</strong> today.{" "}
                                3) Review assembly fixture for <strong>Segment Carrier</strong> alignment.{" "}
                                4) RCCA for scrap cost overrun.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}