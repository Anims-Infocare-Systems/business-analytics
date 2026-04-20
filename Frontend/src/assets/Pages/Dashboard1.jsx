import { useEffect, useRef, useState, useCallback } from "react";
import "./Dashboard1.css";

// ════════════════════════════════════════════
//  Canvas Chart Helpers
// ════════════════════════════════════════════
const DPR = window.devicePixelRatio || 1;

function setupCanvas(canvas, h) {
    if (!canvas) return null;
    const w = canvas.parentElement.getBoundingClientRect().width - 32;
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(DPR, DPR);
    return { ctx, w, h };
}

function drawSparkline(canvas, data, color) {
    const s = setupCanvas(canvas, 30);
    if (!s) return;
    const { ctx, w, h } = s;
    const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
    const px = (i) => i * (w / (data.length - 1));
    const py = (v) => h - 3 - ((v - mn) / rng) * (h - 6);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, color + "40");
    g.addColorStop(1, color + "00");
    ctx.beginPath();
    ctx.moveTo(px(0), py(data[0]));
    for (let i = 1; i < data.length; i++) {
        const cx = (px(i - 1) + px(i)) / 2;
        ctx.bezierCurveTo(cx, py(data[i - 1]), cx, py(data[i]), px(i), py(data[i]));
    }
    ctx.lineTo(px(data.length - 1), h);
    ctx.lineTo(px(0), h);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px(0), py(data[0]));
    for (let i = 1; i < data.length; i++) {
        const cx = (px(i - 1) + px(i)) / 2;
        ctx.bezierCurveTo(cx, py(data[i - 1]), cx, py(data[i]), px(i), py(data[i]));
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawBarChart(canvas, labels, sets, h = 118) {
    const s = setupCanvas(canvas, h);
    if (!s) return;
    const { ctx, w } = s;
    const pad = { l: 32, r: 6, t: 6, b: 20 };
    const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    const all = sets.flatMap((d) => d.data);
    const mx = Math.max(...all) * 1.18;
    for (let i = 0; i <= 4; i++) {
        const y = pad.t + ch - i * (ch / 4);
        ctx.strokeStyle = "rgba(228,233,242,0.9)";
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke();
        const v = (mx * i) / 4;
        ctx.fillStyle = "#94a3b8";
        ctx.font = "9px 'DM Sans',sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(v >= 100 ? (v / 100).toFixed(0) + "H" : v.toFixed(0), pad.l - 4, y + 3);
    }
    const ng = labels.length, nb = sets.length, gap = 3;
    const bw = cw / ng, bW = (bw - gap * (nb + 1)) / nb;
    sets.forEach((ds, di) =>
        ds.data.forEach((val, gi) => {
            const bh = (val / mx) * ch;
            const x = pad.l + gi * bw + gap + di * (bW + gap);
            const y = pad.t + ch - bh;
            const g2 = ctx.createLinearGradient(0, y, 0, y + bh);
            g2.addColorStop(0, ds.color);
            g2.addColorStop(1, ds.color + "88");
            ctx.fillStyle = g2;
            const r = Math.min(4, bW / 2);
            ctx.beginPath();
            ctx.moveTo(x + r, y); ctx.lineTo(x + bW - r, y);
            ctx.quadraticCurveTo(x + bW, y, x + bW, y + r);
            ctx.lineTo(x + bW, y + bh); ctx.lineTo(x, y + bh); ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath(); ctx.fill();
        })
    );
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px 'DM Sans',sans-serif";
    ctx.textAlign = "center";
    labels.forEach((l, i) => ctx.fillText(l, pad.l + i * bw + bw / 2, h - 4));
}

function drawLineChart(canvas, sets, range, h = 118) {
    const s = setupCanvas(canvas, h);
    if (!s) return;
    const { ctx, w } = s;
    const pad = { l: 32, r: 6, t: 6, b: 20 };
    const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    const [mn, mx] = range;
    for (let i = 0; i <= 4; i++) {
        const y = pad.t + ch * (1 - i / 4);
        ctx.strokeStyle = "rgba(228,233,242,0.9)";
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke();
        const v = mn + (mx - mn) * (i / 4);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "9px 'DM Sans',sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(
            Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + "K" : v.toFixed(0),
            pad.l - 4, y + 3
        );
    }
    sets.forEach((ds) => {
        const n = ds.data.length;
        const px = (i) => pad.l + i * (cw / (n - 1));
        const py = (v) => pad.t + ch * (1 - (v - mn) / (mx - mn));
        const g3 = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
        g3.addColorStop(0, ds.color + "2a");
        g3.addColorStop(1, ds.color + "00");
        ctx.beginPath();
        ctx.moveTo(px(0), py(ds.data[0]));
        for (let i = 1; i < n; i++) {
            const cx = (px(i - 1) + px(i)) / 2;
            ctx.bezierCurveTo(cx, py(ds.data[i - 1]), cx, py(ds.data[i]), px(i), py(ds.data[i]));
        }
        ctx.lineTo(px(n - 1), pad.t + ch);
        ctx.lineTo(px(0), pad.t + ch);
        ctx.closePath();
        ctx.fillStyle = g3; ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px(0), py(ds.data[0]));
        for (let i = 1; i < n; i++) {
            const cx = (px(i - 1) + px(i)) / 2;
            ctx.bezierCurveTo(cx, py(ds.data[i - 1]), cx, py(ds.data[i]), px(i), py(ds.data[i]));
        }
        ctx.strokeStyle = ds.color; ctx.lineWidth = 2.2; ctx.stroke();
        for (let i = 0; i < n; i++) {
            ctx.beginPath();
            ctx.arc(px(i), py(ds.data[i]), 2.8, 0, Math.PI * 2);
            ctx.fillStyle = "#fff"; ctx.fill();
            ctx.strokeStyle = ds.color; ctx.lineWidth = 2; ctx.stroke();
        }
    });
}

