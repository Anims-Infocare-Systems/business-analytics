import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "./QualityAnalysis.css";
import QualityAnalysisDatePicker from "./QualityAnalysisDatePicker";
import {
    SlidersHorizontal,
    ClipboardCheck,
    CheckCircle2,
    XCircle,
    Wrench,
    Hourglass,
    Coins,
    TrendingUp,
    BarChart2,
    AlertTriangle,
    Package,
    Lightbulb,
    FileText,
    Activity,
    CheckCircle,
    AlertCircle,
    Info,
    ArrowUpRight,
    ArrowDownRight,
    Pin,
    Search,
    X,
    Users,
    ChevronDown,
    PieChart,
    Inbox
} from "lucide-react";

Chart.register(...registerables, ChartDataLabels);

// ─────────────────────────────────────────────
//  Count-up hook for KPI numbers
// ─────────────────────────────────────────────
function useCountUp(target, duration = 900) {
    const [display, setDisplay] = useState(target);
    const prev = useRef(target);
    useEffect(() => {
        const raw = String(target).replace(/[^0-9.]/g, "");
        const num = parseFloat(raw);
        if (isNaN(num) || prev.current === target) { setDisplay(target); return; }
        const prefix = String(target).match(/^[^0-9]*/)?.[0] || "";
        const suffix = String(target).match(/[^0-9.]*$/)?.[0] || "";
        const startNum = parseFloat(String(prev.current).replace(/[^0-9.]/g, "")) || 0;
        const steps = 30;
        const step = (num - startNum) / steps;
        let current = startNum;
        let i = 0;
        const timer = setInterval(() => {
            current += step;
            i++;
            const formatted = Number.isInteger(num)
                ? Math.round(current).toLocaleString("en-IN")
                : current.toFixed(1);
            setDisplay(`${prefix}${formatted}${suffix}`);
            if (i >= steps) { clearInterval(timer); setDisplay(target); prev.current = target; }
        }, duration / steps);
        return () => clearInterval(timer);
    }, [target]);
    return display;
}

// ─────────────────────────────────────────────
//  Static Data
// ─────────────────────────────────────────────
const EMPTY_KPI_CARDS = [
    { icon: ClipboardCheck, iconColor: "#2d6de8", label: "Total Inspections Qty", value: "0", sub: "Selected period", trend: "0 inspection records", cls: "qa2-t-neutral" },
    { icon: CheckCircle2, iconColor: "#10b981", label: "Pass Rate", value: "0.0%", sub: "0 units passed", trend: "—", cls: "qa2-t-neutral" },
    { icon: CheckCircle, iconColor: "#059669", label: "First Pass Yield", value: "0.0%", sub: "Right first time", trend: "—", cls: "qa2-t-neutral" },
    { icon: XCircle, iconColor: "#ef4444", label: "Rejection Rate", value: "0.0%", sub: "0 units rejected", trend: "—", cls: "qa2-t-neutral" },
    { icon: Wrench, iconColor: "#f97316", label: "Rework Rate", value: "0.0%", sub: "0 units rework", trend: "—", cls: "qa2-t-neutral" },
    { icon: Coins, iconColor: "#8b5cf6", label: "Quality Value", value: "₹0", sub: "Total Rejection Cost", trend: "Within control", cls: "qa2-t-up" },

    { icon: Package, iconColor: "#f43f5e", label: "Material Rejection Qty", value: "0", sub: "Material defects", trend: "Healthy status", cls: "qa2-t-up" },
    { icon: Activity, iconColor: "#0f766e", label: "Machine Rejection Qty", value: "0", sub: "Processing defects", trend: "All clear", cls: "qa2-t-up" },
    { icon: AlertCircle, iconColor: "#dc2626", label: "Customer Complaint Count", value: "0", sub: "Log complaints", trend: "0 complaints", cls: "qa2-t-up" },
    { icon: BarChart2, iconColor: "#6366f1", label: "Over All PPM", value: "0 PPM", sub: "Defect PPM level", trend: "Within control", cls: "qa2-t-up" },
    { icon: Hourglass, iconColor: "#f59e0b", label: "Final Insp. Waiting", value: "0", sub: "Live snapshot", trend: "All caught up", cls: "qa2-t-up" },
    { icon: SlidersHorizontal, iconColor: "#f59e0b", label: "Calibration Due", value: "0", sub: "Gauges & Instruments", trend: "All calibrated", cls: "qa2-t-up" },
];

const InsightIconMap = {
    error: AlertTriangle,
    warning: AlertCircle,
    info: Info,
    success: CheckCircle2
};

const SUPPLIER_REJECTIONS = [
    { supplier: "Super Forge Pvt Ltd", grnNo: "GRN-2604-091", date: "18-Apr-2026", item: "RRD03-05050-00 - Round Rod", qty: 250, okQty: 235, matRej: 12, macRej: 3, uom: "Nos" },
    { supplier: "A-One Steel Forgings", grnNo: "GRN-2604-042", date: "12-Apr-2026", item: "VCI05-CVR-02 - Protection Cover", qty: 500, okQty: 485, matRej: 10, macRej: 5, uom: "Nos" },
    { supplier: "Dynamic Precision India", grnNo: "GRN-2603-112", date: "28-Mar-2026", item: "SGC-BOTTOM-01 - Bottom Bearing Cast", qty: 120, okQty: 110, matRej: 8, macRej: 2, uom: "Nos" },
    { supplier: "Micro Tools & Dies", grnNo: "GRN-2603-085", date: "15-Mar-2026", item: "CARB-INS-WNMG - Carbide Insert WNMG", qty: 1000, okQty: 994, matRej: 5, macRej: 1, uom: "Nos" },
    { supplier: "Apex Industries Ltd", grnNo: "GRN-2602-099", date: "26-Feb-2026", item: "THN-EPOXY-20L - Epoxy Thinner", qty: 80, okQty: 76, matRej: 4, macRej: 0, uom: "Ltr" },
    { supplier: "Ultra Tech Engineering", grnNo: "GRN-2602-031", date: "10-Feb-2026", item: "HSG-MACHINED-A - Gearbox Housing", qty: 45, okQty: 40, matRej: 3, macRej: 2, uom: "Nos" }
];


const getPartyName = (id, product) => {
    if (product?.includes("Rod")) return "Super Forge Pvt Ltd";
    if (product?.includes("Cover")) return "A-One Steel Forgings";
    if (product?.includes("Cast")) return "Dynamic Precision India";
    if (product?.includes("Insert")) return "Micro Tools & Dies";
    if (product?.includes("Thinner")) return "Apex Industries Ltd";
    if (product?.includes("Housing")) return "Ultra Tech Engineering";
    if (product?.includes("Letter")) return "Global Stationery Corp";
    return "Anims Infocare Systems";
};


const getDepartmentForProcess = (process) => {
    const p = String(process).toLowerCase();
    if (p.includes("cut") || p.includes("machin") || p.includes("turn")) return "Machining";
    if (p.includes("forg") || p.includes("press")) return "Forging";
    if (p.includes("assembl")) return "Assembly";
    if (p.includes("dip") || p.includes("mix") || p.includes("paint") || p.includes("coat")) return "Finishing & Paint";
    if (p.includes("pack") || p.includes("receiv") || p.includes("stores")) return "Logistics & Incoming";
    return "Production";
};

const getInspectorName = (id) => {
    const idx = parseInt(id?.replace(/\D/g, "")) || 0;
    const inspectors = ["Operator John", "Operator Sam", "Operator Sarah", "Operator Alex", "Operator Chris", "Operator Mike", "Operator Lisa"];
    return inspectors[idx % inspectors.length];
};

const getColStyle = (h) => {
    switch (h) {
        case "Type": return { width: "130px" };
        case "Insp No": return { width: "100px" };
        case "Insp Date": return { width: "100px" };
        case "Part No – Description": return { minWidth: "220px", maxWidth: "320px", whiteSpace: "normal", wordBreak: "break-word" };
        case "Process": return { width: "110px" };
        case "Insp Qty":
        case "OK Qty":
        case "Mat Rej Qty":
        case "Mac Rej Qty":
        case "Rework Qty": return { width: "80px", textAlign: "right" };
        case "Insp By": return { width: "120px" };
        default: return {};
    }
};

const getRejColStyle = (h) => {
    switch (h) {
        case "Insp No": return { width: "110px" };
        case "Insp Type": return { width: "150px" };
        case "Product": return { minWidth: "220px", maxWidth: "320px", whiteSpace: "normal", wordBreak: "break-word" };
        case "Reason": return { minWidth: "200px", maxWidth: "300px", whiteSpace: "normal", wordBreak: "break-word" };
        case "Qty": return { width: "80px", textAlign: "right" };
        case "Disposition": return { width: "110px" };
        case "Date": return { width: "110px" };
        default: return {};
    }
};

const getTraceColStyle = (h) => {
    switch (h) {
        case "#": return { width: "50px", textAlign: "center" };
        case "Inspno": return { width: "110px" };
        case "Insp Date": return { width: "110px" };
        case "Machine No": return { width: "100px" };
        case "Shift": return { width: "80px" };
        case "Partno-Description": return { minWidth: "220px", maxWidth: "320px", whiteSpace: "normal", wordBreak: "break-word" };
        case "Process": return { width: "110px" };
        case "Operator Name": return { width: "130px" };
        case "Prod Qty":
        case "Rej Qty":
        case "Rw Qty": return { width: "80px", textAlign: "right" };
        case "Inspected By": return { width: "120px" };
        case "Routecard Details": return { width: "140px" };
        default: return {};
    }
};

const getSuppColStyle = (h) => {
    switch (h) {
        case "#": return { width: "50px", textAlign: "center" };
        case "Supplier Name": return { width: "160px" };
        case "Grn no": return { width: "100px" };
        case "Grn Date": return { width: "100px" };
        case "Item Details": return { minWidth: "180px", maxWidth: "260px", whiteSpace: "normal", wordBreak: "break-word" };
        case "GRN Qty":
        case "Ok Qty":
        case "Mat Rej":
        case "Mac Rej": return { width: "85px", textAlign: "right" };
        case "UOM": return { width: "60px", textAlign: "center" };
        default: return {};
    }
};

// ─────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────
function SectionHead({ icon: Icon, iconColor = "#2d6de8", title, badge, badgeCls, extra }) {
    return (
        <div className="qa2-section-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', width: '100%', padding: '10px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
                {Icon && <Icon size={18} className="qa2-section-icon" style={{ color: iconColor, strokeWidth: 2.25, display: 'flex', alignItems: 'center' }} />}
                <span className="qa2-section-title">{title}</span>
                {badge && <span className={`qa2-badge ${badgeCls || ""}`}>{badge}</span>}
            </div>
            {extra && <div className="qa2-section-extra">{extra}</div>}
        </div>
    );
}

function QualityEmptyState({ message = "No Data found on this period", height = "192px" }) {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: height,
            background: "linear-gradient(135deg, rgba(248, 250, 252, 0.65) 0%, rgba(241, 245, 249, 0.65) 100%)",
            border: "1.5px dashed rgba(209, 226, 255, 0.45)",
            borderRadius: "12px",
            margin: "0 1rem 1rem",
            padding: "1.5rem",
            textAlign: "center"
        }}>
            <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                marginBottom: "8px",
                boxShadow: "inset 0 2px 4px rgba(15, 23, 42, 0.02)"
            }}>
                <Inbox size={18} />
            </div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>{message}</div>
            <div style={{ fontSize: "10.5px", color: "#94a3b8", marginTop: "2px" }}>Try selecting another date range or filter option</div>
        </div>
    );
}

