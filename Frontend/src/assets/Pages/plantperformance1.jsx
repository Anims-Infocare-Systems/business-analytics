/**
 * Dashboard3 — Plant Performance
 * 3-column UI: Current State (10) | Center detail | Action (9)
 * Live metrics from Dashboard2 APIs · fixed-height columns with inner scroll
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Chart, registerables } from "chart.js";
import "./plantperformance1.css";
import PlantPerformance1DatePicker from "./plantperformance1DatePicker";
import PlantPerformance1ProductionDataView from "./plantperformance1ProductionDataView";
import {
  Scale,
  ClipboardCheck,
  TrendingUp,
  Factory,
  Timer,
  Truck,
  AlertTriangle,
  Megaphone,
  Package,
  ClipboardList,
  Star,
  Award,
  ListTodo,
  PackageCheck,
  Clock,
  UserCheck,
  CheckCircle2,
  ShoppingCart,
  Calendar,
  Settings,
  Target,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  XOctagon,
  RefreshCw
} from "lucide-react";

Chart.register(...registerables);

const MOCK_DATA = {
  fi: {
    total_ok_qty: 4850,
    total_qty: 5000,
    first_pass_yield: 97.0,
    inspection_count: 15
  },
  prod: {
    kpis: {
      production_output: 12500,
      rejection_qty: 120,
      rework_grand_total: 80,
      oa_efficiency: 78.5
    },
    from: "2026-06-01",
    to: "2026-06-12"
  },
  idle: {
    summary: {
      accepted_hours: 12.5,
      non_accepted_hours: 4.8,
      total_idle_hours: 17.3,
      other_hours: 0.0
    },
    accepted: [
      { reason: "Tool change", hours: 5.2 },
      { reason: "Setting", hours: 4.1 },
      { reason: "Material waiting", hours: 3.2 }
    ]
  },
  injob: {
    total_rejection: 45,
    total_rework: 30,
    total_qty_basis: 2500,
    inspection_master_count: 8,
    rejection_pct: 1.8,
    rework_pct: 1.2,
    qty_basis_column: "Total Output Qty"
  },
  inter: {
    total_rejection: 35,
    total_rework: 25,
    total_qty_basis: 2200,
    row_count: 12,
    rejection_pct: 1.6,
    rework_pct: 1.1,
    qty_basis_column: "Intermediate Inspected Qty"
  },
  finalOrg: {
    total_rejection: 40,
    total_rework: 25
  },
  shifts: {
    shifts: [
      { shift: "A Shift", qty: 4200 },
      { shift: "B Shift", qty: 3800 },
      { shift: "C Shift", qty: 3100 }
    ]
  },
  downtime: {
    reasons: [
      { reason: "No Operator", hours: 2.1 },
      { reason: "Electrical Breakdown", hours: 1.5 },
      { reason: "Mechanical Breakdown", hours: 1.2 }
    ]
  },
  complaints: {
    complaints: [
      {
        complaint_id: "CC-2026-001",
        customer_name: "Tata Motors",
        product: "Brake Pads",
        complaint_description: "Surface scratches",
        action_taken: "Polished surfaces",
        complaint_date: "2026-06-02",
        corrective_action: "Enhanced visual inspection",
        permanent_action: "Automated QC cameras",
        status: "Closed"
      },
      {
        complaint_id: "CC-2026-002",
        customer_name: "Mahindra & Mahindra",
        product: "Disc Rotors",
        complaint_description: "Thickness variation",
        action_taken: "Recalibrated grinder",
        complaint_date: "2026-06-05",
        corrective_action: "Adjusted grinding head",
        permanent_action: "CNC alignment checks",
        status: "Open"
      }
    ],
    from: "2026-06-01",
    to: "2026-06-12"
  },
  po: {
    summary: {
      total_pos: 18,
      approved: 15,
      grn_pending: 3,
      total_po_value: 1450000
    },
    rows: [
      { po_number: "PO-2026-101", vendor_name: "Steel Authority of India", material: "MS Sheet Metal 2mm", value: 450000 },
      { po_number: "PO-2026-102", vendor_name: "Hindalco Industries", material: "Aluminum Extrusion", value: 380000 },
      { po_number: "PO-2026-103", vendor_name: "Jindal Stainless", material: "SS Rods 10mm", value: 620000 }
    ]
  },
  grn: {
    summary: {
      total_record_count: 5,
      total_qty: 1500
    },
    rows: [
      { grnno: "GRN-2026-501", partno: "MS Bolt M8", qty: 800, insp: 0 },
      { grnno: "GRN-2026-502", partno: "Nylon Bush", qty: 700, insp: 0 }
    ]
  },
  iqc: {
    summary: {
      total_record_count: 2,
      total_rejection_qty: 150
    },
    rows: [
      { grn_insp_no: "IQC-2026-301", grn_insp_date: "2026-06-03", type: "Rejection", vendor_name: "Tata Steel", partno: "HR Plate 5mm", rejection_qty: 100 },
      { grn_insp_no: "IQC-2026-302", grn_insp_date: "2026-06-07", type: "Rejection", vendor_name: "JSW Steel", partno: "CR Coil 1.2mm", rejection_qty: 50 }
    ]
  },
  topDefects: {
    rows: [
      { partno: "Brake Disc #A1", total_rejection_qty: 85, rejection_pct: 35.5 },
      { partno: "Gear Box Housing", total_rejection_qty: 62, rejection_pct: 25.9 },
      { partno: "Engine Mount Brkt", total_rejection_qty: 48, rejection_pct: 20.1 }
    ],
    total_rejection_qty: 240,
    from: "2026-06-01",
    to: "2026-06-12"
  },
  otd: {
    kpis: {
      on_time_delivery_pct: 88.5,
      on_time_qty: 11000,
      total_del_qty: 12430,
      delayed_lines: 4
    },
    trend: [
      { month: "Jan", on_time_delivery_pct: 82.1 },
      { month: "Feb", on_time_delivery_pct: 85.4 },
      { month: "Mar", on_time_delivery_pct: 89.0 },
      { month: "Apr", on_time_delivery_pct: 87.5 },
      { month: "May", on_time_delivery_pct: 91.2 },
    ]
  },
  customerPoCompare: {
    rows: [
      {
        customer: "Tata Motors",
        po_no: "PO-2026-8801",
        po_date: "2026-06-01",
        part_no: "BRK-PAD-M1",
        ordered_qty: 5000,
        produced_qty: 4800,
        dispatch_qty: 4500,
        pending_qty: 500,
        rejected_qty: 50,
        delivery_date: "2026-06-20",
        status: "In Progress",
        category: "Brake Parts"
      },
      {
        customer: "Mahindra & Mahindra",
        po_no: "PO-2026-9042",
        po_date: "2026-06-03",
        part_no: "ROT-DSC-X4",
        ordered_qty: 3000,
        produced_qty: 3000,
        dispatch_qty: 3000,
        pending_qty: 0,
        rejected_qty: 20,
        delivery_date: "2026-06-15",
        status: "Completed",
        category: "Rotors"
      },
      {
        customer: "Maruti Suzuki",
        po_no: "PO-2026-7719",
        po_date: "2026-06-05",
        part_no: "GBX-HNG-S2",
        ordered_qty: 1500,
        produced_qty: 1200,
        dispatch_qty: 1000,
        pending_qty: 500,
        rejected_qty: 15,
        delivery_date: "2026-06-25",
        status: "In Progress",
        category: "Gearbox"
      },
      {
        customer: "Hyundai India",
        po_no: "PO-2026-6652",
        po_date: "2026-06-08",
        part_no: "ENG-MNT-H1",
        ordered_qty: 2500,
        produced_qty: 0,
        dispatch_qty: 0,
        pending_qty: 2500,
        rejected_qty: 0,
        delivery_date: "2026-06-30",
        status: "Pending",
        category: "Engine Parts"
      },
      {
        customer: "Ashok Leyland",
        po_no: "PO-2026-4401",
        po_date: "2026-06-10",
        part_no: "TRK-AXL-L9",
        ordered_qty: 800,
        produced_qty: 780,
        dispatch_qty: 750,
        pending_qty: 50,
        rejected_qty: 8,
        delivery_date: "2026-06-18",
        status: "In Progress",
        category: "Axle Parts"
      }
    ]
  }
};


const CURRENT_STATE_CARDS = [
  { id: "production_output", title: "Production Output", icon: Settings, color: "#0ea5e9", colorLight: "#e0f7ff" },
  { id: "final_inspection_ok", title: "Final Inspection OK Qty", icon: CheckCircle2, color: "#10b981", colorLight: "#d1fae5" },
  { id: "oee_efficiency", title: "OEE Efficiency", icon: TrendingUp, color: "#1a56db", colorLight: "#dbeafe" },
  { id: "machine_efficiency", title: "Operator efficiency", icon: UserCheck, color: "#8b5cf6", colorLight: "#ede9fe" },
  { id: "idle_summary", title: "Idle time summary", icon: Timer, color: "#0ea5e9", colorLight: "#e0f7ff" },
  { id: "production_data", title: "Production Data", icon: ClipboardList, color: "#2d6de8", colorLight: "#e8eeff" },
  { id: "otd_trend", title: "On-Time Delivery Trend", icon: Calendar, color: "#7c3aed", colorLight: "#ede9fe" },
  { id: "po_status", title: "Purchase Order Status", icon: ShoppingCart, color: "#f97316", colorLight: "#ffedd5" },
];

const ACTION_CARDS = [
  { id: "customer_po_vs_sales_analysis", title: "Customer PO vs Sales Value Analysis", icon: Scale, color: "#2d6de8", priority: "medium", trend: { value: "+5.8% Up", type: "up" } },
  { id: "purchase_report_dashboard", title: "Purchase Report", icon: ShoppingCart, color: "#ea580c", priority: "medium" },
  { id: "sales_analysis_report_dashboard", title: "Sales Analysis Report", icon: TrendingUp, color: "#10b981", priority: "medium" },
  { id: "production_analysis_report_dashboard", title: "Production Analysis Report", icon: Factory, color: "#8b5cf6", priority: "medium" },
  { id: "idle_hours_report_dashboard", title: "Idle Hours Report", icon: Timer, color: "#ef4444", priority: "medium", trend: { value: "-3.2% Down", type: "down" } },
  { id: "idle_hours_non_accepted_reason_production_loss_report", title: "Idle Hours – Non Accepted Reason Production Loss Report", icon: AlertTriangle, color: "#f43f5e", priority: "high", trend: { value: "-12.5% Down", type: "down" } },
  { id: "oee_report_dashboard", title: "OEE Report", icon: Target, color: "#2d6de8", priority: "medium", trend: { value: "+2.4% Up", type: "up" } },
  { id: "oee_comparison_report_dashboard", title: "OEE Comparison Report", icon: TrendingUp, color: "#0ea5e9", priority: "medium", trend: { value: "+0.5% Up", type: "up" } },
  { id: "efficiency_eff_report_dashboard", title: "Efficiency (EFF) Report", icon: UserCheck, color: "#10b981", priority: "medium" },
  { id: "rejection_report_dashboard", title: "Rejection Report", icon: AlertTriangle, color: "#f59e0b", priority: "high", trend: { value: "-8.4% Down", type: "down" } },
  { id: "rework_report_dashboard", title: "Rework Report", icon: PackageCheck, color: "#a855f7", priority: "high", trend: { value: "0.0% Avg", type: "average" } },
  { id: "customer_complaint_report_dashboard", title: "Customer Complaint Report", icon: Megaphone, color: "#dc2626", priority: "high" },
  { id: "machine_capacity_report_dashboard", title: "Machine Capacity Report", icon: Package, color: "#ea580c", priority: "medium" }
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
  const map = {
    customer_po_vs_sales_analysis: { desc: "Compare actual purchase order quantities and values against customer sales dispatches and schedules.", time: "Live ERP check" },
    purchase_report_dashboard: { desc: "Overview of raw material purchases, supplier orders, pending GRNs, and material age analysis.", time: "Real-time ledger" },
    sales_analysis_report_dashboard: { desc: "Sales dispatch value, billing trends, target vs actual sales, and customer order performance.", time: "Monthly analytics" },
    production_analysis_report_dashboard: { desc: "Machine parts produced, operating run times, shift output, and parts yield analysis.", time: "Shift-wise log" },
    idle_hours_report_dashboard: { desc: "Planned and accepted idle machine hours: tool change, settings, power waiting, operator lunch.", time: "Target 8.0h/shift" },
    idle_hours_non_accepted_reason_production_loss_report: { desc: "Analysis of non-accepted downtime (electrical/mechanical breakdowns, no operators) and production loss.", time: "Loss evaluation" },
    oee_report_dashboard: { desc: "Overall Equipment Effectiveness based on Availability, Performance, and Quality factors.", time: "Target 85% OEE" },
    oee_comparison_report_dashboard: { desc: "Compare availability, performance, quality, and OEE parameters across machines and shifts.", time: "Machine benchmark" },
    efficiency_eff_report_dashboard: { desc: "Performance and operator efficiency report based on actual run cycle time vs standards.", time: "Performance grade" },
    rejection_report_dashboard: { desc: "Track rejections, scrap counts, and defect distribution across production lines.", time: "Quality statistics" },
    rework_report_dashboard: { desc: "Track rework cycles, recovery loops, and part repair metrics across production lines.", time: "Quality statistics" },
    customer_complaint_report_dashboard: { desc: "Customer complaints log, resolution status, corrective actions, and permanent preventions.", time: "Customer QC audits" },
    machine_capacity_report_dashboard: { desc: "Capacity utilization of machinery: available capacity vs run hours, load, and overload warnings.", time: "Capacity audit" }
  };
  const m = map[card.id] ?? { desc: "—", time: "—" };
  return { ...m, priority: card.priority || "medium", loading };
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

  if (panel === "state" || cardId === "idle_time_entry") {
    if (cardId === "po_status") {
      tableTitle = "Purchase orders";
      columns = ["PO", "Vendor", "Material", "Value"];
      (data.po?.rows ?? []).slice(0, 12).forEach((r) => {
        rows.push([r.po_number ?? "—", (r.vendor_name ?? "—").slice(0, 18), (r.material ?? "—").slice(0, 22), fmtNum(r.value)]);
      });
    } else if (cardId === "idle_summary" || cardId === "idle_time_entry") {
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
    } else if (cardId === "customer_complaints" || cardId === "customer_complaint") {
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
    } else if (cardId === "grn_pending" || cardId === "grn_report") {
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
    legend: { labels: { color: "#475569", font: { size: 9 } } },
  },
  scales: {
    x: { ticks: { color: "#64748b", font: { size: 9 } }, grid: { color: "rgba(0, 0, 0, 0.05)" } },
    y: { min: 0, max: 100, ticks: { color: "#64748b", font: { size: 9 }, stepSize: 10 }, grid: { color: "rgba(0, 0, 0, 0.05)" } },
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
  backgroundColor: "rgba(15, 23, 42, 0.95)",
  titleColor: "#ffffff",
  bodyColor: "#cbd5e1",
  borderColor: "rgba(255, 255, 255, 0.08)",
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
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { color: "#64748b" },
              title: { display: true, text: "Hours", color: "#64748b", font: { size: 10 } },
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
    <div className="pp1-dt-view" key={uid}>
      <div className="pp1-detail__titlebar">
        {/* <span className="pp1-detail__bullet" style={{ background: "#ef4444" }} /> */}
        {/* <p className="pp1-detail__heading">Downtime by Reason</p> */}
      </div>
      <div className="pp1-dt-card">
        <div className="pp1-dt-card__hd">
          <div>
            <div className="pp1-dt-card__title">Downtime by Reason</div>
            {/* <div className="pp1-dt-card__sub">
              Non-accepted idle (IdleReasons.IsAccept&nbsp;=&nbsp;0) — Machine_IdleEntry ·
              Prod_IdleEntry · conv_IdleEntry, by date range
            </div> */}
          </div>
        </div>
        <div
          className="pp1-dt-chart-wrap"
          style={{ height: chartHeight, opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}
        >
          <ChartJsCanvas setup={setupChart} height={chartHeight} rebuildToken={rebuildToken} />
        </div>
        {!loading && (!Array.isArray(reasons) || !reasons.length) && (
          <p className="pp1-dt-card__empty">No non-accepted idle hours recorded for this date range.</p>
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
  backgroundColor: "rgba(15, 23, 42, 0.95)",
  titleColor: "#ffffff",
  bodyColor: "#cbd5e1",
  borderColor: "rgba(255, 255, 255, 0.08)",
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
    <div className="pp1-qs-view" key={uid}>
      <div className="pp1-qs-card">
        <div className="pp1-qs-card__hd">
          <div>
            <div className="pp1-qs-card__title">Quality Split</div>
            {/* <div className="pp1-qs-card__sub">
              FinalInspectionEntry OK (finspdate) · Rejection &amp; rework from GET
              /api/dashboard2/kpis/ (InJob + Inter + Final)
            </div> */}
          </div>
        </div>
        {/* <div className="pp1-qs-range">{rangeLine}</div> */}
        <div
          className="pp1-qs-chart-wrap"
          style={{ height: 250, opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}
        >
          <ChartJsCanvas setup={setupChart} height={150} rebuildToken={rebuildToken} />
        </div>
        <div className="pp1-qs-leg">
          <div className="pp1-qs-leg__item">
            <span className="pp1-qs-leg__dot" style={{ background: "#10b981" }} />
            Final inspection OK · {m.pctOk}% · {ok.toLocaleString()} qty
          </div>
          <div className="pp1-qs-leg__item">
            <span className="pp1-qs-leg__dot" style={{ background: "#ef4444" }} />
            Rejection · {m.pctRej}% · {rejection.toLocaleString()} qty
          </div>
          <div className="pp1-qs-leg__item">
            <span className="pp1-qs-leg__dot" style={{ background: "#f59e0b" }} />
            Rework · {m.pctRwk}% · {rework.toLocaleString()} qty
          </div>
        </div>
        {!loading && total <= 0 && (
          <p className="pp1-qs-empty">No OK / rejection / rework quantities in this range.</p>
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
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { color: "#64748b" },
              title: { display: true, text: "Rejection Qty", color: "#64748b", font: { size: 10 } },
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
    <div className="pp1-dt-view" key={uid}>
      <div className="pp1-dt-card">
        <div className="pp1-dt-card__hd">
          <div>
            <div className="pp1-dt-card__title">Top Defect Categories</div>
            {/* <div className="pp1-dt-card__sub">
              By rejection qty · FinalInspRejectionEntryOrg + InterInspectionEntry · {rangeHint}
            </div> */}
          </div>
        </div>
        <div
          className="pp1-dt-chart-wrap"
          style={{ height: chartHeight, opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}
        >
          <ChartJsCanvas setup={setupChart} height={chartHeight} rebuildToken={rebuildToken} />
        </div>
        {!loading && !rows.length && (
          <p className="pp1-dt-card__empty">No rejection data for this date range.</p>
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
            legend: { position: "top", labels: { boxWidth: 10, font: { size: 10 }, color: "#475569" } },
            tooltip: { ...DT_TOOLTIP_CFG },
          },
          scales: {
            x: { stacked: true, beginAtZero: true, grid: { color: "rgba(0, 0, 0, 0.05)" }, ticks: { color: "#64748b", font: { size: 10 } } },
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
    <div className="pp1-cc-view" key={uid}>
      {/* ── Header ── */}
      <div className="pp1-cc-hd">
        <div className="pp1-cc-hd__left">
          <div className="pp1-cc-hd__title">Customer Complaints</div>
          {/* <div className="pp1-cc-hd__sub">CustCompMas · CustCompDet · CustMast — {rangeLine}</div> */}
        </div>
      </div>

      {/* ── Stat strip ── */}
      <div className="pp1-cc-strip">
        <div className="pp1-cc-stat pp1-cc-stat--age">
          <div className="pp1-cc-stat__val">{loading ? "…" : total}</div>
          <div className="pp1-cc-stat__lbl">In range</div>
        </div>
        <div className="pp1-cc-stat pp1-cc-stat--open">
          <div className="pp1-cc-stat__val">{loading ? "…" : openLike}</div>
          <div className="pp1-cc-stat__lbl">Open-like</div>
        </div>
        <div className="pp1-cc-stat pp1-cc-stat--closed">
          <div className="pp1-cc-stat__val">{loading ? "…" : closed}</div>
          <div className="pp1-cc-stat__lbl">Closed-like</div>
        </div>
        {inProg > 0 && (
          <div className="pp1-cc-stat pp1-cc-stat--prog">
            <div className="pp1-cc-stat__val">{inProg}</div>
            <div className="pp1-cc-stat__lbl">In Progress</div>
          </div>
        )}
      </div>

      {/* ── Chart ── */}
      {!loading && custLabels.length > 0 && (
        <div className="pp1-cc-chart-card">
          <div className="pp1-cc-chart-title">Complaints by Customer &amp; Status</div>
          <div
            className="pp1-cc-chart-wrap"
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
    <div className="pp1-cc-bot" key={uid}>
      <div className="pp1-cc-bot__hd">Complaints List</div>
      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300 }}>
        <table className="pp1-cc-tbl">
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
              <tr><td colSpan={9} className="pp1-cc-tbl__empty">Loading complaints…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="pp1-cc-tbl__empty">No complaints in this date range.</td></tr>
            ) : (
              rows.map((c, i) => {
                const stcfg = ccStatusStyle(c.status);
                return (
                  <tr key={`${c.complaint_id}-${i}`} className="pp1-cc-tbl__tr">
                    <td className="pp1-cc-tbl__id">{c.complaint_id || "—"}</td>
                    <td className="pp1-cc-tbl__bold">{c.customer_name || "—"}</td>
                    <td className="pp1-cc-tbl__narrow" title={c.product}>{c.product || "—"}</td>
                    <td className="pp1-cc-tbl__text" title={c.complaint_description}>{c.complaint_description || "—"}</td>
                    <td className="pp1-cc-tbl__text" title={c.action_taken}>{c.action_taken || "—"}</td>
                    <td className="pp1-cc-tbl__mono">{c.complaint_date || "—"}</td>
                    <td className="pp1-cc-tbl__text" title={c.corrective_action}>{c.corrective_action || "—"}</td>
                    <td className="pp1-cc-tbl__text" title={c.permanent_action}>{c.permanent_action || "—"}</td>
                    <td>
                      <span className="pp1-cc-badge" style={{ background: stcfg.bg, color: stcfg.c }}>
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
            x: { beginAtZero: true, grid: { color: "rgba(0, 0, 0, 0.05)" }, ticks: { color: "#64748b", font: { size: 10 } } },
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
    <div className="pp1-iqc-view" key={uid}>
      {/* ── Header ── */}
      <div className="pp1-iqc-hd">
        <div className="pp1-iqc-hd__title">IQC — Incoming Quality Rejections</div>
        {/* <div className="pp1-iqc-hd__sub">grn_mas · inspmas · inspdet · CustMast — {rangeLine}</div> */}
      </div>

      {/* ── Two big stat cards (matches D2 exactly) ── */}
      <div className="pp1-iqc-stats">
        <div className="pp1-iqc-stat pp1-iqc-stat--red">
          <div className="pp1-iqc-stat__icon">🔴</div>
          <div className="pp1-iqc-stat__body">
            <div className="pp1-iqc-stat__val">
              {loading ? "…" : totalRec.toLocaleString("en-IN")}
            </div>
            <div className="pp1-iqc-stat__lbl">Total Records</div>
          </div>
        </div>
        <div className="pp1-iqc-stat pp1-iqc-stat--orange">
          <div className="pp1-iqc-stat__icon">📊</div>
          <div className="pp1-iqc-stat__body">
            <div className="pp1-iqc-stat__val">
              {loading ? "…" : totalRej.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
            <div className="pp1-iqc-stat__lbl">Total Rejection Qty</div>
          </div>
        </div>
      </div>

      {/* ── Chart: Top vendors by rejection qty ── */}
      {!loading && chartLabels.length > 0 && (
        <div className="pp1-iqc-chart-card">
          <div className="pp1-iqc-chart-title">Top Vendors by Rejection Qty</div>
          <div className="pp1-iqc-chart-wrap" style={{ height: chartH, position: "relative" }}>
            <ChartJsCanvas setup={setupChart} height={chartH} rebuildToken={rebuildToken} />
          </div>
        </div>
      )}

      {!loading && !rows.length && (
        <p className="pp1-iqc-empty">No IQC rejection lines in this date range.</p>
      )}
    </div>
  );
}

function IqcRejectionBottomTable({ data, loading, uid }) {
  const rows = Array.isArray(data?.iqc?.rows) ? data.iqc.rows : [];
  return (
    <div className="pp1-cc-bot" key={uid}>
      <div className="pp1-cc-bot__hd">IQC Rejection Lines</div>
      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300 }}>
        <table className="pp1-cc-tbl" style={{ minWidth: 700 }}>
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
              <tr><td colSpan={6} className="pp1-cc-tbl__empty">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="pp1-cc-tbl__empty">No IQC rejection lines in this range.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.grn_insp_no}-${i}`} className="pp1-cc-tbl__tr">
                  <td className="pp1-cc-tbl__id">{r.grn_insp_no || "—"}</td>
                  <td className="pp1-cc-tbl__mono">{r.grn_insp_date || "—"}</td>
                  <td>
                    <span className="pp1-cc-badge" style={{ background: "#f1f5f9", color: "#475569" }}>
                      {r.type || "—"}
                    </span>
                  </td>
                  <td className="pp1-cc-tbl__bold">{r.vendor_name || "—"}</td>
                  <td className="pp1-cc-tbl__narrow" title={r.material || ""}>{r.material || "—"}</td>
                  <td className="pp1-iqc-tbl__qty">{(Number(r.total_rejection_qty) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
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
            x: { beginAtZero: true, grid: { color: "rgba(0, 0, 0, 0.05)" }, ticks: { color: "#64748b", font: { size: 10 } } },
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
    <div className="pp1-idle-view" key={uid}>
      {/* Header */}
      <div className="pp1-idle-hd">
        <div className="pp1-idle-hd__title">Idle Time Summary</div>
        {/* <div className="pp1-idle-hd__sub">
          Machine_IdleEntry · Prod_IdleEntry + ProductionEntry · conv_IdleEntry — hours from SUM(DATEDIFF minute ÷ 60).
          Accepted vs non-accepted from IdleReasons.IsAccept; other bucket for unmatched / NULL reasons.
        </div> */}
      </div>

      {/* 3 stat tiles */}
      <div className="pp1-idle-grid">
        <div className="pp1-idle-tile pp1-idle-tile--acc">
          <div className="pp1-idle-tile__dot" />
          <div className="pp1-idle-tile__lbl">Accepted idle</div>
          <div className="pp1-idle-tile__val">
            {loading ? "…" : <>{fmt(accTotal)}<span className="pp1-idle-tile__unit">h</span></>}
          </div>
          <div className="pp1-idle-tile__hint">IsAccept = 1</div>
        </div>
        <div className="pp1-idle-tile pp1-idle-tile--na">
          <div className="pp1-idle-tile__dot pp1-idle-tile__dot--na" />
          <div className="pp1-idle-tile__lbl">Non-accepted idle</div>
          <div className="pp1-idle-tile__val pp1-idle-tile__val--na">
            {loading ? "…" : <>{fmt(naTotal)}<span className="pp1-idle-tile__unit">h</span></>}
          </div>
          <div className="pp1-idle-tile__hint">IsAccept = 0</div>
        </div>
        <div className="pp1-idle-tile pp1-idle-tile--all">
          <div className="pp1-idle-tile__dot pp1-idle-tile__dot--all" />
          <div className="pp1-idle-tile__lbl">Total idle</div>
          <div className="pp1-idle-tile__val pp1-idle-tile__val--all">
            {loading ? "…" : <>{fmt(grand)}<span className="pp1-idle-tile__unit">h</span></>}
          </div>
          <div className="pp1-idle-tile__hint">All lines (SUM of minutes ÷ 60)</div>
        </div>
        {otherH > 0 && (
          <div className="pp1-idle-tile pp1-idle-tile--oth">
            <div className="pp1-idle-tile__dot pp1-idle-tile__dot--oth" />
            <div className="pp1-idle-tile__lbl">Other</div>
            <div className="pp1-idle-tile__val pp1-idle-tile__val--oth">
              {loading ? "…" : <>{fmt(otherH)}<span className="pp1-idle-tile__unit">h</span></>}
            </div>
            <div className="pp1-idle-tile__hint">Unmatched reason / NULL</div>
          </div>
        )}
      </div>

      {/* Segmented proportion bar */}
      {!loading && grand > 0 && (
        <div className="pp1-idle-split">
          <div className="pp1-idle-split__bar">
            <div className="pp1-idle-split__acc" style={{ width: `${accPctW}%` }} />
            <div className="pp1-idle-split__na" style={{ width: `${naPctW}%` }} />
            {otherPctW > 0 && <div className="pp1-idle-split__oth" style={{ width: `${otherPctW}%` }} />}
          </div>
          <div className="pp1-idle-split__note">
            <span className="pp1-idle-leg pp1-idle-leg--acc">● Accepted {accPctStr}%</span>
            <span className="pp1-idle-leg pp1-idle-leg--na">● Non-accepted {naPctStr}%</span>
            {otherH > 0 && <span className="pp1-idle-leg pp1-idle-leg--oth">● Other {otherPctStr}%</span>}
          </div>
        </div>
      )}

      {/* Chart: accepted by reason */}
      {!loading && chartLabels.length > 0 && (
        <div className="pp1-idle-chart-card">
          <div className="pp1-idle-chart-title">Accepted Idle by Reason</div>
          <div style={{ height: chartH, position: "relative" }}>
            <ChartJsCanvas setup={setupChart} height={chartH} rebuildToken={rebuildToken} />
          </div>
        </div>
      )}

      {!loading && grand <= 0 && (
        <p className="pp1-idle-empty">No idle hours recorded for this date range.</p>
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
    setTrendLoading(true);
    setTrendError(null);
    setTrendReport({
      labels: ["W1", "W2", "W3", "W4", "W5"],
      data: [71, 74.5, 67.8, 70.5, 73.2]
    });
    setTrendLoading(false);
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
              grid: { borderDash: [3, 3], color: "rgba(0, 0, 0, 0.05)" },
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
  let statusClass = "pp1-oee-status--danger";
  let statusDesc = "Efficiency is below target. Review uptime bottlenecks or rejections below.";
  if (oaEff >= 80) {
    gaugeColor = "#10b981"; // green
    statusText = "Target Met";
    statusClass = "pp1-oee-status--success";
    statusDesc = "Plant operating at optimal efficiency. High productivity level maintained.";
  } else if (oaEff >= 65) {
    gaugeColor = "#f59e0b"; // amber
    statusText = "Warning: Below Target";
    statusClass = "pp1-oee-status--warning";
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
    <div className="pp1-oee-view" key={uid}>
      <div className="pp1-oee-header">
        <div className="pp1-oee-header__accent" />
        <h3 className="pp1-oee-header__title">OEE Efficiency Analysis</h3>
        <p className="pp1-oee-header__subtitle">Operational Average (OAEFF) and component breakdowns</p>
      </div>

      <div className="pp1-oee-dashboard">
        <div className="pp1-oee-gauge-card">
          <div className="pp1-oee-gauge-wrap">
            <svg viewBox="0 0 120 120" className="pp1-oee-gauge-svg">
              <circle cx="60" cy="60" r={radius} className="pp1-oee-gauge-bg" />
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="pp1-oee-gauge-fill"
                style={{
                  stroke: gaugeColor,
                  strokeDasharray: circ,
                  strokeDashoffset: strokeDashoffset,
                }}
              />
            </svg>
            <div className="pp1-oee-gauge-center">
              <span className="pp1-oee-gauge-val">{oaEff.toFixed(2)}%</span>
              <span className="pp1-oee-gauge-lbl">OAEFF</span>
            </div>
          </div>
          <div className="pp1-oee-gauge-info">
            <span className={`pp1-oee-status-badge ${statusClass}`}>{statusText}</span>
            <div className="pp1-oee-target-row">
              <span>Target: <strong>80.00%</strong></span>
              <span className="pp1-oee-target-sep">|</span>
              <span>Gap: <strong style={{ color: isTargetMet ? "#10b981" : "#ef4444" }}>{(oaEff - 80).toFixed(2)}%</strong></span>
            </div>
            <p className="pp1-oee-status-desc">{statusDesc}</p>
          </div>
        </div>

        <div className="pp1-oee-metrics-grid">
          <div className="pp1-oee-card">
            <div className="pp1-oee-card__hd">
              <span className="pp1-oee-card__icon">⏱️</span>
              <span className="pp1-oee-card__title">Availability</span>
            </div>
            <div className="pp1-oee-card__body">
              <div className="pp1-oee-metric-row">
                <span className="pp1-oee-metric-lbl">Total Idle</span>
                <span className="pp1-oee-metric-val">{fmtHours(idle.total_idle_hours)}</span>
              </div>
              <div className="pp1-oee-metric-row">
                <span className="pp1-oee-metric-lbl">Non-Accepted</span>
                <span className="pp1-oee-metric-val pp1-oee-metric-val--red">{fmtHours(idle.non_accepted_hours)}</span>
              </div>
              <div className="pp1-oee-metric-row">
                <span className="pp1-oee-metric-lbl">Accepted Idle</span>
                <span className="pp1-oee-metric-val pp1-oee-metric-val--green">{fmtHours(idle.accepted_hours)}</span>
              </div>
            </div>
          </div>

          <div className="pp1-oee-card">
            <div className="pp1-oee-card__hd">
              <span className="pp1-oee-card__icon">📦</span>
              <span className="pp1-oee-card__title">Performance</span>
            </div>
            <div className="pp1-oee-card__body">
              <div className="pp1-oee-metric-row">
                <span className="pp1-oee-metric-lbl">Production</span>
                <span className="pp1-oee-metric-val">{formattedOutput}</span>
              </div>
              <div className="pp1-oee-metric-row">
                <span className="pp1-oee-metric-lbl">Shifts</span>
                <span className="pp1-oee-metric-val">{data.shifts?.shifts?.length ?? "—"}</span>
              </div>
              <div className="pp1-oee-metric-row">
                <span className="pp1-oee-metric-lbl">Active Period</span>
                <span className="pp1-oee-metric-val" style={{ textTransform: "capitalize", fontSize: "11px", fontWeight: "600" }}>{data.prod?.from ? "Live Data" : "Current"}</span>
              </div>
            </div>
          </div>

          <div className="pp1-oee-card">
            <div className="pp1-oee-card__hd">
              <span className="pp1-oee-card__icon">🎯</span>
              <span className="pp1-oee-card__title">Quality Split</span>
            </div>
            <div className="pp1-oee-card__body">
              <div className="pp1-oee-metric-row">
                <span className="pp1-oee-metric-lbl">Quality Rate</span>
                <span className="pp1-oee-metric-val pp1-oee-metric-val--green">{formattedFirstPassYield}</span>
              </div>
              <div className="pp1-oee-metric-row">
                <span className="pp1-oee-metric-lbl">Rejections</span>
                <span className="pp1-oee-metric-val pp1-oee-metric-val--red">{formattedRejections}</span>
              </div>
              <div className="pp1-oee-metric-row">
                <span className="pp1-oee-metric-lbl">Rework Qty</span>
                <span className="pp1-oee-metric-val pp1-oee-metric-val--orange">{formattedRework}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pp1-oee-trend-card">
          <div className="pp1-oee-trend-card__hd">
            <span className="pp1-oee-trend-card__icon">📈</span>
            <span className="pp1-oee-trend-card__title">Weekly Efficiency Trend</span>
          </div>
          <div className="pp1-oee-trend-chart-wrap">
            {trendLoading && <p className="pp1-oee-trend-empty">Loading weekly trend…</p>}
            {trendError && !trendLoading && <p className="pp1-oee-trend-empty pp1-oee-trend-empty--error">{trendError}</p>}
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
    setChartLoading(true);
    setChartError(null);
    setReport({
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      data: [82.1, 85.4, 89.0, 87.5, 91.2, 88.5],
      fy: "FY 2026",
      from: "2026-01-01",
      to: "2026-06-30"
    });
    setChartLoading(false);
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
    <div className="pp1-otd-view" key={uid}>
      <div className="pp1-otd-chart-panel">
        <div className="pp1-otd-chart-panel__accent" />
        <div className="pp1-otd-chart-panel__hd">
          <div className="pp1-otd-chart-panel__tags">
            {/* <span className="pp1-otd-tag pp1-otd-tag--sales">Sales</span> */}
            {/* <span className="pp1-otd-tag pp1-otd-tag--sales">Line Chart</span> */}
          </div>
        </div>
        {/* <h3 className="pp1-otd-chart-panel__title">On-Time Delivery Trend</h3> */}
        {/* <div className="pp1-otd-chart-panel__date-row">
          <span className="pp1-otd-date-chip">{rangeLabel}</span>
          {daysSel > 0 && <span className="pp1-otd-date-badge">{daysSel}d</span>}
          {from && to && (
            <span className="pp1-otd-days-txt">{daysSel} days selected</span>
          )}
        </div> */}
        <div
          className="pp1-otd-canvas-wrap"
          style={{ opacity: chartBusy ? 0 : 1, transition: "opacity 0.3s" }}
        >
          {chartError && !chartBusy && (
            <p className="pp1-otd-chart-empty">{chartError}</p>
          )}
          {!chartError && hasChart && !chartBusy && (
            <ChartJsCanvas setup={setupChart} height={420} rebuildToken={rebuildToken} />
          )}
          {!chartError && !hasChart && !chartBusy && (
            <p className="pp1-otd-chart-empty">No OTD data for this date range.</p>
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
    <div className="pp1-prodout-view" key={uid}>
      <div className="pp1-prodout-card">
        <div className="pp1-prodout-card__accent" />
        <div className="pp1-prodout-hd">
          <div className="pp1-prodout-hd__left">
            <div className="pp1-prodout-hd__icon">📦</div>
            <div>
              <div className="pp1-prodout-hd__title">Production Output</div>
              {/* <div className="pp1-prodout-hd__sub">Total completed and scanned production units</div> */}
            </div>
          </div>
          <span className="pp1-prodout-chip pp1-prodout-chip--active">Active Log</span>
        </div>

        <div className="pp1-prodout-body">
          <div className="pp1-prodout-display">
            <div className="pp1-prodout-metric">
              <span className="pp1-prodout-metric__label">Completed Output</span>
              <span className="pp1-prodout-metric__value">{loading ? "..." : formattedOutput}</span>
            </div>

            <div className="pp1-prodout-visual">
              <svg className="pp1-prodout-gauge" viewBox="0 0 120 120">
                <circle className="pp1-prodout-gauge__bg" cx="60" cy="60" r="50" />
                <circle className="pp1-prodout-gauge__fill" cx="60" cy="60" r="50" />
                <g className="pp1-prodout-gauge__content">
                  <text className="pp1-prodout-gauge__icon" x="60" y="55">⚙️</text>
                  <text className="pp1-prodout-gauge__status" x="60" y="80">RUNNING</text>
                </g>
              </svg>
            </div>
          </div>

          <div className="pp1-prodout-highlight">
            <div className="pp1-prodout-highlight__item">
              <span className="pp1-prodout-highlight__bullet">●</span>
              <span><strong>Total Completed Output:</strong> Shows the grand total of finished goods and components successfully logged and verified from live shopfloor records.</span>
            </div>
            <div className="pp1-prodout-highlight__item">
              <span className="pp1-prodout-highlight__bullet">●</span>
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
    <div className="pp1-fiok-view" key={uid}>
      <div className="pp1-fiok-card">
        <div className="pp1-fiok-card__accent" />
        <div className="pp1-fiok-hd">
          <div className="pp1-fiok-hd__left">
            <div className="pp1-fiok-hd__icon">✨</div>
            <div>
              <div className="pp1-fiok-hd__title">Final Quality OK Quantity</div>
              {/* <div className="pp1-fiok-hd__sub">Finished goods meeting 100% QA compliance standards</div> */}
            </div>
          </div>
          <span className="pp1-fiok-chip pp1-fiok-chip--active">QA Approved</span>
        </div>

        <div className="pp1-fiok-body">
          <div className="pp1-fiok-display">
            <div className="pp1-fiok-metric">
              <span className="pp1-fiok-metric__label">Approved Quantity</span>
              <span className="pp1-fiok-metric__value">{loading ? "..." : formattedOk}</span>
              {/* <span className="pp1-fiok-metric__unit">compliant units</span> */}
            </div>

            <div className="pp1-fiok-visual">
              <svg className="pp1-fiok-gauge" viewBox="0 0 120 120">
                <circle className="pp1-fiok-gauge__bg" cx="60" cy="60" r="50" />
                <circle className="pp1-fiok-gauge__fill" cx="60" cy="60" r="50" />
                <g className="pp1-fiok-gauge__content">
                  <text className="pp1-fiok-gauge__icon" x="60" y="55">✅</text>
                  <text className="pp1-fiok-gauge__status" x="60" y="80">OK</text>
                </g>
              </svg>
            </div>
          </div>

          <div className="pp1-fiok-highlight">
            <div className="pp1-fiok-highlight__item">
              <span className="pp1-fiok-highlight__bullet">●</span>
              <span><strong>Guaranteed Quality:</strong> Represents only parts that successfully passed all dimensional, visual, and performance checks.</span>
            </div>
            <div className="pp1-fiok-highlight__item">
              <span className="pp1-fiok-highlight__bullet">●</span>
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
    setChartLoading(true);
    setChartError(null);
    setReport({
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      data: [75.4, 78.2, 81.0, 79.5, 83.2, 80.5],
      fy: "FY 2026",
      from: "2026-01-01",
      to: "2026-06-30"
    });
    setChartLoading(false);
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
              grid: { borderDash: [3, 3], color: "rgba(0, 0, 0, 0.05)" },
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
    <div className="pp1-opeff-view" key={uid}>
      <div className="pp1-opeff-chart-panel">
        <div className="pp1-opeff-chart-panel__accent" />
        <div className="pp1-opeff-chart-panel__hd">
          <div className="pp1-opeff-chart-panel__title-group">
            <h3 className="pp1-opeff-chart-panel__title">Operator Efficiency Analysis</h3>
            {/* <p className="pp1-opeff-chart-panel__subtitle">Overall Operator Efficiency Monthwise</p> */}
          </div>
        </div>
        <div
          className="pp1-opeff-canvas-wrap"
          style={{ opacity: chartBusy ? 0 : 1, transition: "opacity 0.3s" }}
        >
          {chartError && !chartBusy && (
            <p className="pp1-opeff-chart-empty">{chartError}</p>
          )}
          {!chartError && hasChart && !chartBusy && (
            <ChartJsCanvas setup={setupChart} height={300} rebuildToken={rebuildToken} />
          )}
          {!chartError && !hasChart && !chartBusy && (
            <p className="pp1-opeff-chart-empty">No Operator Efficiency data for this date range.</p>
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
            x: { beginAtZero: true, grid: { color: "rgba(0, 0, 0, 0.05)" }, ticks: { color: "#64748b", font: { size: 10 }, callback: (v) => fmtInr(v) } },
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
    <div className="pp1-po-view" key={uid}>
      {/* Header */}
      <div className="pp1-po-hd">
        <div className="pp1-po-hd__title">🛒 Purchase Order Status</div>
        {/* <div className="pp1-po-hd__sub">POmas · POdet · grn_mas · grn_det · CustMast — {rangeLine}</div> */}
      </div>

      {/* Row 1: Count tiles (5 across) */}
      <div className="pp1-po-tiles-count">
        {TILES.filter((t) => !t.isMoney).map((t) => (
          <div key={t.label} className="pp1-po-tile" style={{ background: t.bg, borderColor: `${t.c}30` }}>
            <div className="pp1-po-tile__icon">{t.icon}</div>
            <div className="pp1-po-tile__val" style={{ color: t.c }}>
              {loading ? "…" : Number(t.val).toLocaleString("en-IN")}
            </div>
            <div className="pp1-po-tile__lbl">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Row 2: Money tiles (2 across, wider) */}
      <div className="pp1-po-tiles-money">
        {TILES.filter((t) => t.isMoney).map((t) => (
          <div key={t.label} className="pp1-po-tile" style={{ background: t.bg, borderColor: `${t.c}30` }}>
            <div className="pp1-po-tile__icon">{t.icon}</div>
            <div className="pp1-po-tile__val" style={{ color: t.c }}>
              {loading ? "…" : fmtInr(t.val)}
            </div>
            <div className="pp1-po-tile__lbl">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {!loading && chartLabels.length > 0 && (
        <div className="pp1-po-chart-card">
          <div className="pp1-po-chart-title">PO Value by Type</div>
          <div style={{ height: chartH, position: "relative" }}>
            <ChartJsCanvas setup={setupChart} height={chartH} rebuildToken={rebuildToken} />
          </div>
        </div>
      )}

      {!loading && !rows.length && (
        <p className="pp1-po-empty">No PO lines in this date range.</p>
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
    <div className="pp1-cc-bot" key={uid}>
      <div className="pp1-cc-bot__hd">Purchase Orders</div>
      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300 }}>
        <table className="pp1-cc-tbl" style={{ minWidth: 820 }}>
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
              <tr><td colSpan={9} className="pp1-cc-tbl__empty" style={{ padding: 0 }}><D3TableLoader rows={4} cols={9} /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="pp1-cc-tbl__empty">No PO lines in this range.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.po_number}-${i}`} className="pp1-cc-tbl__tr">
                  <td className="pp1-cc-tbl__id">{r.po_number || "—"}</td>
                  <td><span className="pp1-cc-badge" style={{ background: "#f1f5f9", color: "#475569" }}>{r.po_type || "—"}</span></td>
                  <td style={{ fontWeight: 600, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.vendor_name || ""}>{(r.vendor_name || "").trim() || "—"}</td>
                  <td className="pp1-cc-tbl__narrow" title={r.material || ""}>{r.material || "—"}</td>
                  <td className="pp1-cc-tbl__mono">{r.po_qty || "—"}</td>
                  <td className="pp1-cc-tbl__mono" style={{ color: "#1a56db", fontWeight: 700 }}>{fmtInr(r.value)}</td>
                  <td className="pp1-cc-tbl__mono">{fmtDate(r.po_date)}</td>
                  <td className="pp1-cc-tbl__id">{(r.grn_no || "").trim() || "—"}</td>
                  <td className="pp1-cc-tbl__mono">{fmtDate(r.grn_date)}</td>
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
            x: { beginAtZero: true, grid: { color: "rgba(0, 0, 0, 0.05)" }, ticks: { color: "#64748b", font: { size: 10 } } },
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
    <div className="pp1-grn-view" key={uid}>
      <div className="pp1-grn-hd">
        <div className="pp1-grn-hd__title">GRN Pending Pipeline (Quick View)</div>
        <div className="pp1-grn-hd__sub">
          grn_mas · grn_det — pending inspection (insp = 0), deleted = 0 — {rangeLine}
        </div>
      </div>

      <div className="pp1-grn-stats">
        <div className="pp1-grn-stat pp1-grn-stat--blue">
          <div className="pp1-grn-stat__icon">📋</div>
          <div className="pp1-grn-stat__body">
            <div className="pp1-grn-stat__val">{loading ? "…" : totalCount.toLocaleString("en-IN")}</div>
            <div className="pp1-grn-stat__lbl">Total Records</div>
          </div>
        </div>
        <div className="pp1-grn-stat pp1-grn-stat--amber">
          <div className="pp1-grn-stat__icon">📦</div>
          <div className="pp1-grn-stat__body">
            <div className="pp1-grn-stat__val">{loading ? "…" : totalQtyFmt}</div>
            <div className="pp1-grn-stat__lbl">Total Qty</div>
          </div>
        </div>
      </div>

      {!loading && chartLabels.length > 0 && (
        <div className="pp1-grn-chart-card">
          <div className="pp1-grn-chart-title">Pending Qty by GRN Type</div>
          <div className="pp1-grn-chart-wrap" style={{ height: chartH, position: "relative" }}>
            <ChartJsCanvas setup={setupChart} height={chartH} rebuildToken={rebuildToken} />
          </div>
        </div>
      )}

      {!loading && !rows.length && (
        <p className="pp1-grn-empty">No pending GRN lines in this date range.</p>
      )}
    </div>
  );
}

function GrnPipelineBottomTable({ data, loading, uid }) {
  const rows = Array.isArray(data?.grn?.rows) ? data.grn.rows : [];
  return (
    <div className="pp1-cc-bot" key={uid}>
      <div className="pp1-cc-bot__hd">GRN Pending Lines</div>
      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300 }}>
        <table className="pp1-cc-tbl" style={{ minWidth: 640 }}>
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
              <tr><td colSpan={5} className="pp1-cc-tbl__empty" style={{ padding: 0 }}><D3TableLoader rows={4} cols={5} /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="pp1-cc-tbl__empty">No pending GRN lines in this range.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.grn_no}-${i}`} className="pp1-cc-tbl__tr">
                  <td className="pp1-cc-tbl__id">{r.grn_no || "—"}</td>
                  <td className="pp1-cc-tbl__mono">{r.grn_date || "—"}</td>
                  <td>
                    <span className="pp1-cc-badge" style={{ background: "#f1f5f9", color: "#475569" }}>
                      {r.type_ || r.type || "—"}
                    </span>
                  </td>
                  <td className="pp1-cc-tbl__narrow" title={r.material_ || r.material || ""}>
                    {r.material_ || r.material || "—"}
                  </td>
                  <td className="pp1-cc-tbl__mono">{r.qty_ || r.qty || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const CHART1_BASE = [
  { customer: "Customer A", orderValue: 13, salesValue: 7, pendingValue: 6 },
  { customer: "Customer B", orderValue: 22, salesValue: 18, pendingValue: 4 },
  { customer: "Customer C", orderValue: 18, salesValue: 12, pendingValue: 6 },
  { customer: "Customer D", orderValue: 15, salesValue: 8, pendingValue: 7 }
];

const CHART2_BASE = [
  { month: "Apr-26", date: "2026-04-15", "Customer A": 13, "Customer B": 22, "Customer C": 18, "Customer D": 15 },
  { month: "May-26", date: "2026-05-15", "Customer A": 20, "Customer B": 18, "Customer C": 16, "Customer D": 21 },
  { month: "Jun-26", date: "2026-06-15", "Customer A": 13, "Customer B": 22, "Customer C": 18, "Customer D": 15 }
];

function CustomerPoCompareView({ data, loading, uid, filters, onFilterChange, activeSlide, onActiveSlideChange, onClose, targetConfig, showTargetOnly, setShowTargetOnly }) {
  const [dateOpen, setDateOpen] = React.useState(false);
  const dateRangeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target)) {
        setDateOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filtered rows for dynamic chart display
  const chart1Data = React.useMemo(() => {
    let list = CHART1_BASE;
    if (filters.customer) {
      list = list.filter(r => r.customer === filters.customer);
    }
    return list;
  }, [filters.customer]);

  const chart2Data = React.useMemo(() => {
    let list = CHART2_BASE;
    if (filters.fromDate) {
      list = list.filter(m => m.date >= filters.fromDate);
    }
    if (filters.toDate) {
      list = list.filter(m => m.date <= filters.toDate);
    }
    return list;
  }, [filters.fromDate, filters.toDate]);

  const customers = ["Customer A", "Customer B", "Customer C", "Customer D"];
  const categories = ["Standard Parts", "Custom Fabrication"];

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      customer: "",
      poNumber: "",
      partNumber: "",
      category: "",
    });
    setShowTargetOnly(false);
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateStr;
  };

  const dateRangeDisplay = () => {
    if (filters.fromDate && filters.toDate) {
      return `${formatDateDisplay(filters.fromDate)} - ${formatDateDisplay(filters.toDate)}`;
    }
    if (filters.fromDate) {
      return `${formatDateDisplay(filters.fromDate)} - ...`;
    }
    if (filters.toDate) {
      return `... - ${formatDateDisplay(filters.toDate)}`;
    }
    return "Select Date Range...";
  };

  // Chart Setup 1: Customer Wise PO Value vs Sales Value vs Pending Value (Multi-Line Chart)
  const setupLineChart = React.useCallback((canvas) => {
    const labels = chart1Data.map(r => r.customer);
    const orderValues = chart1Data.map(r => r.orderValue);
    const salesValues = chart1Data.map(r => r.salesValue);
    const pendingValues = chart1Data.map(r => r.pendingValue);
    const salesTarget = targetConfig?.customer_po?.salesTarget ?? 25;
    const orderValueAch = targetConfig?.customer_po?.orderValueAch ?? 85;

    return new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Order Value",
            data: orderValues,
            borderColor: "rgba(59, 130, 246, 1)", // Blue
            backgroundColor: "rgba(59, 130, 246, 0.05)",
            borderWidth: 2.5,
            tension: 0.3,
            pointBackgroundColor: "rgba(59, 130, 246, 1)",
            pointRadius: 4.5,
            fill: true,
            hidden: showTargetOnly
          },
          {
            label: "Sales Value",
            data: salesValues,
            borderColor: "rgba(16, 185, 129, 1)", // Green
            backgroundColor: "rgba(16, 185, 129, 0.05)",
            borderWidth: 2.5,
            tension: 0.3,
            pointBackgroundColor: "rgba(16, 185, 129, 1)",
            pointRadius: 4.5,
            fill: true,
            hidden: showTargetOnly
          },
          {
            label: "Pending Order Value",
            data: pendingValues,
            borderColor: "rgba(245, 158, 11, 1)", // Amber
            backgroundColor: "rgba(245, 158, 11, 0.05)",
            borderWidth: 2.5,
            tension: 0.3,
            pointBackgroundColor: "rgba(245, 158, 11, 1)",
            pointRadius: 4.5,
            fill: true,
            hidden: showTargetOnly
          },
          {
            label: "Sales Target",
            data: labels.map(() => salesTarget),
            borderColor: "rgba(239, 68, 68, 0.85)",
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            pointHitRadius: 20,
            pointHoverRadius: 6,
            fill: false,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements, chart) => {
          if (elements && elements.length > 0) {
            const firstElement = elements[0];
            const datasetIndex = firstElement.datasetIndex;
            const clickedLabel = chart.data.datasets[datasetIndex].label;
            if (clickedLabel === "Sales Target") {
              setShowTargetOnly(prev => !prev);
            }
          }
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#475569", font: { size: 9 }, boxWidth: 10, padding: 6 },
            onClick: (event, legendItem, legend) => {
              if (legendItem.text === "Sales Target") {
                setShowTargetOnly(prev => !prev);
              } else {
                const index = legendItem.datasetIndex;
                const ci = legend.chart;
                if (ci.isDatasetVisible(index)) {
                  ci.hide(index);
                  legendItem.hidden = true;
                } else {
                  ci.show(index);
                  legendItem.hidden = false;
                }
              }
            }
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            padding: 8,
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ₹${context.raw} L`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "#64748b", font: { size: 9, weight: 600 } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#64748b",
              font: { size: 9 },
              callback: (val) => `₹${val} L`
            },
            grid: { color: "rgba(0, 0, 0, 0.05)" }
          }
        }
      }
    });
  }, [chart1Data, targetConfig, showTargetOnly]);

  // Chart Setup 2: Month Wise Customer Order Trend (Clustered Column Chart)
  const setupClusteredChart = React.useCallback((canvas) => {
    const labels = chart2Data.map(r => r.month);

    let customersList = ["Customer A", "Customer B", "Customer C", "Customer D"];
    if (filters.customer) {
      customersList = [filters.customer];
    }

    const colors = {
      "Customer A": "rgba(59, 130, 246, 0.85)", // Blue
      "Customer B": "rgba(16, 185, 129, 0.85)", // Green
      "Customer C": "rgba(139, 92, 246, 0.85)", // Purple
      "Customer D": "rgba(244, 63, 94, 0.85)"  // Rose
    };

    const salesTarget = targetConfig?.customer_po?.salesTarget ?? 25;
    const datasets = [
      ...customersList.map(cust => ({
        label: cust,
        data: chart2Data.map(r => r[cust]),
        backgroundColor: colors[cust],
        borderRadius: 4,
        hidden: showTargetOnly
      })),
      {
        type: "line",
        label: "Sales Target",
        data: labels.map(() => salesTarget),
        borderColor: "rgba(239, 68, 68, 0.85)",
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        pointHitRadius: 20,
        pointHoverRadius: 6,
        fill: false,
        tension: 0
      }
    ];

    return new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements, chart) => {
          if (elements && elements.length > 0) {
            const firstElement = elements[0];
            const datasetIndex = firstElement.datasetIndex;
            const clickedLabel = chart.data.datasets[datasetIndex].label;
            if (clickedLabel === "Sales Target") {
              setShowTargetOnly(prev => !prev);
            }
          }
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#475569", font: { size: 9 }, boxWidth: 10, padding: 6 },
            onClick: (event, legendItem, legend) => {
              if (legendItem.text === "Sales Target") {
                setShowTargetOnly(prev => !prev);
              } else {
                const index = legendItem.datasetIndex;
                const ci = legend.chart;
                if (ci.isDatasetVisible(index)) {
                  ci.hide(index);
                  legendItem.hidden = true;
                } else {
                  ci.show(index);
                  legendItem.hidden = false;
                }
              }
            }
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            padding: 8,
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ₹${context.raw} L`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "#64748b", font: { size: 9, weight: 600 } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#64748b",
              font: { size: 9 },
              callback: (val) => `₹${val} L`
            },
            grid: { color: "rgba(0, 0, 0, 0.05)" }
          }
        }
      }
    });
  }, [chart2Data, filters.customer, targetConfig, showTargetOnly]);

  const slides = [
    {
      title: "Customer Wise PO Value vs Sales Value vs Pending Value",
      purpose: "Value Analysis (Lakhs)",
      type: "line",
      setup: setupLineChart,
    },
    {
      title: "Month Wise Customer Order Trend",
      purpose: "Monthly Trend Analysis (Lakhs)",
      type: "bar",
      setup: setupClusteredChart,
    }
  ];

  const nextSlide = () => {
    onActiveSlideChange((prev) => (prev + 1) % slides.length);
  };
  const prevSlide = () => {
    onActiveSlideChange((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="pp1-action-detail" key={uid} style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-action-detail__header" style={{ "--act-color": "var(--pp1-blue)", padding: "10px 14px", gap: "10px" }}>
        <div className="pp1-action-detail__icon-box" style={{ width: "32px", height: "32px", borderRadius: "8px", fontSize: "16px" }}>
          <Scale size={16} style={{ color: "#fff" }} />
        </div>
        <div className="pp1-action-detail__meta" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <p className="pp1-action-detail__title" style={{ fontSize: "13.5px", fontWeight: 800, margin: 0 }}>Customer PO vs Sales Value Analysis</p>
          <span className="pp1-badge pp1-badge--medium" style={{ padding: "1px 6px", fontSize: "9px" }}>Medium Priority</span>
        </div>
        <button type="button" className="pp1-action-detail__close" style={{ width: "24px", height: "24px", marginLeft: "auto" }} onClick={onClose}>✕</button>
      </div>

      <div className="pp1-action-detail__body" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px" }}>
        {/* Filters Bar */}
        <div className="pp1-filters-bar">
          {/* Date Range Picker */}
          <div className="pp1-filter-group pp1-filter-group--date-range" ref={dateRangeRef}>
            <label className="pp1-filter-label">Date Range</label>
            <div
              className="pp1-filter-input pp1-filter-input--date-range-trigger"
              onClick={() => setDateOpen(!dateOpen)}
            >
              <span>{dateRangeDisplay()}</span>
              <Calendar size={13} className="pp1-filter-icon" />
            </div>
            {dateOpen && (
              <div className="pp1-date-popup">
                <div className="pp1-date-popup-inputs">
                  <div className="pp1-date-popup-field">
                    <label>From</label>
                    <input
                      type="date"
                      value={filters.fromDate}
                      onChange={e => handleInputChange("fromDate", e.target.value)}
                    />
                  </div>
                  <div className="pp1-date-popup-field">
                    <label>To</label>
                    <input
                      type="date"
                      value={filters.toDate}
                      onChange={e => handleInputChange("toDate", e.target.value)}
                    />
                  </div>
                </div>
                <div className="pp1-date-popup-footer">
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange("fromDate", "");
                      handleInputChange("toDate", "");
                      setDateOpen(false);
                    }}
                  >
                    Clear
                  </button>
                  <button type="button" className="pp1-btn-apply" onClick={() => setDateOpen(false)}>Done</button>
                </div>
              </div>
            )}
          </div>

          {/* Customer Dropdown */}
          <div className="pp1-filter-group">
            <label className="pp1-filter-label">Customer</label>
            <select
              className="pp1-filter-input"
              value={filters.customer}
              onChange={e => handleInputChange("customer", e.target.value)}
            >
              <option value="">All Customers</option>
              {customers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Category Dropdown (Mocked) */}
          {/* <div className="pp1-filter-group">
            <label className="pp1-filter-label">Category</label>
            <select
              className="pp1-filter-input"
              value={filters.category}
              onChange={e => handleInputChange("category", e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div> */}

          {/* PO Number Search (Mocked) */}
          <div className="pp1-filter-group">
            <label className="pp1-filter-label">PO Number</label>
            <input
              type="text"
              className="pp1-filter-input"
              placeholder="PO No..."
              value={filters.poNumber}
              onChange={e => handleInputChange("poNumber", e.target.value)}
            />
          </div>

          {/* Part Number Search (Mocked) */}
          <div className="pp1-filter-group">
            <label className="pp1-filter-label">Part Number</label>
            <input
              type="text"
              className="pp1-filter-input"
              placeholder="Part No..."
              value={filters.partNumber}
              onChange={e => handleInputChange("partNumber", e.target.value)}
            />
          </div>

          {/* Reset Button */}
          <button
            type="button"
            className="pp1-filter-btn pp1-filter-btn--reset"
            onClick={handleReset}
            style={{ flexShrink: 0, height: "28px" }}
          >
            Reset
          </button>
        </div>

        {/* Chart Carousel */}
        <div className="pp1-chart-carousel">
          <div className="pp1-carousel-header">
            <div className="pp1-carousel-title-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="pp1-carousel-title">{slides[activeSlide].title}</span>
                <span className="pp1-carousel-subtitle">{slides[activeSlide].purpose}</span>
              </div>
              {showTargetOnly && (
                <span
                  className="pp1-badge pp1-badge--high"
                  style={{
                    cursor: "pointer",
                    fontSize: "9px",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: "0 1px 3px rgba(239,68,68,0.2)"
                  }}
                  onClick={() => setShowTargetOnly(false)}
                >
                  🎯 Target View Active ✕
                </span>
              )}
            </div>

            <div className="pp1-carousel-nav">
              <button
                type="button"
                className="pp1-carousel-btn"
                onClick={prevSlide}
                aria-label="Previous Chart"
              >
                <ChevronLeft size={14} />
              </button>

              <div className="pp1-carousel-dots">
                {slides.map((_, idx) => (
                  <span
                    key={idx}
                    className={`pp1-carousel-dot ${idx === activeSlide ? "active" : ""}`}
                    onClick={() => onActiveSlideChange(idx)}
                  />
                ))}
              </div>

              <button
                type="button"
                className="pp1-carousel-btn"
                onClick={nextSlide}
                aria-label="Next Chart"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="pp1-carousel-content">
            <div className="pp1-carousel-chart-wrap">
              <ChartJsCanvas
                setup={slides[activeSlide].setup}
                height={190}
                rebuildToken={`${activeSlide}|${chart1Data.length}|${chart2Data.length}|${JSON.stringify(filters)}|${targetConfig?.customer_po?.salesTarget}|${showTargetOnly}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerPoCompareBottomTable({ data, loading, uid, filters, activeSlide, onActiveSlideChange, showTargetOnly, targetConfig }) {
  const activeTab = activeSlide === 0 ? "summary" : "trend";
  const salesTarget = targetConfig?.customer_po?.salesTarget ?? 25;

  // Process data for Table 1 (Customer PO Value Summary)
  const table1Rows = React.useMemo(() => {
    let list = CHART1_BASE;
    if (filters.customer) {
      list = list.filter(r => r.customer === filters.customer);
    }
    return list;
  }, [filters.customer]);

  // Process data for Table 2 (Month Wise Customer Order Trend)
  const processedTable2 = React.useMemo(() => {
    let cols = ["Month", "Customer A (Lakhs)", "Customer B (Lakhs)", "Customer C (Lakhs)", "Customer D (Lakhs)"];
    let rows = [
      ["Apr-26", 13, 22, 18, 15],
      ["May-26", 20, 18, 16, 21],
      ["Jun-26", 13, 22, 18, 15]
    ];

    if (showTargetOnly) {
      cols = ["Month", "Sales Target (Lakhs)"];
      rows = [
        ["Apr-26", salesTarget],
        ["May-26", salesTarget],
        ["Jun-26", salesTarget]
      ];
    } else {
      // Apply customer filter to Table 2
      if (filters.customer) {
        const custIdx = ["Customer A", "Customer B", "Customer C", "Customer D"].indexOf(filters.customer);
        if (custIdx !== -1) {
          cols = ["Month", `${filters.customer} (Lakhs)`];
          rows = rows.map(r => [r[0], r[custIdx + 1]]);
        }
      }
    }

    // Apply date range filter to Table 2
    const dateMap = { "Apr-26": "2026-04-15", "May-26": "2026-05-15", "Jun-26": "2026-06-15" };
    if (filters.fromDate) {
      rows = rows.filter(r => dateMap[r[0]] >= filters.fromDate);
    }
    if (filters.toDate) {
      rows = rows.filter(r => dateMap[r[0]] <= filters.toDate);
    }
    return { columns: cols, rows };
  }, [filters.fromDate, filters.toDate, filters.customer, showTargetOnly, salesTarget]);

  return (
    <div className="pp1-cc-bot" key={uid}>
      <div className="pp1-cc-bot__hd" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "18px", borderBottom: "1px solid rgba(0,0,0,0.08)", width: "100%", paddingBottom: "4px" }}>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "summary" ? "2.5px solid var(--pp1-blue)" : "none",
              color: activeTab === "summary" ? "var(--pp1-blue)" : "var(--pp1-text-3)",
              fontWeight: 700,
              fontSize: "12px",
              paddingBottom: "6px",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
            onClick={() => onActiveSlideChange(0)}
          >
            Customer PO Value Summary
          </button>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "trend" ? "2.5px solid var(--pp1-blue)" : "none",
              color: activeTab === "trend" ? "var(--pp1-blue)" : "var(--pp1-text-3)",
              fontWeight: 700,
              fontSize: "12px",
              paddingBottom: "6px",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
            onClick={() => onActiveSlideChange(1)}
          >
            Month Wise Customer Order Trend
          </button>
        </div>
      </div>

      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        {activeTab === "summary" ? (
          <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
            <thead>
              <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
                <th>Customer</th>
                {showTargetOnly ? (
                  <th style={{ textAlign: "right", color: "#b91c1c" }}>Sales Target (Lakhs)</th>
                ) : (
                  <>
                    <th style={{ textAlign: "right" }}>Order Value (Lakhs)</th>
                    <th style={{ textAlign: "right" }}>Sales Value (Lakhs)</th>
                    <th style={{ textAlign: "right" }}>Pending Order Value (Lakhs)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {table1Rows.map((r, idx) => (
                <tr key={idx} className="pp1-cc-tbl__tr">
                  <td className="pp1-cc-tbl__bold" style={{ fontWeight: 700 }}>{r.customer}</td>
                  {showTargetOnly ? (
                    <td style={{ textAlign: "right", fontWeight: 600, color: "#b91c1c" }}>₹{salesTarget.toFixed(2)} L</td>
                  ) : (
                    <>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>₹{r.orderValue.toFixed(2)} L</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: "var(--pp1-green)" }}>₹{r.salesValue.toFixed(2)} L</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: r.pendingValue > 0 ? "var(--pp1-amber)" : "var(--pp1-text-3)" }}>₹{r.pendingValue.toFixed(2)} L</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
            <thead>
              <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
                {processedTable2.columns.map((col, idx) => (
                  <th key={idx} style={{ textAlign: idx > 0 ? "right" : "left", color: showTargetOnly && idx > 0 ? "#b91c1c" : undefined }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processedTable2.rows.length === 0 ? (
                <tr><td colSpan={processedTable2.columns.length} className="pp1-cc-tbl__empty">No data matches the selected filters.</td></tr>
              ) : (
                processedTable2.rows.map((row, idx) => (
                  <tr key={idx} className="pp1-cc-tbl__tr">
                    <td className="pp1-cc-tbl__mono" style={{ fontWeight: 600 }}>{row[0]}</td>
                    {row.slice(1).map((val, cellIdx) => (
                      <td key={cellIdx} style={{ textAlign: "right", fontWeight: 600, color: showTargetOnly ? "#b91c1c" : "var(--pp1-blue)" }}>
                        {val !== undefined ? `₹${val.toFixed(2)} L` : "—"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── Inspection View (shared: injob / inter / final) ─────── */
function InspBarTrack({ pct, targetPct, fill }) {
  const clampedPct = Math.min(100, Math.max(0, Number(pct) || 0));
  const targetX = Math.min(100, Math.max(0, Number(targetPct) || 0));
  return (
    <div className="pp1-insp-bar-track">
      <div className="pp1-insp-bar-fill" style={{ width: `${clampedPct}%`, background: fill }} />
      <div className="pp1-insp-bar-target" style={{ left: `${targetX}%` }} />
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
    <div className="pp1-insp-view" key={uid}>
      <div className="pp1-insp-hd">
        <div className="pp1-insp-hd__left">
          <div className="pp1-insp-hd__icon">{icon}</div>
          <div>
            <div className="pp1-insp-hd__title">{title}</div>
            <div className="pp1-insp-hd__sub">{sub}</div>
          </div>
        </div>
        <span className={`pp1-insp-chip ${chipOk ? "pp1-insp-chip--ok" : "pp1-insp-chip--warn"}`}>{chipLabel}</span>
      </div>

      <div className="pp1-insp-body">
        <div className="pp1-insp-col">
          <div className="pp1-insp-metric-lbl">Rejection</div>
          <div className="pp1-insp-metric-pcs" style={{ color: "#ef4444" }}>
            {loading ? "\u2026" : Math.round(totalRej).toLocaleString()} <span>pcs</span>
          </div>
          <div className="pp1-insp-bar-row">
            <InspBarTrack pct={rejPct ?? 0} targetPct={2} fill="#ef4444" />
            <span className="pp1-insp-bar-pct" style={{ color: "#ef4444" }}>{pctLabel(rejPct)}</span>
          </div>
        </div>
        <div className="pp1-insp-vdiv" />
        <div className="pp1-insp-col">
          <div className="pp1-insp-metric-lbl">Rework</div>
          <div className="pp1-insp-metric-pcs" style={{ color: rwkColor }}>
            {loading ? "\u2026" : Math.round(totalRwk).toLocaleString()} <span>pcs</span>
          </div>
          <div className="pp1-insp-bar-row">
            <InspBarTrack pct={rwkPct ?? 0} targetPct={type === "final_inspection" ? 2 : 1.5} fill={rwkFill} />
            <span className="pp1-insp-bar-pct" style={{ color: rwkColor }}>{pctLabel(rwkPct)}</span>
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
          <div className="pp1-insp-viz">
            <div className="pp1-insp-viz__label">Rejection vs Rework</div>
            <div className="pp1-insp-viz__bar">
              {rejV > 0 && (
                <div className="pp1-insp-viz__seg pp1-insp-viz__seg--rej" style={{ width: `${rP}%` }}>
                  <span className="pp1-insp-viz__seg-tip">{rP}%</span>
                </div>
              )}
              {rwkV > 0 && (
                <div className="pp1-insp-viz__seg pp1-insp-viz__seg--rwk" style={{ width: `${wP}%`, background: rwkFill }}>
                  <span className="pp1-insp-viz__seg-tip">{wP}%</span>
                </div>
              )}
            </div>
            <div className="pp1-insp-viz__legend">
              <span className="pp1-insp-viz__dot" style={{ background: "#ef4444" }} />
              <span className="pp1-insp-viz__leg-lbl">Rejection {rejV.toLocaleString()} pcs</span>
              <span className="pp1-insp-viz__dot" style={{ background: rwkFill }} />
              <span className="pp1-insp-viz__leg-lbl">Rework {rwkV.toLocaleString()} pcs</span>
            </div>
          </div>
        );
      })()}

      <div className="pp1-insp-footer">
        <span className="pp1-insp-footer-stat">{footer}</span>
        <span className={`pp1-insp-chip pp1-insp-chip--footer ${chipOk ? "pp1-insp-chip--ok" : "pp1-insp-chip--warn"}`}>
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
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="pp1-spark">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LineChart({ data, uid }) {
  if (!data?.xLabels?.length) return <p className="pp1-panel__hint">No trend data.</p>;
  const W = 480, H = 160, pL = 36, pB = 28, pT = 10, pR = 12;
  const cW = W - pL - pR, cH = H - pB - pT;
  const allVals = data.series.flatMap((s) => s.data);
  const minV = Math.min(...allVals, 0) - 5;
  const maxV = Math.max(...allVals, 100) + 5;
  const toX = (i) => pL + (i / Math.max(data.xLabels.length - 1, 1)) * cW;
  const toY = (v) => pT + cH - ((v - minV) / (maxV - minV || 1)) * cH;
  const mkPath = (pts) => pts.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="pp1-line-chart" key={uid}>
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
  if (!bars?.length) return <p className="pp1-panel__hint">No chart data.</p>;
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="pp1-bar-chart" key={uid}>
      {bars.map((b, i) => (
        <div key={b.label} className="pp1-bc-row" style={{ "--bc-delay": `${i * 55}ms` }}>
          <span className="pp1-bc-label">{b.label}</span>
          <div className="pp1-bc-track">
            <div className="pp1-bc-fill" style={{ "--bc-w": `${(b.value / max) * 100}%`, background: b.color }}>
              <span className="pp1-bc-val">{raw ? (b.display ?? b.value) : `${b.value}%`}</span>
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
    <div className="pp1-donut-wrap" key={uid}>
      <svg width="136" height="136" viewBox="0 0 136 136">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(26,84,212,.07)" strokeWidth={sw} />
        {slices.map((s) => (
          <circle key={s.label} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={sw}
            strokeDasharray={`${s.dash} ${s.gap}`} strokeDashoffset={-s.offset + circ * 0.25} className="pp1-donut-slice" />
        ))}
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize="19" fontWeight="800" fill="#1a2a5e">{total.toFixed(0)}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize="10" fill="#94a3b8">total %</text>
      </svg>
      <div className="pp1-donut-legend">
        {segments.map((s) => (
          <div key={s.label} className="pp1-legend-row">
            <span className="pp1-legend-dot" style={{ background: s.color }} />
            <span className="pp1-legend-label">{s.label}</span>
            <span className="pp1-legend-val">{s.value}%</span>
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
    <div className="pp1-insights">
      {insights.map((ins, i) => (
        <div key={i} className={`pp1-insight pp1-insight--${ins.type}`} style={{ "--ins-delay": `${i * 65}ms` }}>
          <span>{ico[ins.type]}</span>
          <span>{ins.text}</span>
        </div>
      ))}
    </div>
  );
}

function CenterKpiDetail({ detail, uid, loading }) {
  if (!detail) return (
    <div className="pp1-detail pp1-detail--empty" style={{ display: "flex", flexDirection: "column", gap: "12px", justifyContent: "center", alignItems: "center", flex: 1, width: "100%", border: "1px dashed rgba(45, 109, 232, 0.2)", borderRadius: "12px", background: "rgba(45, 109, 232, 0.015)", padding: "24px", boxSizing: "border-box" }}>
      {loading ? (
        <D3ChartLoader label="Loading data…" height={320} />
      ) : (
        <>
          <ClipboardList size={40} style={{ color: "var(--pp1-blue)", opacity: 0.65 }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--pp1-text-2)", margin: 0 }}>No Card Selected</p>
          <p className="pp1-panel__hint" style={{ margin: 0, fontSize: "11px", textAlign: "center" }}>Click a card from the panel to explore details</p>
        </>
      )}
    </div>
  );
  const d = detail;
  return (
    <div className="pp1-detail" key={uid}>
      <div className="pp1-detail__titlebar">
        <span className="pp1-detail__bullet" style={{ background: d.color }} />
        <p className="pp1-detail__heading">{d.heading}</p>
      </div>
      {d.kpis?.length > 0 && (
        <div className="pp1-detail__strip">
          {d.kpis.map((k, i) => (
            <div key={k.label} className="pp1-detail__chip" style={{ "--chip-color": k.color, "--chip-delay": `${i * 55}ms` }}>
              <span className="pp1-detail__chip-icon">{k.icon}</span>
              <p className="pp1-detail__chip-val">{k.value}<span className="pp1-detail__chip-unit"> {k.unit}</span></p>
              <p className="pp1-detail__chip-lbl">{k.label}</p>
            </div>
          ))}
        </div>
      )}
      {d.chartMode === "quality" && d.donut && (
        <div className="pp1-charts-zone">
          <div className="pp1-chart-card">
            <p className="pp1-chart-card__lbl">{d.donut.label}</p>
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
    <div className="pp1-action-detail" key={uid}>
      <div className="pp1-action-detail__header" style={{ "--act-color": color }}>
        <div className="pp1-action-detail__icon-box">
          {typeof action.icon === "string" ? action.icon : React.createElement(action.icon, { size: 22 })}
        </div>
        <div className="pp1-action-detail__meta">
          <p className="pp1-action-detail__title">{action.title}</p>
          <span className={`pp1-badge pp1-badge--${view.priority}`}>
            {view.priority.charAt(0).toUpperCase() + view.priority.slice(1)} Priority
          </span>
        </div>
        <button type="button" className="pp1-action-detail__close" onClick={onClose}>✕</button>
      </div>
      <div className="pp1-action-detail__body">
        <div className="pp1-action-detail__time-row">
          <span className="pp1-action-detail__time-icon">🕐</span>
          <span className="pp1-action-detail__time-val">{view.time}</span>
        </div>
        <div className="pp1-action-detail__desc-box">
          <p className="pp1-action-detail__desc-label">Summary</p>
          <p className="pp1-action-detail__desc">{view.desc}</p>
        </div>
      </div>
    </div>
  );
}

function BottomKpiPanel({ bottom, uid }) {
  if (!bottom) return null;
  const b = bottom;
  return (
    <div className="pp1-bottom" key={uid}>
      <div className="pp1-bottom__table-wrap">
        <p className="pp1-bottom__section-lbl">{b.tableTitle}</p>
        <div className="pp1-bottom__table-scroll">
          <table className="pp1-table">
            <thead><tr>{b.columns.map((col) => <th key={col} className="pp1-table__th">{col}</th>)}</tr></thead>
            <tbody>
              {b.rows.map((row, ri) => (
                <tr key={ri} className="pp1-table__tr">
                  {row.map((cell, ci) => <td key={ci} className="pp1-table__td">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="pp1-bottom__recs-wrap">
        <p className="pp1-bottom__section-lbl">Notes</p>
        <div className="pp1-bottom__recs">
          {b.recs.map((r, i) => (
            <div key={i} className="pp1-rec"><span className="pp1-rec__icon">{r.icon}</span><span className="pp1-rec__text">{r.text}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton shimmer placeholder ───────────────────────────── */
function D3Skeleton({ lines = 3, width = "100%" }) {
  return (
    <div className="pp1-skel" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="pp1-skel__line"
          style={{ width: i === lines - 1 ? "60%" : width, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}

/* ── Premium chart loading animation ───────────────────────── */
function D3ChartLoader({ label = "Loading chart…", height = 340 }) {
  return (
    <div className="pp1-chart-loader" style={{ height }} aria-label={label}>
      {/* Animated bar chart skeleton */}
      <div className="pp1-chart-loader__bars">
        {[0.4, 0.7, 0.55, 0.9, 0.65, 0.8, 0.5, 0.75, 0.6, 0.85].map((h, i) => (
          <div
            key={i}
            className="pp1-chart-loader__bar"
            style={{ "--bar-h": h, "--bar-i": i }}
          />
        ))}
      </div>
      {/* Pulsing ring + label */}
      <div className="pp1-chart-loader__center">
        <div className="pp1-chart-loader__ring">
          <div className="pp1-chart-loader__ring-inner" />
          <svg className="pp1-chart-loader__ring-svg" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none" stroke="url(#ld-grad)" strokeWidth="3" strokeLinecap="round" />
            <defs>
              <linearGradient id="ld-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <p className="pp1-chart-loader__label">{label}</p>
      </div>
      {/* Shimmer axis lines */}
      <div className="pp1-chart-loader__axes">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="pp1-chart-loader__axis-line" style={{ "--ax-i": i }} />
        ))}
      </div>
    </div>
  );
}

/* ── Premium table loading animation ───────────────────────── */
function D3TableLoader({ rows = 5, cols = 4 }) {
  return (
    <div className="pp1-tbl-loader" aria-label="Loading data…">
      {/* Header shimmer */}
      <div className="pp1-tbl-loader__header">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="pp1-tbl-loader__hcell" style={{ "--tc-i": i }} />
        ))}
      </div>
      {/* Row shimmers */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="pp1-tbl-loader__row" style={{ "--tr-i": ri }}>
          {Array.from({ length: cols }).map((_, ci) => (
            <div key={ci} className="pp1-tbl-loader__cell" style={{ "--tc-i": ci, width: ci === 0 ? "35%" : "auto" }} />
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
      <div className="pp1-ct-skeleton">
        <div className="pp1-ct-skeleton__header">
          <div className="pp1-ct-skel-block pp1-ct-skel-block--icon" />
          <div className="pp1-ct-skel-block pp1-ct-skel-block--title" />
        </div>
        <div className="pp1-ct-skeleton__body">
          <div className="pp1-ct-skel-block pp1-ct-skel-block--display" />
          <div className="pp1-ct-skel-block pp1-ct-skel-block--row" />
          <div className="pp1-ct-skel-block pp1-ct-skel-block--row pp1-ct-skel-block--row-sm" />
        </div>
      </div>
    );
  }
  return (
    <div key={uid} className="pp1-ct-reveal pp1-ct-reveal--in">
      {children}
    </div>
  );
}

/* ── Generic Premium Dashboard View & Bottom Table Helpers ── */
function PremiumDashboardView({ title, icon: Icon, color, kpis, setupChart, chartHeight = 220, rangeHint, onClose, rebuildToken, chartControls, children }) {
  return (
    <div className="pp1-action-detail pp1-ct-reveal pp1-ct-reveal--in" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-action-detail__header" style={{ "--act-color": color, padding: "10px 14px", gap: "10px" }}>
        <div className="pp1-action-detail__icon-box" style={{ width: "32px", height: "32px", borderRadius: "8px", fontSize: "16px", background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} style={{ color: "#fff" }} />
        </div>
        <div className="pp1-action-detail__meta" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <p className="pp1-action-detail__title" style={{ fontSize: "13.5px", fontWeight: 800, margin: 0 }}>{title}</p>
        </div>
        <button type="button" className="pp1-action-detail__close" style={{ width: "24px", height: "24px", marginLeft: "auto" }} onClick={onClose}>✕</button>
      </div>

      <div className="pp1-action-detail__body" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px" }}>
        {children}
        {/* KPI Strip */}
        {kpis && kpis.length > 0 && (
          <div className="pp1-detail__strip" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px" }}>
            {kpis.map((k, i) => (
              <div key={i} className="pp1-detail__chip" style={{ "--chip-color": k.color, padding: "8px 12px", borderRadius: "8px", background: k.color + "10", border: `1px solid ${k.color}20`, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <span className="pp1-detail__chip-icon" style={{ fontSize: "14px" }}>{k.icon}</span>
                  <p className="pp1-detail__chip-val" style={{ fontSize: typeof k.value === "string" && k.value.includes("\n") ? "13px" : "15px", fontWeight: 700, margin: "2px 0 0 0", lineHeight: 1.2, whiteSpace: "pre-line" }}>{k.value}</p>
                </div>
                <p className="pp1-detail__chip-lbl" style={{ fontSize: "9.5px", color: "var(--pp1-text-3)", margin: "4px 0 0 0", textTransform: "uppercase", fontWeight: 600 }}>{k.label}</p>
              </div>
            ))}
          </div>
        )}

        {chartControls}

        {/* Chart Card */}
        {setupChart && (
          <div className="pp1-dt-card" style={{ padding: "14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)", background: "#fff" }}>
            <div className="pp1-dt-card__hd" style={{ marginBottom: "10px" }}>
              <div className="pp1-dt-card__title" style={{ fontSize: "11px", fontWeight: 700, color: "var(--pp1-text-3)" }}>{rangeHint.includes("-") && !rangeHint.includes("Breakdown") ? `Trend Analysis (${rangeHint})` : rangeHint}</div>
            </div>
            <div className="pp1-dt-chart-wrap" style={{ height: chartHeight, position: "relative" }}>
              <ChartJsCanvas setup={setupChart} height={chartHeight} rebuildToken={rebuildToken || title} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PremiumDashboardBottomTable({ title, columns, rows }) {
  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd">{title}</div>
      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300 }}>
        <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
          <thead>
            <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#f2f6fe",
                    zIndex: 10,
                    textAlign: idx > 2 && (col.toLowerCase().includes("qty") || col.toLowerCase().includes("value") || col.toLowerCase().includes("hours") || col.toLowerCase().includes("hour") || col.toLowerCase().includes("rate") || col.toLowerCase().includes("ratio") || col.toLowerCase().includes("%") || col.toLowerCase().includes("day") || col.toLowerCase().includes("month") || col.toLowerCase().includes("loss")) ? "right" : "left"
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="pp1-cc-tbl__empty">No data available.</td></tr>
            ) : (
              rows.map((row, ri) => (
                <tr key={ri} className="pp1-cc-tbl__tr">
                  {row.map((cell, ci) => {
                    const isRightAligned = ci > 2 && (columns[ci].toLowerCase().includes("qty") || columns[ci].toLowerCase().includes("value") || columns[ci].toLowerCase().includes("hours") || columns[ci].toLowerCase().includes("hour") || columns[ci].toLowerCase().includes("rate") || columns[ci].toLowerCase().includes("ratio") || columns[ci].toLowerCase().includes("%") || columns[ci].toLowerCase().includes("day") || columns[ci].toLowerCase().includes("month") || columns[ci].toLowerCase().includes("loss"));
                    const isStatus = columns[ci].toLowerCase() === "status";
                    if (isStatus) {
                      const statusColors = {
                        "Completed": { bg: "#d1fae5", c: "#065f46" },
                        "In Progress": { bg: "#fef3c7", c: "#92400e" },
                        "Pending": { bg: "#fee2e2", c: "#991b1b" },
                        "Active": { bg: "#d1fae5", c: "#065f46" },
                        "Resolved": { bg: "#d1fae5", c: "#065f46" },
                        "Open": { bg: "#fee2e2", c: "#991b1b" },
                        "Closed": { bg: "#f1f5f9", c: "#475569" },
                        "Normal": { bg: "#d1fae5", c: "#065f46" },
                        "Overload": { bg: "#fee2e2", c: "#991b1b" }
                      };
                      const stcfg = statusColors[cell] || { bg: "#f1f5f9", c: "#475569" };
                      return (
                        <td key={ci} style={{ textAlign: "center" }}>
                          <span className="pp1-cc-badge" style={{ background: stcfg.bg, color: stcfg.c, padding: "3px 9px", borderRadius: "12px", fontSize: "9.5px", fontWeight: 700 }}>
                            {cell}
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td key={ci} className={ci === 0 ? "pp1-cc-tbl__bold" : ci === 1 ? "pp1-cc-tbl__id" : ""} style={{ textAlign: isRightAligned ? "right" : "left", fontWeight: isRightAligned ? 600 : "normal" }}>
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Specific Dashboards View & Table components ── */
function PurchaseReportDashboardView({ filters, onFilterChange, onClose }) {
  const [dateOpen, setDateOpen] = React.useState(false);
  const dateRangeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target)) {
        setDateOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const chartData = React.useMemo(() => {
    let months = [
      { month: "April", date: "2026-04-15", "Supplier Name A": 5, "Supplier Name B": 9, "Supplier Name C": 14 },
      { month: "May", date: "2026-05-15", "Supplier Name A": 12, "Supplier Name B": 8, "Supplier Name C": 18 },
      { month: "June", date: "2026-06-15", "Supplier Name A": 20, "Supplier Name B": 4, "Supplier Name C": 24 },
      { month: "July", date: "2026-07-15", "Supplier Name A": 14, "Supplier Name B": 12, "Supplier Name C": 11 }
    ];

    if (filters.fromDate) {
      months = months.filter(m => m.date >= filters.fromDate);
    }
    if (filters.toDate) {
      months = months.filter(m => m.date <= filters.toDate);
    }

    return months;
  }, [filters.fromDate, filters.toDate]);

  const kpis = React.useMemo(() => {
    let suppliers = ["Supplier Name A", "Supplier Name B", "Supplier Name C"];
    if (filters.supplier) {
      suppliers = [filters.supplier];
    }

    let scaleFactor = 1.0;
    if (filters.category) {
      scaleFactor = filters.category === "Sheet Metal" ? 0.35 : filters.category === "Aluminum Extrusion" ? 0.22 : 0.43;
    }

    let total = 0;
    let highestSupplier = "Supplier Name C";
    let highestVal = 0;

    const supplierTotals = { "Supplier Name A": 0, "Supplier Name B": 0, "Supplier Name C": 0 };

    chartData.forEach(m => {
      suppliers.forEach(s => {
        const val = (m[s] || 0) * scaleFactor;
        total += val;
        supplierTotals[s] += val;
      });
    });

    suppliers.forEach(s => {
      if (supplierTotals[s] > highestVal) {
        highestVal = supplierTotals[s];
        highestSupplier = s;
      }
    });

    const avg = chartData.length > 0 ? total / chartData.length : 0;

    let highestMonth = "—";
    let highestMonthVal = 0;
    chartData.forEach(m => {
      let monthSum = 0;
      suppliers.forEach(s => {
        monthSum += (m[s] || 0) * scaleFactor;
      });
      if (monthSum > highestMonthVal) {
        highestMonthVal = monthSum;
        highestMonth = m.month;
      }
    });

    return [
      { label: "Total Purchase Value", value: `₹${total.toFixed(1)}L`, icon: "💰", color: "#ea580c" },
      { label: "Highest Supplier", value: highestVal > 0 ? highestSupplier.replace("Supplier Name ", "Supplier ") : "—", icon: "🏆", color: "#3b82f6" },
      { label: "Highest Month", value: highestMonth !== "—" ? `${highestMonth} 2026` : "—", icon: "📅", color: "#10b981" },
      { label: "Average Purchase", value: `₹${avg.toFixed(2)}L`, icon: "📊", color: "#f59e0b" },
      { label: "Active Suppliers", value: suppliers.length.toString(), icon: "🤝", color: "#8b5cf6" }
    ];
  }, [chartData, filters.supplier, filters.category]);

  const setupChart = React.useCallback((canvas) => {
    const labels = chartData.map(r => r.month);

    let suppliers = ["Supplier Name A", "Supplier Name B", "Supplier Name C"];
    if (filters.supplier) {
      suppliers = [filters.supplier];
    }

    let scaleFactor = 1.0;
    if (filters.category) {
      scaleFactor = filters.category === "Sheet Metal" ? 0.35 : filters.category === "Aluminum Extrusion" ? 0.22 : 0.43;
    }

    const colors = {
      "Supplier Name A": "rgba(234, 88, 12, 0.85)", // Orange
      "Supplier Name B": "rgba(59, 130, 246, 0.85)", // Blue
      "Supplier Name C": "rgba(16, 185, 129, 0.85)"  // Green
    };

    const datasets = suppliers.map(s => ({
      label: s,
      data: chartData.map(r => (r[s] || 0) * scaleFactor),
      backgroundColor: colors[s],
      borderRadius: 4
    }));

    return new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#475569", font: { size: 9 }, boxWidth: 10, padding: 6 }
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            padding: 8,
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ₹${context.raw.toFixed(1)} L`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "#64748b", font: { size: 9, weight: 600 } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#64748b",
              font: { size: 9 },
              callback: (val) => `₹${val} L`
            },
            grid: { color: "rgba(0, 0, 0, 0.05)" }
          }
        }
      }
    });
  }, [chartData, filters.supplier, filters.category]);

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      supplier: "",
      category: "",
    });
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateStr;
  };

  const dateRangeDisplay = () => {
    if (filters.fromDate && filters.toDate) {
      return `${formatDateDisplay(filters.fromDate)} - ${formatDateDisplay(filters.toDate)}`;
    }
    if (filters.fromDate) {
      return `${formatDateDisplay(filters.fromDate)} - ...`;
    }
    if (filters.toDate) {
      return `... - ${formatDateDisplay(filters.toDate)}`;
    }
    return "Select Date Range...";
  };

  const categories = ["Sheet Metal", "Aluminum Extrusion", "Stainless Steel Rods", "HR Plates", "CR Coils"];

  return (
    <div className="pp1-action-detail" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-action-detail__header" style={{ "--act-color": "#ea580c", padding: "10px 14px", gap: "10px" }}>
        <div className="pp1-action-detail__icon-box" style={{ width: "32px", height: "32px", borderRadius: "8px", fontSize: "16px", background: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShoppingCart size={16} style={{ color: "#fff" }} />
        </div>
        <div className="pp1-action-detail__meta" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <p className="pp1-action-detail__title" style={{ fontSize: "13.5px", fontWeight: 800, margin: 0 }}>Purchase Report</p>
        </div>
        <button type="button" className="pp1-action-detail__close" style={{ width: "24px", height: "24px", marginLeft: "auto" }} onClick={onClose}>✕</button>
      </div>

      <div className="pp1-action-detail__body" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px" }}>
        {/* Filters Bar */}
        <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
          {/* Date Range Picker */}
          <div className="pp1-filter-group pp1-filter-group--date-range" ref={dateRangeRef}>
            <label className="pp1-filter-label">Date Range</label>
            <div
              className="pp1-filter-input pp1-filter-input--date-range-trigger"
              onClick={() => setDateOpen(!dateOpen)}
            >
              <span>{dateRangeDisplay()}</span>
              <Calendar size={13} className="pp1-filter-icon" />
            </div>
            {dateOpen && (
              <div className="pp1-date-popup">
                <div className="pp1-date-popup-inputs">
                  <div className="pp1-date-popup-field">
                    <label>From</label>
                    <input
                      type="date"
                      value={filters.fromDate}
                      onChange={e => handleInputChange("fromDate", e.target.value)}
                    />
                  </div>
                  <div className="pp1-date-popup-field">
                    <label>To</label>
                    <input
                      type="date"
                      value={filters.toDate}
                      onChange={e => handleInputChange("toDate", e.target.value)}
                    />
                  </div>
                </div>
                <div className="pp1-date-popup-footer">
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange("fromDate", "");
                      handleInputChange("toDate", "");
                      setDateOpen(false);
                    }}
                  >
                    Clear
                  </button>
                  <button type="button" className="pp1-btn-apply" onClick={() => setDateOpen(false)}>Done</button>
                </div>
              </div>
            )}
          </div>

          {/* Supplier Dropdown */}
          <div className="pp1-filter-group">
            <label className="pp1-filter-label">Supplier</label>
            <select
              className="pp1-filter-input"
              value={filters.supplier}
              onChange={e => handleInputChange("supplier", e.target.value)}
            >
              <option value="">All Suppliers</option>
              <option value="Supplier Name A">Supplier Name A</option>
              <option value="Supplier Name B">Supplier Name B</option>
              <option value="Supplier Name C">Supplier Name C</option>
            </select>
          </div>

          {/* Category Dropdown */}
          <div className="pp1-filter-group">
            <label className="pp1-filter-label">Material Category</label>
            <select
              className="pp1-filter-input"
              value={filters.category}
              onChange={e => handleInputChange("category", e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Reset Button */}
          <button
            type="button"
            className="pp1-filter-btn pp1-filter-btn--reset"
            onClick={handleReset}
            style={{ flexShrink: 0, height: "28px" }}
          >
            Reset
          </button>
        </div>

        {/* KPI Strip */}
        <div className="pp1-detail__strip" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px" }}>
          {kpis.map((k, i) => (
            <div key={i} className="pp1-detail__chip" style={{ "--chip-color": k.color, padding: "8px 12px", borderRadius: "8px", background: k.color + "10", border: `1px solid ${k.color}20` }}>
              <span className="pp1-detail__chip-icon" style={{ fontSize: "14px" }}>{k.icon}</span>
              <p className="pp1-detail__chip-val" style={{ fontSize: "15px", fontWeight: 700, margin: "2px 0 0 0" }}>{k.value}</p>
              <p className="pp1-detail__chip-lbl" style={{ fontSize: "9.5px", color: "var(--pp1-text-3)", margin: 0, textTransform: "uppercase", fontWeight: 600 }}>{k.label}</p>
            </div>
          ))}
        </div>

        {/* Chart Card */}
        {setupChart && (
          <div className="pp1-dt-card" style={{ padding: "14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)", background: "#fff" }}>
            <div className="pp1-dt-card__hd" style={{ marginBottom: "10px" }}>
              <div className="pp1-dt-card__title" style={{ fontSize: "11px", fontWeight: 700, color: "var(--pp1-text-3)" }}>Trend Analysis (April - July 2026)</div>
            </div>
            <div className="pp1-dt-chart-wrap" style={{ height: 220, position: "relative" }}>
              <ChartJsCanvas setup={setupChart} height={220} rebuildToken={`purchase-trend|${JSON.stringify(filters)}`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PurchaseReportBottomTable({ filters }) {
  const [activeTab, setActiveTab] = React.useState("monthWise");

  // Process month-wise data
  const rowsMonthWise = React.useMemo(() => {
    let list = [
      ["Supplier Name A", 5, 12, 20, 14],
      ["Supplier Name B", 9, 8, 4, 12],
      ["Supplier Name C", 14, 18, 24, 11]
    ];
    if (filters.supplier) {
      list = list.filter(r => r[0] === filters.supplier);
    }
    return list;
  }, [filters.supplier]);

  // Process detailed orders summary
  const rowsOrders = React.useMemo(() => {
    let list = [
      ["Steel Authority of India", "Jan-26", "PO-2026-901", "2026-01-15", "MAT-MS-02", "MS Sheet Metal 2mm", "1,500 kg", "₹300/kg", "₹4,50,000", "Sheet Metal"],
      ["Hindalco Industries", "Feb-26", "PO-2026-902", "2026-02-12", "MAT-AL-04", "Aluminum Extrusion", "800 kg", "₹475/kg", "₹3,80,000", "Aluminum Extrusion"],
      ["Jindal Stainless", "Mar-26", "PO-2026-903", "2026-03-05", "MAT-SS-10", "SS Rods 10mm", "1,200 kg", "₹516/kg", "₹6,20,000", "Stainless Steel Rods"],
      ["Tata Steel", "Apr-26", "PO-2026-904", "2026-04-18", "MAT-HR-05", "HR Plate 5mm", "2,000 kg", "₹275/kg", "₹5,50,000", "HR Plates"],
      ["JSW Steel", "May-26", "PO-2026-905", "2026-05-22", "MAT-CR-12", "CR Coil 1.2mm", "1,000 kg", "₹280/kg", "₹2,80,000", "CR Coils"]
    ];

    if (filters.supplier) {
      const mapping = {
        "Supplier Name A": "Steel Authority of India",
        "Supplier Name B": "Hindalco Industries",
        "Supplier Name C": "Jindal Stainless"
      };
      const vendor = mapping[filters.supplier];
      if (vendor) {
        list = list.filter(r => r[0] === vendor);
      } else {
        list = [];
      }
    }

    if (filters.category) {
      list = list.filter(r => r[9] === filters.category);
    }

    if (filters.fromDate) {
      list = list.filter(r => r[3] >= filters.fromDate);
    }
    if (filters.toDate) {
      list = list.filter(r => r[3] <= filters.toDate);
    }

    return list;
  }, [filters.supplier, filters.category, filters.fromDate, filters.toDate]);

  const columnsMonthWise = ["Supplier Name", "April (Lakhs)", "May (Lakhs)", "June (Lakhs)", "July (Lakhs)", "Total Value (Lakhs)"];
  const columnsOrders = ["Supplier", "Month", "PO No", "PO Date", "Material Code", "Material Name", "Qty", "Rate", "Purchase Value"];

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "18px", borderBottom: "1px solid rgba(0,0,0,0.08)", width: "100%", paddingBottom: "4px" }}>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "monthWise" ? "2.5px solid var(--pp1-blue)" : "none",
              color: activeTab === "monthWise" ? "var(--pp1-blue)" : "var(--pp1-text-3)",
              fontWeight: 700,
              fontSize: "12px",
              paddingBottom: "6px",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
            onClick={() => setActiveTab("monthWise")}
          >
            Purchase Value Month Wise
          </button>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "ordersSummary" ? "2.5px solid var(--pp1-blue)" : "none",
              color: activeTab === "ordersSummary" ? "var(--pp1-blue)" : "var(--pp1-text-3)",
              fontWeight: 700,
              fontSize: "12px",
              paddingBottom: "6px",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
            onClick={() => setActiveTab("ordersSummary")}
          >
            Purchase Orders Summary
          </button>
        </div>
      </div>

      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        {activeTab === "monthWise" ? (
          <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
            <thead>
              <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
                {columnsMonthWise.map((col, idx) => (
                  <th key={idx} style={{ textAlign: idx > 0 ? "right" : "left" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsMonthWise.length === 0 ? (
                <tr><td colSpan={columnsMonthWise.length} className="pp1-cc-tbl__empty">No data available.</td></tr>
              ) : (
                rowsMonthWise.map((row, ri) => {
                  const totalVal = row.slice(1).reduce((s, v) => s + v, 0);
                  return (
                    <tr key={ri} className="pp1-cc-tbl__tr">
                      <td className="pp1-cc-tbl__bold" style={{ fontWeight: 700 }}>{row[0]}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>₹{row[1].toFixed(2)} L</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>₹{row[2].toFixed(2)} L</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>₹{row[3].toFixed(2)} L</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>₹{row[4].toFixed(2)} L</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: "var(--pp1-blue)" }}>₹{totalVal.toFixed(2)} L</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="pp1-cc-tbl" style={{ minWidth: 1000 }}>
            <thead>
              <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
                {columnsOrders.map((col, idx) => (
                  <th key={idx} style={{ textAlign: idx > 5 && idx < 9 ? "right" : "left" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsOrders.length === 0 ? (
                <tr><td colSpan={columnsOrders.length} className="pp1-cc-tbl__empty">No data matches the selected filters.</td></tr>
              ) : (
                rowsOrders.map((row, ri) => (
                  <tr key={ri} className="pp1-cc-tbl__tr">
                    <td className="pp1-cc-tbl__bold" style={{ fontWeight: 700 }}>{row[0]}</td>
                    <td className="pp1-cc-tbl__mono">{row[1]}</td>
                    <td className="pp1-cc-tbl__id">{row[2]}</td>
                    <td className="pp1-cc-tbl__mono">{row[3]}</td>
                    <td className="pp1-cc-tbl__bold" style={{ color: "var(--pp1-text-3)" }}>{row[4]}</td>
                    <td>{row[5]}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{row[6]}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{row[7]}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--pp1-green)" }}>{row[8]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SalesAnalysisReportDashboardView({ filters, onFilterChange, onClose }) {
  const [dateOpen, setDateOpen] = React.useState(false);
  const dateRangeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target)) {
        setDateOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      customer: "",
      region: "",
    });
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateStr;
  };

  const dateRangeDisplay = () => {
    if (filters.fromDate && filters.toDate) {
      return `${formatDateDisplay(filters.fromDate)} - ${formatDateDisplay(filters.toDate)}`;
    }
    if (filters.fromDate) {
      return `${formatDateDisplay(filters.fromDate)} - ...`;
    }
    if (filters.toDate) {
      return `... - ${formatDateDisplay(filters.toDate)}`;
    }
    return "Select Date Range...";
  };

  const chartMonths = React.useMemo(() => {
    const months = [
      { name: "April", date: "2026-04-15" },
      { name: "May", date: "2026-05-15" },
      { name: "June", date: "2026-06-15" },
      { name: "July", date: "2026-07-15" }
    ];
    let filtered = months;
    if (filters.fromDate) {
      filtered = filtered.filter(m => m.date >= filters.fromDate);
    }
    if (filters.toDate) {
      filtered = filtered.filter(m => m.date <= filters.toDate);
    }
    return filtered;
  }, [filters.fromDate, filters.toDate]);

  const chartDatasets = React.useMemo(() => {
    const allDatasets = [
      { label: "Customer A", data: [30, 120, 80, 95], backgroundColor: "#10b981", borderRadius: 4 },
      { label: "Customer B", data: [25, 60, 50, 70], backgroundColor: "#3b82f6", borderRadius: 4 },
      { label: "Customer C", data: [60, 10, 70, 50], backgroundColor: "#f59e0b", borderRadius: 4 }
    ];

    if (filters.customer) {
      let matchLabel = filters.customer;
      if (filters.customer === "Tata Motors") matchLabel = "Customer A";
      if (filters.customer === "Mahindra & Mahindra") matchLabel = "Customer B";
      if (filters.customer === "Maruti Suzuki" || filters.customer === "Ashok Leyland") matchLabel = "Customer C";

      return allDatasets.filter(ds => ds.label === matchLabel);
    }
    return allDatasets;
  }, [filters.customer]);

  const datasets = React.useMemo(() => {
    const monthsDataIndices = chartMonths.map(cm => {
      if (cm.name === "April") return 0;
      if (cm.name === "May") return 1;
      if (cm.name === "June") return 2;
      if (cm.name === "July") return 3;
      return -1;
    });

    return chartDatasets.map(ds => {
      const filteredData = monthsDataIndices.map(idx => ds.data[idx]);
      return {
        ...ds,
        data: filteredData
      };
    });
  }, [chartMonths, chartDatasets]);

  // Dynamically calculate KPIs based on filtered datasets
  const kpis = React.useMemo(() => {
    let totalSalesVal = 0;
    let maxCustName = "—";
    let maxCustVal = 0;

    // Total turnover per customer in filtered range
    const custSums = { "Customer A": 0, "Customer B": 0, "Customer C": 0 };
    datasets.forEach(ds => {
      const sum = ds.data.reduce((acc, curr) => acc + (curr || 0), 0);
      custSums[ds.label] = sum;
      totalSalesVal += sum;
    });

    // Determine highest customer
    let highestCustLabel = "—";
    Object.keys(custSums).forEach(k => {
      if (custSums[k] > maxCustVal) {
        maxCustVal = custSums[k];
        highestCustLabel = k;
      }
    });

    if (highestCustLabel === "Customer A") maxCustName = "Tata\nMotors";
    else if (highestCustLabel === "Customer B") maxCustName = "Mahindra &\nMahindra";
    else if (highestCustLabel === "Customer C") maxCustName = "Maruti\nSuzuki";

    // Determine highest month
    let maxMonthName = "—";
    let maxMonthVal = 0;
    chartMonths.forEach((m, idx) => {
      let monthSum = 0;
      datasets.forEach(ds => {
        monthSum += (ds.data[idx] || 0);
      });
      if (monthSum > maxMonthVal) {
        maxMonthVal = monthSum;
        maxMonthName = m.name;
      }
    });

    const activeCustCount = filters.customer ? 1 : 4;
    const avgSalesVal = chartMonths.length > 0 ? totalSalesVal / chartMonths.length : 0;

    return [
      { label: "Total Sales", value: `₹${totalSalesVal.toFixed(1)}L`, icon: "💰", color: "#10b981" },
      { label: "Highest Customer", value: maxCustVal > 0 ? maxCustName : "—", icon: "🏆", color: "#3b82f6" },
      { label: "Highest Month", value: maxMonthName !== "—" ? `${maxMonthName} 2026` : "—", icon: "📅", color: "#8b5cf6" },
      { label: "Average Sales", value: `₹${avgSalesVal.toFixed(1)}L`, icon: "📊", color: "#f59e0b" },
      { label: "Active Customers", value: activeCustCount.toString(), icon: "👥", color: "#ec4899" }
    ];
  }, [datasets, chartMonths, filters.customer]);

  const setupChart = React.useCallback((canvas) => {
    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: chartMonths.map(m => m.name),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { boxWidth: 12, font: { size: 10, weight: 600 } }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ₹${context.raw} Lakhs`
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            title: { display: true, text: "Sales Value (Lakhs)", font: { size: 10, weight: 600 } },
            ticks: { callback: (val) => `₹${val}L` }
          }
        }
      }
    });
  }, [chartMonths, datasets]);

  return (
    <PremiumDashboardView title="Sales Analysis Report" icon={TrendingUp} color="#10b981" kpis={kpis} setupChart={setupChart} rangeHint="Month Wise Turnover Report" onClose={onClose} rebuildToken={JSON.stringify(datasets)}>
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" ref={dateRangeRef}>
          <label className="pp1-filter-label">Date Range</label>
          <div
            className="pp1-filter-input pp1-filter-input--date-range-trigger"
            onClick={() => setDateOpen(!dateOpen)}
          >
            <span>{dateRangeDisplay()}</span>
            <Calendar size={13} className="pp1-filter-icon" />
          </div>
          {dateOpen && (
            <div className="pp1-date-popup">
              <div className="pp1-date-popup-inputs">
                <div className="pp1-date-popup-field">
                  <label>From</label>
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={e => handleInputChange("fromDate", e.target.value)}
                  />
                </div>
                <div className="pp1-date-popup-field">
                  <label>To</label>
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={e => handleInputChange("toDate", e.target.value)}
                  />
                </div>
              </div>
              <div className="pp1-date-popup-footer">
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange("fromDate", "");
                    handleInputChange("toDate", "");
                    setDateOpen(false);
                  }}
                >
                  Clear
                </button>
                <button type="button" className="pp1-btn-apply" onClick={() => setDateOpen(false)}>Done</button>
              </div>
            </div>
          )}
        </div>

        {/* Customer Dropdown */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Customer</label>
          <select
            className="pp1-filter-input"
            value={filters.customer}
            onChange={e => handleInputChange("customer", e.target.value)}
          >
            <option value="">All Customers</option>
            <option value="Customer A">Customer A</option>
            <option value="Customer B">Customer B</option>
            <option value="Customer C">Customer C</option>
            <option value="Tata Motors">Tata Motors</option>
            <option value="Mahindra & Mahindra">Mahindra & Mahindra</option>
            <option value="Maruti Suzuki">Maruti Suzuki</option>
            <option value="Ashok Leyland">Ashok Leyland</option>
          </select>
        </div>

        {/* Region Dropdown */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Region</label>
          <select
            className="pp1-filter-input"
            value={filters.region}
            onChange={e => handleInputChange("region", e.target.value)}
          >
            <option value="">All Regions</option>
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="East">East</option>
            <option value="West">West</option>
          </select>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          className="pp1-filter-btn pp1-filter-btn--reset"
          onClick={handleReset}
          style={{ flexShrink: 0, height: "28px" }}
        >
          Reset
        </button>
      </div>
    </PremiumDashboardView>
  );
}

function SalesAnalysisReportBottomTable({ filters }) {
  const [activeTab, setActiveTab] = React.useState("turnover"); // "turnover" | "invoiceRegister"

  const columnsTurnover = ["Customer Name", "April (Lakhs)", "May (Lakhs)", "June (Lakhs)", "July (Lakhs)", "Total Value (Lakhs)"];
  const rowsTurnover = React.useMemo(() => {
    let list = [
      ["Customer A", 30, 120, 80, 95],
      ["Customer B", 25, 60, 50, 70],
      ["Customer C", 60, 10, 70, 50]
    ];
    if (filters?.customer) {
      let match = filters.customer;
      if (filters.customer === "Tata Motors") match = "Customer A";
      if (filters.customer === "Mahindra & Mahindra") match = "Customer B";
      if (filters.customer === "Maruti Suzuki" || filters.customer === "Ashok Leyland") match = "Customer C";

      list = list.filter(r => r[0] === match);
    }
    return list;
  }, [filters?.customer]);

  const columnsInvoice = ["Month", "Customer", "Invoice No", "Invoice Date", "Sales Value", "Dispatch Value", "Collection Status"];
  const rowsInvoice = React.useMemo(() => {
    let list = [
      ["Jan-26", "Tata Motors", "INV-2026-001", "12-Jan-2026", "₹9,00,000", "₹9,00,000", "Paid", "South"],
      ["Feb-26", "Mahindra & Mahindra", "INV-2026-002", "18-Feb-2026", "₹12,00,000", "₹12,00,000", "Paid", "South"],
      ["Mar-26", "Maruti Suzuki", "INV-2026-003", "05-Mar-2026", "₹4,50,000", "₹4,50,000", "Pending", "North"],
      ["Apr-26", "Ashok Leyland", "INV-2026-004", "22-Apr-2026", "₹18,50,000", "₹18,50,000", "Paid", "South"],
      ["May-26", "Tata Motors", "INV-2026-005", "10-May-2026", "₹11,50,000", "₹11,00,000", "Partially Paid", "South"],
      ["Jun-26", "Mahindra & Mahindra", "INV-2026-006", "14-Jun-2026", "₹9,70,000", "₹9,70,000", "Unpaid", "South"]
    ];

    if (filters?.customer) {
      list = list.filter(r => r[1] === filters.customer || (filters.customer === "Customer A" && r[1] === "Tata Motors") || (filters.customer === "Customer B" && r[1] === "Mahindra & Mahindra") || (filters.customer === "Customer C" && (r[1] === "Maruti Suzuki" || r[1] === "Ashok Leyland")));
    }
    if (filters?.region) {
      list = list.filter(r => r[7] === filters.region);
    }
    if (filters?.fromDate) {
      list = list.filter(r => {
        const d = r[3].split("-");
        const formatted = `2026-${d[1] === "Jan" ? "01" : d[1] === "Feb" ? "02" : d[1] === "Mar" ? "03" : d[1] === "Apr" ? "04" : d[1] === "May" ? "05" : "06"}-${d[0]}`;
        return formatted >= filters.fromDate;
      });
    }
    if (filters?.toDate) {
      list = list.filter(r => {
        const d = r[3].split("-");
        const formatted = `2026-${d[1] === "Jan" ? "01" : d[1] === "Feb" ? "02" : d[1] === "Mar" ? "03" : d[1] === "Apr" ? "04" : d[1] === "May" ? "05" : "06"}-${d[0]}`;
        return formatted <= filters.toDate;
      });
    }

    return list;
  }, [filters?.customer, filters?.region, filters?.fromDate, filters?.toDate]);

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "18px", borderBottom: "1px solid rgba(0,0,0,0.08)", width: "100%", paddingBottom: "4px" }}>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "turnover" ? "2.5px solid var(--pp1-blue)" : "none",
              color: activeTab === "turnover" ? "var(--pp1-blue)" : "var(--pp1-text-3)",
              fontWeight: 700,
              fontSize: "12px",
              paddingBottom: "6px",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
            onClick={() => setActiveTab("turnover")}
          >
            Month Wise Turnover Report
          </button>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "invoiceRegister" ? "2.5px solid var(--pp1-blue)" : "none",
              color: activeTab === "invoiceRegister" ? "var(--pp1-blue)" : "var(--pp1-text-3)",
              fontWeight: 700,
              fontSize: "12px",
              paddingBottom: "6px",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
            onClick={() => setActiveTab("invoiceRegister")}
          >
            Sales Invoice Register
          </button>
        </div>
      </div>

      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        {activeTab === "turnover" ? (
          <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
            <thead>
              <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
                {columnsTurnover.map((col, idx) => (
                  <th key={idx} style={{ textAlign: idx > 0 ? "right" : "left" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsTurnover.map((row, ri) => {
                const totalVal = row.slice(1).reduce((s, v) => s + v, 0);
                return (
                  <tr key={ri} className="pp1-cc-tbl__tr">
                    <td className="pp1-cc-tbl__bold" style={{ fontWeight: 700 }}>{row[0]}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>₹{row[1]} L</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>₹{row[2]} L</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>₹{row[3]} L</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>₹{row[4]} L</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--pp1-blue)" }}>₹{totalVal} L</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
            <thead>
              <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
                {columnsInvoice.map((col, idx) => (
                  <th key={idx} style={{ textAlign: idx >= 4 && idx <= 5 ? "right" : "left" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsInvoice.map((row, ri) => (
                <tr key={ri} className="pp1-cc-tbl__tr">
                  <td className="pp1-cc-tbl__bold" style={{ fontWeight: 700 }}>{row[0]}</td>
                  <td style={{ fontWeight: 600 }}>{row[1]}</td>
                  <td className="pp1-cc-tbl__mono">{row[2]}</td>
                  <td className="pp1-cc-tbl__mono">{row[3]}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{row[4]}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{row[5]}</td>
                  <td style={{
                    fontWeight: 600,
                    color: row[6] === "Paid" ? "var(--pp1-green)" : row[6] === "Unpaid" ? "var(--pp1-rose)" : row[6] === "Pending" ? "var(--pp1-amber)" : "var(--pp1-blue)"
                  }}>{row[6]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ProductionAnalysisReportDashboardView({ filters, onFilterChange, onClose }) {
  const [dateOpen, setDateOpen] = React.useState(false);
  const dateRangeRef = React.useRef(null);
  const [xAxisGroup, setXAxisGroup] = React.useState("Block");

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target)) {
        setDateOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      team: "",
      machine: "",
      operator: "",
      customer: "",
    });
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateStr;
  };

  const dateRangeDisplay = () => {
    if (filters.fromDate && filters.toDate) {
      return `${formatDateDisplay(filters.fromDate)} - ${formatDateDisplay(filters.toDate)}`;
    }
    if (filters.fromDate) {
      return `${formatDateDisplay(filters.fromDate)} - ...`;
    }
    if (filters.toDate) {
      return `... - ${formatDateDisplay(filters.toDate)}`;
    }
    return "Select Date Range...";
  };

  const mockProdLogs = React.useMemo(() => [
    { date: "2026-06-15", machine: "CNC-01", shift: "A Shift", operator: "Balamurugan.P", part: "BRK-PAD-M1", qty: 850, rej: 12, team: "Team A", customer: "Tata Motors", value: 170000, profit: 42000 },
    { date: "2026-06-15", machine: "CNC-02", shift: "A Shift", operator: "Gopikrishnan.R", part: "ROT-DSC-X4", qty: 620, rej: 8, team: "Team A", customer: "Mahindra & Mahindra", value: 248000, profit: 62000 },
    { date: "2026-06-15", machine: "VMC-01", shift: "A Shift", operator: "Karthi.S", part: "GBX-HNG-S2", qty: 410, rej: 5, team: "Team B", customer: "Maruti Suzuki", value: 184500, profit: 36900 },
    { date: "2026-06-15", machine: "CNC-01", shift: "B Shift", operator: "Balamurugan.P", part: "BRK-PAD-M1", qty: 820, rej: 15, team: "Team A", customer: "Tata Motors", value: 164000, profit: 41000 },
    { date: "2026-06-15", machine: "CNC-02", shift: "B Shift", operator: "Gopikrishnan.R", part: "ROT-DSC-X4", qty: 600, rej: 10, team: "Team A", customer: "Mahindra & Mahindra", value: 240000, profit: 60000 },
    { date: "2026-06-15", machine: "VMC-02", shift: "B Shift", operator: "Karthi.S", part: "GBX-HNG-S2", qty: 390, rej: 6, team: "Team B", customer: "Maruti Suzuki", value: 175500, profit: 35100 },
    { date: "2026-06-15", machine: "Grinding-01", shift: "C Shift", operator: "Senthil.K", part: "TRK-AXL-L9", qty: 150, rej: 3, team: "Team C", customer: "Ashok Leyland", value: 375000, profit: 93750 }
  ], []);

  const filteredLogs = React.useMemo(() => {
    let list = mockProdLogs;
    if (filters.fromDate) list = list.filter(r => r.date >= filters.fromDate);
    if (filters.toDate) list = list.filter(r => r.date <= filters.toDate);
    if (filters.team) list = list.filter(r => r.team === filters.team);
    if (filters.machine) list = list.filter(r => r.machine === filters.machine);
    if (filters.operator) list = list.filter(r => r.operator === filters.operator);
    if (filters.customer) list = list.filter(r => r.customer === filters.customer);
    return list;
  }, [filters, mockProdLogs]);

  // Dynamically calculate KPIs
  const kpis = React.useMemo(() => {
    let totalVal = 0;
    let totalProfitVal = 0;

    const machineVals = {};
    const machProf = {};
    const machValsForRatio = {};

    filteredLogs.forEach(r => {
      totalVal += r.value;
      totalProfitVal += r.profit;
      machineVals[r.machine] = (machineVals[r.machine] || 0) + r.value;
      machProf[r.machine] = (machProf[r.machine] || 0) + r.profit;
      machValsForRatio[r.machine] = (machValsForRatio[r.machine] || 0) + r.value;
    });

    // Best Machine
    let bestMach = "—";
    let maxMachVal = 0;
    Object.keys(machineVals).forEach(m => {
      if (machineVals[m] > maxMachVal) {
        maxMachVal = machineVals[m];
        bestMach = m;
      }
    });

    // Highest Profitability (highest profitability ratio machine & ratio)
    let bestMachProf = "—";
    let maxProfRatio = 0;
    Object.keys(machProf).forEach(m => {
      const ratio = machValsForRatio[m] > 0 ? (machProf[m] / machValsForRatio[m]) * 100 : 0;
      if (ratio > maxProfRatio) {
        maxProfRatio = ratio;
        bestMachProf = `${m} (${ratio.toFixed(1)}%)`;
      }
    });

    const avgProfitRatio = totalVal > 0 ? (totalProfitVal / totalVal) * 100 : 0;

    return [
      { label: "Total Production Value", value: `₹${(totalVal / 100000).toFixed(2)}L`, icon: "💰", color: "#8b5cf6" },
      { label: "Best Machine", value: bestMach, icon: "⚙️", color: "#3b82f6" },
      { label: "Highest Profit", value: `₹${(totalProfitVal / 100000).toFixed(2)}L`, icon: "📈", color: "#10b981" },
      { label: "Average Profit Ratio", value: `${avgProfitRatio.toFixed(1)}%`, icon: "⚡", color: "#f97316" },
      { label: "Highest Profitability", value: bestMachProf, icon: "🏆", color: "#ec4899" }
    ];
  }, [filteredLogs]);

  // Aggregate combination chart data dynamically based on selection and filters
  const chartData = React.useMemo(() => {
    const rawData = [
      { block: "Team A", type: "CNC", machine: "CNC1", operator: "Kumar", customer: "Customer A", rate: 180, value: 210 },
      { block: "Team A", type: "CNC", machine: "CNC2", operator: "Ravi", customer: "Customer B", rate: 130, value: 150 },
      { block: "Team B", type: "CNC", machine: "VMC1", operator: "Mani", customer: "Customer C", rate: 140, value: 90 },
      { block: "Team C", type: "Conv Cutting", machine: "Cutting", operator: "Moorthy", customer: "Customer D", rate: 70, value: 50 },
      { block: "Team D", type: "Conv", machine: "Drilling", operator: "Sankar", customer: "Customer A", rate: 20, value: 60 }
    ];

    let list = rawData;

    // Apply interactive dashboard filters mapped to the sample dataset
    if (filters.team) {
      list = list.filter(r => r.block === filters.team);
    }
    if (filters.machine) {
      const machMap = {
        "CNC-01": "CNC1",
        "CNC-02": "CNC2",
        "VMC-01": "VMC1",
        "VMC-02": "VMC1",
        "Grinding-01": "Cutting"
      };
      const targetMach = machMap[filters.machine];
      if (targetMach) list = list.filter(r => r.machine === targetMach);
    }
    if (filters.operator) {
      const opMap = {
        "Balamurugan.P": "Kumar",
        "Gopikrishnan.R": "Ravi",
        "Karthi.S": "Mani",
        "Senthil.K": "Moorthy"
      };
      const targetOp = opMap[filters.operator];
      if (targetOp) list = list.filter(r => r.operator === targetOp);
    }
    if (filters.customer) {
      const custMap = {
        "Tata Motors": "Customer A",
        "Mahindra & Mahindra": "Customer B",
        "Maruti Suzuki": "Customer C",
        "Ashok Leyland": "Customer D"
      };
      const targetCust = custMap[filters.customer];
      if (targetCust) list = list.filter(r => r.customer === targetCust);
    }

    const groupField = xAxisGroup.toLowerCase() === "block" ? "block" : xAxisGroup.toLowerCase();
    const aggregated = {};
    list.forEach(r => {
      const key = r[groupField];
      if (!aggregated[key]) {
        aggregated[key] = { rateSum: 0, valSum: 0 };
      }
      aggregated[key].rateSum += r.rate;
      aggregated[key].valSum += r.value;
    });

    const labels = Object.keys(aggregated);
    const rates = labels.map(l => aggregated[l].rateSum);
    const values = labels.map(l => aggregated[l].valSum);

    return { labels, rates, values };
  }, [filters, xAxisGroup]);

  const setupChart = React.useCallback((canvas) => {
    const ctx = canvas.getContext("2d");
    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            type: "bar",
            label: "Rate Per Hour",
            data: chartData.rates,
            yAxisID: "yRate",
            backgroundColor: "rgba(139, 92, 246, 0.75)",
            borderColor: "#8b5cf6",
            borderWidth: 1.5,
            borderRadius: 4
          },
          {
            type: "line",
            label: "Production Value",
            data: chartData.values,
            yAxisID: "yValue",
            borderColor: "#10b981",
            backgroundColor: "#10b981",
            borderWidth: 3,
            tension: 0.25,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              font: {
                family: "'Inter', sans-serif",
                size: 10,
                weight: 600
              },
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            titleFont: { family: "'Inter', sans-serif", size: 11, weight: "bold" },
            bodyFont: { family: "'Inter', sans-serif", size: 11 },
            padding: 8,
            cornerRadius: 6,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || "";
                const val = context.raw;
                return ` ${label}: ₹${val.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 10, weight: 600 },
              color: "#64748b"
            }
          },
          yRate: {
            type: "linear",
            position: "left",
            title: {
              display: true,
              text: "Rate Per Hour (₹)",
              color: "#8b5cf6",
              font: { family: "'Inter', sans-serif", size: 10, weight: 700 }
            },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 10 },
              color: "#64748b",
              callback: (v) => `₹${v.toLocaleString()}`
            },
            grid: { color: "rgba(0, 0, 0, 0.05)" }
          },
          yValue: {
            type: "linear",
            position: "right",
            title: {
              display: true,
              text: "Production Value (₹)",
              color: "#10b981",
              font: { family: "'Inter', sans-serif", size: 10, weight: 700 }
            },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 10 },
              color: "#64748b",
              callback: (v) => `₹${v.toLocaleString()}`
            },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }, [chartData]);

  const teams = ["Team A", "Team B", "Team C"];
  const machines = ["CNC-01", "CNC-02", "VMC-01", "VMC-02", "Grinding-01"];
  const operators = ["Balamurugan.P", "Gopikrishnan.R", "Karthi.S", "Senthil.K"];
  const customers = ["Tata Motors", "Mahindra & Mahindra", "Maruti Suzuki", "Ashok Leyland"];

  return (
    <PremiumDashboardView
      title="Production Analysis Report"
      icon={Factory}
      color="#8b5cf6"
      kpis={kpis}
      setupChart={setupChart}
      rangeHint="Production Value Product Rate vs Rate Per Hour"
      onClose={onClose}
      rebuildToken={`${xAxisGroup}-${JSON.stringify(chartData)}`}
      chartControls={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px", padding: "8px 12px", background: "rgba(139, 92, 246, 0.05)", borderRadius: "8px", border: "1px dashed rgba(139, 92, 246, 0.2)", margin: "0px 0 0px 0" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--pp1-text-3)", textTransform: "uppercase" }}>Chart X-Axis:</span>
          <div style={{ display: "flex", gap: "6px" }}>
            {["Block", "Machine", "Operator", "Customer"].map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setXAxisGroup(g)}
                style={{
                  padding: "3px 10px",
                  borderRadius: "15px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: xAxisGroup === g ? "1px solid var(--pp1-blue)" : "1px solid rgba(0,0,0,0.1)",
                  background: xAxisGroup === g ? "var(--pp1-blue)" : "#fff",
                  color: xAxisGroup === g ? "#fff" : "var(--pp1-text-3)",
                  transition: "all 0.15s ease"
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" ref={dateRangeRef}>
          <label className="pp1-filter-label">Date Range</label>
          <div
            className="pp1-filter-input pp1-filter-input--date-range-trigger"
            onClick={() => setDateOpen(!dateOpen)}
          >
            <span>{dateRangeDisplay()}</span>
            <Calendar size={13} className="pp1-filter-icon" />
          </div>
          {dateOpen && (
            <div className="pp1-date-popup">
              <div className="pp1-date-popup-inputs">
                <div className="pp1-date-popup-field">
                  <label>From</label>
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={e => handleInputChange("fromDate", e.target.value)}
                  />
                </div>
                <div className="pp1-date-popup-field">
                  <label>To</label>
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={e => handleInputChange("toDate", e.target.value)}
                  />
                </div>
              </div>
              <div className="pp1-date-popup-footer">
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange("fromDate", "");
                    handleInputChange("toDate", "");
                    setDateOpen(false);
                  }}
                >
                  Clear
                </button>
                <button type="button" className="pp1-btn-apply" onClick={() => setDateOpen(false)}>Done</button>
              </div>
            </div>
          )}
        </div>

        {/* Team Dropdown */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Team</label>
          <select
            className="pp1-filter-input"
            value={filters.team}
            onChange={e => handleInputChange("team", e.target.value)}
          >
            <option value="">All Teams</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Machine Dropdown */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Machine</label>
          <select
            className="pp1-filter-input"
            value={filters.machine}
            onChange={e => handleInputChange("machine", e.target.value)}
          >
            <option value="">All Machines</option>
            {machines.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Operator Dropdown */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Operator</label>
          <select
            className="pp1-filter-input"
            value={filters.operator}
            onChange={e => handleInputChange("operator", e.target.value)}
          >
            <option value="">All Operators</option>
            {operators.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Customer Dropdown */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Customer</label>
          <select
            className="pp1-filter-input"
            value={filters.customer}
            onChange={e => handleInputChange("customer", e.target.value)}
          >
            <option value="">All Customers</option>
            {customers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          className="pp1-filter-btn pp1-filter-btn--reset"
          onClick={handleReset}
          style={{ flexShrink: 0, height: "28px" }}
        >
          Reset
        </button>
      </div>
    </PremiumDashboardView>
  );
}

function ProductionAnalysisReportBottomTable({ filters }) {
  const [activeTab, setActiveTab] = React.useState("rateVsHour"); // "rateVsHour" | "dailyLog"

  // Tab 1 columns & rows (Sample Data)
  const columnsRateVsHour = ["Block", "Type", "Machine", "Operator", "Customer", "Rate Per Hour", "Production Value", "Profit %"];

  const rowsRateVsHour = React.useMemo(() => {
    let list = [
      { block: "Team A", type: "CNC", machine: "CNC1", operator: "Kumar", customer: "Customer A", rate: 180, value: 210, profitPct: 1.17, filterDate: "2026-06-15" },
      { block: "Team A", type: "CNC", machine: "CNC2", operator: "Ravi", customer: "Customer B", rate: 130, value: 150, profitPct: 1.15, filterDate: "2026-06-15" },
      { block: "Team B", type: "CNC", machine: "VMC1", operator: "Mani", customer: "Customer C", rate: 140, value: 90, profitPct: 0.64, filterDate: "2026-06-15" },
      { block: "Team C", type: "Conv Cutting", machine: "Cutting", operator: "Moorthy", customer: "Customer D", rate: 70, value: 50, profitPct: 0.71, filterDate: "2026-06-15" },
      { block: "Team D", type: "Conv", machine: "Drilling", operator: "Sankar", customer: "Customer A", rate: 20, value: 60, profitPct: 3.00, filterDate: "2026-06-15" }
    ];

    // Apply filters from parent filters state (mapped to sample dataset)
    if (filters?.team) {
      list = list.filter(r => r.block === filters.team);
    }
    if (filters?.machine) {
      const machMap = {
        "CNC-01": "CNC1",
        "CNC-02": "CNC2",
        "VMC-01": "VMC1",
        "VMC-02": "VMC1",
        "Grinding-01": "Cutting"
      };
      const targetMach = machMap[filters.machine];
      if (targetMach) list = list.filter(r => r.machine === targetMach);
    }
    if (filters?.operator) {
      const opMap = {
        "Balamurugan.P": "Kumar",
        "Gopikrishnan.R": "Ravi",
        "Karthi.S": "Mani",
        "Senthil.K": "Moorthy"
      };
      const targetOp = opMap[filters.operator];
      if (targetOp) list = list.filter(r => r.operator === targetOp);
    }
    if (filters?.customer) {
      const custMap = {
        "Tata Motors": "Customer A",
        "Mahindra & Mahindra": "Customer B",
        "Maruti Suzuki": "Customer C",
        "Ashok Leyland": "Customer D"
      };
      const targetCust = custMap[filters.customer];
      if (targetCust) list = list.filter(r => r.customer === targetCust);
    }

    return list.map(r => [
      r.block,
      r.type,
      r.machine,
      r.operator,
      r.customer,
      `₹${fmtNum(r.rate)}`,
      `₹${fmtNum(r.value)}`,
      `${r.profitPct.toFixed(2)}%`
    ]);
  }, [filters]);

  // Tab 2 columns & rows (Daily Production Log)
  const columnsDailyLog = ["Date", "Team", "Machine", "Operator", "Customer", "Production Qty", "Production Value", "Rate Per Hour", "Profit Ratio"];

  const rowsDailyLog = React.useMemo(() => {
    let list = [
      { date: "15-Jun-2026", team: "Team A", machine: "CNC-01", operator: "Balamurugan.P", customer: "Tata Motors", qty: 850, value: 170000, ratePerHour: 21250, profitRatio: "24.7%", filterDate: "2026-06-15" },
      { date: "15-Jun-2026", team: "Team A", machine: "CNC-02", operator: "Gopikrishnan.R", customer: "Mahindra & Mahindra", qty: 620, value: 248000, ratePerHour: 31000, profitRatio: "25.0%", filterDate: "2026-06-15" },
      { date: "15-Jun-2026", team: "Team B", machine: "VMC-01", operator: "Karthi.S", customer: "Maruti Suzuki", qty: 410, value: 184500, ratePerHour: 23063, profitRatio: "20.0%", filterDate: "2026-06-15" },
      { date: "15-Jun-2026", team: "Team A", machine: "CNC-01", operator: "Balamurugan.P", customer: "Tata Motors", qty: 820, value: 164000, ratePerHour: 20500, profitRatio: "25.0%", filterDate: "2026-06-15" },
      { date: "15-Jun-2026", team: "Team A", machine: "CNC-02", operator: "Gopikrishnan.R", customer: "Mahindra & Mahindra", qty: 600, value: 240000, ratePerHour: 30000, profitRatio: "25.0%", filterDate: "2026-06-15" },
      { date: "15-Jun-2026", team: "Team B", machine: "VMC-02", operator: "Karthi.S", customer: "Maruti Suzuki", qty: 390, value: 175500, ratePerHour: 21938, profitRatio: "20.0%", filterDate: "2026-06-15" },
      { date: "15-Jun-2026", team: "Team C", machine: "Grinding-01", operator: "Senthil.K", customer: "Ashok Leyland", qty: 150, value: 375000, ratePerHour: 46875, profitRatio: "25.0%", filterDate: "2026-06-15" }
    ];

    if (filters?.fromDate) list = list.filter(r => r.filterDate >= filters.fromDate);
    if (filters?.toDate) list = list.filter(r => r.filterDate <= filters.toDate);
    if (filters?.team) list = list.filter(r => r.team === filters.team);
    if (filters?.machine) list = list.filter(r => r.machine === filters.machine);
    if (filters?.operator) list = list.filter(r => r.operator === filters.operator);
    if (filters?.customer) list = list.filter(r => r.customer === filters.customer);

    return list.map(r => [
      r.date,
      r.team,
      r.machine,
      r.operator,
      r.customer,
      fmtNum(r.qty),
      `₹${fmtNum(r.value)}`,
      `₹${fmtNum(r.ratePerHour)}`,
      r.profitRatio
    ]);
  }, [filters]);

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "18px", borderBottom: "1px solid rgba(0,0,0,0.08)", width: "100%", paddingBottom: "4px" }}>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "rateVsHour" ? "2.5px solid var(--pp1-blue)" : "none",
              color: activeTab === "rateVsHour" ? "var(--pp1-blue)" : "var(--pp1-text-3)",
              fontWeight: 700,
              fontSize: "12px",
              paddingBottom: "6px",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
            onClick={() => setActiveTab("rateVsHour")}
          >
            Production Value Product Rate vs Rate Per Hour
          </button>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "dailyLog" ? "2.5px solid var(--pp1-blue)" : "none",
              color: activeTab === "dailyLog" ? "var(--pp1-blue)" : "var(--pp1-text-3)",
              fontWeight: 700,
              fontSize: "12px",
              paddingBottom: "6px",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
            onClick={() => setActiveTab("dailyLog")}
          >
            Daily Production Log
          </button>
        </div>
      </div>

      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        {activeTab === "rateVsHour" ? (
          <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
            <thead>
              <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
                {columnsRateVsHour.map((col, idx) => (
                  <th key={idx} style={{ textAlign: idx > 4 ? "right" : "left" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsRateVsHour.length === 0 ? (
                <tr><td colSpan={columnsRateVsHour.length} className="pp1-cc-tbl__empty">No data available.</td></tr>
              ) : (
                rowsRateVsHour.map((row, ri) => (
                  <tr key={ri} className="pp1-cc-tbl__tr">
                    <td className="pp1-cc-tbl__bold" style={{ fontWeight: 700 }}>{row[0]}</td>
                    <td style={{ fontWeight: 600 }}>{row[1]}</td>
                    <td className="pp1-cc-tbl__id">{row[2]}</td>
                    <td style={{ fontWeight: 600 }}>{row[3]}</td>
                    <td style={{ fontWeight: 600 }}>{row[4]}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{row[5]}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{row[6]}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--pp1-blue)" }}>{row[7]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
            <thead>
              <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
                {columnsDailyLog.map((col, idx) => (
                  <th key={idx} style={{ textAlign: idx > 4 ? "right" : "left" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsDailyLog.length === 0 ? (
                <tr><td colSpan={columnsDailyLog.length} className="pp1-cc-tbl__empty">No data available.</td></tr>
              ) : (
                rowsDailyLog.map((row, ri) => (
                  <tr key={ri} className="pp1-cc-tbl__tr">
                    <td className="pp1-cc-tbl__bold" style={{ fontWeight: 700 }}>{row[0]}</td>
                    <td style={{ fontWeight: 600 }}>{row[1]}</td>
                    <td className="pp1-cc-tbl__id">{row[2]}</td>
                    <td style={{ fontWeight: 600 }}>{row[3]}</td>
                    <td style={{ fontWeight: 600 }}>{row[4]}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{row[5]}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{row[6]}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{row[7]}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--pp1-blue)" }}>{row[8]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const MOCK_IDLE_LOGS = [
  { date: "2026-06-15", machine: "CNC1", machineType: "CNC", team: "Team A", reason: "No Load", shift: "A Shift", duration: 250, perMonth: 20.83, ratePerHour: 600 },
  { date: "2026-06-15", machine: "VMC7", machineType: "VMC", team: "Team B", reason: "Under Maintenance", shift: "A Shift", duration: 480, perMonth: 40.00, ratePerHour: 750 },
  { date: "2026-06-14", machine: "CNC2", machineType: "CNC", team: "Team A", reason: "No Operator", shift: "B Shift", duration: 950, perMonth: 79.17, ratePerHour: 540 },
  { date: "2026-06-13", machine: "HMC9", machineType: "HMC", team: "Team D", reason: "No Load", shift: "B Shift", duration: 270, perMonth: 22.50, ratePerHour: 980 },
  { date: "2026-06-12", machine: "VTL3", machineType: "VTL", team: "Team C", reason: "Break Down", shift: "C Shift", duration: 320, perMonth: 26.67, ratePerHour: 320 },
  { date: "2026-06-11", machine: "CNC1", machineType: "CNC", team: "Team A", reason: "No Operator", shift: "A Shift", duration: 150, perMonth: 20.83, ratePerHour: 600 },
  { date: "2026-06-10", machine: "VMC7", machineType: "VMC", team: "Team B", reason: "Break Down", shift: "C Shift", duration: 180, perMonth: 40.00, ratePerHour: 750 },
  { date: "2026-06-09", machine: "HMC9", machineType: "HMC", team: "Team D", reason: "Under Maintenance", shift: "B Shift", duration: 310, perMonth: 22.50, ratePerHour: 980 }
];

const MOCK_NON_ACCEPTED_LOSS_LOGS = [
  // 1. No Load (Rate 600, Machine CNC-01, Team Team A)
  { date: "2026-06-15", breakdownId: "BD-2026-101", machine: "CNC-01", team: "Team A", reason: "No Load", breakdownStart: "08:00 AM", duration: 40.0, ratePerHour: 600, lossQty: 300, isAccepted: true },
  { date: "2026-06-14", breakdownId: "BD-2026-102", machine: "CNC-01", team: "Team A", reason: "No Load", breakdownStart: "09:30 AM", duration: 50.0, ratePerHour: 600, lossQty: 350, isAccepted: true },
  { date: "2026-06-13", breakdownId: "BD-2026-103", machine: "CNC-01", team: "Team A", reason: "No Load", breakdownStart: "10:00 AM", duration: 30.0, ratePerHour: 600, lossQty: 200, isAccepted: true },
  { date: "2026-06-12", breakdownId: "BD-2026-104", machine: "CNC-01", team: "Team A", reason: "No Load", breakdownStart: "11:30 AM", duration: 45.0, ratePerHour: 600, lossQty: 320, isAccepted: false },
  { date: "2026-06-11", breakdownId: "BD-2026-105", machine: "CNC-01", team: "Team A", reason: "No Load", breakdownStart: "01:00 PM", duration: 50.0, ratePerHour: 600, lossQty: 380, isAccepted: false },
  { date: "2026-06-10", breakdownId: "BD-2026-106", machine: "CNC-01", team: "Team A", reason: "No Load", breakdownStart: "02:30 PM", duration: 35.0, ratePerHour: 600, lossQty: 250, isAccepted: false },

  // 2. Under Maintenance (Rate 750, Machine VMC-01, Team Team B)
  { date: "2026-06-09", breakdownId: "BD-2026-107", machine: "VMC-01", team: "Team B", reason: "Under Maintenance", breakdownStart: "08:30 AM", duration: 80.0, ratePerHour: 750, lossQty: 480, isAccepted: true },
  { date: "2026-06-08", breakdownId: "BD-2026-108", machine: "VMC-01", team: "Team B", reason: "Under Maintenance", breakdownStart: "09:45 AM", duration: 90.0, ratePerHour: 750, lossQty: 540, isAccepted: true },
  { date: "2026-06-07", breakdownId: "BD-2026-109", machine: "VMC-01", team: "Team B", reason: "Under Maintenance", breakdownStart: "11:00 AM", duration: 60.0, ratePerHour: 750, lossQty: 360, isAccepted: true },
  { date: "2026-06-06", breakdownId: "BD-2026-110", machine: "VMC-01", team: "Team B", reason: "Under Maintenance", breakdownStart: "01:15 PM", duration: 100.0, ratePerHour: 750, lossQty: 600, isAccepted: false },
  { date: "2026-06-05", breakdownId: "BD-2026-111", machine: "VMC-01", team: "Team B", reason: "Under Maintenance", breakdownStart: "03:00 PM", duration: 90.0, ratePerHour: 750, lossQty: 540, isAccepted: false },
  { date: "2026-06-04", breakdownId: "BD-2026-112", machine: "VMC-01", team: "Team B", reason: "Under Maintenance", breakdownStart: "04:30 PM", duration: 60.0, ratePerHour: 750, lossQty: 360, isAccepted: false },

  // 3. No Operator (Rate 540, Machine CNC-02, Team Team A)
  { date: "2026-06-03", breakdownId: "BD-2026-113", machine: "CNC-02", team: "Team A", reason: "No Operator", breakdownStart: "08:15 AM", duration: 100.0, ratePerHour: 540, lossQty: 500, isAccepted: true },
  { date: "2026-06-02", breakdownId: "BD-2026-114", machine: "CNC-02", team: "Team A", reason: "No Operator", breakdownStart: "09:30 AM", duration: 120.0, ratePerHour: 540, lossQty: 600, isAccepted: true },
  { date: "2026-06-01", breakdownId: "BD-2026-115", machine: "CNC-02", team: "Team A", reason: "No Operator", breakdownStart: "10:45 AM", duration: 80.0, ratePerHour: 540, lossQty: 400, isAccepted: true },
  { date: "2026-06-15", breakdownId: "BD-2026-116", machine: "CNC-02", team: "Team A", reason: "No Operator", breakdownStart: "01:00 PM", duration: 100.0, ratePerHour: 540, lossQty: 500, isAccepted: true },
  { date: "2026-06-14", breakdownId: "BD-2026-117", machine: "CNC-02", team: "Team A", reason: "No Operator", breakdownStart: "02:15 PM", duration: 150.0, ratePerHour: 540, lossQty: 750, isAccepted: false },
  { date: "2026-06-13", breakdownId: "BD-2026-118", machine: "CNC-02", team: "Team A", reason: "No Operator", breakdownStart: "03:45 PM", duration: 180.0, ratePerHour: 540, lossQty: 900, isAccepted: false },
  { date: "2026-06-12", breakdownId: "BD-2026-119", machine: "CNC-02", team: "Team A", reason: "No Operator", breakdownStart: "05:00 PM", duration: 120.0, ratePerHour: 540, lossQty: 600, isAccepted: false },
  { date: "2026-06-11", breakdownId: "BD-2026-120", machine: "CNC-02", team: "Team A", reason: "No Operator", breakdownStart: "08:00 AM", duration: 100.0, ratePerHour: 540, lossQty: 500, isAccepted: false },

  // 4. No Load (Rate 980, Machine VMC-02, Team Team D)
  { date: "2026-06-10", breakdownId: "BD-2026-121", machine: "VMC-02", team: "Team D", reason: "No Load", breakdownStart: "09:00 AM", duration: 70.0, ratePerHour: 980, lossQty: 350, isAccepted: true },
  { date: "2026-06-09", breakdownId: "BD-2026-122", machine: "VMC-02", team: "Team D", reason: "No Load", breakdownStart: "10:30 AM", duration: 80.0, ratePerHour: 980, lossQty: 400, isAccepted: true },
  { date: "2026-06-08", breakdownId: "BD-2026-123", machine: "VMC-02", team: "Team D", reason: "No Load", breakdownStart: "12:00 PM", duration: 60.0, ratePerHour: 980, lossQty: 300, isAccepted: true },
  { date: "2026-06-07", breakdownId: "BD-2026-124", machine: "VMC-02", team: "Team D", reason: "No Load", breakdownStart: "02:00 PM", duration: 40.0, ratePerHour: 980, lossQty: 200, isAccepted: false },
  { date: "2026-06-06", breakdownId: "BD-2026-125", machine: "VMC-02", team: "Team D", reason: "No Load", breakdownStart: "03:30 PM", duration: 20.0, ratePerHour: 980, lossQty: 100, isAccepted: false },

  // 5. Break Down (Rate 320, Machine Grinding-01, Team Team C)
  { date: "2026-06-05", breakdownId: "BD-2026-126", machine: "Grinding-01", team: "Team C", reason: "Break Down", breakdownStart: "08:30 AM", duration: 60.0, ratePerHour: 320, lossQty: 180, isAccepted: true },
  { date: "2026-06-04", breakdownId: "BD-2026-127", machine: "Grinding-01", team: "Team C", reason: "Break Down", breakdownStart: "10:00 AM", duration: 70.0, ratePerHour: 320, lossQty: 210, isAccepted: true },
  { date: "2026-06-03", breakdownId: "BD-2026-128", machine: "Grinding-01", team: "Team C", reason: "Break Down", breakdownStart: "11:30 AM", duration: 50.0, ratePerHour: 320, lossQty: 150, isAccepted: true },
  { date: "2026-06-02", breakdownId: "BD-2026-129", machine: "Grinding-01", team: "Team C", reason: "Break Down", breakdownStart: "01:00 PM", duration: 50.0, ratePerHour: 320, lossQty: 150, isAccepted: false },
  { date: "2026-06-01", breakdownId: "BD-2026-130", machine: "Grinding-01", team: "Team C", reason: "Break Down", breakdownStart: "02:30 PM", duration: 50.0, ratePerHour: 320, lossQty: 150, isAccepted: false },
  { date: "2026-06-15", breakdownId: "BD-2026-131", machine: "Grinding-01", team: "Team C", reason: "Break Down", breakdownStart: "04:00 PM", duration: 40.0, ratePerHour: 320, lossQty: 120, isAccepted: false }
];

const formatLossValue = (val) => {
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  }
  return `₹${val.toLocaleString()}`;
};

function IdleHoursReportDashboardView({ filters, onFilterChange, activeTab, onActiveTabChange, onClose, targetConfig }) {
  const [dateOpen, setDateOpen] = React.useState(false);
  const dateRangeRef = React.useRef(null);
  const activeChart = activeTab === "chart2" ? 1 : 0;

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target)) {
        setDateOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      machine: "",
      team: "",
      idleReason: "",
    });
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateStr;
  };

  const dateRangeDisplay = () => {
    if (filters.fromDate && filters.toDate) {
      return `${formatDateDisplay(filters.fromDate)} - ${formatDateDisplay(filters.toDate)}`;
    }
    if (filters.fromDate) {
      return `${formatDateDisplay(filters.fromDate)} - ...`;
    }
    if (filters.toDate) {
      return `... - ${formatDateDisplay(filters.toDate)}`;
    }
    return "Select Date Range...";
  };

  const filteredLogs = React.useMemo(() => {
    let list = MOCK_IDLE_LOGS;
    if (filters.fromDate) list = list.filter(r => r.date >= filters.fromDate);
    if (filters.toDate) list = list.filter(r => r.date <= filters.toDate);
    if (filters.team) list = list.filter(r => r.team === filters.team);
    if (filters.machine) list = list.filter(r => r.machine === filters.machine);
    if (filters.idleReason) list = list.filter(r => r.reason === filters.idleReason);
    return list;
  }, [filters]);

  const kpis = React.useMemo(() => {
    const totalIdleHours = filteredLogs.reduce((sum, r) => sum + r.duration, 0);
    const totalLossValue = filteredLogs.reduce((sum, r) => sum + (r.duration * r.ratePerHour), 0);

    const machineLoss = {};
    filteredLogs.forEach(r => {
      machineLoss[r.machine] = (machineLoss[r.machine] || 0) + (r.duration * r.ratePerHour);
    });
    let maxMach = "—";
    let maxMachLoss = -1;
    Object.keys(machineLoss).forEach(m => {
      if (machineLoss[m] > maxMachLoss) {
        maxMachLoss = machineLoss[m];
        maxMach = m;
      }
    });
    const highestLossMachine = maxMachLoss > 0 ? `${maxMach}\n₹${(maxMachLoss / 100000).toFixed(3)} L` : "—";

    const reasonLoss = {};
    filteredLogs.forEach(r => {
      reasonLoss[r.reason] = (reasonLoss[r.reason] || 0) + (r.duration * r.ratePerHour);
    });
    let maxReason = "—";
    let maxReasonLoss = -1;
    Object.keys(reasonLoss).forEach(re => {
      if (reasonLoss[re] > maxReasonLoss) {
        maxReasonLoss = reasonLoss[re];
        maxReason = re;
      }
    });
    const highestLossReason = maxReasonLoss > 0 ? `${maxReason}\n₹${(maxReasonLoss / 100000).toFixed(3)} L` : "—";

    let monthStr = "2026-06"; // default to June 2026
    if (filters.fromDate) {
      monthStr = filters.fromDate.substring(0, 7);
    }
    let listMonthly = MOCK_IDLE_LOGS.filter(r => r.date.startsWith(monthStr));
    if (filters.team) listMonthly = listMonthly.filter(r => r.team === filters.team);
    if (filters.machine) listMonthly = listMonthly.filter(r => r.machine === filters.machine);
    if (filters.idleReason) listMonthly = listMonthly.filter(r => r.reason === filters.idleReason);
    const monthlySum = listMonthly.reduce((s, r) => s + (r.duration / 12), 0);

    return [
      { label: "Total Idle Hours", value: `${totalIdleHours.toFixed(1)} h`, icon: "⏱️", color: "#ef4444" },
      { label: "Total Loss Value", value: `₹${(totalLossValue / 100000).toFixed(3)} L`, icon: "💸", color: "#ea580c" },
      { label: "Highest Loss Machine", value: highestLossMachine, icon: "⚙️", color: "#3b82f6" },
      { label: "Highest Loss Reason", value: highestLossReason, icon: "⚠️", color: "#f59e0b" },
      { label: "Total Monthly Idle Hours", value: `${monthlySum.toFixed(2)} h`, icon: "📅", color: "#10b981" }
    ];
  }, [filteredLogs, filters.fromDate, filters.team, filters.machine, filters.idleReason]);

  const chart1Data = React.useMemo(() => {
    const categories = ["No Load", "Under Maintenance", "No Operator", "Break Down"];
    const aggregated = {};
    categories.forEach(cat => {
      aggregated[cat] = { idealHours: 0, perMonth: 0, loss: 0 };
    });

    filteredLogs.forEach(r => {
      if (aggregated[r.reason]) {
        aggregated[r.reason].idealHours += r.duration;
        aggregated[r.reason].perMonth += (r.duration / 12);
        aggregated[r.reason].loss += ((r.duration * r.ratePerHour) / 100000);
      }
    });

    const labels = categories.filter(cat => aggregated[cat].idealHours > 0 || aggregated[cat].perMonth > 0 || aggregated[cat].loss > 0);
    const idealHours = labels.map(l => aggregated[l].idealHours);
    const perMonth = labels.map(l => Number(aggregated[l].perMonth.toFixed(2)));
    const loss = labels.map(l => Number(aggregated[l].loss.toFixed(3)));

    return { labels, idealHours, perMonth, loss };
  }, [filteredLogs]);

  const chart2Data = React.useMemo(() => {
    const machinesList = ["CNC1", "VMC7", "CNC2", "HMC9", "VTL3"];
    const aggregated = {};
    machinesList.forEach(m => {
      aggregated[m] = { perMonth: 0, loss: 0 };
    });

    filteredLogs.forEach(r => {
      if (aggregated[r.machine]) {
        aggregated[r.machine].perMonth += (r.duration / 12);
        aggregated[r.machine].loss += ((r.duration * r.ratePerHour) / 100000);
      }
    });

    const labels = machinesList.filter(m => aggregated[m].perMonth > 0 || aggregated[m].loss > 0);
    const perMonth = labels.map(l => Number(aggregated[l].perMonth.toFixed(2)));
    const loss = labels.map(l => Number(aggregated[l].loss.toFixed(3)));

    return { labels, perMonth, loss };
  }, [filteredLogs]);

  const setupChart1 = React.useCallback((canvas) => {
    const ctx = canvas.getContext("2d");
    const maxIdleHours = targetConfig?.idle_hours?.maxIdleHours ?? 15;
    return new Chart(ctx, {
      data: {
        labels: chart1Data.labels,
        datasets: [
          {
            type: "bar",
            label: "Ideal Hours",
            data: chart1Data.idealHours,
            yAxisID: "yIdle",
            backgroundColor: "rgba(59, 130, 246, 0.75)",
            borderColor: "#3b82f6",
            borderWidth: 1.5,
            borderRadius: 4
          },
          {
            type: "bar",
            label: "Per Month Idle Hours",
            data: chart1Data.perMonth,
            yAxisID: "yIdle",
            backgroundColor: "rgba(139, 92, 246, 0.75)",
            borderColor: "#8b5cf6",
            borderWidth: 1.5,
            borderRadius: 4
          },
          {
            type: "line",
            label: "Production Loss (Lakhs)",
            data: chart1Data.loss,
            yAxisID: "yLoss",
            borderColor: "#ef4444",
            backgroundColor: "#ef4444",
            borderWidth: 2.5,
            tension: 0.25,
            fill: false,
            pointRadius: 4
          },
          {
            type: "line",
            label: "Max Idle Hours Target",
            data: chart1Data.labels.map(() => maxIdleHours),
            yAxisID: "yIdle",
            borderColor: "rgba(239, 68, 68, 0.85)",
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "top", labels: { font: { size: 10, family: "'Inter', sans-serif" }, usePointStyle: true } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          yIdle: {
            type: "linear",
            position: "left",
            title: { display: true, text: "Idle Hours", color: "#3b82f6", font: { size: 10, weight: 700 } },
            ticks: { font: { size: 9 } },
            grid: { color: "rgba(0,0,0,0.05)" }
          },
          yLoss: {
            type: "linear",
            position: "right",
            title: { display: true, text: "Loss Value (Lakhs)", color: "#ef4444", font: { size: 10, weight: 700 } },
            ticks: { font: { size: 9 }, callback: (v) => `${v}L` },
            grid: { display: false }
          }
        }
      }
    });
  }, [chart1Data, targetConfig]);

  const setupChart2 = React.useCallback((canvas) => {
    const ctx = canvas.getContext("2d");
    const maxIdleHours = targetConfig?.idle_hours?.maxIdleHours ?? 15;
    return new Chart(ctx, {
      data: {
        labels: chart2Data.labels,
        datasets: [
          {
            type: "bar",
            label: "Per Month Idle Hours",
            data: chart2Data.perMonth,
            yAxisID: "yIdle",
            backgroundColor: "rgba(16, 185, 129, 0.75)",
            borderColor: "#10b981",
            borderWidth: 1.5,
            borderRadius: 4
          },
          {
            type: "line",
            label: "Production Loss (Lakhs)",
            data: chart2Data.loss,
            yAxisID: "yLoss",
            borderColor: "#f59e0b",
            backgroundColor: "#f59e0b",
            borderWidth: 2.5,
            tension: 0.25,
            fill: false,
            pointRadius: 4
          },
          {
            type: "line",
            label: "Max Idle Hours Target",
            data: chart2Data.labels.map(() => maxIdleHours),
            yAxisID: "yIdle",
            borderColor: "rgba(239, 68, 68, 0.85)",
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "top", labels: { font: { size: 10, family: "'Inter', sans-serif" }, usePointStyle: true } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          yIdle: {
            type: "linear",
            position: "left",
            title: { display: true, text: "Per Month Idle Hours", color: "#10b981", font: { size: 10, weight: 700 } },
            ticks: { font: { size: 9 } },
            grid: { color: "rgba(0,0,0,0.05)" }
          },
          yLoss: {
            type: "linear",
            position: "right",
            title: { display: true, text: "Loss Value (Lakhs)", color: "#f59e0b", font: { size: 10, weight: 700 } },
            ticks: { font: { size: 9 }, callback: (v) => `${v}L` },
            grid: { display: false }
          }
        }
      }
    });
  }, [chart2Data, targetConfig]);

  const teams = ["Team A", "Team B", "Team C", "Team D"];
  const machines = ["CNC1", "VMC7", "CNC2", "HMC9", "VTL3"];
  const idleReasons = ["No Load", "Under Maintenance", "No Operator", "Break Down"];

  const carouselControls = (
    <div className="pp1-dt-card" style={{ padding: "14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)", background: "#fff", marginTop: "10px" }}>
      <div className="pp1-dt-card__hd" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div className="pp1-dt-card__title" style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--pp1-text-3)" }}>
          {activeChart === 0 ? "Idle Hours vs Production Loss Value" : "Machine Wise Idle Loss"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => onActiveTabChange(activeTab === "chart1" ? "chart2" : "chart1")}
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              color: "var(--pp1-text-3)",
              transition: "all 0.15s ease"
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--pp1-text-3)", minWidth: "30px", textAlign: "center" }}>
            {activeChart + 1} / 2
          </span>
          <button
            type="button"
            onClick={() => onActiveTabChange(activeTab === "chart1" ? "chart2" : "chart1")}
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              color: "var(--pp1-text-3)",
              transition: "all 0.15s ease"
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="pp1-dt-chart-wrap" style={{ height: 220, position: "relative" }}>
        {activeChart === 0 ? (
          <ChartJsCanvas setup={setupChart1} height={220} rebuildToken={`c1-${JSON.stringify(chart1Data)}`} />
        ) : (
          <ChartJsCanvas setup={setupChart2} height={220} rebuildToken={`c2-${JSON.stringify(chart2Data)}`} />
        )}
      </div>
    </div>
  );

  return (
    <PremiumDashboardView
      title="Idle Hours Report"
      icon={Timer}
      color="#ef4444"
      kpis={kpis}
      setupChart={null}
      chartControls={carouselControls}
      rangeHint=""
      onClose={onClose}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" ref={dateRangeRef}>
          <label className="pp1-filter-label">Date Range</label>
          <div
            className="pp1-filter-input pp1-filter-input--date-range-trigger"
            onClick={() => setDateOpen(!dateOpen)}
          >
            <span>{dateRangeDisplay()}</span>
            <Calendar size={13} className="pp1-filter-icon" />
          </div>
          {dateOpen && (
            <div className="pp1-date-popup">
              <div className="pp1-date-popup-inputs">
                <div className="pp1-date-popup-field">
                  <label>From</label>
                  <input
                    type="date"
                    value={filters.fromDate || ""}
                    onChange={e => handleInputChange("fromDate", e.target.value)}
                  />
                </div>
                <div className="pp1-date-popup-field">
                  <label>To</label>
                  <input
                    type="date"
                    value={filters.toDate || ""}
                    onChange={e => handleInputChange("toDate", e.target.value)}
                  />
                </div>
              </div>
              <div className="pp1-date-popup-footer">
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange("fromDate", "");
                    handleInputChange("toDate", "");
                    setDateOpen(false);
                  }}
                >
                  Clear
                </button>
                <button type="button" className="pp1-btn-apply" onClick={() => setDateOpen(false)}>Done</button>
              </div>
            </div>
          )}
        </div>

        {/* Machine Dropdown */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Machine</label>
          <select
            className="pp1-filter-input"
            value={filters.machine || ""}
            onChange={e => handleInputChange("machine", e.target.value)}
          >
            <option value="">All Machines</option>
            {machines.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Team Dropdown */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Team</label>
          <select
            className="pp1-filter-input"
            value={filters.team || ""}
            onChange={e => handleInputChange("team", e.target.value)}
          >
            <option value="">All Teams</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Idle Reason Dropdown */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Idle Reason</label>
          <select
            className="pp1-filter-input"
            value={filters.idleReason || ""}
            onChange={e => handleInputChange("idleReason", e.target.value)}
          >
            <option value="">All Reasons</option>
            {idleReasons.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          className="pp1-filter-btn pp1-filter-btn--reset"
          onClick={handleReset}
          style={{ flexShrink: 0, height: "28px" }}
        >
          Reset
        </button>
      </div>
    </PremiumDashboardView>
  );
}

function IdleHoursReportBottomTable({ filters, activeTab, setActiveTab }) {

  const filteredLogs = React.useMemo(() => {
    let list = MOCK_IDLE_LOGS;
    if (filters?.fromDate) list = list.filter(r => r.date >= filters.fromDate);
    if (filters?.toDate) list = list.filter(r => r.date <= filters.toDate);
    if (filters?.team) list = list.filter(r => r.team === filters.team);
    if (filters?.machine) list = list.filter(r => r.machine === filters.machine);
    if (filters?.idleReason) list = list.filter(r => r.reason === filters.idleReason);
    return list;
  }, [filters]);

  // Tab 1 Data
  const columns1 = ["Team", "Machine", "Idle Reason", "Ideal Hours", "Per Month", "Rate Per Hour", "Production Loss (Lakhs)"];
  const rows1 = React.useMemo(() => {
    return filteredLogs.map(r => [
      r.team,
      r.machine,
      r.reason,
      `${r.duration} h`,
      `${(r.duration / 12).toFixed(2)} h`,
      `₹${r.ratePerHour.toLocaleString()}`,
      `₹${((r.duration * r.ratePerHour) / 100000).toFixed(3)} L`
    ]);
  }, [filteredLogs]);

  // Tab 2 Data
  const columns2 = ["Machine", "Per Month Idle Hours", "Production Loss Value (Lakhs)"];
  const rows2 = React.useMemo(() => {
    const grps = {};
    filteredLogs.forEach(r => {
      if (!grps[r.machine]) grps[r.machine] = { hours: 0, loss: 0 };
      grps[r.machine].hours += (r.duration / 12);
      grps[r.machine].loss += ((r.duration * r.ratePerHour) / 100000);
    });
    return Object.keys(grps).map(m => [
      m,
      `${grps[m].hours.toFixed(2)} h`,
      `₹${grps[m].loss.toFixed(3)} L`
    ]);
  }, [filteredLogs]);

  // Tab 3 Data
  const columns3 = ["Team", "Machine", "Machine Type", "Idle Reason", "Idle Hours", "Per Day", "Per Month", "Rate Per Hour", "Production Loss"];
  const rows3 = React.useMemo(() => {
    const getPerDay = (machine, date) => {
      const sum = MOCK_IDLE_LOGS
        .filter(x => x.machine === machine && x.date === date)
        .reduce((s, x) => s + x.duration, 0);
      return `${sum.toFixed(1)} h`;
    };

    const getPerMonth = (machine, date) => {
      const monthStr = date.substring(0, 7);
      const sum = MOCK_IDLE_LOGS
        .filter(x => x.machine === machine && x.date.startsWith(monthStr))
        .reduce((s, x) => s + x.duration, 0);
      return `${sum.toFixed(1)} h`;
    };

    return filteredLogs.map(r => [
      r.team,
      r.machine,
      r.machineType,
      r.reason,
      `${r.duration.toFixed(1)} h`,
      getPerDay(r.machine, r.date),
      getPerMonth(r.machine, r.date),
      `₹${r.ratePerHour.toLocaleString()}`,
      `₹${(r.duration * r.ratePerHour).toLocaleString()}`
    ]);
  }, [filteredLogs]);

  const activeColumns = activeTab === "chart1" ? columns1 : activeTab === "chart2" ? columns2 : columns3;
  const activeRows = activeTab === "chart1" ? rows1 : activeTab === "chart2" ? rows2 : rows3;

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "18px", borderBottom: "1px solid rgba(0,0,0,0.08)", width: "100%", paddingBottom: "4px" }}>
          {[
            { id: "chart1", label: "Idle Hours vs Production Loss Value" },
            { id: "chart2", label: "Machine Wise Idle Loss" },
            { id: "log", label: "Idle Time Accepted Log" }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === t.id ? "2.5px solid var(--pp1-blue)" : "none",
                color: activeTab === t.id ? "var(--pp1-blue)" : "var(--pp1-text-3)",
                fontWeight: 700,
                fontSize: "12px",
                paddingBottom: "6px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
          <thead>
            <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
              {activeColumns.map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#f2f6fe",
                    zIndex: 10,
                    textAlign: idx > 2 && (
                      col.toLowerCase().includes("qty") ||
                      col.toLowerCase().includes("value") ||
                      col.toLowerCase().includes("hours") ||
                      col.toLowerCase().includes("hour") ||
                      col.toLowerCase().includes("rate") ||
                      col.toLowerCase().includes("ratio") ||
                      col.toLowerCase().includes("%") ||
                      col.toLowerCase().includes("day") ||
                      col.toLowerCase().includes("month") ||
                      col.toLowerCase().includes("loss")
                    ) ? "right" : "left"
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeRows.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length} className="pp1-cc-tbl__empty">
                  No data available.
                </td>
              </tr>
            ) : (
              activeRows.map((row, ri) => (
                <tr key={ri} className="pp1-cc-tbl__tr">
                  {row.map((cell, ci) => {
                    const isRightAligned = ci > 2 && (
                      activeColumns[ci].toLowerCase().includes("qty") ||
                      activeColumns[ci].toLowerCase().includes("value") ||
                      activeColumns[ci].toLowerCase().includes("hours") ||
                      activeColumns[ci].toLowerCase().includes("hour") ||
                      activeColumns[ci].toLowerCase().includes("rate") ||
                      activeColumns[ci].toLowerCase().includes("ratio") ||
                      activeColumns[ci].toLowerCase().includes("%") ||
                      activeColumns[ci].toLowerCase().includes("day") ||
                      activeColumns[ci].toLowerCase().includes("month") ||
                      activeColumns[ci].toLowerCase().includes("loss")
                    );
                    return (
                      <td
                        key={ci}
                        className={ci === 0 ? "pp1-cc-tbl__bold" : ci === 2 ? "pp1-cc-tbl__id" : ""}
                        style={{
                          textAlign: isRightAligned ? "right" : "left",
                          fontWeight: ci < 3 ? 700 : 600
                        }}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IdleHoursNonAcceptedReasonLossReportView({ filters, onFilterChange, onClose, targetConfig }) {
  const [dateOpen, setDateOpen] = React.useState(false);
  const dateRangeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target)) {
        setDateOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      machine: "",
      team: "",
      reason: "",
    });
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateStr;
  };

  const dateRangeDisplay = () => {
    if (filters?.fromDate && filters?.toDate) {
      return `${formatDateDisplay(filters.fromDate)} - ${formatDateDisplay(filters.toDate)}`;
    }
    if (filters?.fromDate) {
      return `${formatDateDisplay(filters.fromDate)} - ...`;
    }
    if (filters?.toDate) {
      return `... - ${formatDateDisplay(filters.toDate)}`;
    }
    return "Select Date Range...";
  };

  const filteredLogs = React.useMemo(() => {
    let list = MOCK_NON_ACCEPTED_LOSS_LOGS;
    if (filters?.fromDate) list = list.filter(r => r.date >= filters.fromDate);
    if (filters?.toDate) list = list.filter(r => r.date <= filters.toDate);
    if (filters?.machine) list = list.filter(r => r.machine === filters.machine);
    if (filters?.team) list = list.filter(r => r.team === filters.team);
    if (filters?.reason) list = list.filter(r => r.reason === filters.reason);
    return list;
  }, [filters]);

  const kpis = React.useMemo(() => {
    const totalIdleHours = filteredLogs.reduce((sum, r) => sum + r.duration, 0);
    const acceptedHours = filteredLogs.filter(r => r.isAccepted).reduce((sum, r) => sum + r.duration, 0);
    const nonAcceptedHours = filteredLogs.filter(r => !r.isAccepted).reduce((sum, r) => sum + r.duration, 0);
    const totalLossValue = filteredLogs.reduce((sum, r) => sum + (r.duration * r.ratePerHour), 0);

    const reasonLoss = {};
    filteredLogs.forEach(r => {
      reasonLoss[r.reason] = (reasonLoss[r.reason] || 0) + (r.duration * r.ratePerHour);
    });
    let maxReason = "—";
    let maxReasonLoss = -1;
    Object.keys(reasonLoss).forEach(re => {
      if (reasonLoss[re] > maxReasonLoss) {
        maxReasonLoss = reasonLoss[re];
        maxReason = re;
      }
    });
    const highestLossReason = maxReasonLoss > 0
      ? `${maxReason}\n${formatLossValue(maxReasonLoss)}`
      : "—";

    return [
      { label: "Total Idle Hours", value: `${totalIdleHours.toFixed(1)} h`, icon: "⏱️", color: "#3b82f6" },
      { label: "Accepted Hours", value: `${acceptedHours.toFixed(1)} h`, icon: "✅", color: "#10b981" },
      { label: "Non Accepted Hours", value: `${nonAcceptedHours.toFixed(1)} h`, icon: "🚫", color: "#ef4444" },
      { label: "Total Loss Value", value: formatLossValue(totalLossValue), icon: "💸", color: "#ea580c" },
      { label: "Highest Loss Reason", value: highestLossReason, icon: "⚠️", color: "#f59e0b" }
    ];
  }, [filteredLogs]);

  const chartData = React.useMemo(() => {
    const reasons = ["No Load", "Under Maintenance", "No Operator", "Break Down"];
    const aggregated = {};
    reasons.forEach(r => {
      aggregated[r] = {
        accHrs: 0,
        accLoss: 0,
        nonAccHrs: 0,
        nonAccLoss: 0,
        totalLoss: 0
      };
    });

    filteredLogs.forEach(r => {
      if (aggregated[r.reason]) {
        if (r.isAccepted) {
          aggregated[r.reason].accHrs += r.duration;
          aggregated[r.reason].accLoss += (r.duration * r.ratePerHour);
        } else {
          aggregated[r.reason].nonAccHrs += r.duration;
          aggregated[r.reason].nonAccLoss += (r.duration * r.ratePerHour);
        }
        aggregated[r.reason].totalLoss = aggregated[r.reason].accLoss + aggregated[r.reason].nonAccLoss;
      }
    });

    return {
      labels: reasons,
      acceptedLoss: reasons.map(r => Number((aggregated[r].accLoss / 100000).toFixed(3))),
      nonAcceptedLoss: reasons.map(r => Number((aggregated[r].nonAccLoss / 100000).toFixed(3))),
      totalLoss: reasons.map(r => Number((aggregated[r].totalLoss / 100000).toFixed(3))),
      acceptedHrs: reasons.map(r => Number(aggregated[r].accHrs.toFixed(1))),
      nonAcceptedHrs: reasons.map(r => Number(aggregated[r].nonAccHrs.toFixed(1)))
    };
  }, [filteredLogs]);

  const setupChart = React.useCallback((canvas) => {
    const ctx = canvas.getContext("2d");
    const maxNonAcceptedHours = targetConfig?.idle_hours_non_accepted?.maxNonAcceptedHours ?? 5;
    const unplannedLimit = targetConfig?.idle_hours_non_accepted?.unplannedLimit ?? 10;
    return new Chart(ctx, {
      data: {
        labels: chartData.labels,
        datasets: [
          {
            type: "bar",
            label: "Accepted Production Loss Value",
            data: chartData.acceptedLoss,
            yAxisID: "yLoss",
            backgroundColor: "rgba(16, 185, 129, 0.75)",
            borderColor: "#10b981",
            borderWidth: 1.5,
            borderRadius: 4
          },
          {
            type: "bar",
            label: "Non Accepted Production Loss Value",
            data: chartData.nonAcceptedLoss,
            yAxisID: "yLoss",
            backgroundColor: "rgba(244, 63, 94, 0.75)",
            borderColor: "#ef4444",
            borderWidth: 1.5,
            borderRadius: 4
          },
          {
            type: "line",
            label: "Total Production Loss Value",
            data: chartData.totalLoss,
            yAxisID: "yLoss",
            borderColor: "#f59e0b",
            backgroundColor: "#f59e0b",
            borderWidth: 2.5,
            tension: 0.25,
            fill: false,
            pointRadius: 4
          },
          {
            type: "line",
            label: "Accepted Reason Hours",
            data: chartData.acceptedHrs,
            yAxisID: "yHours",
            borderColor: "#3b82f6",
            backgroundColor: "#3b82f6",
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.25,
            fill: false,
            pointRadius: 4
          },
          {
            type: "line",
            label: "Non Accepted Reason Hours",
            data: chartData.nonAcceptedHrs,
            yAxisID: "yHours",
            borderColor: "#8b5cf6",
            backgroundColor: "#8b5cf6",
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.25,
            fill: false,
            pointRadius: 4
          },
          {
            type: "line",
            label: "Max Non-Accepted Target",
            data: chartData.labels.map(() => maxNonAcceptedHours),
            yAxisID: "yHours",
            borderColor: "rgba(239, 68, 68, 0.85)",
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0
          },
          {
            type: "line",
            label: `Unplanned Loss Threshold (${unplannedLimit}%)`,
            data: chartData.totalLoss.map(v => Number((v * unplannedLimit / 100).toFixed(3))),
            yAxisID: "yLoss",
            borderColor: "rgba(244, 63, 94, 0.85)",
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "top",
            labels: {
              font: { size: 9, family: "'Inter', sans-serif" },
              usePointStyle: true,
              boxWidth: 8
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          yLoss: {
            type: "linear",
            position: "left",
            title: { display: true, text: "Loss Value (Lakhs)", color: "#ef4444", font: { size: 10, weight: 700 } },
            ticks: { font: { size: 9 }, callback: (v) => `₹${v}L` },
            grid: { color: "rgba(0,0,0,0.05)" }
          },
          yHours: {
            type: "linear",
            position: "right",
            title: { display: true, text: "Hours", color: "#3b82f6", font: { size: 10, weight: 700 } },
            ticks: { font: { size: 9 }, callback: (v) => `${v}h` },
            grid: { display: false }
          }
        }
      }
    });
  }, [chartData, targetConfig]);

  const machines = ["CNC-01", "CNC-02", "VMC-01", "VMC-02", "Grinding-01"];
  const teams = ["Team A", "Team B", "Team C", "Team D"];
  const nonAcceptedReasons = ["No Load", "Under Maintenance", "No Operator", "Break Down"];

  return (
    <PremiumDashboardView
      title="Idle Hours – Non Accepted Reason Production Loss Report"
      icon={AlertTriangle}
      color="#f43f5e"
      kpis={kpis}
      setupChart={setupChart}
      rebuildToken={JSON.stringify(chartData)}
      rangeHint="Accepted vs Non Accepted Production Loss"
      onClose={onClose}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" ref={dateRangeRef}>
          <label className="pp1-filter-label">Date Range</label>
          <div
            className="pp1-filter-input pp1-filter-input--date-range-trigger"
            onClick={() => setDateOpen(!dateOpen)}
          >
            <span>{dateRangeDisplay()}</span>
            <Calendar size={13} className="pp1-filter-icon" />
          </div>
          {dateOpen && (
            <div className="pp1-date-popup">
              <div className="pp1-date-popup-inputs">
                <div className="pp1-date-popup-field">
                  <label>From</label>
                  <input
                    type="date"
                    value={filters?.fromDate || ""}
                    onChange={e => handleInputChange("fromDate", e.target.value)}
                  />
                </div>
                <div className="pp1-date-popup-field">
                  <label>To</label>
                  <input
                    type="date"
                    value={filters?.toDate || ""}
                    onChange={e => handleInputChange("toDate", e.target.value)}
                  />
                </div>
              </div>
              <div className="pp1-date-popup-footer">
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange("fromDate", "");
                    handleInputChange("toDate", "");
                    setDateOpen(false);
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="pp1-date-popup-btn-apply"
                  onClick={() => setDateOpen(false)}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Machine Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Machine</label>
          <select
            className="pp1-filter-input"
            value={filters?.machine || ""}
            onChange={e => handleInputChange("machine", e.target.value)}
          >
            <option value="">All Machines</option>
            {machines.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Team Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Team</label>
          <select
            className="pp1-filter-input"
            value={filters?.team || ""}
            onChange={e => handleInputChange("team", e.target.value)}
          >
            <option value="">All Teams</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Reason Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Reason</label>
          <select
            className="pp1-filter-input"
            value={filters?.reason || ""}
            onChange={e => handleInputChange("reason", e.target.value)}
          >
            <option value="">All Reasons</option>
            {nonAcceptedReasons.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          className="pp1-filter-btn pp1-filter-btn--reset"
          onClick={handleReset}
          style={{ flexShrink: 0, height: "28px" }}
        >
          Reset
        </button>
      </div>
    </PremiumDashboardView>
  );
}

function IdleHoursNonAcceptedReasonLossReportBottomTable({ filters }) {
  const [activeTab, setActiveTab] = React.useState("chart_table");

  const filteredLogs = React.useMemo(() => {
    let list = MOCK_NON_ACCEPTED_LOSS_LOGS;
    if (filters?.fromDate) list = list.filter(r => r.date >= filters.fromDate);
    if (filters?.toDate) list = list.filter(r => r.date <= filters.toDate);
    if (filters?.machine) list = list.filter(r => r.machine === filters.machine);
    if (filters?.team) list = list.filter(r => r.team === filters.team);
    if (filters?.reason) list = list.filter(r => r.reason === filters.reason);
    return list;
  }, [filters]);

  // Tab 1: Aggregated Accepted vs Non Accepted Production Loss
  const columns1 = ["Idle Reason", "Idle Hours", "Rate/Hr", "Accepted Hrs", "Accepted Loss", "Non Accepted Hrs", "Non Accepted Loss", "Total Loss"];
  const rows1 = React.useMemo(() => {
    const groups = {};
    filteredLogs.forEach(r => {
      const key = `${r.reason}_${r.ratePerHour}`;
      if (!groups[key]) {
        groups[key] = {
          reason: r.reason,
          ratePerHour: r.ratePerHour,
          accHrs: 0,
          nonAccHrs: 0,
        };
      }
      if (r.isAccepted) {
        groups[key].accHrs += r.duration;
      } else {
        groups[key].nonAccHrs += r.duration;
      }
    });

    return Object.values(groups).map(g => {
      const idleHours = g.accHrs + g.nonAccHrs;
      const accLoss = g.accHrs * g.ratePerHour;
      const nonAccLoss = g.nonAccHrs * g.ratePerHour;
      const totalLoss = accLoss + nonAccLoss;

      return [
        g.reason,
        `${idleHours.toFixed(1)} h`,
        `₹${g.ratePerHour.toLocaleString()}`,
        `${g.accHrs.toFixed(1)} h`,
        formatLossValue(accLoss),
        `${g.nonAccHrs.toFixed(1)} h`,
        formatLossValue(nonAccLoss),
        formatLossValue(totalLoss)
      ];
    });
  }, [filteredLogs]);

  // Tab 2: Production Loss Log
  const columns2 = ["Team", "Machine", "Idle Reason", "Rate/Hr", "Accepted Hours", "Accepted Loss", "Non Accepted Hours", "Non Accepted Loss", "Total Loss"];
  const rows2 = React.useMemo(() => {
    return filteredLogs.map(r => [
      r.team,
      r.machine,
      r.reason,
      `₹${r.ratePerHour.toLocaleString()}`,
      r.isAccepted ? `${r.duration.toFixed(1)} h` : "0.0 h",
      r.isAccepted ? formatLossValue(r.duration * r.ratePerHour) : "₹0",
      !r.isAccepted ? `${r.duration.toFixed(1)} h` : "0.0 h",
      !r.isAccepted ? formatLossValue(r.duration * r.ratePerHour) : "₹0",
      formatLossValue(r.duration * r.ratePerHour)
    ]);
  }, [filteredLogs]);

  const activeColumns = activeTab === "chart_table" ? columns1 : columns2;
  const activeRows = activeTab === "chart_table" ? rows1 : rows2;

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "18px", borderBottom: "1px solid rgba(0,0,0,0.08)", width: "100%", paddingBottom: "4px" }}>
          {[
            { id: "chart_table", label: "Accepted vs Non Accepted Production Loss" },
            { id: "log", label: "Production Loss Log" }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === t.id ? "2.5px solid var(--pp1-blue)" : "none",
                color: activeTab === t.id ? "var(--pp1-blue)" : "var(--pp1-text-3)",
                fontWeight: 700,
                fontSize: "12px",
                paddingBottom: "6px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
          <thead>
            <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
              {activeColumns.map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#f2f6fe",
                    zIndex: 10,
                    textAlign: idx > 0 && (
                      col.toLowerCase().includes("qty") ||
                      col.toLowerCase().includes("value") ||
                      col.toLowerCase().includes("hours") ||
                      col.toLowerCase().includes("hrs") ||
                      col.toLowerCase().includes("hour") ||
                      col.toLowerCase().includes("rate") ||
                      col.toLowerCase().includes("ratio") ||
                      col.toLowerCase().includes("%") ||
                      col.toLowerCase().includes("day") ||
                      col.toLowerCase().includes("month") ||
                      col.toLowerCase().includes("loss")
                    ) ? "right" : "left"
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeRows.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length} className="pp1-cc-tbl__empty">
                  No data available.
                </td>
              </tr>
            ) : (
              activeRows.map((row, ri) => (
                <tr key={ri} className="pp1-cc-tbl__tr">
                  {row.map((cell, ci) => {
                    const isRightAligned = ci > 0 && (
                      activeColumns[ci].toLowerCase().includes("qty") ||
                      activeColumns[ci].toLowerCase().includes("value") ||
                      activeColumns[ci].toLowerCase().includes("hours") ||
                      activeColumns[ci].toLowerCase().includes("hrs") ||
                      activeColumns[ci].toLowerCase().includes("hour") ||
                      activeColumns[ci].toLowerCase().includes("rate") ||
                      activeColumns[ci].toLowerCase().includes("ratio") ||
                      activeColumns[ci].toLowerCase().includes("%") ||
                      activeColumns[ci].toLowerCase().includes("day") ||
                      activeColumns[ci].toLowerCase().includes("month") ||
                      activeColumns[ci].toLowerCase().includes("loss")
                    );
                    return (
                      <td
                        key={ci}
                        className={ci === 0 ? "pp1-cc-tbl__bold" : ""}
                        style={{
                          textAlign: isRightAligned ? "right" : "left",
                          fontWeight: ci === 0 ? 700 : 600
                        }}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OeeReportDashboardView({ filters, onFilterChange, activeTab, onActiveTabChange, onClose, targetConfig }) {
  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      month: "",
      year: "",
      team: "",
      machineType: "",
      machine: "",
    });
  };

  const chart1Data = React.useMemo(() => {
    const allMachines = [
      { name: "CNC1", value: 85, team: "Team A", type: "CNC" },
      { name: "CNC2", value: 70, team: "Team B", type: "CNC" },
      { name: "DRL1", value: 95, team: "Team C", type: "Conventional" },
      { name: "LATHE1", value: 78, team: "Team A", type: "Conventional" },
    ];

    let filtered = allMachines;
    if (filters?.team) filtered = filtered.filter(m => m.team === filters.team);
    if (filters?.machineType) filtered = filtered.filter(m => m.type === filters.machineType);
    if (filters?.machine) filtered = filtered.filter(m => m.name === filters.machine);

    let offset = 0;
    if (filters?.month) {
      const hash = filters.month.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      offset += (hash % 7) - 3;
    }
    if (filters?.year) {
      offset += filters.year === "2026" ? 1.0 : -1.0;
    }

    const labels = filtered.map(m => m.name);
    const data = filtered.map(m => Math.min(100, Math.max(0, Number((m.value + offset).toFixed(2)))));
    return { labels, data };
  }, [filters]);

  const chart2Data = React.useMemo(() => {
    const allMachines = [
      { name: "CNC1", value: 85, team: "Team A", type: "CNC" },
      { name: "CNC2", value: 70, team: "Team B", type: "CNC" },
      { name: "DRL1", value: 95, team: "Team C", type: "Conventional" },
      { name: "LATHE1", value: 78, team: "Team A", type: "Conventional" },
    ];

    let filtered = allMachines;
    if (filters?.team) filtered = filtered.filter(m => m.team === filters.team);
    if (filters?.machine) filtered = filtered.filter(m => m.name === filters.machine);

    let offset = 0;
    if (filters?.month) {
      const hash = filters.month.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      offset += (hash % 7) - 3;
    }
    if (filters?.year) {
      offset += filters.year === "2026" ? 1.0 : -1.0;
    }

    const groups = { CNC: [], Conventional: [] };
    filtered.forEach(m => {
      groups[m.type].push(m.value + offset);
    });

    const types = ["CNC", "Conventional"];
    const labels = [];
    const data = [];

    types.forEach(t => {
      if (filters?.machineType && filters.machineType !== t) return;
      const vals = groups[t];
      if (vals.length > 0) {
        const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
        labels.push(t);
        data.push(Number(avg.toFixed(2)));
      }
    });

    const isFiltered = filters?.team || filters?.machineType || filters?.machine || filters?.month || filters?.year;
    if (!isFiltered) {
      return {
        labels: ["CNC", "Conventional"],
        data: [77.83, 76.83]
      };
    }

    return { labels, data };
  }, [filters]);

  const setupChart1 = React.useCallback((canvas) => {
    return new Chart(canvas, {
      type: "pie",
      data: {
        labels: chart1Data.labels,
        datasets: [
          {
            data: chart1Data.data,
            backgroundColor: ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"],
            borderWidth: 1,
            borderColor: "#ffffff"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              font: { size: 10, family: "'Inter', sans-serif" },
              boxWidth: 12
            }
          }
        }
      }
    });
  }, [chart1Data]);

  const setupChart2 = React.useCallback((canvas) => {
    const oeeTarget = targetConfig?.oee ?? 80;
    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: chart2Data.labels,
        datasets: [
          {
            label: "Average OEE %",
            data: chart2Data.data,
            backgroundColor: ["#3b82f6", "#10b981"],
            borderRadius: 6,
            borderWidth: 0
          },
          {
            type: "line",
            label: "OEE Target",
            data: chart2Data.labels.map(() => oeeTarget),
            borderColor: "rgba(239, 68, 68, 0.85)",
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: { font: { size: 10, family: "'Inter', sans-serif" }, boxWidth: 10 }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, family: "'Inter', sans-serif" } }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: {
              font: { size: 10, family: "'Inter', sans-serif" },
              callback: (v) => `${v}%`
            }
          }
        }
      }
    });
  }, [chart2Data, targetConfig]);

  const activeSlide = activeTab === "oee_by_type" ? 1 : 0;

  const nextSlide = () => {
    onActiveTabChange(activeSlide === 0 ? "oee_by_type" : "machine_oee");
  };

  const prevSlide = () => {
    onActiveTabChange(activeSlide === 0 ? "oee_by_type" : "machine_oee");
  };

  const carouselControls = (
    <div className="pp1-dt-card" style={{ padding: "14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)", background: "#fff", marginTop: "10px" }}>
      <div className="pp1-dt-card__hd" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div className="pp1-dt-card__title" style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--pp1-text-3)" }}>
          {activeSlide === 0 ? "Machine OEE" : "Average OEE By Machine Type"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={prevSlide}
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              color: "var(--pp1-text-3)",
              transition: "all 0.15s ease"
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--pp1-text-3)", minWidth: "30px", textAlign: "center" }}>
            {activeSlide + 1} / 2
          </span>
          <button
            type="button"
            onClick={nextSlide}
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              color: "var(--pp1-text-3)",
              transition: "all 0.15s ease"
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="pp1-dt-chart-wrap" style={{ height: 220, position: "relative" }}>
        {activeSlide === 0 ? (
          <ChartJsCanvas setup={setupChart1} height={220} rebuildToken={`oee1-${JSON.stringify(chart1Data)}`} />
        ) : (
          <ChartJsCanvas setup={setupChart2} height={220} rebuildToken={`oee2-${JSON.stringify(chart2Data)}`} />
        )}
      </div>
    </div>
  );

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = ["2025", "2026"];
  const teams = ["Team A", "Team B", "Team C"];
  const machineTypes = ["CNC", "Conventional"];
  const machines = ["CNC1", "CNC2", "DRL1", "LATHE1"];

  return (
    <PremiumDashboardView
      title="OEE Report"
      icon={Target}
      color="#2d6de8"
      kpis={null}
      setupChart={null}
      chartControls={carouselControls}
      rangeHint="OEE Analysis Charts"
      onClose={onClose}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Month Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Month</label>
          <select
            className="pp1-filter-input"
            value={filters?.month || ""}
            onChange={e => handleInputChange("month", e.target.value)}
          >
            <option value="">All Months</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Year Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Year</label>
          <select
            className="pp1-filter-input"
            value={filters?.year || ""}
            onChange={e => handleInputChange("year", e.target.value)}
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Team Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Team</label>
          <select
            className="pp1-filter-input"
            value={filters?.team || ""}
            onChange={e => handleInputChange("team", e.target.value)}
          >
            <option value="">All Teams</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Machine Type Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Machine Type</label>
          <select
            className="pp1-filter-input"
            value={filters?.machineType || ""}
            onChange={e => handleInputChange("machineType", e.target.value)}
          >
            <option value="">All Types</option>
            {machineTypes.map(mt => <option key={mt} value={mt}>{mt}</option>)}
          </select>
        </div>

        {/* Machine Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Machine</label>
          <select
            className="pp1-filter-input"
            value={filters?.machine || ""}
            onChange={e => handleInputChange("machine", e.target.value)}
          >
            <option value="">All Machines</option>
            {machines.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          className="pp1-filter-btn pp1-filter-btn--reset"
          onClick={handleReset}
          style={{ flexShrink: 0, height: "28px" }}
        >
          Reset
        </button>
      </div>
    </PremiumDashboardView>
  );
}

function OeeReportBottomTable({ filters, activeTab, setActiveTab }) {
  const [localActiveTab, setLocalActiveTab] = React.useState("machine_oee");
  const tab = activeTab || localActiveTab;
  const setTab = setActiveTab || setLocalActiveTab;

  // Tab 1: Machine OEE
  const columns1 = ["Machine No", "Average OEE %"];
  const rows1 = React.useMemo(() => {
    const allMachines = [
      { name: "CNC1", value: 85, team: "Team A", type: "CNC" },
      { name: "CNC2", value: 70, team: "Team B", type: "CNC" },
      { name: "DRL1", value: 95, team: "Team C", type: "Conventional" },
      { name: "LATHE1", value: 78, team: "Team A", type: "Conventional" },
    ];

    let filtered = allMachines;
    if (filters?.team) filtered = filtered.filter(m => m.team === filters.team);
    if (filters?.machineType) filtered = filtered.filter(m => m.type === filters.machineType);
    if (filters?.machine) filtered = filtered.filter(m => m.name === filters.machine);

    let offset = 0;
    if (filters?.month) {
      const hash = filters.month.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      offset += (hash % 7) - 3;
    }
    if (filters?.year) {
      offset += filters.year === "2026" ? 1.0 : -1.0;
    }

    return filtered.map(m => [
      m.name,
      `${Math.min(100, Math.max(0, Number((m.value + offset).toFixed(2))))}%`
    ]);
  }, [filters]);

  // Tab 2: Average OEE By Machine Type
  const columns2 = ["Machine Type", "Average OEE %"];
  const rows2 = React.useMemo(() => {
    const allMachines = [
      { name: "CNC1", value: 85, team: "Team A", type: "CNC" },
      { name: "CNC2", value: 70, team: "Team B", type: "CNC" },
      { name: "DRL1", value: 95, team: "Team C", type: "Conventional" },
      { name: "LATHE1", value: 78, team: "Team A", type: "Conventional" },
    ];

    let filtered = allMachines;
    if (filters?.team) filtered = filtered.filter(m => m.team === filters.team);
    if (filters?.machine) filtered = filtered.filter(m => m.name === filters.machine);

    let offset = 0;
    if (filters?.month) {
      const hash = filters.month.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      offset += (hash % 7) - 3;
    }
    if (filters?.year) {
      offset += filters.year === "2026" ? 1.0 : -1.0;
    }

    const groups = { CNC: [], Conventional: [] };
    filtered.forEach(m => {
      groups[m.type].push(m.value + offset);
    });

    const types = ["CNC", "Conventional"];
    const rows = [];

    types.forEach(t => {
      if (filters?.machineType && filters.machineType !== t) return;
      const vals = groups[t];
      if (vals.length > 0) {
        const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
        rows.push([t, `${Math.min(100, Math.max(0, Number(avg.toFixed(2))))}%`]);
      }
    });

    const isFiltered = filters?.team || filters?.machineType || filters?.machine || filters?.month || filters?.year;
    if (!isFiltered) {
      return [
        ["CNC", "77.83%"],
        ["Conventional", "76.83%"]
      ];
    }

    return rows;
  }, [filters]);

  // Tab 3: Machine OEE Metrics
  const columns3 = [
    "Team", "Machine Type", "Machine No",
    "Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7", "Day 8", "Day 9", "Day 10",
    "Day 11", "Day 12", "Day 13", "Day 14", "Day 15", "Day 16", "Day 17", "Day 18", "Day 19", "Day 20",
    "Day 21", "Day 22", "Day 23", "Day 24", "Day 25", "Day 26", "Day 27", "Day 28", "Day 29", "Day 30"
  ];
  const allRows = [
    [
      "Team A", "CNC", "CNC1",
      "85%", "96%", "70%", "69%", "67%", "66%", "65%", "75%", "85%", "96%",
      "61%", "80%", "78%", "83%", "90%", "92%", "88%", "85%", "81%", "79%",
      "82%", "86%", "91%", "94%", "89%", "84%", "77%", "80%", "85%", "90%"
    ],
    [
      "Team B", "CNC", "CNC2",
      "70%", "84%", "94%", "87%", "80%", "73%", "66%", "59%", "52%", "45%",
      "97%", "75%", "70%", "68%", "72%", "76%", "81%", "85%", "89%", "92%",
      "90%", "86%", "82%", "79%", "75%", "73%", "78%", "82%", "87%", "91%"
    ],
    [
      "Team C", "Conventional", "DRL1",
      "95%", "89%", "72%", "62%", "53%", "43%", "68%", "93%", "48%", "68%",
      "51%", "55%", "60%", "65%", "70%", "75%", "80%", "85%", "88%", "82%",
      "76%", "70%", "64%", "58%", "55%", "62%", "69%", "77%", "84%", "90%"
    ],
    [
      "Team A", "Conventional", "LATHE1",
      "78%", "82%", "87%", "91%", "53%", "73%", "68%", "63%", "58%", "53%",
      "96%", "88%", "82%", "76%", "72%", "68%", "65%", "70%", "75%", "80%",
      "84%", "89%", "93%", "95%", "90%", "85%", "79%", "74%", "70%", "75%"
    ]
  ];

  const rows3 = React.useMemo(() => {
    let list = allRows;
    if (filters?.team) list = list.filter(r => r[0] === filters.team);
    if (filters?.machineType) list = list.filter(r => r[1] === filters.machineType);
    if (filters?.machine) list = list.filter(r => r[2] === filters.machine);

    let offset = 0;
    if (filters?.month) {
      const hash = filters.month.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      offset += (hash % 9) - 4; // -4% to +4%
    }
    if (filters?.year) {
      offset += filters.year === "2026" ? 2 : -2;
    }

    if (offset !== 0) {
      return list.map(row => {
        const newRow = [...row];
        for (let i = 3; i < newRow.length; i++) {
          const val = parseInt(newRow[i], 10);
          if (!isNaN(val)) {
            newRow[i] = `${Math.min(100, Math.max(0, val + offset))}%`;
          }
        }
        return newRow;
      });
    }
    return list;
  }, [filters, allRows]);

  const activeColumns = tab === "machine_oee" ? columns1 : tab === "oee_by_type" ? columns2 : columns3;
  const activeRows = tab === "machine_oee" ? rows1 : tab === "oee_by_type" ? rows2 : rows3;

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "18px", borderBottom: "1px solid rgba(0,0,0,0.08)", width: "100%", paddingBottom: "4px" }}>
          {[
            { id: "machine_oee", label: "Machine OEE" },
            { id: "oee_by_type", label: "Average OEE By Machine Type" },
            { id: "oee_metrics", label: "Machine OEE Metrics" }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              style={{
                background: "none",
                border: "none",
                borderBottom: tab === t.id ? "2.5px solid var(--pp1-blue)" : "none",
                color: tab === t.id ? "var(--pp1-blue)" : "var(--pp1-text-3)",
                fontWeight: 700,
                fontSize: "12px",
                paddingBottom: "6px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
          <thead>
            <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
              {activeColumns.map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#f2f6fe",
                    zIndex: 10,
                    textAlign: idx > 0 && (
                      col.toLowerCase().includes("qty") ||
                      col.toLowerCase().includes("value") ||
                      col.toLowerCase().includes("hours") ||
                      col.toLowerCase().includes("hour") ||
                      col.toLowerCase().includes("rate") ||
                      col.toLowerCase().includes("ratio") ||
                      col.toLowerCase().includes("%") ||
                      col.toLowerCase().includes("day") ||
                      col.toLowerCase().includes("month") ||
                      col.toLowerCase().includes("loss")
                    ) ? "right" : "left"
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeRows.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length} style={{ textAlign: "center", padding: "20px", color: "var(--pp1-text-4)" }}>
                  No data available.
                </td>
              </tr>
            ) : (
              activeRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    const isRightAligned = ci > 0 && (
                      activeColumns[ci].toLowerCase().includes("qty") ||
                      activeColumns[ci].toLowerCase().includes("value") ||
                      activeColumns[ci].toLowerCase().includes("hours") ||
                      activeColumns[ci].toLowerCase().includes("hour") ||
                      activeColumns[ci].toLowerCase().includes("rate") ||
                      activeColumns[ci].toLowerCase().includes("ratio") ||
                      activeColumns[ci].toLowerCase().includes("%") ||
                      activeColumns[ci].toLowerCase().includes("day") ||
                      activeColumns[ci].toLowerCase().includes("month") ||
                      activeColumns[ci].toLowerCase().includes("loss")
                    );
                    return (
                      <td
                        key={ci}
                        className={ci === 0 ? "pp1-cc-tbl__bold" : ""}
                        style={{
                          textAlign: isRightAligned ? "right" : "left",
                          fontWeight: ci === 0 ? 700 : 600
                        }}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OeeComparisonReportDashboardView({ filters, onFilterChange, activeTab, onActiveTabChange, onClose, targetConfig }) {
  const [dateOpen, setDateOpen] = React.useState(false);
  const dateRangeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target)) {
        setDateOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateStr;
  };

  const dateRangeDisplay = () => {
    if (filters?.fromDate && filters?.toDate) {
      return `${formatDateDisplay(filters.fromDate)} - ${formatDateDisplay(filters.toDate)}`;
    }
    if (filters?.fromDate) {
      return `${formatDateDisplay(filters.fromDate)} - ...`;
    }
    if (filters?.toDate) {
      return `... - ${formatDateDisplay(filters.toDate)}`;
    }
    return "Select Date Range...";
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      month: "",
      year: "",
      week: "",
      machineType: "",
      machine: "",
    });
  };

  const chart1Data = React.useMemo(() => {
    const months = ["Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25", "Sep-25", "Oct-25", "Nov-25", "Dec-25", "Jan-26", "Feb-26"];
    const baseData = {
      CNC1: [85, 96, 70, 69, 67, 66, 65, 75, 85, 96, 61],
      CNC2: [70, 84, 94, 87, 80, 73, 66, 59, 52, 45, 97],
      DRL1: [95, 89, 72, 62, 53, 43, 68, 93, 48, 68, 51],
      LATHE1: [78, 82, 87, 91, 53, 73, 68, 63, 58, 53, 96]
    };

    let offset = 0;
    if (filters?.month) {
      const hash = filters.month.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      offset += (hash % 7) - 3;
    }
    if (filters?.year) {
      offset += filters.year === "2026" ? 1 : -1;
    }
    if (filters?.week) {
      offset += filters.week.endsWith("2") || filters.week.endsWith("4") ? 2 : -2;
    }
    if (filters?.fromDate) offset += 1;
    if (filters?.toDate) offset -= 1;

    const machinesList = ["CNC1", "CNC2", "DRL1", "LATHE1"];
    const datasets = [];

    const colors = { CNC1: "#3b82f6", CNC2: "#ef4444", DRL1: "#10b981", LATHE1: "#f59e0b" };
    const types = { CNC1: "CNC", CNC2: "CNC", DRL1: "Conventional", LATHE1: "Conventional" };

    machinesList.forEach(m => {
      if (filters?.machineType && types[m] !== filters.machineType) return;
      if (filters?.machine && m !== filters.machine) return;

      const data = baseData[m].map(val => Math.min(100, Math.max(0, val + offset)));
      datasets.push({
        label: m,
        data,
        backgroundColor: colors[m],
        borderRadius: 4
      });
    });

    return { labels: months, datasets };
  }, [filters]);

  const chart2Data = React.useMemo(() => {
    let cnc1Val = 67;
    let cnc2Val = 80;
    let drl1Val = 53;
    let lathe1Val = 53;

    let offset = 0;
    if (filters?.month) {
      const hash = filters.month.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      offset += (hash % 7) - 3;
    }
    if (filters?.year) {
      offset += filters.year === "2026" ? 1.0 : -1.0;
    }
    if (filters?.week) {
      offset += filters.week.endsWith("2") || filters.week.endsWith("4") ? 2.0 : -2.0;
    }
    if (filters?.fromDate) offset += 1.0;
    if (filters?.toDate) offset -= 1.0;

    cnc1Val = Math.min(100, Math.max(0, cnc1Val + offset));
    cnc2Val = Math.min(100, Math.max(0, cnc2Val + offset));
    drl1Val = Math.min(100, Math.max(0, drl1Val + offset));
    lathe1Val = Math.min(100, Math.max(0, lathe1Val + offset));

    const machinesList = [
      { name: "CNC1", value: cnc1Val, type: "CNC", index: 0 },
      { name: "CNC2", value: cnc2Val, type: "CNC", index: 0 },
      { name: "DRL1", value: drl1Val, type: "Conventional", index: 1 },
      { name: "LATHE1", value: lathe1Val, type: "Conventional", index: 1 }
    ];

    const datasets = [];
    const colors = { CNC1: "#3b82f6", CNC2: "#ef4444", DRL1: "#10b981", LATHE1: "#f59e0b" };

    machinesList.forEach(m => {
      if (filters?.machineType && m.type !== filters.machineType) return;
      if (filters?.machine && m.name !== filters.machine) return;

      const dataArr = [null, null];
      dataArr[m.index] = m.value;

      datasets.push({
        label: m.name,
        data: dataArr,
        backgroundColor: colors[m.name],
        borderRadius: 4
      });
    });

    const activeLabels = [];
    if (!filters?.machineType || filters.machineType === "CNC") activeLabels.push("CNC");
    if (!filters?.machineType || filters.machineType === "Conventional") activeLabels.push("Conventional");

    if (filters?.machineType) {
      datasets.forEach(d => {
        d.data = d.data.filter(x => x !== null);
      });
    }

    return { labels: activeLabels, datasets };
  }, [filters]);

  const setupChart1 = React.useCallback((canvas) => {
    const minUtilization = targetConfig?.oee_comparison?.minUtilization ?? 75;
    const datasetsWithTarget = [
      ...(chart1Data.datasets || []),
      {
        type: "line",
        label: "Min Utilization Target",
        data: (chart1Data.labels || []).map(() => minUtilization),
        borderColor: "rgba(239, 68, 68, 0.85)",
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0
      }
    ];

    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: chart1Data.labels,
        datasets: datasetsWithTarget
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { font: { size: 10, family: "'Inter', sans-serif" }, boxWidth: 10 }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 } } },
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { font: { size: 9 }, callback: (v) => `${v}%` }
          }
        }
      }
    });
  }, [chart1Data, targetConfig]);

  const setupChart2 = React.useCallback((canvas) => {
    const minUtilization = targetConfig?.oee_comparison?.minUtilization ?? 75;
    const datasetsWithTarget = [
      ...(chart2Data.datasets || []),
      {
        type: "line",
        label: "Min Utilization Target",
        data: (chart2Data.labels || []).map(() => minUtilization),
        borderColor: "rgba(239, 68, 68, 0.85)",
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0
      }
    ];

    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: chart2Data.labels,
        datasets: datasetsWithTarget
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { font: { size: 10, family: "'Inter', sans-serif" }, boxWidth: 10 }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { font: { size: 9 }, callback: (v) => `${v}%` }
          }
        }
      }
    });
  }, [chart2Data, targetConfig]);

  const activeSlide = activeTab === "type_comparison" ? 1 : 0;

  const nextSlide = () => {
    onActiveTabChange(activeSlide === 0 ? "type_comparison" : "month_comparison");
  };

  const prevSlide = () => {
    onActiveTabChange(activeSlide === 0 ? "type_comparison" : "month_comparison");
  };

  const carouselControls = (
    <div className="pp1-dt-card" style={{ padding: "14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)", background: "#fff", marginTop: "10px" }}>
      <div className="pp1-dt-card__hd" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div className="pp1-dt-card__title" style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--pp1-text-3)" }}>
          {activeSlide === 0 ? "Month Wise Machine OEE Comparison" : "Average OEE By Machine Type (Aug-25)"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={prevSlide}
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              color: "var(--pp1-text-3)",
              transition: "all 0.15s ease"
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--pp1-text-3)", minWidth: "30px", textAlign: "center" }}>
            {activeSlide + 1} / 2
          </span>
          <button
            type="button"
            onClick={nextSlide}
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              color: "var(--pp1-text-3)",
              transition: "all 0.15s ease"
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="pp1-dt-chart-wrap" style={{ height: 220, position: "relative" }}>
        {activeSlide === 0 ? (
          <ChartJsCanvas setup={setupChart1} height={220} rebuildToken={`comp1-${JSON.stringify(filters)}`} />
        ) : (
          <ChartJsCanvas setup={setupChart2} height={220} rebuildToken={`comp2-${JSON.stringify(filters)}`} />
        )}
      </div>
    </div>
  );

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = ["2025", "2026"];
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
  const machineTypes = ["CNC", "Conventional"];
  const machines = ["CNC1", "CNC2", "DRL1", "LATHE1"];

  return (
    <PremiumDashboardView
      title="OEE Comparison Report"
      icon={TrendingUp}
      color="#0ea5e9"
      kpis={null}
      setupChart={null}
      chartControls={carouselControls}
      rangeHint="OEE Parameters Comparison"
      onClose={onClose}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" ref={dateRangeRef}>
          <label className="pp1-filter-label">Date Range</label>
          <div
            className="pp1-filter-input pp1-filter-input--date-range-trigger"
            onClick={() => setDateOpen(!dateOpen)}
          >
            <span>{dateRangeDisplay()}</span>
            <Calendar size={13} className="pp1-filter-icon" />
          </div>
          {dateOpen && (
            <div className="pp1-date-popup">
              <div className="pp1-date-popup-inputs">
                <div className="pp1-date-popup-field">
                  <label>From</label>
                  <input
                    type="date"
                    value={filters?.fromDate || ""}
                    onChange={e => handleInputChange("fromDate", e.target.value)}
                  />
                </div>
                <div className="pp1-date-popup-field">
                  <label>To</label>
                  <input
                    type="date"
                    value={filters?.toDate || ""}
                    onChange={e => handleInputChange("toDate", e.target.value)}
                  />
                </div>
              </div>
              <div className="pp1-date-popup-footer">
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange("fromDate", "");
                    handleInputChange("toDate", "");
                    setDateOpen(false);
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="pp1-date-popup-btn-apply"
                  onClick={() => setDateOpen(false)}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Month Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Month</label>
          <select
            className="pp1-filter-input"
            value={filters?.month || ""}
            onChange={e => handleInputChange("month", e.target.value)}
          >
            <option value="">All Months</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Year Filter */}
        {/* <div className="pp1-filter-group">
          <label className="pp1-filter-label">Year</label>
          <select
            className="pp1-filter-input"
            value={filters?.year || ""}
            onChange={e => handleInputChange("year", e.target.value)}
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div> */}

        {/* Week Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Week</label>
          <select
            className="pp1-filter-input"
            value={filters?.week || ""}
            onChange={e => handleInputChange("week", e.target.value)}
          >
            <option value="">All Weeks</option>
            {weeks.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        {/* Machine Type Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Machine Type</label>
          <select
            className="pp1-filter-input"
            value={filters?.machineType || ""}
            onChange={e => handleInputChange("machineType", e.target.value)}
          >
            <option value="">All Types</option>
            {machineTypes.map(mt => <option key={mt} value={mt}>{mt}</option>)}
          </select>
        </div>

        {/* Machine No Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Machine No</label>
          <select
            className="pp1-filter-input"
            value={filters?.machine || ""}
            onChange={e => handleInputChange("machine", e.target.value)}
          >
            <option value="">All Machines</option>
            {machines.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          className="pp1-filter-btn pp1-filter-btn--reset"
          onClick={handleReset}
          style={{ flexShrink: 0, height: "28px" }}
        >
          Reset
        </button>
      </div>
    </PremiumDashboardView>
  );
}

function OeeComparisonReportBottomTable({ filters, activeTab, setActiveTab }) {
  const [localActiveTab, setLocalActiveTab] = React.useState("month_comparison");
  const tab = activeTab || localActiveTab;
  const setTab = setActiveTab || setLocalActiveTab;

  const baseMachines = [
    { type: "CNC", name: "CNC1", baseVal: 67, monthly: [85, 96, 70, 69, 67, 66, 65, 75, 85, 96, 61] },
    { type: "CNC", name: "CNC2", baseVal: 80, monthly: [70, 84, 94, 87, 80, 73, 66, 59, 52, 45, 97] },
    { type: "Conventional", name: "DRL1", baseVal: 53, monthly: [95, 89, 72, 62, 53, 43, 68, 93, 48, 68, 51] },
    { type: "Conventional", name: "LATHE1", baseVal: 53, monthly: [78, 82, 87, 91, 53, 73, 68, 63, 58, 53, 96] }
  ];

  const processedData = React.useMemo(() => {
    let offset = 0;
    if (filters?.month) {
      const hash = filters.month.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      offset += (hash % 7) - 3;
    }
    if (filters?.year) {
      offset += filters.year === "2026" ? 1 : -1;
    }
    if (filters?.week) {
      offset += filters.week.endsWith("2") || filters.week.endsWith("4") ? 2 : -2;
    }
    if (filters?.fromDate) offset += 1;
    if (filters?.toDate) offset -= 1;

    let filtered = baseMachines;
    if (filters?.machineType) filtered = filtered.filter(m => m.type === filters.machineType);
    if (filters?.machine) filtered = filtered.filter(m => m.name === filters.machine);

    return filtered.map(m => ({
      ...m,
      val: Math.min(100, Math.max(0, m.baseVal + offset)),
      monthlyVals: m.monthly.map(v => Math.min(100, Math.max(0, v + offset)))
    }));
  }, [filters]);

  // Tab 1: Month Wise Machine OEE Comparison
  const columns1 = [
    "Machine No",
    "Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25", "Sep-25", "Oct-25", "Nov-25", "Dec-25", "Jan-26", "Feb-26"
  ];
  const rows1 = React.useMemo(() => {
    return processedData.map(m => [
      m.name,
      ...m.monthlyVals.map(v => `${v}%`)
    ]);
  }, [processedData]);

  // Tab 2: Machine Type Wise OEE Comparison (Aug-25 values)
  const columns2 = ["Machine Type", "Machine No", "OEE %"];
  const rows2 = React.useMemo(() => {
    return processedData.map(m => [
      m.type,
      m.name,
      `${m.val}%`
    ]);
  }, [processedData]);

  // Tab 3: Machine OEE Metrics
  const columns3 = [
    "Machine Type", "Machine No",
    "Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25", "Sep-25", "Oct-25", "Nov-25", "Dec-25", "Jan-26", "Feb-26"
  ];
  const rows3 = React.useMemo(() => {
    return processedData.map(m => [
      m.type,
      m.name,
      ...m.monthlyVals.map(v => `${v}%`)
    ]);
  }, [processedData]);

  const activeColumns = tab === "month_comparison" ? columns1 : tab === "type_comparison" ? columns2 : columns3;
  const activeRows = tab === "month_comparison" ? rows1 : tab === "type_comparison" ? rows2 : rows3;

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "18px", borderBottom: "1px solid rgba(0,0,0,0.08)", width: "100%", paddingBottom: "4px" }}>
          {[
            { id: "month_comparison", label: "Month Wise Machine OEE Comparison" },
            { id: "type_comparison", label: "Machine Type Wise OEE Comparison" },
            { id: "metrics", label: "Machine OEE Metrics" }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              style={{
                background: "none",
                border: "none",
                borderBottom: tab === t.id ? "2.5px solid var(--pp1-blue)" : "none",
                color: tab === t.id ? "var(--pp1-blue)" : "var(--pp1-text-3)",
                fontWeight: 700,
                fontSize: "12px",
                paddingBottom: "6px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
          <thead>
            <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
              {activeColumns.map((col, idx) => {
                const isRightAligned = idx > (tab === "type_comparison" ? 1 : 0) && (
                  col.toLowerCase().includes("qty") ||
                  col.toLowerCase().includes("value") ||
                  col.toLowerCase().includes("hours") ||
                  col.toLowerCase().includes("hour") ||
                  col.toLowerCase().includes("rate") ||
                  col.toLowerCase().includes("ratio") ||
                  col.toLowerCase().includes("%") ||
                  col.toLowerCase().includes("day") ||
                  col.toLowerCase().includes("month") ||
                  col.toLowerCase().includes("loss") ||
                  col.includes("-2") ||
                  col.toLowerCase().includes("oee")
                );
                return (
                  <th
                    key={idx}
                    style={{
                      position: "sticky",
                      top: 0,
                      backgroundColor: "#f2f6fe",
                      zIndex: 10,
                      textAlign: isRightAligned ? "right" : "left"
                    }}
                  >
                    {col}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {activeRows.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length} style={{ textAlign: "center", padding: "20px", color: "var(--pp1-text-4)" }}>
                  No data available.
                </td>
              </tr>
            ) : (
              activeRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    const isRightAligned = ci > (tab === "type_comparison" ? 1 : 0) && (
                      activeColumns[ci].toLowerCase().includes("qty") ||
                      activeColumns[ci].toLowerCase().includes("value") ||
                      activeColumns[ci].toLowerCase().includes("hours") ||
                      activeColumns[ci].toLowerCase().includes("hour") ||
                      activeColumns[ci].toLowerCase().includes("rate") ||
                      activeColumns[ci].toLowerCase().includes("ratio") ||
                      activeColumns[ci].toLowerCase().includes("%") ||
                      activeColumns[ci].toLowerCase().includes("day") ||
                      activeColumns[ci].toLowerCase().includes("month") ||
                      activeColumns[ci].toLowerCase().includes("loss") ||
                      activeColumns[ci].includes("-2") ||
                      activeColumns[ci].toLowerCase().includes("oee")
                    );
                    return (
                      <td
                        key={ci}
                        className={ci === 0 ? "pp1-cc-tbl__bold" : ""}
                        style={{
                          textAlign: isRightAligned ? "right" : "left",
                          fontWeight: ci === (tab === "type_comparison" ? 1 : 0) ? 700 : 600
                        }}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EfficiencyEffReportDashboardView({ filters, onFilterChange, activeTab, onActiveTabChange, onClose }) {
  const [dateOpen, setDateOpen] = React.useState(false);
  const dateRangeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target)) {
        setDateOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateStr;
  };

  const dateRangeDisplay = () => {
    if (filters?.fromDate && filters?.toDate) {
      return `${formatDateDisplay(filters.fromDate)} - ${formatDateDisplay(filters.toDate)}`;
    }
    if (filters?.fromDate) {
      return `${formatDateDisplay(filters.fromDate)} - ...`;
    }
    if (filters?.toDate) {
      return `... - ${formatDateDisplay(filters.toDate)}`;
    }
    return "Select Date Range...";
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      month: "",
      year: "",
      week: "",
      team: "",
      machineType: "",
      machine: "",
      operatorName: "",
    });
  };

  const chart1Data = React.useMemo(() => {
    const operatorsList = ["Mani", "Kavi", "Rajan", "Kumar"];
    const baseData = {
      Mani: [85, 96, 70, 69, 67, 66, 65, 75, 85],
      Kavi: [70, 84, 94, 87, 80, 73, 66, 59, 52],
      Rajan: [95, 89, 72, 62, 53, 43, 68, 93, 48],
      Kumar: [78, 82, 87, 91, 53, 73, 68, 63, 58]
    };

    let offset = 0;
    if (filters?.month) {
      const hash = filters.month.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      offset += (hash % 5) - 2;
    }
    if (filters?.year) {
      offset += filters.year === "2026" ? 2 : -2;
    }
    if (filters?.week) {
      offset += filters.week.endsWith("2") || filters.week.endsWith("4") ? 1 : -1;
    }
    if (filters?.team) {
      offset += filters.team.endsWith("A") || filters.team.endsWith("C") ? 1 : -1;
    }
    if (filters?.machineType) {
      offset += filters.machineType === "CNC" ? 1 : -1;
    }
    if (filters?.fromDate) offset += 1;
    if (filters?.toDate) offset -= 1;

    const activeOperators = filters?.operatorName
      ? operatorsList.filter(o => o === filters.operatorName)
      : operatorsList;

    const datasets = [];
    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];

    for (let dayIdx = 0; dayIdx < 9; dayIdx++) {
      const data = activeOperators.map(op => {
        const val = baseData[op][dayIdx];
        return Math.min(100, Math.max(0, val + offset));
      });
      datasets.push({
        label: `Day ${dayIdx + 1}`,
        data,
        backgroundColor: colors[dayIdx],
        borderRadius: 3
      });
    }

    return { labels: activeOperators, datasets };
  }, [filters]);

  const setupChart1 = React.useCallback((canvas) => {
    return new Chart(canvas, {
      type: "bar",
      data: chart1Data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { font: { size: 8, family: "'Inter', sans-serif" }, boxWidth: 8 }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 } } },
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { font: { size: 9 }, callback: (v) => `${v}%` }
          }
        }
      }
    });
  }, [chart1Data]);

  const chart2Data = React.useMemo(() => {
    let cncVal = 77.83;
    let convVal = 76.83;

    let offset = 0;
    if (filters?.month) {
      const hash = filters.month.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      offset += (hash % 5) - 2;
    }
    if (filters?.year) {
      offset += filters.year === "2026" ? 1.5 : -1.5;
    }
    if (filters?.week) {
      offset += filters.week.endsWith("2") || filters.week.endsWith("4") ? 1.0 : -1.0;
    }
    if (filters?.team) {
      offset += filters.team.endsWith("A") || filters.team.endsWith("C") ? 0.8 : -0.8;
    }
    if (filters?.fromDate) offset += 0.5;
    if (filters?.toDate) offset -= 0.5;

    cncVal = Math.min(100, Math.max(0, cncVal + offset));
    convVal = Math.min(100, Math.max(0, convVal + offset));

    const labels = [];
    const data = [];

    if (!filters?.machineType || filters.machineType === "CNC") {
      labels.push("CNC");
      data.push(cncVal);
    }
    if (!filters?.machineType || filters.machineType === "Conventional") {
      labels.push("Conventional");
      data.push(convVal);
    }

    return {
      labels,
      datasets: [{
        label: "Average Efficiency",
        data,
        backgroundColor: ["#10b981", "#3b82f6"],
        borderRadius: 4,
        barThickness: 40
      }]
    };
  }, [filters]);

  const setupChart2 = React.useCallback((canvas) => {
    return new Chart(canvas, {
      type: "bar",
      data: chart2Data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { font: { size: 9 }, callback: (v) => `${v}%` }
          }
        }
      }
    });
  }, [chart2Data]);

  const chart3Data = React.useMemo(() => {
    let teamA = 89;
    let teamB = 84;
    let teamC = 89;

    let offset = 0;
    if (filters?.month) {
      const hash = filters.month.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      offset += (hash % 5) - 2;
    }
    if (filters?.year) {
      offset += filters.year === "2026" ? 1.5 : -1.5;
    }
    if (filters?.week) {
      offset += filters.week.endsWith("2") || filters.week.endsWith("4") ? 1.0 : -1.0;
    }
    if (filters?.machineType) {
      offset += filters.machineType === "CNC" ? 1.0 : -1.0;
    }
    if (filters?.fromDate) offset += 0.5;
    if (filters?.toDate) offset -= 0.5;

    teamA = Math.min(100, Math.max(0, teamA + offset));
    teamB = Math.min(100, Math.max(0, teamB + offset));
    teamC = Math.min(100, Math.max(0, teamC + offset));

    const labels = [];
    const data = [];

    if (!filters?.team || filters.team === "Team A") {
      labels.push("Team A");
      data.push(teamA);
    }
    if (!filters?.team || filters.team === "Team B") {
      labels.push("Team B");
      data.push(teamB);
    }
    if (!filters?.team || filters.team === "Team C") {
      labels.push("Team C");
      data.push(teamC);
    }

    return {
      labels,
      datasets: [{
        label: "Average Efficiency",
        data,
        backgroundColor: ["#8b5cf6", "#f59e0b", "#ec4899"],
        borderRadius: 4,
        barThickness: 40
      }]
    };
  }, [filters]);

  const setupChart3 = React.useCallback((canvas) => {
    return new Chart(canvas, {
      type: "bar",
      data: chart3Data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { font: { size: 9 }, callback: (v) => `${v}%` }
          }
        }
      }
    });
  }, [chart3Data]);

  const activeSlide = activeTab === "machine_type_efficiency" ? 1 : activeTab === "team_efficiency" ? 2 : 0;

  const nextSlide = () => {
    if (activeSlide === 0) onActiveTabChange("machine_type_efficiency");
    else if (activeSlide === 1) onActiveTabChange("team_efficiency");
    else onActiveTabChange("operator_comparison");
  };

  const prevSlide = () => {
    if (activeSlide === 0) onActiveTabChange("team_efficiency");
    else if (activeSlide === 1) onActiveTabChange("operator_comparison");
    else onActiveTabChange("machine_type_efficiency");
  };

  const carouselControls = (
    <div className="pp1-dt-card" style={{ padding: "14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)", background: "#fff", marginTop: "10px" }}>
      <div className="pp1-dt-card__hd" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div className="pp1-dt-card__title" style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--pp1-text-3)" }}>
          {activeSlide === 0 ? "Operator Efficiency Comparison" : activeSlide === 1 ? "Average Efficiency by Machine Type" : "Average Efficiency by Team"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={prevSlide}
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              color: "var(--pp1-text-3)",
              transition: "all 0.15s ease"
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--pp1-text-3)", minWidth: "30px", textAlign: "center" }}>
            {activeSlide + 1} / 3
          </span>
          <button
            type="button"
            onClick={nextSlide}
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              color: "var(--pp1-text-3)",
              transition: "all 0.15s ease"
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="pp1-dt-chart-wrap" style={{ height: 220, position: "relative" }}>
        {activeSlide === 0 ? (
          <ChartJsCanvas setup={setupChart1} height={220} rebuildToken={`eff1-${JSON.stringify(filters)}`} />
        ) : activeSlide === 1 ? (
          <ChartJsCanvas setup={setupChart2} height={220} rebuildToken={`eff2-${JSON.stringify(filters)}`} />
        ) : (
          <ChartJsCanvas setup={setupChart3} height={220} rebuildToken={`eff3-${JSON.stringify(filters)}`} />
        )}
      </div>
    </div>
  );

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = ["2025", "2026"];
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
  const teams = ["Team A", "Team B", "Team C", "Team D"];
  const machineTypes = ["CNC", "Conventional"];
  const machines = ["CNC1", "CNC2", "DRL1", "LATHE1"];
  const operators = ["Mani", "Kavi", "Rajan", "Kumar"];

  return (
    <PremiumDashboardView
      title="Efficiency (EFF) Report"
      icon={UserCheck}
      color="#10b981"
      kpis={null}
      setupChart={null}
      chartControls={carouselControls}
      rangeHint="Efficiency Performance Indicators"
      onClose={onClose}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" ref={dateRangeRef}>
          <label className="pp1-filter-label">Date Range</label>
          <div
            className="pp1-filter-input pp1-filter-input--date-range-trigger"
            onClick={() => setDateOpen(!dateOpen)}
          >
            <span>{dateRangeDisplay()}</span>
            <Calendar size={13} className="pp1-filter-icon" />
          </div>
          {dateOpen && (
            <div className="pp1-date-popup">
              <div className="pp1-date-popup-inputs">
                <div className="pp1-date-popup-field">
                  <label>From</label>
                  <input
                    type="date"
                    value={filters?.fromDate || ""}
                    onChange={e => handleInputChange("fromDate", e.target.value)}
                  />
                </div>
                <div className="pp1-date-popup-field">
                  <label>To</label>
                  <input
                    type="date"
                    value={filters?.toDate || ""}
                    onChange={e => handleInputChange("toDate", e.target.value)}
                  />
                </div>
              </div>
              <div className="pp1-date-popup-footer">
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange("fromDate", "");
                    handleInputChange("toDate", "");
                    setDateOpen(false);
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="pp1-date-popup-btn-apply"
                  onClick={() => setDateOpen(false)}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Month Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Month</label>
          <select
            className="pp1-filter-input"
            value={filters?.month || ""}
            onChange={e => handleInputChange("month", e.target.value)}
          >
            <option value="">All Months</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Year Filter */}
        {/* <div className="pp1-filter-group">
          <label className="pp1-filter-label">Year</label>
          <select
            className="pp1-filter-input"
            value={filters?.year || ""}
            onChange={e => handleInputChange("year", e.target.value)}
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div> */}

        {/* Week Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Week</label>
          <select
            className="pp1-filter-input"
            value={filters?.week || ""}
            onChange={e => handleInputChange("week", e.target.value)}
          >
            <option value="">All Weeks</option>
            {weeks.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        {/* Team Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Team</label>
          <select
            className="pp1-filter-input"
            value={filters?.team || ""}
            onChange={e => handleInputChange("team", e.target.value)}
          >
            <option value="">All Teams</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Machine Type Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Machine Type</label>
          <select
            className="pp1-filter-input"
            value={filters?.machineType || ""}
            onChange={e => handleInputChange("machineType", e.target.value)}
          >
            <option value="">All Types</option>
            {machineTypes.map(mt => <option key={mt} value={mt}>{mt}</option>)}
          </select>
        </div>

        {/* Machine No Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Machine No</label>
          <select
            className="pp1-filter-input"
            value={filters?.machine || ""}
            onChange={e => handleInputChange("machine", e.target.value)}
          >
            <option value="">All Machines</option>
            {machines.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Operator Name Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Operator Name</label>
          <select
            className="pp1-filter-input"
            value={filters?.operatorName || ""}
            onChange={e => handleInputChange("operatorName", e.target.value)}
          >
            <option value="">All Operators</option>
            {operators.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          className="pp1-filter-btn pp1-filter-btn--reset"
          onClick={handleReset}
          style={{ alignSelf: "flex-end", height: "28px" }}
        >
          Reset
        </button>
      </div>
    </PremiumDashboardView>
  );
}

function EfficiencyEffReportBottomTable({ filters, activeTab, setActiveTab }) {
  const [localActiveTab, setLocalActiveTab] = React.useState("operator_comparison");
  const tab = activeTab || localActiveTab;
  const setTab = setActiveTab || setLocalActiveTab;

  // Tab 1: Operator Efficiency Comparison
  const columns1 = ["Operator", "Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7", "Day 8", "Day 9"];
  const baseTab1Rows = [
    ["Mani", "85%", "96%", "70%", "69%", "67%", "66%", "65%", "75%", "85%"],
    ["Kavi", "70%", "84%", "94%", "87%", "80%", "73%", "66%", "59%", "52%"],
    ["Rajan", "95%", "89%", "72%", "62%", "53%", "43%", "68%", "93%", "48%"],
    ["Kumar", "78%", "82%", "87%", "91%", "53%", "73%", "68%", "63%", "58%"]
  ];

  // Tab 2: Average Efficiency by Machine Type
  const columns2 = ["Machine Type", "Average Efficiency"];
  const baseTab2Rows = [
    ["CNC", "77.83%"],
    ["Conventional", "76.83%"]
  ];

  // Tab 3: Average Efficiency by Team
  const columns3 = ["Team", "Average Efficiency"];
  const baseTab3Rows = [
    ["Team A", "89%"],
    ["Team B", "84%"],
    ["Team C", "89%"]
  ];

  // Tab 4: Operator Efficiency Ranking
  const columns4 = [
    "Team", "Machine Type", "Machine No", "Operator Name",
    "Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7", "Day 8", "Day 9", "Day 10",
    "Day 11", "Day 12", "Day 13", "Day 14", "Day 15", "Day 16", "Day 17", "Day 18", "Day 19", "Day 20",
    "Day 21", "Day 22", "Day 23", "Day 24", "Day 25", "Day 26", "Day 27", "Day 28", "Day 29", "Day 30"
  ];
  const baseTab4Rows = [
    [
      "Team A", "CNC", "CNC1", "Mani",
      "96.5%", "95.0%", "97.2%", "94.8%", "96.0%", "95.5%", "94.2%", "96.8%", "97.5%", "96.1%",
      "95.9%", "96.3%", "97.0%", "96.5%", "95.2%", "96.0%", "97.4%", "96.8%", "95.5%", "96.2%",
      "97.1%", "96.6%", "95.8%", "96.4%", "97.2%", "96.9%", "95.7%", "96.1%", "97.3%", "96.5%"
    ],
    [
      "Team B", "CNC", "CNC2", "Kavi",
      "91.2%", "90.5%", "92.0%", "91.8%", "90.0%", "91.5%", "92.2%", "90.8%", "91.4%", "90.9%",
      "91.1%", "92.3%", "91.0%", "90.5%", "91.2%", "92.0%", "90.4%", "91.8%", "92.5%", "91.2%",
      "90.1%", "91.6%", "92.8%", "91.4%", "90.2%", "91.9%", "92.7%", "91.1%", "90.6%", "91.2%"
    ],
    [
      "Team C", "Conventional", "DRL1", "Rajan",
      "85.4%", "84.8%", "86.2%", "85.0%", "84.5%", "85.9%", "86.1%", "84.9%", "85.3%", "84.2%",
      "85.1%", "86.3%", "85.0%", "84.7%", "85.2%", "86.0%", "84.4%", "85.8%", "86.5%", "85.2%",
      "84.1%", "85.6%", "86.8%", "85.4%", "84.2%", "85.9%", "86.7%", "85.1%", "84.6%", "85.4%"
    ],
    [
      "Team A", "Conventional", "LATHE1", "Kumar",
      "80.0%", "79.5%", "81.0%", "80.8%", "79.0%", "80.5%", "81.2%", "79.8%", "80.4%", "79.9%",
      "80.1%", "81.3%", "80.0%", "79.5%", "80.2%", "81.0%", "79.4%", "80.8%", "81.5%", "80.2%",
      "79.1%", "80.6%", "81.8%", "80.4%", "79.2%", "80.9%", "81.7%", "80.1%", "79.6%", "80.0%"
    ]
  ];

  // Compute offset variation based on active filters
  const offset = React.useMemo(() => {
    let off = 0;
    if (filters?.month) {
      const hash = filters.month.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      off += (hash % 5) - 2;
    }
    if (filters?.year) {
      off += filters.year === "2026" ? 1.5 : -1.5;
    }
    if (filters?.week) {
      off += filters.week.endsWith("2") || filters.week.endsWith("4") ? 1.0 : -1.0;
    }
    if (filters?.fromDate) off += 0.5;
    if (filters?.toDate) off -= 0.5;
    return off;
  }, [filters]);

  const rows1 = React.useMemo(() => {
    let list = baseTab1Rows;
    if (filters?.operatorName) {
      list = list.filter(r => r[0] === filters.operatorName);
    }
    if (offset !== 0) {
      return list.map(r => {
        const name = r[0];
        const days = r.slice(1).map(val => {
          const num = parseFloat(val);
          const newVal = Math.min(100, Math.max(0, num + offset));
          return `${newVal.toFixed(1)}%`;
        });
        return [name, ...days];
      });
    }
    return list;
  }, [filters, offset]);

  const rows2 = React.useMemo(() => {
    let list = baseTab2Rows;
    if (filters?.machineType) {
      list = list.filter(r => r[0] === filters.machineType);
    }
    if (offset !== 0) {
      return list.map(r => {
        const type = r[0];
        const num = parseFloat(r[1]);
        const newVal = Math.min(100, Math.max(0, num + offset));
        return [type, `${newVal.toFixed(2)}%`];
      });
    }
    return list;
  }, [filters, offset]);

  const rows3 = React.useMemo(() => {
    let list = baseTab3Rows;
    if (filters?.team) {
      list = list.filter(r => r[0] === filters.team);
    }
    if (offset !== 0) {
      return list.map(r => {
        const team = r[0];
        const num = parseFloat(r[1]);
        const newVal = Math.min(100, Math.max(0, num + offset));
        return [team, `${newVal.toFixed(1)}%`];
      });
    }
    return list;
  }, [filters, offset]);

  const rows4 = React.useMemo(() => {
    let list = baseTab4Rows;
    if (filters?.team) {
      list = list.filter(r => r[0] === filters.team);
    }
    if (filters?.machineType) {
      list = list.filter(r => r[1] === filters.machineType);
    }
    if (filters?.machine) {
      list = list.filter(r => r[2] === filters.machine);
    }
    if (filters?.operatorName) {
      list = list.filter(r => r[3] === filters.operatorName);
    }

    if (offset !== 0) {
      return list.map(row => {
        const metadata = row.slice(0, 4);
        const days = row.slice(4).map(val => {
          const num = parseFloat(val);
          const newVal = Math.min(100, Math.max(0, num + offset));
          return `${newVal.toFixed(1)}%`;
        });
        return [...metadata, ...days];
      });
    }
    return list;
  }, [filters, offset]);

  const activeColumns = tab === "operator_comparison"
    ? columns1
    : tab === "machine_type_efficiency"
      ? columns2
      : tab === "team_efficiency"
        ? columns3
        : columns4;

  const activeRows = tab === "operator_comparison"
    ? rows1
    : tab === "machine_type_efficiency"
      ? rows2
      : tab === "team_efficiency"
        ? rows3
        : rows4;

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "18px", borderBottom: "1px solid rgba(0,0,0,0.08)", width: "100%", paddingBottom: "4px" }}>
          {[
            { id: "operator_comparison", label: "Operator Efficiency Comparison" },
            { id: "machine_type_efficiency", label: "Average Efficiency by Machine Type" },
            { id: "team_efficiency", label: "Average Efficiency by Team" },
            { id: "operator_ranking", label: "Operator Efficiency Ranking" }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              style={{
                background: "none",
                border: "none",
                borderBottom: tab === t.id ? "2.5px solid var(--pp1-blue)" : "none",
                color: tab === t.id ? "var(--pp1-blue)" : "var(--pp1-text-3)",
                fontWeight: 700,
                fontSize: "12px",
                paddingBottom: "6px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
          <thead>
            <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
              {activeColumns.map((col, idx) => {
                const isRightAligned = idx > (tab === "operator_comparison" ? 0 : tab === "machine_type_efficiency" ? 0 : tab === "team_efficiency" ? 0 : 3) && (
                  col.toLowerCase().includes("qty") ||
                  col.toLowerCase().includes("value") ||
                  col.toLowerCase().includes("hours") ||
                  col.toLowerCase().includes("hour") ||
                  col.toLowerCase().includes("rate") ||
                  col.toLowerCase().includes("ratio") ||
                  col.toLowerCase().includes("%") ||
                  col.toLowerCase().includes("day") ||
                  col.toLowerCase().includes("month") ||
                  col.toLowerCase().includes("loss") ||
                  col.toLowerCase().includes("efficiency")
                );
                return (
                  <th
                    key={idx}
                    style={{
                      position: "sticky",
                      top: 0,
                      backgroundColor: "#f2f6fe",
                      zIndex: 10,
                      textAlign: isRightAligned ? "right" : "left"
                    }}
                  >
                    {col}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {activeRows.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length} className="pp1-cc-tbl__empty">
                  No data matches active filters.
                </td>
              </tr>
            ) : (
              activeRows.map((row, ri) => (
                <tr key={ri} className="pp1-cc-tbl__tr">
                  {row.map((cell, ci) => {
                    const isRightAligned = ci > (tab === "operator_comparison" ? 0 : tab === "machine_type_efficiency" ? 0 : tab === "team_efficiency" ? 0 : 3) && (
                      activeColumns[ci].toLowerCase().includes("qty") ||
                      activeColumns[ci].toLowerCase().includes("value") ||
                      activeColumns[ci].toLowerCase().includes("hours") ||
                      activeColumns[ci].toLowerCase().includes("hour") ||
                      activeColumns[ci].toLowerCase().includes("rate") ||
                      activeColumns[ci].toLowerCase().includes("ratio") ||
                      activeColumns[ci].toLowerCase().includes("%") ||
                      activeColumns[ci].toLowerCase().includes("day") ||
                      activeColumns[ci].toLowerCase().includes("month") ||
                      activeColumns[ci].toLowerCase().includes("loss") ||
                      activeColumns[ci].toLowerCase().includes("efficiency")
                    );
                    return (
                      <td
                        key={ci}
                        className={ci === 0 ? "pp1-cc-tbl__bold" : ""}
                        style={{
                          textAlign: isRightAligned ? "right" : "left",
                          fontWeight: ci === 0 ? 700 : 600
                        }}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RejectionReportDashboardView({ filters, onFilterChange, activeTab, onActiveTabChange, onClose, targetConfig }) {
  const [dateOpen, setDateOpen] = React.useState(false);
  const dateRangeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target)) {
        setDateOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateStr;
  };

  const dateRangeDisplay = () => {
    if (filters?.fromDate && filters?.toDate) {
      return `${formatDateDisplay(filters.fromDate)} - ${formatDateDisplay(filters.toDate)}`;
    }
    if (filters?.fromDate) {
      return `${formatDateDisplay(filters.fromDate)} - ...`;
    }
    if (filters?.toDate) {
      return `... - ${formatDateDisplay(filters.toDate)}`;
    }
    return "Select Date Range...";
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      month: "",
      week: "",
      machine: "",
      operatorName: "",
    });
  };

  const operatorToMachine = {
    Kumar: "CNC1",
    Siva: "VMC1",
    Ravi: "HMC1",
    Sakthi: "CNC1",
    Rangaraj: "CNC2"
  };

  const chart1Data = React.useMemo(() => {
    const rawData = [
      { machine: "CNC1", "Apr-25": 27, "May-25": 31, "Jun-25": 14, "Jul-25": 21, "Aug-25": 13 },
      { machine: "CNC2", "Apr-25": 9, "May-25": 14, "Jun-25": 5, "Jul-25": 14, "Aug-25": 2 },
      { machine: "HMC1", "Apr-25": 14, "May-25": 8, "Jun-25": 9, "Jul-25": 12, "Aug-25": 5 },
      { machine: "VMC1", "Apr-25": 30, "May-25": 24, "Jun-25": 14, "Jul-25": 13, "Aug-25": 10 }
    ];

    let filtered = rawData;
    if (filters?.machine) {
      filtered = filtered.filter(item => item.machine === filters.machine);
    }
    if (filters?.operatorName) {
      const machineForOperator = operatorToMachine[filters.operatorName];
      if (machineForOperator) {
        filtered = filtered.filter(item => item.machine === machineForOperator);
      }
    }

    let offset = 0;
    if (filters?.week) {
      offset += filters.week.endsWith("2") || filters.week.endsWith("4") ? 3 : -3;
    }
    if (filters?.fromDate) offset += 2;
    if (filters?.toDate) offset -= 2;

    const labels = filtered.map(item => item.machine);
    const months = ["Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25"];

    const datasets = months.map((m, idx) => {
      const colorPalette = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
      const data = filtered.map(item => Math.max(0, Math.min(100, item[m] + offset)));
      return {
        label: m,
        data,
        backgroundColor: colorPalette[idx],
        borderRadius: 4
      };
    });

    const filteredDatasets = filters?.month
      ? datasets.filter(ds => ds.label === filters.month)
      : datasets;

    return { labels, datasets: filteredDatasets };
  }, [filters]);

  const chart2Data = React.useMemo(() => {
    const rawData = [
      { operator: "Kumar", machine: "CNC1", "Apr-25": 25, "May-25": 13, "Jun-25": 8, "Jul-25": 11, "Aug-25": 6 },
      { operator: "Siva", machine: "VMC1", "Apr-25": 30, "May-25": 24, "Jun-25": 14, "Jul-25": 13, "Aug-25": 10 },
      { operator: "Ravi", machine: "HMC1", "Apr-25": 14, "May-25": 8, "Jun-25": 9, "Jul-25": 12, "Aug-25": 5 },
      { operator: "Sakthi", machine: "CNC1", "Apr-25": 28, "May-25": 18, "Jun-25": 6, "Jul-25": 10, "Aug-25": 7 },
      { operator: "Rangaraj", machine: "CNC2", "Apr-25": 9, "May-25": 14, "Jun-25": 5, "Jul-25": 14, "Aug-25": 2 }
    ];

    let filtered = rawData;
    if (filters?.machine) {
      filtered = filtered.filter(item => item.machine === filters.machine);
    }
    if (filters?.operatorName) {
      filtered = filtered.filter(item => item.operator === filters.operatorName);
    }

    let offset = 0;
    if (filters?.week) {
      offset += filters.week.endsWith("2") || filters.week.endsWith("4") ? 2 : -2;
    }
    if (filters?.fromDate) offset += 1;
    if (filters?.toDate) offset -= 1;

    const labels = filtered.map(item => item.operator);
    const months = ["Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25"];

    const datasets = months.map((m, idx) => {
      const colorPalette = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
      const data = filtered.map(item => Math.max(0, Math.min(100, item[m] + offset)));
      return {
        label: m,
        data,
        backgroundColor: colorPalette[idx],
        borderRadius: 4
      };
    });

    const filteredDatasets = filters?.month
      ? datasets.filter(ds => ds.label === filters.month)
      : datasets;

    return { labels, datasets: filteredDatasets };
  }, [filters]);

  const setupChart1 = React.useCallback((canvas) => {
    const rejectionLimit = targetConfig?.rejection?.rejectionLimit ?? 2.0;
    const datasetsWithTarget = [
      ...(chart1Data.datasets || []),
      {
        type: "line",
        label: "Max Rejection Target",
        data: (chart1Data.labels || []).map(() => rejectionLimit),
        borderColor: "rgba(239, 68, 68, 0.85)",
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0
      }
    ];

    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: chart1Data.labels,
        datasets: datasetsWithTarget
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: { size: 9, family: "'Inter', sans-serif" },
              boxWidth: 10
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, family: "'Inter', sans-serif" } }
          },
          y: {
            min: 0,
            max: 40,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: {
              font: { size: 10, family: "'Inter', sans-serif" },
              callback: (v) => `${v}%`
            }
          }
        }
      }
    });
  }, [chart1Data, targetConfig]);

  const setupChart2 = React.useCallback((canvas) => {
    const rejectionLimit = targetConfig?.rejection?.rejectionLimit ?? 2.0;
    const datasetsWithTarget = [
      ...(chart2Data.datasets || []),
      {
        type: "line",
        label: "Max Rejection Target",
        data: (chart2Data.labels || []).map(() => rejectionLimit),
        borderColor: "rgba(239, 68, 68, 0.85)",
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0
      }
    ];

    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: chart2Data.labels,
        datasets: datasetsWithTarget
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: { size: 9, family: "'Inter', sans-serif" },
              boxWidth: 10
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, family: "'Inter', sans-serif" } }
          },
          y: {
            min: 0,
            max: 40,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: {
              font: { size: 10, family: "'Inter', sans-serif" },
              callback: (v) => `${v}%`
            }
          }
        }
      }
    });
  }, [chart2Data, targetConfig]);

  const activeSlide = activeTab === "operator_wise_rejection" ? 1 : 0;

  const nextSlide = () => {
    onActiveTabChange(activeSlide === 0 ? "operator_wise_rejection" : "machine_wise_rejection");
  };

  const prevSlide = () => {
    onActiveTabChange(activeSlide === 0 ? "operator_wise_rejection" : "machine_wise_rejection");
  };

  const carouselControls = (
    <div className="pp1-dt-card" style={{ padding: "14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)", background: "#fff", marginTop: "10px" }}>
      <div className="pp1-dt-card__hd" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div className="pp1-dt-card__title" style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--pp1-text-3)" }}>
          {activeSlide === 0 ? "Machine Wise Rejection %" : "Operator Wise Rejection %"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={prevSlide}
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              color: "var(--pp1-text-3)",
              transition: "all 0.15s ease"
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--pp1-text-3)", minWidth: "30px", textAlign: "center" }}>
            {activeSlide + 1} / 2
          </span>
          <button
            type="button"
            onClick={nextSlide}
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              color: "var(--pp1-text-3)",
              transition: "all 0.15s ease"
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="pp1-dt-chart-wrap" style={{ height: 220, position: "relative" }}>
        {activeSlide === 0 ? (
          <ChartJsCanvas setup={setupChart1} height={220} rebuildToken={`rej1-${JSON.stringify(chart1Data)}`} />
        ) : (
          <ChartJsCanvas setup={setupChart2} height={220} rebuildToken={`rej2-${JSON.stringify(chart2Data)}`} />
        )}
      </div>
    </div>
  );

  const months = ["Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25"];
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
  const machines = ["CNC1", "CNC2", "HMC1", "VMC1"];
  const operators = ["Kumar", "Siva", "Ravi", "Sakthi", "Rangaraj"];

  return (
    <PremiumDashboardView
      title="Rejection Report"
      icon={AlertTriangle}
      color="#f59e0b"
      kpis={null}
      setupChart={null}
      chartControls={carouselControls}
      rangeHint="Rejection Analysis Charts"
      onClose={onClose}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" ref={dateRangeRef}>
          <label className="pp1-filter-label">Date Range</label>
          <div
            className="pp1-filter-input pp1-filter-input--date-range-trigger"
            onClick={() => setDateOpen(!dateOpen)}
          >
            <span>{dateRangeDisplay()}</span>
            <Calendar size={13} className="pp1-filter-icon" />
          </div>
          {dateOpen && (
            <div className="pp1-date-popup">
              <div className="pp1-date-popup-inputs">
                <div className="pp1-date-popup-field">
                  <label>From</label>
                  <input
                    type="date"
                    value={filters?.fromDate || ""}
                    onChange={e => handleInputChange("fromDate", e.target.value)}
                  />
                </div>
                <div className="pp1-date-popup-field">
                  <label>To</label>
                  <input
                    type="date"
                    value={filters?.toDate || ""}
                    onChange={e => handleInputChange("toDate", e.target.value)}
                  />
                </div>
              </div>
              <div className="pp1-date-popup-footer">
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange("fromDate", "");
                    handleInputChange("toDate", "");
                    setDateOpen(false);
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="pp1-date-popup-btn-apply"
                  onClick={() => setDateOpen(false)}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Month Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Month</label>
          <select
            className="pp1-filter-input"
            value={filters?.month || ""}
            onChange={e => handleInputChange("month", e.target.value)}
          >
            <option value="">All Months</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Week Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Week</label>
          <select
            className="pp1-filter-input"
            value={filters?.week || ""}
            onChange={e => handleInputChange("week", e.target.value)}
          >
            <option value="">All Weeks</option>
            {weeks.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        {/* Machine No Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Machine No</label>
          <select
            className="pp1-filter-input"
            value={filters?.machine || ""}
            onChange={e => handleInputChange("machine", e.target.value)}
          >
            <option value="">All Machines</option>
            {machines.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Operator Name Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Operator Name</label>
          <select
            className="pp1-filter-input"
            value={filters?.operatorName || ""}
            onChange={e => handleInputChange("operatorName", e.target.value)}
          >
            <option value="">All Operators</option>
            {operators.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          className="pp1-filter-btn pp1-filter-btn--reset"
          onClick={handleReset}
          style={{ alignSelf: "flex-end", height: "28px" }}
        >
          Reset
        </button>
      </div>
    </PremiumDashboardView>
  );
}

function RejectionReportBottomTable({ filters, activeTab, setActiveTab }) {
  const [localActiveTab, setLocalActiveTab] = React.useState("machine_wise_rejection");
  const tab = activeTab || localActiveTab;
  const setTab = setActiveTab || setLocalActiveTab;

  const operatorToMachine = {
    Kumar: "CNC1",
    Siva: "VMC1",
    Ravi: "HMC1",
    Sakthi: "CNC1",
    Rangaraj: "CNC2"
  };

  const offset = React.useMemo(() => {
    let off = 0;
    if (filters?.month) {
      const hash = filters.month.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      off += (hash % 5) - 2; // -2 to +2
    }
    if (filters?.week) {
      off += filters.week.endsWith("2") || filters.week.endsWith("4") ? 1 : -1;
    }
    if (filters?.fromDate) off += 1;
    if (filters?.toDate) off -= 1;
    return off;
  }, [filters]);

  // Tab 1: Machine Wise Rejection %
  const rows1 = React.useMemo(() => {
    const baseTab1Rows = [
      ["CNC1", "27%", "31%", "14%", "21%", "13%"],
      ["CNC2", "9%", "14%", "5%", "14%", "2%"],
      ["HMC1", "14%", "8%", "9%", "12%", "5%"],
      ["VMC1", "30%", "24%", "14%", "13%", "10%"]
    ];

    let list = baseTab1Rows;
    if (filters?.machine) {
      list = list.filter(r => r[0] === filters.machine);
    }
    if (filters?.operatorName) {
      const machineForOperator = operatorToMachine[filters.operatorName];
      if (machineForOperator) {
        list = list.filter(r => r[0] === machineForOperator);
      }
    }

    if (offset !== 0) {
      return list.map(row => {
        const machine = row[0];
        const monthlyVals = row.slice(1).map(val => {
          const num = parseFloat(val);
          const newVal = Math.max(0, Math.min(100, num + offset));
          return `${newVal.toFixed(0)}%`;
        });
        return [machine, ...monthlyVals];
      });
    }

    return list;
  }, [filters, offset]);

  // Tab 2: Operator Wise Rejection %
  const rows2 = React.useMemo(() => {
    const baseTab2Rows = [
      ["Kumar", "CNC1", "25%", "13%", "8%", "11%", "6%"],
      ["Siva", "VMC1", "30%", "24%", "14%", "13%", "10%"],
      ["Ravi", "HMC1", "14%", "8%", "9%", "12%", "5%"],
      ["Sakthi", "CNC1", "28%", "18%", "6%", "10%", "7%"],
      ["Rangaraj", "CNC2", "9%", "14%", "5%", "14%", "2%"]
    ];

    let list = baseTab2Rows;
    if (filters?.machine) {
      list = list.filter(r => r[1] === filters.machine);
    }
    if (filters?.operatorName) {
      list = list.filter(r => r[0] === filters.operatorName);
    }

    if (offset !== 0) {
      return list.map(row => {
        const metadata = row.slice(0, 2);
        const monthlyVals = row.slice(2).map(val => {
          const num = parseFloat(val);
          const newVal = Math.max(0, Math.min(100, num + offset));
          return `${newVal.toFixed(0)}%`;
        });
        return [...metadata, ...monthlyVals];
      });
    }

    return list;
  }, [filters, offset]);

  // Tab 3: Defect Distribution by Part
  const rows3 = React.useMemo(() => {
    const baseTab3Rows = [
      ["P-1001", "Brake Rotor Cover", "1500", "45", "3.0%", "CNC1"],
      ["P-1002", "Gear Shifter Bushing", "2000", "20", "1.0%", "CNC2"],
      ["P-1003", "Engine Mount Bracket", "1200", "36", "3.0%", "HMC1"],
      ["P-1004", "Drive Shaft Flange", "1800", "18", "1.0%", "VMC1"]
    ];

    let list = baseTab3Rows;
    if (filters?.machine) {
      list = list.filter(r => r[5] === filters.machine);
    }
    if (filters?.operatorName) {
      const machineForOperator = operatorToMachine[filters.operatorName];
      if (machineForOperator) {
        list = list.filter(r => r[5] === machineForOperator);
      }
    }

    return list.map(row => {
      const partNo = row[0];
      const desc = row[1];
      let inspected = parseInt(row[2], 10);
      let rejection = parseInt(row[3], 10);

      if (offset !== 0) {
        rejection = Math.max(0, rejection + Math.round(offset * 2));
        inspected = Math.max(rejection, inspected + Math.round(offset * 10));
      }
      const defectRate = inspected > 0 ? ((rejection / inspected) * 100).toFixed(1) + "%" : "0.0%";
      return [partNo, desc, inspected.toLocaleString(), rejection.toString(), defectRate];
    });
  }, [filters, offset]);

  const activeColumns = tab === "machine_wise_rejection"
    ? ["Machine No", "Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25"]
    : tab === "operator_wise_rejection"
      ? ["Operator Name", "Machine No", "Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25"]
      : ["Part Number", "Description", "Inspected Qty", "Rejection Qty", "Defect Rate %"];

  const activeRows = tab === "machine_wise_rejection"
    ? rows1
    : tab === "operator_wise_rejection"
      ? rows2
      : rows3;

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "18px", borderBottom: "1px solid rgba(0,0,0,0.08)", width: "100%", paddingBottom: "4px" }}>
          {[
            { id: "machine_wise_rejection", label: "Machine Wise Rejection %" },
            { id: "operator_wise_rejection", label: "Operator Wise Rejection %" },
            { id: "defect_distribution", label: "Defect Distribution by Part" }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              style={{
                background: "none",
                border: "none",
                borderBottom: tab === t.id ? "2.5px solid var(--pp1-blue)" : "none",
                color: tab === t.id ? "var(--pp1-blue)" : "var(--pp1-text-3)",
                fontWeight: 700,
                fontSize: "12px",
                paddingBottom: "6px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
          <thead>
            <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
              {activeColumns.map((col, idx) => {
                const isRightAligned = idx > (tab === "machine_wise_rejection" ? 0 : tab === "operator_wise_rejection" ? 1 : 1) && (
                  col.toLowerCase().includes("qty") ||
                  col.toLowerCase().includes("value") ||
                  col.toLowerCase().includes("hours") ||
                  col.toLowerCase().includes("hour") ||
                  col.toLowerCase().includes("rate") ||
                  col.toLowerCase().includes("ratio") ||
                  col.toLowerCase().includes("%") ||
                  col.toLowerCase().includes("day") ||
                  col.toLowerCase().includes("month") ||
                  col.toLowerCase().includes("loss")
                );
                return (
                  <th
                    key={idx}
                    style={{
                      position: "sticky",
                      top: 0,
                      backgroundColor: "#f2f6fe",
                      zIndex: 10,
                      textAlign: isRightAligned ? "right" : "left"
                    }}
                  >
                    {col}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {activeRows.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length} className="pp1-cc-tbl__empty">
                  No data matches active filters.
                </td>
              </tr>
            ) : (
              activeRows.map((row, ri) => (
                <tr key={ri} className="pp1-cc-tbl__tr">
                  {row.map((cell, ci) => {
                    const isRightAligned = ci > (tab === "machine_wise_rejection" ? 0 : tab === "operator_wise_rejection" ? 1 : 1) && (
                      activeColumns[ci].toLowerCase().includes("qty") ||
                      activeColumns[ci].toLowerCase().includes("value") ||
                      activeColumns[ci].toLowerCase().includes("hours") ||
                      activeColumns[ci].toLowerCase().includes("hour") ||
                      activeColumns[ci].toLowerCase().includes("rate") ||
                      activeColumns[ci].toLowerCase().includes("ratio") ||
                      activeColumns[ci].toLowerCase().includes("%") ||
                      activeColumns[ci].toLowerCase().includes("day") ||
                      activeColumns[ci].toLowerCase().includes("month") ||
                      activeColumns[ci].toLowerCase().includes("loss")
                    );
                    return (
                      <td
                        key={ci}
                        className={ci === 0 ? "pp1-cc-tbl__bold" : ""}
                        style={{
                          textAlign: isRightAligned ? "right" : "left",
                          fontWeight: ci === 0 ? 700 : 600
                        }}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReworkReportDashboardView({ filters, onFilterChange, activeTab, onActiveTabChange, onClose, targetConfig }) {
  const [dateOpen, setDateOpen] = React.useState(false);
  const dateRangeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target)) {
        setDateOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateStr;
  };

  const dateRangeDisplay = () => {
    if (filters?.fromDate && filters?.toDate) {
      return `${formatDateDisplay(filters.fromDate)} - ${formatDateDisplay(filters.toDate)}`;
    }
    if (filters?.fromDate) {
      return `${formatDateDisplay(filters.fromDate)} - ...`;
    }
    if (filters?.toDate) {
      return `... - ${formatDateDisplay(filters.toDate)}`;
    }
    return "Select Date Range...";
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      month: "",
      week: "",
      machine: "",
      operatorName: "",
    });
  };

  const operatorToMachine = {
    Kumar: "CNC1",
    Siva: "VMC1",
    Ravi: "HMC1",
    Sakthi: "CNC1",
    Rangaraj: "CNC2"
  };

  const chart1Data = React.useMemo(() => {
    const rawData = [
      { machine: "CNC1", "Apr-25": 18, "May-25": 20, "Jun-25": 10, "Jul-25": 15, "Aug-25": 9 },
      { machine: "CNC2", "Apr-25": 6, "May-25": 9, "Jun-25": 3, "Jul-25": 8, "Aug-25": 1 },
      { machine: "HMC1", "Apr-25": 9, "May-25": 5, "Jun-25": 6, "Jul-25": 8, "Aug-25": 3 },
      { machine: "VMC1", "Apr-25": 20, "May-25": 16, "Jun-25": 9, "Jul-25": 8, "Aug-25": 7 }
    ];

    let filtered = rawData;
    if (filters?.machine) {
      filtered = filtered.filter(item => item.machine === filters.machine);
    }
    if (filters?.operatorName) {
      const machineForOperator = operatorToMachine[filters.operatorName];
      if (machineForOperator) {
        filtered = filtered.filter(item => item.machine === machineForOperator);
      }
    }

    let offset = 0;
    if (filters?.week) {
      offset += filters.week.endsWith("2") || filters.week.endsWith("4") ? 2 : -2;
    }
    if (filters?.fromDate) offset += 1;
    if (filters?.toDate) offset -= 1;

    const labels = filtered.map(item => item.machine);
    const months = ["Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25"];

    const datasets = months.map((m, idx) => {
      const colorPalette = ["#8b5cf6", "#6366f1", "#a855f7", "#ec4899", "#3b82f6"];
      const data = filtered.map(item => Math.max(0, Math.min(100, item[m] + offset)));
      return {
        label: m,
        data,
        backgroundColor: colorPalette[idx],
        borderRadius: 4
      };
    });

    const filteredDatasets = filters?.month
      ? datasets.filter(ds => ds.label === filters.month)
      : datasets;

    return { labels, datasets: filteredDatasets };
  }, [filters]);

  const chart2Data = React.useMemo(() => {
    const rawData = [
      { operator: "Kumar", machine: "CNC1", "Apr-25": 15, "May-25": 8, "Jun-25": 5, "Jul-25": 7, "Aug-25": 4 },
      { operator: "Siva", machine: "VMC1", "Apr-25": 20, "May-25": 16, "Jun-25": 9, "Jul-25": 8, "Aug-25": 7 },
      { operator: "Ravi", machine: "HMC1", "Apr-25": 9, "May-25": 5, "Jun-25": 6, "Jul-25": 8, "Aug-25": 3 },
      { operator: "Sakthi", machine: "CNC1", "Apr-25": 18, "May-25": 12, "Jun-25": 4, "Jul-25": 6, "Aug-25": 5 },
      { operator: "Rangaraj", machine: "CNC2", "Apr-25": 6, "May-25": 9, "Jun-25": 3, "Jul-25": 8, "Aug-25": 1 }
    ];

    let filtered = rawData;
    if (filters?.machine) {
      filtered = filtered.filter(item => item.machine === filters.machine);
    }
    if (filters?.operatorName) {
      filtered = filtered.filter(item => item.operator === filters.operatorName);
    }

    let offset = 0;
    if (filters?.week) {
      offset += filters.week.endsWith("2") || filters.week.endsWith("4") ? 1 : -1;
    }
    if (filters?.fromDate) offset += 1;
    if (filters?.toDate) offset -= 1;

    const labels = filtered.map(item => item.operator);
    const months = ["Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25"];

    const datasets = months.map((m, idx) => {
      const colorPalette = ["#8b5cf6", "#6366f1", "#a855f7", "#ec4899", "#3b82f6"];
      const data = filtered.map(item => Math.max(0, Math.min(100, item[m] + offset)));
      return {
        label: m,
        data,
        backgroundColor: colorPalette[idx],
        borderRadius: 4
      };
    });

    const filteredDatasets = filters?.month
      ? datasets.filter(ds => ds.label === filters.month)
      : datasets;

    return { labels, datasets: filteredDatasets };
  }, [filters]);

  const setupChart1 = React.useCallback((canvas) => {
    const reworkLimit = targetConfig?.rework?.reworkLimit ?? 1.5;
    const datasetsWithTarget = [
      ...(chart1Data.datasets || []),
      {
        type: "line",
        label: "Max Rework Target",
        data: (chart1Data.labels || []).map(() => reworkLimit),
        borderColor: "rgba(239, 68, 68, 0.85)",
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0
      }
    ];

    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: chart1Data.labels,
        datasets: datasetsWithTarget
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: { size: 9, family: "'Inter', sans-serif" },
              boxWidth: 10
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, family: "'Inter', sans-serif" } }
          },
          y: {
            min: 0,
            max: 30,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: {
              font: { size: 10, family: "'Inter', sans-serif" },
              callback: (v) => `${v}%`
            }
          }
        }
      }
    });
  }, [chart1Data, targetConfig]);

  const setupChart2 = React.useCallback((canvas) => {
    const reworkLimit = targetConfig?.rework?.reworkLimit ?? 1.5;
    const datasetsWithTarget = [
      ...(chart2Data.datasets || []),
      {
        type: "line",
        label: "Max Rework Target",
        data: (chart2Data.labels || []).map(() => reworkLimit),
        borderColor: "rgba(239, 68, 68, 0.85)",
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0
      }
    ];

    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: chart2Data.labels,
        datasets: datasetsWithTarget
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: { size: 9, family: "'Inter', sans-serif" },
              boxWidth: 10
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, family: "'Inter', sans-serif" } }
          },
          y: {
            min: 0,
            max: 30,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: {
              font: { size: 10, family: "'Inter', sans-serif" },
              callback: (v) => `${v}%`
            }
          }
        }
      }
    });
  }, [chart2Data, targetConfig]);

  const activeSlide = activeTab === "operator_wise_rework" ? 1 : 0;

  const nextSlide = () => {
    onActiveTabChange(activeSlide === 0 ? "operator_wise_rework" : "machine_wise_rework");
  };

  const prevSlide = () => {
    onActiveTabChange(activeSlide === 0 ? "operator_wise_rework" : "machine_wise_rework");
  };

  const carouselControls = (
    <div className="pp1-dt-card" style={{ padding: "14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)", background: "#fff", marginTop: "10px" }}>
      <div className="pp1-dt-card__hd" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div className="pp1-dt-card__title" style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--pp1-text-3)" }}>
          {activeSlide === 0 ? "Machine Wise Rework %" : "Operator Wise Rework %"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={prevSlide}
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              color: "var(--pp1-text-3)",
              transition: "all 0.15s ease"
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--pp1-text-3)", minWidth: "30px", textAlign: "center" }}>
            {activeSlide + 1} / 2
          </span>
          <button
            type="button"
            onClick={nextSlide}
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              color: "var(--pp1-text-3)",
              transition: "all 0.15s ease"
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="pp1-dt-chart-wrap" style={{ height: 220, position: "relative" }}>
        {activeSlide === 0 ? (
          <ChartJsCanvas setup={setupChart1} height={220} rebuildToken={`rew1-${JSON.stringify(chart1Data)}`} />
        ) : (
          <ChartJsCanvas setup={setupChart2} height={220} rebuildToken={`rew2-${JSON.stringify(chart2Data)}`} />
        )}
      </div>
    </div>
  );

  const months = ["Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25"];
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
  const machines = ["CNC1", "CNC2", "HMC1", "VMC1"];
  const operators = ["Kumar", "Siva", "Ravi", "Sakthi", "Rangaraj"];

  return (
    <PremiumDashboardView
      title="Rework Report"
      icon={PackageCheck}
      color="#a855f7"
      kpis={null}
      setupChart={null}
      chartControls={carouselControls}
      rangeHint="Rework Analysis Charts"
      onClose={onClose}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" ref={dateRangeRef}>
          <label className="pp1-filter-label">Date Range</label>
          <div
            className="pp1-filter-input pp1-filter-input--date-range-trigger"
            onClick={() => setDateOpen(!dateOpen)}
          >
            <span>{dateRangeDisplay()}</span>
            <Calendar size={13} className="pp1-filter-icon" />
          </div>
          {dateOpen && (
            <div className="pp1-date-popup">
              <div className="pp1-date-popup-inputs">
                <div className="pp1-date-popup-field">
                  <label>From</label>
                  <input
                    type="date"
                    value={filters?.fromDate || ""}
                    onChange={e => handleInputChange("fromDate", e.target.value)}
                  />
                </div>
                <div className="pp1-date-popup-field">
                  <label>To</label>
                  <input
                    type="date"
                    value={filters?.toDate || ""}
                    onChange={e => handleInputChange("toDate", e.target.value)}
                  />
                </div>
              </div>
              <div className="pp1-date-popup-footer">
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange("fromDate", "");
                    handleInputChange("toDate", "");
                    setDateOpen(false);
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="pp1-date-popup-btn-apply"
                  onClick={() => setDateOpen(false)}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Month Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Month</label>
          <select
            className="pp1-filter-input"
            value={filters?.month || ""}
            onChange={e => handleInputChange("month", e.target.value)}
          >
            <option value="">All Months</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Week Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Week</label>
          <select
            className="pp1-filter-input"
            value={filters?.week || ""}
            onChange={e => handleInputChange("week", e.target.value)}
          >
            <option value="">All Weeks</option>
            {weeks.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        {/* Machine No Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Machine No</label>
          <select
            className="pp1-filter-input"
            value={filters?.machine || ""}
            onChange={e => handleInputChange("machine", e.target.value)}
          >
            <option value="">All Machines</option>
            {machines.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Operator Name Filter */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Operator Name</label>
          <select
            className="pp1-filter-input"
            value={filters?.operatorName || ""}
            onChange={e => handleInputChange("operatorName", e.target.value)}
          >
            <option value="">All Operators</option>
            {operators.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          className="pp1-filter-btn pp1-filter-btn--reset"
          onClick={handleReset}
          style={{ alignSelf: "flex-end", height: "28px" }}
        >
          Reset
        </button>
      </div>
    </PremiumDashboardView>
  );
}

function ReworkReportBottomTable({ filters, activeTab, setActiveTab }) {
  const [localActiveTab, setLocalActiveTab] = React.useState("machine_wise_rework");
  const tab = activeTab || localActiveTab;
  const setTab = setActiveTab || setLocalActiveTab;

  const operatorToMachine = {
    Kumar: "CNC1",
    Siva: "VMC1",
    Ravi: "HMC1",
    Sakthi: "CNC1",
    Rangaraj: "CNC2"
  };

  const offset = React.useMemo(() => {
    let off = 0;
    if (filters?.month) {
      const hash = filters.month.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      off += (hash % 5) - 2; // -2 to +2
    }
    if (filters?.week) {
      off += filters.week.endsWith("2") || filters.week.endsWith("4") ? 1 : -1;
    }
    if (filters?.fromDate) off += 1;
    if (filters?.toDate) off -= 1;
    return off;
  }, [filters]);

  // Tab 1: Machine Wise Rework %
  const rows1 = React.useMemo(() => {
    const baseTab1Rows = [
      ["CNC1", "18%", "20%", "10%", "15%", "9%"],
      ["CNC2", "6%", "9%", "3%", "8%", "1%"],
      ["HMC1", "9%", "5%", "6%", "8%", "3%"],
      ["VMC1", "20%", "16%", "9%", "8%", "7%"]
    ];

    let list = baseTab1Rows;
    if (filters?.machine) {
      list = list.filter(r => r[0] === filters.machine);
    }
    if (filters?.operatorName) {
      const machineForOperator = operatorToMachine[filters.operatorName];
      if (machineForOperator) {
        list = list.filter(r => r[0] === machineForOperator);
      }
    }

    if (offset !== 0) {
      return list.map(row => {
        const machine = row[0];
        const monthlyVals = row.slice(1).map(val => {
          const num = parseFloat(val);
          const newVal = Math.max(0, Math.min(100, num + offset));
          return `${newVal.toFixed(0)}%`;
        });
        return [machine, ...monthlyVals];
      });
    }

    return list;
  }, [filters, offset]);

  // Tab 2: Operator Wise Rework %
  const rows2 = React.useMemo(() => {
    const baseTab2Rows = [
      ["Kumar", "CNC1", "15%", "8%", "5%", "7%", "4%"],
      ["Siva", "VMC1", "20%", "16%", "9%", "8%", "7%"],
      ["Ravi", "HMC1", "9%", "5%", "6%", "8%", "3%"],
      ["Sakthi", "CNC1", "18%", "12%", "4%", "6%", "5%"],
      ["Rangaraj", "CNC2", "6%", "9%", "3%", "8%", "1%"]
    ];

    let list = baseTab2Rows;
    if (filters?.machine) {
      list = list.filter(r => r[1] === filters.machine);
    }
    if (filters?.operatorName) {
      list = list.filter(r => r[0] === filters.operatorName);
    }

    if (offset !== 0) {
      return list.map(row => {
        const metadata = row.slice(0, 2);
        const monthlyVals = row.slice(2).map(val => {
          const num = parseFloat(val);
          const newVal = Math.max(0, Math.min(100, num + offset));
          return `${newVal.toFixed(0)}%`;
        });
        return [...metadata, ...monthlyVals];
      });
    }

    return list;
  }, [filters, offset]);

  // Tab 3: Rework Distribution by Part
  const rows3 = React.useMemo(() => {
    const baseTab3Rows = [
      ["P-1001", "Brake Rotor Cover", "1500", "30", "2.0%", "CNC1"],
      ["P-1002", "Gear Shifter Bushing", "2000", "15", "0.8%", "CNC2"],
      ["P-1003", "Engine Mount Bracket", "1200", "24", "2.0%", "HMC1"],
      ["P-1004", "Drive Shaft Flange", "1800", "12", "0.7%", "VMC1"]
    ];

    let list = baseTab3Rows;
    if (filters?.machine) {
      list = list.filter(r => r[5] === filters.machine);
    }
    if (filters?.operatorName) {
      const machineForOperator = operatorToMachine[filters.operatorName];
      if (machineForOperator) {
        list = list.filter(r => r[5] === machineForOperator);
      }
    }

    return list.map(row => {
      const partNo = row[0];
      const desc = row[1];
      let inspected = parseInt(row[2], 10);
      let rework = parseInt(row[3], 10);

      if (offset !== 0) {
        rework = Math.max(0, rework + Math.round(offset));
        inspected = Math.max(rework, inspected + Math.round(offset * 10));
      }
      const reworkRate = inspected > 0 ? ((rework / inspected) * 100).toFixed(1) + "%" : "0.0%";
      return [partNo, desc, inspected.toLocaleString(), rework.toString(), reworkRate];
    });
  }, [filters, offset]);

  const activeColumns = tab === "machine_wise_rework"
    ? ["Machine No", "Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25"]
    : tab === "operator_wise_rework"
      ? ["Operator Name", "Machine No", "Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25"]
      : ["Part Number", "Description", "Inspected Qty", "Rework Qty", "Rework Rate %"];

  const activeRows = tab === "machine_wise_rework"
    ? rows1
    : tab === "operator_wise_rework"
      ? rows2
      : rows3;

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "18px", borderBottom: "1px solid rgba(0,0,0,0.08)", width: "100%", paddingBottom: "4px" }}>
          {[
            { id: "machine_wise_rework", label: "Machine Wise Rework %" },
            { id: "operator_wise_rework", label: "Operator Wise Rework %" },
            { id: "rework_distribution", label: "Rework Distribution by Part" }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              style={{
                background: "none",
                border: "none",
                borderBottom: tab === t.id ? "2.5px solid var(--pp1-blue)" : "none",
                color: tab === t.id ? "var(--pp1-blue)" : "var(--pp1-text-3)",
                fontWeight: 700,
                fontSize: "12px",
                paddingBottom: "6px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
          <thead>
            <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
              {activeColumns.map((col, idx) => {
                const isRightAligned = idx > (tab === "machine_wise_rework" ? 0 : tab === "operator_wise_rework" ? 1 : 1) && (
                  col.toLowerCase().includes("qty") ||
                  col.toLowerCase().includes("value") ||
                  col.toLowerCase().includes("hours") ||
                  col.toLowerCase().includes("hour") ||
                  col.toLowerCase().includes("rate") ||
                  col.toLowerCase().includes("ratio") ||
                  col.toLowerCase().includes("%") ||
                  col.toLowerCase().includes("day") ||
                  col.toLowerCase().includes("month") ||
                  col.toLowerCase().includes("loss")
                );
                return (
                  <th
                    key={idx}
                    style={{
                      position: "sticky",
                      top: 0,
                      backgroundColor: "#f2f6fe",
                      zIndex: 10,
                      textAlign: isRightAligned ? "right" : "left"
                    }}
                  >
                    {col}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {activeRows.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length} className="pp1-cc-tbl__empty">
                  No data matches active filters.
                </td>
              </tr>
            ) : (
              activeRows.map((row, ri) => (
                <tr key={ri} className="pp1-cc-tbl__tr">
                  {row.map((cell, ci) => {
                    const isRightAligned = ci > (tab === "machine_wise_rework" ? 0 : tab === "operator_wise_rework" ? 1 : 1) && (
                      activeColumns[ci].toLowerCase().includes("qty") ||
                      activeColumns[ci].toLowerCase().includes("value") ||
                      activeColumns[ci].toLowerCase().includes("hours") ||
                      activeColumns[ci].toLowerCase().includes("hour") ||
                      activeColumns[ci].toLowerCase().includes("rate") ||
                      activeColumns[ci].toLowerCase().includes("ratio") ||
                      activeColumns[ci].toLowerCase().includes("%") ||
                      activeColumns[ci].toLowerCase().includes("day") ||
                      activeColumns[ci].toLowerCase().includes("month") ||
                      activeColumns[ci].toLowerCase().includes("loss")
                    );
                    return (
                      <td
                        key={ci}
                        className={ci === 0 ? "pp1-cc-tbl__bold" : ""}
                        style={{
                          textAlign: isRightAligned ? "right" : "left",
                          fontWeight: ci === 0 ? 700 : 600
                        }}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomerComplaintReportDashboardView({ onClose }) {
  const kpis = [
    { label: "Active Complaints", value: "2", icon: "⚠️", color: "#ef4444" },
    { label: "Resolved", value: "12", icon: "✅", color: "#10b981" },
    { label: "Avg Resolution", value: "4.5d", icon: "⏱️", color: "#3b82f6" },
    { label: "Satisfaction", value: "96%", icon: "😊", color: "#8b5cf6" }
  ];
  return <PremiumDashboardView title="Customer Complaint Report" icon={Megaphone} color="#dc2626" kpis={kpis} setupChart={null} rangeHint="Active Range" onClose={onClose} />;
}

function CustomerComplaintReportBottomTable() {
  const columns = ["Complaint ID", "Customer", "Product", "Complaint Description", "Action Taken", "Date", "Corrective Action", "Permanent Action", "Status"];
  const rows = [
    ["CC-2026-001", "Tata Motors", "Brake Pads", "Surface scratches", "Polished surfaces", "02-Jun-2026", "Enhanced visual inspection", "Automated QC cameras", "Closed"],
    ["CC-2026-002", "Mahindra & Mahindra", "Disc Rotors", "Thickness variation", "Recalibrated grinder", "05-Jun-2026", "Adjusted grinding head", "CNC alignment checks", "Open"],
    ["CC-2026-003", "Maruti Suzuki", "Gearbox Hanger", "Mounting hole offset", "Re-aligned fixture", "10-Jun-2026", "Added check pin to fixture", "Poka-yoke pin design", "Closed"]
  ];
  return <PremiumDashboardBottomTable title="Customer Complaints Registry" columns={columns} rows={rows} />;
}

function MachineCapacityReportDashboardView({ onClose }) {
  const kpis = [
    { label: "Available Hours", value: "2,400 h", icon: "📅", color: "#ea580c" },
    { label: "Utilized Hours", value: "1,850 h", icon: "⚙️", color: "#3b82f6" },
    { label: "Capacity Load", value: "77.1%", icon: "📊", color: "#10b981" },
    { label: "Overload Alerts", value: "0", icon: "🚨", color: "#10b981" }
  ];
  const setupChart = React.useCallback((canvas) => {
    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: ["CNC-01", "CNC-02", "VMC-01", "VMC-02", "Grinding-01"],
        datasets: [
          { label: "Run Hours", data: [380, 350, 360, 310, 280], backgroundColor: "#3b82f6" },
          { label: "Available Hours", data: [480, 480, 480, 480, 480], backgroundColor: "#e2e8f0" }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { stacked: true }, y: { stacked: false } }
      }
    });
  }, []);
  return <PremiumDashboardView title="Machine Capacity Report" icon={Package} color="#ea580c" kpis={kpis} setupChart={setupChart} rangeHint="Machinery Capacity Load" onClose={onClose} />;
}

function MachineCapacityReportBottomTable() {
  const columns = ["Machine Name", "Available Hours", "Setup Hours", "Run Hours", "Idle Hours", "Load %", "Status"];
  const rows = [
    ["CNC-01", "480", "40", "380", "60", "87.5%", "Normal"],
    ["CNC-02", "480", "45", "350", "85", "82.3%", "Normal"],
    ["VMC-01", "480", "30", "360", "90", "81.2%", "Normal"],
    ["VMC-02", "480", "35", "310", "135", "71.9%", "Normal"],
    ["Grinding-01", "480", "20", "280", "180", "62.5%", "Normal"]
  ];
  return <PremiumDashboardBottomTable title="Machine Load and Availability Details" columns={columns} rows={rows} />;
}

export default function PlantPerformance1() {
  const [selKpi, setSelKpi] = useState(0);
  const [selAction, setSelAction] = useState("customer_po_vs_sales_analysis");
  const [centerKey, setCenterKey] = useState(0);
  const [activePeriod, setActivePeriod] = useState("month");
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [data, setData] = useState({});
  const [poFilters, setPoFilters] = useState({
    fromDate: "",
    toDate: "",
    customer: "",
    poNumber: "",
    partNumber: "",
    category: "",
  });
  const [poActiveSlide, setPoActiveSlide] = useState(0);
  const [poShowTargetOnly, setPoShowTargetOnly] = useState(false);
  const [purFilters, setPurFilters] = useState({
    fromDate: "",
    toDate: "",
    supplier: "",
    category: "",
  });
  const [salesFilters, setSalesFilters] = useState({
    fromDate: "",
    toDate: "",
    customer: "",
    region: "",
  });
  const [prodFilters, setProdFilters] = useState({
    fromDate: "",
    toDate: "",
    team: "",
    machine: "",
    operator: "",
    customer: "",
  });
  const [idleFilters, setIdleFilters] = useState({
    fromDate: "",
    toDate: "",
    machine: "",
    team: "",
    idleReason: "",
  });
  const [idleActiveTab, setIdleActiveTab] = useState("chart1");
  const [nonAccFilters, setNonAccFilters] = useState({
    fromDate: "",
    toDate: "",
    machine: "",
    team: "",
    reason: "",
  });
  const [oeeFilters, setOeeFilters] = useState({
    month: "",
    year: "",
    team: "",
    machineType: "",
    machine: "",
  });
  const [oeeActiveTab, setOeeActiveTab] = useState("machine_oee");
  const [oeeCompActiveTab, setOeeCompActiveTab] = useState("month_comparison");
  const [effActiveTab, setEffActiveTab] = useState("operator_comparison");
  const [rejActiveTab, setRejActiveTab] = useState("machine_wise_rejection");
  const [rewActiveTab, setRewActiveTab] = useState("machine_wise_rework");
  const [oeeCompFilters, setOeeCompFilters] = useState({
    fromDate: "",
    toDate: "",
    month: "",
    year: "",
    week: "",
    machineType: "",
    machine: "",
  });
  const [effFilters, setEffFilters] = useState({
    fromDate: "",
    toDate: "",
    month: "",
    year: "",
    week: "",
    team: "",
    machineType: "",
    machine: "",
    operatorName: "",
  });
  const [rejFilters, setRejFilters] = useState({
    fromDate: "",
    toDate: "",
    month: "",
    week: "",
    machine: "",
    operatorName: "",
  });
  const [rewFilters, setRewFilters] = useState({
    fromDate: "",
    toDate: "",
    month: "",
    week: "",
    machine: "",
    operatorName: "",
  });
  const fetchAbortRef = useRef(null);

  const [showTargetPopover, setShowTargetPopover] = useState(false);
  const [targetConfig, setTargetConfig] = useState({
    oee: 80,
    availability: 85,
    performance: 90,
    quality: 95,
    customer_po: {
      salesTarget: 25,
      orderValueAch: 85
    },
    idle_hours: {
      maxIdleHours: 15,
      reductionTarget: 10
    },
    idle_hours_non_accepted: {
      maxNonAcceptedHours: 5,
      unplannedLimit: 10
    },
    oee_comparison: {
      minUtilization: 75
    },
    rejection: {
      rejectionLimit: 2.0
    },
    rework: {
      reworkLimit: 1.5
    }
  });

  const [activeTargetTab, setActiveTargetTab] = useState("core_kpis");
  const [tempConfig, setTempConfig] = useState(null);
  const [toast, setToast] = useState(null);
  const targetRef = useRef(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleOpenTargetModal = () => {
    setTempConfig(JSON.parse(JSON.stringify(targetConfig)));
    setActiveTargetTab("core_kpis");
    setShowTargetPopover(true);
  };

  const handleTempConfigChange = (key, val) => {
    setTempConfig(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleNestedTempConfigChange = (section, key, val) => {
    setTempConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: val
      }
    }));
  };

  const applyTargetChanges = () => {
    setTargetConfig(tempConfig);
    setShowTargetPopover(false);
    setToast({
      title: "Targets Applied Successfully",
      msg: "Dashboard charts and target lines have been updated.",
      type: "success"
    });
  };

  const fetchAll = useCallback(async (from, to, signal) => {
    setLoading(true);
    setFetchError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setData(MOCK_DATA);
    } catch (e) {
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

  const selectionId = selAction;
  const selectionPanel = selAction ? "action" : null;

  const centerDetail = useMemo(
    () => (selectionId ? buildCenterDetail(selectionId, selectionPanel, data) : null),
    [selectionId, selectionPanel, data]
  );

  const bottomTable = useMemo(
    () => (selectionId ? buildBottomTable(selectionId, selectionPanel, data) : null),
    [selectionId, selectionPanel, data]
  );

  // Compute live trend for every ACTION_CARD based on actual values vs targetConfig.
  // Returns a map: cardId -> { type: "up"|"down"|"average", value: string, message: string }
  const computedCardTrends = useMemo(() => {
    if (!targetConfig) return {};

    const map = {};

    // -- actual values (mock / from data) --
    // Total sales across all customers from chart data
    const salesVal = [7, 18, 12, 8].reduce((a, b) => a + b, 0); // = 45L total
    const salesTarget = targetConfig.customer_po?.salesTarget ?? 25;
    const poOk = salesVal >= salesTarget;
    const poDiff = (((salesVal - salesTarget) / salesTarget) * 100).toFixed(1);
    map["customer_po_vs_sales_analysis"] = {
      type: poOk ? "up" : "down",
      value: `${poOk ? "+" : ""}${poDiff}% ${poOk ? "Up" : "Down"}`,
      message: poOk
        ? `Total Sales (\u20b9${salesVal}L) meets target (\u20b9${salesTarget}L)`
        : `Total Sales (\u20b9${salesVal}L) is below target (\u20b9${salesTarget}L)`,
      priority: "medium"
    };

    const totalIdle = 17.3;
    const maxIdle = targetConfig.idle_hours?.maxIdleHours ?? 15;
    const idleOk = totalIdle <= maxIdle;
    const idleDiff = (((maxIdle - totalIdle) / maxIdle) * 100).toFixed(1);
    map["idle_hours_report_dashboard"] = {
      type: idleOk ? "up" : "down",
      value: `${idleOk ? "+" : "-"}${Math.abs(Number(idleDiff))}% ${idleOk ? "Up" : "Down"}`,
      message: idleOk
        ? `Total Idle Hours (${totalIdle}h) is within target (${maxIdle}h)`
        : `Total Idle Hours (${totalIdle}h) exceeds target (${maxIdle}h)`,
      priority: "medium"
    };

    const nonAcceptedHrs = 4.8;
    const maxNonAccepted = targetConfig.idle_hours_non_accepted?.maxNonAcceptedHours ?? 5;
    const totalIdleForNonAcc = 17.3;
    const unplannedLossPct = (nonAcceptedHrs / totalIdleForNonAcc) * 100;
    const unplannedLimit = targetConfig.idle_hours_non_accepted?.unplannedLimit ?? 10;
    const nonAccOk = nonAcceptedHrs <= maxNonAccepted && unplannedLossPct <= unplannedLimit;
    const nonAccDiff = (((maxNonAccepted - nonAcceptedHrs) / maxNonAccepted) * 100).toFixed(1);
    map["idle_hours_non_accepted_reason_production_loss_report"] = {
      type: nonAccOk ? "up" : "down",
      value: `${nonAccOk ? "+" : "-"}${Math.abs(Number(nonAccDiff))}% ${nonAccOk ? "Up" : "Down"}`,
      message: nonAccOk
        ? `Non-Accepted Hours (${nonAcceptedHrs}h) is within target (${maxNonAccepted}h)`
        : nonAcceptedHrs > maxNonAccepted
          ? `Non-Accepted Hours (${nonAcceptedHrs}h) exceeds target (${maxNonAccepted}h)`
          : `Unplanned Loss (${unplannedLossPct.toFixed(1)}%) exceeds threshold (${unplannedLimit}%)`,
      priority: "high"
    };

    const oaOee = 78.5;
    const oeeTarget = targetConfig.oee ?? 80;
    const oeeOk = oaOee >= oeeTarget;
    const oeeDiff = ((oaOee - oeeTarget)).toFixed(1);
    map["oee_report_dashboard"] = {
      type: oeeOk ? "up" : "down",
      value: `${oeeOk ? "+" : ""}${oeeDiff}% ${oeeOk ? "Up" : "Down"}`,
      message: oeeOk
        ? `OEE Efficiency (${oaOee}%) meets target (${oeeTarget}%)`
        : `OEE Efficiency (${oaOee}%) is below target (${oeeTarget}%)`,
      priority: "medium"
    };

    const minUtilization = targetConfig.oee_comparison?.minUtilization ?? 75;
    const oeeCompOk = oaOee >= minUtilization;
    const oeeCompDiff = ((oaOee - minUtilization)).toFixed(1);
    map["oee_comparison_report_dashboard"] = {
      type: oeeCompOk ? "up" : "down",
      value: `${oeeCompOk ? "+" : ""}${oeeCompDiff}% ${oeeCompOk ? "Up" : "Down"}`,
      message: oeeCompOk
        ? `Machine Utilization (${oaOee}%) meets target (${minUtilization}%)`
        : `Machine Utilization (${oaOee}%) is below target (${minUtilization}%)`,
      priority: "medium"
    };

    const rejPct = 1.8;
    const rejLimit = targetConfig.rejection?.rejectionLimit ?? 2.0;
    const rejOk = rejPct <= rejLimit;
    const rejDiff = ((rejLimit - rejPct) / rejLimit * 100).toFixed(1);
    map["rejection_report_dashboard"] = {
      type: rejOk ? "up" : "down",
      value: `${rejOk ? "+" : "-"}${Math.abs(Number(rejDiff))}% ${rejOk ? "Up" : "Down"}`,
      message: rejOk
        ? `Rejection Rate (${rejPct}%) is within target limit (${rejLimit}%)`
        : `Rejection Rate (${rejPct}%) exceeds target limit (${rejLimit}%)`,
      priority: "high"
    };

    const rewPct = 1.2;
    const rewLimit = targetConfig.rework?.reworkLimit ?? 1.5;
    const rewOk = rewPct <= rewLimit;
    const rewDiff = ((rewLimit - rewPct) / rewLimit * 100).toFixed(1);
    map["rework_report_dashboard"] = {
      type: rewOk ? "up" : "down",
      value: `${rewOk ? "+" : "-"}${Math.abs(Number(rewDiff))}% ${rewOk ? "Up" : "Down"}`,
      message: rewOk
        ? `Rework Rate (${rewPct}%) is within target limit (${rewLimit}%)`
        : `Rework Rate (${rewPct}%) exceeds target limit (${rewLimit}%)`,
      priority: "high"
    };

    return map;
  }, [targetConfig, data]);

  // actionItems = only cards whose computed trend is "down" (needs action)
  const actionItems = useMemo(() => {
    if (!targetConfig || Object.keys(computedCardTrends).length === 0) return [];

    const items = [];
    ACTION_CARDS.forEach(card => {
      const computed = computedCardTrends[card.id];
      if (computed && computed.type === "down") {
        items.push({
          id: card.id,
          title: card.title,
          icon: card.icon,
          color: card.color,
          priority: computed.priority || card.priority || "medium",
          message: computed.message,
          trend: { type: computed.type, value: computed.value }
        });
      }
    });
    return items;
  }, [targetConfig, computedCardTrends]);

  const actionSummary = useMemo(() => {
    let high = 0, medium = 0, low = 0;
    actionItems.forEach((item) => {
      if (item.priority === "high") high++;
      else if (item.priority === "medium") medium++;
      else low++;
    });
    return { high, medium, low };
  }, [actionItems]);

  const getCardStatus = useCallback((cardId) => {
    const item = actionItems.find(x => x.id === cardId);
    return item ? { belowTarget: true } : { belowTarget: false };
  }, [actionItems]);

  return (
    <div className={`pp1-root ${loading ? "pp1-root--loading" : ""}`}>
      <div className="pp1-fbar">
        <PlantPerformance1DatePicker
          activePeriod={activePeriod}
          onPeriodChange={setActivePeriod}
          onRangeChange={handleRangeChange}
        />
        {loading && <span className="pp1-fbar-status">Loading live data…</span>}
        {fetchError && <span className="pp1-fbar-error">{fetchError}</span>}

        <div className="pp1-fbar-target-wrap" ref={targetRef}>
          <button
            type="button"
            className={`pp1-fbar-target-btn ${showTargetPopover ? "pp1-fbar-target-btn--active" : ""}`}
            onClick={handleOpenTargetModal}
          >
            <Target size={14} className="pp1-target-icon" />
            <span>Target Criteria</span>
          </button>

          {showTargetPopover && tempConfig && (
            <div
              className="pp1-target-modal-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowTargetPopover(false);
                }
              }}
            >
              <div className="pp1-target-modal">
                <div className="pp1-target-modal__stripe" />
                <div className="pp1-target-modal__hd">
                  <div className="pp1-target-modal__title-group">
                    <Target size={15} className="pp1-target-modal__icon" />
                    <h3 className="pp1-target-modal__title">Target Criteria</h3>
                  </div>
                  <button
                    type="button"
                    className="pp1-target-modal__close"
                    onClick={() => setShowTargetPopover(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="pp1-target-modal__split">
                  <div className="pp1-target-modal__left">
                    <span className="pp1-target-modal__list-title">Target Modules</span>
                    <div className="pp1-target-modal__cards-list">
                      {[
                        { id: "core_kpis", label: "OEE & Core KPIs", icon: Target },
                        { id: "customer_po", label: "Customer PO vs Sales Value", icon: ClipboardList },
                        { id: "idle_hours", label: "Idle Hours Report", icon: Clock },
                        { id: "idle_hours_non_accepted", label: "Idle Hours Non-Accepted", icon: AlertTriangle },
                        { id: "oee_comparison", label: "OEE Comparison Report", icon: BarChart2 },
                        { id: "rejection", label: "Rejection Report", icon: XOctagon },
                        { id: "rework", label: "Rework Report", icon: RefreshCw },
                      ].map(cat => (
                        <div
                          key={cat.id}
                          className={`pp1-target-modal-card ${activeTargetTab === cat.id ? "pp1-target-modal-card--active" : ""}`}
                          onClick={() => setActiveTargetTab(cat.id)}
                        >
                          <span className="pp1-target-modal-card__ico">
                            {React.createElement(cat.icon, { size: 14 })}
                          </span>
                          <span className="pp1-target-modal-card__txt">{cat.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pp1-target-modal__right">
                    {activeTargetTab === "core_kpis" && (
                      <div className="pp1-target-settings">
                        <h4 className="pp1-target-settings__title">OEE & Core KPIs Targets</h4>
                        <p className="pp1-target-settings__desc">Configure threshold targets for core plant performance parameters.</p>

                        <div className="pp1-target-field">
                          <div className="pp1-target-field__label-row">
                            <span className="pp1-target-field__name">OEE Target</span>
                            <span className="pp1-target-field__val">{tempConfig.oee}%</span>
                          </div>
                          <input
                            type="range" min="50" max="100"
                            value={tempConfig.oee}
                            onChange={(e) => handleTempConfigChange("oee", parseInt(e.target.value))}
                            className="pp1-target-slider"
                          />
                        </div>

                        <div className="pp1-target-field">
                          <div className="pp1-target-field__label-row">
                            <span className="pp1-target-field__name">Availability Target</span>
                            <span className="pp1-target-field__val">{tempConfig.availability}%</span>
                          </div>
                          <input
                            type="range" min="50" max="100"
                            value={tempConfig.availability}
                            onChange={(e) => handleTempConfigChange("availability", parseInt(e.target.value))}
                            className="pp1-target-slider"
                          />
                        </div>

                        <div className="pp1-target-field">
                          <div className="pp1-target-field__label-row">
                            <span className="pp1-target-field__name">Performance Target</span>
                            <span className="pp1-target-field__val">{tempConfig.performance}%</span>
                          </div>
                          <input
                            type="range" min="50" max="100"
                            value={tempConfig.performance}
                            onChange={(e) => handleTempConfigChange("performance", parseInt(e.target.value))}
                            className="pp1-target-slider"
                          />
                        </div>

                        <div className="pp1-target-field">
                          <div className="pp1-target-field__label-row">
                            <span className="pp1-target-field__name">Quality Target</span>
                            <span className="pp1-target-field__val">{tempConfig.quality}%</span>
                          </div>
                          <input
                            type="range" min="50" max="100"
                            value={tempConfig.quality}
                            onChange={(e) => handleTempConfigChange("quality", parseInt(e.target.value))}
                            className="pp1-target-slider"
                          />
                        </div>
                      </div>
                    )}

                    {activeTargetTab === "customer_po" && (
                      <div className="pp1-target-settings">
                        <h4 className="pp1-target-settings__title">Customer PO vs Sales Value Target</h4>
                        <p className="pp1-target-settings__desc">Configure threshold targets for sales value analysis and order fulfillment rates.</p>

                        <div className="pp1-target-field">
                          <div className="pp1-target-field__label-row">
                            <span className="pp1-target-field__name">Sales Value Target (Lakhs)</span>
                          </div>
                          <div className="pp1-target-input-container">
                            <span className="pp1-target-input-prefix">₹</span>
                            <input
                              type="number" step="1" min="1"
                              value={tempConfig.customer_po.salesTarget}
                              onChange={(e) => handleNestedTempConfigChange("customer_po", "salesTarget", parseFloat(e.target.value) || 0)}
                              className="pp1-target-input"
                            />
                            <span className="pp1-target-input-unit">Lakhs</span>
                          </div>
                        </div>


                      </div>
                    )}

                    {activeTargetTab === "idle_hours" && (
                      <div className="pp1-target-settings">
                        <h4 className="pp1-target-settings__title">Idle Hours Target</h4>
                        <p className="pp1-target-settings__desc">Set maximum acceptable idle hour thresholds and target reduction levels for plant operation.</p>

                        <div className="pp1-target-field">
                          <div className="pp1-target-field__label-row">
                            <span className="pp1-target-field__name">Max Allowable Idle Hours</span>
                          </div>
                          <div className="pp1-target-input-container">
                            <input
                              type="number" step="0.5" min="0"
                              value={tempConfig.idle_hours.maxIdleHours}
                              onChange={(e) => handleNestedTempConfigChange("idle_hours", "maxIdleHours", parseFloat(e.target.value) || 0)}
                              className="pp1-target-input"
                            />
                            <span className="pp1-target-input-unit">hrs</span>
                          </div>
                        </div>

                        <div className="pp1-target-field">
                          <div className="pp1-target-field__label-row">
                            <span className="pp1-target-field__name">Idle Hours Reduction Target %</span>
                            <span className="pp1-target-field__val">{tempConfig.idle_hours.reductionTarget}%</span>
                          </div>
                          <input
                            type="range" min="0" max="100"
                            value={tempConfig.idle_hours.reductionTarget}
                            onChange={(e) => handleNestedTempConfigChange("idle_hours", "reductionTarget", parseInt(e.target.value))}
                            className="pp1-target-slider"
                          />
                        </div>
                      </div>
                    )}

                    {activeTargetTab === "idle_hours_non_accepted" && (
                      <div className="pp1-target-settings">
                        <h4 className="pp1-target-settings__title">Idle Hours - Non Accepted Reason Target</h4>
                        <p className="pp1-target-settings__desc">Configure threshold targets for non-accepted idle hours and unplanned loss limit.</p>

                        <div className="pp1-target-field">
                          <div className="pp1-target-field__label-row">
                            <span className="pp1-target-field__name">Max Non-Accepted Target</span>
                          </div>
                          <div className="pp1-target-input-container">
                            <input
                              type="number" step="0.5" min="0"
                              value={tempConfig.idle_hours_non_accepted.maxNonAcceptedHours}
                              onChange={(e) => handleNestedTempConfigChange("idle_hours_non_accepted", "maxNonAcceptedHours", parseFloat(e.target.value) || 0)}
                              className="pp1-target-input"
                            />
                            <span className="pp1-target-input-unit">hrs</span>
                          </div>
                        </div>

                        <div className="pp1-target-field">
                          <div className="pp1-target-field__label-row">
                            <span className="pp1-target-field__name">Unplanned Loss Threshold Limit (%)</span>
                            <span className="pp1-target-field__val">{tempConfig.idle_hours_non_accepted.unplannedLimit}%</span>
                          </div>
                          <input
                            type="range" min="0" max="100"
                            value={tempConfig.idle_hours_non_accepted.unplannedLimit}
                            onChange={(e) => handleNestedTempConfigChange("idle_hours_non_accepted", "unplannedLimit", parseInt(e.target.value))}
                            className="pp1-target-slider"
                          />
                        </div>
                      </div>
                    )}

                    {activeTargetTab === "oee_comparison" && (
                      <div className="pp1-target-settings">
                        <h4 className="pp1-target-settings__title">OEE Comparison Target</h4>
                        <p className="pp1-target-settings__desc">Set the minimum machine utilization targets for comparison.</p>

                        <div className="pp1-target-field">
                          <div className="pp1-target-field__label-row">
                            <span className="pp1-target-field__name">Min Utilization Target (%)</span>
                            <span className="pp1-target-field__val">{tempConfig.oee_comparison.minUtilization}%</span>
                          </div>
                          <input
                            type="range" min="0" max="100"
                            value={tempConfig.oee_comparison.minUtilization}
                            onChange={(e) => handleNestedTempConfigChange("oee_comparison", "minUtilization", parseInt(e.target.value))}
                            className="pp1-target-slider"
                          />
                        </div>
                      </div>
                    )}

                    {activeTargetTab === "rejection" && (
                      <div className="pp1-target-settings">
                        <h4 className="pp1-target-settings__title">Rejection Target</h4>
                        <p className="pp1-target-settings__desc">Set maximum acceptable rejection rate threshold limit.</p>

                        <div className="pp1-target-field">
                          <div className="pp1-target-field__label-row">
                            <span className="pp1-target-field__name">Max Rejection Target</span>
                          </div>
                          <div className="pp1-target-input-container">
                            <input
                              type="number" step="0.1" min="0" max="100"
                              value={tempConfig.rejection.rejectionLimit}
                              onChange={(e) => handleNestedTempConfigChange("rejection", "rejectionLimit", parseFloat(e.target.value) || 0)}
                              className="pp1-target-input"
                            />
                            <span className="pp1-target-input-unit">%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTargetTab === "rework" && (
                      <div className="pp1-target-settings">
                        <h4 className="pp1-target-settings__title">Rework Target</h4>
                        <p className="pp1-target-settings__desc">Set maximum acceptable rework rate threshold limit.</p>

                        <div className="pp1-target-field">
                          <div className="pp1-target-field__label-row">
                            <span className="pp1-target-field__name">Max Rework Target</span>
                          </div>
                          <div className="pp1-target-input-container">
                            <input
                              type="number" step="0.1" min="0" max="100"
                              value={tempConfig.rework.reworkLimit}
                              onChange={(e) => handleNestedTempConfigChange("rework", "reworkLimit", parseFloat(e.target.value) || 0)}
                              className="pp1-target-input"
                            />
                            <span className="pp1-target-input-unit">%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pp1-target-modal__ft">
                  <button
                    type="button"
                    className="pp1-target-modal-btn pp1-target-modal-btn--ghost"
                    onClick={() => setShowTargetPopover(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="pp1-target-modal-btn pp1-target-modal-btn--primary"
                    onClick={applyTargetChanges}
                  >
                    Apply Targets
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pp1-main">
        <div className="pp1-body">
          <section className="pp1-panel pp1-panel--left">
            <div className="pp1-panel__head">
              <div className="pp1-panel__header">
                <ClipboardList size={16} style={{ color: "var(--pp1-blue)", flexShrink: 0 }} />
                <h2 className="pp1-panel__title">Current State</h2>
                {/* <span className="pp1-panel__live">● LIVE</span> */}
              </div>
              <p className="pp1-panel__hint">Click a card to explore details</p>
            </div>
            <div className="pp1-kpi-list">
              {ACTION_CARDS.filter(a => !getCardStatus(a.id).belowTarget).map((a, i) => {
                const active = selAction === a.id;
                return (
                  <div
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    className={`pp1-ac-card pp1-ac-card--left ${active ? "pp1-ac-card--active" : ""}`}
                    style={{
                      "--kc": a.color,
                      "--kl": a.color + "14",
                      "--kh": a.color + "08",
                      "--ko": a.color + "14",
                      "--ka": a.color + "22",
                      "--kb": a.color + "40",
                      "--kib": a.color + "14",
                      "--kia": a.color + "2b",
                      "--kr": a.color + "33",
                      "--ai": i
                    }}
                    onClick={(e) => {
                      const el = e.currentTarget;
                      const rect = el.getBoundingClientRect();
                      const size = Math.max(rect.width, rect.height) * 2;
                      const x = (e.clientX - rect.left) - size / 2;
                      const y = (e.clientY - rect.top) - size / 2;
                      const rip = document.createElement("span");
                      rip.className = "pp1-ripple";
                      rip.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
                      el.appendChild(rip);
                      rip.addEventListener("animationend", () => rip.remove(), { once: true });
                      handleActionClick(a.id);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleActionClick(a.id)}
                  >
                    <div className="pp1-ac-card__shimmer" />
                    <div className="pp1-ac-icon">
                      {typeof a.icon === "string" ? a.icon : React.createElement(a.icon, { size: 16 })}
                    </div>
                    <div className="pp1-ac-body" style={{ flex: 1 }}>
                      <span className="pp1-ac-title">{a.title}</span>
                    </div>
                    {(() => {
                      const ct = computedCardTrends[a.id];
                      return ct ? (
                        <span style={{
                          fontSize: "9.5px",
                          fontWeight: 700,
                          color: ct.type === "up" ? "#10b981" : ct.type === "down" ? "#ef4444" : "#f59e0b",
                          background: ct.type === "up" ? "rgba(16, 185, 129, 0.12)" : ct.type === "down" ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)",
                          padding: "2px 8px",
                          borderRadius: "9999px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          marginRight: "6px",
                          whiteSpace: "nowrap"
                        }}>
                          {ct.type === "up" ? "▲" : ct.type === "down" ? "▼" : "●"} {ct.value}
                        </span>
                      ) : null;
                    })()}
                    <span className="pp1-ac-arrow">{active ? "▼" : "›"}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="pp1-center">
            <div className="pp1-center__glow" />
            <div className="pp1-center__scroll">
              <CenterTransitionWrapper uid={centerKey} loading={loading}>
                {selectionId === "customer_po_vs_sales_analysis" ? (
                  <CustomerPoCompareView
                    data={data}
                    loading={loading}
                    uid={centerKey}
                    filters={poFilters}
                    onFilterChange={setPoFilters}
                    activeSlide={poActiveSlide}
                    onActiveSlideChange={setPoActiveSlide}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setPoShowTargetOnly(false); }}
                    targetConfig={targetConfig}
                    showTargetOnly={poShowTargetOnly}
                    setShowTargetOnly={setPoShowTargetOnly}
                  />
                ) : selectionId === "purchase_report_dashboard" ? (
                  <PurchaseReportDashboardView
                    filters={purFilters}
                    onFilterChange={setPurFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                  />
                ) : selectionId === "sales_analysis_report_dashboard" ? (
                  <SalesAnalysisReportDashboardView
                    filters={salesFilters}
                    onFilterChange={setSalesFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                  />
                ) : selectionId === "production_analysis_report_dashboard" ? (
                  <ProductionAnalysisReportDashboardView
                    filters={prodFilters}
                    onFilterChange={setProdFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                  />
                ) : selectionId === "idle_hours_report_dashboard" ? (
                  <IdleHoursReportDashboardView
                    filters={idleFilters}
                    onFilterChange={setIdleFilters}
                    activeTab={idleActiveTab}
                    onActiveTabChange={setIdleActiveTab}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "idle_hours_non_accepted_reason_production_loss_report" ? (
                  <IdleHoursNonAcceptedReasonLossReportView
                    filters={nonAccFilters}
                    onFilterChange={setNonAccFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "oee_report_dashboard" ? (
                  <OeeReportDashboardView
                    filters={oeeFilters}
                    onFilterChange={setOeeFilters}
                    activeTab={oeeActiveTab}
                    onActiveTabChange={setOeeActiveTab}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "oee_comparison_report_dashboard" ? (
                  <OeeComparisonReportDashboardView
                    filters={oeeCompFilters}
                    onFilterChange={setOeeCompFilters}
                    activeTab={oeeCompActiveTab}
                    onActiveTabChange={setOeeCompActiveTab}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "efficiency_eff_report_dashboard" ? (
                  <EfficiencyEffReportDashboardView
                    filters={effFilters}
                    onFilterChange={setEffFilters}
                    activeTab={effActiveTab}
                    onActiveTabChange={setEffActiveTab}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                  />
                ) : selectionId === "rejection_report_dashboard" ? (
                  <RejectionReportDashboardView
                    filters={rejFilters}
                    onFilterChange={setRejFilters}
                    activeTab={rejActiveTab}
                    onActiveTabChange={setRejActiveTab}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "rework_report_dashboard" ? (
                  <ReworkReportDashboardView
                    filters={rewFilters}
                    onFilterChange={setRewFilters}
                    activeTab={rewActiveTab}
                    onActiveTabChange={setRewActiveTab}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "customer_complaint_report_dashboard" ? (
                  <CustomerComplaintReportDashboardView
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                  />
                ) : selectionId === "machine_capacity_report_dashboard" ? (
                  <MachineCapacityReportDashboardView
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                  />
                ) : (
                  <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                    Select a dashboard from the list to view report details.
                  </div>
                )}
              </CenterTransitionWrapper>
            </div>
          </section>

          <section className="pp1-panel pp1-panel--right">
            <div className="pp1-panel__head">
              <div className="pp1-panel__header">
                <ListTodo size={16} style={{ color: "var(--pp1-amber)", flexShrink: 0 }} />
                <h2 className="pp1-panel__title">Action to be Taken</h2>
              </div>
              <p className="pp1-panel__hint">List of pending actions</p>
            </div>
            <div className="pp1-action-list">
              {actionItems.length === 0 ? (
                <div className="pp1-ac-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "20px", textAlign: "center", color: "var(--pp1-text-4)" }}>
                  <CheckCircle2 size={32} style={{ color: "var(--pp1-green)", marginBottom: "8px" }} />
                  <p style={{ fontSize: "11.5px", margin: 0, fontWeight: 500 }}>No actions pending. All parameters operational.</p>
                </div>
              ) : (
                actionItems.map((item, idx) => {
                  const active = selAction === item.id;
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      className={`pp1-ac-card pp1-ac-card--right ${active ? "pp1-ac-card--active" : ""}`}
                      style={{
                        "--kc": item.color,
                        "--kl": item.color + "14",
                        "--kh": item.color + "08",
                        "--ko": item.color + "14",
                        "--ka": item.color + "22",
                        "--kb": item.color + "40",
                        "--kib": item.color + "14",
                        "--kia": item.color + "2b",
                        "--kr": item.color + "33",
                        "--ai": idx
                      }}
                      onClick={() => handleActionClick(item.id)}
                      onKeyDown={(e) => e.key === "Enter" && handleActionClick(item.id)}
                    >
                      <div className="pp1-ac-card__shimmer" />
                      <div className="pp1-ac-icon" style={{ color: "#ef4444", background: "rgba(239, 68, 68, 0.08)" }}>
                        <AlertTriangle size={15} />
                      </div>
                      <div className="pp1-ac-body" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span className="pp1-ac-title" style={{ fontWeight: 700, fontSize: "11.5px", color: "var(--pp1-navy)" }}>{item.title}</span>
                        <span style={{ fontSize: "10px", color: "var(--pp1-text-3)", lineHeight: "1.3" }}>
                          {item.message}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", marginLeft: "6px", flexShrink: 0 }}>
                        {item.trend && (
                          <span style={{
                            fontSize: "9.5px",
                            fontWeight: 700,
                            color: item.trend.type === "up" ? "#10b981" : item.trend.type === "down" ? "#ef4444" : "#f59e0b",
                            background: item.trend.type === "up" ? "rgba(16, 185, 129, 0.12)" : item.trend.type === "down" ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)",
                            padding: "2px 8px",
                            borderRadius: "9999px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            whiteSpace: "nowrap"
                          }}>
                            {item.trend.type === "up" ? "▲" : item.trend.type === "down" ? "▼" : "●"} {item.trend.value}
                          </span>
                        )}
                        <span style={{
                          fontSize: "8.5px",
                          fontWeight: 800,
                          color: item.priority === "high" ? "#ef4444" : "#f59e0b",
                          background: item.priority === "high" ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                          letterSpacing: "0.2px"
                        }}>
                          {item.priority}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="pp1-summary-row">
              {[
                { label: "High", n: actionSummary.high, cls: "red" },
                { label: "Medium", n: actionSummary.medium, cls: "amber" },
                { label: "Low", n: actionSummary.low, cls: "green" },
              ].map((c) => (
                <div key={c.label} className={`pp1-sum-chip pp1-sum-chip--${c.cls}`}>
                  <strong>{c.n}</strong> {c.label}
                </div>
              ))}
            </div>
          </section>
        </div>

        {selectionId === "customer_po_vs_sales_analysis" ? (
          <CustomerPoCompareBottomTable
            data={data}
            loading={loading}
            uid={`bot-pocomp-${centerKey}`}
            filters={poFilters}
            activeSlide={poActiveSlide}
            onActiveSlideChange={setPoActiveSlide}
            showTargetOnly={poShowTargetOnly}
            targetConfig={targetConfig}
          />
        ) : selectionId === "purchase_report_dashboard" ? (
          <PurchaseReportBottomTable filters={purFilters} />
        ) : selectionId === "sales_analysis_report_dashboard" ? (
          <SalesAnalysisReportBottomTable filters={salesFilters} />
        ) : selectionId === "production_analysis_report_dashboard" ? (
          <ProductionAnalysisReportBottomTable filters={prodFilters} />
        ) : selectionId === "idle_hours_report_dashboard" ? (
          <IdleHoursReportBottomTable
            filters={idleFilters}
            activeTab={idleActiveTab}
            setActiveTab={setIdleActiveTab}
          />
        ) : selectionId === "idle_hours_non_accepted_reason_production_loss_report" ? (
          <IdleHoursNonAcceptedReasonLossReportBottomTable filters={nonAccFilters} />
        ) : selectionId === "oee_report_dashboard" ? (
          <OeeReportBottomTable filters={oeeFilters} activeTab={oeeActiveTab} setActiveTab={setOeeActiveTab} />
        ) : selectionId === "oee_comparison_report_dashboard" ? (
          <OeeComparisonReportBottomTable filters={oeeCompFilters} activeTab={oeeCompActiveTab} setActiveTab={setOeeCompActiveTab} />
        ) : selectionId === "efficiency_eff_report_dashboard" ? (
          <EfficiencyEffReportBottomTable filters={effFilters} activeTab={effActiveTab} setActiveTab={setEffActiveTab} />
        ) : selectionId === "rejection_report_dashboard" ? (
          <RejectionReportBottomTable filters={rejFilters} activeTab={rejActiveTab} setActiveTab={setRejActiveTab} />
        ) : selectionId === "rework_report_dashboard" ? (
          <ReworkReportBottomTable filters={rewFilters} activeTab={rewActiveTab} setActiveTab={setRewActiveTab} />
        ) : selectionId === "customer_complaint_report_dashboard" ? (
          <CustomerComplaintReportBottomTable />
        ) : selectionId === "machine_capacity_report_dashboard" ? (
          <MachineCapacityReportBottomTable />
        ) : null}
      </div>

      {toast && (
        <div className="pp1-toast">
          <div className="pp1-toast__icon">
            <CheckCircle2 size={16} />
          </div>
          <div className="pp1-toast__body">
            <span className="pp1-toast__title">{toast.title}</span>
            <span className="pp1-toast__msg">{toast.msg}</span>
          </div>
          <button
            type="button"
            className="pp1-toast__close"
            onClick={() => setToast(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
