import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import { Chart, registerables } from "chart.js";
import "./IdleTimeReport.css";

Chart.register(...registerables);

/* ════════════════════════════════════════════════
   DATA CONSTANTS
════════════════════════════════════════════════ */

const KPI_CARDS = [
  { icon:"⏱",  label:"Total Machine Idle Hours",  value:"13,418:40", sub:"This Period",       badge:"+8.5%",   neg:true,  color:"#dc2626", bg:"#fef2f2", border:"#dc2626" },
  { icon:"💰",  label:"Total Idle Cost",            value:"₹4.25 L",   sub:"March 2026",        badge:"+12.3%",  neg:true,  color:"#f97316", bg:"#fff7ed", border:"#f97316" },
  { icon:"🏭",  label:"Avg Idle Per Machine",       value:"148:35",    sub:"Hrs / machine",     badge:"90 m/c",  neg:false, color:"#2563eb", bg:"#eff6ff", border:"#2563eb" },
  { icon:"📋",  label:"Idle Not Entered",           value:"14",        sub:"Machines pending",  badge:"↑ 2",     neg:true,  color:"#7c3aed", bg:"#f5f3ff", border:"#7c3aed" },
  { icon:"📈",  label:"Top Idle Reason",            value:"NO PLAN",   sub:"7.62% of total",    badge:"↑ high",  neg:true,  color:"#d97706", bg:"#fffbeb", border:"#d97706" },
  { icon:"🔄",  label:"Continuous Idle > 4h",       value:"7",         sub:"Machines flagged",  badge:"3 crit",  neg:true,  color:"#0891b2", bg:"#ecfeff", border:"#0891b2" },
];

const TOP_REASONS = {
  labels:["MACHINE CLEANING","INSERT CHANGE","NO LOAD","MACHINE BREAKDOWN",
          "SETTING","NMP","LUNCH HOURS","TOOL CHANGE","WAITING SETTER","WAITING MATERIAL"],
  data:  [1210,912,1033,343,106,361,679,420,118,280],
  colors:["#dc2626","#f97316","#d97706","#dc2626","#0891b2",
          "#f97316","#16a34a","#7c3aed","#2563eb","#0891b2"],
};

const MONTHWISE = {
  labels:["Oct 25","Nov 25","Dec 25","Jan 26","Feb 26","Mar 26"],
  hours: [2100,1980,2400,2200,1850,2890],
  cost:  [0.65,0.61,0.74,0.68,0.57,0.90],
};

const DAYWISE = {
  labels: Array.from({length:27},(_,i)=>`${i+1}`),
  data:   [340,280,410,390,320,0,0,450,390,310,420,380,290,0,
           0,460,420,350,390,300,280,440,380,350,410,290,420],
};

const SHIFT_DATA = {
  labels:["BROACH-1","BROACH-2","TC-01","TC-02","VMC-01","VMC-02","VTL-03"],
  s1:[38,62,55,42,58,45,32],
  s2:[44,58,60,38,52,56,38],
  s3:[36,59,59,47,56,67,60],
};

const COST_MACHINE = {
  labels:["TC-24-S1","TC-41-L","TC-20","BROACH-2","TC-42","VMC-23","TC-27",
          "TC-30","TC-25","TC-45","TC-50","VTL-05","TC-39","VMC-01","TC-37"],
  hours: [210,196,188,180,175,172,168,165,162,158,155,152,148,138,142],
  cost:  [66,62,60,57,55,54,53,52,51,50,49,48,47,44,45],
};

const PCT_MACHINE = {
  labels:["TC-24-S1","TC-41-L","TC-20","BROACH-2","TC-42","VMC-23","TC-27","TC-30","TC-25","TC-45"],
  data:  [14.2,13.3,12.7,12.2,11.9,11.6,11.4,11.2,11.0,10.7],
};

const CONTINUOUS = [
  { machine:"TC-24-S1", reason:"MACHINE BREAKDOWN", hours:"4:30", shifts:2, status:"CRITICAL" },
  { machine:"VMC-01",   reason:"NO PLAN",            hours:"6:00", shifts:3, status:"CRITICAL" },
  { machine:"TC-41-L",  reason:"NMP",                hours:"5:15", shifts:2, status:"HIGH"     },
  { machine:"BROACH-2", reason:"MACHINE BREAKDOWN",  hours:"4:00", shifts:1, status:"HIGH"     },
  { machine:"VTL-03",   reason:"NO LOAD",            hours:"4:45", shifts:2, status:"HIGH"     },
  { machine:"TC-02",    reason:"NO PLAN",            hours:"5:30", shifts:3, status:"CRITICAL" },
  { machine:"TC-20",    reason:"MACHINE CLEANING",   hours:"4:10", shifts:1, status:"MEDIUM"   },
];

const NOT_ENTERED = [
  { machine:"TC-15",    shift:"Shift 1", date:"25 Mar", operator:"Rajan K"   },
  { machine:"VMC-05",   shift:"Shift 2", date:"26 Mar", operator:"Murugan S" },
  { machine:"TC-28",    shift:"Shift 3", date:"26 Mar", operator:"Pending"   },
  { machine:"BROACH-3", shift:"Shift 1", date:"27 Mar", operator:"Karthik P" },
  { machine:"VTL-02",   shift:"Shift 2", date:"25 Mar", operator:"Pending"   },
];

