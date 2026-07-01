/**
 * QualityAnalysisDatePicker.jsx — Dual-Calendar Date Range Picker
 * Ported from SalesAnalysisDatePicker.jsx — prefix: qadp-
 */
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import "./QualityAnalysisDatePicker.css";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

const PAD  = n => String(n).padStart(2, "0");
const FMT  = d => d ? `${PAD(d.getDate())}-${PAD(d.getMonth() + 1)}-${d.getFullYear()}` : "";
const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const toInputFmt = d => {
  if (!d) return "";
  const p = n => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth()+1)}-${d.getFullYear()}`;
};

const autoFmtDate = (raw, prev) => {
  let digits = raw.replace(/\D/g, "");
  if (digits.length > 8) digits = digits.slice(0, 8);
  let out = digits;
  if (digits.length > 4) out = digits.slice(0,2) + "-" + digits.slice(2,4) + "-" + digits.slice(4);
  else if (digits.length > 2) out = digits.slice(0,2) + "-" + digits.slice(2);
  return out;
};

const parseTyped = str => {
  if (!str) return null;
  str = str.trim();
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) { const d = new Date(+m[1], +m[2]-1, +m[3]); d.setHours(0,0,0,0); return isNaN(d) ? null : d; }
  m = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) { const d = new Date(+m[3], +m[2]-1, +m[1]); d.setHours(0,0,0,0); return isNaN(d) ? null : d; }
  return null;
};

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

const EXTRA_PRESETS = [
    { label: "Q3 2026",      get: () => ({ from: new Date(2026,6,1), to: new Date(2026,8,30) }) },
    { label: "Q4 2026",      get: () => ({ from: new Date(2026,9,1), to: new Date(2026,11,31) }) },
    { label: "Last 3 Months",get: () => { const t=new Date(),s=new Date(); s.setMonth(t.getMonth()-3); return { from: startOf(s), to: startOf(t) }; } },
    { label: "Last 6 Months",get: () => { const t=new Date(),s=new Date(); s.setMonth(t.getMonth()-6); return { from: startOf(s), to: startOf(t) }; } },
    { label: "Last Year",    get: () => { const y = new Date().getFullYear()-1; return { from: new Date(y,0,1), to: new Date(y,11,31) }; } },
];

function MonthGrid({ year, month, from, to, hovered, onDayClick, onDayHover }) {
    const cells = calDays(year, month);
    return (
        <div className="qadp-cal">
            <div className="qadp-cal__head">
                {DAYS_SHORT.map(d => <span key={d} className="qadp-cal__dow">{d}</span>)}
            </div>
            <div className="qadp-cal__body">
                {cells.map((day, i) => {
                    if (!day) return <span key={i} className="qadp-day qadp-day--empty" />;
                    const effectiveTo = to || hovered;
                    const cls = [
                        "qadp-day",
                        sameDay(day,from)        ? "qadp-day--from"  : "",
                        sameDay(day,effectiveTo) ? "qadp-day--to"    : "",
                        from && effectiveTo && day > startOf(from) && day < startOf(effectiveTo) ? "qadp-day--in" : "",
                        sameDay(day,new Date())  ? "qadp-day--today" : "",
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
    return createPortal(<div className="qadp-portal-wrap" style={style}>{children}</div>, document.body);
}

export default function QualityAnalysisDatePicker({ from, to, onChange }) {
    const today = new Date();
    const [open,         setOpen]        = useState(false);
    const [leftMonth,    setLeft]        = useState(from ? new Date(from.getFullYear(),from.getMonth(),1) : addMonths(today,-1));
    const [selecting,    setSelecting]   = useState(null);
    const [hovered,      setHovered]     = useState(null);
    const [activePreset, setActivePreset]= useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const wrapRef    = useRef(null);
    const triggerRef = useRef(null);
    const rightMonth = addMonths(leftMonth, 1);

    const [fromInput, setFromInput] = useState("");
    const [toInput,   setToInput]   = useState("");
    const [inputErr,  setInputErr]  = useState("");

    useEffect(() => {
        setFromInput(toInputFmt(from));
        setToInput(toInputFmt(to));
        setInputErr("");
    }, [from, to, open]);

    useEffect(() => {
        if (!open) return;
        const h = e => {
            if (wrapRef.current?.contains(e.target)) return;
            if (e.target.closest(".qadp-portal-wrap")) return;
            setOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [open]);

    useEffect(() => {
        if (!dropdownOpen) return;
        const closeDropdown = () => setDropdownOpen(false);
        document.addEventListener("click", closeDropdown);
        return () => document.removeEventListener("click", closeDropdown);
    }, [dropdownOpen]);

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

    const handleApply = () => {
        const f = parseTyped(fromInput);
        const t = parseTyped(toInput);
        if (fromInput && !f) { setInputErr("Invalid From date"); return; }
        if (toInput   && !t) { setInputErr("Invalid To date");   return; }
        if (f && t && f > t) { setInputErr("From must be ≤ To"); return; }
        setInputErr("");
        if (f || t) {
            onChange({ from: f || from, to: t || to });
            if (f) setLeft(new Date(f.getFullYear(), f.getMonth(), 1));
            setActivePreset(null);
            setSelecting(null);
        }
        setOpen(false);
    };

    const handleClear = () => {
        onChange({ from: null, to: null });
        setSelecting(null);
        setActivePreset(null);
        setFromInput("");
        setToInput("");
        setInputErr("");
    };

    const days = from && to ? Math.round((to - from) / 86400000) + 1 : null;
    const label = from && to
        ? `${FMT(from)}  →  ${FMT(to)}${days ? `  (${days}d)` : ""}`
        : from ? `${FMT(from)}  →  Pick end date`
        : "Select date range";

    const isExtraActive = EXTRA_PRESETS.some(p => p.label === activePreset);

    return (
        <div className="qadp-wrap" ref={wrapRef}>
            <button ref={triggerRef} className={`qadp-trigger ${open?"qadp-trigger--open":""}`} onClick={()=>setOpen(o=>!o)} type="button">
                <Calendar className="qadp-trigger__icon" size={15} />
                <span className="qadp-trigger__label">{label}</span>
                <ChevronDown className={`qadp-trigger__caret ${open?"qadp-trigger__caret--up":""}`} size={12} strokeWidth={2.5} />
            </button>

            {open && (
                <PopupPortal anchorRef={triggerRef}>
                    <div className="qadp-popup">
                        <div className="qadp-presets">
                            {PRESETS.map(p => (
                                <button key={p.label} className={`qadp-preset ${activePreset===p.label?"qadp-preset--active":""}`} onClick={()=>handlePreset(p)} type="button">{p.label}</button>
                            ))}
                            <div className="qadp-dropdown-container">
                                <button 
                                    type="button" 
                                    className={`qadp-preset qadp-preset-more ${isExtraActive || dropdownOpen ? "qadp-preset--active" : ""}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDropdownOpen(!dropdownOpen);
                                    }}
                                >
                                    More ▾
                                </button>
                                {dropdownOpen && (
                                    <div className="qadp-dropdown-menu">
                                        {EXTRA_PRESETS.map(p => (
                                            <button
                                                key={p.label}
                                                className={`qadp-dropdown-item ${activePreset === p.label ? "qadp-dropdown-item--active" : ""}`}
                                                onClick={() => {
                                                    handlePreset(p);
                                                    setDropdownOpen(false);
                                                }}
                                                type="button"
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="qadp-calendars">
                            <div className="qadp-month-col">
                                <div className="qadp-month-nav">
                                    <button className="qadp-nav-btn" onClick={()=>setLeft(addMonths(leftMonth,-1))} type="button"><ChevronLeft size={14} strokeWidth={2.5} /></button>
                                    <span className="qadp-month-label">{MONTHS[leftMonth.getMonth()]} {leftMonth.getFullYear()}</span>
                                    <button className="qadp-nav-btn" onClick={()=>setLeft(addMonths(leftMonth,1))} type="button"><ChevronRight size={14} strokeWidth={2.5} /></button>
                                </div>
                                <MonthGrid year={leftMonth.getFullYear()} month={leftMonth.getMonth()} from={selecting||from} to={!selecting?to:null} hovered={hovered} onDayClick={handleDayClick} onDayHover={setHovered}/>
                            </div>
                            <div className="qadp-divider"/>
                            <div className="qadp-month-col">
                                <div className="qadp-month-nav">
                                    <button className="qadp-nav-btn" onClick={()=>setLeft(addMonths(leftMonth,-1))} type="button"><ChevronLeft size={14} strokeWidth={2.5} /></button>
                                    <span className="qadp-month-label">{MONTHS[rightMonth.getMonth()]} {rightMonth.getFullYear()}</span>
                                    <button className="qadp-nav-btn" onClick={()=>setLeft(addMonths(leftMonth,1))} type="button"><ChevronRight size={14} strokeWidth={2.5} /></button>
                                </div>
                                <MonthGrid year={rightMonth.getFullYear()} month={rightMonth.getMonth()} from={selecting||from} to={!selecting?to:null} hovered={hovered} onDayClick={handleDayClick} onDayHover={setHovered}/>
                            </div>
                        </div>
                        <div className="qadp-footer">
                            <div className="qadp-footer__range">
                                <div className="qadp-footer__input-wrap">
                                    <Calendar className="qadp-footer__input-ico" size={12} />
                                    <input
                                        className={`qadp-footer__input ${inputErr.includes("From") ? "qadp-footer__input--err" : from ? "qadp-footer__input--set" : ""}`}
                                        type="text"
                                        placeholder="DD-MM-YYYY"
                                        value={fromInput}
                                        onChange={e => { setFromInput(autoFmtDate(e.target.value, fromInput)); setInputErr(""); }}
                                        onKeyDown={e => e.key === "Enter" && handleApply()}
                                        maxLength={10}
                                    />
                                </div>
                                <ArrowRight size={14} />
                                <div className="qadp-footer__input-wrap">
                                    <Calendar className="qadp-footer__input-ico" size={12} />
                                    <input
                                        className={`qadp-footer__input ${inputErr.includes("To") ? "qadp-footer__input--err" : to ? "qadp-footer__input--set" : ""}`}
                                        type="text"
                                        placeholder="DD-MM-YYYY"
                                        value={toInput}
                                        onChange={e => { setToInput(autoFmtDate(e.target.value, toInput)); setInputErr(""); }}
                                        onKeyDown={e => e.key === "Enter" && handleApply()}
                                        maxLength={10}
                                    />
                                </div>
                                {days && <span className="qadp-footer__days">{days} days</span>}
                                {inputErr && <span className="qadp-footer__err">{inputErr}</span>}
                            </div>
                            <div className="qadp-footer__btns">
                                <button className="qadp-footer-btn qadp-footer-btn--sec" onClick={handleClear} type="button">Clear</button>
                                <button className="qadp-footer-btn qadp-footer-btn--pri" onClick={handleApply} type="button">Apply</button>
                            </div>
                        </div>
                    </div>
                </PopupPortal>
            )}
        </div>
    );
}
