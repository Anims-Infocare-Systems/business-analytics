import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
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
    Users
} from "lucide-react";

Chart.register(...registerables);

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
const KPI_CARDS = [
    { icon: ClipboardCheck, iconColor: "#2d6de8", label: "Total Inspections Qty", value: "2,748", sub: "Jan–Feb 2026", trend: "24 inspection records", cls: "qa2-t-neutral" },
    { icon: CheckCircle2, iconColor: "#10b981", label: "Pass Rate", value: "87.6%", sub: "2,409 units passed", trend: "↑ 2.1% vs last period", cls: "qa2-t-up" },
    { icon: XCircle, iconColor: "#ef4444", label: "Rejection Rate", value: "7.5%", sub: "205 units rejected", trend: "↓ 1.2% vs last", cls: "qa2-t-up" },
    { icon: Wrench, iconColor: "#f97316", label: "Rework Rate", value: "4.9%", sub: "134 units rework", trend: "↑ 0.8% vs last", cls: "qa2-t-down" },
    { icon: Coins, iconColor: "#8b5cf6", label: "Quality Value", value: "₹56,589", sub: "Total Rejection Cost", trend: "Action needed", cls: "qa2-t-down" },
    
    { icon: Package, iconColor: "#f43f5e", label: "Material Rejection Qty", value: "115", sub: "Material defects", trend: "Action required", cls: "qa2-t-down" },
    { icon: Activity, iconColor: "#0f766e", label: "Machine Rejection Qty", value: "90", sub: "Processing defects", trend: "Under watch", cls: "qa2-t-down" },
    { icon: AlertCircle, iconColor: "#dc2626", label: "Customer Complaint Count", value: "3", sub: "Log complaints", trend: "3 open issues", cls: "qa2-t-down" },
    { icon: BarChart2, iconColor: "#6366f1", label: "Over All PPM", value: "74,599 PPM", sub: "Defect PPM level", trend: "Target < 10,000", cls: "qa2-t-down" },
    { icon: Hourglass, iconColor: "#f59e0b", label: "Final Insp. Waiting", value: "5", sub: "Live snapshot", trend: "Action needed", cls: "qa2-t-down" },
];

const EMPTY_KPI_CARDS = [
    { icon: ClipboardCheck, iconColor: "#2d6de8", label: "Total Inspections Qty", value: "0", sub: "Selected period", trend: "0 inspection records", cls: "qa2-t-neutral" },
    { icon: CheckCircle2, iconColor: "#10b981", label: "Pass Rate", value: "0.0%", sub: "0 units passed", trend: "—", cls: "qa2-t-neutral" },
    { icon: XCircle, iconColor: "#ef4444", label: "Rejection Rate", value: "0.0%", sub: "0 units rejected", trend: "—", cls: "qa2-t-neutral" },
    { icon: Wrench, iconColor: "#f97316", label: "Rework Rate", value: "0.0%", sub: "0 units rework", trend: "—", cls: "qa2-t-neutral" },
    { icon: Coins, iconColor: "#8b5cf6", label: "Quality Value", value: "₹0", sub: "Total Rejection Cost", trend: "Within control", cls: "qa2-t-up" },
    
    { icon: Package, iconColor: "#f43f5e", label: "Material Rejection Qty", value: "0", sub: "Material defects", trend: "Healthy status", cls: "qa2-t-up" },
    { icon: Activity, iconColor: "#0f766e", label: "Machine Rejection Qty", value: "0", sub: "Processing defects", trend: "All clear", cls: "qa2-t-up" },
    { icon: AlertCircle, iconColor: "#dc2626", label: "Customer Complaint Count", value: "0", sub: "Log complaints", trend: "0 complaints", cls: "qa2-t-up" },
    { icon: BarChart2, iconColor: "#6366f1", label: "Over All PPM", value: "0 PPM", sub: "Defect PPM level", trend: "Within control", cls: "qa2-t-up" },
    { icon: Hourglass, iconColor: "#f59e0b", label: "Final Insp. Waiting", value: "0", sub: "Live snapshot", trend: "All caught up", cls: "qa2-t-up" },
];

const PRODUCT_QUALITY = [
    { name: "Round Rod DIA 50–90MM", insp: "1,216", pass: "1,168", rej: "48", barW: 96, barColor: "#10b981", rateVal: "96.1%", rateColor: "#10b981" },
    { name: "Segment Carrier RM", insp: "410", pass: "370", rej: "40", barW: 90, barColor: "#f5a623", rateVal: "90.2%", rateColor: "#f5a623" },
    { name: "Insert CCMT 09T304", insp: "200", pass: "198", rej: "2", barW: 99, barColor: "#10b981", rateVal: "99.0%", rateColor: "#10b981" },
    { name: 'VCI Cover 8"×8" / 10"×12"', insp: "125", pass: "121", rej: "4", barW: 97, barColor: "#10b981", rateVal: "96.8%", rateColor: "#10b981" },
    { name: "Paint-Seal Cast Dipping", insp: "75", pass: "0", rej: "75", barW: 0, barColor: "#ef4444", rateVal: "0%", rateColor: "#ef4444", hasWarning: true },
    { name: "Thinner GP 015 (RAS)", insp: "60", pass: "0", rej: "60", barW: 0, barColor: "#f97316", rateVal: "Rework", rateColor: "#f97316", hasWarning: true },
    { name: "Bottom Bearing Housing", insp: "183", pass: "177", rej: "6", barW: 96.7, barColor: "#10b981", rateVal: "96.7%", rateColor: "#10b981" },
];

const DEFECT_CAUSES = [
    { name: "Surface Defects", barW: 100, color: "#ef4444", count: "75", pct: "36.6%" },
    { name: "Dimension Variance", barW: 72, color: "#f97316", count: "54", pct: "26.3%" },
    { name: "Alignment Error", barW: 53, color: "#f59e0b", count: "40", pct: "19.5%" },
    { name: "Viscosity / Chemical", barW: 40, color: "#8b5cf6", count: "30", pct: "14.6%" },
    { name: "Hardness Non-conformance", barW: 8, color: "#94a3b8", count: "6", pct: "2.9%" },
];

