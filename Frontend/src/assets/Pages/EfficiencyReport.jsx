/**
 * EfficiencyReport.jsx  —  MIS › Efficiency Report
 * Theme: Anims ERP — matches DashboardLayout blue palette
 * Prefix: er-
 */
import { useState, useEffect, useMemo } from "react";
import "./EfficiencyReport.css";
import EfficiencyReportDatePicker from "./EfficiencyReportDatePicker";

/* ═══════════════════════════════════════════════════════
   RAW DATA
═══════════════════════════════════════════════════════ */
const RAW = [
    ["4384-Mathizhagan.K", "PRODUCTION", "VMC 24", 88.24, 100, 100, 1, 0, 1],
    ["NARENDRAN.S", "", "TC-59", 90.91, 100, 100, 0.5, 0, 2],
    ["Sadap Chandan S", "", "TC-14", 100, 100, 100, 0, 0, 3],
    ["AAKASH.L", "", "TC-02", 85.71, 100, 100, 0.5, 0, 4],
    ["BISWAMOHAN NAIK", "", "TC 42", 100, 100, 100, 0, 0, 5],
    ["Ramakrushna", "", "SPM-01", 92.86, 100, 100, 0.5, 0, 6],
    ["Santhana lakshmi", "", "SPM -04", 96.23, 99.79, 100, 0.25, 0, 7],
    ["DEEPU MADHAVAN", "", "TC-25", 99.21, 99.21, 100, 0, 0, 8],
    ["Selvaganesh.E", "", "spm -04", 99.21, 99.21, 100, 0, 0, 9],
    ["Ajil.S", "", "SPM -04", 99.21, 99.21, 100, 0, 0, 10],
    ["5002-Anjan Naik", "PRODUCTION", "TC-24-S2", 86.02, 98.77, 100, 1, 7, 11],
    ["3038-Karthi.S", "PRODUCTION", "TC-28", 46.44, 98.68, 100, 4.5, 3, 12],
    ["Sesuraj.R", "", "VMC 19", 87.06, 98.67, 100, 1, 0, 13],
    ["KUMARESAN.R", "", "TC 49", 95.38, 98.67, 100, 0.17, 0, 14],
    ["3048-Gopikrishnan.R", "PRODUCTION", "TC-13", 86.93, 98.52, 100, 1.5, 155, 15],
    ["Akash.A", "", "SPM-02", 77.32, 98.41, 100, 1.5, 0, 16],
    ["Mari.M", "", "VMC 24", 94.64, 98.15, 100, 0.25, 0, 17],
    ["Damodharan.N", "", "TC-27", 98.04, 98.04, 100, 0, 0, 18],
    ["Sesuraj.R", "", "TC 49", 98.04, 98.04, 100, 0, 0, 19],
    ["DEEPU MADHAVAN", "", "VMC-07", 86.27, 97.78, 100, 1, 0, 20],
    ["Althaf", "", "TC 45", 48.68, 97.36, 100, 3.5, 5, 21],
    ["Mayakrishnan.M", "", "BROACHING-3", 48.61, 97.22, 100, 0.5, 0, 22],
    ["Vigneshwaran.S", "", "TC-28", 55.43, 97, 100, 3, 3, 23],
    ["Akash.A", "", "TC-59", 94.63, 96.98, 100, 0.13, 0, 24],
    ["DEEPU MADHAVAN", "", "TC 49", 96.83, 96.83, 100, 0, 0, 25],
    ["3053-Ganesan.S", "PRODUCTION", "TC 43 L", 77.38, 96.53, 100, 1.08, 0, 26],
    ["Madheswaran.M", "", "TC 50", 79.41, 96.43, 100, 1.5, 0, 27],
    ["Lochan Naik", "", "VMC 21", 41.27, 96.3, 100, 2, 0, 28],
    ["3268-Krishnamoorthi.U", "PRODUCTION", "TC-15", 41.27, 96.3, 100, 5, 1, 29],
    ["Gopikrishnan.R", "", "TC 41 R", 82.54, 96.3, 100, 0.5, 2, 30],
    ["Anandhu Prakash C V", "", "TC-59", 84.43, 96.07, 100, 0.75, 0.5, 31],
    ["SIVAPRASANTH.K", "", "VMC 24", 87.52, 96.06, 100, 1.75, 0, 32],
    ["Guruprasanth.M", "", "TC-06", 89.17, 96.03, 100, 0.25, 47, 33],
    ["3255-Kalaiselvan.R", "PRODUCTION", "VMC-10", 80.44, 95.77, 100, 1, 1.75, 34],
    ["5046-Ramchandra Soran", "PRODUCTION", "BROACHING-1", 87.51, 95.52, 100, 0.33, 0, 35],
    ["Krishnamoorthi.U", "", "TC 41 R", 85.94, 95.49, 100, 0.5, 1, 36],
    ["Sadap Chandan S", "", "SPM -04", 89.87, 95.49, 100, 0.5, 0, 37],
    ["Kanniraja.M", "", "TC-10", 88.57, 95.38, 100, 0.25, 0, 38],
    ["4077-Alexpandiyan", "PRODUCTION", "SPM-03", 78.43, 95.24, 100, 1.5, 0, 39],
    ["KRUSHA MANIKA BABU", "", "TC-07", 78.24, 95, 100, 1.5, 2, 40],
    ["RAHUMAN", "", "TC-06", 75.83, 94.79, 100, 1, 3, 41],
    ["4402-Ebichristopher.J", "PRODUCTION", "TC-33", 91.96, 94.75, 100, 0.25, 0, 42],
    ["3258-Mari.M", "PRODUCTION", "TC-24 -S1", 85.52, 94.52, 100, 0.67, 0.67, 43],
    ["3258-Mari.M", "PRODUCTION", "TC-24-S2", 80.95, 94.44, 100, 1, 3, 44],
    ["1012-Ajith.B", "PRODUCTION", "TC-15", 72.16, 94.36, 100, 2, 1, 45],
    ["Santhana lakshmi", "", "TC 50", 93.95, 93.95, 100, 0, 0, 46],
    ["Rajkumar. S", "", "tc-59", 80.9, 93.9, 100, 1.08, 0, 47],
    ["3254-Mowlikannan.S", "PRODUCTION", "VTL-03", 83.81, 93.87, 100, 0.75, 0, 48],
    ["Nagamani", "", "TC-59", 81.1, 93.78, 100, 0.89, 0.44, 49],
    ["Ganesh.M", "", "VMC-03", 87.94, 93.44, 100, 0.5, 0, 50],
    ["5337-RANJAYKUMAR", "PRODUCTION", "BROACHING-1", 93.24, 93.24, 100, 0, 0, 51],
    ["GOBANDHAN MUNDEN", "", "TC 43 R", 86.51, 93.16, 100, 0.5, 4, 52],
    ["3048-Gopikrishnan.R", "PRODUCTION", "TC-37", 85.87, 92.91, 100, 0.31, 0, 53],
    ["Akhil.S", "", "VMC 24", 76.47, 92.86, 100, 1.5, 0, 54],
    ["NARENDRAN.S", "", "TC-11", 76.47, 92.86, 100, 1.5, 3, 55],
    ["3016-Mayakrishnan.M", "PRODUCTION", "SPM-01", 85.79, 92.86, 100, 0.5, 0, 56],
    ["GOWTHAM.M.C", "", "TC 49", 92.54, 92.54, 100, 0, 0, 57],
    ["AAKASH.L", "", "TC-59", 85.12, 92.54, 100, 0.38, 0, 58],
    ["3255-Kalaiselvan.R", "PRODUCTION", "TC-10", 80.44, 92.44, 100, 0.88, 0, 59],
    ["3255-Kalaiselvan.R", "PRODUCTION", "TC-04", 80.44, 92.44, 100, 0.88, 0, 60],
    ["Sadap Chandan S", "", "TC 49", 92.1, 92.1, 100, 0, 0, 61],
    ["1008-Arun kumar.T", "PRODUCTION", "TC-23", 78.43, 92.07, 100, 1.25, 0, 62],
    ["Ajil.S", "", "VMC-13", 91.67, 91.67, 100, 0, 0, 63],
    ["Karthi.S", "", "TC-59", 78.15, 91.36, 100, 0.85, 0.17, 64],
    ["5337-RANJAYKUMAR", "PRODUCTION", "BROACHING-2", 85.87, 91.17, 100, 0.38, 0, 65],
    ["5185-MOHAN KEWAT", "PRODUCTION", "BROACHING-1", 80.14, 90.93, 100, 0.5, 0, 66],
    ["Ajil.S", "", "VMC 19", 58.82, 90.91, 100, 3, 0, 67],
    ["4165-Prakash", "PRODUCTION", "VMC-10", 74.89, 90.52, 100, 1.25, 3.25, 68],
    ["Ramamoorthi.T", "", "TC-30", 63.33, 90.48, 100, 1.5, 0, 69],
    ["Anjan Naik", "", "tc-24 -s1", 74.51, 90.48, 100, 1.5, 0, 70],
    ["Kumbhakarna Dhungia", "", "SPM-03", 74.51, 90.48, 100, 1.5, 0, 71],
    ["Nararyanan.T", "", "TC-57", 90.28, 90.28, 100, 0, 0, 72],
    ["Ramamoorthi.T", "", "TC 49", 77.38, 90.28, 100, 1, 0, 73],
    ["Anjan Naik", "", "TC-22", 76.83, 90.18, 100, 0.91, 0, 74],
    ["3202-Manoj Kumar.B", "PRODUCTION", "TC-24 -S1", 73.99, 89.84, 100, 1.5, 3, 75],
    ["DEEPU MADHAVAN", "", "VMC-15", 78.82, 89.33, 100, 1, 0, 76],
    ["Pradeep", "", "TC-37", 80.21, 89.11, 100, 0.75, 0, 77],
    ["3058-Ganesh.M", "PRODUCTION", "TC-24 -S1", 78.43, 88.89, 100, 1, 0, 78],
    ["DEEPU MADHAVAN", "", "tc-20", 78.43, 88.89, 100, 1, 0, 79],
    ["3011-Suresh.T", "PRODUCTION", "SPM-03", 78.43, 88.89, 100, 1, 0, 80],
    ["3202-Manoj Kumar.B", "PRODUCTION", "TC-24-S2", 73.99, 88.77, 100, 1.42, 3.67, 81],
    ["NARENDRAN.S", "", "TC-28", 44.61, 88.69, 100, 3.01, 18.5, 82],
    ["ARUN MUNDA", "", "BROACHING-2", 58.62, 88.58, 100, 2.13, 0, 83],
    ["Vigneshwaran.S", "", "TC-37", 75.83, 88.47, 100, 1, 2, 84],
    ["Anjan Naik", "", "VMC-11", 85.49, 88.41, 100, 0.25, 0, 85],
    ["Kalaiselvan.R", "", "TC-04", 75.2, 88.33, 100, 1.46, 0, 86],
    ["5002-Anjan Naik", "PRODUCTION", "TC-21", 77.01, 88.18, 100, 0.75, 0, 87],
    ["Anjan Naik", "", "TC-20", 75.91, 88.06, 100, 0.79, 0.03, 88],
    ["4147-Rajkumar. S", "PRODUCTION", "TC-01", 75.36, 87.92, 100, 1, 7, 89],
    ["Nagamani", "", "TC-60", 69.09, 87.87, 100, 1.86, 1, 90],
    ["Ajil.S", "", "TC 49", 81.43, 87.69, 100, 0.5, 0, 91],
    ["Nararyanan.T", "", "TC-24-S2", 72.16, 87.62, 100, 1.5, 4, 92],
    ["Kalaiselvan.R", "", "TC-10", 74.71, 87.56, 100, 1.49, 0.13, 93],
    ["3067-Aravinth.G", "PRODUCTION", "VTL-03", 70, 87.5, 100, 1, 0, 94],
    ["Prabhakaran.M", "", "TC-10", 70, 87.5, 100, 1, 0, 95],
    ["Ajil.S", "", "tc 52", 72.06, 87.5, 100, 1.5, 0, 96],
    ["4165-Prakash", "PRODUCTION", "TC-04", 72.39, 87.39, 100, 1.19, 0, 97],
    ["3050-Madheswaran.M", "PRODUCTION", "TC-15", 74.88, 87.36, 100, 1, 0, 98],
    ["Ganesh.M", "", "VMC -23", 77.06, 87.33, 100, 1, 0, 99],
    ["Damodharan.N", "", "TC 50", 87.14, 87.14, 100, 0, 0, 100],
];

