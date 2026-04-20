/**
 * Dashboard2DatePicker.jsx
 * Prefix: d2dp-
 * Rich animated date-range picker — period pills + calendar popup
 */

import { useState, useRef, useEffect } from "react";
import "./Dashboard2DatePicker.css";

// ── Constants ─────────────────────────────────────────────────────
const PERIODS = [
  { key: "today",   label: "Today",      icon: "⚡" },
  { key: "week",    label: "This Week",  icon: "📅" },
  { key: "month",   label: "This Month", icon: "🗓️" },
  { key: "custom",  label: "Custom",     icon: "✂️" },
];

const MONTHS_FULL = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS_ABR = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ── Helpers ────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, "0"); }
function fmt(d) {
  if (!d) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function sameDay(a, b) {
  return a && b && a.toDateString() === b.toDateString();
}
function between(d, from, to) {
  return d && from && to && d > from && d < to;
}
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function firstDow(y, m)    { return new Date(y, m, 1).getDay(); }

function presetRange(key) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  if (key === "today") {
    return { from: new Date(t), to: new Date(t) };
  } else if (key === "week") {
    const f = new Date(t); f.setDate(t.getDate() - t.getDay());
    const e = new Date(t); e.setDate(t.getDate() + (6 - t.getDay()));
    return { from: f, to: e };
  } else if (key === "month") {
    return {
      from: new Date(t.getFullYear(), t.getMonth(), 1),
      to:   new Date(t),
    };
  }
  return { from: null, to: null };
}

function rangeChipLabel(activePeriod, fromDate, toDate) {
  if (activePeriod !== "custom") {
    const { from, to } = presetRange(activePeriod);
    if (!from) return "Select range…";
    if (sameDay(from, to)) return fmt(from);
    return `${fmt(from)}  →  ${fmt(to)}`;
  }
  if (fromDate && toDate) return `${fmt(fromDate)}  →  ${fmt(toDate)}`;
  if (fromDate)           return `${fmt(fromDate)}  →  …`;
  return "Pick a date range…";
}

