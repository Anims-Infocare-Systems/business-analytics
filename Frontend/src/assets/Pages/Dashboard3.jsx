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
  { id: "rejection_qty", title: "Rejection Qty", icon: "⚠️", color: "#ef4444", colorLight: "#fee2e2" },
  { id: "rework_qty", title: "Rework Qty", icon: "🔧", color: "#f59e0b", colorLight: "#fef3c7" },
  { id: "oee_efficiency", title: "OEE Efficiency", icon: "📈", color: "#1a56db", colorLight: "#dbeafe" },
  { id: "machine_efficiency", title: "Machine efficiency", icon: "🚚", color: "#8b5cf6", colorLight: "#ede9fe" },
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
  const rejection = Number(kpis.rejection_qty ?? 0) || 0;
  const rework = Number(kpis.rework_grand_total ?? 0) || 0;
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
    final_inspection_ok: { value: fmtNum(fi?.total_ok_qty), unit: "units", sub: fi?.first_pass_yield != null ? `FPY ${fmtPct(fi.first_pass_yield)}` : "Final insp", trend: (fi?.first_pass_yield ?? 0) >= 98 ? 1 : -1 },
    rejection_qty: { value: fmtNum(kpis.rejection_qty), unit: "Qty", sub: "All inspection types", trend: -1 },
    rework_qty: { value: fmtNum(kpis.rework_grand_total), unit: "Qty", sub: "Rework total", trend: 0 },
    oee_efficiency: { value: (kpis.oa_efficiency ?? 0).toFixed(2), unit: "%", sub: "Target 80%", trend: (kpis.oa_efficiency ?? 0) >= 80 ? 1 : -1 },
    machine_efficiency: { value: otd.on_time_delivery_pct != null ? fmtPct(otd.on_time_delivery_pct) : "—", unit: "", sub: `${otd.delayed_lines ?? 0} delayed lines`, trend: (otd.on_time_delivery_pct ?? 0) >= 95 ? 1 : -1 },
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
          chip("Rejection", fmtNum(kpis.rejection_qty), "qty", "❌", "#ef4444"),
          chip("Rework", fmtNum(kpis.rework_grand_total), "qty", "🔄", "#f59e0b"),
          chip("OAEFF", (kpis.oa_efficiency ?? 0).toFixed(2), "%", "📈", "#1a56db"),
        ];
        insights = [{ type: "info", text: "Production output and quality totals for selected date range." }];
        break;
      case "final_inspection_ok":
        kpisStrip = [
          chip("OK Qty", fmtNum(fi?.total_ok_qty), "", "✅", "#10b981"),
          chip("Total Qty", fmtNum(fi?.total_qty), "", "📊", "#2d6de8"),
          chip("FPY", fmtPct(fi?.first_pass_yield ?? 0), "", "🎯", "#8b5cf6"),
          chip("Inspections", fmtNum(fi?.inspection_count), "", "📋", "#64748b"),
        ];
        break;
      case "rejection_qty":
      case "rework_qty":
      case "oee_efficiency":
        kpisStrip = [
          chip("Output", fmtNum(kpis.production_output), "units", "📦", "#0ea5e9"),
          chip("Rejection", fmtNum(kpis.rejection_qty), "qty", "❌", "#ef4444"),
          chip("Rework", fmtNum(kpis.rework_grand_total), "qty", "🔄", "#f59e0b"),
          chip("OAEFF", (kpis.oa_efficiency ?? 0).toFixed(2), "%", "📈", "#1a56db"),
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
        chartMode = "otd";
        lineChart = {
          label: "On-time delivery % by month",
          xLabels: (otd?.trend ?? []).map((p) => p.label?.slice(0, 6) ?? ""),
          series: [{ name: "OTD %", color: "#2d6de8", data: (otd?.trend ?? []).map((p) => p.on_time_delivery_pct ?? 0) }],
        };
        kpisStrip = [
          chip("OTD %", fmtPct(otd?.kpis?.on_time_delivery_pct), "", "📅", "#8b5cf6"),
          chip("On-time qty", fmtNum(otd?.kpis?.on_time_qty), "", "✅", "#10b981"),
          chip("Total del.", fmtNum(otd?.kpis?.total_del_qty), "", "🚚", "#2d6de8"),
          chip("Delayed", fmtNum(otd?.kpis?.delayed_lines), "", "⚠️", "#ef4444"),
        ];
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
    } else if (cardId === "otd_trend") {
      tableTitle = "OTD trend by month";
      columns = ["Month", "OTD %", "Total qty"];
      (data.otd?.trend ?? []).forEach((p) => {
        rows.push([p.label ?? "—", p.on_time_delivery_pct != null ? fmtPct(p.on_time_delivery_pct) : "—", fmtNum(p.total_qty)]);
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
  const rejection = Number(data.prod?.kpis?.rejection_qty ?? 0) || 0;
  const rework = Number(data.prod?.kpis?.rework_grand_total ?? 0) || 0;
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
      // ensure every segment always renders a visible minimum arc (0.5% of total)
      // so even 0% rejection shows a thin red sliver; tooltip still shows real values
      const minSlice = total > 0 ? total * 0.005 : 0;
      let chartData = total > 0
        ? [Math.max(ok, minSlice), Math.max(rejection, minSlice), Math.max(rework, minSlice)]
        : [1, 1, 1];
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

/* ── Charts (same as original UI) ───────────────────────────── */
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
  if (!detail) return <div className="d3-detail d3-detail--empty"><p className="d3-panel__hint">{loading ? "Loading…" : "Select a card"}</p></div>;
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
      {d.chartMode === "otd" && d.lineChart && (
        <div className="d3-charts-zone d3-charts-zone--solo">
          <div className="d3-chart-card d3-chart-card--full">
            <p className="d3-chart-card__lbl">{d.lineChart.label}</p>
            <LineChart data={d.lineChart} uid={uid} />
          </div>
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
                const view = buildStateSidebar(kpi, data, loading);
                const active = selKpi === i && selAction === null;
                return (
                  <div
                    key={kpi.id}
                    role="button"
                    tabIndex={0}
                    className={`d3-kpi-card ${active ? "d3-kpi-card--active" : ""}`}
                    style={{ "--kc": kpi.color, "--kl": kpi.colorLight, "--ki": i }}
                    onClick={() => handleKpiClick(i)}
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
              {selAction && activeActionCard && selAction !== "downtime_reason" && selAction !== "quality_split" ? (
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
              ) : (
                <CenterKpiDetail detail={centerDetail} uid={`kpi-${centerKey}`} loading={loading} />
              )}
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
                const view = buildActionSidebar(a, data, loading);
                const active = selAction === a.id;
                return (
                  <div
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    className={`d3-ac-card ${active ? "d3-ac-card--active" : ""}`}
                    style={{ "--ai": i }}
                    onClick={() => handleActionClick(a.id)}
                    onKeyDown={(e) => e.key === "Enter" && handleActionClick(a.id)}
                  >
                    <div className="d3-ac-card__shimmer" />
                    <div className="d3-ac-icon">{a.icon}</div>
                    <div className="d3-ac-body">
                      <div className="d3-ac-head">
                        <span className="d3-ac-title">{a.title}</span>
                        <span className={`d3-badge d3-badge--${view.priority}`}>
                          {view.priority.charAt(0).toUpperCase() + view.priority.slice(1)}
                        </span>
                      </div>
                      <p className="d3-ac-desc">{view.loading ? "Loading…" : view.desc}</p>
                      <p className="d3-ac-time">🕐 {view.time}</p>
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

        {bottomTable && selectionId !== "production_data" && (
          <BottomKpiPanel bottom={bottomTable} uid={`bot-${centerKey}`} />
        )}
      </div>
    </div>
  );
}
