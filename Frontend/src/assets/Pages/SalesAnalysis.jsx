import { useEffect, useMemo, useRef, useState, useCallback, Fragment } from "react";
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
  X,
  Play,
  Printer
} from "lucide-react";
import "./SalesAnalysis.css";
import SalesAnalysisDatePicker from "./SalesAnalysisDatePicker";

Chart.register(...registerables, ChartDataLabels);

const API_BASE = resolveApiBase();

function toIsoDate(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return "";
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

function formatExactRupees(rupees) {
  const amount = Number(rupees);
  if (!Number.isFinite(amount)) return "—";
  return amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatQty(qty) {
  const n = Number(qty);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatExact(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function safeToFixed(v, digits = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(digits);
}




function formatLakhs(rupees, decimals = 3) {
  const n = Number(rupees);
  if (!Number.isFinite(n)) return "—";
  return `${(n / 100_000).toFixed(decimals)}L`;
}

function formatLakhsFloor(rupees, decimals = 3) {
  const n = Number(rupees);
  if (!Number.isFinite(n)) return "—";
  const factor = Math.pow(10, decimals);
  const truncated = Math.floor((n / 100_000) * factor) / factor;
  return `${truncated.toFixed(decimals)}L`;
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
  return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
}

function formatToDdMmYyyy(dateStr) {
  if (!dateStr || dateStr === "—" || dateStr === "-") return dateStr;
  const s = String(dateStr).trim();
  // Convert any YYYY-MM-DD format to DD/MM/YYYY
  return s.replace(/(\d{4})-(\d{2})-(\d{2})/g, "$3/$2/$1");
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
      value: `₹${formatLakhsFloor(summary.top_product_revenue)}`,
      sub: summary.top_product_name || "—",
      trend: `${summary.top_product_pct ?? 0}% of total`,
      type: "up",
    },
    {
      ...KPI_CARD_META[3],
      value: `₹${formatLakhsFloor(summary.top_customer_revenue)}`,
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
    amount: `₹${(Math.floor(Number(p.revenue_lakhs) * 1000) / 1000).toFixed(3)}L`,
  }));
}

function buildDynamicInsights({ summary, monthSummary, revenueCharts, topProductsRaw, filteredInvoices }) {
  const insights = [];
  if (!summary && !filteredInvoices?.length && !monthSummary?.rows?.length) {
    return {
      insights: [
        { icon: Info, iconColor: "#2d6de8", title: "Sales Data Loading", sub: "Calculating real-time management insights...", val: "—", valColor: "#64748b" },
      ],
      priorityActionText: "Loading real-time sales data and insights...",
    };
  }

  // 1. Top Customer & Concentration
  const custRank = revenueCharts?.customer_ranking || [];
  const topCust = custRank.length > 0 ? custRank[0] : null;
  if (topCust) {
    const isDominant = topCust.pct >= 40;
    insights.push({
      icon: isDominant ? Info : Building2,
      iconColor: isDominant ? "#15803d" : "#2d6de8",
      title: `${topCust.name} ${isDominant ? "drives majority revenue" : "is top revenue customer"}`,
      sub: `${topCust.pct}% of total sales (₹${topCust.revenue_lakhs}L)${isDominant ? " — single-customer concentration. Recommend exploring deeper engagement." : " — primary contributor to overall sales revenue."}`,
      val: `₹${topCust.revenue_lakhs}L`,
      valColor: isDominant ? "#15803d" : "#2d6de8",
    });
  } else {
    insights.push({
      icon: Building2,
      iconColor: "#2d6de8",
      title: "Customer Revenue Distribution",
      sub: "No single customer dominance detected for this selected period.",
      val: "—",
      valColor: "#64748b",
    });
  }

  // 2. Revenue Trend & MoM Growth
  const mRows = monthSummary?.rows || [];
  if (mRows.length >= 2) {
    const latest = mRows[mRows.length - 1];
    const prev = mRows[mRows.length - 2];
    const growth = latest.growth_pct;
    const latestAmtLakhs = (latest.amount / 100_000).toFixed(2);
    const prevAmtLakhs = (prev.amount / 100_000).toFixed(2);

    if (growth != null && growth < 0) {
      const absGrowth = Math.abs(growth);
      insights.push({
        icon: TrendingDown,
        iconColor: "#92400e",
        title: `${latest.month} sales down vs ${prev.month}`,
        sub: `${latest.month} ₹${latestAmtLakhs}L vs ${prev.month} ₹${prevAmtLakhs}L (↓${absGrowth}%). Investigate order pipeline and delivery drop.`,
        val: `↓${absGrowth}%`,
        valColor: "#92400e",
      });
    } else if (growth != null && growth > 0) {
      insights.push({
        icon: TrendingUp,
        iconColor: "#15803d",
        title: `${latest.month} sales up vs ${prev.month}`,
        sub: `${latest.month} ₹${latestAmtLakhs}L vs ${prev.month} ₹${prevAmtLakhs}L (↑${growth}%). Strong revenue expansion across primary categories.`,
        val: `↑${growth}%`,
        valColor: "#15803d",
      });
    } else {
      insights.push({
        icon: TrendingUp,
        iconColor: "#2d6de8",
        title: `${latest.month} sales momentum steady`,
        sub: `${latest.month} turnover reached ₹${latestAmtLakhs}L across ${latest.invoices} invoices.`,
        val: `₹${latestAmtLakhs}L`,
        valColor: "#2d6de8",
      });
    }
  } else if (summary) {
    insights.push({
      icon: IndianRupee,
      iconColor: "#2d6de8",
      title: `Average Invoice Realization: ₹${formatRupees(summary.avg_invoice)}`,
      sub: `Generated ₹${Number(summary.turn_over_lakhs).toFixed(3)}L turnover across ${summary.total_invoices} total invoices in this period.`,
      val: `₹${formatRupees(summary.avg_invoice)}`,
      valColor: "#2d6de8",
    });
  }

  // 3. Top Revenue Product
  let prodRows = topProductsRaw?.products || topProductsRaw?.rows || [];
  if (filteredInvoices && filteredInvoices.length > 0) {
    const prodMap = {};
    filteredInvoices.forEach((r) => {
      const key = r.part_no || r.description || "Unknown";
      if (!prodMap[key]) {
        prodMap[key] = {
          description: r.description || r.part_no || "—",
          part_no: r.part_no || "—",
          qty: 0,
          revenue: 0,
          uom: r.uom || "NOS",
        };
      }
      prodMap[key].qty += Number(r.qty || 0);
      prodMap[key].revenue += Number(r.amount || 0);
    });

    prodRows = Object.values(prodMap)
      .sort((a, b) => b.revenue - a.revenue)
      .map((p) => ({
        ...p,
        revenue_lakhs: (p.revenue / 100_000).toFixed(2),
      }));
  }

  const topProd = prodRows.length > 0 ? prodRows[0] : null;
  if (topProd) {
    const totalProdRev = prodRows.reduce((sum, p) => sum + (p.revenue || 0), 0);
    const prodShare = totalProdRev > 0 ? ((topProd.revenue / totalProdRev) * 100).toFixed(1) : "0";
    const prodName = topProd.description || topProd.part_no || "Top Product";
    const prodLakhs = topProd.revenue_lakhs || (topProd.revenue ? (topProd.revenue / 100_000).toFixed(2) : "0");
    insights.push({
      icon: Package,
      iconColor: "#1d4ed8",
      title: `${prodName} is top revenue product`,
      sub: `₹${prodLakhs}L (${prodShare}%) — capacity planning and raw material stocking should prioritize this line.`,
      val: `${prodShare}%`,
      valColor: "#1d4ed8",
    });
  } else {
    insights.push({
      icon: Package,
      iconColor: "#1d4ed8",
      title: "Product Portfolio Mix",
      sub: "Revenue distributed across active product catalog lines.",
      val: "—",
      valColor: "#64748b",
    });
  }

  // 4. Growth Potential / Secondary Customer
  const secondCust = custRank.length > 1 ? custRank[1] : null;
  if (secondCust) {
    insights.push({
      icon: TrendingUp,
      iconColor: "#c2410c",
      title: `${secondCust.name} showing growth contribution`,
      sub: `Contributed ₹${secondCust.revenue_lakhs}L (${secondCust.pct}% share of total revenue). Scale engagement to grow share.`,
      val: `${secondCust.pct}%`,
      valColor: "#c2410c",
    });
  } else if (summary) {
    insights.push({
      icon: Building2,
      iconColor: "#c2410c",
      title: "Active Customer Accounts",
      sub: `${summary.customers} active client account(s) contributing to total sales turnover of ₹${Number(summary.turn_over_lakhs).toFixed(3)}L.`,
      val: `${summary.customers} Clients`,
      valColor: "#c2410c",
    });
  }

  // 5. Unit Realization / Low Price Item Alert
  let lowItem = null;
  if (filteredInvoices?.length) {
    const validItems = filteredInvoices.filter(i => i.qty > 0 && i.rate > 0);
    if (validItems.length) {
      const sortedByRate = [...validItems].sort((a, b) => a.rate - b.rate);
      lowItem = sortedByRate[0];
    }
  }

  if (lowItem) {
    const itemName = lowItem.description || lowItem.part_no || "Product";
    const itemRate = Number(lowItem.rate).toFixed(2);
    const itemQty = formatQty(lowItem.qty);
    const itemTotal = formatRupees(lowItem.amount);
    insights.push({
      icon: AlertTriangle,
      iconColor: "#b91c1c",
      title: `${itemName} — unit rate observation`,
      sub: `₹${itemRate}/unit on ${itemQty} units = ₹${itemTotal} total. Review pricing strategy and contribution margin for this product line.`,
      val: `₹${itemRate}`,
      valColor: "#b91c1c",
    });
  } else {
    insights.push({
      icon: Scale,
      iconColor: "#b91c1c",
      title: "Unit Price Realization",
      sub: "Healthy realization rate maintained across active sales transactions.",
      val: "Optimal",
      valColor: "#15803d",
    });
  }

  // Priority Action for Management Text
  let priorityActionText = "";
  const mRowsPriority = monthSummary?.rows || [];
  const lastM = mRowsPriority.length >= 2 ? mRowsPriority[mRowsPriority.length - 1] : null;
  const topC = custRank.length > 0 ? custRank[0] : null;
  const secondC = custRank.length > 1 ? custRank[1] : null;
  const topP = prodRows.length > 0 ? prodRows[0] : null;

  if (lastM && lastM.growth_pct != null && lastM.growth_pct < 0) {
    priorityActionText = `${lastM.month} sales drop (↓${Math.abs(lastM.growth_pct)}%) needs immediate attention. Confirm pending delivery schedules from ${topC ? topC.name : "top clients"}${secondC ? ` and ${secondC.name}` : ""}.`;
    if (lowItem) {
      priorityActionText += ` Also review ${lowItem.description || lowItem.part_no} pricing (₹${Number(lowItem.rate).toFixed(2)}/unit) — ensure it meets target contribution margin thresholds.`;
    }
  } else if (lastM && lastM.growth_pct != null && lastM.growth_pct > 0) {
    priorityActionText = `Sales trend is positive (+${lastM.growth_pct}% in ${lastM.month}). Prioritize production planning for top product ${topP ? (topP.description || topP.part_no) : "key products"} and secure delivery commitments from ${topC ? topC.name : "primary accounts"}.`;
    if (lowItem) {
      priorityActionText += ` Review unit pricing margins for ${lowItem.description || lowItem.part_no} to ensure sustainable profitability.`;
    }
  } else {
    priorityActionText = `Focus on driving top-line revenue growth and reducing single-account concentration. Strengthen fulfillment for ${topC ? topC.name : "key accounts"} while expanding capacity for ${topP ? (topP.description || topP.part_no) : "top products"}.`;
  }

  return { insights, priorityActionText };
}

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
      enabled: false,
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
    const fromDate = p.from ? new Date(p.from) : null;
    const toDate = p.to ? new Date(p.to) : null;
    const isValidFrom = fromDate && !isNaN(fromDate.getTime());
    const isValidTo = toDate && !isNaN(toDate.getTime());
    return {
      ...defaults,
      ...p,
      from: isValidFrom ? fromDate : defaults.from,
      to: isValidTo ? toDate : defaults.to,
    };
  } catch { return defaults; }
}
function writeFilterSession(key, data) {
  try { sessionStorage.setItem(key, JSON.stringify(data)); } catch { }
}

const MOCK_DESPATCH_PLAN_PENDING = [
  { customer: "CANALTA INDIA PRIVATE LIMITED", partNo: "TD90060377", description: "FLANGE ADAPTER HOUSING 2 INCH", pendingPlannedQty: 120, plannedQty: 500, availableQty: 150, despatchQty: 380, cancel: 0, invNo: "INV-260192" },
  { customer: "SHANTHI GEARS LIMITED", partNo: "CC021A51-WCB/LCC", description: "GEAR BOX HOUSING BODY CASTING", pendingPlannedQty: 45, plannedQty: 250, availableQty: 60, despatchQty: 205, cancel: 0, invNo: "INV-260193" },
  { customer: "CIRCOR FLOW TECHNOLOGIES INDIA PVT LTD", partNo: "NP0550091368", description: "HIGH PRESSURE FLOW VALVE SHAFT", pendingPlannedQty: 80, plannedQty: 400, availableQty: 100, despatchQty: 320, cancel: 0, invNo: "INV-260194" },
  { customer: "Megha Engineering & Infrastructures Ltd", partNo: "NP0550095551", description: "HYDRAULIC PUMP MOUNTING BRACKET", pendingPlannedQty: 25, plannedQty: 150, availableQty: 30, despatchQty: 125, cancel: 0, invNo: "INV-260195" },
  { customer: "CANALTA INDIA PRIVATE LIMITED", partNo: "NP0550021964", description: "STAINLESS STEEL BUSHING RING", pendingPlannedQty: 60, plannedQty: 300, availableQty: 90, despatchQty: 240, cancel: 0, invNo: "INV-260196" },
  { customer: "Coromandel International Limited", partNo: "TD09020721", description: "STANDARD SHAFT CONNECTING PIN", pendingPlannedQty: 110, plannedQty: 600, availableQty: 140, despatchQty: 490, cancel: 0, invNo: "INV-260197" },
  { customer: "Vasanthi Foundry", partNo: "CC004AS5", description: "HEAVY CASTING BEARING BLOCK", pendingPlannedQty: 75, plannedQty: 350, availableQty: 85, despatchQty: 275, cancel: 0, invNo: "INV-260198" },
];

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