// ════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════
export default function Dashboard2DatePicker({
  activePeriod = "today",
  onPeriodChange,
  onRangeChange,
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [open,      setOpen]      = useState(false);
  const [fromDate,  setFromDate]  = useState(null);
  const [toDate,    setToDate]    = useState(null);
  const [hovDate,   setHovDate]   = useState(null);
  const [picking,   setPicking]   = useState("from");   // "from" | "to"
  const [calYear,   setCalYear]   = useState(today.getFullYear());
  const [calMonth,  setCalMonth]  = useState(today.getMonth());
  const [slideDir,  setSlideDir]  = useState("");        // "left" | "right"
  const [calKey,    setCalKey]    = useState(0);
  const [popAnim,   setPopAnim]   = useState("");        // "in" | "out"

  const rootRef = useRef(null);

  // ── Close on outside click
  useEffect(() => {
    const fn = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        closePopup();
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // ── Popup helpers
  const openPopup = () => {
    setOpen(true);
    setPopAnim("in");
  };
  const closePopup = () => {
    setPopAnim("out");
    setTimeout(() => setOpen(false), 200);
  };

  // ── Period pill click
  const selectPeriod = (key) => {
    onPeriodChange?.(key);
    if (key === "custom") {
      openPopup();
    } else {
      closePopup();
      const range = presetRange(key);
      setFromDate(range.from);
      setToDate(range.to);
      setPicking("from");
      onRangeChange?.({ ...range, period: key });
    }
  };

  // ── Month navigation
  const navMonth = (dir) => {
    setSlideDir(dir > 0 ? "right" : "left");
    setCalKey((k) => k + 1);
    let m = calMonth + dir, y = calYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setCalMonth(m);
    setCalYear(y);
  };

  // ── Day pick logic
  const pickDay = (date) => {
    if (picking === "from") {
      setFromDate(date);
      setToDate(null);
      setPicking("to");
    } else {
      if (date < fromDate) {
        setFromDate(date);
        setToDate(fromDate);
      } else {
        setToDate(date);
      }
      setPicking("from");
      setHovDate(null);
    }
  };

  // ── Quick range setter (shortcuts)
  const setQuick = (from, to) => {
    setFromDate(from);
    setToDate(to);
    setPicking("from");
    setHovDate(null);
  };

  // ── Apply / Clear
  const apply = () => {
    if (!fromDate || !toDate) return;
    onRangeChange?.({ from: fromDate, to: toDate, period: "custom" });
    closePopup();
  };
  const clear = () => {
    setFromDate(null);
    setToDate(null);
    setPicking("from");
    setHovDate(null);
  };

  // ── Build grid cells
  const cells = [];
  for (let i = 0; i < firstDow(calYear, calMonth); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth(calYear, calMonth); d++)
    cells.push(new Date(calYear, calMonth, d));

  // Preview to-date while hovering
  const previewTo =
    toDate ||
    (picking === "to" && hovDate && fromDate && hovDate >= fromDate
      ? hovDate
      : null);

  const canApply = !!(fromDate && toDate);

  return (
    <div className="d2dp-root" ref={rootRef}>

      {/* ══════════════ Period Pills ══════════════ */}
      <div className="d2dp-pills">
        <span className="d2dp-pills-label">PERIOD</span>
        <div className="d2dp-pills-track">
          {PERIODS.map((p, i) => (
            <button
              key={p.key}
              className={`d2dp-pill ${activePeriod === p.key ? "d2dp-pill--on" : ""}`}
              style={{ "--pi": i }}
              onClick={() => selectPeriod(p.key)}
            >
              <span className="d2dp-pill-ico">{p.icon}</span>
              <span className="d2dp-pill-txt">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════ Range Chip ══════════════ */}
      <div
        className={[
          "d2dp-chip",
          activePeriod === "custom" ? "d2dp-chip--custom" : "",
          open ? "d2dp-chip--open" : "",
        ].join(" ")}
        onClick={() => activePeriod === "custom" && (open ? closePopup() : openPopup())}
      >
        <span className="d2dp-chip-cal">📅</span>
        <span className="d2dp-chip-txt">
          {rangeChipLabel(activePeriod, fromDate, toDate)}
        </span>
        {activePeriod === "custom" && (
          <span className={`d2dp-chip-caret ${open ? "d2dp-chip-caret--up" : ""}`}>▾</span>
        )}
      </div>

      {/* ══════════════ Calendar Popup ══════════════ */}
      {open && (
        <div className={`d2dp-popup d2dp-popup--${popAnim}`}>

          {/* Gradient top stripe */}
          <div className="d2dp-popup__stripe" />

          {/* Header */}
          <div className="d2dp-popup__hd">
            <div className="d2dp-popup__hd-left">
              <span className="d2dp-popup__ico">📅</span>
              <span className="d2dp-popup__title">Custom Date Range</span>
            </div>
            <button className="d2dp-popup__x" onClick={closePopup}>✕</button>
          </div>

          {/* From / To indicator row */}
          <div className="d2dp-inds">
            <Indicator
              badge="FROM"
              value={fmt(fromDate) || "Pick start date"}
              state={picking === "from" ? "active" : fromDate ? "set" : "idle"}
            />
            <div className="d2dp-ind-arrow">→</div>
            <Indicator
              badge="TO"
              value={fmt(toDate) || (picking === "to" ? "Pick end date" : "—")}
              state={picking === "to" ? "active" : toDate ? "set" : "idle"}
            />
          </div>

          {/* Month Navigation */}
          <div className="d2dp-nav">
            <NavBtn dir="prev" onClick={() => navMonth(-1)} />
            <span className="d2dp-nav-label">
              {MONTHS_FULL[calMonth]} {calYear}
            </span>
            <NavBtn dir="next" onClick={() => navMonth(1)} />
          </div>

          {/* Calendar Grid */}
          <div className="d2dp-grid-wrap">
            <div
              className={`d2dp-grid d2dp-grid--${slideDir}`}
              key={calKey}
            >
              {/* Day-of-week headers */}
              {DAYS_ABR.map((d) => (
                <div key={d} className="d2dp-dname">{d}</div>
              ))}

              {/* Day cells */}
              {cells.map((date, idx) => {
                if (!date) return (
                  <div key={`blank-${idx}`} className="d2dp-cell d2dp-cell--blank" />
                );
                const isFrom  = sameDay(date, fromDate);
                const isTo    = sameDay(date, toDate);
                const inRng   = between(date, fromDate, previewTo);
                const isToday = sameDay(date, today);
                const isHov   = picking === "to" && sameDay(date, hovDate) && fromDate && date >= fromDate;

                return (
                  <div
                    key={date.toISOString()}
                    className={[
                      "d2dp-cell",
                      isFrom  ? "d2dp-cell--from"  : "",
                      isTo    ? "d2dp-cell--to"    : "",
                      inRng   ? "d2dp-cell--range" : "",
                      isToday && !isFrom && !isTo ? "d2dp-cell--today" : "",
                      isHov   ? "d2dp-cell--hov"   : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => pickDay(date)}
                    onMouseEnter={() => picking === "to" && setHovDate(date)}
                    onMouseLeave={() => picking === "to" && setHovDate(null)}
                  >
                    <span className="d2dp-cell-n">{date.getDate()}</span>
                    {isToday && !isFrom && !isTo && (
                      <span className="d2dp-today-pip" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="d2dp-shortcuts">
            {SHORTCUTS.map((s) => (
              <button
                key={s.label}
                className="d2dp-shortcut"
                onClick={() => setQuick(s.from(), s.to())}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="d2dp-footer">
            <button className="d2dp-btn d2dp-btn--ghost" onClick={clear}>
              Clear
            </button>
            <button
              className={`d2dp-btn d2dp-btn--apply ${canApply ? "" : "d2dp-btn--dim"}`}
              onClick={apply}
              disabled={!canApply}
            >
              Apply Range
              <span className="d2dp-btn-arrow">→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════════

function Indicator({ badge, value, state }) {
  return (
    <div className={`d2dp-ind d2dp-ind--${state}`}>
      <span className="d2dp-ind-badge">{badge}</span>
      <span className="d2dp-ind-val">{value}</span>
    </div>
  );
}

function NavBtn({ dir, onClick }) {
  return (
    <button className={`d2dp-nav-btn d2dp-nav-btn--${dir}`} onClick={onClick}>
      {dir === "prev" ? "‹" : "›"}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
//  SHORTCUTS DATA
// ════════════════════════════════════════════════════════════════════
const mk = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
const soM = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };
const eoM = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0); };
const soQ = () => { const d = new Date(); const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3, 1); };
const eoQ = () => { const d = new Date(); const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3 + 3, 0); };

const SHORTCUTS = [
  { label: "Last 7 Days",   from: () => mk(-6),  to: () => mk(0)   },
  { label: "Last 14 Days",  from: () => mk(-13), to: () => mk(0)   },
  { label: "Last 30 Days",  from: () => mk(-29), to: () => mk(0)   },
  { label: "This Month",    from: soM,           to: eoM           },
  { label: "This Quarter",  from: soQ,           to: eoQ           },
];