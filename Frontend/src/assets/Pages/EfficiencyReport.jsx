/**
 * EfficiencyReport.jsx  —  MIS › Efficiency Report
 * Theme: Anims ERP — matches DashboardLayout blue palette
 * Prefix: er-
 */
import { useState, useEffect, useMemo } from "react";
import { resolveApiBase } from "../../apiBase";
import "./EfficiencyReport.css";
import EfficiencyReportDatePicker from "./EfficiencyReportDatePicker";

const API_BASE = resolveApiBase();

function toIsoDate(d) {
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

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

export default function EfficiencyReport() {
    /* ── Filter state ── */
    const _dflt = { from: new Date(2026, 1, 1), to: new Date(2026, 1, 27) };
    const _saved = readFilterSession("ba_filter_efficiency", _dflt);
    const [dateRange, setDateRange] = useState({ from: _saved.from, to: _saved.to });
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
    const [tableData, setTableData] = useState([]);

    /* ── Load operator / machine table from API ── */
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        // ✅ Persist date range to sessionStorage on every change
        writeFilterSession("ba_filter_efficiency", { from: dateRange.from, to: dateRange.to });
        const params = new URLSearchParams({
            from: toIsoDate(dateRange.from),
            to: toIsoDate(dateRange.to),
            cnc: chkCNC ? "1" : "0",
            conv: chkConv ? "1" : "0",
            tab,
        });
        fetch(`${API_BASE}/efficiency-report/?${params}`, { credentials: "include" })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data?.error || "efficiency-report failed");
                return data;
            })
            .then(data => {
                setTableData(Array.isArray(data?.rows) ? data.rows : []);
                setPage(1);
            })
            .catch(() => setTableData([]));
    }, [dateRange.from, dateRange.to, chkCNC, chkConv, tab]);

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
        let d = tableData.filter(r => {
            if (opFilter && !(r[0] || "").toLowerCase().includes(opFilter.toLowerCase())) return false;
            if (macFilter && !(r[2] || "").toLowerCase().includes(macFilter.toLowerCase())) return false;
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
    }, [tableData, opFilter, macFilter, deptName, search, reportType, sortCol, sortDir]);

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