/* ═══════════════════════════════════════════════════════
   COLUMN DEFINITIONS
═══════════════════════════════════════════════════════ */
const COLS_OPERATOR = [
    { key: "rank", label: "RANK", idx: 8, num: false, cls: "er-rank-col" },
    { key: "op", label: "OPERATOR", idx: 0, num: false },
    { key: "dept", label: "DEPARTMENT", idx: 1, num: false },
    { key: "mac", label: "MAC NO", idx: 2, num: false },
    { key: "oaeff", label: "OA EFF %", idx: 3, num: true },
    { key: "opreff", label: "OPR EFF%", idx: 4, num: true },
    { key: "qfeff", label: "QF EFF%", idx: 5, num: true },
    { key: "idle", label: "IDLE TIME", idx: 6, num: true },
    { key: "rej", label: "REJ %", idx: 7, num: true },
];
const COLS_MACHINE = [
    { key: "rank", label: "RANK", idx: 8, num: false, cls: "er-rank-col" },
    { key: "dept", label: "DEPARTMENT", idx: 1, num: false },
    { key: "mac", label: "MAC NO", idx: 2, num: false },
    { key: "oaeff", label: "OA EFF %", idx: 3, num: true },
    { key: "opreff", label: "OPR EFF%", idx: 4, num: true },
    { key: "qfeff", label: "QF EFF%", idx: 5, num: true },
    { key: "idle", label: "IDLE TIME", idx: 6, num: true },
    { key: "rej", label: "REJ %", idx: 7, num: true },
];

