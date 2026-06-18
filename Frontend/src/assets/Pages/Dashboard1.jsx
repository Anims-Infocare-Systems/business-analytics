import { useEffect, useRef, useState, useCallback } from "react";
import { resolveApiBase } from "../../apiBase";
import "./Dashboard1.css";

const API_BASE = resolveApiBase();

function formatRupees(rupees) {
    const amount = Number(rupees);
    if (!Number.isFinite(amount)) return "0";
    if (Number.isInteger(amount)) {
        return amount.toLocaleString("en-IN");
    }
    return amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatMetric(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "0";
    return amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ════════════════════════════════════════════
//  Canvas Chart Helpers (UNCHANGED)
// ════════════════════════════════════════════
const DPR = window.devicePixelRatio || 1;

function setupCanvas(canvas, h) {
    if (!canvas?.parentElement) return null;
    const w = canvas.parentElement.getBoundingClientRect().width - 32;
    if (!Number.isFinite(w) || w <= 0) return null;
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(DPR, DPR);
    return { ctx, w, h };
}

function drawSparkline(canvas, data, color) {
    const values = Array.isArray(data) ? data.filter((v) => Number.isFinite(Number(v))) : [];
    if (!values.length) return;
    const s = setupCanvas(canvas, 30);
    if (!s) return;
    const { ctx, w, h } = s;
    const mn = Math.min(...values), mx = Math.max(...values), rng = mx - mn || 1;
    const px = (i) => (values.length <= 1 ? w / 2 : i * (w / (values.length - 1)));
    const py = (v) => h - 3 - ((v - mn) / rng) * (h - 6);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, color + "40");
    g.addColorStop(1, color + "00");
    ctx.beginPath();
    ctx.moveTo(px(0), py(values[0]));
    for (let i = 1; i < values.length; i++) {
        const cx = (px(i - 1) + px(i)) / 2;
        ctx.bezierCurveTo(cx, py(values[i - 1]), cx, py(values[i]), px(i), py(values[i]));
    }
    ctx.lineTo(px(values.length - 1), h);
    ctx.lineTo(px(0), h);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px(0), py(values[0]));
    for (let i = 1; i < values.length; i++) {
        const cx = (px(i - 1) + px(i)) / 2;
        ctx.bezierCurveTo(cx, py(values[i - 1]), cx, py(values[i]), px(i), py(values[i]));
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawBarChart(canvas, labels, sets, h = 118) {
    const s = setupCanvas(canvas, h);
    if (!s || !labels.length || !sets.length) return [];
    const { ctx, w } = s;
    const pad = { l: 32, r: 6, t: 6, b: 20 };
    const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    const all = sets.flatMap((d) => d.data).map((v) => Number(v) || 0);
    const mx = Math.max(1, Math.max(...all, 0) * 1.18);
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
    // Hit-test data: one entry per (group × series)
    const hitData = [];
    sets.forEach((ds, di) =>
        ds.data.forEach((val, gi) => {
            const bh = Math.max(0, (Number(val) || 0) / mx * ch);
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
            hitData.push({
                type: "bar",
                cx: x + bW / 2,
                cy: y,
                x1: x, y1: y, x2: x + bW, y2: pad.t + ch,
                label: labels[gi],
                seriesLabel: ds.label || "",
                color: ds.color,
                value: Number(val) || 0,
            });
        })
    );
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px 'DM Sans',sans-serif";
    ctx.textAlign = "center";
    labels.forEach((l, i) => ctx.fillText(l, pad.l + i * bw + bw / 2, h - 4));
    return hitData;
}

function drawLineChart(canvas, sets, range, labelsOrHeight = [], h = 118) {
    const labels = Array.isArray(labelsOrHeight) ? labelsOrHeight : [];
    const chartHeight = typeof labelsOrHeight === "number" ? labelsOrHeight : h;
    const s = setupCanvas(canvas, chartHeight);
    if (!s) return [];
    const { ctx, w } = s;
    const pad = { l: 32, r: 6, t: 6, b: 20 };
    const cw = w - pad.l - pad.r, ch = chartHeight - pad.t - pad.b;
    const [mn, mx] = range;
    const span = mx - mn || 1;
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

    // Hit-test data: one entry per (series × point)
    const hitData = [];
    sets.forEach((ds) => {
        const n = ds.data.length;
        if (n < 1) return;
        const pxFn = n <= 1
            ? () => pad.l + cw / 2
            : (i) => pad.l + i * (cw / (n - 1));
        const py = (v) => pad.t + ch * (1 - (v - mn) / span);

        if (n >= 2) {
            const g3 = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
            g3.addColorStop(0, ds.color + "2a");
            g3.addColorStop(1, ds.color + "00");
            ctx.beginPath();
            ctx.moveTo(pxFn(0), py(ds.data[0]));
            for (let i = 1; i < n; i++) {
                const cx = (pxFn(i - 1) + pxFn(i)) / 2;
                ctx.bezierCurveTo(cx, py(ds.data[i - 1]), cx, py(ds.data[i]), pxFn(i), py(ds.data[i]));
            }
            ctx.lineTo(pxFn(n - 1), pad.t + ch);
            ctx.lineTo(pxFn(0), pad.t + ch);
            ctx.closePath();
            ctx.fillStyle = g3; ctx.fill();
            ctx.beginPath();
            ctx.moveTo(pxFn(0), py(ds.data[0]));
            for (let i = 1; i < n; i++) {
                const cx = (pxFn(i - 1) + pxFn(i)) / 2;
                ctx.bezierCurveTo(cx, py(ds.data[i - 1]), cx, py(ds.data[i]), pxFn(i), py(ds.data[i]));
            }
            ctx.strokeStyle = ds.color; ctx.lineWidth = 2.2; ctx.stroke();
        }

        for (let i = 0; i < n; i++) {
            const dotX = pxFn(i);
            const dotY = py(ds.data[i]);
            ctx.beginPath();
            ctx.arc(dotX, dotY, 2.8, 0, Math.PI * 2);
            ctx.fillStyle = "#fff"; ctx.fill();
            ctx.strokeStyle = ds.color; ctx.lineWidth = 2; ctx.stroke();
            hitData.push({
                type: "point",
                cx: dotX,
                cy: dotY,
                label: labels[i] || `P${i + 1}`,
                seriesLabel: ds.label || "",
                color: ds.color,
                value: ds.data[i],
            });
        }
    });

    if (labels.length) {
        const pxLabel = (i) => (
            labels.length <= 1
                ? pad.l + cw / 2
                : pad.l + i * (cw / (labels.length - 1))
        );
        ctx.fillStyle = "#94a3b8";
        ctx.font = "9px 'DM Sans',sans-serif";
        ctx.textAlign = "center";
        labels.forEach((label, i) => ctx.fillText(label, pxLabel(i), chartHeight - 8));
    }
    return hitData;
}

function getOaWeeklyRange(data) {
    const values = Array.isArray(data) ? data.map((v) => Number(v)).filter((v) => Number.isFinite(v)) : [];
    if (!values.length) return [60, 80];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
        const pad = min === 0 ? 10 : 5;
        return [Math.max(0, min - pad), Math.min(100, max + pad)];
    }
    const pad = Math.max(2, (max - min) * 0.2);
    return [Math.max(0, min - pad), Math.min(100, max + pad)];
}

function getWeeklyQuantityRange(seriesCollection) {
    const values = Array.isArray(seriesCollection)
        ? seriesCollection.flatMap((series) => (Array.isArray(series) ? series : [series]))
            .map((v) => Number(v))
            .filter((v) => Number.isFinite(v))
        : [];
    if (!values.length) return [0, 10];
    const max = Math.max(...values, 0);
    if (max <= 0) return [0, 10];
    const pad = Math.max(5, max * 0.15);
    return [0, max + pad];
}

// ════════════════════════════════════════════
//  Year–Month Picker (UNCHANGED)
// ════════════════════════════════════════════
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function YearMonthPicker({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [yearView, setYearView] = useState(value.year);
    const [animDir, setAnimDir] = useState(null);
    const [panelAlign, setPanelAlign] = useState("right");
    const wrapRef = useRef(null);
    const chipRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const handleOpen = () => {
        if (!open && chipRef.current) {
            const rect = chipRef.current.getBoundingClientRect();
            const spaceRight = window.innerWidth - rect.left;
            const panelWidth = 272;
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
                    <div className="d1-ymp__handle" />
                    <div className="d1-ymp__glow" />

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
//  KPI Card (UNCHANGED)
// ════════════════════════════════════════════
function KpiCard({ kgrad, kbg, kclr, animDelay, icon, delta, deltaType, label, value, footer, sparkData, sparkColor, collapsed }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (collapsed || !canvasRef.current) return;

        const handleDraw = () => {
            try {
                drawSparkline(canvasRef.current, sparkData, sparkColor);
            } catch (error) {
                console.error(`Dashboard1 KPI sparkline failed: ${label}`, error);
            }
        };

        const parent = canvasRef.current.parentElement;
        if (!parent) return;

        const observer = new ResizeObserver(() => {
            requestAnimationFrame(handleDraw);
        });
        observer.observe(parent);

        return () => {
            observer.disconnect();
        };
    }, [sparkData, sparkColor, collapsed, label]);

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
//  Chart Card — with hover tooltip
// ════════════════════════════════════════════
function ChartCard({ title, legend, drawFn, deps, collapsed, canvasHeight = 118, footer, formatValue }) {
    const canvasRef = useRef(null);
    const wrapRef = useRef(null);
    const hitRef = useRef([]);           // stores hit-test rectangles / points
    const [tooltip, setTooltip] = useState(null); // { x, y, items: [{label,seriesLabel,value,color}] }

    useEffect(() => {
        if (collapsed || !canvasRef.current) return;

        const handleDraw = () => {
            try {
                const hitData = drawFn(canvasRef.current);
                hitRef.current = Array.isArray(hitData) ? hitData : [];
            } catch (error) {
                console.error(`Dashboard1 chart render failed: ${title}`, error);
                hitRef.current = [];
            }
        };

        const parent = canvasRef.current.parentElement;
        if (!parent) return;

        const observer = new ResizeObserver(() => {
            requestAnimationFrame(handleDraw);
        });
        observer.observe(parent);

        return () => {
            observer.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, collapsed]);

    const handleMouseMove = (e) => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap || hitRef.current.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const hits = hitRef.current;
        let bestHit = null;
        let bestDist = Infinity;

        hits.forEach((h) => {
            if (h.type === "bar") {
                // Check if mouse is inside the bar rectangle
                if (mx >= h.x1 && mx <= h.x2 && my >= h.y1 && my <= h.y2) {
                    const dist = Math.abs(mx - h.cx);
                    if (dist < bestDist) { bestDist = dist; bestHit = h; }
                }
            } else {
                // Line chart point: proximity within 18px
                const dist = Math.hypot(mx - h.cx, my - h.cy);
                if (dist < 18 && dist < bestDist) { bestDist = dist; bestHit = h; }
            }
        });

        if (!bestHit) {
            // For bar charts: find which group column the mouse is in and show all series
            if (hits.length > 0 && hits[0].type === "bar") {
                // Group by label
                const labelMap = {};
                hits.forEach((h) => {
                    if (!labelMap[h.label]) labelMap[h.label] = [];
                    labelMap[h.label].push(h);
                });
                // Find group whose cx range contains mx
                for (const [, group] of Object.entries(labelMap)) {
                    const xs = group.map(g => g.x1);
                    const xe = group.map(g => g.x2);
                    if (mx >= Math.min(...xs) - 2 && mx <= Math.max(...xe) + 2) {
                        const wrapRect = wrap.getBoundingClientRect();
                        const tipX = e.clientX - wrapRect.left;
                        const tipY = e.clientY - wrapRect.top;
                        setTooltip({
                            x: tipX, y: tipY,
                            label: group[0].label,
                            items: group.map(g => ({
                                seriesLabel: g.seriesLabel,
                                color: g.color,
                                value: g.value,
                            }))
                        });
                        return;
                    }
                }
            }
            setTooltip(null);
            return;
        }

        const wrapRect = wrap.getBoundingClientRect();
        const tipX = e.clientX - wrapRect.left;
        const tipY = e.clientY - wrapRect.top;

        if (bestHit.type === "bar") {
            // Group all same-label bars for combined tooltip
            const group = hits.filter(h => h.label === bestHit.label);
            setTooltip({
                x: tipX, y: tipY,
                label: bestHit.label,
                items: group.map(g => ({
                    seriesLabel: g.seriesLabel,
                    color: g.color,
                    value: g.value,
                }))
            });
        } else {
            // Line chart: group same-label points from all series
            const group = hits.filter(h => h.label === bestHit.label);
            setTooltip({
                x: tipX, y: tipY,
                label: bestHit.label,
                items: group.map(g => ({
                    seriesLabel: g.seriesLabel,
                    color: g.color,
                    value: g.value,
                }))
            });
        }
    };

    const handleMouseLeave = () => setTooltip(null);

    const fmtVal = formatValue || ((v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return "—";
        return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
    });

    return (
        <div className={`d1-cc${collapsed ? " d1-cc--collapsed" : ""}`} ref={wrapRef} style={{ position: "relative" }}>
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
            <div className="d1-cc__body"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ position: "relative" }}
            >
                <canvas ref={canvasRef} height={canvasHeight} />
            </div>
            {footer ? <div className="d1-cc__foot">{footer}</div> : null}

            {/* Hover Tooltip */}
            {tooltip && (
                <div
                    className="d1-chart-tooltip"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: tooltip.x > 140 ? "translate(-100%, -110%)" : "translate(8px, -110%)",
                    }}
                >
                    {tooltip.label && (
                        <div className="d1-chart-tooltip__label">{tooltip.label}</div>
                    )}
                    {tooltip.items.map((item, i) => (
                        <div key={i} className="d1-chart-tooltip__row">
                            <span className="d1-chart-tooltip__dot" style={{ background: item.color }} />
                            {item.seriesLabel && (
                                <span className="d1-chart-tooltip__series">{item.seriesLabel}:</span>
                            )}
                            <span className="d1-chart-tooltip__val">{fmtVal(item.value)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════
//  Analysis Table (UNCHANGED)
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
//  Section Header (UNCHANGED)
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
//  Refresh Icon (UNCHANGED)
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
//  Skeleton Cards for Lazy Loading UI
// ════════════════════════════════════════════
function KpiCardSkeleton() {
    return (
        <div className="d1-kc d1-kc--loading" style={{ height: "var(--d1-kpi-h)", display: "flex", flexDirection: "column" }}>
            <div className="d1-kc__top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="d1-skeleton-pulse" style={{ width: 40, height: 40, borderRadius: "10px" }} />
                <div className="d1-skeleton-pulse" style={{ width: 60, height: 18, borderRadius: "100px" }} />
            </div>
            <div className="d1-kc__body" style={{ marginTop: "16px", display: "flex", flexDirection: "column", flex: 1 }}>
                <div className="d1-skeleton-pulse" style={{ width: "40%", height: 10, marginBottom: "8px", borderRadius: "4px" }} />
                <div className="d1-skeleton-pulse" style={{ width: "75%", height: 26, marginBottom: "8px", borderRadius: "4px" }} />
                <div className="d1-skeleton-pulse" style={{ width: "50%", height: 11, marginTop: "auto", borderRadius: "4px" }} />
            </div>
        </div>
    );
}

function ChartCardSkeleton() {
    return (
        <div className="d1-cc d1-cc--loading" style={{ height: "var(--d1-chart-h)", display: "flex", flexDirection: "column" }}>
            <div className="d1-cc__hd" style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="d1-skeleton-pulse" style={{ width: "55%", height: 14, borderRadius: "4px" }} />
                <div style={{ display: "flex", gap: "8px" }}>
                    <div className="d1-skeleton-pulse" style={{ width: 32, height: 8, borderRadius: "2px" }} />
                    <div className="d1-skeleton-pulse" style={{ width: 32, height: 8, borderRadius: "2px" }} />
                </div>
            </div>
            <div className="d1-cc__body" style={{ display: "flex", alignItems: "flex-end", gap: "10%", height: "90px", padding: "0 10px 10px", flex: 1 }}>
                <div className="d1-skeleton-pulse" style={{ width: "16%", height: "35%", borderRadius: "4px 4px 0 0" }} />
                <div className="d1-skeleton-pulse" style={{ width: "16%", height: "60%", borderRadius: "4px 4px 0 0" }} />
                <div className="d1-skeleton-pulse" style={{ width: "16%", height: "75%", borderRadius: "4px 4px 0 0" }} />
                <div className="d1-skeleton-pulse" style={{ width: "16%", height: "50%", borderRadius: "4px 4px 0 0" }} />
                <div className="d1-skeleton-pulse" style={{ width: "16%", height: "85%", borderRadius: "4px 4px 0 0" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "6px", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                <div className="d1-skeleton-pulse" style={{ width: 70, height: 10, borderRadius: "4px" }} />
                <div className="d1-skeleton-pulse" style={{ width: 70, height: 10, borderRadius: "4px" }} />
            </div>
        </div>
    );
}

function AnalysisTableSkeleton() {
    return (
        <div className="d1-tc d1-tc--loading" style={{ height: "var(--d1-table-h)", display: "flex", flexDirection: "column" }}>
            <div className="d1-tc__hd" style={{ padding: "11px 14px", borderBottom: "1px solid var(--d1-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                    <div className="d1-skeleton-pulse" style={{ width: "50%", height: 13, marginBottom: "6px", borderRadius: "4px" }} />
                    <div className="d1-skeleton-pulse" style={{ width: "30%", height: 9, borderRadius: "4px" }} />
                </div>
                <div className="d1-skeleton-pulse" style={{ width: 48, height: 16, borderRadius: "100px" }} />
            </div>
            <div className="d1-tc__body" style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: i < 5 ? "1px solid #f1f5f9" : "none" }}>
                        <div className="d1-skeleton-pulse" style={{ width: "30%", height: 11, borderRadius: "4px" }} />
                        <div className="d1-skeleton-pulse" style={{ width: "18%", height: 11, borderRadius: "4px" }} />
                        <div className="d1-skeleton-pulse" style={{ width: "18%", height: 11, borderRadius: "4px" }} />
                        <div className="d1-skeleton-pulse" style={{ width: "18%", height: 11, borderRadius: "4px" }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════
//  Main Dashboard1 Component (UPDATED with API)
// ════════════════════════════════════════════
const getSparkData = (kpiData, fallback) => {
    if (kpiData && kpiData.spark_data && kpiData.spark_data.length > 0) {
        const nonZeroCount = kpiData.spark_data.filter(v => Math.abs(Number(v)) > 0.001).length;
        if (nonZeroCount >= 4) {
            return kpiData.spark_data;
        }
    }
    return fallback;
};

export default function Dashboard1() {
    const [spinning, setSpinning] = useState(false);
    const [period, setPeriod] = useState(() => {
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const [salesData, setSalesData] = useState(null);
    const [purchaseData, setPurchaseData] = useState(null);
    const [productionData, setProductionData] = useState(null);
    const [qualityValueData, setQualityValueData] = useState(null);
    const [salesProjectionsData, setSalesProjectionsData] = useState(null);
    const [purchaseProjectionsData, setPurchaseProjectionsData] = useState(null);
    const [oaEfficiencyWeeklyData, setOaEfficiencyWeeklyData] = useState(null);
    const [qualityRejectionsWeeklyData, setQualityRejectionsWeeklyData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [kpiCollapsed, setKpiCollapsed] = useState(false);
    const [chartsCollapsed, setChartsCollapsed] = useState(false);
    const [tablesCollapsed, setTablesCollapsed] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        const periodQuery = `year=${period.year}&month=${period.month}`;
        try {
            const [salesResponse, purchaseResponse, productionResponse, qualityValueResponse, salesProjectionsResponse, purchaseProjectionsResponse, oaEfficiencyWeeklyResponse, qualityRejectionsWeeklyResponse] = await Promise.all([
                fetch(`${API_BASE}/dashboard1/sales-kpi/?${periodQuery}`, { credentials: "include" }),
                fetch(`${API_BASE}/dashboard1/purchase-kpi/?${periodQuery}`, { credentials: "include" }),
                fetch(`${API_BASE}/dashboard1/production-kpi/?${periodQuery}`, { credentials: "include" }),
                fetch(`${API_BASE}/dashboard1/quality-value-kpi/?${periodQuery}`, { credentials: "include" }),
                fetch(`${API_BASE}/dashboard1/sales-projections/?${periodQuery}`, { credentials: "include" }),
                fetch(`${API_BASE}/dashboard1/purchase-projections/?${periodQuery}`, { credentials: "include" }),
                fetch(`${API_BASE}/dashboard1/oa-efficiency-weekly/?${periodQuery}`, { credentials: "include" }),
                fetch(`${API_BASE}/dashboard1/quality-rejections-weekly/?${periodQuery}`, { credentials: "include" }),
            ]);
            const [salesResult, purchaseResult, productionResult, qualityValueResult, salesProjectionsResult, purchaseProjectionsResult, oaEfficiencyWeeklyResult, qualityRejectionsWeeklyResult] = await Promise.all([
                salesResponse.json(),
                purchaseResponse.json(),
                productionResponse.json(),
                qualityValueResponse.json(),
                salesProjectionsResponse.json(),
                purchaseProjectionsResponse.json(),
                oaEfficiencyWeeklyResponse.json(),
                qualityRejectionsWeeklyResponse.json(),
            ]);

            setSalesData(salesResponse.ok && salesResult.success ? salesResult.data : null);
            setPurchaseData(purchaseResponse.ok && purchaseResult.success ? purchaseResult.data : null);
            setProductionData(productionResponse.ok && productionResult.success ? productionResult.data : null);
            setQualityValueData(qualityValueResponse.ok && qualityValueResult.success ? qualityValueResult.data : null);
            setSalesProjectionsData(
                salesProjectionsResponse.ok && salesProjectionsResult.success ? salesProjectionsResult.data : null
            );
            setPurchaseProjectionsData(
                purchaseProjectionsResponse.ok && purchaseProjectionsResult.success ? purchaseProjectionsResult.data : null
            );
            setOaEfficiencyWeeklyData(
                oaEfficiencyWeeklyResponse.ok && oaEfficiencyWeeklyResult.success ? oaEfficiencyWeeklyResult.data : null
            );
            setQualityRejectionsWeeklyData(
                qualityRejectionsWeeklyResponse.ok && qualityRejectionsWeeklyResult.success ? qualityRejectionsWeeklyResult.data : null
            );
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            setSalesData(null);
            setPurchaseData(null);
            setProductionData(null);
            setQualityValueData(null);
            setSalesProjectionsData(null);
            setPurchaseProjectionsData(null);
            setOaEfficiencyWeeklyData(null);
            setQualityRejectionsWeeklyData(null);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const handleRefresh = () => {
        setSpinning(true);
        fetchDashboardData().finally(() => {
            setTimeout(() => setSpinning(false), 900);
        });
    };

    const getSalesAnalysisValue = (periodKey, metricKey) => {
        const value = salesData?.analysis?.[periodKey]?.[metricKey];
        return Number.isFinite(Number(value)) ? Number(value) : 0;
    };

    const getSalesAnalysisCell = (periodKey, metricKey) => {
        const value = getSalesAnalysisValue(periodKey, metricKey);
        return {
            val: value ? formatRupees(value) : "—",
            cls: value ? "d1-td-num" : "d1-td-zero",
        };
    };

    const getPurchaseAnalysisValue = (periodKey, metricKey) => {
        const value = purchaseData?.analysis?.[periodKey]?.[metricKey];
        return Number.isFinite(Number(value)) ? Number(value) : 0;
    };

    const getPurchaseAnalysisCell = (periodKey, metricKey) => {
        const value = getPurchaseAnalysisValue(periodKey, metricKey);
        return {
            val: value ? formatRupees(value) : "—",
            cls: value ? "d1-td-num" : "d1-td-zero",
        };
    };

    const getProductionAnalysisValue = (periodKey) => {
        const value = productionData?.analysis?.[periodKey]?.oa_eff;
        return Number.isFinite(Number(value)) ? Number(value) : 0;
    };

    const getProductionAnalysisCell = (periodKey) => {
        const value = getProductionAnalysisValue(periodKey);
        return {
            val: value ? `${formatMetric(value)}%` : "—",
            cls: value ? "d1-td-num" : "d1-td-zero",
        };
    };

    const getQualityRejectionAnalysisValue = (periodKey, metricKey) => {
        const value = qualityRejectionsWeeklyData?.analysis?.[periodKey]?.[metricKey];
        return Number.isFinite(Number(value)) ? Number(value) : 0;
    };

    const getQualityRejectionAnalysisCell = (periodKey, metricKey) => {
        const value = getQualityRejectionAnalysisValue(periodKey, metricKey);
        return {
            val: value ? formatMetric(value) : "—",
            cls: value ? "d1-td-num" : "d1-td-zero",
        };
    };

    // Build KPI Cards
    const kpiCards = [
        {
            kgrad: "linear-gradient(90deg,#1a56db,#38bdf8)", kbg: "#eff4ff", kclr: "#1a56db", animDelay: "0s",
            icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12" /><path d="M6 8h12" /><path d="m6 13 8.5 8" /><path d="M6 13h3" /><path d="M9 13c6.667 0 6.667-10 0-10" /></svg>),
            delta: salesData ? `${salesData.delta_type === 'up' ? '↑' : '↓'} ${salesData.delta}%` : "—",
            deltaType: salesData ? salesData.delta_type : "na",
            label: "Sales Value",
            value: salesData ? formatRupees(salesData.current_value) : "—",
            footer: salesData ? `${MONTHS_FULL[period.month]} ${period.year} · ${salesData.fy_label}` : `${MONTHS_FULL[period.month]} ${period.year}`,
            sparkData: getSparkData(salesData, [12, 19, 8, 15, 22, 14, 20]),
            sparkColor: "#1a56db",
        },
        {
            kgrad: "linear-gradient(90deg,#f59e0b,#fbbf24)", kbg: "#fffbeb", kclr: "#b45309", animDelay: ".07s",
            icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>),
            delta: purchaseData ? `${purchaseData.delta_type === "up" ? "↑" : "↓"} ${purchaseData.delta}%` : "—",
            deltaType: purchaseData ? purchaseData.delta_type : "na",
            label: "Purchase Value",
            value: purchaseData ? formatRupees(purchaseData.current_value) : "—",
            footer: purchaseData ? `${MONTHS_FULL[period.month]} ${period.year} · ${purchaseData.fy_label}` : `${MONTHS_FULL[period.month]} ${period.year}`,
            sparkData: getSparkData(purchaseData, [10, 14, 18, 11, 15, 9, 13]),
            sparkColor: "#f59e0b",
        },
        {
            kgrad: "linear-gradient(90deg,#10b981,#34d399)", kbg: "#ecfdf5", kclr: "#059669", animDelay: ".14s",
            icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h.01M7 20v-4" /><path d="M12 20V10" /><path d="M17 20V4" /><path d="M22 20h.01" /></svg>),
            delta: productionData ? `${productionData.delta_type === "up" ? "↑" : "↓"} ${productionData.delta}%` : "—",
            deltaType: productionData ? productionData.delta_type : "na",
            label: "Production Value",
            value: productionData ? formatRupees(productionData.current_value) : "—",
            footer: productionData ? `${MONTHS_FULL[period.month]} ${period.year} · ${productionData.fy_label}` : `${MONTHS_FULL[period.month]} ${period.year}`,
            sparkData: getSparkData(productionData, [15, 10, 18, 12, 20, 15, 22]),
            sparkColor: "#10b981",
        },
        {
            kgrad: "linear-gradient(90deg,#8b5cf6,#c4b5fd)", kbg: "#f5f3ff", kclr: "#7c3aed", animDelay: ".21s",
            icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>),
            delta: qualityValueData ? `${qualityValueData.delta_type === "up" ? "↑" : "↓"} ${qualityValueData.delta}%` : "—",
            deltaType: qualityValueData ? qualityValueData.delta_type : "na",
            label: "Quality Value",
            value: qualityValueData ? formatRupees(qualityValueData.current_value) : "—",
            footer: qualityValueData ? `${MONTHS_FULL[period.month]} ${period.year} · ${qualityValueData.fy_label}` : `${MONTHS_FULL[period.month]} ${period.year}`,
            sparkData: getSparkData(qualityValueData, [12, 18, 14, 16, 10, 15, 12]),
            sparkColor: "#8b5cf6",
        },
    ];

    const chartCards = [
        {
            title: "Sales Projections in Lakhs",
            legend: [{ label: "Sales", color: "#1a56db" }, { label: "Projections", color: "#f59e0b" }],
            drawFn: (c) => drawBarChart(
                c,
                salesProjectionsData?.labels?.length ? salesProjectionsData.labels : [MONTHS_SHORT[period.month]],
                [
                    { data: salesProjectionsData?.sales ?? [], color: "#1a56db", label: "Sales" },
                    { data: salesProjectionsData?.po ?? [], color: "#f59e0b", label: "Projections" },
                ]
            ),
            deps: [salesProjectionsData, period],
            formatValue: (v) => `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}L`,
            footer: (
                <>
                    <span className="d1-cc__foot-val d1-cc__foot-val--sales">
                        Sales: {salesProjectionsData?.sales_rupees?.[0] != null ? formatRupees(salesProjectionsData.sales_rupees[0]) : "—"}
                    </span>
                    <span className="d1-cc__foot-val d1-cc__foot-val--po">
                        Projections: {salesProjectionsData?.po_rupees?.[0] != null ? formatRupees(salesProjectionsData.po_rupees[0]) : "—"}
                    </span>
                </>
            ),
        },
        {
            title: "Purchase Projections in Lakhs",
            legend: [{ label: "PO", color: "#1a56db" }, { label: "GRN", color: "#f59e0b" }],
            drawFn: (c) => drawBarChart(
                c,
                purchaseProjectionsData?.labels?.length ? purchaseProjectionsData.labels : [MONTHS_SHORT[period.month]],
                [
                    { data: purchaseProjectionsData?.po ?? [], color: "#1a56db", label: "PO" },
                    { data: purchaseProjectionsData?.grn ?? [], color: "#f59e0b", label: "GRN" },
                ]
            ),
            deps: [purchaseProjectionsData, period],
            formatValue: (v) => `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}L`,
            footer: (
                <>
                    <span className="d1-cc__foot-val d1-cc__foot-val--sales">
                        PO: {purchaseProjectionsData?.po_amount?.[0] != null ? formatRupees(purchaseProjectionsData.po_amount[0]) : "—"}
                    </span>
                    <span className="d1-cc__foot-val d1-cc__foot-val--po">
                        GRN: {purchaseProjectionsData?.grn_amount?.[0] != null ? formatRupees(purchaseProjectionsData.grn_amount[0]) : "—"}
                    </span>
                </>
            ),
        },
        {
            title: "OEE % — Weekly",
            legend: [{ label: "OA %", color: "#10b981", round: true }],
            drawFn: (c) => {
                const oaWeeklyLabels = oaEfficiencyWeeklyData?.labels?.length
                    ? oaEfficiencyWeeklyData.labels
                    : [];
                const oaWeeklySeries = oaEfficiencyWeeklyData?.data?.length
                    ? oaEfficiencyWeeklyData.data
                    : [];
                return drawLineChart(
                    c,
                    [{ data: oaWeeklySeries, color: "#10b981", label: "OA %" }],
                    getOaWeeklyRange(oaWeeklySeries),
                    oaWeeklyLabels,
                    86
                );
            },
            deps: [oaEfficiencyWeeklyData, period],
            formatValue: (v) => `${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`,
            footer: (
                <>
                    {(oaEfficiencyWeeklyData?.labels?.length ? oaEfficiencyWeeklyData.labels : []).map((label, index) => (
                        <span key={label} className="d1-cc__foot-val d1-cc__foot-val--oa" style={{ fontSize: "9px" }}>
                            {label}: {oaEfficiencyWeeklyData?.data?.[index] != null ? `${formatMetric(oaEfficiencyWeeklyData.data[index])}%` : "—"}
                        </span>
                    ))}
                </>
            ),
            canvasHeight: 86,
        },
        {
            title: "Quality Rejections — Weekly",
            legend: [{ label: "Mac Rej", color: "#ef4444", round: true }, { label: "Mat Rej", color: "#1a56db", round: true }],
            drawFn: (c) => {
                const qualityWeeklyLabels = qualityRejectionsWeeklyData?.labels?.length
                    ? qualityRejectionsWeeklyData.labels
                    : [];
                const machineSeries = qualityRejectionsWeeklyData?.machine?.length
                    ? qualityRejectionsWeeklyData.machine
                    : [];
                const materialSeries = qualityRejectionsWeeklyData?.material?.length
                    ? qualityRejectionsWeeklyData.material
                    : [];
                return drawLineChart(
                    c,
                    [
                        { data: machineSeries, color: "#ef4444", label: "Mac Rej" },
                        { data: materialSeries, color: "#1a56db", label: "Mat Rej" },
                    ],
                    getWeeklyQuantityRange([machineSeries, materialSeries]),
                    qualityWeeklyLabels,
                    74
                );
            },
            deps: [qualityRejectionsWeeklyData, period],
            formatValue: (v) => Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 }),
            footer: (
                <>
                    {(qualityRejectionsWeeklyData?.labels?.length ? qualityRejectionsWeeklyData.labels : []).map((label, index) => (
                        <span key={label} className="d1-cc__foot-val" style={{ fontSize: "8.5px" }}>
                            {label}:{" "}
                            <span style={{ color: "#ef4444" }}>
                                Mac {qualityRejectionsWeeklyData?.machine?.[index] != null ? formatMetric(qualityRejectionsWeeklyData.machine[index]) : "—"}
                            </span>{" "}
                            /{" "}
                            <span style={{ color: "#1a56db" }}>
                                Mat {qualityRejectionsWeeklyData?.material?.[index] != null ? formatMetric(qualityRejectionsWeeklyData.material[index]) : "—"}
                            </span>
                        </span>
                    ))}
                </>
            ),
            canvasHeight: 74,
        },
    ];

    const tables = [
        {
            title: "Sales Analysis", sub: "in ₹",
            badgeLabel: "Sales", badgeBg: "#eff4ff", badgeColor: "#1a56db",
            headers: ["Desc", "Sales", "LAB", "Exp", "Total"],
            rows: [
                { cells: [{ val: "Today" }, getSalesAnalysisCell("today", "sales"), getSalesAnalysisCell("today", "lab"), getSalesAnalysisCell("today", "exp"), getSalesAnalysisCell("today", "total")] },
                { cells: [{ val: "YDA" }, getSalesAnalysisCell("yesterday", "sales"), getSalesAnalysisCell("yesterday", "lab"), getSalesAnalysisCell("yesterday", "exp"), getSalesAnalysisCell("yesterday", "total")] },
                { rowClass: "d1-row-month", cells: [{ val: "Month" }, getSalesAnalysisCell("month", "sales"), getSalesAnalysisCell("month", "lab"), getSalesAnalysisCell("month", "exp"), getSalesAnalysisCell("month", "total")] },
                { rowClass: "d1-row-qtr", cells: [{ val: "Qtr." }, getSalesAnalysisCell("quarter", "sales"), getSalesAnalysisCell("quarter", "lab"), getSalesAnalysisCell("quarter", "exp"), getSalesAnalysisCell("quarter", "total")] },
                { rowClass: "d1-row-fin", cells: [{ val: "Fin" }, getSalesAnalysisCell("financial_year", "sales"), getSalesAnalysisCell("financial_year", "lab"), getSalesAnalysisCell("financial_year", "exp"), getSalesAnalysisCell("financial_year", "total")] },
            ],
        },
        {
            title: "Purchase Analysis", sub: "in ₹",
            badgeLabel: "Purchase", badgeBg: "#fffbeb", badgeColor: "#b45309",
            headers: ["Description", "PO", "GRN"],
            rows: [
                { cells: [{ val: "Today" }, getPurchaseAnalysisCell("today", "po"), getPurchaseAnalysisCell("today", "grn")] },
                { cells: [{ val: "YDA" }, getPurchaseAnalysisCell("yesterday", "po"), getPurchaseAnalysisCell("yesterday", "grn")] },
                { rowClass: "d1-row-month", cells: [{ val: "Month" }, getPurchaseAnalysisCell("month", "po"), getPurchaseAnalysisCell("month", "grn")] },
                { rowClass: "d1-row-qtr", cells: [{ val: "Qtr." }, getPurchaseAnalysisCell("quarter", "po"), getPurchaseAnalysisCell("quarter", "grn")] },
                { rowClass: "d1-row-fin", cells: [{ val: "Fin" }, getPurchaseAnalysisCell("financial_year", "po"), getPurchaseAnalysisCell("financial_year", "grn")] },
            ],
        },
        {
            title: "Production Analysis", sub: "OA Efficiency",
            badgeLabel: "OA %", badgeBg: "#ecfdf5", badgeColor: "#059669",
            headers: ["Description", "%"],
            rows: [
                { cells: [{ val: "Todays OA Eff %" }, getProductionAnalysisCell("today")] },
                { cells: [{ val: "Yesterdays OA Eff %" }, getProductionAnalysisCell("yesterday")] },
                { rowClass: "d1-row-month", cells: [{ val: "Monthly OA Eff %" }, getProductionAnalysisCell("month")] },
                { rowClass: "d1-row-qtr", cells: [{ val: "Quarterly OA Eff %" }, getProductionAnalysisCell("quarter")] },
                { rowClass: "d1-row-fin", cells: [{ val: "Fin OA Eff %" }, getProductionAnalysisCell("financial_year")] },
            ],
        },
        {
            title: "Quality Analysis",
            sub: qualityRejectionsWeeklyData?.fy_label
                ? `Material vs machine rejection qty · ${qualityRejectionsWeeklyData.fy_label}`
                : "Material vs machine rejection qty",
            badgeLabel: "Nos", badgeBg: "#f5f3ff", badgeColor: "#7c3aed",
            headers: ["Description", "Mat Rej", "Mac Rej"],
            rows: [
                { cells: [{ val: "Today" }, getQualityRejectionAnalysisCell("today", "material"), getQualityRejectionAnalysisCell("today", "machine")] },
                { cells: [{ val: "YDA" }, getQualityRejectionAnalysisCell("yesterday", "material"), getQualityRejectionAnalysisCell("yesterday", "machine")] },
                { rowClass: "d1-row-month", cells: [{ val: "Month" }, getQualityRejectionAnalysisCell("month", "material"), getQualityRejectionAnalysisCell("month", "machine")] },
                { rowClass: "d1-row-qtr", cells: [{ val: "Qtr." }, getQualityRejectionAnalysisCell("quarter", "material"), getQualityRejectionAnalysisCell("quarter", "machine")] },
                { rowClass: "d1-row-fin", cells: [{ val: "Fin" }, getQualityRejectionAnalysisCell("financial_year", "material"), getQualityRejectionAnalysisCell("financial_year", "machine")] },
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
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
                ) : (
                    kpiCards.map((k) => <KpiCard key={k.label} {...k} collapsed={kpiCollapsed} />)
                )}
            </div>

            <SectionHeader title="Charts & Projections" collapsed={chartsCollapsed} onToggle={() => setChartsCollapsed(v => !v)} accent="#10b981" />
            <div className={`d1-charts-grid${chartsCollapsed ? " d1-grid--collapsed" : ""}`}>
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <ChartCardSkeleton key={i} />)
                ) : (
                    chartCards.map((c, i) => <ChartCard key={i} {...c} deps={c.deps ?? []} collapsed={chartsCollapsed} />)
                )}
            </div>

            <SectionHeader title="Analysis Tables" collapsed={tablesCollapsed} onToggle={() => setTablesCollapsed(v => !v)} accent="#8b5cf6" />
            <div className={`d1-tables-grid${tablesCollapsed ? " d1-grid--collapsed" : ""}`}>
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <AnalysisTableSkeleton key={i} />)
                ) : (
                    tables.map((t) => <AnalysisTable key={t.title} {...t} collapsed={tablesCollapsed} />)
                )}
            </div>
        </div>
    );
}