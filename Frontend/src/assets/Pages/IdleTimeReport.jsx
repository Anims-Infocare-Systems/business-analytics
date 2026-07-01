import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { resolveApiBase } from "../../apiBase";
import IdleTimeReportDatePicker from "./IdleTimeReportDatePicker";
import "./IdleTimeReport.css";

Chart.register(...registerables);

const API_BASE = resolveApiBase();

function toIsoDate(d) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Decimal hours → HH:MM:SS (matches ERP TotalIdleHours display). */
function decimalHoursToHms(hours) {
  const secs = Math.max(0, Math.round(Number(hours || 0) * 3600));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** X-axis tick: show HH:MM:SS for hour-scale values. */
function formatTopReasonAxisTick(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "";
  return decimalHoursToHms(n);
}

/* ════════════════════════════════════════════════
   DATA CONSTANTS
════════════════════════════════════════════════ */

const KPI_CARD_STYLES = [
  { icon:"⏱",  label:"Total Machine Idle Hours", neg:true,  color:"#dc2626", bg:"#fef2f2", border:"#dc2626" },
  { icon:"💰",  label:"Total Idle Cost",            neg:true,  color:"#f97316", bg:"#fff7ed", border:"#f97316" },
  { icon:"🏭",  label:"Avg Idle",                   neg:false, color:"#2563eb", bg:"#eff6ff", border:"#2563eb" },
  { icon:"📋",  label:"Idle Not Entered",           neg:true,  color:"#7c3aed", bg:"#f5f3ff", border:"#7c3aed" },
  { icon:"📈",  label:"Top Idle Reason",            neg:true,  color:"#d97706", bg:"#fffbeb", border:"#d97706" },
  { icon:"🔄",  label:"Continuous Idle > 4h",       neg:true,  color:"#0891b2", bg:"#ecfeff", border:"#0891b2" },
];

function buildKpiCards(kpis, periodLabel) {
  const k = kpis || {};
  const hasData = k.total_idle_hours_display != null;
  const pct = k.top_idle_reason_pct != null ? `${k.top_idle_reason_pct}% of total` : "7.62% of total";
  const mc = k.machine_count != null ? `${k.machine_count} m/c` : "90 m/c";
  return [
    { ...KPI_CARD_STYLES[0], value: hasData ? k.total_idle_hours_display : "13,418:40", sub: periodLabel || "This Period", badge: "" },
    { ...KPI_CARD_STYLES[1], value: hasData ? (k.total_idle_cost_display ?? "—") : "₹4.25 L", sub: "RatePerHr × idle hrs", badge: "" },
    { ...KPI_CARD_STYLES[2], value: hasData ? (k.avg_idle_display ?? "—") : "148:35", sub: "Avg per machine", badge: mc },
    { ...KPI_CARD_STYLES[3], value: hasData ? String(k.idle_not_entered ?? "—") : "14", sub: "Shift slots missing entry", badge: "" },
    { ...KPI_CARD_STYLES[4], value: hasData ? (k.top_idle_reason ?? "—") : "NO PLAN", sub: pct, badge: (k.top_idle_reason_pct ?? 0) > 10 ? "high" : "" },
    { ...KPI_CARD_STYLES[5], value: hasData ? String(k.continuous_idle_over_4h ?? "—") : "7", sub: "Machines flagged", badge: "" },
  ];
}

const TOP_REASONS = {
  labels:["MACHINE CLEANING","INSERT CHANGE","NO LOAD","MACHINE BREAKDOWN",
          "SETTING","NMP","LUNCH HOURS","TOOL CHANGE","WAITING SETTER","WAITING MATERIAL"],
  data:  [1210,912,1033,343,106,361,679,420,118,280],
  hours_display: [],
  colors:["#dc2626","#f97316","#d97706","#dc2626","#0891b2",
          "#f97316","#16a34a","#7c3aed","#2563eb","#0891b2"],
};

const SPLIT_TILE_STYLE = {
  accepted: { c:"#2563eb", bg:"rgba(37,99,235,0.07)",  bc:"rgba(37,99,235,0.25)" },
  nonAccepted: { c:"#dc2626", bg:"rgba(220,38,38,0.07)",  bc:"rgba(220,38,38,0.25)" },
};

function buildAcceptedIdle(api) {
  const a = api || {};
  const accPct = a.accepted_pct ?? 0;
  const naPct = a.non_accepted_pct ?? 0;
  const chart = a.chart_hours?.length === 2
    ? a.chart_hours.map(v => Number(v) || 0)
    : [0, 0];
  return {
    chart,
    hours_display: [a.accepted_hours_display ?? "0:00:00", a.non_accepted_hours_display ?? "0:00:00"],
    tiles: [
      {
        lbl: "Accepted Idle",
        val: a.accepted_hours_display ?? "0:00:00",
        pct: `${accPct}%`,
        ...SPLIT_TILE_STYLE.accepted,
      },
      {
        lbl: "Non-Accepted Idle",
        val: a.non_accepted_hours_display ?? "0:00:00",
        pct: `${naPct}%`,
        ...SPLIT_TILE_STYLE.nonAccepted,
      },
    ],
  };
}

const DEFAULT_ACCEPTED_IDLE = buildAcceptedIdle({
  accepted_hours_display: "8,319:45",
  non_accepted_hours_display: "5,098:55",
  accepted_pct: 62,
  non_accepted_pct: 38,
  chart_hours: [62, 38],
});

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

// Default fallbacks until API data loads
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

const DEFAULT_NOT_ENTERED = {
  rows: [
    { machine:"TC-15",    shift:"Shift 1", date:"25 Mar", operator:"Rajan K"   },
    { machine:"VMC-05",   shift:"Shift 2", date:"26 Mar", operator:"Murugan S" },
    { machine:"TC-28",    shift:"Shift 3", date:"26 Mar", operator:"Pending"   },
    { machine:"BROACH-3", shift:"Shift 1", date:"27 Mar", operator:"Karthik P" },
    { machine:"VTL-02",   shift:"Shift 2", date:"25 Mar", operator:"Pending"   },
  ],
  summary: { not_entered: 14, partial_entry: 8, completed: 68 },
};

const DEFAULT_REASON_MACHINE_DETAIL = {
  column_headers: ["BROACH-1","BROACH-2","TC-01","TC-02","VMC-01","VMC-02","VTL-03"],
  rows: [
    { reason:"NO PLAN",            cols:["3:30","12:00","19:00","14:00","48:00","38:00","161:00"], total:"458:15",  pct:"7.62", lvl:"high"   },
    { reason:"NMP",                cols:["24:15","52:30","55:00","28:30","62:30","65:00","72:00"], total:"361:25",  pct:"6.02", lvl:"high"   },
    { reason:"INSERT CHANGE",      cols:["0:30","0:30","8:00","16:20","21:30","22:25","6:45"],     total:"912:55",  pct:"1.52", lvl:"medium" },
    { reason:"MACHINE CLEANING",   cols:["14:45","7:15","19:30","17:15","21:15","25:15","13:00"],  total:"1210:15", pct:"2.01", lvl:"medium" },
    { reason:"LUNCH HOURS",        cols:["7:30","3:00","5:00","12:30","11:30","11:00","3:00"],     total:"679:20",  pct:"1.13", lvl:"low"    },
    { reason:"MACHINE BREAKDOWN",  cols:["5:00","32:30","31:00","8:30","120:00","87:30","3:30"],   total:"343:00",  pct:"0.57", lvl:"high"   },
    { reason:"NO LOAD",            cols:["18:15","62:45","2:00","6:00","2:30","15:00","45:00"],    total:"1033:00", pct:"1.72", lvl:"medium" },
    { reason:"SETTING",            cols:["21:30","0:30","1:00","1:00","0:30","3:00","14:00"],      total:"106:00",  pct:"0.18", lvl:"medium" },
    { reason:"WAITING FOR SETTER", cols:["0:00","5:30","8:30","8:30","7:00","1:30","3:30"],        total:"118:15",  pct:"0.20", lvl:null     },
  ],
  footer: {
    cols: ["118:00","179:30","174:15","177:00","166:00","168:00","130:15"],
    total: "13,418:40",
    pct: "100",
  },
};

const SHIFT_DATA = {
  labels:["BROACH-1","BROACH-2","TC-01","TC-02","VMC-01","VMC-02","VTL-03"],
  s1:[38,62,55,42,58,45,32],
  s2:[44,58,60,38,52,56,38],
  s3:[36,59,59,47,56,67,60],
};

const SHIFT_TILES = [
  { label:"Shift 1  6AM–2PM",  count:38, total:90, color:"#2563eb", bg:"rgba(37,99,235,0.07)",  border:"rgba(37,99,235,0.2)"  },
  { label:"Shift 2  2PM–10PM", count:44, total:90, color:"#f97316", bg:"rgba(249,115,22,0.07)", border:"rgba(249,115,22,0.2)" },
  { label:"Shift 3  10PM–6AM", count:31, total:90, color:"#16a34a", bg:"rgba(22,163,74,0.07)",  border:"rgba(22,163,74,0.2)"  },
  { label:"All Shifts",        count:90, total:90, color:"#7c3aed", bg:"rgba(124,58,237,0.07)", border:"rgba(124,58,237,0.2)" },
];

function buildDefaultShiftChart() {
  return {
    labels: SHIFT_DATA.labels,
    datasets: [
      { label:"Shift 1", data:SHIFT_DATA.s1, backgroundColor:"rgba(37,99,235,0.7)", borderColor:"#2563eb" },
      { label:"Shift 2", data:SHIFT_DATA.s2, backgroundColor:"rgba(249,115,22,0.7)", borderColor:"#f97316" },
      { label:"Shift 3", data:SHIFT_DATA.s3, backgroundColor:"rgba(22,163,74,0.7)", borderColor:"#16a34a" },
    ],
  };
}

const DEFAULT_TOTAL_STATS = [
  { label:"Total Machine Hours Available", value:"90,000:00", color:"#2563eb" },
  { label:"Total Idle Hours",              value:"13,418:40", color:"#dc2626" },
  { label:"Total Productive Hours",        value:"76,581:20", color:"#16a34a" },
  { label:"Overall Idle %",                value:"14.9%",     color:"#f97316" },
];

function buildTotalStats(u) {
  const t = u || {};
  const pct = t.overall_idle_percent != null ? `${t.overall_idle_percent}%` : "14.9%";
  return [
    { label:"Total Machine Hours Available", value: t.total_machine_hours_available ?? "90,000:00", color:"#2563eb" },
    { label:"Total Idle Hours",              value: t.total_idle_hours ?? "13,418:40", color:"#dc2626" },
    { label:"Total Productive Hours",        value: t.total_productive_hours ?? "76,581:20", color:"#16a34a" },
    { label:"Overall Idle %",                value: pct, color:"#f97316" },
  ];
}

const FOOTER_STATS = [
  { label:"Total Idle Hours",   value:"13,418:40" },
  { label:"Total Idle Cost",    value:"₹ 4.25 L"  },
  { label:"Avg Cost / Hour",    value:"₹ 317"     },
  { label:"Machines Monitored", value:"90"         },
  { label:"Data Coverage",      value:"98.4%"      },
];

const DEFAULT_FILTER_OPTIONS = {
  machines: ["All Machines", "BROACHING-1", "BROACHING-2", "TC-01", "TC-02", "VMC-01", "VTL-03"],
  shifts: ["All Shifts", "Shift 1 (6AM-2PM)", "Shift 2 (2PM-10PM)", "Shift 3 (10PM-6AM)"],
  reasons: [
    "All Reasons", "MACHINE BREAKDOWN", "INSERT CHANGE", "MACHINE CLEANING", "NMP",
    "NO LOAD", "NO PLAN", "SETTING", "Production Idle Time", "Conv Production Idle Time",
    "Conv Rod Idle Time", "Machine Idle Entry",
  ],
};

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

export default function IdleTimeReport() {

  const _dflt = { from: new Date(2026, 2, 1), to: new Date(2026, 2, 27) };
  const _saved = readFilterSession("ba_filter_idletime", _dflt);
  const [dateRange, setDateRange] = useState({ from: _saved.from, to: _saved.to });
  const [filters, setFilters] = useState({
    machine:"All Machines", shift:"All Shifts",
    reason:"All Reasons",
  });
  const [filterOptions, setFilterOptions] = useState(DEFAULT_FILTER_OPTIONS);
  const [kpiCards, setKpiCards] = useState(() => buildKpiCards({}, "This Period"));
  const [topReasonsChart, setTopReasonsChart] = useState(TOP_REASONS);
  const [acceptedIdle, setAcceptedIdle] = useState(DEFAULT_ACCEPTED_IDLE);
  const [monthwiseChart, setMonthwiseChart] = useState(MONTHWISE);
  const [daywiseChart, setDaywiseChart] = useState(DAYWISE);
  const [totalStats, setTotalStats] = useState(DEFAULT_TOTAL_STATS);
  const [shiftTiles, setShiftTiles] = useState(SHIFT_TILES);
  const [shiftChart, setShiftChart] = useState(buildDefaultShiftChart);

  // NEW: Dynamic state for the two target charts
  const [costMachineData, setCostMachineData] = useState(COST_MACHINE);
  const [pctMachineData, setPctMachineData] = useState(PCT_MACHINE);
  const [continuousIdle, setContinuousIdle] = useState(CONTINUOUS);
  const [idleTimeNotEntered, setIdleTimeNotEntered] = useState(DEFAULT_NOT_ENTERED);
  const [reasonMachineDetail, setReasonMachineDetail] = useState(DEFAULT_REASON_MACHINE_DETAIL);

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

  // ✅ Persist date range to sessionStorage on every change
  useEffect(() => {
    writeFilterSession("ba_filter_idletime", { from: dateRange.from, to: dateRange.to });
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
    const params = new URLSearchParams({
      from: toIsoDate(dateRange.from),
      to: toIsoDate(dateRange.to),
      machine: filters.machine,
      shift: filters.shift,
      reason: filters.reason,
    });
    fetch(`${API_BASE}/idle-time-report/?${params}`, { credentials: "include" })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error("idle-time-report failed"))))
      .then(data => {
        if (data?.filter_options) {
          setFilterOptions({
            machines: data.filter_options.machines?.length
              ? data.filter_options.machines
              : DEFAULT_FILTER_OPTIONS.machines,
            shifts: data.filter_options.shifts?.length
              ? data.filter_options.shifts
              : DEFAULT_FILTER_OPTIONS.shifts,
            reasons: data.filter_options.reasons?.length
              ? data.filter_options.reasons
              : DEFAULT_FILTER_OPTIONS.reasons,
          });
        }
        if (data?.kpis) {
          const periodLabel = data.from && data.to ? `${data.from} → ${data.to}` : "This Period";
          setKpiCards(buildKpiCards(data.kpis, periodLabel));
        }
        if (data?.top_idle_reasons?.labels) {
          setTopReasonsChart({
            labels: data.top_idle_reasons.labels,
            data: data.top_idle_reasons.data ?? [],
            hours_display: data.top_idle_reasons.hours_display ?? [],
            colors: data.top_idle_reasons.colors?.length
              ? data.top_idle_reasons.colors
              : TOP_REASONS.colors,
          });
        }
        if (data?.accepted_idle) {
          setAcceptedIdle(buildAcceptedIdle(data.accepted_idle));
        }
        if (data?.monthwise?.labels) {
          setMonthwiseChart({
            labels: data.monthwise.labels,
            hours: data.monthwise.hours ?? [],
            cost: data.monthwise.cost_lakhs ?? [],
          });
        }
        if (data?.daywise?.labels) {
          setDaywiseChart({
            labels: data.daywise.labels,
            data: data.daywise.hours ?? [],
            isSunday: data.daywise.is_sunday ?? [],
          });
        }
        if (data?.utilization_totals) {
          setTotalStats(buildTotalStats(data.utilization_totals));
        }
        if (data?.shift_wise_idle?.labels?.length) {
          const sw = data.shift_wise_idle;
          if (sw.tiles?.length) setShiftTiles(sw.tiles);
          setShiftChart({
            labels: sw.labels,
            datasets: (sw.datasets ?? []).map(ds => ({
              label: ds.label,
              data: ds.data ?? [],
              backgroundColor: ds.backgroundColor,
              borderColor: ds.borderColor,
            })),
          });
        }
        // NEW: Wire up Cost & Hours + % Ranking charts
        if (data?.top_machines?.labels) {
          setCostMachineData({
            labels: data.top_machines.labels,
            hours: data.top_machines.hours,
            cost: data.top_machines.cost_k,
          });
        }
        if (data?.idle_pct_ranking?.labels) {
          setPctMachineData({
            labels: data.idle_pct_ranking.labels,
            data: data.idle_pct_ranking.data,
          });
        }
        if (Array.isArray(data?.continuous_idle_reasons)) {
          setContinuousIdle(data.continuous_idle_reasons);
        }
        if (data?.idle_time_not_entered) {
          setIdleTimeNotEntered({
            rows: data.idle_time_not_entered.rows ?? [],
            summary: data.idle_time_not_entered.summary ?? DEFAULT_NOT_ENTERED.summary,
          });
        }
        if (data?.reason_machine_detail) {
          setReasonMachineDetail({
            column_headers: data.reason_machine_detail.column_headers ?? [],
            rows: data.reason_machine_detail.rows ?? [],
            footer: data.reason_machine_detail.footer ?? DEFAULT_REASON_MACHINE_DETAIL.footer,
          });
        }
      })
      .catch((err) => console.error("idle-time-report:", err));
  }, [dateRange.from, dateRange.to, filters.machine, filters.shift, filters.reason]);

  useEffect(() => {
    const kill = () => {
      charts.current.topReasons?.destroy();
      delete charts.current.topReasons;
    };
    const canvas = cnv.topReasons.current;
    if (!canvas) return kill;

    kill();
    const barColors = topReasonsChart.labels.map((_, i) =>
      topReasonsChart.colors[i % topReasonsChart.colors.length]
    );
    charts.current.topReasons = new Chart(canvas, {
      type:"bar", indexAxis:"y",
      data:{
        labels: topReasonsChart.labels,
        datasets:[{
          data: topReasonsChart.data.map(v => Number(v) || 0),
          backgroundColor: barColors,
          borderRadius:5,
          borderSkipped:false,
        }],
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ display:false },
          tooltip:{
            callbacks:{
              title: items => items[0]?.label ?? "",
              label: ctx => {
                const idx = ctx.dataIndex;
                const hms = topReasonsChart.hours_display?.[idx]
                  ?? decimalHoursToHms(ctx.raw ?? ctx.parsed?.x);
                const dec = Number(ctx.raw ?? ctx.parsed?.x ?? 0).toFixed(2);
                return ` ${hms}  (${dec} hrs)`;
              },
            },
          },
        },
        scales:{
          x:{
            beginAtZero:true,
            title:{ display:true, text:"Idle Hours", font:{ size:10, weight:"700" } },
            ticks:{
              callback: v => formatTopReasonAxisTick(v),
              maxRotation:0,
            },
            grid:{ color:"#f1f5f9" },
          },
          y:{
            ticks:{
              font:{ size:11, family:"Nunito" },
              autoSkip:false,
            },
          },
        },
      },
    });
    return kill;
  }, [topReasonsChart]);

  useEffect(() => {
    const kill = () => {
      charts.current.accepted?.destroy();
      delete charts.current.accepted;
    };
    const canvas = cnv.accepted.current;
    if (!canvas) return kill;

    kill();
    const [accH, naH] = acceptedIdle.chart;
    charts.current.accepted = new Chart(canvas, {
      type:"doughnut",
      data:{
        labels:["Accepted Idle","Non-Accepted Idle"],
        datasets:[{
          data: [accH, naH],
          backgroundColor:["#2563eb","#dc2626"],
          borderWidth:4,
          borderColor:"#fff",
          hoverOffset:10,
        }],
      },
      options:{
        responsive:true, maintainAspectRatio:false, cutout:"66%",
        plugins:{
          legend:{ position:"bottom", labels:{ padding:14, font:{size:12,weight:"bold",family:"Nunito"} } },
          tooltip:{
            callbacks:{
              label: ctx => {
                const hms = acceptedIdle.hours_display?.[ctx.dataIndex] ?? "0:00:00";
                const hrs = Number(ctx.raw ?? 0).toFixed(2);
                const pct = ctx.dataIndex === 0
                  ? acceptedIdle.tiles[0]?.pct
                  : acceptedIdle.tiles[1]?.pct;
                return ` ${hms}  (${hrs} hrs, ${pct})`;
              },
            },
          },
        },
      },
    });
    return kill;
  }, [acceptedIdle]);

  useEffect(() => {
    const kill = () => {
      charts.current.monthwise?.destroy();
      delete charts.current.monthwise;
    };
    const canvas = cnv.monthwise.current;
    if (!canvas) return kill;

    kill();
    charts.current.monthwise = new Chart(canvas, {
      type:"bar",
      data:{
        labels: monthwiseChart.labels,
        datasets:[
          {
            type:"bar",
            label:"Idle Hours",
            data: monthwiseChart.hours.map(v => Number(v) || 0),
            backgroundColor:"rgba(37,99,235,0.25)",
            borderColor:"#2563eb",
            borderWidth:2,
            borderRadius:5,
            yAxisID:"y",
          },
          {
            type:"line",
            label:"Cost ₹L",
            data: monthwiseChart.cost.map(v => Number(v) || 0),
            borderColor:"#f97316",
            backgroundColor:"rgba(249,115,22,0.12)",
            borderWidth:2.5,
            pointBackgroundColor:"#f97316",
            pointRadius:5,
            fill:true,
            yAxisID:"y1",
            tension:0.4,
          },
        ],
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ labels:{ font:{weight:"bold",family:"Nunito"} } },
          tooltip:{
            callbacks:{
              label: ctx => {
                const v = Number(ctx.raw ?? 0);
                if (ctx.dataset.yAxisID === "y1") return ` ${ctx.dataset.label}: ₹${v.toFixed(2)} L`;
                return ` ${ctx.dataset.label}: ${v.toFixed(2)} hrs`;
              },
            },
          },
        },
        scales:{
          x:{ ticks:{ font:{ size:11, weight:"700" } } },
          y:  { beginAtZero:true, ticks:{callback:v=>`${v}h`}, grid:{color:"#f8fafc"} },
          y1: { position:"right", beginAtZero:true, ticks:{callback:v=>`₹${v}L`}, grid:{display:false} },
        },
      },
    });
    return kill;
  }, [monthwiseChart]);

  useEffect(() => {
    const kill = () => {
      charts.current.daywise?.destroy();
      delete charts.current.daywise;
    };
    const canvas = cnv.daywise.current;
    if (!canvas) return kill;

    const hrs = daywiseChart.data.map(v => Number(v) || 0);

    kill();
    charts.current.daywise = new Chart(canvas, {
      type:"line",
      data:{
        labels: daywiseChart.labels,
        datasets:[{
          label:"Daily Idle Hours",
          data: hrs,
          borderColor:"#2563eb",
          backgroundColor:"rgba(37,99,235,0.08)",
          fill:true,
          borderWidth:2.5,
          tension:0.4,
          pointBackgroundColor: hrs.map(v => v === 0 ? "#16a34a" : "#2563eb"),
          pointRadius:4,
        }],
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ display:false },
          tooltip:{
            callbacks:{
              title: items => {
                const idx = items[0]?.dataIndex ?? 0;
                return `Day ${daywiseChart.labels[idx] ?? ""}`;
              },
              label: ctx => {
                const v = Number(ctx.parsed.y ?? ctx.raw ?? 0);
                return v === 0 ? " Sunday / Holiday" : ` ${v.toFixed(2)} hrs idle`;
              },
            },
          },
        },
        scales:{
          x:{ ticks:{ font:{ size:10 }, maxRotation:0 } },
          y:{ beginAtZero:true, ticks:{ callback:v => `${v}h` } },
        },
      },
    });
    return kill;
  }, [daywiseChart]);

  useEffect(() => {
    const kill = () => {
      charts.current.shiftChart?.destroy();
      delete charts.current.shiftChart;
    };
    const canvas = cnv.shiftChart.current;
    if (!canvas) return kill;

    kill();
    charts.current.shiftChart = new Chart(canvas, {
      type:"bar",
      data:{
        labels: shiftChart.labels,
        datasets: shiftChart.datasets.map(ds => ({
          label: ds.label,
          data: ds.data.map(v => Number(v) || 0),
          backgroundColor: ds.backgroundColor,
          borderColor: ds.borderColor,
          borderWidth: ds.borderWidth ?? 1.5,
          borderRadius: ds.borderRadius ?? 4,
        })),
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ labels:{ font:{weight:"bold",family:"Nunito"} } },
          tooltip:{
            callbacks:{
              label: ctx => ` ${ctx.dataset.label}: ${Number(ctx.raw ?? 0).toFixed(2)} hrs`,
            },
          },
        },
        scales:{
          x:{ ticks:{font:{size:11}} },
          y:{ beginAtZero:true, ticks:{callback:v=>`${v}h`} },
        },
      },
    });
    return kill;
  }, [shiftChart]);

  // ── UPDATED: Cost Chart ──
  useEffect(() => {
    const kill = () => { charts.current.costChart?.destroy(); delete charts.current.costChart; };
    const canvas = cnv.costChart.current;
    if (!canvas) return kill;

    kill();
    charts.current.costChart = new Chart(canvas, {
      type:"bar",
      data:{
        labels: costMachineData.labels,
        datasets:[
          { label:"Idle Hours", data:costMachineData.hours.map(v=>Number(v)||0), backgroundColor:"rgba(37,99,235,0.6)",  borderColor:"#2563eb", borderWidth:1.5, borderRadius:4 },
          { label:"Cost ₹K",   data:costMachineData.cost.map(v=>Number(v)||0),  backgroundColor:"rgba(249,115,22,0.6)", borderColor:"#f97316", borderWidth:1.5, borderRadius:4 },
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
    return kill;
  }, [costMachineData]);

  // ── % Wise Idle Machine Ranking (rank 1–10 on X-axis) ──
  useEffect(() => {
    const kill = () => { charts.current.pctChart?.destroy(); delete charts.current.pctChart; };
    const canvas = cnv.pctChart.current;
    if (!canvas) return kill;

    const pctValues = pctMachineData.data.map(v => Number(v) || 0);
    const pctMacnos = pctMachineData.labels || [];
    const pctBarColor = v =>
      v > 75 ? "rgba(220,38,38,0.75)" :
      v > 50 ? "rgba(249,115,22,0.75)" :
      v > 25 ? "rgba(217,119,6,0.75)" :
               "rgba(37,99,235,0.75)";

    kill();
    charts.current.pctChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: pctValues.map((_, i) => String(i + 1)),
        datasets: [{
          label: "% Idle Time",
          data: pctValues,
          backgroundColor: pctValues.map(pctBarColor),
          borderRadius: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: items => {
                const mac = pctMacnos[items[0]?.dataIndex];
                return mac ? `MacNo: ${mac}` : "—";
              },
              label: ctx => {
                const pct = pctValues[ctx.dataIndex];
                return `${pct.toFixed(2)}% Idle`;
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: "Rank", font: { size: 11, weight: "bold" } },
            ticks: { font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: v => `${v}%` },
          },
        },
      },
    });
    return kill;
  }, [pctMachineData]);

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
              <IdleTimeReportDatePicker
                from={dateRange.from}
                to={dateRange.to}
                onChange={({ from, to }) => setDateRange({ from, to })}
              />
            </div>

            {[
              ["Machine No", "machine", filterOptions.machines],
              ["Shift",      "shift",   filterOptions.shifts],
              ["Reason",     "reason",  filterOptions.reasons],
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
          {kpiCards.map((k,i) => (
            <div key={i} className="itr-kpi-card"
                 style={{
                   background:k.bg, border:`1px solid ${k.border}33`,
                   borderLeftWidth:4, borderLeftStyle:"solid", borderLeftColor:k.border,
                   boxShadow:`0 2px 10px ${k.color}18`,
                   animationDelay:`${i*0.06}s`
                 }}>
              <div className="itr-kpi-top">
                <div className="itr-kpi-icon">{k.icon}</div>
                {k.badge ? (
                  <span className={`itr-kpi-badge ${k.neg?"itr-kpi-badge--neg":"itr-kpi-badge--pos"}`}>{k.badge}</span>
                ) : null}
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
              {acceptedIdle.tiles.map((item,i) => (
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
          {totalStats.map((s,i) => (
            <div key={i} className="itr-total-stat">
              <div className="itr-total-stat-label">{s.label}</div>
              <div className="itr-total-stat-val" style={{ color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <Card title="🔄 No. of Machines Idled — Shift Wise" badge="All Shifts" badgeBg="#f0fdf4" badgeColor="#16a34a" accentColor="#16a34a">
          <div className="itr-shift-tiles">
            {shiftTiles.map((s,i) => (
              <div key={i} className="itr-shift-tile" style={{ background:s.bg, border:`1.5px solid ${s.border}` }}>
                <div className="itr-shift-count" style={{ color:s.color }}>{s.count}</div>
                <div className="itr-shift-label">{s.label}</div>
                <div className="itr-shift-bar" style={{ background:`${s.color}20` }}>
                  <div className="itr-shift-fill" style={{ width:`${s.total ? (s.count/s.total)*100 : 0}%`, background:s.color }} />
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
                { lbl:"Highest M/c", val:costMachineData.labels[0] || "TC-24-S1", c:"#2563eb", bg:"rgba(37,99,235,0.06)",  bc:"rgba(37,99,235,0.2)"  },
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
              {[[" >75%","Critical","#dc2626","#fef2f2"],[" >50%","High","#f97316","#fff7ed"],[" >25%","Medium","#d97706","#fffbeb"]].map(([r,l,c,bg]) => (
                <span key={l} className="itr-legend-pill" style={{ background:bg, color:c }}>{r} {l}</span>
              ))}
            </div>
            <div className="itr-chart--lg"><canvas ref={cnv.pctChart} /></div>
          </Card>
        </div>

        <SectionLabel label="9  —  Continuous Idle Reasons + Machines Idle Not Entered" />

        <div className="itr-g2">
          <Card title="🔁 Continuous Idle Reasons (≥ 4 hrs)"
                badge={`${continuousIdle.length} Flagged`} badgeBg="#fef2f2" badgeColor="#dc2626" accentColor="#dc2626">
            <div className="itr-table-scroll itr-table-scroll--continuous">
              <table className="itr-table">
                <thead className="itr-thead--red">
                  <tr><th>Machine</th><th>Reason</th><th>Hours</th><th className="center">Shifts</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {continuousIdle.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="itr-td-muted itr-td-center">No continuous idle (≥ 4 hrs) in this period.</td>
                    </tr>
                  ) : continuousIdle.map((r, i) => (
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

          <Card title="⚠ Idle Time Not Entered"
                badge={`${idleTimeNotEntered.summary.not_entered ?? 0} Pending`}
                badgeBg="#fff7ed" badgeColor="#f97316" accentColor="#d97706">
            <div className="itr-notent-grid">
              {[
                { lbl:"Not Entered",   val: idleTimeNotEntered.summary.not_entered ?? 0, c:"#dc2626", bg:"rgba(220,38,38,0.06)",  bc:"rgba(220,38,38,0.2)"  },
                { lbl:"Partial Entry", val: idleTimeNotEntered.summary.partial_entry ?? 0, c:"#d97706", bg:"rgba(217,119,6,0.06)",  bc:"rgba(217,119,6,0.2)"  },
                { lbl:"Completed",     val: idleTimeNotEntered.summary.completed ?? 0, c:"#16a34a", bg:"rgba(22,163,74,0.06)",  bc:"rgba(22,163,74,0.2)"  },
              ].map((item,i) => (
                <div key={i} className="itr-notent-tile" style={{ background:item.bg, border:`1.5px solid ${item.bc}` }}>
                  <div className="itr-notent-val"   style={{ color:item.c }}>{item.val}</div>
                  <div className="itr-notent-label">{item.lbl}</div>
                </div>
              ))}
            </div>
            <div className="itr-table-scroll itr-table-scroll--continuous">
              <table className="itr-table">
                <thead className="itr-thead--amber">
                  <tr><th>Machine</th><th>Shift</th><th>Date</th><th>Operator</th></tr>
                </thead>
                <tbody>
                  {idleTimeNotEntered.rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="itr-td-muted itr-td-center">No idle time gaps in this period.</td>
                    </tr>
                  ) : idleTimeNotEntered.rows.map((r, i) => (
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
                  {reasonMachineDetail.column_headers.map(h => <th key={h} className="right">{h}</th>)}
                  <th className="right">Total</th>
                  <th className="right">%</th>
                </tr>
              </thead>
              <tbody>
                {reasonMachineDetail.rows.length === 0 ? (
                  <tr>
                    <td colSpan={reasonMachineDetail.column_headers.length + 3} className="itr-td-muted itr-td-center">
                      No idle data for this period.
                    </td>
                  </tr>
                ) : reasonMachineDetail.rows.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight:800,color:"#1e293b",whiteSpace:"nowrap" }}>{row.reason}</td>
                    {row.cols.map((val, j) => <td key={j} className={levelTd(row.lvl)}>{val}</td>)}
                    <td className={levelTd(row.lvl)} style={{ fontWeight:900 }}>{row.total}</td>
                    <td style={{ textAlign:"right",fontWeight:700,
                                 color:parseFloat(row.pct)>5?"#dc2626":parseFloat(row.pct)>2?"#f97316":"#64748b" }}>
                      {row.pct}%
                    </td>
                  </tr>
                ))}
                {reasonMachineDetail.rows.length > 0 && (
                <tr className="itr-tr-total">
                  <td>TOTAL</td>
                  {reasonMachineDetail.footer.cols.map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                  <td style={{ fontWeight:900 }}>{reasonMachineDetail.footer.total}</td>
                  <td>{reasonMachineDetail.footer.pct}%</td>
                </tr>
                )}
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