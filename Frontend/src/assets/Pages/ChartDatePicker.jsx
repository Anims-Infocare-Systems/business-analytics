/**
 * ChartDatePicker.jsx  —  "Apex" Modern Range Picker
 * Prefix: cdr-  (unchanged — drop-in replacement)
 *
 * Props:
 *   from     : Date | null
 *   to       : Date | null
 *   onChange : ({ from, to }) => void
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "./ChartDatePicker.css";

/* ─── Helpers ────────────────────────────────────────────── */
const tod = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addMo    = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const sameDay  = (a, b) => a && b && a.toDateString() === b.toDateString();
const spanDays = (a, b) => a && b ? Math.round(Math.abs(b - a) / 86_400_000) + 1 : 0;

const MONTHS_FULL = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const MONTHS_ABB = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const FMT = d =>
  d ? `${MONTHS_ABB[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : "";

/* Format date as dd-mm-yyyy for the editable inputs */
const toInputFmt = d => {
  if (!d) return "";
  const p = n => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth()+1)}-${d.getFullYear()}`;
};

/* Auto-format typed string → DD-MM-YYYY with live dashes */
const autoFmtDate = (raw, prev) => {
  // Strip all non-digits
  let digits = raw.replace(/\D/g, "");
  // Cap at 8 digits (DDMMYYYY)
  if (digits.length > 8) digits = digits.slice(0, 8);
  // Insert dashes
  let out = digits;
  if (digits.length > 4) out = digits.slice(0,2) + "-" + digits.slice(2,4) + "-" + digits.slice(4);
  else if (digits.length > 2) out = digits.slice(0,2) + "-" + digits.slice(2);
  return out;
};

const buildCells = (y, m) => {
  const first = new Date(y, m, 1).getDay();
  const total = new Date(y, m + 1, 0).getDate();
  const cells = Array(first).fill(null);
  for (let i = 1; i <= total; i++) cells.push(new Date(y, m, i));
  while (cells.length % 7) cells.push(null);
  return cells;
};

/* ── Dynamic quarter presets for current year ── */
const buildQuarterPresets = () => {
  const now    = new Date();
  const year   = now.getFullYear();
  const curQ   = Math.floor(now.getMonth() / 3); // 0-indexed current quarter
  const QLABELS = ["Q1", "Q2", "Q3", "Q4"];
  const presets = [];
  for (let q = 0; q <= curQ; q++) {
    const startMonth = q * 3;
    const endMonth   = startMonth + 2;
    const endDay     = new Date(year, endMonth + 1, 0); // last day of quarter-end month
    const to         = q === curQ ? tod() : endDay;     // cap current quarter at today
    presets.push({
      label: `${QLABELS[q]} ${year}`,
      get: () => ({ from: new Date(year, startMonth, 1), to }),
    });
  }
  return presets;
};

const PRESETS = [
  { label: "Today",        get: () => { const t = tod(); return { from: t, to: t }; } },
  { label: "Yesterday",    get: () => { const d = tod(); d.setDate(d.getDate()-1); return { from: d, to: d }; } },
  { label: "Last 7 Days",  get: () => { const t = tod(), s = tod(); s.setDate(s.getDate()-6);  return { from: s, to: t }; } },
  { label: "Last 30 Days", get: () => { const t = tod(), s = tod(); s.setDate(s.getDate()-29); return { from: s, to: t }; } },
  { label: "This Month",   get: () => { const t = tod(); return { from: new Date(t.getFullYear(), t.getMonth(), 1), to: t }; } },
  { label: "Last Month",   get: () => { const t = tod(); return { from: new Date(t.getFullYear(), t.getMonth()-1, 1), to: new Date(t.getFullYear(), t.getMonth(), 0) }; } },
  { label: "This Year",    get: () => { const t = tod(); return { from: new Date(t.getFullYear(), 0, 1), to: t }; } },
  ...buildQuarterPresets(),
];/* ── More presets (shown in sub-panel) ── */
const buildMorePresets = () => {
  const now  = new Date();
  const year = now.getFullYear();
  const t    = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
  const QLABELS = ["Q1","Q2","Q3","Q4"];
  const quarters = [];
  for (let q = 2; q <= 3; q++) {                        // Q3 = index 2, Q4 = index 3
    const startMonth = q * 3;
    const endMonth   = startMonth + 2;
    quarters.push({
      label: `${QLABELS[q]} ${year}`,
      get: () => ({ from: new Date(year, startMonth, 1), to: new Date(year, endMonth + 1, 0) }),
    });
  }
  return [
    ...quarters,
    { label: "Last 3 Months", get: () => { const d = t(); return { from: new Date(d.getFullYear(), d.getMonth()-3, 1), to: d }; } },
    { label: "Last 6 Months", get: () => { const d = t(); return { from: new Date(d.getFullYear(), d.getMonth()-6, 1), to: d }; } },
    { label: "Last Year",     get: () => { const y = new Date().getFullYear()-1; return { from: new Date(y,0,1), to: new Date(y,11,31) }; } },
  ];
};