const TABLE_ROWS = [
  { reason:"NO PLAN",            cols:["3:30","12:00","19:00","14:00","48:00","38:00","161:00"], total:"458:15",  pct:"7.62", lvl:"high"   },
  { reason:"NMP",                cols:["24:15","52:30","55:00","28:30","62:30","65:00","72:00"], total:"361:25",  pct:"6.02", lvl:"high"   },
  { reason:"INSERT CHANGE",      cols:["0:30","0:30","8:00","16:20","21:30","22:25","6:45"],     total:"912:55",  pct:"1.52", lvl:"medium" },
  { reason:"MACHINE CLEANING",   cols:["14:45","7:15","19:30","17:15","21:15","25:15","13:00"],  total:"1210:15", pct:"2.01", lvl:"medium" },
  { reason:"LUNCH HOURS",        cols:["7:30","3:00","5:00","12:30","11:30","11:00","3:00"],     total:"679:20",  pct:"1.13", lvl:"low"    },
  { reason:"MACHINE BREAKDOWN",  cols:["5:00","32:30","31:00","8:30","120:00","87:30","3:30"],   total:"343:00",  pct:"0.57", lvl:"high"   },
  { reason:"NO LOAD",            cols:["18:15","62:45","2:00","6:00","2:30","15:00","45:00"],    total:"1033:00", pct:"1.72", lvl:"medium" },
  { reason:"SETTING",            cols:["21:30","0:30","1:00","1:00","0:30","3:00","14:00"],      total:"106:00",  pct:"0.18", lvl:"medium" },
  { reason:"WAITING FOR SETTER", cols:["0:00","5:30","8:30","8:30","7:00","1:30","3:30"],        total:"118:15",  pct:"0.20", lvl:null     },
];
const COL_HDR = ["BROACH-1","BROACH-2","TC-01","TC-02","VMC-01","VMC-02","VTL-03"];

const SHIFT_TILES = [
  { label:"Shift 1  6AM–2PM",  count:38, total:90, color:"#2563eb", bg:"rgba(37,99,235,0.07)",  border:"rgba(37,99,235,0.2)"  },
  { label:"Shift 2  2PM–10PM", count:44, total:90, color:"#f97316", bg:"rgba(249,115,22,0.07)", border:"rgba(249,115,22,0.2)" },
  { label:"Shift 3  10PM–6AM", count:31, total:90, color:"#16a34a", bg:"rgba(22,163,74,0.07)",  border:"rgba(22,163,74,0.2)"  },
  { label:"All Shifts",        count:90, total:90, color:"#7c3aed", bg:"rgba(124,58,237,0.07)", border:"rgba(124,58,237,0.2)" },
];

const TOTAL_STATS = [
  { label:"Total Machine Hours Available", value:"90,000:00", color:"#2563eb" },
  { label:"Total Idle Hours",              value:"13,418:40", color:"#dc2626" },
  { label:"Total Productive Hours",        value:"76,581:20", color:"#16a34a" },
  { label:"Overall Idle %",                value:"14.9%",     color:"#f97316" },
];

const FOOTER_STATS = [
  { label:"Total Idle Hours",   value:"13,418:40" },
  { label:"Total Idle Cost",    value:"₹ 4.25 L"  },
  { label:"Avg Cost / Hour",    value:"₹ 317"     },
  { label:"Machines Monitored", value:"90"         },
  { label:"Data Coverage",      value:"98.4%"      },
];

/* ════════════════════════════════════════════════════════════════════
   DATE RANGE PICKER  ——  fixed-position dropdown (escapes overflow)
════════════════════════════════════════════════════════════════════ */

const IDRP_MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const IDRP_WDAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const idrpFmt = d =>
  d ? `${String(d.getDate()).padStart(2,"0")} ${IDRP_MONTHS[d.getMonth()].slice(0,3)} ${d.getFullYear()}` : "—";

const idrpISO = d =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

const idrpSame = (a, b) =>
  a && b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

const idrpBetween = (d, s, e) => s && e && d > s && d < e;
const idrpDayStart = d => { const n = new Date(d); n.setHours(0,0,0,0); return n; };
const idrpShiftMonth = (d, n) => { const r = new Date(d); r.setDate(1); r.setMonth(r.getMonth() + n); return r; };
const idrpMonthLen = (y, m) => new Date(y, m + 1, 0).getDate();

const IDRP_PRESETS = [
  { label:"Today",         fn:() => { const t = idrpDayStart(new Date()); return [t, new Date(t)]; } },
  { label:"Yesterday",     fn:() => { const t = idrpDayStart(new Date()); t.setDate(t.getDate()-1); return [t, new Date(t)]; } },
  { label:"Last 7 Days",   fn:() => { const e = idrpDayStart(new Date()); const s = new Date(e); s.setDate(s.getDate()-6); return [s,e]; } },
  { label:"Last 30 Days",  fn:() => { const e = idrpDayStart(new Date()); const s = new Date(e); s.setDate(s.getDate()-29); return [s,e]; } },
  { label:"This Month",    fn:() => { const n = new Date(); return [new Date(n.getFullYear(),n.getMonth(),1), new Date(n.getFullYear(),n.getMonth()+1,0)]; } },
  { label:"Last Month",    fn:() => { const n = new Date(); return [new Date(n.getFullYear(),n.getMonth()-1,1), new Date(n.getFullYear(),n.getMonth(),0)]; } },
  { label:"This Quarter",  fn:() => { const n = new Date(); const q = Math.floor(n.getMonth()/3); return [new Date(n.getFullYear(),q*3,1), new Date(n.getFullYear(),q*3+3,0)]; } },
  { label:"This Year",     fn:() => { const y = new Date().getFullYear(); return [new Date(y,0,1), new Date(y,11,31)]; } },
];

