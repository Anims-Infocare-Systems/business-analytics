/**
 * Dashboard3 — Plant Performance
 * 3-column UI: Current State (10) | Center detail | Action (9)
 * Live metrics from Dashboard2 APIs · fixed-height columns with inner scroll
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Chart, registerables } from "chart.js";
import "./Dashboard3.css";
import Dashboard3DatePicker from "./Dashboard3DatePicker";
import Dashboard3ProductionDataView from "./Dashboard3ProductionDataView";

Chart.register(...registerables);

const CURRENT_STATE_CARDS = [
  { id: "production_output", title: "Production Output", icon: "⚙️", color: "#0ea5e9", colorLight: "#e0f7ff" },
  { id: "final_inspection_ok", title: "Final Inspection OK Qty", icon: "✅", color: "#10b981", colorLight: "#d1fae5" },
  { id: "oee_efficiency", title: "OEE Efficiency", icon: "📈", color: "#1a56db", colorLight: "#dbeafe" },
  { id: "machine_efficiency", title: "Operator efficiency", icon: "🚚", color: "#8b5cf6", colorLight: "#ede9fe" },
  { id: "idle_summary", title: "Idle time summary", icon: "⏱️", color: "#0ea5e9", colorLight: "#e0f7ff" },
  { id: "production_data", title: "Production Data", icon: "📊", color: "#2d6de8", colorLight: "#e8eeff" },
  { id: "otd_trend", title: "On-Time Delivery Trend", icon: "📅", color: "#7c3aed", colorLight: "#ede9fe" },
  { id: "po_status", title: "Purchase Order Status", icon: "🛒", color: "#f97316", colorLight: "#ffedd5" },
];

const ACTION_CARDS = [
  { id: "injob_inspection", title: "Job Order Inspection", icon: "📋", color: "#2d6de8", priority: "medium" },
  { id: "inter_inspection", title: "Intermediate Inspection", icon: "⚙️", color: "#0ea5e9", priority: "medium" },
  { id: "final_inspection", title: "Final Inspection", icon: "✅", color: "#10b981", priority: "medium" },
  { id: "quality_split", title: "Quality Split", icon: "🎯", color: "#8b5cf6", priority: "medium" },
  { id: "downtime_reason", title: "Downtime by Reason", icon: "🔴", color: "#ef4444", priority: "high" },
  { id: "top_defects", title: "Top Defect Categories", icon: "📉", color: "#f43f5e", priority: "high" },
  { id: "customer_complaints", title: "Customer Complaints", icon: "📣", color: "#f59e0b", priority: "high" },
  { id: "iqc_rejections", title: "IQC — Incoming Quality Rejections", icon: "🔬", color: "#dc2626", priority: "high" },
  { id: "grn_pending", title: "GRN Pending Pipeline (Quick View)", icon: "📦", color: "#ea580c", priority: "medium" },
];

function formatLocalYmd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildUrl(base, from, to) {
  if (!from || !to) return base;
  return `${base}?from=${formatLocalYmd(from)}&to=${formatLocalYmd(to)}`;
}

function fmtNum(n) {
  const v = Number(n);
  return Number.isNaN(v) ? "—" : Math.round(v).toLocaleString();
}

function fmtPct(n, d = 1) {
  const v = Number(n);
  return Number.isNaN(v) ? "—" : `${v.toFixed(d)}%`;
}

function fmtHours(n) {
  const v = Number(n);
  return Number.isNaN(v) ? "—" : `${v.toFixed(1)} h`;
}

function qualitySplit(data) {
  const fi = data.fi;
  const kpis = data.prod?.kpis ?? {};
  const ok = Number(fi?.total_ok_qty ?? 0) || 0;

  // Job Order (InJob) Inspection
  const jobRej = Number(data.injob?.total_rejection ?? kpis.rejection_qty ?? 0) || 0;
  const jobRwk = Number(data.injob?.total_rework ?? kpis.rework_grand_total ?? 0) || 0;

  // Intermediate Inspection
  const interRej = Number(data.inter?.total_rejection ?? 0) || 0;
  const interRwk = Number(data.inter?.total_rework ?? 0) || 0;

  // Final Inspection
  const finalRej = Number(data.finalOrg?.total_rejection ?? 0) || 0;
  const finalRwk = Number(data.finalOrg?.total_rework ?? 0) || 0;

  const rejection = jobRej + interRej + finalRej;
  const rework = jobRwk + interRwk + finalRwk;

  const total = ok + rejection + rework;
  const pct = (v) => (total > 0 ? Number(((v / total) * 100).toFixed(1)) : 0);
  return { ok, rejection, rework, total, pctOk: pct(ok), pctRej: pct(rejection), pctRwk: pct(rework) };
}

function buildStateSidebar(card, data, loading) {
  const kpis = data.prod?.kpis ?? {};
  const fi = data.fi;
  const idle = data.idle?.summary ?? {};
  const otd = data.otd?.kpis ?? {};
  const po = data.po?.summary ?? {};
  const shifts = data.shifts?.shifts ?? [];

  const map = {
    production_output: { value: fmtNum(kpis.production_output), unit: "units", sub: "Range total", trend: 0 },
    final_inspection_ok: { value: fmtNum(fi?.total_ok_qty), unit: "units", sub: "Approved compliant qty", trend: Number(fi?.total_ok_qty) > 0 ? 1 : 0 },
    rejection_qty: { value: fmtNum(kpis.rejection_qty), unit: "Qty", sub: "All inspection types", trend: -1 },
    rework_qty: { value: fmtNum(kpis.rework_grand_total), unit: "Qty", sub: "Rework total", trend: 0 },
    oee_efficiency: { value: (kpis.oa_efficiency ?? 0).toFixed(2), unit: "%", sub: "Target 80%", trend: (kpis.oa_efficiency ?? 0) >= 80 ? 1 : -1 },
    machine_efficiency: { value: (kpis.oa_efficiency ?? 0).toFixed(2), unit: "%", sub: "Overall avg", trend: (kpis.oa_efficiency ?? 0) >= 80 ? 1 : -1 },
    idle_summary: { value: fmtHours(idle.total_idle_hours), unit: "", sub: `Non-acc ${fmtHours(idle.non_accepted_hours)}`, trend: 0 },
    production_data: { value: shifts.length ? `${shifts.length}` : "—", unit: "shifts", sub: "By shift", trend: 0 },
    otd_trend: { value: otd.on_time_delivery_pct != null ? fmtPct(otd.on_time_delivery_pct) : "—", unit: "", sub: `${data.otd?.trend?.length ?? 0} months`, trend: 0 },
    po_status: { value: fmtNum(po.total_pos), unit: "POs", sub: `GRN pend ${po.grn_pending ?? 0}`, trend: 0 },
  };
  const m = map[card.id] ?? { value: "—", unit: "", sub: "", trend: 0 };
  const spark = m.trend >= 0 ? [72, 76, 78, 80, 82, 84, 86, Number(String(m.value).replace(/[^0-9.]/g, "")) || 85] : [88, 86, 84, 82, 80, 78, 76, 74];
  return { ...m, sparkData: spark, loading };
}

function actionPriority(card, data) {
  const injob = data.injob;
  const inter = data.inter;
  const fi = data.fi;
  const qs = qualitySplit(data);
  const top = data.topDefects?.rows?.[0];
  const grn = data.grn?.summary?.total_record_count ?? 0;
  const complaints = data.complaints?.complaints?.length ?? 0;
  const iqc = Number(data.iqc?.summary?.total_rejection_qty ?? 0);
  const dt = data.downtime?.reasons?.[0]?.hours ?? 0;

  switch (card.id) {
    case "injob_inspection": return Number(injob?.total_rejection) > 50 ? "high" : "medium";
    case "inter_inspection": return Number(inter?.total_rejection) > 30 ? "high" : "medium";
    case "final_inspection": return (fi?.first_pass_yield ?? 100) < 95 ? "high" : "low";
    case "quality_split": return qs.pctRej > 5 ? "high" : "medium";
    case "downtime_reason": return dt >= 4 ? "high" : dt >= 2 ? "medium" : "low";
    case "top_defects": return (top?.rejection_pct ?? 0) >= 20 ? "high" : "medium";
    case "customer_complaints": return complaints > 0 ? "high" : "low";
    case "iqc_rejections": return iqc > 0 ? "high" : "medium";
    case "grn_pending": return grn > 20 ? "high" : grn > 5 ? "medium" : "low";
    default: return card.priority || "medium";
  }
}

function buildActionSidebar(card, data, loading) {
  const injob = data.injob;
  const inter = data.inter;
  const fi = data.fi;
  const qs = qualitySplit(data);
  const top = data.topDefects?.rows?.[0];
  const grn = data.grn?.summary;

  const map = {
    injob_inspection: { desc: `Rej ${fmtNum(injob?.total_rejection)} · Rwk ${fmtNum(injob?.total_rework)}`, time: injob?.rejection_pct != null ? `Rej ${fmtPct(injob.rejection_pct)}` : "JO inspection" },
    inter_inspection: { desc: `Rej ${fmtNum(inter?.total_rejection)} · Rwk ${fmtNum(inter?.total_rework)}`, time: inter?.row_count != null ? `${inter.row_count} rows` : "Inter inspection" },
    final_inspection: { desc: `OK ${fmtNum(fi?.total_ok_qty)} · FPY ${fmtPct(fi?.first_pass_yield ?? 0)}`, time: "Final inspection" },
    quality_split: { desc: `OK ${qs.pctOk}% · Rej ${qs.pctRej}% · Rwk ${qs.pctRwk}%`, time: "Quality split" },
    downtime_reason: { desc: data.downtime?.reasons?.[0]?.reason ? String(data.downtime.reasons[0].reason).slice(0, 40) : "Top downtime reason", time: data.downtime?.reasons?.[0] ? fmtHours(data.downtime.reasons[0].hours) : "Idle hours" },
    top_defects: { desc: top?.partno ? `Top: ${top.partno}` : "Top defect parts", time: top?.rejection_pct != null ? `${top.rejection_pct}%` : "Defects" },
    customer_complaints: { desc: `${data.complaints?.complaints?.length ?? 0} complaint(s) in range`, time: "Customer QC" },
    iqc_rejections: { desc: `Rej qty ${fmtNum(data.iqc?.summary?.total_rejection_qty)}`, time: `${data.iqc?.summary?.total_record_count ?? 0} records` },
    grn_pending: { desc: `${grn?.total_record_count ?? 0} pending record(s)`, time: `Qty ${fmtNum(grn?.total_qty)}` },
  };
  const m = map[card.id] ?? { desc: "—", time: "—" };
  return { ...m, priority: actionPriority(card, data), loading };
}

function buildCenterDetail(cardId, panel, data) {
  const kpis = data.prod?.kpis ?? {};
  const fi = data.fi;
  const idle = data.idle?.summary;
  const otd = data.otd;
  const po = data.po;
  const qs = qualitySplit(data);
  const card = panel === "state"
    ? CURRENT_STATE_CARDS.find((c) => c.id === cardId)
    : ACTION_CARDS.find((c) => c.id === cardId);
  if (!card) return null;

  const heading = card.title;
  const color = card.color;

  const chip = (label, value, unit, icon, chipColor) => ({ label, value, unit, icon, color: chipColor });

  let kpisStrip = [];
  let chartMode = null;
  let lineChart = null;
  let barChart = null;
  let donut = null;
  let insights = [];

  if (panel === "state") {
    switch (cardId) {
      case "production_output":
        kpisStrip = [
          chip("Output", fmtNum(kpis.production_output), "units", "📦", "#0ea5e9"),
        ];
        insights = [{ type: "info", text: "Production output totals for selected date range." }];
        break;
      case "final_inspection_ok":
        kpisStrip = [
          chip("OK Qty", fmtNum(fi?.total_ok_qty), "", "✅", "#10b981"),
        ];
        break;
      case "rejection_qty":
      case "rework_qty":
        kpisStrip = [
          chip("Output", fmtNum(kpis.production_output), "units", "📦", "#0ea5e9"),
          chip("Rejection", fmtNum(kpis.rejection_qty), "qty", "❌", "#ef4444"),
          chip("Rework", fmtNum(kpis.rework_grand_total), "qty", "🔄", "#f59e0b"),
          chip("OAEFF", (kpis.oa_efficiency ?? 0).toFixed(2), "%", "📈", "#1a56db"),
        ];
        break;
      case "oee_efficiency":
        kpisStrip = [
          chip("OA Efficiency", (kpis.oa_efficiency ?? 0).toFixed(2), "%", "📈", "#1a56db"),
        ];
        break;
      case "machine_efficiency":
        kpisStrip = [
          chip("OTD %", fmtPct(otd?.kpis?.on_time_delivery_pct), "", "📅", "#8b5cf6"),
          chip("On-time qty", fmtNum(otd?.kpis?.on_time_qty), "", "✅", "#10b981"),
          chip("Total del.", fmtNum(otd?.kpis?.total_del_qty), "", "🚚", "#2d6de8"),
          chip("Delayed", fmtNum(otd?.kpis?.delayed_lines), "lines", "⚠️", "#ef4444"),
        ];
        break;
      case "idle_summary":
        kpisStrip = [
          chip("Accepted", fmtHours(idle?.accepted_hours), "", "✅", "#10b981"),
          chip("Non-accepted", fmtHours(idle?.non_accepted_hours), "", "🔴", "#ef4444"),
          chip("Total", fmtHours(idle?.total_idle_hours), "", "⏱️", "#0ea5e9"),
          chip("Other", fmtHours(idle?.other_hours), "", "ℹ️", "#94a3b8"),
        ];
        break;
      case "production_data":
        /* Chart rendered by Dashboard3ProductionDataView (same as Dashboard2) */
        break;
      case "otd_trend":
        /* Rendered by OtdTrendView */
        break;
      case "po_status":
        kpisStrip = [
          chip("Total POs", fmtNum(po?.summary?.total_pos), "", "🛒", "#f97316"),
          chip("Approved", fmtNum(po?.summary?.approved), "", "✅", "#10b981"),
          chip("GRN pending", fmtNum(po?.summary?.grn_pending), "", "⏳", "#f59e0b"),
          chip("PO value", fmtNum(po?.summary?.total_po_value), "", "💰", "#2d6de8"),
        ];
        break;
      default:
        break;
    }
  } else {
    switch (cardId) {
      case "injob_inspection":
        kpisStrip = [
          chip("Rejection", fmtNum(data.injob?.total_rejection), "pcs", "❌", "#ef4444"),
          chip("Rework", fmtNum(data.injob?.total_rework), "pcs", "🔄", "#f59e0b"),
          chip("Rej %", data.injob?.rejection_pct != null ? fmtPct(data.injob.rejection_pct) : "—", "", "📊", "#2d6de8"),
          chip("Basis qty", fmtNum(data.injob?.total_qty_basis), "", "📦", "#64748b"),
        ];
        break;
      case "inter_inspection":
        kpisStrip = [
          chip("Rejection", fmtNum(data.inter?.total_rejection), "pcs", "❌", "#ef4444"),
          chip("Rework", fmtNum(data.inter?.total_rework), "pcs", "🔄", "#f59e0b"),
          chip("Rej %", data.inter?.rejection_pct != null ? fmtPct(data.inter.rejection_pct) : "—", "", "📊", "#2d6de8"),
          chip("Rows", fmtNum(data.inter?.row_count), "", "📋", "#64748b"),
        ];
        break;
      case "final_inspection":
        kpisStrip = [
          chip("OK", fmtNum(fi?.total_ok_qty), "", "✅", "#10b981"),
          chip("Org Rej", fmtNum(data.finalOrg?.total_rejection), "", "❌", "#ef4444"),
          chip("Org Rwk", fmtNum(data.finalOrg?.total_rework), "", "🔄", "#f59e0b"),
          chip("FPY", fmtPct(fi?.first_pass_yield ?? 0), "", "🎯", "#8b5cf6"),
        ];
        break;
      case "quality_split":
        chartMode = "quality";
        donut = {
          label: "Quality split",
          segments: [
            { label: "OK", value: qs.pctOk, color: "#10b981" },
            { label: "Rejection", value: qs.pctRej, color: "#ef4444" },
            { label: "Rework", value: qs.pctRwk, color: "#f59e0b" },
          ],
        };
        kpisStrip = [
          chip("OK", `${qs.pctOk}%`, "", "✅", "#10b981"),
          chip("Rejection", `${qs.pctRej}%`, "", "❌", "#ef4444"),
          chip("Rework", `${qs.pctRwk}%`, "", "🔄", "#f59e0b"),
          chip("Total", fmtNum(qs.total), "", "📊", "#2d6de8"),
        ];
        break;
      case "downtime_reason":
        chartMode = "downtime";
        barChart = {
          label: "Downtime by reason (hours)",
          bars: (data.downtime?.reasons ?? []).slice(0, 8).map((r) => ({
            label: String(r.reason).slice(0, 12),
            value: Number(r.hours) || 0,
            display: fmtHours(r.hours),
            color: "#ef4444",
          })),
        };
        break;
      default:
        kpisStrip = [
          chip("Metric", "—", "", "📊", color),
          chip("Records", "—", "", "📋", "#64748b"),
          chip("Range", data.prod?.from ? `${data.prod.from}` : "—", "", "📅", "#94a3b8"),
          chip("Status", "Live", "", "●", "#10b981"),
        ];
    }
  }

  return { id: cardId, color, heading, kpis: kpisStrip, chartMode, lineChart, barChart, donut, insights };
}

