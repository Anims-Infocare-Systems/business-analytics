import { useEffect, useMemo, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
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
  RotateCcw,
  Link
} from "lucide-react";
import "./SalesAnalysis.css";
import SalesAnalysisDatePicker from "./SalesAnalysisDatePicker";

Chart.register(...registerables);

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

function formatRate(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatInvDate(iso) {
  if (!iso) return "—";
  const parts = String(iso).slice(0, 10).split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
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
  const yMax = maxValue > 0 ? Math.ceil(maxValue * 1.12) : undefined;
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
        backgroundColor: "rgba(45, 109, 232, 0.18)",
        borderColor: "#2d6de8",
        borderWidth: 2,
        borderRadius: 6,
        type: "bar",
        yAxisID: "y",
        datalabels: {
          display: true,
          align: "top",
          anchor: "end",
          rotation: -45,
          offset: -2,
          formatter: (value) => {
            if (!value || value < 10_000) return "";
            if (value >= 100_000) {
              return `${(value / 100_000).toFixed(1)}L`;
            }
            return `${(value / 1000).toFixed(0)}K`;
          },
          font: {
            size: 9.5,
            weight: "700"
          },
          color: "#1e40af"
        }
      },
      {
        label: "Cumulative",
        data: cumulative,
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.08)",
        borderWidth: 2.5,
        tension: 0.42,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        type: "line",
        yAxisID: "y1",
        datalabels: {
          display: false
        }
      },
    ],
  };
}

const DONUT_COLORS_CUSTOMER = ["#2d6de8", "#f97316", "#10b981", "#8b5cf6", "#94a3b8"];
const DONUT_COLORS_PRODUCT = ["#2d6de8", "#10b981", "#f97316", "#8b5cf6", "#ef4444"];

const DONUT_CHART_OPTS = (font) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
      labels: { font: { size: 10, family: font }, padding: 10, boxWidth: 10 },
    },
    tooltip: {
      callbacks: {
        label(ctx) {
          const pct = ctx.parsed ?? 0;
          return `${ctx.label}: ${pct}%`;
        },
      },
    },
    datalabels: {
      display: false
    }
  },
  cutout: "64%",
});

function buildDonutChartData(slice, colors) {
  const labels = slice?.labels ?? [];
  const data = slice?.percentages ?? [];
  return {
    labels,
    datasets: [{
      data,
      backgroundColor: colors.slice(0, labels.length),
      borderColor: "#fff",
      borderWidth: 3,
      hoverOffset: 6,
    }],
  };
}

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
  { customer: "Coromandel International Limited", month: "July 2026", pos: 12, totQty: 4500, totAmt: 8500000, dispQty: 3200, pendQty: 1300, pendVal: 2450000 },
  { customer: "Shanthi Gears Limited", month: "July 2026", pos: 8, totQty: 2800, totAmt: 5400000, dispQty: 2500, pendQty: 300, pendVal: 580000 },
  { customer: "Canara India Private Limited", month: "August 2026", pos: 15, totQty: 6200, totAmt: 12500000, dispQty: 4800, pendQty: 1400, pendVal: 2820000 },
  { customer: "STI Digital Ltd", month: "July 2026", pos: 6, totQty: 1900, totAmt: 3200000, dispQty: 1900, pendQty: 0, pendVal: 0 },
  { customer: "Vasanthi Foundry", month: "August 2026", pos: 9, totQty: 3100, totAmt: 6100000, dispQty: 2200, pendQty: 900, pendVal: 1770000 },
  { customer: "VR Foundries", month: "September 2026", pos: 7, totQty: 2400, totAmt: 4800000, dispQty: 1800, pendQty: 600, pendVal: 1200000 },
];