/* ── Single-month grid ── */
function IdrpMonth({ year, month, start, end, hover, onDay, onHover, onLeave }) {
  const offset = new Date(year, month, 1).getDay();
  const len    = idrpMonthLen(year, month);
  const cells  = Array.from({ length: offset + len }, (_, i) => i < offset ? null : i - offset + 1);
  while (cells.length % 7) cells.push(null);

  return (
    <div className="idrp-month">
      <div className="idrp-wdays">
        {IDRP_WDAYS.map(d => <span key={d} className="idrp-wday">{d}</span>)}
      </div>
      <div className="idrp-daygrid">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="idrp-cell-empty" />;
          const cur = idrpDayStart(new Date(year, month, day));
          const isS = idrpSame(cur, start);
          const isE = idrpSame(cur, end);
          const isH = idrpSame(cur, hover) && !end;
          const inR = idrpBetween(cur, start, end || (hover && !end ? hover : null));
          const hasE = !!(end || (hover && !end));

          let dayClass = "idrp-day";
          if (isS || isE)  dayClass += " idrp-day--sel";
          else if (isH)    dayClass += " idrp-day--hover";
          else if (inR)    dayClass += " idrp-day--range";

          let stripClass = null;
          if      (inR && isE)          stripClass = "idrp-strip idrp-strip--end";
          else if (isS && hasE && !inR) stripClass = "idrp-strip idrp-strip--start";
          else if (inR)                 stripClass = "idrp-strip idrp-strip--mid";
          else if (isH)                 stripClass = "idrp-strip idrp-strip--hover";

          return (
            <div key={idx} className="idrp-cell">
              {stripClass && <div className={stripClass} />}
              {isS && hasE && <div className="idrp-strip idrp-strip--start-ext" />}
              <div
                className={dayClass}
                onClick={() => onDay(cur)}
                onMouseEnter={() => onHover(cur)}
                onMouseLeave={onLeave}
              >
                {day}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── DateRangePicker — uses fixed positioning to escape overflow clipping ── */
function DateRangePicker({ value, onChange }) {
  const [open,    setOpen]    = useState(false);
  const [start,   setStart]   = useState(
    value?.from ? idrpDayStart(new Date(value.from)) : idrpDayStart(new Date(2026,2,1))
  );
  const [end,     setEnd]     = useState(
    value?.to   ? idrpDayStart(new Date(value.to))   : idrpDayStart(new Date(2026,2,27))
  );
  const [hover,   setHover]   = useState(null);
  const [picking, setPicking] = useState("start");
  const [leftV,   setLeftV]   = useState(new Date(2026,1,1));
  const [rightV,  setRightV]  = useState(new Date(2026,2,1));
  const [fading,  setFading]  = useState(false);
  const [fadeDir, setFadeDir] = useState(0);
  const [dropStyle, setDropStyle] = useState({});

  const wrapRef    = useRef(null);
  const trigRef    = useRef(null);
  const dropRef    = useRef(null);

  /* ── Calculate fixed position whenever open ── */
  const recalcPos = useCallback(() => {
    if (!trigRef.current) return;
    const rect = trigRef.current.getBoundingClientRect();
    const vpW  = window.innerWidth;
    const vpH  = window.innerHeight;
    const dropW = Math.min(680, vpW - 24);

    let left = rect.left;
    if (left + dropW > vpW - 12) left = Math.max(12, vpW - dropW - 12);

    let top = rect.bottom + 9;
    // flip up if not enough room below
    const approxH = 440;
    if (top + approxH > vpH - 12) top = Math.max(12, rect.top - approxH - 9);

    setDropStyle({ top, left, width: dropW, maxHeight: vpH - top - 16 });
  }, []);

  useLayoutEffect(() => { if (open) recalcPos(); }, [open, recalcPos]);

  useEffect(() => {
    if (!open) return;
    const fn = () => recalcPos();
    window.addEventListener("scroll", fn, true);
    window.addEventListener("resize", fn);
    return () => { window.removeEventListener("scroll", fn, true); window.removeEventListener("resize", fn); };
  }, [open, recalcPos]);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const fn = e => {
      if (
        wrapRef.current && !wrapRef.current.contains(e.target) &&
        dropRef.current  && !dropRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const navigate = useCallback(step => {
    setFadeDir(step);
    setFading(true);
    setTimeout(() => {
      setLeftV(p  => idrpShiftMonth(p, step));
      setRightV(p => idrpShiftMonth(p, step));
      setFading(false);
    }, 160);
  }, []);

  const handleDay = useCallback(d => {
    if (picking === "start" || !picking) {
      setStart(d); setEnd(null); setHover(null); setPicking("end");
    } else {
      const [s, e] = d < start ? [d, start] : [start, d];
      setStart(s); setEnd(e); setPicking(null);
      onChange?.({ from: idrpISO(s), to: idrpISO(e) });
    }
  }, [picking, start, onChange]);

  const handlePreset = useCallback(fn => {
    const [s, e] = fn();
    setStart(s); setEnd(e); setPicking(null);
    setLeftV(new Date(s.getFullYear(), s.getMonth(), 1));
    setRightV(new Date(s.getFullYear(), s.getMonth() + 1, 1));
    onChange?.({ from: idrpISO(s), to: idrpISO(e) });
  }, [onChange]);

  const handleApply = () => {
    if (start && end) {
      onChange?.({ from: idrpISO(start), to: idrpISO(end) });
      setOpen(false);
    }
  };

  const days = start && end ? Math.round((end - start) / 86400000) + 1 : null;

  const calAnimStyle = {
    opacity:   fading ? 0 : 1,
    transform: fading ? `translateX(${fadeDir < 0 ? 18 : -18}px)` : "translateX(0)",
    transition: "opacity .16s ease, transform .16s ease",
  };
  const hdAnimStyle = {
    opacity:   fading ? 0 : 1,
    transform: fading ? `translateX(${fadeDir < 0 ? 10 : -10}px)` : "translateX(0)",
    transition: "opacity .16s ease, transform .16s ease",
  };

  return (
    <div className="idrp-wrap" ref={wrapRef}>
      {/* ── TRIGGER ── */}
      <button
        ref={trigRef}
        className={`idrp-trigger${open ? " idrp-trigger--open" : ""}`}
        onClick={() => { setOpen(o => !o); if (!open) setPicking("start"); }}
      >
        <span className="idrp-trig-icon">📅</span>
        <div className="idrp-trig-body">
          <span className="idrp-trig-label">Report Period</span>
          <span className="idrp-trig-range">
            <span className="idrp-trig-date">{idrpFmt(start)}</span>
            <span className="idrp-trig-sep">→</span>
            <span className="idrp-trig-date">{idrpFmt(end)}</span>
            {days && <span className="idrp-trig-pill">{days}d</span>}
          </span>
        </div>
        <svg
          className={`idrp-trig-chevron${open ? " idrp-trig-chevron--up" : ""}`}
          width="13" height="13" viewBox="0 0 14 14" fill="none"
        >
          <path d="M2 4.5L7 9.5L12 4.5" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>

      {/* ── DROPDOWN  — rendered via fixed positioning, outside any overflow context ── */}
      {open && (
        <div
          ref={dropRef}
          className="idrp-dropdown idrp-dropdown--fixed idrp-dropdown--visible"
          style={dropStyle}
        >
          <div className="idrp-dropdown-body">
            {/* Presets sidebar */}
            <aside className="idrp-sidebar">
              <p className="idrp-sidebar-title">Quick Select</p>
              {IDRP_PRESETS.map(p => (
                <button key={p.label} className="idrp-preset" onClick={() => handlePreset(p.fn)}>
                  {p.label}
                </button>
              ))}
            </aside>

            {/* Calendar section */}
            <div className="idrp-calendar-section">
              {/* Month navigation */}
              <div className="idrp-nav">
                <button className="idrp-nav-arrow" onClick={() => navigate(-1)}>
                  <svg width="11" height="11" viewBox="0 0 12 12">
                    <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                  </svg>
                </button>
                <div className="idrp-nav-labels">
                  <span className="idrp-nav-month" style={hdAnimStyle}>
                    {IDRP_MONTHS[leftV.getMonth()]} {leftV.getFullYear()}
                  </span>
                  <span className="idrp-nav-month" style={hdAnimStyle}>
                    {IDRP_MONTHS[rightV.getMonth()]} {rightV.getFullYear()}
                  </span>
                </div>
                <button className="idrp-nav-arrow" onClick={() => navigate(1)}>
                  <svg width="11" height="11" viewBox="0 0 12 12">
                    <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                  </svg>
                </button>
              </div>

              <div className="idrp-hint-row">
                <span className={`idrp-hint${picking === "end" ? " idrp-hint--end" : ""}`}>
                  {picking === "end" ? "Now select an end date →" : "Click to pick a start date"}
                </span>
              </div>

              <div className="idrp-cals" style={calAnimStyle}>
                <IdrpMonth
                  year={leftV.getFullYear()} month={leftV.getMonth()}
                  start={start} end={end} hover={hover}
                  onDay={handleDay} onHover={setHover} onLeave={() => setHover(null)}
                />
                <div className="idrp-cal-sep" />
                <IdrpMonth
                  year={rightV.getFullYear()} month={rightV.getMonth()}
                  start={start} end={end} hover={hover}
                  onDay={handleDay} onHover={setHover} onLeave={() => setHover(null)}
                />
              </div>

              <div className="idrp-foot">
                <div className="idrp-foot-info">
                  {start && end ? (
                    <>
                      <strong>{idrpFmt(start)}</strong>
                      <span className="idrp-foot-arrow">→</span>
                      <strong>{idrpFmt(end)}</strong>
                      <span className="idrp-foot-days">{days} days</span>
                    </>
                  ) : start ? (
                    <span className="idrp-foot-hint">Select an end date…</span>
                  ) : (
                    <span className="idrp-foot-hint">Select a start date</span>
                  )}
                </div>
                <div className="idrp-foot-btns">
                  <button className="idrp-btn-clear" onClick={() => { setStart(null); setEnd(null); setPicking("start"); }}>
                    Clear
                  </button>
                  <button
                    className={`idrp-btn-apply${start && end ? " idrp-btn-apply--on" : ""}`}
                    onClick={handleApply}
                    disabled={!start || !end}
                  >
                    Apply →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════ */
const levelTd = lvl =>
  lvl === "high"   ? "itr-td-high"   :
  lvl === "medium" ? "itr-td-medium" :
  lvl === "low"    ? "itr-td-low"    : "itr-td-plain";

const statusCls = s =>
  s === "CRITICAL" ? "itr-status itr-status--critical" :
  s === "HIGH"     ? "itr-status itr-status--high"     :
                     "itr-status itr-status--medium";

/* ════════════════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════════════ */
function SectionLabel({ label }) {
  return (
    <div className="itr-section-label">
      <div className="itr-section-line-l" />
      <span className="itr-section-text">{label}</span>
      <div className="itr-section-line-r" />
    </div>
  );
}

function Card({ title, badge, badgeColor, badgeBg, accentColor, children }) {
  return (
    <div className="itr-card" style={{ borderTop:`3px solid ${accentColor || "#2563eb"}` }}>
      <div className="itr-card-header">
        <span className="itr-card-title">{title}</span>
        {badge && (
          <span className="itr-card-badge" style={{ background:badgeBg||"#eff6ff", color:badgeColor||"#2563eb" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════ */
export default function IdleTimeReport() {

  const [filters, setFilters] = useState({
    fromDate:"2026-03-01", toDate:"2026-03-27",
    machine:"All Machines", shift:"All Shifts",
    reason:"All Reasons",
  });

  const cnv = {
    topReasons: useRef(null),
    accepted:   useRef(null),
    monthwise:  useRef(null),
    daywise:    useRef(null),
    shiftChart: useRef(null),
    costChart:  useRef(null),
    pctChart:   useRef(null),
  };
  const charts = useRef({});

  useEffect(() => {
    const kill = k => { charts.current[k]?.destroy(); delete charts.current[k]; };
    const mk   = (k, canvas, cfg) => { kill(k); if (canvas) charts.current[k] = new Chart(canvas, cfg); };

    mk("topReasons", cnv.topReasons.current, {
      type:"bar", indexAxis:"y",
      data:{
        labels: TOP_REASONS.labels,
        datasets:[{ data:TOP_REASONS.data, backgroundColor:TOP_REASONS.colors, borderRadius:5, borderSkipped:false }],
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`${c.parsed.x} hrs` } } },
        scales:{
          x:{ beginAtZero:true, ticks:{callback:v=>`${v}h`}, grid:{color:"#f1f5f9"} },
          y:{ ticks:{font:{size:11,family:"Nunito"}} },
        },
      },
    });

    mk("accepted", cnv.accepted.current, {
      type:"doughnut",
      data:{
        labels:["Accepted Idle","Non-Accepted Idle"],
        datasets:[{ data:[62,38], backgroundColor:["#2563eb","#dc2626"], borderWidth:4, borderColor:"#fff", hoverOffset:10 }],
      },
      options:{
        responsive:true, maintainAspectRatio:false, cutout:"66%",
        plugins:{ legend:{ position:"bottom", labels:{ padding:14, font:{size:12,weight:"bold",family:"Nunito"} } } },
      },
    });

    mk("monthwise", cnv.monthwise.current, {
      type:"bar",
      data:{
        labels: MONTHWISE.labels,
        datasets:[
          { type:"bar",  label:"Idle Hours", data:MONTHWISE.hours, backgroundColor:"rgba(37,99,235,0.25)", borderColor:"#2563eb", borderWidth:2, borderRadius:5, yAxisID:"y" },
          { type:"line", label:"Cost ₹L",    data:MONTHWISE.cost,  borderColor:"#f97316", backgroundColor:"rgba(249,115,22,0.12)", borderWidth:2.5, pointBackgroundColor:"#f97316", pointRadius:5, fill:true, yAxisID:"y1", tension:0.4 },
        ],
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ font:{weight:"bold",family:"Nunito"} } } },
        scales:{
          y:  { beginAtZero:true, ticks:{callback:v=>`${v}h`}, grid:{color:"#f8fafc"} },
          y1: { position:"right", beginAtZero:true, ticks:{callback:v=>`₹${v}L`}, grid:{display:false} },
        },
      },
    });

    mk("daywise", cnv.daywise.current, {
      type:"line",
      data:{
        labels: DAYWISE.labels,
        datasets:[{
          label:"Daily Idle Hours", data:DAYWISE.data,
          borderColor:"#2563eb", backgroundColor:"rgba(37,99,235,0.08)",
          fill:true, borderWidth:2.5, tension:0.4,
          pointBackgroundColor: DAYWISE.data.map(v => v===0 ? "#16a34a" : "#2563eb"),
          pointRadius:4,
        }],
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c => c.parsed.y===0 ? "Sunday / Holiday" : `${c.parsed.y} hrs idle` } } },
        scales:{
          x:{ ticks:{font:{size:10},maxRotation:0} },
          y:{ beginAtZero:true, ticks:{callback:v=>`${v}h`} },
        },
      },
    });

    mk("shiftChart", cnv.shiftChart.current, {
      type:"bar",
      data:{
        labels: SHIFT_DATA.labels,
        datasets:[
          { label:"Shift 1", data:SHIFT_DATA.s1, backgroundColor:"rgba(37,99,235,0.7)",  borderColor:"#2563eb", borderWidth:1.5, borderRadius:4 },
          { label:"Shift 2", data:SHIFT_DATA.s2, backgroundColor:"rgba(249,115,22,0.7)", borderColor:"#f97316", borderWidth:1.5, borderRadius:4 },
          { label:"Shift 3", data:SHIFT_DATA.s3, backgroundColor:"rgba(22,163,74,0.7)",  borderColor:"#16a34a", borderWidth:1.5, borderRadius:4 },
        ],
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ font:{weight:"bold",family:"Nunito"} } } },
        scales:{
          x:{ ticks:{font:{size:11}} },
          y:{ beginAtZero:true, ticks:{callback:v=>`${v}h`} },
        },
      },
    });

    mk("costChart", cnv.costChart.current, {
      type:"bar",
      data:{
        labels: COST_MACHINE.labels,
        datasets:[
          { label:"Idle Hours", data:COST_MACHINE.hours, backgroundColor:"rgba(37,99,235,0.6)",  borderColor:"#2563eb", borderWidth:1.5, borderRadius:4 },
          { label:"Cost ₹K",   data:COST_MACHINE.cost,  backgroundColor:"rgba(249,115,22,0.6)", borderColor:"#f97316", borderWidth:1.5, borderRadius:4 },
        ],
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ font:{weight:"bold",family:"Nunito"} } } },
        scales:{
          x:{ ticks:{font:{size:10},maxRotation:45} },
          y:{ beginAtZero:true },
        },
      },
    });

    mk("pctChart", cnv.pctChart.current, {
      type:"bar", indexAxis:"y",
      data:{
        labels: PCT_MACHINE.labels,
        datasets:[{
          label:"% Idle Time", data:PCT_MACHINE.data,
          backgroundColor: PCT_MACHINE.data.map(v =>
            v>13 ? "rgba(220,38,38,0.75)"  :
            v>12 ? "rgba(249,115,22,0.75)" :
            v>11 ? "rgba(217,119,6,0.75)"  :
                   "rgba(37,99,235,0.75)"
          ),
          borderRadius:5,
        }],
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`${c.parsed.x}% idle` } } },
        scales:{
          x:{ beginAtZero:true, max:16, ticks:{callback:v=>`${v}%`} },
          y:{ ticks:{font:{size:11}} },
        },
      },
    });

    return () => Object.keys(charts.current).forEach(kill);
  }, []);

  const hc = (f, v) => setFilters(p => ({ ...p, [f]:v }));

  return (
    <div className="itr-root">
      <div className="itr-body">

        {/* ── FILTER PANEL ── */}
        <div className="itr-filter-panel">
          <div className="itr-filter-head">
            <span className="itr-filter-title">🔍 Report Filters</span>
            <span className="itr-filter-active-badge">Active</span>
          </div>

          <div className="itr-filter-grid">
            <div className="itr-filter-group itr-filter-group--daterange">
              <label className="itr-filter-label">Date Range</label>
              <DateRangePicker
                value={{ from: filters.fromDate, to: filters.toDate }}
                onChange={({ from, to }) => { hc("fromDate", from); hc("toDate", to); }}
              />
            </div>

            {[
              ["Machine No","machine", ["All Machines","BROACHING-1","BROACHING-2","TC-01","TC-02","VMC-01","VTL-03"]],
              ["Shift",     "shift",   ["All Shifts","Shift 1 (6AM-2PM)","Shift 2 (2PM-10PM)","Shift 3 (10PM-6AM)"]],
              ["Reason",    "reason",  ["All Reasons","MACHINE BREAKDOWN","INSERT CHANGE","MACHINE CLEANING","NMP","NO LOAD","NO PLAN","SETTING"]],
            ].map(([label, field, opts]) => (
              <div key={field} className="itr-filter-group">
                <label className="itr-filter-label">{label}</label>
                <select className="itr-select" value={filters[field]} onChange={e => hc(field, e.target.value)}>
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="itr-kpi-grid">
          {KPI_CARDS.map((k,i) => (
            <div key={i} className="itr-kpi-card"
                 style={{
                   background:k.bg, border:`1px solid ${k.border}33`,
                   borderLeftWidth:4, borderLeftStyle:"solid", borderLeftColor:k.border,
                   boxShadow:`0 2px 10px ${k.color}18`,
                   animationDelay:`${i*0.06}s`
                 }}>
              <div className="itr-kpi-top">
                <div className="itr-kpi-icon">{k.icon}</div>
                <span className={`itr-kpi-badge ${k.neg?"itr-kpi-badge--neg":"itr-kpi-badge--pos"}`}>{k.badge}</span>
              </div>
              <div className="itr-kpi-label">{k.label}</div>
              <div className="itr-kpi-value" style={{ color:k.color }}>{k.value}</div>
              <div className="itr-kpi-sub">{k.sub}</div>
            </div>
          ))}
        </div>

        <SectionLabel label="1 · 2  —  Top Idle Reasons + Accepted vs Non-Accepted" />

        <div className="itr-g2">
          <Card title="📊 Top 10 Idle Reasons" badge="By Hours" badgeBg="#dbeafe" badgeColor="#2563eb" accentColor="#2563eb">
            <div className="itr-chart"><canvas ref={cnv.topReasons} /></div>
          </Card>

          <Card title="✅ Accepted vs Non-Accepted Idle" badge="% Split" badgeBg="#fff7ed" badgeColor="#f97316" accentColor="#f97316">
            <div className="itr-split-grid">
              {[
                { lbl:"Accepted Idle",     val:"8,319:45", pct:"62%", c:"#2563eb", bg:"rgba(37,99,235,0.07)",  bc:"rgba(37,99,235,0.25)"  },
                { lbl:"Non-Accepted Idle", val:"5,098:55", pct:"38%", c:"#dc2626", bg:"rgba(220,38,38,0.07)",  bc:"rgba(220,38,38,0.25)"  },
              ].map((item,i) => (
                <div key={i} className="itr-split-tile" style={{ background:item.bg, border:`1.5px solid ${item.bc}` }}>
                  <div className="itr-split-pct"   style={{ color:item.c }}>{item.pct}</div>
                  <div className="itr-split-label">{item.lbl}</div>
                  <div className="itr-split-val">{item.val}</div>
                </div>
              ))}
            </div>
            <div className="itr-chart--sm"><canvas ref={cnv.accepted} /></div>
          </Card>
        </div>

        <SectionLabel label="3 · 4  —  Total Idle Hours + Day Wise / Month Wise Trend" />

        <div className="itr-g2">
          <Card title="📅 Idle Hours + Cost — Month Wise" badge="Oct 25→Mar 26" badgeBg="#dbeafe" badgeColor="#2563eb" accentColor="#2563eb">
            <div className="itr-chart--md"><canvas ref={cnv.monthwise} /></div>
          </Card>

          <Card title="📆 Daily Idle Hours — March 2026" badge="27 Days" badgeBg="#ecfeff" badgeColor="#0891b2" accentColor="#0891b2">
            <p style={{ fontSize:"0.72rem",color:"#64748b",fontWeight:600,marginBottom:8 }}>
              ● Green dots = Sundays / Holidays &nbsp;|&nbsp; Hover for detail
            </p>
            <div className="itr-chart--md"><canvas ref={cnv.daywise} /></div>
          </Card>
        </div>

        <SectionLabel label="5 · 6 · 7  —  Total Hours + Not Entered + Shift-Wise Idle" />

        <div className="itr-total-bar">
          {TOTAL_STATS.map((s,i) => (
            <div key={i} className="itr-total-stat">
              <div className="itr-total-stat-label">{s.label}</div>
              <div className="itr-total-stat-val" style={{ color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <Card title="🔄 No. of Machines Idled — Shift Wise" badge="All Shifts" badgeBg="#f0fdf4" badgeColor="#16a34a" accentColor="#16a34a">
          <div className="itr-shift-tiles">
            {SHIFT_TILES.map((s,i) => (
              <div key={i} className="itr-shift-tile" style={{ background:s.bg, border:`1.5px solid ${s.border}` }}>
                <div className="itr-shift-count" style={{ color:s.color }}>{s.count}</div>
                <div className="itr-shift-label">{s.label}</div>
                <div className="itr-shift-bar" style={{ background:`${s.color}20` }}>
                  <div className="itr-shift-fill" style={{ width:`${(s.count/s.total)*100}%`, background:s.color }} />
                </div>
                <div className="itr-shift-pct-txt">{Math.round((s.count/s.total)*100)}% of {s.total} m/c</div>
              </div>
            ))}
          </div>
          <div className="itr-chart--xl"><canvas ref={cnv.shiftChart} /></div>
        </Card>

        <SectionLabel label="8 · 10 · 11  —  Idle Cost % + Cost-Hours Machine + % Wise Ranking" />

        <div className="itr-g2">
          <Card title="💰 Idle Cost & Hours — Top Machines" badge="₹K" badgeBg="#fff7ed" badgeColor="#f97316" accentColor="#f97316">
            <div className="itr-cost-mini-grid">
              {[
                { lbl:"Total Cost",  val:"₹4.25 L",  c:"#dc2626", bg:"rgba(220,38,38,0.06)",  bc:"rgba(220,38,38,0.2)"  },
                { lbl:"Avg Cost/Hr", val:"₹317",     c:"#f97316", bg:"rgba(249,115,22,0.06)", bc:"rgba(249,115,22,0.2)" },
                { lbl:"Highest M/c", val:"TC-24-S1", c:"#2563eb", bg:"rgba(37,99,235,0.06)",  bc:"rgba(37,99,235,0.2)"  },
              ].map((s,i) => (
                <div key={i} className="itr-cost-mini-tile" style={{ background:s.bg, border:`1px solid ${s.bc}` }}>
                  <div className="itr-cost-mini-val"   style={{ color:s.c }}>{s.val}</div>
                  <div className="itr-cost-mini-label">{s.lbl}</div>
                </div>
              ))}
            </div>
            <div className="itr-chart--lg"><canvas ref={cnv.costChart} /></div>
          </Card>

          <Card title="📊 % Wise Idle Machine Ranking" badge="Top 10" badgeBg="#fef2f2" badgeColor="#dc2626" accentColor="#dc2626">
            <div className="itr-legend-row" style={{ marginBottom:10 }}>
              {[[">13%","Critical","#dc2626","#fef2f2"],[">12%","High","#f97316","#fff7ed"],[">11%","Medium","#d97706","#fffbeb"]].map(([r,l,c,bg]) => (
                <span key={l} className="itr-legend-pill" style={{ background:bg, color:c }}>{r} {l}</span>
              ))}
            </div>
            <div className="itr-chart--lg"><canvas ref={cnv.pctChart} /></div>
          </Card>
        </div>

        <SectionLabel label="9  —  Continuous Idle Reasons + Machines Idle Not Entered" />

        <div className="itr-g2">
          <Card title="🔁 Continuous Idle Reasons (≥ 4 hrs)"
                badge={`${CONTINUOUS.length} Flagged`} badgeBg="#fef2f2" badgeColor="#dc2626" accentColor="#dc2626">
            <div className="itr-table-scroll">
              <table className="itr-table">
                <thead className="itr-thead--red">
                  <tr><th>Machine</th><th>Reason</th><th>Hours</th><th className="center">Shifts</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {CONTINUOUS.map((r,i) => (
                    <tr key={i}>
                      <td className="itr-td-name">{r.machine}</td>
                      <td className="itr-td-muted">{r.reason}</td>
                      <td className="itr-td-hours">{r.hours}</td>
                      <td className="itr-td-center">{r.shifts}</td>
                      <td><span className={statusCls(r.status)}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="⚠ Idle Time Not Entered" badge="14 Pending" badgeBg="#fff7ed" badgeColor="#f97316" accentColor="#d97706">
            <div className="itr-notent-grid">
              {[
                { lbl:"Not Entered",   val:14, c:"#dc2626", bg:"rgba(220,38,38,0.06)",  bc:"rgba(220,38,38,0.2)"  },
                { lbl:"Partial Entry", val:8,  c:"#d97706", bg:"rgba(217,119,6,0.06)",  bc:"rgba(217,119,6,0.2)"  },
                { lbl:"Completed",     val:68, c:"#16a34a", bg:"rgba(22,163,74,0.06)",  bc:"rgba(22,163,74,0.2)"  },
              ].map((item,i) => (
                <div key={i} className="itr-notent-tile" style={{ background:item.bg, border:`1.5px solid ${item.bc}` }}>
                  <div className="itr-notent-val"   style={{ color:item.c }}>{item.val}</div>
                  <div className="itr-notent-label">{item.lbl}</div>
                </div>
              ))}
            </div>
            <div className="itr-table-scroll">
              <table className="itr-table">
                <thead className="itr-thead--amber">
                  <tr><th>Machine</th><th>Shift</th><th>Date</th><th>Operator</th></tr>
                </thead>
                <tbody>
                  {NOT_ENTERED.map((r,i) => (
                    <tr key={i}>
                      <td className="itr-td-name">{r.machine}</td>
                      <td className="itr-td-muted">{r.shift}</td>
                      <td className="itr-td-date">{r.date}</td>
                      <td className={r.operator==="Pending"?"itr-pending":"itr-normal"}>{r.operator}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Detail table */}
        <div className="itr-detail-section">
          <div className="itr-detail-header">
            <span className="itr-detail-title">📋 Idle Time by Reason &amp; Machine — Detailed View</span>
            <div className="itr-legend-row">
              {[["High","#dc2626","#fef2f2"],["Medium","#f97316","#fff7ed"],["Low","#16a34a","#f0fdf4"]].map(([l,c,bg]) => (
                <span key={l} className="itr-legend-pill" style={{ background:bg,color:c }}>● {l}</span>
              ))}
            </div>
          </div>
          <div className="itr-table-scroll">
            <table className="itr-table" style={{ minWidth:760 }}>
              <thead className="itr-thead--blue">
                <tr>
                  <th>Idle Reason</th>
                  {COL_HDR.map(h => <th key={h} className="right">{h}</th>)}
                  <th className="right">Total</th>
                  <th className="right">%</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row,i) => (
                  <tr key={i}>
                    <td style={{ fontWeight:800,color:"#1e293b",whiteSpace:"nowrap" }}>{row.reason}</td>
                    {row.cols.map((val,j) => <td key={j} className={levelTd(row.lvl)}>{val}</td>)}
                    <td className={levelTd(row.lvl)} style={{ fontWeight:900 }}>{row.total}</td>
                    <td style={{ textAlign:"right",fontWeight:700,
                                 color:parseFloat(row.pct)>5?"#dc2626":parseFloat(row.pct)>2?"#f97316":"#64748b" }}>
                      {row.pct}%
                    </td>
                  </tr>
                ))}
                <tr className="itr-tr-total">
                  <td>TOTAL</td>
                  {["118:00","179:30","174:15","177:00","166:00","168:00","130:15"].map((v,i) => (
                    <td key={i}>{v}</td>
                  ))}
                  <td style={{ fontWeight:900 }}>13,418:40</td>
                  <td>100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="itr-footer">
          <div className="itr-footer-stats">
            {FOOTER_STATS.map((s,i) => (
              <div key={i} className="itr-footer-stat">
                <div className="itr-footer-stat-label">{s.label}</div>
                <div className="itr-footer-stat-val">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}