function QualityPremiumSelect({ value, onChange, options }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const activeOption = options.find(o => o.value === value) || options[0];

    return (
        <div className="qa2-premium-select-container" ref={containerRef}>
            <button
                type="button"
                className={`qa2-premium-select-trigger ${open ? "open" : ""}`}
                onClick={() => setOpen(!open)}
            >
                <span className="qa2-select-trigger-label">
                    {activeOption.icon && <span className="qa2-select-trigger-icon" style={{ display: "flex", alignItems: "center" }}>{activeOption.icon}</span>}
                    <span>{activeOption.label}</span>
                </span>
                <ChevronDown size={14} className="qa2-select-caret" />
            </button>
            {open && (
                <div className="qa2-premium-select-menu">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            className={`qa2-premium-select-item ${opt.value === value ? "active" : ""}`}
                            onClick={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                        >
                            {opt.icon && <span className="qa2-select-item-icon">{opt.icon}</span>}
                            <span>{opt.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

const formatYmd = (d) => {
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

const formatDisplayDate = (dStr) => {
    if (!dStr) return "—";
    if (dStr.includes("-")) {
        const parts = dStr.split("-");
        if (parts.length === 3 && parts[0].length === 4) { // YYYY-MM-DD
            const y = parts[0];
            const m = parseInt(parts[1], 10);
            const d = parts[2];
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return `${d}-${months[m - 1]}-${y}`;
        }
    }
    return dStr;
};

const parseDisplayDate = (dStr) => {
    if (!dStr) return null;
    const parts = dStr.split("-");
    if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const mStr = parts[1].toLowerCase();
        const y = parseInt(parts[2], 10);
        const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const m = months.indexOf(mStr);
        if (m !== -1) {
            return new Date(y, m, d);
        }
    }
    return null;
};

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────
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

export default function QualityAnalysis() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const _dflt = { from: startOfMonth, to: endOfMonth };
    const _saved = readFilterSession("ba_filter_quality", _dflt);
    const [dateRange, setDateRange] = useState({ from: _saved.from, to: _saved.to });
    const [filters, setFilters] = useState({
        fromDate: formatYmd(startOfMonth), toDate: formatYmd(endOfMonth),
        reportType: "All Reports", department: "All Departments",
        product: "All Products", defectType: "All Defects",
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState("ALL");
    const [selectedDispFilter, setSelectedDispFilter] = useState("ALL");
    const [selectedInspTypeFilter, setSelectedInspTypeFilter] = useState("ALL");
    const [inspTypeDropdownOpen, setInspTypeDropdownOpen] = useState(false);
    const typeDropdownRef = useRef(null);
    const [selectedTraceTypeFilter, setSelectedTraceTypeFilter] = useState("ALL");
    const [traceTypeDropdownOpen, setTraceTypeDropdownOpen] = useState(false);
    const traceTypeDropdownRef = useRef(null);
    const [animated, setAnimated] = useState(false);
    const [weeklyChartType, setWeeklyChartType] = useState("stack");
    const [paretoChartType, setParetoChartType] = useState("pareto"); // "pareto" | "count" | "distribution"

    // API state data
    const [summaryData, setSummaryData] = useState(null);
    const [chartsData, setChartsData] = useState(null);
    const [prodPerfData, setProdPerfData] = useState(null);
    const [defectCausesData, setDefectCausesData] = useState(null);
    const [recordsData, setRecordsData] = useState(null);
    const [calibrationData, setCalibrationData] = useState(null);
    const [insightsData, setInsightsData] = useState(null);
    const [customerComplaintsData, setCustomerComplaintsData] = useState(null);
    const [supplierData, setSupplierData] = useState(null);

    // Modern Individual Panel Loading States
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [chartsLoading, setChartsLoading] = useState(false);
    const [prodPerfLoading, setProdPerfLoading] = useState(false);
    const [defectCausesLoading, setDefectCausesLoading] = useState(false);
    const [recordsLoading, setRecordsLoading] = useState(false);
    const [calibrationLoading, setCalibrationLoading] = useState(false);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [customerComplaintsLoading, setCustomerComplaintsLoading] = useState(false);
    const [supplierLoading, setSupplierLoading] = useState(false);

    const isGlobalLoading = summaryLoading || chartsLoading || prodPerfLoading || defectCausesLoading || recordsLoading || calibrationLoading || insightsLoading || customerComplaintsLoading || supplierLoading;

    const trendRef = useRef(null); const trendChart = useRef(null);
    const resultRef = useRef(null); const resultChart = useRef(null);
    const defectRef = useRef(null); const defectChart = useRef(null);
    const ppmRef = useRef(null); const ppmChart = useRef(null);
    const paretoRef = useRef(null); const paretoChart = useRef(null);
    const rejectionRef = useRef(null); const rejectionChart = useRef(null);
    const reworkRef = useRef(null); const reworkChart = useRef(null);
    const supplierRef = useRef(null); const supplierChart = useRef(null);

    const debounceRef = useRef(null);

    const fetchQualityData = useCallback((from, to, q = "") => {
        const fromStr = formatYmd(from);
        const toStr = formatYmd(to);
        const qParam = q ? `&q=${encodeURIComponent(q)}` : "";
        const buildUrl = (base) => `${base}?from=${fromStr}&to=${toStr}${qParam}`;

        const fetchPanel = async (url, setData, setLoadingState) => {
            setLoadingState(true);
            try {
                const res = await fetch(url, { credentials: "include" });
                if (res.ok) {
                    setData(await res.json());
                    return true;
                }
            } catch (err) {
                console.error(`Failed to fetch ${url}`, err);
            } finally {
                setLoadingState(false);
            }
            return false;
        };

        const loadAllSequentially = async () => {
            await fetchPanel(buildUrl("/api/quality-analysis/summary/"), setSummaryData, setSummaryLoading);
            await fetchPanel(buildUrl("/api/quality-analysis/charts/"), setChartsData, setChartsLoading);
            await fetchPanel(buildUrl("/api/quality-analysis/product-performance/"), setProdPerfData, setProdPerfLoading);
            await fetchPanel(buildUrl("/api/quality-analysis/defect-causes/"), setDefectCausesData, setDefectCausesLoading);
            await fetchPanel(buildUrl("/api/quality-analysis/records/"), setRecordsData, setRecordsLoading);
            await fetchPanel(buildUrl("/api/quality-analysis/calibration/"), setCalibrationData, setCalibrationLoading);
            await fetchPanel(buildUrl("/api/quality-analysis/insights/"), setInsightsData, setInsightsLoading);
            await fetchPanel(buildUrl("/api/dashboard2/customer-complaints/"), setCustomerComplaintsData, setCustomerComplaintsLoading);
            await fetchPanel(buildUrl("/api/quality-analysis/supplier-rejections/"), setSupplierData, setSupplierLoading);
        };

        loadAllSequentially();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 60);
        return () => clearTimeout(t);
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
                setInspTypeDropdownOpen(false);
            }
            if (traceTypeDropdownRef.current && !traceTypeDropdownRef.current.contains(event.target)) {
                setTraceTypeDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ✅ Persist date range to sessionStorage on every change
    useEffect(() => {
        writeFilterSession("ba_filter_quality", { from: dateRange.from, to: dateRange.to });
    }, [dateRange.from, dateRange.to]);

    // Debounced re-fetch on dateRange change (150 ms)
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchQualityData(dateRange.from, dateRange.to, searchQuery);
        }, 150);
        return () => clearTimeout(debounceRef.current);
    }, [dateRange, fetchQualityData, searchQuery]);

    // Debounced re-fetch on searchQuery change (400 ms — slightly longer to avoid rapid keystroke spam)
    const searchDebounceRef = useRef(null);
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            fetchQualityData(dateRange.from, dateRange.to, searchQuery);
        }, 400);
        return () => clearTimeout(searchDebounceRef.current);
    }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const mk = (ref, holder, type, data, opts) => {
            holder.current?.destroy();
            if (ref.current) holder.current = new Chart(ref.current, { type, data, options: opts });
        };

        const fontBase = { family: "Poppins" };

        const trendData = chartsData?.trend || { labels: [], datasets: [] };
        const resultDonut = chartsData?.result_donut || { labels: [], datasets: [] };
        const defectDonut = chartsData?.defect_donut || { labels: [], datasets: [] };
        const ppmData = chartsData?.mac_rejection_ppm || { labels: [], datasets: [] };
        const paretoData = chartsData?.pareto || { labels: [], datasets: [] };

        const trendLabels = trendData.labels || [];
        const rejectDataset = trendData.datasets?.find(d =>
            d.label?.toLowerCase().includes("reject") || d.label?.toLowerCase().includes("rej") || d.label?.toLowerCase().includes("fail")
        );
        const reworkDataset = trendData.datasets?.find(d =>
            d.label?.toLowerCase().includes("rework") || d.label?.toLowerCase().includes("rw")
        );
        const rejectDataPoints = rejectDataset ? rejectDataset.data : [];
        const reworkDataPoints = reworkDataset ? reworkDataset.data : [];



        // ── Rejection Gradient ──
        const rejectionCanvas = rejectionRef.current;
        let rejectionGradient = "rgba(239, 68, 68, 0.1)";
        if (rejectionCanvas) {
            const ctx = rejectionCanvas.getContext("2d");
            if (ctx) {
                const grad = ctx.createLinearGradient(0, 0, 0, 192);
                grad.addColorStop(0, "rgba(239, 68, 68, 0.35)");
                grad.addColorStop(1, "rgba(239, 68, 68, 0.0)");
                rejectionGradient = grad;
            }
        }

        // ── Rework Gradient ──
        const reworkCanvas = reworkRef.current;
        let reworkGradient = "rgba(245, 166, 35, 0.1)";
        if (reworkCanvas) {
            const ctx = reworkCanvas.getContext("2d");
            if (ctx) {
                const grad = ctx.createLinearGradient(0, 0, 0, 192);
                grad.addColorStop(0, "rgba(245, 166, 35, 0.35)");
                grad.addColorStop(1, "rgba(245, 166, 35, 0.0)");
                reworkGradient = grad;
            }
        }

        const labels = trendData.labels || [];
        const datasets = [];

        const passData = trendData.datasets?.[0]?.data || [];
        const reworkData = trendData.datasets?.[1]?.data || [];
        const rejectData = trendData.datasets?.[2]?.data || [];

        // ── Weekly Trend Canvas Gradients ──
        const trendCanvas = trendRef.current;
        let passGrad = "rgba(16, 185, 129, 0.25)";
        let rewGrad = "rgba(245, 166, 35, 0.25)";
        let rejGrad = "rgba(239, 68, 68, 0.25)";

        if (trendCanvas) {
            const ctx = trendCanvas.getContext("2d");
            if (ctx) {
                // Pass gradient (Green)
                const g1 = ctx.createLinearGradient(0, 0, 0, 240);
                g1.addColorStop(0, "rgba(16, 185, 129, 0.8)");
                g1.addColorStop(1, "rgba(16, 185, 129, 0.15)");
                passGrad = g1;

                // Rework gradient (Amber)
                const g2 = ctx.createLinearGradient(0, 0, 0, 240);
                g2.addColorStop(0, "rgba(245, 166, 35, 0.8)");
                g2.addColorStop(1, "rgba(245, 166, 35, 0.15)");
                rewGrad = g2;

                // Reject gradient (Red)
                const g3 = ctx.createLinearGradient(0, 0, 0, 240);
                g3.addColorStop(0, "rgba(239, 68, 68, 0.8)");
                g3.addColorStop(1, "rgba(239, 68, 68, 0.15)");
                rejGrad = g3;
            }
        }

        if (weeklyChartType === "stack") {
            datasets.push(
                {
                    label: "Pass",
                    data: passData,
                    backgroundColor: passGrad,
                    borderColor: "#10b981",
                    borderWidth: 1.5,
                    borderRadius: 4,
                    type: "bar",
                    hoverBackgroundColor: "rgba(16, 185, 129, 0.95)",
                    hoverBorderColor: "#ffffff",
                    hoverBorderWidth: 2,
                },
                {
                    label: "Rework",
                    data: reworkData,
                    backgroundColor: rewGrad,
                    borderColor: "#f5a623",
                    borderWidth: 1.5,
                    borderRadius: 4,
                    type: "bar",
                    hoverBackgroundColor: "rgba(245, 166, 35, 0.95)",
                    hoverBorderColor: "#ffffff",
                    hoverBorderWidth: 2,
                },
                {
                    label: "Reject",
                    data: rejectData,
                    backgroundColor: rejGrad,
                    borderColor: "#ef4444",
                    borderWidth: 1.5,
                    borderRadius: 4,
                    type: "bar",
                    hoverBackgroundColor: "rgba(239, 68, 68, 0.95)",
                    hoverBorderColor: "#ffffff",
                    hoverBorderWidth: 2,
                }
            );
        } else if (weeklyChartType === "line") {
            datasets.push(
                {
                    label: "Pass",
                    data: passData,
                    borderColor: "#10b981",
                    backgroundColor: passGrad,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: "#10b981",
                    pointBorderColor: "#fff",
                    pointBorderWidth: 2,
                    type: "line"
                },
                {
                    label: "Rework",
                    data: reworkData,
                    borderColor: "#f5a623",
                    backgroundColor: rewGrad,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: "#f5a623",
                    pointBorderColor: "#fff",
                    pointBorderWidth: 2,
                    type: "line"
                },
                {
                    label: "Reject",
                    data: rejectData,
                    borderColor: "#ef4444",
                    backgroundColor: rejGrad,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: "#ef4444",
                    pointBorderColor: "#fff",
                    pointBorderWidth: 2,
                    type: "line"
                }
            );
        } else if (weeklyChartType === "defect") {
            datasets.push(
                {
                    label: "Rework",
                    data: reworkData,
                    borderColor: "#f5a623",
                    backgroundColor: rewGrad,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: "#f5a623",
                    pointBorderColor: "#fff",
                    pointBorderWidth: 2,
                    type: "line"
                },
                {
                    label: "Reject",
                    data: rejectData,
                    borderColor: "#ef4444",
                    backgroundColor: rejGrad,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: "#ef4444",
                    pointBorderColor: "#fff",
                    pointBorderWidth: 2,
                    type: "line"
                }
            );
        }

        mk(trendRef, trendChart, weeklyChartType === "stack" ? "bar" : "line", { labels, datasets }, {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: "easeOutQuart"
            },
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        font: { family: "Poppins", size: 11, weight: "600" },
                        boxWidth: 12,
                        padding: 16,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { size: 11, weight: "700", family: "Poppins" },
                    bodyFont: { size: 11, family: "Poppins" },
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx) => `  ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} units`,
                    }
                },
                datalabels: {
                    display: true,
                    anchor: "end",
                    align: "top",
                    offset: 2,
                    formatter: (value, context) => {
                        if (weeklyChartType !== "stack") {
                            return value > 0 ? value.toLocaleString() : "";
                        }
                        const index = context.dataIndex;
                        const datasets = context.chart.data.datasets;
                        let topDatasetIndex = -1;
                        for (let i = datasets.length - 1; i >= 0; i--) {
                            if (datasets[i].data[index] > 0) {
                                topDatasetIndex = i;
                                break;
                            }
                        }
                        if (context.datasetIndex === topDatasetIndex) {
                            const total = datasets.reduce((sum, ds) => sum + (ds.data[index] || 0), 0);
                            return total > 0 ? total.toLocaleString() : "";
                        }
                        return "";
                    },
                    font: { size: 9.5, weight: "750", family: "Poppins" },
                    color: "#475569"
                }
            },
            scales: {
                x: {
                    stacked: weeklyChartType === "stack",
                    grid: { display: false },
                    ticks: { font: { family: "Poppins", size: 9.5 }, color: "#5a6a9a", padding: 6 }
                },
                y: {
                    stacked: weeklyChartType === "stack",
                    grid: { color: "rgba(26,84,212,0.06)", drawTicks: false },
                    ticks: { font: { family: "Poppins", size: 9.5 }, color: "#5a6a9a", padding: 6 },
                    border: { dash: [4, 4], color: "transparent" }
                },
            },
        });

        const donut = {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: "bottom", labels: { font: { ...fontBase, size: 10 }, padding: 10, boxWidth: 10 } },
                datalabels: {
                    display: true,
                    color: "#fff",
                    font: { size: 10.5, weight: "700", family: "Poppins" },
                    formatter: (value, context) => {
                        const sum = context.dataset.data.reduce((a, b) => a + b, 0);
                        const pct = sum > 0 ? ((value / sum) * 100).toFixed(0) : 0;
                        return pct > 8 ? `${pct}%` : "";
                    }
                }
            },
            cutout: "64%",
        };
        mk(resultRef, resultChart, "doughnut", resultDonut, donut);
        mk(defectRef, defectChart, "doughnut", defectDonut, donut);

        mk(ppmRef, ppmChart, "line", ppmData, {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { labels: { font: { ...fontBase, size: 11, weight: 600 }, boxWidth: 12, padding: 14 } },
                title: {
                    display: true,
                    text: ppmData.fy ? `Internal Mac Rejection PPM — ${ppmData.fy}` : "Internal Mac Rejection PPM",
                    font: { ...fontBase, size: 12, weight: 600 },
                    color: "#5a6a9a",
                    padding: { bottom: 8 }
                },
                datalabels: {
                    display: true,
                    anchor: "end",
                    align: "top",
                    offset: 6,
                    formatter: (v) => (v > 0 ? `${Math.round(v).toLocaleString()}` : ""),
                    font: { size: 9, weight: "700", family: "Poppins" },
                    color: "#f97316",
                    backgroundColor: "#ffffff",
                    borderRadius: 4,
                    padding: { top: 2, bottom: 2, left: 6, right: 6 },
                    borderWidth: 1,
                    borderColor: "rgba(249, 115, 22, 0.25)"
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" } },
                y: {
                    beginAtZero: true,
                    grid: { color: "rgba(26,84,212,0.07)" },
                    ticks: {
                        font: { ...fontBase, size: 9 },
                        color: "#5a6a9a",
                        callback: v => v.toLocaleString() + ' PPM'
                    },
                    border: { dash: [4, 4] }
                },
            },
        });

        let finalParetoType = "bar";
        let finalParetoData = { ...paretoData };
        let finalParetoOptions = {};

        if (paretoChartType === "pareto") {
            finalParetoType = "bar";
            finalParetoData = {
                labels: paretoData.labels || [],
                datasets: [
                    { 
                        label: "Count", 
                        data: paretoData.datasets?.[0]?.data || [], 
                        backgroundColor: ["#ef4444", "#f97316", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981"], 
                        borderRadius: 5, 
                        yAxisID: "y" 
                    },
                    { 
                        label: "Cumulative %", 
                        data: paretoData.datasets?.[1]?.data || [], 
                        type: "line", 
                        borderColor: "#2d6de8", 
                        backgroundColor: "rgba(45,109,232,0.08)", 
                        borderWidth: 2.5, 
                        tension: 0.4, 
                        fill: true, 
                        pointRadius: 4, 
                        pointBackgroundColor: "#2d6de8", 
                        pointBorderColor: "#fff", 
                        pointBorderWidth: 2, 
                        yAxisID: "y2" 
                    }
                ]
            };
            finalParetoOptions = {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { font: { ...fontBase, size: 11, weight: 600 }, boxWidth: 12, padding: 14 } },
                    datalabels: {
                        display: true,
                        formatter: (value, context) => {
                            if (context.datasetIndex === 0) {
                                return value > 0 ? value.toString() : "";
                            } else {
                                return value > 0 ? `${value.toFixed(0)}%` : "";
                            }
                        },
                        font: { size: 9.5, weight: "700", family: "Poppins" },
                        color: (context) => context.datasetIndex === 0 ? "#ef4444" : "#2d6de8",
                        anchor: (context) => context.datasetIndex === 0 ? "end" : "center",
                        align: (context) => context.datasetIndex === 0 ? "top" : "top",
                        offset: (context) => context.datasetIndex === 0 ? 2 : 6,
                        backgroundColor: (context) => context.datasetIndex === 1 ? "#ffffff" : null,
                        borderRadius: (context) => context.datasetIndex === 1 ? 4 : null,
                        borderWidth: (context) => context.datasetIndex === 1 ? 1 : null,
                        borderColor: (context) => context.datasetIndex === 1 ? "rgba(45, 109, 232, 0.25)" : null,
                        padding: (context) => context.datasetIndex === 1 ? { top: 2, bottom: 2, left: 6, right: 6 } : null
                    }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: "rgba(26,84,212,0.07)" }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" }, border: { dash: [4, 4] } },
                    y2: { position: "right", min: 0, max: 100, grid: { display: false }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a", callback: v => v + "%" } },
                    x: { grid: { display: false }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" } },
                }
            };
        } else if (paretoChartType === "count") {
            finalParetoType = "bar";
            finalParetoData = {
                labels: paretoData.labels || [],
                datasets: [
                    { 
                        label: "Count", 
                        data: paretoData.datasets?.[0]?.data || [], 
                        backgroundColor: ["#ef4444", "#f97316", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981"], 
                        borderRadius: 6 
                    }
                ]
            };
            finalParetoOptions = {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        display: true,
                        anchor: "end",
                        align: "top",
                        offset: 4,
                        font: { size: 9.5, weight: "700", family: "Poppins" },
                        color: "#ef4444"
                    }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: "rgba(26,84,212,0.07)" }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" }, border: { dash: [4, 4] } },
                    x: { grid: { display: false }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" } },
                }
            };
        } else if (paretoChartType === "distribution") {
            finalParetoType = "doughnut";
            finalParetoData = {
                labels: paretoData.labels || [],
                datasets: [
                    {
                        data: paretoData.datasets?.[0]?.data || [],
                        backgroundColor: ["#ef4444", "#f97316", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981"],
                        borderWidth: 2,
                        borderColor: "#ffffff"
                    }
                ]
            };
            finalParetoOptions = {
                responsive: true, maintainAspectRatio: false,
                cutout: "60%",
                plugins: {
                    legend: { position: "right", labels: { font: { ...fontBase, size: 10, weight: 600 }, boxWidth: 10, padding: 8 } },
                    datalabels: {
                        display: true,
                        color: "#fff",
                        font: { size: 9.5, weight: "750", family: "Poppins" },
                        formatter: (value, context) => {
                            const sum = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = sum > 0 ? ((value / sum) * 100).toFixed(0) : 0;
                            return pct > 5 ? `${pct}%` : "";
                        }
                    }
                }
            };
        }

        mk(paretoRef, paretoChart, finalParetoType, finalParetoData, finalParetoOptions);

        mk(rejectionRef, rejectionChart, "line", {
            labels: trendLabels,
            datasets: [{
                label: "Rejection Qty",
                data: rejectDataPoints,
                borderColor: "#ef4444",
                backgroundColor: rejectionGradient,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: "#ef4444",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
            }]
        }, {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    display: true,
                    anchor: "end",
                    align: "top",
                    offset: 6,
                    formatter: (v) => (v > 0 ? v.toLocaleString() : ""),
                    font: { size: 9, weight: "700", family: "Poppins" },
                    color: "#ef4444",
                    backgroundColor: "#ffffff",
                    borderRadius: 4,
                    padding: { top: 2, bottom: 2, left: 6, right: 6 },
                    borderWidth: 1,
                    borderColor: "rgba(239, 68, 68, 0.25)"
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" } },
                y: { beginAtZero: true, grid: { color: "rgba(26,84,212,0.07)" }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" }, border: { dash: [4, 4] } },
            },
        });

        mk(reworkRef, reworkChart, "line", {
            labels: trendLabels,
            datasets: [{
                label: "Rework Qty",
                data: reworkDataPoints,
                borderColor: "#f97316",
                backgroundColor: reworkGradient,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: "#f97316",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
            }]
        }, {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    display: true,
                    anchor: "end",
                    align: "top",
                    offset: 6,
                    formatter: (v) => (v > 0 ? v.toLocaleString() : ""),
                    font: { size: 9, weight: "700", family: "Poppins" },
                    color: "#f97316",
                    backgroundColor: "#ffffff",
                    borderRadius: 4,
                    padding: { top: 2, bottom: 2, left: 6, right: 6 },
                    borderWidth: 1,
                    borderColor: "rgba(249, 115, 22, 0.25)"
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" } },
                y: { beginAtZero: true, grid: { color: "rgba(26,84,212,0.07)" }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" }, border: { dash: [4, 4] } },
            },
        });

        const supplierLabels = supplierData?.chart?.labels || ["Super Forge", "A-One Steel", "Dynamic Precision", "Micro Tools", "Apex Industries", "Ultra Tech"];
        const supplierMatRej = supplierData?.chart?.matRej || [12, 10, 8, 5, 4, 3];
        const supplierMacRej = supplierData?.chart?.macRej || [3, 5, 2, 1, 0, 2];

        mk(supplierRef, supplierChart, "bar", {
            labels: supplierLabels,
            datasets: [
                {
                    label: "Material Rej",
                    data: supplierMatRej,
                    backgroundColor: "rgba(139, 92, 246, 0.75)",
                    borderColor: "#8b5cf6",
                    borderWidth: 1,
                    borderRadius: 4,
                    hoverBackgroundColor: "rgba(139, 92, 246, 0.95)",
                },
                {
                    label: "Machine Rej",
                    data: supplierMacRej,
                    backgroundColor: "rgba(244, 63, 94, 0.75)",
                    borderColor: "#f43f5e",
                    borderWidth: 1,
                    borderRadius: 4,
                    hoverBackgroundColor: "rgba(244, 63, 94, 0.95)",
                }
            ]
        }, {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "top",
                    labels: { font: { family: "Poppins", size: 10 }, color: "#5a6a9a" }
                },
                datalabels: {
                    display: true,
                    anchor: "end",
                    align: "right",
                    formatter: (v) => (v > 0 ? v : ""),
                    font: { size: 9, weight: "700", family: "Poppins" },
                    color: "#475569"
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: "rgba(26,84,212,0.07)" },
                    ticks: { font: { family: "Poppins", size: 9 }, color: "#5a6a9a" }
                },
                y: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { font: { family: "Poppins", size: 9 }, color: "#5a6a9a" }
                }
            }
        });

        return () => {
            [trendChart, resultChart, defectChart, ppmChart, paretoChart, rejectionChart, reworkChart, supplierChart].forEach(c => c.current?.destroy());
        };
    }, [chartsData, weeklyChartType, paretoChartType, supplierData]);

    const resetFilters = () => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setDateRange({ from: startOfMonth, to: endOfMonth });
        setFilters({
            fromDate: formatYmd(startOfMonth),
            toDate: formatYmd(endOfMonth),
            reportType: "All Reports",
            department: "All Departments",
            product: "All Products",
            defectType: "All Defects"
        });
    };

    // hasNoData = true only when there's genuinely no data AND no search query is active.
    // When a search query is active, even total_inspected=0 is a valid "no results" state
    // and should show real filtered zeros (not mock/fallback data).
    const hasNoData = !summaryLoading && !searchQuery && (
        summaryData === null ||
        summaryData.total_inspected === 0 ||
        summaryData.total_inspected === "0" ||
        !summaryData.total_inspected
    );
    // When search is active and data returned, treat loaded state as hasRealData regardless of qty
    const hasSearchWithData = !!searchQuery && summaryData !== null;


    // ── Memoised derived data (avoids re-computation on unrelated renders) ─────

    const searchFilteredInspectionRows = useMemo(() => {
        if (hasNoData) return [];
        const records = recordsData?.inspection_records || [];
        const raw = records.map(r => ({
            ...r,
            partyName: r.partyName || (r.typeLabel?.includes("Job") ? getPartyName(r.id, r.product || r.partNoDesc) : "")
        }));
        if (!searchQuery) return raw;
        const q = searchQuery.toLowerCase().trim();
        return raw.filter(r =>
            (r.id && r.id.toLowerCase().includes(q)) ||
            (r.partyName && r.partyName.toLowerCase().includes(q)) ||
            (r.partNoDesc && r.partNoDesc.toLowerCase().includes(q)) ||
            (r.process && r.process.toLowerCase().includes(q)) ||
            (r.inspBy && r.inspBy.toLowerCase().includes(q)) ||
            (r.result && r.result.toLowerCase().includes(q)) ||
            (r.typeLabel && r.typeLabel.toLowerCase().includes(q))
        );
    }, [recordsData, hasNoData, searchQuery]);

    const activeProductQuality = useMemo(() => {
        if (hasNoData && !hasSearchWithData) return [];
        return prodPerfData?.products || [];
    }, [prodPerfData, hasNoData, hasSearchWithData]);


    const activeDefectCauses = useMemo(() => {
        if (hasNoData) return [];
        return defectCausesData?.causes || [];
    }, [defectCausesData, hasNoData]);

    const activeDefectClasses = useMemo(() => {
        if (hasNoData) return [
            { bg: "#fee2e2", lbl: "Critical", val: "0", pct: "0.0%", lc: "#b91c1c", vc: "#7f1d1d", pc: "#991b1b" },
            { bg: "#ffedd5", lbl: "Major", val: "0", pct: "0.0%", lc: "#c2410c", vc: "#7c2d12", pc: "#9a3412" },
            { bg: "#fef9c3", lbl: "Minor", val: "0", pct: "0.0%", lc: "#92400e", vc: "#78350f", pc: "#92400e" },
        ];
        return defectCausesData?.classes || [
            { bg: "#fee2e2", lbl: "Critical", val: "0", pct: "0.0%", lc: "#b91c1c", vc: "#7f1d1d", pc: "#991b1b" },
            { bg: "#ffedd5", lbl: "Major", val: "0", pct: "0.0%", lc: "#c2410c", vc: "#7c2d12", pc: "#9a3412" },
            { bg: "#fef9c3", lbl: "Minor", val: "0", pct: "0.0%", lc: "#92400e", vc: "#78350f", pc: "#92400e" },
        ];
    }, [defectCausesData, hasNoData]);

    const activeInspectionRows = useMemo(() => {
        if (selectedType === "ALL") return searchFilteredInspectionRows;
        return searchFilteredInspectionRows.filter(r => {
            const l = (r.typeLabel || "").toLowerCase();
            const id = (r.id || "").toLowerCase();
            if (selectedType === "INTER") return l.includes("inter") || id.startsWith("ii");
            if (selectedType === "FINAL") return l.includes("final") || id.startsWith("fi");
            if (selectedType === "JOB") return l.includes("job") || id.startsWith("ji");
            return true;
        });
    }, [searchFilteredInspectionRows, selectedType]);

    const activeInspectionRowsTotals = useMemo(() => {
        let totalInsp = 0;
        let totalOk = 0;
        let totalMatRej = 0;
        let totalMacRej = 0;
        let totalRework = 0;

        activeInspectionRows.forEach(r => {
            const qty = parseFloat(String(r.qty || 0).replace(/,/g, "")) || 0;
            const ok = parseFloat(String(r.okQty || (r.result === "PASS" ? r.qty : (r.result === "PENDING" ? r.qty : "0"))).replace(/,/g, "")) || 0;
            const matRej = parseFloat(String(r.matRejQty || (r.result === "FAIL" && !r.partNoDesc?.toLowerCase().includes("segment") && !r.product?.toLowerCase().includes("segment") ? r.qty : "0")).replace(/,/g, "")) || 0;
            const macRej = parseFloat(String(r.macRejQty || (r.result === "FAIL" && (r.partNoDesc?.toLowerCase().includes("segment") || r.product?.toLowerCase().includes("segment")) ? r.qty : "0")).replace(/,/g, "")) || 0;
            const rework = parseFloat(String(r.reworkQty || (r.result === "REWORK" ? r.qty : "0")).replace(/,/g, "")) || 0;

            totalInsp += qty;
            totalOk += ok;
            totalMatRej += matRej;
            totalMacRej += macRej;
            totalRework += rework;
        });

        return {
            insp: totalInsp,
            ok: totalOk,
            matRej: totalMatRej,
            macRej: totalMacRej,
            rework: totalRework
        };
    }, [activeInspectionRows]);

    const searchFilteredRejectionRows = useMemo(() => {
        if (hasNoData) return [];
        const raw = recordsData?.rejection_rows || [];
        if (!searchQuery) return raw;
        const q = searchQuery.toLowerCase().trim();
        return raw.filter(r =>
            (r.id && r.id.toLowerCase().includes(q)) ||
            (r.product && r.product.toLowerCase().includes(q)) ||
            (r.reason && r.reason.toLowerCase().includes(q)) ||
            (r.defect && r.defect.toLowerCase().includes(q)) ||
            (r.disp && r.disp.toLowerCase().includes(q))
        );
    }, [recordsData, hasNoData, searchQuery]);

    const typeFilteredRejectionRows = useMemo(() => {
        if (selectedInspTypeFilter === "ALL") return searchFilteredRejectionRows;
        return searchFilteredRejectionRows.filter(r => r.inspType === selectedInspTypeFilter);
    }, [searchFilteredRejectionRows, selectedInspTypeFilter]);

    const activeRejectionRows = useMemo(() => {
        if (selectedDispFilter === "ALL") return typeFilteredRejectionRows;
        return typeFilteredRejectionRows.filter(r => {
            const d = (r.disp || "").toLowerCase();
            if (selectedDispFilter === "REJECTION") return d.includes("reject");
            if (selectedDispFilter === "REWORK") return d.includes("rework");
            return true;
        });
    }, [typeFilteredRejectionRows, selectedDispFilter]);

    const rejectionCount = useMemo(() =>
        typeFilteredRejectionRows.filter(r => r.disp?.toLowerCase().includes("reject")).length,
        [typeFilteredRejectionRows]);

    const reworkCount = useMemo(() =>
        typeFilteredRejectionRows.filter(r => r.disp?.toLowerCase().includes("rework")).length,
        [typeFilteredRejectionRows]);

    const totalRejRwkQty = useMemo(() =>
        activeRejectionRows.reduce((sum, r) => sum + (parseFloat(String(r.qty).replace(/[^0-9.]/g, "")) || 0), 0),
        [activeRejectionRows]);

    const activeReworkQueue = useMemo(() => {
        if (hasNoData) return [];
        const raw = recordsData?.rework_queue || [];
        if (!searchQuery) return raw;
        const q = searchQuery.toLowerCase().trim();
        return raw.filter(r =>
            (r.name && r.name.toLowerCase().includes(q)) ||
            (r.code && r.code.toLowerCase().includes(q))
        );
    }, [recordsData, hasNoData, searchQuery]);

    const activeCalibrationRows = useMemo(() => {
        if (hasNoData) return [];
        return calibrationData?.calibrations || [];
    }, [calibrationData, hasNoData]);

    const activeVendorRejection = useMemo(() => {
        const vendorMap = {};

        // Aggregate from searchFilteredInspectionRows (which are dynamically search-filtered and date-range filtered)
        searchFilteredInspectionRows.forEach(r => {
            if (!r.typeLabel?.includes("Job")) return;
            const vendor = r.partyName || "Unknown Vendor";
            if (!vendorMap[vendor]) {
                vendorMap[vendor] = { name: vendor, insp: 0, pass: 0, rej: 0 };
            }
            const qty = parseFloat(String(r.qty).replace(/[^0-9.]/g, "")) || 0;
            const okQty = parseFloat(String(r.okQty).replace(/[^0-9.]/g, "")) || 0;
            const matRej = parseFloat(String(r.matRejQty).replace(/[^0-9.]/g, "")) || 0;
            const macRej = parseFloat(String(r.macRejQty).replace(/[^0-9.]/g, "")) || 0;

            vendorMap[vendor].insp += qty;
            vendorMap[vendor].pass += okQty;
            vendorMap[vendor].rej += (matRej + macRej);
        });

        let list = Object.values(vendorMap);

        if (hasNoData) {
            list = [];
        }

        const totalRejectionsAllVendors = list.reduce((sum, v) => sum + v.rej, 0);

        return list.map(v => {
            const total = v.insp;
            const rej = v.rej;
            const rateVal = total > 0 ? (rej / total) * 100 : 0;
            const shareVal = totalRejectionsAllVendors > 0 ? (rej / totalRejectionsAllVendors) * 100 : 0;

            let color = "#10b981";
            if (rateVal >= 8.0) color = "#ef4444";
            else if (rateVal >= 4.0) color = "#f97316";

            return {
                name: v.name,
                insp: total,
                rej: rej,
                rate: `${rateVal.toFixed(1)}%`,
                share: `${shareVal.toFixed(1)}%`,
                shareVal: shareVal,
                color: color
            };
        }).sort((a, b) => b.rej - a.rej);
    }, [searchFilteredInspectionRows, hasNoData, searchQuery]);

    const activeProcessRejection = useMemo(() => {
        const processMap = {};

        // Aggregate from searchFilteredInspectionRows (which are dynamically search-filtered and date-range filtered)
        searchFilteredInspectionRows.forEach(r => {
            const process = r.process || "Unknown Process";
            if (!processMap[process]) {
                processMap[process] = { name: process, insp: 0, pass: 0, rej: 0 };
            }
            const qty = parseFloat(String(r.qty).replace(/[^0-9.]/g, "")) || 0;
            const okQty = parseFloat(String(r.okQty).replace(/[^0-9.]/g, "")) || 0;
            const matRej = parseFloat(String(r.matRejQty).replace(/[^0-9.]/g, "")) || 0;
            const macRej = parseFloat(String(r.macRejQty).replace(/[^0-9.]/g, "")) || 0;

            processMap[process].insp += qty;
            processMap[process].pass += okQty;
            processMap[process].rej += (matRej + macRej);
        });

        const list = Object.values(processMap);

        const totalRejectionsAllProcesses = list.reduce((sum, v) => sum + v.rej, 0);

        return list.map(v => {
            const total = v.insp;
            const rej = v.rej;
            const rateVal = total > 0 ? (rej / total) * 100 : 0;
            const shareVal = totalRejectionsAllProcesses > 0 ? (rej / totalRejectionsAllProcesses) * 100 : 0;

            let color = "#10b981";
            if (rateVal >= 5.0) color = "#ef4444";
            else if (rateVal >= 2.5) color = "#f97316";

            return {
                name: v.name,
                insp: total,
                rej: rej,
                rate: `${rateVal.toFixed(1)}%`,
                share: `${shareVal.toFixed(1)}%`,
                shareVal: shareVal,
                color: color
            };
        }).sort((a, b) => b.rej - a.rej);
    }, [searchFilteredInspectionRows, hasNoData, searchQuery]);

    const topMaterialRejections = useMemo(() => {
        const map = {};
        searchFilteredInspectionRows.forEach(r => {
            const partNoDesc = r.partNoDesc || (r.partNo && r.product ? `${r.partNo} - ${r.product}` : (r.partNo || r.product || "—"));
            const matRej = parseFloat(String(r.matRejQty || (r.result === "FAIL" && !r.product?.toLowerCase().includes("segment") ? r.qty : "0")).replace(/[^0-9.]/g, "")) || 0;
            if (matRej > 0) {
                if (!map[partNoDesc]) {
                    map[partNoDesc] = { name: partNoDesc, qty: 0, process: r.process || "—" };
                }
                map[partNoDesc].qty += matRej;
            }
        });
        const list = Object.values(map).sort((a, b) => b.qty - a.qty);
        return list.slice(0, 5);
    }, [searchFilteredInspectionRows, hasNoData]);

    const topMachineRejections = useMemo(() => {
        const map = {};
        searchFilteredInspectionRows.forEach(r => {
            const partNoDesc = r.partNoDesc || (r.partNo && r.product ? `${r.partNo} - ${r.product}` : (r.partNo || r.product || "—"));
            const macRej = parseFloat(String(r.macRejQty || (r.result === "FAIL" && r.product?.toLowerCase().includes("segment") ? r.qty : "0")).replace(/[^0-9.]/g, "")) || 0;
            if (macRej > 0) {
                if (!map[partNoDesc]) {
                    map[partNoDesc] = { name: partNoDesc, qty: 0, process: r.process || "—" };
                }
                map[partNoDesc].qty += macRej;
            }
        });
        const list = Object.values(map).sort((a, b) => b.qty - a.qty);
        return list.slice(0, 5);
    }, [searchFilteredInspectionRows, hasNoData]);

    const departmentRejections = useMemo(() => {
        const map = {};
        searchFilteredInspectionRows.forEach(r => {
            const dept = getDepartmentForProcess(r.process || "Other");
            const matRej = parseFloat(String(r.matRejQty || (r.result === "FAIL" && !r.product?.toLowerCase().includes("segment") ? r.qty : "0")).replace(/[^0-9.]/g, "")) || 0;
            const macRej = parseFloat(String(r.macRejQty || (r.result === "FAIL" && r.product?.toLowerCase().includes("segment") ? r.qty : "0")).replace(/[^0-9.]/g, "")) || 0;
            const rej = matRej + macRej;
            const qty = parseFloat(String(r.qty).replace(/[^0-9.]/g, "")) || 0;

            if (!map[dept]) {
                map[dept] = { department: dept, inspected: 0, rejected: 0 };
            }
            map[dept].inspected += qty;
            map[dept].rejected += rej;
        });

        const list = Object.values(map);

        const totalAllRejections = list.reduce((sum, d) => sum + d.rejected, 0);

        return list.map(d => {
            const rateVal = d.inspected > 0 ? (d.rejected / d.inspected) * 100 : 0;
            const shareVal = totalAllRejections > 0 ? (d.rejected / totalAllRejections) * 100 : 0;
            return {
                department: d.department,
                inspected: d.inspected,
                rejected: d.rejected,
                rate: `${rateVal.toFixed(1)}%`,
                share: `${shareVal.toFixed(1)}%`,
                shareVal: shareVal
            };
        }).sort((a, b) => b.rejected - a.rejected);
    }, [searchFilteredInspectionRows, hasNoData]);

    const activeCustomerComplaints = useMemo(() => {
        if (hasNoData) return [];
        const raw = customerComplaintsData?.complaints || [];

        if (!searchQuery) return raw;
        const q = searchQuery.toLowerCase().trim();
        return raw.filter(c =>
            (c.complaint_id && c.complaint_id.toLowerCase().includes(q)) ||
            (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
            (c.product && c.product.toLowerCase().includes(q)) ||
            (c.complaint_description && c.complaint_description.toLowerCase().includes(q)) ||
            (c.action_taken && c.action_taken.toLowerCase().includes(q)) ||
            (c.corrective_action && c.corrective_action.toLowerCase().includes(q)) ||
            (c.permanent_action && c.permanent_action.toLowerCase().includes(q)) ||
            (c.status && c.status.toLowerCase().includes(q))
        );
    }, [customerComplaintsData, hasNoData, searchQuery]);

    // Traceability — mapped to searchFilteredInspectionRows and filtered by selectedTraceTypeFilter
    const activeTraceabilityRows = useMemo(() => {
        if (selectedTraceTypeFilter === "ALL") return searchFilteredInspectionRows;
        return searchFilteredInspectionRows.filter(r => {
            const label = (r.typeLabel || "").toLowerCase();
            const id = (r.id || "").toLowerCase();
            if (selectedTraceTypeFilter === "FINAL") {
                return label.includes("final") || id.startsWith("fi");
            }
            if (selectedTraceTypeFilter === "INTER") {
                return label.includes("inter") || id.startsWith("ii");
            }
            if (selectedTraceTypeFilter === "JOB") {
                return label.includes("job") || (!label.includes("final") && !label.includes("inter") && !id.startsWith("fi") && !id.startsWith("ii"));
            }
            return true;
        });
    }, [searchFilteredInspectionRows, selectedTraceTypeFilter]);

    const activeSupplierRejections = useMemo(() => {
        return supplierData?.results || SUPPLIER_REJECTIONS;
    }, [supplierData]);

    const interInspCount = useMemo(() =>
        searchFilteredInspectionRows.filter(r => r.typeLabel?.toLowerCase().includes("inter") || r.id?.toLowerCase().startsWith("ii")).length,
        [searchFilteredInspectionRows]);
    const finalInspCount = useMemo(() =>
        searchFilteredInspectionRows.filter(r => r.typeLabel?.toLowerCase().includes("final") || r.id?.toLowerCase().startsWith("fi")).length,
        [searchFilteredInspectionRows]);
    const jobOrderCount = useMemo(() =>
        searchFilteredInspectionRows.filter(r => r.typeLabel?.toLowerCase().includes("job") || r.id?.toLowerCase().startsWith("ji")).length,
        [searchFilteredInspectionRows]);

    // Count items that are overdue or due within 7 days
    const calibrationAlertCount = useMemo(() =>
        activeCalibrationRows.filter(c => c.cls === "qa2-cal-over" || c.cls === "qa2-cal-warn").length,
        [activeCalibrationRows]);

    const activeInsightsLeft = useMemo(() => {
        if (hasNoData) return [];
        if (insightsData?.insights_left) {
            return insightsData.insights_left.map((ins, idx) => {
                const keys = ["error", "warning", "info"];
                return { ...ins, iconKey: ins.iconKey || keys[idx % keys.length] };
            });
        }
        return [];
    }, [insightsData, hasNoData]);

    const activeInsightsRight = useMemo(() => {
        if (hasNoData) return [];
        if (insightsData?.insights_right) {
            return insightsData.insights_right
                .filter(ins => !ins.title.toLowerCase().includes("scrap"))
                .map(ins => ({ ...ins, iconKey: ins.iconKey || "success" }));
        }
        return [];
    }, [insightsData, hasNoData]);

    const activePriorityActions = useMemo(() => {
        if (hasNoData) return [];
        return insightsData?.priority_actions
            ? insightsData.priority_actions.filter(act => !act.toLowerCase().includes("scrap"))
            : [];
    }, [insightsData, hasNoData]);


    const activeKpiCards = useMemo(() => {
        if (hasNoData) return EMPTY_KPI_CARDS;

        const totalInspected = searchFilteredInspectionRows.reduce((sum, r) => sum + (parseFloat(String(r.qty).replace(/[^0-9.]/g, "")) || 0), 0);
        const totalMaterialRej = searchFilteredInspectionRows.reduce((sum, r) => {
            return sum + (parseFloat(String(r.matRejQty || (r.result === "FAIL" && !r.product?.toLowerCase().includes("segment") ? r.qty : "0")).replace(/[^0-9.]/g, "")) || 0);
        }, 0);
        const totalMachineRej = searchFilteredInspectionRows.reduce((sum, r) => {
            return sum + (parseFloat(String(r.macRejQty || (r.result === "FAIL" && r.product?.toLowerCase().includes("segment") ? r.qty : "0")).replace(/[^0-9.]/g, "")) || 0);
        }, 0);
        const totalReworkQty = searchFilteredInspectionRows.reduce((sum, r) => {
            return sum + (parseFloat(String(r.reworkQty || "0").replace(/[^0-9.]/g, "")) || 0);
        }, 0);
        const complaintsCount = activeCustomerComplaints.length;
        const ppm = totalInspected > 0 ? Math.round(((totalMaterialRej + totalMachineRej) / totalInspected) * 1000000) : 0;
        const fpy = totalInspected > 0
            ? ((totalInspected - (totalMaterialRej + totalMachineRej + totalReworkQty)) / totalInspected) * 100
            : 0;
        const fpyVal = totalInspected > 0 ? `${fpy.toFixed(1)}%` : "0.0%";

        const insQty = summaryData?.kpis?.total_inspected_card?.value || totalInspected.toLocaleString("en-IN");
        const passRate = summaryData?.kpis?.pass_rate_card?.value || (totalInspected > 0 ? `${((totalInspected - (totalMaterialRej + totalMachineRej)) / totalInspected * 100).toFixed(1)}%` : "0.0%");
        const rejRate = summaryData?.kpis?.rejection_rate_card?.value || (totalInspected > 0 ? `${(((totalMaterialRej + totalMachineRej) / totalInspected) * 100).toFixed(1)}%` : "0.0%");
        const reworkRate = summaryData?.kpis?.rework_rate_card?.value || (totalInspected > 0 ? `${((totalReworkQty / totalInspected) * 100).toFixed(1)}%` : "0.0%");
        const pendingInsp = summaryData?.kpis?.pending_insp_card?.value || "0";
        const qualityVal = summaryData?.kpis?.quality_value_card?.value || "₹0";

        return [
            { icon: ClipboardCheck, iconColor: "#2d6de8", label: "Total Inspections Qty", value: insQty, sub: "Selected Period", trend: `${searchFilteredInspectionRows.length} records`, cls: "qa2-t-neutral" },
            { icon: CheckCircle2, iconColor: "#10b981", label: "Pass Rate", value: passRate, sub: "Inspected units", trend: "↑ 2.1% vs last", cls: "qa2-t-up" },
            { icon: CheckCircle, iconColor: "#059669", label: "First Pass Yield", value: fpyVal, sub: "Right first time", trend: fpy > 95 ? "Excellent yield" : "Optimize process", cls: fpy > 95 ? "qa2-t-up" : "qa2-t-down" },
            { icon: XCircle, iconColor: "#ef4444", label: "Rejection Rate", value: rejRate, sub: "Defective units", trend: "↓ 1.2% vs last", cls: "qa2-t-up" },
            { icon: Wrench, iconColor: "#f97316", label: "Rework Rate", value: reworkRate, sub: "Reworked units", trend: "Within tolerance", cls: "qa2-t-neutral" },
            { icon: Coins, iconColor: "#8b5cf6", label: "Quality Value", value: qualityVal, sub: "Total Rejection Cost", trend: "Action needed", cls: "qa2-t-down" },

            { icon: Package, iconColor: "#f43f5e", label: "Material Rejection Qty", value: totalMaterialRej.toLocaleString("en-IN"), sub: "Material defects", trend: totalMaterialRej > 0 ? "Action required" : "Healthy status", cls: totalMaterialRej > 0 ? "qa2-t-down" : "qa2-t-up" },
            { icon: Activity, iconColor: "#0f766e", label: "Machine Rejection Qty", value: totalMachineRej.toLocaleString("en-IN"), sub: "Processing defects", trend: totalMachineRej > 0 ? "Under watch" : "All clear", cls: totalMachineRej > 0 ? "qa2-t-down" : "qa2-t-up" },
            { icon: AlertCircle, iconColor: "#dc2626", label: "Customer Complaint Count", value: complaintsCount.toString(), sub: "Log complaints", trend: complaintsCount > 0 ? `${complaintsCount} open issues` : "0 complaints", cls: complaintsCount > 0 ? "qa2-t-down" : "qa2-t-up" },
            { icon: BarChart2, iconColor: "#6366f1", label: "Over All PPM", value: ppm.toLocaleString("en-IN") + " PPM", sub: "Defect PPM level", trend: "Target < 10,000", cls: ppm < 10000 ? "qa2-t-up" : "qa2-t-down" },
            { icon: Hourglass, iconColor: "#f59e0b", label: "Final Insp. Waiting", value: pendingInsp, sub: "Waiting queue", trend: "Action needed", cls: "qa2-t-down" },
            { icon: SlidersHorizontal, iconColor: "#f59e0b", label: "Calibration Due", value: calibrationAlertCount.toString(), sub: "Gauges & Instruments", trend: calibrationAlertCount > 0 ? `${calibrationAlertCount} alerts pending` : "All calibrated", cls: calibrationAlertCount > 0 ? "qa2-t-down" : "qa2-t-up" }
        ];
    }, [summaryData, hasNoData, searchFilteredInspectionRows, activeCustomerComplaints, calibrationAlertCount]);

    const handleTypeBadgeClick = (label) => {
        const l = String(label).toLowerCase();
        if (l.includes("inter")) {
            setSelectedType(prev => prev === "INTER" ? "ALL" : "INTER");
        } else if (l.includes("final")) {
            setSelectedType(prev => prev === "FINAL" ? "ALL" : "FINAL");
        } else if (l.includes("job")) {
            setSelectedType(prev => prev === "JOB" ? "ALL" : "JOB");
        }
    };

    const handleDispBadgeClick = (disp) => {
        const d = String(disp).toLowerCase();
        if (d.includes("reject")) {
            setSelectedDispFilter(prev => prev === "REJECTION" ? "ALL" : "REJECTION");
        } else if (d.includes("rework")) {
            setSelectedDispFilter(prev => prev === "REWORK" ? "ALL" : "REWORK");
        }
    };

    return (
        <div className={`qa2-root ${animated ? "qa2-root--visible" : ""}`}>
            {/* ── Global YouTube-Style Loading Top Bar ── */}
            <div className={`qa2-global-progress-bar ${isGlobalLoading ? "qa2-global-progress-bar--active" : ""}`} />

            {/* ── Page Hero ── */}
            <div className="qa2-page-hero">
                <div className="qa2-hero-left">
                    <div>
                    </div>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="qa2-card qa2-filter-card qa2-animate qa2-d1">
                <div className="qa2-filter-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SlidersHorizontal size={18} style={{ color: '#2d6de8', strokeWidth: 2.25 }} /> Report Filters
                </div>
                <div className="qa2-filter-grid" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end', padding: '1rem 1.25rem' }}>
                    <div className="qa2-fg" style={{ width: '320px', flex: '0 0 auto' }}>
                        <label className="qa2-fl">Date Range</label>
                        <QualityAnalysisDatePicker
                            from={dateRange.from}
                            to={dateRange.to}
                            onChange={({ from, to }) => setDateRange({ from, to })}
                        />
                    </div>
                    <div className="qa2-fg" style={{ width: '240px', flex: '0 0 auto' }}>
                        <label className="qa2-fl">Search Records</label>
                        <div className="qa2-search-input-wrapper" style={{ position: 'relative', width: '100%' }}>
                            <input
                                type="text"
                                className="qa2-fi"
                                style={{ width: '100%', padding: '0.65rem 2.25rem 0.65rem 2.25rem', background: '#ffffff', cursor: 'text' }}
                                placeholder="Search by description, ID, etc..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Search size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    style={{
                                        position: 'absolute',
                                        right: '0.8rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '18px',
                                        height: '18px'
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Summary Strip ── */}
            {summaryLoading ? (
                <div className="qa2-summary-strip-skeleton qa2-pulse-loader">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div className="qa2-strip-item" key={i} style={{ minWidth: "90px" }}>
                            <div className="qa2-skeleton qa2-shimmer qa2-skeleton-text" style={{ width: "60px", height: "8px" }} />
                            <div className="qa2-skeleton qa2-shimmer qa2-skeleton-text" style={{ width: "80px", height: "16px", marginTop: "5px" }} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="qa2-summary-strip qa2-animate qa2-d2">
                    {[
                        { lbl: "Period", val: summaryData?.period ?? "Jan–Feb 2026", cls: "" },
                        { lbl: "Total Inspected", val: summaryData?.total_inspected ?? "—", cls: "qa2-blue" },
                        { lbl: "Pass Rate", val: summaryData?.pass_rate ?? "—", cls: "qa2-green" },
                        { lbl: "Total Rejected", val: summaryData?.total_rejected ?? "—", cls: "qa2-red" },
                        { lbl: "Rework", val: summaryData?.rework ?? "—", cls: "qa2-orange" },
                        { lbl: "Pending Insp.", val: summaryData?.pending_inspection ?? "—", cls: "qa2-yellow" },
                    ].map((s, i) => (
                        <div className="qa2-strip-item" key={i}>
                            <div className="qa2-strip-lbl">{s.lbl}</div>
                            <div className={`qa2-strip-val ${s.cls}`}>{s.val}</div>
                        </div>
                    ))}
                </div>
            )}


            {/* ── KPI Cards ── */}
            {summaryLoading ? (
                <div className="qa2-kpi-grid">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                        <div className="qa2-kpi-card qa2-pulse-loader" key={i}>
                            <div className="qa2-kpi-top">
                                <span className="qa2-skeleton qa2-shimmer qa2-skeleton-circle" style={{ width: "24px", height: "24px" }} />
                                <span className="qa2-skeleton qa2-shimmer" style={{ width: "70px", height: "14px", borderRadius: "10px" }} />
                            </div>
                            <div className="qa2-skeleton qa2-shimmer qa2-skeleton-text" style={{ width: "65%", height: "22px", marginTop: "12px" }} />
                            <div className="qa2-skeleton qa2-shimmer qa2-skeleton-text" style={{ width: "45%", height: "10px", marginTop: "8px" }} />
                            <div className="qa2-skeleton qa2-shimmer qa2-skeleton-text" style={{ width: "75%", height: "8px", marginTop: "4px" }} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="qa2-kpi-grid">
                    {activeKpiCards.map((k, i) => {
                        const IconComponent = k.icon;
                        const cleanTrendText = k.trend ? k.trend.replace(/^[↑↓\s]+/, "") : "";
                        const hasUp = k.trend && k.trend.includes("↑");
                        const hasDown = k.trend && k.trend.includes("↓");

                        return (
                            <div className="qa2-kpi-card qa2-card-premium qa2-animate" style={{ animationDelay: `${0.08 + i * 0.06}s` }} key={i}>
                                <div className="qa2-kpi-top">
                                    <span className="qa2-kpi-icon" style={{ display: 'flex', alignItems: 'center' }}>
                                        <IconComponent size={20} style={{ color: k.iconColor, strokeWidth: 2.25 }} />
                                    </span>
                                    <span className={`qa2-kpi-trend ${k.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                        {hasUp && <ArrowUpRight size={12} style={{ strokeWidth: 3 }} />}
                                        {hasDown && <ArrowDownRight size={12} style={{ strokeWidth: 3 }} />}
                                        <span>{cleanTrendText}</span>
                                    </span>
                                </div>
                                <div className="qa2-kpi-val">{k.value}</div>
                                <div className="qa2-kpi-lbl">{k.label}</div>
                                <div className="qa2-kpi-sub">{k.sub}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Charts Row 1: Weekly Inspection Trend (Full Width) ── */}
            <div className="qa2-animate qa2-d3" style={{ marginBottom: "1.3rem" }}>
                <div className="qa2-card qa2-chart-card qa2-card-premium" style={{ marginBottom: 0 }}>
                    <SectionHead icon={TrendingUp} iconColor="#3b82f6" title="Weekly Inspection Trend"
                        badge={summaryData?.period || "Jan–Feb 2026"} badgeCls="qa2-badge-blue"
                        extra={
                            <div className="qa2-chart-type-toggle">
                                <button
                                    type="button"
                                    className={`qa2-toggle-btn ${weeklyChartType === "stack" ? "active" : ""}`}
                                    onClick={() => setWeeklyChartType("stack")}
                                >
                                    Stack View
                                </button>
                                <button
                                    type="button"
                                    className={`qa2-toggle-btn ${weeklyChartType === "line" ? "active" : ""}`}
                                    onClick={() => setWeeklyChartType("line")}
                                >
                                    Line View
                                </button>
                                <button
                                    type="button"
                                    className={`qa2-toggle-btn ${weeklyChartType === "defect" ? "active" : ""}`}
                                    onClick={() => setWeeklyChartType("defect")}
                                >
                                    Defect View
                                </button>
                            </div>
                        }
                    />
                    {chartsLoading ? (
                        <div className="qa2-skeleton-chart qa2-pulse-loader" style={{ height: "260px" }}>
                            <div style={{ display: "flex", gap: "10px", height: "208px", alignItems: "flex-end", padding: "0 10px" }}>
                                {[40, 70, 55, 85, 60, 95, 75, 90].map((h, idx) => (
                                    <div key={idx} className="qa2-skeleton-chart-bar qa2-shimmer" style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </div>
                    ) : (hasNoData || !chartsData?.trend) ? (
                        <QualityEmptyState message="No Data found on this period" height="260px" />
                    ) : (
                        <div className="qa2-chart-wrap qa2-chart-wrap--trend"><canvas ref={trendRef} /></div>
                    )}
                </div>
            </div>

            {/* ── Charts Row 1.5: Results Split & Defect Category Breakdown (2-col) ── */}
            <div className="qa2-charts-2 qa2-animate qa2-d3">
                <div className="qa2-card qa2-chart-card qa2-card-premium">
                    <SectionHead icon={BarChart2} iconColor="#10b981" title="Inspection Results Split" />
                    {chartsLoading ? (
                        <div className="qa2-skeleton-chart qa2-pulse-loader" style={{ justifyContent: "center", alignItems: "center", height: "192px" }}>
                            <div className="qa2-skeleton qa2-shimmer qa2-skeleton-circle" style={{ width: "100px", height: "100px", border: "10px solid #f1f5f9" }} />
                        </div>
                    ) : (hasNoData || !chartsData?.result_donut) ? (
                        <QualityEmptyState message="No Data found on this period" height="192px" />
                    ) : (
                        <div className="qa2-chart-wrap"><canvas ref={resultRef} /></div>
                    )}
                </div>
                <div className="qa2-card qa2-chart-card qa2-card-premium">
                    <SectionHead icon={AlertTriangle} iconColor="#ef4444" title="Defect Category Breakdown" />
                    {chartsLoading ? (
                        <div className="qa2-skeleton-chart qa2-pulse-loader" style={{ justifyContent: "center", alignItems: "center", height: "192px" }}>
                            <div className="qa2-skeleton qa2-shimmer qa2-skeleton-circle" style={{ width: "100px", height: "100px", border: "10px solid #f1f5f9" }} />
                        </div>
                    ) : (hasNoData || !chartsData?.defect_donut) ? (
                        <QualityEmptyState message="No Data found on this period" height="192px" />
                    ) : (
                        <div className="qa2-chart-wrap"><canvas ref={defectRef} /></div>
                    )}
                </div>
            </div>

            {/* ── Charts Row 2: 2-col ── */}
            <div className="qa2-charts-2 qa2-animate qa2-d3">
                <div className="qa2-card qa2-chart-card qa2-card-premium">
                    <SectionHead icon={TrendingUp} iconColor="#f97316" title="Internal Mac Rejection — PPM"
                        badge="Monthly" badgeCls="qa2-badge-orange" />
                    {chartsLoading ? (
                        <div className="qa2-skeleton-chart qa2-pulse-loader" style={{ height: "192px" }}>
                            <div style={{ display: "flex", gap: "10px", height: "140px", alignItems: "flex-end", padding: "0 10px" }}>
                                {[30, 45, 60, 50, 75, 80, 65, 85, 90, 70, 80, 95].map((h, idx) => (
                                    <div key={idx} className="qa2-skeleton-chart-bar qa2-shimmer" style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </div>
                    ) : (hasNoData || !chartsData?.mac_rejection_ppm) ? (
                        <QualityEmptyState message="No Data found on this period" height="192px" />
                    ) : (
                        <div className="qa2-chart-wrap"><canvas ref={ppmRef} /></div>
                    )}
                </div>
                <div className="qa2-card qa2-chart-card qa2-card-premium">
                    <SectionHead 
                        icon={BarChart2} 
                        iconColor="#ef4444" 
                        title="Top Defect Causes" 
                        extra={
                            <QualityPremiumSelect
                                value={paretoChartType}
                                onChange={setParetoChartType}
                                options={[
                                    { value: "pareto", label: "Pareto Chart", icon: <BarChart2 size={12} /> },
                                    { value: "count", label: "Defect Count", icon: <Activity size={12} /> },
                                    { value: "distribution", label: "Distribution", icon: <PieChart size={12} /> }
                                ]}
                            />
                        }
                    />
                    {chartsLoading ? (
                        <div className="qa2-skeleton-chart qa2-pulse-loader" style={{ height: "192px" }}>
                            <div style={{ display: "flex", gap: "10px", height: "140px", alignItems: "flex-end", padding: "0 10px" }}>
                                {[80, 65, 50, 40, 15].map((h, idx) => (
                                    <div key={idx} className="qa2-skeleton-chart-bar qa2-shimmer" style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </div>
                    ) : (hasNoData || !chartsData?.pareto) ? (
                        <QualityEmptyState message="No Data found on this period" height="192px" />
                    ) : (
                        <div className="qa2-chart-wrap"><canvas ref={paretoRef} /></div>
                    )}
                </div>
            </div>

            {/* ── Charts Row 3: Rejection & Rework Analytics ── */}
            <div className="qa2-charts-2 qa2-animate qa2-d3">
                <div className="qa2-card qa2-chart-card qa2-card-premium">
                    <SectionHead
                        icon={AlertTriangle}
                        iconColor="#ef4444"
                        title="Rejection Analytics Trend"
                        badge={summaryData?.kpis?.rejection_rate_card?.value || "7.5% Rate"}
                        badgeCls="qa2-badge-red"
                    />
                    {chartsLoading ? (
                        <div className="qa2-skeleton-chart qa2-pulse-loader" style={{ height: "192px" }}>
                            <div className="qa2-skeleton qa2-shimmer" style={{ height: "100%", borderRadius: "8px" }} />
                        </div>
                    ) : (hasNoData || !chartsData?.trend) ? (
                        <QualityEmptyState message="No Data found on this period" height="192px" />
                    ) : (
                        <div className="qa2-chart-wrap"><canvas ref={rejectionRef} /></div>
                    )}
                </div>
                <div className="qa2-card qa2-chart-card qa2-card-premium">
                    <SectionHead
                        icon={Wrench}
                        iconColor="#f97316"
                        title="Rework Analytics Trend"
                        badge={summaryData?.kpis?.rework_rate_card?.value || "4.9% Rate"}
                        badgeCls="qa2-badge-orange"
                    />
                    {chartsLoading ? (
                        <div className="qa2-skeleton-chart qa2-pulse-loader" style={{ height: "192px" }}>
                            <div className="qa2-skeleton qa2-shimmer" style={{ height: "100%", borderRadius: "8px" }} />
                        </div>
                    ) : (hasNoData || !chartsData?.trend) ? (
                        <QualityEmptyState message="No Data found on this period" height="192px" />
                    ) : (
                        <div className="qa2-chart-wrap"><canvas ref={reworkRef} /></div>
                    )}
                </div>
            </div>

            {/* ── Product Quality + Defect Cause ── */}
            <div className="qa2-charts-2 qa2-animate qa2-d3">

                {/* Product Quality */}
                <div className="qa2-card qa2-card-premium">
                    <SectionHead icon={Package} iconColor="#6366f1" title="Product-wise Quality Performance"
                        extra={<span className="qa2-section-sub">Target ≥ 95%</span>} />
                    {prodPerfLoading ? (
                        <div className="qa2-pq-list qa2-pulse-loader" style={{ padding: "1rem" }}>
                            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                <div className="qa2-skeleton-row" key={i} style={{ marginBottom: "12.5px" }}>
                                    <div className="qa2-skeleton qa2-shimmer" style={{ width: "35%", height: "13px" }} />
                                    <div className="qa2-skeleton qa2-shimmer" style={{ width: "12%", height: "13px" }} />
                                    <div className="qa2-skeleton qa2-shimmer" style={{ width: "12%", height: "13px" }} />
                                    <div className="qa2-skeleton qa2-shimmer" style={{ width: "20%", height: "6px", borderRadius: "3px" }} />
                                    <div className="qa2-skeleton qa2-shimmer" style={{ width: "10%", height: "13px" }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="qa2-pq-header">
                                <span className="qa2-pqh-name">Product</span>
                                <span className="qa2-pqh-num" style={{ minWidth: '40px', textAlign: 'right' }}>Insp</span>
                                <span className="qa2-pqh-num" style={{ minWidth: '40px', textAlign: 'right' }}>Pass</span>
                                <span className="qa2-pqh-num" style={{ minWidth: '40px', textAlign: 'right' }}>Rej</span>
                                <span className="qa2-pqh-bar" style={{ width: '72px', textAlign: 'right' }}>Rate</span>
                                <span className="qa2-pqh-rate" style={{ minWidth: '65px', textAlign: 'right' }}>%</span>
                            </div>
                            <div className="qa2-pq-scroll-container">
                                {activeProductQuality.length > 0 ? (
                                    activeProductQuality.map((p, i) => {
                                        const displayRate = p.rateVal ? p.rateVal.replace("⚠", "").trim() : "";
                                        const isWarning = p.hasWarning || (p.rateVal && p.rateVal.includes("⚠")) || p.rateVal === "Rework" || p.rateVal === "0%";
                                        return (
                                            <div className="qa2-pq-row" key={i}>
                                                <div className="qa2-pq-name">{p.name}</div>
                                                <div className="qa2-pq-num qa2-muted">{p.insp}</div>
                                                <div className="qa2-pq-num qa2-green">{p.pass}</div>
                                                <div className="qa2-pq-num qa2-red">{p.rej}</div>
                                                <div className="qa2-pq-bar-track">
                                                    <div className="qa2-pq-bar-fill" style={{ width: `${p.barW}%`, background: p.barColor }} />
                                                </div>
                                                <div className="qa2-pq-rate" style={{ color: p.rateColor, display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', minWidth: '65px' }}>
                                                    <span>{displayRate}</span>
                                                    {isWarning && <AlertTriangle size={13} style={{ color: p.rateColor }} />}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <QualityEmptyState message="No Data found on this period" height="240px" />
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Defect Cause */}
                <div className="qa2-card qa2-card-premium">
                    <SectionHead icon={AlertTriangle} iconColor="#ef4444" title="Defect Cause Analysis"
                        badge={`${summaryData?.kpis?.rejection_rate_card?.value || "7.5%"} Rejection`} badgeCls="qa2-badge-red" />
                    {defectCausesLoading ? (
                        <div className="qa2-pq-list qa2-pulse-loader" style={{ padding: "1rem" }}>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div className="qa2-skeleton-row" key={i} style={{ marginBottom: "14px" }}>
                                    <div className="qa2-skeleton qa2-shimmer" style={{ width: "25%", height: "13px" }} />
                                    <div className="qa2-skeleton qa2-shimmer" style={{ flex: 1, height: "6px", borderRadius: "3px" }} />
                                    <div className="qa2-skeleton qa2-shimmer" style={{ width: "15%", height: "13px" }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="qa2-defect-list">
                            {activeDefectCauses.length > 0 ? (
                                activeDefectCauses.map((d, i) => (
                                    <div className="qa2-defect-row" key={i}>
                                        <div className="qa2-defect-name">{d.name}</div>
                                        <div className="qa2-defect-bar-track">
                                            <div className="qa2-defect-bar-fill" style={{ width: `${d.barW}%`, background: d.color }} />
                                        </div>
                                        <div className="qa2-defect-count">{d.count}</div>
                                        <div className="qa2-defect-pct">{d.pct}</div>
                                    </div>
                                ))
                            ) : (
                                <QualityEmptyState message="No Data found on this period" height="200px" />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Vendor Rejection + Operation Rejection + Calibration (3-Col Grid) ── */}
            <div className="qa2-charts-3-equal qa2-animate qa2-d4">

                {/* Vendor Rejection Analysis */}
                <div className="qa2-card qa2-card-premium">
                    <SectionHead icon={Users} iconColor="#2d6de8" title="Vendor Rejection Analysis"
                        extra={<span className="qa2-section-sub">Vendor share of total rejections</span>} />
                    <div className="qa2-pq-header">
                        <span className="qa2-pqh-name">Vendor Name</span>
                        <span className="qa2-pqh-num" style={{ minWidth: '65px', textAlign: 'right' }}>Inspected</span>
                        <span className="qa2-pqh-num" style={{ minWidth: '55px', textAlign: 'right' }}>Rej Qty</span>
                        <span className="qa2-pqh-num" style={{ minWidth: '65px', textAlign: 'right' }}>Rej Rate</span>
                        <span className="qa2-pqh-bar" style={{ width: '90px', textAlign: 'right' }}>Contribution</span>
                    </div>
                    <div className="qa2-pq-scroll-container" style={{ maxHeight: '270px', overflowY: 'auto' }}>
                        {activeVendorRejection.length > 0 ? (
                            activeVendorRejection.map((v, i) => (
                                <div className="qa2-pq-row" key={i}>
                                    <div className="qa2-pq-name" title={v.name} style={{ fontWeight: 600 }}>{v.name}</div>
                                    <div className="qa2-pq-num qa2-muted" style={{ minWidth: '65px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v.insp.toLocaleString()}</div>
                                    <div className="qa2-pq-num qa2-red" style={{ minWidth: '55px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{v.rej.toLocaleString()}</div>
                                    <div className="qa2-pq-num" style={{ minWidth: '65px', textAlign: 'right', fontWeight: 700, color: v.color, fontVariantNumeric: 'tabular-nums' }}>{v.rate}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '90px', flexShrink: 0, justifyContent: 'flex-end' }}>
                                        <div className="qa2-pq-bar-track" style={{ flex: 1, background: '#f1f5f9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div className="qa2-pq-bar-fill" style={{ width: `${v.shareVal}%`, background: '#3b82f6', height: '100%', borderRadius: '3px' }} />
                                        </div>
                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', minWidth: '34px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v.share}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <QualityEmptyState message="No Data found on this period" height="180px" />
                        )}
                    </div>
                </div>

                {/* Operation (Process-wise) Rejection Analysis */}
                <div className="qa2-card qa2-card-premium">
                    <SectionHead icon={Activity} iconColor="#0f766e" title="Operation Rejection Analysis"
                        extra={<span className="qa2-section-sub">Process share of total rejections</span>} />
                    <div className="qa2-pq-header">
                        <span className="qa2-pqh-name">Process / Operation</span>
                        <span className="qa2-pqh-num" style={{ minWidth: '65px', textAlign: 'right' }}>Inspected</span>
                        <span className="qa2-pqh-num" style={{ minWidth: '55px', textAlign: 'right' }}>Rej Qty</span>
                        <span className="qa2-pqh-num" style={{ minWidth: '65px', textAlign: 'right' }}>Rej Rate</span>
                        <span className="qa2-pqh-bar" style={{ width: '90px', textAlign: 'right' }}>Contribution</span>
                    </div>
                    <div className="qa2-pq-scroll-container" style={{ maxHeight: '270px', overflowY: 'auto' }}>
                        {activeProcessRejection.length > 0 ? (
                            activeProcessRejection.map((p, i) => (
                                <div className="qa2-pq-row" key={i}>
                                    <div className="qa2-pq-name" title={p.name} style={{ fontWeight: 600 }}>{p.name}</div>
                                    <div className="qa2-pq-num qa2-muted" style={{ minWidth: '65px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.insp.toLocaleString()}</div>
                                    <div className="qa2-pq-num qa2-red" style={{ minWidth: '55px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{p.rej.toLocaleString()}</div>
                                    <div className="qa2-pq-num" style={{ minWidth: '65px', textAlign: 'right', fontWeight: 700, color: p.color, fontVariantNumeric: 'tabular-nums' }}>{p.rate}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '90px', flexShrink: 0, justifyContent: 'flex-end' }}>
                                        <div className="qa2-pq-bar-track" style={{ flex: 1, background: '#f1f5f9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div className="qa2-pq-bar-fill" style={{ width: `${p.shareVal}%`, background: '#0f766e', height: '100%', borderRadius: '3px' }} />
                                        </div>
                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', minWidth: '34px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.share}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af", fontSize: "0.9rem" }}>
                                No process records found for this period
                            </div>
                        )}
                    </div>
                </div>

                {/* Calibration */}
                <div className="qa2-card qa2-card-premium">
                    <SectionHead icon={Wrench} iconColor="#f59e0b" title="Calibration Status"
                        badge={calibrationAlertCount > 0 ? `${calibrationAlertCount} Alert${calibrationAlertCount > 1 ? "s" : ""}` : activeCalibrationRows.length > 0 ? `${activeCalibrationRows.length} Items` : "No Due"}
                        badgeCls={calibrationAlertCount > 0 ? "qa2-badge-orange" : "qa2-badge-green"} />
                    {calibrationLoading ? (
                        <div className="qa2-pq-list qa2-pulse-loader" style={{ padding: "1rem" }}>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div className="qa2-skeleton-row" key={i} style={{ marginBottom: "13px" }}>
                                    <div className="qa2-skeleton qa2-shimmer" style={{ flex: 1, height: "12px" }} />
                                    <div className="qa2-skeleton qa2-shimmer" style={{ width: "25%", height: "12px" }} />
                                    <div className="qa2-skeleton qa2-shimmer" style={{ width: "15%", height: "12px" }} />
                                </div>
                            ))}
                        </div>
                    ) : activeCalibrationRows.length === 0 ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "var(--qa2-text-muted, #94a3b8)", fontSize: "0.88rem" }}>
                            <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
                                <Wrench size={32} style={{ color: '#94a3b8', strokeWidth: 1.5 }} />
                            </div>
                            <div>No instruments due for calibration in the selected period.</div>
                        </div>
                    ) : (
                        <div className="qa2-cal-scroll-wrap">
                            <div className="qa2-cal-scroll">
                                {activeCalibrationRows.map((c, i) => (
                                    <div className="qa2-cal-row" key={i}>
                                        <div className="qa2-cal-info">
                                            <div className="qa2-cal-name">{c.name}</div>
                                            <div className="qa2-cal-id">
                                                {c.id}
                                                {c.last_calib && c.last_calib !== "—" && (
                                                    <span style={{ marginLeft: "6px", color: "#cbd5e1" }}>·</span>
                                                )}
                                                {c.last_calib && c.last_calib !== "—" && (
                                                    <span style={{ color: "#b0bcc8", marginLeft: "4px" }}>Last: {c.last_calib}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`qa2-cal-date ${c.cls === "qa2-cal-over" ? "qa2-cal-date--over" : ""}`}>{c.date}</div>
                                        <div className={`qa2-cal-days ${c.cls}`}>{c.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Top 5 Material Rejection + Top 5 Machine Rejection + Dept Rejection (3-Col Grid) ── */}
            <div className="qa2-charts-3-equal qa2-animate qa2-d4">

                {/* Top 5 Material Rejection */}
                <div className="qa2-card qa2-card-premium">
                    <SectionHead icon={Package} iconColor="#f43f5e" title="Top 5 Material Rejection"
                        extra={<span className="qa2-section-sub">Highest quantity material failures</span>} />
                    <div className="qa2-pq-header">
                        <span className="qa2-pqh-name">Material / Product</span>
                        <span className="qa2-pqh-num" style={{ minWidth: '70px', textAlign: 'right' }}>Rej Qty</span>
                        <span className="qa2-pqh-num" style={{ minWidth: '90px', textAlign: 'right' }}>Operation</span>
                    </div>
                    <div className="qa2-pq-scroll-container" style={{ maxHeight: '270px', overflowY: 'auto' }}>
                        {topMaterialRejections.length > 0 ? (
                            topMaterialRejections.map((m, i) => (
                                <div className="qa2-pq-row" key={i}>
                                    <div className="qa2-pq-name" title={m.name} style={{ fontWeight: 600 }}>{m.name}</div>
                                    <div className="qa2-pq-num qa2-red" style={{ minWidth: '70px', textAlign: 'right', fontWeight: 600 }}>{m.qty.toLocaleString()}</div>
                                    <div className="qa2-pq-num qa2-muted" style={{ minWidth: '90px', textAlign: 'right' }}>{m.process}</div>
                                </div>
                            ))
                        ) : (
                            <QualityEmptyState message="No Data found on this period" height="180px" />
                        )}
                    </div>
                </div>

                {/* Top 5 Machine Rejection */}
                <div className="qa2-card qa2-card-premium">
                    <SectionHead icon={Activity} iconColor="#0f766e" title="Top 5 Machine Rejection"
                        extra={<span className="qa2-section-sub">Highest quantity processing failures</span>} />
                    <div className="qa2-pq-header">
                        <span className="qa2-pqh-name">Product / Part</span>
                        <span className="qa2-pqh-num" style={{ minWidth: '70px', textAlign: 'right' }}>Rej Qty</span>
                        <span className="qa2-pqh-num" style={{ minWidth: '90px', textAlign: 'right' }}>Operation</span>
                    </div>
                    <div className="qa2-pq-scroll-container" style={{ maxHeight: '270px', overflowY: 'auto' }}>
                        {topMachineRejections.length > 0 ? (
                            topMachineRejections.map((m, i) => (
                                <div className="qa2-pq-row" key={i}>
                                    <div className="qa2-pq-name" title={m.name} style={{ fontWeight: 600 }}>{m.name}</div>
                                    <div className="qa2-pq-num qa2-red" style={{ minWidth: '70px', textAlign: 'right', fontWeight: 600 }}>{m.qty.toLocaleString()}</div>
                                    <div className="qa2-pq-num qa2-muted" style={{ minWidth: '90px', textAlign: 'right' }}>{m.process}</div>
                                </div>
                            ))
                        ) : (
                            <QualityEmptyState message="No Data found on this period" height="180px" />
                        )}
                    </div>
                </div>

                {/* Department wise Rejection */}
                <div className="qa2-card qa2-card-premium">
                    <SectionHead icon={Users} iconColor="#2d6de8" title="Department wise Rejection"
                        extra={<span className="qa2-section-sub">Department share of rejections</span>} />
                    <div className="qa2-pq-header">
                        <span className="qa2-pqh-name">Department</span>
                        <span className="qa2-pqh-num" style={{ minWidth: '60px', textAlign: 'right' }}>Inspected</span>
                        <span className="qa2-pqh-num" style={{ minWidth: '50px', textAlign: 'right' }}>Rej Qty</span>
                        <span className="qa2-pqh-num" style={{ minWidth: '60px', textAlign: 'right' }}>Rej Rate</span>
                        <span className="qa2-pqh-bar" style={{ width: '90px', textAlign: 'right' }}>Contribution</span>
                    </div>
                    <div className="qa2-pq-scroll-container" style={{ maxHeight: '270px', overflowY: 'auto' }}>
                        {departmentRejections.length > 0 ? (
                            departmentRejections.map((d, i) => (
                                <div className="qa2-pq-row" key={i}>
                                    <div className="qa2-pq-name" title={d.department} style={{ fontWeight: 600 }}>{d.department}</div>
                                    <div className="qa2-pq-num qa2-muted" style={{ minWidth: '60px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{d.inspected.toLocaleString()}</div>
                                    <div className="qa2-pq-num qa2-red" style={{ minWidth: '50px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{d.rejected.toLocaleString()}</div>
                                    <div className="qa2-pq-num" style={{ minWidth: '60px', textAlign: 'right', fontWeight: 700, color: parseFloat(d.rate) > 5.0 ? '#ef4444' : (parseFloat(d.rate) > 2.5 ? '#f97316' : '#10b981'), fontVariantNumeric: 'tabular-nums' }}>{d.rate}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '90px', flexShrink: 0, justifyContent: 'flex-end' }}>
                                        <div className="qa2-pq-bar-track" style={{ flex: 1, background: '#f1f5f9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div className="qa2-pq-bar-fill" style={{ width: `${d.shareVal}%`, background: '#2d6de8', height: '100%', borderRadius: '3px' }} />
                                        </div>
                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', minWidth: '34px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{d.share}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <QualityEmptyState message="No Data found on this period" height="180px" />
                        )}
                    </div>
                </div>

            </div>

            {/* ── Full Inspection Table ── */}
            <div className="qa2-card qa2-animate qa2-d4 qa2-card-premium">
                <SectionHead
                    icon={FileText}
                    iconColor="#3b82f6"
                    title="Inspection Records — All Transactions"
                    extra={
                        <div className="qa2-tag-row" style={{ paddingBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span
                                className={`qa2-badge qa2-badge-blue qa2-badge-interactive ${selectedType !== "ALL" && selectedType !== "INTER" ? "qa2-badge-inactive" : ""} ${selectedType === "INTER" ? "qa2-badge-active-blue" : ""}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => setSelectedType(prev => prev === "INTER" ? "ALL" : "INTER")}
                            >
                                <Activity size={10} style={{ strokeWidth: 3 }} /> Inter Insp: {interInspCount}
                            </span>
                            <span
                                className={`qa2-badge qa2-badge-teal qa2-badge-interactive ${selectedType !== "ALL" && selectedType !== "FINAL" ? "qa2-badge-inactive" : ""} ${selectedType === "FINAL" ? "qa2-badge-active-teal" : ""}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => setSelectedType(prev => prev === "FINAL" ? "ALL" : "FINAL")}
                            >
                                <CheckCircle size={10} style={{ strokeWidth: 3 }} /> Final Insp: {finalInspCount}
                            </span>
                            <span
                                className={`qa2-badge qa2-badge-purple qa2-badge-interactive ${selectedType !== "ALL" && selectedType !== "JOB" ? "qa2-badge-inactive" : ""} ${selectedType === "JOB" ? "qa2-badge-active-purple" : ""}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => setSelectedType(prev => prev === "JOB" ? "ALL" : "JOB")}
                            >
                                <FileText size={10} style={{ strokeWidth: 3 }} /> Job Order: {jobOrderCount}
                            </span>
                            {selectedType !== "ALL" && (
                                <button
                                    className="qa2-clear-type-filter-btn"
                                    onClick={() => setSelectedType("ALL")}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#2d6de8',
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        padding: '0 4px',
                                        marginLeft: '4px'
                                    }}
                                >
                                    <X size={10} style={{ strokeWidth: 3 }} /> Clear Filter
                                </button>
                            )}
                        </div>
                    }
                />
                {recordsLoading ? (
                    <div className="qa2-table-scroll qa2-pulse-loader" style={{ padding: "1.5rem" }}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <div className="qa2-skeleton-row" key={i} style={{ marginBottom: "16px" }}>
                                <div className="qa2-skeleton qa2-shimmer" style={{ width: "10%", height: "14px" }} />
                                <div className="qa2-skeleton qa2-shimmer" style={{ width: "10%", height: "14px" }} />
                                <div className="qa2-skeleton qa2-shimmer" style={{ width: "30%", height: "14px" }} />
                                <div className="qa2-skeleton qa2-shimmer" style={{ width: "12%", height: "14px" }} />
                                <div className="qa2-skeleton qa2-shimmer" style={{ width: "8%", height: "14px" }} />
                                <div className="qa2-skeleton qa2-shimmer" style={{ width: "30%", height: "14px" }} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="qa2-table-scroll">
                        <table className="qa2-table">
                            <thead>
                                <tr>
                                    {["Type", "Insp No", "Insp Date", "Part No – Description", "Process", "Insp Qty", "OK Qty", "Mat Rej Qty", "Mac Rej Qty", "Rework Qty", "Insp By"].map(h => (
                                        <th key={h} className={h.includes("Qty") ? "qa2-td-r" : ""}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activeInspectionRows.length > 0 ? (
                                    activeInspectionRows.map((r, i) => {
                                        const typeLabel = r.typeLabel || "Intermediate";
                                        const typeCls = r.typeCls || "qa2-tag-teal";
                                        const inspNo = r.id;
                                        const inspDate = r.date;
                                        const partNoDesc = r.partNoDesc || (r.partNo && r.product ? `${r.partNo} - ${r.product}` : (r.partNo || r.product || "—"));
                                        const process = r.process !== undefined ? r.process : "";
                                        const inspQty = r.qty;
                                        const okQty = r.okQty || (r.result === "PASS" ? r.qty : (r.result === "PENDING" ? r.qty : "0"));
                                        const matRejQty = r.matRejQty || (r.result === "FAIL" && !r.product?.toLowerCase().includes("segment") ? r.qty : "0");
                                        const macRejQty = r.macRejQty || (r.result === "FAIL" && r.product?.toLowerCase().includes("segment") ? r.qty : "0");
                                        const reworkQty = r.reworkQty || (r.result === "REWORK" ? r.qty : "0");
                                        const inspBy = r.inspBy || getInspectorName(r.id);

                                        return (
                                            <tr key={i} className="qa2-tr">
                                                <td style={getColStyle("Type")}>
                                                    <span
                                                        className={`qa2-badge ${typeCls} qa2-badge-interactive`}
                                                        style={{ display: 'inline-flex', alignItems: 'center' }}
                                                        onClick={() => handleTypeBadgeClick(typeLabel)}
                                                    >
                                                        {typeLabel}
                                                    </span>
                                                </td>
                                                <td style={getColStyle("Insp No")}><span className="qa2-insp-id">{inspNo}</span></td>
                                                <td className="qa2-muted qa2-nowrap" style={getColStyle("Insp Date")}>{inspDate}</td>
                                                <td className="qa2-mono qa2-muted" style={getColStyle("Part No – Description")}>{partNoDesc}</td>
                                                <td style={getColStyle("Process")}>
                                                    {process ? (
                                                        <span className="qa2-badge qa2-tag-blue" style={{ background: "rgba(224,242,254,0.6)", color: "#0369a1" }}>{process}</span>
                                                    ) : "—"}
                                                </td>
                                                <td className="qa2-td-r" style={{ ...getColStyle("Insp Qty"), fontWeight: 600 }}>{inspQty}</td>
                                                <td className="qa2-td-r qa2-green" style={{ ...getColStyle("OK Qty"), fontWeight: 600 }}>{okQty}</td>
                                                <td className="qa2-td-r qa2-red" style={getColStyle("Mat Rej Qty")}>{matRejQty}</td>
                                                <td className="qa2-td-r qa2-red" style={getColStyle("Mac Rej Qty")}>{macRejQty}</td>
                                                <td className="qa2-td-r qa2-orange" style={getColStyle("Rework Qty")}>{reworkQty}</td>
                                                <td className="qa2-muted qa2-nowrap" style={getColStyle("Insp By")}>{inspBy}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="11" style={{ padding: 0 }}>
                                            <QualityEmptyState message="No Data found on this period" height="240px" />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="qa2-total-row">
                                    <td colSpan="5" className="qa2-total-label">Total</td>
                                    <td className="qa2-td-r" style={getColStyle("Insp Qty")}><span className="qa2-total-badge qa2-total-badge-blue">{activeInspectionRowsTotals.insp.toLocaleString()}</span></td>
                                    <td className="qa2-td-r" style={getColStyle("OK Qty")}><span className="qa2-total-badge qa2-total-badge-green">{activeInspectionRowsTotals.ok.toLocaleString()}</span></td>
                                    <td className="qa2-td-r" style={getColStyle("Mat Rej Qty")}><span className="qa2-total-badge qa2-total-badge-red">{activeInspectionRowsTotals.matRej.toLocaleString()}</span></td>
                                    <td className="qa2-td-r" style={getColStyle("Mac Rej Qty")}><span className="qa2-total-badge qa2-total-badge-red">{activeInspectionRowsTotals.macRej.toLocaleString()}</span></td>
                                    <td className="qa2-td-r" style={getColStyle("Rework Qty")}><span className="qa2-total-badge qa2-total-badge-orange">{activeInspectionRowsTotals.rework.toLocaleString()}</span></td>
                                    <td style={getColStyle("Insp By")}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Rejection & Rework Summary (Full Width) ── */}
            <div className="qa2-card qa2-animate qa2-d4 qa2-card-premium">
                <SectionHead
                    icon={XCircle}
                    iconColor="#ef4444"
                    title="Rejection & Rework Summary"
                    extra={
                        <div className="qa2-tag-row" style={{ paddingBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span
                                className="qa2-badge"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    border: '1px solid #e2e8f0',
                                    fontWeight: 600
                                }}
                            >
                                {activeRejectionRows.length} Record{activeRejectionRows.length !== 1 ? 's' : ''}
                            </span>
                            <span
                                className={`qa2-badge qa2-badge-red qa2-badge-interactive ${selectedDispFilter !== "ALL" && selectedDispFilter !== "REJECTION" ? "qa2-badge-inactive" : ""} ${selectedDispFilter === "REJECTION" ? "qa2-badge-active-red" : ""}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => setSelectedDispFilter(prev => prev === "REJECTION" ? "ALL" : "REJECTION")}
                            >
                                <XCircle size={10} style={{ strokeWidth: 3 }} /> Rejection: {rejectionCount}
                            </span>
                            <span
                                className={`qa2-badge qa2-badge-orange qa2-badge-interactive ${selectedDispFilter !== "ALL" && selectedDispFilter !== "REWORK" ? "qa2-badge-inactive" : ""} ${selectedDispFilter === "REWORK" ? "qa2-badge-active-orange" : ""}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => setSelectedDispFilter(prev => prev === "REWORK" ? "ALL" : "REWORK")}
                            >
                                <Wrench size={10} style={{ strokeWidth: 3 }} /> Rework: {reworkCount}
                            </span>

                            {/* Premium Custom Dropdown Filter */}
                            <div ref={typeDropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
                                <button
                                    onClick={() => setInspTypeDropdownOpen(p => !p)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: '#ffffff',
                                        color: '#334155',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        padding: '4px 10px',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        transition: 'all 0.15s ease',
                                        outline: 'none',
                                        userSelect: 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#94a3b8';
                                        e.currentTarget.style.background = '#f8fafc';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                        e.currentTarget.style.background = '#ffffff';
                                    }}
                                >
                                    <SlidersHorizontal size={10} style={{ color: '#64748b' }} />
                                    <span>
                                        {selectedInspTypeFilter === "ALL" ? "All Insp. Types" : selectedInspTypeFilter}
                                    </span>
                                    <ChevronDown size={10} style={{ 
                                        color: '#64748b', 
                                        transition: 'transform 0.2s ease', 
                                        transform: inspTypeDropdownOpen ? 'rotate(180deg)' : 'none' 
                                    }} />
                                </button>

                                {inspTypeDropdownOpen && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 4px)',
                                        right: 0,
                                        zIndex: 999,
                                        minWidth: '190px',
                                        background: 'rgba(255, 255, 255, 0.95)',
                                        backdropFilter: 'blur(8px)',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                        padding: '4px',
                                    }}>
                                        {[
                                            { value: "ALL", label: "All Insp. Types" },
                                            { value: "Job Order", label: "Job Order" },
                                            { value: "Intermediate Inspection", label: "Intermediate" },
                                            { value: "Final Inspection", label: "Final Inspection" }
                                        ].map(opt => {
                                            const isSelected = selectedInspTypeFilter === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => {
                                                        setSelectedInspTypeFilter(opt.value);
                                                        setInspTypeDropdownOpen(false);
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        width: '100%',
                                                        padding: '6px 12px',
                                                        border: 'none',
                                                        background: isSelected ? 'rgba(45, 109, 232, 0.08)' : 'transparent',
                                                        color: isSelected ? '#2d6de8' : '#475569',
                                                        fontSize: '0.72rem',
                                                        fontWeight: isSelected ? 700 : 500,
                                                        borderRadius: '6px',
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected) {
                                                            e.currentTarget.style.background = '#f1f5f9';
                                                            e.currentTarget.style.color = '#0f172a';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected) {
                                                            e.currentTarget.style.background = 'transparent';
                                                            e.currentTarget.style.color = '#475569';
                                                        }
                                                    }}
                                                >
                                                    <span>{opt.label}</span>
                                                    {isSelected && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#2d6de8' }} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {(selectedDispFilter !== "ALL" || selectedInspTypeFilter !== "ALL") && (
                                <button
                                    className="qa2-clear-type-filter-btn"
                                    onClick={() => {
                                        setSelectedDispFilter("ALL");
                                        setSelectedInspTypeFilter("ALL");
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#2d6de8',
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        padding: '0 4px',
                                        marginLeft: '4px'
                                    }}
                                >
                                    <X size={10} style={{ strokeWidth: 3 }} /> Clear Filter
                                </button>
                            )}
                        </div>
                    }
                />
                {recordsLoading ? (
                    <div className="qa2-table-scroll qa2-pulse-loader" style={{ padding: "1rem" }}>
                        {[1, 2, 3, 4].map(i => (
                            <div className="qa2-skeleton-row" key={i} style={{ marginBottom: "14px" }}>
                                <div className="qa2-skeleton qa2-shimmer" style={{ width: "15%", height: "12px" }} />
                                <div className="qa2-skeleton qa2-shimmer" style={{ width: "30%", height: "12px" }} />
                                <div className="qa2-skeleton qa2-shimmer" style={{ width: "35%", height: "12px" }} />
                                <div className="qa2-skeleton qa2-shimmer" style={{ width: "10%", height: "12px" }} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="qa2-table-scroll">
                        <table className="qa2-table">
                            <thead>
                                <tr>
                                    {["Insp No", "Insp Type", "Product", "Reason", "Qty", "Disposition", "Date"].map(h => (
                                        <th key={h} style={getRejColStyle(h)} className={h === "Qty" ? "qa2-th-r" : ""}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activeRejectionRows.length > 0 ? (
                                    activeRejectionRows.map((r, i) => {
                                        const type = r.inspType || "Job Order";
                                        const typeCls = type.includes("Job") ? "qa2-tag-teal" : "qa2-tag-blue";
                                        return (
                                            <tr key={i} className="qa2-tr">
                                                <td style={getRejColStyle("Insp No")}><span className="qa2-rej-id">{r.id}</span></td>
                                                <td style={getRejColStyle("Insp Type")}>
                                                    <span className={`qa2-badge ${typeCls}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                        {type}
                                                    </span>
                                                </td>
                                                <td style={getRejColStyle("Product")}>{r.product}</td>
                                                <td style={getRejColStyle("Reason")}>{r.reason}</td>
                                                <td className="qa2-td-r" style={getRejColStyle("Qty")}>{r.qty}</td>
                                                <td style={getRejColStyle("Disposition")}>
                                                    <span
                                                        className={`qa2-badge ${r.dispCls} qa2-badge-interactive`}
                                                        style={{ display: 'inline-flex', alignItems: 'center' }}
                                                        onClick={() => handleDispBadgeClick(r.disp)}
                                                    >
                                                        {r.disp}
                                                    </span>
                                                </td>
                                                <td className="qa2-muted qa2-nowrap" style={getRejColStyle("Date")}>{r.date}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ padding: 0 }}>
                                            <QualityEmptyState message="No Data found on this period" height="200px" />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {activeRejectionRows.length > 0 && (
                                <tfoot>
                                    <tr className="qa2-total-row">
                                        <td style={getRejColStyle("Insp No")} className="qa2-total-label">Total</td>
                                        <td style={getRejColStyle("Insp Type")}></td>
                                        <td style={getRejColStyle("Product")}></td>
                                        <td style={getRejColStyle("Reason")}></td>
                                        <td className="qa2-td-r" style={getRejColStyle("Qty")}>
                                            <span className="qa2-total-badge qa2-total-badge-red" style={{ fontWeight: 700 }}>
                                                {totalRejRwkQty.toLocaleString("en-IN")}
                                            </span>
                                        </td>
                                        <td style={getRejColStyle("Disposition")}></td>
                                        <td style={getRejColStyle("Date")}></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>

            {/* ── Supplier Wise Rejection (Full Width, Chart Left, Table Right) ── */}
            <div className="qa2-card qa2-animate qa2-d4 qa2-card-premium">
                <SectionHead icon={PieChart} iconColor="#8b5cf6" title="Supplier Wise Rejection"
                    badge={`${activeSupplierRejections.length} Record${activeSupplierRejections.length !== 1 ? "s" : ""}`} badgeCls="qa2-badge-purple" />
                <div className="qa2-supplier-grid">
                    
                    {/* Left side: Chart/Graph */}
                    <div style={{
                        background: "rgba(255, 255, 255, 0.4)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(226, 232, 240, 0.8)",
                        borderRadius: "12px",
                        padding: "1rem",
                        display: "flex",
                        flexDirection: "column",
                        minHeight: "340px",
                        boxShadow: "inset 0 2px 4px 0 rgba(0,0,0,0.01)"
                    }}>
                        <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "#1e293b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Rejection Breakdown by Supplier</div>
                        <div style={{ flex: 1, position: "relative" }}>
                            <canvas ref={supplierRef} />
                        </div>
                    </div>

                    {/* Right side: Table */}
                    <div className="qa2-table-scroll" style={{ margin: 0, padding: 0, background: "rgba(255, 255, 255, 0.2)", borderRadius: "12px", border: "1px solid rgba(226, 232, 240, 0.8)", minHeight: "340px" }}>
                        <table className="qa2-table">
                            <thead>
                                <tr>
                                    {["#", "Supplier Name", "Grn no", "Grn Date", "Item Details", "GRN Qty", "UOM", "Ok Qty", "Mat Rej", "Mac Rej"].map(h => (
                                        <th key={h} style={getSuppColStyle(h)} className={["GRN Qty", "Ok Qty", "Mat Rej", "Mac Rej"].includes(h) ? "qa2-th-r" : ""}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activeSupplierRejections.map((r, i) => (
                                    <tr key={i} className="qa2-tr">
                                        <td style={{ ...getSuppColStyle("#"), fontWeight: 600, color: "#64748b" }}>{i + 1}</td>
                                        <td style={{ ...getSuppColStyle("Supplier Name"), fontWeight: 600 }}>{r.supplier}</td>
                                        <td style={getSuppColStyle("Grn no")}><span className="qa2-rej-id" style={{ background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>{r.grnNo}</span></td>
                                        <td style={getSuppColStyle("Grn Date")} className="qa2-muted qa2-nowrap">{r.date}</td>
                                        <td style={getSuppColStyle("Item Details")} className="qa2-mono qa2-muted">{r.item}</td>
                                        <td style={{ ...getSuppColStyle("GRN Qty"), fontWeight: 600 }} className="qa2-td-r">{r.qty.toLocaleString()}</td>
                                        <td style={{ ...getSuppColStyle("UOM"), color: "#64748b" }} className="qa2-nowrap qa2-center">{r.uom}</td>
                                        <td style={{ ...getSuppColStyle("Ok Qty"), fontWeight: 600 }} className="qa2-td-r qa2-green">{r.okQty.toLocaleString()}</td>
                                        <td style={{ ...getSuppColStyle("Mat Rej"), fontWeight: r.matRej > 0 ? 600 : 400 }} className={`qa2-td-r ${r.matRej > 0 ? "qa2-red" : ""}`}>{r.matRej.toLocaleString()}</td>
                                        <td style={{ ...getSuppColStyle("Mac Rej"), fontWeight: r.macRej > 0 ? 600 : 400 }} className={`qa2-td-r ${r.macRej > 0 ? "qa2-red" : ""}`}>{r.macRej.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── Customer Complaints (Full Width) ── */}
            <div className="qa2-card qa2-animate qa2-d4 qa2-card-premium">
                <SectionHead icon={AlertCircle} iconColor="#ef4444" title="Customer Complaints Log"
                    badge={`${activeCustomerComplaints.length} Complaint${activeCustomerComplaints.length !== 1 ? "s" : ""}`} badgeCls="qa2-badge-red" />
                {customerComplaintsLoading ? (
                    <div className="qa2-table-scroll qa2-pulse-loader" style={{ padding: "1.5rem" }}>
                        {[1, 2, 3].map(i => (
                            <div className="qa2-skeleton-row" key={i} style={{ marginBottom: "16px" }}>
                                <div className="qa2-skeleton qa2-shimmer" style={{ width: "12%", height: "14px" }} />
                                <div className="qa2-skeleton qa2-shimmer" style={{ width: "20%", height: "14px" }} />
                                <div className="qa2-skeleton qa2-shimmer" style={{ width: "25%", height: "14px" }} />
                                <div className="qa2-skeleton qa2-shimmer" style={{ width: "35%", height: "14px" }} />
                                <div className="qa2-skeleton qa2-shimmer" style={{ width: "8%", height: "14px" }} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="qa2-table-scroll">
                        <table className="qa2-table">
                            <thead>
                                <tr>
                                    {["Complaint ID", "Customer", "Product", "Complaint Description", "Action Taken", "Date", "Corrective Action", "Permanent Action", "Status"].map(h => (
                                        <th key={h}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activeCustomerComplaints.length > 0 ? (
                                    activeCustomerComplaints.map((c, i) => {
                                        const statusLower = String(c.status).toLowerCase();
                                        let statusCls = "qa2-tag-pending";
                                        if (statusLower.includes("resolve") || statusLower.includes("close")) {
                                            statusCls = "qa2-tag-pass";
                                        } else if (statusLower.includes("progress") || statusLower.includes("open")) {
                                            statusCls = "qa2-tag-rework";
                                        }
                                        return (
                                            <tr key={i} className="qa2-tr">
                                                <td style={{ minWidth: "120px" }}><span className="qa2-rej-id" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{c.complaint_id}</span></td>
                                                <td style={{ minWidth: "140px", fontWeight: 600 }}>{c.customer_name}</td>
                                                <td style={{ minWidth: "180px", maxWidth: "250px", wordBreak: "break-word", whiteSpace: "normal" }}>{c.product}</td>
                                                <td style={{ minWidth: "220px", maxWidth: "300px", wordBreak: "break-word", whiteSpace: "normal" }} className="qa2-remarks">{c.complaint_description}</td>
                                                <td style={{ minWidth: "200px", maxWidth: "280px", wordBreak: "break-word", whiteSpace: "normal" }}>{c.action_taken}</td>
                                                <td className="qa2-muted qa2-nowrap">{formatDisplayDate(c.complaint_date)}</td>
                                                <td style={{ minWidth: "200px", maxWidth: "280px", wordBreak: "break-word", whiteSpace: "normal" }}>{c.corrective_action}</td>
                                                <td style={{ minWidth: "200px", maxWidth: "280px", wordBreak: "break-word", whiteSpace: "normal" }}>{c.permanent_action}</td>
                                                <td><span className={`qa2-badge ${statusCls}`}>{c.status}</span></td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9" style={{ padding: 0 }}>
                                            <QualityEmptyState message="No Data found on this period" height="200px" />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Traceability (Full Width) ── */}
            <div className="qa2-card qa2-card-premium qa2-animate qa2-d4">
                <SectionHead
                    icon={FileText}
                    iconColor="#8b5cf6"
                    title="Traceability Records"
                    badge={`${activeTraceabilityRows.length} Record${activeTraceabilityRows.length !== 1 ? "s" : ""}`}
                    badgeCls="qa2-badge-purple"
                    extra={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ position: 'relative' }} ref={traceTypeDropdownRef}>
                                <button
                                    className="qa2-filter-btn"
                                    onClick={() => setTraceTypeDropdownOpen(!traceTypeDropdownOpen)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        background: 'rgba(255,255,255,0.7)',
                                        color: '#475569',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#ffffff';
                                        e.currentTarget.style.borderColor = '#94a3b8';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                    }}
                                >
                                    <span>
                                        {selectedTraceTypeFilter === "ALL" && "All Insp. Types"}
                                        {selectedTraceTypeFilter === "FINAL" && "Final Inspection"}
                                        {selectedTraceTypeFilter === "INTER" && "Intermediate"}
                                        {selectedTraceTypeFilter === "JOB" && "Job Order"}
                                    </span>
                                    <ChevronDown size={10} style={{ 
                                        color: '#64748b', 
                                        transition: 'transform 0.2s ease', 
                                        transform: traceTypeDropdownOpen ? 'rotate(180deg)' : 'none' 
                                    }} />
                                </button>

                                {traceTypeDropdownOpen && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 4px)',
                                        right: 0,
                                        zIndex: 999,
                                        minWidth: '190px',
                                        background: 'rgba(255, 255, 255, 0.95)',
                                        backdropFilter: 'blur(8px)',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                        padding: '4px',
                                    }}>
                                        {[
                                            { value: "ALL", label: "All Insp. Types" },
                                            { value: "JOB", label: "Job Order" },
                                            { value: "INTER", label: "Intermediate" },
                                            { value: "FINAL", label: "Final Inspection" }
                                        ].map(opt => {
                                            const isSelected = selectedTraceTypeFilter === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => {
                                                        setSelectedTraceTypeFilter(opt.value);
                                                        setTraceTypeDropdownOpen(false);
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        width: '100%',
                                                        padding: '6px 12px',
                                                        border: 'none',
                                                        background: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                                                        color: isSelected ? '#8b5cf6' : '#475569',
                                                        fontSize: '0.72rem',
                                                        fontWeight: isSelected ? 700 : 500,
                                                        borderRadius: '6px',
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected) {
                                                            e.currentTarget.style.background = '#f1f5f9';
                                                            e.currentTarget.style.color = '#0f172a';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected) {
                                                            e.currentTarget.style.background = 'transparent';
                                                            e.currentTarget.style.color = '#475569';
                                                        }
                                                    }}
                                                >
                                                    <span>{opt.label}</span>
                                                    {isSelected && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#8b5cf6' }} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {selectedTraceTypeFilter !== "ALL" && (
                                <button
                                    className="qa2-clear-type-filter-btn"
                                    onClick={() => {
                                        setSelectedTraceTypeFilter("ALL");
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#8b5cf6',
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        padding: '0 4px',
                                        marginLeft: '4px'
                                    }}
                                >
                                    <X size={10} style={{ strokeWidth: 3 }} /> Clear Filter
                                </button>
                            )}
                        </div>
                    }
                />
                <div className="qa2-table-scroll">
                    <table className="qa2-table">
                        <thead>
                            <tr>
                                {["#", "Inspno", "Insp Date", "Machine No", "Shift", "Partno-Description", "Process", "Operator Name", "Prod Qty", "Rej Qty", "Rw Qty", "Inspected By", "Routecard Details"].map(h => (
                                    <th key={h} style={getTraceColStyle(h)} className={["Prod Qty", "Rej Qty", "Rw Qty"].includes(h) ? "qa2-td-r" : ""}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {activeTraceabilityRows.length > 0 ? (
                                activeTraceabilityRows.map((r, i) => {
                                    const totalRej = (parseFloat(r.matRejQty || 0) + parseFloat(r.macRejQty || 0));
                                    return (
                                        <tr key={i} className="qa2-tr">
                                            <td style={{ ...getTraceColStyle("#"), fontWeight: 600, color: "#64748b" }}>{i + 1}</td>
                                            <td style={getTraceColStyle("Inspno")}><span className="qa2-rej-id" style={{ background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>{r.id}</span></td>
                                            <td style={getTraceColStyle("Insp Date")} className="qa2-muted qa2-nowrap">{r.date}</td>
                                            <td style={getTraceColStyle("Machine No")}>
                                                {r.machineNo && r.machineNo !== "—" ? (
                                                    <span className="qa2-badge qa2-tag-blue" style={{ background: "rgba(224,242,254,0.6)", color: "#0369a1" }}>{r.machineNo}</span>
                                                ) : "—"}
                                            </td>
                                            <td style={getTraceColStyle("Shift")}>
                                                {r.shift && r.shift !== "—" ? (
                                                    <span className="qa2-badge qa2-tag-teal" style={{ background: "rgba(204,251,241,0.6)", color: "#0f766e" }}>{r.shift}</span>
                                                ) : "—"}
                                            </td>
                                            <td style={getTraceColStyle("Partno-Description")} className="qa2-mono qa2-muted">{r.partNoDesc}</td>
                                            <td style={getTraceColStyle("Process")}>
                                                {r.process ? (
                                                    <span className="qa2-badge qa2-tag-blue" style={{ background: "rgba(224,242,254,0.6)", color: "#0369a1" }}>{r.process}</span>
                                                ) : "—"}
                                            </td>
                                            <td style={getTraceColStyle("Operator Name")}>{r.operatorName}</td>
                                            <td style={{ ...getTraceColStyle("Prod Qty"), fontWeight: 600 }} className="qa2-td-r">{r.qty}</td>
                                            <td className="qa2-td-r" style={{ ...getTraceColStyle("Rej Qty"), fontWeight: totalRej > 0 ? 600 : 400, color: totalRej > 0 ? "#ef4444" : "inherit" }}>{totalRej}</td>
                                            <td className="qa2-td-r" style={{ ...getTraceColStyle("Rw Qty"), fontWeight: parseFloat(r.reworkQty || 0) > 0 ? 600 : 400, color: parseFloat(r.reworkQty || 0) > 0 ? "#f97316" : "inherit" }}>{r.reworkQty || 0}</td>
                                            <td style={getTraceColStyle("Inspected By")}>{r.inspBy}</td>
                                            <td style={getTraceColStyle("Routecard Details")} className="qa2-mono qa2-muted">{r.routecardDetails}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="13" style={{ textAlign: "center", padding: "3rem", color: "#9ca3af", fontSize: "0.9rem" }}>
                                        No traceability records found for the selected period
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Management Insights ── */}
            <div className="qa2-card qa2-animate qa2-d4 qa2-card-premium">
                <SectionHead icon={Lightbulb} iconColor="#eab308" title="Management Quality Insights"
                    badge={`${activePriorityActions.length} Action Points`} badgeCls="qa2-badge-red" />
                {insightsLoading ? (
                    <div className="qa2-insights-grid qa2-pulse-loader" style={{ padding: "1.5rem" }}>
                        <div className="qa2-insights-col">
                            {[1, 2, 3].map(i => (
                                <div className="qa2-skeleton-row" key={i} style={{ marginBottom: "16px" }}>
                                    <div className="qa2-skeleton qa2-shimmer qa2-skeleton-circle" style={{ width: "20px", height: "20px" }} />
                                    <div className="qa2-skeleton qa2-shimmer" style={{ flex: 1, height: "13px" }} />
                                </div>
                            ))}
                        </div>
                        <div className="qa2-insights-col">
                            <div className="qa2-skeleton-row" style={{ marginBottom: "16px" }}>
                                <div className="qa2-skeleton qa2-shimmer qa2-skeleton-circle" style={{ width: "20px", height: "20px" }} />
                                <div className="qa2-skeleton qa2-shimmer" style={{ flex: 1, height: "13px" }} />
                            </div>
                            <div className="qa2-skeleton qa2-shimmer" style={{ width: "100%", height: "70px", borderRadius: "10px" }} />
                        </div>
                    </div>
                ) : (
                    <div className="qa2-insights-grid">
                        {/* ── Left column: Alerts & Warnings ── */}
                        <div className="qa2-insights-col qa2-insights-left">
                            {activeInsightsLeft.length === 0 ? (
                                <div style={{ padding: "2rem 1.25rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
                                        <CheckCircle size={28} style={{ color: '#10b981', strokeWidth: 1.5 }} />
                                    </div>
                                    No critical alerts for this period
                                </div>
                            ) : activeInsightsLeft.map((ins, i) => {
                                const IconComponent = InsightIconMap[ins.iconKey] || AlertCircle;
                                return (
                                    <div className="qa2-insight-row" key={i}
                                        style={{ borderLeft: `3px solid ${ins.valColor || "transparent"}` }}>
                                        <span className="qa2-insight-icon" style={{ display: 'flex', alignItems: 'center' }}>
                                            <IconComponent size={16} style={{ color: ins.valColor }} />
                                        </span>
                                        <div className="qa2-insight-body">
                                            <div className="qa2-insight-title">{ins.title}</div>
                                            <div className="qa2-insight-sub">{ins.sub}</div>
                                        </div>
                                        <div className="qa2-insight-val" style={{
                                            color: ins.valColor,
                                            background: `${ins.valColor}18`,
                                            padding: "0.18rem 0.52rem",
                                            borderRadius: "6px",
                                            fontSize: "0.68rem",
                                            fontWeight: 700,
                                            whiteSpace: "nowrap"
                                        }}>{ins.val}</div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Right column: Positive Insights + Priority Actions ── */}
                        <div className="qa2-insights-col">
                            {activeInsightsRight.length === 0 ? (
                                <div style={{ padding: "2rem 1.25rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                                    No summary data available
                                </div>
                            ) : activeInsightsRight.map((ins, i) => {
                                const IconComponent = InsightIconMap[ins.iconKey] || CheckCircle;
                                const cleanVal = ins.val ? ins.val.replace(/^[↑↓\s]+/, "") : "";
                                const hasUp = ins.val && ins.val.includes("↑");
                                const hasDown = ins.val && ins.val.includes("↓");

                                return (
                                    <div className="qa2-insight-row" key={i}
                                        style={{ borderLeft: `3px solid ${ins.valColor || "transparent"}` }}>
                                        <span className="qa2-insight-icon" style={{ display: 'flex', alignItems: 'center' }}>
                                            <IconComponent size={16} style={{ color: ins.valColor }} />
                                        </span>
                                        <div className="qa2-insight-body">
                                            <div className="qa2-insight-title">{ins.title}</div>
                                            <div className="qa2-insight-sub">{ins.sub}</div>
                                        </div>
                                        <div className="qa2-insight-val" style={{
                                            color: ins.valColor,
                                            background: `${ins.valColor}18`,
                                            padding: "0.18rem 0.52rem",
                                            borderRadius: "6px",
                                            fontSize: "0.68rem",
                                            fontWeight: 700,
                                            whiteSpace: "nowrap",
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '2px'
                                        }}>
                                            {hasUp && <ArrowUpRight size={10} style={{ strokeWidth: 3 }} />}
                                            {hasDown && <ArrowDownRight size={10} style={{ strokeWidth: 3 }} />}
                                            <span>{cleanVal}</span>
                                        </div>
                                    </div>
                                );
                            })}

                            {activePriorityActions.length > 0 && (
                                <div className="qa2-priority-box">
                                    <div className="qa2-priority-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Pin size={15} style={{ transform: 'rotate(-45deg)', fill: '#fff', color: '#fff' }} />
                                        <span>Priority Actions for Management</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginTop: "10px" }}>
                                        {activePriorityActions.map((action, idx) => {
                                            const cleanAction = action.replace(/^\d+[\)\.]\s*/, "");
                                            return (
                                                <div key={idx} style={{ display: "flex", gap: "7px", fontSize: "0.8rem", color: "#374151", lineHeight: "1.5" }}>
                                                    <span style={{
                                                        color: "#fff",
                                                        background: "#ef4444",
                                                        fontWeight: "700",
                                                        fontSize: "0.62rem",
                                                        borderRadius: "4px",
                                                        padding: "0.1rem 0.32rem",
                                                        flexShrink: 0,
                                                        marginTop: "2px",
                                                        lineHeight: "1.6"
                                                    }}>{idx + 1}</span>
                                                    <span>
                                                        {cleanAction.split(/(Paint-Seal Cast|Hardness Tester #HT-01|Segment Carrier)/g).map((part, pIdx) => {
                                                            if (["Paint-Seal Cast", "Hardness Tester #HT-01", "Segment Carrier"].includes(part)) {
                                                                return <strong key={pIdx} style={{ color: "#1f2937" }}>{part}</strong>;
                                                            }
                                                            return part;
                                                        })}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}