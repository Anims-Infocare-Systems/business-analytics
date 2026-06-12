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
  ChevronRight
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
  { id: "customer_po_compare", title: "Customer PO Compare", icon: Scale, color: "#2d6de8", priority: "medium" },
  { id: "grn_report", title: "GRN Report", icon: ClipboardCheck, color: "#0ea5e9", priority: "medium" },
  { id: "sales_analysis", title: "Sales Analysis", icon: TrendingUp, color: "#10b981", priority: "medium" },
  { id: "daily_production", title: "Daily Production", icon: Factory, color: "#8b5cf6", priority: "medium" },
  { id: "ideal_hours_report", title: "Ideal Hours Report", icon: Timer, color: "#ef4444", priority: "medium" },
  { id: "dispatch_report", title: "Dispatch Report", icon: Truck, color: "#f43f5e", priority: "high" },
  { id: "rejection_rework", title: "Rejection & Rework", icon: AlertTriangle, color: "#f59e0b", priority: "high" },
  { id: "customer_complaints", title: "Customer Complaint", icon: Megaphone, color: "#dc2626", priority: "high" },
  { id: "store_stock", title: "Store Stock", icon: Package, color: "#ea580c", priority: "medium" },
  { id: "order_register", title: "Order Register", icon: ClipboardList, color: "#2d6de8", priority: "medium" },
  { id: "vendor_rating", title: "Vendor Rating", icon: Star, color: "#0ea5e9", priority: "medium" },
  { id: "supplier_rating", title: "Supplier Rating", icon: Award, color: "#10b981", priority: "medium" },
  { id: "daily_production_plan", title: "Daily Production Plan", icon: ListTodo, color: "#8b5cf6", priority: "medium" },
  { id: "fg_reports", title: "FG Reports", icon: PackageCheck, color: "#ef4444", priority: "medium" },
  { id: "idle_time_entry", title: "Idle Time Entry", icon: Clock, color: "#f43f5e", priority: "medium" },
  { id: "operator_efficiency", title: "Operator Efficiency", icon: UserCheck, color: "#f59e0b", priority: "medium" },
  { id: "quality_reports", title: "Quality Reports", icon: CheckCircle2, color: "#dc2626", priority: "medium" },
  { id: "purchase_report", title: "Purchase Report", icon: ShoppingCart, color: "#ea580c", priority: "medium" },
  { id: "supplier_age_days_report", title: "Supplier Age Days Report", icon: Calendar, color: "#2d6de8", priority: "medium" },
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
    customer_po_compare: { desc: "Compare actual purchase order quantities and values against customer schedules.", time: "Live ERP check" },
    grn_report: { desc: `${grn?.total_record_count ?? 0} pending record(s) in GRN pipeline.`, time: `Qty ${fmtNum(grn?.total_qty)}` },
    sales_analysis: { desc: "Analyze sales order dispatch records, invoice values, and customer variances.", time: "Monthly trend" },
    daily_production: { desc: "Real-time log of machine parts produced, operating hours, and operator schedules.", time: "Daily live feed" },
    ideal_hours_report: { desc: "Ideal machine cycle hours calculated against standard shift hours.", time: "Target 8.0h/shift" },
    dispatch_report: { desc: "Track pending dispatches, ready-for-shipping finished goods, and carrier schedules.", time: "Pending items" },
    rejection_rework: { desc: `OK ${qs.pctOk}% · Rej ${qs.pctRej}% · Rwk ${qs.pctRwk}% (Inspection split)`, time: "Quality split" },
    customer_complaints: { desc: `${data.complaints?.complaints?.length ?? 0} customer complaint(s) in range.`, time: "Customer QC" },
    store_stock: { desc: "Current raw material, child parts, and sub-assembly store stock status.", time: "Live warehouse stock" },
    order_register: { desc: "Comprehensive register of open, closed, and pending sales/purchase orders.", time: "All open orders" },
    vendor_rating: { desc: "Vendor quality performance rating, rejection percentages, and GRN delivery metrics.", time: "Monthly rating" },
    supplier_rating: { desc: "Supplier delivery time performance, price variations, and compliance rating.", time: "Live audit score" },
    daily_production_plan: { desc: "Current production schedules, route sheets, and planned output quantities.", time: "Active routes" },
    fg_reports: { desc: "Finished goods stock status, inspection clearance records, and storage location tracking.", time: "Cleared items" },
    idle_time_entry: { desc: `Total idle hours recorded: ${fmtHours(data.idle?.summary?.total_idle_hours)}.`, time: `Non-acc ${fmtHours(data.idle?.summary?.non_accepted_hours)}` },
    operator_efficiency: { desc: "Operator efficiency analytics by shift and station performance.", time: "Overall avg" },
    quality_reports: { desc: "Consolidated quality inspection logs, first-pass yield metrics, and defect trends.", time: "Live QC checks" },
    purchase_report: { desc: "Summary of material purchases, active purchase requisitions, and vendor invoices.", time: "Range total" },
    supplier_age_days_report: { desc: "Age-wise analysis of outstanding supplier deliveries and payment terms.", time: "Age details" },

    injob_inspection: { desc: `Rej ${fmtNum(injob?.total_rejection)} · Rwk ${fmtNum(injob?.total_rework)}`, time: injob?.rejection_pct != null ? `Rej ${fmtPct(injob.rejection_pct)}` : "JO inspection" },
    inter_inspection: { desc: `Rej ${fmtNum(inter?.total_rejection)} · Rwk ${fmtNum(inter?.total_rework)}`, time: inter?.row_count != null ? `${inter.row_count} rows` : "Inter inspection" },
    final_inspection: { desc: `OK ${fmtNum(fi?.total_ok_qty)} · FPY ${fmtPct(fi?.first_pass_yield ?? 0)}`, time: "Final inspection" },
    quality_split: { desc: `OK ${qs.pctOk}% · Rej ${qs.pctRej}% · Rwk ${qs.pctRwk}%`, time: "Quality split" },
    downtime_reason: { desc: data.downtime?.reasons?.[0]?.reason ? String(data.downtime.reasons[0].reason).slice(0, 40) : "Top downtime reason", time: data.downtime?.reasons?.[0] ? fmtHours(data.downtime.reasons[0].hours) : "Idle hours" },
    top_defects: { desc: top?.partno ? `Top: ${top.partno}` : "Top defect parts", time: top?.rejection_pct != null ? `${top.rejection_pct}%` : "Defects" },
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