function buildBottomTable(cardId, panel, data) {
  const rows = [];
  let columns = [];
  let tableTitle = "Detail rows";

  if (panel === "state") {
    if (cardId === "po_status") {
      tableTitle = "Purchase orders";
      columns = ["PO", "Vendor", "Material", "Value"];
      (data.po?.rows ?? []).slice(0, 12).forEach((r) => {
        rows.push([r.po_number ?? "—", (r.vendor_name ?? "—").slice(0, 18), (r.material ?? "—").slice(0, 22), fmtNum(r.value)]);
      });
    } else if (cardId === "idle_summary") {
      tableTitle = "Idle — accepted lines";
      columns = ["Reason", "Hours"];
      (data.idle?.accepted ?? []).slice(0, 10).forEach((r) => {
        rows.push([String(r.reason ?? r.idle_reason ?? "—").slice(0, 28), fmtHours(r.hours)]);
      });
    }
  } else {
    if (cardId === "top_defects") {
      tableTitle = "Top defect categories";
      columns = ["#", "Part", "Rej Qty", "%"];
      (data.topDefects?.rows ?? []).forEach((r, i) => {
        rows.push([i + 1, r.partno ?? "—", fmtNum(r.total_rejection_qty), r.rejection_pct != null ? `${r.rejection_pct}%` : "—"]);
      });
    } else if (cardId === "customer_complaints") {
      tableTitle = "Customer complaints";
      columns = ["ID", "Customer", "Date", "Status"];
      (data.complaints?.complaints ?? []).slice(0, 12).forEach((c) => {
        rows.push([c.complaint_id ?? "—", (c.customer_name ?? "—").slice(0, 18), c.complaint_date ?? "—", c.status ?? "—"]);
      });
    } else if (cardId === "iqc_rejections") {
      tableTitle = "IQC rejections";
      columns = ["GRN", "Part", "Rej", "Vendor"];
      (data.iqc?.rows ?? []).slice(0, 12).forEach((r) => {
        rows.push([r.grnno ?? "—", (r.partno ?? "—").slice(0, 14), fmtNum(r.rejection_qty ?? r.rej_qty), (r.vendor_name ?? "—").slice(0, 14)]);
      });
    } else if (cardId === "grn_pending") {
      tableTitle = "GRN pending pipeline";
      columns = ["GRN", "Part", "Qty", "Pending"];
      (data.grn?.rows ?? []).slice(0, 12).forEach((r) => {
        rows.push([r.grnno ?? "—", (r.partno ?? r.part_description ?? "—").toString().slice(0, 16), fmtNum(r.qty), r.insp === 0 || r.insp === "0" ? "Yes" : "—"]);
      });
    } else if (cardId === "downtime_reason") {
      tableTitle = "Downtime reasons";
      columns = ["Reason", "Hours"];
      (data.downtime?.reasons ?? []).slice(0, 12).forEach((r) => {
        rows.push([String(r.reason).slice(0, 32), fmtHours(r.hours)]);
      });
    }
  }

  if (!rows.length) return null;
  return {
    tableTitle,
    columns,
    rows,
    highlight: rows.length - 1,
    recs: [{ icon: "💡", text: `Showing live ERP data for ${tableTitle.toLowerCase()}.` }],
  };
}

const OTD_TARGET_PCT = 90;

/** Chart.js options — same base as Charts.jsx sales-2 (OTD line) */
const OTD_LINE_CHART_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { font: { size: 9 } } },
  },
  scales: {
    x: { ticks: { font: { size: 9 } }, grid: { color: "rgba(228, 233, 242, 0.65)" } },
    y: { min: 0, max: 100, ticks: { font: { size: 9 }, stepSize: 10 }, grid: { color: "rgba(228, 233, 242, 0.65)" } },
  },
};

function otdReportChartToken(report) {
  if (!report?.labels?.length) return "empty";
  return `${report.fy}|${report.from}|${report.to}|${report.labels.join(",")}|${(report.data || []).join(",")}`;
}

/* ── Downtime helpers (mirrors Dashboard2 exactly) ─────────── */
const DOWNTIME_BAR_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#14b8a6", "#0ea5e9",
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
];

const DT_TOOLTIP_CFG = {
  backgroundColor: "#ffffff",
  titleColor: "#0f172a",
  bodyColor: "#64748b",
  borderColor: "#e4e9f2",
  borderWidth: 1,
  padding: 10,
};

function downtimeReasonChartToken(reasons) {
  if (!Array.isArray(reasons) || !reasons.length) return "empty";
  return reasons.map((r) => `${r.reason}:${r.hours}`).join(";");
}

function buildDowntimeChartSeries(reasons, maxReasons = 12) {
  const list = Array.isArray(reasons) ? reasons : [];
  if (!list.length) return { labels: ["No non-accepted idle in range"], hours: [0] };
  if (list.length <= maxReasons)
    return { labels: list.map((r) => r.reason || "—"), hours: list.map((r) => Number(r.hours) || 0) };
  const top = list.slice(0, maxReasons);
  const otherH = list.slice(maxReasons).reduce((s, r) => s + (Number(r.hours) || 0), 0);
  return {
    labels: [...top.map((r) => r.reason || "—"), `Other (${list.length - maxReasons} reasons)`],
    hours: [...top.map((r) => Number(r.hours) || 0), otherH],
  };
}