const INSPECTION_ROWS = [
    { partyName: "Anims Infocare Systems", typeLabel: "Intermediate", id: "INS-2601-001", date: "22-Feb-2026", partNoDesc: "RRD03-05050-00 - Round Rod DIA 50MM", process: "Cutting", qty: "100", okQty: "100", matRejQty: "0", macRejQty: "0", reworkQty: "0", inspBy: "Operator John", typeCls: "qa2-tag-teal", resultCls: "qa2-tag-pass", result: "PASS" },
    { partyName: "A-One Steel Forgings", typeLabel: "Final", id: "INS-2601-002", date: "22-Feb-2026", partNoDesc: "PKM0012 - VCI Cover 8\"×8\"", process: "Packaging", qty: "50", okQty: "50", matRejQty: "0", macRejQty: "0", reworkQty: "0", inspBy: "Operator Sam", typeCls: "qa2-tag-blue", resultCls: "qa2-tag-pass", result: "PASS" },
    { partyName: "Dynamic Precision India", typeLabel: "Job Order", id: "INS-2601-003", date: "22-Feb-2026", partNoDesc: "PDC0017 - Paint-Seal Cast", process: "Dipping", qty: "75", okQty: "0", matRejQty: "75", macRejQty: "0", reworkQty: "0", inspBy: "Operator Sarah", typeCls: "qa2-tag-teal", resultCls: "qa2-tag-fail", result: "FAIL" },
    { partyName: "Micro Tools & Dies", typeLabel: "Incoming", id: "INS-2601-004", date: "21-Feb-2026", partNoDesc: "PDCT0165 - Insert CCMT 09T304", process: "Receiving", qty: "200", okQty: "200", matRejQty: "0", macRejQty: "0", reworkQty: "0", inspBy: "Operator Alex", typeCls: "qa2-tag-blue", resultCls: "qa2-tag-pass", result: "PASS" },
    { partyName: "Apex Industries Ltd", typeLabel: "Final", id: "INS-2601-005", date: "21-Feb-2026", partNoDesc: "PDC0018 - Thinner GP 015", process: "Mixing", qty: "60", okQty: "0", matRejQty: "0", macRejQty: "0", reworkQty: "60", inspBy: "Operator Chris", typeCls: "qa2-tag-blue", resultCls: "qa2-tag-rework", result: "REWORK" },
    { partyName: "Super Forge Pvt Ltd", typeLabel: "Intermediate", id: "INS-2601-006", date: "20-Feb-2026", partNoDesc: "RRD03-06565-00 - Round Rod DIA 65MM", process: "Forging", qty: "150", okQty: "150", matRejQty: "0", macRejQty: "0", reworkQty: "0", inspBy: "Operator John", typeCls: "qa2-tag-teal", resultCls: "qa2-tag-pass", result: "PASS" },
    { partyName: "Zenith Components", typeLabel: "Final", id: "INS-2601-007", date: "20-Feb-2026", partNoDesc: "RSC01-600H2-00 - Segment Carrier RM", process: "Assembly", qty: "40", okQty: "0", matRejQty: "0", macRejQty: "40", reworkQty: "0", inspBy: "Operator Sarah", typeCls: "qa2-tag-blue", resultCls: "qa2-tag-fail", result: "FAIL" },
    { partyName: "Ultra Tech Engineering", typeLabel: "Incoming", id: "INS-2601-008", date: "19-Feb-2026", partNoDesc: "BEH04X100001WM0 - Bottom Bearing Housing", process: "Machining", qty: "183", okQty: "183", matRejQty: "0", macRejQty: "0", reworkQty: "0", inspBy: "Operator Mike", typeCls: "qa2-tag-teal", resultCls: "qa2-tag-pass", result: "PASS" },
    { partyName: "Alpha Castings Inc", typeLabel: "Intermediate", id: "INS-2601-009", date: "18-Feb-2026", partNoDesc: "RRD03-07070-00 - Round Rod DIA 70MM", process: "Cutting", qty: "240", okQty: "240", matRejQty: "0", macRejQty: "0", reworkQty: "0", inspBy: "Operator John", typeCls: "qa2-tag-teal", resultCls: "qa2-tag-pass", result: "PASS" },
    { partyName: "Global Stationery Corp", typeLabel: "Job Order", id: "INS-2601-010", date: "17-Feb-2026", partNoDesc: "GNC0013 / PDC0012 - Letter Pad / Record Notes", process: "Printing", qty: "500", okQty: "500", matRejQty: "0", macRejQty: "0", reworkQty: "0", inspBy: "Operator Lisa", typeCls: "qa2-tag-teal", resultCls: "qa2-tag-pending", result: "PENDING" },
];

const REJECTION_ROWS = [
    { id: "INS-2601-003", product: "PDC0017 - Paint-Seal Cast", reason: "Surface defects", qty: "75", defectCls: "qa2-tag-critical", defect: "Critical", dispCls: "qa2-tag-fail", disp: "Rejection", date: "22-Feb-2026" },
    { id: "INS-2601-005", product: "PDC0018 - Thinner GP 015", reason: "Rework Needed", qty: "60", defectCls: "qa2-tag-major", defect: "Major", dispCls: "qa2-tag-rework", disp: "Rework", date: "21-Feb-2026" },
    { id: "INS-2601-007", product: "RSC01-600H2-00 - Segment Carrier RM", reason: "Alignment error", qty: "40", defectCls: "qa2-tag-critical", defect: "Critical", dispCls: "qa2-tag-fail", disp: "Rejection", date: "20-Feb-2026" }
];