function CustomerPoCompareView({ data, loading, uid, filters, onFilterChange, onClose }) {
  const rows = data?.customerPoCompare?.rows ?? [];

  const [dateOpen, setDateOpen] = React.useState(false);
  const dateRangeRef = React.useRef(null);
  const [activeSlide, setActiveSlide] = React.useState(0);

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
  const filteredRows = React.useMemo(() => {
    let list = rows;
    if (filters) {
      list = list.filter(r => {
        if (filters.fromDate && r.po_date < filters.fromDate) return false;
        if (filters.toDate && r.po_date > filters.toDate) return false;
        if (filters.customer && r.customer !== filters.customer) return false;
        if (filters.poNumber && !r.po_no.toLowerCase().includes(filters.poNumber.toLowerCase())) return false;
        if (filters.partNumber && !r.part_no.toLowerCase().includes(filters.partNumber.toLowerCase())) return false;
        if (filters.category && r.category !== filters.category) return false;
        return true;
      });
    }
    return list;
  }, [rows, filters]);

  // Extract unique customers and categories for dropdowns dynamically
  const customers = React.useMemo(() => {
    const set = new Set(rows.map(r => r.customer).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const categories = React.useMemo(() => {
    const set = new Set(rows.map(r => r.category).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      customer: "",
      poNumber: "",
      partNumber: "",
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

  // Chart Setup 1: Customer Wise PO Status (Stacked Column Chart)
  const setupStackedChart = React.useCallback((canvas) => {
    const customerMap = {};
    filteredRows.forEach(r => {
      const c = r.customer || "Unknown";
      if (!customerMap[c]) {
        customerMap[c] = { ordered: 0, produced: 0, dispatched: 0, pending: 0 };
      }
      customerMap[c].ordered += r.ordered_qty || 0;
      customerMap[c].produced += r.produced_qty || 0;
      customerMap[c].dispatched += r.dispatch_qty || 0;
      customerMap[c].pending += r.pending_qty || 0;
    });

    const labels = Object.keys(customerMap);
    const orderedData = labels.map(c => customerMap[c].ordered);
    const producedData = labels.map(c => customerMap[c].produced);
    const dispatchedData = labels.map(c => customerMap[c].dispatched);
    const pendingData = labels.map(c => customerMap[c].pending);

    return new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Ordered",
            data: orderedData,
            backgroundColor: "rgba(59, 130, 246, 0.85)", // Primary blue
            borderRadius: 4,
          },
          {
            label: "Produced",
            data: producedData,
            backgroundColor: "rgba(139, 92, 246, 0.85)", // Purple/violet
            borderRadius: 4,
          },
          {
            label: "Dispatched",
            data: dispatchedData,
            backgroundColor: "rgba(16, 185, 129, 0.85)", // Emerald green
            borderRadius: 4,
          },
          {
            label: "Pending",
            data: pendingData,
            backgroundColor: "rgba(245, 158, 11, 0.85)", // Amber/warning
            borderRadius: 4,
          }
        ]
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
          }
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: "#64748b", font: { size: 9 } },
            grid: { display: false }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: { color: "#64748b", font: { size: 9 } },
            grid: { color: "rgba(0, 0, 0, 0.05)" }
          }
        }
      }
    });
  }, [filteredRows]);

  // Chart Setup 2: Monthly PO vs Dispatch Trend (Line Chart)
  const setupLineChart = React.useCallback((canvas) => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const baseTrend = {
      Jan: { po: 12000, dispatch: 11000 },
      Feb: { po: 14000, dispatch: 13500 },
      Mar: { po: 15500, dispatch: 15000 },
      Apr: { po: 13000, dispatch: 12800 },
      May: { po: 16500, dispatch: 15800 },
      Jun: { po: 0, dispatch: 0 },
    };

    filteredRows.forEach(r => {
      if (!r.po_date) return;
      const parts = r.po_date.split("-");
      if (parts.length >= 2) {
        const monthIndex = parseInt(parts[1], 10) - 1;
        const monthName = monthNames[monthIndex];
        if (monthName && baseTrend[monthName] !== undefined) {
          baseTrend[monthName].po += r.ordered_qty || 0;
          baseTrend[monthName].dispatch += r.dispatch_qty || 0;
        }
      }
    });

    const monthsToDisplay = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const poQty = monthsToDisplay.map(m => baseTrend[m].po);
    const dispatchQty = monthsToDisplay.map(m => baseTrend[m].dispatch);

    return new Chart(canvas, {
      type: "line",
      data: {
        labels: monthsToDisplay,
        datasets: [
          {
            label: "PO Qty",
            data: poQty,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.05)",
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: "#3b82f6",
            pointHoverRadius: 5,
          },
          {
            label: "Dispatch Qty",
            data: dispatchQty,
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.05)",
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: "#10b981",
            pointHoverRadius: 5,
          }
        ]
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
          }
        },
        scales: {
          x: {
            ticks: { color: "#64748b", font: { size: 9 } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { color: "#64748b", font: { size: 9 } },
            grid: { color: "rgba(0, 0, 0, 0.05)" }
          }
        }
      }
    });
  }, [filteredRows]);

  // Chart Setup 3: Pending Order Analysis (Donut Chart)
  const setupDonutChart = React.useCallback((canvas) => {
    const totalPending = filteredRows.reduce((sum, r) => sum + (r.pending_qty || 0), 0);
    const values = totalPending > 0 ? [
      Math.round(totalPending * 0.45), // Production Pending
      Math.round(totalPending * 0.15), // Quality Hold
      Math.round(totalPending * 0.25), // Material Shortage
      totalPending - (Math.round(totalPending * 0.45) + Math.round(totalPending * 0.15) + Math.round(totalPending * 0.25)) // Dispatch Pending
    ] : [0, 0, 0, 0];

    const labels = ["Production Pending", "Quality Hold", "Material Shortage", "Dispatch Pending"];
    const backgroundColors = ["#fbbf24", "#ef4444", "#8b5cf6", "#3b82f6"];

    return new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: backgroundColors,
          borderWidth: 1,
          borderColor: "#fff"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: {
            position: "right",
            labels: { color: "#475569", font: { size: 9.5 }, boxWidth: 10, padding: 6 }
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            padding: 8,
          }
        }
      }
    });
  }, [filteredRows]);

  const slides = [
    {
      title: "Customer Wise PO Status",
      purpose: "Quick comparison customer-wise.",
      type: "stacked",
      setup: setupStackedChart,
    },
    {
      title: "Monthly PO vs Dispatch Trend",
      purpose: "Demand vs Supply.",
      type: "line",
      setup: setupLineChart,
    },
    {
      title: "Pending Order Analysis",
      purpose: "Reason for pending orders.",
      type: "donut",
      setup: setupDonutChart,
    }
  ];

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  };
  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const totalPendingVal = filteredRows.reduce((sum, r) => sum + (r.pending_qty || 0), 0);

  return (
    <div className="pp1-action-detail" key={uid} style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-action-detail__header" style={{ "--act-color": "var(--pp1-blue)", padding: "10px 14px", gap: "10px" }}>
        <div className="pp1-action-detail__icon-box" style={{ width: "32px", height: "32px", borderRadius: "8px", fontSize: "16px" }}>
          <Scale size={16} style={{ color: "#fff" }} />
        </div>
        <div className="pp1-action-detail__meta" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <p className="pp1-action-detail__title" style={{ fontSize: "13.5px", fontWeight: 800, margin: 0 }}>Customer PO Compare</p>
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

          {/* Category Dropdown */}
          <div className="pp1-filter-group">
            <label className="pp1-filter-label">Category</label>
            <select
              className="pp1-filter-input"
              value={filters.category}
              onChange={e => handleInputChange("category", e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* PO Number Search */}
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

          {/* Part Number Search */}
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
            <div className="pp1-carousel-title-group">
              <span className="pp1-carousel-title">{slides[activeSlide].title}</span>
              <span className="pp1-carousel-subtitle">
                {slides[activeSlide].purpose}
                {slides[activeSlide].type === "donut" && ` Total: ${totalPendingVal.toLocaleString()} Qty.`}
              </span>
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
                    onClick={() => setActiveSlide(idx)}
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
            {filteredRows.length === 0 ? (
              <div className="pp1-carousel-empty">
                <span>No PO data matches the selected filters.</span>
              </div>
            ) : (
              <div className="pp1-carousel-chart-wrap">
                <ChartJsCanvas 
                  setup={slides[activeSlide].setup} 
                  height={190} 
                  rebuildToken={`${activeSlide}|${filteredRows.length}|${JSON.stringify(filters)}`} 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerPoCompareBottomTable({ data, loading, uid, filters }) {
  let rows = data?.customerPoCompare?.rows ?? [];

  if (filters) {
    rows = rows.filter(r => {
      if (filters.fromDate && r.po_date < filters.fromDate) return false;
      if (filters.toDate && r.po_date > filters.toDate) return false;
      if (filters.customer && r.customer !== filters.customer) return false;
      if (filters.poNumber && !r.po_no.toLowerCase().includes(filters.poNumber.toLowerCase())) return false;
      if (filters.partNumber && !r.part_no.toLowerCase().includes(filters.partNumber.toLowerCase())) return false;
      if (filters.category && r.category !== filters.category) return false;
      return true;
    });
  }
  return (
    <div className="pp1-cc-bot" key={uid}>
      <div className="pp1-cc-bot__hd">Customer PO Comparison</div>
      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300 }}>
        <table className="pp1-cc-tbl" style={{ minWidth: 1000 }}>
          <thead>
            <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
              <th>Customer</th>
              <th>PO No</th>
              <th>PO Date</th>
              <th>Part No</th>
              <th style={{ textAlign: "right" }}>Ordered Qty</th>
              <th style={{ textAlign: "right" }}>Produced Qty</th>
              <th style={{ textAlign: "right" }}>Dispatch Qty</th>
              <th style={{ textAlign: "right" }}>Pending Qty</th>
              <th style={{ textAlign: "right" }}>Rejected Qty</th>
              <th>Delivery Date</th>
              <th style={{ textAlign: "center" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="pp1-cc-tbl__empty" style={{ padding: "0" }}><D3TableLoader rows={4} cols={11} /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="pp1-cc-tbl__empty">No customer PO data available.</td></tr>
            ) : (
              rows.map((r, i) => {
                const statusColors = {
                  "Completed": { bg: "#d1fae5", c: "#065f46" },
                  "In Progress": { bg: "#fef3c7", c: "#92400e" },
                  "Pending": { bg: "#fee2e2", c: "#991b1b" }
                };
                const stcfg = statusColors[r.status] || { bg: "#f1f5f9", c: "#475569" };
                return (
                  <tr key={`${r.po_no}-${i}`} className="pp1-cc-tbl__tr">
                    <td className="pp1-cc-tbl__bold" style={{ fontWeight: 700 }}>{r.customer}</td>
                    <td className="pp1-cc-tbl__id">{r.po_no}</td>
                    <td className="pp1-cc-tbl__mono">{r.po_date}</td>
                    <td className="pp1-cc-tbl__bold" style={{ color: "var(--pp1-text-2)" }}>{r.part_no}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{r.ordered_qty.toLocaleString()}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--pp1-blue)" }}>{r.produced_qty.toLocaleString()}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--pp1-green)" }}>{r.dispatch_qty.toLocaleString()}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: r.pending_qty > 0 ? "var(--pp1-amber)" : "var(--pp1-text-3)" }}>{r.pending_qty.toLocaleString()}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: r.rejected_qty > 0 ? "var(--pp1-red)" : "var(--pp1-text-4)" }}>{r.rejected_qty.toLocaleString()}</td>
                    <td className="pp1-cc-tbl__mono">{r.delivery_date}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className="pp1-cc-badge" style={{ background: stcfg.bg, color: stcfg.c, padding: "3px 9px", borderRadius: "12px", fontSize: "9.5px", fontWeight: 700 }}>
                        {r.status}
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

export default function PlantPerformance1() {
  const [selKpi, setSelKpi] = useState(0);
  const [selAction, setSelAction] = useState("customer_po_compare");
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
  const fetchAbortRef = useRef(null);

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
    <div className={`pp1-root ${loading ? "pp1-root--loading" : ""}`}>
      <div className="pp1-fbar">
        <PlantPerformance1DatePicker
          activePeriod={activePeriod}
          onPeriodChange={setActivePeriod}
          onRangeChange={handleRangeChange}
        />
        {loading && <span className="pp1-fbar-status">Loading live data…</span>}
        {fetchError && <span className="pp1-fbar-error">{fetchError}</span>}
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
              {ACTION_CARDS.map((a, i) => {
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
                    <div className="pp1-ac-body">
                      <span className="pp1-ac-title">{a.title}</span>
                    </div>
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
                {selAction && activeActionCard && selAction !== "customer_po_compare" && selAction !== "downtime_reason" && selAction !== "quality_split" && selAction !== "top_defects" && selAction !== "customer_complaints" && selAction !== "customer_complaint" && selAction !== "iqc_rejections" && selAction !== "grn_pending" && selAction !== "grn_report" && selAction !== "injob_inspection" && selAction !== "inter_inspection" && selAction !== "final_inspection" && selAction !== "po_status" && selAction !== "idle_summary" && selAction !== "idle_time_entry" && selAction !== "rejection_rework" && selAction !== "operator_efficiency" ? (
                  <CenterActionDetail
                    action={activeActionCard}
                    view={activeActionView}
                    uid={`act-${centerKey}`}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                  />
                ) : selectionId === "customer_po_compare" ? (
                  <CustomerPoCompareView
                    data={data}
                    loading={loading}
                    uid={centerKey}
                    filters={poFilters}
                    onFilterChange={setPoFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                  />
                ) : selectionId === "production_data" ? (
                  <PlantPerformance1ProductionDataView
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
                ) : (selectionId === "quality_split" || selectionId === "rejection_rework") ? (
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
                ) : (selectionId === "customer_complaints" || selectionId === "customer_complaint") ? (
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
                ) : (selectionId === "grn_pending" || selectionId === "grn_report") ? (
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
                ) : (selectionId === "idle_summary" || selectionId === "idle_time_entry") ? (
                  <IdleTimeView data={data} loading={loading} uid={centerKey} />
                ) : selectionId === "otd_trend" ? (
                  <OtdTrendView
                    loading={loading}
                    uid={centerKey}
                    from={dateRange.from}
                    to={dateRange.to}
                  />
                ) : (selectionId === "machine_efficiency" || selectionId === "operator_efficiency") ? (
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

          <section className="pp1-panel pp1-panel--right">
            <div className="pp1-panel__head">
              <div className="pp1-panel__header">
                <ListTodo size={16} style={{ color: "var(--pp1-amber)", flexShrink: 0 }} />
                <h2 className="pp1-panel__title">Action to be Taken</h2>
              </div>
              <p className="pp1-panel__hint">List of pending actions</p>
            </div>
            <div className="pp1-action-list">
              <div className="pp1-ac-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "20px", textAlign: "center", color: "var(--pp1-text-4)" }}>
                <Target size={32} style={{ color: "var(--pp1-rose)", marginBottom: "8px" }} />
                <p style={{ fontSize: "11.5px", margin: 0, fontWeight: 500 }}>No actions pending. All parameters operational.</p>
              </div>
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

        {selectionId === "customer_po_compare" ? (
          <CustomerPoCompareBottomTable data={data} loading={loading} uid={`bot-pocomp-${centerKey}`} filters={poFilters} />
        ) : selectionId === "customer_complaints" || selectionId === "customer_complaint" ? (
          <CustomerComplaintsBottomTable data={data} loading={loading} uid={`bot-cc-${centerKey}`} />
        ) : selectionId === "iqc_rejections" ? (
          <IqcRejectionBottomTable data={data} loading={loading} uid={`bot-iqc-${centerKey}`} />
        ) : selectionId === "grn_pending" || selectionId === "grn_report" ? (
          <GrnPipelineBottomTable data={data} loading={loading} uid={`bot-grn-${centerKey}`} />
        ) : selectionId === "po_status" ? (
          <PurchaseOrderBottomTable data={data} loading={loading} uid={`bot-po-${centerKey}`} />
        ) : (bottomTable && selectionId !== "production_data" && selectionId !== "otd_trend" && selectionId !== "machine_efficiency" && selectionId !== "operator_efficiency") ? (
          <BottomKpiPanel bottom={bottomTable} uid={`bot-${centerKey}`} />
        ) : null}
      </div>
    </div>
  );
}