const MORE_PRESETS = buildMorePresets();


/* ─── Month Grid ─────────────────────────────────────────── */
function CdrMonthGrid({ year, month, from, to, hovered, onDayClick, onDayHover }) {
  const cells  = buildCells(year, month);
  const todayD = tod();
  const eTo    = to || hovered;

  return (
    <div className="cdr-cal">
      <div className="cdr-cal__head">
        {DOW_LABELS.map((d, i) => (
          <span key={i} className="cdr-cal__dow">{d}</span>
        ))}
      </div>
      <div className="cdr-cal__body">
        {cells.map((day, i) => {
          if (!day) return <span key={i} className="cdr-day cdr-day--empty" />;

          const isFrom   = sameDay(day, from);
          const isToConf = to    && sameDay(day, to);
          const isHover  = !to   && eTo && sameDay(day, eTo);
          const isToday  = sameDay(day, todayD);
          const disabled = day > todayD;
          const dow      = day.getDay();

          let inRange = false;
          if (from && eTo) {
            const [lo, hi] = from <= eTo ? [from, eTo] : [eTo, from];
            inRange = day > lo && day < hi;
          }

          const cls = [
            "cdr-day",
            isFrom               ? "cdr-day--from"      : "",
            isToConf             ? "cdr-day--to"        : "",
            isHover              ? "cdr-day--hover-end" : "",
            inRange              ? "cdr-day--in"        : "",
            inRange && dow === 0 ? "cdr-day--in-first"  : "",
            inRange && dow === 6 ? "cdr-day--in-last"   : "",
            isToday              ? "cdr-day--today"     : "",
            disabled             ? "cdr-day--disabled"  : "",
          ].filter(Boolean).join(" ");

          return (
            <span
              key={i}
              className={cls}
              style={{ "--cdr-di": i % 7, "--cdr-ri": Math.floor(i / 7) }}
              onClick={() => !disabled && onDayClick(day)}
              onMouseEnter={() => !disabled && onDayHover(day)}
            >
              <span className="cdr-day__n">{day.getDate()}</span>
              {isToday && <span className="cdr-day__dot" />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Portal ─────────────────────────────────────────────── */
function CdrPortal({ anchorRef, children }) {
  const [style, setStyle] = useState({
    position: "fixed", top: 0, left: 0, zIndex: 999999,
  });

  useEffect(() => {
    const place = () => {
      if (!anchorRef.current) return;
      const r  = anchorRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const W  = Math.min(720, vw - 24);
      let left = r.left;
      if (left + W > vw - 10) left = Math.max(10, vw - W - 10);
      const spaceBelow = vh - r.bottom - 10;
      const top = spaceBelow >= 460 ? r.bottom + 8 : Math.max(10, r.top - 490);
      setStyle({ position: "fixed", top, left, width: W, zIndex: 999999 });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef]);

  return createPortal(
    <div className="cdr-portal" style={style}>{children}</div>,
    document.body
  );
}

/* ─── Nav Button ─────────────────────────────────────────── */
function NavBtn({ dir, onClick, label }) {
  return (
    <button className="cdr-nav-btn" onClick={onClick} type="button" aria-label={label}>
      {dir === "prev" ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15,18 9,12 15,6"/>
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      )}
    </button>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function ChartDatePicker({ from, to, onChange }) {
  const [open,         setOpen]         = useState(false);
  const [leftMonth,    setLeftMonth]    = useState(() => addMo(tod(), -1));
  const [picking,      setPicking]      = useState(null);
  const [hovered,      setHovered]      = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const [moreOpen,     setMoreOpen]     = useState(false);
  const [fromInput,    setFromInput]    = useState("");
  const [toInput,      setToInput]      = useState("");
  const [inputErr,     setInputErr]     = useState("");

  const wrapRef    = useRef(null);
  const triggerRef = useRef(null);
  const moreRef    = useRef(null);
  const rightMonth = addMo(leftMonth, 1);
  const days       = spanDays(from, to);

  /* sync inputs when from/to change via calendar clicks or presets */
  useEffect(() => {
    setFromInput(from ? toInputFmt(from) : "");
    setToInput(to   ? toInputFmt(to)   : "");
    setInputErr("");
  }, [from, to]);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const h = e => {
      if (wrapRef.current?.contains(e.target)) return;
      if (e.target.closest?.(".cdr-portal"))   return;
      setOpen(false);
      setMoreOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  /* close More sub-panel on outside click */
  useEffect(() => {
    if (!moreOpen) return;
    const h = e => {
      if (moreRef.current?.contains(e.target)) return;
      setMoreOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [moreOpen]);

  /* Esc to close */
  useEffect(() => {
    if (!open) return;
    const h = e => { if (e.key === "Escape") { setOpen(false); setMoreOpen(false); } };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  /* two-tap day selection */
  const handleDay = useCallback(day => {
    if (!picking) {
      setPicking(day);
      setHovered(null);
      onChange({ from: day, to: null });
      setActivePreset(null);
    } else {
      const [f, t] = day < picking ? [day, picking] : [picking, day];
      onChange({ from: f, to: t });
      setPicking(null);
      setHovered(null);
      setOpen(false);
    }
  }, [picking, onChange]);

  /* preset click */
  const handlePreset = (p, closeMore = false) => {
    const range = p.get();
    onChange(range);
    setPicking(null);
    setHovered(null);
    setLeftMonth(addMo(range.from, -1));
    setActivePreset(p.label);
    if (closeMore) setMoreOpen(false);
    setOpen(false);
  };

  const clear = e => {
    e?.stopPropagation();
    onChange({ from: null, to: null });
    setPicking(null);
    setActivePreset(null);
    setFromInput("");
    setToInput("");
    setInputErr("");
  };

  /* parse dd-mm-yyyy or yyyy-mm-dd or dd/mm/yyyy typed input */
  const parseTyped = str => {
    if (!str) return null;
    str = str.trim();
    // yyyy-mm-dd
    let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) { const d = new Date(+m[1], +m[2]-1, +m[3]); d.setHours(0,0,0,0); return isNaN(d) ? null : d; }
    // dd-mm-yyyy or dd/mm/yyyy
    m = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (m) { const d = new Date(+m[3], +m[2]-1, +m[1]); d.setHours(0,0,0,0); return isNaN(d) ? null : d; }
    return null;
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
      if (f) setLeftMonth(addMo(f, -1));
      setActivePreset(null);
      setPicking(null);
    }
    setOpen(false);
  };

  const label =
    from && to ? `${FMT(from)}  —  ${FMT(to)}`
  : from       ? `${FMT(from)}  —  pick end`
  :               "Select date range";

  /* ── Calendar icon SVG ── */
  const CalIco = () => (
    <svg className="cdr-trigger__ico" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  );

  return (
    <div className="cdr-wrap" ref={wrapRef}>

      {/* ── Trigger ── */}
      <button
        ref={triggerRef}
        className={[
          "cdr-trigger",
          open ? "cdr-trigger--open" : "",
          from ? "cdr-trigger--filled" : "",
        ].filter(Boolean).join(" ")}
        onClick={() => setOpen(o => !o)}
        type="button"
        aria-label="Select date range"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalIco />

        <span className="cdr-trigger__lbl">{label}</span>

        {days > 0 && (
          <span className="cdr-trigger__badge">{days}d</span>
        )}

        {from && (
          <span
            className="cdr-trigger__clear"
            onClick={clear}
            title="Clear"
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === "Enter" && clear(e)}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="3">
              <line x1="18" y1="6"  x2="6"  y2="18"/>
              <line x1="6"  y1="6"  x2="18" y2="18"/>
            </svg>
          </span>
        )}

        <svg
          className={`cdr-trigger__caret${open ? " cdr-trigger__caret--flip" : ""}`}
          width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="6,9 12,15 18,9"/>
        </svg>
      </button>

      {/* ── Popup ── */}
      {open && (
        <CdrPortal anchorRef={triggerRef}>
          <div
            className="cdr-popup"
            role="dialog"
            aria-label="Date range picker"
            onMouseLeave={() => setHovered(null)}
          >

            {/* Preset chips */}
            <div className="cdr-presets">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  className={`cdr-preset${activePreset === p.label ? " cdr-preset--on" : ""}`}
                  onClick={() => handlePreset(p)}
                  type="button"
                >
                  {p.label}
                </button>
              ))}

              {/* More button + sub-panel */}
              <div className="cdr-more" ref={moreRef}>
                <button
                  type="button"
                  className={`cdr-preset cdr-preset--more ${moreOpen ? "cdr-preset--more-open" : ""}`}
                  onClick={() => setMoreOpen(o => !o)}
                >
                  More
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"
                    style={{ marginLeft: 2, transition: "transform .2s", transform: moreOpen ? "rotate(180deg)" : "none" }}>
                    <polyline points="6,9 12,15 18,9"/>
                  </svg>
                </button>

                {moreOpen && (
                  <div className="cdr-more__panel">
                    <div className="cdr-more__section-label">Quarters</div>
                    {MORE_PRESETS.slice(0, 2).map(p => (
                      <button
                        key={p.label}
                        type="button"
                        className={`cdr-more__item${activePreset === p.label ? " cdr-more__item--on" : ""}`}
                        onClick={() => handlePreset(p, true)}
                      >
                        {p.label}
                      </button>
                    ))}
                    <div className="cdr-more__divider"/>
                    <div className="cdr-more__section-label">Ranges</div>
                    {MORE_PRESETS.slice(2).map(p => (
                      <button
                        key={p.label}
                        type="button"
                        className={`cdr-more__item${activePreset === p.label ? " cdr-more__item--on" : ""}`}
                        onClick={() => handlePreset(p, true)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="cdr-popup__divider" />

            {/* Dual calendars */}
            <div className="cdr-cals">

              {/* Left month */}
              <div className="cdr-month-wrap">
                <div className="cdr-month-nav">
                  <NavBtn dir="prev" onClick={() => setLeftMonth(addMo(leftMonth, -1))} label="Previous month" />
                  <span className="cdr-month-lbl">
                    {MONTHS_FULL[leftMonth.getMonth()]}
                    <em>{leftMonth.getFullYear()}</em>
                  </span>
                  <NavBtn dir="next" onClick={() => setLeftMonth(addMo(leftMonth, 1))} label="Next month" />
                </div>
                <CdrMonthGrid
                  year={leftMonth.getFullYear()} month={leftMonth.getMonth()}
                  from={picking || from} to={!picking ? to : null}
                  hovered={hovered}
                  onDayClick={handleDay} onDayHover={setHovered}
                />
              </div>

              <div className="cdr-cals__divider" />

              {/* Right month */}
              <div className="cdr-month-wrap">
                <div className="cdr-month-nav">
                  <NavBtn dir="prev" onClick={() => setLeftMonth(addMo(leftMonth, -1))} label="Previous month" />
                  <span className="cdr-month-lbl">
                    {MONTHS_FULL[rightMonth.getMonth()]}
                    <em>{rightMonth.getFullYear()}</em>
                  </span>
                  <NavBtn dir="next" onClick={() => setLeftMonth(addMo(leftMonth, 1))} label="Next month" />
                </div>
                <CdrMonthGrid
                  year={rightMonth.getFullYear()} month={rightMonth.getMonth()}
                  from={picking || from} to={!picking ? to : null}
                  hovered={hovered}
                  onDayClick={handleDay} onDayHover={setHovered}
                />
              </div>

            </div>

            {/* Footer */}
            <div className="cdr-footer">
              <div className="cdr-footer__range">

                {/* From input */}
                <div className="cdr-footer__input-wrap">
                  <svg className="cdr-footer__input-ico" width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <input
                    className={`cdr-footer__input ${inputErr.includes("From") ? "cdr-footer__input--err" : fromInput ? "cdr-footer__input--set" : ""}`}
                    type="text"
                    placeholder="DD-MM-YYYY"
                    value={fromInput}
                    onChange={e => { setFromInput(autoFmtDate(e.target.value, fromInput)); setInputErr(""); }}
                    onKeyDown={e => e.key === "Enter" && handleApply()}
                    maxLength={10}
                  />
                </div>

                <span className="cdr-footer__arrow">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="13,6 19,12 13,18"/>
                  </svg>
                </span>

                {/* To input */}
                <div className="cdr-footer__input-wrap">
                  <svg className="cdr-footer__input-ico" width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <input
                    className={`cdr-footer__input ${inputErr.includes("To") ? "cdr-footer__input--err" : toInput ? "cdr-footer__input--set" : ""}`}
                    type="text"
                    placeholder="DD-MM-YYYY"
                    value={toInput}
                    onChange={e => { setToInput(autoFmtDate(e.target.value, toInput)); setInputErr(""); }}
                    onKeyDown={e => e.key === "Enter" && handleApply()}
                    maxLength={10}
                  />
                </div>

                {days > 0 && (
                  <span className="cdr-footer__span">
                    {days} day{days > 1 ? "s" : ""}
                  </span>
                )}

                {inputErr && (
                  <span className="cdr-footer__err">{inputErr}</span>
                )}

              </div>

              <div className="cdr-footer__btns">
                <button className="cdr-btn cdr-btn--ghost" onClick={clear} type="button">
                  Clear
                </button>
                <button
                  className="cdr-btn cdr-btn--primary"
                  onClick={handleApply}
                  type="button"
                >
                  Apply
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="3">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </CdrPortal>
      )}
    </div>
  );
}