const MOCK_TRACEABILITY = [
  { rcNo: "RC-2026-0891", customer: "Coromandel International Limited", dcNo: "DC/26/1029", dcDate: "12/06/2026", grnPo: "PO-45001272", invNo: "INV-260192", invDate: "15/06/2026" },
  { rcNo: "RC-2026-0892", customer: "Shanthi Gears Limited", dcNo: "DC/26/1030", dcDate: "13/06/2026", grnPo: "PO-45001289", invNo: "INV-260193", invDate: "15/06/2026" },
  { rcNo: "RC-2026-0893", customer: "Canara India Private Limited", dcNo: "DC/26/1031", dcDate: "14/06/2026", grnPo: "PO-45001301", invNo: "INV-260194", invDate: "16/06/2026" },
  { rcNo: "RC-2026-0894", customer: "STI Digital Ltd", dcNo: "DC/26/1032", dcDate: "14/06/2026", grnPo: "PO-45001312", invNo: "INV-260195", invDate: "16/06/2026" },
  { rcNo: "RC-2026-0895", customer: "Vasanthi Foundry", dcNo: "DC/26/1033", dcDate: "15/06/2026", grnPo: "PO-45001322", invNo: "INV-260196", invDate: "17/06/2026" },
  { rcNo: "RC-2026-0896", customer: "VR Foundries", dcNo: "DC/26/1034", dcDate: "15/06/2026", grnPo: "PO-45001344", invNo: "INV-260197", invDate: "17/06/2026" },
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
  const [topProductsRaw, setTopProductsRaw] = useState(null);
  const [invoiceDropdownOpen, setInvoiceDropdownOpen] = useState(false);
  const invoiceDropdownRef = useRef(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const optionsList = useMemo(() => ["", ...invoiceBtypes], [invoiceBtypes]);
  const projectionTotals = useMemo(() => {
    return MOCK_PROJECTIONS.reduce(
      (acc, row) => {
        acc.totAmt += row.totAmt;
        acc.pendVal += row.pendVal;
        return acc;
      },
      { totAmt: 0, pendVal: 0 }
    );
  }, []);

  useEffect(() => {
    if (!invoiceDropdownOpen) {
      setFocusedIndex(-1);
    } else {
      const idx = optionsList.indexOf(invoiceBtype);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  }, [invoiceDropdownOpen, optionsList, invoiceBtype]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (invoiceDropdownRef.current && !invoiceDropdownRef.current.contains(event.target)) {
        setInvoiceDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const kpiCards = useMemo(() => buildKpiCards(summary), [summary]);
  const customerRanking = useMemo(
    () => buildCustomerRanking(revenueCharts?.customer_ranking),
    [revenueCharts],
  );
  const topProducts = useMemo(
    () => buildTopProducts(topProductsRaw?.products),
    [topProductsRaw],
  );

  const filteredInvoices = useMemo(() => {
    return invoiceRows.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (r.invoice_no && r.invoice_no.toLowerCase().includes(q)) ||
        (r.customer && r.customer.toLowerCase().includes(q)) ||
        (r.part_no && r.part_no.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    });
  }, [invoiceRows, searchQuery]);

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
  const trendChart = useRef(null);
  const custChart = useRef(null);
  const prodChart = useRef(null);
  const monthlyTrendChart = useRef(null);
  const billTypeChart = useRef(null);

  const CHART_FONT = "'Segoe UI', system-ui, sans-serif";

  // ✅ Persist date range to sessionStorage on every change
  useEffect(() => {
    writeFilterSession("ba_filter_sales", { from: dateRange.from, to: dateRange.to });
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    if (!custRef.current) return;

    custChart.current?.destroy();
    custChart.current = new Chart(custRef.current, {
      type: "doughnut",
      data: buildDonutChartData(revenueCharts?.customer, DONUT_COLORS_CUSTOMER),
      options: DONUT_CHART_OPTS(CHART_FONT),
    });
    return () => custChart.current?.destroy();
  }, [revenueCharts, loading]);

  useEffect(() => {
    if (!prodRef.current) return;
    prodChart.current?.destroy();
    prodChart.current = new Chart(prodRef.current, {
      type: "doughnut",
      data: buildDonutChartData(revenueCharts?.product, DONUT_COLORS_PRODUCT),
      options: DONUT_CHART_OPTS(CHART_FONT),
    });
    return () => prodChart.current?.destroy();
  }, [revenueCharts, loading]);

  useEffect(() => {
    if (!trendRef.current) return;
    const chartData = buildWeeklyTrendChartData(weeklyTrend);
    const { peak, ...data } = chartData;
    trendChart.current?.destroy();
    trendChart.current = new Chart(trendRef.current, {
      type: "bar",
      data,
      options: TREND_CHART_OPTS(CHART_FONT, peak),
    });
    return () => trendChart.current?.destroy();
  }, [weeklyTrend, loading]);

  useEffect(() => {
    if (!monthlyTrendRef.current) return;
    monthlyTrendChart.current?.destroy();
    monthlyTrendChart.current = new Chart(monthlyTrendRef.current, {
      type: "bar",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
        datasets: [
          {
            label: "Sales Value (Lakhs)",
            data: [12.5, 14.2, 11.8, 16.5, 18.2, 15.9, 21.0],
            backgroundColor: "rgba(45, 109, 232, 0.85)",
            borderRadius: 6,
            yAxisID: "yValue",
          },
          {
            label: "Growth (%)",
            data: [0, 13.6, -16.9, 39.8, 10.3, -12.6, 32.0],
            type: "line",
            borderColor: "#f97316",
            borderWidth: 3,
            pointBackgroundColor: "#f97316",
            pointRadius: 4,
            tension: 0.35,
            fill: false,
            yAxisID: "yGrowth",
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'Inter', size: 10 } }
          },
          datalabels: { display: false }
        },
        scales: {
          yValue: {
            type: "linear",
            position: "left",
            grid: { color: "rgba(45, 109, 232, 0.05)" },
            ticks: { font: { family: 'Inter', size: 9 }, callback: (v) => `₹${v}L` }
          },
          yGrowth: {
            type: "linear",
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: { font: { family: 'Inter', size: 9 }, callback: (v) => `${v}%` }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 9 } }
          }
        }
      }
    });
    return () => monthlyTrendChart.current?.destroy();
  }, [loading]);

  useEffect(() => {
    if (!billTypeRef.current) return;
    billTypeChart.current?.destroy();
    billTypeChart.current = new Chart(billTypeRef.current, {
      type: "bar",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
        datasets: [
          {
            label: "With Material",
            data: [8.2, 9.5, 7.8, 11.0, 12.2, 10.5, 14.2],
            backgroundColor: "#06b6d4",
            borderRadius: 4,
          },
          {
            label: "Labour Charges",
            data: [2.1, 2.4, 2.0, 2.8, 3.2, 2.7, 3.8],
            backgroundColor: "#8b5cf6",
            borderRadius: 4,
          },
          {
            label: "General / Rework",
            data: [1.5, 1.8, 1.3, 2.0, 2.1, 2.0, 2.3],
            backgroundColor: "#f43f5e",
            borderRadius: 4,
          },
          {
            label: "Debit Note",
            data: [0.7, 0.5, 0.7, 0.7, 0.7, 0.7, 0.7],
            backgroundColor: "#eab308",
            borderRadius: 4,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'Inter', size: 10 } }
          },
          datalabels: { display: false }
        },
        scales: {
          y: {
            stacked: true,
            grid: { color: "rgba(45, 109, 232, 0.05)" },
            ticks: { font: { family: 'Inter', size: 9 }, callback: (v) => `₹${v}L` }
          },
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 9 } }
          }
        }
      }
    });
    return () => billTypeChart.current?.destroy();
  }, [loading]);

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

    Promise.all([p1, p2, p3, p4, p5]).finally(() => {
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
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
          <span className="sa-filter-label">Search Invoices</span>
          <div className="sa-search-wrapper">
            <Search className="sa-search-icon-inside" size={14} />
            <input
              type="text"
              className="sa-search-input"
              placeholder="Search no, customer, part..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
          { label: "Period", val: loading ? <div className="sa-skeleton" style={{ width: '75px', height: '14px', borderRadius: '4px' }} /> : summary?.period ?? "—", sm: true },
          { label: "Grand Total", val: loading ? <div className="sa-skeleton" style={{ width: '85px', height: '14px', borderRadius: '4px' }} /> : summary ? `₹${formatRupees(summary.grand_total)}` : "—" },
          { label: "Total Invoices", val: loading ? <div className="sa-skeleton" style={{ width: '35px', height: '14px', borderRadius: '4px' }} /> : summary ? String(summary.total_invoices) : "—" },
          { label: "Customers", val: loading ? <div className="sa-skeleton" style={{ width: '35px', height: '14px', borderRadius: '4px' }} /> : summary ? String(summary.customers) : "—" },
          { label: "Total Qty Sold", val: loading ? <div className="sa-skeleton" style={{ width: '55px', height: '14px', borderRadius: '4px' }} /> : summary ? formatQty(summary.total_qty_sold) : "—" },
          { label: "Avg Invoice", val: loading ? <div className="sa-skeleton" style={{ width: '85px', height: '14px', borderRadius: '4px' }} /> : summary ? `₹${formatRupees(summary.avg_invoice)}` : "—" },
          {
            label: "Turn Over",
            val: loading ? <div className="sa-skeleton" style={{ width: '65px', height: '14px', borderRadius: '4px' }} /> : summary ? `₹${Number(summary.turn_over_lakhs).toFixed(2)}L` : "—",
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
            <div className="sa-kpi-card" key={i} style={{ "--kpi-idx": i }}>
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

      {/* ── Charts Row ── */}
      <div className="sa-charts-row">
        <div className="sa-card sa-card--chart">
          <div className="sa-card__head">
            <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={16} style={{ color: "#2d6de8" }} /> Weekly Sales Trend{!loading && weeklyTrend?.period ? ` (${weeklyTrend.period})` : !loading && summary?.period ? ` (${summary.period})` : ""}
            </span>
            <span className="sa-badge sa-badge--blue">
              {loading ? (
                <div className="sa-skeleton" style={{ width: '50px', height: '10px' }} />
              ) : weeklyTrend != null ? (
                `₹${Number(weeklyTrend.turn_over_lakhs ?? 0).toFixed(2)}L Total`
              ) : summary ? (
                `₹${Number(summary.turn_over_lakhs ?? 0).toFixed(2)}L Total`
              ) : "—"}
            </span>
          </div>
          {loading ? (
            <div className="sa-chart-skeleton"><div className="sa-skeleton" /></div>
          ) : (
            <div className="sa-chart-wrap"><canvas ref={trendRef} /></div>
          )}
        </div>
        <div className="sa-card sa-card--chart">
          <div className="sa-card__head">
            <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={16} style={{ color: "#10b981" }} /> Revenue by Customer
            </span>
          </div>
          {loading ? (
            <div className="sa-chart-skeleton"><div className="sa-skeleton" /></div>
          ) : (
            <div className="sa-chart-wrap"><canvas ref={custRef} /></div>
          )}
        </div>
        <div className="sa-card sa-card--chart">
          <div className="sa-card__head">
            <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Package size={16} style={{ color: "#f97316" }} /> Revenue by Product
            </span>
          </div>
          {loading ? (
            <div className="sa-chart-skeleton"><div className="sa-skeleton" /></div>
          ) : (
            <div className="sa-chart-wrap"><canvas ref={prodRef} /></div>
          )}
        </div>
      </div>

      {/* ── Monthly Analytics Section ── */}
      <div className="sa-card sa-monthly-analytics-card">
        <div className="sa-card__head">
          <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={16} style={{ color: "#2d6de8" }} /> Monthly Performance & Bill Type Analytics
          </span>
          <span className="sa-badge sa-badge--blue">YTD 2026 Performance</span>
        </div>
        <div className="sa-monthly-charts-row">
          <div className="sa-monthly-chart-container">
            <h4 className="sa-chart-title">Monthly Sales Trend (Value & % Growth)</h4>
            <div className="sa-chart-wrap" style={{ height: '260px' }}>
              <canvas ref={monthlyTrendRef} />
            </div>
          </div>
          <div className="sa-monthly-chart-container">
            <h4 className="sa-chart-title">Bill Type Revenue Contribution (Month-wise)</h4>
            <div className="sa-chart-wrap" style={{ height: '260px' }}>
              <canvas ref={billTypeRef} />
            </div>
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
        <div className="sa-card">
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
                  <th>Month</th><th>Invoices</th>
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
                  (monthSummary?.rows?.length ? monthSummary.rows : []).map((row, i) => (
                    <tr key={i}>
                      <td><strong>{row.month}</strong></td>
                      <td>{row.invoices}</td>
                      <td className="sa-num">{formatQty(row.qty_sold)}</td>
                      <td className="sa-num">{formatRupees(row.amount)}</td>
                      <td className="sa-num">
                        {row.growth_pct == null ? (
                          <span className="sa-badge sa-badge--green">—</span>
                        ) : row.growth_pct >= 0 ? (
                          <span className="sa-badge sa-badge--green">↑ {row.growth_pct}%</span>
                        ) : (
                          <span className="sa-badge sa-badge--red">↓ {Math.abs(row.growth_pct)}%</span>
                        )}
                      </td>
                    </tr>
                  ))
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
                  <td><strong>{monthSummary.totals.invoices}</strong></td>
                  <td className="sa-num"><strong>{formatQty(monthSummary.totals.qty_sold)}</strong></td>
                  <td className="sa-num"><strong>{formatRupees(monthSummary.totals.amount)}</strong></td>
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
                  className="sa-inv-status__box sa-inv-status__box--group"
                  style={{ background: group.bg }}
                >
                  <div className="sa-inv-status__box-lbl" style={{ color: group.fg }}>{group.label}</div>
                  <div className="sa-inv-status__box-val" style={{ color: group.vfg }}>{group.total}</div>
                  <div className="sa-inv-status__items">
                    {group.items.map((item) => (
                      <div key={item.btype} className="sa-inv-status__item">
                        <span className="sa-inv-status__item-lbl">{item.btype}</span>
                        <span className="sa-inv-status__item-val" style={{ color: group.vfg }}>{item.count}</span>
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
                <th>E.Invoice</th>
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
                    <td><div className="sa-skeleton" style={{ width: '40px', height: '12px', marginLeft: 'auto' }} /></td>
                    <td><div className="sa-skeleton" style={{ width: '50px', height: '12px', marginLeft: 'auto' }} /></td>
                    <td><div className="sa-skeleton" style={{ width: '75px', height: '12px', marginLeft: 'auto' }} /></td>
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
                    <td>{r.e_invoice || "—"}</td>
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
        <div className="sa-table-scroll">
          <table className="sa-table sa-proj-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer Name</th>
                <th>Month</th>
                <th className="sa-num">No. PO's</th>
                <th className="sa-num">Tot Qty</th>
                <th className="sa-num">Tot Amt (₹)</th>
                <th className="sa-num">Dispatched Qty</th>
                <th className="sa-num">Pending Qty</th>
                <th className="sa-num">Pending Value (₹)</th>
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
                    <td className="sa-num"><div className="sa-skeleton" style={{ width: '50px', height: '12px', marginLeft: 'auto' }} /></td>
                    <td className="sa-num"><div className="sa-skeleton" style={{ width: '50px', height: '12px', marginLeft: 'auto' }} /></td>
                    <td className="sa-num"><div className="sa-skeleton" style={{ width: '70px', height: '12px', marginLeft: 'auto' }} /></td>
                  </tr>
                ))
              ) : (
                <>
                  {MOCK_PROJECTIONS.map((row, i) => (
                    <tr key={i} className="sa-proj-row" style={{ "--ri": i }}>
                      <td>{i + 1}</td>
                      <td><strong className="sa-proj-cust-name">{row.customer}</strong></td>
                      <td>{row.month}</td>
                      <td className="sa-num">{row.pos}</td>
                      <td className="sa-num">{formatQty(row.totQty)}</td>
                      <td className="sa-num">₹{formatRupees(row.totAmt)}</td>
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
                    <td></td>
                    <td></td>
                    <td className="sa-num"><strong>₹{formatRupees(projectionTotals.totAmt)}</strong></td>
                    <td></td>
                    <td></td>
                    <td className="sa-num"><strong>₹{formatRupees(projectionTotals.pendVal)}</strong></td>
                  </tr>
                </>
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
                <th>Routecard No</th>
                <th>Customer Name</th>
                <th>Dc No</th>
                <th>Dc Date</th>
                <th>GRN/PO Det</th>
                <th>Invoice NO</th>
                <th>Invoice Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, idx) => (
                  <tr key={idx}>
                    <td><div className="sa-skeleton" style={{ width: '20px', height: '12px' }} /></td>
                    <td><div className="sa-skeleton" style={{ width: '80px', height: '12px' }} /></td>
                    <td><div className="sa-skeleton" style={{ width: '160px', height: '12px' }} /></td>
                    <td><div className="sa-skeleton" style={{ width: '80px', height: '12px' }} /></td>
                    <td><div className="sa-skeleton" style={{ width: '65px', height: '12px' }} /></td>
                    <td><div className="sa-skeleton" style={{ width: '80px', height: '12px' }} /></td>
                    <td><div className="sa-skeleton" style={{ width: '80px', height: '12px' }} /></td>
                    <td><div className="sa-skeleton" style={{ width: '65px', height: '12px' }} /></td>
                  </tr>
                ))
              ) : (
                MOCK_TRACEABILITY.map((row, i) => (
                  <tr key={i} className="sa-trace-row" style={{ "--ri": i }}>
                    <td>{i + 1}</td>
                    <td><span className="sa-trace-code">{row.rcNo}</span></td>
                    <td><strong className="sa-trace-cust-name">{row.customer}</strong></td>
                    <td>{row.dcNo}</td>
                    <td className="sa-date">{row.dcDate}</td>
                    <td><span className="sa-trace-po">{row.grnPo}</span></td>
                    <td><strong className="sa-trace-inv">{row.invNo}</strong></td>
                    <td className="sa-date">{row.invDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}