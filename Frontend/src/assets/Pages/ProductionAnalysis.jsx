import { useState, useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import "./ProductionAnalysis.css";
import ProductionAnalysisDatePicker from "./ProductionAnalysisDatePicker";

Chart.register(...registerables);

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

const TABLE_DATA = [
    { id: 1, date: "01/02/2026", machine: "BROACHING-1", shift: "SHIFT I", operator: "Ramchandra Soran", part: "THRUST PLATE", process: "KEYWAY", target: 360, ok: 226, rej: 0, eff: "62.78%", oee: "62.78%", status: "Average", badge: "pa2-badge--warn" },
    { id: 2, date: "01/02/2026", machine: "SPM-04", shift: "SHIFT III", operator: "Santhana Lakshmi", part: "THRUST PLATE", process: "PRE DRILLING", target: 486, ok: 485, rej: 0, eff: "99.79%", oee: "96.23%", status: "Excellent", badge: "pa2-badge--ok" },
    { id: 3, date: "01/02/2026", machine: "TC 43 L", shift: "SHIFT I", operator: "Akash.A", part: "SEGMENT CARRIER", process: "CNC TURNING I", target: 236, ok: 110, rej: 0, eff: "33.17%", oee: "27.32%", status: "Poor", badge: "pa2-badge--bad" },
    { id: 4, date: "02/02/2026", machine: "TC 50", shift: "SHIFT II", operator: "Santhana Lakshmi", part: "THRUST PLATE", process: "PRE DRILLING", target: 1330, ok: 1250, rej: 0, eff: "93.95%", oee: "93.95%", status: "Excellent", badge: "pa2-badge--ok" },
    { id: 5, date: "02/02/2026", machine: "BROACHING-1", shift: "SHIFT I", operator: "Mohan Kewat", part: "THRUST PLATE", process: "KEYWAY", target: 540, ok: 490, rej: 0, eff: "90.74%", oee: "64.05%", status: "Good", badge: "pa2-badge--ok" },
    { id: 6, date: "02/02/2026", machine: "TC 59", shift: "SHIFT II", operator: "Karthi.S", part: "THRUST PLATE", process: "PRE DRILLING", target: 165, ok: 165, rej: 0, eff: "100.00%", oee: "100.00%", status: "Excellent", badge: "pa2-badge--ok" },
    { id: 7, date: "02/02/2026", machine: "VMC 18", shift: "SHIFT I", operator: "Chandan Kumar", part: "TOP BEARING BODY", process: "DRILLING-1", target: 420, ok: 250, rej: 0, eff: "59.52%", oee: "49.02%", status: "Average", badge: "pa2-badge--warn" },
    { id: 8, date: "02/02/2026", machine: "TC-59", shift: "SHIFT II", operator: "Ajith.A", part: "THRUST PLATE", process: "CNC TURNING I", target: 171, ok: 165, rej: 3, eff: "96.49%", oee: "79.71%", status: "Good", badge: "pa2-badge--ok" },
    { id: 9, date: "02/02/2026", machine: "TC-60", shift: "SHIFT I", operator: "Nagamani", part: "THRUST PLATE", process: "CNC TURNING II", target: 192, ok: 160, rej: 1, eff: "83.17%", oee: "68.50%", status: "Average", badge: "pa2-badge--warn" },
    { id: 10, date: "02/02/2026", machine: "VMC-07", shift: "SHIFT III", operator: "Biswanath Dhungia", part: "BOTTOM BEARING", process: "DRILLING TAPPING", target: 355, ok: 345, rej: 0, eff: "97.31%", oee: "90.36%", status: "Excellent", badge: "pa2-badge--ok" },
];

/* ── NEW: Production Value & Rate ─────────────────────────── */
const RATE_DATA = [
    { part: "THRUST PLATE", process: "KEYWAY", ratePerHr: 4200, actualQtyHr: 38.0, targetQtyHr: 45.0, valueProduced: 159600, targetValue: 189000, unit: "₹/hr" },
    { part: "THRUST PLATE", process: "PRE DRILLING", ratePerHr: 3800, actualQtyHr: 81.0, targetQtyHr: 81.0, valueProduced: 307800, targetValue: 307800, unit: "₹/hr" },
    { part: "SEGMENT CARRIER", process: "CNC TURNING I", ratePerHr: 5500, actualQtyHr: 18.3, targetQtyHr: 39.3, valueProduced: 100650, targetValue: 216150, unit: "₹/hr" },
    { part: "TOP BEARING BODY", process: "DRILLING-1", ratePerHr: 4700, actualQtyHr: 41.7, targetQtyHr: 70.0, valueProduced: 195990, targetValue: 329000, unit: "₹/hr" },
    { part: "BOTTOM BEARING", process: "DRILLING TAPPING", ratePerHr: 5100, actualQtyHr: 57.5, targetQtyHr: 59.2, valueProduced: 293250, targetValue: 301920, unit: "₹/hr" },
];

/* ── NEW: Idle Hours – Accepted / Non-Accepted ────────────── */
const IDLE_ACCEPTED = [
    { reason: "Planned Maintenance", hours: 52.5, color: "#2d6de8" },
    { reason: "Shift Changeover", hours: 38.0, color: "#8b5cf6" },
    { reason: "Material Awaiting", hours: 28.5, color: "#06b6d4" },
    { reason: "Scheduled Break", hours: 22.0, color: "#0ea5e9" },
];
const IDLE_NON_ACCEPTED = [
    { reason: "Machine Breakdown", hours: 78.0, color: "#ef4444", ratePerHr: 4600 },
    { reason: "Power Failure", hours: 45.0, color: "#f97316", ratePerHr: 4600 },
    { reason: "Operator Absence", hours: 36.5, color: "#f59e0b", ratePerHr: 3800 },
    { reason: "Tool/Die Failure", hours: 22.5, color: "#dc2626", ratePerHr: 5100 },
    { reason: "Quality Hold", hours: 17.2, color: "#e11d48", ratePerHr: 4200 },
];

const totalAcceptedHrs = IDLE_ACCEPTED.reduce((s, r) => s + r.hours, 0);
const totalNonAccepted = IDLE_NON_ACCEPTED.reduce((s, r) => s + r.hours, 0);

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
            <text x={cx} y={cy - 7} textAnchor="middle" className="pa2-donut-label-big">
                {total.toFixed(1)}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" className="pa2-donut-label-sm">
                hrs
            </text>
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
export default function ProductionAnalysis() {
    const [dateRange, setDateRange] = useState({ from: new Date(2026, 1, 1), to: new Date(2026, 1, 28) });
    const [filterMachine, setFilterMachine] = useState("");
    const [filterShift, setFilterShift] = useState("");
    const [filterProcess, setFilterProcess] = useState("");
    const [filterDept, setFilterDept] = useState("");
    const [mounted, setMounted] = useState(false);
    const [pvMode, setPvMode]   = useState("machine"); // "machine" | "month"
    const pvChartRef  = useRef(null);
    const pvChartInst = useRef(null);

    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 60);
        return () => clearTimeout(t);
    }, []);

    const totalLoss = IDLE_NON_ACCEPTED.reduce((s, r) => s + r.hours * r.ratePerHr, 0);
    const totalAcceptedHrs    = IDLE_ACCEPTED.reduce((s, r) => s + r.hours, 0);
    const totalNonAccepted    = IDLE_NON_ACCEPTED.reduce((s, r) => s + r.hours, 0);

    /* ── Production Value chart ─────────────────── */
    useEffect(() => {
        if (!pvChartRef.current) return;
        pvChartInst.current?.destroy();

        const isMachine = pvMode === "machine";
        const ctx = pvChartRef.current.getContext("2d");

        pvChartInst.current = new Chart(ctx, {
            type: "bar",
            data: isMachine
                ? {
                    labels: PV_MACHINE_DATA.labels,
                    datasets: [
                        {
                            label: "Achieved Value (₹)",
                            data: PV_MACHINE_DATA.achieved,
                            backgroundColor: [
                                "rgba(37,99,235,0.75)","rgba(249,115,22,0.75)","rgba(16,185,129,0.75)",
                                "rgba(139,92,246,0.75)","rgba(6,182,212,0.75)","rgba(236,72,153,0.75)",
                                "rgba(245,158,11,0.75)","rgba(99,102,241,0.75)",
                            ],
                            borderColor: [
                                "#2563eb","#f97316","#10b981","#8b5cf6",
                                "#06b6d4","#ec4899","#f59e0b","#6366f1",
                            ],
                            borderWidth: 1.5,
                            borderRadius: 7,
                        },
                    ],
                }
                : {
                    labels: PV_MONTH_DATA.labels,
                    datasets: [
                        { label: "BROACHING",  data: PV_MONTH_DATA.broaching, backgroundColor: "#2563eb", borderRadius: 4 },
                        { label: "SPM-04",     data: PV_MONTH_DATA.spm,       backgroundColor: "#f97316", borderRadius: 4 },
                        { label: "TC 43 L",    data: PV_MONTH_DATA.tc43,      backgroundColor: "#10b981", borderRadius: 4 },
                        { label: "TC 50",      data: PV_MONTH_DATA.tc50,      backgroundColor: "#8b5cf6", borderRadius: 4 },
                        { label: "Others",     data: PV_MONTH_DATA.other,     backgroundColor: "#06b6d4", borderRadius: 4 },
                    ],
                },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: {
                        position: "top",
                        labels: { font: { family: "'DM Sans','Outfit',sans-serif", size: 12, weight: "600" }, padding: 18, usePointStyle: true },
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ₹${ctx.parsed.y.toLocaleString("en-IN")}`,
                        },
                    },
                    datalabels: isMachine ? {
                        anchor: "end",
                        align: "top",
                        formatter: v => `₹${(v / 1000).toFixed(0)}K`,
                        font: { size: 10, weight: "700" },
                        color: "#475569",
                    } : false,
                },
                scales: {
                    x: {
                        stacked: !isMachine,
                        ticks: { font: { size: 11 }, maxRotation: isMachine ? 35 : 0 },
                        grid: { display: false },
                    },
                    y: {
                        stacked: !isMachine,
                        beginAtZero: true,
                        ticks: { callback: v => `₹${(v / 1000).toFixed(0)}K`, font: { size: 11 } },
                        grid: { color: "#f1f5f9" },
                    },
                },
            },
        });
        return () => pvChartInst.current?.destroy();
    }, [pvMode]);

    return (
        <div className={`pa2-wrap ${mounted ? "pa2-wrap--in" : ""}`}>

            {/* ── FILTERS ──────────────────────────────────── */}
            <div className="pa2-card pa2-filters pa2-anim" style={{ "--d": "0ms" }}>
                <div className="pa2-filters-grid">
                    <div className="pa2-fg">
                        <label>Date Range</label>
                        <ProductionAnalysisDatePicker
                            from={dateRange.from}
                            to={dateRange.to}
                            onChange={setDateRange}
                        />
                    </div>
                </div>
            </div>

            {/* ── KPI CARDS ─────────────────────────────────── */}
            <div className="pa2-kpi-grid">
                {KPI_DATA.map((k, i) => (
                    <div key={i} className={`pa2-kpi ${k.variant} pa2-anim`} style={{ "--d": `${i * 55}ms` }}>
                        <div className="pa2-kpi-icon">{k.icon}</div>
                        <div className="pa2-kpi-label">{k.label}</div>
                        <div className="pa2-kpi-value">
                            <AnimatedValue target={k.value} suffix="" />
                            <span className="pa2-kpi-unit"> {k.unit}</span>
                        </div>
                        <div className={`pa2-kpi-meta ${k.pos ? "pa2-pos" : ""}`}>{k.meta}</div>
                    </div>
                ))}
            </div>

            {/* ── DAILY SUMMARY + EFFICIENCY (side by side) ── */}
            <div className="pa2-row-2">
                <div className="pa2-card pa2-anim" style={{ "--d": "80ms" }}>
                    <SectionHeader icon="▦" title="Daily Production Summary" />
                    <div className="pa2-summary-grid">
                        {SUMMARY_DATA.map((s, i) => (
                            <div key={i} className="pa2-summary-chip">
                                <div className="pa2-summary-lbl">{s.label}</div>
                                <div className="pa2-summary-val">
                                    <AnimatedValue target={s.value} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pa2-card pa2-anim" style={{ "--d": "120ms" }}>
                    <SectionHeader icon="◈" title="Machine & Operator Efficiency" />
                    <div className="pa2-metrics-list">
                        {METRICS_DATA.map((m, i) => (
                            <div key={i} className="pa2-metric-row">
                                <div className="pa2-metric-name">{m.name}</div>
                                <ProgressBar pct={m.pct} color={m.color} bg={m.bg} />
                                <div className="pa2-metric-pct" style={{ color: m.color }}>
                                    {m.pct}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════
         §1 — PRODUCTION VALUE REPORT
      ══════════════════════════════════════════════ */}
            <div className="pa2-card pa2-anim" style={{ "--d": "100ms" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.2rem" }}>
                    <SectionHeader
                        icon="₹"
                        title="Production Value Report"
                        sub="Machine-wise bar chart / Month-wise stacked bar — Production Value (₹)"
                    />
                    {/* Toggle pill */}
                    <div className="pa2-pv-toggle">
                        <button
                            className={`pa2-pv-tab ${pvMode === "machine" ? "pa2-pv-tab--active" : ""}`}
                            onClick={() => setPvMode("machine")}
                        >
                            🏭 Machine Wise
                        </button>
                        <button
                            className={`pa2-pv-tab ${pvMode === "month" ? "pa2-pv-tab--active" : ""}`}
                            onClick={() => setPvMode("month")}
                        >
                            📅 Month Wise
                        </button>
                    </div>
                </div>

                {/* KPI summary row */}
                <div className="pa2-pv-kpis">
                    {[
                        { label: "Total Achieved Value", val: `₹${PV_MACHINE_DATA.achieved.reduce((s,v)=>s+v,0).toLocaleString("en-IN")}`, color: "#f97316" },
                        { label: "No. of Machines",      val: PV_MACHINE_DATA.labels.length,                                                  color: "#2563eb" },
                        { label: "Avg per Machine",      val: `₹${Math.round(PV_MACHINE_DATA.achieved.reduce((s,v)=>s+v,0)/PV_MACHINE_DATA.labels.length).toLocaleString("en-IN")}`, color: "#10b981" },
                        { label: "Top Machine",          val: PV_MACHINE_DATA.labels[PV_MACHINE_DATA.achieved.indexOf(Math.max(...PV_MACHINE_DATA.achieved))], color: "#8b5cf6" },
                    ].map((k, i) => (
                        <div key={i} className="pa2-pv-kpi" style={{ borderColor: k.color + "33" }}>
                            <div className="pa2-pv-kpi-lbl">{k.label}</div>
                            <div className="pa2-pv-kpi-val" style={{ color: k.color }}>{k.val}</div>
                        </div>
                    ))}
                </div>

                {/* Chart canvas */}
                <div style={{ height: 340, marginTop: "1rem" }}>
                    <canvas ref={pvChartRef} />
                </div>
            </div>

            {/* ══════════════════════════════════════════════
         NEW §2 — IDLE HOURS: ACCEPTED vs NON-ACCEPTED
      ══════════════════════════════════════════════ */}
            <div className="pa2-row-2">
                {/* Accepted */}
                <div className="pa2-card pa2-anim" style={{ "--d": "80ms" }}>
                    <SectionHeader
                        icon="✔"
                        title="Idle Hours — Accepted Reasons"
                        sub={`Total: ${totalAcceptedHrs.toFixed(1)} hrs`}
                    />
                    <div className="pa2-idle-layout">
                        <DonutChart data={IDLE_ACCEPTED} total={totalAcceptedHrs} />
                        <div className="pa2-idle-list">
                            {IDLE_ACCEPTED.map((r, i) => (
                                <div key={i} className="pa2-idle-row pa2-anim" style={{ "--d": `${i * 60}ms` }}>
                                    <span className="pa2-idle-dot" style={{ background: r.color }} />
                                    <span className="pa2-idle-reason">{r.reason}</span>
                                    <span className="pa2-idle-hrs" style={{ color: r.color }}>{r.hours} hrs</span>
                                    <span className="pa2-idle-pct">({((r.hours / totalAcceptedHrs) * 100).toFixed(1)}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Non-Accepted */}
                <div className="pa2-card pa2-card--danger pa2-anim" style={{ "--d": "110ms" }}>
                    <SectionHeader
                        icon="✖"
                        title="Idle Hours — Non-Accepted Reasons"
                        sub={`Total: ${totalNonAccepted.toFixed(1)} hrs  |  ⚠ Needs Action`}
                    />
                    <div className="pa2-idle-layout">
                        <DonutChart data={IDLE_NON_ACCEPTED} total={totalNonAccepted} />
                        <div className="pa2-idle-list">
                            {IDLE_NON_ACCEPTED.map((r, i) => (
                                <div key={i} className="pa2-idle-row pa2-anim" style={{ "--d": `${i * 60}ms` }}>
                                    <span className="pa2-idle-dot" style={{ background: r.color }} />
                                    <span className="pa2-idle-reason">{r.reason}</span>
                                    <span className="pa2-idle-hrs" style={{ color: r.color }}>{r.hours} hrs</span>
                                    <span className="pa2-idle-pct">({((r.hours / totalNonAccepted) * 100).toFixed(1)}%)</span>
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
                <SectionHeader
                    icon="₹"
                    title="Production Loss — Non-Accepted Idle Hours × Rate per Hour"
                    sub="Financial impact of unplanned downtime based on process-specific production rate"
                />

                <div className="pa2-loss-kpis">
                    <div className="pa2-loss-kpi pa2-loss-kpi--red">
                        <div className="pa2-loss-kpi-lbl">Total Loss Value</div>
                        <div className="pa2-loss-kpi-val">₹{totalLoss.toLocaleString("en-IN")}</div>
                    </div>
                    <div className="pa2-loss-kpi pa2-loss-kpi--orange">
                        <div className="pa2-loss-kpi-lbl">Total Unplanned Hours</div>
                        <div className="pa2-loss-kpi-val">{totalNonAccepted.toFixed(1)} hrs</div>
                    </div>
                    <div className="pa2-loss-kpi pa2-loss-kpi--amber">
                        <div className="pa2-loss-kpi-lbl">Avg Loss per Hour</div>
                        <div className="pa2-loss-kpi-val">₹{(totalLoss / totalNonAccepted).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div className="pa2-loss-kpi pa2-loss-kpi--purple">
                        <div className="pa2-loss-kpi-lbl">Recoverable Potential</div>
                        <div className="pa2-loss-kpi-val">₹{(totalLoss * 0.62).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                    </div>
                </div>

                <div className="pa2-loss-table-wrap">
                    <table className="pa2-loss-table">
                        <thead>
                            <tr>
                                <th>Reason</th>
                                <th>Idle Hours</th>
                                <th>Rate / hr</th>
                                <th>Loss Value</th>
                                <th>% of Total Loss</th>
                                <th>Impact</th>
                            </tr>
                        </thead>
                        <tbody>
                            {IDLE_NON_ACCEPTED.map((r, i) => {
                                const loss = r.hours * r.ratePerHr;
                                const lossPct = (loss / totalLoss * 100).toFixed(1);
                                const impact = loss > 300000 ? "Critical" : loss > 150000 ? "High" : loss > 80000 ? "Medium" : "Low";
                                const impactClass = loss > 300000 ? "pa2-imp--crit" : loss > 150000 ? "pa2-imp--high" : loss > 80000 ? "pa2-imp--med" : "pa2-imp--low";
                                return (
                                    <tr key={i} className="pa2-anim" style={{ "--d": `${i * 50}ms` }}>
                                        <td>
                                            <span className="pa2-idle-dot" style={{ background: r.color }} />
                                            {r.reason}
                                        </td>
                                        <td className="pa2-td-num">{r.hours}</td>
                                        <td className="pa2-td-num">₹{r.ratePerHr.toLocaleString("en-IN")}</td>
                                        <td className="pa2-td-num pa2-td-loss">₹{loss.toLocaleString("en-IN")}</td>
                                        <td>
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
                                <td className="pa2-td-num"><strong>100%</strong></td>
                                <td>—</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ══════════════════════════════════════════════
         NEW §4 — MANPOWER EFFICIENCY
      ══════════════════════════════════════════════ */}
            {/* <div className="pa2-card pa2-anim" style={{ "--d": "100ms" }}>
                <SectionHeader
                    icon="◉"
                    title="Manpower Efficiency"
                    sub="Operator-wise shift performance, output & attendance analysis"
                />

               
                <div className="pa2-mp-kpis">
                    {[
                        { label: "Total Operators", val: MANPOWER_DATA.length, color: "#2d6de8" },
                        { label: "Avg Efficiency", val: `${(MANPOWER_DATA.reduce((s, r) => s + r.eff, 0) / MANPOWER_DATA.length).toFixed(1)}%`, color: "#059669" },
                        { label: "Top Performer", val: MANPOWER_DATA.reduce((a, b) => a.eff > b.eff ? a : b).operator.split(" ")[0], color: "#8b5cf6" },
                        { label: "Total Shifts", val: MANPOWER_DATA.reduce((s, r) => s + r.shifts, 0), color: "#06b6d4" },
                        { label: "Total OK Output", val: MANPOWER_DATA.reduce((s, r) => s + r.totalOk, 0).toLocaleString("en-IN"), color: "#059669" },
                        { label: "Below 70% Eff", val: MANPOWER_DATA.filter(r => r.eff < 70).length + " operators", color: "#ef4444" },
                    ].map((item, i) => (
                        <div key={i} className="pa2-mp-kpi" style={{ borderColor: item.color + "44" }}>
                            <div className="pa2-mp-kpi-lbl">{item.label}</div>
                            <div className="pa2-mp-kpi-val" style={{ color: item.color }}>{item.val}</div>
                        </div>
                    ))}
                </div>

            
                <div className="pa2-mp-grid">
                    {MANPOWER_DATA.map((op, i) => {
                        const color = op.eff >= 90 ? "#059669" : op.eff >= 70 ? "#f59e0b" : "#ef4444";
                        const bg = op.eff >= 90 ? "#d1fae5" : op.eff >= 70 ? "#fef3c7" : "#fee2e2";
                        const label = op.eff >= 90 ? "Excellent" : op.eff >= 70 ? "Good" : op.eff >= 50 ? "Average" : "Poor";
                        const initials = op.operator.split(" ").map(n => n[0]).join("").slice(0, 2);
                        return (
                            <div key={i} className="pa2-mp-card pa2-anim" style={{ "--d": `${i * 45}ms` }}>
                                <div className="pa2-mp-card-top">
                                    <div className="pa2-mp-avatar" style={{ background: bg, color }}>
                                        {initials}
                                    </div>
                                    <div className="pa2-mp-info">
                                        <div className="pa2-mp-name">{op.operator}</div>
                                        <div className="pa2-mp-dept">{op.dept}</div>
                                    </div>
                                    <span className="pa2-mp-badge" style={{ background: bg, color }}>{label}</span>
                                </div>
                                <div className="pa2-mp-eff-row">
                                    <span className="pa2-mp-eff-lbl">Efficiency</span>
                                    <span className="pa2-mp-eff-val" style={{ color }}>{op.eff}%</span>
                                </div>
                                <ProgressBar pct={op.eff} color={color} bg={bg} />
                                <div className="pa2-mp-stats">
                                    <div className="pa2-mp-stat">
                                        <span className="pa2-mp-stat-lbl">Shifts</span>
                                        <span className="pa2-mp-stat-val">{op.shifts}</span>
                                    </div>
                                    <div className="pa2-mp-stat">
                                        <span className="pa2-mp-stat-lbl">Target</span>
                                        <span className="pa2-mp-stat-val">{op.totalTarget.toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="pa2-mp-stat">
                                        <span className="pa2-mp-stat-lbl">OK Qty</span>
                                        <span className="pa2-mp-stat-val">{op.totalOk.toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="pa2-mp-stat">
                                        <span className="pa2-mp-stat-lbl">Attendance</span>
                                        <span className="pa2-mp-stat-val" style={{ color: op.attendance < 100 ? "#f59e0b" : "#059669" }}>
                                            {op.attendance}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div> */}

            {/* ── PRODUCTION DATA TABLE ────────────────────── */}
            <div className="pa2-card pa2-anim" style={{ "--d": "80ms" }}>
                <SectionHeader icon="▤" title="Daily Production Details" sub="Top 10 shift records" />
                <div className="pa2-table-wrap">
                    <table className="pa2-table">
                        <thead>
                            <tr>
                                {["#", "Date", "Machine", "Shift", "Operator", "Part", "Process", "Target", "OK Qty", "Rej", "Eff %", "OEE %", "Status"].map(h => (
                                    <th key={h}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {TABLE_DATA.map((row, i) => (
                                <tr key={row.id} className="pa2-anim" style={{ "--d": `${i * 40}ms` }}>
                                    <td className="pa2-td-muted">{row.id}</td>
                                    <td>{row.date}</td>
                                    <td><span className="pa2-machine-chip">{row.machine}</span></td>
                                    <td>{row.shift}</td>
                                    <td>{row.operator}</td>
                                    <td className="pa2-td-part">{row.part}</td>
                                    <td>{row.process}</td>
                                    <td className="pa2-td-num">{row.target.toLocaleString()}</td>
                                    <td className="pa2-td-num">{row.ok.toLocaleString()}</td>
                                    <td className="pa2-td-num" style={{ color: row.rej > 0 ? "#ef4444" : "#059669" }}>{row.rej}</td>
                                    <td className="pa2-td-num">{row.eff}</td>
                                    <td className="pa2-td-num">{row.oee}</td>
                                    <td><span className={`pa2-badge ${row.badge}`}>{row.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── FOOTER ───────────────────────────────────── */}
            {/* <div className="pa2-footer">
                © 2026 Anims ERP Manufacturing &nbsp;|&nbsp; Report: Feb 2026 &nbsp;|&nbsp; All Rights Reserved
            </div> */}

        </div>
    );
}