function getTodayMonthRange() {
  const today = new Date();
  const startOfPeriod = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfPeriod = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { from: startOfPeriod, to: endOfPeriod };
}

export default function SalesAnalysis() {
  const _dflt = getTodayMonthRange();
  const [dateRange, setDateRange] = useState({ from: _dflt.from, to: _dflt.to });
  const [filters, setFilters] = useState({
    customer: "All Customers",
    product: "All Products",
    salesGroup: "Sales Group",
    rejection: "No",
  });
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [grandTotalVal, setGrandTotalVal] = useState(null);
  const [avgRateData, setAvgRateData] = useState(null);
  const [weeklyTrend, setWeeklyTrend] = useState(null);
  const [revenueCharts, setRevenueCharts] = useState(null);
  const [monthSummary, setMonthSummary] = useState(null);
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [projections, setProjections] = useState([]);
  const [planVsActual, setPlanVsActual] = useState([]);
  const [poLedger, setPoLedger] = useState([]);
  const [traceability, setTraceability] = useState([]);
  const [invoiceBtypes, setInvoiceBtypes] = useState([]);
  const [invoiceBtype, setInvoiceBtype] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);
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
  const [projChartType, setProjChartType] = useState("combo");
  const [weeklyChartType, setWeeklyChartType] = useState("combo");
  const [customerSearch, setCustomerSearch] = useState("");
  const [planSearchQuery, setPlanSearchQuery] = useState("");

  const [despatchCustFilter, setDespatchCustFilter] = useState([]);
  const [despatchPartFilter, setDespatchPartFilter] = useState([]);
  const [despatchCustDropdownOpen, setDespatchCustDropdownOpen] = useState(false);
  const [despatchPartDropdownOpen, setDespatchPartDropdownOpen] = useState(false);
  const [despatchCustSearch, setDespatchCustSearch] = useState("");
  const [despatchPartSearch, setDespatchPartSearch] = useState("");
  const [despatchDateRange, setDespatchDateRange] = useState({ from: null, to: null });
  const despatchCustRef = useRef(null);
  const despatchPartRef = useRef(null);

  const customerOptions = useMemo(() => {
    const customers = new Set();
    invoiceRows.forEach((r) => {
      if (r.customer && r.customer !== "—" && r.customer !== "") {
        customers.add(r.customer);
      }
    });
    return Array.from(customers).sort();
  }, [invoiceRows]);


  const [invSortConfig, setInvSortConfig] = useState({ key: "date", direction: "desc" });

  const handleInvSort = (key) => {
    let direction = "desc";
    if (invSortConfig && invSortConfig.key === key && invSortConfig.direction === "desc") {
      direction = "asc";
    }
    setInvSortConfig({ key, direction });
  };

  const filteredCustomerOptions = useMemo(() => {
    if (!customerSearch) return customerOptions;
    return customerOptions.filter((c) =>
      c.toLowerCase().includes(customerSearch.toLowerCase())
    );
  }, [customerOptions, customerSearch]);

  const [topProductsRaw, setTopProductsRaw] = useState(null);
  const [monthlyTrendData, setMonthlyTrendData] = useState(null);
  const [billTypeRevenueData, setBillTypeRevenueData] = useState(null);
  const [monthlyTaxData, setMonthlyTaxData] = useState(null);
  const [invoiceDropdownOpen, setInvoiceDropdownOpen] = useState(false);
  const invoiceDropdownRef = useRef(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const optionsList = useMemo(() => ["", ...invoiceBtypes], [invoiceBtypes]);
  const filteredProjections = useMemo(() => {
    return projections.filter(
      (r) => selectedCustomers.length === 0 || selectedCustomers.includes(r.customer)
    );
  }, [projections, selectedCustomers]);

  const filteredTraceability = useMemo(() => {
    return traceability.filter(
      (r) => selectedCustomers.length === 0 || selectedCustomers.includes(r.customer)
    );
  }, [traceability, selectedCustomers]);

  const projectionTotals = useMemo(() => {
    return filteredProjections.reduce(
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
  }, [filteredProjections]);

  const processedPoLedger = useMemo(() => {
    return poLedger.map((row) => {
      const value = row.qty * row.rate;
      const pendingQty = Math.max(0, row.qty - row.dcQty - row.shortCloseQty);
      const pendingValue = pendingQty * row.rate;

      let ageDays = 0;
      if (row.poDate) {
        const poDate = new Date(row.poDate);
        const refDate = new Date();
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
  }, [poLedger]);

  const filteredPoLedger = useMemo(() => {
    return processedPoLedger.filter((row) => {
      if (poPendingOnly && row.pendingQty <= 0) return false;
      if (selectedCustomers.length > 0 && !selectedCustomers.includes(row.custName)) return false;
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
  }, [processedPoLedger, poSearchQuery, poPendingOnly, selectedCustomers]);

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

  const poPageSize = 50;
  const totalPoPages = Math.ceil(sortedPoLedger.length / poPageSize) || 1;
  const paginatedPoLedger = useMemo(() => {
    const start = (poPage - 1) * poPageSize;
    return sortedPoLedger.slice(start, start + poPageSize);
  }, [sortedPoLedger, poPage]);

  const getPageNumbers = useMemo(() => {
    const pages = [];
    const delta = 1;
    for (let i = 1; i <= totalPoPages; i++) {
      if (
        i === 1 ||
        i === totalPoPages ||
        (i >= poPage - delta && i <= poPage + delta)
      ) {
        pages.push(i);
      } else if (
        (i === 2 && poPage - delta > 2) ||
        (i === totalPoPages - 1 && poPage + delta < totalPoPages - 1)
      ) {
        pages.push("...");
      }
    }
    return pages.filter((item, index, self) => self.indexOf(item) === index);
  }, [totalPoPages, poPage]);

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
      formatToDdMmYyyy(row.poDate),
      row.custName,
      row.partDesc,
      row.poSlNo || "—",
      row.qty,
      row.shortCloseQty,
      row.rate,
      row.value,
      row.dcNo,
      formatToDdMmYyyy(row.dcDate),
      row.dcQty,
      row.pendingQty,
      row.pendingValue,
      row.ageDays,
      formatToDdMmYyyy(row.invNoDt)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => `"${String(val ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "po_ledger_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDespatchExport = () => {
    const headers = [
      "#", "Customer", "Part No", "Description", "Pending Planned Qty", "Planned Qty",
      "Available Qty", "Despatch Qty", "Inv No", "Inv Dt", "Inv Value"
    ];

    const rows = filteredDespatchPlan.map((row, idx) => [
      idx + 1,
      row.customer,
      row.partNo,
      row.description,
      row.pendingPlannedQty,
      row.plannedQty,
      row.availableQty,
      row.despatchQty,
      row.invNo === "—" ? "" : row.invNo,
      row.invDate === "—" ? "" : row.invDate,
      row.invValue || 0
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => `"${String(val ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "despatch_plan_pending_export.csv");
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
    return planVsActual.filter((row) => {
      const rowDate = new Date(row.date);
      if (dateRange.from && rowDate < dateRange.from) return false;
      if (dateRange.to && rowDate > dateRange.to) return false;
      if (selectedCustomers.length > 0 && !selectedCustomers.includes(row.customer)) return false;

      const q = planSearchQuery.toLowerCase().trim();
      if (q) {
        return (
          row.customer.toLowerCase().includes(q) ||
          row.partNoDesc.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dateRange, planSearchQuery, planVsActual, selectedCustomers]);

  const { uniqueDespatchCustomers, uniqueDespatchParts } = useMemo(() => {
    const custSet = new Set();
    const partSet = new Set();
    (filteredPlanVsActual || []).forEach(row => {
      if (row.customer) custSet.add(row.customer);
      
      const matchesCustomer = despatchCustFilter.length === 0 || despatchCustFilter.includes(row.customer);
      if (matchesCustomer) {
        const parts = (row.partNoDesc || "").split(" - ");
        const partNo = row.partNo || (parts.length > 1 ? parts[0] : row.partNoDesc || "—");
        if (partNo && partNo !== "—") partSet.add(partNo);
      }
    });
    return {
      uniqueDespatchCustomers: Array.from(custSet).sort(),
      uniqueDespatchParts: Array.from(partSet).sort()
    };
  }, [filteredPlanVsActual, despatchCustFilter]);

  // Clean invalid part number selections when active customers change
  useEffect(() => {
    if (despatchCustFilter.length > 0 && despatchPartFilter.length > 0) {
      const validParts = new Set();
      (filteredPlanVsActual || []).forEach(row => {
        if (despatchCustFilter.includes(row.customer)) {
          const parts = (row.partNoDesc || "").split(" - ");
          const partNo = row.partNo || (parts.length > 1 ? parts[0] : row.partNoDesc || "—");
          if (partNo && partNo !== "—") validParts.add(partNo);
        }
      });
      const newPartFilter = despatchPartFilter.filter(p => validParts.has(p));
      if (newPartFilter.length !== despatchPartFilter.length) {
        setDespatchPartFilter(newPartFilter);
      }
    }
  }, [despatchCustFilter, filteredPlanVsActual, despatchPartFilter]);

  const filteredUniqueCustomers = useMemo(() => {
    const q = despatchCustSearch.toLowerCase().trim();
    if (!q) return uniqueDespatchCustomers;
    return uniqueDespatchCustomers.filter(c => c.toLowerCase().includes(q));
  }, [uniqueDespatchCustomers, despatchCustSearch]);

  const filteredUniqueParts = useMemo(() => {
    const q = despatchPartSearch.toLowerCase().trim();
    if (!q) return uniqueDespatchParts;
    return uniqueDespatchParts.filter(p => p.toLowerCase().includes(q));
  }, [uniqueDespatchParts, despatchPartSearch]);

  const filteredDespatchPlan = useMemo(() => {
    let list = (filteredPlanVsActual || []).map((row) => {
      const parts = (row.partNoDesc || "").split(" - ");
      const partNo = row.partNo || (parts.length > 1 ? parts[0] : row.partNoDesc || "—");
      const description = row.description || (parts.length > 1 ? parts.slice(1).join(" - ") : row.partNoDesc || "—");
      const plannedQty = Number(row.planQty || row.plannedQty || 0);
      const despatchQty = Number(row.dispatchQty || row.despatchQty || 0);
      const availableQty = Number(row.availableQty || 0);
      const pendingPlannedQty = Math.max(0, plannedQty - despatchQty);
      const cancel = Number(row.cancel || row.shortCloseQty || 0);
      const invNo = row.invNo || "—";
      const invDate = row.invDate || "—";
      const invValue = Number(row.invValue || 0);

      return {
        ...row,
        customer: row.customer || "—",
        partNo,
        description,
        pendingPlannedQty,
        plannedQty,
        availableQty,
        despatchQty,
        invNo,
        invDate,
        invValue
      };
    });

    if (despatchDateRange.from || despatchDateRange.to) {
      list = list.filter(row => {
        if (!row.date) return false;
        const rowDate = new Date(row.date);
        if (despatchDateRange.from && rowDate < despatchDateRange.from) return false;
        if (despatchDateRange.to && rowDate > despatchDateRange.to) return false;
        return true;
      });
    }

    if (despatchCustFilter && despatchCustFilter.length > 0) {
      list = list.filter(row => despatchCustFilter.includes(row.customer));
    }
    if (despatchPartFilter && despatchPartFilter.length > 0) {
      list = list.filter(row => despatchPartFilter.includes(row.partNo));
    }

    return list;
  }, [filteredPlanVsActual, despatchCustFilter, despatchPartFilter, despatchDateRange]);

  const groupedDespatchPlan = useMemo(() => {
    const groups = {};
    (filteredDespatchPlan || []).forEach(row => {
      const cust = row.customer || "—";
      if (!groups[cust]) {
        groups[cust] = [];
      }
      groups[cust].push(row);
    });
    return groups;
  }, [filteredDespatchPlan]);

  const despatchTotalInvValue = useMemo(() => {
    return (filteredDespatchPlan || []).reduce((sum, row) => sum + (row.invValue || 0), 0);
  }, [filteredDespatchPlan]);

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
    const sorted = [...filteredProjections];
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
  }, [projSortField, projSortAsc, filteredProjections]);

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
    if (!despatchCustDropdownOpen) {
      setDespatchCustSearch("");
    }
  }, [despatchCustDropdownOpen]);

  useEffect(() => {
    if (!despatchPartDropdownOpen) {
      setDespatchPartSearch("");
    }
  }, [despatchPartDropdownOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (invoiceDropdownRef.current && !invoiceDropdownRef.current.contains(event.target)) {
        setInvoiceDropdownOpen(false);
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setCustomerDropdownOpen(false);
      }
      if (despatchCustRef.current && !despatchCustRef.current.contains(event.target)) {
        setDespatchCustDropdownOpen(false);
      }
      if (despatchPartRef.current && !despatchPartRef.current.contains(event.target)) {
        setDespatchPartDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const filteredInvoices = useMemo(() => {
    let list = invoiceRows.filter((r) => {
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

    if (invSortConfig) {
      list.sort((a, b) => {
        let valA = a[invSortConfig.key];
        let valB = b[invSortConfig.key];
        if (["qty", "rate", "amount"].includes(invSortConfig.key)) {
          valA = Number(valA || 0);
          valB = Number(valB || 0);
        } else if (invSortConfig.key === "date") {
          valA = new Date(valA || 0).getTime();
          valB = new Date(valB || 0).getTime();
        } else {
          valA = String(valA || "").toLowerCase();
          valB = String(valB || "").toLowerCase();
        }
        if (valA < valB) return invSortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return invSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [invoiceRows, searchQuery, selectedCustomers, invSortConfig]);

  const derivedSummary = useMemo(() => {
    if (!summary) return null;
    if (selectedCustomers.length === 0) return summary;

    const totalInvoicesSet = new Set();
    const custInvoicesMap = {};
    const prodAmountMap = {};
    const custAmountMap = {};

    let grandTotal = 0;
    let totalQty = 0;

    filteredInvoices.forEach((r) => {
      const amt = Number(r.amount || 0);
      const qty = Number(r.qty || 0);
      const cust = r.customer || "Unknown";
      const prodKey = r.part_no || r.description || "Unknown";
      const prodName = r.description || r.part_no || "Unknown";

      grandTotal += amt;
      totalQty += qty;

      if (r.invoice_no) {
        totalInvoicesSet.add(r.invoice_no);
        if (!custInvoicesMap[cust]) {
          custInvoicesMap[cust] = new Set();
        }
        custInvoicesMap[cust].add(r.invoice_no);
      }

      // Aggregate Product Sales for Filtered Customer(s)
      if (!prodAmountMap[prodKey]) {
        prodAmountMap[prodKey] = { name: prodName, amount: 0 };
      }
      prodAmountMap[prodKey].amount += amt;

      // Aggregate Customer Sales for Filtered Customer(s)
      if (!custAmountMap[cust]) {
        custAmountMap[cust] = { name: cust, amount: 0 };
      }
      custAmountMap[cust].amount += amt;
    });

    const totalInvoices = totalInvoicesSet.size;
    const avgInvoice = totalInvoices > 0 ? grandTotal / totalInvoices : 0;
    const activeCustomers = Object.keys(custAmountMap).length || selectedCustomers.length;

    let repeatBuyers = 0;
    Object.values(custInvoicesMap).forEach((invSet) => {
      if (invSet.size > 1) repeatBuyers++;
    });

    // Dynamic Top Product calculation for filtered customer(s)
    let topProdName = "—";
    let topProdRev = 0;
    let topProdPct = 0;
    const sortedProds = Object.values(prodAmountMap).sort((a, b) => b.amount - a.amount);
    if (sortedProds.length > 0 && sortedProds[0].amount > 0) {
      topProdName = sortedProds[0].name;
      topProdRev = sortedProds[0].amount;
      topProdPct = grandTotal > 0 ? Number(((topProdRev / grandTotal) * 100).toFixed(1)) : 0;
    }

    // Dynamic Top Customer calculation for filtered customer(s)
    let topCustName = "—";
    let topCustRev = 0;
    let topCustPct = 0;
    const sortedCusts = Object.values(custAmountMap).sort((a, b) => b.amount - a.amount);
    if (sortedCusts.length > 0 && sortedCusts[0].amount > 0) {
      topCustName = sortedCusts[0].name;
      topCustRev = sortedCusts[0].amount;
      topCustPct = grandTotal > 0 ? Number(((topCustRev / grandTotal) * 100).toFixed(1)) : 0;
    }

    const avgSellingRate = totalQty > 0 ? grandTotal / totalQty : 0;

    return {
      ...summary,
      grand_total: grandTotal,
      total_invoices: totalInvoices,
      customers: activeCustomers,
      active_customers: activeCustomers,
      repeat_buyers: repeatBuyers,
      total_qty_sold: totalQty,
      avg_invoice: avgInvoice,
      turn_over_lakhs: grandTotal / 100_000,
      top_product_revenue: topProdRev,
      top_product_name: topProdName,
      top_product_pct: topProdPct,
      top_customer_revenue: topCustRev,
      top_customer_name: topCustName,
      top_customer_pct: topCustPct,
      avg_selling_rate: avgSellingRate,
    };
  }, [summary, selectedCustomers, filteredInvoices]);

  const kpiCards = useMemo(() => buildKpiCards(derivedSummary), [derivedSummary]);

  const avgRateCards = useMemo(() => {
    if (!avgRateData) {
      return [
        { label: "AVG SELLING RATE (Per Day)", value: "—", sub: "—", trend: "—", icon: Scale, iconColor: "#3b82f6", type: "neutral" },
        { label: "AVG SELLING RATE (Per Week)", value: "—", sub: "—", trend: "—", icon: Scale, iconColor: "#10b981", type: "neutral" },
        { label: "AVG SELLING RATE (Per Month)", value: "—", sub: "—", trend: "—", icon: Scale, iconColor: "#f97316", type: "neutral" },
        { label: "AVG SELLING RATE (Per Year)", value: "—", sub: "—", trend: "—", icon: Scale, iconColor: "#8b5cf6", type: "neutral" },
      ];
    }

    // Calendar metadata always comes from the backend (date-range based)
    const { calendar_days, weeks, months, years } = avgRateData;

    // Revenue: use customer-filtered derivedSummary when a customer filter is active,
    // otherwise fall back to the backend grand_total (same value when no filter)
    const grandTotal = derivedSummary ? (derivedSummary.grand_total ?? 0) : (avgRateData.grand_total ?? 0);

    const per_day = Math.round(grandTotal / Math.max(1, calendar_days));
    const per_week = per_day * 7;
    const per_month = per_day * 30;
    const per_year = per_day * 365;

    return [
      {
        label: "AVG SELLING RATE (Per Day)",
        value: `₹${formatRupees(per_day)}`,
        sub: "Per calendar day",
        trend: `${calendar_days} days total`,
        icon: Scale,
        iconColor: "#3b82f6",
        type: "neutral"
      },
      {
        label: "AVG SELLING RATE (Per Week)",
        value: `₹${formatRupees(per_week)}`,
        sub: "Per calendar week",
        trend: `${weeks} weeks total`,
        icon: Scale,
        iconColor: "#10b981",
        type: "neutral"
      },
      {
        label: "AVG SELLING RATE (Per Month)",
        value: `₹${formatRupees(per_month)}`,
        sub: "Per calendar month (30d)",
        trend: `${months} months total`,
        icon: Scale,
        iconColor: "#f97316",
        type: "neutral"
      },
      {
        label: "AVG SELLING RATE (Per Year)",
        value: `₹${formatRupees(per_year)}`,
        sub: "Annualized rate (365d)",
        //trend: `${years} years total`,
        icon: Scale,
        iconColor: "#8b5cf6",
        type: "neutral"
      }
    ];
  }, [avgRateData, derivedSummary]);

  // Helper function to round values in JS
  const jsRound = (val, decimals = 2) => {
    const multiplier = Math.pow(10, decimals);
    return Math.round((val + Number.EPSILON) * multiplier) / multiplier;
  };

  // Helper to determine if an invoice type is a credit note
  const isCreditNoteType = (btype, invNo) => {
    const bt = (btype || "").toLowerCase().trim();
    const inv = (invNo || "").toUpperCase().trim();
    return (
      bt === "sales return" ||
      (bt.includes("credit") && bt.includes("note")) ||
      inv.startsWith("CN")
    );
  };

  // Helper to calculate month slots between two dates
  const getMonthSlotsInRange = (from, to) => {
    const slots = [];
    if (!from || !to) return slots;
    const start = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    let curr = new Date(start);
    while (curr <= end) {
      slots.push({
        year: curr.getFullYear(),
        month: curr.getMonth() + 1 // 1-indexed
      });
      curr.setMonth(curr.getMonth() + 1);
    }
    return slots;
  };

  // Helper to format month-week labels
  const getInvoiceWeekLabelString = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const day = d.getDate();
    let wk = 5;
    if (day <= 7) wk = 1;
    else if (day <= 14) wk = 2;
    else if (day <= 21) wk = 3;
    else if (day <= 28) wk = 4;
    const monthShort = d.toLocaleString("en-US", { month: "short" });
    return `W${wk} ${monthShort}`;
  };

  // Derived Revenue Charts (Donuts & Rankings)
  const derivedRevenueCharts = useMemo(() => {
    if (!revenueCharts) return null;
    if (selectedCustomers.length === 0) return revenueCharts;

    const custMap = {};
    let totalRevenue = 0;
    filteredInvoices.forEach(r => {
      const cust = r.customer || "Unknown";
      custMap[cust] = (custMap[cust] || 0) + (r.amount || 0);
      totalRevenue += (r.amount || 0);
    });

    const sortedCusts = Object.entries(custMap)
      .map(([name, revenue]) => ({
        name,
        revenue,
        revenue_lakhs: jsRound(revenue / 100_000, 2),
        pct: totalRevenue > 0 ? jsRound((revenue / totalRevenue) * 100, 1) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    let custLabels = [];
    let custPercentages = [];
    if (sortedCusts.length > 0) {
      const top4 = sortedCusts.slice(0, 4);
      custLabels = top4.map(c => c.name);
      custPercentages = top4.map(c => c.pct);

      if (sortedCusts.length > 4) {
        const others = sortedCusts.slice(4);
        const othersRevenue = others.reduce((sum, c) => sum + c.revenue, 0);
        const othersPct = totalRevenue > 0 ? jsRound((othersRevenue / totalRevenue) * 100, 1) : 0;
        custLabels.push("Others");
        custPercentages.push(othersPct);
      }
    }

    const prodMap = {};
    let totalQty = 0;
    filteredInvoices.forEach(r => {
      const prod = r.description || r.part_no || "Unknown";
      prodMap[prod] = (prodMap[prod] || 0) + (r.qty || 0);
      totalQty += (r.qty || 0);
    });

    const sortedProds = Object.entries(prodMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);

    const top5Prods = sortedProds.slice(0, 5);
    const prodLabels = top5Prods.map(p => p.name);
    const prodPercentages = top5Prods.map(p => totalQty > 0 ? jsRound((p.qty / totalQty) * 100, 1) : 0);

    return {
      customer: {
        labels: custLabels,
        percentages: custPercentages
      },
      customer_ranking: sortedCusts,
      product: {
        labels: prodLabels,
        percentages: prodPercentages
      }
    };
  }, [revenueCharts, filteredInvoices, selectedCustomers]);

  // Derived Weekly Trend
  const derivedWeeklyTrend = useMemo(() => {
    if (!weeklyTrend) return null;
    if (selectedCustomers.length === 0) return weeklyTrend;

    const salesMap = {};
    const labels = weeklyTrend.labels || [];
    labels.forEach(lbl => {
      salesMap[lbl] = 0;
    });

    filteredInvoices.forEach(r => {
      const lbl = getInvoiceWeekLabelString(r.date);
      if (lbl && salesMap[lbl] !== undefined) {
        salesMap[lbl] += r.amount || 0;
      }
    });

    const sales = labels.map(lbl => jsRound(salesMap[lbl], 2));
    const cumulative = [];
    let running = 0;
    sales.forEach(v => {
      running += v;
      cumulative.push(jsRound(running, 2));
    });

    return {
      ...weeklyTrend,
      sales,
      cumulative,
      total: jsRound(running, 2),
      turn_over_lakhs: jsRound(running / 100_000, 2)
    };
  }, [weeklyTrend, filteredInvoices, selectedCustomers]);

  // Derived Month Summary
  const derivedMonthSummary = useMemo(() => {
    if (!monthSummary) return null;
    if (selectedCustomers.length === 0) return monthSummary;

    const monthMap = {};
    filteredInvoices.forEach(r => {
      if (!r.date) return;
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!monthMap[key]) {
        monthMap[key] = {
          invNos: new Set(),
          qty: 0,
          amount: 0
        };
      }
      if (r.invoice_no) monthMap[key].invNos.add(r.invoice_no);
      monthMap[key].qty += r.qty || 0;
      monthMap[key].amount += r.amount || 0;
    });

    const MONTH_FULL = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const slots = getMonthSlotsInRange(dateRange.from, dateRange.to);
    let prevAmount = null;
    let totalQty = 0;
    let totalAmount = 0;
    const uniqueInvoicesTotal = new Set();

    const rows = slots.map(slot => {
      const key = `${slot.year}-${slot.month}`;
      const data = monthMap[key] || { invNos: new Set(), qty: 0, amount: 0 };
      const amount = data.amount;

      let growth_pct = null;
      if (prevAmount !== null && prevAmount !== 0) {
        growth_pct = jsRound(((amount - prevAmount) / prevAmount) * 100, 1);
      }
      prevAmount = amount;

      totalQty += data.qty;
      totalAmount += amount;
      data.invNos.forEach(inv => uniqueInvoicesTotal.add(inv));

      return {
        month: `${MONTH_FULL[slot.month - 1]} ${slot.year}`,
        invoices: data.invNos.size,
        qty_sold: jsRound(data.qty, 2),
        amount: jsRound(amount, 2),
        growth_pct
      };
    });

    const btypeCounts = {};
    const invoiceBtypesSeen = {};
    filteredInvoices.forEach(r => {
      if (r.invoice_no) {
        if (!invoiceBtypesSeen[r.invoice_no]) {
          let bt = r.btype || "";
          if (isCreditNoteType(bt, r.invoice_no)) {
            bt = "Credit Note";
          }
          invoiceBtypesSeen[r.invoice_no] = bt;
          btypeCounts[bt] = (btypeCounts[bt] || 0) + 1;
        }
      }
    });

    const statusSpecs = [
      {
        key: "with_material",
        label: "With Material",
        btypes: ["With Material", "Debit Note", "Credit Note", "General / Rework", "With Material Rejection", "Scrap"],
        bg: "#dbeafe", fg: "#1d4ed8", vfg: "#1e3a8a",
      },
      {
        key: "labour_charges",
        label: "Labour Charges",
        btypes: ["Labour Charges", "General Labour"],
        bg: "#fef9c3", fg: "#92400e", vfg: "#78350f",
      },
      {
        key: "export_only",
        label: "Export Only",
        btypes: ["Export Invoice"],
        bg: "#dcfce7", fg: "#15803d", vfg: "#14532d",
      }
    ];

    const invoice_status = statusSpecs.map(spec => {
      let groupTotal = 0;
      const items = spec.btypes.map(bt => {
        const count = btypeCounts[bt] || 0;
        groupTotal += count;
        return { btype: bt, count };
      });
      return {
        key: spec.key,
        label: spec.label,
        total: groupTotal,
        items,
        bg: spec.bg, fg: spec.fg, vfg: spec.vfg
      };
    });

    return {
      period: derivedSummary?.period ?? monthSummary.period,
      rows,
      totals: {
        invoices: uniqueInvoicesTotal.size,
        qty_sold: jsRound(totalQty, 2),
        amount: jsRound(totalAmount, 2),
      },
      invoice_status
    };
  }, [monthSummary, filteredInvoices, selectedCustomers, dateRange, derivedSummary]);

  // Derived Monthly Trend Data
  const derivedMonthlyTrendData = useMemo(() => {
    if (!monthlyTrendData) return null;
    if (selectedCustomers.length === 0) return monthlyTrendData;

    const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const slots = getMonthSlotsInRange(dateRange.from, dateRange.to);

    const monthMap = {};
    filteredInvoices.forEach(r => {
      if (!r.date) return;
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthMap[key] = (monthMap[key] || 0) + (r.amount || 0);
    });

    const labels = slots.map(s => `${MONTH_SHORT[s.month - 1]}`);
    const sales_values = slots.map(s => {
      const key = `${s.year}-${s.month}`;
      return jsRound(monthMap[key] || 0, 2);
    });
    const sales_values_lakhs = sales_values.map(v => jsRound(v / 100_000, 3));
    const total = jsRound(sales_values.reduce((sum, v) => sum + v, 0), 2);

    return {
      ...monthlyTrendData,
      labels,
      sales_values,
      sales_values_lakhs,
      total,
      total_lakhs: jsRound(total / 100_000, 3)
    };
  }, [monthlyTrendData, filteredInvoices, selectedCustomers, dateRange]);

  const monthlyAvg = useMemo(() => {
    if (!derivedMonthlyTrendData?.sales_values_lakhs?.length) return 0;
    const vals = derivedMonthlyTrendData.sales_values_lakhs;
    const sum = vals.reduce((s, v) => s + v, 0);
    return sum / vals.length;
  }, [derivedMonthlyTrendData]);

  // Derived Bill Type Revenue Data
  const derivedBillTypeRevenueData = useMemo(() => {
    if (!billTypeRevenueData) return null;
    if (selectedCustomers.length === 0) return billTypeRevenueData;

    const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const slots = getMonthSlotsInRange(dateRange.from, dateRange.to);
    const labels = slots.map(s => `${MONTH_SHORT[s.month - 1]}`);

    const btypesSet = billTypeRevenueData.bill_types || [];
    const btypeMonthMap = {};

    btypesSet.forEach(bt => {
      btypeMonthMap[bt] = {};
    });

    filteredInvoices.forEach(r => {
      if (!r.date) return;
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      let bt = r.btype || "(Blank)";
      if (isCreditNoteType(bt, r.invoice_no)) {
        bt = "Credit Note";
      }
      if (btypeMonthMap[bt] !== undefined) {
        btypeMonthMap[bt][key] = (btypeMonthMap[bt][key] || 0) + (r.amount || 0);
      }
    });

    const datasets = btypesSet.map(bt => {
      const data = slots.map(s => {
        const key = `${s.year}-${s.month}`;
        return jsRound(btypeMonthMap[bt][key] || 0, 2);
      });
      const data_lakhs = data.map(v => jsRound(v / 100_000, 5));
      return {
        bill_type: bt,
        data,
        data_lakhs
      };
    });

    return {
      ...billTypeRevenueData,
      labels,
      bill_types: btypesSet,
      datasets
    };
  }, [billTypeRevenueData, filteredInvoices, selectedCustomers, dateRange]);

  // Derived Monthly Tax Data
  const derivedMonthlyTaxData = useMemo(() => {
    if (!monthlyTaxData) return null;
    if (selectedCustomers.length === 0) return monthlyTaxData;

    const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const fyOrder = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
    const slots = getMonthSlotsInRange(dateRange.from, dateRange.to);

    const sortedSlots = [...slots].sort((a, b) => {
      const idxA = fyOrder.indexOf(a.month);
      const idxB = fyOrder.indexOf(b.month);
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      return idxA - idxB;
    });

    const monthUniqueInvoices = {};
    const invoiceTaxMap = {};

    filteredInvoices.forEach(r => {
      if (!r.date || !r.invoice_no) return;
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!monthUniqueInvoices[key]) {
        monthUniqueInvoices[key] = new Set();
      }
      monthUniqueInvoices[key].add(r.invoice_no);
      invoiceTaxMap[r.invoice_no] = r.tax || 0;
    });

    const labels = sortedSlots.map(s => `${MONTH_SHORT[s.month - 1]}`);
    const tax_values = sortedSlots.map(s => {
      const key = `${s.year}-${s.month}`;
      const invSet = monthUniqueInvoices[key] || new Set();
      let monthTax = 0;
      invSet.forEach(inv => {
        monthTax += invoiceTaxMap[inv] || 0;
      });
      return jsRound(monthTax, 2);
    });

    const tax_values_lakhs = tax_values.map(v => jsRound(v / 100_000, 2));
    const total = jsRound(tax_values.reduce((sum, v) => sum + v, 0), 2);

    return {
      ...monthlyTaxData,
      labels,
      tax_values,
      tax_values_lakhs,
      total,
      total_lakhs: jsRound(total / 100_000, 2)
    };
  }, [monthlyTaxData, filteredInvoices, selectedCustomers, dateRange]);

  const customerRanking = useMemo(
    () => buildCustomerRanking(derivedRevenueCharts ? derivedRevenueCharts.customer_ranking : []),
    [derivedRevenueCharts],
  );
  const topProducts = useMemo(() => {
    if (filteredInvoices && filteredInvoices.length > 0) {
      const prodMap = {};
      filteredInvoices.forEach((r) => {
        const key = r.part_no || r.description || "Unknown";
        if (!prodMap[key]) {
          prodMap[key] = {
            description: r.description || r.part_no || "—",
            part_no: r.part_no || "—",
            qty: 0,
            revenue: 0,
            uom: r.uom || "NOS",
          };
        }
        prodMap[key].qty += Number(r.qty || 0);
        prodMap[key].revenue += Number(r.amount || 0);
      });

      const aggregatedRows = Object.values(prodMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map((p) => ({
          ...p,
          revenue_lakhs: p.revenue / 100_000,
        }));

      return buildTopProducts(aggregatedRows);
    }
    return buildTopProducts(topProductsRaw?.products);
  }, [filteredInvoices, topProductsRaw]);

  const invoiceStats = useMemo(() => {
    const invSet = new Set();
    filteredInvoices.forEach((r) => {
      if (r.invoice_no) invSet.add(r.invoice_no);
    });
    return { lines: filteredInvoices.length, invoices: invSet.size };
  }, [filteredInvoices]);

  const dynamicManagementInsights = useMemo(
    () => buildDynamicInsights({
      summary: derivedSummary,
      monthSummary: derivedMonthSummary,
      revenueCharts: derivedRevenueCharts || revenueCharts,
      topProductsRaw,
      filteredInvoices,
    }),
    [derivedSummary, derivedMonthSummary, derivedRevenueCharts, revenueCharts, topProductsRaw, filteredInvoices]
  );

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

  const CHART_FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

  // ✅ Persist date range to sessionStorage on every change
  useEffect(() => {
    writeFilterSession("ba_filter_sales", { from: dateRange.from, to: dateRange.to });
  }, [dateRange.from, dateRange.to]);

  // ✅ Force window resize triggers after loading finishes to guarantee proper chart rendering dimensions
  useEffect(() => {
    if (!loading) {
      // Fire resize events at multiple points to catch charts that initialized before their container was sized
      let raf1, raf2;
      raf1 = requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
        raf2 = requestAnimationFrame(() => {
          window.dispatchEvent(new Event('resize'));
        });
      });
      const t1 = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 200);
      const t2 = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 500);
      const t3 = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 1000);
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [loading]);

  const custLabels = useMemo(() => derivedRevenueCharts?.customer?.labels ?? [], [derivedRevenueCharts]);
  const custPercentages = useMemo(() => derivedRevenueCharts?.customer?.percentages ?? [], [derivedRevenueCharts]);

  const prodLabels = useMemo(() => derivedRevenueCharts?.product?.labels ?? [], [derivedRevenueCharts]);
  const prodPercentages = useMemo(() => derivedRevenueCharts?.product?.percentages ?? [], [derivedRevenueCharts]);

  const getCustValue = (pct, idx) => {
    const ranking = derivedRevenueCharts?.customer_ranking;
    let lakhs = 0;
    if (idx !== undefined && ranking && ranking.length > 0) {
      if (idx < 4 && ranking[idx]) {
        const rev = ranking[idx].revenue ?? ((ranking[idx].revenue_lakhs ?? 0) * 100_000);
        lakhs = rev / 100_000;
      } else if (idx === 4 && ranking.length > 4) {
        const othersSum = ranking.slice(4).reduce((acc, c) => acc + (c.revenue ?? ((c.revenue_lakhs ?? 0) * 100_000)), 0);
        lakhs = othersSum / 100_000;
      } else {
        const total = derivedSummary?.grand_total || 0;
        lakhs = (((pct || 0) / 100) * total) / 100_000;
      }
    } else {
      const total = derivedSummary?.grand_total || 0;
      lakhs = (((pct || 0) / 100) * total) / 100_000;
    }
    const truncated = (Math.floor(lakhs * 1000) / 1000).toFixed(3);
    return `₹${truncated}L`;
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
      chart.update();
    }
  };

  const handleCustLegendLeave = () => {
    setHoveredCustIndex(-1);
    const chart = custChart.current;
    if (chart) {
      chart.setActiveElements([]);
      chart.update();
    }
  };

  const handleProdLegendHover = (idx) => {
    setHoveredProdIndex(idx);
    const chart = prodChart.current;
    if (chart) {
      chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
      chart.update();
    }
  };

  const handleProdLegendLeave = () => {
    setHoveredProdIndex(-1);
    const chart = prodChart.current;
    if (chart) {
      chart.setActiveElements([]);
      chart.update();
    }
  };

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      if (!custRef.current) return;
      custChart.current?.destroy();

      const ctx = custRef.current.getContext("2d");
      const labels = derivedRevenueCharts?.customer?.labels ?? [];
      const gradientColors = GRADIENTS_CUSTOMER.slice(0, labels.length).map((g) => {
        const gr = ctx.createLinearGradient(0, 0, 0, 200);
        gr.addColorStop(0, g.start);
        gr.addColorStop(1, g.end);
        return gr;
      });

      try {
        custChart.current = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels,
            datasets: [{
              data: derivedRevenueCharts?.customer?.percentages ?? [],
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
      } catch (err) {
        console.error("Cust chart init error:", err);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      custChart.current?.destroy();
    };
  }, [derivedRevenueCharts, loading]);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      if (!prodRef.current) return;
      prodChart.current?.destroy();

      const ctx = prodRef.current.getContext("2d");
      const labels = derivedRevenueCharts?.product?.labels ?? [];
      const gradientColors = GRADIENTS_PRODUCT.slice(0, labels.length).map((g) => {
        const gr = ctx.createLinearGradient(0, 0, 0, 200);
        gr.addColorStop(0, g.start);
        gr.addColorStop(1, g.end);
        return gr;
      });

      try {
        prodChart.current = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels,
            datasets: [{
              data: derivedRevenueCharts?.product?.percentages ?? [],
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
      } catch (err) {
        console.error("Prod chart init error:", err);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      prodChart.current?.destroy();
    };
  }, [derivedRevenueCharts, loading]);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      if (!trendRef.current) return;
      trendChart.current?.destroy();

      const ctx = trendRef.current.getContext("2d");
      const monthYearMap = getMonthYearMap(dateRange.from, dateRange.to);
      const labels = (derivedWeeklyTrend?.labels ?? []).map(lbl => formatLabelWithYear(lbl, monthYearMap));
      const sales = derivedWeeklyTrend?.sales ?? [];
      const cumulative = derivedWeeklyTrend?.cumulative ?? [];

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

      let datasets = [];
      let scales = {};

      if (weeklyChartType === "combo") {
        datasets = [
          {
            label: "Weekly Sales (Lakhs)",
            type: "bar",
            data: sales.map((v) => v / 100000),
            backgroundColor: gradBlue,
            borderColor: "rgba(45, 109, 232, 1)",
            borderWidth: 1.5,
            borderRadius: 4,
            yAxisID: "ySales",
            datalabels: { display: false }
          },
          {
            label: "Cumulative (Lakhs)",
            type: "line",
            data: cumulative.map((v) => v / 100000),
            borderColor: "rgba(16, 185, 129, 1)",
            borderWidth: 2.5,
            tension: 0.4,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "rgba(16, 185, 129, 1)",
            pointBorderWidth: 1.5,
            yAxisID: "yCum",
            datalabels: {
              display: true,
              align: "top",
              anchor: "end",
              offset: 2,
              font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' },
              color: "#10b981",
              formatter: (v) => `₹${safeToFixed(v, 3)}L`
            }
          }
        ];

        scales = {
          ySales: {
            type: "linear",
            position: "left",
            grid: { color: "rgba(99, 102, 241, 0.05)" },
            ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#2d6de8', callback: (v) => `₹${v}L` },
            title: { display: true, text: "Weekly Sales", font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' }, color: '#2d6de8' }
          },
          yCum: {
            type: "linear",
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#10b981', callback: (v) => `₹${v}L` },
            title: { display: true, text: "Cumulative Sales", font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' }, color: '#10b981' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81' }
          }
        };
      } else if (weeklyChartType === "weekly") {
        datasets = [{
          label: "Weekly Sales (Lakhs)",
          type: "line",
          data: sales.map((v) => v / 100000),
          borderColor: "rgba(45, 109, 232, 1)",
          backgroundColor: gradBlueArea,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "rgba(45, 109, 232, 1)",
          pointBorderWidth: 2,
          yAxisID: "y",
          datalabels: {
            display: true,
            align: "top",
            anchor: "end",
            offset: 4,
            font: { family: 'Plus Jakarta Sans', size: 9.5, weight: '700' },
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderWidth: 1.5,
            borderRadius: 4,
            padding: { top: 2, bottom: 2, left: 5, right: 5 },
            borderColor: "rgba(45, 109, 232, 0.4)",
            color: "#2d6de8",
            formatter: (v) => `₹${safeToFixed(v, 3)}L`
          }
        }];

        scales = {
          y: {
            type: "linear",
            position: "left",
            max: Math.ceil((peakSales / 100000) * 1.2),
            grid: { color: "rgba(99, 102, 241, 0.05)" },
            ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81', callback: (v) => `₹${v}L` }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81' }
          }
        };
      } else {
        datasets = [{
          label: "Cumulative Sales (Lakhs)",
          type: "line",
          data: cumulative.map((v) => v / 100000),
          borderColor: "rgba(16, 185, 129, 1)",
          backgroundColor: gradGreenArea,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "rgba(16, 185, 129, 1)",
          pointBorderWidth: 2,
          yAxisID: "y",
          datalabels: {
            display: true,
            align: "top",
            anchor: "end",
            offset: 4,
            font: { family: 'Plus Jakarta Sans', size: 9.5, weight: '700' },
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderWidth: 1.5,
            borderRadius: 4,
            padding: { top: 2, bottom: 2, left: 5, right: 5 },
            borderColor: "rgba(16, 185, 129, 0.4)",
            color: "#10b981",
            formatter: (v) => `₹${safeToFixed(v, 3)}L`
          }
        }];

        scales = {
          y: {
            type: "linear",
            position: "left",
            max: Math.ceil((peakCumulative / 100000) * 1.15),
            grid: { color: "rgba(99, 102, 241, 0.05)" },
            ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81', callback: (v) => `₹${v}L` }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81' }
          }
        };
      }

      try {
        trendChart.current = new Chart(ctx, {
          type: "bar",
          data: { labels, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            animation: {
              delay: (context) => {
                let delay = 0;
                if (context.type === 'data' && context.mode === 'default') {
                  delay = context.dataIndex * 50;
                }
                return delay;
              },
              duration: 1000,
              easing: "easeOutBack",
            },
            plugins: {
              legend: { labels: { font: { size: 10, weight: "600", family: 'Plus Jakarta Sans' }, boxWidth: 12, padding: 14 } },
              tooltip: {
                callbacks: {
                  label(ctx) {
                    const val = ctx.parsed.y ?? 0;
                    const idx = ctx.dataIndex;
                    const dataset = ctx.dataset;
                    const prev = dataset?.data?.[idx - 1];
                    const lbl = dataset?.label || "";
                    let text = `${lbl}: ${formatTooltipLakhs(val * 100000)}`;
                    if (lbl.toLowerCase().includes("weekly") && prev && prev > 0) {
                      const pct = ((val - prev) / prev) * 100;
                      const diff = val - prev;
                      const truncatedDiff = (Math.floor(Math.abs(diff) * 1000) / 1000).toFixed(3);
                      const diffText = diff >= 0 ? `+₹${truncatedDiff}L` : `-₹${truncatedDiff}L`;
                      text += ` (${pct >= 0 ? "+" : ""}${safeToFixed(pct, 1)}% WoW, ${diffText})`;
                    }
                    return text;
                  },
                },
              },
              datalabels: {
                display: (context) => {
                  const d = context.dataset.datalabels?.display;
                  if (typeof d === 'function') return d(context);
                  return d ?? false;
                }
              }
            },
            scales
          }
        });
      } catch (err) {
        console.error("Weekly trend chart init error:", err);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      trendChart.current?.destroy();
    };
  }, [derivedWeeklyTrend, weeklyChartType, loading]);
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      if (!monthlyTrendRef.current) return;
      monthlyTrendChart.current?.destroy();

      const ctx = monthlyTrendRef.current.getContext("2d");
      const isBar = performanceChartType === "bar";
      const isShare = performanceChartType === "share";

      const monthYearMap = getMonthYearMap(dateRange.from, dateRange.to);
      const apiLabels = (derivedMonthlyTrendData?.labels ?? []).map(lbl => formatLabelWithYear(lbl, monthYearMap));
      const apiValuesLakhs = derivedMonthlyTrendData?.sales_values_lakhs ?? [];

      const gradient = ctx.createLinearGradient(0, 0, 0, 240);

      const growthData = apiValuesLakhs.map((v, i) => {
        if (i === 0 || !apiValuesLakhs[i - 1]) return 0;
        const prev = apiValuesLakhs[i - 1];
        return parseFloat((((v - prev) / prev) * 100).toFixed(1));
      });

      if (isBar) {
        gradient.addColorStop(0, "rgba(99, 102, 241, 0.95)");
        gradient.addColorStop(1, "rgba(99, 102, 241, 0.15)");
      } else {
        gradient.addColorStop(0, "rgba(99, 102, 241, 0.45)");
        gradient.addColorStop(1, "rgba(99, 102, 241, 0.02)");
      }

      try {
        monthlyTrendChart.current = new Chart(ctx, {
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
                  delay = context.dataIndex * 100;
                }
                return delay;
              },
              duration: 1000,
              easing: "easeOutBack",
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label(ctx) {
                    const val = Number(ctx.parsed.y) || 0;
                    const idx = ctx.dataIndex;
                    const dataset = ctx.dataset;
                    const prev = dataset?.data?.[idx - 1];
                    let text = "";
                    if (isShare) {
                      text = `${ctx.label || ''}: ${val === 0 ? "—" : (val > 0 ? "+" : "") + safeToFixed(val, 1) + "%"}`;
                    } else {
                      const val3 = safeToFixed(val, 3);
                      text = `Sales Value: ₹${val3}L`;
                      if (prev != null && Number(prev) > 0) {
                        const pVal = Number(prev);
                        const pct = ((val - pVal) / pVal) * 100;
                        const diff = val - pVal;
                        const diffText = safeToFixed(Math.abs(diff), 3);
                        const diffSign = diff >= 0 ? `+₹${diffText}L` : `-₹${diffText}L`;
                        text += ` (${pct >= 0 ? "+" : ""}${safeToFixed(pct, 1)}% MoM, ${diffSign})`;
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
                    const val = Number(ctx.dataset?.data?.[ctx.dataIndex]) || 0;
                    return val === 0 ? "rgba(100, 116, 139, 0.4)" : (val > 0 ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)");
                  }
                  return "rgba(99, 102, 241, 0.4)";
                },
                color: (ctx) => {
                  if (isShare) {
                    const val = Number(ctx.dataset?.data?.[ctx.dataIndex]) || 0;
                    return val === 0 ? "#64748b" : (val > 0 ? "#10b981" : "#ef4444");
                  }
                  return "#4f46e5";
                },
                formatter: (v, context) => {
                  const num = Number(v) || 0;
                  if (isShare) {
                    return num === 0 ? "—" : `${num > 0 ? "↑" : "↓"} ${safeToFixed(Math.abs(num), 1)}%`;
                  }
                  const num3 = safeToFixed(num, 3);
                  let label = `₹${num3}L`;
                  const idx = context.dataIndex;
                  const prev = context.dataset?.data?.[idx - 1];
                  if (prev != null && Number(prev) > 0) {
                    const pVal = Number(prev);
                    const pct = ((num - pVal) / pVal) * 100;
                    const sign = pct >= 0 ? "↑" : "↓";
                    label += ` (${sign}${safeToFixed(Math.abs(pct), 1)}%)`;
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
                ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81', callback: (v) => isShare ? `${v}%` : `₹${v}L` }
              },
              x: {
                grid: { display: false },
                ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81' }
              }
            }
          }
        });
      } catch (err) {
        console.error("Monthly trend chart init error:", err);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      monthlyTrendChart.current?.destroy();
    };
  }, [performanceChartType, derivedMonthlyTrendData, loading]);
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      if (!billTypeRef.current) return;
      billTypeChart.current?.destroy();

      const ctx = billTypeRef.current.getContext("2d");
      const isBar = performanceChartType === "bar";
      const isShare = performanceChartType === "share";
      const isBarOrShare = isBar || isShare;

      const PALETTE_STOPS = [
        ["rgba(79, 70, 229, 0.95)", "rgba(79, 70, 229, 0.4)", "rgba(79, 70, 229, 0.5)", "rgba(79, 70, 229, 0.05)", "rgba(79, 70, 229, 1)"],
        ["rgba(124, 58, 237, 0.95)", "rgba(124, 58, 237, 0.4)", "rgba(124, 58, 237, 0.5)", "rgba(124, 58, 237, 0.05)", "rgba(124, 58, 237, 1)"],
        ["rgba(168, 85, 247, 0.95)", "rgba(168, 85, 247, 0.4)", "rgba(168, 85, 247, 0.5)", "rgba(168, 85, 247, 0.05)", "rgba(168, 85, 247, 1)"],
        ["rgba(192, 132, 252, 0.9)", "rgba(192, 132, 252, 0.35)", "rgba(192, 132, 252, 0.5)", "rgba(192, 132, 252, 0.05)", "rgba(192, 132, 252, 1)"],
        ["rgba(59, 130, 246, 0.95)", "rgba(59, 130, 246, 0.4)", "rgba(59, 130, 246, 0.5)", "rgba(59, 130, 246, 0.05)", "rgba(59, 130, 246, 1)"],
        ["rgba(16, 185, 129, 0.95)", "rgba(16, 185, 129, 0.4)", "rgba(16, 185, 129, 0.5)", "rgba(16, 185, 129, 0.05)", "rgba(16, 185, 129, 1)"],
      ];

      const monthYearMap = getMonthYearMap(dateRange.from, dateRange.to);
      const apiLabels = (derivedBillTypeRevenueData?.labels ?? []).map(lbl => formatLabelWithYear(lbl, monthYearMap));
      const apiDatasets = derivedBillTypeRevenueData?.datasets ?? [];

      const monthTotals = apiLabels.map((_, mi) =>
        apiDatasets.reduce((sum, ds) => sum + (ds.data_lakhs?.[mi] ?? 0), 0)
      );

      const chartDatasets = apiDatasets.map((ds, i) => {
        const stops = PALETTE_STOPS[i % PALETTE_STOPS.length];
        const grad = ctx.createLinearGradient(0, 0, 0, 240);
        grad.addColorStop(0, isBarOrShare ? stops[0] : stops[2]);
        grad.addColorStop(1, isBarOrShare ? stops[1] : stops[3]);

        const shareData = ds.data_lakhs?.map((v, mi) =>
          monthTotals[mi] > 0 ? parseFloat(((v / monthTotals[mi]) * 100).toFixed(2)) : 0
        ) ?? [];

        return {
          label: ds.bill_type,
          data: isShare ? shareData : (ds.data_lakhs ?? []),
          backgroundColor: grad,
          borderColor: stops[4],
          borderWidth: isBarOrShare ? 1 : 2.5,
          borderRadius: isBarOrShare ? 4 : 0,
          fill: false,
          tension: isBarOrShare ? 0 : 0.4,
          pointRadius: isBarOrShare ? 0 : 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: stops[4],
          pointBorderWidth: 2,
        };
      });

      try {
        billTypeChart.current = new Chart(ctx, {
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
              tooltip: {
                callbacks: {
                  label(ctx) {
                    const val = Number(ctx.parsed.y) || 0;
                    const lbl = ctx.dataset?.label || "";
                    if (isShare) return `${lbl}: ${safeToFixed(val, 2)}%`;
                    const val3 = (Math.floor(val * 1000) / 1000).toFixed(3);
                    return `${lbl}: ₹${val3}L`;
                  }
                }
              },
              datalabels: {
                display: (ctx) => {
                  const val = Number(ctx.dataset?.data?.[ctx.dataIndex]) || 0;
                  if (isShare) return val > 4;
                  if (isBar) return val > 0.8;
                  return val > 0.001;
                },
                align: isBarOrShare ? "center" : "top",
                anchor: isBarOrShare ? "center" : "end",
                color: isBarOrShare ? "#ffffff" : "#4f46e5",
                font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' },
                formatter: (v) => {
                  const num = Number(v) || 0;
                  if (isShare) return `${safeToFixed(num, 2)}%`;
                  return `₹${(Math.floor(num * 1000) / 1000).toFixed(3)}L`;
                }
              }
            },
            scales: {
              y: {
                stacked: isBarOrShare,
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
      } catch (err) {
        console.error("Bill type chart init error:", err);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      billTypeChart.current?.destroy();
    };
  }, [performanceChartType, derivedBillTypeRevenueData, loading]);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      if (!taxRef.current) return;
      taxChart.current?.destroy();

      const ctx = taxRef.current.getContext("2d");
      const isBar = performanceChartType === "bar";
      const isShare = performanceChartType === "share";

      const monthYearMap = getMonthYearMap(dateRange.from, dateRange.to);
      const apiLabels = (derivedMonthlyTaxData?.labels ?? []).map(lbl => formatLabelWithYear(lbl, monthYearMap));
      const apiTaxLakhs = derivedMonthlyTaxData?.tax_values_lakhs ?? [];
      const apiSalesLakhs = derivedMonthlyTrendData?.sales_values_lakhs ?? [];

      try {
        if (isBar) {
          const gradient = ctx.createLinearGradient(0, 0, 0, 240);
          gradient.addColorStop(0, "rgba(139, 92, 246, 0.95)");
          gradient.addColorStop(1, "rgba(139, 92, 246, 0.15)");

          taxChart.current = new Chart(ctx, {
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
                legend: { display: false },
                datalabels: {
                  display: true,
                  align: "end",
                  anchor: "end",
                  offset: 2,
                  font: { family: 'Plus Jakarta Sans', size: 10, weight: '700' },
                  color: "#7c3aed",
                  formatter: (v) => `₹${safeToFixed(v, 2)}L`
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
          const effectiveTaxRate = apiTaxLakhs.map((t, i) => {
            const s = apiSalesLakhs[i];
            return s && s > 0 ? parseFloat(((t / s) * 100).toFixed(2)) : 0;
          });
          const shareLabels = apiLabels.length ? apiLabels : (derivedMonthlyTrendData?.labels ?? []).map(lbl => formatLabelWithYear(lbl, monthYearMap));

          const gradient = ctx.createLinearGradient(0, 0, 0, 240);
          gradient.addColorStop(0, "rgba(139, 92, 246, 0.45)");
          gradient.addColorStop(1, "rgba(139, 92, 246, 0.02)");

          taxChart.current = new Chart(ctx, {
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
                legend: { display: false },
                datalabels: {
                  display: true,
                  align: "top",
                  anchor: "end",
                  offset: 4,
                  font: { family: 'Plus Jakarta Sans', size: 10, weight: '700' },
                  color: "#7c3aed",
                  formatter: (v) => `${safeToFixed(v, 2)}%`
                }
              },
              scales: {
                y: {
                  type: "linear",
                  position: "left",
                  grid: { color: "rgba(99, 102, 241, 0.05)" },
                  ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81', callback: (v) => `${safeToFixed(v, 2)}%` }
                },
                x: {
                  grid: { display: false },
                  ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81' }
                }
              }
            }
          });
        } else {
          const gradSales = ctx.createLinearGradient(0, 0, 0, 240);
          gradSales.addColorStop(0, "rgba(59, 130, 246, 0.85)");
          gradSales.addColorStop(1, "rgba(59, 130, 246, 0.15)");

          const comboLabels = apiLabels.length ? apiLabels : (derivedMonthlyTrendData?.labels ?? []).map(lbl => formatLabelWithYear(lbl, monthYearMap));

          taxChart.current = new Chart(ctx, {
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
                  datalabels: { display: false }
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
                    formatter: (v) => `₹${safeToFixed(v, 2)}L`
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
                  ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#7c3aed', callback: (v) => `₹${safeToFixed(v, 2)}L` },
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
      } catch (err) {
        console.error("Tax chart init error:", err);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      taxChart.current?.destroy();
    };
  }, [performanceChartType, derivedMonthlyTaxData, derivedMonthlyTrendData, loading]);

  const weeklyPlanVsActual = useMemo(() => {
    if (!filteredPlanVsActual || filteredPlanVsActual.length === 0) {
      return { labels: [], planned: [], dispatched: [], sortedKeys: [] };
    }

    const weekMap = {};
    filteredPlanVsActual.forEach((row) => {
      if (!row.date) return;
      const d = new Date(row.date);
      if (isNaN(d.getTime())) return;

      const year = d.getFullYear();
      const month = d.getMonth();
      const day = d.getDate();

      let wk = 5;
      if (day <= 7) wk = 1;
      else if (day <= 14) wk = 2;
      else if (day <= 21) wk = 3;
      else if (day <= 28) wk = 4;

      const key = `${year}-${String(month + 1).padStart(2, "0")}-W${wk}`;
      const monthShort = d.toLocaleString("en-US", { month: "short" });
      const label = `W${wk} ${monthShort}`;

      if (!weekMap[key]) {
        weekMap[key] = {
          label,
          key,
          planQty: 0,
          dispatchQty: 0,
          year,
          month,
          wk,
        };
      }

      weekMap[key].planQty += Number(row.planQty || 0);
      weekMap[key].dispatchQty += Number(row.dispatchQty || 0);
    });

    const sortedKeys = Object.values(weekMap).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.month !== b.month) return a.month - b.month;
      return a.wk - b.wk;
    });

    const labels = sortedKeys.map((item) => item.label);
    const planned = sortedKeys.map((item) => item.planQty);
    const dispatched = sortedKeys.map((item) => item.dispatchQty);

    return { labels, planned, dispatched, sortedKeys };
  }, [filteredPlanVsActual]);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      if (!planRef.current) return;

      const { labels, planned, dispatched, sortedKeys } = weeklyPlanVsActual;
      const maxVal = Math.max(0, ...planned, ...dispatched);

      if (planChart.current) {
        planChart.current.data.labels = labels;
        planChart.current.data.datasets[0].data = planned;
        planChart.current.data.datasets[1].data = dispatched;
        if (planChart.current.options?.scales?.y) {
          planChart.current.options.scales.y.max = maxVal > 0 ? Math.ceil(maxVal * 1.25) : 10;
        }
        planChart.current.update("none");
        return;
      }

      const ctx = planRef.current.getContext("2d");

      const gradPlanned = ctx.createLinearGradient(0, 0, 0, 240);
      gradPlanned.addColorStop(0, "rgba(139, 92, 246, 0.95)");
      gradPlanned.addColorStop(1, "rgba(139, 92, 246, 0.15)");

      const gradDispatched = ctx.createLinearGradient(0, 0, 0, 240);
      gradDispatched.addColorStop(0, "rgba(16, 185, 129, 0.95)");
      gradDispatched.addColorStop(1, "rgba(16, 185, 129, 0.15)");

      try {
        planChart.current = new Chart(ctx, {
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
                label: "Actual Dispatched Quantity",
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
                    const item = sortedKeys[ctx.dataIndex];
                    const val = Number(ctx.parsed.y) || 0;
                    if (ctx.datasetIndex === 0) {
                      return `Planned Qty: ${formatQty(val)} (${item?.label || '—'})`;
                    } else {
                      return `Actual Dispatched Qty: ${formatQty(val)} / ${formatQty(item?.planQty || 0)} planned`;
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
                max: maxVal > 0 ? Math.ceil(maxVal * 1.25) : 10,
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
      } catch (err) {
        console.error("Plan chart init error:", err);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [weeklyPlanVsActual, loading]);

  const monthlyProjectionsChartData = useMemo(() => {
    if (!filteredProjections || filteredProjections.length === 0) {
      return { labels: [], dispatchedQty: [], pendingQty: [], totalAmtLakhs: [], pendingValLakhs: [], sortedMonths: [] };
    }

    const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

    const monthMap = {};
    filteredProjections.forEach((row) => {
      const mStr = (row.schdMonth || row.month || "Unknown").trim();
      if (!monthMap[mStr]) {
        const parts = mStr.toLowerCase().split(" ");
        let mIdx = MONTHS.indexOf(parts[0]);
        let yVal = parseInt(parts[1]) || new Date().getFullYear();
        if (mIdx === -1) mIdx = 0;
        const sortVal = yVal * 12 + mIdx;

        monthMap[mStr] = {
          monthLabel: mStr,
          sortVal,
          dispQty: 0,
          pendQty: 0,
          totAmt: 0,
          pendVal: 0,
        };
      }

      monthMap[mStr].dispQty += Number(row.dispQty || 0);
      monthMap[mStr].pendQty += Number(row.pendQty || 0);
      monthMap[mStr].totAmt += Number(row.totAmt || 0);
      monthMap[mStr].pendVal += Number(row.pendVal || 0);
    });

    const sortedMonths = Object.values(monthMap).sort((a, b) => a.sortVal - b.sortVal);

    const labels = sortedMonths.map((m) => m.monthLabel);
    const dispatchedQty = sortedMonths.map((m) => m.dispQty);
    const pendingQty = sortedMonths.map((m) => m.pendQty);
    const totalAmtLakhs = sortedMonths.map((m) => jsRound(m.totAmt / 100_000, 2));
    const pendingValLakhs = sortedMonths.map((m) => jsRound(m.pendVal / 100_000, 2));

    return {
      labels,
      dispatchedQty,
      pendingQty,
      totalAmtLakhs,
      pendingValLakhs,
      sortedMonths,
    };
  }, [filteredProjections]);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      if (!projRef.current) return;
      projChart.current?.destroy();

      const ctx = projRef.current.getContext("2d");
      const { labels, dispatchedQty, pendingQty, totalAmtLakhs, pendingValLakhs, sortedMonths } = monthlyProjectionsChartData;

      const gradDisp = ctx.createLinearGradient(0, 0, 0, 240);
      gradDisp.addColorStop(0, "rgba(16, 185, 129, 0.85)");
      gradDisp.addColorStop(1, "rgba(16, 185, 129, 0.15)");

      const gradPend = ctx.createLinearGradient(0, 0, 0, 240);
      gradPend.addColorStop(0, "rgba(249, 115, 22, 0.85)");
      gradPend.addColorStop(1, "rgba(249, 115, 22, 0.15)");

      const gradVal = ctx.createLinearGradient(0, 0, 0, 240);
      gradVal.addColorStop(0, "rgba(79, 70, 229, 0.85)");
      gradVal.addColorStop(1, "rgba(79, 70, 229, 0.15)");

      const gradPendVal = ctx.createLinearGradient(0, 0, 0, 240);
      gradPendVal.addColorStop(0, "rgba(239, 68, 68, 0.85)");
      gradPendVal.addColorStop(1, "rgba(239, 68, 68, 0.15)");

      try {
        projChart.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: labels,
            datasets: [
              {
                type: projChartType === "bar" ? "bar" : "line",
                label: "Total Order Value (Lakhs)",
                data: totalAmtLakhs,
                backgroundColor: projChartType === "bar" ? gradVal : "rgba(79, 70, 229, 0.05)",
                borderColor: "rgba(79, 70, 229, 1)",
                borderWidth: 2.5,
                tension: 0.4,
                fill: false,
                pointRadius: projChartType === "bar" ? 0 : 4,
                pointHoverRadius: projChartType === "bar" ? 0 : 6,
                pointBackgroundColor: "#ffffff",
                pointBorderColor: "rgba(79, 70, 229, 1)",
                pointBorderWidth: 2,
                borderRadius: projChartType === "bar" ? 4 : 0,
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
                  formatter: (v) => `₹${safeToFixed(v, 1)}L`
                }
              },
              {
                type: projChartType === "line" ? "line" : "bar",
                label: "Pending Value (Lakhs)",
                data: pendingValLakhs,
                backgroundColor: projChartType === "line" ? "rgba(239, 68, 68, 0.05)" : gradPendVal,
                borderColor: "rgba(239, 68, 68, 1)",
                borderWidth: 2.5,
                tension: 0.4,
                fill: false,
                pointRadius: projChartType === "line" ? 4 : 0,
                pointHoverRadius: projChartType === "line" ? 6 : 0,
                pointBackgroundColor: "#ffffff",
                pointBorderColor: "rgba(239, 68, 68, 1)",
                pointBorderWidth: 2,
                borderRadius: projChartType === "line" ? 0 : 4,
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
                  formatter: (v) => `₹${safeToFixed(v, 1)}L`
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
                    const monthData = sortedMonths[ctx.dataIndex];
                    const val = Number(ctx.parsed.y) || 0;
                    const lbl = ctx.dataset?.label || "";
                    return `${lbl}: ₹${safeToFixed(val, 2)} Lakhs (${monthData?.monthLabel || '—'})`;
                  }
                }
              }
            },
            scales: {
              yValue: {
                type: "linear",
                position: "left",
                grid: { color: "rgba(99, 102, 241, 0.05)" },
                ticks: {
                  font: { family: 'Plus Jakarta Sans', size: 9 },
                  color: '#4f46e5',
                  callback: (v) => `₹${v}L`
                },
                title: { display: true, text: "Order Book Value (Lakhs)", font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' }, color: '#4f46e5' }
              },
              x: {
                grid: { display: false },
                ticks: { font: { family: 'Plus Jakarta Sans', size: 9 }, color: '#312e81' }
              }
            }
          }
        });
      } catch (err) {
        console.error("Proj chart init error:", err);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      projChart.current?.destroy();
    };
  }, [monthlyProjectionsChartData, loading, projChartType]);

  useEffect(() => {
    let fromDate = dateRange.from;
    let toDate = dateRange.to;

    if (!fromDate || !toDate || !(fromDate instanceof Date) || !(toDate instanceof Date) || isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      const dflt = getTodayMonthRange();
      fromDate = dflt.from;
      toDate = dflt.to;
      setDateRange(dflt);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams({
      from: toIsoDate(fromDate),
      to: toIsoDate(toDate),
    });
    if (invoiceBtype) params.set("btype", invoiceBtype);
    if (debouncedSearchQuery) {
      params.set("search", debouncedSearchQuery);
    }
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

    const pGT = fetch(`${API_BASE}/sales-analysis/grand-total/?${params}`, fetchOpts)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("Grand total fetch error:", data?.error || r.statusText);
          setGrandTotalVal(null);
          return;
        }
        setGrandTotalVal(data?.grand_total ?? null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Grand total fetch failed:", err);
          setGrandTotalVal(null);
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

    const p9 = fetch(`${API_BASE}/sales-analysis/future-projections/?${params}`, fetchOpts)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("Future projections:", data?.error || r.statusText);
          setProjections([]);
          return;
        }
        setProjections(data.rows ?? []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Future projections fetch failed:", err);
          setProjections([]);
        }
      });

    const p10 = fetch(`${API_BASE}/sales-analysis/plan-vs-actual/?${params}`, fetchOpts)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("Plan vs actual:", data?.error || r.statusText);
          setPlanVsActual([]);
          return;
        }
        setPlanVsActual(data.rows ?? []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Plan vs actual fetch failed:", err);
          setPlanVsActual([]);
        }
      });

    const p11 = fetch(`${API_BASE}/sales-analysis/po-ledger/?${params}`, fetchOpts)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("PO ledger:", data?.error || r.statusText);
          setPoLedger([]);
          return;
        }
        setPoLedger(data.rows ?? []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("PO ledger fetch failed:", err);
          setPoLedger([]);
        }
      });

    const p12 = fetch(`${API_BASE}/sales-analysis/traceability/?${params}`, fetchOpts)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("Traceability:", data?.error || r.statusText);
          setTraceability([]);
          return;
        }
        setTraceability(data.rows ?? []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Traceability fetch failed:", err);
          setTraceability([]);
        }
      });

    const p13 = fetch(`${API_BASE}/sales-analysis/avg-rate-cards/?${params}`, fetchOpts)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("Avg rate cards:", data?.error || r.statusText);
          setAvgRateData(null);
          return;
        }
        setAvgRateData(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Avg rate cards fetch failed:", err);
          setAvgRateData(null);
        }
      });

    Promise.all([p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13]).finally(() => {
      setLoading(false);
    });

    return () => ctrl.abort();
  }, [dateRange.from, dateRange.to, invoiceBtype, debouncedSearchQuery]);

  useEffect(() => {
    let fromDate = dateRange.from;
    let toDate = dateRange.to;

    if (!fromDate || !toDate || !(fromDate instanceof Date) || !(toDate instanceof Date) || isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      const dflt = getTodayMonthRange();
      fromDate = dflt.from;
      toDate = dflt.to;
      setDateRange(dflt);
      return;
    }

    setTableLoading(true);
    const params = new URLSearchParams({
      from: toIsoDate(fromDate),
      to: toIsoDate(toDate),
    });
    if (invoiceBtype) params.set("btype", invoiceBtype);
    if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
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
        setTableLoading(false);
      });

    return () => ctrl.abort();
  }, [dateRange.from, dateRange.to, invoiceBtype, debouncedSearchQuery]);

  // ── Real-time Live Background Sync for Despatch Planning Status ──
  const fetchDespatchPlanLive = useCallback(async () => {
    let fromDate = dateRange.from;
    let toDate = dateRange.to;
    if (!fromDate || !toDate || !(fromDate instanceof Date) || !(toDate instanceof Date) || isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      const dflt = getTodayMonthRange();
      fromDate = dflt.from;
      toDate = dflt.to;
    }

    const params = new URLSearchParams({
      from: toIsoDate(fromDate),
      to: toIsoDate(toDate),
    });
    if (invoiceBtype) params.set("btype", invoiceBtype);
    if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);

    try {
      const res = await fetch(`${API_BASE}/sales-analysis/plan-vs-actual/?${params}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.rows) {
          setPlanVsActual(prev => {
            if (JSON.stringify(prev) === JSON.stringify(data.rows)) {
              return prev;
            }
            return data.rows;
          });
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.warn("Live despatch poll skipped:", err);
      }
    }
  }, [dateRange.from, dateRange.to, invoiceBtype, debouncedSearchQuery]);

  useEffect(() => {
    // Background polling every 3 seconds for near real-time live data
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchDespatchPlanLive();
      }
    }, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchDespatchPlanLive();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchDespatchPlanLive]);

  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));
  const resetFilters = () => {
    setDateRange(getTodayMonthRange());
    setSearchQuery("");
    setInvoiceBtype("");
    setSelectedCustomers([]);
    setFilters({ customer: "All Customers", product: "All Products", salesGroup: "Sales Group", rejection: "No" });
  };

  const isGlobalLoading = loading || tableLoading;

  return (
    <div className="sa-root">
      {/* ── Global Top Loading Progress Bar ── */}
      <div className={`sa-global-progress-bar ${isGlobalLoading ? "sa-global-progress-bar--active" : ""}`} />

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
        <div className="sa-filter-divider" style={{ width: '1px', height: '16px', backgroundColor: 'rgba(45, 109, 232, 0.15)', margin: '0 4px' }} />

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
              placeholder="Search no part..."
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

      {/* ── Summary Strip ── */}
      <div className="sa-summary-strip">
        {[
          { label: "Period", val: loading ? <div className="sa-skeleton" style={{ width: '75px', height: '14px', borderRadius: '4px' }} /> : derivedSummary?.period ?? "—", sm: true },
          { label: "Grand Total", val: loading ? <div className="sa-skeleton" style={{ width: '85px', height: '14px', borderRadius: '4px' }} /> : grandTotalVal != null ? `₹${formatRupees(grandTotalVal)}` : (derivedSummary ? `₹${formatRupees(derivedSummary.grand_total)}` : "—") },
          { label: "Total Invoices", val: loading ? <div className="sa-skeleton" style={{ width: '35px', height: '14px', borderRadius: '4px' }} /> : derivedSummary ? String(derivedSummary.total_invoices) : "—" },
          { label: "Customers", val: loading ? <div className="sa-skeleton" style={{ width: '35px', height: '14px', borderRadius: '4px' }} /> : derivedSummary ? String(derivedSummary.customers) : "—" },
          { label: "Total Qty Sold", val: loading ? <div className="sa-skeleton" style={{ width: '55px', height: '14px', borderRadius: '4px' }} /> : derivedSummary ? formatQty(derivedSummary.total_qty_sold) : "—" },
          { label: "Avg Invoice", val: loading ? <div className="sa-skeleton" style={{ width: '85px', height: '14px', borderRadius: '4px' }} /> : derivedSummary ? `₹${formatRupees(derivedSummary.avg_invoice)}` : "—" },
          {
            label: "Turn Over",
            val: loading ? <div className="sa-skeleton" style={{ width: '65px', height: '14px', borderRadius: '4px' }} /> : derivedSummary ? `₹${Number(derivedSummary.turn_over_lakhs).toFixed(3)}L` : "—",
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
              <TrendingUp size={16} style={{ color: "#2d6de8" }} /> Weekly Sales Trend{!loading && derivedWeeklyTrend?.period ? ` (${derivedWeeklyTrend.period})` : !loading && summary?.period ? ` (${summary.period})` : ""}
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
                ) : derivedWeeklyTrend != null ? (
                  `₹${Number(derivedWeeklyTrend.turn_over_lakhs ?? 0).toFixed(3)}L Total`
                ) : summary ? (
                  `₹${Number(summary.turn_over_lakhs ?? 0).toFixed(3)}L Total`
                ) : "—"}
              </span>
            </div>
          </div>
          {loading ? (
            <div className="sa-chart-skeleton" style={{ height: "300px" }}><div className="sa-skeleton" /></div>
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
                  <span className="sa-center-val">
                    ₹{(Math.floor(Number(derivedSummary?.turn_over_lakhs ?? 0) * 1000) / 1000).toFixed(3)}L
                  </span>
                  <span className="sa-center-lbl">Total Sales</span>
                  <span className="sa-center-sub">
                    {custLabels.length} Customers
                  </span>
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
                      <span className="sa-legend-val">{getCustValue(custPercentages[idx], idx)}</span>
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
              <Package size={16} style={{ color: "#06b6d4" }} /> Revenue by Product
            </span>
          </div>
          {loading ? (
            <div className="sa-chart-skeleton"><div className="sa-skeleton" /></div>
          ) : (
            <div className="sa-donut-layout">
              <div className="sa-donut-chart-container">
                <canvas ref={prodRef} />
                <div className="sa-donut-center-info">
                  <span className="sa-center-val" style={{ fontSize: '0.85rem' }}>
                    {derivedSummary?.total_qty_sold ? derivedSummary.total_qty_sold.toLocaleString("en-IN") : 0}
                  </span>
                  <span className="sa-center-lbl">Total Qty</span>
                  <span className="sa-center-sub">
                    {prodLabels.length} Products
                  </span>
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

      {/* Despatch Planning Status Table Card */}
      <div className="sa-card sa-card--table sa-card--despatch-plan sa-animate" style={{ marginBottom: "1.4rem" }}>
        <div className="sa-card__head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} style={{ color: "#2d6de8" }} /> Despatch Planning Status
            </span>
            <span className="sa-live-badge" title="Live Auto-Sync active: Data continuously updates without page reload">
              <span className="sa-live-dot" />
              <span>Live</span>
            </span>
            <div className="sa-despatch-kpi-badge" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, rgba(45, 109, 232, 0.06), rgba(6, 182, 212, 0.06))',
              border: '1px solid rgba(45, 109, 232, 0.15)',
              borderRadius: '10px',
              padding: '6px 14px',
              marginLeft: '16px',
              fontSize: '0.8rem',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(45, 109, 232, 0.04)'
            }}>
              <span style={{ color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Inv Value:</span>
              <span style={{ color: '#2d6de8', fontWeight: '700', fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                ₹{formatExactRupees(despatchTotalInvValue)}
              </span>
            </div>
          </div>
          <div className="sa-despatch-filters" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ transform: 'scale(0.9)', transformOrigin: 'right center', margin: '0 -10px 0 0' }}>
              <SalesAnalysisDatePicker
                from={despatchDateRange.from}
                to={despatchDateRange.to}
                onChange={({ from, to }) => setDespatchDateRange({ from, to })}
                size="small"
              />
            </div>
            {/* Customer filter */}
            <div className={`sa-custom-select sa-custom-select--despatch-cust${despatchCustDropdownOpen ? " sa-active" : ""}`} ref={despatchCustRef}>
              <button
                type="button"
                className="sa-custom-select-trigger"
                onClick={() => {
                  setDespatchCustDropdownOpen(prev => !prev);
                  setDespatchPartDropdownOpen(false);
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {despatchCustFilter.length === 0
                      ? "All Customers"
                      : despatchCustFilter.length === 1
                        ? despatchCustFilter[0]
                        : `${despatchCustFilter.length} Customers`}
                  </span>
                  {despatchCustFilter.length > 1 && (
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
                      {despatchCustFilter.length}
                    </span>
                  )}
                </span>
                <span className="sa-custom-select-arrow">
                  <ChevronDown size={14} />
                </span>
              </button>
              {despatchCustDropdownOpen && (
                <div className="sa-custom-select-dropdown-container" style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  width: '320px',
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
                        value={despatchCustSearch}
                        onChange={(e) => setDespatchCustSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {despatchCustSearch && (
                        <button
                          type="button"
                          className="sa-search-clear-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDespatchCustSearch("");
                          }}
                          title="Clear search"
                        >
                          <X size={10} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </div>
                  <ul className="sa-custom-select-options" style={{ position: 'static', boxShadow: 'none', maxHeight: '220px', overflowY: 'auto' }}>
                    <li
                      className={`sa-custom-select-option${despatchCustFilter.length === 0 ? " sa-multi-selected" : ""}`}
                      onClick={() => {
                        setDespatchCustFilter([]);
                      }}
                      style={{ display: 'flex', alignItems: 'center' }}
                    >
                      <span className={`sa-checkbox-box${despatchCustFilter.length === 0 ? " sa-checkbox-box--checked" : ""}`}>
                        {despatchCustFilter.length === 0 && (
                          <Check size={10} strokeWidth={3} />
                        )}
                      </span>
                      All Customers
                    </li>
                    {filteredUniqueCustomers.map(cust => {
                      const isSelected = despatchCustFilter.includes(cust);
                      return (
                        <li
                          key={cust}
                          className={`sa-custom-select-option${isSelected ? " sa-multi-selected" : ""}`}
                          onClick={() => {
                            if (isSelected) {
                              setDespatchCustFilter(despatchCustFilter.filter(c => c !== cust));
                            } else {
                              setDespatchCustFilter([...despatchCustFilter, cust]);
                            }
                          }}
                          style={{ display: 'flex', alignItems: 'center' }}
                        >
                          <span className={`sa-checkbox-box${isSelected ? " sa-checkbox-box--checked" : ""}`}>
                            {isSelected && (
                              <Check size={10} strokeWidth={3} />
                            )}
                          </span>
                          {cust}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Part No filter */}
            <div className={`sa-custom-select sa-custom-select--despatch-part${despatchPartDropdownOpen ? " sa-active" : ""}`} ref={despatchPartRef}>
              <button
                type="button"
                className="sa-custom-select-trigger"
                onClick={() => {
                  setDespatchPartDropdownOpen(prev => !prev);
                  setDespatchCustDropdownOpen(false);
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {despatchPartFilter.length === 0
                      ? "All Part Numbers"
                      : despatchPartFilter.length === 1
                        ? despatchPartFilter[0]
                        : `${despatchPartFilter.length} Parts`}
                  </span>
                  {despatchPartFilter.length > 1 && (
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
                      {despatchPartFilter.length}
                    </span>
                  )}
                </span>
                <span className="sa-custom-select-arrow">
                  <ChevronDown size={14} />
                </span>
              </button>
              {despatchPartDropdownOpen && (
                <div className="sa-custom-select-dropdown-container" style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  width: '240px',
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
                        placeholder="Search part no..."
                        value={despatchPartSearch}
                        onChange={(e) => setDespatchPartSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {despatchPartSearch && (
                        <button
                          type="button"
                          className="sa-search-clear-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDespatchPartSearch("");
                          }}
                          title="Clear search"
                        >
                          <X size={10} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </div>
                  <ul className="sa-custom-select-options" style={{ position: 'static', boxShadow: 'none', maxHeight: '220px', overflowY: 'auto' }}>
                    <li
                      className={`sa-custom-select-option${despatchPartFilter.length === 0 ? " sa-multi-selected" : ""}`}
                      onClick={() => {
                        setDespatchPartFilter([]);
                      }}
                      style={{ display: 'flex', alignItems: 'center' }}
                    >
                      <span className={`sa-checkbox-box${despatchPartFilter.length === 0 ? " sa-checkbox-box--checked" : ""}`}>
                        {despatchPartFilter.length === 0 && (
                          <Check size={10} strokeWidth={3} />
                        )}
                      </span>
                      All Part Numbers
                    </li>
                    {filteredUniqueParts.map(part => {
                      const isSelected = despatchPartFilter.includes(part);
                      return (
                        <li
                          key={part}
                          className={`sa-custom-select-option${isSelected ? " sa-multi-selected" : ""}`}
                          onClick={() => {
                            if (isSelected) {
                              setDespatchPartFilter(despatchPartFilter.filter(p => p !== part));
                            } else {
                              setDespatchPartFilter([...despatchPartFilter, part]);
                            }
                          }}
                          style={{ display: 'flex', alignItems: 'center' }}
                        >
                          <span className={`sa-checkbox-box${isSelected ? " sa-checkbox-box--checked" : ""}`}>
                            {isSelected && (
                              <Check size={10} strokeWidth={3} />
                            )}
                          </span>
                          {part}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
            
            <button
              onClick={handleDespatchExport}
              className="sa-btn sa-btn--primary sa-po-export-btn"
              title="Export Despatch Plan to CSV"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '34px', padding: '0 12px', fontSize: '0.8rem' }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
        <div className="sa-table-scroll sa-despatch-table-wrap">
          <table className="sa-table sa-despatch-table">
            <thead>
              <tr>
                <th>Part No</th>
                <th>Description</th>
                <th className="sa-num">Pending Planned Qty</th>
                <th className="sa-num">Planned Qty</th>
                <th className="sa-num">Available Qty</th>
                <th className="sa-num">Despatch Qty</th>
                <th>Inv No</th>
                <th>Inv Dt</th>
                <th className="sa-num">Inv Value</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, idx) => (
                  <tr key={idx}>
                    <td><div className="sa-skeleton" style={{ width: '80px', height: '12px' }} /></td>
                    <td><div className="sa-skeleton" style={{ width: '140px', height: '12px' }} /></td>
                    <td className="sa-num"><div className="sa-skeleton" style={{ width: '40px', height: '12px', marginLeft: 'auto' }} /></td>
                    <td className="sa-num"><div className="sa-skeleton" style={{ width: '40px', height: '12px', marginLeft: 'auto' }} /></td>
                    <td className="sa-num"><div className="sa-skeleton" style={{ width: '40px', height: '12px', marginLeft: 'auto' }} /></td>
                    <td className="sa-num"><div className="sa-skeleton" style={{ width: '40px', height: '12px', marginLeft: 'auto' }} /></td>
                    <td><div className="sa-skeleton" style={{ width: '70px', height: '12px' }} /></td>
                    <td><div className="sa-skeleton" style={{ width: '80px', height: '12px' }} /></td>
                    <td className="sa-num"><div className="sa-skeleton" style={{ width: '60px', height: '12px', marginLeft: 'auto' }} /></td>
                  </tr>
                ))
              ) : filteredDespatchPlan.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                    No pending despatch plan records found
                  </td>
                </tr>
              ) : (
                Object.entries(groupedDespatchPlan).map(([customerName, rows]) => (
                  <Fragment key={customerName}>
                    <tr className="sa-table-group-header">
                      <td colSpan="9" className="sa-despatch-group-title">
                        <div className="sa-despatch-group-title-content">
                          <Building2 size={14} className="sa-despatch-group-icon" />
                          <span className="sa-despatch-group-name">{customerName}</span>
                          <span className="sa-despatch-group-count-badge">
                            {rows.length} {rows.length === 1 ? "item" : "items"}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {rows.map((row, rowIdx) => (
                      <tr key={`${customerName}-${rowIdx}`} style={{ animationDelay: `${rowIdx * 35}ms` }}>
                        <td><span className="sa-part-no-tag">{row.partNo}</span></td>
                        <td style={{ color: "#475569" }} title={row.description}>{row.description}</td>
                        <td className="sa-num">
                          <span className={Number(row.pendingPlannedQty) > 0 ? "sa-pending-qty-badge" : "sa-pending-qty-badge sa-pending-qty-badge--zero"}>
                            {formatQty(row.pendingPlannedQty)}
                          </span>
                        </td>
                        <td className="sa-num" style={{ fontWeight: 500 }}>{formatQty(row.plannedQty)}</td>
                        <td className="sa-num" style={{ fontWeight: 500 }}>{formatQty(row.availableQty)}</td>
                        <td className="sa-num">
                          <span className={Number(row.despatchQty) > 0 ? "sa-despatch-qty-badge" : "sa-despatch-qty-badge sa-despatch-qty-badge--zero"}>
                            {formatQty(row.despatchQty)}
                          </span>
                        </td>
                        <td>
                          {row.invNo && row.invNo !== "-" ? (
                            <span className="sa-inv-tag">{row.invNo}</span>
                          ) : (
                            <span className="sa-inv-tag--none">-</span>
                          )}
                        </td>
                        <td>
                          {row.invDate && row.invDate !== "—" ? (
                            <span className="sa-inv-date-tag">{row.invDate}</span>
                          ) : (
                            <span className="sa-inv-tag--none">-</span>
                          )}
                        </td>
                        <td className="sa-num" style={{ fontWeight: 500 }}>
                          {row.invValue != null && row.invValue !== "" && Number(row.invValue) > 0 ? `₹${formatExactRupees(row.invValue)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
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
                  ₹{monthlyAvg.toFixed(3)}L Avg
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
        <div className="sa-card" style={{ display: 'flex', flexDirection: 'column' }}>
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
                derivedMonthSummary?.period ?? summary?.period ?? "—"
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
                    const maxMonthAmount = Math.max(...(derivedMonthSummary?.rows?.map(r => r.amount || 0) || [1])) || 1;
                    return (derivedMonthSummary?.rows?.length ? derivedMonthSummary.rows : []).map((row, i) => (
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
                {!loading && !derivedMonthSummary?.rows?.length && (
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
          ) : derivedMonthSummary?.totals ? (
            <table className="sa-mini-table sa-mini-table--total">
              <tbody>
                <tr className="sa-mini-table__total">
                  <td><strong>Total</strong></td>
                  <td className="sa-num"><strong>{derivedMonthSummary.totals.invoices}</strong></td>
                  <td className="sa-num"><strong>{formatQty(derivedMonthSummary.totals.qty_sold)}</strong></td>
                  <td className="sa-num">
                    <div className="sa-month-total-amt">{formatRupees(derivedMonthSummary.totals.amount)}</div>
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
              ) : (derivedMonthSummary?.invoice_status ?? []).map((group) => (
                <div
                  key={group.key}
                  className={`sa-inv-status__box sa-inv-status__box--group sa-inv-status__box--${group.key}`}
                >
                  <div className="sa-inv-status__box-header">
                    <div className="sa-inv-status__box-lbl" style={{ color: '#475569', fontWeight: 600 }}>Total</div>
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
              {!loading && !derivedMonthSummary?.invoice_status?.length && (
                <>
                  {[1, 2, 3].map((idx) => (
                    <div key={idx} className="sa-inv-status__box" style={{ background: "#f1f5f9" }}>
                      <div className="sa-inv-status__box-header">
                        <div className="sa-inv-status__box-lbl" style={{ color: '#64748b', fontWeight: 600 }}>Total</div>
                        <div className="sa-inv-status__box-val" style={{ color: "#475569" }}>—</div>
                      </div>
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
                <th onClick={() => handleInvSort("invoice_no")} style={{ cursor: "pointer" }}>Invoice No {invSortConfig.key === "invoice_no" ? (invSortConfig.direction === "asc" ? "↑" : "↓") : ""}</th>
                <th onClick={() => handleInvSort("date")} style={{ cursor: "pointer" }}>Date {invSortConfig.key === "date" ? (invSortConfig.direction === "asc" ? "↑" : "↓") : ""}</th>
                <th onClick={() => handleInvSort("customer")} style={{ cursor: "pointer" }}>Customer {invSortConfig.key === "customer" ? (invSortConfig.direction === "asc" ? "↑" : "↓") : ""}</th>
                <th onClick={() => handleInvSort("part_no")} style={{ cursor: "pointer" }}>Part No {invSortConfig.key === "part_no" ? (invSortConfig.direction === "asc" ? "↑" : "↓") : ""}</th>
                <th onClick={() => handleInvSort("description")} style={{ cursor: "pointer" }}>Description {invSortConfig.key === "description" ? (invSortConfig.direction === "asc" ? "↑" : "↓") : ""}</th>
                <th className="sa-num" onClick={() => handleInvSort("qty")} style={{ cursor: "pointer" }}>Qty {invSortConfig.key === "qty" ? (invSortConfig.direction === "asc" ? "↑" : "↓") : ""}</th>
                <th onClick={() => handleInvSort("uom")} style={{ cursor: "pointer" }}>UOM {invSortConfig.key === "uom" ? (invSortConfig.direction === "asc" ? "↑" : "↓") : ""}</th>
                <th className="sa-num" onClick={() => handleInvSort("rate")} style={{ cursor: "pointer" }}>Rate (₹) {invSortConfig.key === "rate" ? (invSortConfig.direction === "asc" ? "↑" : "↓") : ""}</th>
                <th className="sa-num" onClick={() => handleInvSort("amount")} style={{ cursor: "pointer" }}>Amount (₹) {invSortConfig.key === "amount" ? (invSortConfig.direction === "asc" ? "↑" : "↓") : ""}</th>
                <th className="sa-e-invoice" onClick={() => handleInvSort("e_invoice")} style={{ cursor: "pointer" }}>E.Invoice {invSortConfig.key === "e_invoice" ? (invSortConfig.direction === "asc" ? "↑" : "↓") : ""}</th>
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
                    <td><div className="sa-skeleton" style={{ width: '30px', height: '12px' }} /></td>
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
                    <td>{r.uom || "—"}</td>
                    <td className="sa-num">{formatRate(r.rate)}</td>
                    <td className="sa-num"><strong>{formatRate(r.amount)}</strong></td>
                    <td className="sa-e-invoice">{r.e_invoice || "—"}</td>
                  </tr>
                ))
              )}
              {!tableLoading && !filteredInvoices.length && (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", color: "#94a3b8" }}>—</td>
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
          <div className="sa-proj-head-actions">
            <div className="sa-chart-type-toggle sa-chart-type-toggle--proj" style={{ margin: 0 }}>
              <button
                className={`sa-toggle-btn ${projChartType === "combo" ? "active" : ""}`}
                onClick={() => setProjChartType("combo")}
              >
                Combo
              </button>
              <button
                className={`sa-toggle-btn ${projChartType === "bar" ? "active" : ""}`}
                onClick={() => setProjChartType("bar")}
              >
                Bar View
              </button>
              <button
                className={`sa-toggle-btn ${projChartType === "line" ? "active" : ""}`}
                onClick={() => setProjChartType("line")}
              >
                Line View
              </button>
            </div>
            <span className="sa-badge sa-badge--purple">{new Set(filteredProjections.map((r) => r.customer)).size} Active Customers</span>
            <span className="sa-badge sa-badge--blue" style={{ background: 'rgba(45, 109, 232, 0.08)', color: '#2d6de8', border: '1px solid rgba(45, 109, 232, 0.15)', fontSize: '0.84rem', padding: '6px 12px', fontWeight: '700' }}>Total Amt: ₹{formatRupees(projectionTotals.totAmt)}</span>
            <span className="sa-badge sa-badge--orange" style={{ background: 'rgba(249, 115, 22, 0.08)', color: '#ea580c', border: '1px solid rgba(249, 115, 22, 0.15)', fontSize: '0.84rem', padding: '6px 12px', fontWeight: '700' }}>Pending Value: ₹{formatRupees(projectionTotals.pendVal)}</span>
          </div>
        </div>
        {/* Order Book Analysis Combo Chart */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(99, 102, 241, 0.08)' }}>
          {loading ? (
            <div className="sa-chart-skeleton" style={{ height: '300px' }}><div className="sa-skeleton" /></div>
          ) : (
            <div className="sa-chart-wrap" style={{ height: '300px' }}>
              <canvas ref={projRef} />
            </div>
          )}
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
          {loading ? (
            <div className="sa-chart-skeleton" style={{ height: '300px' }}><div className="sa-skeleton" /></div>
          ) : (
            <div className="sa-chart-wrap" style={{ height: '300px' }}>
              <canvas ref={planRef} />
            </div>
          )}
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
                  Party Name <SortIcon active={planSortField === "customer"} asc={planSortAsc} />
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
                      <td className="sa-date">{formatToDdMmYyyy(row.date)}</td>
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
                <th style={{ textAlign: "center" }}>#</th>
                <th>CUSTOMER NAME</th>
                <th>INVOICE NO</th>
                <th>INVOICE DATE</th>
                <th>DC NO</th>
                <th>DC DATE</th>
                <th>GRN/PO DET</th>
                <th>ROUTECARD NO</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: "center" }}><div className="sa-skeleton" style={{ width: '20px', height: '12px' }} /></td>
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
                filteredTraceability.map((row, i) => (
                  <tr key={i} className="sa-trace-row" style={{ "--ri": i }}>
                    <td style={{ textAlign: "center" }}>{i + 1}</td>
                    <td><strong className="sa-trace-cust-name">{row.customer}</strong></td>
                    <td><strong className="sa-trace-inv">{row.invNo}</strong></td>
                    <td className="sa-date">{formatToDdMmYyyy(row.invDate)}</td>
                    <td>{row.dcNo}</td>
                    <td className="sa-date">{formatToDdMmYyyy(row.dcDate)}</td>
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
                  Shot Close Qty {poSortField === "shortCloseQty" && (poSortAsc ? "▲" : "▼")}
                </th>
                <th className="sa-sortable" onClick={() => handlePoSort("shotCloseReason")}>
                  Shot Close Reason {poSortField === "shotCloseReason" && (poSortAsc ? "▲" : "▼")}
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
                      <td className="sa-date">{formatToDdMmYyyy(row.poDate)}</td>
                      <td><span className="sa-po-cust-name" title={row.custName}>{row.custName}</span></td>
                      <td><span className="sa-po-part-desc" title={row.partDesc}>{row.partDesc}</span></td>
                      <td><span className="sa-po-sl-no" style={{ fontWeight: '600', color: '#475569' }}>{row.poSlNo || "—"}</span></td>
                      <td className="sa-num">{formatQty(row.qty)}</td>
                      <td className="sa-num">{formatQty(row.shortCloseQty)}</td>
                      <td>{row.shotCloseReason || <span className="sa-dash-gray">—</span>}</td>
                      <td className="sa-num">₹{formatExact(row.rate)}</td>
                      <td className="sa-num"><strong>₹{formatExact(row.value)}</strong></td>
                      <td>
                        {row.dcNo === "—" ? (
                          <span className="sa-dash-gray">—</span>
                        ) : (
                          <strong className="sa-po-dc-code">{row.dcNo}</strong>
                        )}
                      </td>
                      <td className="sa-date">{formatToDdMmYyyy(row.dcDate)}</td>
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
                            ₹{formatExact(row.pendingValue)}
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
                          <span className="sa-po-inv-details">{formatToDdMmYyyy(row.invNoDt)}</span>
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
              {getPageNumbers.map((item, idx) => {
                if (item === "...") {
                  return (
                    <span key={`ellipsis-${idx}`} className="sa-pagination-ellipsis">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={item}
                    onClick={() => setPoPage(item)}
                    className={`sa-pagination-page-btn ${poPage === item ? 'active' : ''}`}
                  >
                    {item}
                  </button>
                );
              })}
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
            <span className="sa-badge sa-badge--orange">{dynamicManagementInsights.insights.length} Key Points</span>
          </div>
          <div className="sa-insight-list">
            {loading ? (
              [...Array(5)].map((_, idx) => (
                <div className="sa-insight-row" key={idx} style={{ padding: '10px 14px' }}>
                  <div className="sa-skeleton" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
                  <div className="sa-insight-row__body" style={{ flex: 1, margin: '0 10px' }}>
                    <div className="sa-skeleton" style={{ width: '60%', height: '12px', marginBottom: '4px' }} />
                    <div className="sa-skeleton" style={{ width: '90%', height: '10px' }} />
                  </div>
                  <div className="sa-skeleton" style={{ width: '40px', height: '12px' }} />
                </div>
              ))
            ) : (
              dynamicManagementInsights.insights.map((ins, i) => {
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
              })
            )}
          </div>
          <div className="sa-priority-box">
            <div className="sa-priority-box__title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Pin size={14} style={{ color: "#ef4444", transform: "rotate(45deg)" }} /> Priority Action for Management
            </div>
            <div className="sa-priority-box__body">
              {loading ? (
                <div className="sa-skeleton" style={{ width: '100%', height: '24px', borderRadius: '4px' }} />
              ) : (
                dynamicManagementInsights.priorityActionText
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}