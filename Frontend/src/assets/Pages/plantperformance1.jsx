/**
 * Dashboard3 — Plant Performance
 * 3-column UI: Current State (10) | Center detail | Action (9)
 * Live metrics from Dashboard2 APIs · fixed-height columns with inner scroll
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
  ChevronDown,
  BarChart2,
  XOctagon,
  RefreshCw,
  IndianRupee,
  Users,
  Zap,
  Trophy,
  Smile,
  AlertCircle,
  Info,
  Hourglass,
  Cpu,
  Coins,
  Activity,
  HelpCircle,
  ShieldAlert,
  LineChart as LucideLineChart,
  AreaChart,
  Radar,
  PieChart,
  PanelLeftClose,
  PanelRightClose
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
      { customer: "Tata Motors", month: "Jun-26", date: "2026-06-01", orderValue: 50.0, salesValue: 45.0, pendingValue: 5.0, poNumber: "PO-2026-8801", partNumber: "BRK-PAD-M1" },
      { customer: "Mahindra & Mahindra", month: "Jun-26", date: "2026-06-03", orderValue: 30.0, salesValue: 30.0, pendingValue: 0.0, poNumber: "PO-2026-9042", partNumber: "ROT-DSC-X4" },
      { customer: "Maruti Suzuki", month: "Jun-26", date: "2026-06-05", orderValue: 15.0, salesValue: 10.0, pendingValue: 5.0, poNumber: "PO-2026-7719", partNumber: "GBX-HNG-S2" },
      { customer: "Hyundai India", month: "Jun-26", date: "2026-06-08", orderValue: 25.0, salesValue: 0.0, pendingValue: 25.0, poNumber: "PO-2026-6652", partNumber: "ENG-MNT-H1" },
      { customer: "Ashok Leyland", month: "Jun-26", date: "2026-06-10", orderValue: 8.0, salesValue: 7.5, pendingValue: 0.5, poNumber: "PO-2026-4401", partNumber: "TRK-AXL-L9" }
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
  { id: "customer_po_vs_sales_analysis", title: "Customer PO vs Sales Value", icon: Scale, color: "#2d6de8", priority: "medium", trend: { value: "+5.8% Up", type: "up" } },
  { id: "purchase_report_dashboard", title: "GRN Value", icon: ShoppingCart, color: "#ea580c", priority: "medium" },
  { id: "purchase_value_report_dashboard", title: "Purchase Value", icon: ShoppingCart, color: "#ea580c", priority: "medium" },
  { id: "sales_analysis_report_dashboard", title: "Sales Analysis", icon: TrendingUp, color: "#10b981", priority: "medium" },
  { id: "production_analysis_report_dashboard", title: "Production Value Vs Actual Value", icon: Factory, color: "#8b5cf6", priority: "medium" },
  { id: "idle_hours_report_dashboard", title: "Idle Hours", icon: Timer, color: "#ef4444", priority: "medium", trend: { value: "-3.2% Down", type: "down" } },
  { id: "oee_comparison_report_dashboard", title: "OEE", icon: TrendingUp, color: "#0ea5e9", priority: "medium", trend: { value: "+0.5% Up", type: "up" } },
  { id: "efficiency_eff_report_dashboard", title: "Efficiency (EFF)", icon: UserCheck, color: "#10b981", priority: "medium" },
  { id: "rejection_report_dashboard", title: "Rejection", icon: AlertTriangle, color: "#f59e0b", priority: "high", trend: { value: "-8.4% Down", type: "down" } },
  { id: "rework_report_dashboard", title: "Rework", icon: PackageCheck, color: "#a855f7", priority: "high", trend: { value: "0.0% Avg", type: "average" } },
  { id: "customer_complaint_report_dashboard", title: "Customer Complaint", icon: Megaphone, color: "#dc2626", priority: "high" },
  { id: "store_stock_value_report_dashboard", title: "Store Stock Value", icon: Coins, color: "#059669", priority: "medium" },
  { id: "otd_report_dashboard", title: "OTD", icon: Clock, color: "#7c3aed", priority: "medium" },
  { id: "supplier_rating_report_dashboard", title: "Supplier Rating", icon: Star, color: "#eab308", priority: "medium" },
  { id: "vendor_rating_report_dashboard", title: "Vendor Rating", icon: Award, color: "#3b82f6", priority: "medium" },
  { id: "fg_value_report_dashboard", title: "FG Value", icon: Package, color: "#ec4899", priority: "medium" },
  { id: "daily_production_report_dashboard", title: "Daily Production", icon: Activity, color: "#0f766e", priority: "medium" },
  { id: "target_vs_actual_report_dashboard", title: "Target Vs Actual", icon: Target, color: "#6366f1", priority: "medium" },
  { id: "operator_efficiency_report_dashboard", title: "Operator Efficiency", icon: Users, color: "#8b5cf6", priority: "medium" },
  { id: "capa_report_dashboard", title: "Quality Action Plan (CAPA)", icon: ClipboardCheck, color: "#0891b2", priority: "medium" }
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
    oee_comparison_report_dashboard: { desc: "Compare availability, performance, quality, and OEE parameters across machines and shifts.", time: "Machine benchmark" },
    efficiency_eff_report_dashboard: { desc: "Performance and operator efficiency report based on actual run cycle time vs standards.", time: "Performance grade" },
    rejection_report_dashboard: { desc: "Track rejections, scrap counts, and defect distribution across production lines.", time: "Quality statistics" },
    rework_report_dashboard: { desc: "Track rework cycles, recovery loops, and part repair metrics across production lines.", time: "Quality statistics" },
    customer_complaint_report_dashboard: { desc: "Customer complaints log, resolution status, corrective actions, and permanent preventions.", time: "Customer QC audits" },
    otd_report_dashboard: { desc: "Track on-time delivery percentages, actual versus target delivery quantities, and delayed lines.", time: "Real-time dispatch data" }
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
          chip("Output", fmtNum(kpis.production_output), "units", Package, "#0ea5e9"),
        ];
        insights = [{ type: "info", text: "Production output totals for selected date range." }];
        break;
      case "final_inspection_ok":
        kpisStrip = [
          chip("OK Qty", fmtNum(fi?.total_ok_qty), "", CheckCircle2, "#10b981"),
        ];
        break;
      case "rejection_qty":
      case "rework_qty":
        kpisStrip = [
          chip("Output", fmtNum(kpis.production_output), "units", Package, "#0ea5e9"),
          chip("Rejection", fmtNum(kpis.rejection_qty), "qty", XOctagon, "#ef4444"),
          chip("Rework", fmtNum(kpis.rework_grand_total), "qty", RefreshCw, "#f59e0b"),
          chip("OAEFF", (kpis.oa_efficiency ?? 0).toFixed(2), "%", TrendingUp, "#1a56db"),
        ];
        break;
      case "oee_efficiency":
        kpisStrip = [
          chip("OA Efficiency", (kpis.oa_efficiency ?? 0).toFixed(2), "%", TrendingUp, "#1a56db"),
        ];
        break;
      case "machine_efficiency":
        kpisStrip = [
          chip("OTD %", fmtPct(otd?.kpis?.on_time_delivery_pct), "", Calendar, "#8b5cf6"),
          chip("On-time qty", fmtNum(otd?.kpis?.on_time_qty), "", CheckCircle2, "#10b981"),
          chip("Total del.", fmtNum(otd?.kpis?.total_del_qty), "", Truck, "#2d6de8"),
          chip("Delayed", fmtNum(otd?.kpis?.delayed_lines), "lines", AlertTriangle, "#ef4444"),
        ];
        break;
      case "idle_summary":
        kpisStrip = [
          chip("Accepted", fmtHours(idle?.accepted_hours), "", CheckCircle2, "#10b981"),
          chip("Non-accepted", fmtHours(idle?.non_accepted_hours), "", AlertCircle, "#ef4444"),
          chip("Total", fmtHours(idle?.total_idle_hours), "", Timer, "#0ea5e9"),
          chip("Other", fmtHours(idle?.other_hours), "", Info, "#94a3b8"),
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
          chip("Total POs", fmtNum(po?.summary?.total_pos), "", ShoppingCart, "#f97316"),
          chip("Approved", fmtNum(po?.summary?.approved), "", CheckCircle2, "#10b981"),
          chip("GRN pending", fmtNum(po?.summary?.grn_pending), "", Hourglass, "#f59e0b"),
          chip("PO value", fmtNum(po?.summary?.total_po_value), "", IndianRupee, "#2d6de8"),
        ];
        break;
      default:
        break;
    }
  } else {
    switch (cardId) {
      case "injob_inspection":
        kpisStrip = [
          chip("Rejection", fmtNum(data.injob?.total_rejection), "pcs", XOctagon, "#ef4444"),
          chip("Rework", fmtNum(data.injob?.total_rework), "pcs", RefreshCw, "#f59e0b"),
          chip("Rej %", data.injob?.rejection_pct != null ? fmtPct(data.injob.rejection_pct) : "—", "", BarChart2, "#2d6de8"),
          chip("Basis qty", fmtNum(data.injob?.total_qty_basis), "", Package, "#64748b"),
        ];
        break;
      case "inter_inspection":
        kpisStrip = [
          chip("Rejection", fmtNum(data.inter?.total_rejection), "pcs", XOctagon, "#ef4444"),
          chip("Rework", fmtNum(data.inter?.total_rework), "pcs", RefreshCw, "#f59e0b"),
          chip("Rej %", data.inter?.rejection_pct != null ? fmtPct(data.inter.rejection_pct) : "—", "", BarChart2, "#2d6de8"),
          chip("Rows", fmtNum(data.inter?.row_count), "", ClipboardList, "#64748b"),
        ];
        break;
      case "final_inspection":
        kpisStrip = [
          chip("OK", fmtNum(fi?.total_ok_qty), "", CheckCircle2, "#10b981"),
          chip("Org Rej", fmtNum(data.finalOrg?.total_rejection), "", XOctagon, "#ef4444"),
          chip("Org Rwk", fmtNum(data.finalOrg?.total_rework), "", RefreshCw, "#f59e0b"),
          chip("FPY", fmtPct(fi?.first_pass_yield ?? 0), "", Target, "#8b5cf6"),
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
          chip("OK", `${qs.pctOk}%`, "", CheckCircle2, "#10b981"),
          chip("Rejection", `${qs.pctRej}%`, "", XOctagon, "#ef4444"),
          chip("Rework", `${qs.pctRwk}%`, "", RefreshCw, "#f59e0b"),
          chip("Total", fmtNum(qs.total), "", BarChart2, "#2d6de8"),
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
          chip("Metric", "—", "", BarChart2, color),
          chip("Records", "—", "", ClipboardList, "#64748b"),
          chip("Range", data.prod?.from ? `${data.prod.from}` : "—", "", Calendar, "#94a3b8"),
          chip("Status", "Live", "", CheckCircle2, "#10b981"),
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
function OtdTrendView({ data, loading, uid, filters, onFilterChange, from, to, onClose, targetConfig }) {
  const [report, setReport] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);

  const [custOpen, setCustOpen] = useState(false);
  const custRef = useRef(null);
  const [partOpen, setPartOpen] = useState(false);
  const partRef = useRef(null);

  const allCustomers = ["Tata Motors", "Mahindra & Mahindra", "Maruti Suzuki", "Hyundai India", "Ashok Leyland"];
  const allParts = ["BRK-PAD-M1", "ROT-DSC-X4", "GBX-HNG-S2", "ENG-MNT-H1", "TRK-AXL-L9", "BRK-PAD-M2", "GBX-HNG-S3"];

  const custSuggestions = useMemo(() => {
    if (!filters.customer) return allCustomers;
    return allCustomers.filter(c => c.toLowerCase().includes(filters.customer.toLowerCase()));
  }, [filters.customer]);

  const partSuggestions = useMemo(() => {
    if (!filters.partNumber) return allParts;
    return allParts.filter(p => p.toLowerCase().includes(filters.partNumber.toLowerCase()));
  }, [filters.partNumber]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (custRef.current && !custRef.current.contains(event.target)) {
        setCustOpen(false);
      }
      if (partRef.current && !partRef.current.contains(event.target)) {
        setPartOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = useMemo(() => {
    if (filters.fromDate) return new Date(filters.fromDate);
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, [filters.fromDate]);

  const pickerTo = useMemo(() => {
    if (filters.toDate) return new Date(filters.toDate);
    return new Date();
  }, [filters.toDate]);

  const handlePickerChange = useCallback(({ from, to }) => {
    const formatLocalDate = (d) => {
      if (!d) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatLocalDate(from),
      toDate: formatLocalDate(to)
    }));
  }, [onFilterChange]);

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      customer: "",
      partNumber: ""
    });
  };

  useEffect(() => {
    if (!from || !to) {
      setReport(null);
      return;
    }
    setChartLoading(true);
    setChartError(null);
    setReport({
      labels: ["Jan-26", "Feb-26", "Mar-26", "Apr-26", "May-26", "Jun-26"],
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
              label: `Target ${targetConfig?.otd?.targetPct ?? 90}%`,
              data: Array(n).fill(targetConfig?.otd?.targetPct ?? 90),
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
    [chartLabels.join(","), chartData.join(","), fy, chartTitle, targetConfig?.otd?.targetPct]
  );

  const rebuildToken = `${otdReportChartToken(report)}|${targetConfig?.otd?.targetPct ?? 90}`;
  const otdKpis = data?.otd?.kpis ?? {};

  const kpis = [
    { label: "OTD %", value: fmtPct(otdKpis.on_time_delivery_pct ?? 88.5), icon: Calendar, color: "#7c3aed" },
    { label: "On-Time Qty", value: fmtNum(otdKpis.on_time_qty ?? 11000), icon: CheckCircle2, color: "#10b981" },
    { label: "Total Del.", value: fmtNum(otdKpis.total_del_qty ?? 12430), icon: Truck, color: "#2d6de8" },
    { label: "Delayed Lines", value: fmtNum(otdKpis.delayed_lines ?? 4), icon: AlertTriangle, color: "#ef4444" }
  ];

  return (
    <PremiumDashboardView
      title="OTD"
      icon={Clock}
      color="#7c3aed"
      kpis={kpis}
      setupChart={setupChart}
      chartHeight={260}
      rangeHint="Month Wise OTD Trend"
      onClose={onClose}
      rebuildToken={rebuildToken}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" style={{ maxWidth: "230px" }}>
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Customer Autocomplete */}
        <div className="pp1-filter-group" ref={custRef} style={{ maxWidth: "260px" }}>
          <label className="pp1-filter-label">Customer Name</label>
          <div className="pp1-part-autocomplete-wrap">
            <input
              type="text"
              className="pp1-filter-input pp1-part-autocomplete-input"
              placeholder="Customer..."
              value={filters.customer}
              onChange={e => {
                handleInputChange("customer", e.target.value);
                setCustOpen(true);
              }}
              onFocus={() => setCustOpen(true)}
            />
            {custOpen && custSuggestions.length > 0 && (
              <div className="pp1-part-suggestions">
                <div
                  className={`pp1-part-suggestion-item ${!filters.customer ? "selected" : ""}`}
                  onClick={() => {
                    handleInputChange("customer", "");
                    setCustOpen(false);
                  }}
                >
                  All Customers
                </div>
                {custSuggestions.map(c => (
                  <div
                    key={c}
                    className={`pp1-part-suggestion-item ${filters.customer === c ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("customer", c);
                      setCustOpen(false);
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Part Number Autocomplete */}
        <div className="pp1-filter-group" ref={partRef} style={{ maxWidth: "150px" }}>
          <label className="pp1-filter-label">Part Number</label>
          <div className="pp1-part-autocomplete-wrap">
            <input
              type="text"
              className="pp1-filter-input pp1-part-autocomplete-input"
              placeholder="Part No..."
              value={filters.partNumber}
              onChange={e => {
                handleInputChange("partNumber", e.target.value);
                setPartOpen(true);
              }}
              onFocus={() => setPartOpen(true)}
            />
            {partOpen && partSuggestions.length > 0 && (
              <div className="pp1-part-suggestions">
                <div
                  className={`pp1-part-suggestion-item ${!filters.partNumber ? "selected" : ""}`}
                  onClick={() => {
                    handleInputChange("partNumber", "");
                    setPartOpen(false);
                  }}
                >
                  All Parts
                </div>
                {partSuggestions.map(p => (
                  <div
                    key={p}
                    className={`pp1-part-suggestion-item ${filters.partNumber === p ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("partNumber", p);
                      setPartOpen(false);
                    }}
                  >
                    {p}
                  </div>
                ))}
              </div>
            )}
          </div>
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
  { customer: "Customer A", month: "Apr-26", date: "2026-04-15", orderValue: 13.0, salesValue: 7.0, pendingValue: 6.0, poNumber: "PO-A01", partNumber: "PART-101" },
  { customer: "Customer A", month: "May-26", date: "2026-05-15", orderValue: 20.0, salesValue: 11.0, pendingValue: 9.0, poNumber: "PO-A02", partNumber: "PART-102" },
  { customer: "Customer A", month: "Jun-26", date: "2026-06-15", orderValue: 13.0, salesValue: 7.0, pendingValue: 6.0, poNumber: "PO-A03", partNumber: "PART-103" },
  { customer: "Customer B", month: "Apr-26", date: "2026-04-15", orderValue: 22.0, salesValue: 18.0, pendingValue: 4.0, poNumber: "PO-B01", partNumber: "PART-201" },
  { customer: "Customer B", month: "May-26", date: "2026-05-15", orderValue: 25.0, salesValue: 20.0, pendingValue: 5.0, poNumber: "PO-B02", partNumber: "PART-202" },
  { customer: "Customer B", month: "Jun-26", date: "2026-06-15", orderValue: 22.0, salesValue: 18.0, pendingValue: 4.0, poNumber: "PO-B03", partNumber: "PART-203" },
  { customer: "Customer C", month: "Apr-26", date: "2026-04-15", orderValue: 18.0, salesValue: 12.0, pendingValue: 6.0, poNumber: "PO-C01", partNumber: "PART-301" },
  { customer: "Customer C", month: "May-26", date: "2026-05-15", orderValue: 24.0, salesValue: 15.0, pendingValue: 9.0, poNumber: "PO-C02", partNumber: "PART-302" },
  { customer: "Customer C", month: "Jun-26", date: "2026-06-15", orderValue: 18.0, salesValue: 12.0, pendingValue: 6.0, poNumber: "PO-C03", partNumber: "PART-303" },
  { customer: "Customer D", month: "Apr-26", date: "2026-04-15", orderValue: 15.0, salesValue: 8.0, pendingValue: 7.0, poNumber: "PO-D01", partNumber: "PART-401" },
  { customer: "Customer D", month: "May-26", date: "2026-05-15", orderValue: 18.0, salesValue: 10.0, pendingValue: 8.0, poNumber: "PO-D02", partNumber: "PART-402" },
  { customer: "Customer D", month: "Jun-26", date: "2026-06-15", orderValue: 15.0, salesValue: 8.0, pendingValue: 7.0, poNumber: "PO-D03", partNumber: "PART-403" }
];

function CustomerPoCompareView({ data, loading, uid, filters, onFilterChange, activeSlide, onActiveSlideChange, onClose, targetConfig, showTargetOnly, setShowTargetOnly }) {
  const [custOpen, setCustOpen] = React.useState(false);
  const custRef = React.useRef(null);
  const [partOpen, setPartOpen] = React.useState(false);
  const partRef = React.useRef(null);
  const [chartType, setChartType] = React.useState("line");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);
  const chartTypeRef = React.useRef(null);

  const partSuggestions = React.useMemo(() => {
    if (!filters.partNumber) return [];
    const source = (data?.customerPoCompare?.rows && Array.isArray(data.customerPoCompare.rows))
      ? data.customerPoCompare.rows
      : [];
    const parts = source.map(r => r.partNumber).filter(Boolean);
    const uniqueParts = Array.from(new Set(parts));
    return uniqueParts.filter(p => p.toLowerCase().includes(filters.partNumber.toLowerCase()));
  }, [filters.partNumber, data?.customerPoCompare?.rows]);

  const custSuggestions = React.useMemo(() => {
    const source = (data?.customerPoCompare?.rows && Array.isArray(data.customerPoCompare.rows))
      ? data.customerPoCompare.rows
      : [];
    const names = source.map(r => r.customer).filter(Boolean);
    const uniqueNames = Array.from(new Set(names)).sort();
    if (!filters.customer) return uniqueNames;
    return uniqueNames.filter(c => c.toLowerCase().includes(filters.customer.toLowerCase()));
  }, [filters.customer, data?.customerPoCompare?.rows]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (custRef.current && !custRef.current.contains(event.target)) {
        setCustOpen(false);
      }
      if (partRef.current && !partRef.current.contains(event.target)) {
        setPartOpen(false);
      }
      if (chartTypeRef.current && !chartTypeRef.current.contains(event.target)) {
        setChartTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = React.useMemo(() => {
    if (filters.fromDate) return new Date(filters.fromDate);
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, [filters.fromDate]);

  const pickerTo = React.useMemo(() => {
    if (filters.toDate) return new Date(filters.toDate);
    return new Date();
  }, [filters.toDate]);

  const handlePickerChange = React.useCallback(({ from, to }) => {
    const formatLocalDate = (d) => {
      if (!d) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatLocalDate(from),
      toDate: formatLocalDate(to)
    }));
  }, [onFilterChange]);

  // Filtered rows for dynamic chart display
  const chart1Data = React.useMemo(() => {
    let list = (data?.customerPoCompare?.rows && Array.isArray(data.customerPoCompare.rows))
      ? data.customerPoCompare.rows
      : [];

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const defaultFrom = `${year}-${month}-01`;
    const defaultTo = `${year}-${month}-${day}`;

    const activeFrom = filters.fromDate || defaultFrom;
    const activeTo = filters.toDate || defaultTo;

    list = list.filter(r => r.date >= activeFrom && r.date <= activeTo);
    if (filters.customer) {
      list = list.filter(r => r.customer === filters.customer);
    }
    if (filters.poNumber) {
      list = list.filter(r => r.poNumber && String(r.poNumber).toLowerCase().includes(filters.poNumber.toLowerCase()));
    }
    if (filters.partNumber) {
      list = list.filter(r => r.partNumber && String(r.partNumber).toLowerCase().includes(filters.partNumber.toLowerCase()));
    }

    // Aggregate values month-wise
    const monthGroup = {};
    list.forEach(r => {
      if (!r.month) return;
      if (!monthGroup[r.month]) {
        monthGroup[r.month] = {
          month: r.month,
          orderValue: 0,
          salesValue: 0,
          pendingValue: 0,
          minDate: r.date || ""
        };
      }
      monthGroup[r.month].orderValue += Number(r.orderValue || 0);
      monthGroup[r.month].salesValue += Number(r.salesValue || 0);
      monthGroup[r.month].pendingValue += Number(r.pendingValue || 0);
      if (r.date && (!monthGroup[r.month].minDate || r.date < monthGroup[r.month].minDate)) {
        monthGroup[r.month].minDate = r.date;
      }
    });

    // Sort months chronologically by minDate
    const sortedMonthsData = Object.values(monthGroup).sort((a, b) => {
      if (!a.minDate) return 1;
      if (!b.minDate) return -1;
      return a.minDate.localeCompare(b.minDate);
    });

    return sortedMonthsData;
  }, [filters.fromDate, filters.toDate, filters.customer, filters.poNumber, filters.partNumber, data?.customerPoCompare?.rows]);

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      customer: "",
      poNumber: "",
      partNumber: "",
      category: "",
    });
    setChartType("line");
    setShowTargetOnly(false);
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  // Chart Setup 1: Month Wise PO Value vs Sales Value vs Pending Value (Dynamic Layouts)
  const setupChart = React.useCallback((canvas) => {
    const labels = chart1Data.map(r => r.month);
    const orderValues = chart1Data.map(r => r.orderValue);
    const salesValues = chart1Data.map(r => r.salesValue);
    const pendingValues = chart1Data.map(r => r.pendingValue);
    const salesTarget = targetConfig?.customer_po?.salesTarget ?? 25;

    // Handle Radar Chart
    if (chartType === "radar") {
      return new Chart(canvas, {
        type: "radar",
        data: {
          labels,
          datasets: [
            {
              label: "Order Value",
              data: orderValues,
              borderColor: "rgba(59, 130, 246, 1)",
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              borderWidth: 2,
              pointRadius: 3,
              fill: true,
              hidden: showTargetOnly
            },
            {
              label: "Sales Value",
              data: salesValues,
              borderColor: "rgba(16, 185, 129, 1)",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              borderWidth: 2,
              pointRadius: 3,
              fill: true,
              hidden: showTargetOnly
            },
            {
              label: "Pending Order Value",
              data: pendingValues,
              borderColor: "rgba(245, 158, 11, 1)",
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              borderWidth: 2,
              pointRadius: 3,
              fill: true,
              hidden: showTargetOnly
            },
            {
              label: "Sales Target",
              data: labels.map(() => salesTarget),
              borderColor: "rgba(239, 68, 68, 0.85)",
              borderDash: [5, 5],
              borderWidth: 1.5,
              pointRadius: 0,
              fill: false
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
              callbacks: {
                label: (context) => ` ${context.dataset.label}: ₹${Number(context.raw).toFixed(2)} L`
              }
            }
          },
          scales: {
            r: {
              min: 0,
              suggestedMax: Math.max(0, salesTarget, ...orderValues, ...salesValues, ...pendingValues) * 1.1,
              angleLines: { display: true, color: "rgba(0, 0, 0, 0.05)" },
              grid: { circular: true, color: "rgba(0, 0, 0, 0.05)" },
              ticks: { display: true, font: { size: 8 }, backdropColor: "transparent", callback: (v) => `₹${v} L` }
            }
          }
        }
      });
    }

    // Handle Polar Area Chart
    if (chartType === "polarArea") {
      return new Chart(canvas, {
        type: "polarArea",
        data: {
          labels,
          datasets: [
            {
              label: "Order Value",
              data: orderValues,
              backgroundColor: "rgba(59, 130, 246, 0.6)",
              borderColor: "rgba(59, 130, 246, 1)",
              borderWidth: 1,
              hidden: showTargetOnly
            },
            {
              label: "Sales Value",
              data: salesValues,
              backgroundColor: "rgba(16, 185, 129, 0.6)",
              borderColor: "rgba(16, 185, 129, 1)",
              borderWidth: 1,
              hidden: showTargetOnly
            },
            {
              label: "Pending Order Value",
              data: pendingValues,
              backgroundColor: "rgba(245, 158, 11, 0.6)",
              borderColor: "rgba(245, 158, 11, 1)",
              borderWidth: 1,
              hidden: showTargetOnly
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
              callbacks: {
                label: (context) => ` ${context.dataset.label}: ₹${Number(context.raw).toFixed(2)} L`
              }
            }
          },
          scales: {
            r: {
              min: 0,
              suggestedMax: Math.max(0, ...orderValues, ...salesValues, ...pendingValues) * 1.1,
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { display: true, font: { size: 8 }, backdropColor: "transparent", callback: (v) => `₹${v} L` }
            }
          }
        }
      });
    }

    const isLine = chartType === "line";
    const isBar = chartType === "bar";
    const isArea = chartType === "area";
    const isStepped = chartType === "stepped";
    const isCombo = chartType === "combo";

    const getDatasetType = (label) => {
      if (isCombo) {
        return label === "Pending Order Value" ? "line" : "bar";
      }
      return isBar ? "bar" : "line";
    };

    const getFill = () => {
      if (isArea) return true;
      if (isStepped) return true;
      if (isLine) return true;
      return false;
    };

    const getBgColor = (baseColor, label) => {
      const type = getDatasetType(label);
      if (type === "bar") {
        return baseColor + "cc"; // ~80% opacity
      }
      if (isArea) return baseColor + "40"; // 25% opacity
      if (isStepped) return baseColor + "25"; // 15% opacity
      return baseColor + "08"; // 3% opacity for line
    };

    const getPointRadius = (label) => {
      const type = getDatasetType(label);
      return type === "bar" ? 0 : 4.5;
    };

    // Custom plugin to draw target horizontal line across the entire chart area
    const horizontalLinePlugin = {
      id: 'horizontalLine',
      afterDraw: (chart) => {
        const yScale = chart.scales.y;
        const xScale = chart.scales.x;
        if (!yScale || !xScale) return;

        const targetIndex = chart.data.datasets.findIndex(ds => ds.label === 'Sales Target');
        if (targetIndex === -1 || !chart.isDatasetVisible(targetIndex)) return;

        const yPos = yScale.getPixelForValue(salesTarget);
        const ctx = chart.ctx;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
        ctx.moveTo(xScale.left, yPos);
        ctx.lineTo(xScale.right, yPos);
        ctx.stroke();
        ctx.restore();
      }
    };

    const datasets = [
      {
        type: getDatasetType("Order Value"),
        label: "Order Value",
        data: orderValues,
        borderColor: "rgba(59, 130, 246, 1)",
        backgroundColor: getBgColor("rgba(59, 130, 246, ", "Order Value"),
        borderWidth: getDatasetType("Order Value") === "bar" ? 1.5 : 2.5,
        borderRadius: getDatasetType("Order Value") === "bar" ? 4 : 0,
        tension: getDatasetType("Order Value") === "bar" ? 0 : 0.3,
        pointBackgroundColor: "rgba(59, 130, 246, 1)",
        pointRadius: getPointRadius("Order Value"),
        fill: getFill(),
        stepped: isStepped ? "middle" : false,
        hidden: showTargetOnly,
        order: getDatasetType("Order Value") === "bar" ? 2 : 1
      },
      {
        type: getDatasetType("Sales Value"),
        label: "Sales Value",
        data: salesValues,
        borderColor: "rgba(16, 185, 129, 1)",
        backgroundColor: getBgColor("rgba(16, 185, 129, ", "Sales Value"),
        borderWidth: getDatasetType("Sales Value") === "bar" ? 1.5 : 2.5,
        borderRadius: getDatasetType("Sales Value") === "bar" ? 4 : 0,
        tension: getDatasetType("Sales Value") === "bar" ? 0 : 0.3,
        pointBackgroundColor: "rgba(16, 185, 129, 1)",
        pointRadius: getPointRadius("Sales Value"),
        fill: getFill(),
        stepped: isStepped ? "middle" : false,
        hidden: showTargetOnly,
        order: getDatasetType("Sales Value") === "bar" ? 2 : 1
      },
      {
        type: getDatasetType("Pending Order Value"),
        label: "Pending Order Value",
        data: pendingValues,
        borderColor: "rgba(245, 158, 11, 1)",
        backgroundColor: getBgColor("rgba(245, 158, 11, ", "Pending Order Value"),
        borderWidth: getDatasetType("Pending Order Value") === "bar" ? 1.5 : 2.5,
        borderRadius: getDatasetType("Pending Order Value") === "bar" ? 4 : 0,
        tension: getDatasetType("Pending Order Value") === "bar" ? 0 : 0.3,
        pointBackgroundColor: "rgba(245, 158, 11, 1)",
        pointRadius: getPointRadius("Pending Order Value"),
        fill: getFill(),
        stepped: isStepped ? "middle" : false,
        hidden: showTargetOnly,
        order: getDatasetType("Pending Order Value") === "bar" ? 2 : 1
      },
      {
        type: "line",
        label: "Sales Target",
        data: labels.map(() => salesTarget),
        borderColor: "rgba(239, 68, 68, 0.85)",
        borderDash: [5, 5],
        borderWidth: 0,
        pointRadius: 0,
        pointHitRadius: 20,
        pointHoverRadius: 6,
        fill: false,
        tension: 0,
        order: 0
      }
    ];

    return new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
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
              label: (context) => ` ${context.dataset.label}: ₹${Number(context.raw).toFixed(2)} L`
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
      },
      plugins: [horizontalLinePlugin]
    });
  }, [chart1Data, targetConfig, showTargetOnly, chartType]);

  const slides = [
    {
      title: "Month Wise PO Value vs Sales Value vs Pending Value",
      purpose: "Value Analysis (Lakhs)",
      type: chartType,
      setup: setupChart,
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
        <div className="pp1-action-detail__icon-box" style={{ width: "32px", height: "32px", borderRadius: "8px", fontSize: "16px", background: "var(--act-color)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Scale size={16} style={{ color: "#fff" }} />
        </div>
        <div className="pp1-action-detail__meta" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <p className="pp1-action-detail__title" style={{ fontWeight: 800, margin: 0 }}>Customer PO vs Sales Value</p>
        </div>
        <button type="button" className="pp1-action-detail__close" style={{ width: "24px", height: "24px", marginLeft: "auto" }} onClick={onClose}>✕</button>
      </div>

      <div className="pp1-action-detail__body" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px" }}>
        {/* Filters Bar */}
        <div className="pp1-filters-bar">
          {/* Date Range Picker */}
          <div className="pp1-filter-group pp1-filter-group--date-range">
            <label className="pp1-filter-label">Date Range</label>
            <PlantPerformance1DatePicker
              from={pickerFrom}
              to={pickerTo}
              onChange={handlePickerChange}
            />
          </div>

          {/* Customer Autocomplete */}
          <div className="pp1-filter-group" ref={custRef}>
            <label className="pp1-filter-label">Customer</label>
            <div className="pp1-part-autocomplete-wrap">
              <input
                type="text"
                className="pp1-filter-input pp1-part-autocomplete-input"
                placeholder="Customer..."
                value={filters.customer}
                onChange={e => {
                  handleInputChange("customer", e.target.value);
                  setCustOpen(true);
                }}
                onFocus={() => setCustOpen(true)}
              />
              {custOpen && custSuggestions.length > 0 && (
                <div className="pp1-part-suggestions">
                  <div
                    className={`pp1-part-suggestion-item ${!filters.customer ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("customer", "");
                      setCustOpen(false);
                    }}
                  >
                    All Customers
                  </div>
                  {custSuggestions.map(c => (
                    <div
                      key={c}
                      className={`pp1-part-suggestion-item ${filters.customer === c ? "selected" : ""}`}
                      onClick={() => {
                        handleInputChange("customer", c);
                        setCustOpen(false);
                      }}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Part Number Autocomplete */}
          <div className="pp1-filter-group" ref={partRef}>
            <label className="pp1-filter-label">Part Number</label>
            <div className="pp1-part-autocomplete-wrap">
              <input
                type="text"
                className="pp1-filter-input pp1-part-autocomplete-input"
                placeholder="Part No..."
                value={filters.partNumber}
                onChange={e => {
                  handleInputChange("partNumber", e.target.value);
                  setPartOpen(true);
                }}
                onFocus={() => setPartOpen(true)}
              />
              {partOpen && partSuggestions.length > 0 && (
                <div className="pp1-part-suggestions">
                  {partSuggestions.map(p => (
                    <div
                      key={p}
                      className={`pp1-part-suggestion-item ${filters.partNumber === p ? "selected" : ""}`}
                      onClick={() => {
                        handleInputChange("partNumber", p);
                        setPartOpen(false);
                      }}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chart Type Dropdown Filter */}
          <div className="pp1-filter-group" ref={chartTypeRef}>
            <label className="pp1-filter-label">Chart Type</label>
            <div className="pp1-custom-select-wrap">
              <button
                type="button"
                className={`pp1-custom-select-trigger ${chartTypeOpen ? "open" : ""}`}
                onClick={() => setChartTypeOpen(o => !o)}
                style={{ minWidth: "135px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {chartType === "bar" ? (
                    <BarChart2 size={12} style={{ color: "#2d6de8" }} />
                  ) : chartType === "area" ? (
                    <AreaChart size={12} style={{ color: "#2d6de8" }} />
                  ) : chartType === "radar" ? (
                    <Radar size={12} style={{ color: "#2d6de8" }} />
                  ) : chartType === "polarArea" ? (
                    <PieChart size={12} style={{ color: "#2d6de8" }} />
                  ) : chartType === "stepped" ? (
                    <Activity size={12} style={{ color: "#2d6de8" }} />
                  ) : chartType === "combo" ? (
                    <TrendingUp size={12} style={{ color: "#2d6de8" }} />
                  ) : (
                    <LucideLineChart size={12} style={{ color: "#2d6de8" }} />
                  )}
                  <span style={{ textTransform: "capitalize" }}>{chartType === "polarArea" ? "Polar Area" : chartType === "radar" ? "Radar" : chartType === "stepped" ? "Stepped" : chartType}</span>
                </div>
                <ChevronDown size={12} className="pp1-custom-select-caret" />
              </button>
              {chartTypeOpen && (
                <div className="pp1-custom-select-options">
                  {[
                    { id: "combo", label: "Combo Chart", icon: TrendingUp },
                    { id: "line", label: "Line Chart", icon: LucideLineChart },
                    { id: "bar", label: "Bar Chart", icon: BarChart2 },
                    { id: "area", label: "Area Chart", icon: AreaChart },
                    { id: "radar", label: "Radar Chart", icon: Radar },
                    { id: "polarArea", label: "Polar Area", icon: PieChart },
                    { id: "stepped", label: "Stepped Chart", icon: Activity }
                  ].map(opt => (
                    <div
                      key={opt.id}
                      className={`pp1-custom-select-option ${chartType === opt.id ? "selected" : ""}`}
                      onClick={() => {
                        setChartType(opt.id);
                        setChartTypeOpen(false);
                      }}
                      style={{ display: "flex", alignItems: "center", gap: "8px" }}
                    >
                      <opt.icon size={12} style={{ color: chartType === opt.id ? "#fff" : "#2d6de8" }} />
                      <span>{opt.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

            {slides.length > 1 && (
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
            )}
          </div>

          <div className="pp1-carousel-content">
            <div className="pp1-carousel-chart-wrap">
              <ChartJsCanvas
                setup={slides[activeSlide].setup}
                height={190}
                rebuildToken={`${activeSlide}|${chart1Data.length}|${JSON.stringify(filters)}|${targetConfig?.customer_po?.salesTarget}|${showTargetOnly}|${chartType}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerPoCompareBottomTable({ data, loading, uid, filters, showTargetOnly, targetConfig }) {
  const salesTarget = targetConfig?.customer_po?.salesTarget ?? 25;

  // Process data for Table 1 (Customer PO Value Summary)
  const table1Rows = React.useMemo(() => {
    let list = (data?.customerPoCompare?.rows && Array.isArray(data.customerPoCompare.rows))
      ? data.customerPoCompare.rows
      : [];

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const defaultFrom = `${year}-${month}-01`;
    const defaultTo = `${year}-${month}-${day}`;

    const activeFrom = filters.fromDate || defaultFrom;
    const activeTo = filters.toDate || defaultTo;

    list = list.filter(r => r.date >= activeFrom && r.date <= activeTo);
    if (filters.customer) {
      list = list.filter(r => r.customer === filters.customer);
    }
    if (filters.poNumber) {
      list = list.filter(r => r.poNumber && String(r.poNumber).toLowerCase().includes(filters.poNumber.toLowerCase()));
    }
    if (filters.partNumber) {
      list = list.filter(r => r.partNumber && String(r.partNumber).toLowerCase().includes(filters.partNumber.toLowerCase()));
    }

    // Group by customer to make it Customer summary wise
    const customerGroups = {};
    list.forEach(r => {
      const cust = r.customer || "—";
      if (!customerGroups[cust]) {
        customerGroups[cust] = {
          customer: cust,
          orderValue: 0,
          salesValue: 0,
          pendingValue: 0
        };
      }
      customerGroups[cust].orderValue += Number(r.orderValue || 0);
      customerGroups[cust].salesValue += Number(r.salesValue || 0);
      customerGroups[cust].pendingValue += Number(r.pendingValue || 0);
    });

    return Object.values(customerGroups).sort((a, b) => a.customer.localeCompare(b.customer));
  }, [filters.fromDate, filters.toDate, filters.customer, filters.poNumber, filters.partNumber, data?.customerPoCompare?.rows]);

  // Render table content
  return (
    <div className="pp1-cc-bot" key={uid}>
      <div className="pp1-cc-bot__hd" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "18px", borderBottom: "1px solid rgba(0,0,0,0.08)", width: "100%", paddingBottom: "4px" }}>
          <span
            style={{
              background: "none",
              border: "none",
              borderBottom: "2.5px solid var(--pp1-blue)",
              color: "var(--pp1-blue)",
              fontWeight: 700,
              fontSize: "12px",
              paddingBottom: "6px",
              transition: "all 0.15s ease"
            }}
          >
            Customer PO Value Summary
          </span>
        </div>
      </div>

      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "5px" }}>
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
                    <td style={{ textAlign: "right", fontWeight: 600 }}>₹{Number(r.orderValue || 0).toFixed(2)} L</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--pp1-green)" }}>₹{Number(r.salesValue || 0).toFixed(2)} L</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: Number(r.pendingValue || 0) > 0 ? "var(--pp1-amber)" : "var(--pp1-text-3)" }}>₹{Number(r.pendingValue || 0).toFixed(2)} L</td>
                  </>
                )}
              </tr>
            ))}
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

/* ── Generic Premium Dashboard View & Bottom Table Helpers ── */
function PremiumDashboardView({ title, icon: Icon, color, kpis, setupChart, chartHeight = 220, rangeHint, onClose, rebuildToken, chartControls, chartHeaderControls, extraBottom, children }) {
  return (
    <div className="pp1-action-detail pp1-ct-reveal pp1-ct-reveal--in" style={{ "--act-color": color, animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-action-detail__header" style={{ padding: "10px 14px", gap: "10px" }}>
        <div className="pp1-action-detail__icon-box" style={{ width: "32px", height: "32px", borderRadius: "8px", fontSize: "16px", background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} style={{ color: "#fff" }} />
        </div>
        <div className="pp1-action-detail__meta" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <p className="pp1-action-detail__title" style={{ fontWeight: 800, margin: 0 }}>{title}</p>
        </div>
        <button type="button" className="pp1-action-detail__close" style={{ width: "24px", height: "24px", marginLeft: "auto" }} onClick={onClose}>✕</button>
      </div>

      <div className="pp1-action-detail__body" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px" }}>
        {children}
        {/* KPI Strip */}
        {kpis && kpis.length > 0 && (
          <div className="pp1-detail__strip" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px" }}>
            {kpis.map((k, i) => (
              <div key={i} className="pp1-detail__chip" style={{ "--chip-color": k.color, "--chip-delay": `${i * 60}ms`, padding: "8px 12px", borderRadius: "8px", background: k.color + "10", border: `1px solid ${k.color}20`, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  {typeof k.icon === "string" ? (
                    <span className="pp1-detail__chip-icon" style={{ fontSize: "14px" }}>{k.icon}</span>
                  ) : k.icon ? (
                    <span className="pp1-detail__chip-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "6px", background: k.color + "20" }}>
                      <k.icon size={13} style={{ color: k.color }} />
                    </span>
                  ) : null}
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
            <div className="pp1-dt-card__hd" style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
              <div className="pp1-dt-card__title" style={{ fontSize: "11px", fontWeight: 700, color: "var(--pp1-text-3)" }}>{rangeHint.includes("-") && !rangeHint.includes("Breakdown") ? `Trend Analysis (${rangeHint})` : rangeHint}</div>
              {chartHeaderControls}
            </div>
            <div className="pp1-dt-chart-wrap" style={{ height: chartHeight, position: "relative" }}>
              <ChartJsCanvas setup={setupChart} height={chartHeight} rebuildToken={rebuildToken || title} />
            </div>
          </div>
        )}
        {extraBottom}
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
                    textAlign: idx > 2 && (col.toLowerCase().includes("qty") || col.toLowerCase().includes("value") || col.toLowerCase().includes("hours") || col.toLowerCase().includes("hour") || col.toLowerCase().includes("rate") || col.toLowerCase().includes("ratio") || col.toLowerCase().includes("%") || col.toLowerCase().includes("day") || col.toLowerCase().includes("month") || col.toLowerCase().includes("loss") || col.toLowerCase().includes("price")) ? "right" : "left"
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
                    const isRightAligned = ci > 2 && (columns[ci].toLowerCase().includes("qty") || columns[ci].toLowerCase().includes("value") || columns[ci].toLowerCase().includes("hours") || columns[ci].toLowerCase().includes("hour") || columns[ci].toLowerCase().includes("rate") || columns[ci].toLowerCase().includes("ratio") || columns[ci].toLowerCase().includes("%") || columns[ci].toLowerCase().includes("day") || columns[ci].toLowerCase().includes("month") || columns[ci].toLowerCase().includes("loss") || columns[ci].toLowerCase().includes("price"));
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
                        "Overload": { bg: "#fee2e2", c: "#991b1b" },
                        "In Stock": { bg: "#d1fae5", c: "#065f46" },
                        "Low Stock": { bg: "#fef3c7", c: "#92400e" },
                        "Out of Stock": { bg: "#fee2e2", c: "#991b1b" }
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
/* ── GRN Value helpers (same filter/aggregate pattern as Customer PO vs Sales) ── */
function normalizeGrnDate(d) {
  if (!d) return "";
  return String(d).trim().slice(0, 10);
}

function filterGrnRows(rows, filters, defaultFrom, defaultTo) {
  const source = Array.isArray(rows) ? rows : [];
  const activeFrom = filters.fromDate || defaultFrom;
  const activeTo = filters.toDate || defaultTo;

  return source.filter((r) => {
    const grnDate = normalizeGrnDate(r.grnDate);
    if (!grnDate || grnDate < activeFrom || grnDate > activeTo) return false;
    if (filters.supplier && r.supplierName !== filters.supplier) return false;
    if (filters.partNumber) {
      const pno = String(r.partNo || "").toLowerCase();
      if (!pno.includes(String(filters.partNumber).toLowerCase())) return false;
    }
    if (filters.category && (r.dtype || "") !== filters.category) return false;
    return true;
  });
}

function grnMonthLabel(r) {
  if (r.month && r.month !== "—") return r.month;
  const d = normalizeGrnDate(r.grnDate);
  if (!d || d.length < 7) return null;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = parseInt(d.slice(5, 7), 10);
  if (!m || m < 1 || m > 12) return null;
  return `${months[m - 1]}-${d.slice(2, 4)}`;
}

function buildGrnMonthChartData(filteredRows) {
  const monthGroup = {};
  filteredRows.forEach((r) => {
    const month = grnMonthLabel(r);
    if (!month) return;
    const grnDate = normalizeGrnDate(r.grnDate);
    if (!monthGroup[month]) {
      monthGroup[month] = {
        month,
        total: 0,
        minDate: grnDate,
      };
    }
    monthGroup[month].total += Number(r.amount || 0);
    if (grnDate && (!monthGroup[month].minDate || grnDate < monthGroup[month].minDate)) {
      monthGroup[month].minDate = grnDate;
    }
  });

  return Object.values(monthGroup).sort((a, b) => {
    if (!a.minDate) return 1;
    if (!b.minDate) return -1;
    return a.minDate.localeCompare(b.minDate);
  });
}

function PurchaseReportDashboardView({ data, loading, filters, onFilterChange, onClose, targetConfig, trend }) {
  const [suppOpen, setSuppOpen] = React.useState(false);
  const suppRef = React.useRef(null);
  const [catOpen, setCatOpen] = React.useState(false);
  const catRef = React.useRef(null);
  const [partOpen, setPartOpen] = React.useState(false);
  const partRef = React.useRef(null);

  const pickerFrom = React.useMemo(() => filters.fromDate ? new Date(filters.fromDate) : null, [filters.fromDate]);
  const pickerTo = React.useMemo(() => filters.toDate ? new Date(filters.toDate) : null, [filters.toDate]);

  const handlePickerChange = React.useCallback(({ from, to }) => {
    const formatLocalDate = (d) => {
      if (!d) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatLocalDate(from),
      toDate: formatLocalDate(to)
    }));
  }, [onFilterChange]);

  const grnRows = React.useMemo(
    () => (Array.isArray(data?.grnValueCompare?.rows) ? data.grnValueCompare.rows : []),
    [data?.grnValueCompare?.rows]
  );

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return {
      from: `${year}-${month}-01`,
      to: `${year}-${month}-${day}`,
    };
  }, []);

  const filteredRows = React.useMemo(
    () => filterGrnRows(grnRows, filters, defaultRange.from, defaultRange.to),
    [grnRows, filters, defaultRange]
  );

  const suppliers = React.useMemo(() => {
    const names = grnRows.map(r => r.supplierName).filter(s => s && s !== "—");
    return Array.from(new Set(names)).sort();
  }, [grnRows]);

  const partSuggestions = React.useMemo(() => {
    if (!filters.partNumber) return [];
    const parts = grnRows.map(r => r.partNo).filter(Boolean);
    const uniqueParts = Array.from(new Set(parts));
    return uniqueParts.filter(p => p.toLowerCase().includes(filters.partNumber.toLowerCase()));
  }, [filters.partNumber, grnRows]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (suppRef.current && !suppRef.current.contains(event.target)) {
        setSuppOpen(false);
      }
      if (catRef.current && !catRef.current.contains(event.target)) {
        setCatOpen(false);
      }
      if (partRef.current && !partRef.current.contains(event.target)) {
        setPartOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const chartData = React.useMemo(
    () => buildGrnMonthChartData(filteredRows),
    [filteredRows]
  );

  const kpis = React.useMemo(() => {
    let total = 0;
    const supplierTotals = {};
    const monthTotals = {};

    filteredRows.forEach((r) => {
      const amount = Number(r.amount || 0);
      total += amount;
      const sName = r.supplierName || "Unknown";
      supplierTotals[sName] = (supplierTotals[sName] || 0) + amount;
      if (r.month) {
        monthTotals[r.month] = (monthTotals[r.month] || 0) + amount;
      }
    });

    let highestSupplier = "—";
    let highestVal = 0;
    Object.entries(supplierTotals).forEach(([name, val]) => {
      if (val > highestVal) {
        highestVal = val;
        highestSupplier = name;
      }
    });

    let highestMonth = "—";
    let highestMonthVal = 0;
    Object.entries(monthTotals).forEach(([month, val]) => {
      if (val > highestMonthVal) {
        highestMonthVal = val;
        highestMonth = month;
      }
    });

    const monthCount = Object.keys(monthTotals).length;
    const avg = monthCount > 0 ? total / monthCount : 0;
    const activeSupplierCount = Object.keys(supplierTotals).filter((s) => s !== "—").length;

    return [
      { label: "Total Purchase Value", value: `₹${total.toFixed(2)}L`, icon: IndianRupee, color: "#ea580c" },
      { label: "Highest Supplier", value: highestVal > 0 ? highestSupplier : "—", icon: Award, color: "#3b82f6" },
      { label: "Highest Month", value: highestMonth !== "—" ? highestMonth : "—", icon: Calendar, color: "#10b981" },
      { label: "Average Purchase", value: `₹${avg.toFixed(2)}L`, icon: BarChart2, color: "#f59e0b" },
      { label: "Active Suppliers", value: activeSupplierCount.toString(), icon: Users, color: "#8b5cf6" }
    ];
  }, [filteredRows]);

  const chartRangeLabel = React.useMemo(() => {
    if (chartData.length === 0) return "Trend Analysis";
    if (chartData.length === 1) return `Trend Analysis (${chartData[0].month})`;
    return `Trend Analysis (${chartData[0].month} – ${chartData[chartData.length - 1].month})`;
  }, [chartData]);

  const chartRebuildToken = React.useMemo(
    () => `grn-chart|${chartData.length}|${JSON.stringify(chartData)}|${JSON.stringify(filters)}|${targetConfig?.grn_value?.minGrnValueL ?? 100}`,
    [chartData, filters, targetConfig?.grn_value?.minGrnValueL]
  );

  const setupChart = React.useCallback((canvas) => {
    const labels = chartData.map((r) => r.month);
    const grnTarget = targetConfig?.grn_value?.minGrnValueL ?? 100;
    const totalData = chartData.map((r) => Number(r.total || 0));
    const maxVal = Math.max(0, grnTarget, ...totalData);

    const grnTargetLinePlugin = {
      id: "grnValueTargetLine",
      afterDraw: (chart) => {
        const yScale = chart.scales.y;
        const xScale = chart.scales.x;
        if (!yScale || !xScale) return;

        const targetIndex = chart.data.datasets.findIndex((ds) => ds.label?.startsWith("Target"));
        if (targetIndex === -1 || !chart.isDatasetVisible(targetIndex)) return;

        const yPos = yScale.getPixelForValue(grnTarget);
        const ctx = chart.ctx;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
        ctx.moveTo(xScale.left, yPos);
        ctx.lineTo(xScale.right, yPos);
        ctx.stroke();
        ctx.restore();
      },
    };

    return new Chart(canvas, {
      type: "bar",
      plugins: [grnTargetLinePlugin],
      data: {
        labels,
        datasets: [
          {
            label: "Total GRN Value",
            data: totalData,
            backgroundColor: "rgba(234, 88, 12, 0.85)",
            borderRadius: 4,
            borderSkipped: false,
            order: 2,
          },
          {
            type: "line",
            label: `Target (₹${grnTarget}L/month)`,
            data: labels.map(() => grnTarget),
            borderColor: "rgba(239, 68, 68, 0.85)",
            borderDash: [5, 5],
            borderWidth: 0,
            pointRadius: 0,
            pointHitRadius: 20,
            fill: false,
            tension: 0,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { color: "#475569", font: { size: 9 }, boxWidth: 10, padding: 6 },
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            padding: 8,
            callbacks: {
              label: (context) => {
                if (context.dataset.label?.startsWith("Target")) {
                  return ` Target: ₹${grnTarget}L/month`;
                }
                return ` ${context.dataset.label}: ₹${Number(context.raw).toFixed(2)} L`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#64748b", font: { size: 9, weight: 600 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            suggestedMax: (maxVal > 0 ? maxVal : grnTarget) * 1.25,
            ticks: {
              color: "#64748b",
              font: { size: 9 },
              callback: (val) => `₹${val} L`,
            },
            grid: { color: "rgba(0, 0, 0, 0.05)" },
          },
        },
      },
    });
  }, [chartData, targetConfig]);

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      supplier: "",
      category: "",
      partNumber: "",
    });
    setSuppOpen(false);
    setCatOpen(false);
    setPartOpen(false);
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const categories = React.useMemo(() => {
    const dtypes = grnRows.map(r => r.dtype).filter(Boolean);
    return Array.from(new Set(dtypes)).sort();
  }, [grnRows]);

  return (
    <div className="pp1-action-detail" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-action-detail__header" style={{ "--act-color": "#ea580c", padding: "10px 14px", gap: "10px" }}>
        <div className="pp1-action-detail__icon-box" style={{ width: "32px", height: "32px", borderRadius: "8px", fontSize: "16px", background: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShoppingCart size={16} style={{ color: "#fff" }} />
        </div>
        <div className="pp1-action-detail__meta" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <p className="pp1-action-detail__title" style={{ fontWeight: 800, margin: 0 }}>GRN Value</p>
          {trend && (
            <span style={{
              fontSize: "11px",
              fontWeight: 700,
              color: trend.type === "up" ? "#10b981" : "#ef4444",
              background: trend.type === "up" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
              padding: "3px 10px",
              borderRadius: "9999px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}>
              {trend.type === "up" ? "▲" : "▼"} {trend.value}
            </span>
          )}
        </div>
        <button type="button" className="pp1-action-detail__close" style={{ width: "24px", height: "24px", marginLeft: "auto" }} onClick={onClose}>✕</button>
      </div>

      <div className="pp1-action-detail__body" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px" }}>
        {/* Filters Bar */}
        <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
          {/* Date Range Picker */}
          <div className="pp1-filter-group pp1-filter-group--date-range">
            <label className="pp1-filter-label">Date Range</label>
            <PlantPerformance1DatePicker
              from={pickerFrom}
              to={pickerTo}
              onChange={handlePickerChange}
            />
          </div>

          {/* Supplier Dropdown */}
          <div className="pp1-filter-group" ref={suppRef}>
            <label className="pp1-filter-label">Supplier</label>
            <div className="pp1-custom-select-wrap">
              <button
                type="button"
                className={`pp1-custom-select-trigger ${suppOpen ? "open" : ""}`}
                onClick={() => setSuppOpen(o => !o)}
              >
                <span>{filters.supplier || "All Suppliers"}</span>
                <ChevronDown size={12} className="pp1-custom-select-caret" />
              </button>
              {suppOpen && (
                <div className="pp1-custom-select-options">
                  <div
                    className={`pp1-custom-select-option ${!filters.supplier ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("supplier", "");
                      setSuppOpen(false);
                    }}
                  >
                    All Suppliers
                  </div>
                  {suppliers.map(s => (
                    <div
                      key={s}
                      className={`pp1-custom-select-option ${filters.supplier === s ? "selected" : ""}`}
                      onClick={() => {
                        handleInputChange("supplier", s);
                        setSuppOpen(false);
                      }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="pp1-filter-group" ref={catRef}>
            <label className="pp1-filter-label">GRN Type</label>
            <div className="pp1-custom-select-wrap">
              <button
                type="button"
                className={`pp1-custom-select-trigger ${catOpen ? "open" : ""}`}
                onClick={() => setCatOpen(o => !o)}
              >
                <span>{filters.category || "All Types"}</span>
                <ChevronDown size={12} className="pp1-custom-select-caret" />
              </button>
              {catOpen && (
                <div className="pp1-custom-select-options">
                  <div
                    className={`pp1-custom-select-option ${!filters.category ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("category", "");
                      setCatOpen(false);
                    }}
                  >
                    All Types
                  </div>
                  {categories.map(c => (
                    <div
                      key={c}
                      className={`pp1-custom-select-option ${filters.category === c ? "selected" : ""}`}
                      onClick={() => {
                        handleInputChange("category", c);
                        setCatOpen(false);
                      }}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Part Number Autocomplete */}
          <div className="pp1-filter-group" ref={partRef}>
            <label className="pp1-filter-label">Part Number</label>
            <div className="pp1-part-autocomplete-wrap">
              <input
                type="text"
                className="pp1-filter-input pp1-part-autocomplete-input"
                placeholder="Part No..."
                value={filters.partNumber || ""}
                onChange={e => {
                  handleInputChange("partNumber", e.target.value);
                  setPartOpen(true);
                }}
              />
              {partOpen && partSuggestions.length > 0 && (
                <div className="pp1-part-suggestions">
                  {partSuggestions.map(p => (
                    <div
                      key={p}
                      className={`pp1-part-suggestion-item ${filters.partNumber === p ? "selected" : ""}`}
                      onClick={() => {
                        handleInputChange("partNumber", p);
                        setPartOpen(false);
                      }}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
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

        <div className="pp1-detail__strip" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px" }}>
          {kpis.map((k, i) => (
            <div key={i} className="pp1-detail__chip" style={{ "--chip-color": k.color, "--chip-delay": `${i * 60}ms`, padding: "8px 12px", borderRadius: "8px", background: k.color + "10", border: `1px solid ${k.color}20` }}>
              <span className="pp1-detail__chip-icon" style={{ fontSize: "14px", display: "inline-flex", alignItems: "center" }}>
                {typeof k.icon === "string" ? k.icon : React.createElement(k.icon, { size: 14 })}
              </span>
              <p className="pp1-detail__chip-val" style={{ fontSize: "15px", fontWeight: 700, margin: "2px 0 0 0" }}>{k.value}</p>
              <p className="pp1-detail__chip-lbl" style={{ fontSize: "9.5px", color: "var(--pp1-text-3)", margin: 0, textTransform: "uppercase", fontWeight: 600 }}>{k.label}</p>
            </div>
          ))}
        </div>

        {/* Chart Card */}
        {setupChart && (
          <div className="pp1-dt-card" style={{ padding: "14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)", background: "#fff" }}>
            <div className="pp1-dt-card__hd" style={{ marginBottom: "10px" }}>
              <div className="pp1-dt-card__title" style={{ fontSize: "11px", fontWeight: 700, color: "var(--pp1-text-3)" }}>{chartRangeLabel}</div>
            </div>
            <div className="pp1-dt-chart-wrap" style={{ height: 220, position: "relative" }}>
              <ChartJsCanvas setup={setupChart} height={220} rebuildToken={chartRebuildToken} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PurchaseReportBottomTable({ data, loading, filters }) {
  const grnRows = React.useMemo(
    () => (Array.isArray(data?.grnValueCompare?.rows) ? data.grnValueCompare.rows : []),
    [data?.grnValueCompare?.rows]
  );

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return {
      from: `${year}-${month}-01`,
      to: `${year}-${month}-${day}`,
    };
  }, []);

  const filteredRows = React.useMemo(
    () => filterGrnRows(grnRows, filters, defaultRange.from, defaultRange.to),
    [grnRows, filters, defaultRange]
  );

  const uniqueMonths = React.useMemo(() => {
    const monthMinDate = {};
    filteredRows.forEach(r => {
      const grnDate = normalizeGrnDate(r.grnDate);
      if (r.month && grnDate) {
        if (!monthMinDate[r.month] || grnDate < monthMinDate[r.month]) {
          monthMinDate[r.month] = grnDate;
        }
      }
    });
    return Object.keys(monthMinDate).sort((a, b) => monthMinDate[a].localeCompare(monthMinDate[b]));
  }, [filteredRows]);

  const rowsMonthWise = React.useMemo(() => {
    const supplierGroups = {};
    filteredRows.forEach(r => {
      const sName = r.supplierName || "Unknown";
      if (!supplierGroups[sName]) {
        supplierGroups[sName] = { supplierName: sName };
        uniqueMonths.forEach(m => { supplierGroups[sName][m] = 0; });
      }
      if (r.month && supplierGroups[sName][r.month] !== undefined) {
        supplierGroups[sName][r.month] += Number(r.amount || 0);
      }
    });

    return Object.values(supplierGroups)
      .map(group => {
        const row = [group.supplierName];
        uniqueMonths.forEach(m => {
          row.push(group[m] || 0);
        });
        return row;
      })
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredRows, uniqueMonths]);

  const columnsMonthWise = ["Supplier Name", ...uniqueMonths.map(m => `${m} (Lakhs)`), "Total Value (Lakhs)"];

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd">Purchase Value Month Wise</div>
      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
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
                    {row.slice(1).map((val, vi) => (
                      <td key={vi} style={{ textAlign: "right", fontWeight: 600 }}>₹{val.toFixed(2)} L</td>
                    ))}
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--pp1-blue)" }}>₹{totalVal.toFixed(2)} L</td>
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

/* ── Purchase Value View (UI Alone) ─────────────────────────────────────── */
function PurchaseValueDashboardView({ filters, onFilterChange, onClose, targetConfig }) {
  const [suppOpen, setSuppOpen] = React.useState(false);
  const suppRef = React.useRef(null);
  const [catOpen, setCatOpen] = React.useState(false);
  const catRef = React.useRef(null);
  const [partOpen, setPartOpen] = React.useState(false);
  const partRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (suppRef.current && !suppRef.current.contains(event.target)) {
        setSuppOpen(false);
      }
      if (catRef.current && !catRef.current.contains(event.target)) {
        setCatOpen(false);
      }
      if (partRef.current && !partRef.current.contains(event.target)) {
        setPartOpen(false);
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
      supplier: "",
      category: "",
      partNumber: "",
    });
  };

  const kpis = [
    { label: "Total Purchase Value", value: "₹151.0L", icon: IndianRupee, color: "#ea580c" },
    { label: "Highest Supplier", value: "Supplier C", icon: Award, color: "#3b82f6" },
    { label: "Highest Month", value: "June 2026", icon: Calendar, color: "#10b981" },
    { label: "Average Purchase", value: "₹37.75L", icon: BarChart2, color: "#f59e0b" },
    { label: "Active Suppliers", value: "3", icon: Users, color: "#8b5cf6" }
  ];

  const setupChart = React.useCallback((canvas) => {
    const targetVal = targetConfig?.purchase_value?.minPurchaseValueL ?? 100;
    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: ["April 2026", "May 2026", "June 2026", "July 2026"],
        datasets: [
          {
            label: "Purchase Value",
            data: [35, 42, 51, 23],
            backgroundColor: "rgba(234, 88, 12, 0.85)",
            borderRadius: 4,
            borderSkipped: false,
            order: 2,
          },
          {
            type: "line",
            label: `Target (₹${targetVal}L/month)`,
            data: [targetVal, targetVal, targetVal, targetVal],
            borderColor: "rgba(239, 68, 68, 0.85)",
            borderDash: [5, 5],
            borderWidth: 1.5,
            pointRadius: 0,
            pointHitRadius: 20,
            fill: false,
            tension: 0,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { color: "#475569", font: { size: 9 }, boxWidth: 10, padding: 6 },
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            padding: 8,
            callbacks: {
              label: (context) => {
                if (context.dataset.label?.startsWith("Target")) {
                  return ` Target: ₹${targetVal}L/month`;
                }
                return ` ${context.dataset.label}: ₹${Number(context.raw).toFixed(2)} L`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#64748b", font: { size: 9, weight: 600 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            suggestedMax: 120,
            ticks: {
              color: "#64748b",
              font: { size: 9 },
              callback: (val) => `₹${val} L`,
            },
            grid: { color: "rgba(0, 0, 0, 0.05)" },
          },
        },
      },
    });
  }, [targetConfig]);

  const suppliersList = ["Supplier A", "Supplier B", "Supplier C", "Steel Authority of India", "Hindalco Industries", "Jindal Stainless", "Tata Steel"];
  const categoriesList = ["Raw Material", "Consumables", "Machinery Parts", "Electronics"];
  const partSuggestions = filters.partNumber
    ? ["MAT-MS-02", "MAT-AL-04", "MAT-SS-10", "MAT-HR-05"].filter(p => p.toLowerCase().includes(filters.partNumber.toLowerCase()))
    : ["MAT-MS-02", "MAT-AL-04", "MAT-SS-10", "MAT-HR-05"];

  return (
    <PremiumDashboardView
      title="Purchase Value"
      icon={ShoppingCart}
      color="#ea580c"
      kpis={kpis}
      setupChart={setupChart}
      chartHeight={180}
      rangeHint="Trend Analysis (April – July 2026)"
      onClose={onClose}
      rebuildToken={`purchase-value-ui|${targetConfig?.purchase_value?.minPurchaseValueL}`}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        <div className="pp1-filter-group pp1-filter-group--date-range" style={{ maxWidth: "210px" }}>
          <label className="pp1-filter-label">Date Range</label>
          <div className="pp1-filter-input" style={{ fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "28px", cursor: "pointer" }}>
            <span>Select date range...</span>
            <Calendar size={14} style={{ opacity: 0.6 }} />
          </div>
        </div>

        {/* Supplier Autocomplete */}
        <div className="pp1-filter-group" ref={suppRef} style={{ maxWidth: "180px" }}>
          <label className="pp1-filter-label">Supplier</label>
          <div className="pp1-part-autocomplete-wrap">
            <input
              type="text"
              className="pp1-filter-input pp1-part-autocomplete-input"
              placeholder="All Suppliers"
              value={filters.supplier || ""}
              onChange={e => {
                handleInputChange("supplier", e.target.value);
                setSuppOpen(true);
              }}
              onFocus={() => setSuppOpen(true)}
            />
            {suppOpen && (
              <div className="pp1-part-suggestions">
                <div className="pp1-part-suggestion-item" onClick={() => { handleInputChange("supplier", ""); setSuppOpen(false); }}>All Suppliers</div>
                {suppliersList.map(s => (
                  <div key={s} className="pp1-part-suggestion-item" onClick={() => { handleInputChange("supplier", s); setSuppOpen(false); }}>{s}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Material Category Dropdown */}
        <div className="pp1-filter-group" ref={catRef} style={{ maxWidth: "160px" }}>
          <label className="pp1-filter-label">Material Category</label>
          <div className="pp1-part-autocomplete-wrap">
            <input
              type="text"
              className="pp1-filter-input pp1-part-autocomplete-input"
              placeholder="All Categories"
              value={filters.category || ""}
              onChange={e => {
                handleInputChange("category", e.target.value);
                setCatOpen(true);
              }}
              onFocus={() => setCatOpen(true)}
            />
            {catOpen && (
              <div className="pp1-part-suggestions">
                <div className="pp1-part-suggestion-item" onClick={() => { handleInputChange("category", ""); setCatOpen(false); }}>All Categories</div>
                {categoriesList.map(c => (
                  <div key={c} className="pp1-part-suggestion-item" onClick={() => { handleInputChange("category", c); setCatOpen(false); }}>{c}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Part Number Autocomplete */}
        <div className="pp1-filter-group" ref={partRef} style={{ maxWidth: "160px" }}>
          <label className="pp1-filter-label">Part Number</label>
          <div className="pp1-part-autocomplete-wrap">
            <input
              type="text"
              className="pp1-filter-input pp1-part-autocomplete-input"
              placeholder="Part No..."
              value={filters.partNumber || ""}
              onChange={e => {
                handleInputChange("partNumber", e.target.value);
                setPartOpen(true);
              }}
              onFocus={() => setPartOpen(true)}
            />
            {partOpen && partSuggestions.length > 0 && (
              <div className="pp1-part-suggestions">
                <div className="pp1-part-suggestion-item" onClick={() => { handleInputChange("partNumber", ""); setPartOpen(false); }}>All Parts</div>
                {partSuggestions.map(p => (
                  <div key={p} className="pp1-part-suggestion-item" onClick={() => { handleInputChange("partNumber", p); setPartOpen(false); }}>{p}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button type="button" className="pp1-filter-btn pp1-filter-btn--reset" onClick={handleReset} style={{ flexShrink: 0, height: "28px" }}>
          Reset
        </button>
      </div>
    </PremiumDashboardView>
  );
}

function PurchaseValueBottomTable({ filters }) {
  const [activeTab, setActiveTab] = React.useState("month_wise");

  const monthWiseRows = [
    ["Supplier A", "₹10.50 L", "₹12.00 L", "₹15.30 L", "₹8.20 L", "₹46.00 L"],
    ["Supplier B", "₹15.20 L", "₹18.40 L", "₹22.10 L", "₹9.80 L", "₹65.50 L"],
    ["Supplier C", "₹9.30 L", "₹11.60 L", "₹13.60 L", "₹5.00 L", "₹39.50 L"]
  ];

  const purchaseOrdersSummaryRows = [
    { supplier: "Steel Authority of India", month: "Jan-26", poNo: "PO-2026-901", poDate: "2026-01-15", code: "MAT-MS-02", name: "MS Sheet Metal 2mm", qty: "1,500 kg", rate: "₹300/kg", value: "₹4,50,000" },
    { supplier: "Hindalco Industries", month: "Feb-26", poNo: "PO-2026-902", poDate: "2026-02-12", code: "MAT-AL-04", name: "Aluminum Extrusion", qty: "800 kg", rate: "₹475/kg", value: "₹3,80,000" },
    { supplier: "Jindal Stainless", month: "Mar-26", poNo: "PO-2026-903", poDate: "2026-03-05", code: "MAT-SS-10", name: "SS Rods 10mm", qty: "1,200 kg", rate: "₹516/kg", value: "₹6,20,000" },
    { supplier: "Tata Steel", month: "Apr-26", poNo: "PO-2026-904", poDate: "2026-04-10", code: "MAT-HR-05", name: "HR Plate 5mm", qty: "2,000 kg", rate: "₹275/kg", value: "₹5,50,000" }
  ];

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--pp1-border, #e2e8f0)", gap: "16px", marginBottom: "12px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("month_wise")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "month_wise" ? "2px solid #ea580c" : "2px solid transparent",
            color: activeTab === "month_wise" ? "#ea580c" : "var(--pp1-text-secondary, #64748b)",
            fontWeight: 700,
            padding: "8px 0",
            fontSize: "13px",
            cursor: "pointer"
          }}
        >
          Purchase Value Month Wise
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("orders_summary")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "orders_summary" ? "2px solid #ea580c" : "2px solid transparent",
            color: activeTab === "orders_summary" ? "#ea580c" : "var(--pp1-text-secondary, #64748b)",
            fontWeight: 700,
            padding: "8px 0",
            fontSize: "13px",
            cursor: "pointer"
          }}
        >
          Purchase Orders Summary
        </button>
      </div>

      {/* Tables Container */}
      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 320, overflowY: "auto" }}>
        {activeTab === "month_wise" ? (
          <table className="pp1-cc-tbl" style={{ minWidth: "720px", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "30%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr style={{ background: "#fff7ed" }}>
                <th style={{ textAlign: "left", background: "#fff7ed", borderBottom: "1px solid rgba(234, 88, 12, 0.15)" }}>Supplier Name</th>
                <th style={{ textAlign: "right", background: "#fff7ed", borderBottom: "1px solid rgba(234, 88, 12, 0.15)" }}>April (Lakhs)</th>
                <th style={{ textAlign: "right", background: "#fff7ed", borderBottom: "1px solid rgba(234, 88, 12, 0.15)" }}>May (Lakhs)</th>
                <th style={{ textAlign: "right", background: "#fff7ed", borderBottom: "1px solid rgba(234, 88, 12, 0.15)" }}>June (Lakhs)</th>
                <th style={{ textAlign: "right", background: "#fff7ed", borderBottom: "1px solid rgba(234, 88, 12, 0.15)" }}>July (Lakhs)</th>
                <th style={{ textAlign: "right", background: "#fff7ed", borderBottom: "1px solid rgba(234, 88, 12, 0.15)" }}>Total Value (Lakhs)</th>
              </tr>
            </thead>
            <tbody>
              {monthWiseRows.map((row, ri) => (
                <tr key={ri} className="pp1-cc-tbl__tr">
                  <td className="pp1-cc-tbl__bold" style={{ fontWeight: 600 }}>{row[0]}</td>
                  <td style={{ textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{row[1]}</td>
                  <td style={{ textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{row[2]}</td>
                  <td style={{ textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{row[3]}</td>
                  <td style={{ textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{row[4]}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#ea580c", fontVariantNumeric: "tabular-nums" }}>{row[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="pp1-cc-tbl" style={{ minWidth: "1100px", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr style={{ background: "#fff7ed" }}>
                <th style={{ textAlign: "left", background: "#fff7ed", borderBottom: "1px solid rgba(234, 88, 12, 0.15)" }}>SUPPLIER</th>
                <th style={{ textAlign: "left", background: "#fff7ed", borderBottom: "1px solid rgba(234, 88, 12, 0.15)" }}>MONTH</th>
                <th style={{ textAlign: "left", background: "#fff7ed", borderBottom: "1px solid rgba(234, 88, 12, 0.15)" }}>PO NO</th>
                <th style={{ textAlign: "left", background: "#fff7ed", borderBottom: "1px solid rgba(234, 88, 12, 0.15)" }}>PO DATE</th>
                <th style={{ textAlign: "left", background: "#fff7ed", borderBottom: "1px solid rgba(234, 88, 12, 0.15)" }}>MATERIAL CODE</th>
                <th style={{ textAlign: "left", background: "#fff7ed", borderBottom: "1px solid rgba(234, 88, 12, 0.15)" }}>MATERIAL NAME</th>
                <th style={{ textAlign: "right", background: "#fff7ed", borderBottom: "1px solid rgba(234, 88, 12, 0.15)" }}>QTY</th>
                <th style={{ textAlign: "right", background: "#fff7ed", borderBottom: "1px solid rgba(234, 88, 12, 0.15)" }}>RATE</th>
                <th style={{ textAlign: "right", background: "#fff7ed", borderBottom: "1px solid rgba(234, 88, 12, 0.15)" }}>PURCHASE VALUE</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrdersSummaryRows.map((row, ri) => (
                <tr key={ri} className="pp1-cc-tbl__tr">
                  <td className="pp1-cc-tbl__bold" style={{ fontWeight: 600 }}>{row.supplier}</td>
                  <td>{row.month}</td>
                  <td>
                    <span style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 600, cursor: "pointer" }}>
                      {row.poNo}
                    </span>
                  </td>
                  <td>{row.poDate}</td>
                  <td style={{ fontWeight: 600, color: "var(--pp1-text-primary, #334155)" }}>{row.code}</td>
                  <td>{row.name}</td>
                  <td style={{ textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{row.qty}</td>
                  <td style={{ textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{row.rate}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#10b981", fontVariantNumeric: "tabular-nums" }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── Sales Analysis helpers (same filter pattern as Customer PO / GRN Value) ── */
function normalizeSalesDate(d) {
  if (!d) return "";
  return String(d).trim().slice(0, 10);
}

function filterSalesRows(rows, filters, defaultFrom, defaultTo) {
  const source = Array.isArray(rows) ? rows : [];
  const activeFrom = filters.fromDate || defaultFrom;
  const activeTo = filters.toDate || defaultTo;

  return source.filter((r) => {
    const invDate = normalizeSalesDate(r.date);
    if (!invDate || invDate < activeFrom || invDate > activeTo) return false;
    if (filters.customer && r.customer !== filters.customer) return false;
    return true;
  });
}

function buildSalesMonthChartData(filteredRows) {
  const monthGroup = {};
  filteredRows.forEach((r) => {
    const key = r.monthName && r.month ? `${r.monthName}|${r.month}` : null;
    if (!key) return;
    const invDate = normalizeSalesDate(r.date);
    if (!monthGroup[key]) {
      monthGroup[key] = {
        name: r.monthName,
        month: r.month,
        year: r.year,
        total: 0,
        minDate: invDate,
      };
    }
    monthGroup[key].total += Number(r.salesValue || 0);
    if (invDate && (!monthGroup[key].minDate || invDate < monthGroup[key].minDate)) {
      monthGroup[key].minDate = invDate;
    }
  });

  return Object.values(monthGroup).sort((a, b) => {
    if (!a.minDate) return 1;
    if (!b.minDate) return -1;
    return a.minDate.localeCompare(b.minDate);
  });
}

function SalesAnalysisReportDashboardView({ data, loading, filters, onFilterChange, onClose, targetConfig, trend }) {
  const [custOpen, setCustOpen] = React.useState(false);
  const custRef = React.useRef(null);
  const [chartType, setChartType] = React.useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (custRef.current && !custRef.current.contains(event.target)) {
        setCustOpen(false);
      }
      if (chartTypeRef.current && !chartTypeRef.current.contains(event.target)) {
        setChartTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = React.useMemo(() => filters.fromDate ? new Date(filters.fromDate) : null, [filters.fromDate]);
  const pickerTo = React.useMemo(() => filters.toDate ? new Date(filters.toDate) : null, [filters.toDate]);

  const handlePickerChange = React.useCallback(({ from, to }) => {
    const fmt = (d) => {
      if (!d) return "";
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    onFilterChange(prev => ({ ...prev, fromDate: fmt(from), toDate: fmt(to) }));
  }, [onFilterChange]);

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      customer: "",
    });
    setChartType("bar");
  };



  const salesRows = React.useMemo(
    () => (Array.isArray(data?.salesAnalysisCompare?.rows) ? data.salesAnalysisCompare.rows : []),
    [data?.salesAnalysisCompare?.rows]
  );

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return {
      from: `${year}-${month}-01`,
      to: `${year}-${month}-${day}`,
    };
  }, []);

  const filteredRows = React.useMemo(
    () => filterSalesRows(salesRows, filters, defaultRange.from, defaultRange.to),
    [salesRows, filters, defaultRange]
  );

  const customers = React.useMemo(() => {
    const names = salesRows.map(r => r.customer).filter(c => c && c !== "—");
    return Array.from(new Set(names)).sort();
  }, [salesRows]);

  const chartMonths = React.useMemo(
    () => buildSalesMonthChartData(filteredRows),
    [filteredRows]
  );

  const kpis = React.useMemo(() => {
    let total = 0;
    const custTotals = {};
    const monthTotals = {};

    filteredRows.forEach((r) => {
      const val = Number(r.salesValue || 0);
      total += val;
      const cust = r.customer || "Unknown";
      custTotals[cust] = (custTotals[cust] || 0) + val;
      if (r.monthName) {
        monthTotals[r.monthName] = (monthTotals[r.monthName] || 0) + val;
      }
    });

    let highestCustomer = "—";
    let highestCustVal = 0;
    Object.entries(custTotals).forEach(([name, val]) => {
      if (val > highestCustVal) {
        highestCustVal = val;
        highestCustomer = name;
      }
    });

    let highestMonth = "—";
    let highestMonthVal = 0;
    Object.entries(monthTotals).forEach(([month, val]) => {
      if (val > highestMonthVal) {
        highestMonthVal = val;
        highestMonth = month;
      }
    });

    const monthCount = chartMonths.length;
    const avg = monthCount > 0 ? total / monthCount : 0;
    const activeCustomers = Object.keys(custTotals).filter((c) => c !== "—").length;

    return [
      { label: "Total Sales", value: loading ? "…" : `₹${total.toFixed(2)}L`, icon: IndianRupee, color: "#10b981" },
      { label: "Highest Customer", value: highestCustVal > 0 ? highestCustomer : "—", icon: Award, color: "#3b82f6" },
      { label: "Highest Month", value: highestMonth !== "—" ? highestMonth : "—", icon: Calendar, color: "#8b5cf6" },
      { label: "Average Sales", value: loading ? "…" : `₹${avg.toFixed(2)}L`, icon: BarChart2, color: "#f59e0b" },
      { label: "Active Customers", value: loading ? "…" : activeCustomers.toString(), icon: Users, color: "#ec4899" }
    ];
  }, [filteredRows, chartMonths.length, loading]);

  const monthTotalsDataset = React.useMemo(() => {
    const totals = chartMonths.map((m) => Number(m.total || 0));
    const palette = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];
    return [{
      label: "Total Sales",
      data: totals,
      backgroundColor: chartMonths.map((_, i) => palette[i % palette.length] + "cc"),
      borderColor: chartMonths.map((_, i) => palette[i % palette.length]),
      borderWidth: 1.5,
      borderRadius: 6,
      borderSkipped: false,
    }];
  }, [chartMonths]);

  const chartRebuildToken = React.useMemo(
    () => `sales-chart|${chartMonths.length}|${JSON.stringify(chartMonths)}|${JSON.stringify(filters)}|${targetConfig?.sales_analysis?.monthlyTarget ?? 150}|${chartType}`,
    [chartMonths, filters, targetConfig?.sales_analysis?.monthlyTarget, chartType]
  );

  const setupChart = React.useCallback((canvas) => {
    const labels = chartMonths.map((m) => m.name);
    const totalData = chartMonths.map((m) => Number(m.total || 0));
    const monthlyTarget = targetConfig?.sales_analysis?.monthlyTarget ?? 150;
    const targetVal = monthlyTarget;
    const maxVal = Math.max(0, targetVal, ...totalData);

    if (chartType === "radar") {
      return new Chart(canvas, {
        type: "radar",
        data: {
          labels,
          datasets: [
            {
              label: "Total Sales",
              data: totalData,
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              borderWidth: 2.5,
              fill: true,
              pointRadius: 4
            },
            {
              label: `Target (₹${targetVal}L/month)`,
              data: labels.map(() => targetVal),
              borderColor: "rgba(239, 68, 68, 0.85)",
              borderDash: [6, 4],
              borderWidth: 1.5,
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: "bottom",
              labels: {
                color: "#475569",
                font: { size: 9, weight: 600 },
                boxWidth: 10,
                padding: 6
              }
            },
            tooltip: {
              backgroundColor: "rgba(15,23,42,0.92)",
              titleColor: "#fff",
              bodyColor: "#cbd5e1",
              padding: 10,
              callbacks: {
                label: (ctx) => {
                  if (ctx.dataset.label?.startsWith("Target")) return ` Target: ₹${targetVal}L/month`;
                  return ` ₹${Number(ctx.raw).toFixed(2)}L  (Total Sales)`;
                }
              }
            }
          },
          scales: {
            r: {
              min: 0,
              suggestedMax: maxVal * 1.1,
              angleLines: { display: true, color: "rgba(0, 0, 0, 0.05)" },
              grid: { circular: true, color: "rgba(0, 0, 0, 0.05)" },
              ticks: { display: true, font: { size: 8 }, backdropColor: "transparent", callback: (v) => `₹${v}L` }
            }
          }
        }
      });
    }

    if (chartType === "polarArea") {
      const palette = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];
      return new Chart(canvas, {
        type: "polarArea",
        data: {
          labels,
          datasets: [
            {
              label: "Total Sales",
              data: totalData,
              backgroundColor: labels.map((_, i) => palette[i % palette.length] + "cc"),
              borderColor: labels.map((_, i) => palette[i % palette.length]),
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: "bottom",
              labels: {
                color: "#475569",
                font: { size: 9, weight: 600 },
                boxWidth: 10,
                padding: 6
              }
            },
            tooltip: {
              backgroundColor: "rgba(15,23,42,0.92)",
              titleColor: "#fff",
              bodyColor: "#cbd5e1",
              padding: 10,
              callbacks: {
                label: (ctx) => ` ₹${Number(ctx.raw).toFixed(2)}L  (Total Sales)`
              }
            }
          },
          scales: {
            r: {
              min: 0,
              suggestedMax: maxVal * 1.1,
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { display: true, font: { size: 8 }, backdropColor: "transparent", callback: (v) => `₹${v}L` }
            }
          }
        }
      });
    }

    const isLine = chartType === "line";
    const isBar = chartType === "bar";
    const isArea = chartType === "area";
    const isStepped = chartType === "stepped";
    const isCombo = chartType === "combo";

    const dataset1Type = isLine || isArea || isStepped ? "line" : "bar";

    const salesTargetLinePlugin = {
      id: "salesAnalysisTargetLine",
      afterDraw: (chart) => {
        const yScale = chart.scales.y;
        const xScale = chart.scales.x;
        if (!yScale || !xScale) return;

        const targetIndex = chart.data.datasets.findIndex((ds) => ds.label?.startsWith("Target"));
        if (targetIndex === -1 || !chart.isDatasetVisible(targetIndex)) return;

        const yPos = yScale.getPixelForValue(targetVal);
        const ctx = chart.ctx;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ef4444";
        ctx.moveTo(xScale.left, yPos);
        ctx.lineTo(xScale.right, yPos);
        ctx.stroke();
        ctx.restore();
      },
    };

    return new Chart(canvas, {
      type: "bar",
      plugins: [salesTargetLinePlugin],
      data: {
        labels,
        datasets: [
          {
            type: dataset1Type,
            label: "Total Sales",
            data: totalData,
            backgroundColor: isArea || isStepped
              ? "rgba(16, 185, 129, 0.25)"
              : (isLine ? "rgba(16, 185, 129, 0.05)" : (monthTotalsDataset[0]?.backgroundColor || "rgba(16, 185, 129, 0.85)")),
            borderColor: monthTotalsDataset[0]?.borderColor || "#10b981",
            borderWidth: isLine || isArea || isStepped ? 2.5 : 1.5,
            borderRadius: isBar || isCombo ? 6 : 0,
            borderSkipped: false,
            fill: isArea || isStepped,
            stepped: isStepped ? "middle" : false,
            pointRadius: isBar || isCombo ? 0 : 4,
            tension: isLine || isArea || isStepped ? 0.25 : 0,
            order: 2,
          },
          {
            type: "line",
            label: `Target (₹${targetVal}L/month)`,
            data: labels.map(() => targetVal),
            borderColor: "#ef4444",
            borderWidth: 0,
            borderDash: [6, 4],
            pointRadius: 0,
            pointHitRadius: 20,
            fill: false,
            tension: 0,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              color: "#475569",
              font: { size: 9, weight: 600 },
              boxWidth: 10,
              padding: 6
            }
          },
          tooltip: {
            backgroundColor: "rgba(15,23,42,0.92)",
            titleColor: "#fff",
            bodyColor: "#cbd5e1",
            padding: 10,
            callbacks: {
              label: (ctx) => {
                if (ctx.dataset.label?.startsWith("Target")) return ` Target: ₹${targetVal}L/month`;
                return ` ₹${Number(ctx.raw).toFixed(2)}L  (Total Sales)`;
              }
            }
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#475569", font: { size: 11, weight: 600 } }
          },
          y: {
            beginAtZero: true,
            suggestedMax: (maxVal > 0 ? maxVal : targetVal) * 1.25,
            grid: { color: "rgba(0,0,0,0.05)" },
            title: { display: true, text: "Total Sales Value (Lakhs)", font: { size: 10, weight: 600 }, color: "#64748b" },
            ticks: { color: "#64748b", callback: (val) => `₹${val}L` }
          }
        }
      }
    });
  }, [chartMonths, monthTotalsDataset, targetConfig, chartType]);

  return (
    <PremiumDashboardView title="Sales Analysis" icon={TrendingUp} color="#10b981" kpis={kpis} setupChart={setupChart} rangeHint="Month Wise Total Sales" onClose={onClose} rebuildToken={chartRebuildToken}>
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range — PlantPerformance1DatePicker (same as Customer PO vs Sales Value) */}
        <div className="pp1-filter-group pp1-filter-group--date-range">
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Customer — custom button dropdown (same as Customer PO vs Sales Value) */}
        <div className="pp1-filter-group" ref={custRef}>
          <label className="pp1-filter-label">Customer</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${custOpen ? "open" : ""}`}
              onClick={() => setCustOpen(o => !o)}
            >
              <span>{filters.customer || "All Customers"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {custOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters.customer ? "selected" : ""}`}
                  onClick={() => { handleInputChange("customer", ""); setCustOpen(false); }}
                >
                  All Customers
                </div>
                {customers.map(c => (
                  <div
                    key={c}
                    className={`pp1-custom-select-option ${filters.customer === c ? "selected" : ""}`}
                    onClick={() => { handleInputChange("customer", c); setCustOpen(false); }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chart Type Dropdown Filter */}
        <div className="pp1-filter-group" ref={chartTypeRef}>
          <label className="pp1-filter-label">Chart Type</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${chartTypeOpen ? "open" : ""}`}
              onClick={() => setChartTypeOpen(o => !o)}
              style={{ minWidth: "135px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {chartType === "bar" ? (
                  <BarChart2 size={12} style={{ color: "#10b981" }} />
                ) : chartType === "area" ? (
                  <AreaChart size={12} style={{ color: "#10b981" }} />
                ) : chartType === "radar" ? (
                  <Radar size={12} style={{ color: "#10b981" }} />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} style={{ color: "#10b981" }} />
                ) : chartType === "stepped" ? (
                  <Activity size={12} style={{ color: "#10b981" }} />
                ) : chartType === "combo" ? (
                  <TrendingUp size={12} style={{ color: "#10b981" }} />
                ) : (
                  <LucideLineChart size={12} style={{ color: "#10b981" }} />
                )}
                <span style={{ textTransform: "capitalize" }}>{chartType === "polarArea" ? "Polar Area" : chartType === "radar" ? "Radar" : chartType === "stepped" ? "Stepped" : chartType}</span>
              </div>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {chartTypeOpen && (
              <div className="pp1-custom-select-options">
                {[
                  { id: "combo", label: "Combo Chart", icon: TrendingUp },
                  { id: "line", label: "Line Chart", icon: LucideLineChart },
                  { id: "bar", label: "Bar Chart", icon: BarChart2 },
                  { id: "area", label: "Area Chart", icon: AreaChart },
                  { id: "radar", label: "Radar Chart", icon: Radar },
                  { id: "polarArea", label: "Polar Area", icon: PieChart },
                  { id: "stepped", label: "Stepped Chart", icon: Activity }
                ].map(opt => (
                  <div
                    key={opt.id}
                    className={`pp1-custom-select-option ${chartType === opt.id ? "selected" : ""}`}
                    onClick={() => {
                      setChartType(opt.id);
                      setChartTypeOpen(false);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <opt.icon size={12} style={{ color: chartType === opt.id ? "#fff" : "#10b981" }} />
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reset */}
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

function SalesAnalysisReportBottomTable({ data, loading, filters }) {
  const [activeTab, setActiveTab] = React.useState("turnover");

  const salesRows = React.useMemo(
    () => (Array.isArray(data?.salesAnalysisCompare?.rows) ? data.salesAnalysisCompare.rows : []),
    [data?.salesAnalysisCompare?.rows]
  );

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return {
      from: `${year}-${month}-01`,
      to: `${year}-${month}-${day}`,
    };
  }, []);

  const filteredRows = React.useMemo(
    () => filterSalesRows(salesRows, filters, defaultRange.from, defaultRange.to),
    [salesRows, filters, defaultRange]
  );

  const uniqueMonths = React.useMemo(() => {
    const monthMinDate = {};
    filteredRows.forEach((r) => {
      const invDate = normalizeSalesDate(r.date);
      const label = r.monthName || r.month;
      if (label && invDate) {
        if (!monthMinDate[label] || invDate < monthMinDate[label]) {
          monthMinDate[label] = invDate;
        }
      }
    });
    return Object.keys(monthMinDate).sort((a, b) => monthMinDate[a].localeCompare(monthMinDate[b]));
  }, [filteredRows]);

  const columnsTurnover = ["Customer Name", ...uniqueMonths.map((m) => `${m} (Lakhs)`), "Total Value (Lakhs)"];

  const rowsTurnover = React.useMemo(() => {
    const custGroups = {};
    filteredRows.forEach((r) => {
      const cust = r.customer || "Unknown";
      const monthLabel = r.monthName || r.month || "—";
      if (!custGroups[cust]) {
        custGroups[cust] = { customer: cust };
        uniqueMonths.forEach((m) => { custGroups[cust][m] = 0; });
      }
      if (custGroups[cust][monthLabel] !== undefined) {
        custGroups[cust][monthLabel] += Number(r.salesValue || 0);
      }
    });

    return Object.values(custGroups)
      .map((group) => {
        const row = [group.customer];
        uniqueMonths.forEach((m) => row.push(group[m] || 0));
        return row;
      })
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredRows, uniqueMonths]);

  const columnsInvoice = ["Month", "Customer", "Invoice No", "Invoice Date", "Sales Value", "Dispatch Value", "Collection Status"];

  const rowsInvoice = React.useMemo(() => {
    return filteredRows
      .map((r) => [
        r.month || "—",
        r.customer || "—",
        r.invoiceNo || "—",
        r.date || "—",
        r.salesValue > 0 ? `₹${Number(r.salesValue).toFixed(2)} L` : "—",
        r.dispatchValue > 0 ? `₹${Number(r.dispatchValue).toFixed(2)} L` : "—",
        r.collectionStatus || "—",
      ])
      .sort((a, b) => (a[3] || "").localeCompare(b[3] || ""));
  }, [filteredRows]);

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
              {rowsTurnover.length === 0 ? (
                <tr><td colSpan={columnsTurnover.length} className="pp1-cc-tbl__empty">No data available.</td></tr>
              ) : (
                rowsTurnover.map((row, ri) => {
                  const totalVal = row.slice(1).reduce((s, v) => s + v, 0);
                  return (
                    <tr key={ri} className="pp1-cc-tbl__tr">
                      <td className="pp1-cc-tbl__bold" style={{ fontWeight: 700 }}>{row[0]}</td>
                      {row.slice(1).map((val, vi) => (
                        <td key={vi} style={{ textAlign: "right", fontWeight: 600 }}>₹{Number(val).toFixed(2)} L</td>
                      ))}
                      <td style={{ textAlign: "right", fontWeight: 600, color: "var(--pp1-blue)" }}>₹{totalVal.toFixed(2)} L</td>
                    </tr>
                  );
                })
              )}
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
              {rowsInvoice.length === 0 ? (
                <tr><td colSpan={columnsInvoice.length} className="pp1-cc-tbl__empty">No data available.</td></tr>
              ) : (
                rowsInvoice.map((row, ri) => (
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
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ProductionAnalysisReportDashboardView({ filters, onFilterChange, onClose, targetConfig }) {
  const [teamOpen, setTeamOpen] = React.useState(false);
  const [machineOpen, setMachineOpen] = React.useState(false);
  const [operatorOpen, setOperatorOpen] = React.useState(false);

  const teamRef = React.useRef(null);
  const machineRef = React.useRef(null);
  const operatorRef = React.useRef(null);

  const [xAxisGroup, setXAxisGroup] = React.useState("Block");

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (teamRef.current && !teamRef.current.contains(event.target)) {
        setTeamOpen(false);
      }
      if (machineRef.current && !machineRef.current.contains(event.target)) {
        setMachineOpen(false);
      }
      if (operatorRef.current && !operatorRef.current.contains(event.target)) {
        setOperatorOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = React.useMemo(() => filters.fromDate ? new Date(filters.fromDate) : null, [filters.fromDate]);
  const pickerTo = React.useMemo(() => filters.toDate ? new Date(filters.toDate) : null, [filters.toDate]);

  const handlePickerChange = ({ from, to }) => {
    const formatDate = (d) => {
      if (!d) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatDate(from),
      toDate: formatDate(to)
    }));
  };

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
      customer: ""
    });
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
      { label: "Total Production Value", value: `₹${(totalVal / 100000).toFixed(2)}L`, icon: IndianRupee, color: "#8b5cf6" },
      { label: "Best Machine", value: bestMach, icon: Cpu, color: "#3b82f6" },
      { label: "Highest Profit", value: `₹${(totalProfitVal / 100000).toFixed(2)}L`, icon: TrendingUp, color: "#10b981" },
      { label: "Average Profit Ratio", value: `${avgProfitRatio.toFixed(1)}%`, icon: Zap, color: "#f97316" },
      { label: "Highest Profitability", value: bestMachProf, icon: Trophy, color: "#ec4899" }
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
    const targetValLakhs = targetConfig?.production_analysis?.minProductionValue ?? 12.0;
    const targetVal = targetValLakhs * 100000;
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
          },
          {
            type: "line",
            label: "Min Production Target",
            data: (chartData.labels || []).map(() => targetVal),
            yAxisID: "yValue",
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
                return ` ${label}: ₹${Number(val).toFixed(2)} L`;
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
  }, [chartData, targetConfig]);

  const teams = ["Team A", "Team B", "Team C"];
  const machines = ["CNC-01", "CNC-02", "VMC-01", "VMC-02", "Grinding-01"];
  const operators = ["Balamurugan.P", "Gopikrishnan.R", "Karthi.S", "Senthil.K"];
  const customers = ["Tata Motors", "Mahindra & Mahindra", "Maruti Suzuki", "Ashok Leyland"];

  return (
    <PremiumDashboardView
      title="Production Value Vs Actual Value"
      icon={Factory}
      color="#8b5cf6"
      kpis={kpis}
      setupChart={setupChart}
      rangeHint="Production Value Product Rate vs Rate Per Hour"
      onClose={onClose}
      rebuildToken={`${xAxisGroup}-${JSON.stringify(chartData)}`}
      chartControls={
        <div className="pp1-chart-toolbar" style={{ padding: "8px 12px", background: "rgba(139, 92, 246, 0.05)", borderRadius: "8px", border: "1px dashed rgba(139, 92, 246, 0.2)", margin: 0 }}>
          <span className="pp1-chart-xaxis__label">Chart X-Axis:</span>
          <div className="pp1-chart-xaxis">
            {["Block", "Machine", "Operator"].map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setXAxisGroup(g)}
                className={`pp1-xaxis-btn${xAxisGroup === g ? " pp1-xaxis-btn--active" : ""}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range — PlantPerformance1DatePicker (same as Customer PO vs Sales Value) */}
        <div className="pp1-filter-group pp1-filter-group--date-range">
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Team Dropdown */}
        <div className="pp1-filter-group" ref={teamRef}>
          <label className="pp1-filter-label">Team</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${teamOpen ? "open" : ""}`}
              onClick={() => setTeamOpen(o => !o)}
            >
              <span>{filters.team || "All Teams"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {teamOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters.team ? "selected" : ""}`}
                  onClick={() => { handleInputChange("team", ""); setTeamOpen(false); }}
                >
                  All Teams
                </div>
                {teams.map(t => (
                  <div
                    key={t}
                    className={`pp1-custom-select-option ${filters.team === t ? "selected" : ""}`}
                    onClick={() => { handleInputChange("team", t); setTeamOpen(false); }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Machine Dropdown */}
        <div className="pp1-filter-group" ref={machineRef}>
          <label className="pp1-filter-label">Machine</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${machineOpen ? "open" : ""}`}
              onClick={() => setMachineOpen(o => !o)}
            >
              <span>{filters.machine || "All Machines"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {machineOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters.machine ? "selected" : ""}`}
                  onClick={() => { handleInputChange("machine", ""); setMachineOpen(false); }}
                >
                  All Machines
                </div>
                {machines.map(m => (
                  <div
                    key={m}
                    className={`pp1-custom-select-option ${filters.machine === m ? "selected" : ""}`}
                    onClick={() => { handleInputChange("machine", m); setMachineOpen(false); }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Operator Dropdown */}
        <div className="pp1-filter-group" ref={operatorRef}>
          <label className="pp1-filter-label">Operator</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${operatorOpen ? "open" : ""}`}
              onClick={() => setOperatorOpen(o => !o)}
            >
              <span>{filters.operator || "All Operators"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {operatorOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters.operator ? "selected" : ""}`}
                  onClick={() => { handleInputChange("operator", ""); setOperatorOpen(false); }}
                >
                  All Operators
                </div>
                {operators.map(o => (
                  <div
                    key={o}
                    className={`pp1-custom-select-option ${filters.operator === o ? "selected" : ""}`}
                    onClick={() => { handleInputChange("operator", o); setOperatorOpen(false); }}
                  >
                    {o}
                  </div>
                ))}
              </div>
            )}
          </div>
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
  // June 2026
  { date: "2026-06-15", machine: "CNC1", machineType: "CNC", operator: "Balamurugan.P", reason: "No Load", shift: "A Shift", duration: 250, perMonth: 20.83, ratePerHour: 600 },
  { date: "2026-06-15", machine: "VMC7", machineType: "VMC", operator: "Karthi.S", reason: "Under Maintenance", shift: "A Shift", duration: 480, perMonth: 40.00, ratePerHour: 750 },
  { date: "2026-06-14", machine: "CNC2", machineType: "CNC", operator: "Gopikrishnan.R", reason: "No Operator", shift: "B Shift", duration: 950, perMonth: 79.17, ratePerHour: 540 },
  { date: "2026-06-13", machine: "HMC9", machineType: "HMC", operator: "Sankar", reason: "No Load", shift: "B Shift", duration: 270, perMonth: 22.50, ratePerHour: 980 },
  { date: "2026-06-12", machine: "VTL3", machineType: "VTL", operator: "Senthil.K", reason: "Break Down", shift: "C Shift", duration: 320, perMonth: 26.67, ratePerHour: 320 },
  { date: "2026-06-11", machine: "CNC1", machineType: "CNC", operator: "Balamurugan.P", reason: "No Operator", shift: "A Shift", duration: 150, perMonth: 20.83, ratePerHour: 600 },
  { date: "2026-06-10", machine: "VMC7", machineType: "VMC", operator: "Karthi.S", reason: "Break Down", shift: "C Shift", duration: 180, perMonth: 40.00, ratePerHour: 750 },
  { date: "2026-06-09", machine: "HMC9", machineType: "HMC", operator: "Sankar", reason: "Under Maintenance", shift: "B Shift", duration: 310, perMonth: 22.50, ratePerHour: 980 },

  // May 2026
  { date: "2026-05-18", machine: "CNC1", machineType: "CNC", operator: "Balamurugan.P", reason: "No Load", shift: "A Shift", duration: 210, perMonth: 17.50, ratePerHour: 600 },
  { date: "2026-05-15", machine: "CNC2", machineType: "CNC", operator: "Gopikrishnan.R", reason: "No Operator", shift: "B Shift", duration: 880, perMonth: 73.33, ratePerHour: 540 },
  { date: "2026-05-12", machine: "VMC7", machineType: "VMC", operator: "Karthi.S", reason: "Break Down", shift: "A Shift", duration: 220, perMonth: 18.33, ratePerHour: 750 },
  { date: "2026-05-08", machine: "HMC9", machineType: "HMC", operator: "Sankar", reason: "Under Maintenance", shift: "C Shift", duration: 400, perMonth: 33.33, ratePerHour: 980 },

  // April 2026
  { date: "2026-04-20", machine: "VTL3", machineType: "VTL", operator: "Senthil.K", reason: "Break Down", shift: "C Shift", duration: 450, perMonth: 37.50, ratePerHour: 320 },
  { date: "2026-04-15", machine: "CNC1", machineType: "CNC", operator: "Balamurugan.P", reason: "No Operator", shift: "B Shift", duration: 180, perMonth: 15.00, ratePerHour: 600 },
  { date: "2026-04-10", machine: "VMC7", machineType: "VMC", operator: "Karthi.S", reason: "Under Maintenance", shift: "A Shift", duration: 520, perMonth: 43.33, ratePerHour: 750 },
  { date: "2026-04-05", machine: "HMC9", machineType: "HMC", operator: "Sankar", reason: "No Load", shift: "B Shift", duration: 300, perMonth: 25.00, ratePerHour: 980 },

  // March 2026
  { date: "2026-03-25", machine: "CNC2", machineType: "CNC", operator: "Gopikrishnan.R", reason: "No Operator", shift: "A Shift", duration: 920, perMonth: 76.67, ratePerHour: 540 },
  { date: "2026-03-20", machine: "VTL3", machineType: "VTL", operator: "Senthil.K", reason: "No Load", shift: "B Shift", duration: 280, perMonth: 23.33, ratePerHour: 320 },
  { date: "2026-03-12", machine: "CNC1", machineType: "CNC", operator: "Balamurugan.P", reason: "Under Maintenance", shift: "C Shift", duration: 390, perMonth: 32.50, ratePerHour: 600 },
  { date: "2026-03-05", machine: "VMC7", machineType: "VMC", operator: "Karthi.S", reason: "Break Down", shift: "A Shift", duration: 310, perMonth: 25.83, ratePerHour: 750 },

  // February 2026
  { date: "2026-02-22", machine: "HMC9", machineType: "HMC", operator: "Sankar", reason: "Break Down", shift: "B Shift", duration: 190, perMonth: 15.83, ratePerHour: 980 },
  { date: "2026-02-15", machine: "CNC1", machineType: "CNC", operator: "Balamurugan.P", reason: "No Operator", shift: "A Shift", duration: 140, perMonth: 11.67, ratePerHour: 600 },
  { date: "2026-02-10", machine: "CNC2", machineType: "CNC", operator: "Gopikrishnan.R", reason: "No Load", shift: "C Shift", duration: 310, perMonth: 25.83, ratePerHour: 540 },

  // January 2026
  { date: "2026-01-20", machine: "VTL3", machineType: "VTL", operator: "Senthil.K", reason: "Under Maintenance", shift: "A Shift", duration: 600, perMonth: 50.00, ratePerHour: 320 },
  { date: "2026-01-15", machine: "CNC1", machineType: "CNC", operator: "Balamurugan.P", reason: "No Load", shift: "B Shift", duration: 240, perMonth: 20.00, ratePerHour: 600 },
  { date: "2026-01-08", machine: "HMC9", machineType: "HMC", operator: "Sankar", reason: "No Operator", shift: "C Shift", duration: 420, perMonth: 35.00, ratePerHour: 980 }
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
  const [machOpen, setMachOpen] = React.useState(false);
  const [operOpen, setOperOpen] = React.useState(false);
  const [reasonOpen, setReasonOpen] = React.useState(false);
  const machRef = React.useRef(null);
  const operRef = React.useRef(null);
  const reasonRef = React.useRef(null);

  const activeChart = activeTab === "chart2" ? 1 : 0;

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (machRef.current && !machRef.current.contains(event.target)) {
        setMachOpen(false);
      }
      if (operRef.current && !operRef.current.contains(event.target)) {
        setOperOpen(false);
      }
      if (reasonRef.current && !reasonRef.current.contains(event.target)) {
        setReasonOpen(false);
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
      operator: "",
      idleReason: "",
    });
    setMachOpen(false);
    setOperOpen(false);
    setReasonOpen(false);
  };

  const pickerFrom = React.useMemo(() => {
    if (filters.fromDate) return new Date(filters.fromDate);
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, [filters.fromDate]);

  const pickerTo = React.useMemo(() => {
    if (filters.toDate) return new Date(filters.toDate);
    return new Date();
  }, [filters.toDate]);

  const handlePickerChange = React.useCallback(({ from, to }) => {
    const formatLocalDate = (d) => {
      if (!d) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatLocalDate(from),
      toDate: formatLocalDate(to)
    }));
  }, [onFilterChange]);

  const filteredLogs = React.useMemo(() => {
    let list = MOCK_IDLE_LOGS;
    if (filters.fromDate) list = list.filter(r => r.date >= filters.fromDate);
    if (filters.toDate) list = list.filter(r => r.date <= filters.toDate);
    if (filters.operator) list = list.filter(r => r.operator === filters.operator);
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
    if (filters.operator) listMonthly = listMonthly.filter(r => r.operator === filters.operator);
    if (filters.machine) listMonthly = listMonthly.filter(r => r.machine === filters.machine);
    if (filters.idleReason) listMonthly = listMonthly.filter(r => r.reason === filters.idleReason);
    const monthlySum = listMonthly.reduce((s, r) => s + (r.duration / 12), 0);

    return [
      { label: "Total Idle Hours", value: `${totalIdleHours.toFixed(1)} h`, icon: Timer, color: "#ef4444" },
      { label: "Total Loss Value", value: `₹${(totalLossValue / 100000).toFixed(3)} L`, icon: IndianRupee, color: "#ea580c" },
      { label: "Highest Loss Machine", value: highestLossMachine, icon: Settings, color: "#3b82f6" },
      { label: "Highest Loss Reason", value: highestLossReason, icon: AlertTriangle, color: "#f59e0b" }
    ];
  }, [filteredLogs, filters.fromDate, filters.operator, filters.machine, filters.idleReason]);

  const [xAxisGroup, setXAxisGroup] = React.useState("Month Wise");

  const chart1Data = React.useMemo(() => {
    if (xAxisGroup === "Month Wise") {
      const groups = {};
      filteredLogs.forEach(r => {
        if (!r.date) return;
        const yrMo = r.date.substring(0, 7); // "YYYY-MM"
        if (!groups[yrMo]) {
          groups[yrMo] = { idleHours: 0, loss: 0 };
        }
        groups[yrMo].idleHours += r.duration;
        groups[yrMo].loss += (r.duration * r.ratePerHour) / 100000;
      });

      const sortedKeys = Object.keys(groups).sort();
      if (sortedKeys.length === 0) {
        return { labels: [], idleHours: [], loss: [] };
      }

      const monthNames = {
        "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
        "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"
      };

      const labels = sortedKeys.map(k => {
        const [yr, mo] = k.split("-");
        const shortYear = yr.substring(2);
        return `${monthNames[mo] || mo} ${shortYear}`;
      });

      const idleHours = sortedKeys.map(k => Number(groups[k].idleHours.toFixed(1)));
      const loss = sortedKeys.map(k => Number(groups[k].loss.toFixed(3)));

      return { labels, idleHours, loss };
    } else {
      // Group by Machine ("Mac Wise") - monthwise overall mac idle (using monthly averages based on unique filtered months count)
      const uniqueMonths = new Set(filteredLogs.map(r => r.date ? r.date.substring(0, 7) : null).filter(Boolean));
      const numMonths = Math.max(1, uniqueMonths.size);

      const groups = {};
      filteredLogs.forEach(r => {
        if (!r.machine) return;
        const key = r.machine;
        if (!groups[key]) {
          groups[key] = { idleHours: 0, loss: 0 };
        }
        groups[key].idleHours += (r.duration / numMonths);
        groups[key].loss += ((r.duration * r.ratePerHour) / 100000) / numMonths;
      });

      const sortedKeys = Object.keys(groups).sort();
      if (sortedKeys.length === 0) {
        return { labels: [], idleHours: [], loss: [] };
      }

      const labels = sortedKeys;
      const idleHours = sortedKeys.map(k => Number(groups[k].idleHours.toFixed(1)));
      const loss = sortedKeys.map(k => Number(groups[k].loss.toFixed(3)));

      return { labels, idleHours, loss };
    }
  }, [filteredLogs, xAxisGroup]);

  const setupChart1 = React.useCallback((canvas) => {
    const ctx = canvas.getContext("2d");
    const maxIdleHours = targetConfig?.idle_hours?.maxIdleHours ?? 15;
    return new Chart(ctx, {
      data: {
        labels: chart1Data.labels,
        datasets: [
          {
            type: "bar",
            label: "Idle Hours",
            data: chart1Data.idleHours,
            yAxisID: "yIdle",
            backgroundColor: "rgba(59, 130, 246, 0.75)",
            borderColor: "#3b82f6",
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

  const operators = ["Balamurugan.P", "Gopikrishnan.R", "Karthi.S", "Senthil.K", "Sankar"];
  const machines = ["CNC1", "VMC7", "CNC2", "HMC9", "VTL3"];
  const idleReasons = ["No Load", "Under Maintenance", "No Operator", "Break Down"];

  const carouselControls = (
    <div className="pp1-dt-card" style={{ padding: "14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)", background: "#fff", marginTop: "10px" }}>
      <div className="pp1-chart-toolbar">
        <div className="pp1-chart-toolbar__title">
          {xAxisGroup === "Month Wise" ? "Month Wise Overall Idle Hours & Loss" : "Monthwise Overall Mac Idle & Loss"}
        </div>
        <div className="pp1-chart-xaxis">
          <span className="pp1-chart-xaxis__label">Chart X-Axis:</span>
          {["Month Wise", "Mac Wise"].map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setXAxisGroup(g)}
              className={`pp1-xaxis-btn${xAxisGroup === g ? " pp1-xaxis-btn--active" : ""}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <div className="pp1-dt-chart-wrap" style={{ height: 220, position: "relative" }}>
        <ChartJsCanvas setup={setupChart1} height={220} rebuildToken={`c1-${xAxisGroup}-${JSON.stringify(chart1Data)}`} />
      </div>
    </div>
  );

  return (
    <PremiumDashboardView
      title="Idle Hours"
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
        <div className="pp1-filter-group pp1-filter-group--date-range">
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Machine Dropdown */}
        <div className="pp1-filter-group" ref={machRef}>
          <label className="pp1-filter-label">Machine</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${machOpen ? "open" : ""}`}
              onClick={() => setMachOpen(o => !o)}
            >
              <span>{filters.machine || "All Machines"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {machOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters.machine ? "selected" : ""}`}
                  onClick={() => {
                    handleInputChange("machine", "");
                    setMachOpen(false);
                  }}
                >
                  All Machines
                </div>
                {machines.map(m => (
                  <div
                    key={m}
                    className={`pp1-custom-select-option ${filters.machine === m ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("machine", m);
                      setMachOpen(false);
                    }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Operator Dropdown */}
        <div className="pp1-filter-group" ref={operRef}>
          <label className="pp1-filter-label">Operator</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${operOpen ? "open" : ""}`}
              onClick={() => setOperOpen(o => !o)}
            >
              <span>{filters.operator || "All Operators"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {operOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters.operator ? "selected" : ""}`}
                  onClick={() => {
                    handleInputChange("operator", "");
                    setOperOpen(false);
                  }}
                >
                  All Operators
                </div>
                {operators.map(op => (
                  <div
                    key={op}
                    className={`pp1-custom-select-option ${filters.operator === op ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("operator", op);
                      setOperOpen(false);
                    }}
                  >
                    {op}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Idle Reason Dropdown */}
        <div className="pp1-filter-group" ref={reasonRef}>
          <label className="pp1-filter-label">Idle Reason</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${reasonOpen ? "open" : ""}`}
              onClick={() => setReasonOpen(o => !o)}
            >
              <span>{filters.idleReason || "All Reasons"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {reasonOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters.idleReason ? "selected" : ""}`}
                  onClick={() => {
                    handleInputChange("idleReason", "");
                    setReasonOpen(false);
                  }}
                >
                  All Reasons
                </div>
                {idleReasons.map(r => (
                  <div
                    key={r}
                    className={`pp1-custom-select-option ${filters.idleReason === r ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("idleReason", r);
                      setReasonOpen(false);
                    }}
                  >
                    {r}
                  </div>
                ))}
              </div>
            )}
          </div>
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

function IdleHoursReportBottomTable({ filters }) {

  const filteredLogs = React.useMemo(() => {
    let list = MOCK_IDLE_LOGS;
    if (filters?.fromDate) list = list.filter(r => r.date >= filters.fromDate);
    if (filters?.toDate) list = list.filter(r => r.date <= filters.toDate);
    if (filters?.operator) list = list.filter(r => r.operator === filters.operator);
    if (filters?.machine) list = list.filter(r => r.machine === filters.machine);
    if (filters?.idleReason) list = list.filter(r => r.reason === filters.idleReason);
    return list;
  }, [filters]);

  // Tab 1 Data
  const columns1 = ["Operator", "Machine", "Idle Reason", "Ideal Hours", "Per Month", "Rate Per Hour", "Production Loss (Lakhs)"];
  const rows1 = React.useMemo(() => {
    return filteredLogs.map(r => [
      r.operator,
      r.machine,
      r.reason,
      `${r.duration} h`,
      `${(r.duration / 12).toFixed(2)} h`,
      `₹${r.ratePerHour.toLocaleString()}`,
      `₹${((r.duration * r.ratePerHour) / 100000).toFixed(3)} L`
    ]);
  }, [filteredLogs]);

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "18px", borderBottom: "1px solid rgba(0,0,0,0.08)", width: "100%", paddingBottom: "4px" }}>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              borderBottom: "2.5px solid var(--pp1-blue)",
              color: "var(--pp1-blue)",
              fontWeight: 700,
              fontSize: "12px",
              paddingBottom: "6px",
              cursor: "default"
            }}
          >
            Idle Hours vs Production Loss Value
          </button>
        </div>
      </div>

      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
          <thead>
            <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
              {columns1.map((col, idx) => (
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
            {rows1.length === 0 ? (
              <tr>
                <td colSpan={columns1.length} className="pp1-cc-tbl__empty">
                  No data available.
                </td>
              </tr>
            ) : (
              rows1.map((row, ri) => (
                <tr key={ri} className="pp1-cc-tbl__tr">
                  {row.map((cell, ci) => {
                    const isRightAligned = ci > 2 && (
                      columns1[ci].toLowerCase().includes("qty") ||
                      columns1[ci].toLowerCase().includes("value") ||
                      columns1[ci].toLowerCase().includes("hours") ||
                      columns1[ci].toLowerCase().includes("hour") ||
                      columns1[ci].toLowerCase().includes("rate") ||
                      columns1[ci].toLowerCase().includes("ratio") ||
                      columns1[ci].toLowerCase().includes("%") ||
                      columns1[ci].toLowerCase().includes("day") ||
                      columns1[ci].toLowerCase().includes("month") ||
                      columns1[ci].toLowerCase().includes("loss")
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
      title="Idle Hours – Non Accepted Reason Production Loss"
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

function OeeComparisonReportDashboardView({ filters, onFilterChange, activeTab, onActiveTabChange, onClose, targetConfig, xAxisGroup, setXAxisGroup }) {
  const [machineTypeOpen, setMachineTypeOpen] = React.useState(false);
  const [machineOpen, setMachineOpen] = React.useState(false);

  const machineTypeRef = React.useRef(null);
  const machineRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (machineTypeRef.current && !machineTypeRef.current.contains(event.target)) {
        setMachineTypeOpen(false);
      }
      if (machineRef.current && !machineRef.current.contains(event.target)) {
        setMachineOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = React.useMemo(() => filters.fromDate ? new Date(filters.fromDate) : null, [filters.fromDate]);
  const pickerTo = React.useMemo(() => filters.toDate ? new Date(filters.toDate) : null, [filters.toDate]);

  const handlePickerChange = React.useCallback(({ from, to }) => {
    const fmt = (d) => {
      if (!d) return "";
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    onFilterChange(prev => ({ ...prev, fromDate: fmt(from), toDate: fmt(to) }));
  }, [onFilterChange]);

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

    const dayWiseLabels = ["01-Jun", "02-Jun", "03-Jun", "04-Jun", "05-Jun", "06-Jun", "07-Jun", "08-Jun", "09-Jun", "10-Jun", "11-Jun", "12-Jun"];
    const dayWiseBaseData = {
      CNC1: [78, 85, 82, 80, 79, 74, 76, 81, 84, 89, 75, 78],
      CNC2: [72, 79, 81, 83, 76, 70, 72, 75, 80, 85, 71, 74],
      DRL1: [85, 91, 89, 87, 83, 78, 80, 83, 87, 92, 81, 85],
      LATHE1: [80, 86, 84, 82, 81, 76, 78, 81, 85, 90, 78, 81]
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

    const types = { CNC1: "CNC", CNC2: "CNC", DRL1: "Conventional", LATHE1: "Conventional" };

    const activeMachines = machinesList.filter(m => {
      if (filters?.machineType && types[m] !== filters.machineType) return false;
      if (filters?.machine && m !== filters.machine) return false;
      return true;
    });

    let labels = [];
    if (xAxisGroup === "Month Wise") {
      labels = months;
      if (activeMachines.length > 0) {
        const avgData = months.map((_, idx) => {
          let sum = 0;
          activeMachines.forEach(m => {
            sum += (baseData[m][idx] + offset);
          });
          return Math.min(100, Math.max(0, Math.round(sum / activeMachines.length)));
        });
        datasets.push({
          label: "Overall OEE %",
          data: avgData,
          backgroundColor: "rgba(14, 165, 233, 0.75)",
          borderColor: "#0ea5e9",
          borderWidth: 1.5,
          borderRadius: 5
        });
      }
    } else if (xAxisGroup === "Day Wise") {
      labels = dayWiseLabels;
      if (activeMachines.length > 0) {
        const avgData = dayWiseLabels.map((_, idx) => {
          let sum = 0;
          activeMachines.forEach(m => {
            sum += (dayWiseBaseData[m][idx] + offset);
          });
          return Math.min(100, Math.max(0, Math.round(sum / activeMachines.length)));
        });
        datasets.push({
          label: "Overall OEE %",
          data: avgData,
          backgroundColor: "rgba(14, 165, 233, 0.75)",
          borderColor: "#0ea5e9",
          borderWidth: 1.5,
          borderRadius: 5
        });
      }
    } else if (xAxisGroup === "Mac Wise") {
      labels = activeMachines;
      if (activeMachines.length > 0) {
        const macOee = activeMachines.map(m => {
          let sum = baseData[m].reduce((a, b) => a + b, 0);
          let avg = Math.round(sum / baseData[m].length) + offset;
          return Math.min(100, Math.max(0, avg));
        });
        datasets.push({
          label: "Overall OEE %",
          data: macOee,
          backgroundColor: "rgba(14, 165, 233, 0.75)",
          borderColor: "#0ea5e9",
          borderWidth: 1.5,
          borderRadius: 5
        });
      }
    } else if (xAxisGroup === "Team Wise") {
      labels = ["Team A", "Team B", "Team C"];
      const teamData = {
        "Team A": ["CNC1", "CNC2"],
        "Team B": ["DRL1"],
        "Team C": ["LATHE1"]
      };
      const teamOees = ["Team A", "Team B", "Team C"].map(team => {
        const teamMachines = teamData[team].filter(m => activeMachines.includes(m));
        if (teamMachines.length === 0) return 0;
        let total = 0;
        teamMachines.forEach(m => {
          let sum = baseData[m].reduce((a, b) => a + b, 0);
          total += (sum / baseData[m].length);
        });
        return Math.min(100, Math.max(0, Math.round((total / teamMachines.length) + offset)));
      });
      datasets.push({
        label: "Overall OEE %",
        data: teamOees,
        backgroundColor: "rgba(14, 165, 233, 0.75)",
        borderColor: "#0ea5e9",
        borderWidth: 1.5,
        borderRadius: 5
      });
    }

    return { labels, datasets };
  }, [filters, xAxisGroup]);

  const setupChart1 = React.useCallback((canvas) => {
    let minUtilization = 75;
    if (xAxisGroup === "Month Wise") {
      minUtilization = targetConfig?.oee_comparison?.monthWiseTarget ?? targetConfig?.oee_comparison?.minUtilization ?? 75;
    } else if (xAxisGroup === "Day Wise") {
      minUtilization = targetConfig?.oee_comparison?.dayWiseTarget ?? targetConfig?.oee_comparison?.minUtilization ?? 75;
    } else if (xAxisGroup === "Mac Wise") {
      minUtilization = targetConfig?.oee_comparison?.macWiseTarget ?? targetConfig?.oee_comparison?.minUtilization ?? 75;
    } else if (xAxisGroup === "Team Wise") {
      minUtilization = targetConfig?.oee_comparison?.teamWiseTarget ?? targetConfig?.oee_comparison?.minUtilization ?? 75;
    }
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
  }, [chart1Data, targetConfig, xAxisGroup]);

  const carouselControls = (
    <div className="pp1-dt-card" style={{ padding: "14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)", background: "#fff", marginTop: "10px" }}>
      <div className="pp1-chart-toolbar">
        <div className="pp1-chart-toolbar__title">
          {xAxisGroup === "Month Wise" && "Month Wise Overall OEE %"}
          {xAxisGroup === "Day Wise" && "Day Wise Overall OEE %"}
          {xAxisGroup === "Mac Wise" && "Machine Wise Overall OEE %"}
          {xAxisGroup === "Team Wise" && "Team Wise Overall OEE %"}
        </div>
        <div className="pp1-chart-xaxis">
          <span className="pp1-chart-xaxis__label">Chart X-Axis:</span>
          {["Month Wise", "Day Wise", "Mac Wise", "Team Wise"].map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setXAxisGroup(g)}
              className={`pp1-xaxis-btn${xAxisGroup === g ? " pp1-xaxis-btn--active" : ""}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <div className="pp1-dt-chart-wrap" style={{ height: 220, position: "relative" }}>
        <ChartJsCanvas setup={setupChart1} height={220} rebuildToken={`comp1-${xAxisGroup}-${JSON.stringify(filters)}`} />
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
      title="OEE"
      icon={TrendingUp}
      color="#0ea5e9"
      kpis={null}
      setupChart={null}
      chartControls={carouselControls}
      rangeHint="OEE Parameters Comparison"
      onClose={onClose}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range — PlantPerformance1DatePicker (same as Customer PO vs Sales Value) */}
        <div className="pp1-filter-group pp1-filter-group--date-range">
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>


        {/* Machine Type Filter */}
        <div className="pp1-filter-group" ref={machineTypeRef}>
          <label className="pp1-filter-label">Machine Type</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${machineTypeOpen ? "open" : ""}`}
              onClick={() => setMachineTypeOpen(o => !o)}
            >
              <span>{filters?.machineType || "All Types"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {machineTypeOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters?.machineType ? "selected" : ""}`}
                  onClick={() => { handleInputChange("machineType", ""); setMachineTypeOpen(false); }}
                >
                  All Types
                </div>
                {machineTypes.map(mt => (
                  <div
                    key={mt}
                    className={`pp1-custom-select-option ${filters?.machineType === mt ? "selected" : ""}`}
                    onClick={() => { handleInputChange("machineType", mt); setMachineTypeOpen(false); }}
                  >
                    {mt}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Machine No Filter */}
        <div className="pp1-filter-group" ref={machineRef}>
          <label className="pp1-filter-label">Machine No</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${machineOpen ? "open" : ""}`}
              onClick={() => setMachineOpen(o => !o)}
            >
              <span>{filters?.machine || "All Machines"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {machineOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters?.machine ? "selected" : ""}`}
                  onClick={() => { handleInputChange("machine", ""); setMachineOpen(false); }}
                >
                  All Machines
                </div>
                {machines.map(m => (
                  <div
                    key={m}
                    className={`pp1-custom-select-option ${filters?.machine === m ? "selected" : ""}`}
                    onClick={() => { handleInputChange("machine", m); setMachineOpen(false); }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            )}
          </div>
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

function OeeComparisonReportBottomTable({ filters, xAxisGroup = "Month Wise" }) {
  const baseMachines = [
    { type: "CNC", name: "CNC1", baseVal: 67, monthly: [85, 96, 70, 69, 67, 66, 65, 75, 85, 96, 61] },
    { type: "CNC", name: "CNC2", baseVal: 80, monthly: [70, 84, 94, 87, 80, 73, 66, 59, 52, 45, 97] },
    { type: "Conventional", name: "DRL1", baseVal: 53, monthly: [95, 89, 72, 62, 53, 43, 68, 93, 48, 68, 51] },
    { type: "Conventional", name: "LATHE1", baseVal: 53, monthly: [78, 82, 87, 91, 53, 73, 68, 63, 58, 53, 96] }
  ];

  const dayWiseBaseData = {
    CNC1: [78, 85, 82, 80, 79, 74, 76, 81, 84, 89, 75, 78],
    CNC2: [72, 79, 81, 83, 76, 70, 72, 75, 80, 85, 71, 74],
    DRL1: [85, 91, 89, 87, 83, 78, 80, 83, 87, 92, 81, 85],
    LATHE1: [80, 86, 84, 82, 81, 76, 78, 81, 85, 90, 78, 81]
  };

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
      monthlyVals: m.monthly.map(v => Math.min(100, Math.max(0, v + offset))),
      dayWiseVals: (dayWiseBaseData[m.name] || []).map(v => Math.min(100, Math.max(0, v + offset)))
    }));
  }, [filters]);

  const activeColumns = React.useMemo(() => {
    if (xAxisGroup === "Month Wise") {
      return [
        "Machine No",
        "Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25", "Sep-25", "Oct-25", "Nov-25", "Dec-25", "Jan-26", "Feb-26"
      ];
    } else if (xAxisGroup === "Day Wise") {
      return [
        "Machine No",
        "01-Jun", "02-Jun", "03-Jun", "04-Jun", "05-Jun", "06-Jun", "07-Jun", "08-Jun", "09-Jun", "10-Jun", "11-Jun", "12-Jun"
      ];
    } else if (xAxisGroup === "Mac Wise") {
      return ["Machine No", "Overall OEE %", "Availability %", "Performance %", "Quality %"];
    } else {
      return ["Team Name", "Overall OEE %", "Availability %", "Performance %", "Quality %"];
    }
  }, [xAxisGroup]);

  const activeRows = React.useMemo(() => {
    if (xAxisGroup === "Month Wise") {
      const list = processedData.map(m => [
        m.name,
        ...m.monthlyVals.map(v => `${v}%`)
      ]);

      if (processedData.length > 0) {
        const numMonths = processedData[0].monthlyVals.length;
        const overallAvg = [];
        for (let idx = 0; idx < numMonths; idx++) {
          let sum = 0;
          processedData.forEach(m => {
            sum += m.monthlyVals[idx];
          });
          overallAvg.push(`${Math.round(sum / processedData.length)}%`);
        }
        list.push(["Overall OEE %", ...overallAvg]);
      }
      return list;
    } else if (xAxisGroup === "Day Wise") {
      const list = processedData.map(m => [
        m.name,
        ...m.dayWiseVals.map(v => `${v}%`)
      ]);

      if (processedData.length > 0) {
        const numDays = processedData[0].dayWiseVals.length;
        const overallAvg = [];
        for (let idx = 0; idx < numDays; idx++) {
          let sum = 0;
          processedData.forEach(m => {
            sum += m.dayWiseVals[idx];
          });
          overallAvg.push(`${Math.round(sum / processedData.length)}%`);
        }
        list.push(["Overall OEE %", ...overallAvg]);
      }
      return list;
    } else if (xAxisGroup === "Mac Wise") {
      const list = processedData.map(m => {
        const oeeVal = m.val;
        const avail = Math.min(100, oeeVal + 5);
        const perf = Math.min(100, oeeVal + 8);
        const qual = Math.min(100, oeeVal + 12);
        return [m.name, `${oeeVal}%`, `${avail}%`, `${perf}%`, `${qual}%`];
      });

      if (processedData.length > 0) {
        const avgOee = Math.round(processedData.reduce((acc, m) => acc + m.val, 0) / processedData.length);
        const avgAvail = Math.min(100, avgOee + 5);
        const avgPerf = Math.min(100, avgOee + 8);
        const avgQual = Math.min(100, avgOee + 12);
        list.push(["Overall Average", `${avgOee}%`, `${avgAvail}%`, `${avgPerf}%`, `${avgQual}%`]);
      }
      return list;
    } else {
      const teamData = {
        "Team A": ["CNC1", "CNC2"],
        "Team B": ["DRL1"],
        "Team C": ["LATHE1"]
      };
      const list = ["Team A", "Team B", "Team C"].map(team => {
        const teamMachines = teamData[team].filter(t => processedData.some(p => p.name === t));
        if (teamMachines.length === 0) {
          return [team, "0%", "0%", "0%", "0%"];
        }
        let oeeSum = 0;
        teamMachines.forEach(t => {
          const mObj = processedData.find(p => p.name === t);
          if (mObj) oeeSum += mObj.val;
        });
        const teamOee = Math.round(oeeSum / teamMachines.length);
        const teamAvail = Math.min(100, teamOee + 5);
        const teamPerf = Math.min(100, teamOee + 8);
        const teamQual = Math.min(100, teamOee + 12);
        return [team, `${teamOee}%`, `${teamAvail}%`, `${teamPerf}%`, `${teamQual}%`];
      });

      if (processedData.length > 0) {
        const avgOee = Math.round(processedData.reduce((acc, m) => acc + m.val, 0) / processedData.length);
        const avgAvail = Math.min(100, avgOee + 5);
        const avgPerf = Math.min(100, avgOee + 8);
        const avgQual = Math.min(100, avgOee + 12);
        list.push(["Overall Average", `${avgOee}%`, `${avgAvail}%`, `${avgPerf}%`, `${avgQual}%`]);
      }
      return list;
    }
  }, [processedData, xAxisGroup]);

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
          <thead>
            <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
              {activeColumns.map((col, idx) => {
                const isRightAligned = idx > 0 && (
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
                      activeColumns[ci].toLowerCase().includes("loss") ||
                      activeColumns[ci].includes("-2") ||
                      activeColumns[ci].toLowerCase().includes("oee")
                    );
                    const isOverallRow = row[0] === "Overall OEE %" || row[0] === "Overall Average";
                    return (
                      <td
                        key={ci}
                        className={ci === 0 || isOverallRow ? "pp1-cc-tbl__bold" : ""}
                        style={{
                          textAlign: isRightAligned ? "right" : "left",
                          fontWeight: ci === 0 || isOverallRow ? 700 : 600,
                          backgroundColor: isOverallRow ? "rgba(14, 165, 233, 0.04)" : "inherit"
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

function EfficiencyEffReportDashboardView({ filters, onFilterChange, xAxisGroup, setXAxisGroup, onClose, targetConfig }) {
  const [teamOpen, setTeamOpen] = React.useState(false);
  const [machineTypeOpen, setMachineTypeOpen] = React.useState(false);
  const [machineOpen, setMachineOpen] = React.useState(false);
  const [operatorOpen, setOperatorOpen] = React.useState(false);
  const [chartType, setChartType] = React.useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);

  const teamRef = React.useRef(null);
  const machineTypeRef = React.useRef(null);
  const machineRef = React.useRef(null);
  const operatorRef = React.useRef(null);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (teamRef.current && !teamRef.current.contains(event.target)) {
        setTeamOpen(false);
      }
      if (machineTypeRef.current && !machineTypeRef.current.contains(event.target)) {
        setMachineTypeOpen(false);
      }
      if (machineRef.current && !machineRef.current.contains(event.target)) {
        setMachineOpen(false);
      }
      if (operatorRef.current && !operatorRef.current.contains(event.target)) {
        setOperatorOpen(false);
      }
      if (chartTypeRef.current && !chartTypeRef.current.contains(event.target)) {
        setChartTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = React.useMemo(() => filters.fromDate ? new Date(filters.fromDate) : null, [filters.fromDate]);
  const pickerTo = React.useMemo(() => filters.toDate ? new Date(filters.toDate) : null, [filters.toDate]);

  const handlePickerChange = ({ from, to }) => {
    const formatDate = (d) => {
      if (!d) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatDate(from),
      toDate: formatDate(to)
    }));
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
    const months = ["Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25", "Sep-25", "Oct-25", "Nov-25", "Dec-25", "Jan-26", "Feb-26"];
    const operatorsList = ["Mani", "Kavi", "Rajan", "Kumar"];
    const baseData = {
      Mani: [85, 96, 70, 69, 67, 66, 65, 75, 85],
      Kavi: [70, 84, 94, 87, 80, 73, 66, 59, 52],
      Rajan: [95, 89, 72, 62, 53, 43, 68, 93, 48],
      Kumar: [78, 82, 87, 91, 53, 73, 68, 63, 58]
    };

    const monthlyBaseData = {
      Mani: [85, 90, 78, 82, 79, 81, 84, 86, 88, 90, 85],
      Kavi: [78, 80, 82, 85, 81, 79, 83, 85, 87, 88, 82],
      Rajan: [92, 88, 85, 89, 84, 82, 86, 88, 90, 91, 86],
      Kumar: [80, 83, 81, 84, 82, 80, 83, 85, 86, 87, 83]
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
    if (filters?.fromDate) offset += 1;
    if (filters?.toDate) offset -= 1;

    const operatorMeta = {
      Mani: { team: "Team A", type: "CNC", machine: "CNC1" },
      Kavi: { team: "Team B", type: "CNC", machine: "CNC2" },
      Rajan: { team: "Team C", type: "Conventional", machine: "DRL1" },
      Kumar: { team: "Team A", type: "Conventional", machine: "LATHE1" }
    };

    const activeOperators = operatorsList.filter(op => {
      const meta = operatorMeta[op];
      if (filters?.team && meta.team !== filters.team) return false;
      if (filters?.machineType && meta.type !== filters.machineType) return false;
      if (filters?.machine && meta.machine !== filters.machine) return false;
      if (filters?.operatorName && op !== filters.operatorName) return false;
      return true;
    });

    const datasets = [];
    let labels = [];

    if (xAxisGroup === "Month Wise") {
      labels = months;
      if (activeOperators.length > 0) {
        const avgData = months.map((_, idx) => {
          let sum = 0;
          activeOperators.forEach(op => {
            sum += (monthlyBaseData[op][idx] + offset);
          });
          return Math.min(100, Math.max(0, Math.round(sum / activeOperators.length)));
        });
        datasets.push({
          label: "Overall Efficiency %",
          data: avgData,
          backgroundColor: "rgba(16, 185, 129, 0.75)",
          borderColor: "#10b981",
          borderWidth: 1.5,
          borderRadius: 5
        });
      }
    } else if (xAxisGroup === "Day Wise") {
      labels = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7", "Day 8", "Day 9"];
      if (activeOperators.length > 0) {
        const avgData = labels.map((_, idx) => {
          let sum = 0;
          activeOperators.forEach(op => {
            sum += (baseData[op][idx] + offset);
          });
          return Math.min(100, Math.max(0, Math.round(sum / activeOperators.length)));
        });
        datasets.push({
          label: "Overall Efficiency %",
          data: avgData,
          backgroundColor: "rgba(16, 185, 129, 0.75)",
          borderColor: "#10b981",
          borderWidth: 1.5,
          borderRadius: 5
        });
      }
    } else if (xAxisGroup === "Mac Wise") {
      const machineNames = ["CNC1", "CNC2", "DRL1", "LATHE1"];
      const opForMachine = { CNC1: "Mani", CNC2: "Kavi", DRL1: "Rajan", LATHE1: "Kumar" };

      const activeMachines = machineNames.filter(m => {
        const op = opForMachine[m];
        return activeOperators.includes(op);
      });

      labels = activeMachines;
      if (activeMachines.length > 0) {
        const avgData = activeMachines.map(m => {
          const op = opForMachine[m];
          const sum = baseData[op].reduce((a, b) => a + b, 0);
          const avg = Math.round(sum / baseData[op].length) + offset;
          return Math.min(100, Math.max(0, avg));
        });
        datasets.push({
          label: "Overall Efficiency %",
          data: avgData,
          backgroundColor: "rgba(16, 185, 129, 0.75)",
          borderColor: "#10b981",
          borderWidth: 1.5,
          borderRadius: 5
        });
      }
    } else if (xAxisGroup === "Team Wise") {
      labels = ["Team A", "Team B", "Team C"];
      const teamData = {
        "Team A": ["Mani", "Kumar"],
        "Team B": ["Kavi"],
        "Team C": ["Rajan"]
      };
      const teamEffs = labels.map(team => {
        const teamOps = teamData[team].filter(op => activeOperators.includes(op));
        if (teamOps.length === 0) return 0;
        let total = 0;
        teamOps.forEach(op => {
          const sum = baseData[op].reduce((a, b) => a + b, 0);
          total += (sum / baseData[op].length);
        });
        return Math.min(100, Math.max(0, Math.round((total / teamOps.length) + offset)));
      });
      datasets.push({
        label: "Overall Efficiency %",
        data: teamEffs,
        backgroundColor: "rgba(16, 185, 129, 0.75)",
        borderColor: "#10b981",
        borderWidth: 1.5,
        borderRadius: 5
      });
    }

    return { labels, datasets };
  }, [filters, xAxisGroup]);

  const setupChart1 = React.useCallback((canvas) => {
    let targetVal = 80;
    if (xAxisGroup === "Month Wise") {
      targetVal = targetConfig?.efficiency?.monthWiseTarget ?? 80;
    } else if (xAxisGroup === "Day Wise") {
      targetVal = targetConfig?.efficiency?.dayWiseTarget ?? 80;
    } else if (xAxisGroup === "Mac Wise") {
      targetVal = targetConfig?.efficiency?.macWiseTarget ?? 80;
    } else if (xAxisGroup === "Team Wise") {
      targetVal = targetConfig?.efficiency?.teamWiseTarget ?? 80;
    }

    // Handle Radar Chart
    if (chartType === "radar") {
      return new Chart(canvas, {
        type: "radar",
        data: {
          labels: chart1Data.labels,
          datasets: [
            {
              label: "Overall Efficiency %",
              data: chart1Data.datasets[0]?.data || [],
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              borderWidth: 2.5,
              fill: true,
              pointRadius: 4
            },
            {
              label: "Efficiency Target",
              data: (chart1Data.labels || []).map(() => targetVal),
              borderColor: "rgba(239, 68, 68, 0.85)",
              borderDash: [4, 4],
              borderWidth: 1.5,
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { font: { size: 9, family: "'Inter', sans-serif" } } }
          },
          scales: {
            r: {
              min: 0,
              max: 100,
              angleLines: { display: true, color: "rgba(0, 0, 0, 0.05)" },
              grid: { circular: true, color: "rgba(0, 0, 0, 0.05)" },
              ticks: { display: true, font: { size: 8 }, backdropColor: "transparent", callback: (v) => `${v}%` }
            }
          }
        }
      });
    }

    // Handle Polar Area
    if (chartType === "polarArea") {
      return new Chart(canvas, {
        type: "polarArea",
        data: {
          labels: chart1Data.labels,
          datasets: [
            {
              label: "Overall Efficiency %",
              data: chart1Data.datasets[0]?.data || [],
              backgroundColor: [
                "rgba(16, 185, 129, 0.7)",
                "rgba(59, 130, 246, 0.7)",
                "rgba(245, 158, 11, 0.7)",
                "rgba(168, 85, 247, 0.7)",
                "rgba(239, 68, 68, 0.7)",
                "rgba(14, 165, 233, 0.7)",
                "rgba(236, 72, 153, 0.7)",
                "rgba(79, 70, 229, 0.7)",
                "rgba(100, 116, 139, 0.7)"
              ],
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { font: { size: 9, family: "'Inter', sans-serif" } } }
          },
          scales: {
            r: {
              min: 0,
              max: 100,
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { display: true, font: { size: 8 }, backdropColor: "transparent", callback: (v) => `${v}%` }
            }
          }
        }
      });
    }

    const isLine = chartType === "line";
    const isBar = chartType === "bar";
    const isArea = chartType === "area";
    const isStepped = chartType === "stepped";

    const dataset1Type = isLine || isArea || isStepped ? "line" : "bar";

    const datasetsWithTarget = [
      {
        type: dataset1Type,
        label: "Overall Efficiency %",
        data: chart1Data.datasets[0]?.data || [],
        backgroundColor: isArea || isStepped
          ? "rgba(16, 185, 129, 0.25)"
          : "rgba(16, 185, 129, 0.75)",
        borderColor: "#10b981",
        borderWidth: isLine || isArea || isStepped ? 2.5 : 1.5,
        borderRadius: isBar || chartType === "combo" ? 5 : 0,
        fill: isArea || isStepped,
        stepped: isStepped ? "middle" : false,
        pointRadius: isBar || chartType === "combo" ? 0 : 4,
        tension: isLine || isArea || isStepped ? 0.25 : 0
      },
      {
        type: "line",
        label: "Efficiency Target",
        data: (chart1Data.labels || []).map(() => targetVal),
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
        interaction: { mode: "index", intersect: false },
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
  }, [chart1Data, targetConfig, xAxisGroup, chartType]);

  const computedKpis = React.useMemo(() => {
    const operatorsList = ["Mani", "Kavi", "Rajan", "Kumar"];
    const monthlyBaseData = {
      Mani: [85, 90, 78, 82, 79, 81, 84, 86, 88, 90, 85],
      Kavi: [78, 80, 82, 85, 81, 79, 83, 85, 87, 88, 82],
      Rajan: [92, 88, 85, 89, 84, 82, 86, 88, 90, 91, 86],
      Kumar: [80, 83, 81, 84, 82, 80, 83, 85, 86, 87, 83]
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
    if (filters?.fromDate) offset += 1;
    if (filters?.toDate) offset -= 1;

    const operatorMeta = {
      Mani: { team: "Team A", type: "CNC", machine: "CNC1" },
      Kavi: { team: "Team B", type: "CNC", machine: "CNC2" },
      Rajan: { team: "Team C", type: "Conventional", machine: "DRL1" },
      Kumar: { team: "Team A", type: "Conventional", machine: "LATHE1" }
    };

    const activeOps = operatorsList.filter(op => {
      const meta = operatorMeta[op];
      if (filters?.team && meta.team !== filters.team) return false;
      if (filters?.machineType && meta.type !== filters.machineType) return false;
      if (filters?.machine && meta.machine !== filters.machine) return false;
      if (filters?.operatorName && op !== filters.operatorName) return false;
      return true;
    });

    if (activeOps.length === 0) {
      return [
        { label: "Avg Efficiency", value: "0%", color: "#10b981", icon: UserCheck },
        { label: "Top Performer", value: "N/A", color: "#3b82f6", icon: Award },
        { label: "Target Status", value: "0% Met", color: "#f59e0b", icon: Target },
        { label: "Trend", value: "Stable", color: "#a855f7", icon: TrendingUp }
      ];
    }

    // KPI 1: Average Efficiency
    let totalSum = 0;
    let count = 0;
    activeOps.forEach(op => {
      monthlyBaseData[op].forEach(val => {
        totalSum += (val + offset);
        count++;
      });
    });
    const avgEff = Math.min(100, Math.max(0, Math.round(totalSum / count)));

    // KPI 2: Top Performer
    let topOp = "";
    let topOpAvg = -1;
    activeOps.forEach(op => {
      const sum = monthlyBaseData[op].reduce((a, b) => a + b, 0);
      const avg = (sum / monthlyBaseData[op].length) + offset;
      if (avg > topOpAvg) {
        topOpAvg = avg;
        topOp = op;
      }
    });
    const topPerformerStr = `${topOp} (${Math.min(100, Math.max(0, Math.round(topOpAvg)))}%)`;

    // KPI 3: Target Status
    let targetVal = 80;
    if (xAxisGroup === "Month Wise") {
      targetVal = targetConfig?.efficiency?.monthWiseTarget ?? 80;
    } else if (xAxisGroup === "Day Wise") {
      targetVal = targetConfig?.efficiency?.dayWiseTarget ?? 80;
    } else if (xAxisGroup === "Mac Wise") {
      targetVal = targetConfig?.efficiency?.macWiseTarget ?? 80;
    } else if (xAxisGroup === "Team Wise") {
      targetVal = targetConfig?.efficiency?.teamWiseTarget ?? 80;
    }

    let metCount = 0;
    let totalMonthsCount = 0;
    activeOps.forEach(op => {
      monthlyBaseData[op].forEach(val => {
        if ((val + offset) >= targetVal) {
          metCount++;
        }
        totalMonthsCount++;
      });
    });
    const metPct = totalMonthsCount > 0 ? Math.round((metCount / totalMonthsCount) * 100) : 0;
    const targetStatusStr = `${metPct}% Met (${metCount}/${totalMonthsCount} Mo)`;

    // KPI 4: Trend
    let firstSum = 0;
    let lastSum = 0;
    activeOps.forEach(op => {
      firstSum += (monthlyBaseData[op][0] + offset);
      lastSum += (monthlyBaseData[op][10] + offset);
    });
    const firstAvg = firstSum / activeOps.length;
    const lastAvg = lastSum / activeOps.length;
    const trendDiff = lastAvg - firstAvg;
    const trendStr = trendDiff > 0
      ? `+${trendDiff.toFixed(1)}% MoM`
      : trendDiff < 0
        ? `${trendDiff.toFixed(1)}% MoM`
        : "Stable";

    return [
      { label: "Avg Efficiency", value: `${avgEff}%`, color: "#10b981", icon: UserCheck },
      { label: "Top Performer", value: topPerformerStr, color: "#3b82f6", icon: Award },
      { label: "Target Status", value: targetStatusStr, color: "#f59e0b", icon: Target },
      { label: "Trend (MoM)", value: trendStr, color: "#a855f7", icon: TrendingUp }
    ];
  }, [filters, targetConfig, xAxisGroup]);

  const carouselControls = (
    <div className="pp1-dt-card" style={{ padding: "14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)", background: "#fff", marginTop: "10px" }}>
      <div className="pp1-chart-toolbar">
        <div className="pp1-chart-toolbar__title">
          {xAxisGroup === "Month Wise" && "Month Wise Overall Efficiency %"}
          {xAxisGroup === "Day Wise" && "Day Wise Overall Efficiency %"}
          {xAxisGroup === "Mac Wise" && "Machine Wise Overall Efficiency %"}
          {xAxisGroup === "Team Wise" && "Team Wise Overall Efficiency %"}
        </div>
        <div className="pp1-chart-xaxis">
          <span className="pp1-chart-xaxis__label">Chart X-Axis:</span>
          {["Month Wise", "Day Wise", "Mac Wise", "Team Wise"].map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setXAxisGroup(g)}
              className={`pp1-xaxis-btn${xAxisGroup === g ? " pp1-xaxis-btn--active" : ""}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <div className="pp1-dt-chart-wrap" style={{ height: 220, position: "relative" }}>
        <ChartJsCanvas setup={setupChart1} height={220} rebuildToken={`eff1-${xAxisGroup}-${JSON.stringify(filters)}-${chartType}`} />
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
      title="Efficiency (EFF)"
      icon={UserCheck}
      color="#10b981"
      kpis={computedKpis}
      setupChart={null}
      chartControls={carouselControls}
      rangeHint="Efficiency Performance Indicators"
      onClose={onClose}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range — PlantPerformance1DatePicker (same as Customer PO vs Sales Value) */}
        <div className="pp1-filter-group pp1-filter-group--date-range">
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Team Filter */}
        <div className="pp1-filter-group" ref={teamRef}>
          <label className="pp1-filter-label">Team</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${teamOpen ? "open" : ""}`}
              onClick={() => setTeamOpen(o => !o)}
            >
              <span>{filters?.team || "All Teams"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {teamOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters?.team ? "selected" : ""}`}
                  onClick={() => { handleInputChange("team", ""); setTeamOpen(false); }}
                >
                  All Teams
                </div>
                {teams.map(t => (
                  <div
                    key={t}
                    className={`pp1-custom-select-option ${filters?.team === t ? "selected" : ""}`}
                    onClick={() => { handleInputChange("team", t); setTeamOpen(false); }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Machine Type Filter */}
        <div className="pp1-filter-group" ref={machineTypeRef}>
          <label className="pp1-filter-label">Machine Type</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${machineTypeOpen ? "open" : ""}`}
              onClick={() => setMachineTypeOpen(o => !o)}
            >
              <span>{filters?.machineType || "All Types"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {machineTypeOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters?.machineType ? "selected" : ""}`}
                  onClick={() => { handleInputChange("machineType", ""); setMachineTypeOpen(false); }}
                >
                  All Types
                </div>
                {machineTypes.map(mt => (
                  <div
                    key={mt}
                    className={`pp1-custom-select-option ${filters?.machineType === mt ? "selected" : ""}`}
                    onClick={() => { handleInputChange("machineType", mt); setMachineTypeOpen(false); }}
                  >
                    {mt}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Machine No Filter */}
        <div className="pp1-filter-group" ref={machineRef}>
          <label className="pp1-filter-label">Machine No</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${machineOpen ? "open" : ""}`}
              onClick={() => setMachineOpen(o => !o)}
            >
              <span>{filters?.machine || "All Machines"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {machineOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters?.machine ? "selected" : ""}`}
                  onClick={() => { handleInputChange("machine", ""); setMachineOpen(false); }}
                >
                  All Machines
                </div>
                {machines.map(m => (
                  <div
                    key={m}
                    className={`pp1-custom-select-option ${filters?.machine === m ? "selected" : ""}`}
                    onClick={() => { handleInputChange("machine", m); setMachineOpen(false); }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Operator Name Filter */}
        <div className="pp1-filter-group" ref={operatorRef}>
          <label className="pp1-filter-label">Operator Name</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${operatorOpen ? "open" : ""}`}
              onClick={() => setOperatorOpen(o => !o)}
            >
              <span>{filters?.operatorName || "All Operators"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {operatorOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters?.operatorName ? "selected" : ""}`}
                  onClick={() => { handleInputChange("operatorName", ""); setOperatorOpen(false); }}
                >
                  All Operators
                </div>
                {operators.map(o => (
                  <div
                    key={o}
                    className={`pp1-custom-select-option ${filters?.operatorName === o ? "selected" : ""}`}
                    onClick={() => { handleInputChange("operatorName", o); setOperatorOpen(false); }}
                  >
                    {o}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chart Type Dropdown Filter */}
        <div className="pp1-filter-group" ref={chartTypeRef}>
          <label className="pp1-filter-label">Chart Type</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${chartTypeOpen ? "open" : ""}`}
              onClick={() => setChartTypeOpen(o => !o)}
              style={{ minWidth: "135px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {chartType === "bar" ? (
                  <BarChart2 size={12} style={{ color: "#10b981" }} />
                ) : chartType === "area" ? (
                  <AreaChart size={12} style={{ color: "#10b981" }} />
                ) : chartType === "radar" ? (
                  <Radar size={12} style={{ color: "#10b981" }} />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} style={{ color: "#10b981" }} />
                ) : chartType === "stepped" ? (
                  <Activity size={12} style={{ color: "#10b981" }} />
                ) : chartType === "combo" ? (
                  <TrendingUp size={12} style={{ color: "#10b981" }} />
                ) : (
                  <LucideLineChart size={12} style={{ color: "#10b981" }} />
                )}
                <span style={{ textTransform: "capitalize" }}>{chartType === "polarArea" ? "Polar Area" : chartType === "radar" ? "Radar" : chartType === "stepped" ? "Stepped" : chartType}</span>
              </div>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {chartTypeOpen && (
              <div className="pp1-custom-select-options">
                {[
                  { id: "combo", label: "Combo Chart", icon: TrendingUp },
                  { id: "line", label: "Line Chart", icon: LucideLineChart },
                  { id: "bar", label: "Bar Chart", icon: BarChart2 },
                  { id: "area", label: "Area Chart", icon: AreaChart },
                  { id: "radar", label: "Radar Chart", icon: Radar },
                  { id: "polarArea", label: "Polar Area", icon: PieChart },
                  { id: "stepped", label: "Stepped Chart", icon: Activity }
                ].map(opt => (
                  <div
                    key={opt.id}
                    className={`pp1-custom-select-option ${chartType === opt.id ? "selected" : ""}`}
                    onClick={() => {
                      setChartType(opt.id);
                      setChartTypeOpen(false);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <opt.icon size={12} style={{ color: chartType === opt.id ? "#fff" : "#10b981" }} />
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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

function EfficiencyEffReportBottomTable({ filters, xAxisGroup = "Month Wise" }) {
  const months = ["Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25", "Sep-25", "Oct-25", "Nov-25", "Dec-25", "Jan-26", "Feb-26"];
  const baseTab1Rows = [
    { name: "Mani", team: "Team A", type: "CNC", machine: "CNC1", monthly: [85, 90, 78, 82, 79, 81, 84, 86, 88, 90, 85], daily: [85, 96, 70, 69, 67, 66, 65, 75, 85] },
    { name: "Kavi", team: "Team B", type: "CNC", machine: "CNC2", monthly: [78, 80, 82, 85, 81, 79, 83, 85, 87, 88, 82], daily: [70, 84, 94, 87, 80, 73, 66, 59, 52] },
    { name: "Rajan", team: "Team C", type: "Conventional", machine: "DRL1", monthly: [92, 88, 85, 89, 84, 82, 86, 88, 90, 91, 86], daily: [95, 89, 72, 62, 53, 43, 68, 93, 48] },
    { name: "Kumar", team: "Team A", type: "Conventional", machine: "LATHE1", monthly: [80, 83, 81, 84, 82, 80, 83, 85, 86, 87, 83], daily: [78, 82, 87, 91, 53, 73, 68, 63, 58] }
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

  const processedData = React.useMemo(() => {
    return baseTab1Rows.map(row => ({
      ...row,
      monthlyVals: row.monthly.map(v => Math.min(100, Math.max(0, v + offset))),
      dailyVals: row.daily.map(v => Math.min(100, Math.max(0, v + offset))),
      avgVal: Math.min(100, Math.max(0, Math.round(row.daily.reduce((a, b) => a + b, 0) / row.daily.length) + offset))
    }));
  }, [offset]);

  // Filter based on dropdowns (Team, Machine Type, Machine No, Operator Name)
  const filteredData = React.useMemo(() => {
    return processedData.filter(row => {
      if (filters?.team && row.team !== filters.team) return false;
      if (filters?.machineType && row.type !== filters.machineType) return false;
      if (filters?.machine && row.machine !== filters.machine) return false;
      if (filters?.operatorName && row.name !== filters.operatorName) return false;
      return true;
    });
  }, [processedData, filters]);

  const activeColumns = React.useMemo(() => {
    if (xAxisGroup === "Month Wise") {
      return ["Operator Name", ...months];
    } else if (xAxisGroup === "Day Wise") {
      return ["Operator Name", "Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7", "Day 8", "Day 9"];
    } else if (xAxisGroup === "Mac Wise") {
      return ["Machine No", "Average Efficiency %", "Operator Name", "Team Name"];
    } else {
      return ["Team Name", "Average Efficiency %", "Machines Connected"];
    }
  }, [xAxisGroup]);

  const activeRows = React.useMemo(() => {
    if (xAxisGroup === "Month Wise") {
      const list = filteredData.map(row => [
        row.name,
        ...row.monthlyVals.map(v => `${v}%`)
      ]);
      if (filteredData.length > 0) {
        const numMonths = filteredData[0].monthlyVals.length;
        const overallAvg = [];
        for (let idx = 0; idx < numMonths; idx++) {
          let sum = 0;
          filteredData.forEach(row => {
            sum += row.monthlyVals[idx];
          });
          overallAvg.push(`${Math.round(sum / filteredData.length)}%`);
        }
        list.push(["Overall Average", ...overallAvg]);
      }
      return list;
    } else if (xAxisGroup === "Day Wise") {
      const list = filteredData.map(row => [
        row.name,
        ...row.dailyVals.map(v => `${v}%`)
      ]);
      if (filteredData.length > 0) {
        const numDays = filteredData[0].dailyVals.length;
        const overallAvg = [];
        for (let idx = 0; idx < numDays; idx++) {
          let sum = 0;
          filteredData.forEach(row => {
            sum += row.dailyVals[idx];
          });
          overallAvg.push(`${Math.round(sum / filteredData.length)}%`);
        }
        list.push(["Overall Average", ...overallAvg]);
      }
      return list;
    } else if (xAxisGroup === "Mac Wise") {
      const list = filteredData.map(row => [
        row.machine,
        `${row.avgVal}%`,
        row.name,
        row.team
      ]);
      if (filteredData.length > 0) {
        const overallAvg = Math.round(filteredData.reduce((acc, r) => acc + r.avgVal, 0) / filteredData.length);
        list.push(["Overall Average", `${overallAvg}%`, "-", "-"]);
      }
      return list;
    } else {
      const teams = ["Team A", "Team B", "Team C"];
      const teamData = {
        "Team A": ["CNC1", "LATHE1"],
        "Team B": ["CNC2"],
        "Team C": ["DRL1"]
      };
      const list = teams.map(team => {
        const teamRows = filteredData.filter(row => row.team === team);
        if (teamRows.length === 0) return [team, "-", "-"];
        const avg = Math.round(teamRows.reduce((acc, r) => acc + r.avgVal, 0) / teamRows.length);
        const machinesStr = teamData[team].join(", ");
        return [team, `${avg}%`, machinesStr];
      });
      return list.filter(row => row[1] !== "-");
    }
  }, [filteredData, xAxisGroup]);

  const getColWidth = (colName) => {
    if (xAxisGroup === "Mac Wise") {
      if (colName === "Machine No") return "20%";
      if (colName === "Average Efficiency %") return "25%";
      if (colName === "Operator Name") return "30%";
      if (colName === "Team Name") return "25%";
    }
    if (xAxisGroup === "Team Wise") {
      if (colName === "Team Name") return "25%";
      if (colName === "Average Efficiency %") return "25%";
      if (colName === "Machines Connected") return "50%";
    }
    return "auto";
  };

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
          <thead>
            <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
              {activeColumns.map((col, idx) => {
                const isRightAligned = idx > 0 && (
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
                      textAlign: isRightAligned ? "center" : "left",
                      width: getColWidth(col)
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
              activeRows.map((row, ri) => {
                const isOverallRow = row[0] === "Overall Average" || row[0] === "Overall OEE %" || row[0] === "Overall Total";
                return (
                  <tr key={ri} className="pp1-cc-tbl__tr">
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
                        activeColumns[ci].toLowerCase().includes("loss") ||
                        activeColumns[ci].toLowerCase().includes("efficiency")
                      );
                      return (
                        <td
                          key={ci}
                          className={ci === 0 || isOverallRow ? "pp1-cc-tbl__bold" : ""}
                          style={{
                            textAlign: isRightAligned ? "center" : "left",
                            fontWeight: ci === 0 || isOverallRow ? 700 : 600,
                            backgroundColor: isOverallRow ? "rgba(16, 185, 129, 0.04)" : "inherit"
                          }}
                        >
                          {cell}
                        </td>
                      );
                    })}
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

function RejectionReportDashboardView({ filters, onFilterChange, activeTab, onActiveTabChange, onClose, targetConfig }) {
  const [customerOpen, setCustomerOpen] = React.useState(false);
  const [rejTypeOpen, setRejTypeOpen] = React.useState(false);
  const [chartType, setChartType] = React.useState("combo");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);

  const customerRef = React.useRef(null);
  const rejTypeRef = React.useRef(null);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerRef.current && !customerRef.current.contains(event.target)) {
        setCustomerOpen(false);
      }
      if (rejTypeRef.current && !rejTypeRef.current.contains(event.target)) {
        setRejTypeOpen(false);
      }
      if (chartTypeRef.current && !chartTypeRef.current.contains(event.target)) {
        setChartTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = React.useMemo(() => filters?.fromDate ? new Date(filters.fromDate) : null, [filters?.fromDate]);
  const pickerTo = React.useMemo(() => filters?.toDate ? new Date(filters.toDate) : null, [filters?.toDate]);

  const handlePickerChange = ({ from, to }) => {
    const formatDate = (d) => {
      if (!d) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatDate(from),
      toDate: formatDate(to)
    }));
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      customer: "",
      partNo: "",
      rejType: "",
      rejReason: "",
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
    let offset = 0;
    if (filters?.customer) {
      const hash = filters.customer.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      offset += (hash % 5) - 2;
    }
    if (filters?.partNo) {
      offset += filters.partNo.endsWith("2") || filters.partNo.endsWith("4") ? 3 : -3;
    }
    if (filters?.rejType) offset += 2;
    if (filters?.rejReason) offset -= 2;
    if (filters?.fromDate) offset += 1;
    if (filters?.toDate) offset -= 1;

    const baseMonths = ["Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25"];
    let baseValues = [];
    let baseQtys = [];

    if (filters?.rejType === "In-house Rej") {
      baseValues = [8, 7, 4, 6, 3];
      baseQtys = [48, 42, 24, 36, 18];
    } else if (filters?.rejType === "Vendor Rej") {
      baseValues = [5, 4, 3, 4, 2];
      baseQtys = [30, 24, 18, 24, 12];
    } else if (filters?.rejType === "Final Insp Rej") {
      baseValues = [4, 5, 2, 3, 2];
      baseQtys = [24, 30, 12, 18, 12];
    } else if (filters?.rejType === "Supplier Rej") {
      baseValues = [3, 3, 2, 2, 1];
      baseQtys = [18, 18, 12, 12, 6];
    } else {
      // Default / "Overall Rej"
      baseValues = [20, 19, 11, 15, 8];
      baseQtys = [120, 110, 65, 90, 48];
    }

    const data = baseValues.map(v => Math.max(0, Math.min(100, v + offset)));
    const qtys = baseQtys.map(q => Math.max(0, q + Math.round(offset * 10)));

    return {
      labels: baseMonths,
      rates: data,
      qtys: qtys
    };
  }, [filters]);

  const setupChart1 = React.useCallback((canvas) => {
    let rejectionLimit = targetConfig?.rejection?.rejectionLimit ?? 2.0;
    if (filters?.rejType === "In-house Rej") {
      rejectionLimit = targetConfig?.rejection?.inHouseLimit ?? 1.0;
    } else if (filters?.rejType === "Vendor Rej") {
      rejectionLimit = targetConfig?.rejection?.vendorLimit ?? 1.2;
    } else if (filters?.rejType === "Final Insp Rej") {
      rejectionLimit = targetConfig?.rejection?.finalInspLimit ?? 1.5;
    } else if (filters?.rejType === "Supplier Rej") {
      rejectionLimit = targetConfig?.rejection?.supplierLimit ?? 0.5;
    }

    // Handle Radar Chart
    if (chartType === "radar") {
      return new Chart(canvas, {
        type: "radar",
        data: {
          labels: chart1Data.labels,
          datasets: [
            {
              label: "Rejection %",
              data: chart1Data.rates,
              borderColor: "#f59e0b",
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              borderWidth: 2.5,
              fill: true,
              pointRadius: 4
            },
            {
              label: "Rejection Qty (pcs)",
              data: chart1Data.qtys.map(q => q / 5), // scaled for radar chart alignment
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              borderWidth: 2.5,
              fill: true,
              pointRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { font: { size: 9, family: "'Inter', sans-serif", weight: 600 } } },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.dataset.label || "";
                  const val = context.raw;
                  if (label.includes("%")) return ` ${label}: ${val}%`;
                  return ` ${label}: ${val * 5} pcs`; // unscaled
                }
              }
            }
          },
          scales: {
            r: {
              angleLines: { display: true, color: "rgba(0, 0, 0, 0.05)" },
              grid: { circular: true, color: "rgba(0, 0, 0, 0.05)" },
              ticks: { display: true, font: { size: 8 }, backdropColor: "transparent" }
            }
          }
        }
      });
    }

    // Handle Polar Area
    if (chartType === "polarArea") {
      return new Chart(canvas, {
        type: "polarArea",
        data: {
          labels: chart1Data.labels,
          datasets: [
            {
              label: "Rejection %",
              data: chart1Data.rates,
              backgroundColor: [
                "rgba(245, 158, 11, 0.6)",
                "rgba(59, 130, 246, 0.6)",
                "rgba(168, 85, 247, 0.6)",
                "rgba(16, 185, 129, 0.6)",
                "rgba(239, 68, 68, 0.6)"
              ],
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { font: { size: 9, family: "'Inter', sans-serif", weight: 600 } } }
          },
          scales: {
            r: {
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { display: true, font: { size: 8 }, backdropColor: "transparent" }
            }
          }
        }
      });
    }

    const isLine = chartType === "line";
    const isBar = chartType === "bar";
    const isArea = chartType === "area";
    const isStepped = chartType === "stepped";

    const dataset1Type = isLine || isArea || isStepped ? "line" : "bar";
    const dataset2Type = isBar ? "bar" : "line";

    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: chart1Data.labels,
        datasets: [
          {
            type: dataset1Type,
            label: "Rejection %",
            data: chart1Data.rates,
            yAxisID: "yRejRate",
            backgroundColor: isArea || isStepped
              ? "rgba(245, 158, 11, 0.25)"
              : "#f59e0b",
            borderColor: "#d97706",
            borderWidth: isLine || isArea || isStepped ? 2.5 : 1.5,
            borderRadius: isBar ? 4 : 0,
            fill: isArea || isStepped,
            stepped: isStepped ? "middle" : false,
            pointRadius: isBar ? 0 : 4,
            tension: isLine || isArea || isStepped ? 0.25 : 0
          },
          {
            type: dataset2Type,
            label: "Rejection Qty",
            data: chart1Data.qtys,
            yAxisID: "yRejQty",
            borderColor: "#3b82f6",
            backgroundColor: isBar
              ? "#3b82f6"
              : (isArea || isStepped ? "rgba(59, 130, 246, 0.25)" : "#3b82f6"),
            borderWidth: isBar ? 1.5 : 3,
            borderRadius: isBar ? 4 : 0,
            fill: isArea || isStepped,
            stepped: isStepped ? "middle" : false,
            tension: 0.25,
            pointRadius: isBar ? 0 : 4,
            pointHoverRadius: 6
          },
          {
            type: "line",
            label: "Max Rejection Target",
            data: (chart1Data.labels || []).map(() => rejectionLimit),
            yAxisID: "yRejRate",
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
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: { size: 9, family: "'Inter', sans-serif", weight: 600 },
              boxWidth: 10
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
                if (label.includes("%") || label.includes("Target")) {
                  return ` ${label}: ${val}%`;
                }
                return ` ${label}: ${val} pcs`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, family: "'Inter', sans-serif" } }
          },
          yRejRate: {
            type: "linear",
            position: "left",
            title: {
              display: true,
              text: "Rejection %",
              color: "#f59e0b",
              font: { family: "'Inter', sans-serif", size: 10, weight: 700 }
            },
            ticks: {
              font: { size: 10, family: "'Inter', sans-serif" },
              callback: (v) => `${v}%`
            },
            grid: { color: "rgba(0,0,0,0.05)" }
          },
          yRejQty: {
            type: "linear",
            position: "right",
            title: {
              display: true,
              text: "Rejection Qty (pcs)",
              color: "#3b82f6",
              font: { family: "'Inter', sans-serif", size: 10, weight: 700 }
            },
            ticks: {
              font: { size: 10, family: "'Inter', sans-serif" }
            },
            grid: { display: false }
          }
        }
      }
    });
  }, [chart1Data, targetConfig, chartType]);

  const customersList = ["Tata Motors", "Mahindra & Mahindra", "Maruti Suzuki", "Ashok Leyland"];
  const rejTypesList = ["In-house Rej", "Vendor Rej", "Final Insp Rej", "Supplier Rej"];

  return (
    <PremiumDashboardView
      title="Rejection"
      icon={AlertTriangle}
      color="#f59e0b"
      kpis={null}
      setupChart={setupChart1}
      rangeHint="Month Wise Rejection"
      onClose={onClose}
      rebuildToken={`rejection-${JSON.stringify(filters)}-${JSON.stringify(targetConfig?.rejection)}-${chartType}`}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range — PlantPerformance1DatePicker (same as Customer PO vs Sales Value) */}
        <div className="pp1-filter-group pp1-filter-group--date-range">
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Customer Dropdown */}
        <div className="pp1-filter-group" ref={customerRef}>
          <label className="pp1-filter-label">Customer Name</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${customerOpen ? "open" : ""}`}
              onClick={() => setCustomerOpen(o => !o)}
            >
              <span>{filters?.customer || "All Customers"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {customerOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters?.customer ? "selected" : ""}`}
                  onClick={() => { handleInputChange("customer", ""); setCustomerOpen(false); }}
                >
                  All Customers
                </div>
                {customersList.map(c => (
                  <div
                    key={c}
                    className={`pp1-custom-select-option ${filters?.customer === c ? "selected" : ""}`}
                    onClick={() => { handleInputChange("customer", c); setCustomerOpen(false); }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rej Type Dropdown */}
        <div className="pp1-filter-group" ref={rejTypeRef}>
          <label className="pp1-filter-label">Rej Type</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${rejTypeOpen ? "open" : ""}`}
              onClick={() => setRejTypeOpen(o => !o)}
              style={{ minWidth: "125px" }}
            >
              <span>{filters?.rejType || "Overall Rej"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {rejTypeOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters?.rejType || filters?.rejType === "Overall Rej" ? "selected" : ""}`}
                  onClick={() => { handleInputChange("rejType", ""); setRejTypeOpen(false); }}
                >
                  Overall Rej
                </div>
                {rejTypesList.map(t => (
                  <div
                    key={t}
                    className={`pp1-custom-select-option ${filters?.rejType === t ? "selected" : ""}`}
                    onClick={() => { handleInputChange("rejType", t); setRejTypeOpen(false); }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chart Type Dropdown Filter */}
        <div className="pp1-filter-group" ref={chartTypeRef}>
          <label className="pp1-filter-label">Chart Type</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${chartTypeOpen ? "open" : ""}`}
              onClick={() => setChartTypeOpen(o => !o)}
              style={{ minWidth: "135px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {chartType === "bar" ? (
                  <BarChart2 size={12} style={{ color: "#f59e0b" }} />
                ) : chartType === "area" ? (
                  <AreaChart size={12} style={{ color: "#f59e0b" }} />
                ) : chartType === "radar" ? (
                  <Radar size={12} style={{ color: "#f59e0b" }} />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} style={{ color: "#f59e0b" }} />
                ) : chartType === "stepped" ? (
                  <Activity size={12} style={{ color: "#f59e0b" }} />
                ) : chartType === "combo" ? (
                  <TrendingUp size={12} style={{ color: "#f59e0b" }} />
                ) : (
                  <LucideLineChart size={12} style={{ color: "#f59e0b" }} />
                )}
                <span style={{ textTransform: "capitalize" }}>{chartType === "polarArea" ? "Polar Area" : chartType === "radar" ? "Radar" : chartType === "stepped" ? "Stepped" : chartType}</span>
              </div>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {chartTypeOpen && (
              <div className="pp1-custom-select-options">
                {[
                  { id: "combo", label: "Combo Chart", icon: TrendingUp },
                  { id: "line", label: "Line Chart", icon: LucideLineChart },
                  { id: "bar", label: "Bar Chart", icon: BarChart2 },
                  { id: "area", label: "Area Chart", icon: AreaChart },
                  { id: "radar", label: "Radar Chart", icon: Radar },
                  { id: "polarArea", label: "Polar Area", icon: PieChart },
                  { id: "stepped", label: "Stepped Chart", icon: Activity }
                ].map(opt => (
                  <div
                    key={opt.id}
                    className={`pp1-custom-select-option ${chartType === opt.id ? "selected" : ""}`}
                    onClick={() => {
                      setChartType(opt.id);
                      setChartTypeOpen(false);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <opt.icon size={12} style={{ color: chartType === opt.id ? "#fff" : "#f59e0b" }} />
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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

function RejectionReportBottomTable({ filters }) {
  const offset = React.useMemo(() => {
    let off = 0;
    if (filters?.customer) {
      const hash = filters.customer.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      off += (hash % 5) - 2; // -2 to +2
    }
    if (filters?.partNo) {
      off += filters.partNo.endsWith("2") || filters.partNo.endsWith("4") ? 1 : -1;
    }
    if (filters?.rejType) off += 1;
    if (filters?.rejReason) off -= 1;
    if (filters?.fromDate) off += 1;
    if (filters?.toDate) off -= 1;
    return off;
  }, [filters]);

  const { title, columns, allRows } = React.useMemo(() => {
    if (filters?.rejType === "In-house Rej") {
      return {
        title: "In-House Rejection Registry",
        columns: ["Process/Line", "Month", "Operator", "Rejection %", "Rejection Qty", "Rejection Value"],
        allRows: [
          ["Machining", "Apr-25", "Karthik R.", "10%", "50", "₹5,000"],
          ["Welding", "Apr-25", "Suresh Kumar", "16%", "80", "₹8,000"],
          ["Assembly", "May-25", "Manoj P.", "4%", "20", "₹2,000"],
          ["Stamping", "May-25", "Ramesh K.", "8%", "40", "₹4,000"],
          ["Casting", "Jun-25", "Vijay S.", "12%", "60", "₹6,000"],
          ["Machining", "Jun-25", "Karthik R.", "7%", "35", "₹3,500"],
          ["Welding", "Jul-25", "Suresh Kumar", "11%", "55", "₹5,500"],
          ["Assembly", "Jul-25", "Manoj P.", "5%", "25", "₹2,500"],
          ["Stamping", "Aug-25", "Ramesh K.", "6%", "30", "₹3,000"],
          ["Casting", "Aug-25", "Vijay S.", "8%", "40", "₹4,000"]
        ]
      };
    } else if (filters?.rejType === "Vendor Rej") {
      return {
        title: "Vendor Rejection Registry",
        columns: ["Vendor Name", "Month", "Part Name", "Rejection %", "Rejection Qty", "Rejection Value"],
        allRows: [
          ["Vendor A", "Apr-25", "Brackets", "8%", "40", "₹4,000"],
          ["Vendor B", "Apr-25", "Housings", "6%", "30", "₹3,000"],
          ["Vendor C", "May-25", "Shafts", "14%", "70", "₹7,000"],
          ["Vendor D", "May-25", "Flanges", "8%", "40", "₹4,000"],
          ["Vendor E", "Jun-25", "Pins", "3%", "15", "₹1,500"],
          ["Vendor A", "Jun-25", "Brackets", "7%", "35", "₹3,500"],
          ["Vendor B", "Jul-25", "Housings", "5%", "25", "₹2,500"],
          ["Vendor C", "Jul-25", "Shafts", "12%", "60", "₹6,000"],
          ["Vendor D", "Aug-25", "Flanges", "6%", "30", "₹3,000"],
          ["Vendor E", "Aug-25", "Pins", "2%", "10", "₹1,000"]
        ]
      };
    } else if (filters?.rejType === "Final Insp Rej") {
      return {
        title: "Final Inspection Rejection Registry",
        columns: ["Inspection Point", "Month", "Inspector", "Rejection %", "Rejection Qty", "Rejection Value"],
        allRows: [
          ["Visual Defect", "Apr-25", "John Doe", "6%", "30", "₹3,000"],
          ["Dimensional", "Apr-25", "Sarah J.", "12%", "60", "₹6,000"],
          ["Functional", "May-25", "David M.", "5%", "25", "₹2,500"],
          ["Surface Finish", "May-25", "Alice W.", "9%", "45", "₹4,500"],
          ["Packaging", "Jun-25", "Robert L.", "4%", "20", "₹2,000"],
          ["Visual Defect", "Jun-25", "John Doe", "5%", "25", "₹2,500"],
          ["Dimensional", "Jul-25", "Sarah J.", "10%", "50", "₹5,000"],
          ["Functional", "Jul-25", "David M.", "4%", "20", "₹2,000"],
          ["Surface Finish", "Aug-25", "Alice W.", "7%", "35", "₹3,500"],
          ["Packaging", "Aug-25", "Robert L.", "3%", "15", "₹1,500"]
        ]
      };
    } else if (filters?.rejType === "Supplier Rej") {
      return {
        title: "Supplier Rejection Registry",
        columns: ["Supplier Name", "Month", "Material", "Rejection %", "Rejection Qty", "Rejection Value"],
        allRows: [
          ["Supplier X", "Apr-25", "Steel Rods", "4%", "20", "₹2,000"],
          ["Supplier Y", "Apr-25", "Alloy Sheets", "5%", "25", "₹2,500"],
          ["Supplier Z", "May-25", "Coils", "3%", "15", "₹1,500"],
          ["Supplier X", "May-25", "Steel Rods", "3%", "15", "₹1,500"],
          ["Supplier Y", "Jun-25", "Alloy Sheets", "4%", "20", "₹2,000"],
          ["Supplier Z", "Jun-25", "Coils", "2%", "10", "₹1,000"],
          ["Supplier X", "Jul-25", "Steel Rods", "3%", "15", "₹1,500"],
          ["Supplier Y", "Jul-25", "Alloy Sheets", "3%", "15", "₹1,500"],
          ["Supplier Z", "Aug-25", "Coils", "2%", "10", "₹1,000"],
          ["Supplier X", "Aug-25", "Steel Rods", "2%", "10", "₹1,000"]
        ]
      };
    } else {
      return {
        title: "Rejection Registry",
        columns: ["Customer Name", "Month", "Rej Insp", "Rej %", "Rej Qty", "Rej Value"],
        allRows: [
          ["Tata Motors", "Apr-25", "Intermediate", "27%", "120", "₹12,000"],
          ["Mahindra & Mahindra", "Apr-25", "Final Insp", "30%", "150", "₹18,000"],
          ["Maruti Suzuki", "May-25", "Job order", "9%", "45", "₹3,600"],
          ["Ashok Leyland", "May-25", "Intermediate", "14%", "70", "₹8,400"],
          ["Tata Motors", "Jun-25", "Final Insp", "14%", "56", "₹5,600"],
          ["Mahindra & Mahindra", "Jun-25", "Job order", "5%", "25", "₹2,500"],
          ["Maruti Suzuki", "Jul-25", "Intermediate", "21%", "95", "₹10,500"],
          ["Ashok Leyland", "Jul-25", "Final Insp", "12%", "60", "₹7,200"],
          ["Tata Motors", "Aug-25", "Job order", "13%", "52", "₹5,200"],
          ["Mahindra & Mahindra", "Aug-25", "Intermediate", "10%", "48", "₹4,800"]
        ]
      };
    }
  }, [filters?.rejType]);

  const rows = React.useMemo(() => {
    let list = allRows;
    if (filters?.customer && (!filters?.rejType || filters?.rejType === "Overall Rej" || filters?.rejType === "Supplier Rej")) {
      list = list.filter(r => r[0] === filters.customer);
    }

    return list.map(row => {
      const col0 = row[0];
      const month = row[1];
      const col2 = row[2];

      const basePct = parseFloat(row[3]);
      const newPct = Math.max(0, Math.min(100, basePct + offset));

      const baseQty = parseInt(row[4], 10);
      const newQty = Math.max(0, baseQty + Math.round(offset * 5));

      const newValue = newQty * 100;

      return [
        col0,
        month,
        col2,
        `${newPct.toFixed(0)}%`,
        newQty.toLocaleString(),
        `₹${newValue.toLocaleString()}`
      ];
    });
  }, [allRows, filters, offset]);

  return <PremiumDashboardBottomTable title={title} columns={columns} rows={rows} />;
}

function ReworkReportDashboardView({ filters, onFilterChange, onClose, targetConfig, xAxisGroup, setXAxisGroup }) {
  const [customerOpen, setCustomerOpen] = React.useState(false);
  const [chartType, setChartType] = React.useState("combo");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);

  const customerRef = React.useRef(null);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerRef.current && !customerRef.current.contains(event.target)) {
        setCustomerOpen(false);
      }
      if (chartTypeRef.current && !chartTypeRef.current.contains(event.target)) {
        setChartTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = React.useMemo(() => filters?.fromDate ? new Date(filters.fromDate) : null, [filters?.fromDate]);
  const pickerTo = React.useMemo(() => filters?.toDate ? new Date(filters.toDate) : null, [filters?.toDate]);

  const handlePickerChange = ({ from, to }) => {
    const formatDate = (d) => {
      if (!d) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatDate(from),
      toDate: formatDate(to)
    }));
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      customer: "",
      partNo: "",
      reworkReason: "",
    });
  };

  const chart1Data = React.useMemo(() => {
    let offset = 0;
    if (filters?.customer) {
      const hash = filters.customer.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      offset += (hash % 5) - 2;
    }
    if (filters?.partNo) {
      offset += filters.partNo.endsWith("2") || filters.partNo.endsWith("4") ? 2 : -2;
    }
    if (filters?.reworkReason) offset += 1;
    if (filters?.fromDate) offset += 1;
    if (filters?.toDate) offset -= 1;

    const labels = ["Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25"];
    let baseValues = [];
    let baseQtys = [];

    if (xAxisGroup === "In-House") {
      baseValues = [6, 5, 3, 4, 2];
      baseQtys = [36, 30, 18, 24, 12];
    } else if (xAxisGroup === "Vendor") {
      baseValues = [4, 3, 2, 3, 2];
      baseQtys = [24, 18, 12, 18, 12];
    } else if (xAxisGroup === "Final Insp") {
      baseValues = [3, 2, 2, 2, 1];
      baseQtys = [18, 12, 12, 12, 6];
    } else if (xAxisGroup === "Customer Rework") {
      baseValues = [2, 2, 1, 1, 1];
      baseQtys = [12, 12, 6, 6, 5];
    } else {
      // Default / "Overall"
      baseValues = [15, 12, 8, 10, 6];
      baseQtys = [90, 75, 48, 60, 35];
    }

    const data = baseValues.map(v => Math.max(0, Math.min(100, v + offset)));
    const qtys = baseQtys.map(q => Math.max(0, q + Math.round(offset * 5)));

    return {
      labels: labels,
      rates: data,
      qtys: qtys
    };
  }, [filters, xAxisGroup]);

  const setupChart1 = React.useCallback((canvas) => {
    let reworkLimit = targetConfig?.rework?.reworkLimit ?? 1.5;
    if (xAxisGroup === "In-House") {
      reworkLimit = targetConfig?.rework?.inHouseLimit ?? 1.0;
    } else if (xAxisGroup === "Final Insp") {
      reworkLimit = targetConfig?.rework?.finalInspLimit ?? 1.5;
    } else if (xAxisGroup === "Customer Rework") {
      reworkLimit = targetConfig?.rework?.customerReworkLimit ?? 0.5;
    }

    // Handle Radar Chart
    if (chartType === "radar") {
      return new Chart(canvas, {
        type: "radar",
        data: {
          labels: chart1Data.labels,
          datasets: [
            {
              label: "Rework %",
              data: chart1Data.rates,
              borderColor: "#a855f7",
              backgroundColor: "rgba(168, 85, 247, 0.15)",
              borderWidth: 2.5,
              fill: true,
              pointRadius: 4
            },
            {
              label: "Rework Qty (pcs)",
              data: chart1Data.qtys.map(q => q / 5), // scaled for radar chart alignment
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              borderWidth: 2.5,
              fill: true,
              pointRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { font: { size: 9, family: "'Inter', sans-serif", weight: 600 } } },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.dataset.label || "";
                  const val = context.raw;
                  if (label.includes("%")) return ` ${label}: ${val}%`;
                  return ` ${label}: ${val * 5} pcs`; // unscaled
                }
              }
            }
          },
          scales: {
            r: {
              angleLines: { display: true, color: "rgba(0, 0, 0, 0.05)" },
              grid: { circular: true, color: "rgba(0, 0, 0, 0.05)" },
              ticks: { display: true, font: { size: 8 }, backdropColor: "transparent" }
            }
          }
        }
      });
    }

    // Handle Polar Area
    if (chartType === "polarArea") {
      return new Chart(canvas, {
        type: "polarArea",
        data: {
          labels: chart1Data.labels,
          datasets: [
            {
              label: "Rework %",
              data: chart1Data.rates,
              backgroundColor: [
                "rgba(168, 85, 247, 0.6)",
                "rgba(59, 130, 246, 0.6)",
                "rgba(245, 158, 11, 0.6)",
                "rgba(16, 185, 129, 0.6)",
                "rgba(239, 68, 68, 0.6)"
              ],
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { font: { size: 9, family: "'Inter', sans-serif", weight: 600 } } }
          },
          scales: {
            r: {
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { display: true, font: { size: 8 }, backdropColor: "transparent" }
            }
          }
        }
      });
    }

    // Otherwise render standard combos/bars/lines/areas/stepped...
    const isLine = chartType === "line";
    const isBar = chartType === "bar";
    const isArea = chartType === "area";
    const isStepped = chartType === "stepped";

    // Dataset configs based on selections
    const dataset1Type = isLine || isArea || isStepped ? "line" : "bar";
    const dataset2Type = isBar ? "bar" : "line";

    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: chart1Data.labels,
        datasets: [
          {
            type: dataset1Type,
            label: "Rework %",
            data: chart1Data.rates,
            yAxisID: "yRewRate",
            backgroundColor: isArea || isStepped
              ? "rgba(168, 85, 247, 0.25)"
              : "#a855f7",
            borderColor: "#9333ea",
            borderWidth: isLine || isArea || isStepped ? 2.5 : 1.5,
            borderRadius: isBar ? 4 : 0,
            fill: isArea || isStepped,
            stepped: isStepped ? "middle" : false,
            pointRadius: isBar ? 0 : 4,
            tension: isLine || isArea || isStepped ? 0.25 : 0
          },
          {
            type: dataset2Type,
            label: "Rework Qty",
            data: chart1Data.qtys,
            yAxisID: "yRewQty",
            borderColor: "#3b82f6",
            backgroundColor: isBar
              ? "#3b82f6"
              : (isArea || isStepped ? "rgba(59, 130, 246, 0.25)" : "#3b82f6"),
            borderWidth: isBar ? 1.5 : 3,
            borderRadius: isBar ? 4 : 0,
            fill: isArea || isStepped,
            stepped: isStepped ? "middle" : false,
            tension: 0.25,
            pointRadius: isBar ? 0 : 4,
            pointHoverRadius: 6
          },
          {
            type: "line",
            label: "Max Rework Target",
            data: (chart1Data.labels || []).map(() => reworkLimit),
            yAxisID: "yRewRate",
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
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: { size: 9, family: "'Inter', sans-serif", weight: 600 },
              boxWidth: 10
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
                if (label.includes("%") || label.includes("Target")) {
                  return ` ${label}: ${val}%`;
                }
                return ` ${label}: ${val} pcs`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, family: "'Inter', sans-serif" } }
          },
          yRewRate: {
            type: "linear",
            position: "left",
            title: {
              display: true,
              text: "Rework %",
              color: "#a855f7",
              font: { family: "'Inter', sans-serif", size: 10, weight: 700 }
            },
            ticks: {
              font: { size: 10, family: "'Inter', sans-serif" },
              callback: (v) => `${v}%`
            },
            grid: { color: "rgba(0,0,0,0.05)" }
          },
          yRewQty: {
            type: "linear",
            position: "right",
            title: {
              display: true,
              text: "Rework Qty (pcs)",
              color: "#3b82f6",
              font: { family: "'Inter', sans-serif", size: 10, weight: 700 }
            },
            ticks: {
              font: { size: 10, family: "'Inter', sans-serif" }
            },
            grid: { display: false }
          }
        }
      }
    });
  }, [chart1Data, targetConfig, chartType]);

  const customersList = ["Tata Motors", "Mahindra & Mahindra", "Maruti Suzuki", "Ashok Leyland"];

  const chartHeaderControls = (
    <div className="pp1-chart-xaxis">
      <span className="pp1-chart-xaxis__label">Chart X-Axis:</span>
      {["Overall", "In-House", "Vendor", "Final Insp", "Customer Rework"].map(g => (
        <button
          key={g}
          type="button"
          onClick={() => setXAxisGroup(g)}
          className={`pp1-xaxis-btn${xAxisGroup === g ? " pp1-xaxis-btn--active" : ""}`}
        >
          {g}
        </button>
      ))}
    </div>
  );

  return (
    <PremiumDashboardView
      title="Rework"
      icon={PackageCheck}
      color="#a855f7"
      kpis={null}
      setupChart={setupChart1}
      rangeHint={xAxisGroup === "Overall" ? "Month Wise Rework" : `${xAxisGroup} Rework`}
      onClose={onClose}
      rebuildToken={`rework-${xAxisGroup}-${chartType}-${JSON.stringify(filters)}`}
      chartHeaderControls={chartHeaderControls}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range — PlantPerformance1DatePicker */}
        <div className="pp1-filter-group pp1-filter-group--date-range">
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Customer Dropdown */}
        <div className="pp1-filter-group" ref={customerRef}>
          <label className="pp1-filter-label">Customer Name</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${customerOpen ? "open" : ""}`}
              onClick={() => setCustomerOpen(o => !o)}
            >
              <span>{filters?.customer || "All Customers"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {customerOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters?.customer ? "selected" : ""}`}
                  onClick={() => { handleInputChange("customer", ""); setCustomerOpen(false); }}
                >
                  All Customers
                </div>
                {customersList.map(c => (
                  <div
                    key={c}
                    className={`pp1-custom-select-option ${filters?.customer === c ? "selected" : ""}`}
                    onClick={() => { handleInputChange("customer", c); setCustomerOpen(false); }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chart Type Dropdown Filter */}
        <div className="pp1-filter-group" ref={chartTypeRef}>
          <label className="pp1-filter-label">Chart Type</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${chartTypeOpen ? "open" : ""}`}
              onClick={() => setChartTypeOpen(o => !o)}
              style={{ minWidth: "135px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {chartType === "bar" ? (
                  <BarChart2 size={12} style={{ color: "#a855f7" }} />
                ) : chartType === "area" ? (
                  <AreaChart size={12} style={{ color: "#a855f7" }} />
                ) : chartType === "radar" ? (
                  <Radar size={12} style={{ color: "#a855f7" }} />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} style={{ color: "#a855f7" }} />
                ) : chartType === "stepped" ? (
                  <Activity size={12} style={{ color: "#a855f7" }} />
                ) : chartType === "combo" ? (
                  <TrendingUp size={12} style={{ color: "#a855f7" }} />
                ) : (
                  <LucideLineChart size={12} style={{ color: "#a855f7" }} />
                )}
                <span style={{ textTransform: "capitalize" }}>{chartType === "polarArea" ? "Polar Area" : chartType === "radar" ? "Radar" : chartType === "stepped" ? "Stepped" : chartType}</span>
              </div>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {chartTypeOpen && (
              <div className="pp1-custom-select-options">
                {[
                  { id: "combo", label: "Combo Chart", icon: TrendingUp },
                  { id: "line", label: "Line Chart", icon: LucideLineChart },
                  { id: "bar", label: "Bar Chart", icon: BarChart2 },
                  { id: "area", label: "Area Chart", icon: AreaChart },
                  { id: "radar", label: "Radar Chart", icon: Radar },
                  { id: "polarArea", label: "Polar Area", icon: PieChart },
                  { id: "stepped", label: "Stepped Chart", icon: Activity }
                ].map(opt => (
                  <div
                    key={opt.id}
                    className={`pp1-custom-select-option ${chartType === opt.id ? "selected" : ""}`}
                    onClick={() => {
                      setChartType(opt.id);
                      setChartTypeOpen(false);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <opt.icon size={12} style={{ color: chartType === opt.id ? "#fff" : "#a855f7" }} />
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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

function ReworkReportBottomTable({ filters, xAxisGroup }) {
  const offset = React.useMemo(() => {
    let off = 0;
    if (filters?.customer) {
      const hash = filters.customer.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      off += (hash % 5) - 2; // -2 to +2
    }
    if (filters?.partNo) {
      off += filters.partNo.endsWith("2") || filters.partNo.endsWith("4") ? 1 : -1;
    }
    if (filters?.reworkReason) off += 1;
    if (filters?.fromDate) off += 1;
    if (filters?.toDate) off -= 1;
    return off;
  }, [filters]);

  const { title, columns, allRows } = React.useMemo(() => {
    if (xAxisGroup === "In-House") {
      return {
        title: "In-House Rework Registry",
        columns: ["Process/Line", "Month", "Operator", "Rework %", "Rework Qty", "Rework Value"],
        allRows: [
          ["Machining", "Apr-25", "Karthik R.", "8%", "40", "₹4,000"],
          ["Welding", "Apr-25", "Suresh Kumar", "14%", "70", "₹7,000"],
          ["Assembly", "May-25", "Manoj P.", "5%", "25", "₹2,500"],
          ["Stamping", "May-25", "Ramesh K.", "9%", "45", "₹4,500"],
          ["Casting", "Jun-25", "Vijay S.", "12%", "60", "₹6,000"],
          ["Machining", "Jun-25", "Karthik R.", "6%", "30", "₹3,000"],
          ["Welding", "Jul-25", "Suresh Kumar", "12%", "60", "₹6,000"],
          ["Assembly", "Jul-25", "Manoj P.", "4%", "20", "₹2,000"],
          ["Stamping", "Aug-25", "Ramesh K.", "7%", "35", "₹3,500"],
          ["Casting", "Aug-25", "Vijay S.", "10%", "50", "₹5,000"]
        ]
      };
    } else if (xAxisGroup === "Vendor") {
      return {
        title: "Vendor Rework Registry",
        columns: ["Vendor Name", "Month", "Part Name", "Rework %", "Rework Qty", "Rework Value"],
        allRows: [
          ["Vendor A", "Apr-25", "Brackets", "12%", "60", "₹6,000"],
          ["Vendor B", "Apr-25", "Housings", "6%", "30", "₹3,000"],
          ["Vendor C", "May-25", "Shafts", "18%", "90", "₹9,000"],
          ["Vendor D", "May-25", "Flanges", "9%", "45", "₹4,500"],
          ["Vendor E", "Jun-25", "Pins", "4%", "20", "₹2,000"],
          ["Vendor A", "Jun-25", "Brackets", "10%", "50", "₹5,000"],
          ["Vendor B", "Jul-25", "Housings", "5%", "25", "₹2,500"],
          ["Vendor C", "Jul-25", "Shafts", "15%", "75", "₹7,500"],
          ["Vendor D", "Aug-25", "Flanges", "7%", "35", "₹3,500"],
          ["Vendor E", "Aug-25", "Pins", "3%", "15", "₹1,500"]
        ]
      };
    } else if (xAxisGroup === "Final Insp") {
      return {
        title: "Final Inspection Rework Registry",
        columns: ["Inspection Point", "Month", "Inspector", "Rework %", "Rework Qty", "Rework Value"],
        allRows: [
          ["Visual Defect", "Apr-25", "John Doe", "10%", "50", "₹5,000"],
          ["Dimensional", "Apr-25", "Sarah J.", "16%", "80", "₹8,000"],
          ["Functional", "May-25", "David M.", "7%", "35", "₹3,500"],
          ["Surface Finish", "May-25", "Alice W.", "11%", "55", "₹5,500"],
          ["Packaging", "Jun-25", "Robert L.", "5%", "25", "₹2,500"],
          ["Visual Defect", "Jun-25", "John Doe", "8%", "40", "₹4,000"],
          ["Dimensional", "Jul-25", "Sarah J.", "14%", "70", "₹7,000"],
          ["Functional", "Jul-25", "David M.", "6%", "30", "₹3,000"],
          ["Surface Finish", "Aug-25", "Alice W.", "9%", "45", "₹4,500"],
          ["Packaging", "Aug-25", "Robert L.", "4%", "20", "₹2,000"]
        ]
      };
    } else if (xAxisGroup === "Customer Rework") {
      return {
        title: "Customer Return & Rework Registry",
        columns: ["Customer Name", "Month", "Complaint Ref", "Rework %", "Rework Qty", "Rework Value"],
        allRows: [
          ["Tata Motors", "Apr-25", "CR-2025-001", "6%", "30", "₹3,000"],
          ["Mahindra & Mahindra", "Apr-25", "CR-2025-002", "11%", "55", "₹5,500"],
          ["Maruti Suzuki", "May-25", "CR-2025-003", "5%", "25", "₹2,500"],
          ["Ashok Leyland", "May-25", "CR-2025-004", "8%", "40", "₹4,000"],
          ["Tata Motors", "Jun-25", "CR-2025-005", "5%", "25", "₹2,500"],
          ["Mahindra & Mahindra", "Jun-25", "CR-2025-006", "9%", "45", "₹4,500"],
          ["Maruti Suzuki", "Jul-25", "CR-2025-007", "4%", "20", "₹2,000"],
          ["Ashok Leyland", "Jul-25", "CR-2025-008", "7%", "35", "₹3,500"],
          ["Tata Motors", "Aug-25", "CR-2025-009", "4%", "20", "₹2,000"],
          ["Mahindra & Mahindra", "Aug-25", "CR-2025-010", "7%", "35", "₹3,500"]
        ]
      };
    } else {
      return {
        title: "Rework Registry",
        columns: ["Customer Name", "Month", "Rework Insp", "Rework %", "Rework Qty", "Rework Value"],
        allRows: [
          ["Tata Motors", "Apr-25", "Intermediate", "18%", "90", "₹9,000"],
          ["Mahindra & Mahindra", "Apr-25", "Final Insp", "20%", "100", "₹12,000"],
          ["Maruti Suzuki", "May-25", "Job order", "8%", "40", "₹3,200"],
          ["Ashok Leyland", "May-25", "Intermediate", "10%", "50", "₹5,000"],
          ["Tata Motors", "Jun-25", "Final Insp", "10%", "45", "₹4,500"],
          ["Mahindra & Mahindra", "Jun-25", "Job order", "4%", "20", "₹2,000"],
          ["Maruti Suzuki", "Jul-25", "Intermediate", "15%", "70", "₹7,700"],
          ["Ashok Leyland", "Jul-25", "Final Insp", "9%", "45", "₹4,950"],
          ["Tata Motors", "Aug-25", "Job order", "9%", "36", "₹3,600"],
          ["Mahindra & Mahindra", "Aug-25", "Intermediate", "7%", "35", "₹3,500"]
        ]
      };
    }
  }, [xAxisGroup]);

  const rows = React.useMemo(() => {
    let list = allRows;
    if (filters?.customer && (xAxisGroup === "Overall" || xAxisGroup === "Customer Rework")) {
      list = list.filter(r => r[0] === filters.customer);
    }

    return list.map(row => {
      const col0 = row[0];
      const month = row[1];
      const col2 = row[2];

      const basePct = parseFloat(row[3]);
      const newPct = Math.max(0, Math.min(100, basePct + offset));

      const baseQty = parseInt(row[4], 10);
      const newQty = Math.max(0, baseQty + Math.round(offset * 4));

      const newValue = newQty * 100;

      return [
        col0,
        month,
        col2,
        `${newPct.toFixed(0)}%`,
        newQty.toLocaleString(),
        `₹${newValue.toLocaleString()}`
      ];
    });
  }, [allRows, filters, offset, xAxisGroup]);

  return <PremiumDashboardBottomTable title={title} columns={columns} rows={rows} />;
}

function StoreStockValueReportDashboardView({ filters, onFilterChange, onClose, targetConfig }) {
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [itemCodeOpen, setItemCodeOpen] = React.useState(false);

  const categoryRef = React.useRef(null);
  const itemCodeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setCategoryOpen(false);
      }
      if (itemCodeRef.current && !itemCodeRef.current.contains(event.target)) {
        setItemCodeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = React.useMemo(() => filters?.fromDate ? new Date(filters.fromDate) : null, [filters?.fromDate]);
  const pickerTo = React.useMemo(() => filters?.toDate ? new Date(filters.toDate) : null, [filters?.toDate]);

  const handlePickerChange = ({ from, to }) => {
    const formatDate = (d) => {
      if (!d) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatDate(from),
      toDate: formatDate(to)
    }));
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      category: "",
      itemCode: "",
      status: "",
    });
  };

  const chartData = React.useMemo(() => {
    let offset = 0;
    if (filters?.category) {
      const hash = filters.category.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      offset += (hash % 6) - 3;
    }
    if (filters?.itemCode) {
      offset += filters.itemCode.endsWith("2") || filters.itemCode.endsWith("4") ? 4 : -4;
    }
    if (filters?.status) {
      offset += filters.status === "In Stock" ? 5 : filters.status === "Low Stock" ? -5 : -10;
    }
    if (filters?.fromDate) offset += 1.5;
    if (filters?.toDate) offset -= 1.5;

    const baseMonths = ["Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25"];
    const baseValues = [45.0, 48.2, 41.0, 43.5, 42.5];

    const values = baseValues.map(v => Math.max(5.0, Math.min(100.0, v + offset)));

    return {
      labels: baseMonths,
      values: values
    };
  }, [filters]);

  const setupChart = React.useCallback((canvas) => {
    const stockLimit = targetConfig?.store_stock_value?.maxStockValueL ?? 50.0;

    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            type: "bar",
            label: "Stock Value (₹ Lakhs)",
            data: chartData.values,
            backgroundColor: "rgba(5, 150, 105, 0.75)",
            borderColor: "#059669",
            borderWidth: 1.5,
            borderRadius: 4
          },
          {
            type: "line",
            label: "Max Stock Limit (₹ Lakhs)",
            data: (chartData.labels || []).map(() => stockLimit),
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
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: { size: 9, family: "'Inter', sans-serif", weight: 600 },
              boxWidth: 10
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
                return ` ${label}: ₹${Number(val).toFixed(2)}L`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, family: "'Inter', sans-serif" } }
          },
          y: {
            type: "linear",
            position: "left",
            title: {
              display: true,
              text: "Stock Value (₹ Lakhs)",
              color: "#059669",
              font: { family: "'Inter', sans-serif", size: 10, weight: 700 }
            },
            ticks: {
              font: { size: 10, family: "'Inter', sans-serif" },
              callback: (v) => `₹${v}L`
            },
            grid: { color: "rgba(0,0,0,0.05)" }
          }
        }
      }
    });
  }, [chartData, targetConfig]);

  const groupsList = ["Raw Materials", "Consumables", "Finished Goods", "Semi-Finished"];
  const itemCodesList = ["P-1001", "P-1002", "P-1003", "P-1004", "P-1005", "P-1006", "P-1007", "P-1008", "P-1009", "P-1010"];

  return (
    <PremiumDashboardView
      title="Store Stock Value"
      icon={Coins}
      color="#059669"
      kpis={null}
      setupChart={setupChart}
      rangeHint="Month Wise Stock Value"
      onClose={onClose}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range">
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Group Dropdown */}
        <div className="pp1-filter-group" ref={categoryRef}>
          <label className="pp1-filter-label">Group</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${categoryOpen ? "open" : ""}`}
              onClick={() => setCategoryOpen(o => !o)}
            >
              <span>{filters?.category || "All Groups"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {categoryOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters?.category ? "selected" : ""}`}
                  onClick={() => { handleInputChange("category", ""); setCategoryOpen(false); }}
                >
                  All Groups
                </div>
                {groupsList.map(g => (
                  <div
                    key={g}
                    className={`pp1-custom-select-option ${filters?.category === g ? "selected" : ""}`}
                    onClick={() => { handleInputChange("category", g); setCategoryOpen(false); }}
                  >
                    {g}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Item Code Dropdown */}
        <div className="pp1-filter-group" ref={itemCodeRef}>
          <label className="pp1-filter-label">Item Code</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${itemCodeOpen ? "open" : ""}`}
              onClick={() => setItemCodeOpen(o => !o)}
            >
              <span>{filters?.itemCode || "All Items"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {itemCodeOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters?.itemCode ? "selected" : ""}`}
                  onClick={() => { handleInputChange("itemCode", ""); setItemCodeOpen(false); }}
                >
                  All Items
                </div>
                {itemCodesList.map(item => (
                  <div
                    key={item}
                    className={`pp1-custom-select-option ${filters?.itemCode === item ? "selected" : ""}`}
                    onClick={() => { handleInputChange("itemCode", item); setItemCodeOpen(false); }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>
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

function StoreStockValueReportBottomTable({ filters }) {
  const offset = React.useMemo(() => {
    let off = 0;
    if (filters?.category) {
      const hash = filters.category.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      off += (hash % 6) - 3;
    }
    if (filters?.itemCode) {
      off += filters.itemCode.endsWith("2") || filters.itemCode.endsWith("4") ? 1 : -1;
    }
    if (filters?.fromDate) off += 1;
    if (filters?.toDate) off -= 1;
    return off;
  }, [filters]);

  const allRows = [
    { month: "Apr-25", partNum: "P-1001", desc: "CNC Turning Tool", group: "Consumables", qty: "250", price: "₹1,200" },
    { month: "May-25", partNum: "P-1002", desc: "Aluminium Alloy Rod", group: "Raw Materials", qty: "1,200", price: "₹450" },
    { month: "Jun-25", partNum: "P-1003", desc: "Stainless Steel Shaft", group: "Raw Materials", qty: "80", price: "₹2,500" },
    { month: "Jul-25", partNum: "P-1004", desc: "Finished Gear Box v2", group: "Finished Goods", qty: "15", price: "₹25,000" },
    { month: "Aug-25", partNum: "P-1005", desc: "Hydraulic Cylinder", group: "Semi-Finished", qty: "45", price: "₹8,500" },
    { month: "Apr-25", partNum: "P-1006", desc: "Lubricant Oil 20L", group: "Consumables", qty: "5", price: "₹3,200" },
    { month: "May-25", partNum: "P-1007", desc: "Coolant Liquid 50L", group: "Consumables", qty: "12", price: "₹4,800" },
    { month: "Jun-25", partNum: "P-1008", desc: "M12 Bolt & Nut Set", group: "Consumables", qty: "5,000", price: "₹12" },
    { month: "Jul-25", partNum: "P-1009", desc: "Casting Base Plate", group: "Raw Materials", qty: "120", price: "₹4,200" },
    { month: "Aug-25", partNum: "P-1010", desc: "Sub-Assembly Block C", group: "Semi-Finished", qty: "30", price: "₹15,000" }
  ];

  const rows = React.useMemo(() => {
    let list = allRows;
    if (filters?.category) {
      list = list.filter(r => r.group === filters.category);
    }
    if (filters?.itemCode) {
      list = list.filter(r => r.partNum === filters.itemCode);
    }

    return list.map(row => {
      const baseQty = parseInt(row.qty.replace(/,/g, ""), 10);
      const unitPriceVal = parseInt(row.price.replace(/[₹,]/g, ""), 10);

      const newQty = Math.max(0, baseQty + Math.round(offset * (baseQty > 100 ? 20 : 2)));
      const newValue = newQty * unitPriceVal;

      return [
        row.month,
        row.group,
        `${row.partNum} - ${row.desc}`,
        newQty.toLocaleString(),
        `₹${unitPriceVal.toLocaleString()}`,
        `₹${newValue.toLocaleString()}`
      ];
    });
  }, [filters, offset]);

  const columns = ["Month", "Group", "Pattno-Desc", "Qty In Stock", "Unit Price", "Total Value"];

  return <PremiumDashboardBottomTable title="Store Stock Registry" columns={columns} rows={rows} />;
}

function OtdReportBottomTable({ filters }) {
  const allRows = [
    ["Tata Motors", "PO-2026-8801", "BRK-PAD-M1", "2026-06-10", "2026-06-10", "5,000", "5,000", "On Time", "₹5,00,000"],
    ["Mahindra & Mahindra", "PO-2026-9042", "ROT-DSC-X4", "2026-06-12", "2026-06-11", "3,000", "3,000", "On Time", "₹3,00,000"],
    ["Maruti Suzuki", "PO-2026-7719", "GBX-HNG-S2", "2026-06-14", "2026-06-16", "1,500", "1,400", "Delayed", "₹1,40,000"],
    ["Hyundai India", "PO-2026-6652", "ENG-MNT-H1", "2026-06-15", "2026-06-15", "2,500", "2,500", "On Time", "₹2,50,000"],
    ["Ashok Leyland", "PO-2026-4401", "TRK-AXL-L9", "2026-06-18", "2026-06-20", "800", "750", "Delayed", "₹7,50,000"],
    ["Tata Motors", "PO-2026-8802", "BRK-PAD-M2", "2026-06-20", "2026-06-20", "2,000", "2,000", "On Time", "₹2,00,000"],
    ["Maruti Suzuki", "PO-2026-7720", "GBX-HNG-S3", "2026-06-22", "2026-06-24", "1,200", "1,100", "Delayed", "₹1,10,000"]
  ];

  const columns = [
    "Customer Name",
    "PO Number",
    "Part Number",
    "Promised Date",
    "Actual Dispatch",
    "Ordered Qty",
    "Delivered Qty",
    "Status",
    "Value"
  ];

  const rows = React.useMemo(() => {
    let list = allRows;
    if (filters?.customer) {
      list = list.filter(r => r[0].toLowerCase().includes(filters.customer.toLowerCase()));
    }
    if (filters?.partNumber) {
      list = list.filter(r => r[2].toLowerCase().includes(filters.partNumber.toLowerCase()));
    }
    if (filters?.fromDate) {
      list = list.filter(r => r[4] >= filters.fromDate);
    }
    if (filters?.toDate) {
      list = list.filter(r => r[4] <= filters.toDate);
    }
    return list;
  }, [filters]);

  return <PremiumDashboardBottomTable title="OTD Delivery Registry" columns={columns} rows={rows} />;
}

/* ── Supplier Rating View (UI Alone) ────────────────────────────────── */
function SupplierRatingReportDashboardView({ filters, onFilterChange, onClose, targetConfig }) {
  const kpis = [
    { label: "Avg Rating", value: "92.5%", icon: Star, color: "#eab308" },
    { label: "On-Time Supply", value: "94.2%", icon: Truck, color: "#3b82f6" },
    { label: "Quality Compliance", value: "98.1%", icon: CheckCircle2, color: "#10b981" },
    { label: "Active Suppliers", value: "12", icon: Users, color: "#8b5cf6" }
  ];

  const [suppOpen, setSuppOpen] = useState(false);
  const suppRef = useRef(null);
  const [chartType, setChartType] = useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = useState(false);
  const chartTypeRef = useRef(null);
  const [suppSearch, setSuppSearch] = useState("");

  const allSuppliers = ["Anims Parts Ltd", "Virrudh Tech", "Star Logistics", "Srinivasa Castings", "Royal Packaging"];

  const filteredSuppliers = useMemo(() => {
    const q = suppSearch.trim().toLowerCase();
    if (!q) return allSuppliers;
    return allSuppliers.filter(s => s.toLowerCase().includes(q));
  }, [suppSearch]);

  const toggleSupplier = (s) => {
    const current = filters.supplier || [];
    const next = current.includes(s) ? current.filter(x => x !== s) : [...current, s];
    onFilterChange(prev => ({ ...prev, supplier: next }));
  };

  const isAllSuppSelected = (filters.supplier || []).length === allSuppliers.length;
  const toggleSelectAllSupp = () => {
    onFilterChange(prev => ({
      ...prev,
      supplier: isAllSuppSelected ? [] : [...allSuppliers]
    }));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suppRef.current && !suppRef.current.contains(event.target)) {
        setSuppOpen(false);
        setSuppSearch("");
      }
      if (chartTypeRef.current && !chartTypeRef.current.contains(event.target)) {
        setChartTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = useMemo(() => {
    if (filters.fromDate) return new Date(filters.fromDate);
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, [filters.fromDate]);

  const pickerTo = useMemo(() => {
    if (filters.toDate) return new Date(filters.toDate);
    return new Date();
  }, [filters.toDate]);

  const handlePickerChange = useCallback(({ from, to }) => {
    const formatLocalDate = (d) => {
      if (!d) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatLocalDate(from),
      toDate: formatLocalDate(to)
    }));
  }, [onFilterChange]);

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      supplier: [],
      partNo: ""
    });
    setChartType("bar");
    setSuppSearch("");
  };

  const setupChart = useCallback(
    (canvas) => {
      const targetVal = targetConfig?.supplier_rating?.minRating ?? 90;
      const ctx = canvas.getContext("2d");

      const baseData = [88.5, 89.2, 91.0, 90.5, 93.1, 92.5];
      let mainDataset = {
        label: "Supplier Performance Score (%)",
        data: baseData,
        order: 2
      };

      let datasets = [];

      // 1. Target line (always present except in Polar Area chart)
      if (chartType !== "polarArea") {
        datasets.push({
          type: chartType === "radar" ? "radar" : "line",
          label: `Target ${targetVal}%`,
          data: Array(6).fill(targetVal),
          borderColor: "#ef4444",
          borderDash: [6, 3],
          backgroundColor: "transparent",
          tension: 0,
          fill: false,
          pointRadius: 0,
          order: 1
        });
      }

      // 2. Custom styling based on active chartType
      if (chartType === "line") {
        mainDataset = {
          ...mainDataset,
          type: "line",
          borderColor: "#eab308",
          backgroundColor: "transparent",
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointBackgroundColor: "#eab308",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4.5,
          pointHoverRadius: 7,
          pointHoverBorderWidth: 3,
        };
        datasets.push(mainDataset);
      } else if (chartType === "area") {
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, "rgba(234, 179, 8, 0.35)");
        gradient.addColorStop(1, "rgba(234, 179, 8, 0.0)");

        mainDataset = {
          ...mainDataset,
          type: "line",
          borderColor: "#eab308",
          backgroundColor: gradient,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#eab308",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6,
        };
        datasets.push(mainDataset);
      } else if (chartType === "radar") {
        // Radar (Radial Spider) Chart
        mainDataset = {
          ...mainDataset,
          type: "radar",
          borderColor: "#eab308",
          backgroundColor: "rgba(234, 179, 8, 0.25)",
          borderWidth: 2,
          pointBackgroundColor: "#eab308",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
          pointRadius: 3.5,
          pointHoverRadius: 5.5,
          fill: true
        };
        datasets.push(mainDataset);
      } else if (chartType === "polarArea") {
        // Polar Area Chart
        const opacities = [0.45, 0.53, 0.61, 0.69, 0.77, 0.85];
        mainDataset = {
          ...mainDataset,
          type: "polarArea",
          backgroundColor: opacities.map(o => `rgba(234, 179, 8, ${o})`),
          borderColor: "#eab308",
          borderWidth: 1.5,
          hoverBackgroundColor: "#eab308"
        };
        datasets.push(mainDataset);
      } else if (chartType === "stepped") {
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, "rgba(234, 179, 8, 0.2)");
        gradient.addColorStop(1, "rgba(234, 179, 8, 0.0)");

        mainDataset = {
          ...mainDataset,
          type: "line",
          borderColor: "#eab308",
          backgroundColor: gradient,
          borderWidth: 2.5,
          stepped: "middle",
          fill: true,
          pointBackgroundColor: "#eab308",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6,
        };
        datasets.push(mainDataset);
      } else {
        // Bar Chart (Default)
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, "rgba(234, 179, 8, 0.85)");
        gradient.addColorStop(1, "rgba(234, 179, 8, 0.2)");

        mainDataset = {
          ...mainDataset,
          type: "bar",
          backgroundColor: gradient,
          borderColor: "#eab308",
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: "bottom",
          hoverBackgroundColor: "#eab308",
        };
        datasets.push(mainDataset);
      }

      return new Chart(canvas, {
        type: chartType === "polarArea" ? "polarArea" : (chartType === "radar" ? "radar" : (chartType === "bar" ? "bar" : "line")),
        data: {
          labels: ["Jan-26", "Feb-26", "Mar-26", "Apr-26", "May-26", "Jun-26"],
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "index",
            intersect: false,
          },
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: {
                boxWidth: 10,
                boxHeight: 10,
                usePointStyle: true,
                font: { family: "Outfit, Inter, sans-serif", size: 10, weight: "500" },
                color: "#475569"
              }
            },
            tooltip: {
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              titleFont: { family: "Outfit, Inter, sans-serif", size: 11, weight: "600" },
              bodyFont: { family: "Outfit, Inter, sans-serif", size: 11 },
              padding: 10,
              cornerRadius: 8,
              displayColors: true,
              boxWidth: 7,
              boxHeight: 7,
              usePointStyle: true,
              borderColor: "rgba(255, 255, 255, 0.1)",
              borderWidth: 1,
            }
          },
          scales: (chartType === "radar" || chartType === "polarArea") ? {
            r: {
              angleLines: {
                display: chartType === "radar",
                color: "rgba(226, 232, 240, 0.8)"
              },
              grid: {
                circular: true,
                color: "rgba(226, 232, 240, 0.6)"
              },
              ticks: {
                display: true,
                font: { family: "Outfit, Inter, sans-serif", size: 9, weight: "500" },
                color: "#64748b",
                backdropColor: "transparent"
              },
              suggestedMin: chartType === "polarArea" ? 0 : 50,
              suggestedMax: 100
            }
          } : {
            x: {
              grid: { display: false, drawBorder: false },
              ticks: {
                font: { family: "Outfit, Inter, sans-serif", size: 10, weight: "500" },
                color: "#64748b"
              }
            },
            y: {
              min: 50,
              max: 100,
              grid: {
                color: "rgba(226, 232, 240, 0.6)",
                borderDash: [4, 4],
                drawBorder: false
              },
              ticks: {
                callback: (val) => `${val}%`,
                font: { family: "Outfit, Inter, sans-serif", size: 10, weight: "500" },
                color: "#64748b"
              }
            }
          }
        }
      });
    },
    [targetConfig?.supplier_rating?.minRating, chartType]
  );

  const rebuildToken = `supplier-rating-chart|${targetConfig?.supplier_rating?.minRating ?? 90}|${chartType}`;

  return (
    <PremiumDashboardView
      title="Supplier Rating"
      icon={Star}
      color="#eab308"
      kpis={kpis}
      setupChart={setupChart}
      chartHeight={260}
      rangeHint="Month Wise Rating Score"
      onClose={onClose}
      rebuildToken={rebuildToken}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" style={{ maxWidth: "230px" }}>
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Supplier Multi-Select Dropdown */}
        <div className="pp1-filter-group" ref={suppRef} style={{ width: "230px", maxWidth: "230px", '--act-color': '#eab308' }}>
          <label className="pp1-filter-label">Supplier Name</label>
          <div className="pp1-multiselect-wrap">
            <div
              className={`pp1-multiselect-trigger ${suppOpen ? 'pp1-multiselect-trigger--open' : ''}`}
              onClick={() => setSuppOpen(!suppOpen)}
            >
              <div className="pp1-multiselect-value" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "calc(100% - 16px)", fontWeight: "500" }}>
                {(filters.supplier || []).length === 0 ? (
                  <span className="pp1-multiselect-placeholder">Select Suppliers...</span>
                ) : (
                  (filters.supplier || []).join(", ")
                )}
              </div>
              <ChevronDown size={11} className="pp1-dropdown-caret" style={{ transform: suppOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>

            {suppOpen && (
              <div className="pp1-multiselect-menu">
                {/* Search Bar */}
                <div style={{ padding: "2px 4px 6px 4px" }}>
                  <input
                    type="text"
                    className="pp1-filter-input"
                    placeholder="Search supplier..."
                    style={{ width: "100%", height: "24px", padding: "2px 8px", fontSize: "10.5px", borderRadius: "6px", border: "1px solid rgba(226, 232, 240, 0.9)" }}
                    value={suppSearch}
                    onChange={e => setSuppSearch(e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                </div>

                {/* Select All Option */}
                <div
                  className={`pp1-multiselect-option pp1-multiselect-option--all ${isAllSuppSelected ? 'pp1-multiselect-option--selected' : ''}`}
                  onClick={toggleSelectAllSupp}
                >
                  <div className="pp1-multiselect-checkbox-box">
                    {isAllSuppSelected && (
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pp1-multiselect-checkbox-icon">
                        <polyline points="1.5 5.5 3.5 7.5 8.5 2.5" />
                      </svg>
                    )}
                  </div>
                  <span>Select All ({allSuppliers.length})</span>
                </div>

                {/* Individual Options */}
                {filteredSuppliers.length === 0 ? (
                  <div style={{ padding: "8px", textAlign: "center", fontSize: "10.5px", color: "#94a3b8" }}>No results found</div>
                ) : (
                  filteredSuppliers.map(s => {
                    const isSelected = (filters.supplier || []).includes(s);
                    return (
                      <div
                        key={s}
                        className={`pp1-multiselect-option ${isSelected ? 'pp1-multiselect-option--selected' : ''}`}
                        onClick={() => toggleSupplier(s)}
                      >
                        <div className="pp1-multiselect-checkbox-box">
                          {isSelected && (
                            <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pp1-multiselect-checkbox-icon">
                              <polyline points="1.5 5.5 3.5 7.5 8.5 2.5" />
                            </svg>
                          )}
                        </div>
                        <span>{s}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chart Type Dropdown Filter */}
        <div className="pp1-filter-group" ref={chartTypeRef} style={{ maxWidth: "120px" }}>
          <label className="pp1-filter-label">Chart Type</label>
          <div className="pp1-part-autocomplete-wrap">
            <div
              className="pp1-filter-input pp1-dropdown-trigger"
              onClick={() => setChartTypeOpen(!chartTypeOpen)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {chartType === "bar" ? (
                  <BarChart2 size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "area" ? (
                  <AreaChart size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "radar" ? (
                  <Radar size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "stepped" ? (
                  <Activity size={12} className="pp1-dropdown-trigger-icon" />
                ) : (
                  <LucideLineChart size={12} className="pp1-dropdown-trigger-icon" />
                )}
                <span style={{ textTransform: "capitalize" }}>{chartType === "polarArea" ? "Polar Area" : chartType === "radar" ? "Radar" : chartType === "stepped" ? "Stepped" : chartType}</span>
              </div>
              <ChevronDown size={11} className="pp1-dropdown-caret" style={{ transform: chartTypeOpen ? "rotate(180deg)" : "none" }} />
            </div>

            {chartTypeOpen && (
              <div className="pp1-part-suggestions pp1-dropdown-menu">
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "line" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("line");
                    setChartTypeOpen(false);
                  }}
                >
                  <LucideLineChart size={12} />
                  <span>Line Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "bar" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("bar");
                    setChartTypeOpen(false);
                  }}
                >
                  <BarChart2 size={12} />
                  <span>Bar Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "area" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("area");
                    setChartTypeOpen(false);
                  }}
                >
                  <AreaChart size={12} />
                  <span>Area Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "radar" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("radar");
                    setChartTypeOpen(false);
                  }}
                >
                  <Radar size={12} />
                  <span>Radar Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "polarArea" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("polarArea");
                    setChartTypeOpen(false);
                  }}
                >
                  <PieChart size={12} />
                  <span>Polar Area</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "stepped" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("stepped");
                    setChartTypeOpen(false);
                  }}
                >
                  <Activity size={12} />
                  <span>Stepped Chart</span>
                </div>
              </div>
            )}
          </div>
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

function SupplierRatingBottomTable({ filters }) {
  const columns = [
    "Supplier Name",
    "Category",
    "Total Orders",
    "On-Time Delivery %",
    "Quality Pass %",
    "Overall Rating",
    "Status"
  ];

  const allRows = [
    { supplier: "Anims Parts Ltd", partNo: "BRK-PAD-M1", date: "2026-06-10", cols: ["Anims Parts Ltd", "Raw Materials", "150", "95%", "98%", "96.5%", "Excellent"] },
    { supplier: "Virrudh Tech", partNo: "ROT-DSC-X4", date: "2026-06-12", cols: ["Virrudh Tech", "Machinery", "40", "92%", "97%", "94.5%", "Good"] },
    { supplier: "Star Logistics", partNo: "GBX-HNG-S2", date: "2026-06-14", cols: ["Star Logistics", "Services", "85", "88%", "99%", "93.5%", "Good"] },
    { supplier: "Srinivasa Castings", partNo: "ENG-MNT-H1", date: "2026-06-15", cols: ["Srinivasa Castings", "Raw Materials", "120", "82%", "94%", "88.0%", "Average"] },
    { supplier: "Royal Packaging", partNo: "TRK-AXL-L9", date: "2026-06-18", cols: ["Royal Packaging", "Packaging", "65", "91%", "98%", "94.5%", "Good"] }
  ];

  const rows = React.useMemo(() => {
    let list = allRows;
    if (filters?.supplier && filters.supplier.length > 0) {
      list = list.filter(r => filters.supplier.includes(r.supplier));
    }
    if (filters?.partNo) {
      list = list.filter(r => r.partNo.toLowerCase().includes(filters.partNo.toLowerCase()));
    }
    if (filters?.fromDate) {
      list = list.filter(r => r.date >= filters.fromDate);
    }
    if (filters?.toDate) {
      list = list.filter(r => r.date <= filters.toDate);
    }
    return list.map(r => r.cols);
  }, [filters]);

  return <PremiumDashboardBottomTable title="Supplier Rating Registry" columns={columns} rows={rows} />;
}

/* ── Vendor Rating View (UI Alone) ────────────────────────────────── */
function VendorRatingReportDashboardView({ filters, onFilterChange, onClose, targetConfig }) {
  const kpis = [
    { label: "Avg Rating", value: "94.0%", icon: Award, color: "#3b82f6" },
    { label: "On-Time Supply", value: "95.1%", icon: Truck, color: "#10b981" },
    { label: "Quality Compliance", value: "97.8%", icon: CheckCircle2, color: "#8b5cf6" },
    { label: "Active Vendors", value: "8", icon: Users, color: "#eab308" }
  ];

  const [vendOpen, setVendOpen] = useState(false);
  const vendRef = useRef(null);
  const [chartType, setChartType] = useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = useState(false);
  const chartTypeRef = useRef(null);
  const [vendSearch, setVendSearch] = useState("");

  const allVendors = ["Super Tech Industries", "Precision Castings", "Dynamic Logistics", "Apex Fasteners", "Elite Tooling"];

  const filteredVendors = useMemo(() => {
    const q = vendSearch.trim().toLowerCase();
    if (!q) return allVendors;
    return allVendors.filter(v => v.toLowerCase().includes(q));
  }, [vendSearch]);

  const toggleVendor = (v) => {
    const current = filters.vendor || [];
    const next = current.includes(v) ? current.filter(x => x !== v) : [...current, v];
    onFilterChange(prev => ({ ...prev, vendor: next }));
  };

  const isAllVendSelected = (filters.vendor || []).length === allVendors.length;
  const toggleSelectAllVend = () => {
    onFilterChange(prev => ({
      ...prev,
      vendor: isAllVendSelected ? [] : [...allVendors]
    }));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (vendRef.current && !vendRef.current.contains(event.target)) {
        setVendOpen(false);
        setVendSearch("");
      }
      if (chartTypeRef.current && !chartTypeRef.current.contains(event.target)) {
        setChartTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = useMemo(() => {
    if (filters.fromDate) return new Date(filters.fromDate);
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, [filters.fromDate]);

  const pickerTo = useMemo(() => {
    if (filters.toDate) return new Date(filters.toDate);
    return new Date();
  }, [filters.toDate]);

  const handlePickerChange = useCallback(({ from, to }) => {
    const formatLocalDate = (d) => {
      if (!d) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatLocalDate(from),
      toDate: formatLocalDate(to)
    }));
  }, [onFilterChange]);

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      vendor: [],
      partNo: ""
    });
    setChartType("bar");
    setVendSearch("");
  };

  const setupChart = useCallback(
    (canvas) => {
      const targetVal = targetConfig?.vendor_rating?.minRating ?? 90;
      const ctx = canvas.getContext("2d");

      const baseData = [89.0, 91.5, 93.0, 92.0, 95.5, 94.0];
      let mainDataset = {
        label: "Vendor Performance Score (%)",
        data: baseData,
        order: 2
      };

      let datasets = [];

      // 1. Target line (always present except in Polar Area chart)
      if (chartType !== "polarArea") {
        datasets.push({
          type: chartType === "radar" ? "radar" : "line",
          label: `Target ${targetVal}%`,
          data: Array(6).fill(targetVal),
          borderColor: "#ef4444",
          borderDash: [6, 3],
          backgroundColor: "transparent",
          tension: 0,
          fill: false,
          pointRadius: 0,
          order: 1
        });
      }

      // 2. Custom styling based on active chartType
      if (chartType === "line") {
        mainDataset = {
          ...mainDataset,
          type: "line",
          borderColor: "#3b82f6",
          backgroundColor: "transparent",
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointBackgroundColor: "#3b82f6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4.5,
          pointHoverRadius: 7,
          pointHoverBorderWidth: 3,
        };
        datasets.push(mainDataset);
      } else if (chartType === "area") {
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.35)");
        gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)");

        mainDataset = {
          ...mainDataset,
          type: "line",
          borderColor: "#3b82f6",
          backgroundColor: gradient,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#3b82f6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6,
        };
        datasets.push(mainDataset);
      } else if (chartType === "radar") {
        // Radar (Radial Spider) Chart
        mainDataset = {
          ...mainDataset,
          type: "radar",
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.25)",
          borderWidth: 2,
          pointBackgroundColor: "#3b82f6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
          pointRadius: 3.5,
          pointHoverRadius: 5.5,
          fill: true
        };
        datasets.push(mainDataset);
      } else if (chartType === "polarArea") {
        // Polar Area Chart
        const opacities = [0.45, 0.53, 0.61, 0.69, 0.77, 0.85];
        mainDataset = {
          ...mainDataset,
          type: "polarArea",
          backgroundColor: opacities.map(o => `rgba(59, 130, 246, ${o})`),
          borderColor: "#3b82f6",
          borderWidth: 1.5,
          hoverBackgroundColor: "#3b82f6"
        };
        datasets.push(mainDataset);
      } else if (chartType === "stepped") {
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.2)");
        gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)");

        mainDataset = {
          ...mainDataset,
          type: "line",
          borderColor: "#3b82f6",
          backgroundColor: gradient,
          borderWidth: 2.5,
          stepped: "middle",
          fill: true,
          pointBackgroundColor: "#3b82f6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6,
        };
        datasets.push(mainDataset);
      } else {
        // Bar Chart (Default)
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.85)");
        gradient.addColorStop(1, "rgba(59, 130, 246, 0.2)");

        mainDataset = {
          ...mainDataset,
          type: "bar",
          backgroundColor: gradient,
          borderColor: "#3b82f6",
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: "bottom",
          hoverBackgroundColor: "#3b82f6",
        };
        datasets.push(mainDataset);
      }

      return new Chart(canvas, {
        type: chartType === "polarArea" ? "polarArea" : (chartType === "radar" ? "radar" : (chartType === "bar" ? "bar" : "line")),
        data: {
          labels: ["Jan-26", "Feb-26", "Mar-26", "Apr-26", "May-26", "Jun-26"],
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "index",
            intersect: false,
          },
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: {
                boxWidth: 10,
                boxHeight: 10,
                usePointStyle: true,
                font: { family: "Outfit, Inter, sans-serif", size: 10, weight: "500" },
                color: "#475569"
              }
            },
            tooltip: {
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              titleFont: { family: "Outfit, Inter, sans-serif", size: 11, weight: "600" },
              bodyFont: { family: "Outfit, Inter, sans-serif", size: 11 },
              padding: 10,
              cornerRadius: 8,
              displayColors: true,
              boxWidth: 7,
              boxHeight: 7,
              usePointStyle: true,
              borderColor: "rgba(255, 255, 255, 0.1)",
              borderWidth: 1,
            }
          },
          scales: (chartType === "radar" || chartType === "polarArea") ? {
            r: {
              angleLines: {
                display: chartType === "radar",
                color: "rgba(226, 232, 240, 0.8)"
              },
              grid: {
                circular: true,
                color: "rgba(226, 232, 240, 0.6)"
              },
              ticks: {
                display: true,
                font: { family: "Outfit, Inter, sans-serif", size: 9, weight: "500" },
                color: "#64748b",
                backdropColor: "transparent"
              },
              suggestedMin: chartType === "polarArea" ? 0 : 50,
              suggestedMax: 100
            }
          } : {
            x: {
              grid: { display: false, drawBorder: false },
              ticks: {
                font: { family: "Outfit, Inter, sans-serif", size: 10, weight: "500" },
                color: "#64748b"
              }
            },
            y: {
              min: 50,
              max: 100,
              grid: {
                color: "rgba(226, 232, 240, 0.6)",
                borderDash: [4, 4],
                drawBorder: false
              },
              ticks: {
                callback: (val) => `${val}%`,
                font: { family: "Outfit, Inter, sans-serif", size: 10, weight: "500" },
                color: "#64748b"
              }
            }
          }
        }
      });
    },
    [targetConfig?.vendor_rating?.minRating, chartType]
  );

  const rebuildToken = `vendor-rating-chart|${targetConfig?.vendor_rating?.minRating ?? 90}|${chartType}`;

  return (
    <PremiumDashboardView
      title="Vendor Rating"
      icon={Award}
      color="#3b82f6"
      kpis={kpis}
      setupChart={setupChart}
      chartHeight={260}
      rangeHint="Month Wise Rating Score"
      onClose={onClose}
      rebuildToken={rebuildToken}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" style={{ maxWidth: "230px" }}>
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Vendor Multi-Select Dropdown */}
        <div className="pp1-filter-group" ref={vendRef} style={{ width: "230px", maxWidth: "230px", '--act-color': '#3b82f6' }}>
          <label className="pp1-filter-label">Vendor Name</label>
          <div className="pp1-multiselect-wrap">
            <div
              className={`pp1-multiselect-trigger ${vendOpen ? 'pp1-multiselect-trigger--open' : ''}`}
              onClick={() => setVendOpen(!vendOpen)}
            >
              <div className="pp1-multiselect-value" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "calc(100% - 16px)", fontWeight: "500" }}>
                {(filters.vendor || []).length === 0 ? (
                  <span className="pp1-multiselect-placeholder">Select Vendors...</span>
                ) : (
                  (filters.vendor || []).join(", ")
                )}
              </div>
              <ChevronDown size={11} className="pp1-dropdown-caret" style={{ transform: vendOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>

            {vendOpen && (
              <div className="pp1-multiselect-menu">
                {/* Search Bar */}
                <div style={{ padding: "2px 4px 6px 4px" }}>
                  <input
                    type="text"
                    className="pp1-filter-input"
                    placeholder="Search vendor..."
                    style={{ width: "100%", height: "24px", padding: "2px 8px", fontSize: "10.5px", borderRadius: "6px", border: "1px solid rgba(226, 232, 240, 0.9)" }}
                    value={vendSearch}
                    onChange={e => setVendSearch(e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                </div>

                {/* Select All Option */}
                <div
                  className={`pp1-multiselect-option pp1-multiselect-option--all ${isAllVendSelected ? 'pp1-multiselect-option--selected' : ''}`}
                  onClick={toggleSelectAllVend}
                >
                  <div className="pp1-multiselect-checkbox-box">
                    {isAllVendSelected && (
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pp1-multiselect-checkbox-icon">
                        <polyline points="1.5 5.5 3.5 7.5 8.5 2.5" />
                      </svg>
                    )}
                  </div>
                  <span>Select All ({allVendors.length})</span>
                </div>

                {/* Individual Options */}
                {filteredVendors.length === 0 ? (
                  <div style={{ padding: "8px", textAlign: "center", fontSize: "10.5px", color: "#94a3b8" }}>No results found</div>
                ) : (
                  filteredVendors.map(v => {
                    const isSelected = (filters.vendor || []).includes(v);
                    return (
                      <div
                        key={v}
                        className={`pp1-multiselect-option ${isSelected ? 'pp1-multiselect-option--selected' : ''}`}
                        onClick={() => toggleVendor(v)}
                      >
                        <div className="pp1-multiselect-checkbox-box">
                          {isSelected && (
                            <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pp1-multiselect-checkbox-icon">
                              <polyline points="1.5 5.5 3.5 7.5 8.5 2.5" />
                            </svg>
                          )}
                        </div>
                        <span>{v}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chart Type Dropdown Filter */}
        <div className="pp1-filter-group" ref={chartTypeRef} style={{ maxWidth: "120px" }}>
          <label className="pp1-filter-label">Chart Type</label>
          <div className="pp1-part-autocomplete-wrap">
            <div
              className="pp1-filter-input pp1-dropdown-trigger"
              onClick={() => setChartTypeOpen(!chartTypeOpen)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {chartType === "bar" ? (
                  <BarChart2 size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "area" ? (
                  <AreaChart size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "radar" ? (
                  <Radar size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "stepped" ? (
                  <Activity size={12} className="pp1-dropdown-trigger-icon" />
                ) : (
                  <LucideLineChart size={12} className="pp1-dropdown-trigger-icon" />
                )}
                <span style={{ textTransform: "capitalize" }}>{chartType === "polarArea" ? "Polar Area" : chartType === "radar" ? "Radar" : chartType === "stepped" ? "Stepped" : chartType}</span>
              </div>
              <ChevronDown size={11} className="pp1-dropdown-caret" style={{ transform: chartTypeOpen ? "rotate(180deg)" : "none" }} />
            </div>

            {chartTypeOpen && (
              <div className="pp1-part-suggestions pp1-dropdown-menu">
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "line" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("line");
                    setChartTypeOpen(false);
                  }}
                >
                  <LucideLineChart size={12} />
                  <span>Line Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "bar" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("bar");
                    setChartTypeOpen(false);
                  }}
                >
                  <BarChart2 size={12} />
                  <span>Bar Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "area" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("area");
                    setChartTypeOpen(false);
                  }}
                >
                  <AreaChart size={12} />
                  <span>Area Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "radar" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("radar");
                    setChartTypeOpen(false);
                  }}
                >
                  <Radar size={12} />
                  <span>Radar Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "polarArea" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("polarArea");
                    setChartTypeOpen(false);
                  }}
                >
                  <PieChart size={12} />
                  <span>Polar Area Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "stepped" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("stepped");
                    setChartTypeOpen(false);
                  }}
                >
                  <Activity size={12} />
                  <span>Stepped Chart</span>
                </div>
              </div>
            )}
          </div>
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

function VendorRatingBottomTable({ filters }) {
  const columns = [
    "Vendor Name",
    "Category",
    "Total Orders",
    "On-Time Delivery %",
    "Quality Pass %",
    "Overall Rating",
    "Status"
  ];

  const allRows = [
    { vendor: "Super Tech Industries", partNo: "BRK-PAD-M1", date: "2026-06-10", cols: ["Super Tech Industries", "Raw Materials", "180", "96%", "98%", "97.0%", "Excellent"] },
    { vendor: "Precision Castings", partNo: "ROT-DSC-X4", date: "2026-06-12", cols: ["Precision Castings", "Machinery", "50", "94%", "97%", "95.5%", "Excellent"] },
    { vendor: "Dynamic Logistics", partNo: "GBX-HNG-S2", date: "2026-06-14", cols: ["Dynamic Logistics", "Services", "95", "90%", "99%", "94.5%", "Good"] },
    { vendor: "Apex Fasteners", partNo: "ENG-MNT-H1", date: "2026-06-15", cols: ["Apex Fasteners", "Raw Materials", "140", "85%", "95%", "90.0%", "Good"] },
    { vendor: "Elite Tooling", partNo: "TRK-AXL-L9", date: "2026-06-18", cols: ["Elite Tooling", "Packaging", "80", "92%", "98%", "95.0%", "Excellent"] }
  ];

  const rows = React.useMemo(() => {
    let list = allRows;
    if (filters?.vendor && filters.vendor.length > 0) {
      list = list.filter(r => filters.vendor.includes(r.vendor));
    }
    if (filters?.partNo) {
      list = list.filter(r => r.partNo.toLowerCase().includes(filters.partNo.toLowerCase()));
    }
    if (filters?.fromDate) {
      list = list.filter(r => r.date >= filters.fromDate);
    }
    if (filters?.toDate) {
      list = list.filter(r => r.date <= filters.toDate);
    }
    return list.map(r => r.cols);
  }, [filters]);

  return <PremiumDashboardBottomTable title="Vendor Rating Registry" columns={columns} rows={rows} />;
}

/* ── FG Value View (UI Alone) ────────────────────────────────────── */
function FgValueReportDashboardView({ filters, onFilterChange, onClose, targetConfig }) {
  const [customerOpen, setCustomerOpen] = React.useState(false);
  const [itemCodeOpen, setItemCodeOpen] = React.useState(false);
  const [chartType, setChartType] = React.useState("line");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);
  const [custSearch, setCustSearch] = React.useState("");

  const customerRef = React.useRef(null);
  const itemCodeRef = React.useRef(null);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerRef.current && !customerRef.current.contains(event.target)) {
        setCustomerOpen(false);
        setCustSearch("");
      }
      if (itemCodeRef.current && !itemCodeRef.current.contains(event.target)) {
        setItemCodeOpen(false);
      }
      if (chartTypeRef.current && !chartTypeRef.current.contains(event.target)) {
        setChartTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = React.useMemo(() => filters?.fromDate ? new Date(filters.fromDate) : null, [filters?.fromDate]);
  const pickerTo = React.useMemo(() => filters?.toDate ? new Date(filters.toDate) : null, [filters?.toDate]);

  const handlePickerChange = ({ from, to }) => {
    const formatDate = (d) => {
      if (!d) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatDate(from),
      toDate: formatDate(to)
    }));
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      customer: [],
      itemCode: "",
      ageDays: ""
    });
    setChartType("line");
    setCustSearch("");
  };

  const chartData = React.useMemo(() => {
    let offset = 0;
    if (filters?.customer && filters.customer.length > 0) {
      const totalHash = filters.customer.reduce((acc, cust) => {
        return acc + cust.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
      }, 0);
      offset += (totalHash % 6) - 3;
    }
    if (filters?.itemCode) {
      offset += filters.itemCode.endsWith("2") || filters.itemCode.endsWith("4") ? 4 : -3;
    }
    const baseValues = [45.2, 47.8, 51.5, 49.0, 53.2, 48.5];
    return baseValues.map(v => Math.max(10, v + offset));
  }, [filters]);

  const setupChart = React.useCallback(
    (canvas) => {
      const targetVal = targetConfig?.fg_value?.maxStockValueL ?? 60.0;
      const ctx = canvas.getContext("2d");

      let mainDataset = {
        label: "FG Value (₹ Lakhs)",
        data: chartData,
        order: 2
      };

      let datasets = [];

      // 1. Limit line (always present except in Polar Area chart)
      if (chartType !== "polarArea") {
        datasets.push({
          label: `Limit ₹${targetVal}L`,
          data: Array(6).fill(targetVal),
          borderColor: "#ef4444",
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          type: chartType === "radar" ? "radar" : "line",
          order: 1
        });
      }

      // 2. Custom styling based on active chartType
      if (chartType === "bar") {
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, "rgba(236, 72, 153, 0.85)");
        gradient.addColorStop(1, "rgba(236, 72, 153, 0.2)");

        mainDataset = {
          ...mainDataset,
          type: "bar",
          backgroundColor: gradient,
          borderColor: "#ec4899",
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: "bottom",
          hoverBackgroundColor: "#ec4899",
        };
        datasets.push(mainDataset);
      } else if (chartType === "area") {
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, "rgba(236, 72, 153, 0.35)");
        gradient.addColorStop(1, "rgba(236, 72, 153, 0.0)");

        mainDataset = {
          ...mainDataset,
          type: "line",
          borderColor: "#ec4899",
          backgroundColor: gradient,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#ec4899",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6,
        };
        datasets.push(mainDataset);
      } else if (chartType === "radar") {
        // Radar (Radial Spider) Chart
        mainDataset = {
          ...mainDataset,
          type: "radar",
          borderColor: "#ec4899",
          backgroundColor: "rgba(236, 72, 153, 0.25)",
          borderWidth: 2,
          pointBackgroundColor: "#ec4899",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
          pointRadius: 3.5,
          pointHoverRadius: 5.5,
          fill: true
        };
        datasets.push(mainDataset);
      } else if (chartType === "polarArea") {
        // Polar Area Chart
        const opacities = [0.45, 0.53, 0.61, 0.69, 0.77, 0.85];
        mainDataset = {
          ...mainDataset,
          type: "polarArea",
          backgroundColor: opacities.map(o => `rgba(236, 72, 153, ${o})`),
          borderColor: "#ec4899",
          borderWidth: 1.5,
          hoverBackgroundColor: "#ec4899"
        };
        datasets.push(mainDataset);
      } else if (chartType === "stepped") {
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, "rgba(236, 72, 153, 0.2)");
        gradient.addColorStop(1, "rgba(236, 72, 153, 0.0)");

        mainDataset = {
          ...mainDataset,
          type: "line",
          borderColor: "#ec4899",
          backgroundColor: gradient,
          borderWidth: 2.5,
          stepped: "middle",
          fill: true,
          pointBackgroundColor: "#ec4899",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6,
        };
        datasets.push(mainDataset);
      } else {
        // Pure Line Chart (Default)
        mainDataset = {
          ...mainDataset,
          type: "line",
          borderColor: "#ec4899",
          backgroundColor: "transparent",
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointBackgroundColor: "#ec4899",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4.5,
          pointHoverRadius: 7,
          pointHoverBorderWidth: 3,
        };
        datasets.push(mainDataset);
      }

      return new Chart(canvas, {
        type: chartType === "polarArea" ? "polarArea" : (chartType === "radar" ? "radar" : (chartType === "bar" ? "bar" : "line")),
        data: {
          labels: ["Jan-26", "Feb-26", "Mar-26", "Apr-26", "May-26", "Jun-26"],
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "index",
            intersect: false,
          },
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: {
                boxWidth: 10,
                boxHeight: 10,
                usePointStyle: true,
                font: { family: "Outfit, Inter, sans-serif", size: 10, weight: "500" },
                color: "#475569"
              }
            },
            tooltip: {
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              titleFont: { family: "Outfit, Inter, sans-serif", size: 11, weight: "600" },
              bodyFont: { family: "Outfit, Inter, sans-serif", size: 11 },
              padding: 10,
              cornerRadius: 8,
              displayColors: true,
              boxWidth: 7,
              boxHeight: 7,
              usePointStyle: true,
              borderColor: "rgba(255, 255, 255, 0.1)",
              borderWidth: 1,
            }
          },
          scales: (chartType === "radar" || chartType === "polarArea") ? {
            r: {
              angleLines: {
                display: chartType === "radar",
                color: "rgba(226, 232, 240, 0.8)"
              },
              grid: {
                circular: true,
                color: "rgba(226, 232, 240, 0.6)"
              },
              ticks: {
                display: true,
                callback: (v) => `₹${v}L`,
                font: { family: "Outfit, Inter, sans-serif", size: 9, weight: "500" },
                color: "#64748b",
                backdropColor: "transparent"
              },
              suggestedMin: 0,
              suggestedMax: 80
            }
          } : {
            x: {
              grid: { display: false, drawBorder: false },
              ticks: {
                font: { family: "Outfit, Inter, sans-serif", size: 10, weight: "500" },
                color: "#64748b"
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(226, 232, 240, 0.6)",
                borderDash: [4, 4],
                drawBorder: false
              },
              ticks: {
                callback: (v) => `₹${v}L`,
                font: { family: "Outfit, Inter, sans-serif", size: 10, weight: "500" },
                color: "#64748b"
              }
            }
          }
        }
      });
    },
    [chartData, targetConfig?.fg_value?.maxStockValueL, chartType]
  );

  const allCustomers = ["Virrudheeswara Eng", "Anims Parts Ltd", "Star Logistics", "Srinivasa Castings", "Royal Packaging"];
  const allItemCodes = ["P-1001", "P-1002", "P-1003", "P-1004", "P-1005", "P-1006"];

  const filteredCustomers = React.useMemo(() => {
    const q = custSearch.trim().toLowerCase();
    if (!q) return allCustomers;
    return allCustomers.filter(c => c.toLowerCase().includes(q));
  }, [custSearch]);

  const toggleCustomer = (c) => {
    const current = filters.customer || [];
    const next = current.includes(c) ? current.filter(x => x !== c) : [...current, c];
    onFilterChange(prev => ({ ...prev, customer: next }));
  };

  const isAllCustSelected = (filters.customer || []).length === allCustomers.length;
  const toggleSelectAllCust = () => {
    onFilterChange(prev => ({
      ...prev,
      customer: isAllCustSelected ? [] : [...allCustomers]
    }));
  };

  const itemSuggestions = React.useMemo(() => {
    if (!filters.itemCode) return allItemCodes;
    return allItemCodes.filter(i => i.toLowerCase().includes(filters.itemCode.toLowerCase()));
  }, [filters.itemCode]);

  const kpis = [
    { label: "Total FG Value", value: "₹48.5L", icon: Package, color: "#ec4899" },
    { label: "Available Items", value: "45", icon: ClipboardList, color: "#10b981" },
    { label: "FG Customers", value: "5", icon: Users, color: "#3b82f6" },
    { label: "Long Age Days", value: "60 Days", icon: Calendar, color: "#eab308" }
  ];

  const rebuildToken = `fg-value-chart|${targetConfig?.fg_value?.maxStockValueL ?? 60.0}|${JSON.stringify(chartData)}|${chartType}`;

  return (
    <PremiumDashboardView
      title="FG Value"
      icon={Package}
      color="#ec4899"
      kpis={kpis}
      setupChart={setupChart}
      chartHeight={260}
      rangeHint="Month Wise FG Stock Value"
      onClose={onClose}
      rebuildToken={rebuildToken}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" style={{ maxWidth: "230px" }}>
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Customer Multi-Select Dropdown */}
        <div className="pp1-filter-group" ref={customerRef} style={{ width: "230px", maxWidth: "230px", '--act-color': '#ec4899' }}>
          <label className="pp1-filter-label">Customer Name</label>
          <div className="pp1-multiselect-wrap">
            <div
              className={`pp1-multiselect-trigger ${customerOpen ? 'pp1-multiselect-trigger--open' : ''}`}
              onClick={() => setCustomerOpen(!customerOpen)}
            >
              <div className="pp1-multiselect-value" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "calc(100% - 16px)", fontWeight: "500" }}>
                {(filters.customer || []).length === 0 ? (
                  <span className="pp1-multiselect-placeholder">Select Customers...</span>
                ) : (
                  (filters.customer || []).join(", ")
                )}
              </div>
              <ChevronDown size={11} className="pp1-dropdown-caret" style={{ transform: customerOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>

            {customerOpen && (
              <div className="pp1-multiselect-menu">
                {/* Search Bar */}
                <div style={{ padding: "2px 4px 6px 4px" }}>
                  <input
                    type="text"
                    className="pp1-filter-input"
                    placeholder="Search customer..."
                    style={{ width: "100%", height: "24px", padding: "2px 8px", fontSize: "10.5px", borderRadius: "6px", border: "1px solid rgba(226, 232, 240, 0.9)" }}
                    value={custSearch}
                    onChange={e => setCustSearch(e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                </div>

                {/* Select All Option */}
                <div
                  className={`pp1-multiselect-option pp1-multiselect-option--all ${isAllCustSelected ? 'pp1-multiselect-option--selected' : ''}`}
                  onClick={toggleSelectAllCust}
                >
                  <div className="pp1-multiselect-checkbox-box">
                    {isAllCustSelected && (
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pp1-multiselect-checkbox-icon">
                        <polyline points="1.5 5.5 3.5 7.5 8.5 2.5" />
                      </svg>
                    )}
                  </div>
                  <span>Select All ({allCustomers.length})</span>
                </div>

                {/* Individual Options */}
                {filteredCustomers.length === 0 ? (
                  <div style={{ padding: "8px", textAlign: "center", fontSize: "10.5px", color: "#94a3b8" }}>No results found</div>
                ) : (
                  filteredCustomers.map(c => {
                    const isSelected = (filters.customer || []).includes(c);
                    return (
                      <div
                        key={c}
                        className={`pp1-multiselect-option ${isSelected ? 'pp1-multiselect-option--selected' : ''}`}
                        onClick={() => toggleCustomer(c)}
                      >
                        <div className="pp1-multiselect-checkbox-box">
                          {isSelected && (
                            <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pp1-multiselect-checkbox-icon">
                              <polyline points="1.5 5.5 3.5 7.5 8.5 2.5" />
                            </svg>
                          )}
                        </div>
                        <span>{c}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Item Code Autocomplete */}
        <div className="pp1-filter-group" ref={itemCodeRef} style={{ maxWidth: "160px" }}>
          <label className="pp1-filter-label">Item Code</label>
          <div className="pp1-part-autocomplete-wrap">
            <input
              type="text"
              className="pp1-filter-input pp1-part-autocomplete-input"
              placeholder="Item Code..."
              value={filters.itemCode}
              onChange={e => {
                handleInputChange("itemCode", e.target.value);
                setItemCodeOpen(true);
              }}
              onFocus={() => setItemCodeOpen(true)}
            />
            {itemCodeOpen && itemSuggestions.length > 0 && (
              <div className="pp1-part-suggestions">
                <div
                  className={`pp1-part-suggestion-item ${!filters.itemCode ? "selected" : ""}`}
                  onClick={() => {
                    handleInputChange("itemCode", "");
                    setItemCodeOpen(false);
                  }}
                >
                  All Items
                </div>
                {itemSuggestions.map(i => (
                  <div
                    key={i}
                    className={`pp1-part-suggestion-item ${filters.itemCode === i ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("itemCode", i);
                      setItemCodeOpen(false);
                    }}
                  >
                    {i}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Age Days Filter */}
        <div className="pp1-filter-group" style={{ maxWidth: "100px" }}>
          <label className="pp1-filter-label">Age Days</label>
          <div className="pp1-age-input-wrapper">
            <Calendar size={12} className="pp1-age-input-icon" />
            <input
              type="number"
              className="pp1-filter-input pp1-age-input"
              placeholder="Min Days..."
              value={filters.ageDays}
              onChange={e => handleInputChange("ageDays", e.target.value)}
              min="0"
            />
          </div>
        </div>

        {/* Chart Type Dropdown Filter */}
        <div className="pp1-filter-group" ref={chartTypeRef} style={{ maxWidth: "120px" }}>
          <label className="pp1-filter-label">Chart Type</label>
          <div className="pp1-part-autocomplete-wrap">
            <div
              className="pp1-filter-input pp1-dropdown-trigger"
              onClick={() => setChartTypeOpen(!chartTypeOpen)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {chartType === "bar" ? (
                  <BarChart2 size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "area" ? (
                  <AreaChart size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "radar" ? (
                  <Radar size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "stepped" ? (
                  <Activity size={12} className="pp1-dropdown-trigger-icon" />
                ) : (
                  <LucideLineChart size={12} className="pp1-dropdown-trigger-icon" />
                )}
                <span style={{ textTransform: "capitalize" }}>{chartType === "polarArea" ? "Polar Area" : chartType === "radar" ? "Radar" : chartType === "stepped" ? "Stepped" : chartType}</span>
              </div>
              <ChevronDown size={11} className="pp1-dropdown-caret" style={{ transform: chartTypeOpen ? "rotate(180deg)" : "none" }} />
            </div>

            {chartTypeOpen && (
              <div className="pp1-part-suggestions pp1-dropdown-menu">
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "line" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("line");
                    setChartTypeOpen(false);
                  }}
                >
                  <LucideLineChart size={12} />
                  <span>Line Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "bar" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("bar");
                    setChartTypeOpen(false);
                  }}
                >
                  <BarChart2 size={12} />
                  <span>Bar Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "area" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("area");
                    setChartTypeOpen(false);
                  }}
                >
                  <AreaChart size={12} />
                  <span>Area Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "radar" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("radar");
                    setChartTypeOpen(false);
                  }}
                >
                  <Radar size={12} />
                  <span>Radar Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "polarArea" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("polarArea");
                    setChartTypeOpen(false);
                  }}
                >
                  <PieChart size={12} />
                  <span>Polar Area Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "stepped" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("stepped");
                    setChartTypeOpen(false);
                  }}
                >
                  <Activity size={12} />
                  <span>Stepped Chart</span>
                </div>
              </div>
            )}
          </div>
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

function FgValueReportBottomTable({ filters }) {
  const offset = React.useMemo(() => {
    let off = 0;
    if (filters?.customer && filters.customer.length > 0) {
      const totalHash = filters.customer.reduce((acc, cust) => {
        return acc + cust.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
      }, 0);
      off += (totalHash % 6) - 3;
    }
    if (filters?.itemCode) {
      off += filters.itemCode.endsWith("2") || filters.itemCode.endsWith("4") ? 1 : -1;
    }
    return off;
  }, [filters]);

  const allRows = [
    { date: "2026-04-10", customer: "Anims Parts Ltd", partNum: "P-1001", desc: "FG Brake Pad Set A", qty: "300", price: "₹2,500", ageDays: 12 },
    { date: "2026-05-12", customer: "Virrudheeswara Eng", partNum: "P-1002", desc: "FG Rotor Disc Premium", qty: "1,500", price: "₹1,800", ageDays: 32 },
    { date: "2026-06-14", customer: "Star Logistics", partNum: "P-1003", desc: "FG Axle assembly L9", qty: "120", price: "₹12,500", ageDays: 5 },
    { date: "2026-07-02", customer: "Srinivasa Castings", partNum: "P-1004", desc: "FG Gear Box Assembly", qty: "25", price: "₹45,000", ageDays: 19 },
    { date: "2026-08-15", customer: "Royal Packaging", partNum: "P-1005", desc: "FG Engine Assembly M1", qty: "10", price: "₹1,50,000", ageDays: 45 },
    { date: "2026-04-18", customer: "Anims Parts Ltd", partNum: "P-1006", desc: "FG Transmission block", qty: "18", price: "₹38,000", ageDays: 60 }
  ];

  const rows = React.useMemo(() => {
    let list = allRows;
    if (filters?.customer && filters.customer.length > 0) {
      list = list.filter(r => filters.customer.includes(r.customer));
    }
    if (filters?.itemCode) {
      list = list.filter(r => r.partNum === filters.itemCode);
    }
    if (filters?.fromDate) {
      list = list.filter(r => r.date >= filters.fromDate);
    }
    if (filters?.toDate) {
      list = list.filter(r => r.date <= filters.toDate);
    }
    if (filters?.ageDays) {
      const minAge = parseInt(filters.ageDays, 10);
      if (!isNaN(minAge)) {
        list = list.filter(r => r.ageDays >= minAge);
      }
    }

    return list.map(row => {
      const baseQty = parseInt(row.qty.replace(/,/g, ""), 10);
      const unitPriceVal = parseInt(row.price.replace(/[₹,]/g, ""), 10);

      const newQty = Math.max(0, baseQty + Math.round(offset * (baseQty > 100 ? 25 : 3)));
      const newValue = newQty * unitPriceVal;

      return [
        row.date,
        row.customer,
        `${row.partNum} - ${row.desc}`,
        newQty.toLocaleString(),
        `₹${unitPriceVal.toLocaleString()}`,
        `₹${newValue.toLocaleString()}`,
        String(row.ageDays)
      ];
    });
  }, [filters, offset]);

  const columns = ["Date", "Customer Name", "Part-Description", "Qty In Stock", "Unit Price", "Total Value", "Age Days"];

  return <PremiumDashboardBottomTable title="Finished Goods (FG) Registry" columns={columns} rows={rows} />;
}

/* ── Daily Production View (UI Alone) ────────────────────────────────── */
function DailyProductionDashboardView({ filters, onFilterChange, onClose, targetConfig }) {
  const [machineOpen, setMachineOpen] = React.useState(false);
  const machineRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (machineRef.current && !machineRef.current.contains(event.target)) {
        setMachineOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = React.useMemo(() => filters?.fromDate ? new Date(filters.fromDate) : null, [filters?.fromDate]);
  const pickerTo = React.useMemo(() => filters?.toDate ? new Date(filters.toDate) : null, [filters?.toDate]);

  const handlePickerChange = ({ from, to }) => {
    const formatDate = (d) => {
      if (!d) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatDate(from),
      toDate: formatDate(to)
    }));
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      machineNo: ""
    });
  };

  const machines = ["CNC1", "CNC2", "VMC1", "HMC1"];

  const machSuggestions = React.useMemo(() => {
    if (!filters.machineNo) return machines;
    return machines.filter(m => m.toLowerCase().includes(filters.machineNo.toLowerCase()));
  }, [filters.machineNo]);

  // Data mapping from excel
  const rawData = [
    { machine: "CNC1", rate: 210, planned: 22, balance: 2, loss: 420 },
    { machine: "CNC2", rate: 180, planned: 18, balance: 6, loss: 1080 },
    { machine: "VMC1", rate: 150, planned: 20, balance: 4, loss: 600 },
    { machine: "HMC1", rate: 190, planned: 21, balance: 3, loss: 570 }
  ];

  const filteredData = React.useMemo(() => {
    if (!filters.machineNo) return rawData;
    return rawData.filter(d => d.machine.toLowerCase().includes(filters.machineNo.toLowerCase()));
  }, [filters.machineNo]);

  const totalPlanned = React.useMemo(() => filteredData.reduce((acc, r) => acc + r.planned, 0), [filteredData]);
  const totalBalance = React.useMemo(() => filteredData.reduce((acc, r) => acc + r.balance, 0), [filteredData]);
  const totalLoss = React.useMemo(() => filteredData.reduce((acc, r) => acc + r.loss, 0), [filteredData]);
  const avgRate = React.useMemo(() => {
    if (filteredData.length === 0) return 0;
    const sum = filteredData.reduce((acc, r) => acc + r.rate, 0);
    return (sum / filteredData.length).toFixed(1);
  }, [filteredData]);

  const chartLabels = React.useMemo(() => filteredData.map(r => r.machine), [filteredData]);
  const plannedData = React.useMemo(() => filteredData.map(r => r.planned), [filteredData]);
  const balanceData = React.useMemo(() => filteredData.map(r => r.balance), [filteredData]);
  const lossData = React.useMemo(() => filteredData.map(r => r.loss), [filteredData]);

  const setupChart = React.useCallback(
    (canvas) => {
      const targetVal = targetConfig?.daily_production?.maxBalanceHours ?? 4.0;
      return new Chart(canvas, {
        type: "bar",
        data: {
          labels: chartLabels,
          datasets: [
            {
              type: "line",
              label: "Production Loss (₹)",
              data: lossData,
              borderColor: "#0ea5e9",
              backgroundColor: "rgba(14, 165, 233, 0.1)",
              borderWidth: 2,
              tension: 0.3,
              fill: false,
              yAxisID: "y1",
              order: 1
            },
            {
              type: "bar",
              label: "Production Planned Hrs",
              data: plannedData,
              backgroundColor: "#84cc16",
              yAxisID: "y",
              order: 2
            },
            {
              type: "bar",
              label: "Balance Hrs",
              data: balanceData,
              backgroundColor: "#f87171",
              yAxisID: "y",
              order: 3
            },
            {
              type: "line",
              label: `Limit ${targetVal} Hrs`,
              data: Array(chartLabels.length).fill(targetVal),
              borderColor: "#ef4444",
              borderDash: [5, 5],
              pointRadius: 0,
              fill: false,
              yAxisID: "y",
              order: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: "top", labels: { boxWidth: 12, font: { size: 10 } } }
          },
          scales: {
            y: {
              type: "linear",
              position: "left",
              beginAtZero: true,
              max: 25,
              title: { display: true, text: "Hours", font: { size: 10 } }
            },
            y1: {
              type: "linear",
              position: "right",
              beginAtZero: true,
              max: 1200,
              grid: { drawOnChartArea: false },
              title: { display: true, text: "Loss (₹)", font: { size: 10 } },
              ticks: { callback: (v) => `₹${v}` }
            }
          }
        }
      });
    },
    [chartLabels, plannedData, balanceData, lossData, targetConfig?.daily_production?.maxBalanceHours]
  );

  const kpis = [
    { label: "Planned Hours", value: `${totalPlanned} Hrs`, icon: ClipboardList, color: "#84cc16" },
    { label: "Balance Hours", value: `${totalBalance} Hrs`, icon: Timer, color: "#f87171" },
    { label: "Total Loss Value", value: `₹${totalLoss.toLocaleString()}`, icon: AlertTriangle, color: "#0ea5e9" },
    { label: "Avg Rate/Hr", value: `₹${avgRate}`, icon: Activity, color: "#0f766e" }
  ];

  const rebuildToken = `daily-prod-chart|${targetConfig?.daily_production?.maxBalanceHours ?? 4.0}|${JSON.stringify(filteredData)}`;

  return (
    <PremiumDashboardView
      title="Daily Production"
      icon={Activity}
      color="#0f766e"
      kpis={kpis}
      setupChart={setupChart}
      chartHeight={260}
      rangeHint="Machine Capacity Report - Hrs and Loss"
      onClose={onClose}
      rebuildToken={rebuildToken}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" style={{ maxWidth: "230px" }}>
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Machine No Autocomplete */}
        <div className="pp1-filter-group" ref={machineRef} style={{ maxWidth: "260px" }}>
          <label className="pp1-filter-label">Machine No</label>
          <div className="pp1-part-autocomplete-wrap">
            <input
              type="text"
              className="pp1-filter-input pp1-part-autocomplete-input"
              placeholder="Machine No..."
              value={filters.machineNo || ""}
              onChange={e => {
                handleInputChange("machineNo", e.target.value);
                setMachineOpen(true);
              }}
              onFocus={() => setMachineOpen(true)}
            />
            {machineOpen && machSuggestions.length > 0 && (
              <div className="pp1-part-suggestions">
                <div
                  className={`pp1-part-suggestion-item ${!filters.machineNo ? "selected" : ""}`}
                  onClick={() => {
                    handleInputChange("machineNo", "");
                    setMachineOpen(false);
                  }}
                >
                  All Machines
                </div>
                {machSuggestions.map(mach => (
                  <div
                    key={mach}
                    className={`pp1-part-suggestion-item ${filters.machineNo === mach ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("machineNo", mach);
                      setMachineOpen(false);
                    }}
                  >
                    {mach}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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

function DailyProductionBottomTable({ filters, targetConfig }) {
  const maxAllowedHrs = targetConfig?.daily_production?.maxBalanceHours ?? 4.0;

  const rawData = [
    { sl: 1, machine: "CNC1", rate: 210, planned: 22, balance: 2, loss: 420 },
    { sl: 2, machine: "CNC2", rate: 180, planned: 18, balance: 6, loss: 1080 },
    { sl: 3, machine: "VMC1", rate: 150, planned: 20, balance: 4, loss: 600 },
    { sl: 4, machine: "HMC1", rate: 190, planned: 21, balance: 3, loss: 570 }
  ];

  const rows = React.useMemo(() => {
    let list = rawData;
    if (filters?.machineNo) {
      list = list.filter(r => r.machine.toLowerCase().includes(filters.machineNo.toLowerCase()));
    }

    return list.map(row => {
      const isExceeded = row.balance > maxAllowedHrs;
      const statusElement = (
        <span className={`pp1-badge ${isExceeded ? "pp1-badge--danger" : "pp1-badge--success"}`}>
          {isExceeded ? "Exceeds Limit" : "Normal"}
        </span>
      );

      return [
        String(row.sl),
        row.machine,
        `₹${row.rate}`,
        `${row.planned} Hrs`,
        `${row.balance} Hrs`,
        `₹${row.loss.toLocaleString()}`,
        statusElement
      ];
    });
  }, [filters, maxAllowedHrs]);

  const columns = ["Sl. No", "Machine No", "Rate Per Hrs", "Production Planned Hrs", "Balance Hrs", "Production Loss", "Status"];

  return <PremiumDashboardBottomTable title="Machine Capacity Registry" columns={columns} rows={rows} />;
}

/* ── Target Vs Actual View (UI Alone) ────────────────────────────────── */
function TargetVsActualDashboardView({ filters, onFilterChange, onClose, targetConfig }) {
  const [customerOpen, setCustomerOpen] = React.useState(false);
  const customerRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerRef.current && !customerRef.current.contains(event.target)) {
        setCustomerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = React.useMemo(() => filters?.fromDate ? new Date(filters.fromDate) : null, [filters?.fromDate]);
  const pickerTo = React.useMemo(() => filters?.toDate ? new Date(filters.toDate) : null, [filters?.toDate]);

  const handlePickerChange = ({ from, to }) => {
    const formatDate = (d) => {
      if (!d) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatDate(from),
      toDate: formatDate(to)
    }));
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      customer: ""
    });
  };

  const rawData = [
    { customer: "Star Logistics", partNo: "P-1001", desc: "Brake Pad Set A", planQty: 500, availableQty: 350, planReqQty: 150, status: "Pending" },
    { customer: "Anims Parts Ltd", partNo: "P-1002", desc: "Rotor Disc Premium", planQty: 1200, availableQty: 1100, planReqQty: 100, status: "Pending" },
    { customer: "Virrudheeswara Eng", partNo: "P-1003", desc: "Axle Assembly L9", planQty: 800, availableQty: 600, planReqQty: 200, status: "Pending" },
    { customer: "Srinivasa Castings", partNo: "P-1004", desc: "Gear Box Assembly", planQty: 300, availableQty: 240, planReqQty: 60, status: "Pending" },
    { customer: "Royal Packaging", partNo: "P-1005", desc: "Engine Assembly M1", planQty: 150, availableQty: 150, planReqQty: 0, status: "Completed" }
  ];

  const customersList = ["Star Logistics", "Anims Parts Ltd", "Virrudheeswara Eng", "Srinivasa Castings", "Royal Packaging"];

  const custSuggestions = React.useMemo(() => {
    if (!filters.customer) return customersList;
    return customersList.filter(c => c.toLowerCase().includes(filters.customer.toLowerCase()));
  }, [filters.customer]);

  const filteredData = React.useMemo(() => {
    if (!filters.customer) return rawData;
    return rawData.filter(d => d.customer.toLowerCase().includes(filters.customer.toLowerCase()));
  }, [filters.customer]);

  const totalPlan = React.useMemo(() => filteredData.reduce((acc, r) => acc + r.planQty, 0), [filteredData]);
  const totalAvailable = React.useMemo(() => filteredData.reduce((acc, r) => acc + r.availableQty, 0), [filteredData]);
  const totalReq = React.useMemo(() => filteredData.reduce((acc, r) => acc + r.planReqQty, 0), [filteredData]);

  const avgFulfillment = React.useMemo(() => {
    if (totalPlan === 0) return 0;
    return ((totalAvailable / totalPlan) * 100).toFixed(1);
  }, [totalPlan, totalAvailable]);

  const chartLabels = React.useMemo(() => filteredData.map(r => r.customer), [filteredData]);
  const planDataPoints = React.useMemo(() => filteredData.map(r => r.planQty), [filteredData]);
  const availableDataPoints = React.useMemo(() => filteredData.map(r => r.availableQty), [filteredData]);

  const setupChart = React.useCallback(
    (canvas) => {
      return new Chart(canvas, {
        type: "bar",
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: "Plan Qty (Target)",
              data: planDataPoints,
              backgroundColor: "#6366f1",
              borderColor: "#4f46e5",
              borderWidth: 1,
              order: 2
            },
            {
              label: "Available Qty (Actual)",
              data: availableDataPoints,
              backgroundColor: "#10b981",
              borderColor: "#059669",
              borderWidth: 1,
              order: 3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: "top", labels: { boxWidth: 12, font: { size: 10 } } }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Quantity", font: { size: 10 } }
            }
          }
        }
      });
    },
    [chartLabels, planDataPoints, availableDataPoints]
  );

  const kpis = [
    { label: "Target (Plan Qty)", value: totalPlan.toLocaleString(), icon: ClipboardList, color: "#6366f1" },
    { label: "Actual (Available)", value: totalAvailable.toLocaleString(), icon: CheckCircle2, color: "#10b981" },
    { label: "Req Quantity", value: totalReq.toLocaleString(), icon: AlertTriangle, color: "#f59e0b" },
    { label: "Fulfillment Rate", value: `${avgFulfillment}%`, icon: Target, color: "#eab308" }
  ];

  const rebuildToken = `target-vs-actual-chart|${targetConfig?.target_vs_actual?.minFulfillmentPct ?? 90.0}|${JSON.stringify(filteredData)}`;

  return (
    <PremiumDashboardView
      title="Target Vs Actual"
      icon={Target}
      color="#6366f1"
      kpis={kpis}
      setupChart={setupChart}
      chartHeight={260}
      rangeHint="Customer Plan vs Available Quantity"
      onClose={onClose}
      rebuildToken={rebuildToken}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" style={{ maxWidth: "230px" }}>
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Customer Name Autocomplete */}
        <div className="pp1-filter-group" ref={customerRef} style={{ maxWidth: "260px" }}>
          <label className="pp1-filter-label">Customer Name</label>
          <div className="pp1-part-autocomplete-wrap">
            <input
              type="text"
              className="pp1-filter-input pp1-part-autocomplete-input"
              placeholder="Customer Name..."
              value={filters.customer || ""}
              onChange={e => {
                handleInputChange("customer", e.target.value);
                setCustomerOpen(true);
              }}
              onFocus={() => setCustomerOpen(true)}
            />
            {customerOpen && custSuggestions.length > 0 && (
              <div className="pp1-part-suggestions">
                <div
                  className={`pp1-part-suggestion-item ${!filters.customer ? "selected" : ""}`}
                  onClick={() => {
                    handleInputChange("customer", "");
                    setCustomerOpen(false);
                  }}
                >
                  All Customers
                </div>
                {custSuggestions.map(cust => (
                  <div
                    key={cust}
                    className={`pp1-part-suggestion-item ${filters.customer === cust ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("customer", cust);
                      setCustomerOpen(false);
                    }}
                  >
                    {cust}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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

function TargetVsActualBottomTable({ filters, targetConfig }) {
  const minFulfillment = targetConfig?.target_vs_actual?.minFulfillmentPct ?? 90.0;

  const rawData = [
    { customer: "Star Logistics", partNo: "P-1001", desc: "Brake Pad Set A", planQty: 500, availableQty: 350, planReqQty: 150, status: "Pending" },
    { customer: "Anims Parts Ltd", partNo: "P-1002", desc: "Rotor Disc Premium", planQty: 1200, availableQty: 1100, planReqQty: 100, status: "Pending" },
    { customer: "Virrudheeswara Eng", partNo: "P-1003", desc: "Axle Assembly L9", planQty: 800, availableQty: 600, planReqQty: 200, status: "Pending" },
    { customer: "Srinivasa Castings", partNo: "P-1004", desc: "Gear Box Assembly", planQty: 300, availableQty: 240, planReqQty: 60, status: "Pending" },
    { customer: "Royal Packaging", partNo: "P-1005", desc: "Engine Assembly M1", planQty: 150, availableQty: 150, planReqQty: 0, status: "Completed" }
  ];

  const rows = React.useMemo(() => {
    let list = rawData;
    if (filters?.customer) {
      list = list.filter(r => r.customer.toLowerCase().includes(filters.customer.toLowerCase()));
    }

    return list.map(row => {
      const fulfillment = row.planQty > 0 ? (row.availableQty / row.planQty) * 100 : 0;
      const isLowFulfillment = fulfillment < minFulfillment;

      const badgeStyle = row.status === "Completed"
        ? "pp1-badge--success"
        : isLowFulfillment
          ? "pp1-badge--danger"
          : "pp1-badge--success";

      const badgeText = row.status === "Completed"
        ? "Completed"
        : isLowFulfillment
          ? "Low Fulfillment"
          : "On Track";

      const statusElement = (
        <span className={`pp1-badge ${badgeStyle}`}>
          {badgeText}
        </span>
      );

      return [
        row.customer,
        `${row.partNo} - ${row.desc}`,
        row.planQty.toLocaleString(),
        row.availableQty.toLocaleString(),
        row.planReqQty.toLocaleString(),
        statusElement
      ];
    });
  }, [filters, minFulfillment]);

  const columns = ["Customer Name", "PartNo - Description", "Plan Qty", "Available Qty", "Plan Req Qty", "Dispatch Status"];

  return <PremiumDashboardBottomTable title="Target Vs Actual Registry" columns={columns} rows={rows} />;
}

/* ── Operator Efficiency View (UI Alone) ────────────────────────────────── */
function OperatorEfficiencyDashboardView({ filters, onFilterChange, onClose, targetConfig }) {
  const [operatorOpen, setOperatorOpen] = React.useState(false);
  const operatorRef = React.useRef(null);
  const [effLimitOpen, setEffLimitOpen] = React.useState(false);
  const effLimitRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (operatorRef.current && !operatorRef.current.contains(event.target)) {
        setOperatorOpen(false);
      }
      if (effLimitRef.current && !effLimitRef.current.contains(event.target)) {
        setEffLimitOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = React.useMemo(() => filters?.fromDate ? new Date(filters.fromDate) : null, [filters?.fromDate]);
  const pickerTo = React.useMemo(() => filters?.toDate ? new Date(filters.toDate) : null, [filters?.toDate]);

  const handlePickerChange = ({ from, to }) => {
    const formatDate = (d) => {
      if (!d) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatDate(from),
      toDate: formatDate(to)
    }));
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      operator: "",
      effLimit: ""
    });
  };

  const rawData = [
    { date: "22-06-2026", operator: "Jane Smith", macno: "CNC2", oaEff: 95.0, operatorPct: 96.0, qfEff: 97.0, idle: 3.0, rank: 1, plannedQty: 1200, producedQty: 1140, rejectionQty: 10 },
    { date: "22-06-2026", operator: "John Doe", macno: "CNC1", oaEff: 90.0, operatorPct: 92.0, qfEff: 94.0, idle: 5.0, rank: 2, plannedQty: 1000, producedQty: 900, rejectionQty: 15 },
    { date: "22-06-2026", operator: "Robert Chen", macno: "VMC1", oaEff: 88.0, operatorPct: 89.0, qfEff: 91.0, idle: 6.0, rank: 3, plannedQty: 1500, producedQty: 1320, rejectionQty: 25 },
    { date: "22-06-2026", operator: "Michael Brown", macno: "CNC1", oaEff: 82.0, operatorPct: 83.0, qfEff: 85.0, idle: 10.0, rank: 4, plannedQty: 700, producedQty: 574, rejectionQty: 10 },
    { date: "22-06-2026", operator: "Alice Johnson", macno: "HMC1", oaEff: 75.0, operatorPct: 76.0, qfEff: 78.0, idle: 15.0, rank: 5, plannedQty: 800, producedQty: 600, rejectionQty: 5 }
  ];

  const operatorsList = ["John Doe", "Jane Smith", "Robert Chen", "Alice Johnson", "Michael Brown"];

  const opSuggestions = React.useMemo(() => {
    if (!filters.operator) return operatorsList;
    return operatorsList.filter(o => o.toLowerCase().includes(filters.operator.toLowerCase()));
  }, [filters.operator]);

  const filteredData = React.useMemo(() => {
    let list = rawData;
    if (filters.operator) {
      list = list.filter(d => d.operator.toLowerCase().includes(filters.operator.toLowerCase()));
    }
    if (filters.effLimit) {
      const threshold = parseFloat(filters.effLimit);
      list = list.filter(d => d.operatorPct < threshold);
    }
    return list;
  }, [filters.operator, filters.effLimit]);

  const totalPlanned = React.useMemo(() => filteredData.reduce((acc, r) => acc + r.plannedQty, 0), [filteredData]);
  const totalProduced = React.useMemo(() => filteredData.reduce((acc, r) => acc + r.producedQty, 0), [filteredData]);
  const totalRejections = React.useMemo(() => filteredData.reduce((acc, r) => acc + r.rejectionQty, 0), [filteredData]);

  const avgEfficiency = React.useMemo(() => {
    if (filteredData.length === 0) return 0;
    const sum = filteredData.reduce((acc, r) => acc + r.operatorPct, 0);
    return (sum / filteredData.length).toFixed(1);
  }, [filteredData]);

  const months = ["Jul 2025", "Aug 2025", "Sep 2025", "Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026", "Jun 2026"];

  const monthwiseData = React.useMemo(() => {
    const activeOps = filteredData.map(r => r.operator.toLowerCase());

    const JohnDoe = [90, 92, 89, 91, 88, 90, 89, 91, 90, 92, 88, 90];
    const JaneSmith = [94, 96, 95, 97, 93, 95, 94, 96, 95, 97, 94, 95];
    const RobertChen = [87, 89, 88, 90, 86, 88, 87, 89, 88, 90, 86, 88];
    const AliceJohnson = [74, 76, 75, 77, 73, 75, 74, 76, 75, 77, 73, 75];
    const MichaelBrown = [81, 83, 82, 84, 80, 82, 81, 83, 82, 84, 80, 82];

    const opDataMap = {
      "john doe": JohnDoe,
      "jane smith": JaneSmith,
      "robert chen": RobertChen,
      "alice johnson": AliceJohnson,
      "michael brown": MichaelBrown
    };

    if (activeOps.length === 0) {
      return Array(12).fill(0);
    }

    const sumArray = Array(12).fill(0);
    activeOps.forEach(op => {
      const data = opDataMap[op] || JohnDoe;
      for (let i = 0; i < 12; i++) {
        sumArray[i] += data[i];
      }
    });

    return sumArray.map(val => Number((val / activeOps.length).toFixed(1)));
  }, [filteredData]);

  const setupChart = React.useCallback(
    (canvas) => {
      const targetVal = targetConfig?.operator_efficiency?.minEfficiencyPct ?? 90.0;
      return new Chart(canvas, {
        type: "line",
        data: {
          labels: months,
          datasets: [
            {
              label: filters.operator ? `${filters.operator} Efficiency %` : "Avg Operator Efficiency %",
              data: monthwiseData,
              borderColor: "#8b5cf6",
              backgroundColor: "rgba(139, 92, 246, 0.1)",
              borderWidth: 2.5,
              tension: 0.3,
              fill: true,
              pointBackgroundColor: "#8b5cf6",
              pointHoverRadius: 6,
              order: 2
            },
            {
              type: "line",
              label: `Target Limit ${targetVal}%`,
              data: Array(months.length).fill(targetVal),
              borderColor: "#ef4444",
              borderDash: [5, 5],
              pointRadius: 0,
              fill: false,
              order: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: "top", labels: { boxWidth: 12, font: { size: 10 } } }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: { display: true, text: "Efficiency %", font: { size: 10 } }
            }
          }
        }
      });
    },
    [monthwiseData, filters.operator, targetConfig?.operator_efficiency?.minEfficiencyPct]
  );

  const kpis = [
    { label: "Total Planned Qty", value: totalPlanned.toLocaleString(), icon: ClipboardList, color: "#4f46e5" },
    { label: "Total Produced Qty", value: totalProduced.toLocaleString(), icon: CheckCircle2, color: "#10b981" },
    { label: "Total Rejections", value: totalRejections.toLocaleString(), icon: AlertTriangle, color: "#ef4444" },
    { label: "Avg Efficiency", value: `${avgEfficiency}%`, icon: Users, color: "#8b5cf6" }
  ];

  const rebuildToken = `operator-efficiency-chart|${targetConfig?.operator_efficiency?.minEfficiencyPct ?? 90.0}|${JSON.stringify(monthwiseData)}|${filters.operator}`;

  return (
    <PremiumDashboardView
      title="Operator Efficiency"
      icon={Users}
      color="#8b5cf6"
      kpis={kpis}
      setupChart={setupChart}
      chartHeight={260}
      rangeHint="Operator Performance - Produced vs Target"
      onClose={onClose}
      rebuildToken={rebuildToken}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" style={{ maxWidth: "230px" }}>
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Operator Name Autocomplete */}
        <div className="pp1-filter-group" ref={operatorRef} style={{ maxWidth: "260px" }}>
          <label className="pp1-filter-label">Operator Name</label>
          <div className="pp1-part-autocomplete-wrap">
            <input
              type="text"
              className="pp1-filter-input pp1-part-autocomplete-input"
              placeholder="Operator Name..."
              value={filters.operator || ""}
              onChange={e => {
                handleInputChange("operator", e.target.value);
                setOperatorOpen(true);
              }}
              onFocus={() => setOperatorOpen(true)}
            />
            {operatorOpen && opSuggestions.length > 0 && (
              <div className="pp1-part-suggestions">
                <div
                  className={`pp1-part-suggestion-item ${!filters.operator ? "selected" : ""}`}
                  onClick={() => {
                    handleInputChange("operator", "");
                    setOperatorOpen(false);
                  }}
                >
                  All Operators
                </div>
                {opSuggestions.map(op => (
                  <div
                    key={op}
                    className={`pp1-part-suggestion-item ${filters.operator === op ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("operator", op);
                      setOperatorOpen(false);
                    }}
                  >
                    {op}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Efficiency Limit Custom Dropdown */}
        <div className="pp1-filter-group" ref={effLimitRef} style={{ maxWidth: "160px" }}>
          <label className="pp1-filter-label">Efficiency Limit</label>
          <div className="pp1-part-autocomplete-wrap">
            <div
              className="pp1-filter-input pp1-part-autocomplete-input"
              onClick={() => setEffLimitOpen(!effLimitOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                padding: "0 8px",
                height: "28px"
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--pp1-text-primary, #1e293b)" }}>
                {filters.effLimit ? `Eff < ${filters.effLimit}%` : "All Efficiencies"}
              </span>
              <ChevronDown size={14} style={{ opacity: 0.6, transform: effLimitOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>

            {effLimitOpen && (
              <div className="pp1-part-suggestions" style={{ width: "100%", top: "32px" }}>
                <div
                  className={`pp1-part-suggestion-item ${!filters.effLimit ? "selected" : ""}`}
                  onClick={() => {
                    handleInputChange("effLimit", "");
                    setEffLimitOpen(false);
                  }}
                >
                  All Efficiencies
                </div>
                {["90", "80", "70", "60", "50", "40"].map(limit => (
                  <div
                    key={limit}
                    className={`pp1-part-suggestion-item ${filters.effLimit === limit ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("effLimit", limit);
                      setEffLimitOpen(false);
                    }}
                  >
                    Eff &lt; {limit}%
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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

function OperatorEfficiencyBottomTable({ filters, targetConfig }) {
  const minEfficiency = targetConfig?.operator_efficiency?.minEfficiencyPct ?? 90.0;

  const rawData = [
    { date: "22-06-2026", operator: "Jane Smith", macno: "CNC2", oaEff: 95.0, operatorPct: 96.0, qfEff: 97.0, idle: 3.0, rank: 1 },
    { date: "22-06-2026", operator: "John Doe", macno: "CNC1", oaEff: 90.0, operatorPct: 92.0, qfEff: 94.0, idle: 5.0, rank: 2 },
    { date: "22-06-2026", operator: "Robert Chen", macno: "VMC1", oaEff: 88.0, operatorPct: 89.0, qfEff: 91.0, idle: 6.0, rank: 3 },
    { date: "22-06-2026", operator: "Michael Brown", macno: "CNC1", oaEff: 82.0, operatorPct: 83.0, qfEff: 85.0, idle: 10.0, rank: 4 },
    { date: "22-06-2026", operator: "Alice Johnson", macno: "HMC1", oaEff: 75.0, operatorPct: 76.0, qfEff: 78.0, idle: 15.0, rank: 5 }
  ];

  const rows = React.useMemo(() => {
    let list = rawData;
    if (filters?.operator) {
      list = list.filter(r => r.operator.toLowerCase().includes(filters.operator.toLowerCase()));
    }
    if (filters?.effLimit) {
      const threshold = parseFloat(filters.effLimit);
      list = list.filter(r => r.operatorPct < threshold);
    }

    return list.map(row => {
      const isBelowTarget = row.operatorPct < minEfficiency;

      return [
        row.date,
        row.operator,
        row.macno,
        `${row.oaEff}%`,
        `${row.operatorPct}%`,
        `${row.qfEff}%`,
        `${row.idle}%`,
        `# ${row.rank}`
      ];
    });
  }, [filters, minEfficiency]);

  const columns = ["Date", "Operator", "macno", "OA EFF%", "Operator %", "QF Eff%", "Idle %", "Rank"];

  return <PremiumDashboardBottomTable title="Operator Efficiency Registry" columns={columns} rows={rows} />;
}

/* ── CAPA Mock Data ──────────────────────────────────────────────────────── */
const MOCK_CAPA_DATA = [
  {
    complNo: "CM250018",
    complDate: "2025-08-21",
    complOpenDate: "2025-08-21",
    customer: "ENGINEERED VALVE PRODUCTS PRIVATE LIMITED",
    partNo: "D-1-104",
    description: "6 INCH 150# BODY GRINDING",
    complDescription: "AS PER DRAWING BODY CENTRE TO TOP",
    qcIncharge: "VIGNESH",
    correctiveAction: "1.The affected valve body was identified and quarantined. 2.A review of the CAD model was conducted, and the correct center distance was updated.",
    permanentAction: "1.Implemented a mandatory CAD model review and approval process involving a second engineer. 2.Scheduled a training session for design engineers on common standards.",
    actionTaken: "Implemented",
    status: "Closed",
    closedDate: "2025-08-21",
    ageDays: 306,
    remarks: "The affected valve body was corrected and verified.",
    repeatedComplaint: "NO",
    rcWhy1: "An incorrect center distance in the CAD model.",
    rcWhy2: "The CAD model was not checked by a second engineer.",
    rcWhy3: "This issue was only discovered at final inspection/assembly.",
    rcWhy4: "Lack of mandatory design verification workflow.",
    rcWhy5: "Design checklist was not updated for center distance verification."
  },
  {
    complNo: "CM250019",
    complDate: "2025-08-12",
    complOpenDate: "2025-08-12",
    customer: "ENGINEERED VALVE PRODUCTS PRIVATE LIMITED",
    partNo: "130460101M",
    description: "4 INCH FP CLASS 600 NPT",
    complDescription: "1.BORE OVERSIZE",
    qcIncharge: "VIGNESH",
    correctiveAction: "1.The tool wear was corrected and tool offsets adjusted. 2.Gauging frequency increased.",
    permanentAction: "1.For all similar parts, a pre-machining checklist was introduced. 2.Preventive tool replacement schedule defined.",
    actionTaken: "Implemented",
    status: "Closed",
    closedDate: "2025-08-14",
    ageDays: 315,
    remarks: "For all similar parts, offsets must be double-checked.",
    repeatedComplaint: "NO",
    rcWhy1: "Tool insert worn out during batch run.",
    rcWhy2: "Tool life tracker was not reset.",
    rcWhy3: "Gauging frequency was too low to catch tool wear early.",
    rcWhy4: "Operator was managing multiple setups simultaneously.",
    rcWhy5: "Standard operating procedure for batch inspections was missing."
  },
  {
    complNo: "CM250020",
    complDate: "2026-12-11",
    complOpenDate: "2026-12-11",
    customer: "SHANTHI GEARS LIMITED",
    partNo: "NP0550090878",
    description: "SPUR GEAR 35T X 4.5M",
    complDescription: "OD 165.6 - 0.4 MEASURE",
    qcIncharge: "SATHEESH",
    correctiveAction: "1.The affected gears were segregated for re-inspection. 2.Tool offset was updated by 0.2mm.",
    permanentAction: "Permanent countermeasures under review by engineering team.",
    actionTaken: "Pending review",
    status: "Open",
    closedDate: "",
    ageDays: 194,
    remarks: "Active investigation underway.",
    repeatedComplaint: "NO",
    rcWhy1: "Operator ran production setup with incorrect machine offset.",
    rcWhy2: "First-piece inspection was not signed off by supervisor.",
    rcWhy3: "Supervisor was absent during shift transition.",
    rcWhy4: "Shift handover checklist was skipped.",
    rcWhy5: "No digital alert for setup verification on CNC controller."
  },
  {
    complNo: "CM250021",
    complDate: "2025-12-23",
    complOpenDate: "2025-12-15",
    customer: "GTN ENGINEERING (INDIA) LTD",
    partNo: "P1000018215/D",
    description: "ACT CYLNDR PN-52 LWR",
    complDescription: "Due to manpower shortage setup error",
    qcIncharge: "SATHEESH",
    correctiveAction: "Production priority adjusted to load balance setups. Training given to second-line operators.",
    permanentAction: "Recruitment plan initiated. Setup verification checklists laminated on machine panels.",
    actionTaken: "Implemented",
    status: "Closed",
    closedDate: "2025-12-23",
    ageDays: 190,
    remarks: "Manpower shortage resolved by recruitment and setup templates.",
    repeatedComplaint: "NO",
    rcWhy1: "CNC operator set workpiece coordinate incorrectly.",
    rcWhy2: "Operator was fatigued due to overtime shift.",
    rcWhy3: "Shortage of skilled operators on that production line.",
    rcWhy4: "Increased customer demand led to back-to-back production runs.",
    rcWhy5: "HR recruitment cycle delayed by three weeks."
  }
];

/* ── Quality Action Plan (CAPA) View (UI Alone) ─────────────────────────── */
function CapaDashboardView({ filters, onFilterChange, onClose, selectedCapaId, onSelectCapaId }) {
  const [customerOpen, setCustomerOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const customerRef = React.useRef(null);
  const statusRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerRef.current && !customerRef.current.contains(event.target)) {
        setCustomerOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = React.useMemo(() => filters?.fromDate ? new Date(filters.fromDate) : null, [filters?.fromDate]);
  const pickerTo = React.useMemo(() => filters?.toDate ? new Date(filters.toDate) : null, [filters?.toDate]);

  const handlePickerChange = ({ from, to }) => {
    const formatDate = (d) => {
      if (!d) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatDate(from),
      toDate: formatDate(to)
    }));
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      customer: "",
      status: ""
    });
  };

  const filteredCapa = React.useMemo(() => {
    let list = MOCK_CAPA_DATA;
    if (filters.customer) {
      list = list.filter(d => d.customer.toLowerCase().includes(filters.customer.toLowerCase()));
    }
    if (filters.status) {
      list = list.filter(d => d.status.toLowerCase() === filters.status.toLowerCase());
    }
    return list;
  }, [filters.customer, filters.status]);

  const totalComplaints = filteredCapa.length;
  const openCount = filteredCapa.filter(d => d.status === "Open").length;
  const closedCount = filteredCapa.filter(d => d.status === "Closed").length;
  const avgAge = React.useMemo(() => {
    if (filteredCapa.length === 0) return 0;
    const sum = filteredCapa.reduce((acc, r) => acc + r.ageDays, 0);
    return Math.round(sum / filteredCapa.length);
  }, [filteredCapa]);

  const selectedRecord = React.useMemo(() => {
    return MOCK_CAPA_DATA.find(d => d.complNo === selectedCapaId) || MOCK_CAPA_DATA[0];
  }, [selectedCapaId]);

  const setupChart = React.useCallback(
    (canvas) => {
      return new Chart(canvas, {
        type: "doughnut",
        data: {
          labels: ["Closed CAPA", "Open CAPA"],
          datasets: [
            {
              data: [closedCount, openCount],
              backgroundColor: ["#10b981", "#f59e0b"],
              borderWidth: 1,
              hoverOffset: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: "top", labels: { boxWidth: 12, font: { size: 10 } } }
          },
          cutout: "60%"
        }
      });
    },
    [closedCount, openCount]
  );

  const kpis = [
    { label: "Total Complaints", value: String(totalComplaints), icon: ShieldAlert, color: "#0891b2" },
    { label: "Open CAPA", value: String(openCount), icon: AlertTriangle, color: "#f59e0b" },
    { label: "Closed CAPA", value: String(closedCount), icon: CheckCircle2, color: "#10b981" },
    { label: "Avg Resolution Age", value: `${avgAge}d`, icon: Timer, color: "#3b82f6" }
  ];

  const rebuildToken = `capa-chart|${closedCount}|${openCount}`;
  const customersList = Array.from(new Set(MOCK_CAPA_DATA.map(d => d.customer)));
  const custSuggestions = React.useMemo(() => {
    if (!filters.customer) return customersList;
    return customersList.filter(c => c.toLowerCase().includes(filters.customer.toLowerCase()));
  }, [filters.customer]);

  const extraBottomContent = selectedRecord && (
    <div style={{ marginTop: "12px", padding: "12px", background: "var(--pp1-bg-card, #f8fafc)", borderRadius: "8px", border: "1px solid var(--pp1-border, #e2e8f0)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--pp1-border, #e2e8f0)", paddingBottom: "6px", marginBottom: "8px" }}>
        <h4 style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#0891b2", display: "flex", alignItems: "center", gap: "6px" }}>
          <HelpCircle size={14} /> RCA & Countermeasures Plan: {selectedRecord.complNo}
        </h4>
        <span className={`pp1-badge ${selectedRecord.status === "Closed" ? "pp1-badge--success" : "pp1-badge--warning"}`} style={{ fontSize: "10px", padding: "2px 8px" }}>
          {selectedRecord.status}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="pp1-capa-grid">
        {/* Why-Why Analysis */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--pp1-text-secondary, #64748b)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
            <span>[Why-Why Analysis for Root Cause]</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {selectedRecord.rcWhy1 && (
              <div style={{ display: "flex", gap: "6px", fontSize: "11px", background: "#fff", padding: "4px 8px", borderRadius: "4px", borderLeft: "3px solid #0891b2" }}>
                <strong style={{ color: "#0891b2" }}>Why 1?</strong>
                <span style={{ color: "var(--pp1-text-primary, #334155)" }}>{selectedRecord.rcWhy1}</span>
              </div>
            )}
            {selectedRecord.rcWhy2 && (
              <div style={{ display: "flex", gap: "6px", fontSize: "11px", background: "#fff", padding: "4px 8px", borderRadius: "4px", borderLeft: "3px solid #0891b2" }}>
                <strong style={{ color: "#0891b2" }}>Why 2?</strong>
                <span style={{ color: "var(--pp1-text-primary, #334155)" }}>{selectedRecord.rcWhy2}</span>
              </div>
            )}
            {selectedRecord.rcWhy3 && (
              <div style={{ display: "flex", gap: "6px", fontSize: "11px", background: "#fff", padding: "4px 8px", borderRadius: "4px", borderLeft: "3px solid #0891b2" }}>
                <strong style={{ color: "#0891b2" }}>Why 3?</strong>
                <span style={{ color: "var(--pp1-text-primary, #334155)" }}>{selectedRecord.rcWhy3}</span>
              </div>
            )}
            {selectedRecord.rcWhy4 && (
              <div style={{ display: "flex", gap: "6px", fontSize: "11px", background: "#fff", padding: "4px 8px", borderRadius: "4px", borderLeft: "3px solid #0891b2" }}>
                <strong style={{ color: "#0891b2" }}>Why 4?</strong>
                <span style={{ color: "var(--pp1-text-primary, #334155)" }}>{selectedRecord.rcWhy4}</span>
              </div>
            )}
            {selectedRecord.rcWhy5 && (
              <div style={{ display: "flex", gap: "6px", fontSize: "11px", background: "#fff", padding: "4px 8px", borderRadius: "4px", borderLeft: "3px solid #0891b2" }}>
                <strong style={{ color: "#0891b2" }}>Why 5?</strong>
                <span style={{ color: "var(--pp1-text-primary, #334155)" }}>{selectedRecord.rcWhy5}</span>
              </div>
            )}
          </div>
        </div>

        {/* Countermeasures & Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "#10b981", marginBottom: "3px" }}>Corrective Action:</div>
            <div style={{ fontSize: "11px", background: "#fff", padding: "6px 10px", borderRadius: "4px", border: "1px solid var(--pp1-border, #e2e8f0)", color: "var(--pp1-text-primary, #334155)" }}>
              {selectedRecord.correctiveAction || "No active corrective actions recorded."}
            </div>
          </div>
          {selectedRecord.permanentAction && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#6366f1", marginBottom: "3px" }}>Permanent Action:</div>
              <div style={{ fontSize: "11px", background: "#fff", padding: "6px 10px", borderRadius: "4px", border: "1px solid var(--pp1-border, #e2e8f0)", color: "var(--pp1-text-primary, #334155)" }}>
                {selectedRecord.permanentAction}
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: "12px", fontSize: "10px", color: "var(--pp1-text-secondary, #64748b)" }}>
            <div><strong>QC Incharge:</strong> {selectedRecord.qcIncharge}</div>
            <div><strong>Action Taken Status:</strong> {selectedRecord.actionTaken || "Pending"}</div>
            {selectedRecord.closedDate && <div><strong>Closed Date:</strong> {selectedRecord.closedDate}</div>}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <PremiumDashboardView
      title="Quality Action Plan (CAPA)"
      icon={ClipboardCheck}
      color="#0891b2"
      kpis={null}
      setupChart={setupChart}
      chartHeight={180}
      rangeHint="Root Cause Analysis & Corrective Actions"
      onClose={onClose}
      rebuildToken={rebuildToken}
      extraBottom={extraBottomContent}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker */}
        <div className="pp1-filter-group pp1-filter-group--date-range" style={{ maxWidth: "230px" }}>
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Customer Autocomplete */}
        <div className="pp1-filter-group" ref={customerRef} style={{ maxWidth: "260px" }}>
          <label className="pp1-filter-label">Customer Name</label>
          <div className="pp1-part-autocomplete-wrap">
            <input
              type="text"
              className="pp1-filter-input pp1-part-autocomplete-input"
              placeholder="Search Customer..."
              value={filters.customer || ""}
              onChange={e => {
                handleInputChange("customer", e.target.value);
                setCustomerOpen(true);
              }}
              onFocus={() => setCustomerOpen(true)}
            />
            {customerOpen && custSuggestions.length > 0 && (
              <div className="pp1-part-suggestions">
                <div
                  className={`pp1-part-suggestion-item ${!filters.customer ? "selected" : ""}`}
                  onClick={() => {
                    handleInputChange("customer", "");
                    setCustomerOpen(false);
                  }}
                >
                  All Customers
                </div>
                {custSuggestions.map(cust => (
                  <div
                    key={cust}
                    className={`pp1-part-suggestion-item ${filters.customer === cust ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("customer", cust);
                      setCustomerOpen(false);
                    }}
                    style={{ whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}
                  >
                    {cust}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="pp1-filter-group" ref={statusRef} style={{ maxWidth: "160px" }}>
          <label className="pp1-filter-label">Status</label>
          <div className="pp1-part-autocomplete-wrap">
            <div
              className="pp1-filter-input pp1-part-autocomplete-input"
              onClick={() => setStatusOpen(!statusOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                padding: "0 8px",
                height: "28px"
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--pp1-text-primary, #1e293b)" }}>
                {filters.status ? filters.status : "All Statuses"}
              </span>
              <ChevronDown size={14} style={{ opacity: 0.6, transform: statusOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>

            {statusOpen && (
              <div className="pp1-part-suggestions" style={{ width: "100%", top: "32px" }}>
                <div
                  className={`pp1-part-suggestion-item ${!filters.status ? "selected" : ""}`}
                  onClick={() => {
                    handleInputChange("status", "");
                    setStatusOpen(false);
                  }}
                >
                  All Statuses
                </div>
                {["Open", "Closed"].map(st => (
                  <div
                    key={st}
                    className={`pp1-part-suggestion-item ${filters.status === st ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("status", st);
                      setStatusOpen(false);
                    }}
                  >
                    {st}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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

function CapaBottomTable({ filters, selectedCapaId, onSelectCapaId }) {
  const filteredCapa = React.useMemo(() => {
    let list = MOCK_CAPA_DATA;
    if (filters?.customer) {
      list = list.filter(d => d.customer.toLowerCase().includes(filters.customer.toLowerCase()));
    }
    if (filters?.status) {
      list = list.filter(d => d.status.toLowerCase() === filters.status.toLowerCase());
    }
    return list;
  }, [filters]);

  const rows = React.useMemo(() => {
    return filteredCapa.map(row => {
      const isSelected = row.complNo === selectedCapaId;

      const complNoElement = (
        <span
          onClick={() => onSelectCapaId(row.complNo)}
          style={{
            cursor: "pointer",
            fontWeight: "600",
            color: "#0891b2",
            textDecoration: "underline",
            display: "block"
          }}
        >
          {row.complNo}
        </span>
      );

      const statusElement = (
        <span className={`pp1-badge ${row.status === "Closed" ? "pp1-badge--success" : "pp1-badge--warning"}`}>
          {row.status}
        </span>
      );

      return [
        complNoElement,
        row.complDate,
        row.customer,
        row.partNo,
        row.description,
        row.complDescription,
        row.qcIncharge,
        statusElement,
        `${row.ageDays}d`,
        row.actionTaken || "Pending"
      ];
    });
  }, [filteredCapa, selectedCapaId, onSelectCapaId]);

  const columns = [
    "Complaint No",
    "Date",
    "Customer",
    "Part No",
    "Description",
    "Complaint Description",
    "QC Incharge",
    "Status",
    "Age Days",
    "Action Taken"
  ];

  return <PremiumDashboardBottomTable title="Quality Action Plan (CAPA) Registry" columns={columns} rows={rows} />;
}

function CustomerComplaintReportDashboardView({ filters, onFilterChange, onClose }) {
  const kpis = [
    { label: "Active Complaints", value: "2", icon: AlertTriangle, color: "#ef4444" },
    { label: "Resolved", value: "12", icon: CheckCircle2, color: "#10b981" },
    { label: "Avg Resolution", value: "4.5d", icon: Timer, color: "#3b82f6" },
    { label: "Satisfaction", value: "96%", icon: Smile, color: "#8b5cf6" }
  ];

  const [customerOpen, setCustomerOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [chartType, setChartType] = React.useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);

  const customerRef = React.useRef(null);
  const statusRef = React.useRef(null);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerRef.current && !customerRef.current.contains(event.target)) {
        setCustomerOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setStatusOpen(false);
      }
      if (chartTypeRef.current && !chartTypeRef.current.contains(event.target)) {
        setChartTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const pickerFrom = React.useMemo(() => filters.fromDate ? new Date(filters.fromDate) : null, [filters.fromDate]);
  const pickerTo = React.useMemo(() => filters.toDate ? new Date(filters.toDate) : null, [filters.toDate]);

  const handlePickerChange = ({ from, to }) => {
    const formatDate = (d) => {
      if (!d) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    onFilterChange(prev => ({
      ...prev,
      fromDate: formatDate(from),
      toDate: formatDate(to)
    }));
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      customer: "",
      status: ""
    });
    setChartType("bar");
  };

  const setupChart = React.useCallback(
    (canvas) => {
      const ctx = canvas.getContext("2d");

      if (chartType === "polarArea") {
        // For Polar Area, show the overall category totals (Received, Open, Closed)
        // to prevent overlapping datasets and maintain a premium, clean design.
        return new Chart(canvas, {
          type: "polarArea",
          data: {
            labels: ["Received", "Open", "Closed"],
            datasets: [
              {
                data: [17, 5, 12],
                backgroundColor: [
                  "rgba(79, 70, 229, 0.75)", // Received (Indigo)
                  "rgba(220, 38, 38, 0.75)", // Open (Red)
                  "rgba(22, 163, 74, 0.75)"  // Closed (Green)
                ],
                borderColor: ["#4f46e5", "#dc2626", "#16a34a"],
                borderWidth: 1.5
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "top",
                labels: { font: { size: 10, family: "'Inter', sans-serif" }, color: "#475569" }
              }
            },
            scales: {
              r: {
                grid: { color: "rgba(0, 0, 0, 0.05)" },
                ticks: { display: true, font: { size: 8 }, color: "#64748b", backdropColor: "transparent" }
              }
            }
          }
        });
      }

      // Otherwise, render multi-series month-wise for Bar, Line, Area, Radar, Stepped...
      const isRadar = chartType === "radar";

      const datasets = [
        {
          label: "Received",
          data: [3, 1, 4, 2, 5, 2],
          backgroundColor: chartType === "area" || chartType === "stepped"
            ? "rgba(79, 70, 229, 0.25)"
            : (chartType === "radar" ? "rgba(79, 70, 229, 0.15)" : "rgba(79, 70, 229, 0.75)"),
          borderColor: "#4f46e5",
          borderWidth: chartType === "line" ? 2.5 : 1.5,
          borderRadius: chartType === "bar" ? 4 : 0,
          tension: 0.4,
          fill: chartType === "area" || chartType === "radar" || chartType === "stepped",
          stepped: chartType === "stepped" ? "middle" : false,
          pointRadius: chartType === "bar" ? 0 : 3,
          type: chartType === "radar" ? "radar" : (chartType === "bar" ? "bar" : "line")
        },
        {
          label: "Open",
          data: [1, 0, 1, 0, 2, 1],
          backgroundColor: chartType === "area" || chartType === "stepped"
            ? "rgba(220, 38, 38, 0.25)"
            : (chartType === "radar" ? "rgba(220, 38, 38, 0.15)" : "rgba(220, 38, 38, 0.75)"),
          borderColor: "#dc2626",
          borderWidth: chartType === "line" ? 2.5 : 1.5,
          borderRadius: chartType === "bar" ? 4 : 0,
          tension: 0.4,
          fill: chartType === "area" || chartType === "radar" || chartType === "stepped",
          stepped: chartType === "stepped" ? "middle" : false,
          pointRadius: chartType === "bar" ? 0 : 3,
          type: chartType === "radar" ? "radar" : (chartType === "bar" ? "bar" : "line")
        },
        {
          label: "Closed",
          data: [2, 1, 3, 2, 3, 1],
          backgroundColor: chartType === "area" || chartType === "stepped"
            ? "rgba(22, 163, 74, 0.25)"
            : (chartType === "radar" ? "rgba(22, 163, 74, 0.15)" : "rgba(22, 163, 74, 0.75)"),
          borderColor: "#16a34a",
          borderWidth: chartType === "line" ? 2.5 : 1.5,
          borderRadius: chartType === "bar" ? 4 : 0,
          tension: 0.4,
          fill: chartType === "area" || chartType === "radar" || chartType === "stepped",
          stepped: chartType === "stepped" ? "middle" : false,
          pointRadius: chartType === "bar" ? 0 : 3,
          type: chartType === "radar" ? "radar" : (chartType === "bar" ? "bar" : "line")
        }
      ];

      return new Chart(canvas, {
        type: chartType === "radar" ? "radar" : (chartType === "bar" ? "bar" : "line"),
        data: {
          labels: ["Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026", "Jun 2026"],
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: { font: { size: 10, family: "'Inter', sans-serif" } }
            }
          },
          scales: isRadar ? {
            r: {
              angleLines: { display: true, color: "rgba(0, 0, 0, 0.05)" },
              grid: { circular: true, color: "rgba(0, 0, 0, 0.05)" },
              ticks: { display: true, font: { size: 8 }, color: "#64748b", backdropColor: "transparent" },
              suggestedMin: 0,
              suggestedMax: 6
            }
          } : {
            x: { grid: { display: false }, ticks: { font: { size: 9 } } },
            y: {
              min: 0,
              max: 8,
              grid: { color: "rgba(0,0,0,0.05)" },
              ticks: { font: { size: 9 }, stepSize: 2 }
            }
          }
        }
      });
    },
    [chartType]
  );

  const customersList = ["Tata Motors", "Mahindra & Mahindra", "Maruti Suzuki"];
  const statusesList = ["Open", "Closed"];

  const rebuildToken = `cc-report-chart|${chartType}`;

  return (
    <PremiumDashboardView
      title="Customer Complaint"
      icon={Megaphone}
      color="#dc2626"
      kpis={kpis}
      setupChart={setupChart}
      rangeHint="Month wise complaints chart"
      onClose={onClose}
      rebuildToken={rebuildToken}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range — PlantPerformance1DatePicker (same as Customer PO vs Sales Value) */}
        <div className="pp1-filter-group pp1-filter-group--date-range">
          <label className="pp1-filter-label">Date Range</label>
          <PlantPerformance1DatePicker
            from={pickerFrom}
            to={pickerTo}
            onChange={handlePickerChange}
          />
        </div>

        {/* Customer Dropdown */}
        <div className="pp1-filter-group" ref={customerRef}>
          <label className="pp1-filter-label">Customer Name</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${customerOpen ? "open" : ""}`}
              onClick={() => setCustomerOpen(o => !o)}
            >
              <span>{filters.customer || "All Customers"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {customerOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters.customer ? "selected" : ""}`}
                  onClick={() => { handleInputChange("customer", ""); setCustomerOpen(false); }}
                >
                  All Customers
                </div>
                {customersList.map(c => (
                  <div
                    key={c}
                    className={`pp1-custom-select-option ${filters.customer === c ? "selected" : ""}`}
                    onClick={() => { handleInputChange("customer", c); setCustomerOpen(false); }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="pp1-filter-group" ref={statusRef}>
          <label className="pp1-filter-label">Status</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${statusOpen ? "open" : ""}`}
              onClick={() => setStatusOpen(o => !o)}
            >
              <span>{filters.status || "All Statuses"}</span>
              <ChevronDown size={12} className="pp1-custom-select-caret" />
            </button>
            {statusOpen && (
              <div className="pp1-custom-select-options">
                <div
                  className={`pp1-custom-select-option ${!filters.status ? "selected" : ""}`}
                  onClick={() => { handleInputChange("status", ""); setStatusOpen(false); }}
                >
                  All Statuses
                </div>
                {statusesList.map(s => (
                  <div
                    key={s}
                    className={`pp1-custom-select-option ${filters.status === s ? "selected" : ""}`}
                    onClick={() => { handleInputChange("status", s); setStatusOpen(false); }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chart Type Dropdown Filter */}
        <div className="pp1-filter-group" ref={chartTypeRef} style={{ maxWidth: "120px" }}>
          <label className="pp1-filter-label">Chart Type</label>
          <div className="pp1-part-autocomplete-wrap">
            <div
              className="pp1-filter-input pp1-dropdown-trigger"
              onClick={() => setChartTypeOpen(!chartTypeOpen)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {chartType === "bar" ? (
                  <BarChart2 size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "area" ? (
                  <AreaChart size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "radar" ? (
                  <Radar size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} className="pp1-dropdown-trigger-icon" />
                ) : chartType === "stepped" ? (
                  <Activity size={12} className="pp1-dropdown-trigger-icon" />
                ) : (
                  <LucideLineChart size={12} className="pp1-dropdown-trigger-icon" />
                )}
                <span style={{ textTransform: "capitalize" }}>{chartType === "polarArea" ? "Polar Area" : chartType === "radar" ? "Radar" : chartType === "stepped" ? "Stepped" : chartType}</span>
              </div>
              <ChevronDown size={11} className="pp1-dropdown-caret" style={{ transform: chartTypeOpen ? "rotate(180deg)" : "none" }} />
            </div>

            {chartTypeOpen && (
              <div className="pp1-part-suggestions pp1-dropdown-menu">
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "line" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("line");
                    setChartTypeOpen(false);
                  }}
                >
                  <LucideLineChart size={12} />
                  <span>Line Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "bar" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("bar");
                    setChartTypeOpen(false);
                  }}
                >
                  <BarChart2 size={12} />
                  <span>Bar Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "area" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("area");
                    setChartTypeOpen(false);
                  }}
                >
                  <AreaChart size={12} />
                  <span>Area Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "radar" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("radar");
                    setChartTypeOpen(false);
                  }}
                >
                  <Radar size={12} />
                  <span>Radar Chart</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "polarArea" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("polarArea");
                    setChartTypeOpen(false);
                  }}
                >
                  <PieChart size={12} />
                  <span>Polar Area</span>
                </div>
                <div
                  className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === "stepped" ? "selected" : ""}`}
                  onClick={() => {
                    setChartType("stepped");
                    setChartTypeOpen(false);
                  }}
                >
                  <Activity size={12} />
                  <span>Stepped Chart</span>
                </div>
              </div>
            )}
          </div>
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

function parseTableDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const day = parts[0];
  const monthMap = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
  };
  const month = monthMap[parts[1]] || "01";
  const year = parts[2];
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

function CustomerComplaintReportBottomTable({ filters }) {
  const columns = ["Complaint ID", "Customer", "Product", "Complaint Description", "Action Taken", "Date", "Corrective Action", "Permanent Action", "Status"];
  const allRows = [
    ["CC-2026-001", "Tata Motors", "Brake Pads", "Surface scratches", "Polished surfaces", "02-Jun-2026", "Enhanced visual inspection", "Automated QC cameras", "Closed"],
    ["CC-2026-002", "Mahindra & Mahindra", "Disc Rotors", "Thickness variation", "Recalibrated grinder", "05-Jun-2026", "Adjusted grinding head", "CNC alignment checks", "Open"],
    ["CC-2026-003", "Maruti Suzuki", "Gearbox Hanger", "Mounting hole offset", "Re-aligned fixture", "10-Jun-2026", "Added check pin to fixture", "Poka-yoke pin design", "Closed"]
  ];

  const filteredRows = React.useMemo(() => {
    if (!filters) return allRows;
    return allRows.filter(row => {
      const parsedDate = parseTableDate(row[5]);
      if (filters.fromDate && parsedDate && parsedDate < filters.fromDate) return false;
      if (filters.toDate && parsedDate && parsedDate > filters.toDate) return false;
      if (filters.customer && row[1] !== filters.customer) return false;
      if (filters.status && row[8] !== filters.status) return false;
      return true;
    });
  }, [filters]);

  return <PremiumDashboardBottomTable title="Customer Complaints Registry" columns={columns} rows={filteredRows} />;
}


export default function PlantPerformance1() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const defaultFrom = `${year}-${month}-01`;
  const defaultTo = `${year}-${month}-${day}`;

  const [selKpi, setSelKpi] = useState(0);
  const [selAction, setSelAction] = useState("customer_po_vs_sales_analysis");
  const [centerKey, setCenterKey] = useState(0);
  const [activePeriod, setActivePeriod] = useState("month");
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [data, setData] = useState({});



  const [poFilters, setPoFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    customer: "",
    poNumber: "",
    partNumber: "",
    category: "",
  });
  const [otdFilters, setOtdFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    customer: "",
    partNumber: "",
  });
  const [supplierFilters, setSupplierFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    supplier: [],
    partNo: "",
  });
  const [vendorFilters, setVendorFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    vendor: [],
    partNo: "",
  });
  const [fgFilters, setFgFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    customer: [],
    itemCode: "",
    ageDays: "",
  });
  const [dailyProductionFilters, setDailyProductionFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    machineNo: "",
  });
  const [targetVsActualFilters, setTargetVsActualFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    customer: "",
  });
  const [operatorEfficiencyFilters, setOperatorEfficiencyFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    operator: "",
    effLimit: "",
  });
  const [capaFilters, setCapaFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    customer: "",
    status: "",
  });
  const [selectedCapaId, setSelectedCapaId] = useState("CM250018");
  const [poActiveSlide, setPoActiveSlide] = useState(0);
  const [poShowTargetOnly, setPoShowTargetOnly] = useState(false);
  const [purFilters, setPurFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    supplier: "",
    category: "",
    partNumber: "",
  });
  const [purchaseValueFilters, setPurchaseValueFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    supplier: "",
    category: "",
    partNumber: "",
  });
  const [salesFilters, setSalesFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    customer: "",
    region: "",
  });
  const [prodFilters, setProdFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    team: "",
    machine: "",
    operator: "",
    customer: "",
  });
  const [idleFilters, setIdleFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    machine: "",
    operator: "",
    idleReason: "",
  });
  const [idleActiveTab, setIdleActiveTab] = useState("chart1");
  const [nonAccFilters, setNonAccFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    machine: "",
    team: "",
    reason: "",
  });
  const [compFilters, setCompFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    customer: "",
    status: ""
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
  const [rejActiveTab, setRejActiveTab] = useState("machine_wise_rejection");
  const [oeeCompFilters, setOeeCompFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    month: "",
    year: "",
    week: "",
    machineType: "",
    machine: "",
  });
  const [oeeCompXAxisGroup, setOeeCompXAxisGroup] = useState("Month Wise");
  const [effXAxisGroup, setEffXAxisGroup] = useState("Month Wise");
  const [effFilters, setEffFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    month: "",
    year: "",
    week: "",
    team: "",
    machineType: "",
    machine: "",
    operatorName: "",
  });
  const [rejFilters, setRejFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    customer: "",
    partNo: "",
    rejType: "",
    rejReason: "",
  });
  const [rewFilters, setRewFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    customer: "",
    partNo: "",
    reworkReason: "",
  });
  const [reworkXAxisGroup, setReworkXAxisGroup] = useState("Overall");
  const [stockFilters, setStockFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    category: "",
    itemCode: "",
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
    store_stock_value: {
      maxStockValueL: 50.0
    },
    production_analysis: {
      minProductionValue: 12.0
    },
    grn_value: {
      minGrnValueL: 100
    },
    sales_analysis: {
      monthlyTarget: 150
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
      minUtilization: 75,
      monthWiseTarget: 75,
      dayWiseTarget: 75,
      macWiseTarget: 75,
      teamWiseTarget: 75
    },
    rejection: {
      rejectionLimit: 2.0,
      inHouseLimit: 1.0,
      vendorLimit: 1.2,
      finalInspLimit: 1.5,
      supplierLimit: 0.5
    },
    rework: {
      reworkLimit: 1.5,
      inHouseLimit: 1.0,
      jobOrderLimit: 1.2,
      finalInspLimit: 1.5,
      customerReworkLimit: 0.5
    },
    efficiency: {
      monthWiseTarget: 80,
      dayWiseTarget: 80,
      macWiseTarget: 80,
      teamWiseTarget: 80
    },
    otd: {
      targetPct: 90,
      trendPct: 90
    },
    supplier_rating: {
      minRating: 90
    },
    vendor_rating: {
      minRating: 90
    },
    fg_value: {
      maxStockValueL: 60.0
    },
    daily_production: {
      maxBalanceHours: 4.0
    },
    target_vs_actual: {
      minFulfillmentPct: 90.0
    },
    operator_efficiency: {
      minEfficiencyPct: 90.0
    },
    purchase_value: {
      minPurchaseValueL: 100
    }
  });

  const [activeTargetTab, setActiveTargetTab] = useState("customer_po");
  const [tempConfig, setTempConfig] = useState(null);
  const [toast, setToast] = useState(null);
  const targetRef = useRef(null);

  // ── Admin check: only super-admins can see Target Criteria ──
  const isAdmin = (() => {
    try {
      const cache = JSON.parse(localStorage.getItem("ba_user_rights") || "{}");
      return !!cache.isSuperAdmin;
    } catch { return false; }
  })();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      let optionsContainer = document.querySelector(".pp1-custom-select-options");
      let triggerBtn = null;
      let options = [];
      let isAutocomplete = false;

      if (optionsContainer) {
        triggerBtn = optionsContainer.previousElementSibling;
        options = Array.from(optionsContainer.querySelectorAll(".pp1-custom-select-option"));
      } else {
        optionsContainer = document.querySelector(".pp1-part-suggestions");
        if (optionsContainer) {
          triggerBtn = optionsContainer.previousElementSibling;
          options = Array.from(optionsContainer.querySelectorAll(".pp1-part-suggestion-item"));
          isAutocomplete = true;
        }
      }

      if (!optionsContainer || options.length === 0) return;

      let activeIndex = options.findIndex(opt => opt.classList.contains("active-focus"));
      if (activeIndex === -1) {
        activeIndex = options.findIndex(opt => opt.classList.contains("selected"));
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        options.forEach(opt => opt.classList.remove("active-focus"));
        const nextIndex = (activeIndex + 1) % options.length;
        options[nextIndex].classList.add("active-focus");
        options[nextIndex].scrollIntoView({ block: "nearest" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        options.forEach(opt => opt.classList.remove("active-focus"));
        const prevIndex = (activeIndex - 1 + options.length) % options.length;
        options[prevIndex].classList.add("active-focus");
        options[prevIndex].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const activeOpt = optionsContainer.querySelector(".active-focus");
        if (activeOpt) {
          activeOpt.click();
        } else {
          const selectedOpt = optionsContainer.querySelector(".selected");
          if (selectedOpt) {
            selectedOpt.click();
          } else if (options[0]) {
            options[0].click();
          }
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (isAutocomplete && triggerBtn) {
          triggerBtn.blur();
        } else if (triggerBtn) {
          triggerBtn.click();
          triggerBtn.focus();
        }
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

  const handleOpenTargetModal = () => {
    setTempConfig(JSON.parse(JSON.stringify(targetConfig)));
    setActiveTargetTab("customer_po");
    setShowTargetPopover(true);
  };

  useEffect(() => {
    if (!showTargetPopover) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showTargetPopover]);

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
    // Calculate live total sales value from database rows
    let salesVal = 0;
    const poCompareRows = data?.customerPoCompare?.rows;
    if (poCompareRows && Array.isArray(poCompareRows)) {
      const fromStr = poFilters.fromDate || defaultFrom;
      const toStr = poFilters.toDate || defaultTo;
      poCompareRows.forEach(r => {
        if (fromStr && r.date < fromStr) return;
        if (toStr && r.date > toStr) return;
        salesVal += Number(r.salesValue || 0);
      });
    }
    const salesTarget = targetConfig.customer_po?.salesTarget ?? 25;
    const poOk = salesVal >= salesTarget;
    const poDiff = (((salesVal - salesTarget) / salesTarget) * 100).toFixed(1);
    map["customer_po_vs_sales_analysis"] = {
      type: poOk ? "up" : "down",
      value: `${poOk ? "+" : ""}${poDiff}%`,
      message: poOk
        ? `Total Sales (₹${salesVal.toFixed(2)}L) meets target (₹${salesTarget}L)`
        : `Total Sales (₹${salesVal.toFixed(2)}L) is below target (₹${salesTarget}L)`,
      priority: poOk ? "medium" : "high"
    };

    // Sales Analysis — live monthly totals vs target
    const salesMonthlyTotals = {};
    const salesCompareRows = data?.salesAnalysisCompare?.rows;
    if (salesCompareRows && Array.isArray(salesCompareRows)) {
      // Don't filter by date range for the sidebar trend card to ensure it shows by default
      const filteredForTrend = salesCompareRows.filter(r => {
        if (salesFilters.customer && r.customer !== salesFilters.customer) return false;
        return true;
      });
      filteredForTrend.forEach((r) => {
        if (!r.monthName) return;
        salesMonthlyTotals[r.monthName] = (salesMonthlyTotals[r.monthName] || 0) + Number(r.salesValue || 0);
      });
    }
    const salesMonthVals = Object.values(salesMonthlyTotals);
    const salesMonthlyTarget = targetConfig.sales_analysis?.monthlyTarget ?? 150;
    const salesMonthlyTotal = salesMonthVals.reduce((a, b) => a + b, 0);
    const salesMonthlyAvg = salesMonthVals.length > 0 ? salesMonthlyTotal / salesMonthVals.length : 0;
    const salesPeriodTarget = salesMonthVals.length > 0 ? salesMonthlyTarget * salesMonthVals.length : salesMonthlyTarget;
    const salesAnaOk = salesMonthVals.length > 0 && salesMonthVals.every((v) => v >= salesMonthlyTarget);
    const salesAnaDiff = salesPeriodTarget > 0
      ? (((salesMonthlyTotal - salesPeriodTarget) / salesPeriodTarget) * 100).toFixed(1)
      : "0.0";
    if (salesMonthVals.length > 0) {
      map["sales_analysis_report_dashboard"] = {
        type: salesAnaOk ? "up" : "down",
        value: `${salesAnaOk ? "+" : ""}${salesAnaDiff}%`,
        message: salesAnaOk
          ? `All monthly sales (total ₹${salesMonthlyTotal.toFixed(2)}L, avg ₹${salesMonthlyAvg.toFixed(2)}L/mo) meet target (₹${salesMonthlyTarget}L/month)`
          : `Monthly sales (total ₹${salesMonthlyTotal.toFixed(2)}L, avg ₹${salesMonthlyAvg.toFixed(2)}L/mo) is below target (₹${salesMonthlyTarget}L/month)`,
        priority: salesAnaOk ? "medium" : "high"
      };
    }

    // GRN Value trend — monthly totals vs per-month target
    const grnMonthlyTotals = {};
    const grnCompareRows = data?.grnValueCompare?.rows;
    if (grnCompareRows && Array.isArray(grnCompareRows)) {
      // Don't filter by date range for the sidebar trend card to ensure it shows by default
      const filteredForTrend = grnCompareRows.filter(r => {
        if (purFilters.supplier && r.supplierName !== purFilters.supplier) return false;
        if (purFilters.partNumber) {
          const pno = String(r.partNo || "").toLowerCase();
          if (!pno.includes(String(purFilters.partNumber).toLowerCase())) return false;
        }
        if (purFilters.category && (r.dtype || "") !== purFilters.category) return false;
        return true;
      });
      filteredForTrend.forEach((r) => {
        if (!r.month) return;
        grnMonthlyTotals[r.month] = (grnMonthlyTotals[r.month] || 0) + Number(r.amount || 0);
      });
    }
    const grnMonthVals = Object.values(grnMonthlyTotals);
    const grnTarget = targetConfig.grn_value?.minGrnValueL ?? 100;
    if (grnMonthVals.length > 0) {
      const grnMinMonthly = Math.min(...grnMonthVals);
      const grnOk = grnMonthVals.every(v => v >= grnTarget);
      const grnDiff = grnTarget > 0 ? (((grnMinMonthly - grnTarget) / grnTarget) * 100).toFixed(1) : "0.0";
      map["purchase_report_dashboard"] = {
        type: grnOk ? "up" : "down",
        value: `${grnOk ? "+" : ""}${grnDiff}%`,
        message: grnOk
          ? `All monthly GRN values meet target (₹${grnTarget}L/month)`
          : `Monthly GRN value (₹${grnMinMonthly.toFixed(2)}L) is below target (₹${grnTarget}L/month)`,
        priority: grnOk ? "medium" : "high"
      };
    }

    const pvTarget = targetConfig.purchase_value?.minPurchaseValueL ?? 100;
    const pvActual = 151.0;
    const pvOk = pvActual >= pvTarget;
    const pvDiff = pvTarget > 0 ? (((pvActual - pvTarget) / pvTarget) * 100).toFixed(1) : "0.0";
    map["purchase_value_report_dashboard"] = {
      type: pvOk ? "up" : "down",
      value: `${pvOk ? "+" : ""}${pvDiff}%`,
      message: pvOk
        ? `Purchase Value (₹${pvActual.toFixed(1)}L) meets target limit (₹${pvTarget}L)`
        : `Purchase Value (₹${pvActual.toFixed(1)}L) is below target limit (₹${pvTarget}L)`,
      priority: pvOk ? "medium" : "high"
    };

    const totalIdle = 17.3;
    const maxIdle = targetConfig.idle_hours?.maxIdleHours ?? 15;
    const idleOk = totalIdle <= maxIdle;
    const idleDiff = (((maxIdle - totalIdle) / maxIdle) * 100).toFixed(1);
    map["idle_hours_report_dashboard"] = {
      type: idleOk ? "up" : "down",
      value: `${idleOk ? "+" : "-"}${Math.abs(Number(idleDiff))}%`,
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
      value: `${nonAccOk ? "+" : "-"}${Math.abs(Number(nonAccDiff))}%`,
      message: nonAccOk
        ? `Non-Accepted Hours (${nonAcceptedHrs}h) is within target (${maxNonAccepted}h)`
        : nonAcceptedHrs > maxNonAccepted
          ? `Non-Accepted Hours (${nonAcceptedHrs}h) exceeds target (${maxNonAccepted}h)`
          : `Unplanned Loss (${unplannedLossPct.toFixed(1)}%) exceeds threshold (${unplannedLimit}%)`,
      priority: "high"
    };

    const rejPct = 1.8;
    const rejLimit = targetConfig.rejection?.rejectionLimit ?? 2.0;
    const rejOk = rejPct <= rejLimit;
    const rejDiff = ((rejLimit - rejPct) / rejLimit * 100).toFixed(1);
    map["rejection_report_dashboard"] = {
      type: rejOk ? "up" : "down",
      value: `${rejOk ? "+" : "-"}${Math.abs(Number(rejDiff))}%`,
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
      value: `${rewOk ? "+" : "-"}${Math.abs(Number(rewDiff))}%`,
      message: rewOk
        ? `Rework Rate (${rewPct}%) is within target limit (${rewLimit}%)`
        : `Rework Rate (${rewPct}%) exceeds target limit (${rewLimit}%)`,
      priority: "high"
    };
    const oeeMinUtilization = targetConfig.oee_comparison?.monthWiseTarget ?? targetConfig.oee_comparison?.minUtilization ?? 75;
    const currentOee = 76.0;
    const oeeOk = currentOee >= oeeMinUtilization;
    const oeeDiff = (((currentOee - oeeMinUtilization) / oeeMinUtilization) * 100).toFixed(1);
    map["oee_comparison_report_dashboard"] = {
      type: oeeOk ? "up" : "down",
      value: `${oeeOk ? "+" : ""}${oeeDiff}%`,
      message: oeeOk
        ? `Overall OEE (${currentOee}%) meets target limit (${oeeMinUtilization}%)`
        : `Overall OEE (${currentOee}%) is below target limit (${oeeMinUtilization}%)`,
      priority: oeeOk ? "medium" : "high"
    };

    const effTarget = targetConfig.efficiency?.monthWiseTarget ?? 80;
    const currentEff = 81.5;
    const effOk = currentEff >= effTarget;
    const effDiff = (((currentEff - effTarget) / effTarget) * 100).toFixed(1);
    map["efficiency_eff_report_dashboard"] = {
      type: effOk ? "up" : "down",
      value: `${effOk ? "+" : ""}${effDiff}%`,
      message: effOk
        ? `Overall Efficiency (${currentEff}%) meets target limit (${effTarget}%)`
        : `Overall Efficiency (${currentEff}%) is below target limit (${effTarget}%)`,
      priority: effOk ? "medium" : "high"
    };

    const prodTarget = targetConfig.production_analysis?.minProductionValue ?? 12.0;
    const currentProdVal = 15.57;
    const prodOk = currentProdVal >= prodTarget;
    const prodDiff = (((currentProdVal - prodTarget) / prodTarget) * 100).toFixed(1);
    map["production_analysis_report_dashboard"] = {
      type: prodOk ? "up" : "down",
      value: `${prodOk ? "+" : ""}${prodDiff}%`,
      message: prodOk
        ? `Total Production Value (₹${currentProdVal}L) meets target limit (₹${prodTarget}L)`
        : `Total Production Value (₹${currentProdVal}L) is below target limit (₹${prodTarget}L)`,
      priority: prodOk ? "medium" : "high"
    };

    // Store Stock Value trend calculation
    const stockVal = 42.5; // Lakhs (mock actual stock value)
    const stockLimit = targetConfig.store_stock_value?.maxStockValueL ?? 50.0;
    const stockOk = stockVal <= stockLimit;
    const stockDiff = stockLimit > 0 ? (((stockLimit - stockVal) / stockLimit) * 100).toFixed(1) : "0.0";
    map["store_stock_value_report_dashboard"] = {
      type: stockOk ? "up" : "down",
      value: `${stockOk ? "+" : "-"}${Math.abs(Number(stockDiff))}%`,
      message: stockOk
        ? `Store Stock Value (₹${stockVal}L) is within target limit (₹${stockLimit}L)`
        : `Store Stock Value (₹${stockVal}L) exceeds target limit (₹${stockLimit}L)`,
      priority: "medium"
    };

    // OTD trend calculation
    const otdPct = data?.otd?.kpis?.on_time_delivery_pct ?? 88.5;
    const otdTarget = targetConfig.otd?.targetPct ?? 90;
    const otdOk = otdPct >= otdTarget;
    const otdDiff = (((otdPct - otdTarget) / otdTarget) * 100).toFixed(1);
    map["otd_report_dashboard"] = {
      type: otdOk ? "up" : "down",
      value: `${otdOk ? "+" : ""}${otdDiff}%`,
      message: otdOk
        ? `On-Time Delivery (${otdPct}%) meets target limit (${otdTarget}%)`
        : `On-Time Delivery (${otdPct}%) is below target limit (${otdTarget}%)`,
      priority: otdOk ? "medium" : "high"
    };

    // Supplier Rating trend calculation (UI alone)
    const supplierRating = 92.5;
    const supplierTarget = targetConfig.supplier_rating?.minRating ?? 90;
    const supplierOk = supplierRating >= supplierTarget;
    const supplierDiff = (((supplierRating - supplierTarget) / supplierTarget) * 100).toFixed(1);
    map["supplier_rating_report_dashboard"] = {
      type: supplierOk ? "up" : "down",
      value: `${supplierOk ? "+" : ""}${supplierDiff}%`,
      message: supplierOk
        ? `Supplier Rating (${supplierRating}%) meets target limit (${supplierTarget}%)`
        : `Supplier Rating (${supplierRating}%) is below target limit (${supplierTarget}%)`,
      priority: supplierOk ? "medium" : "high"
    };

    // Vendor Rating trend calculation (UI alone)
    const vendorRating = 94.0;
    const vendorTarget = targetConfig.vendor_rating?.minRating ?? 90;
    const vendorOk = vendorRating >= vendorTarget;
    const vendorDiff = (((vendorRating - vendorTarget) / vendorTarget) * 100).toFixed(1);
    map["vendor_rating_report_dashboard"] = {
      type: vendorOk ? "up" : "down",
      value: `${vendorOk ? "+" : ""}${vendorDiff}%`,
      message: vendorOk
        ? `Vendor Rating (${vendorRating}%) meets target limit (${vendorTarget}%)`
        : `Vendor Rating (${vendorRating}%) is below target limit (${vendorTarget}%)`,
      priority: vendorOk ? "medium" : "high"
    };

    // FG Value trend calculation (UI alone)
    const fgVal = 48.5; // Lakhs
    const fgLimit = targetConfig.fg_value?.maxStockValueL ?? 60.0;
    const fgOk = fgVal <= fgLimit;
    const fgDiff = fgLimit > 0 ? (((fgLimit - fgVal) / fgLimit) * 100).toFixed(1) : "0.0";
    map["fg_value_report_dashboard"] = {
      type: fgOk ? "up" : "down",
      value: `${fgOk ? "+" : "-"}${Math.abs(Number(fgDiff))}%`,
      message: fgOk
        ? `FG Value (₹${fgVal}L) is within target limit (₹${fgLimit}L)`
        : `FG Value (₹${fgVal}L) exceeds target limit (₹${fgLimit}L)`,
      priority: fgOk ? "medium" : "high"
    };

    // Daily Production trend calculation (UI alone)
    const machinesHrs = [2, 6, 4, 3];
    const maxAllowedHrs = targetConfig.daily_production?.maxBalanceHours ?? 4.0;
    const dpExceedsList = machinesHrs.filter(h => h > maxAllowedHrs);
    const dpOk = dpExceedsList.length === 0;
    map["daily_production_report_dashboard"] = {
      type: dpOk ? "up" : "down",
      value: dpOk ? "+15.5%" : "-28.4%",
      message: dpOk
        ? `All machines are within the Balance Hours limit of ${maxAllowedHrs} hrs.`
        : `${dpExceedsList.length} machine(s) exceed the Balance Hours limit of ${maxAllowedHrs} hrs.`,
      priority: dpOk ? "medium" : "high"
    };

    // Target Vs Actual trend calculation (UI alone)
    const tvaFulfillment = 82.7; // Percent
    const tvaLimit = targetConfig.target_vs_actual?.minFulfillmentPct ?? 90.0;
    const tvaOk = tvaFulfillment >= tvaLimit;
    map["target_vs_actual_report_dashboard"] = {
      type: tvaOk ? "up" : "down",
      value: tvaOk ? "+2.4%" : "-7.3%",
      message: tvaOk
        ? `Fulfillment rate (${tvaFulfillment}%) meets minimum target (${tvaLimit}%)`
        : `Fulfillment rate (${tvaFulfillment}%) is below minimum target (${tvaLimit}%)`,
      priority: tvaOk ? "medium" : "high"
    };

    // Operator Efficiency trend calculation (UI alone)
    const oeVal = 86.0; // Percent
    const oeLimit = targetConfig.operator_efficiency?.minEfficiencyPct ?? 90.0;
    const oeOk = oeVal >= oeLimit;
    map["operator_efficiency_report_dashboard"] = {
      type: oeOk ? "up" : "down",
      value: oeOk ? "+1.8%" : "-4.0%",
      message: oeOk
        ? `Avg Operator Efficiency (${oeVal}%) meets target (${oeLimit}%)`
        : `Avg Operator Efficiency (${oeVal}%) is below target (${oeLimit}%)`,
      priority: oeOk ? "medium" : "high"
    };

    // Quality Action Plan (CAPA) trend calculation (UI alone)
    map["capa_report_dashboard"] = {
      type: "down",
      value: "1 Open",
      message: "1 open CAPA complaint (OD 165.6 - 0.4) requires corrective action.",
      priority: "medium"
    };

    return map;
  }, [targetConfig, data, poFilters, purFilters, salesFilters]);

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

  const getCardTargetLabel = useCallback((cardId) => {
    if (!targetConfig) return "";
    switch (cardId) {
      case "purchase_value":
      case "purchase_value_report_dashboard": {
        const val = targetConfig.purchase_value?.minPurchaseValueL ?? 100;
        return `Target: ₹${val}L`;
      }
      case "production_analysis_report_dashboard": {
        const val = targetConfig.production_analysis?.minProductionValue ?? 12.0;
        return `Target: ₹${val}L`;
      }
      case "oee_comparison_report_dashboard": {
        const val = targetConfig.oee_comparison?.monthWiseTarget ?? 75;
        return `Target: ${val}%`;
      }
      case "efficiency_eff_report_dashboard": {
        const val = targetConfig.efficiency?.monthWiseTarget ?? 80;
        return `Target: ${val}%`;
      }
      case "rejection_report_dashboard": {
        const val = targetConfig.rejection?.rejectionLimit ?? 2.0;
        return `Limit: ≤${val}%`;
      }
      case "rework_report_dashboard": {
        const val = targetConfig.rework?.reworkLimit ?? 1.5;
        return `Limit: ≤${val}%`;
      }
      case "customer_complaint_report_dashboard":
        return "Status: 2 Open";
      case "capa_report_dashboard":
        return "Value: 1 Open";
      case "store_stock_value_report_dashboard": {
        const val = targetConfig.store_stock_value?.maxStockValueL ?? 50.0;
        return `Limit: ≤₹${val}L`;
      }
      case "supplier_rating_report_dashboard": {
        const val = targetConfig.supplier_rating?.minRating ?? 90;
        return `Min: ${val}%`;
      }
      case "vendor_rating_report_dashboard": {
        const val = targetConfig.vendor_rating?.minRating ?? 90;
        return `Min: ${val}%`;
      }
      case "fg_value_report_dashboard": {
        const val = targetConfig.fg_value?.maxStockValueL ?? 60.0;
        return `Limit: ≤₹${val}L`;
      }
      case "customer_po_vs_sales_analysis": {
        const val = targetConfig.customer_po?.salesTarget ?? 25;
        return `Target: ₹${val}L`;
      }
      case "purchase_report_dashboard": {
        const val = targetConfig.grn_value?.minGrnValueL ?? 100;
        return `Target: ₹${val}L/mo`;
      }
      case "sales_analysis_report_dashboard": {
        const val = targetConfig.sales_analysis?.monthlyTarget ?? 150;
        return `Target: ₹${val}L/mo`;
      }
      case "idle_hours_report_dashboard": {
        const val = targetConfig.idle_hours?.maxIdleHours ?? 15;
        return `Limit: ≤${val}h`;
      }
      case "otd_report_dashboard": {
        const val = targetConfig.otd?.targetPct ?? 90;
        return `Target: ${val}%`;
      }
      case "daily_production_report_dashboard": {
        const val = targetConfig.daily_production?.maxBalanceHours ?? 4.0;
        return `Limit: ≤${val}h`;
      }
      case "target_vs_actual_report_dashboard": {
        const val = targetConfig.target_vs_actual?.minFulfillmentPct ?? 90.0;
        return `Min: ${val}%`;
      }
      case "operator_efficiency_report_dashboard": {
        const val = targetConfig.operator_efficiency?.minEfficiencyPct ?? 90.0;
        return `Min: ${val}%`;
      }
      case "idle_hours_non_accepted_reason_production_loss_report": {
        const val = targetConfig.idle_hours_non_accepted?.maxNonAcceptedHours ?? 5;
        return `Limit: ≤${val}h`;
      }
      default:
        return "";
    }
  }, [targetConfig]);

  const getCardStatus = useCallback((cardId) => {
    const item = actionItems.find(x => x.id === cardId);
    return item ? { belowTarget: true } : { belowTarget: false };
  }, [actionItems]);

  const centerRef = useRef(null);
  const [sideColumnHeight, setSideColumnHeight] = useState(null);
  const [panelsCollapsed, setPanelsCollapsed] = useState(false);
  const [railHover, setRailHover] = useState(null); // {id,title,Icon,color,rect,side}
  const [isStackedLayout, setIsStackedLayout] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches
  );

  // Fire resize events during+after CSS grid transition so Chart.js redraws at correct width
  useEffect(() => {
    const fire = () => window.dispatchEvent(new Event("resize"));
    // Immediately + mid-transition + after transition completes (0.32s)
    fire();
    const t1 = setTimeout(fire, 180);
    const t2 = setTimeout(fire, 380);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [panelsCollapsed]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = (e) => {
      setIsStackedLayout(e.matches);
      if (e.matches) setSideColumnHeight(null);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = centerRef.current;
    if (!el || isStackedLayout) {
      setSideColumnHeight(null);
      return;
    }

    const syncSideHeight = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) setSideColumnHeight(h);
    };

    syncSideHeight();
    const ro = new ResizeObserver(syncSideHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [centerKey, selectionId, loading, isStackedLayout]);

  return (
    <div className={`pp1-root ${loading ? "pp1-root--loading" : ""}`}>
      <div className="pp1-fbar">
        <PlantPerformance1DatePicker
          from={dateRange.from}
          to={dateRange.to}
          onChange={handleRangeChange}
        />
        {loading && <span className="pp1-fbar-status">Loading live data…</span>}
        {fetchError && <span className="pp1-fbar-error">{fetchError}</span>}

        {isAdmin && (
          <div className="pp1-fbar-target-wrap" ref={targetRef}>
            <button
              type="button"
              className={`pp1-fbar-target-btn ${showTargetPopover ? "pp1-fbar-target-btn--active" : ""}`}
              onClick={handleOpenTargetModal}
            >
              <Target size={14} className="pp1-target-icon" />
              <span>Target Criteria</span>
            </button>

            {showTargetPopover && tempConfig && createPortal(
              <div
                className="pp1-target-modal-overlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pp1-target-modal-title"
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
                      <h3 className="pp1-target-modal__title" id="pp1-target-modal-title">Target Criteria</h3>
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
                          { id: "production_analysis", label: "Production Value Vs Actual Value", icon: Factory },
                          { id: "customer_po", label: "Customer PO vs Sales Value", icon: ClipboardList },
                          { id: "grn_value", label: "GRN Value", icon: ShoppingCart },
                          { id: "purchase_value", label: "Purchase Value", icon: ShoppingCart },
                          { id: "sales_analysis", label: "Sales Analysis", icon: TrendingUp },
                          { id: "idle_hours", label: "Idle Hours", icon: Clock },
                          { id: "oee_comparison", label: "OEE", icon: BarChart2 },
                          { id: "rejection", label: "Rejection", icon: XOctagon },
                          { id: "rework", label: "Rework", icon: RefreshCw },
                          { id: "efficiency", label: "Efficiency (EFF)", icon: UserCheck },
                          { id: "store_stock_value", label: "Store Stock Value", icon: Coins },
                          { id: "otd", label: "OTD", icon: Clock },
                          { id: "supplier_rating", label: "Supplier Rating", icon: Star },
                          { id: "vendor_rating", label: "Vendor Rating", icon: Award },
                          { id: "fg_value", label: "FG Value", icon: Package },
                          { id: "daily_production", label: "Daily Production", icon: Activity },
                          { id: "target_vs_actual", label: "Target Vs Actual", icon: Target },
                          { id: "operator_efficiency", label: "Operator Efficiency", icon: Users }
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

                      {activeTargetTab === "grn_value" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">GRN Value Target</h4>
                          <p className="pp1-target-settings__desc">Set the minimum total GRN purchase value target per period (in Lakhs). A target line will be drawn on the trend chart.</p>

                          <div className="pp1-target-field">
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Min GRN Value Target (Lakhs)</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <span className="pp1-target-input-prefix">₹</span>
                              <input
                                type="number" step="1" min="0"
                                value={tempConfig.grn_value.minGrnValueL}
                                onChange={(e) => handleNestedTempConfigChange("grn_value", "minGrnValueL", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">Lakhs</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTargetTab === "purchase_value" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">Purchase Value Target</h4>
                          <p className="pp1-target-settings__desc">Set the minimum total purchase value target per period (in Lakhs). A target line will be drawn on the trend chart.</p>

                          <div className="pp1-target-field">
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Min Purchase Value Target (Lakhs)</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <span className="pp1-target-input-prefix">₹</span>
                              <input
                                type="number" step="1" min="0"
                                value={tempConfig.purchase_value.minPurchaseValueL}
                                onChange={(e) => handleNestedTempConfigChange("purchase_value", "minPurchaseValueL", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">Lakhs</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTargetTab === "sales_analysis" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">Sales Analysis Target</h4>
                          <p className="pp1-target-settings__desc">Set the monthly total sales value target (in Lakhs). A target line will appear on the Month Wise Total Sales chart and the trend % will be computed against this target.</p>

                          <div className="pp1-target-field">
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Monthly Sales Target (Lakhs/month)</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <span className="pp1-target-input-prefix">₹</span>
                              <input
                                type="number" step="5" min="0"
                                value={tempConfig.sales_analysis?.monthlyTarget ?? 150}
                                onChange={(e) => handleNestedTempConfigChange("sales_analysis", "monthlyTarget", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">L / month</span>
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



                      {activeTargetTab === "oee_comparison" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">OEE Target</h4>
                          <p className="pp1-target-settings__desc">Set the target limits for OEE analysis by dimension.</p>

                          <div className="pp1-target-field" style={{ marginBottom: "15px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Month Wise Target (%)</span>
                              <span className="pp1-target-field__val">{tempConfig.oee_comparison.monthWiseTarget ?? tempConfig.oee_comparison.minUtilization ?? 75}%</span>
                            </div>
                            <input
                              type="range" min="0" max="100"
                              value={tempConfig.oee_comparison.monthWiseTarget ?? tempConfig.oee_comparison.minUtilization ?? 75}
                              onChange={(e) => handleNestedTempConfigChange("oee_comparison", "monthWiseTarget", parseInt(e.target.value))}
                              className="pp1-target-slider"
                            />
                          </div>

                          <div className="pp1-target-field" style={{ marginBottom: "15px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Day Wise Target (%)</span>
                              <span className="pp1-target-field__val">{tempConfig.oee_comparison.dayWiseTarget ?? tempConfig.oee_comparison.minUtilization ?? 75}%</span>
                            </div>
                            <input
                              type="range" min="0" max="100"
                              value={tempConfig.oee_comparison.dayWiseTarget ?? tempConfig.oee_comparison.minUtilization ?? 75}
                              onChange={(e) => handleNestedTempConfigChange("oee_comparison", "dayWiseTarget", parseInt(e.target.value))}
                              className="pp1-target-slider"
                            />
                          </div>

                          <div className="pp1-target-field" style={{ marginBottom: "15px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Mac Wise Target (%)</span>
                              <span className="pp1-target-field__val">{tempConfig.oee_comparison.macWiseTarget ?? tempConfig.oee_comparison.minUtilization ?? 75}%</span>
                            </div>
                            <input
                              type="range" min="0" max="100"
                              value={tempConfig.oee_comparison.macWiseTarget ?? tempConfig.oee_comparison.minUtilization ?? 75}
                              onChange={(e) => handleNestedTempConfigChange("oee_comparison", "macWiseTarget", parseInt(e.target.value))}
                              className="pp1-target-slider"
                            />
                          </div>

                          <div className="pp1-target-field">
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Team Wise Target (%)</span>
                              <span className="pp1-target-field__val">{tempConfig.oee_comparison.teamWiseTarget ?? tempConfig.oee_comparison.minUtilization ?? 75}%</span>
                            </div>
                            <input
                              type="range" min="0" max="100"
                              value={tempConfig.oee_comparison.teamWiseTarget ?? tempConfig.oee_comparison.minUtilization ?? 75}
                              onChange={(e) => handleNestedTempConfigChange("oee_comparison", "teamWiseTarget", parseInt(e.target.value))}
                              className="pp1-target-slider"
                            />
                          </div>
                        </div>
                      )}

                      {activeTargetTab === "rejection" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">Rejection Target</h4>
                          <p className="pp1-target-settings__desc">Set maximum acceptable rejection rate threshold limit.</p>

                          <div className="pp1-target-field" style={{ marginBottom: "12px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Overall Rejection Target</span>
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

                          <div className="pp1-target-field" style={{ marginBottom: "12px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">In-House Rejection %</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0" max="100"
                                value={tempConfig.rejection.inHouseLimit ?? 1.0}
                                onChange={(e) => handleNestedTempConfigChange("rejection", "inHouseLimit", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">%</span>
                            </div>
                          </div>

                          <div className="pp1-target-field" style={{ marginBottom: "12px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Vendor Rejection %</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0" max="100"
                                value={tempConfig.rejection.vendorLimit ?? 1.2}
                                onChange={(e) => handleNestedTempConfigChange("rejection", "vendorLimit", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">%</span>
                            </div>
                          </div>

                          <div className="pp1-target-field" style={{ marginBottom: "12px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Final Inspection Rejection %</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0" max="100"
                                value={tempConfig.rejection.finalInspLimit ?? 1.5}
                                onChange={(e) => handleNestedTempConfigChange("rejection", "finalInspLimit", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">%</span>
                            </div>
                          </div>

                          <div className="pp1-target-field" style={{ marginBottom: "12px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Supplier Rejection %</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0" max="100"
                                value={tempConfig.rejection.supplierLimit ?? 0.5}
                                onChange={(e) => handleNestedTempConfigChange("rejection", "supplierLimit", parseFloat(e.target.value) || 0)}
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

                          <div className="pp1-target-field" style={{ marginBottom: "12px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Overall Rework Target</span>
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

                          <div className="pp1-target-field" style={{ marginBottom: "12px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">In-House Rework %</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0" max="100"
                                value={tempConfig.rework.inHouseLimit ?? 1.0}
                                onChange={(e) => handleNestedTempConfigChange("rework", "inHouseLimit", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">%</span>
                            </div>
                          </div>

                          <div className="pp1-target-field" style={{ marginBottom: "12px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Vendor Rework %</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0" max="100"
                                value={tempConfig.rework.jobOrderLimit ?? 1.2}
                                onChange={(e) => handleNestedTempConfigChange("rework", "jobOrderLimit", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">%</span>
                            </div>
                          </div>

                          <div className="pp1-target-field" style={{ marginBottom: "12px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Final Inspection Rework %</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0" max="100"
                                value={tempConfig.rework.finalInspLimit ?? 1.5}
                                onChange={(e) => handleNestedTempConfigChange("rework", "finalInspLimit", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">%</span>
                            </div>
                          </div>

                          <div className="pp1-target-field" style={{ marginBottom: "12px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Customer Rework %</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0" max="100"
                                value={tempConfig.rework.customerReworkLimit ?? 0.5}
                                onChange={(e) => handleNestedTempConfigChange("rework", "customerReworkLimit", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTargetTab === "efficiency" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">Efficiency Target</h4>
                          <p className="pp1-target-settings__desc">Set the target limits for Efficiency analysis by dimension.</p>

                          <div className="pp1-target-field" style={{ marginBottom: "15px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Month Wise Target (%)</span>
                              <span className="pp1-target-field__val">{tempConfig.efficiency?.monthWiseTarget ?? 80}%</span>
                            </div>
                            <input
                              type="range" min="0" max="100"
                              value={tempConfig.efficiency?.monthWiseTarget ?? 80}
                              onChange={(e) => handleNestedTempConfigChange("efficiency", "monthWiseTarget", parseInt(e.target.value))}
                              className="pp1-target-slider"
                            />
                          </div>

                          <div className="pp1-target-field" style={{ marginBottom: "15px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Day Wise Target (%)</span>
                              <span className="pp1-target-field__val">{tempConfig.efficiency?.dayWiseTarget ?? 80}%</span>
                            </div>
                            <input
                              type="range" min="0" max="100"
                              value={tempConfig.efficiency?.dayWiseTarget ?? 80}
                              onChange={(e) => handleNestedTempConfigChange("efficiency", "dayWiseTarget", parseInt(e.target.value))}
                              className="pp1-target-slider"
                            />
                          </div>

                          <div className="pp1-target-field" style={{ marginBottom: "15px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Mac Wise Target (%)</span>
                              <span className="pp1-target-field__val">{tempConfig.efficiency?.macWiseTarget ?? 80}%</span>
                            </div>
                            <input
                              type="range" min="0" max="100"
                              value={tempConfig.efficiency?.macWiseTarget ?? 80}
                              onChange={(e) => handleNestedTempConfigChange("efficiency", "macWiseTarget", parseInt(e.target.value))}
                              className="pp1-target-slider"
                            />
                          </div>

                          <div className="pp1-target-field" style={{ marginBottom: "15px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Team Wise Target (%)</span>
                              <span className="pp1-target-field__val">{tempConfig.efficiency?.teamWiseTarget ?? 80}%</span>
                            </div>
                            <input
                              type="range" min="0" max="100"
                              value={tempConfig.efficiency?.teamWiseTarget ?? 80}
                              onChange={(e) => handleNestedTempConfigChange("efficiency", "teamWiseTarget", parseInt(e.target.value))}
                              className="pp1-target-slider"
                            />
                          </div>
                        </div>
                      )}

                      {activeTargetTab === "production_analysis" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">Production Value Target</h4>
                          <p className="pp1-target-settings__desc">Set the minimum acceptable total production value target limit (Lakhs).</p>

                          <div className="pp1-target-field">
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Min Production Value Target</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0" max="1000"
                                value={tempConfig.production_analysis?.minProductionValue ?? 12.0}
                                onChange={(e) => handleNestedTempConfigChange("production_analysis", "minProductionValue", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">Lakhs</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTargetTab === "store_stock_value" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">Store Stock Value Target</h4>
                          <p className="pp1-target-settings__desc">Set the maximum acceptable store stock value target limit (Lakhs).</p>

                          <div className="pp1-target-field">
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Max Store Stock Value Target</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0" max="1000"
                                value={tempConfig.store_stock_value?.maxStockValueL ?? 50.0}
                                onChange={(e) => handleNestedTempConfigChange("store_stock_value", "maxStockValueL", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">Lakhs</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTargetTab === "otd" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">OTD Target</h4>
                          <p className="pp1-target-settings__desc">Set On-Time Delivery target percentage and trend limit.</p>

                          <div className="pp1-target-field" style={{ marginBottom: "15px" }}>
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Target Criteria (%)</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0" max="100"
                                value={tempConfig.otd?.targetPct ?? 90}
                                onChange={(e) => handleNestedTempConfigChange("otd", "targetPct", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">%</span>
                            </div>
                          </div>

                          <div className="pp1-target-field">
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Trend %</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0" max="100"
                                value={tempConfig.otd?.trendPct ?? 90}
                                onChange={(e) => handleNestedTempConfigChange("otd", "trendPct", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTargetTab === "supplier_rating" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">Supplier Rating Target</h4>
                          <p className="pp1-target-settings__desc">Set the minimum acceptable overall rating score limit for suppliers.</p>

                          <div className="pp1-target-field">
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Min Supplier Rating Target</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0" max="100"
                                value={tempConfig.supplier_rating?.minRating ?? 90}
                                onChange={(e) => handleNestedTempConfigChange("supplier_rating", "minRating", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTargetTab === "vendor_rating" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">Vendor Rating Target</h4>
                          <p className="pp1-target-settings__desc">Set the minimum acceptable overall rating score limit for vendors.</p>

                          <div className="pp1-target-field">
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Min Vendor Rating Target</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0" max="100"
                                value={tempConfig.vendor_rating?.minRating ?? 90}
                                onChange={(e) => handleNestedTempConfigChange("vendor_rating", "minRating", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTargetTab === "fg_value" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">FG Value Target</h4>
                          <p className="pp1-target-settings__desc">Set the maximum acceptable Finished Goods Value limit (in Lakhs).</p>

                          <div className="pp1-target-field">
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Max FG Value Limit (₹ Lakhs)</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0"
                                value={tempConfig.fg_value?.maxStockValueL ?? 60.0}
                                onChange={(e) => handleNestedTempConfigChange("fg_value", "maxStockValueL", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">L</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTargetTab === "daily_production" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">Daily Production Target</h4>
                          <p className="pp1-target-settings__desc">Set the maximum acceptable Balance Hours limit per machine.</p>

                          <div className="pp1-target-field">
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Max Balance Hours Limit</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.1" min="0"
                                value={tempConfig.daily_production?.maxBalanceHours ?? 4.0}
                                onChange={(e) => handleNestedTempConfigChange("daily_production", "maxBalanceHours", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">Hrs</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTargetTab === "target_vs_actual" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">Target Vs Actual Target</h4>
                          <p className="pp1-target-settings__desc">Set the minimum acceptable order fulfillment rate percentage.</p>

                          <div className="pp1-target-field">
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Min Fulfillment Rate (%)</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.5" min="0" max="100"
                                value={tempConfig.target_vs_actual?.minFulfillmentPct ?? 90.0}
                                onChange={(e) => handleNestedTempConfigChange("target_vs_actual", "minFulfillmentPct", parseFloat(e.target.value) || 0)}
                                className="pp1-target-input"
                              />
                              <span className="pp1-target-input-unit">%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTargetTab === "operator_efficiency" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">Operator Efficiency Target</h4>
                          <p className="pp1-target-settings__desc">Set the minimum acceptable operator efficiency percentage.</p>

                          <div className="pp1-target-field">
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Min Operator Efficiency (%)</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.5" min="0" max="100"
                                value={tempConfig.operator_efficiency?.minEfficiencyPct ?? 90.0}
                                onChange={(e) => handleNestedTempConfigChange("operator_efficiency", "minEfficiencyPct", parseFloat(e.target.value) || 0)}
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
              </div>,
              document.body
            )}
          </div>
        )}
      </div>

      <div className="pp1-main">
        <div
          className={`pp1-body${isStackedLayout ? " pp1-body--stacked" : ""}${panelsCollapsed ? " pp1-body--left-collapsed pp1-body--right-collapsed" : ""}`}
          style={sideColumnHeight ? { "--pp1-side-h": `${sideColumnHeight}px` } : undefined}
        >
          <section className={`pp1-panel pp1-panel--left${panelsCollapsed ? " pp1-panel--dl-collapsed" : ""}`}>
            {/* ── Collapsed state: icon only centered (DashboardLayout style) ── */}
            {panelsCollapsed && (
              <div className="pp1-dl-rail pp1-dl-rail--left">
                {/* Individual card icons stacked — DashboardLayout sidebar style */}
                <div className="pp1-dl-rail__items">
                  {ACTION_CARDS.filter(a => !getCardStatus(a.id).belowTarget).map((a) => {
                    const Ic = a.icon;
                    const active = selAction === a.id;
                    return (
                      <div
                        key={a.id}
                        className={`pp1-dl-rail__item${active ? " pp1-dl-rail__item--active" : ""}`}
                        style={{ "--rc": a.color }}
                        role="button"
                        tabIndex={0}
                        onClick={() => { handleActionClick(a.id); }}
                        onKeyDown={e => e.key === "Enter" && handleActionClick(a.id)}
                        onMouseEnter={e => setRailHover({ id: a.id, title: a.title, Icon: a.icon, color: a.color, rect: e.currentTarget.getBoundingClientRect(), side: "left" })}
                        onMouseLeave={() => setRailHover(null)}
                      >
                        <Ic size={16} />
                      </div>
                    );
                  })}
                </div>
                <button
                  className="pp1-dl-rail__expand-btn pp1-dl-rail__expand-btn--blue"
                  onClick={() => setPanelsCollapsed(false)}
                  title="Expand panels"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
            {/* ── Expanded state ── */}
            {!panelsCollapsed && (
              <>
                <div className="pp1-panel__head">
                  <div className="pp1-panel__header">
                    <ClipboardList size={16} style={{ color: "var(--pp1-blue)", flexShrink: 0 }} />
                    <h2 className="pp1-panel__title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Current Status
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#2563eb",
                        background: "rgba(37, 99, 235, 0.08)",
                        border: "1px solid rgba(37, 99, 235, 0.16)",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        lineHeight: 1.2
                      }}>
                        {ACTION_CARDS.filter(a => !getCardStatus(a.id).belowTarget).length}
                      </span>
                    </h2>
                    <button
                      className="pp1-panels-collapse-btn"
                      onClick={() => setPanelsCollapsed(true)}
                      title="Collapse both panels"
                    >
                      <PanelLeftClose size={14} />
                    </button>
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
                        title={computedCardTrends[a.id]?.message || ""}
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
                        <div className="pp1-ac-body" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span className="pp1-ac-title">{a.title}</span>
                          {(() => {
                            const targetLabel = getCardTargetLabel(a.id);
                            return targetLabel ? (
                              <span style={{ fontSize: "10px", color: "var(--pp1-text-3, #64748b)", fontWeight: 500, lineHeight: 1.25 }}>
                                {targetLabel}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        {(() => {
                          const ct = computedCardTrends[a.id];
                          return ct ? (
                            <span style={{
                              fontSize: "11px",
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

              </>
            )}
          </section>

          <section className="pp1-center" ref={centerRef}>
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
                    data={data}
                    loading={loading}
                    filters={purFilters}
                    onFilterChange={setPurFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                    trend={computedCardTrends["purchase_report_dashboard"]}
                  />
                ) : selectionId === "purchase_value_report_dashboard" ? (
                  <PurchaseValueDashboardView
                    filters={purchaseValueFilters}
                    onFilterChange={setPurchaseValueFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "sales_analysis_report_dashboard" ? (
                  <SalesAnalysisReportDashboardView
                    data={data}
                    loading={loading}
                    filters={salesFilters}
                    onFilterChange={setSalesFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                    trend={computedCardTrends["sales_analysis_report_dashboard"]}
                  />
                ) : selectionId === "production_analysis_report_dashboard" ? (
                  <ProductionAnalysisReportDashboardView
                    filters={prodFilters}
                    onFilterChange={setProdFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
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
                ) : selectionId === "oee_comparison_report_dashboard" ? (
                  <OeeComparisonReportDashboardView
                    filters={oeeCompFilters}
                    onFilterChange={setOeeCompFilters}
                    activeTab={oeeCompActiveTab}
                    onActiveTabChange={setOeeCompActiveTab}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                    xAxisGroup={oeeCompXAxisGroup}
                    setXAxisGroup={setOeeCompXAxisGroup}
                  />
                ) : selectionId === "efficiency_eff_report_dashboard" ? (
                  <EfficiencyEffReportDashboardView
                    filters={effFilters}
                    onFilterChange={setEffFilters}
                    xAxisGroup={effXAxisGroup}
                    setXAxisGroup={setEffXAxisGroup}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "rejection_report_dashboard" ? (
                  <RejectionReportDashboardView
                    filters={rejFilters}
                    onFilterChange={setRejFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "rework_report_dashboard" ? (
                  <ReworkReportDashboardView
                    filters={rewFilters}
                    onFilterChange={setRewFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                    xAxisGroup={reworkXAxisGroup}
                    setXAxisGroup={setReworkXAxisGroup}
                  />
                ) : selectionId === "store_stock_value_report_dashboard" ? (
                  <StoreStockValueReportDashboardView
                    filters={stockFilters}
                    onFilterChange={setStockFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "otd_report_dashboard" ? (
                  <OtdTrendView
                    data={data}
                    loading={loading}
                    uid={centerKey}
                    filters={otdFilters}
                    onFilterChange={setOtdFilters}
                    from={dateRange.from}
                    to={dateRange.to}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "supplier_rating_report_dashboard" ? (
                  <SupplierRatingReportDashboardView
                    filters={supplierFilters}
                    onFilterChange={setSupplierFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "vendor_rating_report_dashboard" ? (
                  <VendorRatingReportDashboardView
                    filters={vendorFilters}
                    onFilterChange={setVendorFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "fg_value_report_dashboard" ? (
                  <FgValueReportDashboardView
                    filters={fgFilters}
                    onFilterChange={setFgFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "daily_production_report_dashboard" ? (
                  <DailyProductionDashboardView
                    filters={dailyProductionFilters}
                    onFilterChange={setDailyProductionFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "target_vs_actual_report_dashboard" ? (
                  <TargetVsActualDashboardView
                    filters={targetVsActualFilters}
                    onFilterChange={setTargetVsActualFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "operator_efficiency_report_dashboard" ? (
                  <OperatorEfficiencyDashboardView
                    filters={operatorEfficiencyFilters}
                    onFilterChange={setOperatorEfficiencyFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    targetConfig={targetConfig}
                  />
                ) : selectionId === "capa_report_dashboard" ? (
                  <CapaDashboardView
                    filters={capaFilters}
                    onFilterChange={setCapaFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                    selectedCapaId={selectedCapaId}
                    onSelectCapaId={setSelectedCapaId}
                  />
                ) : selectionId === "customer_complaint_report_dashboard" ? (
                  <CustomerComplaintReportDashboardView
                    filters={compFilters}
                    onFilterChange={setCompFilters}
                    onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }}
                  />
                ) : (
                  <div className="pp1-placeholder-container" style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "420px",
                    padding: "40px",
                    textAlign: "center",
                    background: "rgba(255, 255, 255, 0.45)",
                    backdropFilter: "blur(20px)",
                    borderRadius: "16px",
                    border: "1px solid rgba(255, 255, 255, 0.6)",
                    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.04)"
                  }}>
                    <div style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "16px",
                      background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "16px",
                      boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.15)",
                      border: "1px solid rgba(59, 130, 246, 0.1)"
                    }}>
                      <BarChart2 size={28} style={{ color: "#3b82f6" }} />
                    </div>
                    <h3 style={{
                      fontSize: "14.5px",
                      fontWeight: 800,
                      color: "#1e3a8a",
                      margin: "0 0 6px 0",
                      letterSpacing: "-0.2px"
                    }}>
                      Plant Performance Analyzer
                    </h3>
                    <p style={{
                      fontSize: "11.5px",
                      color: "#64748b",
                      maxWidth: "320px",
                      margin: "0 0 20px 0",
                      lineHeight: "1.6",
                      fontWeight: 500
                    }}>
                      Select any status card on the left panel or action item on the right to load live metrics, trend analysis, and charts.
                    </p>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "5px 12px",
                      borderRadius: "20px",
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      fontSize: "10.5px",
                      fontWeight: 600,
                      color: "#1e40af"
                    }}>
                      <span className="pp1-pulse" style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#2563eb",
                        display: "inline-block"
                      }} />
                      System Operational & Ready
                    </div>
                  </div>
                )}
              </CenterTransitionWrapper>
            </div>
          </section>

          <section className={`pp1-panel pp1-panel--right${panelsCollapsed ? " pp1-panel--dl-collapsed" : ""}`}>
            {/* ── Collapsed state: icon only centered (DashboardLayout style) ── */}
            {panelsCollapsed && (
              <div className="pp1-dl-rail pp1-dl-rail--right">
                {/* Individual action item icons stacked — DashboardLayout sidebar style */}
                <div className="pp1-dl-rail__items">
                  {actionItems.map((item, idx) => {
                    const active = selAction === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`pp1-dl-rail__item pp1-dl-rail__item--right${active ? " pp1-dl-rail__item--active" : ""}`}
                        style={{ "--rc": item.color }}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleActionClick(item.id)}
                        onKeyDown={e => e.key === "Enter" && handleActionClick(item.id)}
                        onMouseEnter={e => setRailHover({ id: item.id, title: item.title, Icon: AlertTriangle, color: item.color, rect: e.currentTarget.getBoundingClientRect(), side: "right" })}
                        onMouseLeave={() => setRailHover(null)}
                      >
                        <AlertTriangle size={16} />
                      </div>
                    );
                  })}
                </div>
                <button
                  className="pp1-dl-rail__expand-btn pp1-dl-rail__expand-btn--amber"
                  onClick={() => setPanelsCollapsed(false)}
                  title="Expand panels"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            )}
            {/* ── Expanded state ── */}
            {!panelsCollapsed && (
              <>
                <div className="pp1-panel__head">
                  <div className="pp1-panel__header">
                    <ListTodo size={16} style={{ color: "var(--pp1-amber)", flexShrink: 0 }} />
                    <h2 className="pp1-panel__title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Action to be Taken
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#ef4444",
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.16)",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        lineHeight: 1.2
                      }}>
                        {actionItems.length}
                      </span>
                    </h2>
                    <button
                      className="pp1-panels-collapse-btn"
                      onClick={() => setPanelsCollapsed(true)}
                      title="Collapse both panels"
                    >
                      <PanelRightClose size={14} />
                    </button>
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
                          title={item.message || ""}
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
                            {(() => {
                              const targetLabel = getCardTargetLabel(item.id);
                              return targetLabel ? (
                                <span style={{ fontSize: "10px", color: "var(--pp1-text-3, #64748b)", fontWeight: 500, lineHeight: 1.25, marginBottom: "2px" }}>
                                  {targetLabel}
                                </span>
                              ) : null;
                            })()}
                            <span style={{ fontSize: "10px", color: "var(--pp1-text-3)", lineHeight: "1.3" }}>
                              {item.message}
                            </span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", marginLeft: "6px", flexShrink: 0 }}>
                            {item.trend && (
                              <span style={{
                                fontSize: "11px",
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

              </>
            )}
          </section>
        </div>

        {/* ── Rail hover card portal ─────────────────────────── */}
        {railHover && createPortal(
          <div
            className={`pp1-rail-hover-card${railHover.side === "right" ? " pp1-rail-hover-card--right" : ""}`}
            style={{
              position: "fixed",
              top: railHover.rect.top + railHover.rect.height / 2,
              ...(railHover.side === "left"
                ? { left: railHover.rect.right + 14 }
                : { right: window.innerWidth - railHover.rect.left + 14 }),
              transform: "translateY(-50%)",
              zIndex: 99999,
              "--hc": railHover.color,
            }}
          >
            {railHover.side === "left" && <div className="pp1-rail-hover-card__arrow pp1-rail-hover-card__arrow--left" />}
            <div className="pp1-rail-hover-card__icon">
              <railHover.Icon size={18} style={{ color: railHover.color }} />
            </div>
            <span className="pp1-rail-hover-card__title">{railHover.title}</span>
            {railHover.side === "right" && <div className="pp1-rail-hover-card__arrow pp1-rail-hover-card__arrow--right" />}
          </div>,
          document.body
        )}

        {selectionId === "customer_po_vs_sales_analysis" ? (
          <CustomerPoCompareBottomTable
            data={data}
            loading={loading}
            uid={`bot-pocomp-${centerKey}`}
            filters={poFilters}
            showTargetOnly={poShowTargetOnly}
            targetConfig={targetConfig}
          />
        ) : selectionId === "purchase_report_dashboard" ? (
          <PurchaseReportBottomTable data={data} loading={loading} filters={purFilters} />
        ) : selectionId === "purchase_value_report_dashboard" ? (
          <PurchaseValueBottomTable filters={purchaseValueFilters} />
        ) : selectionId === "sales_analysis_report_dashboard" ? (
          <SalesAnalysisReportBottomTable data={data} loading={loading} filters={salesFilters} />
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
        ) : selectionId === "oee_comparison_report_dashboard" ? (
          <OeeComparisonReportBottomTable filters={oeeCompFilters} xAxisGroup={oeeCompXAxisGroup} />
        ) : selectionId === "efficiency_eff_report_dashboard" ? (
          <EfficiencyEffReportBottomTable filters={effFilters} xAxisGroup={effXAxisGroup} />
        ) : selectionId === "rejection_report_dashboard" ? (
          <RejectionReportBottomTable filters={rejFilters} />
        ) : selectionId === "rework_report_dashboard" ? (
          <ReworkReportBottomTable filters={rewFilters} xAxisGroup={reworkXAxisGroup} />
        ) : selectionId === "store_stock_value_report_dashboard" ? (
          <StoreStockValueReportBottomTable filters={stockFilters} />
        ) : selectionId === "otd_report_dashboard" ? (
          <OtdReportBottomTable filters={otdFilters} />
        ) : selectionId === "supplier_rating_report_dashboard" ? (
          <SupplierRatingBottomTable filters={supplierFilters} />
        ) : selectionId === "vendor_rating_report_dashboard" ? (
          <VendorRatingBottomTable filters={vendorFilters} />
        ) : selectionId === "fg_value_report_dashboard" ? (
          <FgValueReportBottomTable filters={fgFilters} />
        ) : selectionId === "daily_production_report_dashboard" ? (
          <DailyProductionBottomTable filters={dailyProductionFilters} targetConfig={targetConfig} />
        ) : selectionId === "target_vs_actual_report_dashboard" ? (
          <TargetVsActualBottomTable filters={targetVsActualFilters} targetConfig={targetConfig} />
        ) : selectionId === "operator_efficiency_report_dashboard" ? (
          <OperatorEfficiencyBottomTable filters={operatorEfficiencyFilters} targetConfig={targetConfig} />
        ) : selectionId === "capa_report_dashboard" ? (
          <CapaBottomTable filters={capaFilters} selectedCapaId={selectedCapaId} onSelectCapaId={setSelectedCapaId} />
        ) : selectionId === "customer_complaint_report_dashboard" ? (
          <CustomerComplaintReportBottomTable filters={compFilters} />
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
