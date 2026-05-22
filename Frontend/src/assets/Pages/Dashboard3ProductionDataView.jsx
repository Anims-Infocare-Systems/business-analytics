/**
 * Dashboard3ProductionDataView.jsx
 * Production Data bar chart — same Chart.js logic as Dashboard2 setupProdChart.
 * Shown in Plant Performance center panel when "Production Data" card is selected.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Chart, registerables } from "chart.js";
import "./Dashboard3ProductionDataView.css";

Chart.register(...registerables);

const PRODUCTION_BY_SHIFT_API = "/api/plant-performance/production-by-shift/";

const TOOLTIP_CFG = {
  backgroundColor: "#ffffff",
  titleColor: "#0f172a",
  bodyColor: "#64748b",
  borderColor: "#e4e9f2",
  borderWidth: 1,
  padding: 10,
};

const SHIFT_PALETTE = [
  "rgba(14,165,233,.82)",
  "rgba(16,185,129,.82)",
  "rgba(26,86,219,.72)",
  "rgba(245,158,11,.78)",
  "rgba(139,92,246,.75)",
  "rgba(236,72,153,.72)",
];

function formatLocalYmd(d) {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildUrl(from, to) {
  if (!from || !to) return PRODUCTION_BY_SHIFT_API;
  return `${PRODUCTION_BY_SHIFT_API}?from=${formatLocalYmd(from)}&to=${formatLocalYmd(to)}`;
}

export function productionShiftChartToken(payload) {
  if (!payload?.shifts?.length) return `${payload?.from ?? ""}|${payload?.to ?? ""}|empty`;
  return `${payload.from}|${payload.to}|${payload.shifts.map((s) => `${s.shift}:${s.total_qty}`).join(";")}`;
}

export function formatShiftAxisLabel(raw) {
  const s = String(raw ?? "").trim();
  if (!s || s === "(unassigned)") return "Unassigned";
  if (/^[1-9]\d*$/i.test(s)) return `Shift ${s}`;
  if (/^[ABC]$/i.test(s)) return `Shift ${s.toUpperCase()}`;
  return s;
}

function fmtNum(n) {
  const v = Number(n);
  return Number.isNaN(v) ? "—" : Math.round(v).toLocaleString();
}

/** Chart.js canvas wrapper — matches Dashboard2 ChartCanvas */
function ChartCanvas({ setup, height = 160, rebuildToken = 0 }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useEffect(() => {
    if (!ref.current) return;
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    chartRef.current = setupRef.current(ref.current);
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [rebuildToken]);

  return <canvas ref={ref} height={height} />;
}

/**
 * @param {{ from: Date|null, to: Date|null, productionKpis?: object|null, shiftsPayload?: object|null, uid?: string|number }} props
 */
export default function Dashboard3ProductionDataView({
  from,
  to,
  productionKpis = null,
  shiftsPayload = null,
  uid = 0,
}) {
  const [productionByShift, setProductionByShift] = useState(shiftsPayload);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (shiftsPayload?.shifts) {
      setProductionByShift(shiftsPayload);
      setLoading(false);
      setError(null);
      return;
    }
    if (!from || !to) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(buildUrl(from, to), { credentials: "include" })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && json && Array.isArray(json.shifts) && !json.error) {
          setProductionByShift(json);
          setError(null);
        } else {
          setProductionByShift(null);
          setError(json?.error || json?.detail || `Production by shift failed (${res.status})`);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setProductionByShift(null);
          setError(e.message || "Failed to load production data");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [from, to, shiftsPayload]);

  /** Exact copy of Dashboard2 setupProdChart */
  const setupProdChart = useCallback(
    (canvas) => {
      const rows = productionByShift?.shifts;
      const labels = rows?.length > 0 ? rows.map((r) => formatShiftAxisLabel(r.shift)) : ["No data"];
      const data = rows?.length > 0 ? rows.map((r) => Number(r.total_qty) || 0) : [0];
      const rangeHint =
        productionByShift?.from && productionByShift?.to
          ? `${productionByShift.from} → ${productionByShift.to}`
          : "Selected range";

      return new Chart(canvas, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: `Total qty (${rangeHint})`,
              data,
              backgroundColor: labels.map((_, i) => SHIFT_PALETTE[i % SHIFT_PALETTE.length]),
              borderRadius: 4,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: { boxWidth: 10, padding: 14, color: "#64748b", font: { size: 10 } },
            },
            tooltip: TOOLTIP_CFG,
          },
          scales: {
            x: {
              grid: { color: "rgba(228,233,242,.6)" },
              ticks: { color: "#94a3b8", maxRotation: 45, minRotation: 0, autoSkip: true },
            },
            y: {
              beginAtZero: true,
              grid: { color: "rgba(228,233,242,.6)" },
              ticks: { color: "#94a3b8" },
            },
          },
        },
      });
    },
    [productionByShift]
  );

  const prodShiftRebuildToken = productionShiftChartToken(productionByShift);
  const kpis = productionKpis?.kpis ?? {};
  const rangeLine =
    productionByShift?.from && productionByShift?.to
      ? `${productionByShift.from} → ${productionByShift.to}`
      : from && to
        ? `${formatLocalYmd(from)} → ${formatLocalYmd(to)}`
        : "";

  const totalQty = (productionByShift?.shifts ?? []).reduce(
    (s, r) => s + (Number(r.total_qty) || 0),
    0
  );

  return (
    <div className="d3-prod-view" key={uid}>
      <div className="d3-detail__titlebar">
        <span className="d3-detail__bullet" style={{ background: "#2d6de8" }} />
        <p className="d3-detail__heading">Production Data</p>
      </div>

      <div className="d3-detail__strip">
        {[
          { label: "Range output", value: fmtNum(kpis.production_output ?? totalQty), unit: "units", icon: "📦", color: "#0ea5e9" },
        ].map((k, i) => (
          <div
            key={k.label}
            className="d3-detail__chip"
            style={{ "--chip-color": k.color, "--chip-delay": `${i * 55}ms` }}
          >
            <span className="d3-detail__chip-icon">{k.icon}</span>
            <p className="d3-detail__chip-val">
              {loading ? "…" : k.value}
              {k.unit ? <span className="d3-detail__chip-unit"> {k.unit}</span> : null}
            </p>
            <p className="d3-detail__chip-lbl">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="d3-prod-card">
        <div className="d3-prod-card__hd">
          <div>
            <div className="d3-prod-card__title">Production Data</div>
            <div className="d3-prod-card__sub">
              ProductionEntry.okqty + ConvProductionEntry · Rod (qty), by shift — filtered by date range
            </div>
          </div>
        </div>

        {error ? (
          <div className="d3-prod-card__err" role="alert">{error}</div>
        ) : null}

        <div className={loading ? "d3-chart-wrap d3-chart-wrap--loading" : "d3-chart-wrap"}>
          <ChartCanvas setup={setupProdChart} height={200} rebuildToken={prodShiftRebuildToken} />
        </div>



        {!loading && !error && (!productionByShift?.shifts?.length) && (
          <p className="d3-prod-card__empty">No production quantities recorded for this date range.</p>
        )}
      </div>
    </div>
  );
}
