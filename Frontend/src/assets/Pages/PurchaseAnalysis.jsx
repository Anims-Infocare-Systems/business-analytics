import { useEffect, useMemo, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { resolveApiBase } from "../../apiBase";
import "./PurchaseAnalysis.css";
import PurchaseAnalysisDatePicker from "./PurchaseAnalysisDatePicker";
import ChartDataLabels from "chartjs-plugin-datalabels";
import {
    ShoppingCart,
    Factory,
    CheckCircle2,
    Clock,
    Package,
    Settings,
    TrendingUp,
    FolderOpen,
    Workflow,
    Trophy,
    ClipboardList,
    AlertTriangle,
    Pin,
    RefreshCw,
    AlertCircle,
    ChevronDown,
    Search,
    X,
    RotateCcw,
    FileEdit
} from "lucide-react";

Chart.register(...registerables, ChartDataLabels);

const API_BASE = resolveApiBase();

// ─────────────────────────────────────────────
//  Static Data
// ─────────────────────────────────────────────
const KPI_CARDS = [
    { icon: "🛒", label: "Total PO Value", value: "₹24.99L", raw: 2499, sub: "Jan – Feb 2026", trend: "↑ 8.3% vs last period", cls: "pa2-trend-up" },
    { icon: "🏭", label: "Active Suppliers", value: "6", raw: 6, sub: "14 orders placed", trend: "4 Raw Material", cls: "pa2-trend-neutral" },
    { icon: "✅", label: "GRN Received", value: "₹19.2L", raw: 1920, sub: "76.8% of PO value", trend: "On track", cls: "pa2-trend-up" },
    { icon: "⏳", label: "GRN Done", value: "₹5.8L", raw: 580, sub: "3 POs awaiting receipt", trend: "2 overdue", cls: "pa2-trend-down" },
    { icon: "📦", label: "Avg Lead Time", value: "17 days", raw: 17, sub: "Across all suppliers", trend: "+2d vs target", cls: "pa2-trend-down" },
];

const SUPPLIER_RANKING = [
    { name: "Musk Metals Pvt Ltd", barW: 100, amount: "₹38.56L", pct: "42%", color: "#2d6de8" },
    { name: "Ammarun Foundries", barW: 72, amount: "₹27.80L", pct: "30%", color: "#10b981" },
    { name: "Ansari CNC Centre", barW: 48, amount: "₹18.30L", pct: "20%", color: "#f5a623" },
    { name: "Aquasub Engineering", barW: 11, amount: "₹3.91L", pct: "4%", color: "#ef4444" },
    { name: "Sri Vinayaga Enterprises", barW: 5, amount: "₹1.60L", pct: "2%", color: "#8b5cf6" },
    { name: "Vishal DTP", barW: 3, amount: "₹0.93L", pct: "1%", color: "#94a3b8" },
];

const PO_ROWS = [
    { po: "P251568", date: "01/01/2026", supBg: "#64748b", supInit: "VD", supName: "Vishal DTP", partNo: "GNC0013", desc: "Letter Pad", ordQty: "5", rcvQty: "5", rate: "415.00", amount: "2,075.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251568", date: "01/01/2026", supBg: "#64748b", supInit: "VD", supName: "Vishal DTP", partNo: "PDC0012", desc: "Record Note – WIP Tag", ordQty: "3,000", rcvQty: "3,000", rate: "0.65", amount: "1,950.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251568", date: "01/01/2026", supBg: "#64748b", supInit: "VD", supName: "Vishal DTP", partNo: "PDC0015", desc: "Record Note – Final Inspection Tag", ordQty: "2,000", rcvQty: "2,000", rate: "0.65", amount: "1,300.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251569", date: "01/01/2026", supBg: "#8b5cf6", supInit: "SV", supName: "Sri Vinayaga", partNo: "PKM0012", desc: 'VCI Cover 8"×8"', ordQty: "100", rcvQty: "100", rate: "320.00", amount: "32,000.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251569", date: "01/01/2026", supBg: "#8b5cf6", supInit: "SV", supName: "Sri Vinayaga", partNo: "PKM0013", desc: 'VCI Cover 10"×12"', ordQty: "25", rcvQty: "25", rate: "320.00", amount: "8,000.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251570", date: "01/01/2026", supBg: "#2d6de8", supInit: "MM", supName: "Musk Metals", partNo: "RRD03-05050-00", desc: "Round Rod DIA 50MM AISI410", ordQty: "390", rcvQty: "390", rate: "92.00", amount: "5,52,946.68", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251570", date: "01/01/2026", supBg: "#2d6de8", supInit: "MM", supName: "Musk Metals", partNo: "RRD03-06060-00", desc: "Round Rod DIA 60MM AISI410", ordQty: "366", rcvQty: "366", rate: "92.00", amount: "7,47,518.40", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251570", date: "01/01/2026", supBg: "#2d6de8", supInit: "MM", supName: "Musk Metals", partNo: "RRD03-06565-00", desc: "Round Rod DIA 65MM AISI410", ordQty: "325", rcvQty: "0", rate: "92.00", amount: "7,79,406.29", status: "Overdue", tagCls: "pa2-tag-overdue", overdueRcv: true },
    { po: "P251570", date: "01/01/2026", supBg: "#2d6de8", supInit: "MM", supName: "Musk Metals", partNo: "RRD03-04545-00", desc: "Round Rod DIA 45MM AISI410", ordQty: "79", rcvQty: "79", rate: "92.00", amount: "92,667.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251570", date: "01/01/2026", supBg: "#2d6de8", supInit: "MM", supName: "Musk Metals", partNo: "RRD03-07070-00", desc: "Round Rod DIA 70MM AISI410", ordQty: "240", rcvQty: "240", rate: "92.00", amount: "6,80,792.64", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251571", date: "01/01/2026", supBg: "#f97316", supInit: "AQ", supName: "Aquasub Engg", partNo: "PDC0017", desc: "Paint-Seal Red Oxide Primer", ordQty: "40", rcvQty: "40", rate: "189.00", amount: "7,560.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251571", date: "01/01/2026", supBg: "#f97316", supInit: "AQ", supName: "Aquasub Engg", partNo: "PDC0018", desc: "Thinner GP 015 (RAS)", ordQty: "30", rcvQty: "30", rate: "145.00", amount: "4,350.00", status: "Closed", tagCls: "pa2-tag-closed" },
    { po: "P251572", date: "01/01/2026", supBg: "#ef4444", supInit: "AC", supName: "Ansari CNC", partNo: "PDCT0165", desc: "Insert CCMT 09T304 HM WT6430 Carbide", ordQty: "100", rcvQty: "100", rate: "110.00", amount: "11,000.00", status: "Closed", tagCls: "pa2-tag-closed" },
];

const GRN_ROWS = [
    { dotColor: "#ef4444", name: "Round Rod DIA 65MM AISI410", code: "P251570 · RRD03-06565-00 · Musk Metals Pvt Ltd", daysCls: "pa2-days-over", daysLbl: "+7 days", qty: "325 Nos" },
    { dotColor: "#f5a623", name: "Bottom Bearing Housing BEH04×1", code: "P251574 · Ammarun Foundries · Balance Lot", daysCls: "pa2-days-warn", daysLbl: "+3 days", qty: "1,200 Nos" },
    { dotColor: "#10b981", name: "Record Note – WIP Tag", code: "P251568 · Vishal DTP · PDC0012", daysCls: "pa2-days-ok", daysLbl: "On Time", qty: "3,000 Nos" },
    { dotColor: "#10b981", name: "Paint-Seal Red Oxide Primer", code: "P251571 · Aquasub Engineering · PDC0017", daysCls: "pa2-days-ok", daysLbl: "Received", qty: "40 Ltrs" },
    { dotColor: "#10b981", name: "Insert CCMT 09T304 Carbide", code: "P251572 · Ansari CNC Centre · PDCT0165", daysCls: "pa2-days-ok", daysLbl: "Received", qty: "100 Nos" },
];

const ALERTS = [
    { icon: "🔴", title: "Round Rod DIA 65MM — 325 Nos undelivered", sub: "P251570 · Musk Metals · Production impact risk", time: "7d overdue", urgency: "high" },
    { icon: "🟠", title: "Bottom Bearing GRN balance pending", sub: "P251574 · Ammarun Foundries · ₹8.2L balance to receive", time: "3d open", urgency: "medium" },
    { icon: "🟡", title: 'VCI Cover 8"×8" — DC not confirmed in system', sub: "P251569 · Sri Vinayaga Enterprises · DC update pending", time: "Today", urgency: "low" },
    { icon: "🔵", title: "Musk Metals rate variance — approval needed", sub: "₹92/kg vs last PO ₹88/kg (+4.5%) — review and approve", time: "Auto-flag", urgency: "info" },
];

const TREND_DATA = {
    labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"],
    datasets: [
        {
            label: "PO Value (₹ L)",
            data: [2.1, 3.5, 5.8, 7.2, 6.4, 4.1, 3.0, 2.8],
            backgroundColor: "rgba(45,109,232,0.18)",
            borderColor: "#2d6de8",
            borderWidth: 2,
            borderRadius: 6,
            type: "bar",
        },
        {
            label: "GRN Received (₹ L)",
            data: [1.8, 3.0, 5.2, 6.5, 5.8, 3.6, 2.5, 0.8],
            borderColor: "#10b981",
            backgroundColor: "rgba(16,185,129,0.08)",
            borderWidth: 2.5,
            tension: 0.45,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: "#10b981",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            type: "line",
        },
    ],
};

const SUPPLIER_DONUT = {
    labels: ["Musk Metals", "Ammarun Foundries", "Ansari CNC", "Aquasub Engg", "Sri Vinayaga", "Vishal DTP"],
    datasets: [{ data: [42, 30, 20, 4, 2, 1], backgroundColor: ["#2d6de8", "#10b981", "#f5a623", "#ef4444", "#8b5cf6", "#94a3b8"], borderColor: "#fff", borderWidth: 2.5 }],
};

const CATEGORY_DONUT = {
    labels: ["Raw Material", "Castings", "Tooling/Inserts", "Packing", "Consumables"],
    datasets: [{ data: [42, 30, 20, 5, 3], backgroundColor: ["#1a54d4", "#2d6de8", "#f5a623", "#8b5cf6", "#94a3b8"], borderColor: "#fff", borderWidth: 2.5 }],
};

// ─────────────────────────────────────────────
//  Sub-Components
// ─────────────────────────────────────────────
function StatPill({ value, label, color }) {
    return (
        <div className="pa2-stat-pill" style={{ "--pill-color": color }}>
            <span className="pa2-stat-val">{value}</span>
            <span className="pa2-stat-lbl">{label}</span>
        </div>
    );
}

function SectionHeader({ icon, title, badge, badgeCls }) {
    return (
        <div className="pa2-section-head">
            <span className="pa2-section-icon" style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
            <span className="pa2-section-title">{title}</span>
            {badge && <span className={`pa2-badge ${badgeCls || ""}`}>{badge}</span>}
        </div>
    );
}

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

export default function PurchaseAnalysis() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const toIso = d => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    const _dflt = { from: startOfMonth, to: endOfMonth };
    const _saved = readFilterSession("ba_filter_purchase", _dflt);
    const [dateRange, setDateRange] = useState({ from: _saved.from, to: _saved.to });
    const [filters, setFilters] = useState({
        fromDate: toIso(startOfMonth), toDate: toIso(endOfMonth),
        poType: "All Types", supplier: "All Suppliers",
        department: "Production", status: "All Status",
    });
    const [animated, setAnimated] = useState(false);
    const [poTypes, setPoTypes] = useState(["All Types"]);
    const [poRows, setPoRows] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [poSummary, setPoSummary] = useState(null);
    const [poLoading, setPoLoading] = useState(false);
    const [weeklyTrend, setWeeklyTrend] = useState(null);

    const filteredPoRows = useMemo(() => {
        return poRows.filter(r => {
            const q = searchQuery.toLowerCase().trim();
            if (q) {
                const match = (r.po_number && r.po_number.toLowerCase().includes(q)) ||
                    (r.po_type && r.po_type.toLowerCase().includes(q)) ||
                    (r.vendor_name && r.vendor_name.toLowerCase().includes(q)) ||
                    (r.material_code && r.material_code.toLowerCase().includes(q)) ||
                    (r.material && r.material.toLowerCase().includes(q));
                if (!match) return false;
            }
            if (filters.supplier && filters.supplier !== "All Suppliers") {
                if ((r.vendor_name || "").toLowerCase() !== filters.supplier.toLowerCase()) return false;
            }
            if (filters.department && filters.department !== "All Departments" && filters.department !== "Production") {
                const d = r.department || r.dept;
                if ((d || "").toLowerCase() !== filters.department.toLowerCase()) return false;
            }
            if (filters.status && filters.status !== "All Status") {
                const isGrn = !!r.grn_no;
                if (filters.status === "GRN Done" && !isGrn) return false;
                if (filters.status === "GRN Pending" && isGrn) return false;
            }
            return true;
        });
    }, [poRows, searchQuery, filters.supplier, filters.department, filters.status]);

    const suppliersList = useMemo(() => {
        const set = new Set();
        poRows.forEach(r => {
            if (r.vendor_name) set.add(r.vendor_name);
        });
        return ["All Suppliers", ...Array.from(set).sort()];
    }, [poRows]);

    const departmentsList = useMemo(() => {
        const set = new Set();
        poRows.forEach(r => {
            const d = r.department || r.dept;
            if (d) set.add(d);
        });
        return ["All Departments", ...Array.from(set).sort()];
    }, [poRows]);

    const rmStockVal = useMemo(() => {
        const rawSum = filteredPoRows
            .filter(r => {
                const t = (r.po_type || "").toLowerCase();
                return t.includes("raw") || t.includes("rm");
            })
            .reduce((acc, r) => acc + Number(r.value || 0), 0) / 100000;
        const val = rawSum > 0 ? rawSum * 0.18 : 48.65;
        return `₹${val.toFixed(2)}L`;
    }, [filteredPoRows]);

    const storeStockVal = useMemo(() => {
        const storeSum = filteredPoRows
            .filter(r => {
                const t = (r.po_type || "").toLowerCase();
                return !(t.includes("raw") || t.includes("rm"));
            })
            .reduce((acc, r) => acc + Number(r.value || 0), 0) / 100000;
        const val = storeSum > 0 ? storeSum * 0.14 : 18.30;
        return `₹${val.toFixed(2)}L`;
    }, [filteredPoRows]);

    const shortCloseData = useMemo(() => [
        { sno: 1, poNo: "PO-2026-0045", poDate: "05-Jan-2026", supplier: "Musk Metals Pvt Ltd", partDesc: "P-1002-39 (Impeller Casting)", uom: "Nos", qty: 120, reason: "Vendor unable to supply due to raw material shortage" },
        { sno: 2, poNo: "PO-2026-0049", poDate: "08-Jan-2026", supplier: "Ammarun Foundries", partDesc: "P-1002-40 (Shaft Pin)", uom: "Kgs", qty: 450, reason: "Order balance quantity cancelled by user request" },
        { sno: 3, poNo: "PO-2026-0052", poDate: "12-Jan-2026", supplier: "Ansari CNC Centre", partDesc: "P-8094-11 (Metallic Impeller)", uom: "Nos", qty: 35, reason: "Price dispute resolved via short closing remainder" },
        { sno: 4, poNo: "PO-2026-0058", poDate: "15-Jan-2026", supplier: "Balaji Tooling Systems", partDesc: "P-4509-02 (Adapter Ring)", uom: "Nos", qty: 80, reason: "Defective trial lot, balance cancelled" },
        { sno: 5, poNo: "PO-2026-0063", poDate: "19-Jan-2026", supplier: "Karthik Enterprises", partDesc: "P-3321-77 (Bearing Housing)", uom: "Nos", qty: 15, reason: "Alternate sourcing arranged due to delays" }
    ], []);

    const priceTrendData = useMemo(() => [
        { sno: 1, partDesc: "P-1002-39 (Impeller Casting)", month: "Feb 2026", rate: 250, pct: 4.2, diff: 10, type: "up" },
        { sno: 2, partDesc: "P-1002-40 (Shaft Pin)", month: "Feb 2026", rate: 180, pct: -2.7, diff: -5, type: "down" },
        { sno: 3, partDesc: "P-8094-11 (Metallic Impeller)", month: "Jan 2026", rate: 450, pct: 0.0, diff: 0, type: "flat" },
        { sno: 4, partDesc: "P-4509-02 (Adapter Ring)", month: "Feb 2026", rate: 320, pct: 8.5, diff: 25, type: "up" },
        { sno: 5, partDesc: "P-3321-77 (Bearing Housing)", month: "Feb 2026", rate: 980, pct: -1.5, diff: -15, type: "down" }
    ], []);

    const [traceSearch, setTraceSearch] = useState("");

    const traceabilityData = useMemo(() => [
        {
            sno: 1,
            indNo: "IND-2026-0041",
            indDt: "05-Jan-2026",
            indQty: 500,
            indPoNo: "PO-2026-0075",
            poDt: "10-Jan-2026",
            poQty: 500,
            poRate: 250,
            poValue: 125000,
            grnNo: "GRN-2026-0081",
            grnDt: "15-Jan-2026",
            grnOky: 495,
            grnRate: 250,
            grnValue: 123750,
            routeCardNo: "RC-2026-9041",
            routeCardDt: "20-Jan-2026",
            routeCardQty: 490,
            partNo: "P-1002-39 (Impeller Casting)"
        },
        {
            sno: 2,
            indNo: "IND-2026-0042",
            indDt: "08-Jan-2026",
            indQty: 1000,
            indPoNo: "PO-2026-0079",
            poDt: "12-Jan-2026",
            poQty: 1000,
            poRate: 180,
            poValue: 180000,
            grnNo: "GRN-2026-0089",
            grnDt: "18-Jan-2026",
            grnOky: 1000,
            grnRate: 180,
            grnValue: 180000,
            routeCardNo: "RC-2026-9042",
            routeCardDt: "22-Jan-2026",
            routeCardQty: 995,
            partNo: "P-1002-40 (Shaft Pin)"
        },
        {
            sno: 3,
            indNo: "IND-2026-0043",
            indDt: "12-Jan-2026",
            indQty: 350,
            indPoNo: "PO-2026-0082",
            poDt: "16-Jan-2026",
            poQty: 350,
            poRate: 450,
            poValue: 157500,
            grnNo: "GRN-2026-0095",
            grnDt: "22-Jan-2026",
            grnOky: 350,
            grnRate: 450,
            grnValue: 157500,
            routeCardNo: "RC-2026-9043",
            routeCardDt: "25-Jan-2026",
            routeCardQty: 348,
            partNo: "P-8094-11 (Metallic Impeller)"
        },
        {
            sno: 4,
            indNo: "IND-2026-0044",
            indDt: "15-Jan-2026",
            indQty: 800,
            indPoNo: "PO-2026-0084",
            poDt: "19-Jan-2026",
            poQty: 800,
            poRate: 320,
            poValue: 256000,
            grnNo: "GRN-2026-0102",
            grnDt: "26-Jan-2026",
            grnOky: 790,
            grnRate: 320,
            grnValue: 252800,
            routeCardNo: "RC-2026-9044",
            routeCardDt: "30-Jan-2026",
            routeCardQty: 785,
            partNo: "P-4509-02 (Adapter Ring)"
        },
        {
            sno: 5,
            indNo: "IND-2026-0045",
            indDt: "19-Jan-2026",
            indQty: 250,
            indPoNo: "PO-2026-0088",
            poDt: "23-Jan-2026",
            poQty: 250,
            poRate: 980,
            poValue: 245000,
            grnNo: "GRN-2026-0110",
            grnDt: "29-Jan-2026",
            grnOky: 250,
            grnRate: 980,
            grnValue: 245000,
            routeCardNo: "RC-2026-9045",
            routeCardDt: "04-Feb-2026",
            routeCardQty: 248,
            partNo: "P-3321-77 (Bearing Housing)"
        }
    ], []);

    const filteredTraceData = useMemo(() => {
        return traceabilityData.filter(row => {
            if (!traceSearch) return true;
            const q = traceSearch.toLowerCase();
            return (
                (row.partNo || "").toLowerCase().includes(q) ||
                (row.routeCardNo || "").toLowerCase().includes(q) ||
                (row.indNo || "").toLowerCase().includes(q) ||
                (row.indPoNo || "").toLowerCase().includes(q) ||
                (row.grnNo || "").toLowerCase().includes(q)
            );
        });
    }, [traceabilityData, traceSearch]);

    const [summaryData, setSummaryData] = useState(null);
    const [supplierRatingData, setSupplierRatingData] = useState(null);
    const [supplierRatingLoading, setSupplierRatingLoading] = useState(false);

    // Modern Individual Panel Loading States
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [trendLoading, setTrendLoading] = useState(false);
    const [chartsLoading, setChartsLoading] = useState(false);

    const trendRef = useRef(null);
    const supRef = useRef(null);
    const catRef = useRef(null);
    const ratingRef = useRef(null);
    const trendChart = useRef(null);
    const supChart = useRef(null);
    const catChart = useRef(null);
    const ratingChart = useRef(null);
    const [monthlyTab, setMonthlyTab] = useState("combined");
    const monthlyChartRef = useRef(null);
    const monthlyChart = useRef(null);
    const poVsGrnChartRef = useRef(null);
    const poVsGrnChartInst = useRef(null);
    const deptChartRef = useRef(null);
    const deptChartInst = useRef(null);

    // Custom PO Type dropdown state
    const [poDropdownOpen, setPoDropdownOpen] = useState(false);
    const poDropdownRef = useRef(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    useEffect(() => {
        if (!poDropdownOpen) {
            setFocusedIndex(-1);
        } else {
            const idx = poTypes.indexOf(filters.poType);
            setFocusedIndex(idx >= 0 ? idx : 0);
        }
    }, [poDropdownOpen, poTypes, filters.poType]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (poDropdownRef.current && !poDropdownRef.current.contains(event.target)) {
                setPoDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 80);
        return () => clearTimeout(t);
    }, []);

    // ✅ Persist date range to sessionStorage on every change
    useEffect(() => {
        writeFilterSession("ba_filter_purchase", { from: dateRange.from, to: dateRange.to });
    }, [dateRange.from, dateRange.to]);

    // ── Fetch live PO types from POMas ──────────────────────
    useEffect(() => {
        fetch(`${API_BASE}/purchase-analysis/po-types/`, { credentials: "include" })
            .then(r => r.json())
            .then(data => {
                if (data?.po_types?.length) setPoTypes(data.po_types);
            })
            .catch(() => { }); // keep hardcoded fallback on error
    }, []);

    // ── Fetch PO table rows + pipeline summary ─────────────────
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        const toIso = d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };
        const params = new URLSearchParams({
            from: toIso(dateRange.from),
            to: toIso(dateRange.to),
        });
        if (filters.poType && filters.poType !== "All Types") {
            params.set("dtype", filters.poType);
        }
        const ctrl = new AbortController();
        setPoLoading(true);
        fetch(`${API_BASE}/purchase-analysis/po-table/?${params}`, {
            credentials: "include",
            signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => {
                setPoRows(data?.rows ?? []);
                setPoSummary(data?.summary ?? null);
                setPoLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setPoLoading(false);
            });
        return () => ctrl.abort();
    }, [dateRange.from, dateRange.to, filters.poType]);

    // ── Fetch charts data (donuts + supplier ranking) ─────────────
    const [chartsData, setChartsData] = useState(null);
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        const toIso = d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };
        const params = new URLSearchParams({
            from: toIso(dateRange.from),
            to: toIso(dateRange.to),
        });
        if (filters.poType && filters.poType !== "All Types") {
            params.set("dtype", filters.poType);
        }
        const ctrl = new AbortController();
        setChartsLoading(true);
        fetch(`${API_BASE}/purchase-analysis/charts/?${params}`, {
            credentials: "include",
            signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => {
                if (!data.error) setChartsData(data);
                setChartsLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setChartsLoading(false);
            });
        return () => ctrl.abort();
    }, [dateRange.from, dateRange.to, filters.poType]);

    // ── Redraw donut charts (supplier + category) ─────────────────
    useEffect(() => {
        if (!supRef.current || !catRef.current) return;
        supChart.current?.destroy();
        catChart.current?.destroy();

        const donutOpts = {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: window.devicePixelRatio || 2,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        font: { size: 8, family: "Poppins", weight: 500 },
                        padding: 5,
                        boxWidth: 8
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.raw}%`
                    }
                },
                datalabels: { display: false }
            },
            cutout: "64%",
        };

        const ranking = chartsData?.supplier_ranking ?? [];
        const supLabels = ranking.map(x => x.name.replace("Pvt Ltd", "").replace("Enterprises", "").trim());
        const supVals = ranking.map(x => x.spend_lakhs);
        const catLabels = chartsData?.category_labels ?? [];
        const catVals = chartsData?.category_data ?? [];

        const supColors = ["#2d6de8", "#10b981", "#f5a623", "#ef4444", "#8b5cf6", "#94a3b8", "#a855f7", "#ec4899"];
        const catColors = ["#1a54d4", "#2d6de8", "#f5a623", "#8b5cf6", "#94a3b8", "#10b981", "#ef4444", "#6366f1"];

        supChart.current = new Chart(supRef.current, {
            type: "bar",
            data: {
                labels: supLabels.length ? supLabels : ["No Data"],
                datasets: [{
                    label: "Purchase Value (L)",
                    data: supVals.length ? supVals : [0],
                    backgroundColor: supVals.length ? supLabels.map((_, i) => supColors[i % supColors.length] + "22") : ["#e2e8f0"],
                    borderColor: supVals.length ? supLabels.map((_, i) => supColors[i % supColors.length]) : ["#cbd5e1"],
                    borderWidth: 1.5,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y",
                devicePixelRatio: window.devicePixelRatio || 2,
                animation: {
                    duration: 1200,
                    easing: "easeOutQuart"
                },
                layout: { padding: { right: 35 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "rgba(15,23,42,0.9)",
                        padding: 10,
                        cornerRadius: 6,
                        callbacks: {
                            label: ctx => ` Purchase Value: ₹${ctx.parsed.x.toFixed(2)}L`
                        }
                    },
                    datalabels: {
                        display: true,
                        anchor: "end",
                        align: "right",
                        offset: 4,
                        formatter: (v) => (v > 0 ? `₹${v.toFixed(1)}L` : ""),
                        font: { size: 9.5, weight: "700", family: "Poppins" },
                        color: "#1e293b"
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: "rgba(26,84,212,0.06)", drawTicks: false },
                        ticks: {
                            font: { size: 9, family: "Poppins" },
                            color: "#5a6a9a",
                            callback: v => `₹${v}L`
                        },
                        border: { display: false }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 9, family: "Poppins", weight: 600 },
                            color: "#1a2a5e"
                        },
                        border: { display: false }
                    }
                }
            }
        });

        catChart.current = new Chart(catRef.current, {
            type: "doughnut",
            data: {
                labels: catLabels.length ? catLabels : ["No Data"],
                datasets: [{
                    data: catVals.length ? catVals : [100],
                    backgroundColor: catVals.length ? catColors.slice(0, catLabels.length) : ["#e2e8f0"],
                    borderColor: "#fff",
                    borderWidth: 2.5
                }]
            },
            options: donutOpts
        });

        return () => {
            supChart.current?.destroy();
            catChart.current?.destroy();
        };
    }, [chartsData]);

    // ── Fetch weekly trend + redraw chart ─────────────────────────
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        const toIso = d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };
        const params = new URLSearchParams({ from: toIso(dateRange.from), to: toIso(dateRange.to) });
        if (filters.poType && filters.poType !== "All Types") params.set("dtype", filters.poType);
        const ctrl = new AbortController();
        setTrendLoading(true);
        fetch(`${API_BASE}/purchase-analysis/weekly-trend/?${params}`, {
            credentials: "include", signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => {
                if (!data.error) setWeeklyTrend(data);
                setTrendLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setTrendLoading(false);
            });
        return () => ctrl.abort();
    }, [dateRange.from, dateRange.to, filters.poType]);

    // ── Fetch summary metrics (KPI cards & strip) ────────────────
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        const toIso = d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };
        const params = new URLSearchParams({ from: toIso(dateRange.from), to: toIso(dateRange.to) });
        if (filters.poType && filters.poType !== "All Types") params.set("dtype", filters.poType);
        const ctrl = new AbortController();
        setSummaryLoading(true);
        fetch(`${API_BASE}/purchase-analysis/summary/?${params}`, {
            credentials: "include", signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => {
                if (!data.error) setSummaryData(data);
                setSummaryLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setSummaryLoading(false);
            });
        return () => ctrl.abort();
    }, [dateRange.from, dateRange.to, filters.poType]);

    // ── Fetch Supplier Rating ───────────────────
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        const toIso = d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };
        const params = new URLSearchParams({ from: toIso(dateRange.from), to: toIso(dateRange.to) });
        const ctrl = new AbortController();
        setSupplierRatingLoading(true);
        fetch(`${API_BASE}/purchase/supplier-rating/?${params}`, {
            credentials: "include", signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => {
                if (!data.error) setSupplierRatingData(data);
                setSupplierRatingLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setSupplierRatingLoading(false);
            });
        return () => ctrl.abort();
    }, [dateRange.from, dateRange.to]);

    // ── Redraw Supplier Rating chart whenever supplierRatingData changes ──
    useEffect(() => {
        if (!ratingRef.current) return;
        ratingChart.current?.destroy();
        const labels = supplierRatingData?.labels ?? [];
        const scores = supplierRatingData?.data ?? [];

        const getRatingColor = (val) => val >= 90 ? "#10b981" : val >= 75 ? "#2d6de8" : val >= 60 ? "#f5a623" : "#ef4444";

        ratingChart.current = new Chart(ratingRef.current, {
            type: "bar",
            data: {
                labels: labels.length ? labels : ["No Data"],
                datasets: [{
                    label: "Supplier Score",
                    data: scores.length ? scores : [0],
                    backgroundColor: scores.length ? scores.map(v => getRatingColor(v)) : ["#cbd5e1"],
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: window.devicePixelRatio || 2,
                indexAxis: "y",
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` Score: ${ctx.parsed.x} / 100`
                        }
                    },
                    datalabels: { display: false }
                },
                scales: {
                    x: {
                        min: 0,
                        max: 100,
                        grid: { color: "rgba(26,84,212,0.06)" },
                        ticks: { font: { size: 9, family: "Poppins" }, color: "#5a6a9a" }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 9, family: "Poppins", weight: 600 }, color: "#1a2a5e" }
                    }
                }
            }
        });
        return () => ratingChart.current?.destroy();
    }, [supplierRatingData]);

    // ── Redraw trend chart whenever weeklyTrend changes ─────────────
    useEffect(() => {
        if (!trendRef.current) return;
        trendChart.current?.destroy();
        const labels = weeklyTrend?.labels ?? [];
        const poVals = weeklyTrend?.po_value ?? [];
        const grnVals = weeklyTrend?.grn_received ?? [];
        const fmtL = v => `₹${Number(v).toFixed(2)}L`;
        const maxVal = Math.max(0, ...poVals, ...grnVals);
        // Extra 35% headroom so datalabels never clip at the top
        const yMax = maxVal > 0 ? Math.ceil(maxVal * 1.35 * 10) / 10 : undefined;

        trendChart.current = new Chart(trendRef.current, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "PO Value (L)",
                        data: poVals,
                        backgroundColor: "rgba(45,109,232,0.18)",
                        borderColor: "#2d6de8",
                        borderWidth: 2,
                        borderRadius: 6,
                        type: "bar",
                        yAxisID: "y",
                        datalabels: {
                            display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0.5,
                            align: "bottom",
                            anchor: "end",
                            formatter: (v) => `₹${v.toFixed(1)}L`,
                            font: { size: 9.5, weight: "800", family: "Poppins" },
                            color: "#ffffff",
                            backgroundColor: "#2d6de8",
                            borderColor: "#1d4ed8",
                            borderWidth: 1,
                            borderRadius: 4,
                            padding: { top: 2, bottom: 2, left: 5, right: 5 },
                            offset: 4
                        }
                    },
                    {
                        label: "GRN Received (L)",
                        data: grnVals,
                        borderColor: "#10b981",
                        backgroundColor: "rgba(16,185,129,0.10)",
                        borderWidth: 2.5,
                        tension: 0.42,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: "#10b981",
                        pointBorderColor: "#fff",
                        pointBorderWidth: 2,
                        type: "line",
                        yAxisID: "y",
                        datalabels: {
                            display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0.5,
                            align: "top",
                            anchor: "end",
                            formatter: (v) => `₹${v.toFixed(1)}L`,
                            font: { size: 9.5, weight: "800", family: "Poppins" },
                            color: "#ffffff",
                            backgroundColor: "#10b981",
                            borderColor: "#047857",
                            borderWidth: 1,
                            borderRadius: 4,
                            padding: { top: 2, bottom: 2, left: 5, right: 5 },
                            offset: 6
                        }
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: window.devicePixelRatio || 2,
                layout: { padding: { top: 32, right: 12, left: 8, bottom: 0 } },
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: {
                        labels: {
                            font: { size: 11, weight: "600", family: "Poppins" },
                            boxWidth: 14,
                            padding: 18,
                            usePointStyle: true,
                        },
                    },
                    tooltip: {
                        backgroundColor: "rgba(15,23,42,0.9)",
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 11, weight: "700", family: "Poppins" },
                        bodyFont: { size: 11, family: "Poppins" },
                        callbacks: {
                            label: ctx => `  ${ctx.dataset.label}: ${fmtL(ctx.parsed.y ?? 0)}`,
                        },
                    },
                    datalabels: { display: false }, // per-dataset overrides above
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: yMax,
                        grid: { color: "rgba(26,84,212,0.07)", drawTicks: false },
                        ticks: {
                            font: { size: 10, family: "Poppins" },
                            color: "#5a6a9a",
                            padding: 6,
                            callback: v => `₹${v}L`,
                        },
                        border: { dash: [4, 4], color: "transparent" },
                        title: { display: true, text: "Lakhs (₹)", font: { size: 9 }, color: "#94a3b8" },
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10, family: "Poppins" }, color: "#5a6a9a", maxRotation: 45 },
                        border: { color: "rgba(26,84,212,0.10)" },
                    },
                },
            },
        });
        return () => trendChart.current?.destroy();
    }, [weeklyTrend]);

    const monthlyData = useMemo(() => {
        const groups = {};
        filteredPoRows.forEach(r => {
            if (!r.po_date) return;
            let monthKey = "Other";
            try {
                const parts = r.po_date.split("-");
                if (parts.length === 3) {
                    const year = parts[0];
                    const monthNum = parseInt(parts[1], 10);
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    monthKey = `${months[monthNum - 1]} ${year}`;
                } else {
                    const slashParts = r.po_date.split("/");
                    if (slashParts.length === 3) {
                        const year = slashParts[2];
                        const monthNum = parseInt(slashParts[1], 10);
                        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        monthKey = `${months[monthNum - 1]} ${year}`;
                    }
                }
            } catch (e) {
                monthKey = "Other";
            }

            if (monthKey === "Other") return;

            if (!groups[monthKey]) {
                groups[monthKey] = { month: monthKey, poValue: 0, rawMaterial: 0, storeMaterial: 0 };
            }

            const valLakhs = Number(r.value || 0) / 100000;
            groups[monthKey].poValue += valLakhs;

            const matType = r.po_type?.toLowerCase() || "";
            if (matType.includes("raw") || matType.includes("rm")) {
                groups[monthKey].rawMaterial += valLakhs;
            } else {
                groups[monthKey].storeMaterial += valLakhs;
            }
        });

        const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return Object.values(groups).sort((a, b) => {
            const getOrderScore = (mKey) => {
                const p = mKey.split(" ");
                if (p.length !== 2) return 0;
                const mIdx = monthOrder.indexOf(p[0]);
                const yVal = parseInt(p[1], 10);
                return yVal * 12 + mIdx;
            };
            return getOrderScore(a.month) - getOrderScore(b.month);
        });
    }, [filteredPoRows]);

    const finalMonthlyData = useMemo(() => {
        if (monthlyData.length > 0) {
            return monthlyData.map(item => {
                const srvSum = filteredPoRows
                    .filter(r => {
                        const typeLower = (r.po_type || "").toLowerCase();
                        const isSrv = typeLower.includes("service") || typeLower.includes("srv") || typeLower.includes("se");
                        if (!isSrv) return false;

                        let mKey = "";
                        try {
                            const parts = r.po_date.split("-");
                            if (parts.length === 3) {
                                mKey = `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(parts[1], 10) - 1]} ${parts[0]}`;
                            } else {
                                const slashParts = r.po_date.split("/");
                                if (slashParts.length === 3) {
                                    mKey = `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(slashParts[1], 10) - 1]} ${slashParts[2]}`;
                                }
                            }
                        } catch (e) { }
                        return mKey === item.month;
                    })
                    .reduce((acc, r) => acc + Number(r.value || 0), 0) / 100000;

                const grnSum = filteredPoRows
                    .filter(r => {
                        if (!r.grn_no) return false;
                        let mKey = "";
                        try {
                            const parts = r.po_date.split("-");
                            if (parts.length === 3) {
                                mKey = `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(parts[1], 10) - 1]} ${parts[0]}`;
                            } else {
                                const slashParts = r.po_date.split("/");
                                if (slashParts.length === 3) {
                                    mKey = `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(slashParts[1], 10) - 1]} ${slashParts[2]}`;
                                }
                            }
                        } catch (e) { }
                        return mKey === item.month;
                    })
                    .reduce((acc, r) => acc + Number(r.value || 0), 0) / 100000;

                return {
                    ...item,
                    serviceMaterial: srvSum,
                    grnValue: grnSum || item.poValue * 0.82
                };
            });
        }
        return [
            { month: "Jan 2026", poValue: 124.5, rawMaterial: 90.2, storeMaterial: 34.3, serviceMaterial: 0, grnValue: 98.4 },
            { month: "Feb 2026", poValue: 156.2, rawMaterial: 110.5, storeMaterial: 45.7, serviceMaterial: 0, grnValue: 122.1 },
            { month: "Mar 2026", poValue: 189.4, rawMaterial: 135.0, storeMaterial: 54.4, serviceMaterial: 0, grnValue: 145.2 },
            { month: "Apr 2026", poValue: 142.1, rawMaterial: 102.3, storeMaterial: 39.8, serviceMaterial: 0, grnValue: 110.8 },
            { month: "May 2026", poValue: 210.5, rawMaterial: 152.0, storeMaterial: 58.5, serviceMaterial: 0, grnValue: 165.4 },
            { month: "Jun 2026", poValue: 175.8, rawMaterial: 125.4, storeMaterial: 50.4, serviceMaterial: 0, grnValue: 130.2 },
            { month: "Jul 2026", poValue: 198.3, rawMaterial: 144.1, storeMaterial: 54.2, serviceMaterial: 0, grnValue: 150.5 }
        ];
    }, [monthlyData, filteredPoRows]);

    const topProducts = useMemo(() => {
        const rawMap = {};
        const storeMap = {};
        const serviceMap = {};

        filteredPoRows.forEach(r => {
            const val = Number(r.value || 0);
            const name = r.material || "Unknown Product";
            const code = r.material_code || "";
            const typeLower = (r.po_type || "").toLowerCase();

            let targetMap = storeMap;
            if (typeLower.includes("raw") || typeLower.includes("rm")) {
                targetMap = rawMap;
            } else if (typeLower.includes("service") || typeLower.includes("srv") || typeLower.includes("se")) {
                targetMap = serviceMap;
            }

            if (!targetMap[name]) {
                targetMap[name] = { name, code, totalValue: 0, qty: 0 };
            }
            targetMap[name].totalValue += val;
            targetMap[name].qty += Number(r.qty || 0);
        });

        const getSortedTop5 = (map) => {
            return Object.values(map)
                .sort((a, b) => b.totalValue - a.totalValue)
                .slice(0, 5);
        };

        return {
            raw: getSortedTop5(rawMap),
            store: getSortedTop5(storeMap),
            service: getSortedTop5(serviceMap)
        };
    }, [filteredPoRows]);

    const finalTopProducts = useMemo(() => {
        const raw = topProducts.raw.length ? topProducts.raw : [
            { name: "Round Rod DIA 50MM AISI410", code: "RRD03-05050", totalValue: 1240000, qty: 1200 },
            { name: "Round Rod DIA 65MM AISI410", code: "RRD03-06565", totalValue: 980000, qty: 850 },
            { name: "HR Steel Plate 12mm", code: "HRPL-12MM", totalValue: 650000, qty: 450 },
            { name: "Aluminum Alloy Block 6061", code: "AL-6061-B", totalValue: 420000, qty: 200 },
            { name: "Stainless Steel Sheet 2mm", code: "SSPL-2MM", totalValue: 310000, qty: 150 }
        ];
        const store = topProducts.store.length ? topProducts.store : [
            { name: "Insert CCMT 09T304 Carbide", code: "PDCT0165", totalValue: 240000, qty: 1500 },
            { name: "Industrial VCI Cover 8x8", code: "PKM0012", totalValue: 180000, qty: 4000 },
            { name: "High-Temp Bearing HTB-202", code: "BRG-HTB202", totalValue: 120000, qty: 300 },
            { name: "Paint-Seal Red Oxide Primer", code: "PDC0017", totalValue: 80000, qty: 450 },
            { name: "GP Thinner 015", code: "PDC0018", totalValue: 50000, qty: 350 }
        ];
        const service = topProducts.service;
        return { raw, store, service };
    }, [topProducts]);

    const deptData = useMemo(() => {
        const groups = {};
        filteredPoRows.forEach(r => {
            const val = Number(r.value || 0) / 100000;
            let dept = r.department || r.dept;
            if (!dept) {
                const matLower = (r.material || "").toLowerCase();
                if (matLower.includes("ccmt") || matLower.includes("carbide") || matLower.includes("insert") || matLower.includes("tool")) {
                    dept = "Tool Room";
                } else if (matLower.includes("rod") || matLower.includes("plate") || matLower.includes("steel") || matLower.includes("metal") || matLower.includes("sheet")) {
                    dept = "Production";
                } else if (matLower.includes("paint") || matLower.includes("primer") || matLower.includes("thinner")) {
                    dept = "Stores & Painting";
                } else if (matLower.includes("laptop") || matLower.includes("printer") || matLower.includes("copier") || matLower.includes("cover")) {
                    dept = "IT & Admin";
                } else {
                    dept = "Maintenance";
                }
            }
            if (!groups[dept]) groups[dept] = 0;
            groups[dept] += val;
        });

        let list = Object.entries(groups).map(([name, value]) => ({ name, value }));
        if (list.length === 0) {
            list = [
                { name: "Production", value: 12.45 },
                { name: "Tool Room", value: 5.80 },
                { name: "Maintenance", value: 4.22 },
                { name: "Stores & Painting", value: 2.10 },
                { name: "IT & Admin", value: 0.55 }
            ];
        }
        return list.sort((a, b) => b.value - a.value);
    }, [filteredPoRows]);

    useEffect(() => {
        if (!monthlyChartRef.current) return;
        monthlyChart.current?.destroy();

        const labels = finalMonthlyData.map(x => x.month);
        const totalVals = finalMonthlyData.map(x => x.poValue);
        const rawVals = finalMonthlyData.map(x => x.rawMaterial);
        const storeVals = finalMonthlyData.map(x => x.storeMaterial);

        let datasets = [];

        if (monthlyTab === "combined") {
            datasets = [
                {
                    label: "Raw Material (L)",
                    data: rawVals,
                    backgroundColor: "rgba(45, 109, 232, 0.78)",
                    borderColor: "#2d6de8",
                    borderWidth: 1.5,
                    borderRadius: 4,
                    type: "bar",
                    stack: "mat",
                    datalabels: {
                        display: true,
                        anchor: "center",
                        align: "center",
                        formatter: (v) => (v > 5 ? `₹${v.toFixed(0)}L` : ""),
                        font: { size: 9, weight: "700", family: "Poppins" },
                        color: "#ffffff"
                    }
                },
                {
                    label: "Store Material (L)",
                    data: storeVals,
                    backgroundColor: "rgba(245, 166, 35, 0.78)",
                    borderColor: "#f5a623",
                    borderWidth: 1.5,
                    borderRadius: 4,
                    type: "bar",
                    stack: "mat",
                    datalabels: {
                        display: true,
                        anchor: "center",
                        align: "center",
                        formatter: (v) => (v > 5 ? `₹${v.toFixed(0)}L` : ""),
                        font: { size: 9, weight: "700", family: "Poppins" },
                        color: "#ffffff"
                    }
                },
                {
                    label: "Total Purchase (L)",
                    data: totalVals,
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16, 185, 129, 0.04)",
                    borderWidth: 3,
                    type: "line",
                    tension: 0.4,
                    fill: false,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: "#10b981",
                    pointBorderColor: "#fff",
                    pointBorderWidth: 2.5,
                    datalabels: {
                        display: true,
                        anchor: "end",
                        align: "top",
                        offset: 6,
                        formatter: (v) => (v > 0 ? `₹${v.toFixed(1)}L` : ""),
                        font: { size: 10, weight: "800", family: "Poppins" },
                        color: "#10b981",
                        backgroundColor: "#ffffff",
                        borderRadius: 4,
                        padding: 4,
                        borderWidth: 1,
                        borderColor: "#10b981"
                    }
                }
            ];
        } else if (monthlyTab === "trend") {
            datasets = [
                {
                    label: "Total Purchase Value (L)",
                    data: totalVals,
                    backgroundColor: "rgba(45, 109, 232, 0.18)",
                    borderColor: "#2d6de8",
                    borderWidth: 2,
                    borderRadius: 6,
                    type: "bar",
                    datalabels: {
                        display: true,
                        anchor: "end",
                        align: "top",
                        offset: 4,
                        formatter: (v) => (v > 0 ? `₹${v.toFixed(1)}L` : ""),
                        font: { size: 10, weight: "800", family: "Poppins" },
                        color: "#ffffff",
                        backgroundColor: "#2d6de8",
                        borderRadius: 5,
                        padding: { top: 4, bottom: 4, left: 8, right: 8 }
                    }
                }
            ];
        } else {
            datasets = [
                {
                    label: "Raw Material (L)",
                    data: rawVals,
                    backgroundColor: "rgba(45, 109, 232, 0.78)",
                    borderColor: "#2d6de8",
                    borderWidth: 1.5,
                    borderRadius: 5,
                    type: "bar",
                    datalabels: {
                        display: true,
                        anchor: "end",
                        align: "top",
                        offset: 2,
                        formatter: (v) => (v > 0 ? `₹${v.toFixed(1)}L` : ""),
                        font: { size: 9.5, weight: "750", family: "Poppins" },
                        color: "#2d6de8"
                    }
                },
                {
                    label: "Store Material (L)",
                    data: storeVals,
                    backgroundColor: "rgba(245, 166, 35, 0.78)",
                    borderColor: "#f5a623",
                    borderWidth: 1.5,
                    borderRadius: 5,
                    type: "bar",
                    datalabels: {
                        display: true,
                        anchor: "end",
                        align: "top",
                        offset: 2,
                        formatter: (v) => (v > 0 ? `₹${v.toFixed(1)}L` : ""),
                        font: { size: 9.5, weight: "750", family: "Poppins" },
                        color: "#f5a623"
                    }
                }
            ];
        }

        const maxVal = Math.max(0, ...totalVals);
        const yMax = maxVal > 0 ? Math.ceil(maxVal * 1.35 * 10) / 10 : undefined;

        monthlyChart.current = new Chart(monthlyChartRef.current, {
            type: "bar",
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: window.devicePixelRatio || 2,
                animation: {
                    duration: 1000,
                    easing: "easeOutQuart"
                },
                layout: { padding: { top: 25, right: 15, left: 10, bottom: 0 } },
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            font: { size: 10.5, weight: "600", family: "Poppins" },
                            boxWidth: 12,
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 11, weight: "700", family: "Poppins" },
                        bodyFont: { size: 11, family: "Poppins" }
                    },
                    datalabels: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: yMax,
                        stacked: monthlyTab === "combined",
                        grid: { color: "rgba(26,84,212,0.07)", drawTicks: false },
                        ticks: {
                            font: { size: 9.5, family: "Poppins" },
                            color: "#5a6a9a",
                            padding: 6,
                            callback: v => `₹${v}L`
                        },
                        border: { dash: [4, 4], color: "transparent" },
                        title: { display: true, text: "Lakhs (₹)", font: { size: 9 }, color: "#94a3b8" }
                    },
                    x: {
                        stacked: monthlyTab === "combined",
                        grid: { display: false },
                        ticks: { font: { size: 9.5, family: "Poppins" }, color: "#5a6a9a" },
                        border: { color: "rgba(26,84,212,0.10)" }
                    }
                }
            }
        });

        return () => monthlyChart.current?.destroy();
    }, [finalMonthlyData, monthlyTab]);

    useEffect(() => {
        if (!poVsGrnChartRef.current || !deptChartRef.current) return;

        poVsGrnChartInst.current?.destroy();
        deptChartInst.current?.destroy();

        const months = finalMonthlyData.map(x => x.month);
        const poValues = finalMonthlyData.map(x => x.poValue);
        const grnValues = finalMonthlyData.map(x => x.grnValue || 0);

        poVsGrnChartInst.current = new Chart(poVsGrnChartRef.current, {
            type: "bar",
            data: {
                labels: months,
                datasets: [
                    {
                        label: "PO Value (L)",
                        data: poValues,
                        backgroundColor: "rgba(45, 109, 232, 0.8)",
                        borderColor: "#2d6de8",
                        borderWidth: 1.5,
                        borderRadius: 4,
                        barPercentage: 0.8,
                        categoryPercentage: 0.7
                    },
                    {
                        label: "GRN Value (L)",
                        data: grnValues,
                        backgroundColor: "rgba(16, 185, 129, 0.8)",
                        borderColor: "#10b981",
                        borderWidth: 1.5,
                        borderRadius: 4,
                        barPercentage: 0.8,
                        categoryPercentage: 0.7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: window.devicePixelRatio || 2,
                animation: {
                    duration: 1000,
                    easing: "easeOutQuart"
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            font: { size: 10, weight: "600", family: "Poppins" },
                            boxWidth: 12,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        padding: 10,
                        cornerRadius: 6,
                        titleFont: { size: 11, weight: "700", family: "Poppins" },
                        bodyFont: { size: 10.5, family: "Poppins" }
                    },
                    datalabels: {
                        display: true,
                        anchor: "end",
                        align: "top",
                        offset: 1,
                        formatter: (v) => (v > 2 ? `₹${v.toFixed(0)}L` : ""),
                        font: { size: 8.5, weight: "700", family: "Poppins" },
                        color: (context) => context.dataset.borderColor
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: "rgba(226, 232, 240, 0.4)", drawTicks: false },
                        ticks: {
                            font: { size: 9.5, weight: "500", family: "Poppins" },
                            color: "#64748b"
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 9.5, weight: "600", family: "Poppins" },
                            color: "#64748b"
                        }
                    }
                }
            }
        });

        const deptNames = deptData.map(x => x.name);
        const deptValues = deptData.map(x => x.value);

        deptChartInst.current = new Chart(deptChartRef.current, {
            type: "doughnut",
            data: {
                labels: deptNames,
                datasets: [
                    {
                        data: deptValues,
                        backgroundColor: [
                            "rgba(45, 109, 232, 0.8)",
                            "rgba(139, 92, 246, 0.8)",
                            "rgba(245, 166, 35, 0.8)",
                            "rgba(16, 185, 129, 0.8)",
                            "rgba(239, 68, 68, 0.8)"
                        ],
                        borderColor: [
                            "#2d6de8",
                            "#8b5cf6",
                            "#f5a623",
                            "#10b981",
                            "#ef4444"
                        ],
                        borderWidth: 1.5,
                        hoverOffset: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: window.devicePixelRatio || 2,
                cutout: "65%",
                animation: {
                    duration: 1200,
                    easing: "easeOutElastic"
                },
                plugins: {
                    legend: {
                        position: "right",
                        labels: {
                            font: { size: 10, weight: "600", family: "Poppins" },
                            boxWidth: 10,
                            padding: 12,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        padding: 10,
                        cornerRadius: 6,
                        callbacks: {
                            label: (context) => {
                                const val = context.raw;
                                return ` ₹${val.toFixed(2)}L`;
                            }
                        },
                        titleFont: { size: 11, weight: "700", family: "Poppins" },
                        bodyFont: { size: 11, family: "Poppins" }
                    },
                    datalabels: {
                        display: true,
                        color: "#fff",
                        font: { size: 9, weight: "700", family: "Poppins" },
                        formatter: (val, ctx) => {
                            const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = sum > 0 ? ((val / sum) * 100).toFixed(0) : 0;
                            return pct > 5 ? `${pct}%` : "";
                        }
                    }
                }
            }
        });

        return () => {
            poVsGrnChartInst.current?.destroy();
            deptChartInst.current?.destroy();
        };
    }, [finalMonthlyData, deptData]);

    const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));
    const resetFilters = () => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setDateRange({ from: startOfMonth, to: endOfMonth });
        setSearchQuery("");
        setFilters({
            fromDate: toIso(startOfMonth), toDate: toIso(endOfMonth),
            poType: "All Types", supplier: "All Suppliers",
            department: "Production", status: "All Status"
        });
    };

    const isGlobalLoading = poLoading || supplierRatingLoading || summaryLoading || trendLoading || chartsLoading;

    const getKpiIcon = (label) => {
        switch (label) {
            case "Total PO Value":
                return <ShoppingCart size={20} style={{ color: "#2d6de8" }} />;
            case "Active Suppliers":
                return <Factory size={20} style={{ color: "#06b6d4" }} />;
            case "GRN Received":
                return <CheckCircle2 size={20} style={{ color: "#10b981" }} />;
            case "GRN Done":
                return <Clock size={20} style={{ color: "#f5a623" }} />;
            case "Avg Lead Time":
                return <Package size={20} style={{ color: "#f97316" }} />;
            case "Tot Amnd PO Count":
                return <FileEdit size={20} style={{ color: "#8b5cf6" }} />;
            case "RM Stock Value":
                return <Package size={20} style={{ color: "#3b82f6" }} />;
            case "Store Stock Value":
                return <Settings size={20} style={{ color: "#ec4899" }} />;
            default:
                return <Package size={20} style={{ color: "#64748b" }} />;
        }
    };

    const renderAlertIcon = (urgency) => {
        switch (urgency) {
            case "high":
                return <AlertCircle size={16} style={{ color: "#ef4444" }} />;
            case "medium":
                return <AlertCircle size={16} style={{ color: "#f5a623" }} />;
            case "low":
                return <AlertCircle size={16} style={{ color: "#fbbf24" }} />;
            case "info":
            default:
                return <AlertCircle size={16} style={{ color: "#2d6de8" }} />;
        }
    };

    return (
        <div className={`pa2-root ${animated ? "pa2-root--visible" : ""}`}>
            {/* ── Global YouTube-Style Loading Top Bar ── */}
            <div className={`pa2-global-progress-bar ${isGlobalLoading ? "pa2-global-progress-bar--active" : ""}`} />

            {/* ── Page Hero ── */}
            <div className="pa2-page-hero">
                {/* Optional Hero Pills and Titles if needed */}
            </div>

            {/* ── Filters ── */}
            <div className={`pa2-card pa2-filter-card pa2-animate pa2-delay-1 ${isGlobalLoading ? "pa2-filter-card--loading" : ""}`}>
                <div className="pa2-filter-bar-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Settings className="pa2-pulse-loader" size={16} style={{ color: "#2d6de8" }} /> Report Filters
                </div>
                <div className="pa2-filter-grid">
                    <div className="pa2-filter-group">
                        <label className="pa2-filter-label">Date Range</label>
                        <PurchaseAnalysisDatePicker
                            from={dateRange.from}
                            to={dateRange.to}
                            onChange={({ from, to }) => setDateRange({ from, to })}
                        />
                    </div>
                    <div className="pa2-filter-group">
                        <label className="pa2-filter-label">Search POs</label>
                        <div className="pa2-search-wrapper">
                            <Search className="pa2-search-icon-inside" size={14} />
                            <input
                                type="text"
                                className="pa2-search-input"
                                placeholder="Search PO, Vendor, Material..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ paddingRight: searchQuery ? "2rem" : "0.85rem" }}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className="pa2-search-clear-btn"
                                    onClick={() => setSearchQuery("")}
                                    style={{
                                        position: "absolute",
                                        right: "10px",
                                        background: "transparent",
                                        border: "none",
                                        color: "#94a3b8",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: "4px",
                                        outline: "none"
                                    }}
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="pa2-filter-group" ref={poDropdownRef}>
                        <label className="pa2-filter-label">PO Type</label>
                        <div className={`pa2-custom-select${poDropdownOpen ? " pa2-active" : ""}`}>
                            <button
                                type="button"
                                className="pa2-custom-select-trigger"
                                onClick={() => setPoDropdownOpen(!poDropdownOpen)}
                                onKeyDown={(e) => {
                                    if (e.key === "ArrowDown") {
                                        e.preventDefault();
                                        if (!poDropdownOpen) {
                                            setPoDropdownOpen(true);
                                            setFocusedIndex(0);
                                        } else {
                                            setFocusedIndex((prev) => (prev + 1) % poTypes.length);
                                        }
                                    } else if (e.key === "ArrowUp") {
                                        e.preventDefault();
                                        if (!poDropdownOpen) {
                                            setPoDropdownOpen(true);
                                            setFocusedIndex(poTypes.length - 1);
                                        } else {
                                            setFocusedIndex((prev) => (prev - 1 + poTypes.length) % poTypes.length);
                                        }
                                    } else if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (poDropdownOpen) {
                                            if (focusedIndex >= 0 && focusedIndex < poTypes.length) {
                                                setF("poType", poTypes[focusedIndex]);
                                                setPoDropdownOpen(false);
                                            }
                                        } else {
                                            setPoDropdownOpen(true);
                                        }
                                    } else if (e.key === "Escape") {
                                        setPoDropdownOpen(false);
                                    }
                                }}
                            >
                                <span>{filters.poType || "All Types"}</span>
                                <span className="pa2-custom-select-arrow">
                                    <ChevronDown size={14} />
                                </span>
                            </button>
                            {poDropdownOpen && (
                                <ul className="pa2-custom-select-options">
                                    {poTypes.map((opt, idx) => (
                                        <li
                                            key={opt}
                                            className={`pa2-custom-select-option${filters.poType === opt ? " pa2-selected" : ""}${focusedIndex === idx ? " pa2-focused" : ""}`}
                                            onClick={() => {
                                                setF("poType", opt);
                                                setPoDropdownOpen(false);
                                            }}
                                            onMouseEnter={() => setFocusedIndex(idx)}
                                        >
                                            {opt}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    <div className="pa2-filter-group" style={{ minWidth: "180px" }}>
                        <label className="pa2-filter-label">Supplier</label>
                        <select className="pa2-filter-select" value={filters.supplier} onChange={e => setF("supplier", e.target.value)}>
                            {suppliersList.map(o => <option key={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="pa2-filter-group">
                        <label className="pa2-filter-label">Department</label>
                        <select className="pa2-filter-select" value={filters.department} onChange={e => setF("department", e.target.value)}>
                            {departmentsList.map(o => <option key={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="pa2-filter-group">
                        <label className="pa2-filter-label">Status</label>
                        <select className="pa2-filter-select" value={filters.status} onChange={e => setF("status", e.target.value)}>
                            {["All Status", "GRN Done", "GRN Pending"].map(o => <option key={o}>{o}</option>)}
                        </select>
                    </div>
                    {/* Reset Filters */}
                    <button
                        type="button"
                        className="pa2-btn-reset"
                        onClick={resetFilters}
                    >
                        <RotateCcw className="pa2-btn-reset-icon" size={14} />
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* ── Summary Strip ── */}
            {summaryLoading ? (
                <div className="pa2-summary-strip-skeleton pa2-pulse-loader">
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <div className="pa2-strip-item" key={i} style={{ minWidth: "90px" }}>
                            <div className="pa2-skeleton pa2-shimmer pa2-skeleton-text" style={{ width: "60px", height: "8px" }} />
                            <div className="pa2-skeleton pa2-shimmer pa2-skeleton-text" style={{ width: "80px", height: "16px", marginTop: "5px" }} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="pa2-summary-strip pa2-animate pa2-delay-2">
                    {[
                        { label: "Period", val: summaryData ? summaryData.period : "—", cls: "" },
                        { label: "Total PO Value", val: summaryData ? `₹${summaryData.total_po_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—", cls: "pa2-blue" },
                        { label: "Total POs", val: summaryData ? String(summaryData.total_pos) : "—", cls: "pa2-blue" },
                        { label: "Active Suppliers", val: summaryData ? String(summaryData.active_suppliers) : "—", cls: "pa2-blue" },
                        { label: "GRN Compliance", val: summaryData ? `${summaryData.grn_compliance_pct.toFixed(1)}%` : "—", cls: "pa2-green" },
                        { label: "GRN Value", val: summaryData ? `₹${summaryData.grn_received.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—", cls: "pa2-orange" },
                        { label: "Overdue POs", val: poSummary ? String(poSummary.grn_pending) : "—", cls: "pa2-red" },
                    ].map((s, i) => (
                        <div className="pa2-strip-item" key={i}>
                            <div className="pa2-strip-label">{s.label}</div>
                            <div className={`pa2-strip-val ${s.cls}`}>{s.val}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── KPI Cards ── */}
            {summaryLoading ? (
                <div className="pa2-kpi-grid">
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <div className="pa2-kpi-card pa2-pulse-loader" key={i}>
                            <div className="pa2-kpi-top">
                                <span className="pa2-skeleton pa2-shimmer pa2-skeleton-circle" style={{ width: "24px", height: "24px" }} />
                                <span className="pa2-skeleton pa2-shimmer" style={{ width: "70px", height: "14px", borderRadius: "10px" }} />
                            </div>
                            <div className="pa2-skeleton pa2-shimmer pa2-skeleton-text" style={{ width: "65%", height: "22px", marginTop: "12px" }} />
                            <div className="pa2-skeleton pa2-shimmer pa2-skeleton-text" style={{ width: "45%", height: "10px", marginTop: "8px" }} />
                            <div className="pa2-skeleton pa2-shimmer pa2-skeleton-text" style={{ width: "75%", height: "8px", marginTop: "4px" }} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="pa2-kpi-grid">
                    {[
                        {
                            label: "Total PO Value",
                            value: summaryData ? `₹${summaryData.total_po_value_lakhs.toFixed(2)}L` : "—",
                            sub: summaryData ? summaryData.period : "—",
                            trend: "Total PO Spend",
                            cls: "pa2-trend-neutral"
                        },
                        {
                            label: "GRN Received",
                            value: summaryData ? `₹${summaryData.grn_received_lakhs.toFixed(2)}L` : "—",
                            sub: summaryData ? `${summaryData.grn_compliance_pct.toFixed(1)}% compliance` : "—",
                            trend: "On track",
                            cls: "pa2-trend-up"
                        },
                        {
                            label: "GRN Done",
                            value: poSummary ? `${poSummary.grn_done} POs` : "—",
                            sub: poSummary ? `${poSummary.grn_pending} open/pending` : "—",
                            trend: "Completed POs",
                            cls: "pa2-trend-neutral"
                        },
                        {
                            label: "Avg Lead Time",
                            value: summaryData ? `${summaryData.avg_lead_time_days} days` : "—",
                            sub: "Across all suppliers",
                            trend: "PO to GRN",
                            cls: "pa2-trend-neutral"
                        },
                        {
                            label: "RM Stock Value",
                            value: rmStockVal,
                            sub: "85% utilization",
                            trend: "Stock Value",
                            cls: "pa2-trend-up"
                        },
                        {
                            label: "Store Stock Value",
                            value: storeStockVal,
                            sub: "Normal turnover",
                            trend: "Stock Value",
                            cls: "pa2-trend-neutral"
                        },
                        {
                            label: "Tot Amnd PO Count",
                            value: "8",
                            sub: "4 pending approvals",
                            trend: "Amended POs",
                            cls: "pa2-trend-down"
                        }
                    ].map((k, i) => (
                        <div className="pa2-kpi-card pa2-card-premium pa2-animate" style={{ animationDelay: `${0.1 + i * 0.07}s` }} key={i}>
                            <div className="pa2-kpi-top">
                                <span className="pa2-kpi-icon" style={{ display: "inline-flex", alignItems: "center" }}>{getKpiIcon(k.label)}</span>
                                <span className={`pa2-kpi-trend ${k.cls}`}>{k.trend}</span>
                            </div>
                            <div className="pa2-kpi-value">{k.value}</div>
                            <div className="pa2-kpi-label">{k.label}</div>
                            <div className="pa2-kpi-sub">{k.sub}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Weekly Trend Chart — Full Width Row ── */}
            <div className="pa2-animate pa2-delay-3" style={{ marginBottom: "1.4rem" }}>
                <div className="pa2-card pa2-card-premium">
                    <SectionHeader
                        icon={<TrendingUp size={16} style={{ color: "#2d6de8" }} />}
                        title="Purchase Value Trend — Weekly"
                        badge={weeklyTrend?.period ?? (filters.poType !== "All Types" ? filters.poType : "")}
                        badgeCls="pa2-badge-blue"
                    />
                    {trendLoading ? (
                        <div className="pa2-skeleton-chart pa2-pulse-loader" style={{ height: "280px" }}>
                            <div style={{ display: "flex", gap: "8px", height: "220px", alignItems: "flex-end", padding: "0 10px" }}>
                                {[30, 50, 40, 70, 55, 85, 60, 95, 75, 90, 45, 65, 80, 35, 55, 72].map((h, idx) => (
                                    <div key={idx} className="pa2-skeleton-chart-bar pa2-shimmer" style={{ height: `${h}%`, flex: 1 }} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="pa2-trend-chart-full-wrap">
                            <canvas ref={trendRef} />
                        </div>
                    )}
                    {/* Mini summary strip below chart */}
                    {!trendLoading && weeklyTrend && (() => {
                        const poVals = weeklyTrend?.po_value ?? [];
                        const grnVals = weeklyTrend?.grn_received ?? [];
                        const totalPO = poVals.reduce((a, b) => a + Number(b), 0);
                        const totalGRN = grnVals.reduce((a, b) => a + Number(b), 0);
                        const maxPO = Math.max(0, ...poVals);
                        const compliance = totalPO > 0 ? ((totalGRN / totalPO) * 100).toFixed(1) : 0;
                        return (
                            <div className="pa2-trend-summary-strip">
                                <div className="pa2-trend-stat">
                                    <span className="pa2-trend-stat-dot" style={{ background: "#2d6de8" }} />
                                    <div>
                                        <div className="pa2-trend-stat-label">Total PO Value</div>
                                        <div className="pa2-trend-stat-val" style={{ color: "#2d6de8" }}>₹{totalPO.toFixed(2)}L</div>
                                    </div>
                                </div>
                                <div className="pa2-trend-stat">
                                    <span className="pa2-trend-stat-dot" style={{ background: "#10b981" }} />
                                    <div>
                                        <div className="pa2-trend-stat-label">Total GRN Received</div>
                                        <div className="pa2-trend-stat-val" style={{ color: "#10b981" }}>₹{totalGRN.toFixed(2)}L</div>
                                    </div>
                                </div>
                                <div className="pa2-trend-stat">
                                    <span className="pa2-trend-stat-dot" style={{ background: "#f5a623" }} />
                                    <div>
                                        <div className="pa2-trend-stat-label">Peak Week Value</div>
                                        <div className="pa2-trend-stat-val" style={{ color: "#f5a623" }}>₹{maxPO.toFixed(2)}L</div>
                                    </div>
                                </div>
                                <div className="pa2-trend-stat">
                                    <span className="pa2-trend-stat-dot" style={{ background: compliance >= 80 ? "#10b981" : compliance >= 60 ? "#f5a623" : "#ef4444" }} />
                                    <div>
                                        <div className="pa2-trend-stat-label">GRN Compliance</div>
                                        <div className="pa2-trend-stat-val" style={{ color: compliance >= 80 ? "#10b981" : compliance >= 60 ? "#f5a623" : "#ef4444" }}>{compliance}%</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* ── Month-wise Purchase & Material Analysis (Full Width Row) ── */}
            <div className="pa2-animate pa2-delay-3" style={{ marginBottom: "1.4rem" }}>
                <div className="pa2-card pa2-card-premium">
                    <div className="pa2-table-header" style={{ marginBottom: "1rem" }}>
                        <SectionHeader
                            icon={<TrendingUp size={16} style={{ color: "#8b5cf6" }} />}
                            title="Month-wise Purchase & Material Split"
                            badge="Monthly Analytics"
                            badgeCls="pa2-badge-purple"
                        />
                        <div className="pa2-segmented-control">
                            {["Combined View", "Monthly Trend", "Material Split"].map((tabName, idx) => {
                                const tabKey = ["combined", "trend", "split"][idx];
                                return (
                                    <button
                                        key={tabKey}
                                        type="button"
                                        className={`pa2-segment-btn${monthlyTab === tabKey ? " active" : ""}`}
                                        onClick={() => setMonthlyTab(tabKey)}
                                    >
                                        {tabName}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {poLoading ? (
                        <div className="pa2-skeleton-chart pa2-pulse-loader" style={{ height: "280px" }}>
                            <div style={{ display: "flex", gap: "10px", height: "220px", alignItems: "flex-end", padding: "0 10px" }}>
                                {[40, 70, 55, 85, 60, 95, 75, 90].map((h, idx) => (
                                    <div key={idx} className="pa2-skeleton-chart-bar pa2-shimmer" style={{ height: `${h}%`, flex: 1 }} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="pa2-trend-chart-full-wrap" style={{ height: "300px" }}>
                            <canvas ref={monthlyChartRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Donut Charts Row ── */}
            <div className="pa2-donuts-row pa2-animate pa2-delay-3">
                <div className="pa2-card pa2-chart-card pa2-card-premium">
                    <SectionHeader icon={<Factory size={16} style={{ color: "#2d6de8" }} />} title="Supplier-wise Purchase Value" />
                    {chartsLoading ? (
                        <div className="pa2-skeleton-chart pa2-pulse-loader" style={{ height: "250px", display: "flex", flexDirection: "column", gap: "14px", justifyContent: "center", padding: "0 1.2rem" }}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <div className="pa2-skeleton pa2-shimmer" style={{ width: "70px", height: "12px" }} />
                                    <div className="pa2-skeleton pa2-shimmer" style={{ flex: 1, height: "16px", borderRadius: "4px" }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="pa2-chart-wrap pa2-chart-wrap--donut"><canvas ref={supRef} /></div>
                    )}
                </div>

                <div className="pa2-card pa2-chart-card pa2-card-premium">
                    <SectionHeader icon={<FolderOpen size={16} style={{ color: "#2d6de8" }} />} title="Spend by Category" />
                    {chartsLoading ? (
                        <div className="pa2-skeleton-chart pa2-pulse-loader" style={{ justifyContent: "center", alignItems: "center", height: "250px" }}>
                            <div className="pa2-skeleton pa2-shimmer pa2-skeleton-circle" style={{ width: "110px", height: "110px", border: "10px solid #f1f5f9" }} />
                        </div>
                    ) : (
                        <div className="pa2-chart-wrap pa2-chart-wrap--donut"><canvas ref={catRef} /></div>
                    )}
                </div>
            </div>

            {/* ── PO Vs GRN & Departmentwise Purchase Section ── */}
            <div className="pa2-donuts-row pa2-animate pa2-delay-3" style={{ marginBottom: "1.4rem" }}>
                {/* PO vs GRN Card */}
                <div className="pa2-card pa2-chart-card pa2-card-premium">
                    <SectionHeader
                        icon={<TrendingUp size={16} style={{ color: "#2d6de8" }} />}
                        title="PO Value vs GRN Value Trend"
                        badge="Received vs Ordered"
                        badgeCls="pa2-badge-blue"
                    />
                    {poLoading ? (
                        <div className="pa2-skeleton-chart pa2-pulse-loader" style={{ height: "250px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <div className="pa2-skeleton pa2-shimmer" style={{ width: "80%", height: "180px", borderRadius: "8px" }} />
                        </div>
                    ) : (
                        <div className="pa2-chart-wrap" style={{ height: "250px", padding: "10px" }}>
                            <canvas ref={poVsGrnChartRef} />
                        </div>
                    )}
                </div>

                {/* Department-wise Card */}
                <div className="pa2-card pa2-chart-card pa2-card-premium">
                    <SectionHeader
                        icon={<Workflow size={16} style={{ color: "#8b5cf6" }} />}
                        title="Department-wise Purchase Spend"
                        badge="Department Spend"
                        badgeCls="pa2-badge-purple"
                    />
                    {poLoading ? (
                        <div className="pa2-skeleton-chart pa2-pulse-loader" style={{ height: "250px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <div className="pa2-skeleton pa2-shimmer pa2-skeleton-circle" style={{ width: "110px", height: "110px", border: "10px solid #f1f5f9" }} />
                        </div>
                    ) : (
                        <div className="pa2-chart-wrap" style={{ height: "250px", padding: "10px" }}>
                            <canvas ref={deptChartRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Top 5 Buying Products Analysis ── */}
            <div className="pa2-card pa2-animate pa2-delay-4 pa2-card-premium" style={{ marginBottom: "1.4rem" }}>
                <SectionHeader icon={<Package size={16} style={{ color: "#f5a623" }} />} title="Top 5 Buying Products Analysis" />
                <div className="pa2-top-products-grid" style={{ marginTop: "1.2rem", gridTemplateColumns: `repeat(${finalTopProducts.service.length > 0 ? 3 : 2}, minmax(0, 1fr))` }}>
                    {/* Raw Materials Column */}
                    <div className="pa2-top-prod-col">
                        <div className="pa2-col-subtitle">
                            <span className="pa2-col-dot" style={{ background: "#2d6de8" }} />
                            Raw Material Top 5
                        </div>
                        <div className="pa2-prod-list">
                            {finalTopProducts.raw.map((p, idx) => {
                                const maxVal = finalTopProducts.raw[0]?.totalValue || 1;
                                const barW = (p.totalValue / maxVal) * 100;
                                return (
                                    <div className="pa2-prod-row" key={idx}>
                                        <div className="pa2-prod-rank">#{idx + 1}</div>
                                        <div className="pa2-prod-details">
                                            <div className="pa2-prod-name">{p.name}</div>
                                            <div className="pa2-prod-code">{p.code}</div>
                                            <div className="pa2-prod-bar-track">
                                                <div className="pa2-prod-bar-fill" style={{ width: `${barW}%`, background: "linear-gradient(90deg, #2d6de8, #06b6d4)" }} />
                                            </div>
                                        </div>
                                        <div className="pa2-prod-meta">
                                            <div className="pa2-prod-val">₹{(p.totalValue / 100000).toFixed(2)}L</div>
                                            <div className="pa2-prod-qty">{p.qty.toLocaleString("en-IN")} Qty</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Store Materials Column */}
                    <div className="pa2-top-prod-col">
                        <div className="pa2-col-subtitle">
                            <span className="pa2-col-dot" style={{ background: "#f5a623" }} />
                            Store Material Top 5
                        </div>
                        <div className="pa2-prod-list">
                            {finalTopProducts.store.map((p, idx) => {
                                const maxVal = finalTopProducts.store[0]?.totalValue || 1;
                                const barW = (p.totalValue / maxVal) * 100;
                                return (
                                    <div className="pa2-prod-row" key={idx}>
                                        <div className="pa2-prod-rank">#{idx + 1}</div>
                                        <div className="pa2-prod-details">
                                            <div className="pa2-prod-name">{p.name}</div>
                                            <div className="pa2-prod-code">{p.code}</div>
                                            <div className="pa2-prod-bar-track">
                                                <div className="pa2-prod-bar-fill" style={{ width: `${barW}%`, background: "linear-gradient(90deg, #f5a623, #f76b1c)" }} />
                                            </div>
                                        </div>
                                        <div className="pa2-prod-meta">
                                            <div className="pa2-prod-val">₹{(p.totalValue / 100000).toFixed(2)}L</div>
                                            <div className="pa2-prod-qty">{p.qty.toLocaleString("en-IN")} Qty</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Service Column */}
                    {finalTopProducts.service.length > 0 && (
                        <div className="pa2-top-prod-col">
                            <div className="pa2-col-subtitle">
                                <span className="pa2-col-dot" style={{ background: "#8b5cf6" }} />
                                Service Top 5
                            </div>
                            <div className="pa2-prod-list">
                                {finalTopProducts.service.map((p, idx) => {
                                    const maxVal = finalTopProducts.service[0]?.totalValue || 1;
                                    const barW = (p.totalValue / maxVal) * 100;
                                    return (
                                        <div className="pa2-prod-row" key={idx}>
                                            <div className="pa2-prod-rank">#{idx + 1}</div>
                                            <div className="pa2-prod-details">
                                                <div className="pa2-prod-name">{p.name}</div>
                                                <div className="pa2-prod-code">{p.code}</div>
                                                <div className="pa2-prod-bar-track">
                                                    <div className="pa2-prod-bar-fill" style={{ width: `${barW}%`, background: "linear-gradient(90deg, #8b5cf6, #a855f7)" }} />
                                                </div>
                                            </div>
                                            <div className="pa2-prod-meta">
                                                <div className="pa2-prod-val">₹{(p.totalValue / 100000).toFixed(2)}L</div>
                                                <div className="pa2-prod-qty">{p.qty.toLocaleString("en-IN")} Qty</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Pipeline + Supplier Ranking ── */}
            <div className="pa2-two-col pa2-animate pa2-delay-3">

                {/* PO Pipeline */}
                <div className="pa2-card pa2-card-premium">
                    <SectionHeader icon={<Workflow size={16} style={{ color: "#2d6de8" }} />} title="Purchase Order Pipeline"
                        badge={filters.poType !== "All Types" ? filters.poType : "All Types"}
                        badgeCls="pa2-badge-blue" />
                    {poLoading ? (
                        <div className="pa2-pipeline-body pa2-pulse-loader">
                            <div className="pa2-pipe-steps">
                                {[1, 2, 3, 4].map(i => (
                                    <div className="pa2-pipe-step" key={i}>
                                        <div className="pa2-skeleton pa2-shimmer pa2-skeleton-circle" style={{ width: "42px", height: "42px" }} />
                                        <div className="pa2-skeleton pa2-shimmer pa2-skeleton-text" style={{ width: "45px", height: "10px", marginTop: "6px" }} />
                                        <div className="pa2-skeleton pa2-shimmer pa2-skeleton-text" style={{ width: "30px", height: "8px" }} />
                                    </div>
                                ))}
                            </div>
                            <div className="pa2-skeleton pa2-shimmer" style={{ height: "8px", borderRadius: "4px", width: "100%", marginTop: "12px" }} />
                        </div>
                    ) : (
                        <div className="pa2-pipeline-body">
                            {/* ── 4 metric boxes ── */}
                            <div className="pa2-pipe-steps">
                                {(() => {
                                    const fmtL = v => v != null ? `₹${(v / 1e5).toFixed(2)}L` : "—";
                                    const sm = poSummary;
                                    return [
                                        { n: sm ? String(sm.total_pos) : "—", v: sm ? fmtL(sm.total_po_value) : "—", l: "Total PO Value", cls: "pa2-pipe-blue" },
                                        { n: sm ? String(sm.grn_done) : "—", v: sm ? `${sm.grn_done} POs` : "—", l: "GRN Done", cls: "pa2-pipe-cyan" },
                                        { n: sm ? String(sm.grn_pending) : "—", v: sm ? `${sm.grn_pending} POs` : "—", l: "GRN Pending", cls: "pa2-pipe-orange" },
                                        { n: "₹", v: sm ? fmtL(sm.total_grn_value) : "—", l: "Total GRN Value", cls: "pa2-pipe-green" },
                                    ].map((s, i) => (
                                        <div className="pa2-pipe-step" key={i}>
                                            <div className={`pa2-pipe-circle ${s.cls}`}>{s.n}</div>
                                            <div className="pa2-pipe-val">{s.v}</div>
                                            <div className="pa2-pipe-lbl">{s.l}</div>
                                            {i < 3 && <div className="pa2-pipe-arrow">›</div>}
                                        </div>
                                    ));
                                })()}
                            </div>

                            {/* ── Progress bar: GRN done vs pending ── */}
                            {(() => {
                                const total = poSummary?.total_pos || 0;
                                const donePct = total ? Math.round((poSummary.grn_done / total) * 100) : 0;
                                const pendPct = total ? Math.round((poSummary.grn_pending / total) * 100) : 0;
                                return (
                                    <div className="pa2-progress-bar-wrap">
                                        <div className="pa2-progress-track">
                                            <div className="pa2-progress-fill pa2-fill-blue" style={{ width: `${donePct}%` }} />
                                            <div className="pa2-progress-fill pa2-fill-orange" style={{ width: `${pendPct}%` }} />
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── Legend ── */}
                            <div className="pa2-pipe-legend">
                                {[
                                    ["#2d6de8", `GRN Done ${poSummary ? `${Math.round((poSummary.grn_done / (poSummary.total_pos || 1)) * 100)}%` : ""}`],
                                    ["#f5a623", `GRN Pending ${poSummary ? `${Math.round((poSummary.grn_pending / (poSummary.total_pos || 1)) * 100)}%` : ""}`],
                                ].map(([c, l]) => (
                                    <div className="pa2-leg-item" key={l}>
                                        <span className="pa2-leg-dot" style={{ background: c }} />{l}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Supplier Spend Ranking */}
                <div className="pa2-card pa2-card-premium">
                    <SectionHeader icon={<Trophy size={16} style={{ color: "#f5a623" }} />} title="Supplier Spend Ranking" badge="by PO value" badgeCls="pa2-badge-neutral" />
                    {chartsLoading ? (
                        <div className="pa2-sup-list pa2-pulse-loader" style={{ padding: "1rem" }}>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div className="pa2-skeleton-row" key={i} style={{ marginBottom: "12.5px" }}>
                                    <div className="pa2-skeleton pa2-shimmer" style={{ width: "20px", height: "13px" }} />
                                    <div className="pa2-skeleton pa2-shimmer" style={{ flex: 1, height: "13px" }} />
                                    <div className="pa2-skeleton pa2-shimmer" style={{ width: "70px", height: "6px", borderRadius: "3px" }} />
                                    <div className="pa2-skeleton pa2-shimmer" style={{ width: "45px", height: "13px" }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="pa2-sup-list">
                            {(() => {
                                const rankColors = ["#2d6de8", "#10b981", "#f5a623", "#ef4444", "#8b5cf6", "#94a3b8", "#a855f7", "#ec4899"];
                                const ranking = chartsData?.supplier_ranking ?? [];
                                if (!ranking.length) {
                                    return <div className="pa2-po-empty">— No spend records —</div>;
                                }
                                const maxPct = Math.max(...ranking.map(x => x.pct), 1);
                                return ranking.map((s, i) => {
                                    const barColor = rankColors[i % rankColors.length];
                                    const barW = (s.pct / maxPct) * 100;
                                    return (
                                        <div className="pa2-sup-row" key={i}>
                                            <div className="pa2-sup-rank">#{s.rank}</div>
                                            <div className="pa2-sup-name">{s.name}</div>
                                            <div className="pa2-sup-bar-track">
                                                <div
                                                    className="pa2-sup-bar-fill"
                                                    style={{ width: `${barW}%`, background: barColor }}
                                                />
                                            </div>
                                            <div className="pa2-sup-amount">₹{s.spend_lakhs.toFixed(2)}L</div>
                                            <div className="pa2-sup-pct" style={{ color: barColor }}>{s.pct}%</div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* ── PO Details Table (Dashboard2-style) ── */}
            <div className="pa2-card pa2-animate pa2-delay-4 pa2-card-premium">
                <div className="pa2-table-header">
                    <SectionHeader icon={<ClipboardList size={16} style={{ color: "#2d6de8" }} />} title="Purchase Order Details" />
                    <div className="pa2-tag-row">
                        <span className="pa2-badge pa2-badge-blue">{poLoading ? "Loading…" : `${filteredPoRows.length} records`}</span>
                    </div>
                </div>
                <div className="pa2-table-scroll">
                    <table className="pa2-po-tbl">
                        <thead>
                            <tr>
                                <th className="pa2-po-th">PO NUMBER</th>
                                <th className="pa2-po-th">PO TYPE</th>
                                <th className="pa2-po-th">VENDOR / SUPPLIER</th>
                                <th className="pa2-po-th pa2-po-th--wide">MATERIAL</th>
                                <th className="pa2-po-th pa2-po-th--r">QTY</th>
                                <th className="pa2-po-th pa2-po-th--r">VALUE</th>
                                <th className="pa2-po-th">PO DATE</th>
                                <th className="pa2-po-th">GRN NO</th>
                                <th className="pa2-po-th">GRN DATE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {poLoading && (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="pa2-po-tr pa2-pulse-loader">
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "65px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "80px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "120px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "180px", height: "13px" }} /></td>
                                        <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "40px", height: "13px" }} /></td>
                                        <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "60px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "75px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "70px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "75px", height: "13px" }} /></td>
                                    </tr>
                                ))
                            )}
                            {!poLoading && filteredPoRows.length === 0 && (
                                <tr><td colSpan={9} className="pa2-po-empty">— No records found —</td></tr>
                            )}
                            {!poLoading && filteredPoRows.map((r, i) => (
                                <tr key={i} className="pa2-po-tr">
                                    <td className="pa2-po-td pa2-po-link">{r.po_number}</td>
                                    <td className="pa2-po-td">
                                        {r.po_type
                                            ? <span className="pa2-po-type-badge">{r.po_type}</span>
                                            : <span className="pa2-po-dash">–</span>}
                                    </td>
                                    <td className="pa2-po-td pa2-po-vendor">{r.vendor_name || "–"}</td>
                                    <td className="pa2-po-td pa2-po-material">
                                        {r.material_code
                                            ? <><span className="pa2-po-matcode">{r.material_code}</span>{" – "}{r.material.replace(/^[^-]+-\s*/, "")}</>
                                            : r.material || "–"}
                                    </td>
                                    <td className="pa2-po-td pa2-po-td--r">{r.po_qty || "–"}</td>
                                    <td className="pa2-po-td pa2-po-td--r pa2-po-value">
                                        ₹{r.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="pa2-po-td pa2-po-date">
                                        {r.po_date ? r.po_date.split("-").reverse().join(" ").replace(/^(\d+) (\d+) /, (_, d, m) => `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} `) : "–"}
                                    </td>
                                    <td className="pa2-po-td">
                                        {r.grn_no
                                            ? <span className="pa2-po-grn-link">{r.grn_no}</span>
                                            : <span className="pa2-po-dash">–</span>}
                                    </td>
                                    <td className="pa2-po-td pa2-po-date">
                                        {r.grn_date ? r.grn_date.split("-").reverse().join(" ").replace(/^(\d+) (\d+) /, (_, d, m) => `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} `) : <span className="pa2-po-dash">–</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Amended Purchase Order Details ── */}
            <div className="pa2-card pa2-animate pa2-delay-4 pa2-card-premium" style={{ marginTop: "1.4rem" }}>
                <div className="pa2-table-header">
                    <SectionHeader icon={<ClipboardList size={16} style={{ color: "#8b5cf6" }} />} title="Amended Purchase Order Details" />
                    <div className="pa2-tag-row">
                        <span className="pa2-badge pa2-badge-purple">{poLoading ? "Loading…" : `${poRows.length} amended records`}</span>
                    </div>
                </div>
                <div className="pa2-table-scroll">
                    <table className="pa2-po-tbl">
                        <thead>
                            <tr>
                                <th className="pa2-po-th">PO NUMBER</th>
                                <th className="pa2-po-th">AMND PO NUMBER</th>
                                <th className="pa2-po-th">PO TYPE</th>
                                <th className="pa2-po-th">VENDOR / SUPPLIER</th>
                                <th className="pa2-po-th pa2-po-th--wide">MATERIAL</th>
                                <th className="pa2-po-th pa2-po-th--r">QTY</th>
                                <th className="pa2-po-th pa2-po-th--r">VALUE</th>
                                <th className="pa2-po-th">PO DATE</th>
                                <th className="pa2-po-th">GRN NO</th>
                                <th className="pa2-po-th">GRN DATE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {poLoading && (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="pa2-po-tr pa2-pulse-loader">
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "65px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "65px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "110px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "120px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "180px", height: "13px" }} /></td>
                                        <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "40px", height: "13px" }} /></td>
                                        <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "60px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "75px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "70px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "75px", height: "13px" }} /></td>
                                    </tr>
                                ))
                            )}
                            {!poLoading && poRows.length === 0 && (
                                <tr><td colSpan={10} className="pa2-po-empty">— No amended records found —</td></tr>
                            )}
                            {!poLoading && poRows.map((r, i) => (
                                <tr key={i} className="pa2-po-tr">
                                    <td className="pa2-po-td pa2-po-link">{r.po_number}</td>
                                    <td className="pa2-po-td pa2-po-link" style={{ color: "#8b5cf6" }}>{r.po_number}-A{i % 2 === 0 ? "1" : "2"}</td>
                                    <td className="pa2-po-td">
                                        <span className="pa2-po-type-badge" style={{ background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.15)", color: "#8b5cf6" }}>
                                            Amns-Stores Material
                                        </span>
                                    </td>
                                    <td className="pa2-po-td pa2-po-vendor">{r.vendor_name || "–"}</td>
                                    <td className="pa2-po-td pa2-po-material">
                                        {r.material_code
                                            ? <><span className="pa2-po-matcode">{r.material_code}</span>{" – "}{r.material.replace(/^[^-]+-\s*/, "")}</>
                                            : r.material || "–"}
                                    </td>
                                    <td className="pa2-po-td pa2-po-td--r">{r.po_qty || "–"}</td>
                                    <td className="pa2-po-td pa2-po-td--r pa2-po-value">
                                        ₹{r.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="pa2-po-td pa2-po-date">
                                        {r.po_date ? r.po_date.split("-").reverse().join(" ").replace(/^(\d+) (\d+) /, (_, d, m) => `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} `) : "–"}
                                    </td>
                                    <td className="pa2-po-td">
                                        {r.grn_no
                                            ? <span className="pa2-po-grn-link">{r.grn_no}</span>
                                            : <span className="pa2-po-dash">–</span>}
                                    </td>
                                    <td className="pa2-po-td pa2-po-date">
                                        {r.grn_date ? r.grn_date.split("-").reverse().join(" ").replace(/^(\d+) (\d+) /, (_, d, m) => `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} `) : <span className="pa2-po-dash">–</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Traceability Table ── */}
            <div className="pa2-card pa2-animate pa2-delay-4 pa2-card-premium" style={{ marginTop: "1.4rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.2rem" }}>
                    <SectionHeader icon={<TrendingUp size={16} style={{ color: "#8b5cf6" }} />} title="Traceability Table" />
                    <div className="pa2-macdetail-search-wrapper" style={{ margin: 0, width: "260px", position: "relative", display: "flex", alignItems: "center" }}>
                        <Search size={14} className="pa2-macdetail-search-icon" style={{ position: "absolute", left: "10px", color: "#64748b" }} />
                        <input
                            type="text"
                            placeholder="Search Traceability Details..."
                            value={traceSearch}
                            onChange={e => setTraceSearch(e.target.value)}
                            className="pa2-macdetail-search-input"
                            style={{
                                paddingLeft: "32px",
                                width: "100%",
                                height: "36px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                fontSize: "0.82rem",
                                outline: "none",
                                background: "#f8fafc",
                                transition: "all 0.2s"
                            }}
                        />
                        {traceSearch && (
                            <X size={14} onClick={() => setTraceSearch("")} style={{ position: "absolute", right: "10px", cursor: "pointer", color: "#64748b" }} />
                        )}
                    </div>
                </div>
                <div className="pa2-table-scroll" style={{ maxHeight: "350px", overflowY: "auto" }}>
                    <table className="pa2-po-tbl">
                        <thead>
                            <tr>
                                <th className="pa2-po-th">#</th>
                                <th className="pa2-po-th">IND NO</th>
                                <th className="pa2-po-th">IND DT</th>
                                <th className="pa2-po-th pa2-po-th--r">IND QTY</th>
                                <th className="pa2-po-th">IND PO NO</th>
                                <th className="pa2-po-th">PO DT</th>
                                <th className="pa2-po-th pa2-po-th--r">PO QTY</th>
                                <th className="pa2-po-th pa2-po-th--r">PO RATE</th>
                                <th className="pa2-po-th pa2-po-th--r">PO VALUE</th>
                                <th className="pa2-po-th">GRN NO</th>
                                <th className="pa2-po-th">GRN DT</th>
                                <th className="pa2-po-th pa2-po-th--r">GRN OKY</th>
                                <th className="pa2-po-th pa2-po-th--r">GRN RATE</th>
                                <th className="pa2-po-th pa2-po-th--r">GRN VALUE</th>
                                <th className="pa2-po-th">ROUTECARD NO</th>
                                <th className="pa2-po-th">ROUCARD DT</th>
                                <th className="pa2-po-th pa2-po-th--r">ROUCARD QTY</th>
                                <th className="pa2-po-th pa2-po-th--wide">PROD DET/PARTNO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {poLoading && (
                                Array.from({ length: 4 }).map((_, idx) => (
                                    <tr key={idx} className="pa2-po-tr pa2-pulse-loader">
                                        {Array.from({ length: 18 }).map((__, tdIdx) => (
                                            <td key={tdIdx} className="pa2-po-td">
                                                <div className="pa2-skeleton pa2-shimmer" style={{ width: tdIdx === 0 ? "15px" : "55px", height: "12px" }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                            {!poLoading && filteredTraceData.length === 0 && (
                                <tr>
                                    <td colSpan={18} className="pa2-po-empty">— No traceability records found matching search query —</td>
                                </tr>
                            )}
                            {!poLoading && filteredTraceData.map((row, i) => (
                                <tr key={i} className="pa2-po-tr">
                                    <td className="pa2-po-td pa2-po-dash">{row.sno}</td>
                                    <td className="pa2-po-td" style={{ fontWeight: "600", color: "#2d6de8" }}>{row.indNo}</td>
                                    <td className="pa2-po-td pa2-po-date">{row.indDt}</td>
                                    <td className="pa2-po-td pa2-po-td--r">{row.indQty.toLocaleString()}</td>
                                    <td className="pa2-po-td" style={{ fontWeight: "600", color: "#10b981" }}>{row.indPoNo}</td>
                                    <td className="pa2-po-td pa2-po-date">{row.poDt}</td>
                                    <td className="pa2-po-td pa2-po-td--r">{row.poQty.toLocaleString()}</td>
                                    <td className="pa2-po-td pa2-po-td--r">₹{row.poRate}</td>
                                    <td className="pa2-po-td pa2-po-td--r pa2-po-value">₹{row.poValue.toLocaleString("en-IN")}</td>
                                    <td className="pa2-po-td" style={{ fontWeight: "600", color: "#f5a623" }}>{row.grnNo}</td>
                                    <td className="pa2-po-td pa2-po-date">{row.grnDt}</td>
                                    <td className="pa2-po-td pa2-po-td--r">{row.grnOky.toLocaleString()}</td>
                                    <td className="pa2-po-td pa2-po-td--r">₹{row.grnRate}</td>
                                    <td className="pa2-po-td pa2-po-td--r pa2-po-value">₹{row.grnValue.toLocaleString("en-IN")}</td>
                                    <td className="pa2-po-td">
                                        <span className="pa2-po-type-badge" style={{ background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.15)", color: "#8b5cf6", fontWeight: "700" }}>
                                            {row.routeCardNo}
                                        </span>
                                    </td>
                                    <td className="pa2-po-td pa2-po-date">{row.routeCardDt}</td>
                                    <td className="pa2-po-td pa2-po-td--r">{row.routeCardQty.toLocaleString()}</td>
                                    <td className="pa2-po-td pa2-po-vendor" style={{ fontWeight: "700" }}>{row.partNo}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Short Close & Price Trend (Dual Column Row) ── */}
            <div className="pa2-two-col pa2-animate pa2-delay-4" style={{ marginTop: "1.4rem" }}>

                {/* Short Close Details */}
                <div className="pa2-card pa2-card-premium">
                    <SectionHeader
                        icon={<ClipboardList size={16} style={{ color: "#ef4444" }} />}
                        title="Short Close Details"
                        badge="Partial Delivery"
                        badgeCls="pa2-badge-red"
                    />
                    <div className="pa2-table-scroll" style={{ maxHeight: "300px", overflowY: "auto", marginTop: "0.5rem" }}>
                        <table className="pa2-po-tbl">
                            <thead>
                                <tr>
                                    <th className="pa2-po-th">#</th>
                                    <th className="pa2-po-th">PO NO</th>
                                    <th className="pa2-po-th">PO DATE</th>
                                    <th className="pa2-po-th">SUPPLIER NAME</th>
                                    <th className="pa2-po-th">PARTNO-DESC</th>
                                    <th className="pa2-po-th">UOM</th>
                                    <th className="pa2-po-th pa2-po-th--r">SHORT CLOSE QTY</th>
                                    <th className="pa2-po-th">REASON</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shortCloseData.map((row, i) => (
                                    <tr key={i} className="pa2-po-tr">
                                        <td className="pa2-po-td pa2-po-dash">{row.sno}</td>
                                        <td className="pa2-po-td" style={{ fontWeight: "600", color: "#2d6de8", whiteSpace: "nowrap" }}>{row.poNo}</td>
                                        <td className="pa2-po-td pa2-po-date">{row.poDate}</td>
                                        <td className="pa2-po-td pa2-po-vendor" style={{ whiteSpace: "nowrap" }}>{row.supplier}</td>
                                        <td className="pa2-po-td" style={{ fontWeight: "600", whiteSpace: "nowrap" }}>{row.partDesc}</td>
                                        <td className="pa2-po-td">{row.uom}</td>
                                        <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "700", color: "#f5a623" }}>{row.qty.toLocaleString()}</td>
                                        <td className="pa2-po-td" style={{ color: "#64748b", fontSize: "0.78rem" }}>{row.reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Price Trend Analysis */}
                <div className="pa2-card pa2-card-premium">
                    <SectionHeader
                        icon={<TrendingUp size={16} style={{ color: "#10b981" }} />}
                        title="Price Trend Analysis"
                        badge="Rate Changes"
                        badgeCls="pa2-badge-green"
                    />
                    <div className="pa2-table-scroll" style={{ maxHeight: "300px", overflowY: "auto", marginTop: "0.5rem" }}>
                        <table className="pa2-po-tbl">
                            <thead>
                                <tr>
                                    <th className="pa2-po-th">#</th>
                                    <th className="pa2-po-th">PARTNO-DESC</th>
                                    <th className="pa2-po-th">MONTH</th>
                                    <th className="pa2-po-th pa2-po-th--r">RATE</th>
                                    <th className="pa2-po-th" style={{ textAlign: "center" }}>COST TREND %</th>
                                    <th className="pa2-po-th pa2-po-th--r">COST DIFF</th>
                                </tr>
                            </thead>
                            <tbody>
                                {priceTrendData.map((row, i) => (
                                    <tr key={i} className="pa2-po-tr">
                                        <td className="pa2-po-td pa2-po-dash">{row.sno}</td>
                                        <td className="pa2-po-td pa2-po-vendor" style={{ fontWeight: "700", whiteSpace: "nowrap" }}>{row.partDesc}</td>
                                        <td className="pa2-po-td" style={{ whiteSpace: "nowrap" }}>{row.month}</td>
                                        <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "600" }}>₹{row.rate}</td>
                                        <td className="pa2-po-td" style={{ textAlign: "center" }}>
                                            {row.type === "up" ? (
                                                <span style={{ display: "inline-block", background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", padding: "3px 8px", borderRadius: "6px", fontSize: "0.76rem", fontWeight: "700" }}>
                                                    ↑ {row.pct}%
                                                </span>
                                            ) : row.type === "down" ? (
                                                <span style={{ display: "inline-block", background: "rgba(16, 185, 129, 0.08)", color: "#10b981", padding: "3px 8px", borderRadius: "6px", fontSize: "0.76rem", fontWeight: "700" }}>
                                                    ↓ {Math.abs(row.pct)}%
                                                </span>
                                            ) : (
                                                <span style={{ display: "inline-block", background: "rgba(100, 116, 139, 0.08)", color: "#64748b", padding: "3px 8px", borderRadius: "6px", fontSize: "0.76rem", fontWeight: "700" }}>
                                                    — {row.pct}%
                                                </span>
                                            )}
                                        </td>
                                        <td className="pa2-po-td pa2-po-td--r pa2-po-value" style={{ color: row.type === "up" ? "#ef4444" : row.type === "down" ? "#10b981" : "#0f172a" }}>
                                            {row.diff > 0 ? `+₹${row.diff}` : row.diff < 0 ? `-₹${Math.abs(row.diff)}` : "₹0"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* ── GRN Aging + Alerts ── */}
            <div className="pa2-two-col pa2-animate pa2-delay-4">

                {/* Supplier Rating */}
                <div className="pa2-card pa2-card-premium">
                    <SectionHeader
                        icon={<Trophy size={16} style={{ color: "#f5a623" }} />}
                        title="Supplier Rating Analysis"
                        badge={supplierRatingData ? "Live Scores" : "Rating"}
                        badgeCls="pa2-badge-blue"
                    />
                    {supplierRatingLoading ? (
                        <div className="pa2-skeleton-chart pa2-pulse-loader" style={{ height: "250px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <div style={{ width: "90%", display: "flex", flexDirection: "column", gap: "14px", padding: "20px" }}>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                                        <div className="pa2-skeleton pa2-shimmer" style={{ width: "80px", height: "12px" }} />
                                        <div className="pa2-skeleton pa2-shimmer" style={{ flex: 1, height: "14px", borderRadius: "4px" }} />
                                        <div className="pa2-skeleton pa2-shimmer" style={{ width: "30px", height: "12px" }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="pa2-chart-wrap" style={{ height: "250px", padding: "12px" }}>
                            <canvas ref={ratingRef} />
                        </div>
                    )}
                </div>

                {/* Alerts */}
                <div className="pa2-card pa2-card-premium">
                    <SectionHeader icon={<AlertTriangle size={16} style={{ color: "#ef4444" }} />} title="Management Alerts" badge="4 Action Needed" badgeCls="pa2-badge-red" />
                    <div className="pa2-alert-list">
                        {ALERTS.map((a, i) => (
                            <div className={`pa2-alert-row pa2-alert-${a.urgency}`} key={i}>
                                <span className="pa2-alert-icon" style={{ display: "inline-flex", alignItems: "center" }}>{renderAlertIcon(a.urgency)}</span>
                                <div className="pa2-alert-body">
                                    <div className="pa2-alert-title">{a.title}</div>
                                    <div className="pa2-alert-sub">{a.sub}</div>
                                </div>
                                <span className="pa2-alert-time">{a.time}</span>
                            </div>
                        ))}
                    </div>
                    <div className="pa2-priority-box">
                        <div className="pa2-priority-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Pin size={14} style={{ color: "#2d6de8", transform: "rotate(45deg)" }} /> Key Management Action
                        </div>
                        <p className="pa2-priority-body">
                            Follow up with <strong>Musk Metals</strong> for DIA 65MM pending lot (325 Nos).
                            Production scheduling depends on receipt by <strong>05-Mar-2026</strong>.
                            Also review rate increase ₹88→₹92/kg for formal approval.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}