const PAGE_SIZE = 25;

/* ═══════════════════════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════════════════════ */
function effColor(v) {
    if (v >= 90) return "#059669";
    if (v >= 75) return "#2d6de8";
    if (v >= 50) return "#d97706";
    return "#dc2626";
}

function EffCell({ v }) {
    const c = effColor(v);
    const w = Math.max(0, Math.min(100, v));
    return (
        <div className="er-eff-cell">
            <div className="er-eff-bar-wrap">
                <div className="er-eff-bar" style={{ width: `${w}%`, background: c }} />
            </div>
            <span className="er-eff-val" style={{ color: c }}>{v.toFixed(2)}</span>
        </div>
    );
}

function RankBadge({ r }) {
    const cls =
        r === 1 ? "er-rank--gold" :
            r === 2 ? "er-rank--silver" :
                r === 3 ? "er-rank--bronze" : "er-rank--normal";
    const pfx = r === 1 ? "🥇 " : r === 2 ? "🥈 " : r === 3 ? "🥉 " : "";
    return <span className={`er-rank-badge ${cls}`}>{pfx}{r}</span>;
}

function IdlePill({ v }) {
    const cls = v === 0 ? "er-pill--ok" : v <= 1.5 ? "er-pill--warn" : "er-pill--high";
    return <span className={`er-pill ${cls}`}>{v.toFixed(2)}h</span>;
}

