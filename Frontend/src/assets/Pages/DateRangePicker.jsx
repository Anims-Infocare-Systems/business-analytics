/**
 * DateRangePicker.jsx — Modern Dual-Calendar Date Range Picker
 * Fully self-contained, no external deps, theme-aware via props
 * Props:
 *   from       : Date | null
 *   to         : Date | null
 *   onChange   : ({ from, to }) => void
 *   theme      : "indigo" | "teal"  (default: "indigo")
 *
 * FIX: popup is now portalled to document.body with position:fixed
 * so it always renders above cards/modals regardless of stacking context.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "./DateRangePicker.css";

/* ── helpers ──────────────────────────────────────────────── */
const PAD  = n => String(n).padStart(2, "0");
const FMT  = d => d ? `${PAD(d.getDate())}-${PAD(d.getMonth()+1)}-${d.getFullYear()}` : "";
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function sameDay(a, b) {
    return a && b && a.getFullYear()===b.getFullYear() &&
           a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function startOf(d)  { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function calDays(year, month) {
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month+1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7) cells.push(null);
    return cells;
}

const PRESETS = [
    { label: "Today",        get: () => { const t=new Date(); return { from:startOf(t), to:startOf(t) }; } },
    { label: "Yesterday",    get: () => { const y=new Date(); y.setDate(y.getDate()-1); return { from:startOf(y), to:startOf(y) }; } },
    { label: "Last 7 Days",  get: () => { const t=new Date(),s=new Date(); s.setDate(s.getDate()-6); return { from:startOf(s), to:startOf(t) }; } },
    { label: "Last 30 Days", get: () => { const t=new Date(),s=new Date(); s.setDate(s.getDate()-29); return { from:startOf(s), to:startOf(t) }; } },
    { label: "This Month",   get: () => { const t=new Date(); return { from:new Date(t.getFullYear(),t.getMonth(),1), to:startOf(t) }; } },
    { label: "Last Month",   get: () => { const t=new Date(); const s=new Date(t.getFullYear(),t.getMonth()-1,1); const e=new Date(t.getFullYear(),t.getMonth(),0); return { from:s, to:e }; } },
    { label: "This Year",    get: () => { const t=new Date(); return { from:new Date(t.getFullYear(),0,1), to:startOf(t) }; } },
];

/* ── Single month calendar ────────────────────────────────── */
function MonthGrid({ year, month, from, to, hovered, onDayClick, onDayHover, themeClass }) {
    const cells = calDays(year, month);
    return (
        <div className="drp-cal">
            <div className="drp-cal__head">
                {DAYS_SHORT.map(d => <span key={d} className="drp-cal__dow">{d}</span>)}
            </div>
            <div className="drp-cal__body">
                {cells.map((day, i) => {
                    if (!day) return <span key={i} className="drp-day drp-day--empty" />;
                    const isFrom    = sameDay(day, from);
                    const isTo      = sameDay(day, to || hovered);
                    const effectiveTo = to || hovered;
                    const inRange   = from && effectiveTo && day > startOf(from) && day < startOf(effectiveTo);
                    const isToday   = sameDay(day, new Date());
                    const isDisabled= day > new Date();
                    const cls = [
                        "drp-day",
                        isFrom    ? "drp-day--from"    : "",
                        isTo      ? "drp-day--to"      : "",
                        inRange   ? "drp-day--in"      : "",
                        isToday   ? "drp-day--today"   : "",
                        isDisabled? "drp-day--disabled": "",
                        themeClass,
                    ].filter(Boolean).join(" ");
                    return (
                        <span
                            key={i}
                            className={cls}
                            onClick={() => !isDisabled && onDayClick(day)}
                            onMouseEnter={() => !isDisabled && onDayHover(day)}
                        >
                            {day.getDate()}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Portalled popup ──────────────────────────────────────── */
function PopupPortal({ anchorRef, theme, children }) {
    const [style, setStyle] = useState({});

    useEffect(() => {
        if (!anchorRef.current) return;

        const reposition = () => {
            const rect = anchorRef.current.getBoundingClientRect();
            const viewportH = window.innerHeight;
            const popupH = 480; // estimated max height
            const spaceBelow = viewportH - rect.bottom;
            const top = spaceBelow >= popupH || spaceBelow >= viewportH / 2
                ? rect.bottom + 8
                : rect.top - popupH - 8;

            setStyle({
                position: "fixed",
                top:  Math.max(8, top),
                left: Math.min(rect.left, window.innerWidth - 700),
                zIndex: 999999,
            });
        };

        reposition();
        window.addEventListener("resize", reposition);
        window.addEventListener("scroll", reposition, true);
        return () => {
            window.removeEventListener("resize", reposition);
            window.removeEventListener("scroll", reposition, true);
        };
    }, [anchorRef]);

    return createPortal(
        <div className={`drp-portal-wrap drp-wrap--${theme}`} style={style}>
            {children}
        </div>,
        document.body
    );
}

/* ── Main component ───────────────────────────────────────── */
export default function DateRangePicker({ from, to, onChange, theme = "indigo" }) {
    const today        = new Date();
    const [open,       setOpen]     = useState(false);
    const [leftMonth,  setLeft]     = useState(from ? new Date(from.getFullYear(), from.getMonth(), 1) : addMonths(today, -1));
    const [selecting,  setSelecting]= useState(null);
    const [hovered,    setHovered]  = useState(null);
    const [activePreset, setActivePreset] = useState(null);

    const wrapRef    = useRef(null);   // outer wrapper (for outside-click)
    const triggerRef = useRef(null);   // button (for popup positioning)

    const rightMonth = addMonths(leftMonth, 1);
    const tc = `drp-day--${theme}`;

    // close on outside click
    useEffect(() => {
        if (!open) return;
        const h = e => {
            // click inside wrapper OR inside the portalled popup → keep open
            if (wrapRef.current && wrapRef.current.contains(e.target)) return;
            if (e.target.closest(".drp-portal-wrap")) return;
            setOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [open]);

    const handleDayClick = (day) => {
        if (!selecting) {
            setSelecting(day); setHovered(null);
            onChange({ from: day, to: null });
            setActivePreset(null);
        } else {
            const [f, t] = day < selecting ? [day, selecting] : [selecting, day];
            onChange({ from: f, to: t });
            setSelecting(null); setHovered(null);
            setOpen(false);
        }
    };

    const handlePreset = (preset) => {
        const range = preset.get();
        onChange(range);
        setSelecting(null);
        setLeft(new Date(range.from.getFullYear(), range.from.getMonth(), 1));
        setActivePreset(preset.label);
        setOpen(false);
    };

    const label = from && to
        ? `${FMT(from)}  →  ${FMT(to)}`
        : from
        ? `${FMT(from)}  →  Pick end date`
        : "Select date range";

    return (
        <div className={`drp-wrap drp-wrap--${theme}`} ref={wrapRef}>

            {/* ── Trigger button ── */}
            <button
                ref={triggerRef}
                className={`drp-trigger ${open ? "drp-trigger--open" : ""}`}
                onClick={() => setOpen(o => !o)}
                type="button"
            >
                <svg className="drp-trigger__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span className="drp-trigger__label">{label}</span>
                <svg className={`drp-trigger__caret ${open ? "drp-trigger__caret--up":""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6,9 12,15 18,9"/>
                </svg>
            </button>

            {/* ── Portalled Dropdown ── */}
            {open && (
                <PopupPortal anchorRef={triggerRef} theme={theme}>
                    <div className="drp-popup">

                        {/* Presets */}
                        <div className="drp-presets">
                            {PRESETS.map(p => (
                                <button
                                    key={p.label}
                                    className={`drp-preset ${activePreset===p.label ? "drp-preset--active":""}`}
                                    onClick={() => handlePreset(p)}
                                    type="button"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Calendars */}
                        <div className="drp-calendars">

                            {/* Left month */}
                            <div className="drp-month-col">
                                <div className="drp-month-nav">
                                    <button className="drp-nav-btn" onClick={() => setLeft(addMonths(leftMonth,-1))} type="button">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
                                    </button>
                                    <span className="drp-month-label">{MONTHS[leftMonth.getMonth()]} {leftMonth.getFullYear()}</span>
                                    <button className="drp-nav-btn" onClick={() => setLeft(addMonths(leftMonth,1))} type="button">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>
                                    </button>
                                </div>
                                <MonthGrid
                                    year={leftMonth.getFullYear()} month={leftMonth.getMonth()}
                                    from={selecting || from} to={!selecting ? to : null}
                                    hovered={hovered}
                                    onDayClick={handleDayClick} onDayHover={setHovered}
                                    themeClass={tc}
                                />
                            </div>

                            <div className="drp-divider" />

                            {/* Right month */}
                            <div className="drp-month-col">
                                <div className="drp-month-nav">
                                    <button className="drp-nav-btn" onClick={() => setLeft(addMonths(leftMonth,-1))} type="button">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
                                    </button>
                                    <span className="drp-month-label">{MONTHS[rightMonth.getMonth()]} {rightMonth.getFullYear()}</span>
                                    <button className="drp-nav-btn" onClick={() => setLeft(addMonths(leftMonth,1))} type="button">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>
                                    </button>
                                </div>
                                <MonthGrid
                                    year={rightMonth.getFullYear()} month={rightMonth.getMonth()}
                                    from={selecting || from} to={!selecting ? to : null}
                                    hovered={hovered}
                                    onDayClick={handleDayClick} onDayHover={setHovered}
                                    themeClass={tc}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="drp-footer">
                            <div className="drp-footer__range">
                                <span className="drp-footer__field">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    {from ? FMT(from) : "From date"}
                                </span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13,6 19,12 13,18"/></svg>
                                <span className="drp-footer__field">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    {to ? FMT(to) : "To date"}
                                </span>
                            </div>
                            <div className="drp-footer__btns">
                                <button className="drp-footer-btn drp-footer-btn--sec"
                                    onClick={() => { onChange({ from: null, to: null }); setSelecting(null); setActivePreset(null); }}
                                    type="button">Clear</button>
                                <button className="drp-footer-btn drp-footer-btn--pri"
                                    onClick={() => setOpen(false)}
                                    type="button">Apply</button>
                            </div>
                        </div>
                    </div>
                </PopupPortal>
            )}
        </div>
    );
}