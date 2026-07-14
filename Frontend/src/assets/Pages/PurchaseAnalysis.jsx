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
    FileEdit,
    Check,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
} from "lucide-react";

Chart.register(...registerables, ChartDataLabels);

const API_BASE = resolveApiBase();

// ─────────────────────────────────────────────
//  Premium "No Data Found" Empty State
// ─────────────────────────────────────────────
const PARTICLES = [
    { style: { top: "18%", left: "12%",  "--dx": "30px",  "--dy": "-40px", animationDelay: "0s",    animationDuration: "3.5s" } },
    { style: { top: "70%", left: "8%",   "--dx": "45px",  "--dy": "-20px", animationDelay: "0.6s",  animationDuration: "4.1s" } },
    { style: { top: "25%", right: "10%", "--dx": "-38px", "--dy": "-35px", animationDelay: "1.1s",  animationDuration: "3.8s" } },
    { style: { top: "75%", right: "14%", "--dx": "-30px", "--dy": "-50px", animationDelay: "1.8s",  animationDuration: "4.5s" } },
    { style: { top: "50%", left: "50%",  "--dx": "20px",  "--dy": "-60px", animationDelay: "2.3s",  animationDuration: "3.2s" } },
];

function PaNoData({ icon = "📭", message = "No data found on this period", compact = false }) {
    return (
        <div className={`pa2-nodata-wrap${compact ? " pa2-nodata-wrap--compact" : ""}`}>
            {PARTICLES.map((p, i) => (
                <span key={i} className="pa2-nodata-particle" style={p.style} />
            ))}
            <div className="pa2-nodata-icon-shell">
                <div className="pa2-nodata-icon">{icon}</div>
            </div>
            <div className="pa2-nodata-title">{message}</div>
            {!compact && <div className="pa2-nodata-sub">Try adjusting the date range or filters</div>}
            <div className="pa2-nodata-dots">
                <span className="pa2-nodata-dot" />
                <span className="pa2-nodata-dot" />
                <span className="pa2-nodata-dot" />
            </div>
        </div>
    );
}

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

