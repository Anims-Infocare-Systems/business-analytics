/**
 * PurchaseAnalysisDatePicker.jsx — Dual-Calendar Date Range Picker
 * Ported from SalesAnalysisDatePicker.jsx — prefix: padp-
 */
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import "./PurchaseAnalysisDatePicker.css";

const PAD  = n => String(n).padStart(2, "0");
const FMT  = d => d ? `${PAD(d.getDate())}-${PAD(d.getMonth() + 1)}-${d.getFullYear()}` : "";
const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function sameDay(a, b) {
    return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function startOf(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function calDays(year, month) {
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7) cells.push(null);
    return cells;
}

const PRESETS = [
    { label: "Today",        get: () => { const t = new Date(); return { from: startOf(t), to: startOf(t) }; } },
    { label: "Yesterday",    get: () => { const y = new Date(); y.setDate(y.getDate()-1); return { from: startOf(y), to: startOf(y) }; } },
    { label: "Last 7 Days",  get: () => { const t=new Date(),s=new Date(); s.setDate(s.getDate()-6); return { from: startOf(s), to: startOf(t) }; } },
    { label: "Last 30 Days", get: () => { const t=new Date(),s=new Date(); s.setDate(s.getDate()-29); return { from: startOf(s), to: startOf(t) }; } },
    { label: "This Month",   get: () => { const t=new Date(); return { from: new Date(t.getFullYear(),t.getMonth(),1), to: startOf(t) }; } },
    { label: "Last Month",   get: () => { const t=new Date(); const s=new Date(t.getFullYear(),t.getMonth()-1,1); const e=new Date(t.getFullYear(),t.getMonth(),0); return { from:s, to:e }; } },
    { label: "This Year",    get: () => { const t=new Date(); return { from: new Date(t.getFullYear(),0,1), to: startOf(t) }; } },
    { label: "Q1 2026",      get: () => ({ from: new Date(2026,0,1), to: new Date(2026,2,31) }) },
    { label: "Q2 2026",      get: () => ({ from: new Date(2026,3,1), to: new Date(2026,5,30) }) },
];

function MonthGrid({ year, month, from, to, hovered, onDayClick, onDayHover }) {
    const cells = calDays(year, month);
    return (
        <div className="padp-cal">
            <div className="padp-cal__head">
                {DAYS_SHORT.map(d => <span key={d} className="padp-cal__dow">{d}</span>)}
            </div>
            <div className="padp-cal__body">
                {cells.map((day, i) => {
                    if (!day) return <span key={i} className="padp-day padp-day--empty" />;
                    const effectiveTo = to || hovered;
                    const cls = [
                        "padp-day",
                        sameDay(day,from)       ? "padp-day--from"  : "",
                        sameDay(day,effectiveTo)? "padp-day--to"    : "",
                        from && effectiveTo && day > startOf(from) && day < startOf(effectiveTo) ? "padp-day--in" : "",
                        sameDay(day,new Date()) ? "padp-day--today" : "",
                    ].filter(Boolean).join(" ");
                    return <span key={i} className={cls} onClick={()=>onDayClick(day)} onMouseEnter={()=>onDayHover(day)}>{day.getDate()}</span>;
                })}
            </div>
        </div>
    );
}

function PopupPortal({ anchorRef, children }) {
    const [style, setStyle] = useState({});
    useEffect(() => {
        if (!anchorRef.current) return;
        const reposition = () => {
            const rect = anchorRef.current.getBoundingClientRect();
            const popupH = 460;
            const spaceBelow = window.innerHeight - rect.bottom;
            const top = spaceBelow >= popupH || spaceBelow >= window.innerHeight/2 ? rect.bottom+8 : rect.top-popupH-8;
            setStyle({ position:"fixed", top:Math.max(8,top), left:Math.min(rect.left, window.innerWidth-700), zIndex:999999 });
        };
        reposition();
        window.addEventListener("resize", reposition);
        window.addEventListener("scroll", reposition, true);
        return () => { window.removeEventListener("resize", reposition); window.removeEventListener("scroll", reposition, true); };
    }, [anchorRef]);
    return createPortal(<div className="padp-portal-wrap" style={style}>{children}</div>, document.body);
}

export default function PurchaseAnalysisDatePicker({ from, to, onChange }) {
    const today = new Date();
    const [open,         setOpen]        = useState(false);
    const [leftMonth,    setLeft]        = useState(from ? new Date(from.getFullYear(),from.getMonth(),1) : addMonths(today,-1));
    const [selecting,    setSelecting]   = useState(null);
    const [hovered,      setHovered]     = useState(null);
    const [activePreset, setActivePreset]= useState(null);
    const wrapRef    = useRef(null);
    const triggerRef = useRef(null);
    const rightMonth = addMonths(leftMonth, 1);

    useEffect(() => {
        if (!open) return;
        const h = e => {
            if (wrapRef.current?.contains(e.target)) return;
            if (e.target.closest(".padp-portal-wrap")) return;
            setOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [open]);

    useEffect(() => { if (from) setLeft(new Date(from.getFullYear(),from.getMonth(),1)); }, [from]);

    const handleDayClick = (day) => {
        if (!selecting) {
            setSelecting(day); setHovered(null); onChange({ from: day, to: null }); setActivePreset(null);
        } else {
            const [f,t] = day < selecting ? [day, selecting] : [selecting, day];
            onChange({ from:f, to:t }); setSelecting(null); setHovered(null); setOpen(false);
        }
    };

    const handlePreset = (preset) => {
        const range = preset.get();
        onChange(range); setSelecting(null);
        setLeft(new Date(range.from.getFullYear(),range.from.getMonth(),1));
        setActivePreset(preset.label); setOpen(false);
    };

    const label = from && to ? `${FMT(from)}  →  ${FMT(to)}` : from ? `${FMT(from)}  →  Pick end date` : "Select date range";

    return (
        <div className="padp-wrap" ref={wrapRef}>
            <button ref={triggerRef} className={`padp-trigger ${open?"padp-trigger--open":""}`} onClick={()=>setOpen(o=>!o)} type="button">
                <svg className="padp-trigger__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span className="padp-trigger__label">{label}</span>
                <svg className={`padp-trigger__caret ${open?"padp-trigger__caret--up":""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6,9 12,15 18,9"/></svg>
            </button>

            {open && (
                <PopupPortal anchorRef={triggerRef}>
                    <div className="padp-popup">
                        <div className="padp-presets">
                            {PRESETS.map(p => (
                                <button key={p.label} className={`padp-preset ${activePreset===p.label?"padp-preset--active":""}`} onClick={()=>handlePreset(p)} type="button">{p.label}</button>
                            ))}
                        </div>
                        <div className="padp-calendars">
                            <div className="padp-month-col">
                                <div className="padp-month-nav">
                                    <button className="padp-nav-btn" onClick={()=>setLeft(addMonths(leftMonth,-1))} type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg></button>
                                    <span className="padp-month-label">{MONTHS[leftMonth.getMonth()]} {leftMonth.getFullYear()}</span>
                                    <button className="padp-nav-btn" onClick={()=>setLeft(addMonths(leftMonth,1))} type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg></button>
                                </div>
                                <MonthGrid year={leftMonth.getFullYear()} month={leftMonth.getMonth()} from={selecting||from} to={!selecting?to:null} hovered={hovered} onDayClick={handleDayClick} onDayHover={setHovered}/>
                            </div>
                            <div className="padp-divider"/>
                            <div className="padp-month-col">
                                <div className="padp-month-nav">
                                    <button className="padp-nav-btn" onClick={()=>setLeft(addMonths(leftMonth,-1))} type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg></button>
                                    <span className="padp-month-label">{MONTHS[rightMonth.getMonth()]} {rightMonth.getFullYear()}</span>
                                    <button className="padp-nav-btn" onClick={()=>setLeft(addMonths(leftMonth,1))} type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg></button>
                                </div>
                                <MonthGrid year={rightMonth.getFullYear()} month={rightMonth.getMonth()} from={selecting||from} to={!selecting?to:null} hovered={hovered} onDayClick={handleDayClick} onDayHover={setHovered}/>
                            </div>
                        </div>
                        <div className="padp-footer">
                            <div className="padp-footer__range">
                                <span className="padp-footer__field"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>{from?FMT(from):"From date"}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13,6 19,12 13,18"/></svg>
                                <span className="padp-footer__field"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>{to?FMT(to):"To date"}</span>
                            </div>
                            <div className="padp-footer__btns">
                                <button className="padp-footer-btn padp-footer-btn--sec" onClick={()=>{onChange({from:null,to:null});setSelecting(null);setActivePreset(null);}} type="button">Clear</button>
                                <button className="padp-footer-btn padp-footer-btn--pri" onClick={()=>setOpen(false)} type="button">Apply</button>
                            </div>
                        </div>
                    </div>
                </PopupPortal>
            )}
        </div>
    );
}
