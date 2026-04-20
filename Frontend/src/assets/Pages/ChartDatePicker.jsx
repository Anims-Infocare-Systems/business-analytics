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

const buildCells = (y, m) => {
  const first = new Date(y, m, 1).getDay();
  const total = new Date(y, m + 1, 0).getDate();
  const cells = Array(first).fill(null);
  for (let i = 1; i <= total; i++) cells.push(new Date(y, m, i));
  while (cells.length % 7) cells.push(null);
  return cells;
};

const PRESETS = [
  { label: "Today",        get: () => { const t = tod(); return { from: t, to: t }; } },
  { label: "Yesterday",    get: () => { const d = tod(); d.setDate(d.getDate()-1); return { from: d, to: d }; } },
  { label: "Last 7 Days",  get: () => { const t = tod(), s = tod(); s.setDate(s.getDate()-6);  return { from: s, to: t }; } },
  { label: "Last 14 Days", get: () => { const t = tod(), s = tod(); s.setDate(s.getDate()-13); return { from: s, to: t }; } },
  { label: "Last 30 Days", get: () => { const t = tod(), s = tod(); s.setDate(s.getDate()-29); return { from: s, to: t }; } },
  { label: "This Month",   get: () => { const t = tod(); return { from: new Date(t.getFullYear(), t.getMonth(), 1), to: t }; } },
  { label: "Last Month",   get: () => { const t = tod(); return { from: new Date(t.getFullYear(), t.getMonth()-1, 1), to: new Date(t.getFullYear(), t.getMonth(), 0) }; } },
  { label: "This Quarter", get: () => { const t = tod(), q = Math.floor(t.getMonth()/3); return { from: new Date(t.getFullYear(), q*3, 1), to: t }; } },
  { label: "This Year",    get: () => { const t = tod(); return { from: new Date(t.getFullYear(), 0, 1), to: t }; } },
];

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

  const wrapRef    = useRef(null);
  const triggerRef = useRef(null);
  const rightMonth = addMo(leftMonth, 1);
  const days       = spanDays(from, to);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const h = e => {
      if (wrapRef.current?.contains(e.target)) return;
      if (e.target.closest?.(".cdr-portal"))   return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  /* Esc to close */
  useEffect(() => {
    if (!open) return;
    const h = e => { if (e.key === "Escape") setOpen(false); };
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
  const handlePreset = p => {
    const range = p.get();
    onChange(range);
    setPicking(null);
    setHovered(null);
    setLeftMonth(addMo(range.from, -1));
    setActivePreset(p.label);
    setOpen(false);
  };

  const clear = e => {
    e?.stopPropagation();
    onChange({ from: null, to: null });
    setPicking(null);
    setActivePreset(null);
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
              {/* <span className="cdr-presets__hd">Quick</span> */}
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

                <div className={`cdr-footer__chip${from ? " cdr-footer__chip--set" : ""}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {from ? FMT(from) : "From date"}
                </div>

                <span className="cdr-footer__arrow">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="13,6 19,12 13,18"/>
                  </svg>
                </span>

                <div className={`cdr-footer__chip${to ? " cdr-footer__chip--set" : ""}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {to ? FMT(to) : "To date"}
                </div>

                {days > 0 && (
                  <span className="cdr-footer__span">
                    {days} day{days > 1 ? "s" : ""}
                  </span>
                )}

              </div>

              <div className="cdr-footer__btns">
                <button className="cdr-btn cdr-btn--ghost" onClick={clear} type="button">
                  Clear
                </button>
                <button
                  className="cdr-btn cdr-btn--primary"
                  onClick={() => setOpen(false)}
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