// ════════════════════════════════════════════
//  Year–Month Picker
// ════════════════════════════════════════════
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function YearMonthPicker({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [yearView, setYearView] = useState(value.year);
    const [animDir, setAnimDir] = useState(null);
    // "right" = panel opens leftward (aligns to right edge of chip)
    // "left"  = panel opens rightward (aligns to left edge of chip)
    const [panelAlign, setPanelAlign] = useState("right");
    const wrapRef = useRef(null);
    const chipRef = useRef(null);

    // ── Close on outside click ────────────────────────────────
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // ── Detect which side has more room when opening ──────────
    const handleOpen = () => {
        if (!open && chipRef.current) {
            const rect = chipRef.current.getBoundingClientRect();
            const spaceRight = window.innerWidth - rect.left;
            const panelWidth = 272;
            // If not enough room to the right → right-align (open leftward)
            setPanelAlign(spaceRight < panelWidth + 16 ? "right" : "left");
        }
        setOpen(o => !o);
    };

    useEffect(() => { if (open) setYearView(value.year); }, [open, value.year]);

    const shiftYear = (dir) => {
        setAnimDir(dir > 0 ? "up" : "down");
        setTimeout(() => setAnimDir(null), 300);
        setYearView(y => y + dir);
    };

    const selectMonth = (monthIdx) => {
        onChange({ year: yearView, month: monthIdx });
        setOpen(false);
    };

    return (
        <div className="d1-ymp" ref={wrapRef}>
            <button
                ref={chipRef}
                className={`d1-ymp__chip ${open ? "d1-ymp__chip--open" : ""}`}
                onClick={handleOpen}
                type="button"
            >
                <span className="d1-ymp__chip-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <rect x="3" y="4" width="18" height="18" rx="2.5" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                </span>
                <span className="d1-ymp__chip-text">
                    <span className="d1-ymp__chip-year">{value.year}</span>
                    <span className="d1-ymp__chip-sep">·</span>
                    <span className="d1-ymp__chip-month">{MONTHS_SHORT[value.month]}</span>
                </span>
                <span className={`d1-ymp__chip-caret ${open ? "d1-ymp__chip-caret--open" : ""}`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                        <polyline points="6,9 12,15 18,9" />
                    </svg>
                </span>
            </button>

            {open && (
                <div className={`d1-ymp__panel d1-ymp__panel--${panelAlign}`}>
                    {/* Drag handle — visible on mobile bottom sheet only */}
                    <div className="d1-ymp__handle" />
                    <div className="d1-ymp__glow" />

                    {/* ── Year row ── */}
                    <div className="d1-ymp__year-row">
                        <button className="d1-ymp__yr-nav" onClick={() => shiftYear(-1)} type="button" aria-label="Previous year">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6" /></svg>
                        </button>
                        <div className={`d1-ymp__year-display ${animDir ? `d1-ymp__year-display--${animDir}` : ""}`}>
                            <span className="d1-ymp__year-num">{yearView}</span>
                            {yearView === new Date().getFullYear() && (
                                <span className="d1-ymp__year-badge">Current</span>
                            )}
                        </div>
                        <button className="d1-ymp__yr-nav" onClick={() => shiftYear(+1)} type="button" aria-label="Next year">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,6 15,12 9,18" /></svg>
                        </button>
                    </div>

                    <div className="d1-ymp__divider" />

                    {/* ── Month grid ── */}
                    <div className="d1-ymp__months">
                        {MONTHS_SHORT.map((m, i) => {
                            const isSelected = value.year === yearView && value.month === i;
                            const isCurrentMonth = new Date().getFullYear() === yearView && new Date().getMonth() === i;
                            return (
                                <button
                                    key={m}
                                    className={[
                                        "d1-ymp__month",
                                        isSelected ? "d1-ymp__month--selected" : "",
                                        isCurrentMonth && !isSelected ? "d1-ymp__month--current" : "",
                                    ].join(" ")}
                                    style={{ "--mi": i }}
                                    onClick={() => selectMonth(i)}
                                    type="button"
                                >
                                    <span className="d1-ymp__month-label">{m}</span>
                                    {isSelected && (
                                        <span className="d1-ymp__month-check">
                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Footer ── */}
                    <div className="d1-ymp__footer">
                        <span className="d1-ymp__footer-label">
                            {MONTHS_FULL[value.month]} {value.year}
                        </span>
                        <button
                            className="d1-ymp__today-btn"
                            onClick={() => {
                                onChange({ year: new Date().getFullYear(), month: new Date().getMonth() });
                                setOpen(false);
                            }}
                            type="button"
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════
//  KPI Card
// ════════════════════════════════════════════
function KpiCard({ kgrad, kbg, kclr, animDelay, icon, delta, deltaType, label, value, footer, sparkData, sparkColor, collapsed }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!collapsed && canvasRef.current) {
            drawSparkline(canvasRef.current, sparkData, sparkColor);
        }
    }, [sparkData, sparkColor, collapsed]);

    return (
        <div
            className={`d1-kc${collapsed ? " d1-kc--collapsed" : ""}`}
            style={{ "--d1-kgrad": kgrad, "--d1-kbg": kbg, "--d1-kclr": kclr, animationDelay: animDelay }}
        >
            <div className="d1-kc__top">
                <div className="d1-kc__ico">{icon}</div>
                <span className={`d1-kc__delta ${deltaType === "up" ? "d1-kc__delta--up" : deltaType === "dn" ? "d1-kc__delta--dn" : "d1-kc__delta--na"}`}>
                    {delta}
                </span>
            </div>
            <div className="d1-kc__body">
                <div className="d1-kc__label">{label}</div>
                <div className="d1-kc__val"><span className="d1-kc__curr">₹</span>{value}</div>
                <div className="d1-kc__footer">{footer}</div>
                <canvas ref={canvasRef} className="d1-kc__spark" height="30" />
            </div>
        </div>
    );
}

// ════════════════════════════════════════════
//  Chart Card
// ════════════════════════════════════════════
function ChartCard({ title, legend, drawFn, deps, collapsed }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!collapsed && canvasRef.current) drawFn(canvasRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, collapsed]);

    return (
        <div className={`d1-cc${collapsed ? " d1-cc--collapsed" : ""}`}>
            <div className="d1-cc__hd">
                <div className="d1-cc__title">{title}</div>
                <div className="d1-cc__legend">
                    {legend.map((l) => (
                        <span key={l.label} className="d1-cc__leg">
                            <span className="d1-cc__leg-dot" style={{ background: l.color, borderRadius: l.round ? "50%" : "2px" }} />
                            {l.label}
                        </span>
                    ))}
                </div>
            </div>
            <div className="d1-cc__body">
                <canvas ref={canvasRef} height="118" />
            </div>
        </div>
    );
}

// ════════════════════════════════════════════
//  Analysis Table
// ════════════════════════════════════════════
function AnalysisTable({ title, sub, badgeLabel, badgeBg, badgeColor, headers, rows, collapsed }) {
    return (
        <div className={`d1-tc${collapsed ? " d1-tc--collapsed" : ""}`}>
            <div className="d1-tc__hd">
                <div>
                    <div className="d1-tc__title">{title}</div>
                    <div className="d1-tc__sub">{sub}</div>
                </div>
                <span className="d1-tc__badge" style={{ background: badgeBg, color: badgeColor }}>{badgeLabel}</span>
            </div>
            <div className="d1-tc__body">
                <table className="d1-table">
                    <thead>
                        <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr key={ri} className={row.rowClass || ""}>
                                {row.cells.map((cell, ci) => (
                                    <td key={ci} className={cell.cls || ""}>{cell.val}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════
//  Section Header
// ════════════════════════════════════════════
function SectionHeader({ title, collapsed, onToggle, accent }) {
    return (
        <div className="d1-sec-hd" style={{ "--d1-sec-accent": accent }}>
            <span className="d1-sec-hd__title">{title}</span>
            <button className="d1-sec-hd__toggle" onClick={onToggle} type="button" aria-label={collapsed ? "Expand" : "Collapse"}>
                <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .28s cubic-bezier(.34,1.4,.64,1)" }}
                >
                    <polyline points="6,9 12,15 18,9" />
                </svg>
                <span>{collapsed ? "Expand" : "Collapse"}</span>
            </button>
        </div>
    );
}

// ════════════════════════════════════════════
//  Refresh Icon
// ════════════════════════════════════════════
function RefreshIcon({ spinning }) {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={spinning ? "d1-spinning" : ""}>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
    );
}

// ════════════════════════════════════════════
//  Main Dashboard1 Component
// ════════════════════════════════════════════
export default function Dashboard1() {
    const [spinning, setSpinning] = useState(false);
    const [period, setPeriod] = useState({ year: 2026, month: 2 });

    const [kpiCollapsed, setKpiCollapsed] = useState(false);
    const [chartsCollapsed, setChartsCollapsed] = useState(false);
    const [tablesCollapsed, setTablesCollapsed] = useState(false);

    const handleRefresh = () => {
        setSpinning(true);
        setTimeout(() => setSpinning(false), 900);
    };

    const kpiCards = [
        {
            kgrad: "linear-gradient(90deg,#1a56db,#38bdf8)", kbg: "#eff4ff", kclr: "#1a56db", animDelay: "0s",
            icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>),
            delta: "↑ 12.4%", deltaType: "up", label: "Sales Value",
            value: "3,16,98,201", footer: `${MONTHS_FULL[period.month]} ${period.year} · Financial Year`,
            sparkData: [278, 305, 292, 328, 310, 335, 317], sparkColor: "#1a56db",
        },
        {
            kgrad: "linear-gradient(90deg,#f59e0b,#fbbf24)", kbg: "#fffbeb", kclr: "#b45309", animDelay: ".07s",
            icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>),
            delta: "↓ 3.1%", deltaType: "dn", label: "Purchase Value",
            value: "2,05,32,587", footer: `${MONTHS_FULL[period.month]} ${period.year} · Financial Year`,
            sparkData: [218, 200, 225, 208, 234, 211, 205], sparkColor: "#f59e0b",
        },
        {
            kgrad: "linear-gradient(90deg,#10b981,#34d399)", kbg: "#ecfdf5", kclr: "#059669", animDelay: ".14s",
            icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h.01M7 20v-4" /><path d="M12 20V10" /><path d="M17 20V4" /><path d="M22 20h.01" /></svg>),
            delta: "↑ 8.7%", deltaType: "up", label: "Production Value",
            value: "10,17,528", footer: `${MONTHS_FULL[period.month]} ${period.year} · Financial Year`,
            sparkData: [90, 104, 97, 112, 106, 99, 102], sparkColor: "#10b981",
        },
        {
            kgrad: "linear-gradient(90deg,#8b5cf6,#c4b5fd)", kbg: "#f5f3ff", kclr: "#7c3aed", animDelay: ".21s",
            icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>),
            delta: "↑ 5.2%", deltaType: "up", label: "Quality Value",
            value: "1,66,71,682", footer: `${MONTHS_FULL[period.month]} ${period.year} · Financial Year`,
            sparkData: [152, 160, 145, 168, 157, 164, 167], sparkColor: "#8b5cf6",
        },
    ];

    const chartCards = [
        {
            title: "Sales Projections in Lakhs",
            legend: [{ label: "Sales", color: "#1a56db" }, { label: "Projections", color: "#f59e0b" }],
            drawFn: (c) => drawBarChart(c, ["M1", "M2", "M3", "M4", "M5"], [
                { data: [313, 319, 316, 328, 317], color: "#1a56db" },
                { data: [322, 338, 328, 342, 332], color: "#f59e0b" },
            ]),
        },
        {
            title: "Purchase Projections in Lakhs",
            legend: [{ label: "PO", color: "#1a56db" }, { label: "GRN", color: "#f59e0b" }],
            drawFn: (c) => drawBarChart(c, ["M1", "M2", "M3", "M4", "M5"], [
                { data: [2760, 3050, 2900, 3450, 3078], color: "#1a56db" },
                { data: [175, 204, 192, 228, 205], color: "#f59e0b" },
            ]),
        },
        {
            title: "OA Efficiency % — Weekly",
            legend: [{ label: "OA %", color: "#10b981", round: true }],
            drawFn: (c) => drawLineChart(c, [{ data: [71, 74.5, 67.8, 70.5, 73.2, 69.8, 72.01], color: "#10b981" }], [60, 80]),
        },
        {
            title: "Quality Rejections — Weekly",
            legend: [{ label: "Mac Rej", color: "#ef4444", round: true }, { label: "Mat Rej", color: "#1a56db", round: true }],
            drawFn: (c) => drawLineChart(c, [
                { data: [27000, 31500, 14500, 23000, 37000, 21500, 23262], color: "#ef4444" },
                { data: [34000, 39500, 19500, 29000, 41000, 35500, 39292], color: "#1a56db" },
            ], [-2000, 46000]),
        },
    ];

    const tables = [
        {
            title: "Sales Analysis", sub: "in Lakhs (₹)",
            badgeLabel: "Sales", badgeBg: "#eff4ff", badgeColor: "#1a56db",
            headers: ["Desc", "Sales", "LAB", "Exp", "Total"],
            rows: [
                { cells: [{ val: "Today" }, { val: "0", cls: "d1-td-zero" }, { val: "0", cls: "d1-td-zero" }, { val: "0", cls: "d1-td-zero" }, { val: "0", cls: "d1-td-zero" }] },
                { cells: [{ val: "YDA" }, { val: "0", cls: "d1-td-zero" }, { val: "0", cls: "d1-td-zero" }, { val: "0", cls: "d1-td-zero" }, { val: "0", cls: "d1-td-zero" }] },
                { rowClass: "d1-row-month", cells: [{ val: "Month" }, { val: "316.98", cls: "d1-td-num" }, { val: "0", cls: "d1-td-zero" }, { val: "0", cls: "d1-td-zero" }, { val: "316.98", cls: "d1-td-num" }] },
                { rowClass: "d1-row-qtr", cells: [{ val: "Qtr." }, { val: "610.56", cls: "d1-td-num" }, { val: "0", cls: "d1-td-zero" }, { val: "0", cls: "d1-td-zero" }, { val: "610.56", cls: "d1-td-num" }] },
                { rowClass: "d1-row-fin", cells: [{ val: "Fin" }, { val: "2585.37", cls: "d1-td-num" }, { val: "0", cls: "d1-td-zero" }, { val: "0", cls: "d1-td-zero" }, { val: "2585.37", cls: "d1-td-num" }] },
            ],
        },
        {
            title: "Purchase Analysis", sub: "in Lakhs (₹)",
            badgeLabel: "Purchase", badgeBg: "#fffbeb", badgeColor: "#b45309",
            headers: ["Description", "PO", "GRN"],
            rows: [
                { cells: [{ val: "Today" }, { val: "0", cls: "d1-td-zero" }, { val: "0", cls: "d1-td-zero" }] },
                { cells: [{ val: "YDA" }, { val: "0", cls: "d1-td-zero" }, { val: "0", cls: "d1-td-zero" }] },
                { rowClass: "d1-row-month", cells: [{ val: "Month" }, { val: "3078.38", cls: "d1-td-num" }, { val: "205.33", cls: "d1-td-num" }] },
                { rowClass: "d1-row-qtr", cells: [{ val: "Qtr." }, { val: "11582.09", cls: "d1-td-num" }, { val: "363.71", cls: "d1-td-num" }] },
                { rowClass: "d1-row-fin", cells: [{ val: "Fin" }, { val: "34415.97", cls: "d1-td-num" }, { val: "1710.38", cls: "d1-td-num" }] },
            ],
        },
        {
            title: "Production Analysis", sub: "OA Efficiency",
            badgeLabel: "OA %", badgeBg: "#ecfdf5", badgeColor: "#059669",
            headers: ["Description", "%"],
            rows: [
                { cells: [{ val: "Todays OA Eff %" }, { val: "0", cls: "d1-td-zero" }] },
                { cells: [{ val: "Yesterdays OA Eff %" }, { val: "0", cls: "d1-td-zero" }] },
                { rowClass: "d1-row-month", cells: [{ val: "Monthly OA Eff %" }, { val: "72.01", cls: "d1-td-num" }] },
                { rowClass: "d1-row-qtr", cells: [{ val: "Quarterly OA Eff %" }, { val: "72.37", cls: "d1-td-num" }] },
                { rowClass: "d1-row-fin", cells: [{ val: "Fin OA Eff %" }, { val: "69.09", cls: "d1-td-num" }] },
            ],
        },
        {
            title: "Quality Analysis", sub: "Rejection Numbers",
            badgeLabel: "Nos", badgeBg: "#f5f3ff", badgeColor: "#7c3aed",
            headers: ["Description", "Numbers"],
            rows: [
                { cells: [{ val: "Mat Rej" }, { val: "39,292", cls: "d1-td-num" }] },
                { rowClass: "d1-row-month", cells: [{ val: "Mac Rej" }, { val: "23,262", cls: "d1-td-num" }] },
                { rowClass: "d1-row-qtr", cells: [{ val: "Rework" }, { val: "22,613", cls: "d1-td-num" }] },
                { rowClass: "d1-row-fin", cells: [{ val: "Customer Complaint" }, { val: "0", cls: "d1-td-zero" }] },
            ],
        },
    ];

    return (
        <div className="d1-root">
            <div className="d1-subhd">
                <span className="d1-subhd__rpt">
                    Report showing for <strong>{MONTHS_FULL[period.month]} – {period.year}</strong>
                </span>
                <div className="d1-subhd__ctrl">
                    <YearMonthPicker value={period} onChange={setPeriod} />
                    <button className="d1-ref-btn" onClick={handleRefresh}>
                        <RefreshIcon spinning={spinning} />
                        <span className="d1-ref-btn__text">Refresh</span>
                    </button>
                </div>
            </div>

            <SectionHeader title="Key Performance Indicators" collapsed={kpiCollapsed} onToggle={() => setKpiCollapsed(v => !v)} accent="#1a56db" />
            <div className={`d1-kpi-grid${kpiCollapsed ? " d1-grid--collapsed" : ""}`}>
                {kpiCards.map((k) => <KpiCard key={k.label} {...k} collapsed={kpiCollapsed} />)}
            </div>

            <SectionHeader title="Charts & Projections" collapsed={chartsCollapsed} onToggle={() => setChartsCollapsed(v => !v)} accent="#10b981" />
            <div className={`d1-charts-grid${chartsCollapsed ? " d1-grid--collapsed" : ""}`}>
                {chartCards.map((c, i) => <ChartCard key={i} {...c} deps={[]} collapsed={chartsCollapsed} />)}
            </div>

            <SectionHeader title="Analysis Tables" collapsed={tablesCollapsed} onToggle={() => setTablesCollapsed(v => !v)} accent="#8b5cf6" />
            <div className={`d1-tables-grid${tablesCollapsed ? " d1-grid--collapsed" : ""}`}>
                {tables.map((t) => <AnalysisTable key={t.title} {...t} collapsed={tablesCollapsed} />)}
            </div>
        </div>
    );
}