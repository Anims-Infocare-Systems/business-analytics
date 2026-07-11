import { useEffect, useMemo, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { resolveApiBase } from "../../apiBase";
import {
  IndianRupee,
  Building2,
  Package,
  Trophy,
  Scale,
  TrendingUp,
  TrendingDown,
  Info,
  AlertTriangle,
  Calendar,
  FileText,
  Lightbulb,
  Pin,
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Link,
  Inbox,
  Filter,
  Check,
  Download,
  X
} from "lucide-react";
import "./SalesAnalysis.css";
import SalesAnalysisDatePicker from "./SalesAnalysisDatePicker";

Chart.register(...registerables, ChartDataLabels);

const API_BASE = resolveApiBase();

function toIsoDate(d) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatRupees(rupees) {
  const amount = Number(rupees);
  if (!Number.isFinite(amount)) return "—";
  return amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatQty(qty) {
  const n = Number(qty);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatLakhs(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n)) return "—";
  return `${(n / 100_000).toFixed(2)}L`;
}

/** Y-axis tick label: rupees → ₹X.XXL */
function formatAxisLakhs(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n)) return "";
  return `₹${(n / 100_000).toFixed(2)}L`;
}

/** Tooltip: full rupees + lakhs */
function formatTooltipLakhs(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })} (${formatLakhs(n)})`;
}

function getMonthYearMap(from, to) {
  const map = {};
  if (!from || !to) return map;
  const start = new Date(from);
  const end = new Date(to);
  let curr = new Date(start.getFullYear(), start.getMonth(), 1);
  const limit = new Date(end.getFullYear(), end.getMonth(), 1);
  let count = 0;
  while (curr <= limit && count < 100) {
    const monthName = curr.toLocaleString("en-US", { month: "long" });
    const monthShort = curr.toLocaleString("en-US", { month: "short" });
    const year2Digit = String(curr.getFullYear()).slice(-2);
    map[monthName.toLowerCase()] = year2Digit;
    map[monthShort.toLowerCase()] = year2Digit;
    curr.setMonth(curr.getMonth() + 1);
    count++;
  }
  return map;
}

function formatLabelWithYear(label, map) {
  if (!label) return label;
  const labelStr = String(label);
  const lowerLabel = labelStr.toLowerCase();
  for (const [month, year] of Object.entries(map)) {
    if (lowerLabel.includes(month)) {
      if (labelStr.includes("-") && /\d{2}$/.test(labelStr)) {
        return labelStr;
      }
      return `${labelStr}-${year}`;
    }
  }
  return labelStr;
}

function formatRate(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatInvDate(iso) {
  if (!iso) return "—";
  const parts = String(iso).slice(0, 10).split("-");
  if (parts.length !== 3) return iso;
  return `${parts[1]}/${parts[2]}/${parts[0]}`; // MM/DD/YYYY
}

function formatToMmDdYyyy(dateStr) {
  if (!dateStr || dateStr === "—" || dateStr === "-") return dateStr;
  const s = String(dateStr).trim();

  // Case 1: Parentheses with slash date, e.g. "INV-260192 (15/06/2026)"
  if (s.includes("(")) {
    return s.replace(/\((\d{2})\/(\d{2})\/(\d{4})\)/, "($2/$1/$3)");
  }

  // Case 2: ISO Date, e.g. "2026-05-10"
  if (s.includes("-")) {
    const parts = s.slice(0, 10).split("-");
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
  }

  // Case 3: DD/MM/YYYY slash date, e.g. "12/06/2026"
  if (s.includes("/")) {
    const parts = s.split("/");
    if (parts.length === 3) {
      return `${parts[1]}/${parts[0]}/${parts[2]}`;
    }
  }

  return dateStr;
}

const KPI_CARD_META = [
  { icon: IndianRupee, iconColor: "#2d6de8", label: "Total Sales Value" },
  { icon: Building2, iconColor: "#06b6d4", label: "Active Customers" },
  { icon: Package, iconColor: "#10b981", label: "Top Product Revenue" },
  { icon: Trophy, iconColor: "#f97316", label: "Top Customer" },
  { icon: Scale, iconColor: "#8b5cf6", label: "Avg Selling Rate" },
];

function buildKpiCards(summary) {
  if (!summary) {
    return KPI_CARD_META.map(m => ({
      ...m,
      value: "—",
      sub: "—",
      trend: "—",
      type: "neutral",
    }));
  }
  return [
    {
      ...KPI_CARD_META[0],
      value: `₹${formatLakhs(summary.grand_total)}`,
      sub: summary.period ?? "—",
      trend: `${summary.total_invoices ?? 0} invoices`,
      type: "neutral",
    },
    {
      ...KPI_CARD_META[1],
      value: String(summary.active_customers ?? summary.customers ?? 0),
      sub: `${summary.total_invoices ?? 0} invoices raised`,
      trend: `${summary.repeat_buyers ?? 0} repeat buyers`,
      type: "neutral",
    },
    {
      ...KPI_CARD_META[2],
      value: `₹${formatLakhs(summary.top_product_revenue)}`,
      sub: summary.top_product_name || "—",
      trend: `${summary.top_product_pct ?? 0}% of total`,
      type: "up",
    },
    {
      ...KPI_CARD_META[3],
      value: `₹${formatLakhs(summary.top_customer_revenue)}`,
      sub: summary.top_customer_name || "—",
      trend: `${summary.top_customer_pct ?? 0}% share`,
      type: "up",
    },
    {
      ...KPI_CARD_META[4],
      value: `₹${formatRate(summary.avg_selling_rate)}`,
      sub: "Per unit (blended)",
      trend: summary.total_qty_sold
        ? `${formatQty(summary.total_qty_sold)} units sold`
        : "—",
      type: "neutral",
    },
  ];
}

/* ─────────────────────────────────────────────
   Static Data
───────────────────────────────────────────── */

const RANK_BAR_COLORS = ["#2d6de8", "#10b981", "#f97316", "#8b5cf6", "#94a3b8"];

function buildCustomerRanking(rows) {
  if (!rows?.length) return [];
  const maxRev = rows[0]?.revenue || 1;
  return rows.map((c, i) => ({
    name: c.name,
    barW: `${Math.max(8, Math.round((c.revenue / maxRev) * 100))}%`,
    color: RANK_BAR_COLORS[i % RANK_BAR_COLORS.length],
    amount: `₹${Number(c.revenue_lakhs).toFixed(2)}L`,
    pct: `${c.pct}%`,
  }));
}

function buildTopProducts(rows) {
  if (!rows?.length) return [];
  const maxRev = rows[0]?.revenue || 1;
  return rows.map((p, i) => ({
    name: p.description || p.part_no || "—",
    code: p.part_no || "—",
    barW: `${Math.max(8, Math.round((p.revenue / maxRev) * 100))}%`,
    color: RANK_BAR_COLORS[i % RANK_BAR_COLORS.length],
    qty: p.uom ? `${formatQty(p.qty)} ${p.uom}` : formatQty(p.qty),
    amount: `₹${Number(p.revenue_lakhs).toFixed(2)}L`,
  }));
}

const INSIGHTS = [
  { icon: Info, iconColor: "#15803d", title: "Vasanthi Foundry drives majority revenue", sub: "52.6% of total sales (₹4.93L) — single-customer dependency. Explore deeper engagement.", val: "₹4.93L", valColor: "#15803d" },
  { icon: TrendingDown, iconColor: "#92400e", title: "February sales down vs January", sub: "Feb ₹3.23L vs Jan ₹6.15L (↓47.5%). Investigate order pipeline drop.", val: "↓47.5%", valColor: "#92400e" },
  { icon: Package, iconColor: "#1d4ed8", title: "Segment Carrier is top revenue product", sub: "₹3.82L (40.7%) — capacity planning and raw material stocking should prioritize this.", val: "40.7%", valColor: "#1d4ed8" },
  { icon: TrendingUp, iconColor: "#c2410c", title: "VR Foundries showing growth potential", sub: "7 line items, diverse mix. Target to grow from 20.6% to 30% share by Q2.", val: "20.6%", valColor: "#c2410c" },
  { icon: AlertTriangle, iconColor: "#b91c1c", title: "SS Round Bar — low realisation rate", sub: "₹2.50/unit on 19,555 units = ₹49K only. Review pricing strategy for this product.", val: "₹2.50", valColor: "#b91c1c" },
];

const TREND_CHART_OPTS = (font, maxValue = 0) => {
  const yMax = maxValue > 0 ? Math.ceil(maxValue * 1.35) : undefined;
  const axisLakhsTick = v => formatAxisLakhs(v);
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: { font: { size: 11, weight: "600", family: font }, boxWidth: 12, padding: 14 },
      },
      tooltip: {
        callbacks: {
          label(ctx) {
            const val = ctx.parsed.y ?? 0;
            return `${ctx.dataset.label}: ${formatTooltipLakhs(val)}`;
          },
        },
      },
      datalabels: {
        display: (context) => {
          return context.dataset.datalabels?.display ?? false;
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: yMax,
        grid: { color: "rgba(45,109,232,0.07)" },
        ticks: { font: { size: 10, family: font }, callback: axisLakhsTick },
        border: { display: false },
        title: { display: true, text: "Lakhs (₹)", font: { size: 10, family: font } },
      },
      y1: {
        position: "right",
        beginAtZero: true,
        max: yMax,
        grid: { display: false },
        ticks: { font: { size: 10, family: font }, callback: axisLakhsTick },
        border: { display: false },
        title: { display: true, text: "Cumulative (L)", font: { size: 10, family: font } },
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 9, family: font },
          autoSkip: true,
          maxTicksLimit: 8,
          maxRotation: 0,
          minRotation: 0
        },
        border: { display: false },
      },
    },
  };
};

function buildWeeklyTrendChartData(trend) {
  const labels = trend?.labels ?? [];
  const sales = trend?.sales ?? [];
  const cumulative = trend?.cumulative ?? [];
  const peak = Math.max(0, ...sales, ...cumulative);
  return {
    labels,
    peak,
    datasets: [
      {
        label: "Weekly sales",
        data: sales,
        backgroundColor: "rgba(45, 109, 232, 0.85)",
        borderColor: "#2d6de8",
        borderWidth: 1.5,
        borderRadius: 4,
        type: "bar",
        yAxisID: "y",
        datalabels: {
          display: true,
          align: "top",
          anchor: "end",
          offset: 6,
          formatter: (value) => {
            if (!value || value < 10_000) return "";
            if (value >= 100_000) {
              return `₹${(value / 100_000).toFixed(1)}L`;
            }
            return `₹${(value / 1000).toFixed(0)}K`;
          },
          font: {
            size: 9,
            weight: "700",
            family: "Inter"
          },
          color: "#ffffff",
          backgroundColor: "#2d6de8",
          borderRadius: 4,
          padding: { top: 3, bottom: 3, left: 5, right: 5 }
        }
      },
      {
        label: "Cumulative",
        data: cumulative,
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.04)",
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        type: "line",
        yAxisID: "y1",
        datalabels: {
          display: false
        }
      },
    ],
  };
}

const GRADIENTS_CUSTOMER = [
  { start: "#2d6de8", end: "#1e40af" }, // Royal Blue to Dark Blue
  { start: "#f97316", end: "#c2410c" }, // Orange to Dark Orange
  { start: "#10b981", end: "#047857" }, // Emerald to Dark Green
  { start: "#8b5cf6", end: "#6d28d9" }, // Violet to Purple
  { start: "#64748b", end: "#475569" }, // Slate Gray to Dark Gray
];

const GRADIENTS_PRODUCT = [
  { start: "#2d6de8", end: "#1d4ed8" }, // Blue
  { start: "#10b981", end: "#047857" }, // Emerald
  { start: "#f97316", end: "#c2410c" }, // Orange
  { start: "#8b5cf6", end: "#6d28d9" }, // Violet
  { start: "#ef4444", end: "#b91c1c" }, // Red
];

const DONUT_CHART_OPTS = (font, onHoverCallback) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      titleFont: { family: font, size: 12, weight: "700" },
      bodyFont: { family: font, size: 11 },
      padding: 10,
      cornerRadius: 8,
      displayColors: true,
      borderColor: "rgba(255, 255, 255, 0.1)",
      borderWidth: 1,
      callbacks: {
        label(ctx) {
          const pct = ctx.parsed ?? 0;
          return ` ${ctx.label}: ${pct}%`;
        },
      },
    },
    datalabels: {
      display: false
    }
  },
  cutout: "75%",
  onHover: onHoverCallback,
});

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
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
  try { sessionStorage.setItem(key, JSON.stringify(data)); } catch { }
}

const MOCK_PROJECTIONS = [
  { customer: "Coromandel International Limited", month: "July 2026", pos: 12, totQty: 4500, totAmt: 8500000, schdMonth: "July 2026", schdQty: 4500, dispQty: 3200, pendQty: 1300, pendVal: 2450000 },
  { customer: "Shanthi Gears Limited", month: "July 2026", pos: 8, totQty: 2800, totAmt: 5400000, schdMonth: "July 2026", schdQty: 2800, dispQty: 2500, pendQty: 300, pendVal: 580000 },
  { customer: "Canara India Private Limited", month: "August 2026", pos: 15, totQty: 6200, totAmt: 12500000, schdMonth: "August 2026", schdQty: 6200, dispQty: 4800, pendQty: 1400, pendVal: 2820000 },
  { customer: "STI Digital Ltd", month: "July 2026", pos: 6, totQty: 1900, totAmt: 3200000, schdMonth: "July 2026", schdQty: 1900, dispQty: 1900, pendQty: 0, pendVal: 0 },
  { customer: "Vasanthi Foundry", month: "August 2026", pos: 9, totQty: 3100, totAmt: 6100000, schdMonth: "August 2026", schdQty: 3100, dispQty: 2200, pendQty: 900, pendVal: 1770000 },
  { customer: "VR Foundries", month: "September 2026", pos: 7, totQty: 2400, totAmt: 4800000, schdMonth: "September 2026", schdQty: 2400, dispQty: 1800, pendQty: 600, pendVal: 1200000 },
];

const MOCK_TRACEABILITY = [
  { rcNo: "RC-2026-0891", customer: "Coromandel International Limited", dcNo: "DC/26/1029", dcDate: "12/06/2026", grnPo: "PO-45001272", invNo: "INV-260192", invDate: "15/06/2026" },
  { rcNo: "RC-2026-0892", customer: "Shanthi Gears Limited", dcNo: "DC/26/1030", dcDate: "13/06/2026", grnPo: "PO-45001289", invNo: "INV-260193", invDate: "15/06/2026" },
  { rcNo: "RC-2026-0893", customer: "Canara India Private Limited", dcNo: "DC/26/1031", dcDate: "14/06/2026", grnPo: "PO-45001301", invNo: "INV-260194", invDate: "16/06/2026" },
  { rcNo: "RC-2026-0894", customer: "STI Digital Ltd", dcNo: "DC/26/1032", dcDate: "14/06/2026", grnPo: "PO-45001312", invNo: "INV-260195", invDate: "16/06/2026" },
  { rcNo: "RC-2026-0895", customer: "Vasanthi Foundry", dcNo: "DC/26/1033", dcDate: "15/06/2026", grnPo: "PO-45001322", invNo: "INV-260196", invDate: "17/06/2026" },
  { rcNo: "RC-2026-0896", customer: "VR Foundries", dcNo: "DC/26/1034", dcDate: "15/06/2026", grnPo: "PO-45001344", invNo: "INV-260197", invDate: "17/06/2026" },
];

const MOCK_PO_LEDGER = [
  {
    type: "With Material",
    apoNo: "APO-26-0101",
    poNo: "PO-45001272",
    poDate: "2026-05-10",
    custName: "Coromandel International Limited",
    partDesc: "TD09020721 - Standard Shaft Pin",
    poSlNo: 10,
    qty: 1500,
    shortCloseQty: 0,
    rate: 450,
    dcNo: "DC/26/1029",
    dcDate: "26/06/2026",
    dcQty: 1200,
    invNoDt: "INV-260192 (15/06/2026)"
  },
  {
    type: "Labour Charges",
    apoNo: "APO-26-0102",
    poNo: "PO-45001289",
    poDate: "2026-05-15",
    custName: "Shanthi Gears Limited",
    partDesc: "TD09020725 - Custom Gear Sleeve",
    poSlNo: 20,
    qty: 800,
    shortCloseQty: 50,
    rate: 1200,
    dcNo: "DC/26/1030",
    dcDate: "27/06/2026",
    dcQty: 750,
    invNoDt: "INV-260193 (15/06/2026)"
  },
  {
    type: "With Material",
    apoNo: "APO-26-0103",
    poNo: "PO-45001301",
    poDate: "2026-05-20",
    custName: "Canara India Private Limited",
    partDesc: "OA-95-041VX - Support Bracket",
    poSlNo: 10,
    qty: 2500,
    shortCloseQty: 0,
    rate: 350,
    dcNo: "DC/26/1031",
    dcDate: "28/06/2026",
    dcQty: 2500,
    invNoDt: "INV-260194 (16/06/2026)"
  },
  {
    type: "General / Rework",
    apoNo: "APO-26-0104",
    poNo: "PO-45001312",
    poDate: "2026-05-22",
    custName: "STI Digital Ltd",
    partDesc: "TD09020802 - Rework Roller",
    poSlNo: 10,
    qty: 300,
    shortCloseQty: 0,
    rate: 950,
    dcNo: "DC/26/1032",
    dcDate: "28/06/2026",
    dcQty: 300,
    invNoDt: "INV-260195 (16/06/2026)"
  },
  {
    type: "With Material",
    apoNo: "APO-26-0105",
    poNo: "PO-45001322",
    poDate: "2026-05-25",
    custName: "Vasanthi Foundry",
    partDesc: "CC004AS5 - Heavy Casting Block",
    poSlNo: 30,
    qty: 1200,
    shortCloseQty: 100,
    rate: 1800,
    dcNo: "DC/26/1033",
    dcDate: "29/06/2026",
    dcQty: 800,
    invNoDt: "INV-260196 (17/06/2026)"
  },
  {
    type: "With Material",
    apoNo: "APO-26-0106",
    poNo: "PO-45001344",
    poDate: "2026-05-28",
    custName: "VR Foundries",
    partDesc: "TD09020721 - Connecting Flange",
    poSlNo: 10,
    qty: 900,
    shortCloseQty: 0,
    rate: 650,
    dcNo: "DC/26/1034",
    dcDate: "29/06/2026",
    dcQty: 600,
    invNoDt: "INV-260197 (17/06/2026)"
  },
  {
    type: "Labour Charges",
    apoNo: "APO-26-0107",
    poNo: "PO-45001355",
    poDate: "2026-06-01",
    custName: "Coromandel International Limited",
    partDesc: "TD09020725 - Threaded Pin 15mm",
    poSlNo: 40,
    qty: 2000,
    shortCloseQty: 0,
    rate: 150,
    dcNo: "DC/26/1045",
    dcDate: "30/06/2026",
    dcQty: 1500,
    invNoDt: "INV-260210 (22/06/2026)"
  },
  {
    type: "With Material",
    apoNo: "APO-26-0108",
    poNo: "PO-45001360",
    poDate: "2026-06-05",
    custName: "Vasanthi Foundry",
    partDesc: "OA-95-041VX - Adapter Bracket",
    poSlNo: 20,
    qty: 500,
    shortCloseQty: 0,
    rate: 2200,
    dcNo: "—",
    dcDate: "—",
    dcQty: 0,
    invNoDt: "—"
  },
  {
    type: "Export Only",
    apoNo: "APO-26-0109",
    poNo: "PO-EXP-8902",
    poDate: "2026-06-10",
    custName: "Canara India Private Limited",
    partDesc: "CC004AS5 - Export Hub Block",
    poSlNo: 30,
    qty: 600,
    shortCloseQty: 0,
    rate: 3400,
    dcNo: "DC/26/1058",
    dcDate: "02/07/2026",
    dcQty: 400,
    invNoDt: "INV-260233 (27/06/2026)"
  },
  {
    type: "With Material",
    apoNo: "APO-26-0110",
    poNo: "PO-45001399",
    poDate: "2026-06-12",
    custName: "Shanthi Gears Limited",
    partDesc: "TD09020802 - Spacer ring 85mm",
    poSlNo: 50,
    qty: 1500,
    shortCloseQty: 200,
    rate: 280,
    dcNo: "—",
    dcDate: "—",
    dcQty: 0,
    invNoDt: "—"
  }
];

const MOCK_PLAN_VS_ACTUAL = [
  {
    date: "2026-06-01",
    customer: "Coromandel International Limited",
    partNoDesc: "TD09020721 - Standard Shaft Pin",
    planQty: 2000,
    availableQty: 1800,
    dispatchQty: 1500,
  },
  {
    date: "2026-06-05",
    customer: "Shanthi Gears Limited",
    partNoDesc: "TD09020725 - Custom Gear Sleeve",
    planQty: 1000,
    availableQty: 1000,
    dispatchQty: 1000,
  },
  {
    date: "2026-06-10",
    customer: "Canara India Private Limited",
    partNoDesc: "OA-95-041VX - Support Bracket",
    planQty: 3000,
    availableQty: 2500,
    dispatchQty: 2500,
  },
  {
    date: "2026-06-15",
    customer: "STI Digital Ltd",
    partNoDesc: "TD09020802 - Rework Roller",
    planQty: 500,
    availableQty: 450,
    dispatchQty: 300,
  },
  {
    date: "2026-06-20",
    customer: "Vasanthi Foundry",
    partNoDesc: "CC004AS5 - Heavy Casting Block",
    planQty: 1500,
    availableQty: 1200,
    dispatchQty: 900,
  },
  {
    date: "2026-06-25",
    customer: "VR Foundries",
    partNoDesc: "TD09020721 - Connecting Flange",
    planQty: 800,
    availableQty: 800,
    dispatchQty: 800,
  },
  {
    date: "2026-07-02",
    customer: "Coromandel International Limited",
    partNoDesc: "TD09020725 - Threaded Pin 15mm",
    planQty: 1200,
    availableQty: 1200,
    dispatchQty: 600,
  },
  {
    date: "2026-07-04",
    customer: "Vasanthi Foundry",
    partNoDesc: "OA-95-041VX - Adapter Bracket",
    planQty: 600,
    availableQty: 500,
    dispatchQty: 0,
  },
  {
    date: "2026-07-06",
    customer: "Canara India Private Limited",
    partNoDesc: "CC004AS5 - Export Hub Block",
    planQty: 1800,
    availableQty: 1800,
    dispatchQty: 1800,
  },
  {
    date: "2026-07-10",
    customer: "Shanthi Gears Limited",
    partNoDesc: "TD09020802 - Spacer ring 85mm",
    planQty: 1600,
    availableQty: 1400,
    dispatchQty: 1200,
  }
];

export default function SalesAnalysis() {
  const _dflt = { from: new Date(2026, 0, 1), to: new Date(2026, 1, 28) };
  const _saved = readFilterSession("ba_filter_sales", _dflt);
  const [dateRange, setDateRange] = useState({ from: _saved.from, to: _saved.to });
  const [filters, setFilters] = useState({
    customer: "All Customers",
    product: "All Products",
    salesGroup: "Sales Group",
    rejection: "No",
  });
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [weeklyTrend, setWeeklyTrend] = useState(null);
  const [revenueCharts, setRevenueCharts] = useState(null);
  const [monthSummary, setMonthSummary] = useState(null);
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [invoiceBtypes, setInvoiceBtypes] = useState([]);
  const [invoiceBtype, setInvoiceBtype] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef(null);
  const [customerFocusedIndex, setCustomerFocusedIndex] = useState(-1);
  const [hoveredCustIndex, setHoveredCustIndex] = useState(-1);
  const [hoveredProdIndex, setHoveredProdIndex] = useState(-1);
  const [poSearchQuery, setPoSearchQuery] = useState("");
  const [poSortField, setPoSortField] = useState("poDate");
  const [poSortAsc, setPoSortAsc] = useState(false);
  const [projSortField, setProjSortField] = useState("customer");
  const [projSortAsc, setProjSortAsc] = useState(true);
  const [planSortField, setPlanSortField] = useState("date");
  const [planSortAsc, setPlanSortAsc] = useState(true);
  const [poPage, setPoPage] = useState(1);
  const [poPendingOnly, setPoPendingOnly] = useState(false);
  const [performanceChartType, setPerformanceChartType] = useState("bar");
  const [weeklyChartType, setWeeklyChartType] = useState("combo");
  const [customerSearch, setCustomerSearch] = useState("");
  const [planSearchQuery, setPlanSearchQuery] = useState("");

  const customerOptions = useMemo(() => {
    const customers = new Set();
    invoiceRows.forEach((r) => {
      if (r.customer && r.customer !== "—" && r.customer !== "") {
        customers.add(r.customer);
      }
    });
    return Array.from(customers).sort();
  }, [invoiceRows]);

  const filteredCustomerOptions = useMemo(() => {
    if (!customerSearch) return customerOptions;
    return customerOptions.filter((c) =>
      c.toLowerCase().includes(customerSearch.toLowerCase())
    );
  }, [customerOptions, customerSearch]);

  const [topProductsRaw, setTopProductsRaw] = useState(null);
  const [monthlyTrendData, setMonthlyTrendData] = useState(null);
  const monthlyAvg = useMemo(() => {
    if (!monthlyTrendData?.sales_values_lakhs?.length) return 0;
    const vals = monthlyTrendData.sales_values_lakhs;
    const sum = vals.reduce((s, v) => s + v, 0);
    return sum / vals.length;
  }, [monthlyTrendData]);
  const [billTypeRevenueData, setBillTypeRevenueData] = useState(null);
  const [monthlyTaxData, setMonthlyTaxData] = useState(null);
  const [invoiceDropdownOpen, setInvoiceDropdownOpen] = useState(false);
  const invoiceDropdownRef = useRef(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const optionsList = useMemo(() => ["", ...invoiceBtypes], [invoiceBtypes]);
  const projectionTotals = useMemo(() => {
    return MOCK_PROJECTIONS.reduce(
      (acc, row) => {
        acc.pos += row.pos;
        acc.totQty += row.totQty;
        acc.totAmt += row.totAmt;
        acc.schdQty += row.schdQty;
        acc.dispQty += row.dispQty;
        acc.pendQty += row.pendQty;
        acc.pendVal += row.pendVal;
        return acc;
      },
      { pos: 0, totQty: 0, totAmt: 0, schdQty: 0, dispQty: 0, pendQty: 0, pendVal: 0 }
    );
  }, []);

  const processedPoLedger = useMemo(() => {
    return MOCK_PO_LEDGER.map((row) => {
      const value = row.qty * row.rate;
      const pendingQty = Math.max(0, row.qty - row.dcQty - row.shortCloseQty);
      const pendingValue = pendingQty * row.rate;

      let ageDays = 0;
      if (row.poDate) {
        const poDate = new Date(row.poDate);
        const refDate = new Date("2026-07-06");
        const diffTime = refDate - poDate;
        ageDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      }

      return {
        ...row,
        value,
        pendingQty,
        pendingValue,
        ageDays
      };
    });
  }, []);

  const filteredPoLedger = useMemo(() => {
    return processedPoLedger.filter((row) => {
      if (poPendingOnly && row.pendingQty <= 0) return false;
      const q = poSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        row.poNo.toLowerCase().includes(q) ||
        row.custName.toLowerCase().includes(q) ||
        row.partDesc.toLowerCase().includes(q) ||
        row.apoNo.toLowerCase().includes(q) ||
        (row.dcNo && row.dcNo.toLowerCase().includes(q))
      );
    });
  }, [processedPoLedger, poSearchQuery, poPendingOnly]);

  const sortedPoLedger = useMemo(() => {
    const sorted = [...filteredPoLedger];
    sorted.sort((a, b) => {
      let valA = a[poSortField];
      let valB = b[poSortField];

      if (typeof valA === "number" && typeof valB === "number") {
        return poSortAsc ? valA - valB : valB - valA;
      }

      valA = String(valA || "").toLowerCase();
      valB = String(valB || "").toLowerCase();

      if (valA < valB) return poSortAsc ? -1 : 1;
      if (valA > valB) return poSortAsc ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredPoLedger, poSortField, poSortAsc]);

  const poPageSize = 5;
  const totalPoPages = Math.ceil(sortedPoLedger.length / poPageSize) || 1;
  const paginatedPoLedger = useMemo(() => {
    const start = (poPage - 1) * poPageSize;
    return sortedPoLedger.slice(start, start + poPageSize);
  }, [sortedPoLedger, poPage]);

  useEffect(() => {
    if (poPage > totalPoPages) {
      setPoPage(totalPoPages);
    }
  }, [totalPoPages, poPage]);

  const handlePoSort = (field) => {
    if (poSortField === field) {
      setPoSortAsc(!poSortAsc);
    } else {
      setPoSortField(field);
      setPoSortAsc(true);
    }
    setPoPage(1);
  };

  const handlePoExport = () => {
    const headers = [
      "#", "Type", "Apono", "Po No", "Po date", "Cust Name", "PartNO- Description", "Po Sl.No",
      "Qty", "Shot close Qty", "Rate", "Value", "Dc.NO", "Dc Dt", "Dc Qty",
      "Pending Qty", "Pending Value", "Age Days", "Invoice No & Dt"
    ];

    const rows = filteredPoLedger.map((row, idx) => [
      idx + 1,
      row.type,
      row.apoNo,
      row.poNo,
      formatToMmDdYyyy(row.poDate),
      row.custName,
      row.partDesc,
      row.poSlNo || "—",
      row.qty,
      row.shortCloseQty,
      row.rate,
      row.value,
      row.dcNo,
      formatToMmDdYyyy(row.dcDate),
      row.dcQty,
      row.pendingQty,
      row.pendingValue,
      row.ageDays,
      formatToMmDdYyyy(row.invNoDt)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => `"${String(val ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "po_ledger_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const poTotals = useMemo(() => {
    return filteredPoLedger.reduce(
      (acc, row) => {
        acc.totVal += row.value;
        acc.totPendVal += row.pendingValue;
        return acc;
      },
      { totVal: 0, totPendVal: 0 }
    );
  }, [filteredPoLedger]);

  const filteredPlanVsActual = useMemo(() => {
    return MOCK_PLAN_VS_ACTUAL.filter((row) => {
      const rowDate = new Date(row.date);
      if (dateRange.from && rowDate < dateRange.from) return false;
      if (dateRange.to && rowDate > dateRange.to) return false;

      const q = planSearchQuery.toLowerCase().trim();
      if (q) {
        return (
          row.customer.toLowerCase().includes(q) ||
          row.partNoDesc.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dateRange, planSearchQuery]);

  const planTotals = useMemo(() => {
    const totals = filteredPlanVsActual.reduce(
      (acc, row) => {
        acc.planned += row.planQty;
        acc.dispatched += row.dispatchQty;
        return acc;
      },
      { planned: 0, dispatched: 0 }
    );
    const avgPct = totals.planned > 0 ? (totals.dispatched / totals.planned) * 100 : 0;
    return { ...totals, avgPct };
  }, [filteredPlanVsActual]);

  const SortIcon = ({ active, asc }) => {
    if (!active) {
      return (
        <span style={{ display: "inline-flex", flexDirection: "column", verticalAlign: "middle", marginLeft: "4px", opacity: 0.35 }}>
          <ChevronUp size={10} style={{ marginBottom: "-3px" }} />
          <ChevronDown size={10} />
        </span>
      );
    }
    return asc ? (
      <ChevronUp size={13} style={{ marginLeft: "4px", verticalAlign: "middle", color: "#4f46e5" }} />
    ) : (
      <ChevronDown size={13} style={{ marginLeft: "4px", verticalAlign: "middle", color: "#4f46e5" }} />
    );
  };

  const sortedPlanVsActual = useMemo(() => {
    const sorted = [...filteredPlanVsActual];
    sorted.sort((a, b) => {
      let valA = a[planSortField];
      let valB = b[planSortField];

      if (planSortField === "date") {
        return planSortAsc
          ? new Date(valA) - new Date(valB)
          : new Date(valB) - new Date(valA);
      }

      if (planSortField === "status") {
        const getPct = (x) => (x.planQty > 0 ? x.dispatchQty / x.planQty : 0);
        return planSortAsc ? getPct(a) - getPct(b) : getPct(b) - getPct(a);
      }

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
        if (valA < valB) return planSortAsc ? -1 : 1;
        if (valA > valB) return planSortAsc ? 1 : -1;
        return 0;
      } else {
        return planSortAsc ? valA - valB : valB - valA;
      }
    });
    return sorted;
  }, [filteredPlanVsActual, planSortField, planSortAsc]);

  const handlePlanSort = (field) => {
    if (planSortField === field) {
      setPlanSortAsc(!planSortAsc);
    } else {
      setPlanSortField(field);
      setPlanSortAsc(true);
    }
  };

  const sortedProjections = useMemo(() => {
    const sorted = [...MOCK_PROJECTIONS];
    sorted.sort((a, b) => {
      let valA = a[projSortField];
      let valB = b[projSortField];

      if (projSortField === "month" || projSortField === "schdMonth") {
        const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        const getVal = (s) => {
          const parts = s.toLowerCase().split(" ");
          const mIdx = months.indexOf(parts[0]);
          const yVal = parseInt(parts[1]) || 0;
          return yVal * 12 + mIdx;
        };
        return projSortAsc ? getVal(valA) - getVal(valB) : getVal(valB) - getVal(valA);
      }

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
        if (valA < valB) return projSortAsc ? -1 : 1;
        if (valA > valB) return projSortAsc ? 1 : -1;
        return 0;
      } else {
        return projSortAsc ? valA - valB : valB - valA;
      }
    });
    return sorted;
  }, [projSortField, projSortAsc]);

  const handleProjSort = (field) => {
    if (projSortField === field) {
      setProjSortAsc(!projSortAsc);
    } else {
      setProjSortField(field);
      setProjSortAsc(true);
    }
  };

  useEffect(() => {
    if (!invoiceDropdownOpen) {
      setFocusedIndex(-1);
    } else {
      const idx = optionsList.indexOf(invoiceBtype);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  }, [invoiceDropdownOpen, optionsList, invoiceBtype]);

  useEffect(() => {
    if (!customerDropdownOpen) {
      setCustomerFocusedIndex(-1);
      setCustomerSearch("");
    } else {
      setCustomerFocusedIndex(0);
    }
  }, [customerDropdownOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (invoiceDropdownRef.current && !invoiceDropdownRef.current.contains(event.target)) {
        setInvoiceDropdownOpen(false);
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setCustomerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const filteredInvoices = useMemo(() => {
    return invoiceRows.filter((r) => {
      if (selectedCustomers.length > 0 && !selectedCustomers.includes(r.customer)) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (r.invoice_no && r.invoice_no.toLowerCase().includes(q)) ||
        (r.customer && r.customer.toLowerCase().includes(q)) ||
        (r.part_no && r.part_no.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    });
  }, [invoiceRows, searchQuery, selectedCustomers]);

  const derivedSummary = useMemo(() => {
    if (!summary) return null;
    if (selectedCustomers.length === 0) return summary;

    const totalInvoicesSet = new Set();
    let grandTotal = 0;
    let totalQty = 0;

    filteredInvoices.forEach((r) => {
      grandTotal += r.amount || 0;
      totalQty += r.qty || 0;
      if (r.invoice_no) totalInvoicesSet.add(r.invoice_no);
    });

    const totalInvoices = totalInvoicesSet.size;
    const avgInvoice = totalInvoices > 0 ? grandTotal / totalInvoices : 0;

    return {
      ...summary,
      grand_total: grandTotal,
      total_invoices: totalInvoices,
      customers: selectedCustomers.length,
      total_qty_sold: totalQty,
      avg_invoice: avgInvoice,
      turn_over_lakhs: grandTotal / 100_000,
    };
  }, [summary, selectedCustomers, filteredInvoices]);

  const kpiCards = useMemo(() => buildKpiCards(derivedSummary), [derivedSummary]);

  const avgRateCards = useMemo(() => {
    if (!derivedSummary) {
      return [
        { label: "AVG SELLING RATE (Per Day)", value: "—", sub: "—", trend: "—", icon: Scale, iconColor: "#3b82f6", type: "neutral" },
        { label: "AVG SELLING RATE (Per Week)", value: "—", sub: "—", trend: "—", icon: Scale, iconColor: "#10b981", type: "neutral" },
        { label: "AVG SELLING RATE (Per Month)", value: "—", sub: "—", trend: "—", icon: Scale, iconColor: "#f97316", type: "neutral" },
        { label: "AVG SELLING RATE (Per Year)", value: "—", sub: "—", trend: "—", icon: Scale, iconColor: "#8b5cf6", type: "neutral" },
      ];
    }

    const grandTotal = derivedSummary.grand_total ?? 0;
    let days = 1;
    if (dateRange.from && dateRange.to) {
      const diffTime = Math.abs(dateRange.to - dateRange.from);
      days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }

    const perDay = grandTotal / days;
    const perWeek = perDay * 7;
    const perMonth = perDay * 30;
    const perYear = perDay * 365;

    return [
      {
        label: "AVG SELLING RATE (Per Day)",
        value: `₹${formatRupees(perDay)}`,
        sub: "Per calendar day",
        trend: `${days} days total`,
        icon: Scale,
        iconColor: "#3b82f6",
        type: "neutral"
      },
      {
        label: "AVG SELLING RATE (Per Week)",
        value: `₹${formatRupees(perWeek)}`,
        sub: "Per calendar week",
        trend: `${(days / 7).toFixed(1)} weeks total`,
        icon: Scale,
        iconColor: "#10b981",
        type: "neutral"
      },
      {
        label: "AVG SELLING RATE (Per Month)",
        value: `₹${formatRupees(perMonth)}`,
        sub: "Per calendar month (30d)",
        trend: `${(days / 30).toFixed(1)} months total`,
        icon: Scale,
        iconColor: "#f97316",
        type: "neutral"
      },
      {
        label: "AVG SELLING RATE (Per Year)",
        value: `₹${formatRupees(perYear)}`,
        sub: "Annualized rate (365d)",
        trend: `${(days / 365).toFixed(2)} years total`,
        icon: Scale,
        iconColor: "#8b5cf6",
        type: "neutral"
      }
    ];
  }, [derivedSummary, dateRange]);
  const customerRanking = useMemo(
    () => buildCustomerRanking(revenueCharts?.customer_ranking),
    [revenueCharts],
  );
  const topProducts = useMemo(
    () => buildTopProducts(topProductsRaw?.products),
    [topProductsRaw],
  );

  const invoiceStats = useMemo(() => {
    const invSet = new Set();
    filteredInvoices.forEach((r) => {
      if (r.invoice_no) invSet.add(r.invoice_no);
    });
    return { lines: filteredInvoices.length, invoices: invSet.size };
  }, [filteredInvoices]);

  const trendRef = useRef(null);
  const custRef = useRef(null);
  const prodRef = useRef(null);
  const monthlyTrendRef = useRef(null);
  const billTypeRef = useRef(null);
  const taxRef = useRef(null);
  const trendChart = useRef(null);
  const custChart = useRef(null);
  const prodChart = useRef(null);
  const monthlyTrendChart = useRef(null);
  const billTypeChart = useRef(null);
  const taxChart = useRef(null);
  const planRef = useRef(null);
  const planChart = useRef(null);
  const projRef = useRef(null);
  const projChart = useRef(null);

  const CHART_FONT = "'Segoe UI', system-ui, sans-serif";

  // ✅ Persist date range to sessionStorage on every change
  useEffect(() => {
    writeFilterSession("ba_filter_sales", { from: dateRange.from, to: dateRange.to });
  }, [dateRange.from, dateRange.to]);

  const custLabels = useMemo(() => revenueCharts?.customer?.labels ?? [], [revenueCharts]);
  const custPercentages = useMemo(() => revenueCharts?.customer?.percentages ?? [], [revenueCharts]);

  const prodLabels = useMemo(() => revenueCharts?.product?.labels ?? [], [revenueCharts]);
  const prodPercentages = useMemo(() => revenueCharts?.product?.percentages ?? [], [revenueCharts]);

  const getCustValue = (pct) => {
    const total = derivedSummary?.grand_total || 0;
    const val = (pct / 100) * total;
    return `₹${(val / 100_000).toFixed(2)}L`;
  };

  const getProdQty = (pct) => {
    const total = derivedSummary?.total_qty_sold || 0;
    const val = Math.round((pct / 100) * total);
    return `${val.toLocaleString("en-IN")} units`;
  };

  const handleCustLegendHover = (idx) => {
    setHoveredCustIndex(idx);
    const chart = custChart.current;
    if (chart) {
      chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
      const meta = chart.getDatasetMeta(0);
      const element = meta.data[idx];
      if (element) {
        const center = element.getCenterPoint();
        chart.tooltip.setActiveElements(
          [{ datasetIndex: 0, index: idx }],
          { x: center.x, y: center.y }
        );
      }
      chart.update();
    }
  };

  const handleCustLegendLeave = () => {
    setHoveredCustIndex(-1);
    const chart = custChart.current;
    if (chart) {
      chart.setActiveElements([]);
      chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      chart.update();
    }
  };

  const handleProdLegendHover = (idx) => {
    setHoveredProdIndex(idx);
    const chart = prodChart.current;
    if (chart) {
      chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
      const meta = chart.getDatasetMeta(0);
      const element = meta.data[idx];
      if (element) {
        const center = element.getCenterPoint();
        chart.tooltip.setActiveElements(
          [{ datasetIndex: 0, index: idx }],
          { x: center.x, y: center.y }
        );
      }
      chart.update();
    }
  };

  const handleProdLegendLeave = () => {
    setHoveredProdIndex(-1);
    const chart = prodChart.current;
    if (chart) {
      chart.setActiveElements([]);
      chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      chart.update();
    }
  };

  useEffect(() => {
    if (!custRef.current) return;

    const ctx = custRef.current.getContext("2d");
    const labels = revenueCharts?.customer?.labels ?? [];
    const gradientColors = GRADIENTS_CUSTOMER.slice(0, labels.length).map((g) => {
      const gr = ctx.createLinearGradient(0, 0, 0, 200);
      gr.addColorStop(0, g.start);
      gr.addColorStop(1, g.end);
      return gr;
    });

    custChart.current?.destroy();
    custChart.current = new Chart(custRef.current, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: revenueCharts?.customer?.percentages ?? [],
          backgroundColor: gradientColors,
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 12,
          hoverBorderColor: "#fff",
          hoverBorderWidth: 3,
        }],
      },
      options: DONUT_CHART_OPTS(CHART_FONT, (event, activeElements) => {
        const newIndex = activeElements && activeElements.length > 0 ? activeElements[0].index : -1;
        setHoveredCustIndex(prev => (prev === newIndex ? prev : newIndex));
      }),
    });
    return () => custChart.current?.destroy();
  }, [revenueCharts, loading]);

  useEffect(() => {
    if (!prodRef.current) return;

    const ctx = prodRef.current.getContext("2d");
    const labels = revenueCharts?.product?.labels ?? [];
    const gradientColors = GRADIENTS_PRODUCT.slice(0, labels.length).map((g) => {
      const gr = ctx.createLinearGradient(0, 0, 0, 200);
      gr.addColorStop(0, g.start);
      gr.addColorStop(1, g.end);
      return gr;
    });

    prodChart.current?.destroy();
    prodChart.current = new Chart(prodRef.current, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: revenueCharts?.product?.percentages ?? [],
          backgroundColor: gradientColors,
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 12,
          hoverBorderColor: "#fff",
          hoverBorderWidth: 3,
        }],
      },
      options: DONUT_CHART_OPTS(CHART_FONT, (event, activeElements) => {
        const newIndex = activeElements && activeElements.length > 0 ? activeElements[0].index : -1;
        setHoveredProdIndex(prev => (prev === newIndex ? prev : newIndex));
      }),
    });
    return () => prodChart.current?.destroy();
  }, [revenueCharts, loading]);

  useEffect(() => {
    if (!trendRef.current) return;
    const ctx = trendRef.current.getContext("2d");

    const monthYearMap = getMonthYearMap(dateRange.from, dateRange.to);
    const labels = (weeklyTrend?.labels ?? []).map(lbl => formatLabelWithYear(lbl, monthYearMap));
    const sales = weeklyTrend?.sales ?? [];
    const cumulative = weeklyTrend?.cumulative ?? [];

    const peakSales = Math.max(0, ...sales) || 1;
    const peakCumulative = Math.max(0, ...cumulative) || 1;

    const gradBlue = ctx.createLinearGradient(0, 0, 0, 300);
    gradBlue.addColorStop(0, "rgba(45, 109, 232, 0.85)");
    gradBlue.addColorStop(1, "rgba(45, 109, 232, 0.15)");

    const gradBlueArea = ctx.createLinearGradient(0, 0, 0, 300);
    gradBlueArea.addColorStop(0, "rgba(45, 109, 232, 0.45)");
    gradBlueArea.addColorStop(1, "rgba(45, 109, 232, 0.02)");

    const gradGreenArea = ctx.createLinearGradient(0, 0, 0, 300);
    gradGreenArea.addColorStop(0, "rgba(16, 185, 129, 0.45)");
    gradGreenArea.addColorStop(1, "rgba(16, 185, 129, 0.02)");

    trendChart.current?.destroy();

    let datasets = [];
    let scales = {};

    if (weeklyChartType === "combo") {
      datasets = [
        {
          label: "Weekly sales",
          data: sales,
          backgroundColor: gradBlue,
          borderColor: "#2d6de8",
          borderWidth: 1.5,
          borderRadius: 4,
          type: "bar",
          yAxisID: "y",
          datalabels: {
            display: (context) => {
              const val = context.dataset.data[context.dataIndex];
              return val && val >= 10000;
            },
            align: "top",
            anchor: "end",
            offset: 4,
            formatter: (value, context) => {
              const idx = context.dataIndex;
              const prev = context.dataset.data[idx - 1];
              let label = "";
              if (value >= 100000) {
                label = `₹${(value / 100000).toFixed(1)}L`;
              } else {
                label = `₹${(value / 1000).toFixed(0)}K`;
              }
              if (prev && prev > 0) {
                const pct = ((value - prev) / prev) * 100;
                const sign = pct >= 0 ? "↑" : "↓";
                label += ` (${sign}${Math.abs(pct).toFixed(0)}%)`;
              }
              return label;
            },
            font: { size: 10, weight: "700", family: 'Plus Jakarta Sans' },
            color: "#2d6de8",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderColor: "rgba(45, 109, 232, 0.4)",
            borderWidth: 1.5,
            borderRadius: 6,
            padding: { top: 4, bottom: 4, left: 6, right: 6 }
          }
        },
        {
          label: "Cumulative",
          data: cumulative,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.04)",
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#10b981",
          pointBorderColor: "#fff",
          pointBorderWidth: 1.5,
          type: "line",
          yAxisID: "y1",
          datalabels: {
            display: false
          }
        }
      ];

      scales = {
        y: {
          beginAtZero: true,
          max: Math.ceil(peakSales * 1.35),
          grid: { color: "rgba(45,109,232,0.07)" },
          ticks: { font: { size: 9, family: 'Plus Jakarta Sans' }, color: '#3b82f6', callback: formatAxisLakhs },
          border: { display: false },
          title: { display: true, text: "Weekly Sales (Lakhs)", font: { size: 9, weight: '700', family: 'Plus Jakarta Sans' }, color: '#3b82f6' },
        },
        y1: {
          position: "right",
          beginAtZero: true,
          max: Math.ceil(peakCumulative * 1.2),
          grid: { display: false },
          ticks: { font: { size: 9, family: 'Plus Jakarta Sans' }, color: '#10b981', callback: formatAxisLakhs },
          border: { display: false },
          title: { display: true, text: "Cumulative Sales (Lakhs)", font: { size: 9, weight: '700', family: 'Plus Jakarta Sans' }, color: '#10b981' },
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 9, family: 'Plus Jakarta Sans' },
            color: '#312e81',
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0
          },
          border: { display: false },
        }
      };
    } else if (weeklyChartType === "cumulative") {
      datasets = [
        {
          label: "Cumulative Sales",
          data: cumulative,
          borderColor: "#10b981",
          backgroundColor: gradGreenArea,
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#10b981",
          pointBorderWidth: 2,
          type: "line",
          yAxisID: "y",
          datalabels: {
            display: (context) => {
              const val = context.dataset.data[context.dataIndex];
              return val && val >= 10000;
            },
            align: "top",
            anchor: "end",
            offset: 8,
            formatter: (value) => {
              if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
              return `₹${(value / 1000).toFixed(0)}K`;
            },
            font: { size: 10, weight: "700", family: 'Plus Jakarta Sans' },
            color: "#10b981",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderColor: "rgba(16, 185, 129, 0.4)",
            borderWidth: 1.5,
            borderRadius: 6,
            padding: { top: 4, bottom: 4, left: 6, right: 6 }
          }
        }
      ];

      scales = {
        y: {
          beginAtZero: true,
          max: Math.ceil(peakCumulative * 1.25),
          grid: { color: "rgba(45,109,232,0.07)" },
          ticks: { font: { size: 9, family: 'Plus Jakarta Sans' }, color: '#10b981', callback: formatAxisLakhs },
          border: { display: false },
          title: { display: true, text: "Cumulative Sales (Lakhs)", font: { size: 9, weight: '700', family: 'Plus Jakarta Sans' }, color: '#10b981' },
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 9, family: 'Plus Jakarta Sans' },
            color: '#312e81',
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0
          },
          border: { display: false },
        }
      };
    } else {
      datasets = [
        {
          label: "Weekly Sales",
          data: sales,
          backgroundColor: gradBlue,
          borderColor: "#2d6de8",
          borderWidth: 1.5,
          borderRadius: 4,
          type: "bar",
          yAxisID: "y",
          datalabels: {
            display: (context) => {
              const val = context.dataset.data[context.dataIndex];
              return val && val >= 10000;
            },
            align: "top",
            anchor: "end",
            offset: 4,
            formatter: (value, context) => {
              const idx = context.dataIndex;
              const prev = context.dataset.data[idx - 1];
              let label = "";
              if (value >= 100000) {
                label = `₹${(value / 100000).toFixed(1)}L`;
              } else {
                label = `₹${(value / 1000).toFixed(0)}K`;
              }
              if (prev && prev > 0) {
                const pct = ((value - prev) / prev) * 100;
                const sign = pct >= 0 ? "↑" : "↓";
                label += ` (${sign}${Math.abs(pct).toFixed(0)}%)`;
              }
              return label;
            },
            font: { size: 10, weight: "700", family: 'Plus Jakarta Sans' },
            color: "#2d6de8",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderColor: "rgba(45, 109, 232, 0.4)",
            borderWidth: 1.5,
            borderRadius: 6,
            padding: { top: 4, bottom: 4, left: 6, right: 6 }
          }
        }
      ];

      scales = {
        y: {
          beginAtZero: true,
          max: Math.ceil(peakSales * 1.35),
          grid: { color: "rgba(45,109,232,0.07)" },
          ticks: { font: { size: 9, family: 'Plus Jakarta Sans' }, color: '#3b82f6', callback: formatAxisLakhs },
          border: { display: false },
          title: { display: true, text: "Weekly Sales (Lakhs)", font: { size: 9, weight: '700', family: 'Plus Jakarta Sans' }, color: '#3b82f6' },
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 9, family: 'Plus Jakarta Sans' },
            color: '#312e81',
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0
          },
          border: { display: false },
        }
      };
    }

    trendChart.current = new Chart(trendRef.current, {
      type: "bar",
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        animation: {
          delay: (context) => {
            let delay = 0;
            if (context.type === 'data' && context.mode === 'default') {
              delay = context.dataIndex * 50; // 50ms stagger per item
            }
            return delay;
          },
          duration: 1000,
          easing: "easeOutBack", // Premium springy animation
        },
        plugins: {
          legend: {
            labels: { font: { size: 10, weight: "600", family: 'Plus Jakarta Sans' }, boxWidth: 12, padding: 14 },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const val = ctx.parsed.y ?? 0;
                const idx = ctx.dataIndex;
                const dataset = ctx.dataset;
                const prev = dataset.data[idx - 1];
                let text = `${dataset.label}: ${formatTooltipLakhs(val)}`;
                if (dataset.label.toLowerCase().includes("weekly") && prev && prev > 0) {
                  const pct = ((val - prev) / prev) * 100;
                  const diff = val - prev;
                  const diffText = diff >= 0 ? `+₹${(diff / 100000).toFixed(2)}L` : `-₹${(Math.abs(diff) / 100000).toFixed(2)}L`;
                  text += ` (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% WoW, ${diffText})`;
                }
                return text;
              },
            },
          },
          datalabels: {
            display: (context) => {
              const d = context.dataset.datalabels?.display;
              if (typeof d === 'function') {
                return d(context);
              }
              return d ?? false;
            }
          }
        },
        scales
      }
    });

    return () => trendChart.current?.destroy();
  }, [weeklyTrend, loading, weeklyChartType]);

  useEffect(() => {
    if (!monthlyTrendRef.current) return;
    const ctx = monthlyTrendRef.current.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    const isBar = performanceChartType === "bar";
    const isShare = performanceChartType === "share";

    // Pull real labels & values from API data
    const monthYearMap = getMonthYearMap(dateRange.from, dateRange.to);
    const apiLabels = (monthlyTrendData?.labels ?? []).map(lbl => formatLabelWithYear(lbl, monthYearMap));
    const apiValuesLakhs = monthlyTrendData?.sales_values_lakhs ?? [];

    // Compute MoM growth for "share" view
    const growthData = apiValuesLakhs.map((v, i) => {
      if (i === 0 || apiValuesLakhs[i - 1] === 0) return 0;
      return parseFloat(((v - apiValuesLakhs[i - 1]) / apiValuesLakhs[i - 1] * 100).toFixed(1));
    });

    if (isBar) {
      gradient.addColorStop(0, "rgba(99, 102, 241, 0.9)");
      gradient.addColorStop(1, "rgba(99, 102, 241, 0.15)");
    } else {
      gradient.addColorStop(0, "rgba(99, 102, 241, 0.45)");
      gradient.addColorStop(1, "rgba(99, 102, 241, 0.02)");
    }

    monthlyTrendChart.current?.destroy();
    monthlyTrendChart.current = new Chart(monthlyTrendRef.current, {
      type: isBar ? "bar" : "line",
      data: {
        labels: apiLabels,
        datasets: [
          {
            label: isShare ? "Growth Rate (%)" : "Sales Value (Lakhs)",
            data: isShare ? growthData : apiValuesLakhs,
            backgroundColor: gradient,
            borderColor: "rgba(99, 102, 241, 1)",
            borderWidth: isBar ? 1.5 : 2.5,
            borderRadius: isBar ? 6 : 0,
            fill: !isBar,
            tension: isBar ? 0 : 0.4,
            pointRadius: isBar ? 0 : 4,
            pointHoverRadius: isBar ? 0 : 6,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "rgba(99, 102, 241, 1)",
            pointBorderWidth: 2,
            yAxisID: "y",
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          delay: (context) => {
            let delay = 0;
            if (context.type === 'data' && context.mode === 'default') {
              delay = context.dataIndex * 100; // 100ms staggered delay
            }
            return delay;
          },
          duration: 1000,
          easing: "easeOutBack", // Premium springy animation
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const val = ctx.parsed.y ?? 0;
                const idx = ctx.dataIndex;
                const dataset = ctx.dataset;
                const prev = dataset.data[idx - 1];
                let text = "";
                if (isShare) {
                  text = `${ctx.label}: ${val === 0 ? "—" : (val > 0 ? "+" : "") + val.toFixed(1) + "%"}`;
                } else {
                  text = `Sales Value: ₹${val.toFixed(2)}L`;
                  if (prev && prev > 0) {
                    const pct = ((val - prev) / prev) * 100;
                    const diff = val - prev;
                    const diffText = diff >= 0 ? `+₹${diff.toFixed(2)}L` : `-₹${Math.abs(diff).toFixed(2)}L`;
                    text += ` (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% MoM, ${diffText})`;
                  }
                }
                return text;
              }
            }
          },
          datalabels: {
            display: true,
            align: "top",
            anchor: "end",
            offset: 8,
            font: { family: 'Plus Jakarta Sans', size: 10, weight: '700' },
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderWidth: 1.5,
            borderRadius: 6,
            padding: { top: 4, bottom: 4, left: 6, right: 6 },
            borderColor: (ctx) => {
              if (isShare) {
                const val = ctx.dataset.data[ctx.dataIndex];
                return val === 0 ? "rgba(100, 116, 139, 0.4)" : (val > 0 ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)");
              }
              return "rgba(99, 102, 241, 0.4)";
            },
            color: (ctx) => {
              if (isShare) {
                const val = ctx.dataset.data[ctx.dataIndex];
                return val === 0 ? "#64748b" : (val > 0 ? "#10b981" : "#ef4444");
              }
              return "#4f46e5";
            },
            formatter: (v, context) => {
              if (isShare) {
                return v === 0 ? "—" : `${v > 0 ? "↑" : "↓"} ${Math.abs(v).toFixed(1)}%`;
              }
              let label = `₹${v.toFixed(1)}L`;
              const idx = context.dataIndex;
              const prev = context.dataset.data[idx - 1];
              if (prev && prev > 0) {
                const pct = ((v - prev) / prev) * 100;
                const sign = pct >= 0 ? "↑" : "↓";
                label += ` (${sign}${Math.abs(pct).toFixed(1)}%)`;
              }
              return label;
            }
          }
        },
        scales: {
          y: {
            type: "linear",
            position: "left",
            max: isShare ? undefined : Math.ceil((Math.max(0, ...apiValuesLakhs) || 1) * 1.25),
            grid: { color: "rgba(99, 102, 241, 0.05)" },
            ticks: {
              font: { family: 'Plus Jakarta Sans', size: 9 },
              color: '#312e81',
              callback: (v) => isShare ? `${v}%` : `₹${v}L`
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81' }
          }
        }
      }
    });
    return () => monthlyTrendChart.current?.destroy();
  }, [loading, performanceChartType, monthlyTrendData]);

  useEffect(() => {
    if (!billTypeRef.current) return;
    const ctx = billTypeRef.current.getContext("2d");
    const isBar = performanceChartType === "bar";
    const isShare = performanceChartType === "share";
    const isBarOrShare = isBar || isShare;

    // Palette of gradients — one per bill type (cycled)
    const PALETTE_STOPS = [
      ["rgba(79, 70, 229, 0.95)",  "rgba(79, 70, 229, 0.4)",  "rgba(79, 70, 229, 0.5)",  "rgba(79, 70, 229, 0.05)",  "rgba(79, 70, 229, 1)"],
      ["rgba(124, 58, 237, 0.95)", "rgba(124, 58, 237, 0.4)", "rgba(124, 58, 237, 0.5)", "rgba(124, 58, 237, 0.05)", "rgba(124, 58, 237, 1)"],
      ["rgba(168, 85, 247, 0.95)", "rgba(168, 85, 247, 0.4)", "rgba(168, 85, 247, 0.5)", "rgba(168, 85, 247, 0.05)", "rgba(168, 85, 247, 1)"],
      ["rgba(192, 132, 252, 0.9)", "rgba(192, 132, 252, 0.35)","rgba(192, 132, 252, 0.5)","rgba(192, 132, 252, 0.05)","rgba(192, 132, 252, 1)"],
      ["rgba(59, 130, 246, 0.95)", "rgba(59, 130, 246, 0.4)", "rgba(59, 130, 246, 0.5)", "rgba(59, 130, 246, 0.05)", "rgba(59, 130, 246, 1)"],
      ["rgba(16, 185, 129, 0.95)", "rgba(16, 185, 129, 0.4)", "rgba(16, 185, 129, 0.5)", "rgba(16, 185, 129, 0.05)", "rgba(16, 185, 129, 1)"],
    ];

    // Build real datasets from API
    const monthYearMap = getMonthYearMap(dateRange.from, dateRange.to);
    const apiLabels = (billTypeRevenueData?.labels ?? []).map(lbl => formatLabelWithYear(lbl, monthYearMap));
    const apiDatasets = billTypeRevenueData?.datasets ?? [];

    // Compute per-month totals for share view
    const monthTotals = apiLabels.map((_, mi) =>
      apiDatasets.reduce((sum, ds) => sum + (ds.data_lakhs?.[mi] ?? 0), 0)
    );

    const chartDatasets = apiDatasets.map((ds, i) => {
      const stops = PALETTE_STOPS[i % PALETTE_STOPS.length];
      const grad = ctx.createLinearGradient(0, 0, 0, 240);
      grad.addColorStop(0, isBarOrShare ? stops[0] : stops[2]);
      grad.addColorStop(1, isBarOrShare ? stops[1] : stops[3]);

      const shareData = ds.data_lakhs?.map((v, mi) =>
        monthTotals[mi] > 0 ? parseFloat(((v / monthTotals[mi]) * 100).toFixed(1)) : 0
      ) ?? [];

      return {
        label: ds.bill_type,
        data: isShare ? shareData : (ds.data_lakhs ?? []),
        backgroundColor: grad,
        borderColor: stops[4],
        borderWidth: isBarOrShare ? 1 : 2,
        borderRadius: isBarOrShare ? 4 : 0,
        fill: !isBarOrShare,
        tension: isBarOrShare ? 0 : 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
      };
    });

    billTypeChart.current?.destroy();
    billTypeChart.current = new Chart(billTypeRef.current, {
      type: isBarOrShare ? "bar" : "line",
      data: {
        labels: apiLabels,
        datasets: chartDatasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'Plus Jakarta Sans', size: 10 }, color: '#312e81' }
          },
          datalabels: {
            display: isBarOrShare ? (ctx) => {
              const val = ctx.dataset.data[ctx.dataIndex];
              return isShare ? val > 4 : val > 0.8;
            } : false,
            color: "#ffffff",
            font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' },
            formatter: (v) => isShare ? `${v.toFixed(0)}%` : `₹${v.toFixed(1)}L`
          }
        },
        scales: {
          y: {
            stacked: true,
            max: isShare ? 100 : undefined,
            grid: { color: "rgba(99, 102, 241, 0.05)" },
            ticks: {
              font: { family: 'Plus Jakarta Sans', size: 9 },
              color: '#312e81',
              callback: (v) => isShare ? `${v}%` : `₹${v}L`
            }
          },
          x: {
            stacked: isBarOrShare,
            grid: { display: false },
            ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81' }
          }
        }
      }
    });
    return () => billTypeChart.current?.destroy();
  }, [loading, performanceChartType, billTypeRevenueData]);

  useEffect(() => {
    if (!taxRef.current) return;
    const ctx = taxRef.current.getContext("2d");
    const isBar = performanceChartType === "bar";
    const isShare = performanceChartType === "share";

    // Real data from API
    const monthYearMap = getMonthYearMap(dateRange.from, dateRange.to);
    const apiLabels = (monthlyTaxData?.labels ?? []).map(lbl => formatLabelWithYear(lbl, monthYearMap));
    const apiTaxLakhs = monthlyTaxData?.tax_values_lakhs ?? [];
    // Sales lakhs for combo view (line view) from monthly trend API
    const apiSalesLakhs = monthlyTrendData?.sales_values_lakhs ?? [];

    taxChart.current?.destroy();

    if (isBar) {
      const gradient = ctx.createLinearGradient(0, 0, 0, 240);
      gradient.addColorStop(0, "rgba(139, 92, 246, 0.95)");
      gradient.addColorStop(1, "rgba(139, 92, 246, 0.15)");

      taxChart.current = new Chart(taxRef.current, {
        type: "bar",
        data: {
          labels: apiLabels,
          datasets: [
            {
              label: "Tax Value (Lakhs)",
              data: apiTaxLakhs,
              backgroundColor: gradient,
              borderColor: "rgba(139, 92, 246, 1)",
              borderWidth: 1.5,
              borderRadius: 6,
              yAxisID: "y",
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            datalabels: {
              display: true,
              align: "end",
              anchor: "end",
              offset: 2,
              font: { family: 'Plus Jakarta Sans', size: 10, weight: '700' },
              color: "#7c3aed",
              formatter: (v) => `₹${Number(v).toFixed(2)}L`
            }
          },
          scales: {
            y: {
              type: "linear",
              position: "left",
              grid: { color: "rgba(99, 102, 241, 0.05)" },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81', callback: (v) => `₹${v}L` }
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81' }
            }
          }
        }
      });
    } else if (isShare) {
      // Effective tax rate = taxLakhs / salesLakhs * 100
      const effectiveTaxRate = apiTaxLakhs.map((t, i) => {
        const s = apiSalesLakhs[i];
        return s && s > 0 ? parseFloat(((t / s) * 100).toFixed(2)) : 0;
      });
      const shareLabels = apiLabels.length ? apiLabels : (monthlyTrendData?.labels ?? []).map(lbl => formatLabelWithYear(lbl, monthYearMap));

      const gradient = ctx.createLinearGradient(0, 0, 0, 240);
      gradient.addColorStop(0, "rgba(139, 92, 246, 0.45)");
      gradient.addColorStop(1, "rgba(139, 92, 246, 0.02)");

      taxChart.current = new Chart(taxRef.current, {
        type: "line",
        data: {
          labels: shareLabels,
          datasets: [
            {
              label: "Effective Tax Rate (%)",
              data: effectiveTaxRate,
              backgroundColor: gradient,
              borderColor: "rgba(139, 92, 246, 1)",
              borderWidth: 2.5,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: "#ffffff",
              pointBorderColor: "rgba(139, 92, 246, 1)",
              pointBorderWidth: 2,
              yAxisID: "y",
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            datalabels: {
              display: true,
              align: "top",
              anchor: "end",
              offset: 4,
              font: { family: 'Plus Jakarta Sans', size: 10, weight: '700' },
              color: "#7c3aed",
              formatter: (v) => `${Number(v).toFixed(2)}%`
            }
          },
          scales: {
            y: {
              type: "linear",
              position: "left",
              grid: { color: "rgba(99, 102, 241, 0.05)" },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81', callback: (v) => `${v.toFixed(2)}%` }
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81' }
            }
          }
        }
      });
    } else {
      // Trend / Line View: combo bar (sales) + line (tax)
      const gradSales = ctx.createLinearGradient(0, 0, 0, 240);
      gradSales.addColorStop(0, "rgba(59, 130, 246, 0.85)");
      gradSales.addColorStop(1, "rgba(59, 130, 246, 0.15)");

      // Use tax labels if available, else fall back to sales trend labels
      const comboLabels = apiLabels.length ? apiLabels : (monthlyTrendData?.labels ?? []).map(lbl => formatLabelWithYear(lbl, monthYearMap));

      taxChart.current = new Chart(taxRef.current, {
        type: "bar",
        data: {
          labels: comboLabels,
          datasets: [
            {
              label: "Sales Value (Lakhs)",
              type: "bar",
              data: apiSalesLakhs,
              backgroundColor: gradSales,
              borderColor: "rgba(59, 130, 246, 1)",
              borderWidth: 1.5,
              borderRadius: 4,
              yAxisID: "ySales",
              datalabels: {
                display: false
              }
            },
            {
              label: "Tax Value (Lakhs)",
              type: "line",
              data: apiTaxLakhs,
              borderColor: "rgba(139, 92, 246, 1)",
              borderWidth: 2.5,
              tension: 0.4,
              fill: false,
              pointRadius: 3,
              pointHoverRadius: 5,
              pointBackgroundColor: "#ffffff",
              pointBorderColor: "rgba(139, 92, 246, 1)",
              pointBorderWidth: 1.5,
              yAxisID: "yTax",
              datalabels: {
                display: true,
                align: "top",
                anchor: "end",
                offset: 2,
                font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' },
                color: "#7c3aed",
                formatter: (v) => `₹${Number(v).toFixed(2)}L`
              }
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: { font: { family: 'Plus Jakarta Sans', size: 10 }, color: '#312e81' }
            }
          },
          scales: {
            ySales: {
              type: "linear",
              position: "left",
              grid: { color: "rgba(99, 102, 241, 0.05)" },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#2563eb', callback: (v) => `₹${v}L` },
              title: { display: true, text: "Sales Value", font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' }, color: '#2563eb' }
            },
            yTax: {
              type: "linear",
              position: "right",
              grid: { drawOnChartArea: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#7c3aed', callback: (v) => `₹${Number(v).toFixed(2)}L` },
              title: { display: true, text: "Tax Liability", font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' }, color: '#7c3aed' }
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81' }
            }
          }
        }
      });
    }
    return () => taxChart.current?.destroy();
  }, [loading, performanceChartType, monthlyTaxData, monthlyTrendData]);

  useEffect(() => {
    if (!planRef.current) return;
    const ctx = planRef.current.getContext("2d");

    const labels = filteredPlanVsActual.map((row) => row.partNoDesc.split(" - ")[0]);
    const planned = filteredPlanVsActual.map((row) => row.planQty);
    const dispatched = filteredPlanVsActual.map((row) => row.dispatchQty);

    const gradPlanned = ctx.createLinearGradient(0, 0, 0, 240);
    gradPlanned.addColorStop(0, "rgba(139, 92, 246, 0.9)");
    gradPlanned.addColorStop(1, "rgba(139, 92, 246, 0.15)");

    const gradDispatched = ctx.createLinearGradient(0, 0, 0, 240);
    gradDispatched.addColorStop(0, "rgba(16, 185, 129, 0.9)");
    gradDispatched.addColorStop(1, "rgba(16, 185, 129, 0.15)");

    planChart.current?.destroy();
    planChart.current = new Chart(planRef.current, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Planned Quantity",
            data: planned,
            backgroundColor: gradPlanned,
            borderColor: "rgba(139, 92, 246, 1)",
            borderWidth: 1.5,
            borderRadius: 4,
          },
          {
            label: "Dispatched Quantity",
            data: dispatched,
            backgroundColor: gradDispatched,
            borderColor: "rgba(16, 185, 129, 1)",
            borderWidth: 1.5,
            borderRadius: 4,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          delay: (context) => {
            let delay = 0;
            if (context.type === 'data' && context.mode === 'default') {
              delay = context.dataIndex * 80;
            }
            return delay;
          },
          duration: 1000,
          easing: "easeOutBack",
        },
        plugins: {
          legend: {
            position: "top",
            labels: { font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' }, color: '#312e81' }
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const row = filteredPlanVsActual[ctx.dataIndex];
                if (ctx.datasetIndex === 0) {
                  return `Planned: ${ctx.parsed.y} qty (${row.partNoDesc})`;
                } else {
                  return `Dispatched: ${ctx.parsed.y} qty / ${row.planQty} planned`;
                }
              }
            }
          },
          datalabels: {
            display: true,
            align: "top",
            anchor: "end",
            offset: 4,
            font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' },
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderWidth: 1,
            borderRadius: 4,
            padding: { top: 2, bottom: 2, left: 4, right: 4 },
            borderColor: (ctx) => ctx.datasetIndex === 0 ? "rgba(139, 92, 246, 0.4)" : "rgba(16, 185, 129, 0.4)",
            color: (ctx) => ctx.datasetIndex === 0 ? "#7c3aed" : "#10b981",
            formatter: (v) => formatQty(v)
          }
        },
        scales: {
          y: {
            type: "linear",
            max: Math.ceil((Math.max(0, ...planned) || 1) * 1.25),
            grid: { color: "rgba(99, 102, 241, 0.05)" },
            ticks: {
              font: { family: 'Plus Jakarta Sans', size: 9 },
              color: '#312e81'
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81' }
          }
        }
      }
    });

    return () => planChart.current?.destroy();
  }, [filteredPlanVsActual]);

  useEffect(() => {
    if (!projRef.current) return;
    const ctx = projRef.current.getContext("2d");

    const labels = MOCK_PROJECTIONS.map((row) => row.customer.split(" ")[0]);
    const dispatchedQty = MOCK_PROJECTIONS.map((row) => row.dispQty);
    const pendingQty = MOCK_PROJECTIONS.map((row) => row.pendQty);
    const totalAmtLakhs = MOCK_PROJECTIONS.map((row) => row.totAmt / 100_000);
    const pendingValLakhs = MOCK_PROJECTIONS.map((row) => row.pendVal / 100_000);

    const gradDisp = ctx.createLinearGradient(0, 0, 0, 240);
    gradDisp.addColorStop(0, "rgba(16, 185, 129, 0.85)");
    gradDisp.addColorStop(1, "rgba(16, 185, 129, 0.15)");

    const gradPend = ctx.createLinearGradient(0, 0, 0, 240);
    gradPend.addColorStop(0, "rgba(249, 115, 22, 0.85)");
    gradPend.addColorStop(1, "rgba(249, 115, 22, 0.15)");

    projChart.current?.destroy();
    projChart.current = new Chart(projRef.current, {
      data: {
        labels: labels,
        datasets: [
          {
            type: "bar",
            label: "Dispatched Qty (Units)",
            data: dispatchedQty,
            backgroundColor: gradDisp,
            borderColor: "rgba(16, 185, 129, 1)",
            borderWidth: 1.5,
            borderRadius: 4,
            yAxisID: "yQty",
            datalabels: {
              display: true,
              align: "top",
              anchor: "end",
              offset: 2,
              font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' },
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderWidth: 1,
              borderRadius: 4,
              padding: { top: 2, bottom: 2, left: 4, right: 4 },
              borderColor: "rgba(16, 185, 129, 0.4)",
              color: "#10b981",
              formatter: (v) => formatQty(v)
            }
          },
          {
            type: "bar",
            label: "Pending Qty (Units)",
            data: pendingQty,
            backgroundColor: gradPend,
            borderColor: "rgba(249, 115, 22, 1)",
            borderWidth: 1.5,
            borderRadius: 4,
            yAxisID: "yQty",
            datalabels: {
              display: true,
              align: "top",
              anchor: "end",
              offset: 2,
              font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' },
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderWidth: 1,
              borderRadius: 4,
              padding: { top: 2, bottom: 2, left: 4, right: 4 },
              borderColor: "rgba(249, 115, 22, 0.4)",
              color: "#ea580c",
              formatter: (v) => formatQty(v)
            }
          },
          {
            type: "line",
            label: "Total Order Value (Lakhs)",
            data: totalAmtLakhs,
            borderColor: "rgba(79, 70, 229, 1)",
            borderWidth: 2.5,
            tension: 0.4,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "rgba(79, 70, 229, 1)",
            pointBorderWidth: 2,
            yAxisID: "yValue",
            datalabels: {
              display: true,
              align: "top",
              anchor: "end",
              offset: 6,
              font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' },
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderWidth: 1.5,
              borderRadius: 4,
              padding: { top: 2, bottom: 2, left: 5, right: 5 },
              borderColor: "rgba(79, 70, 229, 0.4)",
              color: "#4f46e5",
              formatter: (v) => `₹${v.toFixed(1)}L`
            }
          },
          {
            type: "line",
            label: "Pending Value (Lakhs)",
            data: pendingValLakhs,
            borderColor: "rgba(239, 68, 68, 1)",
            borderWidth: 2.5,
            tension: 0.4,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "rgba(239, 68, 68, 1)",
            pointBorderWidth: 2,
            yAxisID: "yValue",
            datalabels: {
              display: true,
              align: "top",
              anchor: "end",
              offset: 6,
              font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' },
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderWidth: 1.5,
              borderRadius: 4,
              padding: { top: 2, bottom: 2, left: 5, right: 5 },
              borderColor: "rgba(239, 68, 68, 0.4)",
              color: "#ef4444",
              formatter: (v) => `₹${v.toFixed(1)}L`
            }
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          delay: (context) => {
            let delay = 0;
            if (context.type === 'data' && context.mode === 'default') {
              delay = context.dataIndex * 100;
            }
            return delay;
          },
          duration: 1000,
          easing: "easeOutBack",
        },
        plugins: {
          legend: {
            position: "top",
            labels: { font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' }, color: '#312e81' }
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const row = MOCK_PROJECTIONS[ctx.dataIndex];
                const val = ctx.parsed.y ?? 0;
                if (ctx.dataset.type === "bar") {
                  return `${ctx.dataset.label}: ${formatQty(val)} units (Customer: ${row.customer})`;
                } else {
                  return `${ctx.dataset.label}: ₹${val.toFixed(2)} Lakhs (Customer: ${row.customer})`;
                }
              }
            }
          }
        },
        scales: {
          yQty: {
            type: "linear",
            position: "left",
            grid: { color: "rgba(99, 102, 241, 0.05)" },
            ticks: {
              font: { family: 'Plus Jakarta Sans', size: 9 },
              color: '#312e81',
              callback: (v) => `${v} units`
            },
            title: { display: true, text: "Order Quantity", font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' }, color: '#312e81' }
          },
          yValue: {
            type: "linear",
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: {
              font: { family: 'Plus Jakarta Sans', size: 9 },
              color: '#4f46e5',
              callback: (v) => `₹${v}L`
            },
            title: { display: true, text: "Order Book Value", font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' }, color: '#4f46e5' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81' }
          }
        }
      }
    });

    return () => projChart.current?.destroy();
  }, []);

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    const params = new URLSearchParams({
      from: toIsoDate(dateRange.from),
      to: toIsoDate(dateRange.to),
    });
    const ctrl = new AbortController();
    const fetchOpts = { credentials: "include", signal: ctrl.signal };

    const p1 = fetch(`${API_BASE}/sales-analysis/summary-strip/?${params}`, fetchOpts)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("Sales summary:", data?.error || r.statusText);
          setSummary(null);
          return;
        }
        setSummary(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Sales summary fetch failed:", err);
          setSummary(null);
        }
      });

    const p2 = fetch(`${API_BASE}/sales-analysis/weekly-trend/?${params}`, fetchOpts)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("Weekly trend:", data?.error || r.statusText);
          setWeeklyTrend(null);
          return;
        }
        setWeeklyTrend(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Weekly trend fetch failed:", err);
          setWeeklyTrend(null);
        }
      });

    const p3 = fetch(`${API_BASE}/sales-analysis/revenue-charts/?${params}`, fetchOpts)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("Revenue charts:", data?.error || r.statusText);
          setRevenueCharts(null);
          return;
        }
        setRevenueCharts(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Revenue charts fetch failed:", err);
          setRevenueCharts(null);
        }
      });

    const p4 = fetch(`${API_BASE}/sales-analysis/month-summary/?${params}`, fetchOpts)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("Month summary:", data?.error || r.statusText);
          setMonthSummary(null);
          return;
        }
        setMonthSummary(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Month summary fetch failed:", err);
          setMonthSummary(null);
        }
      });

    const p5 = fetch(`${API_BASE}/sales-analysis/top-products/?${params}`, fetchOpts)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("Top products:", data?.error || r.statusText);
          setTopProductsRaw(null);
          return;
        }
        setTopProductsRaw(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Top products fetch failed:", err);
          setTopProductsRaw(null);
        }
      });

    const p6 = fetch(`${API_BASE}/sales-analysis/monthly-sales-trend/?${params}`, fetchOpts)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("Monthly sales trend:", data?.error || r.statusText);
          setMonthlyTrendData(null);
          return;
        }
        setMonthlyTrendData(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Monthly sales trend fetch failed:", err);
          setMonthlyTrendData(null);
        }
      });

    const p7 = fetch(`${API_BASE}/sales-analysis/bill-type-revenue/?${params}`, fetchOpts)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("Bill type revenue:", data?.error || r.statusText);
          setBillTypeRevenueData(null);
          return;
        }
        setBillTypeRevenueData(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Bill type revenue fetch failed:", err);
          setBillTypeRevenueData(null);
        }
      });

    const p8 = fetch(`${API_BASE}/sales-analysis/monthly-tax-trend/?${params}`, fetchOpts)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("Monthly tax trend:", data?.error || r.statusText);
          setMonthlyTaxData(null);
          return;
        }
        setMonthlyTaxData(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Monthly tax trend fetch failed:", err);
          setMonthlyTaxData(null);
        }
      });

    Promise.all([p1, p2, p3, p4, p5, p6, p7, p8]).finally(() => {
      if (!ctrl.signal.aborted) {
        setLoading(false);
      }
    });

    return () => ctrl.abort();
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
    setTableLoading(true);
    const params = new URLSearchParams({
      from: toIsoDate(dateRange.from),
      to: toIsoDate(dateRange.to),
    });
    if (invoiceBtype) params.set("btype", invoiceBtype);
    const ctrl = new AbortController();

    fetch(`${API_BASE}/sales-analysis/invoice-details/?${params}`, {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("Invoice details:", data?.error || r.statusText);
          setInvoiceRows([]);
          setInvoiceBtypes([]);
          return;
        }
        setInvoiceRows(data.rows ?? []);
        setInvoiceBtypes(data.btypes ?? []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Invoice details fetch failed:", err);
          setInvoiceRows([]);
          setInvoiceBtypes([]);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) {
          setTableLoading(false);
        }
      });

    return () => ctrl.abort();
  }, [dateRange.from, dateRange.to, invoiceBtype]);

  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));
  const resetFilters = () => {
    setDateRange({ from: new Date(2026, 0, 1), to: new Date(2026, 1, 28) });
    setSearchQuery("");
    setInvoiceBtype("");
    setSelectedCustomers([]);
    setFilters({ customer: "All Customers", product: "All Products", salesGroup: "Sales Group", rejection: "No" });
  };

  return (
    <div className="sa-root">

      {/* ── Page Header ── */}
      <div className="sa-page-header">
        <div className="sa-page-header__left">
          {/* <div className="sa-page-header__icon">📊</div> */}
          {/* <div>
            <h2 className="sa-page-header__title">Sales Analysis Report</h2>
            <p className="sa-page-header__sub">Jan – Feb 2026 · 24 Invoices · 5 Customers</p>
          </div> */}
        </div>
        {/* <div className="sa-page-header__badges">
          <span className="sa-badge sa-badge--blue">₹9.37L Total</span>
          <span className="sa-badge sa-badge--green">↑ Live</span>
        </div> */}
      </div>

      {/* ── Filter Section ── */}
      <div className="sa-filter-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', gap: '20px', padding: '16px 24px' }}>
        <div className="sa-filter-card__title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={14} strokeWidth={2.5} />
          Report Filters
        </div>
        <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(45, 109, 232, 0.15)', margin: '0 4px' }} />

        {/* Date Range */}
        <div className="sa-filter-item">
          <span className="sa-filter-label">Date Range</span>
          <SalesAnalysisDatePicker
            from={dateRange.from}
            to={dateRange.to}
            onChange={({ from, to }) => setDateRange({ from, to })}
          />
        </div>

        {/* Search */}
        <div className="sa-filter-item">
          <span className="sa-filter-label">Search</span>
          <div className="sa-search-wrapper">
            <Search className="sa-search-icon-inside" size={14} />
            <input
              type="text"
              className="sa-search-input"
              placeholder="Search no, customer, part..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="sa-search-clear-btn"
                style={{ position: 'absolute', right: '8px', zIndex: 10 }}
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* Customer Filter */}
        <div className="sa-filter-item" ref={customerDropdownRef}>
          <span className="sa-filter-label">Customer Name</span>
          <div className={`sa-custom-select sa-custom-select--customer${customerDropdownOpen ? " sa-active" : ""}`}>
            <button
              type="button"
              className="sa-custom-select-trigger"
              onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (!customerDropdownOpen) {
                    setCustomerDropdownOpen(true);
                    setCustomerFocusedIndex(0);
                  } else {
                    setCustomerFocusedIndex((prev) => (prev + 1) % (customerOptions.length + 1));
                  }
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (!customerDropdownOpen) {
                    setCustomerDropdownOpen(true);
                    setCustomerFocusedIndex(customerOptions.length);
                  } else {
                    setCustomerFocusedIndex((prev) => (prev - 1 + customerOptions.length + 1) % (customerOptions.length + 1));
                  }
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (customerDropdownOpen) {
                    if (customerFocusedIndex === 0) {
                      setSelectedCustomers([]);
                      setCustomerDropdownOpen(false);
                    } else if (customerFocusedIndex > 0 && customerFocusedIndex <= customerOptions.length) {
                      const opt = customerOptions[customerFocusedIndex - 1];
                      setSelectedCustomers((prev) => {
                        const isSel = prev.includes(opt);
                        return isSel ? prev.filter((c) => c !== opt) : [...prev, opt];
                      });
                    }
                  } else {
                    setCustomerDropdownOpen(true);
                  }
                } else if (e.key === "Escape") {
                  setCustomerDropdownOpen(false);
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedCustomers.length === 0
                    ? "All Customers"
                    : selectedCustomers.length === 1
                      ? selectedCustomers[0]
                      : `${selectedCustomers.length} Customers`}
                </span>
                {selectedCustomers.length > 1 && (
                  <span style={{
                    background: "#2d6de8",
                    color: "#fff",
                    borderRadius: "50%",
                    minWidth: "16px",
                    height: "16px",
                    fontSize: "0.62rem",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: "6px",
                    padding: "0 4px",
                    flexShrink: 0
                  }}>
                    {selectedCustomers.length}
                  </span>
                )}
              </span>
              <span className="sa-custom-select-arrow">
                <ChevronDown size={14} />
              </span>
            </button>
            {customerDropdownOpen && (
              <div className="sa-custom-select-dropdown-container" style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#fff',
                border: '1px solid rgba(45, 109, 232, 0.15)',
                borderRadius: '8px',
                marginTop: '4px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '8px', borderBottom: '1px solid rgba(45, 109, 232, 0.1)' }}>
                  <div className="sa-dropdown-search-wrapper">
                    <Search size={12} style={{ color: '#64748b', marginRight: '4px', flexShrink: 0 }} />
                    <input
                      type="text"
                      className="sa-dropdown-search-input"
                      placeholder="Search customer..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setCustomerFocusedIndex(0);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {customerSearch && (
                      <button
                        type="button"
                        className="sa-search-clear-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomerSearch("");
                          setCustomerFocusedIndex(0);
                        }}
                        title="Clear search"
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>

                <ul className="sa-custom-select-options" style={{
                  position: 'static',
                  boxShadow: 'none',
                  border: 'none',
                  animation: 'none',
                  maxHeight: "200px",
                  overflowY: "auto",
                  margin: 0,
                  padding: '5px',
                  listStyle: 'none'
                }}>
                  {filteredCustomerOptions.length === 0 ? (
                    <>
                      <li
                        className={`sa-custom-select-option${selectedCustomers.length === 0 ? " sa-multi-selected" : ""}${customerFocusedIndex === 0 ? " sa-focused" : ""}`}
                        onClick={() => {
                          setSelectedCustomers([]);
                          setCustomerDropdownOpen(false);
                        }}
                        onMouseEnter={() => setCustomerFocusedIndex(0)}
                        style={{ display: 'flex', alignItems: 'center' }}
                      >
                        <span className={`sa-checkbox-box${selectedCustomers.length === 0 ? " sa-checkbox-box--checked" : ""}`}>
                          {selectedCustomers.length === 0 && (
                            <Check size={10} strokeWidth={3} />
                          )}
                        </span>
                        All Customers
                      </li>
                      <li style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                        No customers found
                      </li>
                    </>
                  ) : (
                    <>
                      <li
                        className={`sa-custom-select-option${selectedCustomers.length === 0 ? " sa-multi-selected" : ""}${customerFocusedIndex === 0 ? " sa-focused" : ""}`}
                        onClick={() => {
                          setSelectedCustomers([]);
                          setCustomerDropdownOpen(false);
                        }}
                        onMouseEnter={() => setCustomerFocusedIndex(0)}
                        style={{ display: 'flex', alignItems: 'center' }}
                      >
                        <span className={`sa-checkbox-box${selectedCustomers.length === 0 ? " sa-checkbox-box--checked" : ""}`}>
                          {selectedCustomers.length === 0 && (
                            <Check size={10} strokeWidth={3} />
                          )}
                        </span>
                        All Customers
                      </li>
                      {filteredCustomerOptions.map((opt, idx) => {
                        const isSelected = selectedCustomers.includes(opt);
                        const itemIdx = idx + 1;
                        return (
                          <li
                            key={opt}
                            className={`sa-custom-select-option${isSelected ? " sa-multi-selected" : ""}${customerFocusedIndex === itemIdx ? " sa-focused" : ""}`}
                            onClick={() => {
                              setSelectedCustomers((prev) => {
                                const isSel = prev.includes(opt);
                                return isSel ? prev.filter((c) => c !== opt) : [...prev, opt];
                              });
                            }}
                            onMouseEnter={() => setCustomerFocusedIndex(itemIdx)}
                            style={{ display: 'flex', alignItems: 'center' }}
                          >
                            <span className={`sa-checkbox-box${isSelected ? " sa-checkbox-box--checked" : ""}`}>
                              {isSelected && (
                                <Check size={10} strokeWidth={3} />
                              )}
                            </span>
                            {opt}
                          </li>
                        );
                      })}
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Type */}
        <div className="sa-filter-item" ref={invoiceDropdownRef}>
          <span className="sa-filter-label">Invoice Type</span>
          <div className={`sa-custom-select${invoiceDropdownOpen ? " sa-active" : ""}`}>
            <button
              type="button"
              className="sa-custom-select-trigger"
              onClick={() => setInvoiceDropdownOpen(!invoiceDropdownOpen)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (!invoiceDropdownOpen) {
                    setInvoiceDropdownOpen(true);
                    setFocusedIndex(0);
                  } else {
                    setFocusedIndex((prev) => (prev + 1) % optionsList.length);
                  }
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (!invoiceDropdownOpen) {
                    setInvoiceDropdownOpen(true);
                    setFocusedIndex(optionsList.length - 1);
                  } else {
                    setFocusedIndex((prev) => (prev - 1 + optionsList.length) % optionsList.length);
                  }
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (invoiceDropdownOpen) {
                    if (focusedIndex >= 0 && focusedIndex < optionsList.length) {
                      setInvoiceBtype(optionsList[focusedIndex]);
                      setInvoiceDropdownOpen(false);
                    }
                  } else {
                    setInvoiceDropdownOpen(true);
                  }
                } else if (e.key === "Escape") {
                  setInvoiceDropdownOpen(false);
                }
              }}
            >
              <span>{invoiceBtype || "All Types"}</span>
              <span className="sa-custom-select-arrow">
                <ChevronDown size={14} />
              </span>
            </button>
            {invoiceDropdownOpen && (
              <ul className="sa-custom-select-options">
                {optionsList.map((opt, idx) => (
                  <li
                    key={opt || "all"}
                    className={`sa-custom-select-option${!opt && !invoiceBtype ? " sa-selected" : invoiceBtype === opt ? " sa-selected" : ""}${focusedIndex === idx ? " sa-focused" : ""}`}
                    onClick={() => {
                      setInvoiceBtype(opt);
                      setInvoiceDropdownOpen(false);
                    }}
                    onMouseEnter={() => setFocusedIndex(idx)}
                  >
                    {opt || "All Types"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Reset Filters */}
        <button
          type="button"
          className="sa-btn-reset"
          onClick={resetFilters}
        >
          <RotateCcw className="sa-btn-reset-icon" size={14} />
          Reset Filters
        </button>
      </div>

      {!loading && invoiceRows.length === 0 ? (
        <div className="sa-card sa-no-data-card" style={{ animationDelay: '0.1s' }}>
          <div className="sa-no-data-content">
            <div className="sa-no-data-icon-wrap">
              <Inbox size={48} className="sa-no-data-icon" />
            </div>
            <h3 className="sa-no-data-title">No Data found for this Period</h3>
            <p className="sa-no-data-sub">
              There are no transactions recorded between <strong>{dateRange.from ? dateRange.from.toLocaleDateString() : ""}</strong> and <strong>{dateRange.to ? dateRange.to.toLocaleDateString() : ""}</strong>.
            </p>
            <button className="sa-btn sa-btn--primary sa-no-data-btn" onClick={resetFilters}>
              Reset Date Range
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Summary Strip ── */}
          <div className="sa-summary-strip">
            {[
              { label: "Period", val: loading ? <div className="sa-skeleton" style={{ width: '75px', height: '14px', borderRadius: '4px' }} /> : derivedSummary?.period ?? "—", sm: true },
              { label: "Grand Total", val: loading ? <div className="sa-skeleton" style={{ width: '85px', height: '14px', borderRadius: '4px' }} /> : derivedSummary ? `₹${formatRupees(derivedSummary.grand_total)}` : "—" },
              { label: "Total Invoices", val: loading ? <div className="sa-skeleton" style={{ width: '35px', height: '14px', borderRadius: '4px' }} /> : derivedSummary ? String(derivedSummary.total_invoices) : "—" },
              { label: "Customers", val: loading ? <div className="sa-skeleton" style={{ width: '35px', height: '14px', borderRadius: '4px' }} /> : derivedSummary ? String(derivedSummary.customers) : "—" },
              { label: "Total Qty Sold", val: loading ? <div className="sa-skeleton" style={{ width: '55px', height: '14px', borderRadius: '4px' }} /> : derivedSummary ? formatQty(derivedSummary.total_qty_sold) : "—" },
              { label: "Avg Invoice", val: loading ? <div className="sa-skeleton" style={{ width: '85px', height: '14px', borderRadius: '4px' }} /> : derivedSummary ? `₹${formatRupees(derivedSummary.avg_invoice)}` : "—" },
              {
                label: "Turn Over",
                val: loading ? <div className="sa-skeleton" style={{ width: '65px', height: '14px', borderRadius: '4px' }} /> : derivedSummary ? `₹${Number(derivedSummary.turn_over_lakhs).toFixed(2)}L` : "—",
                green: true,
              },
            ].map((s, i) => (
              <div className="sa-summary-item" key={i}>
                <div className="sa-summary-item__label">{s.label}</div>
                <div className={`sa-summary-item__val${s.sm ? " sa-summary-item__val--sm" : ""}${s.green ? " sa-summary-item__val--green" : ""}`}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>

          {/* ── KPI Cards ── */}
          <div className="sa-kpi-grid">
            {kpiCards.map((k, i) => {
              const Icon = k.icon;
              return (
                <div className="sa-kpi-card" key={i} style={{ "--kpi-idx": i, borderTopColor: k.iconColor }}>
                  <div className="sa-kpi-card__glow" />
                  <div className="sa-kpi-card__icon" style={{ display: 'inline-flex', alignItems: 'center', color: k.iconColor }}>
                    <Icon size={22} />
                  </div>
                  <div className="sa-kpi-card__label">{k.label}</div>
                  <div className="sa-kpi-card__val">
                    {loading ? <div className="sa-skeleton" style={{ width: '60%', height: '24px', margin: '4px 0', borderRadius: '4px' }} /> : k.value}
                  </div>
                  <div className="sa-kpi-card__sub">
                    {loading ? <div className="sa-skeleton" style={{ width: '80%', height: '12px', margin: '4px 0', borderRadius: '3px' }} /> : k.sub}
                  </div>
                  {loading ? (
                    <div className="sa-skeleton" style={{ width: '40%', height: '12px', marginTop: '6px', borderRadius: '3px' }} />
                  ) : (
                    <span className={`sa-kpi-card__trend sa-kpi-card__trend--${k.type}`}>{k.trend}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Average Selling Rate KPI Cards (Row 2) ── */}
          <div className="sa-kpi-grid sa-kpi-grid--4col" style={{ marginTop: '-8px' }}>
            {avgRateCards.map((k, i) => {
              const Icon = k.icon;
              return (
                <div className="sa-kpi-card" key={i} style={{ "--kpi-idx": i + 5, borderTopColor: k.iconColor }}>
                  <div className="sa-kpi-card__glow" />
                  <div className="sa-kpi-card__icon" style={{ display: 'inline-flex', alignItems: 'center', color: k.iconColor }}>
                    <Icon size={22} />
                  </div>
                  <div className="sa-kpi-card__label">{k.label}</div>
                  <div className="sa-kpi-card__val">
                    {loading ? <div className="sa-skeleton" style={{ width: '60%', height: '24px', margin: '4px 0', borderRadius: '4px' }} /> : k.value}
                  </div>
                  <div className="sa-kpi-card__sub">
                    {loading ? <div className="sa-skeleton" style={{ width: '80%', height: '12px', margin: '4px 0', borderRadius: '3px' }} /> : k.sub}
                  </div>
                  {loading ? (
                    <div className="sa-skeleton" style={{ width: '40%', height: '12px', marginTop: '6px', borderRadius: '3px' }} />
                  ) : (
                    <span className={`sa-kpi-card__trend sa-kpi-card__trend--${k.type}`}>{k.trend}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Weekly Sales Trend (Full Width Row) ── */}
          <div className="sa-animate" style={{ marginBottom: "1.4rem" }}>
            <div className="sa-card sa-card--chart" style={{ width: "100%" }}>
              <div className="sa-card__head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={16} style={{ color: "#2d6de8" }} /> Weekly Sales Trend{!loading && weeklyTrend?.period ? ` (${weeklyTrend.period})` : !loading && summary?.period ? ` (${summary.period})` : ""}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="sa-chart-type-toggle">
                    <button
                      className={`sa-toggle-btn ${weeklyChartType === "combo" ? "active" : ""}`}
                      onClick={() => setWeeklyChartType("combo")}
                    >
                      Combo View
                    </button>
                    <button
                      className={`sa-toggle-btn ${weeklyChartType === "cumulative" ? "active" : ""}`}
                      onClick={() => setWeeklyChartType("cumulative")}
                    >
                      Cumulative View
                    </button>
                    <button
                      className={`sa-toggle-btn ${weeklyChartType === "weekly" ? "active" : ""}`}
                      onClick={() => setWeeklyChartType("weekly")}
                    >
                      Weekly View
                    </button>
                  </div>
                  <span className="sa-badge sa-badge--blue" style={{ margin: 0 }}>
                    {loading ? (
                      <div className="sa-skeleton" style={{ width: '50px', height: '10px' }} />
                    ) : weeklyTrend != null ? (
                      `₹${Number(weeklyTrend.turn_over_lakhs ?? 0).toFixed(2)}L Total`
                    ) : summary ? (
                      `₹${Number(summary.turn_over_lakhs ?? 0).toFixed(2)}L Total`
                    ) : "—"}
                  </span>
                </div>
              </div>
              {loading ? (
                <div className="sa-chart-skeleton"><div className="sa-skeleton" /></div>
              ) : (
                <div className="sa-chart-wrap" style={{ height: "300px" }}><canvas ref={trendRef} /></div>
              )}
            </div>
          </div>

          {/* ── Revenue by Customer & Product (Dual Column Row) ── */}
          <div className="sa-donuts-row sa-animate">
            {/* Customer Revenue Card */}
            <div className="sa-card sa-card--chart sa-card--donut">
              <div className="sa-card__head">
                <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={16} style={{ color: "#10b981" }} /> Revenue by Customer
                </span>
              </div>
              {loading ? (
                <div className="sa-chart-skeleton"><div className="sa-skeleton" /></div>
              ) : (
                <div className="sa-donut-layout">
                  <div className="sa-donut-chart-container">
                    <canvas ref={custRef} />
                    <div className="sa-donut-center-info">
                      {hoveredCustIndex !== -1 && custLabels[hoveredCustIndex] ? (
                        <>
                          <span className="sa-center-val">{custPercentages[hoveredCustIndex]?.toFixed(1)}%</span>
                          <span className="sa-center-lbl" title={custLabels[hoveredCustIndex]}>
                            {custLabels[hoveredCustIndex]}
                          </span>
                          <span className="sa-center-sub">
                            {getCustValue(custPercentages[hoveredCustIndex])}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="sa-center-val">
                            ₹{Number(derivedSummary?.turn_over_lakhs ?? 0).toFixed(2)}L
                          </span>
                          <span className="sa-center-lbl">Total Sales</span>
                          <span className="sa-center-sub">
                            {custLabels.length} Customers
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="sa-donut-legend">
                    {custLabels.map((lbl, idx) => (
                      <div
                        key={lbl}
                        className={`sa-legend-item ${hoveredCustIndex === idx ? 'active' : ''}`}
                        onMouseEnter={() => handleCustLegendHover(idx)}
                        onMouseLeave={handleCustLegendLeave}
                        title={lbl}
                      >
                        <div className="sa-legend-item-header">
                          <div
                            className="sa-legend-bullet"
                            style={{
                              background: `linear-gradient(135deg, ${GRADIENTS_CUSTOMER[idx % GRADIENTS_CUSTOMER.length].start}, ${GRADIENTS_CUSTOMER[idx % GRADIENTS_CUSTOMER.length].end})`
                            }}
                          />
                          <span className="sa-legend-name">{lbl}</span>
                          <span className="sa-legend-pct">{custPercentages[idx]?.toFixed(1)}%</span>
                        </div>
                        <div className="sa-legend-value-row">
                          <span className="sa-legend-val">{getCustValue(custPercentages[idx])}</span>
                        </div>
                        <div className="sa-legend-progress-bar">
                          <div
                            className="sa-legend-progress-fill"
                            style={{
                              width: `${custPercentages[idx]}%`,
                              background: `linear-gradient(90deg, ${GRADIENTS_CUSTOMER[idx % GRADIENTS_CUSTOMER.length].start}, ${GRADIENTS_CUSTOMER[idx % GRADIENTS_CUSTOMER.length].end})`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Product Revenue Card */}
            <div className="sa-card sa-card--chart sa-card--donut">
              <div className="sa-card__head">
                <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={16} style={{ color: "#f97316" }} /> Revenue by Product
                </span>
              </div>
              {loading ? (
                <div className="sa-chart-skeleton"><div className="sa-skeleton" /></div>
              ) : (
                <div className="sa-donut-layout">
                  <div className="sa-donut-chart-container">
                    <canvas ref={prodRef} />
                    <div className="sa-donut-center-info">
                      {hoveredProdIndex !== -1 && prodLabels[hoveredProdIndex] ? (
                        <>
                          <span className="sa-center-val">{prodPercentages[hoveredProdIndex]?.toFixed(1)}%</span>
                          <span className="sa-center-lbl" title={prodLabels[hoveredProdIndex]}>
                            {prodLabels[hoveredProdIndex]}
                          </span>
                          <span className="sa-center-sub">
                            {getProdQty(prodPercentages[hoveredProdIndex])}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="sa-center-val">
                            {Number(derivedSummary?.total_qty_sold ?? 0).toLocaleString("en-IN")}
                          </span>
                          <span className="sa-center-lbl">Total Qty</span>
                          <span className="sa-center-sub">
                            Units Sold
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="sa-donut-legend">
                    {prodLabels.map((lbl, idx) => (
                      <div
                        key={lbl}
                        className={`sa-legend-item ${hoveredProdIndex === idx ? 'active' : ''}`}
                        onMouseEnter={() => handleProdLegendHover(idx)}
                        onMouseLeave={handleProdLegendLeave}
                        title={lbl}
                      >
                        <div className="sa-legend-item-header">
                          <div
                            className="sa-legend-bullet"
                            style={{
                              background: `linear-gradient(135deg, ${GRADIENTS_PRODUCT[idx % GRADIENTS_PRODUCT.length].start}, ${GRADIENTS_PRODUCT[idx % GRADIENTS_PRODUCT.length].end})`
                            }}
                          />
                          <span className="sa-legend-name">{lbl}</span>
                          <span className="sa-legend-pct">{prodPercentages[idx]?.toFixed(1)}%</span>
                        </div>
                        <div className="sa-legend-value-row">
                          <span className="sa-legend-val">{getProdQty(prodPercentages[idx])}</span>
                        </div>
                        <div className="sa-legend-progress-bar">
                          <div
                            className="sa-legend-progress-fill"
                            style={{
                              width: `${prodPercentages[idx]}%`,
                              background: `linear-gradient(90deg, ${GRADIENTS_PRODUCT[idx % GRADIENTS_PRODUCT.length].start}, ${GRADIENTS_PRODUCT[idx % GRADIENTS_PRODUCT.length].end})`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Monthly Analytics Section ── */}
          <div className="sa-card sa-monthly-analytics-card">
            <div className="sa-card__head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={16} style={{ color: "#2d6de8" }} /> Monthly Performance & Bill Type Analytics
              </span>
              <div className="sa-chart-type-toggle">
                <button
                  className={`sa-toggle-btn ${performanceChartType === "bar" ? "active" : ""}`}
                  onClick={() => setPerformanceChartType("bar")}
                >
                  Bar View
                </button>
                <button
                  className={`sa-toggle-btn ${performanceChartType === "line" ? "active" : ""}`}
                  onClick={() => setPerformanceChartType("line")}
                >
                  Trend View
                </button>
                <button
                  className={`sa-toggle-btn ${performanceChartType === "share" ? "active" : ""}`}
                  onClick={() => setPerformanceChartType("share")}
                >
                  Share View
                </button>
              </div>
            </div>
            <div className="sa-monthly-charts-row">
              <div className="sa-monthly-chart-container" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h4 className="sa-chart-title" style={{ margin: 0 }}>
                    {performanceChartType === "share" ? "Sales Growth Rate (MoM)" : "Monthly Sales Trend (Value)"}
                  </h4>
                  {performanceChartType !== "share" && !loading && monthlyAvg > 0 && (
                    <span className="sa-badge sa-badge--purple" style={{ margin: 0, fontSize: '0.72rem', fontWeight: '700', padding: '3px 8px', borderRadius: '6px' }}>
                      ₹{monthlyAvg.toFixed(2)}L Avg
                    </span>
                  )}
                </div>
                {loading ? (
                  <div className="sa-chart-skeleton" style={{ height: '320px' }}><div className="sa-skeleton" /></div>
                ) : (
                  <div className="sa-chart-wrap" style={{ height: '320px' }}>
                    <canvas ref={monthlyTrendRef} />
                  </div>
                )}
              </div>
              <div className="sa-monthly-chart-container">
                <h4 className="sa-chart-title">
                  {performanceChartType === "share" ? "Bill Type Revenue Share (%)" : "Bill Type Revenue Contribution (Month-wise)"}
                </h4>
                {loading ? (
                  <div className="sa-chart-skeleton" style={{ height: '320px' }}><div className="sa-skeleton" /></div>
                ) : (
                  <div className="sa-chart-wrap" style={{ height: '320px' }}>
                    <canvas ref={billTypeRef} />
                  </div>
                )}
              </div>
              <div className="sa-monthly-chart-container">
                <h4 className="sa-chart-title">
                  {performanceChartType === "share"
                    ? "Effective Tax Rate (%)"
                    : (performanceChartType === "line" ? "Monthly Sales & Tax Correlation" : "Monthly Tax Trend (Value)")}
                </h4>
                {loading ? (
                  <div className="sa-chart-skeleton" style={{ height: '320px' }}><div className="sa-skeleton" /></div>
                ) : (
                  <div className="sa-chart-wrap" style={{ height: '320px' }}>
                    <canvas ref={taxRef} />
                  </div>
                )}
              </div>
            </div>
          </div>


          {/* ── Two-Col: Ranking + Month Summary ── */}
          <div className="sa-two-col">

            {/* Customer Ranking */}
            <div className="sa-card">
              <div className="sa-card__head">
                <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Trophy size={16} style={{ color: "#8b5cf6" }} /> Customer Revenue Ranking
                </span>
                <span className="sa-card__sub">by invoice value</span>
              </div>
              <div className="sa-rank-list">
                {loading ? (
                  [...Array(5)].map((_, idx) => (
                    <div className="sa-rank-row" key={idx} style={{ padding: '12px 20px' }}>
                      <div className="sa-rank-row__num"><div className="sa-skeleton" style={{ width: '12px', height: '12px' }} /></div>
                      <div className="sa-rank-row__name" style={{ flex: 1, margin: '0 12px' }}><div className="sa-skeleton" style={{ width: '70%', height: '12px' }} /></div>
                      <div className="sa-rank-row__amount" style={{ marginRight: '12px' }}><div className="sa-skeleton" style={{ width: '40px', height: '12px' }} /></div>
                      <div className="sa-rank-row__pct"><div className="sa-skeleton" style={{ width: '30px', height: '12px' }} /></div>
                    </div>
                  ))
                ) : (customerRanking.length ? customerRanking : [{ name: "—", barW: "0%", color: "#94a3b8", amount: "—", pct: "—" }]).map((c, i) => (
                  <div className="sa-rank-row" key={i} style={{ "--ri": i }}>
                    <div className="sa-rank-row__num">{i + 1}</div>
                    <div className="sa-rank-row__name">{c.name}</div>
                    <div className="sa-rank-row__bar-bg">
                      <div className="sa-rank-row__bar" style={{ width: c.barW, background: c.color }} />
                    </div>
                    <div className="sa-rank-row__amount">{c.amount}</div>
                    <div className="sa-rank-row__pct">{c.pct}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Month Summary */}
            <div className="sa-card sa-card--month">
              <div className="sa-card__head">
                <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} style={{ color: "#10b981" }} /> Month-wise Sales Summary
                </span>
                <span className="sa-badge sa-badge--green">
                  {loading ? (
                    <div className="sa-skeleton" style={{ width: '40px', height: '10px' }} />
                  ) : (
                    monthSummary?.period ?? summary?.period ?? "—"
                  )}
                </span>
              </div>
              <div className="sa-month-table-wrap sa-month-table-wrap--scroll">
                <table className="sa-mini-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="sa-num">Invoices</th>
                      <th className="sa-num">Qty Sold</th>
                      <th className="sa-num">Amount (₹)</th>
                      <th className="sa-num">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(4)].map((_, idx) => (
                        <tr key={idx}>
                          <td><div className="sa-skeleton" style={{ width: '60px', height: '12px' }} /></td>
                          <td><div className="sa-skeleton" style={{ width: '25px', height: '12px' }} /></td>
                          <td className="sa-num"><div className="sa-skeleton" style={{ width: '50px', height: '12px', marginLeft: 'auto' }} /></td>
                          <td className="sa-num"><div className="sa-skeleton" style={{ width: '70px', height: '12px', marginLeft: 'auto' }} /></td>
                          <td className="sa-num"><div className="sa-skeleton" style={{ width: '45px', height: '16px', borderRadius: '4px', marginLeft: 'auto' }} /></td>
                        </tr>
                      ))
                    ) : (
                      (() => {
                        const maxMonthAmount = Math.max(...(monthSummary?.rows?.map(r => r.amount || 0) || [1])) || 1;
                        return (monthSummary?.rows?.length ? monthSummary.rows : []).map((row, i) => (
                          <tr key={i} className="sa-month-row">
                            <td><strong className="sa-month-lbl">{row.month}</strong></td>
                            <td className="sa-num"><span className="sa-month-invoices">{row.invoices}</span></td>
                            <td className="sa-num">{formatQty(row.qty_sold)}</td>
                            <td className="sa-num">
                              <div className="sa-month-amt-val">{formatRupees(row.amount)}</div>
                              {row.amount > 0 && (
                                <div className="sa-month-amt-bar">
                                  <div
                                    className="sa-month-amt-bar-fill"
                                    style={{ width: `${(row.amount / maxMonthAmount) * 100}%` }}
                                  />
                                </div>
                              )}
                            </td>
                            <td className="sa-num">
                              {row.growth_pct == null ? (
                                <span className="sa-badge sa-badge--gray">—</span>
                              ) : row.growth_pct >= 0 ? (
                                <span className="sa-badge sa-badge--green sa-badge--growth">
                                  <span className="sa-growth-arrow">↑</span> {row.growth_pct}%
                                </span>
                              ) : (
                                <span className="sa-badge sa-badge--red sa-badge--growth">
                                  <span className="sa-growth-arrow">↓</span> {Math.abs(row.growth_pct)}%
                                </span>
                              )}
                            </td>
                          </tr>
                        ));
                      })()
                    )}
                    {!loading && !monthSummary?.rows?.length && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "#94a3b8" }}>—</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {loading ? (
                <div style={{ padding: '12px 20px' }}>
                  <div className="sa-skeleton" style={{ width: '100%', height: '24px', borderRadius: '4px' }} />
                </div>
              ) : monthSummary?.totals ? (
                <table className="sa-mini-table sa-mini-table--total">
                  <tbody>
                    <tr className="sa-mini-table__total">
                      <td><strong>Total</strong></td>
                      <td className="sa-num"><strong>{monthSummary.totals.invoices}</strong></td>
                      <td className="sa-num"><strong>{formatQty(monthSummary.totals.qty_sold)}</strong></td>
                      <td className="sa-num">
                        <div className="sa-month-total-amt">{formatRupees(monthSummary.totals.amount)}</div>
                      </td>
                      <td className="sa-num">—</td>
                    </tr>
                  </tbody>
                </table>
              ) : null}
              <div className="sa-inv-status">
                <div className="sa-inv-status__label">Invoice Status — No. of Invoices</div>
                <div className="sa-inv-status__row">
                  {loading ? (
                    [...Array(3)].map((_, idx) => (
                      <div key={idx} className="sa-inv-status__box" style={{ background: "#f8fafc", flex: 1, minWidth: '80px', padding: '10px' }}>
                        <div className="sa-skeleton" style={{ width: '60px', height: '10px', marginBottom: '6px' }} />
                        <div className="sa-skeleton" style={{ width: '30px', height: '14px' }} />
                      </div>
                    ))
                  ) : (monthSummary?.invoice_status ?? []).map((group) => (
                    <div
                      key={group.key}
                      className={`sa-inv-status__box sa-inv-status__box--group sa-inv-status__box--${group.key}`}
                    >
                      <div className="sa-inv-status__box-header">
                        <div className="sa-inv-status__box-lbl">{group.label}</div>
                        <div className="sa-inv-status__box-val">{group.total}</div>
                      </div>
                      <div className="sa-inv-status__items">
                        {group.items.map((item) => (
                          <div key={item.btype} className="sa-inv-status__item">
                            <span className="sa-inv-status__item-lbl">{item.btype}</span>
                            <span className="sa-inv-status__item-val">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!loading && !monthSummary?.invoice_status?.length && (
                    <>
                      {["With Material", "Labour Charges", "Export Only"].map((label) => (
                        <div key={label} className="sa-inv-status__box" style={{ background: "#f1f5f9" }}>
                          <div className="sa-inv-status__box-lbl" style={{ color: "#64748b" }}>{label}</div>
                          <div className="sa-inv-status__box-val" style={{ color: "#475569" }}>—</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Invoice Table ── */}
          <div className="sa-card sa-card--table">
            <div className="sa-card__head">
              <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} style={{ color: "#2d6de8" }} /> Invoice Details — All Transactions
              </span>
              <div className="sa-inv-head-actions">
                {tableLoading ? (
                  <div className="sa-skeleton" style={{ width: '120px', height: '18px', borderRadius: '4px' }} />
                ) : invoiceStats.lines > 0 && (
                  <div className="sa-inv-filter__meta">
                    <span className="sa-badge sa-badge--blue">{invoiceStats.lines} lines</span>
                    <span className="sa-badge sa-badge--green">{invoiceStats.invoices} invoices</span>
                  </div>
                )}
              </div>
            </div>
            <div className="sa-table-scroll">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Part No</th>
                    <th>Description</th>
                    <th className="sa-num">Qty</th>
                    <th className="sa-num">Rate (₹)</th>
                    <th className="sa-num">Amount (₹)</th>
                    <th className="sa-e-invoice">E.Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {tableLoading ? (
                    [...Array(6)].map((_, idx) => (
                      <tr key={idx}>
                        <td><div className="sa-skeleton" style={{ width: '80px', height: '12px' }} /></td>
                        <td><div className="sa-skeleton" style={{ width: '65px', height: '12px' }} /></td>
                        <td><div className="sa-skeleton" style={{ width: '140px', height: '12px' }} /></td>
                        <td><div className="sa-skeleton" style={{ width: '70px', height: '12px' }} /></td>
                        <td><div className="sa-skeleton" style={{ width: '160px', height: '12px' }} /></td>
                        <td className="sa-num"><div className="sa-skeleton" style={{ width: '40px', height: '12px', marginLeft: 'auto' }} /></td>
                        <td className="sa-num"><div className="sa-skeleton" style={{ width: '50px', height: '12px', marginLeft: 'auto' }} /></td>
                        <td className="sa-num"><div className="sa-skeleton" style={{ width: '75px', height: '12px', marginLeft: 'auto' }} /></td>
                        <td><div className="sa-skeleton" style={{ width: '50px', height: '12px' }} /></td>
                      </tr>
                    ))
                  ) : (
                    (filteredInvoices.length ? filteredInvoices : []).map((r, i) => (
                      <tr key={`${r.invoice_no}-${i}`} style={{ "--ri": i }}>
                        <td><strong className="sa-inv-no">{r.invoice_no || "—"}</strong></td>
                        <td className="sa-date">{formatInvDate(r.date)}</td>
                        <td>{r.customer || "—"}</td>
                        <td className="sa-part-no">{r.part_no || "—"}</td>
                        <td>{r.description || "—"}</td>
                        <td className="sa-num">{formatQty(r.qty)}</td>
                        <td className="sa-num">{formatRate(r.rate)}</td>
                        <td className="sa-num"><strong>{formatRate(r.amount)}</strong></td>
                        <td className="sa-e-invoice">{r.e_invoice || "—"}</td>
                      </tr>
                    ))
                  )}
                  {!tableLoading && !filteredInvoices.length && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", color: "#94a3b8" }}>—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="sa-action-bar">
              {/* <button className="sa-btn sa-btn--primary" onClick={() => alert("Exporting to Excel…")}>📥 Export Excel</button> */}
              {/* <button className="sa-btn sa-btn--primary" onClick={() => alert("Exporting to PDF…")}>📄 Export PDF</button> */}
              {/* <button className="sa-btn sa-btn--ghost" onClick={() => window.print()}>🖨️ Print</button> */}
            </div>
          </div>
          {/* ── Projection Table ── */}
          <div className="sa-card sa-card--table sa-proj-card">
            <div className="sa-card__head">
              <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={16} style={{ color: "#8b5cf6" }} /> Future Projections & Order Book Status
              </span>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span className="sa-badge sa-badge--purple">6 Active Customers</span>
                <span className="sa-badge sa-badge--blue" style={{ background: 'rgba(45, 109, 232, 0.08)', color: '#2d6de8', border: '1px solid rgba(45, 109, 232, 0.15)', fontSize: '0.84rem', padding: '6px 12px', fontWeight: '700' }}>Total Amt: ₹{formatRupees(projectionTotals.totAmt)}</span>
                <span className="sa-badge sa-badge--orange" style={{ background: 'rgba(249, 115, 22, 0.08)', color: '#ea580c', border: '1px solid rgba(249, 115, 22, 0.15)', fontSize: '0.84rem', padding: '6px 12px', fontWeight: '700' }}>Pending Value: ₹{formatRupees(projectionTotals.pendVal)}</span>
              </div>
            </div>
            {/* Order Book Analysis Combo Chart */}
            <div style={{ padding: '16px', borderBottom: '1px solid rgba(99, 102, 241, 0.08)' }}>
              <div className="sa-chart-wrap" style={{ height: '300px' }}>
                <canvas ref={projRef} />
              </div>
            </div>
            <div className="sa-table-scroll">
              <table className="sa-table sa-proj-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="sa-sortable" onClick={() => handleProjSort("customer")}>
                      Customer Name <SortIcon active={projSortField === "customer"} asc={projSortAsc} />
                    </th>
                    <th className="sa-sortable" onClick={() => handleProjSort("month")}>
                      Month <SortIcon active={projSortField === "month"} asc={projSortAsc} />
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handleProjSort("pos")}>
                      No. PO's <SortIcon active={projSortField === "pos"} asc={projSortAsc} />
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handleProjSort("totQty")}>
                      Tot Qty <SortIcon active={projSortField === "totQty"} asc={projSortAsc} />
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handleProjSort("totAmt")}>
                      Tot Amt (₹) <SortIcon active={projSortField === "totAmt"} asc={projSortAsc} />
                    </th>
                    <th className="sa-sortable" onClick={() => handleProjSort("schdMonth")}>
                      Schd Month <SortIcon active={projSortField === "schdMonth"} asc={projSortAsc} />
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handleProjSort("schdQty")}>
                      Schd Qty <SortIcon active={projSortField === "schdQty"} asc={projSortAsc} />
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handleProjSort("dispQty")}>
                      Dispatched Qty <SortIcon active={projSortField === "dispQty"} asc={projSortAsc} />
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handleProjSort("pendQty")}>
                      Pending Qty <SortIcon active={projSortField === "pendQty"} asc={projSortAsc} />
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handleProjSort("pendVal")}>
                      Pending Value (₹) <SortIcon active={projSortField === "pendVal"} asc={projSortAsc} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, idx) => (
                      <tr key={idx}>
                        <td><div className="sa-skeleton" style={{ width: '20px', height: '12px' }} /></td>
                        <td><div className="sa-skeleton" style={{ width: '180px', height: '12px' }} /></td>
                        <td><div className="sa-skeleton" style={{ width: '70px', height: '12px' }} /></td>
                        <td className="sa-num"><div className="sa-skeleton" style={{ width: '30px', height: '12px', marginLeft: 'auto' }} /></td>
                        <td className="sa-num"><div className="sa-skeleton" style={{ width: '50px', height: '12px', marginLeft: 'auto' }} /></td>
                        <td className="sa-num"><div className="sa-skeleton" style={{ width: '75px', height: '12px', marginLeft: 'auto' }} /></td>
                        <td><div className="sa-skeleton" style={{ width: '70px', height: '12px' }} /></td>
                        <td className="sa-num"><div className="sa-skeleton" style={{ width: '50px', height: '12px', marginLeft: 'auto' }} /></td>
                        <td className="sa-num"><div className="sa-skeleton" style={{ width: '50px', height: '12px', marginLeft: 'auto' }} /></td>
                        <td className="sa-num"><div className="sa-skeleton" style={{ width: '50px', height: '12px', marginLeft: 'auto' }} /></td>
                        <td className="sa-num"><div className="sa-skeleton" style={{ width: '70px', height: '12px', marginLeft: 'auto' }} /></td>
                      </tr>
                    ))
                  ) : (
                    <>
                      {sortedProjections.map((row, i) => (
                        <tr key={i} className="sa-proj-row" style={{ "--ri": i }}>
                          <td>{i + 1}</td>
                          <td><strong className="sa-proj-cust-name">{row.customer}</strong></td>
                          <td>{row.month}</td>
                          <td className="sa-num">{row.pos}</td>
                          <td className="sa-num">{formatQty(row.totQty)}</td>
                          <td className="sa-num">₹{formatRupees(row.totAmt)}</td>
                          <td>{row.schdMonth}</td>
                          <td className="sa-num">{formatQty(row.schdQty)}</td>
                          <td className="sa-num">{formatQty(row.dispQty)}</td>
                          <td className="sa-num">
                            {row.pendQty === 0 ? (
                              <span className="sa-badge sa-badge--green">Fully Dispatched</span>
                            ) : (
                              formatQty(row.pendQty)
                            )}
                          </td>
                          <td className="sa-num">
                            {row.pendVal === 0 ? (
                              <span className="sa-badge sa-badge--green">₹0</span>
                            ) : (
                              <span className={`sa-badge ${row.pendVal > 2000000 ? "sa-badge--red" : "sa-badge--orange"}`}>
                                ₹{formatRupees(row.pendVal)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Summary Row */}
                      <tr className="sa-proj-total-row">
                        <td colSpan={2}><strong>Total</strong></td>
                        <td></td>
                        <td className="sa-num"><strong>{projectionTotals.pos}</strong></td>
                        <td className="sa-num"><strong>{formatQty(projectionTotals.totQty)}</strong></td>
                        <td className="sa-num"><strong>₹{formatRupees(projectionTotals.totAmt)}</strong></td>
                        <td></td>
                        <td className="sa-num"><strong>{formatQty(projectionTotals.schdQty)}</strong></td>
                        <td className="sa-num"><strong>{formatQty(projectionTotals.dispQty)}</strong></td>
                        <td className="sa-num"><strong>{formatQty(projectionTotals.pendQty)}</strong></td>
                        <td className="sa-num"><strong>₹{formatRupees(projectionTotals.pendVal)}</strong></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Plan vs Actual Section ── */}
          <div className="sa-card sa-card--table sa-plan-actual-card sa-animate">
            <div className="sa-card__head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scale size={16} style={{ color: "#8b5cf6" }} />
                <span className="sa-card__title">Plan Vs Actual Performance Ledger</span>
              </div>
              <div className="sa-po-head-actions">
                {/* Search Input */}
                <div className="sa-po-search-wrapper">
                  <Search size={14} className="sa-po-search-icon" />
                  <input
                    type="text"
                    placeholder="Search Customer, Part..."
                    value={planSearchQuery}
                    onChange={(e) => setPlanSearchQuery(e.target.value)}
                    className="sa-po-search-input"
                  />
                  {planSearchQuery && (
                    <button onClick={() => setPlanSearchQuery("")} className="sa-po-search-clear">
                      &times;
                    </button>
                  )}
                </div>
                {/* KPI Suffixes */}
                <div className="sa-po-badges">
                  <span className="sa-badge sa-badge--purple">
                    Total Planned: {formatQty(planTotals.planned)}
                  </span>
                  <span className="sa-badge sa-badge--green">
                    Total Dispatched: {formatQty(planTotals.dispatched)}
                  </span>
                  <span className="sa-badge sa-badge--blue">
                    Avg Dispatch: {planTotals.avgPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Split layout: Chart top, Table bottom */}
            <div style={{ padding: '16px', borderBottom: '1px solid rgba(99, 102, 241, 0.08)' }}>
              <div className="sa-chart-wrap" style={{ height: '300px' }}>
                <canvas ref={planRef} />
              </div>
            </div>

            <div className="sa-table-scroll">
              <table className="sa-table sa-plan-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="sa-sortable" onClick={() => handlePlanSort("date")}>
                      Date <SortIcon active={planSortField === "date"} asc={planSortAsc} />
                    </th>
                    <th className="sa-sortable" onClick={() => handlePlanSort("customer")}>
                      Customer Name <SortIcon active={planSortField === "customer"} asc={planSortAsc} />
                    </th>
                    <th className="sa-sortable" onClick={() => handlePlanSort("partNoDesc")}>
                      PartNo - Description <SortIcon active={planSortField === "partNoDesc"} asc={planSortAsc} />
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handlePlanSort("planQty")}>
                      Plan Qty <SortIcon active={planSortField === "planQty"} asc={planSortAsc} />
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handlePlanSort("availableQty")}>
                      Available Qty <SortIcon active={planSortField === "availableQty"} asc={planSortAsc} />
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handlePlanSort("dispatchQty")}>
                      Dispatch Qty <SortIcon active={planSortField === "dispatchQty"} asc={planSortAsc} />
                    </th>
                    <th className="sa-sortable" onClick={() => handlePlanSort("status")}>
                      Dispatch Status <SortIcon active={planSortField === "status"} asc={planSortAsc} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlanVsActual.length ? (
                    sortedPlanVsActual.map((row, i) => {
                      const pct = row.planQty > 0 ? (row.dispatchQty / row.planQty) * 100 : 0;
                      let statusText = "Not Started";
                      let badgeClass = "sa-badge--red";
                      if (pct === 100) {
                        statusText = "Complete";
                        badgeClass = "sa-badge--green";
                      } else if (pct > 0) {
                        statusText = "In Progress";
                        badgeClass = "sa-badge--orange";
                      }
                      
                      return (
                        <tr key={i} className="sa-po-row" style={{ "--ri": i }}>
                          <td>{i + 1}</td>
                          <td className="sa-date">{formatToMmDdYyyy(row.date)}</td>
                          <td><span className="sa-po-cust-name" title={row.customer}>{row.customer}</span></td>
                          <td><span className="sa-po-part-desc" title={row.partNoDesc}>{row.partNoDesc}</span></td>
                          <td className="sa-num">{formatQty(row.planQty)}</td>
                          <td className="sa-num">{formatQty(row.availableQty)}</td>
                          <td className="sa-num">{formatQty(row.dispatchQty)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className={`sa-badge ${badgeClass}`} style={{ minWidth: '75px', textAlign: 'center' }}>
                                {statusText} ({pct.toFixed(0)}%)
                              </span>
                              <div className="sa-legend-progress-bar" style={{ width: '80px', margin: 0, height: '6px', background: '#e2e8f0' }}>
                                <div
                                  className="sa-legend-progress-fill"
                                  style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    borderRadius: '99px',
                                    background: pct === 100 
                                      ? 'linear-gradient(90deg, #10b981, #34d399)' 
                                      : pct > 0 
                                        ? 'linear-gradient(90deg, #f97316, #fb923c)' 
                                        : '#ef4444',
                                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", color: "#94a3b8" }}>No data matching filters</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Traceability Table ── */}
          <div className="sa-card sa-card--table sa-trace-card">
            <div className="sa-card__head">
              <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Link size={16} style={{ color: "#06b6d4" }} /> End-to-End Order Traceability Ledger
              </span>
              {/* <span className="sa-badge sa-badge--cyan">Trace Status - Active</span> */}
            </div>
            <div className="sa-table-scroll">
              <table className="sa-table sa-trace-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer Name</th>
                    <th>Invoice No</th>
                    <th>Invoice Date</th>
                    <th>Dc No</th>
                    <th>Dc Date</th>
                    <th>GRN/PO Det</th>
                    <th>Routecard No</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, idx) => (
                      <tr key={idx}>
                        <td><div className="sa-skeleton" style={{ width: '20px', height: '12px' }} /></td>
                        <td><div className="sa-skeleton" style={{ width: '160px', height: '12px' }} /></td>
                        <td><div className="sa-skeleton" style={{ width: '80px', height: '12px' }} /></td>
                        <td><div className="sa-skeleton" style={{ width: '65px', height: '12px' }} /></td>
                        <td><div className="sa-skeleton" style={{ width: '80px', height: '12px' }} /></td>
                        <td><div className="sa-skeleton" style={{ width: '65px', height: '12px' }} /></td>
                        <td><div className="sa-skeleton" style={{ width: '80px', height: '12px' }} /></td>
                        <td><div className="sa-skeleton" style={{ width: '80px', height: '12px' }} /></td>
                      </tr>
                    ))
                  ) : (
                    MOCK_TRACEABILITY.map((row, i) => (
                      <tr key={i} className="sa-trace-row" style={{ "--ri": i }}>
                        <td>{i + 1}</td>
                        <td><strong className="sa-trace-cust-name">{row.customer}</strong></td>
                        <td><strong className="sa-trace-inv">{row.invNo}</strong></td>
                        <td className="sa-date">{formatToMmDdYyyy(row.invDate)}</td>
                        <td>{row.dcNo}</td>
                        <td className="sa-date">{formatToMmDdYyyy(row.dcDate)}</td>
                        <td><span className="sa-trace-po">{row.grnPo}</span></td>
                        <td><span className="sa-trace-code">{row.rcNo}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── PO Ledger Table ── */}
          <div className="sa-card sa-card--table sa-po-card sa-animate">
            <div className="sa-card__head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} style={{ color: "#ec4899" }} />
                <span className="sa-card__title">Purchase Order (PO) Ledger</span>
              </div>

              <div className="sa-po-head-actions">
                {/* Search Input */}
                <div className="sa-po-search-wrapper">
                  <Search size={14} className="sa-po-search-icon" />
                  <input
                    type="text"
                    placeholder="Search PO No, Customer, Part..."
                    value={poSearchQuery}
                    onChange={(e) => {
                      setPoSearchQuery(e.target.value);
                      setPoPage(1);
                    }}
                    className="sa-po-search-input"
                  />
                  {poSearchQuery && (
                    <button onClick={() => { setPoSearchQuery(""); setPoPage(1); }} className="sa-po-search-clear">
                      &times;
                    </button>
                  )}
                </div>

                {/* Pending Only Switch */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => { setPoPendingOnly(!poPendingOnly); setPoPage(1); }}>
                  <div className={`sa-po-toggle-switch ${poPendingOnly ? 'active' : ''}`} style={{
                    width: '36px',
                    height: '20px',
                    backgroundColor: poPendingOnly ? '#db2777' : '#cbd5e1',
                    borderRadius: '99px',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}>
                    <div className="sa-po-toggle-handle" style={{
                      width: '14px',
                      height: '14px',
                      backgroundColor: '#fff',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '3px',
                      left: poPendingOnly ? '19px' : '3px',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                    }} />
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#475569' }}>Pending Only</span>
                </div>

                {/* Badges and Totals */}
                <div className="sa-po-badges">
                  {/* <span className="sa-badge sa-badge--purple">{filteredPoLedger.length} POs</span> */}
                  <span className="sa-badge sa-badge--blue" title="Filtered PO total value">
                    Val: ₹{formatRupees(poTotals.totVal)}
                  </span>
                  <span className="sa-badge sa-badge--orange" title="Filtered Pending value">
                    Pend: ₹{formatRupees(poTotals.totPendVal)}
                  </span>
                </div>

                {/* CSV Export Button */}
                <button onClick={handlePoExport} className="sa-btn sa-btn--primary sa-po-export-btn" title="Export PO Ledger to CSV" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>

            <div className="sa-table-scroll">
              <table className="sa-table sa-po-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="sa-sortable" onClick={() => handlePoSort("type")}>
                      Type {poSortField === "type" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-sortable" onClick={() => handlePoSort("apoNo")}>
                      Apono {poSortField === "apoNo" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-sortable" onClick={() => handlePoSort("poNo")}>
                      Po No {poSortField === "poNo" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-sortable" onClick={() => handlePoSort("poDate")}>
                      Po Date {poSortField === "poDate" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-sortable" onClick={() => handlePoSort("custName")}>
                      Cust Name {poSortField === "custName" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-sortable" onClick={() => handlePoSort("partDesc")}>
                      PartNO - Description {poSortField === "partDesc" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-sortable" onClick={() => handlePoSort("poSlNo")}>
                      Po Sl.No {poSortField === "poSlNo" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handlePoSort("qty")}>
                      Qty {poSortField === "qty" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handlePoSort("shortCloseQty")}>
                      Short Close Qty {poSortField === "shortCloseQty" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handlePoSort("rate")}>
                      Rate {poSortField === "rate" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handlePoSort("value")}>
                      Value {poSortField === "value" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-sortable" onClick={() => handlePoSort("dcNo")}>
                      Dc.NO {poSortField === "dcNo" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-sortable" onClick={() => handlePoSort("dcDate")}>
                      Dc Dt {poSortField === "dcDate" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handlePoSort("dcQty")}>
                      Dc Qty {poSortField === "dcQty" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handlePoSort("pendingQty")}>
                      Pending Qty {poSortField === "pendingQty" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handlePoSort("pendingValue")}>
                      Pending Value {poSortField === "pendingValue" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th className="sa-num sa-sortable" onClick={() => handlePoSort("ageDays")}>
                      Age Days {poSortField === "ageDays" && (poSortAsc ? "▲" : "▼")}
                    </th>
                    <th>Invoice No & Dt</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPoLedger.length ? (
                    paginatedPoLedger.map((row, i) => {
                      const absoluteRowIdx = (poPage - 1) * poPageSize + i + 1;
                      return (
                        <tr key={`${row.poNo}-${i}`} className="sa-po-row" style={{ "--ri": i }}>
                          <td>{absoluteRowIdx}</td>
                          <td>
                            <span className={`sa-badge sa-badge--type-${row.type.toLowerCase().replace(/[^a-z]/g, "")}`}>
                              {row.type}
                            </span>
                          </td>
                          <td><span className="sa-po-apo-code">{row.apoNo}</span></td>
                          <td><strong className="sa-po-code">{row.poNo}</strong></td>
                          <td className="sa-date">{formatToMmDdYyyy(row.poDate)}</td>
                          <td><span className="sa-po-cust-name" title={row.custName}>{row.custName}</span></td>
                          <td><span className="sa-po-part-desc" title={row.partDesc}>{row.partDesc}</span></td>
                          <td><span className="sa-po-sl-no" style={{ fontWeight: '600', color: '#475569' }}>{row.poSlNo || "—"}</span></td>
                          <td className="sa-num">{formatQty(row.qty)}</td>
                          <td className="sa-num">{formatQty(row.shortCloseQty)}</td>
                          <td className="sa-num">₹{formatQty(row.rate)}</td>
                          <td className="sa-num"><strong>₹{formatRupees(row.value)}</strong></td>
                          <td>
                            {row.dcNo === "—" ? (
                              <span className="sa-dash-gray">—</span>
                            ) : (
                              <strong className="sa-po-dc-code">{row.dcNo}</strong>
                            )}
                          </td>
                          <td className="sa-date">{formatToMmDdYyyy(row.dcDate)}</td>
                          <td className="sa-num">{formatQty(row.dcQty)}</td>
                          <td className="sa-num">
                            {row.pendingQty === 0 ? (
                              <span className="sa-badge sa-badge--green">Fully Dispatched</span>
                            ) : (
                              formatQty(row.pendingQty)
                            )}
                          </td>
                          <td className="sa-num">
                            {row.pendingValue === 0 ? (
                              <span className="sa-badge sa-badge--green">₹0</span>
                            ) : (
                              <span className={`sa-badge ${row.pendingValue > 500000 ? "sa-badge--red" : "sa-badge--orange"}`}>
                                ₹{formatRupees(row.pendingValue)}
                              </span>
                            )}
                          </td>
                          <td className="sa-num">
                            {row.ageDays === 0 ? (
                              "—"
                            ) : (
                              <span className={`sa-po-age ${row.ageDays > 45 ? "sa-po-age--old" : row.ageDays > 30 ? "sa-po-age--medium" : "sa-po-age--young"}`}>
                                {row.ageDays} days
                              </span>
                            )}
                          </td>
                          <td>
                            {row.invNoDt === "—" ? (
                              <span className="sa-dash-gray">—</span>
                            ) : (
                              <span className="sa-po-inv-details">{formatToMmDdYyyy(row.invNoDt)}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={18} style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>
                        No purchase orders found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPoPages > 1 && (
              <div className="sa-po-pagination">
                <button
                  onClick={() => setPoPage(p => Math.max(1, p - 1))}
                  disabled={poPage === 1}
                  className="sa-pagination-btn"
                >
                  ◀ Previous
                </button>
                <div className="sa-pagination-pages">
                  {[...Array(totalPoPages)].map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPoPage(idx + 1)}
                      className={`sa-pagination-page-btn ${poPage === idx + 1 ? 'active' : ''}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPoPage(p => Math.min(totalPoPages, p + 1))}
                  disabled={poPage === totalPoPages}
                  className="sa-pagination-btn"
                >
                  Next ▶
                </button>
              </div>
            )}
          </div>

          {/* ── Two-Col: Top Products + Insights ── */}
          <div className="sa-two-col">

            {/* Top Products */}
            <div className="sa-card">
              <div className="sa-card__head">
                <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={16} style={{ color: "#f97316" }} /> Top Products by Revenue
                </span>
                <span className="sa-card__sub">
                  {loading ? (
                    <div className="sa-skeleton" style={{ width: '40px', height: '10px' }} />
                  ) : (
                    topProductsRaw?.period ?? summary?.period ?? "—"
                  )}
                </span>
              </div>
              <div className="sa-prod-list">
                {loading ? (
                  [...Array(5)].map((_, idx) => (
                    <div className="sa-prod-row" key={idx} style={{ padding: '12px 20px' }}>
                      <div className="sa-prod-row__info" style={{ flex: 1 }}>
                        <div className="sa-skeleton" style={{ width: '80%', height: '12px', marginBottom: '6px' }} />
                        <div className="sa-skeleton" style={{ width: '40%', height: '10px' }} />
                      </div>
                      <div className="sa-prod-row__qty" style={{ margin: '0 12px' }}><div className="sa-skeleton" style={{ width: '40px', height: '12px' }} /></div>
                      <div className="sa-prod-row__amount"><div className="sa-skeleton" style={{ width: '50px', height: '12px' }} /></div>
                    </div>
                  ))
                ) : (topProducts.length ? topProducts : [{ name: "—", code: "—", barW: "0%", color: "#94a3b8", qty: "—", amount: "—" }]).map((p, i) => (
                  <div className="sa-prod-row" key={i} style={{ "--pi": i }}>
                    <div className="sa-prod-row__info">
                      <div className="sa-prod-row__name">{p.name}</div>
                      <div className="sa-prod-row__code">{p.code}</div>
                    </div>
                    <div className="sa-prod-row__bar-bg">
                      <div className="sa-prod-row__bar" style={{ width: p.barW, background: p.color }} />
                    </div>
                    <div className="sa-prod-row__qty">{p.qty}</div>
                    <div className="sa-prod-row__amount">{p.amount}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div className="sa-card">
              <div className="sa-card__head">
                <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Lightbulb size={16} style={{ color: "#eab308" }} /> Management Insights
                </span>
                <span className="sa-badge sa-badge--orange">5 Key Points</span>
              </div>
              <div className="sa-insight-list">
                {INSIGHTS.map((ins, i) => {
                  const IconComp = ins.icon;
                  return (
                    <div className="sa-insight-row" key={i} style={{ "--ii": i }}>
                      <div className="sa-insight-row__icon" style={{ display: "inline-flex", alignItems: "center", color: ins.iconColor, marginTop: "2px" }}>
                        <IconComp size={16} />
                      </div>
                      <div className="sa-insight-row__body">
                        <div className="sa-insight-row__title">{ins.title}</div>
                        <div className="sa-insight-row__sub">{ins.sub}</div>
                      </div>
                      <div className="sa-insight-row__val" style={{ color: ins.valColor }}>{ins.val}</div>
                    </div>
                  );
                })}
              </div>
              <div className="sa-priority-box">
                <div className="sa-priority-box__title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Pin size={14} style={{ color: "#ef4444", transform: "rotate(45deg)" }} /> Priority Action for Management
                </div>
                <div className="sa-priority-box__body">
                  Feb sales slump needs immediate attention. Confirm pending orders from{" "}
                  <strong>VR Foundries</strong> and <strong>Vasanthi Foundry</strong> for March delivery
                  schedule. Also review SS Round Bar pricing — currently below contribution margin threshold.
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}