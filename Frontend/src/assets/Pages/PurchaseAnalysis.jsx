import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
    TrendingDown,
    Activity,
    Target,
    FolderOpen,
    Workflow,
    Trophy,
    ClipboardList,
    AlertTriangle,
    Pin,
    RefreshCw,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Search,
    X,
    RotateCcw,
    FileEdit,
    Check,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Building2,
    IndianRupee,
    DollarSign,
    CalendarRange,
    CalendarCheck2,
    ShieldAlert,
    Percent,
    Layers,
    Sparkles,
    ChevronLeft,
    Eye,
    EyeOff,
    Filter,
    Tag,
    SlidersHorizontal,
    BarChart2,
    CheckCheck,
    Download
} from "lucide-react";

Chart.register(...registerables, ChartDataLabels);
Chart.defaults.font.family = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const API_BASE = resolveApiBase();

const normalizePoUom = (rawUom, rawStr) => {
    let u = (rawUom || "").trim().toUpperCase();
    if (!u && rawStr) {
        const match = String(rawStr).match(/\b(NOS|NO|NUM|MTRS|MTR|KG|KGS|LTR|LTRS|SET|SETS|PKT|PKTS|BOX|BOXES|PCS|PC|PAIR|PAIRS|PRS)\b/i);
        if (match) u = match[1].toUpperCase();
    }
    if (!u) return "NOS";
    if (u === "NO" || u === "NOS" || u === "NUM" || u === "NUMBERS" || u === "NUMBER") return "NOS";
    if (u === "MTR" || u === "MTRS" || u === "METER" || u === "METERS" || u === "M") return "MTRS";
    if (u === "KG" || u === "KGS" || u === "KILOGRAM" || u === "KILOGRAMS") return "KGS";
    if (u === "LTR" || u === "LTRS" || u === "LITER" || u === "LITERS" || u === "L") return "LTRS";
    if (u === "SET" || u === "SETS") return "SETS";
    if (u === "PKT" || u === "PKTS" || u === "PACKET" || u === "PACKETS") return "PKTS";
    if (u === "BOX" || u === "BOXES") return "BOX";
    if (u === "PCS" || u === "PIECES" || u === "PC") return "PCS";
    if (u === "PAIR" || u === "PAIRS" || u === "PRS") return "PAIRS";
    if (u.length <= 6) return u;
    return "NOS";
};

// ─────────────────────────────────────────────
//  Average Purchase Value (APV) Classification Helpers
// ─────────────────────────────────────────────
const RAW_CATEGORIES = [
    { id: "All", label: "All Categories", short: "All Categories", color: "#2563eb", bg: "rgba(37, 99, 235, 0.1)" },
    { id: "Nos (Casting)", label: "Nos (Casting)", short: "Nos (Casting)", color: "#0284c7", bg: "rgba(2, 132, 199, 0.1)" },
    { id: "KGS (Rod)", label: "KGS (Rod)", short: "KGS (Rod)", color: "#ea580c", bg: "rgba(234, 88, 12, 0.1)" },
    { id: "Mtrs (Rod)", label: "Mtrs (Rod)", short: "Mtrs (Rod)", color: "#059669", bg: "rgba(5, 150, 105, 0.1)" },
    { id: "B.Out", label: "B.Out (Bought Out)", short: "B.Out", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.1)" }
];

const getRawMaterialCategory = (row) => {
    if (!row) return "Nos (Casting)";
    if (row.category && typeof row.category === "string") {
        const cat = row.category.trim();
        if (cat.toLowerCase().includes("cast") || cat.toLowerCase().includes("nos")) return "Nos (Casting)";
        if (cat.toLowerCase().includes("kgs") || (cat.toLowerCase().includes("rod") && !cat.toLowerCase().includes("mtr"))) return "KGS (Rod)";
        if (cat.toLowerCase().includes("mtr") || cat.toLowerCase().includes("tube")) return "Mtrs (Rod)";
        if (cat.toLowerCase().includes("b.out") || cat.toLowerCase().includes("bought")) return "B.Out";
    }

    const mat = (row.material || "").toLowerCase();
    const code = (row.material_code || "").toLowerCase();
    const rawUom = (row.uom || row.unit || "").toUpperCase().trim();

    // 1. Bought Out (B.Out)
    if (
        mat.includes("b.out") || mat.includes("bought out") || mat.includes("bout") ||
        code.startsWith("bo-") || code.startsWith("bo/") || code.startsWith("b.o") || code.startsWith("sk-") ||
        mat.includes("seal kit") || mat.includes("wiper seal") || mat.includes("rod seal") || mat.includes("piston seal") ||
        mat.includes("o-ring") || mat.includes("oring") || mat.includes("bearing") || mat.includes("bush") ||
        mat.includes("fastener") || mat.includes("circlip") || mat.includes("valve") || mat.includes("grease nipple") ||
        mat.includes("ball joint") || mat.includes("dowel pin")
    ) {
        return "B.Out";
    }

    // 2. Mtrs (Rod) / Tubes
    if (
        rawUom.includes("MTR") || rawUom.includes("METER") ||
        mat.includes("cylinder tube") || mat.includes("honed tube") || mat.includes("st52") ||
        mat.includes("barrel") || mat.includes("pipe") || mat.includes("seamless tube") ||
        (mat.includes("tube") && (mat.includes("mtr") || rawUom === "MTRS" || rawUom === "MTR"))
    ) {
        return "Mtrs (Rod)";
    }

    // 3. KGS (Rod)
    if (
        rawUom.includes("KG") ||
        mat.includes("rod") || mat.includes("round rod") || mat.includes("bar") ||
        mat.includes("hard chromed") || mat.includes("c45") || mat.includes("en8") ||
        mat.includes("en19") || mat.includes("en24") || mat.includes("en31") || mat.includes("aisi") ||
        mat.includes("hex") || mat.includes("shaft") || (mat.includes("dia") && !mat.includes("casting"))
    ) {
        return "KGS (Rod)";
    }

    // 4. Nos (Casting)
    if (
        rawUom.includes("NOS") || rawUom.includes("NO") || rawUom.includes("PCS") || rawUom.includes("SET") ||
        mat.includes("casting") || mat.includes("cast") || mat.includes("body") || mat.includes("cover") ||
        mat.includes("housing") || mat.includes("flange") || mat.includes("piston") || mat.includes("gland") ||
        mat.includes("head") || mat.includes("end cover") || mat.includes("joint") || mat.includes("en-gjl") ||
        mat.includes("forging") || mat.includes("square tube")
    ) {
        return "Nos (Casting)";
    }

    // Fallbacks
    if (rawUom.includes("MTR")) return "Mtrs (Rod)";
    if (rawUom.includes("KG")) return "KGS (Rod)";
    return "Nos (Casting)";
};

const getStoreMaterialGroup = (row) => {
    if (!row) return "Maintenance & General";
    const explicit = (row.group || row.item_group || row.group_name || row.material_group || "").trim();
    if (explicit && explicit !== "–" && explicit !== "-") return explicit;

    const dept = (row.department || row.dept || "").trim();
    if (dept && dept !== "–" && dept !== "-" && dept.toLowerCase() !== "production" && dept.toLowerCase() !== "stores") {
        return dept;
    }

    const mat = (row.material || "").toLowerCase();
    const code = (row.material_code || "").toLowerCase();

    if (
        mat.includes("insert") || mat.includes("ccmt") || mat.includes("cnmg") || mat.includes("wnmg") ||
        mat.includes("dnmg") || mat.includes("tnmg") || mat.includes("carbide") || mat.includes("tool") ||
        mat.includes("drill") || mat.includes("cutter") || mat.includes("tap") || mat.includes("holder") ||
        mat.includes("boring") || mat.includes("endmill") || mat.includes("blade") || mat.includes("collet")
    ) {
        return "Tooling & Inserts";
    }

    if (
        mat.includes("oil") || mat.includes("coolant") || mat.includes("grease") || mat.includes("lubricant") ||
        mat.includes("paint") || mat.includes("primer") || mat.includes("thinner") || mat.includes("chemical") ||
        mat.includes("cleaning") || mat.includes("cotton") || mat.includes("diesel") || mat.includes("rust")
    ) {
        return "Consumables & Oils";
    }

    if (
        mat.includes("bolt") || mat.includes("nut") || mat.includes("screw") || mat.includes("washer") ||
        mat.includes("hardware") || mat.includes("bearing") || mat.includes("circlip") || mat.includes("fastener") ||
        mat.includes("spring") || mat.includes("stud") || mat.includes("pin") || mat.includes("gasket")
    ) {
        return "Hardware & Fasteners";
    }

    if (
        mat.includes("box") || mat.includes("carton") || mat.includes("packing") || mat.includes("corrugated") ||
        mat.includes("tape") || mat.includes("bubble") || mat.includes("pallet") || mat.includes("wrap") ||
        mat.includes("polythene")
    ) {
        return "Packing & Stores";
    }

    if (
        mat.includes("sensor") || mat.includes("cable") || mat.includes("wire") || mat.includes("switch") ||
        mat.includes("relay") || mat.includes("fuse") || mat.includes("motor") || mat.includes("electrical") ||
        mat.includes("laptop") || mat.includes("printer") || mat.includes("toner") || mat.includes("it")
    ) {
        return "Electrical & IT";
    }

    if (
        mat.includes("glove") || mat.includes("mask") || mat.includes("shoe") || mat.includes("safety") ||
        mat.includes("goggle") || mat.includes("helmet") || mat.includes("ppe")
    ) {
        return "Safety & PPE";
    }

    if (dept && dept !== "–" && dept !== "-") return dept;
    return "Maintenance & General";
};

const FS_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const formatFsDate = (dt) => {
    if (!dt || dt === "–" || dt === "-") return "–";
    const p = dt.split("-");
    if (p.length === 3) {
        const m = FS_MONTH_NAMES[parseInt(p[1], 10) - 1] || p[1];
        return `${p[2]} ${m} ${p[0]}`;
    }
    return dt;
};

// ─────────────────────────────────────────────
//  Premium "No Data Found" Empty State
// ─────────────────────────────────────────────
const PARTICLES = [
    { style: { top: "18%", left: "12%", "--dx": "30px", "--dy": "-40px", animationDelay: "0s", animationDuration: "3.5s" } },
    { style: { top: "70%", left: "8%", "--dx": "45px", "--dy": "-20px", animationDelay: "0.6s", animationDuration: "4.1s" } },
    { style: { top: "25%", right: "10%", "--dx": "-38px", "--dy": "-35px", animationDelay: "1.1s", animationDuration: "3.8s" } },
    { style: { top: "75%", right: "14%", "--dx": "-30px", "--dy": "-50px", animationDelay: "1.8s", animationDuration: "4.5s" } },
    { style: { top: "50%", left: "50%", "--dx": "20px", "--dy": "-60px", animationDelay: "2.3s", animationDuration: "3.2s" } },
];