const REWORK_QUEUE = [
    { dotColor: "#ef4444", name: "PDC0018 - Thinner GP 015 (RAS)", code: "INS-2601-005 · Rework Needed · Quality dept", qty: "60 Nos", daysBg: "#fee2e2", daysFg: "#b91c1c", daysLbl: "+5d" }
];

const TRACEABILITY_ROWS = [
    { routecardNo: "RC-2602-081", date: "22-Feb-2026", supplierName: "A-One Steel Forgings", customerName: "TVS Motor Company", materialName: "Steel Bar EN8", partNoDesc: "RRD03-05050-00 - Round Rod DIA 50MM", operator: "Operator John", qty: "100", okQty: "100", rejQty: "0", rwQty: "0" },
    { routecardNo: "RC-2602-082", date: "22-Feb-2026", supplierName: "Apex Industries Ltd", customerName: "Sundram Fasteners", materialName: "Thinner GP 015", partNoDesc: "PDC0018 - Thinner GP 015", operator: "Operator Sam", qty: "60", okQty: "0", rejQty: "0", rwQty: "60" },
    { routecardNo: "RC-2602-083", date: "21-Feb-2026", supplierName: "Dynamic Precision India", customerName: "Lucas TVS Ltd", materialName: "Paint GP Grey", partNoDesc: "PDC0017 - Paint-Seal Cast", operator: "Operator Sarah", qty: "75", okQty: "0", rejQty: "75", rwQty: "0" },
    { routecardNo: "RC-2602-084", date: "20-Feb-2026", supplierName: "Micro Tools & Dies", customerName: "Brakes India", materialName: "CCMT Carbide Insert", partNoDesc: "PDCT0165 - Insert CCMT 09T304", operator: "Operator Alex", qty: "200", okQty: "200", rejQty: "0", rwQty: "0" },
    { routecardNo: "RC-2602-085", date: "19-Feb-2026", supplierName: "Super Forge Pvt Ltd", customerName: "TVS Motor Company", materialName: "Round Rod DIA 65MM", partNoDesc: "RRD03-06565-00 - Round Rod DIA 65MM", operator: "Operator John", qty: "150", okQty: "150", rejQty: "0", rwQty: "0" },
    { routecardNo: "RC-2602-086", date: "18-Feb-2026", supplierName: "Ultra Tech Engineering", customerName: "Lucas TVS Ltd", materialName: "Casting EN9", partNoDesc: "BEH04X100001WM0 - Bottom Bearing Housing", operator: "Operator Mike", qty: "183", okQty: "183", rejQty: "0", rwQty: "0" },
];

// CALIBRATION_ROWS removed — live data from Ins_Mas only

const INSIGHTS_LEFT = [
    { iconKey: "error", title: "Paint-Seal Cast — 100% Rejection (75 units)", sub: "Critical surface defects. Entire batch rejected. Supplier quality audit required immediately.", val: "100% Fail", valColor: "#ef4444" },
    { iconKey: "warning", title: "Segment Carrier pass rate at 90.2% — below 95% target", sub: "40 units failed alignment check. Review assembly fixture calibration.", val: "90.2%", valColor: "#f97316" },
    { iconKey: "info", title: "Hardness Tester #HT-01 calibration overdue today", sub: "Calibration expired 28-Feb-2026. All hardness test results today may be non-compliant.", val: "Action Now", valColor: "#f59e0b" },
];

const INSIGHTS_RIGHT = [
    { iconKey: "success", title: "Overall pass rate 87.6% — trending up +2.1%", sub: "Quality improving steadily. Round Rod and Insert lines achieving 96%+. Maintain current controls.", val: "↑ 2.1%", valColor: "#10b981" },
];

const InsightIconMap = {
    error: AlertTriangle,
    warning: AlertCircle,
    info: Info,
    success: CheckCircle2
};

// ─────────────────────────────────────────────
//  Chart Data
// ─────────────────────────────────────────────
const TREND_DATA = {
    labels: ["W1 Jan", "W2 Jan", "W3 Jan", "W4 Jan", "W1 Feb", "W2 Feb", "W3 Feb", "W4 Feb"],
    datasets: [
        { label: "Pass", data: [310, 285, 340, 280, 320, 295, 270, 309], backgroundColor: "rgba(16,185,129,0.75)", borderRadius: 5 },
        { label: "Rework", data: [22, 18, 15, 25, 20, 14, 10, 10], backgroundColor: "rgba(245,166,35,0.75)", borderRadius: 5 },
        { label: "Reject", data: [28, 22, 15, 30, 25, 28, 32, 25], backgroundColor: "rgba(239,68,68,0.75)", borderRadius: 5 },
    ],
};

const RESULT_DONUT = {
    labels: ["Pass (87.6%)", "Rework (4.9%)", "Reject (7.5%)"],
    datasets: [{ data: [87.6, 4.9, 7.5], backgroundColor: ["#10b981", "#f5a623", "#ef4444"], borderColor: "#fff", borderWidth: 2.5 }],
};

const DEFECT_DONUT = {
    labels: ["Material Rejection", "Machine Rejection", "Rework"],
    datasets: [{ data: [45.5, 34.2, 20.3], backgroundColor: ["#ef4444", "#f97316", "#f59e0b"], borderColor: "#fff", borderWidth: 2.5 }],
};

const PPM_DATA = {
    labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
    datasets: [{
        label: "Actual PPM",
        data: [1200, 1450, 1100, 980, 870, 760, 820, 700, 650, 590, 540, 480],
        borderColor: "#f97316",
        backgroundColor: "rgba(249,115,22,0.1)",
        tension: 0.4,
        fill: true,
        pointRadius: 3
    }]
};

const PARETO_DATA = {
    labels: ["Surface defects", "Rework Needed", "Alignment error"],
    datasets: [
        { label: "Count", data: [75, 60, 40], backgroundColor: ["#ef4444", "#f97316", "#f59e0b"], borderRadius: 5, yAxisID: "y" },
        { label: "Cumulative %", data: [42.9, 77.1, 100], type: "line", borderColor: "#2d6de8", backgroundColor: "rgba(45,109,232,0.08)", borderWidth: 2.5, tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: "#2d6de8", pointBorderColor: "#fff", pointBorderWidth: 2, yAxisID: "y2" },
    ],
};

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