function RejPill({ v }) {
    const cls = v === 0 ? "er-pill--ok" : v <= 3 ? "er-pill--warn" : "er-pill--high";
    return <span className={`er-pill ${cls}`}>{v.toFixed(2)}%</span>;
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function EfficiencyReport() {
    /* ── Filter state ── */
    const [dateRange, setDateRange] = useState({
        from: new Date(2026, 1, 1),
        to:   new Date(2026, 1, 27),
    });
    const fromDate = dateRange.from ? dateRange.from.toISOString().slice(0, 10) : "";
    const toDate   = dateRange.to   ? dateRange.to.toISOString().slice(0, 10)   : "";
    const [chkCNC, setChkCNC] = useState(true);
    const [chkConv, setChkConv] = useState(true);
    const [effType, setEffType] = useState("operator");
    const [teamName, setTeamName] = useState("");
    const [deptName, setDeptName] = useState("");
    const [opFilter, setOpFilter] = useState("");
    const [macFilter, setMacFilter] = useState("");
    const [reportType, setReportType] = useState("rank");
    const [search, setSearch] = useState("");

    /* ── Tab / sort / page ── */
    const [tab, setTab] = useState("operator");
    const [sortCol, setSortCol] = useState(8);
    const [sortDir, setSortDir] = useState(1);
    const [page, setPage] = useState(1);

    /* ── Live clock ── */
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    const timeStr = time.toLocaleTimeString("en-IN", { hour12: false });
    const dateStr = time.toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    }).replace(/ /g, "-");

    /* ── Filtered + sorted data ── */
    const filtered = useMemo(() => {
        let d = RAW.filter(r => {
            if (opFilter && !r[0].toLowerCase().includes(opFilter.toLowerCase())) return false;
            if (macFilter && !r[2].toLowerCase().includes(macFilter.toLowerCase())) return false;
            if (deptName && !(r[1] || "").toLowerCase().includes(deptName.toLowerCase())) return false;
            if (search) {
                const hay = (r[0] + r[1] + r[2]).toLowerCase();
                if (!hay.includes(search.toLowerCase())) return false;
            }
            return true;
        });

        if (reportType === "rank") d.sort((a, b) => a[8] - b[8]);
        else if (reportType === "operator") d.sort((a, b) => a[0].localeCompare(b[0]));
        else if (reportType === "dept") d.sort((a, b) => (a[1] || "").localeCompare(b[1] || ""));
        else if (reportType === "mac") d.sort((a, b) => a[2].localeCompare(b[2]));
        else if (reportType === "oee_desc") d.sort((a, b) => b[3] - a[3]);
        else if (reportType === "oee_asc") d.sort((a, b) => a[3] - b[3]);

        d = [...d].sort((a, b) => {
            const va = a[sortCol], vb = b[sortCol];
            if (typeof va === "number") return (va - vb) * sortDir;
            return (va || "").localeCompare(vb || "") * sortDir;
        });

        return d;
    }, [opFilter, macFilter, deptName, search, reportType, sortCol, sortDir]);

    /* ── KPIs ── */
    const kpi = useMemo(() => {
        const n = filtered.length;
        if (!n) return { n: 0, oee: "—", opr: "—", idle: "—", rej: "—" };
        const avg = idx => filtered.reduce((s, r) => s + r[idx], 0) / n;
        return {
            n,
            oee: avg(3).toFixed(1) + "%",
            opr: avg(4).toFixed(1) + "%",
            idle: avg(6).toFixed(2) + "h",
            rej: avg(7).toFixed(2) + "%",
        };
    }, [filtered]);

    /* ── Pagination ── */
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safeP = Math.min(page, totalPages);
    const slice = filtered.slice((safeP - 1) * PAGE_SIZE, safeP * PAGE_SIZE);

    /* ── Column set ── */
    const cols = tab === "machine" ? COLS_MACHINE : COLS_OPERATOR;

    /* ── Handlers ── */
    function doSort(idx) {
        if (sortCol === idx) setSortDir(d => -d);
        else { setSortCol(idx); setSortDir(1); }
        setPage(1);
    }

    function handleTab(t) {
        setTab(t);
        if (t === "machine") setEffType("machine");
        else if (t === "operator") setEffType("operator");
        setPage(1);
    }

    function handleEffType(v) {
        setEffType(v);
        if (v === "machine" || v === "machine_month") setTab("machine");
        else if (v === "component") setTab("component");
        else setTab("operator");
        setPage(1);
    }

    function exportCSV() {
        const headers = ["OPERATOR", "DEPARTMENT", "MAC NO", "OA EFF%", "OPR EFF%", "QF EFF%", "IDLE TIME%", "REJ%", "RANK"];
        const rows = filtered.map(r => r.join(","));
        const blob = new Blob([headers.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "efficiency_report.csv"; a.click();
        URL.revokeObjectURL(url);
    }

    function pageButtons() {
        const btns = [];
        let lo = Math.max(1, safeP - 3);
        let hi = Math.min(totalPages, lo + 6);
        if (hi - lo < 6) lo = Math.max(1, hi - 6);
        if (lo > 1) { btns.push(1); btns.push("…"); }
        for (let p = lo; p <= hi; p++) btns.push(p);
        if (hi < totalPages) { btns.push("…"); btns.push(totalPages); }
        return btns;
    }

    /* ── Cell renderer ── */
    function renderCell(row, col) {
        const v = row[col.idx];
        switch (col.key) {
            case "rank": return <td key={col.key} className="er-td-rank"><RankBadge r={v} /></td>;
            case "op": return <td key={col.key} className="er-td-op">{v || "—"}</td>;
            case "dept": return <td key={col.key} className="er-td-dept">{v || "—"}</td>;
            case "mac": return <td key={col.key} className="er-td-mac">{v}</td>;
            case "oaeff":
            case "opreff":
            case "qfeff": return <td key={col.key} className="er-td-num"><EffCell v={v} /></td>;
            case "idle": return <td key={col.key} className="er-td-num"><IdlePill v={v} /></td>;
            case "rej": return <td key={col.key} className="er-td-num"><RejPill v={v} /></td>;
            default: return <td key={col.key} className="er-td-num">{v}</td>;
        }
    }

    /* ═══════════ RENDER ═══════════ */
    return (
        <div className="er-root">

            {/* ══ FILTER PANEL ══ */}
            <div className="er-filter-panel">

                {/* Row 1 — dates, machine type, efficiency type, clock */}
                <div className="er-filter-row">
                    <div className="er-fgroup er-fgroup--daterange">
                        <span className="er-flabel">Date Range</span>
                        <EfficiencyReportDatePicker
                            from={dateRange.from}
                            to={dateRange.to}
                            onChange={setDateRange}
                        />
                    </div>

                    <div className="er-fcheck-group">
                        <label className="er-fcheck-item">
                            <input type="checkbox" checked={chkCNC}
                                onChange={e => setChkCNC(e.target.checked)} />
                            <span>CNC</span>
                        </label>
                        <label className="er-fcheck-item">
                            <input type="checkbox" checked={chkConv}
                                onChange={e => setChkConv(e.target.checked)} />
                            <span>CONVENTIONAL</span>
                        </label>
                    </div>

                    <div className="er-filter-sep" />

                    {/* <div className="er-fgroup">
                        <span className="er-flabel">Efficiency Type</span>
                        <select className="er-fselect" value={effType}
                            onChange={e => handleEffType(e.target.value)}>
                            <option value="operator">Operator Efficiency</option>
                            <option value="operator_date">Operator Eff. Date Wise</option>
                            <option value="operator_date_all">Operator Eff. All Machine</option>
                            <option value="component">Component Efficiency</option>
                            <option value="machine">Machine Efficiency</option>
                            <option value="operator_month">Operator Eff. Month Wise</option>
                            <option value="machine_month">Machine Eff. Month Wise</option>
                        </select>
                    </div> */}

                    {/* Live clock */}
                    {/* <div className="er-clock">
                        <span className="er-clock__dot" />
                        <span className="er-clock__time">{timeStr}</span>
                        <span className="er-clock__date">{dateStr}</span>
                    </div> */}
                </div>

                {/* Row 2 — team, dept, operator, machine, report type, actions */}
                <div className="er-filter-row">
                    {/* <div className="er-fgroup">
                        <span className="er-flabel">Team</span>
                        <input className="er-finput" type="text" placeholder="All Teams"
                            value={teamName} onChange={e => setTeamName(e.target.value)} />
                    </div>
                    <div className="er-fgroup">
                        <span className="er-flabel">Dept</span>
                        <input className="er-finput" type="text" placeholder="All Depts"
                            value={deptName} onChange={e => setDeptName(e.target.value)} />
                    </div>
                    <div className="er-fgroup">
                        <span className="er-flabel">Operator</span>
                        <input className="er-finput" type="text" placeholder="All Operators"
                            value={opFilter} onChange={e => setOpFilter(e.target.value)} />
                    </div>
                    <div className="er-fgroup">
                        <span className="er-flabel">Mac No</span>
                        <input className="er-finput er-finput--sm" type="text" placeholder="All"
                            value={macFilter} onChange={e => setMacFilter(e.target.value)} />
                    </div> */}
                    {/* <div className="er-fgroup">
                        <span className="er-flabel">Report Type</span>
                        <select className="er-fselect" value={reportType}
                            onChange={e => { setReportType(e.target.value); setPage(1); }}>
                            <option value="rank">Order By Rank</option>
                            <option value="operator">Order By Operator</option>
                            <option value="dept">Order By Department</option>
                            <option value="mac">Order By Machine</option>
                            <option value="oee_desc">OA EFF% High → Low</option>
                            <option value="oee_asc">OA EFF% Low → High</option>
                        </select>
                    </div> */}

                    <div className="er-filter-sep" />
                    {/* <button className="er-btn-gen" onClick={() => setPage(1)}>⚡ Generate</button>
                    <button className="er-btn-outline" onClick={() => window.print()}>🖨 Print</button>
                    <button className="er-btn-outline" onClick={exportCSV}>📥 Export</button> */}
                </div>
            </div>

            {/* ══ TAB BAR ══ */}
            <div className="er-tabbar">
                {[
                    ["operator", "Operator Efficiency"],
                    ["machine", "Machine Efficiency"],
                ].map(([key, lbl]) => (
                    <button
                        key={key}
                        className={`er-tab ${tab === key ? "er-tab--active" : ""}`}
                        onClick={() => handleTab(key)}
                    >
                        {lbl}
                    </button>
                ))}
            </div>

            {/* ══ KPI STRIP ══ */}
            <div className="er-kpi-strip">
                {[
                    { id: "n", label: "Total Records", val: kpi.n, color: "cyan" },
                    { id: "oee", label: "Avg OA Eff %", val: kpi.oee, color: "green" },
                    { id: "opr", label: "Avg Opr Eff %", val: kpi.opr, color: "blue" },
                    { id: "idle", label: "Avg Idle Time", val: kpi.idle, color: "amber" },
                    { id: "rej", label: "Avg Rej %", val: kpi.rej, color: "red" },
                ].map(k => (
                    <div key={k.id} className={`er-kpi er-kpi--${k.color}`}>
                        <div className={`er-kpi__val er-kpi__val--${k.color}`}>{k.val}</div>
                        <div className="er-kpi__lbl">{k.label}</div>
                    </div>
                ))}

                {/* Colour Legend */}
                <div className="er-legend">
                    {[
                        ["#059669", "≥ 90%"],
                        ["#2d6de8", "75–90%"],
                        ["#d97706", "50–75%"],
                        ["#dc2626", "< 50%"],
                    ].map(([c, l]) => (
                        <div key={l} className="er-leg-item">
                            <span className="er-leg-dot" style={{ background: c }} />
                            <span>{l}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══ TABLE AREA ══ */}
            <div className="er-table-area">

                {/* Toolbar */}
                <div className="er-toolbar">
                    <div className="er-search-wrap">
                        <span className="er-search-ico">⌕</span>
                        <input
                            className="er-search"
                            type="text"
                            placeholder="Search operator / machine…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <span className="er-rec-badge">{kpi.n} records</span>
                    <span className="er-page-info">
                        Page {safeP} of {totalPages} · {filtered.length} records
                    </span>
                </div>

                {/* Table */}
                <div className="er-tbl-scroll">
                    <table className="er-table">
                        <thead>
                            <tr>
                                {cols.map(c => (
                                    <th
                                        key={c.key}
                                        className={[
                                            c.num ? "er-th-num" : "",
                                            c.cls ? c.cls : "",
                                            sortCol === c.idx ? "er-th--sorted" : "",
                                        ].filter(Boolean).join(" ")}
                                        onClick={() => doSort(c.idx)}
                                    >
                                        {c.label}
                                        <span className="er-sort-ico">
                                            {sortCol === c.idx ? (sortDir === 1 ? " ▲" : " ▼") : " ⇅"}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {slice.length === 0 ? (
                                <tr>
                                    <td colSpan={cols.length}>
                                        <div className="er-empty">
                                            <span className="er-empty__ico">🔍</span>
                                            <p>No records match your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                slice.map((row, i) => (
                                    <tr
                                        key={i}
                                        className={i % 2 === 1 ? "er-tr--even" : ""}
                                        style={{ animationDelay: `${i * 18}ms` }}
                                    >
                                        {cols.map(c => renderCell(row, c))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="er-pagination">
                    <button
                        className="er-pg-btn"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={safeP === 1}
                    >‹</button>

                    {pageButtons().map((b, i) =>
                        b === "…"
                            ? <span key={`ellipsis-${i}`} className="er-pg-ellipsis">…</span>
                            : <button
                                key={b}
                                className={`er-pg-btn ${b === safeP ? "er-pg-btn--active" : ""}`}
                                onClick={() => setPage(b)}
                            >{b}</button>
                    )}

                    <button
                        className="er-pg-btn"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={safeP === totalPages}
                    >›</button>

                    <span className="er-pg-info">
                        Showing {(safeP - 1) * PAGE_SIZE + 1}–{Math.min(safeP * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </span>
                </div>
            </div>

        </div>
    );
}