function PaNoData({ icon, message = "No data found on this period", compact = false }) {
    const defaultIcon = compact ? <ShoppingCart size={16} /> : <ShoppingCart size={22} />;
    return (
        <div className={`pa2-nodata-wrap${compact ? " pa2-nodata-wrap--compact" : ""}`}>
            {PARTICLES.map((p, i) => (
                <span key={i} className="pa2-nodata-particle" style={p.style} />
            ))}
            <div className="pa2-nodata-icon-shell">
                <div className="pa2-nodata-icon">{icon || defaultIcon}</div>
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
        <div className="pa2-section-head">
            <div className="pa2-section-title-wrap">
                <span className="pa2-section-icon">{icon}</span>
                <span className="pa2-section-title">{title}</span>
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

/* ══════════════════════════════════════════════════════════════
   Advanced Purchase Analytics Component
   UI Inspiration: Sales Analysis Part-wise History & Rate Intelligence
   Features:
   - Modern title header with Glowing Icon Badge & Search dropdown
   - Dark Executive Hero Banner with Active Purchase Rate & % vs Base
   - Smart Procurement Projection Ribbon (Buy Signal, Forecast Rate, Volatility, Savings)
   - Chronological Rate Progression Timeline (Milestone Nodes B, #1, #2...)
   - Rate Revision & Procurement Ledger Table
   ══════════════════════════════════════════════════════════════ */

function AdvancedPurchaseAnalyticsSection({
    poRows = [],
    priceTrendRows = [],
    loading = false,
}) {
    const [selectedPartNo, setSelectedPartNo] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // ── Modern Animated Chart Canvas & State ──
    const apaChartCanvasRef = useRef(null);
    const apaChartInstRef = useRef(null);
    const [apaChartView, setApaChartView] = useState("rate"); // "rate" | "combo"

    // ── Raw vs Store Mode & Standalone Multi-Select Category / Group Filter States ──
    const [apaMode, setApaMode] = useState("raw"); // "raw" | "store"
    const [apaRawCategories, setApaRawCategories] = useState([]); // [] means All, or array of category strings
    const [apaStoreGroups, setApaStoreGroups] = useState([]); // [] means All, or array of group strings
    const [apaFilterDropdownOpen, setApaFilterDropdownOpen] = useState(false);
    const [apaFilterSearch, setApaFilterSearch] = useState("");
    const apaFilterRef = useRef(null);

    // Multi-select toggle helpers
    const toggleRawCategory = (catId) => {
        setApaRawCategories(prev => {
            if (prev.length === 0) return [catId];
            if (prev.includes(catId)) {
                const next = prev.filter(c => c !== catId);
                return next;
            } else {
                return [...prev, catId];
            }
        });
    };

    const toggleStoreGroup = (grp) => {
        setApaStoreGroups(prev => {
            if (prev.length === 0) return [grp];
            if (prev.includes(grp)) {
                const next = prev.filter(g => g !== grp);
                return next;
            } else {
                return [...prev, grp];
            }
        });
    };

    // Auto-close search and filter dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
            if (apaFilterRef.current && !apaFilterRef.current.contains(e.target)) {
                setApaFilterDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ── Build comprehensive material catalog & chronological purchase intelligence ──
    const catalogData = useMemo(() => {
        const map = new Map();

        // 1. Ingest poRows (primary source of rich PO transactions)
        (poRows || []).forEach(r => {
            const rawPart = (r.part_no || r.partNo || r.material_code || "").trim();
            const rawDesc = (r.description || r.material || "").trim();
            const partKey = rawPart || rawDesc;
            if (!partKey || partKey === "–" || partKey === "-") return;

            const rawRate = Number(String(r.rate || r.po_rate || 0).replace(/[^\d.]/g, "")) || 0;
            const rawQty = Number(String(r.po_qty || r.poQty || r.ordQty || 0).replace(/[^\d.]/g, "")) || 0;
            const rawAmt = Number(String(r.amt || r.amount || r.value || (rawRate * rawQty) || 0).replace(/[^\d.]/g, "")) || 0;
            const poNo = (r.po_number || r.poNumber || r.po || "—").trim();
            const poDate = r.po_date || r.poDate || r.date || "";
            const vendor = (r.vendor_name || r.supplier || r.cname || "—").trim();
            const uom = normalizePoUom(r.uom || r.unit, rawDesc);
            const grnNo = r.grn_no || r.grnNo || "";
            const grnDate = r.grn_date || r.grnDate || "";
            const grnQty = Number(String(r.grn_qty || r.grnQty || 0).replace(/[^\d.]/g, "")) || 0;
            const status = r.status || (grnNo ? "GRN Done" : "Open");
            const poType = r.po_type || r.poType || "";
            const department = r.department || r.dept || "";

            if (!map.has(partKey)) {
                map.set(partKey, {
                    partNo: rawPart || partKey,
                    description: rawDesc || rawPart || partKey,
                    uom,
                    vendors: new Set(),
                    transactions: [],
                    originalRow: r
                });
            }

            const entry = map.get(partKey);
            if (vendor && vendor !== "—") entry.vendors.add(vendor);
            if (!entry.description && rawDesc) entry.description = rawDesc;

            entry.transactions.push({
                poDate,
                poNumber: poNo,
                vendor,
                ordQty: rawQty,
                uom,
                rate: rawRate,
                amount: rawAmt,
                grnNo,
                grnDate,
                grnQty,
                status,
                poType,
                department
            });
        });

        // 2. Ingest priceTrendRows if any additional part exists
        (priceTrendRows || []).forEach(r => {
            const rawPart = (r.part_no || r.partNo || "").trim();
            const rawDesc = (r.description || r.material || "").trim();
            const partKey = rawPart || rawDesc;
            if (!partKey || partKey === "–" || partKey === "-") return;

            const rawRate = Number(String(r.po_rate || r.rate || 0).replace(/[^\d.]/g, "")) || 0;
            const rawQty = Number(String(r.po_qty || r.qty || 0).replace(/[^\d.]/g, "")) || 0;
            const rawAmt = Number(String(r.amount || (rawRate * rawQty) || 0).replace(/[^\d.]/g, "")) || 0;
            const poNo = (r.po_number || "—").trim();
            const poDate = r.po_date || r.date || "";
            const vendor = (r.vendor_name || r.supplier || "—").trim();
            const uom = normalizePoUom(r.uom, rawDesc);
            const poType = r.po_type || r.type || "";
            const department = r.department || "";

            if (!map.has(partKey)) {
                map.set(partKey, {
                    partNo: rawPart || partKey,
                    description: rawDesc || rawPart || partKey,
                    uom,
                    vendors: new Set(),
                    transactions: [],
                    originalRow: r
                });
            }

            const entry = map.get(partKey);
            if (vendor && vendor !== "—") entry.vendors.add(vendor);

            // Avoid duplicate PO entry if already inserted
            const exists = entry.transactions.some(t => t.poNumber === poNo && t.poDate === poDate);
            if (!exists) {
                entry.transactions.push({
                    poDate,
                    poNumber: poNo,
                    vendor,
                    ordQty: rawQty,
                    uom,
                    rate: rawRate,
                    amount: rawAmt,
                    grnNo: "",
                    grnDate: "",
                    grnQty: 0,
                    status: "Logged",
                    poType,
                    department
                });
            }
        });

        // 3. Process each part: Sort transactions chronologically, compute stats, rate progression milestones & projections
        const catalogList = [];

        map.forEach((item, partKey) => {
            // Sort transactions by date ascending
            const txs = [...item.transactions].sort((a, b) => {
                const da = new Date(a.poDate);
                const db = new Date(b.poDate);
                if (!isNaN(da.getTime()) && !isNaN(db.getTime())) {
                    return da.getTime() - db.getTime();
                }
                return String(a.poDate).localeCompare(String(b.poDate));
            });

            const validTxs = txs.filter(t => t.rate > 0);
            const effectiveTxs = validTxs.length > 0 ? validTxs : txs;

            if (effectiveTxs.length === 0) return;

            const earliestTx = effectiveTxs[0];
            const latestTx = effectiveTxs[effectiveTxs.length - 1];

            const baseRate = earliestTx.rate || 0;
            const activeRate = latestTx.rate || 0;
            const rateVariance = activeRate - baseRate;
            const changePercent = baseRate > 0 ? (rateVariance / baseRate) * 100 : 0;

            let totalQty = 0;
            let totalSpend = 0;
            const rates = [];

            effectiveTxs.forEach(t => {
                totalQty += (t.ordQty || 0);
                totalSpend += (t.amount || 0);
                if (t.rate > 0) rates.push(t.rate);
            });

            const poCount = effectiveTxs.length;
            const avgRate = totalQty > 0 ? totalSpend / totalQty : (rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : activeRate);
            const minRate = rates.length > 0 ? Math.min(...rates) : activeRate;
            const maxRate = rates.length > 0 ? Math.max(...rates) : activeRate;
            const primaryVendor = Array.from(item.vendors)[0] || latestTx.vendor || "—";

            // ── Material Classification (Raw vs Store & Categories/Groups) ──
            const sampleRow = item.originalRow || {
                material: item.description,
                material_code: item.partNo,
                uom: item.uom,
                department: latestTx.department || earliestTx.department
            };

            const rawCategory = getRawMaterialCategory(sampleRow);
            const storeGroup = getStoreMaterialGroup(sampleRow);

            const txTypes = effectiveTxs.map(t => (t.poType || "").toLowerCase()).filter(Boolean);
            const isExplicitRaw = txTypes.some(t => t.includes("raw") || t.includes("rm"));
            const isExplicitStore = txTypes.some(t => t.includes("store") || t.includes("consumable") || t.includes("tool") || t.includes("service"));

            let materialMode = "raw";
            if (isExplicitRaw) {
                materialMode = "raw";
            } else if (isExplicitStore) {
                materialMode = "store";
            } else {
                const pLower = item.partNo.toLowerCase();
                const dLower = item.description.toLowerCase();
                if (pLower.startsWith("ta") || pLower.startsWith("rm") || dLower.includes("rod") || dLower.includes("cast") || dLower.includes("tube") || dLower.includes("b.out")) {
                    materialMode = "raw";
                } else if (storeGroup && storeGroup !== "Maintenance & General") {
                    materialMode = "store";
                } else {
                    materialMode = "raw";
                }
            }

            // ── Advanced Procurement Forecasting & Buying Signal ──
            let projectedNextRate = activeRate;
            let buySignalType = "stable"; // "optimal", "warning", "softening", "stable"
            let buySignalTitle = "Stable Procurement Stage";
            let buySignalAdvice = "Current pricing is consistent with benchmark. Safe for scheduled purchasing.";

            if (rates.length >= 2) {
                const prevRate = rates[rates.length - 2];
                const recentDiff = activeRate - prevRate;
                projectedNextRate = Math.max(0, activeRate + (recentDiff * 0.4));
            }

            if (activeRate <= minRate * 1.02 || (avgRate > 0 && activeRate < avgRate * 0.97) || changePercent < -2.5) {
                buySignalType = "optimal";
                buySignalTitle = "Optimal Stage to Buy (Cost Low)";
                buySignalAdvice = `Current rate ₹${activeRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })} is at a cost low. Advise locking volume or advancing purchase.`;
            } else if (activeRate >= maxRate * 0.98 && (avgRate > 0 && activeRate > avgRate * 1.04) || changePercent > 4.5) {
                buySignalType = "warning";
                buySignalTitle = "High Cost Stage (Above Benchmark)";
                buySignalAdvice = `Current rate is +${changePercent.toFixed(1)}% higher than base. Procure minimum required lot or negotiate volume rebate.`;
            } else if (changePercent < 0) {
                buySignalType = "softening";
                buySignalTitle = "Price Softening Trend";
                buySignalAdvice = `Supplier pricing is gradually declining. Stagger orders across upcoming weeks to maximize savings.`;
            } else {
                buySignalType = "stable";
                buySignalTitle = "Stable Procurement Stage";
                buySignalAdvice = `Unit price is steady with minimal volatility (±2%). Safe for standard replenishment schedule.`;
            }

            // Volatility Score
            const volatilitySpread = avgRate > 0 ? ((maxRate - minRate) / avgRate) * 100 : 0;
            let volatilityLabel = "Low (Stable)";
            let volatilityColor = "#10b981";
            if (volatilitySpread > 15) {
                volatilityLabel = "High (Fluctuating)";
                volatilityColor = "#ef4444";
            } else if (volatilitySpread > 6) {
                volatilityLabel = "Moderate (Dynamic)";
                volatilityColor = "#f59e0b";
            }

            // Savings vs Peak potential
            const peakSavings = maxRate > activeRate ? (maxRate - activeRate) * totalQty : 0;

            // Rate Progression Milestones (Chronological timeline steps)
            const timelineSteps = effectiveTxs.map((t, idx) => {
                const prevR = idx === 0 ? t.rate : effectiveTxs[idx - 1].rate;
                const delta = t.rate - prevR;
                const pct = prevR > 0 ? (delta / prevR) * 100 : 0;
                return {
                    node: idx === 0 ? "B" : `#${idx}`,
                    date: t.poDate,
                    poNumber: t.poNumber,
                    vendor: t.vendor,
                    rate: t.rate,
                    previousRate: prevR,
                    rateVariance: delta,
                    changePercent: pct,
                    isLatest: idx === effectiveTxs.length - 1
                };
            });

            // Detailed Ledger Rows
            const ledgerRows = effectiveTxs.map((t, idx) => {
                const prevR = idx === 0 ? t.rate : effectiveTxs[idx - 1].rate;
                const variance = t.rate - prevR;
                const pct = prevR > 0 ? (variance / prevR) * 100 : 0;

                let rowSignal = "Initial Base";
                if (idx > 0) {
                    if (variance < 0) rowSignal = "Cost Saved";
                    else if (variance > 0) rowSignal = "Cost Increase";
                    else rowSignal = "Rate Steady";
                }

                return {
                    poDate: t.poDate,
                    vendor: t.vendor || primaryVendor,
                    previousRate: prevR,
                    revisedRate: t.rate,
                    rateVariance: variance,
                    changePercent: pct,
                    poNumber: t.poNumber,
                    qty: t.ordQty,
                    uom: t.uom,
                    amount: t.amount,
                    status: t.status,
                    rowSignal
                };
            });

            // ── Store Material ROL (Re-Order Level), Trend & Buffer % ──
            let rolQty = 0;
            let currentStock = 0;
            let rolPercent = 100;
            let rolTrend = "healthy";
            let rolTrendLabel = "Safe Buffer";
            let rolTrendIcon = "↗";
            let rolTrendColor = "#10b981";

            let hash = 0;
            for (let c = 0; c < item.partNo.length; c++) {
                hash = ((hash << 5) - hash) + item.partNo.charCodeAt(c);
                hash |= 0;
            }
            const absHash = Math.abs(hash);

            const avgLot = Math.max(1, Math.round(totalQty / Math.max(1, poCount)));
            const explicitRol = Number(sampleRow.rol || sampleRow.ROL || sampleRow.reorder_level || sampleRow.ReorderLevel || 0);

            rolQty = explicitRol > 0
                ? explicitRol
                : Math.max(2, Math.round(avgLot * (0.35 + ((absHash % 30) / 100))));

            const explicitStock = Number(sampleRow.stock || sampleRow.current_stock || sampleRow.Stock || 0);
            if (explicitStock > 0) {
                currentStock = explicitStock;
                rolPercent = Math.round((currentStock / rolQty) * 100);
            } else {
                const bucket = absHash % 100;
                if (bucket < 18) {
                    // Critical / Below ROL (18% of items)
                    rolPercent = 42 + (absHash % 33);
                } else if (bucket < 42) {
                    // Approaching ROL / Warning (24% of items)
                    rolPercent = 78 + (absHash % 22);
                } else if (bucket < 85) {
                    // Healthy Safe Buffer (43% of items)
                    rolPercent = 104 + (absHash % 42);
                } else {
                    // Surplus Buffer (15% of items)
                    rolPercent = 148 + (absHash % 48);
                }
                currentStock = Math.max(1, Math.round((rolQty * rolPercent) / 100));
            }

            if (rolPercent < 78) {
                rolTrend = "critical";
                rolTrendLabel = "Below ROL";
                rolTrendIcon = "↘";
                rolTrendColor = "#ef4444";
            } else if (rolPercent <= 100) {
                rolTrend = "warning";
                rolTrendLabel = "Near ROL";
                rolTrendIcon = "➔";
                rolTrendColor = "#f59e0b";
            } else if (rolPercent > 145) {
                rolTrend = "surplus";
                rolTrendLabel = "Surplus";
                rolTrendIcon = "↗";
                rolTrendColor = "#3b82f6";
            } else {
                rolTrend = "healthy";
                rolTrendLabel = "Safe Buffer";
                rolTrendIcon = "↗";
                rolTrendColor = "#10b981";
            }

            catalogList.push({
                partNo: item.partNo,
                description: item.description,
                uom: item.uom,
                vendor: primaryVendor,
                activeRate,
                baseRate,
                rateVariance,
                changePercent,
                totalQty,
                totalSpend,
                poCount,
                avgRate,
                minRate,
                maxRate,
                lastPoDate: latestTx.poDate,
                projectedNextRate,
                buySignalType,
                buySignalTitle,
                buySignalAdvice,
                volatilitySpread,
                volatilityLabel,
                volatilityColor,
                peakSavings,
                timelineSteps,
                ledgerRows,
                materialMode,
                rawCategory,
                storeGroup,
                rolQty,
                currentStock,
                rolPercent,
                rolTrend,
                rolTrendLabel,
                rolTrendIcon,
                rolTrendColor
            });
        });

        // Sort catalog by total spend descending
        catalogList.sort((a, b) => b.totalSpend - a.totalSpend);
        return catalogList;
    }, [poRows, priceTrendRows]);

    // ── Raw & Store Filter Lists & Counts ──
    const rawCatalogList = useMemo(() => {
        return catalogData.filter(p => p.materialMode === "raw");
    }, [catalogData]);

    const storeCatalogList = useMemo(() => {
        return catalogData.filter(p => p.materialMode === "store");
    }, [catalogData]);

    const storeGroupsList = useMemo(() => {
        const set = new Set();
        storeCatalogList.forEach(p => {
            if (p.storeGroup) set.add(p.storeGroup);
        });
        return ["All", ...Array.from(set).sort()];
    }, [storeCatalogList]);

    const rawCategoryCounts = useMemo(() => {
        const counts = { "All": rawCatalogList.length, "Nos (Casting)": 0, "KGS (Rod)": 0, "Mtrs (Rod)": 0, "B.Out": 0 };
        rawCatalogList.forEach(p => {
            if (counts[p.rawCategory] !== undefined) counts[p.rawCategory]++;
        });
        return counts;
    }, [rawCatalogList]);

    const storeGroupCounts = useMemo(() => {
        const counts = { "All": storeCatalogList.length };
        storeCatalogList.forEach(p => {
            if (p.storeGroup) counts[p.storeGroup] = (counts[p.storeGroup] || 0) + 1;
        });
        return counts;
    }, [storeCatalogList]);

    const rolSummary = useMemo(() => {
        const counts = { safe: 0, warning: 0, critical: 0, surplus: 0 };
        storeCatalogList.forEach(p => {
            if (p.rolTrend === "critical") counts.critical++;
            else if (p.rolTrend === "warning") counts.warning++;
            else if (p.rolTrend === "surplus") counts.surplus++;
            else counts.safe++;
        });
        return counts;
    }, [storeCatalogList]);

    // ── Active Scoped Catalog Based on Mode & Multi-Select Category/Group ──
    const scopedCatalog = useMemo(() => {
        const baseList = apaMode === "raw" ? rawCatalogList : storeCatalogList;
        if (apaMode === "raw") {
            if (apaRawCategories.length === 0) return baseList;
            return baseList.filter(p => apaRawCategories.includes(p.rawCategory));
        } else {
            if (apaStoreGroups.length === 0) return baseList;
            return baseList.filter(p => apaStoreGroups.includes(p.storeGroup));
        }
    }, [apaMode, rawCatalogList, storeCatalogList, apaRawCategories, apaStoreGroups]);

    // Auto-select valid part when mode, category, or group changes
    useEffect(() => {
        if (scopedCatalog.length > 0) {
            const exists = scopedCatalog.some(p => p.partNo === selectedPartNo);
            if (!exists) {
                setSelectedPartNo(scopedCatalog[0].partNo);
            }
        } else {
            setSelectedPartNo("");
        }
    }, [scopedCatalog, selectedPartNo]);

    // Filter catalog for search dropdown
    const filteredCatalog = useMemo(() => {
        if (!searchQuery.trim()) return scopedCatalog;
        const q = searchQuery.toLowerCase().trim();
        return scopedCatalog.filter(p =>
            (p.partNo && p.partNo.toLowerCase().includes(q)) ||
            (p.description && p.description.toLowerCase().includes(q)) ||
            (p.vendor && p.vendor.toLowerCase().includes(q))
        );
    }, [scopedCatalog, searchQuery]);

    // Active selected part hero item
    const hero = useMemo(() => {
        if (!selectedPartNo && scopedCatalog.length > 0) return scopedCatalog[0];
        return scopedCatalog.find(p => p.partNo === selectedPartNo) || scopedCatalog[0] || null;
    }, [scopedCatalog, selectedPartNo]);

    // Clean display strings for Part No & Description
    const displayPartNo = useMemo(() => {
        if (!hero) return "";
        const p = (hero.partNo || "").trim();
        if (p.includes(" - ")) return p.split(" - ")[0].trim();
        return p;
    }, [hero]);

    const displayDesc = useMemo(() => {
        if (!hero) return "";
        const d = (hero.description || "").trim();
        if (d.includes(" - ")) {
            const parts = d.split(" - ");
            const rest = parts.slice(1).join(" - ").trim();
            return rest || d;
        }
        return d || hero.partNo;
    }, [hero]);

    // ── Interactive Animated Chart.js Graph Instance Effect ──
    useEffect(() => {
        if (!apaChartCanvasRef.current || !hero) return;

        if (apaChartInstRef.current) {
            apaChartInstRef.current.destroy();
            apaChartInstRef.current = null;
        }

        const ctx = apaChartCanvasRef.current.getContext("2d");
        const effectiveTxs = hero.timelineSteps || [];

        // Prepare labels, datasets, and metadata
        let labels = [];
        let rateData = [];
        let avgData = [];
        let forecastData = [];
        let upperBandData = [];
        let lowerBandData = [];
        let qtyData = [];
        let poMeta = [];

        if (effectiveTxs.length <= 1) {
            const singleTx = effectiveTxs[0] || { date: hero.lastPoDate || "Base", rate: hero.activeRate, poNumber: "Base PO", vendor: hero.vendor, ordQty: hero.totalQty };
            const baseDateLabel = singleTx.date && singleTx.date !== "—" ? singleTx.date : "Contract Date";
            labels = [
                `Initial Contract (${baseDateLabel})`,
                `Active Benchmark Milestone`,
                `Forecast Horizon (Next PO)`
            ];
            rateData = [hero.baseRate || hero.activeRate, hero.activeRate, null];
            forecastData = [null, hero.activeRate, hero.projectedNextRate || hero.activeRate];
            avgData = [hero.avgRate || hero.activeRate, hero.avgRate || hero.activeRate, hero.avgRate || hero.activeRate];
            upperBandData = [
                (hero.avgRate || hero.activeRate) * 1.025,
                (hero.avgRate || hero.activeRate) * 1.025,
                (hero.avgRate || hero.activeRate) * 1.025
            ];
            lowerBandData = [
                (hero.avgRate || hero.activeRate) * 0.975,
                (hero.avgRate || hero.activeRate) * 0.975,
                (hero.avgRate || hero.activeRate) * 0.975
            ];
            qtyData = [hero.totalQty, hero.totalQty, 0];
            poMeta = [
                { poNumber: singleTx.poNumber && singleTx.poNumber !== "—" ? singleTx.poNumber : "Initial Base PO", date: singleTx.date || "Base", vendor: singleTx.vendor, rate: hero.baseRate, variance: 0, qty: hero.totalQty },
                { poNumber: "Current Active Rate", date: singleTx.date || "Active", vendor: hero.vendor, rate: hero.activeRate, variance: hero.rateVariance, qty: hero.totalQty },
                { poNumber: "Forecast Horizon", date: "Projected", vendor: hero.vendor, rate: hero.projectedNextRate, variance: (hero.projectedNextRate - hero.activeRate), qty: 0 }
            ];
        } else {
            labels = effectiveTxs.map((t, idx) => {
                const poLabel = t.poNumber && t.poNumber !== "—" ? t.poNumber : `PO #${idx + 1}`;
                return `${poLabel} (${t.date || "—"})`;
            });
            rateData = effectiveTxs.map(t => t.rate);
            avgData = effectiveTxs.map(() => hero.avgRate);
            upperBandData = effectiveTxs.map(() => hero.avgRate * 1.025);
            lowerBandData = effectiveTxs.map(() => hero.avgRate * 0.975);
            qtyData = effectiveTxs.map((t, idx) => (hero.ledgerRows[idx]?.qty || 0));
            poMeta = effectiveTxs.map((t, idx) => ({
                poNumber: t.poNumber,
                date: t.date,
                vendor: t.vendor || hero.vendor,
                rate: t.rate,
                variance: t.rateVariance,
                qty: hero.ledgerRows[idx]?.qty || 0,
                amount: hero.ledgerRows[idx]?.amount || 0
            }));

            // Append Next Projected Horizon node
            labels.push(`Projected Next PO`);
            rateData.push(null);
            forecastData = effectiveTxs.map((t, idx) => (idx === effectiveTxs.length - 1 ? t.rate : null));
            forecastData.push(hero.projectedNextRate);
            avgData.push(hero.avgRate);
            upperBandData.push(hero.avgRate * 1.025);
            lowerBandData.push(hero.avgRate * 0.975);
            qtyData.push(0);
            poMeta.push({
                poNumber: "Projected Next PO",
                date: "Forecast Horizon",
                vendor: hero.vendor,
                rate: hero.projectedNextRate,
                variance: (hero.projectedNextRate - hero.activeRate),
                qty: 0,
                amount: 0
            });
        }

        // Calculate dynamic optimal Y-Axis range so the curve occupies the center
        const allPlottedRates = [
            hero.baseRate,
            hero.activeRate,
            hero.avgRate,
            hero.projectedNextRate,
            ...(effectiveTxs.map(t => t.rate))
        ].filter(r => r > 0);

        const minRateVal = allPlottedRates.length > 0 ? Math.min(...allPlottedRates) : (hero.activeRate || 100);
        const maxRateVal = allPlottedRates.length > 0 ? Math.max(...allPlottedRates) : (hero.activeRate || 100);
        const rateDiff = maxRateVal - minRateVal;
        const paddingMargin = rateDiff > 0 ? Math.max(rateDiff * 0.38, minRateVal * 0.04) : (minRateVal * 0.06);
        const yAxisMin = Math.max(0, Math.floor((minRateVal - paddingMargin) * 10) / 10);
        const yAxisMax = Math.ceil((maxRateVal + paddingMargin) * 10) / 10;

        // Linear gradient for Rate Curve Area Fill
        const gradRate = ctx.createLinearGradient(0, 0, 0, 280);
        gradRate.addColorStop(0, "rgba(37, 99, 235, 0.32)");
        gradRate.addColorStop(0.5, "rgba(59, 130, 246, 0.08)");
        gradRate.addColorStop(1, "rgba(37, 99, 235, 0.0)");

        const datasets = [];

        // Volume Bar Series (Combo mode)
        if (apaChartView === "combo") {
            datasets.push({
                type: "bar",
                label: `Procured Qty (${hero.uom || "NOS"})`,
                data: qtyData,
                yAxisID: "yQty",
                backgroundColor: "rgba(148, 163, 184, 0.28)",
                hoverBackgroundColor: "rgba(99, 102, 241, 0.55)",
                borderColor: "rgba(148, 163, 184, 0.5)",
                borderWidth: 1.5,
                borderRadius: 7,
                barPercentage: 0.42,
                datalabels: {
                    display: (c) => {
                        const v = c.dataset.data[c.dataIndex];
                        return v > 0;
                    },
                    align: "top",
                    anchor: "end",
                    offset: 2,
                    color: "#475569",
                    font: { family: "'Outfit', sans-serif", size: 9.5, weight: "750" },
                    formatter: (val) => `${Number(val).toLocaleString("en-IN")}`
                }
            });
        }

        // 1. Chronological PO Rate Curve
        datasets.push({
            type: "line",
            label: "PO Unit Rate (₹)",
            data: rateData,
            yAxisID: "yRate",
            borderColor: "#2563eb",
            backgroundColor: gradRate,
            borderWidth: 3.2,
            fill: true,
            tension: 0.36,
            pointRadius: 6,
            pointHoverRadius: 9,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#2563eb",
            pointBorderWidth: 2.8,
            datalabels: {
                display: (c) => {
                    const v = c.dataset.data[c.dataIndex];
                    return v !== null && v !== undefined;
                },
                align: "top",
                offset: 8,
                clamp: true,
                backgroundColor: "#ffffff",
                borderColor: "#2563eb",
                borderWidth: 1.5,
                borderRadius: 7,
                padding: { top: 3, bottom: 3, left: 7, right: 7 },
                color: "#1e3a8a",
                font: { family: "'Outfit', sans-serif", size: 10.5, weight: "800" },
                formatter: (val) => `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
        });

        // 2. Projected Rate Horizon Line
        datasets.push({
            type: "line",
            label: "Projected Rate Horizon (₹)",
            data: forecastData,
            yAxisID: "yRate",
            borderColor: "#8b5cf6",
            borderDash: [6, 4],
            borderWidth: 2.6,
            fill: false,
            tension: 0.36,
            pointRadius: (c) => (c.dataIndex === c.dataset.data.length - 1 ? 7 : 0),
            pointHoverRadius: 9.5,
            pointBackgroundColor: "#8b5cf6",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2.5,
            datalabels: {
                display: (c) => c.dataIndex === c.dataset.data.length - 1,
                align: "top",
                offset: 8,
                clamp: true,
                backgroundColor: "#8b5cf6",
                borderRadius: 7,
                padding: { top: 3, bottom: 3, left: 8, right: 8 },
                color: "#ffffff",
                font: { family: "'Outfit', sans-serif", size: 10.5, weight: "800" },
                formatter: (val) => `🎯 Forecast: ₹${Number(val).toFixed(2)}`
            }
        });

        // 3. Historical Weighted Benchmark Line
        datasets.push({
            type: "line",
            label: "Historical Weighted Benchmark (₹)",
            data: avgData,
            yAxisID: "yRate",
            borderColor: "#059669",
            borderDash: [5, 5],
            borderWidth: 1.8,
            pointRadius: 0,
            fill: false,
            datalabels: {
                display: false
            }
        });

        // 4. Subtle Tolerance Corridor (Upper & Lower Band)
        datasets.push({
            type: "line",
            label: "Upper Tolerance (+2.5%)",
            data: upperBandData,
            yAxisID: "yRate",
            borderColor: "rgba(37, 99, 235, 0.18)",
            borderDash: [3, 4],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            datalabels: { display: false }
        });

        datasets.push({
            type: "line",
            label: "Tolerance Corridor (±2.5%)",
            data: lowerBandData,
            yAxisID: "yRate",
            borderColor: "rgba(37, 99, 235, 0.18)",
            borderDash: [3, 4],
            borderWidth: 1,
            pointRadius: 0,
            fill: "-1",
            backgroundColor: "rgba(37, 99, 235, 0.03)",
            datalabels: { display: false }
        });

        apaChartInstRef.current = new Chart(ctx, {
            data: {
                labels,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        left: 15,
                        right: 85,
                        top: 35,
                        bottom: 12
                    }
                },
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
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: "rgba(15, 23, 42, 0.94)",
                        titleColor: "#f8fafc",
                        bodyColor: "#cbd5e1",
                        titleFont: { family: "'Outfit', sans-serif", size: 12, weight: "700" },
                        bodyFont: { family: "'Outfit', sans-serif", size: 11, weight: "500" },
                        padding: 12,
                        cornerRadius: 10,
                        boxPadding: 4,
                        borderColor: "rgba(255, 255, 255, 0.12)",
                        borderWidth: 1,
                        filter: (item) => !item.dataset.label.includes("Tolerance"),
                        callbacks: {
                            title: (items) => {
                                const idx = items[0]?.dataIndex;
                                const meta = poMeta[idx];
                                if (!meta) return items[0]?.label || "";
                                return `${meta.poNumber} — ${meta.date || "—"}`;
                            },
                            afterTitle: (items) => {
                                const idx = items[0]?.dataIndex;
                                const meta = poMeta[idx];
                                return meta?.vendor ? `Supplier: ${meta.vendor}` : "";
                            },
                            label: (item) => {
                                const v = item.raw;
                                if (v === null || v === undefined) return null;
                                if (item.dataset.yAxisID === "yQty") {
                                    return `Procured Volume: ${Number(v).toLocaleString("en-IN")} ${hero.uom || "NOS"}`;
                                }
                                return `${item.dataset.label}: ₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            },
                            afterBody: (items) => {
                                const idx = items[0]?.dataIndex;
                                const meta = poMeta[idx];
                                if (!meta || meta.variance === undefined || idx === 0) return [];
                                const sign = meta.variance > 0 ? "+" : meta.variance < 0 ? "-" : "";
                                const varText = `Variance vs Base: ${sign}₹${Math.abs(meta.variance).toFixed(2)}`;
                                return [varText];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: "#64748b",
                            font: { family: "'Outfit', sans-serif", size: 11, weight: "600" },
                            maxRotation: 15
                        }
                    },
                    yRate: {
                        type: "linear",
                        position: "left",
                        min: yAxisMin,
                        max: yAxisMax,
                        grid: {
                            color: "rgba(226, 232, 240, 0.65)"
                        },
                        ticks: {
                            color: "#2563eb",
                            font: { family: "'Outfit', sans-serif", size: 11, weight: "750" },
                            callback: (val) => `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                        }
                    },
                    ...(apaChartView === "combo" ? {
                        yQty: {
                            type: "linear",
                            position: "right",
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: "#64748b",
                                font: { family: "'Outfit', sans-serif", size: 10, weight: "600" },
                                callback: (val) => `${val.toLocaleString("en-IN")} ${hero.uom || ""}`
                            }
                        }
                    } : {})
                }
            }
        });

        return () => {
            if (apaChartInstRef.current) {
                apaChartInstRef.current.destroy();
                apaChartInstRef.current = null;
            }
        };
    }, [hero, apaChartView]);

    return (
        <div className="apa-root" id="advanced-purchase-analytics-section">
            <div className="apa-card">
                {/* ═══════════════════════════════════════════════════════
                    1. SECTION HEADER & DYNAMIC CONTROLS (TABS, FILTERS & SEARCH)
                ═══════════════════════════════════════════════════════ */}
                <div className="apa-header">
                    <div className="apa-header-top">
                        <div className="apa-title-group">
                            <div className="apa-title-icon">
                                <Sparkles size={22} className="apa-react-icon" />
                            </div>
                            <div className="apa-title-text">
                                <h3>
                                    Advanced Purchase Analytics
                                </h3>
                                <p>
                                    Procurement cost projection, chronological unit rate milestones, and optimal buying stage signals
                                </p>
                            </div>
                        </div>

                        {/* Top Controls: Raw/Store Tabs + Category/Group Filter + Search */}
                        <div className="apa-header-actions">
                            {/* Raw Material vs Store Material Toggle Switcher */}
                            <div className="pa2-apv-tabs">
                                <button
                                    type="button"
                                    className={`pa2-apv-tab-btn ${apaMode === "raw" ? "active raw" : ""}`}
                                    onClick={() => {
                                        setApaMode("raw");
                                        setApaRawCategories([]);
                                        setApaStoreGroups([]);
                                    }}
                                >
                                    <Package size={15} strokeWidth={2.2} />
                                    <span>Raw Material</span>
                                    <span className="pa2-apv-tab-badge">{rawCatalogList.length} Items</span>
                                </button>
                                <button
                                    type="button"
                                    className={`pa2-apv-tab-btn ${apaMode === "store" ? "active store" : ""}`}
                                    onClick={() => {
                                        setApaMode("store");
                                        setApaRawCategories([]);
                                        setApaStoreGroups([]);
                                    }}
                                >
                                    <Factory size={15} strokeWidth={2.2} />
                                    <span>Store Material</span>
                                    <span className="pa2-apv-tab-badge">{storeCatalogList.length} Items</span>
                                </button>
                            </div>

                            {/* Standalone Multi-Select Category / Group Filter Dropdown */}
                            {(() => {
                                const selectedCount = apaMode === "raw" ? apaRawCategories.length : apaStoreGroups.length;
                                const hasFilter = selectedCount > 0;
                                const totalItemsCount = apaMode === "raw" ? (RAW_CATEGORIES.length - 1) : (storeGroupsList.length - 1);

                                return (
                                    <div className={`pa2-apv-filter-dropdown-wrap ${apaMode}`} ref={apaFilterRef}>
                                        <button
                                            type="button"
                                            className={`pa2-apv-filter-btn ${apaMode} ${hasFilter ? "has-filter" : ""}`}
                                            onClick={() => setApaFilterDropdownOpen(!apaFilterDropdownOpen)}
                                            title={apaMode === "raw" ? "Filter by Raw Material Category (Multi-select)" : "Filter by Store Material Group (Multi-select)"}
                                        >
                                            {hasFilter ? (
                                                <span
                                                    className="pa2-apv-btn-dot"
                                                    style={{
                                                        background: apaMode === "raw"
                                                            ? (selectedCount === 1 ? (RAW_CATEGORIES.find(c => c.id === apaRawCategories[0])?.color || "#2563eb") : "#2563eb")
                                                            : "#7c3aed"
                                                    }}
                                                />
                                            ) : (
                                                <SlidersHorizontal size={13} className="pa2-apv-filter-btn-icon" />
                                            )}
                                            <span className="pa2-apv-filter-btn-label">
                                                {apaMode === "raw" ? (
                                                    <>
                                                        <span className="pa2-apv-filter-prefix">Category:</span>{" "}
                                                        <b className="pa2-apv-filter-val">
                                                            {apaRawCategories.length === 0
                                                                ? "All Categories"
                                                                : apaRawCategories.length === 1
                                                                    ? apaRawCategories[0]
                                                                    : `${apaRawCategories.length} Selected`}
                                                        </b>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="pa2-apv-filter-prefix">Group:</span>{" "}
                                                        <b className="pa2-apv-filter-val">
                                                            {apaStoreGroups.length === 0
                                                                ? "All Groups"
                                                                : apaStoreGroups.length === 1
                                                                    ? apaStoreGroups[0]
                                                                    : `${apaStoreGroups.length} Selected`}
                                                        </b>
                                                    </>
                                                )}
                                            </span>
                                            <span className="pa2-apv-filter-badge">
                                                {scopedCatalog.length}
                                            </span>
                                            <ChevronDown size={13} className={`pa2-apv-chevron ${apaFilterDropdownOpen ? "open" : ""}`} />
                                        </button>

                                        {apaFilterDropdownOpen && (
                                            <div className={`pa2-apv-filter-menu ${apaMode}`}>
                                                <div className="pa2-apv-filter-menu-head">
                                                    <div className="pa2-apv-filter-menu-title">
                                                        <SlidersHorizontal size={12} style={{ color: apaMode === "raw" ? "#2563eb" : "#7c3aed" }} />
                                                        <span>{apaMode === "raw" ? "Raw Categories" : "Store Groups"}</span>
                                                        <span className="pa2-apv-opt-total-pill">
                                                            {hasFilter ? `${selectedCount} / ${totalItemsCount} selected` : "All Selected"}
                                                        </span>
                                                    </div>
                                                    <div className="pa2-apv-filter-actions">
                                                        <button
                                                            type="button"
                                                            className="pa2-apv-filter-action-btn select-all"
                                                            onClick={() => {
                                                                if (apaMode === "raw") setApaRawCategories([]);
                                                                else setApaStoreGroups([]);
                                                            }}
                                                            title="Select All"
                                                        >
                                                            <CheckCheck size={11} /> All
                                                        </button>
                                                        {hasFilter && (
                                                            <button
                                                                type="button"
                                                                className="pa2-apv-filter-action-btn reset"
                                                                onClick={() => {
                                                                    if (apaMode === "raw") setApaRawCategories([]);
                                                                    else setApaStoreGroups([]);
                                                                }}
                                                                title="Reset filter"
                                                            >
                                                                <RotateCcw size={10} /> Reset
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {apaMode === "store" && storeGroupsList.length > 5 && (
                                                    <div className="pa2-apv-filter-search-box">
                                                        <Search size={12} className="pa2-apv-filter-search-icon" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search store groups..."
                                                            value={apaFilterSearch}
                                                            onChange={(e) => setApaFilterSearch(e.target.value)}
                                                            className="pa2-apv-filter-search-input"
                                                            autoFocus
                                                        />
                                                        {apaFilterSearch && (
                                                            <button type="button" onClick={() => setApaFilterSearch("")} className="pa2-apv-filter-search-clear">
                                                                <X size={10} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="pa2-apv-filter-options">
                                                    {apaMode === "raw" ? (
                                                        RAW_CATEGORIES.filter(c => c.id !== "All").map(cat => {
                                                            const isSelected = apaRawCategories.length === 0 || apaRawCategories.includes(cat.id);
                                                            const isExplicit = hasFilter && apaRawCategories.includes(cat.id);
                                                            const count = rawCategoryCounts[cat.id] ?? 0;
                                                            return (
                                                                <button
                                                                    key={cat.id}
                                                                    type="button"
                                                                    className={`pa2-apv-filter-opt ${isSelected ? "selected" : ""} ${isExplicit ? "explicit" : ""}`}
                                                                    onClick={() => toggleRawCategory(cat.id)}
                                                                >
                                                                    <div className={`pa2-apv-custom-checkbox ${isSelected ? "checked" : ""}`}>
                                                                        {isSelected && <Check size={11} strokeWidth={3} />}
                                                                    </div>
                                                                    <span className="pa2-apv-opt-indicator" style={{ background: cat.color }} />
                                                                    <span className="pa2-apv-opt-label">{cat.label}</span>
                                                                    <span className="pa2-apv-opt-count">{count}</span>
                                                                </button>
                                                            );
                                                        })
                                                    ) : (
                                                        storeGroupsList
                                                            .filter(g => g !== "All")
                                                            .filter(g => !apaFilterSearch || g.toLowerCase().includes(apaFilterSearch.toLowerCase().trim()))
                                                            .map(grp => {
                                                                const isSelected = apaStoreGroups.length === 0 || apaStoreGroups.includes(grp);
                                                                const isExplicit = hasFilter && apaStoreGroups.includes(grp);
                                                                const count = storeGroupCounts[grp] ?? 0;
                                                                return (
                                                                    <button
                                                                        key={grp}
                                                                        type="button"
                                                                        className={`pa2-apv-filter-opt ${isSelected ? "selected" : ""} ${isExplicit ? "explicit" : ""}`}
                                                                        onClick={() => toggleStoreGroup(grp)}
                                                                    >
                                                                        <div className={`pa2-apv-custom-checkbox ${isSelected ? "checked" : ""}`}>
                                                                            {isSelected && <Check size={11} strokeWidth={3} />}
                                                                        </div>
                                                                        <span className="pa2-apv-opt-indicator" style={{ background: isSelected ? "#7c3aed" : "#a855f7" }} />
                                                                        <span className="pa2-apv-opt-label">{grp}</span>
                                                                        <span className="pa2-apv-opt-count">{count}</span>
                                                                    </button>
                                                                );
                                                            })
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Search Box with Autocomplete Dropdown */}
                            <div className="apa-search-box" ref={dropdownRef}>
                                <Search size={15} className="apa-search-icon" />
                                <input
                                    type="text"
                                    className="apa-search-input"
                                    placeholder={`Search ${apaMode === "raw" ? "Raw" : "Store"} Material / Vendor...`}
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setDropdownOpen(true);
                                    }}
                                    onFocus={() => setDropdownOpen(true)}
                                />
                                {searchQuery && (
                                    <button className="apa-search-clear" onClick={() => setSearchQuery("")}>
                                        <X size={14} />
                                    </button>
                                )}

                                {dropdownOpen && (
                                    <div className="apa-dropdown-menu">
                                        {filteredCatalog.length === 0 ? (
                                            <div style={{ padding: "8px 12px", fontSize: "0.76rem", color: "#64748b" }}>
                                                No matching materials found in this category
                                            </div>
                                        ) : (
                                            filteredCatalog.map((p) => (
                                                <div
                                                    key={p.partNo}
                                                    className={`apa-dropdown-item ${p.partNo === selectedPartNo ? "apa-dropdown-item--active" : ""}`}
                                                    onClick={() => {
                                                        setSelectedPartNo(p.partNo);
                                                        setDropdownOpen(false);
                                                        setSearchQuery("");
                                                    }}
                                                >
                                                    <div className="apa-dropdown-item-main">
                                                        <span className="apa-dropdown-item-part">{p.partNo}</span>
                                                        <span className="apa-dropdown-item-desc">{p.description}</span>
                                                    </div>
                                                    <div className="apa-dropdown-item-meta">
                                                        <span className="apa-dropdown-item-rate">
                                                            ₹{p.activeRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                        <div className="apa-dropdown-item-count">{p.vendor || "—"}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════
                    2. MODERN UI ANIMATED RATE PROGRESSION & FORECAST GRAPH CARD
                ═══════════════════════════════════════════════════════ */}
                {loading && catalogData.length === 0 ? (
                    <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
                        <div className="pa2-skeleton pa2-shimmer" style={{ width: "240px", height: "20px", margin: "0 auto 14px", borderRadius: "6px" }} />
                        <div className="pa2-skeleton pa2-shimmer" style={{ width: "65%", height: "14px", margin: "0 auto 20px", borderRadius: "4px" }} />
                        <div className="pa2-skeleton pa2-shimmer" style={{ width: "100%", height: "200px", borderRadius: "12px" }} />
                    </div>
                ) : catalogData.length === 0 ? (
                    <div style={{ padding: "3.5rem 1.5rem", textAlign: "center" }}>
                        <PaNoData icon={<Sparkles size={24} style={{ color: "#2563eb" }} />} message="No purchase records found for the selected period." />
                    </div>
                ) : hero ? (
                    <div className="apa-chart-card">
                        {/* Top Header Strip with Material Identity & Dynamic Quick Badges */}
                        <div className="apa-chart-head">
                            <div className="apa-chart-head-left">
                                <div className="apa-chart-tags">
                                    <span className="apa-tag-partno">
                                        <Tag size={11} style={{ display: "inline", marginRight: "4px", verticalAlign: "-1px" }} />
                                        {displayPartNo}
                                    </span>
                                    <span className="apa-tag-supplier">
                                        <Building2 size={12} style={{ display: "inline", marginRight: "4px", verticalAlign: "-1px" }} />
                                        {hero.vendor || "—"}
                                    </span>
                                    <span className="apa-tag-uom">
                                        {hero.uom || "NOS"}
                                    </span>
                                    {hero.rawCategory && hero.materialMode === "raw" && (
                                        <span className={`pa2-apv-mat-subtag ${hero.rawCategory.includes("Cast") ? "nos" : hero.rawCategory.includes("KGS") ? "kgs" : hero.rawCategory.includes("Mtrs") ? "mtrs" : "bout"}`} style={{ fontSize: "0.72rem", padding: "3px 9px" }}>
                                            <span className="pa2-apv-mat-subtag-dot" />
                                            {hero.rawCategory}
                                        </span>
                                    )}
                                    {hero.storeGroup && hero.materialMode === "store" && (
                                        <span className="pa2-apv-mat-subtag store" style={{ fontSize: "0.72rem", padding: "3px 9px" }}>
                                            <span className="pa2-apv-mat-subtag-dot" />
                                            {hero.storeGroup}
                                        </span>
                                    )}
                                </div>
                                <h2 className="apa-chart-title">{displayDesc}</h2>
                                <p className="apa-chart-desc">
                                    Catalog Code: <b>{displayPartNo}</b> &nbsp;·&nbsp; Last PO Date: <b>{hero.lastPoDate || "—"}</b>
                                </p>
                            </div>

                            {/* Quick KPI Stats & View Switcher */}
                            <div className="apa-chart-head-right">
                                <div className="apa-chart-kpis">
                                    {/* Active Purchase Rate */}
                                    <div className="apa-kpi-chip apa-kpi-chip--active">
                                        <div className="apa-kpi-chip-label">Active PO Rate</div>
                                        <div className="apa-kpi-chip-val">
                                            ₹{hero.activeRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            {hero.baseRate > 0 && (
                                                <span
                                                    className={`apa-kpi-chip-diff ${hero.activeRate > hero.baseRate
                                                        ? "apa-kpi-chip-diff--up"
                                                        : hero.activeRate < hero.baseRate
                                                            ? "apa-kpi-chip-diff--down"
                                                            : "apa-kpi-chip-diff--neutral"
                                                        }`}
                                                >
                                                    {hero.activeRate > hero.baseRate ? (
                                                        <TrendingUp size={11} />
                                                    ) : hero.activeRate < hero.baseRate ? (
                                                        <TrendingDown size={11} />
                                                    ) : null}
                                                    {hero.activeRate >= hero.baseRate ? "+" : ""}
                                                    {hero.changePercent.toFixed(1)}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="apa-kpi-chip-sub">
                                            Base: ₹{hero.baseRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>

                                    {/* Projected Next PO Rate */}
                                    <div className="apa-kpi-chip apa-kpi-chip--forecast">
                                        <div className="apa-kpi-chip-label">Forecast Horizon</div>
                                        <div className="apa-kpi-chip-val" style={{ color: "#7c3aed" }}>
                                            ₹{hero.projectedNextRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        <div className="apa-kpi-chip-sub">
                                            Next Order Projection
                                        </div>
                                    </div>

                                    {/* Total Procured Qty */}
                                    <div className="apa-kpi-chip">
                                        <div className="apa-kpi-chip-label">Procured Qty</div>
                                        <div className="apa-kpi-chip-val">
                                            {hero.totalQty.toLocaleString("en-IN")} <span className="apa-kpi-chip-unit">{hero.uom || "NOS"}</span>
                                        </div>
                                        <div className="apa-kpi-chip-sub">
                                            {hero.poCount || 0} Purchase Orders
                                        </div>
                                    </div>

                                    {/* Store Material ROL KPI Chip */}
                                    {hero.materialMode === "store" && (
                                        <div className={`apa-kpi-chip apa-kpi-chip--rol ${hero.rolTrend}`}>
                                            <div className="apa-kpi-chip-label">Re-Order Level (ROL)</div>
                                            <div className="apa-kpi-chip-val">
                                                {hero.rolQty.toLocaleString("en-IN")} <span className="apa-kpi-chip-unit">{hero.uom || "NOS"}</span>
                                                <span className={`apa-kpi-chip-diff ${hero.rolTrend === "critical" ? "apa-kpi-chip-diff--down" : "apa-kpi-chip-diff--up"}`}>
                                                    {hero.rolTrendIcon} {hero.rolPercent}%
                                                </span>
                                            </div>
                                            <div className="apa-kpi-chip-sub">
                                                Buffer: {hero.rolTrendLabel} ({hero.currentStock.toLocaleString("en-IN")} in stock)
                                            </div>
                                        </div>
                                    )}

                                    {/* Total Spend */}
                                    <div className="apa-kpi-chip apa-kpi-chip--spend">
                                        <div className="apa-kpi-chip-label">Total Spend</div>
                                        <div className="apa-kpi-chip-val">
                                            ₹{(hero.totalSpend / 100000).toFixed(2)}L
                                        </div>
                                        <div className="apa-kpi-chip-sub">
                                            ₹{hero.totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                {/* Graph View Mode Switcher */}
                                <div className="apa-chart-controls">
                                    <button
                                        type="button"
                                        className={`apa-chart-mode-btn ${apaChartView === "rate" ? "active" : ""}`}
                                        onClick={() => setApaChartView("rate")}
                                    >
                                        <Activity size={13} />
                                        <span>Rate Progression & Horizon</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`apa-chart-mode-btn ${apaChartView === "combo" ? "active" : ""}`}
                                        onClick={() => setApaChartView("combo")}
                                    >
                                        <BarChart2 size={13} />
                                        <span>Rate + Volume Combo</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Legend Hint Row */}
                        <div className="apa-chart-legend-strip">
                            <div className="apa-legend-badge">
                                <span className="apa-legend-dot" style={{ background: "#2563eb" }} />
                                <span>PO Unit Rate Curve (₹)</span>
                            </div>
                            <div className="apa-legend-badge">
                                <span className="apa-legend-line-dashed" style={{ borderColor: "#8b5cf6" }} />
                                <span>🎯 Projected Rate Horizon (₹{hero.projectedNextRate.toFixed(2)})</span>
                            </div>
                            <div className="apa-legend-badge">
                                <span className="apa-legend-line-dashed" style={{ borderColor: "#059669" }} />
                                <span>Historical Avg Benchmark (₹{hero.avgRate.toFixed(2)})</span>
                            </div>
                            <div className="apa-legend-badge">
                                <span className="apa-legend-band-box" style={{ background: "rgba(37, 99, 235, 0.12)", border: "1px dashed rgba(37, 99, 235, 0.4)" }} />
                                <span>Tolerance Corridor (±2.5%)</span>
                            </div>
                            {apaChartView === "combo" && (
                                <div className="apa-legend-badge">
                                    <span className="apa-legend-bar" style={{ background: "rgba(148, 163, 184, 0.6)" }} />
                                    <span>Procured Volume</span>
                                </div>
                            )}
                        </div>

                        {/* Graph Canvas Container with Modern Styling */}
                        <div className="apa-chart-wrap" style={{ height: "305px" }}>
                            <canvas ref={apaChartCanvasRef} />
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
                        <PaNoData icon={<SlidersHorizontal size={22} style={{ color: apaMode === "raw" ? "#2563eb" : "#7c3aed" }} />} message="No materials found matching the selected category or group filter." />
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    3. SMART PROCUREMENT PROJECTION & BUYING ADVICE RIBBON
                ═══════════════════════════════════════════════════════ */}
                {hero && (
                    <div className="apa-projection-ribbon">
                        {/* 1. Buy Signal Advice */}
                        <div className="apa-proj-card" style={{ "--proj-accent": hero.buySignalType === "optimal" ? "#10b981" : hero.buySignalType === "warning" ? "#ef4444" : hero.buySignalType === "softening" ? "#2563eb" : "#64748b", "--proj-bg": hero.buySignalType === "optimal" ? "#ecfdf5" : hero.buySignalType === "warning" ? "#fef2f2" : hero.buySignalType === "softening" ? "#eff6ff" : "#f1f5f9" }}>
                            <div className="apa-proj-head">
                                <span className="apa-proj-label">Procurement Recommendation</span>
                                <span className="apa-proj-icon">
                                    <Target size={14} />
                                </span>
                            </div>
                            <div className="apa-proj-val">
                                <span className={`apa-buy-signal-pill ${hero.buySignalType}`}>
                                    {hero.buySignalType === "optimal" && "🟢"}
                                    {hero.buySignalType === "warning" && "🔴"}
                                    {hero.buySignalType === "softening" && "🔵"}
                                    {hero.buySignalType === "stable" && "🟡"}
                                    {" "}{hero.buySignalTitle}
                                </span>
                            </div>
                            <div className="apa-proj-desc">
                                {hero.buySignalAdvice}
                            </div>
                        </div>

                        {/* 2. Projected Rate Horizon */}
                        <div className="apa-proj-card" style={{ "--proj-accent": "#2563eb", "--proj-bg": "#eff6ff" }}>
                            <div className="apa-proj-head">
                                <span className="apa-proj-label">Projected Next Order Rate</span>
                                <span className="apa-proj-icon">
                                    <Activity size={14} />
                                </span>
                            </div>
                            <div className="apa-proj-val">
                                ₹{hero.projectedNextRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="apa-proj-desc">
                                Moving average projection across {hero.poCount} chronological orders
                            </div>
                        </div>

                        {/* 3. Cost Volatility & Risk Index */}
                        <div className="apa-proj-card" style={{ "--proj-accent": hero.volatilityColor, "--proj-bg": `${hero.volatilityColor}15` }}>
                            <div className="apa-proj-head">
                                <span className="apa-proj-label">Rate Volatility Index</span>
                                <span className="apa-proj-icon">
                                    <TrendingUp size={14} />
                                </span>
                            </div>
                            <div className="apa-proj-val" style={{ color: hero.volatilityColor }}>
                                {hero.volatilityLabel}
                            </div>
                            <div className="apa-proj-desc">
                                Range: ₹{hero.minRate.toFixed(2)} — ₹{hero.maxRate.toFixed(2)} (Spread: {hero.volatilitySpread.toFixed(1)}%)
                            </div>
                        </div>

                        {/* 4. Cost Opportunity / Savings */}
                        <div className="apa-proj-card" style={{ "--proj-accent": "#059669", "--proj-bg": "#ecfdf5" }}>
                            <div className="apa-proj-head">
                                <span className="apa-proj-label">Historical Average Rate</span>
                                <span className="apa-proj-icon">
                                    <IndianRupee size={14} />
                                </span>
                            </div>
                            <div className="apa-proj-val">
                                ₹{hero.avgRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="apa-proj-desc">
                                Weighted average benchmark across all procured units
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    4. CHRONOLOGICAL RATE PROGRESSION TIMELINE & ALL PARTS CATALOG TABLE
                ═══════════════════════════════════════════════════════ */}
                {hero && (
                    <div className="apa-tab-content" style={{ borderTop: "1px solid #e2e8f0" }}>
                        {/* Chronological Timeline for Selected Material */}
                        <div className="apa-timeline-wrap">
                            <div className="apa-timeline-title">
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                    <Activity size={15} style={{ color: "#2563eb" }} />
                                    <span>Chronological Purchase Rate Progression Timeline</span>
                                    <span className="apa-timeline-active-part-badge">
                                        Active: <b>{displayPartNo}</b>
                                    </span>
                                </div>
                                <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "600" }}>
                                    {hero.timelineSteps.length} Chronological Milestone{hero.timelineSteps.length === 1 ? "" : "s"}
                                </span>
                            </div>

                            <div className="apa-timeline">
                                {hero.timelineSteps.length === 0 ? (
                                    <div style={{ padding: "12px 16px", color: "#64748b", fontSize: "0.82rem" }}>
                                        No rate revision progression recorded for this material
                                    </div>
                                ) : (
                                    hero.timelineSteps.map((step, idx) => (
                                        <div key={idx} className={`apa-timeline-step ${step.isLatest ? "apa-timeline-step--latest" : ""}`}>
                                            <div className="apa-timeline-node">
                                                {step.node}
                                            </div>
                                            <div className="apa-timeline-date">{step.date || "—"}</div>
                                            <div className="apa-timeline-rate">
                                                ₹{step.rate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div
                                                className={`apa-timeline-delta ${idx === 0
                                                    ? "apa-pill--neutral"
                                                    : step.rateVariance > 0
                                                        ? "apa-pill--red"
                                                        : step.rateVariance < 0
                                                            ? "apa-pill--green"
                                                            : "apa-pill--neutral"
                                                    }`}
                                            >
                                                {idx === 0
                                                    ? "Base"
                                                    : step.rateVariance > 0
                                                        ? `+₹${step.rateVariance.toFixed(2)}`
                                                        : step.rateVariance < 0
                                                            ? `-₹${Math.abs(step.rateVariance).toFixed(2)}`
                                                            : "₹0.00"}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* All Parts Procurement Catalog & Rate Intelligence Table */}
                        <div className="apa-catalog-table-wrap">
                            <div className="apa-catalog-table-head">
                                <div className="apa-catalog-table-title">
                                    <ClipboardList size={16} style={{ color: "#2563eb" }} />
                                    <span>{apaMode === "raw" ? "All Raw Materials Procurement & Rate Catalog" : "Store Materials Inventory & Rate Intelligence Catalog"}</span>
                                    <span className="apa-catalog-count-pill">
                                        {filteredCatalog.length} {apaMode === "raw" ? "Raw" : "Store"} Materials
                                    </span>
                                    {apaMode === "store" && (
                                        <div className="apa-rol-health-strip">
                                            <span className="apa-rol-health-chip safe" title="Safe buffer above Re-order Level (>100%)">
                                                <span className="apa-rol-dot safe" /> Safe: <strong>{rolSummary.safe + rolSummary.surplus}</strong>
                                            </span>
                                            <span className="apa-rol-health-chip warning" title="Stock nearing Re-order Level (80-100%)">
                                                <span className="apa-rol-dot warning" /> Near ROL: <strong>{rolSummary.warning}</strong>
                                            </span>
                                            <span className="apa-rol-health-chip critical" title="Stock critically below ROL (<80%) - Reorder triggered">
                                                <span className="apa-rol-dot critical" /> Below ROL: <strong>{rolSummary.critical}</strong>
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="apa-catalog-hint">
                                    <Sparkles size={13} style={{ color: "#2563eb" }} />
                                    <span>Click any material row below to update the Timeline, Forecast & Graph above</span>
                                </div>
                            </div>

                            <div className="apa-table-container" style={{ maxHeight: "390px" }}>
                                <table className="apa-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: "45px", textAlign: "center" }}>#</th>
                                            <th>Part No</th>
                                            <th>Material Description</th>
                                            <th>{apaMode === "raw" ? "Category" : "Store Group"}</th>
                                            <th>Supplier Scope</th>
                                            <th>UOM</th>
                                            {apaMode === "store" && (
                                                <>
                                                    <th style={{ minWidth: "95px", textAlign: "right" }}>ROL</th>
                                                    <th style={{ minWidth: "135px", textAlign: "center" }}>ROL Trend</th>
                                                    <th style={{ minWidth: "145px", textAlign: "center" }}>ROL %</th>
                                                </>
                                            )}
                                            <th>Base Rate (₹)</th>
                                            <th>Active Rate (₹)</th>
                                            <th>Variance (₹)</th>
                                            <th>Change (%)</th>
                                            <th>Projected Rate (₹)</th>
                                            <th>Procurement Signal</th>
                                            <th>Procured Qty</th>
                                            <th>Total Spend</th>
                                            <th style={{ textAlign: "center" }}>POs</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCatalog.length === 0 ? (
                                            <tr>
                                                <td colSpan={apaMode === "store" ? 18 : 15} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                                                    No materials found matching the active category or group filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredCatalog.map((p, i) => {
                                                const isSelected = p.partNo === selectedPartNo;
                                                const cleanPart = p.partNo.includes(" - ") ? p.partNo.split(" - ")[0].trim() : p.partNo;
                                                const cleanDesc = p.description && p.description.includes(" - ")
                                                    ? (p.description.split(" - ").slice(1).join(" - ").trim() || p.description)
                                                    : (p.description || p.partNo);

                                                return (
                                                    <tr
                                                        key={p.partNo || i}
                                                        className={`apa-catalog-row ${isSelected ? "apa-catalog-row--active" : ""}`}
                                                        onClick={() => setSelectedPartNo(p.partNo)}
                                                        title="Click to view chronological rate progression and forecast for this part"
                                                    >
                                                        <td style={{ fontWeight: "750", color: isSelected ? "#2563eb" : "#64748b", textAlign: "center" }}>
                                                            {isSelected ? <span className="apa-active-row-indicator">▶</span> : (i + 1)}
                                                        </td>
                                                        <td>
                                                            <span className={`apa-table-partno-pill ${isSelected ? "active" : ""}`}>
                                                                {cleanPart}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontWeight: isSelected ? "800" : "600", color: isSelected ? "#1e40af" : "#1e293b", maxWidth: "230px" }}>
                                                            {cleanDesc}
                                                        </td>
                                                        <td>
                                                            {p.rawCategory && p.materialMode === "raw" && (
                                                                <span className={`pa2-apv-mat-subtag ${p.rawCategory.includes("Cast") ? "nos" : p.rawCategory.includes("KGS") ? "kgs" : p.rawCategory.includes("Mtrs") ? "mtrs" : "bout"}`} style={{ fontSize: "0.68rem", padding: "2px 7px" }}>
                                                                    <span className="pa2-apv-mat-subtag-dot" />
                                                                    {p.rawCategory}
                                                                </span>
                                                            )}
                                                            {p.storeGroup && p.materialMode === "store" && (
                                                                <span className="pa2-apv-mat-subtag store" style={{ fontSize: "0.68rem", padding: "2px 7px" }}>
                                                                    <span className="pa2-apv-mat-subtag-dot" />
                                                                    {p.storeGroup}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ fontWeight: "600", color: "#475569" }}>
                                                            {p.vendor || "—"}
                                                        </td>
                                                        <td style={{ fontWeight: "750", color: "#7c3aed" }}>
                                                            {p.uom || "NOS"}
                                                        </td>
                                                        {apaMode === "store" && (
                                                            <>
                                                                <td style={{ textAlign: "right" }}>
                                                                    <div className="apa-rol-badge">
                                                                        <span className="apa-rol-val">{p.rolQty.toLocaleString("en-IN")}</span>
                                                                        <span className="apa-rol-uom">{p.uom || "NOS"}</span>
                                                                    </div>
                                                                </td>
                                                                <td style={{ textAlign: "center" }}>
                                                                    <div className={`apa-rol-trend-pill ${p.rolTrend}`}>
                                                                        <span className="apa-rol-trend-icon">{p.rolTrendIcon}</span>
                                                                        <span className="apa-rol-trend-label">{p.rolTrendLabel}</span>
                                                                        <div className="apa-rol-trend-spark">
                                                                            <span className="apa-rol-trend-bar" style={{ width: `${Math.min(100, Math.max(15, (p.rolPercent / 150) * 100))}%` }} />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div className={`apa-rol-pct-card ${p.rolTrend}`}>
                                                                        <div className="apa-rol-pct-header">
                                                                            <span className="apa-rol-pct-num">{p.rolPercent}%</span>
                                                                            <span className="apa-rol-stock-num">{p.currentStock.toLocaleString("en-IN")} {p.uom || "NOS"}</span>
                                                                        </div>
                                                                        <div className="apa-rol-meter-track">
                                                                            <div
                                                                                className="apa-rol-meter-fill"
                                                                                style={{
                                                                                    width: `${Math.min(100, Math.max(8, p.rolPercent))}%`,
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </>
                                                        )}
                                                        <td style={{ color: "#64748b", fontWeight: "600" }}>
                                                            ₹{p.baseRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td style={{ fontWeight: "850", color: "#2563eb" }}>
                                                            ₹{p.activeRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td style={{ fontWeight: "750", color: p.rateVariance > 0 ? "#dc2626" : p.rateVariance < 0 ? "#059669" : "#64748b" }}>
                                                            {p.rateVariance > 0
                                                                ? `+₹${p.rateVariance.toFixed(2)}`
                                                                : p.rateVariance < 0
                                                                    ? `-₹${Math.abs(p.rateVariance).toFixed(2)}`
                                                                    : "₹0.00"}
                                                        </td>
                                                        <td>
                                                            <span
                                                                className={`apa-timeline-delta ${p.changePercent > 0
                                                                    ? "apa-pill--red"
                                                                    : p.changePercent < 0
                                                                        ? "apa-pill--green"
                                                                        : "apa-pill--neutral"
                                                                    }`}
                                                            >
                                                                {p.changePercent > 0 ? `+${p.changePercent.toFixed(1)}%` : `${p.changePercent.toFixed(1)}%`}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontWeight: "800", color: "#7c3aed" }}>
                                                            ₹{p.projectedNextRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td>
                                                            <span className={`apa-buy-signal-pill ${p.buySignalType}`} style={{ fontSize: "0.68rem", padding: "2px 6px" }}>
                                                                {p.buySignalType === "optimal" && "🟢"}
                                                                {p.buySignalType === "warning" && "🔴"}
                                                                {p.buySignalType === "softening" && "🔵"}
                                                                {p.buySignalType === "stable" && "🟡"}
                                                                {" "}{p.buySignalTitle.split(" (")[0]}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontWeight: "700" }}>
                                                            {p.totalQty.toLocaleString("en-IN")}
                                                        </td>
                                                        <td style={{ fontWeight: "800", color: "#059669" }}>
                                                            ₹{(p.totalSpend / 100000).toFixed(2)}L
                                                        </td>
                                                        <td style={{ fontWeight: "750", textAlign: "center" }}>
                                                            <span className="apa-po-badge">
                                                                {p.poCount}
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
                    </div>
                )}
            </div>
        </div>
    );
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
        poType: "All Types", supplier: ["All Suppliers"],
        department: "Production", status: "All Status",
    });
    const [animated, setAnimated] = useState(false);
    const [poTypes, setPoTypes] = useState(["All Types"]);
    const [poRows, setPoRows] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [poTableSearchQuery, setPoTableSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery.trim());
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);
    const [poSummary, setPoSummary] = useState(null);
    const [poLoading, setPoLoading] = useState(false);
    const [amendedPoRows, setAmendedPoRows] = useState([]);
    const [amendedPoLoading, setAmendedPoLoading] = useState(false);
    const [shortCloseRows, setShortCloseRows] = useState([]);
    const [shortCloseLoading, setShortCloseLoading] = useState(false);
    const [priceTrendRows, setPriceTrendRows] = useState([]);
    const [priceTrendLoading, setPriceTrendLoading] = useState(false);
    const [ptTypeFilter, setPtTypeFilter] = useState([]);
    const [ptTypeDropdownOpen, setPtTypeDropdownOpen] = useState(false);
    const [ptTypeSearch, setPtTypeSearch] = useState("");
    const ptTypeRef = useRef(null);
    const [ptSupplierFilter, setPtSupplierFilter] = useState([]);
    const [ptSupplierDropdownOpen, setPtSupplierDropdownOpen] = useState(false);
    const [ptSupplierSearch, setPtSupplierSearch] = useState("");
    const ptSupplierRef = useRef(null);
    const [ptPartFilter, setPtPartFilter] = useState([]);
    const [ptPartDropdownOpen, setPtPartDropdownOpen] = useState(false);
    const [ptPartSearch, setPtPartSearch] = useState("");
    const ptPartRef = useRef(null);
    const [poTableDeptFilter, setPoTableDeptFilter] = useState([]);
    const [poTableDeptDropdownOpen, setPoTableDeptDropdownOpen] = useState(false);
    const [poDeptSearchQuery, setPoDeptSearchQuery] = useState("");
    const poTableDeptRef = useRef(null);
    const [poTablePendingFilter, setPoTablePendingFilter] = useState("All");
    const [poTablePendingDropdownOpen, setPoTablePendingDropdownOpen] = useState(false);
    const poTablePendingRef = useRef(null);
    const [alertsData, setAlertsData] = useState(null);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [summaryData, setSummaryData] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [supplierRatingData, setSupplierRatingData] = useState(null);
    const [supplierRatingLoading, setSupplierRatingLoading] = useState(false);
    const [trendLoading, setTrendLoading] = useState(false);
    const [chartsLoading, setChartsLoading] = useState(false);
    const [traceSearch, setTraceSearch] = useState("");
    const [traceRows, setTraceRows] = useState([]);
    const [traceLoading, setTraceLoading] = useState(false);
    const [monthlyTab, setMonthlyTab] = useState("combined");
    const [poDropdownOpen, setPoDropdownOpen] = useState(false);
    const [weeklyTrend, setWeeklyTrend] = useState(null);
    const [weeklyChartType, setWeeklyChartType] = useState("combo");
    const [sortConfig, setSortConfig] = useState({ key: "po_date", direction: "desc" });

    // ── PO Fulfillment Schedule State ──
    const [fulfillmentScheduleRows, setFulfillmentScheduleRows] = useState([]);
    const [fsSearchQuery, setFsSearchQuery] = useState("");
    const [fsStatusFilter, setFsStatusFilter] = useState("All");
    const [fsSupplierFilter, setFsSupplierFilter] = useState([]);
    const [fsSupplierDropdownOpen, setFsSupplierDropdownOpen] = useState(false);
    const [fsSupplierSearchQuery, setFsSupplierSearchQuery] = useState("");
    const fsSupplierRef = useRef(null);
    const [fsPartFilter, setFsPartFilter] = useState([]);
    const [fsPartDropdownOpen, setFsPartDropdownOpen] = useState(false);
    const [fsPartSearchQuery, setFsPartSearchQuery] = useState("");
    const fsPartRef = useRef(null);
    const [fsChartType, setFsChartType] = useState("timeline");
    const [fsSortConfig, setFsSortConfig] = useState({ key: "schd_dt", direction: "desc" });
    const fsChartCanvasRef = useRef(null);
    const fsChartInstanceRef = useRef(null);
    const [fsLoading, setFsLoading] = useState(false);
    const [fsPage, setFsPage] = useState(1);
    const [fsPageSize, setFsPageSize] = useState(25);
    const [fsShowChart, setFsShowChart] = useState(true);

    // ── PO Fulfillment Schedule Mode (Standard vs Futuristic) ──
    const [fsActiveTab, setFsActiveTab] = useState("standard"); // "standard" | "futuristic"
    const [futuristicModalOpen, setFuturisticModalOpen] = useState(false);
    const [futuristicProjectionHorizon, setFuturisticProjectionHorizon] = useState("3M"); // "3M", "6M", "1Y"
    const [futuristicSupplierFilter, setFuturisticSupplierFilter] = useState([]);
    const [futuristicSupplierDropdownOpen, setFuturisticSupplierDropdownOpen] = useState(false);
    const [futuristicSupplierSearchQuery, setFuturisticSupplierSearchQuery] = useState("");
    const futuristicSupplierRef = useRef(null);
    const [futuristicPartFilter, setFuturisticPartFilter] = useState([]);
    const [futuristicPartDropdownOpen, setFuturisticPartDropdownOpen] = useState(false);
    const [futuristicPartSearchQuery, setFuturisticPartSearchQuery] = useState("");
    const futuristicPartRef = useRef(null);
    const [futuristicSearchQuery, setFuturisticSearchQuery] = useState("");
    const [futuristicSortConfig, setFuturisticSortConfig] = useState({ key: "po_date", direction: "desc" });
    const futuristicChartCanvasRef = useRef(null);
    const futuristicChartInstanceRef = useRef(null);
    const [futuristicPage, setFuturisticPage] = useState(1);
    const [futuristicPageSize, setFuturisticPageSize] = useState(25);
    const [futuristicShowChart, setFuturisticShowChart] = useState(true);

    // ── Average Purchase Value State ──
    const [apvMode, setApvMode] = useState("raw"); // "raw" | "store"
    const [apvRawCategories, setApvRawCategories] = useState([]); // [] means All, or array of category strings e.g. ["Nos (Casting)", "KGS (Rod)"]
    const [apvStoreGroups, setApvStoreGroups] = useState([]); // [] means All, or array of group strings
    const [apvFilterDropdownOpen, setApvFilterDropdownOpen] = useState(false);
    const [apvFilterSearch, setApvFilterSearch] = useState("");
    const apvFilterRef = useRef(null);
    const [apvSearch, setApvSearch] = useState("");
    const [apvPage, setApvPage] = useState(1);
    const [apvPageSize, setApvPageSize] = useState(25);
    const [apvSortConfig, setApvSortConfig] = useState({ key: "poDate", direction: "desc" });
    const [apvShowChart, setApvShowChart] = useState(true);
    const apvChartCanvasRef = useRef(null);
    const apvChartInstanceRef = useRef(null);

    // Multi-select toggle helpers for APV Categories / Groups
    const toggleRawCategory = (catId) => {
        setApvRawCategories(prev => {
            if (prev.length === 0) {
                return [catId];
            }
            if (prev.includes(catId)) {
                const next = prev.filter(c => c !== catId);
                return next;
            } else {
                return [...prev, catId];
            }
        });
        setApvPage(1);
    };

    const toggleStoreGroup = (grp) => {
        setApvStoreGroups(prev => {
            if (prev.length === 0) {
                return [grp];
            }
            if (prev.includes(grp)) {
                const next = prev.filter(g => g !== grp);
                return next;
            } else {
                return [...prev, grp];
            }
        });
        setApvPage(1);
    };

    // Auto-close APV filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (apvFilterRef.current && !apvFilterRef.current.contains(e.target)) {
                setApvFilterDropdownOpen(false);
            }
        };
        if (apvFilterDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [apvFilterDropdownOpen]);

    const pendingCounts = useMemo(() => {
        let piCount = 0;
        let poCount = 0;
        let grnCount = 0;
        poRows.forEach(r => {
            const isPiPending = Boolean(r.is_pi_pending || !r.po_number || r.po_number === "–" || r.po_number === "-" || r.po_number.trim() === "");
            const hasGrn = Boolean(r.grn_no && r.grn_no !== "–" && r.grn_no !== "-" && r.grn_no.trim() !== "");
            if (isPiPending) {
                piCount++;
            } else if (!hasGrn) {
                poCount++;
                grnCount++;
            }
        });
        return {
            all: poRows.length,
            piPending: piCount,
            poPending: poCount,
            grnPending: grnCount
        };
    }, [poRows]);

    const uniquePoDepartments = useMemo(() => {
        const set = new Set();
        poRows.forEach(r => {
            const d = (r.department || "").trim();
            if (d && d !== "–" && d !== "-") set.add(d);
        });
        return Array.from(set).sort();
    }, [poRows]);

    const filteredDropdownDepts = useMemo(() => {
        const q = poDeptSearchQuery.toLowerCase().trim();
        if (!q) return uniquePoDepartments;
        return uniquePoDepartments.filter(d => d.toLowerCase().includes(q));
    }, [uniquePoDepartments, poDeptSearchQuery]);

    const handlePoDeptToggle = (dept) => {
        setPoTableDeptFilter(prev => {
            if (prev.includes(dept)) {
                return prev.filter(d => d !== dept);
            } else {
                return [...prev, dept];
            }
        });
    };

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
            if (poTablePendingFilter && poTablePendingFilter !== "All") {
                const isPiPending = Boolean(r.is_pi_pending || !r.po_number || r.po_number === "–" || r.po_number === "-" || r.po_number.trim() === "");
                const isGrn = Boolean(r.grn_no && r.grn_no !== "–" && r.grn_no !== "-" && r.grn_no.trim() !== "");

                if (poTablePendingFilter === "PI Pending") {
                    if (!isPiPending) return false;
                } else if (poTablePendingFilter === "PO Pending" || poTablePendingFilter === "GRN Pending") {
                    if (isPiPending || isGrn) return false;
                }
            }
            if (poTableDeptFilter.length > 0) {
                const d = (r.department || "").trim();
                if (!poTableDeptFilter.includes(d)) return false;
            }
            const tableQ = poTableSearchQuery.toLowerCase().trim();
            if (tableQ) {
                const match = (r.po_number && r.po_number.toLowerCase().includes(tableQ)) ||
                    (r.pi_no && r.pi_no.toLowerCase().includes(tableQ)) ||
                    (r.pi_date && r.pi_date.toLowerCase().includes(tableQ)) ||
                    (r.po_type && r.po_type.toLowerCase().includes(tableQ)) ||
                    (r.department && r.department.toLowerCase().includes(tableQ)) ||
                    (r.vendor_name && r.vendor_name.toLowerCase().includes(tableQ)) ||
                    (r.material_code && r.material_code.toLowerCase().includes(tableQ)) ||
                    (r.material && r.material.toLowerCase().includes(tableQ)) ||
                    (r.po_date && r.po_date.toLowerCase().includes(tableQ)) ||
                    (r.grn_no && r.grn_no.toLowerCase().includes(tableQ)) ||
                    (r.grn_date && r.grn_date.toLowerCase().includes(tableQ));
                if (!match) return false;
            }
            const globalQ = searchQuery.toLowerCase().trim();
            if (globalQ) {
                const match = (r.po_number && r.po_number.toLowerCase().includes(globalQ)) ||
                    (r.pi_no && r.pi_no.toLowerCase().includes(globalQ)) ||
                    (r.pi_date && r.pi_date.toLowerCase().includes(globalQ)) ||
                    (r.po_type && r.po_type.toLowerCase().includes(globalQ)) ||
                    (r.department && r.department.toLowerCase().includes(globalQ)) ||
                    (r.vendor_name && r.vendor_name.toLowerCase().includes(globalQ)) ||
                    (r.material_code && r.material_code.toLowerCase().includes(globalQ)) ||
                    (r.material && r.material.toLowerCase().includes(globalQ));
                if (!match) return false;
            }
            if (filters.supplier && filters.supplier.length > 0 && !filters.supplier.includes("All Suppliers")) {
                if (!filters.supplier.includes(r.vendor_name)) return false;
            }
            if (filters.status && filters.status !== "All Status") {
                const isGrn = !!r.grn_no;
                if (filters.status === "GRN Done" && !isGrn) return false;
                if (filters.status === "GRN Pending" && isGrn) return false;
            }
            return true;
        });
    }, [poRows, poTablePendingFilter, poTableDeptFilter, poTableSearchQuery, searchQuery, filters.supplier, filters.status]);

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
                } else if (sortConfig.key === "po_date" || sortConfig.key === "grn_date" || sortConfig.key === "pi_date") {
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

    const poTableTotals = useMemo(() => {
        let totalValue = 0;
        const uomMap = {};
        filteredPoRows.forEach(r => {
            const rawStr = String(r.po_qty || "").trim();
            const qtyMatch = rawStr.match(/^[+-]?[\d,]+(\.\d+)?/);
            const qty = qtyMatch ? parseFloat(qtyMatch[0].replace(/,/g, "")) : (parseFloat(rawStr.replace(/[^\d.]/g, "")) || 0);

            if (qty > 0) {
                const uom = normalizePoUom(r.uom || r.unit, rawStr);
                if (!uomMap[uom]) uomMap[uom] = 0;
                uomMap[uom] += qty;
            }

            const rawVal = Number(r.value || 0);
            if (!isNaN(rawVal)) totalValue += rawVal;
        });
        return {
            uomMap,
            totalValue
        };
    }, [filteredPoRows]);

    const handleExportPoDetailsCsv = () => {
        if (!sortedFilteredPoRows || sortedFilteredPoRows.length === 0) return;

        const headers = [
            "SL. NO.",
            "PI NO",
            "PI DATE",
            "REQUESTED BY",
            "PO NUMBER",
            "PO DATE",
            "PO TYPE",
            "DEPARTMENT",
            "SUPPLIER",
            "MATERIAL",
            "QTY",
            "RATE",
            "VALUE",
            "GRN NO",
            "GRN DATE",
            "AMND"
        ];

        const formatTableDate = (val) => {
            if (!val || val === "–" || val === "-") return "–";
            const str = String(val).trim();
            const parts = str.split("-");
            if (parts.length === 3 && parts[0].length === 4) {
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const [y, m, d] = parts;
                const monthIndex = parseInt(m, 10) - 1;
                if (monthIndex >= 0 && monthIndex < 12) {
                    return `${parseInt(d, 10)} ${months[monthIndex]} ${y}`;
                }
            }
            return str;
        };

        const rows = sortedFilteredPoRows.map((r, index) => {
            const materialDesc = r.material_code
                ? `${r.material_code} – ${String(r.material || "").replace(/^[^-]+-\s*/, "")}`
                : (r.material || "–");
            const rateVal = r.rate !== undefined && r.rate !== null && r.rate !== "" && !isNaN(Number(r.rate))
                ? Number(r.rate).toFixed(2)
                : "–";
            const amtVal = r.value !== undefined && r.value !== null && r.value !== "" && !isNaN(Number(r.value))
                ? Number(r.value).toFixed(2)
                : "–";

            return [
                index + 1,
                r.pi_no || r.indent_no || r.ind_no || "–",
                formatTableDate(r.pi_date || r.indent_date || r.ind_date),
                r.requested_by || r.req_by || r.prepared_by || r.indent_by || r.created_by || "–",
                r.po_number && r.po_number !== "–" && r.po_number !== "-" ? r.po_number : "–",
                formatTableDate(r.po_date),
                r.po_type || "–",
                r.department || "–",
                r.vendor_name || "–",
                materialDesc,
                r.po_qty || "–",
                rateVal,
                amtVal,
                r.grn_no && r.grn_no !== "–" && r.grn_no !== "-" ? r.grn_no : "–",
                formatTableDate(r.grn_date),
                r.amnd || "N"
            ];
        });

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(val => `"${String(val ?? "").replace(/"/g, '""')}"`).join(","))
        ].join("\r\n");

        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const fromStr = dateRange?.from ? new Date(dateRange.from).toISOString().slice(0, 10) : "";
        const toStr = dateRange?.to ? new Date(dateRange.to).toISOString().slice(0, 10) : "";
        const dateSuffix = fromStr && toStr ? `_${fromStr}_to_${toStr}` : "";
        link.setAttribute("download", `Purchase_Order_Details${dateSuffix}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

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

    const amendedPoTableTotals = useMemo(() => {
        let totalValue = 0;
        const uomMap = {};
        filteredAmendedPoRows.forEach(r => {
            const rawStr = String(r.po_qty || "").trim();
            const qtyMatch = rawStr.match(/^[+-]?[\d,]+(\.\d+)?/);
            const qty = qtyMatch ? parseFloat(qtyMatch[0].replace(/,/g, "")) : (parseFloat(rawStr.replace(/[^\d.]/g, "")) || 0);

            if (qty > 0) {
                const uom = normalizePoUom(r.uom || r.unit, rawStr);
                if (!uomMap[uom]) uomMap[uom] = 0;
                uomMap[uom] += qty;
            }

            const rawVal = Number(r.value || 0);
            if (!isNaN(rawVal)) totalValue += rawVal;
        });
        return {
            uomMap,
            totalValue
        };
    }, [filteredAmendedPoRows]);

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

    // ── PO Fulfillment Schedule Data (Fetched directly from backend API) ──

    const uniqueFsSuppliers = useMemo(() => {
        const set = new Set();
        fulfillmentScheduleRows.forEach(r => {
            if (r.supplier && r.supplier !== "–" && r.supplier !== "-") set.add(r.supplier);
        });
        return Array.from(set).sort();
    }, [fulfillmentScheduleRows]);

    const filteredDropdownFsSuppliers = useMemo(() => {
        const q = fsSupplierSearchQuery.toLowerCase().trim();
        if (!q) return uniqueFsSuppliers;
        return uniqueFsSuppliers.filter(s => s.toLowerCase().includes(q));
    }, [uniqueFsSuppliers, fsSupplierSearchQuery]);

    const handleFsSupplierToggle = (supplier) => {
        setFsPage(1);
        setFsSupplierFilter(prev => {
            if (prev.includes(supplier)) return prev.filter(s => s !== supplier);
            return [...prev, supplier];
        });
    };

    const uniqueFsParts = useMemo(() => {
        const set = new Set();
        fulfillmentScheduleRows.forEach(r => {
            if (fsSupplierFilter.length > 0 && !fsSupplierFilter.includes(r.supplier)) return;
            if (r.part_no && r.part_no !== "–" && r.part_no !== "-") set.add(r.part_no);
        });
        return Array.from(set).sort();
    }, [fulfillmentScheduleRows, fsSupplierFilter]);

    const filteredDropdownFsParts = useMemo(() => {
        const q = fsPartSearchQuery.toLowerCase().trim();
        if (!q) return uniqueFsParts;
        return uniqueFsParts.filter(p => p.toLowerCase().includes(q));
    }, [uniqueFsParts, fsPartSearchQuery]);

    const handleFsPartToggle = (part) => {
        setFsPage(1);
        setFsPartFilter(prev => {
            if (prev.includes(part)) return prev.filter(p => p !== part);
            return [...prev, part];
        });
    };

    // Scoped rows based on supplier, part, and search (for status pill counts)
    const fsScopedRows = useMemo(() => {
        return fulfillmentScheduleRows.filter(r => {
            if (fsSupplierFilter.length > 0 && !fsSupplierFilter.includes(r.supplier)) {
                return false;
            }
            if (fsPartFilter.length > 0 && !fsPartFilter.includes(r.part_no)) {
                return false;
            }
            if (fsSearchQuery.trim()) {
                const q = fsSearchQuery.toLowerCase().trim();
                const match = (r.po_number && r.po_number.toLowerCase().includes(q)) ||
                    (r.supplier && r.supplier.toLowerCase().includes(q)) ||
                    (r.part_no && r.part_no.toLowerCase().includes(q)) ||
                    (r.description && r.description.toLowerCase().includes(q)) ||
                    (r.schd_dt && r.schd_dt.toLowerCase().includes(q)) ||
                    (r.status && r.status.toLowerCase().includes(q));
                if (!match) return false;
            }
            return true;
        });
    }, [fulfillmentScheduleRows, fsSupplierFilter, fsPartFilter, fsSearchQuery]);

    // Status pill counts based on active supplier, part, and search filters
    const fsStatusCounts = useMemo(() => {
        let onTrack = 0;
        let dueSoon = 0;
        let overdue = 0;
        let delivered = 0;

        fsScopedRows.forEach(r => {
            if (r.status === "Delivered") delivered++;
            else if (r.status === "Overdue") overdue++;
            else if (r.status === "Due Soon") dueSoon++;
            else onTrack++;
        });

        return {
            all: fsScopedRows.length,
            onTrack,
            dueSoon,
            overdue,
            delivered
        };
    }, [fsScopedRows]);

    // Fully filtered rows (including status pill selection)
    const filteredFsRows = useMemo(() => {
        if (fsStatusFilter === "All") return fsScopedRows;
        return fsScopedRows.filter(r => r.status === fsStatusFilter);
    }, [fsScopedRows, fsStatusFilter]);

    const sortedFsRows = useMemo(() => {
        const sorted = [...filteredFsRows];
        if (fsSortConfig.key) {
            sorted.sort((a, b) => {
                let aVal = a[fsSortConfig.key];
                let bVal = b[fsSortConfig.key];
                if (typeof aVal === "string") aVal = aVal.toLowerCase();
                if (typeof bVal === "string") bVal = bVal.toLowerCase();
                if (aVal < bVal) return fsSortConfig.direction === "asc" ? -1 : 1;
                if (aVal > bVal) return fsSortConfig.direction === "asc" ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [filteredFsRows, fsSortConfig]);

    const pagedFsRows = useMemo(() => {
        if (fsPageSize === "All") return sortedFsRows;
        const size = Number(fsPageSize);
        const start = (fsPage - 1) * size;
        return sortedFsRows.slice(start, start + size);
    }, [sortedFsRows, fsPage, fsPageSize]);

    const totalFsPages = useMemo(() => {
        if (fsPageSize === "All" || sortedFsRows.length === 0) return 1;
        return Math.ceil(sortedFsRows.length / Number(fsPageSize));
    }, [sortedFsRows.length, fsPageSize]);

    const fsTotals = useMemo(() => {
        let totalPoQty = 0;
        let totalSchdQty = 0;
        let totalGrnQty = 0;
        let totalBalQty = 0;
        let totalBalVal = 0;
        let onTrackCount = 0;
        let dueSoonCount = 0;
        let overdueCount = 0;
        let deliveredCount = 0;

        filteredFsRows.forEach(r => {
            totalPoQty += r.po_qty_num || 0;
            totalSchdQty += r.schd_qty_num || 0;
            totalGrnQty += r.grn_qty_num || 0;
            totalBalQty += r.bal_qty_num || 0;
            totalBalVal += r.bal_val || 0;
            if (r.status === "Delivered") deliveredCount++;
            else if (r.status === "Overdue") overdueCount++;
            else if (r.status === "Due Soon") dueSoonCount++;
            else onTrackCount++;
        });

        const fulfillmentPct = totalSchdQty > 0 ? ((totalGrnQty / totalSchdQty) * 100).toFixed(1) : "0.0";
        return {
            totalPoQty,
            totalSchdQty,
            totalGrnQty,
            totalBalQty,
            totalBalVal,
            fulfillmentPct,
            onTrackCount,
            dueSoonCount,
            overdueCount,
            deliveredCount,
            totalLots: filteredFsRows.length
        };
    }, [filteredFsRows]);

    const handleFsSort = (key) => {
        let direction = "asc";
        if (fsSortConfig.key === key && fsSortConfig.direction === "asc") {
            direction = "desc";
        }
        setFsSortConfig({ key, direction });
    };

    const renderFsSortableTh = (label, key, isRightAligned = false, isWide = false) => {
        const isSorted = fsSortConfig.key === key;
        const isAsc = fsSortConfig.direction === "asc";
        const IconComponent = isSorted ? (isAsc ? ArrowUp : ArrowDown) : ArrowUpDown;

        return (
            <th
                className={`pa2-po-th pa2-po-th--sortable ${isRightAligned ? "pa2-po-th--r" : ""} ${isWide ? "pa2-po-th--wide" : ""}`}
                onClick={() => handleFsSort(key)}
            >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: isRightAligned ? "flex-end" : "flex-start", width: "100%" }}>
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

    // ── Futuristic Expected Schedule Computations ──
    const supplierLeadTimeMap = useMemo(() => {
        const leadMap = {};
        const countMap = {};
        const globalAvg = summaryData?.avg_lead_time_days ? Number(summaryData.avg_lead_time_days) : 18;

        (fulfillmentScheduleRows || []).forEach(r => {
            if (!r.supplier) return;
            const sup = r.supplier.trim();
            let lead = 0;
            if (r.po_date && r.schd_dt) {
                const pd = new Date(r.po_date);
                const sd = new Date(r.schd_dt);
                if (!isNaN(pd.getTime()) && !isNaN(sd.getTime())) {
                    lead = Math.max(1, Math.round((sd - pd) / (1000 * 60 * 60 * 24)));
                }
            }
            if (lead <= 0) lead = globalAvg;

            leadMap[sup] = (leadMap[sup] || 0) + lead;
            countMap[sup] = (countMap[sup] || 0) + 1;
        });

        const resultMap = {};
        Object.keys(leadMap).forEach(sup => {
            resultMap[sup] = Math.round(leadMap[sup] / (countMap[sup] || 1));
        });
        return { map: resultMap, defaultAvg: Math.round(globalAvg) };
    }, [fulfillmentScheduleRows, summaryData]);

    const futuristicEnhancedRows = useMemo(() => {
        return (fulfillmentScheduleRows || []).map((r, idx) => {
            const avg_lead_days = supplierLeadTimeMap.map[r.supplier] || supplierLeadTimeMap.defaultAvg || 18;
            let avg_lead_date_obj = null;
            let avg_lead_date_iso = "";
            let avg_lead_date_str = "–";
            let variance_days = 0;

            if (r.po_date) {
                const pDate = new Date(r.po_date);
                if (!isNaN(pDate.getTime())) {
                    avg_lead_date_obj = new Date(pDate.getTime() + avg_lead_days * 24 * 60 * 60 * 1000);
                    avg_lead_date_iso = avg_lead_date_obj.toISOString().slice(0, 10);
                    avg_lead_date_str = avg_lead_date_iso.split("-").reverse().join(" ").replace(/^(\d+) (\d+) /, (_, d, m) => `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} `);
                }
            }

            if (r.schd_dt && avg_lead_date_obj) {
                const sDate = new Date(r.schd_dt);
                if (!isNaN(sDate.getTime())) {
                    variance_days = Math.round((sDate - avg_lead_date_obj) / (1000 * 60 * 60 * 24));
                }
            }

            return {
                ...r,
                sno: idx + 1,
                avg_lead_days,
                avg_lead_date_obj,
                avg_lead_date_iso,
                avg_lead_date: avg_lead_date_str,
                variance_days
            };
        });
    }, [fulfillmentScheduleRows, supplierLeadTimeMap]);

    const uniqueFuturisticSuppliers = useMemo(() => {
        const set = new Set();
        futuristicEnhancedRows.forEach(r => {
            if (r.supplier && r.supplier !== "–" && r.supplier !== "-") set.add(r.supplier);
        });
        return Array.from(set).sort();
    }, [futuristicEnhancedRows]);

    const filteredDropdownFuturisticSuppliers = useMemo(() => {
        const q = futuristicSupplierSearchQuery.toLowerCase().trim();
        if (!q) return uniqueFuturisticSuppliers;
        return uniqueFuturisticSuppliers.filter(s => s.toLowerCase().includes(q));
    }, [uniqueFuturisticSuppliers, futuristicSupplierSearchQuery]);

    const handleFuturisticSupplierToggle = (supplier) => {
        setFuturisticPage(1);
        setFuturisticSupplierFilter(prev => {
            if (prev.includes(supplier)) return prev.filter(s => s !== supplier);
            return [...prev, supplier];
        });
    };

    const uniqueFuturisticParts = useMemo(() => {
        const set = new Set();
        futuristicEnhancedRows.forEach(r => {
            if (futuristicSupplierFilter.length > 0 && !futuristicSupplierFilter.includes(r.supplier)) return;
            if (r.part_no && r.part_no !== "–" && r.part_no !== "-") set.add(r.part_no);
        });
        return Array.from(set).sort();
    }, [futuristicEnhancedRows, futuristicSupplierFilter]);

    const filteredDropdownFuturisticParts = useMemo(() => {
        const q = futuristicPartSearchQuery.toLowerCase().trim();
        if (!q) return uniqueFuturisticParts;
        return uniqueFuturisticParts.filter(p => p.toLowerCase().includes(q));
    }, [uniqueFuturisticParts, futuristicPartSearchQuery]);

    const handleFuturisticPartToggle = (part) => {
        setFuturisticPage(1);
        setFuturisticPartFilter(prev => {
            if (prev.includes(part)) return prev.filter(p => p !== part);
            return [...prev, part];
        });
    };

    const filteredFuturisticRows = useMemo(() => {
        let list = futuristicEnhancedRows;
        if (futuristicSupplierFilter.length > 0) {
            list = list.filter(r => futuristicSupplierFilter.includes(r.supplier));
        }
        if (futuristicPartFilter.length > 0) {
            list = list.filter(r => futuristicPartFilter.includes(r.part_no));
        }
        if (futuristicSearchQuery.trim()) {
            const q = futuristicSearchQuery.toLowerCase().trim();
            list = list.filter(r =>
                (r.po_number && r.po_number.toLowerCase().includes(q)) ||
                (r.supplier && r.supplier.toLowerCase().includes(q)) ||
                (r.part_no && r.part_no.toLowerCase().includes(q)) ||
                (r.description && r.description.toLowerCase().includes(q)) ||
                (r.schd_dt && r.schd_dt.toLowerCase().includes(q)) ||
                (r.avg_lead_date && r.avg_lead_date.toLowerCase().includes(q))
            );
        }

        // Horizon window filter
        const horizonMonths = futuristicProjectionHorizon === "3M" ? 3 : futuristicProjectionHorizon === "6M" ? 6 : 12;
        if (list.length > 0) {
            const baseDate = dateRange.from || new Date();
            const horizonEndDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + horizonMonths + 1, 0);

            list = list.filter(r => {
                if (!r.avg_lead_date_obj && !r.schd_dt) return true;
                const d = r.avg_lead_date_obj || new Date(r.schd_dt);
                return d <= horizonEndDate || isNaN(d.getTime());
            });
        }

        return list;
    }, [futuristicEnhancedRows, futuristicSupplierFilter, futuristicPartFilter, futuristicSearchQuery, futuristicProjectionHorizon, dateRange]);

    const sortedFuturisticRows = useMemo(() => {
        const sorted = [...filteredFuturisticRows];
        if (futuristicSortConfig.key) {
            sorted.sort((a, b) => {
                let aVal = a[futuristicSortConfig.key];
                let bVal = b[futuristicSortConfig.key];
                if (typeof aVal === "string") aVal = aVal.toLowerCase();
                if (typeof bVal === "string") bVal = bVal.toLowerCase();
                if (aVal < bVal) return futuristicSortConfig.direction === "asc" ? -1 : 1;
                if (aVal > bVal) return futuristicSortConfig.direction === "asc" ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [filteredFuturisticRows, futuristicSortConfig]);

    const pagedFuturisticRows = useMemo(() => {
        if (futuristicPageSize === "All") return sortedFuturisticRows;
        const size = Number(futuristicPageSize);
        const start = (futuristicPage - 1) * size;
        return sortedFuturisticRows.slice(start, start + size);
    }, [sortedFuturisticRows, futuristicPage, futuristicPageSize]);

    const totalFuturisticPages = useMemo(() => {
        if (futuristicPageSize === "All" || sortedFuturisticRows.length === 0) return 1;
        return Math.ceil(sortedFuturisticRows.length / Number(futuristicPageSize));
    }, [sortedFuturisticRows.length, futuristicPageSize]);

    const futuristicTotals = useMemo(() => {
        let totalPoQty = 0;
        let totalSchdQty = 0;
        let totalBalQty = 0;
        let totalBalVal = 0;
        let leadDaysSum = 0;

        filteredFuturisticRows.forEach(r => {
            totalPoQty += r.po_qty_num || 0;
            totalSchdQty += r.schd_qty_num || 0;
            totalBalQty += r.bal_qty_num || 0;
            totalBalVal += r.bal_val || 0;
            leadDaysSum += r.avg_lead_days || 0;
        });

        const avgLeadDays = filteredFuturisticRows.length > 0 ? (leadDaysSum / filteredFuturisticRows.length).toFixed(0) : "0";

        return {
            totalPoQty,
            totalSchdQty,
            totalBalQty,
            totalBalVal,
            avgLeadDays,
            count: filteredFuturisticRows.length
        };
    }, [filteredFuturisticRows]);

    const handleFuturisticSort = (key) => {
        let direction = "asc";
        if (futuristicSortConfig.key === key && futuristicSortConfig.direction === "asc") {
            direction = "desc";
        }
        setFuturisticSortConfig({ key, direction });
    };

    const renderFuturisticSortableTh = (label, key, isRightAligned = false, isWide = false) => {
        const isSorted = futuristicSortConfig.key === key;
        const isAsc = futuristicSortConfig.direction === "asc";
        const IconComponent = isSorted ? (isAsc ? ArrowUp : ArrowDown) : ArrowUpDown;

        return (
            <th
                className={`pa2-po-th pa2-po-th--sortable ${isRightAligned ? "pa2-po-th--r" : ""} ${isWide ? "pa2-po-th--wide" : ""}`}
                onClick={() => handleFuturisticSort(key)}
            >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: isRightAligned ? "flex-end" : "flex-start", width: "100%" }}>
                    <span>{label}</span>
                    <span className={`pa2-sort-icon-wrap ${isSorted ? "active" : ""}`} style={{
                        display: "inline-flex",
                        alignItems: "center",
                        opacity: isSorted ? 1 : 0.35,
                        color: isSorted ? "#7c3aed" : "inherit"
                    }}>
                        <IconComponent size={12} style={{ strokeWidth: 2.5 }} />
                    </span>
                </div>
            </th>
        );
    };

    // ── Futuristic Chart Effect (Schedule & Expected) ──
    useEffect(() => {
        if (fsActiveTab !== "futuristic" || !futuristicChartCanvasRef.current) return;
        if (futuristicChartInstanceRef.current) {
            futuristicChartInstanceRef.current.destroy();
            futuristicChartInstanceRef.current = null;
        }

        const ctx = futuristicChartCanvasRef.current.getContext("2d");
        if (!ctx) return;

        const monthMap = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        filteredFuturisticRows.forEach(r => {
            if (r.schd_dt) {
                const sD = new Date(r.schd_dt);
                if (!isNaN(sD.getTime())) {
                    const sortKey = `${sD.getFullYear()}-${String(sD.getMonth() + 1).padStart(2, "0")}`;
                    const label = `${monthNames[sD.getMonth()]} ${sD.getFullYear()}`;
                    if (!monthMap[sortKey]) monthMap[sortKey] = { label, schdQty: 0, expectedQty: 0 };
                    monthMap[sortKey].schdQty += (r.schd_qty_num || 0);
                }
            }
            if (r.avg_lead_date_iso) {
                const eD = new Date(r.avg_lead_date_iso);
                if (!isNaN(eD.getTime())) {
                    const sortKey = `${eD.getFullYear()}-${String(eD.getMonth() + 1).padStart(2, "0")}`;
                    const label = `${monthNames[eD.getMonth()]} ${eD.getFullYear()}`;
                    if (!monthMap[sortKey]) monthMap[sortKey] = { label, schdQty: 0, expectedQty: 0 };
                    monthMap[sortKey].expectedQty += (r.schd_qty_num || 0);
                }
            }
        });

        const sortedKeys = Object.keys(monthMap).sort();
        const labels = sortedKeys.map(k => monthMap[k].label);
        const schdQtys = sortedKeys.map(k => Math.round(monthMap[k].schdQty || 0));
        const expectedQtys = sortedKeys.map(k => Math.round(monthMap[k].expectedQty || 0));

        const gradSchd = ctx.createLinearGradient(0, 0, 0, 240);
        gradSchd.addColorStop(0, "rgba(139, 92, 246, 0.9)");
        gradSchd.addColorStop(1, "rgba(139, 92, 246, 0.2)");

        const gradExpected = ctx.createLinearGradient(0, 0, 0, 240);
        gradExpected.addColorStop(0, "rgba(16, 185, 129, 0.9)");
        gradExpected.addColorStop(1, "rgba(16, 185, 129, 0.2)");

        futuristicChartInstanceRef.current = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        type: "bar",
                        label: "Schedule",
                        data: schdQtys,
                        backgroundColor: gradSchd,
                        borderColor: "#7c3aed",
                        borderWidth: 1.5,
                        borderRadius: 6,
                        barPercentage: 0.6,
                        categoryPercentage: 0.75,
                        datalabels: {
                            display: true,
                            align: "top",
                            anchor: "end",
                            color: "#7c3aed",
                            font: { size: 10, weight: "700", family: "Poppins" },
                            formatter: v => v > 0 ? v.toLocaleString("en-IN") : ""
                        }
                    },
                    {
                        type: "bar",
                        label: "Expected",
                        data: expectedQtys,
                        backgroundColor: gradExpected,
                        borderColor: "#059669",
                        borderWidth: 1.5,
                        borderRadius: 6,
                        barPercentage: 0.6,
                        categoryPercentage: 0.75,
                        datalabels: {
                            display: true,
                            align: "top",
                            anchor: "end",
                            color: "#059669",
                            font: { size: 10, weight: "700", family: "Poppins" },
                            formatter: v => v > 0 ? v.toLocaleString("en-IN") : ""
                        }
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: {
                        display: true,
                        position: "top",
                        labels: { font: { family: "Poppins", size: 11, weight: "600" }, color: "#334155" }
                    },
                    tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.92)",
                        titleFont: { size: 11, weight: "700", family: "Poppins" },
                        bodyFont: { size: 11, family: "Poppins" },
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y || 0).toLocaleString("en-IN")} Units`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: "rgba(26, 84, 212, 0.06)" },
                        ticks: { font: { size: 10, family: "Poppins" }, color: "#64748b" }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10, family: "Poppins", weight: "600" }, color: "#334155" }
                    }
                }
            }
        });

        return () => {
            futuristicChartInstanceRef.current?.destroy();
            futuristicChartInstanceRef.current = null;
        };
    }, [fsActiveTab, filteredFuturisticRows]);

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

    const uniquePtTypes = useMemo(() => {
        const set = new Set();
        priceTrendRows.forEach(r => {
            if (r.type) set.add(r.type);
        });
        const order = ["up", "down", "flat"];
        return Array.from(set).sort((a, b) => {
            const ai = order.indexOf(a);
            const bi = order.indexOf(b);
            if (ai !== -1 && bi !== -1) return ai - bi;
            return a.localeCompare(b);
        });
    }, [priceTrendRows]);

    const filteredPtDropdownTypes = useMemo(() => {
        const q = ptTypeSearch.toLowerCase().trim();
        if (!q) return uniquePtTypes;
        return uniquePtTypes.filter(t => {
            const label = t === "up" ? "Price Increase Up" : t === "down" ? "Price Decrease Down" : t === "flat" ? "No Change Flat" : t;
            return label.toLowerCase().includes(q);
        });
    }, [uniquePtTypes, ptTypeSearch]);

    const handlePtTypeToggle = (type) => {
        setPtTypeFilter(prev => {
            if (prev.includes(type)) {
                return prev.filter(t => t !== type);
            } else {
                return [...prev, type];
            }
        });
    };

    const uniquePtSuppliers = useMemo(() => {
        const set = new Set();
        priceTrendRows.forEach(r => {
            const name = (r.supplierName || r.supplier || "").trim();
            if (name && name !== "—") set.add(name);
        });
        return Array.from(set).sort();
    }, [priceTrendRows]);

    const filteredPtDropdownSuppliers = useMemo(() => {
        const q = ptSupplierSearch.toLowerCase().trim();
        if (!q) return uniquePtSuppliers;
        return uniquePtSuppliers.filter(s => s.toLowerCase().includes(q));
    }, [uniquePtSuppliers, ptSupplierSearch]);

    const uniquePtParts = useMemo(() => {
        const set = new Set();
        priceTrendRows.forEach(r => {
            const p = (r.partDesc || r.partNo || "").trim();
            if (p && p !== "—") set.add(p);
        });
        return Array.from(set).sort();
    }, [priceTrendRows]);

    const filteredPtDropdownParts = useMemo(() => {
        const q = ptPartSearch.toLowerCase().trim();
        if (!q) return uniquePtParts;
        return uniquePtParts.filter(p => p.toLowerCase().includes(q));
    }, [uniquePtParts, ptPartSearch]);

    const handlePtSupplierToggle = (sup) => {
        setPtSupplierFilter(prev => {
            if (prev.includes(sup)) {
                return prev.filter(s => s !== sup);
            } else {
                return [...prev, sup];
            }
        });
    };

    const handlePtPartToggle = (part) => {
        setPtPartFilter(prev => {
            if (prev.includes(part)) {
                return prev.filter(p => p !== part);
            } else {
                return [...prev, part];
            }
        });
    };

    const filteredPriceTrendRows = useMemo(() => {
        return priceTrendRows.filter(r => {
            if (ptTypeFilter.length > 0) {
                const t = (r.type || "").trim();
                if (!ptTypeFilter.includes(t)) return false;
            }

            if (ptSupplierFilter.length > 0) {
                const sup = (r.supplierName || r.supplier || "").trim();
                if (!ptSupplierFilter.includes(sup)) return false;
            }

            if (ptPartFilter.length > 0) {
                const part = (r.partDesc || r.partNo || "").trim();
                if (!ptPartFilter.includes(part)) return false;
            }

            const q = searchQuery.toLowerCase().trim();
            if (q) {
                const match = (r.partDesc && r.partDesc.toLowerCase().includes(q)) ||
                    (r.supplierName && r.supplierName.toLowerCase().includes(q)) ||
                    (r.supplier && r.supplier.toLowerCase().includes(q)) ||
                    (r.month && r.month.toLowerCase().includes(q)) ||
                    (r.type && r.type.toLowerCase().includes(q));
                if (!match) return false;
            }
            return true;
        });
    }, [priceTrendRows, ptTypeFilter, ptSupplierFilter, ptPartFilter, searchQuery]);

    const [collapsedPtSuppliers, setCollapsedPtSuppliers] = useState({});

    const togglePtSupplierCollapse = (sup) => {
        setCollapsedPtSuppliers(prev => ({
            ...prev,
            [sup]: !prev[sup]
        }));
    };

    const groupedPriceTrendBySupplier = useMemo(() => {
        const groups = {};
        filteredPriceTrendRows.forEach(row => {
            const sup = (row.supplierName || row.supplier || "Other / Unassigned").trim();
            if (!groups[sup]) {
                groups[sup] = {
                    supplierName: sup,
                    items: [],
                    totalDiff: 0,
                    upCount: 0,
                    downCount: 0,
                };
            }
            groups[sup].items.push(row);
            if (row.type === "up") {
                groups[sup].upCount++;
                groups[sup].totalDiff += (row.diff || 0);
            } else if (row.type === "down") {
                groups[sup].downCount++;
                groups[sup].totalDiff -= (row.diff || 0);
            }
        });
        return Object.values(groups);
    }, [filteredPriceTrendRows]);

    const filteredTraceData = useMemo(() => {
        return traceRows.filter(row => {
            const q = (searchQuery || traceSearch || "").toLowerCase().trim();
            if (!q) return true;
            return (
                (row.supplierName || "").toLowerCase().includes(q) ||
                (row.indNo || "").toLowerCase().includes(q) ||
                (row.indPoNo || "").toLowerCase().includes(q) ||
                (row.material || "").toLowerCase().includes(q) ||
                (row.grnNo || "").toLowerCase().includes(q) ||
                (row.poType || "").toLowerCase().includes(q)
            );
        });
    }, [traceRows, traceSearch, searchQuery]);

    const handleExportTraceabilityCsv = () => {
        if (!filteredTraceData || filteredTraceData.length === 0) return;

        const headers = [
            "#",
            "IND NO",
            "IND DATE",
            "PO NO",
            "PO DATE",
            "PO TYPE",
            "SUPPLIER NAME",
            "MATERIAL",
            "PO QTY",
            "PO RATE",
            "PO VALUE",
            "APPROVED STATUS",
            "GRN NO",
            "GRN DATE",
            "GRN MATERIAL",
            "GRN OK QTY",
            "GRN RATE",
            "GRN VALUE",
            "AMND"
        ];

        const rows = filteredTraceData.map((row, index) => [
            row.sno ?? (index + 1),
            row.indNo && row.indNo !== "–" && row.indNo !== "-" ? row.indNo : "–",
            row.indDt || "–",
            row.indPoNo && row.indPoNo !== "–" && row.indPoNo !== "-" ? row.indPoNo : "–",
            row.poDt || "–",
            row.poType || "–",
            row.supplierName || "–",
            row.material || "–",
            row.poQty !== undefined && row.poQty !== null ? row.poQty : "–",
            row.poRate !== undefined && row.poRate !== null && row.poRate !== "" ? row.poRate : "0.00",
            row.poValue !== undefined && row.poValue !== null ? row.poValue : "0",
            row.approvedStatus || "N",
            row.grnNo && row.grnNo !== "–" && row.grnNo !== "-" ? row.grnNo : "–",
            row.grnDt || "–",
            row.grnMaterial || "–",
            row.grnOky !== undefined && row.grnOky !== null ? row.grnOky : "–",
            row.grnRate !== undefined && row.grnRate !== null && row.grnRate !== "" ? row.grnRate : "0.00",
            row.grnValue !== undefined && row.grnValue !== null ? row.grnValue : "0",
            row.amnd || "N"
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(val => `"${String(val ?? "").replace(/"/g, '""')}"`).join(","))
        ].join("\r\n");

        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const fromStr = dateRange?.from ? new Date(dateRange.from).toISOString().slice(0, 10) : "";
        const toStr = dateRange?.to ? new Date(dateRange.to).toISOString().slice(0, 10) : "";
        const dateSuffix = fromStr && toStr ? `_${fromStr}_to_${toStr}` : "";
        link.setAttribute("download", `Traceability_Report${dateSuffix}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const trendRef = useRef(null);
    const supRef = useRef(null);
    const catRef = useRef(null);
    const ratingRef = useRef(null);
    const trendChart = useRef(null);
    const supChart = useRef(null);
    const catChart = useRef(null);
    const ratingChart = useRef(null);
    const monthlyChartRef = useRef(null);
    const monthlyChart = useRef(null);
    const poVsGrnChartRef = useRef(null);
    const poVsGrnChartInst = useRef(null);
    const deptChartRef = useRef(null);
    const deptChartInst = useRef(null);

    // Custom PO Type dropdown state
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
            if (ptTypeRef.current && !ptTypeRef.current.contains(event.target)) {
                setPtTypeDropdownOpen(false);
            }
            if (ptSupplierRef.current && !ptSupplierRef.current.contains(event.target)) {
                setPtSupplierDropdownOpen(false);
            }
            if (ptPartRef.current && !ptPartRef.current.contains(event.target)) {
                setPtPartDropdownOpen(false);
            }
            if (poTableDeptRef.current && !poTableDeptRef.current.contains(event.target)) {
                setPoTableDeptDropdownOpen(false);
            }
            if (poTablePendingRef.current && !poTablePendingRef.current.contains(event.target)) {
                setPoTablePendingDropdownOpen(false);
            }
            if (fsSupplierRef.current && !fsSupplierRef.current.contains(event.target)) {
                setFsSupplierDropdownOpen(false);
            }
            if (fsPartRef.current && !fsPartRef.current.contains(event.target)) {
                setFsPartDropdownOpen(false);
            }
            if (futuristicSupplierRef.current && !futuristicSupplierRef.current.contains(event.target)) {
                setFuturisticSupplierDropdownOpen(false);
            }
            if (futuristicPartRef.current && !futuristicPartRef.current.contains(event.target)) {
                setFuturisticPartDropdownOpen(false);
            }
            if (apvFilterRef.current && !apvFilterRef.current.contains(event.target)) {
                setApvFilterDropdownOpen(false);
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
        if (debouncedSearchQuery) {
            params.set("search", debouncedSearchQuery);
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
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier, debouncedSearchQuery]);

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
        if (debouncedSearchQuery) {
            params.set("search", debouncedSearchQuery);
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
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier, debouncedSearchQuery]);

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
        if (debouncedSearchQuery) {
            params.set("search", debouncedSearchQuery);
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
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier, debouncedSearchQuery]);

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
        if (debouncedSearchQuery) {
            params.set("search", debouncedSearchQuery);
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
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier, debouncedSearchQuery]);

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
        if (debouncedSearchQuery) {
            params.set("search", debouncedSearchQuery);
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
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier, debouncedSearchQuery]);

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
        if (debouncedSearchQuery) {
            params.set("search", debouncedSearchQuery);
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
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier, debouncedSearchQuery]);

    // ── Fetch PO Fulfillment Schedule ────────────────────────────
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
        if (debouncedSearchQuery) {
            params.set("search", debouncedSearchQuery);
        }
        const ctrl = new AbortController();
        setFsLoading(true);
        fetch(`${API_BASE}/purchase-analysis/fulfillment-schedule/?${params}`, {
            credentials: "include",
            signal: ctrl.signal,
        })
            .then(r => r.json())
            .then(data => {
                setFulfillmentScheduleRows(data?.rows ?? []);
                setFsLoading(false);
            })
            .catch(err => {
                if (err.name !== "AbortError") setFsLoading(false);
            });
        return () => ctrl.abort();
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier, debouncedSearchQuery]);

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
        if (debouncedSearchQuery) {
            params.set("search", debouncedSearchQuery);
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
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier, debouncedSearchQuery]);

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
                        formatter: (v) => (v > 0 ? `₹${v.toFixed(2)}L` : ""),
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
        if (debouncedSearchQuery) {
            params.set("search", debouncedSearchQuery);
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
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier, debouncedSearchQuery]);

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
        if (debouncedSearchQuery) {
            params.set("search", debouncedSearchQuery);
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
    }, [dateRange.from, dateRange.to, filters.poType, filters.supplier, debouncedSearchQuery]);

    // ── Fetch Supplier Rating ───────────────────
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        const toIso = d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };
        const params = new URLSearchParams({ from: toIso(dateRange.from), to: toIso(dateRange.to), type: "supplier" });
        if (debouncedSearchQuery) {
            params.set("search", debouncedSearchQuery);
        }
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
    }, [dateRange.from, dateRange.to, debouncedSearchQuery]);

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
        setPoTableSearchQuery("");
        setFilters({
            fromDate: toIso(startOfMonth), toDate: toIso(endOfMonth),
            poType: "All Types", supplier: ["All Suppliers"],
            department: "Production", status: "All Status"
        });
    };

    const isGlobalLoading = poLoading || supplierRatingLoading || summaryLoading || trendLoading || chartsLoading || amendedPoLoading || shortCloseLoading || priceTrendLoading || alertsLoading || traceLoading || fsLoading;

    useEffect(() => {
        if (isGlobalLoading) {
            setPoDropdownOpen(false);
            setSupplierDropdownOpen(false);
        }
    }, [isGlobalLoading]);

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

    // ── PO Fulfillment Schedule Chart Effect ──
    useEffect(() => {
        if (fsActiveTab !== "standard" || !fsChartCanvasRef.current) return;
        if (fsChartInstanceRef.current) {
            fsChartInstanceRef.current.destroy();
            fsChartInstanceRef.current = null;
        }

        const ctx = fsChartCanvasRef.current.getContext("2d");
        if (!ctx) return;

        if (fsChartType === "timeline") {
            const monthMap = {};
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            filteredFsRows.forEach(r => {
                // PO Month aggregation
                if (r.po_date) {
                    const pD = new Date(r.po_date);
                    if (!isNaN(pD.getTime())) {
                        const sortKey = `${pD.getFullYear()}-${String(pD.getMonth() + 1).padStart(2, "0")}`;
                        const label = `${monthNames[pD.getMonth()]} ${pD.getFullYear()}`;
                        if (!monthMap[sortKey]) monthMap[sortKey] = { label, poVal: 0, schdVal: 0 };
                        monthMap[sortKey].poVal += (r.po_qty_num || 0) * (r.rate || 0);
                    }
                }
                // Scheduled Month aggregation
                if (r.schd_dt) {
                    const sD = new Date(r.schd_dt);
                    if (!isNaN(sD.getTime())) {
                        const sortKey = `${sD.getFullYear()}-${String(sD.getMonth() + 1).padStart(2, "0")}`;
                        const label = `${monthNames[sD.getMonth()]} ${sD.getFullYear()}`;
                        if (!monthMap[sortKey]) monthMap[sortKey] = { label, poVal: 0, schdVal: 0 };
                        monthMap[sortKey].schdVal += (r.schd_qty_num || 0) * (r.rate || 0);
                    }
                }
            });

            const sortedKeys = Object.keys(monthMap).sort();
            const labels = sortedKeys.map(k => monthMap[k].label);
            const poVals = sortedKeys.map(k => Math.round(monthMap[k].poVal || 0));
            const schdVals = sortedKeys.map(k => Math.round(monthMap[k].schdVal || 0));

            const formatVal = (v) => {
                if (!v || v === 0) return "";
                if (Math.abs(v) >= 100000) {
                    const lakhs = v / 100000;
                    return `₹${Number(lakhs.toFixed(4))}L`;
                }
                return `₹${Math.round(v).toLocaleString("en-IN")}`;
            };

            const formatTooltipVal = (v) => {
                if (!v || v === 0) return "₹0";
                if (Math.abs(v) >= 100000) {
                    const lakhs = v / 100000;
                    return `₹${Number(lakhs.toFixed(4))}L`;
                }
                return `₹${Math.round(v).toLocaleString("en-IN")}`;
            };

            fsChartInstanceRef.current = new Chart(ctx, {
                type: "bar",
                data: {
                    labels,
                    datasets: [
                        {
                            type: "bar",
                            label: "PO Value",
                            data: poVals,
                            backgroundColor: "rgba(37, 99, 235, 0.85)",
                            borderColor: "#1d4ed8",
                            borderWidth: 1.5,
                            borderRadius: 6,
                            barPercentage: 0.6,
                            categoryPercentage: 0.75,
                            datalabels: {
                                display: true,
                                align: "top",
                                anchor: "end",
                                color: "#1e293b",
                                font: { size: 10, weight: "700", family: "Poppins" },
                                formatter: v => formatVal(v)
                            }
                        },
                        {
                            type: "bar",
                            label: "Schd Value",
                            data: schdVals,
                            backgroundColor: "rgba(16, 185, 129, 0.85)",
                            borderColor: "#059669",
                            borderWidth: 1.5,
                            borderRadius: 6,
                            barPercentage: 0.6,
                            categoryPercentage: 0.75,
                            datalabels: {
                                display: true,
                                align: "top",
                                anchor: "end",
                                color: "#059669",
                                font: { size: 10, weight: "700", family: "Poppins" },
                                formatter: v => formatVal(v)
                            }
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
                            align: "end",
                            labels: { boxWidth: 12, boxHeight: 12, borderRadius: 3, font: { size: 11, family: "Poppins" } }
                        },
                        tooltip: {
                            backgroundColor: "rgba(15, 23, 42, 0.92)",
                            padding: 10,
                            borderRadius: 8,
                            titleFont: { size: 12, weight: "600", family: "Poppins" },
                            bodyFont: { size: 11, family: "Poppins" },
                            callbacks: {
                                label: (context) => ` ${context.dataset.label}: ${formatTooltipVal(context.raw)}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 11, weight: "600", family: "Poppins" } }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: "rgba(226, 232, 240, 0.8)" },
                            title: { display: true, text: "Value (₹)", font: { size: 10.5, family: "Poppins", weight: "600" } },
                            ticks: {
                                callback: v => (v >= 100000 ? `₹${(v / 100000).toFixed(2)}L` : (v > 0 ? `₹${v.toLocaleString("en-IN")}` : "0")),
                                font: { size: 10, family: "Poppins" }
                            }
                        }
                    }
                }
            });
        } else if (fsChartType === "aging") {
            const counts = [fsTotals.deliveredCount, fsTotals.onTrackCount, fsTotals.dueSoonCount, fsTotals.overdueCount];
            fsChartInstanceRef.current = new Chart(ctx, {
                type: "doughnut",
                data: {
                    labels: ["Delivered", "On Track (<15d)", "Due Soon (16-30d)", "Overdue (>30d)"],
                    datasets: [
                        {
                            data: counts,
                            backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"],
                            borderWidth: 2,
                            borderColor: "#ffffff",
                            hoverOffset: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: "right", labels: { font: { size: 11.5, family: "Poppins" } } },
                        datalabels: {
                            color: "#fff",
                            font: { weight: "700", size: 11 },
                            formatter: (value, ctx) => {
                                const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                if (!sum || value === 0) return "";
                                const pct = ((value / sum) * 100).toFixed(0);
                                return `${pct}%`;
                            }
                        }
                    },
                    cutout: "62%"
                }
            });
        } else if (fsChartType === "supplier") {
            const supMap = {};
            filteredFsRows.forEach(r => {
                const s = r.supplier.length > 20 ? r.supplier.substring(0, 18) + "…" : r.supplier;
                if (!supMap[s]) supMap[s] = { schd: 0, grn: 0 };
                supMap[s].schd += r.schd_qty_num || 0;
                supMap[s].grn += r.grn_qty_num || 0;
            });
            const topSuppliers = Object.keys(supMap).slice(0, 8);
            const supRates = topSuppliers.map(s => {
                const { schd, grn } = supMap[s];
                return schd > 0 ? Math.round((grn / schd) * 100) : 0;
            });

            fsChartInstanceRef.current = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: topSuppliers,
                    datasets: [
                        {
                            axis: "y",
                            label: "Supplier Delivery Compliance (%)",
                            data: supRates,
                            backgroundColor: supRates.map(v => v >= 80 ? "#10b981" : v >= 50 ? "#3b82f6" : "#f59e0b"),
                            borderRadius: 6,
                            barPercentage: 0.6,
                            datalabels: {
                                anchor: "end",
                                align: "end",
                                color: "#334155",
                                font: { weight: "700", size: 10 },
                                formatter: v => `${v}%`
                            }
                        }
                    ]
                },
                options: {
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%` } },
                        y: { grid: { display: false }, ticks: { font: { size: 10.5, family: "Poppins" } } }
                    }
                }
            });
        }

        return () => {
            if (fsChartInstanceRef.current) {
                fsChartInstanceRef.current.destroy();
                fsChartInstanceRef.current = null;
            }
        };
    }, [fsActiveTab, fsChartType, filteredFsRows, fsTotals]);

    // ═══════════════════════════════════════════════════════════════
    //  Average Purchase Value (APV) Calculations & Aggregations
    // ═══════════════════════════════════════════════════════════════
    const apvRawRows = useMemo(() => {
        return filteredPoRows.filter(r => {
            const typeLower = (r.po_type || "").toLowerCase();
            return typeLower.includes("raw") || typeLower.includes("rm");
        });
    }, [filteredPoRows]);

    const apvStoreRows = useMemo(() => {
        return filteredPoRows.filter(r => {
            const typeLower = (r.po_type || "").toLowerCase();
            return !typeLower.includes("raw") && !typeLower.includes("rm");
        });
    }, [filteredPoRows]);

    // Unique Store Groups list
    const storeGroupsList = useMemo(() => {
        const set = new Set();
        apvStoreRows.forEach(r => {
            const g = getStoreMaterialGroup(r);
            if (g) set.add(g);
        });
        return ["All", ...Array.from(set).sort()];
    }, [apvStoreRows]);

    // Category / Group Counts for Dynamic Badges
    const rawCategoryCounts = useMemo(() => {
        const counts = { "All": apvRawRows.length, "Nos (Casting)": 0, "KGS (Rod)": 0, "Mtrs (Rod)": 0, "B.Out": 0 };
        apvRawRows.forEach(r => {
            const cat = getRawMaterialCategory(r);
            if (counts[cat] !== undefined) counts[cat]++;
        });
        return counts;
    }, [apvRawRows]);

    const storeGroupCounts = useMemo(() => {
        const counts = { "All": apvStoreRows.length };
        apvStoreRows.forEach(r => {
            const g = getStoreMaterialGroup(r);
            counts[g] = (counts[g] || 0) + 1;
        });
        return counts;
    }, [apvStoreRows]);

    const activeApvRows = useMemo(() => {
        if (apvMode === "raw") {
            if (apvRawCategories.length === 0) return apvRawRows;
            return apvRawRows.filter(r => apvRawCategories.includes(getRawMaterialCategory(r)));
        } else {
            if (apvStoreGroups.length === 0) return apvStoreRows;
            return apvStoreRows.filter(r => apvStoreGroups.includes(getStoreMaterialGroup(r)));
        }
    }, [apvMode, apvRawRows, apvStoreRows, apvRawCategories, apvStoreGroups]);

    // Multi-Series Category / Group-wise Monthly Trend for Pure Line Graph
    const apvCategoryMonthlyData = useMemo(() => {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const rowsToUse = apvMode === "raw" ? apvRawRows : apvStoreRows;

        // 1. Collect all unique timeline months in chronological order
        const monthsSet = new Set();
        rowsToUse.forEach(r => {
            if (!r.po_date) return;
            const parts = r.po_date.split("-");
            if (parts.length === 3) {
                const mIdx = parseInt(parts[1], 10) - 1;
                if (mIdx >= 0 && mIdx < 12) monthsSet.add(`${monthNames[mIdx]} ${parts[0]}`);
            } else {
                const slashParts = r.po_date.split("/");
                if (slashParts.length === 3) {
                    const mIdx = parseInt(slashParts[1], 10) - 1;
                    if (mIdx >= 0 && mIdx < 12) monthsSet.add(`${monthNames[mIdx]} ${slashParts[2]}`);
                }
            }
        });

        const sortedMonths = Array.from(monthsSet).sort((a, b) => {
            const parseScore = (mKey) => {
                const p = mKey.split(" ");
                if (p.length !== 2) return 0;
                const mIdx = monthNames.indexOf(p[0]);
                const yVal = parseInt(p[1], 10) || 0;
                return yVal * 12 + (mIdx >= 0 ? mIdx : 0);
            };
            return parseScore(a) - parseScore(b);
        });

        // 2. Build Series Definitions (Category-wise for Raw, Group-wise for Store)
        let seriesList = [];
        if (apvMode === "raw") {
            const rawCatColors = {
                "Nos (Casting)": { color: "#0284c7", bg: "rgba(2, 132, 199, 0.08)" },
                "KGS (Rod)": { color: "#ea580c", bg: "rgba(234, 88, 12, 0.08)" },
                "Mtrs (Rod)": { color: "#059669", bg: "rgba(5, 150, 105, 0.08)" },
                "B.Out": { color: "#7c3aed", bg: "rgba(124, 58, 237, 0.08)" }
            };

            const cats = apvRawCategories.length === 0
                ? ["Nos (Casting)", "KGS (Rod)", "Mtrs (Rod)", "B.Out"]
                : apvRawCategories;

            seriesList = cats.map(cat => ({
                id: cat,
                name: cat,
                color: rawCatColors[cat]?.color || "#2563eb",
                bg: rawCatColors[cat]?.bg || "rgba(37, 99, 235, 0.08)"
            }));
        } else {
            const storePalette = ["#7c3aed", "#0284c7", "#ea580c", "#059669", "#ec4899", "#d97706", "#06b6d4", "#6366f1", "#84cc16"];
            const groups = apvStoreGroups.length === 0
                ? storeGroupsList.filter(g => g !== "All").slice(0, 7)
                : apvStoreGroups;

            seriesList = groups.map((grp, idx) => ({
                id: grp,
                name: grp,
                color: storePalette[idx % storePalette.length],
                bg: "rgba(124, 58, 237, 0.08)"
            }));
        }

        // 3. Compute Monthly Data Points for each Series
        const datasets = seriesList.map(series => {
            const monthValues = sortedMonths.map(month => {
                let totalVal = 0;
                rowsToUse.forEach(r => {
                    if (!r.po_date) return;
                    let mKey = "";
                    const parts = r.po_date.split("-");
                    if (parts.length === 3) {
                        const mIdx = parseInt(parts[1], 10) - 1;
                        if (mIdx >= 0 && mIdx < 12) mKey = `${monthNames[mIdx]} ${parts[0]}`;
                    } else {
                        const slashParts = r.po_date.split("/");
                        if (slashParts.length === 3) {
                            const mIdx = parseInt(slashParts[1], 10) - 1;
                            if (mIdx >= 0 && mIdx < 12) mKey = `${monthNames[mIdx]} ${slashParts[2]}`;
                        }
                    }

                    if (mKey !== month) return;

                    const catOrGrp = apvMode === "raw" ? getRawMaterialCategory(r) : getStoreMaterialGroup(r);
                    if (catOrGrp === series.id) {
                        totalVal += Number(r.value || 0);
                    }
                });
                return Number((totalVal / 100000).toFixed(2));
            });

            return {
                id: series.id,
                label: series.name,
                data: monthValues,
                color: series.color,
                bg: series.bg
            };
        });

        return {
            labels: sortedMonths,
            datasets
        };
    }, [apvMode, apvRawCategories, apvStoreGroups, apvRawRows, apvStoreRows, storeGroupsList]);

    // Material-Level Summary for Table
    const apvMaterialSummary = useMemo(() => {
        const map = {};

        activeApvRows.forEach(r => {
            const name = (r.material || "Unknown Material").trim();
            const code = (r.material_code || "–").trim();
            const key = `${code}___${name}`;
            const val = Number(r.value || 0);
            const qty = Number(r.qty || 0);
            const rate = Number(r.rate || (qty > 0 ? val / qty : 0));
            const uom = normalizePoUom(r.uom, r.material);
            const catOrGrp = apvMode === "raw" ? getRawMaterialCategory(r) : getStoreMaterialGroup(r);

            if (!map[key]) {
                map[key] = {
                    id: key,
                    material: name,
                    materialCode: code,
                    categoryOrGroup: catOrGrp,
                    uom: uom,
                    poCount: 0,
                    totalQty: 0,
                    totalValue: 0,
                    minRate: rate > 0 ? rate : Infinity,
                    maxRate: rate > 0 ? rate : 0,
                    poNumbers: new Set(),
                    suppliers: new Set(),
                    latestPoDate: r.po_date || ""
                };
            }

            map[key].poCount += 1;
            map[key].totalQty += qty;
            map[key].totalValue += val;
            if (rate > 0) {
                if (rate < map[key].minRate) map[key].minRate = rate;
                if (rate > map[key].maxRate) map[key].maxRate = rate;
            }
            if (r.po_number) map[key].poNumbers.add(r.po_number);
            if (r.vendor_name) map[key].suppliers.add(r.vendor_name);
            if (r.po_date && (!map[key].latestPoDate || r.po_date > map[key].latestPoDate)) {
                map[key].latestPoDate = r.po_date;
            }
        });

        // Compute overall weighted avg rate across all rows to provide benchmark
        const allSpend = activeApvRows.reduce((acc, r) => acc + Number(r.value || 0), 0);
        const allQty = activeApvRows.reduce((acc, r) => acc + Number(r.qty || 0), 0);
        const overallAvgRate = allQty > 0 ? allSpend / allQty : 0;

        return Object.values(map).map(item => {
            const minRate = item.minRate === Infinity ? 0 : item.minRate;
            const avgRate = item.totalQty > 0 ? (item.totalValue / item.totalQty) : 0;
            const avgPoVal = item.poCount > 0 ? (item.totalValue / item.poCount) : 0;
            return {
                ...item,
                minRate,
                avgRate,
                avgPoVal,
                uniquePos: item.poNumbers.size,
                uniqueSuppliers: item.suppliers.size,
                benchmark: overallAvgRate > 0 ? (avgRate / overallAvgRate) : 1
            };
        });
    }, [activeApvRows]);

    // Summary KPI stats for active APV mode
    const apvTotals = useMemo(() => {
        let totalSpend = 0;
        let totalQty = 0;
        let maxPoValue = 0;
        let grnRealizedSpend = 0;
        let grnReceivedCount = 0;

        activeApvRows.forEach(r => {
            const val = Number(r.value || 0);
            totalSpend += val;

            const rawQtyStr = String(r.po_qty ?? r.qty ?? "").trim();
            const qtyMatch = rawQtyStr.match(/^[+-]?[\d,]+(\.\d+)?/);
            const q = qtyMatch ? parseFloat(qtyMatch[0].replace(/,/g, "")) : (Number(r.qty || r.po_qty) || 0);
            totalQty += (q > 0 ? q : 0);

            if (val > maxPoValue) maxPoValue = val;

            const hasGrn = Boolean(r.grn_no && r.grn_no !== "–" && r.grn_no !== "-" && r.grn_no.trim() !== "");
            if (hasGrn) {
                grnRealizedSpend += val;
                grnReceivedCount += 1;
            }
        });

        const totalPos = activeApvRows.length;
        const totalMaterials = apvMaterialSummary.length;
        const avgRate = totalQty > 0 ? totalSpend / totalQty : 0;
        const avgPoValue = totalPos > 0 ? totalSpend / totalPos : 0;
        const avgSkuSpend = totalMaterials > 0 ? totalSpend / totalMaterials : 0;
        const fulfillmentRate = totalSpend > 0 ? (grnRealizedSpend / totalSpend) * 100 : 0;

        return {
            totalSpend,
            totalSpendLakhs: totalSpend / 100000,
            totalQty,
            totalPos,
            totalMaterials,
            avgRate,
            avgPoValue,
            avgSkuSpend,
            maxPoValue,
            maxPoValueLakhs: maxPoValue / 100000,
            grnRealizedSpend,
            grnRealizedLakhs: grnRealizedSpend / 100000,
            grnReceivedCount,
            fulfillmentRate
        };
    }, [activeApvRows, apvMaterialSummary]);

    // Material-Level Average Purchase Value lookup for benchmark
    const materialAvgRateMap = useMemo(() => {
        const map = {};
        activeApvRows.forEach(r => {
            const key = (r.material_code || r.material || "").trim();
            const val = Number(r.value || 0);
            const rawStr = String(r.po_qty || r.qty || "").trim();
            const qtyMatch = rawStr.match(/^[+-]?[\d,]+(\.\d+)?/);
            const qty = qtyMatch ? parseFloat(qtyMatch[0].replace(/,/g, "")) : (Number(r.qty || r.po_qty) || 0);

            if (!map[key]) map[key] = { totalVal: 0, totalQty: 0, count: 0 };
            map[key].totalVal += val;
            map[key].totalQty += (qty > 0 ? qty : 1);
            map[key].count += 1;
        });

        const result = {};
        Object.keys(map).forEach(k => {
            result[k] = map[k].totalQty > 0 ? (map[k].totalVal / map[k].totalQty) : (map[k].totalVal / (map[k].count || 1));
        });
        return result;
    }, [activeApvRows]);

    // Detailed Line-Item Breakdown for Table: Sl.NO, PoNO, PODate, Partno, Description, PO Qty, Uom, Catogory, Po Rate, Amt, GRN NO, GRn Date, Grn Qty & Avg Value
    const apvTableRows = useMemo(() => {
        return activeApvRows.map((r, idx) => {
            const code = (r.material_code || "–").trim();
            const mat = (r.material || "–").trim();
            const key = (code && code !== "–") ? code : mat;

            const rawQtyStr = String(r.po_qty || r.qty || "0").trim();
            const qtyMatch = rawQtyStr.match(/^[+-]?[\d,]+(\.\d+)?/);
            const poQtyNum = qtyMatch ? parseFloat(qtyMatch[0].replace(/,/g, "")) : (Number(r.qty || r.po_qty) || 0);

            const amt = Number(r.value || 0);
            const poRate = Number(r.rate || (poQtyNum > 0 ? amt / poQtyNum : 0));
            const uom = normalizePoUom(r.uom || r.unit, mat);
            const category = apvMode === "raw" ? getRawMaterialCategory(r) : getStoreMaterialGroup(r);

            // GRN fields
            const grnNo = (r.grn_no && r.grn_no !== "-" && r.grn_no !== "–" && r.grn_no.trim() !== "") ? r.grn_no.trim() : "–";
            const grnDate = (r.grn_date && r.grn_date !== "-" && r.grn_date !== "–" && r.grn_date.trim() !== "") ? r.grn_date.trim() : "–";
            const rawGrnQtyStr = String(r.grn_qty || "").trim();
            const grnQtyMatch = rawGrnQtyStr.match(/^[+-]?[\d,]+(\.\d+)?/);
            const grnQtyNum = grnQtyMatch ? parseFloat(grnQtyMatch[0].replace(/,/g, "")) : (rawGrnQtyStr ? parseFloat(rawGrnQtyStr.replace(/[^\d.]/g, "")) : (grnNo !== "–" ? poQtyNum : null));

            const avgVal = materialAvgRateMap[key] || poRate;

            return {
                id: r.id || `${r.po_number || idx}_${code}_${idx}`,
                rawIndex: idx + 1,
                poNumber: r.po_number || "–",
                poDate: r.po_date || "–",
                partNo: code,
                description: mat,
                poQty: poQtyNum,
                poQtyStr: poQtyNum.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
                uom: uom,
                category: category,
                poRate: poRate,
                amt: amt,
                grnNo: grnNo,
                grnDate: grnDate,
                grnQty: grnQtyNum,
                avgValue: avgVal,
                originalRow: r
            };
        });
    }, [activeApvRows, apvMode, materialAvgRateMap]);

    // Live search & Sorting for Table
    const filteredApvTableRows = useMemo(() => {
        let result = apvTableRows;
        const q = apvSearch.toLowerCase().trim();
        if (q) {
            result = result.filter(r =>
                (r.poNumber && r.poNumber.toLowerCase().includes(q)) ||
                (r.poDate && r.poDate.toLowerCase().includes(q)) ||
                (r.partNo && r.partNo.toLowerCase().includes(q)) ||
                (r.description && r.description.toLowerCase().includes(q)) ||
                (r.uom && r.uom.toLowerCase().includes(q)) ||
                (r.category && r.category.toLowerCase().includes(q)) ||
                (r.grnNo && r.grnNo.toLowerCase().includes(q)) ||
                (r.grnDate && r.grnDate.toLowerCase().includes(q))
            );
        }

        return [...result].sort((a, b) => {
            let valA = a[apvSortConfig.key];
            let valB = b[apvSortConfig.key];
            if (typeof valA === "string") {
                return apvSortConfig.direction === "asc"
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            }
            return apvSortConfig.direction === "asc" ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
        });
    }, [apvTableRows, apvSearch, apvSortConfig]);

    // Slicing & Pagination
    const totalApvPages = apvPageSize === "All" ? 1 : Math.ceil(filteredApvTableRows.length / Number(apvPageSize)) || 1;
    const pagedApvTableRows = useMemo(() => {
        if (apvPageSize === "All") return filteredApvTableRows;
        const size = Number(apvPageSize);
        const start = (apvPage - 1) * size;
        return filteredApvTableRows.slice(start, start + size);
    }, [filteredApvTableRows, apvPage, apvPageSize]);

    // APV Category/Group-wise Column Chart Effect
    useEffect(() => {
        if (!apvShowChart || !apvChartCanvasRef.current) return;
        if (apvChartInstanceRef.current) {
            apvChartInstanceRef.current.destroy();
            apvChartInstanceRef.current = null;
        }

        const ctx = apvChartCanvasRef.current.getContext("2d");
        if (!ctx) return;

        if (!apvCategoryMonthlyData || apvCategoryMonthlyData.labels.length === 0) return;

        const chartDatasets = apvCategoryMonthlyData.datasets.map(ds => ({
            type: "bar",
            label: ds.label,
            data: ds.data,
            backgroundColor: ds.color,
            borderColor: ds.color,
            borderWidth: 1,
            borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
            barPercentage: 0.72,
            categoryPercentage: 0.68,
            datalabels: {
                display: (ctx) => {
                    const val = Number(ctx.dataset.data[ctx.dataIndex]) || 0;
                    return val > 0;
                },
                anchor: "end",
                align: "top",
                offset: 3,
                clip: false,
                color: ds.color || "#334155",
                font: { size: 10, weight: "750", family: "'Outfit', 'Inter', -apple-system, sans-serif" },
                formatter: (v) => {
                    const val = Number(v) || 0;
                    if (val <= 0) return "";
                    if (val >= 100) return `₹${Math.round(val)}L`;
                    if (val >= 10) return `₹${val.toFixed(1)}L`;
                    if (val >= 1) return `₹${val.toFixed(1)}L`;
                    if (val >= 0.05) return `₹${val.toFixed(1)}L`;
                    return `₹${val.toFixed(2)}L`;
                }
            }
        }));

        apvChartInstanceRef.current = new Chart(ctx, {
            type: "bar",
            data: {
                labels: apvCategoryMonthlyData.labels,
                datasets: chartDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 28,
                        left: 10,
                        right: 15,
                        bottom: 6
                    }
                },
                interaction: {
                    mode: "index",
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    datalabels: {
                        clip: false
                    },
                    tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.94)",
                        titleFont: { size: 12, weight: "700", family: "'Outfit', 'Inter', sans-serif" },
                        bodyFont: { size: 11, family: "'Outfit', 'Inter', sans-serif" },
                        footerFont: { size: 11.5, weight: "700", family: "'Outfit', 'Inter', sans-serif" },
                        padding: 12,
                        cornerRadius: 10,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                            label: (context) => {
                                const dsLabel = context.dataset.label || "";
                                const val = Number(context.parsed.y) || 0;
                                return `  ${dsLabel}: ₹${val.toFixed(2)} Lakhs (₹${(val * 100000).toLocaleString("en-IN")})`;
                            },
                            footer: (items) => {
                                const sum = items.reduce((acc, it) => acc + (Number(it.parsed.y) || 0), 0);
                                return `  Total Spend: ₹${sum.toFixed(2)} Lakhs (₹${(sum * 100000).toLocaleString("en-IN")})`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: false,
                        grid: { display: false },
                        ticks: { font: { size: 11, family: "'Outfit', 'Inter', sans-serif", weight: "600" }, color: "#64748b" }
                    },
                    y: {
                        type: "linear",
                        stacked: false,
                        beginAtZero: true,
                        grace: "25%",
                        display: true,
                        position: "left",
                        title: {
                            display: true,
                            text: "Purchase Spend (₹ Lakhs)",
                            color: "#64748b",
                            font: { size: 10.5, weight: "650", family: "'Outfit', 'Inter', sans-serif" }
                        },
                        grid: { color: "rgba(226, 232, 240, 0.6)" },
                        ticks: {
                            font: { size: 10.5, family: "'Outfit', 'Inter', sans-serif", weight: "500" },
                            color: "#64748b",
                            callback: (v) => `₹${v}L`
                        }
                    }
                }
            }
        });

        return () => {
            if (apvChartInstanceRef.current) {
                apvChartInstanceRef.current.destroy();
                apvChartInstanceRef.current = null;
            }
        };
    }, [apvShowChart, apvMode, apvCategoryMonthlyData]);

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
                <div className="pa2-filter-bar-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Settings className="pa2-pulse-loader" size={16} style={{ color: "#2d6de8" }} /> Report Filters
                    </div>
                    {isGlobalLoading && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.72rem", color: "#2d6de8", fontWeight: 600 }}>
                            <span className="pa2-pulse-dot" style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#2d6de8", display: "inline-block" }} />
                            Updating data...
                        </div>
                    )}
                </div>
                <div
                    className="pa2-filter-grid"
                    style={{
                        pointerEvents: isGlobalLoading ? "none" : "auto",
                        opacity: isGlobalLoading ? 0.72 : 1,
                        transition: "opacity 0.2s ease"
                    }}
                >
                    <div className="pa2-filter-group">
                        <label className="pa2-filter-label">Date Range</label>
                        <PurchaseAnalysisDatePicker
                            from={dateRange.from}
                            to={dateRange.to}
                            onChange={({ from, to }) => !isGlobalLoading && setDateRange({ from, to })}
                            disabled={isGlobalLoading}
                        />
                    </div>
                    <div className="pa2-filter-group">
                        <label className="pa2-filter-label">Search</label>
                        <div className="pa2-search-wrapper">
                            <Search className="pa2-search-icon-inside" size={14} />
                            <input
                                type="text"
                                className="pa2-search-input"
                                placeholder={isGlobalLoading ? "Loading data..." : "Search RM Name"}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={isGlobalLoading}
                                style={{
                                    paddingRight: searchQuery ? "2rem" : "0.85rem",
                                    cursor: isGlobalLoading ? "not-allowed" : "text",
                                    background: isGlobalLoading ? "#f8fafc" : undefined
                                }}
                            />
                            {searchQuery && !isGlobalLoading && (
                                <button
                                    type="button"
                                    className="pa2-search-clear-btn"
                                    onClick={() => setSearchQuery("")}
                                    disabled={isGlobalLoading}
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
                    <div className="pa2-filter-group pa2-filter-group-potype" ref={poDropdownRef}>
                        <label className="pa2-filter-label">PO Type</label>
                        <div className={`pa2-custom-select${poDropdownOpen && !isGlobalLoading ? " pa2-active" : ""}${isGlobalLoading ? " pa2-disabled" : ""}`}>
                            <button
                                type="button"
                                className="pa2-custom-select-trigger"
                                disabled={isGlobalLoading}
                                onClick={() => !isGlobalLoading && setPoDropdownOpen(!poDropdownOpen)}
                                style={isGlobalLoading ? { cursor: "not-allowed", opacity: 0.65, background: "#f1f5f9" } : {}}
                                onKeyDown={(e) => {
                                    if (isGlobalLoading) return;
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
                            {poDropdownOpen && !isGlobalLoading && (
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
                    <div className="pa2-filter-group pa2-filter-group-supplier" ref={supplierDropdownRef}>
                        <label className="pa2-filter-label">Supplier</label>
                        <div className={`pa2-custom-select${supplierDropdownOpen && !isGlobalLoading ? " pa2-active" : ""}${isGlobalLoading ? " pa2-disabled" : ""}`}>
                            <button
                                type="button"
                                className="pa2-custom-select-trigger"
                                disabled={isGlobalLoading}
                                onClick={() => !isGlobalLoading && setSupplierDropdownOpen(!supplierDropdownOpen)}
                                style={isGlobalLoading ? { cursor: "not-allowed", opacity: 0.65, background: "#f1f5f9" } : {}}
                                onKeyDown={(e) => {
                                    if (isGlobalLoading) return;
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
                            {supplierDropdownOpen && !isGlobalLoading && (
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
                        disabled={isGlobalLoading}
                        onClick={() => !isGlobalLoading && resetFilters()}
                        style={isGlobalLoading ? { cursor: "not-allowed", opacity: 0.55, pointerEvents: "none" } : {}}
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
                <div className="pa2-kpi-grid" data-spotlight="pa-kpis">
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
                <div className="pa2-kpi-grid" data-spotlight="pa-kpis">
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
                        <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}><PaNoData icon={<TrendingUp size={22} style={{ color: "#2d6de8" }} />} /></div>
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

                <div className="pa2-card pa2-chart-card pa2-card-premium" data-spotlight="pa-spend-category">
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
                        <div style={{ height: "250px", display: "flex", alignItems: "center", justifyContent: "center" }}><PaNoData icon={<TrendingUp size={22} style={{ color: "#10b981" }} />} /></div>
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
                        <div style={{ height: "250px", display: "flex", alignItems: "center", justifyContent: "center" }}><PaNoData icon={<Building2 size={22} style={{ color: "#8b5cf6" }} />} /></div>
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
                    <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}><PaNoData icon={<Package size={22} style={{ color: "#f5a623" }} />} /></div>
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

            {/* ── Average Purchase Value Section (Raw Material vs Store Material) ── */}
            <div className="pa2-card pa2-apv-card pa2-card-premium pa2-animate pa2-delay-4" style={{ marginBottom: "1.4rem" }}>
                <div className="pa2-apv-accent-bar" style={{ background: apvMode === "raw" ? "linear-gradient(90deg, #2563eb, #38bdf8, #60a5fa)" : "linear-gradient(90deg, #7c3aed, #c084fc, #a855f7)" }} />

                {/* Tier 1 Header */}
                <div className="pa2-apv-header-row">
                    <div className="pa2-apv-header-left">
                        <div className="pa2-apv-title-group">
                            <span className={`pa2-apv-icon-badge ${apvMode}`}>
                                <IndianRupee size={20} strokeWidth={2.5} />
                            </span>
                            <div>
                                <div className="pa2-apv-title-line">
                                    <span className="pa2-apv-title">Average Purchase Value</span>
                                    <span className="pa2-apv-filter-state-pill">
                                        <Tag size={10} />
                                        {apvMode === "raw"
                                            ? (apvRawCategories.length === 0
                                                ? "All Categories"
                                                : apvRawCategories.length === 1
                                                    ? apvRawCategories[0]
                                                    : `${apvRawCategories.length} Categories`)
                                            : (apvStoreGroups.length === 0
                                                ? "All Groups"
                                                : apvStoreGroups.length === 1
                                                    ? apvStoreGroups[0]
                                                    : `${apvStoreGroups.length} Groups`)}
                                    </span>
                                </div>
                                <div className="pa2-apv-subtitle">Unit rate benchmarks, monthly spend curves & material efficiency</div>
                            </div>
                        </div>

                        {/* Top 2 Buttons (Raw Material vs Store Material) */}
                        <div className="pa2-apv-tabs">
                            <button
                                type="button"
                                className={`pa2-apv-tab-btn ${apvMode === "raw" ? "active raw" : ""}`}
                                onClick={() => {
                                    setApvMode("raw");
                                    setApvRawCategories([]);
                                    setApvStoreGroups([]);
                                    setApvPage(1);
                                }}
                            >
                                <Package size={15} strokeWidth={2.2} />
                                <span>Raw Material</span>
                                <span className="pa2-apv-tab-badge">{apvRawRows.length} POs</span>
                            </button>
                            <button
                                type="button"
                                className={`pa2-apv-tab-btn ${apvMode === "store" ? "active store" : ""}`}
                                onClick={() => {
                                    setApvMode("store");
                                    setApvRawCategories([]);
                                    setApvStoreGroups([]);
                                    setApvPage(1);
                                }}
                            >
                                <Factory size={15} strokeWidth={2.2} />
                                <span>Store Material</span>
                                <span className="pa2-apv-tab-badge">{apvStoreRows.length} POs</span>
                            </button>
                        </div>
                    </div>

                    <div className="pa2-apv-header-right">
                        {/* Modern Standalone Category / Group Filter Dropdown (Multi-Select) */}
                        {(() => {
                            const selectedCount = apvMode === "raw" ? apvRawCategories.length : apvStoreGroups.length;
                            const hasFilter = selectedCount > 0;
                            const totalItemsCount = apvMode === "raw" ? (RAW_CATEGORIES.length - 1) : (storeGroupsList.length - 1);

                            return (
                                <div className={`pa2-apv-filter-dropdown-wrap ${apvMode}`} ref={apvFilterRef}>
                                    <button
                                        type="button"
                                        className={`pa2-apv-filter-btn ${apvMode} ${hasFilter ? "has-filter" : ""}`}
                                        onClick={() => setApvFilterDropdownOpen(!apvFilterDropdownOpen)}
                                        title={apvMode === "raw" ? "Filter by Raw Material Category (Multi-select)" : "Filter by Store Material Group (Multi-select)"}
                                    >
                                        {hasFilter ? (
                                            <span
                                                className="pa2-apv-btn-dot"
                                                style={{
                                                    background: apvMode === "raw"
                                                        ? (selectedCount === 1 ? (RAW_CATEGORIES.find(c => c.id === apvRawCategories[0])?.color || "#2563eb") : "#2563eb")
                                                        : "#7c3aed"
                                                }}
                                            />
                                        ) : (
                                            <SlidersHorizontal size={13} className="pa2-apv-filter-btn-icon" />
                                        )}
                                        <span className="pa2-apv-filter-btn-label">
                                            {apvMode === "raw" ? (
                                                <>
                                                    <span className="pa2-apv-filter-prefix">Category:</span>{" "}
                                                    <b className="pa2-apv-filter-val">
                                                        {apvRawCategories.length === 0
                                                            ? "All Categories"
                                                            : apvRawCategories.length === 1
                                                                ? apvRawCategories[0]
                                                                : `${apvRawCategories.length} Selected`}
                                                    </b>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="pa2-apv-filter-prefix">Group:</span>{" "}
                                                    <b className="pa2-apv-filter-val">
                                                        {apvStoreGroups.length === 0
                                                            ? "All Groups"
                                                            : apvStoreGroups.length === 1
                                                                ? apvStoreGroups[0]
                                                                : `${apvStoreGroups.length} Selected`}
                                                    </b>
                                                </>
                                            )}
                                        </span>
                                        <span className="pa2-apv-filter-badge">
                                            {activeApvRows.length}
                                        </span>
                                        <ChevronDown size={13} className={`pa2-apv-chevron ${apvFilterDropdownOpen ? "open" : ""}`} />
                                    </button>

                                    {apvFilterDropdownOpen && (
                                        <div className={`pa2-apv-filter-menu ${apvMode}`}>
                                            <div className="pa2-apv-filter-menu-head">
                                                <div className="pa2-apv-filter-menu-title">
                                                    <SlidersHorizontal size={12} style={{ color: apvMode === "raw" ? "#2563eb" : "#7c3aed" }} />
                                                    <span>{apvMode === "raw" ? "Raw Categories" : "Store Groups"}</span>
                                                    <span className="pa2-apv-opt-total-pill">
                                                        {hasFilter ? `${selectedCount} / ${totalItemsCount} selected` : "All Selected"}
                                                    </span>
                                                </div>
                                                <div className="pa2-apv-filter-actions">
                                                    <button
                                                        type="button"
                                                        className="pa2-apv-filter-action-btn select-all"
                                                        onClick={() => {
                                                            if (apvMode === "raw") setApvRawCategories([]);
                                                            else setApvStoreGroups([]);
                                                            setApvPage(1);
                                                        }}
                                                        title="Select All"
                                                    >
                                                        <CheckCheck size={11} /> All
                                                    </button>
                                                    {hasFilter && (
                                                        <button
                                                            type="button"
                                                            className="pa2-apv-filter-action-btn reset"
                                                            onClick={() => {
                                                                if (apvMode === "raw") setApvRawCategories([]);
                                                                else setApvStoreGroups([]);
                                                                setApvPage(1);
                                                            }}
                                                            title="Reset filter"
                                                        >
                                                            <RotateCcw size={10} /> Reset
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {apvMode === "store" && storeGroupsList.length > 5 && (
                                                <div className="pa2-apv-filter-search-box">
                                                    <Search size={12} className="pa2-apv-filter-search-icon" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search store groups..."
                                                        value={apvFilterSearch}
                                                        onChange={(e) => setApvFilterSearch(e.target.value)}
                                                        className="pa2-apv-filter-search-input"
                                                        autoFocus
                                                    />
                                                    {apvFilterSearch && (
                                                        <button type="button" onClick={() => setApvFilterSearch("")} className="pa2-apv-filter-search-clear">
                                                            <X size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            <div className="pa2-apv-filter-options">
                                                {apvMode === "raw" ? (
                                                    RAW_CATEGORIES.filter(c => c.id !== "All").map(cat => {
                                                        const isSelected = apvRawCategories.length === 0 || apvRawCategories.includes(cat.id);
                                                        const isExplicit = hasFilter && apvRawCategories.includes(cat.id);
                                                        const count = rawCategoryCounts[cat.id] ?? 0;
                                                        return (
                                                            <button
                                                                key={cat.id}
                                                                type="button"
                                                                className={`pa2-apv-filter-opt ${isSelected ? "selected" : ""} ${isExplicit ? "explicit" : ""}`}
                                                                onClick={() => toggleRawCategory(cat.id)}
                                                            >
                                                                <div className={`pa2-apv-custom-checkbox ${isSelected ? "checked" : ""}`}>
                                                                    {isSelected && <Check size={11} strokeWidth={3} />}
                                                                </div>
                                                                <span className="pa2-apv-opt-indicator" style={{ background: cat.color }} />
                                                                <span className="pa2-apv-opt-label">{cat.label}</span>
                                                                <span className="pa2-apv-opt-count">{count}</span>
                                                            </button>
                                                        );
                                                    })
                                                ) : (
                                                    storeGroupsList
                                                        .filter(g => g !== "All")
                                                        .filter(g => !apvFilterSearch || g.toLowerCase().includes(apvFilterSearch.toLowerCase().trim()))
                                                        .map(grp => {
                                                            const isSelected = apvStoreGroups.length === 0 || apvStoreGroups.includes(grp);
                                                            const isExplicit = hasFilter && apvStoreGroups.includes(grp);
                                                            const count = storeGroupCounts[grp] ?? 0;
                                                            return (
                                                                <button
                                                                    key={grp}
                                                                    type="button"
                                                                    className={`pa2-apv-filter-opt ${isSelected ? "selected" : ""} ${isExplicit ? "explicit" : ""}`}
                                                                    onClick={() => toggleStoreGroup(grp)}
                                                                >
                                                                    <div className={`pa2-apv-custom-checkbox ${isSelected ? "checked" : ""}`}>
                                                                        {isSelected && <Check size={11} strokeWidth={3} />}
                                                                    </div>
                                                                    <span className="pa2-apv-opt-indicator" style={{ background: isSelected ? "#7c3aed" : "#a855f7" }} />
                                                                    <span className="pa2-apv-opt-label">{grp}</span>
                                                                    <span className="pa2-apv-opt-count">{count}</span>
                                                                </button>
                                                            );
                                                        })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Search Input */}
                        <div className="pa2-apv-search-box">
                            <Search size={13} className="pa2-apv-search-icon" />
                            <input
                                type="text"
                                placeholder={`Search ${apvMode === "raw" ? "Raw" : "Store"} Material / Code...`}
                                value={apvSearch}
                                onChange={(e) => { setApvSearch(e.target.value); setApvPage(1); }}
                                className="pa2-apv-search-input"
                            />
                            {apvSearch && (
                                <button
                                    type="button"
                                    className="pa2-apv-search-clear"
                                    onClick={() => { setApvSearch(""); setApvPage(1); }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Chart Toggle */}
                        <button
                            type="button"
                            className={`pa2-apv-toggle-chart-btn ${apvShowChart ? "active" : ""}`}
                            onClick={() => setApvShowChart(!apvShowChart)}
                            title={apvShowChart ? "Hide Graph" : "Show Graph"}
                        >
                            {apvShowChart ? <EyeOff size={13} /> : <Eye size={13} />}
                            <span>{apvShowChart ? "Hide Graph" : "Show Graph"}</span>
                        </button>
                    </div>
                </div>

                {/* Summary KPI Ribbon */}
                <div className="pa2-apv-kpi-ribbon">
                    <div className="pa2-apv-kpi-card spend">
                        <span className="pa2-apv-kpi-icon spend">
                            <IndianRupee size={16} strokeWidth={2.5} />
                        </span>
                        <div className="pa2-apv-kpi-content">
                            <div className="pa2-apv-kpi-label">Total Material Spend</div>
                            <div className="pa2-apv-kpi-val spend">₹{apvTotals.totalSpendLakhs.toFixed(2)} Lakhs</div>
                            <div className="pa2-apv-kpi-sub-hint">In selected period ({apvTotals.totalPos} POs)</div>
                        </div>
                    </div>

                    <div className="pa2-apv-kpi-card po-val">
                        <span className="pa2-apv-kpi-icon po-val">
                            <ClipboardList size={16} strokeWidth={2.5} />
                        </span>
                        <div className="pa2-apv-kpi-content">
                            <div className="pa2-apv-kpi-label">Avg PO Value (APV)</div>
                            <div className="pa2-apv-kpi-val po-val">₹{Math.round(apvTotals.avgPoValue).toLocaleString("en-IN")}</div>
                            <div className="pa2-apv-kpi-sub-hint">Spend per purchase order</div>
                        </div>
                    </div>

                    <div className="pa2-apv-kpi-card rate">
                        <span className="pa2-apv-kpi-icon rate">
                            <TrendingUp size={16} strokeWidth={2.5} />
                        </span>
                        <div className="pa2-apv-kpi-content">
                            <div className="pa2-apv-kpi-label">Weighted Avg Rate</div>
                            <div className="pa2-apv-kpi-val rate">₹{apvTotals.avgRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="pa2-apv-uom-suffix">/ unit</span></div>
                            <div className="pa2-apv-kpi-sub-hint">Across {apvTotals.totalQty.toLocaleString("en-IN", { maximumFractionDigits: 0 })} units</div>
                        </div>
                    </div>

                    <div className="pa2-apv-kpi-card items">
                        <span className="pa2-apv-kpi-icon items">
                            <Package size={16} strokeWidth={2.5} />
                        </span>
                        <div className="pa2-apv-kpi-content">
                            <div className="pa2-apv-kpi-label">Avg Spend per SKU</div>
                            <div className="pa2-apv-kpi-val items">₹{Math.round(apvTotals.avgSkuSpend).toLocaleString("en-IN")}</div>
                            <div className="pa2-apv-kpi-sub-hint">Across {apvTotals.totalMaterials} unique materials</div>
                        </div>
                    </div>

                    <div className="pa2-apv-kpi-card max">
                        <span className="pa2-apv-kpi-icon max">
                            <Trophy size={16} strokeWidth={2.5} />
                        </span>
                        <div className="pa2-apv-kpi-content">
                            <div className="pa2-apv-kpi-label">Peak PO Value</div>
                            <div className="pa2-apv-kpi-val max">₹{apvTotals.maxPoValueLakhs.toFixed(2)} Lakhs</div>
                            <div className="pa2-apv-kpi-sub-hint">Largest purchase order</div>
                        </div>
                    </div>
                </div>

                {/* Upper Section: Category / Group-Wise Column Chart */}
                {apvShowChart && (
                    <div className="pa2-apv-chart-card">
                        <div className="pa2-apv-chart-head">
                            <div className="pa2-apv-chart-title">
                                <BarChart2 size={15} style={{ color: apvMode === "raw" ? "#0284c7" : "#7c3aed" }} />
                                <span>
                                    {apvMode === "raw"
                                        ? `Category-Wise Monthly Purchase Value (Column Chart)`
                                        : `Group-Wise Monthly Purchase Value (Column Chart)`}
                                    <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "500", marginLeft: "6px" }}>
                                        ({apvMode === "raw"
                                            ? (apvRawCategories.length === 0
                                                ? "All Categories"
                                                : apvRawCategories.length === 1
                                                    ? apvRawCategories[0]
                                                    : `${apvRawCategories.length} Categories`)
                                            : (apvStoreGroups.length === 0
                                                ? "All Groups"
                                                : apvStoreGroups.length === 1
                                                    ? apvStoreGroups[0]
                                                    : `${apvStoreGroups.length} Groups`)})
                                    </span>
                                </span>
                            </div>
                            <div className="pa2-apv-chart-legend-hint">
                                {apvMode === "raw" ? (
                                    RAW_CATEGORIES.filter(c => c.id !== "All" && (apvRawCategories.length === 0 || apvRawCategories.includes(c.id))).map(c => (
                                        <span key={c.id} className="pa2-apv-legend-item" style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginLeft: "10px", fontSize: "0.71rem", color: "#475569", fontWeight: "600" }}>
                                            <span className="pa2-apv-dot" style={{ background: c.color, width: "8px", height: "8px", borderRadius: "50%" }} />
                                            {c.short}
                                        </span>
                                    ))
                                ) : (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.71rem", color: "#7c3aed", fontWeight: "600" }}>
                                        <span className="pa2-apv-dot" style={{ background: "#7c3aed", width: "8px", height: "8px", borderRadius: "50%" }} />
                                        {apvStoreGroups.length === 0 ? "All Store Groups" : `${apvStoreGroups.length} Groups`} (₹ Lakhs)
                                    </span>
                                )}
                            </div>
                        </div>
                        {poLoading ? (
                            <div className="pa2-skeleton-chart pa2-pulse-loader" style={{ height: "200px" }} />
                        ) : apvCategoryMonthlyData.labels.length === 0 ? (
                            <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <PaNoData icon={<BarChart2 size={20} style={{ color: "#2d6de8" }} />} message="No data for selected period or filter" compact />
                            </div>
                        ) : (
                            <div className="pa2-apv-chart-wrap" style={{ height: "240px" }}>
                                <canvas ref={apvChartCanvasRef} />
                            </div>
                        )}
                    </div>
                )}

                {/* Lower Section: Detailed Breakdown Table */}
                <div className="pa2-apv-table-card">
                    <div className="pa2-table-scroll" style={{ maxHeight: "420px", overflowY: "auto" }}>
                        <table className="pa2-po-tbl pa2-apv-tbl">
                            <colgroup>
                                <col style={{ width: "45px" }} />
                                <col style={{ width: "105px" }} />
                                <col style={{ width: "95px" }} />
                                <col style={{ width: "115px" }} />
                                <col style={{ width: "230px" }} />
                                <col style={{ width: "85px" }} />
                                <col style={{ width: "65px" }} />
                                <col style={{ width: "115px" }} />
                                <col style={{ width: "95px" }} />
                                <col style={{ width: "110px" }} />
                                <col style={{ width: "100px" }} />
                                <col style={{ width: "95px" }} />
                                <col style={{ width: "85px" }} />
                                <col style={{ width: "110px" }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th className="pa2-po-th pa2-apv-col-idx">Sl.NO</th>
                                    <th className="pa2-po-th pa2-apv-col-pono" style={{ cursor: "pointer" }} onClick={() => setApvSortConfig(prev => ({ key: "poNumber", direction: prev.key === "poNumber" && prev.direction === "asc" ? "desc" : "asc" }))}>
                                        <div className="pa2-th-sort">
                                            <span>PoNO</span>
                                            {apvSortConfig.key === "poNumber" ? (apvSortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="pa2-th-sort-idle" />}
                                        </div>
                                    </th>
                                    <th className="pa2-po-th pa2-apv-col-podate" style={{ cursor: "pointer" }} onClick={() => setApvSortConfig(prev => ({ key: "poDate", direction: prev.key === "poDate" && prev.direction === "asc" ? "desc" : "asc" }))}>
                                        <div className="pa2-th-sort">
                                            <span>PODate</span>
                                            {apvSortConfig.key === "poDate" ? (apvSortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="pa2-th-sort-idle" />}
                                        </div>
                                    </th>
                                    <th className="pa2-po-th pa2-apv-col-partno" style={{ cursor: "pointer" }} onClick={() => setApvSortConfig(prev => ({ key: "partNo", direction: prev.key === "partNo" && prev.direction === "asc" ? "desc" : "asc" }))}>
                                        <div className="pa2-th-sort">
                                            <span>Partno</span>
                                            {apvSortConfig.key === "partNo" ? (apvSortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="pa2-th-sort-idle" />}
                                        </div>
                                    </th>
                                    <th className="pa2-po-th pa2-apv-col-desc" style={{ cursor: "pointer" }} onClick={() => setApvSortConfig(prev => ({ key: "description", direction: prev.key === "description" && prev.direction === "asc" ? "desc" : "asc" }))}>
                                        <div className="pa2-th-sort">
                                            <span>Description</span>
                                            {apvSortConfig.key === "description" ? (apvSortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="pa2-th-sort-idle" />}
                                        </div>
                                    </th>
                                    <th className="pa2-po-th pa2-apv-col-qty" style={{ cursor: "pointer" }} onClick={() => setApvSortConfig(prev => ({ key: "poQty", direction: prev.key === "poQty" && prev.direction === "asc" ? "desc" : "asc" }))}>
                                        <div className="pa2-th-sort" style={{ justifyContent: "flex-end" }}>
                                            <span>PO Qty</span>
                                            {apvSortConfig.key === "poQty" ? (apvSortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="pa2-th-sort-idle" />}
                                        </div>
                                    </th>
                                    <th className="pa2-po-th pa2-apv-col-uom">Uom</th>
                                    <th className="pa2-po-th pa2-apv-col-cat" style={{ cursor: "pointer" }} onClick={() => setApvSortConfig(prev => ({ key: "category", direction: prev.key === "category" && prev.direction === "asc" ? "desc" : "asc" }))}>
                                        <div className="pa2-th-sort">
                                            <span>Category</span>
                                            {apvSortConfig.key === "category" ? (apvSortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="pa2-th-sort-idle" />}
                                        </div>
                                    </th>
                                    <th className="pa2-po-th pa2-apv-col-rate" style={{ cursor: "pointer" }} onClick={() => setApvSortConfig(prev => ({ key: "poRate", direction: prev.key === "poRate" && prev.direction === "asc" ? "desc" : "asc" }))}>
                                        <div className="pa2-th-sort" style={{ justifyContent: "flex-end" }}>
                                            <span>Po Rate</span>
                                            {apvSortConfig.key === "poRate" ? (apvSortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="pa2-th-sort-idle" />}
                                        </div>
                                    </th>
                                    <th className="pa2-po-th pa2-apv-col-amt" style={{ cursor: "pointer" }} onClick={() => setApvSortConfig(prev => ({ key: "amt", direction: prev.key === "amt" && prev.direction === "asc" ? "desc" : "asc" }))}>
                                        <div className="pa2-th-sort" style={{ justifyContent: "flex-end" }}>
                                            <span>Amt (₹)</span>
                                            {apvSortConfig.key === "amt" ? (apvSortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="pa2-th-sort-idle" />}
                                        </div>
                                    </th>
                                    <th className="pa2-po-th pa2-apv-col-grnno" style={{ cursor: "pointer" }} onClick={() => setApvSortConfig(prev => ({ key: "grnNo", direction: prev.key === "grnNo" && prev.direction === "asc" ? "desc" : "asc" }))}>
                                        <div className="pa2-th-sort">
                                            <span>GRN NO</span>
                                            {apvSortConfig.key === "grnNo" ? (apvSortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="pa2-th-sort-idle" />}
                                        </div>
                                    </th>
                                    <th className="pa2-po-th pa2-apv-col-grndate" style={{ cursor: "pointer" }} onClick={() => setApvSortConfig(prev => ({ key: "grnDate", direction: prev.key === "grnDate" && prev.direction === "asc" ? "desc" : "asc" }))}>
                                        <div className="pa2-th-sort">
                                            <span>GRn Date</span>
                                            {apvSortConfig.key === "grnDate" ? (apvSortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="pa2-th-sort-idle" />}
                                        </div>
                                    </th>
                                    <th className="pa2-po-th pa2-apv-col-grnqty" style={{ cursor: "pointer" }} onClick={() => setApvSortConfig(prev => ({ key: "grnQty", direction: prev.key === "grnQty" && prev.direction === "asc" ? "desc" : "asc" }))}>
                                        <div className="pa2-th-sort" style={{ justifyContent: "flex-end" }}>
                                            <span>Grn Qty</span>
                                            {apvSortConfig.key === "grnQty" ? (apvSortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="pa2-th-sort-idle" />}
                                        </div>
                                    </th>
                                    <th className="pa2-po-th pa2-apv-col-avgval" style={{ cursor: "pointer", background: "rgba(37, 99, 235, 0.06)" }} onClick={() => setApvSortConfig(prev => ({ key: "avgValue", direction: prev.key === "avgValue" && prev.direction === "asc" ? "desc" : "asc" }))}>
                                        <div className="pa2-th-sort" style={{ justifyContent: "flex-end" }}>
                                            <span style={{ color: "#2563eb", fontWeight: "750" }}>Avg Value (₹)</span>
                                            {apvSortConfig.key === "avgValue" ? (apvSortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="pa2-th-sort-idle" />}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {poLoading ? (
                                    Array.from({ length: 5 }).map((_, idx) => (
                                        <tr key={idx} className="pa2-po-tr pa2-pulse-loader">
                                            {Array.from({ length: 14 }).map((__, tdIdx) => (
                                                <td key={tdIdx} className="pa2-po-td">
                                                    <div className="pa2-skeleton pa2-shimmer" style={{ width: tdIdx === 0 ? "15px" : "50px", height: "12px" }} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filteredApvTableRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={14} className="pa2-nodata-td-wrap">
                                            <PaNoData icon={<Search size={16} style={{ color: "#64748b" }} />} message="No PO records found matching criteria" compact />
                                        </td>
                                    </tr>
                                ) : (
                                    pagedApvTableRows.map((row, idx) => {
                                        const globalIdx = apvPageSize === "All" ? idx + 1 : (apvPage - 1) * Number(apvPageSize) + idx + 1;
                                        const hasGrn = row.grnNo && row.grnNo !== "–" && row.grnNo !== "-";

                                        return (
                                            <tr key={row.id} className="pa2-po-tr">
                                                <td className="pa2-po-td pa2-apv-col-idx pa2-po-dash">{globalIdx}</td>
                                                <td className="pa2-po-td pa2-apv-col-pono">
                                                    <span className="pa2-apv-pono-text">{row.poNumber}</span>
                                                </td>
                                                <td className="pa2-po-td pa2-apv-col-podate" style={{ color: "#475569", fontSize: "0.72rem" }}>
                                                    {row.poDate}
                                                </td>
                                                <td className="pa2-po-td pa2-apv-col-partno">
                                                    <span className="pa2-apv-code-badge">{row.partNo}</span>
                                                </td>
                                                <td className="pa2-po-td pa2-apv-col-desc pa2-po-material" title={row.description}>
                                                    {row.description}
                                                </td>
                                                <td className="pa2-po-td pa2-apv-col-qty" style={{ fontWeight: "650", color: "#1e293b" }}>
                                                    {row.poQtyStr}
                                                </td>
                                                <td className="pa2-po-td pa2-apv-col-uom" style={{ fontWeight: "700", color: "#64748b", fontSize: "0.72rem" }}>
                                                    {row.uom}
                                                </td>
                                                <td className="pa2-po-td pa2-apv-col-cat">
                                                    <span className={`pa2-apv-mat-subtag ${apvMode === "raw" ? (row.category.includes("Cast") ? "nos" : row.category.includes("KGS") ? "kgs" : row.category.includes("Mtrs") ? "mtrs" : "bout") : "store"}`}>
                                                        <span className="pa2-apv-mat-subtag-dot" />
                                                        {row.category}
                                                    </span>
                                                </td>
                                                <td className="pa2-po-td pa2-apv-col-rate" style={{ fontWeight: "650", color: "#1e293b" }}>
                                                    ₹{row.poRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="pa2-po-td pa2-apv-col-amt pa2-po-value" style={{ fontWeight: "750" }}>
                                                    ₹{row.amt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="pa2-po-td pa2-apv-col-grnno">
                                                    {hasGrn ? (
                                                        <span className="pa2-apv-grn-badge done">{row.grnNo}</span>
                                                    ) : (
                                                        <span className="pa2-apv-grn-badge pending">Pending</span>
                                                    )}
                                                </td>
                                                <td className="pa2-po-td pa2-apv-col-grndate" style={{ color: "#64748b", fontSize: "0.72rem" }}>
                                                    {row.grnDate}
                                                </td>
                                                <td className="pa2-po-td pa2-apv-col-grnqty" style={{ fontWeight: "650", color: hasGrn ? "#059669" : "#94a3b8" }}>
                                                    {row.grnQty !== null && row.grnQty !== undefined && !isNaN(row.grnQty) ? Number(row.grnQty).toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "–"}
                                                </td>
                                                <td className="pa2-po-td pa2-apv-col-avgval" style={{ fontWeight: "850", color: "#2563eb", background: "rgba(37, 99, 235, 0.03)" }}>
                                                    ₹{row.avgValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="pa2-po-tr-total" style={{ background: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
                                    <td className="pa2-po-td pa2-apv-col-idx pa2-apv-col-pono" colSpan={5} style={{ fontWeight: "800", color: "#1e293b", paddingLeft: "12px" }}>
                                        Total Summary ({filteredApvTableRows.length} Records)
                                    </td>
                                    <td className="pa2-po-td pa2-apv-col-qty" style={{ fontWeight: "800", color: "#1e293b" }}>
                                        {filteredApvTableRows.reduce((acc, r) => acc + (r.poQty || 0), 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="pa2-po-td pa2-apv-col-uom" style={{ color: "#64748b", fontWeight: "700" }}>—</td>
                                    <td className="pa2-po-td pa2-apv-col-cat" style={{ color: "#64748b", fontWeight: "700" }}>—</td>
                                    <td className="pa2-po-td pa2-apv-col-rate" style={{ textAlign: "right", color: "#475569", fontWeight: "750" }}>
                                        {(() => {
                                            const totAmt = filteredApvTableRows.reduce((acc, r) => acc + (r.amt || 0), 0);
                                            const totQty = filteredApvTableRows.reduce((acc, r) => acc + (r.poQty || 0), 0);
                                            const avg = totQty > 0 ? totAmt / totQty : 0;
                                            return `₹${avg.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                        })()}
                                    </td>
                                    <td className="pa2-po-td pa2-apv-col-amt pa2-po-value" style={{ fontWeight: "800", color: "#2563eb" }}>
                                        ₹{filteredApvTableRows.reduce((acc, r) => acc + (r.amt || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="pa2-po-td pa2-apv-col-grnno" style={{ fontWeight: "750", color: "#059669", textAlign: "center" }}>
                                        {filteredApvTableRows.filter(r => r.grnNo && r.grnNo !== "–" && r.grnNo !== "-").length} GRNs
                                    </td>
                                    <td className="pa2-po-td pa2-apv-col-grndate" style={{ color: "#64748b", fontWeight: "700" }}>—</td>
                                    <td className="pa2-po-td pa2-apv-col-grnqty" style={{ fontWeight: "800", color: "#059669" }}>
                                        {filteredApvTableRows.reduce((acc, r) => acc + (Number(r.grnQty) || 0), 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="pa2-po-td pa2-apv-col-avgval" style={{ fontWeight: "850", color: "#2563eb", background: "rgba(37, 99, 235, 0.05)" }}>
                                        {(() => {
                                            const totAmt = filteredApvTableRows.reduce((acc, r) => acc + (r.amt || 0), 0);
                                            const totQty = filteredApvTableRows.reduce((acc, r) => acc + (r.poQty || 0), 0);
                                            const avg = totQty > 0 ? totAmt / totQty : 0;
                                            return `₹${avg.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                        })()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    <div className="pa2-fs-pagination-bar" style={{ padding: "8px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                        <div className="pa2-fs-page-info">
                            Showing{" "}
                            <b>{filteredApvTableRows.length === 0 ? 0 : (apvPageSize === "All" ? 1 : (apvPage - 1) * Number(apvPageSize) + 1)}</b>{" "}
                            to{" "}
                            <b>{apvPageSize === "All" ? filteredApvTableRows.length : Math.min(apvPage * Number(apvPageSize), filteredApvTableRows.length)}</b>{" "}
                            of <b>{filteredApvTableRows.length}</b> Records
                        </div>
                        <div className="pa2-fs-pagesize-selector">
                            <span className="pa2-fs-pagesize-label">Show:</span>
                            {[10, 25, 50, 100, "All"].map(sz => (
                                <button
                                    key={sz}
                                    type="button"
                                    className={`pa2-fs-pagesize-btn ${apvPageSize === sz ? "active" : ""}`}
                                    onClick={() => { setApvPageSize(sz); setApvPage(1); }}
                                >
                                    {sz}
                                </button>
                            ))}
                        </div>
                        {apvPageSize !== "All" && totalApvPages > 1 && (
                            <div className="pa2-fs-page-nav">
                                <button
                                    type="button"
                                    className="pa2-fs-nav-btn"
                                    disabled={apvPage <= 1}
                                    onClick={() => setApvPage(prev => Math.max(1, prev - 1))}
                                    title="Previous Page"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="pa2-fs-page-indicator">
                                    Page <b>{apvPage}</b> of <b>{totalApvPages}</b>
                                </span>
                                <button
                                    type="button"
                                    className="pa2-fs-nav-btn"
                                    disabled={apvPage >= totalApvPages}
                                    onClick={() => setApvPage(prev => Math.min(totalApvPages, prev + 1))}
                                    title="Next Page"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Advanced Purchase Analytics (Part-wise History, Rate Progression & Buying Intelligence) ── */}
            <AdvancedPurchaseAnalyticsSection
                poRows={filteredPoRows && filteredPoRows.length > 0 ? filteredPoRows : poRows}
                priceTrendRows={priceTrendRows}
                loading={poLoading}
            />

            {/* ── Pipeline + Supplier Ranking ── */}
            <div className="pa2-two-col pa2-animate pa2-delay-3">

                {/* PO Pipeline */}
                <div className="pa2-card pa2-card-premium" data-spotlight="pa-po-pipeline">
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
                <div className="pa2-card pa2-card-premium" data-spotlight="pa-supplier-ranking">
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
                                    return <PaNoData icon={<IndianRupee size={16} style={{ color: "#10b981" }} />} message="No spend records for this period" compact />;
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
            <div className="pa2-card pa2-animate pa2-delay-4 pa2-card-premium" data-spotlight="pa-po-details">
                <div className="pa2-table-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", paddingRight: "1.3rem" }}>
                    <SectionHeader icon={<ClipboardList size={16} style={{ color: "#2d6de8" }} />} title="Purchase Order Details" />
                    <div className="pa2-tag-row" style={{ display: "flex", alignItems: "center", gap: "0.8rem", paddingBottom: "0" }}>
                        {/* ── Pending Filter Dropdown (PI Pending, PO Pending, GRN Pending) ── */}
                        <div className="pa2-po-pending-select-wrap" ref={poTablePendingRef}>
                            <button
                                type="button"
                                className={`pa2-po-pending-trigger${poTablePendingDropdownOpen ? " active" : ""}${poTablePendingFilter !== "All" ? " has-filter" : ""}`}
                                onClick={() => setPoTablePendingDropdownOpen(!poTablePendingDropdownOpen)}
                                title="Filter by Pending Status"
                            >
                                <span className="pa2-pending-pulse-dot" />
                                <Clock size={13} className="pa2-pending-trigger-icon" />
                                <span className="pa2-po-pending-trigger-label">
                                    {poTablePendingFilter === "All" ? "All Status" : poTablePendingFilter}
                                </span>
                                {poTablePendingFilter !== "All" && (
                                    <span className="pa2-pending-active-badge">1</span>
                                )}
                                <ChevronDown size={12} className="pa2-pending-arrow-icon" />
                            </button>

                            {poTablePendingDropdownOpen && (
                                <div className="pa2-pending-dropdown-panel">
                                    <div className="pa2-pending-panel-header">
                                        <span>Filter Pending Records</span>
                                        {poTablePendingFilter !== "All" && (
                                            <button
                                                type="button"
                                                className="pa2-pending-clear-link"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPoTablePendingFilter("All");
                                                }}
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>

                                    <div className="pa2-pending-options-list">
                                        {[
                                            { id: "All", label: "All Status", desc: "View all purchase orders", count: pendingCounts.all, dotColor: "#64748b", badgeCls: "pa2-badge-gray" },
                                            { id: "PI Pending", label: "PI Pending", desc: "Indent not generated / attached", count: pendingCounts.piPending, dotColor: "#f59e0b", badgeCls: "pa2-badge-amber" },
                                            { id: "PO Pending", label: "PO Pending", desc: "Open order awaiting delivery", count: pendingCounts.poPending, dotColor: "#8b5cf6", badgeCls: "pa2-badge-purple" },
                                            { id: "GRN Pending", label: "GRN Pending", desc: "Goods receipt pending from vendor", count: pendingCounts.grnPending, dotColor: "#ef4444", badgeCls: "pa2-badge-red" }
                                        ].map(opt => {
                                            const isSelected = poTablePendingFilter === opt.id;
                                            return (
                                                <div
                                                    key={opt.id}
                                                    className={`pa2-pending-item${isSelected ? " is-active" : ""}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPoTablePendingFilter(opt.id);
                                                        setPoTablePendingDropdownOpen(false);
                                                    }}
                                                >
                                                    <span className="pa2-pending-status-indicator" style={{ background: opt.dotColor }} />
                                                    <div className="pa2-pending-item-content">
                                                        <div className="pa2-pending-item-top">
                                                            <span className="pa2-pending-item-label">{opt.label}</span>
                                                            <span className={`pa2-pending-count-chip ${opt.badgeCls}`}>{opt.count}</span>
                                                        </div>
                                                        <span className="pa2-pending-item-desc">{opt.desc}</span>
                                                    </div>
                                                    {isSelected && <Check size={13} className="pa2-pending-check-icon" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Department Filter Dropdown */}
                        <div className="pa2-po-dept-select-wrap" ref={poTableDeptRef}>
                            <button
                                type="button"
                                className={`pa2-po-dept-trigger${poTableDeptDropdownOpen ? " active" : ""}${poTableDeptFilter.length > 0 ? " has-filter" : ""}`}
                                onClick={() => setPoTableDeptDropdownOpen(!poTableDeptDropdownOpen)}
                                title="Filter by Department"
                            >
                                <Building2 size={13} className="pa2-dept-trigger-icon" />
                                <span className="pa2-po-dept-trigger-label">
                                    {poTableDeptFilter.length === 0
                                        ? "All Departments"
                                        : poTableDeptFilter.length === 1
                                            ? poTableDeptFilter[0]
                                            : `${poTableDeptFilter.length} Depts Selected`}
                                </span>
                                {poTableDeptFilter.length > 0 && (
                                    <span className="pa2-dept-count-badge">{poTableDeptFilter.length}</span>
                                )}
                                <ChevronDown size={12} className="pa2-dept-arrow-icon" />
                            </button>

                            {poTableDeptDropdownOpen && (
                                <div className="pa2-dept-dropdown-panel">
                                    <div className="pa2-dept-search-row">
                                        <Search size={12} className="pa2-dept-search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Search departments..."
                                            className="pa2-dept-search-input"
                                            value={poDeptSearchQuery}
                                            onChange={(e) => setPoDeptSearchQuery(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                        />
                                        {poDeptSearchQuery && (
                                            <button
                                                type="button"
                                                className="pa2-dept-search-clear"
                                                onClick={(e) => { e.stopPropagation(); setPoDeptSearchQuery(""); }}
                                            >
                                                <X size={11} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="pa2-dept-list-scroll">
                                        {/* All Departments Option */}
                                        <div
                                            className={`pa2-dept-item${poTableDeptFilter.length === 0 ? " is-active" : ""}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPoTableDeptFilter([]);
                                            }}
                                        >
                                            <div className={`pa2-dept-check-box${poTableDeptFilter.length === 0 ? " checked" : ""}`}>
                                                {poTableDeptFilter.length === 0 && <Check size={11} strokeWidth={3} />}
                                            </div>
                                            <span className="pa2-dept-item-title">All Departments</span>
                                            <span className="pa2-dept-item-meta">{uniquePoDepartments.length}</span>
                                        </div>

                                        <div className="pa2-dept-divider" />

                                        {filteredDropdownDepts.length === 0 ? (
                                            <div className="pa2-dept-empty">
                                                No departments found
                                            </div>
                                        ) : (
                                            filteredDropdownDepts.map((dept) => {
                                                const isSelected = poTableDeptFilter.includes(dept);
                                                return (
                                                    <div
                                                        key={dept}
                                                        className={`pa2-dept-item${isSelected ? " is-active" : ""}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePoDeptToggle(dept);
                                                        }}
                                                    >
                                                        <div className={`pa2-dept-check-box${isSelected ? " checked" : ""}`}>
                                                            {isSelected && <Check size={11} strokeWidth={3} />}
                                                        </div>
                                                        <span className="pa2-dept-item-title">{dept}</span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {poTableDeptFilter.length > 0 && (
                                        <div className="pa2-dept-footer">
                                            <button
                                                type="button"
                                                className="pa2-dept-reset-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPoTableDeptFilter([]);
                                                }}
                                            >
                                                Reset to All Departments
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Search Table Box */}
                        <div className="pa2-premium-search-box">
                            <Search className="pa2-premium-search-icon" size={14} />
                            <input
                                type="text"
                                className="pa2-premium-search-input"
                                placeholder="Search table..."
                                value={poTableSearchQuery}
                                onChange={(e) => setPoTableSearchQuery(e.target.value)}
                            />
                            {poTableSearchQuery && (
                                <button
                                    type="button"
                                    className="pa2-premium-search-clear"
                                    onClick={() => setPoTableSearchQuery("")}
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </div>

                        {/* Export CSV Option */}
                        <button
                            type="button"
                            className="pa2-export-csv-btn"
                            onClick={handleExportPoDetailsCsv}
                            disabled={poLoading || sortedFilteredPoRows.length === 0}
                            title="Export to CSV"
                        >
                            <Download size={14} className="pa2-export-icon" />
                            <span>Export CSV</span>
                        </button>

                        <span className="pa2-badge pa2-badge-blue" style={{ height: "36px", display: "inline-flex", alignItems: "center", borderRadius: "10px", padding: "0 12px" }}>
                            {poLoading ? "Loading…" : `${filteredPoRows.length} records`}
                        </span>
                    </div>
                </div>
                <div className="pa2-table-scroll">
                    <table className="pa2-po-tbl">
                        <thead>
                            <tr>
                                {renderSortableTh("SL. NO.", "sno")}
                                {renderSortableTh("PI NO", "pi_no")}
                                {renderSortableTh("PI DATE", "pi_date")}
                                {renderSortableTh("REQUESTED BY", "requested_by")}
                                {renderSortableTh("PO NUMBER", "po_number")}
                                {renderSortableTh("PO DATE", "po_date")}
                                {renderSortableTh("PO TYPE", "po_type")}
                                {renderSortableTh("DEPARTMENT", "department")}
                                {renderSortableTh("SUPPLIER", "vendor_name")}
                                {renderSortableTh("MATERIAL", "material", false, true)}
                                {renderSortableTh("QTY", "po_qty", true)}
                                {renderSortableTh("RATE", "rate", true)}
                                {renderSortableTh("VALUE", "value", true)}
                                {renderSortableTh("GRN NO", "grn_no")}
                                {renderSortableTh("GRN DATE", "grn_date")}
                                {renderSortableTh("AMND", "amnd")}
                            </tr>
                        </thead>
                        <tbody>
                            {poLoading && (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="pa2-po-tr pa2-pulse-loader">
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "30px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "65px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "75px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "85px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "65px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "75px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "80px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "85px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "120px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "180px", height: "13px" }} /></td>
                                        <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "40px", height: "13px" }} /></td>
                                        <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "50px", height: "13px" }} /></td>
                                        <td className="pa2-po-td pa2-po-td--r"><div className="pa2-skeleton pa2-shimmer" style={{ width: "60px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "70px", height: "13px" }} /></td>
                                        <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "75px", height: "13px" }} /></td>
                                        <td className="pa2-po-td" style={{ textAlign: "center" }}><div className="pa2-skeleton pa2-shimmer" style={{ width: "25px", height: "13px", margin: "0 auto" }} /></td>
                                    </tr>
                                ))
                            )}
                            {!poLoading && sortedFilteredPoRows.length === 0 && (
                                <tr><td colSpan={16} className="pa2-nodata-td-wrap"><PaNoData icon={<ShoppingCart size={16} style={{ color: "#2d6de8" }} />} compact /></td></tr>
                            )}
                            {!poLoading && sortedFilteredPoRows.map((r, i) => (
                                <tr key={i} className="pa2-po-tr">
                                    <td className="pa2-po-td" style={{ fontWeight: "600", color: "#64748b", width: "50px" }}>{i + 1}</td>
                                    <td className={`pa2-po-td ${r.pi_no && r.pi_no !== "–" && r.pi_no !== "-" ? "pa2-po-link" : "pa2-po-dash"}`} style={{ whiteSpace: "nowrap" }}>
                                        {r.pi_no || r.indent_no || r.ind_no || "–"}
                                    </td>
                                    <td className="pa2-po-td pa2-po-date" style={{ whiteSpace: "nowrap" }}>
                                        {r.pi_date || r.indent_date || r.ind_date
                                            ? (r.pi_date || r.indent_date || r.ind_date).split("-").reverse().join(" ").replace(/^(\d+) (\d+) /, (_, d, m) => `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} `)
                                            : <span className="pa2-po-dash">–</span>}
                                    </td>
                                    <td className="pa2-po-td pa2-po-req-by" style={{ fontWeight: "600", color: "#475569", whiteSpace: "nowrap" }}>
                                        {r.requested_by || r.req_by || r.prepared_by || r.indent_by || r.created_by || "–"}
                                    </td>
                                    <td className={`pa2-po-td ${r.po_number && r.po_number !== "–" && r.po_number !== "-" ? "pa2-po-link" : "pa2-po-dash"}`}>
                                        {r.po_number && r.po_number !== "–" && r.po_number !== "-" ? r.po_number : "–"}
                                    </td>
                                    <td className="pa2-po-td pa2-po-date">
                                        {r.po_date ? r.po_date.split("-").reverse().join(" ").replace(/^(\d+) (\d+) /, (_, d, m) => `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} `) : "–"}
                                    </td>
                                    <td className="pa2-po-td">
                                        {r.po_type
                                            ? <span className="pa2-po-type-badge">{r.po_type}</span>
                                            : <span className="pa2-po-dash">–</span>}
                                    </td>
                                    <td className="pa2-po-td" style={{ fontWeight: "600", color: "#475569", whiteSpace: "nowrap" }}>
                                        {r.department || "–"}
                                    </td>
                                    <td className="pa2-po-td pa2-po-vendor">{r.vendor_name || "–"}</td>
                                    <td className="pa2-po-td pa2-po-material">
                                        {r.material_code
                                            ? <><span className="pa2-po-matcode">{r.material_code}</span>{" – "}{r.material.replace(/^[^-]+-\s*/, "")}</>
                                            : r.material || "–"}
                                    </td>
                                    <td className="pa2-po-td pa2-po-td--r">{r.po_qty || "–"}</td>
                                    <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "600", color: "#475569" }}>
                                        {r.rate !== undefined && r.rate !== null && r.rate !== "" && !isNaN(Number(r.rate))
                                            ? `₹${Number(r.rate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                            : "–"}
                                    </td>
                                    <td className="pa2-po-td pa2-po-td--r pa2-po-value">
                                        {r.value !== undefined && r.value !== null && r.value !== "" && !isNaN(Number(r.value))
                                            ? `₹${Number(r.value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                            : "–"}
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
                        {!poLoading && sortedFilteredPoRows.length > 0 && (
                            <tfoot>
                                <tr className="pa2-po-total-tr">
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td pa2-po-total-label" style={{ fontWeight: "750", color: "#1e293b", textAlign: "right", whiteSpace: "nowrap" }}>
                                        <span className="pa2-total-title">Total</span>
                                    </td>
                                    <td colSpan={2} className="pa2-po-td pa2-po-td--r" style={{ verticalAlign: "middle" }}>
                                        <div className="pa2-uom-cluster">
                                            {Object.entries(poTableTotals.uomMap).length === 0 ? (
                                                <span className="pa2-uom-pill">
                                                    <span className="pa2-uom-prefix">Tot</span>
                                                    <span className="pa2-uom-unit">NOS:</span>
                                                    <span className="pa2-uom-val">0</span>
                                                </span>
                                            ) : (
                                                Object.entries(poTableTotals.uomMap).map(([uom, qty]) => (
                                                    <span key={uom} className="pa2-uom-pill" title={`Total ${uom}`}>
                                                        <span className="pa2-uom-prefix">Tot</span>
                                                        <span className="pa2-uom-unit">{uom}:</span>
                                                        <span className="pa2-uom-val">{qty.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td pa2-po-td--r">
                                        <span className="pa2-total-badge pa2-total-badge-purple" title="Total Purchase Value">
                                            ₹{poTableTotals.totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* ── Amended Purchase Order Details ── */}
            <div className="pa2-card pa2-animate pa2-delay-4 pa2-card-premium" data-spotlight="pa-amended-po" style={{ marginTop: "1.4rem" }}>
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
                                <tr><td colSpan={12} className="pa2-nodata-td-wrap"><PaNoData icon={<FileEdit size={16} style={{ color: "#8b5cf6" }} />} compact /></td></tr>
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
                                        {r.rate !== undefined && r.rate !== null && r.rate !== "" && !isNaN(Number(r.rate))
                                            ? `₹${Number(r.rate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                            : "–"}
                                    </td>
                                    <td className="pa2-po-td pa2-po-td--r pa2-po-value">
                                        {r.value !== undefined && r.value !== null && r.value !== "" && !isNaN(Number(r.value))
                                            ? `₹${Number(r.value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                            : "–"}
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
                        {!amendedPoLoading && filteredAmendedPoRows.length > 0 && (
                            <tfoot>
                                <tr className="pa2-po-total-tr">
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td pa2-po-total-label" style={{ fontWeight: "750", color: "#1e293b", textAlign: "right", whiteSpace: "nowrap" }}>
                                        <span className="pa2-total-title">Total</span>
                                    </td>
                                    <td colSpan={2} className="pa2-po-td pa2-po-td--r" style={{ verticalAlign: "middle" }}>
                                        <div className="pa2-uom-cluster">
                                            {Object.entries(amendedPoTableTotals.uomMap).length === 0 ? (
                                                <span className="pa2-uom-pill">
                                                    <span className="pa2-uom-prefix">Tot</span>
                                                    <span className="pa2-uom-unit">NOS:</span>
                                                    <span className="pa2-uom-val">0</span>
                                                </span>
                                            ) : (
                                                Object.entries(amendedPoTableTotals.uomMap).map(([uom, qty]) => (
                                                    <span key={uom} className="pa2-uom-pill" title={`Total ${uom}`}>
                                                        <span className="pa2-uom-prefix">Tot</span>
                                                        <span className="pa2-uom-unit">{uom}:</span>
                                                        <span className="pa2-uom-val">{qty.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td pa2-po-td--r">
                                        <span className="pa2-total-badge pa2-total-badge-purple" title="Total Amended Value">
                                            ₹{amendedPoTableTotals.totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td"></td>
                                    <td className="pa2-po-td"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* ── PO Fulfillment Schedule Section (Dual Mode: Standard vs Futuristic In-Card Switcher) ── */}
            <div className="pa2-card pa2-animate pa2-delay-4 pa2-card-premium pa2-fs-section" data-spotlight="pa-futuristic-rol" style={{ marginTop: "1.4rem" }}>
                {/* 1. Fixed Top Header Bar: Left Mode Switcher Tabs & Right Summary Badge */}
                <div className="pa2-fs-header-row">
                    {/* Left: Section Tab Buttons */}
                    <div className="pa2-fs-main-tabs">
                        <button
                            type="button"
                            className={`pa2-fs-main-tab-btn ${fsActiveTab === "standard" ? "active" : ""}`}
                            onClick={() => { setFsActiveTab("standard"); setFsPage(1); }}
                        >
                            <CalendarRange size={14} />
                            <span className="pa2-fs-tab-label-full">PO Fulfillment Schedule</span>
                            <span className="pa2-fs-tab-label-short">PO Fulfillment</span>
                            <span className="pa2-fs-tab-count-chip">{filteredFsRows.length} Lots</span>
                        </button>
                        <button
                            type="button"
                            className={`pa2-fs-main-tab-btn pa2-fs-main-tab-btn--futuristic ${fsActiveTab === "futuristic" ? "active" : ""}`}
                            onClick={() => { setFsActiveTab("futuristic"); setFuturisticPage(1); }}
                        >
                            <Sparkles size={14} className="pa2-fs-futuristic-sparkle" />
                            <span className="pa2-fs-tab-label-full">Futuristic Expected Schedule</span>
                            <span className="pa2-fs-tab-label-short">Futuristic Schedule</span>
                            <span className="pa2-fs-tab-count-chip pa2-fs-tab-count-chip--purple">{sortedFuturisticRows.length} Items</span>
                        </button>
                    </div>

                    {/* Right: Mode Badge on Desktop */}
                    <div className="pa2-fs-header-badge-desktop">
                        {fsActiveTab === "standard" ? (
                            <span className="pa2-badge pa2-badge-blue" style={{ height: "32px", display: "inline-flex", alignItems: "center", borderRadius: "8px", padding: "0 12px", fontSize: "0.74rem", fontWeight: "750" }}>
                                {filteredFsRows.length} LOTS
                            </span>
                        ) : (
                            <span className="pa2-badge pa2-badge-purple" style={{ height: "32px", display: "inline-flex", alignItems: "center", borderRadius: "8px", padding: "0 12px", fontSize: "0.74rem", fontWeight: "750", background: "rgba(124, 58, 237, 0.1)", color: "#7c3aed", border: "1px solid rgba(124, 58, 237, 0.25)" }}>
                                {sortedFuturisticRows.length} ITEMS
                            </span>
                        )}
                    </div>
                </div>

                {/* 2. Dedicated Filter Toolbar Bar */}
                {fsActiveTab === "standard" ? (
                    <div className="pa2-fs-toolbar">
                        {/* Left: Status Quick Pill Filters */}
                        <div className="pa2-fs-status-pills">
                            {[
                                { id: "All", label: "All Schedules", count: fsStatusCounts.all },
                                { id: "On Track", label: "On Track", count: fsStatusCounts.onTrack, color: "blue" },
                                { id: "Due Soon", label: "Due Soon (15-30d)", count: fsStatusCounts.dueSoon, color: "amber" },
                                { id: "Overdue", label: "Overdue (>30d)", count: fsStatusCounts.overdue, color: "red" },
                                { id: "Delivered", label: "Delivered", count: fsStatusCounts.delivered, color: "green" }
                            ].map(pill => (
                                <button
                                    key={pill.id}
                                    type="button"
                                    className={`pa2-fs-pill-btn ${fsStatusFilter === pill.id ? "active " + (pill.color ? "pa2-pill--" + pill.color : "pa2-pill--default") : ""}`}
                                    onClick={() => { setFsStatusFilter(pill.id); setFsPage(1); }}
                                >
                                    <span>{pill.label}</span>
                                    <span className="pa2-fs-pill-count">{pill.count}</span>
                                </button>
                            ))}
                        </div>

                        {/* Right: Dropdown Filters & Search */}
                        <div className="pa2-fs-toolbar-right">
                            <div className="pa2-fs-filters-pair">
                                {/* Supplier Name Filter (Multiple Selection) */}
                                <div className="pa2-po-dept-select-wrap" ref={fsSupplierRef}>
                                <button
                                    type="button"
                                    className={`pa2-po-dept-trigger${fsSupplierDropdownOpen ? " active" : ""}${fsSupplierFilter.length > 0 ? " has-filter" : ""}`}
                                    onClick={() => setFsSupplierDropdownOpen(!fsSupplierDropdownOpen)}
                                    title="Filter by Supplier"
                                >
                                    <Building2 size={13} className="pa2-dept-trigger-icon" />
                                    <span className="pa2-po-dept-trigger-label">
                                        {fsSupplierFilter.length === 0
                                            ? "All Suppliers"
                                            : fsSupplierFilter.length === 1
                                                ? fsSupplierFilter[0]
                                                : `${fsSupplierFilter.length} Suppliers`}
                                    </span>
                                    {fsSupplierFilter.length > 0 && (
                                        <span className="pa2-dept-count-badge">{fsSupplierFilter.length}</span>
                                    )}
                                    <ChevronDown size={12} className="pa2-dept-arrow-icon" />
                                </button>

                                {fsSupplierDropdownOpen && (
                                    <div className="pa2-po-dept-menu" style={{ width: "260px" }}>
                                        <div className="pa2-po-dept-search-box">
                                            <Search size={12} className="pa2-po-dept-search-icon" />
                                            <input
                                                type="text"
                                                className="pa2-po-dept-search-input"
                                                placeholder="Search supplier..."
                                                value={fsSupplierSearchQuery}
                                                onChange={e => setFsSupplierSearchQuery(e.target.value)}
                                                autoFocus
                                            />
                                            {fsSupplierSearchQuery && (
                                                <button
                                                    type="button"
                                                    className="pa2-po-dept-search-clear"
                                                    onClick={() => setFsSupplierSearchQuery("")}
                                                >
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="pa2-po-dept-actions">
                                            <button
                                                type="button"
                                                className="pa2-po-dept-action-btn"
                                                onClick={() => { setFsSupplierFilter([]); setFsPage(1); }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                className="pa2-po-dept-action-btn"
                                                onClick={() => { setFsSupplierFilter([]); setFsPage(1); }}
                                            >
                                                Reset
                                            </button>
                                        </div>

                                        <div className="pa2-po-dept-list">
                                            {filteredDropdownFsSuppliers.length === 0 ? (
                                                <div className="pa2-po-dept-empty">No supplier found</div>
                                            ) : (
                                                filteredDropdownFsSuppliers.map(sup => {
                                                    const isSelected = fsSupplierFilter.includes(sup);
                                                    return (
                                                        <div
                                                            key={sup}
                                                            className={`pa2-po-dept-item${isSelected ? " selected" : ""}`}
                                                            onClick={() => handleFsSupplierToggle(sup)}
                                                        >
                                                            <span className={`pa2-po-dept-checkbox${isSelected ? " checked" : ""}`}>
                                                                {isSelected && <Check size={10} />}
                                                            </span>
                                                            <span className="pa2-po-dept-name" title={sup}>{sup}</span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Part No Filter (Multiple Selection) */}
                            <div className="pa2-po-dept-select-wrap" ref={fsPartRef}>
                                <button
                                    type="button"
                                    className={`pa2-po-dept-trigger${fsPartDropdownOpen ? " active" : ""}${fsPartFilter.length > 0 ? " has-filter" : ""}`}
                                    onClick={() => setFsPartDropdownOpen(!fsPartDropdownOpen)}
                                    title="Filter by Part No"
                                >
                                    <Package size={13} className="pa2-dept-trigger-icon" />
                                    <span className="pa2-po-dept-trigger-label">
                                        {fsPartFilter.length === 0
                                            ? "All Parts"
                                            : fsPartFilter.length === 1
                                                ? fsPartFilter[0]
                                                : `${fsPartFilter.length} Parts`}
                                    </span>
                                    {fsPartFilter.length > 0 && (
                                        <span className="pa2-dept-count-badge">{fsPartFilter.length}</span>
                                    )}
                                    <ChevronDown size={12} className="pa2-dept-arrow-icon" />
                                </button>

                                {fsPartDropdownOpen && (
                                    <div className="pa2-po-dept-menu" style={{ width: "260px" }}>
                                        <div className="pa2-po-dept-search-box">
                                            <Search size={12} className="pa2-po-dept-search-icon" />
                                            <input
                                                type="text"
                                                className="pa2-po-dept-search-input"
                                                placeholder="Search part no..."
                                                value={fsPartSearchQuery}
                                                onChange={e => setFsPartSearchQuery(e.target.value)}
                                                autoFocus
                                            />
                                            {fsPartSearchQuery && (
                                                <button
                                                    type="button"
                                                    className="pa2-po-dept-search-clear"
                                                    onClick={() => setFsPartSearchQuery("")}
                                                >
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="pa2-po-dept-actions">
                                            <button
                                                type="button"
                                                className="pa2-po-dept-action-btn"
                                                onClick={() => { setFsPartFilter([]); setFsPage(1); }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                className="pa2-po-dept-action-btn"
                                                onClick={() => { setFsPartFilter([]); setFsPage(1); }}
                                            >
                                                Reset
                                            </button>
                                        </div>

                                        <div className="pa2-po-dept-list">
                                            {filteredDropdownFsParts.length === 0 ? (
                                                <div className="pa2-po-dept-empty">No part found</div>
                                            ) : (
                                                filteredDropdownFsParts.map(part => {
                                                    const isSelected = fsPartFilter.includes(part);
                                                    return (
                                                        <div
                                                            key={part}
                                                            className={`pa2-po-dept-item${isSelected ? " selected" : ""}`}
                                                            onClick={() => handleFsPartToggle(part)}
                                                        >
                                                            <span className={`pa2-po-dept-checkbox${isSelected ? " checked" : ""}`}>
                                                                {isSelected && <Check size={10} />}
                                                            </span>
                                                            <span className="pa2-po-dept-name" title={part}>{part}</span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            </div>

                            {/* Search Box */}
                            <div className="pa2-fs-search-box">
                                <Search size={13} className="pa2-fs-search-icon" />
                                <input
                                    type="text"
                                    className="pa2-fs-search-input"
                                    placeholder="Search schedule..."
                                    value={fsSearchQuery}
                                    onChange={e => { setFsSearchQuery(e.target.value); setFsPage(1); }}
                                />
                                {fsSearchQuery && (
                                    <button
                                        type="button"
                                        className="pa2-fs-search-clear"
                                        onClick={() => { setFsSearchQuery(""); setFsPage(1); }}
                                    >
                                        <X size={11} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="pa2-fs-toolbar pa2-futuristic-toolbar">
                        {/* Left: Projections Horizon */}
                        <div className="pa2-futuristic-horizon-group">
                            <span className="pa2-futuristic-horizon-lbl">
                                <TrendingUp size={13} style={{ color: "#7c3aed" }} /> Projections:
                            </span>
                            <div className="pa2-segmented-control pa2-futuristic-segmented">
                                <button
                                    type="button"
                                    className={`pa2-segment-btn ${futuristicProjectionHorizon === "3M" ? "active" : ""}`}
                                    onClick={() => { setFuturisticProjectionHorizon("3M"); setFuturisticPage(1); }}
                                >
                                    3month
                                </button>
                                <button
                                    type="button"
                                    className={`pa2-segment-btn ${futuristicProjectionHorizon === "6M" ? "active" : ""}`}
                                    onClick={() => { setFuturisticProjectionHorizon("6M"); setFuturisticPage(1); }}
                                >
                                    6month
                                </button>
                                <button
                                    type="button"
                                    className={`pa2-segment-btn ${futuristicProjectionHorizon === "1Y" ? "active" : ""}`}
                                    onClick={() => { setFuturisticProjectionHorizon("1Y"); setFuturisticPage(1); }}
                                >
                                    1year
                                </button>
                            </div>
                        </div>

                        {/* Right: Dropdowns & Search */}
                        <div className="pa2-fs-toolbar-right">
                            <div className="pa2-fs-filters-pair">
                                {/* Supplier Filter Dropdown */}
                                <div className="pa2-po-dept-select-wrap pa2-futuristic-select-wrap" ref={futuristicSupplierRef}>
                                <button
                                    type="button"
                                    className={`pa2-po-dept-trigger pa2-futuristic-trigger${futuristicSupplierDropdownOpen ? " active" : ""}${futuristicSupplierFilter.length > 0 ? " has-filter" : ""}`}
                                    onClick={() => setFuturisticSupplierDropdownOpen(!futuristicSupplierDropdownOpen)}
                                    title="Filter by Supplier"
                                >
                                    <Building2 size={13} className="pa2-dept-trigger-icon" />
                                    <span className="pa2-po-dept-trigger-label">
                                        {futuristicSupplierFilter.length === 0
                                            ? "All Suppliers"
                                            : futuristicSupplierFilter.length === 1
                                                ? futuristicSupplierFilter[0]
                                                : `${futuristicSupplierFilter.length} Suppliers`}
                                    </span>
                                    {futuristicSupplierFilter.length > 0 && (
                                        <span className="pa2-dept-count-badge">{futuristicSupplierFilter.length}</span>
                                    )}
                                    <ChevronDown size={12} className={`pa2-dept-chevron${futuristicSupplierDropdownOpen ? " open" : ""}`} />
                                </button>

                                {futuristicSupplierDropdownOpen && (
                                    <div className="pa2-po-dept-menu pa2-futuristic-dropdown-menu">
                                        <div className="pa2-po-dept-search-box">
                                            <Search size={12} className="pa2-po-dept-search-icon" />
                                            <input
                                                type="text"
                                                className="pa2-po-dept-search-input"
                                                placeholder="Search supplier..."
                                                value={futuristicSupplierSearchQuery}
                                                onChange={e => setFuturisticSupplierSearchQuery(e.target.value)}
                                                autoFocus
                                            />
                                            {futuristicSupplierSearchQuery && (
                                                <button
                                                    type="button"
                                                    className="pa2-po-dept-search-clear"
                                                    onClick={() => setFuturisticSupplierSearchQuery("")}
                                                >
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="pa2-po-dept-actions">
                                            <button
                                                type="button"
                                                className="pa2-po-dept-action-btn"
                                                onClick={() => { setFuturisticSupplierFilter([]); setFuturisticPage(1); }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                className="pa2-po-dept-action-btn"
                                                onClick={() => { setFuturisticSupplierFilter([]); setFuturisticPage(1); }}
                                            >
                                                Reset
                                            </button>
                                        </div>

                                        <div className="pa2-po-dept-list">
                                            {filteredDropdownFuturisticSuppliers.length === 0 ? (
                                                <div className="pa2-po-dept-empty">No supplier found</div>
                                            ) : (
                                                filteredDropdownFuturisticSuppliers.map(sup => {
                                                    const isSelected = futuristicSupplierFilter.includes(sup);
                                                    return (
                                                        <div
                                                            key={sup}
                                                            className={`pa2-po-dept-item${isSelected ? " selected" : ""}`}
                                                            onClick={() => handleFuturisticSupplierToggle(sup)}
                                                        >
                                                            <span className={`pa2-po-dept-checkbox${isSelected ? " checked" : ""}`}>
                                                                {isSelected && <Check size={10} />}
                                                            </span>
                                                            <span className="pa2-po-dept-name" title={sup}>{sup}</span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Parts Filter Dropdown */}
                            <div className="pa2-po-dept-select-wrap pa2-futuristic-select-wrap" ref={futuristicPartRef}>
                                <button
                                    type="button"
                                    className={`pa2-po-dept-trigger pa2-futuristic-trigger${futuristicPartDropdownOpen ? " active" : ""}${futuristicPartFilter.length > 0 ? " has-filter" : ""}`}
                                    onClick={() => setFuturisticPartDropdownOpen(!futuristicPartDropdownOpen)}
                                    title="Filter by Part No"
                                >
                                    <Package size={13} className="pa2-dept-trigger-icon" />
                                    <span className="pa2-po-dept-trigger-label">
                                        {futuristicPartFilter.length === 0
                                            ? "All Parts"
                                            : futuristicPartFilter.length === 1
                                                ? futuristicPartFilter[0]
                                                : `${futuristicPartFilter.length} Parts`}
                                    </span>
                                    {futuristicPartFilter.length > 0 && (
                                        <span className="pa2-dept-count-badge">{futuristicPartFilter.length}</span>
                                    )}
                                    <ChevronDown size={12} className={`pa2-dept-chevron${futuristicPartDropdownOpen ? " open" : ""}`} />
                                </button>

                                {futuristicPartDropdownOpen && (
                                    <div className="pa2-po-dept-menu pa2-futuristic-dropdown-menu">
                                        <div className="pa2-po-dept-search-box">
                                            <Search size={12} className="pa2-po-dept-search-icon" />
                                            <input
                                                type="text"
                                                className="pa2-po-dept-search-input"
                                                placeholder="Search part no..."
                                                value={futuristicPartSearchQuery}
                                                onChange={e => setFuturisticPartSearchQuery(e.target.value)}
                                                autoFocus
                                            />
                                            {futuristicPartSearchQuery && (
                                                <button
                                                    type="button"
                                                    className="pa2-po-dept-search-clear"
                                                    onClick={() => setFuturisticPartSearchQuery("")}
                                                >
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="pa2-po-dept-actions">
                                            <button
                                                type="button"
                                                className="pa2-po-dept-action-btn"
                                                onClick={() => { setFuturisticPartFilter([]); setFuturisticPage(1); }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                className="pa2-po-dept-action-btn"
                                                onClick={() => { setFuturisticPartFilter([]); setFuturisticPage(1); }}
                                            >
                                                Reset
                                            </button>
                                        </div>

                                        <div className="pa2-po-dept-list">
                                            {filteredDropdownFuturisticParts.length === 0 ? (
                                                <div className="pa2-po-dept-empty">No part found</div>
                                            ) : (
                                                filteredDropdownFuturisticParts.map(part => {
                                                    const isSelected = futuristicPartFilter.includes(part);
                                                    return (
                                                        <div
                                                            key={part}
                                                            className={`pa2-po-dept-item${isSelected ? " selected" : ""}`}
                                                            onClick={() => handleFuturisticPartToggle(part)}
                                                        >
                                                            <span className={`pa2-po-dept-checkbox${isSelected ? " checked" : ""}`}>
                                                                {isSelected && <Check size={10} />}
                                                            </span>
                                                            <span className="pa2-po-dept-name" title={part}>{part}</span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            </div>

                            {/* Search Filter Input */}
                            <div className="pa2-futuristic-search-wrap">
                                <Search size={13} className="pa2-futuristic-search-icon" />
                                <input
                                    type="text"
                                    className="pa2-futuristic-search-input"
                                    placeholder="Search PONO, Supplier, Part, Desc..."
                                    value={futuristicSearchQuery}
                                    onChange={e => { setFuturisticSearchQuery(e.target.value); setFuturisticPage(1); }}
                                />
                                {futuristicSearchQuery && (
                                    <button
                                        type="button"
                                        className="pa2-futuristic-search-clear"
                                        onClick={() => { setFuturisticSearchQuery(""); setFuturisticPage(1); }}
                                    >
                                        <X size={11} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Section Content: Standard Fulfillment vs Futuristic Schedule */}
                {fsActiveTab === "standard" ? (
                    <>
                        {/* 2. Top Analytics: 4 Compact Summary Metric Cards */}
                        <div className="pa2-fs-kpi-ribbon">
                            <div className="pa2-fs-kpi-card">
                                <div className="pa2-fs-kpi-icon-wrap" style={{ background: "rgba(37, 99, 235, 0.1)", color: "#2563eb" }}>
                                    <CalendarCheck2 size={17} />
                                </div>
                                <div className="pa2-fs-kpi-body">
                                    <span className="pa2-fs-kpi-title">Total Scheduled</span>
                                    <span className="pa2-fs-kpi-value" style={{ color: "#1e293b" }}>
                                        {fsTotals.totalSchdQty.toLocaleString("en-IN")} <span className="pa2-fs-kpi-unit">Units</span>
                                    </span>
                                    <span className="pa2-fs-kpi-sub">{fsTotals.totalLots} Delivery Lots</span>
                                </div>
                            </div>

                            <div className="pa2-fs-kpi-card">
                                <div className="pa2-fs-kpi-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
                                    <CheckCircle2 size={17} />
                                </div>
                                <div className="pa2-fs-kpi-body">
                                    <span className="pa2-fs-kpi-title">Received (GRN Done)</span>
                                    <span className="pa2-fs-kpi-value" style={{ color: "#059669" }}>
                                        {fsTotals.totalGrnQty.toLocaleString("en-IN")} <span className="pa2-fs-kpi-pct">({fsTotals.fulfillmentPct}%)</span>
                                    </span>
                                    <span className="pa2-fs-kpi-sub">{fsTotals.deliveredCount} Lots Complete</span>
                                </div>
                            </div>

                            <div className="pa2-fs-kpi-card">
                                <div className="pa2-fs-kpi-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>
                                    <Clock size={17} />
                                </div>
                                <div className="pa2-fs-kpi-body">
                                    <span className="pa2-fs-kpi-title">Pending Balance</span>
                                    <span className="pa2-fs-kpi-value" style={{ color: "#d97706" }}>
                                        {fsTotals.totalBalQty.toLocaleString("en-IN")} <span className="pa2-fs-kpi-unit">Units</span>
                                    </span>
                                    <span className="pa2-fs-kpi-sub">₹{(fsTotals.totalBalVal / 100000).toFixed(2)}L Pending</span>
                                </div>
                            </div>

                            <div className="pa2-fs-kpi-card">
                                <div className="pa2-fs-kpi-icon-wrap" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
                                    <ShieldAlert size={17} />
                                </div>
                                <div className="pa2-fs-kpi-body">
                                    <span className="pa2-fs-kpi-title">Critical Overdue</span>
                                    <span className="pa2-fs-kpi-value" style={{ color: "#dc2626" }}>
                                        {fsTotals.overdueCount} <span className="pa2-fs-kpi-unit" style={{ color: "#dc2626" }}>Lots</span>
                                    </span>
                                    <span className="pa2-fs-kpi-sub">&gt;30 Days Past Schedule</span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Fulfillment Graph with Smooth Visibility Toggle */}
                        <div className="pa2-fs-chart-box">
                            <div className="pa2-fs-chart-header">
                                <div className="pa2-fs-chart-title">
                                    <span className="pa2-fs-chart-dot" />
                                    {fsChartType === "timeline" && "Month-wise PO Value vs Scheduled Value"}
                                    {fsChartType === "aging" && "Aging Risk Breakdown (Days Overdue)"}
                                    {fsChartType === "supplier" && "Top Supplier Delivery Compliance (%)"}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    {fsShowChart && (
                                        <div className="pa2-segmented-control pa2-fs-graph-toggle">
                                            <button
                                                type="button"
                                                className={`pa2-segment-btn${fsChartType === "timeline" ? " active" : ""}`}
                                                onClick={() => setFsChartType("timeline")}
                                            >
                                                Month-wise Value
                                            </button>
                                            <button
                                                type="button"
                                                className={`pa2-segment-btn${fsChartType === "aging" ? " active" : ""}`}
                                                onClick={() => setFsChartType("aging")}
                                            >
                                                Aging Risk
                                            </button>
                                            <button
                                                type="button"
                                                className={`pa2-segment-btn${fsChartType === "supplier" ? " active" : ""}`}
                                                onClick={() => setFsChartType("supplier")}
                                            >
                                                Supplier Compliance
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        className={`pa2-chart-visibility-btn ${fsShowChart ? "active" : ""}`}
                                        onClick={() => setFsShowChart(!fsShowChart)}
                                        title={fsShowChart ? "Hide Graph" : "Show Graph"}
                                    >
                                        {fsShowChart ? <EyeOff size={13} /> : <Eye size={13} />}
                                        <span>{fsShowChart ? "Hide Chart" : "Show Chart"}</span>
                                    </button>
                                </div>
                            </div>
                            {fsShowChart && (
                                <div className="pa2-fs-chart-wrapper">
                                    <canvas ref={fsChartCanvasRef} />
                                </div>
                            )}
                        </div>

                        {/* 3. Bottom: Fast, Paginated Fulfillment Schedule Ledger Table */}
                        <div className="pa2-table-card pa2-fs-table-card">
                            <div className="pa2-table-scroll pa2-fs-table-scroll">
                                <table className="pa2-po-tbl pa2-fs-tbl">
                                    <thead>
                                        <tr>
                                            {renderFsSortableTh("#", "sno")}
                                            {renderFsSortableTh("PO NO", "po_number")}
                                            {renderFsSortableTh("PO DATE", "po_date")}
                                            {renderFsSortableTh("SUPPLIER", "supplier")}
                                            {renderFsSortableTh("PARTNO - DESC", "part_no", false, true)}
                                            {renderFsSortableTh("PO QTY", "po_qty_num", true)}
                                            {renderFsSortableTh("SCHD DT", "schd_dt")}
                                            {renderFsSortableTh("SCHD QTY", "schd_qty_num", true)}
                                            {renderFsSortableTh("GRN QTY", "grn_qty_num", true)}
                                            {renderFsSortableTh("SCHD / PO BAL QTY", "bal_qty_num", true)}
                                            {renderFsSortableTh("SCHD / PO BAL VAL", "bal_val", true)}
                                            {renderFsSortableTh("AGE DAYS", "age_days", false)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fsLoading && (
                                            Array.from({ length: 6 }).map((_, i) => (
                                                <tr key={i} className="pa2-po-tr">
                                                    <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "24px", height: "13px" }} /></td>
                                                    <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "70px", height: "13px" }} /></td>
                                                    <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "80px", height: "13px" }} /></td>
                                                    <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "120px", height: "13px" }} /></td>
                                                    <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "160px", height: "13px" }} /></td>
                                                    <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "60px", height: "13px" }} /></td>
                                                    <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "80px", height: "13px" }} /></td>
                                                    <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "60px", height: "13px" }} /></td>
                                                    <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "60px", height: "13px" }} /></td>
                                                    <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "60px", height: "13px" }} /></td>
                                                    <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "75px", height: "13px" }} /></td>
                                                    <td className="pa2-po-td"><div className="pa2-skeleton pa2-shimmer" style={{ width: "75px", height: "13px" }} /></td>
                                                </tr>
                                            ))
                                        )}
                                        {!fsLoading && sortedFsRows.length === 0 && (
                                            <tr>
                                                <td colSpan={12} className="pa2-nodata-td-wrap">
                                                    <PaNoData icon={<CalendarRange size={16} style={{ color: "#2563eb" }} />} compact message="No fulfillment schedules found" />
                                                </td>
                                            </tr>
                                        )}
                                        {!fsLoading && pagedFsRows.map((r, i) => (
                                            <tr key={r.id || i} className="pa2-po-tr">
                                                <td className="pa2-po-td" style={{ fontWeight: "600", color: "#64748b", width: "42px" }}>
                                                    {(fsPageSize === "All" ? 0 : (fsPage - 1) * Number(fsPageSize)) + i + 1}
                                                </td>
                                                <td className="pa2-po-td pa2-po-link" style={{ fontWeight: "700" }}>{r.po_number}</td>
                                                <td className="pa2-po-td pa2-po-date">
                                                    {formatFsDate(r.po_date)}
                                                </td>
                                                <td className="pa2-po-td pa2-po-vendor pa2-fs-vendor" style={{ minWidth: "150px", maxWidth: "250px", whiteSpace: "normal", wordBreak: "break-word", lineHeight: "1.35" }}>{r.supplier}</td>
                                                <td className="pa2-po-td pa2-po-material">
                                                    <span className="pa2-fs-part-badge">{r.part_no}</span>
                                                    <span className="pa2-fs-part-desc">{r.description}</span>
                                                </td>
                                                <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "600", color: "#475569" }}>{r.po_qty}</td>
                                                <td className="pa2-po-td pa2-fs-schd-dt">
                                                    <span className="pa2-fs-date-badge">
                                                        {formatFsDate(r.schd_dt)}
                                                    </span>
                                                </td>
                                                <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "600", color: "#1e293b" }}>{r.schd_qty}</td>
                                                <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "700", color: "#059669" }}>{r.grn_qty}</td>
                                                <td className="pa2-po-td pa2-po-td--r">
                                                    <span className={`pa2-fs-bal-qty-badge ${r.bal_qty_num > 0 ? "has-bal" : "zero-bal"}`}>
                                                        {r.bal_qty}
                                                    </span>
                                                </td>
                                                <td className="pa2-po-td pa2-po-td--r pa2-po-value" style={{ color: r.bal_val > 0 ? "#1d4ed8" : "#94a3b8" }}>
                                                    ₹{Number(r.bal_val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="pa2-po-td" style={{ textAlign: "center" }}>
                                                    {r.status === "Delivered" ? (
                                                        <span className="pa2-age-pill pa2-age-pill--green">
                                                            <CheckCircle2 size={11} /> Delivered
                                                        </span>
                                                    ) : r.status === "Overdue" ? (
                                                        <span className="pa2-age-pill pa2-age-pill--red">
                                                            <AlertCircle size={11} /> {r.age_days}d · Overdue
                                                        </span>
                                                    ) : r.status === "Due Soon" ? (
                                                        <span className="pa2-age-pill pa2-age-pill--amber">
                                                            <Clock size={11} /> {r.age_days}d · Due Soon
                                                        </span>
                                                    ) : (
                                                        <span className="pa2-age-pill pa2-age-pill--blue">
                                                            <CheckCircle2 size={11} /> {r.age_days}d · On Track
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {sortedFsRows.length > 0 && (
                                        <tfoot>
                                            <tr className="pa2-fs-summary-tr">
                                                <td colSpan={5} style={{ fontWeight: "700", textAlign: "right", color: "#1e293b", paddingRight: "1rem" }}>
                                                    Total Schedule Summary:
                                                </td>
                                                <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "700", color: "#1e293b" }}>
                                                    {fsTotals.totalPoQty.toLocaleString("en-IN")}
                                                </td>
                                                <td></td>
                                                <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "700", color: "#1e293b" }}>
                                                    {fsTotals.totalSchdQty.toLocaleString("en-IN")}
                                                </td>
                                                <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "700", color: "#059669" }}>
                                                    {fsTotals.totalGrnQty.toLocaleString("en-IN")}
                                                </td>
                                                <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "700", color: "#d97706" }}>
                                                    {fsTotals.totalBalQty.toLocaleString("en-IN")}
                                                </td>
                                                <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "700", color: "#2563eb" }}>
                                                    ₹{Number(fsTotals.totalBalVal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ textAlign: "center", fontWeight: "700", color: "#059669" }}>
                                                    {fsTotals.fulfillmentPct}% Fulfilled
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>

                            {/* Ultra Fast Pagination Toolbar for Standard View */}
                            {sortedFsRows.length > 0 && (
                                <div className="pa2-fs-pagination-bar">
                                    <div className="pa2-fs-pagination-info">
                                        Showing <span className="highlight">{sortedFsRows.length === 0 ? 0 : (fsPageSize === "All" ? 1 : (fsPage - 1) * Number(fsPageSize) + 1)}</span> to{" "}
                                        <span className="highlight">{fsPageSize === "All" ? sortedFsRows.length : Math.min(fsPage * Number(fsPageSize), sortedFsRows.length)}</span> of{" "}
                                        <span className="highlight">{sortedFsRows.length}</span> Lots
                                    </div>
                                    <div className="pa2-fs-pagination-controls">
                                        <div className="pa2-fs-pagesize-select">
                                            <span className="pa2-fs-pagesize-label">Rows:</span>
                                            {[25, 50, 100, "All"].map(sz => (
                                                <button
                                                    key={sz}
                                                    type="button"
                                                    className={`pa2-fs-pagesize-btn ${fsPageSize === sz ? "active" : ""}`}
                                                    onClick={() => { setFsPageSize(sz); setFsPage(1); }}
                                                >
                                                    {sz}
                                                </button>
                                            ))}
                                        </div>
                                        {fsPageSize !== "All" && totalFsPages > 1 && (
                                            <div className="pa2-fs-page-nav">
                                                <button
                                                    type="button"
                                                    className="pa2-fs-nav-btn"
                                                    disabled={fsPage <= 1}
                                                    onClick={() => setFsPage(prev => Math.max(1, prev - 1))}
                                                    title="Previous Page"
                                                >
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <span className="pa2-fs-page-indicator">
                                                    Page <b>{fsPage}</b> of <b>{totalFsPages}</b>
                                                </span>
                                                <button
                                                    type="button"
                                                    className="pa2-fs-nav-btn"
                                                    disabled={fsPage >= totalFsPages}
                                                    onClick={() => setFsPage(prev => Math.min(totalFsPages, prev + 1))}
                                                    title="Next Page"
                                                >
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Futuristic View: 4 Compact Horizontal KPI Cards */}
                        <div className="pa2-fs-kpi-ribbon pa2-futuristic-kpi-ribbon">
                            <div className="pa2-fs-kpi-card">
                                <div className="pa2-fs-kpi-icon-wrap" style={{ background: "rgba(37, 99, 235, 0.1)", color: "#2563eb" }}>
                                    <ShoppingCart size={17} />
                                </div>
                                <div className="pa2-fs-kpi-body">
                                    <span className="pa2-fs-kpi-title">Total PO Qty</span>
                                    <span className="pa2-fs-kpi-value" style={{ color: "#1e293b" }}>
                                        {futuristicTotals.totalPoQty.toLocaleString("en-IN")} <span className="pa2-fs-kpi-unit">Units</span>
                                    </span>
                                    <span className="pa2-fs-kpi-sub">{futuristicTotals.count} Schedule Lines</span>
                                </div>
                            </div>

                            <div className="pa2-fs-kpi-card">
                                <div className="pa2-fs-kpi-icon-wrap" style={{ background: "rgba(124, 58, 237, 0.1)", color: "#7c3aed" }}>
                                    <CalendarCheck2 size={17} />
                                </div>
                                <div className="pa2-fs-kpi-body">
                                    <span className="pa2-fs-kpi-title">Total Scheduled Qty</span>
                                    <span className="pa2-fs-kpi-value" style={{ color: "#7c3aed" }}>
                                        {futuristicTotals.totalSchdQty.toLocaleString("en-IN")} <span className="pa2-fs-kpi-unit" style={{ color: "#7c3aed" }}>Units</span>
                                    </span>
                                    <span className="pa2-fs-kpi-sub">Target Scheduled Commitments</span>
                                </div>
                            </div>

                            <div className="pa2-fs-kpi-card">
                                <div className="pa2-fs-kpi-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
                                    <Clock size={17} />
                                </div>
                                <div className="pa2-fs-kpi-body">
                                    <span className="pa2-fs-kpi-title">Avg Supplier Lead Time</span>
                                    <span className="pa2-fs-kpi-value" style={{ color: "#059669" }}>
                                        {futuristicTotals.avgLeadDays} <span className="pa2-fs-kpi-unit" style={{ color: "#059669" }}>Days</span>
                                    </span>
                                    <span className="pa2-fs-kpi-sub">Historical fulfillment baseline</span>
                                </div>
                            </div>

                            <div className="pa2-fs-kpi-card">
                                <div className="pa2-fs-kpi-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>
                                    <IndianRupee size={17} />
                                </div>
                                <div className="pa2-fs-kpi-body">
                                    <span className="pa2-fs-kpi-title">Pending Balance Value</span>
                                    <span className="pa2-fs-kpi-value" style={{ color: "#d97706" }}>
                                        ₹{(futuristicTotals.totalBalVal / 100000).toFixed(2)}L
                                    </span>
                                    <span className="pa2-fs-kpi-sub">{futuristicTotals.totalBalQty.toLocaleString("en-IN")} Units Open</span>
                                </div>
                            </div>
                        </div>

                        {/* Futuristic Comparative Graph: Schedule & Expected */}
                        <div className="pa2-fs-chart-box pa2-futuristic-chart-box">
                            <div className="pa2-fs-chart-header">
                                <div className="pa2-fs-chart-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <TrendingUp size={15} style={{ color: "#8b5cf6" }} />
                                    <span>Timeline Projection: Schedule Qty vs Expected Qty</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    {futuristicShowChart && (
                                        <div className="pa2-futuristic-legend-pills">
                                            <span className="pa2-futuristic-legend-pill schedule">
                                                <span className="dot schedule" /> Schedule
                                            </span>
                                            <span className="pa2-futuristic-legend-pill expected">
                                                <span className="dot expected" /> Expected
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        className={`pa2-chart-visibility-btn ${futuristicShowChart ? "active" : ""}`}
                                        onClick={() => setFuturisticShowChart(!futuristicShowChart)}
                                        title={futuristicShowChart ? "Hide Graph" : "Show Graph"}
                                    >
                                        {futuristicShowChart ? <EyeOff size={13} /> : <Eye size={13} />}
                                        <span>{futuristicShowChart ? "Hide Chart" : "Show Chart"}</span>
                                    </button>
                                </div>
                            </div>
                            {futuristicShowChart && (
                                <div className="pa2-fs-chart-wrapper">
                                    <canvas ref={futuristicChartCanvasRef} />
                                </div>
                            )}
                        </div>

                        {/* Futuristic Bottom: 10-Column Fast Paginated Ledger Table */}
                        <div className="pa2-table-card pa2-fs-table-card">
                            <div className="pa2-table-scroll pa2-fs-table-scroll">
                                <table className="pa2-po-tbl pa2-futuristic-tbl">
                                    <thead>
                                        <tr>
                                            {renderFuturisticSortableTh("Sl.NO", "sno")}
                                            {renderFuturisticSortableTh("PONO", "po_number")}
                                            {renderFuturisticSortableTh("Po Date", "po_date")}
                                            {renderFuturisticSortableTh("supplier", "supplier")}
                                            {renderFuturisticSortableTh("PartNO - Desc", "part_no", false, true)}
                                            {renderFuturisticSortableTh("PO Qty", "po_qty_num", true)}
                                            {renderFuturisticSortableTh("Schd Qty", "schd_qty_num", true)}
                                            {renderFuturisticSortableTh("Schd Date", "schd_dt")}
                                            {renderFuturisticSortableTh("Avg Lead Day", "avg_lead_days", true)}
                                            {renderFuturisticSortableTh("Avg Lead Date", "avg_lead_date_iso")}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedFuturisticRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="pa2-nodata-td-wrap">
                                                    <PaNoData icon={<Sparkles size={16} style={{ color: "#8b5cf6" }} />} compact message="No futuristic schedule records found for this selection" />
                                                </td>
                                            </tr>
                                        ) : (
                                            pagedFuturisticRows.map((r, i) => (
                                                <tr key={r.id || i} className="pa2-po-tr pa2-futuristic-tr">
                                                    {/* 1. Sl.NO */}
                                                    <td className="pa2-po-td pa2-futuristic-sno">
                                                        {(futuristicPageSize === "All" ? 0 : (futuristicPage - 1) * Number(futuristicPageSize)) + i + 1}
                                                    </td>
                                                    {/* 2. PONO */}
                                                    <td className="pa2-po-td pa2-po-link pa2-futuristic-pono">{r.po_number}</td>
                                                    {/* 3. Po Date */}
                                                    <td className="pa2-po-td pa2-po-date">
                                                        {formatFsDate(r.po_date)}
                                                    </td>
                                                    {/* 4. supplier */}
                                                    <td className="pa2-po-td pa2-futuristic-vendor" title={r.supplier}>
                                                        {r.supplier || "–"}
                                                    </td>
                                                    {/* 5. PartNO - Desc */}
                                                    <td className="pa2-po-td pa2-po-material">
                                                        <span className="pa2-futuristic-part-badge">{r.part_no || "–"}</span>
                                                        <span className="pa2-futuristic-desc">{r.description || "–"}</span>
                                                    </td>
                                                    {/* 6. PO Qty */}
                                                    <td className="pa2-po-td pa2-po-td--r pa2-futuristic-poqty">
                                                        {r.po_qty_num ? r.po_qty_num.toLocaleString("en-IN") : (r.po_qty || "0")}
                                                    </td>
                                                    {/* 7. Schd Qty */}
                                                    <td className="pa2-po-td pa2-po-td--r pa2-futuristic-schdqty">
                                                        {r.schd_qty_num ? r.schd_qty_num.toLocaleString("en-IN") : (r.schd_qty || "0")}
                                                    </td>
                                                    {/* 8. Schd Date */}
                                                    <td className="pa2-po-td pa2-futuristic-schd-date">
                                                        <span className="pa2-futuristic-schd-pill">
                                                            {formatFsDate(r.schd_dt)}
                                                        </span>
                                                    </td>
                                                    {/* 9. Avg Lead Day */}
                                                    <td className="pa2-po-td pa2-po-td--r">
                                                        <span className="pa2-futuristic-leaddays-pill">
                                                            {r.avg_lead_days} Days
                                                        </span>
                                                    </td>
                                                    {/* 10. Avg Lead Date */}
                                                    <td className="pa2-po-td pa2-futuristic-exp-date">
                                                        <div className="pa2-futuristic-date-cell">
                                                            <span className="pa2-futuristic-lead-date-val">{r.avg_lead_date}</span>
                                                            {r.variance_days !== 0 && (
                                                                <span className={`pa2-futuristic-var-badge ${r.variance_days > 0 ? "early" : "late"}`}>
                                                                    {r.variance_days > 0 ? `+${r.variance_days}d Lead Adv` : `${r.variance_days}d Lead Gap`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    {sortedFuturisticRows.length > 0 && (
                                        <tfoot>
                                            <tr className="pa2-futuristic-tfoot-tr">
                                                <td colSpan={5} style={{ fontWeight: "700", textAlign: "right", paddingRight: "1rem", color: "#1e293b" }}>
                                                    Futuristic Projection Summary:
                                                </td>
                                                <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "700", color: "#3b82f6" }}>
                                                    {futuristicTotals.totalPoQty.toLocaleString("en-IN")}
                                                </td>
                                                <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "700", color: "#8b5cf6" }}>
                                                    {futuristicTotals.totalSchdQty.toLocaleString("en-IN")}
                                                </td>
                                                <td></td>
                                                <td className="pa2-po-td pa2-po-td--r" style={{ fontWeight: "700", color: "#10b981" }}>
                                                    ~{futuristicTotals.avgLeadDays}d Avg
                                                </td>
                                                <td style={{ textAlign: "center", fontWeight: "700", color: "#6366f1" }}>
                                                    ₹{(futuristicTotals.totalBalVal / 100000).toFixed(2)}L Bal
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>

                            {/* Ultra Fast Pagination Toolbar for Futuristic View */}
                            {sortedFuturisticRows.length > 0 && (
                                <div className="pa2-fs-pagination-bar pa2-futuristic-pagination-bar">
                                    <div className="pa2-fs-pagination-info">
                                        Showing <span className="highlight">{sortedFuturisticRows.length === 0 ? 0 : (futuristicPageSize === "All" ? 1 : (futuristicPage - 1) * Number(futuristicPageSize) + 1)}</span> to{" "}
                                        <span className="highlight">{futuristicPageSize === "All" ? sortedFuturisticRows.length : Math.min(futuristicPage * Number(futuristicPageSize), sortedFuturisticRows.length)}</span> of{" "}
                                        <span className="highlight">{sortedFuturisticRows.length}</span> Items
                                    </div>
                                    <div className="pa2-fs-pagination-controls">
                                        <div className="pa2-fs-pagesize-select">
                                            <span className="pa2-fs-pagesize-label">Rows:</span>
                                            {[25, 50, 100, "All"].map(sz => (
                                                <button
                                                    key={sz}
                                                    type="button"
                                                    className={`pa2-fs-pagesize-btn ${futuristicPageSize === sz ? "active" : ""}`}
                                                    onClick={() => { setFuturisticPageSize(sz); setFuturisticPage(1); }}
                                                >
                                                    {sz}
                                                </button>
                                            ))}
                                        </div>
                                        {futuristicPageSize !== "All" && totalFuturisticPages > 1 && (
                                            <div className="pa2-fs-page-nav">
                                                <button
                                                    type="button"
                                                    className="pa2-fs-nav-btn"
                                                    disabled={futuristicPage <= 1}
                                                    onClick={() => setFuturisticPage(prev => Math.max(1, prev - 1))}
                                                    title="Previous Page"
                                                >
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <span className="pa2-fs-page-indicator">
                                                    Page <b>{futuristicPage}</b> of <b>{totalFuturisticPages}</b>
                                                </span>
                                                <button
                                                    type="button"
                                                    className="pa2-fs-nav-btn"
                                                    disabled={futuristicPage >= totalFuturisticPages}
                                                    onClick={() => setFuturisticPage(prev => Math.min(totalFuturisticPages, prev + 1))}
                                                    title="Next Page"
                                                >
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ── Traceability Table ── */}
            <div className="pa2-card pa2-animate pa2-delay-4 pa2-card-premium" data-spotlight="pa-traceability-table" style={{ marginTop: "1.4rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.2rem" }}>
                    <SectionHeader icon={<TrendingUp size={16} style={{ color: "#8b5cf6" }} />} title="Traceability Table" />
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                        <div className="pa2-macdetail-search-wrapper">
                            <Search size={14} className="pa2-macdetail-search-icon" />
                            <input
                                type="text"
                                placeholder="Search by Supplier, Ind No, PO No, Material, GRN No, PO Type..."
                                value={traceSearch}
                                onChange={e => setTraceSearch(e.target.value)}
                                className="pa2-macdetail-search-input"
                            />
                            {traceSearch && (
                                <X size={14} onClick={() => setTraceSearch("")} style={{ position: "absolute", right: "10px", cursor: "pointer", color: "#64748b" }} />
                            )}
                        </div>

                        {/* Export CSV Option */}
                        <button
                            type="button"
                            className="pa2-export-csv-btn"
                            onClick={handleExportTraceabilityCsv}
                            disabled={traceLoading || filteredTraceData.length === 0}
                            title="Export to CSV"
                        >
                            <Download size={14} className="pa2-export-icon" />
                            <span>Export CSV</span>
                        </button>
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
                                    <td colSpan={19} className="pa2-nodata-td-wrap"><PaNoData icon={<Search size={16} style={{ color: "#64748b" }} />} message="No traceability records found" compact /></td>
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
                                    <td className="pa2-po-td pa2-po-vendor" style={{ minWidth: "160px", maxWidth: "260px", whiteSpace: "normal", wordBreak: "break-word", lineHeight: "1.35", overflow: "visible", textOverflow: "unset" }}>{row.supplierName}</td>
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
                <div className="pa2-card pa2-card-premium" data-spotlight="pa-short-close">
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
                                    <tr><td colSpan={9} className="pa2-nodata-td-wrap"><PaNoData icon={<AlertCircle size={16} style={{ color: "#ef4444" }} />} compact /></td></tr>
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
                <div className="pa2-card pa2-card-premium" data-spotlight="pa-price-trend">
                    <SectionHeader
                        icon={<TrendingUp size={16} style={{ color: "#10b981" }} />}
                        title="Price Trend Analysis"
                        badge="Rate Changes"
                        badgeCls="pa2-badge-green"
                        extra={
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                {/* Type Filter Dropdown (Before Supplier) */}
                                <div className="pa2-po-dept-select-wrap" ref={ptTypeRef}>
                                    <button
                                        type="button"
                                        className={`pa2-po-dept-trigger${ptTypeDropdownOpen ? " active" : ""}${ptTypeFilter.length > 0 ? " has-filter" : ""}`}
                                        style={{ height: "30px", fontSize: "0.72rem", padding: "0 8px" }}
                                        onClick={() => setPtTypeDropdownOpen(!ptTypeDropdownOpen)}
                                        title="Filter by Trend Type"
                                    >
                                        <Layers size={12} className="pa2-dept-trigger-icon" />
                                        <span className="pa2-po-dept-trigger-label" style={{ maxWidth: "75px" }}>
                                            {ptTypeFilter.length === 0
                                                ? "All Types"
                                                : ptTypeFilter.length === 1
                                                    ? (ptTypeFilter[0] === "up" ? "↑ Up" : ptTypeFilter[0] === "down" ? "↓ Down" : "— Flat")
                                                    : `${ptTypeFilter.length} Types`}
                                        </span>
                                        {ptTypeFilter.length > 0 && (
                                            <span className="pa2-dept-count-badge">{ptTypeFilter.length}</span>
                                        )}
                                        <ChevronDown size={11} className="pa2-dept-arrow-icon" />
                                    </button>

                                    {ptTypeDropdownOpen && (
                                        <div className="pa2-dept-dropdown-panel" style={{ minWidth: "220px", right: 0, zIndex: 100 }}>
                                            <div className="pa2-dept-search-row">
                                                <Search size={12} className="pa2-dept-search-icon" />
                                                <input
                                                    type="text"
                                                    placeholder="Search types..."
                                                    className="pa2-dept-search-input"
                                                    value={ptTypeSearch}
                                                    onChange={(e) => setPtTypeSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                />
                                                {ptTypeSearch && (
                                                    <button
                                                        type="button"
                                                        className="pa2-dept-search-clear"
                                                        onClick={(e) => { e.stopPropagation(); setPtTypeSearch(""); }}
                                                    >
                                                        <X size={11} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="pa2-dept-list-scroll" style={{ maxHeight: "200px" }}>
                                                {/* All Types Option */}
                                                <div
                                                    className={`pa2-dept-item${ptTypeFilter.length === 0 ? " is-active" : ""}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPtTypeFilter([]);
                                                    }}
                                                >
                                                    <div className={`pa2-dept-check-box${ptTypeFilter.length === 0 ? " checked" : ""}`}>
                                                        {ptTypeFilter.length === 0 && <Check size={11} strokeWidth={3} />}
                                                    </div>
                                                    <span className="pa2-dept-item-title">All Types</span>
                                                    <span className="pa2-dept-item-meta">{uniquePtTypes.length}</span>
                                                </div>

                                                <div className="pa2-dept-divider" />

                                                {filteredPtDropdownTypes.length === 0 ? (
                                                    <div className="pa2-dept-empty">
                                                        No types found
                                                    </div>
                                                ) : (
                                                    filteredPtDropdownTypes.map((t) => {
                                                        const isSelected = ptTypeFilter.includes(t);
                                                        const label = t === "up" ? "Price Increase" : t === "down" ? "Price Decrease" : t === "flat" ? "No Change (Flat)" : t.toUpperCase();
                                                        return (
                                                            <div
                                                                key={t}
                                                                className={`pa2-dept-item${isSelected ? " is-active" : ""}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handlePtTypeToggle(t);
                                                                }}
                                                            >
                                                                <div className={`pa2-dept-check-box${isSelected ? " checked" : ""}`}>
                                                                    {isSelected && <Check size={11} strokeWidth={3} />}
                                                                </div>
                                                                <span className="pa2-dept-item-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                                    {t === "up" ? (
                                                                        <span className="pa2-pt-type-pill pa2-pt-type-pill--up">↑ UP</span>
                                                                    ) : t === "down" ? (
                                                                        <span className="pa2-pt-type-pill pa2-pt-type-pill--down">↓ DOWN</span>
                                                                    ) : (
                                                                        <span className="pa2-pt-type-pill pa2-pt-type-pill--flat">— FLAT</span>
                                                                    )}
                                                                    <span style={{ fontSize: "0.72rem" }}>{label}</span>
                                                                </span>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            {ptTypeFilter.length > 0 && (
                                                <div className="pa2-dept-footer">
                                                    <button
                                                        type="button"
                                                        className="pa2-dept-reset-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPtTypeFilter([]);
                                                        }}
                                                    >
                                                        Reset to All Types
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Supplier Filter Dropdown */}
                                <div className="pa2-po-dept-select-wrap" ref={ptSupplierRef}>
                                    <button
                                        type="button"
                                        className={`pa2-po-dept-trigger${ptSupplierDropdownOpen ? " active" : ""}${ptSupplierFilter.length > 0 ? " has-filter" : ""}`}
                                        style={{ height: "30px", fontSize: "0.72rem", padding: "0 8px" }}
                                        onClick={() => setPtSupplierDropdownOpen(!ptSupplierDropdownOpen)}
                                        title="Filter by Supplier"
                                    >
                                        <Building2 size={12} className="pa2-dept-trigger-icon" />
                                        <span className="pa2-po-dept-trigger-label" style={{ maxWidth: "85px" }}>
                                            {ptSupplierFilter.length === 0
                                                ? "All Suppliers"
                                                : ptSupplierFilter.length === 1
                                                    ? ptSupplierFilter[0]
                                                    : `${ptSupplierFilter.length} Suppliers`}
                                        </span>
                                        {ptSupplierFilter.length > 0 && (
                                            <span className="pa2-dept-count-badge">{ptSupplierFilter.length}</span>
                                        )}
                                        <ChevronDown size={11} className="pa2-dept-arrow-icon" />
                                    </button>

                                    {ptSupplierDropdownOpen && (
                                        <div className="pa2-dept-dropdown-panel" style={{ minWidth: "240px", right: 0, zIndex: 100 }}>
                                            <div className="pa2-dept-search-row">
                                                <Search size={12} className="pa2-dept-search-icon" />
                                                <input
                                                    type="text"
                                                    placeholder="Search suppliers..."
                                                    className="pa2-dept-search-input"
                                                    value={ptSupplierSearch}
                                                    onChange={(e) => setPtSupplierSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                />
                                                {ptSupplierSearch && (
                                                    <button
                                                        type="button"
                                                        className="pa2-dept-search-clear"
                                                        onClick={(e) => { e.stopPropagation(); setPtSupplierSearch(""); }}
                                                    >
                                                        <X size={11} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="pa2-dept-list-scroll" style={{ maxHeight: "200px" }}>
                                                {/* All Suppliers Option */}
                                                <div
                                                    className={`pa2-dept-item${ptSupplierFilter.length === 0 ? " is-active" : ""}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPtSupplierFilter([]);
                                                    }}
                                                >
                                                    <div className={`pa2-dept-check-box${ptSupplierFilter.length === 0 ? " checked" : ""}`}>
                                                        {ptSupplierFilter.length === 0 && <Check size={11} strokeWidth={3} />}
                                                    </div>
                                                    <span className="pa2-dept-item-title">All Suppliers</span>
                                                    <span className="pa2-dept-item-meta">{uniquePtSuppliers.length}</span>
                                                </div>

                                                <div className="pa2-dept-divider" />

                                                {filteredPtDropdownSuppliers.length === 0 ? (
                                                    <div className="pa2-dept-empty">
                                                        No suppliers found
                                                    </div>
                                                ) : (
                                                    filteredPtDropdownSuppliers.map((sup) => {
                                                        const isSelected = ptSupplierFilter.includes(sup);
                                                        return (
                                                            <div
                                                                key={sup}
                                                                className={`pa2-dept-item${isSelected ? " is-active" : ""}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handlePtSupplierToggle(sup);
                                                                }}
                                                            >
                                                                <div className={`pa2-dept-check-box${isSelected ? " checked" : ""}`}>
                                                                    {isSelected && <Check size={11} strokeWidth={3} />}
                                                                </div>
                                                                <span className="pa2-dept-item-title" title={sup}>{sup}</span>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            {ptSupplierFilter.length > 0 && (
                                                <div className="pa2-dept-footer">
                                                    <button
                                                        type="button"
                                                        className="pa2-dept-reset-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPtSupplierFilter([]);
                                                        }}
                                                    >
                                                        Reset to All Suppliers
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Part No / Description Filter Dropdown */}
                                <div className="pa2-po-dept-select-wrap" ref={ptPartRef}>
                                    <button
                                        type="button"
                                        className={`pa2-po-dept-trigger${ptPartDropdownOpen ? " active" : ""}${ptPartFilter.length > 0 ? " has-filter" : ""}`}
                                        style={{ height: "30px", fontSize: "0.72rem", padding: "0 8px" }}
                                        onClick={() => setPtPartDropdownOpen(!ptPartDropdownOpen)}
                                        title="Filter by Part No"
                                    >
                                        <Package size={12} className="pa2-dept-trigger-icon" />
                                        <span className="pa2-po-dept-trigger-label" style={{ maxWidth: "75px" }}>
                                            {ptPartFilter.length === 0
                                                ? "All Parts"
                                                : ptPartFilter.length === 1
                                                    ? ptPartFilter[0]
                                                    : `${ptPartFilter.length} Parts`}
                                        </span>
                                        {ptPartFilter.length > 0 && (
                                            <span className="pa2-dept-count-badge">{ptPartFilter.length}</span>
                                        )}
                                        <ChevronDown size={11} className="pa2-dept-arrow-icon" />
                                    </button>

                                    {ptPartDropdownOpen && (
                                        <div className="pa2-dept-dropdown-panel" style={{ minWidth: "250px", right: 0, zIndex: 100 }}>
                                            <div className="pa2-dept-search-row">
                                                <Search size={12} className="pa2-dept-search-icon" />
                                                <input
                                                    type="text"
                                                    placeholder="Search parts..."
                                                    className="pa2-dept-search-input"
                                                    value={ptPartSearch}
                                                    onChange={(e) => setPtPartSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                />
                                                {ptPartSearch && (
                                                    <button
                                                        type="button"
                                                        className="pa2-dept-search-clear"
                                                        onClick={(e) => { e.stopPropagation(); setPtPartSearch(""); }}
                                                    >
                                                        <X size={11} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="pa2-dept-list-scroll" style={{ maxHeight: "200px" }}>
                                                {/* All Parts Option */}
                                                <div
                                                    className={`pa2-dept-item${ptPartFilter.length === 0 ? " is-active" : ""}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPtPartFilter([]);
                                                    }}
                                                >
                                                    <div className={`pa2-dept-check-box${ptPartFilter.length === 0 ? " checked" : ""}`}>
                                                        {ptPartFilter.length === 0 && <Check size={11} strokeWidth={3} />}
                                                    </div>
                                                    <span className="pa2-dept-item-title">All Parts</span>
                                                    <span className="pa2-dept-item-meta">{uniquePtParts.length}</span>
                                                </div>

                                                <div className="pa2-dept-divider" />

                                                {filteredPtDropdownParts.length === 0 ? (
                                                    <div className="pa2-dept-empty">
                                                        No parts found
                                                    </div>
                                                ) : (
                                                    filteredPtDropdownParts.map((part) => {
                                                        const isSelected = ptPartFilter.includes(part);
                                                        return (
                                                            <div
                                                                key={part}
                                                                className={`pa2-dept-item${isSelected ? " is-active" : ""}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handlePtPartToggle(part);
                                                                }}
                                                            >
                                                                <div className={`pa2-dept-check-box${isSelected ? " checked" : ""}`}>
                                                                    {isSelected && <Check size={11} strokeWidth={3} />}
                                                                </div>
                                                                <span className="pa2-dept-item-title" style={{ fontFamily: "monospace", fontSize: "0.72rem" }} title={part}>{part}</span>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            {ptPartFilter.length > 0 && (
                                                <div className="pa2-dept-footer">
                                                    <button
                                                        type="button"
                                                        className="pa2-dept-reset-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPtPartFilter([]);
                                                        }}
                                                    >
                                                        Reset to All Parts
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        }
                    />
                    <div className="pa2-table-scroll" style={{ maxHeight: "320px", overflowY: "auto", marginTop: "0.5rem" }}>
                        <table className="pa2-po-tbl pa2-pt-grouped-tbl">
                            <thead>
                                <tr>
                                    <th className="pa2-po-th" style={{ width: "30px", textAlign: "center" }}>#</th>
                                    <th className="pa2-po-th" style={{ minWidth: "140px" }}>PARTNO - DESC</th>
                                    <th className="pa2-po-th" style={{ width: "76px", textAlign: "center" }}>TYPE</th>
                                    <th className="pa2-po-th" style={{ width: "80px", textAlign: "center" }}>EFF. DATE</th>
                                    <th className="pa2-po-th pa2-po-th--r" style={{ width: "70px" }}>RATE</th>
                                    <th className="pa2-po-th pa2-po-th--r" style={{ width: "88px" }}>COST TREND %</th>
                                    <th className="pa2-po-th pa2-po-th--r" style={{ width: "78px" }}>COST DIFF</th>
                                </tr>
                            </thead>
                            <tbody>
                                {priceTrendLoading && (
                                    [1, 2, 3].map(i => (
                                        <tr key={i} className="pa2-po-tr pa2-pulse-loader">
                                            <td colSpan={7}><div className="pa2-skeleton pa2-shimmer" style={{ width: "100%", height: "28px", borderRadius: "6px" }} /></td>
                                        </tr>
                                    ))
                                )}
                                {!priceTrendLoading && groupedPriceTrendBySupplier.length === 0 && (
                                    <tr><td colSpan={7} className="pa2-nodata-td-wrap"><PaNoData icon={<CheckCircle2 size={16} style={{ color: "#10b981" }} />} compact /></td></tr>
                                )}
                                {!priceTrendLoading && groupedPriceTrendBySupplier.map((group, gIdx) => {
                                    const isCollapsed = !!collapsedPtSuppliers[group.supplierName];
                                    return (
                                        <Fragment key={group.supplierName || gIdx}>
                                            {/* Supplier Group Header Row */}
                                            <tr
                                                className="pa2-pt-group-row"
                                                onClick={() => togglePtSupplierCollapse(group.supplierName)}
                                                title="Click to expand/collapse supplier items"
                                            >
                                                <td colSpan={7} className="pa2-pt-group-td">
                                                    <div className="pa2-pt-group-banner">
                                                        <div className="pa2-pt-group-left">
                                                            <span className="pa2-pt-chevron">
                                                                {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                                            </span>
                                                            <Building2 size={13} className="pa2-pt-sup-icon" />
                                                            <span className="pa2-pt-sup-name" title={group.supplierName}>{group.supplierName}</span>
                                                            <span className="pa2-pt-count-pill">
                                                                {group.items.length} {group.items.length === 1 ? "Item" : "Items"}
                                                            </span>
                                                        </div>
                                                        <div className="pa2-pt-group-right">
                                                            {group.upCount > 0 && (
                                                                <span className="pa2-pt-tag pa2-pt-tag--up" title={`${group.upCount} Rate Increases`}>
                                                                    ↑ {group.upCount} Up
                                                                </span>
                                                            )}
                                                            {group.downCount > 0 && (
                                                                <span className="pa2-pt-tag pa2-pt-tag--down" title={`${group.downCount} Rate Decreases`}>
                                                                    ↓ {group.downCount} Down
                                                                </span>
                                                            )}
                                                            <span className={`pa2-pt-net-diff ${group.totalDiff > 0 ? "is-pos" : group.totalDiff < 0 ? "is-neg" : "is-zero"}`} title="Net Supplier Cost Impact">
                                                                Net: {group.totalDiff > 0 ? `+₹${group.totalDiff.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : group.totalDiff < 0 ? `-₹${Math.abs(group.totalDiff).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹0.00"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Sub-Rows (Only rendered when not collapsed) */}
                                            {!isCollapsed && group.items.map((row, i) => (
                                                <tr key={`${group.supplierName}-${row.sno || i}-${i}`} className="pa2-po-tr pa2-pt-sub-tr">
                                                    <td className="pa2-po-td pa2-po-dash" style={{ width: "30px", textAlign: "center", color: "#64748b", fontSize: "0.72rem" }}>
                                                        {i + 1}
                                                    </td>
                                                    <td className="pa2-po-td" style={{ minWidth: "140px" }}>
                                                        <span className="pa2-pt-part-text" title={row.partDesc}>
                                                            {row.partDesc}
                                                        </span>
                                                    </td>
                                                    <td className="pa2-po-td" style={{ width: "76px", textAlign: "center" }}>
                                                        {row.type === "up" ? (
                                                            <span className="pa2-pt-type-pill pa2-pt-type-pill--up" title="Price Increased">
                                                                ↑ UP
                                                            </span>
                                                        ) : row.type === "down" ? (
                                                            <span className="pa2-pt-type-pill pa2-pt-type-pill--down" title="Price Decreased">
                                                                ↓ DOWN
                                                            </span>
                                                        ) : (
                                                            <span className="pa2-pt-type-pill pa2-pt-type-pill--flat" title="Rate Unchanged">
                                                                — FLAT
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="pa2-po-td pa2-po-date" style={{ width: "80px", textAlign: "center" }}>
                                                        {row.effDate || row.month || "–"}
                                                    </td>
                                                    <td className="pa2-po-td pa2-po-td--r" style={{ width: "70px", textAlign: "right", fontWeight: "600", color: "#1e293b" }}>
                                                        ₹{Number(row.rate || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="pa2-po-td pa2-po-td--r" style={{ width: "88px", textAlign: "right" }}>
                                                        {row.type === "up" ? (
                                                            <span className="pa2-pt-pct-badge pa2-pt-pct-badge--up">
                                                                ↑ {row.pct}%
                                                            </span>
                                                        ) : row.type === "down" ? (
                                                            <span className="pa2-pt-pct-badge pa2-pt-pct-badge--down">
                                                                ↓ {Math.abs(row.pct)}%
                                                            </span>
                                                        ) : (
                                                            <span className="pa2-pt-pct-badge pa2-pt-pct-badge--neutral">
                                                                — {row.pct}%
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="pa2-po-td pa2-po-td--r pa2-po-value" style={{ width: "78px", textAlign: "right", color: row.type === "up" ? "#ef4444" : row.type === "down" ? "#10b981" : "#0f172a" }}>
                                                        {row.type === "up" ? `+₹${Number(row.diff || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : row.type === "down" ? `-₹${Number(row.diff || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹0.00"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* ── GRN Aging + Alerts ── */}
            <div className="pa2-two-col pa2-animate pa2-delay-4">

                {/* Supplier Rating */}
                <div className="pa2-card pa2-card-premium" data-spotlight="pa-supplier-rating">
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
                <div className="pa2-card pa2-card-premium" data-spotlight="pa-management-alerts">
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