function SectionHeader({ icon, title, badge, badgeCls, extra }) {
    return (
        <div className="pa2-section-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: '10px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flex: 1, minWidth: '200px' }}>
                <span className="pa2-section-icon" style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
                <span className="pa2-section-title" style={{ flex: 'none' }}>{title}</span>
                {badge && <span className={`pa2-badge ${badgeCls || ""}`}>{badge}</span>}
            </div>
            {extra && <div className="pa2-section-extra">{extra}</div>}
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
const getAvatarColor = (char) => {
    const colors = {
        A: "#e0e7ff", B: "#fef3c7", C: "#d1fae5", D: "#fee2e2", E: "#f3e8ff",
        F: "#e0f2fe", G: "#fce7f3", H: "#eef2f6", I: "#e0e7ff", J: "#fef3c7",
        K: "#d1fae5", L: "#fee2e2", M: "#f3e8ff", N: "#e0f2fe", O: "#fce7f3",
        P: "#eef2f6", Q: "#e0e7ff", R: "#fef3c7", S: "#d1fae5", T: "#fee2e2",
        U: "#f3e8ff", V: "#e0f2fe", W: "#fce7f3", X: "#eef2f6", Y: "#e0e7ff", Z: "#fef3c7"
    };
    const textColors = {
        A: "#4f46e5", B: "#d97706", C: "#059669", D: "#dc2626", E: "#7c3aed",
        F: "#0284c7", G: "#db2777", H: "#475569", I: "#4f46e5", J: "#d97706",
        K: "#059669", L: "#dc2626", M: "#7c3aed", N: "#0284c7", O: "#db2777",
        P: "#475569", Q: "#4f46e5", R: "#d97706", S: "#059669", T: "#dc2626",
        U: "#7c3aed", V: "#0284c7", W: "#db2777", X: "#475569", Y: "#4f46e5", Z: "#d97706"
    };
    const c = (char || "").toUpperCase();
    return {
        bg: colors[c] || "#f1f5f9",
        fg: textColors[c] || "#64748b"
    };
};

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
        poType: "All Types", supplier: ["All Suppliers"],
        department: "Production", status: "All Status",
    });
    const [animated, setAnimated] = useState(false);
    const [poTypes, setPoTypes] = useState(["All Types"]);
    const [poRows, setPoRows] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [poSummary, setPoSummary] = useState(null);
    const [poLoading, setPoLoading] = useState(false);
    const [amendedPoRows, setAmendedPoRows] = useState([]);
    const [amendedPoLoading, setAmendedPoLoading] = useState(false);
    const [shortCloseRows, setShortCloseRows] = useState([]);
    const [shortCloseLoading, setShortCloseLoading] = useState(false);
    const [priceTrendRows, setPriceTrendRows] = useState([]);
    const [priceTrendLoading, setPriceTrendLoading] = useState(false);
    const [alertsData, setAlertsData] = useState(null);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [weeklyTrend, setWeeklyTrend] = useState(null);
    const [weeklyChartType, setWeeklyChartType] = useState("combo");
    const [sortConfig, setSortConfig] = useState({ key: "po_date", direction: "desc" });

    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const renderSortableTh = (label, key, isRightAligned = false, isWide = false) => {
        const isSorted = sortConfig.key === key;
        const isAsc = sortConfig.direction === "asc";
        const IconComponent = isSorted ? (isAsc ? ArrowUp : ArrowDown) : ArrowUpDown;

        return (
            <th
                className={`pa2-po-th pa2-po-th--sortable ${isRightAligned ? "pa2-po-th--r" : ""} ${isWide ? "pa2-po-th--wide" : ""}`}
                onClick={() => handleSort(key)}
            >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6.5px", justifyContent: isRightAligned ? "flex-end" : "flex-start", width: "100%" }}>
                    <span>{label}</span>
                    <span className={`pa2-sort-icon-wrap ${isSorted ? "active" : ""}`} style={{
                        display: "inline-flex",
                        alignItems: "center",
                        opacity: isSorted ? 1 : 0.35,
                        color: isSorted ? "#2d6de8" : "inherit"
                    }}>
                        <IconComponent size={12} style={{ strokeWidth: 2.5 }} />
                    </span>
                </div>
            </th>
        );
    };

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
            if (filters.supplier && filters.supplier.length > 0 && !filters.supplier.includes("All Suppliers")) {
                if (!filters.supplier.includes(r.vendor_name)) return false;
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

    const sortedFilteredPoRows = useMemo(() => {
        const sorted = [...filteredPoRows];
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key === "po_qty") {
                    const aNum = parseFloat(String(aVal || "0").replace(/,/g, ""));
                    const bNum = parseFloat(String(bVal || "0").replace(/,/g, ""));
                    aVal = isNaN(aNum) ? 0 : aNum;
                    bVal = isNaN(bNum) ? 0 : bNum;
                } else if (sortConfig.key === "value" || sortConfig.key === "rate") {
                    aVal = Number(aVal || 0);
                    bVal = Number(bVal || 0);
                } else if (sortConfig.key === "po_date" || sortConfig.key === "grn_date") {
                    const parseDateStr = (str) => {
                        if (!str) return new Date(0);
                        if (str.includes("/") || str.includes("-")) {
                            const separator = str.includes("/") ? "/" : "-";
                            const parts = str.split(separator);
                            if (parts.length === 3) {
                                if (parts[0].length === 4) return new Date(parts[0], parts[1] - 1, parts[2]);
                                return new Date(parts[2], parts[1] - 1, parts[0]);
                            }
                        }
                        return new Date(str);
                    };
                    aVal = parseDateStr(aVal);
                    bVal = parseDateStr(bVal);
                } else {
                    aVal = String(aVal || "").toLowerCase();
                    bVal = String(bVal || "").toLowerCase();
                }

                if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [filteredPoRows, sortConfig]);

    const filteredAmendedPoRows = useMemo(() => {
        return amendedPoRows.filter(r => {
            const q = searchQuery.toLowerCase().trim();
            if (q) {
                const match = (r.po_number && r.po_number.toLowerCase().includes(q)) ||
                    (r.po_amnd_no && r.po_amnd_no.toLowerCase().includes(q)) ||
                    (r.po_type && r.po_type.toLowerCase().includes(q)) ||
                    (r.vendor_name && r.vendor_name.toLowerCase().includes(q)) ||
                    (r.material_code && r.material_code.toLowerCase().includes(q)) ||
                    (r.material && r.material.toLowerCase().includes(q)) ||
                    (r.grn_no && r.grn_no.toLowerCase().includes(q));
                if (!match) return false;
            }
            if (filters.supplier && !filters.supplier.includes("All Suppliers") && filters.supplier.length > 0) {
                if (!filters.supplier.includes(r.vendor_name)) return false;
            }
            if (filters.status && filters.status !== "All Status") {
                const isGrn = !!r.grn_no;
                if (filters.status === "GRN Done" && !isGrn) return false;
                if (filters.status === "GRN Pending" && isGrn) return false;
            }
            return true;
        });
    }, [amendedPoRows, searchQuery, filters.supplier, filters.status]);

    const uniqueAmendedPoCount = useMemo(() => {
        const uniqueKeys = new Set();
        amendedPoRows.forEach(r => {
            if (r.po_amnd_no) {
                uniqueKeys.add(r.po_amnd_no);
            } else if (r.po_number) {
                uniqueKeys.add(r.po_number);
            }
        });
        return uniqueKeys.size;
    }, [amendedPoRows]);

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
        if (filteredPoRows.length === 0) return "—";
        const rawSum = filteredPoRows
            .filter(r => {
                const t = (r.po_type || "").toLowerCase();
                return t.includes("raw") || t.includes("rm");
            })
            .reduce((acc, r) => acc + Number(r.value || 0), 0) / 100000;
        const val = rawSum * 0.18;
        return `₹${val.toFixed(2)}L`;
    }, [filteredPoRows]);

    const storeStockVal = useMemo(() => {
        if (filteredPoRows.length === 0) return "—";
        const storeSum = filteredPoRows
            .filter(r => {
                const t = (r.po_type || "").toLowerCase();
                return !(t.includes("raw") || t.includes("rm"));
            })
            .reduce((acc, r) => acc + Number(r.value || 0), 0) / 100000;
        const val = storeSum * 0.14;
        return `₹${val.toFixed(2)}L`;
    }, [filteredPoRows]);

    const filteredShortCloseRows = useMemo(() => {
        return shortCloseRows.filter(r => {
            const q = searchQuery.toLowerCase().trim();
            if (q) {
                const match = (r.po_number && r.po_number.toLowerCase().includes(q)) ||
                    (r.supplier_name && r.supplier_name.toLowerCase().includes(q)) ||
                    (r.material && r.material.toLowerCase().includes(q)) ||
                    (r.reason && r.reason.toLowerCase().includes(q)) ||
                    (r.short_close_user && r.short_close_user.toLowerCase().includes(q));
                if (!match) return false;
            }
            if (filters.supplier && !filters.supplier.includes("All Suppliers") && filters.supplier.length > 0) {
                if (!filters.supplier.includes(r.supplier_name)) return false;
            }
            return true;
        });
    }, [shortCloseRows, searchQuery, filters.supplier]);

    const filteredPriceTrendRows = useMemo(() => {
        return priceTrendRows.filter(r => {
            const q = searchQuery.toLowerCase().trim();
            if (q) {
                const match = (r.partDesc && r.partDesc.toLowerCase().includes(q)) ||
                    (r.month && r.month.toLowerCase().includes(q)) ||
                    (r.type && r.type.toLowerCase().includes(q));
                if (!match) return false;
            }
            return true;
        });
    }, [priceTrendRows, searchQuery]);

    const [traceSearch, setTraceSearch] = useState("");

    const [traceRows, setTraceRows] = useState([]);
    const [traceLoading, setTraceLoading] = useState(false);

    const filteredTraceData = useMemo(() => {
        return traceRows.filter(row => {
            if (!traceSearch) return true;
            const q = traceSearch.toLowerCase();
            return (
                (row.supplierName || "").toLowerCase().includes(q) ||
                (row.indNo       || "").toLowerCase().includes(q) ||
                (row.indPoNo     || "").toLowerCase().includes(q) ||
                (row.material    || "").toLowerCase().includes(q) ||
                (row.grnNo       || "").toLowerCase().includes(q) ||
                (row.poType      || "").toLowerCase().includes(q)
            );
        });
    }, [traceRows, traceSearch]);

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

    // Custom Supplier dropdown state
    const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
    const supplierDropdownRef = useRef(null);
    const [supplierFocusedIndex, setSupplierFocusedIndex] = useState(-1);
    const [supplierSearchQuery, setSupplierSearchQuery] = useState("");

    // Custom Status dropdown state
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const statusDropdownRef = useRef(null);
    const [statusFocusedIndex, setStatusFocusedIndex] = useState(-1);

    const statusOptions = useMemo(() => ["All Status", "GRN Done", "GRN Pending"], []);

    const filteredSuppliers = useMemo(() => {
        if (!supplierSearchQuery) return suppliersList;
        const q = supplierSearchQuery.toLowerCase().trim();
        return suppliersList.filter(s => s.toLowerCase().includes(q));
    }, [suppliersList, supplierSearchQuery]);

    useEffect(() => {
        if (!poDropdownOpen) {
            setFocusedIndex(-1);
        } else {
            const idx = poTypes.indexOf(filters.poType);
            setFocusedIndex(idx >= 0 ? idx : 0);
        }
    }, [poDropdownOpen, poTypes, filters.poType]);

    useEffect(() => {
        if (!supplierDropdownOpen) {
            setSupplierFocusedIndex(-1);
            setSupplierSearchQuery("");
        } else {
            const idx = Array.isArray(filters.supplier)
                ? filteredSuppliers.findIndex(s => filters.supplier.includes(s))
                : filteredSuppliers.indexOf(filters.supplier);
            setSupplierFocusedIndex(idx >= 0 ? idx : 0);
        }
    }, [supplierDropdownOpen, filteredSuppliers, filters.supplier]);

    useEffect(() => {
        if (!statusDropdownOpen) {
            setStatusFocusedIndex(-1);
        } else {
            const idx = statusOptions.indexOf(filters.status);
            setStatusFocusedIndex(idx >= 0 ? idx : 0);
        }
    }, [statusDropdownOpen, statusOptions, filters.status]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (poDropdownRef.current && !poDropdownRef.current.contains(event.target)) {
                setPoDropdownOpen(false);
            }
            if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target)) {
                setSupplierDropdownOpen(false);
            }
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
                setStatusDropdownOpen(false);
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
        if (filters.supplier && !filters.supplier.includes("All Suppliers") && filters.supplier.length > 0) {
            params.set("supplier", filters.supplier.join(","));
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
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier]);

    // ── Fetch Amended PO table rows ──────────────────────
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
        if (filters.supplier && !filters.supplier.includes("All Suppliers") && filters.supplier.length > 0) {
            params.set("supplier", filters.supplier.join(","));
        }
        const ctrl = new AbortController();
        setAmendedPoLoading(true);
        fetch(`${API_BASE}/purchase-analysis/amended-po-table/?${params}`, {
            credentials: "include",
            signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => {
                setAmendedPoRows(data?.rows ?? []);
                setAmendedPoLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setAmendedPoLoading(false);
            });
        return () => ctrl.abort();
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier]);

    // ── Fetch Short Close table rows ──────────────────────
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
        if (filters.supplier && !filters.supplier.includes("All Suppliers") && filters.supplier.length > 0) {
            params.set("supplier", filters.supplier.join(","));
        }
        const ctrl = new AbortController();
        setShortCloseLoading(true);
        fetch(`${API_BASE}/purchase-analysis/short-close-table/?${params}`, {
            credentials: "include",
            signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => {
                setShortCloseRows(data?.rows ?? []);
                setShortCloseLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setShortCloseLoading(false);
            });
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier]);

    // ── Fetch Price Trend table rows ──────────────────────
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
        if (filters.supplier && !filters.supplier.includes("All Suppliers") && filters.supplier.length > 0) {
            params.set("supplier", filters.supplier.join(","));
        }
        const ctrl = new AbortController();
        setPriceTrendLoading(true);
        fetch(`${API_BASE}/purchase-analysis/price-trend/?${params}`, {
            credentials: "include",
            signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => {
                setPriceTrendRows(data?.rows ?? []);
                setPriceTrendLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setPriceTrendLoading(false);
            });
        return () => ctrl.abort();
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier]);

    // ── Fetch management alerts ──────────────────────
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
        if (filters.supplier && !filters.supplier.includes("All Suppliers") && filters.supplier.length > 0) {
            params.set("supplier", filters.supplier.join(","));
        }
        const ctrl = new AbortController();
        setAlertsLoading(true);
        fetch(`${API_BASE}/purchase-analysis/management-alerts/?${params}`, {
            credentials: "include",
            signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => {
                setAlertsData(data);
                setAlertsLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setAlertsLoading(false);
            });
        return () => ctrl.abort();
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier]);

    // ── Fetch Traceability Table data ────────────────────────────
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
        if (filters.supplier && !filters.supplier.includes("All Suppliers") && filters.supplier.length > 0) {
            params.set("supplier", filters.supplier.join(","));
        }
        const ctrl = new AbortController();
        setTraceLoading(true);
        fetch(`${API_BASE}/purchase-analysis/traceability-table/?${params}`, {
            credentials: "include",
            signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => {
                setTraceRows(data?.rows ?? []);
                setTraceLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setTraceLoading(false);
            });
        return () => ctrl.abort();
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier]);

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
        if (filters.supplier && !filters.supplier.includes("All Suppliers") && filters.supplier.length > 0) {
            params.set("supplier", filters.supplier.join(","));
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
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier]);

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
        if (filters.supplier && !filters.supplier.includes("All Suppliers") && filters.supplier.length > 0) {
            params.set("supplier", filters.supplier.join(","));
        }
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
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier]);

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
        if (filters.supplier && !filters.supplier.includes("All Suppliers") && filters.supplier.length > 0) {
            params.set("supplier", filters.supplier.join(","));
        }
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
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier]);

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

    // ── Redraw trend chart whenever weeklyTrend or weeklyChartType changes ─────────────
    useEffect(() => {
        if (!trendRef.current) return;
        trendChart.current?.destroy();
        const labels = weeklyTrend?.labels ?? [];
        const poVals = weeklyTrend?.po_value ?? [];
        const grnVals = weeklyTrend?.grn_received ?? [];
        const fmtL = v => `₹${Number(v).toFixed(2)}L`;

        let maxVal = 0;
        if (weeklyChartType === "combo") {
            maxVal = Math.max(0, ...poVals, ...grnVals);
        } else if (weeklyChartType === "po") {
            maxVal = Math.max(0, ...poVals);
        } else {
            maxVal = Math.max(0, ...grnVals);
        }
        // Extra 35% headroom so datalabels never clip at the top
        const yMax = maxVal > 0 ? Math.ceil(maxVal * 1.35 * 10) / 10 : undefined;

        const ctx = trendRef.current.getContext("2d");

        // Blue gradient for PO Area
        const blueGradient = ctx.createLinearGradient(0, 0, 0, 250);
        blueGradient.addColorStop(0, "rgba(45, 109, 232, 0.35)");
        blueGradient.addColorStop(1, "rgba(45, 109, 232, 0.00)");

        // Green gradient for GRN Area
        const greenGradient = ctx.createLinearGradient(0, 0, 0, 250);
        greenGradient.addColorStop(0, "rgba(16, 185, 129, 0.35)");
        greenGradient.addColorStop(1, "rgba(16, 185, 129, 0.00)");

        // Blue gradient for PO Bars
        const barGradient = ctx.createLinearGradient(0, 0, 0, 250);
        barGradient.addColorStop(0, "rgba(45, 109, 232, 0.85)");
        barGradient.addColorStop(1, "rgba(45, 109, 232, 0.25)");

        const datasets = [];

        if (weeklyChartType === "combo") {
            datasets.push(
                {
                    label: "PO Value (L)",
                    data: poVals,
                    backgroundColor: barGradient,
                    borderColor: "#2d6de8",
                    borderWidth: 2,
                    borderRadius: 6,
                    type: "bar",
                    yAxisID: "y",
                    datalabels: {
                        display: (ctx) => ctx.dataset.data[ctx.dataIndex] >= 2.0,
                        align: (ctx) => {
                            const val = ctx.dataset.data[ctx.dataIndex];
                            return val < 6.0 ? "top" : "bottom";
                        },
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
                    fill: false,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: "#10b981",
                    pointBorderColor: "#fff",
                    pointBorderWidth: 2,
                    type: "line",
                    yAxisID: "y",
                    datalabels: {
                        display: (ctx) => ctx.dataset.data[ctx.dataIndex] >= 2.0,
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
                }
            );
        } else if (weeklyChartType === "po") {
            datasets.push({
                label: "PO Value (L)",
                data: poVals,
                borderColor: "#2d6de8",
                backgroundColor: blueGradient,
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: "#2d6de8",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                type: "line",
                yAxisID: "y",
                datalabels: {
                    display: (ctx) => ctx.dataset.data[ctx.dataIndex] >= 2.0,
                    align: "top",
                    anchor: "end",
                    formatter: (v) => `₹${v.toFixed(1)}L`,
                    font: { size: 9.5, weight: "800", family: "Poppins" },
                    color: "#ffffff",
                    backgroundColor: "#2d6de8",
                    borderColor: "#1d4ed8",
                    borderWidth: 1,
                    borderRadius: 4,
                    padding: { top: 2, bottom: 2, left: 5, right: 5 },
                    offset: 6
                }
            });
        } else if (weeklyChartType === "grn") {
            datasets.push({
                label: "GRN Received (L)",
                data: grnVals,
                borderColor: "#10b981",
                backgroundColor: greenGradient,
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: "#10b981",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                type: "line",
                yAxisID: "y",
                datalabels: {
                    display: (ctx) => ctx.dataset.data[ctx.dataIndex] >= 2.0,
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
            });
        }

        trendChart.current = new Chart(trendRef.current, {
            type: weeklyChartType === "combo" ? "bar" : "line",
            data: {
                labels,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: window.devicePixelRatio || 2,
                layout: { padding: { top: 32, right: 12, left: 8, bottom: 10 } },
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
                    datalabels: { display: false },
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
    }, [weeklyTrend, weeklyChartType]);

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
        return [];
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
        const raw = topProducts.raw;
        const store = topProducts.store;
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

    const handleSupplierToggle = (opt) => {
        setFilters(prev => {
            let current = prev.supplier;
            if (!Array.isArray(current)) {
                current = current ? [current] : ["All Suppliers"];
            }
            if (opt === "All Suppliers") {
                return { ...prev, supplier: ["All Suppliers"] };
            }
            let next = current.filter(x => x !== "All Suppliers");
            if (next.includes(opt)) {
                next = next.filter(x => x !== opt);
            } else {
                next = [...next, opt];
            }
            if (next.length === 0) {
                next = ["All Suppliers"];
            }
            return { ...prev, supplier: next };
        });
    };

    const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));
    const resetFilters = () => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setDateRange({ from: startOfMonth, to: endOfMonth });
        setSearchQuery("");
        setFilters({
            fromDate: toIso(startOfMonth), toDate: toIso(endOfMonth),
            poType: "All Types", supplier: ["All Suppliers"],
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
                        <label className="pa2-filter-label">Search</label>
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
                    <div className="pa2-filter-group" ref={poDropdownRef} style={{ minWidth: "180px" }}>
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
                    <div className="pa2-filter-group" ref={supplierDropdownRef} style={{ minWidth: "300px" }}>
                        <label className="pa2-filter-label">Supplier</label>
                        <div className={`pa2-custom-select${supplierDropdownOpen ? " pa2-active" : ""}`}>
                            <button
                                type="button"
                                className="pa2-custom-select-trigger"
                                onClick={() => setSupplierDropdownOpen(!supplierDropdownOpen)}
                                onKeyDown={(e) => {
                                    if (e.key === "ArrowDown") {
                                        e.preventDefault();
                                        if (!supplierDropdownOpen) {
                                            setSupplierDropdownOpen(true);
                                            setSupplierFocusedIndex(0);
                                        } else {
                                            setSupplierFocusedIndex((prev) => (prev + 1) % filteredSuppliers.length);
                                        }
                                    } else if (e.key === "ArrowUp") {
                                        e.preventDefault();
                                        if (!supplierDropdownOpen) {
                                            setSupplierDropdownOpen(true);
                                            setSupplierFocusedIndex(filteredSuppliers.length - 1);
                                        } else {
                                            setSupplierFocusedIndex((prev) => (prev - 1 + filteredSuppliers.length) % filteredSuppliers.length);
                                        }
                                    } else if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (supplierDropdownOpen) {
                                            if (supplierFocusedIndex >= 0 && supplierFocusedIndex < filteredSuppliers.length) {
                                                handleSupplierToggle(filteredSuppliers[supplierFocusedIndex]);
                                            }
                                        } else {
                                            setSupplierDropdownOpen(true);
                                        }
                                    } else if (e.key === "Escape") {
                                        setSupplierDropdownOpen(false);
                                    }
                                }}
                            >
                                <span>
                                    {Array.isArray(filters.supplier)
                                        ? (filters.supplier.includes("All Suppliers") || filters.supplier.length === 0)
                                            ? "All Suppliers"
                                            : filters.supplier.length === 1
                                                ? filters.supplier[0]
                                                : `${filters.supplier.length} Selected`
                                        : filters.supplier || "All Suppliers"
                                    }
                                </span>
                                <span className="pa2-custom-select-arrow">
                                    <ChevronDown size={14} />
                                </span>
                            </button>
                            {supplierDropdownOpen && (
                                <ul className="pa2-custom-select-options">
                                    <div className="pa2-dropdown-search-wrapper">
                                        <Search size={12} className="pa2-dropdown-search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Filter suppliers..."
                                            className="pa2-dropdown-search-input"
                                            value={supplierSearchQuery}
                                            onChange={(e) => setSupplierSearchQuery(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    {filteredSuppliers.length === 0 ? (
                                        <div style={{ padding: "8px 12px", fontSize: "0.78rem", color: "#94a3b8", textAlign: "center" }}>
                                            No suppliers found
                                        </div>
                                    ) : (
                                        filteredSuppliers.map((opt, idx) => {
                                            const initial = opt.charAt(0);
                                            const colors = getAvatarColor(initial);
                                            const isSelected = Array.isArray(filters.supplier)
                                                ? filters.supplier.includes(opt)
                                                : filters.supplier === opt;
                                            return (
                                                <li
                                                    key={opt}
                                                    className={`pa2-custom-select-option${isSelected ? " pa2-selected" : ""}${supplierFocusedIndex === idx ? " pa2-focused" : ""}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSupplierToggle(opt);
                                                    }}
                                                    onMouseEnter={() => setSupplierFocusedIndex(idx)}
                                                >
                                                    <span className="pa2-avatar" style={{ background: colors.bg, color: colors.fg }}>
                                                        {initial}
                                                    </span>
                                                    <span className="pa2-opt-text">{opt}</span>
                                                    {isSelected && <Check size={12} className="pa2-check-icon" />}
                                                </li>
                                            );
                                        })
                                    )}
                                </ul>
                            )}
                        </div>
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
                            value: String(uniqueAmendedPoCount),
                            sub: "In selected period",
                            trend: "Amended POs",
                            cls: "pa2-trend-neutral"
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
                        extra={
                            <div className="pa2-chart-type-toggle">
                                <button
                                    type="button"
                                    className={`pa2-toggle-btn ${weeklyChartType === "combo" ? "active" : ""}`}
                                    onClick={() => setWeeklyChartType("combo")}
                                >
                                    Combo View
                                </button>
                                <button
                                    type="button"
                                    className={`pa2-toggle-btn ${weeklyChartType === "po" ? "active" : ""}`}
                                    onClick={() => setWeeklyChartType("po")}
                                >
                                    PO Spend View
                                </button>
                                <button
                                    type="button"
                                    className={`pa2-toggle-btn ${weeklyChartType === "grn" ? "active" : ""}`}
                                    onClick={() => setWeeklyChartType("grn")}
                                >
                                    GRN Trend View
                                </button>
                            </div>
                        }
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
                    ) : filteredPoRows.length === 0 ? (
                        <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}><PaNoData icon="📊" /></div>
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
                    ) : filteredPoRows.length === 0 ? (
                        <div style={{ height: "250px", display: "flex", alignItems: "center", justifyContent: "center" }}><PaNoData icon="📈" /></div>
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
                    ) : filteredPoRows.length === 0 ? (
                        <div style={{ height: "250px", display: "flex", alignItems: "center", justifyContent: "center" }}><PaNoData icon="🏢" /></div>
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
                {filteredPoRows.length === 0 ? (
                    <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}><PaNoData icon="📦" /></div>
                ) : (
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
                )}
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
                                    return <PaNoData icon="💰" message="No spend records for this period" compact />;
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
                <div className="pa2-table-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", paddingRight: "1.3rem" }}>
                    <SectionHeader icon={<ClipboardList size={16} style={{ color: "#2d6de8" }} />} title="Purchase Order Details" />
                    <div className="pa2-tag-row" style={{ display: "flex", alignItems: "center", gap: "0.8rem", paddingBottom: "0" }}>
                        <div className="pa2-premium-search-box">
                            <Search className="pa2-premium-search-icon" size={14} />
                            <input
                                type="text"
                                className="pa2-premium-search-input"
                                placeholder="Search table..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className="pa2-premium-search-clear"
                                    onClick={() => setSearchQuery("")}
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </div>
                        <span className="pa2-badge pa2-badge-blue" style={{ height: "36px", display: "inline-flex", alignItems: "center", borderRadius: "10px", padding: "0 12px" }}>
                            {poLoading ? "Loading…" : `${filteredPoRows.length} records`}
                        </span>
                    </div>
                </div>
                <div className="pa2-table-scroll">
                    <table className="pa2-po-tbl">
                        <thead>
                            <tr>
                                {renderSortableTh("PO NUMBER", "po_number")}
                                {renderSortableTh("PO TYPE", "po_type")}
                                {renderSortableTh("VENDOR / SUPPLIER", "vendor_name")}
                                {renderSortableTh("MATERIAL", "material", false, true)}
                                {renderSortableTh("QTY", "po_qty", true)}
                                {renderSortableTh("RATE", "rate", true)}
                                {renderSortableTh("VALUE", "value", true)}
                                {renderSortableTh("PO DATE", "po_date")}
                                {renderSortableTh("GRN NO", "grn_no")}
                                {renderSortableTh("GRN DATE", "grn_date")}
                                {renderSortableTh("AMND", "amnd")}
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
                                        <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "50px", height: "13px" }} /></td>
                                        <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "60px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "75px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "70px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "75px", height: "13px" }} /></td>
                                        <td className="pa2-po-td" style={{ textAlign: "center" }}><div className="pa2-skeleton pa2-shimmer" style={{ width: "25px", height: "13px", margin: "0 auto" }} /></td>
                                    </tr>
                                ))
                            )}
                            {!poLoading && sortedFilteredPoRows.length === 0 && (
                                <tr><td colSpan={11} className="pa2-nodata-td-wrap"><PaNoData icon="🛒" compact /></td></tr>
                            )}
                            {!poLoading && sortedFilteredPoRows.map((r, i) => (
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
                                    <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "600", color: "#475569" }}>
                                        {r.rate > 0 ? `₹${r.rate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
                                    </td>
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
                                    <td className="pa2-po-td" style={{ textAlign: "center", fontWeight: "600", color: r.amnd === "Y" ? "#dc2626" : "#64748b" }}>
                                        {r.amnd || "N"}
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
                        <span className="pa2-badge pa2-badge-purple">{amendedPoLoading ? "Loading…" : `${filteredAmendedPoRows.length} amended records`}</span>
                    </div>
                </div>
                <div className="pa2-table-scroll">
                    <table className="pa2-po-tbl">
                        <thead>
                            <tr>
                                <th className="pa2-po-th">PO NUMBER</th>
                                <th className="pa2-po-th">AMND PO NUMBER</th>
                                <th className="pa2-po-th">AMND DATE</th>
                                <th className="pa2-po-th">PO TYPE</th>
                                <th className="pa2-po-th">VENDOR / SUPPLIER</th>
                                <th className="pa2-po-th pa2-po-th--wide">MATERIAL</th>
                                <th className="pa2-po-th pa2-po-th--r">QTY</th>
                                <th className="pa2-po-th pa2-po-th--r">RATE</th>
                                <th className="pa2-po-th pa2-po-th--r">VALUE</th>
                                <th className="pa2-po-th">PO DATE</th>
                                <th className="pa2-po-th">GRN NO</th>
                                <th className="pa2-po-th">GRN DATE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {amendedPoLoading && (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="pa2-po-tr pa2-pulse-loader">
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "65px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "65px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "70px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "110px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "120px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "180px", height: "13px" }} /></td>
                                        <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "40px", height: "13px" }} /></td>
                                        <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "50px", height: "13px" }} /></td>
                                        <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "60px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "75px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "70px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "75px", height: "13px" }} /></td>
                                    </tr>
                                ))
                            )}
                            {!amendedPoLoading && filteredAmendedPoRows.length === 0 && (
                                <tr><td colSpan={12} className="pa2-nodata-td-wrap"><PaNoData icon="✏️" compact /></td></tr>
                            )}
                            {!amendedPoLoading && filteredAmendedPoRows.map((r, i) => (
                                <tr key={i} className="pa2-po-tr">
                                    <td className="pa2-po-td pa2-po-link">{r.po_number}</td>
                                    <td className="pa2-po-td pa2-po-link" style={{ color: "#8b5cf6" }}>{r.po_amnd_no || "–"}</td>
                                    <td className="pa2-po-td pa2-po-date">
                                        {r.po_amnd_date ? r.po_amnd_date.split("-").reverse().join(" ").replace(/^(\d+) (\d+) /, (_, d, m) => `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} `) : "–"}
                                    </td>
                                    <td className="pa2-po-td">
                                        <span className="pa2-po-type-badge" style={{ background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.15)", color: "#8b5cf6" }}>
                                            {r.po_type || "–"}
                                        </span>
                                    </td>
                                    <td className="pa2-po-td pa2-po-vendor">{r.vendor_name || "–"}</td>
                                    <td className="pa2-po-td pa2-po-material">
                                        {r.material_code
                                            ? <><span className="pa2-po-matcode">{r.material_code}</span>{" – "}{r.material.replace(/^[^-]+-\s*/, "")}</>
                                            : r.material || "–"}
                                    </td>
                                    <td className="pa2-po-td pa2-po-td--r">{r.po_qty || "–"}</td>
                                    <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "600", color: "#475569" }}>
                                        {r.rate > 0 ? `₹${r.rate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "–"}
                                    </td>
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
                            placeholder="Search by Supplier, Ind No, PO No, Material, GRN No, PO Type..."
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
                                <th className="pa2-po-th">Ind No</th>
                                <th className="pa2-po-th">Ind Date</th>
                                <th className="pa2-po-th">PO No</th>
                                <th className="pa2-po-th">Po Date</th>
                                <th className="pa2-po-th">Po Type</th>
                                <th className="pa2-po-th">Supplier Name</th>
                                <th className="pa2-po-th pa2-po-th--wide">Material</th>
                                <th className="pa2-po-th pa2-po-th--r">Po Qty</th>
                                <th className="pa2-po-th pa2-po-th--r">Po Rate</th>
                                <th className="pa2-po-th pa2-po-th--r">Po value</th>
                                <th className="pa2-po-th" style={{ textAlign: "center" }}>Approved Status</th>
                                <th className="pa2-po-th">Grn No</th>
                                <th className="pa2-po-th">Grn Date</th>
                                <th className="pa2-po-th pa2-po-th--wide">Grn Material</th>
                                <th className="pa2-po-th pa2-po-th--r">GRN Ok Qty</th>
                                <th className="pa2-po-th pa2-po-th--r">Grn Rate</th>
                                <th className="pa2-po-th pa2-po-th--r">Grn Value</th>
                                <th className="pa2-po-th" style={{ textAlign: "center" }}>Amnd</th>
                            </tr>
                        </thead>
                        <tbody>
                            {traceLoading && (
                                Array.from({ length: 4 }).map((_, idx) => (
                                    <tr key={idx} className="pa2-po-tr pa2-pulse-loader">
                                        {Array.from({ length: 19 }).map((__, tdIdx) => (
                                            <td key={tdIdx} className="pa2-po-td">
                                                <div className="pa2-skeleton pa2-shimmer" style={{ width: tdIdx === 0 ? "15px" : "55px", height: "12px" }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                            {!traceLoading && filteredTraceData.length === 0 && (
                                <tr>
                                    <td colSpan={19} className="pa2-nodata-td-wrap"><PaNoData icon="🔍" message="No traceability records found" compact /></td>
                                </tr>
                            )}
                            {!traceLoading && filteredTraceData.map((row, i) => (
                                <tr key={i} className="pa2-po-tr">
                                    <td className="pa2-po-td pa2-po-dash">{row.sno}</td>
                                    <td className="pa2-po-td" style={{ fontWeight: "600", color: "#2d6de8" }}>{row.indNo}</td>
                                    <td className="pa2-po-td pa2-po-date">{row.indDt}</td>
                                    <td className="pa2-po-td" style={{ fontWeight: "600", color: "#10b981" }}>{row.indPoNo}</td>
                                    <td className="pa2-po-td pa2-po-date">{row.poDt}</td>
                                    <td className="pa2-po-td">
                                        <span className="pa2-po-type-badge" style={{ background: "rgba(45, 109, 232, 0.08)", border: "1px solid rgba(45, 109, 232, 0.15)", color: "#2d6de8", fontWeight: "700" }}>{row.poType}</span>
                                    </td>
                                    <td className="pa2-po-td pa2-po-vendor" style={{ whiteSpace: "nowrap" }}>{row.supplierName}</td>
                                    <td className="pa2-po-td pa2-po-material" style={{ fontWeight: "600", whiteSpace: "nowrap" }}>{row.material}</td>
                                    <td className="pa2-po-td pa2-po-td--r">{row.poQty.toLocaleString()}</td>
                                    <td className="pa2-po-td pa2-po-td--r">₹{row.poRate}</td>
                                    <td className="pa2-po-td pa2-po-td--r pa2-po-value">₹{row.poValue.toLocaleString("en-IN")}</td>
                                    <td className="pa2-po-td" style={{ textAlign: "center", fontWeight: "600", color: row.approvedStatus === "Y" ? "#10b981" : "#64748b" }}>
                                        {row.approvedStatus || "N"}
                                    </td>
                                    <td className="pa2-po-td" style={{ fontWeight: "600", color: "#f5a623" }}>{row.grnNo}</td>
                                    <td className="pa2-po-td pa2-po-date">{row.grnDt}</td>
                                    <td className="pa2-po-td pa2-po-material" style={{ fontWeight: "600", whiteSpace: "nowrap" }}>{row.grnMaterial}</td>
                                    <td className="pa2-po-td pa2-po-td--r">{row.grnOky.toLocaleString()}</td>
                                    <td className="pa2-po-td pa2-po-td--r">₹{row.grnRate}</td>
                                    <td className="pa2-po-td pa2-po-td--r pa2-po-value">₹{row.grnValue.toLocaleString("en-IN")}</td>
                                    <td className="pa2-po-td" style={{ textAlign: "center", fontWeight: "600", color: row.amnd === "Y" ? "#dc2626" : "#64748b" }}>
                                        {row.amnd || "N"}
                                    </td>
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
                        badge="Early Closures"
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
                                    <th className="pa2-po-th">SHORT CLOSE USER</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shortCloseLoading && (
                                    [1, 2, 3].map(i => (
                                        <tr key={i} className="pa2-po-tr pa2-pulse-loader">
                                            <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "20px", height: "13px" }} /></td>
                                            <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "65px", height: "13px" }} /></td>
                                            <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "70px", height: "13px" }} /></td>
                                            <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "110px", height: "13px" }} /></td>
                                            <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "140px", height: "13px" }} /></td>
                                            <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "30px", height: "13px" }} /></td>
                                            <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "40px", height: "13px" }} /></td>
                                            <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "120px", height: "13px" }} /></td>
                                            <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "70px", height: "13px" }} /></td>
                                        </tr>
                                    ))
                                )}
                                {!shortCloseLoading && filteredShortCloseRows.length === 0 && (
                                    <tr><td colSpan={9} className="pa2-nodata-td-wrap"><PaNoData icon="📉" compact /></td></tr>
                                )}
                                {!shortCloseLoading && filteredShortCloseRows.map((row, i) => (
                                    <tr key={i} className="pa2-po-tr">
                                        <td className="pa2-po-td pa2-po-dash">{row.sno}</td>
                                        <td className="pa2-po-td" style={{ fontWeight: "600", color: "#2d6de8", whiteSpace: "nowrap" }}>{row.po_number}</td>
                                        <td className="pa2-po-td pa2-po-date">
                                            {row.po_date ? row.po_date.split("-").reverse().join(" ").replace(/^(\d+) (\d+) /, (_, d, m) => `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} `) : "–"}
                                        </td>
                                        <td className="pa2-po-td pa2-po-vendor" style={{ whiteSpace: "nowrap" }}>{row.supplier_name || "–"}</td>
                                        <td className="pa2-po-td" style={{ fontWeight: "600", whiteSpace: "nowrap" }}>{row.material || "–"}</td>
                                        <td className="pa2-po-td">{row.uom}</td>
                                        <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "700", color: "#f5a623" }}>{row.short_close_qty.toLocaleString()}</td>
                                        <td className="pa2-po-td" style={{ color: "#64748b", fontSize: "0.78rem" }}>{row.reason || "–"}</td>
                                        <td className="pa2-po-td" style={{ color: "#475569", fontWeight: "600", fontSize: "0.78rem" }}>{row.short_close_user || "–"}</td>
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
                                    <th className="pa2-po-th pa2-po-th--r">COST TREND %</th>
                                    <th className="pa2-po-th pa2-po-th--r">COST DIFF</th>
                                </tr>
                            </thead>
                            <tbody>
                                {priceTrendLoading && (
                                    [1, 2, 3].map(i => (
                                        <tr key={i} className="pa2-po-tr pa2-pulse-loader">
                                            <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "20px", height: "13px" }} /></td>
                                            <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "150px", height: "13px" }} /></td>
                                            <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "60px", height: "13px" }} /></td>
                                            <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "50px", height: "13px" }} /></td>
                                            <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "45px", height: "13px", marginLeft: "auto" }} /></td>
                                            <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "40px", height: "13px" }} /></td>
                                        </tr>
                                    ))
                                )}
                                {!priceTrendLoading && filteredPriceTrendRows.length === 0 && (
                                    <tr><td colSpan={6} className="pa2-nodata-td-wrap"><PaNoData icon="💹" compact /></td></tr>
                                )}
                                {!priceTrendLoading && filteredPriceTrendRows.map((row, i) => (
                                    <tr key={i} className="pa2-po-tr">
                                        <td className="pa2-po-td pa2-po-dash">{row.sno}</td>
                                        <td className="pa2-po-td pa2-po-vendor" style={{ fontWeight: "700", whiteSpace: "nowrap" }}>{row.partDesc}</td>
                                        <td className="pa2-po-td" style={{ whiteSpace: "nowrap" }}>{row.month}</td>
                                        <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "600" }}>₹{row.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td className="pa2-po-td pa2-po-td--r">
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
                                            {row.type === "up" ? `+₹${row.diff.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : row.type === "down" ? `-₹${row.diff.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹0.00"}
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
                    <SectionHeader
                        icon={<AlertTriangle size={16} style={{ color: "#ef4444" }} />}
                        title="Management Alerts"
                        badge={alertsData?.alerts?.length ? `${alertsData.alerts.length} Action Needed` : "0 Alerts"}
                        badgeCls="pa2-badge-red"
                    />
                    <div className="pa2-alert-list">
                        {alertsLoading && (
                            [1, 2, 3].map(i => (
                                <div className="pa2-alert-row pa2-pulse-loader" key={i}>
                                    <div className="pa2-skeleton pa2-shimmer" style={{ width: "20px", height: "20px", borderRadius: "50%" }} />
                                    <div className="pa2-alert-body" style={{ display: "flex", flexDirection: "column", gap: "6px", marginLeft: "10px" }}>
                                        <div className="pa2-skeleton pa2-shimmer" style={{ width: "120px", height: "12px" }} />
                                        <div className="pa2-skeleton pa2-shimmer" style={{ width: "220px", height: "10px" }} />
                                    </div>
                                    <div className="pa2-skeleton pa2-shimmer" style={{ width: "40px", height: "10px", marginLeft: "auto" }} />
                                </div>
                            ))
                        )}
                        {!alertsLoading && (alertsData?.alerts ?? []).map((a, i) => (
                            <div className={`pa2-alert-row pa2-alert-${a.urgency}`} key={i}>
                                <span className="pa2-alert-icon" style={{ display: "inline-flex", alignItems: "center" }}>{a.icon}</span>
                                <div className="pa2-alert-body">
                                    <div className="pa2-alert-title">{a.title}</div>
                                    <div className="pa2-alert-sub">{a.sub}</div>
                                </div>
                                <span className="pa2-alert-time">{a.time}</span>
                            </div>
                        ))}
                        {!alertsLoading && (!alertsData?.alerts || alertsData.alerts.length === 0) && (
                            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No alerts found for this period</div>
                        )}
                    </div>
                    {!alertsLoading && alertsData?.key_action && (
                        <div className="pa2-priority-box">
                            <div className="pa2-priority-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Pin size={14} style={{ color: "#2d6de8", transform: "rotate(45deg)" }} /> Key Management Action
                            </div>
                            <p className="pa2-priority-body">
                                {alertsData.key_action}
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}