const getProcessName = (product) => {
    if (product?.includes("Rod")) return "Cutting";
    if (product?.includes("Cover")) return "Packaging";
    if (product?.includes("Cast")) return "Dipping";
    if (product?.includes("Insert")) return "Receiving";
    if (product?.includes("Thinner")) return "Mixing";
    if (product?.includes("Housing")) return "Machining";
    if (product?.includes("Letter")) return "Printing";
    return "Forging";
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

// ─────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────
function SectionHead({ icon: Icon, iconColor = "#2d6de8", title, badge, badgeCls, extra }) {
    return (
        <div className="qa2-section-head" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {Icon && <Icon size={18} className="qa2-section-icon" style={{ color: iconColor, strokeWidth: 2.25, display: 'flex', alignItems: 'center' }} />}
            <span className="qa2-section-title">{title}</span>
            {extra}
            {badge && <span className={`qa2-badge ${badgeCls || ""}`}>{badge}</span>}
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
    try { sessionStorage.setItem(key, JSON.stringify(data)); } catch {}
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
    const [animated, setAnimated] = useState(false);

    // API state data
    const [summaryData, setSummaryData] = useState(null);
    const [chartsData, setChartsData] = useState(null);
    const [prodPerfData, setProdPerfData] = useState(null);
    const [defectCausesData, setDefectCausesData] = useState(null);
    const [recordsData, setRecordsData] = useState(null);
    const [calibrationData, setCalibrationData] = useState(null);
    const [insightsData, setInsightsData] = useState(null);
    const [customerComplaintsData, setCustomerComplaintsData] = useState(null);

    // Modern Individual Panel Loading States
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [chartsLoading, setChartsLoading] = useState(false);
    const [prodPerfLoading, setProdPerfLoading] = useState(false);
    const [defectCausesLoading, setDefectCausesLoading] = useState(false);
    const [recordsLoading, setRecordsLoading] = useState(false);
    const [calibrationLoading, setCalibrationLoading] = useState(false);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [customerComplaintsLoading, setCustomerComplaintsLoading] = useState(false);

    const isGlobalLoading = summaryLoading || chartsLoading || prodPerfLoading || defectCausesLoading || recordsLoading || calibrationLoading || insightsLoading || customerComplaintsLoading;

    const trendRef = useRef(null); const trendChart = useRef(null);
    const resultRef = useRef(null); const resultChart = useRef(null);
    const defectRef = useRef(null); const defectChart = useRef(null);
    const ppmRef = useRef(null); const ppmChart = useRef(null);
    const paretoRef = useRef(null); const paretoChart = useRef(null);

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
        };

        loadAllSequentially();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 60);
        return () => clearTimeout(t);
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

        const trendData = chartsData?.trend || TREND_DATA;
        const resultDonut = chartsData?.result_donut || RESULT_DONUT;
        const defectDonut = chartsData?.defect_donut || DEFECT_DONUT;
        const ppmData = chartsData?.mac_rejection_ppm || PPM_DATA;
        const paretoData = chartsData?.pareto || PARETO_DATA;

        mk(trendRef, trendChart, "bar", trendData, {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { font: { ...fontBase, size: 11, weight: 600 }, boxWidth: 12, padding: 14 } } },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" } },
                y: { stacked: true, grid: { color: "rgba(26,84,212,0.07)" }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" }, border: { dash: [4, 4] } },
            },
        });

        const donut = {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: "bottom", labels: { font: { ...fontBase, size: 10 }, padding: 10, boxWidth: 10 } } },
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

        mk(paretoRef, paretoChart, "bar", paretoData, {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { font: { ...fontBase, size: 11, weight: 600 }, boxWidth: 12, padding: 14 } } },
            scales: {
                y: { beginAtZero: true, grid: { color: "rgba(26,84,212,0.07)" }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" }, border: { dash: [4, 4] } },
                y2: { position: "right", min: 0, max: 100, grid: { display: false }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a", callback: v => v + "%" } },
                x: { grid: { display: false }, ticks: { font: { ...fontBase, size: 9 }, color: "#5a6a9a" } },
            },
        });

        return () => {
            [trendChart, resultChart, defectChart, ppmChart, paretoChart].forEach(c => c.current?.destroy());
        };
    }, [chartsData]);

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
        const raw = recordsData?.inspection_records || INSPECTION_ROWS;
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

    const activeProductQuality  = useMemo(() => {
        if (hasNoData && !hasSearchWithData) return [];
        // When search is active: use backend-filtered data directly (no additional client filter)
        // When no search: use raw API data or fallback mock
        if (searchQuery) {
            return prodPerfData?.products ?? [];
        }
        const raw = prodPerfData?.products || PRODUCT_QUALITY;
        return raw;
    }, [prodPerfData, hasNoData, hasSearchWithData, searchQuery]);


    const activeDefectCauses    = useMemo(() => {
        if (hasNoData) return [];
        return defectCausesData?.causes   || DEFECT_CAUSES;
    }, [defectCausesData, hasNoData]);

    const activeDefectClasses   = useMemo(() => {
        if (hasNoData) return [
            { bg: "#fee2e2", lbl: "Critical", val: "0", pct: "0.0%", lc: "#b91c1c", vc: "#7f1d1d", pc: "#991b1b" },
            { bg: "#ffedd5", lbl: "Major",    val: "0",  pct: "0.0%", lc: "#c2410c", vc: "#7c2d12", pc: "#9a3412" },
            { bg: "#fef9c3", lbl: "Minor",    val: "0",  pct: "0.0%", lc: "#92400e", vc: "#78350f", pc: "#92400e" },
        ];
        return defectCausesData?.classes  || [
            { bg: "#fee2e2", lbl: "Critical", val: "115", pct: "56.1%", lc: "#b91c1c", vc: "#7f1d1d", pc: "#991b1b" },
            { bg: "#ffedd5", lbl: "Major",    val: "60",  pct: "29.3%", lc: "#c2410c", vc: "#7c2d12", pc: "#9a3412" },
            { bg: "#fef9c3", lbl: "Minor",    val: "30",  pct: "14.6%", lc: "#92400e", vc: "#78350f", pc: "#92400e" },
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

    const searchFilteredRejectionRows = useMemo(() => {
        if (hasNoData) return [];
        const raw = recordsData?.rejection_rows || REJECTION_ROWS;
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

    const activeRejectionRows = useMemo(() => {
        if (selectedDispFilter === "ALL") return searchFilteredRejectionRows;
        return searchFilteredRejectionRows.filter(r => {
            const d = (r.disp || "").toLowerCase();
            if (selectedDispFilter === "REJECTION") return d.includes("reject");
            if (selectedDispFilter === "REWORK") return d.includes("rework");
            return true;
        });
    }, [searchFilteredRejectionRows, selectedDispFilter]);

    const rejectionCount = useMemo(() => 
        searchFilteredRejectionRows.filter(r => r.disp?.toLowerCase().includes("reject")).length,
    [searchFilteredRejectionRows]);

    const reworkCount = useMemo(() => 
        searchFilteredRejectionRows.filter(r => r.disp?.toLowerCase().includes("rework")).length,
    [searchFilteredRejectionRows]);

    const activeReworkQueue     = useMemo(() => {
        if (hasNoData) return [];
        const raw = recordsData?.rework_queue || REWORK_QUEUE;
        if (!searchQuery) return raw;
        const q = searchQuery.toLowerCase().trim();
        return raw.filter(r => 
            (r.name && r.name.toLowerCase().includes(q)) ||
            (r.code && r.code.toLowerCase().includes(q))
        );
    }, [recordsData, hasNoData, searchQuery]);

    const activeCalibrationRows = useMemo(() => {
        if (hasNoData) return [];
        return calibrationData?.calibrations   || [];
    }, [calibrationData, hasNoData]);

    const activeVendorRejection = useMemo(() => {
        const vendorMap = {};
        
        // Aggregate from searchFilteredInspectionRows (which are dynamically search-filtered and date-range filtered)
        searchFilteredInspectionRows.forEach(r => {
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

        // Fallback mockup data when empty/offline
        if (list.length === 0 || hasNoData) {
            const mock = [
                { name: "Super Forge Pvt Ltd", insp: 150, pass: 147, rej: 3 },
                { name: "A-One Steel Forgings", insp: 50, pass: 45, rej: 5 },
                { name: "Dynamic Precision India", insp: 75, pass: 68, rej: 7 },
                { name: "Micro Tools & Dies", insp: 200, pass: 198, rej: 2 },
                { name: "Apex Industries Ltd", insp: 60, pass: 58, rej: 2 }
            ];
            list = searchQuery ? mock.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) : mock;
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

        let list = Object.values(processMap);

        // Fallback mockup data when empty/offline
        if (list.length === 0 || hasNoData) {
            const mock = [
                { name: "Machining", insp: 800, pass: 782, rej: 18 },
                { name: "Assembly", insp: 620, pass: 605, rej: 15 },
                { name: "Cutting", insp: 550, pass: 542, rej: 8 },
                { name: "Dipping", insp: 400, pass: 388, rej: 12 },
                { name: "Forging", insp: 300, pass: 295, rej: 5 },
                { name: "Packaging", insp: 250, pass: 249, rej: 1 }
            ];
            list = searchQuery ? mock.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) : mock;
        }

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
        let list = Object.values(map).sort((a, b) => b.qty - a.qty);
        
        if (list.length === 0 || hasNoData) {
            list = [
                { name: "Round Rod DIA 50MM", qty: 48, process: "Cutting" },
                { name: "Paint-Seal Cast", qty: 75, process: "Dipping" },
                { name: "VCI Cover 8\"×8\"", qty: 4, process: "Packaging" }
            ];
        }
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
        let list = Object.values(map).sort((a, b) => b.qty - a.qty);
        
        if (list.length === 0 || hasNoData) {
            list = [
                { name: "Segment Carrier RM", qty: 40, process: "Assembly" },
                { name: "Bottom Bearing Housing", qty: 6, process: "Machining" }
            ];
        }
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

        let list = Object.values(map);

        if (list.length === 0 || hasNoData) {
            list = [
                { department: "Machining", inspected: 800, rejected: 24 },
                { department: "Forging", inspected: 300, rejected: 5 },
                { department: "Assembly", inspected: 620, rejected: 40 },
                { department: "Finishing & Paint", inspected: 475, rejected: 75 },
                { department: "Logistics & Incoming", inspected: 450, rejected: 6 }
            ];
        }

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
        
        // Fallback mock data when empty/offline
        if (raw.length === 0) {
            const mock = [
                { complaint_id: "CC-2601-001", customer_name: "TVS Motor Company", product: "RRD03-05050-00 - Round Rod DIA 50MM", complaint_description: "Surface scratches on the outer diameter.", action_taken: "Polished and sorted the batch.", complaint_date: "22-Feb-2026", corrective_action: "Enhanced buffering speed in grinding stage.", permanent_action: "Installed automated visual inspection camera.", status: "RESOLVED" },
                { complaint_id: "CC-2601-002", customer_name: "Sundram Fasteners", product: "PKM0012 - VCI Cover 8\"×8\"", complaint_description: "VCI bags having tear at the corner.", action_taken: "Replaced the damaged covers.", complaint_date: "18-Feb-2026", corrective_action: "Adjusted folding machine guide rails.", permanent_action: "Reinforced corner thickness specifications.", status: "IN PROGRESS" },
                { complaint_id: "CC-2601-003", customer_name: "Lucas TVS Ltd", product: "PDC0017 - Paint-Seal Cast Dipping", complaint_description: "Paint peel-off from corners.", action_taken: "Stripped paint and re-dipped casting.", complaint_date: "15-Feb-2026", corrective_action: "Increased oven curing time by 5 minutes.", permanent_action: "Added hourly viscosity checks for dipping paint.", status: "RESOLVED" }
            ];
            const filteredMock = searchQuery ? mock.filter(c => 
                (c.complaint_id && c.complaint_id.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
                (c.customer_name && c.customer_name.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
                (c.product && c.product.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
                (c.complaint_description && c.complaint_description.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
                (c.action_taken && c.action_taken.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
                (c.corrective_action && c.corrective_action.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
                (c.permanent_action && c.permanent_action.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
                (c.status && c.status.toLowerCase().includes(searchQuery.toLowerCase().trim()))
            ) : mock;
            return filteredMock;
        }
        
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

    const activeTraceabilityRows = useMemo(() => {
        if (hasNoData) return [];
        let list = TRACEABILITY_ROWS;
        
        // Filter by date range if active
        if (dateRange.from && dateRange.to) {
            list = list.filter(r => {
                const rd = parseDisplayDate(r.date);
                if (!rd) return true;
                return rd >= dateRange.from && rd <= dateRange.to;
            });
        }
        
        // Filter by search query if active
        if (!searchQuery) return list;
        const q = searchQuery.toLowerCase().trim();
        return list.filter(r => 
            (r.routecardNo && r.routecardNo.toLowerCase().includes(q)) ||
            (r.supplierName && r.supplierName.toLowerCase().includes(q)) ||
            (r.customerName && r.customerName.toLowerCase().includes(q)) ||
            (r.materialName && r.materialName.toLowerCase().includes(q)) ||
            (r.partNoDesc && r.partNoDesc.toLowerCase().includes(q)) ||
            (r.operator && r.operator.toLowerCase().includes(q))
        );
    }, [hasNoData, dateRange, searchQuery]);

    const interInspCount = useMemo(() =>
        searchFilteredInspectionRows.filter(r => r.typeLabel?.toLowerCase().includes("inter") || r.id?.toLowerCase().startsWith("ii")).length,
    [searchFilteredInspectionRows]);
    const finalInspCount = useMemo(() =>
        searchFilteredInspectionRows.filter(r => r.typeLabel?.toLowerCase().includes("final") || r.id?.toLowerCase().startsWith("fi")).length,
    [searchFilteredInspectionRows]);
    const jobOrderCount  = useMemo(() =>
        searchFilteredInspectionRows.filter(r => r.typeLabel?.toLowerCase().includes("job")   || r.id?.toLowerCase().startsWith("ji")).length,
    [searchFilteredInspectionRows]);

    // Count items that are overdue or due within 7 days
    const calibrationAlertCount = useMemo(() =>
        activeCalibrationRows.filter(c => c.cls === "qa2-cal-over" || c.cls === "qa2-cal-warn").length,
    [activeCalibrationRows]);

    const activeInsightsLeft  = useMemo(() => {
        if (hasNoData) return [];
        if (insightsData?.insights_left) {
            return insightsData.insights_left.map((ins, idx) => {
                const keys = ["error", "warning", "info"];
                return { ...ins, iconKey: ins.iconKey || keys[idx % keys.length] };
            });
        }
        return INSIGHTS_LEFT;
    }, [insightsData, hasNoData]);

    const activeInsightsRight = useMemo(() => {
        if (hasNoData) return [];
        if (insightsData?.insights_right) {
            return insightsData.insights_right
                .filter(ins => !ins.title.toLowerCase().includes("scrap"))
                .map(ins => ({ ...ins, iconKey: ins.iconKey || "success" }));
        }
        return INSIGHTS_RIGHT;
    }, [insightsData, hasNoData]);

    const activePriorityActions = useMemo(() => {
        if (hasNoData) return [];
        return insightsData?.priority_actions
            ? insightsData.priority_actions.filter(act => !act.toLowerCase().includes("scrap"))
            : [
                "1) Initiate supplier audit for Paint-Seal Cast (100% batch failure).",
                "2) Calibrate Hardness Tester #HT-01 today.",
                "3) Review assembly fixture for Segment Carrier alignment."
              ];
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
        const complaintsCount = activeCustomerComplaints.length;
        const ppm = totalInspected > 0 ? Math.round(((totalMaterialRej + totalMachineRej) / totalInspected) * 1000000) : 0;

        const insQty = summaryData?.kpis?.total_inspected_card?.value || totalInspected.toLocaleString("en-IN");
        const passRate = summaryData?.kpis?.pass_rate_card?.value || (totalInspected > 0 ? `${((totalInspected - (totalMaterialRej + totalMachineRej)) / totalInspected * 100).toFixed(1)}%` : "87.6%");
        const rejRate = summaryData?.kpis?.rejection_rate_card?.value || (totalInspected > 0 ? `${((totalInspected - (totalMaterialRej + totalMachineRej)) / totalInspected * 100).toFixed(1)}%` : "7.5%");
        const reworkRate = summaryData?.kpis?.rework_rate_card?.value || "4.9%";
        const pendingInsp = summaryData?.kpis?.pending_insp_card?.value || "5";
        const qualityVal = summaryData?.kpis?.quality_value_card?.value || "₹56,589";

        return [
            { icon: ClipboardCheck, iconColor: "#2d6de8", label: "Total Inspections Qty", value: insQty, sub: "Selected Period", trend: `${searchFilteredInspectionRows.length} records`, cls: "qa2-t-neutral" },
            { icon: CheckCircle2, iconColor: "#10b981", label: "Pass Rate", value: passRate, sub: "Inspected units", trend: "↑ 2.1% vs last", cls: "qa2-t-up" },
            { icon: XCircle, iconColor: "#ef4444", label: "Rejection Rate", value: rejRate, sub: "Defective units", trend: "↓ 1.2% vs last", cls: "qa2-t-up" },
            { icon: Wrench, iconColor: "#f97316", label: "Rework Rate", value: reworkRate, sub: "Reworked units", trend: "Within tolerance", cls: "qa2-t-neutral" },
            { icon: Coins, iconColor: "#8b5cf6", label: "Quality Value", value: qualityVal, sub: "Total Rejection Cost", trend: "Action needed", cls: "qa2-t-down" },
            
            { icon: Package, iconColor: "#f43f5e", label: "Material Rejection Qty", value: totalMaterialRej.toLocaleString("en-IN"), sub: "Material defects", trend: totalMaterialRej > 0 ? "Action required" : "Healthy status", cls: totalMaterialRej > 0 ? "qa2-t-down" : "qa2-t-up" },
            { icon: Activity, iconColor: "#0f766e", label: "Machine Rejection Qty", value: totalMachineRej.toLocaleString("en-IN"), sub: "Processing defects", trend: totalMachineRej > 0 ? "Under watch" : "All clear", cls: totalMachineRej > 0 ? "qa2-t-down" : "qa2-t-up" },
            { icon: AlertCircle, iconColor: "#dc2626", label: "Customer Complaint Count", value: complaintsCount.toString(), sub: "Log complaints", trend: complaintsCount > 0 ? `${complaintsCount} open issues` : "0 complaints", cls: complaintsCount > 0 ? "qa2-t-down" : "qa2-t-up" },
            { icon: BarChart2, iconColor: "#6366f1", label: "Over All PPM", value: ppm.toLocaleString("en-IN") + " PPM", sub: "Defect PPM level", trend: "Target < 10,000", cls: ppm < 10000 ? "qa2-t-up" : "qa2-t-down" },
            { icon: Hourglass, iconColor: "#f59e0b", label: "Final Insp. Waiting", value: pendingInsp, sub: "Waiting queue", trend: "Action needed", cls: "qa2-t-down" }
        ];
    }, [summaryData, hasNoData, searchFilteredInspectionRows, activeCustomerComplaints]);

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
                    <div className="qa2-fg" style={{ flex: '0 0 260px' }}>
                        <label className="qa2-fl">Date Range</label>
                        <QualityAnalysisDatePicker
                            from={dateRange.from}
                            to={dateRange.to}
                            onChange={({ from, to }) => setDateRange({ from, to })}
                        />
                    </div>
                    <div className="qa2-fg" style={{ flex: '0 0 260px' }}>
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
                        { lbl: "Period",          val: summaryData?.period            ?? "Jan–Feb 2026", cls: "" },
                        { lbl: "Total Inspected", val: summaryData?.total_inspected   ?? "—",            cls: "qa2-blue" },
                        { lbl: "Pass Rate",       val: summaryData?.pass_rate         ?? "—",            cls: "qa2-green" },
                        { lbl: "Total Rejected",  val: summaryData?.total_rejected    ?? "—",            cls: "qa2-red" },
                        { lbl: "Rework",          val: summaryData?.rework            ?? "—",            cls: "qa2-orange" },
                        { lbl: "Pending Insp.",   val: summaryData?.pending_inspection ?? "—",           cls: "qa2-yellow" },
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
                    {[1, 2, 3, 4, 5, 6].map(i => (
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

            {/* ── Charts Row 1: 3-col ── */}
            <div className="qa2-charts-3 qa2-animate qa2-d3">
                <div className="qa2-card qa2-chart-card qa2-card-premium">
                    <SectionHead icon={TrendingUp} iconColor="#3b82f6" title="Weekly Inspection Trend"
                        badge={summaryData?.period || "Jan–Feb 2026"} badgeCls="qa2-badge-blue" />
                    {chartsLoading ? (
                        <div className="qa2-skeleton-chart qa2-pulse-loader" style={{ height: "192px" }}>
                            <div style={{ display: "flex", gap: "10px", height: "140px", alignItems: "flex-end", padding: "0 10px" }}>
                                {[40, 70, 55, 85, 60, 95, 75, 90].map((h, idx) => (
                                    <div key={idx} className="qa2-skeleton-chart-bar qa2-shimmer" style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </div>
                    ) : hasNoData ? (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "192px", color: "#94a3b8", fontSize: "0.88rem" }}>
                            No data found for the selected period
                        </div>
                    ) : (
                        <div className="qa2-chart-wrap"><canvas ref={trendRef} /></div>
                    )}
                </div>
                <div className="qa2-card qa2-chart-card qa2-card-premium">
                    <SectionHead icon={BarChart2} iconColor="#10b981" title="Inspection Results Split" />
                    {chartsLoading ? (
                        <div className="qa2-skeleton-chart qa2-pulse-loader" style={{ justifyContent: "center", alignItems: "center", height: "192px" }}>
                            <div className="qa2-skeleton qa2-shimmer qa2-skeleton-circle" style={{ width: "100px", height: "100px", border: "10px solid #f1f5f9" }} />
                        </div>
                    ) : hasNoData ? (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "192px", color: "#94a3b8", fontSize: "0.88rem" }}>
                            No data found for the selected period
                        </div>
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
                    ) : hasNoData ? (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "192px", color: "#94a3b8", fontSize: "0.88rem" }}>
                            No data found for the selected period
                        </div>
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
                    ) : hasNoData ? (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "192px", color: "#94a3b8", fontSize: "0.88rem" }}>
                            No data found for the selected period
                        </div>
                    ) : (
                        <div className="qa2-chart-wrap"><canvas ref={ppmRef} /></div>
                    )}
                </div>
                <div className="qa2-card qa2-chart-card qa2-card-premium">
                    <SectionHead icon={BarChart2} iconColor="#ef4444" title="Top Defect Causes — Pareto" />
                    {chartsLoading ? (
                        <div className="qa2-skeleton-chart qa2-pulse-loader" style={{ height: "192px" }}>
                            <div style={{ display: "flex", gap: "10px", height: "140px", alignItems: "flex-end", padding: "0 10px" }}>
                                {[80, 65, 50, 40, 15].map((h, idx) => (
                                    <div key={idx} className="qa2-skeleton-chart-bar qa2-shimmer" style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </div>
                    ) : hasNoData ? (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "192px", color: "#94a3b8", fontSize: "0.88rem" }}>
                            No data found for the selected period
                        </div>
                    ) : (
                        <div className="qa2-chart-wrap"><canvas ref={paretoRef} /></div>
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
                                    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af", fontSize: "0.9rem" }}>
                                        No product records found for this period
                                    </div>
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
                                <div style={{ textAlign: "center", padding: "3.5rem 1rem", color: "#9ca3af", fontSize: "0.9rem" }}>
                                    No defect causes found for this period
                                </div>
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
                            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af", fontSize: "0.9rem" }}>
                                No vendor records found for this period
                            </div>
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
                            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af", fontSize: "0.9rem" }}>
                                No material rejections found
                            </div>
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
                            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af", fontSize: "0.9rem" }}>
                                No machine rejections found
                            </div>
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
                            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af", fontSize: "0.9rem" }}>
                                No department records found
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* ── Full Inspection Table ── */}
            <div className="qa2-card qa2-animate qa2-d4 qa2-card-premium">
                <div className="qa2-table-header">
                    <SectionHead icon={FileText} iconColor="#3b82f6" title="Inspection Records — All Transactions" />
                    <div className="qa2-tag-row">
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
                </div>
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
                                        <td colSpan="11" style={{ textAlign: "center", padding: "3rem", color: "#9ca3af", fontSize: "0.9rem" }}>
                                            No inspection records found for this period
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Rejection & Rework Summary (Full Width) ── */}
            <div className="qa2-card qa2-animate qa2-d4 qa2-card-premium">
                <div className="qa2-table-header">
                    <SectionHead icon={XCircle} iconColor="#ef4444" title="Rejection & Rework Summary" />
                    <div className="qa2-tag-row">
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
                        {selectedDispFilter !== "ALL" && (
                            <button 
                                className="qa2-clear-type-filter-btn"
                                onClick={() => setSelectedDispFilter("ALL")}
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
                </div>
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
                                    {["Insp No", "Product", "Reason", "Qty", "Disposition", "Date"].map(h => (
                                        <th key={h} className={h === "Qty" ? "qa2-th-r" : ""}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activeRejectionRows.length > 0 ? (
                                    activeRejectionRows.map((r, i) => (
                                        <tr key={i} className="qa2-tr">
                                            <td><span className="qa2-rej-id">{r.id}</span></td>
                                            <td>{r.product}</td>
                                            <td>{r.reason}</td>
                                            <td className="qa2-td-r">{r.qty}</td>
                                            <td>
                                                <span 
                                                    className={`qa2-badge ${r.dispCls} qa2-badge-interactive`}
                                                    style={{ display: 'inline-flex', alignItems: 'center' }}
                                                    onClick={() => handleDispBadgeClick(r.disp)}
                                                >
                                                    {r.disp}
                                                </span>
                                            </td>
                                            <td className="qa2-muted qa2-nowrap">{r.date}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: "center", padding: "2.5rem", color: "#9ca3af", fontSize: "0.9rem" }}>
                                            No rejection or rework records found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
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
                                        <td colSpan="9" style={{ textAlign: "center", padding: "3rem", color: "#9ca3af", fontSize: "0.9rem" }}>
                                            No customer complaints logged for this period
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
                />
                <div className="qa2-table-scroll">
                    <table className="qa2-table">
                        <thead>
                            <tr>
                                {["Routecard No", "Routecard Date", "Supplier Name", "Customer Name", "Material Name", "Part No – Description", "Operator", "Qty", "OK Qty", "Rej Qty", "Rw Qty"].map(h => (
                                    <th key={h} className={["Qty", "OK Qty", "Rej Qty", "Rw Qty"].includes(h) ? "qa2-td-r" : ""}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {activeTraceabilityRows.length > 0 ? (
                                activeTraceabilityRows.map((r, i) => (
                                    <tr key={i} className="qa2-tr">
                                        <td style={{ minWidth: "130px" }}>
                                            <span 
                                                className="qa2-badge" 
                                                style={{ background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6", fontWeight: 700 }}
                                            >
                                                {r.routecardNo}
                                            </span>
                                        </td>
                                        <td className="qa2-muted qa2-nowrap" style={{ minWidth: "120px" }}>{r.date}</td>
                                        <td style={{ minWidth: "160px", fontWeight: 600 }}>{r.supplierName}</td>
                                        <td style={{ minWidth: "160px", fontWeight: 600 }}>{r.customerName}</td>
                                        <td className="qa2-muted" style={{ minWidth: "150px" }}>{r.materialName}</td>
                                        <td className="qa2-mono qa2-muted" style={{ minWidth: "220px", maxWidth: "320px", whiteSpace: "normal", wordBreak: "break-word" }}>{r.partNoDesc}</td>
                                        <td className="qa2-nowrap" style={{ minWidth: "130px" }}>{r.operator}</td>
                                        <td className="qa2-td-r" style={{ minWidth: "80px", fontWeight: 600 }}>{r.qty}</td>
                                        <td className="qa2-td-r qa2-green" style={{ minWidth: "80px", fontWeight: 600 }}>{r.okQty}</td>
                                        <td className="qa2-td-r qa2-red" style={{ minWidth: "80px" }}>{r.rejQty}</td>
                                        <td className="qa2-td-r qa2-orange" style={{ minWidth: "80px" }}>{r.rwQty}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="11" style={{ textAlign: "center", padding: "3rem", color: "#9ca3af", fontSize: "0.9rem" }}>
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