/** Chart.js canvas — same pattern as Dashboard2 ChartCanvas */
function ChartJsCanvas({ setup, height = 200, rebuildToken = 0 }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const setupRef = useRef(setup);
  setupRef.current = setup;
  useEffect(() => {
    if (!ref.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    chartRef.current = setupRef.current(ref.current);
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [rebuildToken]);
  return <canvas ref={ref} height={height} />;
}

/**
 * DowntimeReasonView — renders exact Dashboard2 "Downtime by Reason" card
 * shown in center panel when the "Downtime by Reason" action card is clicked.
 */
function DowntimeReasonView({ data, from, to, loading, uid }) {
  const reasons = data?.downtime?.reasons;
  const rangeHint =
    data?.downtime?.from && data?.downtime?.to
      ? `${data.downtime.from} → ${data.downtime.to}`
      : from && to
        ? `${formatLocalYmd(from)} → ${formatLocalYmd(to)}`
        : "Selected range";

  const setupChart = useCallback(
    (canvas) => {
      const { labels, hours } = buildDowntimeChartSeries(reasons);
      return new Chart(canvas, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: `Hours (${rangeHint}, non-accepted)`,
            data: hours,
            backgroundColor: labels.map((_, i) => DOWNTIME_BAR_COLORS[i % DOWNTIME_BAR_COLORS.length]),
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...DT_TOOLTIP_CFG,
              callbacks: {
                label(ctx) {
                  const v = typeof ctx.parsed.x === "number" ? ctx.parsed.x : Number(ctx.raw) || 0;
                  return `${v.toFixed(1)} h`;
                },
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: "rgba(228,233,242,.6)" },
              ticks: { color: "#94a3b8" },
              title: { display: true, text: "Hours", color: "#94a3b8", font: { size: 10 } },
            },
            y: {
              grid: { display: false },
              ticks: { color: "#64748b", font: { size: 10 }, maxRotation: 0, autoSkip: false },
            },
          },
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reasons, rangeHint]
  );

  const rebuildToken = downtimeReasonChartToken(reasons);
  const chartHeight = Math.max(180, (Array.isArray(reasons) ? Math.min(reasons.length, 12) : 1) * 26 + 40);

  return (
    <div className="d3-dt-view" key={uid}>
      <div className="d3-detail__titlebar">
        {/* <span className="d3-detail__bullet" style={{ background: "#ef4444" }} /> */}
        {/* <p className="d3-detail__heading">Downtime by Reason</p> */}
      </div>
      <div className="d3-dt-card">
        <div className="d3-dt-card__hd">
          <div>
            <div className="d3-dt-card__title">Downtime by Reason</div>
            {/* <div className="d3-dt-card__sub">
              Non-accepted idle (IdleReasons.IsAccept&nbsp;=&nbsp;0) — Machine_IdleEntry ·
              Prod_IdleEntry · conv_IdleEntry, by date range
            </div> */}
          </div>
        </div>
        <div
          className="d3-dt-chart-wrap"
          style={{ height: chartHeight, opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}
        >
          <ChartJsCanvas setup={setupChart} height={chartHeight} rebuildToken={rebuildToken} />
        </div>
        {!loading && (!Array.isArray(reasons) || !reasons.length) && (
          <p className="d3-dt-card__empty">No non-accepted idle hours recorded for this date range.</p>
        )}
      </div>
    </div>
  );
}

/* ── Quality Split helpers (mirrors Dashboard2 exactly) ─────── */
function qualitySplitD3Metrics(data) {
  const ok = Number(data.fi?.total_ok_qty ?? 0) || 0;

  // Job Order (InJob) Inspection
  const jobRej = Number(data.injob?.total_rejection ?? data.prod?.kpis?.rejection_qty ?? 0) || 0;
  const jobRwk = Number(data.injob?.total_rework ?? data.prod?.kpis?.rework_grand_total ?? 0) || 0;

  // Intermediate Inspection
  const interRej = Number(data.inter?.total_rejection ?? 0) || 0;
  const interRwk = Number(data.inter?.total_rework ?? 0) || 0;

  // Final Inspection
  const finalRej = Number(data.finalOrg?.total_rejection ?? 0) || 0;
  const finalRwk = Number(data.finalOrg?.total_rework ?? 0) || 0;

  const rejection = jobRej + interRej + finalRej;
  const rework = jobRwk + interRwk + finalRwk;

  const from = data.fi?.from || data.prod?.from || "";
  const to = data.fi?.to || data.prod?.to || "";
  const total = ok + rejection + rework;
  const pct = (v) => (total > 0 ? ((v / total) * 100).toFixed(1) : "0.0");
  return { ok, rejection, rework, total, from, to, pctOk: pct(ok), pctRej: pct(rejection), pctRwk: pct(rework) };
}

function qualSplitToken(data) {
  const m = qualitySplitD3Metrics(data);
  return `${m.from}|${m.to}|${m.ok}|${m.rejection}|${m.rework}`;
}

const QS_TOOLTIP_CFG = {
  backgroundColor: "#ffffff",
  titleColor: "#0f172a",
  bodyColor: "#64748b",
  borderColor: "#e4e9f2",
  borderWidth: 1,
  padding: 10,
};

/**
 * QualitySplitView — renders exact Dashboard2 "Quality Split" card
 * shown when Quality Split action card is clicked in Dashboard3.
 */
function QualitySplitView({ data, loading, uid }) {
  const m = qualitySplitD3Metrics(data);
  const { ok, rejection, rework, total, from, to } = m;
  const rangeLine = from && to ? `${from} → ${to}` : "Uses the dashboard date range";

  const setupChart = useCallback(
    (canvas) => {
      let chartData = [ok, rejection, rework];
      if (total <= 0) chartData = [1, 1, 1];
      return new Chart(canvas, {
        type: "doughnut",
        data: {
          labels: ["Final inspection OK", "Rejection", "Rework"],
          datasets: [{
            data: chartData,
            backgroundColor: total > 0
              ? ["rgba(16,185,129,.88)", "rgba(239,68,68,.85)", "rgba(245,158,11,.88)"]
              : ["#e2e8f0", "#e2e8f0", "#cbd5e1"],
            borderColor: "#ffffff",
            borderWidth: 3,
            hoverOffset: 6,
          }],
        },
        options: {
          cutout: "72%",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...QS_TOOLTIP_CFG,
              callbacks: {
                label(ctx) {
                  const lbl = ctx.label || "";
                  if (total <= 0) return `${lbl}: no data in range`;
                  const v = [ok, rejection, rework][ctx.dataIndex] ?? 0;
                  return `${lbl}: ${v.toLocaleString()} (${((v / total) * 100).toFixed(1)}%)`;
                },
              },
            },
          },
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ok, rejection, rework, total]
  );

  const rebuildToken = qualSplitToken(data);

  return (
    <div className="d3-qs-view" key={uid}>
      <div className="d3-qs-card">
        <div className="d3-qs-card__hd">
          <div>
            <div className="d3-qs-card__title">Quality Split</div>
            {/* <div className="d3-qs-card__sub">
              FinalInspectionEntry OK (finspdate) · Rejection &amp; rework from GET
              /api/dashboard2/kpis/ (InJob + Inter + Final)
            </div> */}
          </div>
        </div>
        {/* <div className="d3-qs-range">{rangeLine}</div> */}
        <div
          className="d3-qs-chart-wrap"
          style={{ height: 250, opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}
        >
          <ChartJsCanvas setup={setupChart} height={150} rebuildToken={rebuildToken} />
        </div>
        <div className="d3-qs-leg">
          <div className="d3-qs-leg__item">
            <span className="d3-qs-leg__dot" style={{ background: "#10b981" }} />
            Final inspection OK · {m.pctOk}% · {ok.toLocaleString()} qty
          </div>
          <div className="d3-qs-leg__item">
            <span className="d3-qs-leg__dot" style={{ background: "#ef4444" }} />
            Rejection · {m.pctRej}% · {rejection.toLocaleString()} qty
          </div>
          <div className="d3-qs-leg__item">
            <span className="d3-qs-leg__dot" style={{ background: "#f59e0b" }} />
            Rework · {m.pctRwk}% · {rework.toLocaleString()} qty
          </div>
        </div>
        {!loading && total <= 0 && (
          <p className="d3-qs-empty">No OK / rejection / rework quantities in this range.</p>
        )}
      </div>
    </div>
  );
}

/* ── Top Defect Categories (mirrors Downtime by Reason style exactly) */
function topDefectsChartToken(data) {
  const rows = data?.topDefects?.rows;
  if (!Array.isArray(rows) || !rows.length) return "empty";
  return rows.map((r) => `${r.partno}:${r.total_rejection_qty}`).join(";");
}

function TopDefectsView({ data, loading, uid }) {
  const rows = data?.topDefects?.rows ?? [];
  const from = data?.topDefects?.from ?? "";
  const to = data?.topDefects?.to ?? "";
  const rangeHint = from && to ? `${from} → ${to}` : "Selected range";
  const chartHeight = Math.max(180, rows.length * 34 + 50);

  const setupChart = useCallback(
    (canvas) => {
      const labels = rows.length ? rows.map((r) => r.partno || "—") : ["No data"];
      const values = rows.length ? rows.map((r) => Number(r.total_rejection_qty) || 0) : [0];
      return new Chart(canvas, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: `Rejection Qty (${rangeHint})`,
            data: values,
            backgroundColor: labels.map((_, i) => DOWNTIME_BAR_COLORS[i % DOWNTIME_BAR_COLORS.length]),
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...DT_TOOLTIP_CFG,
              callbacks: {
                label(ctx) {
                  const v = typeof ctx.parsed.x === "number" ? ctx.parsed.x : Number(ctx.raw) || 0;
                  const total = data?.topDefects?.total_rejection_qty || 0;
                  const pct = total > 0 ? ` (${((v / total) * 100).toFixed(1)}%)` : "";
                  return `${Math.round(v).toLocaleString()} qty${pct}`;
                },
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: "rgba(228,233,242,.6)" },
              ticks: { color: "#94a3b8" },
              title: { display: true, text: "Rejection Qty", color: "#94a3b8", font: { size: 10 } },
            },
            y: {
              grid: { display: false },
              ticks: { color: "#64748b", font: { size: 10 }, maxRotation: 0, autoSkip: false },
            },
          },
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, rangeHint]
  );

  const rebuildToken = topDefectsChartToken(data);

  return (
    <div className="d3-dt-view" key={uid}>
      <div className="d3-dt-card">
        <div className="d3-dt-card__hd">
          <div>
            <div className="d3-dt-card__title">Top Defect Categories</div>
            {/* <div className="d3-dt-card__sub">
              By rejection qty · FinalInspRejectionEntryOrg + InterInspectionEntry · {rangeHint}
            </div> */}
          </div>
        </div>
        <div
          className="d3-dt-chart-wrap"
          style={{ height: chartHeight, opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}
        >
          <ChartJsCanvas setup={setupChart} height={chartHeight} rebuildToken={rebuildToken} />
        </div>
        {!loading && !rows.length && (
          <p className="d3-dt-card__empty">No rejection data for this date range.</p>
        )}
      </div>
    </div>
  );
}

/* ── Customer Complaints View ─────────────────────────────── */
const CC_STATUS_CFG = {
  Closed: { c: "#10b981", bg: "#d1fae5" },
  Open: { c: "#ef4444", bg: "#fee2e2" },
  "In Progress": { c: "#f59e0b", bg: "#fef3c7" },
};

function ccStatusStyle(status) {
  const s = String(status || "").trim().toLowerCase();
  if (s.includes("close")) return CC_STATUS_CFG["Closed"];
  if (s.includes("open") && !s.includes("close")) return CC_STATUS_CFG["Open"];
  if (s.includes("progress") || s.includes("pending") || s.includes("wip")) return CC_STATUS_CFG["In Progress"];
  return { c: "#64748b", bg: "#f1f5f9" };
}

function ccChartToken(rows) {
  if (!rows.length) return "empty";
  return rows.map((r) => `${r.complaint_id}:${r.status}`).join("|");
}

function CustomerComplaintsView({ data, loading, uid }) {
  const rows = data?.complaints?.complaints ?? [];
  const from = data?.complaints?.from ?? "";
  const to = data?.complaints?.to ?? "";
  const rangeLine = from && to ? `${from} → ${to}` : "Uses dashboard date range";

  const total = rows.length;
  const closed = rows.filter((r) => String(r.status || "").toLowerCase().includes("close")).length;
  const openLike = rows.filter((r) => { const s = String(r.status || "").toLowerCase(); return s.includes("open") && !s.includes("close"); }).length;
  const inProg = total - closed - openLike;

  /* status bar chart — one bar per unique customer, stacked or grouped */
  const customerCounts = {};
  rows.forEach((r) => {
    const cust = r.customer_name || "Unknown";
    if (!customerCounts[cust]) customerCounts[cust] = { open: 0, closed: 0, other: 0 };
    const s = String(r.status || "").toLowerCase();
    if (s.includes("close")) customerCounts[cust].closed++;
    else if (s.includes("open")) customerCounts[cust].open++;
    else customerCounts[cust].other++;
  });
  const custLabels = Object.keys(customerCounts);
  const chartH = Math.max(120, custLabels.length * 32 + 50);

  const setupChart = useCallback(
    (canvas) => {
      if (!custLabels.length) return null;
      return new Chart(canvas, {
        type: "bar",
        data: {
          labels: custLabels,
          datasets: [
            {
              label: "Open",
              data: custLabels.map((c) => customerCounts[c].open),
              backgroundColor: "rgba(239,68,68,.80)",
              borderRadius: 4,
              borderSkipped: false,
            },
            {
              label: "Closed",
              data: custLabels.map((c) => customerCounts[c].closed),
              backgroundColor: "rgba(16,185,129,.80)",
              borderRadius: 4,
              borderSkipped: false,
            },
            {
              label: "Other",
              data: custLabels.map((c) => customerCounts[c].other),
              backgroundColor: "rgba(245,158,11,.75)",
              borderRadius: 4,
              borderSkipped: false,
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { boxWidth: 10, font: { size: 10 }, color: "#64748b" } },
            tooltip: { ...DT_TOOLTIP_CFG },
          },
          scales: {
            x: { stacked: true, beginAtZero: true, grid: { color: "rgba(228,233,242,.6)" }, ticks: { color: "#94a3b8", font: { size: 10 } } },
            y: { stacked: true, grid: { display: false }, ticks: { color: "#64748b", font: { size: 10 }, maxRotation: 0, autoSkip: false } },
          },
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [custLabels.join(",")]
  );

  const rebuildToken = ccChartToken(rows);

  return (
    <div className="d3-cc-view" key={uid}>
      {/* ── Header ── */}
      <div className="d3-cc-hd">
        <div className="d3-cc-hd__left">
          <div className="d3-cc-hd__title">Customer Complaints</div>
          {/* <div className="d3-cc-hd__sub">CustCompMas · CustCompDet · CustMast — {rangeLine}</div> */}
        </div>
      </div>

      {/* ── Stat strip ── */}
      <div className="d3-cc-strip">
        <div className="d3-cc-stat d3-cc-stat--age">
          <div className="d3-cc-stat__val">{loading ? "…" : total}</div>
          <div className="d3-cc-stat__lbl">In range</div>
        </div>
        <div className="d3-cc-stat d3-cc-stat--open">
          <div className="d3-cc-stat__val">{loading ? "…" : openLike}</div>
          <div className="d3-cc-stat__lbl">Open-like</div>
        </div>
        <div className="d3-cc-stat d3-cc-stat--closed">
          <div className="d3-cc-stat__val">{loading ? "…" : closed}</div>
          <div className="d3-cc-stat__lbl">Closed-like</div>
        </div>
        {inProg > 0 && (
          <div className="d3-cc-stat d3-cc-stat--prog">
            <div className="d3-cc-stat__val">{inProg}</div>
            <div className="d3-cc-stat__lbl">In Progress</div>
          </div>
        )}
      </div>

      {/* ── Chart ── */}
      {!loading && custLabels.length > 0 && (
        <div className="d3-cc-chart-card">
          <div className="d3-cc-chart-title">Complaints by Customer &amp; Status</div>
          <div
            className="d3-cc-chart-wrap"
            style={{ height: chartH, position: "relative" }}
          >
            <ChartJsCanvas setup={setupChart} height={chartH} rebuildToken={rebuildToken} />
          </div>
        </div>
      )}

      {/* ── Table ── (rendered in bottom panel below) */}
    </div>
  );
}

function CustomerComplaintsBottomTable({ data, loading, uid }) {
  const rows = data?.complaints?.complaints ?? [];
  return (
    <div className="d3-cc-bot" key={uid}>
      <div className="d3-cc-bot__hd">Complaints List</div>
      <div className="d3-cc-tbl-wrap" style={{ maxHeight: 300 }}>
        <table className="d3-cc-tbl">
          <thead>
            <tr>
              <th>Complaint ID</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Complaint Description</th>
              <th>Action Taken</th>
              <th>Date</th>
              <th>Corrective Action</th>
              <th>Permanent Action</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="d3-cc-tbl__empty">Loading complaints…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="d3-cc-tbl__empty">No complaints in this date range.</td></tr>
            ) : (
              rows.map((c, i) => {
                const stcfg = ccStatusStyle(c.status);
                return (
                  <tr key={`${c.complaint_id}-${i}`} className="d3-cc-tbl__tr">
                    <td className="d3-cc-tbl__id">{c.complaint_id || "—"}</td>
                    <td className="d3-cc-tbl__bold">{c.customer_name || "—"}</td>
                    <td className="d3-cc-tbl__narrow" title={c.product}>{c.product || "—"}</td>
                    <td className="d3-cc-tbl__text" title={c.complaint_description}>{c.complaint_description || "—"}</td>
                    <td className="d3-cc-tbl__text" title={c.action_taken}>{c.action_taken || "—"}</td>
                    <td className="d3-cc-tbl__mono">{c.complaint_date || "—"}</td>
                    <td className="d3-cc-tbl__text" title={c.corrective_action}>{c.corrective_action || "—"}</td>
                    <td className="d3-cc-tbl__text" title={c.permanent_action}>{c.permanent_action || "—"}</td>
                    <td>
                      <span className="d3-cc-badge" style={{ background: stcfg.bg, color: stcfg.c }}>
                        {c.status || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── IQC — Incoming Quality Rejections ──────────────────── */
function iqcChartToken(data) {
  const rows = data?.iqc?.rows;
  if (!Array.isArray(rows) || !rows.length) return "empty";
  return rows.map((r) => `${r.vendor_name}:${r.total_rejection_qty}`).join("|");
}

function IqcRejectionView({ data, loading, uid }) {
  const iqc = data?.iqc;
  const rows = Array.isArray(iqc?.rows) ? iqc.rows : [];
  const totalRec = iqc?.summary?.total_record_count ?? 0;
  const totalRej = iqc?.summary?.total_rejection_qty ?? 0;
  const from = iqc?.from ?? "";
  const to = iqc?.to ?? "";
  const rangeLine = from && to ? `${from} \u2192 ${to}` : "Dashboard date range";

  /* vendor aggregation for chart */
  const vendorMap = {};
  rows.forEach((r) => {
    const v = r.vendor_name || "Unknown";
    vendorMap[v] = (vendorMap[v] || 0) + (Number(r.total_rejection_qty) || 0);
  });
  const topVendors = Object.entries(vendorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const chartLabels = topVendors.map(([v]) => v);
  const chartValues = topVendors.map(([, q]) => q);
  const chartH = Math.max(140, chartLabels.length * 30 + 50);

  const setupChart = useCallback(
    (canvas) => {
      if (!chartLabels.length) return null;
      return new Chart(canvas, {
        type: "bar",
        data: {
          labels: chartLabels,
          datasets: [{
            label: "Rejection Qty by Vendor",
            data: chartValues,
            backgroundColor: chartLabels.map((_, i) => DOWNTIME_BAR_COLORS[i % DOWNTIME_BAR_COLORS.length]),
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...DT_TOOLTIP_CFG,
              callbacks: {
                label(ctx) {
                  const v = typeof ctx.parsed.x === "number" ? ctx.parsed.x : Number(ctx.raw) || 0;
                  return `${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })} qty`;
                },
              },
            },
          },
          scales: {
            x: { beginAtZero: true, grid: { color: "rgba(228,233,242,.6)" }, ticks: { color: "#94a3b8", font: { size: 10 } } },
            y: { grid: { display: false }, ticks: { color: "#64748b", font: { size: 10 }, maxRotation: 0, autoSkip: false } },
          },
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chartLabels.join(",")]
  );

  const rebuildToken = iqcChartToken(data);

  return (
    <div className="d3-iqc-view" key={uid}>
      {/* ── Header ── */}
      <div className="d3-iqc-hd">
        <div className="d3-iqc-hd__title">IQC — Incoming Quality Rejections</div>
        {/* <div className="d3-iqc-hd__sub">grn_mas · inspmas · inspdet · CustMast — {rangeLine}</div> */}
      </div>

      {/* ── Two big stat cards (matches D2 exactly) ── */}
      <div className="d3-iqc-stats">
        <div className="d3-iqc-stat d3-iqc-stat--red">
          <div className="d3-iqc-stat__icon">🔴</div>
          <div className="d3-iqc-stat__body">
            <div className="d3-iqc-stat__val">
              {loading ? "…" : totalRec.toLocaleString("en-IN")}
            </div>
            <div className="d3-iqc-stat__lbl">Total Records</div>
          </div>
        </div>
        <div className="d3-iqc-stat d3-iqc-stat--orange">
          <div className="d3-iqc-stat__icon">📊</div>
          <div className="d3-iqc-stat__body">
            <div className="d3-iqc-stat__val">
              {loading ? "…" : totalRej.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
            <div className="d3-iqc-stat__lbl">Total Rejection Qty</div>
          </div>
        </div>
      </div>

      {/* ── Chart: Top vendors by rejection qty ── */}
      {!loading && chartLabels.length > 0 && (
        <div className="d3-iqc-chart-card">
          <div className="d3-iqc-chart-title">Top Vendors by Rejection Qty</div>
          <div className="d3-iqc-chart-wrap" style={{ height: chartH, position: "relative" }}>
            <ChartJsCanvas setup={setupChart} height={chartH} rebuildToken={rebuildToken} />
          </div>
        </div>
      )}

      {!loading && !rows.length && (
        <p className="d3-iqc-empty">No IQC rejection lines in this date range.</p>
      )}
    </div>
  );
}

function IqcRejectionBottomTable({ data, loading, uid }) {
  const rows = Array.isArray(data?.iqc?.rows) ? data.iqc.rows : [];
  return (
    <div className="d3-cc-bot" key={uid}>
      <div className="d3-cc-bot__hd">IQC Rejection Lines</div>
      <div className="d3-cc-tbl-wrap" style={{ maxHeight: 300 }}>
        <table className="d3-cc-tbl" style={{ minWidth: 700 }}>
          <thead>
            <tr>
              <th>GRN Insp No</th>
              <th>GRN Insp Date</th>
              <th>Type</th>
              <th>Vendor / Supplier</th>
              <th>Material</th>
              <th>Qty Rejected</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="d3-cc-tbl__empty">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="d3-cc-tbl__empty">No IQC rejection lines in this range.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.grn_insp_no}-${i}`} className="d3-cc-tbl__tr">
                  <td className="d3-cc-tbl__id">{r.grn_insp_no || "—"}</td>
                  <td className="d3-cc-tbl__mono">{r.grn_insp_date || "—"}</td>
                  <td>
                    <span className="d3-cc-badge" style={{ background: "#f1f5f9", color: "#475569" }}>
                      {r.type || "—"}
                    </span>
                  </td>
                  <td className="d3-cc-tbl__bold">{r.vendor_name || "—"}</td>
                  <td className="d3-cc-tbl__narrow" title={r.material || ""}>{r.material || "—"}</td>
                  <td className="d3-iqc-tbl__qty">{(Number(r.total_rejection_qty) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Idle Time Summary ─────────────────────────────────────── */
function idleChartToken(data) {
  const accepted = data?.idle?.accepted;
  if (!Array.isArray(accepted) || !accepted.length) return "empty";
  return accepted.map((r) => `${r.reason ?? r.idle_reason}:${r.hours}`).slice(0, 15).join("|");
}

function IdleTimeView({ data, loading, uid }) {
  const idleData = data?.idle;
  const s = idleData?.summary ?? {};
  const accTotal = Number(s.accepted_hours) || 0;
  const naTotal = Number(s.non_accepted_hours) || 0;
  const grand = Number(s.total_idle_hours) || 0;
  const otherH = Math.max(0, Number(s.other_hours) || 0);
  const fmt = (n) => Number(n).toFixed(2);

  const accPctW = grand > 0 ? (accTotal / grand) * 100 : 0;
  const naPctW = grand > 0 ? (naTotal / grand) * 100 : 0;
  const otherPctW = grand > 0 ? (otherH / grand) * 100 : 0;
  const accPctStr = grand > 0 ? ((accTotal / grand) * 100).toFixed(0) : "0";
  const naPctStr = grand > 0 ? ((naTotal / grand) * 100).toFixed(0) : "0";
  const otherPctStr = grand > 0 ? ((otherH / grand) * 100).toFixed(0) : "0";

  /* bar chart: accepted idle by reason */
  const accRows = Array.isArray(idleData?.accepted) ? idleData.accepted : [];
  const chartLabels = accRows.slice(0, 10).map((r) => r.reason || r.idle_reason || "Unknown");
  const chartValues = accRows.slice(0, 10).map((r) => Number(r.hours) || 0);
  const chartH = Math.max(100, chartLabels.length * 30 + 50);

  const setupChart = useCallback(
    (canvas) => {
      if (!chartLabels.length) return null;
      return new Chart(canvas, {
        type: "bar",
        data: {
          labels: chartLabels,
          datasets: [{
            label: "Accepted Idle Hours by Reason",
            data: chartValues,
            backgroundColor: chartLabels.map((_, i) => DOWNTIME_BAR_COLORS[i % DOWNTIME_BAR_COLORS.length]),
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...DT_TOOLTIP_CFG,
              callbacks: {
                label(ctx) {
                  const v = typeof ctx.parsed.x === "number" ? ctx.parsed.x : Number(ctx.raw) || 0;
                  return ` ${v.toFixed(2)} h`;
                },
              },
            },
          },
          scales: {
            x: { beginAtZero: true, grid: { color: "rgba(228,233,242,.6)" }, ticks: { color: "#94a3b8", font: { size: 10 } } },
            y: { grid: { display: false }, ticks: { color: "#64748b", font: { size: 10 }, maxRotation: 0, autoSkip: false } },
          },
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chartLabels.join(",")]
  );
  const rebuildToken = idleChartToken(data);

  return (
    <div className="d3-idle-view" key={uid}>
      {/* Header */}
      <div className="d3-idle-hd">
        <div className="d3-idle-hd__title">Idle Time Summary</div>
        {/* <div className="d3-idle-hd__sub">
          Machine_IdleEntry · Prod_IdleEntry + ProductionEntry · conv_IdleEntry — hours from SUM(DATEDIFF minute ÷ 60).
          Accepted vs non-accepted from IdleReasons.IsAccept; other bucket for unmatched / NULL reasons.
        </div> */}
      </div>

      {/* 3 stat tiles */}
      <div className="d3-idle-grid">
        <div className="d3-idle-tile d3-idle-tile--acc">
          <div className="d3-idle-tile__dot" />
          <div className="d3-idle-tile__lbl">Accepted idle</div>
          <div className="d3-idle-tile__val">
            {loading ? "…" : <>{fmt(accTotal)}<span className="d3-idle-tile__unit">h</span></>}
          </div>
          <div className="d3-idle-tile__hint">IsAccept = 1</div>
        </div>
        <div className="d3-idle-tile d3-idle-tile--na">
          <div className="d3-idle-tile__dot d3-idle-tile__dot--na" />
          <div className="d3-idle-tile__lbl">Non-accepted idle</div>
          <div className="d3-idle-tile__val d3-idle-tile__val--na">
            {loading ? "…" : <>{fmt(naTotal)}<span className="d3-idle-tile__unit">h</span></>}
          </div>
          <div className="d3-idle-tile__hint">IsAccept = 0</div>
        </div>
        <div className="d3-idle-tile d3-idle-tile--all">
          <div className="d3-idle-tile__dot d3-idle-tile__dot--all" />
          <div className="d3-idle-tile__lbl">Total idle</div>
          <div className="d3-idle-tile__val d3-idle-tile__val--all">
            {loading ? "…" : <>{fmt(grand)}<span className="d3-idle-tile__unit">h</span></>}
          </div>
          <div className="d3-idle-tile__hint">All lines (SUM of minutes ÷ 60)</div>
        </div>
        {otherH > 0 && (
          <div className="d3-idle-tile d3-idle-tile--oth">
            <div className="d3-idle-tile__dot d3-idle-tile__dot--oth" />
            <div className="d3-idle-tile__lbl">Other</div>
            <div className="d3-idle-tile__val d3-idle-tile__val--oth">
              {loading ? "…" : <>{fmt(otherH)}<span className="d3-idle-tile__unit">h</span></>}
            </div>
            <div className="d3-idle-tile__hint">Unmatched reason / NULL</div>
          </div>
        )}
      </div>

      {/* Segmented proportion bar */}
      {!loading && grand > 0 && (
        <div className="d3-idle-split">
          <div className="d3-idle-split__bar">
            <div className="d3-idle-split__acc" style={{ width: `${accPctW}%` }} />
            <div className="d3-idle-split__na" style={{ width: `${naPctW}%` }} />
            {otherPctW > 0 && <div className="d3-idle-split__oth" style={{ width: `${otherPctW}%` }} />}
          </div>
          <div className="d3-idle-split__note">
            <span className="d3-idle-leg d3-idle-leg--acc">● Accepted {accPctStr}%</span>
            <span className="d3-idle-leg d3-idle-leg--na">● Non-accepted {naPctStr}%</span>
            {otherH > 0 && <span className="d3-idle-leg d3-idle-leg--oth">● Other {otherPctStr}%</span>}
          </div>
        </div>
      )}

      {/* Chart: accepted by reason */}
      {!loading && chartLabels.length > 0 && (
        <div className="d3-idle-chart-card">
          <div className="d3-idle-chart-title">Accepted Idle by Reason</div>
          <div style={{ height: chartH, position: "relative" }}>
            <ChartJsCanvas setup={setupChart} height={chartH} rebuildToken={rebuildToken} />
          </div>
        </div>
      )}

      {!loading && grand <= 0 && (
        <p className="d3-idle-empty">No idle hours recorded for this date range.</p>
      )}
    </div>
  );
}

/* ── OEE Efficiency Detail View ────────────────────────────────────────── */
function OeeEfficiencyView({ data, loading, uid, from, to }) {
  const [trendReport, setTrendReport] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState(null);

  const kpis = data.prod?.kpis ?? {};
  const oaEff = Number(kpis.oa_efficiency ?? 0);
  const targetOa = 80.0;
  const isTargetMet = oaEff >= targetOa;

  // Extract year and month for weekly trend from the "from" Date parameter
  useEffect(() => {
    if (!from) return;
    const dateObj = new Date(from);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth(); // 0-11 for JS, matches 0-11 for backend parse_dashboard1_period!

    const ctrl = new AbortController();
    setTrendLoading(true);
    setTrendError(null);
    const url = `/api/dashboard1/oa-efficiency-weekly/?year=${year}&month=${month}`;
    fetch(url, { credentials: "include", signal: ctrl.signal })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setTrendReport(json.data);
        } else {
          setTrendError(json.error || "Failed to load OEE weekly trend");
        }
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setTrendError(e.message || "Failed to load OEE weekly trend");
      })
      .finally(() => setTrendLoading(false));

    return () => ctrl.abort();
  }, [from]);

  // Chart setup using Chart.js line configuration
  const setupChart = useCallback(
    (canvas) => {
      const chartLabels = trendReport?.labels ?? ["W1", "W2", "W3", "W4", "W5"];
      const chartData = trendReport?.data ?? [];
      if (!chartData.length) return null;

      const n = chartLabels.length;
      return new Chart(canvas, {
        type: "line",
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: "Weekly OA Eff %",
              data: chartData,
              borderColor: "#1a56db",
              backgroundColor: "rgba(26, 86, 219, 0.05)",
              tension: 0.35,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: "#1a56db",
              pointBorderColor: "#fff",
              pointBorderWidth: 1.5,
              borderWidth: 2.5,
            },
            {
              label: "Target 80%",
              data: Array(n).fill(80),
              borderColor: "#ef4444",
              borderDash: [5, 5],
              fill: false,
              pointRadius: 0,
              borderWidth: 1.5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(26, 42, 94, 0.95)",
              titleColor: "#fff",
              bodyColor: "#fff",
              padding: 10,
              cornerRadius: 6,
              displayColors: false,
              callbacks: {
                label(ctx) {
                  return `Efficiency: ${Number(ctx.raw).toFixed(2)}%`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: "#64748b", font: { size: 10, weight: "500" } },
            },
            y: {
              min: 0,
              max: 100,
              ticks: {
                stepSize: 20,
                callback: (v) => `${v}%`,
                color: "#64748b",
                font: { size: 10, weight: "500" },
              },
              grid: { borderDash: [3, 3], color: "#e2e8f0" },
            },
          },
        },
      });
    },
    [trendReport]
  );

  const rebuildToken = trendReport ? trendReport.data.join(",") : "empty";

  // SVG Gauge calculations
  const radius = 45;
  const circ = 2 * Math.PI * radius;
  const strokeDashoffset = circ - (circ * Math.min(100, Math.max(0, oaEff))) / 100;

  // Gauge color based on value
  let gaugeColor = "#ef4444"; // red
  let statusText = "Attention Needed";
  let statusClass = "d3-oee-status--danger";
  let statusDesc = "Efficiency is below target. Review uptime bottlenecks or rejections below.";
  if (oaEff >= 80) {
    gaugeColor = "#10b981"; // green
    statusText = "Target Met";
    statusClass = "d3-oee-status--success";
    statusDesc = "Plant operating at optimal efficiency. High productivity level maintained.";
  } else if (oaEff >= 65) {
    gaugeColor = "#f59e0b"; // amber
    statusText = "Warning: Below Target";
    statusClass = "d3-oee-status--warning";
    statusDesc = "Slight underperformance. Review minor bottlenecks in downtime or quality rejections.";
  }

  // Quality Split helper
  const qs = qualitySplit(data);
  const idle = data.idle?.summary ?? {};
  const fi = data.fi ?? {};

  // Formatted values
  const formattedOutput = fmtNum(kpis.production_output);
  const formattedRejections = fmtNum(qs.rejection);
  const formattedRework = fmtNum(qs.rework);
  const formattedFirstPassYield = fi.first_pass_yield != null ? fmtPct(fi.first_pass_yield) : `${qs.pctOk}%`;

  return (
    <div className="d3-oee-view" key={uid}>
      <div className="d3-oee-header">
        <div className="d3-oee-header__accent" />
        <h3 className="d3-oee-header__title">OEE Efficiency Analysis</h3>
        <p className="d3-oee-header__subtitle">Operational Average (OAEFF) and component breakdowns</p>
      </div>

      <div className="d3-oee-dashboard">
        <div className="d3-oee-gauge-card">
          <div className="d3-oee-gauge-wrap">
            <svg viewBox="0 0 120 120" className="d3-oee-gauge-svg">
              <circle cx="60" cy="60" r={radius} className="d3-oee-gauge-bg" />
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="d3-oee-gauge-fill"
                style={{
                  stroke: gaugeColor,
                  strokeDasharray: circ,
                  strokeDashoffset: strokeDashoffset,
                }}
              />
            </svg>
            <div className="d3-oee-gauge-center">
              <span className="d3-oee-gauge-val">{oaEff.toFixed(2)}%</span>
              <span className="d3-oee-gauge-lbl">OAEFF</span>
            </div>
          </div>
          <div className="d3-oee-gauge-info">
            <span className={`d3-oee-status-badge ${statusClass}`}>{statusText}</span>
            <div className="d3-oee-target-row">
              <span>Target: <strong>80.00%</strong></span>
              <span className="d3-oee-target-sep">|</span>
              <span>Gap: <strong style={{ color: isTargetMet ? "#10b981" : "#ef4444" }}>{(oaEff - 80).toFixed(2)}%</strong></span>
            </div>
            <p className="d3-oee-status-desc">{statusDesc}</p>
          </div>
        </div>

        <div className="d3-oee-metrics-grid">
          <div className="d3-oee-card">
            <div className="d3-oee-card__hd">
              <span className="d3-oee-card__icon">⏱️</span>
              <span className="d3-oee-card__title">Availability</span>
            </div>
            <div className="d3-oee-card__body">
              <div className="d3-oee-metric-row">
                <span className="d3-oee-metric-lbl">Total Idle</span>
                <span className="d3-oee-metric-val">{fmtHours(idle.total_idle_hours)}</span>
              </div>
              <div className="d3-oee-metric-row">
                <span className="d3-oee-metric-lbl">Non-Accepted</span>
                <span className="d3-oee-metric-val d3-oee-metric-val--red">{fmtHours(idle.non_accepted_hours)}</span>
              </div>
              <div className="d3-oee-metric-row">
                <span className="d3-oee-metric-lbl">Accepted Idle</span>
                <span className="d3-oee-metric-val d3-oee-metric-val--green">{fmtHours(idle.accepted_hours)}</span>
              </div>
            </div>
          </div>

          <div className="d3-oee-card">
            <div className="d3-oee-card__hd">
              <span className="d3-oee-card__icon">📦</span>
              <span className="d3-oee-card__title">Performance</span>
            </div>
            <div className="d3-oee-card__body">
              <div className="d3-oee-metric-row">
                <span className="d3-oee-metric-lbl">Production</span>
                <span className="d3-oee-metric-val">{formattedOutput}</span>
              </div>
              <div className="d3-oee-metric-row">
                <span className="d3-oee-metric-lbl">Shifts</span>
                <span className="d3-oee-metric-val">{data.shifts?.shifts?.length ?? "—"}</span>
              </div>
              <div className="d3-oee-metric-row">
                <span className="d3-oee-metric-lbl">Active Period</span>
                <span className="d3-oee-metric-val" style={{ textTransform: "capitalize", fontSize: "11px", fontWeight: "600" }}>{data.prod?.from ? "Live Data" : "Current"}</span>
              </div>
            </div>
          </div>

          <div className="d3-oee-card">
            <div className="d3-oee-card__hd">
              <span className="d3-oee-card__icon">🎯</span>
              <span className="d3-oee-card__title">Quality Split</span>
            </div>
            <div className="d3-oee-card__body">
              <div className="d3-oee-metric-row">
                <span className="d3-oee-metric-lbl">Quality Rate</span>
                <span className="d3-oee-metric-val d3-oee-metric-val--green">{formattedFirstPassYield}</span>
              </div>
              <div className="d3-oee-metric-row">
                <span className="d3-oee-metric-lbl">Rejections</span>
                <span className="d3-oee-metric-val d3-oee-metric-val--red">{formattedRejections}</span>
              </div>
              <div className="d3-oee-metric-row">
                <span className="d3-oee-metric-lbl">Rework Qty</span>
                <span className="d3-oee-metric-val d3-oee-metric-val--orange">{formattedRework}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="d3-oee-trend-card">
          <div className="d3-oee-trend-card__hd">
            <span className="d3-oee-trend-card__icon">📈</span>
            <span className="d3-oee-trend-card__title">Weekly Efficiency Trend</span>
          </div>
          <div className="d3-oee-trend-chart-wrap">
            {trendLoading && <p className="d3-oee-trend-empty">Loading weekly trend…</p>}
            {trendError && !trendLoading && <p className="d3-oee-trend-empty d3-oee-trend-empty--error">{trendError}</p>}
            {!trendLoading && !trendError && (
              <div style={{ height: 160, position: "relative" }}>
                <ChartJsCanvas setup={setupChart} height={160} rebuildToken={rebuildToken} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── On-Time Delivery Trend — Charts.jsx OTD line chart (embedded) ─ */
function OtdTrendView({ loading, uid, from, to }) {
  const [report, setReport] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);

  useEffect(() => {
    if (!from || !to) {
      setReport(null);
      return;
    }
    const ctrl = new AbortController();
    setChartLoading(true);
    setChartError(null);
    const url = buildUrl("/api/otd-report/", from, to);
    fetch(url, { credentials: "include", signal: ctrl.signal })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok || json?.error) {
          setReport(null);
          setChartError(json?.error || "Failed to load OTD chart");
          return;
        }
        setReport(json);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setReport(null);
        setChartError(e.message || "Failed to load OTD chart");
      })
      .finally(() => setChartLoading(false));
    return () => ctrl.abort();
  }, [from, to]);

  const chartLabels = report?.labels ?? [];
  const chartData = report?.data ?? [];
  const fy = report?.fy ?? "";
  const reportFrom = report?.from ?? (from ? formatLocalYmd(from) : "");
  const reportTo = report?.to ?? (to ? formatLocalYmd(to) : "");
  const chartTitle = `On-Time Delivery Trend ${fy} (${reportFrom} → ${reportTo})`;
  const hasChart = chartLabels.length > 0;

  const setupChart = useCallback(
    (canvas) => {
      if (!chartLabels.length) return null;
      const n = chartLabels.length;
      return new Chart(canvas, {
        type: "line",
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: `OTD % Actual — ${fy}`,
              data: chartData,
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              tension: 0.4,
              fill: true,
              pointRadius: 3,
            },
            {
              label: `Target ${OTD_TARGET_PCT}%`,
              data: Array(n).fill(OTD_TARGET_PCT),
              borderColor: "#ef4444",
              backgroundColor: "transparent",
              borderDash: [6, 3],
              tension: 0,
              fill: false,
              pointRadius: 0,
            },
          ],
        },
        options: {
          ...OTD_LINE_CHART_BASE,
          plugins: {
            ...OTD_LINE_CHART_BASE.plugins,
            title: {
              display: true,
              text: chartTitle,
              font: { size: 10 },
              color: "#64748b",
              padding: { bottom: 8 },
            },
            tooltip: {
              callbacks: {
                label(ctx) {
                  const v = ctx.parsed.y;
                  if (v == null || Number.isNaN(v)) return `${ctx.dataset.label}: —`;
                  return `${ctx.dataset.label}: ${Number(v).toFixed(2)}`;
                },
              },
            },
          },
          scales: {
            ...OTD_LINE_CHART_BASE.scales,
            y: {
              ...OTD_LINE_CHART_BASE.scales.y,
              ticks: {
                ...OTD_LINE_CHART_BASE.scales.y.ticks,
                callback: (val) => `${val}%`,
              },
            },
          },
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chartLabels.join(","), chartData.join(","), fy, chartTitle]
  );

  const rebuildToken = otdReportChartToken(report);
  const chartBusy = loading || chartLoading;

  return (
    <div className="d3-otd-view" key={uid}>
      <div className="d3-otd-chart-panel">
        <div className="d3-otd-chart-panel__accent" />
        <div className="d3-otd-chart-panel__hd">
          <div className="d3-otd-chart-panel__tags">
            {/* <span className="d3-otd-tag d3-otd-tag--sales">Sales</span> */}
            {/* <span className="d3-otd-tag d3-otd-tag--sales">Line Chart</span> */}
          </div>
        </div>
        {/* <h3 className="d3-otd-chart-panel__title">On-Time Delivery Trend</h3> */}
        {/* <div className="d3-otd-chart-panel__date-row">
          <span className="d3-otd-date-chip">{rangeLabel}</span>
          {daysSel > 0 && <span className="d3-otd-date-badge">{daysSel}d</span>}
          {from && to && (
            <span className="d3-otd-days-txt">{daysSel} days selected</span>
          )}
        </div> */}
        <div
          className="d3-otd-canvas-wrap"
          style={{ opacity: chartBusy ? 0 : 1, transition: "opacity 0.3s" }}
        >
          {chartError && !chartBusy && (
            <p className="d3-otd-chart-empty">{chartError}</p>
          )}
          {!chartError && hasChart && !chartBusy && (
            <ChartJsCanvas setup={setupChart} height={420} rebuildToken={rebuildToken} />
          )}
          {!chartError && !hasChart && !chartBusy && (
            <p className="d3-otd-chart-empty">No OTD data for this date range.</p>
          )}
        </div>
        {chartBusy && <D3ChartLoader label="Loading On-Time Delivery…" height={380} />}
      </div>
    </div>
  );
}

/* ── Production Output Detail View (Sky Blue Rich UI) ────────────────────── */
function ProductionOutputView({ data, loading, uid }) {
  const kpis = data?.prod?.kpis ?? {};
  const outputQty = Number(kpis.production_output ?? 0);
  const formattedOutput = Math.round(outputQty).toLocaleString("en-IN");

  return (
    <div className="d3-prodout-view" key={uid}>
      <div className="d3-prodout-card">
        <div className="d3-prodout-card__accent" />
        <div className="d3-prodout-hd">
          <div className="d3-prodout-hd__left">
            <div className="d3-prodout-hd__icon">📦</div>
            <div>
              <div className="d3-prodout-hd__title">Production Output</div>
              {/* <div className="d3-prodout-hd__sub">Total completed and scanned production units</div> */}
            </div>
          </div>
          <span className="d3-prodout-chip d3-prodout-chip--active">Active Log</span>
        </div>

        <div className="d3-prodout-body">
          <div className="d3-prodout-display">
            <div className="d3-prodout-metric">
              <span className="d3-prodout-metric__label">Completed Output</span>
              <span className="d3-prodout-metric__value">{loading ? "..." : formattedOutput}</span>
            </div>

            <div className="d3-prodout-visual">
              <svg className="d3-prodout-gauge" viewBox="0 0 120 120">
                <circle className="d3-prodout-gauge__bg" cx="60" cy="60" r="50" />
                <circle className="d3-prodout-gauge__fill" cx="60" cy="60" r="50" />
                <g className="d3-prodout-gauge__content">
                  <text className="d3-prodout-gauge__icon" x="60" y="55">⚙️</text>
                  <text className="d3-prodout-gauge__status" x="60" y="80">RUNNING</text>
                </g>
              </svg>
            </div>
          </div>

          <div className="d3-prodout-highlight">
            <div className="d3-prodout-highlight__item">
              <span className="d3-prodout-highlight__bullet">●</span>
              <span><strong>Total Completed Output:</strong> Shows the grand total of finished goods and components successfully logged and verified from live shopfloor records.</span>
            </div>
            <div className="d3-prodout-highlight__item">
              <span className="d3-prodout-highlight__bullet">●</span>
              <span><strong>ERP Integrated:</strong> Real-time production records synced dynamically from active shifts and machinery logs.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Final Inspection OK Quantity Detail View (Emerald Rich UI) ────────────── */
function FinalInspectionOkView({ data, loading, uid }) {
  const fi = data?.fi;
  const okQty = Number(fi?.total_ok_qty ?? 0);
  const formattedOk = Math.round(okQty).toLocaleString("en-IN");

  return (
    <div className="d3-fiok-view" key={uid}>
      <div className="d3-fiok-card">
        <div className="d3-fiok-card__accent" />
        <div className="d3-fiok-hd">
          <div className="d3-fiok-hd__left">
            <div className="d3-fiok-hd__icon">✨</div>
            <div>
              <div className="d3-fiok-hd__title">Final Quality OK Quantity</div>
              {/* <div className="d3-fiok-hd__sub">Finished goods meeting 100% QA compliance standards</div> */}
            </div>
          </div>
          <span className="d3-fiok-chip d3-fiok-chip--active">QA Approved</span>
        </div>

        <div className="d3-fiok-body">
          <div className="d3-fiok-display">
            <div className="d3-fiok-metric">
              <span className="d3-fiok-metric__label">Approved Quantity</span>
              <span className="d3-fiok-metric__value">{loading ? "..." : formattedOk}</span>
              {/* <span className="d3-fiok-metric__unit">compliant units</span> */}
            </div>

            <div className="d3-fiok-visual">
              <svg className="d3-fiok-gauge" viewBox="0 0 120 120">
                <circle className="d3-fiok-gauge__bg" cx="60" cy="60" r="50" />
                <circle className="d3-fiok-gauge__fill" cx="60" cy="60" r="50" />
                <g className="d3-fiok-gauge__content">
                  <text className="d3-fiok-gauge__icon" x="60" y="55">✅</text>
                  <text className="d3-fiok-gauge__status" x="60" y="80">OK</text>
                </g>
              </svg>
            </div>
          </div>

          <div className="d3-fiok-highlight">
            <div className="d3-fiok-highlight__item">
              <span className="d3-fiok-highlight__bullet">●</span>
              <span><strong>Guaranteed Quality:</strong> Represents only parts that successfully passed all dimensional, visual, and performance checks.</span>
            </div>
            <div className="d3-fiok-highlight__item">
              <span className="d3-fiok-highlight__bullet">●</span>
              <span><strong>Ready for Dispatch:</strong> All compliant units are instantly logged in ERP stock and available for delivery scheduling.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Overall Operator Efficiency Monthwise Detail View ─────────────────────── */
function OperatorEfficiencyView({ loading, uid, from, to }) {
  const [report, setReport] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);

  useEffect(() => {
    if (!from || !to) {
      setReport(null);
      return;
    }
    const ctrl = new AbortController();
    setChartLoading(true);
    setChartError(null);
    const url = buildUrl("/api/production/overall-operator-efficiency/", from, to);
    fetch(url, { credentials: "include", signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Load failed (${res.status})`);
        }
        return res.json();
      })
      .then((json) => {
        if (json.error) {
          throw new Error(json.error);
        }
        setReport(json);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setReport(null);
        setChartError(e.message || "Failed to load Operator Efficiency chart");
      })
      .finally(() => setChartLoading(false));

    return () => ctrl.abort();
  }, [from, to]);

  const chartLabels = report?.labels ?? [];
  const chartData = report?.data ?? [];
  const fy = report?.fy ?? "";
  const reportFrom = report?.from ?? (from ? formatLocalYmd(from) : "");
  const reportTo = report?.to ?? (to ? formatLocalYmd(to) : "");
  const chartTitle = `Overall Operator Efficiency ${fy} (${reportFrom} → ${reportTo})`;
  const hasChart = chartLabels.length > 0;

  const setupChart = useCallback(
    (canvas) => {
      if (!chartLabels.length) return null;
      return new Chart(canvas, {
        type: "bar",
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: `Overall Efficiency % — ${fy}`,
              data: chartData,
              backgroundColor: "#06b6d4",
              hoverBackgroundColor: "#0891b2",
              borderRadius: 5,
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: chartTitle,
              font: { size: 10, weight: "700" },
              color: "#64748b",
              padding: { bottom: 8 },
            },
            tooltip: {
              backgroundColor: "rgba(26, 42, 94, 0.95)",
              titleColor: "#fff",
              bodyColor: "#fff",
              padding: 10,
              cornerRadius: 6,
              displayColors: false,
              callbacks: {
                label(ctx) {
                  const v = ctx.parsed.y;
                  if (v == null || Number.isNaN(v)) return "Efficiency: —";
                  return `Efficiency: ${Number(v).toFixed(2)}%`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: "#64748b", font: { size: 10, weight: "500" } },
            },
            y: {
              min: 0,
              max: 100,
              ticks: {
                stepSize: 20,
                callback: (val) => `${val}%`,
                color: "#64748b",
                font: { size: 10, weight: "500" },
              },
              grid: { borderDash: [3, 3], color: "#e2e8f0" },
            },
          },
        },
      });
    },
    [chartLabels, chartData, fy, chartTitle]
  );

  const rebuildToken = report ? `${report.labels.join(",")}|${report.data.join(",")}` : "empty";
  const chartBusy = loading || chartLoading;

  return (
    <div className="d3-opeff-view" key={uid}>
      <div className="d3-opeff-chart-panel">
        <div className="d3-opeff-chart-panel__accent" />
        <div className="d3-opeff-chart-panel__hd">
          <div className="d3-opeff-chart-panel__title-group">
            <h3 className="d3-opeff-chart-panel__title">Operator Efficiency Analysis</h3>
            {/* <p className="d3-opeff-chart-panel__subtitle">Overall Operator Efficiency Monthwise</p> */}
          </div>
        </div>
        <div
          className="d3-opeff-canvas-wrap"
          style={{ opacity: chartBusy ? 0 : 1, transition: "opacity 0.3s" }}
        >
          {chartError && !chartBusy && (
            <p className="d3-opeff-chart-empty">{chartError}</p>
          )}
          {!chartError && hasChart && !chartBusy && (
            <ChartJsCanvas setup={setupChart} height={300} rebuildToken={rebuildToken} />
          )}
          {!chartError && !hasChart && !chartBusy && (
            <p className="d3-opeff-chart-empty">No Operator Efficiency data for this date range.</p>
          )}
        </div>
        {chartBusy && <D3ChartLoader label="Loading Operator Efficiency…" height={260} />}
      </div>
    </div>
  );
}

/* ── Purchase Order Status ─────────────────────────────────── */
const fmtInr = (v) => {
  const n = Number(v);
  if (!n || Number.isNaN(n)) return "₹0";
  return "₹" + Math.round(n).toLocaleString("en-IN");
};

function poChartToken(data) {
  const rows = data?.po?.rows;
  if (!Array.isArray(rows) || !rows.length) return "empty";
  return rows.map((r) => `${r.po_type}:${r.value}`).slice(0, 20).join("|");
}

function PurchaseOrderView({ data, loading, uid }) {
  const po = data?.po;
  const s = po?.summary ?? {};
  const rows = Array.isArray(po?.rows) ? po.rows : [];
  const from = po?.from ?? ""; const to = po?.to ?? "";
  const rangeLine = from && to ? `${from} → ${to}` : "Dashboard date range";

  const TILES = [
    { label: "Total POs", val: s.total_pos ?? 0, icon: "📦", c: "#1a56db", bg: "#dbeafe", isMoney: false },
    { label: "Approved", val: s.approved ?? 0, icon: "✅", c: "#0ea5e9", bg: "#e0f2fe", isMoney: false },
    { label: "Approval Pending", val: s.pending_approval ?? 0, icon: "⏳", c: "#f59e0b", bg: "#fef3c7", isMoney: false },
    { label: "GRN Done", val: s.grn_done ?? 0, icon: "🏭", c: "#10b981", bg: "#d1fae5", isMoney: false },
    { label: "GRN Pending", val: s.grn_pending ?? 0, icon: "🔄", c: "#ef4444", bg: "#fee2e2", isMoney: false },
    { label: "Total PO Value", val: s.total_po_value ?? 0, icon: "💰", c: "#1a56db", bg: "#dbeafe", isMoney: true },
    { label: "Total GRN Value", val: s.total_grn_value ?? 0, icon: "📋", c: "#10b981", bg: "#d1fae5", isMoney: true },
  ];

  /* bar chart: value by po_type */
  const typeMap = {};
  rows.forEach((r) => {
    const t = r.po_type || "Unknown";
    typeMap[t] = (typeMap[t] || 0) + (Number(r.value) || 0);
  });
  const typeEntries = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const chartLabels = typeEntries.map(([t]) => t);
  const chartValues = typeEntries.map(([, v]) => v);
  const chartH = Math.max(100, chartLabels.length * 32 + 50);

  const setupChart = useCallback(
    (canvas) => {
      if (!chartLabels.length) return null;
      return new Chart(canvas, {
        type: "bar",
        data: {
          labels: chartLabels,
          datasets: [{
            label: "PO Value by Type",
            data: chartValues,
            backgroundColor: chartLabels.map((_, i) => DOWNTIME_BAR_COLORS[i % DOWNTIME_BAR_COLORS.length]),
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...DT_TOOLTIP_CFG,
              callbacks: {
                label(ctx) {
                  const v = typeof ctx.parsed.x === "number" ? ctx.parsed.x : Number(ctx.raw) || 0;
                  return ` ${fmtInr(v)}`;
                },
              },
            },
          },
          scales: {
            x: { beginAtZero: true, grid: { color: "rgba(228,233,242,.6)" }, ticks: { color: "#94a3b8", font: { size: 10 }, callback: (v) => fmtInr(v) } },
            y: { grid: { display: false }, ticks: { color: "#64748b", font: { size: 10 }, maxRotation: 0, autoSkip: false } },
          },
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chartLabels.join(",")]
  );
  const rebuildToken = poChartToken(data);

  return (
    <div className="d3-po-view" key={uid}>
      {/* Header */}
      <div className="d3-po-hd">
        <div className="d3-po-hd__title">🛒 Purchase Order Status</div>
        {/* <div className="d3-po-hd__sub">POmas · POdet · grn_mas · grn_det · CustMast — {rangeLine}</div> */}
      </div>

      {/* Row 1: Count tiles (5 across) */}
      <div className="d3-po-tiles-count">
        {TILES.filter((t) => !t.isMoney).map((t) => (
          <div key={t.label} className="d3-po-tile" style={{ background: t.bg, borderColor: `${t.c}30` }}>
            <div className="d3-po-tile__icon">{t.icon}</div>
            <div className="d3-po-tile__val" style={{ color: t.c }}>
              {loading ? "…" : Number(t.val).toLocaleString("en-IN")}
            </div>
            <div className="d3-po-tile__lbl">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Row 2: Money tiles (2 across, wider) */}
      <div className="d3-po-tiles-money">
        {TILES.filter((t) => t.isMoney).map((t) => (
          <div key={t.label} className="d3-po-tile" style={{ background: t.bg, borderColor: `${t.c}30` }}>
            <div className="d3-po-tile__icon">{t.icon}</div>
            <div className="d3-po-tile__val" style={{ color: t.c }}>
              {loading ? "…" : fmtInr(t.val)}
            </div>
            <div className="d3-po-tile__lbl">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {!loading && chartLabels.length > 0 && (
        <div className="d3-po-chart-card">
          <div className="d3-po-chart-title">PO Value by Type</div>
          <div style={{ height: chartH, position: "relative" }}>
            <ChartJsCanvas setup={setupChart} height={chartH} rebuildToken={rebuildToken} />
          </div>
        </div>
      )}

      {!loading && !rows.length && (
        <p className="d3-po-empty">No PO lines in this date range.</p>
      )}
    </div>
  );
}

function PurchaseOrderBottomTable({ data, loading, uid }) {
  const rows = Array.isArray(data?.po?.rows) ? data.po.rows : [];
  const fmtDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };
  return (
    <div className="d3-cc-bot" key={uid}>
      <div className="d3-cc-bot__hd">Purchase Orders</div>
      <div className="d3-cc-tbl-wrap" style={{ maxHeight: 300 }}>
        <table className="d3-cc-tbl" style={{ minWidth: 820 }}>
          <thead>
            <tr>
              <th>PO Number</th>
              <th>PO Type</th>
              <th>Vendor / Supplier</th>
              <th>Material</th>
              <th>Qty</th>
              <th>Value</th>
              <th>PO Date</th>
              <th>GRN No</th>
              <th>GRN Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="d3-cc-tbl__empty" style={{ padding: 0 }}><D3TableLoader rows={4} cols={9} /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="d3-cc-tbl__empty">No PO lines in this range.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.po_number}-${i}`} className="d3-cc-tbl__tr">
                  <td className="d3-cc-tbl__id">{r.po_number || "—"}</td>
                  <td><span className="d3-cc-badge" style={{ background: "#f1f5f9", color: "#475569" }}>{r.po_type || "—"}</span></td>
                  <td style={{ fontWeight: 600, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.vendor_name || ""}>{(r.vendor_name || "").trim() || "—"}</td>
                  <td className="d3-cc-tbl__narrow" title={r.material || ""}>{r.material || "—"}</td>
                  <td className="d3-cc-tbl__mono">{r.po_qty || "—"}</td>
                  <td className="d3-cc-tbl__mono" style={{ color: "#1a56db", fontWeight: 700 }}>{fmtInr(r.value)}</td>
                  <td className="d3-cc-tbl__mono">{fmtDate(r.po_date)}</td>
                  <td className="d3-cc-tbl__id">{(r.grn_no || "").trim() || "—"}</td>
                  <td className="d3-cc-tbl__mono">{fmtDate(r.grn_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── GRN Pending Pipeline ──────────────────────────────────── */
function grnChartToken(data) {
  const rows = data?.grn?.rows;
  if (!Array.isArray(rows) || !rows.length) return "empty";
  return rows.map((r) => `${r.type_ || ""}:${r.qty_ || ""}`).join("|");
}

function GrnPipelineView({ data, loading, uid }) {
  const grn = data?.grn;
  const rows = Array.isArray(grn?.rows) ? grn.rows : [];
  const s = grn?.summary;
  const totalCount = typeof s?.total_record_count === "number" ? s.total_record_count : 0;
  const totalQty = typeof s?.total_qty === "number" ? s.total_qty : 0;
  const totalQtyFmt = totalQty.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const from = grn?.from ?? "";
  const to = grn?.to ?? "";
  const rangeLine = from && to ? `${from} \u2192 ${to}` : "Dashboard date range";

  const typeMap = {};
  rows.forEach((r) => {
    const t = r.type_ || r.type || "Unknown";
    const numMatch = String(r.qty_ || r.qty || "0").match(/[-\d.]+/);
    const num = numMatch ? parseFloat(numMatch[0]) : 0;
    typeMap[t] = (typeMap[t] || 0) + (isNaN(num) ? 0 : num);
  });
  const typeEntries = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const chartLabels = typeEntries.map(([t]) => t);
  const chartValues = typeEntries.map(([, q]) => q);
  const chartH = Math.max(120, chartLabels.length * 32 + 50);

  const setupChart = useCallback(
    (canvas) => {
      if (!chartLabels.length) return null;
      return new Chart(canvas, {
        type: "bar",
        data: {
          labels: chartLabels,
          datasets: [{
            label: "Pending Qty by GRN Type",
            data: chartValues,
            backgroundColor: chartLabels.map((_, i) => DOWNTIME_BAR_COLORS[i % DOWNTIME_BAR_COLORS.length]),
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...DT_TOOLTIP_CFG,
              callbacks: {
                label(ctx) {
                  const v = typeof ctx.parsed.x === "number" ? ctx.parsed.x : Number(ctx.raw) || 0;
                  return `${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })} qty`;
                },
              },
            },
          },
          scales: {
            x: { beginAtZero: true, grid: { color: "rgba(228,233,242,.6)" }, ticks: { color: "#94a3b8", font: { size: 10 } } },
            y: { grid: { display: false }, ticks: { color: "#64748b", font: { size: 10 }, maxRotation: 0, autoSkip: false } },
          },
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chartLabels.join(",")]
  );

  const rebuildToken = grnChartToken(data);

  return (
    <div className="d3-grn-view" key={uid}>
      <div className="d3-grn-hd">
        <div className="d3-grn-hd__title">GRN Pending Pipeline (Quick View)</div>
        <div className="d3-grn-hd__sub">
          grn_mas · grn_det — pending inspection (insp = 0), deleted = 0 — {rangeLine}
        </div>
      </div>

      <div className="d3-grn-stats">
        <div className="d3-grn-stat d3-grn-stat--blue">
          <div className="d3-grn-stat__icon">📋</div>
          <div className="d3-grn-stat__body">
            <div className="d3-grn-stat__val">{loading ? "…" : totalCount.toLocaleString("en-IN")}</div>
            <div className="d3-grn-stat__lbl">Total Records</div>
          </div>
        </div>
        <div className="d3-grn-stat d3-grn-stat--amber">
          <div className="d3-grn-stat__icon">📦</div>
          <div className="d3-grn-stat__body">
            <div className="d3-grn-stat__val">{loading ? "…" : totalQtyFmt}</div>
            <div className="d3-grn-stat__lbl">Total Qty</div>
          </div>
        </div>
      </div>

      {!loading && chartLabels.length > 0 && (
        <div className="d3-grn-chart-card">
          <div className="d3-grn-chart-title">Pending Qty by GRN Type</div>
          <div className="d3-grn-chart-wrap" style={{ height: chartH, position: "relative" }}>
            <ChartJsCanvas setup={setupChart} height={chartH} rebuildToken={rebuildToken} />
          </div>
        </div>
      )}

      {!loading && !rows.length && (
        <p className="d3-grn-empty">No pending GRN lines in this date range.</p>
      )}
    </div>
  );
}

function GrnPipelineBottomTable({ data, loading, uid }) {
  const rows = Array.isArray(data?.grn?.rows) ? data.grn.rows : [];
  return (
    <div className="d3-cc-bot" key={uid}>
      <div className="d3-cc-bot__hd">GRN Pending Lines</div>
      <div className="d3-cc-tbl-wrap" style={{ maxHeight: 300 }}>
        <table className="d3-cc-tbl" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th>GRN No</th>
              <th>GRN Date</th>
              <th>Type</th>
              <th>Material</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="d3-cc-tbl__empty" style={{ padding: 0 }}><D3TableLoader rows={4} cols={5} /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="d3-cc-tbl__empty">No pending GRN lines in this range.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.grn_no}-${i}`} className="d3-cc-tbl__tr">
                  <td className="d3-cc-tbl__id">{r.grn_no || "—"}</td>
                  <td className="d3-cc-tbl__mono">{r.grn_date || "—"}</td>
                  <td>
                    <span className="d3-cc-badge" style={{ background: "#f1f5f9", color: "#475569" }}>
                      {r.type_ || r.type || "—"}
                    </span>
                  </td>
                  <td className="d3-cc-tbl__narrow" title={r.material_ || r.material || ""}>
                    {r.material_ || r.material || "—"}
                  </td>
                  <td className="d3-cc-tbl__mono">{r.qty_ || r.qty || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Inspection View (shared: injob / inter / final) ─────── */
function InspBarTrack({ pct, targetPct, fill }) {
  const clampedPct = Math.min(100, Math.max(0, Number(pct) || 0));
  const targetX = Math.min(100, Math.max(0, Number(targetPct) || 0));
  return (
    <div className="d3-insp-bar-track">
      <div className="d3-insp-bar-fill" style={{ width: `${clampedPct}%`, background: fill }} />
      <div className="d3-insp-bar-target" style={{ left: `${targetX}%` }} />
    </div>
  );
}

function InspectionView({ type, data, loading, uid }) {
  const pctLabel = (v) => (v == null || Number.isNaN(Number(v)) ? "\u2014" : `${Number(v).toFixed(1)}%`);

  const injob = data?.injob;
  const inter = data?.inter;
  const fi = data?.fi;
  const finalOrg = data?.finalOrg;

  let icon, title, sub, totalRej, totalRwk, totalQty, rejPct, rwkPct, chipLabel, chipOk, fpy, footer;
  const TARGET_REJ = 2;

  if (type === "injob_inspection") {
    icon = "\ud83d\udccb"; title = "Job Order Inspection";
    const inspCount = Number(injob?.inspection_master_count ?? 0);
    // sub = `InJob_Mas.inspdate \u00b7 InJob_Det (matrej + macrej \u00b7 rwqty)${inspCount > 0 ? ` \u00b7 ${inspCount} inspections` : ""}`;
    totalRej = Number(injob?.total_rejection ?? 0);
    totalRwk = Number(injob?.total_rework ?? 0);
    totalQty = Number(injob?.total_qty_basis ?? 0);
    rejPct = injob?.rejection_pct != null && injob.rejection_pct !== "" ? Number(injob.rejection_pct) : totalQty > 0 ? (totalRej / totalQty) * 100 : null;
    rwkPct = injob?.rework_pct != null && injob.rework_pct !== "" ? Number(injob.rework_pct) : totalQty > 0 ? (totalRwk / totalQty) * 100 : null;
    const aboveTarget = rejPct != null && rejPct > TARGET_REJ;
    chipOk = !aboveTarget; chipLabel = loading ? "Loading\u2026" : rejPct == null ? "No % basis" : aboveTarget ? "Above target" : "On target";
    footer = totalQty > 0 ? `Detail \u03a3${injob?.qty_basis_column ? ` (${injob.qty_basis_column})` : ""}: ${Math.round(totalQty).toLocaleString()} \u00b7 Target: ${TARGET_REJ}%` : `Target: ${TARGET_REJ}%`;
  } else if (type === "inter_inspection") {
    icon = "\u2699\ufe0f"; title = "Intermediate Inspection";
    const rowCount = Number(inter?.row_count ?? 0);
    // sub = `InterInspectionEntry \u00b7 rejqty + matrejqty \u00b7 rwqty${rowCount > 0 ? ` \u00b7 ${rowCount.toLocaleString()} rows` : ""}`;
    totalRej = Number(inter?.total_rejection ?? 0);
    totalRwk = Number(inter?.total_rework ?? 0);
    totalQty = Number(inter?.total_qty_basis ?? 0);
    rejPct = inter?.rejection_pct != null && inter.rejection_pct !== "" ? Number(inter.rejection_pct) : totalQty > 0 ? (totalRej / totalQty) * 100 : null;
    rwkPct = inter?.rework_pct != null && inter.rework_pct !== "" ? Number(inter.rework_pct) : totalQty > 0 ? (totalRwk / totalQty) * 100 : null;
    const elevated = rejPct != null && rejPct > 10;
    const aboveTarget = rejPct != null && rejPct > TARGET_REJ;
    chipOk = !elevated && !aboveTarget; chipLabel = loading ? "Loading\u2026" : elevated ? "Rej >10%" : rejPct == null ? "No % basis" : aboveTarget ? "Above target" : "On target";
    footer = totalQty > 0 ? `\u03a3${inter?.qty_basis_column ? ` (${inter.qty_basis_column})` : ""}: ${Math.round(totalQty).toLocaleString()} \u00b7 Target: ${TARGET_REJ}%` : `Target: ${TARGET_REJ}%`;
  } else {
    icon = "\u2705"; title = "Final Inspection";
    const inspCount = Number(fi?.inspection_count ?? 0);
    // sub = `FinalInspectionEntry \u00b7 FinalInspRejectionEntryOrg \u00b7 FinalInspReworkEntryOrg${inspCount > 0 ? ` \u00b7 ${inspCount.toLocaleString()} inspections` : ""}`;
    totalRej = Number(finalOrg?.total_rejection ?? 0);
    totalRwk = Number(finalOrg?.total_rework ?? 0);
    const totalInsp = Number(fi?.total_qty ?? 0);
    const totalOk = Number(fi?.total_ok_qty ?? 0);
    totalQty = totalInsp;
    rejPct = totalInsp > 0 ? (totalRej / totalInsp) * 100 : null;
    rwkPct = totalInsp > 0 ? (totalRwk / totalInsp) * 100 : null;
    fpy = fi?.first_pass_yield != null && fi.first_pass_yield !== "" ? Number(fi.first_pass_yield) : totalInsp > 0 ? (totalOk / totalInsp) * 100 : null;
    chipOk = fpy != null && fpy >= 98; chipLabel = loading ? "Loading\u2026" : fpy == null ? "FPY \u2014" : `FPY ${fpy.toFixed(1)}%`;
    footer = loading && !fi ? "OK Qty / Total: \u2026" : `OK Qty: ${Math.round(totalOk).toLocaleString()} \u00b7 Total: ${Math.round(totalInsp).toLocaleString()} inspected \u00b7 Target FPY: 98%`;
  }

  const rwkColor = type === "final_inspection" ? "#16a34a" : "#ea580c";
  const rwkFill = type === "final_inspection" ? "#22c55e" : "#f97316";

  return (
    <div className="d3-insp-view" key={uid}>
      <div className="d3-insp-hd">
        <div className="d3-insp-hd__left">
          <div className="d3-insp-hd__icon">{icon}</div>
          <div>
            <div className="d3-insp-hd__title">{title}</div>
            <div className="d3-insp-hd__sub">{sub}</div>
          </div>
        </div>
        <span className={`d3-insp-chip ${chipOk ? "d3-insp-chip--ok" : "d3-insp-chip--warn"}`}>{chipLabel}</span>
      </div>

      <div className="d3-insp-body">
        <div className="d3-insp-col">
          <div className="d3-insp-metric-lbl">Rejection</div>
          <div className="d3-insp-metric-pcs" style={{ color: "#ef4444" }}>
            {loading ? "\u2026" : Math.round(totalRej).toLocaleString()} <span>pcs</span>
          </div>
          <div className="d3-insp-bar-row">
            <InspBarTrack pct={rejPct ?? 0} targetPct={2} fill="#ef4444" />
            <span className="d3-insp-bar-pct" style={{ color: "#ef4444" }}>{pctLabel(rejPct)}</span>
          </div>
        </div>
        <div className="d3-insp-vdiv" />
        <div className="d3-insp-col">
          <div className="d3-insp-metric-lbl">Rework</div>
          <div className="d3-insp-metric-pcs" style={{ color: rwkColor }}>
            {loading ? "\u2026" : Math.round(totalRwk).toLocaleString()} <span>pcs</span>
          </div>
          <div className="d3-insp-bar-row">
            <InspBarTrack pct={rwkPct ?? 0} targetPct={type === "final_inspection" ? 2 : 1.5} fill={rwkFill} />
            <span className="d3-insp-bar-pct" style={{ color: rwkColor }}>{pctLabel(rwkPct)}</span>
          </div>
        </div>
      </div>

      {/* ── Stacked proportion bar ── */}
      {!loading && (totalRej > 0 || totalRwk > 0) && (() => {
        const rejV = Math.round(totalRej);
        const rwkV = Math.round(totalRwk);
        const total = rejV + rwkV || 1;
        const rP = (rejV / total * 100).toFixed(1);
        const wP = (rwkV / total * 100).toFixed(1);
        return (
          <div className="d3-insp-viz">
            <div className="d3-insp-viz__label">Rejection vs Rework</div>
            <div className="d3-insp-viz__bar">
              {rejV > 0 && (
                <div className="d3-insp-viz__seg d3-insp-viz__seg--rej" style={{ width: `${rP}%` }}>
                  <span className="d3-insp-viz__seg-tip">{rP}%</span>
                </div>
              )}
              {rwkV > 0 && (
                <div className="d3-insp-viz__seg d3-insp-viz__seg--rwk" style={{ width: `${wP}%`, background: rwkFill }}>
                  <span className="d3-insp-viz__seg-tip">{wP}%</span>
                </div>
              )}
            </div>
            <div className="d3-insp-viz__legend">
              <span className="d3-insp-viz__dot" style={{ background: "#ef4444" }} />
              <span className="d3-insp-viz__leg-lbl">Rejection {rejV.toLocaleString()} pcs</span>
              <span className="d3-insp-viz__dot" style={{ background: rwkFill }} />
              <span className="d3-insp-viz__leg-lbl">Rework {rwkV.toLocaleString()} pcs</span>
            </div>
          </div>
        );
      })()}

      <div className="d3-insp-footer">
        <span className="d3-insp-footer-stat">{footer}</span>
        <span className={`d3-insp-chip d3-insp-chip--footer ${chipOk ? "d3-insp-chip--ok" : "d3-insp-chip--warn"}`}>
          {loading ? "\u2026" : type === "final_inspection"
            ? (fpy == null ? "\u2014" : chipOk ? "\u2713 FPY on target" : "\u26a0 FPY below target")
            : (chipOk ? "\u2713 On target" : "\u2717 Above target")}
        </span>
      </div>
    </div>
  );
}

/* ── Charts (same as original UI) ─────────────────────────── */
function Sparkline({ data, color }) {
  const W = 100, H = 32;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * (H - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="d3-spark">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LineChart({ data, uid }) {
  if (!data?.xLabels?.length) return <p className="d3-panel__hint">No trend data.</p>;
  const W = 480, H = 160, pL = 36, pB = 28, pT = 10, pR = 12;
  const cW = W - pL - pR, cH = H - pB - pT;
  const allVals = data.series.flatMap((s) => s.data);
  const minV = Math.min(...allVals, 0) - 5;
  const maxV = Math.max(...allVals, 100) + 5;
  const toX = (i) => pL + (i / Math.max(data.xLabels.length - 1, 1)) * cW;
  const toY = (v) => pT + cH - ((v - minV) / (maxV - minV || 1)) * cH;
  const mkPath = (pts) => pts.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="d3-line-chart" key={uid}>
      {data.xLabels.map((l, i) => (
        <text key={l + i} x={toX(i)} y={H - 5} textAnchor="middle" fontSize="9" fill="#94a3b8">{l}</text>
      ))}
      {data.series.map((s) => (
        <path key={s.name} d={mkPath(s.data)} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" />
      ))}
    </svg>
  );
}

function BarChart({ bars, uid, raw = false }) {
  if (!bars?.length) return <p className="d3-panel__hint">No chart data.</p>;
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="d3-bar-chart" key={uid}>
      {bars.map((b, i) => (
        <div key={b.label} className="d3-bc-row" style={{ "--bc-delay": `${i * 55}ms` }}>
          <span className="d3-bc-label">{b.label}</span>
          <div className="d3-bc-track">
            <div className="d3-bc-fill" style={{ "--bc-w": `${(b.value / max) * 100}%`, background: b.color }}>
              <span className="d3-bc-val">{raw ? (b.display ?? b.value) : `${b.value}%`}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, uid }) {
  const total = segments.reduce((s, g) => s + g.value, 0) || 1;
  const r = 50, cx = 68, cy = 68, sw = 16;
  const circ = 2 * Math.PI * r;
  let off = 0;
  const slices = segments.map((seg) => {
    const dash = (seg.value / total) * circ;
    const s = { ...seg, dash, gap: circ - dash, offset: off };
    off += dash;
    return s;
  });
  return (
    <div className="d3-donut-wrap" key={uid}>
      <svg width="136" height="136" viewBox="0 0 136 136">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(26,84,212,.07)" strokeWidth={sw} />
        {slices.map((s) => (
          <circle key={s.label} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={sw}
            strokeDasharray={`${s.dash} ${s.gap}`} strokeDashoffset={-s.offset + circ * 0.25} className="d3-donut-slice" />
        ))}
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize="19" fontWeight="800" fill="#1a2a5e">{total.toFixed(0)}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize="10" fill="#94a3b8">total %</text>
      </svg>
      <div className="d3-donut-legend">
        {segments.map((s) => (
          <div key={s.label} className="d3-legend-row">
            <span className="d3-legend-dot" style={{ background: s.color }} />
            <span className="d3-legend-label">{s.label}</span>
            <span className="d3-legend-val">{s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Insights({ insights }) {
  if (!insights?.length) return null;
  const ico = { warn: "⚠️", success: "✅", error: "🔴", info: "ℹ️" };
  return (
    <div className="d3-insights">
      {insights.map((ins, i) => (
        <div key={i} className={`d3-insight d3-insight--${ins.type}`} style={{ "--ins-delay": `${i * 65}ms` }}>
          <span>{ico[ins.type]}</span>
          <span>{ins.text}</span>
        </div>
      ))}
    </div>
  );
}

function CenterKpiDetail({ detail, uid, loading }) {
  if (!detail) return (
    <div className="d3-detail d3-detail--empty">
      {loading ? <D3ChartLoader label="Loading data…" height={320} /> : <p className="d3-panel__hint">Select a card</p>}
    </div>
  );
  const d = detail;
  return (
    <div className="d3-detail" key={uid}>
      <div className="d3-detail__titlebar">
        <span className="d3-detail__bullet" style={{ background: d.color }} />
        <p className="d3-detail__heading">{d.heading}</p>
      </div>
      {d.kpis?.length > 0 && (
        <div className="d3-detail__strip">
          {d.kpis.map((k, i) => (
            <div key={k.label} className="d3-detail__chip" style={{ "--chip-color": k.color, "--chip-delay": `${i * 55}ms` }}>
              <span className="d3-detail__chip-icon">{k.icon}</span>
              <p className="d3-detail__chip-val">{k.value}<span className="d3-detail__chip-unit"> {k.unit}</span></p>
              <p className="d3-detail__chip-lbl">{k.label}</p>
            </div>
          ))}
        </div>
      )}
      {d.chartMode === "quality" && d.donut && (
        <div className="d3-charts-zone">
          <div className="d3-chart-card">
            <p className="d3-chart-card__lbl">{d.donut.label}</p>
            <DonutChart segments={d.donut.segments} uid={uid} />
          </div>
        </div>
      )}
      {/* downtime chart is rendered via DowntimeReasonView in the main branch */}
      <Insights insights={d.insights} />
    </div>
  );
}

function CenterActionDetail({ action, view, onClose, uid }) {
  const priorityColors = { high: "#f43f5e", medium: "#f59e0b", low: "#10b981" };
  const color = priorityColors[view.priority] || "#f59e0b";
  return (
    <div className="d3-action-detail" key={uid}>
      <div className="d3-action-detail__header" style={{ "--act-color": color }}>
        <div className="d3-action-detail__icon-box">{action.icon}</div>
        <div className="d3-action-detail__meta">
          <p className="d3-action-detail__title">{action.title}</p>
          <span className={`d3-badge d3-badge--${view.priority}`}>
            {view.priority.charAt(0).toUpperCase() + view.priority.slice(1)} Priority
          </span>
        </div>
        <button type="button" className="d3-action-detail__close" onClick={onClose}>✕</button>
      </div>
      <div className="d3-action-detail__body">
        <div className="d3-action-detail__time-row">
          <span className="d3-action-detail__time-icon">🕐</span>
          <span className="d3-action-detail__time-val">{view.time}</span>
        </div>
        <div className="d3-action-detail__desc-box">
          <p className="d3-action-detail__desc-label">Summary</p>
          <p className="d3-action-detail__desc">{view.desc}</p>
        </div>
      </div>
    </div>
  );
}

function BottomKpiPanel({ bottom, uid }) {
  if (!bottom) return null;
  const b = bottom;
  return (
    <div className="d3-bottom" key={uid}>
      <div className="d3-bottom__table-wrap">
        <p className="d3-bottom__section-lbl">{b.tableTitle}</p>
        <div className="d3-bottom__table-scroll">
          <table className="d3-table">
            <thead><tr>{b.columns.map((col) => <th key={col} className="d3-table__th">{col}</th>)}</tr></thead>
            <tbody>
              {b.rows.map((row, ri) => (
                <tr key={ri} className="d3-table__tr">
                  {row.map((cell, ci) => <td key={ci} className="d3-table__td">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="d3-bottom__recs-wrap">
        <p className="d3-bottom__section-lbl">Notes</p>
        <div className="d3-bottom__recs">
          {b.recs.map((r, i) => (
            <div key={i} className="d3-rec"><span className="d3-rec__icon">{r.icon}</span><span className="d3-rec__text">{r.text}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton shimmer placeholder ───────────────────────────── */
function D3Skeleton({ lines = 3, width = "100%" }) {
  return (
    <div className="d3-skel" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="d3-skel__line"
          style={{ width: i === lines - 1 ? "60%" : width, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}

/* ── Premium chart loading animation ───────────────────────── */
function D3ChartLoader({ label = "Loading chart…", height = 340 }) {
  return (
    <div className="d3-chart-loader" style={{ height }} aria-label={label}>
      {/* Animated bar chart skeleton */}
      <div className="d3-chart-loader__bars">
        {[0.4, 0.7, 0.55, 0.9, 0.65, 0.8, 0.5, 0.75, 0.6, 0.85].map((h, i) => (
          <div
            key={i}
            className="d3-chart-loader__bar"
            style={{ "--bar-h": h, "--bar-i": i }}
          />
        ))}
      </div>
      {/* Pulsing ring + label */}
      <div className="d3-chart-loader__center">
        <div className="d3-chart-loader__ring">
          <div className="d3-chart-loader__ring-inner" />
          <svg className="d3-chart-loader__ring-svg" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none" stroke="url(#ld-grad)" strokeWidth="3" strokeLinecap="round" />
            <defs>
              <linearGradient id="ld-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <p className="d3-chart-loader__label">{label}</p>
      </div>
      {/* Shimmer axis lines */}
      <div className="d3-chart-loader__axes">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="d3-chart-loader__axis-line" style={{ "--ax-i": i }} />
        ))}
      </div>
    </div>
  );
}

/* ── Premium table loading animation ───────────────────────── */
function D3TableLoader({ rows = 5, cols = 4 }) {
  return (
    <div className="d3-tbl-loader" aria-label="Loading data…">
      {/* Header shimmer */}
      <div className="d3-tbl-loader__header">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="d3-tbl-loader__hcell" style={{ "--tc-i": i }} />
        ))}
      </div>
      {/* Row shimmers */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="d3-tbl-loader__row" style={{ "--tr-i": ri }}>
          {Array.from({ length: cols }).map((_, ci) => (
            <div key={ci} className="d3-tbl-loader__cell" style={{ "--tc-i": ci, width: ci === 0 ? "35%" : "auto" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Center panel animated wrapper (zero-latency) ──────────── */
function CenterTransitionWrapper({ uid, loading, children }) {
  // Show skeleton only during actual network loading (first fetch).
  // On card-click (uid change): content renders immediately, CSS
  // animation replays via React key — NO setTimeout delays.
  if (loading) {
    return (
      <div className="d3-ct-skeleton">
        <div className="d3-ct-skeleton__header">
          <div className="d3-ct-skel-block d3-ct-skel-block--icon" />
          <div className="d3-ct-skel-block d3-ct-skel-block--title" />
        </div>
        <div className="d3-ct-skeleton__body">
          <div className="d3-ct-skel-block d3-ct-skel-block--display" />
          <div className="d3-ct-skel-block d3-ct-skel-block--row" />
          <div className="d3-ct-skel-block d3-ct-skel-block--row d3-ct-skel-block--row-sm" />
        </div>
      </div>
    );
  }
  return (
    <div key={uid} className="d3-ct-reveal d3-ct-reveal--in">
      {children}
    </div>
  );
}

export default function Dashboard3() {
  const [selKpi, setSelKpi] = useState(0);
  const [selAction, setSelAction] = useState(null);
  const [centerKey, setCenterKey] = useState(0);
  const [activePeriod, setActivePeriod] = useState("month");
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [data, setData] = useState({});
  const fetchAbortRef = useRef(null);

  const fetchAll = useCallback(async (from, to, signal) => {
    setLoading(true);
    setFetchError(null);
    const bundleUrl = buildUrl("/api/plant-performance/bundle/", from, to);
    try {
      const res = await fetch(bundleUrl, { credentials: "include", signal });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data) {
        setData({});
        setFetchError(json?.error || json?.detail || `Load failed (${res.status})`);
        return;
      }
      setData(json.data);
      const errs = json.errors ? Object.entries(json.errors) : [];
      const hasAny = Object.values(json.data).some((v) => v != null);
      if (!hasAny && errs.some(([, msg]) => String(msg).includes("Session expired"))) {
        setFetchError("Session expired — please log in again.");
      } else if (errs.length) {
        setFetchError(`Some panels failed: ${errs.slice(0, 2).map(([k, m]) => `${k}: ${m}`).join("; ")}`);
      }
    } catch (e) {
      if (e.name === "AbortError") return;
      setFetchError(e.message || "Failed to load data");
      setData({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateRange({ from: monthStart, to: today });
    fetchAbortRef.current?.abort();
    const ctrl = new AbortController();
    fetchAbortRef.current = ctrl;
    fetchAll(monthStart, today, ctrl.signal);
    return () => ctrl.abort();
  }, [fetchAll]);

  const handleRangeChange = ({ from, to }) => {
    setDateRange({ from, to });
    fetchAbortRef.current?.abort();
    const ctrl = new AbortController();
    fetchAbortRef.current = ctrl;
    fetchAll(from, to, ctrl.signal);
  };

  const handleKpiClick = (idx) => {
    if (idx === selKpi && selAction === null) return;
    setSelAction(null);
    setSelKpi(idx);
    setCenterKey((k) => k + 1);
  };

  const handleActionClick = (id) => {
    if (selAction === id) {
      setSelAction(null);
      setCenterKey((k) => k + 1);
      return;
    }
    setSelAction(id);
    setCenterKey((k) => k + 1);
  };

  const activeStateCard = CURRENT_STATE_CARDS[selKpi];
  const activeActionCard = ACTION_CARDS.find((a) => a.id === selAction);
  const activeActionView = activeActionCard ? buildActionSidebar(activeActionCard, data, loading) : null;

  const selectionId = selAction ?? activeStateCard?.id;
  const selectionPanel = selAction ? "action" : "state";

  const centerDetail = useMemo(
    () => (selectionId ? buildCenterDetail(selectionId, selectionPanel, data) : null),
    [selectionId, selectionPanel, data]
  );

  const bottomTable = useMemo(
    () => (selectionId ? buildBottomTable(selectionId, selectionPanel, data) : null),
    [selectionId, selectionPanel, data]
  );

  const actionSummary = useMemo(() => {
    let high = 0, medium = 0, low = 0;
    ACTION_CARDS.forEach((c) => {
      const p = actionPriority(c, data);
      if (p === "high") high++;
      else if (p === "medium") medium++;
      else low++;
    });
    return { high, medium, low };
  }, [data]);

  return (
    <div className={`d3-root ${loading ? "d3-root--loading" : ""}`}>
      <div className="d3-fbar">
        <Dashboard3DatePicker
          activePeriod={activePeriod}
          onPeriodChange={setActivePeriod}
          onRangeChange={handleRangeChange}
        />
        {loading && <span className="d3-fbar-status">Loading live data…</span>}
        {fetchError && <span className="d3-fbar-error">{fetchError}</span>}
      </div>

      <div className="d3-main">
        <div className="d3-body">
          <section className="d3-panel d3-panel--left">
            <div className="d3-panel__head">
              <div className="d3-panel__header">
                <span className="d3-panel__dot d3-panel__dot--blue" />
                <h2 className="d3-panel__title">Current State</h2>
                {/* <span className="d3-panel__live">● LIVE</span> */}
              </div>
              <p className="d3-panel__hint">Click a card to explore details</p>
            </div>
            <div className="d3-kpi-list">
              {CURRENT_STATE_CARDS.map((kpi, i) => {
                const active = selKpi === i && selAction === null;
                return (
                  <div
                    key={kpi.id}
                    role="button"
                    tabIndex={0}
                    className={`d3-kpi-card ${active ? "d3-kpi-card--active" : ""}`}
                    style={{ "--kc": kpi.color, "--kl": kpi.colorLight, "--ki": i }}
                    onClick={(e) => {
                      const el = e.currentTarget;
                      const rect = el.getBoundingClientRect();
                      const size = Math.max(rect.width, rect.height) * 2;
                      const rip = document.createElement("span");
                      rip.className = "d3-ripple";
                      rip.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
                      el.appendChild(rip);
                      rip.addEventListener("animationend", () => rip.remove(), { once: true });
                      handleKpiClick(i);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleKpiClick(i)}
                  >
                    <div className="d3-kpi-card__accent" />
                    <div className="d3-kpi-card__shimmer" />
                    <div className="d3-kpi-card__row">
                      <div className="d3-kpi-icon-wrap"><span>{kpi.icon}</span></div>
                      <div className="d3-kpi-info">
                        <p className="d3-kpi-title">{kpi.title}</p>
                      </div>
                    </div>
                    {active && <div className="d3-kpi-card__active-indicator" />}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="d3-center">
            <div className="d3-center__glow" />
            <div className="d3-center__scroll">
              <CenterTransitionWrapper uid={centerKey} loading={loading}>
                {selAction && activeActionCard && selAction !== "downtime_reason" && selAction !== "quality_split" && selAction !== "top_defects" && selAction !== "customer_complaints" && selAction !== "iqc_rejections" && selAction !== "grn_pending" && selAction !== "injob_inspection" && selAction !== "inter_inspection" && selAction !== "final_inspection" && selAction !== "po_status" && selAction !== "idle_summary" ? (
                  <CenterActionDetail
                    action={activeActionCard}
                    view={activeActionView}
                    uid={`act-${centerKey}`}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                  />
                ) : selectionId === "production_data" ? (
                  <Dashboard3ProductionDataView
                    from={dateRange.from}
                    to={dateRange.to}
                    productionKpis={data.prod}
                    shiftsPayload={data.shifts}
                    uid={centerKey}
                  />
                ) : selectionId === "downtime_reason" ? (
                  <DowntimeReasonView
                    data={data}
                    from={dateRange.from}
                    to={dateRange.to}
                    loading={loading}
                    uid={centerKey}
                  />
                ) : selectionId === "quality_split" ? (
                  <QualitySplitView
                    data={data}
                    loading={loading}
                    uid={centerKey}
                  />
                ) : selectionId === "top_defects" ? (
                  <TopDefectsView
                    data={data}
                    loading={loading}
                    uid={centerKey}
                  />
                ) : selectionId === "customer_complaints" ? (
                  <CustomerComplaintsView
                    data={data}
                    loading={loading}
                    uid={centerKey}
                  />
                ) : selectionId === "iqc_rejections" ? (
                  <IqcRejectionView
                    data={data}
                    loading={loading}
                    uid={centerKey}
                  />
                ) : selectionId === "grn_pending" ? (
                  <GrnPipelineView
                    data={data}
                    loading={loading}
                    uid={centerKey}
                  />
                ) : selectionId === "injob_inspection" ? (
                  <InspectionView type="injob_inspection" data={data} loading={loading} uid={centerKey} />
                ) : selectionId === "inter_inspection" ? (
                  <InspectionView type="inter_inspection" data={data} loading={loading} uid={centerKey} />
                ) : selectionId === "final_inspection" ? (
                  <InspectionView type="final_inspection" data={data} loading={loading} uid={centerKey} />
                ) : selectionId === "po_status" ? (
                  <PurchaseOrderView data={data} loading={loading} uid={centerKey} />
                ) : selectionId === "idle_summary" ? (
                  <IdleTimeView data={data} loading={loading} uid={centerKey} />
                ) : selectionId === "otd_trend" ? (
                  <OtdTrendView
                    loading={loading}
                    uid={centerKey}
                    from={dateRange.from}
                    to={dateRange.to}
                  />
                ) : selectionId === "machine_efficiency" ? (
                  <OperatorEfficiencyView
                    loading={loading}
                    uid={centerKey}
                    from={dateRange.from}
                    to={dateRange.to}
                  />
                ) : selectionId === "final_inspection_ok" ? (
                  <FinalInspectionOkView
                    data={data}
                    loading={loading}
                    uid={centerKey}
                  />
                ) : selectionId === "production_output" ? (
                  <ProductionOutputView
                    data={data}
                    loading={loading}
                    uid={centerKey}
                  />
                ) : selectionId === "oee_efficiency" ? (
                  <OeeEfficiencyView
                    data={data}
                    loading={loading}
                    uid={centerKey}
                    from={dateRange.from}
                    to={dateRange.to}
                  />
                ) : (
                  <CenterKpiDetail detail={centerDetail} uid={`kpi-${centerKey}`} loading={loading} />
                )}
              </CenterTransitionWrapper>
            </div>
          </section>

          <section className="d3-panel d3-panel--right">
            <div className="d3-panel__head">
              <div className="d3-panel__header">
                <span className="d3-panel__dot d3-panel__dot--orange" />
                <h2 className="d3-panel__title">Action to be Taken</h2>
              </div>
              <p className="d3-panel__hint">Click to view action steps</p>
            </div>
            <div className="d3-action-list">
              {ACTION_CARDS.map((a, i) => {
                const active = selAction === a.id;
                return (
                  <div
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    className={`d3-ac-card ${active ? "d3-ac-card--active" : ""}`}
                    style={{ "--ai": i }}
                    onClick={(e) => {
                      const el = e.currentTarget;
                      const rect = el.getBoundingClientRect();
                      const size = Math.max(rect.width, rect.height) * 2;
                      const x = (e.clientX - rect.left) - size / 2;
                      const y = (e.clientY - rect.top) - size / 2;
                      const rip = document.createElement("span");
                      rip.className = "d3-ripple d3-ripple--amber";
                      rip.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
                      el.appendChild(rip);
                      rip.addEventListener("animationend", () => rip.remove(), { once: true });
                      handleActionClick(a.id);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleActionClick(a.id)}
                  >
                    <div className="d3-ac-card__shimmer" />
                    <div className="d3-ac-icon">{a.icon}</div>
                    <div className="d3-ac-body">
                      <span className="d3-ac-title">{a.title}</span>
                    </div>
                    <span className="d3-ac-arrow">{active ? "▼" : "›"}</span>
                  </div>
                );
              })}
            </div>
            <div className="d3-summary-row">
              {[
                { label: "High", n: actionSummary.high, cls: "red" },
                { label: "Medium", n: actionSummary.medium, cls: "amber" },
                { label: "Low", n: actionSummary.low, cls: "green" },
              ].map((c) => (
                <div key={c.label} className={`d3-sum-chip d3-sum-chip--${c.cls}`}>
                  <strong>{c.n}</strong> {c.label}
                </div>
              ))}
            </div>
          </section>
        </div>

        {selectionId === "customer_complaints" ? (
          <CustomerComplaintsBottomTable data={data} loading={loading} uid={`bot-cc-${centerKey}`} />
        ) : selectionId === "iqc_rejections" ? (
          <IqcRejectionBottomTable data={data} loading={loading} uid={`bot-iqc-${centerKey}`} />
        ) : selectionId === "grn_pending" ? (
          <GrnPipelineBottomTable data={data} loading={loading} uid={`bot-grn-${centerKey}`} />
        ) : selectionId === "po_status" ? (
          <PurchaseOrderBottomTable data={data} loading={loading} uid={`bot-po-${centerKey}`} />
        ) : (bottomTable && selectionId !== "production_data" && selectionId !== "otd_trend" && selectionId !== "machine_efficiency") ? (
          <BottomKpiPanel bottom={bottomTable} uid={`bot-${centerKey}`} />
        ) : null}
      </div>
    </div>
  );
}
