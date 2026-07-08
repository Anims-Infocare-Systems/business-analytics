/**
 * Dashboard3 — Plant Performance
 * 3-column UI: Current State (10) | Center detail | Action (9)
 * Live metrics from Dashboard2 APIs · fixed-height columns with inner scroll
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Chart, registerables } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "./plantperformance1.css";
import PlantPerformance1DatePicker from "./plantperformance1DatePicker";
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
  FileText,
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
  PanelRightClose,
  X
} from "lucide-react";

Chart.register(...registerables, ChartDataLabels);

/* Premium chart typography & motion — Plant Performance center charts */
const PP1_FONT = "'Plus Jakarta Sans', 'Outfit', 'Inter', system-ui, sans-serif";
Chart.defaults.font.family = PP1_FONT;
Chart.defaults.font.size = 11;
Chart.defaults.font.weight = "500";
Chart.defaults.color = "#475569";
Chart.defaults.plugins.legend.labels.font = { family: PP1_FONT, size: 11, weight: "600" };
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.padding = 14;
Chart.defaults.animation.duration = 400;
Chart.defaults.animation.delay = 0;
Chart.defaults.animation.easing = "easeOutQuart";

function Pp1SearchableMultiSelect({
  value,
  options,
  onChange,
  placeholder = "Search...",
  allLabel = "All Customers",
  searchPlaceholder = "Search customer...",
  accentColor = "#2d6de8"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAllSelected = !value || value === allLabel || value === "";

  const selectedList = isAllSelected ? [] : value.split(",").map(v => v.trim()).filter(Boolean);

  const toggleOption = (opt) => {
    if (opt === allLabel) {
      onChange("");
      return;
    }

    let nextList;
    const idx = selectedList.indexOf(opt);
    if (idx >= 0) {
      nextList = selectedList.filter(item => item !== opt);
    } else {
      nextList = [...selectedList, opt];
    }

    if (nextList.length === 0) {
      onChange("");
    } else {
      onChange(nextList.join(", "));
    }
  };

  const filteredOptions = options.filter(opt => {
    return opt.toLowerCase().includes(search.toLowerCase());
  });

  const isDefault = isAllSelected;
  let triggerText = allLabel;
  if (!isDefault) {
    if (selectedList.length === 1) {
      triggerText = selectedList[0];
    } else {
      triggerText = `${selectedList.length} Selected`;
    }
  }

  return (
    <div className="pp1-custom-select-wrap" ref={dropdownRef} style={{ width: '100%', minWidth: '180px', position: 'relative' }}>
      <button
        type="button"
        className={`pp1-custom-select-trigger ${isOpen ? "open" : ""} ${!isDefault ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: '#fcfdfe',
          border: isOpen ? `1.5px solid ${accentColor}` : `1.5px solid ${!isDefault ? accentColor : '#d1e2ff'}`,
          borderRadius: '8px',
          fontFamily: PP1_FONT,
          fontSize: '12px',
          fontWeight: 600,
          color: '#334155',
          cursor: 'pointer',
          transition: 'all 0.22s ease',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px', color: !isDefault ? accentColor : 'inherit' }}>
          {triggerText}
        </span>
        <ChevronDown size={12} style={{ color: !isDefault ? accentColor : '#94a3b8', transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {isOpen && (
        <div
          className="pp1-custom-select-options pp1-ct-reveal pp1-ct-reveal--in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '240px',
            padding: '8px',
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 99999,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
        >
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 26px 6px 26px',
                fontSize: '0.75rem',
                borderRadius: '6px',
                border: '1.5px solid #e2e8f0',
                background: '#f8fafc',
                color: '#334155',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: PP1_FONT,
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = accentColor;
                e.target.style.background = '#ffffff';
                e.target.style.boxShadow = `0 0 0 3px ${accentColor}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.background = '#f8fafc';
                e.target.style.boxShadow = 'none';
              }}
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSearch(""); }}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px'
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>

          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {!search && (
              <button
                type="button"
                className={`pp1-custom-select-option ${isDefault ? "selected" : ""}`}
                onClick={() => toggleOption(allLabel)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textAlign: 'left',
                  padding: '8px 10px',
                  width: '100%',
                  background: isDefault ? `${accentColor}12` : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  color: isDefault ? accentColor : '#475569',
                  fontWeight: isDefault ? 700 : 500,
                  fontFamily: PP1_FONT,
                  transition: 'all 0.15s ease'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '14px',
                    height: '14px',
                    borderRadius: '3.5px',
                    border: isDefault ? `1.5px solid ${accentColor}` : '1.5px solid #cbd5e1',
                    background: isDefault ? accentColor : 'transparent',
                    transition: 'all 0.18s ease',
                    flexShrink: 0
                  }}
                >
                  {isDefault && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span>{allLabel}</span>
              </button>
            )}

            {filteredOptions.map(opt => {
              const selected = selectedList.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  className={`pp1-custom-select-option ${selected ? "selected" : ""}`}
                  onClick={() => toggleOption(opt)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'left',
                    padding: '8px 10px',
                    width: '100%',
                    background: selected ? `${accentColor}12` : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    color: selected ? accentColor : '#475569',
                    fontWeight: selected ? 700 : 500,
                    fontFamily: PP1_FONT,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '14px',
                      height: '14px',
                      borderRadius: '3.5px',
                      border: selected ? `1.5px solid ${accentColor}` : '1.5px solid #cbd5e1',
                      background: selected ? accentColor : 'transparent',
                      transition: 'all 0.18s ease',
                      flexShrink: 0
                    }}
                  >
                    {selected && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span>{opt}</span>
                </button>
              );
            })}

            {filteredOptions.length === 0 && search && (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.75rem', padding: '16px 4px', fontFamily: PP1_FONT }}>
                No matches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
Chart.defaults.plugins.datalabels = { display: false };
Chart.defaults.responsiveAnimationDuration = 0;

const PP1_DPR = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

const pp1ChartTransitions = {
  active: { animation: { duration: 0 } },
  resize: { animation: { duration: 0 } },
  show: { animations: { colors: { duration: 400 }, numbers: { duration: 400 } } },
  hide: { animations: { colors: { duration: 200 }, numbers: { duration: 200 } } },
};

function fmtLakhs(val, decimals = 2) {
  const n = Number(val);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(decimals);
}

function fmtLakhsLabel(val) {
  return `₹${fmtLakhs(val)}L`;
}

function fmtRupeeCompact(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

const pp1PremiumTooltip = {
  enabled: true,
  backgroundColor: "rgba(15, 23, 42, 0.94)",
  titleColor: "#f8fafc",
  bodyColor: "#e2e8f0",
  borderColor: "rgba(99, 102, 241, 0.4)",
  borderWidth: 1,
  cornerRadius: 10,
  padding: { top: 10, bottom: 10, left: 12, right: 14 },
  titleFont: { family: PP1_FONT, size: 12, weight: "700" },
  bodyFont: { family: PP1_FONT, size: 11, weight: "500" },
  displayColors: true,
  boxPadding: 6,
  caretSize: 6,
  caretPadding: 8,
};

const pp1PremiumLegendBottom = {
  position: "bottom",
  labels: {
    color: "#475569",
    font: { family: PP1_FONT, size: 10, weight: "600" },
    boxWidth: 8,
    boxHeight: 8,
    padding: 14,
    usePointStyle: true,
    pointStyle: "circle",
  },
};

const pp1PremiumLegendTop = {
  position: "top",
  labels: {
    color: "#475569",
    font: { family: PP1_FONT, size: 10, weight: "600" },
    boxWidth: 8,
    boxHeight: 8,
    padding: 16,
    usePointStyle: true,
    pointStyle: "circle",
  },
};

const pp1ChartHoverElements = {
  point: {
    radius: 4,
    hoverRadius: 7,
    hoverBorderWidth: 2.5,
    hitRadius: 12,
  },
  line: { borderJoinStyle: "round", tension: 0.35 },
  bar: { borderRadius: 6, borderSkipped: false },
};

function pp1DataLabelsLakhs({ maxPoints = 18, skipLabels = [] } = {}) {
  const labelOpts = { skipLabels };
  return {
    display: (ctx) => pp1ShouldShowDataLabel(ctx, { maxPoints, skipLabels }),
    anchor: (ctx) => pp1DataLabelAnchor(ctx, labelOpts),
    align: (ctx) => pp1DataLabelAlign(ctx, labelOpts),
    offset: (ctx) => pp1DataLabelOffset(ctx, labelOpts),
    color: "#ffffff",
    backgroundColor: (ctx) => {
      const c = ctx.dataset.borderColor;
      if (typeof c === "string" && c.startsWith("rgba")) return c.replace(/[\d.]+\)$/, "0.92)");
      return typeof c === "string" ? c : "rgba(37, 99, 235, 0.92)";
    },
    borderRadius: 6,
    padding: { top: 3, bottom: 3, left: 6, right: 6 },
    font: (ctx) => {
      const count = ctx.chart.data.labels?.length || 0;
      const size = count > 48 ? 6.5 : count > 32 ? 7 : count > 20 ? 7.5 : 8.5;
      return { family: PP1_FONT, size, weight: "700" };
    },
    formatter: (v) => `₹${fmtLakhs(v, 1)}L`,
    clip: false,
  };
}

function pp1DataLabelsRupee({ maxPoints = 14 } = {}) {
  const skipLabels = ["Min Production Target", "Sales Target"];
  const labelOpts = { skipLabels };
  return {
    display: (ctx) => pp1ShouldShowDataLabel(ctx, { maxPoints, skipLabels }),
    anchor: (ctx) => pp1DataLabelAnchor(ctx, labelOpts),
    align: (ctx) => pp1DataLabelAlign(ctx, labelOpts),
    offset: (ctx) => pp1DataLabelOffset(ctx, labelOpts),
    color: "#ffffff",
    backgroundColor: (ctx) => {
      const label = ctx.dataset.label || "";
      if (label === "Actual Value") return "rgba(16, 185, 129, 0.92)";
      if (label === "Total Production Value") return "rgba(139, 92, 246, 0.92)";
      const c = ctx.dataset.borderColor;
      if (typeof c === "string" && c.startsWith("rgba")) return c.replace(/[\d.]+\)$/, "0.92)");
      return "rgba(99, 102, 241, 0.92)";
    },
    borderRadius: 6,
    padding: { top: 3, bottom: 3, left: 6, right: 6 },
    font: { family: PP1_FONT, size: 8.5, weight: "700" },
    formatter: (v) => fmtRupeeCompact(v),
    clip: false,
  };
}

function pp1DataLabelsPercent({ maxPoints = 96, skipLabels = [], accentColor = "rgba(234, 179, 8, 0.92)" } = {}) {
  const labelOpts = { skipLabels };
  return {
    display: (ctx) => {
      const count = ctx.chart.data.labels?.length || 0;
      if (count > maxPoints) return false;
      const label = ctx.dataset.label || "";
      if (skipLabels.includes(label) || pp1IsTargetDataset(label)) return false;
      const v = Number(ctx.dataset.data[ctx.dataIndex]);
      return Number.isFinite(v);
    },
    anchor: (ctx) => pp1DataLabelAnchor(ctx, labelOpts),
    align: (ctx) => pp1DataLabelAlign(ctx, labelOpts),
    offset: (ctx) => pp1DataLabelOffset(ctx, labelOpts),
    color: "#ffffff",
    backgroundColor: (ctx) => {
      const c = ctx.dataset.borderColor || ctx.dataset.backgroundColor;
      if (typeof c === "string" && c.startsWith("rgba")) return c.replace(/[\d.]+\)$/, "0.92)");
      return typeof c === "string" ? c : accentColor;
    },
    borderRadius: 5,
    padding: { top: 2, bottom: 2, left: 5, right: 5 },
    font: (ctx) => {
      const count = ctx.chart.data.labels?.length || 0;
      const size = count > 48 ? 6.5 : count > 32 ? 7 : count > 20 ? 7.5 : 8.5;
      return { family: PP1_FONT, size, weight: "700" };
    },
    formatter: (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return "—";
      return `${n.toFixed(1)}%`;
    },
    clip: false,
  };
}

function pp1BarGradient(chart, colorStops) {
  const { ctx, chartArea } = chart;
  if (!chartArea) return colorStops[0]?.color || "rgba(99, 102, 241, 0.7)";
  const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  colorStops.forEach(({ offset, color }) => g.addColorStop(offset, color));
  return g;
}

const pp1ChartAnimation = {
  duration: 400,
  easing: "easeOutQuart",
  delay: 0,
};

function pp1LakhsAxisTick(val) {
  return `₹${Number(val).toFixed(1)}L`;
}

function pp1IsTargetDataset(label = "") {
  const l = String(label).toLowerCase();
  return l.includes("target") || l.includes("threshold") || l.includes("limit");
}

function pp1ShouldShowDataLabel(ctx, { maxPoints = 18, skipLabels = [] } = {}) {
  const count = ctx.chart.data.labels?.length || 0;
  if (count > maxPoints) return false;
  const label = ctx.dataset.label || "";
  if (skipLabels.includes(label) || pp1IsTargetDataset(label)) return false;
  const v = Number(ctx.dataset.data[ctx.dataIndex]);
  return Number.isFinite(v) && v !== 0;
}

function pp1DataLabelSlot(ctx, skipLabels = []) {
  const datasets = ctx.chart.data.datasets || [];
  let slot = 0;
  for (let i = 0; i < ctx.datasetIndex; i++) {
    const label = datasets[i]?.label || "";
    if (skipLabels.includes(label) || pp1IsTargetDataset(label)) continue;
    const v = Number(datasets[i]?.data?.[ctx.dataIndex]);
    if (Number.isFinite(v) && v !== 0) slot++;
  }
  return slot;
}

function pp1DataLabelStackCount(ctx, skipLabels = []) {
  let count = 0;
  (ctx.chart.data.datasets || []).forEach((ds) => {
    const label = ds.label || "";
    if (skipLabels.includes(label) || pp1IsTargetDataset(label)) return;
    const v = Number(ds.data?.[ctx.dataIndex]);
    if (Number.isFinite(v) && v !== 0) count++;
  });
  return count;
}

/** Stagger labels when combo/dual-axis charts share the same x bucket */
function pp1DataLabelLayout(ctx, { skipLabels = [] } = {}) {
  const slot = pp1DataLabelSlot(ctx, skipLabels);
  const stackCount = pp1DataLabelStackCount(ctx, skipLabels);
  const dsType = ctx.dataset.type || ctx.chart.config?.type || "bar";
  const stagger = 16;

  if (stackCount <= 1) {
    if (dsType === "line") return { anchor: "center", align: "top", offset: 6 };
    return { anchor: "end", align: "end", offset: 4 };
  }

  return {
    anchor: "center",
    align: "top",
    offset: 8 + slot * stagger,
  };
}

function pp1DataLabelAnchor(ctx, opts = {}) {
  return pp1DataLabelLayout(ctx, opts).anchor;
}

function pp1DataLabelAlign(ctx, opts = {}) {
  return pp1DataLabelLayout(ctx, opts).align;
}

function pp1DataLabelOffset(ctx, opts = {}) {
  return pp1DataLabelLayout(ctx, opts).offset;
}

function pp1FormatChartValue(v, ctx, valueMode = "auto") {
  const label = ctx?.dataset?.label || "";
  const yAxis = String(ctx?.dataset?.yAxisID || "").toLowerCase();
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  if (valueMode === "hours" || yAxis.includes("idle") || yAxis.includes("hour") || /\bhour/i.test(label)) {
    return `${n.toFixed(1)}h`;
  }
  if (
    valueMode === "percent"
    || label.includes("%")
    || /oee|efficiency|\beff\b/i.test(label)
    || yAxis.includes("percent")
  ) {
    return `${n.toFixed(1)}%`;
  }
  if (valueMode === "rupee") return fmtRupeeCompact(n);
  if (valueMode === "number") return n.toLocaleString("en-IN", { maximumFractionDigits: 1 });
  if (yAxis.includes("loss") || /loss|lakhs/i.test(label)) return `₹${fmtLakhs(n, 1)}L`;
  return `₹${fmtLakhs(n, 1)}L`;
}

function pp1DataLabelsAuto({ maxPoints = 18, valueMode = "auto" } = {}) {
  const cacheKey = `${maxPoints}|${valueMode}|stack-v1`;
  if (pp1DataLabelsAuto._cache?.[cacheKey]) return pp1DataLabelsAuto._cache[cacheKey];
  if (!pp1DataLabelsAuto._cache) pp1DataLabelsAuto._cache = {};
  const labelOpts = { skipLabels: [] };
  const cfg = {
    display: (ctx) => pp1ShouldShowDataLabel(ctx, { maxPoints, skipLabels: [] }),
    anchor: (ctx) => pp1DataLabelAnchor(ctx, labelOpts),
    align: (ctx) => pp1DataLabelAlign(ctx, labelOpts),
    offset: (ctx) => pp1DataLabelOffset(ctx, labelOpts),
    color: "#ffffff",
    backgroundColor: (ctx) => {
      const label = ctx.dataset.label || "";
      if (/actual/i.test(label)) return "rgba(16, 185, 129, 0.92)";
      if (/production value|purchase|grn|sales|order/i.test(label) && ctx.dataset.type === "bar") {
        const c = ctx.dataset.borderColor || ctx.dataset.backgroundColor;
        if (typeof c === "string" && c.startsWith("rgba")) return c.replace(/[\d.]+\)$/, "0.92)");
      }
      const c = ctx.dataset.borderColor || ctx.dataset.backgroundColor;
      if (typeof c === "string" && c.startsWith("rgba")) return c.replace(/[\d.]+\)$/, "0.92)");
      return typeof c === "string" ? c : "rgba(37, 99, 235, 0.92)";
    },
    borderRadius: 6,
    padding: { top: 3, bottom: 3, left: 6, right: 6 },
    font: { family: PP1_FONT, size: 8.5, weight: "700" },
    formatter: (v, ctx) => pp1FormatChartValue(v, ctx, valueMode),
    clip: false,
  };
  pp1DataLabelsAuto._cache[cacheKey] = cfg;
  return cfg;
}

function pp1EnhanceChartConfig(config, {
  legendPosition = "bottom",
  valueMode = "auto",
  enableDatalabels = true,
} = {}) {
  const cfg = { ...config, options: { ...(config.options || {}) } };
  const opts = cfg.options;
  const rootType = cfg.type || cfg.data?.datasets?.[0]?.type || "bar";
  const legendBase = legendPosition === "top" ? pp1PremiumLegendTop : pp1PremiumLegendBottom;
  const existingPlugins = opts.plugins || {};
  const existingLegend = existingPlugins.legend;
  const existingTooltip = existingPlugins.tooltip || {};
  const existingDatalabels = existingPlugins.datalabels;
  const skipLabels = ["pie", "doughnut", "polarArea"].includes(rootType);
  const seriesCount = (cfg.data?.datasets || []).filter(
    (ds) => ds && !pp1IsTargetDataset(ds.label || "")
  ).length;

  opts.responsive = opts.responsive ?? true;
  opts.maintainAspectRatio = opts.maintainAspectRatio ?? false;
  opts.devicePixelRatio = opts.devicePixelRatio ?? PP1_DPR;
  opts.responsiveAnimationDuration = opts.responsiveAnimationDuration ?? 0;
  opts.transitions = { ...pp1ChartTransitions, ...(opts.transitions || {}) };
  opts.interaction = { mode: "index", intersect: false, ...(opts.interaction || {}) };
  opts.elements = { ...pp1ChartHoverElements, ...(opts.elements || {}) };
  opts.animation = { ...pp1ChartAnimation, ...(opts.animation || {}) };
  opts.layout = {
    ...(opts.layout || {}),
    padding: {
      top: 4,
      right: 6,
      bottom: 22,
      left: 4,
      ...(typeof opts.layout?.padding === "object" ? opts.layout.padding : {}),
    },
  };

  opts.plugins = {
    ...existingPlugins,
    legend: existingLegend === false
      ? false
      : { ...legendBase, ...(typeof existingLegend === "object" ? existingLegend : {}) },
    tooltip: {
      ...pp1PremiumTooltip,
      ...existingTooltip,
      callbacks: { ...(existingTooltip.callbacks || {}) },
    },
    datalabels: existingDatalabels !== undefined
      ? existingDatalabels
      : (enableDatalabels && !skipLabels ? pp1DataLabelsAuto({ valueMode }) : false),
  };

  if (opts.scales && typeof opts.scales === "object") {
    const labelCount = cfg.data?.labels?.length || 0;
    Object.entries(opts.scales).forEach(([key, scale]) => {
      if (!scale || typeof scale !== "object") return;
      if (key === "x") {
        pp1ApplyXAxisTicks(scale, labelCount);
      } else {
        scale.ticks = {
          color: "#64748b",
          font: { family: PP1_FONT, size: 10, weight: "500" },
          ...(scale.ticks || {}),
        };
      }
      if (key === "y" && valueMode === "lakhs" && !scale.ticks?.callback) {
        scale.ticks.callback = pp1LakhsAxisTick;
      }
      if (key !== "x" && key !== "r" && scale.grace === undefined) {
        scale.grace = seriesCount > 1 ? "18%" : "10%";
      }
      if (scale.title && typeof scale.title === "object") {
        scale.title.font = { family: PP1_FONT, size: 10, weight: "700", ...(scale.title.font || {}) };
      }
    });
  }

  return cfg;
}

function pp1ApplyXAxisTicks(scale, labelCount = 0) {
  const count = Number(labelCount) || 0;
  const dense = count > 10;
  const veryDense = count > 16;
  scale.ticks = {
    color: "#64748b",
    font: {
      family: PP1_FONT,
      size: veryDense ? 8.5 : dense ? 9 : 10,
      weight: "600",
    },
    maxRotation: dense ? 42 : count > 6 ? 32 : 0,
    minRotation: dense ? 32 : 0,
    autoSkip: veryDense,
    autoSkipPadding: 10,
    maxTicksLimit: veryDense ? 14 : undefined,
    padding: 8,
    ...(scale.ticks || {}),
  };
}

/** Premium Chart.js factory — default value pills, tooltip, animation for all center charts */
function createPp1Chart(canvasOrCtx, config, premiumOpts = {}) {
  const enhanced = pp1EnhanceChartConfig(config, premiumOpts);
  return new Chart(canvasOrCtx, enhanced);
}

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
  { id: "purchase_report_dashboard", title: "GRN Value", icon: Truck, color: "#ea580c", priority: "medium" },
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
  { id: "machine_efficiency_report_dashboard", title: "Machine Efficiency", icon: Cpu, color: "#0ea5e9", priority: "medium" },
  { id: "capa_report_dashboard", title: "Quality Action Plan (CAPA)", icon: ClipboardCheck, color: "#0891b2", priority: "medium" }
];

function formatLocalYmd(d) {
  if (!d) return "";
  // If already a YYYY-MM-DD string, return it directly
  if (typeof d === "string") {
    const s = d.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Try to parse as date
    const parsed = new Date(d);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    }
    return s;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildUrl(base, from, to) {
  if (!from || !to) return base;
  return `${base}?from=${formatLocalYmd(from)}&to=${formatLocalYmd(to)}`;
}

function currentFinancialYearRange() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const fyStart = m >= 4 ? y : y - 1;
  return {
    from: new Date(fyStart, 3, 1),
    to: new Date(fyStart + 1, 2, 31),
  };
}

function buildOtdUrl(from, to, filters) {
  let url = buildUrl("/api/plant-performance/otd/", from, to);
  const customer = (filters?.customer || "").trim();
  const partNumber = (filters?.partNumber || "").trim();
  if (customer) url += `&customer=${encodeURIComponent(customer)}`;
  if (partNumber) url += `&partNumber=${encodeURIComponent(partNumber)}`;
  return url;
}

function buildEffUrl(from, to, filters) {
  const fy = currentFinancialYearRange();
  let url = buildUrl("/api/plant-performance/efficiency/", from || fy.from, to || fy.to);
  url += "&full_fy=1";
  const cnc = filters?.machineType !== "Conventional";
  const conv = filters?.machineType !== "CNC";
  url += `&cnc=${cnc ? "1" : "0"}&conv=${conv ? "1" : "0"}`;
  return url;
}

function buildOeeUrl(from, to, filters) {
  const fy = currentFinancialYearRange();
  let url = buildUrl("/api/plant-performance/oee/", from || fy.from, to || fy.to);
  url += "&full_fy=1";
  const cnc = filters?.machineType !== "Conventional";
  const conv = filters?.machineType !== "CNC";
  url += `&cnc=${cnc ? "1" : "0"}&conv=${conv ? "1" : "0"}`;
  return url;
}

function buildRejUrl(from, to) {
  const fy = currentFinancialYearRange();
  let url = buildUrl("/api/plant-performance/rejection/", from || fy.from, to || fy.to);
  return `${url}&full_fy=1`;
}

function buildRewUrl(from, to) {
  const fy = currentFinancialYearRange();
  let url = buildUrl("/api/plant-performance/rework/", from || fy.from, to || fy.to);
  return `${url}&full_fy=1`;
}

function buildCompUrl(from, to) {
  const fy = currentFinancialYearRange();
  let url = buildUrl("/api/plant-performance/customer-complaint/", from || fy.from, to || fy.to);
  return `${url}&full_fy=1`;
}

function buildCapaUrl(from, to) {
  const fy = currentFinancialYearRange();
  let url = buildUrl("/api/plant-performance/capa/", from || fy.from, to || fy.to);
  return `${url}&full_fy=1`;
}

function buildOpEffUrl(from, to) {
  const fy = currentFinancialYearRange();
  let url = buildUrl("/api/plant-performance/operator-efficiency/", from || fy.from, to || fy.to);
  return `${url}&full_fy=1`;
}

function buildMachEffUrl(from, to, machine, effLimit, fullFy = 0) {
  const fy = currentFinancialYearRange();
  let url = buildUrl("/api/plant-performance/machine-efficiency/", from || fy.from, to || fy.to);
  url += `&full_fy=${fullFy}`;
  const m = (machine || "").trim();
  if (m) url += `&machineNo=${encodeURIComponent(m)}`;
  const el = (effLimit || "").trim();
  if (el) url += `&effLimit=${encodeURIComponent(el)}`;
  return url;
}

function buildSupplierRatingUrl(from, to, filters) {
  let url = buildUrl("/api/plant-performance/supplier-rating/", from, to);
  if (filters?.supplier && filters.supplier.length > 0) {
    url += `&supplier=${encodeURIComponent(filters.supplier.join(","))}`;
  }
  return url;
}

function buildVendorRatingUrl(from, to, filters) {
  let url = buildUrl("/api/plant-performance/vendor-rating/", from, to);
  if (filters?.vendor && filters.vendor.length > 0) {
    url += `&name=${encodeURIComponent(filters.vendor.join(","))}`;
  }
  return url;
}

function buildFgValueUrl() {
  return "/api/plant-performance/fg-value/";
}

function buildTargetVsActualUrl(from, to) {
  const fy = currentFinancialYearRange();
  return buildUrl("/api/plant-performance/target-vs-actual/", from || fy.from, to || fy.to);
}

function buildDailyProdUrl(from, to, machineNo) {
  const fy = currentFinancialYearRange();
  let url = buildUrl("/api/plant-performance/daily-production/", from || fy.from, to || fy.to);
  url += "&full_fy=1";
  const machine = (machineNo || "").trim();
  if (machine) url += `&machineNo=${encodeURIComponent(machine)}`;
  return url;
}

function buildProdValueUrl(from, to, machine) {
  const fy = currentFinancialYearRange();
  const fromStr = (typeof from === "string" && from) ? from.slice(0, 10) : formatLocalYmd(from || fy.from);
  const toStr = (typeof to === "string" && to) ? to.slice(0, 10) : formatLocalYmd(to || fy.to);
  let url = `/api/plant-performance/production-value/?from=${fromStr}&to=${toStr}&full_fy=1`;
  const m = (machine || "").trim();
  if (m) url += `&machineNo=${encodeURIComponent(m)}`;
  return url;
}

function filterProdValueDetailRows(rows, filters, defaultFrom, defaultTo) {
  const activeFrom = (filters?.fromDate || defaultFrom || "").slice(0, 10);
  const activeTo = (filters?.toDate || defaultTo || "").slice(0, 10);
  return (Array.isArray(rows) ? rows : []).filter((r) => {
    const d = (r.date || "").slice(0, 10);
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    if (activeFrom && /^\d{4}-\d{2}-\d{2}$/.test(activeFrom) && d < activeFrom) return false;
    if (activeTo && /^\d{4}-\d{2}-\d{2}$/.test(activeTo) && d > activeTo) return false;
    if (filters?.team && r.team !== filters.team) return false;
    if (filters?.machine) {
      const selectedMachines = filters.machine.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      if (selectedMachines.length > 0) {
        const mac = String(r.machine || "").toLowerCase();
        const name = String(r.machineName || "").toLowerCase();
        if (!selectedMachines.includes(mac) && !selectedMachines.includes(name)) return false;
      }
    }
    if (filters?.operator) {
      const selectedOperators = filters.operator.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      if (selectedOperators.length > 0) {
        const op = String(r.operator || "").toLowerCase();
        if (!selectedOperators.some(sel => op.includes(sel))) return false;
      }
    }
    return true;
  });
}

function aggregateProdValueByField(rows, field) {
  const groups = {};
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    const key = String(r[field] || "—").trim() || "—";
    if (!groups[key]) {
      groups[key] = { productionValue: 0, actualValue: 0, rateSum: 0, rateCount: 0 };
    }
    groups[key].productionValue += Number(r.productionValue || 0);
    groups[key].actualValue += Number(r.actualValue || 0);
    groups[key].rateSum += Number(r.ratePerHr || 0);
    groups[key].rateCount += 1;
  });
  return groups;
}

function formatProdValueMonth(dateStr, fallbackTo) {
  const ref = dateStr || fallbackTo || "";
  if (!ref) return "—";
  const parts = ref.slice(0, 10).split("-");
  if (parts.length === 3) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthNum = parseInt(parts[1], 10);
    return `${months[monthNum - 1] || parts[1]}-${parts[0]}`;
  }
  return "—";
}

function formatInrValue(val) {
  const v = Math.round(Number(val) || 0);
  return `₹${v.toLocaleString("en-IN")}`;
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

/** Chart.js canvas — premium frame; debounced rebuild for filter typing perf */
function ChartJsCanvas({ setup, height = 200, rebuildToken = 0, className = "pp1-center-chart__frame" }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const setupRef = useRef(setup);
  const hasChartRef = useRef(false);
  setupRef.current = setup;

  useEffect(() => {
    if (!ref.current) return undefined;
    let cancelled = false;
    const debounceMs = hasChartRef.current ? 120 : 0;
    const timer = setTimeout(() => {
      if (cancelled || !ref.current) return;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      chartRef.current = setupRef.current(ref.current);
      hasChartRef.current = true;
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [rebuildToken]);

  useEffect(() => () => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    hasChartRef.current = false;
  }, []);
  return (
    <div className={`pp1-chart-frame${className ? ` ${className}` : ""}`} style={{ height }}>
      <canvas ref={ref} height={height} />
    </div>
  );
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
      return createPp1Chart(canvas, {
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
      return createPp1Chart(canvas, {
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
      return createPp1Chart(canvas, {
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
      return createPp1Chart(canvas, {
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
      return createPp1Chart(canvas, {
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
      return createPp1Chart(canvas, {
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
      return createPp1Chart(canvas, {
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
function OtdTrendView({ data, loading, uid, filters, onFilterChange, from, to, onClose, targetConfig, onOtdData }) {
  const [report, setReport] = useState(null);
  const [otdLive, setOtdLive] = useState(null);
  const [filterOptionsCache, setFilterOptionsCache] = useState({ customers: [], parts: [] });
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);
  const [debouncedCustomer, setDebouncedCustomer] = useState("");
  const [debouncedPart, setDebouncedPart] = useState("");

  const [partOpen, setPartOpen] = useState(false);
  const partRef = useRef(null);
  const [chartType, setChartType] = useState("line");
  const [chartTypeOpen, setChartTypeOpen] = useState(false);
  const chartTypeRef = useRef(null);

  const otdSource = otdLive || data?.otd;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCustomer((filters.customer || "").trim()), 350);
    return () => clearTimeout(t);
  }, [filters.customer]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPart((filters.partNumber || "").trim()), 350);
    return () => clearTimeout(t);
  }, [filters.partNumber]);

  const fetchFilters = useMemo(
    () => ({ ...filters, customer: debouncedCustomer, partNumber: debouncedPart }),
    [filters, debouncedCustomer, debouncedPart]
  );

  const allCustomers = React.useMemo(() => {
    const fromCache = filterOptionsCache.customers;
    if (Array.isArray(fromCache) && fromCache.length) return fromCache;
    const fromApi = otdSource?.filterOptions?.customers;
    if (Array.isArray(fromApi) && fromApi.length) return fromApi;
    const fromRows = [...new Set((otdSource?.rows || []).map((r) => r.customerName).filter(Boolean))];
    return fromRows.sort((a, b) => a.localeCompare(b));
  }, [filterOptionsCache.customers, otdSource?.filterOptions?.customers, otdSource?.rows]);

  const allParts = React.useMemo(() => {
    const fromCache = filterOptionsCache.parts;
    if (Array.isArray(fromCache) && fromCache.length) return fromCache;
    const fromApi = otdSource?.filterOptions?.parts;
    if (Array.isArray(fromApi) && fromApi.length) return fromApi;
    const fromRows = [...new Set((otdSource?.rows || []).map((r) => r.partNumber).filter(Boolean))];
    return fromRows.sort((a, b) => a.localeCompare(b));
  }, [filterOptionsCache.parts, otdSource?.filterOptions?.parts, otdSource?.rows]);

  const partSuggestions = useMemo(() => {
    if (!filters.partNumber) return allParts;
    return allParts.filter(p => p.toLowerCase().includes(filters.partNumber.toLowerCase()));
  }, [filters.partNumber, allParts]);

  useEffect(() => {
    const handleClickOutside = (event) => {
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

  const fetchFrom = useMemo(() => {
    if (filters.fromDate) return new Date(filters.fromDate);
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, [filters.fromDate]);

  const fetchTo = useMemo(() => {
    if (filters.toDate) return new Date(filters.toDate);
    return new Date();
  }, [filters.toDate]);

  useEffect(() => {
    setFilterOptionsCache({ customers: [], parts: [] });
  }, [fetchFrom, fetchTo]);

  const pickerFrom = useMemo(() => {
    if (filters.fromDate) return new Date(filters.fromDate);
    if (otdSource?.from) return new Date(otdSource.from);
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, [filters.fromDate, otdSource?.from]);

  const pickerTo = useMemo(() => {
    if (filters.toDate) return new Date(filters.toDate);
    if (otdSource?.to) return new Date(otdSource.to);
    return new Date();
  }, [filters.toDate, otdSource?.to]);

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
    setChartType("line");
  };

  useEffect(() => {
    const ctrl = new AbortController();
    setChartLoading(true);
    setChartError(null);
    fetch(buildOtdUrl(fetchFrom, fetchTo, fetchFilters), {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok || json?.error) {
          throw new Error(json?.error || "OTD load failed");
        }
        setOtdLive(json);
        onOtdData?.(json);
        if (
          json.filterOptions &&
          !fetchFilters.customer &&
          !fetchFilters.partNumber
        ) {
          setFilterOptionsCache({
            customers: json.filterOptions.customers || [],
            parts: json.filterOptions.parts || [],
          });
        }
        const src = json.report || json;
        const labels = src.labels || [];
        const chartValues = src.data || [];
        if (!labels.length) {
          setReport(null);
          return;
        }
        setReport({
          labels,
          data: chartValues,
          fy: src.fy || json.fy || "",
          from: src.from || json.from || "",
          to: src.to || json.to || "",
        });
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setChartError(e.message || "Failed to load OTD");
        setReport(null);
        setOtdLive(null);
        onOtdData?.(null);
      })
      .finally(() => setChartLoading(false));
    return () => ctrl.abort();
  }, [fetchFrom, fetchTo, fetchFilters.customer, fetchFilters.partNumber, uid, onOtdData]);

  const chartLabels = report?.labels ?? [];
  const chartData = report?.data ?? [];
  const fy = report?.fy ?? "";
  const reportFrom = report?.from ?? formatLocalYmd(fetchFrom);
  const reportTo = report?.to ?? formatLocalYmd(fetchTo);
  const chartTitle = `On-Time Delivery Trend (${reportFrom} → ${reportTo})`;
  const hasChart = chartLabels.length > 0;

  const setupChart = useCallback(
    (canvas) => {
      if (!chartLabels.length) return null;
      const n = chartLabels.length;
      const targetPct = targetConfig?.otd?.targetPct ?? 90;

      const isCombo = chartType === "combo";
      const isBar = chartType === "bar";
      const isLine = chartType === "line" || !chartType;
      const isArea = chartType === "area";
      const isStepped = chartType === "stepped";
      const isRadar = chartType === "radar";
      const isPolarArea = chartType === "polarArea";

      if (isPolarArea) {
        return createPp1Chart(canvas, {
          type: "polarArea",
          data: {
            labels: chartLabels,
            datasets: [
              {
                label: `OTD % Actual — ${fy}`,
                data: chartData,
                backgroundColor: chartLabels.map((_, i) => {
                  const colors = [
                    "rgba(124, 58, 237, 0.6)",
                    "rgba(14, 165, 233, 0.6)",
                    "rgba(16, 185, 129, 0.6)",
                    "rgba(245, 158, 11, 0.6)",
                    "rgba(236, 72, 153, 0.6)"
                  ];
                  return colors[i % colors.length];
                }),
                borderColor: "#ffffff",
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "right",
                labels: { font: { size: 9, family: "'Inter', sans-serif" }, boxWidth: 10 }
              },
              title: {
                display: true,
                text: chartTitle,
                font: { size: 10 },
                color: "#64748b",
                padding: { bottom: 8 }
              }
            },
            scales: {
              r: {
                min: 0,
                max: 100,
                grid: { circular: true, color: "rgba(0, 0, 0, 0.05)" },
                ticks: { display: true, font: { family: PP1_FONT, size: 8 }, backdropColor: "transparent", callback: (v) => `${v}%` }
              }
            }
          }
        });
      }

      if (isRadar) {
        return createPp1Chart(canvas, {
          type: "radar",
          data: {
            labels: chartLabels,
            datasets: [
              {
                label: `OTD % Actual — ${fy}`,
                data: chartData,
                borderColor: "#7c3aed",
                backgroundColor: "rgba(124, 58, 237, 0.15)",
                borderWidth: 2,
                pointRadius: 3,
                fill: true,
                tension: 0.25
              },
              {
                label: `Target ${targetPct}%`,
                data: Array(n).fill(targetPct),
                borderColor: "#ef4444",
                backgroundColor: "transparent",
                borderWidth: 1.5,
                borderDash: [5, 5],
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
                position: "top",
                labels: { font: { size: 9, family: "'Inter', sans-serif" }, boxWidth: 10 }
              },
              title: {
                display: true,
                text: chartTitle,
                font: { size: 10 },
                color: "#64748b",
                padding: { bottom: 8 }
              }
            },
            scales: {
              r: {
                min: 0,
                max: 100,
                grid: { color: "rgba(0, 0, 0, 0.05)" },
                ticks: { display: true, font: { family: PP1_FONT, size: 8 }, backdropColor: "transparent", callback: (v) => `${v}%` }
              }
            }
          }
        });
      }

      const mainType = (isCombo || isBar) ? "bar" : "line";

      return createPp1Chart(canvas, {
        type: mainType,
        data: {
          labels: chartLabels,
          datasets: [
            {
              type: mainType,
              label: `OTD % Actual — ${fy}`,
              data: chartData,
              borderColor: "#7c3aed",
              backgroundColor: mainType === "bar" ? "rgba(124, 58, 237, 0.75)" : (isArea ? "rgba(124, 58, 237, 0.15)" : "transparent"),
              borderWidth: mainType === "bar" ? 1.5 : 2.5,
              borderRadius: mainType === "bar" ? 4 : 0,
              fill: isArea,
              stepped: isStepped ? "middle" : false,
              pointRadius: mainType === "bar" ? 0 : 3,
              tension: (isLine || isArea) ? 0.4 : 0,
            },
            {
              type: "line",
              label: `Target ${targetPct}%`,
              data: Array(n).fill(targetPct),
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
    [chartLabels.join(","), chartData.join(","), fy, chartTitle, targetConfig?.otd?.targetPct, chartType]
  );

  const rebuildToken = `${otdReportChartToken(report)}|${targetConfig?.otd?.targetPct ?? 90}|${chartType}`;
  const otdKpis = otdSource?.kpis ?? {};

  const kpis = [
    { label: "OTD %", value: fmtPct(otdKpis.on_time_delivery_pct), icon: Calendar, color: "#7c3aed" },
    { label: "On-Time Qty", value: fmtNum(otdKpis.on_time_qty), icon: CheckCircle2, color: "#10b981" },
    { label: "Total Del.", value: fmtNum(otdKpis.total_del_qty), icon: Truck, color: "#2d6de8" },
    { label: "Delayed Lines", value: fmtNum(otdKpis.delayed_lines), icon: AlertTriangle, color: "#ef4444" }
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
      noData={chartLabels.length === 0}
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

        {/* Customer Name Filter */}
        <div className="pp1-filter-group" style={{ minWidth: '180px' }}>
          <label className="pp1-filter-label">Customer Name</label>
          <Pp1SearchableMultiSelect
            value={filters?.customer}
            options={allCustomers}
            onChange={val => handleInputChange("customer", val)}
            placeholder="Search customer..."
            allLabel="All Customers"
            searchPlaceholder="Search customer..."
          />
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

        {/* Chart Type Dropdown */}
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
                  <BarChart2 size={12} style={{ color: "#7c3aed" }} />
                ) : chartType === "area" ? (
                  <AreaChart size={12} style={{ color: "#7c3aed" }} />
                ) : chartType === "radar" ? (
                  <Radar size={12} style={{ color: "#7c3aed" }} />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} style={{ color: "#7c3aed" }} />
                ) : chartType === "stepped" ? (
                  <Activity size={12} style={{ color: "#7c3aed" }} />
                ) : chartType === "combo" ? (
                  <TrendingUp size={12} style={{ color: "#7c3aed" }} />
                ) : (
                  <LucideLineChart size={12} style={{ color: "#7c3aed" }} />
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
                    <opt.icon size={12} style={{ color: chartType === opt.id ? "#fff" : "#7c3aed" }} />
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
      return createPp1Chart(canvas, {
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
      return createPp1Chart(canvas, {
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
      return createPp1Chart(canvas, {
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

const CustomerPoCompareView = React.memo(function CustomerPoCompareView({ data, loading, uid, filters, onFilterChange, activeSlide, onActiveSlideChange, onClose, targetConfig, showTargetOnly, setShowTargetOnly }) {
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

  const allCustomers = React.useMemo(() => {
    const source = (data?.customerPoCompare?.rows && Array.isArray(data.customerPoCompare.rows))
      ? data.customerPoCompare.rows
      : [];
    const names = source.map(r => r.customer).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [data?.customerPoCompare?.rows]);

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
      const selectedCusts = filters.customer.split(",").map(c => c.trim()).filter(Boolean);
      if (selectedCusts.length > 0) {
        list = list.filter(r => selectedCusts.includes(r.customer));
      }
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
      return createPp1Chart(canvas, {
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
            legend: pp1PremiumLegendBottom,
            tooltip: {
              ...pp1PremiumTooltip,
              callbacks: {
                label: (context) => ` ${context.dataset.label}: ${fmtLakhsLabel(context.raw)}`
              }
            },
            datalabels: pp1DataLabelsLakhs({ skipLabels: ["Sales Target"] }),
          },
          scales: {
            r: {
              min: 0,
              suggestedMax: Math.max(0, salesTarget, ...orderValues, ...salesValues, ...pendingValues) * 1.1,
              angleLines: { display: true, color: "rgba(99, 102, 241, 0.08)" },
              grid: { circular: true, color: "rgba(99, 102, 241, 0.06)" },
              pointLabels: { font: { family: PP1_FONT, size: 9, weight: "600" }, color: "#64748b" },
              ticks: { display: true, font: { family: PP1_FONT, size: 8 }, backdropColor: "transparent", callback: (v) => fmtLakhsLabel(v) }
            }
          },
          animation: pp1ChartAnimation,
        }
      });
    }

    // Handle Polar Area Chart
    if (chartType === "polarArea") {
      return createPp1Chart(canvas, {
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
        order: 3
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
        fill: false,
        stepped: isStepped ? "middle" : false,
        hidden: showTargetOnly,
        order: 2
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
        fill: false,
        stepped: isStepped ? "middle" : false,
        hidden: showTargetOnly,
        order: 1
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

    return createPp1Chart(canvas, {
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
            ...pp1PremiumLegendBottom,
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
            ...pp1PremiumTooltip,
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ${fmtLakhsLabel(context.raw)}`
            }
          },
          datalabels: pp1DataLabelsLakhs({ skipLabels: ["Sales Target"] }),
        },
        elements: pp1ChartHoverElements,
        animation: pp1ChartAnimation,
        scales: {
          x: {
            ticks: { color: "#64748b", font: { family: PP1_FONT, size: 10, weight: "600" } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            grace: "8%",
            ticks: {
              color: "#64748b",
              font: { family: PP1_FONT, size: 10 },
              callback: pp1LakhsAxisTick
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
    <div className="pp1-action-detail pp1-center-premium pp1-ct-reveal pp1-ct-reveal--in" key={uid} style={{ "--act-color": "var(--pp1-blue)" }}>
      <div className="pp1-action-detail__header pp1-center-premium__header">
        <div className="pp1-action-detail__icon-box pp1-center-premium__icon" style={{ background: "var(--pp1-blue)" }}>
          <Scale size={16} style={{ color: "#fff" }} />
        </div>
        <div className="pp1-action-detail__meta">
          <p className="pp1-action-detail__title">Customer PO vs Sales Value</p>
        </div>
        <button type="button" className="pp1-action-detail__close pp1-center-premium__close" onClick={onClose}>✕</button>
      </div>

      <div className="pp1-filters-front">
        <div className="pp1-filters-bar pp1-filters-bar--standalone">
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
            <Pp1SearchableMultiSelect
              value={filters.customer}
              options={allCustomers}
              onChange={val => handleInputChange("customer", val)}
              placeholder="Search customer..."
              allLabel="All Customers"
              searchPlaceholder="Search customer..."
            />
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
      </div>

      <div className="pp1-action-detail__body pp1-center-premium__body pp1-center-premium__body--content">
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
            {chart1Data.length === 0 ? (
              <Pp1NoDataOverlay />
            ) : (
              <div className="pp1-carousel-chart-wrap pp1-center-chart__wrap">
                <ChartJsCanvas
                  setup={slides[activeSlide].setup}
                  height={205}
                  className="pp1-center-chart__frame"
                  rebuildToken={`${activeSlide}|${chart1Data.length}|${JSON.stringify(filters)}|${targetConfig?.customer_po?.salesTarget}|${showTargetOnly}|${chartType}`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

function CustomerPoCompareBottomTable({ data, loading, uid, filters, showTargetOnly, targetConfig }) {
  const salesTarget = targetConfig?.customer_po?.salesTarget ?? 25;

  const [sortIndex, setSortIndex] = React.useState(null);
  const [sortDirection, setSortDirection] = React.useState("asc");
  const [hoveredHeader, setHoveredHeader] = React.useState(null);

  const handleSort = (idx) => {
    if (sortIndex === idx) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortIndex(null);
        setSortDirection("asc");
      }
    } else {
      setSortIndex(idx);
      setSortDirection("asc");
    }
  };

  // Reset sorting state when switching views or dashboards
  React.useEffect(() => {
    setSortIndex(null);
    setSortDirection("asc");
    setHoveredHeader(null);
  }, [showTargetOnly, uid]);

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
      const selectedCusts = filters.customer.split(",").map(c => c.trim()).filter(Boolean);
      if (selectedCusts.length > 0) {
        list = list.filter(r => selectedCusts.includes(r.customer));
      }
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

    return Object.values(customerGroups);
  }, [filters.fromDate, filters.toDate, filters.customer, filters.poNumber, filters.partNumber, data?.customerPoCompare?.rows]);

  const sortedRows = React.useMemo(() => {
    if (sortIndex === null) {
      return [...table1Rows].sort((a, b) => a.customer.localeCompare(b.customer));
    }

    return [...table1Rows].sort((a, b) => {
      let valA, valB;
      if (showTargetOnly) {
        if (sortIndex === 0) {
          valA = a.customer;
          valB = b.customer;
        } else {
          valA = salesTarget;
          valB = salesTarget;
        }
      } else {
        if (sortIndex === 0) {
          valA = a.customer;
          valB = b.customer;
        } else if (sortIndex === 1) {
          valA = a.orderValue;
          valB = b.orderValue;
        } else if (sortIndex === 2) {
          valA = a.salesValue;
          valB = b.salesValue;
        } else {
          valA = a.pendingValue;
          valB = b.pendingValue;
        }
      }

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === "asc"
          ? (valA - valB)
          : (valB - valA);
      }
    });
  }, [table1Rows, sortIndex, sortDirection, showTargetOnly, salesTarget]);

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
              {/* Customer Header (idx = 0) */}
              <th
                onClick={() => handleSort(0)}
                onMouseEnter={() => setHoveredHeader(0)}
                onMouseLeave={() => setHoveredHeader(null)}
                style={{
                  position: "sticky",
                  top: 0,
                  backgroundColor: hoveredHeader === 0 ? "#eef3fc" : "#f2f6fe",
                  zIndex: 10,
                  textAlign: "left",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "background-color 0.2s ease",
                  padding: "12px 16px"
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <span>Customer</span>
                  <SortIcon active={sortIndex === 0} direction={sortDirection} />
                </div>
              </th>

              {showTargetOnly ? (
                /* Sales Target Header (idx = 1) */
                <th
                  onClick={() => handleSort(1)}
                  onMouseEnter={() => setHoveredHeader(1)}
                  onMouseLeave={() => setHoveredHeader(null)}
                  style={{
                    position: "sticky",
                    top: 0,
                    backgroundColor: hoveredHeader === 1 ? "#eef3fc" : "#f2f6fe",
                    zIndex: 10,
                    textAlign: "right",
                    cursor: "pointer",
                    userSelect: "none",
                    transition: "background-color 0.2s ease",
                    color: "#b91c1c",
                    padding: "12px 16px"
                  }}
                >
                  <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "5px", width: "100%" }}>
                    <span>Sales Target (Lakhs)</span>
                    <SortIcon active={sortIndex === 1} direction={sortDirection} />
                  </div>
                </th>
              ) : (
                <>
                  {/* Order Value Header (idx = 1) */}
                  <th
                    onClick={() => handleSort(1)}
                    onMouseEnter={() => setHoveredHeader(1)}
                    onMouseLeave={() => setHoveredHeader(null)}
                    style={{
                      position: "sticky",
                      top: 0,
                      backgroundColor: hoveredHeader === 1 ? "#eef3fc" : "#f2f6fe",
                      zIndex: 10,
                      textAlign: "right",
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "background-color 0.2s ease",
                      padding: "12px 16px"
                    }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "5px", width: "100%" }}>
                      <span>Order Value (Lakhs)</span>
                      <SortIcon active={sortIndex === 1} direction={sortDirection} />
                    </div>
                  </th>

                  {/* Sales Value Header (idx = 2) */}
                  <th
                    onClick={() => handleSort(2)}
                    onMouseEnter={() => setHoveredHeader(2)}
                    onMouseLeave={() => setHoveredHeader(null)}
                    style={{
                      position: "sticky",
                      top: 0,
                      backgroundColor: hoveredHeader === 2 ? "#eef3fc" : "#f2f6fe",
                      zIndex: 10,
                      textAlign: "right",
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "background-color 0.2s ease",
                      padding: "12px 16px"
                    }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "5px", width: "100%" }}>
                      <span>Sales Value (Lakhs)</span>
                      <SortIcon active={sortIndex === 2} direction={sortDirection} />
                    </div>
                  </th>

                  {/* Pending Order Value Header (idx = 3) */}
                  <th
                    onClick={() => handleSort(3)}
                    onMouseEnter={() => setHoveredHeader(3)}
                    onMouseLeave={() => setHoveredHeader(null)}
                    style={{
                      position: "sticky",
                      top: 0,
                      backgroundColor: hoveredHeader === 3 ? "#eef3fc" : "#f2f6fe",
                      zIndex: 10,
                      textAlign: "right",
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "background-color 0.2s ease",
                      padding: "12px 16px"
                    }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "5px", width: "100%" }}>
                      <span>Pending Order Value (Lakhs)</span>
                      <SortIcon active={sortIndex === 3} direction={sortDirection} />
                    </div>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={showTargetOnly ? 2 : 4} style={{ padding: 0 }}>
                  <Pp1NoDataOverlay />
                </td>
              </tr>
            ) : (
              sortedRows.map((r, idx) => (
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

/* ── No Data Overlay ── */
function Pp1NoDataOverlay({ message }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: "10px", padding: "40px 20px", minHeight: "180px", width: "100%"
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "linear-gradient(135deg, rgba(148,163,184,0.13) 0%, rgba(148,163,184,0.06) 100%)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <AlertCircle size={26} style={{ color: "#94a3b8" }} />
      </div>
      <span style={{
        fontWeight: 600, fontSize: "14px", color: "#64748b",
        fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: "center"
      }}>
        {message || "No Data found on this Given Period"}
      </span>
      <span style={{
        fontSize: "11.5px", color: "#94a3b8",
        fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: "center"
      }}>
        Try selecting another date range or adjusting filters
      </span>
    </div>
  );
}

/* ── Generic Premium Dashboard View & Bottom Table Helpers ── */
const PremiumDashboardView = React.memo(function PremiumDashboardView({ title, icon: Icon, color, kpis, setupChart, chartHeight = 220, rangeHint, onClose, rebuildToken, chartControls, chartHeaderControls, extraBottom, children, trend, noData }) {
  return (
    <div className="pp1-action-detail pp1-center-premium pp1-ct-reveal pp1-ct-reveal--in" style={{ "--act-color": color }}>
      <div className="pp1-action-detail__header pp1-center-premium__header">
        <div className="pp1-action-detail__icon-box pp1-center-premium__icon" style={{ background: color }}>
          <Icon size={16} style={{ color: "#fff" }} />
        </div>
        <div className="pp1-action-detail__meta pp1-center-premium__meta">
          <p className="pp1-action-detail__title">{title}</p>
          {trend && (
            <span className={`pp1-center-trend pp1-center-trend--${trend.type === "up" ? "up" : "down"}`}>
              {trend.type === "up" ? "▲" : "▼"} {trend.value}
            </span>
          )}
        </div>
        <button type="button" className="pp1-action-detail__close pp1-center-premium__close" onClick={onClose}>✕</button>
      </div>

      {children ? (
        <div className="pp1-filters-front">
          {children}
        </div>
      ) : null}

      <div className="pp1-action-detail__body pp1-center-premium__body pp1-center-premium__body--content">
        {kpis && kpis.length > 0 && (
          <div className="pp1-detail__strip pp1-center-kpi-strip">
            {kpis.map((k, i) => (
              <div
                key={i}
                className="pp1-detail__chip pp1-center-kpi"
                style={{ "--chip-color": k.color, "--chip-delay": `${i * 70}ms` }}
              >
                <div className="pp1-center-kpi__top">
                  {typeof k.icon === "string" ? (
                    <span className="pp1-detail__chip-icon">{k.icon}</span>
                  ) : k.icon ? (
                    <span className="pp1-detail__chip-icon pp1-center-kpi__icon" style={{ background: k.color + "22", color: k.color }}>
                      <k.icon size={13} />
                    </span>
                  ) : null}
                  <p
                    className="pp1-detail__chip-val pp1-kpi-val-premium"
                    style={{ "--kv-delay": `${i * 70 + 80}ms`, fontSize: typeof k.value === "string" && k.value.includes("\n") ? "13px" : undefined }}
                  >
                    {k.value}
                  </p>
                </div>
                <p className="pp1-detail__chip-lbl pp1-center-kpi__lbl">{k.label}</p>
              </div>
            ))}
          </div>
        )}

        {chartControls}

        {noData ? (
          <div className="pp1-dt-card pp1-center-chart">
            <div className="pp1-dt-card__hd pp1-center-chart__hd">
              <div className="pp1-dt-card__title pp1-center-chart__title">
                {rangeHint ? (rangeHint.includes("-") && !rangeHint.includes("Breakdown") ? `Trend Analysis (${rangeHint})` : rangeHint) : title}
              </div>
              {chartHeaderControls}
            </div>
            <div className="pp1-dt-chart-wrap pp1-center-chart__wrap" style={{ height: chartHeight, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Pp1NoDataOverlay />
            </div>
          </div>
        ) : setupChart ? (
          <div className="pp1-dt-card pp1-center-chart">
            <div className="pp1-dt-card__hd pp1-center-chart__hd">
              <div className="pp1-dt-card__title pp1-center-chart__title">
                {rangeHint.includes("-") && !rangeHint.includes("Breakdown") ? `Trend Analysis (${rangeHint})` : rangeHint}
              </div>
              {chartHeaderControls}
            </div>
            <div className="pp1-dt-chart-wrap pp1-center-chart__wrap" style={{ height: chartHeight }}>
              <ChartJsCanvas setup={setupChart} height={chartHeight} rebuildToken={rebuildToken || title} className="pp1-center-chart__frame" />
            </div>
          </div>
        ) : null}
        {extraBottom}
      </div>
    </div>
  );
});

const parseSortValue = (val) => {
  if (val === undefined || val === null) return "";
  const s = String(val).trim();
  // Currency with lakhs suffix: e.g., ₹1.500 L
  if (s.includes("₹") && s.endsWith(" L")) {
    const numStr = s.replace(/[₹\sL,]/g, "");
    const num = parseFloat(numStr);
    if (!isNaN(num)) return num * 100000;
  }
  // Currency: e.g., ₹5,00,000
  if (s.includes("₹")) {
    const numStr = s.replace(/[₹\s,]/g, "");
    const num = parseFloat(numStr);
    if (!isNaN(num)) return num;
  }
  // Percentage: e.g., 92.5%
  if (s.endsWith("%")) {
    const numStr = s.replace(/[%]/g, "");
    const num = parseFloat(numStr);
    if (!isNaN(num)) return num;
  }
  // Hours: e.g., 250 h
  if (s.endsWith(" h")) {
    const numStr = s.replace(/[\sh]/g, "");
    const num = parseFloat(numStr);
    if (!isNaN(num)) return num;
  }
  // Regular numbers with commas: e.g., 5,000
  const cleanNumStr = s.replace(/,/g, "");
  if (/^-?\d+(\.\d+)?$/.test(cleanNumStr)) {
    const num = parseFloat(cleanNumStr);
    if (!isNaN(num)) return num;
  }
  // Dates: e.g., 2026-06-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }
  return s.toLowerCase();
};

const SortIcon = ({ active, direction }) => {
  return (
    <span style={{
      display: "inline-flex",
      fontSize: "8px",
      color: active ? "#ffffff" : "rgba(255, 255, 255, 0.3)",
      transition: "all 0.15s ease",
      transform: active && direction === "desc" ? "rotate(180deg)" : "none",
      marginLeft: "5px",
      verticalAlign: "middle",
      flexShrink: 0
    }}>
      ▲
    </span>
  );
};

function PremiumDashboardBottomTable({ title, columns, rows }) {
  const [sortIndex, setSortIndex] = React.useState(null);
  const [sortDirection, setSortDirection] = React.useState("asc");
  const [hoveredHeader, setHoveredHeader] = React.useState(null);

  const handleSort = (idx) => {
    if (sortIndex === idx) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortIndex(null);
        setSortDirection("asc");
      }
    } else {
      setSortIndex(idx);
      setSortDirection("asc");
    }
  };

  const sortedRows = React.useMemo(() => {
    if (sortIndex === null) return rows;

    const sorted = [...rows].sort((a, b) => {
      const valA = parseSortValue(a[sortIndex]);
      const valB = parseSortValue(b[sortIndex]);
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    const firstColLower = columns[0].toLowerCase();
    if (firstColLower.includes("sl.no") || firstColLower.includes("sl.no.")) {
      return sorted.map((row, idx) => {
        const newRow = [...row];
        newRow[0] = String(idx + 1);
        return newRow;
      });
    }

    return sorted;
  }, [rows, sortIndex, sortDirection, columns]);

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd">{title}</div>
      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300 }}>
        <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
          <thead>
            <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
              {columns.map((col, idx) => {
                const isRightAligned = idx > 2 && (col.toLowerCase().includes("qty") || col.toLowerCase().includes("value") || col.toLowerCase().includes("hours") || col.toLowerCase().includes("hour") || col.toLowerCase().includes("rate") || col.toLowerCase().includes("ratio") || col.toLowerCase().includes("%") || col.toLowerCase().includes("day") || col.toLowerCase().includes("month") || col.toLowerCase().includes("loss") || col.toLowerCase().includes("price"));
                const isHovered = hoveredHeader === idx;
                const isSorted = sortIndex === idx;
                const isSlNo = idx === 0;

                return (
                  <th
                    key={idx}
                    onClick={() => !isSlNo && handleSort(idx)}
                    onMouseEnter={() => !isSlNo && setHoveredHeader(idx)}
                    onMouseLeave={() => !isSlNo && setHoveredHeader(null)}
                    style={{
                      position: "sticky",
                      top: 0,
                      backgroundColor: isHovered && !isSlNo ? "#eef3fc" : "#f2f6fe",
                      zIndex: 10,
                      textAlign: isRightAligned ? "right" : "left",
                      cursor: isSlNo ? "default" : "pointer",
                      userSelect: "none",
                      transition: "background-color 0.2s ease",
                      padding: "12px 16px"
                    }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: isRightAligned ? "flex-end" : "flex-start", gap: "5px", width: "100%" }}>
                      <span>{col}</span>
                      {!isSlNo && <SortIcon active={isSorted} direction={sortDirection} />}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr><td colSpan={columns.length} style={{ padding: 0 }}><Pp1NoDataOverlay /></td></tr>
            ) : (
              sortedRows.map((row, ri) => (
                <tr key={ri} className="pp1-cc-tbl__tr">
                  {row.map((cell, ci) => {
                    const isRightAligned = ci > 2 && (columns[ci].toLowerCase().includes("qty") || columns[ci].toLowerCase().includes("value") || columns[ci].toLowerCase().includes("hours") || columns[ci].toLowerCase().includes("hour") || columns[ci].toLowerCase().includes("rate") || columns[ci].toLowerCase().includes("ratio") || columns[ci].toLowerCase().includes("%") || columns[ci].toLowerCase().includes("day") || columns[ci].toLowerCase().includes("month") || columns[ci].toLowerCase().includes("loss") || columns[ci].toLowerCase().includes("price"));
                    const isStatus = columns[ci].toLowerCase() === "status" || columns[ci].toLowerCase() === "dispatch status" || columns[ci].toLowerCase().includes("status");
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
                        "Out of Stock": { bg: "#fee2e2", c: "#991b1b" },
                        "On Track": { bg: "#d1fae5", c: "#065f46" },
                        "Low Fulfillment": { bg: "#fee2e2", c: "#991b1b" }
                      };
                      const statusKey = typeof cell === "string" && cell.includes("(")
                        ? cell.split("(")[0].trim()
                        : cell;
                      const stcfg = statusColors[statusKey] || statusColors[cell] || { bg: "#f1f5f9", c: "#475569" };
                      return (
                        <td key={ci} style={{ textAlign: "center" }}>
                          <span className="pp1-cc-badge" style={{ background: stcfg.bg, color: stcfg.c, padding: "3px 9px", borderRadius: "12px", fontSize: "9.5px", fontWeight: 700 }}>
                            {cell}
                          </span>
                        </td>
                      );
                    }
                    const colLower = columns[ci].toLowerCase();
                    const isRejectionPct = colLower.includes("rejection %") || colLower === "rej %";
                    const isReworkPct = colLower.includes("rework %") || colLower === "rwk %";
                    const isOtdPct = colLower.includes("on-time delivery %") || colLower.includes("delivery %") || colLower === "otd %";
                    const isAgeDays = colLower.includes("age days");
                    const isLossPct = colLower.includes("production loss %") || colLower === "loss %";
                    const isOperatorPct = colLower.includes("operator %") || colLower === "operator%";
                    const isMachinePct = colLower.includes("machine %") || colLower === "machine%";

                    if (isAgeDays) {
                      const pctVal = parseFloat(cell) || 0;
                      let badgeBg = "rgba(16, 185, 129, 0.1)";
                      let badgeColor = "#10b981";
                      let badgeBorder = "1px solid rgba(16, 185, 129, 0.15)";

                      if (pctVal <= 15) {
                        badgeBg = "rgba(16, 185, 129, 0.08)";
                        badgeColor = "#10b981";
                        badgeBorder = "1px solid rgba(16, 185, 129, 0.18)";
                      } else if (pctVal <= 40) {
                        badgeBg = "rgba(245, 158, 11, 0.08)";
                        badgeColor = "#d97706";
                        badgeBorder = "1px solid rgba(245, 158, 11, 0.18)";
                      } else {
                        badgeBg = "rgba(239, 68, 68, 0.08)";
                        badgeColor = "#ef4444";
                        badgeBorder = "1px solid rgba(239, 68, 68, 0.18)";
                      }

                      const cellStr = String(cell);
                      const displayVal = !cellStr.toLowerCase().includes("days") ? `${cellStr} Days` : cellStr;

                      return (
                        <td key={ci} style={{ textAlign: "right", verticalAlign: "middle" }}>
                          <span style={{
                            display: "inline-block",
                            background: badgeBg,
                            color: badgeColor,
                            border: badgeBorder,
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "10.5px",
                            fontWeight: 750,
                            textAlign: "center",
                            minWidth: "68px",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.01)",
                            transition: "all 0.2s ease"
                          }}>
                            {displayVal}
                          </span>
                        </td>
                      );
                    }

                    if (isRejectionPct || isReworkPct || isOtdPct || isLossPct || isOperatorPct || isMachinePct) {
                      const pctVal = parseFloat(cell) || 0;
                      let barGradient = "linear-gradient(90deg, #10b981 0%, #3b82f6 100%)";
                      let barWidthPct = 0;

                      if (isRejectionPct) {
                        barWidthPct = Math.min(100, pctVal * 3.33);
                        if (pctVal > 12) {
                          barGradient = "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)";
                        } else if (pctVal > 5) {
                          barGradient = "linear-gradient(90deg, #3b82f6 0%, #f59e0b 100%)";
                        }
                      } else if (isReworkPct) {
                        barWidthPct = Math.min(100, pctVal * 5.0);
                        if (pctVal > 8) {
                          barGradient = "linear-gradient(90deg, #ec4899 0%, #ef4444 100%)"; // High: pink to red
                        } else if (pctVal > 1.5) {
                          barGradient = "linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)"; // Medium: purple to indigo
                        } else {
                          barGradient = "linear-gradient(90deg, #10b981 0%, #8b5cf6 100%)"; // Low: green to purple
                        }
                      } else if (isOtdPct) {
                        barWidthPct = Math.min(100, pctVal);
                        if (pctVal >= 95) {
                          barGradient = "linear-gradient(90deg, #10b981 0%, #059669 100%)"; // Excellent: green to emerald
                        } else if (pctVal >= 90) {
                          barGradient = "linear-gradient(90deg, #3b82f6 0%, #10b981 100%)"; // Good: blue to green
                        } else if (pctVal >= 85) {
                          barGradient = "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)"; // Warning: amber to dark amber
                        } else {
                          barGradient = "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)"; // Critical: red to dark red
                        }
                      } else if (isLossPct) {
                        barWidthPct = Math.min(100, pctVal);
                        if (pctVal > 25) {
                          barGradient = "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)"; // High loss: amber to red
                        } else if (pctVal > 15) {
                          barGradient = "linear-gradient(90deg, #3b82f6 0%, #f59e0b 100%)"; // Medium loss: blue to amber
                        } else {
                          barGradient = "linear-gradient(90deg, #10b981 0%, #3b82f6 100%)"; // Low loss: green to blue
                        }
                      } else if (isOperatorPct) {
                        barWidthPct = Math.min(100, pctVal);
                        if (pctVal >= 90) {
                          barGradient = "linear-gradient(90deg, #10b981 0%, #059669 100%)"; // Excellent: green
                        } else if (pctVal >= 85) {
                          barGradient = "linear-gradient(90deg, #3b82f6 0%, #10b981 100%)"; // Good: blue to green
                        } else if (pctVal >= 75) {
                          barGradient = "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)"; // Warning: amber
                        } else {
                          barGradient = "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)"; // Critical: red
                        }
                      } else if (isMachinePct) {
                        barWidthPct = Math.min(100, pctVal);
                        if (pctVal >= 90) {
                          barGradient = "linear-gradient(90deg, #10b981 0%, #059669 100%)"; // Excellent: green
                        } else if (pctVal >= 85) {
                          barGradient = "linear-gradient(90deg, #3b82f6 0%, #10b981 100%)"; // Good: blue to green
                        } else if (pctVal >= 75) {
                          barGradient = "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)"; // Warning: amber
                        } else {
                          barGradient = "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)"; // Critical: red
                        }
                      }

                      return (
                        <td key={ci} style={{ textAlign: "right", verticalAlign: "middle" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", justifyContent: "flex-end", width: "100%" }}>
                            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "11px", color: "var(--pp1-text-2)", minWidth: "32px", textAlign: "right" }}>{cell}</span>
                            <div style={{
                              width: "80px",
                              height: "8px",
                              borderRadius: "4px",
                              backgroundColor: "rgba(0,0,0,0.06)",
                              overflow: "hidden",
                              display: "inline-block"
                            }}>
                              <div style={{
                                width: `${barWidthPct}%`,
                                height: "100%",
                                borderRadius: "4px",
                                background: barGradient,
                                transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                              }} />
                            </div>
                          </div>
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
    if (filters.supplier) {
      const selectedSupps = filters.supplier.split(",").map(s => s.trim()).filter(Boolean);
      if (selectedSupps.length > 0 && !selectedSupps.includes(r.supplierName)) {
        return false;
      }
    }
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
  const [chartType, setChartType] = React.useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);
  const chartTypeRef = React.useRef(null);

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
      if (chartTypeRef.current && !chartTypeRef.current.contains(event.target)) {
        setChartTypeOpen(false);
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
    () => `grn-chart|${chartType}|${chartData.length}|${JSON.stringify(chartData)}|${JSON.stringify(filters)}|${targetConfig?.grn_value?.minGrnValueL ?? 100}`,
    [chartType, chartData, filters, targetConfig?.grn_value?.minGrnValueL]
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

    if (chartType === "radar") {
      return createPp1Chart(canvas, {
        type: "radar",
        data: {
          labels,
          datasets: [
            {
              label: "Total GRN Value",
              data: totalData,
              borderColor: "rgba(234, 88, 12, 1)",
              backgroundColor: "rgba(234, 88, 12, 0.15)",
              borderWidth: 2,
              pointRadius: 3,
              fill: true
            },
            {
              label: `Target (₹${grnTarget}L/month)`,
              data: labels.map(() => grnTarget),
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
                label: (context) => {
                  if (context.dataset.label?.startsWith("Target")) {
                    return ` Target: ₹${grnTarget}L/month`;
                  }
                  return ` ${context.dataset.label}: ₹${Number(context.raw).toFixed(2)} L`;
                }
              }
            }
          },
          scales: {
            r: {
              min: 0,
              suggestedMax: maxVal * 1.1,
              angleLines: { display: true, color: "rgba(99, 102, 241, 0.08)" },
              grid: { circular: true, color: "rgba(99, 102, 241, 0.06)" },
              pointLabels: { font: { family: PP1_FONT, size: 9, weight: "600" }, color: "#64748b" },
              ticks: { display: true, font: { family: PP1_FONT, size: 8 }, backdropColor: "transparent", callback: (v) => `₹${v} L` }
            }
          }
        }
      });
    }

    if (chartType === "polarArea") {
      return createPp1Chart(canvas, {
        type: "polarArea",
        data: {
          labels,
          datasets: [
            {
              label: "Total GRN Value",
              data: totalData,
              backgroundColor: "rgba(234, 88, 12, 0.6)",
              borderColor: "rgba(234, 88, 12, 1)",
              borderWidth: 1
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
              suggestedMax: maxVal * 1.1,
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

    const getDatasetType = () => {
      if (isCombo) return "bar";
      return isBar ? "bar" : "line";
    };

    const getFill = () => {
      return isArea || isStepped || isLine;
    };

    const getBgColor = (baseColor) => {
      const type = getDatasetType();
      if (type === "bar") {
        return baseColor + "0.85)";
      }
      if (isArea) return baseColor + "0.25)";
      if (isStepped) return baseColor + "0.15)";
      return baseColor + "0.03)";
    };

    return createPp1Chart(canvas, {
      type: getDatasetType(),
      plugins: [grnTargetLinePlugin],
      data: {
        labels,
        datasets: [
          {
            type: getDatasetType(),
            label: "Total GRN Value",
            data: totalData,
            backgroundColor: getBgColor("rgba(234, 88, 12, "),
            borderColor: "rgba(234, 88, 12, 1)",
            borderWidth: isBar ? 1.5 : 2.5,
            borderRadius: isBar ? 4 : 0,
            borderSkipped: false,
            fill: getFill(),
            stepped: isStepped ? "middle" : false,
            pointRadius: isBar ? 0 : 4,
            pointHoverRadius: isBar ? 0 : 6,
            tension: isLine || isArea ? 0.35 : 0,
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
  }, [chartData, targetConfig, chartType]);

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
    setChartType("bar");
    setChartTypeOpen(false);
  };

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const categories = React.useMemo(() => {
    const dtypes = grnRows.map(r => r.dtype).filter(Boolean);
    return Array.from(new Set(dtypes)).sort();
  }, [grnRows]);

  return (
    <PremiumDashboardView
      title="GRN Value"
      icon={Truck}
      color="#ea580c"
      kpis={kpis}
      setupChart={setupChart}
      chartHeight={220}
      rangeHint={chartRangeLabel}
      onClose={onClose}
      rebuildToken={chartRebuildToken}
      trend={trend}
      noData={filteredRows.length === 0}
    >
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
          <Pp1SearchableMultiSelect
            value={filters.supplier}
            options={suppliers}
            onChange={val => handleInputChange("supplier", val)}
            placeholder="Search supplier..."
            allLabel="All Suppliers"
            searchPlaceholder="Search supplier..."
          />
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
    </PremiumDashboardView>
  );
}

function PurchaseReportBottomTable({ data, loading, filters }) {
  const [sortIndex, setSortIndex] = React.useState(null);
  const [sortDirection, setSortDirection] = React.useState("asc");
  const [hoveredHeader, setHoveredHeader] = React.useState(null);

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

  const columnsMonthWise = React.useMemo(() => {
    return ["Supplier Name", ...uniqueMonths.map(m => `${m} (Lakhs)`), "Total Value (Lakhs)"];
  }, [uniqueMonths]);

  const handleSort = (idx) => {
    if (sortIndex === idx) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortIndex(null);
        setSortDirection("asc");
      }
    } else {
      setSortIndex(idx);
      setSortDirection("asc");
    }
  };

  const sortedRowsMonthWise = React.useMemo(() => {
    if (sortIndex === null) return rowsMonthWise;

    return [...rowsMonthWise].sort((a, b) => {
      let valA, valB;
      if (sortIndex === 0) {
        valA = a[0] || "";
        valB = b[0] || "";
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else if (sortIndex === columnsMonthWise.length - 1) {
        valA = a.slice(1).reduce((s, v) => s + Number(v || 0), 0);
        valB = b.slice(1).reduce((s, v) => s + Number(v || 0), 0);
      } else {
        valA = Number(a[sortIndex] || 0);
        valB = Number(b[sortIndex] || 0);
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [rowsMonthWise, sortIndex, sortDirection, columnsMonthWise]);

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd" style={{ paddingLeft: "16px", marginBottom: "8px" }}>Purchase Value Month Wise</div>
      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
          <thead>
            <tr>
              {columnsMonthWise.map((col, idx) => {
                const isRightAligned = idx > 0;
                const isHovered = hoveredHeader === idx;
                const isSorted = sortIndex === idx;

                return (
                  <th
                    key={idx}
                    onClick={() => handleSort(idx)}
                    onMouseEnter={() => setHoveredHeader(idx)}
                    onMouseLeave={() => setHoveredHeader(null)}
                    style={{
                      position: "sticky",
                      top: 0,
                      backgroundColor: isHovered ? "rgba(255, 255, 255, 0.1)" : "transparent",
                      zIndex: 10,
                      textAlign: isRightAligned ? "right" : "left",
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "background-color 0.2s ease",
                      padding: "12px 16px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                    }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: isRightAligned ? "flex-end" : "flex-start", gap: "5px", width: "100%" }}>
                      <span>{col}</span>
                      <SortIcon active={isSorted} direction={sortDirection} />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRowsMonthWise.length === 0 ? (
              <tr><td colSpan={columnsMonthWise.length} className="pp1-cc-tbl__empty">No data available.</td></tr>
            ) : (
              sortedRowsMonthWise.map((row, ri) => {
                const totalVal = row.slice(1).reduce((s, v) => s + v, 0);
                return (
                  <tr key={ri} className="pp1-cc-tbl__tr">
                    <td className="pp1-cc-tbl__bold" style={{ fontWeight: 700 }}>{row[0]}</td>
                    {row.slice(1).map((val, vi) => (
                      <td key={vi} style={{ textAlign: "right", fontWeight: 600 }}>₹{val.toFixed(2)} L</td>
                    ))}
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--pp1-blue)" }}>₹{totalVal.toFixed(2)} L</td>
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

/* ── Purchase Value helpers (PO data — same filter pattern as GRN Value) ── */
function normalizePoDate(d) {
  if (!d) return "";
  return String(d).trim().slice(0, 10);
}

function filterPurchaseRows(rows, filters, defaultFrom, defaultTo) {
  const source = Array.isArray(rows) ? rows : [];
  const activeFrom = filters.fromDate || defaultFrom;
  const activeTo = filters.toDate || defaultTo;

  return source.filter((r) => {
    const poDate = normalizePoDate(r.poDate);
    if (!poDate || poDate < activeFrom || poDate > activeTo) return false;
    if (filters.supplier) {
      const selectedSupps = filters.supplier.split(",").map(s => s.trim()).filter(Boolean);
      if (selectedSupps.length > 0 && !selectedSupps.includes(r.supplierName)) {
        return false;
      }
    }
    if (filters.partNumber) {
      const pno = String(r.partNo || "").toLowerCase();
      if (!pno.includes(String(filters.partNumber).toLowerCase())) return false;
    }
    if (filters.category && (r.category || "") !== filters.category) return false;
    return true;
  });
}

function buildPurchaseMonthChartData(filteredRows) {
  const monthGroup = {};
  filteredRows.forEach((r) => {
    const month = r.monthName || r.month;
    if (!month || month === "—") return;
    const poDate = normalizePoDate(r.poDate);
    if (!monthGroup[month]) {
      monthGroup[month] = { month, total: 0, minDate: poDate };
    }
    monthGroup[month].total += Number(r.amount || 0);
    if (poDate && (!monthGroup[month].minDate || poDate < monthGroup[month].minDate)) {
      monthGroup[month].minDate = poDate;
    }
  });

  return Object.values(monthGroup).sort((a, b) => {
    if (!a.minDate) return 1;
    if (!b.minDate) return -1;
    return a.minDate.localeCompare(b.minDate);
  });
}

function formatPurchaseCurrency(valueRaw, amountL) {
  const v = Number(valueRaw ?? (Number(amountL || 0) * 100000));
  if (!Number.isFinite(v) || v <= 0) return "—";
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

/* ── Purchase Value View (UI Alone) ─────────────────────────────────────── */
function PurchaseValueDashboardView({ data, filters, onFilterChange, onClose, targetConfig }) {
  const [suppOpen, setSuppOpen] = React.useState(false);
  const suppRef = React.useRef(null);
  const [catOpen, setCatOpen] = React.useState(false);
  const catRef = React.useRef(null);
  const [partOpen, setPartOpen] = React.useState(false);
  const partRef = React.useRef(null);
  const [chartType, setChartType] = React.useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);
  const chartTypeRef = React.useRef(null);

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
      if (chartTypeRef.current && !chartTypeRef.current.contains(event.target)) {
        setChartTypeOpen(false);
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
    setChartType("bar");
    setChartTypeOpen(false);
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

  const purchaseRows = React.useMemo(
    () => (Array.isArray(data?.purchaseValueCompare?.rows) ? data.purchaseValueCompare.rows : []),
    [data?.purchaseValueCompare?.rows]
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
    () => filterPurchaseRows(purchaseRows, filters, defaultRange.from, defaultRange.to),
    [purchaseRows, filters, defaultRange]
  );

  const chartData = React.useMemo(
    () => buildPurchaseMonthChartData(filteredRows),
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
      const mKey = r.monthName || r.month;
      if (mKey && mKey !== "—") {
        monthTotals[mKey] = (monthTotals[mKey] || 0) + amount;
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

  const setupChart = React.useCallback((canvas) => {
    const targetVal = targetConfig?.purchase_value?.minPurchaseValueL ?? 100;
    const labels = chartData.map((r) => r.month);
    const totalData = chartData.map((r) => Number(r.total || 0));
    const maxVal = Math.max(0, targetVal, ...totalData);

    const purchaseTargetLinePlugin = {
      id: "purchaseValueTargetLine",
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
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
        ctx.moveTo(xScale.left, yPos);
        ctx.lineTo(xScale.right, yPos);
        ctx.stroke();
        ctx.restore();
      },
    };

    if (chartType === "radar") {
      return createPp1Chart(canvas, {
        type: "radar",
        data: {
          labels,
          datasets: [
            {
              label: "Purchase Value",
              data: totalData,
              borderColor: "rgba(234, 88, 12, 1)",
              backgroundColor: "rgba(234, 88, 12, 0.15)",
              borderWidth: 2,
              pointRadius: 3,
              fill: true
            },
            {
              label: `Target (₹${targetVal}L/month)`,
              data: labels.map(() => targetVal),
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
                label: (context) => {
                  if (context.dataset.label?.startsWith("Target")) {
                    return ` Target: ₹${targetVal}L/month`;
                  }
                  return ` ${context.dataset.label}: ₹${Number(context.raw).toFixed(2)} L`;
                }
              }
            }
          },
          scales: {
            r: {
              min: 0,
              suggestedMax: maxVal * 1.1,
              angleLines: { display: true, color: "rgba(99, 102, 241, 0.08)" },
              grid: { circular: true, color: "rgba(99, 102, 241, 0.06)" },
              pointLabels: { font: { family: PP1_FONT, size: 9, weight: "600" }, color: "#64748b" },
              ticks: { display: true, font: { family: PP1_FONT, size: 8 }, backdropColor: "transparent", callback: (v) => `₹${v} L` }
            }
          }
        }
      });
    }

    if (chartType === "polarArea") {
      return createPp1Chart(canvas, {
        type: "polarArea",
        data: {
          labels,
          datasets: [
            {
              label: "Purchase Value",
              data: totalData,
              backgroundColor: "rgba(234, 88, 12, 0.6)",
              borderColor: "rgba(234, 88, 12, 1)",
              borderWidth: 1
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
              suggestedMax: maxVal * 1.1,
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

    const getDatasetType = () => {
      if (isCombo) return "bar";
      return isBar ? "bar" : "line";
    };

    const getFill = () => {
      return isArea || isStepped || isLine;
    };

    const getBgColor = (baseColor) => {
      const type = getDatasetType();
      if (type === "bar") {
        return baseColor + "0.85)";
      }
      if (isArea) return baseColor + "0.25)";
      if (isStepped) return baseColor + "0.15)";
      return baseColor + "0.03)";
    };

    return createPp1Chart(canvas, {
      type: getDatasetType(),
      plugins: [purchaseTargetLinePlugin],
      data: {
        labels,
        datasets: [
          {
            type: getDatasetType(),
            label: "Purchase Value",
            data: totalData,
            backgroundColor: getBgColor("rgba(234, 88, 12, "),
            borderColor: "rgba(234, 88, 12, 1)",
            borderWidth: isBar ? 1.5 : 2.5,
            borderRadius: isBar ? 4 : 0,
            borderSkipped: false,
            fill: getFill(),
            stepped: isStepped ? "middle" : false,
            pointRadius: isBar ? 0 : 4,
            pointHoverRadius: isBar ? 0 : 6,
            tension: isLine || isArea ? 0.35 : 0,
            order: 2,
          },
          {
            type: "line",
            label: `Target (₹${targetVal}L/month)`,
            data: labels.map(() => targetVal),
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
            suggestedMax: (maxVal > 0 ? maxVal : targetVal) * 1.25,
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
  }, [chartData, targetConfig, chartType]);

  const suppliersList = React.useMemo(() => {
    const names = purchaseRows.map(r => r.supplierName).filter(s => s && s !== "—");
    return Array.from(new Set(names)).sort();
  }, [purchaseRows]);

  const categoriesList = React.useMemo(() => {
    const cats = purchaseRows.map(r => r.category).filter(Boolean);
    return Array.from(new Set(cats)).sort();
  }, [purchaseRows]);

  const partsList = React.useMemo(() => {
    const parts = purchaseRows.map(r => r.partNo).filter(Boolean);
    return Array.from(new Set(parts)).sort();
  }, [purchaseRows]);



  const filteredCategories = React.useMemo(() => {
    if (!filters.category) return categoriesList;
    return categoriesList.filter(c => c.toLowerCase().includes(filters.category.toLowerCase()));
  }, [filters.category, categoriesList]);

  const filteredParts = React.useMemo(() => {
    if (!filters.partNumber) return partsList;
    return partsList.filter(p => p.toLowerCase().includes(filters.partNumber.toLowerCase()));
  }, [filters.partNumber, partsList]);

  const chartRebuildToken = React.useMemo(
    () => `purchase-value|${chartType}|${chartData.length}|${JSON.stringify(chartData)}|${JSON.stringify(filters)}|${targetConfig?.purchase_value?.minPurchaseValueL ?? 100}`,
    [chartType, chartData, filters, targetConfig?.purchase_value?.minPurchaseValueL]
  );

  return (
    <PremiumDashboardView
      title="Purchase Value"
      icon={ShoppingCart}
      color="#ea580c"
      kpis={kpis}
      setupChart={setupChart}
      chartHeight={180}
      rangeHint={chartRangeLabel}
      onClose={onClose}
      rebuildToken={chartRebuildToken}
      noData={filteredRows.length === 0}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
        {/* Date Range Picker - exactly like Customer PO vs Sales Value */}
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
          <Pp1SearchableMultiSelect
            value={filters.supplier}
            options={suppliersList}
            onChange={val => handleInputChange("supplier", val)}
            placeholder="Search supplier..."
            allLabel="All Suppliers"
            searchPlaceholder="Search supplier..."
          />
        </div>

        {/* Material Category Dropdown with modern UI */}
        <div className="pp1-filter-group" ref={catRef} style={{ maxWidth: "160px" }}>
          <label className="pp1-filter-label">Material Category</label>
          <div className="pp1-part-autocomplete-wrap" style={{ position: "relative" }}>
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
              style={{ paddingRight: "24px" }}
            />
            <ChevronDown size={12} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", opacity: 0.5, pointerEvents: "none" }} />
            {catOpen && filteredCategories.length > 0 && (
              <div className="pp1-part-suggestions">
                <div className="pp1-part-suggestion-item" onClick={() => { handleInputChange("category", ""); setCatOpen(false); }}>All Categories</div>
                {filteredCategories.map(c => (
                  <div key={c} className={`pp1-part-suggestion-item ${filters.category === c ? "selected" : ""}`} onClick={() => { handleInputChange("category", c); setCatOpen(false); }}>{c}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Part Number Autocomplete with modern UI */}
        <div className="pp1-filter-group" ref={partRef} style={{ maxWidth: "160px" }}>
          <label className="pp1-filter-label">Part Number</label>
          <div className="pp1-part-autocomplete-wrap" style={{ position: "relative" }}>
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
              style={{ paddingRight: "24px" }}
            />
            <ChevronDown size={12} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", opacity: 0.5, pointerEvents: "none" }} />
            {partOpen && filteredParts.length > 0 && (
              <div className="pp1-part-suggestions">
                <div className="pp1-part-suggestion-item" onClick={() => { handleInputChange("partNumber", ""); setPartOpen(false); }}>All Parts</div>
                {filteredParts.map(p => (
                  <div key={p} className={`pp1-part-suggestion-item ${filters.partNumber === p ? "selected" : ""}`} onClick={() => { handleInputChange("partNumber", p); setPartOpen(false); }}>{p}</div>
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

        <button type="button" className="pp1-filter-btn pp1-filter-btn--reset" onClick={handleReset} style={{ flexShrink: 0, height: "28px" }}>
          Reset
        </button>
      </div>
    </PremiumDashboardView>
  );
}

function PurchaseValueBottomTable({ data, filters }) {
  const [activeTab, setActiveTab] = React.useState("month_wise");
  const [sortIndex, setSortIndex] = React.useState(null);
  const [sortDirection, setSortDirection] = React.useState("asc");

  const purchaseRows = React.useMemo(
    () => (Array.isArray(data?.purchaseValueCompare?.rows) ? data.purchaseValueCompare.rows : []),
    [data?.purchaseValueCompare?.rows]
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
    () => filterPurchaseRows(purchaseRows, filters, defaultRange.from, defaultRange.to),
    [purchaseRows, filters, defaultRange]
  );

  const uniqueMonths = React.useMemo(() => {
    const monthMinDate = {};
    filteredRows.forEach(r => {
      const poDate = normalizePoDate(r.poDate);
      const mKey = r.month || r.monthName;
      if (mKey && mKey !== "—" && poDate) {
        if (!monthMinDate[mKey] || poDate < monthMinDate[mKey]) {
          monthMinDate[mKey] = poDate;
        }
      }
    });
    return Object.keys(monthMinDate).sort((a, b) => monthMinDate[a].localeCompare(monthMinDate[b]));
  }, [filteredRows]);

  const monthWiseRows = React.useMemo(() => {
    const supplierGroups = {};
    filteredRows.forEach(r => {
      const sName = r.supplierName || "Unknown";
      const mKey = r.month || r.monthName;
      if (!supplierGroups[sName]) {
        supplierGroups[sName] = { supplierName: sName };
        uniqueMonths.forEach(m => { supplierGroups[sName][m] = 0; });
      }
      if (mKey && supplierGroups[sName][mKey] !== undefined) {
        supplierGroups[sName][mKey] += Number(r.amount || 0);
      }
    });

    return Object.values(supplierGroups)
      .map(group => {
        const row = [group.supplierName];
        uniqueMonths.forEach(m => {
          row.push(group[m] || 0);
        });
        const total = uniqueMonths.reduce((s, m) => s + (group[m] || 0), 0);
        row.push(total);
        return row;
      })
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredRows, uniqueMonths]);

  const purchaseOrdersSummaryRows = React.useMemo(
    () => filteredRows.map(r => ({
      supplier: r.supplierName || "—",
      month: r.month || "—",
      poNo: r.poNumber || "—",
      poDate: r.poDate || "—",
      code: r.partNo || "—",
      name: r.materialName || r.partNo || "—",
      qty: r.qty || "—",
      rate: r.rate || "—",
      value: formatPurchaseCurrency(r.valueRaw, r.amount),
    })),
    [filteredRows]
  );

  const columns1 = React.useMemo(
    () => ["Supplier Name", ...uniqueMonths.map(m => `${m} (Lakhs)`), "Total Value (Lakhs)"],
    [uniqueMonths]
  );
  const columns2 = ["Sl.No", "Supplier", "PO No", "PO Date", "Material Code", "Material Name", "Qty", "Rate", "Purchase Value"];

  React.useEffect(() => {
    setSortIndex(null);
    setSortDirection("asc");
  }, [activeTab]);

  const handleSort = (idx) => {
    if (sortIndex === idx) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortIndex(null);
        setSortDirection("asc");
      }
    } else {
      setSortIndex(idx);
      setSortDirection("asc");
    }
  };

  const sortedMonthWiseRows = React.useMemo(() => {
    if (sortIndex === null || activeTab !== "month_wise") return monthWiseRows;

    return [...monthWiseRows].sort((a, b) => {
      if (sortIndex === 0) {
        const valA = a[0] || "";
        const valB = b[0] || "";
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      const valA = parseSortValue(a[sortIndex]);
      const valB = parseSortValue(b[sortIndex]);
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [monthWiseRows, sortIndex, sortDirection, activeTab]);

  const sortedSummaryRows = React.useMemo(() => {
    if (sortIndex === null || activeTab !== "orders_summary") return purchaseOrdersSummaryRows;

    return [...purchaseOrdersSummaryRows].sort((a, b) => {
      const getProp = (obj, idx) => {
        if (idx === 0) return "";
        if (idx === 1) return obj.supplier;
        if (idx === 2) return obj.poNo;
        if (idx === 3) return obj.poDate;
        if (idx === 4) return obj.code;
        if (idx === 5) return obj.name;
        if (idx === 6) return obj.qty;
        if (idx === 7) return obj.rate;
        if (idx === 8) return obj.value;
        return "";
      };
      const valA = parseSortValue(getProp(a, sortIndex));
      const valB = parseSortValue(getProp(b, sortIndex));
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [purchaseOrdersSummaryRows, sortIndex, sortDirection, activeTab]);

  const monthWiseTableMinWidth = React.useMemo(
    () => Math.max(720, 220 + Math.max(columns1.length - 1, 1) * 108),
    [columns1.length]
  );

  const pvThBase = {
    position: "sticky",
    top: 0,
    zIndex: 10,
    cursor: "pointer",
    userSelect: "none",
    padding: "12px 16px",
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    verticalAlign: "top",
  };

  const pvWrapCell = {
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    verticalAlign: "top",
  };

  const pvNoWrapCell = {
    whiteSpace: "nowrap",
    verticalAlign: "top",
  };

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both", display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--pp1-border, #e2e8f0)", gap: "16px", marginBottom: "12px", paddingLeft: "16px", flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => setActiveTab("month_wise")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "month_wise" ? "2px solid var(--pp1-blue)" : "2px solid transparent",
            color: activeTab === "month_wise" ? "var(--pp1-blue)" : "var(--pp1-text-secondary, #64748b)",
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
            borderBottom: activeTab === "orders_summary" ? "2px solid var(--pp1-blue)" : "2px solid transparent",
            color: activeTab === "orders_summary" ? "var(--pp1-blue)" : "var(--pp1-text-secondary, #64748b)",
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
      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "4px", width: "100%", flex: "1 1 auto", minHeight: 0 }}>
        {activeTab === "month_wise" ? (
          <table className="pp1-cc-tbl" style={{ minWidth: monthWiseTableMinWidth, width: "100%" }}>
            <thead>
              <tr>
                {columns1.map((col, idx) => {
                  const isRightAligned = idx > 0;
                  const isSorted = sortIndex === idx;

                  return (
                    <th
                      key={idx}
                      onClick={() => handleSort(idx)}
                      style={{
                        ...pvThBase,
                        textAlign: isRightAligned ? "right" : "left",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", justifyContent: isRightAligned ? "flex-end" : "flex-start", gap: "5px", width: "100%" }}>
                        <span style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{col}</span>
                        <SortIcon active={isSorted} direction={sortDirection} />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedMonthWiseRows.length === 0 ? (
                <tr><td colSpan={columns1.length} className="pp1-cc-tbl__empty">No data available.</td></tr>
              ) : (
                sortedMonthWiseRows.map((row, ri) => (
                  <tr key={ri} className="pp1-cc-tbl__tr">
                    <td className="pp1-cc-tbl__bold" style={{ ...pvWrapCell, fontWeight: 600 }}>{row[0]}</td>
                    {row.slice(1).map((val, vi, arr) => (
                      <td
                        key={vi}
                        style={{
                          ...pvWrapCell,
                          textAlign: "right",
                          fontWeight: vi === arr.length - 1 ? 700 : 500,
                          color: vi === arr.length - 1 ? "var(--pp1-blue)" : undefined,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        ₹{Number(val || 0).toFixed(2)} L
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="pp1-cc-tbl" style={{ minWidth: 1200, width: "100%" }}>
            <thead>
              <tr>
                {columns2.map((col, idx) => {
                  const isRightAligned = idx > 5;
                  const isSorted = sortIndex === idx;
                  const isSlNo = idx === 0;

                  return (
                    <th
                      key={idx}
                      onClick={() => !isSlNo && handleSort(idx)}
                      style={{
                        ...pvThBase,
                        ...(idx === 2 || idx === 3 ? pvNoWrapCell : {}),
                        textAlign: isRightAligned ? "right" : "left",
                        cursor: isSlNo ? "default" : "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", justifyContent: isRightAligned ? "flex-end" : "flex-start", gap: "5px", width: "100%" }}>
                        <span style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{col}</span>
                        {!isSlNo && <SortIcon active={isSorted} direction={sortDirection} />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedSummaryRows.length === 0 ? (
                <tr><td colSpan={columns2.length} className="pp1-cc-tbl__empty">No data available.</td></tr>
              ) : (
                sortedSummaryRows.map((row, ri) => (
                  <tr key={ri} className="pp1-cc-tbl__tr">
                    <td style={pvWrapCell}>{ri + 1}</td>
                    <td className="pp1-cc-tbl__bold" style={{ ...pvWrapCell, fontWeight: 600 }}>{row.supplier}</td>
                    <td style={pvNoWrapCell} className="pp1-cc-tbl__id">
                      <span style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                        {row.poNo}
                      </span>
                    </td>
                    <td style={pvNoWrapCell}>{row.poDate}</td>
                    <td className="pp1-cc-tbl__mono" style={{ ...pvWrapCell, fontWeight: 600, color: "var(--pp1-text-primary, #334155)" }}>{row.code}</td>
                    <td style={pvWrapCell}>{row.name}</td>
                    <td style={{ ...pvWrapCell, textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{row.qty}</td>
                    <td style={{ ...pvWrapCell, textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{row.rate}</td>
                    <td style={{ ...pvWrapCell, textAlign: "right", fontWeight: 700, color: "#10b981", fontVariantNumeric: "tabular-nums" }}>{row.value}</td>
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
    if (filters.customer) {
      const selectedCusts = filters.customer.split(",").map(c => c.trim()).filter(Boolean);
      if (selectedCusts.length > 0 && !selectedCusts.includes(r.customer)) {
        return false;
      }
    }
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
  const [chartType, setChartType] = React.useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
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
      return createPp1Chart(canvas, {
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
      return createPp1Chart(canvas, {
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

    return createPp1Chart(canvas, {
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
    <PremiumDashboardView title="Sales Analysis" icon={TrendingUp} color="#10b981" kpis={kpis} setupChart={setupChart} rangeHint="Month Wise Total Sales" onClose={onClose} rebuildToken={chartRebuildToken} noData={filteredRows.length === 0}>
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
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Customer</label>
          <Pp1SearchableMultiSelect
            value={filters.customer}
            options={customers}
            onChange={val => handleInputChange("customer", val)}
            placeholder="Search customer..."
            allLabel="All Customers"
            searchPlaceholder="Search customer..."
          />
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
  const [sortField, setSortField] = React.useState("date"); // Default sorting by Date
  const [sortDirection, setSortDirection] = React.useState("asc");

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

  const sortedInvoiceRows = React.useMemo(() => {
    const rawRows = filteredRows.map((r) => ({
      customer: r.customer || "—",
      invoiceNo: r.invoiceNo || "—",
      date: r.date || "—",
      salesValue: Number(r.salesValue || 0)
    }));

    return rawRows.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (sortField === "salesValue") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      // String comparison for customer, invoiceNo, date
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      if (strA < strB) return sortDirection === "asc" ? -1 : 1;
      if (strA > strB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortField, sortDirection]);

  const invoiceHeaders = [
    { label: "Sl.No", field: null, align: "left" },
    { label: "Customer Name", field: "customer", align: "left" },
    { label: "Invoice No", field: "invoiceNo", align: "left" },
    { label: "Invoice Date", field: "date", align: "left" },
    { label: "Value", field: "salesValue", align: "right" }
  ];

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

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
            Invoice Register
          </button>
        </div>
      </div>

      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        {activeTab === "turnover" ? (
          <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
            <thead>
              <tr>
                {columnsTurnover.map((col, idx) => (
                  <th key={idx} style={{ textAlign: idx > 0 ? "right" : "left", position: "sticky", top: 0, zIndex: 3 }}>{col}</th>
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
              <tr>
                {invoiceHeaders.map((h, idx) => {
                  const isSortable = h.field !== null;
                  const isActive = sortField === h.field;
                  return (
                    <th
                      key={idx}
                      onClick={() => isSortable && handleSort(h.field)}
                      style={{
                        textAlign: h.align,
                        cursor: isSortable ? "pointer" : "default",
                        userSelect: "none",
                        position: "sticky",
                        top: 0,
                        zIndex: 3,
                        transition: "color 0.15s ease"
                      }}
                      className={isSortable ? "pp1-tbl-th-sortable" : ""}
                    >
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        justifyContent: h.align === "right" ? "flex-end" : "flex-start",
                        width: "100%"
                      }}>
                        <span>{h.label}</span>
                        {isSortable && (
                          <span style={{
                            display: "inline-flex",
                            fontSize: "8px",
                            color: isActive ? "#a5b4fc" : "rgba(255,255,255,0.2)",
                            transition: "all 0.15s ease",
                            transform: isActive && sortDirection === "desc" ? "rotate(180deg)" : "none"
                          }}>
                            ▲
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedInvoiceRows.length === 0 ? (
                <tr><td colSpan={invoiceHeaders.length} className="pp1-cc-tbl__empty">No data available.</td></tr>
              ) : (
                sortedInvoiceRows.map((row, ri) => (
                  <tr
                    key={`${row.invoiceNo}-${ri}`}
                    className="pp1-cc-tbl__tr pp1-table-row-animate"
                    style={{ animationDelay: `${Math.min(ri, 20) * 40}ms` }}
                  >
                    {/* SL.No — muted slate number chip */}
                    <td style={{ padding: "10px 16px", width: "52px", textAlign: "center" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: "24px", height: "24px", borderRadius: "6px",
                        background: "#f1f5f9",
                        color: "#64748b", fontWeight: 700, fontSize: "10px",
                        border: "1px solid #e2e8f0"
                      }}>{ri + 1}</span>
                    </td>
                    {/* Customer Name — primary text */}
                    <td style={{ padding: "10px 16px", fontWeight: 600, fontSize: "12.5px", color: "#0f172a", letterSpacing: "-0.1px" }}>
                      {row.customer}
                    </td>
                    {/* Invoice No — matching blue gradient badge */}
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{
                        display: "inline-block",
                        background: "linear-gradient(135deg, #2563eb 0%, #1a54d4 55%, #1448b8 100%)",
                        color: "#ffffff",
                        fontWeight: 700, fontSize: "11px",
                        letterSpacing: "0.8px",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        fontFamily: "'Courier New', 'Fira Code', monospace",
                        boxShadow: "0 2px 6px rgba(26, 84, 212, 0.3)",
                        whiteSpace: "nowrap"
                      }}>{row.invoiceNo}</span>
                    </td>
                    {/* Invoice Date — calendar icon + indigo soft pill */}
                    <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "5px",
                        fontSize: "11.5px", fontWeight: 500, color: "#475569",
                        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
                      }}>
                        <Calendar size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
                        {row.date}
                      </span>
                    </td>
                    {/* Value — emerald right-aligned amount */}
                    <td style={{ padding: "10px 16px", textAlign: "right" }}>
                      <span style={{
                        display: "inline-block",
                        fontWeight: 700, fontSize: "12.5px",
                        color: "#059669",
                        letterSpacing: "-0.2px",
                        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
                      }}>
                        ₹{row.salesValue > 0 ? Number(row.salesValue).toFixed(2) : "0.00"} L
                      </span>
                    </td>
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

function ProductionAnalysisReportDashboardView({ data, loading, filters, onFilterChange, xAxisGroup, setXAxisGroup, onClose, targetConfig, uid, onProdValueData, defaultFrom, defaultTo }) {
  const [prodValueLive, setProdValueLive] = React.useState(null);
  const [prodValueLoading, setProdValueLoading] = React.useState(false);
  const prodValueSource = prodValueLive;

  const [teamOpen, setTeamOpen] = React.useState(false);
  const [machineOpen, setMachineOpen] = React.useState(false);
  const [operatorOpen, setOperatorOpen] = React.useState(false);

  const teamRef = React.useRef(null);
  const machineRef = React.useRef(null);
  const operatorRef = React.useRef(null);
  const [chartType, setChartType] = React.useState("combo");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);
  const chartTypeRef = React.useRef(null);

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
      team: "",
      machine: "",
      operator: "",
      customer: ""
    });
    setChartType("combo");
  };

  React.useEffect(() => {
    const ctrl = new AbortController();
    setProdValueLoading(true);
    const activeFrom = (filters?.fromDate || defaultFrom || "").slice(0, 10);
    const activeTo = (filters?.toDate || defaultTo || "").slice(0, 10);
    const fy = currentFinancialYearRange();
    const fromArg = activeFrom || formatLocalYmd(fy.from);
    const toArg = activeTo || formatLocalYmd(fy.to);
    fetch(buildProdValueUrl(fromArg, toArg, filters?.machine), {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok || json?.error) throw new Error(json?.error || "Production Value load failed");
        setProdValueLive(json);
        onProdValueData?.(json);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        const empty = { machineRows: [], detailRows: [], rows: [], filterOptions: {} };
        setProdValueLive(empty);
        onProdValueData?.(empty);
      })
      .finally(() => setProdValueLoading(false));
    return () => ctrl.abort();
  }, [uid, onProdValueData, filters?.machine, filters?.fromDate, filters?.toDate, defaultFrom, defaultTo]);

  const defaultRange = React.useMemo(() => ({
    from: defaultFrom || filters?.fromDate || "",
    to: defaultTo || filters?.toDate || "",
  }), [defaultFrom, defaultTo, filters?.fromDate, filters?.toDate]);

  const detailRows = React.useMemo(
    () => (Array.isArray(prodValueSource?.detailRows) ? prodValueSource.detailRows : []),
    [prodValueSource?.detailRows]
  );

  const machineRows = React.useMemo(
    () => (Array.isArray(prodValueSource?.machineRows) ? prodValueSource.machineRows : (prodValueSource?.rows || [])),
    [prodValueSource?.machineRows, prodValueSource?.rows]
  );

  const filteredDetail = React.useMemo(() => {
    const activeFrom = filters?.fromDate || defaultRange.from;
    const activeTo = filters?.toDate || defaultRange.to;
    return filterProdValueDetailRows(detailRows, filters, activeFrom, activeTo);
  }, [detailRows, filters, defaultRange]);

  const filteredMachineRows = React.useMemo(() => {
    let list = machineRows;
    if (filters?.team) {
      const teamMacs = new Set(
        filteredDetail.filter((r) => r.team === filters.team).map((r) => r.machine)
      );
      if (teamMacs.size) list = list.filter((r) => teamMacs.has(r.machine));
    }
    if (filters?.machine) {
      const selectedMachines = filters.machine.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      if (selectedMachines.length > 0) {
        list = list.filter((r) => 
          selectedMachines.includes(String(r.machine || "").toLowerCase()) ||
          selectedMachines.includes(String(r.machineName || "").toLowerCase())
        );
      }
    }
    if (filters?.operator) {
      const selectedOperators = filters.operator.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      if (selectedOperators.length > 0) {
        const opMacs = new Set(
          filteredDetail.filter((r) =>
            selectedOperators.some(sel => String(r.operator || "").toLowerCase().includes(sel))
          ).map((r) => r.machine)
        );
        if (opMacs.size) list = list.filter((r) => opMacs.has(r.machine));
      }
    }
    return list;
  }, [machineRows, filteredDetail, filters]);

  // Aggregate combination chart data dynamically based on selection and filters
  const chartData = React.useMemo(() => {
    let aggregated = {};
    if (xAxisGroup === "Machine") {
      filteredMachineRows.forEach((r) => {
        const key = r.machine || "—";
        if (!aggregated[key]) aggregated[key] = { rateSum: 0, rateCount: 0, prodSum: 0, actualSum: 0 };
        aggregated[key].rateSum += Number(r.ratePerHr || 0);
        aggregated[key].rateCount += 1;
        aggregated[key].prodSum += Number(r.productionValue || 0);
        aggregated[key].actualSum += Number(r.actualValue || 0);
      });
    } else if (xAxisGroup === "Operator") {
      aggregated = aggregateProdValueByField(filteredDetail, "operator");
      Object.keys(aggregated).forEach((k) => {
        aggregated[k].prodSum = aggregated[k].productionValue;
        aggregated[k].actualSum = aggregated[k].actualValue;
      });
    } else {
      aggregated = aggregateProdValueByField(filteredDetail, "team");
      Object.keys(aggregated).forEach((k) => {
        aggregated[k].prodSum = aggregated[k].productionValue;
        aggregated[k].actualSum = aggregated[k].actualValue;
      });
    }

    const labels = Object.keys(aggregated);
    const values = labels.map((l) => aggregated[l].prodSum || aggregated[l].productionValue || 0);
    const actuals = labels.map((l) => aggregated[l].actualSum || aggregated[l].actualValue || 0);

    return { labels, values, actuals };
  }, [filteredMachineRows, filteredDetail, xAxisGroup]);

  const chartBusy = loading || prodValueLoading;
  const hasChartData = chartData.labels.length > 0;
  const hasRows = filteredMachineRows.length > 0 || filteredDetail.length > 0;

  // Dynamically calculate KPIs
  const kpis = React.useMemo(() => {
    if (chartBusy && !hasRows) {
      return [
        { label: "Total Production Value", value: "…", icon: IndianRupee, color: "#8b5cf6" },
        { label: "Best Machine", value: "…", icon: Cpu, color: "#3b82f6" },
        { label: "Highest Profit", value: "…", icon: TrendingUp, color: "#10b981" },
        { label: "Average Profit Ratio", value: "…", icon: Zap, color: "#f97316" },
        { label: "Highest Profitability", value: "…", icon: Trophy, color: "#ec4899" }
      ];
    }
    if (!hasRows) {
      return [
        { label: "Total Production Value", value: "—", icon: IndianRupee, color: "#8b5cf6" },
        { label: "Best Machine", value: "—", icon: Cpu, color: "#3b82f6" },
        { label: "Highest Profit", value: "—", icon: TrendingUp, color: "#10b981" },
        { label: "Average Profit Ratio", value: "—", icon: Zap, color: "#f97316" },
        { label: "Highest Profitability", value: "—", icon: Trophy, color: "#ec4899" }
      ];
    }

    const totalProd = filteredMachineRows.reduce((acc, r) => acc + Number(r.productionValue || 0), 0);
    const totalActual = filteredMachineRows.reduce((acc, r) => acc + Number(r.actualValue || 0), 0);

    let bestMach = "—";
    let maxActual = 0;
    filteredMachineRows.forEach((r) => {
      const av = Number(r.actualValue || 0);
      if (av > maxActual) {
        maxActual = av;
        bestMach = r.machine || "—";
      }
    });

    let bestMachProf = "—";
    let maxProfRatio = 0;
    filteredMachineRows.forEach((r) => {
      const ratio = Number(r.actualPct || 0);
      if (ratio > maxProfRatio) {
        maxProfRatio = ratio;
        bestMachProf = `${r.machine || "—"} (${ratio.toFixed(1)}%)`;
      }
    });

    const avgProfitRatio = filteredMachineRows.length
      ? filteredMachineRows.reduce((acc, r) => acc + Number(r.actualPct || 0), 0) / filteredMachineRows.length
      : 0;

    return [
      { label: "Total Production Value", value: `₹${(totalProd / 100000).toFixed(2)}L`, icon: IndianRupee, color: "#8b5cf6" },
      { label: "Best Machine", value: bestMach, icon: Cpu, color: "#3b82f6" },
      { label: "Highest Profit", value: `₹${(totalActual / 100000).toFixed(2)}L`, icon: TrendingUp, color: "#10b981" },
      { label: "Average Profit Ratio", value: `${avgProfitRatio.toFixed(1)}%`, icon: Zap, color: "#f97316" },
      { label: "Highest Profitability", value: bestMachProf, icon: Trophy, color: "#ec4899" }
    ];
  }, [filteredMachineRows, chartBusy, hasRows]);

  const setupChart = React.useCallback((canvas) => {
    if (!chartData.labels?.length) return null;
    const ctx = canvas.getContext("2d");
    const targetValLakhs = targetConfig?.production_analysis?.minProductionValue ?? 12.0;
    const targetVal = targetValLakhs * 100000;

    const isRadial = chartType === "radar" || chartType === "polarArea";

    const datasets = [
      {
        type: chartType === "combo" ? "bar" : (chartType === "radar" ? "radar" : (chartType === "line" || chartType === "stepped" || chartType === "area" ? "line" : "bar")),
        label: "Total Production Value",
        data: chartData.values,
        yAxisID: isRadial ? undefined : "yRate",
        backgroundColor: chartType === "area" || chartType === "stepped"
          ? "rgba(139, 92, 246, 0.25)"
          : (isRadial ? "rgba(139, 92, 246, 0.2)" : (ctx) => pp1BarGradient(ctx.chart, [
              { offset: 0, color: "rgba(139, 92, 246, 0.45)" },
              { offset: 1, color: "rgba(139, 92, 246, 0.95)" },
            ])),
        borderColor: "#8b5cf6",
        borderWidth: (chartType === "line" || chartType === "combo" || chartType === "area" || chartType === "stepped") ? 2.5 : 1.5,
        borderRadius: (chartType === "bar" || chartType === "combo") ? 6 : 0,
        fill: chartType === "area" || chartType === "radar" || chartType === "stepped",
        stepped: chartType === "stepped" ? "middle" : false,
        pointRadius: (chartType === "bar" || chartType === "polarArea") ? 0 : 3,
        hoverBackgroundColor: "rgba(139, 92, 246, 1)",
      },
      {
        type: chartType === "combo" ? "line" : (chartType === "radar" ? "radar" : (chartType === "line" || chartType === "stepped" || chartType === "area" ? "line" : "bar")),
        label: "Actual Value",
        data: chartData.actuals,
        yAxisID: isRadial ? undefined : "yValue",
        borderColor: "#10b981",
        backgroundColor: chartType === "area" || chartType === "stepped"
          ? "rgba(16, 185, 129, 0.25)"
          : (isRadial ? "rgba(16, 185, 129, 0.2)" : "#10b981"),
        borderWidth: (chartType === "line" || chartType === "combo" || chartType === "area" || chartType === "stepped") ? 3 : 1.5,
        tension: 0.35,
        fill: chartType === "area" || chartType === "radar" || chartType === "stepped",
        stepped: chartType === "stepped" ? "middle" : false,
        borderRadius: (chartType === "bar" || chartType === "combo") ? 6 : 0,
        pointRadius: (chartType === "bar" || chartType === "polarArea") ? 0 : 4,
        pointHoverRadius: 8,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#10b981",
        pointBorderWidth: 2.5,
      },
      {
        type: chartType === "radar" ? "radar" : (chartType === "bar" || chartType === "combo" ? "bar" : "line"),
        label: "Min Production Target",
        data: (chartData.labels || []).map(() => targetVal),
        yAxisID: isRadial ? undefined : "yValue",
        borderColor: "rgba(239, 68, 68, 0.85)",
        backgroundColor: "transparent",
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0
      }
    ];

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: pp1PremiumLegendTop,
        tooltip: {
          ...pp1PremiumTooltip,
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || "";
              return ` ${label}: ${fmtRupeeCompact(context.raw)}`;
            }
          }
        },
        datalabels: pp1DataLabelsRupee(),
      },
      elements: pp1ChartHoverElements,
      animation: pp1ChartAnimation,
    };

    if (isRadial) {
      chartOptions.scales = {
        r: {
          angleLines: { display: true },
          ticks: {
            font: { size: 8 },
            callback: (v) => fmtRupeeCompact(v)
          }
        }
      };
    } else {
      chartOptions.scales = {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: PP1_FONT, size: 10, weight: "600" },
            color: "#64748b"
          }
        },
        yRate: {
          type: "linear",
          position: "left",
          grace: "10%",
          title: {
            display: true,
            text: "Total Production Value (₹)",
            color: "#8b5cf6",
            font: { family: PP1_FONT, size: 10, weight: "700" }
          },
          ticks: {
            font: { family: PP1_FONT, size: 10 },
            color: "#64748b",
            callback: (v) => fmtRupeeCompact(v)
          },
          grid: { color: "rgba(0, 0, 0, 0.05)" }
        },
        yValue: {
          type: "linear",
          position: "right",
          grace: "10%",
          title: {
            display: true,
            text: "Actual Value (₹)",
            color: "#10b981",
            font: { family: PP1_FONT, size: 10, weight: "700" }
          },
          ticks: {
            font: { family: PP1_FONT, size: 10 },
            color: "#64748b",
            callback: (v) => fmtRupeeCompact(v)
          },
          grid: { drawOnChartArea: false }
        }
      };
    }

    return createPp1Chart(ctx, {
      type: chartType === "radar" ? "radar" : (chartType === "polarArea" ? "polarArea" : "bar"),
      data: {
        labels: chartData.labels,
        datasets: datasets
      },
      options: chartOptions
    });
  }, [chartData, targetConfig, chartType]);

  const teams = React.useMemo(() => {
    const api = prodValueSource?.filterOptions?.teams;
    if (Array.isArray(api) && api.length) return api;
    return Array.from(new Set(detailRows.map((d) => d.team).filter((t) => t && t !== "—"))).sort();
  }, [prodValueSource?.filterOptions?.teams, detailRows]);

  const machines = React.useMemo(() => {
    const api = prodValueSource?.filterOptions?.machines;
    if (Array.isArray(api) && api.length) return api;
    return Array.from(new Set(machineRows.map((d) => d.machine).filter(Boolean))).sort();
  }, [prodValueSource?.filterOptions?.machines, machineRows]);

  const operators = React.useMemo(() => {
    const api = prodValueSource?.filterOptions?.operators;
    if (Array.isArray(api) && api.length) return api;
    return Array.from(new Set(detailRows.map((d) => d.operator).filter((o) => o && o !== "—"))).sort();
  }, [prodValueSource?.filterOptions?.operators, detailRows]);

  const chartHeaderControls = (
    <div className="pp1-chart-xaxis">
      <span className="pp1-chart-xaxis__label">Chart X-Axis:</span>
      {["Machine", "Operator", "Team"].map(g => (
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

  const chartControls = (
    <div className="pp1-dt-card pp1-center-chart">
      <div className="pp1-dt-card__hd pp1-center-chart__hd">
        <div className="pp1-dt-card__title pp1-center-chart__title">Total Production Value vs Actual Value</div>
        {chartHeaderControls}
      </div>
      {!chartBusy && !hasChartData && (
        <Pp1NoDataOverlay />
      )}
      {(chartBusy || hasChartData) && (
        <div className="pp1-dt-chart-wrap pp1-center-chart__wrap" style={{ height: 240, opacity: chartBusy ? 0.5 : 1, transition: "opacity 0.2s" }}>
          {hasChartData && (
            <ChartJsCanvas setup={setupChart} height={240} className="pp1-center-chart__frame" rebuildToken={`${xAxisGroup}-${chartType}-${JSON.stringify(chartData)}`} />
          )}
        </div>
      )}
    </div>
  );

  return (
    <PremiumDashboardView
      title="Production Value Vs Actual Value"
      icon={Factory}
      color="#8b5cf6"
      kpis={kpis}
      setupChart={null}
      chartControls={chartControls}
      rangeHint="Total Production Value vs Actual Value"
      onClose={onClose}
      noData={!chartBusy && !hasChartData}
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
        <div className="pp1-filter-group" style={{ minWidth: "160px" }}>
          <label className="pp1-filter-label">Machine</label>
          <Pp1SearchableMultiSelect
            value={filters.machine}
            options={machines}
            onChange={(val) => handleInputChange("machine", val)}
            placeholder="Select machine..."
            allLabel="All Machines"
            searchPlaceholder="Search machine..."
          />
        </div>

        {/* Operator Dropdown */}
        <div className="pp1-filter-group" style={{ minWidth: "160px" }}>
          <label className="pp1-filter-label">Operator</label>
          <Pp1SearchableMultiSelect
            value={filters.operator}
            options={operators}
            onChange={(val) => handleInputChange("operator", val)}
            placeholder="Select operator..."
            allLabel="All Operators"
            searchPlaceholder="Search operator..."
          />
        </div>

        {/* Chart Type Dropdown Filter */}
        <div className="pp1-filter-group" ref={chartTypeRef}>
          <label className="pp1-filter-label">Chart Type</label>
          <div className="pp1-custom-select-wrap">
            <button
              type="button"
              className={`pp1-custom-select-trigger ${chartTypeOpen ? "open" : ""}`}
              onClick={() => setChartTypeOpen(o => !o)}
              style={{ minWidth: "145px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {chartType === "bar" ? (
                  <BarChart2 size={12} style={{ color: "#8b5cf6" }} />
                ) : chartType === "area" ? (
                  <AreaChart size={12} style={{ color: "#8b5cf6" }} />
                ) : chartType === "radar" ? (
                  <Radar size={12} style={{ color: "#8b5cf6" }} />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} style={{ color: "#8b5cf6" }} />
                ) : chartType === "stepped" ? (
                  <Activity size={12} style={{ color: "#8b5cf6" }} />
                ) : chartType === "combo" ? (
                  <BarChart2 size={12} style={{ color: "#8b5cf6" }} />
                ) : (
                  <TrendingUp size={12} style={{ color: "#8b5cf6" }} />
                )}
                <span>
                  {chartType === "combo" && "Combo Chart"}
                  {chartType === "line" && "Line Chart"}
                  {chartType === "bar" && "Bar Chart"}
                  {chartType === "area" && "Area Chart"}
                  {chartType === "radar" && "Radar Chart"}
                  {chartType === "polarArea" && "Polar Area"}
                  {chartType === "stepped" && "Stepped Chart"}
                </span>
              </div>
              <ChevronDown size={14} className="pp1-select-chevron" />
            </button>

            {chartTypeOpen && (
              <div className="pp1-custom-select-options" style={{ minWidth: "145px" }}>
                {[
                  { id: "combo", label: "Combo Chart", icon: BarChart2 },
                  { id: "line", label: "Line Chart", icon: TrendingUp },
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
                    <opt.icon size={12} style={{ color: chartType === opt.id ? "#fff" : "#8b5cf6" }} />
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

function ProductionAnalysisReportBottomTable({ data, filters, xAxisGroup = "Machine", defaultFrom, defaultTo }) {
  const [activeTab, setActiveTab] = React.useState("rateVsHour"); // "rateVsHour" | "dailyLog"
  const [sortIndex, setSortIndex] = React.useState(null);
  const [sortDirection, setSortDirection] = React.useState("asc");
  const [hoveredHeader, setHoveredHeader] = React.useState(null);

  // Reset sorting state when switching tabs
  React.useEffect(() => {
    setSortIndex(null);
    setSortDirection("asc");
    setHoveredHeader(null);
  }, [activeTab]);

  // Tab 1 columns dynamically based on xAxisGroup
  const columnsRateVsHour = React.useMemo(() => {
    if (xAxisGroup === "Machine") {
      return ["Sl.No", "Month", "Mac No", "Production Value", "Actual Value", "Actual %"];
    } else if (xAxisGroup === "Operator") {
      return ["Sl.No", "Month", "Operator Name", "Production Value", "Actual Value", "Actual %"];
    } else {
      return ["Sl.No", "Month", "Team", "Production Value", "Actual Value", "Actual %"];
    }
  }, [xAxisGroup]);

  // Tab 1 rows dynamically based on xAxisGroup
  const rowsRateVsHour = React.useMemo(() => {
    const groupField = xAxisGroup === "Machine" ? "machine" : xAxisGroup === "Operator" ? "operator" : "team";
    const detailRows = Array.isArray(data?.productionValueCompare?.detailRows) ? data.productionValueCompare.detailRows : [];
    const machineRows = Array.isArray(data?.productionValueCompare?.machineRows)
      ? data.productionValueCompare.machineRows
      : (data?.productionValueCompare?.rows || []);

    const activeFrom = filters?.fromDate || defaultFrom || "";
    const activeTo = filters?.toDate || defaultTo || "";
    const monthRef = activeTo || activeFrom || (detailRows[0]?.date || "");

    let list = filterProdValueDetailRows(detailRows, filters, activeFrom, activeTo);
    const groups = {};

    if (xAxisGroup === "Machine") {
      let macList = machineRows;
      if (filters?.team) {
        const teamMacs = new Set(list.filter((r) => r.team === filters.team).map((r) => r.machine));
        macList = macList.filter((r) => teamMacs.has(r.machine));
      }
      if (filters?.machine) {
        macList = macList.filter((r) => r.machine === filters.machine || r.machineName === filters.machine);
      }
      if (filters?.operator) {
        const opMacs = new Set(
          list.filter((r) =>
            String(r.operator || "").toLowerCase().includes(String(filters.operator).toLowerCase())
          ).map((r) => r.machine)
        );
        macList = macList.filter((r) => opMacs.has(r.machine));
      }
      macList.forEach((r) => {
        const key = r.machine || "—";
        groups[key] = {
          key,
          productionValue: Number(r.productionValue || 0),
          actualValue: Number(r.actualValue || 0),
          actualPct: Number(r.actualPct || 0),
        };
      });
    } else {
      list.forEach((r) => {
        const key = String(r[groupField] || "—").trim() || "—";
        if (!groups[key]) {
          groups[key] = { key, productionValue: 0, actualValue: 0, actualPctNum: 0, actualPctDen: 0 };
        }
        groups[key].productionValue += Number(r.productionValue || 0);
        groups[key].actualValue += Number(r.actualValue || 0);
        groups[key].actualPctDen += Number(r.productionValue || 0);
        groups[key].actualPctNum += Number(r.actualValue || 0);
      });
    }

    return Object.values(groups).map((g, idx) => {
      const prodVal = g.productionValue;
      const actualVal = g.actualValue;
      const actualPct = xAxisGroup === "Machine"
        ? g.actualPct
        : (g.actualPctDen > 0 ? (g.actualPctNum / g.actualPctDen) * 100 : 0);

      return [
        String(idx + 1),
        formatProdValueMonth(monthRef),
        g.key,
        `₹${(prodVal / 100000).toFixed(2)} L`,
        `₹${(actualVal / 100000).toFixed(2)} L`,
        `${Number(actualPct).toFixed(1)}%`
      ];
    });
  }, [data, filters, xAxisGroup, defaultFrom, defaultTo]);

  // Tab 2 columns & rows (Daily Production Log) - original implementation
  const columnsDailyLog = ["Sl.No", "Date", "Team", "Machine", "Operator", "Production Qty", "Production Value", "Actual Value", "Actual Ratio"];

  const rowsDailyLog = React.useMemo(() => {
    const detailRows = Array.isArray(data?.productionValueCompare?.detailRows) ? data.productionValueCompare.detailRows : [];
    const activeFrom = filters?.fromDate || defaultFrom || "";
    const activeTo = filters?.toDate || defaultTo || "";
    const list = filterProdValueDetailRows(detailRows, filters, activeFrom, activeTo);

    return list.map((r, idx) => {
      const dateParts = (r.date || "").slice(0, 10).split("-");
      const displayDate = dateParts.length === 3
        ? `${dateParts[2]}-${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(dateParts[1], 10) - 1] || dateParts[1]}-${dateParts[0]}`
        : (r.date || "—");

      return [
        String(idx + 1),
        displayDate,
        r.team || "—",
        r.machine || "—",
        r.operator || "—",
        "—",
        `₹${fmtNum(r.productionValue)}`,
        `₹${fmtNum(r.actualValue)}`,
        `${Number(r.actualPct || 0).toFixed(1)}%`
      ];
    });
  }, [data, filters, defaultFrom, defaultTo]);

  const handleSort = (idx) => {
    if (sortIndex === idx) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortIndex(null);
        setSortDirection("asc");
      }
    } else {
      setSortIndex(idx);
      setSortDirection("asc");
    }
  };

  const sortedRowsRateVsHour = React.useMemo(() => {
    if (sortIndex === null || activeTab !== "rateVsHour") return rowsRateVsHour;

    const sorted = [...rowsRateVsHour].sort((a, b) => {
      const valA = parseSortValue(a[sortIndex]);
      const valB = parseSortValue(b[sortIndex]);
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted.map((row, idx) => {
      const newRow = [...row];
      newRow[0] = String(idx + 1);
      return newRow;
    });
  }, [rowsRateVsHour, sortIndex, sortDirection, activeTab]);

  const sortedRowsDailyLog = React.useMemo(() => {
    if (sortIndex === null || activeTab !== "dailyLog") return rowsDailyLog;

    const sorted = [...rowsDailyLog].sort((a, b) => {
      const valA = parseSortValue(a[sortIndex]);
      const valB = parseSortValue(b[sortIndex]);
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted.map((row, idx) => {
      const newRow = [...row];
      newRow[0] = String(idx + 1);
      return newRow;
    });
  }, [rowsDailyLog, sortIndex, sortDirection, activeTab]);

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
            Production Value Product Rate vs Actual Value ({xAxisGroup} Wise)
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
                {columnsRateVsHour.map((col, idx) => {
                  const isRightAligned = idx >= 3;
                  const isHovered = hoveredHeader === idx;
                  const isSorted = sortIndex === idx;
                  const isSlNo = idx === 0;

                  return (
                    <th
                      key={idx}
                      onClick={() => !isSlNo && handleSort(idx)}
                      onMouseEnter={() => !isSlNo && setHoveredHeader(idx)}
                      onMouseLeave={() => !isSlNo && setHoveredHeader(null)}
                      style={{
                        position: "sticky",
                        top: 0,
                        backgroundColor: isHovered && !isSlNo ? "#eef3fc" : "rgba(37, 99, 235, 0.05)",
                        zIndex: 10,
                        textAlign: isRightAligned ? "right" : "left",
                        cursor: isSlNo ? "default" : "pointer",
                        userSelect: "none",
                        transition: "background-color 0.2s ease",
                        padding: "12px 16px"
                      }}
                    >
                      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: isRightAligned ? "flex-end" : "flex-start", gap: "5px", width: "100%" }}>
                        <span>{col}</span>
                        {!isSlNo && <SortIcon active={isSorted} direction={sortDirection} />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedRowsRateVsHour.length === 0 ? (
                <tr><td colSpan={columnsRateVsHour.length} className="pp1-cc-tbl__empty">No data available.</td></tr>
              ) : (
                sortedRowsRateVsHour.map((row, ri) => (
                  <tr key={ri} className="pp1-cc-tbl__tr">
                    <td className="pp1-cc-tbl__bold" style={{ fontWeight: 700, padding: "10px 16px" }}>{row[0]}</td>
                    <td style={{ fontWeight: 600, padding: "10px 16px" }}>{row[1]}</td>
                    <td className="pp1-cc-tbl__id" style={{ padding: "10px 16px" }}>{row[2]}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, padding: "10px 16px", color: "var(--pp1-blue)" }}>{row[3]}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, padding: "10px 16px", color: "#059669" }}>{row[4]}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: "rgba(245, 158, 11, 0.12)",
                          color: "#d97706",
                          border: "1px solid rgba(245, 158, 11, 0.2)",
                          fontFamily: "'Inter', sans-serif"
                        }}>
                          {row[5]}
                        </span>
                        <div style={{
                          width: "50px",
                          height: "6px",
                          backgroundColor: "rgba(0, 0, 0, 0.06)",
                          borderRadius: "3px",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            width: row[5],
                            height: "100%",
                            backgroundColor: "#f59e0b",
                            borderRadius: "3px"
                          }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
            <thead>
              <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
                {columnsDailyLog.map((col, idx) => {
                  const isRightAligned = idx >= 5;
                  const isHovered = hoveredHeader === idx;
                  const isSorted = sortIndex === idx;
                  const isSlNo = idx === 0;

                  return (
                    <th
                      key={idx}
                      onClick={() => !isSlNo && handleSort(idx)}
                      onMouseEnter={() => !isSlNo && setHoveredHeader(idx)}
                      onMouseLeave={() => !isSlNo && setHoveredHeader(null)}
                      style={{
                        position: "sticky",
                        top: 0,
                        backgroundColor: isHovered && !isSlNo ? "#eef3fc" : "rgba(37, 99, 235, 0.05)",
                        zIndex: 10,
                        textAlign: isRightAligned ? "right" : "left",
                        cursor: isSlNo ? "default" : "pointer",
                        userSelect: "none",
                        transition: "background-color 0.2s ease",
                        padding: "12px 16px"
                      }}
                    >
                      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: isRightAligned ? "flex-end" : "flex-start", gap: "5px", width: "100%" }}>
                        <span>{col}</span>
                        {!isSlNo && <SortIcon active={isSorted} direction={sortDirection} />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedRowsDailyLog.length === 0 ? (
                <tr><td colSpan={columnsDailyLog.length} className="pp1-cc-tbl__empty">No data available.</td></tr>
              ) : (
                sortedRowsDailyLog.map((row, ri) => (
                  <tr key={ri} className="pp1-cc-tbl__tr">
                    <td className="pp1-cc-tbl__bold" style={{ fontWeight: 700, padding: "10px 16px" }}>{row[0]}</td>
                    <td style={{ fontWeight: 600, padding: "10px 16px" }}>{row[1]}</td>
                    <td style={{ fontWeight: 600, padding: "10px 16px" }}>{row[2]}</td>
                    <td className="pp1-cc-tbl__id" style={{ padding: "10px 16px" }}>{row[3]}</td>
                    <td style={{ fontWeight: 600, padding: "10px 16px" }}>{row[4]}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, padding: "10px 16px" }}>{row[5]}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, padding: "10px 16px" }}>{row[6]}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, padding: "10px 16px" }}>{row[7]}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: "rgba(37, 99, 235, 0.1)",
                          color: "var(--pp1-blue)",
                          border: "1px solid rgba(37, 99, 235, 0.18)",
                          fontFamily: "'Inter', sans-serif"
                        }}>
                          {row[8]}
                        </span>
                        <div style={{
                          width: "50px",
                          height: "6px",
                          backgroundColor: "rgba(0, 0, 0, 0.06)",
                          borderRadius: "3px",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            width: row[8],
                            height: "100%",
                            backgroundColor: "var(--pp1-blue)",
                            borderRadius: "3px"
                          }} />
                        </div>
                      </div>
                    </td>
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

const MOCK_IDLE_LOGS = [];

const MOCK_NON_ACCEPTED_LOSS_LOGS = [];

const formatLossValue = (val) => {
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  }
  return `₹${val.toLocaleString()}`;
};

function IdleHoursReportDashboardView({ filters, onFilterChange, activeTab, onActiveTabChange, onClose, targetConfig }) {
  const [chartType, setChartType] = React.useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);
  const [liveLogs, setLiveLogs] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [filterOptions, setFilterOptions] = React.useState({ machines: [], reasons: [] });
  const chartTypeRef = React.useRef(null);

  const activeChart = activeTab === "chart2" ? 1 : 0;

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (chartTypeRef.current && !chartTypeRef.current.contains(event.target)) {
        setChartTypeOpen(false);
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
    setChartType("bar");
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

  const activeFromStr = React.useMemo(() => {
    const d = pickerFrom;
    if (!d) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [pickerFrom]);

  const activeToStr = React.useMemo(() => {
    const d = pickerTo;
    if (!d) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [pickerTo]);

  React.useEffect(() => {
    if (!activeFromStr || !activeToStr) return;
    setIsLoading(true);
    const params = new URLSearchParams({
      from: activeFromStr,
      to: activeToStr,
      machine: filters.machine || "",
      reason: filters.idleReason || "",
    });
    const ctrl = new AbortController();
    fetch(`/api/idle-time-report/?${params}`, {
      credentials: "include",
      signal: ctrl.signal
    })
      .then(res => res.json())
      .then(json => {
        if (json) {
          if (json.filter_options) {
            setFilterOptions({
              machines: Array.isArray(json.filter_options.machines) ? json.filter_options.machines : [],
              reasons: Array.isArray(json.filter_options.reasons) ? json.filter_options.reasons : [],
              operators: Array.isArray(json.filter_options.operators) ? json.filter_options.operators : [],
            });
          }
          if (Array.isArray(json.rows)) {
            const mapped = json.rows.map(row => ({
              date: row.entry_date ? row.entry_date.slice(0, 10) : "",
              machine: row.mac_no || "",
              operator: row.operator || "",
              reason: row.reason || "",
              shift: row.shift || "",
              duration: Number(row.total_idle_hours_decimal) || 0,
              ratePerHour: Number(row.rate_per_hour) || 500,
            }));
            setLiveLogs(mapped);
          } else {
            setLiveLogs([]);
          }
        } else {
          setLiveLogs([]);
        }
      })
      .catch(() => {
        setLiveLogs([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
    return () => ctrl.abort();
  }, [activeFromStr, activeToStr, filters.machine, filters.idleReason]);

  const filteredLogs = React.useMemo(() => {
    let list = liveLogs;
    if (filters.operator) {
      const opList = filters.operator.split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
      if (opList.length > 0) {
        list = list.filter(r => opList.includes((r.operator || "").toLowerCase()));
      }
    }
    if (filters.machine) {
      const macList = filters.machine.split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
      if (macList.length > 0) {
        list = list.filter(r => macList.includes((r.machine || "").toLowerCase()));
      }
    }
    if (filters.idleReason) {
      const reasonList = filters.idleReason.split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
      if (reasonList.length > 0) {
        list = list.filter(r => reasonList.includes((r.reason || "").toLowerCase()));
      }
    }
    return list;
  }, [liveLogs, filters.operator, filters.machine, filters.idleReason]);

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

    const idleTargetLinePlugin = {
      id: "idleHoursTargetLine",
      afterDraw: (chart) => {
        const yScale = chart.scales.yIdle;
        const xScale = chart.scales.x;
        if (!yScale || !xScale) return;

        const targetIndex = chart.data.datasets.findIndex((ds) => ds.label?.startsWith("Max Idle"));
        if (targetIndex === -1 || !chart.isDatasetVisible(targetIndex)) return;

        const yPos = yScale.getPixelForValue(maxIdleHours);
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

    if (chartType === "radar") {
      return createPp1Chart(ctx, {
        type: "radar",
        data: {
          labels: chart1Data.labels,
          datasets: [
            {
              label: "Idle Hours",
              data: chart1Data.idleHours,
              borderColor: "rgba(59, 130, 246, 1)",
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              borderWidth: 2,
              pointRadius: 3,
              fill: true
            },
            {
              label: "Production Loss (Lakhs)",
              data: chart1Data.loss,
              borderColor: "rgba(239, 68, 68, 1)",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              borderWidth: 2,
              pointRadius: 3,
              fill: true
            },
            {
              label: "Max Idle Hours Target",
              data: chart1Data.labels.map(() => maxIdleHours),
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
            legend: { position: "top", labels: { font: { size: 10, family: "'Inter', sans-serif" }, usePointStyle: true } }
          },
          scales: {
            r: {
              min: 0,
              grid: { circular: true, color: "rgba(0, 0, 0, 0.05)" },
              ticks: { display: true, font: { size: 8 }, backdropColor: "transparent" }
            }
          }
        }
      });
    }

    if (chartType === "polarArea") {
      return createPp1Chart(ctx, {
        type: "polarArea",
        data: {
          labels: chart1Data.labels,
          datasets: [
            {
              label: "Idle Hours",
              data: chart1Data.idleHours,
              backgroundColor: "rgba(59, 130, 246, 0.6)",
              borderColor: "rgba(59, 130, 246, 1)",
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { font: { size: 10, family: "'Inter', sans-serif" }, usePointStyle: true } }
          },
          scales: {
            r: {
              min: 0,
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
    const isCombo = chartType === "combo";

    const getIdleType = () => {
      if (isCombo) return "bar";
      return isBar ? "bar" : "line";
    };

    const getLossType = () => {
      return "line";
    };

    const getFill = () => {
      return isArea || isStepped || isLine;
    };

    const getBgColor = (baseColor) => {
      const type = getIdleType();
      if (type === "bar") {
        return baseColor + "0.75)";
      }
      if (isArea) return baseColor + "0.25)";
      if (isStepped) return baseColor + "0.15)";
      return baseColor + "0.03)";
    };

    return createPp1Chart(ctx, {
      type: getIdleType(),
      plugins: [idleTargetLinePlugin],
      data: {
        labels: chart1Data.labels,
        datasets: [
          {
            type: getIdleType(),
            label: "Idle Hours",
            data: chart1Data.idleHours,
            yAxisID: "yIdle",
            backgroundColor: getBgColor("rgba(59, 130, 246, "),
            borderColor: "#3b82f6",
            borderWidth: getIdleType() === "bar" ? 1.5 : 2.5,
            borderRadius: getIdleType() === "bar" ? 4 : 0,
            fill: getFill(),
            stepped: isStepped ? "middle" : false,
            pointRadius: getIdleType() === "bar" ? 0 : 4,
            tension: isLine || isArea ? 0.25 : 0
          },
          {
            type: getLossType(),
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
            borderWidth: 0,
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
  }, [chart1Data, targetConfig, chartType]);

  const operators = React.useMemo(() => {
    if (filterOptions.operators && filterOptions.operators.length > 0) {
      return filterOptions.operators;
    }
    return ["Balamurugan.P", "Gopikrishnan.R", "Karthi.S", "Senthil.K", "Sankar"];
  }, [filterOptions.operators]);

  const machines = React.useMemo(() => {
    if (filterOptions.machines && filterOptions.machines.length > 0) {
      return filterOptions.machines.filter(m => m !== "All Machines");
    }
    return ["CNC1", "VMC7", "CNC2", "HMC9", "VTL3"];
  }, [filterOptions.machines]);

  const idleReasons = React.useMemo(() => {
    if (filterOptions.reasons && filterOptions.reasons.length > 0) {
      return filterOptions.reasons.filter(r => r !== "All Reasons");
    }
    return ["No Load", "Under Maintenance", "No Operator", "Break Down"];
  }, [filterOptions.reasons]);

  const carouselControls = (
    <div className="pp1-dt-card pp1-center-chart" style={{ marginTop: "10px" }}>
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
      <div className="pp1-dt-chart-wrap pp1-center-chart__wrap" style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {chart1Data.labels.length === 0 ? (
          <Pp1NoDataOverlay />
        ) : (
          <ChartJsCanvas setup={setupChart1} height={220} rebuildToken={`c1-${chartType}-${xAxisGroup}-${JSON.stringify(chart1Data)}`} />
        )}
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
      noData={chart1Data.labels.length === 0}
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
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Machine</label>
          <Pp1SearchableMultiSelect
            value={filters.machine || ""}
            options={machines}
            onChange={(val) => handleInputChange("machine", val)}
            placeholder="Select Machines..."
            allLabel="All Machines"
            searchPlaceholder="Search machine..."
          />
        </div>

        {/* Operator Dropdown */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Operator</label>
          <Pp1SearchableMultiSelect
            value={filters.operator || ""}
            options={operators}
            onChange={(val) => handleInputChange("operator", val)}
            placeholder="Select Operators..."
            allLabel="All Operators"
            searchPlaceholder="Search operator..."
          />
        </div>

        {/* Idle Reason Dropdown */}
        <div className="pp1-filter-group">
          <label className="pp1-filter-label">Idle Reason</label>
          <Pp1SearchableMultiSelect
            value={filters.idleReason || ""}
            options={idleReasons}
            onChange={(val) => handleInputChange("idleReason", val)}
            placeholder="Select Reasons..."
            allLabel="All Reasons"
            searchPlaceholder="Search reason..."
          />
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
                  <BarChart2 size={12} style={{ color: "#ef4444" }} />
                ) : chartType === "area" ? (
                  <AreaChart size={12} style={{ color: "#ef4444" }} />
                ) : chartType === "radar" ? (
                  <Radar size={12} style={{ color: "#ef4444" }} />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} style={{ color: "#ef4444" }} />
                ) : chartType === "stepped" ? (
                  <Activity size={12} style={{ color: "#ef4444" }} />
                ) : chartType === "combo" ? (
                  <TrendingUp size={12} style={{ color: "#ef4444" }} />
                ) : (
                  <LucideLineChart size={12} style={{ color: "#ef4444" }} />
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
                    <opt.icon size={12} style={{ color: chartType === opt.id ? "#fff" : "#ef4444" }} />
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

function IdleHoursReportBottomTable({ filters }) {
  const [sortIndex, setSortIndex] = React.useState(null);
  const [sortDirection, setSortDirection] = React.useState("asc");
  const [hoveredHeader, setHoveredHeader] = React.useState(null);

  const filteredLogs = React.useMemo(() => {
    let list = MOCK_IDLE_LOGS;

    let activeFrom = filters?.fromDate;
    let activeTo = filters?.toDate;
    if (!activeFrom) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      activeFrom = `${year}-${month}-01`;
    }
    if (!activeTo) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      activeTo = `${year}-${month}-${day}`;
    }

    list = list.filter(r => r.date >= activeFrom && r.date <= activeTo);
    if (filters?.operator) list = list.filter(r => r.operator === filters.operator);
    if (filters?.machine) list = list.filter(r => r.machine === filters.machine);
    if (filters?.idleReason) list = list.filter(r => r.reason === filters.idleReason);
    return list;
  }, [filters]);

  // Tab 1 Data
  const columns1 = ["Sl.No", "Date", "Machine Name", "Idle Hour", "Rate Per Hour", "Production Loss (Lakhs)"];
  const rows1 = React.useMemo(() => {
    return filteredLogs.map((r, idx) => [
      String(idx + 1),
      r.date,
      r.machine,
      `${r.duration} h`,
      `₹${r.ratePerHour.toLocaleString()}`,
      `₹${((r.duration * r.ratePerHour) / 100000).toFixed(3)} L`
    ]);
  }, [filteredLogs]);

  const handleSort = (idx) => {
    if (sortIndex === idx) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortIndex(null);
        setSortDirection("asc");
      }
    } else {
      setSortIndex(idx);
      setSortDirection("asc");
    }
  };

  const sortedRows1 = React.useMemo(() => {
    if (sortIndex === null) return rows1;

    const sorted = [...rows1].sort((a, b) => {
      const valA = parseSortValue(a[sortIndex]);
      const valB = parseSortValue(b[sortIndex]);
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    // Re-index serial number to stay sequential
    return sorted.map((row, idx) => {
      const newRow = [...row];
      newRow[0] = String(idx + 1);
      return newRow;
    });
  }, [rows1, sortIndex, sortDirection]);

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
            Idle Hours & Production Loss Value
          </button>
        </div>
      </div>

      <div className="pp1-cc-tbl-wrap" style={{ maxHeight: 300, marginTop: "10px" }}>
        <table className="pp1-cc-tbl" style={{ minWidth: "100%" }}>
          <thead>
            <tr style={{ background: "rgba(37, 99, 235, 0.05)" }}>
              {columns1.map((col, idx) => {
                const isRightAligned = idx > 2 && (
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
                const isHovered = hoveredHeader === idx;
                const isSorted = sortIndex === idx;
                const isSlNo = idx === 0;

                return (
                  <th
                    key={idx}
                    onClick={() => !isSlNo && handleSort(idx)}
                    onMouseEnter={() => !isSlNo && setHoveredHeader(idx)}
                    onMouseLeave={() => !isSlNo && setHoveredHeader(null)}
                    style={{
                      position: "sticky",
                      top: 0,
                      backgroundColor: isHovered && !isSlNo ? "#eef3fc" : "#f2f6fe",
                      zIndex: 10,
                      textAlign: isRightAligned ? "right" : "left",
                      cursor: isSlNo ? "default" : "pointer",
                      userSelect: "none",
                      transition: "background-color 0.2s ease",
                      padding: "12px 16px"
                    }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: isRightAligned ? "flex-end" : "flex-start", gap: "5px", width: "100%" }}>
                      <span>{col}</span>
                      {!isSlNo && <SortIcon active={isSorted} direction={sortDirection} />}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows1.length === 0 ? (
              <tr>
                <td colSpan={columns1.length} className="pp1-cc-tbl__empty">
                  No data available.
                </td>
              </tr>
            ) : (
              sortedRows1.map((row, ri) => (
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
  const [liveLogs, setLiveLogs] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
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

  React.useEffect(() => {
    const today = new Date();
    const defaultFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const defaultTo = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const activeFrom = filters?.fromDate || defaultFrom;
    const activeTo = filters?.toDate || defaultTo;

    setIsLoading(true);
    const params = new URLSearchParams({
      from: activeFrom,
      to: activeTo,
      machine: filters?.machine || "",
      reason: filters?.reason || "",
    });
    const ctrl = new AbortController();
    fetch(`/api/idle-time-report/?${params}`, {
      credentials: "include",
      signal: ctrl.signal
    })
      .then(res => res.json())
      .then(json => {
        if (json && Array.isArray(json.rows)) {
          const mapped = json.rows.map(row => ({
            date: row.entry_date ? row.entry_date.slice(0, 10) : "",
            machine: row.mac_no || "",
            reason: row.reason || "",
            shift: row.shift || "",
            duration: Number(row.total_idle_hours_decimal) || 0,
            ratePerHour: Number(row.rate_per_hour) || 500,
            isAccepted: row.is_accepted ?? true,
          }));
          setLiveLogs(mapped);
        } else {
          setLiveLogs([]);
        }
      })
      .catch(() => {
        setLiveLogs([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
    return () => ctrl.abort();
  }, [filters?.fromDate, filters?.toDate, filters?.machine, filters?.reason]);

  const filteredLogs = React.useMemo(() => {
    let list = liveLogs;
    if (filters?.fromDate) list = list.filter(r => r.date >= filters.fromDate);
    if (filters?.toDate) list = list.filter(r => r.date <= filters.toDate);
    if (filters?.machine) list = list.filter(r => r.machine === filters.machine);
    if (filters?.team) list = list.filter(r => r.team === filters.team);
    if (filters?.reason) list = list.filter(r => r.reason === filters.reason);
    return list;
  }, [liveLogs, filters]);

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
    const defaultReasons = ["No Load", "Under Maintenance", "No Operator", "Break Down"];
    const foundReasons = Array.from(new Set(filteredLogs.map(r => r.reason).filter(Boolean)));
    const reasons = Array.from(new Set([...defaultReasons, ...foundReasons])).sort();

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
    return createPp1Chart(ctx, {
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

  const machines = React.useMemo(() => {
    const set = new Set(liveLogs.map(r => r.machine).filter(Boolean));
    return Array.from(set).sort();
  }, [liveLogs]);

  const nonAcceptedReasons = React.useMemo(() => {
    const set = new Set(liveLogs.map(r => r.reason).filter(Boolean));
    return Array.from(set).sort();
  }, [liveLogs]);

  const teams = ["Team A", "Team B", "Team C", "Team D"];

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
      noData={filteredLogs.length === 0}
      loading={isLoading}
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
                    const isRightAligned = ci > 0 && activeColumns[ci] && (
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
    return createPp1Chart(canvas, {
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
    return createPp1Chart(canvas, {
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
    <div className="pp1-dt-card pp1-center-chart" style={{ marginTop: "10px" }}>
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
      <div className="pp1-dt-chart-wrap pp1-center-chart__wrap" style={{ height: 220 }}>
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
      noData={chart1Data.labels.length === 0}
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

function filterOeeRows(rows, filters, defaultFrom, defaultTo) {
  const source = Array.isArray(rows) ? rows : [];
  const activeFrom = filters.fromDate || defaultFrom;
  const activeTo = filters.toDate || defaultTo;

  return source.filter((r) => {
    const d = (r.date || "").slice(0, 10);
    if (!d || d < activeFrom || d > activeTo) return false;
    if (filters.machineType && String(r.machineType || "") !== String(filters.machineType)) return false;
    if (filters.machine) {
      const selected = filters.machine.split(",").map(m => m.trim()).filter(Boolean);
      if (selected.length > 0 && !selected.includes(String(r.machine || ""))) {
        return false;
      }
    }
    return true;
  });
}

function filterOeeRowsByDateOnly(rows, filters, defaultFrom, defaultTo) {
  return filterOeeRows(
    rows,
    {
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      machineType: "",
      machine: "",
    },
    defaultFrom,
    defaultTo
  );
}

function buildOeeFilterOptions(allRows, filters, defaultFrom, defaultTo) {
  const dateScoped = filterOeeRowsByDateOnly(allRows, filters, defaultFrom, defaultTo);
  const machineTypes = [...new Set(dateScoped.map((r) => r.machineType).filter(Boolean))].sort();

  let typeScoped = dateScoped;
  if (filters.machineType) typeScoped = typeScoped.filter((r) => r.machineType === filters.machineType);

  const machines = [...new Set(typeScoped.map((r) => r.machine).filter(Boolean))].sort();

  return { machineTypes, machines };
}

function buildOeeMachineSummaries(filteredRows, monthLabels) {
  const byKey = {};
  filteredRows.forEach((r) => {
    const key = r.machine;
    if (!byKey[key]) {
      byKey[key] = {
        name: r.machine,
        team: r.team || "—",
        type: r.machineType || "CNC",
        monthlySums: {},
        monthlyCounts: {},
        dailySums: {},
        dailyCounts: {},
      };
    }
    const g = byKey[key];
    const oee = Number(r.overallOee || 0);
    if (r.month) {
      g.monthlySums[r.month] = (g.monthlySums[r.month] || 0) + oee;
      g.monthlyCounts[r.month] = (g.monthlyCounts[r.month] || 0) + 1;
    }
    const d = (r.date || "").slice(0, 10);
    if (d) {
      g.dailySums[d] = (g.dailySums[d] || 0) + oee;
      g.dailyCounts[d] = (g.dailyCounts[d] || 0) + 1;
    }
  });

  const allDates = [...new Set(filteredRows.map((r) => (r.date || "").slice(0, 10)).filter(Boolean))].sort();

  return Object.values(byKey).map((g) => {
    const monthly = monthLabels.map((mo) => {
      const c = g.monthlyCounts[mo] || 0;
      return c ? Math.round(g.monthlySums[mo] / c) : 0;
    });
    const daily = allDates.map((d) => {
      const c = g.dailyCounts[d] || 0;
      return c ? Math.round(g.dailySums[d] / c) : 0;
    });
    const activeDaily = daily.filter((v) => v > 0);
    const activeMonthly = monthly.filter((v) => v > 0);
    const avgVal = activeDaily.length
      ? Math.round(activeDaily.reduce((a, b) => a + b, 0) / activeDaily.length)
      : activeMonthly.length
        ? Math.round(activeMonthly.reduce((a, b) => a + b, 0) / activeMonthly.length)
        : 0;
    return {
      name: g.name,
      team: g.team,
      type: g.type,
      machine: g.name,
      monthly,
      daily,
      dayDates: allDates,
      avgVal,
    };
  });
}

function buildOeeChartData(machineSummaries, xAxisGroup, monthLabels, rawRows) {
  const chartStyle = {
    backgroundColor: "rgba(14, 165, 233, 0.75)",
    borderColor: "#0ea5e9",
    borderWidth: 1.5,
    borderRadius: 5,
  };

  let summaries = machineSummaries;
  if (!summaries.length && Array.isArray(rawRows) && rawRows.length) {
    summaries = buildOeeMachineSummaries(rawRows, monthLabels);
  }

  if (!summaries.length) {
    return { labels: [], datasets: [] };
  }

  let labels = [];
  let avgData = [];

  if (xAxisGroup === "Overall" || xAxisGroup === "Month Wise") {
    labels = monthLabels;
    avgData = monthLabels.map((_, idx) => {
      let sum = 0;
      let count = 0;
      summaries.forEach((m) => {
        const v = m.monthly[idx];
        if (v > 0) {
          sum += v;
          count += 1;
        }
      });
      return count ? Math.min(100, Math.max(0, Math.round(sum / count))) : 0;
    });
  } else if (xAxisGroup === "Day Wise") {
    const dayDates = summaries[0]?.dayDates || [];
    labels = dayDates.length
      ? dayDates.map((d) => {
        const p = d.split("-");
        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(-2)}` : d;
      })
      : [];
    avgData = dayDates.map((_, idx) => {
      let sum = 0;
      let count = 0;
      summaries.forEach((m) => {
        const v = m.daily[idx];
        if (v > 0) {
          sum += v;
          count += 1;
        }
      });
      return count ? Math.min(100, Math.max(0, Math.round(sum / count))) : 0;
    });
  } else if (xAxisGroup === "Mac Wise") {
    labels = summaries.map((m) => m.name).sort();
    avgData = labels.map((name) => {
      const row = summaries.find((m) => m.name === name);
      return row ? Math.min(100, Math.max(0, row.avgVal)) : 0;
    });
  } else if (xAxisGroup === "Team Wise") {
    const teamMap = {};
    summaries.forEach((m) => {
      const team = m.team || "—";
      if (!teamMap[team]) teamMap[team] = [];
      teamMap[team].push(m.avgVal);
    });
    labels = Object.keys(teamMap).sort();
    avgData = labels.map((t) => {
      const vals = teamMap[t];
      return Math.min(100, Math.max(0, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)));
    });
  }

  return {
    labels,
    datasets: avgData.length
      ? [{ label: "Overall OEE %", data: avgData, ...chartStyle }]
      : [],
  };
}

function OeeComparisonReportDashboardView({ data, loading, filters, onFilterChange, activeTab, onActiveTabChange, onClose, targetConfig, xAxisGroup, setXAxisGroup, uid, onOeeData }) {
  const [machineTypeOpen, setMachineTypeOpen] = React.useState(false);
  const [oeeLive, setOeeLive] = React.useState(null);
  const [oeeLoading, setOeeLoading] = React.useState(false);
  const [chartType, setChartType] = React.useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);

  const oeeSource = oeeLive || data?.oeeCompare;

  const machineTypeRef = React.useRef(null);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (machineTypeRef.current && !machineTypeRef.current.contains(event.target)) {
        setMachineTypeOpen(false);
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
    onFilterChange(prev => {
      const next = { ...prev, [field]: val };
      if (field === "machineType") {
        next.machine = "";
      }
      return next;
    });
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
    setChartType("bar");
    setChartTypeOpen(false);
  };

  React.useEffect(() => {
    const ctrl = new AbortController();
    setOeeLoading(true);
    const fy = currentFinancialYearRange();
    fetch(buildOeeUrl(fy.from, fy.to, filters), {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok || json?.error) {
          throw new Error(json?.error || "OEE load failed");
        }
        setOeeLive(json);
        onOeeData?.(json);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setOeeLive(null);
        onOeeData?.(data?.oeeCompare || null);
      })
      .finally(() => setOeeLoading(false));
    return () => ctrl.abort();
  }, [filters.machineType, uid, onOeeData, data?.oeeCompare]);

  const oeeRows = React.useMemo(
    () => (Array.isArray(oeeSource?.rows) ? oeeSource.rows : []),
    [oeeSource?.rows]
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
    () => filterOeeRows(oeeRows, filters, defaultRange.from, defaultRange.to),
    [oeeRows, filters, defaultRange]
  );

  const oeeFilterOptions = React.useMemo(
    () => buildOeeFilterOptions(oeeRows, filters, defaultRange.from, defaultRange.to),
    [oeeRows, filters, defaultRange]
  );

  const monthLabels = React.useMemo(
    () => buildEffMonthLabelsForDisplay(oeeRows, filters, defaultRange.from, defaultRange.to),
    [oeeRows, filters, defaultRange]
  );

  const machineSummaries = React.useMemo(
    () => buildOeeMachineSummaries(filteredRows, monthLabels),
    [filteredRows, monthLabels]
  );

  const chart1Data = React.useMemo(
    () => buildOeeChartData(machineSummaries, xAxisGroup, monthLabels, filteredRows),
    [machineSummaries, xAxisGroup, monthLabels, filteredRows]
  );

  const computedKpis = React.useMemo(() => {
    const apiKpis = oeeSource?.kpis;
    const targetVal = targetConfig?.oee_comparison?.monthWiseTarget
      ?? targetConfig?.oee_comparison?.minUtilization
      ?? 75;

    if (!filteredRows.length) {
      if (apiKpis && apiKpis.rowCount > 0 && !filters?.machineType && !filters?.machine && !filters?.fromDate && !filters?.toDate) {
        return [
          { label: "Avg OEE", value: `${Math.round(Number(apiKpis.avgOee || 0))}%`, color: "#0ea5e9", icon: TrendingUp },
          { label: "Availability", value: `${Math.round(Number(apiKpis.avgAvailability || 0))}%`, color: "#3b82f6", icon: Activity },
          { label: "Performance", value: `${Math.round(Number(apiKpis.avgPerformance || 0))}%`, color: "#10b981", icon: Zap },
          { label: "Quality", value: `${Math.round(Number(apiKpis.avgQuality || 0))}%`, color: "#f59e0b", icon: Target },
        ];
      }
      return [
        { label: "Avg OEE", value: loading || oeeLoading ? "…" : "0%", color: "#0ea5e9", icon: TrendingUp },
        { label: "Availability", value: "0%", color: "#3b82f6", icon: Activity },
        { label: "Performance", value: "0%", color: "#10b981", icon: Zap },
        { label: "Quality", value: "0%", color: "#f59e0b", icon: Target },
      ];
    }

    const n = filteredRows.length;
    const avgOee = Math.round(filteredRows.reduce((acc, r) => acc + Number(r.overallOee || 0), 0) / n);
    const avgAvail = Math.round(filteredRows.reduce((acc, r) => acc + Number(r.availability || 0), 0) / n);
    const avgPerf = Math.round(filteredRows.reduce((acc, r) => acc + Number(r.performance || 0), 0) / n);
    const avgQual = Math.round(filteredRows.reduce((acc, r) => acc + Number(r.quality || 0), 0) / n);
    const metPct = avgOee >= targetVal ? 100 : 0;

    return [
      { label: "Avg OEE", value: `${avgOee}%`, color: "#0ea5e9", icon: TrendingUp },
      { label: "Availability", value: `${avgAvail}%`, color: "#3b82f6", icon: Activity },
      { label: "Performance", value: `${avgPerf}%`, color: "#10b981", icon: Zap },
      { label: "Target Status", value: `${metPct}% Met`, color: "#f59e0b", icon: Target },
    ];
  }, [filteredRows, oeeSource?.kpis, filters, loading, oeeLoading, targetConfig]);

  const setupChart1 = React.useCallback((canvas) => {
    let minUtilization = 75;
    if (xAxisGroup === "Overall" || xAxisGroup === "Month Wise") {
      minUtilization = targetConfig?.oee_comparison?.monthWiseTarget ?? targetConfig?.oee_comparison?.minUtilization ?? 75;
    } else if (xAxisGroup === "Day Wise") {
      minUtilization = targetConfig?.oee_comparison?.dayWiseTarget ?? targetConfig?.oee_comparison?.minUtilization ?? 75;
    } else if (xAxisGroup === "Mac Wise") {
      minUtilization = targetConfig?.oee_comparison?.macWiseTarget ?? targetConfig?.oee_comparison?.minUtilization ?? 75;
    } else if (xAxisGroup === "Team Wise") {
      minUtilization = targetConfig?.oee_comparison?.teamWiseTarget ?? targetConfig?.oee_comparison?.minUtilization ?? 75;
    }

    const isLine = chartType === "line";
    const isBar = chartType === "bar";
    const isArea = chartType === "area";
    const isStepped = chartType === "stepped";
    const isCombo = chartType === "combo";

    if (chartType === "radar") {
      const datasets = [
        ...(chart1Data.datasets || []).map(ds => ({
          ...ds,
          type: "radar",
          backgroundColor: "rgba(14, 165, 233, 0.15)",
          borderColor: "#0ea5e9",
          borderWidth: 2,
          pointRadius: 3,
          fill: true
        })),
        {
          type: "radar",
          label: "Min Utilization Target",
          data: (chart1Data.labels || []).map(() => minUtilization),
          borderColor: "rgba(239, 68, 68, 0.85)",
          borderDash: [5, 5],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false
        }
      ];

      return createPp1Chart(canvas, {
        type: "radar",
        data: {
          labels: chart1Data.labels,
          datasets
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
            r: {
              min: 0,
              max: 100,
              angleLines: { display: true, color: "rgba(14, 165, 233, 0.08)" },
              grid: { circular: true, color: "rgba(14, 165, 233, 0.06)" },
              pointLabels: { font: { family: PP1_FONT, size: 9, weight: "600" }, color: "#64748b" },
              ticks: { display: true, font: { family: PP1_FONT, size: 8 }, backdropColor: "transparent", callback: (v) => `${v}%` }
            }
          }
        }
      });
    }

    if (chartType === "polarArea") {
      const datasets = [
        {
          label: "Overall OEE %",
          data: (chart1Data.datasets?.[0]?.data || []),
          backgroundColor: (chart1Data.labels || []).map((_, i) => {
            const colors = [
              "rgba(14, 165, 233, 0.6)",
              "rgba(59, 130, 246, 0.6)",
              "rgba(16, 185, 129, 0.6)",
              "rgba(245, 158, 11, 0.6)",
              "rgba(139, 92, 246, 0.6)",
              "rgba(236, 72, 153, 0.6)"
            ];
            return colors[i % colors.length];
          }),
          borderColor: "#ffffff",
          borderWidth: 1
        }
      ];

      return createPp1Chart(canvas, {
        type: "polarArea",
        data: {
          labels: chart1Data.labels,
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "right",
              labels: { font: { size: 10, family: "'Inter', sans-serif" }, boxWidth: 10 }
            }
          },
          scales: {
            r: {
              min: 0,
              max: 100,
              grid: { circular: true, color: "rgba(0, 0, 0, 0.05)" },
              ticks: { display: true, font: { family: PP1_FONT, size: 8 }, backdropColor: "transparent", callback: (v) => `${v}%` }
            }
          }
        }
      });
    }

    const getOeeType = () => {
      if (isCombo) return "bar";
      return isBar ? "bar" : "line";
    };

    const getFill = () => {
      return isArea || isStepped || isLine;
    };

    const getBgColor = (baseColor) => {
      const type = getOeeType();
      if (type === "bar") {
        return baseColor + "0.75)";
      }
      if (isArea) return baseColor + "0.25)";
      if (isStepped) return baseColor + "0.15)";
      return baseColor + "0.03)";
    };

    const datasetsWithTarget = [
      ...(chart1Data.datasets || []).map(ds => ({
        ...ds,
        type: getOeeType(),
        backgroundColor: getBgColor("rgba(14, 165, 233, "),
        borderColor: "#0ea5e9",
        borderWidth: getOeeType() === "bar" ? 1.5 : 2.5,
        borderRadius: getOeeType() === "bar" ? 5 : 0,
        fill: getFill(),
        stepped: isStepped ? "middle" : false,
        pointRadius: getOeeType() === "bar" ? 0 : 4,
        tension: isLine || isArea ? 0.25 : 0
      })),
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

    return createPp1Chart(canvas, {
      type: getOeeType(),
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
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 10, family: PP1_FONT, weight: "600" },
              color: "#475569",
              maxRotation: (chart1Data.labels?.length || 0) > 8 ? 40 : 0,
              minRotation: (chart1Data.labels?.length || 0) > 8 ? 32 : 0,
              autoSkip: (chart1Data.labels?.length || 0) > 14,
              autoSkipPadding: 10,
              padding: 8,
            },
          },
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

  const carouselControls = (
    <div className="pp1-dt-card pp1-center-chart" style={{ marginTop: "10px" }}>
      <div className="pp1-chart-toolbar">
        <div className="pp1-chart-toolbar__title">
          {(xAxisGroup === "Overall" || xAxisGroup === "Month Wise") && "Overall Month Wise OEE %"}
          {xAxisGroup === "Day Wise" && "Day Wise Overall OEE %"}
          {xAxisGroup === "Mac Wise" && "Machine Wise Overall OEE %"}
          {xAxisGroup === "Team Wise" && "Team Wise Overall OEE %"}
        </div>
        <div className="pp1-chart-xaxis">
          <span className="pp1-chart-xaxis__label">Chart X-Axis:</span>
          {["Overall", "Day Wise", "Mac Wise", "Team Wise"].map(g => (
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
      <div className="pp1-dt-chart-wrap pp1-center-chart__wrap" style={{ height: 248 }}>
        <ChartJsCanvas setup={setupChart1} height={248} rebuildToken={`oee-comp1-${chartType}-${xAxisGroup}-${filteredRows.length}-${JSON.stringify(filters)}`} />
      </div>
    </div>
  );

  const machineTypes = oeeFilterOptions.machineTypes.length
    ? oeeFilterOptions.machineTypes
    : (oeeSource?.filterOptions?.machineTypes || ["CNC", "Conventional"]);
  const machines = oeeFilterOptions.machines.length
    ? oeeFilterOptions.machines
    : (oeeSource?.filterOptions?.machines || []);

  return (
    <PremiumDashboardView
      title="OEE"
      icon={TrendingUp}
      color="#0ea5e9"
      kpis={computedKpis}
      setupChart={null}
      chartControls={carouselControls}
      rangeHint="OEE Parameters Comparison"
      onClose={onClose}
      noData={filteredRows.length === 0}
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
        <div className="pp1-filter-group" style={{ minWidth: '180px' }}>
          <label className="pp1-filter-label">Machine No</label>
          <Pp1SearchableMultiSelect
            value={filters?.machine}
            options={machines}
            onChange={val => handleInputChange("machine", val)}
            placeholder="Search machine..."
            allLabel="All Machines"
            searchPlaceholder="Search machine..."
          />
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
                  <BarChart2 size={12} style={{ color: "#0ea5e9" }} />
                ) : chartType === "area" ? (
                  <AreaChart size={12} style={{ color: "#0ea5e9" }} />
                ) : chartType === "radar" ? (
                  <Radar size={12} style={{ color: "#0ea5e9" }} />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} style={{ color: "#0ea5e9" }} />
                ) : chartType === "stepped" ? (
                  <Activity size={12} style={{ color: "#0ea5e9" }} />
                ) : chartType === "combo" ? (
                  <TrendingUp size={12} style={{ color: "#0ea5e9" }} />
                ) : (
                  <LucideLineChart size={12} style={{ color: "#0ea5e9" }} />
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
                    <opt.icon size={12} style={{ color: chartType === opt.id ? "#fff" : "#0ea5e9" }} />
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

function OeeComparisonReportBottomTable({ data, filters, xAxisGroup = "Month Wise" }) {
  const [sortIndex, setSortIndex] = React.useState(null);
  const [sortDirection, setSortDirection] = React.useState("asc");
  const [hoveredHeader, setHoveredHeader] = React.useState(null);

  // Reset sorting state when switching tabs
  React.useEffect(() => {
    setSortIndex(null);
    setSortDirection("asc");
    setHoveredHeader(null);
  }, [xAxisGroup]);

  const handleSort = (idx) => {
    if (sortIndex === idx) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortIndex(null);
        setSortDirection("asc");
      }
    } else {
      setSortIndex(idx);
      setSortDirection("asc");
    }
  };

  const oeeRows = React.useMemo(
    () => (Array.isArray(data?.oeeCompare?.rows) ? data.oeeCompare.rows : []),
    [data?.oeeCompare?.rows]
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
    () => filterOeeRows(oeeRows, filters, defaultRange.from, defaultRange.to),
    [oeeRows, filters, defaultRange]
  );

  const monthLabels = React.useMemo(
    () => buildEffMonthLabelsForDisplay(oeeRows, filters, defaultRange.from, defaultRange.to),
    [oeeRows, filters, defaultRange]
  );

  const processedData = React.useMemo(() => {
    return buildOeeMachineSummaries(filteredRows, monthLabels).map((row) => ({
      ...row,
      monthlyVals: row.monthly,
      dayWiseVals: row.daily,
    }));
  }, [filteredRows, monthLabels]);

  const activeColumns = React.useMemo(() => {
    if (xAxisGroup === "Overall" || xAxisGroup === "Month Wise") {
      return ["Sl.No", ...monthLabels];
    } else if (xAxisGroup === "Day Wise") {
      return ["Sl.No", "Date", "Eff%"];
    } else if (xAxisGroup === "Mac Wise") {
      return ["Sl.No", "Machine No", "OEE%"];
    } else {
      return ["Sl.No", "Team Name", "OEE%"];
    }
  }, [xAxisGroup, monthLabels]);

  const activeRows = React.useMemo(() => {
    if (xAxisGroup === "Overall" || xAxisGroup === "Month Wise") {
      const list = processedData.map((m, idx) => [
        String(idx + 1),
        ...m.monthlyVals.map(v => (v > 0 ? `${v}%` : "—"))
      ]);

      if (processedData.length > 0) {
        const numMonths = processedData[0].monthlyVals.length;
        const overallAvg = [];
        for (let idx = 0; idx < numMonths; idx++) {
          let sum = 0;
          let count = 0;
          processedData.forEach(m => {
            if (m.monthlyVals[idx] > 0) {
              sum += m.monthlyVals[idx];
              count += 1;
            }
          });
          overallAvg.push(count ? `${Math.round(sum / count)}%` : "—");
        }
        list.push(["-", ...overallAvg]);
      }
      return list;
    } else if (xAxisGroup === "Day Wise") {
      if (processedData.length === 0) return [];

      const numDays = processedData[0].dayWiseVals.length;
      const list = [];
      for (let idx = 0; idx < numDays; idx++) {
        let sum = 0;
        let count = 0;
        processedData.forEach(m => {
          if (m.dayWiseVals[idx] > 0) {
            sum += m.dayWiseVals[idx];
            count += 1;
          }
        });
        const dayLabel = processedData[0].dayDates?.[idx]
          ? processedData[0].dayDates[idx]
          : `Day ${idx + 1}`;
        list.push([
          String(idx + 1),
          dayLabel,
          count ? `${Math.round(sum / count)}%` : "—"
        ]);
      }
      return list;
    } else if (xAxisGroup === "Mac Wise") {
      const list = processedData.map((m, idx) => [
        String(idx + 1),
        m.name,
        `${m.avgVal}%`
      ]);

      if (processedData.length > 0) {
        const avgOee = Math.round(processedData.reduce((acc, m) => acc + m.avgVal, 0) / processedData.length);
        list.push(["-", "Overall Average", `${avgOee}%`]);
      }
      return list;
    } else {
      const teamsList = [...new Set(processedData.map((m) => m.team).filter((t) => t && t !== "—"))].sort();
      const list = teamsList.map((team, idx) => {
        const teamRows = processedData.filter(row => row.team === team);
        if (teamRows.length === 0) {
          return [String(idx + 1), team, "0%"];
        }
        const teamOee = Math.round(teamRows.reduce((acc, r) => acc + r.avgVal, 0) / teamRows.length);
        return [String(idx + 1), team, `${teamOee}%`];
      });

      if (processedData.length > 0) {
        const avgOee = Math.round(processedData.reduce((acc, m) => acc + m.avgVal, 0) / processedData.length);
        list.push(["-", "Overall Average", `${avgOee}%`]);
      }
      return list;
    }
  }, [processedData, xAxisGroup]);

  const sortedRows = React.useMemo(() => {
    if (sortIndex === null) return activeRows;

    const dataRows = [];
    const summaryRows = [];

    activeRows.forEach(row => {
      const firstCell = String(row[0]);
      const isSummary = firstCell === "-" || firstCell.toLowerCase().includes("overall") || firstCell.toLowerCase().includes("average");
      if (isSummary) {
        summaryRows.push(row);
      } else {
        dataRows.push(row);
      }
    });

    const sorted = [...dataRows].sort((a, b) => {
      const valA = parseSortValue(a[sortIndex]);
      const valB = parseSortValue(b[sortIndex]);
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    const reindexed = sorted.map((row, idx) => {
      const newRow = [...row];
      newRow[0] = String(idx + 1);
      return newRow;
    });

    return [...reindexed, ...summaryRows];
  }, [activeRows, sortIndex, sortDirection]);

  return (
    <div className="pp1-cc-bot" style={{ animation: "pp1-detail-in 0.3s ease both" }}>
      <div className="pp1-cc-bot__hd" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ display: "flex", gap: "18px", borderBottom: "1px solid rgba(0,0,0,0.08)", width: "100%", paddingBottom: "6px" }}>
          <span style={{
            color: "var(--pp1-blue)",
            fontWeight: 700,
            fontSize: "12px",
            paddingBottom: "6px",
            borderBottom: "2.5px solid var(--pp1-blue)"
          }}>
            OEE Comparison Summary ({xAxisGroup})
          </span>
        </div>
      </div>
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
                const isHovered = hoveredHeader === idx;
                const isSorted = sortIndex === idx;
                const isSlNo = idx === 0;

                return (
                  <th
                    key={idx}
                    onClick={() => !isSlNo && handleSort(idx)}
                    onMouseEnter={() => !isSlNo && setHoveredHeader(idx)}
                    onMouseLeave={() => !isSlNo && setHoveredHeader(null)}
                    style={{
                      position: "sticky",
                      top: 0,
                      backgroundColor: isHovered && !isSlNo ? "#eef3fc" : "#f2f6fe",
                      zIndex: 10,
                      textAlign: isRightAligned ? "right" : "left",
                      cursor: isSlNo ? "default" : "pointer",
                      userSelect: "none",
                      transition: "background-color 0.2s ease",
                      padding: "12px 16px"
                    }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: isRightAligned ? "flex-end" : "flex-start", gap: "5px", width: "100%" }}>
                      <span>{col}</span>
                      {!isSlNo && <SortIcon active={isSorted} direction={sortDirection} />}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length} style={{ textAlign: "center", padding: "20px", color: "var(--pp1-text-4)" }}>
                  No data available.
                </td>
              </tr>
            ) : (
              sortedRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    const isRightAligned = ci > 0 && activeColumns[ci] && (
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
                    const isOverallRow = row[0] === "-" || row[0] === "Overall OEE %" || row[0] === "Overall Average";
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

function filterEffRows(rows, filters, defaultFrom, defaultTo) {
  const source = Array.isArray(rows) ? rows : [];
  const activeFrom = filters.fromDate || defaultFrom;
  const activeTo = filters.toDate || defaultTo;

  return source.filter((r) => {
    const d = (r.date || "").slice(0, 10);
    if (!d || d < activeFrom || d > activeTo) return false;
    if (filters.team && String(r.team || "") !== String(filters.team)) return false;
    if (filters.machineType && String(r.machineType || "") !== String(filters.machineType)) return false;
    if (filters.machine) {
      const selected = filters.machine.split(",").map(m => m.trim()).filter(Boolean);
      if (selected.length > 0 && !selected.includes(String(r.machine || ""))) {
        return false;
      }
    }
    if (filters.operatorName) {
      const selected = filters.operatorName.split(",").map(o => o.trim()).filter(Boolean);
      if (selected.length > 0 && !selected.includes(String(r.operator || ""))) {
        return false;
      }
    }
    return true;
  });
}

function filterEffRowsByDateOnly(rows, filters, defaultFrom, defaultTo) {
  return filterEffRows(
    rows,
    {
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      team: "",
      machineType: "",
      machine: "",
      operatorName: "",
    },
    defaultFrom,
    defaultTo
  );
}

function buildEffFilterOptions(allRows, filters, defaultFrom, defaultTo) {
  const dateScoped = filterEffRowsByDateOnly(allRows, filters, defaultFrom, defaultTo);
  const teams = [...new Set(dateScoped.map((r) => r.team).filter((t) => t && t !== "—"))].sort();

  let scoped = dateScoped;
  if (filters.team) scoped = scoped.filter((r) => r.team === filters.team);

  const machineTypes = [...new Set(dateScoped.map((r) => r.machineType).filter(Boolean))].sort();

  let typeScoped = scoped;
  if (filters.machineType) typeScoped = typeScoped.filter((r) => r.machineType === filters.machineType);

  const machines = [...new Set(typeScoped.map((r) => r.machine).filter(Boolean))].sort();

  let machineScoped = typeScoped;
  if (filters.machine) machineScoped = machineScoped.filter((r) => r.machine === filters.machine);

  const operators = [...new Set(machineScoped.map((r) => r.operator).filter(Boolean))].sort();

  return { teams, machineTypes, machines, operators };
}

function buildEffMonthLabels(activeFrom, activeTo, apiMonthLabels) {
  const abb = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const labels = [];
  if (activeFrom && activeTo) {
    const start = new Date(activeFrom);
    const end = new Date(activeTo);
    let y = start.getFullYear();
    let m = start.getMonth();
    const endY = end.getFullYear();
    const endM = end.getMonth();
    while (y < endY || (y === endY && m <= endM)) {
      labels.push(`${abb[m]}-${String(y).slice(-2)}`);
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
    if (labels.length) return labels;
  }
  if (Array.isArray(apiMonthLabels) && apiMonthLabels.length) {
    return apiMonthLabels;
  }
  return labels;
}

function buildEffMonthLabelsForDisplay(rows, filters, defaultFrom, defaultTo) {
  return buildEffMonthLabels(
    filters.fromDate || defaultFrom,
    filters.toDate || defaultTo,
    null
  );
}

function buildEffOperatorSummaries(filteredRows, monthLabels) {
  const byKey = {};
  filteredRows.forEach((r) => {
    const key = `${r.operator}||${r.machine}`;
    if (!byKey[key]) {
      byKey[key] = {
        name: r.operator,
        team: r.team || "—",
        type: r.machineType || "CNC",
        machine: r.machine,
        monthlySums: {},
        monthlyCounts: {},
        dailySums: {},
        dailyCounts: {},
      };
    }
    const g = byKey[key];
    const eff = Number(r.oaeff || 0);
    if (r.month) {
      g.monthlySums[r.month] = (g.monthlySums[r.month] || 0) + eff;
      g.monthlyCounts[r.month] = (g.monthlyCounts[r.month] || 0) + 1;
    }
    const d = (r.date || "").slice(0, 10);
    if (d) {
      g.dailySums[d] = (g.dailySums[d] || 0) + eff;
      g.dailyCounts[d] = (g.dailyCounts[d] || 0) + 1;
    }
  });

  const allDates = [...new Set(filteredRows.map((r) => (r.date || "").slice(0, 10)).filter(Boolean))].sort();

  return Object.values(byKey).map((g) => {
    const monthly = monthLabels.map((mo) => {
      const c = g.monthlyCounts[mo] || 0;
      return c ? Math.round(g.monthlySums[mo] / c) : 0;
    });
    const daily = allDates.map((d) => {
      const c = g.dailyCounts[d] || 0;
      return c ? Math.round(g.dailySums[d] / c) : 0;
    });
    const activeDaily = daily.filter((v) => v > 0);
    const activeMonthly = monthly.filter((v) => v > 0);
    const avgVal = activeDaily.length
      ? Math.round(activeDaily.reduce((a, b) => a + b, 0) / activeDaily.length)
      : activeMonthly.length
        ? Math.round(activeMonthly.reduce((a, b) => a + b, 0) / activeMonthly.length)
        : 0;
    return {
      name: g.name,
      team: g.team,
      type: g.type,
      machine: g.machine,
      monthly,
      daily,
      dayDates: allDates,
      avgVal,
    };
  });
}

function buildEffChartData(operatorSummaries, xAxisGroup, monthLabels, rawRows) {
  const chartStyle = {
    backgroundColor: "rgba(16, 185, 129, 0.75)",
    borderColor: "#10b981",
    borderWidth: 1.5,
    borderRadius: 5,
  };

  let summaries = operatorSummaries;
  if (!summaries.length && Array.isArray(rawRows) && rawRows.length) {
    summaries = buildEffOperatorSummaries(rawRows, monthLabels);
  }

  if (!summaries.length) {
    return { labels: [], datasets: [] };
  }

  let labels = [];
  let avgData = [];

  if (xAxisGroup === "Overall" || xAxisGroup === "Month Wise") {
    labels = monthLabels;
    avgData = monthLabels.map((_, idx) => {
      let sum = 0;
      let count = 0;
      summaries.forEach((op) => {
        const v = op.monthly[idx];
        if (v > 0) {
          sum += v;
          count += 1;
        }
      });
      return count ? Math.min(100, Math.max(0, Math.round(sum / count))) : 0;
    });
  } else if (xAxisGroup === "Day Wise") {
    const dayDates = summaries[0]?.dayDates || [];
    labels = dayDates.length
      ? dayDates.map((d) => {
        const p = d.split("-");
        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(-2)}` : d;
      })
      : [];
    avgData = dayDates.map((_, idx) => {
      let sum = 0;
      let count = 0;
      summaries.forEach((op) => {
        const v = op.daily[idx];
        if (v > 0) {
          sum += v;
          count += 1;
        }
      });
      return count ? Math.min(100, Math.max(0, Math.round(sum / count))) : 0;
    });
  } else if (xAxisGroup === "Mac Wise") {
    const macMap = {};
    summaries.forEach((op) => {
      if (!macMap[op.machine]) macMap[op.machine] = [];
      macMap[op.machine].push(op.avgVal);
    });
    labels = Object.keys(macMap).sort();
    avgData = labels.map((m) => {
      const vals = macMap[m];
      return Math.min(100, Math.max(0, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)));
    });
  } else if (xAxisGroup === "Team Wise") {
    const teamMap = {};
    summaries.forEach((op) => {
      const team = op.team || "—";
      if (!teamMap[team]) teamMap[team] = [];
      teamMap[team].push(op.avgVal);
    });
    labels = Object.keys(teamMap).sort();
    avgData = labels.map((t) => {
      const vals = teamMap[t];
      return Math.min(100, Math.max(0, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)));
    });
  }

  return {
    labels,
    datasets: avgData.length
      ? [{ label: "Overall Efficiency %", data: avgData, ...chartStyle }]
      : [],
  };
}

function EfficiencyEffReportDashboardView({ data, loading, filters, onFilterChange, xAxisGroup, setXAxisGroup, onClose, targetConfig, uid, onEffData }) {
  const [teamOpen, setTeamOpen] = React.useState(false);
  const [machineTypeOpen, setMachineTypeOpen] = React.useState(false);
  const [chartType, setChartType] = React.useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);
  const [effLive, setEffLive] = React.useState(null);
  const [effLoading, setEffLoading] = React.useState(false);

  const effSource = effLive || data?.efficiencyCompare;

  const teamRef = React.useRef(null);
  const machineTypeRef = React.useRef(null);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (teamRef.current && !teamRef.current.contains(event.target)) {
        setTeamOpen(false);
      }
      if (machineTypeRef.current && !machineTypeRef.current.contains(event.target)) {
        setMachineTypeOpen(false);
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
    onFilterChange(prev => {
      const next = { ...prev, [field]: val };
      if (field === "team") {
        next.machine = "";
        next.operatorName = "";
      } else if (field === "machineType") {
        next.machine = "";
        next.operatorName = "";
      } else if (field === "machine") {
        next.operatorName = "";
      }
      return next;
    });
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

  React.useEffect(() => {
    const ctrl = new AbortController();
    setEffLoading(true);
    const fy = currentFinancialYearRange();
    fetch(buildEffUrl(fy.from, fy.to, filters), {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok || json?.error) {
          throw new Error(json?.error || "Efficiency load failed");
        }
        setEffLive(json);
        onEffData?.(json);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setEffLive(null);
        onEffData?.(data?.efficiencyCompare || null);
      })
      .finally(() => setEffLoading(false));
    return () => ctrl.abort();
  }, [filters.machineType, uid, onEffData, data?.efficiencyCompare]);

  const effRows = React.useMemo(
    () => (Array.isArray(effSource?.rows) ? effSource.rows : []),
    [effSource?.rows]
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
    () => filterEffRows(effRows, filters, defaultRange.from, defaultRange.to),
    [effRows, filters, defaultRange]
  );

  const effFilterOptions = React.useMemo(
    () => buildEffFilterOptions(effRows, filters, defaultRange.from, defaultRange.to),
    [effRows, filters, defaultRange]
  );

  const monthLabels = React.useMemo(
    () => buildEffMonthLabelsForDisplay(effRows, filters, defaultRange.from, defaultRange.to),
    [effRows, filters, defaultRange]
  );

  const operatorSummaries = React.useMemo(
    () => buildEffOperatorSummaries(filteredRows, monthLabels),
    [filteredRows, monthLabels]
  );

  const chart1Data = React.useMemo(
    () => buildEffChartData(operatorSummaries, xAxisGroup, monthLabels, filteredRows),
    [operatorSummaries, xAxisGroup, monthLabels, filteredRows]
  );

  const setupChart1 = React.useCallback((canvas) => {
    let targetVal = 80;
    if (xAxisGroup === "Overall" || xAxisGroup === "Month Wise") {
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
      return createPp1Chart(canvas, {
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
      return createPp1Chart(canvas, {
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

    return createPp1Chart(canvas, {
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
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 10, family: PP1_FONT, weight: "600" },
              color: "#475569",
              maxRotation: (chart1Data.labels?.length || 0) > 8 ? 40 : 0,
              minRotation: (chart1Data.labels?.length || 0) > 8 ? 32 : 0,
              autoSkip: (chart1Data.labels?.length || 0) > 14,
              autoSkipPadding: 10,
              padding: 8,
            },
          },
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
    const apiKpis = effSource?.kpis;
    const targetValBase = targetConfig?.efficiency?.monthWiseTarget ?? 80;
    let targetVal = targetValBase;
    if (xAxisGroup === "Overall" || xAxisGroup === "Month Wise") {
      targetVal = targetConfig?.efficiency?.monthWiseTarget ?? 80;
    } else if (xAxisGroup === "Day Wise") {
      targetVal = targetConfig?.efficiency?.dayWiseTarget ?? 80;
    } else if (xAxisGroup === "Mac Wise") {
      targetVal = targetConfig?.efficiency?.macWiseTarget ?? 80;
    } else if (xAxisGroup === "Team Wise") {
      targetVal = targetConfig?.efficiency?.teamWiseTarget ?? 80;
    }

    if (!operatorSummaries.length) {
      const hasActiveFilter = Boolean(
        filters?.team || filters?.machineType || filters?.machine || filters?.operatorName
      );
      if (apiKpis && apiKpis.rowCount > 0 && !hasActiveFilter && !filters?.fromDate && !filters?.toDate) {
        const avgEff = Math.round(Number(apiKpis.avgOaeff || 0));
        const topStr = apiKpis.topPerformer
          ? `${apiKpis.topPerformer} (${Math.round(Number(apiKpis.topPerformerOaeff || 0))}%)`
          : "N/A";
        const metPct = avgEff >= targetVal ? 100 : 0;
        return [
          { label: "Avg Efficiency", value: `${avgEff}%`, color: "#10b981", icon: UserCheck },
          { label: "Top Performer", value: topStr, color: "#3b82f6", icon: Award },
          { label: "Target Status", value: `${metPct}% Met`, color: "#f59e0b", icon: Target },
          { label: "Trend (MoM)", value: "Stable", color: "#a855f7", icon: TrendingUp }
        ];
      }
      return [
        { label: "Avg Efficiency", value: loading || effLoading ? "…" : "0%", color: "#10b981", icon: UserCheck },
        { label: "Top Performer", value: "N/A", color: "#3b82f6", icon: Award },
        { label: "Target Status", value: "0% Met", color: "#f59e0b", icon: Target },
        { label: "Trend", value: "Stable", color: "#a855f7", icon: TrendingUp }
      ];
    }

    let totalSum = 0;
    let count = 0;
    operatorSummaries.forEach((op) => {
      op.monthly.forEach((val) => {
        if (val > 0) {
          totalSum += val;
          count += 1;
        }
      });
    });
    const avgEff = count ? Math.min(100, Math.max(0, Math.round(totalSum / count))) : 0;

    let topOp = "";
    let topOpAvg = -1;
    operatorSummaries.forEach((op) => {
      const vals = op.monthly.filter((v) => v > 0);
      if (!vals.length) return;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (avg > topOpAvg) {
        topOpAvg = avg;
        topOp = op.name;
      }
    });
    const topPerformerStr = topOp
      ? `${topOp} (${Math.min(100, Math.max(0, Math.round(topOpAvg)))}%)`
      : "N/A";

    let metCount = 0;
    let totalMonthsCount = 0;
    operatorSummaries.forEach((op) => {
      op.monthly.forEach((val) => {
        if (val > 0) {
          if (val >= targetVal) metCount += 1;
          totalMonthsCount += 1;
        }
      });
    });
    const metPct = totalMonthsCount > 0 ? Math.round((metCount / totalMonthsCount) * 100) : 0;
    const targetStatusStr = `${metPct}% Met (${metCount}/${totalMonthsCount} Mo)`;

    let firstSum = 0;
    let lastSum = 0;
    let firstCount = 0;
    let lastCount = 0;
    if (monthLabels.length > 0) {
      const firstIdx = 0;
      const lastIdx = monthLabels.length - 1;
      operatorSummaries.forEach((op) => {
        if (op.monthly[firstIdx] > 0) {
          firstSum += op.monthly[firstIdx];
          firstCount += 1;
        }
        if (op.monthly[lastIdx] > 0) {
          lastSum += op.monthly[lastIdx];
          lastCount += 1;
        }
      });
    }
    const firstAvg = firstCount ? firstSum / firstCount : 0;
    const lastAvg = lastCount ? lastSum / lastCount : 0;
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
  }, [operatorSummaries, monthLabels, targetConfig, xAxisGroup, loading, effLoading, effSource?.kpis]);

  const carouselControls = (
    <div className="pp1-dt-card pp1-center-chart" style={{ marginTop: "10px" }}>
      <div className="pp1-chart-toolbar">
        <div className="pp1-chart-toolbar__title">
          {(xAxisGroup === "Overall" || xAxisGroup === "Month Wise") && "Overall Month Wise Efficiency %"}
          {xAxisGroup === "Day Wise" && "Day Wise Overall Efficiency %"}
          {xAxisGroup === "Mac Wise" && "Machine Wise Overall Efficiency %"}
          {xAxisGroup === "Team Wise" && "Team Wise Overall Efficiency %"}
        </div>
        <div className="pp1-chart-xaxis">
          <span className="pp1-chart-xaxis__label">Chart X-Axis:</span>
          {["Overall", "Day Wise", "Mac Wise", "Team Wise"].map(g => (
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
      <div className="pp1-dt-chart-wrap pp1-center-chart__wrap" style={{ height: 248 }}>
        <ChartJsCanvas setup={setupChart1} height={248} rebuildToken={`eff1-${xAxisGroup}-${JSON.stringify(filters)}-${chartType}-${operatorSummaries.length}`} />
      </div>
    </div>
  );

  const filterOptions = effFilterOptions;
  const teams = filterOptions.teams;
  const machineTypes = filterOptions.machineTypes.length
    ? filterOptions.machineTypes
    : ["CNC", "Conventional"];
  const machines = filterOptions.machines;
  const operators = filterOptions.operators;

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
      noData={filteredRows.length === 0}
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
        <div className="pp1-filter-group" style={{ minWidth: '180px' }}>
          <label className="pp1-filter-label">Machine No</label>
          <Pp1SearchableMultiSelect
            value={filters?.machine}
            options={machines}
            onChange={val => handleInputChange("machine", val)}
            placeholder="Search machine..."
            allLabel="All Machines"
            searchPlaceholder="Search machine..."
          />
        </div>

        {/* Operator Name Filter */}
        <div className="pp1-filter-group" style={{ minWidth: '180px' }}>
          <label className="pp1-filter-label">Operator Name</label>
          <Pp1SearchableMultiSelect
            value={filters?.operatorName}
            options={operators}
            onChange={val => handleInputChange("operatorName", val)}
            placeholder="Search operator..."
            allLabel="All Operators"
            searchPlaceholder="Search operator..."
          />
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

function EfficiencyEffReportBottomTable({ data, filters, xAxisGroup = "Month Wise" }) {
  const [sortIndex, setSortIndex] = React.useState(null);
  const [sortDirection, setSortDirection] = React.useState("asc");
  const [hoveredHeader, setHoveredHeader] = React.useState(null);

  const handleSort = (idx) => {
    if (sortIndex === idx) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortIndex(null);
        setSortDirection("asc");
      }
    } else {
      setSortIndex(idx);
      setSortDirection("asc");
    }
  };

  // Reset sorting state when switching tabs
  React.useEffect(() => {
    setSortIndex(null);
    setSortDirection("asc");
    setHoveredHeader(null);
  }, [xAxisGroup]);

  const effRows = React.useMemo(
    () => (Array.isArray(data?.efficiencyCompare?.rows) ? data.efficiencyCompare.rows : []),
    [data?.efficiencyCompare?.rows]
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
    () => filterEffRows(effRows, filters, defaultRange.from, defaultRange.to),
    [effRows, filters, defaultRange]
  );

  const monthLabels = React.useMemo(
    () => buildEffMonthLabelsForDisplay(effRows, filters, defaultRange.from, defaultRange.to),
    [effRows, filters, defaultRange]
  );

  const processedData = React.useMemo(() => {
    return buildEffOperatorSummaries(filteredRows, monthLabels).map((row) => ({
      ...row,
      monthlyVals: row.monthly,
      dailyVals: row.daily,
    }));
  }, [filteredRows, monthLabels]);

  const filteredData = processedData;

  const activeColumns = React.useMemo(() => {
    if (xAxisGroup === "Overall" || xAxisGroup === "Month Wise") {
      return ["Sl.No", ...monthLabels];
    } else if (xAxisGroup === "Day Wise") {
      return ["Sl.No", "Date", "Eff%"];
    } else if (xAxisGroup === "Mac Wise") {
      return ["Sl.No", "Machine No", "Eff%"];
    } else {
      return ["Sl.No", "Team Name", "Eff%"];
    }
  }, [xAxisGroup, monthLabels]);

  const activeRows = React.useMemo(() => {
    if (xAxisGroup === "Overall" || xAxisGroup === "Month Wise") {
      const list = filteredData.map((row, idx) => [
        String(idx + 1),
        ...row.monthlyVals.map(v => (v > 0 ? `${v}%` : "—"))
      ]);
      if (filteredData.length > 0) {
        const numMonths = filteredData[0].monthlyVals.length;
        const overallAvg = [];
        for (let idx = 0; idx < numMonths; idx++) {
          let sum = 0;
          let count = 0;
          filteredData.forEach(row => {
            if (row.monthlyVals[idx] > 0) {
              sum += row.monthlyVals[idx];
              count += 1;
            }
          });
          overallAvg.push(count ? `${Math.round(sum / count)}%` : "—");
        }
        list.push(["-", ...overallAvg]);
      }
      return list;
    } else if (xAxisGroup === "Day Wise") {
      if (filteredData.length === 0) return [];

      const numDays = filteredData[0].dailyVals.length;
      const list = [];
      for (let idx = 0; idx < numDays; idx++) {
        let sum = 0;
        let count = 0;
        filteredData.forEach(row => {
          if (row.dailyVals[idx] > 0) {
            sum += row.dailyVals[idx];
            count += 1;
          }
        });
        const dayLabel = filteredData[0].dayDates?.[idx]
          ? filteredData[0].dayDates[idx]
          : `Day ${idx + 1}`;
        list.push([
          String(idx + 1),
          dayLabel,
          count ? `${Math.round(sum / count)}%` : "—"
        ]);
      }
      return list;
    } else if (xAxisGroup === "Mac Wise") {
      const list = filteredData.map((row, idx) => [
        String(idx + 1),
        row.machine,
        `${row.avgVal}%`
      ]);
      if (filteredData.length > 0) {
        const overallAvg = Math.round(filteredData.reduce((acc, r) => acc + r.avgVal, 0) / filteredData.length);
        list.push(["-", "Overall Average", `${overallAvg}%`]);
      }
      return list;
    } else {
      const teamsList = [...new Set(filteredData.map((row) => row.team).filter((t) => t && t !== "—"))].sort();
      const list = teamsList.map((team, idx) => {
        const teamRows = filteredData.filter(row => row.team === team);
        if (teamRows.length === 0) return [String(idx + 1), team, "-"];
        const avg = Math.round(teamRows.reduce((acc, r) => acc + r.avgVal, 0) / teamRows.length);
        return [String(idx + 1), team, `${avg}%`];
      });

      const validList = list.filter(row => row[2] !== "-");
      if (validList.length > 0) {
        const overallAvg = Math.round(filteredData.reduce((acc, r) => acc + r.avgVal, 0) / filteredData.length);
        validList.push(["-", "Overall Average", `${overallAvg}%`]);
      }
      return validList;
    }
  }, [filteredData, xAxisGroup]);

  const sortedRows = React.useMemo(() => {
    if (sortIndex === null) return activeRows;

    const dataRows = [];
    const summaryRows = [];

    activeRows.forEach(row => {
      const firstCell = String(row[0]);
      const isSummary = firstCell === "-" || firstCell.toLowerCase().includes("overall") || firstCell.toLowerCase().includes("average");
      if (isSummary) {
        summaryRows.push(row);
      } else {
        dataRows.push(row);
      }
    });

    const sorted = [...dataRows].sort((a, b) => {
      const valA = parseSortValue(a[sortIndex]);
      const valB = parseSortValue(b[sortIndex]);
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    const reindexed = sorted.map((row, idx) => {
      const newRow = [...row];
      newRow[0] = String(idx + 1);
      return newRow;
    });

    return [...reindexed, ...summaryRows];
  }, [activeRows, sortIndex, sortDirection]);

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
      <div className="pp1-cc-bot__hd" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ display: "flex", gap: "18px", borderBottom: "1px solid rgba(0,0,0,0.08)", width: "100%", paddingBottom: "6px" }}>
          <span style={{
            color: "var(--pp1-blue)",
            fontWeight: 700,
            fontSize: "12px",
            paddingBottom: "6px",
            borderBottom: "2.5px solid var(--pp1-blue)"
          }}>
            Efficiency Comparison Summary ({xAxisGroup})
          </span>
        </div>
      </div>
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
                const isHovered = hoveredHeader === idx;
                const isSorted = sortIndex === idx;
                const isSlNo = idx === 0;

                return (
                  <th
                    key={idx}
                    onClick={() => !isSlNo && handleSort(idx)}
                    onMouseEnter={() => !isSlNo && setHoveredHeader(idx)}
                    onMouseLeave={() => !isSlNo && setHoveredHeader(null)}
                    style={{
                      position: "sticky",
                      top: 0,
                      backgroundColor: isHovered && !isSlNo ? "#eef3fc" : "#f2f6fe",
                      zIndex: 10,
                      textAlign: isRightAligned ? "center" : "left",
                      cursor: isSlNo ? "default" : "pointer",
                      userSelect: "none",
                      transition: "background-color 0.2s ease",
                      width: getColWidth(col)
                    }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: isRightAligned ? "center" : "flex-start", gap: "5px", width: "100%" }}>
                      <span>{col}</span>
                      {!isSlNo && <SortIcon active={isSorted} direction={sortDirection} />}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length} className="pp1-cc-tbl__empty">
                  No data matches active filters.
                </td>
              </tr>
            ) : (
              sortedRows.map((row, ri) => {
                const isOverallRow = row[0] === "-" || row[0] === "Overall Average" || row[0] === "Overall OEE %" || row[0] === "Overall Total";
                return (
                  <tr key={ri} className="pp1-cc-tbl__tr">
                    {row.map((cell, ci) => {
                      const isRightAligned = ci > 0 && activeColumns[ci] && (
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

function filterRejRows(rows, filters, defaultFrom, defaultTo) {
  const source = Array.isArray(rows) ? rows : [];
  const activeFrom = filters.fromDate || defaultFrom;
  const activeTo = filters.toDate || defaultTo;

  return source.filter((r) => {
    const d = (r.date || "").slice(0, 10);
    if (!d || d < activeFrom || d > activeTo) return false;
    if (Number(r.rejQty || 0) <= 0) return false;
    if (filters.customer) {
      const selectedCustomers = filters.customer.split(",").map(c => c.trim().toLowerCase()).filter(Boolean);
      if (selectedCustomers.length > 0) {
        const custVal = String(r.customer || "").trim().toLowerCase();
        if (!selectedCustomers.includes(custVal)) return false;
      }
    }
    if (filters.partNo && String(r.partNo || "") !== String(filters.partNo)) return false;
    if (filters.rejType && String(r.rejType || "") !== String(filters.rejType)) return false;
    if (filters.rejReason) {
      const reason = String(r.reason || "").toLowerCase();
      if (!reason.includes(String(filters.rejReason).toLowerCase())) return false;
    }
    return true;
  });
}

function resolveRejectionLimit(targetConfig, rejType) {
  const cfg = targetConfig?.rejection || {};
  if (rejType === "In-house Rej") return cfg.inHouseLimit ?? 1.0;
  if (rejType === "Vendor Rej") return cfg.vendorLimit ?? 1.2;
  if (rejType === "Final Insp Rej") return cfg.finalInspLimit ?? 1.5;
  if (rejType === "Supplier Rej") return cfg.supplierLimit ?? 0.5;
  return cfg.rejectionLimit ?? 2.0;
}

function resolveReworkLimit(targetConfig, xAxisGroup) {
  const cfg = targetConfig?.rework || {};
  if (xAxisGroup === "In-House") return cfg.inHouseLimit ?? 1.0;
  if (xAxisGroup === "Vendor") return cfg.jobOrderLimit ?? 1.2;
  if (xAxisGroup === "Final Insp") return cfg.finalInspLimit ?? 1.5;
  if (xAxisGroup === "Customer Rework") return cfg.customerReworkLimit ?? 0.5;
  return cfg.reworkLimit ?? 1.5;
}

function hasActiveRejDimensionFilters(filters) {
  return !!(filters?.customer || filters?.partNo || filters?.rejType || filters?.rejReason);
}

function hasActiveRewDimensionFilters(filters, xAxisGroup) {
  return !!(filters?.customer || filters?.partNo || filters?.reworkReason || (xAxisGroup && xAxisGroup !== "Overall"));
}

function filterRewRows(rows, filters, defaultFrom, defaultTo, xAxisGroup) {
  const source = Array.isArray(rows) ? rows : [];
  const activeFrom = filters.fromDate || defaultFrom;
  const activeTo = filters.toDate || defaultTo;

  return source.filter((r) => {
    const d = (r.date || "").slice(0, 10);
    if (!d || d < activeFrom || d > activeTo) return false;
    if (Number(r.reworkQty || 0) <= 0) return false;
    if (filters.customer) {
      const selectedCustomers = filters.customer.split(",").map(c => c.trim().toLowerCase()).filter(Boolean);
      if (selectedCustomers.length > 0) {
        const custVal = String(r.customer || "").trim().toLowerCase();
        if (!selectedCustomers.includes(custVal)) return false;
      }
    }
    if (filters.partNo && String(r.partNo || "") !== String(filters.partNo)) return false;
    if (xAxisGroup && xAxisGroup !== "Overall") {
      if (xAxisGroup === "Customer Rework") {
        const cust = r.customer && r.customer !== "—";
        const eligible = cust && (r.inspSource === "Final Insp" || r.inspSource === "Intermediate");
        if (!eligible) return false;
      } else if (String(r.reworkGroup || "") !== String(xAxisGroup)) {
        return false;
      }
    }
    if (filters.reworkReason) {
      const reason = String(r.reason || "").toLowerCase();
      if (!reason.includes(String(filters.reworkReason).toLowerCase())) return false;
    }
    return true;
  });
}

function buildRejChartData(filteredRows, monthLabels) {
  const labels = monthLabels.length ? monthLabels : [];
  const rates = labels.map((mo) => {
    const monthRows = filteredRows.filter((r) => r.month === mo);
    if (!monthRows.length) return 0;
    const totalRej = monthRows.reduce((acc, r) => acc + Number(r.rejQty || 0), 0);
    const totalInsp = monthRows.reduce((acc, r) => acc + Number(r.inspQty || 0), 0);
    return totalInsp > 0 ? Math.min(100, Math.max(0, Math.round((totalRej / totalInsp) * 100))) : 0;
  });
  const qtys = labels.map((mo) => {
    const monthRows = filteredRows.filter((r) => r.month === mo);
    return monthRows.reduce((acc, r) => acc + Number(r.rejQty || 0), 0);
  });
  return { labels, rates, qtys };
}

function buildRewChartData(filteredRows, monthLabels) {
  const labels = monthLabels.length ? monthLabels : [];
  const rates = labels.map((mo) => {
    const monthRows = filteredRows.filter((r) => r.month === mo);
    if (!monthRows.length) return 0;
    const totalRwk = monthRows.reduce((acc, r) => acc + Number(r.reworkQty || 0), 0);
    const totalInsp = monthRows.reduce((acc, r) => acc + Number(r.inspQty || 0), 0);
    return totalInsp > 0 ? Math.min(100, Math.max(0, Math.round((totalRwk / totalInsp) * 100))) : 0;
  });
  const qtys = labels.map((mo) => {
    const monthRows = filteredRows.filter((r) => r.month === mo);
    return monthRows.reduce((acc, r) => acc + Number(r.reworkQty || 0), 0);
  });
  return { labels, rates, qtys };
}

function buildRejTablePayload(filteredRows, rejType) {
  const type = rejType || "";
  if (type === "In-house Rej") {
    return {
      title: "In-House Rejection Registry",
      columns: ["Process/Line", "Month", "Operator", "Rejection %", "Rejection Qty", "Rejection Value"],
      rows: filteredRows.map((r) => [
        r.process || "—",
        r.month || "—",
        r.operator || "—",
        `${Math.round(Number(r.rejPct || 0))}%`,
        String(Math.round(Number(r.rejQty || 0))),
        formatInrValue(r.rejValue),
      ]),
    };
  }
  if (type === "Vendor Rej") {
    return {
      title: "Vendor Rejection Registry",
      columns: ["Vendor Name", "Month", "Part Name", "Rejection %", "Rejection Qty", "Rejection Value"],
      rows: filteredRows.map((r) => [
        r.vendor || r.customer || "—",
        r.month || "—",
        r.partName || r.partNo || "—",
        `${Math.round(Number(r.rejPct || 0))}%`,
        String(Math.round(Number(r.rejQty || 0))),
        formatInrValue(r.rejValue),
      ]),
    };
  }
  if (type === "Final Insp Rej") {
    return {
      title: "Final Inspection Rejection Registry",
      columns: ["Inspection Point", "Month", "Inspector", "Rejection %", "Rejection Qty", "Rejection Value"],
      rows: filteredRows.map((r) => [
        (r.reason || r.process || "—").split(",")[0].trim() || "—",
        r.month || "—",
        r.inspector || "—",
        `${Math.round(Number(r.rejPct || 0))}%`,
        String(Math.round(Number(r.rejQty || 0))),
        formatInrValue(r.rejValue),
      ]),
    };
  }
  if (type === "Supplier Rej") {
    return {
      title: "Supplier Rejection Registry",
      columns: ["Supplier Name", "Month", "Material", "Rejection %", "Rejection Qty", "Rejection Value"],
      rows: filteredRows.map((r) => [
        r.supplier || r.vendor || "—",
        r.month || "—",
        r.partName || r.partNo || "—",
        `${Math.round(Number(r.rejPct || 0))}%`,
        String(Math.round(Number(r.rejQty || 0))),
        formatInrValue(r.rejValue),
      ]),
    };
  }
  return {
    title: "Rejection Registry",
    columns: ["Customer Name", "Month", "Rej Insp", "Rej %", "Rej Qty", "Rej Value"],
    rows: filteredRows.map((r) => [
      r.customer || "—",
      r.month || "—",
      r.inspLabel || "—",
      `${Math.round(Number(r.rejPct || 0))}%`,
      String(Math.round(Number(r.rejQty || 0))),
      formatInrValue(r.rejValue),
    ]),
  };
}

function buildRewTablePayload(filteredRows, xAxisGroup) {
  const group = xAxisGroup || "Overall";
  if (group === "In-House") {
    return {
      title: "In-House Rework Registry",
      columns: ["Process/Line", "Month", "Operator", "Rework %", "Rework Qty", "Rework Value"],
      rows: filteredRows.map((r) => [
        r.process || "—",
        r.month || "—",
        r.operator || "—",
        `${Math.round(Number(r.reworkPct || 0))}%`,
        String(Math.round(Number(r.reworkQty || 0))),
        formatInrValue(r.reworkValue),
      ]),
    };
  }
  if (group === "Vendor") {
    return {
      title: "Vendor Rework Registry",
      columns: ["Vendor Name", "Month", "Part Name", "Rework %", "Rework Qty", "Rework Value"],
      rows: filteredRows.map((r) => [
        r.vendor || r.customer || "—",
        r.month || "—",
        r.partName || r.partNo || "—",
        `${Math.round(Number(r.reworkPct || 0))}%`,
        String(Math.round(Number(r.reworkQty || 0))),
        formatInrValue(r.reworkValue),
      ]),
    };
  }
  if (group === "Final Insp") {
    return {
      title: "Final Inspection Rework Registry",
      columns: ["Inspection Point", "Month", "Inspector", "Rework %", "Rework Qty", "Rework Value"],
      rows: filteredRows.map((r) => [
        (r.reason || r.process || "—").split(",")[0].trim() || "—",
        r.month || "—",
        r.inspector || "—",
        `${Math.round(Number(r.reworkPct || 0))}%`,
        String(Math.round(Number(r.reworkQty || 0))),
        formatInrValue(r.reworkValue),
      ]),
    };
  }
  if (group === "Customer Rework") {
    return {
      title: "Customer Return & Rework Registry",
      columns: ["Customer Name", "Month", "Complaint Ref", "Rework %", "Rework Qty", "Rework Value"],
      rows: filteredRows.map((r) => [
        r.customer || "—",
        r.month || "—",
        r.inspNo || "—",
        `${Math.round(Number(r.reworkPct || 0))}%`,
        String(Math.round(Number(r.reworkQty || 0))),
        formatInrValue(r.reworkValue),
      ]),
    };
  }
  return {
    title: "Rework Registry",
    columns: ["Customer Name", "Month", "Rework Insp", "Rework %", "Rework Qty", "Rework Value"],
    rows: filteredRows.map((r) => [
      r.customer || "—",
      r.month || "—",
      r.inspLabel || "—",
      `${Math.round(Number(r.reworkPct || 0))}%`,
      String(Math.round(Number(r.reworkQty || 0))),
      formatInrValue(r.reworkValue),
    ]),
  };
}

function RejectionReportDashboardView({ data, loading, filters, onFilterChange, activeTab, onActiveTabChange, onClose, targetConfig, uid, onRejData }) {
  const [rejTypeOpen, setRejTypeOpen] = React.useState(false);
  const [chartType, setChartType] = React.useState("combo");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);
  const [rejLive, setRejLive] = React.useState(null);
  const [rejLoading, setRejLoading] = React.useState(false);

  const rejSource = rejLive || data?.rejectionCompare;

  const rejTypeRef = React.useRef(null);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
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

  React.useEffect(() => {
    const ctrl = new AbortController();
    setRejLoading(true);
    const fy = currentFinancialYearRange();
    fetch(buildRejUrl(fy.from, fy.to), {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok || json?.error) throw new Error(json?.error || "Rejection load failed");
        setRejLive(json);
        onRejData?.(json);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setRejLive(null);
        onRejData?.(data?.rejectionCompare || null);
      })
      .finally(() => setRejLoading(false));
    return () => ctrl.abort();
  }, [uid, onRejData, data?.rejectionCompare]);

  const rejRows = React.useMemo(
    () => (Array.isArray(rejSource?.rows) ? rejSource.rows : []),
    [rejSource?.rows]
  );

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return { from: `${year}-${month}-01`, to: `${year}-${month}-${day}` };
  }, []);

  const filteredRows = React.useMemo(
    () => filterRejRows(rejRows, filters, defaultRange.from, defaultRange.to),
    [rejRows, filters, defaultRange]
  );

  const monthLabels = React.useMemo(
    () => buildEffMonthLabelsForDisplay(rejRows, filters, defaultRange.from, defaultRange.to),
    [rejRows, filters, defaultRange]
  );

  const chart1Data = React.useMemo(
    () => buildRejChartData(filteredRows, monthLabels),
    [filteredRows, monthLabels]
  );

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
      return createPp1Chart(canvas, {
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
      return createPp1Chart(canvas, {
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

    return createPp1Chart(canvas, {
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

  const customersList = rejSource?.filterOptions?.customers?.length
    ? rejSource.filterOptions.customers
    : [...new Set(rejRows.map((r) => r.customer).filter((c) => c && c !== "—"))].sort();
  const rejTypesList = ["In-house Rej", "Vendor Rej", "Final Insp Rej", "Supplier Rej"];

  const computedKpis = React.useMemo(() => {
    if (!filteredRows.length) {
      const api = rejSource?.kpis;
      if (api?.rowCount > 0) {
        return [
          { label: "Avg Rejection", value: `${Number(api.avgRejPct || 0).toFixed(1)}%`, color: "#f59e0b", icon: AlertTriangle },
          { label: "Rejection Qty", value: String(Math.round(Number(api.totalRejQty || 0))), color: "#3b82f6", icon: Package },
          { label: "Rejection Value", value: formatInrValue(api.totalRejValue), color: "#10b981", icon: TrendingUp },
          { label: "Records", value: String(api.rowCount || 0), color: "#a855f7", icon: FileText },
        ];
      }
      return null;
    }
    const totalRej = filteredRows.reduce((acc, r) => acc + Number(r.rejQty || 0), 0);
    const totalInsp = filteredRows.reduce((acc, r) => acc + Number(r.inspQty || 0), 0);
    const totalVal = filteredRows.reduce((acc, r) => acc + Number(r.rejValue || 0), 0);
    const avgPct = totalInsp > 0 ? ((totalRej / totalInsp) * 100).toFixed(1) : "0.0";
    return [
      { label: "Avg Rejection", value: `${avgPct}%`, color: "#f59e0b", icon: AlertTriangle },
      { label: "Rejection Qty", value: String(Math.round(totalRej)), color: "#3b82f6", icon: Package },
      { label: "Rejection Value", value: formatInrValue(totalVal), color: "#10b981", icon: TrendingUp },
      { label: "Records", value: String(filteredRows.length), color: "#a855f7", icon: FileText },
    ];
  }, [filteredRows, rejSource?.kpis]);

  return (
    <PremiumDashboardView
      title="Rejection"
      icon={AlertTriangle}
      color="#f59e0b"
      kpis={computedKpis}
      setupChart={setupChart1}
      rangeHint="Month Wise Rejection"
      onClose={onClose}
      rebuildToken={`rejection-${filteredRows.length}-${JSON.stringify(filters)}-${JSON.stringify(targetConfig?.rejection)}-${chartType}`}
      noData={filteredRows.length === 0}
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

        {/* Customer Multi-Select */}
        <div className="pp1-filter-group" style={{ minWidth: "180px" }}>
          <label className="pp1-filter-label">Customer Name</label>
          <Pp1SearchableMultiSelect
            value={filters.customer}
            options={customersList}
            onChange={(val) => handleInputChange("customer", val)}
            placeholder="Select customer..."
            allLabel="All Customers"
            searchPlaceholder="Search customer..."
          />
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

function RejectionReportBottomTable({ data, filters }) {
  const rejRows = React.useMemo(
    () => (Array.isArray(data?.rejectionCompare?.rows) ? data.rejectionCompare.rows : []),
    [data?.rejectionCompare?.rows]
  );

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return { from: `${year}-${month}-01`, to: `${year}-${month}-${day}` };
  }, []);

  const filteredRows = React.useMemo(
    () => filterRejRows(rejRows, filters, defaultRange.from, defaultRange.to),
    [rejRows, filters, defaultRange]
  );

  const { title, columns, rows } = React.useMemo(
    () => buildRejTablePayload(filteredRows, filters?.rejType),
    [filteredRows, filters?.rejType]
  );

  const finalColumns = ["Sl.No", ...columns.slice(1)];
  const finalRows = rows.map((row, idx) => [String(idx + 1), ...row.slice(1)]);

  return <PremiumDashboardBottomTable title={title} columns={finalColumns} rows={finalRows} />;
}

function ReworkReportDashboardView({ data, loading, filters, onFilterChange, onClose, targetConfig, xAxisGroup, setXAxisGroup, uid, onRewData }) {
  const [chartType, setChartType] = React.useState("combo");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);
  const [rewLive, setRewLive] = React.useState(null);
  const [rewLoading, setRewLoading] = React.useState(false);

  const rewSource = rewLive || data?.reworkCompare;

  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
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

  React.useEffect(() => {
    const ctrl = new AbortController();
    setRewLoading(true);
    const fy = currentFinancialYearRange();
    fetch(buildRewUrl(fy.from, fy.to), {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok || json?.error) throw new Error(json?.error || "Rework load failed");
        setRewLive(json);
        onRewData?.(json);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setRewLive(null);
        onRewData?.(data?.reworkCompare || null);
      })
      .finally(() => setRewLoading(false));
    return () => ctrl.abort();
  }, [uid, onRewData, data?.reworkCompare]);

  const rewRows = React.useMemo(
    () => (Array.isArray(rewSource?.rows) ? rewSource.rows : []),
    [rewSource?.rows]
  );

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return { from: `${year}-${month}-01`, to: `${year}-${month}-${day}` };
  }, []);

  const filteredRows = React.useMemo(
    () => filterRewRows(rewRows, filters, defaultRange.from, defaultRange.to, xAxisGroup),
    [rewRows, filters, defaultRange, xAxisGroup]
  );

  const monthLabels = React.useMemo(
    () => buildEffMonthLabelsForDisplay(rewRows, filters, defaultRange.from, defaultRange.to),
    [rewRows, filters, defaultRange]
  );

  const chart1Data = React.useMemo(
    () => buildRewChartData(filteredRows, monthLabels),
    [filteredRows, monthLabels]
  );

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
      return createPp1Chart(canvas, {
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
      return createPp1Chart(canvas, {
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

    return createPp1Chart(canvas, {
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

  const customersList = rewSource?.filterOptions?.customers?.length
    ? rewSource.filterOptions.customers
    : [...new Set(rewRows.map((r) => r.customer).filter((c) => c && c !== "—"))].sort();

  const computedKpis = React.useMemo(() => {
    if (!filteredRows.length) {
      const api = rewSource?.kpis;
      if (api?.rowCount > 0) {
        return [
          { label: "Avg Rework", value: `${Number(api.avgReworkPct || 0).toFixed(1)}%`, color: "#a855f7", icon: PackageCheck },
          { label: "Rework Qty", value: String(Math.round(Number(api.totalReworkQty || 0))), color: "#3b82f6", icon: Package },
          { label: "Rework Value", value: formatInrValue(api.totalReworkValue), color: "#10b981", icon: TrendingUp },
          { label: "Records", value: String(api.rowCount || 0), color: "#f59e0b", icon: FileText },
        ];
      }
      return null;
    }
    const totalRwk = filteredRows.reduce((acc, r) => acc + Number(r.reworkQty || 0), 0);
    const totalInsp = filteredRows.reduce((acc, r) => acc + Number(r.inspQty || 0), 0);
    const totalVal = filteredRows.reduce((acc, r) => acc + Number(r.reworkValue || 0), 0);
    const avgPct = totalInsp > 0 ? ((totalRwk / totalInsp) * 100).toFixed(1) : "0.0";
    return [
      { label: "Avg Rework", value: `${avgPct}%`, color: "#a855f7", icon: PackageCheck },
      { label: "Rework Qty", value: String(Math.round(totalRwk)), color: "#3b82f6", icon: Package },
      { label: "Rework Value", value: formatInrValue(totalVal), color: "#10b981", icon: TrendingUp },
      { label: "Records", value: String(filteredRows.length), color: "#f59e0b", icon: FileText },
    ];
  }, [filteredRows, rewSource?.kpis]);

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
      kpis={computedKpis}
      setupChart={setupChart1}
      rangeHint={xAxisGroup === "Overall" ? "Month Wise Rework" : `${xAxisGroup} Rework`}
      onClose={onClose}
      rebuildToken={`rework-${xAxisGroup}-${filteredRows.length}-${chartType}-${JSON.stringify(filters)}`}
      chartHeaderControls={chartHeaderControls}
      noData={filteredRows.length === 0}
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

        {/* Customer Multi-Select */}
        <div className="pp1-filter-group" style={{ minWidth: "180px" }}>
          <label className="pp1-filter-label">Customer Name</label>
          <Pp1SearchableMultiSelect
            value={filters.customer}
            options={customersList}
            onChange={(val) => handleInputChange("customer", val)}
            placeholder="Select customer..."
            allLabel="All Customers"
            searchPlaceholder="Search customer..."
          />
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

function ReworkReportBottomTable({ data, filters, xAxisGroup }) {
  const rewRows = React.useMemo(
    () => (Array.isArray(data?.reworkCompare?.rows) ? data.reworkCompare.rows : []),
    [data?.reworkCompare?.rows]
  );

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return { from: `${year}-${month}-01`, to: `${year}-${month}-${day}` };
  }, []);

  const filteredRows = React.useMemo(
    () => filterRewRows(rewRows, filters, defaultRange.from, defaultRange.to, xAxisGroup),
    [rewRows, filters, defaultRange, xAxisGroup]
  );

  const { title, columns, rows } = React.useMemo(
    () => buildRewTablePayload(filteredRows, xAxisGroup),
    [filteredRows, xAxisGroup]
  );

  const finalColumns = ["Sl.No", ...columns.slice(1)];
  const finalRows = rows.map((row, idx) => [String(idx + 1), ...row.slice(1)]);

  return <PremiumDashboardBottomTable title={title} columns={finalColumns} rows={finalRows} />;
}

function buildStoreStockUrl(from, to, filters) {
  let url = buildUrl("/api/plant-performance/store-stock/", from, to);
  if (filters?.category && filters.category.length > 0) {
    url += `&category=${encodeURIComponent(filters.category.join(","))}`;
  }
  if (filters?.itemCode) {
    url += `&itemCode=${encodeURIComponent(filters.itemCode)}`;
  }
  return url;
}

function StoreStockValueReportDashboardView({ data, filters, onFilterChange, onClose, targetConfig, onStockData }) {
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [itemCodeOpen, setItemCodeOpen] = React.useState(false);
  const [stockLive, setStockLive] = React.useState(null);
  const [chartType, setChartType] = React.useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);

  const categoryRef = React.useRef(null);
  const itemCodeRef = React.useRef(null);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setCategoryOpen(false);
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

  const pickerFrom = React.useMemo(() => {
    if (filters?.fromDate) return new Date(filters.fromDate);
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, [filters?.fromDate]);

  const pickerTo = React.useMemo(() => {
    if (filters?.toDate) return new Date(filters.toDate);
    return new Date();
  }, [filters?.toDate]);

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

  const stockSource = stockLive || data?.storeStockValue;

  const groupsList = React.useMemo(() => {
    return Array.isArray(stockSource?.filterOptions?.groups) ? stockSource.filterOptions.groups : [];
  }, [stockSource?.filterOptions?.groups]);

  const itemCodesList = React.useMemo(() => {
    return Array.isArray(stockSource?.filterOptions?.itemCodes) ? stockSource.filterOptions.itemCodes : [];
  }, [stockSource?.filterOptions?.itemCodes]);

  const toggleGroup = (g) => {
    const current = filters.category || [];
    const next = current.includes(g) ? current.filter(x => x !== g) : [...current, g];
    onFilterChange(prev => ({ ...prev, category: next }));
  };

  const isAllSelected = (filters.category || []).length === groupsList.length && groupsList.length > 0;

  const toggleSelectAll = () => {
    onFilterChange(prev => ({
      ...prev,
      category: isAllSelected ? [] : [...groupsList]
    }));
  };

  const handleReset = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      category: [],
      itemCode: "",
      status: "",
    });
    setChartType("bar");
  };

  React.useEffect(() => {
    if (!filters.fromDate || !filters.toDate) return;
    const ctrl = new AbortController();
    fetch(buildStoreStockUrl(filters.fromDate, filters.toDate, filters), {
      signal: ctrl.signal
    })
      .then(res => res.json())
      .then(json => {
        if (json && !json.error) {
          setStockLive(json);
          onStockData?.(json);
        }
      })
      .catch(() => { });
    return () => ctrl.abort();
  }, [filters.fromDate, filters.toDate, filters.category, filters.itemCode, onStockData]);

  const chartLabels = React.useMemo(() => {
    return Array.isArray(stockSource?.chart?.labels) ? stockSource.chart.labels : [];
  }, [stockSource?.chart?.labels]);

  const chartValues = React.useMemo(() => {
    return Array.isArray(stockSource?.chart?.values) ? stockSource.chart.values : [];
  }, [stockSource?.chart?.values]);

  const totalValLakhs = stockSource?.kpi?.totalStockValueLakhs ?? 0;
  const kpis = React.useMemo(() => [
    { label: "Total Store Stock Value", value: `₹${totalValLakhs.toFixed(2)}L`, icon: Coins, color: "#059669" }
  ], [totalValLakhs]);

  const setupChart = React.useCallback((canvas) => {
    const stockLimit = targetConfig?.store_stock_value?.maxStockValueL ?? 50.0;

    if (chartType === "radar") {
      return createPp1Chart(canvas, {
        type: "radar",
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: "Stock Value (₹ Lakhs)",
              data: chartValues,
              borderColor: "#059669",
              backgroundColor: "rgba(5, 150, 105, 0.15)",
              borderWidth: 2,
              pointRadius: 3,
              fill: true
            },
            {
              label: "Max Stock Limit (₹ Lakhs)",
              data: (chartLabels || []).map(() => stockLimit),
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
              labels: {
                font: { size: 9, family: "'Outfit', 'Inter', sans-serif", weight: 600 },
                boxWidth: 10
              }
            },
            tooltip: {
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              titleFont: { family: "'Outfit', 'Inter', sans-serif", size: 11, weight: "bold" },
              bodyFont: { family: "'Outfit', 'Inter', sans-serif", size: 11 },
              padding: 8,
              cornerRadius: 6,
              callbacks: {
                label: (context) => ` ${context.dataset.label}: ₹${Number(context.raw).toFixed(2)}L`
              }
            }
          },
          scales: {
            r: {
              min: 0,
              suggestedMax: Math.max(0, stockLimit, ...chartValues) * 1.1,
              angleLines: { display: true, color: "rgba(5, 150, 105, 0.08)" },
              grid: { circular: true, color: "rgba(5, 150, 105, 0.06)" },
              pointLabels: { font: { family: "'Outfit', 'Inter', sans-serif", size: 9, weight: "600" }, color: "#64748b" },
              ticks: { display: true, font: { size: 8 }, backdropColor: "transparent", callback: (v) => `₹${v}L` }
            }
          }
        }
      });
    }

    if (chartType === "polarArea") {
      return createPp1Chart(canvas, {
        type: "polarArea",
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: "Stock Value (₹ Lakhs)",
              data: chartValues,
              backgroundColor: "rgba(5, 150, 105, 0.6)",
              borderColor: "#059669",
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                font: { size: 9, family: "'Outfit', 'Inter', sans-serif", weight: 600 },
                boxWidth: 10
              }
            },
            tooltip: {
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              padding: 8,
              callbacks: {
                label: (context) => ` ${context.dataset.label}: ₹${Number(context.raw).toFixed(2)}L`
              }
            }
          },
          scales: {
            r: {
              min: 0,
              suggestedMax: Math.max(0, ...chartValues) * 1.1,
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

    const getDatasetType = () => {
      return isBar || isCombo ? "bar" : "line";
    };

    const getFill = () => {
      if (isArea) return true;
      if (isStepped) return true;
      if (isLine) return true;
      return false;
    };

    const getBgColor = () => {
      if (isBar || isCombo) return "rgba(5, 150, 105, 0.75)";
      if (isArea) return "rgba(5, 150, 105, 0.25)";
      if (isStepped) return "rgba(5, 150, 105, 0.15)";
      return "rgba(5, 150, 105, 0.03)";
    };

    const getPointRadius = () => {
      return isBar || isCombo ? 0 : 4.5;
    };

    return createPp1Chart(canvas, {
      type: "bar",
      data: {
        labels: chartLabels,
        datasets: [
          {
            type: getDatasetType(),
            label: "Stock Value (₹ Lakhs)",
            data: chartValues,
            backgroundColor: getBgColor(),
            borderColor: "#059669",
            borderWidth: isBar || isCombo ? 1.5 : 2.5,
            borderRadius: isBar || isCombo ? 4 : 0,
            tension: isBar || isCombo ? 0 : 0.3,
            pointBackgroundColor: "#059669",
            pointRadius: getPointRadius(),
            fill: getFill(),
            stepped: isStepped ? "middle" : false
          },
          {
            type: "line",
            label: "Max Stock Limit (₹ Lakhs)",
            data: (chartLabels || []).map(() => stockLimit),
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
              font: { size: 9, family: "'Outfit', 'Inter', sans-serif", weight: 600 },
              boxWidth: 10
            }
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleFont: { family: "'Outfit', 'Inter', sans-serif", size: 11, weight: "bold" },
            bodyFont: { family: "'Outfit', 'Inter', sans-serif", size: 11 },
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
            ticks: { font: { size: 10, family: "'Outfit', 'Inter', sans-serif" } }
          },
          y: {
            type: "linear",
            position: "left",
            title: {
              display: true,
              text: "Stock Value (₹ Lakhs)",
              color: "#059669",
              font: { family: "'Outfit', 'Inter', sans-serif", size: 10, weight: 700 }
            },
            ticks: {
              font: { size: 10, family: "'Outfit', 'Inter', sans-serif" },
              callback: (v) => `₹${v}L`
            },
            grid: { color: "rgba(0,0,0,0.05)" }
          }
        }
      }
    });
  }, [chartLabels, chartValues, targetConfig, chartType]);

  const rebuildToken = `store-stock-chart|${targetConfig?.store_stock_value?.maxStockValueL ?? 50.0}|${JSON.stringify(chartValues)}|${JSON.stringify(chartLabels)}|${chartType}`;

  return (
    <PremiumDashboardView
      title="Store Stock Value"
      icon={Coins}
      color="#059669"
      kpis={kpis}
      setupChart={setupChart}
      rangeHint="Month Wise Stock Value"
      onClose={onClose}
      rebuildToken={rebuildToken}
      noData={chartLabels.length === 0}
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

        {/* Group Multi-Select Dropdown */}
        <div className="pp1-filter-group" ref={categoryRef} style={{ width: "230px", maxWidth: "230px", '--act-color': '#059669' }}>
          <label className="pp1-filter-label">Group</label>
          <div className="pp1-multiselect-wrap">
            <div
              className={`pp1-multiselect-trigger ${(filters.category || []).length > 0 ? 'pp1-multiselect-trigger--active' : ''} ${categoryOpen ? 'pp1-multiselect-trigger--open' : ''}`}
              onClick={() => setCategoryOpen(!categoryOpen)}
            >
              <div className="pp1-multiselect-value" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "calc(100% - 16px)", fontWeight: "500" }}>
                {(filters.category || []).length === 0 ? (
                  <span className="pp1-multiselect-placeholder">All Groups</span>
                ) : (
                  (filters.category || []).join(", ")
                )}
              </div>
              <ChevronDown size={11} className="pp1-dropdown-caret" style={{ transform: categoryOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>

            {categoryOpen && (
              <div className="pp1-multiselect-menu">
                {/* Select All Option */}
                <div
                  className={`pp1-multiselect-option pp1-multiselect-option--all ${isAllSelected ? 'pp1-multiselect-option--selected' : ''}`}
                  onClick={toggleSelectAll}
                >
                  <div className="pp1-multiselect-checkbox-box">
                    {isAllSelected && (
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pp1-multiselect-checkbox-icon">
                        <polyline points="1.5 5.5 3.5 7.5 8.5 2.5" />
                      </svg>
                    )}
                  </div>
                  <span>Select All ({groupsList.length})</span>
                </div>

                {/* Individual Options */}
                {groupsList.map(g => {
                  const isSelected = (filters.category || []).includes(g);
                  return (
                    <div
                      key={g}
                      className={`pp1-multiselect-option ${isSelected ? 'pp1-multiselect-option--selected' : ''}`}
                      onClick={() => toggleGroup(g)}
                    >
                      <div className="pp1-multiselect-checkbox-box">
                        {isSelected && (
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pp1-multiselect-checkbox-icon">
                            <polyline points="1.5 5.5 3.5 7.5 8.5 2.5" />
                          </svg>
                        )}
                      </div>
                      <span>{g}</span>
                    </div>
                  );
                })}
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
              <div className="pp1-custom-select-options" style={{ maxHeight: "250px", overflowY: "auto" }}>
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
                  <BarChart2 size={12} style={{ color: "#059669" }} />
                ) : chartType === "area" ? (
                  <AreaChart size={12} style={{ color: "#059669" }} />
                ) : chartType === "radar" ? (
                  <Radar size={12} style={{ color: "#059669" }} />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} style={{ color: "#059669" }} />
                ) : chartType === "stepped" ? (
                  <Activity size={12} style={{ color: "#059669" }} />
                ) : chartType === "combo" ? (
                  <TrendingUp size={12} style={{ color: "#059669" }} />
                ) : (
                  <LucideLineChart size={12} style={{ color: "#059669" }} />
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
                    <opt.icon size={12} style={{ color: chartType === opt.id ? "#fff" : "#059669" }} />
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

function StoreStockValueReportBottomTable({ data, filters }) {
  const sourceRows = React.useMemo(() => {
    return Array.isArray(data?.storeStockValue?.rows) ? data.storeStockValue.rows : [];
  }, [data?.storeStockValue?.rows]);

  const rows = React.useMemo(() => {
    let list = sourceRows;
    if (filters?.category && filters.category.length > 0) {
      list = list.filter(r => filters.category.includes(r.group));
    }
    if (filters?.itemCode) {
      list = list.filter(r => r.partNo === filters.itemCode);
    }

    return list.map((r, idx) => [
      String(idx + 1),
      r.group || "—",
      r.partNo || "—",
      r.description || "—",
      fmtNum(r.qty),
      r.rate != null ? `₹${Number(r.rate).toLocaleString("en-IN")}` : "—",
      r.stockValue != null ? `₹${Number(r.stockValue).toLocaleString("en-IN")}` : "—"
    ]);
  }, [sourceRows, filters?.category, filters?.itemCode]);

  const columns = ["Sl.No", "Group", "Part No", "Description", "Total Qty", "Rate", "Stock Value"];

  return <PremiumDashboardBottomTable title="Store Stock Registry" columns={columns} rows={rows} />;
}

function OtdReportBottomTable({ data, filters }) {
  const sourceRows = React.useMemo(
    () => (Array.isArray(data?.otd?.rows) ? data.otd.rows : []),
    [data?.otd?.rows]
  );

  const columns = [
    "Sl.No.",
    "Customer Name",
    "PO Number",
    "PO Ref Number",
    "Part Number",
    "Schd Dt",
    "Req Dt",
    "Order Qty",
    "Delivery Qty",
    "Status",
    "Value"
  ];

  const rows = React.useMemo(
    () => sourceRows.map((r, idx) => [
      String(idx + 1),
      r.customerName || "—",
      r.poNumber || "—",
      r.poRefNumber || "—",
      r.partNumber || "—",
      r.schdDate || "—",
      r.reqDate || "—",
      fmtNum(r.orderQty),
      fmtNum(r.deliveryQty),
      r.status || "—",
      r.value != null ? `₹${Number(r.value).toLocaleString("en-IN")}` : "—",
    ]),
    [sourceRows]
  );

  return <PremiumDashboardBottomTable title="OTD Delivery Registry" columns={columns} rows={rows} />;
}

/* ── Supplier Rating View (UI Alone) ────────────────────────────────── */
function SupplierRatingReportDashboardView({ data, filters, onFilterChange, onClose, targetConfig, onSrData }) {
  const [srLive, setSrLive] = useState(null);
  const srSource = srLive || data?.supplierRating;

  useEffect(() => {
    if (!filters.fromDate || !filters.toDate) return;
    const ctrl = new AbortController();
    fetch(buildSupplierRatingUrl(filters.fromDate, filters.toDate, filters), {
      credentials: "include",
      signal: ctrl.signal
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) {
          setSrLive(json);
          onSrData?.(json);
        }
      })
      .catch(() => { });
    return () => ctrl.abort();
  }, [filters.fromDate, filters.toDate, filters.supplier, onSrData]);

  const chartData = Array.isArray(srSource?.data) ? srSource.data : [];
  const chartLabels = Array.isArray(srSource?.labels) ? srSource.labels : [];
  const avgRating = chartData.length > 0 ? (chartData.reduce((a, b) => a + b, 0) / chartData.length).toFixed(1) : "0.0";

  const kpiData = srSource?.kpis || {};
  const avgRatingVal = kpiData.avg_rating != null ? `${kpiData.avg_rating}%` : `${avgRating}%`;
  const onTimeSupplyVal = kpiData.on_time_supply != null ? `${kpiData.on_time_supply}%` : "94.2%";
  const qualityComplianceVal = kpiData.quality_compliance != null ? `${kpiData.quality_compliance}%` : "98.1%";
  const activeSuppliersVal = kpiData.active_suppliers != null ? String(kpiData.active_suppliers) : String(chartLabels.length);

  const kpis = [
    { label: "Avg Rating", value: avgRatingVal, icon: Star, color: "#eab308" },
    { label: "On-Time Supply", value: onTimeSupplyVal, icon: Truck, color: "#3b82f6" },
    { label: "Quality Compliance", value: qualityComplianceVal, icon: CheckCircle2, color: "#10b981" },
    { label: "Active Suppliers", value: activeSuppliersVal, icon: Users, color: "#8b5cf6" }
  ];

  const [suppOpen, setSuppOpen] = useState(false);
  const suppRef = useRef(null);
  const [chartType, setChartType] = useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = useState(false);
  const chartTypeRef = useRef(null);
  const [suppSearch, setSuppSearch] = useState("");

  const allSuppliers = Array.isArray(srSource?.filterOptions?.suppliers)
    ? srSource.filterOptions.suppliers
    : [];

  const filteredSuppliers = useMemo(() => {
    const q = suppSearch.trim().toLowerCase();
    if (!q) return allSuppliers;
    return allSuppliers.filter(s => s.toLowerCase().includes(q));
  }, [suppSearch, allSuppliers]);

  const toggleSupplier = (s) => {
    const current = filters.supplier || [];
    const next = current.includes(s) ? current.filter(x => x !== s) : [...current, s];
    onFilterChange(prev => ({ ...prev, supplier: next }));
  };

  const isAllSuppSelected = allSuppliers.length > 0 && (filters.supplier || []).length === allSuppliers.length;
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

      let mainDataset = {
        label: "Supplier Performance Score (%)",
        data: chartData,
        order: 2
      };

      let datasets = [];

      // 1. Target line (always present except in Polar Area chart)
      if (chartType !== "polarArea") {
        datasets.push({
          type: chartType === "radar" ? "radar" : "line",
          label: `Target ${targetVal}%`,
          data: Array(Math.max(1, chartLabels.length)).fill(targetVal),
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

      return createPp1Chart(canvas, {
        type: chartType === "polarArea" ? "polarArea" : (chartType === "radar" ? "radar" : (chartType === "bar" ? "bar" : "line")),
        data: {
          labels: chartLabels,
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
            },
            datalabels: pp1DataLabelsPercent({ maxPoints: 96, accentColor: "rgba(234, 179, 8, 0.92)" }),
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
              suggestedMin: 0,
              suggestedMax: 100
            }
          } : {
            x: {
              grid: { display: false, drawBorder: false },
              ticks: {
                display: false,
                font: { family: "Outfit, Inter, sans-serif", size: 10, weight: "500" },
                color: "#64748b"
              }
            },
            y: {
              min: 0,
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
    [targetConfig?.supplier_rating?.minRating, chartType, chartData, chartLabels]
  );

  const rebuildToken = `supplier-rating-chart|${targetConfig?.supplier_rating?.minRating ?? 90}|${chartType}|${JSON.stringify(chartData)}|${JSON.stringify(chartLabels)}`;

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
      noData={chartLabels.length === 0}
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
                  <div style={{ position: "relative", width: "100%" }}>
                    <input
                      type="text"
                      className="pp1-filter-input"
                      placeholder="Search supplier..."
                      style={{
                        width: "100%",
                        height: "24px",
                        padding: "2px 24px 2px 8px",
                        fontSize: "10.5px",
                        borderRadius: "6px",
                        border: "1px solid rgba(226, 232, 240, 0.9)",
                        color: "#334155"
                      }}
                      value={suppSearch}
                      onChange={e => setSuppSearch(e.target.value)}
                      onClick={e => e.stopPropagation()}
                    />
                    {suppSearch && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSuppSearch("");
                        }}
                        style={{
                          position: "absolute",
                          right: "6px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#64748b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "2px"
                        }}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
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

function SupplierRatingBottomTable({ data, filters }) {
  const columns = [
    "Sl.No",
    "Supplier Name",
    "Category",
    "Total Orders",
    "On-Time Delivery %",
    "Quality Pass %",
    "Overall Rating",
    "Status"
  ];

  const allRows = Array.isArray(data?.supplierRating?.rows)
    ? data.supplierRating.rows.map(r => ({
      supplier: r.supplierName,
      partNo: "",
      date: "",
      cols: [
        r.supplierName,
        r.category || "—",
        r.totalOrders != null ? String(r.totalOrders) : "—",
        r.onTimeDelivery != null ? `${r.onTimeDelivery}%` : "—",
        r.qualityPass != null ? `${r.qualityPass}%` : "—",
        r.overallRating != null ? `${r.overallRating}%` : "—",
        r.status || "—"
      ]
    }))
    : [];

  const rows = React.useMemo(() => {
    let list = allRows;
    if (filters?.supplier && filters.supplier.length > 0) {
      list = list.filter(r => filters.supplier.includes(r.supplier));
    }
    if (filters?.partNo) {
      list = list.filter(r => r.partNo.toLowerCase().includes(filters.partNo.toLowerCase()));
    }
    return list.map((r, idx) => [
      String(idx + 1),
      ...r.cols
    ]);
  }, [allRows, filters?.supplier, filters?.partNo]);

  return <PremiumDashboardBottomTable title="Supplier Rating Registry" columns={columns} rows={rows} />;
}

/* ── Vendor Rating View (Real Data Integration) ───────────────────── */
function VendorRatingReportDashboardView({ data, filters, onFilterChange, onClose, targetConfig, onVrData }) {
  const [vrLive, setVrLive] = useState(null);
  const vrSource = vrLive || data?.vendorRating;

  useEffect(() => {
    if (!filters.fromDate || !filters.toDate) return;
    const ctrl = new AbortController();
    fetch(buildVendorRatingUrl(filters.fromDate, filters.toDate, filters), {
      credentials: "include",
      signal: ctrl.signal
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) {
          setVrLive(json);
          onVrData?.(json);
        }
      })
      .catch(() => { });
    return () => ctrl.abort();
  }, [filters.fromDate, filters.toDate, filters.vendor, onVrData]);

  const chartData = Array.isArray(vrSource?.data) ? vrSource.data : [];
  const chartLabels = Array.isArray(vrSource?.labels) ? vrSource.labels : [];
  const avgRating = chartData.length > 0 ? (chartData.reduce((a, b) => a + b, 0) / chartData.length).toFixed(1) : "0.0";

  const kpiData = vrSource?.kpis || {};
  const avgRatingVal = kpiData.avg_rating != null ? `${kpiData.avg_rating}%` : `${avgRating}%`;
  const onTimeSupplyVal = kpiData.on_time_supply != null ? `${kpiData.on_time_supply}%` : "—";
  const qualityComplianceVal = kpiData.quality_compliance != null ? `${kpiData.quality_compliance}%` : "—";
  const activeVendorsVal = kpiData.active_suppliers != null ? String(kpiData.active_suppliers) : String(chartLabels.length);

  const kpis = [
    { label: "Avg Rating", value: avgRatingVal, icon: Award, color: "#3b82f6" },
    { label: "On-Time Supply", value: onTimeSupplyVal, icon: Truck, color: "#10b981" },
    { label: "Quality Compliance", value: qualityComplianceVal, icon: CheckCircle2, color: "#8b5cf6" },
    { label: "Active Vendors", value: activeVendorsVal, icon: Users, color: "#eab308" }
  ];

  const [vendOpen, setVendOpen] = useState(false);
  const vendRef = useRef(null);
  const [chartType, setChartType] = useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = useState(false);
  const chartTypeRef = useRef(null);
  const [vendSearch, setVendSearch] = useState("");

  const allVendors = Array.isArray(vrSource?.filterOptions?.vendors)
    ? vrSource.filterOptions.vendors
    : [];

  const filteredVendors = useMemo(() => {
    const q = vendSearch.trim().toLowerCase();
    if (!q) return allVendors;
    return allVendors.filter(v => v.toLowerCase().includes(q));
  }, [vendSearch, allVendors]);

  const toggleVendor = (v) => {
    const current = filters.vendor || [];
    const next = current.includes(v) ? current.filter(x => x !== v) : [...current, v];
    onFilterChange(prev => ({ ...prev, vendor: next }));
  };

  const isAllVendSelected = allVendors.length > 0 && (filters.vendor || []).length === allVendors.length;
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

      let mainDataset = {
        label: "Vendor Performance Score (%)",
        data: chartData,
        order: 2
      };

      let datasets = [];

      if (chartType !== "polarArea") {
        datasets.push({
          type: chartType === "radar" ? "radar" : "line",
          label: `Target ${targetVal}%`,
          data: Array(Math.max(1, chartLabels.length)).fill(targetVal),
          borderColor: "#ef4444",
          borderDash: [6, 3],
          backgroundColor: "transparent",
          tension: 0,
          fill: false,
          pointRadius: 0,
          order: 1
        });
      }

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

      return createPp1Chart(canvas, {
        type: chartType === "polarArea" ? "polarArea" : (chartType === "radar" ? "radar" : (chartType === "bar" ? "bar" : "line")),
        data: {
          labels: chartLabels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: {
                boxWidth: 10, boxHeight: 10, usePointStyle: true,
                font: { family: "Outfit, Inter, sans-serif", size: 10, weight: "500" },
                color: "#475569"
              }
            },
            tooltip: {
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              titleFont: { family: "Outfit, Inter, sans-serif", size: 11, weight: "600" },
              bodyFont: { family: "Outfit, Inter, sans-serif", size: 11 },
              padding: 10, cornerRadius: 8, displayColors: true,
              boxWidth: 7, boxHeight: 7, usePointStyle: true,
              borderColor: "rgba(255, 255, 255, 0.1)", borderWidth: 1,
            },
            datalabels: pp1DataLabelsPercent({ maxPoints: 96, accentColor: "rgba(59, 130, 246, 0.92)" }),
          },
          scales: (chartType === "radar" || chartType === "polarArea") ? {
            r: {
              angleLines: { display: chartType === "radar", color: "rgba(226, 232, 240, 0.8)" },
              grid: { circular: true, color: "rgba(226, 232, 240, 0.6)" },
              ticks: {
                display: true,
                font: { family: "Outfit, Inter, sans-serif", size: 9, weight: "500" },
                color: "#64748b", backdropColor: "transparent"
              },
              suggestedMin: 0, suggestedMax: 100
            }
          } : {
            x: {
              grid: { display: false, drawBorder: false },
              ticks: { display: false, font: { family: "Outfit, Inter, sans-serif", size: 10, weight: "500" }, color: "#64748b" }
            },
            y: {
              min: 0, max: 100,
              grid: { color: "rgba(226, 232, 240, 0.6)", borderDash: [4, 4], drawBorder: false },
              ticks: {
                callback: (val) => `${val}%`,
                font: { family: "Outfit, Inter, sans-serif", size: 10, weight: "500" }, color: "#64748b"
              }
            }
          }
        }
      });
    },
    [targetConfig?.vendor_rating?.minRating, chartType, chartData, chartLabels]
  );

  const rebuildToken = `vendor-rating-chart|${targetConfig?.vendor_rating?.minRating ?? 90}|${chartType}|${JSON.stringify(chartData)}|${JSON.stringify(chartLabels)}`;

  return (
    <PremiumDashboardView
      title="Vendor Rating"
      icon={Award}
      color="#3b82f6"
      kpis={kpis}
      setupChart={setupChart}
      chartHeight={260}
      rangeHint="Vendor Wise Rating Score"
      onClose={onClose}
      rebuildToken={rebuildToken}
      noData={chartLabels.length === 0}
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
                <div style={{ padding: "2px 4px 6px 4px", position: "relative" }}>
                  <input
                    type="text"
                    className="pp1-filter-input"
                    placeholder="Search vendor..."
                    style={{
                      width: "100%",
                      height: "24px",
                      padding: "2px 24px 2px 8px",
                      fontSize: "10.5px",
                      borderRadius: "6px",
                      border: "1px solid rgba(226, 232, 240, 0.9)",
                      color: "#334155",
                      boxSizing: "border-box"
                    }}
                    value={vendSearch}
                    onChange={e => setVendSearch(e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                  {vendSearch && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVendSearch("");
                      }}
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "40%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#94a3b8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "2px"
                      }}
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  )}
                </div>

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

        {/* Chart Type Dropdown */}
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
                {[
                  { key: "line", icon: <LucideLineChart size={12} />, label: "Line Chart" },
                  { key: "bar", icon: <BarChart2 size={12} />, label: "Bar Chart" },
                  { key: "area", icon: <AreaChart size={12} />, label: "Area Chart" },
                  { key: "radar", icon: <Radar size={12} />, label: "Radar Chart" },
                  { key: "polarArea", icon: <PieChart size={12} />, label: "Polar Area" },
                  { key: "stepped", icon: <Activity size={12} />, label: "Stepped Chart" },
                ].map(({ key, icon, label }) => (
                  <div
                    key={key}
                    className={`pp1-part-suggestion-item pp1-dropdown-item ${chartType === key ? "selected" : ""}`}
                    onClick={() => { setChartType(key); setChartTypeOpen(false); }}
                  >
                    {icon}
                    <span>{label}</span>
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

function VendorRatingBottomTable({ data, filters }) {
  const columns = [
    "Sl.No",
    "Vendor Name",
    "Total Job Orders",
    "On-Time Delivery %",
    "Quality Pass %",
    "Overall Rating",
    "Quality Status",
    "Delivery Status",
    "Total Status",
    "Action To Be Taken"
  ];

  const allRows = Array.isArray(data?.vendorRating?.rows)
    ? data.vendorRating.rows.map(r => ({
      vendor: r.vendorName,
      cols: [
        r.vendorName || "—",
        r.totalOrders != null ? String(r.totalOrders) : "—",
        r.onTimeDelivery != null ? `${r.onTimeDelivery}%` : "—",
        r.qualityPass != null ? `${r.qualityPass}%` : "—",
        r.overallRating != null ? `${r.overallRating}%` : "—",
        r.qualityStatus || "—",
        r.deliveryStatus || "—",
        r.totalStatus || "—",
        r.actionToBeTaken || "—",
      ]
    }))
    : [];

  const rows = React.useMemo(() => {
    let list = allRows;
    if (filters?.vendor && filters.vendor.length > 0) {
      list = list.filter(r => filters.vendor.includes(r.vendor));
    }
    return list.map((r, idx) => [
      String(idx + 1),
      ...r.cols
    ]);
  }, [allRows, filters?.vendor]);

  return <PremiumDashboardBottomTable title="Vendor Rating Registry" columns={columns} rows={rows} />;
}

/* ── FG Value View (Real Data Integration) ────────────────────────── */
function FgValueReportDashboardView({ data, loading, filters, onFilterChange, onClose, targetConfig, uid, onFgValueData }) {
  const [fgValueLive, setFgValueLive] = React.useState(null);
  const [fgValueLoading, setFgValueLoading] = React.useState(false);
  const fgValueSource = fgValueLive || data?.fgValueCompare;

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

  React.useEffect(() => {
    const ctrl = new AbortController();
    setFgValueLoading(true);
    fetch(buildFgValueUrl(), {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok || json?.error) throw new Error(json?.error || "FG Value load failed");
        setFgValueLive(json);
        onFgValueData?.(json);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setFgValueLive(null);
        onFgValueData?.(data?.fgValueCompare || null);
      })
      .finally(() => setFgValueLoading(false));
    return () => ctrl.abort();
  }, [uid, onFgValueData, data?.fgValueCompare]);

  const fgRows = React.useMemo(() => {
    const rawRows = Array.isArray(fgValueSource?.rows) ? fgValueSource.rows : [];
    return rawRows.filter(r => (Number(r.finalInspQty) || 0) > 0 || (Number(r.dcQty) || 0) > 0);
  }, [fgValueSource?.rows]);

  const filteredRows = React.useMemo(() => {
    let list = fgRows;
    if (filters?.customer && filters.customer.length > 0) {
      list = list.filter(r => filters.customer.includes(r.customerName));
    }
    if (filters?.itemCode) {
      list = list.filter(r => r.partNo === filters.itemCode);
    }
    return list;
  }, [fgRows, filters?.customer, filters?.itemCode]);

  const allCustomers = React.useMemo(() => {
    const list = Array.isArray(fgRows) ? fgRows.map(r => r.customerName) : [];
    return [...new Set(list)].filter(Boolean).sort();
  }, [fgRows]);

  const allItemCodes = React.useMemo(() => {
    const list = Array.isArray(fgRows) ? fgRows.map(r => r.partNo) : [];
    return [...new Set(list)].filter(Boolean).sort();
  }, [fgRows]);

  const filteredCustomers = React.useMemo(() => {
    const q = custSearch.trim().toLowerCase();
    if (!q) return allCustomers;
    return allCustomers.filter(c => c.toLowerCase().includes(q));
  }, [custSearch, allCustomers]);

  const toggleCustomer = (c) => {
    const current = filters.customer || [];
    const next = current.includes(c) ? current.filter(x => x !== c) : [...current, c];
    onFilterChange(prev => ({ ...prev, customer: next }));
  };

  const isAllCustSelected = (filters.customer || []).length === allCustomers.length && allCustomers.length > 0;
  const toggleSelectAllCust = () => {
    onFilterChange(prev => ({
      ...prev,
      customer: isAllCustSelected ? [] : [...allCustomers]
    }));
  };

  const itemSuggestions = React.useMemo(() => {
    if (!filters.itemCode) return allItemCodes;
    return allItemCodes.filter(i => i.toLowerCase().includes(filters.itemCode.toLowerCase()));
  }, [filters.itemCode, allItemCodes]);

  const kpis = React.useMemo(() => {
    const totalValRub = filteredRows.reduce((sum, r) => sum + (Number(r.finalInspectionValue) || 0) + (Number(r.dispatchValue) || 0), 0);
    const totalValLakhs = totalValRub / 100000.0;

    const uniqueItems = new Set(filteredRows.map(r => r.partNo)).size;
    const uniqueCusts = new Set(filteredRows.map(r => r.customerName)).size;
    const totalQty = filteredRows.reduce((sum, r) => sum + (Number(r.finalInspQty) || 0) + (Number(r.dcQty) || 0), 0);

    return [
      { label: "Total FG Value", value: `₹${totalValLakhs.toFixed(2)}L`, icon: Package, color: "#ec4899" },
      { label: "Available Items", value: String(uniqueItems), icon: ClipboardList, color: "#10b981" },
      { label: "FG Customers", value: String(uniqueCusts), icon: Users, color: "#3b82f6" },
      { label: "Total Qty", value: totalQty.toLocaleString(), icon: ClipboardList, color: "#eab308" }
    ];
  }, [filteredRows]);

  const currentMonthName = React.useMemo(() => {
    const today = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[today.getMonth()];
    const year = String(today.getFullYear()).slice(-2);
    return `${month}-${year}`;
  }, []);

  const customerChartData = React.useMemo(() => {
    const map = {};
    filteredRows.forEach(r => {
      const c = r.customerName || "—";
      const val = (Number(r.finalInspectionValue) || 0) + (Number(r.dispatchValue) || 0);
      map[c] = (map[c] || 0) + val;
    });
    const entries = Object.entries(map).map(([cust, val]) => ({
      customer: cust,
      value: Number((val / 100000.0).toFixed(2))
    })).sort((a, b) => b.value - a.value);

    return {
      labels: entries.map(e => e.customer),
      data: entries.map(e => e.value)
    };
  }, [filteredRows]);

  const setupChart = React.useCallback(
    (canvas) => {
      const targetVal = targetConfig?.fg_value?.maxStockValueL ?? 60.0;
      const ctx = canvas.getContext("2d");

      let mainDataset = {
        label: "FG Value (₹ Lakhs)",
        data: customerChartData.data,
        order: 2
      };

      let datasets = [];

      // 1. Limit line (always present except in Polar Area chart)
      if (chartType !== "polarArea") {
        datasets.push({
          label: `Limit ₹${targetVal}L`,
          data: Array(customerChartData.labels.length).fill(targetVal),
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
        const opacities = [0.45, 0.53, 0.61, 0.69, 0.77, 0.85];
        mainDataset = {
          ...mainDataset,
          type: "polarArea",
          backgroundColor: opacities.map((o, i) => `rgba(236, 72, 153, ${opacities[i % opacities.length]})`),
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

      return createPp1Chart(canvas, {
        type: chartType === "polarArea" ? "polarArea" : (chartType === "radar" ? "radar" : (chartType === "bar" ? "bar" : "line")),
        data: {
          labels: customerChartData.labels,
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
              callbacks: {
                title: (context) => {
                  const idx = context[0].dataIndex;
                  return customerChartData.labels[idx] || "";
                },
                label: (context) => {
                  const val = context.raw;
                  return `FG Value: ₹${val}L`;
                }
              }
            },
            datalabels: pp1DataLabelsLakhs({ maxPoints: 96 }),
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
    [customerChartData, targetConfig?.fg_value?.maxStockValueL, chartType]
  );

  const handleInputChange = (field, val) => {
    onFilterChange(prev => ({ ...prev, [field]: val }));
  };

  const handleReset = () => {
    onFilterChange({
      customer: [],
      itemCode: ""
    });
    setChartType("line");
    setCustSearch("");
  };

  const rebuildToken = `fg-value-chart|${targetConfig?.fg_value?.maxStockValueL ?? 60.0}|${JSON.stringify(customerChartData.data)}|${chartType}`;

  return (
    <PremiumDashboardView
      title="FG Value"
      icon={Package}
      color="#ec4899"
      kpis={kpis}
      setupChart={setupChart}
      chartHeight={260}
      rangeHint={`Customer Wise FG Stock Value — ${currentMonthName}`}
      onClose={onClose}
      rebuildToken={rebuildToken}
      loading={loading || fgValueLoading}
      noData={filteredRows.length === 0}
    >
      <div className="pp1-filters-bar" style={{ marginBottom: "6px" }}>
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

function FgValueReportBottomTable({ data, filters }) {
  const fgRows = React.useMemo(
    () => (Array.isArray(data?.fgValueCompare?.rows) ? data.fgValueCompare.rows : []),
    [data?.fgValueCompare?.rows]
  );

  const rows = React.useMemo(() => {
    let list = fgRows;
    if (filters?.customer && filters.customer.length > 0) {
      list = list.filter(r => filters.customer.includes(r.customerName));
    }
    if (filters?.itemCode) {
      list = list.filter(r => r.partNo === filters.itemCode);
    }

    return list.map((row, idx) => {
      const finalInspVal = Number(row.finalInspectionValue) || 0;
      const dispatchVal = Number(row.dispatchValue) || 0;
      const totalVal = finalInspVal + dispatchVal;

      return [
        String(idx + 1),
        row.customerName || "—",
        row.partNo || "—",
        row.description || "—",
        (Number(row.finalInspQty) || 0).toLocaleString(),
        (Number(row.dcQty) || 0).toLocaleString(),
        `₹${(Number(row.rate) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `₹${finalInspVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `₹${dispatchVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `₹${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    });
  }, [fgRows, filters?.customer, filters?.itemCode]);

  const columns = [
    "Sl.No",
    "Customer Name",
    "Part Number",
    "Description",
    "Final Insp. Qty",
    "Dispatch Qty",
    "Rate",
    "Final Insp. Value",
    "Dispatch Value",
    "Total Value"
  ];

  return <PremiumDashboardBottomTable title="Finished Goods (FG) Registry" columns={columns} rows={rows} />;
}

/* ── Daily Production View (UI Alone) ────────────────────────────────── */
/* ── Daily Production View ──────────────────────────────────────────────── */
function filterDailyProdRows(rows, filters, defaultFrom, defaultTo) {
  const source = Array.isArray(rows) ? rows : [];
  const activeFrom = filters?.fromDate || defaultFrom;
  const activeTo = filters?.toDate || defaultTo;
  return source.filter((r) => {
    const d = (r.date || "").slice(0, 10);
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    if (d < activeFrom || d > activeTo) return false;
    if (filters?.machineNo) {
      const macList = String(filters.machineNo).split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
      if (macList.length > 0) {
        const mac = String(r.machine || "").toLowerCase();
        const name = String(r.machineName || "").toLowerCase();
        const matched = macList.some(m => mac.includes(m) || name.includes(m));
        if (!matched) return false;
      }
    }
    return true;
  });
}

function DailyProductionDashboardView({ data, loading, filters, onFilterChange, onClose, targetConfig, uid, onDailyProdData }) {
  const [dailyProdLive, setDailyProdLive] = React.useState(null);
  const [dailyProdLoading, setDailyProdLoading] = React.useState(false);
  const dailyProdSource = dailyProdLive || data?.dailyProductionCompare;

  const [chartType, setChartType] = React.useState("combo");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
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
      machineNo: ""
    });
    setChartType("combo");
  };

  React.useEffect(() => {
    const ctrl = new AbortController();
    setDailyProdLoading(true);
    const fy = currentFinancialYearRange();
    fetch(buildDailyProdUrl(fy.from, fy.to, filters?.machineNo), {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok || json?.error) throw new Error(json?.error || "Daily Production load failed");
        setDailyProdLive(json);
        onDailyProdData?.(json);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setDailyProdLive(null);
        onDailyProdData?.(data?.dailyProductionCompare || null);
      })
      .finally(() => setDailyProdLoading(false));
    return () => ctrl.abort();
  }, [uid, onDailyProdData, data?.dailyProductionCompare, filters?.machineNo]);

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return { from: `${year}-${month}-01`, to: `${year}-${month}-${day}` };
  }, []);

  const dailyProdRows = React.useMemo(
    () => (Array.isArray(dailyProdSource?.rows) ? dailyProdSource.rows : []),
    [dailyProdSource?.rows]
  );

  const filteredRows = React.useMemo(
    () => filterDailyProdRows(dailyProdRows, filters, defaultRange.from, defaultRange.to),
    [dailyProdRows, filters, defaultRange]
  );

  const machineSummary = React.useMemo(() => {
    const byMac = {};
    filteredRows.forEach((r) => {
      const mac = r.machine || "—";
      if (!byMac[mac]) byMac[mac] = { machine: mac, rateSum: 0, rateCount: 0, planned: 0, balance: 0, loss: 0 };
      byMac[mac].planned += Number(r.planned || 0);
      byMac[mac].balance += Number(r.balance || 0);
      byMac[mac].loss += Number(r.loss || 0);
      byMac[mac].rateSum += Number(r.rate || 0);
      byMac[mac].rateCount += 1;
    });
    return Object.keys(byMac).sort().map((mac) => {
      const g = byMac[mac];
      return {
        machine: g.machine,
        rate: g.rateCount ? Math.round((g.rateSum / g.rateCount) * 10) / 10 : 0,
        planned: Math.round(g.planned * 10) / 10,
        balance: Math.round(g.balance * 10) / 10,
        loss: Math.round(g.loss),
      };
    });
  }, [filteredRows]);

  const filteredData = machineSummary;

  const machines = React.useMemo(() => {
    const api = dailyProdSource?.filterOptions?.machines;
    if (Array.isArray(api) && api.length) return api;
    return Array.from(new Set(dailyProdRows.map((d) => d.machine).filter(Boolean)));
  }, [dailyProdSource?.filterOptions?.machines, dailyProdRows]);



  const totalPlanned = React.useMemo(() => {
    return Math.round(filteredData.reduce((acc, r) => acc + Number(r.planned || 0), 0) * 10) / 10;
  }, [filteredData]);

  const totalBalance = React.useMemo(() => {
    return Math.round(filteredData.reduce((acc, r) => acc + Number(r.balance || 0), 0) * 10) / 10;
  }, [filteredData]);

  const totalLoss = React.useMemo(() => {
    return Math.round(filteredData.reduce((acc, r) => acc + Number(r.loss || 0), 0));
  }, [filteredData]);

  const avgRate = React.useMemo(() => {
    if (filteredData.length === 0) return 0;
    const sum = filteredData.reduce((acc, r) => acc + Number(r.rate || 0), 0);
    return (sum / filteredData.length).toFixed(1);
  }, [filteredData]);

  const chartLabels = React.useMemo(() => filteredData.map(r => r.machine), [filteredData]);
  const plannedData = React.useMemo(() => filteredData.map(r => Number(r.planned || 0)), [filteredData]);
  const balanceData = React.useMemo(() => filteredData.map(r => Number(r.balance || 0)), [filteredData]);
  const lossData = React.useMemo(() => filteredData.map(r => Number(r.loss || 0)), [filteredData]);

  const setupChart = React.useCallback(
    (canvas) => {
      const targetVal = targetConfig?.daily_production?.maxBalanceHours ?? 4.0;

      const fmtHrs = (v) => {
        if (v == null || Number.isNaN(Number(v))) return "";
        const n = Number(v);
        if (n >= 1000) return `${(n / 1000).toFixed(1)}k h`;
        return `${n % 1 === 0 ? n : n.toFixed(1)}h`;
      };
      const fmtLoss = (v) => {
        if (v == null || Number.isNaN(Number(v))) return "";
        const n = Number(v);
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
        return `₹${n}`;
      };

      const isCombo = chartType === "combo";
      const isBar = chartType === "bar";
      const isLine = chartType === "line";
      const isArea = chartType === "area";
      const isStepped = chartType === "stepped";
      const isRadar = chartType === "radar";
      const isPolarArea = chartType === "polarArea";

      const datasets = [];

      // 1. Production Loss Dataset (Only on Cartesian scales: combo, bar, line, area, stepped)
      if (!isRadar && !isPolarArea) {
        const dsType = (isCombo || isLine || isArea || isStepped) ? "line" : "bar";
        datasets.push({
          type: dsType,
          label: "Production Loss (₹)",
          data: lossData,
          borderColor: "#0ea5e9",
          backgroundColor: isArea ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.08)",
          borderWidth: 2.5,
          tension: 0.35,
          fill: isArea,
          pointRadius: (isLine || isArea || isStepped || isCombo) ? 5 : 0,
          pointBackgroundColor: "#0ea5e9",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          yAxisID: "y1",
          order: 1,
          datalabels: {
            display: (ctx) => {
              const v = Number(ctx.dataset.data[ctx.dataIndex]);
              return v > 0;
            },
            anchor: "end",
            align: "top",
            offset: 4,
            color: "#ffffff",
            backgroundColor: "rgba(14, 165, 233, 0.88)",
            borderRadius: 5,
            padding: { top: 2, bottom: 2, left: 5, right: 5 },
            font: { family: PP1_FONT, size: 8, weight: "700" },
            formatter: (v) => fmtLoss(v),
            clip: false,
          }
        });
      }

      // 2. Planned Hours Dataset
      datasets.push({
        type: isRadar ? "radar" : isPolarArea ? "polarArea" : (isLine || isArea || isStepped) ? "line" : "bar",
        label: "Production Planned Hrs",
        data: plannedData,
        backgroundColor: isRadar ? "rgba(132, 204, 22, 0.2)" : isPolarArea ? "rgba(132, 204, 22, 0.4)" : "rgba(132, 204, 22, 0.82)",
        borderColor: "#65a30d",
        borderWidth: isRadar ? 2 : 1,
        borderRadius: (isRadar || isPolarArea) ? 0 : 5,
        borderSkipped: false,
        stepped: isStepped ? "middle" : false,
        fill: isArea || isRadar,
        pointRadius: (isLine || isArea || isStepped || isRadar) ? 4 : 0,
        yAxisID: (isRadar || isPolarArea) ? undefined : "y",
        order: 2,
        datalabels: {
          display: (ctx) => {
            const v = Number(ctx.dataset.data[ctx.dataIndex]);
            return v > 0;
          },
          anchor: "end",
          align: isRadar ? "top" : "end",
          offset: 2,
          color: "#ffffff",
          backgroundColor: "rgba(101, 163, 13, 0.90)",
          borderRadius: 5,
          padding: { top: 2, bottom: 2, left: 5, right: 5 },
          font: { family: PP1_FONT, size: 8, weight: "700" },
          formatter: (v) => fmtHrs(v),
          clip: false,
        }
      });

      // 3. Balance Hours Dataset
      datasets.push({
        type: isRadar ? "radar" : isPolarArea ? "polarArea" : (isLine || isArea || isStepped) ? "line" : "bar",
        label: "Balance Hrs",
        data: balanceData,
        backgroundColor: isRadar ? "rgba(248, 113, 113, 0.2)" : isPolarArea ? "rgba(248, 113, 113, 0.4)" : "rgba(248, 113, 113, 0.82)",
        borderColor: "#ef4444",
        borderWidth: isRadar ? 2 : 1,
        borderRadius: (isRadar || isPolarArea) ? 0 : 5,
        borderSkipped: false,
        stepped: isStepped ? "middle" : false,
        fill: isArea || isRadar,
        pointRadius: (isLine || isArea || isStepped || isRadar) ? 4 : 0,
        yAxisID: (isRadar || isPolarArea) ? undefined : "y",
        order: 3,
        datalabels: {
          display: (ctx) => {
            const v = Number(ctx.dataset.data[ctx.dataIndex]);
            return v > 0;
          },
          anchor: "end",
          align: isRadar ? "top" : "end",
          offset: 2,
          color: "#ffffff",
          backgroundColor: "rgba(220, 38, 38, 0.88)",
          borderRadius: 5,
          padding: { top: 2, bottom: 2, left: 5, right: 5 },
          font: { family: PP1_FONT, size: 8, weight: "700" },
          formatter: (v) => fmtHrs(v),
          clip: false,
        }
      });

      // 4. Limit line (except in Polar Area)
      if (chartType !== "polarArea") {
        datasets.push({
          type: isRadar ? "radar" : "line",
          label: `Limit ${targetVal} Hrs`,
          data: Array(chartLabels.length).fill(targetVal),
          borderColor: "#ef4444",
          backgroundColor: "transparent",
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          yAxisID: isRadar ? undefined : "y",
          order: 4,
          datalabels: { display: false }
        });
      }

      return createPp1Chart(canvas, {
        type: isRadar ? "radar" : isPolarArea ? "polarArea" : "bar",
        data: {
          labels: chartLabels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 28, right: 8, bottom: 8, left: 4 } },
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: {
                boxWidth: 12,
                font: { size: 10 },
                padding: 12,
                usePointStyle: true,
                pointStyleWidth: 10,
              }
            },
            datalabels: { display: false },
            tooltip: {
              mode: "index",
              intersect: false,
              backgroundColor: "rgba(15,23,42,0.92)",
              titleColor: "#f1f5f9",
              bodyColor: "#cbd5e1",
              borderColor: "rgba(255,255,255,0.08)",
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label(ctx) {
                  const v = ctx.parsed.y;
                  if (v == null || Number.isNaN(v)) return null;
                  if (ctx.dataset.yAxisID === "y1") {
                    return ` ${ctx.dataset.label}: ${fmtLoss(v)}`;
                  }
                  const label = ctx.dataset.label || "";
                  if (/limit/i.test(label)) return ` ${label}: ${v}h`;
                  return ` ${label}: ${fmtHrs(v)}`;
                }
              }
            }
          },
          scales: (isRadar || isPolarArea) ? {
            r: {
              angleLines: { color: "rgba(0, 0, 0, 0.05)" },
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              pointLabels: {
                font: { family: PP1_FONT, size: 9, weight: "600" },
                color: "#475569"
              },
              ticks: {
                backdropColor: "transparent",
                color: "#64748b",
                font: { family: PP1_FONT, size: 8 },
                callback: (v) => `${v}h`
              }
            }
          } : {
            x: {
              grid: { display: false },
              border: { display: false }
            },
            y: {
              type: "linear",
              position: "left",
              beginAtZero: true,
              grid: { color: "rgba(0,0,0,0.04)", drawTicks: false },
              border: { display: false, dash: [4, 4] },
              title: {
                display: true,
                text: "Hours",
                font: { size: 10, weight: "600" },
                color: "#64748b"
              },
              ticks: {
                padding: 6,
                callback: (v) => {
                  if (v >= 1000) return `${(v / 1000).toFixed(0)}kh`;
                  return `${v}h`;
                }
              }
            },
            y1: {
              type: "linear",
              position: "right",
              beginAtZero: true,
              grid: { drawOnChartArea: false },
              border: { display: false },
              title: {
                display: true,
                text: "Loss (₹)",
                font: { size: 10, weight: "600" },
                color: "#0ea5e9"
              },
              ticks: {
                padding: 6,
                color: "#0ea5e9",
                callback: (v) => {
                  if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`;
                  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
                  return `₹${v}`;
                }
              }
            }
          }
        }
      });
    },
    [chartLabels, plannedData, balanceData, lossData, targetConfig?.daily_production?.maxBalanceHours, chartType]
  );

  const kpis = [
    { label: "Planned Hours", value: (loading || dailyProdLoading) && !filteredData.length ? "…" : `${totalPlanned} Hrs`, icon: ClipboardList, color: "#84cc16" },
    { label: "Balance Hours", value: (loading || dailyProdLoading) && !filteredData.length ? "…" : `${totalBalance} Hrs`, icon: Timer, color: "#f87171" },
    { label: "Total Loss Value", value: (loading || dailyProdLoading) && !filteredData.length ? "…" : `₹${totalLoss.toLocaleString()}`, icon: AlertTriangle, color: "#0ea5e9" },
    { label: "Avg Rate/Hr", value: (loading || dailyProdLoading) && !filteredData.length ? "…" : `₹${avgRate}`, icon: Activity, color: "#0f766e" }
  ];

  const rebuildToken = `daily-prod-chart|${targetConfig?.daily_production?.maxBalanceHours ?? 4.0}|${JSON.stringify(filteredData)}|${filters.machineNo}|${filters.fromDate}|${filters.toDate}|${dailyProdLoading}|${chartType}`;

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
      noData={filteredRows.length === 0}
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

        {/* Machine No Multi-Select Dropdown */}
        <div className="pp1-filter-group" style={{ width: "230px", maxWidth: "230px" }}>
          <label className="pp1-filter-label">Machine No</label>
          <Pp1SearchableMultiSelect
            value={filters.machineNo || ""}
            options={machines}
            onChange={(val) => handleInputChange("machineNo", val)}
            placeholder="Select Machines..."
            allLabel="All Machines"
            searchPlaceholder="Search machine..."
          />
        </div>

        {/* Chart Type Dropdown */}
        <div className="pp1-filter-group" ref={chartTypeRef}>
          <label className="pp1-filter-label">Chart Type</label>
          <div className="pp1-custom-select-wrap" style={{ position: "relative" }}>
            <button
              type="button"
              className={`pp1-custom-select-trigger ${chartTypeOpen ? "open" : ""}`}
              onClick={() => setChartTypeOpen(!chartTypeOpen)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 12px",
                background: "#fcfdfe",
                border: "1.5px solid #d1e2ff",
                borderRadius: "8px",
                fontFamily: PP1_FONT,
                fontSize: "12px",
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
                height: "28px",
                minWidth: "120px",
                boxSizing: "border-box"
              }}
            >
              <span>
                {chartType === "combo" ? "Combo" :
                  chartType === "line" ? "Line" :
                    chartType === "bar" ? "Bar" :
                      chartType === "area" ? "Area" :
                        chartType === "radar" ? "Radar" :
                          chartType === "polarArea" ? "Polar Area" :
                            chartType === "stepped" ? "Stepped" : "Combo"}
              </span>
              <ChevronDown size={11} style={{ color: "#94a3b8", marginLeft: "6px" }} />
            </button>

            {chartTypeOpen && (
              <div
                className="pp1-custom-select-options pp1-ct-reveal pp1-ct-reveal--in"
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  width: "140px",
                  padding: "4px",
                  background: "#ffffff",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  zIndex: 99999,
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px"
                }}
              >
                {[
                  { id: "combo", label: "Combo", icon: BarChart2 },
                  { id: "line", label: "Line", icon: LucideLineChart },
                  { id: "bar", label: "Bar", icon: BarChart2 },
                  { id: "area", label: "Area", icon: AreaChart },
                  { id: "radar", label: "Radar", icon: Radar },
                  { id: "polarArea", label: "Polar Area", icon: PieChart },
                  { id: "stepped", label: "Stepped", icon: LucideLineChart }
                ].map(opt => (
                  <div
                    key={opt.id}
                    className={`pp1-custom-select-option ${chartType === opt.id ? "selected" : ""}`}
                    onClick={() => {
                      setChartType(opt.id);
                      setChartTypeOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 8px",
                      fontSize: "11px",
                      fontWeight: chartType === opt.id ? 700 : 500,
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: chartType === opt.id ? "#ffffff" : "#475569",
                      background: chartType === opt.id ? "#0f766e" : "transparent"
                    }}
                  >
                    <opt.icon size={12} style={{ color: chartType === opt.id ? "#ffffff" : "#0f766e" }} />
                    <span>{opt.label}</span>
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

function DailyProductionBottomTable({ data, filters, targetConfig }) {
  const maxAllowedHrs = targetConfig?.daily_production?.maxBalanceHours ?? 4.0;
  const dailyProdRows = Array.isArray(data?.dailyProductionCompare?.rows) ? data.dailyProductionCompare.rows : [];

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return { from: `${year}-${month}-01`, to: `${year}-${month}-${day}` };
  }, []);

  const rows = React.useMemo(() => {
    const list = filterDailyProdRows(dailyProdRows, filters, defaultRange.from, defaultRange.to);
    return list.map((row, idx) => {
      const planned = Number(row.planned || 0);
      const balance = Number(row.balance || 0);
      const lossPct = planned > 0 ? ((balance / planned) * 100).toFixed(1) : "0.0";
      return [
        String(idx + 1),
        row.date || "—",
        row.machine || "—",
        `₹${Number(row.rate || 0).toLocaleString()}`,
        `${planned} Hrs`,
        `${balance} Hrs`,
        `₹${Number(row.loss || 0).toLocaleString()}`,
        `${lossPct}%`
      ];
    });
  }, [dailyProdRows, filters, defaultRange, maxAllowedHrs]);

  const columns = ["Sl. No", "Date", "Machine No", "Rate Per Hrs", "Production Planned Hrs", "Balance Hrs", "Production Loss", "Production Loss %"];

  return <PremiumDashboardBottomTable title="Machine Capacity Registry" columns={columns} rows={rows} />;
}

/* ── Target Vs Actual View ────────────────────────────────── */
function TargetVsActualDashboardView({ data, loading, filters, onFilterChange, onClose, targetConfig, uid, onTargetVsActualData }) {
  const [targetVsActualLive, setTargetVsActualLive] = React.useState(null);
  const [targetVsActualLoading, setTargetVsActualLoading] = React.useState(false);
  const targetVsActualSource = targetVsActualLive || data?.targetVsActualCompare;
  const [chartType, setChartType] = React.useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
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
      customer: ""
    });
    setChartType("bar");
  };

  React.useEffect(() => {
    const ctrl = new AbortController();
    setTargetVsActualLoading(true);
    const fy = currentFinancialYearRange();
    fetch(buildTargetVsActualUrl(filters?.fromDate || fy.from, filters?.toDate || fy.to), {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok || json?.error) throw new Error(json?.error || "Target vs Actual load failed");
        setTargetVsActualLive(json);
        onTargetVsActualData?.(json);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setTargetVsActualLive(null);
        onTargetVsActualData?.(data?.targetVsActualCompare || null);
      })
      .finally(() => setTargetVsActualLoading(false));
    return () => ctrl.abort();
  }, [uid, onTargetVsActualData, data?.targetVsActualCompare, filters?.fromDate, filters?.toDate]);

  const rawRows = React.useMemo(
    () => (Array.isArray(targetVsActualSource?.rows) ? targetVsActualSource.rows : []),
    [targetVsActualSource?.rows]
  );

  const customersList = React.useMemo(() => {
    const list = rawRows.map(r => r.customerName);
    return [...new Set(list)].filter(Boolean).sort();
  }, [rawRows]);

  const filteredData = React.useMemo(() => {
    let list = rawRows;
    if (filters?.customer) {
      const custList = String(filters.customer).split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
      if (custList.length > 0) {
        list = list.filter(d => custList.includes((d.customerName || "").toLowerCase()));
      }
    }
    return list;
  }, [rawRows, filters?.customer]);

  const totalPlan = React.useMemo(() => filteredData.reduce((acc, r) => acc + (Number(r.planQty) || 0), 0), [filteredData]);
  const totalAvailable = React.useMemo(() => filteredData.reduce((acc, r) => acc + (Number(r.availableQty) || 0), 0), [filteredData]);
  const totalReq = React.useMemo(() => filteredData.reduce((acc, r) => acc + (Number(r.planReqQty) || 0), 0), [filteredData]);

  const avgFulfillment = React.useMemo(() => {
    if (totalPlan === 0) return 0;
    return ((totalAvailable / totalPlan) * 100).toFixed(1);
  }, [totalPlan, totalAvailable]);

  // Aggregate by customer for the bar chart
  const customerChartData = React.useMemo(() => {
    const map = {};
    filteredData.forEach(r => {
      const c = r.customerName || "—";
      if (!map[c]) {
        map[c] = { planQty: 0, availableQty: 0, dispatchQty: 0 };
      }
      map[c].planQty += Number(r.planQty) || 0;
      map[c].availableQty += Number(r.availableQty) || 0;
      map[c].dispatchQty += Number(r.dispatchQty) || 0;
    });
    const entries = Object.entries(map).map(([cust, val]) => ({
      customer: cust,
      planQty: val.planQty,
      availableQty: val.availableQty,
      dispatchQty: val.dispatchQty
    })).sort((a, b) => b.planQty - a.planQty);

    return {
      labels: entries.map(e => e.customer),
      planQty: entries.map(e => e.planQty),
      availableQty: entries.map(e => e.availableQty),
      dispatchQty: entries.map(e => e.dispatchQty)
    };
  }, [filteredData]);

  const setupChart = React.useCallback(
    (canvas) => {
      const datasets = [
        {
          label: "Plan Qty (Target)",
          data: customerChartData.planQty,
          backgroundColor: chartType === "area" || chartType === "stepped"
            ? "rgba(99, 102, 241, 0.25)"
            : (chartType === "radar" ? "rgba(99, 102, 241, 0.15)" : (chartType === "polarArea" ? "rgba(99, 102, 241, 0.6)" : "#6366f1")),
          borderColor: "#4f46e5",
          borderWidth: (chartType === "line" || chartType === "combo") ? 2.5 : 1,
          tension: 0.4,
          fill: chartType === "area" || chartType === "radar" || chartType === "stepped",
          stepped: chartType === "stepped" ? "middle" : false,
          pointRadius: (chartType === "bar" || chartType === "polarArea") ? 0 : 3,
          type: chartType === "combo" ? "line" : (chartType === "radar" ? "radar" : (chartType === "bar" ? "bar" : undefined)),
          order: chartType === "combo" ? 1 : 2
        },
        {
          label: "Available Qty (Actual)",
          data: customerChartData.availableQty,
          backgroundColor: chartType === "area" || chartType === "stepped"
            ? "rgba(16, 185, 129, 0.25)"
            : (chartType === "radar" ? "rgba(16, 185, 129, 0.15)" : (chartType === "polarArea" ? "rgba(16, 185, 129, 0.6)" : "#10b981")),
          borderColor: "#059669",
          borderWidth: chartType === "line" ? 2.5 : 1,
          tension: 0.4,
          fill: chartType === "area" || chartType === "radar" || chartType === "stepped",
          stepped: chartType === "stepped" ? "middle" : false,
          pointRadius: (chartType === "bar" || chartType === "combo" || chartType === "polarArea") ? 0 : 3,
          type: chartType === "radar" ? "radar" : (chartType === "bar" || chartType === "combo" ? "bar" : undefined),
          order: 3
        },
        {
          label: "Dispatched Qty",
          data: customerChartData.dispatchQty,
          backgroundColor: chartType === "area" || chartType === "stepped"
            ? "rgba(245, 158, 11, 0.25)"
            : (chartType === "radar" ? "rgba(245, 158, 11, 0.15)" : (chartType === "polarArea" ? "rgba(245, 158, 11, 0.6)" : "#f59e0b")),
          borderColor: "#d97706",
          borderWidth: chartType === "line" ? 2.5 : 1,
          tension: 0.4,
          fill: chartType === "area" || chartType === "radar" || chartType === "stepped",
          stepped: chartType === "stepped" ? "middle" : false,
          pointRadius: (chartType === "bar" || chartType === "combo" || chartType === "polarArea") ? 0 : 3,
          type: chartType === "radar" ? "radar" : (chartType === "bar" || chartType === "combo" ? "bar" : undefined),
          order: 4
        }
      ];

      return createPp1Chart(canvas, {
        type: chartType === "polarArea" ? "polarArea" : (chartType === "radar" ? "radar" : (chartType === "bar" || chartType === "combo" ? "bar" : "line")),
        data: {
          labels: customerChartData.labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: "top", labels: { boxWidth: 12, font: { size: 10 } } }
          },
          scales: (chartType === "radar" || chartType === "polarArea") ? {
            r: {
              angleLines: { display: chartType === "radar", color: "rgba(0, 0, 0, 0.05)" },
              grid: { circular: true, color: "rgba(0, 0, 0, 0.05)" },
              ticks: { display: true, font: { size: 8 }, color: "#64748b", backdropColor: "transparent" },
              suggestedMin: 0
            }
          } : {
            y: { beginAtZero: true, ticks: { font: { size: 9 } } },
            x: { ticks: { font: { size: 9 } } }
          }
        }
      });
    },
    [customerChartData, chartType]
  );

  const kpis = [
    { label: "Target (Plan Qty)", value: totalPlan.toLocaleString(), icon: ClipboardList, color: "#6366f1" },
    { label: "Actual (Available)", value: totalAvailable.toLocaleString(), icon: CheckCircle2, color: "#10b981" },
    { label: "Req Quantity", value: totalReq.toLocaleString(), icon: AlertTriangle, color: "#f59e0b" },
    { label: "Fulfillment Rate", value: `${avgFulfillment}%`, icon: Target, color: "#eab308" }
  ];

  const rebuildToken = `target-vs-actual-chart|${chartType}|${targetConfig?.target_vs_actual?.minFulfillmentPct ?? 90.0}|${JSON.stringify(customerChartData)}`;

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
      loading={loading || targetVsActualLoading}
      noData={customerChartData.labels.length === 0}
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

        {/* Customer Name Multi-Select Dropdown */}
        <div className="pp1-filter-group" style={{ width: "230px", maxWidth: "230px" }}>
          <label className="pp1-filter-label">Customer Name</label>
          <Pp1SearchableMultiSelect
            value={filters.customer || ""}
            options={customersList}
            onChange={(val) => handleInputChange("customer", val)}
            placeholder="Select Customers..."
            allLabel="All Customers"
            searchPlaceholder="Search customer..."
          />
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
                  <BarChart2 size={12} style={{ color: "#6366f1" }} />
                ) : chartType === "area" ? (
                  <AreaChart size={12} style={{ color: "#6366f1" }} />
                ) : chartType === "radar" ? (
                  <Radar size={12} style={{ color: "#6366f1" }} />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} style={{ color: "#6366f1" }} />
                ) : chartType === "stepped" ? (
                  <Activity size={12} style={{ color: "#6366f1" }} />
                ) : chartType === "combo" ? (
                  <TrendingUp size={12} style={{ color: "#6366f1" }} />
                ) : (
                  <LucideLineChart size={12} style={{ color: "#6366f1" }} />
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
                    <opt.icon size={12} style={{ color: chartType === opt.id ? "#fff" : "#6366f1" }} />
                    <span>{opt.label}</span>
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

function TargetVsActualBottomTable({ data, filters, targetConfig }) {
  const minFulfillment = targetConfig?.target_vs_actual?.minFulfillmentPct ?? 90.0;

  const rawRows = React.useMemo(
    () => (Array.isArray(data?.targetVsActualCompare?.rows) ? data.targetVsActualCompare.rows : []),
    [data?.targetVsActualCompare?.rows]
  );

  const rows = React.useMemo(() => {
    let list = rawRows;
    if (filters?.customer) {
      const custList = String(filters.customer).split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
      if (custList.length > 0) {
        list = list.filter(r => custList.includes((r.customerName || "").toLowerCase()));
      }
    }
    if (filters?.fromDate) {
      list = list.filter(r => r.date >= filters.fromDate);
    }
    if (filters?.toDate) {
      list = list.filter(r => r.date <= filters.toDate);
    }

    return list.map((row, idx) => {
      const planQty = Number(row.planQty) || 0;
      const dispatchQty = Number(row.dispatchQty) || 0;
      const dispatchPct = planQty > 0 ? (dispatchQty / planQty) * 100 : 0;
      const isLowDispatch = dispatchPct < minFulfillment;

      const statusBaseText = row.dispatchStatus === "Completed" || dispatchPct >= 100
        ? "Completed"
        : isLowDispatch
          ? "Low Fulfillment"
          : "On Track";

      const badgeText = `${statusBaseText} (${dispatchPct.toFixed(0)}%)`;

      return [
        String(idx + 1),
        row.date || "—",
        row.customerName || "—",
        `${row.partNo || "—"} - ${row.description || "—"}`,
        planQty.toLocaleString(),
        (Number(row.availableQty) || 0).toLocaleString(),
        (Number(row.planReqQty) || 0).toLocaleString(),
        dispatchQty.toLocaleString(),
        badgeText
      ];
    });
  }, [rawRows, filters, minFulfillment]);

  const columns = ["Sl.No", "Date", "Customer Name", "PartNo - Description", "Plan Qty", "Available Qty", "Plan Req Qty", "Dispatch Qty", "Dispatch Status"];

  return <PremiumDashboardBottomTable title="Target Vs Actual Registry" columns={columns} rows={rows} />;
}

function matchesOpEffLimit(operatorPct, effLimit) {
  const filterStr = String(effLimit || "").trim();
  if (!filterStr) return true;
  const match = filterStr.replace(/\s+/g, "").match(/^([><]=?|=)?([0-9.]+)(%?)$/);
  const val = match ? parseFloat(match[2]) : parseFloat(filterStr);
  const op = match ? (match[1] || "<") : "<";
  const pct = Number(operatorPct || 0);
  if (Number.isNaN(val)) return true;
  switch (op) {
    case ">": return pct > val;
    case ">=": return pct >= val;
    case "<": return pct < val;
    case "<=": return pct <= val;
    case "=": return pct === val;
    default: return true;
  }
}

function getOpEffActiveRange(filters, defaultFrom, defaultTo) {
  return {
    from: filters?.fromDate || defaultFrom,
    to: filters?.toDate || defaultTo,
  };
}

function filterOpEffRows(rows, filters, defaultFrom, defaultTo, { dateOnly = false } = {}) {
  const { from: activeFrom, to: activeTo } = getOpEffActiveRange(filters, defaultFrom, defaultTo);
  return (Array.isArray(rows) ? rows : []).filter((r) => {
    const d = (r.date || "").slice(0, 10);
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    if (d < activeFrom || d > activeTo) return false;
    if (!dateOnly && filters?.operator) {
      const opList = String(filters.operator).split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
      if (opList.length > 0) {
        const op = String(r.operator || "").toLowerCase();
        if (!opList.includes(op)) return false;
      }
    }
    if (!dateOnly && filters?.effLimit && !matchesOpEffLimit(r.operatorPct, filters.effLimit)) return false;
    return true;
  });
}

function buildOpEffFilterOptions(allRows, filters, defaultFrom, defaultTo) {
  const dateScoped = filterOpEffRows(allRows, filters, defaultFrom, defaultTo, { dateOnly: true });
  let scoped = dateScoped;
  if (filters?.operator) {
    const opList = String(filters.operator).split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
    if (opList.length > 0) {
      scoped = scoped.filter((r) =>
        opList.includes(String(r.operator || "").toLowerCase())
      );
    }
  }
  const operators = [...new Set(dateScoped.map((r) => r.operator).filter(Boolean))].sort();
  return { operators, dateScoped, scoped };
}

function buildOpEffChartSeries(filteredRows, filters, defaultFrom, defaultTo) {
  const { from: activeFrom, to: activeTo } = getOpEffActiveRange(filters, defaultFrom, defaultTo);
  if (!filteredRows.length || !activeFrom || !activeTo) {
    return { labels: [], data: [] };
  }

  const start = new Date(`${activeFrom}T00:00:00`);
  const end = new Date(`${activeTo}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { labels: [], data: [] };
  }

  const daySpan = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
  const monthLabels = buildEffMonthLabels(activeFrom, activeTo, null);

  if (daySpan <= 45 || monthLabels.length <= 1) {
    const dayDates = [...new Set(filteredRows.map((r) => (r.date || "").slice(0, 10)).filter(Boolean))].sort();
    return {
      labels: dayDates.map((d) => {
        const parts = d.split("-");
        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
      }),
      data: dayDates.map((d) => {
        const dayRows = filteredRows.filter((r) => (r.date || "").slice(0, 10) === d);
        if (!dayRows.length) return 0;
        const sum = dayRows.reduce((acc, r) => acc + Number(r.operatorPct || 0), 0);
        return Number((sum / dayRows.length).toFixed(1));
      }),
    };
  }

  return {
    labels: monthLabels,
    data: monthLabels.map((mo) => {
      const moRows = filteredRows.filter((r) => r.month === mo);
      if (!moRows.length) return 0;
      const sum = moRows.reduce((acc, r) => acc + Number(r.operatorPct || 0), 0);
      return Number((sum / moRows.length).toFixed(1));
    }),
  };
}

/* ── Operator Efficiency View ───────────────────────────────────────────── */
function OperatorEfficiencyDashboardView({ data, loading, filters, onFilterChange, onClose, targetConfig, uid, onOpEffData }) {
  const [opEffLive, setOpEffLive] = React.useState(null);
  const [opEffLoading, setOpEffLoading] = React.useState(false);
  const opEffSource = opEffLive || data?.operatorEfficiencyCompare;

  const [effLimitOpen, setEffLimitOpen] = React.useState(false);
  const effLimitRef = React.useRef(null);
  const [chartType, setChartType] = React.useState("line");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (effLimitRef.current && !effLimitRef.current.contains(event.target)) {
        setEffLimitOpen(false);
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
      operator: "",
      effLimit: ""
    });
    setChartType("line");
  };

  React.useEffect(() => {
    const ctrl = new AbortController();
    setOpEffLoading(true);
    const fy = currentFinancialYearRange();
    fetch(buildOpEffUrl(fy.from, fy.to), {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok || json?.error) throw new Error(json?.error || "Operator Efficiency load failed");
        setOpEffLive(json);
        onOpEffData?.(json);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setOpEffLive(null);
        onOpEffData?.(data?.operatorEfficiencyCompare || null);
      })
      .finally(() => setOpEffLoading(false));
    return () => ctrl.abort();
  }, [uid, onOpEffData, data?.operatorEfficiencyCompare]);

  const opEffRows = React.useMemo(
    () => (Array.isArray(opEffSource?.rows) ? opEffSource.rows : []),
    [opEffSource?.rows]
  );

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return { from: `${year}-${month}-01`, to: `${year}-${month}-${day}` };
  }, []);

  const filteredData = React.useMemo(
    () => filterOpEffRows(opEffRows, filters, defaultRange.from, defaultRange.to),
    [opEffRows, filters, defaultRange]
  );

  const opEffFilterOptions = React.useMemo(
    () => buildOpEffFilterOptions(opEffRows, filters, defaultRange.from, defaultRange.to),
    [opEffRows, filters, defaultRange]
  );

  const operatorsList = React.useMemo(() => {
    if (opEffFilterOptions.operators.length) return opEffFilterOptions.operators;
    const api = opEffSource?.filterOptions?.operators;
    if (Array.isArray(api) && api.length) return api;
    return Array.from(new Set(opEffRows.map((d) => d.operator).filter(Boolean)));
  }, [opEffFilterOptions.operators, opEffSource?.filterOptions?.operators, opEffRows]);

  const getOperatorLabel = React.useCallback(() => {
    if (!filters.operator) return "Avg Operator Efficiency %";
    const ops = String(filters.operator).split(",").map(x => x.trim()).filter(Boolean);
    if (ops.length === 0) return "Avg Operator Efficiency %";
    if (ops.length <= 2) return `${ops.join(", ")} Efficiency %`;
    return `${ops.length} Selected Operators Efficiency %`;
  }, [filters.operator]);

  const totalPlanned = React.useMemo(() => filteredData.reduce((acc, r) => acc + Number(r.plannedQty || 0), 0), [filteredData]);
  const totalProduced = React.useMemo(() => filteredData.reduce((acc, r) => acc + Number(r.producedQty || 0), 0), [filteredData]);
  const totalRejections = React.useMemo(() => filteredData.reduce((acc, r) => acc + Number(r.rejectionQty || 0) + Number(r.reworkQty || 0), 0), [filteredData]);

  const avgEfficiency = React.useMemo(() => {
    if (filteredData.length === 0) return 0;
    const sum = filteredData.reduce((acc, r) => acc + Number(r.operatorPct || 0), 0);
    return (sum / filteredData.length).toFixed(1);
  }, [filteredData]);

  const chartSeries = React.useMemo(
    () => buildOpEffChartSeries(filteredData, filters, defaultRange.from, defaultRange.to),
    [filteredData, filters, defaultRange]
  );

  const monthLabels = chartSeries.labels;
  const monthwiseData = chartSeries.data;

  const setupChart = React.useCallback(
    (canvas) => {
      const targetVal = targetConfig?.operator_efficiency?.minEfficiencyPct ?? 90.0;
      const datasets = [
        {
          label: getOperatorLabel(),
          data: monthwiseData,
          backgroundColor: chartType === "area" || chartType === "stepped"
            ? "rgba(139, 92, 246, 0.25)"
            : (chartType === "radar" ? "rgba(139, 92, 246, 0.15)" : (chartType === "polarArea" ? "rgba(139, 92, 246, 0.6)" : "#8b5cf6")),
          borderColor: "#8b5cf6",
          borderWidth: (chartType === "line" || chartType === "combo") ? 2.5 : 1,
          tension: 0.3,
          fill: chartType === "area" || chartType === "radar" || chartType === "stepped",
          stepped: chartType === "stepped" ? "middle" : false,
          pointRadius: (chartType === "bar" || chartType === "polarArea") ? 0 : 3,
          type: chartType === "combo" ? "line" : (chartType === "radar" ? "radar" : (chartType === "bar" ? "bar" : undefined)),
          order: chartType === "combo" ? 1 : 2
        },
        {
          type: chartType === "radar" ? "radar" : (chartType === "bar" || chartType === "combo" ? "bar" : "line"),
          label: `Target Limit ${targetVal}%`,
          data: Array(monthLabels.length).fill(targetVal),
          borderColor: "#ef4444",
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          order: 1
        }
      ];

      return createPp1Chart(canvas, {
        type: chartType === "polarArea" ? "polarArea" : (chartType === "radar" ? "radar" : (chartType === "bar" || chartType === "combo" ? "bar" : "line")),
        data: {
          labels: monthLabels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: "top", labels: { boxWidth: 12, font: { size: 10 } } }
          },
          scales: (chartType === "radar" || chartType === "polarArea") ? {
            r: {
              angleLines: { display: chartType === "radar", color: "rgba(0, 0, 0, 0.05)" },
              grid: { circular: true, color: "rgba(0, 0, 0, 0.05)" },
              ticks: { display: true, font: { size: 8 }, color: "#64748b", backdropColor: "transparent" },
              suggestedMin: 0,
              max: 100
            }
          } : {
            y: {
              beginAtZero: true,
              max: 100,
              title: { display: true, text: "Efficiency %", font: { size: 10 } }
            }
          }
        }
      });
    },
    [monthwiseData, monthLabels, filters.operator, targetConfig?.operator_efficiency?.minEfficiencyPct, chartType]
  );

  const kpis = [
    { label: "Total Planned Qty", value: (loading || opEffLoading) && !filteredData.length ? "…" : totalPlanned.toLocaleString(), icon: ClipboardList, color: "#4f46e5" },
    { label: "Total Produced Qty", value: (loading || opEffLoading) && !filteredData.length ? "…" : totalProduced.toLocaleString(), icon: CheckCircle2, color: "#10b981" },
    { label: "Total Rejections", value: (loading || opEffLoading) && !filteredData.length ? "…" : totalRejections.toLocaleString(), icon: AlertTriangle, color: "#ef4444" },
    { label: "Avg Efficiency", value: (loading || opEffLoading) && !filteredData.length ? "…" : `${avgEfficiency}%`, icon: Users, color: "#8b5cf6" }
  ];

  const rebuildToken = `operator-efficiency-chart|${chartType}|${targetConfig?.operator_efficiency?.minEfficiencyPct ?? 90.0}|${JSON.stringify(monthwiseData)}|${JSON.stringify(monthLabels)}|${filters.operator}|${filters.effLimit}|${filters.fromDate}|${filters.toDate}|${filteredData.length}|${opEffLoading}`;

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
      noData={filteredData.length === 0}
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

        {/* Operator Name Multi-Select Dropdown */}
        <div className="pp1-filter-group" style={{ width: "230px", maxWidth: "230px" }}>
          <label className="pp1-filter-label">Operator Name</label>
          <Pp1SearchableMultiSelect
            value={filters.operator || ""}
            options={operatorsList}
            onChange={(val) => handleInputChange("operator", val)}
            placeholder="Select Operators..."
            allLabel="All Operators"
            searchPlaceholder="Search operator..."
          />
        </div>

        {/* Efficiency Limit Custom Text Input & Dropdown */}
        <div className="pp1-filter-group" ref={effLimitRef} style={{ maxWidth: "180px" }}>
          <label className="pp1-filter-label">Efficiency Limit</label>
          <div className="pp1-part-autocomplete-wrap">
            <input
              type="text"
              className="pp1-filter-input pp1-part-autocomplete-input"
              placeholder="e.g. >50 or <30..."
              value={filters.effLimit || ""}
              onChange={e => {
                handleInputChange("effLimit", e.target.value);
                setEffLimitOpen(true);
              }}
              onFocus={() => setEffLimitOpen(true)}
              style={{
                paddingRight: "24px",
                height: "28px"
              }}
            />
            <ChevronDown
              size={14}
              onClick={() => setEffLimitOpen(!effLimitOpen)}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.6,
                cursor: "pointer",
                pointerEvents: "auto"
              }}
            />

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
                {[
                  { label: "Eff < 90%", val: "<90" },
                  { label: "Eff < 80%", val: "<80" },
                  { label: "Eff > 90%", val: ">90" },
                  { label: "Eff < 70%", val: "<70" }
                ].map(item => (
                  <div
                    key={item.val}
                    className={`pp1-part-suggestion-item ${filters.effLimit === item.val ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("effLimit", item.val);
                      setEffLimitOpen(false);
                    }}
                  >
                    {item.label}
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
                  <BarChart2 size={12} style={{ color: "#8b5cf6" }} />
                ) : chartType === "area" ? (
                  <AreaChart size={12} style={{ color: "#8b5cf6" }} />
                ) : chartType === "radar" ? (
                  <Radar size={12} style={{ color: "#8b5cf6" }} />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} style={{ color: "#8b5cf6" }} />
                ) : chartType === "stepped" ? (
                  <Activity size={12} style={{ color: "#8b5cf6" }} />
                ) : chartType === "combo" ? (
                  <TrendingUp size={12} style={{ color: "#8b5cf6" }} />
                ) : (
                  <LucideLineChart size={12} style={{ color: "#8b5cf6" }} />
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
                    <opt.icon size={12} style={{ color: chartType === opt.id ? "#fff" : "#8b5cf6" }} />
                    <span>{opt.label}</span>
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

function OperatorEfficiencyBottomTable({ data, filters, targetConfig }) {
  const opEffRows = Array.isArray(data?.operatorEfficiencyCompare?.rows) ? data.operatorEfficiencyCompare.rows : [];

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return { from: `${year}-${month}-01`, to: `${year}-${month}-${day}` };
  }, []);

  const formatOpEffDisplayDate = (iso) => {
    if (!iso || iso.length < 10) return iso || "—";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}-${m}-${y}`;
  };

  const rows = React.useMemo(() => {
    const list = filterOpEffRows(opEffRows, filters, defaultRange.from, defaultRange.to);
    const ranked = [...list].sort((a, b) => Number(b.operatorPct || 0) - Number(a.operatorPct || 0));

    return ranked.map((row, idx) => {
      return [
        String(idx + 1),
        formatOpEffDisplayDate(row.date),
        row.operator || "—",
        `${Number(row.oaEff || 0).toFixed(1)}%`,
        `${Number(row.operatorPct || 0).toFixed(1)}%`,
        `${Number(row.qfEff || 0).toFixed(1)}%`,
        `${Number(row.idle || 0).toFixed(1)}%`,
        `# ${idx + 1}`
      ];
    });
  }, [opEffRows, filters, defaultRange]);

  const columns = ["Sl.No", "Date", "Operator", "OA EFF%", "Operator %", "QF Eff%", "Idle %", "Rank"];

  return <PremiumDashboardBottomTable title="Operator Efficiency Registry" columns={columns} rows={rows} />;
}

/* ── Machine Efficiency Dashboard View ───────────────────────────────────── */
function MachineEfficiencyDashboardView({ data, loading, filters, onFilterChange, onClose, targetConfig, uid, onMachEffData }) {
  const [machEffLive, setMachEffLive] = React.useState(null);
  const [machEffLoading, setMachEffLoading] = React.useState(false);
  const machEffSource = machEffLive || data?.machineEfficiencyCompare;

  const [effLimitOpen, setEffLimitOpen] = React.useState(false);
  const effLimitRef = React.useRef(null);
  const [chartType, setChartType] = React.useState("line");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (effLimitRef.current && !effLimitRef.current.contains(event.target)) {
        setEffLimitOpen(false);
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
      machine: "",
      effLimit: ""
    });
    setChartType("line");
  };

  React.useEffect(() => {
    const ctrl = new AbortController();
    setMachEffLoading(true);
    fetch(buildMachEffUrl(filters.fromDate || null, filters.toDate || null, filters.machine || null, null, 0), {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok || json?.error) throw new Error(json?.error || "Machine Efficiency load failed");
        setMachEffLive(json);
        onMachEffData?.(json);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setMachEffLive(null);
        onMachEffData?.(data?.machineEfficiencyCompare || null);
      })
      .finally(() => setMachEffLoading(false));
    return () => ctrl.abort();
  }, [uid, filters.fromDate, filters.toDate, filters.machine, onMachEffData, data?.machineEfficiencyCompare]);

  const machEffRows = React.useMemo(
    () => (Array.isArray(machEffSource?.machineRows) ? machEffSource.machineRows : Array.isArray(machEffSource?.rows) ? machEffSource.rows : []),
    [machEffSource]
  );

  // Separate one-time fetch for full machine list so the dropdown always shows ALL machines
  const [allMachineNames, setAllMachineNames] = React.useState([]);
  React.useEffect(() => {
    const ctrl = new AbortController();
    const fy = currentFinancialYearRange();
    fetch(buildMachEffUrl(fy.from, fy.to, null, null, 1), { credentials: "include", signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json) return;
        const macs = json?.filterOptions?.machines;
        if (Array.isArray(macs) && macs.length) setAllMachineNames(macs);
      })
      .catch(() => { });
    return () => ctrl.abort();
  }, [uid]);

  const machinesList = React.useMemo(() => {
    if (allMachineNames.length) return allMachineNames;
    const fromApi = machEffSource?.filterOptions?.machines;
    if (Array.isArray(fromApi) && fromApi.length) return fromApi;
    return Array.from(new Set(machEffRows.map(d => d.machine).filter(Boolean)));
  }, [allMachineNames, machEffSource, machEffRows]);

  const getMachineLabel = React.useCallback(() => {
    if (!filters.machine) return "Avg Machine Efficiency %";
    const macs = String(filters.machine).split(",").map(x => x.trim()).filter(Boolean);
    if (macs.length === 0) return "Avg Machine Efficiency %";
    if (macs.length <= 2) return `${macs.join(", ")} Efficiency %`;
    return `${macs.length} Selected Machines Efficiency %`;
  }, [filters.machine]);

  // date + machine already filtered server-side; only apply effLimit client-side
  const filteredData = React.useMemo(() => {
    let list = machEffRows;
    if (filters.effLimit) {
      const filterStr = filters.effLimit.trim();
      if (filterStr) {
        const match = filterStr.replace(/\s+/g, "").match(/^([><]=?|=)?([0-9.]+)(%?)$/);
        if (match) {
          const op = match[1] || "<";
          const val = parseFloat(match[2]);
          if (!isNaN(val)) {
            list = list.filter(d => {
              const pct = Number(d.machinePct || d.availabilityPercent || 0);
              switch (op) {
                case ">": return pct > val;
                case ">=": return pct >= val;
                case "<": return pct < val;
                case "<=": return pct <= val;
                case "=": return pct === val;
                default: return true;
              }
            });
          }
        } else {
          const num = parseFloat(filterStr);
          if (!isNaN(num)) {
            list = list.filter(d => Number(d.machinePct || d.availabilityPercent || 0) < num);
          }
        }
      }
    }
    return list;
  }, [machEffRows, filters.effLimit]);

  const totalRunningHours = React.useMemo(() => filteredData.reduce((acc, r) => acc + Number(r.runningHours || 0), 0), [filteredData]);
  const totalIdleHours = React.useMemo(() => filteredData.reduce((acc, r) => acc + Number(r.idleHours || 0), 0), [filteredData]);
  const machineCount = filteredData.length;

  const avgEfficiency = React.useMemo(() => {
    if (filteredData.length === 0) return 0;
    const sum = filteredData.reduce((acc, r) => acc + Number(r.machinePct || r.availabilityPercent || 0), 0);
    return (sum / filteredData.length).toFixed(1);
  }, [filteredData]);

  const reportData = machEffSource?.report;
  const months = Array.isArray(reportData?.labels) && reportData.labels.length ? reportData.labels : ["No Data"];
  const monthwiseData = Array.isArray(reportData?.data) && reportData.data.length ? reportData.data : [0];

  const setupChart = React.useCallback(
    (canvas) => {
      const targetVal = targetConfig?.machine_efficiency?.minEfficiencyPct ?? 90.0;
      const isRadial = chartType === "radar" || chartType === "polarArea";

      const datasets = [
        {
          label: getMachineLabel(),
          data: monthwiseData,
          backgroundColor: chartType === "area" || chartType === "stepped"
            ? "rgba(14, 165, 233, 0.25)"
            : (chartType === "radar" ? "rgba(14, 165, 233, 0.15)" : (chartType === "polarArea" ? "rgba(14, 165, 233, 0.6)" : "#0ea5e9")),
          borderColor: "#0ea5e9",
          borderWidth: (chartType === "line" || chartType === "combo") ? 2.5 : 1,
          tension: 0.3,
          fill: chartType === "area" || chartType === "radar" || chartType === "stepped",
          stepped: chartType === "stepped" ? "middle" : false,
          pointRadius: (chartType === "bar" || chartType === "polarArea") ? 0 : 3,
          type: chartType === "combo" ? "line" : (chartType === "radar" ? "radar" : (chartType === "bar" ? "bar" : undefined)),
          order: chartType === "combo" ? 1 : 2
        },
        {
          type: chartType === "radar" ? "radar" : (chartType === "bar" || chartType === "combo" ? "bar" : "line"),
          label: `Target Limit ${targetVal}%`,
          data: Array(months.length).fill(targetVal),
          borderColor: "#ef4444",
          backgroundColor: "transparent",
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          order: 2
        }
      ];

      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: "top", labels: { boxWidth: 12, font: { size: 10 } } }
        }
      };

      if (isRadial) {
        chartOptions.scales = {
          r: {
            angleLines: { display: true },
            suggestedMin: 0,
            suggestedMax: 100,
            ticks: { font: { size: 8 } }
          }
        };
      } else {
        chartOptions.scales = {
          x: {
            grid: { display: false },
            ticks: { font: { size: 9 } }
          },
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: "Efficiency %", font: { size: 10 } },
            ticks: { font: { size: 9 } }
          }
        };
      }

      return createPp1Chart(canvas, {
        type: chartType === "radar" ? "radar" : (chartType === "polarArea" ? "polarArea" : "bar"),
        data: {
          labels: months,
          datasets: datasets
        },
        options: chartOptions
      });
    },
    [monthwiseData, months, chartType, getMachineLabel, targetConfig?.machine_efficiency?.minEfficiencyPct]
  );

  const kpis = [
    { label: "Total Running Hrs", value: (loading || machEffLoading) && !filteredData.length ? "…" : totalRunningHours.toFixed(1), icon: ClipboardList, color: "#4f46e5" },
    { label: "Total Idle Hrs", value: (loading || machEffLoading) && !filteredData.length ? "…" : totalIdleHours.toFixed(1), icon: CheckCircle2, color: "#10b981" },
    { label: "Machine Count", value: (loading || machEffLoading) && !filteredData.length ? "…" : machineCount, icon: AlertTriangle, color: "#ef4444" },
    { label: "Avg Efficiency", value: (loading || machEffLoading) && !filteredData.length ? "…" : `${avgEfficiency}%`, icon: Cpu, color: "#0ea5e9" }
  ];

  const rebuildToken = `machine-efficiency-chart|${chartType}|${targetConfig?.machine_efficiency?.minEfficiencyPct ?? 90.0}|${JSON.stringify(monthwiseData)}|${JSON.stringify(months)}|${filters.machine}|${filters.effLimit}|${filters.fromDate}|${filters.toDate}|${filteredData.length}|${machEffLoading}`;

  return (
    <PremiumDashboardView
      title="Machine Efficiency"
      icon={Cpu}
      color="#0ea5e9"
      kpis={kpis}
      setupChart={setupChart}
      chartHeight={260}
      rangeHint="Machine Performance - Produced vs Target"
      onClose={onClose}
      rebuildToken={rebuildToken}
      noData={filteredData.length === 0}
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

        {/* Machine No Multi-Select Dropdown */}
        <div className="pp1-filter-group" style={{ width: "230px", maxWidth: "230px" }}>
          <label className="pp1-filter-label">Machine No</label>
          <Pp1SearchableMultiSelect
            value={filters.machine || ""}
            options={machinesList}
            onChange={(val) => handleInputChange("machine", val)}
            placeholder="Select Machines..."
            allLabel="All Machines"
            searchPlaceholder="Search machine..."
          />
        </div>

        {/* Efficiency Limit Custom Text Input & Dropdown */}
        <div className="pp1-filter-group" ref={effLimitRef} style={{ maxWidth: "180px" }}>
          <label className="pp1-filter-label">Efficiency Limit</label>
          <div className="pp1-part-autocomplete-wrap">
            <input
              type="text"
              className="pp1-filter-input pp1-part-autocomplete-input"
              placeholder="e.g. >50 or <30..."
              value={filters.effLimit || ""}
              onChange={e => {
                handleInputChange("effLimit", e.target.value);
                setEffLimitOpen(true);
              }}
              onFocus={() => setEffLimitOpen(true)}
              style={{
                paddingRight: "24px",
                height: "28px"
              }}
            />
            <ChevronDown
              size={14}
              onClick={() => setEffLimitOpen(!effLimitOpen)}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.6,
                cursor: "pointer",
                pointerEvents: "auto"
              }}
            />

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
                {[
                  { label: "Eff < 90%", val: "<90" },
                  { label: "Eff < 80%", val: "<80" },
                  { label: "Eff > 90%", val: ">90" },
                  { label: "Eff < 70%", val: "<70" }
                ].map(item => (
                  <div
                    key={item.val}
                    className={`pp1-part-suggestion-item ${filters.effLimit === item.val ? "selected" : ""}`}
                    onClick={() => {
                      handleInputChange("effLimit", item.val);
                      setEffLimitOpen(false);
                    }}
                  >
                    {item.label}
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
              style={{ minWidth: "145px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {chartType === "bar" ? (
                  <BarChart2 size={12} style={{ color: "#0ea5e9" }} />
                ) : chartType === "area" ? (
                  <AreaChart size={12} style={{ color: "#0ea5e9" }} />
                ) : chartType === "radar" ? (
                  <Radar size={12} style={{ color: "#0ea5e9" }} />
                ) : chartType === "polarArea" ? (
                  <PieChart size={12} style={{ color: "#0ea5e9" }} />
                ) : chartType === "stepped" ? (
                  <Activity size={12} style={{ color: "#0ea5e9" }} />
                ) : chartType === "combo" ? (
                  <BarChart2 size={12} style={{ color: "#0ea5e9" }} />
                ) : (
                  <TrendingUp size={12} style={{ color: "#0ea5e9" }} />
                )}
                <span>
                  {chartType === "line" && "Line Chart"}
                  {chartType === "bar" && "Bar Chart"}
                  {chartType === "combo" && "Combo Chart"}
                  {chartType === "area" && "Area Chart"}
                  {chartType === "radar" && "Radar Chart"}
                  {chartType === "polarArea" && "Polar Area"}
                  {chartType === "stepped" && "Stepped Chart"}
                </span>
              </div>
              <ChevronDown size={14} className="pp1-select-chevron" />
            </button>

            {chartTypeOpen && (
              <div className="pp1-custom-select-options" style={{ minWidth: "135px" }}>
                {[
                  { id: "combo", label: "Combo Chart", icon: BarChart2 },
                  { id: "line", label: "Line Chart", icon: TrendingUp },
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
                    <opt.icon size={12} style={{ color: chartType === opt.id ? "#fff" : "#0ea5e9" }} />
                    <span>{opt.label}</span>
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

/* ── Machine Efficiency Bottom Table ─────────────────────────────────────── */
function MachineEfficiencyBottomTable({ data, filters, targetConfig }) {
  const minEfficiency = targetConfig?.machine_efficiency?.minEfficiencyPct ?? 90.0;
  const machEffSource = data?.machineEfficiencyCompare;

  const allRows = React.useMemo(() => {
    if (Array.isArray(machEffSource?.detailRows) && machEffSource.detailRows.length) return machEffSource.detailRows;
    if (Array.isArray(machEffSource?.machineRows) && machEffSource.machineRows.length) return machEffSource.machineRows;
    if (Array.isArray(machEffSource?.rows) && machEffSource.rows.length) return machEffSource.rows;
    return [];
  }, [machEffSource]);

  const formatMachDate = (val) => {
    if (!val || val === "—") return "—";
    const s = String(val).slice(0, 10);
    if (s.length < 10) return s;
    const [y, m, d] = s.split("-");
    return (d && m && y) ? `${d}-${m}-${y}` : s;
  };

  const rows = React.useMemo(() => {
    let list = allRows;
    if (filters?.machine) {
      list = list.filter(r => String(r.machine || "").toLowerCase().includes(filters.machine.toLowerCase()));
    }
    if (filters?.effLimit) {
      const filterStr = filters.effLimit.trim();
      if (filterStr) {
        const match = filterStr.replace(/\s+/g, "").match(/^([><]=?|=)?([0-9.]+)(%?)$/);
        if (match) {
          const op = match[1] || "<";
          const val = parseFloat(match[2]);
          if (!isNaN(val)) {
            list = list.filter(r => {
              const pct = Number(r.machinePct || r.availabilityPercent || 0);
              switch (op) {
                case ">": return pct > val;
                case ">=": return pct >= val;
                case "<": return pct < val;
                case "<=": return pct <= val;
                case "=": return pct === val;
                default: return true;
              }
            });
          }
        } else {
          const num = parseFloat(filterStr);
          if (!isNaN(num)) {
            list = list.filter(r => Number(r.machinePct || r.availabilityPercent || 0) < num);
          }
        }
      }
    }

    return list.map((row, idx) => {
      const pct = Number(row.machinePct || row.availabilityPercent || 0);
      const idlePct = Number(row.idlePct || row.idle || 0);
      return [
        String(idx + 1),
        formatMachDate(row.date || row.dateIso) || "—",
        row.machine || "—",
        row.machineType || row.type || "—",
        `${Number(row.oaEff || pct).toFixed(1)}%`,
        `${pct.toFixed(1)}%`,
        `${Number(row.qfEff || pct).toFixed(1)}%`,
        `${idlePct.toFixed(1)}%`,
        `# ${row.rank || idx + 1}`
      ];
    });
  }, [allRows, filters, minEfficiency]);

  const columns = ["Sl.No", "Date", "Machine No", "Machine Type", "OA EFF%", "Machine %", "QF Eff%", "Idle %", "Rank"];

  return <PremiumDashboardBottomTable title="Machine Efficiency Registry" columns={columns} rows={rows} />;
}

/* ── CAPA Mock Data ──────────────────────────────────────────────────────── */
const MOCK_CAPA_DATA = [];

/* ── Quality Action Plan (CAPA) View ─────────────────────────── */
function filterCapaRows(rows, filters, defaultFrom, defaultTo) {
  const source = Array.isArray(rows) ? rows : [];
  const activeFrom = filters?.fromDate || defaultFrom;
  const activeTo = filters?.toDate || defaultTo;

  return source.filter((r) => {
    const d = (r.complDate || "").slice(0, 10);
    if (!d || d < activeFrom || d > activeTo) return false;
    if (filters?.customer) {
      const cust = String(r.customer || "").toLowerCase();
      // Support comma-separated multi-select customers list
      const selectedCusts = String(filters.customer).split(",").map(c => c.trim().toLowerCase()).filter(Boolean);
      if (selectedCusts.length > 0) {
        const hasMatch = selectedCusts.some(sc => sc === cust);
        if (!hasMatch) return false;
      }
    }
    if (filters?.status && String(r.status || "") !== String(filters.status)) return false;
    return true;
  });
}

function calcCapaAgeDays(row) {
  const iso = (row?.complDate || "").slice(0, 10);
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return row?.ageDays != null ? Number(row.ageDays) : null;
  }
  const start = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(start.getTime())) return row?.ageDays != null ? Number(row.ageDays) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24)));
}

function CapaDashboardView({ data, loading, filters, onFilterChange, onClose, selectedCapaId, onSelectCapaId, uid, onCapaData }) {
  const [capaLive, setCapaLive] = React.useState(null);
  const [capaLoading, setCapaLoading] = React.useState(false);
  const capaSource = capaLive || data?.capaCompare;

  const [statusOpen, setStatusOpen] = React.useState(false);
  const statusRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  React.useEffect(() => {
    const ctrl = new AbortController();
    setCapaLoading(true);
    const fy = currentFinancialYearRange();
    fetch(buildCapaUrl(fy.from, fy.to), {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok || json?.error) throw new Error(json?.error || "CAPA load failed");
        setCapaLive(json);
        onCapaData?.(json);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setCapaLive(null);
        onCapaData?.(data?.capaCompare || null);
      })
      .finally(() => setCapaLoading(false));
    return () => ctrl.abort();
  }, [uid, onCapaData, data?.capaCompare]);

  const capaRows = React.useMemo(
    () => (Array.isArray(capaSource?.rows) ? capaSource.rows : []),
    [capaSource?.rows]
  );

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return { from: `${year}-${month}-01`, to: `${year}-${month}-${day}` };
  }, []);

  const filteredCapa = React.useMemo(
    () => filterCapaRows(capaRows, filters, defaultRange.from, defaultRange.to),
    [capaRows, filters, defaultRange]
  );

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

  const totalComplaints = filteredCapa.length;
  const openCount = filteredCapa.filter((d) => String(d.status || "").toLowerCase() === "open").length;
  const closedCount = filteredCapa.filter((d) => String(d.status || "").toLowerCase() === "closed").length;
  const avgAge = React.useMemo(() => {
    if (filteredCapa.length === 0) return 0;
    const ages = filteredCapa.map((r) => calcCapaAgeDays(r)).filter((v) => v != null);
    if (!ages.length) return 0;
    return Math.round(ages.reduce((acc, v) => acc + v, 0) / ages.length);
  }, [filteredCapa]);

  const selectedRecord = React.useMemo(() => {
    if (!filteredCapa.length) return null;
    return filteredCapa.find((d) => d.complNo === selectedCapaId) || filteredCapa[0];
  }, [filteredCapa, selectedCapaId]);

  React.useEffect(() => {
    if (!filteredCapa.length) return;
    const exists = filteredCapa.some((d) => d.complNo === selectedCapaId);
    if (!exists) onSelectCapaId?.(filteredCapa[0].complNo);
  }, [filteredCapa, selectedCapaId, onSelectCapaId]);

  const setupChart = React.useCallback(
    (canvas) => {
      return createPp1Chart(canvas, {
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

  const rebuildToken = `capa-chart|${closedCount}|${openCount}|${filteredCapa.length}|${capaLoading}`;
  const customersList = React.useMemo(() => {
    const api = capaSource?.filterOptions?.customers;
    if (Array.isArray(api) && api.length) return api;
    return Array.from(new Set(capaRows.map((d) => d.customer).filter(Boolean)));
  }, [capaSource?.filterOptions?.customers, capaRows]);

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
      noData={filteredCapa.length === 0}
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

        {/* Customer Name Filter (Multi-Select) */}
        <div className="pp1-filter-group" style={{ minWidth: "180px", maxWidth: "260px" }}>
          <label className="pp1-filter-label">Customer Name</label>
          <Pp1SearchableMultiSelect
            value={filters?.customer}
            options={customersList}
            onChange={val => handleInputChange("customer", val)}
            placeholder="Search customer..."
            allLabel="All Customers"
            searchPlaceholder="Search customer..."
            accentColor="#0891b2"
          />
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

function CapaBottomTable({ data, filters, selectedCapaId, onSelectCapaId }) {
  const capaRows = Array.isArray(data?.capaCompare?.rows) ? data.capaCompare.rows : [];

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return { from: `${year}-${month}-01`, to: `${year}-${month}-${day}` };
  }, []);

  const filteredCapa = React.useMemo(
    () => filterCapaRows(capaRows, filters, defaultRange.from, defaultRange.to),
    [capaRows, filters, defaultRange]
  );

  const rows = React.useMemo(() => {
    return filteredCapa.map((row, idx) => {
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

      const age = calcCapaAgeDays(row);

      return [
        String(idx + 1),
        complNoElement,
        row.complDate || "—",
        row.customer || "—",
        row.partNo || "—",
        row.description || "—",
        row.complDescription || "—",
        row.qcIncharge || "—",
        statusElement,
        age != null ? `${age}d` : "—",
        row.repeatedComplaint || row.actionTaken || "Pending"
      ];
    });
  }, [filteredCapa, onSelectCapaId]);

  const columns = [
    "Sl.No",
    "Complaint No",
    "Date",
    "Customer",
    "Part No",
    "Description",
    "Complaint Description",
    "QC Incharge",
    "Status",
    "Age Days",
    "Repeated Complaint"
  ];

  return <PremiumDashboardBottomTable title="Quality Action Plan (CAPA) Registry" columns={columns} rows={rows} />;
}

function filterCompRows(rows, filters, defaultFrom, defaultTo) {
  const source = Array.isArray(rows) ? rows : [];
  const activeFrom = filters?.fromDate || defaultFrom;
  const activeTo = filters?.toDate || defaultTo;

  return source.filter((r) => {
    const d = (r.date || "").slice(0, 10);
    if (!d || d < activeFrom || d > activeTo) return false;
    if (filters?.customer) {
      const selected = filters.customer.split(",").map(c => c.trim()).filter(Boolean);
      if (selected.length > 0 && !selected.includes(String(r.customer || ""))) {
        return false;
      }
    }
    if (filters?.status && String(r.status || "") !== String(filters.status)) return false;
    return true;
  });
}

function computeCompKpis(filteredRows) {
  const rows = Array.isArray(filteredRows) ? filteredRows : [];
  if (!rows.length) {
    return { activeComplaints: 0, resolvedComplaints: 0, avgResolutionDays: 0, satisfactionPct: 0 };
  }
  const active = rows.filter((r) => String(r.status || "").toLowerCase() === "open").length;
  const resolved = rows.filter((r) => String(r.status || "").toLowerCase() === "closed").length;
  const resDays = rows
    .filter((r) => String(r.status || "").toLowerCase() === "closed" && r.resolutionDays != null)
    .map((r) => Number(r.resolutionDays));
  const avgResolutionDays = resDays.length
    ? Number((resDays.reduce((a, b) => a + b, 0) / resDays.length).toFixed(1))
    : 0;
  const withStatus = rows.filter((r) => String(r.status || "").trim());
  const satisfactionPct = withStatus.length
    ? Number(((resolved / withStatus.length) * 100).toFixed(1))
    : 0;
  return { activeComplaints: active, resolvedComplaints: resolved, avgResolutionDays, satisfactionPct };
}

function buildCompChartData(filteredRows, monthLabels) {
  const labels = monthLabels.length ? monthLabels : [];
  const received = labels.map((mo) => filteredRows.filter((r) => r.month === mo).length);
  const open = labels.map((mo) => filteredRows.filter((r) => r.month === mo && String(r.status || "").toLowerCase() === "open").length);
  const closed = labels.map((mo) => filteredRows.filter((r) => r.month === mo && String(r.status || "").toLowerCase() === "closed").length);
  return { labels, received, open, closed };
}

function CustomerComplaintReportDashboardView({ data, loading, filters, onFilterChange, onClose, uid, onCompData }) {
  const [compLive, setCompLive] = React.useState(null);
  const [compLoading, setCompLoading] = React.useState(false);
  const compSource = compLive || data?.complaintCompare;

  const [statusOpen, setStatusOpen] = React.useState(false);
  const [chartType, setChartType] = React.useState("bar");
  const [chartTypeOpen, setChartTypeOpen] = React.useState(false);

  const statusRef = React.useRef(null);
  const chartTypeRef = React.useRef(null);

  React.useEffect(() => {
    const ctrl = new AbortController();
    setCompLoading(true);
    const fy = currentFinancialYearRange();
    fetch(buildCompUrl(fy.from, fy.to), {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok || json?.error) throw new Error(json?.error || "Customer Complaint load failed");
        setCompLive(json);
        onCompData?.(json);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setCompLive(null);
        onCompData?.(data?.complaintCompare || null);
      })
      .finally(() => setCompLoading(false));
    return () => ctrl.abort();
  }, [uid, onCompData, data?.complaintCompare]);

  const compRows = React.useMemo(
    () => (Array.isArray(compSource?.rows) ? compSource.rows : []),
    [compSource?.rows]
  );

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return { from: `${year}-${month}-01`, to: `${year}-${month}-${day}` };
  }, []);

  const filteredRows = React.useMemo(
    () => filterCompRows(compRows, filters, defaultRange.from, defaultRange.to),
    [compRows, filters, defaultRange]
  );

  const monthLabels = React.useMemo(() => {
    const from = filters?.fromDate || defaultRange.from;
    const to = filters?.toDate || defaultRange.to;
    const fromDt = new Date(from);
    const toDt = new Date(to);
    const labels = [];
    if (Number.isNaN(fromDt.getTime()) || Number.isNaN(toDt.getTime())) {
      return compSource?.monthLabels || [];
    }
    let y = fromDt.getFullYear();
    let m = fromDt.getMonth();
    const endY = toDt.getFullYear();
    const endM = toDt.getMonth();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    while (y < endY || (y === endY && m <= endM)) {
      labels.push(`${monthNames[m]} ${y}`);
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    return labels.length ? labels : (compSource?.monthLabels || []);
  }, [filters?.fromDate, filters?.toDate, defaultRange, compSource?.monthLabels]);

  const chart1Data = React.useMemo(
    () => buildCompChartData(filteredRows, monthLabels),
    [filteredRows, monthLabels]
  );

  const compKpis = React.useMemo(() => computeCompKpis(filteredRows), [filteredRows]);

  const kpis = [
    { label: "Active Complaints", value: String(compKpis.activeComplaints), icon: AlertTriangle, color: "#ef4444" },
    { label: "Resolved", value: String(compKpis.resolvedComplaints), icon: CheckCircle2, color: "#10b981" },
    { label: "Avg Resolution", value: `${compKpis.avgResolutionDays}d`, icon: Timer, color: "#3b82f6" },
    { label: "Satisfaction", value: `${compKpis.satisfactionPct}%`, icon: Smile, color: "#8b5cf6" }
  ];

  const customersList = React.useMemo(() => {
    const api = compSource?.filterOptions?.customers;
    return Array.isArray(api) && api.length ? api : [];
  }, [compSource?.filterOptions?.customers]);

  const statusesList = React.useMemo(() => {
    const api = compSource?.filterOptions?.statuses;
    return Array.isArray(api) && api.length ? api : ["Open", "Closed"];
  }, [compSource?.filterOptions?.statuses]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
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
      const totalReceived = chart1Data.received.reduce((a, b) => a + b, 0);
      const totalOpen = chart1Data.open.reduce((a, b) => a + b, 0);
      const totalClosed = chart1Data.closed.reduce((a, b) => a + b, 0);
      const maxVal = Math.max(1, ...chart1Data.received, ...chart1Data.open, ...chart1Data.closed);

      if (chartType === "polarArea") {
        return createPp1Chart(canvas, {
          type: "polarArea",
          data: {
            labels: ["Received", "Open", "Closed"],
            datasets: [
              {
                data: [totalReceived, totalOpen, totalClosed],
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
          data: chart1Data.received,
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
          data: chart1Data.open,
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
          data: chart1Data.closed,
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

      return createPp1Chart(canvas, {
        type: chartType === "radar" ? "radar" : (chartType === "bar" ? "bar" : "line"),
        data: {
          labels: chart1Data.labels,
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
              suggestedMax: maxVal + 1
            }
          } : {
            x: { grid: { display: false }, ticks: { font: { size: 9 } } },
            y: {
              min: 0,
              max: maxVal + 1,
              grid: { color: "rgba(0,0,0,0.05)" },
              ticks: { font: { size: 9 }, stepSize: Math.max(1, Math.ceil((maxVal + 1) / 4)) }
            }
          }
        }
      });
    },
    [chartType, chart1Data]
  );

  const rebuildToken = `cc-report-chart|${chartType}|${filteredRows.length}|${compKpis.activeComplaints}`;

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
      noData={filteredRows.length === 0}
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

        {/* Customer Name Filter */}
        <div className="pp1-filter-group" style={{ minWidth: '180px' }}>
          <label className="pp1-filter-label">Customer Name</label>
          <Pp1SearchableMultiSelect
            value={filters?.customer}
            options={customersList}
            onChange={val => handleInputChange("customer", val)}
            placeholder="Search customer..."
            allLabel="All Customers"
            searchPlaceholder="Search customer..."
          />
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

function calcComplaintAgeDays(row) {
  const iso = (row?.date || "").slice(0, 10);
  let start = null;
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    start = new Date(`${iso}T00:00:00`);
  } else {
    const parsed = parseTableDate(row?.complaintDateDisplay || "");
    if (parsed) start = new Date(`${parsed}T00:00:00`);
  }
  if (!start || Number.isNaN(start.getTime())) {
    return row?.ageDays != null ? Number(row.ageDays) : null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24)));
}

function CustomerComplaintReportBottomTable({ data, filters }) {
  const columns = ["Sl.No", "Complaint ID", "Complaint Dt", "Customer Name", "Product", "Complaint Description", "Status", "Age Days"];
  const compRows = Array.isArray(data?.complaintCompare?.rows) ? data.complaintCompare.rows : [];

  const defaultRange = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return { from: `${year}-${month}-01`, to: `${year}-${month}-${day}` };
  }, []);

  const filteredRows = React.useMemo(() => {
    const list = filterCompRows(compRows, filters, defaultRange.from, defaultRange.to);
    return list.map((row, idx) => [
      String(idx + 1),
      row.complaintId || "—",
      row.complaintDateDisplay || row.date || "—",
      row.customer || "—",
      row.product || "—",
      row.complaintDescription || "—",
      row.status || "—",
      (() => {
        const age = calcComplaintAgeDays(row);
        return age != null ? `${age} Days` : "—";
      })(),
    ]);
  }, [compRows, filters, defaultRange]);

  return <PremiumDashboardBottomTable title="Customer Complaints Registry" columns={columns} rows={filteredRows} />;
}


/* ── Center panel animated wrapper (zero-latency) ──────────── */
function CenterTransitionWrapper({ uid, loading, children }) {
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

class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      hasError: true,
      error: error,
      errorInfo: errorInfo
    });
    console.error("DashboardErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "24px",
          margin: "16px",
          background: "rgba(239, 68, 68, 0.05)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          borderRadius: "12px",
          color: "#b91c1c",
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: "14px",
          lineHeight: "1.6"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ fontSize: "20px" }}>⚠️</span>
            <h3 style={{ margin: 0, color: "#991b1b", fontWeight: 700, fontSize: "16px" }}>
              Dashboard Component Error
            </h3>
          </div>
          <p style={{ fontWeight: 600, margin: "0 0 12px 0", color: "#7f1d1d" }}>
            {this.state.error && this.state.error.toString()}
          </p>
          <pre style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            background: "#fff",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid rgba(239, 68, 68, 0.1)",
            maxHeight: "220px",
            overflowY: "auto",
            color: "#450a0a",
            fontFamily: "monospace",
            fontSize: "12px"
          }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={{
              marginTop: "16px",
              padding: "8px 16px",
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "13px",
              transition: "all 0.15s ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "#dc2626"}
            onMouseOut={(e) => e.currentTarget.style.background = "#ef4444"}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
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
    fromDate: "",
    toDate: "",
    customer: "",
    partNumber: "",
  });
  const [otdPanelData, setOtdPanelData] = useState(null);
  const [effPanelData, setEffPanelData] = useState(null);
  const [oeePanelData, setOeePanelData] = useState(null);
  const [rejPanelData, setRejPanelData] = useState(null);
  const [rewPanelData, setRewPanelData] = useState(null);
  const [compPanelData, setCompPanelData] = useState(null);
  const [capaPanelData, setCapaPanelData] = useState(null);
  const [opEffPanelData, setOpEffPanelData] = useState(null);
  const [machEffPanelData, setMachEffPanelData] = useState(null);
  const [dailyProdPanelData, setDailyProdPanelData] = useState(null);
  const [prodValuePanelData, setProdValuePanelData] = useState(null);
  const [fgValuePanelData, setFgValuePanelData] = useState(null);
  const [targetVsActualPanelData, setTargetVsActualPanelData] = useState(null);
  const [srPanelData, setSrPanelData] = useState(null);
  const [vrPanelData, setVrPanelData] = useState(null);
  const [stockPanelData, setStockPanelData] = useState(null);
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
    customer: [],
    itemCode: "",
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
  const [machineEfficiencyFilters, setMachineEfficiencyFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    machine: "",
    effLimit: "",
  });
  const [capaFilters, setCapaFilters] = useState({
    fromDate: defaultFrom,
    toDate: defaultTo,
    customer: "",
    status: "",
  });
  const [selectedCapaId, setSelectedCapaId] = useState(null);
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
  const [prodXAxisGroup, setProdXAxisGroup] = useState("Machine");
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
  const [oeeCompXAxisGroup, setOeeCompXAxisGroup] = useState("Overall");
  const [effXAxisGroup, setEffXAxisGroup] = useState("Overall");
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
    category: [],
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
      setRejPanelData(null);
      setRewPanelData(null);
      setCompPanelData(null);
      setCapaPanelData(null);
      setOpEffPanelData(null);
      setDailyProdPanelData(null);
      setProdValuePanelData(null);
      setFgValuePanelData(null);
      setTargetVsActualPanelData(null);
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

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      const fromStr = formatLocalYmd(dateRange.from);
      const toStr = formatLocalYmd(dateRange.to);
      setSupplierFilters(prev => ({
        ...prev,
        fromDate: fromStr,
        toDate: toStr
      }));
      setMachineEfficiencyFilters(prev => ({
        ...prev,
        fromDate: fromStr,
        toDate: toStr
      }));
    }
  }, [dateRange]);

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
    const pvMonthlyTotals = {};
    const pvCompareRows = data?.purchaseValueCompare?.rows;
    if (pvCompareRows && Array.isArray(pvCompareRows)) {
      const filteredForTrend = pvCompareRows.filter(r => {
        if (purchaseValueFilters.supplier && r.supplierName !== purchaseValueFilters.supplier) return false;
        if (purchaseValueFilters.partNumber) {
          const pno = String(r.partNo || "").toLowerCase();
          if (!pno.includes(String(purchaseValueFilters.partNumber).toLowerCase())) return false;
        }
        if (purchaseValueFilters.category && (r.category || "") !== purchaseValueFilters.category) return false;
        return true;
      });
      filteredForTrend.forEach((r) => {
        const mKey = r.monthName || r.month;
        if (!mKey || mKey === "—") return;
        pvMonthlyTotals[mKey] = (pvMonthlyTotals[mKey] || 0) + Number(r.amount || 0);
      });
    }
    const pvMonthVals = Object.values(pvMonthlyTotals);
    if (pvMonthVals.length > 0) {
      const pvMinMonthly = Math.min(...pvMonthVals);
      const pvOk = pvMonthVals.every(v => v >= pvTarget);
      const pvDiff = pvTarget > 0 ? (((pvMinMonthly - pvTarget) / pvTarget) * 100).toFixed(1) : "0.0";
      map["purchase_value_report_dashboard"] = {
        type: pvOk ? "up" : "down",
        value: `${pvOk ? "+" : ""}${pvDiff}%`,
        message: pvOk
          ? `All monthly purchase values meet target (₹${pvTarget}L/month)`
          : `Monthly purchase value (₹${pvMinMonthly.toFixed(2)}L) is below target (₹${pvTarget}L/month)`,
        priority: pvOk ? "medium" : "high"
      };
    } else {
      const pvActual = 0;
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
    }

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

    const rejLimit = resolveRejectionLimit(targetConfig, rejFilters.rejType);
    const rejSource = data?.rejectionCompare || rejPanelData;
    let rejPct = null;
    let rejQty = 0;
    let rejValue = 0;
    const rejRowsForTrend = Array.isArray(rejSource?.rows) ? rejSource.rows : [];
    const rejTrendFrom = rejFilters.fromDate || (dateRange.from
      ? `${dateRange.from.getFullYear()}-${String(dateRange.from.getMonth() + 1).padStart(2, "0")}-${String(dateRange.from.getDate()).padStart(2, "0")}`
      : defaultFrom);
    const rejTrendTo = rejFilters.toDate || (dateRange.to
      ? `${dateRange.to.getFullYear()}-${String(dateRange.to.getMonth() + 1).padStart(2, "0")}-${String(dateRange.to.getDate()).padStart(2, "0")}`
      : defaultTo);
    if (rejRowsForTrend.length) {
      const rejFiltered = filterRejRows(rejRowsForTrend, rejFilters, rejTrendFrom, rejTrendTo);
      if (rejFiltered.length) {
        rejQty = rejFiltered.reduce((acc, r) => acc + Number(r.rejQty || 0), 0);
        rejValue = rejFiltered.reduce((acc, r) => acc + Number(r.rejValue || 0), 0);
        const totalInsp = rejFiltered.reduce((acc, r) => acc + Number(r.inspQty || 0), 0);
        if (totalInsp > 0) rejPct = Number(((rejQty / totalInsp) * 100).toFixed(1));
      } else if (!hasActiveRejDimensionFilters(rejFilters)) {
        rejPct = 0;
        rejQty = 0;
        rejValue = 0;
      }
    }
    if (rejPct == null && rejSource?.kpis?.avgRejPct != null && !hasActiveRejDimensionFilters(rejFilters)) {
      rejPct = Number(Number(rejSource.kpis.avgRejPct).toFixed(1));
      rejQty = Number(rejSource.kpis.totalRejQty || 0);
      rejValue = Number(rejSource.kpis.totalRejValue || 0);
    }
    if (rejPct != null) {
      const rejOk = rejPct <= rejLimit;
      const rejDiff = rejLimit > 0 ? (((rejLimit - rejPct) / rejLimit) * 100).toFixed(1) : "0.0";
      map["rejection_report_dashboard"] = {
        type: rejOk ? "up" : "down",
        value: `${rejOk ? "+" : "-"}${Math.abs(Number(rejDiff))}%`,
        message: rejOk
          ? `Rejection (${rejPct}%, Qty ${Math.round(rejQty)}, ${formatInrValue(rejValue)}) is within target (≤${rejLimit}%)`
          : `Rejection (${rejPct}%, Qty ${Math.round(rejQty)}, ${formatInrValue(rejValue)}) exceeds target (≤${rejLimit}%)`,
        priority: "high"
      };
    }

    const rewLimit = resolveReworkLimit(targetConfig, reworkXAxisGroup);
    const rewSource = data?.reworkCompare || rewPanelData;
    let rewPct = null;
    let rewQty = 0;
    let rewValue = 0;
    const rewRowsForTrend = Array.isArray(rewSource?.rows) ? rewSource.rows : [];
    const rewTrendFrom = rewFilters.fromDate || (dateRange.from
      ? `${dateRange.from.getFullYear()}-${String(dateRange.from.getMonth() + 1).padStart(2, "0")}-${String(dateRange.from.getDate()).padStart(2, "0")}`
      : defaultFrom);
    const rewTrendTo = rewFilters.toDate || (dateRange.to
      ? `${dateRange.to.getFullYear()}-${String(dateRange.to.getMonth() + 1).padStart(2, "0")}-${String(dateRange.to.getDate()).padStart(2, "0")}`
      : defaultTo);
    if (rewRowsForTrend.length) {
      const rewFiltered = filterRewRows(rewRowsForTrend, rewFilters, rewTrendFrom, rewTrendTo, reworkXAxisGroup);
      if (rewFiltered.length) {
        rewQty = rewFiltered.reduce((acc, r) => acc + Number(r.reworkQty || 0), 0);
        rewValue = rewFiltered.reduce((acc, r) => acc + Number(r.reworkValue || 0), 0);
        const totalInsp = rewFiltered.reduce((acc, r) => acc + Number(r.inspQty || 0), 0);
        if (totalInsp > 0) rewPct = Number(((rewQty / totalInsp) * 100).toFixed(1));
      } else if (!hasActiveRewDimensionFilters(rewFilters, reworkXAxisGroup)) {
        rewPct = 0;
        rewQty = 0;
        rewValue = 0;
      }
    }
    if (rewPct == null && rewSource?.kpis?.avgReworkPct != null && !hasActiveRewDimensionFilters(rewFilters, reworkXAxisGroup)) {
      rewPct = Number(Number(rewSource.kpis.avgReworkPct).toFixed(1));
      rewQty = Number(rewSource.kpis.totalReworkQty || 0);
      rewValue = Number(rewSource.kpis.totalReworkValue || 0);
    }
    if (rewPct != null) {
      const rewOk = rewPct <= rewLimit;
      const rewDiff = rewLimit > 0 ? (((rewLimit - rewPct) / rewLimit) * 100).toFixed(1) : "0.0";
      map["rework_report_dashboard"] = {
        type: rewOk ? "up" : "down",
        value: `${rewOk ? "+" : "-"}${Math.abs(Number(rewDiff))}%`,
        message: rewOk
          ? `Rework (${rewPct}%, Qty ${Math.round(rewQty)}, ${formatInrValue(rewValue)}) is within target (≤${rewLimit}%)`
          : `Rework (${rewPct}%, Qty ${Math.round(rewQty)}, ${formatInrValue(rewValue)}) exceeds target (≤${rewLimit}%)`,
        priority: "high"
      };
    }
    const oeeMinUtilization = targetConfig.oee_comparison?.monthWiseTarget ?? targetConfig.oee_comparison?.minUtilization ?? 75;
    const oeeSource = oeePanelData || data?.oeeCompare;
    let currentOee = null;
    const oeeRowsForTrend = Array.isArray(oeeSource?.rows) ? oeeSource.rows : [];
    if (oeeRowsForTrend.length) {
      const activeFrom = oeeCompFilters.fromDate || defaultFrom;
      const activeTo = oeeCompFilters.toDate || defaultTo;
      const oeeFiltered = filterOeeRows(oeeRowsForTrend, oeeCompFilters, activeFrom, activeTo);
      if (oeeFiltered.length) {
        const sum = oeeFiltered.reduce((acc, r) => acc + Number(r.overallOee || 0), 0);
        currentOee = Math.round(sum / oeeFiltered.length);
      }
    }
    if (currentOee == null && oeeSource?.kpis?.avgOee != null && !oeeCompFilters.machineType && !oeeCompFilters.machine) {
      currentOee = Math.round(Number(oeeSource.kpis.avgOee));
    }
    if (currentOee != null && Number(currentOee) >= 0) {
      const oeeOk = currentOee >= oeeMinUtilization;
      const oeeDiff = oeeMinUtilization > 0 ? (((currentOee - oeeMinUtilization) / oeeMinUtilization) * 100).toFixed(1) : "0.0";
      map["oee_comparison_report_dashboard"] = {
        type: oeeOk ? "up" : "down",
        value: `${oeeOk ? "+" : ""}${oeeDiff}%`,
        message: oeeOk
          ? `Overall OEE (${currentOee}%) meets target limit (${oeeMinUtilization}%)`
          : `Overall OEE (${currentOee}%) is below target limit (${oeeMinUtilization}%)`,
        priority: oeeOk ? "medium" : "high"
      };
    }

    const effTarget = targetConfig.efficiency?.monthWiseTarget ?? 80;
    const effSource = effPanelData || data?.efficiencyCompare;
    let currentEff = null;
    const effRowsForTrend = Array.isArray(effSource?.rows) ? effSource.rows : [];
    if (effRowsForTrend.length) {
      const activeFrom = effFilters.fromDate || defaultFrom;
      const activeTo = effFilters.toDate || defaultTo;
      const effFiltered = filterEffRows(effRowsForTrend, effFilters, activeFrom, activeTo);
      if (effFiltered.length) {
        const sum = effFiltered.reduce((acc, r) => acc + Number(r.oaeff || 0), 0);
        currentEff = Math.round(sum / effFiltered.length);
      }
    }
    if (currentEff == null && effSource?.kpis?.avgOaeff != null && !effFilters.team && !effFilters.machineType && !effFilters.machine && !effFilters.operatorName) {
      currentEff = Math.round(Number(effSource.kpis.avgOaeff));
    }
    if (currentEff != null && Number(currentEff) >= 0) {
      const effOk = currentEff >= effTarget;
      const effDiff = effTarget > 0 ? (((currentEff - effTarget) / effTarget) * 100).toFixed(1) : "0.0";
      map["efficiency_eff_report_dashboard"] = {
        type: effOk ? "up" : "down",
        value: `${effOk ? "+" : ""}${effDiff}%`,
        message: effOk
          ? `Overall Efficiency (${currentEff}%) meets target limit (${effTarget}%)`
          : `Overall Efficiency (${currentEff}%) is below target limit (${effTarget}%)`,
        priority: effOk ? "medium" : "high"
      };
    }

    const prodTarget = targetConfig.production_analysis?.minProductionValue ?? 12.0;
    const pvSource = data?.productionValueCompare || prodValuePanelData;
    const pvMachineRows = Array.isArray(pvSource?.machineRows) ? pvSource.machineRows : (pvSource?.rows || []);
    const pvFilteredDetail = filterProdValueDetailRows(
      pvSource?.detailRows || [],
      prodFilters,
      defaultFrom,
      defaultTo
    );
    let pvScopedMachines = pvMachineRows;
    if (prodFilters.team) {
      const teamMacs = new Set(pvFilteredDetail.filter((r) => r.team === prodFilters.team).map((r) => r.machine));
      pvScopedMachines = pvScopedMachines.filter((r) => teamMacs.has(r.machine));
    }
    if (prodFilters.machine) {
      pvScopedMachines = pvScopedMachines.filter(
        (r) => r.machine === prodFilters.machine || r.machineName === prodFilters.machine
      );
    }
    if (prodFilters.operator) {
      const opMacs = new Set(
        pvFilteredDetail.filter((r) =>
          String(r.operator || "").toLowerCase().includes(String(prodFilters.operator).toLowerCase())
        ).map((r) => r.machine)
      );
      pvScopedMachines = pvScopedMachines.filter((r) => opMacs.has(r.machine));
    }
    const currentProdVal = pvScopedMachines.length
      ? Math.round((pvScopedMachines.reduce((acc, r) => acc + Number(r.productionValue || 0), 0) / 100000) * 100) / 100
      : null;
    if (currentProdVal != null) {
      const prodOk = currentProdVal >= prodTarget;
      const prodDiff = prodTarget > 0 ? (((currentProdVal - prodTarget) / prodTarget) * 100).toFixed(1) : "0.0";
      map["production_analysis_report_dashboard"] = {
        type: prodOk ? "up" : "down",
        value: `${prodOk ? "+" : ""}${prodDiff}%`,
        message: prodOk
          ? `Total Production Value (₹${currentProdVal}L) meets target limit (₹${prodTarget}L)`
          : `Total Production Value (₹${currentProdVal}L) is below target limit (₹${prodTarget}L)`,
        priority: prodOk ? "medium" : "high"
      };
    }

    // Store Stock Value trend calculation
    const stockVal = data?.storeStockValue?.kpi?.totalStockValueLakhs ?? 0.0;
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
    const otdPct = (otdPanelData || data?.otd)?.kpis?.on_time_delivery_pct;
    const otdTarget = targetConfig.otd?.targetPct ?? 90;
    if (otdPct != null && !Number.isNaN(Number(otdPct))) {
      const otdOk = otdPct >= otdTarget;
      const otdDiff = otdTarget > 0 ? (((otdPct - otdTarget) / otdTarget) * 100).toFixed(1) : "0.0";
      map["otd_report_dashboard"] = {
        type: otdOk ? "up" : "down",
        value: `${otdOk ? "+" : ""}${otdDiff}%`,
        message: otdOk
          ? `On-Time Delivery (${otdPct}%) meets target limit (${otdTarget}%)`
          : `On-Time Delivery (${otdPct}%) is below target limit (${otdTarget}%)`,
        priority: otdOk ? "medium" : "high"
      };
    }

    // Supplier Rating trend calculation (UI alone)
    const _srData = data?.supplierRating?.data;
    const supplierRating = Array.isArray(_srData) && _srData.length > 0
      ? Number((_srData.reduce((a, b) => a + b, 0) / _srData.length).toFixed(1))
      : 0;
    const supplierTarget = targetConfig.supplier_rating?.minRating ?? 90;
    const supplierOk = supplierRating >= supplierTarget;
    const supplierDiff = supplierRating > 0 ? (((supplierRating - supplierTarget) / supplierTarget) * 100).toFixed(1) : "0.0";
    map["supplier_rating_report_dashboard"] = {
      type: supplierOk ? "up" : "down",
      value: `${supplierOk ? "+" : ""}${supplierDiff}%`,
      message: supplierOk
        ? `Supplier Rating (${supplierRating}%) meets target limit (${supplierTarget}%)`
        : `Supplier Rating (${supplierRating}%) is below target limit (${supplierTarget}%)`,
      priority: supplierOk ? "medium" : "high"
    };

    // Vendor Rating trend calculation (from live API data)
    const _vrData = vrPanelData || data?.vendorRating;
    const _vrChartData = Array.isArray(_vrData?.data) && _vrData.data.length > 0 ? _vrData.data : null;
    const _vrKpi = _vrData?.kpis;
    const vendorRating = _vrKpi?.avg_rating != null
      ? Number(_vrKpi.avg_rating)
      : _vrChartData
        ? Number((_vrChartData.reduce((a, b) => a + b, 0) / _vrChartData.length).toFixed(1))
        : 0;
    const vendorTarget = targetConfig.vendor_rating?.minRating ?? 90;
    const vendorOk = vendorRating > 0 && vendorRating >= vendorTarget;
    const vendorDiff = vendorRating > 0 && vendorTarget > 0 ? (((vendorRating - vendorTarget) / vendorTarget) * 100).toFixed(1) : "0.0";
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

    // Daily Production trend — machines exceeding balance hours limit
    const dpSource = data?.dailyProductionCompare || dailyProdPanelData;
    const dpRowsForTrend = Array.isArray(dpSource?.rows) ? dpSource.rows : [];
    const dpTrendFrom = dailyProductionFilters.fromDate || (dateRange.from
      ? `${dateRange.from.getFullYear()}-${String(dateRange.from.getMonth() + 1).padStart(2, "0")}-${String(dateRange.from.getDate()).padStart(2, "0")}`
      : defaultFrom);
    const dpTrendTo = dailyProductionFilters.toDate || (dateRange.to
      ? `${dateRange.to.getFullYear()}-${String(dateRange.to.getMonth() + 1).padStart(2, "0")}-${String(dateRange.to.getDate()).padStart(2, "0")}`
      : defaultTo);
    const maxAllowedHrs = targetConfig.daily_production?.maxBalanceHours ?? 4.0;
    if (dpRowsForTrend.length || dpSource?.kpis) {
      const dpFiltered = filterDailyProdRows(dpRowsForTrend, dailyProductionFilters, dpTrendFrom, dpTrendTo);
      const dpUse = dpFiltered.length ? dpFiltered : dpRowsForTrend;
      const byMacBalance = {};
      dpUse.forEach((r) => {
        const mac = r.machine || "—";
        byMacBalance[mac] = (byMacBalance[mac] || 0) + Number(r.balance || 0);
      });
      const dpExceedsList = Object.entries(byMacBalance).filter(([, hrs]) => hrs > maxAllowedHrs);
      const dpOk = dpExceedsList.length === 0;
      map["daily_production_report_dashboard"] = {
        type: dpOk ? "up" : "down",
        value: dpOk ? "OK" : `${dpExceedsList.length} Over`,
        message: dpOk
          ? `All machines are within the Balance Hours limit of ${maxAllowedHrs} hrs.`
          : `${dpExceedsList.length} machine(s) exceed the Balance Hours limit of ${maxAllowedHrs} hrs.`,
        priority: dpOk ? "medium" : "high"
      };
    }

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

    // Operator Efficiency trend — avg OPREFF from live data
    const opEffSource = data?.operatorEfficiencyCompare || opEffPanelData;
    const opEffRowsForTrend = Array.isArray(opEffSource?.rows) ? opEffSource.rows : [];
    const opEffTrendFrom = operatorEfficiencyFilters.fromDate || (dateRange.from
      ? `${dateRange.from.getFullYear()}-${String(dateRange.from.getMonth() + 1).padStart(2, "0")}-${String(dateRange.from.getDate()).padStart(2, "0")}`
      : defaultFrom);
    const opEffTrendTo = operatorEfficiencyFilters.toDate || (dateRange.to
      ? `${dateRange.to.getFullYear()}-${String(dateRange.to.getMonth() + 1).padStart(2, "0")}-${String(dateRange.to.getDate()).padStart(2, "0")}`
      : defaultTo);
    const oeLimit = targetConfig.operator_efficiency?.minEfficiencyPct ?? 90.0;
    if (opEffRowsForTrend.length || opEffSource?.kpis) {
      let oeVal = null;
      const trendFiltered = filterOpEffRows(
        opEffRowsForTrend,
        operatorEfficiencyFilters,
        opEffTrendFrom,
        opEffTrendTo
      );
      if (trendFiltered.length) {
        oeVal = Math.round(trendFiltered.reduce((acc, r) => acc + Number(r.operatorPct || 0), 0) / trendFiltered.length);
      } else if (opEffSource?.kpis?.avgEfficiency != null && !operatorEfficiencyFilters.operator && !operatorEfficiencyFilters.effLimit) {
        oeVal = Math.round(Number(opEffSource.kpis.avgEfficiency));
      }
      if (oeVal != null) {
        const oeOk = oeVal >= oeLimit;
        const oeDiff = oeLimit > 0 ? (((oeVal - oeLimit) / oeLimit) * 100).toFixed(1) : "0.0";
        map["operator_efficiency_report_dashboard"] = {
          type: oeOk ? "up" : "down",
          value: `${oeOk ? "+" : ""}${oeDiff}%`,
          message: oeOk
            ? `Avg Operator Efficiency (${oeVal}%) meets target (${oeLimit}%)`
            : `Avg Operator Efficiency (${oeVal}%) is below target (${oeLimit}%)`,
          priority: oeOk ? "medium" : "high"
        };
      }
    }

    // Machine Efficiency trend calculation (UI alone)
    const meVal = 88.0; // Percent
    const meLimit = targetConfig.machine_efficiency?.minEfficiencyPct ?? 90.0;
    const meOk = meVal >= meLimit;
    map["machine_efficiency_report_dashboard"] = {
      type: meOk ? "up" : "down",
      value: meOk ? "+1.5%" : "-2.0%",
      message: meOk
        ? `Avg Machine Efficiency (${meVal}%) meets target (${meLimit}%)`
        : `Avg Machine Efficiency (${meVal}%) is below target (${meLimit}%)`,
      priority: meOk ? "medium" : "high"
    };

    // Customer Complaint trend — active open complaints
    const compSource = data?.complaintCompare || compPanelData;
    const compRowsForTrend = Array.isArray(compSource?.rows) ? compSource.rows : [];
    const compTrendFrom = compFilters.fromDate || (dateRange.from
      ? `${dateRange.from.getFullYear()}-${String(dateRange.from.getMonth() + 1).padStart(2, "0")}-${String(dateRange.from.getDate()).padStart(2, "0")}`
      : defaultFrom);
    const compTrendTo = compFilters.toDate || (dateRange.to
      ? `${dateRange.to.getFullYear()}-${String(dateRange.to.getMonth() + 1).padStart(2, "0")}-${String(dateRange.to.getDate()).padStart(2, "0")}`
      : defaultTo);
    const compFiltered = filterCompRows(compRowsForTrend, compFilters, compTrendFrom, compTrendTo);
    const compKpiTrend = computeCompKpis(compFiltered.length ? compFiltered : compRowsForTrend);
    if (compRowsForTrend.length || compSource?.kpis) {
      const activeCount = compKpiTrend.activeComplaints;
      const compOk = activeCount === 0;
      map["customer_complaint_report_dashboard"] = {
        type: compOk ? "up" : "down",
        value: compOk ? "0 Open" : `${activeCount} Open`,
        message: compOk
          ? "No active customer complaints in selected period"
          : `${activeCount} active customer complaint(s) require action`,
        priority: compOk ? "medium" : "high"
      };
    }

    // Quality Action Plan (CAPA) trend — open CAPA count
    const capaSource = data?.capaCompare || capaPanelData;
    const capaRowsForTrend = Array.isArray(capaSource?.rows) ? capaSource.rows : [];
    const capaTrendFrom = capaFilters.fromDate || (dateRange.from
      ? `${dateRange.from.getFullYear()}-${String(dateRange.from.getMonth() + 1).padStart(2, "0")}-${String(dateRange.from.getDate()).padStart(2, "0")}`
      : defaultFrom);
    const capaTrendTo = capaFilters.toDate || (dateRange.to
      ? `${dateRange.to.getFullYear()}-${String(dateRange.to.getMonth() + 1).padStart(2, "0")}-${String(dateRange.to.getDate()).padStart(2, "0")}`
      : defaultTo);
    const capaFiltered = filterCapaRows(capaRowsForTrend, capaFilters, capaTrendFrom, capaTrendTo);
    if (capaRowsForTrend.length || capaSource?.kpis) {
      const openCapa = capaFiltered.filter((r) => String(r.status || "").toLowerCase() === "open").length;
      const capaOk = openCapa === 0;
      const sampleOpen = capaFiltered.find((r) => String(r.status || "").toLowerCase() === "open");
      const sampleAge = sampleOpen ? calcCapaAgeDays(sampleOpen) : null;
      map["capa_report_dashboard"] = {
        type: capaOk ? "up" : "down",
        value: capaOk ? "0 Open" : `${openCapa} Open`,
        message: capaOk
          ? "No open CAPA in selected period"
          : sampleOpen
            ? `${openCapa} open CAPA${openCapa > 1 ? "s" : ""} (${sampleOpen.complNo}${sampleAge != null ? ` — ${sampleAge}d` : ""}) require corrective action.`
            : `${openCapa} open CAPA${openCapa > 1 ? "s" : ""} require corrective action.`,
        priority: capaOk ? "medium" : "high"
      };
    }

    return map;
  }, [targetConfig, data, dateRange, otdPanelData, effPanelData, oeePanelData, rejPanelData, rewPanelData, compPanelData, capaPanelData, opEffPanelData, dailyProdPanelData, prodValuePanelData, vrPanelData, poFilters, purFilters, salesFilters, purchaseValueFilters, effFilters, oeeCompFilters, rejFilters, rewFilters, compFilters, capaFilters, operatorEfficiencyFilters, dailyProductionFilters, prodFilters, vendorFilters, reworkXAxisGroup, defaultFrom, defaultTo]);

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
        const val = resolveRejectionLimit(targetConfig, rejFilters.rejType);
        return `Limit: ≤${val}%`;
      }
      case "rework_report_dashboard": {
        const val = resolveReworkLimit(targetConfig, reworkXAxisGroup);
        return `Limit: ≤${val}%`;
      }
      case "customer_complaint_report_dashboard":
        return "Status: Open = Action";
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
      case "machine_efficiency_report_dashboard": {
        const val = targetConfig.machine_efficiency?.minEfficiencyPct ?? 90.0;
        return `Min: ${val}%`;
      }
      case "idle_hours_non_accepted_reason_production_loss_report": {
        const val = targetConfig.idle_hours_non_accepted?.maxNonAcceptedHours ?? 5;
        return `Limit: ≤${val}h`;
      }
      default:
        return "";
    }
  }, [targetConfig, rejFilters.rejType, reworkXAxisGroup]);

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
                          { id: "grn_value", label: "GRN Value", icon: Truck },
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
                          { id: "operator_efficiency", label: "Operator Efficiency", icon: Users },
                          { id: "machine_efficiency", label: "Machine Efficiency", icon: Cpu }
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

                      {activeTargetTab === "machine_efficiency" && (
                        <div className="pp1-target-settings">
                          <h4 className="pp1-target-settings__title">Machine Efficiency Target</h4>
                          <p className="pp1-target-settings__desc">Set the minimum acceptable machine efficiency percentage.</p>

                          <div className="pp1-target-field">
                            <div className="pp1-target-field__label-row">
                              <span className="pp1-target-field__name">Min Machine Efficiency (%)</span>
                            </div>
                            <div className="pp1-target-input-container">
                              <input
                                type="number" step="0.5" min="0" max="100"
                                value={tempConfig.machine_efficiency?.minEfficiencyPct ?? 90.0}
                                onChange={(e) => handleNestedTempConfigChange("machine_efficiency", "minEfficiencyPct", parseFloat(e.target.value) || 0)}
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
                <DashboardErrorBoundary>
                  {selectionId === "customer_po_vs_sales_analysis" ? (
                    <CustomerPoCompareView data={data} loading={loading} uid={centerKey} filters={poFilters} onFilterChange={setPoFilters} activeSlide={poActiveSlide} onActiveSlideChange={setPoActiveSlide} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setPoShowTargetOnly(false); }} targetConfig={targetConfig} showTargetOnly={poShowTargetOnly} setShowTargetOnly={setPoShowTargetOnly} />
                  ) : selectionId === "purchase_report_dashboard" ? (
                    <PurchaseReportDashboardView data={data} loading={loading} filters={purFilters} onFilterChange={setPurFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }} targetConfig={targetConfig} trend={computedCardTrends["purchase_report_dashboard"]} />
                  ) : selectionId === "purchase_value_report_dashboard" ? (
                    <PurchaseValueDashboardView data={data} filters={purchaseValueFilters} onFilterChange={setPurchaseValueFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }} targetConfig={targetConfig} />
                  ) : selectionId === "sales_analysis_report_dashboard" ? (
                    <SalesAnalysisReportDashboardView data={data} loading={loading} filters={salesFilters} onFilterChange={setSalesFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }} targetConfig={targetConfig} trend={computedCardTrends["sales_analysis_report_dashboard"]} />
                  ) : selectionId === "production_analysis_report_dashboard" ? (
                    <ProductionAnalysisReportDashboardView data={data} loading={loading} filters={prodFilters} onFilterChange={setProdFilters} xAxisGroup={prodXAxisGroup} setXAxisGroup={setProdXAxisGroup} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setProdValuePanelData(null); }} targetConfig={targetConfig} uid={centerKey} onProdValueData={setProdValuePanelData} defaultFrom={defaultFrom} defaultTo={defaultTo} />
                  ) : selectionId === "supplier_rating_report_dashboard" ? (
                    <SupplierRatingReportDashboardView data={data} filters={supplierFilters} onFilterChange={setSupplierFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setSrPanelData(null); }} targetConfig={targetConfig} onSrData={setSrPanelData} />
                  ) : selectionId === "idle_hours_report_dashboard" ? (
                    <IdleHoursReportDashboardView filters={idleFilters} onFilterChange={setIdleFilters} activeTab={idleActiveTab} onActiveTabChange={setIdleActiveTab} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }} targetConfig={targetConfig} />
                  ) : selectionId === "idle_hours_non_accepted_reason_production_loss_report" ? (
                    <IdleHoursNonAcceptedReasonLossReportView filters={nonAccFilters} onFilterChange={setNonAccFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); }} targetConfig={targetConfig} />
                  ) : selectionId === "oee_comparison_report_dashboard" ? (
                    <OeeComparisonReportDashboardView data={data} loading={loading} filters={oeeCompFilters} onFilterChange={setOeeCompFilters} activeTab={oeeCompActiveTab} onActiveTabChange={setOeeCompActiveTab} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setOeePanelData(null); }} targetConfig={targetConfig} xAxisGroup={oeeCompXAxisGroup} setXAxisGroup={setOeeCompXAxisGroup} uid={centerKey} onOeeData={setOeePanelData} />
                  ) : selectionId === "efficiency_eff_report_dashboard" ? (
                    <EfficiencyEffReportDashboardView data={data} loading={loading} filters={effFilters} onFilterChange={setEffFilters} xAxisGroup={effXAxisGroup} setXAxisGroup={setEffXAxisGroup} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setEffPanelData(null); }} targetConfig={targetConfig} uid={centerKey} onEffData={setEffPanelData} />
                  ) : selectionId === "rejection_report_dashboard" ? (
                    <RejectionReportDashboardView data={data} loading={loading} filters={rejFilters} onFilterChange={setRejFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setRejPanelData(null); }} targetConfig={targetConfig} uid={centerKey} onRejData={setRejPanelData} />
                  ) : selectionId === "rework_report_dashboard" ? (
                    <ReworkReportDashboardView data={data} loading={loading} filters={rewFilters} onFilterChange={setRewFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setRewPanelData(null); }} targetConfig={targetConfig} xAxisGroup={reworkXAxisGroup} setXAxisGroup={setReworkXAxisGroup} uid={centerKey} onRewData={setRewPanelData} />
                  ) : selectionId === "store_stock_value_report_dashboard" ? (
                    <StoreStockValueReportDashboardView data={data} filters={stockFilters} onFilterChange={setStockFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setStockPanelData(null); }} targetConfig={targetConfig} onStockData={setStockPanelData} />
                  ) : selectionId === "otd_report_dashboard" ? (
                    <OtdTrendView data={data} loading={loading} uid={centerKey} filters={otdFilters} onFilterChange={setOtdFilters} from={dateRange.from} to={dateRange.to} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setOtdPanelData(null); }} targetConfig={targetConfig} onOtdData={setOtdPanelData} />
                  ) : selectionId === "vendor_rating_report_dashboard" ? (
                    <VendorRatingReportDashboardView data={data} filters={vendorFilters} onFilterChange={setVendorFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setVrPanelData(null); }} targetConfig={targetConfig} uid={centerKey} onVrData={setVrPanelData} />
                  ) : selectionId === "fg_value_report_dashboard" ? (
                    <FgValueReportDashboardView data={data} loading={loading} filters={fgFilters} onFilterChange={setFgFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setFgValuePanelData(null); }} targetConfig={targetConfig} uid={centerKey} onFgValueData={setFgValuePanelData} />
                  ) : selectionId === "daily_production_report_dashboard" ? (
                    <DailyProductionDashboardView data={data} loading={loading} filters={dailyProductionFilters} onFilterChange={setDailyProductionFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setDailyProdPanelData(null); }} targetConfig={targetConfig} uid={centerKey} onDailyProdData={setDailyProdPanelData} />
                  ) : selectionId === "target_vs_actual_report_dashboard" ? (
                    <TargetVsActualDashboardView data={data} loading={loading} filters={targetVsActualFilters} onFilterChange={setTargetVsActualFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setTargetVsActualPanelData(null); }} targetConfig={targetConfig} uid={centerKey} onTargetVsActualData={setTargetVsActualPanelData} />
                  ) : selectionId === "operator_efficiency_report_dashboard" ? (
                    <OperatorEfficiencyDashboardView data={data} loading={loading} filters={operatorEfficiencyFilters} onFilterChange={setOperatorEfficiencyFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setOpEffPanelData(null); }} targetConfig={targetConfig} uid={centerKey} onOpEffData={setOpEffPanelData} />
                  ) : selectionId === "machine_efficiency_report_dashboard" ? (
                    <MachineEfficiencyDashboardView data={data} loading={loading} filters={machineEfficiencyFilters} onFilterChange={setMachineEfficiencyFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setMachEffPanelData(null); }} targetConfig={targetConfig} uid={centerKey} onMachEffData={setMachEffPanelData} />
                  ) : selectionId === "capa_report_dashboard" ? (
                    <CapaDashboardView data={data} loading={loading} filters={capaFilters} onFilterChange={setCapaFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setCapaPanelData(null); }} selectedCapaId={selectedCapaId} onSelectCapaId={setSelectedCapaId} uid={centerKey} onCapaData={setCapaPanelData} />
                  ) : selectionId === "customer_complaint_report_dashboard" ? (
                    <CustomerComplaintReportDashboardView data={data} loading={loading} filters={compFilters} onFilterChange={setCompFilters} onClose={() => { setSelAction(null); setCenterKey((k) => k + 1); setCompPanelData(null); }} uid={centerKey} onCompData={setCompPanelData} />
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
                </DashboardErrorBoundary>
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

        <DashboardErrorBoundary>
          {selectionId === "customer_po_vs_sales_analysis" ? (
            <CustomerPoCompareBottomTable data={data} loading={loading} uid={`bot-pocomp-${centerKey}`} filters={poFilters} showTargetOnly={poShowTargetOnly} targetConfig={targetConfig} />
          ) : selectionId === "purchase_report_dashboard" ? (
            <PurchaseReportBottomTable data={data} loading={loading} filters={purFilters} />
          ) : selectionId === "purchase_value_report_dashboard" ? (
            <PurchaseValueBottomTable data={data} filters={purchaseValueFilters} />
          ) : selectionId === "sales_analysis_report_dashboard" ? (
            <SalesAnalysisReportBottomTable data={data} loading={loading} filters={salesFilters} />
          ) : selectionId === "production_analysis_report_dashboard" ? (
            <ProductionAnalysisReportBottomTable data={{ productionValueCompare: prodValuePanelData ?? { machineRows: [], detailRows: [], rows: [] } }} filters={prodFilters} xAxisGroup={prodXAxisGroup} defaultFrom={defaultFrom} defaultTo={defaultTo} />
          ) : selectionId === "idle_hours_report_dashboard" ? (
            <IdleHoursReportBottomTable filters={idleFilters} activeTab={idleActiveTab} setActiveTab={setIdleActiveTab} />
          ) : selectionId === "idle_hours_non_accepted_reason_production_loss_report" ? (
            <IdleHoursNonAcceptedReasonLossReportBottomTable filters={nonAccFilters} />
          ) : selectionId === "oee_comparison_report_dashboard" ? (
            <OeeComparisonReportBottomTable data={{ oeeCompare: oeePanelData || data?.oeeCompare }} filters={oeeCompFilters} xAxisGroup={oeeCompXAxisGroup} />
          ) : selectionId === "efficiency_eff_report_dashboard" ? (
            <EfficiencyEffReportBottomTable data={{ efficiencyCompare: effPanelData || data?.efficiencyCompare }} filters={effFilters} xAxisGroup={effXAxisGroup} />
          ) : selectionId === "rejection_report_dashboard" ? (
            <RejectionReportBottomTable data={{ rejectionCompare: rejPanelData || data?.rejectionCompare }} filters={rejFilters} />
          ) : selectionId === "rework_report_dashboard" ? (
            <ReworkReportBottomTable data={{ reworkCompare: rewPanelData || data?.reworkCompare }} filters={rewFilters} xAxisGroup={reworkXAxisGroup} />
          ) : selectionId === "store_stock_value_report_dashboard" ? (
            <StoreStockValueReportBottomTable data={{ storeStockValue: stockPanelData || data?.storeStockValue }} filters={stockFilters} />
          ) : selectionId === "otd_report_dashboard" ? (
            <OtdReportBottomTable data={{ otd: otdPanelData || data?.otd }} filters={otdFilters} />
          ) : selectionId === "supplier_rating_report_dashboard" ? (
            <SupplierRatingBottomTable data={{ supplierRating: srPanelData || data?.supplierRating }} filters={supplierFilters} />
          ) : selectionId === "vendor_rating_report_dashboard" ? (
            <VendorRatingBottomTable data={{ vendorRating: vrPanelData || data?.vendorRating }} filters={vendorFilters} />

          ) : selectionId === "fg_value_report_dashboard" ? (
            <FgValueReportBottomTable data={{ fgValueCompare: fgValuePanelData || data?.fgValueCompare }} filters={fgFilters} />
          ) : selectionId === "daily_production_report_dashboard" ? (
            <DailyProductionBottomTable data={{ dailyProductionCompare: dailyProdPanelData || data?.dailyProductionCompare }} filters={dailyProductionFilters} targetConfig={targetConfig} />
          ) : selectionId === "target_vs_actual_report_dashboard" ? (
            <TargetVsActualBottomTable data={{ targetVsActualCompare: targetVsActualPanelData || data?.targetVsActualCompare }} filters={targetVsActualFilters} targetConfig={targetConfig} />
          ) : selectionId === "operator_efficiency_report_dashboard" ? (
            <OperatorEfficiencyBottomTable data={{ operatorEfficiencyCompare: opEffPanelData || data?.operatorEfficiencyCompare }} filters={operatorEfficiencyFilters} targetConfig={targetConfig} />
          ) : selectionId === "machine_efficiency_report_dashboard" ? (
            <MachineEfficiencyBottomTable data={{ machineEfficiencyCompare: machEffPanelData || data?.machineEfficiencyCompare }} filters={machineEfficiencyFilters} targetConfig={targetConfig} />
          ) : selectionId === "capa_report_dashboard" ? (
            <CapaBottomTable data={{ capaCompare: capaPanelData || data?.capaCompare }} filters={capaFilters} selectedCapaId={selectedCapaId} onSelectCapaId={setSelectedCapaId} />
          ) : selectionId === "customer_complaint_report_dashboard" ? (
            <CustomerComplaintReportBottomTable data={{ complaintCompare: compPanelData || data?.complaintCompare }} filters={compFilters} />
          ) : null}
        </DashboardErrorBoundary>
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
