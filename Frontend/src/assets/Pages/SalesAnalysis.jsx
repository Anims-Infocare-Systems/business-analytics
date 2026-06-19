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
  Pin
} from "lucide-react";
import "./SalesAnalysis.css";
import ChartDatePicker from "./ChartDatePicker";

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
        ticks: { font: { size: 10, family: font } },
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
        backgroundColor: "rgba(45,109,232,0.18)",
        borderColor: "#2d6de8",
        borderWidth: 2,
        borderRadius: 6,
        type: "bar",
        yAxisID: "y",
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
  try { sessionStorage.setItem(key, JSON.stringify(data)); } catch {}
}

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
  const [summary, setSummary] = useState(null);
  const [weeklyTrend, setWeeklyTrend] = useState(null);
  const [revenueCharts, setRevenueCharts] = useState(null);
  const [monthSummary, setMonthSummary] = useState(null);
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [invoiceBtypes, setInvoiceBtypes] = useState([]);
  const [invoiceBtype, setInvoiceBtype] = useState("");
  const [topProductsRaw, setTopProductsRaw] = useState(null);
  const kpiCards = useMemo(() => buildKpiCards(summary), [summary]);
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
    invoiceRows.forEach((r) => {
      if (r.invoice_no) invSet.add(r.invoice_no);
    });
    return { lines: invoiceRows.length, invoices: invSet.size };
  }, [invoiceRows]);

  const trendRef = useRef(null);
  const custRef = useRef(null);
  const prodRef = useRef(null);
  const trendChart = useRef(null);
  const custChart = useRef(null);
  const prodChart = useRef(null);

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
  }, [revenueCharts]);

  useEffect(() => {
    if (!prodRef.current) return;
    prodChart.current?.destroy();
    prodChart.current = new Chart(prodRef.current, {
      type: "doughnut",
      data: buildDonutChartData(revenueCharts?.product, DONUT_COLORS_PRODUCT),
      options: DONUT_CHART_OPTS(CHART_FONT),
    });
    return () => prodChart.current?.destroy();
  }, [revenueCharts]);

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
  }, [weeklyTrend]);

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
    const params = new URLSearchParams({
      from: toIsoDate(dateRange.from),
      to: toIsoDate(dateRange.to),
    });
    const ctrl = new AbortController();
    const fetchOpts = { credentials: "include", signal: ctrl.signal };

    fetch(`${API_BASE}/sales-analysis/summary-strip/?${params}`, fetchOpts)
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

    fetch(`${API_BASE}/sales-analysis/weekly-trend/?${params}`, fetchOpts)
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

    fetch(`${API_BASE}/sales-analysis/revenue-charts/?${params}`, fetchOpts)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          console.error("Revenue charts:", data?.error || r.statusText);
          setRevenueCharts(null);
          return;
        }
        setRevenueCharts(data);
        const missing = data?.product?.missing_partno_by_btype;
        if (missing?.length) {
          console.info(
            `Bill_Det lines without ${data.product.partno_column || "part number"} (by btype):`,
            missing,
          );
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Revenue charts fetch failed:", err);
          setRevenueCharts(null);
        }
      });

    fetch(`${API_BASE}/sales-analysis/month-summary/?${params}`, fetchOpts)
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

    fetch(`${API_BASE}/sales-analysis/top-products/?${params}`, fetchOpts)
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

    return () => ctrl.abort();
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
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
      });

    return () => ctrl.abort();
  }, [dateRange.from, dateRange.to, invoiceBtype]);

  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));
  const resetFilters = () => {
    setDateRange({ from: new Date(2026, 0, 1), to: new Date(2026, 1, 28) });
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
      <div className="sa-filter-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', gap: '12px', padding: '12px 24px' }}>
        <div className="sa-filter-card__title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
          Report Filters
        </div>
        <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(45, 109, 232, 0.15)', margin: '0 8px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
          <span className="sa-fl" style={{ margin: 0, fontSize: '0.62rem', color: '#5a6a9a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date Range</span>
          <ChartDatePicker
            from={dateRange.from}
            to={dateRange.to}
            onChange={({ from, to }) => setDateRange({ from, to })}
          />
        </div>
      </div>

      {/* ── Summary Strip ── */}
      <div className="sa-summary-strip">
        {[
          { label: "Period", val: summary?.period ?? "—", sm: true },
          { label: "Grand Total", val: summary ? `₹${formatRupees(summary.grand_total)}` : "—" },
          { label: "Total Invoices", val: summary ? String(summary.total_invoices) : "—" },
          { label: "Customers", val: summary ? String(summary.customers) : "—" },
          { label: "Total Qty Sold", val: summary ? formatQty(summary.total_qty_sold) : "—" },
          { label: "Avg Invoice", val: summary ? `₹${formatRupees(summary.avg_invoice)}` : "—" },
          {
            label: "Turn Over",
            val: summary ? `₹${Number(summary.turn_over_lakhs).toFixed(2)}L` : "—",
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
              <div className="sa-kpi-card__val">{k.value}</div>
              <div className="sa-kpi-card__sub">{k.sub}</div>
              <span className={`sa-kpi-card__trend sa-kpi-card__trend--${k.type}`}>{k.trend}</span>
            </div>
          );
        })}
      </div>

      {/* ── Charts Row ── */}
      <div className="sa-charts-row">
        <div className="sa-card sa-card--chart">
          <div className="sa-card__head">
            <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={16} style={{ color: "#2d6de8" }} /> Weekly Sales Trend{weeklyTrend?.period ? ` (${weeklyTrend.period})` : summary?.period ? ` (${summary.period})` : ""}
            </span>
            <span className="sa-badge sa-badge--blue">
              {weeklyTrend != null
                ? `₹${Number(weeklyTrend.turn_over_lakhs ?? 0).toFixed(2)}L Total`
                : summary
                  ? `₹${Number(summary.turn_over_lakhs ?? 0).toFixed(2)}L Total`
                  : "—"}
            </span>
          </div>
          <div className="sa-chart-wrap"><canvas ref={trendRef} /></div>
        </div>
        <div className="sa-card sa-card--chart">
          <div className="sa-card__head">
            <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={16} style={{ color: "#10b981" }} /> Revenue by Customer
            </span>
          </div>
          <div className="sa-chart-wrap"><canvas ref={custRef} /></div>
        </div>
        <div className="sa-card sa-card--chart">
          <div className="sa-card__head">
            <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Package size={16} style={{ color: "#f97316" }} /> Revenue by Product
            </span>
          </div>
          <div className="sa-chart-wrap"><canvas ref={prodRef} /></div>
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
            {(customerRanking.length ? customerRanking : [{ name: "—", barW: "0%", color: "#94a3b8", amount: "—", pct: "—" }]).map((c, i) => (
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
              {monthSummary?.period ?? summary?.period ?? "—"}
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
                {(monthSummary?.rows?.length ? monthSummary.rows : []).map((row, i) => (
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
                ))}
                {!monthSummary?.rows?.length && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "#94a3b8" }}>—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {monthSummary?.totals && (
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
          )}
          <div className="sa-inv-status">
            <div className="sa-inv-status__label">Invoice Status — No. of Invoices</div>
            <div className="sa-inv-status__row">
              {(monthSummary?.invoice_status ?? []).map((group) => (
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
              {!monthSummary?.invoice_status?.length && (
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
            <div className="sa-inv-filter">
              <div className="sa-inv-filter__icon" aria-hidden>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              </div>
              <div className="sa-inv-filter__body">
                <label className="sa-inv-filter__label" htmlFor="sa-inv-btype">Bill Type</label>
                <div className={`sa-inv-filter__field${invoiceBtype ? " sa-inv-filter__field--active" : ""}`}>
                  <select
                    id="sa-inv-btype"
                    className="sa-inv-filter__select"
                    value={invoiceBtype}
                    onChange={(e) => setInvoiceBtype(e.target.value)}
                  >
                    <option value="">All Types</option>
                    {invoiceBtypes.map((bt) => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                  <span className="sa-inv-filter__chev" aria-hidden>▾</span>
                </div>
              </div>
            </div>
            {invoiceStats.lines > 0 && (
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
              {(invoiceRows.length ? invoiceRows : []).map((r, i) => (
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
              ))}
              {!invoiceRows.length && (
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

      {/* ── Two-Col: Top Products + Insights ── */}
      <div className="sa-two-col">

        {/* Top Products */}
        <div className="sa-card">
          <div className="sa-card__head">
            <span className="sa-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Package size={16} style={{ color: "#f97316" }} /> Top Products by Revenue
            </span>
            <span className="sa-card__sub">{topProductsRaw?.period ?? summary?.period ?? "—"}</span>
          </div>
          <div className="sa-prod-list">
            {(topProducts.length ? topProducts : [{ name: "—", code: "—", barW: "0%", color: "#94a3b8", qty: "—", amount: "—" }]).map((p, i) => (
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